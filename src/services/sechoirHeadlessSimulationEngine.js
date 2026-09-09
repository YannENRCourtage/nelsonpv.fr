/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECHOIR HEADLESS SIMULATION ENGINE
 * Moteur financier & dimensionnement automatisé de séchoirs BatiTech®
 * 1. Évaluation multi-modèles (BT-3.1.15, BT-6.2.15, BT-8.3.15)
 * 2. Écrêtage des capacités de séchage par filière (Fourrage, Bottes, Céréales, Maïs, Bois)
 * 3. Calcul financier complet via sechoirCalculations (CEE, Produits, Charges, EBE, ROI, VAN, TRI)
 * 4. Filtrage éliminatoire strict : ROI STRICTEMENT < 15.0 ans
 * 5. Sélection du modèle optimal valorisant au mieux l'exploitation
 * 6. Génération de l'Offre Commerciale PDF BatiTech® (Blob ou téléchargement direct)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  BATITECH_MODELS,
  DRYING_MATERIALS,
  DEFAULT_FINANCIAL_PARAMS
} from '@/data/sechoirBatitechModels.js';

import {
  calculateFullSimulation
} from '@/components/simulator/sechoir/sechoirCalculations.js';

import {
  generateCommercialOfferPDF
} from '@/components/simulator/CommercialOfferPDF.jsx';

import {
  generateSechoirPDF
} from '@/components/simulator/sechoir/SechoirPDFGenerator.jsx';

import {
  RPG_BATITECH_CROP_MAPPING
} from '@/services/sechoirProspectingGisService.js';

// Modèles BatiTech standards à évaluer pour chaque exploitation
const CANDIDATE_MODEL_IDS = ['BT-3.1.15', 'BT-6.2.15', 'BT-8.3.15'];

/**
 * Simule une exploitation agricole sur l'ensemble des modèles BatiTech®
 * et sélectionne le dimensionnement optimal respectant strictly ROI < 15 ans.
 *
 * @param {object} params
 * @param {object} params.farm - Objet exploitation avec pacage, surfaces, streamTonnages
 * @param {string} params.departement - Code département (ex: '33', '40', '32')
 * @param {number} [params.targetRoi=15.0] - Seuil maximal de ROI (strictement < targetRoi)
 * @param {Array<string>} [params.priorityStreams] - Filtre optionnel de filières prioritaires
 * @param {object} [params.customFinancialParams] - Paramètres financiers personnalisés
 * @returns {object|null} - Prospect qualifié complet ou null si rejeté (ROI >= 15 ans)
 */
