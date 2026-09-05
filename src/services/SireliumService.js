/**
 * SireliumService.js
 * Service d'interaction avec l'API Sirélium (pins cartographiques, clusters, fiches entreprises, recherche)
 * avec bascule automatique / fallback et gestion de cache en mémoire.
 */

const CACHE_TTL_MS = 60 * 1000;
const memoryCache = new Map();

function getCached(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Appelle l'endpoint proxy Sirélium ou direct selon l'environnement
 */
async function callSireliumApi(endpoint, params = {}) {
  const query = new URLSearchParams();
  query.set('endpoint', endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      query.set(k, String(v));
    }
  }

  // Appel via le proxy serverless multi-fonctions /api/proxies/sirelium
  const proxyUrl = `/api/proxies/sirelium?${query.toString()}`;
  try {
    const res = await fetch(proxyUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(9000)
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[SireliumService] /api/proxies/sirelium call failed:`, err.message);
  }

  return null;
}

/**
 * Récupère les marqueurs (pins) d'établissements pour une boîte géographique
 * @param {Object} bounds { west, south, east, north }
 * @param {Object} filters { statut_ul, statut_etab, est_siege, naf, etc. }
 */
export async function getSireliumPins(bounds, filters = {}) {
  if (!bounds) return { type: 'FeatureCollection', features: [] };

  const west = bounds.west.toFixed(6);
  const south = bounds.south.toFixed(6);
  const east = bounds.east.toFixed(6);
  const north = bounds.north.toFixed(6);

  const statut_ul = filters.statut_ul || 'active';
  const statut_etab = filters.statut_etab || 'active';
  const est_siege = filters.est_siege !== undefined ? filters.est_siege : '';

  const cacheKey = `pins:${west}:${south}:${east}:${north}:${statut_ul}:${statut_etab}:${est_siege}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callSireliumApi('pins', {
    west,
    south,
    east,
    north,
    statut_ul,
    statut_etab,
    ...(est_siege !== '' ? { est_siege } : {})
  });

  if (data && data.features) {
    setCache(cacheKey, data);
    return data;
  }

  // Fallback direct vers Recherche Entreprises (api.gouv.fr) si Sirelium indisponible
  try {
    const centerLat = (bounds.south + bounds.north) / 2;
    const centerLng = (bounds.west + bounds.east) / 2;
    const gouvUrl = `https://recherche-entreprises.api.gouv.fr/near_point?lat=${centerLat}&long=${centerLng}&radius=1.5&per_page=30`;
    const gRes = await fetch(gouvUrl, { signal: AbortSignal.timeout(4000) });
    if (gRes.ok) {
      const gData = await gRes.json();
      const features = (gData.results || [])
        .filter(r => r.matching_etablissements && r.matching_etablissements.length > 0)
        .map(r => {
          const etab = r.matching_etablissements[0];
          const lat = Number(etab.latitude || r.siege?.latitude);
          const lon = Number(etab.longitude || r.siege?.longitude);
          if (!lat || !lon) return null;
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: {
              siret: etab.siret || r.siren,
              siren: r.siren,
              nom: r.nom_complet || r.nom_raison_sociale,
              statut_etab: etab.etat_administratif === 'A' ? 'active' : 'ferme',
              est_siege: etab.est_siege ? 1 : 0,
              section: r.activite_principale ? r.activite_principale.slice(0, 1) : '',
              enseigne: etab.enseigne_1 || ''
            }
          };
        })
        .filter(Boolean);

      const resObj = { type: 'FeatureCollection', features };
      setCache(cacheKey, resObj);
      return resObj;
    }
  } catch (fbErr) {
    console.warn('[SireliumService] Gouv fallback error:', fbErr.message);
  }

  return { type: 'FeatureCollection', features: [] };
}

/**
 * Récupère les clusters d'entreprises pour un zoom éloigné
 */
export async function getSireliumClusters(bounds, zoom = 12, filters = {}) {
  if (!bounds) return { type: 'FeatureCollection', features: [] };

  const west = bounds.west.toFixed(6);
  const south = bounds.south.toFixed(6);
  const east = bounds.east.toFixed(6);
  const north = bounds.north.toFixed(6);

  const statut_ul = filters.statut_ul || 'active';
  const statut_etab = filters.statut_etab || 'active';

  const cacheKey = `clusters:${zoom}:${west}:${south}:${east}:${north}:${statut_ul}:${statut_etab}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callSireliumApi('clusters', {
    zoom: Math.round(zoom),
    west,
    south,
    east,
    north,
    statut_ul,
    statut_etab
  });

  if (data) {
    setCache(cacheKey, data);
    return data;
  }
  return { type: 'FeatureCollection', features: [] };
}

/**
 * Récupère la fiche détaillée d'une entreprise par son SIREN
 * @param {string} siren SIREN à 9 chiffres
 */
export async function getSireliumEntreprise(siren) {
  if (!siren) return null;
  const cleanSiren = String(siren).replace(/\s/g, '').slice(0, 9);
  if (cleanSiren.length < 9) return null;

  const cacheKey = `entreprise:${cleanSiren}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callSireliumApi('entreprise', { siren: cleanSiren });
  if (data && data.ul) {
    setCache(cacheKey, data);
    return data;
  }

  // Fallback vers Recherche Entreprises (api.gouv.fr)
  try {
    const gouvUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiren}`;
    const gRes = await fetch(gouvUrl, { signal: AbortSignal.timeout(4000) });
    if (gRes.ok) {
      const gData = await gRes.json();
      const r = (gData.results || []).find(it => it.siren === cleanSiren) || gData.results?.[0];
      if (r) {
        const synthetic = {
          ul: {
            siren: r.siren,
            nom_raison_sociale: r.nom_complet || r.nom_raison_sociale,
            siret_siege: r.siege?.siret,
            forme_juridique: r.nature_juridique,
            code_naf_ul: r.activite_principale,
            adresse_complete_ul: r.siege?.geo_adresse || r.siege?.adresse,
            code_postal_ul: r.siege?.code_postal,
            commune_ul: r.siege?.libelle_commune,
            tranche_effectif_ul: r.tranche_effectif_salarie,
            date_creation_insee: r.date_creation,
            date_creation_rne: r.date_creation,
            statut_insee_ul: r.etat_administratif === 'A' ? 'Active' : 'Cessée',
            statut_rne_ul: r.etat_administratif === 'A' ? 'En activité' : 'Cessée',
            statut_ul: r.etat_administratif === 'A' ? 'active' : 'cessee',
            objet_social: r.objet_social || '',
            dirigeants: (r.dirigeants || []).map(d => ({
              nom: d.nom,
              prenom: d.prenoms,
              qualite: d.qualite
            }))
          },
          etablissements: (r.matching_etablissements || [r.siege]).filter(Boolean).map(e => ({
            siret: e.siret,
            siren: r.siren,
            adresse_complete: e.adresse || e.geo_adresse,
            code_postal: e.code_postal,
            commune: e.libelle_commune,
            lat: Number(e.latitude),
            lon: Number(e.longitude),
            statut_etab: e.etat_administratif === 'A' ? 'active' : 'ferme',
            est_siege: e.est_siege ? 1 : 0
          }))
        };
        setCache(cacheKey, synthetic);
        return synthetic;
      }
    }
  } catch (e) {
    console.warn('[SireliumService] Gouv detail fallback error:', e.message);
  }

  return null;
}

/**
 * Recherche rapide d'entreprises par nom, dirigeant, SIREN, adresse
 */
export async function searchSirelium(query) {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const cacheKey = `search:${trimmed.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callSireliumApi('search', { q: trimmed });
  if (data && Array.isArray(data.results)) {
    setCache(cacheKey, data.results);
    return data.results;
  }

  // Fallback vers Recherche Entreprises (api.gouv.fr)
  try {
    const gouvUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(trimmed)}&per_page=10`;
    const gRes = await fetch(gouvUrl, { signal: AbortSignal.timeout(4000) });
    if (gRes.ok) {
      const gData = await gRes.json();
      const results = (gData.results || []).map(r => ({
        siren: r.siren,
        nom_raison_sociale: r.nom_complet || r.nom_raison_sociale,
        adresse_complete_ul: r.siege?.geo_adresse || r.siege?.adresse,
        commune_ul: r.siege?.libelle_commune,
        code_postal_ul: r.siege?.code_postal,
        statut_ul: r.etat_administratif === 'A' ? 'active' : 'cessee',
        lat: Number(r.siege?.latitude),
        lon: Number(r.siege?.longitude),
        slug: (r.nom_complet || 'entreprise').toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${r.siren}`
      }));
      setCache(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn('[SireliumService] Search fallback error:', e.message);
  }

  return [];
}
