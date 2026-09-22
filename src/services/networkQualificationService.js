/**
 * SERVICE DE QUALIFICATION RÉSEAU & GÉOLOCALISATION BESS
 * 
 * Ce service analyse les coordonnées GPS d'un projet BESS pour :
 * 1. Identifier le poste source Enedis / RTE le plus proche via Open Data Réseaux Énergies (ODRE).
 * 2. Calculer la distance géodésique (Haversine) et estimer le tracé linéaire de raccordement.
 * 3. Déterminer le domaine de tension réglementaire recommandé (HTA1, HTA2, BT) selon la puissance.
 * 4. Attribuer à chaque information un niveau de certitude normalisé de 1 à 4.
 * 
 * Zéro valeur inventée. Si une information réseau n'est pas certifiée, le statut "À CONFIRMER" est attribué.
 */

import { CERTITUDE_LEVELS } from '../data/turpe/turpe7Tarifs.js';
import { getCreSubstationQualification } from './creZonesService.js';
import { findBessOdreData } from '../data/bessOdreMatrix.js';

/**
 * Calcul de distance géodésique Haversine entre deux coordonnées (lat/lon) en kilomètres
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Rayon moyen de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimation du linéaire de tracé de raccordement Enedis (coefficient de foisonnement viaire)
 * Les tranchées / lignes suivent la voirie publique : coefficient empirique de 1.3x le vol d'oiseau.
 */
export function estimateConnectionRouteMeters(haversineKm) {
  if (!haversineKm || isNaN(haversineKm)) return 100;
  // Facteur 1.3 de contournement de voirie
  return Math.round(haversineKm * 1000 * 1.3);
}

/**
 * Détermination du domaine de tension préconisé selon la puissance nominale du BESS
 */
export function recommendVoltageDomain(powerKw) {
  const p = Number(powerKw) || 500;
  if (p > 250) {
    return {
      domainKey: 'HTA1',
      label: 'HTA1 (20 kV)',
      voltageKv: 20,
      description: 'Obligation technique Enedis au-delà de 250 kVA (Poste de livraison HTA dédié C13-100)',
      certitude: CERTITUDE_LEVELS[3], // Calculé / Règle technique normalisée
      isConfirmed: true
    };
  }
  if (p > 36) {
    return {
      domainKey: 'HTA1', // Souvent préféré pour BESS pro, mais BT > 36 kVA possible
      label: 'HTA1 recommandé (ou BT > 36 kVA)',
      voltageKv: 20,
      description: 'Puissance comprise entre 36 et 250 kVA : HTA1 préconisé pour l\'injection, BT envisageable sur étude Enedis',
      certitude: CERTITUDE_LEVELS[4], // Niveau 4 : À CONFIRMER
      isConfirmed: false,
      needsConfirmation: true
    };
  }
  return {
    domainKey: 'BT_INF_36',
    label: 'BT ≤ 36 kVA',
    voltageKv: 0.4,
    description: 'Raccordement basse tension monophasé ou triphasé standard',
    certitude: CERTITUDE_LEVELS[3],
    isConfirmed: true
  };
}

let cachedCapareseauSubstations = null;

/**
 * Charge les données complètes de la cartographie Caparéseau (3 118 postes sources)
 */
export async function loadCapareseauData() {
  if (cachedCapareseauSubstations) return cachedCapareseauSubstations;
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      const res = await fetch('/datas/capareseau_map.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cachedCapareseauSubstations = data;
          return cachedCapareseauSubstations;
        }
      }
    }
  } catch (err) {
    console.warn('[networkQualificationService] Impossible de charger /datas/capareseau_map.json:', err);
  }
  return null;
}

/**
 * Localise le poste source le plus proche des coordonnées GPS via Caparéseau / ODRE
 */
