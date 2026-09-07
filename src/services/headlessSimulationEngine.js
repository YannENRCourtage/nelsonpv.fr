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
 * Exécute la simulation complète d'un bâtiment en mode headless
 */
export async function simulateBuildingHeadless({
  building,
  addressInfo = null,
  cadastreInfo = null,
  customSettings = {}
}) {
  const { polygon, area, center } = building;

  const pitch = customSettings.pitch || 15; // 15° par défaut
  const roofType = customSettings.roofType || 'asymetrique'; // Asymétrique par défaut
  const costPerKwc = customSettings.costPerKwc || 920; // 920 €/kWc

  // 1. Détection automatique du faîtage (arête sélectionnée orientée vers le Sud ou arête la plus longue)
  const ridgeIndex = building.ridgeIndex !== undefined ? building.ridgeIndex : findLongestEdgeIndex(polygon);
  const p1 = polygon[ridgeIndex];
  const p2 = polygon[(ridgeIndex + 1) % polygon.length];

  // 2. Calcul de l'orientation selon le faîtage
  const orientationInfo = calculateOrientationFromRidge(p1, p2, polygon, roofType, ridgeIndex);

  // 3. Calepinage géométrique des panneaux solaires 465 Wc
  let maxPanels = 0;
  try {
    const res = computeValidSolarSlots(polygon, ridgeIndex, false);
    maxPanels = res.maxPanels || 0;
  } catch (e) {
    console.warn(`Fallback calepinage géométrique pour bâtiment ${building.id}:`, e);
  }

  if (!maxPanels || maxPanels < 1) {
    // Règle de sécurité : 1 panneau par ~2.05 m² avec 10% de marge périphérique
    maxPanels = Math.max(1, Math.round((area * 0.90) / 2.05));
  }

  // 4. Puissance crête installée (cible 100 à 500 kWc)
  let rawKwc = Math.round(maxPanels * 0.465 * 10) / 10;
  // Cadrage entre 100 kWc et 500 kWc
  let installedKwc = Math.max(100, Math.min(500, rawKwc));
  const panelCount = Math.max(1, Math.round((installedKwc * 1000) / 465));

  // 5. Productible énergétique départemental et inclinaison
  const departmentCode = addressInfo?.departmentCode || (addressInfo?.postcode ? addressInfo.postcode.substring(0, 2) : '59');
  const regionalBaseYield = getProductionForDepartment(departmentCode) || 1100;

  // Coefficient d'inclinaison pour 15° (ou 30°)
  const inclinationCoeff = pitch === 30 ? 1.00 : (pitch === 15 || pitch === 45) ? 0.96 : 0.90;

  // 6. Répartition et productible selon le type de toiture (Asymétrique mono-pente vs Symétrique bi-pans)
  const isSymetrique = roofType === 'symetrique' && orientationInfo.pan2;
  const pan1 = orientationInfo.pan1 || { coeff: 1.00, orientationLabel: 'Plein Sud (0°)', angle: 0 };
  const pan2 = orientationInfo.pan2 || null;

  const coeff1 = pan1.coeff || 1.00;
  const yield1 = Math.round(regionalBaseYield * coeff1 * inclinationCoeff);

  let halfKwc = installedKwc;
  let otherKwc = 0;
  let prodKwh1 = Math.round(installedKwc * yield1);
  let prodKwh2 = 0;
  let yield2 = 0;
  let annualProductionKwh = prodKwh1;
  let effectiveOrientationCoeff = coeff1;

  if (isSymetrique && pan2) {
    const coeff2 = pan2.coeff || 0.75;
    yield2 = Math.round(regionalBaseYield * coeff2 * inclinationCoeff);
    halfKwc = Math.round((installedKwc / 2) * 10) / 10;
    otherKwc = Math.max(0, Math.round((installedKwc - halfKwc) * 10) / 10);
    prodKwh1 = Math.round(halfKwc * yield1);
    prodKwh2 = Math.round(otherKwc * yield2);
    annualProductionKwh = prodKwh1 + prodKwh2;
    effectiveOrientationCoeff = installedKwc > 0
      ? ((halfKwc * coeff1) + (otherKwc * coeff2)) / installedKwc
      : coeff1;
  }

  // 7. Modèle économique & financier EDF Obligation d'Achat (OA)
  // Tarif réglementé : 0.085 €/kWh pour les centrales >= 100 kWc
  const tarifEdfOaKwh = installedKwc >= 100 ? 0.085 : 0.011;
  const annualRevenue = Math.round(annualProductionKwh * tarifEdfOaKwh);

  const totalInvestmentHT = Math.round(installedKwc * costPerKwc);
  const paybackYear = annualRevenue > 0 ? (totalInvestmentHT / annualRevenue).toFixed(1) : '10.5';

  // Projection financière sur 30 ans (cumul avec dégradation annuelle des panneaux de 0,5%)
  let cumul10 = 0;
  let cumul20 = 0;
  let cumul30 = 0;
  for (let yr = 1; yr <= 30; yr++) {
    const degradation = Math.pow(0.995, yr - 1);
    const yrRevenue = Math.round(annualRevenue * degradation);
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
    orientationLabel: orientationInfo.orientationLabel,
    effectiveOrientationCoeff,
    annualProductionKwh,
    tarifEdfOaKwh,
    annualRevenueReventeTotale: annualRevenue,
    annualBenefitYear1: annualRevenue,
    totalInvestmentHT,
    paybackYear,
    totalGains30Years: cumul30,
    cumul10,
    cumul20,
    cumul30,
    mapScreenshot,
    pan1: {
      label: pan1.orientationLabel,
      angle: pan1.angle,
      installedKwc: halfKwc,
      productionKwh: prodKwh1,
      specificYield: yield1
    },
    pan2: isSymetrique && pan2 ? {
      label: pan2.orientationLabel,
      angle: pan2.angle,
      installedKwc: otherKwc,
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
