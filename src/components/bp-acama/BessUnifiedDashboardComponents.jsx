import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Table as TableIcon,
  Activity,
  Sparkles,
  Landmark,
  Percent,
  Calendar,
  Coins,
  Building2,
  Zap,
  Wrench,
  FileText,
  BarChart3,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { cn } from '@/lib/utils';

export function fmtEur(val) {
  if (val === null || val === undefined || isNaN(val)) return '0 €';
  return `${Math.round(val).toLocaleString('fr-FR')} €`;
}

export function fmt(val, dec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return Number(val).toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

export function fmtPct(val, dec = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0,0 %';
  return `${Number(val).toFixed(dec).replace('.', ',')} %`;
}

// ─── 1. BARRE DE SÉLECTEURS GLOBAUX (COMMUNS UNITAIRE & MULTI-PROJETS) ──────
export function BessGlobalSelectorsBar({
  capexMode = 'COMPTE_PROPRE',
  onSelectCapexMode,
  financingMode = 'WITH_LOAN',
  onSelectFinancingMode,
  revenueModel = 'CLEAN_HORIZON',
  onSelectRevenueModel,
  horizonYears = 20,
  onSelectHorizonYears,
  powerMw = 0.50,
  nbSites = 1
}) {
  const scale = (Number(powerMw) || 0.50) / 0.50;
  const propreCost = Math.round(184000 * scale).toLocaleString('fr-FR');
  const tiersCost = Math.round(229000 * scale).toLocaleString('fr-FR');
  const kwLabel = `${Math.round((Number(powerMw) || 0.50) * 1000)} kW`;

  return (
    <div
      className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl border border-blue-900/60 shadow-md space-y-3"
      data-html2canvas-ignore="true"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* 1) Mode de Montage / CAPEX */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-400" />
              1. Mode de Montage / CAPEX
            </span>
            <span className="text-[10px] font-bold text-slate-300">
              {nbSites > 1 ? `${nbSites} sites × ${kwLabel}` : `Base ${kwLabel}`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectCapexMode && onSelectCapexMode('COMPTE_PROPRE')}
              className={cn(
                "px-2.5 py-2 rounded-lg text-left transition-all border cursor-pointer",
                capexMode === 'COMPTE_PROPRE'
                  ? "bg-blue-600 text-white border-blue-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
            >
              <div className="text-[11px] leading-tight">Pour Compte Propre</div>
              <div className={cn("text-[10px] mt-0.5 font-bold", capexMode === 'COMPTE_PROPRE' ? "text-blue-100" : "text-slate-400")}>
                {propreCost} € / {kwLabel}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectCapexMode && onSelectCapexMode('COMPTE_TIERS')}
              className={cn(
                "px-2.5 py-2 rounded-lg text-left transition-all border cursor-pointer",
                capexMode === 'COMPTE_TIERS'
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
            >
              <div className="text-[11px] leading-tight">Pour Compte Tiers</div>
              <div className={cn("text-[10px] mt-0.5 font-bold", capexMode === 'COMPTE_TIERS' ? "text-indigo-100" : "text-slate-400")}>
                {tiersCost} € / {kwLabel}
              </div>
            </button>
          </div>
        </div>

        {/* 2) Mode de Financement */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              2. Mode de Financement
            </span>
            <span className="text-[10px] font-bold text-slate-300">
              {financingMode === 'CASH' ? '0% Dette • 100% FP' : 'Effet de levier bancaire'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectFinancingMode && onSelectFinancingMode('WITH_LOAN')}
              className={cn(
                "px-2.5 py-2 rounded-lg text-left transition-all border cursor-pointer",
                financingMode === 'WITH_LOAN'
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
            >
              <div className="text-[11px] leading-tight">Avec prêt (Dette Senior)</div>
              <div className={cn("text-[10px] mt-0.5 font-bold", financingMode === 'WITH_LOAN' ? "text-emerald-100" : "text-slate-400")}>
                Dette bancaire & DSCR
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectFinancingMode && onSelectFinancingMode('CASH')}
              className={cn(
                "px-2.5 py-2 rounded-lg text-left transition-all border cursor-pointer",
                financingMode === 'CASH'
                  ? "bg-amber-600 text-white border-amber-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
            >
              <div className="text-[11px] leading-tight">Payé comptant</div>
              <div className={cn("text-[10px] mt-0.5 font-bold", financingMode === 'CASH' ? "text-amber-100" : "text-slate-400")}>
                100% Fonds Propres
              </div>
            </button>
          </div>
        </div>

        {/* 3) Modèle de Revenus & Horizon */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              3. Modèle de Revenus & Horizon
            </span>
            <div className="flex items-center gap-1">
              {[12, 15, 20].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onSelectHorizonYears && onSelectHorizonYears(h)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer",
                    Number(horizonYears) === h
                      ? "bg-cyan-500 text-slate-950 shadow-xs"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  )}
                >
                  {h} ans
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectRevenueModel && onSelectRevenueModel('CLEAN_HORIZON')}
              className={cn(
                "px-2 py-2 rounded-lg text-left transition-all border cursor-pointer",
                revenueModel === 'CLEAN_HORIZON'
                  ? "bg-cyan-600 text-white border-cyan-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
              title="Courbe officielle Clean Horizon — Scénario Central (20 ans, 1 cycle/j, TILT)"
            >
              <div className="text-[10.5px] leading-tight truncate">Clean Horizon</div>
              <div className={cn("text-[9.5px] mt-0.5 font-bold truncate", revenueModel === 'CLEAN_HORIZON' ? "text-cyan-100" : "text-slate-400")}>
                20 ans • 1 cycle/j
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectRevenueModel && onSelectRevenueModel('ENR_COURTAGE')}
              className={cn(
                "px-2 py-2 rounded-lg text-left transition-all border cursor-pointer",
                revenueModel === 'ENR_COURTAGE'
                  ? "bg-blue-600 text-white border-blue-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
              title="Modèle ENR Courtage Value Stacking (15 ans, 2 cycles/j)"
            >
              <div className="text-[10.5px] leading-tight truncate">ENR Courtage</div>
              <div className={cn("text-[9.5px] mt-0.5 font-bold truncate", revenueModel === 'ENR_COURTAGE' ? "text-blue-100" : "text-slate-400")}>
                15 ans • 2 cycles/j
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectRevenueModel && onSelectRevenueModel('CUSTOM')}
              className={cn(
                "px-2 py-2 rounded-lg text-left transition-all border cursor-pointer",
                revenueModel === 'CUSTOM'
                  ? "bg-purple-600 text-white border-purple-400 shadow-sm font-black"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white font-semibold"
              )}
              title="Revenu annuel brut An 1 personnalisé"
            >
              <div className="text-[10.5px] leading-tight truncate">Personnalisé</div>
              <div className={cn("text-[9.5px] mt-0.5 font-bold truncate", revenueModel === 'CUSTOM' ? "text-purple-100" : "text-slate-400")}>
                Libre ({horizonYears} ans)
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. VENTILATION CAPEX DÉTAILLÉE & ÉDITABLE (UNITAIRE + MULTI-PROJETS) ────
export function BessCapexBreakdownCard({
  capexSummary,
  capexMode = 'COMPTE_PROPRE',
  onUpdateCapexField,
  onSelectCapexMode,
  onApplyOdreRaccordement,
  odreRaccordementCost = null,
  powerMw = 0.50,
  nbSites = 1,
  fraisCommerciaux = 0
}) {
  if (!capexSummary) return null;
  const {
    breakdown,
    subTotalOrigination,
    subTotalTravaux,
    subTotalEnedis,
    unitCapexTotal,
    pctOrigination,
    pctTravaux,
    pctEnedis,
    raccordementPerMw,
    hasRaccordementWarning,
    portfolioCapexTotal
  } = capexSummary;

  const kwLabel = `${Math.round((Number(powerMw) || 0.50) * 1000)} kW`;
  const nbArmoires = Math.max(1, Math.round(((Number(powerMw) || 0.50) * 1000) / 125));
  const unitWithFrais = unitCapexTotal + Number(fraisCommerciaux || 0);
  const consolidatedWithFrais = portfolioCapexTotal + Number(fraisCommerciaux || 0) * nbSites;

  const CapexInputRow = ({ label, field, value, hint }) => (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-700 truncate">{label}</div>
        {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          step="100"
          min="0"
          value={Math.round(value || 0)}
          onChange={(e) => onUpdateCapexField && onUpdateCapexField(field, parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 text-right text-xs font-bold bg-blue-50/80 border border-blue-300 rounded-md text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-[11px] font-bold text-slate-500">€</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Ventilation CAPEX & Coûts de Projet (Éditable)
              </h3>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border",
                capexMode === 'COMPTE_PROPRE'
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : "bg-indigo-100 text-indigo-800 border-indigo-200"
              )}>
                {capexMode === 'COMPTE_PROPRE' ? 'Grille Pour Compte Propre' : 'Grille Pour Compte Tiers'} • {kwLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tous les postes sont éditables en temps réel (en €/projet {kwLabel}) et recalculent instantanément le CAPEX, la dette, le DSCR et le TRI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" data-html2canvas-ignore="true">
          <button
            type="button"
            onClick={() => onSelectCapexMode && onSelectCapexMode('COMPTE_PROPRE')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
              capexMode === 'COMPTE_PROPRE'
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            )}
          >
            Compte Propre (184 k€)
          </button>
          <button
            type="button"
            onClick={() => onSelectCapexMode && onSelectCapexMode('COMPTE_TIERS')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
              capexMode === 'COMPTE_TIERS'
                ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            )}
          >
            Compte Tiers (229 k€)
          </button>
        </div>
      </div>

      {/* 3 Colonnes de ventilation : A. Origination | B. Travaux & Matériel | C. Raccordement Enedis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* A. Origination & Développement */}
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800">
                A. Origine & Développement
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {Math.round(pctOrigination)} % du CAPEX
              </span>
            </div>
            <div className="space-y-0.5">
              <CapexInputRow
                label="Sécurisation foncière"
                field="securisationFonciere"
                value={breakdown.securisationFonciere}
                hint="2 000 € (Propre) / 10 000 € (Tiers)"
              />
              <CapexInputRow
                label="Urbanisme (DP)"
                field="urbanismeDp"
                value={breakdown.urbanismeDp}
                hint="500 € (Propre) / 600 € (Tiers)"
              />
              <CapexInputRow
                label="Huissier (Constat affichage)"
                field="huissier"
                value={breakdown.huissier}
                hint="500 € (Propre) / 600 € (Tiers)"
              />
              <CapexInputRow
                label="Géomètre"
                field="geometre"
                value={breakdown.geometre}
                hint="1 500 € (Propre) / 1 800 € (Tiers)"
              />
              <CapexInputRow
                label="Notaire (Bail emphytéotique)"
                field="notaire"
                value={breakdown.notaire}
                hint="4 000 € (Propre) / 4 500 € (Tiers)"
              />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t-2 border-blue-200 flex items-center justify-between bg-blue-50/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-xs font-black text-blue-950">Sous-total Origination</span>
            <span className="text-sm font-black text-blue-900">
              {fmtEur(subTotalOrigination)} <span className="text-[10px] font-bold text-blue-700">({Math.round(pctOrigination)} %)</span>
            </span>
          </div>
        </div>

        {/* B. Travaux & Matériel */}
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                B. Travaux & Matériel
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {Math.round(pctTravaux)} % du CAPEX
              </span>
            </div>
            <div className="space-y-1">
              <CapexInputRow
                label={`Batteries (${nbArmoires} arm. 125 kW CESC 261)`}
                field="batteries"
                value={breakdown.batteries}
                hint={`${Math.round((breakdown.batteries || 108000) / nbArmoires / 1000)} k€ / armoire 125 kW (27 k€ Propre / 35 k€ Tiers)`}
              />
              <CapexInputRow
                label="Génie Civil (Dalle béton < 20 m²)"
                field="genieCivil"
                value={breakdown.genieCivil}
                hint="4 500 € (Propre) / 6 500 € (Tiers)"
              />
              <CapexInputRow
                label="Installation & Mise en service"
                field="installation"
                value={breakdown.installation}
                hint="13 000 € (Propre) / 15 000 € (Tiers)"
              />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t-2 border-emerald-200 flex items-center justify-between bg-emerald-50/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-xs font-black text-emerald-950">Sous-total Travaux</span>
            <span className="text-sm font-black text-emerald-900">
              {fmtEur(subTotalTravaux)} <span className="text-[10px] font-bold text-emerald-700">({Math.round(pctTravaux)} %)</span>
            </span>
          </div>
        </div>

        {/* C. Raccordement Enedis & Contrôle Métier */}
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                C. Raccordement Enedis
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {Math.round(pctEnedis)} % du CAPEX
              </span>
            </div>

            <CapexInputRow
              label={`Raccordement Enedis (${kwLabel})`}
              field="raccordementEnedis"
              value={breakdown.raccordementEnedis}
              hint={`Défaut 50 000 € / projet • Ratio : ${Math.round(raccordementPerMw / 1000)} k€/MW`}
            />

            {odreRaccordementCost && onApplyOdreRaccordement && (
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-[11px]" data-html2canvas-ignore="true">
                <span className="text-slate-600 font-medium">
                  Chiffrage tracé ODRE / S3REnR : <b>{fmtEur(odreRaccordementCost)}</b>
                </span>
                <button
                  type="button"
                  onClick={() => onApplyOdreRaccordement(odreRaccordementCost)}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded border border-blue-200 cursor-pointer"
                >
                  Appliquer
                </button>
              </div>
            )}

            {/* RÈGLE MÉTIER / ALERTE VISUELLE RACCORDEMENT */}
            {hasRaccordementWarning ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border-2 border-amber-400/80 text-amber-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <div className="font-black text-red-700 uppercase">
                    ⚠️ Raccordement &gt; 50 k€/MW (Seuil KO dépassé)
                  </div>
                  <div className="text-amber-900 font-medium mt-0.5">
                    Coût actuel : <b>{fmtEur(subTotalEnedis)}</b> pour {kwLabel} (soit <b>{fmtEur(raccordementPerMw)}/MW</b> &gt; seuil interne de 50 000 €/MW).
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <b>Raccordement Conforme :</b> {fmtEur(raccordementPerMw)}/MW (≤ 50 k€/MW).
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t-2 border-amber-200 flex items-center justify-between bg-amber-50/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-xs font-black text-amber-950">Sous-total Enedis</span>
            <span className="text-sm font-black text-amber-900">
              {fmtEur(subTotalEnedis)} <span className="text-[10px] font-bold text-amber-700">({Math.round(pctEnedis)} %)</span>
            </span>
          </div>
        </div>
      </div>

      {/* D. Bandeau Total CAPEX Unitaire & Consolidé */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-blue-300">
            D. TOTAL CAPEX ({capexMode === 'COMPTE_PROPRE' ? 'Compte Propre' : 'Compte Tiers'}) :
          </span>
          <span className="text-lg font-black text-white bg-white/10 px-3 py-1 rounded-lg border border-white/15">
            {fmtEur(unitWithFrais)} <span className="text-xs font-semibold text-blue-200">/ site ({kwLabel})</span>
          </span>
          <span className="text-xs text-slate-300">
            Origination {fmtEur(subTotalOrigination)} ({Math.round(pctOrigination)}%) + Travaux {fmtEur(subTotalTravaux)} ({Math.round(pctTravaux)}%) + Enedis {fmtEur(subTotalEnedis)} ({Math.round(pctEnedis)}%)
            {fraisCommerciaux > 0 ? ` + Frais comm. ${fmtEur(fraisCommerciaux)}` : ''}
          </span>
        </div>

        {nbSites > 1 && (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-emerald-200 uppercase">
              Total Consolidé ({nbSites} sites) :
            </span>
            <span className="text-base font-black text-emerald-300">
              {fmtEur(consolidatedWithFrais)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 3. GRILLE DES 4 COLONNES D'HYPOTHÈSES FINANCIÈRES & OPEX (ÉDITABLES) ───
export function BessAssumptions4ColumnsGrid({
  inputs,
  model,
  onUpdateInput,
  onSelectRevenueModel,
  onSelectHorizonYears,
  onResetToDefault,
  powerMw = 0.50,
  nbSites = 1
}) {
  const p = model?.params || {};
  const scale = (Number(powerMw) || 0.50) / 0.50;
  const isCashMode = (inputs.financingMode || p.financingMode) === 'CASH';
  const effDispoPct = ((Number(inputs.roundTripEfficiencyPct ?? 88) / 100) * (Number(inputs.availabilityPct ?? 98) / 100) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3.5">
      <div className="border-b border-slate-100 pb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            Hypothèses Financières, Cyclage, Fiscalité & OPEX ({nbSites > 1 ? `Par site 500 kW & Consolidé ${nbSites} sites` : `Palier ${powerMw} MW`})
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Toutes les cellules bleues et curseurs sont modifiables en temps réel et pilotent les graphiques Clean Horizon et le compte d'exploitation.
          </p>
        </div>
        {onResetToDefault && (
          <button
            type="button"
            onClick={onResetToDefault}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
            data-html2canvas-ignore="true"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser les hypothèses standards
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* COLONNE 1 — STRUCTURE DE FINANCEMENT */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
          <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider border-b border-blue-100 pb-1 flex items-center justify-between">
            <span>1. Structure de Financement</span>
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="space-y-2.5 text-xs">
            {/* Durée de vie batterie / BP */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-600 font-semibold text-[11px]">Durée de vie batterie / BP (ans)</label>
                <span className="font-black text-blue-800">{p.horizonYears || 20} ans</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[12, 15, 20].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      onUpdateInput('horizonYears', h);
                      onUpdateInput('lifeYears', h);
                      if (onSelectHorizonYears) onSelectHorizonYears(h);
                    }}
                    className={cn(
                      "py-1 text-[11px] font-bold rounded border transition-all cursor-pointer",
                      Number(p.horizonYears) === h
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {h} ans
                  </button>
                ))}
              </div>
            </div>

            {/* Durée du prêt senior */}
            <div className={cn(isCashMode && "opacity-50 pointer-events-none")}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-600 font-semibold text-[11px]">Durée du prêt senior (ans)</label>
                <span className="font-black text-blue-800">{inputs.loanDurationYears ?? inputs.loanYears ?? 12} ans</span>
              </div>
              <div className="grid grid-cols-4 gap-1 mb-1.5">
                {[10, 12, 15, 20].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      onUpdateInput('loanDurationYears', d);
                      onUpdateInput('loanYears', d);
                    }}
                    className={cn(
                      "py-1 text-[11px] font-bold rounded border transition-all cursor-pointer",
                      Number(inputs.loanDurationYears ?? inputs.loanYears ?? 12) === d
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {d}a
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={inputs.loanDurationYears ?? inputs.loanYears ?? 12}
                onChange={e => {
                  onUpdateInput('loanDurationYears', parseInt(e.target.value, 10));
                  onUpdateInput('loanYears', parseInt(e.target.value, 10));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Quotité dette (%) */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-slate-600 font-semibold text-[11px]">Quotité dette (%)</label>
                <span className="text-[10px] font-bold text-slate-500">
                  FP : {isCashMode ? '100 %' : `${100 - Number(inputs.debtSharePct ?? 80)} %`}
                </span>
              </div>
              <input
                type="number"
                step="5"
                min="0"
                max="100"
                disabled={isCashMode}
                value={isCashMode ? 0 : (inputs.debtSharePct !== undefined ? inputs.debtSharePct : 80)}
                onChange={e => onUpdateInput('debtSharePct', e.target.value)}
                className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Taux nominal (%) + Boutons rapides */}
            <div className={cn(isCashMode && "opacity-50 pointer-events-none")}>
              <label className="text-slate-600 font-semibold block text-[11px] mb-1">Taux d'intérêt nominal (%)</label>
              <div className="grid grid-cols-5 gap-1 mb-1">
                {[3.80, 4.00, 4.30, 4.50, 5.00].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onUpdateInput('nominalRatePct', r)}
                    className={cn(
                      "py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer",
                      Math.abs(Number(inputs.nominalRatePct ?? 4.10) - r) < 0.02
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {r.toFixed(2)}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.05"
                value={inputs.nominalRatePct !== undefined ? inputs.nominalRatePct : 4.10}
                onChange={e => onUpdateInput('nominalRatePct', e.target.value)}
                className="w-full px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Assurance emprunteur (%) */}
            <div className={cn(isCashMode && "opacity-50 pointer-events-none")}>
              <label className="text-slate-600 font-semibold block text-[11px]">Assurance emprunteur (%)</label>
              <input
                type="number"
                step="0.05"
                value={inputs.insuranceRatePct !== undefined ? inputs.insuranceRatePct : 0.20}
                onChange={e => onUpdateInput('insuranceRatePct', e.target.value)}
                className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-semibold">Taux tout compris :</span>
              <span className="font-black text-blue-950 text-xs">
                {isCashMode ? '0,00 % (Comptant)' : fmtPct((model?.rateAllIn ?? 0.043) * 100, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* COLONNE 2 — INDEXATION, CYCLAGE & MARCHÉ */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="text-[10px] font-black uppercase text-emerald-700 tracking-wider border-b border-emerald-100 pb-1 flex items-center justify-between">
            <span>2. Indexation, Cyclage & Marché</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="space-y-2 text-xs">
            {/* Profil de revenus */}
            <div>
              <label className="text-slate-600 font-semibold block text-[11px]">Profil de revenus</label>
              <select
                value={inputs.revenueModel || 'CLEAN_HORIZON'}
                onChange={e => onSelectRevenueModel && onSelectRevenueModel(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="CLEAN_HORIZON">Clean Horizon 20 ans (1 cycle/j)</option>
                <option value="ENR_COURTAGE">ENR Courtage 15 ans (2 cycles/j)</option>
                <option value="CUSTOM">Manuel / Personnalisé</option>
              </select>
            </div>

            {/* Rendement Round-Trip & Disponibilité */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 font-semibold block text-[10.5px]">Rendement AC-AC (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.roundTripEfficiencyPct !== undefined ? inputs.roundTripEfficiencyPct : 88.0}
                  onChange={e => onUpdateInput('roundTripEfficiencyPct', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block text-[10.5px]">Disponibilité (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.availabilityPct !== undefined ? inputs.availabilityPct : 98.0}
                  onChange={e => onUpdateInput('availabilityPct', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
            </div>
            <div className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex justify-between">
              <span>Coeff. Rendement × Dispo :</span>
              <span>{effDispoPct.replace('.', ',')} %</span>
            </div>

            {/* Dégradation annuelle batterie (%) */}
            <div>
              <label className="text-slate-600 font-semibold block text-[11px]">Dégradation annuelle batterie (%/an)</label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.05"
                  value={inputs.batteryDegradationPct ?? inputs.revenueDegradationPct ?? 1.37}
                  onChange={e => {
                    onUpdateInput('batteryDegradationPct', e.target.value);
                    onUpdateInput('revenueDegradationPct', e.target.value);
                  }}
                  className="w-full px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateInput('batteryDegradationPct', 1.37);
                    onUpdateInput('revenueDegradationPct', 1.37);
                  }}
                  className="px-1.5 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-100 shrink-0 cursor-pointer"
                  title="1,37 %/an (1 cycle/j Clean Horizon)"
                >
                  1,37%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateInput('batteryDegradationPct', 2.20);
                    onUpdateInput('revenueDegradationPct', 2.20);
                  }}
                  className="px-1.5 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-100 shrink-0 cursor-pointer"
                  title="2,20 %/an (2 cycles/j)"
                >
                  2,20%
                </button>
              </div>
            </div>

            {/* Frais commerciaux (€/site) */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-slate-600 font-semibold text-[11px]">Frais commerciaux (€/site)</label>
                <div className="flex gap-1">
                  {[0, 2500, 5000, 20000].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => onUpdateInput('fraisCommerciaux', f)}
                      className={cn(
                        "px-1.5 py-0.5 text-[9.5px] font-bold rounded border cursor-pointer",
                        Number(inputs.fraisCommerciaux ?? 0) === f
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {f === 0 ? '0€' : f === 2500 ? '2.5k' : `${f / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="500"
                min="0"
                value={inputs.fraisCommerciaux ?? 0}
                onChange={e => onUpdateInput('fraisCommerciaux', e.target.value)}
                className="w-full px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
              />
            </div>

            {/* Frais agrégateur, Inflation & WACC */}
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-slate-600 font-semibold block text-[10px]">Agrégateur (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.aggregatorFeePct !== undefined ? inputs.aggregatorFeePct : 12.0}
                  onChange={e => onUpdateInput('aggregatorFeePct', e.target.value)}
                  className="w-full mt-0.5 px-1.5 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block text-[10px]">Inflation (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.opexInflationPct !== undefined ? inputs.opexInflationPct : 1.5}
                  onChange={e => onUpdateInput('opexInflationPct', e.target.value)}
                  className="w-full mt-0.5 px-1.5 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block text-[10px]">WACC (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.discountRatePct !== undefined ? inputs.discountRatePct : 7.0}
                  onChange={e => onUpdateInput('discountRatePct', e.target.value)}
                  className="w-full mt-0.5 px-1.5 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE 3 — FISCALITÉ DES SOCIÉTÉS & TAXES LOCALES (LF 2024 / 2026) */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
          <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider border-b border-indigo-100 pb-1 flex items-center justify-between">
            <span>3. Fiscalité & Taxes Locales</span>
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="space-y-2 text-xs">
            {/* Toggle Avec IS / Avant IS */}
            <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onUpdateInput('withIS', true)}
                className={cn(
                  "py-1 rounded-md text-[11px] font-black transition-all cursor-pointer",
                  inputs.withIS !== false
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Calculer Avec IS
              </button>
              <button
                type="button"
                onClick={() => onUpdateInput('withIS', false)}
                className={cn(
                  "py-1 rounded-md text-[11px] font-black transition-all cursor-pointer",
                  inputs.withIS === false
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Calculer Avant IS
              </button>
            </div>

            <div>
              <label className="text-slate-600 font-semibold block text-[11px]">Seuil taux réduit IS (€)</label>
              <input
                type="number"
                step="500"
                value={inputs.taxReducedThreshold !== undefined ? inputs.taxReducedThreshold : 42500}
                onChange={e => onUpdateInput('taxReducedThreshold', e.target.value)}
                className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 font-semibold block text-[10.5px]">Taux réduit IS (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.taxReducedRatePct !== undefined ? inputs.taxReducedRatePct : 15.0}
                  onChange={e => onUpdateInput('taxReducedRatePct', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block text-[10.5px]">Taux normal IS (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.taxNormalRatePct !== undefined ? inputs.taxNormalRatePct : 25.0}
                  onChange={e => onUpdateInput('taxNormalRatePct', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 font-semibold block text-[10.5px]">CFE (€/an dès An 2)</label>
                <input
                  type="number"
                  step="100"
                  value={inputs.cfeAn !== undefined ? inputs.cfeAn : Math.round(1000 * scale)}
                  onChange={e => onUpdateInput('cfeAn', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block text-[10.5px]">Taxe foncière (€/an)</label>
                <input
                  type="number"
                  step="50"
                  value={inputs.taxeFonciereAn !== undefined ? inputs.taxeFonciereAn : Math.round(500 * scale)}
                  onChange={e => onUpdateInput('taxeFonciereAn', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
                />
              </div>
            </div>

            <div className="p-2 bg-indigo-50/60 rounded border border-indigo-100 text-[10px] text-indigo-900 leading-tight">
              <b>Fiscalité PME :</b> 15 % jusqu'à 42 500 € d'EBT puis 25 % au-delà. Exonération CFE l'année de mise en service (An 1).
            </div>
          </div>
        </div>

        {/* COLONNE 4 — OPEX & EXPLOITATION ANNÉE 1 (PAR SITE) */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="text-[10px] font-black uppercase text-amber-700 tracking-wider border-b border-amber-100 pb-1 flex items-center justify-between">
            <span>4. OPEX & Exploitation An 1</span>
            <Zap className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="space-y-2 text-xs">
            {/* Maintenance OPEX An 1 */}
            <div>
              <div className="flex justify-between">
                <label className="text-slate-600 font-semibold text-[11px]">Maintenance OPEX An 1 (€/an)</label>
                <span className="text-[10px] text-slate-400">3 €/kW = {Math.round(1500 * scale)} €</span>
              </div>
              <input
                type="number"
                step="100"
                value={inputs.maintenanceAn1 ?? inputs.opexAn1 ?? inputs.opex1 ?? Math.round(1500 * scale)}
                onChange={e => {
                  onUpdateInput('maintenanceAn1', e.target.value);
                  onUpdateInput('opexAn1', e.target.value);
                  onUpdateInput('opex1', e.target.value);
                }}
                className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
              />
            </div>

            {/* Assurance exploitation An 1 */}
            <div>
              <div className="flex justify-between">
                <label className="text-slate-600 font-semibold text-[11px]">Assurance exploit. An 1 (€/an)</label>
                <span className="text-[10px] text-slate-400">Défaut : 1% du CAPEX</span>
              </div>
              <input
                type="number"
                step="50"
                value={inputs.assuranceAn1 ?? inputs.ass1 ?? Math.round((p.capexTotal / nbSites) * 0.01)}
                onChange={e => {
                  onUpdateInput('assuranceAn1', e.target.value);
                  onUpdateInput('ass1', e.target.value);
                }}
                className="w-full mt-0.5 px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
              />
            </div>

            {/* TURPE 7 An 1 */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-slate-600 font-semibold text-[11px]">TURPE 7 An 1 (€/an/site)</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateInput('turpeAn1', Math.round(11664 * scale))}
                    className={cn(
                      "px-1.5 py-0.5 text-[9.5px] font-bold rounded border cursor-pointer",
                      Math.abs(Number(inputs.turpeAn1 ?? 11664 * scale) - Math.round(11664 * scale)) < 50
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                    title="Tarif avec Bonus Soutirage CRE 2025-227 (11 664 € / 500 kW)"
                  >
                    Bonus CRE
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateInput('turpeAn1', Math.round(15318 * scale))}
                    className={cn(
                      "px-1.5 py-0.5 text-[9.5px] font-bold rounded border cursor-pointer",
                      Math.abs(Number(inputs.turpeAn1 ?? 11664 * scale) - Math.round(15318 * scale)) < 50
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                    title="Tarif Standard sans bonus CRE (15 318 € / 500 kW)"
                  >
                    Standard
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="100"
                value={inputs.turpeAn1 !== undefined ? inputs.turpeAn1 : Math.round(11664 * scale)}
                onChange={e => onUpdateInput('turpeAn1', e.target.value)}
                className="w-full px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
              />
            </div>

            {/* Loyer foncier bailleur An 1 */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-slate-600 font-semibold text-[11px]">Loyer bailleur An 1 (€/an/site)</label>
              </div>
              <div className="grid grid-cols-5 gap-1 mb-1">
                {[1500, 2000, 2400, 2500, 3000].map(l => {
                  const scaledL = Math.round(l * scale);
                  const curL = Number(inputs.loyerAn1 ?? inputs.loyer1 ?? 3000);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        onUpdateInput('loyerAn1', scaledL);
                        onUpdateInput('loyer1', scaledL);
                      }}
                      className={cn(
                        "py-0.5 text-[9.5px] font-bold rounded border transition-all cursor-pointer",
                        curL === scaledL
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {scaledL}€
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                step="100"
                value={inputs.loyerAn1 ?? inputs.loyer1 ?? Math.round(3000 * scale)}
                onChange={e => {
                  onUpdateInput('loyerAn1', e.target.value);
                  onUpdateInput('loyer1', e.target.value);
                }}
                className="w-full px-2 py-1 text-xs font-bold bg-blue-50/70 border border-blue-300 rounded text-blue-900"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. LES 4 CARTES DE SYNTHÈSE BANCAIRE PRÊTEUR (IDENTIQUES SUR LES 2 VUES) ───
export function BessLender4SummaryCards({ model }) {
  if (!model) return null;
  const kpis = model.kpis || {};
  const p = model.params || {};
  const isCashMode = p.isCashMode;
  const isDscrCompliant = isCashMode || (kpis.dscrMin ?? 1.2) >= 1.20;
  const isDscrAcceptable = isCashMode || (kpis.dscrMin ?? 1.2) >= 1.10;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Carte 1 : Structure & Dette */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 mb-2">
            1. Structure & Dette
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">CAPEX Total :</span>
              <span className="font-black text-slate-900">{fmtEur(kpis.capexTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Dette senior ({Math.round(p.debtSharePct || 0)}%) :</span>
              <span className="font-bold text-blue-900">{fmtEur(kpis.detteInitiale)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Fonds propres ({Math.round(100 - (p.debtSharePct || 0))}%) :</span>
              <span className="font-bold text-slate-800">{fmtEur(kpis.fondsPropresInitiaux)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Taux tout compris :</span>
              <span className="font-bold text-slate-900">
                {isCashMode ? 'Payé comptant (0%)' : fmtPct(kpis.allInDebtRate, 2)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
          <span>Durée prêt : <b>{isCashMode ? '0 an' : `${kpis.loanDurationYears} ans`}</b></span>
          <span>Post-prêt : <b className="text-emerald-700">{kpis.margeApresPretYears} ans</b></span>
        </div>
      </div>

      {/* Carte 2 : Exploitation */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 border-b border-slate-200 pb-1 mb-2">
            2. Exploitation ({kpis.horizonYears} ans)
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Revenus corrigés cumulés :</span>
              <span className="font-black text-slate-900">{fmtEur(kpis.cumulRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">EBITDA cumulé :</span>
              <span className="font-bold text-emerald-800">{fmtEur(kpis.cumulEbitda)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Résultat net {p.withIS ? 'après IS' : 'avant IS'} :</span>
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
          <span className="font-bold text-slate-800">{fmtPct(kpis.margeEbitdaMoyenne, 1)}</span>
        </div>
      </div>

      {/* Carte 3 : Ratios Bancaires */}
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
                isDscrCompliant ? "bg-emerald-100 text-emerald-800" : (isDscrAcceptable ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")
              )}>
                {isCashMode ? 'N/A (100% FP)' : `${fmt(kpis.dscrMin, 2)}x`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">DSCR Moyen :</span>
              <span className="font-bold text-slate-900">
                {isCashMode ? 'N/A (100% FP)' : `${fmt(kpis.dscrAvg, 2)}x`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ICR Minimum :</span>
              <span className="font-bold text-slate-900">
                {isCashMode ? 'N/A' : `${fmt(kpis.icrMin, 2)}x`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">LLCR (@{fmtPct(kpis.allInDebtRate, 1)}) :</span>
              <span className="font-bold text-indigo-900">
                {isCashMode ? 'N/A' : `${fmt(kpis.llcr, 2)}x`}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
          <span>PLCR ({kpis.horizonYears} ans) :</span>
          <span className="font-bold text-indigo-900">
            {isCashMode ? 'N/A' : `${fmt(kpis.plcr, 2)}x`}
          </span>
        </div>
      </div>

      {/* Carte 4 : Rentabilité & TRI */}
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
              <span className="text-slate-500">VAN Projet (@{fmtPct(p.discountRatePct, 1)}) :</span>
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
  );
}

// ─── 5. VISUELS GRAPHIQUES CLEAN HORIZON (2027-2046) & TRAJECTOIRE EBITDA ────
function CleanHorizonCustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[260px] z-50">
      <div className="font-black text-slate-900 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
        <span>Année {d.calendarYear} ({d.yearLabel})</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
          Capacité : {fmt(d.capaciteRestantePct, 1)}%
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: '#2563EB' }} />
            Trading (MA, DA, ID) :
          </span>
          <span className="font-bold text-slate-900">{fmtEur(d.tradingBrut)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: '#7DD3FC' }} />
            aFRR Capacity Reservation :
          </span>
          <span className="font-bold text-slate-900">{fmtEur(d.afrrCapBrut)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: '#06B6D4' }} />
            aFRR Energy Activation :
          </span>
          <span className="font-bold text-slate-900">{fmtEur(d.afrrEnergyBrut)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: '#1E3A8A' }} />
            Capacity Mechanism :
          </span>
          <span className="font-bold text-slate-900">{fmtEur(d.capacityMechBrut)}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
        <div className="flex items-center justify-between font-black text-slate-900">
          <span>Total Revenu Brut :</span>
          <span>{fmtEur(d.revenuBrutTotal)}</span>
        </div>
        <div className="flex items-center justify-between font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
          <span>Revenu Net Corrigé HT :</span>
          <span>{fmtEur(d.revenuCorrige)}</span>
        </div>
      </div>
    </div>
  );
}

function TrajectoryCustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[240px] z-50">
      <div className="font-black text-slate-900 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
        <span>Année {d.calendarYear} ({d.yearLabel})</span>
        {d.dscr !== null && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            DSCR : {fmt(d.dscr, 2)}x
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-emerald-700 font-bold">EBITDA Net (EBE) :</span>
          <span className="font-black text-emerald-800">{fmtEur(d.ebitda)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-indigo-700 font-bold">Service de la Dette :</span>
          <span className="font-bold text-indigo-900">{fmtEur(d.serviceDette)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-blue-700 font-bold">Cash-Flow Net Disponible :</span>
          <span className="font-black text-blue-900">{fmtEur(d.cashFlowNet)}</span>
        </div>
        <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex items-center justify-between text-slate-600">
          <span>Trésorerie Cumulée :</span>
          <span className="font-black text-slate-900">{fmtEur(d.tresorerieCumulee)}</span>
        </div>
      </div>
    </div>
  );
}

export function BessCleanHorizonChartsSection({ model, show20YearsForCleanHorizon = true }) {
  if (!model) return null;
  const p = model.params || {};
  // Pour le graphique 1 Clean Horizon, afficher les 20 années (2027-2046) ou l'horizon sélectionné
  const chart1Rows = (p.revenueModel === 'CLEAN_HORIZON' && show20YearsForCleanHorizon)
    ? (model.all20Rows || model.rows || [])
    : (model.rows || []);
  const chart2Rows = model.rows || [];

  const formatBarTopLabel = (val) => {
    if (!val || val <= 0) return '';
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    return `${Math.round(val / 1000)}k`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* GRAPHIQUE 1 — Revenus — Structure Marché (Clean Horizon) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Revenus — Structure Marché (Clean Horizon)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ventilation annuelle brute des 4 piliers de revenus (2027 à {2026 + chart1Rows.length}) • {p.nbSites > 1 ? `${p.nbSites} sites (${p.totalPowerMw.toFixed(1)} MW)` : `${p.powerMw} MW`}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Données Clean Horizon — Scénario Central
          </span>
        </div>

        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart1Rows} margin={{ top: 22, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="calendarYear"
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M€` : `${Math.round(v / 1000)}k€`}
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <RechartsTooltip content={<CleanHorizonCustomTooltip />} />
              <Legend
                iconType="square"
                wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '8px' }}
              />
              <Bar
                dataKey="tradingBrut"
                name="Trading (MA, DA, ID)"
                stackId="rev"
                fill="#2563EB"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="afrrCapBrut"
                name="aFRR Capacity Reservation"
                stackId="rev"
                fill="#7DD3FC"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="afrrEnergyBrut"
                name="aFRR Energy Activation"
                stackId="rev"
                fill="#06B6D4"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="capacityMechBrut"
                name="Capacity Mechanism"
                stackId="rev"
                fill="#1E3A8A"
                radius={[3, 3, 0, 0]}
              >
                <LabelList
                  dataKey="revenuBrutTotal"
                  position="top"
                  formatter={formatBarTopLabel}
                  style={{ fontSize: '9.5px', fontWeight: 800, fill: '#1E293B' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAPHIQUE 2 — Trajectoire Financière : EBITDA vs Cash-Flow Net & Dette */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Trajectoire Financière : EBITDA vs Cash-Flow Net & Dette
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comparaison annuelle sur {chart2Rows.length} ans de l'EBITDA Net, du Service de la Dette et du Cash-Flow Net Disponible
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-blue-50 text-blue-800 border border-blue-200">
            {p.isCashMode ? '100% Fonds Propres' : `Prêt ${p.loanDurationYears} ans @ ${fmtPct(model.kpis?.allInDebtRate, 2)}`}
          </span>
        </div>

        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart2Rows} margin={{ top: 18, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="calendarYear"
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M€` : `${Math.round(v / 1000)}k€`}
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <RechartsTooltip content={<TrajectoryCustomTooltip />} />
              <Legend
                iconType="square"
                wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '8px' }}
              />
              <Bar
                dataKey="ebitda"
                name="EBITDA Net (EBE)"
                fill="#10B981"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="serviceDette"
                name="Service de la Dette"
                fill="#6366F1"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="cashFlowNet"
                name="Cash-Flow Net Disponible"
                fill="#0EA5E9"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── 6. TABLEAU COMPLET ANNÉE PAR ANNÉE (AN 1 À AN 20 + TOTAL) ──────────────
export function BessCompleteAnnualTable({ model }) {
  if (!model) return null;
  const rows = model.rows || [];
  const totals = model.totals || {};
  const kpis = model.kpis || {};
  const p = model.params || {};
  const colSpanTotal = rows.length + 2;

  const fmtCell = (v) => Math.round(v || 0).toLocaleString('fr-FR');

  return (
    <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
      <table className="w-full text-[10.5px] text-right border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white font-bold text-center">
            <th className="py-2.5 px-2.5 text-left min-w-[215px] sticky left-0 bg-slate-900 z-10">
              Poste Budgétaire (€ HT)
            </th>
            {rows.map(y => (
              <th key={y.year} className="py-2 px-1.5 min-w-[68px]">
                <div>An {y.year}</div>
                <div className="text-[9px] text-slate-400 font-normal">{y.calendarYear}</div>
              </th>
            ))}
            <th className="py-2 px-2 bg-blue-900 text-amber-300 min-w-[90px]">
              TOTAL {rows.length}A
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {/* ── I. REVENUS BRUTS PAR PILIER & ABATTEMENTS ── */}
          <tr className="bg-blue-50/90 font-black text-blue-950 text-left">
            <td colSpan={colSpanTotal} className="p-1.5 uppercase text-[10px] tracking-wider">
              I. Revenus de Marché par Pilier (Clean Horizon) & Abattements Techniques
            </td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Trading (MA, DA, ID)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.tradingBrut)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.tradingBrut)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">aFRR Capacity Reservation</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.afrrCapBrut)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.afrrCapBrut)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">aFRR Energy Activation</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.afrrEnergyBrut)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.afrrEnergyBrut)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Capacity Mechanism (Mécanisme Capacité)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.capacityMechBrut)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.capacityMechBrut)}</td>
          </tr>
          <tr className="bg-slate-100 font-bold text-slate-900">
            <td className="p-1.5 text-left sticky left-0 bg-slate-100">Total Revenus Bruts (avant abattements)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.revenuBrutTotal)}</td>)}
            <td className="p-1.5 font-black bg-blue-100/70">{fmtCell(totals.revenuBrutTotal)}</td>
          </tr>
          <tr className="text-rose-600 text-[10px]">
            <td className="p-1.5 text-left sticky left-0 bg-white">
              Abattement Dispo ({fmt(p.availabilityPct, 0)}%) × Rendement ({fmt(p.roundTripEfficiencyPct, 0)}%)
            </td>
            {rows.map(y => <td key={y.year} className="p-1.5">-{fmtCell(y.abattementDispoRendement)}</td>)}
            <td className="p-1.5 font-bold bg-rose-50/50">-{fmtCell(totals.abattementDispoRendement)}</td>
          </tr>
          <tr className="text-slate-500 text-[10px] bg-slate-50/60">
            <td className="p-1 text-left italic sticky left-0 bg-slate-50">
              Capacité batterie restante (-{fmt(p.batteryDegradationPct, 2)}%/an)
            </td>
            {rows.map(y => <td key={y.year} className="p-1 font-semibold">{fmtPct(y.capaciteRestantePct, 1)}</td>)}
            <td className="p-1 font-bold bg-blue-50/50">—</td>
          </tr>
          <tr className="bg-blue-50/70 font-black text-blue-950 border-y border-blue-200">
            <td className="p-1.5 text-left sticky left-0 bg-blue-50">Revenus Nets Corrigés HT</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.revenuCorrige)}</td>)}
            <td className="p-1.5 bg-blue-100">{fmtCell(totals.revenuCorrige)}</td>
          </tr>

          {/* ── II. CHARGES D'EXPLOITATION (OPEX) & EBITDA ── */}
          <tr className="bg-blue-50/90 font-black text-blue-950 text-left">
            <td colSpan={colSpanTotal} className="p-1.5 uppercase text-[10px] tracking-wider">
              II. Détail des Charges d'Exploitation (OPEX) & EBE / EBITDA
            </td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Maintenance OPEX</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.opexMaintenance)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.opexMaintenance)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Assurance exploitation</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.assuranceExploitation)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.assuranceExploitation)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Frais Agrégateur ({fmt(p.aggregatorFeePct, 1)} %)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.fraisAgregateur)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.fraisAgregateur)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">TURPE 7 (Acheminement réseau Enedis)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.turpe7)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.turpe7)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Loyer foncier bailleur</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.loyerFoncier)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.loyerFoncier)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">CFE (Exonérée An 1)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.cfe)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.cfe)}</td>
          </tr>
          <tr className="hover:bg-slate-50 text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Taxe foncière</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.taxeFonciere)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.taxeFonciere)}</td>
          </tr>
          <tr className="bg-rose-50/60 font-bold text-rose-900">
            <td className="p-1.5 text-left sticky left-0 bg-rose-50">Total Charges d'Exploitation</td>
            {rows.map(y => <td key={y.year} className="p-1.5">-{fmtCell(y.totalChargesOpex)}</td>)}
            <td className="p-1.5 font-black bg-rose-100/70">-{fmtCell(totals.totalChargesOpex)}</td>
          </tr>
          <tr className="bg-emerald-50/80 font-black text-emerald-950 border-y border-emerald-200">
            <td className="p-1.5 text-left sticky left-0 bg-emerald-50">EBE / EBITDA</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.ebitda)}</td>)}
            <td className="p-1.5 bg-emerald-100">{fmtCell(totals.ebitda)}</td>
          </tr>
          <tr className="text-slate-500 text-[10px] bg-slate-50">
            <td className="p-1 text-left italic sticky left-0 bg-slate-50">Marge EBITDA (%)</td>
            {rows.map(y => <td key={y.year} className="p-1">{fmtPct(y.margeEbitda, 1)}</td>)}
            <td className="p-1 font-bold bg-blue-50/50">{fmtPct(kpis.margeEbitdaMoyenne, 1)}</td>
          </tr>

          {/* ── III. AMORTISSEMENTS, DETTE, FISCALITÉ & RÉSULTAT NET ── */}
          <tr className="bg-blue-50/90 font-black text-blue-950 text-left">
            <td colSpan={colSpanTotal} className="p-1.5 uppercase text-[10px] tracking-wider">
              III. Amortissements, Service de la Dette, Fiscalité (IS) & Résultat Net
            </td>
          </tr>
          <tr className="text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Amortissements installation</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.amortissementInstallation)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.amortissementInstallation)}</td>
          </tr>
          <tr className="text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Intérêts + assurance emprunteur</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.interetsAssurance)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.interetsAssurance)}</td>
          </tr>
          <tr className="text-slate-700 font-semibold">
            <td className="p-1.5 text-left sticky left-0 bg-white">Résultat avant IS (EBT)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.ebt)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.ebt)}</td>
          </tr>
          <tr className="text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">
              Impôt sur les Sociétés ({p.withIS ? 'IS 15% / 25%' : 'Désactivé — Avant IS'})
            </td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.is)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.is)}</td>
          </tr>
          <tr className="bg-slate-100 font-black text-slate-900 border-y border-slate-300">
            <td className="p-1.5 text-left sticky left-0 bg-slate-100">Résultat Net {p.withIS ? 'après IS' : 'avant IS'}</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.resultatNet)}</td>)}
            <td className="p-1.5 bg-blue-100 text-blue-950">{fmtCell(totals.resultatNet)}</td>
          </tr>

          {/* ── IV. CASH-FLOW NET, TRÉSORERIE CUMULÉE, CAPITAL RESTANT DÛ & DSCR ── */}
          <tr className="bg-blue-50/90 font-black text-blue-950 text-left">
            <td colSpan={colSpanTotal} className="p-1.5 uppercase text-[10px] tracking-wider">
              IV. Remboursement Capital, Cash-Flow Net, Trésorerie Cumulée & DSCR
            </td>
          </tr>
          <tr className="text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Remboursement capital emprunté</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.amortissementCapital)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">{fmtCell(totals.amortissementCapital)}</td>
          </tr>
          <tr className="bg-indigo-50/60 font-bold text-indigo-900">
            <td className="p-1.5 text-left sticky left-0 bg-indigo-50">Service de la dette total (Intérêts + Capital)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.serviceDette)}</td>)}
            <td className="p-1.5 font-black bg-indigo-100/80">{fmtCell(totals.serviceDette)}</td>
          </tr>
          <tr className="bg-emerald-50/90 font-black text-emerald-950 border-t border-emerald-200">
            <td className="p-1.5 text-left sticky left-0 bg-emerald-50">Cash-Flow Net Disponible (FCFE)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.cashFlowNet)}</td>)}
            <td className="p-1.5 bg-emerald-200/80">{fmtCell(totals.cashFlowNet)}</td>
          </tr>
          <tr className="bg-blue-950 text-white font-black">
            <td className="p-1.5 text-left sticky left-0 bg-blue-950">Trésorerie Cumulée</td>
            {rows.map(y => <td key={y.year} className="p-1.5 text-cyan-300">{fmtCell(y.tresorerieCumulee)}</td>)}
            <td className="p-1.5 bg-blue-900 text-amber-300">{fmtCell(totals.cashFlowNet)}</td>
          </tr>
          <tr className="text-slate-600">
            <td className="p-1.5 text-left sticky left-0 bg-white">Capital restant dû (fin d'année)</td>
            {rows.map(y => <td key={y.year} className="p-1.5">{fmtCell(y.capitalFin)}</td>)}
            <td className="p-1.5 font-bold bg-blue-50/50">0</td>
          </tr>
          <tr className="bg-amber-50/70 font-black">
            <td className="p-1.5 text-left text-amber-950 sticky left-0 bg-amber-50">DSCR annuel (CFADS / Annuité)</td>
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
                  <span className="text-slate-400 font-normal">—</span>
                )}
              </td>
            ))}
            <td className="p-1.5 bg-amber-100 text-amber-950 font-black">
              {p.isCashMode ? '100% FP' : `${fmt(kpis.dscrAvg, 2)}x (Moy)`}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── 7. MATRICE D'ANALYSE DE SENSIBILITÉ & STRESS-TESTS BANCAIRES ──────────
export function BessSensitivityMatrixSection({ stress, model }) {
  if (!stress || !model) return null;
  const scenarios = stress.scenarios || [];
  const kpis = model.kpis || {};
  const p = model.params || {};

  return (
    <div className="space-y-3.5">
      <div className="border-b border-slate-100 pb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Matrice d'Analyse de Sensibilité & Stress-Tests Bancaires
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Impact des scénarios (Cas Bas -15 %, Cas de Base, Cas Haut +15 %, Stress vieillissement 2 %/an, Stress sans bonus TURPE 7) sur le DSCR, le TRI et la VAN.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-500">
          Seuil de conformité prêteur : DSCR min ≥ 1,20x (Alerte &lt; 1,10x)
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-left">
              <th className="p-2.5">Scénario de Sensibilité / Stress-Test</th>
              <th className="p-2.5 text-center">DSCR Min</th>
              <th className="p-2.5 text-center">DSCR Moyen</th>
              <th className="p-2.5 text-center">TRI Projet</th>
              <th className="p-2.5 text-right">VAN Projet (@{fmtPct(p.discountRatePct, 1)})</th>
              <th className="p-2.5 text-right">Cash-Flow Net Cumulé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {scenarios.map((sc, idx) => {
              const isBase = idx === 0;
              const isOk = p.isCashMode || sc.dscrMin >= 1.10;
              const isCompliant = p.isCashMode || sc.dscrMin >= 1.20;
              return (
                <tr
                  key={sc.id}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    isBase ? "bg-blue-50/70 font-black text-blue-950" : "text-slate-800"
                  )}
                >
                  <td className="p-2.5 flex items-center gap-2">
                    {isBase && <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />}
                    <span>{sc.name}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    {p.isCashMode ? (
                      <span className="px-2 py-0.5 rounded-full font-black text-xs bg-emerald-100 text-emerald-800">
                        100% FP
                      </span>
                    ) : (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full font-black text-xs inline-flex items-center gap-1",
                        isCompliant ? "bg-emerald-100 text-emerald-800" : (isOk ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")
                      )}>
                        {isOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {fmt(sc.dscrMin, 2)}x
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-center font-bold">
                    {p.isCashMode ? '—' : `${fmt(sc.dscrAvg, 2)}x`}
                  </td>
                  <td className="p-2.5 text-center font-black text-blue-700">
                    {fmtPct(sc.triProjet, 1)}
                  </td>
                  <td className={cn("p-2.5 text-right font-bold", (sc.projectNpv ?? 0) < 0 ? "text-red-600" : "text-slate-900")}>
                    {fmtEur(sc.projectNpv)}
                  </td>
                  <td className="p-2.5 text-right font-black text-emerald-800">
                    {fmtEur(sc.cashFlowNetCumule ?? sc.cumulNetIncome)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Marges de sécurité (point de rupture) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
        <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Marges de Sécurité (Point de Rupture Bancaire)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse revenus tolérée avant DSCR = 1,10x</div>
            <div className="text-lg font-black text-emerald-700 mt-1">
              -{fmtPct(stress.baisseToleree110 ?? 0, 1)}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">Seuil critique d'alerte bancaire</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Baisse revenus tolérée avant DSCR = 1,00x</div>
            <div className="text-lg font-black text-blue-700 mt-1">
              -{fmtPct(stress.baisseToleree100 ?? 0, 1)}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">Point de rupture de trésorerie pure</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">DSCR minimum du cas de base</div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {p.isCashMode ? '100% FP' : `${fmt(kpis.dscrMin, 2)}x`}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">Couverture minimale sur la durée du prêt</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Années de prêt avec DSCR ≥ 1,20x</div>
            <div className="text-lg font-black text-emerald-800 mt-1">
              {stress.anneesDscrGte120} / {stress.totalLoanYears || p.loanDurationYears} ans
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">Couverture optimale du service dette</div>
          </div>
        </div>
      </div>
    </div>
  );
}