export function simulateFarmHeadless({
  farm,
  departement = '33',
  targetRoi = 15.0,
  priorityStreams = null,
  customFinancialParams = {},
  forcedModelId = 'auto'
}) {
  if (!farm || !farm.streamTonnages) return null;

  const finParams = {
    ...DEFAULT_FINANCIAL_PARAMS,
    tauxEmprunt: 0.034,
    dureeEmprunt: 20,
    dureeSimulation: 25,
    inflationProduits: 0.02,
    tauxActualisation: 0.034,
    apportsEnPropre: 0,
    ...customFinancialParams,
  };

  const candidateResults = [];
  const candidateMap = {};

  for (const modelId of CANDIDATE_MODEL_IDS) {
    const model = BATITECH_MODELS[modelId];
    if (!model) continue;

    // Préparer la liste des matières avec volumes écrêtés aux capacités réelles du modèle
    const materials = DRYING_MATERIALS.map(dm => {
      const isPriority = !priorityStreams || priorityStreams.length === 0 || priorityStreams.includes(dm.id);
      const farmTonnage = farm.streamTonnages[dm.id] || 0;
      const modelCap = model.capacitesMax?.[dm.id] || dm.defaultVolume || 100;
      const effectiveVolume = isPriority ? Math.min(farmTonnage, modelCap) : 0;
      const mapping = RPG_BATITECH_CROP_MAPPING[dm.id];

      return {
        id: dm.id,
        label: dm.label,
        shortLabel: dm.shortLabel,
        icon: dm.icon,
        unit: dm.unit,
        enabled: effectiveVolume > 0,
        volume: Math.round(effectiveVolume),
        plusValueQualite: mapping?.plusValueQualite || dm.defaultPlusValueQualite || 40,
        economieEnergie: mapping?.economieEnergie || dm.defaultEconomieEnergie || 10,
      };
    });

    // Volume total séché pour ce modèle
    const totalDryingVolume = materials
      .filter(m => m.enabled)
      .reduce((sum, m) => sum + m.volume, 0);

    // Si aucune matière ne peut être séchée, ce modèle n'est pas pertinent
    if (totalDryingVolume <= 0) continue;

    // Calcul complet du Business Plan BatiTech
    const sim = calculateFullSimulation({
      model: modelId,
      departement: departement || '33',
      orientation: 'sud',
      materials,
      financialParams: finParams
    });

    if (!sim || sim.roi === null || isNaN(sim.roi) || !isFinite(sim.roi)) continue;

    const cand = {
      modelId,
      model,
      sim,
      materials,
      totalDryingVolume,
      roi: sim.roi,
      van: sim.van || 0,
      gainNetAnnuel: sim.gainNetAnnuel || 0
    };
    // On conserve systématiquement chaque modèle évalué dans candidateMap pour réactivité instantanée à la volée
    candidateMap[modelId] = cand;

    // CRITÈRE STRICT ET ÉLIMINATOIRE :
    // 1. ROI réel recalculé strictement positif et < targetRoi (ex: strictement < 15.0 ans)
    // 2. Gain net annuel d'exploitation strictement supérieur à 0 €/an
    if (sim.roi > 0 && sim.roi < targetRoi && (sim.gainNetAnnuel || 0) > 0) {
      candidateResults.push(cand);
    }
  }

  // Si aucun modèle n'atteint un ROI < 15 ans ET un Gain Net Annuel > 0, l'exploitation est rejetée
  // (sauf en cas de recalcul forcé unitaire avec targetRoi >= 900)
  if (candidateResults.length === 0 && !(forcedModelId && forcedModelId !== 'auto' && targetRoi >= 900 && candidateMap[forcedModelId])) {
    return null;
  }

  // SÉLECTION DU MODÈLE :
  let best = null;
  if (forcedModelId && forcedModelId !== 'auto' && candidateMap[forcedModelId]) {
    best = candidateMap[forcedModelId];
  } else if (candidateResults.length > 0) {
    // Sélection optimale parmi les modèles éligibles : maximisant la Valeur Actuelle Nette (VAN)
    candidateResults.sort((a, b) => {
      if (Math.abs(b.van - a.van) < 5000) {
        return b.gainNetAnnuel - a.gainNetAnnuel;
      }
      return b.van - a.van;
    });
    best = candidateResults[0];
  }

  if (!best) {
    return null;
  }

  const addressLabel = farm.addressLabel || `Exploitation Agricole PACAGE ${farm.pacage}`;
  const communeName = farm.city || farm.commune || '';
  const postalCode = farm.postalCode || '';

  // Coordonnées exactes issues de l'adresse BAN ou du barycentre de l'exploitation
  const exactCoords = farm.addressCoords || (farm.latitude && farm.longitude ? [farm.latitude, farm.longitude] : farm.centroid) || [44.8412, -0.5805];
  const exactLat = exactCoords[0];
  const exactLng = exactCoords[1];

  const activeMats = (best.materials || []).filter(m => m.enabled && m.volume > 0);
  const activeMaterialsText = activeMats.length > 0
    ? activeMats.map(m => `${m.shortLabel || m.label} (${m.volume} t)`).join(', ')
    : 'Fourrage vrac, Bottes, Céréales';

  return {
    id: `sechoir_prospect_${farm.pacage}_${Math.random().toString(36).substring(2, 7)}`,
    pacage: farm.pacage,
    clientName: `Exploitation Agricole (PACAGE ${farm.pacage})`,
    address: addressLabel,
    addressLabel,
    commune: communeName,
    codePostal: postalCode,
    departement: departement || '33',
    coords: exactCoords,
    mapCenter: exactCoords,
    latitude: exactLat,
    longitude: exactLng,
    totalAreaHa: farm.totalAreaHa || 0,
    cropsSummary: farm.cropsSummary || {},
    streamsAreaHa: farm.streamsAreaHa || {},
    streamTonnages: farm.streamTonnages || {},
    totalDryTonnage: farm.totalDryTonnage || 0,
    totalDryingVolumeUsed: best.totalDryingVolume,
    bestModelId: best.modelId,
    model: best.model,
    materials: best.materials,
    activeMaterialsText,
    simulation: best.sim,
    candidateMap,
    allCandidates: candidateResults.map(c => ({
      modelId: c.modelId,
      name: c.model.name,
      puissanceKwc: c.model.puissanceKwc,
      roi: c.roi,
      van: c.van,
      gainNetAnnuel: c.gainNetAnnuel,
      totalDryingVolume: c.totalDryingVolume
    })),
    filename: `Sechoir_Multi-Matieres_BatiTech_${best.modelId.replace(/[^a-zA-Z0-9]/g, '_')}_PACAGE_${farm.pacage}.pdf`
  };
}

/**
 * Génère le Blob PDF pour un prospect qualifié
 * Produit l'offre commerciale A4 portrait (1 page par défaut, 2 pages si demandée)
 *
 * @param {object} prospect - Prospect retourné par simulateFarmHeadless
 * @param {object} [options={}] - Options d'export PDF
 * @param {boolean} [options.includeBenefitsPage=false] - Inclure la page 2 (Synthèse des bénéfices d'exploitation)
 * @returns {Promise<{ blob: Blob, filename: string, pdf: any }>}
 */
