/**
 * MOTEUR FINANCIER BANCAIRE & OPÉRATIONNEL BESS UNIFIÉ (NelsonPV)
 *
 * Harmonise intégralement :
 * - La Simulation Unitaire (Projet CRM : 0.125 MW, 0.25 MW, 0.50 MW, 1.0 MW)
 * - Le Portefeuille Multi-Projets (VOLTA, FARADAY, EDISON, TOUS)
 * - La Ventilation CAPEX détaillée (Pour Compte Propre 184 k€ vs Pour Compte Tiers 229 k€ / 500 kW)
 * - Les Courbes de revenus Clean Horizon (Scénario Central 20 ans : 2027-2046) & Modèle ENR Courtage (15 ans)
 * - Le Mode de financement (Avec prêt Dette Senior vs Payé comptant 100% Fonds Propres)
 * - La Fiscalité LF 2024 / 2026 (IS 15% jusqu'à 42 500 € puis 25%, CFE dès An 2, Taxe foncière, Toggle Avec/Avant IS)
 */

// ─── 1. COURBE OFFICIELLE CLEAN HORIZON (2027-2046, BASE 500 kW / 1 044 kWh) ───
// Revenus bruts annuels en € HT avant disponibilité, rendement et vieillissement (confirmée par agrégateur TILT)
export const CLEAN_HORIZON_20Y = [
  { year: 1,  calendarYear: 2027, trading: 10840, afrrCap: 56910, afrrEnergy: 32520, capacityMech: 8130, totalBrut: 108400 },
  { year: 2,  calendarYear: 2028, trading: 31414, afrrCap: 28227, afrrEnergy: 21944, capacityMech: 9471, totalBrut: 91056 },
  { year: 3,  calendarYear: 2029, trading: 38902, afrrCap: 23988, afrrEnergy: 17968, capacityMech: 8984, totalBrut: 89842 },
  { year: 4,  calendarYear: 2030, trading: 35864, afrrCap: 23116, afrrEnergy: 17337, capacityMech: 8669, totalBrut: 84986 },
  { year: 5,  calendarYear: 2031, trading: 41478, afrrCap: 23675, afrrEnergy: 20739, capacityMech: 8806, totalBrut: 94698 },
  { year: 6,  calendarYear: 2032, trading: 39620, afrrCap: 22011, afrrEnergy: 18867, capacityMech: 9344, totalBrut: 89842 },
  { year: 7,  calendarYear: 2033, trading: 40680, afrrCap: 20916, afrrEnergy: 17991, capacityMech: 9041, totalBrut: 88628 },
  { year: 8,  calendarYear: 2034, trading: 40772, afrrCap: 20343, afrrEnergy: 16292, capacityMech: 8793, totalBrut: 86200 },
  { year: 9,  calendarYear: 2035, trading: 39433, afrrCap: 18187, afrrEnergy: 18187, capacityMech: 9179, totalBrut: 84986 },
  { year: 10, calendarYear: 2036, trading: 40878, afrrCap: 17592, afrrEnergy: 18867, capacityMech: 7649, totalBrut: 84986 },
  { year: 11, calendarYear: 2037, trading: 39943, afrrCap: 18017, afrrEnergy: 19292, capacityMech: 7734, totalBrut: 84986 },
  { year: 12, calendarYear: 2038, trading: 40793, afrrCap: 16997, afrrEnergy: 19037, capacityMech: 8159, totalBrut: 84986 },
  { year: 13, calendarYear: 2039, trading: 40672, afrrCap: 16919, afrrEnergy: 16919, capacityMech: 6833, totalBrut: 81343 },
  { year: 14, calendarYear: 2040, trading: 39773, afrrCap: 17125, afrrEnergy: 15073, capacityMech: 6944, totalBrut: 78915 },
  { year: 15, calendarYear: 2041, trading: 39773, afrrCap: 17125, afrrEnergy: 15073, capacityMech: 6944, totalBrut: 78915 },
  { year: 16, calendarYear: 2042, trading: 40483, afrrCap: 16888, afrrEnergy: 14836, capacityMech: 6708, totalBrut: 78915 },
  { year: 17, calendarYear: 2043, trading: 41106, afrrCap: 17709, afrrEnergy: 14183, capacityMech: 7131, totalBrut: 80129 },
  { year: 18, calendarYear: 2044, trading: 41106, afrrCap: 17709, afrrEnergy: 14183, capacityMech: 7131, totalBrut: 80129 },
  { year: 19, calendarYear: 2045, trading: 42352, afrrCap: 18245, afrrEnergy: 14613, capacityMech: 7347, totalBrut: 82557 },
  { year: 20, calendarYear: 2046, trading: 43598, afrrCap: 18782, afrrEnergy: 15042, capacityMech: 7564, totalBrut: 84986 }
];

// ─── 2. GRILLE DE VENTILATION CAPEX DÉTAILLÉE (BASE 500 kW / 1 044 kWh) ─────────
export const BESS_CAPEX_PRESETS = {
  COMPTE_PROPRE: {
    id: 'COMPTE_PROPRE',
    label: 'Pour Compte Propre (184 000 € / 500 kW)',
    shortLabel: 'Compte Propre',
    // A. Origination & Développement (8 500 € — 5%)
    securisationFonciere: 2000,
    urbanismeDp: 500,
    huissier: 500,
    geometre: 1500,
    notaire: 4000,
    // B. Travaux & Matériel (125 500 € — 68%)
    batteries: 108000, // 4 armoires 125 kW à 27 k€
    genieCivil: 4500,  // Dalle béton < 20 m²
    installation: 13000,
    // C. Raccordement Enedis (50 000 € — 27%)
    raccordementEnedis: 50000,
    // Total = 184 000 €
    total500kW: 184000
  },
  COMPTE_TIERS: {
    id: 'COMPTE_TIERS',
    label: 'Pour Compte Tiers (229 000 € / 500 kW)',
    shortLabel: 'Compte Tiers',
    // A. Origination & Développement (17 500 € — 8%)
    securisationFonciere: 10000,
    urbanismeDp: 600,
    huissier: 600,
    geometre: 1800,
    notaire: 4500,
    // B. Travaux & Matériel (161 500 € — 71%)
    batteries: 140000, // 4 armoires 125 kW à 35 k€
    genieCivil: 6500,  // Dalle béton < 20 m²
    installation: 15000,
    // C. Raccordement Enedis (50 000 € — 22%)
    raccordementEnedis: 50000,
    // Total = 229 000 €
    total500kW: 229000
  }
};

