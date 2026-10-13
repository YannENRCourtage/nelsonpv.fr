/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BESS PROSPECTING GIS SERVICE
 * Service de détection spatiale des postes HTA/BT au sol (souterrains)
 * et d'identification des parcelles et propriétaires fonciers.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DEPARTEMENTS_FRANCE, searchCommunes, fetchDepartmentCommunes, reverseGeocodeBAN } from '@/services/sechoirProspectingGisService.js';

export { DEPARTEMENTS_FRANCE, searchCommunes, fetchDepartmentCommunes, reverseGeocodeBAN };

const ENEDIS_BASE = 'https://opendata.enedis.fr/data-fair/api/v1/datasets';
const EARTH_RADIUS = 6371000; // mètres

/**
 * Projection locale plane équirectangulaire centrée sur lat0
 */
function toLocalXY(lng, lat, lat0) {
  const rad = Math.PI / 180;
  return [
    lng * rad * EARTH_RADIUS * Math.cos(lat0 * rad),
    lat * rad * EARTH_RADIUS
  ];
}

/**
 * Distance minimale entre un point et un segment de droite (en mètres)
 */
function distPointToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Calcule la distance minimale entre un point [lng, lat] et une collection de LineStrings
 */
function minDistanceToLines(pt, lines, lat0) {
  const p = toLocalXY(pt[0], pt[1], lat0);
  let minDist = Infinity;

  for (const line of lines) {
    const geom = line.geometry;
    if (!geom || !geom.coordinates) continue;
    const parts = geom.type === 'MultiLineString' ? geom.coordinates : [geom.coordinates];

    for (const coords of parts) {
      if (!Array.isArray(coords)) continue;
      for (let i = 0; i < coords.length - 1; i++) {
        const a = toLocalXY(coords[i][0], coords[i][1], lat0);
        const b = toLocalXY(coords[i + 1][0], coords[i + 1][1], lat0);
        const d = distPointToSegment(p, a, b);
        if (d < minDist) minDist = d;
      }
    }
  }

  return minDist;
}

/**
 * Récupère les entités d'un dataset Open Data Enedis par bbox
 */
async function fetchEnedisDataset(dataset, bbox, selectFields = 'geometry,_id,code_commune,nom_commune,nom_poste') {
  const bboxStr = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
  const url = `${ENEDIS_BASE}/${dataset}/lines?size=1000&bbox=${bboxStr}&select=${selectFields}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r) => ({
      ...r,
      geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry
    }));
  } catch (err) {
    console.warn(`[BessGIS] Échec fetch dataset Enedis ${dataset}:`, err);
    return [];
  }
}

/**
 * Récupère la parcelle cadastrale contenant un point via l'API Carto IGN
 */
export async function fetchCadastralParcel(lat, lng) {
  try {
    const geomParam = encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lng, lat] }));
    const url = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${geomParam}&source_ign=PCI`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) return null;

    const p = feat.properties || {};
    return {
      idu: p.idu || p.id || `${p.code_insee || ''}${p.section || ''}${p.numero || ''}`,
      section: p.section || '',
      numero: p.numero || '',
      contenance: p.contenance || 0,
      codeCommune: p.code_insee || p.code_dep || '',
      nomCommune: p.nom_com || '',
      geometry: feat.geometry
    };
  } catch (err) {
    console.warn('[BessGIS] Erreur récupération parcelle IGN:', err);
    return null;
  }
}

/**
 * Recherche les propriétaires personnes morales via Koumoul (open data MAJIC / DGFiP)
 */
export async function fetchParcelOwners(codeParcelle) {
  if (!codeParcelle) return [];

  try {
    // 1. Essai direct Koumoul
    const koumoulUrl = `https://opendata.koumoul.com/data-fair/api/v1/datasets/parcelles-des-personnes-morales/lines?size=10&qs=code_parcelle:"${encodeURIComponent(codeParcelle)}"`;
    const res = await fetch(koumoulUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((r) => ({
          denomination: r.denomination || r.nom || '',
          formeJuridique: r.forme_juridique_abregee || r.code_forme_juridique || '',
          siren: r.numero_siren || r.siren || '',
          adresse: r.adresse || '',
          codeCommune: r.code_commune || r['_infos_commune.code_commune'] || '',
          nomCommune: r.nom_commune || r['_infos_commune.nom_commune'] || ''
        }));
      }
    }

    // 2. Fallback via proxy interne /api/melodi si disponible
    try {
      const proxyUrl = `/api/melodi?action=owners&where=code_parcelle='${encodeURIComponent(codeParcelle)}'`;
      const pRes = await fetch(proxyUrl);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.results && pData.results.length > 0) {
          return pData.results.map((r) => ({
            denomination: r.denomination_ou_raison_sociale || r.denomination || '',
            formeJuridique: r.nature_juridique_abregee || '',
            siren: r.siren || '',
            adresse: r.adresse || '',
            codeCommune: r.code_commune || '',
            nomCommune: r.nom_commune || ''
          }));
        }
      }
    } catch (e) {
      // ignore fallback error
    }
  } catch (err) {
    console.warn('[BessGIS] Erreur récupération propriétaires:', err);
  }

  return [];
}

/**
 * Analyse et qualifie les transformateurs HTA/BT sur une bbox donnée.
 * RÈGLE FONDAMENTALE :
 * - Transfo SOL : ligne HTA souterraine (pointillés) arrivant au transformateur (distance <= 18m)
 *   ET aucune ligne HTA aérienne (pleine) ne le raccordant directement (distance aérienne > 15m).
 * - Transfo POTEAU : ligne HTA aérienne (pleine) arrivant directement (distance <= 15m).
 */
export async function detectGroundTransformers(bbox, onProgress = null) {
  if (onProgress) onProgress('Interrogation du réseau Enedis HTA et Postes...');

  const [postes, htaSouterrain, htaAerien] = await Promise.all([
    fetchEnedisDataset('poste-electrique', bbox),
    fetchEnedisDataset('reseau-souterrain-hta', bbox),
    fetchEnedisDataset('reseau-hta', bbox)
  ]);

  if (!postes || postes.length === 0) {
    return { allPostes: [], groundTransformers: [] };
  }

  const groundTransformers = [];

  for (let i = 0; i < postes.length; i++) {
    const poste = postes[i];
    const coords = poste.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const lng = coords[0];
    const lat = coords[1];
    const lat0 = lat;

    const distSouterrain = minDistanceToLines([lng, lat], htaSouterrain, lat0);
    const distAerien = minDistanceToLines([lng, lat], htaAerien, lat0);

    // Critère strict : desservi par ligne souterraine (<= 18m) et pas par ligne aérienne (distance aérienne > 15m)
    const isGround = distSouterrain <= 18 && distAerien > 15;

    if (isGround) {
      groundTransformers.push({
        id: poste._id || `transfo_${i + 1}`,
        lat,
        lng,
        coords: [lat, lng],
        distSouterrain: Math.round(distSouterrain * 10) / 10,
        distAerien: Math.round(distAerien * 10) / 10,
        codeCommune: poste.code_commune || '',
        nomCommune: poste.nom_commune || '',
        nomPoste: poste.nom_poste || 'Poste HTA/BT Sol'
      });
    }
  }

  return {
    allPostesCount: postes.length,
    souterrainLinesCount: htaSouterrain.length,
    aerienLinesCount: htaAerien.length,
    groundTransformers
  };
}