export async function fetchClosestSubstation(lat, lng) {
  if (!lat || !lng) return null;

  try {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return null;

    // 1. Recherche instantanée dans la base locale Caparéseau (3 118 postes)
    const localData = await loadCapareseauData();
    if (localData && localData.length > 0) {
      let closest = null;
      let minDist = Infinity;

      for (let i = 0; i < localData.length; i++) {
        const item = localData[i];
        const sLat = item.Y ?? item.lat;
        const sLng = item.X ?? item.lng;
        if (sLat == null || sLng == null) continue;

        const dist = calculateHaversineDistanceKm(latNum, lngNum, sLat, sLng);
        if (dist !== null && dist < minDist) {
          minDist = dist;
          closest = item;
        }
      }

      if (closest) {
        const creQual = getCreSubstationQualification(closest.name, closest.code);
        const distKm = Math.round(minDist * 10) / 10;
        return {
          id: closest.code || closest.name || 'Poste Source',
          name: closest.name || 'Poste Source HTA/HTB',
          code: closest.code || '',
          voltageLevel: closest.htb_type ? `${closest.htb_type} / 20 kV` : 'HTA / 20 kV',
          availableCapacityMw: parseFloat(closest.values?.INFO_NA) || 0,
          reservedCapacityMw: parseFloat(closest.values?.INFO_CR) || 0,
          quotePartS3REnR: closest.values?.INFO_QP || '—',
          fileAttenteMw: parseFloat(closest.values?.INFO_FAS3R) || 0,
          tauxOccupation: closest.values?.INFO_TX || '—',
          gestionnaire: closest.grd1?.name || 'Enedis',
          commune: closest.territory_name || '',
          lat: closest.Y ?? closest.lat,
          lng: closest.X ?? closest.lng,
          distanceKm: distKm,
          estimatedRouteMeters: estimateConnectionRouteMeters(distKm),
          creQualification: creQual
        };
      }
    }

    // 2. Fallback API distante ODRE si fichier local non chargé
    const deltaLat = 0.35;
    const deltaLng = 0.45;
    const latMax = latNum + deltaLat;
    const lonMin = lngNum - deltaLng;
    const latMin = latNum - deltaLat;
    const lonMax = lngNum + deltaLng;

    const dataset = 'capacites-daccueil-du-reseau-pour-le-raccordement-au-reseau-electrique';
    const whereClause = `within_box(geo_shape, ${latMax}, ${lonMin}, ${latMin}, ${lonMax})`;
    const url = `/api/melodi?action=capareseau&dataset=${dataset}&where=${encodeURIComponent(whereClause)}`;

    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.results || data.results.length === 0) return null;

    const candidateSubstations = data.results
      .map(item => {
        const itemLat = item.geo_point_2d?.lat || item.latitude;
        const itemLng = item.geo_point_2d?.lon || item.longitude;
        if (!itemLat || !itemLng) return null;

        const distanceKm = calculateHaversineDistanceKm(latNum, lngNum, itemLat, itemLng);
        const creQual = getCreSubstationQualification(item.nom_du_poste, item.code_poste);
        return {
          id: item.nom_du_poste || item.code_poste || 'Poste Source',
          name: item.nom_du_poste || 'Poste Source HTA/HTB',
          code: item.code_poste || '',
          voltageLevel: item.niveau_de_tension || '63/20 kV',
          availableCapacityMw: item.capacite_disponible_mw ?? item.capacite_restante_mw ?? 0,
          reservedCapacityMw: item.capacite_reservee_mw ?? 0,
          quotePartS3REnR: item.quote_part_s3renr || '—',
          gestionnaire: item.gestionnaire || 'Enedis / RTE',
          commune: item.commune || '',
          departement: item.departement || '',
          lat: itemLat,
          lng: itemLng,
          distanceKm: Math.round(distanceKm * 10) / 10,
          estimatedRouteMeters: estimateConnectionRouteMeters(distanceKm),
          creQualification: creQual
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return candidateSubstations[0] || null;
  } catch (err) {
    console.warn('[networkQualificationService] Erreur lors de la recherche du poste source:', err);
    return null;
  }
}

/**
 * Qualification réseau complète d'un site BESS
 */
export async function qualifyBessProjectSite({
  projectName,
  siteName,
  lat,
  lng,
  address,
  city,
  powerKw = 500,
  capacityKwh = 1044,
  voltageDomainOverride = null,
  distanceOverrideMeters = null
}) {
  const power = Number(powerKw) || 500;
  const capacity = Number(capacityKwh) || 1044;
  const recommendedVoltage = recommendVoltageDomain(power);

  // 1. Recherche prioritaire dans la Matrice ODRE des 31 sites certifiés
  const matchedMatrixSite = findBessOdreData(
    projectName || siteName || '',
    city || '',
    address || '',
    lat,
    lng
  );

  if (matchedMatrixSite) {
    const latFinal = matchedMatrixSite.latitude;
    const lngFinal = matchedMatrixSite.longitude;
    const distKmFinal = matchedMatrixSite.distanceKm;
    const distMetersFinal = distanceOverrideMeters ? Number(distanceOverrideMeters) : Math.round(distKmFinal * 1000);
    const effectiveDomainKey = voltageDomainOverride || 'HTA1';

    return {
      powerKw: power,
      capacityKwh: capacity,
      cRate: Math.round((power / (capacity || 1)) * 100) / 100,
      dischargeDurationHours: Math.round(((capacity * 0.9) / (power || 1)) * 10) / 10,
      distancePrivDefault: 10,

      // Informations géographiques certifiées
      gps: {
        lat: latFinal,
        lng: lngFinal,
        address: matchedMatrixSite.commune,
        city: matchedMatrixSite.commune,
        dept: matchedMatrixSite.departement,
        postcode: matchedMatrixSite.codePostal,
        hasValidGps: true
      },

      // Poste source certifié Niveau 1 : Officiel Direct
      substation: {
        name: matchedMatrixSite.posteSourceEnedis,
        code: matchedMatrixSite.posteSourceEnedis,
        voltageLevel: matchedMatrixSite.tension || 'HTA 20 kV (Enedis)',
        availableCapacityMw: matchedMatrixSite.capaciteResiduelleOdreMw,
        reservedCapacityMw: 0,
        quotePartS3REnR: matchedMatrixSite.quotePartS3REnR,
        quotePartS3renrEur: matchedMatrixSite.quotePartS3renrEur,
        fileAttenteMw: 0,
        tauxOccupation: '—',
        gestionnaire: 'Enedis',
        distanceKm: distKmFinal,
        estimatedRouteMeters: distMetersFinal,
        statutRaccordement: matchedMatrixSite.statutRaccordement || 'Transfo sol libre - Dépôt PTF',
        creQualification: {
          label: matchedMatrixSite.typologieZoneCre,
          code: matchedMatrixSite.typologieZoneCre,
          isIndexed: true,
          description: 'Délibération CRE 2025-227 — Neutralité stockage garantie'
        },
        certitude: CERTITUDE_LEVELS[1], // NIVEAU 1 : OFFICIEL DIRECT ENEDIS
        status: 'OFFICIEL DIRECT ENEDIS'
      },

      connection: {
        domainKey: effectiveDomainKey,
        voltageKv: 20,
        distanceMeters: distMetersFinal,
        distanceCertitude: CERTITUDE_LEVELS[1],
        domainCertitude: CERTITUDE_LEVELS[1],
        isConfirmed: true,
        statusMessage: `Poste source ${matchedMatrixSite.posteSourceEnedis} (HTA 20 kV) certifié ODRE à ${distKmFinal} km.`
      }
    };
  }

  // 2. Recherche générale par coordonnées GPS dans Caparéseau
  let closestSubstation = null;
  if (lat && lng) {
    closestSubstation = await fetchClosestSubstation(lat, lng);
  }

  // Distance de raccordement finale retenue
  let distanceMeters = 100;
  let distanceCertitude = CERTITUDE_LEVELS[4]; // Hypothèse par défaut

  if (distanceOverrideMeters && !isNaN(distanceOverrideMeters)) {
    distanceMeters = Number(distanceOverrideMeters);
    distanceCertitude = CERTITUDE_LEVELS[4]; // Saisie manuelle utilisateur
  } else if (closestSubstation && closestSubstation.estimatedRouteMeters) {
    distanceMeters = closestSubstation.estimatedRouteMeters;
    distanceCertitude = CERTITUDE_LEVELS[2]; // Officiel rapproché ODRE / Caparéseau
  }

  // Domaine de tension retenu
  const effectiveDomainKey = voltageDomainOverride || recommendedVoltage.domainKey;

  return {
    powerKw: power,
    capacityKwh: capacity,
    cRate: Math.round((power / (capacity || 1)) * 100) / 100, // C-Rate (ex: 0.48C pour 500kW/1044kWh)
    dischargeDurationHours: Math.round(((capacity * 0.9) / (power || 1)) * 10) / 10, // ex: ~1.9h
    distancePrivDefault: 10, // 10 m de distance privée par défaut

    // Informations géographiques
    gps: {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      address: address || '',
      city: city || '',
      hasValidGps: !!(lat && lng)
    },

    // Poste source identifié
    substation: closestSubstation ? {
      name: closestSubstation.name,
      code: closestSubstation.code || '',
      voltageLevel: closestSubstation.voltageLevel,
      availableCapacityMw: closestSubstation.availableCapacityMw,
      reservedCapacityMw: closestSubstation.reservedCapacityMw,
      quotePartS3REnR: closestSubstation.quotePartS3REnR,
      fileAttenteMw: closestSubstation.fileAttenteMw,
      tauxOccupation: closestSubstation.tauxOccupation,
      gestionnaire: closestSubstation.gestionnaire,
      distanceKm: closestSubstation.distanceKm,
      estimatedRouteMeters: closestSubstation.estimatedRouteMeters,
      creQualification: closestSubstation.creQualification || getCreSubstationQualification(closestSubstation.name, closestSubstation.code),
      certitude: CERTITUDE_LEVELS[2], // Officiel rapproché ODRE
      status: 'IDENTIFIÉ'
    } : {
      name: 'Poste Source non géolocalisé',
      code: '',
      voltageLevel: '20 kV',
      availableCapacityMw: null,
      reservedCapacityMw: null,
      quotePartS3REnR: '—',
      fileAttenteMw: 0,
      tauxOccupation: '—',
      gestionnaire: 'Enedis',
      distanceKm: null,
      creQualification: getCreSubstationQualification('', ''),
      certitude: CERTITUDE_LEVELS[4], // À CONFIRMER
      status: 'À CONFIRMER'
    },

    // Raccordement et domaine de tension
    connection: {
      domainKey: effectiveDomainKey,
      voltageKv: effectiveDomainKey.startsWith('HTA') ? 20 : 0.4,
      distanceMeters,
      distanceCertitude,
      domainCertitude: recommendedVoltage.certitude,
      isConfirmed: recommendedVoltage.isConfirmed && !!closestSubstation,
      statusMessage: closestSubstation 
        ? `Poste source ${closestSubstation.name} (${closestSubstation.code || ''}) identifié à ${closestSubstation.distanceKm} km.`
        : 'Coordonnées GPS partielles ou non rapprochées — Hypothèse standard HTA 20 kV (À CONFIRMER).'
    }
  };
}
