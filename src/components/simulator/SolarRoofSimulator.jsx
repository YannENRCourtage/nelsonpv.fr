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
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';

export default function SolarRoofSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { settings } = useSimulatorSettingsStore();
  const toitureSettings = settings.toiturePv;

  // 1: Adresse | 2: Emplacement | 3: Toiture | 4: Résultats
  const [currentStep, setCurrentStep] = useState(1);

  const [addressInput, setAddressInput] = useState(
    selectedProject ? [selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', ') : ''
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('59');
  const [cityName, setCityName] = useState('Lille');

  const [mapCenter, setMapCenter] = useState([50.6292, 3.0573]); // Lille par défaut comme sur l'image
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [roofSurface, setRoofSurface] = useState(1179);

  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  useEffect(() => {
    if (selectedProject) {
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

  // Recherche BAN : propositions uniquement lors de la frappe
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

  // Calcul Puissance (ex: 1179 m² / 6.0 = 196.5 kWc)
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

  // Tarif EDF OA (ex: 0.085 €/kWh pour 100-500 kWc)
  const tarifEdfOaKwh = useMemo(() => {
    if (installedKwc > 100) return 0.085;
    if (installedKwc > 36) return 0.1141;
    return 0.1312;
  }, [installedKwc]);

  const annualRevenueReventeTotale = useMemo(() => {
    return Math.round(annualProductionKwh * tarifEdfOaKwh);
  }, [annualProductionKwh, tarifEdfOaKwh]);

  const totalInvestmentHT = useMemo(() => {
    const costKwc = 920;
    return Math.round(installedKwc * costKwc);
  }, [installedKwc]);

  const paybackReventeYear = useMemo(() => {
    if (annualRevenueReventeTotale <= 0) return '10.3';
    const yrs = totalInvestmentHT / annualRevenueReventeTotale;
    return (Math.round(yrs * 10) / 10).toFixed(1);
  }, [totalInvestmentHT, annualRevenueReventeTotale]);

  // Projection financière sur 30 ans avec cumul 10 / 20 / 30 ans (Image 5)
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

  // Données environnementales (Image 5)
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

  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'toiture_pv',
        title: `Toiture Photovoltaïque ${installedKwc} kWc (${roofSurface} m²) — ${cityName || 'Projet'}`,
        address: addressInput,
        cityName,
        departmentCode,
        kwc: installedKwc,
        roofSurface,
        regionalBaseYield,
        annualProductionKwh,
        tarifEdfOaKwh,
        annualRevenueReventeTotale,
        annualBenefitYear1: annualRevenueReventeTotale,
        totalInvestmentHT,
        paybackYear: paybackReventeYear,
        mapScreenshot: mapScreenshotDataUrl
      });
    }
  }, [
    installedKwc, roofSurface, cityName, addressInput, departmentCode,
    regionalBaseYield, annualProductionKwh, tarifEdfOaKwh, annualRevenueReventeTotale,
    totalInvestmentHT, paybackReventeYear, mapScreenshotDataUrl, onStateUpdate
  ]);

  return (
    <div className="w-full space-y-4">
      
      {/* ─── EN-TÊTE DU SIMULATEUR TOITURE PV (CONFORME ENR-COURTAGE.FR) ─────── */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Valorisez votre toiture photovoltaïque
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Estimez la puissance installable et les revenus générés par la revente d'électricité
          </p>
        </div>

        {/* Stepper épuré 1. Adresse / 2. Emplacement / 3. Toiture */}
        <div className="flex items-center gap-3">
          {[
            { step: 1, label: '1. Adresse' },
            { step: 2, label: '2. Emplacement' },
            { step: 3, label: '3. Toiture' }
          ].map((item) => {
            const isCurrent = currentStep === item.step;
            const isDone = currentStep > item.step || currentStep === 4;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300'
                    : isDone
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${isCurrent ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}>
                  {isDone && currentStep > item.step ? '✓' : item.step}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CONTENU DES ÉTAPES (IMAGES 1, 2, 3, 4, 5) ──────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ═══ ÉTAPE 1 : ADRESSE (IMAGE 1) ═══ */}
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
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
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
                  placeholder="Saisissez votre adresse postale (ex: 52 Rue de la Victoire, Paris)..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
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
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 text-xs font-semibold text-slate-800"
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
                className="px-8 py-3.5 rounded-2xl bg-[#0e2b4d] hover:bg-slate-900 text-white font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105"
              >
                Valider l'adresse &amp; passer à l'emplacement
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Cartes Avantages (Image 1) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-left">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Revenus contractuels garantis 20 ans EDF OA</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Pour tous types de bâtiments professionnels ou copropriétés</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-2.5">
                <Euro className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Étude de rentabilité 100% gratuite &amp; sans engagement</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ ÉTAPE 2 : EMPLACEMENT (IMAGE 2) ═══ */}
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4"
          >
            {/* Notice jaune d'instruction (Image 2) */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Positionnez le curseur sur votre toiture en le faisant glisser ou en double-cliquant sur la carte</span>
            </div>

            {/* Visionneuse satellite */}
            <RoofMapPolygonSelector
              step={2}
              center={mapCenter}
              polygonPoints={polygonPoints}
              onCenterChange={setMapCenter}
              mapContainerRef={mapContainerRef}
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Modifier l'adresse
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-8 py-3 rounded-2xl bg-[#84cc16] hover:bg-[#65a30d] text-white font-black text-sm uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-lime-500/30 transition-all hover:scale-105"
              >
                VALIDEZ VOTRE EMPLACEMENT →
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ ÉTAPE 3 : TOITURE (IMAGE 3) ═══ */}
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4"
          >
            {/* Notice verte d'instruction & badge surface (Image 3) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sélectionnez les 4 coins de votre toiture pouvant accueillir des panneaux photovoltaïques</span>
              </div>
              <div className="bg-white border border-emerald-300 text-emerald-800 px-3.5 py-1 rounded-xl text-xs font-black shadow-2xs self-end sm:self-auto">
                Surface mesurée : {roofSurface} m²
              </div>
            </div>

            {/* Carte satellite avec coins 1, 2, 3, 4 */}
            <RoofMapPolygonSelector
              step={3}
              center={mapCenter}
              polygonPoints={polygonPoints}
              onPolygonChange={setPolygonPoints}
              onSurfaceCalculated={(m2) => setRoofSurface(Math.round(m2))}
              mapContainerRef={mapContainerRef}
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Ajuster l'emplacement
              </button>

              <button
                type="button"
                onClick={async () => {
                  await ensureMapSnapshot();
                  setCurrentStep(4);
                }}
                className="px-8 py-3 rounded-2xl bg-[#84cc16] hover:bg-[#65a30d] text-white font-black text-sm uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-lime-500/30 transition-all hover:scale-105"
              >
                VALIDEZ LA SÉLECTION ✓
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ ÉTAPE 4 : RÉSULTATS DE L'ÉTUDE (IMAGES 4 & 5) ═══ */}
        {currentStep === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Barre de récapitulatif adresse (Image 4) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{addressInput || 'Adresse du projet'}</span>
                <span className="text-slate-400 font-semibold">({roofSurface} m² sélectionnés)</span>
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

            {/* Grille des 5 Cartes de Résultats (Image 4) */}
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
                <div className="text-[10px] text-slate-400">Région {departmentCode} ({regionalBaseYield} kWh/kWc)</div>
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

            {/* ─── SECTION REVENUS CUMULÉS SUR 30 ANS (IMAGE 5) ───────────── */}
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

              {/* 3 Cartes Milestones 10 ans / 20 ans / 30 ans (Image 5) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block mb-1">sur 10 ans</span>
                  <span className="text-2xl font-black text-white">{financialProjection30Years.cumul10.toLocaleString('fr-FR')} €</span>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block mb-1">sur 20 ans</span>
                  <span className="text-2xl font-black text-white">{financialProjection30Years.cumul20.toLocaleString('fr-FR')} €</span>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block mb-1">sur 30 ans</span>
                  <span className="text-2xl font-black text-emerald-400">{financialProjection30Years.cumul30.toLocaleString('fr-FR')} €</span>
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

            {/* ─── SECTION IMPACT SUR L'ENVIRONNEMENT (IMAGE 5) ───────────── */}
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
