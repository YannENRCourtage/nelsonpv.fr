/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HEADLESS SIMULATION ENGINE
 * Moteur de simulation toiture photovoltaïque 100% headless (sans UI Leaflet)
 * - Détection automatique de la sablière & faîtage optimal
 * - Calepinage géométrique (modules 465 Wc portrait)
 * - Modélisation toiture symétrique bipente 15°
 * - Dimensionnement capacitaire (100 kWc à 500 kWc)
 * - Tarification EDF OA (0,085 €/kWh) & cashflow sur 30 ans
 * - Snapshot satellite haute résolution au zoom 19
 * - Génération du PDF d'offre commerciale en mémoire (Blob)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';
import { calculateOrientationFromRidge } from '@/components/simulator/RoofMapPolygonSelector';
import { computeValidSolarSlots } from '@/utils/solarCalepinage';
import { generateBeforeAfterDualSnapshot } from '@/utils/satelliteSnapshot';
import { generateCommercialOfferPDF } from '@/components/simulator/CommercialOfferPDF';
import { inferRoofCharacteristics } from '@/services/roofGeometryInference';

// Calcul de la distance géodésique entre deux points en mètres
function calculateDistanceMeters(p1, p2) {
  const midLat = ((p1.lat + p2.lat) / 2 * Math.PI) / 180;
  const dLat = (p2.lat - p1.lat) * 110574;
  const dLng = (p2.lng - p1.lng) * 111320 * Math.cos(midLat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Trouver l'arête la plus longue d'un polygone (faîtage/sablière naturel)
export function findLongestEdgeIndex(points) {
  if (!points || points.length < 2) return 0;
  let maxDist = 0;
  let bestIdx = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const dist = calculateDistanceMeters(p1, p2);
    if (dist > maxDist) {
      maxDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Recherche les parcelles cadastrales et les propriétaires personnes morales d'une toiture
 * via API Apicarto IGN + Koumoul (DGFiP Open Data MAJIC)
 */
export async function fetchCadastralOwnersForBuilding(building) {
  try {
    let parcelCodes = [];

    // 1. Polygone du bâtiment en coordonnées GeoJSON [lon, lat]
    if (Array.isArray(building?.polygon) && building.polygon.length >= 3) {
      const ring = building.polygon.map(p => {
        if (p.lng !== undefined && p.lat !== undefined) return [p.lng, p.lat];
        if (Array.isArray(p)) return [p[1], p[0]];
        return null;
      }).filter(Boolean);

      if (ring.length >= 3) {
        if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
          ring.push([...ring[0]]);
        }
        const geojsonPolygon = {
          type: 'Polygon',
          coordinates: [ring]
        };

        const ignUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify(geojsonPolygon))}&source_ign=PCI`;
        const res = await fetch(ignUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            parcelCodes = data.features.map(f => f.properties?.idu || f.properties?.id || f.properties?.code_parc).filter(Boolean);
          }
        }
      }
    }

    // 2. Repli sur le point central
    if (parcelCodes.length === 0 && building?.center) {
      const lat = Array.isArray(building.center) ? building.center[0] : building.center.lat;
      const lon = Array.isArray(building.center) ? building.center[1] : (building.center.lng !== undefined ? building.center.lng : building.center.lon);
      if (lat !== undefined && lon !== undefined) {
        const ignUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))}&source_ign=PCI`;
        const res = await fetch(ignUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            parcelCodes = data.features.map(f => f.properties?.idu || f.properties?.id || f.properties?.code_parc).filter(Boolean);
          }
        }
      }
    }

    if (parcelCodes.length === 0) return null;

    // Déduplication des codes de parcelles
    parcelCodes = [...new Set(parcelCodes)];

    // 3. Requête Koumoul pour obtenir les personnes morales propriétaires (MAJIC DGFiP)
    const qs = `code_parcelle:(${parcelCodes.map(c => `"${c}"`).join(' OR ')})`;
    const koumoulUrl = `https://opendata.koumoul.com/data-fair/api/v1/datasets/parcelles-des-personnes-morales/lines?qs=${encodeURIComponent(qs)}&size=25`;
    const kRes = await fetch(koumoulUrl);
    if (kRes.ok) {
      const kData = await kRes.json();
      if (kData.results && kData.results.length > 0) {
        const owners = kData.results.map(r => ({
          name: (r.denomination || '').trim().replace(/\s+/g, ' '),
          siren: r.numero_siren,
          nature: r.forme_juridique_abregee,
          address: (r.adresse || '').trim(),
          postalCode: r.code_commune || r['_infos_commune.code_commune'],
          city: r.nom_commune || r['_infos_commune.nom_commune'],
          parcel: r.code_parcelle
        })).filter(o => o.name);

        if (owners.length > 0) {
          return {
            parcelCodes,
            owners,
            primaryOwnerName: owners[0].name
          };
        }
      }
    }

    return { parcelCodes, owners: [], primaryOwnerName: null };
  } catch (err) {
    console.warn('Erreur détection propriétaires fonciers toiture:', err);
    return null;
  }
}

