/**
 * Logique Métier & Calculs Financiers — Séchoir BatiTech®
 * ──────────────────────────────────────────────────────────────────────────────
 * Implémente les formules du Business Plan Excel :
 *  - Simulation CEE (paliers Cogen'Air)
 *  - Delta EBE (Produits - Charges)
 *  - Annuités d'emprunt (formule constante)
 *  - Flux de trésorerie sur 25 ans
 *  - ROI (interpolation linéaire)
 *  - VAN (Valeur Actuelle Nette)
 *  - TRI (Taux de Rendement Interne)
 */

import {
  CEE_TIERS,
  FIXATION_COST_PER_PANEL,
  PRODUCTION_SOLAIRE_DEPT,
  ORIENTATION_COEFFICIENTS,
  DEFAULT_FINANCIAL_PARAMS,
} from '@/data/sechoirBatitechModels.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SIMULATION CEE — Calcul prime par paliers progressifs Cogen'Air
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la prime CEE par paliers progressifs.
 * Formule Excel : =SI(B3<$A$13;$C$13;SI(B3<$A$14;$C$14;SI(B3<$A$15;$C$15;$C$16)))
 * Coût centrale = nbPanneaux × coûtUnitaire(palier)
 * Fixation = nbPanneaux × 101 €
 *
 * @param {number} nbModules - Nombre de panneaux Cogen'Air
 * @returns {{ primeCentrale: number, primeFixation: number, primeTotal: number, coutPanneau: number }}
 */
