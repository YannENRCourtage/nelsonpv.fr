import React, { useState, useMemo, useEffect } from 'react';
import {
  BatteryCharging, Zap, ShieldCheck, TrendingUp, CheckCircle2,
  AlertTriangle, FileDown, RotateCcw, Sliders, Table, Activity,
  ArrowUpRight, Lock, Sparkles, AlertCircle, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BESS_PRESETS,
  DEBT_AMORTIZATION_PROFILE,
  computeBessLenderModel,
  computeBessStressTests
} from '../../services/bessLenderFinanceEngine.js';
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

// En-tête imprimé standard pour chaque page PDF
function BessPDFPageHeader({ pageNumber, totalPages = 2, pageTitle, project, presetKey }) {
  return (
    <div className="pdf-header hidden flex flex-col w-full mb-3 pb-2 border-b-2 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-nelson.png" alt="Logo" className="h-9 w-auto object-contain" />
          <div>
            <div className="text-xs font-black tracking-widest text-slate-800 uppercase">
              DOSSIER FINANCIER BESS — MODÈLE PRÊTEUR SENIOR (12 ANS)
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {pageTitle} • Palier {presetKey} MW / {(presetKey * 2).toFixed(2)} MWh
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
  initialPowerKw = 250,
  onSyncParentConfig
}) {
  // Déterminer le palier initial en fonction de la puissance demandée
  const defaultPresetKey = useMemo(() => {
    const kw = Number(initialPowerKw);
    if (kw <= 125) return '0.125';
    if (kw <= 350) return '0.25';
    if (kw <= 750) return '0.50';
    return '1.0';
  }, [initialPowerKw]);

  const [presetKey, setPresetKey] = useState(defaultPresetKey);
  const [inputs, setInputs] = useState(() => ({ ...BESS_PRESETS[defaultPresetKey] }));
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'block1' | 'block2' | 'block3' | 'block4'
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Synchronisation si le palier parent change
  useEffect(() => {
    if (defaultPresetKey && defaultPresetKey !== presetKey) {
      setPresetKey(defaultPresetKey);
      setInputs({ ...BESS_PRESETS[defaultPresetKey] });
    }
  }, [defaultPresetKey]);

  // Calcul du modèle financier prêteur
  const model = useMemo(() => {
    try {
      return computeBessLenderModel(inputs);
    } catch (e) {
      console.error('[BessLenderModelSection] Erreur calcul modèle:', e);
      return computeBessLenderModel(BESS_PRESETS['0.25']);
    }
  }, [inputs]);

  // Calcul des stress-tests et points de rupture
  const stress = useMemo(() => {
    try {
      return computeBessStressTests(model, inputs);
    } catch (e) {
      console.error('[BessLenderModelSection] Erreur stress-tests:', e);
      return { scenarios: [], baisseToleree110: 0, baisseToleree100: 0, anneesDscrGte120: 10 };
    }
  }, [model, inputs]);

  // Sélection d'un preset
  const handleSelectPreset = (key) => {
    if (!BESS_PRESETS[key]) return;
    setPresetKey(key);
    const newInputs = { ...BESS_PRESETS[key] };
    setInputs(newInputs);

    if (onSyncParentConfig) {
      onSyncParentConfig({
        puissanceDemandee: newInputs.powerMw * 1000,
        capaciteStockage: newInputs.capacityMwh * 1000,
        capexTotal: newInputs.capex,
        tauxEmprunt: newInputs.rateAllIn * 100,
        dureeEmprunt: newInputs.loanYears,
        dureeEtude: newInputs.lifeYears
      });
    }
  };

  // Mise à jour d'un champ modifiable (cellules bleues)
  const updateInput = (field, value) => {
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
    if (BESS_PRESETS[presetKey]) {
      setInputs({ ...BESS_PRESETS[presetKey] });
    }
  };

  // Export du dossier 2 pages PDF
  const handleExportPdf = async () => {
    const prevTab = activeTab;
    try {
      setIsExportingPdf(true);
      if (activeTab !== 'all') {
        setActiveTab('all');
        await new Promise(r => setTimeout(r, 120));
      }
      await generateBpAcamaPDF({
        sections: ['pdf-bess-page-1', 'pdf-bess-page-2'],
        fileName: `DOSSIER_PRETEUR_BESS_${project?.name || 'PROJET'}_${presetKey}MW.pdf`,
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

  const rows = useMemo(() => model?.rows || model?.years || [], [model]);
  const totals = useMemo(() => model?.totals || model?.cumul || {}, [model]);
  const kpis = useMemo(() => model?.kpis || {}, [model]);
  const scenarios = useMemo(() => stress?.scenarios || [], [stress]);
  const rupture = useMemo(() => stress?.rupture || {}, [stress]);

  const isDscrCompliant = (kpis?.dscrMin ?? 1.2) >= 1.20;
  const isDscrAcceptable = (kpis?.dscrMin ?? 1.2) >= 1.10;

  return (
    <div className="space-y-6">
      {/* ─── BARRE D'ACTIONS SUPÉRIEURE (IGNORÉE AU PDF) ────────────────────── */}
      <div
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4"
        data-html2canvas-ignore="true"
      >
        {/* Sélecteur de preset (0.125, 0.25, 0.50, 1.0 MW) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mr-1">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Paliers de Puissance :
          </span>
          {Object.entries(BESS_PRESETS).map(([key, preset]) => {
            const isSelected = presetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border",
                  isSelected
                    ? "bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span>{key} MW ({key * 1000} kW)</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded font-black",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {(key * 2).toFixed(2)} MWh
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleResetToPreset}
            className="ml-1 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Réinitialiser aux paramètres standards du palier"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation des volets & bouton export 2 pages */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn("px-2.5 py-1 rounded font-bold transition-all", activeTab === 'all' ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >
              Tous les volets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('block1')}
              className={cn("px-2.5 py-1 rounded font-bold transition-all", (activeTab === 'block1' || activeTab === 'page1') ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >
              1. Synthèse, Hypothèses & Risque
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('block3')}
              className={cn("px-2.5 py-1 rounded font-bold transition-all", (activeTab === 'block3' || activeTab === 'page2') ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >
              2. Tableau Financier 12 ans
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <FileDown className="w-4 h-4 text-blue-200" />
            <span>{isExportingPdf ? 'GÉNÉRATION...' : 'DOSSIER PRÊTEUR BESS (2P)'}</span>
          </button>
        </div>
      </div>

      {/* ─── VOLET 1 : SYNTHÈSE, HYPOTHÈSES & ANALYSE DE RISQUE (PAGE 1) ─────── */}
      {(activeTab === 'all' || activeTab === 'block1' || activeTab === 'block2' || activeTab === 'block4' || activeTab === 'page1') && (
        <section
          id="pdf-bess-page-1"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4"
        >
          <BessPDFPageHeader
            pageNumber={1}
            totalPages={2}
            pageTitle="Volet 1 : Synthèse Financière, Hypothèses & Analyse de Risque"
            project={project}
            presetKey={presetKey}
          />

          {/* En-tête du volet */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Synthèse Financière pour le Prêteur
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Palier {inputs.powerMw} MW • {inputs.capacityMwh} MWh
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Modèle BESS Stand-Alone 12 ans • Amortissement sculpté 10 ans • Ratios bancaires & fiscalité LF 2024
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
                {isDscrCompliant
                  ? "BANQUE COMPLIANT (DSCR min ≥ 1,20x)"
                  : isDscrAcceptable
                  ? "CONFORME LIMITE (DSCR min ≥ 1,10x)"
                  : "NON CONFORME BANQUE (DSCR < 1,10x)"}
              </span>
            </div>
          </div>

          {/* Grille des 20 KPIs structurés en 4 cartes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Carte 1 : Structure de Financement */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 mb-2">
                  1. Structure & Dette
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">CAPEX Total :</span>
                    <span className="font-black text-slate-900">{fmtEur((model?.capex ?? kpis?.capexTotal ?? 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Dette senior (70%) :</span>
                    <span className="font-bold text-blue-900">{fmtEur((model?.debt ?? kpis?.detteInitiale ?? 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Fonds propres (30%) :</span>
                    <span className="font-bold text-slate-800">{fmtEur((model?.equity ?? kpis?.fondsPropresInitiaux ?? 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Taux tout compris :</span>
                    <span className="font-bold text-slate-900">{fmtPct((model?.rateAllIn ?? (kpis?.allInDebtRate ? kpis.allInDebtRate / 100 : 0.043)) * 100, 1)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                <span>Durée du prêt : <b>10 ans</b></span>
                <span>Marge après prêt : <b className="text-emerald-700">2 ans</b></span>
              </div>
            </div>

            {/* Carte 2 : Performance d'Exploitation */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 border-b border-slate-200 pb-1 mb-2">
                  2. Exploitation (12 ans)
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Revenus cumulés :</span>
                    <span className="font-black text-slate-900">{fmtEur(kpis.cumulRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">EBITDA cumulé :</span>
                    <span className="font-bold text-emerald-800">{fmtEur(kpis.cumulEbitda)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Résultat net après IS :</span>
                    <span className="font-black text-slate-900">{fmtEur(kpis.cumulNetIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Trésorerie post-prêt :</span>
                    <span className="font-bold text-emerald-700">{fmtEur(kpis.cashFlowPostLoan)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                <span>Marge EBITDA moy. :</span>
                <span className="font-bold text-slate-800">
                  {fmtPct((kpis.cumulEbitda / kpis.cumulRevenue) * 100, 1)}
                </span>
              </div>
            </div>

            {/* Carte 3 : Ratios Bancaires & Couverture */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 border-b border-slate-200 pb-1 mb-2">
                  3. Ratios Bancaires
                </div>
                <div className="space-y-1.5 text-xs">
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
                    <span className="text-slate-500">ICR Minimum :</span>
                    <span className="font-bold text-slate-900">{fmt(kpis.icrMin, 2)}x</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">LLCR (@4,3%) :</span>
                    <span className="font-bold text-indigo-900">{fmt(kpis.llcr, 2)}x</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                <span>PLCR (12 ans) :</span>
                <span className="font-bold text-indigo-900">{fmt(kpis.plcr, 2)}x</span>
              </div>
            </div>

            {/* Carte 4 : Rentabilité Projet & Fonds Propres */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 border-b border-slate-200 pb-1 mb-2">
                  4. Rentabilité & TRI
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">TRI Projet (non levier) :</span>
                    <span className="font-black text-blue-700">{fmtPct(kpis.projectIrr, 1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">VAN Projet (@7,0%) :</span>
                    <span className="font-bold text-slate-900">{fmtEur(kpis.projectNpv)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payback actualisé :</span>
                    <span className="font-bold text-amber-700">{fmt(kpis.discountedPaybackYears, 1)} ans</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">TRI Fonds Propres :</span>
                    <span className="font-black text-emerald-700">{fmtPct(kpis.equityIrr, 1)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                <span>VAN Fonds Propres :</span>
                <span className="font-bold text-emerald-800">{fmtEur(kpis.equityNpv)}</span>
              </div>
            </div>
          </div>

          {/* ─── SOUS-SECTION : HYPOTHÈSES DU MODÈLE FINANCIER & LEVIERS OPÉRATIONNELS ── */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Hypothèses du Modèle Financier & Leviers Opérationnels
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Les cellules en bleu clair sont éditables et servent de leviers de sensibilité dynamique.
                </p>
              </div>
            <button
              type="button"
              onClick={handleResetToPreset}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              data-html2canvas-ignore="true"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser les valeurs standards ({presetKey} MW)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Colonne 1 : Financement & Actualisation */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider border-b border-blue-100 pb-1">
                Structure de Financement
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-500 block text-[11px]">Durée de vie batterie</label>
                  <div className="font-bold text-slate-800">12 ans (Années 1 à 12)</div>
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Durée du prêt senior</label>
                  <div className="font-bold text-slate-800">10 ans (Années 1 à 10)</div>
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Quotité dette (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={inputs.debtSharePct !== undefined ? inputs.debtSharePct : 70}
                    onChange={e => updateInput('debtSharePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Taux nominal (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.nominalRatePct !== undefined ? inputs.nominalRatePct : 4.1}
                    onChange={e => updateInput('nominalRatePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Assurance emprunteur (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={inputs.insuranceRatePct !== undefined ? inputs.insuranceRatePct : 0.2}
                    onChange={e => updateInput('insuranceRatePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Taux tout compris :</span>
                  <span className="font-black text-slate-900">{fmtPct((model?.rateAllIn ?? (kpis?.allInDebtRate ? kpis.allInDebtRate / 100 : 0.043)) * 100, 1)}</span>
                </div>
              </div>
            </div>

            {/* Colonne 2 : Dynamique d'Exploitation */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[10px] font-black uppercase text-emerald-700 tracking-wider border-b border-emerald-100 pb-1">
                Indexation & Marché
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-500 block text-[11px]">Décote annuelle revenus (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.revenueDegradationPct !== undefined ? inputs.revenueDegradationPct : 10.6}
                    onChange={e => updateInput('revenueDegradationPct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Pertes de marché / an</span>
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Frais agrégateur (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.aggregatorFeePct !== undefined ? inputs.aggregatorFeePct : 15.0}
                    onChange={e => updateInput('aggregatorFeePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Prélevé sur revenus HT</span>
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Croissance des charges (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.opexInflationPct !== undefined ? inputs.opexInflationPct : 1.5}
                    onChange={e => updateInput('opexInflationPct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Inflation OPEX, Ass., Loyer</span>
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Taux actualisation WACC (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.discountRatePct !== undefined ? inputs.discountRatePct : 7.0}
                    onChange={e => updateInput('discountRatePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Pour VAN Projet & FP</span>
                </div>
              </div>
            </div>

            {/* Colonne 3 : Fiscalité LF 2024 */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider border-b border-indigo-100 pb-1">
                Fiscalité des Sociétés (LF 2024)
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-500 block text-[11px]">Seuil taux réduit IS (€)</label>
                  <input
                    type="number"
                    step="500"
                    value={inputs.taxReducedThreshold !== undefined ? inputs.taxReducedThreshold : 42500}
                    onChange={e => updateInput('taxReducedThreshold', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Tranche PME LF 2024</span>
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Taux réduit IS (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.taxReducedRatePct !== undefined ? inputs.taxReducedRatePct : 15.0}
                    onChange={e => updateInput('taxReducedRatePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Taux normal IS (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.taxNormalRatePct !== undefined ? inputs.taxNormalRatePct : 25.0}
                    onChange={e => updateInput('taxNormalRatePct', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="p-2 bg-indigo-50/50 rounded border border-indigo-100 text-[10px] text-indigo-900 leading-tight">
                  <b>Règle fiscale :</b> 15% jusqu'à 42 500 € d'EBT, puis 25% au-delà (0 € si EBT ≤ 0).
                </div>
              </div>
            </div>

            {/* Colonne 4 : Dimensionnement & Base An 1 */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[10px] font-black uppercase text-amber-700 tracking-wider border-b border-amber-100 pb-1">
                CAPEX & Base Année 1
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-500 block text-[11px]">CAPEX Total (€)</label>
                  <input
                    type="number"
                    step="1000"
                    value={inputs.capex ?? inputs.capexTotal ?? ''}
                    onChange={e => updateInput('capex', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Revenu Net An 1 (€)</label>
                  <input
                    type="number"
                    step="500"
                    value={inputs.rev1 ?? inputs.revenuAn1 ?? ''}
                    onChange={e => updateInput('rev1', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">OPEX maintenance An 1 (€)</label>
                  <input
                    type="number"
                    step="100"
                    value={inputs.opex1 ?? inputs.opexAn1 ?? ''}
                    onChange={e => updateInput('opex1', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Assurance exploitation An 1 (€)</label>
                  <input
                    type="number"
                    step="10"
                    value={inputs.ass1 ?? inputs.assuranceAn1 ?? ''}
                    onChange={e => updateInput('ass1', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Loyer foncier An 1 (€)</label>
                  <input
                    type="number"
                    step="50"
                    value={inputs.loyer1 ?? inputs.loyerAn1 ?? ''}
                    onChange={e => updateInput('loyer1', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SOUS-SECTION : ANALYSE DE SENSIBILITÉ & STRESS-TESTS BANCAIRES ──── */}
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Analyse de Sensibilité & Stress-Tests Bancaires
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Matrice des 8 scénarios d'audit prêteur et marges de sécurité aux points de rupture bancaire.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Seuil d'alerte prêteur : DSCR min &lt; 1,10x
            </span>
          </div>

          {/* Tableau des 8 scénarios */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-left">
                  <th className="p-2.5">Scénario de Stress-Test</th>
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

          {/* Encadré : Marges de sécurité (point de rupture) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Marges de Sécurité (Point de Rupture Bancaire)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse revenus tolérée avant DSCR = 1,10x</div>
                <div className="text-lg font-black text-emerald-700 mt-1">
                  -{fmtPct((stress?.baisseToleree110 ?? rupture?.baisseToleree110 ?? 0), 1)}
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Seuil critique d'alerte bancaire</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse revenus tolérée avant DSCR = 1,00x</div>
                <div className="text-lg font-black text-blue-700 mt-1">
                  -{fmtPct((stress?.baisseToleree100 ?? rupture?.baisseToleree100 ?? 0), 1)}
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Point de rupture de trésorerie pure</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase">DSCR minimum du cas de base</div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {fmt(kpis.dscrMin, 2)}x
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Atteint en Année 1</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Années de prêt avec DSCR ≥ 1,20x</div>
                <div className="text-lg font-black text-emerald-800 mt-1">
                  {(stress?.anneesDscrGte120 ?? rupture?.anneesDscrSuperieur120 ?? "10/10")} / 10 ans
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Couverture optimale du service dette</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )}

    {/* ─── VOLET 2 : TABLEAU FINANCIER & SERVICE DE LA DETTE (12 ANS + CUMUL) ── */}
    {(activeTab === 'all' || activeTab === 'block3' || activeTab === 'page2') && (
      <section
        id="pdf-bess-page-2"
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 w-full shrink-0"
      >
        <BessPDFPageHeader
          pageNumber={2}
          totalPages={2}
          pageTitle="Volet 2 : Tableau Financier Prévisionnel & Service de la Dette"
          project={project}
          presetKey={presetKey}
        />

          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Table className="w-5 h-5 text-blue-600" />
                Tableau Financier Prévisionnel & Service de la Dette
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Profil d'amortissement sculpté sur 10 ans • Remboursement total en An 10 • Exploitation pure Ans 11-12
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Horizon 12 ans • Unités : Euros HT (€)
            </span>
          </div>

          <div className="w-full">
            <table className="w-full table-fixed text-[10.5px] text-right border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-center">
                  <th className="py-2 px-2 text-left w-[20%]">Poste Budgétaire (€ HT)</th>
                  {rows.map(y => (
                    <th key={y.year} className="py-2 px-1 w-[6%]">An {y.year}</th>
                  ))}
                  <th className="py-2 px-1.5 bg-blue-900 text-amber-300 w-[8%]">CUMUL 12A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* ── SOUS-SECTION 1 : EXPLOITATION ── */}
                <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                  <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                    I. Compte d'Exploitation & EBITDA
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-1.5 text-left text-slate-700 font-semibold">Revenus nets de rétrocession</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.revenue).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-black bg-blue-50/50">{Math.round(totals.revenue).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="hover:bg-slate-50 text-slate-600">
                  <td className="p-1.5 text-left">OPEX maintenance & exploitation</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.opex).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-bold bg-blue-50/50">{Math.round(totals.opex).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="hover:bg-slate-50 text-slate-600">
                  <td className="p-1.5 text-left">Frais agrégateur (15 %)</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.aggregatorFee).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-bold bg-blue-50/50">{Math.round(totals.aggregatorFee).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="hover:bg-slate-50 text-slate-600">
                  <td className="p-1.5 text-left">Assurance exploitation</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.insurance).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-bold bg-blue-50/50">{Math.round(totals.insurance).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="hover:bg-slate-50 text-slate-600">
                  <td className="p-1.5 text-left">Loyer foncier</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.landRent).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-bold bg-blue-50/50">{Math.round(totals.landRent).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="bg-emerald-50/70 font-black text-emerald-900 border-y border-emerald-200">
                  <td className="p-1.5 text-left">EBITDA (EBE)</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.ebitda).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 bg-emerald-100/80">{Math.round(totals.ebitda).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="text-slate-500 text-[10px] bg-slate-50">
                  <td className="p-1 text-left italic">Marge EBITDA (%)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{fmtPct(y.ebitdaMargin, 1)}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{fmtPct((totals.ebitda / totals.revenue) * 100, 1)}</td>
                </tr>

                {/* ── SOUS-SECTION 2 : SERVICE DETTE & RÉSULTAT ── */}
                <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                  <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                    II. Service de la Dette Bancaire (Profil Sculpté 10 ans) & Résultat Net
                  </td>
                </tr>
                <tr className="text-slate-500 text-[10px]">
                  <td className="p-1 text-left">Profil d'amortissement (%)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{fmtPct(y.amortProfilePct, 2)}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">100,00 %</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">Capital restant dû (début)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.beginningDebt).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 bg-blue-50/50">-</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">Intérêts + assurance emprunteur (4,3%)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.interest).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.interest).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">Amortissement du capital</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.principal).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.principal).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="bg-indigo-50/60 font-bold text-indigo-900">
                  <td className="p-1.5 text-left">Service de la dette (annuité)</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.debtService).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-black bg-indigo-100/80">{Math.round(totals.debtService).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">Amortissement installation (10 ans)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.capexDepreciation).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.capexDepreciation).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="text-slate-700 font-semibold">
                  <td className="p-1 text-left">Résultat avant impôt (EBT)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.ebt).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.ebt).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">Impôt sur les sociétés (IS)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.taxIS).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.taxIS).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="bg-slate-100 font-black text-slate-900 border-y border-slate-300">
                  <td className="p-1.5 text-left">Résultat net après IS</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.netIncome).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 bg-blue-100 text-blue-900">{Math.round(totals.netIncome).toLocaleString('fr-FR')}</td>
                </tr>

                {/* ── SOUS-SECTION 3 : RATIOS BANCAIRES ── */}
                <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                  <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                    III. Ratios Bancaires & Couverture de Dette
                  </td>
                </tr>
                <tr className="font-semibold text-slate-800">
                  <td className="p-1.5 text-left">CFADS (EBITDA - IS)</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.cfads).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-black bg-blue-50/50">{Math.round(totals.cfads).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="bg-amber-50/50 font-black">
                  <td className="p-1.5 text-left text-amber-950">DSCR (CFADS / Annuité)</td>
                  {rows.map(y => (
                    <td key={y.year} className="p-1.5">
                      {y.dscr !== null ? (
                        <span className={cn(
                          "px-1 py-0.2 rounded text-[10.5px]",
                          y.dscr >= 1.20 ? "text-emerald-800 font-black" : (y.dscr >= 1.10 ? "text-amber-800 font-bold" : "text-red-700 font-black")
                        )}>
                          {fmt(y.dscr, 2)}x
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">N/A</span>
                      )}
                    </td>
                  ))}
                  <td className="p-1.5 bg-amber-100 text-amber-950 font-black">{fmt(kpis.dscrAvg, 2)}x (Moy)</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">ICR (EBIT / Intérêts)</td>
                  {rows.map(y => (
                    <td key={y.year} className="p-1">
                      {y.icr !== null ? `${fmt(y.icr, 2)}x` : '-'}
                    </td>
                  ))}
                  <td className="p-1 bg-blue-50/50">{fmt(kpis.icrMin, 2)}x (Min)</td>
                </tr>

                {/* ── SOUS-SECTION 4 : FLUX DE TRÉSORERIE ── */}
                <tr className="bg-blue-50/80 font-black text-blue-900 text-left">
                  <td colSpan={14} className="p-1.5 uppercase text-[10px] tracking-wider">
                    IV. Flux de Trésorerie & Rentabilité (FCFF & FCFE)
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="p-1 text-left">IS non levier (sur EBIT)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.unleveredTax).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.unleveredTax).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="font-semibold text-slate-800">
                  <td className="p-1 text-left">FCFF Projet (non levier)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.fcff).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-black bg-blue-50/50">{Math.round(totals.fcff).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="text-slate-500 text-[10px]">
                  <td className="p-1 text-left">FCFF actualisé (@7,0%)</td>
                  {rows.map(y => <td key={y.year} className="p-1">{Math.round(y.discountedFcff).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1 font-bold bg-blue-50/50">{Math.round(totals.discountedFcff).toLocaleString('fr-FR')}</td>
                </tr>
                <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                  <td className="p-1.5 text-left">FCFE Fonds Propres (levier)</td>
                  {rows.map(y => <td key={y.year} className="p-1.5">{Math.round(y.fcfe).toLocaleString('fr-FR')}</td>)}
                  <td className="p-1.5 font-black bg-emerald-100 text-emerald-950">{Math.round(totals.fcfe).toLocaleString('fr-FR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
