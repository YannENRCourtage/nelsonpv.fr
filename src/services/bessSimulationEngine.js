/**
 * SIMULATEUR ÉNERGÉTIQUE ET ÉCONOMIQUE BESS AVANCÉ (NelsonPV)
 * 
 * Modélise de manière couplée les flux physiques (cycles, rendements, dégradation, profils horosaisonniers)
 * et les flux financiers (Revenus Value Stacking, Coûts de recharge, TURPE 7 délibéré, OPEX, Financement, TRI, VAN, DSCR).
 * 
 * Principes clés :
 * - Découplage strict Puissance (kW) et Capacité (kWh).
 * - Absence absolue de double comptage :
 *    * Raccordement physique Enedis = CAPEX.
 *    * Acheminement réseau (TURPE 7) = OPEX annuel.
 *    * Coût d'achat de l'énergie (fournisseur/spot) = OPEX énergie distinct du TURPE.
 * - Intégration directe du barème TURPE 7 CRE (2025-78, 2026-105, 2025-227).
 */

import { calculateTurpe7Details, generateAnnualRechargeProfileMwh } from './turpeCalculationService.js';

/**
 * Calcul financier d'annuité constante (PMT)
 */
export function calculatePmt(rate, nper, pv) {
  if (!rate || rate === 0) return -(pv / nper);
  const pvif = Math.pow(1 + rate, nper);
  return -(rate * pv * pvif) / (pvif - 1);
}

/**
 * Calcul du Taux de Rentabilité Interne (TRI / IRR)
 */
export function calculateIrr(cashFlows, guess = 0.08) {
  if (!cashFlows || cashFlows.length === 0) return 0;
  
  // Vérification de changement de signe (nécessaire pour calculer un TRI)
  const hasNegative = cashFlows.some(c => c < 0);
  const hasPositive = cashFlows.some(c => c > 0);
  if (!hasNegative || !hasPositive) return 0;

  const maxIter = 100;
  const precision = 1e-6;
  let rate = guess;

  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashFlows[t] / denom;
      if (t > 0) {
        dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < precision) return rate * 100;
    if (dnpv === 0) break;

    const nextRate = rate - npv / dnpv;
    if (Math.abs(nextRate - rate) < precision) return nextRate * 100;
    rate = nextRate;
  }

  return rate * 100;
}

/**
 * Calcul du Temps de Retour Projet (Payback Unlevered)
 * Standard financier infra : Cumul d'EBITDA jusqu'à couverture du CAPEX Total
 */
export function calculateProjectPayback(capexTotal, ebitdaSeries) {
  if (!capexTotal || capexTotal <= 0) return 0;
  if (!ebitdaSeries) return 0;

  if (typeof ebitdaSeries === 'number') {
    return ebitdaSeries > 0 ? capexTotal / ebitdaSeries : 99;
  }

  if (Array.isArray(ebitdaSeries) && ebitdaSeries.length > 0) {
    let remainingCapex = capexTotal;
    for (let i = 0; i < ebitdaSeries.length; i++) {
      const ebitda = ebitdaSeries[i];
      if (ebitda <= 0) continue;
      if (ebitda >= remainingCapex) {
        return i + (remainingCapex / ebitda);
      }
      remainingCapex -= ebitda;
    }
    const ebitdaFirst = ebitdaSeries[0] || 0;
    return ebitdaFirst > 0 ? capexTotal / ebitdaFirst : 99;
  }
  return 0;
}

/**
 * Calcul du Temps de Retour sur Fonds Propres (Equity Payback)
 * Cumul du Cash-Flow Net (après dette & IS) jusqu'à couverture de l'apport en Fonds Propres
 */
export function calculateEquityPayback(equityInvestment, cashFlowNetSeries) {
  if (!equityInvestment || equityInvestment <= 0) {
    // Si 100% financé par dette (apport = 0), valorisation de l'effet de levier optimal
    return cashFlowNetSeries?.[0] > 0 ? 2.2 : 0;
  }
  if (!cashFlowNetSeries || cashFlowNetSeries.length === 0) return 0;

  let remainingEquity = equityInvestment;
  for (let i = 0; i < cashFlowNetSeries.length; i++) {
    const cf = cashFlowNetSeries[i];
    if (cf <= 0) continue;
    if (cf >= remainingEquity) {
      return i + (remainingEquity / cf);
    }
    remainingEquity -= cf;
  }
  const cfFirst = cashFlowNetSeries[0] || 0;
  return cfFirst > 0 ? equityInvestment / cfFirst : 99;
}

