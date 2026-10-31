import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Zap, Clock, ShieldCheck, 
  Landmark, Info, Sparkles, Wind, Coins, CheckCircle2, AlertCircle, FileDown, CheckSquare, Square, Loader2,
  BatteryCharging, Layers, Settings2, ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, getRegionForDepartment } from '@/data/sechoirBatitechModels.js';
import { calculateFullSimulation } from '@/components/simulator/sechoir/sechoirCalculations.js';

const BATTERY_CATALOG_SECHOIR = [
  {
    id: 'ST31K',
    name: 'Système UNIV ST31K',
    capacityKwh: 31,
    powerKw: 15,
    hardwarePrice: 17500,
    installPrice: 3500,
    description: 'Armoire compacte C&I LiFePO4 haute tension (31 kWh / 15 kW)',
    savingsDerriereCompteur: 3400,
    gridRevenueKwYear: 80, // 80 €/kW/an = 1 200 €/an
    savingsWithGrid: 2100,
  },
  {
    id: 'ST46K',
    name: 'Système UNIV ST46K',
    capacityKwh: 46,
    powerKw: 20,
    hardwarePrice: 24000,
    installPrice: 4500,
    description: 'Armoire C&I LiFePO4 haute tension (46 kWh / 20 kW)',
    savingsDerriereCompteur: 4800,
    gridRevenueKwYear: 80, // 1 600 €/an
    savingsWithGrid: 3000,
  },
  {
    id: 'ST62K',
    name: 'Système UNIV ST62K',
    capacityKwh: 62,
    powerKw: 30,
    hardwarePrice: 31500,
    installPrice: 5500,
    description: 'Armoire C&I LiFePO4 haute tension (62 kWh / 30 kW)',
    savingsDerriereCompteur: 6200,
    gridRevenueKwYear: 80, // 2 400 €/an
    savingsWithGrid: 4000,
  },
  {
    id: 'UNIV_ESS_261_AC',
    name: 'Armoire Industrielle UNIV ESS 261 AC',
    capacityKwh: 261,
    powerKw: 125,
    hardwarePrice: 64900,
    installPrice: 13600,
    description: 'Armoire extérieure étanche IP55 (261 kWh / 125 kW) refroidissement liquide',
    savingsDerriereCompteur: 16500,
    gridRevenueKwYear: 80, // 10 000 €/an
    savingsWithGrid: 10500,
  },
];

