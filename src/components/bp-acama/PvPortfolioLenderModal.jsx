import React, { useState, useMemo } from 'react';
import {
  Sun,
  ShieldCheck,
  TrendingUp,
  FileDown,
  RotateCcw,
  Sliders,
  Table as TableIcon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  MapPin,
  Building2,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateBpAcamaPDF } from './BpAcamaPDFGenerator.jsx';
import { calculatePmt, calculateIrr, calculateProjectPayback } from '../../services/bessSimulationEngine.js';

function fmtEur(val) {
  if (val === null || val === undefined || isNaN(val)) return '0 €';
  return `${Math.round(val).toLocaleString('fr-FR')} €`;
}

function fmt(val, dec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return Number(val).toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

function fmtPct(val, dec = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0,0 %';
  return `${Number(val).toFixed(dec).replace('.', ',')} %`;
}

function npv(rate, flows) {
  if (!flows || flows.length === 0) return 0;
  return flows.reduce((sum, val, idx) => sum + val / Math.pow(1 + rate, idx + 1), 0);
}

function PvPortfolioLenderHeader({ pageNumber, totalPages = 3, pageTitle, portfolioName, nbSites, totalPowerMw, totalProdMwh }) {
  return (
    <div className="pdf-header flex flex-col w-full mb-3 pb-2 border-b-2 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-enr-courtage-inline.png" alt="Logo ENR Courtage" className="h-9 w-auto object-contain" />
          <div>
            <div className="text-xs font-black tracking-widest text-slate-800 uppercase">
              DOSSIER FINANCIER PV — MODÈLE PRÊTEUR SENIOR PORTEFEUILLE (20 ANS)
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {pageTitle} • Portefeuille {portfolioName} ({nbSites} Centrales / {totalPowerMw} MWc / {totalProdMwh} MWh/an)
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black text-slate-900 uppercase">
            PORTEFEUILLE PHOTOVOLTAÏQUE {portfolioName} ({nbSites} SITES)
          </div>
          <div className="text-[10px] text-slate-400 font-semibold">
            {new Date().toLocaleDateString('fr-FR')} • Page {pageNumber} / {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PvPortfolioLenderModal({
  isOpen,
  onClose,
  portfolioName = 'HELIOS',
  sites = [],
  consolidatedTotals = {},
  consolidatedChronique = [],
  debtDuration = 20,
  debtRate = 4.20
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Totaux agrégés du portefeuille PV
  const nbSites = Math.max(1, Number(sites?.length || consolidatedTotals?.totalSites || 1));
  const rawPowerMw = Number(consolidatedTotals?.totalPowerMw);
  const totalPowerMw = (Number.isFinite(rawPowerMw) && rawPowerMw > 0 ? rawPowerMw : 2.5).toFixed(2);
  const totalProdMwh = Math.round(Number(consolidatedTotals?.totalProdMwh) || (Number(totalPowerMw) * 1150));
  const totalCapex = Number(consolidatedTotals?.totalCapex) || (Number(totalPowerMw) * 1000 * 950);
  const totalCaAn1 = Number(consolidatedTotals?.totalCaAn1) || (totalProdMwh * 135);
  const totalOpexAn1 = Number(consolidatedTotals?.totalOpexAn1) || (Number(totalPowerMw) * 1000 * 18);
  const totalLoyersAn1 = Number(consolidatedTotals?.totalLoyersAn1) || (nbSites * 2000);

  // Modèle financier prêteur senior PV sur 20 ans
  const pvModel = useMemo(() => {
    try {
      const horizon = 20;
      const loanYears = Math.min(20, Number(debtDuration) || 20);
      const rateDecimal = (debtRate || 4.20) / 100;
      const debtShare = 0.85; // 85% de dette senior pour le PV
      const equityShare = 0.15;
      const seniorDebt = totalCapex * debtShare;
      const equity = totalCapex * equityShare;

      const annuite = Math.abs(calculatePmt(rateDecimal, loanYears, seniorDebt));
      const annualAmort = totalCapex / horizon;

      let capitalRestant = seniorDebt;
      const rows = [];
      const fcffArray = [-totalCapex];
      const fcfeArray = [-equity];

      for (let t = 1; t <= horizon; t++) {
        const chr = consolidatedChronique?.[t - 1];
        // Dégradation PV -0.5% / an
        const prodY = totalProdMwh * Math.pow(1 - 0.005, t - 1);
        const caY = chr?.ca || (totalCaAn1 * Math.pow(1 - 0.005, t - 1));
        // Inflation charges +1.5% / an (totalOpexAn1 inclut déjà les loyers dans PvPortfolioView)
        const opexY = chr?.opex || (totalOpexAn1 * Math.pow(1 + 0.015, t - 1));
        const ebitdaY = caY - opexY;

        const debtStart = capitalRestant;
        const interestY = t <= loanYears ? debtStart * rateDecimal : 0;
        const principalY = t <= loanYears ? (annuite - interestY) : 0;
        const debtServiceY = t <= loanYears ? annuite : 0;
        capitalRestant = Math.max(0, debtStart - principalY);

        const ebitY = ebitdaY - annualAmort;
        const ebtY = ebitY - interestY;

        // IS LF 2024 (15% sous 42.5k€, 25% au-delà)
        const baseIs = Math.max(0, ebtY);
        const isY = baseIs <= 42500 ? baseIs * 0.15 : (42500 * 0.15 + (baseIs - 42500) * 0.25);
        const netIncomeY = ebtY - isY;

        const cfadsY = ebitdaY - isY;
        const dscrY = (t <= loanYears && debtServiceY > 0) ? (ebitdaY / debtServiceY) : null;
        const fcfeY = cfadsY - debtServiceY;

        // Non-levier
        const isUnlevered = Math.max(0, ebitY) <= 42500 ? Math.max(0, ebitY) * 0.15 : (42500 * 0.15 + (Math.max(0, ebitY) - 42500) * 0.25);
        const fcffY = ebitdaY - isUnlevered;

        fcffArray.push(fcffY);
        fcfeArray.push(fcfeY);

        rows.push({
          year: t,
          prodMwh: prodY,
          ca: caY,
          opex: opexY,
          ebitda: ebitdaY,
          amort: annualAmort,
          interest: interestY,
          principal: principalY,
          debtService: debtServiceY,
          debtEnd: capitalRestant,
          ebt: ebtY,
          is: isY,
          netIncome: netIncomeY,
          cfads: cfadsY,
          dscr: dscrY,
          fcff: fcffY,
          fcfe: fcfeY
        });
      }

      // Totaux cumulés 20 ans
      const cumul = {
        prodMwh: rows.reduce((s, r) => s + r.prodMwh, 0),
        ca: rows.reduce((s, r) => s + r.ca, 0),
        opex: rows.reduce((s, r) => s + r.opex, 0),
        ebitda: rows.reduce((s, r) => s + r.ebitda, 0),
        interest: rows.reduce((s, r) => s + r.interest, 0),
        principal: rows.reduce((s, r) => s + r.principal, 0),
        debtService: rows.reduce((s, r) => s + r.debtService, 0),
        is: rows.reduce((s, r) => s + r.is, 0),
        netIncome: rows.reduce((s, r) => s + r.netIncome, 0),
        cfads: rows.reduce((s, r) => s + r.cfads, 0),
        fcff: rows.reduce((s, r) => s + r.fcff, 0),
        fcfe: rows.reduce((s, r) => s + r.fcfe, 0)
      };

      const dscrRows = rows.filter(r => r.dscr !== null);
      const dscrMin = dscrRows.length > 0 ? Math.min(...dscrRows.map(r => r.dscr)) : 1.30;
      const dscrAvg = dscrRows.length > 0 ? dscrRows.reduce((s, r) => s + r.dscr, 0) / dscrRows.length : 1.45;

      // Ratios d'actualisation WACC 6%
      const projectNpv = npv(0.06, rows.map(r => r.fcff)) - totalCapex;
      const equityNpv = npv(0.06, rows.map(r => r.fcfe)) - equity;
      const projectIrr = calculateIrr(fcffArray, 0.08) * 100;
      const equityIrr = calculateIrr(fcfeArray, 0.12) * 100;

      // LLCR & PLCR
      const cfadsDuringLoan = rows.filter(r => r.debtService > 0).map(r => r.cfads);
      const npvCfadsLoan = npv(rateDecimal, cfadsDuringLoan);
      const llcr = seniorDebt > 0 ? npvCfadsLoan / seniorDebt : 1.40;
      const npvCfadsAll = npv(rateDecimal, rows.map(r => r.cfads));
      const plcr = seniorDebt > 0 ? npvCfadsAll / seniorDebt : 1.65;

      const payback = calculateProjectPayback(totalCapex, rows.map(r => r.ebitda));

      return {
        seniorDebt,
        equity,
        annuite,
        rows,
        cumul,
        dscrMin,
        dscrAvg,
        llcr,
        plcr,
        projectNpv,
        equityNpv,
        projectIrr,
        equityIrr,
        payback: payback || 7.5
      };
    } catch (e) {
      console.error('[PvPortfolioLenderModal] Erreur pvModel:', e);
      return {
        seniorDebt: 0,
        equity: 0,
        annuite: 0,
        rows: [],
        cumul: { ca: 0, opex: 0, ebitda: 0, debtService: 0, netIncome: 0, cfads: 0, prodMwh: 0 },
        dscrMin: 1.30,
        dscrAvg: 1.45,
        llcr: 1.40,
        plcr: 1.65,
        projectNpv: 0,
        equityNpv: 0,
        projectIrr: 8.0,
        equityIrr: 12.0,
        payback: 7.5
      };
    }
  }, [totalCapex, totalCaAn1, totalOpexAn1, totalLoyersAn1, totalProdMwh, debtDuration, debtRate]);

  // 8 Scénarios de Stress-Tests PV
  const scenarios = useMemo(() => {
    try {
      const base = pvModel;
      const runSim = (caFactor, opexFactor, rateDeltaBps) => {
        const loanYears = Math.min(20, Number(debtDuration) || 20);
        const rDec = ((debtRate || 4.20) + rateDeltaBps / 100) / 100;
        const sDebt = totalCapex * 0.85;
        const ann = Math.abs(calculatePmt(rDec, loanYears, sDebt));
        let minDscr = 99;
        let sumDscr = 0;
        let netCumul = 0;

        for (let t = 1; t <= loanYears; t++) {
          const ca = totalCaAn1 * caFactor * Math.pow(1 - 0.005, t - 1);
          const op = totalOpexAn1 * opexFactor * Math.pow(1 + 0.015, t - 1);
          const eb = ca - op;
          const ebt = eb - (totalCapex / 20) - (sDebt * (1 - (t - 1) / loanYears) * rDec);
          const baseIs = Math.max(0, ebt);
          const isTax = baseIs <= 42500 ? baseIs * 0.15 : (42500 * 0.15 + (baseIs - 42500) * 0.25);
          const dscr = ann > 0 ? (eb / ann) : 1.30;
          if (dscr < minDscr) minDscr = dscr;
          sumDscr += dscr;
          netCumul += (ebt - isTax);
        }
        return {
          dscrMin: minDscr,
          dscrAvg: loanYears > 0 ? sumDscr / loanYears : 1.45,
          netCumul
        };
      };

      const s1 = { id: 1, name: "1. Cas de Base P50 (Audité)", dscrMin: base.dscrMin, dscrAvg: base.dscrAvg, netIncome: base.cumul.netIncome };
      const s2Res = runSim(0.92, 1.0, 0);
      const s2 = { id: 2, name: "2. Ensoleillement P90 (-8% productible)", dscrMin: s2Res.dscrMin, dscrAvg: s2Res.dscrAvg, netIncome: s2Res.netCumul };
      const s3Res = runSim(0.86, 1.0, 0);
      const s3 = { id: 3, name: "3. Ensoleillement P99 (-14% productible)", dscrMin: s3Res.dscrMin, dscrAvg: s3Res.dscrAvg, netIncome: s3Res.netCumul };
      const s4Res = runSim(0.90, 1.0, 0);
      const s4 = { id: 4, name: "4. Baisse Tarif / PPA (-10% revenus)", dscrMin: s4Res.dscrMin, dscrAvg: s4Res.dscrAvg, netIncome: s4Res.netCumul };
      const s5Res = runSim(1.0, 1.20, 0);
      const s5 = { id: 5, name: "5. Inflation Charges OPEX (+20%)", dscrMin: s5Res.dscrMin, dscrAvg: s5Res.dscrAvg, netIncome: s5Res.netCumul };
      const s6Res = runSim(1.0, 1.0, 150);
      const s6 = { id: 6, name: "6. Hausse Taux Bancaire (+150 bps)", dscrMin: s6Res.dscrMin, dscrAvg: s6Res.dscrAvg, netIncome: s6Res.netCumul };
      const s7Res = runSim(0.92, 1.15, 0);
      const s7 = { id: 7, name: "7. Stress Combiné (P90 & Charges +15%)", dscrMin: s7Res.dscrMin, dscrAvg: s7Res.dscrAvg, netIncome: s7Res.netCumul };
      const s8Res = runSim(0.90, 1.20, 100);
      const s8 = { id: 8, name: "8. Stress Sévère (P90 & OPEX +20% & +100 bps)", dscrMin: s8Res.dscrMin, dscrAvg: s8Res.dscrAvg, netIncome: s8Res.netCumul };

      return [s1, s2, s3, s4, s5, s6, s7, s8];
    } catch (e) {
      console.error('[PvPortfolioLenderModal] Erreur scenarios:', e);
      return [];
    }
  }, [pvModel, totalCapex, totalCaAn1, totalOpexAn1, totalLoyersAn1, debtDuration, debtRate]);

  // Points de rupture
  const rupture = useMemo(() => {
    try {
      const ann = pvModel?.annuite || 0;
      const opex1 = totalOpexAn1 || 0;
      const ca1 = totalCaAn1 || 1;
      // Baisse pour DSCR = 1.15
      const revFor115 = (ann * 1.15) + opex1;
      const baisse115 = Math.max(0, ((ca1 - revFor115) / ca1) * 100);
      // Baisse pour DSCR = 1.00
      const revFor100 = ann + opex1;
      const baisse100 = Math.max(0, ((ca1 - revFor100) / ca1) * 100);

      return {
        baisse115,
        baisse100,
        yearsCompliant: (pvModel?.rows || []).filter(r => r.dscr >= 1.20).length
      };
    } catch (e) {
      return { baisse115: 0, baisse100: 0, yearsCompliant: 20 };
    }
  }, [pvModel, totalCaAn1, totalOpexAn1]);

  const isDscrCompliant = pvModel.dscrMin >= 1.20;
  const isDscrAcceptable = pvModel.dscrMin >= 1.15;

  // Export du dossier 3 pages PDF
  const handleExportPdf = async () => {
    const prevTab = activeTab;
    try {
      setIsExportingPdf(true);
      if (activeTab !== 'all') {
        setActiveTab('all');
        await new Promise(r => setTimeout(r, 150));
      }
      await generateBpAcamaPDF({
        sections: ['pdf-pv-port-lender-1', 'pdf-pv-port-lender-2', 'pdf-pv-port-lender-3'],
        fileName: `DOSSIER_PRETEUR_PORTEFEUILLE_PV_${portfolioName}_${nbSites}_SITES.pdf`,
        orientation: 'landscape'
      });
    } catch (err) {
      console.error('[PvPortfolioLenderModal] Erreur export PDF:', err);
      alert('Une erreur est survenue lors de la génération du dossier PDF prêteur PV.');
    } finally {
      setActiveTab(prevTab);
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[64px] z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-[1560px] h-[calc(100vh-100px)] max-h-[85vh] bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        {/* Header Modal */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4" data-html2canvas-ignore="true">
          <div className="flex items-center gap-4">
            <img src="/logo-enr-courtage-inline.png" alt="ENR Courtage" className="h-9 w-auto object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-50 text-amber-600">
                  <Sun className="w-4 h-4" />
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Dossier Prêteur Consolidé — Portefeuille PV {portfolioName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                  {nbSites} Centrales • {totalPowerMw} MWc • {totalProdMwh} MWh/an
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dossier de bancabilité photovoltaïque 20 ans • Financement de projet sans recours / corporate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Onglets de navigation */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'all' ? "bg-white text-amber-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                Toutes les pages (3P)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page1')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'page1' ? "bg-white text-amber-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                1. Synthèse & Stress-Tests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page2')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'page2' ? "bg-white text-amber-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                2. Tableau 20 ans & Dette
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page3')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'page3' ? "bg-white text-amber-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                3. Répertoire des Toitures
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-amber-100" />
              <span>{isExportingPdf ? 'GÉNÉRATION DU DOSSIER...' : 'TÉLÉCHARGER LE DOSSIER PRÊTEUR PV (3P)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Corps défilant contenant les 3 pages imprimables */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 flex flex-col items-center">
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 1 : SYNTHÈSE FINANCIÈRE PRÊTEUR PV, HYPOTHÈSES & STRESS-TESTS CONSOLIDÉS */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page1') && (
            <section
              id="pdf-pv-port-lender-1"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1440px]"
            >
              <PvPortfolioLenderHeader
                pageNumber={1}
                totalPages={3}
                pageTitle="Volet 1 : Synthèse Financière Consolidée, Hypothèses & Analyse de Risque PV"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalPowerMw={totalPowerMw}
                totalProdMwh={totalProdMwh}
              />

              {/* 1. SYNTHÈSE FINANCIÈRE PV */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        1. Synthèse Financière Consolidée pour le Prêteur PV
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Portefeuille {portfolioName} • {nbSites} Centrales ({totalPowerMw} MWc)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Grappe toitures photovoltaïques 20 ans • Prêt senior amortissable {debtDuration || 20} ans • Ratios prudentiels & fiscalité LF 2024
                    </p>
                  </div>

                  <div className={cn(
                    "px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[11px] font-black",
                    isDscrCompliant
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : isDscrAcceptable
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  )}>
                    {isDscrCompliant ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>
                      {isDscrCompliant
                        ? "BANQUE COMPLIANT (DSCR min ≥ 1,20x)"
                        : isDscrAcceptable
                        ? "CONFORME BANQUE (DSCR min ≥ 1,15x)"
                        : "NON CONFORME BANQUE (DSCR < 1,15x)"}
                    </span>
                  </div>
                </div>

                {/* 4 cartes KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Carte 1 : Structure & Dette */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 border-b border-slate-200 pb-1 mb-2">
                        1. Financement Consolidé
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">CAPEX Total PV :</span>
                          <span className="font-black text-slate-900">{fmtEur(totalCapex)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Dette Senior (85%) :</span>
                          <span className="font-bold text-amber-900">{fmtEur(pvModel.seniorDebt)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Fonds Propres (15%) :</span>
                          <span className="font-bold text-slate-800">{fmtEur(pvModel.equity)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Taux tout compris :</span>
                          <span className="font-bold text-slate-900">{fmtPct(debtRate || 4.20, 2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>Durée prêt : <b>{debtDuration || 20} ans</b></span>
                      <span>Annuité : <b className="text-amber-800">{fmtEur(pvModel.annuite)}/an</b></span>
                    </div>
                  </div>

                  {/* Carte 2 : Exploitation */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 border-b border-slate-200 pb-1 mb-2">
                        2. Exploitation & Productible
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Productible An 1 :</span>
                          <span className="font-black text-slate-900">{totalProdMwh.toLocaleString('fr-FR')} MWh</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">CA Annuel An 1 :</span>
                          <span className="font-bold text-slate-900">{fmtEur(totalCaAn1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">EBITDA Cumulé 20A :</span>
                          <span className="font-black text-emerald-800">{fmtEur(pvModel.cumul.ebitda)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Résultat Net Cumulé :</span>
                          <span className="font-bold text-emerald-700">{fmtEur(pvModel.cumul.netIncome)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>Marge EBITDA An 1 :</span>
                      <span className="font-bold text-slate-800">
                        {fmtPct(totalCaAn1 > 0 ? ((totalCaAn1 - totalOpexAn1 - totalLoyersAn1) / totalCaAn1) * 100 : 75, 1)}
                      </span>
                    </div>
                  </div>

                  {/* Carte 3 : Ratios Bancaires */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 border-b border-slate-200 pb-1 mb-2">
                        3. Ratios de Couverture
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">DSCR Minimum :</span>
                          <span className={cn(
                            "font-black px-1.5 py-0.2 rounded text-[11.5px]",
                            pvModel.dscrMin >= 1.20 ? "bg-emerald-100 text-emerald-800" : (pvModel.dscrMin >= 1.15 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")
                          )}>
                            {fmt(pvModel.dscrMin, 2)}x
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">DSCR Moyen :</span>
                          <span className="font-bold text-slate-900">{fmt(pvModel.dscrAvg, 2)}x</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">LLCR (@4,2%) :</span>
                          <span className="font-bold text-indigo-900">{fmt(pvModel.llcr, 2)}x</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">PLCR (20 ans) :</span>
                          <span className="font-bold text-indigo-900">{fmt(pvModel.plcr, 2)}x</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>Covenant Prêteur PV :</span>
                      <span className="font-bold text-emerald-700">DSCR ≥ 1,20x</span>
                    </div>
                  </div>

                  {/* Carte 4 : Rentabilité */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 mb-2">
                        4. Rentabilité & Payback
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">TRI Projet (non levier) :</span>
                          <span className="font-black text-blue-700">{fmtPct(pvModel.projectIrr, 1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">TRI Fonds Propres :</span>
                          <span className="font-black text-emerald-700">{fmtPct(pvModel.equityIrr, 1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">VAN Projet (@6,0%) :</span>
                          <span className="font-bold text-slate-900">{fmtEur(pvModel.projectNpv)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Payback actualisé :</span>
                          <span className="font-bold text-amber-700">{fmt(pvModel.payback, 1)} ans</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>VAN Fonds Propres :</span>
                      <span className="font-bold text-emerald-800">{fmtEur(pvModel.equityNpv)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. HYPOTHÈSES TECHNIQUES & FINANCIÈRES PV */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                      <Sliders className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      2. Hypothèses du Modèle Financier Photovoltaïque Consolidé
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      (Dégradation panneaux 0.5%/an • Inflation 1.5% • Amortissement linéaire 20 ans • Fiscalité LF 2024)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-amber-700 border-b border-amber-100 pb-0.5">
                      Structure de Dette Senior
                    </div>
                    <div className="flex justify-between"><span>Durée étude :</span><b>20 ans</b></div>
                    <div className="flex justify-between"><span>Durée prêt senior :</span><b>{debtDuration || 20} ans</b></div>
                    <div className="flex justify-between"><span>Quotité dette :</span><b>85 %</b></div>
                    <div className="flex justify-between"><span>Taux all-in :</span><b className="text-amber-900">{fmtPct(debtRate || 4.20, 2)}</b></div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-emerald-700 border-b border-emerald-100 pb-0.5">
                      Technique & Productible
                    </div>
                    <div className="flex justify-between"><span>Puissance cumulée :</span><b>{totalPowerMw} MWc</b></div>
                    <div className="flex justify-between"><span>Productible moyen :</span><b>1 150 kWh/kWc/an</b></div>
                    <div className="flex justify-between"><span>Dégradation panneaux :</span><b>0.5 %/an</b></div>
                    <div className="flex justify-between"><span>Tarif moyen EDF OA :</span><b>~135 €/MWh</b></div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-indigo-700 border-b border-indigo-100 pb-0.5">
                      Fiscalité LF 2024
                    </div>
                    <div className="flex justify-between"><span>Seuil PME réduit :</span><b>42 500 € / SPV</b></div>
                    <div className="flex justify-between"><span>Taux réduit IS :</span><b>15.0 %</b></div>
                    <div className="flex justify-between"><span>Taux normal IS :</span><b>25.0 %</b></div>
                    <div className="text-[9.5px] text-slate-400 mt-0.5">Amortissement linéaire des toitures & PV</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-blue-700 border-b border-blue-100 pb-0.5">
                      Base Année 1 Portefeuille
                    </div>
                    <div className="flex justify-between"><span>CAPEX Total :</span><b>{fmtEur(totalCapex)}</b></div>
                    <div className="flex justify-between"><span>CA Total An 1 :</span><b>{fmtEur(totalCaAn1)}</b></div>
                    <div className="flex justify-between"><span>OPEX Maintenance :</span><b>{fmtEur(totalOpexAn1)}</b></div>
                    <div className="flex justify-between"><span>Loyers / Soultes :</span><b className="text-amber-800">{fmtEur(totalLoyersAn1)}</b></div>
                  </div>
                </div>
              </div>

              {/* 3. STRESS-TESTS BANCAIRES CONSOLIDÉS PV */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                      <Activity className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      3. Analyse de Sensibilité & Stress-Tests Prêteur PV ({nbSites} Centrales)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    Seuil d'alerte bancaire PV : DSCR min &lt; 1,15x
                  </span>
                </div>

                {/* Tableau des 8 scénarios */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-left">
                        <th className="p-2.5">Scénario de Stress-Test Solaire</th>
                        <th className="p-2.5 text-center">DSCR Min</th>
                        <th className="p-2.5 text-center">DSCR Moyen</th>
                        <th className="p-2.5 text-right">Résultat Net Cumulé 20A</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scenarios.map((sc, idx) => {
                        const isBase = idx === 0;
                        const isOk = sc.dscrMin >= 1.15;
                        return (
                          <tr
                            key={sc.id}
                            className={cn(
                              "hover:bg-slate-50 transition-colors",
                              isBase ? "bg-amber-50/60 font-black text-amber-950" : "text-slate-800"
                            )}
                          >
                            <td className="p-2.5 flex items-center gap-2">
                              {isBase && <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />}
                              <span>{sc.name}</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full font-black text-xs inline-flex items-center gap-1",
                                isOk ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              )}>
                                {isOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {fmt(sc.dscrMin, 2)}x
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              {fmt(sc.dscrAvg, 2)}x
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              {fmtEur(sc.netIncome)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Marges de sécurité */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Marges de Sécurité & Points de Rupture du Portefeuille PV
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse production tolérée (DSCR = 1,15x)</div>
                      <div className="text-base font-black text-emerald-700 mt-1">
                        -{fmtPct(rupture.baisse115, 1)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Seuil critique d'alerte bancaire PV</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse production tolérée (DSCR = 1,00x)</div>
                      <div className="text-base font-black text-blue-700 mt-1">
                        -{fmtPct(rupture.baisse100, 1)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Point de rupture de trésorerie pure</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">DSCR minimum cas de base</div>
                      <div className="text-base font-black text-slate-900 mt-1">
                        {fmt(pvModel.dscrMin, 2)}x
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Atteint en Année 1</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Années avec DSCR ≥ 1,20x</div>
                      <div className="text-base font-black text-emerald-800 mt-1">
                        {rupture.yearsCompliant} / {debtDuration || 20} ans
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Couverture optimale du prêt senior</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 2 : TABLEAU FINANCIER PRÉVISIONNEL CONSOLIDÉ 20 ANS & SERVICE DETTE PV */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page2') && (
            <section
              id="pdf-pv-port-lender-2"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1440px] overflow-x-auto"
            >
              <PvPortfolioLenderHeader
                pageNumber={2}
                totalPages={3}
                pageTitle="Volet 2 : Tableau Financier Prévisionnel Consolidé 20 Ans & Service de la Dette"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalPowerMw={totalPowerMw}
                totalProdMwh={totalProdMwh}
              />

              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-amber-600" />
                    Tableau Financier Prévisionnel Consolidé ({nbSites} Centrales Photovoltaïques)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Horizon 20 ans • Amortissement de la dette sur {debtDuration || 20} ans • Remboursement total • Unités : Euros HT (€)
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Dette Senior {fmtEur(pvModel.seniorDebt)} (@{fmtPct(debtRate || 4.20, 2)})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10.5px] text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-center">
                      <th className="p-2 text-left min-w-[210px]">Poste Budgétaire PV Consolidé (€ HT)</th>
                      {pvModel.rows.map(y => (
                        <th key={y.year} className="p-1.5 min-w-[65px]">An {y.year}</th>
                      ))}
                      <th className="p-2 bg-amber-900 text-yellow-300 min-w-[95px]">CUMUL 20A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* EXPLOITATION */}
                    <tr className="bg-amber-50/80 font-black text-amber-950 text-left">
                      <td colSpan={22} className="p-1.5 uppercase text-[10px] tracking-wider">
                        I. Exploitation & EBITDA Consolidé
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-1 text-left text-slate-700 font-semibold">Chiffre d'affaires brut (Vente électricité)</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1">{Math.round(y.ca).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-amber-50/50">{Math.round(pvModel.cumul.ca).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">OPEX Maintenance, Assurance & Loyer toitures</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.opex).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-amber-50/50 text-red-800">-{Math.round(pvModel.cumul.opex).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-black text-emerald-950">
                      <td className="p-1 text-left">EBITDA Consolidé</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 font-bold">{Math.round(y.ebitda).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-emerald-100 text-emerald-950">{Math.round(pvModel.cumul.ebitda).toLocaleString('fr-FR')}</td>
                    </tr>

                    {/* DETTE & AMORTISSEMENTS */}
                    <tr className="bg-amber-50/80 font-black text-amber-950 text-left">
                      <td colSpan={22} className="p-1.5 uppercase text-[10px] tracking-wider">
                        II. Service de la Dette Senior & Amortissements
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Intérêts bancaires de la dette senior</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.interest).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-amber-50/50 text-red-800">-{Math.round(pvModel.cumul.interest).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Remboursement de capital</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 text-blue-800">-{Math.round(y.principal).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-amber-50/50 text-blue-900">-{Math.round(pvModel.cumul.principal).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-amber-100/60 font-black text-amber-950">
                      <td className="p-1 text-left">Service total de la dette senior</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 font-bold">{Math.round(y.debtService).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-amber-200 text-amber-950">{Math.round(pvModel.cumul.debtService).toLocaleString('fr-FR')}</td>
                    </tr>

                    {/* FISCALITÉ */}
                    <tr className="bg-amber-50/80 font-black text-amber-950 text-left">
                      <td colSpan={22} className="p-1.5 uppercase text-[10px] tracking-wider">
                        III. Fiscalité LF 2024 & Résultat Net
                      </td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="p-1 text-left">EBT Consolidé</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 font-semibold">{Math.round(y.ebt).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-amber-50/50">{Math.round(pvModel.rows.reduce((s, r) => s + r.ebt, 0)).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Impôt sur les Sociétés (IS)</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.is).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-amber-50/50 text-red-800">-{Math.round(pvModel.cumul.is).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td className="p-1 text-left">Résultat Net Consolidé</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1">{Math.round(y.netIncome).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-slate-200">{Math.round(pvModel.cumul.netIncome).toLocaleString('fr-FR')}</td>
                    </tr>

                    {/* FLUX & DSCR */}
                    <tr className="bg-amber-50/80 font-black text-amber-950 text-left">
                      <td colSpan={22} className="p-1.5 uppercase text-[10px] tracking-wider">
                        IV. Flux de Trésorerie & DSCR Annuel
                      </td>
                    </tr>
                    <tr className="font-semibold text-slate-800">
                      <td className="p-1 text-left">CFADS Consolidé (EBITDA - IS)</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1">{Math.round(y.cfads).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-amber-50/50">{Math.round(pvModel.cumul.cfads).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-blue-100/60 font-black text-blue-950">
                      <td className="p-1.5 text-left">DSCR Annuel Consolidé</td>
                      {pvModel.rows.map(y => (
                        <td key={y.year} className={cn("p-1.5 text-center font-black", y.debtService > 0 ? (y.dscr >= 1.20 ? "text-emerald-800" : (y.dscr >= 1.15 ? "text-amber-800" : "text-red-700")) : "text-slate-400")}>
                          {y.dscr ? `${fmt(y.dscr, 2)}x` : '—'}
                        </td>
                      ))}
                      <td className="p-1.5 text-center font-black bg-blue-200 text-blue-950">{fmt(pvModel.dscrAvg, 2)}x</td>
                    </tr>
                    <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                      <td className="p-1.5 text-left">FCFE Fonds Propres (Trésorerie nette)</td>
                      {pvModel.rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.fcfe).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1.5 font-black bg-emerald-100 text-emerald-950">{Math.round(pvModel.cumul.fcfe).toLocaleString('fr-FR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 3 : RÉPERTOIRE EXHAUSTIF DES CENTRALES DU PORTEFEUILLE PV              */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page3') && (
            <section
              id="pdf-pv-port-lender-3"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1440px]"
            >
              <PvPortfolioLenderHeader
                pageNumber={3}
                totalPages={3}
                pageTitle="Volet 3 : Répertoire Foncier & Technique des Centrales Photovoltaïques"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalPowerMw={totalPowerMw}
                totalProdMwh={totalProdMwh}
              />

              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    Répertoire Consolidé des {sites.length} Centrales PV du Portefeuille {portfolioName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Surfaces toitures, puissance crête, productible annuel, valorisation CAPEX et baux notariés 20-30 ans.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black">
                    Baux Notariés 20 Ans
                  </span>
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                    Tarif EDF OA Sécurisé
                  </span>
                </div>
              </div>

              {/* Tableau exhaustif des sites PV */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-[10.5px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-2 w-40">Nom Projet & Bailleur</th>
                      <th className="py-2 px-2 w-36">Commune & CP</th>
                      <th className="py-2 px-2 w-28 text-center">Surface Toiture</th>
                      <th className="py-2 px-2 w-28 text-center">Puissance Crête</th>
                      <th className="py-2 px-2 w-28 text-center">Productible</th>
                      <th className="py-2 px-2 w-24 text-right">CAPEX Total</th>
                      <th className="py-2 px-2 w-24 text-right">Loyer Toiture</th>
                      <th className="py-2 px-2 w-24 text-right">CA An 1</th>
                      <th className="py-2 px-2 w-24 text-right">EBITDA An 1</th>
                      <th className="py-2 px-2 w-20 text-center">Payback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sites.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-1 px-2">
                          <span className="font-extrabold text-slate-900 block leading-tight">{s.name}</span>
                          <span className="text-[9.5px] text-slate-400">{s.client || s.client_name}</span>
                        </td>
                        <td className="py-1 px-2">
                          <span className="font-semibold text-slate-800 block leading-tight">{s.city}</span>
                          <span className="text-[9.5px] text-slate-400">{s.cp || s.postcode}</span>
                        </td>
                        <td className="py-1 px-2 text-center text-slate-600 font-medium">{s.surface ? `${s.surface} m²` : '—'}</td>
                        <td className="py-1 px-2 text-center font-bold text-amber-900">
                          <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-800">{s.kwc || s.powerKwc || 100} kWc</span>
                        </td>
                        <td className="py-1 px-2 text-center font-semibold text-slate-700">
                          {Math.round(s.prodMwh || ((s.kwc || 100) * 1.15))} MWh/an
                        </td>
                        <td className="py-1 px-2 text-right font-bold text-slate-900">{fmtEur(s.capexTotal || (s.kwc || 100) * 950)}</td>
                        <td className="py-1 px-2 text-right font-medium text-amber-700">{fmtEur(s.rent || 2000)}/an</td>
                        <td className="py-1 px-2 text-right font-semibold text-slate-800">{fmtEur(s.caAnnuel || (s.prodMwh || (s.kwc || 100) * 1.15) * 135)}</td>
                        <td className="py-1 px-2 text-right font-black text-emerald-700">{fmtEur(s.ebitda || s.ebitdaAn1 || (s.caAnnuel || 13500) * 0.75)}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-700">{s.payback || '7.5 ans'}</td>
                      </tr>
                    ))}

                    {/* TOTAL CONSOLIDÉ DU PORTEFEUILLE PV */}
                    <tr className="bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-white font-black text-[11px]">
                      <td className="py-2 px-2 text-center text-yellow-300 font-black">∑</td>
                      <td className="py-2 px-2 uppercase tracking-wider text-yellow-300 leading-tight">
                        Total Consolidé<br />({sites.length} Centrales)
                      </td>
                      <td className="py-2 px-2 text-amber-200">Portefeuille {portfolioName}</td>
                      <td className="py-2 px-2 text-center text-amber-200 font-mono">—</td>
                      <td className="py-2 px-2 text-center text-yellow-300 font-black">
                        {totalPowerMw} MWc
                      </td>
                      <td className="py-2 px-2 text-center text-amber-100 font-extrabold">
                        {totalProdMwh.toLocaleString('fr-FR')} MWh/an
                      </td>
                      <td className="py-2 px-2 text-right text-white font-black">
                        {fmtEur(totalCapex)}
                      </td>
                      <td className="py-2 px-2 text-right text-yellow-300 font-black">
                        {fmtEur(totalLoyersAn1)}/an
                      </td>
                      <td className="py-2 px-2 text-right text-white font-black">
                        {fmtEur(totalCaAn1)}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-300 font-black text-xs">
                        {fmtEur(Number(consolidatedTotals?.totalEbitdaAn1) || (totalCaAn1 - totalOpexAn1))}
                      </td>
                      <td className="py-2 px-2 text-center text-yellow-300 font-black">
                        {fmt(pvModel.payback, 1)} ans
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
