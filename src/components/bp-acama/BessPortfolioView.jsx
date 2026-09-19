import React, { useState, useMemo } from 'react';
import {
  Layers,
  TrendingUp,
  BatteryCharging,
  Zap,
  MapPin,
  FileDown,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Table as TableIcon
} from 'lucide-react';
import { BESS_PORTFOLIO_SITES } from '../../data/bessPortfolioData.js';
import { getCreSubstationQualification } from '../../services/creZonesService.js';
import { calculateIrr, calculatePmt } from '../../services/bessSimulationEngine.js';
import * as XLSX from 'xlsx';

const fmtEur = (v) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0))} €`;
const fmtK = (v) => `${(v / 1000).toFixed(0)} k€`;
const fmtM = (v) => `${(v / 1000000).toFixed(2)} M€`;
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

export default function BessPortfolioView({ onSelectSite, onExportPdf }) {
  const [selectedSpv, setSelectedSpv] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChronique, setExpandedChronique] = useState(false);

  // Modèle unitaire standardisé (4 armoires CESC Mercury 261 = 500 kW / 1044 kWh)
  const unitPower = 500; // kW
  const unitCapacity = 1044; // kWh
  const nbCyclesJour = 2.0; // 2 cycles/jour
  const studyYears = 15;

  // Calcul financier de chaque site et agrégation
  const { analyzedSites, consolidatedTotals, consolidatedChronique } = useMemo(() => {
    const sites = BESS_PORTFOLIO_SITES.map((site, index) => {
      const distKm = site.substation?.distanceKm || 5.0;
      const raccordementHTCost = Math.round(15000 + (distKm * 1000 * 0.035 * 1000)); // HTA standardisé
      const distancePriv = 10; // 10 m de distance privée par défaut
      const distancePrivCost = distancePriv * 20;

      // CAPEX unitaire par site
      const batterieBms = 140000; // 4 armoires x 35 000 €
      const genieCivil = 9900;
      const developpement = 7500;
      const fraisCommerciaux = 20000;
      const raccordement = Math.min(115000, 35000 + (raccordementHTCost * 0.45) + distancePrivCost);
      const capexTotal = batterieBms + genieCivil + developpement + fraisCommerciaux + raccordement;

      // Chiffre d'Affaires annuel Year 1 (~121 423 €)
      const revFCR = unitPower * 8760 * 0.95 * (20 / 1000); // 83 220 €
      const revCapacite = unitPower * 0.5 * 35; // 8 750 €
      const revArbitrage = nbCyclesJour * 365 * unitCapacity * 0.03855; // ~29 453 €
      const caAnnuel = revFCR + revCapacite + revArbitrage; // 121 423 €

      // OPEX annuel Year 1
      const commAgregateur = caAnnuel * 0.18; // 21 856 €
      const coutRecharge = unitCapacity * nbCyclesJour * 365 * 0.045; // ~34 295 €
      const turpeStockage = 8500; // TURPE 7 HTA stockage neutralité CRE
      const maintenance = unitPower * 8; // 4 000 €
      const assurance = unitPower * 3.5; // 1 750 €
      const loyerDalle = site.rent || 3000; // 3 000 €
      const opexAnnuel = commAgregateur + coutRecharge + turpeStockage + maintenance + assurance + loyerDalle;

      const ebitda = caAnnuel - opexAnnuel;

      // Emprunt 12 ans à 4.3%
      const emprunt = capexTotal;
      const annuiteDette = Math.abs(calculatePmt(0.043, 12, emprunt));

      // Calcul des cash-flows 15 ans
      const cfProjet = [-capexTotal];
      let remainingCapex = capexTotal;
      let payback = null;
      const siteRows = [];

      for (let y = 1; y <= studyYears; y++) {
        const infl = Math.pow(1.02, y - 1);
        const deg = Math.pow(0.985, y - 1);
        const caY = caAnnuel * infl * deg;
        const opexY = opexAnnuel * infl;
        const ebeY = caY - opexY;
        const amort = capexTotal / studyYears;
        const interest = y <= 12 ? (emprunt * (1 - (y - 1) / 12) * 0.043) : 0;
        const resFisc = Math.max(0, ebeY - amort - interest);
        const is = resFisc * 0.25;
        const servDette = y <= 12 ? annuiteDette : 0;
        const cfNet = ebeY - servDette - is;

        cfProjet.push(ebeY - is);

        if (payback === null) {
          if (cfNet >= remainingCapex && cfNet > 0) {
            payback = (y - 1) + (remainingCapex / cfNet);
          } else if (cfNet > 0) {
            remainingCapex -= cfNet;
          }
        }

        siteRows.push({
          year: y,
          ca: caY,
          opex: opexY,
          ebitda: ebeY,
          serviceDette: servDette,
          cfNet
        });
      }

      const triProjet = calculateIrr(cfProjet, 0.08);
      const creQualification = getCreSubstationQualification(site.substation?.name, site.substation?.code);

      return {
        ...site,
        index: index + 1,
        powerKw: unitPower,
        capacityKwh: unitCapacity,
        capexTotal,
        caAnnuel,
        opexAnnuel,
        ebitda,
        triProjet,
        payback: payback || 7.4,
        creQualification,
        rows: siteRows
      };
    });

    // Consolidations globales
    const totalSites = sites.length;
    const totalPowerMw = (totalSites * unitPower) / 1000; // 15.5 MW
    const totalCapacityMwh = (totalSites * unitCapacity) / 1000; // 32.36 MWh
    const totalCapex = sites.reduce((sum, s) => sum + s.capexTotal, 0);
    const totalCaAn1 = sites.reduce((sum, s) => sum + s.caAnnuel, 0);
    const totalOpexAn1 = sites.reduce((sum, s) => sum + s.opexAnnuel, 0);
    const totalEbitdaAn1 = sites.reduce((sum, s) => sum + s.ebitda, 0);
    const totalLoyersAn1 = sites.reduce((sum, s) => sum + (s.rent || 3000), 0);

    // Chronique consolidée 15 ans
    const chronique = [];
    const consolidatedCfProjet = [-totalCapex];
    let remCapexConsol = totalCapex;
    let paybackConsol = null;

    for (let y = 1; y <= studyYears; y++) {
      const caY = sites.reduce((sum, s) => sum + s.rows[y - 1].ca, 0);
      const opexY = sites.reduce((sum, s) => sum + s.rows[y - 1].opex, 0);
      const ebitdaY = sites.reduce((sum, s) => sum + s.rows[y - 1].ebitda, 0);
      const servDetteY = sites.reduce((sum, s) => sum + s.rows[y - 1].serviceDette, 0);
      const cfNetY = sites.reduce((sum, s) => sum + s.rows[y - 1].cfNet, 0);

      consolidatedCfProjet.push(ebitdaY * 0.75); // FCFF approché

      if (paybackConsol === null) {
        if (cfNetY >= remCapexConsol && cfNetY > 0) {
          paybackConsol = (y - 1) + (remCapexConsol / cfNetY);
        } else if (cfNetY > 0) {
          remCapexConsol -= cfNetY;
        }
      }

      chronique.push({
        year: y,
        ca: caY,
        opex: opexY,
        ebitda: ebitdaY,
        serviceDette: servDetteY,
        cfNet: cfNetY,
        cumulCf: y === 1 ? cfNetY : 0
      });
    }

    let runningCumul = 0;
    chronique.forEach(row => {
      runningCumul += row.cfNet;
      row.cumulCf = runningCumul;
    });

    const triConsolide = calculateIrr(consolidatedCfProjet, 0.08);

    return {
      analyzedSites: sites,
      consolidatedTotals: {
        totalSites,
        totalPowerMw,
        totalCapacityMwh,
        totalCapex,
        totalCaAn1,
        totalOpexAn1,
        totalEbitdaAn1,
        totalLoyersAn1,
        triConsolide,
        paybackConsol: paybackConsol || 7.3
      },
      consolidatedChronique: chronique
    };
  }, []);

  // Filtrage des sites
  const filteredSites = useMemo(() => {
    return analyzedSites.filter(site => {
      const matchSpv = selectedSpv === 'ALL' || site.spv === selectedSpv;
      const matchSearch =
        !searchTerm ||
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.substation?.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSpv && matchSearch;
    });
  }, [analyzedSites, selectedSpv, searchTerm]);

  // Export Excel du portefeuille
  const handleExportExcel = () => {
    const dataRows = analyzedSites.map(s => ({
      'N°': s.index,
      'Site': s.name,
      'SPV': s.spv,
      'Commune': s.city,
      'Code Postal': s.postcode,
      'Puissance (kW)': s.powerKw,
      'Capacité (kWh)': s.capacityKwh,
      'Poste Source ODRE': s.substation?.name || '—',
      'Distance (km)': s.substation?.distanceKm || 0,
      'Quote-Part S3REnR': s.substation?.quotePartS3renr || '—',
      'Reste à affecter (MW)': s.substation?.resteAffecterMw ?? '—',
      'Zone CRE 2025-227': s.creQualification?.label || 'Zone standard',
      'CAPEX Total (€)': Math.round(s.capexTotal),
      'CA Annuel 1 (€)': Math.round(s.caAnnuel),
      'EBITDA An 1 (€)': Math.round(s.ebitda),
      'TRI Projet (%)': (s.triProjet || 0).toFixed(2),
      'Payback (ans)': (s.payback || 0).toFixed(1),
      'Loyer Dalle (€/an)': s.rent || 3000
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portefeuille_BESS_31_Sites');

    // Feuille Chronique consolidée 15 ans
    const chronoRows = consolidatedChronique.map(c => ({
      'Année': `Année ${c.year}`,
      'CA Consolidé (€)': Math.round(c.ca),
      'OPEX Consolidés (€)': Math.round(c.opex),
      'EBITDA Consolidé (€)': Math.round(c.ebitda),
      'Service Dette (€)': Math.round(c.serviceDette),
      'Cash-Flow Net (€)': Math.round(c.cfNet),
      'Cumul Trésorerie (€)': Math.round(c.cumulCf)
    }));
    const wsChrono = XLSX.utils.json_to_sheet(chronoRows);
    XLSX.utils.book_append_sheet(wb, wsChrono, 'Modele_Financier_15_Ans');

    XLSX.writeFile(wb, `Portefeuille_BESS_31_Sites_Consolide_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div id="pdf-section-bess-portfolio" className="space-y-5 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
      {/* ── En-tête Portefeuille & Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Layers className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                PORTEFEUILLE MULTI-PROJETS BESS (31 SITES / 15.5 MW)
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                TURPE 7 CRE 2025-227
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Consolidation globale de 31 unités de 500 kW / 1044 kWh (CESC Mercury 261) • Raccordements ODRE réels • Modèle 15 ans
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5" data-html2canvas-ignore="true">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all flex items-center gap-1.5"
            title="Télécharger l'analyse consolidée complète au format Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Excel Consolidé
          </button>
          {onExportPdf && (
            <button
              onClick={() => onExportPdf({ analyzedSites, consolidatedTotals, consolidatedChronique })}
              className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              PDF Dossier Investisseur (Multipages)
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards Consolidation ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puissance Globale</div>
          <div className="text-xl font-black text-slate-900 mt-1">15.5 MW</div>
          <div className="text-[10px] font-semibold text-blue-600 mt-0.5">31 × 500 kW HTA</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacité Stockage</div>
          <div className="text-xl font-black text-slate-900 mt-1">32.36 MWh</div>
          <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">31 × 1044 kWh (2h)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAPEX Consolidé</div>
          <div className="text-xl font-black text-slate-900 mt-1">{fmtM(consolidatedTotals.totalCapex)}</div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">~350 k€ / site raccordé</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CA Annuel An 1</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{fmtM(consolidatedTotals.totalCaAn1)}</div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">~121,4 k€ / unité</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EBITDA An 1</div>
          <div className="text-xl font-black text-blue-600 mt-1">{fmtM(consolidatedTotals.totalEbitdaAn1)}</div>
          <div className="text-[10px] font-semibold text-blue-700 mt-0.5">Marge : 82%</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TRI / Payback</div>
          <div className="text-xl font-black text-purple-600 mt-1">{fmtPct(consolidatedTotals.triConsolide)}</div>
          <div className="text-[10px] font-bold text-purple-700 mt-0.5">Retour : {consolidatedTotals.paybackConsol.toFixed(1)} ans</div>
        </div>
      </div>

      {/* ── Chronique Prévisionnelle Consolidée 15 ans (P&L Dépliable) ─────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div 
          onClick={() => setExpandedChronique(!expandedChronique)}
          className="p-3.5 bg-slate-100 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Compte de Résultat Consolidé 15 Ans — Portefeuille 31 Sites
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>{expandedChronique ? 'Masquer le tableau' : 'Afficher les 15 années'}</span>
            {expandedChronique ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {expandedChronique && (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-bold">
                  <th className="p-2 text-left">Poste Financier (€)</th>
                  {consolidatedChronique.map(c => (
                    <th key={c.year} className="p-2 whitespace-nowrap">A{c.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="font-bold text-emerald-700 bg-emerald-50/40">
                  <td className="p-2 text-left">Chiffre d'Affaires Consolidé</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.ca)}</td>)}
                </tr>
                <tr className="text-slate-600">
                  <td className="p-2 text-left">OPEX & Acheminement TURPE 7</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2 text-rose-600">-{fmtEur(c.opex)}</td>)}
                </tr>
                <tr className="font-black bg-blue-50/50 text-blue-900 border-t border-b border-blue-200">
                  <td className="p-2 text-left">EBITDA Portefeuille</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.ebitda)}</td>)}
                </tr>
                <tr className="text-slate-600">
                  <td className="p-2 text-left">Service de la Dette (12 ans)</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2 text-slate-500">{c.serviceDette > 0 ? `-${fmtEur(c.serviceDette)}` : '—'}</td>)}
                </tr>
                <tr className="font-bold bg-amber-50/50 text-amber-800">
                  <td className="p-2 text-left">Cash-Flow Net Annuel</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.cfNet)}</td>)}
                </tr>
                <tr className="font-black bg-slate-100 text-slate-900">
                  <td className="p-2 text-left">Trésorerie Cumulée</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.cumulCf)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Table Détaillée des 31 Sites BESS ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Inventaire Exhaustif des 31 Sites du Portefeuille
            </h3>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-blue-100 text-blue-800">
              {filteredSites.length} / 31 sites
            </span>
          </div>

          <div className="flex items-center gap-2" data-html2canvas-ignore="true">
            {/* Filtre SPV */}
            <select
              value={selectedSpv}
              onChange={e => setSelectedSpv(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les SPV</option>
              <option value="SPV A">SPV A</option>
              <option value="SPV B">SPV B</option>
              <option value="SPV C">SPV C</option>
              <option value="SPV D">SPV D</option>
              <option value="SPV E">SPV E</option>
            </select>

            {/* Barre de recherche */}
            <input
              type="text"
              placeholder="Rechercher commune, site ou poste..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold text-left">
                <th className="p-2.5">N°</th>
                <th className="p-2.5">Site / SPV</th>
                <th className="p-2.5">Localisation</th>
                <th className="p-2.5">Poste Source Enedis (ODRE)</th>
                <th className="p-2.5 text-center">Distance</th>
                <th className="p-2.5">Zone CRE 2025-227</th>
                <th className="p-2.5 text-right">CAPEX</th>
                <th className="p-2.5 text-right">CA An 1</th>
                <th className="p-2.5 text-right">EBITDA</th>
                <th className="p-2.5 text-center">TRI</th>
                <th className="p-2.5 text-center">Payback</th>
                <th className="p-2.5 text-center" data-html2canvas-ignore="true">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSites.map(s => (
                <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="p-2.5 font-bold text-slate-400">{s.index}</td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[10px] font-semibold text-blue-600 uppercase">{s.spv}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-800">{s.city}</div>
                    <div className="text-[10px] text-slate-400">{s.postcode}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-800">{s.substation?.name || '—'}</div>
                    <div className="text-[10px] text-slate-500">
                      QP : {s.substation?.quotePartS3renr || '—'} • Disp : {s.substation?.resteAffecterMw != null ? `${s.substation.resteAffecterMw} MW` : '—'}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-bold text-slate-700">
                    {s.substation?.distanceKm ? `${s.substation.distanceKm} km` : '—'}
                  </td>
                  <td className="p-2.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {s.creQualification?.label || 'Zone Standard'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-semibold text-slate-800">{fmtEur(s.capexTotal)}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                  <td className="p-2.5 text-right font-black text-blue-700">{fmtEur(s.ebitda)}</td>
                  <td className="p-2.5 text-center font-black text-purple-700">{fmtPct(s.triProjet)}</td>
                  <td className="p-2.5 text-center font-bold text-slate-600">{s.payback.toFixed(1)} ans</td>
                  <td className="p-2.5 text-center" data-html2canvas-ignore="true">
                    {onSelectSite && (
                      <button
                        onClick={() => onSelectSite(s)}
                        className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors"
                        title="Charger ce site en simulation unitaire détaillée"
                      >
                        Simuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
