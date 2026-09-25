import React, { useState, useMemo, useEffect } from 'react';
import {
  Sun,
  Layers,
  TrendingUp,
  Zap,
  MapPin,
  FileDown,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  CheckCircle2,
  Building2,
  Table as TableIcon,
  Landmark,
  Percent,
  Calendar,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { PV_PORTFOLIO_SITES, computePvFinancials, getPvPortfolioSites, normalizePortfolioName, getProjectPvPortfolio } from '../../data/pvPortfolioData.js';
import { exportPvPortfolioToExcel } from '../../services/exportPvExcel.js';
import { exportBessOdreMatrixToExcel } from '../../services/exportBessExcel.js';
import { calculatePmt, calculateProjectPayback, calculateIrr } from '../../services/bessSimulationEngine.js';
import { usePortfolios } from '@/contexts/PortfolioContext.jsx';
import PortfolioManagerModal from '@/components/portfolios/PortfolioManagerModal.jsx';
import { Plus, Settings } from 'lucide-react';

const fmtEur = (v) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0))} €`;
const fmtK = (v) => `${(v / 1000).toFixed(0)} k€`;
const fmtM = (v) => `${(v / 1000000).toFixed(2)} M€`;
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

export default function PvPortfolioView({ onSelectSite, onExportPdf, onDataChange, projects = [], initialPortfolio = 'HELIOS' }) {
  const { pvPortfolios, canManagePortfolios } = usePortfolios();
  const [selectedPortfolio, setSelectedPortfolio] = useState(initialPortfolio || 'HELIOS');
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [selectedSpv, setSelectedSpv] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChronique, setExpandedChronique] = useState(false);

  // Paramètres de dette senior modifiables
  const [debtDuration, setDebtDuration] = useState(20); // en années (e.g. 15, 18, 20)
  const [debtRate, setDebtRate] = useState(4.00); // en % (e.g. 3.50, 4.00, 4.30, 4.50)
  const studyYears = 20;

  useEffect(() => {
    if (initialPortfolio) setSelectedPortfolio(initialPortfolio);
  }, [initialPortfolio]);

  // Fusion multi-sources robuste pour garantir la présence des projets
  const effectiveProjectsList = useMemo(() => {
    const mergedMap = new Map();
    if (typeof window !== 'undefined') {
      try {
        const gList = JSON.parse(localStorage.getItem('nelson:projects:green-invest:v1') || '[]');
        const eList = JSON.parse(localStorage.getItem('nelson:projects:enr-courtage-energie:v1') || '[]');
        const aList = JSON.parse(localStorage.getItem('nelson:projects:acama:v1') || '[]');
        [...gList, ...eList, ...aList].forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });
      } catch (e) { }
    }
    (projects || []).forEach(p => { if (p && p.id) mergedMap.set(p.id, { ...(mergedMap.get(p.id) || {}), ...p }); });
    return Array.from(mergedMap.values());
  }, [projects]);

  // Harmonisation stricte : seuls les projets ayant le portefeuille PV affecté dans leur fiche
  const allPvSites = useMemo(() => {
    return getPvPortfolioSites(effectiveProjectsList, selectedPortfolio);
  }, [effectiveProjectsList, selectedPortfolio]);

  // Calcul financier de chaque site et agrégation avec dette dynamique
  const { analyzedSites, consolidatedTotals, consolidatedChronique } = useMemo(() => {
    const rateDecimal = (debtRate || 4.00) / 100;
    const durationYears = debtDuration || 20;

    const sites = allPvSites.map((site, index) => {
      const fin = computePvFinancials(site, {
        debtDuration: durationYears,
        debtRate: debtRate || 4.00,
        studyDuration: studyYears
      });

      return {
        ...site,
        index: index + 1,
        powerKwc: fin.kwc,
        prodMwh: fin.prodMwh,
        capexTotal: fin.capexTotal,
        caAnnuel: fin.caAnnuel,
        opexAnnuel: fin.opexAnnuel,
        ebitda: fin.ebitdaAn1,
        ebitdaAn1: fin.ebitdaAn1,
        triProjet: fin.triProjet,
        payback: fin.payback,
        fin,
        rows: fin.rows.map(r => ({
          year: r.year,
          ca: r.ca,
          opex: r.opex,
          ebitda: r.ebitda,
          serviceDette: r.serviceDette,
          cfNet: r.cfNet
        }))
      };
    });

    // Agrégation consolidée du portefeuille
    const totalSites = sites.length;
    const totalPowerMw = sites.reduce((sum, s) => sum + s.powerKwc, 0) / 1000;
    const totalProdMwh = sites.reduce((sum, s) => sum + s.prodMwh, 0);
    const totalCapex = sites.reduce((sum, s) => sum + s.capexTotal, 0);
    const totalCaAn1 = sites.reduce((sum, s) => sum + s.caAnnuel, 0);
    const totalOpexAn1 = sites.reduce((sum, s) => sum + s.opexAnnuel, 0);
    const totalEbitdaAn1 = sites.reduce((sum, s) => sum + s.ebitda, 0);
    const totalLoyersAn1 = sites.reduce((sum, s) => sum + (s.rent || 0), 0);
    const totalAnnuite = Math.abs(calculatePmt(rateDecimal, durationYears, totalCapex));

    // Chronique consolidée 20 ans
    const chronique = [];
    const consolidatedCfProjet = [-totalCapex];

    for (let y = 1; y <= studyYears; y++) {
      const caY = sites.reduce((sum, s) => sum + (s.rows[y - 1]?.ca || 0), 0);
      const opexY = sites.reduce((sum, s) => sum + (s.rows[y - 1]?.opex || 0), 0);
      const ebitdaY = caY - opexY;
      const servDetteY = y <= durationYears ? totalAnnuite : 0;
      const isY = sites.reduce((sum, s) => {
        const amort = s.capexTotal / studyYears;
        const interest = y <= durationYears ? (s.capexTotal * (1 - (y - 1) / durationYears) * rateDecimal) : 0;
        const resFisc = Math.max(0, (s.rows[y - 1]?.ebitda || 0) - amort - interest);
        return sum + (resFisc * 0.25);
      }, 0);
      const cfNetY = ebitdaY - servDetteY - isY;

      consolidatedCfProjet.push(ebitdaY - isY);

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

    const triConsolide = calculateIrr(consolidatedCfProjet, 0.06);
    const paybackConsol = calculateProjectPayback(totalCapex, chronique.map(c => c.ebitda));

    // Calcul du DSCR moyen portefeuille pendant la dette
    const dscrArray = chronique.filter(c => c.serviceDette > 0).map(c => c.ebitda / c.serviceDette);
    const avgDscr = dscrArray.length > 0 ? dscrArray.reduce((a, b) => a + b, 0) / dscrArray.length : 1.35;

    return {
      analyzedSites: sites,
      consolidatedTotals: {
        totalSites,
        totalPowerMw,
        totalProdMwh,
        totalCapex,
        totalCaAn1,
        totalOpexAn1,
        totalEbitdaAn1,
        totalLoyersAn1,
        totalAnnuite,
        avgDscr,
        debtDuration: durationYears,
        debtRate: debtRate,
        triConsolide,
        paybackConsol: paybackConsol || (totalCapex / totalEbitdaAn1)
      },
      consolidatedChronique: chronique
    };
  }, [allPvSites, debtDuration, debtRate]);

  // Propagation au parent
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        portfolioName: selectedPortfolio,
        debtDuration,
        debtRate,
        analyzedSites,
        consolidatedTotals,
        consolidatedChronique
      });
    }
  }, [selectedPortfolio, debtDuration, debtRate, analyzedSites, consolidatedTotals, consolidatedChronique, onDataChange]);

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

  const spvList = useMemo(() => {
    const set = new Set(allPvSites.map(s => s.spv || 'HÉLIOS SPV 1'));
    return Array.from(set);
  }, [allPvSites]);

  // Export Excel du business plan consolidé par site
  const handleExportExcel = () => {
    exportPvPortfolioToExcel(allPvSites, {
      debtDuration,
      debtRate,
      studyDuration: studyYears,
      portfolioName: selectedPortfolio
    });
  };

  // Export Excel de la Matrice Caparéseau ODRE
  const handleExportOdreMatrix = () => {
    exportBessOdreMatrixToExcel();
  };

  return (
    <div id="pdf-section-pv-portfolio" className="space-y-5 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
      {/* ── En-tête Portefeuille & Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950 to-orange-950 text-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                PORTEFEUILLE MULTI-PROJETS PV — {selectedPortfolio === 'ALL' ? 'CONSOLIDÉ' : selectedPortfolio} ({consolidatedTotals.totalSites} SITES / {consolidatedTotals.totalPowerMw.toFixed(2)} MWc)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase">
                {selectedPortfolio === 'ALL' ? 'TOUS LES PORTFOLIOS' : `PORTFOLIO ${selectedPortfolio}`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Consolidation {selectedPortfolio === 'ALL' ? 'globale' : `du portefeuille ${selectedPortfolio}`} de centrales toitures et hangars • Raccordements ODRE certifiés • Modèle 20 ans
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3" data-html2canvas-ignore="true">
          {/* Sélecteur dynamique de Portefeuille PV */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg border border-white/20">
            {pvPortfolios.map(port => {
              const count = effectiveProjectsList.filter(p => normalizePortfolioName(getProjectPvPortfolio(p)) === normalizePortfolioName(port.name)).length;
              const isSelected = normalizePortfolioName(selectedPortfolio) === normalizePortfolioName(port.name);
              return (
                <button
                  key={port.id}
                  type="button"
                  onClick={() => setSelectedPortfolio(port.name)}
                  className={`px-3 py-1.5 text-xs font-black rounded-md transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{port.name}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${isSelected ? 'bg-amber-900/60 text-amber-100 font-bold' : 'bg-white/10 text-slate-300'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedPortfolio('ALL')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                selectedPortfolio === 'ALL'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous ({allPvSites.length})
            </button>

            {canManagePortfolios && (
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(true)}
                className="px-2 py-1.5 text-xs font-bold text-amber-300 hover:text-white hover:bg-amber-500/20 rounded-md transition-all flex items-center gap-1 border-l border-white/20 ml-1 pl-2"
                title="Gérer les portefeuilles PV & BESS (Admin)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Gérer</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all flex items-center gap-1.5"
              title="Télécharger l'analyse consolidée complète au format Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              BP consolidé
            </button>
            <button
              onClick={handleExportOdreMatrix}
              className="px-3 py-2 text-xs font-bold bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-xs"
              title="Télécharger la matrice Caparéseau ODRE des postes sources au format Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
              Matrice ODRE
            </button>
          </div>
        </div>
      </div>

      {/* ── Paramètres de Financement Dette Sénior (Durée & Taux Modifiables) ── */}
      <div className="bg-white rounded-xl border-2 border-amber-200/80 shadow-md p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <Landmark className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  STRUCTURE & PARAMÈTRES DE FINANCEMENT (DETTE SÉNIOR PV)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Simulation Interactive
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ajustez la durée et le taux d'intérêt bancaire pour recalculer en temps réel le cash-flow, le DSCR moyen, le payback et les ratios du portefeuille.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Contrôle Durée de la Dette */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Durée d'Amortissement
              </label>
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                {debtDuration} ans
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {[15, 18, 20].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDebtDuration(d)}
                  className={`py-1 text-xs font-bold rounded-lg border transition-all ${
                    debtDuration === d
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d} ans
                </button>
              ))}
            </div>

            <input
              type="range"
              min="10"
              max="20"
              step="1"
              value={debtDuration}
              onChange={e => setDebtDuration(parseInt(e.target.value, 10))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>10 ans</span>
              <span>20 ans (Standard)</span>
            </div>
          </div>

          {/* Contrôle Taux d'Intérêt */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-orange-600" />
                Taux d'Intérêt Bancaire
              </label>
              <span className="text-xs font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                {debtRate.toFixed(2)} %
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 mb-2.5">
              {[3.50, 4.00, 4.30, 4.80].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDebtRate(r)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    debtRate === r
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.toFixed(2)}%
                </button>
              ))}
            </div>

            <input
              type="range"
              min="3.0"
              max="6.0"
              step="0.1"
              value={debtRate}
              onChange={e => setDebtRate(parseFloat(e.target.value))}
              className="w-full accent-orange-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>3.0%</span>
              <span>4.0%</span>
              <span>6.0%</span>
            </div>
          </div>

          {/* Annuité Totale */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Annuité Totale Dette
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">
              {fmtEur(consolidatedTotals.totalAnnuite)}/an
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              Dette senior sur {debtDuration} ans à {debtRate.toFixed(2)}%
            </div>
          </div>

          {/* Ratio DSCR */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Ratio DSCR Moyen
            </div>
            <div className="text-2xl font-black text-emerald-600 my-1">
              {consolidatedTotals.avgDscr.toFixed(2)}x
            </div>
            <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
              Couverture bancaire ({debtDuration} ans) • Seuil min: 1.17x
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Cartes KPI Consolidation ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puissance Globale</div>
          <div className="text-xl font-black text-slate-900 mt-1">{consolidatedTotals.totalPowerMw.toFixed(2)} MWc</div>
          <div className="text-[10px] font-semibold text-amber-600 mt-0.5">{consolidatedTotals.totalSites} centrales PV</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Production Annuelle</div>
          <div className="text-xl font-black text-slate-900 mt-1">{Math.round(consolidatedTotals.totalProdMwh).toLocaleString('fr-FR')} MWh</div>
          <div className="text-[10px] font-semibold text-orange-600 mt-0.5">Moyenne: ~1 160 kWh/kWc</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAPEX Consolidé</div>
          <div className="text-xl font-black text-slate-900 mt-1">{fmtM(consolidatedTotals.totalCapex)}</div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Centrale + Bâtiment + Réseau</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CA Annuel An 1</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{fmtM(consolidatedTotals.totalCaAn1)}</div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">Tarif S21 / ACC</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EBITDA An 1</div>
          <div className="text-xl font-black text-blue-600 mt-1">{fmtM(consolidatedTotals.totalEbitdaAn1)}</div>
          <div className="text-[10px] font-semibold text-blue-700 mt-0.5">Marge: ~88%</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TRI / Payback</div>
          <div className="text-xl font-black text-purple-600 mt-1">{fmtPct(consolidatedTotals.triConsolide)}</div>
          <div className="text-[10px] font-bold text-purple-700 mt-0.5">Retour: {consolidatedTotals.paybackConsol.toFixed(1)} ans</div>
        </div>
      </div>

      {/* ── Chronique Prévisionnelle Consolidée 20 ans (P&L Dépliable) ─────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div 
          onClick={() => setExpandedChronique(!expandedChronique)}
          className="p-3.5 bg-slate-100 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Compte de Résultat Consolidé 20 Ans — Portefeuille Photovoltaïque HÉLIOS
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>{expandedChronique ? 'Masquer le tableau' : 'Afficher les 20 années'}</span>
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
                  <td className="p-2 text-left">OPEX (Maintenance, Assurance, MRA)</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2 text-rose-600">-{fmtEur(c.opex)}</td>)}
                </tr>
                <tr className="font-black bg-amber-50/50 text-amber-900 border-t border-b border-amber-200">
                  <td className="p-2 text-left">EBITDA Portefeuille</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.ebitda)}</td>)}
                </tr>
                <tr className="text-slate-600">
                  <td className="p-2 text-left">Service de la Dette ({debtDuration} ans à {debtRate.toFixed(2)}%)</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2 text-slate-500">{c.serviceDette > 0 ? `-${fmtEur(c.serviceDette)}` : '—'}</td>)}
                </tr>
                <tr className="font-bold bg-blue-50/50 text-blue-900">
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

      {/* ── Table Détaillée des Sites PV ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Inventaire Exhaustif des Sites du Portefeuille PV
            </h3>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-800">
              {filteredSites.length} / {analyzedSites.length} sites
            </span>
          </div>

          <div className="flex items-center gap-2" data-html2canvas-ignore="true">
            {/* Filtre SPV */}
            <select
              value={selectedSpv}
              onChange={e => setSelectedSpv(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Toutes les SPV</option>
              {spvList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Champ de recherche */}
            <input
              type="text"
              placeholder="Rechercher commune, site ou poste..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                <th className="p-2.5">N°</th>
                <th className="p-2.5">Site / Bailleur</th>
                <th className="p-2.5">Localisation</th>
                <th className="p-2.5">Bâtiment / Modèle</th>
                <th className="p-2.5 text-right">kWc</th>
                <th className="p-2.5">Poste Source ODRE</th>
                <th className="p-2.5 text-center">Distance</th>
                <th className="p-2.5 text-center">Reste à aff. (Dist)</th>
                <th className="p-2.5 text-right">CAPEX</th>
                <th className="p-2.5 text-right">CA An 1</th>
                <th className="p-2.5 text-right">EBITDA</th>
                <th className="p-2.5 text-center">TRI</th>
                <th className="p-2.5 text-center">Payback</th>
                <th className="p-2.5 text-center" data-html2canvas-ignore="true">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSites.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Sun className="w-8 h-8 text-amber-400 opacity-60" />
                      <p className="font-bold text-sm text-slate-700">Aucun projet affecté au portefeuille HÉLIOS</p>
                      <p className="text-xs text-slate-500 max-w-md">
                        Pour faire apparaître un projet dans le portefeuille HÉLIOS et dans l'étude complète, rendez-vous dans sa fiche projet (onglet Client &amp; Projet) et sélectionnez le portefeuille <strong>HELIOS</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredSites.map(s => (
                <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="p-2.5 font-bold text-slate-500">{s.index}</td>
                  <td className="p-2.5 font-black text-slate-900">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{s.client}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-800">{s.city}</div>
                    <div className="text-[10px] text-slate-400">{s.postcode}</div>
                  </td>
                  <td className="p-2.5">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10.5px]">
                      {s.typeBat || 'Bâtiment BAC'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-black text-amber-700">
                    {s.powerKwc} kWc
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-800">{s.substation?.name || 'ODRE'}</div>
                    <div className="text-[9.5px] text-slate-400">{s.substation?.quotePartS3renr || '92.73 k€/MW'}</div>
                  </td>
                  <td className="p-2.5 text-center font-bold text-slate-700">
                    {s.substation?.distanceKm} km
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded font-black text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                      {s.substation?.resteAffecterMw ?? 0} ({s.substation?.distanceKm ?? 5})
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{fmtEur(s.capexTotal)}</td>
                  <td className="p-2.5 text-right font-black text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                  <td className="p-2.5 text-right font-black text-blue-600">{fmtEur(s.ebitdaAn1)}</td>
                  <td className="p-2.5 text-center font-black text-purple-700">{fmtPct(s.triProjet)}</td>
                  <td className="p-2.5 text-center font-bold text-amber-700">{s.payback.toFixed(1)} ans</td>
                  <td className="p-2.5 text-center" data-html2canvas-ignore="true">
                    <button
                      type="button"
                      onClick={() => onSelectSite && onSelectSite(s)}
                      className="px-2.5 py-1 text-[11px] font-black rounded bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
                      title="Ouvrir la simulation unitaire de ce projet"
                    >
                      Simuler
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PortfolioManagerModal
        open={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        projects={projects}
      />
    </div>
  );
}
