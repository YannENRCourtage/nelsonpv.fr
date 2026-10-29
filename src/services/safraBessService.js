/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE DE SIMULATION ÉNERGÉTIQUE & FINANCIÈRE BESS SAFRA
 * - Dimensionnement derrière le compteur (Mode autonomie pure, coût racc = 0 €)
 * - Faisabilité et raccordement Enedis (BT C4 250 kW vs HTA 20 kV)
 * - Arbitrage HP/HC, Écrêtage de puissance TURPE (Peak Shaving)
 * - Value Stacking & Cash-flow sur 12 ans (TRI, VAN, ROI)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SAFRA_CATALOG, recommendSafraModel } from '../data/safraCatalog.js';
import { BESS_ODRE_MATRIX } from '../data/bessOdreMatrix.js';
import { calculateIrr, calculateProjectPayback } from './bessSimulationEngine.js';

/**
 * Calcul complet de la simulation SAFRA
 */
export function computeSafraSimulation({
  consoAnnuelleKwh = 211781,
  consoJourMoyKwh = 578.6,
  peakKw = 90.0,
  selectedModel = null,
  quantity = 1,
  customPriceHt = null,
  customInstallHt = null,
  pricingMode = 'TURNKEY', // 'TURNKEY' (Clé en main posé) | 'HARDWARE_ONLY' (Matériel seul)
  includeGridConnection = false,
  forcedGridConnection = false,
  customDistanceMeters = 25,
  prmAddress = '',
  nearestTransfo = null,
  deltaHpHcEur = 0.11, // 0.11 €/kWh d'écart entre Heures Creuses et Heures Pleines
  turpePrimeFixeKwEur = 42.0 // 42 €/kW/an d'économie sur la puissance souscrite TURPE
}) {
  const cAnnuelle = Number(consoAnnuelleKwh) || 211781;
  const cJour = Number(consoJourMoyKwh) || (cAnnuelle / 365);
  const pPeak = Number(peakKw) || 90.0;
  const qte = Math.max(1, Number(quantity) || 1);

  // 1. Modèle sélectionné ou recommandé par défaut
  let model = selectedModel;
  if (!model) {
    const rec = recommendSafraModel(cJour, pPeak);
    model = rec.primaryModel;
  }

  const modelPriceHt = customPriceHt !== null ? Number(customPriceHt) : model.defaultPriceHt;
  const modelInstallHt = customInstallHt !== null ? Number(customInstallHt) : model.defaultInstallHt;

  // Caractéristiques globales de l'installation SAFRA
  const totalCapacityKwh = model.capacityKwh * qte;
  const totalPowerKw = model.powerKw * qte;

  // ─── 2. CALCULS EN MODE DERRIÈRE LE COMPTEUR (SANS RACCORDEMENT RÉSEAU) ───
  // Capacité utile cyclable par jour (DoD 90%, plafonnée à 75% du besoin journalier)
  const dailyUsableKwh = Math.min(totalCapacityKwh * 0.90, cJour * 0.75);
  const annualCycledKwh = dailyUsableKwh * 300; // 300 cycles complets par an

  // A. Économies Arbitrage Heures Pleines / Heures Creuses
  const arbitrageSavingsYear = Math.round(annualCycledKwh * deltaHpHcEur);

  // B. Écrêtage de pointe (Peak Shaving) sur la puissance souscrite et dépassements
  // La batterie efface une tranche de puissance max (jusqu'à 45% de la pointe ou la puissance totale batterie)
  const peakShavedKw = Math.min(pPeak * 0.45, totalPowerKw);
  const newPeakKw = Math.max(10, Math.round((pPeak - peakShavedKw) * 10) / 10);
  const peakShavingSavingsYear = Math.round(peakShavedKw * turpePrimeFixeKwEur);

  // Économies totales sur facture client (€ HT / an)
  const annualBillSavings = arbitrageSavingsYear + peakShavingSavingsYear;

  // C. Autonomie / Couverture énergétique du site
  const baseAutonomyPercent = Math.min(22, Math.round((dailyUsableKwh * 0.25 / cJour) * 100) + 12);
  const addedAutonomyPercent = Math.round((annualCycledKwh / Math.max(1, cAnnuelle)) * 100);
  const totalAutonomyPercent = Math.min(85, Math.max(baseAutonomyPercent + 5, baseAutonomyPercent + addedAutonomyPercent));

  // ─── 3. ANALYSE DU RACCORDEMENT RÉSEAU ENEDIS (SI OPTION COCHÉE) ───
  let gridFeasibility = {
    voltageDomain: totalPowerKw <= 250 ? 'BT_C4' : 'HTA_20KV',
    status: 'OPTIMAL',
    badge: 'Éligible',
    badgeColor: 'emerald',
    warningMessage: null,
    errorMessage: null,
    connectionCostHt: 0,
    quotePartS3renrCost: 0,
    posteSourceInfo: null,
    isSaturated: false
  };

  let gridAnnualRevenues = 0;

  if (includeGridConnection) {
    const distM = Math.max(5, Number(customDistanceMeters) || 25);

    if (totalPowerKw <= 250) {
      // ── BASSE TENSION (BT C4 <= 250 kW) ──
      // Vérification transfo au sol vs poteau
      const isPole = nearestTransfo?.physicalCategory === 'poteau' || nearestTransfo?.typeLabel?.toLowerCase()?.includes('poteau');
      const isTooFar = distM > 30;

      // Coût raccordement BT calibré 8 500 € à 9 500 € HT pour <= 30m
      // Forfait C4 (4 500 €) + AGCP (3 500 €) + Liaison BT (distM * 45 €/m)
      const baseBtCost = 4500 + 3500 + Math.round(distM * 45);
      const clampedBtCost = distM <= 30 ? Math.min(9500, Math.max(8500, baseBtCost)) : baseBtCost;

      gridFeasibility.connectionCostHt = clampedBtCost;
      gridFeasibility.quotePartS3renrCost = 0; // Exonéré de S3REnR en BT <= 250 kW

      if (isPole || isTooFar) {
        gridFeasibility.status = 'CONTRAINT';
        gridFeasibility.badge = 'Sous contrainte';
        gridFeasibility.badgeColor = 'amber';
        gridFeasibility.warningMessage = `⚠️ Raccordement réseau impossible ou sous contrainte : ${
          isPole ? 'Transformateur HTA/BT identifié sur poteau (H61) insuffisant.' : ''
        } ${isTooFar ? `Distance (${distM} m) supérieure au maximum recommandé (30 m).` : ''}`;
      } else {
        gridFeasibility.status = 'OPTIMAL';
        gridFeasibility.badge = '✅ Raccordement BT 250 kW Optimal';
        gridFeasibility.badgeColor = 'emerald';
      }
    } else {
      // ── HAUTE TENSION (HTA 20 kV > 250 kW) ──
      // Recherche poste source le plus proche ou dans la matrice ODRE
      const powerMw = totalPowerKw / 1000;
      const nearestPoste = BESS_ODRE_MATRIX[0]; // Poste de référence PLAUD/LUBERSAC
      const s3renrRate = nearestPoste?.quotePartS3renrEur || 92730;
      const residualCapacityMw = nearestPoste?.capaciteResiduelleOdreMw !== undefined ? nearestPoste.capaciteResiduelleOdreMw : 0.0;

      gridFeasibility.posteSourceInfo = {
        name: nearestPoste?.posteSourceEnedis || 'Poste HTA',
        quotePartEurPerMw: s3renrRate,
        residualCapacityMw
      };

      // Quote-part S3REnR + Cellule Enedis + Poste livraison + Liaison
      const quotePart = Math.round(powerMw * s3renrRate);
      const celluleEnedis = 25000;
      const posteLivraison = 25000;
      const liaisonHta = Math.round((distM / 1000) * 35000);
      const totalHtaCost = quotePart + celluleEnedis + posteLivraison + liaisonHta;

      gridFeasibility.connectionCostHt = totalHtaCost;
      gridFeasibility.quotePartS3renrCost = quotePart;

      if (residualCapacityMw === 0 && !forcedGridConnection) {
        gridFeasibility.isSaturated = true;
        gridFeasibility.status = 'BLOCKED';
        gridFeasibility.badge = '🚫 Poste Source Saturé';
        gridFeasibility.badgeColor = 'rose';
        gridFeasibility.errorMessage =
          "🚫 Raccordement HTA impossible en injection : Poste Source / Départ HTA saturé (0 MW disponible). Seul le mode sans raccordement (autoconsommation/autonomie interne) ou une limitation à 250 kW BT sur poste au sol est réalisable.";
      } else {
        gridFeasibility.status = 'ELIGIBLE_HTA';
        gridFeasibility.badge = 'Raccordement HTA 20 kV';
        gridFeasibility.badgeColor = 'blue';
      }
    }

    // ── REVENUS DE MARCHÉ (VALUE STACKING INJECTION RÉSEAU) ──
    // FCR / aFRR (Réserve rapide) + Capacité RTE + Arbitrage Spot (net commission agrégateur 15%)
    // Base standard : ~80 €/kW/an net
    if (!gridFeasibility.isSaturated || forcedGridConnection) {
      gridAnnualRevenues = Math.round(totalPowerKw * 80);
    }
  }

  // ─── 4. BILAN FINANCIER GLOBAL, CAPEX ET CASH-FLOW SUR 12 ANS ───
  // Application de la dégressivité des coûts de pose :
  // - 10% si 2 batteries
  // - 15% si 4 batteries (ou >= 3)
  let installDiscount = 0;
  if (qte === 2) {
    installDiscount = 0.10;
  } else if (qte >= 3) {
    installDiscount = 0.15;
  }
  const hardwareCapex = modelPriceHt * qte;
  const baseInstallCapex = modelInstallHt * qte;
  const installCapex = pricingMode === 'HARDWARE_ONLY' ? 0 : Math.round(baseInstallCapex * (1 - installDiscount));
  const connectionCapex = includeGridConnection ? gridFeasibility.connectionCostHt : 0;
  const totalCapexHt = hardwareCapex + installCapex + connectionCapex;

  // OPEX annuel de maintenance / garantie (1.2% du hardware)
  const annualOpexHt = Math.round(hardwareCapex * 0.012);

  // EBITDA annuel initial (Gain net d'exploitation année 1)
  const annualEbitdaHt = (annualBillSavings + gridAnnualRevenues) - annualOpexHt;

  // Série de cash-flow sur 12 ans
  // Paramètres validés par l'utilisateur :
  // - Dégradation batterie : 1.0% par an (au lieu de 2.0%)
  // - Inflation de l'énergie (hausse valeur économies HP/HC & pointe) : 5.0% par an
  // - Inflation OPEX de maintenance : 2.0% par an
  const cashFlowSeries = [-totalCapexHt];
  const cumulativeCashFlow = [-totalCapexHt];
  let runningCumul = -totalCapexHt;

  for (let year = 1; year <= 12; year++) {
    const degradationFactor = Math.pow(1 - 0.01, year - 1); // 1.0% dégradation batterie / an
    const energyInflationFactor = Math.pow(1 + 0.05, year - 1); // 5.0% inflation énergie / an
    const opexInflationFactor = Math.pow(1 + 0.02, year - 1); // 2.0% inflation OPEX / an

    // Les économies sur facture bénéficient de l'inflation de l'énergie compensée par la dégradation
    const yearBillSavings = annualBillSavings * degradationFactor * energyInflationFactor;
    // Les revenus réseau s'évaluent avec dégradation et indexation modérée
    const yearGridRevenues = gridAnnualRevenues * degradationFactor * Math.pow(1 + 0.02, year - 1);
    const yearOpex = annualOpexHt * opexInflationFactor;

    const netYearCash = Math.round(yearBillSavings + yearGridRevenues - yearOpex);
    cashFlowSeries.push(netYearCash);
    runningCumul += netYearCash;
    cumulativeCashFlow.push(runningCumul);
  }

  // TRI (Taux de Rentabilité Interne) sur 12 ans
  const irrPercent = calculateIrr(cashFlowSeries, 0.08);
  const safeIrr = isNaN(irrPercent) || irrPercent <= 0 ? 0 : Math.round(irrPercent * 10) / 10;

  // Temps de retour sur investissement (Payback en années à 1 décimale)
  const paybackYears = calculateProjectPayback(totalCapexHt, cashFlowSeries.slice(1));
  const safePayback = (paybackYears > 0 && paybackYears < 20) ? Math.round(paybackYears * 10) / 10 : (totalCapexHt / Math.max(1, annualEbitdaHt)).toFixed(1);

  // Gain net cumulé sur 12 ans (Total cash encaissé - CAPEX initial)
  const netGain12YearsHt = cumulativeCashFlow[12];

  // ─── 5. GÉNÉRATION DES DONNÉES DU GRAPHIQUE 1 : COURBE JOURNALIÈRE 24H AVANT / APRÈS ───
  const dailyProfileChartData = generateDailyProfileComparison({
    consoJourMoyKwh: cJour,
    peakKw: pPeak,
    batteryPowerKw: totalPowerKw,
    batteryCapacityKwh: totalCapacityKwh,
    peakShavedKw
  });

  // ─── 6. GÉNÉRATION DES DONNÉES DU GRAPHIQUE 2 : TRÉSORERIE CUMULÉE SUR 12 ANS ───
  const cumulativeCashFlowChartData = [];
  let cumulWithoutGrid = - (hardwareCapex + installCapex);
  let cumulWithGrid = - totalCapexHt;

  for (let y = 0; y <= 12; y++) {
    if (y === 0) {
      cumulativeCashFlowChartData.push({
        yearLabel: 'An 0',
        yearNum: 0,
        autonomieSeule: cumulWithoutGrid,
        avecRaccordement: includeGridConnection ? cumulWithGrid : null,
        breakEvenZero: 0
      });
    } else {
      const degradationFactor = Math.pow(1 - 0.01, y - 1);
      const energyInflationFactor = Math.pow(1 + 0.05, y - 1);
      const opexInflationFactor = Math.pow(1 + 0.02, y - 1);

      const billSav = annualBillSavings * degradationFactor * energyInflationFactor;
      const opex = annualOpexHt * opexInflationFactor;
      const gridRev = gridAnnualRevenues * degradationFactor * Math.pow(1 + 0.02, y - 1);

      cumulWithoutGrid += Math.round(billSav - opex);
      cumulWithGrid += Math.round(billSav + gridRev - opex);

      cumulativeCashFlowChartData.push({
        yearLabel: `An ${y}`,
        yearNum: y,
        autonomieSeule: cumulWithoutGrid,
        avecRaccordement: includeGridConnection ? cumulWithGrid : null,
        breakEvenZero: 0
      });
    }
  }

  return {
    model,
    quantity: qte,
    pricingMode,
    totalCapacityKwh,
    totalPowerKw,
    hardwareCapex,
    installCapex,
    connectionCapex,
    totalCapexHt,
    annualBillSavings,
    arbitrageSavingsYear,
    peakShavingSavingsYear,
    peakShavedKw,
    newPeakKw,
    baseAutonomyPercent,
    totalAutonomyPercent,
    includeGridConnection,
    gridFeasibility,
    gridAnnualRevenues,
    annualOpexHt,
    annualEbitdaHt,
    safePayback: Number(safePayback),
    safeIrr,
    netGain12YearsHt,
    dailyProfileChartData,
    cumulativeCashFlowChartData
  };
}

