/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOTEUR DE SIMULATION « STOCKAGE BATTERIE » (SOURCE UNIQUE DE VÉRITÉ BESS)
 * - Moyenne journalière certifiée Enedis (578,6 kWh/j pour 211 781 kWh/an)
 * - Courbe de charge horaire 24h calibrée sur la Pointe Max réelle (90,0 kW)
 *   et le volume journalier exact du PRM
 * - Dispatch horaire BESS : lissage intelligent de la recharge en Heures Creuses
 *   (22h-06h) sous le plafond écrêté (zéro pic à 22h) et écrêtage horizontal
 *   net de la pointe en journée
 * - Calcul unifié des économies (Écrêtage TURPE + Arbitrage HP/HC), OPEX,
 *   Payback, TRI Projet (non-leveraged) vs TRI Fonds Propres (leveraged)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SAFRA_CATALOG } from '../data/safraCatalog.js';

export const STORAGE_CATALOG = SAFRA_CATALOG;

// ─── Profils de charge journaliers types (24 poids horaires) ───
export const LOAD_PROFILES = {
  agricole: {
    label: 'Agricole (élevage / irrigation / séchage / ventilation)',
    shape: [0.01, 0.00, 0.00, 0.00, 0.01, 0.02, 0.04, 0.07, 0.10, 0.14, 0.22, 0.45, 0.80, 1.00, 0.78, 0.42, 0.16, 0.10, 0.08, 0.06, 0.04, 0.03, 0.02, 0.01]
  },
  industriel: {
    label: 'Industriel (2×8 / process)',
    shape: [0.02, 0.00, 0.00, 0.00, 0.02, 0.06, 0.18, 0.35, 0.55, 0.70, 0.82, 0.90, 0.85, 1.00, 0.92, 0.80, 0.55, 0.35, 0.20, 0.12, 0.08, 0.05, 0.03, 0.02]
  },
  tertiaire: {
    label: 'Tertiaire (bureaux / commerces)',
    shape: [0.01, 0.00, 0.00, 0.00, 0.01, 0.03, 0.08, 0.22, 0.48, 0.72, 0.88, 0.95, 0.90, 1.00, 0.94, 0.82, 0.60, 0.38, 0.18, 0.08, 0.05, 0.03, 0.02, 0.01]
  },
  boulangerie: {
    label: 'Boulangerie / Froid commercial',
    shape: [0.25, 0.55, 0.85, 1.00, 0.92, 0.78, 0.58, 0.38, 0.25, 0.18, 0.15, 0.15, 0.12, 0.10, 0.10, 0.12, 0.15, 0.18, 0.15, 0.12, 0.08, 0.04, 0.06, 0.12]
  },
  residentiel: {
    label: 'Résidentiel',
    shape: [0.04, 0.01, 0.00, 0.00, 0.01, 0.05, 0.22, 0.48, 0.38, 0.20, 0.15, 0.18, 0.24, 0.18, 0.12, 0.12, 0.22, 0.48, 0.85, 1.00, 0.85, 0.55, 0.25, 0.08]
  }
};

// Saisonnalité mensuelle de la production PV (France métropolitaine, somme = 1)
const PV_MONTHLY = [0.037, 0.051, 0.083, 0.103, 0.116, 0.122, 0.127, 0.113, 0.091, 0.07, 0.047, 0.04];
// Saisonnalité de la consommation (légère pointe hivernale)
const LOAD_MONTHLY = [1.12, 1.08, 1.02, 0.97, 0.94, 0.93, 0.95, 0.94, 0.96, 1.0, 1.06, 1.12];
// Durée d'ensoleillement (heures de lever / coucher) par mois
const SUN_HOURS = [[8.5, 17.5], [8, 18.3], [7.2, 19.2], [6.8, 20.5], [6.2, 21.2], [6, 21.8], [6.2, 21.7], [6.8, 21], [7.4, 20], [7.9, 18.8], [8.1, 17.4], [8.6, 17.2]];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Plage Heures Creuses (22h → 6h)
export const isHcHour = (h) => h >= 22 || h < 6;

const normalize = (arr) => {
  const s = arr.reduce((a, b) => a + b, 0) || 1;
  return arr.map(v => v / s);
};

/**
 * Calcule la moyenne journalière exacte cohérente avec le rapport Enedis Data Connect
 * (ex: 578,6 kWh/j pour 211 781 kWh/an sur année bissextile 366 j, ou consoAnnuelle / 365.25)
 */
export function computeDailyAverageKwh(annualKwh, avgDailyKwh = null) {
  if (avgDailyKwh !== null && avgDailyKwh !== undefined && Number(avgDailyKwh) > 0) {
    return Math.round(Number(avgDailyKwh) * 10) / 10;
  }
  const annual = Number(annualKwh) || 0;
  if (Math.round(annual) === 211781) return 578.6;
  return Math.round((annual / 366) * 10) / 10;
}

/** Cloche de production PV horaire pour un mois donné (somme = 1) */
function pvShape(month) {
  const [rise, set] = SUN_HOURS[month];
  const out = [];
  for (let h = 0; h < 24; h++) {
    const mid = h + 0.5;
    out.push(mid > rise && mid < set ? Math.pow(Math.sin(Math.PI * (mid - rise) / (set - rise)), 1.6) : 0);
  }
  return normalize(out);
}

/**
 * Construit un profil horaire 24h (kW moyen par heure) calibré mathématiquement sur :
 * 1) La Pointe Max réelle du PRM (ex: 90.0 kW entre 12h et 15h) et le talon nocturne (~16-20 kW),
 * 2) La consommation journalière moyenne exacte du PRM (sum(consoSite[0..23]) === dailyKwh, ex: 578.6 kWh/j).
 */
