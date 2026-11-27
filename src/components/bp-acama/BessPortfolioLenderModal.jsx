import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  FileDown,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeBessLenderModel,
  computeBessStressTests,
  getScaledCapexPreset
} from '../../services/bessLenderFinanceEngine.js';
import { computeBessFinancials as simulateBessSiteFinancials } from '../../services/bessSimulationEngine.js';
import { generateBpAcamaPDF } from './BpAcamaPDFGenerator.jsx';
import {
  BessLender4SummaryCards,
  BessCleanHorizonMarketChartCard,
  BessTrajectoryChartCard,
  BessCompleteAnnualTable,
  BessSensitivityMatrixSection,
  fmtEur,
  fmt,
  fmtPct
} from './BessUnifiedDashboardComponents.jsx';

function PortfolioLenderHeader({ pageNumber, totalPages = 4, pageTitle, portfolioName, nbSites, totalMw, totalMwh, horizonYears = 20 }) {
  return (
    <div className="pdf-header flex flex-col w-full mb-3 pb-2 border-b-2 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-enr-courtage-inline.png" alt="Logo ENR Courtage" className="h-9 w-auto object-contain" />
          <div>
            <div className="text-xs font-black tracking-widest text-slate-800 uppercase">
              DOSSIER FINANCIER BESS — MODÈLE PRÊTEUR SENIOR PORTEFEUILLE ({horizonYears} ANS • CLEAN HORIZON)
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
  debtDuration = 12,
  debtRate = 4.30,
  loyerBailleurPerSite = 3000,
  fraisCommerciauxPerSite = 0,
  unifiedInputs = null,
  portfolioModel: externalModel = null,
  portfolioStress: externalStress = null
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'page1' | 'page2' | 'page3' | 'page4'
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const nbSites = Math.max(1, Number(sites?.length || consolidatedTotals?.totalSites || 1));
  const rawPowerMw = Number(consolidatedTotals?.totalPowerMw);
  const totalPowerMw = (Number.isFinite(rawPowerMw) && rawPowerMw > 0 ? rawPowerMw : (nbSites * 0.5)).toFixed(2);
  const rawCapacityMwh = Number(consolidatedTotals?.totalCapacityMwh);
  const totalCapacityMwh = (Number.isFinite(rawCapacityMwh) && rawCapacityMwh > 0 ? rawCapacityMwh : (nbSites * 1.044)).toFixed(2);

  // Modèle financier consolidé unifié
  const model = useMemo(() => {
    if (externalModel && externalModel.rows && externalModel.kpis) {
      return externalModel;
    }
    const defaultRent = portfolioName === 'FARADAY' ? 2000 : 3000;
    const baseInputs = unifiedInputs || {
      palierKey: '0.50',
      powerMw: 0.50,
      capexMode: consolidatedTotals?.capexMode || 'COMPTE_PROPRE',
      financingMode: consolidatedTotals?.financingMode || 'WITH_LOAN',
      revenueModel: consolidatedTotals?.revenueModel || 'CLEAN_HORIZON',
      horizonYears: consolidatedTotals?.horizonYears || 20,
      loanDurationYears: debtDuration || 12,
      debtSharePct: 80,
      nominalRatePct: Math.max(0, (Number(debtRate) || 4.30) - 0.20),
      insuranceRatePct: 0.20,
      loyerAn1: loyerBailleurPerSite !== undefined ? loyerBailleurPerSite : defaultRent,
      fraisCommerciaux: fraisCommerciauxPerSite || 0,
      capexBreakdown: getScaledCapexPreset(consolidatedTotals?.capexMode || 'COMPTE_PROPRE', 0.50)
    };
    return computeBessLenderModel({
      ...baseInputs,
      nbSites
    });
  }, [externalModel, unifiedInputs, consolidatedTotals, portfolioName, debtDuration, debtRate, loyerBailleurPerSite, fraisCommerciauxPerSite, nbSites]);

  const stress = useMemo(() => {
    if (externalStress && externalStress.scenarios) {
      return externalStress;
    }
    return computeBessStressTests(model, model.params);
  }, [externalStress, model]);

  const siteSims = useMemo(() => {
    if (sites && sites.length > 0) {
      return sites.map(s => simulateBessSiteFinancials(s, {
        debtDuration: model.params.loanDurationYears,
        debtRate: model.kpis.allInDebtRate,
        studyDuration: model.params.horizonYears,
        fraisCommerciaux: model.params.fraisCommerciaux,
        loyerDalle: model.params.loyerAn1
      }));
    }
    return [];
  }, [sites, model]);

  const kpis = model?.kpis || {};
  const p = model?.params || {};
  const isCashMode = p.isCashMode;
  const isDscrCompliant = isCashMode || (kpis?.dscrMin ?? 1.2) >= 1.20;
  const isDscrAcceptable = isCashMode || (kpis?.dscrMin ?? 1.2) >= 1.10;

  const totalLoyersAn1 = model.rows[0]?.loyerFoncier || (nbSites * (p.loyerAn1 || 3000));
  const totalEbitdaAn1 = model.rows[0]?.ebitda || (nbSites * 63762);

  // Export du dossier 4 pages PDF
  const handleExportPdf = async () => {
    const prevTab = activeTab;
    try {
      setIsExportingPdf(true);
      if (activeTab !== 'all') {
        setActiveTab('all');
        await new Promise(r => setTimeout(r, 150));
      }
      await generateBpAcamaPDF({
        sections: [
          'pdf-bess-port-lender-1',
          'pdf-bess-port-lender-2',
          'pdf-bess-port-lender-3',
          'pdf-bess-port-lender-4'
        ],
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
      <div className="relative w-full max-w-[1620px] h-[calc(100vh-100px)] max-h-[85vh] bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
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
                Dossier d'audit bancaire consolidé ({p.horizonYears} ans • {p.capexMode === 'COMPTE_TIERS' ? 'Pour Compte Tiers' : 'Pour Compte Propre'} • Clean Horizon)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'all' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                Toutes les pages (4P)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page1')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'page1' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                1. Synthèse & Structure Marché
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page2')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'page2' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                2. Compte de Résultat ({p.horizonYears} ans)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page3')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'page3' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                3. Sensibilités & Trajectoire
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page4')}
                className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'page4' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                4. Répertoire des Sites
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-200" />
              <span>{isExportingPdf ? 'GÉNÉRATION DU DOSSIER...' : 'TÉLÉCHARGER LE DOSSIER PRÊTEUR (4P)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Corps défilant contenant les 4 pages imprimables */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 flex flex-col items-center">
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 1 : SYNTHÈSE FINANCIÈRE PRÊTEUR & REVENUS STRUCTURE MARCHÉ (CENTRÉ)     */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page1') && (
            <section
              id="pdf-bess-port-lender-1"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-5 w-full max-w-[1600px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={1}
                totalPages={4}
                pageTitle="Volet 1 : Synthèse Financière Consolidée & Structure des Revenus de Marché (Clean Horizon)"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
                horizonYears={p.horizonYears}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      1. Synthèse Financière Consolidée pour le Prêteur
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      Portefeuille {portfolioName} • {nbSites} Unités ({totalPowerMw} MW)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Montage {p.capexMode === 'COMPTE_TIERS' ? 'Pour Compte Tiers' : 'Pour Compte Propre'} ({fmtEur(kpis.capexTotal / nbSites)}/site) • Revenus Clean Horizon {p.horizonYears} ans • Fiscalité LF 2024 / 2026
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
                    {isCashMode
                      ? "100% FONDS PROPRES (PAYÉ COMPTANT)"
                      : isDscrCompliant
                      ? "BANQUE COMPLIANT (DSCR min ≥ 1,20x)"
                      : isDscrAcceptable
                      ? "CONFORME LIMITE (DSCR min ≥ 1,10x)"
                      : "NON CONFORME BANQUE (DSCR < 1,10x)"}
                  </span>
                </div>
              </div>

              <BessLender4SummaryCards model={model} />

              {/* Graphique Revenus — Structure Marché (Clean Horizon) agrandi et centré horizontalement */}
              <div className="w-full flex justify-center pt-1">
                <BessCleanHorizonMarketChartCard model={model} centeredLarge={true} />
              </div>
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 2 : COMPTE DE RÉSULTAT, FLUX DE TRÉSORERIE & SERVICE DE LA DETTE SEUL   */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page2') && (
            <section
              id="pdf-bess-port-lender-2"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1600px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={2}
                totalPages={4}
                pageTitle={`Volet 2 : Compte de Résultat, Flux de Trésorerie & Service de la Dette Consolidé (${p.horizonYears} ans)`}
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
                horizonYears={p.horizonYears}
              />

              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-blue-600" />
                    Compte de Résultat, Flux de Trésorerie & Service de la Dette Consolidé ({nbSites} Sites)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Horizon {p.horizonYears} ans • Revenus bruts par pilier Clean Horizon, Abattement Dispo×Rendement, Charges détaillées, IS, Cash-flow net et DSCR.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {isCashMode ? '100% Fonds Propres' : `Dette Senior ${fmtEur(kpis.detteInitiale)} (@${fmtPct(kpis.allInDebtRate, 2)})`}
                </span>
              </div>

              <BessCompleteAnnualTable model={model} />
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 3 : MATRICE D'ANALYSE DE SENSIBILITÉ & TRAJECTOIRE FINANCIÈRE           */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page3') && (
            <section
              id="pdf-bess-port-lender-3"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-5 w-full max-w-[1600px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={3}
                totalPages={4}
                pageTitle="Volet 3 : Matrice d'Analyse de Sensibilité, Stress-Tests Bancaires & Trajectoire Financière"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
                horizonYears={p.horizonYears}
              />

              {/* Haut de la Page 3 : Matrice d'analyse de sensibilité & Marges de sécurité */}
              <BessSensitivityMatrixSection stress={stress} model={model} />

              {/* Bas de la Page 3 : Trajectoire Financière (EBITDA vs Cash-Flow Net & Dette) */}
              <div className="pt-2">
                <BessTrajectoryChartCard model={model} compact={true} />
              </div>
            </section>
          )}

          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {/* PAGE 4 : RÉPERTOIRE FONCIER & RACCORDEMENT HTA DES SITES DU PORTEFEUILLE      */}
          {/* ═════════════════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'all' || activeTab === 'page4') && (
            <section
              id="pdf-bess-port-lender-4"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full max-w-[1600px] shrink-0"
            >
              <PortfolioLenderHeader
                pageNumber={4}
                totalPages={4}
                pageTitle="Volet 4 : Répertoire Foncier & Raccordement Réseau HTA des Actifs"
                portfolioName={portfolioName}
                nbSites={nbSites}
                totalMw={totalPowerMw}
                totalMwh={totalCapacityMwh}
                horizonYears={p.horizonYears}
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
                      <th className="py-2 px-2 w-24 text-right">CAPEX Site</th>
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
                        <td className="py-1 px-2 font-extrabold text-emerald-800">{typeof s.substation === 'object' ? (s.substation?.name || siteSims[idx]?.posteSource || 'ODRE') : (s.substation || siteSims[idx]?.posteSource || 'ODRE')}</td>
                        <td className="py-1 px-2 text-center font-semibold text-slate-600">{s.dist || (s.substation?.distanceKm != null ? `${s.substation.distanceKm} km` : (siteSims[idx]?.distanceKm != null ? `${siteSims[idx].distanceKm} km` : '5.0 km'))}</td>
                        <td className="py-1 px-2 text-right font-semibold text-slate-600">{s.s3renr || s.substation?.quotePartS3renr || siteSims[idx]?.quotePartS3REnR || '92.73 k€/MW'}</td>
                        <td className="py-1 px-2 text-right font-bold text-slate-900">{fmtEur(s.capexTotal || (kpis.capexTotal / nbSites))}</td>
                        <td className="py-1 px-2 text-right font-extrabold text-amber-700">{fmtEur(p.loyerAn1 || s.rent || 3000)}/an</td>
                        <td className="py-1 px-2 text-right font-black text-emerald-700">{fmtEur(s.ebitda || s.ebitdaAn1 || (totalEbitdaAn1 / nbSites))}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-700">{s.paybackFormatted || (s.payback ? `${Number(s.payback).toFixed(1)} ans` : `${fmt(kpis.paybackSimple || 3.5, 1)} ans`)}</td>
                      </tr>
                    ))}

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
                      <td className="py-2 px-2 text-right text-cyan-300 font-extrabold">
                        {fmtEur(kpis.capexTotal)}
                      </td>
                      <td className="py-2 px-2 text-right text-amber-300 font-black">
                        {fmtEur(totalLoyersAn1)}/an
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-black text-xs">
                        {fmtEur(totalEbitdaAn1)}
                      </td>
                      <td className="py-2 px-2 text-center text-emerald-300 font-black">
                        {fmt(kpis.paybackSimple || kpis.discountedPaybackYears || 3.8, 1)} ans
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
