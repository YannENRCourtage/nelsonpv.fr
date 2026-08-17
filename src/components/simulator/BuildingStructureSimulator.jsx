import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import {
  Download, Maximize, X, Building2, MapPin, Search,
  ChevronRight, ChevronLeft, Sun, Zap, TrendingUp,
  ShieldCheck, RotateCcw, Compass, CheckCircle2, ArrowRight, Table, Loader2
} from 'lucide-react';
import BuildingScene from '../configurator/BuildingScene.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import RoofMapPolygonSelector from './RoofMapPolygonSelector';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';
import { useSimulatorSettingsStore, getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';

export default function BuildingStructureSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { activeTenantId } = useAuth();
  const isAcama = activeTenantId === 'acama';
  const config = useConfiguratorValues();
  const actions = useConfiguratorActions();
  const { settings } = useSimulatorSettingsStore();
  const structSettings = settings.structure;

  // Mode actif : 'configurator' (vue 3D + synthèse) OU 'feasibility' (tunnel Image 4)
  const [activeView, setActiveView] = useState('configurator');

  // Tunnel Faisabilité Solaire (Image 4) : 1. Adresse | 2. Emplacement & Orientation | 3. Rentabilité & Faisabilité
  const [studyStep, setStudyStep] = useState(1);

  // État 3D Visualizer
  const [viewMode, setViewMode] = useState('3D'); // '3D', '2D_FRONT'
  const [isCapturing, setIsCapturing] = useState(false);
  const canvasRef = useRef(null);

  // Étape 1 : Adresse
  const [addressInput, setAddressInput] = useState(
    selectedProject ? [selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', ') : ''
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('32');
  const [cityName, setCityName] = useState('Auch');

  const [mapCenter, setMapCenter] = useState([43.646, 0.585]);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [selectedRidgeIndex, setSelectedRidgeIndex] = useState(0);
  const [orientationInfo, setOrientationInfo] = useState({
    orientationKey: 'south',
    orientationLabel: 'Plein Sud',
    angle: 180
  });

  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  useEffect(() => {
    actions.setIsAcama(isAcama);
  }, [isAcama]);

  // Dimensions & Surface calculées depuis le configurateur
  const buildingLength = config.length || 30;
  const buildingWidth = (config.width
    + (config.leftSide !== 'none' ? (config.leftWidth || 0) : 0)
    + (config.rightSide !== 'none' ? (config.rightWidth || 0) : 0)) || 20;

  const floorArea = useMemo(() => {
    return Math.round(buildingLength * buildingWidth);
  }, [buildingLength, buildingWidth]);

  const roofArea = useMemo(() => {
    const pitchRad = ((config.roofPitch || 15) * Math.PI) / 180;
    return Math.round(floorArea / Math.cos(pitchRad));
  }, [floorArea, config.roofPitch]);

  const installedKwc = useMemo(() => {
    if (config.solarStats?.power) return Math.round(config.solarStats.power);
    return Math.round(roofArea * 0.20);
  }, [config.solarStats, roofArea]);

  const regionalBaseYield = useMemo(() => {
    return getProductionForDepartment(departmentCode);
  }, [departmentCode]);

  const annualProductionKwh = useMemo(() => {
    return Math.round(installedKwc * regionalBaseYield);
  }, [installedKwc, regionalBaseYield]);

  // Coûts financiers
  const charpenteCost = Math.round(floorArea * (structSettings.charpenteCostM2 || 75));
  const couvertureCost = Math.round(roofArea * (structSettings.couvertureBacAcierM2 || 28));
  const fondationsCost = Math.round(floorArea * (structSettings.fondationsCostM2 || 25));
  const totalBuildingCost = charpenteCost + couvertureCost + fondationsCost;

  const soulteInvestisseur = Math.round(installedKwc * 180);
  const resteACharge = Math.max(0, totalBuildingCost - soulteInvestisseur);
  const annualNetRevenue = Math.round(annualProductionKwh * 0.1141);

  const chartData20Years = useMemo(() => {
    const data = [];
    let cumul = -totalBuildingCost;
    for (let yr = 1; yr <= 20; yr++) {
      cumul += annualNetRevenue;
      data.push({
        year: `An ${yr}`,
        cumul: Math.round(cumul),
        isPositive: cumul >= 0
      });
    }
    return data;
  }, [totalBuildingCost, annualNetRevenue]);

  const paybackYear = useMemo(() => {
    const item = chartData20Years.find(d => d.cumul >= 0);
    return item ? item.year.replace('An ', '') : '8';
  }, [chartData20Years]);

  // Recherche BAN
  useEffect(() => {
    if (isAddressSelected || !addressInput || addressInput.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressInput)}&limit=5`);
        const data = await resp.json();
        if (data && data.features) setSuggestions(data.features);
      } catch (err) {
        console.error('Erreur BAN:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [addressInput, isAddressSelected]);

  const handleSelectSuggestion = (feat) => {
    const label = feat.properties.label;
    const [lng, lat] = feat.geometry.coordinates;
    const postcode = feat.properties.postcode || '';
    const dept = postcode.substring(0, 2);
    const city = feat.properties.city || '';

    setAddressInput(label);
    setIsAddressSelected(true);
    setMapCenter([lat, lng]);
    if (dept) setDepartmentCode(dept);
    if (city) setCityName(city);
    setSuggestions([]);
  };

  const ensureMapSnapshot = async () => {
    const snapshot = await generateSatelliteSnapshot({
      center: mapCenter,
      polygonPoints,
      width: 800,
      height: 480,
      zoom: 19
    });
    if (snapshot) setMapScreenshotDataUrl(snapshot);
    return snapshot;
  };

  useEffect(() => {
    if (polygonPoints && polygonPoints.length >= 3 && mapCenter) {
      ensureMapSnapshot();
    }
  }, [polygonPoints, mapCenter]);

  // Synchronisation avec l'état parent
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'structure_metallique',
        title: `Hangar Solaire ${buildingLength.toFixed(1)}m × ${buildingWidth.toFixed(1)}m (${installedKwc} kWc)`,
        address: addressInput,
        cityName,
        departmentCode,
        length: buildingLength,
        width: buildingWidth,
        floorArea,
        roofArea,
        kwc: installedKwc,
        annualProductionKwh,
        totalBuildingCost,
        totalInvestmentHT: totalBuildingCost,
        soulteInvestisseur,
        resteACharge,
        annualBenefitYear1: annualNetRevenue,
        paybackYear,
        mapScreenshot: mapScreenshotDataUrl
      });
    }
  }, [
    buildingLength, buildingWidth, floorArea, roofArea, installedKwc,
    annualProductionKwh, totalBuildingCost, soulteInvestisseur, resteACharge,
    annualNetRevenue, paybackYear, addressInput, cityName, departmentCode,
    mapScreenshotDataUrl, onStateUpdate
  ]);

  return (
    <div className="w-full space-y-4">
      
      {/* ─── BARRE SUPÉRIEURE DE NAVIGATION INTERNE ──────────────────────── */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">
              Structure Métallique &amp; Hangar Solaire
            </h2>
            <p className="text-xs text-slate-300">
              Dimensionnement 3D ({buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m) &amp; Faisabilité Photovoltaïque
            </p>
          </div>
        </div>

        {/* Boutons de bascule Vue 3D / Étude de Rentabilité */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveView('configurator')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeView === 'configurator'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>1. Configurateur 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('feasibility')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeView === 'feasibility'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>2. Étude Faisabilité Solaire</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          VUE 1 : CONFIGURATEUR 3D EXACT + SYNTHÈSE DE LA STRUCTURE (IMAGE 5)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'configurator' && (
        <div className="space-y-4">
          
          {/* Visionneuse 3D et Panneau de Contrôle */}
          <div className="w-full h-[540px] bg-gradient-to-b from-slate-50 to-slate-200 relative flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-slate-200 shadow-xl">
            
            {/* Panneau de contrôle gauche */}
            <div className="relative lg:absolute top-0 lg:top-4 left-0 lg:left-4 z-20 w-full lg:w-[420px] max-h-[40vh] lg:max-h-[calc(540px-2rem)] overflow-y-auto p-4 lg:p-0">
              <ControlPanel isAcama={isAcama} selectedProject={selectedProject} />
            </div>

            {/* Scène 3D */}
            <div id="3d-simulator-view-container" className="flex-1 lg:ml-[440px] relative h-full isolate">
              <div className="w-full h-full">
                <BuildingScene
                  ref={canvasRef}
                  viewMode={viewMode}
                  isCapturing={isCapturing}
                />
              </div>

              {/* Badges Info (Haut Gauche) */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 w-fit pointer-events-auto">
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-slate-200">
                  <span className="text-slate-800 font-black text-sm whitespace-nowrap">
                    {buildingLength.toFixed(2)}m x {buildingWidth.toFixed(2)}m — {floorArea} m²
                  </span>
                </div>

                {config.hasSolar && (
                  <div className="bg-yellow-50/90 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-yellow-200">
                    <span className="text-yellow-800 font-bold text-xs whitespace-nowrap">
                      ⚡ {installedKwc} kWc
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={actions.toggleDimensions}
                  className={`w-full px-3.5 py-1.5 rounded-xl font-semibold text-xs shadow border transition-all flex items-center justify-between gap-2.5 ${
                    config.showDimensions ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Afficher les côtes</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${config.showDimensions ? 'bg-white/30' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config.showDimensions ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Boutons Vue 3D / 2D / Plein Écran (SANS bouton générer offre en doublon) */}
              <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-slate-200 pointer-events-auto">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('3D')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      viewMode === '3D' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Vue 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('2D_FRONT')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      viewMode === '2D_FRONT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Vue 2D
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!canvasRef.current) return;
                    setIsCapturing(true);
                    await new Promise(r => setTimeout(r, 250));
                    const imgData = canvasRef.current.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `vue_${viewMode === '3D' ? '3d' : '2d'}_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setIsCapturing(false);
                  }}
                  className="w-full bg-white text-slate-700 font-bold py-1.5 px-3 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs"
                  title="Télécharger l'image 3D"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger image</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const elem = document.getElementById('3d-simulator-view-container');
                    if (!document.fullscreenElement) {
                      elem?.requestFullscreen();
                    } else {
                      document.exitFullscreen();
                    }
                  }}
                  className="w-full bg-white text-slate-700 font-bold py-1.5 px-3 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs"
                  title="Plein écran"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span>Plein écran</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── ENCART SYNTHÈSE DE LA STRUCTURE (IMAGE 5) ─────────────────── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Synthèse de la Structure &amp; Budget Gros-Œuvre
                </h3>
                <p className="text-xs text-slate-500">
                  Caractéristiques techniques et estimation financière du bâtiment configuré.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('feasibility')}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-105"
              >
                <span>Passer à l'étude de faisabilité solaire</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dimensions</span>
                <strong className="text-sm font-black text-slate-900">{buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m</strong>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Surface au Sol</span>
                <strong className="text-sm font-black text-slate-900">{floorArea} m²</strong>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Puissance Solaire</span>
                <strong className="text-sm font-black text-blue-600">{installedKwc} kWc</strong>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Budget Gros-Œuvre</span>
                <strong className="text-sm font-black text-slate-900">{totalBuildingCost.toLocaleString('fr-FR')} € HT</strong>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Soulte Tiers-Invest.</span>
                <strong className="text-sm font-black text-emerald-700">+{soulteInvestisseur.toLocaleString('fr-FR')} €</strong>
              </div>

              <div className="bg-purple-50 rounded-2xl p-3.5 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Reste à Charge</span>
                <strong className="text-sm font-black text-purple-700">{resteACharge.toLocaleString('fr-FR')} € HT</strong>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VUE 2 : ÉTUDE DE FAISABILITÉ & RENTABILITÉ SOLAIRE (IMAGE 4)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'feasibility' && (
        <div className="space-y-4">
          
          {/* Header Tunnel Faisabilité (Image 4) */}
          <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-xl text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Étude de faisabilité &amp; <span className="text-amber-400">Rentabilité Solaire</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mx-auto">
              Renseignez l'adresse de votre terrain pour simuler la disposition satellite exacte de votre bâtiment ({buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m) et calculer vos revenus photovoltaïques.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              {[
                { step: 1, label: '1. Adresse' },
                { step: 2, label: '2. Emplacement & Orientation' },
                { step: 3, label: '3. Rentabilité & Faisabilité' }
              ].map((item) => {
                const isCurrent = studyStep === item.step;
                const isDone = studyStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setStudyStep(item.step)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
                        : isDone
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* Étape 1 : Adresse Terrain (Image 4) */}
            {studyStep === 1 && (
              <motion.div
                key="study-step-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center max-w-2xl mx-auto"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <MapPin className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Où se situe votre bâtiment ou terrain ?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Entrez la commune, le code postal ou l'adresse précise du terrain d'accueil.
                  </p>
                </div>

                <div className="relative text-left max-w-md mx-auto">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => {
                        setAddressInput(e.target.value);
                        setIsAddressSelected(false);
                      }}
                      placeholder="Ex: 52 Rue de la Victoire, Paris ou Rue de la Paix, Lyon..."
                      className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                    {isSearchingAddress && (
                      <Loader2 className="w-5 h-5 absolute right-4 top-3.5 text-amber-600 animate-spin" />
                    )}
                  </div>

                  {!isAddressSelected && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 text-xs font-semibold text-slate-800"
                        >
                          <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{s.properties.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setStudyStep(2)}
                    className="px-8 py-3.5 rounded-2xl bg-[#0e2b4d] hover:bg-slate-900 text-white font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                  >
                    Valider l'adresse &amp; passer à l'orientation
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Étape 2 : Emplacement & Orientation */}
            {studyStep === 2 && (
              <motion.div
                key="study-step-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-4 text-center"
              >
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Disposition satellite &amp; Orientation du Hangar
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Positionnez l'emprise au sol de votre bâtiment ({buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m) et orientez le pan Sud.
                  </p>
                </div>

                <RoofMapPolygonSelector
                  step={3}
                  center={mapCenter}
                  polygonPoints={polygonPoints}
                  onPolygonChange={setPolygonPoints}
                  mapContainerRef={mapContainerRef}
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStudyStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Étape précédente
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await ensureMapSnapshot();
                      setStudyStep(3);
                    }}
                    className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
                  >
                    Calculer le bilan financier &amp; la rentabilité
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Étape 3 : Bilan Financier & Rentabilité Solaire */}
            {studyStep === 3 && (
              <motion.div
                key="study-step-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                {/* 4 KPIs Clés */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" /> Centrale Photovoltaïque
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-slate-900">{installedKwc}</span>
                      <span className="text-base font-bold text-slate-500 ml-1">kWc</span>
                    </div>
                    <span className="text-xs text-slate-500">Surface toiture : {roofArea} m²</span>
                  </div>

                  <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-500" /> Production Annuelle
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-blue-600">{annualProductionKwh.toLocaleString('fr-FR')}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">kWh / an</span>
                    </div>
                    <span className="text-xs text-slate-500">Région {departmentCode} ({regionalBaseYield} kWh/kWc)</span>
                  </div>

                  <div className="bg-emerald-50 rounded-3xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Soulte Tiers-Investisseur
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-emerald-700">+{soulteInvestisseur.toLocaleString('fr-FR')}</span>
                      <span className="text-xs font-bold text-emerald-800 ml-1">€ nets</span>
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold">Subvention / Aide investisseur</span>
                  </div>

                  <div className="bg-purple-50 rounded-3xl p-4 border border-purple-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" /> Reste à Charge Net
                    </span>
                    <div className="my-1.5">
                      <span className="text-3xl font-black text-purple-700">{resteACharge.toLocaleString('fr-FR')}</span>
                      <span className="text-xs font-bold text-purple-800 ml-1">€ HT</span>
                    </div>
                    <span className="text-xs text-purple-700 font-semibold">Amorti en {paybackYear} ans</span>
                  </div>
                </div>

                {/* Graphique 20 ans */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Amortissement Financier du Bâtiment &amp; Centrale Solaire (20 ans)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Revenus réguliers de revente d'électricité ({annualNetRevenue.toLocaleString('fr-FR')} €/an) amortissant le coût du bâtiment.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">Retour sur Investissement</span>
                      <span className="text-xl font-black text-emerald-600">{paybackYear} ans</span>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData20Years} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                        <Tooltip
                          formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} €`, 'Cumul net']}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <ReferenceLine x={`An ${paybackYear}`} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} />
                        <Bar dataKey="cumul" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bouton retour 3D */}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setActiveView('configurator')}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Revenir au configurateur 3D
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