/**
 * Calcule les sous-totaux, pourcentages et alertes métier d'une grille CAPEX BESS
 * @param {object} capexBreakdown Postes CAPEX (pour le palier de puissance sélectionné)
 * @param {number} powerMw Puissance unitaire en MW (défaut 0.50 MW)
 * @param {number} nbSites Nombre de sites (1 en unitaire, N en portefeuille)
 * @param {number} [portfolioRaccordementSum] Somme optionnelle des raccordements spécifiques par site
 */
export function computeCapexBreakdownSummary(capexBreakdown = {}, powerMw = 0.50, nbSites = 1, portfolioRaccordementSum = null) {
  const b = {
    securisationFonciere: Number(capexBreakdown.securisationFonciere ?? 2000),
    urbanismeDp: Number(capexBreakdown.urbanismeDp ?? 500),
    huissier: Number(capexBreakdown.huissier ?? 500),
    geometre: Number(capexBreakdown.geometre ?? 1500),
    notaire: Number(capexBreakdown.notaire ?? 4000),
    batteries: Number(capexBreakdown.batteries ?? 108000),
    genieCivil: Number(capexBreakdown.genieCivil ?? 4500),
    installation: Number(capexBreakdown.installation ?? 13000),
    raccordementEnedis: Number(capexBreakdown.raccordementEnedis ?? 50000)
  };

  const subTotalOrigination = b.securisationFonciere + b.urbanismeDp + b.huissier + b.geometre + b.notaire;
  const subTotalTravaux = b.batteries + b.genieCivil + b.installation;
  const subTotalEnedis = b.raccordementEnedis;
  const unitCapexTotal = Math.max(1, subTotalOrigination + subTotalTravaux + subTotalEnedis);

  const pctOrigination = (subTotalOrigination / unitCapexTotal) * 100;
  const pctTravaux = (subTotalTravaux / unitCapexTotal) * 100;
  const pctEnedis = (subTotalEnedis / unitCapexTotal) * 100;

  // Règle métier : Alerte si le raccordement dépasse 50 000 €/MW (ou > 50 000 € sur le projet)
  const effMw = Math.max(0.125, Number(powerMw) || 0.50);
  const raccordementPerMw = subTotalEnedis / effMw;
  const isRaccordementOver50kPerMw = raccordementPerMw > 50000;
  const isRaccordementOver50kProject = subTotalEnedis > 50000;
  const hasRaccordementWarning = isRaccordementOver50kPerMw || isRaccordementOver50kProject;

  const sitesCount = Math.max(1, Number(nbSites) || 1);
  const totalEnedisPortfolio = portfolioRaccordementSum !== null && portfolioRaccordementSum !== undefined
    ? Number(portfolioRaccordementSum)
    : subTotalEnedis * sitesCount;
  const portfolioCapexTotal = (subTotalOrigination + subTotalTravaux) * sitesCount + totalEnedisPortfolio;

  return {
    breakdown: b,
    subTotalOrigination,
    subTotalTravaux,
    subTotalEnedis,
    unitCapexTotal,
    pctOrigination,
    pctTravaux,
    pctEnedis,
    raccordementPerMw,
    isRaccordementOver50kPerMw,
    isRaccordementOver50kProject,
    hasRaccordementWarning,
    sitesCount,
    portfolioCapexTotal
  };
}

/**
 * Génère une grille CAPEX mise à l'échelle selon le mode (COMPTE_PROPRE ou COMPTE_TIERS) et la puissance en MW
 */
export function getScaledCapexPreset(mode = 'COMPTE_PROPRE', powerMw = 0.50) {
  const base = BESS_CAPEX_PRESETS[mode] || BESS_CAPEX_PRESETS.COMPTE_PROPRE;
  const scale = Math.max(0.25, (Number(powerMw) || 0.50) / 0.50);
  return {
    securisationFonciere: Math.round(base.securisationFonciere * scale),
    urbanismeDp: Math.round(base.urbanismeDp * scale),
    huissier: Math.round(base.huissier * scale),
    geometre: Math.round(base.geometre * scale),
    notaire: Math.round(base.notaire * scale),
    batteries: Math.round(base.batteries * scale),
    genieCivil: Math.round(base.genieCivil * scale),
    installation: Math.round(base.installation * scale),
    raccordementEnedis: Math.round(base.raccordementEnedis * scale)
  };
}

// Profil dégressif d'amortissement sur 10 ans (conservé pour compatibilité)
export const DEBT_AMORTIZATION_PROFILE = [
  0.208738,
  0.170591,
  0.139554,
  0.114314,
  0.093782,
  0.077100,
  0.063529,
  0.052513,
  0.043571,
  0.036308
];

