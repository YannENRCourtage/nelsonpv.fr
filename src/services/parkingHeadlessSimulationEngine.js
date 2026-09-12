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
import { fetchBuildingsForParking, calculatePolygonArea } from '@/services/parkingProspectingGisService';

/**
 * Recherche les parcelles cadastrales et les propriétaires personnes morales
 * via API Apicarto IGN + Koumoul (DGFiP Open Data MAJIC)
 */
export async function fetchCadastralOwnersForParking(parking) {
  try {
    let parcelCodes = [];

    // 1. Essai avec le polygone du parking (coordonnées GeoJSON [lon, lat])
    if (Array.isArray(parking?.polygon) && parking.polygon.length >= 3) {
      const ring = parking.polygon.map(p => [p[1], p[0]]); // [lat, lon] -> [lon, lat]
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

    // 2. Repli sur le point central si le polygone n'a pas retourné de parcelle
    if (parcelCodes.length === 0 && Array.isArray(parking?.center) && parking.center.length >= 2) {
      const [lat, lon] = parking.center;
      const ignUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))}&source_ign=PCI`;
      const res = await fetch(ignUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          parcelCodes = data.features.map(f => f.properties?.idu || f.properties?.id || f.properties?.code_parc).filter(Boolean);
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
    console.warn('Erreur détection propriétaires fonciers:', err);
    return null;
  }
}

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
  const tarifEdfOaDefault = 0.085; // sera recalculé après calepinage si >500 kWc
  const tarifEdfOaOverride = customSettings.tarifEdfOa !== undefined ? Number(customSettings.tarifEdfOa) : null;
  const minKwc = customSettings.minKwc !== undefined ? Number(customSettings.minKwc) : 100;
  const maxKwc = customSettings.maxKwc !== undefined ? Number(customSettings.maxKwc) : 500;
  const economicModel = customSettings.economicModel || 'vente_totale'; // 'vente_totale' | 'autoconsommation' | 'autoconsommation_stockage'
  const includeCoverLetter = customSettings.includeCoverLetter ?? false;

  // 0. Détection / enrichissement des bâtiments existants sur le parking
  let parkingBuildings = parking.buildings;
  if (!parkingBuildings) {
    try {
      parkingBuildings = await fetchBuildingsForParking(parking);
      parking.buildings = parkingBuildings;
    } catch (e) {
      console.warn('Erreur détection bâtiments parking:', e);
      parkingBuildings = [];
    }
  }

  // Déduction de l'emprise des bâtiments de la surface du parking
  const geomArea = calculatePolygonArea(parking.polygon);
  const rawArea = Math.max(geomArea, Number(parking.area || 0), Number(parking.rawArea || 0));
  parking.rawArea = rawArea;

  if (parkingBuildings && parkingBuildings.length > 0 && (!parking.buildingArea || parking.area <= 100)) {
    const internalBldArea = parkingBuildings.reduce((sum, b) => {
      // Les bâtiments adjacents/voisins (qui ne sont pas réellement au milieu du parking) ne sont pas déduits
      if (b.isAdjacent) return sum;
      const bArea = b.area || calculatePolygonArea(b.polygon || b);
      return sum + Math.min(bArea || 0, rawArea * 0.40);
    }, 0);
    parking.buildingArea = Math.round(internalBldArea);
    parking.area = Math.max(Math.round(rawArea * 0.50), Math.round(rawArea - internalBldArea));
  } else if (!parking.area || parking.area <= 100) {
    parking.area = rawArea;
  }

  // 1. Calepinage géométrique des ombrières selon l'orientation naturelle du parking (plafonné à maxKwc)
  const layout = layoutOmbrieresOnParking({
    polygonWgs84: parking.polygon,
    parkingArea: parking.area,
    typologyKey,
    maxKwc,
    buildings: (parking.buildings || []).map(b => b.polygon || b)
  });

  let {
    placedOmbrieres,
    totalCoveredArea,
    totalShelteredSpots,
    coverageRatio,
    panelCount,
    installedKwc,
    principalAngleDeg,
    solarAzimuthDeg,
    orientationLabel,
    typology,
    isCurved,
    curvedDetails
  } = layout;

  // Prise en compte d'éventuelles surcharges manuelles
  if (customSettings.installedKwc && Number(customSettings.installedKwc) > 0) {
    installedKwc = Math.round(Number(customSettings.installedKwc) * 10) / 10;
    panelCount = Math.round((installedKwc * 1000) / 465);
  }
  if (customSettings.customSpots && Number(customSettings.customSpots) > 0) {
    totalShelteredSpots = Math.round(Number(customSettings.customSpots));
  }

  // Cohérence géométrique : l'emprise parking nette ne peut pas être inférieure aux ombrières installées
  if (totalCoveredArea > 0 && parking.area < totalCoveredArea) {
    parking.area = Math.max(parking.area, Math.round(totalCoveredArea / 0.65), rawArea);
  }

  // Filtre d'exclusion rapide avant appels réseaux coûteux (Cadastre, Koumoul, Snapshots satellite)
  // Un tracé courbé n'est disqualifié QUE si sa forme empêche le déploiement d'ombrières linéaires viables
  const isUnusableCurved = isCurved && (!placedOmbrieres || placedOmbrieres.length === 0);
  if (isUnusableCurved || !placedOmbrieres || placedOmbrieres.length === 0 || installedKwc < minKwc || installedKwc > maxKwc) {
    return {
      isCurved,
      curvedDetails,
      placedOmbrieres,
      installedKwc: installedKwc || 0
    };
  }

  // Détection des propriétaires personnes morales pour le champ Client
  let ownerInfo = null;
  try {
    ownerInfo = await fetchCadastralOwnersForParking(parking);
  } catch (err) {
    console.warn(`Recherche propriétaire parking ${parking.id} impossible:`, err);
  }

  const primaryOwnerName = ownerInfo?.primaryOwnerName || null;
  const clientName = primaryOwnerName || parking.name || addressInfo?.label || 'Client Parking';

  // 2. Productible solaire selon le département
  const departmentCode = addressInfo?.departmentCode || (addressInfo?.postcode ? addressInfo.postcode.substring(0, 2) : '33');
  const regionalBaseYield = getProductionForDepartment(departmentCode) || 1100;

  // Tarif EDF OA : 0.078€/kWh pour >500 kWc, 0.085€/kWh pour 100-500 kWc, 0.011€/kWh pour <100 kWc
  const tarifEdfOaKwh = tarifEdfOaOverride !== null
    ? tarifEdfOaOverride
    : (installedKwc > 500 ? 0.078 : (installedKwc >= 100 ? 0.085 : 0.011));

  // Coefficient d'inclinaison (pente ombrière 10° = ~0.95 de captation)
  const tiltCoeff = 0.95;
  const annualProductionKwh = Math.round(installedKwc * regionalBaseYield * tiltCoeff);

  // 3. Calcul des gains selon le modèle économique sélectionné
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
    annualRevenueSurplus = Math.round(surplusKwh * (customSettings.tarifEdfOa || 0.13));     // surplus
    annualBenefitYear1 = annualSavingsAutoconso + annualRevenueSurplus;
  } else if (economicModel === 'autoconsommation_stockage') {
    autoconsoRate = 100;
    autoconsoKwh = annualProductionKwh;
    surplusKwh = 0;
    annualSavingsAutoconso = Math.round(annualProductionKwh * 0.26); // 100% autoconsommé
    annualRevenueSurplus = 0;
    annualBenefitYear1 = annualSavingsAutoconso;
  }

  const annualIncomeForFinancing = economicModel === 'vente_totale' ? annualRevenueReventeTotale : annualBenefitYear1;

  // 4. CAPEX total HT
  const capexHT = Math.round(installedKwc * costPerKwc);

  // 5. Ingénierie financière : 2 Solutions de Financement (Crédit & Abonnement)
  // Solution A : Crédit Bancaire (20 ans, amortissable, 4.48%)
  const bankLoan = calculateBankLoan({
    capexHT,
    durationYears: 20,
    annualRevenue: annualIncomeForFinancing
  });

  // Solution B : Abonnement Solaire (Leasing LOA SunLib, option rachat 1 €)
  const leasing = calculateLeasingSubscription({
    capexHT,
    powerKwc: installedKwc,
    annualRevenue: annualIncomeForFinancing
  });

  const selectedLeasing = leasing.durations.find(d => d.durationYears === 20) || leasing.durations[2];

  // 6. Projection financière des gains cumulés sur 30 ans (pour le graphique PDF)
  let cumul = -capexHT;
  const annualNetYear1To20 = bankLoan.annualNetCashflow; // Gain net après remboursement du crédit
  const annualNetYear21To30 = annualIncomeForFinancing;   // Pleine propriété, 100% des recettes nettes

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
      cumulWithInitialInvestment: cumul + (year <= 20 ? (annualIncomeForFinancing * year) : (annualIncomeForFinancing * year))
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
      buildings: (parking.buildings || []).map(b => b.polygon || b),
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
      buildings: (parking.buildings || []).map(b => b.polygon || b),
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
    clientName: clientName || parking.name || addressInfo?.label || 'Client Parking',
    ownerName: primaryOwnerName,
    ownersList: ownerInfo?.owners || [],
    cadastreParcels: ownerInfo?.parcelCodes || (cadastreInfo?.parcelleRef ? [cadastreInfo.parcelleRef] : []),
    includeCoverLetter,
    address: addressInfo?.label || `${addressInfo?.street || ''} ${addressInfo?.postcode || ''} ${addressInfo?.city || ''}`.trim(),
    cityName: addressInfo?.city || 'Bordeaux',
    departmentCode,
    cadastreRef: (ownerInfo?.parcelCodes && ownerInfo.parcelCodes.length > 0) ? ownerInfo.parcelCodes.join(', ') : (cadastreInfo?.parcelleRef || ''),

    // Données techniques ombrières
    typology,
    typologyKey,
    category: parking.category || 'VL',
    parkingArea: parking.area,
    rawParkingArea: parking.rawArea || parking.area,
    buildingArea: parking.buildingArea || 0,
    buildings: parking.buildings || [],
    roofSurface: totalCoveredArea, // alias pour compatibilité PDF
    floorArea: totalCoveredArea,
    coveredArea: totalCoveredArea,
    coverageRatio,
    spotsCount: totalShelteredSpots,
    panelCount,
    installedKwc,
    kwc: installedKwc,
    placedOmbrieres,
    principalAngleDeg,
    solarAzimuthDeg,
    orientationLabel,
    isCurved,
    curvedDetails,

    // Production & Modèle Économique
    economicModel,
    autoconsoRate,
    autoconsoKwh,
    surplusKwh,
    annualSavingsAutoconso,
    annualRevenueSurplus,
    annualProduction: annualProductionKwh,
    annualProductionKwh,
    annualRevenue: annualIncomeForFinancing,
    annualRevenueReventeTotale,
    annualBenefitYear1,
    totalInvestmentHT: capexHT,
    capexHT,
    tarifEdfOaKwh,
    durationYears: customSettings.durationYears || 25,
    siteConsumptionKwh: customSettings.siteConsumptionKwh || 0,
    excludeThirdParty: Boolean(customSettings.excludeThirdParty),

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
