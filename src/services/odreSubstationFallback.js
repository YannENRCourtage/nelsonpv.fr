/**
 * Service de calcul et de repli des postes sources Enedis / ODRE
 * Règle : Si capacité résiduelle = 0 MW sur le poste attribué, recherche du poste source
 * disponible le plus proche (> 0 MW) avec calcul de sa distance réelle.
 */

import { ODRE_AVAILABLE_SUBSTATIONS } from '../data/odreAvailableSubstations.js';

export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findFallbackAvailableSubstation(lat, lng, excludeSubstationName = '') {
  if (!lat || !lng) return null;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return null;

  const cleanExclude = (excludeSubstationName || '').trim().toUpperCase();

  let best = null;
  let minDist = Infinity;

  for (let i = 0; i < ODRE_AVAILABLE_SUBSTATIONS.length; i++) {
    const s = ODRE_AVAILABLE_SUBSTATIONS[i];
    if (cleanExclude && s.name.toUpperCase() === cleanExclude) continue;

    const d = calculateHaversineDistanceKm(latNum, lngNum, s.lat, s.lng);
    if (d !== null && d < minDist) {
      minDist = d;
      best = {
        name: s.name,
        code: s.code || '',
        capMw: s.capMw,
        distanceKm: Math.round(d * 10) / 10
      };
    }
  }

  return best;
}

/**
 * Formate la cellule Excel "Reste à affecter (Distance)"
 * - Cas nominal (capacité > 0 MW) : [Capacité] ([Distance]) avec virgule française (ex: "1,6 (5.9)")
 * - Règle de repli (capacité = 0 MW) : Recherche du poste > 0 MW le plus proche et affichage (ex: "8 (12.3)")
 */
export function formatResteAffecterDistanceWithFallback(primaryMw, primaryDistKm, siteLat, siteLng, siteSubstationName = '') {
  let mwNum = NaN;
  if (primaryMw !== null && primaryMw !== undefined && primaryMw !== '—') {
    mwNum = typeof primaryMw === 'number' ? primaryMw : parseFloat(String(primaryMw).replace(',', '.'));
  }

  const distNum = typeof primaryDistKm === 'number' ? primaryDistKm : parseFloat(String(primaryDistKm || '0').replace(',', '.'));
  const safeDistKm = isNaN(distNum) ? 0 : Math.round(distNum * 10) / 10;

  // Cas nominal : capacité résiduelle strictement supérieure à 0
  if (!isNaN(mwNum) && mwNum > 0) {
    const mwStr = Number.isInteger(mwNum) ? String(mwNum) : mwNum.toString().replace('.', ',');
    const distStr = Number.isInteger(safeDistKm) ? String(safeDistKm) : safeDistKm.toString();
    return `${mwStr} (${distStr})`;
  }

  // Règle de repli si capacité = 0 ou indisponible : chercher poste source > 0 MW le plus proche
  if (siteLat && siteLng) {
    const fallback = findFallbackAvailableSubstation(siteLat, siteLng, siteSubstationName);
    if (fallback) {
      const fbMw = fallback.capMw;
      const fbDist = fallback.distanceKm;
      const mwStr = Number.isInteger(fbMw) ? String(fbMw) : fbMw.toString().replace('.', ',');
      const distStr = Number.isInteger(fbDist) ? String(fbDist) : fbDist.toString();
      return `${mwStr} (${distStr})`;
    }
  }

  // Si pas de repli trouvé, format nominal 0
  const distStr = Number.isInteger(safeDistKm) ? String(safeDistKm) : safeDistKm.toString();
  return `0 (${distStr})`;
}