/**
 * Exécute la simulation complète d'un bâtiment en mode headless avec inférence géométrique
 */
export async function simulateBuildingHeadless({
  building,
  addressInfo = null,
  cadastreInfo = null,
  customSettings = {}
}) {
  const { polygon, area, center } = building;

  const googleSolarData = customSettings.googleSolarData || building.googleSolarData || null;

  // 1. Inférence géospatiale dynamique de la toiture (OBB, faîtage, azimut, versants, terrasse vs inclinée)
  const roofInference = inferRoofCharacteristics(polygon, building.tags || {});

  // Utilisation prioritaire de l'azimut personnalisé ou fourni par Google Solar
  const targetAzimuth = customSettings.azimuth !== undefined
    ? Number(customSettings.azimuth)
    : (googleSolarData?.azimuth !== undefined ? Number(googleSolarData.azimuth) : undefined);

  if (targetAzimuth !== undefined) {
    roofInference.azimuth = targetAzimuth;
    const azDiff = Math.abs(targetAzimuth - 180);
    const azCoeff = Math.max(0.70, 1.0 - (azDiff / 180) * 0.25);
    if (roofInference.slopes?.pan1) {
      roofInference.slopes.pan1.coeff = azCoeff;
      roofInference.slopes.pan1.azimuth = targetAzimuth;
    }
    roofInference.displayLabel = googleSolarData?.azimuth !== undefined && customSettings.azimuth === undefined
      ? `Google Solar Azimut ${Math.round(targetAzimuth)}°`
      : `Azimut ${Math.round(targetAzimuth)}°`;
  }

  // Utilisation prioritaire de la pente personnalisée ou fournie par Google Solar
  const requestedPitch = customSettings.pitch !== undefined
    ? Number(customSettings.pitch)
    : (googleSolarData?.pitch !== undefined ? Number(googleSolarData.pitch) : undefined);

  const isTerrasse = requestedPitch === 0
    ? true
    : (customSettings.isTerrasse !== undefined ? customSettings.isTerrasse : roofInference.isTerrasse);

  const pitch = requestedPitch !== undefined
    ? requestedPitch
    : (isTerrasse ? 0 : roofInference.pitch);

  const roofType = (pitch === 0 || isTerrasse)
    ? 'terrasse'
    : (customSettings.roofType || roofInference.roofType);
  const costPerKwc = customSettings.costPerKwc || 920; // 920 €/kWc

  // 2. Détection / sélection de l'axe de faîtage (arête sélectionnée orientée vers le Sud ou arête la plus longue)
  const ridgeIndex = building.ridgeIndex !== undefined
    ? building.ridgeIndex
    : findLongestEdgeIndex(polygon);

  // 3. Calepinage géométrique des panneaux solaires 465 Wc
  let maxPanels = 0;
  if (!isTerrasse) {
    try {
      const res = computeValidSolarSlots(polygon, ridgeIndex, false);
      maxPanels = res.maxPanels || 0;
    } catch (e) {
      console.warn(`Fallback calepinage géométrique pour bâtiment ${building.id}:`, e);
    }
  }

  if (!maxPanels || maxPanels < 1) {
    // Règle de dimensionnement :
    // - Toiture terrasse : pose sur bacs lestés avec espacement inter-rangs anti-ombrage (GCR ~60%)
    // - Toiture inclinée : calepinage coplanaire plein pan (GCR ~90%)
    const surfaceRatio = isTerrasse ? 0.60 : 0.90;
    maxPanels = Math.max(1, Math.round((area * surfaceRatio) / 2.05));
  }

  // 4. Puissance crête installée (cible minKwc à maxKwc)
  const minKwc = customSettings.minKwc !== undefined ? Number(customSettings.minKwc) : 100;
  const maxKwc = customSettings.maxKwc !== undefined ? Number(customSettings.maxKwc) : 500;
  const economicModel = customSettings.economicModel || 'vente_totale'; // 'vente_totale' | 'autoconsommation' | 'autoconsommation_stockage'

  let rawKwc = Math.round(maxPanels * 0.465 * 10) / 10;
  
  // Filtrage : rejeter uniquement si la toiture est sous le seuil minimum requis
  if (rawKwc < minKwc) {
    console.warn(`[Ignoré] Toiture ${building.id} : puissance ${rawKwc} kWc inférieure au seuil cible [${minKwc} kWc]`);
    return null;
  }

  // Si la puissance calculée dépasse le plafond demandé, on plafonne l'installation à maxKwc sans rejeter le bâtiment
  let installedKwc = rawKwc;
  if (maxKwc > 0 && rawKwc > maxKwc) {
    installedKwc = maxKwc;
  }
  if (customSettings.targetMaxKwc && Number(customSettings.targetMaxKwc) > 0) {
    installedKwc = Math.min(installedKwc, Math.round(Number(customSettings.targetMaxKwc) * 10) / 10);
  }

  // Tarif EDF OA : 0.078€/kWh pour >500 kWc, 0.085€/kWh pour 100-500 kWc, 0.011€/kWh pour <100 kWc
  const tarifEdfOaKwh = customSettings.tarifEdfOa !== undefined
    ? Number(customSettings.tarifEdfOa)
    : (installedKwc > 500 ? 0.078 : (installedKwc >= 100 ? 0.085 : 0.011));
  const panelCount = Math.max(1, Math.round((installedKwc * 1000) / 465));

  // 5. Productible énergétique départemental et inclinaison
  const departmentCode = addressInfo?.departmentCode || (addressInfo?.postcode ? addressInfo.postcode.substring(0, 2) : '59');
  const regionalBaseYield = getProductionForDepartment(departmentCode) || 1100;

  // Modulation de précision par l'ensoleillement réel Google Solar (heures/an)
  const sunshineHours = Number(googleSolarData?.maxSunshineHoursPerYear || 0);
  const sunshineYieldBoost = sunshineHours > 0
    ? Math.max(0.85, Math.min(1.30, sunshineHours / 1400))
    : 1.0;
  const effectiveBaseYield = Math.round(regionalBaseYield * sunshineYieldBoost);

  // Coefficient d'inclinaison (1.00 à 30°, 0.96 à 15°, 0.95 à 0° terrasse plein Sud, 0.90 standard)
  const inclinationCoeff = (pitch === 0 || isTerrasse) ? 0.95 : (pitch === 30 ? 1.00 : (pitch === 15 || pitch === 45) ? 0.96 : 0.90);

  // 6. Répartition et productible selon la modélisation géométrique déduite (Terrasse vs Inclinée)
  const share1 = (pitch === 0 || isTerrasse) ? 1.00 : (roofInference.slopes.pan1?.share ?? (roofType === 'symetrique' ? 0.50 : 0.70));
  const share2 = (pitch === 0 || isTerrasse) ? 0 : (roofInference.slopes.pan2?.share ?? (1 - share1));

  const pan1Kwc = Math.round(installedKwc * share1 * 10) / 10;
  const pan2Kwc = Math.max(0, Math.round((installedKwc - pan1Kwc) * 10) / 10);

  const coeff1 = (pitch === 0 || isTerrasse) ? 1.00 : (roofInference.slopes.pan1?.coeff || 1.00);
  const yield1 = Math.round(effectiveBaseYield * coeff1 * inclinationCoeff);
  const prodKwh1 = Math.round(pan1Kwc * yield1);

  let coeff2 = 0.70;
  let yield2 = 0;
  let prodKwh2 = 0;
  if (share2 > 0 && roofInference.slopes.pan2 && !isTerrasse) {
    coeff2 = roofInference.slopes.pan2.coeff || 0.70;
    yield2 = Math.round(effectiveBaseYield * coeff2 * inclinationCoeff);
    prodKwh2 = Math.round(pan2Kwc * yield2);
  }

  const annualProductionKwh = prodKwh1 + prodKwh2;
  const effectiveOrientationCoeff = (pitch === 0 || isTerrasse)
    ? 1.00
    : (installedKwc > 0 ? ((pan1Kwc * coeff1) + (pan2Kwc * coeff2)) / installedKwc : coeff1);

  const orientationLabel = (pitch === 0 || isTerrasse)
    ? 'Toiture terrasse (Plein Sud 0°)'
    : roofInference.displayLabel;

  // 7. Modèle économique & financier selon le mode de valorisation
  const annualRevenueReventeTotale = Math.round(annualProductionKwh * tarifEdfOaKwh);
  let annualBenefitYear1 = annualRevenueReventeTotale;
  let annualSavingsAutoconso = 0;
  let annualRevenueSurplus = 0;
  let autoconsoKwh = 0;
  let surplusKwh = annualProductionKwh;
  let autoconsoRate = 0;

  if (economicModel === 'autoconsommation') {
    autoconsoRate = 65;
    autoconsoKwh = Math.round(annualProductionKwh * 0.65);
    surplusKwh = Math.round(annualProductionKwh * 0.35);
    annualSavingsAutoconso = Math.round(autoconsoKwh * 0.26); // 0,26 €/kWh économisé
    annualRevenueSurplus = Math.round(surplusKwh * (customSettings.tarifEdfOa || 0.13)); // surplus
    annualBenefitYear1 = annualSavingsAutoconso + annualRevenueSurplus;
  } else if (economicModel === 'autoconsommation_stockage') {
    autoconsoRate = 100;
    autoconsoKwh = annualProductionKwh;
    surplusKwh = 0;
    annualSavingsAutoconso = Math.round(annualProductionKwh * 0.26); // 100% de la production valorisée en autoconsommation
    annualRevenueSurplus = 0;
    annualBenefitYear1 = annualSavingsAutoconso;
  }

  const annualRevenue = annualBenefitYear1;
  const totalInvestmentHT = Math.round(installedKwc * costPerKwc);
  const paybackYear = annualRevenue > 0 ? (totalInvestmentHT / annualRevenue).toFixed(1) : '10.5';

  // Projection financière sur 30 ans (cumul avec dégradation annuelle des panneaux de 0,5%)
  let cumul10 = 0;
  let cumul20 = 0;
  let cumul30 = 0;
  for (let yr = 1; yr <= 30; yr++) {
    const degradation = Math.pow(0.995, yr - 1);
    const yrRevenue = Math.round(annualBenefitYear1 * degradation);
    if (yr <= 10) cumul10 += yrRevenue;
    if (yr <= 20) cumul20 += yrRevenue;
    if (yr <= 30) cumul30 += yrRevenue;
  }

  // 8. Snapshot satellite Avant / Après en mémoire (Canvas) et détection panneaux existants
  let mapScreenshot = null;
  try {
    const snapshotResult = await generateBeforeAfterDualSnapshot({
      center,
      polygonPoints: polygon,
      customKwc: installedKwc,
      roofSurface: area,
      ridgeIndex,
      isLandscape: false,
      width: 950,
      height: 480,
      zoom: 19,
      returnDetails: true
    });

    // Note : Les puits de lumière ou verrières ne disqualifient pas la toiture (ils peuvent être recouverts ou intégrés)

    mapScreenshot = snapshotResult && typeof snapshotResult === 'object' && snapshotResult.dataUrl
      ? snapshotResult.dataUrl
      : snapshotResult;
  } catch (e) {
    console.warn(`Snapshot satellite impossible pour bâtiment ${building.id}:`, e);
  }

  // 9. Données d'identité du site et du client (croisement bases de données propriétaires fonciers)
  let ownerInfo = null;
  try {
    ownerInfo = await fetchCadastralOwnersForBuilding(building);
  } catch (err) {
    console.warn(`Recherche propriétaire toiture ${building.id} impossible:`, err);
  }

  const primaryOwnerName = ownerInfo?.primaryOwnerName || null;
  const cityName = addressInfo?.city || 'Zone d’activités';
  const fullAddress = addressInfo?.label || `${cityName} (${departmentCode})`;
  const clientName = primaryOwnerName || (addressInfo?.street
    ? `Bâtiment ${addressInfo.street}`
    : (cadastreInfo?.parcelleRef ? `Parcelle ${cadastreInfo.parcelleRef}` : `Toiture Solaire ${cityName}`));

  const cadastreRef = (ownerInfo?.parcelCodes && ownerInfo.parcelCodes.length > 0)
    ? ownerInfo.parcelCodes.join(', ')
    : (cadastreInfo?.parcelleRef || null);

  const includeCoverLetter = customSettings.includeCoverLetter ?? true;

  // 10. Assemblage de l'objet de simulation normalisé NELSON
  const simulation = {
    type: 'toiture_pv',
    title: `Offre Commerciale Toiture Solaire ${installedKwc} kWc — ${cityName}`,
    clientName,
    ownerName: primaryOwnerName,
    ownersList: ownerInfo?.owners || [],
    cadastreParcels: ownerInfo?.parcelCodes || (cadastreInfo?.parcelleRef ? [cadastreInfo.parcelleRef] : []),
    includeCoverLetter,
    address: fullAddress,
    cityName,
    departmentCode,
    cadastreRef,
    mapCenter: center,
    mapZoom: 19,
    polygonPoints: polygon,
    ridgeIndex,
    isLandscape: false,
    kwc: installedKwc,
    installedKwc,
    power: installedKwc,
    panelCount,
    roofSurface: area,
    roofType,
    pitch,
    isTerrasse,
    excludeThirdParty: customSettings.excludeThirdParty === true,
    orientationLabel,
    effectiveOrientationCoeff,
    annualProductionKwh,
    economicModel,
    autoconsoRate,
    autoconsoKwh,
    surplusKwh,
    annualSavingsAutoconso,
    annualRevenueSurplus,
    tarifEdfOaKwh,
    annualRevenueReventeTotale,
    annualBenefitYear1,
    annualRevenue,
    totalInvestmentHT,
    paybackYear,
    totalGains30Years: cumul30,
    cumul10,
    cumul20,
    cumul30,
    mapScreenshot,
    ridge: roofInference.ridge,
    slopes: roofInference.slopes,
    dimensions: roofInference.dimensions,
    pan1: {
      label: (pitch === 0 || isTerrasse) ? 'Plein Sud (0°)' : (roofInference.slopes.pan1?.label || 'Plein Sud'),
      angle: (pitch === 0 || isTerrasse) ? 180 : (roofInference.slopes.pan1?.azimuthDeg || 180),
      installedKwc: pan1Kwc,
      productionKwh: prodKwh1,
      specificYield: yield1
    },
    pan2: (share2 > 0 && roofInference.slopes.pan2 && !isTerrasse) ? {
      label: roofInference.slopes.pan2.label,
      angle: roofInference.slopes.pan2.azimuthDeg,
      installedKwc: pan2Kwc,
      productionKwh: prodKwh2,
      specificYield: yield2
    } : null,
    googleSolar: googleSolarData ? {
      maxSunshineHoursPerYear: googleSolarData.maxSunshineHoursPerYear,
      maxArrayAreaMeters2: googleSolarData.maxArrayAreaMeters2,
      pitch: googleSolarData.pitch,
      azimuth: googleSolarData.azimuth,
      hasGoogle3D: true
    } : null
  };

  return simulation;
}

/**
 * Génère le PDF de l'offre commerciale et renvoie le Blob et le nom du fichier
 */
export async function generateProspectingPdfBlob(simulation) {
  const result = await generateCommercialOfferPDF({
    simulation,
    selectedProject: null,
    customClientName: simulation.clientName,
    returnBlob: true
  });

  return result;
}
