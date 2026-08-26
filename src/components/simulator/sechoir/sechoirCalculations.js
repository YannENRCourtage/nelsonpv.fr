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
 * @param {number} [venteElecPV=4000] - Revente d'électricité PV annuelle (€/an)
 * @returns {{ deltaProduits: number, detailMatieres: Array, venteElec: number }}
 */
export function calculateDeltaProduits(materials, venteElecPV = DEFAULT_FINANCIAL_PARAMS.venteElectricitePV) {
  const detailMatieres = materials
    .filter(m => m.enabled && m.volume > 0)
    .map(m => ({
      id: m.id,
      label: m.label || m.id,
      volume: m.volume,
      plusValue: m.volume * m.plusValueQualite,
      economie: m.volume * m.economieEnergie,
      total: m.volume * (m.plusValueQualite + m.economieEnergie),
    }));

  const totalMatieres = detailMatieres.reduce((sum, d) => sum + d.total, 0);
  const deltaProduits = totalMatieres + venteElecPV;

  return { deltaProduits, detailMatieres, venteElec: venteElecPV };
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
  let cumul = 0;
  let roi = null;

  // Année 0 : investissement initial
  const fluxAnnee0 = -(investissementBrut - subventionsTotal - apportsEnPropre);
  cumul = fluxAnnee0;
  cashFlows.push({
    annee: 0,
    fluxOperationnel: 0,
    annuiteEmprunt: 0,
    fluxNet: fluxAnnee0,
    cumul,
  });

  // Années 1 à N
  for (let n = 1; n <= dureeSimulation; n++) {
    // Delta EBE augmenté de l'inflation annuelle
    const fluxOperationnel = deltaEBE * Math.pow(1 + inflationProduits, n - 1);
    const annuiteN = n <= dureeEmprunt ? annuite : 0;
    const fluxNet = fluxOperationnel - annuiteN;

    const prevCumul = cumul;
    cumul += fluxNet;

    cashFlows.push({
      annee: n,
      fluxOperationnel: Math.round(fluxOperationnel),
      annuiteEmprunt: Math.round(annuiteN),
      fluxNet: Math.round(fluxNet),
      cumul: Math.round(cumul),
    });

    // ROI — Interpolation linéaire quand le cumul passe en positif
    if (roi === null && prevCumul < 0 && cumul >= 0) {
      // ROI = N-1 + |Cumul(N-1)| / FluxNet(N)
      roi = (n - 1) + Math.abs(prevCumul) / fluxNet;
    }
  }

  // Si le cumul n'a jamais passé en positif
  if (roi === null) {
    roi = dureeSimulation + 1; // > durée = non rentable sur la période
  }

  return {
    cashFlows,
    roi: Math.round(roi * 100) / 100,
    cumulFinal: Math.round(cumul),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. VAN — Valeur Actuelle Nette
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la Valeur Actuelle Nette en actualisant les flux futurs.
 * VAN = Σ (Flux_n / (1 + taux)^n)
 *
 * @param {Array<{fluxNet: number}>} cashFlows - Tableau des flux nets (année 0 incluse)
 * @param {number} tauxActualisation - Taux d'actualisation annuel
 * @returns {number} VAN
 */
export function calculateVAN(cashFlows, tauxActualisation = DEFAULT_FINANCIAL_PARAMS.tauxActualisation) {
  return cashFlows.reduce((van, cf, index) => {
    return van + cf.fluxNet / Math.pow(1 + tauxActualisation, index);
  }, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. TRI — Taux de Rendement Interne (Newton-Raphson)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le Taux de Rendement Interne par itérations Newton-Raphson.
 * Cherche le taux `r` tel que VAN(r) = 0.
 *
 * @param {Array<{fluxNet: number}>} cashFlows - Tableau des flux nets
 * @param {number} [guess=0.08] - Estimation initiale
 * @param {number} [maxIter=200] - Nombre max d'itérations
 * @param {number} [tolerance=1e-7] - Tolérance de convergence
 * @returns {number|null} TRI (ex: 0.0706 pour 7.06%), ou null si non convergent
 */
export function calculateTRI(cashFlows, guess = 0.08, maxIter = 200, tolerance = 1e-7) {
  let rate = guess;

  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dNpv = 0; // dérivée de la NPV par rapport au taux

    for (let n = 0; n < cashFlows.length; n++) {
      const flux = cashFlows[n].fluxNet;
      const denominator = Math.pow(1 + rate, n);
      npv += flux / denominator;
      if (n > 0) {
        dNpv -= (n * flux) / Math.pow(1 + rate, n + 1);
      }
    }

    if (Math.abs(dNpv) < 1e-12) break; // éviter division par zéro

    const newRate = rate - npv / dNpv;

    if (Math.abs(newRate - rate) < tolerance) {
      return Math.round(newRate * 10000) / 10000; // arrondi à 0.01%
    }

    rate = newRate;
  }

  // Fallback bisection si Newton-Raphson ne converge pas
  return bisectionTRI(cashFlows);
}

/**
 * Méthode de bisection (fallback) pour trouver le TRI.
 */
function bisectionTRI(cashFlows, low = -0.5, high = 2, maxIter = 500, tolerance = 1e-6) {
  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const npv = cashFlows.reduce((sum, cf, n) => sum + cf.fluxNet / Math.pow(1 + mid, n), 0);

    if (Math.abs(npv) < tolerance || (high - low) / 2 < tolerance) {
      return Math.round(mid * 10000) / 10000;
    }

    // Vérifier le signe pour savoir dans quel intervalle chercher
    const npvLow = cashFlows.reduce((sum, cf, n) => sum + cf.fluxNet / Math.pow(1 + low, n), 0);
    if (npvLow * npv < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return null;
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
export function calculateFullSimulation({
  model,
  departement,
  orientation = 'sud',
  materials = [],
  financialParams = {},
}) {
  const fp = { ...DEFAULT_FINANCIAL_PARAMS, ...financialParams };

  // 1. Prime CEE
  const cee = calculateCEEPrime(model.nbModules);

  // 2. Production PV
  const productionPV = calculateProductionPV(model.puissanceKwc, departement, orientation);

  // 3. Delta Produits (valorisation agricole + vente élec)
  const produits = calculateDeltaProduits(materials, fp.venteElectricitePV);

  // 4. Delta Charges
  const charges = calculateDeltaCharges(model);

  // 5. Delta EBE
  const deltaEBE = calculateDeltaEBE(produits.deltaProduits, charges.deltaCharges);

  // 6. Plan de financement
  const financing = calculateFinancingPlan({
    investissementBrut: model.investissementBrut,
    primeCEE: cee.primeTotal,
    subventionPAE: fp.subventionPAE,
    apportsEnPropre: fp.apportsEnPropre,
  });

  // 7. Annuité d'emprunt
  const annuite = calculateAnnuity(financing.emprunt, fp.tauxEmprunt, fp.dureeEmprunt);

  // 8. Flux de trésorerie + ROI
  const treasury = calculateCashFlowTable({
    investissementBrut: model.investissementBrut,
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
      name: model.name,
      puissanceKwc: model.puissanceKwc,
      nbModules: model.nbModules,
      investissementBrut: model.investissementBrut,
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
