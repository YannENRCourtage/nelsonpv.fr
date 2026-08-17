import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Search, ChevronRight, ChevronLeft, Building2,
  Euro, TrendingUp, CheckCircle2, RotateCcw, Sparkles,
  Save, FileDown, ShieldCheck, HelpCircle, Loader2, Landmark
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useSimulatorSettingsStore, getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';
import RoofMapPolygonSelector from './RoofMapPolygonSelector';
import { toast } from '@/components/ui/use-toast';
import html2canvas from 'html2canvas';

export default function SolarRoofSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF
}) {
  const { settings } = useSimulatorSettingsStore();
  const toitureSettings = settings.toiturePv;

  // ─── État du tunnel (1: Adresse, 2: Emplacement, 3: Surface, 4: Orientation, 5: Inclinaison, 6: Modèle & Résultat) ───
  const [currentStep, setCurrentStep] = useState(1);

  // Étape 1 : Adresse
  const [addressInput, setAddressInput] = useState(selectedProject?.address || 'Zone Industrielle Nord, 32000 Auch');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('32');
  const [cityName, setCityName] = useState('Auch');

  // Coordonnées GPS
  const [mapCenter, setMapCenter] = useState([43.646, 0.585]);

  // Étape 3 : Polygone & Surface
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [roofSurface, setRoofSurface] = useState(500); // 500 m² défaut grande toiture

  // Étape 4 : Orientation
  const [selectedRidgeIndex, setSelectedRidgeIndex] = useState(0);
  const [orientationInfo, setOrientationInfo] = useState({
    orientationKey: 'south',
    orientationLabel: 'Plein Sud',
    angle: 180
  });

  // Étape 5 : Inclinaison
  const [selectedPitch, setSelectedPitch] = useState(15); // 15° classique pour bâtiment / hangar

  // Étape 6 : Modèle Économique (Revente Totale vs Location / Loyer)
  const [businessModel, setBusinessModel] = useState('revente_totale'); // 'revente_totale' | 'location_loyer'
  const [customKwc, setCustomKwc] = useState(100);

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

  // Autocomplétion API Adresse
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
        if (data && data.features) setSuggestions(data.features);
      } catch (err) {
        console.error('Erreur API Adresse:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 280);
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

  // Puissance installable : surface / ratio (défaut 5 m² / kWc)
  const calculatedKwcFromSurface = useMemo(() => {
    const ratio = toitureSettings.surfaceToPowerRatio || 5.0;
    const kwc = Math.round(roofSurface / ratio);
    return Math.max(36, kwc);
  }, [roofSurface, toitureSettings]);

  useEffect(() => {
    setCustomKwc(calculatedKwcFromSurface);
  }, [calculatedKwcFromSurface]);

  // ─── CALCULS FINANCIERS REVENTE TOTALE & LOCATION ────────────────────────────
  const regionalBaseYield = useMemo(() => {
    return getProductionForDepartment(departmentCode);
  }, [departmentCode]);

  const orientationCoeff = useMemo(() => {
    const key = orientationInfo.orientationKey || 'south';
    const cfg = settings.autoconsommation.orientationCoefficients[key];
    return cfg ? cfg.coeff : 1.00;
  }, [orientationInfo, settings]);

  const inclinationCoeff = useMemo(() => {
    if (selectedPitch === 30) return 1.00;
    if (selectedPitch === 15 || selectedPitch === 45) return 0.96;
    if (selectedPitch === 0 || selectedPitch > 45) return 0.90;
    return 0.96;
  }, [selectedPitch]);

  const annualProductionKwh = useMemo(() => {
    return Math.round(customKwc * regionalBaseYield * orientationCoeff * inclinationCoeff);
  }, [customKwc, regionalBaseYield, orientationCoeff, inclinationCoeff]);

  // Tarif EDF OA (€/kWh)
  const tarifEdfOaKwh = useMemo(() => {
    const tiers = toitureSettings.tarifsAchatEdfOa || [];
    const match = tiers.find(t => customKwc <= t.maxKwc) || tiers[tiers.length - 1];
    return match ? match.tarifAchatKwh : 0.1141;
  }, [customKwc, toitureSettings]);

  // Modèle 1 : Revente Totale
  const annualRevenueReventeTotale = useMemo(() => {
    return Math.round(annualProductionKwh * tarifEdfOaKwh);
  }, [annualProductionKwh, tarifEdfOaKwh]);

  const totalInvestmentHT = useMemo(() => {
    const costKwc = toitureSettings.installationCostPerKwc || 950;
    const raccord = toitureSettings.raccordementCostBase || 12000;
    return Math.round(customKwc * costKwc + raccord);
  }, [customKwc, toitureSettings]);

  // Modèle 2 : Location de Toiture (Loyer Annuel garanti au propriétaire)
  const annualRentLoyer = useMemo(() => {
    const rateM2 = toitureSettings.loyerAnnuelM2Toiture || 5.5;
    return Math.round(roofSurface * rateM2);
  }, [roofSurface, toitureSettings]);

  const totalRent20Years = annualRentLoyer * 20;

  // Projection financière sur 20 ans
  const chartData20Years = useMemo(() => {
    const data = [];
    let cumulRevente = -totalInvestmentHT;
    let cumulLoyer = 0;

    for (let year = 1; year <= 20; year++) {
      const turpe = (toitureSettings.turpeAnnualPerKwc || 12) * customKwc;
      const maintenance = (toitureSettings.maintenanceAnnualPerKwc || 10) * customKwc;
      const netAnnualRevente = annualRevenueReventeTotale - (turpe + maintenance);
      
      cumulRevente += netAnnualRevente;
      cumulLoyer += annualRentLoyer;

      data.push({
        year: `An ${year}`,
        reventeTotale: Math.round(cumulRevente),
        locationLoyer: Math.round(cumulLoyer)
      });
    }
    return data;
  }, [totalInvestmentHT, customKwc, annualRevenueReventeTotale, annualRentLoyer, toitureSettings]);

  const paybackReventeYear = useMemo(() => {
    const item = chartData20Years.find(d => d.reventeTotale >= 0);
    return item ? item.year.replace('An ', '') : '9';
  }, [chartData20Years]);

  // Snapshot pour PDF
  const takeMapSnapshot = async () => {
    if (mapContainerRef.current) {
      try {
        const canvas = await html2canvas(mapContainerRef.current, { scale: 1.5, useCORS: true });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setMapScreenshotDataUrl(dataUrl);
        return dataUrl;
      } catch (err) {
        console.warn('Screenshot error:', err);
      }
    }
    return null;
  };

  const handleSaveToArchives = async () => {
    const mapImg = await takeMapSnapshot();
    const simData = {
      type: 'toiture_pv',
      title: `Toiture Photovoltaïque ${customKwc} kWc (${roofSurface} m²) — ${cityName}`,
      address: addressInput,
      cityName,
      departmentCode,
      kwc: customKwc,
      roofSurface,
      pitch: selectedPitch,
      orientationLabel: orientationInfo.orientationLabel,
      orientationCoeff,
      inclinationCoeff,
      regionalBaseYield,
      annualProductionKwh,
      businessModel,
      tarifEdfOaKwh,
      annualRevenueReventeTotale,
      annualRentLoyer,
      totalRent20Years,
      totalInvestmentHT,
      paybackYear: businessModel === 'revente_totale' ? paybackReventeYear : 'Immédiat (0€ investi)',
      mapScreenshot: mapImg || mapScreenshotDataUrl,
      createdAt: new Date().toISOString(),
      projectId: selectedProject?.id || null
    };

    if (onSaveSimulation) {
      onSaveSimulation(simData);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* ═══ BANDEAU SUPÉRIEUR / PROGRESSION ENR COURTAGE ══════════════════════ */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div>
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-400 block mb-1">
              Simulateur Grandes Toitures &amp; Hangars
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Toiture <span className="text-amber-400">Photovoltaïque</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Valorisez votre bâtiment en revente totale d'électricité (EDF OA) ou profitez d'une location de toiture avec revenus garantis.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 self-end md:self-auto">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-white truncate max-w-[200px]">
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
            { step: 6, label: '6. Modèle & Bilan' }
          ].map((item) => {
            const isDone = item.step < currentStep;
            const isCurrent = item.step === currentStep;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-300'
                    : isDone
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isCurrent ? 'bg-white text-amber-900 font-black' : 'bg-white/20 text-white'}`}>
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

        {/* ── ÉTAPE 1 : ADRESSE ──────────────────────────────────────────────── */}
        {currentStep === 1 && (
          <motion.div
            key="roof-step-1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="max-w-xl mx-auto">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Où se situe votre bâtiment ou toiture ?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Renseignez l'adresse de votre bâtiment (hangar, entrepôt, usine, local commercial ou copropriété) pour simuler son potentiel photovoltaïque.
              </p>
            </div>

            <div className="max-w-xl mx-auto relative text-left">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Ex : Zone Industrielle Nord, 32000 Auch"
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
                />
                {isSearchingAddress && (
                  <Loader2 className="w-5 h-5 absolute right-4 top-3.5 text-amber-600 animate-spin" />
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50/70 transition-colors flex items-center gap-3 text-xs font-semibold text-slate-800"
                    >
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{s.properties.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
              >
                Localiser le bâtiment sur la carte
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 2 : REPÉRAGE (SATELLITE) ─────────────────────────────────── */}
        {currentStep === 2 && (
          <motion.div
            key="roof-step-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 text-center"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Repérons votre toiture
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Faites glisser la carte pour positionner votre toiture sous le curseur vert.
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

            <div className="flex items-center justify-between pt-2">
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
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
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
            key="roof-step-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 text-center"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Calculons la surface de votre toiture
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Déplacez les 4 coins vert fluo (1, 2, 3, 4) du pan de toiture pouvant accueillir les panneaux photovoltaïques.
              </p>
            </div>

            <RoofMapPolygonSelector
              step={3}
              center={mapCenter}
              polygonPoints={polygonPoints}
              onPolygonChange={(pts) => {
                setPolygonPoints(pts);
              }}
              mapContainerRef={mapContainerRef}
            />

            <div className="flex items-center justify-between pt-2">
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
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
              >
                Valider la surface de toiture
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 4 : ORIENTATION DE LA TOITURE ───────────────────────────── */}
        {currentStep === 4 && (
          <motion.div
            key="roof-step-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 text-center"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Déterminons l'orientation de votre toiture
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cliquez sur le faîtage (côté le plus haut du pan de toit).
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

            <div className="flex items-center justify-between pt-2">
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
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
              >
                Valider l'orientation
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 5 : INCLINAISON DE LA TOITURE ───────────────────────────── */}
        {currentStep === 5 && (
          <motion.div
            key="roof-step-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center"
          >
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                Quelle est l'inclinaison de votre toiture ?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La majorité des hangars et toitures industrielles ont une pente entre 10° et 15°.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              {[
                { pitch: 0, label: '0°', desc: 'Toit plat / Bac acier plat' },
                { pitch: 15, label: '15°', desc: 'Standard Hangar / Tertiaire' },
                { pitch: 30, label: '30°', desc: 'Toit en pente classique' },
                { pitch: 45, label: '45°', desc: 'Pente forte' }
              ].map((item) => (
                <button
                  key={item.pitch}
                  type="button"
                  onClick={() => setSelectedPitch(item.pitch)}
                  className={`py-3.5 px-4 rounded-2xl font-black text-base transition-all border-2 ${
                    selectedPitch === item.pitch
                      ? 'bg-[#0e2b4d] border-[#0e2b4d] text-white shadow-xl scale-105 ring-4 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-lg">{item.label}</span>
                  <span className="text-[10px] font-normal opacity-80 block">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 max-w-xl mx-auto">
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
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
              >
                Calculer la rentabilité de toiture
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 6 : RÉSULTAT & CHOIX DU MODÈLE ÉCONOMIQUE ────────────────── */}
        {currentStep === 6 && (
          <motion.div
            key="roof-step-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Choix du Modèle Économique */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => setBusinessModel('revente_totale')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  businessModel === 'revente_totale'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                1. Revente Totale EDF OA
              </button>

              <button
                type="button"
                onClick={() => setBusinessModel('location_loyer')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  businessModel === 'location_loyer'
                    ? 'bg-[#0e2b4d] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-4 h-4" />
                2. Location de Toiture (Loyer)
              </button>
            </div>

            {/* KPIs selon le modèle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-500" /> Surface &amp; Puissance
                </span>
                <div className="my-2">
                  <span className="text-3xl font-black text-slate-900">{customKwc}</span>
                  <span className="text-sm font-bold text-slate-500 ml-1">kWc ({roofSurface} m²)</span>
                </div>
                <div className="flex gap-1 overflow-x-auto pt-1">
                  {[36, 100, 250, 500].map(kw => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setCustomKwc(kw)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        customKwc === kw ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {kw}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Production Annuelle
                </span>
                <div className="my-2">
                  <span className="text-3xl font-black text-blue-600">{annualProductionKwh.toLocaleString('fr-FR')}</span>
                  <span className="text-sm font-bold text-slate-500 ml-1">kWh / an</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Région {departmentCode} ({regionalBaseYield} kWh/kWc) • {orientationInfo.orientationLabel}
                </span>
              </div>

              {businessModel === 'revente_totale' ? (
                <>
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Euro className="w-4 h-4 text-emerald-500" /> Chiffre d'Affaires / an
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-emerald-600">+{annualRevenueReventeTotale.toLocaleString('fr-FR')}</span>
                      <span className="text-sm font-bold text-slate-500 ml-1">€ / an</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Tarif EDF OA : {tarifEdfOaKwh.toFixed(4)} €/kWh garanti 20 ans
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-500" /> Amortissement (Payback)
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-purple-600">{paybackReventeYear}</span>
                      <span className="text-sm font-bold text-slate-500 ml-1">ans</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Investissement : {totalInvestmentHT.toLocaleString('fr-FR')} € HT
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-500" /> Loyer Annuel Versé
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-emerald-600">+{annualRentLoyer.toLocaleString('fr-FR')}</span>
                      <span className="text-sm font-bold text-slate-500 ml-1">€ / an</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Redevance : {toitureSettings.loyerAnnuelM2Toiture} €/m² / an
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Revenus sur 20 ans
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-emerald-600">+{totalRent20Years.toLocaleString('fr-FR')}</span>
                      <span className="text-sm font-bold text-slate-500 ml-1">€ nets</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-bold text-emerald-700">
                      0 € d'investissement à votre charge
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Graphique de comparaison financière sur 20 ans */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Comparatif Financier sur 20 Ans (Revente Totale vs Location de toiture)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Revenus nets cumulés garantis par contrat EDF OA ou bail emphytéotique.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData20Years} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                    <Tooltip
                      formatter={(val, name) => [`${Number(val).toLocaleString('fr-FR')} €`, name === 'reventeTotale' ? 'Revente Totale (Investisseur)' : 'Location Toiture (Loyer net)']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="reventeTotale" name="Revente Totale EDF OA" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="locationLoyer" name="Location de toiture (Loyer net)" fill="#0e2b4d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Modifier la toiture
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveToArchives}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  Sauvegarder l'étude
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveToArchives();
                    if (onExportPDF) onExportPDF();
                  }}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
                >
                  <FileDown className="w-4 h-4" />
                  Exporter Offre Toiture (PDF A4)
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
