/**
 * MOTEUR FINANCIER BANCAIRE BESS (NelsonPV)
 * Modélisation financière de référence "Synthèse financière pour le prêteur"
 * Calibré sur les modèles bancaires 12 ans / prêt 10 ans sculpté (0.125 MW, 0.25 MW, 0.5 MW, 1.0 MW).
 */

// Profil dégressif d'amortissement du capital de la dette et de l'installation sur 10 ans (somme = 100.00 %)
export const DEBT_AMORTIZATION_PROFILE = [
  0.208738, // An 1 (20.87 %)
  0.170591, // An 2 (17.06 %)
  0.139554, // An 3 (13.96 %)
  0.114314, // An 4 (11.43 %)
  0.093782, // An 5 (9.38 %)
  0.077100, // An 6 (7.71 %)
  0.063529, // An 7 (6.35 %)
  0.052513, // An 8 (5.25 %)
  0.043571, // An 9 (4.36 %)
  0.036308  // An 10 (3.63 %)
];

// Paliers de référence (puissances 2h de stockage)
export const BESS_PRESETS = {
  '0.125': {
    id: '0.125',
    palierKey: '0.125',
    label: '0,125 MW / 0,25 MWh (125 kW - 1 armoire)',
    powerMw: 0.125,
    capacityMwh: 0.25,
    powerKw: 125,
    energyKwh: 250,
    nbArmoires: 1,
    capexTotal: 86320,
    capex: 86320,
    revenuAn1: 33976,
    rev1: 33976,
    opexAn1: 5050,
    opex1: 5050,
    assuranceAn1: 375,
    ass1: 375,
    loyerAn1: 750,
    loyer1: 750,
    debtSharePct: 70,
    nominalRatePct: 4.1,
    insuranceRatePct: 0.2,
    rateAllIn: 0.043,
    revenueDegradationPct: 10.6,
    aggregatorFeePct: 15.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    loanYears: 10,
    lifeYears: 12
  },
  '0.25': {
    id: '0.25',
    palierKey: '0.25',
    label: '0,25 MW / 0,50 MWh (250 kW - 2 armoires)',
    powerMw: 0.25,
    capacityMwh: 0.50,
    powerKw: 250,
    energyKwh: 500,
    nbArmoires: 2,
    capexTotal: 162000,
    capex: 162000,
    revenuAn1: 70784,
    rev1: 70784,
    opexAn1: 10100,
    opex1: 10100,
    assuranceAn1: 751,
    ass1: 751,
    loyerAn1: 1500,
    loyer1: 1500,
    debtSharePct: 70,
    nominalRatePct: 4.1,
    insuranceRatePct: 0.2,
    rateAllIn: 0.043,
    revenueDegradationPct: 10.6,
    aggregatorFeePct: 15.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    loanYears: 10,
    lifeYears: 12
  },
  '0.50': {
    id: '0.50',
    palierKey: '0.50',
    label: '0,50 MW / 1,00 MWh (500 kW - 4 armoires)',
    powerMw: 0.50,
    capacityMwh: 1.00,
    powerKw: 500,
    energyKwh: 1000,
    nbArmoires: 4,
    capexTotal: 324000,
    capex: 324000,
    revenuAn1: 141568,
    rev1: 141568,
    opexAn1: 20200,
    opex1: 20200,
    assuranceAn1: 1501,
    ass1: 1501,
    loyerAn1: 3000,
    loyer1: 3000,
    debtSharePct: 70,
    nominalRatePct: 4.1,
    insuranceRatePct: 0.2,
    rateAllIn: 0.043,
    revenueDegradationPct: 10.6,
    aggregatorFeePct: 15.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    loanYears: 10,
    lifeYears: 12
  },
  '1.0': {
    id: '1.0',
    palierKey: '1.0',
    label: '1,00 MW / 2,00 MWh (1 000 kW - 8 armoires)',
    powerMw: 1.00,
    capacityMwh: 2.00,
    powerKw: 1000,
    energyKwh: 2000,
    nbArmoires: 8,
    capexTotal: 680000,
    capex: 680000,
    revenuAn1: 315000,
    rev1: 315000,
    opexAn1: 40400,
    opex1: 40400,
    assuranceAn1: 3002,
    ass1: 3002,
    loyerAn1: 6000,
    loyer1: 6000,
    debtSharePct: 70,
    nominalRatePct: 4.1,
    insuranceRatePct: 0.2,
    rateAllIn: 0.043,
    revenueDegradationPct: 10.6,
    aggregatorFeePct: 15.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    loanYears: 10,
    lifeYears: 12
  }
};

