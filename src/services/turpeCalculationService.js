/**
 * MOTEUR DE CALCUL TURPE 7 BESS (CRE 2025-78, 2026-105 & 2025-227)
 * 
 * Calcule l'intégralité des composantes réglementaires du TURPE 7 :
 * 1. CG  : Composante de Gestion (€/an)
 * 2. CC  : Composante de Comptage (€/an)
 * 3. CS  : Composante de Soutirage :
 *          - Part Fixe Puissance (k_p * P_soutirée)
 *          - Part Variable Énergie horosaisonnalisée (5 postes : P, HPH, HCH, HPB, HCB)
 * 4. CI  : Composante d'Injection (€/an - 0 €/MWh en HTA)
 * 5. Option Spécifique Stockage : Application du dispositif CRE de neutralisation de la double
 *    tarification sur l'énergie réinjectée (hors pertes de rendement round-trip).
 * 
 * Traçabilité intégrale et niveaux de certitude normalisés (1 à 4).
 */

import {
  TURPE7_TARIFF_GRIDS,
  BESS_STORAGE_REGIME,
  CALENDRIER_HOROSAISONNIER,
  CERTITUDE_LEVELS,
  TURPE7_SOURCES
} from '../data/turpe/turpe7Tarifs.js';

/**
 * Génère le profil énergétique annuel de recharge par poste horosaisonnier
 * à partir de la capacité effective, du nombre de cycles par jour et de la clé de répartition.
 */
export function generateAnnualRechargeProfileMwh({
  capaciteEffectiveKwh = 1044,
  nbCyclesJour = 1.0,
  repartitionOverride = null
}) {
  const annualEnergyMwh = (capaciteEffectiveKwh * nbCyclesJour * 365) / 1000;
  const repartition = repartitionOverride || CALENDRIER_HOROSAISONNIER.repartitionRechargeDefaut;

  return {
    totalMwh: Math.round(annualEnergyMwh * 10) / 10,
    byPosteMwh: {
      P: Math.round(annualEnergyMwh * (repartition.P || 0) * 10) / 10,
      HPH: Math.round(annualEnergyMwh * (repartition.HPH || 0) * 10) / 10,
      HCH: Math.round(annualEnergyMwh * (repartition.HCH || 0) * 10) / 10,
      HPB: Math.round(annualEnergyMwh * (repartition.HPB || 0) * 10) / 10,
      HCB: Math.round(annualEnergyMwh * (repartition.HCB || 0) * 10) / 10
    }
  };
}

/**
 * Calcul complet des composantes TURPE 7 pour une année donnée
 */
