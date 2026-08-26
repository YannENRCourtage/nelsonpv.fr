/**
 * SechoirBatitechSimulator — Composant Principal (Wizard 4 étapes)
 * ──────────────────────────────────────────────────────────────────────────────
 * Simulateur interactif "Séchoir BatiTech®" pour la plateforme nelsonpv.fr
 * Design mode sombre, navigation par étapes avec Framer Motion.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MapPin, Compass, Leaf, BarChart3,
  ChevronLeft, ChevronRight, RotateCcw,
  CheckCircle2,
} from 'lucide-react';

import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';
import { calculateFullSimulation } from '@/components/simulator/sechoir/sechoirCalculations.js';

// Étapes du wizard
import Step1Location from '@/components/simulator/sechoir/steps/Step1Location.jsx';
import Step3Orientation from '@/components/simulator/sechoir/steps/Step3Orientation.jsx';
import Step4Drying from '@/components/simulator/sechoir/steps/Step4Drying.jsx';
import Step5Results from '@/components/simulator/sechoir/steps/Step5Results.jsx';

// Génération PDF
import { generateSechoirPDF } from '@/components/simulator/sechoir/SechoirPDFGenerator.jsx';

// ─── Configuration des 4 étapes ────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Localisation & Modèle', shortLabel: 'Projet',      icon: MapPin },
  { id: 2, label: 'Orientation',           shortLabel: 'Orientation', icon: Compass },
  { id: 3, label: 'Séchage',               shortLabel: 'Séchage',     icon: Leaf },
  { id: 4, label: 'Résultats',             shortLabel: 'Résultats',   icon: BarChart3 },
];

// ─── Animations ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

// ─── Composant Principal ───────────────────────────────────────────────────────

export default function SechoirBatitechSimulator({ selectedProject, onStateUpdate, onSaveSimulation, onExportPDF }) {
  const store = useSechoirStore();
  const {
    currentStep, maxStepReached, setStep, nextStep, prevStep,
    address, departement, selectedModelId, orientation, materials, financialParams,
    lastResults, setLastResults, reset,
  } = store;

  // Direction d'animation (1 = forward, -1 = backward)
  const [direction, setDirection] = React.useState(1);

  // ─── Calcul des résultats (mémoïsé) ──────────────────────────────────────

  const results = useMemo(() => {
    const modelKey = selectedModelId || 'BT-3.1.15';
    const deptKey = departement || '33';
    try {
      return calculateFullSimulation({
        model: modelKey,
        departement: deptKey,
        orientation: orientation || 'sud',
        materials: materials || [],
        financialParams: financialParams || {},
      });
    } catch (err) {
      console.error('Erreur calcul simulation:', err);
      return null;
    }
  }, [selectedModelId, departement, orientation, materials, financialParams]);

  // Synchroniser les résultats dans le store
  useEffect(() => {
    if (results) {
      setLastResults(results);
    }
  }, [results, setLastResults]);

  // ─── Synchronisation avec le parent (IrveSimulator) ──────────────────────

  useEffect(() => {
    if (onStateUpdate && results) {
      const activeMats = (store.materials || []).filter(m => m.enabled && m.volume > 0);
      const activeMatsText = activeMats.map(m => `${m.shortLabel || m.label} (${m.volume} t)`).join(', ') || 'Fourrage vrac (50 t), Bottes carrées (150 t), Blé tendre (20 t), Maïs grain (80 t)';
      
      const rot = store.rotation !== undefined ? store.rotation : (
        store.orientation === 'ouest' ? 90 :
        store.orientation === 'sud-ouest' ? 45 :
        store.orientation === 'sud-est' ? -45 :
        store.orientation === 'est' ? -90 : 0
      );

      const center = store.mapCenter || (store.latitude && store.longitude ? [Number(store.latitude), Number(store.longitude)] : [43.6047, 1.4442]);

      onStateUpdate({
        type: 'sechoir_batitech',
        title: `Séchoir Multi-Matières BatiTech® — ${results.model?.name || ''}`,
        cityName: store.commune || '',
        address: store.addressLabel || store.address || '',
        departement: store.departement || '33',
        departmentCode: store.departement || '33',
        modelId: results.model?.id || selectedModelId || 'BT-3.1.15',
        modelName: results.model?.name || 'BatiTech 3.1.15',
        dimensions: results.model?.dimensions || '18m × 20m',
        length: results.model?.length || 18,
        width: results.model?.width || 20,
        roofSurface: results.model?.surfaceToiture || 360,
        floorArea: results.model?.surfaceToiture || 360,
        kwc: results.model?.puissanceKwc || 30.15,
        nbModules: results.model?.nbModules || 90,
        orientation: store.orientation,
        orientationLabel: (() => {
          let cardinal = 'Sud';
          if (rot >= -22 && rot <= 22) cardinal = 'Sud';
          else if (rot > 22 && rot <= 67) cardinal = 'Sud-Ouest';
          else if (rot > 67 && rot <= 112) cardinal = 'Ouest';
          else if (rot > 112 && rot <= 157) cardinal = 'Nord-Ouest';
          else if (rot < -22 && rot >= -67) cardinal = 'Sud-Est';
          else if (rot < -67 && rot >= -112) cardinal = 'Est';
          else if (rot < -112 && rot >= -157) cardinal = 'Nord-Est';
          else cardinal = 'Nord';
          const degStr = rot > 0 ? `+${rot}°` : `${rot}°`;
          return `${cardinal} (${degStr})`;
        })(),
        annualProductionKwh: results.productionPV || 0,
        deltaProduits: results.produits?.deltaProduits || 0,
        annualBenefitYear1: results.deltaEBE || 0,
        deltaEBE: results.deltaEBE || 0,
        totalInvestmentHT: results.model?.investissementBrut || 0,
        primeCEE: results.cee?.primeTotal || 0,
        subventionsPAE: results.financing?.subventionPAE || results.financing?.subventionsTotal || 0,
        investissementNet: results.financing?.investissementNet || 0,
        emprunt: results.financing?.emprunt || 0,
        annuite: results.annuite || 0,
        gainNetAnnuel: results.gainNetAnnuel || 0,
        paybackYear: results.roi || 10.09,
        roi: results.roi || 10.09,
        van: results.van || 0,
        tri: results.triPercent || 'N/A',
        triPercent: results.triPercent || 'N/A',
        mapCenter: center,
        rotation: rot,
        buildings: [{
          name: `Séchoir ${results.model?.name || 'BatiTech'}`,
          length: results.model?.length || 18,
          width: results.model?.width || 20,
          rotation: rot,
        }],
        activeMaterialsText: activeMatsText,
        cashFlows: results.treasury?.cashFlows || [],
      });
    }
  }, [
    results,
    onStateUpdate,
    store.commune,
    store.addressLabel,
    store.address,
    store.departement,
    store.latitude,
    store.longitude,
    store.mapCenter,
    store.rotation,
    store.orientation,
    store.materials,
    selectedModelId
  ]);

  // ─── Validation par étape (4 étapes) ──────────────────────────────────────

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return !!departement && !!address && !!selectedModelId;
      case 2: return !!orientation;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }, [currentStep, departement, address, selectedModelId, orientation]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (canProceed && currentStep < 4) {
      setDirection(1);
      nextStep();
    }
  }, [canProceed, currentStep, nextStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      prevStep();
    }
  }, [currentStep, prevStep]);

  const handleStepClick = useCallback((stepId) => {
    if (stepId <= maxStepReached) {
      setDirection(stepId > currentStep ? 1 : -1);
      setStep(stepId);
    }
  }, [maxStepReached, currentStep, setStep]);

  // ─── Export PDF ──────────────────────────────────────────────────────────

  const handleExportPDF = useCallback(async () => {
    if (!results) return;
    try {
      await generateSechoirPDF({
        results,
        address: store.addressLabel || store.address,
        commune: store.commune,
        departement: store.departement,
        orientation: store.orientation,
        materials: store.materials,
        financialParams: store.financialParams,
        projectName: selectedProject?.name,
      });
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    }
  }, [results, store, selectedProject]);

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-180px)] bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 rounded-3xl overflow-hidden border border-slate-800/60 shadow-2xl">

      {/* ═══ HEADER — Titre, Navigation Haut-Droite & Progression ════════════ */}
      <div className="px-5 sm:px-8 pt-6 pb-4">
        {/* Titre & Boutons de navigation en haut à droite */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Leaf className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Séchoir BatiTech<sup className="text-amber-400 text-sm">®</sup>
              </h1>
              <p className="text-base text-slate-300 font-medium">
                Simulateur de rentabilité — Séchoir solaire thermovoltaïque Cogen'Air®
              </p>
            </div>
          </div>

          {/* Boutons Précédent, Suivant et Reset placés en haut à droite */}
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {/* Bouton Précédent */}
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition-all ${
                currentStep === 1
                  ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed border border-slate-800/40'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-sm'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>

            {/* Bouton Suivant */}
            {currentStep < 4 && (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm sm:text-base font-black transition-all ${
                  canProceed
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20 hover:scale-105'
                    : 'bg-slate-800/30 text-slate-600 cursor-not-allowed border border-slate-800/40'
                }`}
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Bouton Réinitialiser */}
            <button
              onClick={reset}
              className="p-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white border border-slate-700 transition-all"
              title="Réinitialiser la simulation"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre de progression — 4 étapes */}
        <div className="flex items-center gap-2 sm:gap-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isReachable = step.id <= maxStepReached;

            return (
              <React.Fragment key={step.id}>
                {/* Connecteur */}
                {index > 0 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-amber-500' : 'bg-slate-700/60'
                    }`}
                  />
                )}

                {/* Étape */}
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isReachable}
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl text-base font-bold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                      : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : isReachable
                          ? 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                          : 'bg-slate-800/20 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="inline sm:hidden">{step.shortLabel}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ═══ CONTENU — Étape active ═══════════════════════════════════════════ */}
      <div className="px-5 sm:px-8 pb-8 relative z-20 overflow-visible">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            className="overflow-visible"
          >
            {currentStep === 1 && <Step1Location />}
            {currentStep === 2 && <Step3Orientation />}
            {currentStep === 3 && <Step4Drying />}
            {currentStep === 4 && <Step5Results onExportPDF={handleExportPDF} />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