/**
 * Calcul de l'Impôt sur les Sociétés (LF 2024)
 * Tranche réduite : 15.0 % jusqu'à 42 500 €
 * Tranche normale : 25.0 % au-delà
 */
export function calculateIS(baseImposable, seuil = 42500, tauxReduit = 0.15, tauxNormal = 0.25) {
  if (!baseImposable || baseImposable <= 0) return 0;
  if (baseImposable <= seuil) {
    return baseImposable * tauxReduit;
  }
  return seuil * tauxReduit + (baseImposable - seuil) * tauxNormal;
}

/**
 * Calcul de la VAN (Valeur Actuelle Nette)
 * @param {number} rate Taux d'actualisation
 * @param {number[]} flows Flux de l'année 1 à N
 * @param {number} startYear Année de départ pour l'exposant (défaut 1)
 */
export function npv(rate, flows, startYear = 1) {
  if (!flows || flows.length === 0) return 0;
  return flows.reduce((sum, val, idx) => {
    const t = idx + startYear;
    return sum + val / Math.pow(1 + rate, t);
  }, 0);
}

/**
 * Calcul du TRI (Taux de Rentabilité Interne)
 * @param {number[]} cashFlows Série complète t0, t1, ..., tN
 */
export function irr(cashFlows, guess = 0.10) {
  if (!cashFlows || cashFlows.length < 2) return 0;
  const hasNegative = cashFlows.some(c => c < 0);
  const hasPositive = cashFlows.some(c => c > 0);
  if (!hasNegative || !hasPositive) return 0;

  let lo = -0.99;
  let hi = 5.0;
  const npvFunc = (r) => cashFlows.reduce((sum, c, t) => sum + c / Math.pow(1 + r, t), 0);

  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const val = npvFunc(mid);
    if (Math.abs(val) < 1e-5) return mid;
    if (val > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Calcul du délai de récupération actualisé (Payback actualisé)
 */
export function calculateDiscountedPayback(initialInvestment, cashFlows, discountRate = 0.07) {
  if (!initialInvestment || initialInvestment <= 0) return 0;
  let cumulative = -initialInvestment;
  for (let t = 0; t < cashFlows.length; t++) {
    const discounted = cashFlows[t] / Math.pow(1 + discountRate, t + 1);
    if (cumulative + discounted >= 0 && discounted > 0) {
      const fraction = (-cumulative) / discounted;
      return t + fraction;
    }
    cumulative += discounted;
  }
  return null; // non récupéré
}

/**
 * Exécute la simulation financière complète BESS sur 12 ans (prêt 10 ans sculpté)
 */
export function computeBessLenderModel(rawParams = {}) {
  // Sélection ou fallback sur preset
  const selectedPalier = rawParams.palierKey || rawParams.id || '0.25';
  const defaultPreset = BESS_PRESETS[selectedPalier] || BESS_PRESETS['0.25'];

  const capexTotal = Number(rawParams.capexTotal ?? rawParams.capex ?? defaultPreset.capexTotal);
  const revenuAn1 = Number(rawParams.revenuAn1 ?? rawParams.rev1 ?? defaultPreset.revenuAn1);
  const opexAn1 = Number(rawParams.opexAn1 ?? rawParams.opex1 ?? defaultPreset.opexAn1);
  const assuranceAn1 = Number(rawParams.assuranceAn1 ?? rawParams.ass1 ?? defaultPreset.assuranceAn1);
  const loyerAn1 = Number(rawParams.loyerAn1 ?? rawParams.loyer1 ?? defaultPreset.loyerAn1);

  // Hypothèses financières
  const horizonYears = Number(rawParams.horizonYears ?? rawParams.lifeYears ?? 12);
  const loanDurationYears = Number(rawParams.loanDurationYears ?? rawParams.loanYears ?? 10);
  const debtShare = Number(
    rawParams.debtShare ?? (rawParams.debtSharePct !== undefined ? Number(rawParams.debtSharePct) / 100 : 0.70)
  ); // 70 %
  const equityShare = 1 - debtShare; // 30 %
  const nominalRate = Number(
    rawParams.nominalRate ?? (rawParams.nominalRatePct !== undefined ? Number(rawParams.nominalRatePct) / 100 : 0.041)
  ); // 4.1 %
  const insuranceRate = Number(
    rawParams.insuranceRate ?? (rawParams.insuranceRatePct !== undefined ? Number(rawParams.insuranceRatePct) / 100 : 0.002)
  ); // 0.2 %
  const allInDebtRate = nominalRate + insuranceRate; // 4.3 %
  const discountRate = Number(
    rawParams.discountRate ?? (rawParams.discountRatePct !== undefined ? Number(rawParams.discountRatePct) / 100 : 0.07)
  ); // 7.0 %

  // Dynamique d'exploitation
  const decoteAnnuelleRevenus = Number(
    rawParams.decoteAnnuelleRevenus ??
      (rawParams.revenueDegradationPct !== undefined ? Number(rawParams.revenueDegradationPct) / 100 : 0.106)
  ); // 10.6 %/an
  const fraisAgregateurRate = Number(
    rawParams.fraisAgregateurRate ??
      (rawParams.aggregatorFeePct !== undefined ? Number(rawParams.aggregatorFeePct) / 100 : 0.15)
  ); // 15.0 % des revenus
  const sharedInflationRate =
    rawParams.opexInflationPct !== undefined ? Number(rawParams.opexInflationPct) / 100 : 0.015;
  const opexGrowthRate = Number(rawParams.opexGrowthRate ?? sharedInflationRate); // 1.5 %/an
  const assuranceGrowthRate = Number(rawParams.assuranceGrowthRate ?? sharedInflationRate); // 1.5 %/an
  const loyerGrowthRate = Number(rawParams.loyerGrowthRate ?? sharedInflationRate); // 1.5 %/an

  // Fiscalité
  const isSeuilReduit = Number(rawParams.isSeuilReduit ?? rawParams.taxReducedThreshold ?? 42500);
  const isTauxReduit = Number(
    rawParams.isTauxReduit ?? (rawParams.taxReducedRatePct !== undefined ? Number(rawParams.taxReducedRatePct) / 100 : 0.15)
  );
  const isTauxNormal = Number(
    rawParams.isTauxNormal ?? (rawParams.taxNormalRatePct !== undefined ? Number(rawParams.taxNormalRatePct) / 100 : 0.25)
  );

  const detteInitiale = capexTotal * debtShare;
  const fondsPropresInitiaux = capexTotal * equityShare;

  let capitalRestantDu = detteInitiale;
  const rows = [];

  for (let t = 1; t <= horizonYears; t++) {
    // 1. Exploitation
    const revenuNet = revenuAn1 * Math.pow(1 - decoteAnnuelleRevenus, t - 1);
    const opexMaintenance = opexAn1 * Math.pow(1 + opexGrowthRate, t - 1);
    const fraisAgregateur = revenuNet * fraisAgregateurRate;
    const assuranceExploitation = assuranceAn1 * Math.pow(1 + assuranceGrowthRate, t - 1);
    const loyerFoncier = loyerAn1 * Math.pow(1 + loyerGrowthRate, t - 1);

    const ebitda = revenuNet - opexMaintenance - fraisAgregateur - assuranceExploitation - loyerFoncier;
    const margeEbitda = revenuNet > 0 ? (ebitda / revenuNet) * 100 : 0;

    // 2. Dette & Amortissements
    const profilPourcent = t <= loanDurationYears ? (DEBT_AMORTIZATION_PROFILE[t - 1] || 0) : 0;
    const capitalDebut = capitalRestantDu;
    const interetsAssurance = t <= loanDurationYears ? capitalDebut * allInDebtRate : 0;
    const amortissementCapital = t <= loanDurationYears ? detteInitiale * profilPourcent : 0;
    const serviceDette = interetsAssurance + amortissementCapital;

    const amortissementInstallation = t <= loanDurationYears ? capexTotal * profilPourcent : 0;
    const ebit = ebitda - amortissementInstallation;
    const ebt = ebit - interetsAssurance;

    // 3. Fiscalité & Résultat net
    const is = calculateIS(ebt, isSeuilReduit, isTauxReduit, isTauxNormal);
    const resultatNet = ebt - is;

    // 4. Ratios bancaires
    const cfads = ebitda - is;
    const dscr = (t <= loanDurationYears && serviceDette > 0) ? cfads / serviceDette : null;
    const icr = (t <= loanDurationYears && interetsAssurance > 0) ? ebit / interetsAssurance : null;

    // 5. Flux de trésorerie non-levier (Projet)
    const isNonLevier = calculateIS(ebit, isSeuilReduit, isTauxReduit, isTauxNormal);
    const fcff = ebitda - isNonLevier;
    const fcffActualise = fcff / Math.pow(1 + discountRate, t);

    // 6. Flux vers les fonds propres (Levier)
    const fcfe = cfads - serviceDette;
    const fcfeActualise = fcfe / Math.pow(1 + discountRate, t);

    rows.push({
      year: t,
      yearLabel: `An ${t}`,
      calendarYear: 2026 + t - 1,
      revenuNet,
      revenue: revenuNet,
      opexMaintenance,
      opex: opexMaintenance,
      fraisAgregateur,
      aggregatorFee: fraisAgregateur,
      assuranceExploitation,
      insurance: assuranceExploitation,
      loyerFoncier,
      landRent: loyerFoncier,
      ebitda,
      margeEbitda,
      ebitdaMargin: margeEbitda,
      profilPourcent: profilPourcent * 100,
      amortProfilePct: profilPourcent * 100,
      capitalDebut,
      beginningDebt: capitalDebut,
      interetsAssurance,
      interest: interetsAssurance,
      amortissementCapital,
      principal: amortissementCapital,
      serviceDette,
      debtService: serviceDette,
      amortissementInstallation,
      capexDepreciation: amortissementInstallation,
      ebit,
      ebt,
      is,
      taxIS: is,
      resultatNet,
      netIncome: resultatNet,
      cfads,
      dscr,
      icr,
      isNonLevier,
      unleveredTax: isNonLevier,
      fcff,
      fcffActualise,
      discountedFcff: fcffActualise,
      fcfe,
      fcfeActualise
    });

    capitalRestantDu = Math.max(0, capitalRestantDu - amortissementCapital);
  }

  // Calcul du cumul
  const loanRows = rows.filter(r => r.year <= loanDurationYears);
  const dscrs = loanRows.map(r => r.dscr).filter(d => d !== null && !isNaN(d));
  const icrs = loanRows.map(r => r.icr).filter(i => i !== null && !isNaN(i));

  const sumKey = (k) => rows.reduce((acc, r) => acc + (r[k] || 0), 0);
  const loanSumKey = (k) => loanRows.reduce((acc, r) => acc + (r[k] || 0), 0);

  const dscrMin = dscrs.length > 0 ? Math.min(...dscrs) : 0;
  const dscrMoyen = dscrs.length > 0 ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : 0;
  const icrMin = icrs.length > 0 ? Math.min(...icrs) : 0;

  // LLCR & PLCR
  const vanCfadsLoan = npv(allInDebtRate, loanRows.map(r => r.cfads));
  const vanCfadsLife = npv(allInDebtRate, rows.map(r => r.cfads));
  const llcr = detteInitiale > 0 ? vanCfadsLoan / detteInitiale : 0;
  const plcr = detteInitiale > 0 ? vanCfadsLife / detteInitiale : 0;

  // Séries pour TRI et Payback
  const projectCashFlows = [-capexTotal, ...rows.map(r => r.fcff)];
  const equityCashFlows = [-fondsPropresInitiaux, ...rows.map(r => r.fcfe)];

  const triProjet = irr(projectCashFlows) * 100;
  const vanProjet = npv(discountRate, rows.map(r => r.fcff)) - capexTotal;
  const paybackActualise = calculateDiscountedPayback(capexTotal, rows.map(r => r.fcff), discountRate);

  const triFondsPropres = irr(equityCashFlows) * 100;
  const vanFondsPropres = npv(discountRate, rows.map(r => r.fcfe)) - fondsPropresInitiaux;

  // Trésorerie après le prêt (années 11 et 12)
  const postLoanRows = rows.filter(r => r.year > loanDurationYears);
  const tresoreriePostPret = postLoanRows.reduce((acc, r) => acc + r.fcfe, 0);

  // Totaux consolidés
  const totals = {
    revenuNet: sumKey('revenuNet'),
    revenue: sumKey('revenuNet'),
    opexMaintenance: sumKey('opexMaintenance'),
    opex: sumKey('opexMaintenance'),
    fraisAgregateur: sumKey('fraisAgregateur'),
    aggregatorFee: sumKey('fraisAgregateur'),
    assuranceExploitation: sumKey('assuranceExploitation'),
    insurance: sumKey('assuranceExploitation'),
    loyerFoncier: sumKey('loyerFoncier'),
    landRent: sumKey('loyerFoncier'),
    ebitda: sumKey('ebitda'),
    interetsAssurance: sumKey('interetsAssurance'),
    interest: sumKey('interetsAssurance'),
    amortissementCapital: sumKey('amortissementCapital'),
    principal: sumKey('amortissementCapital'),
    serviceDette: sumKey('serviceDette'),
    debtService: sumKey('serviceDette'),
    amortissementInstallation: sumKey('amortissementInstallation'),
    capexDepreciation: sumKey('amortissementInstallation'),
    ebit: sumKey('ebit'),
    ebt: sumKey('ebt'),
    is: sumKey('is'),
    taxIS: sumKey('is'),
    resultatNet: sumKey('resultatNet'),
    netIncome: sumKey('resultatNet'),
    cfads: sumKey('cfads'),
    fcff: sumKey('fcff'),
    fcffActualise: sumKey('fcffActualise'),
    discountedFcff: sumKey('fcffActualise'),
    fcfe: sumKey('fcfe'),
    fcfeActualise: sumKey('fcfeActualise')
  };

  return {
    params: {
      capexTotal,
      revenuAn1,
      opexAn1,
      assuranceAn1,
      loyerAn1,
      horizonYears,
      loanDurationYears,
      debtShare,
      equityShare,
      detteInitiale,
      fondsPropresInitiaux,
      nominalRate,
      insuranceRate,
      allInDebtRate,
      discountRate,
      decoteAnnuelleRevenus,
      fraisAgregateurRate,
      opexGrowthRate,
      assuranceGrowthRate,
      loyerGrowthRate,
      isSeuilReduit,
      isTauxReduit,
      isTauxNormal
    },
    rows,
    years: rows,
    totals,
    cumul: totals,
    capex: capexTotal,
    debt: detteInitiale,
    equity: fondsPropresInitiaux,
    rateAllIn: allInDebtRate,
    kpis: {
      // 20 Indicateurs clés prêteur
      capexTotal,
      detteInitiale,
      fondsPropresInitiaux,
      allInDebtRate: allInDebtRate * 100,
      nominalRate: nominalRate * 100,
      insuranceRate: insuranceRate * 100,
      horizonYears,
      loanDurationYears,
      margeApresPretYears: horizonYears - loanDurationYears,
      revenusCumules: totals.revenuNet,
      ebitdaCumule: totals.ebitda,
      resultatNetCumule: totals.resultatNet,
      dscrMin,
      dscrMoyen,
      dscrAvg: dscrMoyen,
      icrMin,
      llcr,
      plcr,
      triProjet,
      projectIrr: triProjet,
      vanProjet,
      projectNpv: vanProjet,
      paybackActualise,
      discountedPaybackYears: paybackActualise,
      triFondsPropres,
      equityIrr: triFondsPropres,
      vanFondsPropres,
      equityNpv: vanFondsPropres,
      tresoreriePostPret,
      cashFlowPostLoan: tresoreriePostPret,
      cumulRevenue: totals.revenuNet,
      cumulEbitda: totals.ebitda,
      cumulNetIncome: totals.resultatNet
    }
  };
}

/**
 * Moteur d'analyse de sensibilité & stress-tests bancaires
 * Calcule dynamiquement les 8 scénarios de stress et les marges de rupture
 */
export function computeBessStressTests(arg1 = {}, arg2 = null) {
  // Supporte computeBessStressTests(baseParams) et computeBessStressTests(model, inputs)
  const rawBaseParams = arg2 ? arg2 : (arg1?.params ? arg1.params : arg1);
  const baseSim = arg1?.params && arg1?.rows ? arg1 : computeBessLenderModel(rawBaseParams);
  const normalizedBase = { ...rawBaseParams, ...baseSim.params };

  const scenarioDefs = [
    { id: 'base', name: '1. Cas de base', overrides: {} },
    { id: 'rev_minus_10', name: '2. Revenus -10%', overrides: { revenuAn1: baseSim.params.revenuAn1 * 0.90, rev1: baseSim.params.revenuAn1 * 0.90 } },
    { id: 'rev_minus_20', name: '3. Revenus -20%', overrides: { revenuAn1: baseSim.params.revenuAn1 * 0.80, rev1: baseSim.params.revenuAn1 * 0.80 } },
    { id: 'opex_plus_15', name: '4. OPEX +15%', overrides: { opexAn1: baseSim.params.opexAn1 * 1.15, opex1: baseSim.params.opexAn1 * 1.15 } },
    { id: 'agregateur_20', name: '5. Frais agrégateur 20%', overrides: { fraisAgregateurRate: 0.20, aggregatorFeePct: 20 } },
    { id: 'loyer_plus_50', name: '6. Loyer foncier +50%', overrides: { loyerAn1: baseSim.params.loyerAn1 * 1.50, loyer1: baseSim.params.loyerAn1 * 1.50 } },
    { id: 'decote_13_6', name: '7. Décote accélérée (+3 pts/an)', overrides: { decoteAnnuelleRevenus: baseSim.params.decoteAnnuelleRevenus + 0.03, revenueDegradationPct: (baseSim.params.decoteAnnuelleRevenus + 0.03) * 100 } },
    { id: 'stress_combine', name: '8. Stress combiné (Rev -15%, OPEX +10%)', overrides: { revenuAn1: baseSim.params.revenuAn1 * 0.85, rev1: baseSim.params.revenuAn1 * 0.85, opexAn1: baseSim.params.opexAn1 * 1.10, opex1: baseSim.params.opexAn1 * 1.10 } }
  ];

  const scenarios = scenarioDefs.map(sc => {
    const sim = computeBessLenderModel({ ...normalizedBase, ...sc.overrides });
    return {
      id: sc.id,
      name: sc.name,
      dscrMin: sim.kpis.dscrMin,
      dscrMoyen: sim.kpis.dscrMoyen,
      dscrAvg: sim.kpis.dscrMoyen,
      vanProjet: sim.kpis.vanProjet,
      projectNpv: sim.kpis.vanProjet,
      resultatNetCumule: sim.kpis.resultatNetCumule,
      cumulNetIncome: sim.kpis.resultatNetCumule,
      isAcceptable: sim.kpis.dscrMin >= 1.10
    };
  });

  // Solveur pour le point de rupture (baisse tolérée des revenus avant DSCR min = cible)
  const findRevenueDropForTargetDscr = (targetDscr) => {
    let lo = 0;
    let hi = 0.85; // jusqu'à -85%
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const testRev = baseSim.params.revenuAn1 * (1 - mid);
      const testSim = computeBessLenderModel({ ...normalizedBase, revenuAn1: testRev, rev1: testRev });
      if (testSim.kpis.dscrMin > targetDscr) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return ((lo + hi) / 2) * 100;
  };

  const baisseToleree110 = findRevenueDropForTargetDscr(1.10);
  const baisseToleree100 = findRevenueDropForTargetDscr(1.00);

  // Années de prêt avec DSCR >= 1.20x
  const loanRows = baseSim.rows.filter(r => r.year <= baseSim.params.loanDurationYears);
  const nbAnneesDscr120 = loanRows.filter(r => r.dscr !== null && r.dscr >= 1.20).length;

  return {
    scenarios,
    baisseToleree110,
    baisseToleree100,
    anneesDscrGte120: nbAnneesDscr120,
    rupture: {
      baisseToleree110,
      baisseToleree100,
      dscrMinAn1: baseSim.rows[0]?.dscr || baseSim.kpis.dscrMin,
      anneesDscrSuperieur120: nbAnneesDscr120,
      nbAnneesDscr120,
      totalAnneesPret: baseSim.params.loanDurationYears
    }
  };
}
