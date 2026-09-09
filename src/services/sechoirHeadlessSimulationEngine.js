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

    // CRITÈRE STRICT : ROI < targetRoi (ex: strictement < 15.0 ans)
    if (sim.roi < targetRoi) {
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
      candidateResults.push(cand);
      candidateMap[modelId] = cand;
    }
  }

  // Si aucun modèle n'atteint un ROI < 15 ans, l'exploitation est rejetée
  if (candidateResults.length === 0) {
    return null;
  }

  // SÉLECTION DU MODÈLE :
  // Si un modèle spécifique est forcé par l'utilisateur (ex: BT-6.2.15) et qu'il est éligible, on le sélectionne
  let best = null;
  if (forcedModelId && forcedModelId !== 'auto' && candidateMap[forcedModelId]) {
    best = candidateMap[forcedModelId];
  } else {
    // Sinon sélection optimale : modèle maximisant la Valeur Actuelle Nette (VAN)
    candidateResults.sort((a, b) => {
      if (Math.abs(b.van - a.van) < 5000) {
        return b.gainNetAnnuel - a.gainNetAnnuel;
      }
      return b.van - a.van;
    });
    best = candidateResults[0];
  }

  const addressLabel = farm.addressLabel || `Exploitation Agricole PACAGE ${farm.pacage}`;
  const communeName = farm.city || farm.commune || '';
  const postalCode = farm.postalCode || '';

  return {
    id: `sechoir_prospect_${farm.pacage}_${Math.random().toString(36).substring(2, 7)}`,
    pacage: farm.pacage,
    clientName: `Exploitation Agricole (PACAGE ${farm.pacage})`,
    address: addressLabel,
    addressLabel,
    commune: communeName,
    codePostal: postalCode,
    departement: departement || '33',
    coords: farm.centroid || [44.8412, -0.5805],
    latitude: farm.centroid?.[0] || 44.8412,
    longitude: farm.centroid?.[1] || -0.5805,
    totalAreaHa: farm.totalAreaHa || 0,
    cropsSummary: farm.cropsSummary || {},
    streamsAreaHa: farm.streamsAreaHa || {},
    streamTonnages: farm.streamTonnages || {},
    totalDryTonnage: farm.totalDryTonnage || 0,
    totalDryingVolumeUsed: best.totalDryingVolume,
    bestModelId: best.modelId,
    model: best.model,
    materials: best.materials,
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
    filename: `Offre_Etude_Sechoir_BatiTech_${best.modelId}_PACAGE_${farm.pacage}.pdf`
  };
}

/**
 * Génère le Blob PDF pour un prospect qualifié
 *
 * @param {object} prospect - Prospect retourné par simulateFarmHeadless
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateSechoirProspectingPdfBlob(prospect) {
  if (!prospect) throw new Error('Prospect manquant pour la génération PDF');

  const { simulation, model, materials, departement, commune, addressLabel, clientName, coords } = prospect;

  return await generateSechoirPDF({
    results: simulation,
    address: addressLabel,
    commune: commune || 'Commune',
    departement: departement || '33',
    orientation: 'sud',
    materials: materials || [],
    financialParams: simulation?.financing || {},
    projectName: `Séchoir BatiTech® ${model?.name || ''}`,
    customClientName: clientName || `Exploitation PACAGE ${prospect.pacage}`,
    returnBlobOnly: true,
  });
}