// Paliers de référence (puissances 2h de stockage) enrichis avec Clean Horizon & CAPEX détaillé
export const BESS_PRESETS = {
  '0.125': {
    id: '0.125',
    palierKey: '0.125',
    label: '0,125 MW / 0,25 MWh (125 kW - 1 armoire)',
    powerMw: 0.125,
    capacityMwh: 0.261,
    powerKw: 125,
    energyKwh: 261,
    nbArmoires: 1,
    capexMode: 'COMPTE_PROPRE',
    financingMode: 'WITH_LOAN',
    revenueModel: 'CLEAN_HORIZON',
    capexBreakdown: getScaledCapexPreset('COMPTE_PROPRE', 0.125),
    capexTotal: 46000,
    capex: 46000,
    revenuAn1: 23371,
    rev1: 23371,
    opexAn1: 375,
    opex1: 375,
    maintenanceAn1: 375,
    assuranceAn1: 460,
    ass1: 460,
    turpeAn1: 2916,
    loyerAn1: 750,
    loyer1: 750,
    cfeAn: 250,
    taxeFonciereAn: 125,
    fraisCommerciaux: 0,
    roundTripEfficiencyPct: 88.0,
    availabilityPct: 98.0,
    batteryDegradationPct: 1.37,
    revenueDegradationPct: 1.37,
    aggregatorFeePct: 12.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    debtSharePct: 80,
    nominalRatePct: 4.10,
    insuranceRatePct: 0.20,
    rateAllIn: 0.043,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    withIS: true,
    loanYears: 12,
    loanDurationYears: 12,
    lifeYears: 20,
    horizonYears: 20
  },
  '0.25': {
    id: '0.25',
    palierKey: '0.25',
    label: '0,25 MW / 0,50 MWh (250 kW - 2 armoires)',
    powerMw: 0.25,
    capacityMwh: 0.522,
    powerKw: 250,
    energyKwh: 522,
    nbArmoires: 2,
    capexMode: 'COMPTE_PROPRE',
    financingMode: 'WITH_LOAN',
    revenueModel: 'CLEAN_HORIZON',
    capexBreakdown: getScaledCapexPreset('COMPTE_PROPRE', 0.25),
    capexTotal: 92000,
    capex: 92000,
    revenuAn1: 46742,
    rev1: 46742,
    opexAn1: 750,
    opex1: 750,
    maintenanceAn1: 750,
    assuranceAn1: 920,
    ass1: 920,
    turpeAn1: 5832,
    loyerAn1: 1500,
    loyer1: 1500,
    cfeAn: 500,
    taxeFonciereAn: 250,
    fraisCommerciaux: 0,
    roundTripEfficiencyPct: 88.0,
    availabilityPct: 98.0,
    batteryDegradationPct: 1.37,
    revenueDegradationPct: 1.37,
    aggregatorFeePct: 12.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    debtSharePct: 80,
    nominalRatePct: 4.10,
    insuranceRatePct: 0.20,
    rateAllIn: 0.043,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    withIS: true,
    loanYears: 12,
    loanDurationYears: 12,
    lifeYears: 20,
    horizonYears: 20
  },
  '0.50': {
    id: '0.50',
    palierKey: '0.50',
    label: '0,50 MW / 1,044 MWh (500 kW - 4 armoires)',
    powerMw: 0.50,
    capacityMwh: 1.044,
    powerKw: 500,
    energyKwh: 1044,
    nbArmoires: 4,
    capexMode: 'COMPTE_PROPRE',
    financingMode: 'WITH_LOAN',
    revenueModel: 'CLEAN_HORIZON',
    capexBreakdown: getScaledCapexPreset('COMPTE_PROPRE', 0.50),
    capexTotal: 184000,
    capex: 184000,
    revenuAn1: 93484,
    rev1: 93484,
    opexAn1: 1500,
    opex1: 1500,
    maintenanceAn1: 1500,
    assuranceAn1: 1840,
    ass1: 1840,
    turpeAn1: 11664,
    loyerAn1: 3000,
    loyer1: 3000,
    cfeAn: 1000,
    taxeFonciereAn: 500,
    fraisCommerciaux: 0,
    roundTripEfficiencyPct: 88.0,
    availabilityPct: 98.0,
    batteryDegradationPct: 1.37,
    revenueDegradationPct: 1.37,
    aggregatorFeePct: 12.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    debtSharePct: 80,
    nominalRatePct: 4.10,
    insuranceRatePct: 0.20,
    rateAllIn: 0.043,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    withIS: true,
    loanYears: 12,
    loanDurationYears: 12,
    lifeYears: 20,
    horizonYears: 20
  },
  '1.0': {
    id: '1.0',
    palierKey: '1.0',
    label: '1,00 MW / 2,088 MWh (1 000 kW - 8 armoires)',
    powerMw: 1.00,
    capacityMwh: 2.088,
    powerKw: 1000,
    energyKwh: 2088,
    nbArmoires: 8,
    capexMode: 'COMPTE_PROPRE',
    financingMode: 'WITH_LOAN',
    revenueModel: 'CLEAN_HORIZON',
    capexBreakdown: getScaledCapexPreset('COMPTE_PROPRE', 1.00),
    capexTotal: 368000,
    capex: 368000,
    revenuAn1: 186968,
    rev1: 186968,
    opexAn1: 3000,
    opex1: 3000,
    maintenanceAn1: 3000,
    assuranceAn1: 3680,
    ass1: 3680,
    turpeAn1: 23328,
    loyerAn1: 6000,
    loyer1: 6000,
    cfeAn: 2000,
    taxeFonciereAn: 1000,
    fraisCommerciaux: 0,
    roundTripEfficiencyPct: 88.0,
    availabilityPct: 98.0,
    batteryDegradationPct: 1.37,
    revenueDegradationPct: 1.37,
    aggregatorFeePct: 12.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    debtSharePct: 80,
    nominalRatePct: 4.10,
    insuranceRatePct: 0.20,
    rateAllIn: 0.043,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    withIS: true,
    loanYears: 12,
    loanDurationYears: 12,
    lifeYears: 20,
    horizonYears: 20
  }
};

/**
 * Calcul de l'Impôt sur les Sociétés (LF 2024 / 2026)
 * Tranche réduite PME : 15.0 % jusqu'à 42 500 €
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
 * Calcul d'annuité constante (PMT)
 */