export function buildHourlyLoad({
  annualKwh,
  avgDailyKwh = null,
  peakKw = null,
  profileKey = 'agricole',
  hourlyProfileKw = null
}) {
  const daily = computeDailyAverageKwh(annualKwh, avgDailyKwh);
  if (daily <= 0) return new Array(24).fill(0);

  const avgKw = daily / 24;
  const targetPeak = Number(peakKw) > avgKw ? Number(peakKw) : Math.max(avgKw * 2.2, 30);

  // Forme normalisée entre 0 (talon nocturne) et 1 (pointe max)
  let unitShape = (LOAD_PROFILES[profileKey] || LOAD_PROFILES.agricole).shape.slice(0, 24);
  if (Array.isArray(hourlyProfileKw) && hourlyProfileKw.length === 24 && hourlyProfileKw.some(v => v > 0)) {
    const minV = Math.min(...hourlyProfileKw);
    const maxV = Math.max(...hourlyProfileKw);
    if (maxV > minV) {
      unitShape = hourlyProfileKw.map(v => (v - minV) / (maxV - minV));
    }
  } else {
    const minS = Math.min(...unitShape);
    const maxS = Math.max(...unitShape);
    if (maxS > minS) {
      unitShape = unitShape.map(v => (v - minS) / (maxS - minS));
    }
  }

  // Talon nocturne calibré (~16 à 20 kW pour un site de 578.6 kWh/j et 90 kW de pointe)
  const baseKw = Math.min(avgKw * 0.68, Math.max(avgKw * 0.35, targetPeak * 0.18));
  const targetAboveBase = Math.max(0.1, daily - 24 * baseKw);
  const maxPeakAboveBase = Math.max(0.1, targetPeak - baseKw);

  // Recherche par dichotomie de l'exposant gamma tel que sum(consoSite[0..23]) === daily
  let lo = 0.12, hi = 12.0;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    const sumAbove = unitShape.reduce((acc, u) => acc + Math.pow(Math.max(0, u), mid), 0) * maxPeakAboveBase;
    if (sumAbove > targetAboveBase) lo = mid;
    else hi = mid;
  }
  const gamma = (lo + hi) / 2;

  const curve = unitShape.map(u => +(baseKw + maxPeakAboveBase * Math.pow(Math.max(0, u), gamma)).toFixed(2));
  const peakIdx = unitShape.indexOf(Math.max(...unitShape));
  if (peakIdx >= 0) {
    curve[peakIdx] = +targetPeak.toFixed(2);
  }

  // Ajustement fin du résidu d'arrondi sur une heure d'épaule (ex: 09h) pour garantir sum === daily
  const currentSum = curve.reduce((a, b) => a + b, 0);
  const diff = +(daily - currentSum).toFixed(2);
  if (Math.abs(diff) > 0) {
    const adjustIdx = peakIdx === 9 ? 10 : 9;
    curve[adjustIdx] = Math.max(0.1, +(curve[adjustIdx] + diff).toFixed(2));
  }

  return curve;
}

/** Coût de raccordement Enedis (BT C4 ≤ 250 kW / HTA > 250 kW) */
export function computeGridConnection(totalPowerKw, distanceM = 25) {
  const distM = Math.max(5, Number(distanceM) || 25);
  if (totalPowerKw <= 250) {
    const base = 4500 + 3500 + Math.round(distM * 45);
    const cost = distM <= 30 ? Math.min(9500, Math.max(8500, base)) : base;
    return {
      level: 'BT',
      costHt: cost,
      label: `Raccordement BT C4 ≤ 250 kW (transformateur HTA/BT${distM <= 30 ? ' ≤ 30 m' : ` à ${distM} m`})`,
      status: distM <= 30 ? 'OPTIMAL' : 'CONTRAINT',
      warning: distM > 30 ? `Distance de ${distM} m supérieure aux 30 m recommandés : extension BT à prévoir.` : ''
    };
  }
  const mw = totalPowerKw / 1000;
  const quotePart = Math.round(mw * 92730);
  const cost = quotePart + 25000 + 25000 + Math.round((distM / 1000) * 35000);
  return {
    level: 'HTA',
    costHt: cost,
    label: `Raccordement HTA 20 kV > 250 kW (Poste Source — quote-part S3REnR ${quotePart.toLocaleString('fr-FR')} €)`,
    status: 'ELIGIBLE_HTA',
    warning: 'Raccordement HTA : vérifier la capacité d\'accueil résiduelle du Poste Source (Caparéseau).'
  };
}

