import React, { useState } from 'react';
import {
  Zap,
  MapPin,
  ShieldCheck,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Scale,
  FileText
} from 'lucide-react';
import {
  TURPE7_TARIFF_GRIDS,
  BESS_STORAGE_REGIME,
  CERTITUDE_LEVELS,
  TURPE7_SOURCES
} from '../../data/turpe/turpe7Tarifs.js';
import { computeTurpeSensitivityMatrix } from '../../services/turpeCalculationService.js';

// Formatters
const fmtEur = (v) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0))} €`;
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;
const fmtDec = (v, d = 2) => `${(v || 0).toFixed(d)}`;

/**
 * Badge de niveau de certitude (1 à 4)
 */
export function CertitudeBadge({ certitude, compact = false }) {
  if (!certitude) return null;
  const isL4 = certitude.level === 4;

  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase rounded border px-2 py-0.5 ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${certitude.badgeClass || 'bg-slate-100 text-slate-800 border-slate-300'}`}
      title={certitude.description}
    >
      {isL4 ? <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" /> : <ShieldCheck className="w-3 h-3" />}
      {certitude.label}
    </span>
  );
}

/**
 * BANNIÈRE DE QUALIFICATION RÉSEAU & POSTE SOURCE
 */
export function NetworkQualificationBanner({
  qualification,
  isLoading,
  selectedProject,
  onApplyDistance
}) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-xs font-bold text-blue-900">
            Analyse géodésique et interrogation Open Data Enedis/ODRE en cours...
          </span>
        </div>
      </div>
    );
  }

  const sub = qualification?.substation;
  const hasSub = sub && sub.distanceKm !== null;
  const cert = sub?.certitude || CERTITUDE_LEVELS[4];

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                Qualification Réseau & Poste Source (ODRE)
              </span>
              <CertitudeBadge certitude={cert} compact />
            </div>
            <p className="text-[11px] text-slate-300">
              {hasSub
                ? `Poste source Enedis : ${sub.name} (${sub.voltageLevel}) à ${sub.distanceKm} km`
                : 'Coordonnées GPS partielles — Poste source non rapproché (À CONFIRMER)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasSub && onApplyDistance && (
            <button
              onClick={() => onApplyDistance(sub.estimatedRouteMeters || Math.round(sub.distanceKm * 1300))}
              className="px-2.5 py-1 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-500 text-white rounded shadow transition-colors flex items-center gap-1"
              title="Appliquer le tracé linéaire estimé au coût de raccordement Enedis"
            >
              <MapPin className="w-3 h-3" />
              Appliquer distance ({sub.distanceKm} km ~ {Math.round(sub.distanceKm * 1300)}m)
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title="Afficher/Masquer les détails réseau"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Site Projet</div>
            <div className="font-bold text-slate-800 truncate">
              {selectedProject?.name || 'Site BESS'}
            </div>
            <div className="text-[11px] text-slate-500">
              {qualification?.gps?.lat && qualification?.gps?.lng
                ? `${qualification.gps.lat.toFixed(4)}, ${qualification.gps.lng.toFixed(4)}`
                : 'Coordonnées GPS non renseignées'}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Poste Source ODRE</div>
            <div className="font-bold text-slate-800 truncate">{sub?.name || 'À confirmer'} {sub?.code ? `(${sub.code})` : ''}</div>
            <div className="text-[11px] text-blue-600 font-semibold">
              {sub?.voltageLevel || 'Tension à qualifier'} ({sub?.gestionnaire || 'Enedis'})
            </div>
            {sub?.quotePartS3REnR && sub.quotePartS3REnR !== '—' && (
              <div className="text-[10px] font-bold text-amber-700 mt-1">
                QP S3REnR : {sub.quotePartS3REnR}
              </div>
            )}
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Capacités Réseau (ODRE)</div>
            <div className="font-bold text-slate-800">
              Reste à affecter : <span className="text-emerald-600">{sub?.availableCapacityMw != null ? `${sub.availableCapacityMw} MW` : '—'}</span>
            </div>
            <div className="text-[11px] text-slate-600">
              Réservé : {sub?.reservedCapacityMw != null ? `${sub.reservedCapacityMw} MW` : '—'}
            </div>
            {sub?.fileAttenteMw != null && (
              <div className="text-[10px] text-slate-500">
                File d'attente : {sub.fileAttenteMw} MW
              </div>
            )}
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Distance & Tracé</div>
            <div className="font-bold text-slate-800">
              {hasSub ? `${sub.distanceKm} km vol d'oiseau` : 'Non calculée'}
            </div>
            <div className="text-[11px] text-slate-500">
              {hasSub ? `Tracé voirie estimé : ~${sub.estimatedRouteMeters || Math.round(sub.distanceKm * 1300)} m` : 'À CONFIRMER avec PTF'}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Zone CRE 2025-227 (TURPE 7)</div>
            <div className="font-bold text-indigo-700">
              {sub?.creQualification?.label || 'Zone standard Enedis'}
            </div>
            <div className="text-[10px] text-slate-500">
              {sub?.creQualification?.isIndexed
                ? 'Signal-prix délibéré — Neutralité stockage garantie'
                : 'Tarification stockage standard TURPE 7'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * BLOC DE CONTRÔLE ET DÉCOMPOSITION DU TURPE 7
 */
export function Turpe7ControlCard({
  config,
  update,
  turpeDetails,
  onOpenSources
}) {
  const [showBreakdown, setShowBreakdown] = useState(true);
  const useTurpe7 = config.useTurpe7 !== false;
  const currentDomain = config.tensionDomain || 'HTA1';
  const currentOption = config.tarifOption || 'CU';
  const useStorageOption = config.useStorageOption !== false;
  const currentZone = config.storageZone || 'ZONE_STANDARD';

  const details = turpeDetails || {};
  const comps = details.composantes || {};

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden mb-4">
      {/* Header avec switch */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-300" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            Tarif Réseau — TURPE 7 (CRE 2025-78 & 2026-105)
          </h4>
          <CertitudeBadge certitude={CERTITUDE_LEVELS[1]} compact />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-blue-950/60 px-2.5 py-1 rounded border border-blue-400/30">
            <input
              type="checkbox"
              checked={useTurpe7}
              onChange={(e) => update('useTurpe7', e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-500 focus:ring-0"
            />
            <span className="text-[11px] font-bold uppercase text-blue-100">
              {useTurpe7 ? 'Moteur TURPE 7 Actif' : 'Forfait 18 €/kW'}
            </span>
          </label>

          <button
            onClick={onOpenSources}
            className="p-1 text-blue-300 hover:text-white transition-colors"
            title="Consulter les références légales CRE et la méthodologie"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paramètres de calcul TURPE 7 */}
      {useTurpe7 ? (
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Domaine de Tension */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                Domaine de Tension
              </label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 h-8 font-medium"
                value={currentDomain}
                onChange={(e) => update('tensionDomain', e.target.value)}
              >
                {Object.entries(TURPE7_TARIFF_GRIDS).map(([key, grid]) => (
                  <option key={key} value={key}>
                    {grid.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Version Tarifaire */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                Version Tarifaire
              </label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 h-8 font-medium"
                value={currentOption}
                onChange={(e) => update('tarifOption', e.target.value)}
              >
                <option value="CU">Courte Utilisation (CU - Recommandé BESS)</option>
                <option value="MU">Moyenne Utilisation (MU - Usage intensif)</option>
              </select>
            </div>

            {/* Régime Stockage CRE 2025-227 */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                <span>Régime Stockage CRE</span>
                <span className="text-[9px] text-emerald-600 font-black">2025-227</span>
              </label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 h-8 font-medium"
                value={useStorageOption ? 'ON' : 'OFF'}
                onChange={(e) => update('useStorageOption', e.target.value === 'ON')}
              >
                <option value="ON">Neutralité stockage (Abattement réinjection)</option>
                <option value="OFF">Désactivé (Soutirage plein)</option>
              </select>
            </div>

            {/* Zone Signal-Prix */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                Zone Réseau Enedis/RTE
              </label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 h-8 font-medium"
                value={currentZone}
                onChange={(e) => update('storageZone', e.target.value)}
              >
                {Object.entries(BESS_STORAGE_REGIME.zones).map(([key, z]) => (
                  <option key={key} value={key}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Décomposition détaillée des composantes */}
          <div className="bg-white rounded border border-slate-200 overflow-hidden">
            <div
              className="px-3 py-1.5 bg-slate-100 flex items-center justify-between cursor-pointer"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <span className="text-[11px] font-black uppercase text-slate-700">
                Décomposition des 5 composantes TURPE 7 (Année 1)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-700">
                  Total : {fmtEur(details.totalTurpe7)}/an
                  {details.profile?.totalSoutireMwh ? ` (${fmtDec(details.coutMoyenParMwhSoutire, 1)} €/MWh)` : ''}
                </span>
                {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            {showBreakdown && (
              <div className="p-2.5 text-xs divide-y divide-slate-100">
                {/* 1. CG */}
                <div className="py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">1. Composante de Gestion (CG)</span>
                    <span className="text-[10px] text-slate-500">Contrat d'accès annuel Enedis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {fmtEur(comps.cg?.montantEur)}
                    </span>
                    <CertitudeBadge certitude={comps.cg?.certitude} compact />
                  </div>
                </div>

                {/* 2. CC */}
                <div className="py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">2. Composante de Comptage (CC)</span>
                    <span className="text-[10px] text-slate-500">Compteur 4 quadrants télé-relevé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {fmtEur(comps.cc?.montantEur)}
                    </span>
                    <CertitudeBadge certitude={comps.cc?.certitude} compact />
                  </div>
                </div>

                {/* 3. CS Fixe */}
                <div className="py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">3. Soutirage Part Fixe (CS Puissance)</span>
                    <span className="text-[10px] text-slate-500">
                      {comps.csFixe?.kp} €/kW/an × {comps.csFixe?.puissanceSouscriteKw} kW souscrits
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {fmtEur(comps.csFixe?.montantEur)}
                    </span>
                    <CertitudeBadge certitude={comps.csFixe?.certitude} compact />
                  </div>
                </div>

                {/* 4. CS Variable Horosaisonnière */}
                <div className="py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">4. Soutirage Part Variable (Horosaisonnière brute)</span>
                    <span className="text-[10px] text-slate-500">
                      {details.profile?.totalSoutireMwh} MWh soutirés (HCB: 55%, HCH: 40%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700">
                      +{fmtEur(comps.csVariableBrute?.montantEur)}
                    </span>
                  </div>
                </div>

                {/* 5. Abattement Spécifique Stockage */}
                {useStorageOption && (
                  <div className="py-1 flex items-center justify-between bg-emerald-50/60 -mx-2.5 px-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-800">
                        ↳ Dispositif CRE Stockage (Délibération 2025-227)
                      </span>
                      <span className="text-[10px] text-emerald-600">
                        Neutralisation sur réinjection (hors pertes de rendement)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-700">
                        -{fmtEur(comps.abattementStockage?.montantEur)}
                      </span>
                      <CertitudeBadge certitude={comps.abattementStockage?.certitude} compact />
                    </div>
                  </div>
                )}

                {/* 6. CS Variable Nette */}
                <div className="py-1 flex items-center justify-between pl-4">
                  <div className="text-[11px] text-slate-600 italic">
                    CS Énergie Nette facturée (couvre les pertes résiduelles du cycle)
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {fmtEur(comps.csVariableNette?.montantEur)}
                  </div>
                </div>

                {/* 7. CI Injection */}
                <div className="py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">5. Composante d'Injection (CI)</span>
                    <span className="text-[10px] text-slate-500">Exonération volumique HTA (0 €/MWh)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {fmtEur(comps.ci?.montantEur)}
                    </span>
                    <CertitudeBadge certitude={comps.ci?.certitude} compact />
                  </div>
                </div>

                {/* TOTAL */}
                <div className="pt-2 flex items-center justify-between font-black text-sm text-blue-900 bg-blue-50/40 -mx-2.5 px-2.5 rounded-b">
                  <span>TOTAL TURPE 7 AN 1</span>
                  <span className="font-mono text-base">{fmtEur(details.totalTurpe7)}/an</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Mode forfaitaire actif : <strong>{config.turpeStockageTarif ?? 18} €/kW/an</strong> (valeur d'estimation sans détail horosaisonnier ni délibération CRE).
            </span>
          </div>
          <button
            onClick={() => update('useTurpe7', true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] uppercase shadow"
          >
            Activer TURPE 7
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * COMPARATEUR AVANT / APRÈS TURPE 7 & ANALYSE DE SENSIBILITÉ
 */
export function Turpe7ComparatorAndSensitivitySection({
  results,
  config
}) {
  const turpeDetails = results.turpeDetails;
  if (!turpeDetails) return null;

  const forfaitAncien = turpeDetails.forfaitAncien18;
  const turpe7 = turpeDetails.totalTurpe7;
  const diffEur = turpeDetails.diffVsAncienEur;
  const diffPct = turpeDetails.diffVsAncienPct;

  const isSaving = diffEur < 0;

  // Calcul de la matrice de sensibilité (+/- 10%, 20%, 30%)
  const sensitivityMatrix = computeTurpeSensitivityMatrix({
    baseTurpeAnnuel: turpe7,
    baseEbitdaAnnuel: results.ebeAn1,
    baseCapexTotal: results.capexTotal
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CARTE 1 : COMPARATEUR AVANT / APRÈS */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Comparateur Avant / Après TURPE 7
                </h4>
              </div>
              <CertitudeBadge certitude={CERTITUDE_LEVELS[1]} compact />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  Ancien Forfait (18 €/kW)
                </div>
                <div className="text-base font-black text-slate-800 mt-0.5">
                  {fmtEur(forfaitAncien)}/an
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Estimation forfaitaire simple</div>
              </div>

              <div className="bg-blue-50/70 p-2.5 rounded border border-blue-200">
                <div className="text-[10px] uppercase font-bold text-blue-800">
                  TURPE 7 CRE Délibéré
                </div>
                <div className="text-base font-black text-blue-900 mt-0.5">
                  {fmtEur(turpe7)}/an
                </div>
                <div className="text-[10px] text-blue-700 mt-1">
                  Délib. 2025-78 & 2025-227
                </div>
              </div>
            </div>

            {/* Écart et impact */}
            <div
              className={`p-3 rounded border flex items-center justify-between ${
                isSaving
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <TrendingDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black uppercase">
                    {isSaving ? 'Économie annuelle TURPE' : 'Surcoût par rapport au forfait'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    Impact direct sur l'EBITDA et le cash-flow annuel
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black font-mono">
                  {isSaving ? '-' : '+'}{fmtEur(Math.abs(diffEur))}/an
                </div>
                <div className="text-[10px] font-bold">
                  {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>TRI Projet résultant : <strong className="text-blue-700">{fmtPct(results.triProjet)}</strong></span>
            <span>EBITDA An 1 : <strong className="text-slate-900">{fmtEur(results.ebeAn1)}</strong></span>
          </div>
        </div>

        {/* CARTE 2 : ANALYSE DE SENSIBILITÉ DYNAMIQUE */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Analyse de Sensibilité TURPE 7 (±10%, ±20%, ±30%)
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase">Résilience BP</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <th className="py-1.5 px-2">Scénario</th>
                  <th className="py-1.5 px-2 text-right">TURPE Annuel</th>
                  <th className="py-1.5 px-2 text-right">EBITDA An 1</th>
                  <th className="py-1.5 px-2 text-right">TRI Projet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sensitivityMatrix.map((item, idx) => {
                  const isRef = item.variationPct === 0;
                  return (
                    <tr
                      key={idx}
                      className={
                        isRef
                          ? 'bg-blue-50/70 font-bold text-blue-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }
                    >
                      <td className="py-1.5 px-2 flex items-center gap-1">
                        {isRef && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                        {item.label}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-medium">
                        {fmtEur(item.turpeEur)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-medium">
                        {fmtEur(item.ebitdaEur)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-blue-700">
                        {fmtPct(item.estimatedTri)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 italic">
            Mesure l'élasticité de l'EBITDA et du TRI en cas d'évolution quadriennale de la CRE.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MODAL DE TRANSPARENCE MÉTHODOLOGIQUE & RÉFÉRENCES JURIDIQUES CRE
 */
export function Turpe7SourcesModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Traçabilité & Références Juridiques TURPE 7 (CRE / JORF)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-lg font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          <div>
            <h4 className="font-black text-slate-900 text-sm uppercase mb-2">
              1. Délibérations Officielles de la CRE
            </h4>
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-bold text-slate-900">
                  Délibération CRE n° 2025-78 du 13 mars 2025 (TURPE 7 HTA-BT)
                </div>
                <div className="text-slate-600 mt-1">
                  Fixe le cadre tarifaire quadriennal 2025-2028 applicable aux réseaux de distribution Enedis et de transport RTE. Elle définit la structure en composantes : Gestion (CG), Comptage (CC), Soutirage (CS fixe + variable horosaisonnière) et Injection (CI).
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-bold text-slate-900">
                  Délibération CRE n° 2026-105 du 21 mai 2026 (JORF n° 0135, texte n° 124)
                </div>
                <div className="text-slate-600 mt-1">
                  Arrêté d'actualisation de la grille tarifaire au 1er août 2026 (+3,04%). Les barèmes intégrés dans NelsonPV correspondent fidèlement à cette grille légale en vigueur.
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                <div className="font-bold text-emerald-900">
                  Délibération CRE n° 2025-227 & n° 2026-33 (Régime Spécifique Stockage BESS)
                </div>
                <div className="text-emerald-800 mt-1">
                  Instaure le dispositif de neutralité pour les installations de stockage d'électricité : l'énergie soutirée pour être ensuite réinjectée sur le réseau bénéficie d'un abattement total de la part variable d'acheminement, évitant ainsi le double paiement du transport de l'électricité. Seules les pertes de conversion (1 - rendement) restent assujetties au tarif de soutirage classique.
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm uppercase mb-2">
              2. Niveaux de Certitude Réglementaires (Norme 1 à 4)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(CERTITUDE_LEVELS).map((item) => (
                <div key={item.level} className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CertitudeBadge certitude={item} compact />
                  </div>
                  <div className="text-slate-600 text-[11px]">{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm uppercase mb-2">
              3. Absence Absolue de Double Comptage
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong>CAPEX de raccordement Enedis :</strong> Correspond aux travaux physiques de génie civil, câbles HTA, tranchées et cellule disjoncteur du poste de livraison.
              </li>
              <li>
                <strong>OPEX TURPE 7 :</strong> Correspond à la redevance annuelle d'utilisation des réseaux publics (acheminement de l'énergie, gestion de contrat, comptage).
              </li>
              <li>
                <strong>Coût d'achat de l'énergie de recharge :</strong> Payé au fournisseur d'électricité sur les marchés spot / EPEX, totalement distinct du TURPE versé à Enedis.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs uppercase"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