export function calculateAnnuityPmt(rateDecimal, nper, principal) {
  if (!principal || principal <= 0 || !nper || nper <= 0) return 0;
  if (!rateDecimal || rateDecimal <= 0) return principal / nper;
  const pvif = Math.pow(1 + rateDecimal, nper);
  return (rateDecimal * principal * pvif) / (pvif - 1);
}

/**
 * Calcul de la VAN (Valeur Actuelle Nette)
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
 */
export function irr(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return 0;
  const hasNegative = cashFlows.some(c => c < 0);
  const hasPositive = cashFlows.some(c => c > 0);
  if (!hasNegative || !hasPositive) return 0;

  let lo = -0.95;
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
  const avgFlow = cashFlows.length > 0 ? cashFlows.reduce((a, b) => a + b, 0) / cashFlows.length : 0;
  return avgFlow > 0 ? initialInvestment / avgFlow : 20;
}

/**
 * Exécute la simulation financière complète BESS (Unitaire ou Portefeuille Multi-Projets)
 * sur 12, 15 ou 20 ans avec Clean Horizon (2027-2046) ou Modèle ENR Courtage
 */
export function computeBessLenderModel(rawParams = {}) {
  const selectedPalier = rawParams.palierKey || rawParams.id || '0.50';
  const defaultPreset = BESS_PRESETS[selectedPalier] || BESS_PRESETS['0.50'];

  const nbSites = Math.max(1, Number(rawParams.nbSites ?? 1));
  const unitPowerMw = Number(rawParams.powerMw ?? defaultPreset.powerMw ?? 0.50);
  const scalePerSite = unitPowerMw / 0.50;
  const totalScale = scalePerSite * nbSites;

  const capexMode = rawParams.capexMode || 'COMPTE_PROPRE';
  const financingMode = rawParams.financingMode || 'WITH_LOAN'; // 'WITH_LOAN' | 'CASH'
  const revenueModel = rawParams.revenueModel || 'CLEAN_HORIZON'; // 'CLEAN_HORIZON' | 'ENR_COURTAGE' | 'CUSTOM'

  // 1. Ventilation CAPEX
  const rawBreakdown = rawParams.capexBreakdown || getScaledCapexPreset(capexMode, unitPowerMw);
  const capexSummary = computeCapexBreakdownSummary(
    rawBreakdown,
    unitPowerMw,
    nbSites,
    rawParams.portfolioRaccordementSum
  );

  const fraisCommerciauxPerSite = Number(rawParams.fraisCommerciaux ?? 0);
  const totalFraisCommerciaux = fraisCommerciauxPerSite * nbSites;

  const computedCapexFromBreakdown = capexSummary.portfolioCapexTotal + totalFraisCommerciaux;
  const capexTotal = Number(
    rawParams.capexTotalOverride !== undefined && rawParams.capexTotalOverride !== null
      ? rawParams.capexTotalOverride
      : (rawParams.capexBreakdown ? computedCapexFromBreakdown : (rawParams.capexTotal ?? rawParams.capex ?? computedCapexFromBreakdown))
  );

  // 2. Paramètres de durée et financement
  const defaultHorizon = revenueModel === 'ENR_COURTAGE' ? 15 : 20;
  const horizonYears = Math.min(25, Math.max(5, Number(rawParams.horizonYears ?? rawParams.lifeYears ?? defaultHorizon)));
  const loanDurationYears = Math.min(25, Math.max(1, Number(rawParams.loanDurationYears ?? rawParams.loanYears ?? 12)));

  const isCashMode = financingMode === 'CASH';
  const rawDebtSharePct = isCashMode ? 0 : Number(rawParams.debtSharePct ?? (rawParams.debtShare !== undefined ? rawParams.debtShare * 100 : 80));
  const debtShare = Math.min(1, Math.max(0, rawDebtSharePct / 100));
  const equityShare = 1 - debtShare;

  const nominalRatePct = Number(rawParams.nominalRatePct ?? (rawParams.nominalRate !== undefined ? rawParams.nominalRate * 100 : 4.10));
  const insuranceRatePct = Number(rawParams.insuranceRatePct ?? (rawParams.insuranceRate !== undefined ? rawParams.insuranceRate * 100 : 0.20));
  const nominalRate = nominalRatePct / 100;
  const insuranceRate = insuranceRatePct / 100;
  const allInDebtRate = nominalRate + insuranceRate;

  const discountRatePct = Number(rawParams.discountRatePct ?? (rawParams.discountRate !== undefined ? rawParams.discountRate * 100 : 7.0));
  const discountRate = discountRatePct / 100;

  // 3. Paramètres techniques, cyclage & marché
  const roundTripEfficiencyPct = Number(rawParams.roundTripEfficiencyPct ?? 88.0);
  const availabilityPct = Number(rawParams.availabilityPct ?? 98.0);
  const effDispoCoeff = (roundTripEfficiencyPct / 100) * (availabilityPct / 100); // 86.24%

  const defaultDegradation = revenueModel === 'ENR_COURTAGE' ? 2.20 : 1.37;
  const batteryDegradationPct = Number(
    rawParams.batteryDegradationPct ?? rawParams.revenueDegradationPct ?? defaultDegradation
  );
  const batteryDegradationRate = batteryDegradationPct / 100;

  const aggregatorFeePct = Number(
    rawParams.aggregatorFeePct ?? (rawParams.fraisAgregateurRate !== undefined ? rawParams.fraisAgregateurRate * 100 : 12.0)
  );
  const fraisAgregateurRate = aggregatorFeePct / 100;

  const opexInflationPct = Number(rawParams.opexInflationPct ?? 1.5);
  const sharedInflationRate = opexInflationPct / 100;

  // 4. OPEX & Exploitation Année 1 (par site de puissance unitPowerMw, puis multiplié par nbSites)
  const maintenanceAn1PerSite = Number(rawParams.maintenanceAn1 ?? rawParams.opexAn1 ?? rawParams.opex1 ?? (1500 * scalePerSite));
  const assuranceAn1PerSite = Number(rawParams.assuranceAn1 ?? rawParams.ass1 ?? Math.round((capexTotal / nbSites) * 0.01));
  const turpeAn1PerSite = Number(rawParams.turpeAn1 ?? (11664 * scalePerSite));
  const loyerAn1PerSite = Number(rawParams.loyerAn1 ?? rawParams.loyer1 ?? (3000 * scalePerSite));
  const cfeAnPerSite = Number(rawParams.cfeAn ?? (1000 * scalePerSite));
  const taxeFonciereAnPerSite = Number(rawParams.taxeFonciereAn ?? (500 * scalePerSite));

  // 5. Fiscalité des sociétés (LF 2024 / 2026)
  const withIS = rawParams.withIS !== false;
  const isSeuilReduitPerCompany = Number(rawParams.isSeuilReduit ?? rawParams.taxReducedThreshold ?? 42500);
  const isTauxReduit = Number(
    rawParams.isTauxReduit ?? (rawParams.taxReducedRatePct !== undefined ? Number(rawParams.taxReducedRatePct) / 100 : 0.15)
  );
  const isTauxNormal = Number(
    rawParams.isTauxNormal ?? (rawParams.taxNormalRatePct !== undefined ? Number(rawParams.taxNormalRatePct) / 100 : 0.25)
  );

  // Dette initiale & Annuité constante
  const detteInitiale = isCashMode ? 0 : capexTotal * debtShare;
  const fondsPropresInitiaux = capexTotal - detteInitiale;
  const annuiteConstante = (!isCashMode && detteInitiale > 0)
    ? calculateAnnuityPmt(allInDebtRate, loanDurationYears, detteInitiale)
    : 0;

  // Revenu Brut An 1 personnalisé (si mode CUSTOM)
  const customRevenuBrutAn1Per500kW = Number(rawParams.customRevenuBrutAn1 ?? 108400);
  const customScaleRatio = customRevenuBrutAn1Per500kW / 108400;

  let capitalRestantDu = detteInitiale;
  let runningTreasury = 0;
  const all20Rows = [];

  const maxSimYears = Math.max(20, horizonYears);

  for (let t = 1; t <= maxSimYears; t++) {
    const chRef = CLEAN_HORIZON_20Y[Math.min(t - 1, CLEAN_HORIZON_20Y.length - 1)];
    const inflFactor = Math.pow(1 + sharedInflationRate, t - 1);

    // A. Revenus Bruts par pilier
    let tradingBrut = 0;
    let afrrCapBrut = 0;
    let afrrEnergyBrut = 0;
    let capacityMechBrut = 0;

    if (revenueModel === 'CLEAN_HORIZON') {
      tradingBrut = chRef.trading * totalScale;
      afrrCapBrut = chRef.afrrCap * totalScale;
      afrrEnergyBrut = chRef.afrrEnergy * totalScale;
      capacityMechBrut = chRef.capacityMech * totalScale;
    } else if (revenueModel === 'ENR_COURTAGE') {
      // Modèle ENR Courtage 2 cycles/j (FCR/aFRR + Arbitrage + Capacité indexés)
      tradingBrut = 35300 * totalScale * inflFactor;
      afrrCapBrut = 38200 * totalScale * inflFactor;
      afrrEnergyBrut = 24200 * totalScale * inflFactor;
      capacityMechBrut = 10150 * totalScale * inflFactor;
    } else {
      // Mode personnalisé : conserve la répartition par pilier mise à l'échelle
      tradingBrut = chRef.trading * totalScale * customScaleRatio;
      afrrCapBrut = chRef.afrrCap * totalScale * customScaleRatio;
      afrrEnergyBrut = chRef.afrrEnergy * totalScale * customScaleRatio;
      capacityMechBrut = chRef.capacityMech * totalScale * customScaleRatio;
    }

    const revenuBrutTotal = tradingBrut + afrrCapBrut + afrrEnergyBrut + capacityMechBrut;

    // B. Abattement Dispo × Rendement & Capacité restante (Vieillissement batterie)
    const capaciteRestanteFactor = Math.pow(1 - batteryDegradationRate, t - 1);
    const capaciteRestantePct = capaciteRestanteFactor * 100;

    const revenuApresDispoRendement = revenuBrutTotal * effDispoCoeff;
    const abattementDispoRendement = revenuBrutTotal - revenuApresDispoRendement;
    const revenuCorrige = revenuApresDispoRendement * capaciteRestanteFactor;
    const abattementVieillissement = revenuApresDispoRendement - revenuCorrige;

    // Piliers corrigés (pour affichage optionnel)
    const corrFactor = effDispoCoeff * capaciteRestanteFactor;
    const tradingNet = tradingBrut * corrFactor;
    const afrrCapNet = afrrCapBrut * corrFactor;
    const afrrEnergyNet = afrrEnergyBrut * corrFactor;
    const capacityMechNet = capacityMechBrut * corrFactor;

    // C. Détail des charges d'exploitation (OPEX)
    const opexMaintenance = maintenanceAn1PerSite * nbSites * inflFactor;
    const assuranceExploitation = assuranceAn1PerSite * nbSites * inflFactor;
    const fraisAgregateur = revenuCorrige * fraisAgregateurRate;
    const turpe7 = turpeAn1PerSite * nbSites * inflFactor;
    const loyerFoncier = loyerAn1PerSite * nbSites * inflFactor;
    const cfe = t === 1 ? 0 : (cfeAnPerSite * nbSites * inflFactor); // Exonération CFE An 1
    const taxeFonciere = taxeFonciereAnPerSite * nbSites * inflFactor;

    const totalChargesOpex = opexMaintenance + assuranceExploitation + fraisAgregateur + turpe7 + loyerFoncier + cfe + taxeFonciere;

    // D. EBE / EBITDA
    const ebitda = revenuCorrige - totalChargesOpex;
    const margeEbitda = revenuCorrige > 0 ? (ebitda / revenuCorrige) * 100 : 0;

    // E. Dette, Amortissements & Fiscalité
    const capitalDebut = (!isCashMode && t <= loanDurationYears) ? capitalRestantDu : 0;
    const interetsAssurance = (!isCashMode && t <= loanDurationYears && capitalDebut > 0)
      ? capitalDebut * allInDebtRate
      : 0;
    const serviceDette = (!isCashMode && t <= loanDurationYears && detteInitiale > 0)
      ? annuiteConstante
      : 0;
    const amortissementCapital = (!isCashMode && t <= loanDurationYears && detteInitiale > 0)
      ? Math.min(capitalDebut, Math.max(0, serviceDette - interetsAssurance))
      : 0;
    const capitalFin = Math.max(0, capitalDebut - amortissementCapital);

    const amortissementInstallation = t <= horizonYears ? (capexTotal / horizonYears) : 0;
    const ebit = ebitda - amortissementInstallation;
    const ebt = ebit - interetsAssurance;

    // Calcul IS (si withIS actif)
    const is = withIS
      ? calculateIS(ebt, isSeuilReduitPerCompany, isTauxReduit, isTauxNormal)
      : 0;
    const resultatNet = ebt - is;

    // F. Cash-Flow Net, Trésorerie Cumulée & Ratios Bancaires
    const cfads = ebitda - is;
    const cashFlowNet = cfads - serviceDette; // FCFE
    if (t <= horizonYears) {
      runningTreasury += cashFlowNet;
    }

    const dscr = (!isCashMode && t <= loanDurationYears && serviceDette > 0) ? (cfads / serviceDette) : null;
    const icr = (!isCashMode && t <= loanDurationYears && interetsAssurance > 0) ? (ebit / interetsAssurance) : null;

    const isNonLevier = withIS
      ? calculateIS(ebit, isSeuilReduitPerCompany, isTauxReduit, isTauxNormal)
      : 0;
    const fcff = ebitda - isNonLevier;
    const fcffActualise = fcff / Math.pow(1 + discountRate, t);
    const fcfe = cashFlowNet;
    const fcfeActualise = fcfe / Math.pow(1 + discountRate, t);

    const profilPourcent = detteInitiale > 0 ? (amortissementCapital / detteInitiale) * 100 : 0;

    all20Rows.push({
      year: t,
      yearLabel: `An ${t}`,
      calendarYear: 2026 + t,
      // Piliers bruts Clean Horizon
      tradingBrut,
      afrrCapBrut,
      afrrEnergyBrut,
      capacityMechBrut,
      revenuBrutTotal,
      // Abattements & Revenus corrigés
      effDispoPct: effDispoCoeff * 100,
      abattementDispoRendement,
      capaciteRestantePct,
      abattementVieillissement,
      revenuCorrige,
      revenuNet: revenuCorrige,
      revenue: revenuCorrige,
      tradingNet,
      afrrCapNet,
      afrrEnergyNet,
      capacityMechNet,
      // Détail des charges OPEX
      opexMaintenance,
      opex: opexMaintenance + turpe7 + cfe + taxeFonciere, // alias rétrocompatible
      assuranceExploitation,
      insurance: assuranceExploitation,
      fraisAgregateur,
      aggregatorFee: fraisAgregateur,
      turpe7,
      loyerFoncier,
      landRent: loyerFoncier,
      cfe,
      taxeFonciere,
      totalChargesOpex,
      // EBITDA & Résultats
      ebitda,
      margeEbitda,
      ebitdaMargin: margeEbitda,
      // Dette & Amortissements
      profilPourcent,
      amortProfilePct: profilPourcent,
      capitalDebut,
      beginningDebt: capitalDebut,
      capitalFin,
      endingDebt: capitalFin,
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
      // Flux & Ratios
      cfads,
      dscr,
      icr,
      isNonLevier,
      unleveredTax: isNonLevier,
      fcff,
      fcffActualise,
      discountedFcff: fcffActualise,
      fcfe,
      cashFlowNet,
      tresorerieCumulee: runningTreasury,
      fcfeActualise
    });

    capitalRestantDu = capitalFin;
  }

  // Découpage selon l'horizon sélectionné (12, 15 ou 20 ans)
  const rows = all20Rows.slice(0, horizonYears);
  const loanRows = rows.filter(r => r.year <= loanDurationYears && r.serviceDette > 0);
  const dscrs = loanRows.map(r => r.dscr).filter(d => d !== null && !isNaN(d));
  const icrs = loanRows.map(r => r.icr).filter(i => i !== null && !isNaN(i));

  const sumKey = (k) => rows.reduce((acc, r) => acc + (r[k] || 0), 0);

  const dscrMin = isCashMode ? 9.99 : (dscrs.length > 0 ? Math.min(...dscrs) : 0);
  const dscrMoyen = isCashMode ? 9.99 : (dscrs.length > 0 ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : 0);
  const icrMin = isCashMode ? 9.99 : (icrs.length > 0 ? Math.min(...icrs) : 0);

  // LLCR & PLCR
  const vanCfadsLoan = npv(allInDebtRate || 0.043, loanRows.map(r => r.cfads));
  const vanCfadsLife = npv(allInDebtRate || 0.043, rows.map(r => r.cfads));
  const llcr = (!isCashMode && detteInitiale > 0) ? vanCfadsLoan / detteInitiale : 9.99;
  const plcr = (!isCashMode && detteInitiale > 0) ? vanCfadsLife / detteInitiale : 9.99;

  // Séries pour TRI et Payback sur l'horizon
  const projectCashFlows = [-capexTotal, ...rows.map(r => r.fcff)];
  const equityCashFlows = [-(fondsPropresInitiaux > 0 ? fondsPropresInitiaux : capexTotal * 0.20), ...rows.map(r => r.fcfe)];

  const triProjet = irr(projectCashFlows) * 100;
  const vanProjet = npv(discountRate, rows.map(r => r.fcff)) - capexTotal;
  const paybackActualise = calculateDiscountedPayback(capexTotal, rows.map(r => r.fcff), discountRate);
  const paybackSimple = calculateDiscountedPayback(capexTotal, rows.map(r => r.ebitda), 0);

  const triFondsPropres = isCashMode ? triProjet : irr(equityCashFlows) * 100;
  const vanFondsPropres = isCashMode ? vanProjet : (npv(discountRate, rows.map(r => r.fcfe)) - fondsPropresInitiaux);

  // Trésorerie générée après remboursement du prêt
  const postLoanRows = isCashMode ? rows : rows.filter(r => r.year > loanDurationYears);
  const tresoreriePostPret = postLoanRows.reduce((acc, r) => acc + r.fcfe, 0);

  // Totaux consolidés sur l'horizon
  const totals = {
    tradingBrut: sumKey('tradingBrut'),
    afrrCapBrut: sumKey('afrrCapBrut'),
    afrrEnergyBrut: sumKey('afrrEnergyBrut'),
    capacityMechBrut: sumKey('capacityMechBrut'),
    revenuBrutTotal: sumKey('revenuBrutTotal'),
    abattementDispoRendement: sumKey('abattementDispoRendement'),
    abattementVieillissement: sumKey('abattementVieillissement'),
    revenuCorrige: sumKey('revenuCorrige'),
    revenuNet: sumKey('revenuCorrige'),
    revenue: sumKey('revenuCorrige'),
    opexMaintenance: sumKey('opexMaintenance'),
    opex: sumKey('opex'),
    fraisAgregateur: sumKey('fraisAgregateur'),
    aggregatorFee: sumKey('fraisAgregateur'),
    assuranceExploitation: sumKey('assuranceExploitation'),
    insurance: sumKey('assuranceExploitation'),
    turpe7: sumKey('turpe7'),
    loyerFoncier: sumKey('loyerFoncier'),
    landRent: sumKey('loyerFoncier'),
    cfe: sumKey('cfe'),
    taxeFonciere: sumKey('taxeFonciere'),
    totalChargesOpex: sumKey('totalChargesOpex'),
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
    cashFlowNet: sumKey('cashFlowNet'),
    fcfeActualise: sumKey('fcfeActualise'),
    unleveredTax: sumKey('unleveredTax')
  };

  return {
    params: {
      nbSites,
      powerMw: unitPowerMw,
      totalPowerMw: unitPowerMw * nbSites,
      capexMode,
      financingMode,
      isCashMode,
      revenueModel,
      capexBreakdown: capexSummary.breakdown,
      capexSummary,
      fraisCommerciaux: fraisCommerciauxPerSite,
      capexTotal,
      revenuAn1: rows[0]?.revenuCorrige || 0,
      revenuBrutAn1: rows[0]?.revenuBrutTotal || 0,
      maintenanceAn1: maintenanceAn1PerSite,
      opexAn1: maintenanceAn1PerSite,
      assuranceAn1: assuranceAn1PerSite,
      turpeAn1: turpeAn1PerSite,
      loyerAn1: loyerAn1PerSite,
      cfeAn: cfeAnPerSite,
      taxeFonciereAn: taxeFonciereAnPerSite,
      horizonYears,
      loanDurationYears,
      debtShare,
      debtSharePct: rawDebtSharePct,
      equityShare,
      detteInitiale,
      fondsPropresInitiaux,
      annuiteConstante,
      nominalRate,
      nominalRatePct,
      insuranceRate,
      insuranceRatePct,
      allInDebtRate,
      discountRate,
      discountRatePct,
      roundTripEfficiencyPct,
      availabilityPct,
      effDispoCoeff,
      batteryDegradationPct,
      decoteAnnuelleRevenus: batteryDegradationRate,
      aggregatorFeePct,
      fraisAgregateurRate,
      opexInflationPct,
      opexGrowthRate: sharedInflationRate,
      withIS,
      isSeuilReduit: isSeuilReduitPerCompany,
      isTauxReduit,
      isTauxNormal
    },
    capexSummary,
    rows,
    all20Rows,
    years: rows,
    totals,
    cumul: totals,
    capex: capexTotal,
    debt: detteInitiale,
    equity: fondsPropresInitiaux,
    annuite: annuiteConstante,
    rateAllIn: allInDebtRate,
    kpis: {
      capexTotal,
      detteInitiale,
      fondsPropresInitiaux,
      annuiteConstante,
      allInDebtRate: allInDebtRate * 100,
      nominalRate: nominalRate * 100,
      insuranceRate: insuranceRate * 100,
      horizonYears,
      loanDurationYears: isCashMode ? 0 : loanDurationYears,
      margeApresPretYears: isCashMode ? horizonYears : Math.max(0, horizonYears - loanDurationYears),
      revenusBrutsCumules: totals.revenuBrutTotal,
      revenusCumules: totals.revenuCorrige,
      ebitdaCumule: totals.ebitda,
      resultatNetCumule: totals.resultatNet,
      cashFlowNetCumule: totals.cashFlowNet,
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
      paybackSimple,
      triFondsPropres,
      equityIrr: triFondsPropres,
      vanFondsPropres,
      equityNpv: vanFondsPropres,
      tresoreriePostPret,
      cashFlowPostLoan: tresoreriePostPret,
      cumulRevenue: totals.revenuCorrige,
      cumulEbitda: totals.ebitda,
      cumulNetIncome: totals.resultatNet,
      margeEbitdaMoyenne: totals.revenuCorrige > 0 ? (totals.ebitda / totals.revenuCorrige) * 100 : 0
    }
  };
}

