/**
 * Store Zustand — Séchoir BatiTech®
 * ──────────────────────────────────────────────────────────────────────────────
 * Gestion de l'état global du simulateur séchoir solaire thermovoltaïque.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DRYING_MATERIALS, DEFAULT_FINANCIAL_PARAMS } from '@/data/sechoirBatitechModels.js';

const useSechoirStore = create(
  persist(
    (set, get) => ({
      // ═══ NAVIGATION ═══════════════════════════════════════════════════════
      currentStep: 1,
      maxStepReached: 1,

      setStep: (step) => set((state) => ({
        currentStep: step,
        maxStepReached: Math.max(state.maxStepReached, step),
      })),

      nextStep: () => set((state) => {
        const next = Math.min(state.currentStep + 1, 5);
        return {
          currentStep: next,
          maxStepReached: Math.max(state.maxStepReached, next),
        };
      }),

      prevStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 1),
      })),

      // ═══ ÉTAPE 1 — LOCALISATION & IMPLANTATION ════════════════════════════
      address: '',
      addressLabel: '',
      latitude: null,
      longitude: null,
      departement: '',
      commune: '',
      codePostal: '',
      zoneClimatique: '',
      zoneSechage: '',

      setAddress: (data) => set({
        address: data.address || '',
        addressLabel: data.label || data.address || '',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        departement: data.departement || '',
        commune: data.commune || '',
        codePostal: data.codePostal || '',
        zoneClimatique: data.zoneClimatique || '',
        zoneSechage: data.zoneSechage || '',
      }),

      // ═══ ÉTAPE 2 — MODÈLE BATITECH ════════════════════════════════════════
      selectedModelId: null,

      setModel: (modelId) => set({ selectedModelId: modelId }),

      // ═══ ÉTAPE 3 — ORIENTATION ═════════════════════════════════════════════
      orientation: 'sud',

      setOrientation: (orientation) => set({ orientation }),

      // ═══ ÉTAPE 4 — BESOINS EN SÉCHAGE & VALORISATION ══════════════════════
      materials: DRYING_MATERIALS.map(m => ({
        id: m.id,
        label: m.label,
        icon: m.icon,
        unit: m.unit,
        enabled: false,
        volume: m.defaultVolume,
        plusValueQualite: m.defaultPlusValueQualite,
        economieEnergie: m.defaultEconomieEnergie,
      })),

      toggleMaterial: (materialId) => set((state) => ({
        materials: state.materials.map(m =>
          m.id === materialId ? { ...m, enabled: !m.enabled } : m
        ),
      })),

      updateMaterialVolume: (materialId, volume) => set((state) => ({
        materials: state.materials.map(m =>
          m.id === materialId ? { ...m, volume: Math.max(0, Number(volume) || 0) } : m
        ),
      })),

      updateMaterialParams: (materialId, params) => set((state) => ({
        materials: state.materials.map(m =>
          m.id === materialId ? { ...m, ...params } : m
        ),
      })),

      // ═══ PARAMÈTRES FINANCIERS ═════════════════════════════════════════════
      financialParams: { ...DEFAULT_FINANCIAL_PARAMS },

      setFinancialParam: (key, value) => set((state) => ({
        financialParams: {
          ...state.financialParams,
          [key]: value,
        },
      })),

      setAllFinancialParams: (params) => set((state) => ({
        financialParams: {
          ...state.financialParams,
          ...params,
        },
      })),

      // ═══ RÉSULTATS CALCULÉS (cache) ════════════════════════════════════════
      lastResults: null,
      setLastResults: (results) => set({ lastResults: results }),

      // ═══ RESET ═════════════════════════════════════════════════════════════
      reset: () => set({
        currentStep: 1,
        maxStepReached: 1,
        address: '',
        addressLabel: '',
        latitude: null,
        longitude: null,
        departement: '',
        commune: '',
        codePostal: '',
        zoneClimatique: '',
        zoneSechage: '',
        selectedModelId: null,
        orientation: 'sud',
        materials: DRYING_MATERIALS.map(m => ({
          id: m.id,
          label: m.label,
          icon: m.icon,
          unit: m.unit,
          enabled: false,
          volume: m.defaultVolume,
          plusValueQualite: m.defaultPlusValueQualite,
          economieEnergie: m.defaultEconomieEnergie,
        })),
        financialParams: { ...DEFAULT_FINANCIAL_PARAMS },
        lastResults: null,
      }),
    }),
    {
      name: 'nelson-sechoir-batitech',
      version: 1,
    }
  )
);

export default useSechoirStore;
