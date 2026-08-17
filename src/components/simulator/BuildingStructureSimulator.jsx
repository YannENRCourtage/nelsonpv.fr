import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Sliders, Sun, Euro, TrendingUp,
  Save, FileDown, Box, CheckCircle2, ShieldCheck, Ruler
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useSimulatorSettingsStore } from '@/stores/useSimulatorSettingsStore';
import Building3DViewer from '@/components/developpement/Building3DViewer';

export default function BuildingStructureSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF
}) {
  const { settings } = useSimulatorSettingsStore();
  const structSettings = settings.structure;

  // Dimensions du bâtiment
  const [length, setLength] = useState(30); // 30m
  const [width, setWidth] = useState(20);   // 20m
  const [eaveHeight, setEaveHeight] = useState(4); // 4m
  const [roofPitch, setRoofPitch] = useState(15);  // 15°
  const [buildingType, setBuildingType] = useState('asymetrique_1');
  const [hasAuvent, setHasAuvent] = useState(false);

  // Surface au sol & toiture
  const floorArea = useMemo(() => length * width, [length, width]);
  const roofSlopeFactor = 1 / Math.cos((roofPitch * Math.PI) / 180);
  const roofArea = useMemo(() => Math.round(floorArea * roofSlopeFactor), [floorArea, roofSlopeFactor]);

  // Puissance installable : environ 200 Wc / m² de toiture
  const installedKwc = useMemo(() => {
    return Math.round((roofArea * 0.20) / 5) * 5;
  }, [roofArea]);

  // Production annuelle estimée (1250 kWh/kWc)
  const annualProductionKwh = useMemo(() => {
    return Math.round(installedKwc * 1250);
  }, [installedKwc]);

  // Coûts d'investissement
  const charpenteCost = useMemo(() => Math.round(floorArea * (structSettings.charpenteCostM2 || 75)), [floorArea, structSettings]);
  const couvertureCost = useMemo(() => Math.round(roofArea * (structSettings.couvertureBacAcierM2 || 28)), [roofArea, structSettings]);
  const fondationsCost = useMemo(() => Math.round(floorArea * (structSettings.fondationsCostM2 || 25)), [floorArea, structSettings]);
  const pvCost = useMemo(() => Math.round(installedKwc * 1000 * (structSettings.pvIntegrationPerWc || 0.55)), [installedKwc, structSettings]);
  const raccordementCost = structSettings.raccordementStandard || 15000;
  const devCost = structSettings.fraisDeveloppement || 5000;

  const totalBuildingCost = charpenteCost + couvertureCost + fondationsCost;
  const totalPvCost = pvCost + raccordementCost + devCost;
  const totalProjectInvestment = totalBuildingCost + totalPvCost;

  // Revenus annuels (EDF OA ~0.114 €/kWh)
  const annualRevenue = useMemo(() => Math.round(annualProductionKwh * 0.114), [annualProductionKwh]);
  const annualNetCashflow = useMemo(() => Math.round(annualRevenue - (installedKwc * 22)), [annualRevenue, installedKwc]); // TURPE + maintenance

  // Modèle Tiers-Investisseur : Soulte versée ou Reste à charge
  const soulteInvestisseur = useMemo(() => Math.round(installedKwc * 180), [installedKwc]);
  const resteAChargeAgriculteur = Math.max(0, totalBuildingCost - soulteInvestisseur);

  // Projection sur 20 ans
  const chartData = useMemo(() => {
    const data = [];
    let cumul = -totalProjectInvestment;
    for (let yr = 1; yr <= 20; yr++) {
      cumul += annualNetCashflow;
      data.push({
        year: `An ${yr}`,
        cumul: Math.round(cumul),
        isPositive: cumul >= 0
      });
    }
    return data;
  }, [totalProjectInvestment, annualNetCashflow]);

  const handleSaveToArchives = () => {
    const simData = {
      type: 'structure_metallique',
      title: `Hangar Solaire ${length}m × ${width}m (${installedKwc} kWc)`,
      length,
      width,
      eaveHeight,
      roofPitch,
      floorArea,
      roofArea,
      kwc: installedKwc,
      annualProductionKwh,
      totalBuildingCost,
      totalProjectInvestment,
      soulteInvestisseur,
      resteAChargeAgriculteur,
      annualRevenue,
      annualNetCashflow,
      createdAt: new Date().toISOString(),
      projectId: selectedProject?.id || null
    };

    if (onSaveSimulation) onSaveSimulation(simData);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div>
            <span className="text-[11px] font-black tracking-widest uppercase text-blue-400 block mb-1">
              Simulateur Bâtiment &amp; Hangar Agricole
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Structure Métallique <span className="text-amber-400">Sur-Mesure</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Dimensionnez votre hangar ou bâtiment à charpente métallique financé par sa toiture photovoltaïque.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 self-end md:self-auto">
            <Ruler className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-white">
              {length}m × {width}m = {floorArea} m²
            </span>
          </div>
        </div>
      </div>

      {/* Contenu principal en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne Gauche : Paramètres de dimensionnement */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Dimensions du Bâtiment
            </h3>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Longueur du bâtiment</span>
                <span className="text-blue-600">{length} m</span>
              </div>
              <input
                type="range"
                min="12"
                max="60"
                step="6"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Largeur / Portée</span>
                <span className="text-blue-600">{width} m</span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="2"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hauteur égout</label>
                <select
                  value={eaveHeight}
                  onChange={(e) => setEaveHeight(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value={3.5}>3.50 m</option>
                  <option value={4.0}>4.00 m (Standard)</option>
                  <option value={4.5}>4.50 m</option>
                  <option value={5.0}>5.00 m</option>
                  <option value={6.0}>6.00 m</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pente de toiture</label>
                <select
                  value={roofPitch}
                  onChange={(e) => setRoofPitch(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value={10}>10°</option>
                  <option value={15}>15° (Standard)</option>
                  <option value={20}>20°</option>
                  <option value={25}>25°</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1">Type de structure</label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="asymetrique_1">Asymétrique (Optimisé Sud)</option>
                <option value="symetrique">Symétrique (2 pans égaux)</option>
                <option value="monopente">Monopente (1 seul pan Sud)</option>
              </select>
            </div>
          </div>

          {/* Décomposition Financière */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
              Budget Estimatif Prévisionnel
            </h4>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Charpente Métallique</span>
              <strong className="text-slate-800">{charpenteCost.toLocaleString('fr-FR')} €</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Couverture Bac Acier Anti-condensation</span>
              <strong className="text-slate-800">{couvertureCost.toLocaleString('fr-FR')} €</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Fondations &amp; Plots Béton</span>
              <strong className="text-slate-800">{fondationsCost.toLocaleString('fr-FR')} €</strong>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-300">
              <span>Coût Total Bâtiment</span>
              <span className="text-blue-700">{totalBuildingCost.toLocaleString('fr-FR')} € HT</span>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Vue 3D & KPIs de Rentabilité */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Rendu 3D interactif du bâtiment */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-blue-600" />
                Visualisation 3D Bâtiment &amp; Centrale ({length}m × {width}m)
              </span>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                ⚡ {installedKwc} kWc
              </span>
            </div>

            <div className="w-full h-[240px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
              <Building3DViewer
                buildingConfig={{
                  longueur: length,
                  largeur: width,
                  hauteur_egout: eaveHeight,
                  pente: roofPitch,
                  buildingType: buildingType,
                  leftSide: 'none',
                  rightSide: 'none',
                  type: 'batiment_solaire'
                }}
                height={240}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Production / an</span>
              <span className="text-xl font-black text-blue-600 block my-1">
                {annualProductionKwh.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">kWh</span>
              </span>
              <span className="text-[10px] text-slate-400">Centrale {installedKwc} kWc</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Soulte Tiers-Investisseur</span>
              <span className="text-xl font-black text-emerald-600 block my-1">
                +{soulteInvestisseur.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">€</span>
              </span>
              <span className="text-[10px] text-slate-400">Aide au financement</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Reste à Charge Net</span>
              <span className="text-xl font-black text-purple-600 block my-1">
                {resteAChargeAgriculteur.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">€</span>
              </span>
              <span className="text-[10px] text-slate-400">Pour le bâtiment complet</span>
            </div>
          </div>

          {/* Graphique de Cashflow 20 ans */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Amortissement de l'investissement global (20 ans)</span>
              <span className="text-emerald-600">Revenus nets : +{annualNetCashflow.toLocaleString('fr-FR')} €/an</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                  <Tooltip
                    formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} €`, 'Cumul net']}
                    contentStyle={{ borderRadius: 10, fontSize: 11 }}
                  />
                  <Bar dataKey="cumul" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveToArchives}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4 text-blue-400" />
              Sauvegarder
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveToArchives();
                if (onExportPDF) onExportPDF();
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              <FileDown className="w-4 h-4" />
              Exporter Dossier Bâtiment (PDF A4)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
