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
import { computeValidSolarSlots } from '@/utils/solarCalepinage';

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
  const [mapZoom, setMapZoom] = useState(19);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [roofSurface, setRoofSurface] = useState(1179);

  // Orientation & Pente & Type de toiture
  const [roofType, setRoofType] = useState('asymetrique'); // 'asymetrique' | 'symetrique'
  const [selectedRidgeIndex, setSelectedRidgeIndex] = useState(0);
  const [orientationInfo, setOrientationInfo] = useState({
    orientationKey: 'south',
    orientationLabel: 'Plein Sud (0°)',
    azimuthDeg: 0,
    angle: 0,
    ridgeIndex: 0
  });
  const [selectedPitch, setSelectedPitch] = useState(30);

  const [userSelectedKwc, setUserSelectedKwc] = useState(null);

  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  // Capacité maximale installable selon calepinage géométrique strict (panneaux 465 Wc portrait parallèle à la sablière)
  const maxInstallableRoof = useMemo(() => {
    if (!polygonPoints || polygonPoints.length < 3) {
      const p = Math.max(1, Math.round(roofSurface / 2.05));
      const kw = Math.round(p * 0.465 * 10) / 10;
      return { maxPanels: p, maxKwc: kw };
    }
    try {
      const { maxPanels } = computeValidSolarSlots(polygonPoints, selectedRidgeIndex, false);
      const kw = Math.round(maxPanels * 0.465 * 10) / 10;
      return { maxPanels: Math.max(1, maxPanels), maxKwc: kw };
    } catch {
      const p = Math.max(1, Math.round(roofSurface / 2.05));
      return { maxPanels: p, maxKwc: Math.round(p * 0.465 * 10) / 10 };
    }
  }, [polygonPoints, roofSurface, selectedRidgeIndex]);

  // Puissance installée effective (par défaut: puissance maximale optimisée)
  const installedKwc = useMemo(() => {
    const maxK = maxInstallableRoof.maxKwc || 100;
    if (userSelectedKwc !== null && userSelectedKwc <= maxK && userSelectedKwc >= 0) {
      return Math.round(userSelectedKwc * 10) / 10;
    }
    return maxK;
  }, [maxInstallableRoof, userSelectedKwc]);

  const panelCount = useMemo(() => {
    if (installedKwc <= 0) return 0;
    return Math.max(0, Math.round((installedKwc * 1000) / 465));
  }, [installedKwc]);

  const installedSurfaceM2 = useMemo(() => {
    return Math.round(panelCount * 1.762 * 1.134);
  }, [panelCount]);

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

  const regionalBaseYield = useMemo(() => {
    return getProductionForDepartment(departmentCode);
  }, [departmentCode]);

  const inclinationCoeff = useMemo(() => {
    if (selectedPitch === 30) return 1.00;
    if (selectedPitch === 15 || selectedPitch === 45) return 0.96;
    if (selectedPitch === 0 || selectedPitch > 45) return 0.90;
    return 1.00;
  }, [selectedPitch]);

  // ─── Calcul de répartition et pondération du productible (Symétrique vs Asymétrique) ─
  const panBreakdown = useMemo(() => {
    const totalMaxKwc = maxInstallableRoof.maxKwc || 100;
    const totalMaxPanels = maxInstallableRoof.maxPanels || 1;
    const currentKwc = installedKwc;
    const currentPanels = panelCount;

    if (roofType !== 'symetrique' || !orientationInfo?.pan1 || !orientationInfo?.pan2) {
      const key = orientationInfo?.orientationKey || 'south';
      const coeff = orientationInfo?.coeff || settings?.autoconsommation?.orientationCoefficients?.[key]?.coeff || 1.00;
      return {
        isSymetrique: false,
        bestPan: {
          name: 'Pan unique',
          label: orientationInfo?.orientationLabel || 'Plein Sud (0°)',
          rawLabel: orientationInfo?.rawOrientationLabel || 'Plein Sud',
          coeff,
          maxKwc: totalMaxKwc,
          maxPanels: totalMaxPanels,
          installedKwc: currentKwc,
          installedPanels: currentPanels,
          fillRatio: totalMaxKwc > 0 ? (currentKwc / totalMaxKwc) : 1,
          specificYield: Math.round(regionalBaseYield * coeff * inclinationCoeff),
          productionKwh: Math.round(currentKwc * regionalBaseYield * coeff * inclinationCoeff)
        },
        worstPan: null,
        effectiveOrientationCoeff: coeff,
        weightedSpecificYield: Math.round(regionalBaseYield * coeff * inclinationCoeff),
        totalProductionKwh: Math.round(currentKwc * regionalBaseYield * coeff * inclinationCoeff)
      };
    }

    // Mode Symétrique (2 pans)
    const pan1 = orientationInfo.pan1;
    const pan2 = orientationInfo.pan2;

    const coeff1 = pan1.coeff || 1.00;
    const coeff2 = pan2.coeff || 0.75;

    // Capacité maximale par pan (50% chacun)
    const maxPanels1 = Math.round(totalMaxPanels / 2);
    const maxPanels2 = totalMaxPanels - maxPanels1;
    const maxKwc1 = Math.round((totalMaxKwc / 2) * 10) / 10;
    const maxKwc2 = Math.round((totalMaxKwc - maxKwc1) * 10) / 10;

    // Calcul du productible unitaire (kWh/kWc/an) de chaque versant
    const specificYield1 = Math.round(regionalBaseYield * coeff1 * inclinationCoeff);
    const specificYield2 = Math.round(regionalBaseYield * coeff2 * inclinationCoeff);

    // Priorité absolue sur le versant ayant le MEILLEUR productible (kWh/kWc)
    // En cas d'égalité, on départage par le plus grand coefficient ou le plus faible écart au Sud
    const dev1 = Math.abs(pan1.angle !== undefined ? pan1.angle : (pan1.absSouthDeviation || 0));
    const dev2 = Math.abs(pan2.angle !== undefined ? pan2.angle : (pan2.absSouthDeviation || 0));
    const isPan1Better = specificYield1 !== specificYield2
      ? (specificYield1 > specificYield2)
      : (coeff1 !== coeff2 ? (coeff1 > coeff2) : (dev1 <= dev2));

    const bestPanConfig = isPan1Better
      ? { id: 'pan1', panNum: 1, info: pan1, coeff: coeff1, specificYield: specificYield1, maxKwc: maxKwc1, maxPanels: maxPanels1 }
      : { id: 'pan2', panNum: 2, info: pan2, coeff: coeff2, specificYield: specificYield2, maxKwc: maxKwc2, maxPanels: maxPanels2 };

    const worstPanConfig = isPan1Better
      ? { id: 'pan2', panNum: 2, info: pan2, coeff: coeff2, specificYield: specificYield2, maxKwc: maxKwc2, maxPanels: maxPanels2 }
      : { id: 'pan1', panNum: 1, info: pan1, coeff: coeff1, specificYield: specificYield1, maxKwc: maxKwc1, maxPanels: maxPanels1 };

    // Allocation des panneaux : remplissage du versant au meilleur productible en priorité absolue
    let installedPanelsBest = 0;
    let installedPanelsWorst = 0;
    let installedKwcBest = 0;
    let installedKwcWorst = 0;

    if (currentPanels <= bestPanConfig.maxPanels) {
      installedPanelsBest = currentPanels;
      installedPanelsWorst = 0;
      installedKwcBest = currentKwc;
      installedKwcWorst = 0;
    } else {
      installedPanelsBest = bestPanConfig.maxPanels;
      installedPanelsWorst = currentPanels - bestPanConfig.maxPanels;
      installedKwcBest = bestPanConfig.maxKwc;
      installedKwcWorst = Math.max(0, Math.round((currentKwc - bestPanConfig.maxKwc) * 10) / 10);
    }

    // Calcul du coefficient effectif pondéré et de la production totale
    const effectiveOrientationCoeff = currentKwc > 0
      ? ((installedKwcBest * bestPanConfig.coeff) + (installedKwcWorst * worstPanConfig.coeff)) / currentKwc
      : bestPanConfig.coeff;

    const weightedSpecificYield = Math.round(regionalBaseYield * effectiveOrientationCoeff * inclinationCoeff);

    const prodKwhBest = Math.round(installedKwcBest * bestPanConfig.specificYield);
    const prodKwhWorst = Math.round(installedKwcWorst * worstPanConfig.specificYield);
    const totalProductionKwh = prodKwhBest + prodKwhWorst;

    return {
      isSymetrique: true,
      bestPan: {
        id: bestPanConfig.id,
        panNum: bestPanConfig.panNum,
        label: bestPanConfig.info.orientationLabel,
        rawLabel: bestPanConfig.info.rawLabel,
        angle: bestPanConfig.info.angle,
        coeff: bestPanConfig.coeff,
        maxKwc: bestPanConfig.maxKwc,
        maxPanels: bestPanConfig.maxPanels,
        installedKwc: installedKwcBest,
        installedPanels: installedPanelsBest,
        fillRatio: bestPanConfig.maxKwc > 0 ? (installedKwcBest / bestPanConfig.maxKwc) : 0,
        specificYield: bestPanConfig.specificYield,
        productionKwh: prodKwhBest
      },
      worstPan: {
        id: worstPanConfig.id,
        panNum: worstPanConfig.panNum,
        label: worstPanConfig.info.orientationLabel,
        rawLabel: worstPanConfig.info.rawLabel,
        angle: worstPanConfig.info.angle,
        coeff: worstPanConfig.coeff,
        maxKwc: worstPanConfig.maxKwc,
        maxPanels: worstPanConfig.maxPanels,
        installedKwc: installedKwcWorst,
        installedPanels: installedPanelsWorst,
        fillRatio: worstPanConfig.maxKwc > 0 ? (installedKwcWorst / worstPanConfig.maxKwc) : 0,
        specificYield: worstPanConfig.specificYield,
        productionKwh: prodKwhWorst
      },
      effectiveOrientationCoeff,
      weightedSpecificYield,
      totalProductionKwh
    };
  }, [roofType, orientationInfo, maxInstallableRoof, installedKwc, panelCount, regionalBaseYield, inclinationCoeff, settings]);

  const effectiveOrientationCoeff = panBreakdown.effectiveOrientationCoeff;
  const annualProductionKwh = panBreakdown.totalProductionKwh;

  // Tarif EDF OA avec tranches dynamiques (0.011 €/kWh pour <100 kWc, 0.085 €/kWh pour >=100 kWc)
  const tarifEdfOaKwh = useMemo(() => {
    const oaTarifs = toitureSettings?.tarifsAchatEdfOa || [];
    const match = oaTarifs.find(t => installedKwc > (t.minKwc || 0) && installedKwc <= (t.maxKwc || 1000));
    if (match && match.tarifAchatKwh !== undefined) return Number(match.tarifAchatKwh);
    if (installedKwc >= 100) return 0.085;
    return 0.011;
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
        mapCenter,
        mapZoom,
        polygonPoints,
        ridgeIndex: selectedRidgeIndex,
        isLandscape: false,
        kwc: installedKwc,
        roofSurface,
        roofType,
        pan1: orientationInfo?.pan1,
        pan2: orientationInfo?.pan2,
        pitch: selectedPitch,
        orientationLabel: orientationInfo.orientationLabel,
        effectiveOrientationCoeff,
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
    mapCenter, mapZoom, polygonPoints, selectedRidgeIndex, selectedPitch, roofType, orientationInfo, effectiveOrientationCoeff, annualProductionKwh, tarifEdfOaKwh, annualRevenueReventeTotale,
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
                  {roofType === 'symetrique' ? 'Orientation de la toiture symétrique' : 'Orientation de la toiture'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {roofType === 'symetrique'
                    ? 'Le faîtage est positionné au centre du rectangle (2 versants opposés à 50% de puissance chacun).'
                    : 'Cliquez sur le faîtage (ligne rouge) pour déterminer l\'exposition du pan de toiture.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Sélecteur de type de bâtiment Asymétrique / Symétrique */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setRoofType('asymetrique')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      roofType === 'asymetrique'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    Asymétrique
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoofType('symetrique')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      roofType === 'symetrique'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    Symétrique
                  </button>
                </div>

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
              roofType={roofType}
              onRoofTypeChange={setRoofType}
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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refaire une simulation
                </button>
              </div>
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
                <div className="text-[10px] font-bold text-slate-500">
                  {roofType === 'symetrique' ? (
                    <span className="text-blue-700 font-extrabold">
                      Rendement pondéré : {panBreakdown.weightedSpecificYield} kWh/kWc
                    </span>
                  ) : (
                    <span>{orientationInfo.orientationLabel} ({panBreakdown.weightedSpecificYield} kWh/kWc)</span>
                  )}
                </div>
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

            {/* Sélecteur & Ajustement de la Puissance Installée (Curseur interactif + Boutons Presets) */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
              {/* Ligne 1 : Titre / Infos Toiture + 4 Boutons de raccourci */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Optimisation de la centrale photovoltaïque</h4>
                    <p className="text-xs text-slate-500">
                      Toiture de <strong>{roofSurface} m²</strong> : Capacité max de <strong className="text-emerald-700">{maxInstallableRoof.maxKwc} kWc</strong> ({maxInstallableRoof.maxPanels} panneaux de 465 Wc)
                    </p>
                  </div>
                </div>

                {/* 4 Boutons de sélection rapide */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 mr-1">Choisir la puissance :</span>
                  {[1, 0.75, 0.5, 0.25].map((ratio) => {
                    const kw = Math.round(maxInstallableRoof.maxKwc * ratio * 10) / 10;
                    const isSelected = Math.abs(installedKwc - kw) < 0.2;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setUserSelectedKwc(kw)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? 'bg-[#0e2b4d] text-white shadow-md shadow-blue-900/20 ring-2 ring-[#0e2b4d]'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {ratio === 1 ? `Max (${kw} kWc)` : `${kw} kWc (${Math.round(ratio * 100)}%)`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ligne 2 : Curseur déplaçable (Slider) de 0 à la puissance Max */}
              <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-50/70 p-3 rounded-2xl">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-extrabold text-slate-700">Puissance réglable :</span>
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white flex items-center gap-1.5 shadow-2xs">
                    <Zap className="w-3.5 h-3.5 fill-white text-white" />
                    {installedKwc} kWc
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    ({panelCount} panneaux • {Math.round(maxInstallableRoof.maxKwc > 0 ? (installedKwc / maxInstallableRoof.maxKwc) * 100 : 0)}%)
                  </span>
                </div>

                <div className="flex-1 flex items-center gap-3 w-full">
                  <span className="text-[11px] font-extrabold text-slate-400 shrink-0">0 kWc</span>
                  <input
                    type="range"
                    min={0}
                    max={maxInstallableRoof.maxKwc || 100}
                    step={0.1}
                    value={installedKwc}
                    onChange={(e) => setUserSelectedKwc(parseFloat(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0e2b4d] focus:outline-none"
                  />
                  <span className="text-[11px] font-black text-[#0e2b4d] shrink-0">
                    {maxInstallableRoof.maxKwc} kWc
                  </span>
                </div>
              </div>

              {/* Ligne 3 : Détail de la répartition bi-pans et du rendement pondéré (Symétrique) */}
              {roofType === 'symetrique' && panBreakdown?.isSymetrique && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      Répartition par versant &amp; Productible pondéré ({panBreakdown.weightedSpecificYield} kWh/kWc/an)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                      Priorité automatique sur le versant le plus productif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Versant 1 (Meilleure exposition) */}
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                          Versant {panBreakdown.bestPan.panNum} : {panBreakdown.bestPan.label}
                        </span>
                        <span className="text-[11px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-lg shadow-2xs">
                          {panBreakdown.bestPan.specificYield} kWh/kWc
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
                        <span>{panBreakdown.bestPan.installedKwc} kWc ({panBreakdown.bestPan.installedPanels} pan.)</span>
                        <span className="text-emerald-700 text-[11px]">Capacité : {panBreakdown.bestPan.maxKwc} kWc</span>
                      </div>
                      <div className="w-full bg-emerald-200/80 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round(panBreakdown.bestPan.fillRatio * 100))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold pt-0.5">
                        <span>Production annuelle :</span>
                        <span className="font-black text-emerald-950">{panBreakdown.bestPan.productionKwh.toLocaleString('fr-FR')} kWh/an</span>
                      </div>
                    </div>

                    {/* Versant 2 (Exposition opposée) */}
                    <div className={`rounded-2xl p-3.5 flex flex-col justify-between space-y-2 border transition-all shadow-2xs ${
                      panBreakdown.worstPan.installedKwc > 0
                        ? 'bg-blue-50/90 border-blue-200'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ring-2 ${
                            panBreakdown.worstPan.installedKwc > 0 ? 'bg-blue-500 ring-blue-200' : 'bg-slate-400 ring-slate-200'
                          }`} />
                          Versant {panBreakdown.worstPan.panNum} : {panBreakdown.worstPan.label}
                        </span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg shadow-2xs ${
                          panBreakdown.worstPan.installedKwc > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {panBreakdown.worstPan.specificYield} kWh/kWc
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-800 font-bold">
                        <span>
                          {panBreakdown.worstPan.installedKwc > 0
                            ? `${panBreakdown.worstPan.installedKwc} kWc (${panBreakdown.worstPan.installedPanels} pan.)`
                            : '0 panneau (Versant préservé)'}
                        </span>
                        <span className="text-slate-500 text-[11px]">Capacité : {panBreakdown.worstPan.maxKwc} kWc</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round(panBreakdown.worstPan.fillRatio * 100))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold pt-0.5">
                        <span>Production annuelle :</span>
                        <span className="font-black text-slate-900">{panBreakdown.worstPan.productionKwh.toLocaleString('fr-FR')} kWh/an</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visuel Avant / Après de l'implantation des panneaux sur la toiture */}
            <SolarRoofBeforeAfterViewer
              center={mapCenter}
              polygonPoints={polygonPoints}
              roofSurface={roofSurface}
              customKwc={installedKwc}
              panelCount={panelCount}
              ridgeIndex={selectedRidgeIndex}
              isLandscape={false}
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
