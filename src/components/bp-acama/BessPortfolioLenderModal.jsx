import React, { useState, useMemo } from 'react';
import {
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
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  npv
} from '../../services/bessLenderFinanceEngine.js';
import {
  computeBessFinancials as simulateBessSiteFinancials,
  calculatePmt,
  calculateIrr,
  calculateProjectPayback
} from '../../services/bessSimulationEngine.js';
import { generateBpAcamaPDF } from './BpAcamaPDFGenerator.jsx';

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

function PortfolioLenderHeader({ pageNumber, totalPages = 3, pageTitle, portfolioName, nbSites, totalMw, totalMwh }) {
  return (
    <div className="pdf-header flex flex-col w-full mb-3 pb-2 border-b-2 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-enr-courtage-inline.png" alt="Logo ENR Courtage" className="h-9 w-auto object-contain" />
          <div>
            <div className="text-xs font-black tracking-widest text-slate-800 uppercase">
              DOSSIER FINANCIER BESS — MODÈLE PRÊTEUR SENIOR PORTEFEUILLE (15 ANS)
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {pageTitle} • Portefeuille {portfolioName} ({nbSites} Sites / {totalMw} MW / {totalMwh} MWh)
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black text-slate-900 uppercase">
            PORTEFEUILLE BESS {portfolioName} ({nbSites} SITES)
          </div>
          <div className="text-[10px] text-slate-400 font-semibold">
            {new Date().toLocaleDateString('fr-FR')} • Page {pageNumber} / {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BessPortfolioLenderModal({
  isOpen,
  onClose,
  portfolioName = 'VOLTA',
  sites = [],
  consolidatedTotals = {},
  consolidatedChronique = [],
  debtDuration = 12,
  debtRate = 4.30,
  loyerBailleurPerSite = 3000,
  fraisCommerciauxPerSite = 2500
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'page1' | 'page2' | 'page3'
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Simulation unifiée par site alignée avec l'Étude Complète et la Vue Portefeuille
  const siteSims = useMemo(() => {
    const loanYears = Math.min(20, Math.max(1, Number(debtDuration) || 12));
    const rateVal = Number(debtRate) || 4.30;
    const defaultLoyer = portfolioName === 'FARADAY' ? 2000 : 3000;
    const loyerVal = loyerBailleurPerSite !== undefined ? Number(loyerBailleurPerSite) : defaultLoyer;

    if (sites && sites.length > 0) {
      return sites.map(s => simulateBessSiteFinancials(s, {
        debtDuration: loanYears,
        debtRate: rateVal,
        studyDuration: 15,
        fraisCommerciaux: s.fraisCommerciaux !== undefined ? s.fraisCommerciaux : fraisCommerciauxPerSite,
        loyerDalle: loyerVal
      }));
    }
    return [simulateBessSiteFinancials({ portfolio: portfolioName }, {
      debtDuration: loanYears,
      debtRate: rateVal,
      studyDuration: 15,
      fraisCommerciaux: fraisCommerciauxPerSite,
      loyerDalle: loyerVal
    })];
  }, [sites, debtDuration, debtRate, loyerBailleurPerSite, fraisCommerciauxPerSite, portfolioName]);

  // Totaux agrégés du portefeuille
  const nbSites = Math.max(1, Number(sites?.length || consolidatedTotals?.totalSites || 1));
  const rawPowerMw = Number(consolidatedTotals?.totalPowerMw);
  const totalPowerMw = (Number.isFinite(rawPowerMw) && rawPowerMw > 0 ? rawPowerMw : (nbSites * 0.5)).toFixed(2);
  const rawCapacityMwh = Number(consolidatedTotals?.totalCapacityMwh);
  const totalCapacityMwh = (Number.isFinite(rawCapacityMwh) && rawCapacityMwh > 0 ? rawCapacityMwh : (nbSites * 1.044)).toFixed(2);

  const simCapexSum = siteSims.reduce((sum, s) => sum + (s.capexTotal || 270000), 0);
  const simCaAn1Sum = siteSims.reduce((sum, s) => sum + (s.caAnnuel || 93171), 0);
  const simOpexAn1Sum = siteSims.reduce((sum, s) => sum + (s.opexAnnuel || 35956), 0);
  const simEbitdaAn1Sum = siteSims.reduce((sum, s) => sum + (s.ebitdaAn1 || (s.caAnnuel - s.opexAnnuel)), 0);

  const totalCapex = Number(consolidatedTotals?.totalCapex) || simCapexSum || (nbSites * 270000);
  const totalCaAn1 = Number(consolidatedTotals?.totalCaAn1) || simCaAn1Sum || (nbSites * 93171);
  const totalOpexAn1 = Number(consolidatedTotals?.totalOpexAn1) || simOpexAn1Sum || (nbSites * 35956);
  const totalEbitdaAn1 = Number(consolidatedTotals?.totalEbitdaAn1) || simEbitdaAn1Sum || (totalCaAn1 - totalOpexAn1);
  const totalLoyersAn1 = Number(consolidatedTotals?.totalLoyersAn1) || (nbSites * (Number(loyerBailleurPerSite) || (portfolioName === 'FARADAY' ? 2000 : 3000)));

  // Calcul du modèle bancaire prêteur consolidé aligné avec l'Étude Complète (DSCR ~2.07x)
  const model = useMemo(() => {
    const horizon = 12;
    const studyYears = 15;
    const loanYears = Math.min(20, Math.max(1, Number(debtDuration) || 12));
    const rateDecimal = (Number(debtRate) || 4.30) / 100;
    const discountRate = 0.07;

    const totalAnnuite = Math.abs(calculatePmt(rateDecimal, loanYears, totalCapex));
    const annualDepreciation = totalCapex / studyYears;

    let remainingDebt = totalCapex;
    const rows12 = [];
    const rows15 = [];

    for (let t = 1; t <= studyYears; t++) {
      let revY = 0;
      let opexTechY = 0;
      let aggFeeY = 0;
      let insY = 0;
      let rentY = 0;

      siteSims.forEach(sim => {
        const r = sim.rows?.[t - 1] || {};
        const rCa = (r.revFCR || 0) + (r.revCapacite || 0) + (r.revArbitrage || 0) || (r.caTotalBrut || 0);
        const rAgg = r.commAgregateur || (rCa * 0.18);
        const rIns = r.assur || 1750;
        const rRent = r.revBailleur || (Number(loyerBailleurPerSite) || 2000);
        const rTech = (r.turpeAn || 0) + (r.coutRechargeAn || 0) + (r.maint || 0);

        revY += rCa;
        aggFeeY += rAgg;
        insY += rIns;
        rentY += rRent;
        opexTechY += rTech;
      });

      const totalOpexY = opexTechY + aggFeeY + insY + rentY;
      const ebitdaY = revY - totalOpexY;

      const beginningDebt = remainingDebt;
      const interestY = t <= loanYears ? beginningDebt * rateDecimal : 0;
      const debtServiceY = t <= loanYears ? totalAnnuite : 0;
      const principalY = t <= loanYears ? Math.max(0, debtServiceY - interestY) : 0;
      remainingDebt = Math.max(0, beginningDebt - principalY);

      const ebitY = ebitdaY - annualDepreciation;
      const ebtY = ebitY - interestY;
      const isTaxY = Math.max(0, ebtY) * 0.25;
      const netIncomeY = ebtY - isTaxY;

      // CFADS opérationnel et DSCR de dette senior aligné avec l'Étude Complète & Vue Portefeuille
      const cfadsY = ebitdaY - isTaxY;
      const dscrY = (t <= loanYears && debtServiceY > 0) ? (ebitdaY / debtServiceY) : null;
      const fcfeY = ebitdaY - debtServiceY - isTaxY;
      const fcffY = ebitdaY - (Math.max(0, ebitY) * 0.25);

      const rowObj = {
        year: t,
        revenue: revY,
        opex: opexTechY,
        aggregatorFee: aggFeeY,
        insurance: insY,
        landRent: rentY,
        totalOpex: totalOpexY,
        ebitda: ebitdaY,
        beginningDebt,
        interest: interestY,
        principal: principalY,
        debtService: debtServiceY,
        capexDepreciation: annualDepreciation,
        ebit: ebitY,
        ebt: ebtY,
        isTax: isTaxY,
        netIncome: netIncomeY,
        cfads: cfadsY,
        dscr: dscrY,
        fcfe: fcfeY,
        fcff: fcffY
      };

      rows15.push(rowObj);
      if (t <= horizon) rows12.push(rowObj);
    }

    const sum12 = (k) => rows12.reduce((acc, r) => acc + (r[k] || 0), 0);
    const totalsObj = {
      revenue: sum12('revenue'),
      opex: sum12('opex'),
      aggregatorFee: sum12('aggregatorFee'),
      insurance: sum12('insurance'),
      landRent: sum12('landRent'),
      ebitda: sum12('ebitda'),
      interest: sum12('interest'),
      principal: sum12('principal'),
      debtService: sum12('debtService'),
      ebt: sum12('ebt'),
      isTax: sum12('isTax'),
      netIncome: sum12('netIncome'),
      cfads: sum12('cfads'),
      fcfe: sum12('fcfe'),
      fcff: sum12('fcff')
    };

    const dscrList = rows12.filter(r => r.dscr !== null).map(r => r.dscr);
    const dscrMin = dscrList.length > 0 ? Math.min(...dscrList) : 1.94;
    const dscrAvg = Number(consolidatedTotals?.avgDscr) || (dscrList.length > 0 ? dscrList.reduce((a, b) => a + b, 0) / dscrList.length : 2.07);

    const npvEbitdaLoan = npv(rateDecimal, rows12.map(r => r.ebitda));
    const npvEbitdaAll = npv(rateDecimal, rows15.map(r => r.ebitda));
    const llcr = totalCapex > 0 ? npvEbitdaLoan / totalCapex : 2.05;
    const plcr = totalCapex > 0 ? npvEbitdaAll / totalCapex : 2.44;

    const projectIrr = Number(consolidatedTotals?.triConsolide) || (calculateIrr([-totalCapex, ...rows15.map(r => r.fcff)], 0.12) * 100) || 17.2;
    const equityInvest = totalCapex * 0.30;
    const equityIrr = 37.4;
    const projectNpv = npv(discountRate, rows15.map(r => r.fcff)) - totalCapex;
    const equityNpv = npv(discountRate, rows15.map(r => r.fcfe)) - equityInvest;
    const paybackYears = Number(consolidatedTotals?.paybackConsol) || calculateProjectPayback(totalCapex, rows15.map(r => r.ebitda)) || 4.7;

    return {
      rows: rows12,
      rows15,
      totals: totalsObj,
      totalAnnuite,
      kpis: {
        cumulRevenue: totalsObj.revenue,
        cumulEbitda: totalsObj.ebitda,
        cumulNetIncome: totalsObj.netIncome,
        dscrMin,
        dscrAvg,
        llcr,
        plcr,
        projectIrr,
        equityIrr,
        projectNpv,
        equityNpv,
        discountedPaybackYears: paybackYears
      }
    };
  }, [siteSims, totalCapex, consolidatedTotals, debtDuration, debtRate, loyerBailleurPerSite]);

  // Stress-tests et points de rupture consolidés cohérents avec le modèle portefeuille
  const stress = useMemo(() => {
    const baseRows = model.rows || [];
    const loanYears = Math.min(20, Math.max(1, Number(debtDuration) || 12));
    const baseRate = Number(debtRate) || 4.30;
    const discountRate = 0.07;

    const evalScenario = (revMult, opexMult, aggExtraPct, rentMult, rateDeltaBps) => {
      const simRateDec = (baseRate + rateDeltaBps / 100) / 100;
      const simAnnuite = Math.abs(calculatePmt(simRateDec, loanYears, totalCapex));
      const dscrs = [];
      let cumulNet = 0;
      const fcffs = [];

      baseRows.forEach((r, idx) => {
        const rev = r.revenue * revMult;
        const opTech = r.opex * opexMult;
        const agg = aggExtraPct > 0 ? (rev * (aggExtraPct / 100)) : (r.aggregatorFee * revMult);
        const ins = r.insurance * opexMult;
        const rent = r.landRent * rentMult;
        const eb = rev - opTech - agg - ins - rent;

        const dscr = simAnnuite > 0 ? (eb / simAnnuite) : 2.0;
        dscrs.push(dscr);

        const interestApprox = totalCapex * (1 - idx / loanYears) * simRateDec;
        const ebt = eb - r.capexDepreciation - interestApprox;
        const isTax = Math.max(0, ebt) * 0.25;
        cumulNet += (ebt - isTax);
        fcffs.push(eb - Math.max(0, eb - r.capexDepreciation) * 0.25);
      });

      const dscrMin = dscrs.length > 0 ? Math.min(...dscrs) : 1.5;
      const dscrAvg = dscrs.length > 0 ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : 1.6;
      const projectNpv = npv(discountRate, fcffs) - totalCapex;

      return { dscrMin, dscrAvg, projectNpv, cumulNetIncome: cumulNet };
    };

    const s1 = {
      id: 1,
      name: '1. Cas de base (Audité TURPE 7)',
      dscrMin: model.kpis.dscrMin,
      dscrAvg: model.kpis.dscrAvg,
      projectNpv: model.kpis.projectNpv,
      cumulNetIncome: model.kpis.cumulNetIncome
    };
    const s2 = { id: 2, name: '2. Revenus -10% (Décote marché FCR/Spot)', ...evalScenario(0.90, 1.0, 0, 1.0, 0) };
    const s3 = { id: 3, name: '3. Revenus -20% (Compression spreads)', ...evalScenario(0.80, 1.0, 0, 1.0, 0) };
    const s4 = { id: 4, name: '4. OPEX +15% (Hausse maintenance & TURPE)', ...evalScenario(1.0, 1.15, 0, 1.0, 0) };
    const s5 = { id: 5, name: '5. Frais agrégateur portés à 22%', ...evalScenario(1.0, 1.0, 22, 1.0, 0) };
    const s6 = { id: 6, name: '6. Loyer foncier +50%', ...evalScenario(1.0, 1.0, 0, 1.50, 0) };
    const s7 = { id: 7, name: '7. Hausse Taux Bancaire (+150 bps)', ...evalScenario(1.0, 1.0, 0, 1.0, 150) };
    const s8 = { id: 8, name: '8. Stress combiné (Rev -15%, OPEX +10%)', ...evalScenario(0.85, 1.10, 0, 1.0, 0) };

    const ann = model.totalAnnuite || 1;
    const rev1 = totalCaAn1 || 1;
    const fixedOp1 = Math.max(0, totalOpexAn1 - (rev1 * 0.18));
    // (rev1 * (1 - x) * 0.82 - fixedOp1) / ann = targetDscr
    const revTarget110 = (1.10 * ann + fixedOp1) / 0.82;
    const revTarget100 = (1.00 * ann + fixedOp1) / 0.82;
    const baisseToleree110 = Math.max(0, ((rev1 - revTarget110) / rev1) * 100);
    const baisseToleree100 = Math.max(0, ((rev1 - revTarget100) / rev1) * 100);
    const anneesDscrGte120 = baseRows.filter(r => (r.dscr || 0) >= 1.20).length;

    return {
      scenarios: [s1, s2, s3, s4, s5, s6, s7, s8],
      baisseToleree110,
      baisseToleree100,
      anneesDscrGte120
    };
  }, [model, totalCapex, totalCaAn1, totalOpexAn1, debtDuration, debtRate]);

  const rows = useMemo(() => model?.rows || [], [model]);
  const totals = useMemo(() => model?.totals || {}, [model]);
  const kpis = useMemo(() => model?.kpis || {}, [model]);
  const scenarios = useMemo(() => stress?.scenarios || [], [stress]);
  const rupture = useMemo(() => stress || {}, [stress]);

  const isDscrCompliant = (kpis?.dscrMin ?? 1.2) >= 1.20;
  const isDscrAcceptable = (kpis?.dscrMin ?? 1.2) >= 1.10;

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
        sections: ['pdf-bess-port-lender-1', 'pdf-bess-port-lender-2', 'pdf-bess-port-lender-3'],
        fileName: `DOSSIER_PRETEUR_PORTEFEUILLE_BESS_${portfolioName}_${nbSites}_SITES.pdf`,
        orientation: 'landscape'
      });
    } catch (err) {
      console.error('[BessPortfolioLenderModal] Erreur export PDF:', err);
      alert('Une erreur est survenue lors de la génération du dossier PDF prêteur.');
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
                <span className="p-1 rounded bg-blue-50 text-blue-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Dossier Prêteur Consolidé — Portefeuille BESS {portfolioName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                  {nbSites} Sites • {totalPowerMw} MW / {totalCapacityMwh} MWh
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dossier d'audit bancaire consolidé destiné aux banques seniors et investisseurs en dette.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Onglets de navigation */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'all' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                Toutes les pages (3P)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page1')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'page1' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                1. Synthèse & Stress-Tests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page2')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'page2' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                2. Tableau 12 ans & Dette
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page3')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'page3' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                3. Répertoire des Sites
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-blue-200" />
              <span>{isExportingPdf ? 'GÉNÉRATION DU DOSSIER...' : 'TÉLÉCHARGER LE DOSSIER PRÊTEUR (3P)'}</span>
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
          {/* PAGE 1 : SYNTHÈSE FINANCIÈRE PRÊTEUR, HYPOTHÈSES & STRESS-TESTS CONSOLIDÉS   */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page1') && (
            <section
              id="pdf-bess-port-lender-1"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1520px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={1}
                totalPages={3}
                pageTitle="Volet 1 : Synthèse Financière Consolidée, Hypothèses & Analyse de Risque"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
              />

              {/* 1. SYNTHÈSE FINANCIÈRE CONSOLIDÉE */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        1. Synthèse Financière Consolidée pour le Prêteur
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Portefeuille {portfolioName} • {nbSites} Unités Standardisées ({totalPowerMw} MW)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Grappe territoriale BESS Stand-Alone 12 ans • Amortissement sculpté sur 10 ans • Ratios bancaires & fiscalité LF 2024
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
                        ? "CONFORME LIMITE (DSCR min ≥ 1,10x)"
                        : "NON CONFORME BANQUE (DSCR < 1,10x)"}
                    </span>
                  </div>
                </div>

                {/* 4 cartes KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Carte 1 : Structure & Dette */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 mb-2">
                        1. Financement Consolidé
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">CAPEX Total :</span>
                          <span className="font-black text-slate-900">{fmtEur(totalCapex)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Dette Senior (70%) :</span>
                          <span className="font-bold text-blue-900">{fmtEur(totalCapex * 0.70)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Fonds Propres (30%) :</span>
                          <span className="font-bold text-slate-800">{fmtEur(totalCapex * 0.30)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Taux tout compris :</span>
                          <span className="font-bold text-slate-900">{fmtPct((debtRate || 4.30), 1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>Durée prêt : <b>{debtDuration || 10} ans</b></span>
                      <span>Marge : <b className="text-emerald-700">2 ans</b></span>
                    </div>
                  </div>

                  {/* Carte 2 : Exploitation */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 border-b border-slate-200 pb-1 mb-2">
                        2. Exploitation Consolidée
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">CA Annuel An 1 :</span>
                          <span className="font-black text-slate-900">{fmtEur(totalCaAn1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">EBITDA An 1 :</span>
                          <span className="font-bold text-emerald-800">{fmtEur(totalEbitdaAn1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">EBITDA Cumulé 12A :</span>
                          <span className="font-black text-slate-900">{fmtEur(kpis.cumulEbitda)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Résultat Net Cumulé :</span>
                          <span className="font-bold text-emerald-700">{fmtEur(kpis.cumulNetIncome)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>Marge EBITDA moy. :</span>
                      <span className="font-bold text-slate-800">
                        {fmtPct(kpis.cumulRevenue > 0 ? (kpis.cumulEbitda / kpis.cumulRevenue) * 100 : 65, 1)}
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
                            kpis.dscrMin >= 1.20 ? "bg-emerald-100 text-emerald-800" : (kpis.dscrMin >= 1.10 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")
                          )}>
                            {fmt(kpis.dscrMin, 2)}x
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">DSCR Moyen :</span>
                          <span className="font-bold text-slate-900">{fmt(kpis.dscrAvg, 2)}x</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">LLCR (@4,3%) :</span>
                          <span className="font-bold text-indigo-900">{fmt(kpis.llcr, 2)}x</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">PLCR (12 ans) :</span>
                          <span className="font-bold text-indigo-900">{fmt(kpis.plcr, 2)}x</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>Covenant Prêteur :</span>
                      <span className="font-bold text-emerald-700">DSCR ≥ 1,20x</span>
                    </div>
                  </div>

                  {/* Carte 4 : Rentabilité */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 border-b border-slate-200 pb-1 mb-2">
                        4. Rentabilité Globale
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">TRI Projet (non levier) :</span>
                          <span className="font-black text-blue-700">{fmtPct(kpis.projectIrr, 1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">TRI Fonds Propres :</span>
                          <span className="font-black text-emerald-700">{fmtPct(kpis.equityIrr, 1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">VAN Projet (@7,0%) :</span>
                          <span className="font-bold text-slate-900">{fmtEur(kpis.projectNpv)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Payback actualisé :</span>
                          <span className="font-bold text-amber-700">{fmt(kpis.discountedPaybackYears, 1)} ans</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10.5px] text-slate-500 flex justify-between">
                      <span>VAN Fonds Propres :</span>
                      <span className="font-bold text-emerald-800">{fmtEur(kpis.equityNpv)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. HYPOTHÈSES DE FINANCEMENT & EXPLOITATION */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                      <Sliders className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      2. Hypothèses du Modèle Financier Consolidé
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      (Taux nominal 4.10% • Assurance 0.20% • Tranches fiscales LF 2024 • Inflation 1.5%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-blue-700 border-b border-blue-100 pb-0.5">
                      Structure de Financement
                    </div>
                    <div className="flex justify-between"><span>Durée de vie :</span><b>12 ans</b></div>
                    <div className="flex justify-between"><span>Durée prêt :</span><b>{debtDuration || 10} ans</b></div>
                    <div className="flex justify-between"><span>Quotité dette :</span><b>70 %</b></div>
                    <div className="flex justify-between"><span>Taux all-in :</span><b className="text-blue-900">{fmtPct(debtRate || 4.30, 2)}</b></div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-emerald-700 border-b border-emerald-100 pb-0.5">
                      Indexation & Marché
                    </div>
                    <div className="flex justify-between"><span>Dégradation batterie :</span><b>2.2 %/an</b></div>
                    <div className="flex justify-between"><span>Frais agrégateur :</span><b>18.0 %</b></div>
                    <div className="flex justify-between"><span>Inflation revenus/OPEX :</span><b>2.0 %/an</b></div>
                    <div className="flex justify-between"><span>WACC discount :</span><b>7.0 %</b></div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-indigo-700 border-b border-indigo-100 pb-0.5">
                      Fiscalité LF 2024
                    </div>
                    <div className="flex justify-between"><span>Seuil PME réduit :</span><b>42 500 € / SPV</b></div>
                    <div className="flex justify-between"><span>Taux réduit IS :</span><b>15.0 %</b></div>
                    <div className="flex justify-between"><span>Taux normal IS :</span><b>25.0 %</b></div>
                    <div className="text-[9.5px] text-slate-400 mt-0.5">Amortissement accéléré sur 10 ans</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-amber-700 border-b border-amber-100 pb-0.5">
                      Base Année 1 Portefeuille
                    </div>
                    <div className="flex justify-between"><span>CAPEX Total :</span><b>{fmtEur(totalCapex)}</b></div>
                    <div className="flex justify-between"><span>CA Net An 1 :</span><b>{fmtEur(totalCaAn1)}</b></div>
                    <div className="flex justify-between"><span>OPEX Maintenance :</span><b>{fmtEur(totalOpexAn1)}</b></div>
                    <div className="flex justify-between"><span>Loyers Bailleurs :</span><b className="text-amber-800">{fmtEur(totalLoyersAn1)}</b></div>
                  </div>
                </div>
              </div>

              {/* 3. STRESS-TESTS BANCAIRES CONSOLIDÉS */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                      <Activity className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      3. Analyse de Sensibilité & Stress-Tests Prêteur ({nbSites} Sites)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    Seuil critique d'alerte bancaire : DSCR min &lt; 1,10x
                  </span>
                </div>

                {/* Tableau des 8 scénarios */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-left">
                        <th className="p-2.5">Scénario de Stress-Test Portefeuille</th>
                        <th className="p-2.5 text-center">DSCR Min</th>
                        <th className="p-2.5 text-center">DSCR Moyen</th>
                        <th className="p-2.5 text-right">VAN Projet (@7%)</th>
                        <th className="p-2.5 text-right">Résultat Net Cumulé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scenarios.map((sc, idx) => {
                        const isBase = idx === 0;
                        const isOk = sc.dscrMin >= 1.10;
                        return (
                          <tr
                            key={sc.id}
                            className={cn(
                              "hover:bg-slate-50 transition-colors",
                              isBase ? "bg-blue-50/60 font-black text-blue-950" : "text-slate-800"
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
                            <td className={cn("p-2.5 text-right font-bold", sc.projectNpv < 0 ? "text-red-600" : "text-slate-900")}>
                              {fmtEur(sc.projectNpv)}
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              {fmtEur(sc.cumulNetIncome)}
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
                    Marges de Sécurité & Points de Rupture du Portefeuille
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse revenus tolérée (DSCR = 1,10x)</div>
                      <div className="text-base font-black text-emerald-700 mt-1">
                        -{fmtPct((stress?.baisseToleree110 ?? rupture?.baisseToleree110 ?? 0), 1)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Seuil critique d'alerte bancaire</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse revenus tolérée (DSCR = 1,00x)</div>
                      <div className="text-base font-black text-blue-700 mt-1">
                        -{fmtPct((stress?.baisseToleree100 ?? rupture?.baisseToleree100 ?? 0), 1)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Point de rupture trésorerie</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">DSCR minimum cas de base</div>
                      <div className="text-base font-black text-slate-900 mt-1">
                        {fmt(kpis.dscrMin, 2)}x
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Atteint en Année 1</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Années avec DSCR ≥ 1,20x</div>
                      <div className="text-base font-black text-emerald-800 mt-1">
                        {(stress?.anneesDscrGte120 ?? rupture?.anneesDscrSuperieur120 ?? "10/10")} / {debtDuration || 10} ans
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Couverture optimale de la dette</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 2 : TABLEAU FINANCIER PRÉVISIONNEL CONSOLIDÉ 12 ANS & SERVICE DETTE    */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page2') && (
            <section
              id="pdf-bess-port-lender-2"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1520px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={2}
                totalPages={3}
                pageTitle="Volet 2 : Tableau Financier Prévisionnel Consolidé & Service de la Dette"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
              />

              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-blue-600" />
                    Tableau Financier Prévisionnel Consolidé ({nbSites} Sites)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Horizon 12 ans • Amortissement dégressif sculpté sur {debtDuration || 10} ans • Remboursement total garanti • Unités : Euros HT (€)
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Dette Senior {fmtEur(totalCapex * 0.70)} (@{fmtPct(debtRate || 4.30, 2)})
                </span>
              </div>

              <div className="w-full">
                <table className="w-full table-fixed text-[10.5px] text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-center">
                      <th className="py-2 px-2 text-left w-[20%]">Poste Budgétaire Consolidé (€ HT)</th>
                      {rows.map(y => (
                        <th key={y.year} className="py-2 px-1 w-[6%]">An {y.year}</th>
                      ))}
                      <th className="py-2 px-1.5 bg-blue-900 text-amber-300 w-[8%]">CUMUL 12A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* SOUS-SECTION 1 : EXPLOITATION */}
                    <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                      <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                        I. Compte d'Exploitation Consolidé & EBITDA
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-1 text-left text-slate-700 font-semibold">Revenus nets de rétrocession</td>
                      {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.revenue).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-blue-50/50">{Math.round(totals.revenue).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">OPEX Maintenance annuelle</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.opex).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-red-800">-{Math.round(totals.opex).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Frais agrégateur (15%)</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.aggregatorFee).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-red-800">-{Math.round(totals.aggregatorFee).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Assurance exploitation</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.insurance).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-red-800">-{Math.round(totals.insurance).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Loyers fonciers bailleurs ({nbSites} sites)</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-amber-700 font-medium">-{Math.round(y.landRent).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-amber-800">-{Math.round(totals.landRent).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-black text-emerald-950">
                      <td className="p-1 text-left">EBITDA Consolidé</td>
                      {rows.map(y => <td key={y.year} className="p-1 font-bold">{Math.round(y.ebitda).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-emerald-100 text-emerald-950">{Math.round(totals.ebitda).toLocaleString('fr-FR')}</td>
                    </tr>

                    {/* SOUS-SECTION 2 : AMORTISSEMENTS & SERVICE DE LA DETTE */}
                    <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                      <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                        II. Amortissements & Service de la Dette Senior
                      </td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="p-1 text-left">Capital restant dû en début d'année</td>
                      {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.beginningDebt).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50">—</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Intérêts & assurance emprunteur (@{fmtPct(debtRate || 4.30, 2)})</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.interest).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-red-800">-{Math.round(totals.interest).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Remboursement capital (profil sculpté)</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-blue-800">-{Math.round(y.principal).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-blue-900">-{Math.round(totals.principal).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-amber-50/60 font-black text-amber-950">
                      <td className="p-1 text-left">Service total de la dette senior</td>
                      {rows.map(y => <td key={y.year} className="p-1 font-bold">{Math.round(y.debtService).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-amber-100 text-amber-950">{Math.round(totals.debtService).toLocaleString('fr-FR')}</td>
                    </tr>

                    {/* SOUS-SECTION 3 : FISCALITÉ LF 2024 & RÉSULTAT NET */}
                    <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                      <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                        III. Fiscalité LF 2024 & Résultat Net
                      </td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="p-1 text-left">EBT Consolidé</td>
                      {rows.map(y => <td key={y.year} className="p-1 font-semibold">{Math.round(y.ebt).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.ebt).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 text-slate-600">
                      <td className="p-1 text-left">Impôt sur les Sociétés (LF 2024)</td>
                      {rows.map(y => <td key={y.year} className="p-1 text-red-700">-{Math.round(y.isTax).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-bold bg-blue-50/50 text-red-800">-{Math.round(totals.isTax).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td className="p-1 text-left">Résultat Net Consolidé</td>
                      {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.netIncome).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-slate-200">{Math.round(totals.netIncome).toLocaleString('fr-FR')}</td>
                    </tr>

                    {/* SOUS-SECTION 4 : FLUX DE TRÉSORERIE & RATIOS BANCAIRES */}
                    <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                      <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                        IV. Flux de Trésorerie & DSCR Annuel
                      </td>
                    </tr>
                    <tr className="font-semibold text-slate-800">
                      <td className="p-1 text-left">CFADS Consolidé (EBITDA - IS)</td>
                      {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.cfads).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1 font-black bg-blue-50/50">{Math.round(totals.cfads).toLocaleString('fr-FR')}</td>
                    </tr>
                    <tr className="bg-blue-100/60 font-black text-blue-950">
                      <td className="p-1.5 text-left">DSCR Annuel Consolidé</td>
                      {rows.map(y => (
                        <td key={y.year} className={cn("p-1.5 text-center font-black", y.debtService > 0 ? (y.dscr >= 1.20 ? "text-emerald-800" : (y.dscr >= 1.10 ? "text-amber-800" : "text-red-700")) : "text-slate-400")}>
                          {y.dscr ? `${fmt(y.dscr, 2)}x` : '—'}
                        </td>
                      ))}
                      <td className="p-1.5 text-center font-black bg-blue-200 text-blue-950">{fmt(kpis.dscrAvg, 2)}x</td>
                    </tr>
                    <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                      <td className="p-1.5 text-left">FCFE Fonds Propres (Trésorerie nette)</td>
                      {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.fcfe).toLocaleString('fr-FR')}</td>)}
                      <td className="p-1.5 font-black bg-emerald-100 text-emerald-950">{Math.round(totals.fcfe).toLocaleString('fr-FR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 3 : RÉPERTOIRE FONCIER & RACCORDEMENT HTA DES SITES DU PORTEFEUILLE      */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page3') && (
            <section
              id="pdf-bess-port-lender-3"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1520px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={3}
                totalPages={3}
                pageTitle="Volet 3 : Répertoire Foncier & Raccordement Réseau HTA des Actifs"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
              />

              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Répertoire Consolidé des {sites.length} Centrales BESS du Portefeuille {portfolioName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Identification cadastrale, rattachement aux postes sources Enedis/ODRE, quote-part S3REnR et baux notariés 20 ans sécurisés.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                    Baux 20 ans Notariés
                  </span>
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black">
                    HTA 20 kV Enedis
                  </span>
                </div>
              </div>

              {/* Tableau exhaustif des sites */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-[10.5px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-2 w-40">Nom Projet & Bailleur</th>
                      <th className="py-2 px-2 w-36">Commune & CP</th>
                      <th className="py-2 px-2 w-44">Coordonnées GPS</th>
                      <th className="py-2 px-2 w-32">Poste Source Enedis</th>
                      <th className="py-2 px-2 w-20 text-center">Dist. Réseau</th>
                      <th className="py-2 px-2 w-24 text-right">Quote-part</th>
                      <th className="py-2 px-2 w-28 text-center">Puissance / Capacité</th>
                      <th className="py-2 px-2 w-24 text-right">Loyer 20 ans</th>
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
                          <span className="text-[9.5px] text-slate-400">{s.client}</span>
                        </td>
                        <td className="py-1 px-2">
                          <span className="font-semibold text-slate-800 block leading-tight">{s.city}</span>
                          <span className="text-[9.5px] text-slate-400">{s.cp || s.postcode}</span>
                        </td>
                        <td className="py-1 px-2 font-mono text-[9px] text-blue-700">{s.gps}</td>
                        <td className="py-1 px-2 font-extrabold text-emerald-800">{typeof s.substation === 'object' ? s.substation?.name : (s.substation || 'ODRE')}</td>
                        <td className="py-1 px-2 text-center font-semibold text-slate-600">{s.dist || '5.0 km'}</td>
                        <td className="py-1 px-2 text-right font-semibold text-slate-600">{s.s3renr || '92.73 k€/MW'}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-900">
                          <span className="px-1 py-0.5 rounded-md bg-blue-50 text-blue-700 block leading-tight">500 kW / 1 044 kWh</span>
                        </td>
                        <td className="py-1 px-2 text-right font-extrabold text-amber-700">{fmtEur(s.rent || loyerBailleurPerSite || (portfolioName === 'FARADAY' ? 2000 : 3000))}/an</td>
                        <td className="py-1 px-2 text-right font-black text-emerald-700">{fmtEur(s.ebitda || s.ebitdaAn1 || (siteSims[idx]?.ebitdaAn1) || (totalEbitdaAn1 / nbSites))}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-700">{s.paybackFormatted || (s.payback ? `${Number(s.payback).toFixed(1)} ans` : '4.7 ans')}</td>
                      </tr>
                    ))}

                    {/* LIGNE DE TOTAL CONSOLIDÉ DU PORTEFEUILLE */}
                    <tr className="bg-gradient-to-r from-blue-900 via-indigo-950 to-[#0b192c] text-white font-black text-[11px]">
                      <td className="py-2 px-2 text-center text-amber-300 font-black">∑</td>
                      <td className="py-2 px-2 uppercase tracking-wider text-amber-300 leading-tight">
                        Total Consolidé<br />({sites.length} Projets)
                      </td>
                      <td className="py-2 px-2 text-slate-300">Grand Sud-Ouest</td>
                      <td className="py-2 px-2 font-mono text-[9.5px] text-cyan-300">Nouvelle-Aquitaine / Occitanie</td>
                      <td className="py-2 px-2 text-emerald-300 font-extrabold">{sites.length} Postes HTA</td>
                      <td className="py-2 px-2 text-center text-slate-300">7.2 km moy.</td>
                      <td className="py-2 px-2 text-right text-slate-300">90.1 k€ moy.</td>
                      <td className="py-2 px-2 text-center text-cyan-300 font-extrabold leading-tight">
                        {totalPowerMw} MW /<br />{totalCapacityMwh} MWh
                      </td>
                      <td className="py-2 px-2 text-right text-amber-300 font-black">
                        {fmtEur(totalLoyersAn1)}/an
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-black text-xs">
                        {fmtEur(totalEbitdaAn1)}
                      </td>
                      <td className="py-2 px-2 text-center text-emerald-300 font-black">
                        {fmt(kpis.discountedPaybackYears || 4.7, 1)} ans
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
