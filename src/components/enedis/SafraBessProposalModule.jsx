import React, { useState, useMemo } from 'react';
import {
  Zap,
  BatteryCharging,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Info,
  Sliders,
  Maximize2,
  Flame,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  RotateCw,
  Building,
  Check,
  X,
  RefreshCw,
  Lock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { SAFRA_CATALOG, recommendSafraModel } from '@/data/safraCatalog';
import { computeSafraSimulation } from '@/services/safraBessService';
import { generateSafraProposalPdf } from '@/services/safraPdfService';

const TS = { borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600 };

export default function SafraBessProposalModule({
  prm = '',
  titulaire = '',
  adresse = '',
  consoAnnuelleKwh = 211781,
  consoJourMoyKwh = 578.6,
  peakKw = 90.0,
  toast = () => {}
}) {
  // Recommandation initiale automatique
  const autoRecommendation = useMemo(() => {
    return recommendSafraModel(consoJourMoyKwh, peakKw);
  }, [consoJourMoyKwh, peakKw]);

  // État local de la configuration
  const [selectedModelId, setSelectedModelId] = useState(autoRecommendation.primaryModel.id);
  const [quantity, setQuantity] = useState(autoRecommendation.quantity);
  const [includeGridConnection, setIncludeGridConnection] = useState(false);
  const [forcedGridConnection, setForcedGridConnection] = useState(false);
  const [customDistanceMeters, setCustomDistanceMeters] = useState(25);

  // Switch mode d'investissement : 'TURNKEY' (Clé en main posé par défaut) | 'HARDWARE_ONLY' (Matériel seul)
  const [pricingMode, setPricingMode] = useState('TURNKEY');

  // Remise partenaire distributeur globale (par défaut -10%)
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(10);

  // Prix personnalisés par modèle avec migration et purge automatique des anciennes versions obsolètes
  const [customPrices, setCustomPrices] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('nelson_safra_prices');
        const saved = localStorage.getItem('nelson_safra_prices_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Sécurité anti-obsolescence : si d'anciens prix erronés (ex 3490€ ou 11900€) sont détectés, on purge le cache
          if (parsed?.UNIV5100W?.price === 3490 || parsed?.ST15K?.price === 11900) {
            localStorage.removeItem('nelson_safra_prices_v2');
            return {};
          }
          return parsed;
        }
      }
    } catch (e) {}
    return {};
  });

  const [isEditingPrices, setIsEditingPrices] = useState(false);

  // Filtre d'onglet de catalogue
  const [catalogFilter, setCatalogFilter] = useState('ALL'); // 'ALL' | 'LV' | 'HV' | 'CI' | 'CONTAINER'

  // Modèle actif
  const currentModel = useMemo(() => {
    return SAFRA_CATALOG.find(m => m.id === selectedModelId) || autoRecommendation.primaryModel;
  }, [selectedModelId, autoRecommendation.primaryModel]);

  // Simulation calculée en temps réel
  const simResult = useMemo(() => {
    const customPrice = customPrices[currentModel.id]?.price !== undefined
      ? customPrices[currentModel.id].price
      : (currentModel.sellingHardwarePriceHT || currentModel.defaultPriceHt);
    const customTurnkey = customPrices[currentModel.id]?.turnkey !== undefined
      ? customPrices[currentModel.id].turnkey
      : (currentModel.turnkeyInstalledPriceHT || (currentModel.defaultPriceHt + currentModel.defaultInstallHt));
    const customInstall = Math.max(0, customTurnkey - customPrice);

    return computeSafraSimulation({
      consoAnnuelleKwh,
      consoJourMoyKwh,
      peakKw,
      selectedModel: currentModel,
      quantity,
      customPriceHt: customPrice,
      customInstallHt: customInstall,
      pricingMode,
      includeGridConnection,
      forcedGridConnection,
      customDistanceMeters,
      prmAddress: adresse
    });
  }, [
    consoAnnuelleKwh,
    consoJourMoyKwh,
    peakKw,
    currentModel,
    quantity,
    customPrices,
    pricingMode,
    includeGridConnection,
    forcedGridConnection,
    customDistanceMeters,
    adresse
  ]);

  // Export PDF
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      generateSafraProposalPdf({
        simResult,
        prm,
        titulaire,
        adresse,
        consoAnnuelleKwh,
        consoJourMoyKwh,
        peakKw
      });
      toast({
        title: "Proposition commerciale générée",
        description: `Le dossier commercial en PDF a été téléchargé avec succès.`
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur PDF",
        description: "Impossible de générer le rapport PDF.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsExportingPdf(false), 600);
    }
  };

  const handlePriceChange = (modelId, field, value) => {
    setCustomPrices(prev => {
      const next = {
        ...prev,
        [modelId]: {
          ...prev[modelId],
          [field]: parseFloat(value) || 0
        }
      };
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('nelson_safra_prices_v2', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const resetPricesToRecommended = () => {
    setCustomPrices({});
    setGlobalDiscountPercent(10);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('nelson_safra_prices_v2');
        localStorage.removeItem('nelson_safra_prices');
      }
    } catch (e) {}
    toast({
      title: "Tarifs réinitialisés",
      description: "La grille tarifaire officielle distributeur (-10%) a été restaurée."
    });
  };

  const filteredCatalog = useMemo(() => {
    if (catalogFilter === 'ALL') return SAFRA_CATALOG;
    return SAFRA_CATALOG.filter(m => m.family === catalogFilter);
  }, [catalogFilter]);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-slate-800 space-y-8 my-8 relative overflow-hidden">

      {/* Fond décoratif lumineux */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── EN-TÊTE DU MODULE ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            PROPOSITION DE STOCKAGE INTELLIGENT
          </h2>
          <p className="text-sm text-slate-400 max-w-3xl">
            Étude de dimensionnement optimisée pour le profil de consommation du PRM{' '}
            <strong className="text-white font-mono">{prm}</strong>.
          </p>
        </div>

        {/* Bouton d'export PDF */}
        <button
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="self-start lg:self-center px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 shrink-0"
        >
          <FileDown size={18} />
          {isExportingPdf ? 'Génération du PDF...' : 'Exporter la Proposition (PDF)'}
        </button>
      </div>

      {/* ─── BANDEAU RECOMMANDATION AUTOMATIQUE (VISUEL RETIRÉ) ─── */}
      <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/80 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 size={14} />
              Recommandation automatique selon consommation
            </span>
            <span className="text-xs font-mono text-slate-400">Ref: {currentModel.reference}</span>
          </div>

          <h3 className="text-xl md:text-2xl font-black text-white">
            {quantity}× {currentModel.name}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentModel.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <span className="text-slate-400">Capacité totale : </span>
              <strong className="text-blue-400 font-black">{simResult.totalCapacityKwh.toFixed(1)} kWh</strong>
            </div>
            <div className="bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <span className="text-slate-400">Puissance max : </span>
              <strong className="text-emerald-400 font-black">{simResult.totalPowerKw.toFixed(0)} kW</strong>
            </div>
            <div className="bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <span className="text-slate-400">Technologie : </span>
              <strong className="text-amber-400 font-bold">{currentModel.coolingType}</strong>
            </div>
            <div className="bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs">
              <span className="text-slate-400">Autonomie : </span>
              <span className="text-slate-300 font-bold">{simResult.baseAutonomyPercent}%</span>
              <span className="text-slate-500 mx-1">➔</span>
              <strong className="text-emerald-400 font-black">{simResult.totalAutonomyPercent}%</strong>
              <span className="text-emerald-400/80 font-bold ml-1">(+{simResult.totalAutonomyPercent - simResult.baseAutonomyPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Stepper de quantité & Jauge d'autonomie */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Nombre d'unités (Armoires / Packs)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 4].map(q => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                    quantity === q
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {q}×
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Autonomie atteinte :</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Avant : <strong className="text-white font-bold">{simResult.baseAutonomyPercent}%</strong></span>
                <span className="text-slate-500">➔</span>
                <span className="text-emerald-400 font-black text-sm">Après : {simResult.totalAutonomyPercent}%</span>
              </div>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-slate-600 h-full"
                style={{ width: `${simResult.baseAutonomyPercent}%` }}
                title={`Autonomie initiale : ${simResult.baseAutonomyPercent}%`}
              />
              <div
                className="bg-gradient-to-r from-emerald-500 to-green-400 h-full transition-all duration-500"
                style={{ width: `${simResult.totalAutonomyPercent - simResult.baseAutonomyPercent}%` }}
                title={`Gain apporté par batterie : +${simResult.totalAutonomyPercent - simResult.baseAutonomyPercent}%`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
              <span>Avant : <strong className="text-slate-300 font-bold">{simResult.baseAutonomyPercent}%</strong></span>
              <span className="text-emerald-400 font-bold">Gain net : +{simResult.totalAutonomyPercent - simResult.baseAutonomyPercent}%</span>
              <span>Après : <strong className="text-emerald-400 font-bold">{simResult.totalAutonomyPercent}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── OPTION : CASE À COCHER RACCORDEMENT RÉSEAU ─── */}
      <div className={`rounded-3xl p-6 border transition-all duration-300 relative z-10 ${
        includeGridConnection
          ? 'bg-slate-800/90 border-blue-500/50 shadow-xl shadow-blue-950/40'
          : 'bg-slate-800/50 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <label className="flex items-start md:items-center gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeGridConnection}
              onChange={e => setIncludeGridConnection(e.target.checked)}
              className="mt-1 md:mt-0 w-5 h-5 rounded-lg text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <div>
              <span className="text-base font-black text-white flex items-center gap-2">
                Raccorder la batterie au réseau Enedis (Injection réseau & Valorisation Services Système / Capacité / Arbitrage)
                {includeGridConnection && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Option active
                  </span>
                )}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                {includeGridConnection
                  ? "Mode bi-directionnel : injection d'énergie sur les marchés, réserve de fréquence FCR/aFRR et garantie de capacité RTE."
                  : "Par défaut : installation derrière le compteur sans raccordement dédié (coût raccordement Enedis = 0 € HT)."}
              </p>
            </div>
          </label>

          {includeGridConnection && (
            <div className="flex items-center gap-3 shrink-0 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400">Distance au transfo :</span>
              <input
                type="number"
                min="5"
                max="250"
                value={customDistanceMeters}
                onChange={e => setCustomDistanceMeters(Number(e.target.value) || 25)}
                className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-center text-white outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">mètres</span>
            </div>
          )}
        </div>

        {/* Faisabilité & Alertes réseau Enedis si l'option est cochée */}
        {includeGridConnection && (
          <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-300">Statut faisabilité réseau :</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                simResult.gridFeasibility.status === 'OPTIMAL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : simResult.gridFeasibility.status === 'BLOCKED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {simResult.gridFeasibility.badge}
              </span>
              <span className="text-xs text-slate-400">
                (Domaine : <strong className="text-white">{simResult.gridFeasibility.voltageDomain === 'BT_C4' ? 'Basse Tension C4 ≤ 250 kW' : 'Haute Tension HTA 20 kV > 250 kW'}</strong> · Coût raccordement estimé : <strong className="text-orange-400">{simResult.connectionCapex.toLocaleString('fr-FR')} € HT</strong>)
              </span>
            </div>

            {simResult.gridFeasibility.warningMessage && (
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <span>{simResult.gridFeasibility.warningMessage}</span>
              </div>
            )}

            {simResult.gridFeasibility.errorMessage && (
              <div className="bg-rose-950/40 border border-rose-600/40 rounded-xl p-3 text-xs text-rose-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{simResult.gridFeasibility.errorMessage}</span>
                </div>
                {!forcedGridConnection && (
                  <button
                    onClick={() => setForcedGridConnection(true)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                  >
                    Forcer la simulation (indicatif)
                  </button>
                )}
              </div>
            )}
            {/* Détail Revenus, CAPEX et OPEX pour installation raccordée au réseau */}
            <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Colonne 1 : Revenus Réseau */}
              <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-emerald-500/30 space-y-2">
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>1. Revenus de marché</span>
                  <span className="font-black text-sm">+{simResult.gridAnnualRevenues.toLocaleString('fr-FR')} €/an</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Réserve FCR / aFRR :</span>
                    <strong className="text-white">+{(simResult.totalPowerKw * 45).toLocaleString('fr-FR')} €/an</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capacité RTE :</span>
                    <strong className="text-white">+{(simResult.totalPowerKw * 20).toLocaleString('fr-FR')} €/an</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arbitrage Spot :</span>
                    <strong className="text-white">+{(simResult.totalPowerKw * 15).toLocaleString('fr-FR')} €/an</strong>
                  </div>
                  <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                    Net commission agrégateur (15% déduits)
                  </div>
                </div>
              </div>

              {/* Colonne 2 : CAPEX */}
              <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-blue-500/30 space-y-2">
                <div className="font-bold text-blue-400 flex items-center justify-between">
                  <span>2. Investissement CAPEX</span>
                  <span className="font-black text-sm">{simResult.totalCapexHt.toLocaleString('fr-FR')} € HT</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Matériel BESS :</span>
                    <strong className="text-white">{simResult.hardwareCapex.toLocaleString('fr-FR')} €</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pose & Ingénierie :</span>
                    <strong className="text-white">{simResult.installCapex.toLocaleString('fr-FR')} €</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Raccordement Enedis :</span>
                    <strong className="text-orange-400">{simResult.connectionCapex.toLocaleString('fr-FR')} €</strong>
                  </div>
                  <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                    {simResult.gridFeasibility.voltageDomain === 'BT_C4'
                      ? 'BT C4 (Comptage + AGCP + Liaison)'
                      : 'HTA 20 kV (Quote-part S3REnR + Cellule)'}
                  </div>
                </div>
              </div>

              {/* Colonne 3 : OPEX */}
              <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-amber-500/30 space-y-2">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>3. Charges annuelles OPEX</span>
                  <span className="font-black text-sm">-{Math.round(simResult.hardwareCapex * 0.012).toLocaleString('fr-FR')} €/an</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Maintenance préventive :</span>
                    <strong className="text-white">-{Math.round(simResult.hardwareCapex * 0.012).toLocaleString('fr-FR')} €/an</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Supervision EMS :</span>
                    <strong className="text-white">Inclus contrat</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Indexation inflation :</span>
                    <strong className="text-white">+2.0 % / an</strong>
                  </div>
                  <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                    Garantie constructeur & télémétrie continue
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── LES 4 CARTES KPI FINANCIÈRES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* KPI 1 : Économies facture / an */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Économies sur facture / an</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {simResult.annualBillSavings.toLocaleString('fr-FR')} <span className="text-sm font-bold text-white">€ HT/an</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Écrêtage des pointes TURPE : <strong>{simResult.peakShavingSavingsYear.toLocaleString('fr-FR')} €</strong> + Arbitrage HP/HC : <strong>{simResult.arbitrageSavingsYear.toLocaleString('fr-FR')} €</strong>
          </p>
        </div>

        {/* KPI 2 : Revenus réseau supplémentaires / an */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Revenus réseau / an</span>
            <Activity size={16} className={includeGridConnection ? 'text-blue-400' : 'text-slate-500'} />
          </div>
          <div className={`text-3xl font-black ${includeGridConnection ? 'text-blue-400' : 'text-slate-500'}`}>
            {includeGridConnection ? `${simResult.gridAnnualRevenues.toLocaleString('fr-FR')} €` : '0 €'} <span className="text-sm font-bold text-slate-400">HT/an</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {includeGridConnection
              ? `Services système FCR, Capacité RTE & Arbitrage spot (net agrégateur)`
              : `Désactivé (Mode autonomie seule sans injection)`}
          </p>
        </div>

        {/* KPI 3 : Investissement Total HT */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-2 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Investissement Total HT</span>
              <Building size={16} className="text-orange-400" />
            </div>

            {/* Switch mode d'investissement */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[10px] font-black mb-2">
              <button
                type="button"
                onClick={() => setPricingMode('TURNKEY')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  pricingMode === 'TURNKEY'
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clé en main posé
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('HARDWARE_ONLY')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  pricingMode === 'HARDWARE_ONLY'
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Matériel seul
              </button>
            </div>

            <div className="text-3xl font-black text-white">
              {simResult.totalCapexHt.toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-400">€ HT</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {pricingMode === 'TURNKEY'
              ? `Batterie : ${simResult.hardwareCapex.toLocaleString('fr-FR')} € + Pose : ${simResult.installCapex.toLocaleString('fr-FR')} € ${includeGridConnection ? `+ Racc : ${simResult.connectionCapex.toLocaleString('fr-FR')} €` : ''}`
              : `Fourniture matériel seul : ${simResult.hardwareCapex.toLocaleString('fr-FR')} € (hors pose) ${includeGridConnection ? `+ Racc : ${simResult.connectionCapex.toLocaleString('fr-FR')} €` : ''}`
            }
          </p>
        </div>

        {/* KPI 4 : Temps de retour & Gain net 15 ans */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Temps de retour (ROI)</span>
            <ShieldCheck size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {simResult.safePayback} <span className="text-sm font-bold text-white">ans</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Gain net cumulé à 15 ans : <strong className="text-emerald-400 font-bold">{(simResult.netGain15YearsHt ?? simResult.netGain12YearsHt) >= 0 ? `+${(simResult.netGain15YearsHt ?? simResult.netGain12YearsHt).toLocaleString('fr-FR')}` : `-${Math.abs(simResult.netGain15YearsHt ?? simResult.netGain12YearsHt).toLocaleString('fr-FR')}`} € HT</strong> (TRI : {simResult.safeIrr}%)
          </p>
        </div>
      </div>

      {/* ─── 2 GRAPHIQUES INTERACTIFS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">

        {/* GRAPHIQUE 1 : PROFIL 24H AVANT VS APRÈS BATTERIE */}
        <div className="bg-slate-800/70 rounded-3xl p-5 border border-slate-700/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                Courbe de charge journalière type
              </h4>
              <p className="text-xs text-slate-400">
                Écrêtage de la pointe de {peakKw.toFixed(0)} kW vers {simResult.newPeakKw} kW et recharge en Heures Creuses
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Sans batterie
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Avec batterie
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={simResult.dailyProfileChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="safraGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="time" fontSize={10} tick={{ fill: '#94a3b8' }} interval={5} />
                <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} unit=" kW" width={45} />
                <Tooltip
                  formatter={(val, name) => [
                    `${val} kW`,
                    name === 'consoAvant' ? 'Soutirage d\'origine' : 'Soutirage avec batterie'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                />
                <ReferenceLine
                  y={simResult.newPeakKw}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: `Plafond : ${simResult.newPeakKw} kW`, position: 'insideTopRight', fill: '#10b981', fontSize: 10 }}
                />
                <Area type="monotone" dataKey="consoAvant" stroke="#64748b" strokeWidth={2} fill="transparent" strokeDasharray="4 4" name="consoAvant" />
                <Area type="monotone" dataKey="consoApres" stroke="#10b981" strokeWidth={2.5} fill="url(#safraGreenGrad)" name="consoApres" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPHIQUE 2 : TRÉSORERIE CUMULÉE SUR 15 ANS */}
        <div className="bg-slate-800/70 rounded-3xl p-5 border border-slate-700/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" />
                Projection de Trésorerie Cumulée & Amortissement
              </h4>
              <p className="text-xs text-slate-400">
                Seuil de rentabilité (0 €) atteint en {simResult.safePayback} ans
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Autonomie seule
              </span>
              {includeGridConnection && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Avec raccordement réseau
                </span>
              )}
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simResult.cumulativeCashFlowChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="yearLabel" fontSize={10} tick={{ fill: '#94a3b8' }} />
                <YAxis
                  fontSize={10}
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={v => `${Math.round(v / 1000)}k€`}
                  width={50}
                />
                <Tooltip
                  formatter={(val, name) => [
                    `${val.toLocaleString('fr-FR')} € HT`,
                    name === 'autonomieSeule' ? 'Trésorerie Autonomie Seule' : 'Trésorerie Avec Raccordement'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} label={{ value: 'Seuil 0 € (Seuil de rentabilité)', position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="autonomieSeule" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="autonomieSeule" />
                {includeGridConnection && (
                  <Line type="monotone" dataKey="avecRaccordement" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} name="avecRaccordement" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ─── CATALOGUE DÉTAILLÉ DE STOCKAGE & SÉLECTION LIBRE ─── */}
      <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-800 space-y-5 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-black text-white flex items-center gap-2">
              <Layers size={18} className="text-orange-400" />
              Catalogue Intégral Stockage BESS (Gammes UNIV LV / HV, C&I & Conteneurs)
            </h4>
            <p className="text-xs text-slate-400">
              Cliquez sur un modèle pour tester une autre configuration ou ajuster les prix catalogue distributeurs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingPrices(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Sliders size={14} className="text-orange-400" />
              Ajuster tarifs distributeurs
            </button>
          </div>
        </div>

        {/* Filtres par famille */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'Toutes les gammes' },
            { id: 'LV', label: 'Basse Tension (UNIV LV)' },
            { id: 'HV', label: 'Haute Tension (UNIV HV)' },
            { id: 'CI', label: 'Industrielle & Tertiaire C&I' },
            { id: 'CONTAINER', label: 'Conteneurs Forte Capacité' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setCatalogFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                catalogFilter === f.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grille des modèles SAFRA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredCatalog.map(item => {
            const isSelected = item.id === currentModel.id;
            const currentItemPrice = customPrices[item.id]?.price !== undefined
              ? customPrices[item.id].price
              : (item.sellingHardwarePriceHT || item.defaultPriceHt);
            const currentItemTurnkey = customPrices[item.id]?.turnkey !== undefined
              ? customPrices[item.id].turnkey
              : (item.turnkeyInstalledPriceHT || (item.defaultPriceHt + item.defaultInstallHt));
            const prixKwh = Math.round(currentItemPrice / item.capacityKwh);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedModelId(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50 ring-2 ring-blue-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.reference}
                    </span>
                    <span className="text-[10px] font-bold text-orange-400">
                      {item.familyLabel}
                    </span>
                  </div>

                  <h5 className="text-xs font-black text-white leading-tight">
                    {item.name}
                  </h5>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Capacité</span>
                      <strong className="text-white font-black">{item.capacityKwh} kWh</strong>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Puissance</span>
                      <strong className="text-emerald-400 font-black">{item.powerKw} kW</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-400 font-medium">Tarif matériel :</span>
                      <div className="text-right">
                        <strong className="text-white font-black text-sm">{currentItemPrice.toLocaleString('fr-FR')} € HT</strong>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          ({prixKwh.toLocaleString('fr-FR')} €/kWh)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/60">
                      <span className="text-slate-500 font-medium">Clé en main posé :</span>
                      <strong className="text-emerald-400/90 font-bold">{currentItemTurnkey.toLocaleString('fr-FR')} € HT</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Modèle sélectionné' : 'Sélectionner ce modèle'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MODAL : AJUSTER TARIFS DISTRIBUTEURS & MARGES ─── */}
      {isEditingPrices && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sliders size={20} className="text-orange-400" />
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Grille Tarifaire Distributeur & Marges Commerciales
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Ajustez la remise partenaire distributeur (-10% par défaut), les tarifs de vente matériel HT et les tarifs clés en main posés HT.
                </p>
              </div>
              <button
                onClick={() => setIsEditingPrices(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Confidentiality Warning & Controls */}
            <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Confidentiality Banner */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs">
                <Lock size={15} className="text-amber-400 shrink-0" />
                <span className="font-semibold">
                  Strictement confidentiel interne ENR Courtage — Le prix d'achat net et la marge brute ne figurent jamais sur le devis ou PDF client.
                </span>
              </div>

              {/* Global Controls */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 font-medium">Remise distributeur globale :</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={globalDiscountPercent}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setGlobalDiscountPercent(val);
                    }}
                    className="w-16 px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs font-bold text-emerald-400 text-right outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>

                <button
                  onClick={resetPricesToRecommended}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} />
                  Réinitialiser tarifs distributeurs
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/70">
                      <th className="py-3 px-3 rounded-l-xl">Modèle / Gamme</th>
                      <th className="py-3 px-3 text-center">Specs</th>
                      <th className="py-3 px-3 text-right">Prix Base Distributeur HT</th>
                      <th className="py-3 px-3 text-right">Remise (%)</th>
                      <th className="py-3 px-3 text-right">Achat Net ENRC HT</th>
                      <th className="py-3 px-3 text-right">Prix Vente Matériel HT</th>
                      <th className="py-3 px-3 text-center">Marge Brute Matériel</th>
                      <th className="py-3 px-3 text-right rounded-r-xl">Clé en Main Posé HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {SAFRA_CATALOG.map(item => {
                      const basePrice = customPrices[item.id]?.basePrice !== undefined
                        ? customPrices[item.id].basePrice
                        : (item.distributorBasePriceHT || item.defaultPriceHt);
                      const itemDiscount = customPrices[item.id]?.discount !== undefined
                        ? customPrices[item.id].discount
                        : globalDiscountPercent;
                      const netBuyPrice = Math.round(basePrice * (1 - itemDiscount / 100));
                      const sellingPrice = customPrices[item.id]?.price !== undefined
                        ? customPrices[item.id].price
                        : (item.sellingHardwarePriceHT || item.defaultPriceHt);
                      const margin = sellingPrice - netBuyPrice;
                      const marginPercent = sellingPrice > 0 ? Math.round((margin / sellingPrice) * 100) : 0;
                      const turnkeyPrice = customPrices[item.id]?.turnkey !== undefined
                        ? customPrices[item.id].turnkey
                        : (item.turnkeyInstalledPriceHT || (item.defaultPriceHt + item.defaultInstallHt));

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-sans font-black text-white">{item.reference}</div>
                            <div className="font-sans text-[11px] text-slate-400">{item.name}</div>
                            <span className="font-sans inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-orange-400 font-bold mt-0.5">
                              {item.familyLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            <div className="text-white font-bold">{item.capacityKwh} kWh</div>
                            <div className="text-emerald-400 text-[11px] font-semibold">{item.powerKw} kW</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={basePrice}
                              onChange={e => handlePriceChange(item.id, 'basePrice', e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-bold text-white text-right outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                value={itemDiscount}
                                onChange={e => handlePriceChange(item.id, 'discount', e.target.value)}
                                className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-bold text-emerald-400 text-right outline-none focus:border-blue-500"
                              />
                              <span className="text-slate-400 text-xs">%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-slate-300">
                              {netBuyPrice.toLocaleString('fr-FR')} €
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={sellingPrice}
                              onChange={e => handlePriceChange(item.id, 'price', e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-950 border border-blue-500/50 rounded text-xs font-black text-blue-300 text-right outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className={`font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {margin >= 0 ? `+${margin.toLocaleString('fr-FR')} €` : `${margin.toLocaleString('fr-FR')} €`}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                              marginPercent >= 20 ? 'bg-emerald-950/60 text-emerald-300' : 'bg-amber-950/60 text-amber-300'
                            }`}>
                              {marginPercent} %
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={turnkeyPrice}
                              onChange={e => handlePriceChange(item.id, 'turnkey', e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-950 border border-emerald-500/50 rounded text-xs font-black text-emerald-300 text-right outline-none focus:border-emerald-400"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Les modifications sont sauvegardées automatiquement dans votre espace de travail.
              </span>
              <button
                onClick={() => setIsEditingPrices(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition-colors"
              >
                Fermer et Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
