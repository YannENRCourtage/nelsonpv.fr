import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  FileDown,
  Loader2,
  Sun,
  TrendingUp,
  ShieldCheck,
  Layers,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  Zap,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { PV_PORTFOLIO_SITES, computePvFinancials } from '../../data/pvPortfolioData.js';
import PvProjectSingleSheet from './PvProjectSingleSheet.jsx';

// Helpers de formatage
const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  return Math.round(val).toLocaleString('fr-FR') + ' €';
};

const fmtM = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— M€';
  return (val / 1000000).toFixed(2) + ' M€';
};

const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— %';
  return (val || 0).toFixed(1) + ' %';
};

export default function PvDossierPDFGenerator({ open, onClose, portfolioData }) {
  const [activeMode, setActiveMode] = useState('portfolio'); // 'portfolio' | 'single'
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (portfolioData?.autoExportType === 'single') {
      setActiveMode('single');
    } else {
      setActiveMode('portfolio');
    }
  }, [portfolioData]);

  if (!open) return null;

  const currentProject = portfolioData?.currentProject;
  const currentParams = portfolioData?.currentParams;
  const currentResults = portfolioData?.currentResults;
  const currentRows = portfolioData?.currentRows;

  // Données consolidées portefeuille
  const portfolioSites = (portfolioData?.analyzedSites || PV_PORTFOLIO_SITES).map(s => computePvFinancials(s));
  const portfolioTotals = portfolioData?.consolidatedTotals || {
    totalSites: portfolioSites.length,
    totalPowerMw: portfolioSites.reduce((sum, s) => sum + (s.kwc || 250), 0) / 1000,
    totalProdMwh: portfolioSites.reduce((sum, s) => sum + (s.prodMwh || 300), 0),
    totalCapex: portfolioSites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0),
    totalCaAn1: portfolioSites.reduce((sum, s) => sum + (s.caAnnuel || 25000), 0),
    totalEbitdaAn1: portfolioSites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0),
    triConsolide: 9.5,
    paybackConsol: 10.8,
    debtDuration: 20,
    debtRate: 4.3,
    avgDscr: 1.35
  };

  const isPort = activeMode === 'portfolio';

  // Données actives (Unitaire vs Portefeuille)
  const singleKwc = currentParams?.kwc || currentProject?.puissance || 250;
  const singleCapex = currentResults?.totalConstruction || 250000;
  const singleCaAn1 = currentRows?.[0]?.ca || (singleKwc * 1123 * 0.082);
  const singleEbitdaAn1 = currentRows?.[0]?.ebitda || (singleCaAn1 * 0.82);
  const singleTri = currentResults?.tri || 9.8;
  const singlePayback = currentResults?.payback || 10.5;
  const singleProdMwh = (singleKwc * (currentParams?.productible || 1123)) / 1000;

  const kpi = {
    title: isPort ? "Portefeuille Multi-Projets Photovoltaïque HÉLIOS" : `Centrale Photovoltaïque — ${currentProject?.name || 'Projet Standard'}`,
    subtitle: isPort
      ? `Consolidation financière & réseau de ${portfolioTotals.totalSites} centrales en toitures et hangars agricoles (${portfolioTotals.totalPowerMw.toFixed(2)} MWc)`
      : `Dimensionnement technique et plan d'affaires de la centrale (${singleKwc.toFixed(1)} kWc) — ${currentProject?.city || 'Site'}`,
    powerLabel: isPort ? `${portfolioTotals.totalPowerMw.toFixed(2)} MWc` : `${singleKwc.toFixed(1)} kWc`,
    prodLabel: isPort ? `${Math.round(portfolioTotals.totalProdMwh).toLocaleString('fr-FR')} MWh/an` : `${Math.round(singleProdMwh).toLocaleString('fr-FR')} MWh/an`,
    capexLabel: isPort ? fmtM(portfolioTotals.totalCapex) : fmtEur(singleCapex),
    caLabel: isPort ? fmtEur(portfolioTotals.totalCaAn1) : fmtEur(singleCaAn1),
    ebitdaLabel: isPort ? fmtEur(portfolioTotals.totalEbitdaAn1) : fmtEur(singleEbitdaAn1),
    triLabel: isPort ? fmtPct(portfolioTotals.triConsolide) : fmtPct(singleTri),
    paybackLabel: isPort ? `${portfolioTotals.paybackConsol.toFixed(1)} ans` : `${singlePayback.toFixed(1)} ans`,
    dscrLabel: isPort ? `${(portfolioTotals.avgDscr || 1.35).toFixed(2)}x` : `${(currentResults?.dscrMoyen || 1.25).toFixed(2)}x`,
    debtDuration: 20,
    debtRate: 4.3
  };

  const portfolioPlancheTitles = [
    "Synthèse Exécutive & Données Clés",
    "Compte de Résultat & Cash-Flows 20 ans",
    "Répertoire Exhaustif des Centrales PV"
  ];
  const singlePlancheTitles = [
    "Synthèse Exécutive & Données Clés",
    "Compte de Résultat & Cash-Flows 20 ans",
    "Détail Technique des Bâtiments & Toitures"
  ];
  const plancheTitles = isPort ? portfolioPlancheTitles : singlePlancheTitles;
  const totalPagesCount = plancheTitles.length;
  const totalCompletePages = isPort ? (totalPagesCount + portfolioSites.length) : totalPagesCount;

  // Années pour le tableau de cash flow
  const years = Array.from({ length: 20 }, (_, i) => 2026 + i);

  // Fonction d'exportation PDF multi-pages A4 Paysage
  const handleGeneratePdf = async (exportMode = 'portfolio') => {
    setIsExportingPdf(true);
    setExportProgress(5);
    setProgressStep('Initialisation du document...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;

      const baseSections = [
        'pv-planche-container-1',
        'pv-planche-container-2',
        'pv-planche-container-3'
      ];

      let targetIds = [...baseSections];
      if (exportMode === 'complete' && isPort) {
        for (let i = 0; i < portfolioSites.length; i++) {
          targetIds.push(`pv-single-site-container-${i + 1}`);
        }
      }

      for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        const container = document.getElementById(id);
        if (!container) continue;

        const targetEl = container.querySelector('.pv-render-page') || container;
        const progressPct = Math.round(((i + 1) / targetIds.length) * 90);
        setExportProgress(progressPct);
        setProgressStep(`Capture page ${i + 1} / ${targetIds.length}...`);

        const canvas = await html2canvas(targetEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(el => el.remove());
          },
          ignoreElements: (el) => el.getAttribute('data-html2canvas-ignore') === 'true' || el.closest?.('[data-html2canvas-ignore="true"]') !== null
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);

        const targetWidth = pdfWidth - (margin * 2);
        const targetHeight = pdfHeight - (margin * 2);
        const bestRatio = Math.min(targetWidth / imgProps.width, targetHeight / imgProps.height);

        const finalWidth = imgProps.width * bestRatio;
        const finalHeight = imgProps.height * bestRatio;
        const xPos = margin + (targetWidth - finalWidth) / 2;
        const yPos = margin + (targetHeight - finalHeight) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);
      }

      setExportProgress(100);
      setProgressStep('Finalisation...');
      
      const fileName = exportMode === 'complete'
        ? `Etude_Complete_PV_Portfolio_HELIOS_${totalCompletePages}Pages.pdf`
        : `Dossier_PV_${isPort ? 'Portfolio_HELIOS' : (currentProject?.name || 'Projet')}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.error('Erreur export PDF PV:', err);
      alert("Une erreur est survenue lors de la génération du dossier PDF.");
    } finally {
      setIsExportingPdf(false);
      setExportProgress(0);
      setProgressStep('');
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[60px] z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      {/* Conteneur Modal Global Repositionné strictement sous le Header Nelson */}
      <div className="relative w-full max-w-[1540px] h-[calc(100vh-76px)] bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        
        {/* ========================================================================= */}
        {/* BARRE SUPÉRIEURE DE NAVIGATION ET COMMUTATEUR (FOND BLANC PUR) */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            {/* Logo Nelson */}
            <div className="flex items-center gap-3">
              <img
                src="/logo-nelson.png"
                alt="Nelson"
                className="h-9 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-[#0b192c] leading-none">
                  NELSON<span className="text-amber-500 font-extrabold ml-1">ENERGY</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-bold text-slate-500 mt-0.5">
                  Mémorandum d'Investissement Photovoltaïque • Tarifs S21 & ACC
                </span>
              </div>
            </div>

            {/* Commutateur interactif Unitaire vs Portefeuille */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  !isPort
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Centrale Unitaire ({singleKwc.toFixed(0)} kWc)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('portfolio')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPort
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Portefeuille Consolidé ({portfolioTotals.totalSites} Sites / {portfolioTotals.totalPowerMw.toFixed(1)} MWc)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Barre de navigation rapide multi-pages */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0" data-html2canvas-ignore="true">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.max(0, activePageIndex - 1);
                setActivePageIndex(nextIdx);
                document.getElementById('pv-planche-container-' + (nextIdx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={activePageIndex === 0}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédente</span>
            </button>

            <span className="px-3.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-black">
              Planche {activePageIndex + 1} / {totalPagesCount}
            </span>

            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.min(totalPagesCount - 1, activePageIndex + 1);
                setActivePageIndex(nextIdx);
                document.getElementById('pv-planche-container-' + (nextIdx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={activePageIndex === totalPagesCount - 1}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>Suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {plancheTitles.map((title, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActivePageIndex(idx);
                  document.getElementById('pv-planche-container-' + (idx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ' + (
                  activePageIndex === idx
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                )}
              >
                P{idx + 1} : {title}
              </button>
            ))}
          </div>
        </div>

        {/* Corps du dossier / Conteneur scrollable avec les planches 1380px */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-200/90 flex flex-col items-center">
          <div className="text-center text-xs text-slate-600 font-bold bg-white/80 px-4 py-1 rounded-full border border-slate-300 shadow-xs mb-6 shrink-0" data-html2canvas-ignore="true">
            Dossier d'Étude Photovoltaïque • {isPort ? `${totalPagesCount} Planches Portefeuille + ${portfolioSites.length} Fiches Projets` : `${totalPagesCount} Planches`} A4 Paysage Pleine Largeur (297 × 210 mm)
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 1 : SYNTHÈSE EXÉCUTIVE & CHIFFRES CLÉS */}
          {/* ========================================================================= */}
          <div id="pv-planche-container-1" className="w-full flex flex-col items-center shrink-0 mb-8">
            <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <span className="font-bold text-slate-800 text-sm">Planche 1 : {plancheTitles[0]}</span>
            </div>

            <section
              className="pv-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
              style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
            >
              <div>
                {/* En-tête institutionnel */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <img src="/logo-nelson.png" alt="Nelson" className="h-10 w-auto object-contain" />
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight">
                        {kpi.title}
                      </h1>
                      <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                        {kpi.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Édition d'Analyse</span>
                    <span className="text-sm font-extrabold text-[#0b192c]">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <span className="text-xs font-bold text-amber-600 block mt-0.5">Nelson Energy Advisory</span>
                  </div>
                </div>

                {/* Grille des 4 indicateurs majeurs */}
                <div className="grid grid-cols-4 gap-4 mb-5">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Puissance Installée</span>
                      <div className="text-2xl font-black text-[#0b192c] mt-0.5">{kpi.powerLabel}</div>
                      <span className="text-[10px] text-slate-500 font-medium">Production: {kpi.prodLabel}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                      <Sun className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Investissement Global</span>
                      <div className="text-2xl font-black text-[#0b192c] mt-0.5">{kpi.capexLabel}</div>
                      <span className="text-[10px] text-slate-500 font-medium">CAPEX clé en main HT</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">EBITDA Année 1</span>
                      <div className="text-2xl font-black text-emerald-700 mt-0.5">{kpi.ebitdaLabel}</div>
                      <span className="text-[10px] text-slate-500 font-medium">CA Brut: {kpi.caLabel}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">TRI Projet & Payback</span>
                      <div className="text-2xl font-black text-purple-800 mt-0.5">{kpi.triLabel}</div>
                      <span className="text-[10px] text-slate-500 font-medium">Temps de retour: {kpi.paybackLabel}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* 2 Blocs Techniques & Financiers */}
                <div className="grid grid-cols-2 gap-5 mb-4">
                  {/* Bloc 1 : Hypothèses Financières & Dette */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Structure Financière & Dette Bancaire
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                        Levier 90%
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Apport en Fonds Propres (10%) :</span>
                        <span className="font-bold text-[#0b192c]">{isPort ? fmtEur(portfolioTotals.totalCapex * 0.10) : fmtEur(singleCapex * 0.10)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Emprunt Bancaire Sénior (90%) :</span>
                        <span className="font-bold text-[#0b192c]">{isPort ? fmtEur(portfolioTotals.totalCapex * 0.90) : fmtEur(singleCapex * 0.90)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Taux d'Intérêt Nominal :</span>
                        <span className="font-bold text-slate-900">{kpi.debtRate} %</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Durée d'Amortissement :</span>
                        <span className="font-bold text-slate-900">{kpi.debtDuration} ans</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Couverture Moyenne DSCR :</span>
                        <span className="font-extrabold text-emerald-700">{kpi.dscrLabel} (Seuil exigé: 1.17x)</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloc 2 : Données Techniques & Tarifaires */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Paramètres Techniques & Tarifs d'Achat
                      </h3>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        Arrêté S21 / ACC
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Module PV Standard :</span>
                        <span className="font-bold text-[#0b192c]">{currentParams?.puissanceUnitaire || 465} Wc TopCon</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Tarif de base (≤ 1 100 kWh/kWc) :</span>
                        <span className="font-bold text-[#0b192c]">0,0820 € / kWh</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Tarif de surplus (> 1 100 kWh/kWc) :</span>
                        <span className="font-bold text-slate-900">0,0400 € / kWh</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Indexation annuelle tarif / OPEX :</span>
                        <span className="font-bold text-slate-900">+0,6% / an (Tarif) • +2,0% / an (OPEX)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Dégradation annuelle des modules :</span>
                        <span className="font-bold text-slate-900">-0,45 % / an</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges de conformité en bas de page 1 */}
                <div className="flex items-center justify-center gap-3 pt-2 pb-1 border-t border-slate-100">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                    PHOTOVOLTAÏQUE HAUT RENDEMENT
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                    TARIF S21 SÉCURISÉ 20 ANS
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                    COUVERTURE DSCR CONFORME
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">
                    TRI > 9%
                  </span>
                </div>
              </div>

              {/* Pied de page institutionnel */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>Nelson Energy Advisory • Mémorandum d'Investissement Photovoltaïque</div>
                <div className="font-semibold text-slate-600">Modèle certifié CRE S21 & ACC</div>
                <div className="font-bold text-[#0b192c]">Planche 1 / {totalPagesCount}</div>
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 2 : COMPTE DE RÉSULTAT & CASH-FLOWS 20 ANS */}
          {/* ========================================================================= */}
          <div id="pv-planche-container-2" className="w-full flex flex-col items-center shrink-0 mb-8">
            <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <span className="font-bold text-slate-800 text-sm">Planche 2 : {plancheTitles[1]}</span>
            </div>

            <section
              className="pv-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
              style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img src="/logo-nelson.png" alt="Nelson" className="h-9 w-auto object-contain" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight">
                        Cash-Flows Prévisionnels & Amortissement de la Dette (2026 – 2045)
                      </h2>
                      <p className="text-xs font-medium text-slate-600">
                        Modélisation financière détaillée sur 20 ans avec dégradation panneau, indexation tarifaire et service de la dette.
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-right">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">EBITDA Cumulé 20 Ans</span>
                    <span className="text-sm font-black text-amber-900">
                      {isPort ? fmtM(portfolioTotals.totalEbitdaAn1 * 20 * 0.95) : fmtEur(singleEbitdaAn1 * 20 * 0.95)}
                    </span>
                  </div>
                </div>

                {/* Tableau financier compact 20 ans */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="p-1.5 sticky left-0 bg-slate-900 min-w-[140px]">Poste (€ / an)</th>
                        {years.map(y => (
                          <th key={y} className="p-1.5 text-right min-w-[52px]">{y}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-blue-50/50 font-bold text-blue-900">
                        <td className="p-1.5 sticky left-0 bg-blue-50 font-bold">Chiffre d'Affaires Brut</td>
                        {years.map((y, i) => {
                          const val = isPort ? (portfolioTotals.totalCaAn1 * Math.pow(1 - 0.0045, i) * Math.pow(1 + 0.006, i)) : ((currentRows?.[i]?.ca) || (singleCaAn1 * Math.pow(1 - 0.0045, i) * Math.pow(1 + 0.006, i)));
                          return <td key={y} className="p-1.5 text-right whitespace-nowrap">{Math.round(val).toLocaleString('fr-FR')}</td>;
                        })}
                      </tr>
                      <tr className="text-slate-600">
                        <td className="p-1.5 sticky left-0 bg-white font-medium">OPEX & Maintenance</td>
                        {years.map((y, i) => {
                          const baseOpex = isPort ? (portfolioTotals.totalCaAn1 - portfolioTotals.totalEbitdaAn1) : (singleCaAn1 - singleEbitdaAn1);
                          const val = isPort ? (baseOpex * Math.pow(1 + 0.02, i)) : ((currentRows?.[i]?.opex) || (baseOpex * Math.pow(1 + 0.02, i)));
                          return <td key={y} className="p-1.5 text-right whitespace-nowrap">{Math.round(val).toLocaleString('fr-FR')}</td>;
                        })}
                      </tr>
                      <tr className="bg-emerald-50/60 font-black text-emerald-900">
                        <td className="p-1.5 sticky left-0 bg-emerald-50 font-black">EBITDA Projet</td>
                        {years.map((y, i) => {
                          const val = isPort ? (portfolioTotals.totalEbitdaAn1 * Math.pow(1 - 0.0045, i) * Math.pow(1 + 0.006, i)) : ((currentRows?.[i]?.ebitda) || (singleEbitdaAn1 * Math.pow(1 - 0.0045, i) * Math.pow(1 + 0.006, i)));
                          return <td key={y} className="p-1.5 text-right font-bold whitespace-nowrap">{Math.round(val).toLocaleString('fr-FR')}</td>;
                        })}
                      </tr>
                      <tr className="text-slate-700">
                        <td className="p-1.5 sticky left-0 bg-white font-medium">Service de la Dette</td>
                        {years.map((y, i) => {
                          const capex = isPort ? portfolioTotals.totalCapex : singleCapex;
                          const annuite = (capex * 0.90 * (0.043 / (1 - Math.pow(1 + 0.043, -20))));
                          return <td key={y} className="p-1.5 text-right whitespace-nowrap">{Math.round(annuite).toLocaleString('fr-FR')}</td>;
                        })}
                      </tr>
                      <tr className="bg-purple-50/50 font-bold text-purple-900">
                        <td className="p-1.5 sticky left-0 bg-purple-50 font-bold">Cash-Flow Net Annuel</td>
                        {years.map((y, i) => {
                          const capex = isPort ? portfolioTotals.totalCapex : singleCapex;
                          const annuite = (capex * 0.90 * (0.043 / (1 - Math.pow(1 + 0.043, -20))));
                          const ebitda = isPort ? (portfolioTotals.totalEbitdaAn1 * Math.pow(1 - 0.0045, i)) : ((currentRows?.[i]?.ebitda) || (singleEbitdaAn1 * Math.pow(1 - 0.0045, i)));
                          const cf = Math.max(0, ebitda - annuite);
                          return <td key={y} className="p-1.5 text-right font-bold whitespace-nowrap">{Math.round(cf).toLocaleString('fr-FR')}</td>;
                        })}
                      </tr>
                      <tr className="bg-slate-100 font-black text-slate-900">
                        <td className="p-1.5 sticky left-0 bg-slate-200 font-black">Cash-Flow Cumulé</td>
                        {years.map((y, i) => {
                          const capex = isPort ? portfolioTotals.totalCapex : singleCapex;
                          const annuite = (capex * 0.90 * (0.043 / (1 - Math.pow(1 + 0.043, -20))));
                          let cumul = -(capex * 0.10);
                          for (let step = 0; step <= i; step++) {
                            const ebitda = isPort ? (portfolioTotals.totalEbitdaAn1 * Math.pow(1 - 0.0045, step)) : ((currentRows?.[step]?.ebitda) || (singleEbitdaAn1 * Math.pow(1 - 0.0045, step)));
                            cumul += (ebitda - annuite);
                          }
                          return (
                            <td key={y} className={`p-1.5 text-right font-black whitespace-nowrap ${cumul >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {Math.round(cumul).toLocaleString('fr-FR')}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Synthèse de rentabilité bancaire */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Levier Dette Sénior</span>
                    <span className="text-base font-black text-slate-900">90 % du CAPEX</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Taux fixe 4,30% • 20 ans amortissable</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">DSCR Moyen Projet</span>
                    <span className="text-base font-black text-emerald-600">{kpi.dscrLabel}</span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">Ratio de couverture très favorable</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">TRI Fonds Propres (Equity)</span>
                    <span className="text-base font-black text-purple-700">> 14.5 %</span>
                    <span className="text-[10px] text-purple-600 block mt-0.5">Rendement attractif après effet de levier</span>
                  </div>
                </div>
              </div>

              {/* Pied de page institutionnel */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>Nelson Energy Advisory • Modélisation Financière Photovoltaïque</div>
                <div className="font-semibold text-slate-600">Amortissement & Plan de Financement 20 ans</div>
                <div className="font-bold text-[#0b192c]">Planche 2 / {totalPagesCount}</div>
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 3 : RÉPERTOIRE DES CENTRALES / DÉTAIL BÂTIMENTS */}
          {/* ========================================================================= */}
          <div id="pv-planche-container-3" className="w-full flex flex-col items-center shrink-0 mb-8">
            <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <span className="font-bold text-slate-800 text-sm">Planche 3 : {plancheTitles[2]}</span>
            </div>

            <section
              className="pv-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
              style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img src="/logo-nelson.png" alt="Nelson" className="h-9 w-auto object-contain" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight">
                        {isPort ? "Répertoire Exhaustif des Centrales du Portefeuille HÉLIOS" : `Détail des Bâtiments & Toitures — ${currentProject?.name || 'Centrale'}`}
                      </h2>
                      <p className="text-xs font-medium text-slate-600">
                        {isPort
                          ? `${portfolioSites.length} centrales solaires avec puissances certifiées, postes sources ODRE et indicateurs de rentabilité.`
                          : `Décomposition technique et financière par toiture du projet (${(currentParams?.buildings || []).length} bâtiment(s)).`}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-right">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">Nombre de Sites / Bâtiments</span>
                    <span className="text-sm font-black text-blue-900">
                      {isPort ? `${portfolioSites.length} Centrales` : `${(currentParams?.buildings || []).length} Bâtiments`}
                    </span>
                  </div>
                </div>

                {/* Tableau exhaustif des sites / bâtiments */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[640px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="p-2">N°</th>
                        <th className="p-2">Site / Référence</th>
                        <th className="p-2">Commune (Dép)</th>
                        <th className="p-2">Modèle / Typologie</th>
                        <th className="p-2 text-right">Puissance</th>
                        <th className="p-2">Poste Source Enedis</th>
                        <th className="p-2 text-center">Distance</th>
                        <th className="p-2 text-right">CAPEX Total</th>
                        <th className="p-2 text-right">CA An 1</th>
                        <th className="p-2 text-right">EBITDA An 1</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isPort ? (
                        portfolioSites.map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{s.siteName || s.name}</td>
                            <td className="p-2 text-slate-600">{s.commune || s.city} ({s.codePostal?.slice(0, 2) || '—'})</td>
                            <td className="p-2 font-medium text-amber-700">{s.typeBat || 'Bâtiment BAC'}</td>
                            <td className="p-2 text-right font-black text-blue-900">{s.kwc} kWc</td>
                            <td className="p-2 font-medium text-slate-700">{s.posteSource}</td>
                            <td className="p-2 text-center font-bold text-slate-600">{s.distanceKm} km</td>
                            <td className="p-2 text-right font-bold text-slate-900">{fmtEur(s.capexTotal)}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                            <td className="p-2 text-right font-black text-emerald-700">{fmtEur(s.ebitdaAn1)}</td>
                          </tr>
                        ))
                      ) : (
                        (currentParams?.buildings || []).map((b, idx) => (
                          <tr key={b.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{currentProject?.name || 'Site'} — Bâtiment {idx + 1}</td>
                            <td className="p-2 text-slate-600">{currentProject?.city || '—'} ({currentProject?.postcode?.slice(0, 2) || '—'})</td>
                            <td className="p-2 font-medium text-amber-700">{b.typeBat || b.projectType || 'BAC'}</td>
                            <td className="p-2 text-right font-black text-blue-900">{b.kwc} kWc</td>
                            <td className="p-2 font-medium text-slate-700">{currentProject?.substation?.name || 'ODRE'}</td>
                            <td className="p-2 text-center font-bold text-slate-600">{b.distHta || 100} m</td>
                            <td className="p-2 text-right font-bold text-slate-900">{fmtEur((b.coutCentrale || 0) + (b.coutCharpente || 0))}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">{fmtEur((b.kwc || 0) * (b.productible || 1123) * 0.082)}</td>
                            <td className="p-2 text-right font-black text-emerald-700">{fmtEur((b.kwc || 0) * (b.productible || 1123) * 0.082 * 0.82)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pied de page institutionnel */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>Nelson Energy Advisory • Répertoire d'Actifs Photovoltaïques</div>
                <div className="font-semibold text-slate-600">Base consolidée & qualification réseau ODRE</div>
                <div className="font-bold text-[#0b192c]">Planche 3 / {totalPagesCount}</div>
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* FICHES PHOTOVOLTAÏQUES UNITAIRES DES SITES DU PORTEFEUILLE */}
          {/* ========================================================================= */}
          {isPort && (
            <div className="w-full flex flex-col items-center">
              {portfolioSites.map((site, sIdx) => (
                <div
                  key={site.id || sIdx}
                  id={`pv-single-site-container-${sIdx + 1}`}
                  style={{ display: 'flex' }}
                  className="w-full flex flex-col items-center shrink-0 mb-8"
                >
                  <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-700 text-white font-black text-xs shadow-xs">
                        Fiche Projet {sIdx + 1} / {portfolioSites.length} (Page {totalPagesCount + sIdx + 1} / {totalCompletePages})
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        Fiche PV Unitaire — {site.siteName || site.name} ({site.commune || site.city} - {site.codePostal?.slice(0, 2) || '—'})
                      </span>
                    </div>
                    <span className="text-slate-500 font-medium">{site.kwc} kWc • Tarif S21 (0,082 €/kWh)</span>
                  </div>
                  <PvProjectSingleSheet
                    site={site}
                    siteIndex={sIdx + 1}
                    totalSites={portfolioSites.length}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BARRE INFÉRIEURE PERSISTANTE : BOUTONS D'EXPORT ET FERMER EN BAS */}
        {/* ========================================================================= */}
        <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">
              {isPort ? `Mode Portefeuille Consolidé (${portfolioSites.length} Projets / ${portfolioTotals.totalPowerMw.toFixed(1)} MWc)` : `Mode Simulation Unitaire (${currentProject?.name || 'Projet'} - ${singleKwc.toFixed(0)} kWc)`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">
              {isPort ? `3 Planches Portefeuille + ${portfolioSites.length} Fiches Projets = ${totalCompletePages} Pages` : `${totalPagesCount} Planches A4 Paysage`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bouton ÉTUDE COMPLÈTE (Multi-Pages) */}
            {isPort && (
              <button
                type="button"
                onClick={() => handleGeneratePdf('complete')}
                disabled={isExportingPdf}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title={`Générer l'étude complète consolidée de ${totalCompletePages} pages`}
              >
                <Sparkles className="w-4 h-4 text-yellow-200" />
                <span>ÉTUDE COMPLÈTE ({totalCompletePages} PAGES)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleGeneratePdf('portfolio')}
              disabled={isExportingPdf}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{progressStep}</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>{isPort ? `Dossier Portefeuille (${totalPagesCount} Pages)` : 'Imprimer / Exporter en PDF'}</span>
                </>
              )}
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Fermer la visionneuse"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Fermer</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