export function calculateTurpe7Details({
  tensionDomain = 'HTA1',
  tarifOption = 'CU',
  pSouscriteSoutirageKw = 500,
  pSouscriteInjectionKw = 500,
  rechargeProfileMwh = null,
  capaciteStockageKwh = 1044,
  nbCyclesJour = 1.0,
  rendementRoundTrip = 88, // %
  useStorageOption = true,
  storageZone = 'ZONE_STANDARD',
  inflationFactor = 1.0
}) {
  // Récupération de la grille réglementaire
  const grid = TURPE7_TARIFF_GRIDS[tensionDomain] || TURPE7_TARIFF_GRIDS.HTA1;
  const option = grid.options[tarifOption] || grid.options.CU || Object.values(grid.options)[0];

  const pSoutirage = Number(pSouscriteSoutirageKw) || 500;
  const pInjection = Number(pSouscriteInjectionKw) || 500;
  const rRoundTrip = (Number(rendementRoundTrip) || 88) / 100;
  const infl = Number(inflationFactor) || 1.0;

  // Profil de recharge (MWh/an)
  const profile = rechargeProfileMwh || generateAnnualRechargeProfileMwh({
    capaciteEffectiveKwh: Number(capaciteStockageKwh) || 1044,
    nbCyclesJour: Number(nbCyclesJour) || 1.0
  });

  // 1. Composante de Gestion (CG)
  const cgBrut = grid.cg;
  const cgAnnuel = Math.round(cgBrut * infl * 100) / 100;

  // 2. Composante de Comptage (CC)
  const ccBrut = grid.cc;
  const ccAnnuel = Math.round(ccBrut * infl * 100) / 100;

  // 3. Composante de Soutirage - Part Fixe (Puissance souscrite)
  const kp = option.kp_soutirage;
  const csFixeAnnuel = Math.round(kp * pSoutirage * infl * 100) / 100;

  // 4. Composante de Soutirage - Part Variable Horosaisonnière (Énergie soutirée)
  const energyDetails = {};
  let csVariableBrute = 0;

  ['P', 'HPH', 'HCH', 'HPB', 'HCB'].forEach(poste => {
    const volumeMwh = profile.byPosteMwh[poste] || 0;
    const rateEurPerKwh = option.energyTariffs[poste] || 0;
    const volumeKwh = volumeMwh * 1000;
    const costEur = volumeKwh * rateEurPerKwh * infl;

    energyDetails[poste] = {
      volumeMwh,
      rateEurPerKwh: rateEurPerKwh * infl,
      rateStandardEurPerKwh: rateEurPerKwh,
      costEur: Math.round(costEur * 100) / 100
    };

    csVariableBrute += costEur;
  });

  csVariableBrute = Math.round(csVariableBrute * 100) / 100;

  // 5. Régime Spécifique Stockage CRE (Délibération 2025-227)
  let abattementStockageEur = 0;
  let abattementMultiplier = 1.0;
  let zoneInfo = BESS_STORAGE_REGIME.zones[storageZone] || BESS_STORAGE_REGIME.zones.ZONE_STANDARD;

  if (useStorageOption) {
    abattementMultiplier = zoneInfo.abattementMultiplier || 1.0;
    // L'abattement s'applique sur l'énergie réinjectée après stockage (E_inj = E_soutirée * rendement)
    // Les pertes résiduelles (1 - rendement) restent facturées à l'acheminement standard
    const baseEligible = csVariableBrute * rRoundTrip;
    abattementStockageEur = Math.round(baseEligible * (BESS_STORAGE_REGIME.abattementCsVariablePct / 100) * abattementMultiplier * 100) / 100;
  }

  const csVariableNette = Math.max(0, Math.round((csVariableBrute - abattementStockageEur) * 100) / 100);

  // 6. Composante d'Injection (CI)
  const ciFixed = (grid.ci.fixedPerKw || 0) * pInjection * infl;
  const ciEnergyInjectedMwh = profile.totalMwh * rRoundTrip;
  const ciVariable = (grid.ci.variablePerMwh || 0) * ciEnergyInjectedMwh * infl;
  const ciTotal = Math.round((ciFixed + ciVariable) * 100) / 100;

  // TOTAL TURPE 7
  const totalTurpe7 = Math.round((cgAnnuel + ccAnnuel + csFixeAnnuel + csVariableNette + ciTotal) * 100) / 100;

  // Équivalent coût au MWh soutiré
  const coutMoyenParMwhSoutire = profile.totalMwh > 0 
    ? Math.round((totalTurpe7 / profile.totalMwh) * 100) / 100 
    : 0;

  // Comparaison avec l'ancien forfait (18 €/kW/an)
  const forfaitAncien18 = Math.round(18 * pSoutirage * infl * 100) / 100;
  const diffVsAncienEur = totalTurpe7 - forfaitAncien18;
  const diffVsAncienPct = forfaitAncien18 > 0 ? Math.round((diffVsAncienEur / forfaitAncien18) * 1000) / 10 : 0;

  return {
    tensionDomain,
    domainLabel: grid.label,
    tarifOption,
    optionLabel: option.label,
    voltageKv: grid.voltageKv,
    useStorageOption,
    storageZone,
    storageZoneLabel: zoneInfo.label,

    // Valeurs globales
    totalTurpe7,
    coutMoyenParMwhSoutire,
    forfaitAncien18,
    diffVsAncienEur,
    diffVsAncienPct,

    // Décomposition détaillée
    composantes: {
      cg: {
        code: 'CG',
        label: 'Composante de Gestion',
        montantEur: cgAnnuel,
        baseAnnuelleEur: grid.cg,
        certitude: CERTITUDE_LEVELS[1],
        source: TURPE7_SOURCES.CRE_2026_105
      },
      cc: {
        code: 'CC',
        label: 'Composante de Comptage (4 quadrants)',
        montantEur: ccAnnuel,
        baseAnnuelleEur: grid.cc,
        certitude: CERTITUDE_LEVELS[1],
        source: TURPE7_SOURCES.CRE_2026_105
      },
      csFixe: {
        code: 'CS_FIXE',
        label: `Part Fixe Puissance (${kp} €/kW/an sur ${pSoutirage} kW)`,
        montantEur: csFixeAnnuel,
        kp,
        puissanceSouscriteKw: pSoutirage,
        certitude: CERTITUDE_LEVELS[1],
        source: TURPE7_SOURCES.CRE_2026_105
      },
      csVariableBrute: {
        code: 'CS_VAR_BRUTE',
        label: 'Part Variable Énergie (Horosaisonnière brute)',
        montantEur: csVariableBrute,
        detailsByPoste: energyDetails,
        certitude: CERTITUDE_LEVELS[1],
        source: TURPE7_SOURCES.CRE_2026_105
      },
      abattementStockage: {
        code: 'ABATTEMENT_STOCKAGE',
        label: 'Dispositif Neutralité Stockage CRE (2025-227)',
        montantEur: abattementStockageEur,
        active: useStorageOption,
        efficiencyFactor: rRoundTrip,
        zoneMultiplier: abattementMultiplier,
        certitude: CERTITUDE_LEVELS[1],
        source: TURPE7_SOURCES.CRE_2025_227_STOCKAGE
      },
      csVariableNette: {
        code: 'CS_VAR_NETTE',
        label: 'Part Variable Énergie Nette (après neutralité stockage)',
        montantEur: csVariableNette,
        certitude: CERTITUDE_LEVELS[1]
      },
      ci: {
        code: 'CI',
        label: 'Composante d\'Injection (Exonération HTA)',
        montantEur: ciTotal,
        certitude: CERTITUDE_LEVELS[1],
        source: TURPE7_SOURCES.CRE_2026_105
      }
    },

    // Volumes d'énergie
    profile: {
      totalSoutireMwh: profile.totalMwh,
      totalReinjecteMwh: Math.round(ciEnergyInjectedMwh * 10) / 10,
      pertesRendementMwh: Math.round((profile.totalMwh - ciEnergyInjectedMwh) * 10) / 10
    }
  };
}

