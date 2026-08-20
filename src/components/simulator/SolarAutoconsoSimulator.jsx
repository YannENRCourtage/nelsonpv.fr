import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Search, ChevronRight, ChevronLeft, Sun, Zap,
  Compass, ArrowUpRight, TrendingUp, CheckCircle2, RotateCcw,
  Sparkles, Save, FileDown, ShieldCheck, HelpCircle, Loader2,
  ArrowRight, Euro, Car, Award, Leaf
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ReferenceLine } from 'recharts';
import { useSimulatorSettingsStore, getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';
import RoofMapPolygonSelector from './RoofMapPolygonSelector';
import SolarRoofBeforeAfterViewer from './SolarRoofBeforeAfterViewer';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';
import { computeValidSolarSlots } from '@/utils/solarCalepinage';

export default function SolarAutoconsoSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { settings, getSolarPriceForKwc, getDefaultAutoconsoRate } = useSimulatorSettingsStore();
  const autoSettings = settings.autoconsommation;

  // ─── Étapes du Tunnel : 1. Toiture (sub 1..5) | 2. Consommation (sub 6) | 3. Résultat (sub 7) ───
  const [currentStep, setCurrentStep] = useState(1);

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
  const [mapZoom, setMapZoom] = useState(19);

  // Étape 3 : Polygone & Surface
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [roofSurface, setRoofSurface] = useState(83);

  // Étape 4 : Orientation
  const [selectedRidgeIndex, setSelectedRidgeIndex] = useState(0);
  const [orientationInfo, setOrientationInfo] = useState({
    orientationKey: 'south',
    orientationLabel: 'Plein Sud (0°)',
    angle: 0
  });

  // Étape 5 : Inclinaison
  const [selectedPitch, setSelectedPitch] = useState(30);

  // ─── Étape 6 : Votre Consommation (Fidèle à l'image 5 de enr-courtage.fr) ─────
  const [consoKwh, setConsoKwh] = useState(5000);
  const [annualBillEuro, setAnnualBillEuro] = useState(1250);
  const [lastEditedConso, setLastEditedConso] = useState('kwh'); // 'kwh' | 'euro'
  const [evCount, setEvCount] = useState(0); // 0, 1, 2, 3

  // Synchronisation kWh <-> Facture €
  const handleConsoKwhChange = (val) => {
    const kwh = Number(val) || 0;
    setConsoKwh(kwh);
    setLastEditedConso('kwh');
    setAnnualBillEuro(Math.round(kwh * (autoSettings.defaultValorisationAutoconso || 0.26)));
  };

  const handleBillEuroChange = (val) => {
    const euro = Number(val) || 0;
    setAnnualBillEuro(euro);
    setLastEditedConso('euro');
    setConsoKwh(Math.round(euro / (autoSettings.defaultValorisationAutoconso || 0.26)));
  };

  // Étape 7 : Dimensionnement & Choix Puissance
  const [customKwc, setCustomKwc] = useState(6);
  const [customAutoconsoRate, setCustomAutoconsoRate] = useState(65);

  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  // Pré-remplissage avec projet CRM
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
      if (selectedProject.kwc) setCustomKwc(Number(selectedProject.kwc));
    }
  }, [selectedProject]);

  // Recherche BAN (uniquement lors de la saisie active)
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

  // Capacité géométrique maximale d'accueil de la toiture
  const maxInstallableRoof = useMemo(() => {
    if (!polygonPoints || polygonPoints.length < 3) return { slots: [], maxPanels: 999, maxKwc: 999 };
    return computeValidSolarSlots(polygonPoints);
  }, [polygonPoints]);

  // Recommandation intelligente de puissance basée sur la consommation + VE (plafonnée par la toiture)
  const recommendedKwc = useMemo(() => {
    const totalNeedKwh = consoKwh + (evCount * 2200);
    let target = 3;
    if (totalNeedKwh <= 4000) target = 3;
    else if (totalNeedKwh <= 7500) target = 6;
    else if (totalNeedKwh <= 12000) target = 9;
    else if (totalNeedKwh <= 20000) target = 15;
    else if (totalNeedKwh <= 32000) target = 22;
    else target = 36;

    const availablePowers = [3, 6, 9, 15, 22, 36].filter(kw => {
      const neededPanels = Math.round((kw * 1000) / 465);
      return neededPanels <= maxInstallableRoof.maxPanels;
    });

    if (availablePowers.length === 0) return 3;
    if (availablePowers.includes(target)) return target;
    const validLower = availablePowers.filter(p => p <= target);
    if (validLower.length > 0) return validLower[validLower.length - 1];
    return availablePowers[0];
  }, [consoKwh, evCount, maxInstallableRoof]);

  useEffect(() => {
    setCustomKwc(recommendedKwc);
    setCustomAutoconsoRate(getDefaultAutoconsoRate(recommendedKwc));
  }, [recommendedKwc, getDefaultAutoconsoRate]);

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

  // Investissement Total HT calculé via le barème
  const totalInvestmentHT = useMemo(() => {
    return getSolarPriceForKwc(customKwc);
  }, [customKwc, getSolarPriceForKwc]);

  // Nom du client dynamique
  const [clientNameInput, setClientNameInput] = useState(selectedProject?.name || selectedProject?.lastName || '');

  // 30 ans de projection financière
  const chartData30Years = useMemo(() => {
    const data = [];
    let cumulativeGain = -totalInvestmentHT;
    const inflation = (autoSettings.defaultElectricityInflation || 3.5) / 100;

    for (let year = 1; year <= 30; year++) {
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
    const item = chartData30Years.find(d => d.gain >= 0);
    return item ? item.year.replace('An ', '') : '8';
  }, [chartData30Years]);

  const totalGains30Years = useMemo(() => {
    const last = chartData30Years[chartData30Years.length - 1];
    return last ? last.gain : 0;
  }, [chartData30Years]);

  // Génération automatique et fiable de la vue satellite
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
        type: 'autoconsommation',
        title: `Autoconsommation ${customKwc} kWc — ${clientNameInput || cityName || 'Projet'}`,
        clientName: clientNameInput || cityName,
        address: addressInput,
        cityName,
        departmentCode,
        mapCenter,
        mapZoom,
        polygonPoints,
        kwc: customKwc,
        roofSurface,
        pitch: selectedPitch,
        orientationLabel: orientationInfo.orientationLabel,
        consoKwh,
        annualBillEuro,
        evCount,
        recommendedKwc,
        regionalBaseYield,
        annualProductionKwh,
        autoconsoRate: customAutoconsoRate,
        autoconsoKwh,
        surplusKwh,
        annualSavingsAutoconso,
        annualRevenueSurplus,
        annualBenefitYear1: totalAnnualBenefitYear1,
        totalInvestmentHT,
        paybackYear,
        totalGains30Years,
        totalGains25Years: totalGains30Years,
        mapScreenshot: mapScreenshotDataUrl
      });
    }
  }, [
    customKwc, cityName, clientNameInput, addressInput, departmentCode, mapCenter, mapZoom, polygonPoints,
    roofSurface, selectedPitch, orientationInfo, consoKwh, annualBillEuro, evCount, recommendedKwc,
    regionalBaseYield, annualProductionKwh, customAutoconsoRate, autoconsoKwh,
    surplusKwh, annualSavingsAutoconso, annualRevenueSurplus, totalAnnualBenefitYear1, totalInvestmentHT, paybackYear,
    totalGains30Years, mapScreenshotDataUrl, onStateUpdate
  ]);

  return (
    <div className="w-full space-y-4">
      
      {/* ─── BANDEAU SUPÉRIEUR (DESIGN ENR-COURTAGE.FR) ───────────────────── */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Autoconsommation <span className="text-amber-400">Photovoltaïque</span>
            </h2>
            <p className="text-sm text-slate-300 mt-0.5 max-w-2xl">
              Réduisez vos factures d'électricité et valorisez le surplus de production de votre toiture.
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
                {cityName} ({departmentCode}) — {regionalBaseYield} kWh/kWc
              </span>
            </div>
          </div>
        </div>

        {/* ─── NAVIGATION EN 3 BLOCS MAJEURS (Votre toiture / Votre consommation / Votre résultat) ─ */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-1">
          {[
            { step: 1, label: '1. Adresse' },
            { step: 2, label: '2. Emplacement' },
            { step: 3, label: '3. Surface' },
            { step: 4, label: '4. Orientation' },
            { step: 5, label: '5. Inclinaison' },
            { step: 6, label: '6. Consommation' },
            { step: 7, label: '7. Résultat' }
          ].map((item) => {
            const isDone = item.step < currentStep;
            const isCurrent = item.step === currentStep;
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

        {/* Étape 1 : Adresse */}
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
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    setIsAddressSelected(false);
                  }}
                  placeholder="Saisissez une adresse postale ou une commune..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-base font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
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

        {/* Étape 2 : Emplacement */}
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
                  Repérons votre toiture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faites glisser la carte et zoomez librement pour positionner votre toiture sous le curseur vert.
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
                    const offsetLat = 0.00008;
                    const offsetLng = 0.00012;
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
              onCenterChange={(newCenter) => setMapCenter(newCenter)}
              polygonPoints={polygonPoints}
              onPolygonChange={setPolygonPoints}
              mapContainerRef={mapContainerRef}
            />
          </motion.div>
        )}

        {/* Étape 3 : Surface (Drag des 4 coins totalement libre) */}
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
                  Calculons la surface de votre toiture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Déplacez les 4 coins vert fluo (1, 2, 3, 4) du pan de toiture pouvant accueillir des panneaux solaires.
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
              selectedRidgeIndex={selectedRidgeIndex}
              onRidgeSelect={setSelectedRidgeIndex}
              orientationInfo={orientationInfo}
              onOrientationChange={setOrientationInfo}
              mapContainerRef={mapContainerRef}
            />
          </motion.div>
        )}

        {/* Étape 4 : Orientation */}
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
                  Déterminons l'orientation de votre toiture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliquez sur le faîtage (côté le plus haut en rouge) pour orienter la pente.
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

        {/* Étape 5 : Inclinaison */}
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
                  Quelle est l'inclinaison de votre toiture ?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez l'angle de pente le plus proche de votre toiture.
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
                  onClick={() => setCurrentStep(6)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Passer à la consommation
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

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-xs text-slate-600 leading-relaxed text-center">
              💡 <em>Si vous ne connaissez pas l'inclinaison exacte de votre toiture, choisissez 30°.<br />Il s'agit de la configuration la plus courante en France.</em>
            </div>
          </motion.div>
        )}

        {/* ─── Étape 6 : VOTRE CONSOMMATION (IMAGE 5 ENR-COURTAGE.FR) ──────── */}
        {currentStep === 6 && (
          <motion.div
            key="step-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5"
          >
            {/* Titre et Boutons d'Action Alignés en Haut */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Quelle est votre consommation d'électricité ?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Indiquez votre consommation annuelle en kWh ou le montant de votre facture.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await ensureMapSnapshot();
                    setCurrentStep(7);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  Valider ma consommation
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              
              {/* Option 1 : Consommation en kWh */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left shadow-2xs">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">
                  Je connais ma consommation en kWh :
                </label>
                <div className="flex items-center rounded-xl overflow-hidden border-2 border-slate-200 focus-within:border-emerald-500 bg-white shadow-inner">
                  <input
                    type="number"
                    min="1000"
                    max="50000"
                    step="250"
                    value={consoKwh}
                    onChange={(e) => handleConsoKwhChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-lg font-black text-slate-900 focus:outline-none"
                  />
                  <span className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs">
                    kWh / an
                  </span>
                </div>
              </div>

              {/* Séparateur OU */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs font-black text-slate-400 uppercase absolute">OU</span>
              </div>

              {/* Option 2 : Facture annuelle en € */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left shadow-2xs">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">
                  Je connais le montant de ma facture annuelle :
                </label>
                <div className="flex items-center rounded-xl overflow-hidden border-2 border-slate-200 focus-within:border-emerald-500 bg-white shadow-inner">
                  <input
                    type="number"
                    min="200"
                    max="15000"
                    step="50"
                    value={annualBillEuro}
                    onChange={(e) => handleBillEuroChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-lg font-black text-slate-900 focus:outline-none"
                  />
                  <span className="px-4 py-2.5 bg-teal-600 text-white font-bold text-xs">
                    € / an
                  </span>
                </div>
              </div>

              {/* Véhicules électriques */}
              <div className="pt-2 text-left">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Possédez-vous un ou plusieurs véhicules électriques ?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, '3+'].map((n, idx) => {
                    const val = idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEvCount(val)}
                        className={`py-2.5 rounded-xl font-black text-sm transition-all border ${
                          evCount === val
                            ? 'bg-[#0e2b4d] text-white border-[#0e2b4d] shadow-md scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ─── Étape 7 : RÉSULTAT & CONSEIL DE PUISSANCE PERSONNALISÉ ──────── */}
        {currentStep === 7 && (
          <motion.div
            key="step-7"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Conseil Intelligent de Puissance */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                    Conseil Personnalisé NELSON
                  </span>
                  <p className="text-sm text-slate-800 font-medium">
                    Pour vos <strong>{consoKwh.toLocaleString('fr-FR')} kWh/an</strong> {evCount > 0 ? `(+ ${evCount} VE)` : ''}, nous vous conseillons une installation de <strong className="text-emerald-700 text-base">{recommendedKwc} kWc</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                {[3, 6, 9, 15, 22, 36].map((kw) => {
                  const neededPanels = Math.round((kw * 1000) / 465);
                  const isAllowed = neededPanels <= maxInstallableRoof.maxPanels;

                  if (!isAllowed) {
                    return (
                      <button
                        key={kw}
                        type="button"
                        disabled={true}
                        title={`Surface de toiture insuffisante pour ${kw} kWc (Capacité max : ${maxInstallableRoof.maxKwc} kWc)`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100/70 text-slate-300 cursor-not-allowed border border-dashed border-slate-200"
                      >
                        {kw} kWc
                      </button>
                    );
                  }

                  return (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        setCustomKwc(kw);
                        setCustomAutoconsoRate(getDefaultAutoconsoRate(kw));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        customKwc === kw
                          ? 'bg-emerald-600 text-white shadow-sm scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {kw} kWc {kw === recommendedKwc ? '⭐' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Cartes de Synthèse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" /> Puissance
                </span>
                <div className="my-1.5">
                  <span className="text-3xl font-black text-slate-900">{customKwc}</span>
                  <span className="text-base font-bold text-slate-500 ml-1">kWc</span>
                </div>
                <span className="text-xs text-slate-500">
                  Surface toiture : {roofSurface} m²
                </span>
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

            {/* Visuel Avant / Après de l'implantation des panneaux sur la toiture */}
            <SolarRoofBeforeAfterViewer
              center={mapCenter}
              polygonPoints={polygonPoints}
              roofSurface={roofSurface}
              customKwc={customKwc}
              orientationInfo={orientationInfo}
              consoKwh={consoKwh}
              annualProductionKwh={annualProductionKwh}
            />

            {/* Graphique Financier 30 ans */}
            <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-lg font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Projection Financière des Gains Cumulés (30 ans)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Calcul intégrant une inflation de l'électricité de {autoSettings.defaultElectricityInflation}%/an et le rachat du surplus garanti EDF OA.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-300 font-bold block">Gains cumulés sur 30 ans</span>
                  <span className="text-2xl font-black text-emerald-400">+{totalGains30Years.toLocaleString('fr-FR')} €</span>
                </div>
              </div>

              {/* 3 Cartes Milestones 10 ans / 20 ans / 30 ans sans padding inutile au-dessus */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block">sur 10 ans</span>
                  <span className="text-2xl font-black text-white block mt-0.5">
                    +{(chartData30Years[9]?.gain > 0 ? chartData30Years[9]?.gain : 0).toLocaleString('fr-FR')} €
                  </span>
                </div>

                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block">sur 20 ans</span>
                  <span className="text-2xl font-black text-white block mt-0.5">
                    +{(chartData30Years[19]?.gain > 0 ? chartData30Years[19]?.gain : 0).toLocaleString('fr-FR')} €
                  </span>
                </div>

                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                  <span className="text-xs font-bold text-slate-300 block">sur 30 ans</span>
                  <span className="text-2xl font-black text-emerald-400 block mt-0.5">
                    +{totalGains30Years.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData30Years} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gainGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                    <Tooltip
                      formatter={(val) => [`${val.toLocaleString('fr-FR')} €`, 'Gain net cumulé']}
                      labelFormatter={(label) => `Échéance : ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#ffffff', fontSize: 12 }}
                    />
                    
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

            {/* ─── SECTION IMPACT SUR L'ENVIRONNEMENT ───────────── */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Votre impact sur l'environnement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs text-center">
                  <span className="text-2xl font-black text-emerald-700 block">
                    {(Math.round((annualProductionKwh * 0.0005) * 10) / 10).toLocaleString('fr-FR')} tonnes
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">de CO₂ évitées par an</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs text-center">
                  <span className="text-2xl font-black text-emerald-700 block">
                    {Math.round(annualProductionKwh * 0.00143)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">arbres plantés par an</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs text-center">
                  <span className="text-2xl font-black text-teal-700 block">
                    {(Math.round((annualProductionKwh / 4500) * 10) / 10).toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">foyer(s) alimenté(s) en électricité</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Surface toiture</span>
                <strong className="text-slate-800 text-sm">{roofSurface} m²</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Orientation & Pente</span>
                <strong className="text-slate-800 text-sm">{orientationInfo.orientationLabel} • {selectedPitch}°</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Consommation annuelle</span>
                <strong className="text-slate-800 text-sm">{consoKwh.toLocaleString('fr-FR')} kWh/an</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Taux Autoconsommation</span>
                <strong className="text-slate-800 text-sm">{customAutoconsoRate} % ({autoconsoKwh} kWh)</strong>
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