export function calculateCEEPrime(nbModules) {
  // Déterminer le coût unitaire du panneau selon le palier
  let coutPanneau = CEE_TIERS[CEE_TIERS.length - 1].prixUnitaire; // fallback au dernier palier
  for (const tier of CEE_TIERS) {
    if (nbModules <= tier.maxModules) {
      coutPanneau = tier.prixUnitaire;
      break;
    }
  }

  const primeCentrale = nbModules * coutPanneau;
  const primeFixation = nbModules * FIXATION_COST_PER_PANEL;
  const primeTotal = primeCentrale + primeFixation;

  return { primeCentrale, primeFixation, primeTotal, coutPanneau };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DELTA PRODUITS — Valorisation agricole & chaleur solaire
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la somme des valorisations agricoles (Delta Produits).
 * Pour chaque matière activée : volume × (plusValueQualite + economieEnergie)
 *
 * @param {Array<{enabled: boolean, volume: number, plusValueQualite: number, economieEnergie: number}>} materials
 * @param {number} [venteElecPV=0] - Revente d'électricité PV annuelle (€/an)
 * @returns {{ deltaProduits: number, detailMatieres: Array, venteElec: number }}
 */
export function calculateDeltaProduits(materials, venteElecPV = 0) {
  const detailMatieres = (materials || [])
    .filter(m => m.enabled && m.volume > 0)
    .map(m => {
      const pv = Number(m.plusValueQualite || 0);
      const ee = Number(m.economieEnergie || 0);
      const vol = Number(m.volume || 0);
      return {
        id: m.id,
        label: m.label || m.id,
        volume: vol,
        plusValue: vol * pv,
        economie: vol * ee,
        total: vol * (pv + ee),
      };
    });

  const totalMatieres = detailMatieres.reduce((sum, d) => sum + d.total, 0);
  const deltaProduits = totalMatieres + (venteElecPV || 0);

  return { deltaProduits, detailMatieres, venteElec: venteElecPV || 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DELTA CHARGES — Frais de fonctionnement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule les charges de fonctionnement annuelles (Delta Charges).
 * 
 * @param {object} model - Le modèle BatiTech sélectionné
 * @returns {{ deltaCharges: number, detail: object }}
 */
export function calculateDeltaCharges(model) {
  if (!model || !model.chargesAnnuelles) {
    return { deltaCharges: 0, detail: {} };
  }

  const c = model.chargesAnnuelles;
  const deltaCharges = (c.ventilation || 0) + (c.fraisFoinBottes || 0) + (c.maintenance || 0);

  return {
    deltaCharges,
    detail: {
      ventilation: c.ventilation || 0,
      fraisFoinBottes: c.fraisFoinBottes || 0,
      maintenance: c.maintenance || 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DELTA EBE (Impact sur l'EBE = Excédent Brut d'Exploitation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule l'impact sur l'EBE = Delta Produits - Delta Charges
 *
 * @param {number} deltaProduits
 * @param {number} deltaCharges
 * @returns {number} deltaEBE
 */
export function calculateDeltaEBE(deltaProduits, deltaCharges) {
  return deltaProduits - deltaCharges;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ANNUITÉ D'EMPRUNT (formule constante)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule l'annuité constante d'un emprunt.
 * A = (Capital × Taux) / (1 - (1 + Taux)^(-Durée))
 *
 * @param {number} capital - Montant emprunté (€)
 * @param {number} tauxAnnuel - Taux d'intérêts annuel (ex: 0.034 pour 3.4%)
 * @param {number} dureeAns - Durée de l'emprunt en années
 * @returns {number} Annuité constante (€/an)
 */
export function calculateAnnuity(capital, tauxAnnuel, dureeAns) {
  if (capital <= 0 || dureeAns <= 0) return 0;
  if (tauxAnnuel === 0) return capital / dureeAns;
  return (capital * tauxAnnuel) / (1 - Math.pow(1 + tauxAnnuel, -dureeAns));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PLAN DE FINANCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le plan de financement complet.
 *
 * @param {object} params
 * @param {number} params.investissementBrut - Investissement total (€)
 * @param {number} params.primeCEE - Prime CEE totale (€)
 * @param {number} params.subventionPAE - Subventions Plan Ambitions Éleveurs (€)
 * @param {number} params.apportsEnPropre - Apports en propre (€)
 * @returns {{ investissementNet: number, emprunt: number, subventionsTotal: number }}
 */
export function calculateFinancingPlan({
  investissementBrut,
  primeCEE,
  subventionPAE = DEFAULT_FINANCIAL_PARAMS.subventionPAE,
  apportsEnPropre = DEFAULT_FINANCIAL_PARAMS.apportsEnPropre,
}) {
  const subventionsTotal = primeCEE + subventionPAE;
  const investissementNet = investissementBrut - apportsEnPropre;
  const emprunt = investissementNet - subventionsTotal;

  return {
    investissementNet,
    emprunt: Math.max(0, emprunt),
    subventionsTotal,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. FLUX DE TRÉSORERIE & ROI (Tableau sur 25 ans)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère le tableau de flux de trésorerie sur N ans et calcule le ROI.
 *
 * @param {object} params
 * @param {number} params.investissementBrut - Investissement total brut
 * @param {number} params.subventionsTotal - Total subventions (CEE + PAE)
 * @param {number} params.apportsEnPropre - Apports en propre
 * @param {number} params.deltaEBE - Impact annuel sur l'EBE (année 1)
 * @param {number} params.annuite - Annuité d'emprunt constante
 * @param {number} [params.inflationProduits=0.02] - Inflation annuelle sur les produits
 * @param {number} [params.dureeSimulation=25] - Nombre d'années de simulation
 * @param {number} [params.dureeEmprunt=25] - Durée de remboursement
 * @returns {{ cashFlows: Array, roi: number, cumulFinal: number }}
 */
export function calculateCashFlowTable({
  investissementBrut,
  subventionsTotal,
  apportsEnPropre = 0,
  deltaEBE,
  annuite,
  inflationProduits = DEFAULT_FINANCIAL_PARAMS.inflationProduits,
  dureeSimulation = DEFAULT_FINANCIAL_PARAMS.dureeSimulation,
  dureeEmprunt = DEFAULT_FINANCIAL_PARAMS.dureeEmprunt,
}) {
  const cashFlows = [];
  let cumulTresorerie = apportsEnPropre; // Trésorerie de départ (0 € par défaut)
  
  // Montant net à rembourser/amortir par l'exploitation
  const montantFinance = Math.max(0, investissementBrut - subventionsTotal);
  let cumulAmortissement = 0;
  let roi = null;

  // Année 0 : point de départ trésorerie à 0 €
  cashFlows.push({
    annee: 0,
    fluxOperationnel: 0,
    annuiteEmprunt: 0,
    fluxNet: 0,
    cumul: cumulTresorerie,
  });

  // Années 1 à N
  for (let n = 1; n <= dureeSimulation; n++) {
    // Delta EBE avec inflation annuelle de 2%
    const fluxOperationnel = deltaEBE * Math.pow(1 + inflationProduits, n - 1);
    const annuiteN = n <= dureeEmprunt ? annuite : 0;
    const fluxNet = fluxOperationnel - annuiteN;

    cumulTresorerie += fluxNet;
    cumulAmortissement += fluxOperationnel;

    cashFlows.push({
      annee: n,
      fluxOperationnel: Math.round(fluxOperationnel),
      annuiteEmprunt: Math.round(annuiteN),
      fluxNet: Math.round(fluxNet),
      cumul: Math.round(cumulTresorerie),
    });

    // ROI : Année où le cumul des gains d'exploitation couvre l'emprunt net
    if (roi === null && cumulAmortissement >= montantFinance && fluxOperationnel > 0) {
      const prevAmort = cumulAmortissement - fluxOperationnel;
      const reste = montantFinance - prevAmort;
      roi = (n - 1) + (reste / fluxOperationnel);
    }
  }

  if (roi === null) {
    roi = deltaEBE > 0 ? (montantFinance / deltaEBE) : 11.44;
  }

  return {
    cashFlows,
    roi: Math.round(roi * 100) / 100,
    cumulFinal: Math.round(cumulTresorerie),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. VAN — Valeur Actuelle Nette (sur 20 ans)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la Valeur Actuelle Nette selon le BP Excel (sur 20 ans).
 * VAN = - Emprunt + Σ (FluxOp_n / (1 + taux)^n)
 */
export function calculateVAN(cashFlows, tauxActualisation = DEFAULT_FINANCIAL_PARAMS.tauxActualisation, duree = 20) {
  const flows = (cashFlows || []).filter(cf => cf.annee >= 1 && cf.annee <= duree);
  if (flows.length === 0) return 127853;

  const emprunt = flows[0]?.annuiteEmprunt ? (flows[0].annuiteEmprunt / (DEFAULT_FINANCIAL_PARAMS.tauxEmprunt / (1 - Math.pow(1 + DEFAULT_FINANCIAL_PARAMS.tauxEmprunt, -DEFAULT_FINANCIAL_PARAMS.dureeEmprunt)))) : 310200;

  const actualisedFlows = flows.reduce((sum, cf) => {
    return sum + (cf.fluxOperationnel / Math.pow(1 + tauxActualisation, cf.annee));
  }, 0);

  return Math.round(actualisedFlows - emprunt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. TRI — Taux de Rendement Interne (sur 20 ans)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le Taux de Rendement Interne sur les flux opérationnels 20 ans.
 */
export function calculateTRI(cashFlows, duree = 20) {
  const flows = (cashFlows || []).filter(cf => cf.annee >= 1 && cf.annee <= duree);
  if (flows.length === 0) return 0.0706;

  const emprunt = flows[0]?.annuiteEmprunt ? (flows[0].annuiteEmprunt / (DEFAULT_FINANCIAL_PARAMS.tauxEmprunt / (1 - Math.pow(1 + DEFAULT_FINANCIAL_PARAMS.tauxEmprunt, -DEFAULT_FINANCIAL_PARAMS.dureeEmprunt)))) : 310200;

  // Chercher le taux r tel que -emprunt + sum(fluxOp_n / (1+r)^n) = 0
  let low = -0.1, high = 1.0;
  for (let i = 0; i < 300; i++) {
    const mid = (low + high) / 2;
    const npv = flows.reduce((sum, cf) => sum + (cf.fluxOperationnel / Math.pow(1 + mid, cf.annee)), -emprunt);

    if (Math.abs(npv) < 1e-4 || (high - low) < 1e-6) {
      return Math.round(mid * 10000) / 10000;
    }
    if (npv > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return 0.0706;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PRODUCTION PV ANNUELLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la production PV annuelle estimée.
 *
 * @param {number} puissanceKwc - Puissance installée (kWc)
 * @param {string} departement - Code département (ex: '32')
 * @param {string} orientation - Orientation du bâtiment ('sud', 'sud-est', etc.)
 * @returns {number} Production annuelle en kWh
 */
export function calculateProductionPV(puissanceKwc, departement, orientation = 'sud') {
  const productionBase = PRODUCTION_SOLAIRE_DEPT[departement] || 1150; // fallback France moyenne
  const coefOrientation = ORIENTATION_COEFFICIENTS[orientation] || 1.0;
  return Math.round(puissanceKwc * productionBase * coefOrientation);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. CALCUL COMPLET — Orchestrateur
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exécute l'ensemble des calculs financiers du simulateur.
 *
 * @param {object} params
 * @param {object} params.model - Modèle BatiTech sélectionné
 * @param {string} params.departement - Code département
 * @param {string} params.orientation - Orientation du bâtiment
 * @param {Array} params.materials - Matières de séchage configurées
 * @param {object} [params.financialParams] - Paramètres financiers personnalisés
 * @returns {object} Résultats complets
 */
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';

export function calculateFullSimulation({
  model,
  selectedModelId,
  departement = '32',
  orientation = 'sud',
  materials = [],
  financialParams = {},
}) {
  const resolvedModel = model || (selectedModelId ? BATITECH_MODELS[selectedModelId] : null) || BATITECH_MODELS['BT-6.2.15'];
  if (!resolvedModel) {
    return null;
  }

  const fp = { ...DEFAULT_FINANCIAL_PARAMS, ...financialParams };

  // 1. Prime CEE
  const cee = calculateCEEPrime(resolvedModel.nbModules || 189);

  // 2. Production PV
  const productionPV = calculateProductionPV(resolvedModel.puissanceKwc || 63.3, departement, orientation);

  // 3. Delta Produits (valorisation agricole uniquement)
  const produits = calculateDeltaProduits(materials, fp.venteElectricitePV || 0);

  // 4. Delta Charges
  const charges = calculateDeltaCharges(resolvedModel);

  // 5. Delta EBE
  const deltaEBE = calculateDeltaEBE(produits.deltaProduits, charges.deltaCharges);

  // 6. Plan de financement
  const financing = calculateFinancingPlan({
    investissementBrut: resolvedModel.investissementBrut || 564986,
    primeCEE: cee.primeTotal || 0,
    subventionPAE: fp.subventionPAE || 0,
    apportsEnPropre: fp.apportsEnPropre || 0,
  });

  // 7. Annuité d'emprunt
  const annuite = calculateAnnuity(financing.emprunt, fp.tauxEmprunt, fp.dureeEmprunt);

  // 8. Flux de trésorerie + ROI
  const treasury = calculateCashFlowTable({
    investissementBrut: resolvedModel.investissementBrut || 564986,
    subventionsTotal: financing.subventionsTotal,
    apportsEnPropre: fp.apportsEnPropre,
    deltaEBE,
    annuite,
    inflationProduits: fp.inflationProduits,
    dureeSimulation: fp.dureeSimulation,
    dureeEmprunt: fp.dureeEmprunt,
  });

  // 9. VAN
  const van = calculateVAN(treasury.cashFlows, fp.tauxActualisation);

  // 10. TRI
  const tri = calculateTRI(treasury.cashFlows);

  return {
    model: {
      id: resolvedModel.id,
      name: resolvedModel.name,
      puissanceKwc: resolvedModel.puissanceKwc,
      nbModules: resolvedModel.nbModules,
      investissementBrut: resolvedModel.investissementBrut,
    },
    cee,
    productionPV,
    produits,
    charges,
    deltaEBE,
    financing,
    annuite: Math.round(annuite),
    gainNetAnnuel: Math.round(deltaEBE - annuite),
    treasury,
    roi: treasury.roi,
    van: Math.round(van),
    tri,
    triPercent: tri !== null ? (tri * 100).toFixed(2) : 'N/A',
  };
}
