/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE D'INTÉGRATION CAPARÉSEAU (RTE / ENEDIS / ODRE) & COUPLAGE HTA
 * Calculs automatisés de puissance transformateur (kVA / MW) & faisabilité
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { CAPARESEAU_SUBSTATIONS } from '@/data/capareseauSubstations.js';

// Cache en mémoire pour garantir 0 ms de latence sur les consultations cartographiques
const memoryCache = new Map();

// Formule de Haversine pour le calcul précis de distance en kilomètres
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Rayon terrestre moyen en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let localSubstationsData = null;

/**
 * Charge les données des postes sources (fallback local ultra-rapide)
 */
export async function loadSubstationsDataset() {
  if (localSubstationsData && localSubstationsData.length > 0) {
    return localSubstationsData;
  }

  // 1. Essai de chargement via le JSON statique public (3 118 postes)
  if (typeof window !== 'undefined' && window.fetch) {
    try {
      const response = await fetch('/datas/capareseau_map.json');
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json) && json.length > 0) {
          localSubstationsData = json;
          return localSubstationsData;
        }
      }
    } catch (err) {
      console.warn('[capareseauService] Impossible de charger /datas/capareseau_map.json, bascule sur la base intégrée:', err);
    }
  }

  // 2. Fallback sur la base JavaScript précompilée
  if (Array.isArray(CAPARESEAU_SUBSTATIONS) && CAPARESEAU_SUBSTATIONS.length > 0) {
    localSubstationsData = CAPARESEAU_SUBSTATIONS;
    return localSubstationsData;
  }

  return [];
}

/**
 * Normalise les coordonnées géographiques en entrée
 */
function parseCoordinates(latOrGps, maybeLng) {
  if (typeof latOrGps === 'string') {
    const parts = latOrGps.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } else if (typeof latOrGps === 'object' && latOrGps !== null) {
    const lat = parseFloat(latOrGps.lat ?? latOrGps.latitude ?? latOrGps.Y);
    const lng = parseFloat(latOrGps.lng ?? latOrGps.lon ?? latOrGps.longitude ?? latOrGps.X);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  } else if (typeof latOrGps === 'number' && typeof maybeLng === 'number') {
    return { lat: latOrGps, lng: maybeLng };
  }
  return null;
}

/**
 * Interroge les données Caparéseau pour un point donné et calcule instantanément :
 * - Le nom du Poste Source RTE le plus proche et sa distance exacte (km).
 * - La capacité disponible en Injection (MW et kVA) et la quote-part S3REnR (€/MW).
 * - La capacité disponible en Soutirage (MW et kVA) sur les départs HTA associés.
 * - La validation d'éligibilité pour un calibre de transfo donné (ex: 800 kVA).
 * 
 * @param {number|string|object} latOrGps - Latitude, objet {lat, lng} ou chaîne "lat, lng"
 * @param {number} [maybeLng] - Longitude si latOrGps est un nombre
 * @returns {Promise<object>} Résultats d'ingénierie réseau Caparéseau
 */
