/**
 * SERVICE D'ANALYSE DES ZONES TURPE 7 CRE 2025-227
 * 
 * Permet de qualifier si un poste source Enedis / RTE fait partie
 * des zones d'injection et/ou de soutirage identifiées dans l'annexe
 * de la Délibération de la CRE n° 2025-227 du 1er octobre 2025
 * pour les installations de stockage d'électricité (BESS).
 */

import creZonesData from '../data/turpe/cre2025_227_zones.json';

const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Recherche le statut d'un poste source dans les zones CRE 2025-227
 * @param {string} name - Nom du poste source (ex: 'PLAUD', 'LERE', 'LUBERSAC')
 * @param {string} [code] - Code du poste source si disponible
 * @returns {Object} Qualification détaillée
 */
export function getCreSubstationQualification(name, code = '') {
  if (!name && !code) {
    return {
      isIndexed: false,
      isInjectionHTA: false,
      soutirageHTA: false,
      injectionHTB: false,
      soutirageHTB: false,
      region: '',
      label: 'Poste source non répertorié CRE 2025-227'
    };
  }

  const nName = normalize(name);
  const nCode = normalize(code);

  const substations = creZonesData.substations || {};
  const found = (nCode && substations[nCode]) || (nName && substations[nName]) || null;

  if (!found) {
    return {
      isIndexed: false,
      name: name || code,
      isInjectionHTA: false,
      soutirageHTA: false,
      injectionHTB: false,
      soutirageHTB: false,
      region: '',
      label: 'Zone standard Enedis (hors poches spécifiques CRE 2025-227)'
    };
  }

  const isInj = found.injectionHTA || found.injectionHTB;
  const isSout = found.soutirageHTA || found.soutirageHTB;

  let label = 'Zone standard';
  if (isInj && isSout) {
    label = 'Poche Mixte Injection & Soutirage CRE 2025-227';
  } else if (isInj) {
    label = 'Poche Signal-Prix Injection CRE 2025-227';
  } else if (isSout) {
    label = 'Poche Signal-Prix Soutirage CRE 2025-227';
  }

  return {
    isIndexed: true,
    name: found.name || name,
    code: found.code || code,
    region: found.region || '',
    tension: found.tension || '',
    isInjectionHTA: Boolean(found.injectionHTA),
    soutirageHTA: Boolean(found.soutirageHTA),
    injectionHTB: Boolean(found.injectionHTB),
    soutirageHTB: Boolean(found.soutirageHTB),
    isEligibleStorageOption: true,
    label
  };
}

export default {
  getCreSubstationQualification,
  creMetadata: creZonesData.metadata
};
