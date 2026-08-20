import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Search, ChevronRight, ChevronLeft, Building2,
  Euro, TrendingUp, CheckCircle2, RotateCcw, Sparkles,
  Save, FileDown, ShieldCheck, HelpCircle, Loader2, Landmark,
  Zap, Sun, Clock, Wallet, Leaf, Trees, Users, Award
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { useSimulatorSettingsStore, getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';
import RoofMapPolygonSelector from './RoofMapPolygonSelector';
import SolarRoofBeforeAfterViewer from './SolarRoofBeforeAfterViewer';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';

export default function SolarRoofSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { settings } = useSimulatorSettingsStore();
  const toitureSettings = settings.toiturePv;

  // 1: Adresse | 2: Emplacement | 3: Surface | 4: Orientation | 5: Inclinaison | 6: Résultats
  const [currentStep, setCurrentStep] = useState(1);

  const [clientNameInput, setClientNameInput] = useState(
    selectedProject?.name || selectedProject?.lastName || ''
  );
  const [addressInput, setAddressInput] = useState(
    selectedProject ? [selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', ') : ''
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('59');
  const [cityName, setCityName] = useState('Lille');

  const [mapCenter, setMapCenter] = useState([50.6292, 3.0573]);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [roofSurface, setRoofSurface] = useState(1179);

  // Orientation & Pente
  const [selectedRidgeIndex, setSelectedRidgeIndex] = useState(0);
  const [orientationInfo, setOrientationInfo] = useState({
    orientationKey: 'south',
    orientationLabel: 'Plein Sud (0°)',
    azimuthDeg: 0,
    angle: 0,
    ridgeIndex: 0
  });
  const [selectedPitch, setSelectedPitch] = useState(30);

  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.name || selectedProject.lastName) {
        setClientNameInput(selectedProject.name || selectedProject.lastName);
      }
      if (selectedProject.address || selectedProject.city) {
        setAddressInput([selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', '));
        setIsAddressSelected(true);
      }
      if (selectedProject.zip) setDepartmentCode(selectedProject.zip.substring(0, 2));
      if (selectedProject.city) setCityName(selectedProject.city);
      if (selectedProject.lat && selectedProject.lng) {
        setMapCenter([Number(selectedProject.lat), Number(selectedProject.lng)]);
      }
    }
  }, [selectedProject]);

  // Recherche BAN
  useEffect(() => {
    if (isAddressSelected || !addressInput || addressInput.length < 3 || currentStep !== 1) {
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
        console.error('Erreur API Adresse:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [addressInput, isAddressSelected, currentStep]);

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

  // Calcul Puissance
  const installedKwc = useMemo(() => {
    const ratio = toitureSettings.surfaceToPowerRatio || 6.0;
    const kwc = Math.round((roofSurface / ratio) * 10) / 10;
    return Math.min(500, Math.max(36, kwc));
  }, [roofSurface, toitureSettings]);

  const regionalBaseYield = useMemo(() => {
    return getProductionForDepartment(departmentCode);
  }, [departmentCode]);

  const annualProductionKwh = useMemo(() => {
    return Math.round(installedKwc * regionalBaseYield);
  }, [installedKwc, regionalBaseYield]);

  // Tarif EDF OA avec tranches dynamiques
  const tarifEdfOaKwh = useMemo(() => {
    const oaTarifs = toitureSettings?.tarifsAchatEdfOa || [];
    const match = oaTarifs.find(t => installedKwc > (t.minKwc || 0) && installedKwc <= (t.maxKwc || 1000));
    if (match && match.tarifAchatKwh) return Number(match.tarifAchatKwh);
    if (installedKwc > 100) return 0.085;
    if (installedKwc > 36) return 0.114;
    return 0.131;
  }, [installedKwc, toitureSettings]);

  const annualRevenueReventeTotale = useMemo(() => {
    return Math.round(annualProductionKwh * tarifEdfOaKwh);
  }, [annualProductionKwh, tarifEdfOaKwh]);

  const totalInvestmentHT = useMemo(() => {
    const costKwc = toitureSettings?.installationCostPerKwc || 920;
    return Math.round(installedKwc * costKwc);
  }, [installedKwc, toitureSettings]);

  const paybackReventeYear = useMemo(() => {
    if (annualRevenueReventeTotale <= 0) return '10.3';
    const yrs = totalInvestmentHT / annualRevenueReventeTotale;
    return (Math.round(yrs * 10) / 10).toFixed(1);
  }, [totalInvestmentHT, annualRevenueReventeTotale]);

  // Projection financière sur 30 ans avec cumul 10 / 20 / 30 ans
  const financialProjection30Years = useMemo(() => {
    const data = [];
    let cumul = -totalInvestmentHT;
    let cumul10 = 0;
    let cumul20 = 0;
    let cumul30 = 0;

    for (let yr = 1; yr <= 30; yr++) {
      const panelEfficiency = Math.pow(0.995, yr - 1);
      const yearRevenue = Math.round(annualRevenueReventeTotale * panelEfficiency);

      cumul += yearRevenue;
      if (yr <= 10) cumul10 += yearRevenue;
      if (yr <= 20) cumul20 += yearRevenue;
      if (yr <= 30) cumul30 += yearRevenue;

      data.push({
        year: `${yr}`,
        gain: Math.round(cumul),
        yearRevenue,
        isPayback: cumul >= 0
      });
    }

    return {
      data,
      cumul10,
      cumul20,
      cumul30
    };
  }, [totalInvestmentHT, annualRevenueReventeTotale]);

  // Données environnementales
  const co2AvoidedTonsPerYear = useMemo(() => {
    return (Math.round((annualProductionKwh * 0.0005) * 10) / 10).toLocaleString('fr-FR');
  }, [annualProductionKwh]);

  const treesPlantedPerYear = useMemo(() => {
    return Math.round(annualProductionKwh * 0.00143);
  }, [annualProductionKwh]);

  const equivalentHouseholds = useMemo(() => {
    return (Math.round((annualProductionKwh / 4500) * 10) / 10).toLocaleString('fr-FR');
  }, [annualProductionKwh]);

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

  // Notification d'état parent (propre sans "taux d'autoconsommation" ni "gisement régional")
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'toiture_pv',
        title: `Toiture Photovoltaïque ${installedKwc} kWc (${roofSurface} m²) — ${clientNameInput || cityName || 'Projet'}`,
        clientName: clientNameInput || cityName,
        address: addressInput,
        cityName,
        departmentCode,
        kwc: installedKwc,
        roofSurface,
        pitch: selectedPitch,
        orientationLabel: orientationInfo.orientationLabel,
        annualProductionKwh,
        tarifEdfOaKwh,
        annualRevenueReventeTotale,
        annualBenefitYear1: annualRevenueReventeTotale,
        totalInvestmentHT,
        paybackYear: paybackReventeYear,
        totalGains30Years: financialProjection30Years.cumul30,
        cumul10: financialProjection30Years.cumul10,
        cumul20: financialProjection30Years.cumul20,
        cumul30: financialProjection30Years.cumul30,
        mapScreenshot: mapScreenshotDataUrl
      });
    }
  }, [
    installedKwc, roofSurface, clientNameInput, cityName, addressInput, departmentCode,
    selectedPitch, orientationInfo, annualProductionKwh, tarifEdfOaKwh, annualRevenueReventeTotale,
    totalInvestmentHT, paybackReventeYear, financialProjection30Years, mapScreenshotDataUrl, onStateUpdate
  ]);

  return (
    <div className="w-full space-y-4">
      
      {/* ─── EN-TÊTE DU SIMULATEUR TOITURE PV ───────────────────────────────── */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Toiture <span className="text-amber-400">Photovoltaïque</span>
            </h2>
            <p className="text-sm text-slate-300 mt-0.5 max-w-2xl">
              Estimez la puissance installable et les revenus générés par la revente d'électricité sur votre toiture.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20">
              <span className="text-xs text-amber-300 font-bold">Client :</span>
              <input
                type="text"
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                placeholder="Nom du client..."
                className="bg-transparent text-xs font-extrabold text-white placeholder:text-white/50 focus:outline-none w-32 sm:w-40 border-b border-white/30 focus:border-amber-400 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-white truncate max-w-[240px]">
                {cityName} ({departmentCode})
              </span>
            </div>
          </div>
        </div>

        {/* Stepper complet à 6 étapes cliquables */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-1">
          {[
            { step: 1, label: '1. Adresse' },
            { step: 2, label: '2. Emplacement' },
            { step: 3, label: '3. Surface' },
            { step: 4, label: '4. Orientation' },
            { step: 5, label: '5. Inclinaison' },
            { step: 6, label: '6. Résultat' }
          ].map((item) => {
            const isCurrent = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300'
                    : isDone
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${isCurrent ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}>
                  {isDone ? '✓' : item.step}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CONTENU DU TUNNEL INTERACTIF ──────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ═══ ÉTAPE 1 : ADRESSE ═══ */}
        {currentStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center max-w-3xl mx-auto"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <MapPin className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Où se situe votre bâtiment ou toiture ?
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                Renseignez l'adresse de votre bâtiment (hangar, entrepôt, usine, local commercial ou copropriété) pour simuler son potentiel photovoltaïque.
              </p>
            </div>

            <div className="relative text-left max-w-xl mx-auto">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    setIsAddressSelected(false);
                  }}
                  placeholder="Saisissez votre adresse postale ou commune..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-base font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
                {isSearchingAddress && (
                  <Loader2 className="w-5 h-5 absolute right-4 top-3.5 text-emerald-600 animate-spin" />
                )}
              </div>

              {!isAddressSelected && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 text-sm font-semibold text-slate-800"
                    >
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{s.properties.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                Localiser sur la carte satellite
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Cartes Avantages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-left">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Revenus contractuels garantis 20 ans EDF OA</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Pour tous types de bâtiments professionnels</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-2.5">
                <Euro className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Étude de rentabilité 100% gratuite &amp; sans engagement</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ ÉTAPE 2 : EMPLACEMENT ═══ */}
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3"
          >
            {/* Titre et Boutons d'Action Alignés en Haut */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Positionnez votre bâtiment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faites glisser la carte et zoomez librement pour centrer votre toiture sous le curseur.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const offsetLat = 0.00012;
                    const offsetLng = 0.00020;
                    const recentered = [
                      { lat: mapCenter[0] + offsetLat, lng: mapCenter[1] - offsetLng },
                      { lat: mapCenter[0] + offsetLat, lng: mapCenter[1] + offsetLng },
                      { lat: mapCenter[0] - offsetLat, lng: mapCenter[1] + offsetLng },
                      { lat: mapCenter[0] - offsetLat, lng: mapCenter[1] - offsetLng },
                    ];
                    setPolygonPoints(recentered);
                    setCurrentStep(3);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Valider l'emplacement
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <RoofMapPolygonSelector
              step={2}
              center={mapCenter}
              polygonPoints={polygonPoints}
              onCenterChange={setMapCenter}
              mapContainerRef={mapContainerRef}
            />
          </motion.div>
        )}

        {/* ═══ ÉTAPE 3 : SURFACE ═══ */}
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3"
          >
            {/* Titre et Boutons d'Action Alignés en Haut */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Délimitez la surface de toiture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Déplacez les 4 coins vert fluo pour couvrir le pan de toiture utile.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Valider la surface
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <RoofMapPolygonSelector
              step={3}
              center={mapCenter}
              polygonPoints={polygonPoints}
              onPolygonChange={setPolygonPoints}
              onSurfaceCalculated={(m2) => setRoofSurface(Math.round(m2))}
              mapContainerRef={mapContainerRef}
            />
          </motion.div>
        )}

        {/* ═══ ÉTAPE 4 : ORIENTATION ═══ */}
        {currentStep === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3"
          >
            {/* Titre et Boutons d'Action Alignés en Haut */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Orientation de la toiture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliquez sur le faîtage (ligne rouge) pour déterminer l'exposition du pan.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Valider l'orientation
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <RoofMapPolygonSelector
              step={4}
              center={mapCenter}
              polygonPoints={polygonPoints}
              selectedRidgeIndex={selectedRidgeIndex}
              onRidgeSelect={setSelectedRidgeIndex}
              orientationInfo={orientationInfo}
              onOrientationChange={setOrientationInfo}
              mapContainerRef={mapContainerRef}
            />
          </motion.div>
        )}

        {/* ═══ ÉTAPE 5 : INCLINAISON ═══ */}
        {currentStep === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5"
          >
            {/* Titre et Boutons d'Action Alignés en Haut */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Inclinaison de la toiture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez la pente de votre toiture professionnelle.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await ensureMapSnapshot();
                    setCurrentStep(6);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Voir les résultats
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Schéma Dynamique */}
            <div className="w-64 h-32 mx-auto flex items-end justify-center pb-2 transition-all duration-300">
              <svg viewBox="0 0 160 80" className="w-full h-full text-emerald-600 stroke-current fill-none">
                <line x1="10" y1="70" x2="150" y2="70" strokeWidth="2.5" stroke="#cbd5e1" />
                {selectedPitch === 0 ? (
                  <>
                    <line x1="15" y1="64" x2="145" y2="64" strokeWidth="4.5" stroke="#00b875" />
                    <rect x="25" y="60" width="110" height="4" fill="#00e699" opacity="0.4" />
                  </>
                ) : (
                  <>
                    <path
                      d={`M 15 70 L 80 ${70 - (selectedPitch === 15 ? 18 : selectedPitch === 30 ? 38 : 56)} L 145 70 Z`}
                      strokeWidth="3.5"
                      stroke="#00b875"
                      fill="rgba(0, 184, 117, 0.15)"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="80"
                      y1={70 - (selectedPitch === 15 ? 18 : selectedPitch === 30 ? 38 : 56)}
                      x2="80"
                      y2="70"
                      stroke="#00b875"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  </>
                )}
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              {[
                { pitch: 0, label: '0°', desc: 'Toit plat terrasse' },
                { pitch: 15, label: '15°', desc: 'Pente faible (Hangar)' },
                { pitch: 30, label: '30°', desc: 'Standard recommandé' },
                { pitch: 45, label: '45°', desc: 'Pente forte' }
              ].map((item) => (
                <button
                  key={item.pitch}
                  type="button"
                  onClick={() => setSelectedPitch(item.pitch)}
                  className={`py-3.5 px-4 rounded-2xl font-black text-base transition-all border-2 ${
                    selectedPitch === item.pitch
                      ? 'bg-[#0e2b4d] border-[#0e2b4d] text-white shadow-xl scale-105 ring-4 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xl">{item.label}</span>
                  <span className="text-xs font-normal opacity-85 block">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-xs text-slate-600 leading-relaxed text-center">
              💡 <em>Pour les hangars et bâtiments industriels, la pente standard se situe généralement entre 10° et 15°.</em>
            </div>
          </motion.div>
        )}

        {/* ═══ ÉTAPE 6 : RÉSULTATS DE L'ÉTUDE (30 ANS) ═══ */}
        {currentStep === 6 && (
          <motion.div
            key="step-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Barre de récapitulatif */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{addressInput || 'Adresse du projet'}</span>
                <span className="text-slate-400 font-semibold">({roofSurface} m² • {orientationInfo.orientationLabel})</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Refaire une simulation
              </button>
            </div>

            {/* Titre des Résultats */}
            <div className="text-center space-y-1">
              <span className="text-xs font-black tracking-widest uppercase text-emerald-600 block">
                RÉSULTATS DE L'ÉTUDE
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Potentiel photovoltaïque de votre toiture
              </h3>
            </div>

            {/* Grille des 5 Cartes de Résultats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Carte 1 : Puissance Installable */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between text-center">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PUISSANCE INSTALLABLE</span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-slate-900">{installedKwc}</span>
                  <span className="text-sm font-bold text-slate-500 ml-1">kWc</span>
                </div>
                <div className="text-[10px] text-slate-400">Surface : {roofSurface} m²</div>
              </div>

              {/* Carte 2 : Production Annuelle */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between text-center">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Sun className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PRODUCTION ANNUELLE</span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-blue-600">{annualProductionKwh.toLocaleString('fr-FR')}</span>
                  <span className="text-sm font-bold text-slate-500 ml-1">kWh</span>
                </div>
                <div className="text-[10px] text-slate-400">{orientationInfo.orientationLabel}</div>
              </div>

              {/* Carte 3 : Revenus 1ère Année */}
              <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-sm flex flex-col justify-between text-center">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                  <Euro className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">REVENUS 1ÈRE ANNÉE</span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-amber-600">{annualRevenueReventeTotale.toLocaleString('fr-FR')}</span>
                  <span className="text-sm font-bold text-amber-700 ml-1">€</span>
                </div>
                <div className="text-[10px] text-amber-700 font-semibold">Tarif rachat EDF OA : {tarifEdfOaKwh} €/kWh</div>
              </div>

              {/* Carte 4 : Coût Est. HT */}
              <div className="bg-white rounded-3xl p-5 border border-purple-200 shadow-sm flex flex-col justify-between text-center">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider">COÛT (EST. HT)</span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-purple-700">{totalInvestmentHT.toLocaleString('fr-FR')}</span>
                  <span className="text-sm font-bold text-purple-800 ml-1">€</span>
                </div>
                <div className="text-[10px] text-purple-600">Investissement clé en main</div>
              </div>

              {/* Carte 5 : Amortissement */}
              <div className="bg-white rounded-3xl p-5 border border-red-200 shadow-sm flex flex-col justify-between text-center">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">AMORTISSEMENT</span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-red-600">{paybackReventeYear}</span>
                  <span className="text-sm font-bold text-red-700 ml-1">ans</span>
                </div>
                <div className="text-[10px] text-red-600 font-semibold">Retour sur investissement</div>
              </div>

            </div>

            <p className="text-center text-[11px] text-slate-400 italic">
              La production et les revenus affichés sont limités à 500 kWc, conformément aux tarifs conventionnés.
            </p>

            {/* Visuel Avant / Après de l'implantation des panneaux sur la toiture */}
            <SolarRoofBeforeAfterViewer
              center={mapCenter}
              polygonPoints={polygonPoints}
              roofSurface={roofSurface}
              customKwc={cappedPowerKwc}
              orientationInfo={orientationInfo}
              annualProductionKwh={annualProductionKwh}
            />

            {/* ─── SECTION REVENUS CUMULÉS SUR 30 ANS ───────────── */}
            <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Revenus cumulés de la revente d'électricité
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Projection sur 30 ans du chiffre d'affaires cumulé généré par votre centrale photovoltaïque
                </p>
              </div>

              {/* 3 Cartes Milestones 10 ans / 20 ans / 30 ans sans padding inutile au-dessus */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block">sur 10 ans</span>
                  <span className="text-2xl font-black text-white block mt-0.5">{financialProjection30Years.cumul10.toLocaleString('fr-FR')} €</span>
                </div>

                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block">sur 20 ans</span>
                  <span className="text-2xl font-black text-white block mt-0.5">{financialProjection30Years.cumul20.toLocaleString('fr-FR')} €</span>
                </div>

                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block">sur 30 ans</span>
                  <span className="text-2xl font-black text-emerald-400 block mt-0.5">{financialProjection30Years.cumul30.toLocaleString('fr-FR')} €</span>
                </div>
              </div>

              {/* Graphique 30 Ans avec Barres Bicolores */}
              <div className="space-y-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialProjection30Years.data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                      <Tooltip
                        formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} €`, 'Cumul net']}
                        labelFormatter={(yr) => `Année ${yr}`}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#ffffff', fontSize: 12 }}
                      />
                      <ReferenceLine
                        x={Math.round(Number(paybackReventeYear)).toString()}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{
                          value: `Amorti en ${paybackReventeYear} ans`,
                          fill: '#ef4444',
                          position: 'top',
                          fontSize: 10,
                          fontWeight: 'bold'
                        }}
                      />
                      <Bar dataKey="gain" radius={[4, 4, 0, 0]}>
                        {financialProjection30Years.data.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isPayback ? '#10b981' : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-300 pt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    Amortissement en cours
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    Bénéfices nets (Post-ROI)
                  </span>
                </div>
              </div>
            </div>

            {/* ─── SECTION IMPACT SUR L'ENVIRONNEMENT ───────────── */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Votre impact sur l'environnement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs text-center">
                  <span className="text-2xl font-black text-emerald-700 block">{co2AvoidedTonsPerYear} tonnes</span>
                  <span className="text-xs text-slate-500 font-semibold">de CO₂ évitées par an</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs text-center">
                  <span className="text-2xl font-black text-emerald-700 block">{treesPlantedPerYear}</span>
                  <span className="text-xs text-slate-500 font-semibold">arbres plantés par an</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs text-center">
                  <span className="text-2xl font-black text-teal-700 block">{equivalentHouseholds}</span>
                  <span className="text-xs text-slate-500 font-semibold">foyer(s) alimenté(s) en électricité</span>
                </div>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