export async function getCapareseauData(latOrGps, maybeLng) {
  const coords = parseCoordinates(latOrGps, maybeLng);
  if (!coords) {
    return null;
  }

  const cacheKey = `${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const substations = await loadSubstationsDataset();
  if (!substations || substations.length === 0) {
    return null;
  }

  // Calcul de la distance géodésique pour chaque poste source
  const scoredSubstations = [];
  for (let i = 0; i < substations.length; i++) {
    const s = substations[i];
    const sLat = parseFloat(s.Y ?? s.lat);
    const sLng = parseFloat(s.X ?? s.lng);
    if (isNaN(sLat) || isNaN(sLng)) continue;

    const distKm = haversineDistanceKm(coords.lat, coords.lng, sLat, sLng);
    if (distKm !== null) {
      scoredSubstations.push({
        ...s,
        sLat,
        sLng,
        distanceKm: distKm,
        distanceMeters: Math.round(distKm * 1000)
      });
    }
  }

  scoredSubstations.sort((a, b) => a.distanceKm - b.distanceKm);
  const closest = scoredSubstations[0];
  if (!closest) return null;

  // Extraction des valeurs normalisées Caparéseau
  const vals = closest.values || {};
  
  // Capacité Injection disponible (Reste à affecter S3REnR)
  const rawInjectionMw = parseFloat(vals.INFO_NA ?? closest.capMw);
  const injectionAvailableMw = !isNaN(rawInjectionMw) ? Math.max(0, rawInjectionMw) : 0;
  const injectionAvailableKva = Math.round(injectionAvailableMw * 1000);

  // Quote-part S3REnR unitaire
  const qpStr = vals.INFO_QP ?? closest.quotePart ?? '12.30 k€/MW';
  let quotePartEurPerMw = closest.quotePartEur || 12300;
  const qpMatch = String(qpStr).match(/[\d.,]+/);
  if (qpMatch) {
    const valK = parseFloat(qpMatch[0].replace(',', '.'));
    if (!isNaN(valK)) quotePartEurPerMw = Math.round(valK * 1000);
  }

  // Capacité Soutirage disponible (Départ HTA standard 20 kV Enedis)
  // Limite thermique d'un départ HTA standard 20 kV (150-250A) = 4.9 MW
  // Si le poste dispose d'une marge globale élevée, la capacité de soutirage disponible
  // peut atteindre la puissance résiduelle du jeu de barres HTA
  const soutirageAvailableMw = injectionAvailableMw > 0 
    ? parseFloat(Math.max(4.9, injectionAvailableMw * 1.35).toFixed(1))
    : 4.9;
  const soutirageAvailableKva = Math.round(soutirageAvailableMw * 1000);

  // File d'attente S3REnR & Capacité réservée
  const queueMw = parseFloat(vals.INFO_FAS3R ?? closest.fileAttenteMw) || 0;
  const reservedMw = parseFloat(vals.INFO_ESS3R ?? closest.capReserveeMw) || 0;
  const saturationRate = vals.INFO_TX || (injectionAvailableMw === 0 ? '100 %' : '0 %');

  // Longueur électrique estimée (foisonnement viaire standard Enedis × 1.3)
  const exactDistKm = parseFloat(closest.distanceKm.toFixed(2));
  const estimatedRouteKm = parseFloat((exactDistKm * 1.3).toFixed(2));
  const estimatedRouteMeters = Math.round(closest.distanceMeters * 1.3);

  // Fonction de vérification de faisabilité pour un calibre donné
  const isCalibreFeasible = (calibreKva, mode = 'soutirage') => {
    const calKva = Number(calibreKva) || 800;
    if (calKva <= 250) return true; // Domaine BT C4 toujours éligible sans contrainte HTA
    
    // Contrainte de distance maximale économique HTA (20 km max pour chute de tension < 5%)
    if (closest.distanceKm > 20) return false;

    if (mode === 'soutirage') {
      return calKva <= soutirageAvailableKva;
    } else if (mode === 'injection') {
      return calKva <= injectionAvailableKva;
    } else {
      return calKva <= Math.min(soutirageAvailableKva, injectionAvailableKva);
    }
  };

  const getFeasibilityVerdict = (calibreKva, mode = 'soutirage') => {
    const calKva = Number(calibreKva) || 800;
    const calMw = (calKva / 1000).toFixed(calKva >= 1000 ? 1 : 2);
    const feasible = isCalibreFeasible(calKva, mode);
    const isDistanceTooFar = closest.distanceKm > 20;

    if (calKva <= 250) {
      return {
        feasible: true,
        status: 'ok',
        badge: '✅ Raccordable (Domaine BT C4)',
        label: `Transfo ${calKva} kVA raccordable en Basse Tension (≤ 250 kVA)`,
        color: 'emerald'
      };
    }

    if (feasible) {
      return {
        feasible: true,
        status: 'ok',
        badge: '✅ Raccordable',
        label: `✅ Transfo ${calKva} kVA Raccordable au Poste Source`,
        color: 'emerald'
      };
    }

    if (isDistanceTooFar) {
      return {
        feasible: false,
        status: 'warning',
        badge: '⚠️ Éloignement HTA',
        label: `⚠️ Transfo ${calKva} kVA : Éloignement important (${exactDistKm} km) — Chute de tension HTA à valider`,
        color: 'amber'
      };
    }

    return {
      feasible: false,
      status: 'danger',
      badge: '⚠️ Capacité insuffisante',
      label: `⚠️ Capacité insuffisante (< ${calMw} MW disponible)`,
      color: 'rose'
    };
  };

  const result = {
    // Poste source principal le plus proche
    substationName: closest.name || 'Poste Source HTA',
    substationCode: closest.code || '',
    territory: closest.territory_name || closest.commune || 'Réseau public',
    voltageLevel: closest.htb_type || 'HTA (20 kV)',
    gestionnaire: closest.grd1?.name || 'Enedis',
    lat: closest.sLat,
    lng: closest.sLng,

    // Distances
    distanceKm: exactDistKm,
    distanceMeters: closest.distanceMeters,
    estimatedRouteKm,
    estimatedRouteMeters,
    isInsideCorridor350m: closest.distanceMeters <= 350,

    // Capacités Injection
    injectionAvailableMw,
    injectionAvailableKva,
    quotePartEurPerMw,
    quotePartLabel: qpStr,
    reservedMw,
    queueMw,
    saturationRate,

    // Capacités Soutirage
    soutirageAvailableMw,
    soutirageAvailableKva,
    calibreMaxRecommande: 'Jusqu\'à 1 000 / 1 250 kVA en coupure d\'artère',
    seuilDepartDedie: 'Départ direct Poste Source requis > 3 600 kVA',

    // Top 4 des postes sources les plus proches
    topSubstations: scoredSubstations.slice(0, 4).map(sub => {
      const v = sub.values || {};
      const injMw = parseFloat(v.INFO_NA ?? sub.capMw) || 0;
      const soutMw = injMw > 0 ? parseFloat(Math.max(4.9, injMw * 1.35).toFixed(1)) : 4.9;
      return {
        name: sub.name,
        code: sub.code,
        distanceKm: parseFloat(sub.distanceKm.toFixed(2)),
        distanceMeters: sub.distanceMeters,
        injectionMw: injMw,
        injectionKva: Math.round(injMw * 1000),
        soutirageMw: soutMw,
        soutirageKva: Math.round(soutMw * 1000),
        quotePart: v.INFO_QP ?? sub.quotePart ?? '12.30 k€/MW',
        reservedMw: parseFloat(v.INFO_ESS3R ?? sub.capReserveeMw) || 0,
        queueMw: parseFloat(v.INFO_FAS3R ?? sub.fileAttenteMw) || 0,
        lat: sub.sLat,
        lng: sub.sLng
      };
    }),

    // Méthodes d'aide
    isCalibreFeasible,
    getFeasibilityVerdict
  };

  memoryCache.set(cacheKey, result);
  return result;
}

// Alias avec et sans accent pour une compatibilité parfaite d'importation
export const getCaparéseauData = getCapareseauData;
export default getCapareseauData;
