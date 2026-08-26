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
        const next = Math.min(state.currentStep + 1, 4);
        return {
          currentStep: next,
          maxStepReached: Math.max(state.maxStepReached, next),
        };
      }),

      prevStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 1),
      })),

      // ═══ ÉTAPE 1 — LOCALISATION & MODÈLE ══════════════════════════════════
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

      selectedModelId: 'BT-3.1.15',

      setModel: (modelId) => set({ selectedModelId: modelId }),

      // ═══ ÉTAPE 3 — ORIENTATION & IMPLANTATION ═════════════════════════════
      orientation: 'sud',
      rotation: 0,
      mapCenter: null,

      setOrientation: (orientation) => set({ orientation }),
      setRotation: (rotation) => set({ rotation }),
      setMapCenter: (mapCenter) => set({ mapCenter }),

      // ═══ ÉTAPE 4 — BESOINS EN SÉCHAGE & VALORISATION ══════════════════════
      materials: DRYING_MATERIALS.map(m => ({
        id: m.id,
        label: m.label,
        shortLabel: m.shortLabel,
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
        mapCenter: null,
        departement: '',
        commune: '',
        codePostal: '',
        zoneClimatique: '',
        zoneSechage: '',
        selectedModelId: null,
        orientation: 'sud',
        rotation: 0,
        materials: DRYING_MATERIALS.map(m => ({
          id: m.id,
          label: m.label,
          shortLabel: m.shortLabel,
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
      version: 4,
      migrate: (persistedState, version) => {
        if (!persistedState || version < 4) {
          return {
            ...persistedState,
            financialParams: { ...DEFAULT_FINANCIAL_PARAMS },
            materials: DRYING_MATERIALS.map(m => {
              const existing = (persistedState?.materials || []).find(em => em.id === m.id);
              return {
                id: m.id,
                label: m.label,
                shortLabel: m.shortLabel,
                icon: m.icon,
                unit: m.unit,
                enabled: existing ? existing.enabled : false,
                volume: existing ? existing.volume : m.defaultVolume,
                plusValueQualite: m.defaultPlusValueQualite,
                economieEnergie: m.defaultEconomieEnergie,
              };
            }),
          };
        }
        return persistedState;
      },
    }
  )
);

export default useSechoirStore;
