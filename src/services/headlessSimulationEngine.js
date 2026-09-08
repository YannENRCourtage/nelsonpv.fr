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
 * Exécute la simulation complète d'un bâtiment en mode headless avec inférence géométrique
 */
export async function simulateBuildingHeadless({
  building,
  addressInfo = null,
  cadastreInfo = null,
  customSettings = {}
}) {
  const { polygon, area, center } = building;

  // 1. Inférence géospatiale dynamique de la toiture (OBB, faîtage, azimut, versants, terrasse vs inclinée)
  const roofInference = inferRoofCharacteristics(polygon, building.tags || {});

  const isTerrasse = customSettings.isTerrasse !== undefined
    ? customSettings.isTerrasse
    : roofInference.isTerrasse;

  const pitch = customSettings.pitch !== undefined
    ? customSettings.pitch
    : roofInference.pitch;

  const roofType = customSettings.roofType || roofInference.roofType;
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
  const tarifEdfOaKwh = customSettings.tarifEdfOa !== undefined ? Number(customSettings.tarifEdfOa) : (minKwc >= 100 ? 0.085 : 0.011);

  let rawKwc = Math.round(maxPanels * 0.465 * 10) / 10;
  
  // Filtrage strict : rejeter si la puissance installable est hors plage [minKwc, maxKwc]
  if (rawKwc < minKwc || rawKwc > maxKwc) {
    console.warn(`[Ignoré] Toiture ${building.id} : puissance ${rawKwc} kWc hors plage cible [${minKwc} - ${maxKwc} kWc]`);
    return null;
  }

  let installedKwc = rawKwc;
  const panelCount = Math.max(1, Math.round((installedKwc * 1000) / 465));

  // 5. Productible énergétique départemental et inclinaison
  const departmentCode = addressInfo?.departmentCode || (addressInfo?.postcode ? addressInfo.postcode.substring(0, 2) : '59');
  const regionalBaseYield = getProductionForDepartment(departmentCode) || 1100;

  // Coefficient d'inclinaison (1.00 à 30°, 0.96 à 15°, 0.90 à 0° plat)
  const inclinationCoeff = pitch === 30 ? 1.00 : (pitch === 15 || pitch === 45) ? 0.96 : 0.90;

  // 6. Répartition et productible selon la modélisation géométrique déduite (Terrasse vs Inclinée)
  const share1 = roofInference.slopes.pan1?.share ?? (roofType === 'symetrique' ? 0.50 : 0.70);
  const share2 = roofInference.slopes.pan2?.share ?? (isTerrasse ? 0 : (1 - share1));

  const pan1Kwc = Math.round(installedKwc * share1 * 10) / 10;
  const pan2Kwc = Math.max(0, Math.round((installedKwc - pan1Kwc) * 10) / 10);

  const coeff1 = roofInference.slopes.pan1?.coeff || 1.00;
  const yield1 = Math.round(regionalBaseYield * coeff1 * inclinationCoeff);
  const prodKwh1 = Math.round(pan1Kwc * yield1);

  let coeff2 = 0.70;
  let yield2 = 0;
  let prodKwh2 = 0;
  if (share2 > 0 && roofInference.slopes.pan2) {
    coeff2 = roofInference.slopes.pan2.coeff || 0.70;
    yield2 = Math.round(regionalBaseYield * coeff2 * inclinationCoeff);
    prodKwh2 = Math.round(pan2Kwc * yield2);
  }

  const annualProductionKwh = prodKwh1 + prodKwh2;
  const effectiveOrientationCoeff = installedKwc > 0
    ? ((pan1Kwc * coeff1) + (pan2Kwc * coeff2)) / installedKwc
    : coeff1;

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

    // VÉRIFICATION STRICTE : Rejet si la toiture dispose déjà de panneaux solaires existants (ex: Image 3)
    if (snapshotResult && typeof snapshotResult === 'object' && snapshotResult.hasExistingSolar) {
      console.warn(`[Ignoré] Toiture déjà équipée de panneaux solaires : bâtiment ${building.id}`);
      return null;
    }

    mapScreenshot = snapshotResult && typeof snapshotResult === 'object' && snapshotResult.dataUrl
      ? snapshotResult.dataUrl
      : snapshotResult;
  } catch (e) {
    console.warn(`Snapshot satellite impossible pour bâtiment ${building.id}:`, e);
  }

  // 9. Données d'identité du site et du client
  const cityName = addressInfo?.city || 'Zone d’activités';
  const fullAddress = addressInfo?.label || `${cityName} (${departmentCode})`;
  const clientName = addressInfo?.street
    ? `Bâtiment ${addressInfo.street}`
    : (cadastreInfo?.parcelleRef ? `Parcelle ${cadastreInfo.parcelleRef}` : `Toiture Solaire ${cityName}`);

  // 10. Assemblage de l'objet de simulation normalisé NELSON
  const simulation = {
    type: 'toiture_pv',
    title: `Offre Commerciale Toiture Solaire ${installedKwc} kWc — ${cityName}`,
    clientName,
    address: fullAddress,
    cityName,
    departmentCode,
    cadastreRef: cadastreInfo?.parcelleRef || null,
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
    orientationLabel: roofInference.displayLabel,
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
      label: roofInference.slopes.pan1?.label || 'Plein Sud',
      angle: roofInference.slopes.pan1?.azimuthDeg || 180,
      installedKwc: pan1Kwc,
      productionKwh: prodKwh1,
      specificYield: yield1
    },
    pan2: (share2 > 0 && roofInference.slopes.pan2) ? {
      label: roofInference.slopes.pan2.label,
      angle: roofInference.slopes.pan2.azimuthDeg,
      installedKwc: pan2Kwc,
      productionKwh: prodKwh2,
      specificYield: yield2
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