/**
 * Moteur d'analyse de sensibilité & stress-tests bancaires unifié
 * Inclut : Cas de Base, Cas Bas (-15%), Cas Haut (+15%), Stress test vieillissement 2%/an,
 * Stress test sans bonus TURPE 7 (15 318 €), Stress OPEX +15%, Stress Taux +100 bps, Stress Combiné
 */
export function computeBessStressTests(arg1 = {}, arg2 = null) {
  const rawBaseParams = arg2 ? arg2 : (arg1?.params ? arg1.params : arg1);
  const baseSim = arg1?.params && arg1?.rows ? arg1 : computeBessLenderModel(rawBaseParams);
  const p = baseSim.params;
  const scalePerSite = (p.powerMw || 0.50) / 0.50;

  const buildScaledRowsSim = (overrides = {}, revenueMultiplier = 1.0) => {
    if (revenueMultiplier === 1.0) {
      return computeBessLenderModel({ ...rawBaseParams, ...p, ...overrides });
    }
    // Pour un multiplicateur de revenus (-15% ou +15%), on ajuste les revenus à la volée via customScale
    const baseModel = computeBessLenderModel({ ...rawBaseParams, ...p, ...overrides });
    // Recalculer avec multiplicateur de revenus
    const customSim = computeBessLenderModel({
      ...rawBaseParams,
      ...p,
      ...overrides,
      revenueModel: 'CUSTOM',
      customRevenuBrutAn1: 108400 * revenueMultiplier
    });
    return customSim;
  };

  const scenarioDefs = [
    {
      id: 'base',
      name: '1. Cas de Base (Scénario Central Clean Horizon)',
      badge: 'Référence',
      run: () => baseSim
    },
    {
      id: 'cas_bas_15',
      name: '2. Cas Bas — Revenus Marché -15 %',
      badge: '-15 % Rev.',
      run: () => buildScaledRowsSim({}, 0.85)
    },
    {
      id: 'cas_haut_15',
      name: '3. Cas Haut — Revenus Marché +15 %',
      badge: '+15 % Rev.',
      run: () => buildScaledRowsSim({}, 1.15)
    },
    {
      id: 'stress_vieillissement_2pct',
      name: '4. Stress-Test Vieillissement Batterie (2,00 % / an)',
      badge: 'Dégrad. 2%/an',
      run: () => buildScaledRowsSim({ batteryDegradationPct: 2.0, revenueDegradationPct: 2.0 }, 1.0)
    },
    {
      id: 'stress_sans_bonus_turpe7',
      name: '5. Stress-Test Sans Bonus TURPE 7 (Tarif standard 15 318 €/site)',
      badge: 'TURPE Std',
      run: () => buildScaledRowsSim({ turpeAn1: Math.round(15318 * scalePerSite) }, 1.0)
    },
    {
      id: 'stress_agregateur_15',
      name: '6. Stress-Test Commission Agrégateur à 15 % & OPEX +15 %',
      badge: 'OPEX +15%',
      run: () => buildScaledRowsSim({
        aggregatorFeePct: Math.max(15, p.aggregatorFeePct),
        maintenanceAn1: Math.round(p.maintenanceAn1 * 1.15),
        assuranceAn1: Math.round(p.assuranceAn1 * 1.15)
      }, 1.0)
    },
    {
      id: 'stress_taux_plus_100bps',
      name: '7. Stress-Test Hausse Taux d\'Intérêt Bancaire (+100 bps)',
      badge: '+1,00 % Taux',
      run: () => buildScaledRowsSim({ nominalRatePct: p.nominalRatePct + 1.0 }, 1.0)
    },
    {
      id: 'stress_combine',
      name: '8. Stress Combiné Sévère (Revenus -15 % + Sans Bonus TURPE 7)',
      badge: 'Combiné',
      run: () => buildScaledRowsSim({ turpeAn1: Math.round(15318 * scalePerSite) }, 0.85)
    }
  ];

  const scenarios = scenarioDefs.map(sc => {
    const sim = sc.run();
    return {
      id: sc.id,
      name: sc.name,
      badge: sc.badge,
      dscrMin: sim.kpis.dscrMin,
      dscrMoyen: sim.kpis.dscrMoyen,
      dscrAvg: sim.kpis.dscrMoyen,
      triProjet: sim.kpis.triProjet,
      triFondsPropres: sim.kpis.triFondsPropres,
      vanProjet: sim.kpis.vanProjet,
      projectNpv: sim.kpis.vanProjet,
      resultatNetCumule: sim.kpis.resultatNetCumule,
      cumulNetIncome: sim.kpis.resultatNetCumule,
      cashFlowNetCumule: sim.kpis.cashFlowNetCumule,
      isAcceptable: p.isCashMode || sim.kpis.dscrMin >= 1.10,
      isCompliant: p.isCashMode || sim.kpis.dscrMin >= 1.20
    };
  });

  // Solveur point de rupture (baisse tolérée des revenus avant DSCR min = cible)
  const findRevenueDropForTargetDscr = (targetDscr) => {
    if (p.isCashMode || p.detteInitiale <= 0) return 85.0;
    let lo = 0;
    let hi = 0.85;
    for (let i = 0; i < 35; i++) {
      const mid = (lo + hi) / 2;
      const testSim = buildScaledRowsSim({}, 1 - mid);
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

  const loanRows = baseSim.rows.filter(r => r.year <= p.loanDurationYears && r.serviceDette > 0);
  const nbAnneesDscr120 = p.isCashMode
    ? p.horizonYears
    : loanRows.filter(r => r.dscr !== null && r.dscr >= 1.20).length;
  const totalLoanYears = p.isCashMode ? p.horizonYears : p.loanDurationYears;

  return {
    scenarios,
    baisseToleree110,
    baisseToleree100,
    anneesDscrGte120: nbAnneesDscr120,
    totalLoanYears,
    rupture: {
      baisseToleree110,
      baisseToleree100,
      dscrMinAn1: baseSim.rows[0]?.dscr || baseSim.kpis.dscrMin,
      anneesDscrSuperieur120: nbAnneesDscr120,
      nbAnneesDscr120,
      totalAnneesPret: totalLoanYears
    }
  };
}
