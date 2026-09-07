/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOLAR FINANCING ENGINE
 * Moteur financier photovoltaïque pour les 3 solutions de financement :
 * 1. Tiers-Financement (Bail 30 ans, 0€ investis, loyer garanti + intéressement 10%)
 * 2. Crédit Bancaire (Propriétaire dès J1, prêt professionnel amortissable)
 * 3. Abonnement Solaire (Leasing / LOA, coefficients rétro-ingénierés SunLib)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Matrice exacte des taux d'abonnement / leasing (SunLib / LOA Pro)
const LEASING_RATE_MATRIX = {
  10: [10.0, 10.0, 10.0, 10.6, 10.7, 10.8, 10.84, 10.89, 11.0, 11.1, 11.21, 11.3, 11.35, 11.39, 11.5, 11.6, 11.72, 11.8, 11.85, 11.9, 11.98, 12.1, 12.2, 12.3, 12.4, 12.5],
  15: [9.1, 9.1, 9.1, 9.7, 9.8, 9.9, 9.94, 9.99, 10.1, 10.2, 10.31, 10.4, 10.45, 10.49, 10.6, 10.7, 10.82, 10.9, 10.95, 11.0, 11.08, 11.2, 11.3, 11.4, 11.5, 11.6],
  20: [8.75, 8.75, 8.75, 9.35, 9.45, 9.55, 9.59, 9.64, 9.75, 9.85, 9.96, 10.05, 10.1, 10.14, 10.25, 10.35, 10.47, 10.55, 10.6, 10.65, 10.73, 10.85, 10.95, 11.05, 11.15, 11.25],
  25: [8.5, 8.5, 8.5, 9.1, 9.2, 9.3, 9.34, 9.39, 9.5, 9.6, 9.71, 9.8, 9.85, 9.89, 10.0, 10.1, 10.22, 10.3, 10.35, 10.4, 10.48, 10.6, 10.7, 10.8, 10.9, 11.0]
};

export function getLeasingRate(durationYears, powerKwc) {
  let idx = Math.floor((powerKwc - 2) / 0.5);
  if (powerKwc > 36) idx = 25;
  else idx = Math.max(0, Math.min(idx, 25));

  const rates = LEASING_RATE_MATRIX[durationYears] || LEASING_RATE_MATRIX[20];
  const ratePct = idx < rates.length ? rates[idx] : rates[rates.length - 1];
  return ratePct / 100;
}

// ─── 1. Modèle Tiers-Financement ──────────────────────────────────────────
export function calculateThirdPartyFinancing({
  powerKwc,
  annualRevenue = 21985,
  rentMultiplier = 14 // Configurable en €/kWc/an (ex: 9 ou 14)
}) {
  const safePower = Number(powerKwc) || 0;
  const safeRevenue = Number(annualRevenue) || 0;
  const safeMultiplier = Number(rentMultiplier) || 14;

  const annualRentFixed = Math.round(safePower * safeMultiplier * 100) / 100;
  const cumulYears1To20 = Math.round(annualRentFixed * 20);
  
  // Intéressement : 10% du CA annuel de revente d'électricité de l'année 21 à 30
  const annualProfitSharing = Math.round(safeRevenue * 0.10);
  const cumulYears21To30 = Math.round(annualProfitSharing * 10);
  const totalGains30Years = cumulYears1To20 + cumulYears21To30;

  return {
    property: 'Tiers investisseur (bail 30 ans)',
    clientInvestmentHT: 0,
    rentMultiplier,
    annualRentFixed,
    cumulYears1To20,
    annualProfitSharing,
    cumulYears21To30,
    totalGains30Years
  };
}

// ─── 2. Modèle Crédit Bancaire ───────────────────────────────────────────
export function calculateBankLoan({
  capexHT,
  durationYears = 20,
  apportHT = 0,
  interestRate = 0.0448, // 4.48% (taux cible ~1600€/mois pour 251 370€ sur 20 ans)
  annualRevenue = 0
}) {
  const safeCapex = Number(capexHT) || 0;
  const safeApport = Number(apportHT) || 0;
  const capital = Math.max(0, safeCapex - safeApport);
  const months = durationYears * 12;
  const monthlyRate = interestRate / 12;
  
  const monthlyPaymentExact = capital > 0 ? capital * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))) : 0;
  const annualPaymentExact = monthlyPaymentExact * 12;
  const safeRevenue = Number(annualRevenue) || 0;
  const totalRepaid = Math.round(monthlyPaymentExact * months);
  const totalInterest = Math.max(0, totalRepaid - capital);
  const annualNetCashflow = Math.round(safeRevenue - annualPaymentExact);

  return {
    property: 'Client propriétaire dès le 1er jour',
    durationYears,
    capitalFinanced: capital,
    interestRate,
    monthlyPaymentExact: Math.round(monthlyPaymentExact * 100) / 100,
    monthlyPaymentRounded: Math.round(monthlyPaymentExact / 50) * 50,
    annualPaymentExact: Math.round(annualPaymentExact),
    annualNetCashflow,
    annualNetCashFlow: annualNetCashflow, // alias camelCase
    totalRepaid,
    totalInterest
  };
}

// ─── 3. Modèle Abonnement Solaire (Leasing) ──────────────────────────────
export function calculateLeasingSubscription({
  capexHT,
  powerKwc,
  initialPaymentHT = 0,
  annualRevenue = 0
}) {
  const safeCapex = Number(capexHT) || 0;
  const safePower = Number(powerKwc) || 0;
  const safeInitial = Number(initialPaymentHT) || 0;
  const capital = Math.max(0, safeCapex - safeInitial);
  const durations = [10, 15, 20, 25];

  const resultsByDuration = durations.map(d => {
    const rate = getLeasingRate(d, safePower);
    const months = d * 12;
    const monthlyRate = rate / 12;
    const monthlyPaymentHT = capital > 0 ? capital * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))) : 0;
    const annualPaymentHT = monthlyPaymentHT * 12;
    const annualNetCashflow = Math.round(annualRevenue - annualPaymentHT);

    return {
      durationYears: d,
      annualRate: Math.round(rate * 1000) / 10,
      monthlyPaymentHT: Math.round(monthlyPaymentHT * 100) / 100,
      annualPaymentHT: Math.round(annualPaymentHT),
      annualNetCashflow,
      buyoutOptionHT: 1
    };
  });

  return {
    property: 'Client propriétaire au terme du contrat (option 1 €)',
    capitalFinanced: capital,
    durations: resultsByDuration
  };
}

/**
 * Calcul consolidé des 3 solutions de financement
 */
export function calculateAllFinancingScenarios({
  capexHT,
  powerKwc,
  annualRevenue = 21985,
  rentMultiplier = 14,
  bankDurationYears = 20,
  leasingDurationYears = 20
}) {
  const thirdParty = calculateThirdPartyFinancing({
    powerKwc,
    annualRevenue,
    rentMultiplier
  });

  const bankLoan = calculateBankLoan({
    capexHT,
    durationYears: bankDurationYears,
    annualRevenue
  });

  const leasing = calculateLeasingSubscription({
    capexHT,
    powerKwc,
    annualRevenue
  });

  const selectedLeasing = leasing.durations.find(d => d.durationYears === leasingDurationYears) || leasing.durations[2];

  return {
    thirdParty,
    bankLoan,
    leasing,
    selectedLeasing
  };
}

