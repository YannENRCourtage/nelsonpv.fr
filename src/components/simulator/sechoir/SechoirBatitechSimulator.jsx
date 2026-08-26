/**
 * SechoirBatitechSimulator — Composant Principal (Wizard 5 étapes)
 * ──────────────────────────────────────────────────────────────────────────────
 * Simulateur interactif "Séchoir BatiTech®" pour la plateforme nelsonpv.fr
 * Design mode sombre, navigation par étapes avec Framer Motion.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MapPin, Building2, Compass, Leaf, BarChart3,
  ChevronLeft, ChevronRight, RotateCcw, FileDown,
  CheckCircle2,
} from 'lucide-react';

import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';
import { calculateFullSimulation } from '@/components/simulator/sechoir/sechoirCalculations.js';

// Étapes du wizard
import Step1Location from '@/components/simulator/sechoir/steps/Step1Location.jsx';
import Step2Model from '@/components/simulator/sechoir/steps/Step2Model.jsx';
import Step3Orientation from '@/components/simulator/sechoir/steps/Step3Orientation.jsx';
import Step4Drying from '@/components/simulator/sechoir/steps/Step4Drying.jsx';
import Step5Results from '@/components/simulator/sechoir/steps/Step5Results.jsx';

// Génération PDF
import { generateSechoirPDF } from '@/components/simulator/sechoir/SechoirPDFGenerator.jsx';

// ─── Configuration des étapes ──────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Localisation',   shortLabel: 'Lieu',        icon: MapPin },
  { id: 2, label: 'Modèle',         shortLabel: 'Modèle',      icon: Building2 },
  { id: 3, label: 'Orientation',    shortLabel: 'Orientation',  icon: Compass },
  { id: 4, label: 'Séchage',        shortLabel: 'Séchage',      icon: Leaf },
  { id: 5, label: 'Résultats',      shortLabel: 'Résultats',    icon: BarChart3 },
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
    if (!selectedModelId || !departement) return null;
    const model = BATITECH_MODELS[selectedModelId];
    if (!model) return null;

    try {
      return calculateFullSimulation({
        model,
        departement,
        orientation,
        materials,
        financialParams,
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
      onStateUpdate({
        type: 'sechoir_batitech',
        title: `Séchoir BatiTech® ${results.model?.name || ''} — ${store.commune || 'Étude'}`,
        cityName: store.commune || '',
        address: store.addressLabel || store.address || '',
        departement: store.departement,
        kwc: results.model?.puissanceKwc || 0,
        annualProductionKwh: results.productionPV || 0,
        investissementBrut: results.model?.investissementBrut || 0,
        primeCEE: results.cee?.primeTotal || 0,
        roi: results.roi || 0,
        deltaEBE: results.deltaEBE || 0,
        van: results.van || 0,
        tri: results.triPercent || 'N/A',
      });
    }
  }, [results, onStateUpdate, store.commune, store.addressLabel, store.address, store.departement]);

  // ─── Validation par étape ────────────────────────────────────────────────

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return !!departement && !!address;
      case 2: return !!selectedModelId;
      case 3: return !!orientation;
      case 4: return true; // pas de validation obligatoire
      case 5: return true;
      default: return false;
    }
  }, [currentStep, departement, address, selectedModelId, orientation]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (canProceed && currentStep < 5) {
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

      {/* ═══ HEADER — Barre de progression ═══════════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-6 pb-4">
        {/* Titre */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Séchoir BatiTech<sup className="text-amber-400 text-xs">®</sup>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Simulateur de rentabilité — Séchoir solaire thermovoltaïque Cogen'Air®
              </p>
            </div>
          </div>

          <button
            onClick={reset}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all"
            title="Réinitialiser la simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de progression — étapes */}
        <div className="flex items-center gap-1 sm:gap-2">
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
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : ''}`} />
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
      <div className="px-4 sm:px-8 pb-6 relative z-20 overflow-visible">
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
            {currentStep === 2 && <Step2Model />}
            {currentStep === 3 && <Step3Orientation />}
            {currentStep === 4 && <Step4Drying />}
            {currentStep === 5 && <Step5Results onExportPDF={handleExportPDF} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══ FOOTER — Navigation ═════════════════════════════════════════════ */}
      <div className="px-4 sm:px-8 pb-6 relative z-10">
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
          {/* Bouton Précédent */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentStep === 1
                ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>

          {/* Indicateur central */}
          <span className="text-xs text-slate-500 font-medium">
            Étape {currentStep} / 5
          </span>

          {/* Bouton Suivant / Télécharger PDF */}
          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                canProceed
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 hover:shadow-amber-400/40 hover:scale-105'
                  : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
              }`}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleExportPDF}
              disabled={!results}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 hover:scale-105 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Télécharger PDF
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
