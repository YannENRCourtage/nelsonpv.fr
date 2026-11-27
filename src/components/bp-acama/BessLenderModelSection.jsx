import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  RotateCcw,
  Sliders,
  Table as TableIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BESS_PRESETS,
  getScaledCapexPreset,
  computeBessLenderModel,
  computeBessStressTests
} from '../../services/bessLenderFinanceEngine.js';
import { computeBessFinancials } from '../../services/bessSimulationEngine.js';
import { resolveProjectPortfolio, getProjectBessPortfolio, normalizePortfolioName } from '../../data/bessPortfolioData.js';
import { generateBpAcamaPDF } from './BpAcamaPDFGenerator.jsx';
import {
  BessGlobalSelectorsBar,
  BessCapexBreakdownCard,
  BessAssumptions4ColumnsGrid,
  BessLender4SummaryCards,
  BessCleanHorizonMarketChartCard,
  BessTrajectoryChartCard,
  BessCompleteAnnualTable,
  BessSensitivityMatrixSection,
  fmtPct
} from './BessUnifiedDashboardComponents.jsx';

// En-tête imprimé standard pour chaque page PDF
function BessPDFPageHeader({ pageNumber, totalPages = 3, pageTitle, project, presetKey, horizonYears = 20 }) {
  return (
    <div className="pdf-header hidden flex flex-col w-full mb-3 pb-2 border-b-2 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-nelson.png" alt="Logo" className="h-9 w-auto object-contain" />
          <div>
            <div className="text-xs font-black tracking-widest text-slate-800 uppercase">
              DOSSIER FINANCIER BESS — MODÈLE PRÊTEUR SENIOR ({horizonYears} ANS • CLEAN HORIZON)
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {pageTitle} • Palier {presetKey} MW / {(Number(presetKey) * 2.088).toFixed(2)} MWh
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black text-slate-900 uppercase">
            {project?.name || project?.client_name || 'PROJET BESS STAND-ALONE'}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold">
            {new Date().toLocaleDateString('fr-FR')} • Page {pageNumber} / {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BessLenderModelSection({
  project,
  initialPowerKw = 500,
  onSyncParentConfig
}) {
  // Déterminer le palier initial en fonction de la puissance demandée (défaut 0.50 MW = 500 kW)
  const defaultPresetKey = useMemo(() => {
    const kw = Number(initialPowerKw);
    if (isNaN(kw) || kw <= 0) return '0.50';
    if (kw <= 125) return '0.125';
    if (kw <= 350) return '0.25';
    if (kw <= 750) return '0.50';
    return '1.0';
  }, [initialPowerKw]);

  const [presetKey, setPresetKey] = useState(defaultPresetKey);
  const currentPreset = BESS_PRESETS[presetKey] || BESS_PRESETS['0.50'];
  const [inputs, setInputs] = useState(() => ({ ...(BESS_PRESETS[defaultPresetKey] || BESS_PRESETS['0.50']) }));
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'page1' | 'page2' | 'page3'
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const projectPortfolio = useMemo(() => {
    if (!project) return null;
    return resolveProjectPortfolio(project) || normalizePortfolioName(getProjectBessPortfolio(project)) || null;
  }, [project]);

  // Calcul du coût de raccordement ODRE / S3REnR spécifique au projet CRM sélectionné
  const projectOdreFinancials = useMemo(() => {
    if (!project || (!project.id && !project.name)) return null;
    try {
      return computeBessFinancials(project, {
        loyerDalle: project.rent || (projectPortfolio === 'FARADAY' ? 2000 : 3000)
      });
    } catch (e) {
      return null;
    }
  }, [project?.id, project?.name, project?.substation?.distanceKm, projectPortfolio]);

  // Synchronisation automatique du loyer (2 000 € Faraday vs 3 000 € Volta/Edison) et du TURPE lors de la sélection d'un projet CRM
  useEffect(() => {
    if (!project || (!project.id && !project.name)) return;
    try {
      const basePreset = BESS_PRESETS[presetKey] || BESS_PRESETS['0.50'];
      const scale = (basePreset.powerMw || 0.5) / 0.5;
      const defaultLoyer = projectPortfolio === 'FARADAY' ? 2000 : 3000;
      const loyerSite = Math.round((project.rent || projectOdreFinancials?.loyerDalle || defaultLoyer) * scale);

      const zoneCre = String(projectOdreFinancials?.zoneCre || '').toLowerCase();
      const hasBonusCre = zoneCre.includes('soutirage') || zoneCre.includes('injection') || zoneCre === '';
      const turpeSite = Math.round((hasBonusCre ? 11664 : 15318) * scale);

      setInputs(prev => ({
        ...prev,
        loyer1: loyerSite,
        loyerAn1: loyerSite,
        turpeAn1: turpeSite
      }));
    } catch (err) {
      console.warn('[BessLenderModelSection] Sync project financials error:', err);
    }
  }, [project?.id, project?.name, projectPortfolio, presetKey, projectOdreFinancials]);

  // Calcul du modèle financier prêteur unifié
  const model = useMemo(() => {
    try {
      return computeBessLenderModel({
        ...inputs,
        palierKey: presetKey,
        powerMw: currentPreset.powerMw,
        nbSites: 1
      });
    } catch (e) {
      console.error('[BessLenderModelSection] Erreur calcul modèle:', e);
      return computeBessLenderModel(BESS_PRESETS['0.50']);
    }
  }, [inputs, presetKey, currentPreset.powerMw]);

  // Calcul des stress-tests et points de rupture
  const stress = useMemo(() => {
    try {
      return computeBessStressTests(model, inputs);
    } catch (e) {
      console.error('[BessLenderModelSection] Erreur stress-tests:', e);
      return { scenarios: [], baisseToleree110: 0, baisseToleree100: 0, anneesDscrGte120: 12 };
    }
  }, [model, inputs]);

  // Sélection d'un palier de puissance (0.125, 0.25, 0.50, 1.0 MW)
  const handleSelectPreset = (key) => {
    if (!BESS_PRESETS[key]) return;
    setPresetKey(key);
    const targetPreset = BESS_PRESETS[key];
    const mode = inputs.capexMode || 'COMPTE_PROPRE';
    const scaledBreakdown = getScaledCapexPreset(mode, targetPreset.powerMw);
    const scale = targetPreset.powerMw / 0.50;
    const totalCap = Object.values(scaledBreakdown).reduce((a, b) => a + Number(b || 0), 0);

    const newInputs = {
      ...targetPreset,
      capexMode: mode,
      financingMode: inputs.financingMode || 'WITH_LOAN',
      revenueModel: inputs.revenueModel || 'CLEAN_HORIZON',
      horizonYears: inputs.horizonYears || 20,
      lifeYears: inputs.horizonYears || 20,
      capexBreakdown: scaledBreakdown,
      capexTotal: totalCap,
      capex: totalCap,
      assuranceAn1: Math.round(totalCap * 0.01),
      ass1: Math.round(totalCap * 0.01),
      loyerAn1: Math.round((projectPortfolio === 'FARADAY' ? 2000 : 3000) * scale),
      loyer1: Math.round((projectPortfolio === 'FARADAY' ? 2000 : 3000) * scale)
    };
    setInputs(newInputs);

    if (onSyncParentConfig) {
      onSyncParentConfig({
        puissanceDemandee: newInputs.powerMw * 1000,
        capaciteStockage: newInputs.capacityMwh * 1000,
        capexTotal: newInputs.capexTotal,
        tauxEmprunt: (newInputs.nominalRatePct + newInputs.insuranceRatePct),
        dureeEmprunt: newInputs.loanDurationYears,
        dureeEtude: newInputs.horizonYears
      });
    }
  };

  // Changement du Mode de Montage / CAPEX (Compte Propre 184k€ vs Compte Tiers 229k€)
  const handleSelectCapexMode = (mode) => {
    const pMw = currentPreset.powerMw || 0.50;
    const scaledBreakdown = getScaledCapexPreset(mode, pMw);
    const totalCap = Object.values(scaledBreakdown).reduce((a, b) => a + Number(b || 0), 0);
    setInputs(prev => ({
      ...prev,
      capexMode: mode,
      capexBreakdown: scaledBreakdown,
      capexTotal: totalCap,
      capex: totalCap,
      assuranceAn1: Math.round(totalCap * 0.01),
      ass1: Math.round(totalCap * 0.01)
    }));
  };

  // Mise à jour d'un poste individuel de la grille CAPEX détaillée
  const handleUpdateCapexField = (field, value) => {
    setInputs(prev => {
      const currentB = prev.capexBreakdown || getScaledCapexPreset(prev.capexMode || 'COMPTE_PROPRE', currentPreset.powerMw);
      const nextB = { ...currentB, [field]: Number(value) || 0 };
      const totalCap = Object.values(nextB).reduce((a, b) => a + Number(b || 0), 0);
      return {
        ...prev,
        capexBreakdown: nextB,
        capexTotal: totalCap,
        capex: totalCap
      };
    });
  };

  // Changement du Mode de Financement (Avec prêt vs Payé comptant)
  const handleSelectFinancingMode = (fMode) => {
    setInputs(prev => ({
      ...prev,
      financingMode: fMode,
      debtSharePct: fMode === 'CASH' ? 0 : (prev.debtSharePct > 0 ? prev.debtSharePct : 80)
    }));
  };

  // Changement du Modèle de Revenus (Clean Horizon 20 ans vs ENR Courtage 15 ans vs Personnalisé)
  const handleSelectRevenueModel = (rModel) => {
    setInputs(prev => {
      const nextHorizon = rModel === 'CLEAN_HORIZON' ? 20 : (rModel === 'ENR_COURTAGE' ? 15 : (prev.horizonYears || 20));
      const nextDeg = rModel === 'CLEAN_HORIZON' ? 1.37 : (rModel === 'ENR_COURTAGE' ? 2.20 : (prev.batteryDegradationPct || 1.37));
      return {
        ...prev,
        revenueModel: rModel,
        horizonYears: nextHorizon,
        lifeYears: nextHorizon,
        batteryDegradationPct: nextDeg,
        revenueDegradationPct: nextDeg
      };
    });
  };

  // Changement de l'Horizon d'affichage (12, 15, 20 ans)
  const handleSelectHorizonYears = (h) => {
    setInputs(prev => ({
      ...prev,
      horizonYears: Number(h),
      lifeYears: Number(h)
    }));
  };

  // Mise à jour d'un champ d'hypothèse
  const updateInput = (field, value) => {
    if (typeof value === 'boolean' || field === 'revenueModel' || field === 'financingMode' || field === 'capexMode') {
      setInputs(prev => ({ ...prev, [field]: value }));
      return;
    }
    const num = parseFloat(value);
    const parsedVal = isNaN(num) ? value : num;
    const aliasMap = {
      capex: 'capexTotal',
      capexTotal: 'capex',
      rev1: 'revenuAn1',
      revenuAn1: 'rev1',
      opex1: 'opexAn1',
      opexAn1: 'opex1',
      ass1: 'assuranceAn1',
      assuranceAn1: 'ass1',
      loyer1: 'loyerAn1',
      loyerAn1: 'loyer1'
    };
    setInputs(prev => {
      const next = { ...prev, [field]: parsedVal };
      if (aliasMap[field]) {
        next[aliasMap[field]] = parsedVal;
      }
      return next;
    });
  };

  // Réinitialiser les paramètres au preset sélectionné
  const handleResetToPreset = () => {
    handleSelectPreset(presetKey);
  };

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
        sections: ['pdf-bess-page-1', 'pdf-bess-page-2', 'pdf-bess-page-3'],
        fileName: `DOSSIER_PRETEUR_BESS_${project?.name || 'PROJET'}_${presetKey}MW_${inputs.horizonYears || 20}ANS.pdf`,
        orientation: 'landscape'
      });
    } catch (err) {
      console.error('[BessLenderModelSection] Erreur export PDF:', err);
      alert('Une erreur est survenue lors de la génération du dossier PDF.');
    } finally {
      setActiveTab(prevTab);
      setIsExportingPdf(false);
    }
  };

  const kpis = model?.kpis || {};
  const isCashMode = model?.params?.isCashMode;
  const isDscrCompliant = isCashMode || (kpis?.dscrMin ?? 1.2) >= 1.20;
  const isDscrAcceptable = isCashMode || (kpis?.dscrMin ?? 1.2) >= 1.10;

  return (
    <div className="space-y-5">
      {/* ─── 1. SÉLECTEURS GLOBAUX (CAPEX PROPRE/TIERS | PRÊT/COMPTANT | CLEAN HORIZON 20A) ─── */}
      <BessGlobalSelectorsBar
        capexMode={inputs.capexMode || 'COMPTE_PROPRE'}
        onSelectCapexMode={handleSelectCapexMode}
        financingMode={inputs.financingMode || 'WITH_LOAN'}
        onSelectFinancingMode={handleSelectFinancingMode}
        revenueModel={inputs.revenueModel || 'CLEAN_HORIZON'}
        onSelectRevenueModel={handleSelectRevenueModel}
        horizonYears={inputs.horizonYears || 20}
        onSelectHorizonYears={handleSelectHorizonYears}
        powerMw={currentPreset.powerMw}
        nbSites={1}
      />

      {/* ─── BARRE DE PALIERS DE PUISSANCE & EXPORT PDF (IGNORÉE AU PDF) ────── */}
      <div
        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4"
        data-html2canvas-ignore="true"
      >
        {/* Sélecteur de palier (0.125, 0.25, 0.50, 1.0 MW) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mr-1">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Paliers de Puissance :
          </span>
          {Object.entries(BESS_PRESETS).map(([key]) => {
            const isSelected = presetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer",
                  isSelected
                    ? "bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span>{key} MW ({Number(key) * 1000} kW)</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded font-black",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {(Number(key) * 2.088).toFixed(2)} MWh
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleResetToPreset}
            className="ml-1 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Réinitialiser aux paramètres standards du palier"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation des volets & bouton export 3 pages */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'all' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >
              Tous les volets (3P)
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
              2. Compte de Résultat ({inputs.horizonYears || 20} ans)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('page3')}
              className={cn("px-2.5 py-1 rounded font-bold transition-all cursor-pointer", activeTab === 'page3' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >
              3. Sensibilités & Trajectoire
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-200" />
            <span>{isExportingPdf ? 'GÉNÉRATION...' : 'DOSSIER PRÊTEUR BESS (3P PDF)'}</span>
          </button>
        </div>
      </div>

      {/* ─── BLOCS INTERACTIFS DE PARAMÉTRAGE (CAPEX DÉTAILLÉ & 4 COLONNES D'HYPOTHÈSES — IGNORÉS AU PDF) ─── */}
      <div className="space-y-4" data-html2canvas-ignore="true">
        <BessCapexBreakdownCard
          capexSummary={model.capexSummary}
          capexMode={inputs.capexMode || 'COMPTE_PROPRE'}
          onUpdateCapexField={handleUpdateCapexField}
          onSelectCapexMode={handleSelectCapexMode}
          odreRaccordementCost={projectOdreFinancials?.raccordementCost}
          onApplyOdreRaccordement={(cost) => handleUpdateCapexField('raccordementEnedis', Math.round(cost * (currentPreset.powerMw / 0.50)))}
          powerMw={currentPreset.powerMw}
          nbSites={1}
          fraisCommerciaux={inputs.fraisCommerciaux || 0}
        />

        <BessAssumptions4ColumnsGrid
          inputs={inputs}
          model={model}
          onUpdateInput={updateInput}
          onSelectRevenueModel={handleSelectRevenueModel}
          onSelectHorizonYears={handleSelectHorizonYears}
          onResetToDefault={handleResetToPreset}
          powerMw={currentPreset.powerMw}
          nbSites={1}
        />
      </div>

      {/* ─── PAGE 1 : SYNTHÈSE FINANCIÈRE PRÊTEUR & REVENUS STRUCTURE MARCHÉ (CENTRÉ) ─── */}
      {(activeTab === 'all' || activeTab === 'page1' || activeTab === 'block1') && (
        <section
          id="pdf-bess-page-1"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-md space-y-5 w-full"
        >
          <BessPDFPageHeader
            pageNumber={1}
            totalPages={3}
            pageTitle="Volet 1 : Synthèse Financière Prêteur & Structure des Revenus de Marché (Clean Horizon)"
            project={project}
            presetKey={presetKey}
            horizonYears={inputs.horizonYears || 20}
          />

          {/* En-tête du volet */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Synthèse Financière pour le Prêteur — {project?.name || 'Simulation Unitaire BESS'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Palier {currentPreset.powerMw} MW • {currentPreset.capacityMwh} MWh
                </span>
                {projectPortfolio && (
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-black uppercase border",
                    projectPortfolio === 'VOLTA' ? "bg-blue-100 text-blue-800 border-blue-200" :
                    projectPortfolio === 'FARADAY' ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    projectPortfolio === 'EDISON' ? "bg-indigo-100 text-indigo-800 border-indigo-200" :
                    "bg-slate-100 text-slate-800 border-slate-200"
                  )}>
                    Portefeuille {projectPortfolio}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Modèle BESS Stand-Alone {inputs.horizonYears || 20} ans • {inputs.capexMode === 'COMPTE_TIERS' ? 'Montage Pour Compte Tiers' : 'Montage Pour Compte Propre'} • {inputs.revenueModel === 'CLEAN_HORIZON' ? 'Revenus Clean Horizon (Scénario Central 2027-2046)' : 'Modèle ENR Courtage'} • Fiscalité LF 2024 / 2026
              </p>
            </div>

            {/* Badge de conformité bancaire */}
            <div className={cn(
              "px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-black",
              isDscrCompliant
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isDscrAcceptable
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-red-50 text-red-800 border-red-200"
            )}>
              {isDscrCompliant ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {isCashMode
                  ? "100% FONDS PROPRES (PAYÉ COMPTANT — SANS DETTE)"
                  : isDscrCompliant
                  ? "BANQUE COMPLIANT (DSCR min ≥ 1,20x)"
                  : isDscrAcceptable
                  ? "CONFORME LIMITE (DSCR min ≥ 1,10x)"
                  : "NON CONFORME BANQUE (DSCR < 1,10x)"}
              </span>
            </div>
          </div>

          {/* 4 Cartes de Synthèse Prêteur */}
          <BessLender4SummaryCards model={model} />

          {/* Graphique Revenus — Structure Marché (Clean Horizon) agrandi et centré horizontalement */}
          <div className="w-full flex justify-center pt-1">
            <BessCleanHorizonMarketChartCard model={model} centeredLarge={true} />
          </div>
        </section>
      )}

      {/* ─── PAGE 2 : COMPTE DE RÉSULTAT COMPLET ANNÉE PAR ANNÉE (PLEINE LARGEUR) ─── */}
      {(activeTab === 'all' || activeTab === 'page2' || activeTab === 'block3') && (
        <section
          id="pdf-bess-page-2"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full shrink-0"
        >
          <BessPDFPageHeader
            pageNumber={2}
            totalPages={3}
            pageTitle={`Volet 2 : Compte de Résultat, Flux de Trésorerie & Service de la Dette (${inputs.horizonYears || 20} ans)`}
            project={project}
            presetKey={presetKey}
            horizonYears={inputs.horizonYears || 20}
          />

          <div className="border-b border-slate-100 pb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-blue-600" />
                Compte de Résultat, Flux de Trésorerie & Service de la Dette (An 1 à An {inputs.horizonYears || 20})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Détail complet : Revenus bruts par pilier Clean Horizon, Abattement Dispo×Rendement ({fmtPct((model?.params?.effDispoCoeff || 0.8624) * 100, 1)}), Vieillissement (-{fmtPct(model?.params?.batteryDegradationPct, 2)}/an), Charges détaillées, IS (15%/25%), Cash-flow net et DSCR.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Horizon {inputs.horizonYears || 20} ans • Unités : Euros HT (€)
            </span>
          </div>

          <BessCompleteAnnualTable model={model} />
        </section>
      )}

      {/* ─── PAGE 3 : MATRICE D'ANALYSE DE SENSIBILITÉ & TRAJECTOIRE FINANCIÈRE ─── */}
      {(activeTab === 'all' || activeTab === 'page3' || activeTab === 'block3') && (
        <section
          id="pdf-bess-page-3"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-md space-y-5 w-full shrink-0"
        >
          <BessPDFPageHeader
            pageNumber={3}
            totalPages={3}
            pageTitle="Volet 3 : Matrice d'Analyse de Sensibilité, Stress-Tests Bancaires & Trajectoire Financière"
            project={project}
            presetKey={presetKey}
            horizonYears={inputs.horizonYears || 20}
          />

          {/* Haut de la Page 3 : Matrice d'Analyse de Sensibilité & Marges de Sécurité */}
          <BessSensitivityMatrixSection stress={stress} model={model} />

          {/* Bas de la Page 3 : Trajectoire Financière (EBITDA vs Cash-Flow Net & Dette) */}
          <div className="pt-2">
            <BessTrajectoryChartCard model={model} compact={true} />
          </div>
        </section>
      )}
    </div>
  );
}
