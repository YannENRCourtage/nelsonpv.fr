/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOTEUR DE SIMULATION « STOCKAGE BATTERIE » (DERRIÈRE LE COMPTEUR / RÉSEAU)
 * - Profil de charge horaire (PRM Enedis ou profil type manuel)
 * - Production solaire PV sur site (existante ou nouvelle) avec saisonnalité
 * - Dispatch horaire batterie : recharge solaire gratuite prioritaire,
 *   complément Heures Creuses, décharge en Heures Pleines, écrêtage de pointe
 * - Raccordement réseau Enedis optionnel (BT C4 ≤ 250 kW / HTA > 250 kW)
 * - Business plan 20 ans, financement bancaire (annuité constante),
 *   DSCR, TRI Projet, TRI Fonds Propres, VAN, Payback, stress-test bancaire
 * Moteur pur (sans React) : réutilisé par l'onglet Simulateur > Stockage
 * Batterie et par le couplage batterie du Séchoir BatiTech®.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SAFRA_CATALOG } from '@/data/safraCatalog';

export const STORAGE_CATALOG = SAFRA_CATALOG;

// ─── Profils de charge journaliers types (24 poids horaires, normalisés à l'usage) ───
export const LOAD_PROFILES = {
  agricole: {
    label: 'Agricole (élevage / traite / ventilation)',
    shape: [0.6, 0.55, 0.55, 0.6, 0.9, 1.6, 1.9, 1.7, 1.2, 1.0, 1.0, 1.05, 1.0, 0.95, 0.95, 1.0, 1.3, 1.8, 1.9, 1.5, 1.0, 0.8, 0.7, 0.65]
  },
  industriel: {
    label: 'Industriel (2×8 / process)',
    shape: [0.45, 0.4, 0.4, 0.4, 0.45, 0.7, 1.3, 1.5, 1.55, 1.55, 1.55, 1.5, 1.35, 1.5, 1.55, 1.55, 1.5, 1.4, 1.2, 1.0, 0.85, 0.7, 0.55, 0.5]
  },
  tertiaire: {
    label: 'Tertiaire (bureaux / commerces)',
    shape: [0.35, 0.33, 0.33, 0.33, 0.35, 0.45, 0.7, 1.2, 1.6, 1.7, 1.75, 1.7, 1.55, 1.65, 1.7, 1.7, 1.6, 1.4, 1.0, 0.7, 0.55, 0.45, 0.4, 0.38]
  },
  boulangerie: {
    label: 'Boulangerie / Froid commercial',
    shape: [1.0, 1.4, 1.9, 2.1, 2.0, 1.8, 1.5, 1.2, 1.0, 0.9, 0.85, 0.85, 0.8, 0.75, 0.75, 0.8, 0.85, 0.9, 0.85, 0.8, 0.75, 0.7, 0.75, 0.85]
  },
  residentiel: {
    label: 'Résidentiel',
    shape: [0.5, 0.42, 0.4, 0.4, 0.42, 0.55, 0.95, 1.35, 1.2, 0.9, 0.8, 0.85, 0.95, 0.85, 0.75, 0.75, 0.9, 1.3, 1.85, 2.05, 1.85, 1.45, 1.0, 0.7]
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

/** Construit un profil horaire 24h (kW moyen) à partir d'une courbe Enedis ou d'un profil type */
export function buildHourlyLoad({ annualKwh, profileKey = 'agricole', hourlyProfileKw = null }) {
  const daily = (Number(annualKwh) || 0) / 365;
  if (Array.isArray(hourlyProfileKw) && hourlyProfileKw.length === 24 && hourlyProfileKw.some(v => v > 0)) {
    return normalize(hourlyProfileKw).map(v => v * daily);
  }
  const shape = (LOAD_PROFILES[profileKey] || LOAD_PROFILES.agricole).shape;
  return normalize(shape).map(v => v * daily);
}

/** Coût de raccordement Enedis (cohérent avec le moteur BESS existant) */
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
  let lo = -0.99, hi = 1.0;
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
 * Simulation énergétique annuelle (12 jours types mensuels × 24 h)
 * @returns bilans annuels Site seul / Solaire seul / Solaire + Batterie + courbe journalière type
 */
export function simulateEnergy({
  hourlyLoadKw,
  peakKw,
  solar = { enabled: false, kwc: 0, specificYield: 1180 },
  battery = { capacityKwh: 0, powerKw: 0, efficiency: 95 },
  hpPrice = 0.20,
  hcPrice = 0.14
}) {
  const pvAnnual = solar?.enabled ? (Number(solar.kwc) || 0) * (Number(solar.specificYield) || 1180) : 0;
  const usable = Math.max(0, (battery.capacityKwh || 0) * 0.92); // DoD 92 %
  const pMax = Math.max(0, battery.powerKw || 0);
  const etaOneWay = Math.sqrt(Math.min(0.99, (battery.efficiency || 95) / 100));
  const arbitrageProfitable = hpPrice > hcPrice / (etaOneWay * etaOneWay);

  const tot = {
    load: 0, pv: 0,
    // Solaire seul
    pvSelf: 0, pvExport: 0, importHpPv: 0, importHcPv: 0,
    // Solaire + batterie
    importHpBat: 0, importHcBat: 0, exportBat: 0, batFromPv: 0, batFromGrid: 0, batOut: 0,
    importHpBase: 0, importHcBase: 0
  };
  let typicalDay = null;

  for (let m = 0; m < 12; m++) {
    const lf = LOAD_MONTHLY[m];
    const load = hourlyLoadKw.map(v => v * lf);
    const pvDay = pvAnnual * PV_MONTHLY[m] / DAYS[m];
    const pvH = pvShape(m).map(v => v * pvDay);

    // Anticipation : énergie solaire stockable dans la journée et besoin du matin
    let storableSurplus = 0, morningDeficit = 0, surplusSeen = false;
    for (let h = 6; h < 22; h++) {
      const s = pvH[h] - load[h];
      if (s > 0) { storableSurplus += Math.min(s, pMax) * etaOneWay; surplusSeen = true; }
      else if (!surplusSeen) morningDeficit += Math.min(-s, pMax);
    }
    const hcTarget = arbitrageProfitable
      ? Math.min(usable, Math.max(0, usable - storableSurplus + Math.min(morningDeficit, usable)))
      : 0;

    // Deux jours pour atteindre le régime établi, on mesure le second
    let soc = 0;
    let dayRes = null;
    for (let pass = 0; pass < 2; pass++) {
      const r = { importHp: 0, importHc: 0, export: 0, fromPv: 0, fromGrid: 0, out: 0, hours: [] };
      for (let k = 0; k < 24; k++) {
        const h = (k + 22) % 24; // la journée « batterie » démarre à 22h (début HC)
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
          // Heures Creuses : on ne décharge pas, recharge réseau jusqu'à la cible
          if (soc < hcTarget) {
            gridCharge = Math.min(pMax - charge, (hcTarget - soc) / etaOneWay);
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
        r.hours[h] = { h, load: l, pv: p, charge: charge + gridCharge, discharge, grid: deficit + gridCharge, soc };
      }
      dayRes = r;
    }

    // Bilans Site seul / Solaire seul
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

    if (m === 5 || (m === 3 && !typicalDay)) typicalDay = dayRes.hours; // jour type de juin (avril en secours)
  }

  // Écrêtage de pointe : la batterie rabote la pointe dans la limite de sa puissance et de son énergie
  const pk = Number(peakKw) || Math.max(...hourlyLoadKw) * 1.6;
  const shaveKw = usable > 0 ? Math.min(pMax, pk * 0.45, usable / 1.5) : 0;
  const newPeakKw = Math.max(0, pk - shaveKw);

  // Taux
  const selfPvBat = tot.pv > 0 ? Math.min(1, (tot.pvSelf + tot.batFromPv) / tot.pv) : 0;
  const rates = {
    autonomySite: 0,
    autonomyPv: tot.load > 0 ? tot.pvSelf / tot.load : 0,
    autonomyPvBat: tot.load > 0 ? Math.min(1, (tot.load - (tot.importHpBat + tot.importHcBat - tot.batFromGrid)) / tot.load) : 0,
    autoconsoPv: tot.pv > 0 ? tot.pvSelf / tot.pv : 0,
    autoconsoPvBat: selfPvBat
  };

  const chart = (typicalDay || []).map((x, h) => ({
    hour: `${String(h).padStart(2, '0')}h`,
    conso: +(x?.load || 0).toFixed(2),
    solaire: +(x?.pv || 0).toFixed(2),
    reseauAvant: +Math.max(0, (x?.load || 0) - Math.min(x?.load || 0, x?.pv || 0)).toFixed(2),
    reseauApres: +(x?.grid || 0).toFixed(2),
    stockage: +(x?.charge || 0).toFixed(2),
    restitution: +(x?.discharge || 0).toFixed(2),
    soc: +(x?.soc || 0).toFixed(2)
  }));

  return { totals: tot, rates, peakKw: pk, newPeakKw, shaveKw, pvAnnual, chart, usable };
}

/**
 * Simulation complète technico-économique + financement bancaire
 */
export function computeStorageProject(input) {
  const {
    annualKwh = 50000,
    peakKw = 30,
    profileKey = 'agricole',
    hourlyProfileKw = null,
    hpPrice = 0.20,
    hcPrice = 0.14,
    turpePowerPrice = 35, // €/kW/an (composante puissance évitée par l'écrêtage)
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
    stress = null // { gainsFactor: 0.9, rateAddPts: 0.5 }
  } = input;

  const m = model || STORAGE_CATALOG[0];
  const qty = Math.max(1, Number(quantity) || 1);
  const capKwh = m.capacityKwh * qty;
  const powKw = m.powerKw * qty;
  const hourlyLoadKw = buildHourlyLoad({ annualKwh, profileKey, hourlyProfileKw });

  const energy = simulateEnergy({
    hourlyLoadKw,
    peakKw,
    solar,
    battery: { capacityKwh: capKwh, powerKw: powKw, efficiency: m.efficiency || 95 },
    hpPrice,
    hcPrice
  });
  const t = energy.totals;
  const sellPrice = Number(solar?.sellPrice ?? 0.04);

  // Coûts annuels d'électricité (année 1)
  const costSite = t.importHpBase * hpPrice + t.importHcBase * hcPrice;
  const costPv = t.importHpPv * hpPrice + t.importHcPv * hcPrice - t.pvExport * sellPrice;
  const costPvBat = t.importHpBat * hpPrice + t.importHcBat * hcPrice - t.exportBat * sellPrice;

  const peakShavingValue = Math.round(energy.shaveKw * turpePowerPrice);
  const batterySavings = Math.max(0, Math.round(costPv - costPvBat + peakShavingValue));
  const solarSavings = solar?.enabled && solar?.isNew ? Math.max(0, Math.round(costSite - costPv)) : 0;
  const solarExistingSavings = solar?.enabled && !solar?.isNew ? Math.max(0, Math.round(costSite - costPv)) : 0;

  // Raccordement réseau & revenus de marché
  const grid = gridConnection ? computeGridConnection(powKw, gridDistanceM) : null;
  const connectionCost = grid ? grid.costHt : 0;
  const gridRevenue = grid ? Math.round(powKw * gridRevenuePerKw) : 0;

  // CAPEX
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

  // Financement
  const gainsFactor = stress?.gainsFactor ?? 1;
  const rate = (Number(finance.ratePct) || 0) + (stress?.rateAddPts || 0);
  const loanYears = Math.max(1, Number(finance.years) || 10);
  const equity = Math.round(totalCapex * (Number(finance.equityPct) || 0) / 100);
  const debt = Math.max(0, totalCapex - equity);
  const ann = annuity(debt, rate, loanYears);

  const years = [];
  let cum = -totalCapex, cumEq = -equity, remaining = debt, payback = null;
  const cfProject = [-totalCapex], cfEquity = [-equity];
  const dscrs = [];
  for (let y = 1; y <= horizon; y++) {
    const deg = Math.pow(0.99, y - 1);
    const infl = Math.pow(1 + (Number(indexationPct) || 0) / 100, y - 1);
    const pvDeg = Math.pow(0.995, y - 1);
    const batSav = batterySavings * deg * infl * gainsFactor;
    const pvSav = solarSavings * pvDeg * infl * gainsFactor;
    const gridRev = gridRevenue * deg * Math.pow(1.02, y - 1) * gainsFactor;
    const op = opex * Math.pow(1.02, y - 1) * (solar?.isNew && solar?.enabled ? 1 + (pvCapex > 0 ? 0.25 : 0) : 1);
    const ebitda = batSav + pvSav + gridRev - op;
    let interest = 0, principal = 0;
    if (y <= loanYears && remaining > 0) {
      interest = remaining * rate / 100;
      principal = Math.min(remaining, ann - interest);
      remaining -= principal;
    }
    const debtService = interest + principal;
    const cfAfterDebt = ebitda - debtService;
    const prevCum = cum;
    cum += ebitda;
    cumEq += cfAfterDebt;
    if (payback === null && cum >= 0) payback = +(y - 1 + (-prevCum) / Math.max(1, ebitda)).toFixed(1);
    const dscr = debtService > 0 ? ebitda / debtService : null;
    if (dscr !== null) dscrs.push(dscr);
    cfProject.push(ebitda);
    cfEquity.push(cfAfterDebt);
    years.push({
      year: y,
      batterySavings: Math.round(batSav), solarSavings: Math.round(pvSav), gridRevenue: Math.round(gridRev),
      opex: Math.round(op), ebitda: Math.round(ebitda), interest: Math.round(interest), principal: Math.round(principal),
      debtService: Math.round(debtService), cfAfterDebt: Math.round(cfAfterDebt),
      cumProject: Math.round(cum), cumEquity: Math.round(cumEq), dscr: dscr !== null ? +dscr.toFixed(2) : null
    });
  }

  const triProject = irr(cfProject);
  const triEquity = equity > 0 ? irr(cfEquity) : null;
  const van = Math.round(npv(discountRate, cfProject));

  return {
    input: { ...input, quantity: qty },
    model: m,
    quantity: qty,
    capacityKwh: capKwh,
    powerKw: powKw,
    hourlyLoadKw,
    energy,
    costs: { costSite: Math.round(costSite), costPv: Math.round(costPv), costPvBat: Math.round(costPvBat) },
    gains: {
      batterySavings, solarSavings, solarExistingSavings, peakShavingValue, gridRevenue,
      totalYear1: batterySavings + solarSavings + gridRevenue
    },
    grid,
    capex: { hardwareCapex, installCapex, installDegressivity, discountAmount, batteryCapex, pvCapex, connectionCost, totalCapex },
    opex,
    financing: {
      equity, debt, ratePct: rate, years: loanYears, annuity: Math.round(ann),
      totalInterest: Math.round(years.reduce((s, y) => s + y.interest, 0)),
      dscrAvg: dscrs.length ? +(dscrs.reduce((a, b) => a + b, 0) / dscrs.length).toFixed(2) : null,
      dscrMin: dscrs.length ? +Math.min(...dscrs).toFixed(2) : null
    },
    kpis: {
      triProject: triProject !== null ? +(triProject * 100).toFixed(1) : null,
      triEquity: triEquity !== null ? +(triEquity * 100).toFixed(1) : null,
      van,
      payback,
      gain20: Math.round(cum)
    },
    years
  };
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
  const daily = (Number(baseInput.annualKwh) || 0) / 365;
  const pvDaily = baseInput.solar?.enabled ? (Number(baseInput.solar.kwc) || 0) * (Number(baseInput.solar.specificYield) || 1180) / 365 : 0;
  const peak = Number(baseInput.peakKw) || 0;
  const maxCap = Math.max(6, daily * 1.2 + pvDaily * 0.6);
  const maxPow = Math.max(4, peak * 1.3, baseInput.gridConnection ? 250 : 0);
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
    reason: `Configuration à VAN maximale sur 20 ans pour ${Math.round(daily)} kWh/j, pointe ${peak.toFixed(1)} kW${pvDaily > 0 ? ` et ${Math.round(pvDaily)} kWh/j de production solaire` : ''}.`
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
    // garder au plus 30 PRM pour ne pas saturer le localStorage
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