export default function Step5Results({ onExportPDF }) {
  const selectedModelId = useSechoirStore((state) => state.selectedModelId) || 'BT-3.1.15';
  const orientation = useSechoirStore((state) => state.orientation) || 'sud';
  const departement = useSechoirStore((state) => state.departement) || '33';
  const materials = useSechoirStore((state) => state.materials);
  const financialParams = useSechoirStore((state) => state.financialParams);
  const setLastResults = useSechoirStore((state) => state.setLastResults);
  const storeClientName = useSechoirStore((state) => state.clientName);
  const setClientNameInStore = useSechoirStore((state) => state.setClientName);

  // Stockage Batterie BESS dans le Store
  const hasBattery = useSechoirStore((state) => state.hasBattery) || false;
  const setHasBattery = useSechoirStore((state) => state.setHasBattery);
  const batteryModelIdFromStore = useSechoirStore((state) => state.batteryModelId);
  const batteryUnitsFromStore = useSechoirStore((state) => state.batteryUnits);
  const batteryGridModeFromStore = useSechoirStore((state) => state.batteryGridMode);
  const batteryCapexOverride = useSechoirStore((state) => state.batteryCapexOverride);
  const setBatteryConfig = useSechoirStore((state) => state.setBatteryConfig);

  const [clientName, setClientName] = useState(storeClientName || '');
  const [includeCashFlowPage, setIncludeCashFlowPage] = useState(true);
  const [includeAutoconsoPage, setIncludeAutoconsoPage] = useState(true);
  const [includeBenefitsPage, setIncludeBenefitsPage] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Déduction automatique du modèle de batterie selon le modèle Séchoir
  const defaultBatteryModelId = useMemo(() => {
    const m = String(selectedModelId).toLowerCase();
    if (m.includes('8.3') || m.includes('8_3') || m.includes('8-3')) {
      return 'UNIV_ESS_261_AC';
    } else if (m.includes('6.2') || m.includes('6_2') || m.includes('6-2')) {
      return 'ST62K';
    } else {
      return 'ST31K';
    }
  }, [selectedModelId]);

  const batteryModelId = batteryModelIdFromStore || defaultBatteryModelId;
  const batteryUnits = batteryUnitsFromStore || 1;
  const batteryGridMode = batteryGridModeFromStore || 'derriere_compteur';

  // Recalculer les résultats complets du séchoir
  const results = useMemo(() => {
    return calculateFullSimulation({
      model: selectedModelId,
      orientation,
      departement,
      materials,
      financialParams,
    });
  }, [selectedModelId, orientation, departement, materials, financialParams]);

  useEffect(() => {
    if (results) {
      setLastResults(results);
    }
  }, [results, setLastResults]);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

  const {
    model = BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'],
    cee = { primeTotal: 0 },
    productionPV = 0,
    produits = { deltaProduits: 0 },
    charges = { deltaCharges: 0, detail: {} },
    deltaEBE = 0,
    financing = { investissementNet: 0, subventionsTotal: 0, emprunt: 0 },
    subventionsEligibles = {},
    roiBonifie = null,
    annuite = 0,
    gainNetAnnuel = 0,
    treasury = { cashFlows: [] },
    roi = 0,
    van = 0,
    triPercent = '0.00',
  } = results || {};

  const activeModel = model || BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'];
  const puissanceKwcVal = activeModel?.puissanceKwc ? Number(activeModel.puissanceKwc) : 30.15;
  const regionName = getRegionForDepartment(departement);

  // Batterie active et calculs de rentabilité consolidés
  const activeBattery = useMemo(() => {
    return BATTERY_CATALOG_SECHOIR.find(b => b.id === batteryModelId) || BATTERY_CATALOG_SECHOIR[0];
  }, [batteryModelId]);

  const batteryCapex = useMemo(() => {
    if (batteryCapexOverride !== null && Number(batteryCapexOverride) > 0) {
      return Number(batteryCapexOverride);
    }
    const base = (activeBattery.hardwarePrice + activeBattery.installPrice) * batteryUnits;
    const raccordement = batteryGridMode === 'raccorde_reseau' ? 8500 : 0;
    return base + raccordement;
  }, [activeBattery, batteryUnits, batteryGridMode, batteryCapexOverride]);

  const batteryAnnualGains = useMemo(() => {
    if (batteryGridMode === 'raccorde_reseau') {
      const gridRevenues = activeBattery.powerKw * batteryUnits * activeBattery.gridRevenueKwYear;
      const energySavings = activeBattery.savingsWithGrid * batteryUnits;
      return {
        gridRevenues,
        energySavings,
        totalGains: gridRevenues + energySavings,
      };
    } else {
      return {
        gridRevenues: 0,
        energySavings: activeBattery.savingsDerriereCompteur * batteryUnits,
        totalGains: activeBattery.savingsDerriereCompteur * batteryUnits,
      };
    }
  }, [activeBattery, batteryUnits, batteryGridMode]);

  // Données consolidées Séchoir + BESS
  const consolidated = useMemo(() => {
    const baseNetInvest = financing.investissementNet || 0;
    const baseDeltaEBE = deltaEBE || 0;
    const baseAnnuite = annuite || 0;
    const baseGainNet = gainNetAnnuel || 0;

    if (!hasBattery) {
      return {
        totalCapex: baseNetInvest,
        annualGains: baseDeltaEBE,
        annuite: baseAnnuite,
        gainNetAnnuel: baseGainNet,
        roi: roi || 10.0,
      };
    }

    const totalCapex = baseNetInvest + batteryCapex;
    const totalGains = baseDeltaEBE + batteryAnnualGains.totalGains;
    const t = (financialParams?.tauxEmprunt || 0.034);
    const n = Math.min(financialParams?.dureeEmprunt || 20, 15);
    const batteryAnnuite = t > 0 ? (batteryCapex * t) / (1 - Math.pow(1 + t, -n)) : batteryCapex / n;
    const totalAnnuite = baseAnnuite + batteryAnnuite;
    const gainNetAnnuelConsolide = totalGains - totalAnnuite;
    const roiConsolide = totalGains > 0 ? totalCapex / totalGains : 12;

    return {
      totalCapex,
      totalGains,
      batteryCapex,
      batteryAnnuite,
      totalAnnuite,
      gainNetAnnuel: gainNetAnnuelConsolide,
      roi: Number(roiConsolide.toFixed(1)),
    };
  }, [hasBattery, financing.investissementNet, deltaEBE, annuite, gainNetAnnuel, roi, batteryCapex, batteryAnnualGains, financialParams]);

  // Données de courbe 24h : Séchoir Seul vs Séchoir + Stockage BESS
  const sechoir24hData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const basePwr = puissanceKwcVal * 0.45;
    const battPwr = (activeBattery?.powerKw || 15) * batteryUnits;

    return hours.map(h => {
      let solaire = 0;
      if (h >= 7 && h <= 19) {
        solaire = Math.round(puissanceKwcVal * 0.85 * Math.sin(((h - 7) / 12) * Math.PI) * 10) / 10;
      }
      const consoSechoir = Math.round((basePwr * (0.8 + 0.4 * Math.sin(((h - 8) / 16) * Math.PI))) * 10) / 10;
      const surplus = Math.max(0, solaire - consoSechoir);
      const chargeBatt = Math.min(surplus, battPwr);
      const deficit = Math.max(0, consoSechoir - solaire);
      const dechargeBatt = (h < 7 || h > 19) ? Math.min(deficit, battPwr * 0.7) : 0;
      const reseauSansBatt = Math.max(0, consoSechoir - solaire);
      const reseauAvecBatt = Math.max(0, reseauSansBatt - dechargeBatt);

      return {
        heure: `${String(h).padStart(2, '0')}h`,
        consoSechoir,
        solaire,
        reseauSansBatt,
        reseauAvecBatt,
        chargeBatt,
        dechargeBatt,
      };
    });
  }, [puissanceKwcVal, activeBattery, batteryUnits]);

  const chartData = useMemo(() => {
    return (treasury.cashFlows || []).map((cf) => ({
      annee: cf.annee,
      fluxNet: cf.fluxNet,
      cumul: cf.cumul,
    }));
  }, [treasury.cashFlows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="text-amber-500 w-9 h-9" />
            Bilan Financier &amp; Modèle Économique
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-1">
            Étude de rentabilité : <strong className="text-white">{activeModel?.name || 'BatiTech 3.1.15'}</strong> ({puissanceKwcVal.toFixed(2)} kWc — {activeModel?.nbModules || 90} panneaux Cogen'Air® — {activeModel?.dimensions || '18m × 20m'}) • Région <strong className="text-amber-400">{regionName}</strong>
          </p>
        </div>
      </div>

      {/* 4 Cartes KPIs Clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Production Solaire */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
            <Zap className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Production Solaire</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{fmt(productionPV)} <span className="text-sm font-normal text-slate-400">kWh/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Gisement zone {departement} • {orientation}</span>
        </div>

        {/* Valorisation Matière */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-emerald-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Valorisation Matière</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">+{fmt(produits?.deltaProduits)} <span className="text-sm font-normal text-slate-400">€/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Gains séchage + économies énergie</span>
        </div>

        {/* Charges d'Exploitation & Ventilation */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-rose-400 mb-2">
            <Wind className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Charges &amp; Ventilation</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-400">-{fmt(charges?.deltaCharges)} <span className="text-sm font-normal text-slate-400">€/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Ventilation ({fmt(charges?.detail?.ventilation || 0)} €) + Entretien</span>
        </div>

        {/* Impact EBE */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-blue-400 mb-2">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Impact sur l'EBE</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-400">+{fmt(deltaEBE)} <span className="text-sm font-normal text-slate-400">€/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Surplus brut d'exploitation</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION INTERACTIVE : COUPLAGE STOCKAGE BATTERIE BESS (VOLET 2)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 rounded-3xl border-2 border-indigo-500/40 p-6 shadow-xl relative overflow-hidden">
        
        {/* En-tête avec Switch activation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-indigo-900/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <BatteryCharging className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">
                  Couplage Stockage Batterie BESS
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Autonomie Séchage &amp; Flexibilité
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Alimentation de la ventilation nocturne/nuageuse par surplus solaire diurne &amp; valorisation réseau Enedis.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer self-start md:self-center bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all">
            <input
              type="checkbox"
              checked={hasBattery}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasBattery(checked);
                setBatteryConfig({ hasBattery: checked });
              }}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
            />
            <span className="text-sm font-black text-white">
              {hasBattery ? 'Batterie Activée' : 'Activer le Couplage Batterie'}
            </span>
          </label>
        </div>

        {hasBattery && (
          <div className="mt-5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            
            {/* Grille de Paramétrage BESS : Modèle, Quantité & Mode d'Exploitation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Choix du modèle BESS */}
              <div className="lg:col-span-5 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Modèle de Batterie BESS
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Auto-adapté à {activeModel?.name}
                  </span>
                </div>

                <div className="space-y-2">
                  {BATTERY_CATALOG_SECHOIR.map((batt) => {
                    const isSelected = batt.id === batteryModelId;
                    const isRecommended = batt.id === defaultBatteryModelId;
                    return (
                      <button
                        key={batt.id}
                        type="button"
                        onClick={() => {
                          setBatteryConfig({ batteryModelId: batt.id });
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-400 text-white shadow-md'
                            : 'bg-slate-800/40 border-slate-700/70 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{batt.name}</span>
                            {isRecommended && (
                              <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                                Recommandé
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {batt.capacityKwh} kWh &bull; {batt.powerKw} kW &bull; {fmt(batt.hardwarePrice + batt.installPrice)} € HT clé en main
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Sélecteur de quantité */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-300 font-bold">Nombre d'unités :</span>
                  <div className="flex items-center gap-2">
                    {[1, 2].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setBatteryConfig({ batteryUnits: u })}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          batteryUnits === u
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {u}× ({activeBattery.capacityKwh * u} kWh)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mode d'exploitation : Derrière compteur vs Réseau Enedis */}
              <div className="lg:col-span-7 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4" />
                  Mode d'Exploitation du Stockage BESS
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1 : Derrière Compteur */}
                  <button
                    type="button"
                    onClick={() => setBatteryConfig({ batteryGridMode: 'derriere_compteur' })}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      batteryGridMode === 'derriere_compteur'
                        ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-md'
                        : 'bg-slate-800/40 border-slate-700/70 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-white">Mode 1 — Derrière le Compteur</strong>
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          0 € raccordement
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Stockage du surplus solaire de jour pour alimenter la ventilation &amp; le séchage la nuit. Effacement des pointes de puissance du séchoir.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-emerald-400 font-bold">
                      Économie estimée : +{fmt(batteryAnnualGains.energySavings)} €/an
                    </div>
                  </button>

                  {/* Mode 2 : Raccordé Réseau Enedis */}
                  <button
                    type="button"
                    onClick={() => setBatteryConfig({ batteryGridMode: 'raccorde_reseau' })}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      batteryGridMode === 'raccorde_reseau'
                        ? 'bg-amber-950/60 border-amber-400 text-white shadow-md'
                        : 'bg-slate-800/40 border-slate-700/70 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-white">Mode 2 — Raccordé Réseau Enedis</strong>
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                          BT C4 (+8 500 €)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Valorisation flexibilité &amp; réserve rapide (FCR / capacité) en dehors de la saison de séchage (80 €/kW/an sur puissance disponible).
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-amber-400 font-bold">
                      Revenus Enedis ({fmt(batteryAnnualGains.gridRevenues)} €) + Éco ({fmt(batteryAnnualGains.energySavings)} €) : +{fmt(batteryAnnualGains.totalGains)} €/an
                    </div>
                  </button>
                </div>

                {/* Synthèse Investissement BESS */}
                <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300">
                    <span className="font-bold text-white">{activeBattery.name}</span> ({activeBattery.capacityKwh * batteryUnits} kWh / {activeBattery.powerKw * batteryUnits} kW) &bull; CAPEX BESS : <strong className="text-amber-400">{fmt(batteryCapex)} € HT</strong> (matériel + pose{batteryGridMode === 'raccorde_reseau' ? ' + raccordement Enedis' : ''})
                  </div>
                  <div className="text-emerald-400 font-black text-sm">
                    Gains annuels BESS : +{fmt(batteryAnnualGains.totalGains)} €/an
                  </div>
                </div>

              </div>
            </div>

            {/* Comparatif Visuel & Consolidé (Séchoir Seul vs Séchoir + BESS) */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Bilan Consolidé : Séchoir BatiTech® + Stockage BESS
                </span>
                <span className="text-xs text-emerald-400 font-bold">
                  Autonomie électrique du séchage portée à ~75-85%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase block font-semibold">CAPEX Consolidé</span>
                  <span className="text-lg font-black text-white">{fmt(consolidated.totalCapex)} € HT</span>
                  <span className="text-[10px] text-slate-500 block">dont {fmt(batteryCapex)} € BESS</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase block font-semibold">Gains Annuels Globaux</span>
                  <span className="text-lg font-black text-emerald-400">+{fmt(consolidated.totalGains)} €/an</span>
                  <span className="text-[10px] text-slate-500 block">Séchage + Élec + Enedis</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase block font-semibold">Gain Net Annuel</span>
                  <span className="text-lg font-black text-amber-400">+{fmt(consolidated.gainNetAnnuel)} €/an</span>
                  <span className="text-[10px] text-slate-500 block">Après annuités d'emprunt</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase block font-semibold">Nouveau Temps Retour</span>
                  <span className="text-lg font-black text-blue-400">~{consolidated.roi} ans</span>
                  <span className="text-[10px] text-slate-500 block">Projet combiné optimisé</span>
                </div>
              </div>
            </div>

            {/* Graphique 24h du lissage de charge du séchoir par la batterie */}
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Profil de Charge Journalier Type : Séchoir + Stockage BESS (24 heures)
                  </h4>
                  <p className="text-xs text-slate-400">
                    La batterie absorbe le surplus solaire en journée (cloche jaune) pour alimenter la ventilation la nuit (courbe verte abaissée).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Solaire Cogen'Air
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span> Séchoir seul
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> Réseau avec Batterie
                  </span>
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sechoir24hData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="heure" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} kW`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', fontSize: '12px' }}
                      formatter={(v, name) => {
                        const label = name === 'solaire' ? 'Production Solaire' : name === 'consoSechoir' ? 'Conso Séchoir seul' : 'Soutirage Réseau (BESS)';
                        return [`${v} kW`, label];
                      }}
                    />
                    <Line type="monotone" dataKey="solaire" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="solaire" />
                    <Line type="monotone" dataKey="consoSechoir" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} name="consoSechoir" />
                    <Line type="monotone" dataKey="reseauAvecBatt" stroke="#10b981" strokeWidth={2.5} dot={false} name="reseauAvecBatt" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Bloc Central : 2 Colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Colonne Gauche : Modèle Économique Contractuel (Investissement Initial & Flux de Trésorerie) */}
        <div className="space-y-4">
          
          {/* Cadre 1 : Investissement Initial & Plan de Financement */}
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 shadow-md">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                1. Investissement Initial &amp; Financement
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Garanti &amp; Contractuel
              </span>
            </h3>
            
            <div className="space-y-2.5 text-base">
              <div className="flex justify-between text-slate-300">
                <span>Investissement Brut Séchoir :</span>
                <span className="font-bold text-white">{fmt(model.investissementBrut)} € HT</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Prime CEE Cogen'Air® (Fiche AGRI-EQ-110) :</span>
                <span className="font-bold">-{fmt(cee?.primeTotal)} €</span>
              </div>
              
              <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-lg">
                <span className="text-white">Investissement Net Séchoir :</span>
                <span className="text-amber-400 font-black">{fmt(financing?.investissementNet)} € HT</span>
              </div>

              {hasBattery && (
                <div className="p-2.5 bg-indigo-950/60 rounded-xl border border-indigo-800/80 flex justify-between items-center text-sm">
                  <span className="text-indigo-200 font-bold flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4 text-indigo-400" />
                    Pack Stockage BESS ({activeBattery.name} &bull; {activeBattery.capacityKwh * batteryUnits} kWh) :
                  </span>
                  <span className="font-black text-indigo-300">+{fmt(batteryCapex)} € HT</span>
                </div>
              )}

              {hasBattery && (
                <div className="pt-2 border-t border-indigo-700/60 flex justify-between font-bold text-lg text-emerald-400">
                  <span>Total Investissement Consolidé :</span>
                  <span className="font-black">{fmt(consolidated.totalCapex)} € HT</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-slate-700 flex justify-between text-slate-300 text-sm">
                <span>Montant financé par Emprunt :</span>
                <span className="font-bold text-white">{fmt(hasBattery ? consolidated.totalCapex : financing?.emprunt)} €</span>
              </div>
              <div className="flex justify-between text-red-400 text-sm">
                <span>Annuité constante ({financialParams?.dureeEmprunt || 25} ans @ {((financialParams?.tauxEmprunt || 0.034) * 100).toFixed(2)}%) :</span>
                <span className="font-bold">-{fmt(hasBattery ? consolidated.totalAnnuite : annuite)} €/an</span>
              </div>
            </div>
          </div>

          {/* Cadre 2 : Flux de Trésorerie Annuels */}
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 shadow-md">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              2. Flux de Trésorerie Annuels d'Exploitation
            </h3>

            <div className="space-y-2.5 text-base">
              <div className="flex justify-between text-slate-300">
                <span>Valorisation Matière (Delta Produits) :</span>
                <span className="font-bold text-emerald-400">+{fmt(produits?.deltaProduits)} €/an</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Charges d'exploitation &amp; ventilation :</span>
                <span className="font-bold text-rose-400">-{fmt(charges?.deltaCharges)} €/an</span>
              </div>

              {hasBattery && (
                <div className="flex justify-between text-indigo-300 text-sm bg-indigo-950/40 p-2 rounded-xl border border-indigo-900/50">
                  <span>Économies &amp; Gains Réseau BESS :</span>
                  <span className="font-bold text-indigo-300">+{fmt(batteryAnnualGains.totalGains)} €/an</span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span>Annuité d'emprunt :</span>
                <span className="font-bold text-red-400">-{fmt(hasBattery ? consolidated.totalAnnuite : annuite)} €/an</span>
              </div>

              <div className="pt-3 mt-1 border-t border-slate-700 flex justify-between items-center bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 shadow-inner">
                <div>
                  <span className="font-bold text-white text-sm uppercase block">
                    {hasBattery ? 'Gain Net Annuel Consolidé' : "Gain Net Annuel d'Exploitation"}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Après remboursement intégral de l'annuité</span>
                </div>
                <span className="text-3xl font-black text-amber-400">
                  +{fmt(hasBattery ? consolidated.gainNetAnnuel : gainNetAnnuel)} €/an
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Colonne Droite : Subventions Régionales & ADEME (Affichage Informatif) */}
        <div className="bg-gradient-to-br from-slate-800/95 via-slate-855 to-slate-900 rounded-3xl border-2 border-amber-500/40 p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          
          {/* Badge Informatif en haut */}
          <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[11px] px-3.5 py-1 rounded-bl-2xl uppercase tracking-wider shadow-md">
            À titre indicatif
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-3 text-amber-400">
              <Landmark className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-lg font-black text-white">
                  Subventions Régionales &amp; Aides Éligibles
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Région identifiée : <span className="text-amber-300 font-bold">{subventionsEligibles.region || regionName}</span>
                </p>
              </div>
            </div>

            {/* Dispositif Régional Principal */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 space-y-3 mt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs uppercase font-bold text-amber-400 block tracking-wider">Dispositif Territorial</span>
                  <h4 className="text-base font-black text-white">
                    {subventionsEligibles.subventionRegionale?.nom || 'Dispositif Régional (PCAE / FEADER)'}
                  </h4>
                </div>
                {subventionsEligibles.montantEstime > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 font-black text-xs px-2.5 py-1 rounded-xl border border-emerald-500/40 shrink-0">
                    Jusqu'à {fmt(subventionsEligibles.montantEstime)} €
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {subventionsEligibles.description}
              </p>

              {/* Détails du calcul indicatif */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-xl">
                  <span className="text-slate-400 block">Assiette éligible (Brut - CEE)</span>
                  <strong className="text-white font-bold text-sm">{fmt(subventionsEligibles.assietteEligible)} € HT</strong>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl">
                  <span className="text-slate-400 block">Taux d'aide indicatif</span>
                  <strong className="text-amber-300 font-bold text-sm">{subventionsEligibles.tauxTexte}</strong>
                </div>
              </div>

              {subventionsEligibles.subventionRegionale?.montantMax && (
                <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                  <span>Plafond maximum de subvention :</span>
                  <strong className="text-slate-200">{fmt(subventionsEligibles.subventionRegionale.montantMax)} €</strong>
                </div>
              )}
            </div>

            {/* Dispositif National ADEME */}
            <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/90 mt-3 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block font-bold">Fonds Chaleur ADEME (National)</strong>
                <span className="text-slate-300">
                  Éligible pour la valorisation de la chaleur solaire thermovoltaïque Cogen'Air®. Montant variable calculé post-étude thermique.
                </span>
              </div>
            </div>

            {/* Impact sur le ROI si subvention obtenue */}
            {roiBonifie !== null && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 mt-3 flex items-center justify-between text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-200 font-medium">
                    ROI bonifié en cas d'obtention de l'aide :
                  </span>
                </div>
                <strong className="text-emerald-300 text-sm font-black">
                  ~{Number(roiBonifie).toFixed(1)} ans <span className="text-slate-400 font-normal text-xs">(vs {Number(roi).toFixed(1)} ans)</span>
                </strong>
              </div>
            )}
          </div>

          {/* Note d'explication transparente */}
          <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Les subventions régionales (PCAE, FEADER, Plan Ambition Éleveurs) et nationales (ADEME) sont soumises à instruction de dossier et aux appels à projets en cours. Pour préserver un calcul de rentabilité prudent et réaliste, <strong>elles ne sont pas déduites de l'emprunt de base</strong>.
            </p>
          </div>

        </div>

      </div>

      {/* Graphique de Trésorerie Cumulée sur 25 ans */}
      <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-400" />
              Évolution de la Trésorerie Cumulée (25 ans)
            </h3>
            <p className="text-sm text-slate-400">
              {hasBattery ? 'Plan consolidé Séchoir BatiTech® + Stockage BESS' : 'Basé sur le plan contractuel (Investissement Net = Brut - Prime CEE)'}
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
            Inflation produits calculée à 2%/an
          </span>
        </div>
        
        <div className="h-72 sm:h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="annee" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 13 }}
                tickFormatter={(val) => `${fmt(val / 1000)} k€`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '0.75rem', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}
                itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}
                formatter={(value) => [`${fmt(value)} €`, 'Trésorerie Cumulée']}
                labelFormatter={(label) => `Année ${label}`}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
              <Bar dataKey="cumul" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.cumul >= 0 ? '#10b981' : '#f43f5e'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3 Cartes Indicateurs Clés */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-700">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">Temps de Retour</span>
            <span className="text-lg font-black text-amber-400">
              ~{hasBattery ? consolidated.roi : Number(roi).toFixed(1)} ans
            </span>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">VAN à 25 ans</span>
            <span className="text-lg font-black text-emerald-400">+{fmt(van)} €</span>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">TRI Projet</span>
            <span className="text-lg font-black text-blue-400">{triPercent}%</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPORT PDF COMMERCIAL PROFESSIONNEL (DOSSIER CLIENT & BANCAIRE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl border-2 border-amber-500/50 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Informations Client & Options PDF */}
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex items-center gap-2">
                <FileDown className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-black text-white">
                  Dossier Commercial &amp; d'Ingénierie Séchoir BatiTech®
                </h3>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Génération haute définition du dossier PDF (A4 Paysage) intégrant le modèle de rentabilité, l'étude thermovoltaïque et le couplage BESS.
              </p>
            </div>

            {/* Champ Nom du Client / Exploitation */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider shrink-0">
                Nom du Client / Exploitation :
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setClientNameInStore(e.target.value);
                }}
                placeholder="ex: EARL DES TERRES VIEILLES / M. LATOURNERIE Franck"
                className="flex-1 bg-slate-950/80 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 font-medium"
              />
            </div>

            {/* Sélecteur des Pages Incluses dans le PDF */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              {/* Option Page 2 : Tableau d'Amortissement */}
              <button
                type="button"
                onClick={() => setIncludeCashFlowPage(!includeCashFlowPage)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  includeCashFlowPage
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {includeCashFlowPage ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Page 2</div>
                  <div className="text-sm font-semibold text-white mt-0.5">Tableau d'Amortissement sur 25 ans</div>
                  <div className="text-xs text-slate-400 mt-1">Détail annuel des flux d'exploitation, annuités et trésorerie cumulée.</div>
                </div>
              </button>

              {/* Option Page 3 : Simulation d'Autoconsommation */}
              <button
                type="button"
                onClick={() => setIncludeAutoconsoPage(!includeAutoconsoPage)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  includeAutoconsoPage
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {includeAutoconsoPage ? (
                    <CheckSquare className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Page 3</div>
                  <div className="text-sm font-semibold text-white mt-0.5">Simulation d'Autoconsommation</div>
                  <div className="text-xs text-slate-400 mt-1">Matrices d'économies selon la consommation (avec et sans stockage batterie).</div>
                </div>
              </button>

              {/* Option Page 6 : Synthèse Bénéfices */}
              <button
                type="button"
                onClick={() => setIncludeBenefitsPage(!includeBenefitsPage)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  includeBenefitsPage
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {includeBenefitsPage ? (
                    <CheckSquare className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Page 6 (Recommandée)</div>
                  <div className="text-sm font-semibold text-white mt-0.5">Synthèse des Bénéfices d'Exploitation</div>
                  <div className="text-xs text-slate-400 mt-1">Avantages financiers &amp; opérationnels, graphique d'impact sur la baisse des charges.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Bouton de téléchargement */}
          <div className="self-stretch sm:self-auto flex flex-col items-center justify-center shrink-0">
            <button
              onClick={async () => {
                if (onExportPDF) {
                  setIsExporting(true);
                  try {
                    await onExportPDF({ 
                      includeCashFlowPage,
                      includeAutoconsoPage,
                      includeBenefitsPage,
                      customClientName: clientName,
                      hasBattery,
                      batteryModelId,
                      batteryUnits,
                      batteryGridMode,
                      batteryCapex,
                    });
                  } finally {
                    setIsExporting(false);
                  }
                }
              }}
              disabled={isExporting}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 text-base cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Génération du PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 text-slate-950" />
                  <span>Télécharger l'Étude PDF</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">
              Dossier A4 Paysage complet &bull; multi-pages {hasBattery ? '(Pack BESS Inclus)' : ''}
            </span>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
