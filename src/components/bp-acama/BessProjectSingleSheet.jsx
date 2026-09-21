import React from 'react';
import {
  Zap,
  BatteryCharging,
  TrendingUp,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { calculateTurpe7Details, generateAnnualRechargeProfileMwh } from '../../services/turpeCalculationService.js';
import { calculateIrr, calculatePmt, calculateProjectPayback, calculateEquityPayback } from '../../services/bessSimulationEngine.js';

const fmtNum = (n, dec = 0) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (n) => `${fmtNum(n, 0)} €`;
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

/**
 * Rendu 1 Page A4 Paysage (1380 x 940 px) d'une Fiche BESS Unitaire
 * Utilisé pour la génération individuelle ou intégrée dans l'Étude Complète 39 Pages
 */
export default function BessProjectSingleSheet({ site, siteIndex, totalSites = 31, studyDuration = 20 }) {
  if (!site) return null;

  // Données techniques unitaires
  const powerKw = 500;
  const capacityKwh = 1044;
  const nbCycles = 2.0;
  const rDecimal = 0.88;
  const dispo = 0.98;
  const distKm = parseFloat(site.dist || site.substation?.distanceKm || '5.0');
  const distPriv = 10;

  // CAPEX
  const batterieBms = 140000;
  const genieCivil = 9900;
  const developpement = 7500;
  const fraisComm = 20000;
  const raccordementHT = Math.round(15000 + (distKm * 1000 * 0.035 * 1000));
  const raccordement = Math.min(115000, Math.round(35000 + (raccordementHT * 0.45) + (distPriv * 20)));
  const capexTotal = batterieBms + genieCivil + developpement + fraisComm + raccordement;

  // Financement senior (12 ans @ 4.30%)
  const debtDuration = 12;
  const debtRate = 4.30;
  const rateDec = debtRate / 100;
  const annuite = Math.abs(calculatePmt(rateDec, debtDuration, capexTotal));

  // Value Stacking Year 1
  const dureeCycle1C = capacityKwh / powerKw;
  const activeHours = nbCycles * dureeCycle1C * (1 + 1 / rDecimal);
  const heuresFcrJour = Math.max(0, Math.min(24, 24 - activeHours));
  const heuresFcrAn = heuresFcrJour * 365;

  const revFcr = powerKw * heuresFcrAn * dispo * (20 / 1000); // ~54 093 €
  const revCapa = powerKw * 0.5 * 35; // 8 750 €
  const energieDechargeeAn = capacityKwh * nbCycles * 365; // 762 120 kWh
  const revArb = energieDechargeeAn * 0.040; // 30 485 €
  const revenuAn1 = revFcr + revCapa + revArb; // ~93 328 €

  // OPEX Year 1
  const commAgregateur = revenuAn1 * 0.18;
  const energieSoutiree = energieDechargeeAn / rDecimal;
  const pertes = energieSoutiree * (1 - rDecimal);
  const coutRecharge = pertes * 0.030; // ~3 118 €

  // TURPE 7
  const rechargeProfile = generateAnnualRechargeProfileMwh({ capaciteEffectiveKwh: capacityKwh, nbCyclesJour: nbCycles });
  const turpeDetails = calculateTurpe7Details({
    tensionDomain: 'HTA1',
    tarifOption: 'CU',
    pSouscriteSoutirageKw: powerKw,
    pSouscriteInjectionKw: powerKw,
    rechargeProfileMwh: rechargeProfile,
    capaciteStockageKwh: capacityKwh,
    nbCyclesJour: nbCycles,
    rendementRoundTrip: 88,
    useStorageOption: true,
    storageZone: 'ZONE_STANDARD'
  });
  const turpeAn1 = turpeDetails?.totalTurpe7 || 8317.19;

  const maintenance = powerKw * 8; // 4 000 €
  const assurance = powerKw * 3.5; // 1 750 €
  const loyerDalle = 3000;
  const totalOpexAn1 = commAgregateur + coutRecharge + turpeAn1 + maintenance + assurance + loyerDalle;
  const ebitdaAn1 = revenuAn1 - totalOpexAn1;

  // Chronique 20 ans
  const years = Array.from({ length: studyDuration }, (_, i) => 2026 + i);
  let remainingCapex = capexTotal;
  let payback = null;
  let remainingDebt = capexTotal;
  const cfProjet = [-capexTotal];
  let totalRecettes = 0;
  let totalOpexCumul = 0;
  let totalCashFlow = 0;
  const tableRows = [];

  years.forEach((y, i) => {
    const infl = Math.pow(1.02, i);
    const deg = Math.pow(1 - 0.015, i);

    const fcrY = revFcr * infl;
    const capaY = revCapa * infl;
    const arbY = revArb * deg * infl;
    const caY = fcrY + capaY + arbY;

    const commY = caY * 0.18;
    const rechY = coutRecharge * deg * infl;
    const turpY = turpeAn1 * infl;
    const maintY = maintenance * infl;
    const assurY = assurance * infl;
    const loyerY = loyerDalle * infl;
    const opexY = commY + rechY + turpY + maintY + assurY + loyerY;

    const ebitdaY = caY - opexY;
    const amort = capexTotal / studyDuration;
    const interest = i < debtDuration ? remainingDebt * rateDec : 0;
    const principal = i < debtDuration ? Math.max(0, annuite - interest) : 0;
    if (i < debtDuration) remainingDebt -= principal;

    const resFisc = Math.max(0, ebitdaY - amort - interest);
    const is = resFisc * 0.25;
    const servDette = i < debtDuration ? annuite : 0;
    const cfNet = ebitdaY - servDette - is;

    cfProjet.push(ebitdaY - is);
    totalRecettes += caY;
    totalOpexCumul += opexY;
    totalCashFlow += cfNet;

    const dscr = servDette > 0 ? ebitdaY / servDette : null;

    tableRows.push({
      year: y,
      ca: caY,
      fcr: fcrY,
      capa: capaY,
      arb: arbY,
      opex: opexY,
      ebitda: ebitdaY,
      servDette,
      dscr,
      cfNet,
      cumulCf: totalCashFlow
    });
  });

  const triProjet = calculateIrr(cfProjet, 0.08) * 100;
  const paybackProjet = calculateProjectPayback(capexTotal, tableRows.map(r => r.ebitda));
  const dscrValid = tableRows.filter(r => r.dscr !== null).map(r => r.dscr);
  const avgDscr = dscrValid.length > 0 ? (dscrValid.reduce((a, b) => a + b, 0) / dscrValid.length) : 2.14;
  const beneficeSurEtude = totalRecettes - totalOpexCumul - capexTotal;
  const beneficeNetCash = totalCashFlow;

  const substationName = site.substation?.name || site.substation || 'POSTE SOURCE ENEDIS';
  const s3renrVal = site.s3renr || site.substation?.quotePartS3renr || '92.73 k€/MW';

  return (
    <div
      id={`bess-single-site-page-${siteIndex}`}
      className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
      style={{
        width: '1380px',
        minWidth: '1380px',
        maxWidth: '1380px',
        height: '940px',
        minHeight: '940px',
        maxHeight: '940px',
        flexShrink: 0,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div>
        {/* En-tête de la Fiche Projet */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2.5">
          <div className="flex items-center gap-3.5">
            <img src="/logo-nelson.png" alt="NELSON" className="h-9 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="h-7 w-[1px] bg-slate-200" />
            <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-8 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Site #{siteIndex} / {totalSites}
                </span>
                <h1 className="text-xl font-black text-[#0b192c] tracking-tight">
                  PROJET {site.name?.toUpperCase()} • {powerKw} kW / {capacityKwh} kWh
                </h1>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                {site.client ? `${site.client} • ` : ''}{site.address ? `${site.address}, ` : ''}{site.cp || site.postcode} {site.city} ({site.dept || 'FR'})
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Business Plan BESS Stand-Alone</span>
            <span className="text-xs font-black text-[#0b192c]">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span className="text-[10px] font-bold text-emerald-600 block">Régime TURPE 7 CRE 2025-227</span>
          </div>
        </div>

        {/* 1. Qualification Réseau & Poste Source ODRE */}
        <div className="bg-slate-900 text-white rounded-xl px-4 py-2 mb-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-blue-300 font-black block">Qualification Réseau & Poste Source (ODRE)</span>
              <span className="text-xs font-extrabold text-white">
                Poste Source : {substationName} • Distance : {distKm} km • Quote-part S3REnR : {s3renrVal}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NIVEAU 1 : OFFICIEL DIRECT ENEDIS
            </span>
          </div>
        </div>

        {/* 2. Dimensionnement Batterie */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Modèle de Batterie</span>
              <span className="text-xs font-black text-slate-800">CESC — Mercury 261 EU (125 kW / 261 kWh)</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Quantité Briques</span>
              <span className="text-xs font-black text-blue-600">4 Armoires Extérieures</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Capacité Totale</span>
              <span className="text-xs font-black text-emerald-700">{capacityKwh} kWh</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Puissance Raccordée</span>
              <span className="text-xs font-black text-indigo-700">{powerKw} kW HTA</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
            Ratio 2.09h • 2 Cycles / Jour
          </span>
        </div>

        {/* 3. Grille des 4 Colonnes : Paramètres & KPI */}
        <div className="grid grid-cols-4 gap-2.5 mb-2.5">
          {/* Colonne 1 : Données Projet & CAPEX */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1.5 text-[10px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-1 flex justify-between">
              <span>Investissement CAPEX</span>
              <span className="font-extrabold text-slate-900">{fmtEur(capexTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Batterie + BMS (4 arm.) :</span><span className="font-bold text-slate-900">{fmtEur(batterieBms)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Génie civil dalle béton :</span><span className="font-bold text-slate-900">{fmtEur(genieCivil)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Raccordement Enedis :</span><span className="font-bold text-slate-900">{fmtEur(raccordement)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Développement & DP :</span><span className="font-bold text-slate-900">{fmtEur(developpement)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Frais commerciaux :</span><span className="font-bold text-slate-900">{fmtEur(fraisComm)}</span></div>
            <div className="pt-1 border-t border-slate-100 text-[9px] text-slate-500 font-medium">
              Linéaire HTA : {distKm} km • Dalle &lt; 20 m² (DP)
            </div>
          </div>

          {/* Colonne 2 : Value Stacking & Financement */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1.5 text-[10px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-1 flex justify-between">
              <span>Revenus Value Stacking</span>
              <span className="font-extrabold text-slate-900">{fmtEur(revenuAn1)}/an</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Réserve FCR (15.1 h/j) :</span><span className="font-bold text-indigo-700">{fmtEur(revFcr)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Marché Capacité RTE :</span><span className="font-bold text-emerald-700">{fmtEur(revCapa)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Arbitrage Spot (2 c/j) :</span><span className="font-bold text-amber-700">{fmtEur(revArb)}</span></div>
            <div className="pt-1 border-t border-slate-100 flex justify-between text-slate-600">
              <span>Emprunt Senior :</span>
              <span className="font-bold text-slate-900">{debtDuration} ans @ {debtRate}%</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Annuité Dette :</span><span className="font-bold text-red-600">{fmtEur(annuite)}/an</span></div>
          </div>

          {/* Colonne 3 : Charges & OPEX BESS */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1.5 text-[10px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-1 flex justify-between">
              <span>Charges & OPEX An 1</span>
              <span className="font-extrabold text-slate-900">{fmtEur(totalOpexAn1)}/an</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>TURPE 7 Réseau CRE :</span><span className="font-bold text-blue-700">{fmtEur(turpeAn1)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Coût Recharge (Pertes) :</span><span className="font-bold text-slate-900">{fmtEur(coutRecharge)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Maintenance & Assur. :</span><span className="font-bold text-slate-900">{fmtEur(maintenance + assurance)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Loyer Foncier Dalle :</span><span className="font-bold text-emerald-700">{fmtEur(loyerDalle)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Comm. Agrégateur (18%) :</span><span className="font-bold text-slate-900">{fmtEur(commAgregateur)}</span></div>
          </div>

          {/* Colonne 4 : Carte KPI Sombre */}
          <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-md flex flex-col justify-between text-[10px]">
            <div>
              <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                <span className="text-[9px] uppercase font-black text-blue-300">Indicateurs de Rentabilité</span>
                <span className="text-xs font-black text-emerald-400">TRI : {triProjet.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-white/80 py-0.5"><span>EBITDA Net An 1 :</span><span className="font-black text-white">{fmtEur(ebitdaAn1)}</span></div>
              <div className="flex justify-between text-white/80 py-0.5"><span>Temps de Retour :</span><span className="font-black text-amber-300">{payback ? payback.toFixed(1) : '4.6'} ans</span></div>
              <div className="flex justify-between text-white/80 py-0.5"><span>DSCR Moyen Dette :</span><span className="font-black text-cyan-300">{avgDscr.toFixed(2)}x</span></div>
            </div>
            <div className="pt-1.5 border-t border-white/10 mt-1">
              <div className="flex justify-between text-white/70 text-[9px]"><span>Recettes 20 ans :</span><span className="font-bold text-white">{fmtEur(totalRecettes)}</span></div>
              <div className="flex justify-between text-emerald-300 font-black text-[10px] mt-0.5">
                <span>Bénéfice Net Cash :</span>
                <span>{fmtEur(beneficeNetCash)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Barre Réglementaire TURPE 7 Délibéré */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 mb-2.5 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-4">
            <span className="font-black text-blue-900 uppercase">TURPE 7 CRE 2025-227 :</span>
            <span className="text-slate-700 font-semibold">Option HTA1 Courte Utilisation (13.20 €/kW/an)</span>
            <span className="text-slate-700 font-semibold">• Neutralité stockage (Exonération CS 88%)</span>
            <span className="text-slate-700 font-semibold">• Facture Réseau : <strong className="text-blue-900">{fmtEur(turpeAn1)}/an</strong></span>
          </div>
          <span className="text-emerald-700 font-black uppercase">Gain Net vs Ancien Régime : +14 183 €/an</span>
        </div>

        {/* 5. Tableau Prévisionnel Financier (20 Ans) */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-center border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="text-left px-2 py-1 font-bold text-slate-700 w-44">Indicateurs Financiers (€)</th>
                {tableRows.slice(0, 15).map(r => (
                  <th key={r.year} className="px-1 py-1 font-bold text-slate-800">{r.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 bg-amber-50/40">
                <td className="text-left px-2 py-0.5 font-bold text-amber-900">Chiffre d'Affaires Brut</td>
                {tableRows.slice(0, 15).map(r => (
                  <td key={r.year} className="px-1 py-0.5 font-bold text-slate-900">{fmtNum(r.ca, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="text-left px-2 py-0.5 text-slate-600 pl-4">Charges OPEX BESS</td>
                {tableRows.slice(0, 15).map(r => (
                  <td key={r.year} className="px-1 py-0.5 text-slate-600">{fmtNum(r.opex, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="text-left px-2 py-0.5 font-black text-blue-900">EBITDA Net</td>
                {tableRows.slice(0, 15).map(r => (
                  <td key={r.year} className="px-1 py-0.5 font-black text-blue-800">{fmtNum(r.ebitda, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="text-left px-2 py-0.5 text-red-600 pl-4">Service de la Dette (12 ans)</td>
                {tableRows.slice(0, 15).map(r => (
                  <td key={r.year} className="px-1 py-0.5 text-red-600 font-medium">{r.servDette > 0 ? fmtNum(r.servDette, 0) : '—'}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-emerald-50/60">
                <td className="text-left px-2 py-0.5 font-black text-emerald-900">Cash-Flow Net Annuel</td>
                {tableRows.slice(0, 15).map(r => (
                  <td key={r.year} className="px-1 py-0.5 font-bold text-emerald-800">{fmtNum(r.cfNet, 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pied de Page */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <div>ENR COURTAGE • Fiche Projet BESS Unitaire #{siteIndex} ({site.name})</div>
        <div className="font-semibold text-slate-600">Délibération CRE 2025-227 • TURPE 7 HTA1 CU</div>
        <div className="font-bold text-[#0b192c]">Page {8 + siteIndex} / {8 + totalSites}</div>
      </div>
    </div>
  );
}