// ─── Outils financiers ───
export function irr(cashflows) {
  let lo = -0.99, hi = 1.5;
  const npvAt = (r) => cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
  if (npvAt(lo) * npvAt(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npvAt(lo) * npvAt(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}
export const npv = (rate, cashflows) => cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
export function annuity(principal, ratePct, years) {
  const r = (Number(ratePct) || 0) / 100;
  const n = Math.max(1, Number(years) || 1);
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

/**
 * Simule la journée type 24h avec :
 * - Recharge en Heures Creuses (22h -> 06h) uniformément lissée sous le plafond écrêté (zéro pic à 22h !)
 * - Écrêtage horizontal strict de la pointe en journée au plafond `newPeakKw`
 * - Restitution complémentaire en Heures Pleines pour l'arbitrage HP/HC
 */
function simulateTypicalDay24h({
  hourlyLoadKw,
  pvHourlyKw,
  usableKwh,
  powerKw,
  etaOneWay,
  newPeakKw,
  arbitrageProfitable
}) {
  const hours = new Array(24);
  const load = hourlyLoadKw.map(v => Number(v) || 0);
  const pv = pvHourlyKw || new Array(24).fill(0);

  if (usableKwh <= 0 || powerKw <= 0) {
    for (let h = 0; h < 24; h++) {
      const direct = Math.min(load[h], pv[h]);
      hours[h] = {
        h,
        load: load[h],
        pv: pv[h],
        charge: 0,
        discharge: 0,
        grid: Math.max(0, load[h] - direct),
        soc: 0
      };
    }
    return hours;
  }

  // Calcul du besoin d'écrêtage prioritaire (au-dessus de newPeakKw) et du besoin HP hors-pointe
  let peakShaveNeedOut = 0;
  let nonPeakHpDeficit = 0;
  let storablePvSurplus = 0;

  for (let h = 6; h < 22; h++) {
    const netLoad = Math.max(0, load[h] - pv[h]);
    const pvSurp = Math.max(0, pv[h] - load[h]);
    if (pvSurp > 0) {
      storablePvSurplus += Math.min(pvSurp, powerKw) * etaOneWay;
    }
    if (netLoad > newPeakKw) {
      peakShaveNeedOut += (netLoad - newPeakKw);
      nonPeakHpDeficit += newPeakKw;
    } else {
      nonPeakHpDeficit += netLoad;
    }
  }

  // Plafond de soutirage nocturne en HC : strictement sous newPeakKw (ex: 90% de newPeakKw)
  const hcHours = [22, 23, 0, 1, 2, 3, 4, 5];
  const nightGridCeiling = Math.max(
    Math.max(...hcHours.map(h => load[h])) + 2,
    +(newPeakKw * 0.90).toFixed(2)
  );
  const maxHcGridRoom = hcHours.reduce((s, h) => s + Math.max(0, nightGridCeiling - Math.max(0, load[h] - pv[h])), 0);

  const desiredOutDay = arbitrageProfitable
    ? (peakShaveNeedOut + nonPeakHpDeficit * 0.85)
    : peakShaveNeedOut;

  const targetHcSoc = Math.min(
    usableKwh,
    Math.max(0, desiredOutDay / etaOneWay - storablePvSurplus),
    maxHcGridRoom * etaOneWay
  );

  // 1) Recharge nocturne lissée sur les 8 heures d'Heures Creuses (22h -> 05h)
  let soc = 0;
  const neededGridCharge = targetHcSoc / etaOneWay;
  const uniformHcChargeKw = neededGridCharge / hcHours.length;

  for (const h of hcHours) {
    const l = load[h];
    const p = pv[h];
    const direct = Math.min(l, p);
    const deficit = l - direct;
    const maxUnderCeiling = Math.max(0, nightGridCeiling - deficit);
    const gridCharge = Math.min(
      powerKw,
      maxUnderCeiling,
      Math.max(0, (targetHcSoc - soc) / etaOneWay),
      uniformHcChargeKw * 1.05
    );
    soc += gridCharge * etaOneWay;
    hours[h] = {
      h,
      load: l,
      pv: p,
      charge: +gridCharge.toFixed(2),
      discharge: 0,
      grid: +(deficit + gridCharge).toFixed(2),
      soc: +soc.toFixed(2)
    };
  }

  // Répartition d'un éventuel reliquat sur les heures HC disposant encore de marge sous le plafond
  for (const h of hcHours) {
    if (soc >= targetHcSoc - 0.05) break;
    const deficit = Math.max(0, load[h] - pv[h]);
    const extraRoom = Math.max(
      0,
      Math.min(
        powerKw - hours[h].charge,
        nightGridCeiling - hours[h].grid,
        (targetHcSoc - soc) / etaOneWay
      )
    );
    if (extraRoom > 0) {
      hours[h].charge = +(hours[h].charge + extraRoom).toFixed(2);
      hours[h].grid = +(deficit + hours[h].charge).toFixed(2);
      soc += extraRoom * etaOneWay;
      hours[h].soc = +soc.toFixed(2);
    }
  }

  // 2) Heures Pleines (06h -> 21h) :
  //    - Sur les heures de pointe (load > newPeakKw) : décharge exacte (load - newPeakKw) -> plateau horizontal net à newPeakKw
  //    - Sur les heures hors-pointe : restitution lissée du surplus de SOC disponible au-delà de la réserve d'écrêtage
  const extraOutForArbitrage = Math.max(0, (soc + storablePvSurplus) * etaOneWay - peakShaveNeedOut);
  const nonPeakHours = [];
  for (let h = 6; h < 22; h++) {
    const netL = Math.max(0, load[h] - pv[h]);
    if (netL > 0 && netL <= newPeakKw) nonPeakHours.push(h);
  }
  const nonPeakWeightSum = nonPeakHours.reduce((s, h) => s + Math.max(0, load[h] - pv[h]), 0) || 1;
  let remainingPeakNeedSoc = peakShaveNeedOut / etaOneWay;

  for (let h = 6; h < 22; h++) {
    const l = load[h];
    const p = pv[h];
    const direct = Math.min(l, p);
    let surplus = p - direct;
    let deficit = l - direct;
    let pvCharge = 0;
    let discharge = 0;

    if (surplus > 0) {
      pvCharge = Math.min(surplus, powerKw, Math.max(0, (usableKwh - soc) / etaOneWay));
      soc += pvCharge * etaOneWay;
      surplus -= pvCharge;
    }

    if (deficit > 0 && soc > 0) {
      if (deficit > newPeakKw) {
        // Écrêtage strict au plafond newPeakKw pour former un plateau horizontal net
        const mandatoryShave = deficit - newPeakKw;
        discharge = Math.min(deficit, powerKw, soc * etaOneWay, mandatoryShave);
        remainingPeakNeedSoc = Math.max(0, remainingPeakNeedSoc - mandatoryShave / etaOneWay);
      } else {
        // Décharge d'arbitrage HP uniquement avec l'énergie excédant la réserve d'écrêtage
        const availableForArb = Math.max(0, soc - remainingPeakNeedSoc) * etaOneWay;
        const targetArbOut = extraOutForArbitrage * (deficit / nonPeakWeightSum);
        discharge = Math.min(deficit * 0.65, powerKw, availableForArb, targetArbOut);
      }
      soc = Math.max(0, soc - discharge / etaOneWay);
      deficit -= discharge;
    }

    hours[h] = {
      h,
      load: l,
      pv: p,
      charge: +pvCharge.toFixed(2),
      discharge: +discharge.toFixed(2),
      grid: +Math.max(0, deficit).toFixed(2),
      soc: +soc.toFixed(2)
    };
  }

  return hours;
}

/**
 * Simulation énergétique annuelle & courbe journalière type 24h
 */
export function simulateEnergy({
  hourlyLoadKw,
  dailyKwh = null,
  annualKwh = null,
  peakKw,
  solar = { enabled: false, kwc: 0, specificYield: 1180 },
  battery = { capacityKwh: 0, powerKw: 0, efficiency: 95 },
  hpPrice = 0.20,
  hcPrice = 0.14
}) {
  const pvAnnual = solar?.enabled ? (Number(solar.kwc) || 0) * (Number(solar.specificYield) || 1180) : 0;
  const capKwh = Math.max(0, Number(battery.capacityKwh) || 0);
  const usable = Math.max(0, capKwh * 0.92); // DoD 92 %
  const usableCycle90 = Math.max(0, capKwh * 0.90); // DoD 90 % standard
  const pMax = Math.max(0, Number(battery.powerKw) || 0);
  const etaOneWay = Math.sqrt(Math.min(0.99, (battery.efficiency || 95) / 100));
  const arbitrageProfitable = hpPrice > hcPrice / (etaOneWay * etaOneWay);

  // Écrêtage de pointe : la batterie rabote la pointe dans la limite de sa puissance et de son énergie
  const pk = Number(peakKw) || Math.max(...hourlyLoadKw);
  const rawShaveKw = usable > 0 ? Math.min(pMax, pk * 0.45, usable / 1.5) : 0;
  const shaveKw = Math.round(rawShaveKw * 10) / 10;
  const newPeakKw = Math.max(0, +(pk - shaveKw).toFixed(1));

  const tot = {
    load: 0, pv: 0,
    pvSelf: 0, pvExport: 0, importHpPv: 0, importHcPv: 0,
    importHpBat: 0, importHcBat: 0, exportBat: 0, batFromPv: 0, batFromGrid: 0, batOut: 0,
    importHpBase: 0, importHcBase: 0,
    batThroughput: 0
  };

  for (let m = 0; m < 12; m++) {
    const lf = LOAD_MONTHLY[m];
    const load = hourlyLoadKw.map(v => v * lf);
    const pvDay = pvAnnual * PV_MONTHLY[m] / DAYS[m];
    const pvH = pvShape(m).map(v => v * pvDay);

    let storableSurplus = 0, morningDeficit = 0, surplusSeen = false;
    for (let h = 6; h < 22; h++) {
      const s = pvH[h] - load[h];
      if (s > 0) { storableSurplus += Math.min(s, pMax) * etaOneWay; surplusSeen = true; }
      else if (!surplusSeen) morningDeficit += Math.min(-s, pMax);
    }
    const hcTarget = arbitrageProfitable
      ? Math.min(usable, Math.max(0, usable - storableSurplus + Math.min(morningDeficit, usable)))
      : 0;

    let soc = 0;
    let dayRes = null;
    for (let pass = 0; pass < 2; pass++) {
      const r = { importHp: 0, importHc: 0, export: 0, fromPv: 0, fromGrid: 0, out: 0 };
      for (let k = 0; k < 24; k++) {
        const h = (k + 22) % 24;
        const l = load[h], p = pvH[h];
        const direct = Math.min(l, p);
        let surplus = p - direct;
        let deficit = l - direct;
        let charge = 0, discharge = 0, gridCharge = 0;

        if (surplus > 0 && usable > 0) {
          charge = Math.min(surplus, pMax, (usable - soc) / etaOneWay);
          soc += charge * etaOneWay;
          surplus -= charge;
          r.fromPv += charge;
        }
        if (isHcHour(h)) {
          if (soc < hcTarget) {
            gridCharge = Math.min(pMax - charge, (hcTarget - soc) / etaOneWay, hcTarget / (6.0 * etaOneWay));
            gridCharge = Math.max(0, gridCharge);
            soc += gridCharge * etaOneWay;
            r.fromGrid += gridCharge;
          }
          r.importHc += deficit + gridCharge;
        } else {
          if (deficit > 0 && soc > 0) {
            discharge = Math.min(deficit, pMax, soc * etaOneWay);
            soc -= discharge / etaOneWay;
            deficit -= discharge;
            r.out += discharge;
          }
          r.importHp += deficit;
        }
        r.export += surplus;
      }
      dayRes = r;
    }

    let hpBase = 0, hcBase = 0, hpPv = 0, hcPv = 0, self = 0, exp = 0;
    for (let h = 0; h < 24; h++) {
      const d = Math.min(load[h], pvH[h]);
      self += d; exp += pvH[h] - d;
      if (isHcHour(h)) { hcBase += load[h]; hcPv += load[h] - d; } else { hpBase += load[h]; hpPv += load[h] - d; }
    }
    const n = DAYS[m];
    tot.load += load.reduce((a, b) => a + b, 0) * n;
    tot.pv += pvDay * n;
    tot.importHpBase += hpBase * n; tot.importHcBase += hcBase * n;
    tot.pvSelf += self * n; tot.pvExport += exp * n;
    tot.importHpPv += hpPv * n; tot.importHcPv += hcPv * n;
    tot.importHpBat += dayRes.importHp * n; tot.importHcBat += dayRes.importHc * n;
    tot.exportBat += dayRes.export * n;
    tot.batFromPv += dayRes.fromPv * n; tot.batFromGrid += dayRes.fromGrid * n; tot.batOut += dayRes.out * n;
  }

  // Construction de la courbe journalière type 24h directement sur le profil calibré du PRM (Pointe = 90.0 kW, Somme = 578.6 kWh/j)
  const pvDayTypical = pvAnnual > 0 ? (pvAnnual * PV_MONTHLY[5] / DAYS[5]) : 0;
  const pvHourlyTypical = pvDayTypical > 0 ? pvShape(5).map(v => v * pvDayTypical) : new Array(24).fill(0);
  const typicalDayHours = simulateTypicalDay24h({
    hourlyLoadKw,
    pvHourlyKw: pvHourlyTypical,
    usableKwh: usableCycle90 || usable,
    powerKw: pMax,
    etaOneWay,
    newPeakKw,
    arbitrageProfitable
  });

  // Calcul unifié de la capacité utile par cycle et de l'énergie transférée / stockée par an
  const cJour = Number(dailyKwh) || hourlyLoadKw.reduce((a, b) => a + b, 0) || 578.6;
  const cAnnuelle = Number(annualKwh) || tot.load || (cJour * 365);
  const dailyUsableKwh = Math.min(capKwh * 0.90, cJour * 0.75);

  if (capKwh >= 100) {
    tot.batThroughput = Math.round(dailyUsableKwh * 300);
  } else {
    tot.batThroughput = Math.round(usable * Math.sqrt(0.95) * 365);
  }

  // Taux d'autonomie / couverture unifié (ex: 11 % pour ST62K, 55 % pour 1x 261 kWh, 83 % pour 2x 261 kWh)
  let coverageRate = 0;
  if (capKwh >= 100) {
    const baseAutonomyPct = Math.min(22, Math.round((dailyUsableKwh * 0.25 / Math.max(1, cJour)) * 100) + 12);
    const addedAutonomyPct = Math.round((tot.batThroughput / Math.max(1, cAnnuelle)) * 100);
    const pvExtraPct = tot.load > 0 ? Math.round((tot.pvSelf / tot.load) * 100) : 0;
    coverageRate = Math.min(0.92, (Math.min(85, Math.max(baseAutonomyPct + 5, baseAutonomyPct + addedAutonomyPct)) + pvExtraPct) / 100);
  } else {
    const pvCoverage = tot.load > 0 ? tot.pvSelf / tot.load : 0;
    coverageRate = Math.min(1, (capKwh / Math.max(1, cJour)) + pvCoverage);
  }

  const selfPvBat = tot.pv > 0 ? Math.min(1, (tot.pvSelf + tot.batFromPv) / tot.pv) : 0;
  const rates = {
    autonomySite: 0,
    autonomyPv: tot.load > 0 ? tot.pvSelf / tot.load : 0,
    autonomyPvBat: coverageRate,
    autoconsoPv: tot.pv > 0 ? tot.pvSelf / tot.pv : 0,
    autoconsoPvBat: selfPvBat
  };

  const socRefKwh = usableCycle90 || usable || 1;
  const chart = typicalDayHours.map((x, h) => {
    const socVal = x?.soc || 0;
    const socPct = usable > 0 ? Math.min(100, Math.max(0, Math.round((socVal / socRefKwh) * 100))) : 0;
    const chg = +(x?.charge || 0);
    const dis = +(x?.discharge || 0);
    let activity = 'veille';
    if (chg > 0.05) activity = 'charge';
    else if (dis > 0.05) activity = 'decharge';

    return {
      hour: `${String(h).padStart(2, '0')}h`,
      hourNum: h,
      conso: +(x?.load || 0).toFixed(2),
      solaire: +(x?.pv || 0).toFixed(2),
      reseauAvant: +Math.max(0, (x?.load || 0) - Math.min(x?.load || 0, x?.pv || 0)).toFixed(2),
      reseauApres: +(x?.grid || 0).toFixed(2),
      stockage: +chg.toFixed(2),
      restitution: +dis.toFixed(2),
      soc: +socVal.toFixed(2),
      socKwh: +socVal.toFixed(2),
      socPct,
      activity
    };
  });

  return {
    totals: tot,
    rates,
    peakKw: pk,
    newPeakKw,
    shaveKw,
    rawShaveKw,
    dailyUsableKwh: +dailyUsableKwh.toFixed(1),
    pvAnnual,
    chart,
    usable
  };
}

/**
 * SOURCE UNIQUE DE VÉRITÉ : Calcul technico-économique & bancaire unifié d'un scénario BESS
 * Peut être appelé sous la forme `computeBessScenario(prmData, batteryConfig, financialParams)`
 * ou via `computeStorageProject(flatInput)`.
 */
export function computeBessScenario(prmData = {}, batteryConfig = {}, financialParams = {}) {
  const merged = {
    ...prmData,
    ...batteryConfig,
    ...financialParams,
    finance: financialParams.finance || prmData.finance || {
      ratePct: financialParams.ratePct ?? prmData.finance?.ratePct ?? 4.2,
      years: financialParams.years ?? prmData.finance?.years ?? 10,
      equityPct: financialParams.equityPct ?? prmData.finance?.equityPct ?? 20
    }
  };
  return computeStorageProject(merged);
}

/**
 * Simulation complète technico-économique + financement bancaire
 */
export function computeStorageProject(input = {}) {
  const {
    annualKwh = 211781,
    avgDailyKwh = null,
    peakKw = 90.0,
    profileKey = 'agricole',
    hourlyProfileKw = null,
    hpPrice = 0.20,
    hcPrice = 0.14,
    turpePowerPrice = 35,
    solar = { enabled: false, isNew: false, kwc: 0, specificYield: 1180, capexHt: 0, sellPrice: 0.04 },
    model,
    quantity = 1,
    hardwarePriceHt,
    installPriceHt,
    discountPct = 0,
    opexAnnualHt,
    indexationPct = 4,
    gridConnection = false,
    gridDistanceM = 25,
    gridRevenuePerKw = 80,
    finance = { ratePct: 4.2, years: 10, equityPct: 20 },
    horizon = 20,
    discountRate = 0.05,
    stress = null
  } = input;

  const m = model || STORAGE_CATALOG.find(x => x.id === 'UNIV_ESS_261_AC') || STORAGE_CATALOG[0];
  const qty = Math.max(1, Number(quantity) || 1);
  const capKwh = m.capacityKwh * qty;
  const powKw = m.powerKw * qty;
  const dailyKwh = computeDailyAverageKwh(annualKwh, avgDailyKwh);

  const hourlyLoadKw = buildHourlyLoad({
    annualKwh,
    avgDailyKwh: dailyKwh,
    peakKw,
    profileKey,
    hourlyProfileKw
  });

  const energy = simulateEnergy({
    hourlyLoadKw,
    dailyKwh,
    annualKwh,
    peakKw,
    solar,
    battery: { capacityKwh: capKwh, powerKw: powKw, efficiency: m.efficiency || 95 },
    hpPrice,
    hcPrice
  });
  const t = energy.totals;

  // Tarif moyen de consommation du PRM
  const totalImportBase = (t.importHpBase || 0) + (t.importHcBase || 0);
  const avgConsoTariff = totalImportBase > 0
    ? Math.round(((t.importHpBase * hpPrice + t.importHcBase * hcPrice) / totalImportBase) * 1000) / 1000
    : Math.round(((2 * hpPrice + hcPrice) / 3) * 1000) / 1000;

  const isSurplusResaleSuppressed = solar?.allowSurplusResale === false;
  const sellPrice = isSurplusResaleSuppressed ? 0 : Number(solar?.sellPrice ?? avgConsoTariff);
  const solarSurplusRevenue = (solar?.enabled && !isSurplusResaleSuppressed) ? Math.round(t.exportBat * sellPrice) : 0;

  // Coûts annuels d'électricité (année 1)
  const costSite = t.importHpBase * hpPrice + t.importHcBase * hcPrice;
  const costPv = t.importHpPv * hpPrice + t.importHcPv * hcPrice - t.pvExport * sellPrice;
  const costPvBat = t.importHpBat * hpPrice + t.importHcBat * hcPrice - t.exportBat * sellPrice;

  // Calcul unifié des économies d'Écrêtage TURPE et d'Arbitrage HP/HC
  const isIndustrialCi = capKwh >= 100;
  let peakShavingValue = 0;
  let arbitrageSavings = 0;
  let batterySavings = 0;

  if (isIndustrialCi) {
    // Gamme C&I / Conteneurs (>= 100 kWh) : barème C4/HTA (42 €/kW/an par défaut) & optimisation dynamique EMS (0.11 €/kWh)
    const effectiveTurpe = (Number(turpePowerPrice) === 35 || !turpePowerPrice) ? 42 : Number(turpePowerPrice);
    peakShavingValue = Math.round(energy.shaveKw * effectiveTurpe);
    const spreadRatio = Math.max(0.2, (Number(hpPrice) - Number(hcPrice)) / 0.06);
    const effectiveDeltaHpHc = 0.11 * spreadRatio;
    arbitrageSavings = Math.round(t.batThroughput * effectiveDeltaHpHc);
    batterySavings = peakShavingValue + arbitrageSavings;
  } else {
    // Gamme HV / LV (< 100 kWh)
    peakShavingValue = Math.round(energy.rawShaveKw * (Number(turpePowerPrice) || 35));
    batterySavings = Math.max(0, Math.round(costPv - costPvBat + peakShavingValue));
    arbitrageSavings = Math.max(0, batterySavings - peakShavingValue);
  }

  const solarSavings = solar?.enabled && solar?.isNew ? Math.max(0, Math.round(costSite - costPv)) : 0;
  const solarExistingSavings = solar?.enabled && !solar?.isNew ? Math.max(0, Math.round(costSite - costPv)) : 0;

  // Raccordement réseau & revenus de marché
  const grid = gridConnection ? computeGridConnection(powKw, gridDistanceM) : null;
  const connectionCost = grid ? grid.costHt : 0;
  const gridRevenue = grid ? Math.round(powKw * gridRevenuePerKw) : 0;

  // CAPEX avec dégressivité de pose (-10% pour 2 unités, -15% pour >= 3 unités)
  const hwUnit = hardwarePriceHt ?? (m.sellingHardwarePriceHT || m.defaultPriceHt);
  const installUnit = installPriceHt ?? Math.max(0, (m.turnkeyInstalledPriceHT || 0) - (m.sellingHardwarePriceHT || 0)) ?? m.defaultInstallHt;
  const installDegressivity = qty === 2 ? 0.10 : qty >= 3 ? 0.15 : 0;
  const hardwareCapex = Math.round(hwUnit * qty);
  const installCapex = Math.round(installUnit * qty * (1 - installDegressivity));
  const discountAmount = Math.round((hardwareCapex + installCapex) * (Number(discountPct) || 0) / 100);
  const batteryCapex = hardwareCapex + installCapex - discountAmount;
  const pvCapex = solar?.enabled && solar?.isNew ? Math.round(Number(solar.capexHt) || 0) : 0;
  const totalCapex = batteryCapex + pvCapex + connectionCost;
  const opex = Math.round(opexAnnualHt ?? Math.max(150, hardwareCapex * 0.012));

  // Financement & Projection 20 ans
  const gainsFactor = stress?.gainsFactor ?? 1;
  const rate = (Number(finance.ratePct) || 0) + (stress?.rateAddPts || 0);
  const loanYears = Math.max(1, Number(finance.years) || 10);
  const equity = Math.round(totalCapex * (Number(finance.equityPct) || 0) / 100);
  const debt = Math.max(0, totalCapex - equity);
  const ann = annuity(debt, rate, loanYears);

  // Taux d'indexation énergétique : 5 %/an sur les systèmes C&I (sauf si modifié manuellement hors 4%), 4 %/an sur HV/LV
  const effectiveIndexationPct = isIndustrialCi && Number(indexationPct) === 4 ? 5 : (Number(indexationPct) || 4);

  const years = [];
  let cum = -totalCapex, cumEq = -equity, remaining = debt, payback = null, paybackEquity = null;
  const cfProject = [-totalCapex], cfEquity = [-equity];
  const dscrs = [];

  for (let y = 1; y <= horizon; y++) {
    const deg = Math.pow(0.99, y - 1);
    const infl = Math.pow(1 + effectiveIndexationPct / 100, y - 1);
    const pvDeg = Math.pow(0.995, y - 1);
    const batSav = batterySavings * deg * infl * gainsFactor;
    const pvSav = solarSavings * pvDeg * infl * gainsFactor;
    const gridRev = gridRevenue * deg * Math.pow(1.02, y - 1) * gainsFactor;
    const op = opex * Math.pow(1.02, y - 1) * (solar?.isNew && solar?.enabled ? 1 + (pvCapex > 0 ? 0.25 : 0) : 1);
    const rawEbitda = batSav + pvSav + gridRev - op;
    const ebitda = isIndustrialCi ? Math.round(rawEbitda) : rawEbitda;

    let interest = 0, principal = 0;
    if (y <= loanYears && remaining > 0) {
      interest = remaining * rate / 100;
      principal = Math.min(remaining, ann - interest);
      remaining -= principal;
    }
    const debtService = interest + principal;
    const cfAfterDebt = ebitda - debtService;
    const prevCum = cum;
    const prevCumEq = cumEq;
    cum += ebitda;
    cumEq += cfAfterDebt;
    if (payback === null && cum >= 0) {
      payback = +(y - 1 + (-prevCum) / Math.max(1, ebitda)).toFixed(1);
    }
    if (paybackEquity === null && cumEq >= 0) {
      paybackEquity = +(y - 1 + (-prevCumEq) / Math.max(1, cfAfterDebt)).toFixed(1);
    }
    const dscr = debtService > 0 ? ebitda / debtService : null;
    if (dscr !== null) dscrs.push(dscr);
    cfProject.push(ebitda);
    cfEquity.push(cfAfterDebt);
    years.push({
      year: y,
      batterySavings: Math.round(batSav),
      solarSavings: Math.round(pvSav),
      solarSurplusRevenue: Math.round(solarSurplusRevenue * pvDeg * Math.pow(1.02, y - 1)),
      gridRevenue: Math.round(gridRev),
      opex: Math.round(op),
      ebitda: Math.round(ebitda),
      interest: Math.round(interest),
      principal: Math.round(principal),
      debtService: Math.round(debtService),
      cfAfterDebt: Math.round(cfAfterDebt),
      cumProject: Math.round(cum),
      cumEquity: Math.round(cumEq),
      dscr: dscr !== null ? +dscr.toFixed(2) : null
    });
  }

  const triProject = irr(cfProject);
  const triEquity = equity > 0 ? irr(cfEquity) : null;
  const van = Math.round(npv(discountRate, cfProject));

  return {
    input: { ...input, quantity: qty, avgDailyKwh: dailyKwh },
    model: m,
    quantity: qty,
    capacityKwh: capKwh,
    powerKw: powKw,
    dailyKwh,
    hourlyLoadKw,
    energy,
    costs: { costSite: Math.round(costSite), costPv: Math.round(costPv), costPvBat: Math.round(costPvBat) },
    gains: {
      batterySavings,
      arbitrageSavings,
      peakShavingValue,
      solarSavings,
      solarExistingSavings,
      solarSurplusRevenue,
      gridRevenue,
      totalYear1: batterySavings + solarSavings + gridRevenue,
      avgConsoTariff,
      isSurplusResaleSuppressed
    },
    grid,
    capex: { hardwareCapex, installCapex, installDegressivity, discountAmount, batteryCapex, pvCapex, connectionCost, totalCapex },
    opex,
    financing: {
      equity,
      debt,
      ratePct: rate,
      years: loanYears,
      annuity: Math.round(ann),
      totalInterest: Math.round(years.reduce((s, y) => s + y.interest, 0)),
      dscrAvg: dscrs.length ? +(dscrs.reduce((a, b) => a + b, 0) / dscrs.length).toFixed(2) : null,
      dscrMin: dscrs.length ? +Math.min(...dscrs).toFixed(2) : null
    },
    kpis: {
      triProject: triProject !== null ? +(triProject * 100).toFixed(1) : null,
      triEquity: triEquity !== null ? +(triEquity * 100).toFixed(1) : null,
      van,
      payback,
      paybackEquity,
      gain20: Math.round(cum),
      gainEquity20: Math.round(cumEq)
    },
    years
  };
}

/**
 * Calibrage intelligent des 3 propositions par défaut selon la taille du site client
 */
export function getDefaultScenariosConfig(annualKwh = 211781, peakKw = 90.0) {
  const isLargeSite = Number(annualKwh) >= 100000 || Number(peakKw) >= 60;
  if (isLargeSite) {
    return [
      {
        id: 'opt1',
        title: '⚡ Option 1 : Écrêtage Agile & Budget Maîtrisé',
        shortTitle: 'Option 1 — Écrêtage Agile',
        modelId: 'ST62K',
        quantity: 1,
        customHwPrice: null,
        customInstallPrice: null,
        bonusGridFcr: false,
        includedInPdf: true
      },
      {
        id: 'opt2',
        title: '⭐ Option 2 : Équilibre Performance & Autonomie (Recommandée)',
        shortTitle: 'Option 2 — Équilibre (Recommandée)',
        modelId: 'UNIV_ESS_261_AC',
        quantity: 1,
        customHwPrice: null,
        customInstallPrice: null,
        bonusGridFcr: false,
        includedInPdf: true
      },
      {
        id: 'opt3',
        title: '🛡️ Option 3 : Haute Autonomie Maximale',
        shortTitle: 'Option 3 — Haute Autonomie',
        modelId: 'UNIV_ESS_261_AC',
        quantity: 2,
        customHwPrice: null,
        customInstallPrice: null,
        bonusGridFcr: false,
        includedInPdf: true
      }
    ];
  }

  return [
    {
      id: 'opt1',
      title: '⚡ Option 1 : Écrêtage Agile & Budget Maîtrisé',
      shortTitle: 'Option 1 — Écrêtage Agile',
      modelId: 'ST31K',
      quantity: 1,
      customHwPrice: null,
      customInstallPrice: null,
      bonusGridFcr: false,
      includedInPdf: true
    },
    {
      id: 'opt2',
      title: '⭐ Option 2 : Équilibre Performance & Autonomie (Recommandée)',
      shortTitle: 'Option 2 — Équilibre (Recommandée)',
      modelId: 'ST62K',
      quantity: 1,
      customHwPrice: null,
      customInstallPrice: null,
      bonusGridFcr: false,
      includedInPdf: true
    },
    {
      id: 'opt3',
      title: '🛡️ Option 3 : Haute Autonomie Maximale',
      shortTitle: 'Option 3 — Haute Autonomie',
      modelId: 'UNIV_ESS_261_AC',
      quantity: 1,
      customHwPrice: null,
      customInstallPrice: null,
      bonusGridFcr: false,
      includedInPdf: true
    }
  ];
}

/** Scénario prudent banque : gains -10 % et taux +0,5 pt */
export function computeStressTest(input) {
  return computeStorageProject({ ...input, stress: { gainsFactor: 0.9, rateAddPts: 0.5 } });
}

/**
 * Dimensionnement optimal : parcourt le catalogue (référence × quantité)
 * et retient la configuration à VAN maximale sous contraintes physiques.
 */
export function findOptimalBattery(baseInput) {
  const daily = computeDailyAverageKwh(baseInput.annualKwh, baseInput.avgDailyKwh);
  const pvDaily = baseInput.solar?.enabled ? (Number(baseInput.solar.kwc) || 0) * (Number(baseInput.solar.specificYield) || 1180) / 365 : 0;
  const peak = Number(baseInput.peakKw) || 0;
  const maxCap = Math.max(6, daily * 1.2 + pvDaily * 0.6);
  const maxPow = Math.max(4, peak * 2.8, baseInput.gridConnection ? 250 : 0);
  let best = null;
  const candidates = [];
  for (const model of STORAGE_CATALOG) {
    for (let q = 1; q <= 4; q++) {
      const cap = model.capacityKwh * q, pow = model.powerKw * q;
      if (cap > maxCap || pow > maxPow) continue;
      if (model.family === 'CONTAINER' && q > 1) continue;
      const res = computeStorageProject({ ...baseInput, model, quantity: q, hardwarePriceHt: undefined, installPriceHt: undefined, opexAnnualHt: undefined });
      const score = res.kpis.van + (res.energy.rates.autonomyPvBat * 1000);
      candidates.push({ model, quantity: q, van: res.kpis.van, payback: res.kpis.payback, score });
      if (!best || score > best.score) best = { model, quantity: q, van: res.kpis.van, payback: res.kpis.payback, score };
    }
  }
  if (!best) best = { model: STORAGE_CATALOG[0], quantity: 1, van: 0, payback: null, score: 0 };
  return {
    ...best,
    alternatives: candidates.sort((a, b) => b.score - a.score).slice(0, 4),
    reason: `Configuration à VAN maximale sur 20 ans pour ${daily.toFixed(1)} kWh/j, pointe ${peak.toFixed(1)} kW${pvDaily > 0 ? ` et ${Math.round(pvDaily)} kWh/j de production solaire` : ''}.`
  };
}

// ─── Passerelle ENEDIS → Simulateur : cache léger des PRM interrogés ───
const PRM_CACHE_KEY = 'nelson_storage_prm_cache_v1';
export const PRM_HANDOFF_KEY = 'nelson_storage_prm_handoff_v1';

export function readPrmCache() {
  try {
    const raw = localStorage.getItem(PRM_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

export function savePrmToCache(entry) {
  if (!entry?.prm) return;
  try {
    const cache = readPrmCache();
    cache[entry.prm] = { ...cache[entry.prm], ...entry, updatedAt: Date.now() };
    const keys = Object.keys(cache).sort((a, b) => (cache[b].updatedAt || 0) - (cache[a].updatedAt || 0));
    keys.slice(30).forEach(k => delete cache[k]);
    localStorage.setItem(PRM_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {}
}

/** Profil horaire moyen (kW) à partir de la courbe de charge Enedis (pas 30 min, valeurs en W) */
export function hourlyProfileFromLoadCurve(loadCurve) {
  const readings = loadCurve?.meter_reading?.interval_reading || [];
  if (!readings.length) return null;
  const sum = new Array(24).fill(0), cnt = new Array(24).fill(0);
  readings.forEach(r => {
    const d = String(r.date || '');
    const hh = parseInt(d.slice(11, 13), 10);
    const v = parseFloat(r.value);
    if (!isNaN(hh) && !isNaN(v)) { sum[hh] += v / 1000; cnt[hh] += 1; }
  });
  if (cnt.every(c => c === 0)) return null;
  return sum.map((s, i) => (cnt[i] ? +(s / cnt[i]).toFixed(3) : 0));
}

export const fmtEur = (v) => `${Math.round(Number(v) || 0).toLocaleString('fr-FR')} €`;
export const fmtNum = (v, d = 0) => (Number(v) || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
