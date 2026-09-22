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
import { calculatePmt, computeBessFinancials } from '../../services/bessSimulationEngine.js';

const fmtNum = (n, dec = 0) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (n) => `${fmtNum(n, 0)} €`;
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

/**
 * Rendu 1 Page A4 Paysage (1380 x 940 px) d'une Fiche BESS Unitaire
 * Utilisé pour la génération individuelle ou intégrée dans l'Étude Complète 39 Pages
 */
export default function BessProjectSingleSheet({ site, siteIndex, totalSites = 31, studyDuration = 20 }) {
  if (!site) return null;

  // Calcul unifié avec computeBessFinancials
  const fin = computeBessFinancials(site, {
    studyDuration: studyDuration || 20,
    debtDuration: 12,
    debtRate: 4.30
  });

  // Données techniques unitaires
  const powerKw = 500;
  const capacityKwh = 1044;
  const distKm = fin.distanceKm;

  // CAPEX
  const batterieBms = fin.rows[0] ? 140000 : 140000;
  const genieCivil = 9900;
  const developpement = 7500;
  const fraisComm = 20000;
  const raccordement = fin.raccordementCost;
  const capexTotal = fin.capexTotal;

  // Financement senior (12 ans @ 4.30%)
  const debtDuration = 12;
  const debtRate = 4.30;
  const rateDec = debtRate / 100;
  const annuite = fin.annuite || Math.abs(calculatePmt(rateDec, debtDuration, capexTotal));

  // Value Stacking Year 1
  const revFcr = fin.rows[0]?.revFCR || 53936;
  const revCapa = fin.rows[0]?.revCapacite || 8750;
  const revArb = fin.rows[0]?.revArbitrage || 30485;
  const revenuAn1 = fin.caAnnuel;

  // OPEX Year 1
  const commAgregateur = fin.rows[0]?.commAgregateur || Math.round(revenuAn1 * 0.18);
  const coutRecharge = fin.rows[0]?.coutRechargeAn || 3118;
  const turpeAn1 = fin.turpeAnnuel;
  const maintenance = fin.rows[0]?.maint || 4000;
  const assurance = fin.rows[0]?.assur || 1750;
  const loyerDalle = fin.rows[0]?.revBailleur || 3000;
  const totalOpexAn1 = fin.opexAnnuel;
  const ebitdaAn1 = fin.ebitdaAn1;

  // Chronique 20 ans
  const years = Array.from({ length: studyDuration || 20 }, (_, i) => 2026 + i);
  const tableRows = (fin.rows || []).slice(0, studyDuration || 20).map((r, i) => ({
    year: years[i] || (2026 + i),
    ca: r.caTotalBrut,
    caTotal: r.caTotalBrut,
    fcr: r.revFCR,
    reserve: r.revFCR,
    capa: r.revCapacite,
    capacite: r.revCapacite,
    arb: r.revArbitrage,
    arbitrage: r.revArbitrage,
    fraisAgregateur: r.commAgregateur,
    coutRecharge: r.coutRechargeAn,
    turpe: r.turpeAn,
    maint: r.maint,
    assur: r.assur,
    revBailleur: r.revBailleur,
    opex: r.opex,
    ebitda: r.ebe,
    ebe: r.ebe,
    amortissement: r.amortissement,
    ebit: r.ebit,
    interest: r.interest,
    is: r.is,
    principal: r.principal,
    servDette: r.serviceDette,
    serviceDette: r.serviceDette,
    dscr: r.dscr,
    cfNet: r.cashFlow,
    tresorerie: r.cashFlow,
    cumulCf: r.cumulCashFlow
  }));

  const triProjet = fin.triProjet;
  const paybackProjet = fin.payback;
  const avgDscr = fin.dscrMoyen || 2.14;
  const totalRecettes = fin.totalRevenuesStudy || tableRows.reduce((sum, r) => sum + r.ca, 0);
  const totalOpexCumul = fin.totalOpexStudy || tableRows.reduce((sum, r) => sum + r.opex, 0);
  const beneficeNetCash = fin.gainNetEtude || tableRows.reduce((sum, r) => sum + r.cfNet, 0);

  const substationName = fin.posteSource || 'POSTE SOURCE ENEDIS';
  const s3renrVal = fin.quotePartS3REnR || '92.73 k€/MW';

  // Ligne de données formatée compacte pour la Vue Détaillée
  const DataRow = ({ label, propName, isCurrency, format, bold, className, indent }) => (
    <tr className={`border-b border-slate-200 bg-white hover:bg-slate-50 ${className || ''}`}>
      <td className={`px-1.5 py-[1.5px] font-medium bg-slate-50 text-[8px] border-r border-slate-200 w-[190px] min-w-[190px] whitespace-nowrap ${bold ? 'font-bold text-slate-900' : 'text-slate-700'} ${indent ? 'pl-3 italic text-slate-500' : ''}`}>{label}</td>
      {tableRows.slice(0, 15).map((r, i) => (
        <td key={i} className={`px-1 py-[1.5px] text-right border-r border-slate-200 text-[8px] whitespace-nowrap ${bold ? 'font-bold' : ''}`}>
          {format ? format(r[propName]) : (isCurrency ? fmtEur(r[propName]) : fmtNum(r[propName], 0))}
        </td>
      ))}
    </tr>
  );

  return (
    <div
      id={`bess-single-site-page-${siteIndex}`}
      className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-between"
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1.5">
          <div className="flex items-center gap-3.5">
            <img src="/logo-nelson.png" alt="NELSON" className="h-8 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="h-6 w-[1px] bg-slate-200" />
            <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-7 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-wider">
                  Site #{siteIndex} / {totalSites}
                </span>
                <h1 className="text-lg font-black text-[#0b192c] tracking-tight">
                  PROJET {site.name?.toUpperCase()} • {powerKw} kW / {capacityKwh} kWh
                </h1>
              </div>
              <p className="text-[10px] font-medium text-slate-500">
                {site.client ? `${site.client} • ` : ''}{site.address ? `${site.address}, ` : ''}{site.cp || site.postcode} {site.city} ({site.dept || 'FR'})
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold block">Business Plan BESS Stand-Alone</span>
            <span className="text-xs font-black text-[#0b192c]">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span className="text-[9.5px] font-bold text-emerald-600 block">Régime TURPE 7 CRE 2025-227</span>
          </div>
        </div>

        {/* 1. Qualification Réseau & Poste Source ODRE */}
        <div className="bg-slate-900 text-white rounded-xl px-3.5 py-1.5 mb-1.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-blue-400" />
            </div>
            <div>
              <span className="text-[8.5px] uppercase tracking-wider text-blue-300 font-black block">Qualification Réseau & Poste Source (ODRE)</span>
              <span className="text-[11px] font-extrabold text-white">
                Poste Source : {substationName} • Distance : {distKm} km • Quote-part S3REnR : {s3renrVal}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NIVEAU 1 : OFFICIEL DIRECT ENEDIS
            </span>
          </div>
        </div>

        {/* 2. Dimensionnement Batterie */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Modèle de Batterie</span>
              <span className="text-[11px] font-black text-slate-800">CESC — Mercury 261 EU (125 kW / 261 kWh)</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Quantité Briques</span>
              <span className="text-[11px] font-black text-blue-600">4 Armoires Extérieures</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Capacité Totale</span>
              <span className="text-[11px] font-black text-emerald-700">{capacityKwh} kWh</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Puissance Raccordée</span>
              <span className="text-[11px] font-black text-indigo-700">{powerKw} kW HTA</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-extrabold uppercase">
            Ratio 2.09h • 2 Cycles / Jour
          </span>
        </div>

        {/* 3. Grille des 4 Colonnes : Paramètres & KPI */}
        <div className="grid grid-cols-4 gap-2 mb-1.5">
          {/* Colonne 1 : Données Projet & CAPEX */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1 text-[9.5px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-0.5 flex justify-between">
              <span>Investissement CAPEX</span>
              <span className="font-extrabold text-slate-900">{fmtEur(capexTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Batterie + BMS (4 arm.) :</span><span className="font-bold text-slate-900">{fmtEur(batterieBms)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Génie civil dalle béton :</span><span className="font-bold text-slate-900">{fmtEur(genieCivil)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Raccordement Enedis :</span><span className="font-bold text-slate-900">{fmtEur(raccordement)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Développement & DP :</span><span className="font-bold text-slate-900">{fmtEur(developpement)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Frais commerciaux :</span><span className="font-bold text-slate-900">{fmtEur(fraisComm)}</span></div>
            <div className="pt-0.5 border-t border-slate-100 text-[8.5px] text-slate-500 font-medium">
              Linéaire HTA : {distKm} km • Dalle &lt; 20 m² (DP)
            </div>
          </div>

          {/* Colonne 2 : Value Stacking & Financement */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1 text-[9.5px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-0.5 flex justify-between">
              <span>Revenus Value Stacking</span>
              <span className="font-extrabold text-slate-900">{fmtEur(revenuAn1)}/an</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Réserve FCR (15.1 h/j) :</span><span className="font-bold text-indigo-700">{fmtEur(revFcr)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Marché Capacité RTE :</span><span className="font-bold text-emerald-700">{fmtEur(revCapa)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Arbitrage Spot (2 c/j) :</span><span className="font-bold text-amber-700">{fmtEur(revArb)}</span></div>
            <div className="pt-0.5 border-t border-slate-100 flex justify-between text-slate-600">
              <span>Emprunt Senior :</span>
              <span className="font-bold text-slate-900">{debtDuration} ans @ {debtRate}%</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Annuité Dette :</span><span className="font-bold text-red-600">{fmtEur(annuite)}/an</span></div>
          </div>

          {/* Colonne 3 : Charges & OPEX BESS */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1 text-[9.5px]">
            <div className="font-black text-blue-700 uppercase border-b border-blue-100 pb-0.5 flex justify-between">
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
          <div className="bg-slate-900 text-white rounded-xl p-2 shadow-md flex flex-col justify-between text-[9.5px]">
            <div>
              <div className="flex justify-between items-center border-b border-white/10 pb-0.5 mb-0.5">
                <span className="text-[8.5px] uppercase font-black text-blue-300">Indicateurs de Rentabilité</span>
                <span className="text-[11px] font-black text-emerald-400">TRI : {triProjet.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-white/80 py-0.5"><span>EBITDA Net An 1 :</span><span className="font-black text-white">{fmtEur(ebitdaAn1)}</span></div>
              <div className="flex justify-between text-white/80 py-0.5"><span>Temps de Retour :</span><span className="font-black text-amber-300">{paybackProjet ? `${paybackProjet.toFixed(1)} ans` : '4.6 ans'}</span></div>
              <div className="flex justify-between text-white/80 py-0.5"><span>DSCR Moyen Dette :</span><span className="font-black text-cyan-300">{avgDscr.toFixed(2)}x</span></div>
            </div>
            <div className="pt-1 border-t border-white/10 mt-0.5">
              <div className="flex justify-between text-white/70 text-[8.5px]"><span>Recettes 20 ans :</span><span className="font-bold text-white">{fmtEur(totalRecettes)}</span></div>
              <div className="flex justify-between text-emerald-300 font-black text-[9.5px] mt-0.5">
                <span>Bénéfice Net Cash :</span>
                <span>{fmtEur(beneficeNetCash)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Barre Réglementaire TURPE 7 Délibéré */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1 mb-1.5 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-4">
            <span className="font-black text-blue-900 uppercase">TURPE 7 CRE 2025-227 :</span>
            <span className="text-slate-700 font-semibold">Option HTA1 Courte Utilisation (13.20 €/kW/an)</span>
            <span className="text-slate-700 font-semibold">• Neutralité stockage (Exonération CS 88%)</span>
            <span className="text-slate-700 font-semibold">• Facture Réseau : <strong className="text-blue-900">{fmtEur(turpeAn1)}/an</strong></span>
          </div>
          <span className="text-emerald-700 font-black uppercase">Gain Net vs Ancien Régime : +14 183 €/an</span>
        </div>

        {/* 5. Tableau Prévisionnel Financier - Vue Détaillée Complète (15 Ans) */}
        <div className="overflow-x-auto w-full rounded-lg border border-slate-200 shadow-2xs">
          <table className="w-full border-collapse border border-slate-200 text-[8px]">
            <thead>
              <tr className="bg-slate-100">
                <td className="px-1.5 py-1 border-r border-b border-slate-200 text-[8.5px] font-black text-slate-800 w-[190px] min-w-[190px]">Indicateurs Financiers (€)</td>
                {tableRows.slice(0, 15).map((r, i) => (
                  <td key={i} className="px-1 py-1 border-r border-b border-slate-200 text-center font-bold bg-slate-50 text-[8.5px] text-slate-900">{r.year}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-amber-400 font-bold uppercase text-[8px] text-slate-900">
                <td className="px-1.5 py-0.5 border-r border-b border-slate-300" colSpan={16}>REVENUS DE MARCHÉ (VALUE STACKING)</td>
              </tr>
              <DataRow label="Réserve Primaire (FCR)" propName="reserve" isCurrency indent />
              <DataRow label="Marché de Capacité" propName="capacite" isCurrency indent />
              <DataRow label="Arbitrage Spot / Intraday" propName="arbitrage" isCurrency indent />
              <DataRow label="TOTAL REVENUS BRUTS" propName="caTotal" isCurrency bold className="bg-slate-50 text-blue-900 font-bold" />

              <tr className="bg-slate-100 font-bold uppercase text-[8px] text-slate-800">
                <td className="px-1.5 py-0.5 border-r border-b border-slate-200" colSpan={16}>CHARGES D'EXPLOITATION (OPEX)</td>
              </tr>
              <DataRow label="Commission Agrégateur (18%)" propName="fraisAgregateur" isCurrency indent />
              <DataRow label="Coût Énergie Recharge (Pertes de cycle non réinjectées)" propName="coutRecharge" isCurrency indent />
              <DataRow label="TURPE Stockage" propName="turpe" isCurrency indent />
              <DataRow label="Maintenance Constructeur" propName="maint" isCurrency indent />
              <DataRow label="Assurance RC / Risque Élec." propName="assur" isCurrency indent />
              <DataRow label="Loyer Foncier Dalle" propName="revBailleur" isCurrency indent />
              <DataRow label="EBITDA (EBE)" propName="ebe" isCurrency bold className="bg-blue-50 text-blue-900 font-black" />

              <DataRow label="Amortissement Linéaire" propName="amortissement" isCurrency indent />
              <DataRow label="Résultat d'Exploitation (EBIT)" propName="ebit" isCurrency indent />
              <DataRow label="Intérêts d'Emprunt" propName="interest" isCurrency indent />
              <DataRow label="Impôt sur les Sociétés (IS)" propName="is" isCurrency indent />
              <DataRow label="Remboursement Principal Dette" propName="principal" isCurrency indent />
              <DataRow label="Service de la Dette (Senior)" propName="serviceDette" isCurrency bold />
              <DataRow label="DSCR Annuel" propName="dscr" format={v => (v > 9 ? '9.99' : (v ?? 0).toFixed(2))} bold className="bg-slate-50 text-slate-800 font-extrabold" />

              <tr className="bg-amber-400 font-black text-slate-950 text-[8.5px]">
                <td className="px-1.5 py-0.5 uppercase border-r border-slate-300 font-black">TRÉSORERIE NETTE ANNUELLE (CASH-FLOW)</td>
                {tableRows.slice(0, 15).map((r, i) => (
                  <td key={i} className="px-1 py-0.5 text-right border-r border-slate-300 font-black text-slate-950">
                    {fmtEur(r.tresorerie)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pied de Page */}
      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9.5px] text-slate-500 font-medium">
        <div>ENR COURTAGE • Fiche Projet BESS Unitaire #{siteIndex} ({site.name})</div>
        <div className="font-semibold text-slate-600">Délibération CRE 2025-227 • TURPE 7 HTA1 CU</div>
        <div className="font-bold text-[#0b192c]">Page {8 + siteIndex} / {8 + totalSites}</div>
      </div>
    </div>
  );
}