/**
 * Génère le profil 24h comparatif avant vs après batterie SAFRA (48 points pas 30 min)
 */
function generateDailyProfileComparison({
  consoJourMoyKwh = 578.6,
  peakKw = 90.0,
  batteryPowerKw = 232.0,
  batteryCapacityKwh = 261.0,
  peakShavedKw = 40.0
}) {
  const points = [];
  const baselineBaseKw = Math.max(8, (consoJourMoyKwh / 24) * 0.45); // Talon de nuit

  // Distribution de charge typique d'une exploitation/PME :
  // 00h-06h : talon faible (15-20 kW) -> recharge batterie en HC
  // 07h-11h : montée en charge
  // 11h-15h : grosse pointe de puissance (90 kW) -> décharge batterie pour écrêter
  // 17h-21h : deuxième plateau d'activité
  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    let profileFactor = 0.25; // Nuit
    if (hour >= 6 && hour < 9) profileFactor = 0.65;
    else if (hour >= 9 && hour < 12) profileFactor = 0.90;
    else if (hour >= 12 && hour < 15) profileFactor = 1.00; // Pic
    else if (hour >= 15 && hour < 18) profileFactor = 0.80;
    else if (hour >= 18 && hour < 21) profileFactor = 0.60;
    else if (hour >= 21) profileFactor = 0.35;

    // Profil sans batterie (kW)
    const rawDemandKw = baselineBaseKw + (peakKw - baselineBaseKw) * profileFactor;
    const demandKw = Math.round(rawDemandKw * 10) / 10;

    let netGridKw = demandKw;
    let batteryAction = 0; // > 0 = charge, < 0 = décharge

    // Période Heures Creuses (01:00 à 05:30) : Recharge douce de la batterie
    if (hour >= 1 && hour <= 5) {
      const chargeRateKw = Math.min(batteryPowerKw * 0.25, 35);
      batteryAction = chargeRateKw;
      netGridKw = demandKw + chargeRateKw;
    }

    // Période de pointe (11:00 à 15:30) : Écrêtage franc de puissance
    if (demandKw > (peakKw - peakShavedKw)) {
      const dischargeKw = Math.min(demandKw - (peakKw - peakShavedKw), batteryPowerKw);
      batteryAction = -dischargeKw;
      netGridKw = Math.max(15, demandKw - dischargeKw);
    }

    points.push({
      time: timeLabel,
      consoAvant: demandKw,
      consoApres: Math.round(netGridKw * 10) / 10,
      seuilPointeApres: Math.round((peakKw - peakShavedKw) * 10) / 10,
      rechargeHC: batteryAction > 0 ? batteryAction : null,
      ecretageDecharge: batteryAction < 0 ? Math.abs(batteryAction) : null
    });
  }

  return points;
}
