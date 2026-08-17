import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Search, ChevronRight, ChevronLeft, Sun, Zap,
  Compass, ArrowUpRight, TrendingUp, CheckCircle2, RotateCcw,
  Sparkles, Save, FileDown, ShieldCheck, HelpCircle, Loader2, ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ReferenceLine } from 'recharts';
import { useSimulatorSettingsStore, getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';
import RoofMapPolygonSelector from './RoofMapPolygonSelector';
import { toast } from '@/components/ui/use-toast';
import html2canvas from 'html2canvas';

export default function SolarAutoconsoSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { settings, getSolarPriceForKwc, getDefaultAutoconsoRate } = useSimulatorSettingsStore();
  const autoSettings = settings.autoconsommation;

  // ─── État du tunnel (1: Adresse, 2: Emplacement, 3: Surface, 4: Orientation, 5: Inclinaison, 6: Résultat) ───
  const [currentStep, setCurrentStep] = useState(1);

  // Étape 1 : Adresse (Pas d'adresse par défaut)
  const [addressInput, setAddressInput] = useState(
    selectedProject ? [selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', ') : ''
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('32');
  const [cityName, setCityName] = useState('Auch');

  // Coordonnées GPS
  const [mapCenter, setMapCenter] = useState([43.646, 0.585]);

  // Étape 3 : Polygone de toiture
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [roofSurface, setRoofSurface] = useState(83); // m²

  // Étape 4 : Orientation
  const [selectedRidgeIndex, setSelectedRidgeIndex] = useState(0);
  const [orientationInfo, setOrientationInfo] = useState({
    orientationKey: 'south_east',
    orientationLabel: 'Sud-Est',
    angle: 135
  });

  // Étape 5 : Inclinaison
  const [selectedPitch, setSelectedPitch] = useState(30); // 0, 15, 30, 45

  // Étape 6 : Choix de puissance / Dimensionnement
  const [customKwc, setCustomKwc] = useState(6);
  const [customAutoconsoRate, setCustomAutoconsoRate] = useState(65);

  // Capture de carte pour l'export PDF
  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  // Initialisation à partir du projet sélectionné (si dispo)
  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.address || selectedProject.city) {
        setAddressInput([selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', '));
      }
      if (selectedProject.zip) {
        setDepartmentCode(selectedProject.zip.substring(0, 2));
      }
      if (selectedProject.city) setCityName(selectedProject.city);
      if (selectedProject.lat && selectedProject.lng) {
        setMapCenter([Number(selectedProject.lat), Number(selectedProject.lng)]);
      }
      if (selectedProject.kwc) setCustomKwc(Number(selectedProject.kwc));
    }
  }, [selectedProject]);

  // Autocomplétion API Adresse (BAN France)
  useEffect(() => {
    if (!addressInput || addressInput.length < 3 || currentStep !== 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressInput)}&limit=5`);
        const data = await resp.json();
        if (data && data.features) {
          setSuggestions(data.features);
        }
      } catch (err) {
        console.error('Erreur API Adresse:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [addressInput, currentStep]);

  const handleSelectSuggestion = (feat) => {
    const label = feat.properties.label;
    const [lng, lat] = feat.geometry.coordinates;
    const postcode = feat.properties.postcode || '';
    const dept = postcode.substring(0, 2);
    const city = feat.properties.city || '';

    setAddressInput(label);
    setMapCenter([lat, lng]);
    if (dept) setDepartmentCode(dept);
    if (city) setCityName(city);
    setSuggestions([]);
  };

  // Puissance recommandée selon la surface : ~200 Wc / m² (5 m² par kWc)
  const recommendedKwc = useMemo(() => {
    const raw = Math.round((roofSurface / 5.0) * 10) / 10;
    if (raw <= 3.5) return 3;
    if (raw <= 7.5) return 6;
    if (raw <= 11) return 9;
    if (raw <= 18) return 15;
    if (raw <= 28) return 22;
    return 36;
  }, [roofSurface]);

  useEffect(() => {
    setCustomKwc(recommendedKwc);
    setCustomAutoconsoRate(getDefaultAutoconsoRate(recommendedKwc));
  }, [recommendedKwc, getDefaultAutoconsoRate]);

  // ─── MOTEUR DE CALCUL RIGOUREUX ──────────────────────────────────────────────
  const regionalBaseYield = useMemo(() => {
    return getProductionForDepartment(departmentCode);
  }, [departmentCode]);

  const orientationCoeff = useMemo(() => {
    const key = orientationInfo.orientationKey || 'south';
    const cfg = autoSettings.orientationCoefficients[key];
    return cfg ? cfg.coeff : 1.00;
  }, [orientationInfo, autoSettings]);

  const inclinationCoeff = useMemo(() => {
    if (selectedPitch === 30) return 1.00;
    if (selectedPitch === 15 || selectedPitch === 45) return 0.96;
    if (selectedPitch === 0 || selectedPitch > 45) return 0.90;
    return 1.00;
  }, [selectedPitch]);

  const annualProductionKwh = useMemo(() => {
    return Math.round(customKwc * regionalBaseYield * orientationCoeff * inclinationCoeff);
  }, [customKwc, regionalBaseYield, orientationCoeff, inclinationCoeff]);

  const autoconsoKwh = useMemo(() => {
    return Math.round(annualProductionKwh * (customAutoconsoRate / 100));
  }, [annualProductionKwh, customAutoconsoRate]);

  const surplusKwh = useMemo(() => {
    return Math.max(0, annualProductionKwh - autoconsoKwh);
  }, [annualProductionKwh, autoconsoKwh]);

  const annualSavingsAutoconso = useMemo(() => {
    return Math.round(autoconsoKwh * (autoSettings.defaultValorisationAutoconso || 0.26));
  }, [autoconsoKwh, autoSettings]);

  const annualRevenueSurplus = useMemo(() => {
    return Math.round(surplusKwh * (autoSettings.defaultValorisationSurplus || 0.13));
  }, [surplusKwh, autoSettings]);

  const totalAnnualBenefitYear1 = annualSavingsAutoconso + annualRevenueSurplus;

  const totalInvestmentHT = useMemo(() => {
    return getSolarPriceForKwc(customKwc);
  }, [customKwc, getSolarPriceForKwc]);

  // Projection sur 25 ans avec inflation (3.5%/an)
  const chartData25Years = useMemo(() => {
    const data = [];
    let cumulativeGain = -totalInvestmentHT;
    const inflation = (autoSettings.defaultElectricityInflation || 3.5) / 100;

    for (let year = 1; year <= 25; year++) {
      const yearFactor = Math.pow(1 + inflation, year - 1);
      const yearBenefit = (annualSavingsAutoconso * yearFactor) + annualRevenueSurplus;
      cumulativeGain += yearBenefit;
      data.push({
        year: `An ${year}`,
        gain: Math.round(cumulativeGain),
        benefitAnnual: Math.round(yearBenefit),
        isPositive: cumulativeGain >= 0
      });
    }
    return data;
  }, [totalInvestmentHT, annualSavingsAutoconso, annualRevenueSurplus, autoSettings]);

  const paybackYear = useMemo(() => {
    const item = chartData25Years.find(d => d.gain >= 0);
    return item ? item.year.replace('An ', '') : '8';
  }, [chartData25Years]);

  const totalGains25Years = useMemo(() => {
    const last = chartData25Years[chartData25Years.length - 1];
    return last ? last.gain : 0;
  }, [chartData25Years]);

  // Prise de vue automatique de la carte
  const takeMapSnapshot = async () => {
    if (mapContainerRef.current) {
      try {
        const canvas = await html2canvas(mapContainerRef.current, { scale: 1.5, useCORS: true, allowTaint: true });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setMapScreenshotDataUrl(dataUrl);
        return dataUrl;
      } catch (err) {
        console.warn('Screenshot map capture:', err);
      }
    }
    return null;
  };

  // Synchronisation avec l'état global du simulateur parent
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'autoconsommation',
        title: `Autoconsommation ${customKwc} kWc — ${cityName || 'Projet'}`,
        address: addressInput,
        cityName,
        departmentCode,
        kwc: customKwc,
        roofSurface,
        pitch: selectedPitch,
        orientationLabel: orientationInfo.orientationLabel,
        regionalBaseYield,
        annualProductionKwh,
        autoconsoRate: customAutoconsoRate,
        autoconsoKwh,
        surplusKwh,
        annualBenefitYear1: totalAnnualBenefitYear1,
        totalInvestmentHT,
        paybackYear,
        totalGains25Years,
        mapScreenshot: mapScreenshotDataUrl
      });
    }
  }, [
    customKwc, cityName, addressInput, departmentCode, roofSurface, selectedPitch,
    orientationInfo, regionalBaseYield, annualProductionKwh, customAutoconsoRate,
    autoconsoKwh, surplusKwh, totalAnnualBenefitYear1, totalInvestmentHT,
    paybackYear, totalGains25Years, mapScreenshotDataUrl, onStateUpdate
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      
      {/* ═══ BANDEAU SUPÉRIEUR ENR COURTAGE ════════════════════════════════════ */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
          <div>
            <span className="text-xs font-black tracking-widest uppercase text-emerald-400 block mb-0.5">
              Simulateur de Rentabilité Solaire
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Autoconsommation <span className="text-amber-400">Photovoltaïque</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Réduisez vos factures d'électricité et valorisez le surplus de production de votre toiture.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 self-end md:self-auto">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-white truncate max-w-[220px]">
              {cityName} ({departmentCode}) — {regionalBaseYield} kWh/kWc
            </span>
          </div>
        </div>

        {/* Stepper horizontal */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-1">
          {[
            { step: 1, label: '1. Adresse' },
            { step: 2, label: '2. Emplacement' },
            { step: 3, label: '3. Surface' },
            { step: 4, label: '4. Orientation' },
            { step: 5, label: '5. Inclinaison' },
            { step: 6, label: '6. Résultat' }
          ].map((item) => {
            const isDone = item.step < currentStep;
            const isCurrent = item.step === currentStep;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300'
                    : isDone
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-black ${isCurrent ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}>
                  {isDone ? '✓' : item.step}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ CONTENU DU TUNNEL ══════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">

        {/* ── ÉTAPE 1 : ADRESSE (Sans adresse par défaut) ─────────────────────── */}
        {currentStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <MapPin className="w-8 h-8" />
            </div>

            <div className="max-w-xl mx-auto">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Où se situe votre bâtiment ou toiture ?
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Renseignez votre adresse postale pour centrer la carte satellite haute définition et adapter l'ensoleillement régional.
              </p>
            </div>

            <div className="max-w-xl mx-auto relative text-left">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Saisissez une adresse postale ou une commune..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-base font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                />
                {isSearchingAddress && (
                  <Loader2 className="w-5 h-5 absolute right-4 top-3.5 text-emerald-600 animate-spin" />
                )}
              </div>

              {/* Suggestions d'adresses */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50/70 transition-colors flex items-center gap-3 text-sm font-semibold text-slate-800"
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
          </motion.div>
        )}

        {/* ── ÉTAPE 2 : REPÉRAGE TOITURE (SATELLITE) ─────────────────────────── */}
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3 text-center"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Repérons votre toiture
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Faites glisser la carte pour positionner le pan de toiture à équiper sous le curseur vert clignotant.
              </p>
            </div>

            <RoofMapPolygonSelector
              step={2}
              center={mapCenter}
              onCenterChange={(newCenter) => setMapCenter(newCenter)}
              polygonPoints={polygonPoints}
              onPolygonChange={setPolygonPoints}
              mapContainerRef={mapContainerRef}
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Étape précédente
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                Valider mon emplacement
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 3 : SURFACE DE TOITURE (4 COINS VERT FLUO) ───────────────── */}
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3 text-center"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Calculons la surface de votre toiture
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Déplacez les 4 coins vert fluo (1, 2, 3, 4) du pan de toiture pouvant accueillir des panneaux solaires.
              </p>
            </div>

            <RoofMapPolygonSelector
              step={3}
              center={mapCenter}
              polygonPoints={polygonPoints}
              onPolygonChange={(pts) => setPolygonPoints(pts)}
              mapContainerRef={mapContainerRef}
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Étape précédente
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                Valider la surface de ma toiture
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 4 : ORIENTATION DE LA TOITURE ───────────────────────────── */}
        {currentStep === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3 text-center"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Déterminons l'orientation de votre toiture
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cliquez sur le faîtage (côté le plus haut en rouge) pour orienter la pente.
              </p>
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

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Étape précédente
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                Valider l'orientation
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 5 : INCLINAISON AVEC TRIANGLE DYNAMIQUE ─────────────────── */}
        {currentStep === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5 text-center"
          >
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                Quelle est l'inclinaison de votre toiture ?
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Sélectionnez l'angle de pente le plus proche de votre toiture.
              </p>
            </div>

            {/* SCHÉMA DU TRIANGLE DYNAMIQUE ANIMÉ */}
            <div className="w-64 h-32 mx-auto flex items-end justify-center pb-2 transition-all duration-300">
              <svg viewBox="0 0 160 80" className="w-full h-full text-emerald-600 stroke-current fill-none">
                {/* Ligne de sol / base */}
                <line x1="10" y1="70" x2="150" y2="70" strokeWidth="2.5" stroke="#cbd5e1" />
                
                {/* Toiture dynamique selon la pente */}
                {selectedPitch === 0 ? (
                  <>
                    <line x1="15" y1="64" x2="145" y2="64" strokeWidth="4.5" stroke="#00b875" />
                    <rect x="25" y="60" width="110" height="4" fill="#00e699" opacity="0.4" />
                  </>
                ) : (
                  <>
                    {/* Triangle de pente */}
                    <path
                      d={`M 15 70 L 80 ${70 - (selectedPitch === 15 ? 18 : selectedPitch === 30 ? 38 : 56)} L 145 70 Z`}
                      strokeWidth="3.5"
                      stroke="#00b875"
                      fill="rgba(0, 184, 117, 0.15)"
                      strokeLinejoin="round"
                    />
                    {/* Faîtage en pointillés */}
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

                {/* Indicateur de degré */}
                <text x="80" y="78" textAnchor="middle" fill="#0e2b4d" fontSize="8" fontWeight="bold">
                  {selectedPitch}° d'inclinaison
                </text>
              </svg>
            </div>

            {/* Boutons d'angles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              {[
                { pitch: 0, label: '0°', desc: 'Toit plat' },
                { pitch: 15, label: '15°', desc: 'Pente faible' },
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

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-xs text-slate-500">
              💡 <em>Si vous ne connaissez pas l'inclinaison exacte de votre toiture, choisissez 30°. Il s'agit de la configuration la plus courante en France.</em>
            </div>

            <div className="flex items-center justify-between pt-2 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Étape précédente
              </button>

              <button
                type="button"
                onClick={async () => {
                  await takeMapSnapshot();
                  setCurrentStep(6);
                }}
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                Calculer mon bilan solaire
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 6 : RÉSULTATS & BILAN AVEC POINT D'AMORTISSEMENT ─────────── */}
        {currentStep === 6 && (
          <motion.div
            key="step-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* KPIs Principaux */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" /> Puissance
                </span>
                <div className="my-1.5">
                  <span className="text-3xl font-black text-slate-900">{customKwc}</span>
                  <span className="text-base font-bold text-slate-500 ml-1">kWc</span>
                </div>
                <div className="flex gap-1 overflow-x-auto pt-1">
                  {[3, 6, 9, 15, 22, 36].map(kw => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        setCustomKwc(kw);
                        setCustomAutoconsoRate(getDefaultAutoconsoRate(kw));
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                        customKwc === kw ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {kw}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-500" /> Production estimée
                </span>
                <div className="my-1.5">
                  <span className="text-3xl font-black text-blue-600">{annualProductionKwh.toLocaleString('fr-FR')}</span>
                  <span className="text-xs font-bold text-slate-500 ml-1">kWh / an</span>
                </div>
                <span className="text-xs text-slate-500">
                  Région {departmentCode} ({regionalBaseYield} kWh/kWc) • {orientationInfo.orientationLabel}
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Gain Annuel (An 1)
                </span>
                <div className="my-1.5">
                  <span className="text-3xl font-black text-emerald-600">+{totalAnnualBenefitYear1.toLocaleString('fr-FR')}</span>
                  <span className="text-xs font-bold text-slate-500 ml-1">€ / an</span>
                </div>
                <span className="text-xs text-slate-500">
                  Autoconso ({annualSavingsAutoconso}€) + Surplus ({annualRevenueSurplus}€)
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-500" /> Amortissement
                </span>
                <div className="my-1.5">
                  <span className="text-3xl font-black text-purple-600">{paybackYear}</span>
                  <span className="text-xs font-bold text-slate-500 ml-1">ans</span>
                </div>
                <span className="text-xs text-slate-500">
                  Investissement : {totalInvestmentHT.toLocaleString('fr-FR')} € HT
                </span>
              </div>
            </div>

            {/* Graphique de rentabilité avec POINT D'AMORTISSEMENT VISIBLE */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Projection Financière des Gains Cumulés (25 ans)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Calcul intégrant une inflation de l'électricité de {autoSettings.defaultElectricityInflation}%/an et le rachat surplus garanti.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold block">Gains cumulés sur 25 ans</span>
                  <span className="text-xl font-black text-emerald-600">+{totalGains25Years.toLocaleString('fr-FR')} €</span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData25Years} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gainGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                    <Tooltip
                      formatter={(val) => [`${val.toLocaleString('fr-FR')} €`, 'Gain net cumulé']}
                      labelFormatter={(label) => `Échéance : ${label}`}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    
                    {/* POINT D'AMORTISSEMENT ROUGE VIF SUR LE GRAPHIQUE */}
                    <ReferenceLine x={`An ${paybackYear}`} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} />
                    <ReferenceDot
                      x={`An ${paybackYear}`}
                      y={0}
                      r={7}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      label={{
                        value: `Point d'amortissement (${paybackYear} ans)`,
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    />

                    <Area type="monotone" dataKey="gain" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gainGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hypothèses techniques */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Surface délimitée</span>
                <strong className="text-slate-800 text-sm">{roofSurface} m²</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Orientation & Pente</span>
                <strong className="text-slate-800 text-sm">{orientationInfo.orientationLabel} • {selectedPitch}°</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Taux Autoconsommation</span>
                <strong className="text-slate-800 text-sm">{customAutoconsoRate} % ({autoconsoKwh} kWh)</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Tarif électricité réseau</span>
                <strong className="text-slate-800 text-sm">{autoSettings.defaultValorisationAutoconso} €/kWh</strong>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Modifier
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
