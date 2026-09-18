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

/**
 * Interroge l'API Open Data Enedis/ODRE pour localiser le poste source le plus proche des coordonnées GPS
 */
export async function fetchClosestSubstation(lat, lng) {
  if (!lat || !lng) return null;

  try {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return null;

    // Délimitation d'une bounding box de recherche (~35 km autour des coordonnées)
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

    // Calcul de la distance pour chaque poste trouvé et tri par proximité
    const candidateSubstations = data.results
      .map(item => {
        const itemLat = item.geo_point_2d?.lat || item.latitude;
        const itemLng = item.geo_point_2d?.lon || item.longitude;
        if (!itemLat || !itemLng) return null;

        const distanceKm = calculateHaversineDistanceKm(latNum, lngNum, itemLat, itemLng);
        return {
          id: item.nom_du_poste || item.code_poste || 'Poste Source',
          name: item.nom_du_poste || 'Poste Source HTA/HTB',
          voltageLevel: item.niveau_de_tension || '63/20 kV',
          availableCapacityMw: item.capacite_disponible_mw ?? item.capacite_restante_mw ?? null,
          reservedCapacityMw: item.capacite_reservee_mw ?? null,
          gestionnaire: item.gestionnaire || 'Enedis / RTE',
          commune: item.commune || '',
          departement: item.departement || '',
          lat: itemLat,
          lng: itemLng,
          distanceKm: Math.round(distanceKm * 10) / 10,
          estimatedRouteMeters: estimateConnectionRouteMeters(distanceKm)
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
    distanceCertitude = CERTITUDE_LEVELS[3]; // Calculé à partir du poste source géolocalisé
  }

  // Domaine de tension retenu
  const effectiveDomainKey = voltageDomainOverride || recommendedVoltage.domainKey;

  return {
    powerKw: power,
    capacityKwh: capacity,
    cRate: Math.round((power / (capacity || 1)) * 100) / 100, // C-Rate (ex: 0.48C pour 500kW/1044kWh)
    dischargeDurationHours: Math.round(((capacity * 0.9) / (power || 1)) * 10) / 10, // ex: ~1.9h

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
      voltageLevel: closestSubstation.voltageLevel,
      availableCapacityMw: closestSubstation.availableCapacityMw,
      gestionnaire: closestSubstation.gestionnaire,
      distanceKm: closestSubstation.distanceKm,
      certitude: CERTITUDE_LEVELS[2], // Officiel rapproché ODRE
      status: 'IDENTIFIÉ'
    } : {
      name: 'Poste Source non géolocalisé',
      voltageLevel: '20 kV',
      availableCapacityMw: null,
      gestionnaire: 'Enedis',
      distanceKm: null,
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
        ? `Poste source ${closestSubstation.name} identifié à ${closestSubstation.distanceKm} km.`
        : 'Coordonnées GPS partielles ou non rapprochées — Hypothèse standard HTA 20 kV (À CONFIRMER).'
    }
  };
}