export async function generateSechoirProspectingPdfBlob(prospect, options = {}) {
  if (!prospect) throw new Error('Prospect manquant pour la génération PDF');

  const { simulation, model, materials, departement, commune, addressLabel, clientName, coords, latitude, longitude, activeMaterialsText } = prospect;

  const farmCoords = coords || (latitude && longitude ? [latitude, longitude] : [43.6047, 1.4442]);

  const simPayload = {
    type: 'sechoir_batitech',
    title: `Séchoir Multi-Matières BatiTech® — ${model?.name || 'BatiTech'}`,
    clientName: clientName || `Exploitation Agricole (PACAGE ${prospect.pacage})`,
    pacage: prospect.pacage,
    ownerName: prospect.ownerName || clientName || `Exploitation Agricole (PACAGE ${prospect.pacage})`,
    address: addressLabel || prospect.address || 'Adresse du site',
    cityName: commune || '',
    departmentCode: departement || '33',
    departement: departement || '33',
    modelId: prospect.bestModelId || model?.id || 'BT-3.1.15',
    modelName: model?.name || 'BatiTech 3.1.15',
    dimensions: model?.dimensions || `${model?.length || 18}m × ${model?.width || 20}m`,
    length: model?.length || 18,
    width: model?.width || 20,
    roofSurface: model?.surfaceToiture || 360,
    floorArea: model?.surfaceToiture || 360,
    kwc: model?.puissanceKwc || 30.15,
    installedKwc: model?.puissanceKwc || 30.15,
    nbModules: model?.nbModules || 90,
    annualProductionKwh: simulation?.productionPV || 35000,
    activeMaterialsText: ((materials || []).filter(m => m.enabled && m.volume > 0).map(m => `${m.shortLabel || m.label} (${m.volume} t)`).join(', ')) || activeMaterialsText || 'Fourrage vrac (50 t), Bottes carrées (150 t)',
    deltaProduits: simulation?.produits?.deltaProduits || 0,
    deltaCharges: simulation?.charges?.deltaCharges || 0,
    annualBenefitYear1: simulation?.deltaEBE || 0,
    deltaEBE: simulation?.deltaEBE || 0,
    totalInvestmentHT: model?.investissementBrut || 327053,
    primeCEE: simulation?.cee?.primeTotal || 0,
    subventionsEligibles: simulation?.subventionsEligibles || {},
    subventionRegionaleNom: simulation?.subventionsEligibles?.subventionRegionale?.nom || 'PCAE / PME',
    subventionDescription: simulation?.subventionsEligibles?.description || 'Plan de Modernisation des Exploitations.',
    subventionTauxTexte: simulation?.subventionsEligibles?.tauxTexte || '30% (+10% JA)',
    subventionRegionaleMontant: simulation?.subventionsEligibles?.montantEstime || 0,
    subventionPlafond: simulation?.subventionsEligibles?.subventionRegionale?.montantMax || 100000,
    roiBonifie: simulation?.roiBonifie,
    regionName: simulation?.subventionsEligibles?.region || 'France',
    investissementNet: simulation?.financing?.investissementNet || (model?.investissementBrut - (simulation?.cee?.primeTotal || 0)),
    emprunt: simulation?.financing?.emprunt || (model?.investissementBrut - (simulation?.cee?.primeTotal || 0)),
    annuite: simulation?.annuite || 0,
    gainNetAnnuel: simulation?.gainNetAnnuel || 0,
    paybackYear: simulation?.roi,
    roi: simulation?.roi,
    van: simulation?.van || 0,
    triPercent: simulation?.triPercent || 'N/A',
    mapCenter: farmCoords,
    latitude: farmCoords[0],
    longitude: farmCoords[1],
    rotation: 0,
    orientation: 'sud',
    orientationLabel: 'Sud (0°) • Pente 30°',
    buildings: [{
      name: `Séchoir ${model?.name || 'BatiTech'}`,
      length: model?.length || 18,
      width: model?.width || 20,
      rotation: 0,
      lat: farmCoords[0],
      lng: farmCoords[1],
    }],
    cashFlows: simulation?.treasury?.cashFlows || [],
    includeBenefitsPage: Boolean(options.includeBenefitsPage), // Par défaut false = 1 page !
    includeCoverLetter: options.includeCoverLetter !== undefined ? Boolean(options.includeCoverLetter) : true,
  };

  const result = await generateCommercialOfferPDF({
    simulation: simPayload,
    selectedProject: null,
    customClientName: simPayload.clientName,
    returnBlob: true,
  });

  const pacageCode = prospect.pacage ? String(prospect.pacage).replace(/^PAC_/, '') : 'Agricole';
  const cleanModel = (model?.id || prospect.bestModelId || 'BT-3.1.15').replace(/[^a-zA-Z0-9]/g, '_');
  const customFilename = `Sechoir_Multi-Matieres_BatiTech_${cleanModel}_PACAGE_${pacageCode}.pdf`;

  return {
    blob: result.blob,
    filename: result.filename || customFilename,
    pdf: result.pdf
  };
}