/**
 * Calcul de la Valeur Actuelle Nette (VAN / NPV)
 */
export function calculateNpv(rate, cashFlows) {
  if (!cashFlows || cashFlows.length === 0) return 0;
  const r = rate / 100;
  return cashFlows.reduce((acc, val, t) => acc + val / Math.pow(1 + r, t), 0);
}

/**
 * Moteur principal de simulation BESS & Business Plan
 */
export function simulateBessFinancials(config = {}) {
  if (!config || config.enabled === false) return null;

  const {
    // Caractéristiques physiques de la batterie
    puissanceDemandee = 500, // kW
    capaciteStockage = 1044, // kWh
    disponibilite = 98, // %
    rendementRoundTrip = 88, // %
    profondeurDecharge = 90, // DoD %
    degradationAnnuelle = (config.nbCyclesJour === undefined || config.nbCyclesJour >= 2) ? 2.2 : 1.5, // %/an (2.2% si >=2 c/j)
    nbCyclesJour = 2.0, // cycles/jour
    dureeEtude = 12, // ans (10, 12, 15, 20)

    // Paramètres de marché & Value Stacking
    modeFonctionnement = 'VALUE_STACKING', // 'VALUE_STACKING' | 'FCR_ONLY' | 'ARBITRAGE_ONLY' | 'CAPACITE_ONLY'
    prixFCR = 20, // €/MW/h
    facteurDerating = 0.5, // 0.5 pour batterie 2h
    prixCapacite = 35, // €/kW/an
    spreadArbitrage = 0.040, // €/kWh net
    coutRecharge = 0.030, // €/kWh spot/fournisseur (heures creuses)
    commissionAgregateur = 18, // % sur CA marché brut

    // Paramètres Réseau & TURPE 7
    useTurpe7Engine = true, // Bascule vers le moteur TURPE 7 complet
    tensionDomain = 'HTA1', // 'HTA1' | 'HTA2' | 'BT_SUP_36'
    tarifOption = 'CU', // 'CU' | 'MU'
    useStorageOption = true, // Délibération CRE 2025-227
    storageZone = 'ZONE_STANDARD',
    turpeStockageTarif = 18, // Forfait fallback de comparaison (€/kW/an)

    // Charges OPEX BESS
    maintenanceTarif = 8, // €/kW/an
    assuranceTarif = 3.5, // €/kW/an
    loyerDalle = 3000, // €/an (3 000 € pour 4 briques sur 20 ans)
    inflationAnnuelle = 2.0, // %/an

    // Investissement CAPEX BESS
    batterieBms = 140000, // Fourniture armoires BESS + BMS
    genieCivil = 9900, // Dalles béton et VRD
    raccordement = 57650, // Devis raccordement physique Enedis HTA
    developpement = 7500, // Études, démarches administratives, consuel
    fraisCommerciaux = 20000, // Frais de mise en place
    isInvestPropre = false,

    // Financement & Fiscalité
    tauxEmprunt = 4.3, // %
    dureeEmprunt = 12, // ans
    apport = 0, // €
    tauxIS = 25, // %
    tauxActualisation = 6.0 // % pour VAN
  } = config;

  // CAPEX Total
  const effectiveFraisComm = isInvestPropre ? 0 : (fraisCommerciaux || 0);
  const capexTotal = (batterieBms || 0) + (genieCivil || 0) + (raccordement || 0) + (developpement || 0) + effectiveFraisComm;

  // Emprunt et Annuité
  const emprunt = Math.max(0, capexTotal - (apport || 0));
  const annuite = emprunt > 0 ? -calculatePmt(tauxEmprunt / 100, dureeEmprunt, emprunt) : 0;

  // Calcul du temps actif de cyclage et du temps résiduel alloué à la réserve FCR
  const rDecimal = Math.max(0.01, (rendementRoundTrip || 88) / 100);
  const dureeCycle1C = (capaciteStockage / Math.max(1, puissanceDemandee));
  const activeHoursCycleJour = nbCyclesJour * dureeCycle1C * (1 + 1 / rDecimal);
  const heuresFcrJour = Math.max(0, Math.min(24, 24 - activeHoursCycleJour));
  const heuresFcrAn = heuresFcrJour * 365;

  // Durée d'analyse
  const maxYearsLoop = Math.max(20, dureeEtude);
  const rows = [];
  const cashFlowsProjet = [-capexTotal];
  const cashFlowsFP = [-apport];

  let remainingDebt = emprunt;
  let runningCashFlow = -apport;
  let remainingCapex = capexTotal;
  let dynamicPayback = null;

  let totalRevenuesStudy = 0;
  let totalOpexStudy = 0;
  let totalTurpeStudy = 0;
  let totalDebtServiceStudy = 0;
  let totalInterestStudy = 0;
  let totalNetGainStudy = 0;

  let year1TurpeDetails = null;

  for (let y = 1; y <= maxYearsLoop; y++) {
    const infl = Math.pow(1 + inflationAnnuelle / 100, y - 1);
    const capDeg = Math.pow(1 - degradationAnnuelle / 100, y - 1);
    const effCapacity = capaciteStockage * capDeg; // Capacité effective en kWh

    // 1. REVENUS DE MARCHÉ SELON LE MODE CHOISI
    let revFCR = 0;
    let revCapacite = 0;
    let revArbitrage = 0;

    const computeFCR = modeFonctionnement === 'VALUE_STACKING' || modeFonctionnement === 'FCR_ONLY';
    const computeCap = modeFonctionnement === 'VALUE_STACKING' || modeFonctionnement === 'CAPACITE_ONLY';
    const computeArb = modeFonctionnement === 'VALUE_STACKING' || modeFonctionnement === 'ARBITRAGE_ONLY';

    if (computeFCR) {
      // P_kW * Heures_Éligibles_FCR * Dispo * (prixFCR €/MW/h / 1000) * infl
      revFCR = puissanceDemandee * heuresFcrAn * (disponibilite / 100) * (prixFCR / 1000) * infl;
    }

    if (computeCap) {
      // P_kW * FacteurDerating * Prix_Capacité
      revCapacite = puissanceDemandee * facteurDerating * prixCapacite * infl;
    }

    // Énergie annuelle déchargée (kWh)
    const energieDechargeeAn = effCapacity * nbCyclesJour * 365;

    if (computeArb) {
      // Énergie Déchargée (kWh) * Spread Net (€/kWh) * infl
      revArbitrage = energieDechargeeAn * spreadArbitrage * infl;
    }

    const caTotalBrut = revFCR + revCapacite + revArbitrage;

    // 2. OPEX & CHARGES D'EXPLOITATION
    // Commission agrégateur sur flux de marché
    const commAgregateur = caTotalBrut * (commissionAgregateur / 100);

    // Coût d'énergie de recharge : UNIQUEMENT les pertes de cycle (inertes/rendement) non réinjectées
    const energieSoutireeAn = energieDechargeeAn / rDecimal;
    const pertesEnergieAn = energieSoutireeAn * (1 - rDecimal);
    const coutRechargeAn = pertesEnergieAn * coutRecharge * infl;

    // Calcul du TURPE 7 (CRE délibéré ou fallback)
    let turpeAn = 0;
    let turpeDetails = null;

    if (useTurpe7Engine) {
      const annualRechargeProfile = generateAnnualRechargeProfileMwh({
        capaciteEffectiveKwh: effCapacity,
        nbCyclesJour
      });

      turpeDetails = calculateTurpe7Details({
        tensionDomain,
        tarifOption,
        pSouscriteSoutirageKw: puissanceDemandee,
        pSouscriteInjectionKw: puissanceDemandee,
        rechargeProfileMwh: annualRechargeProfile,
        capaciteStockageKwh: effCapacity,
        nbCyclesJour,
        rendementRoundTrip,
        useStorageOption,
        storageZone,
        inflationFactor: infl
      });

      turpeAn = turpeDetails.totalTurpe7;

      if (y === 1) {
        year1TurpeDetails = turpeDetails;
      }
    } else {
      // Ancien forfait indicatif
      turpeAn = puissanceDemandee * turpeStockageTarif * infl;
    }

    // Autres charges BESS
    const maint = puissanceDemandee * maintenanceTarif * infl;
    const assur = puissanceDemandee * assuranceTarif * infl;
    const revBailleur = (loyerDalle || 0) * infl;

    const opex = commAgregateur + coutRechargeAn + turpeAn + maint + assur + revBailleur;
    const ebe = caTotalBrut - opex;

    // 3. SERVICE DE LA DETTE, FISCALITÉ ET FLUX DE TRÉSORERIE
    const interest = (y <= dureeEmprunt && remainingDebt > 0) ? remainingDebt * (tauxEmprunt / 100) : 0;
    const serviceDette = y <= dureeEmprunt ? annuite : 0;
    const principal = y <= dureeEmprunt ? Math.max(0, serviceDette - interest) : 0;

    const amortissement = capexTotal / dureeEtude;
    const ebit = ebe - amortissement;
    const resFiscal = ebit - interest;

    let is = 0;
    if (resFiscal > 0) {
      if (resFiscal < 42500) is = resFiscal * 0.15;
      else is = (42500 * 0.15) + ((resFiscal - 42500) * (tauxIS / 100));
    }

    const cafds = ebe - is;
    const dscr = serviceDette > 1 ? (cafds / serviceDette) : 9.99;
    const cashFlow = ebe - interest - principal - is;

    // Cumuls pour la durée de l'étude
    if (y <= dureeEtude) {
      totalRevenuesStudy += caTotalBrut;
      totalOpexStudy += opex;
      totalTurpeStudy += turpeAn;
      totalDebtServiceStudy += serviceDette;
      totalInterestStudy += interest;
      totalNetGainStudy += cashFlow;

      if (dynamicPayback === null) {
        if (cashFlow >= remainingCapex && cashFlow > 0) {
          dynamicPayback = (y - 1) + (remainingCapex / cashFlow);
        } else if (cashFlow > 0) {
          remainingCapex -= cashFlow;
        }
      }
      runningCashFlow += cashFlow;
    }

    cashFlowsProjet.push(ebe - is); // Free Cash Flow to Firm (FCFF)
    cashFlowsFP.push(cashFlow);     // Free Cash Flow to Equity (FCFE)

    remainingDebt = Math.max(0, remainingDebt - principal);

    rows.push({
      year: y,
      caTotalBrut,
      revFCR,
      revCapacite,
      revArbitrage,
      commAgregateur,
      coutRechargeAn,
      turpeAn,
      maint,
      assur,
      revBailleur,
      opex,
      ebe,
      amortissement,
      ebit,
      interest,
      resFiscal,
      is,
      cafds,
      dscr,
      principal,
      serviceDette,
      remainingDebt,
      cashFlow,
      cumulCashFlow: runningCashFlow,
      effectiveCapacityKwh: Math.round(effCapacity)
    });
  }

  // Calcul du TRI Projet et TRI Fonds Propres
  const triProjet = calculateIrr(cashFlowsProjet.slice(0, dureeEtude + 1));
  const triFP = apport > 0 ? calculateIrr(cashFlowsFP.slice(0, dureeEtude + 1)) : triProjet;
  const van = calculateNpv(tauxActualisation, cashFlowsProjet.slice(0, dureeEtude + 1));

  // Moyenne du DSCR sur la période de remboursement
  const dscrRows = rows.filter(r => r.year <= dureeEmprunt && r.dscr < 9.9);
  const dscrMoyen = dscrRows.length > 0
    ? dscrRows.reduce((sum, r) => sum + r.dscr, 0) / dscrRows.length
    : (rows[0]?.dscr || 9.99);

  // Calcul des temps de retour sur investissement (Standard financier infra)
  const ebitdaList = rows.map(r => r.ebe);
  const cfList = rows.map(r => r.cashFlow);
  const paybackProjet = calculateProjectPayback(capexTotal, ebitdaList);
  const paybackEquity = calculateEquityPayback(apport, cfList);

  return {
    capexTotal,
    emprunt,
    annuite,
    apport,
    dureeEtude,
    dureeEmprunt,

    // Année 1
    revenuAn1: rows[0]?.caTotalBrut || 0,
    opexAn1: rows[0]?.opex || 0,
    turpeAn1: rows[0]?.turpeAn || 0,
    ebeAn1: rows[0]?.ebe || 0,
    cashFlowAn1: rows[0]?.cashFlow || 0,
    dscrAn1: rows[0]?.dscr || 9.99,

    // Totaux sur la durée d'étude
    totalRevenuesStudy,
    totalOpexStudy,
    totalTurpeStudy,
    totalDebtServiceStudy,
    totalInterestStudy,
    gainNetEtude: totalNetGainStudy,
    gainNet20A: rows.slice(0, 20).reduce((sum, r) => sum + r.cashFlow, 0),

    // Métriques de rentabilité financière
    triProjet,
    triFP,
    van,
    payback: paybackProjet,
    paybackEquity,
    dscrMoyen,

    // Métriques physiques et temporelles FCR & Arbitrage
    heuresFcrJour,
    heuresActiveCycleJour: activeHoursCycleJour,
    heuresFcrAn,
    energieDechargeeAn1: rows[0]?.effectiveCapacityKwh * nbCyclesJour * 365,
    coutPertesRechargeAn1: rows[0]?.coutRechargeAn || 0,

    // Détail TURPE 7 pour affichage UI et traçabilité
    turpeDetails: year1TurpeDetails,

    // Chronique annuelle
    rows
  };
}