/**
 * Analyse de sensibilité TURPE 7 (+/- 10%, +/- 20%, +/- 30%)
 * Calcule l'impact direct d'une variation du tarif de réseau sur l'OPEX, l'EBITDA et les métriques de rentabilité.
 */
export function computeTurpeSensitivityMatrix({
  baseTurpeAnnuel,
  baseEbitdaAnnuel,
  baseCapexTotal,
  variationPercentages = [-30, -20, -10, 0, 10, 20, 30]
}) {
  const turpeBase = Number(baseTurpeAnnuel) || 0;
  const ebitdaBase = Number(baseEbitdaAnnuel) || 0;
  const capex = Number(baseCapexTotal) || 1;

  return variationPercentages.map(deltaPct => {
    const deltaMultiplier = 1 + (deltaPct / 100);
    const simulatedTurpe = Math.round(turpeBase * deltaMultiplier);
    const deltaTurpe = simulatedTurpe - turpeBase;
    const simulatedEbitda = ebitdaBase - deltaTurpe; // Si TURPE augmente, EBITDA baisse
    const deltaEbitdaPct = ebitdaBase !== 0 ? Math.round(((simulatedEbitda - ebitdaBase) / Math.abs(ebitdaBase)) * 1000) / 10 : 0;
    
    // Estimation approximative du TRI Projet
    const estimatedTri = capex > 0 && simulatedEbitda > 0 
      ? Math.round(((simulatedEbitda * 0.85) / capex) * 1000) / 10 
      : 0;

    return {
      variationPct: deltaPct,
      label: deltaPct > 0 ? `+${deltaPct}%` : deltaPct === 0 ? 'Référence TURPE 7' : `${deltaPct}%`,
      turpeEur: simulatedTurpe,
      deltaTurpeEur: deltaTurpe,
      ebitdaEur: simulatedEbitda,
      deltaEbitdaPct,
      estimatedTri
    };
  });
}
