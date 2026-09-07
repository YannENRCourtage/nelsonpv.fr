/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PARKING HEADLESS SIMULATION ENGINE
 * Moteur de simulation 100% headless pour ombrières de parking photovoltaïques
 * 1. Exécution du calepinage géométrique (VL simple, VL double, PL)
 * 2. Dimensionnement capacitaire (kWc, nombre de places, panneaux 465 Wc)
 * 3. Calcul du productible régional (kWh) et recettes EDF OA
 * 4. Ingénierie financière des 2 scénarios (Crédit Bancaire + Abonnement SunLib)
 * 5. Génération du snapshot satellite avec surcouche ombrières
 * 6. Production du PDF commercial A4 en mémoire (Blob)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';
import { layoutOmbrieresOnParking, OMBRIERE_TYPOLOGIES } from '@/services/parkingCalepinageEngine';
import { calculateBankLoan, calculateLeasingSubscription } from '@/services/solarFinancingEngine';
import { generateSatelliteSnapshot, generateBeforeAfterDualSnapshot } from '@/utils/satelliteSnapshot';
import { generateCommercialOfferPDF } from '@/components/simulator/CommercialOfferPDF';

/**
 * Simule un parking de manière autonome (Headless)
 */
export async function simulateParkingHeadless({
  parking,
  addressInfo = null,
  cadastreInfo = null,
  customSettings = {}
}) {
  const typologyKey = customSettings.typology || 'ombriere_vl_auto';
  const costPerKwc = customSettings.costPerKwc || 1200; // 1 200 € / kWc (structure + génie civil + PV)
  const tarifEdfOaKwh = customSettings.tarifEdfOa || 0.085; // 0,085 €/kWh

  // 1. Calepinage géométrique des ombrières selon l'orientation naturelle du parking
  const layout = layoutOmbrieresOnParking({
    polygonWgs84: parking.polygon,
    parkingArea: parking.area,
    typologyKey
  });

  const {
    placedOmbrieres,
    totalCoveredArea,
    totalShelteredSpots,
    coverageRatio,
    panelCount,
    installedKwc,
    typology
  } = layout;

  // 2. Productible solaire selon le département
  const departmentCode = addressInfo?.departmentCode || (addressInfo?.postcode ? addressInfo.postcode.substring(0, 2) : '33');
  const regionalBaseYield = getProductionForDepartment(departmentCode) || 1100;

  // Coefficient d'inclinaison (pente ombrière 10° = ~0.95 de captation)
  const tiltCoeff = 0.95;
  const annualProductionKwh = Math.round(installedKwc * regionalBaseYield * tiltCoeff);
  const annualRevenueReventeTotale = Math.round(annualProductionKwh * tarifEdfOaKwh);

  // 3. CAPEX total HT
  const capexHT = Math.round(installedKwc * costPerKwc);

  // 4. Ingénierie financière : 2 Solutions de Financement (Crédit & Abonnement)
  // Solution A : Crédit Bancaire (20 ans, amortissable, 4.48%)
  const bankLoan = calculateBankLoan({
    capexHT,
    durationYears: 20,
    annualRevenue: annualRevenueReventeTotale
  });

  // Solution B : Abonnement Solaire (Leasing LOA SunLib, option rachat 1 €)
  const leasing = calculateLeasingSubscription({
    capexHT,
    powerKwc: installedKwc,
    annualRevenue: annualRevenueReventeTotale
  });

  const selectedLeasing = leasing.durations.find(d => d.durationYears === 20) || leasing.durations[2];

  // 5. Projection financière des gains cumulés sur 30 ans (pour le graphique PDF)
  let cumul = -capexHT;
  const annualNetYear1To20 = bankLoan.annualNetCashflow; // Gain net après remboursement du crédit
  const annualNetYear21To30 = annualRevenueReventeTotale; // Pleine propriété, 100% des recettes nettes

  const financialProjection30Years = [];
  let currentCumul = 0;
  for (let year = 1; year <= 30; year++) {
    if (year <= 20) {
      currentCumul += annualNetYear1To20;
    } else {
      currentCumul += annualNetYear21To30;
    }
    financialProjection30Years.push({
      year,
      cumul: currentCumul,
      cumulWithInitialInvestment: cumul + (year <= 20 ? (annualRevenueReventeTotale * year) : (annualRevenueReventeTotale * year))
    });
  }

  const cumul10 = financialProjection30Years[9]?.cumul || Math.round(annualNetYear1To20 * 10);
  const cumul20 = financialProjection30Years[19]?.cumul || Math.round(annualNetYear1To20 * 20);
  const cumul30 = financialProjection30Years[29]?.cumul || (cumul20 + Math.round(annualNetYear21To30 * 10));

  // 6. Snapshot satellite haute résolution : Vue Côte à Côte AVANT / APRÈS à zoom et cadrage identiques
  let mapScreenshotDataUrl = null;
  let singleMapScreenshot = null;
  try {
    mapScreenshotDataUrl = await generateBeforeAfterDualSnapshot({
      center: parking.center,
      polygonPoints: parking.polygon,
      polygonStyle: 'parking',
      ombriereBlocks: placedOmbrieres,
      customKwc: installedKwc,
      roofSurface: parking.area,
      parkingArea: parking.area,
      spotsCount: totalShelteredSpots,
      width: 950,
      height: 480
    });
  } catch (err) {
    console.warn(`Snapshot dual satellite avant-après impossible pour parking ${parking.id}:`, err);
  }

  // Snapshot satellite Après seul (en réserve si l'utilisateur choisit l'option Vue 3D + Satellite)
  try {
    singleMapScreenshot = await generateSatelliteSnapshot({
      center: parking.center,
      polygonPoints: parking.polygon,
      polygonStyle: 'parking',
      ombriereBlocks: placedOmbrieres,
      width: 850,
      height: 480,
      zoom: 19
    });
  } catch (err) {
    console.warn(`Snapshot satellite simple impossible pour parking ${parking.id}:`, err);
  }

  // 7. Objet de simulation consolidé compatible avec le moteur PDF
  const simulationData = {
    type: 'ombriere_parking',
    projectType: 'ombriere_parking',
    id: parking.id,
    osmId: parking.osmId,
    clientName: parking.name || addressInfo?.label || 'Projet Ombrières Photovoltaïques',
    address: addressInfo?.label || `${addressInfo?.street || ''} ${addressInfo?.postcode || ''} ${addressInfo?.city || ''}`.trim(),
    cityName: addressInfo?.city || 'Bordeaux',
    departmentCode,
    cadastreRef: cadastreInfo?.parcelleRef || '',

    // Données techniques ombrières
    typology,
    typologyKey,
    parkingArea: parking.area,
    roofSurface: totalCoveredArea, // alias pour compatibilité PDF
    floorArea: totalCoveredArea,
    coveredArea: totalCoveredArea,
    coverageRatio,
    spotsCount: totalShelteredSpots,
    panelCount,
    installedKwc,
    kwc: installedKwc,
    placedOmbrieres,

    // Production & Recettes
    annualProduction: annualProductionKwh,
    annualProductionKwh,
    annualRevenueReventeTotale,
    annualBenefitYear1: annualRevenueReventeTotale,
    totalInvestmentHT: capexHT,
    capexHT,
    tarifEdfOaKwh,

    // Cumuls financiers
    cumul10,
    cumul20,
    cumul30,
    totalGains30Years: cumul30,
    financialProjection30Years,

    // Solutions de Financement
    financing: {
      bankLoan,
      selectedLeasing,
      leasing,
      thirdParty: null // EXCLU CONFORMÉMENT AU CAHIER DES CHARGES
    },

    mapCenter: parking.center,
    polygonPoints: parking.polygon,
    mapScreenshotDataUrl: mapScreenshotDataUrl || singleMapScreenshot,
    beforeAfterSnapshot: mapScreenshotDataUrl,
    singleMapScreenshot: singleMapScreenshot || mapScreenshotDataUrl,
    building3dScreenshot: '/ombriere_vl_double.jpg'
  };

  return simulationData;
}

/**
 * Génère le PDF de l'offre commerciale d'ombrière et retourne le Blob
 */
export async function generateParkingProspectingPdfBlob(simulationData) {
  return await generateCommercialOfferPDF({
    simulation: simulationData,
    customClientName: simulationData.clientName,
    returnBlob: true
  });
}
