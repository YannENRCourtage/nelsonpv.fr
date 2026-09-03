import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';

/**
 * Mapping of Building Types to Allowed Widths
 */
const TYPE_WIDTHS_MAP = {
    'symetrique': [15.0, 18.6, 22.3, 26.0, 29.8, 33.5],
    'epona': [23.6], // ACAMA-only
    'epona_talian5': [23.6], // ACAMA-only clone of epona
    'asymetrique_1': [16.4, 20.0],
    'asymetrique_2': [25.5, 29.1],
    'monopente': [12.7, 16.4],
    'ombriere_vl_simple_gauche': [6.9],
    'ombriere_vl_simple_droite': [6.9],
    'ombriere_vl_double': [9.1, 11.3],
    'ombriere_pl': [15.8, 20.2, 24.6]
};

/**
 * Mapping STRICT : Largeur → Hauteur Faîtage
 */
const WIDTH_HEIGHT_MAP = {
    // Symétrique
    15.0: 6.8,
    18.6: 7.1,
    22.3: 7.5,
    26.0: 7.8,
    29.8: 8.1,
    33.5: 8.5,
    // Asymétrique 1 zone (Approx calc: 5.5 + w/2 * tan(10))
    16.4: 6.9,
    20.0: 7.3,
    // Asymétrique 2 zones
    25.5: 8.9,  // User specified
    29.1: 9.8,  // User specified
    // Monopente
    12.7: 6.6,
    // Ombrière VL simple (Low pitch?)
    6.0: 4.5, // Legacy
    6.9: 4.5, // New Width
    // Ombrière VL double (Hauteur Basse / Egout)
    9.1: 3.0,
    11.3: 2.8,
    // Ombrière PL
    15.8: 6.0,
    20.2: 6.5,
    24.6: 7.0
};

const MONOPENTE_HEIGHTS = {
    12.7: 7.4,
    16.4: 8.4
};

/**
 * ACAMA EPONA Model Definitions
 * - buildingType = 'epona'
 * - auvent gauche 2.5m (left)
 * - appentis droit 7.8m (right) -> Total 35.3m (2.5 + 25 + 7.8)
 */
export const EPONA_MODELS = {
    'EPONA_45': {
        label: 'EPONA 45 / 45x35m',
        width: 23.6,
        fixedLength: 45,     // Longueur affichée
        eaveHeight: 5.0,     // Sablière Gauche (Image 1)
        rightEaveHeight: 3.8, // Sablière Droite (Image 1) - Corrigé 3.83 -> 3.8
        ridgeHeight: 9.41,   // Faîtage (Image 1)
        roofPitch: 17,      // Pente réelle 3D pour alignement (Phase 16)
        bayCount: 6,
        baySpacing: 7.5,
        leftSide: 'none',
        rightSide: 'none',
        fixedPower: 356.5,
        fixedPanelCount: 775,
    },
    'EPONA_65': {
        label: 'EPONA 65 / 65x35m',
        width: 23.6,
        fixedLength: 65,     // Longueur affichée
        eaveHeight: 5.0,     // Sablière Gauche (Image 1)
        rightEaveHeight: 3.8, // Sablière Droite (Image 1) - Corrigé 3.83 -> 3.8
        ridgeHeight: 9.41,   // Faîtage (Image 1)
        roofPitch: 17,      // Pente réelle 3D pour alignement (Phase 16)
        bayCount: 8,
        baySpacing: 8.125,
        leftSide: 'none',
        rightSide: 'none',
        fixedPower: 500.0,
        fixedPanelCount: 1116,
    }
};

/**
 * ACAMA TALIAN Model Definitions
 * - buildingType = 'symetrique'
 * - appentis gauche 11.2m
 * - appentis droit 11.2m
 */
export const TALIAN_MODELS = {
    'TALIAN_4_MIN': {
        label: 'TALIAN 4 MIN / 37.7x37.5m',
        width: 13.7,
        baySpacing: 7.54,
        bayCount: 5,
        fixedLength: 37.7,
        eaveHeight: 4.5,
        roofPitch: 6,
        leftSide: 'appentis',
        rightSide: 'appentis',
        leftWidth: 11.2,
        rightWidth: 11.2,
        fixedPower: 309.1,
        fixedPanelCount: 672,
    },
    'TALIAN_4_MID': {
        label: 'TALIAN 4 MID / 42.2x37.5m',
        width: 13.7,
        baySpacing: 7.033, // Updated to fit 42.2m (6 bays)
        bayCount: 6,
        fixedLength: 42.2, // Updated from 45.2 to 42.2
        eaveHeight: 4.5,
        roofPitch: 6,
        leftSide: 'appentis',
        rightSide: 'appentis',
        leftWidth: 11.2,
        rightWidth: 11.2,
        fixedPower: 368.0,
        fixedPanelCount: 800,
    },
    'TALIAN_4_MAX': {
        label: 'TALIAN 4 MAX / 63.4x37.5m',
        width: 13.7,
        baySpacing: 7.925,
        bayCount: 8,
        fixedLength: 63.4,
        eaveHeight: 4.5,
        roofPitch: 6,
        leftSide: 'appentis',
        rightSide: 'appentis',
        leftWidth: 11.2,
        rightWidth: 11.2,
        fixedPower: 500.0,
        fixedPanelCount: 1120,
    }
};

/**
 * ACAMA TALIAN 1 Model Definitions
 * - buildingType = 'symetrique'
 * - auvent gauche 2.3m
 * - auvent droit 2.3m
 */
export const TALIAN_1_MODELS = {
    'TALIAN_1_MIN': {
        label: 'TALIAN 1 MIN / 53.6x23.5m',
        width: 18.8,
        baySpacing: 7.657,
        bayCount: 7,
        fixedLength: 53.6,
        eaveHeight: 4.36,
        roofPitch: 14,
        leftSide: 'auvent',
        rightSide: 'auvent',
        leftWidth: 2.3,
        rightWidth: 2.3,
        fixedPower: 266.8,
        fixedPanelCount: 580,
    },
    'TALIAN_1_MID': {
        label: 'TALIAN 1 MID / 60.5x23.5m',
        width: 18.8,
        baySpacing: 7.563,
        bayCount: 8,
        fixedLength: 60.5,
        eaveHeight: 4.36,
        roofPitch: 14,
        leftSide: 'auvent',
        rightSide: 'auvent',
        leftWidth: 2.3,
        rightWidth: 2.3,
        fixedPower: 303.6,
        fixedPanelCount: 660,
    },
    'TALIAN_1_MAX': {
        label: 'TALIAN 1 MAX / 68x23.5m',
        width: 18.8,
        baySpacing: 7.556,
        bayCount: 9,
        fixedLength: 68,
        eaveHeight: 4.36,
        roofPitch: 14,
        leftSide: 'auvent',
        rightSide: 'auvent',
        leftWidth: 2.3,
        rightWidth: 2.3,
        fixedPower: 340.4,
        fixedPanelCount: 740,
    }
};

/**
 * ACAMA TALIAN 3 Model Definitions
 * - buildingType = 'symetrique'
 * - auvent gauche 1.8m
 * - auvent droit 1.8m
 */
export const TALIAN_3_MODELS = {
    'TALIAN_3_MIN': {
        label: 'TALIAN 3 MIN / 52.6x21.1m',
        width: 17.5,
        baySpacing: 7.514,
        bayCount: 7,
        fixedLength: 52.6,
        eaveHeight: 2.8,
        roofPitch: 12,
        leftSide: 'auvent',
        rightSide: 'auvent',
        leftWidth: 1.8,
        rightWidth: 1.8,
        fixedPower: 240.1,
        fixedPanelCount: 522,
    },
    'TALIAN_3_MID': {
        label: 'TALIAN 3 MID / 68x21.1m',
        width: 17.5,
        baySpacing: 7.555,
        bayCount: 9,
        fixedLength: 68,
        eaveHeight: 2.8,
        roofPitch: 12,
        leftSide: 'auvent',
        rightSide: 'auvent',
        leftWidth: 1.8,
        rightWidth: 1.8,
        fixedPower: 314.6,
        fixedPanelCount: 684,
    },
    'TALIAN_3_MAX': {
        label: 'TALIAN 3 MAX / 90.1x21.1m',
        width: 17.5,
        baySpacing: 7.508,
        bayCount: 12,
        fixedLength: 90.1,
        eaveHeight: 2.8,
        roofPitch: 12,
        leftSide: 'auvent',
        rightSide: 'auvent',
        leftWidth: 1.8,
        rightWidth: 1.8,
        fixedPower: 414.0,
        fixedPanelCount: 900,
    }
};

/**
 * ACAMA TALIAN 5 Model Definitions
 * - Clone exact de EPONA
 * - buildingType = 'epona_talian5'
 */
export const TALIAN_5_MODELS = {
    'TALIAN_5_MIN': {
        label: 'TALIAN 5 MIN / 31x35.3m',
        width: 26.4,
        baySpacing: 6.2,
        bayCount: 5,
        fixedLength: 31.0,
        eaveHeight: 7.9,     // Sablière Gauche TALIAN 5
        rightEaveHeight: 4.3, // Sablière Droite TALIAN 5 (Appentis)
        ridgeHeight: 8.1,     // Faîtage TALIAN 5
        roofPitch: 10,       // Pente TALIAN 5 (calculée/fixe dans PortalFrame)
        leftSide: 'none',
        rightSide: 'none',   // L'appentis est maintenant intégré dans les 26.4m de largeur principale
        fixedPower: 179.9,
        fixedPanelCount: 391,
    },
    'TALIAN_5_MID': {
        label: 'TALIAN 5 MID / 50x35.3m',
        width: 26.4,
        baySpacing: 6.25,
        bayCount: 8,
        fixedLength: 50.0,
        eaveHeight: 7.9,
        rightEaveHeight: 4.3,
        ridgeHeight: 8.1,
        roofPitch: 10,
        leftSide: 'none',
        rightSide: 'none',
        fixedPower: 296.2,
        fixedPanelCount: 644,
    },
    'TALIAN_5_MAX': {
        label: 'TALIAN 5 MAX / 62.5x35.3m',
        width: 26.4,
        baySpacing: 6.25,
        bayCount: 10,
        fixedLength: 62.5,
        eaveHeight: 7.9,
        rightEaveHeight: 4.3,
        ridgeHeight: 8.1,
        roofPitch: 10,
        leftSide: 'none',
        rightSide: 'none',
        fixedPower: 349.1,
        fixedPanelCount: 759,
    }
};

export const DEFAULT_CUSTOM_PARAMS = {
    buildingType: 'symetrique',
    proportion: '1/2-1/2',
    width: 15.0,
    baySpacing: 7.5,
    bayCount: 4,
    ridgeHeight: 5.0,
    leftEaveHeight: 3.5,
    rightEaveHeight: 3.5,
    leftPitch: 11.31,
    rightPitch: 11.31,
    pitchUnit: 'degree', // 'degree' | 'percent'
    leftExtension: 'none', // 'none' | 'auvent' | 'appentis'
    rightExtension: 'none',
    leftExtWidth: 4.0,
    leftExtHeight: 3.0,
    rightExtWidth: 4.0,
    rightExtHeight: 3.0,
    dimensionFontSize: 2.5,
};

export const useConfiguratorStore = create(
    persist(
        (set, get) => ({
    roofPitch: 10,
    eaveHeight: 5.5,
    width: 18.6,
    buildingType: 'symetrique', // Default
    baySpacing: 7.5,
    bayCount: 4,
    showDimensions: true,
    hasSolar: true,
    isAcama: false, // NEW: Interface isolation flag

    // EXTENSIONS (Left/Right)
    leftSide: 'none', // 'none', 'auvent', 'appentis'
    rightSide: 'none', // 'none', 'auvent', 'appentis'

    // ACAMA EPONA/TALIAN state
    selectedEponaModel: 'EPONA_45',
    selectedTalianModel: 'TALIAN_4_MIN',
    selectedTalian1Model: 'TALIAN_1_MIN',
    selectedTalian3Model: 'TALIAN_3_MIN',
    selectedTalian5Model: 'TALIAN_5_MIN',
    fixedLength: null,  // Override for EPONA/TALIAN models
    leftWidth: 9.3,     // Standard
    rightWidth: 9.3,    // Standard

    // BATITECH state
    selectedBatitechModel: 'BT-3.1.15',

    // --- CUSTOM MODE (SUR-MESURE) ---
    configMode: 'predefined', // 'predefined' | 'batitech' | 'custom'
    customParams: { ...DEFAULT_CUSTOM_PARAMS },

    // Actions

    // Actions
    setDimensionFontSize: (size) => set({ dimensionFontSize: Number(size) || 2.5 }),
    setBatitechModel: (modelId) => {
        const model = BATITECH_MODELS[modelId] || BATITECH_MODELS['BT-3.1.15'];
        const bayCount = model.zones === 1 ? 3 : (model.zones === 2 ? 6 : 8);
        const bLength = model.length || (bayCount * 6.0);
        set({
            configMode: 'batitech',
            selectedBatitechModel: modelId,
            buildingType: 'asymetrique_1',
            width: 20.0,
            baySpacing: 6.0,
            bayCount: bayCount,
            length: bLength,
            fixedLength: bLength,
            eaveHeight: 4.0,
            roofPitch: 15,
            hasSolar: true,
            leftSide: 'none',
            rightSide: 'none',
        });
    },
    setBuildingType: (type) => {
        if (TYPE_WIDTHS_MAP[type]) {
            const defaultWidth = TYPE_WIDTHS_MAP[type][0];
            const updates = { buildingType: type, width: defaultWidth, fixedLength: null };

            // Forcer la hauteur de sablière pour Monopente & Asymétriques + Pente 15°
            if (type === 'monopente' || type.startsWith('asymetrique')) {
                updates.eaveHeight = 4.0;
                updates.roofPitch = 15; // FORCE 15°

                // Disable Appentis if selected
                const state = get();
                if (state.leftSide === 'appentis') updates.leftSide = 'none';
                if (state.rightSide === 'appentis') updates.rightSide = 'none';
            } else if (type === 'ombriere_vl_simple_gauche' || type === 'ombriere_vl_simple_droite') {
                updates.eaveHeight = 2.93;
                updates.roofPitch = 10;
                updates.hasSolar = true; // Auto solar
                updates.leftSide = 'none';
                updates.rightSide = 'none';
            } else if (type === 'ombriere_vl_double') {
                // Set default height based on default width (9.1m -> 3.0m)
                updates.eaveHeight = WIDTH_HEIGHT_MAP[defaultWidth];
                updates.roofPitch = 10;
                updates.hasSolar = true;
                updates.leftSide = 'none';
                updates.rightSide = 'none';
            } else {
                updates.eaveHeight = 5.5;
                updates.roofPitch = 10; // Reset to 10° for Symmetrical
            }

            set(updates);
        }
    },
    setIsAcama: (val) => set({ isAcama: !!val }),
    setWidth: (width) => {
        set({ width: Number(width) });
    },
    setBaySpacing: (spacing) => {
        if (spacing === 6 || spacing === 7.5) set({ baySpacing: spacing });
    },
    setBayCount: (count) => {
        set({ bayCount: Math.max(4, Math.floor(count)) });
    },
    incrementBayCount: () => {
        set((state) => ({ bayCount: state.bayCount + 1 }));
    },
    decrementBayCount: () => {
        set((state) => ({ bayCount: Math.max(4, state.bayCount - 1) }));
    },
    setRoofPitch: (pitch) => set({ roofPitch: pitch }),
    setEaveHeight: (h) => set({ eaveHeight: h }),
    setDimensions: ({ length, width }) => set((state) => {
      const updates = { length: length || state.length };
      if (width && width !== state.width) {
        updates.width = width;
      }
      return updates;
    }),

    loadBuildingConfig: (data) => {
        if (!data) return;
        const validWidth = (data.width !== undefined && data.width !== null && !isNaN(Number(data.width))) 
            ? Number(data.width) 
            : 16.4;
        const bType = data.buildingType || 'asymetrique_1';
        const bCount = Number(data.bayCount || 5);
        const bSpacing = Number(data.baySpacing || 7.5);
        const bLength = Number(data.length) || (bCount * bSpacing) || 37.5;
        const defaultEave = bType === 'ombriere_pl' ? 5.08 : (bType === 'ombriere_vl_double' ? 3.0 : (bType.startsWith('asymetrique') || bType === 'monopente' ? 4.0 : 5.5));
        const defaultPitch = (bType.startsWith('asymetrique') || bType === 'monopente') ? 15 : 10;

        set({
            buildingType: bType,
            width: validWidth,
            length: bLength,
            eaveHeight: Number(data.eaveHeight) || defaultEave,
            roofPitch: Number(data.roofPitch) || defaultPitch,
            bayCount: bCount,
            baySpacing: bSpacing,
            leftSide: data.leftSide || 'none',
            rightSide: data.rightSide || 'none',
            leftWidth: Number(data.leftWidth) || 9.3,
            rightWidth: Number(data.rightWidth) || 9.3,
            hasSolar: data.hasSolar !== undefined ? data.hasSolar : true,
            fixedLength: data.fixedLength || null,
            dimensionFontSize: data.dimensionFontSize !== undefined ? Number(data.dimensionFontSize) : (data.cotationFontSize !== undefined ? Number(data.cotationFontSize) : 2.5),
            configMode: data.configMode || 'predefined',
            customParams: {
                ...DEFAULT_CUSTOM_PARAMS,
                ...(data.customParams || {}),
                width: Number(data.customParams?.width) > 0 ? Number(data.customParams.width) : (Number(data.width) || 15.0),
                baySpacing: Number(data.customParams?.baySpacing) > 0 ? Number(data.customParams.baySpacing) : (Number(data.baySpacing) || 7.5),
                bayCount: Number(data.customParams?.bayCount) > 0 ? Number(data.customParams.bayCount) : (Number(data.bayCount) || 4),
                ridgeHeight: Number(data.customParams?.ridgeHeight) > 0 ? Number(data.customParams.ridgeHeight) : 5.0,
                leftEaveHeight: Number(data.customParams?.leftEaveHeight) > 0 ? Number(data.customParams.leftEaveHeight) : (Number(data.eaveHeight) || 3.5),
                rightEaveHeight: Number(data.customParams?.rightEaveHeight) > 0 ? Number(data.customParams.rightEaveHeight) : (Number(data.eaveHeight) || 3.5),
                leftPitch: !isNaN(Number(data.customParams?.leftPitch)) ? Number(data.customParams.leftPitch) : (Number(data.roofPitch) || 11.31),
                rightPitch: !isNaN(Number(data.customParams?.rightPitch)) ? Number(data.customParams.rightPitch) : (Number(data.roofPitch) || 11.31),
                buildingType: data.customParams?.buildingType || data.buildingType || 'symetrique',
                proportion: data.customParams?.proportion || '1/2-1/2',
                leftExtension: data.customParams?.leftExtension || data.leftSide || 'none',
                rightExtension: data.customParams?.rightExtension || data.rightSide || 'none',
                leftExtWidth: Number(data.customParams?.leftExtWidth || data.leftWidth) || (data.leftSide === 'appentis' ? 9.3 : 4.0),
                rightExtWidth: Number(data.customParams?.rightExtWidth || data.rightWidth) || (data.rightSide === 'appentis' ? 9.3 : 4.0),
            }
        });
    },

    // New Extension Actions
    setLeftSide: (type) => {
        if (['none', 'auvent', 'appentis'].includes(type)) {
            const w = type === 'appentis' ? 9.3 : (type === 'auvent' ? 4.0 : 0);
            set(state => ({
                leftSide: type,
                leftWidth: w,
                customParams: {
                    ...state.customParams,
                    leftExtension: type,
                    leftExtWidth: w
                }
            }));
        }
    },
    setRightSide: (type) => {
        if (['none', 'auvent', 'appentis'].includes(type)) {
            const w = type === 'appentis' ? 9.3 : (type === 'auvent' ? 4.0 : 0);
            set(state => ({
                rightSide: type,
                rightWidth: w,
                customParams: {
                    ...state.customParams,
                    rightExtension: type,
                    rightExtWidth: w
                }
            }));
        }
    },

    // ACAMA EPONA/TALIAN Model Selection
    setEponaModel: (modelKey) => {
        const model = EPONA_MODELS[modelKey];
        if (!model) return;
        set({
            selectedEponaModel: modelKey,
            buildingType: 'epona',
            width: model.width,
            baySpacing: model.baySpacing,
            bayCount: model.bayCount,
            fixedLength: model.fixedLength,
            ridgeHeight: model.ridgeHeight || 9.4,
            roofPitch: model.roofPitch,
            leftSide: model.leftSide,
            rightSide: model.rightSide,
        });
    },
    setTalianModel: (modelKey) => {
        const model = TALIAN_MODELS[modelKey];
        if (!model) return;
        set({
            selectedTalianModel: modelKey,
            buildingType: 'symetrique',
            width: model.width,
            baySpacing: model.baySpacing,
            bayCount: model.bayCount,
            fixedLength: model.fixedLength,
            eaveHeight: model.eaveHeight,
            roofPitch: model.roofPitch,
            leftSide: model.leftSide,
            rightSide: model.rightSide,
            leftWidth: model.leftWidth,
            rightWidth: model.rightWidth,
        });
    },
    setTalian1Model: (modelKey) => {
        const model = TALIAN_1_MODELS[modelKey];
        if (!model) return;
        set({
            selectedTalian1Model: modelKey,
            buildingType: 'symetrique',
            width: model.width,
            baySpacing: model.baySpacing,
            bayCount: model.bayCount,
            fixedLength: model.fixedLength,
            eaveHeight: model.eaveHeight,
            roofPitch: model.roofPitch,
            leftSide: model.leftSide,
            rightSide: model.rightSide,
            leftWidth: model.leftWidth,
            rightWidth: model.rightWidth,
        });
    },
    setTalian3Model: (modelKey) => {
        const model = TALIAN_3_MODELS[modelKey];
        if (!model) return;
        set({
            selectedTalian3Model: modelKey,
            buildingType: 'symetrique',
            width: model.width,
            baySpacing: model.baySpacing,
            bayCount: model.bayCount,
            fixedLength: model.fixedLength,
            eaveHeight: model.eaveHeight,
            roofPitch: model.roofPitch,
            leftSide: model.leftSide,
            rightSide: model.rightSide,
            leftWidth: model.leftWidth,
            rightWidth: model.rightWidth,
        });
    },

    setTalian5Model: (modelKey) => {
        const model = TALIAN_5_MODELS[modelKey];
        if (!model) return;
        set({
            selectedTalian5Model: modelKey,
            buildingType: 'epona_talian5', // Switch to EPONA logic
            width: model.width,
            baySpacing: model.baySpacing,
            bayCount: model.bayCount,
            fixedLength: model.fixedLength,
            eaveHeight: model.eaveHeight,
            roofPitch: model.roofPitch,
            ridgeHeight: model.ridgeHeight,
            leftSide: model.leftSide,
            rightSide: model.rightSide,
            leftWidth: model.leftWidth,
            rightWidth: model.rightWidth,
        });
    },

    hasSolar: true,
    toggleSolar: () => set((state) => ({ hasSolar: !state.hasSolar })),
    toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),

    setConfigMode: (mode) => {
        if (mode === 'batitech') {
            const state = get();
            const modelId = state.selectedBatitechModel || 'BT-3.1.15';
            const model = BATITECH_MODELS[modelId] || BATITECH_MODELS['BT-3.1.15'];
            const bayCount = model.zones === 1 ? 3 : (model.zones === 2 ? 6 : 8);
            const bLength = model.length || (bayCount * 6.0);
            set({
                configMode: 'batitech',
                selectedBatitechModel: modelId,
                buildingType: 'asymetrique_1',
                width: 20.0,
                baySpacing: 6.0,
                bayCount: bayCount,
                length: bLength,
                fixedLength: bLength,
                eaveHeight: 4.0,
                roofPitch: 15,
                hasSolar: true,
                leftSide: 'none',
                rightSide: 'none',
            });
        } else if (mode === 'predefined') {
            const state = get();
            set({
                configMode: 'predefined',
                fixedLength: null,
                width: state.width || 18.6,
                buildingType: state.buildingType === 'asymetrique_1' && state.width === 20.0 ? 'asymetrique_1' : (state.buildingType || 'symetrique'),
            });
        } else {
            const state = get();
            const curr = state.customParams || {};
            const safeParams = {
                ...DEFAULT_CUSTOM_PARAMS,
                ...curr,
                width: Number(curr.width) > 0 ? Number(curr.width) : DEFAULT_CUSTOM_PARAMS.width,
                baySpacing: Number(curr.baySpacing) > 0 ? Number(curr.baySpacing) : DEFAULT_CUSTOM_PARAMS.baySpacing,
                bayCount: Number(curr.bayCount) > 0 ? Number(curr.bayCount) : DEFAULT_CUSTOM_PARAMS.bayCount,
                ridgeHeight: Number(curr.ridgeHeight) > 0 ? Number(curr.ridgeHeight) : DEFAULT_CUSTOM_PARAMS.ridgeHeight,
                leftEaveHeight: Number(curr.leftEaveHeight) > 0 ? Number(curr.leftEaveHeight) : DEFAULT_CUSTOM_PARAMS.leftEaveHeight,
                rightEaveHeight: Number(curr.rightEaveHeight) > 0 ? Number(curr.rightEaveHeight) : DEFAULT_CUSTOM_PARAMS.rightEaveHeight,
                leftPitch: !isNaN(Number(curr.leftPitch)) ? Number(curr.leftPitch) : DEFAULT_CUSTOM_PARAMS.leftPitch,
                rightPitch: !isNaN(Number(curr.rightPitch)) ? Number(curr.rightPitch) : DEFAULT_CUSTOM_PARAMS.rightPitch,
                buildingType: curr.buildingType || DEFAULT_CUSTOM_PARAMS.buildingType,
                proportion: curr.proportion || DEFAULT_CUSTOM_PARAMS.proportion,
            };
            set({ configMode: 'custom', fixedLength: null, customParams: safeParams });
        }
    },

    updateCustomParams: (updates) => {
        set((state) => {
            const curr = { ...DEFAULT_CUSTOM_PARAMS, ...(state.customParams || {}) };
            const newParams = { ...curr, ...updates };

            // Sanitize numeric values
            if (updates.width !== undefined) newParams.width = Number(updates.width) > 0 ? Number(updates.width) : curr.width;
            if (updates.baySpacing !== undefined) newParams.baySpacing = Number(updates.baySpacing) > 0 ? Number(updates.baySpacing) : curr.baySpacing;
            if (updates.bayCount !== undefined) newParams.bayCount = Number(updates.bayCount) > 0 ? Number(updates.bayCount) : curr.bayCount;
            if (updates.ridgeHeight !== undefined) newParams.ridgeHeight = Number(updates.ridgeHeight) > 0 ? Number(updates.ridgeHeight) : curr.ridgeHeight;
            if (updates.leftEaveHeight !== undefined) newParams.leftEaveHeight = Number(updates.leftEaveHeight) > 0 ? Number(updates.leftEaveHeight) : curr.leftEaveHeight;
            if (updates.rightEaveHeight !== undefined) newParams.rightEaveHeight = Number(updates.rightEaveHeight) > 0 ? Number(updates.rightEaveHeight) : curr.rightEaveHeight;
            if (updates.leftPitch !== undefined) newParams.leftPitch = !isNaN(Number(updates.leftPitch)) ? Number(updates.leftPitch) : curr.leftPitch;
            if (updates.rightPitch !== undefined) newParams.rightPitch = !isNaN(Number(updates.rightPitch)) ? Number(updates.rightPitch) : curr.rightPitch;

            const getSpans = (width, type, proportion) => {
                const w = Number(width) > 0 ? Number(width) : 15.0;
                if (type === 'symetrique') return { left: w / 2, right: w / 2 };
                if (type === 'monopente') return { left: 0, right: w };
                // Asymetrique
                const matches = (proportion || '1/2-1/2').match(/(\d+)\/(\d+)-(\d+)\/(\d+)/);
                if (matches) {
                    const lNum = parseInt(matches[1]);
                    const lDen = parseInt(matches[2]);
                    const left = (lNum / lDen) * w;
                    return { left, right: w - left };
                }
                return { left: w / 2, right: w / 2 };
            };

            const spans = getSpans(newParams.width, newParams.buildingType, newParams.proportion);

            // AUTO-CALCULATIONS
            // 1. If Ridge Height changed, update Pitches
            if (updates.ridgeHeight !== undefined) {
                if (spans.left > 0) {
                    newParams.leftPitch = Math.atan((newParams.ridgeHeight - newParams.leftEaveHeight) / spans.left) * 180 / Math.PI;
                }
                if (spans.right > 0) {
                    newParams.rightPitch = Math.atan((newParams.ridgeHeight - newParams.rightEaveHeight) / spans.right) * 180 / Math.PI;
                }
            }
            // 2. If Left Pitch changed, update Ridge Height (and then Right Pitch)
            else if (updates.leftPitch !== undefined) {
                if (spans.left > 0) {
                    newParams.ridgeHeight = newParams.leftEaveHeight + spans.left * Math.tan(newParams.leftPitch * Math.PI / 180);
                    // Sync Right Pitch
                    if (spans.right > 0) {
                        newParams.rightPitch = Math.atan((newParams.ridgeHeight - newParams.rightEaveHeight) / spans.right) * 180 / Math.PI;
                    }
                }
            }
            // 3. If Right Pitch changed, update Ridge Height (and then Left Pitch)
            else if (updates.rightPitch !== undefined) {
                if (spans.right > 0) {
                    newParams.ridgeHeight = newParams.rightEaveHeight + spans.right * Math.tan(newParams.rightPitch * Math.PI / 180);
                    // Sync Left Pitch
                    if (spans.left > 0) {
                        newParams.leftPitch = Math.atan((newParams.ridgeHeight - newParams.leftEaveHeight) / spans.left) * 180 / Math.PI;
                    }
                }
            }
            // 4. If Eave Heights changed
            else if (updates.leftEaveHeight !== undefined || updates.rightEaveHeight !== undefined) {
                if (spans.left > 0) {
                    newParams.leftPitch = Math.atan((newParams.ridgeHeight - newParams.leftEaveHeight) / spans.left) * 180 / Math.PI;
                }
                if (spans.right > 0) {
                    newParams.rightPitch = Math.atan((newParams.ridgeHeight - newParams.rightEaveHeight) / spans.right) * 180 / Math.PI;
                }
            }
            // 5. If Width or Proportion changed
            else if (updates.width !== undefined || updates.proportion !== undefined || updates.buildingType !== undefined) {
                if (spans.left > 0) {
                    newParams.ridgeHeight = newParams.leftEaveHeight + spans.left * Math.tan(newParams.leftPitch * Math.PI / 180);
                    if (spans.right > 0) {
                        newParams.rightPitch = Math.atan((newParams.ridgeHeight - newParams.rightEaveHeight) / spans.right) * 180 / Math.PI;
                    }
                }
            }

            // MONOPENTE SPECIFIC: Left Eave == Ridge Height
            if (newParams.buildingType === 'monopente') {
                newParams.leftEaveHeight = newParams.ridgeHeight;
                newParams.leftPitch = 0;
            }

            // 6. CLAMP EXTENSIONS HEIGHT TO BUILDING HEIGHT
            if (newParams.leftExtHeight > newParams.leftEaveHeight) {
                newParams.leftExtHeight = newParams.leftEaveHeight;
            }
            if (newParams.rightExtHeight > newParams.rightEaveHeight) {
                newParams.rightExtHeight = newParams.rightEaveHeight;
            }

            const topLevelUpdates = {};
            if (updates.leftExtension !== undefined) {
                topLevelUpdates.leftSide = updates.leftExtension;
            }
            if (updates.rightExtension !== undefined) {
                topLevelUpdates.rightSide = updates.rightExtension;
            }
            if (updates.leftExtWidth !== undefined) {
                topLevelUpdates.leftWidth = updates.leftExtWidth;
            }
            if (updates.rightExtWidth !== undefined) {
                topLevelUpdates.rightWidth = updates.rightExtWidth;
            }

            return { customParams: newParams, ...topLevelUpdates };
        });
    },

    reset: () => set({
        buildingType: 'symetrique',
        width: 18.6,
        baySpacing: 7.5,
        bayCount: 4,
        leftSide: 'none',
        rightSide: 'none',
        showDimensions: true,
        hasSolar: true,
        selectedEponaModel: 'EPONA_45',
        selectedTalianModel: 'TALIAN_4_MIN',
        selectedTalian1Model: 'TALIAN_1_MIN',
        selectedTalian3Model: 'TALIAN_3_MIN',
        selectedTalian5Model: 'TALIAN_5_MIN',
        leftWidth: 9.3,
        rightWidth: 9.3,
        isAcama: false,
        fixedLength: null,
    }),

    getSummary: () => {
        const state = get();
        const length = state.baySpacing * state.bayCount;
        // Fallback or explicit map
        const ridgeHeight = state.buildingType === 'monopente'
            ? (state.eaveHeight + (state.width * Math.tan(state.roofPitch * Math.PI / 180)))
            : ((state.buildingType === 'asymetrique_1' || state.buildingType === 'asymetrique_2')
                ? (state.eaveHeight + (state.width * 0.75 * Math.tan(state.roofPitch * Math.PI / 180)))
                : (WIDTH_HEIGHT_MAP[state.width] || (state.eaveHeight + (state.width / 2) * Math.tan(state.roofPitch * Math.PI / 180))));
        return {
            buildingType: state.buildingType,
            width: state.width,
            ridgeHeight,
            eaveHeight: state.eaveHeight,
            roofPitch: state.roofPitch,
            baySpacing: state.baySpacing,
            bayCount: state.bayCount,
            length,
            leftSide: state.leftSide,
            rightSide: state.rightSide,
            showDimensions: state.showDimensions
        };
    }
}), {
    name: 'nelson-configurator-storage',
    storage: createJSONStorage(() => localStorage),
}));

export const useConfiguratorValues = () => {
    const state = useConfiguratorStore();

    const length = React.useMemo(() => {
        return state.fixedLength || (state.baySpacing * state.bayCount);
    }, [state.fixedLength, state.baySpacing, state.bayCount]);

    const ridgeHeight = React.useMemo(() => {
        if (state.isAcama && state.buildingType === 'symetrique' && Math.abs(state.width - 24.5) < 0.1) {
            return 6.7; // TALIAN 1 Fixed Ridge Height
        }
        if (state.isAcama && state.buildingType === 'symetrique' && Math.abs(state.width - 17.5) < 0.1) {
            return 4.5; // TALIAN 3 Fixed Ridge Height
        }
        if (state.isAcama && state.buildingType === 'epona_talian5' && Math.abs(state.width - 23.6) < 0.1) {
            return 9.41; // TALIAN 5 (EPONA Clone) Fixed Ridge Height
        }
        if (state.isAcama && state.buildingType === 'epona' && Math.abs(state.width - 23.6) < 0.1) {
            return 9.41; // EPONA Fixed Ridge Height
        }
        if (state.buildingType === 'monopente') {
            return (state.eaveHeight + (state.width * Math.tan(state.roofPitch * Math.PI / 180)));
        }
        if (state.buildingType === 'asymetrique_1' || state.buildingType === 'asymetrique_2') {
            return (state.eaveHeight + (state.width * 0.75 * Math.tan(state.roofPitch * Math.PI / 180)));
        }

        // Default calculation
        return (state.eaveHeight + ((state.width / 2) * Math.tan(state.roofPitch * Math.PI / 180)));
    }, [state.width, state.buildingType, state.isAcama, state.eaveHeight, state.roofPitch]);

    const solarStats = React.useMemo(() => {
        const PANEL_WIDTH = 1.134;
        const PANEL_HEIGHT = 1.762;
        const GAP = 0.02; // Harmonisé à 2cm
        const MARGIN = 0.50;

        const getPanelCount = (surfWidth, surfLength, customMargin = null) => {
            const effectiveMargin = customMargin !== null ? customMargin : MARGIN;
            const uW = surfWidth - 2 * effectiveMargin;
            const uL = surfLength - 2 * effectiveMargin;
            if (uW <= 0 || uL <= 0) return 0;
            const cXA = Math.floor((uW + GAP) / (PANEL_WIDTH + GAP));
            const cZA = Math.floor((uL + GAP) / (PANEL_HEIGHT + GAP));
            const tA = cXA * cZA;
            const cXB = Math.floor((uW + GAP) / (PANEL_HEIGHT + GAP));
            const cZB = Math.floor((uL + GAP) / (PANEL_WIDTH + GAP));
            const tB = cXB * cZB;
            return Math.max(tA, tB);
        };

        let solarCount = 0;
        if (state.hasSolar) {
            const halfWidth = state.width / 2;
            const angleRad = (state.roofPitch * Math.PI) / 180;
            const geoSlope = halfWidth / Math.cos(angleRad);
            const roofSlope = geoSlope + 0.50;
            const roofLength = length + 1.0;

            solarCount += getPanelCount(roofSlope, roofLength) * 2;

            // Auvents/Appentis : Utiliser une marge réduite pour les auvents étroits (< 4m)
            const getExtensionMargin = (extWidth) => extWidth < 4.0 ? 0.20 : 0.50;

            if (state.leftSide === 'auvent') {
                const extWidth = 4.0;
                // Note: TALIAN 1/3 override extWidth in render, but store uses 4.0 for standard.
                // We align the store logic for specific models too.
                let specificWidth = extWidth;
                if (state.isAcama && Math.abs(state.width - 18.8) < 0.1) specificWidth = 2.3;
                if (state.isAcama && Math.abs(state.width - 17.5) < 0.1) specificWidth = 1.8;

                const slope = specificWidth / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0, getExtensionMargin(specificWidth));
            } else if (state.leftSide === 'appentis') {
                const slope = state.leftWidth / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0, getExtensionMargin(state.leftWidth));
            }

            if (state.rightSide === 'auvent') {
                const extWidth = 4.0;
                let specificWidth = extWidth;
                if (state.isAcama && Math.abs(state.width - 18.8) < 0.1) specificWidth = 2.3;
                if (state.isAcama && Math.abs(state.width - 17.5) < 0.1) specificWidth = 1.8;

                const slope = specificWidth / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0, getExtensionMargin(specificWidth));
            } else if (state.rightSide === 'appentis') {
                const slope = state.rightWidth / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0, getExtensionMargin(state.rightWidth));
            }
        }

        // Puissance par panneau : 460Wc pour ACAMA, 465Wc pour GREEN INVEST
        const PANEL_WATT = state.isAcama ? 460 : 465;
        let finalSolarCount = solarCount;
        let finalSolarPower = (solarCount * PANEL_WATT) / 1000;

        if (state.configMode === 'predefined') {
            if (state.isAcama) {
                let model = null;
                if (state.buildingType === 'epona') {
                    model = EPONA_MODELS[state.selectedEponaModel];
                } else if (state.buildingType === 'epona_talian5') {
                    model = TALIAN_5_MODELS[state.selectedTalian5Model];
                } else if (state.buildingType === 'symetrique') {
                    // Check if it's one of the TALIAN families
                    if (TALIAN_MODELS[state.selectedTalianModel] && Math.abs(state.width - 13.7) < 0.1) {
                        model = TALIAN_MODELS[state.selectedTalianModel];
                    } else if (TALIAN_1_MODELS[state.selectedTalian1Model] && Math.abs(state.width - 18.8) < 0.1) {
                        model = TALIAN_1_MODELS[state.selectedTalian1Model];
                    } else if (TALIAN_3_MODELS[state.selectedTalian3Model] && Math.abs(state.width - 17.5) < 0.1) {
                        model = TALIAN_3_MODELS[state.selectedTalian3Model];
                    }
                }

                if (model?.fixedPower !== undefined) {
                    finalSolarPower = model.fixedPower;
                    finalSolarCount = model.fixedPanelCount || Math.round((model.fixedPower * 1000) / PANEL_WATT);
                } else {
                    const acamaMatch = findBarconniereBuilding({
                        length,
                        width: state.width,
                        buildingType: state.buildingType || 'symetrique',
                        leftSide: state.leftSide || 'none',
                        rightSide: state.rightSide || 'none',
                        leftWidth: state.leftWidth || 0,
                        rightWidth: state.rightWidth || 0,
                        isAcama: true
                    });
                    if (acamaMatch?.kwc) {
                        finalSolarPower = acamaMatch.kwc;
                        finalSolarCount = Math.round((acamaMatch.kwc * 1000) / PANEL_WATT);
                    }
                }
            } else {
                // Catalogue complet Barconnière / Green Invest
                const barcMatch = findBarconniereBuilding({
                    length,
                    width: state.width,
                    buildingType: state.buildingType || 'symetrique',
                    leftSide: state.leftSide || 'none',
                    rightSide: state.rightSide || 'none',
                    leftWidth: state.leftWidth || 0,
                    rightWidth: state.rightWidth || 0,
                    isAcama: false
                });
                if (barcMatch?.kwc) {
                    finalSolarPower = barcMatch.kwc;
                    finalSolarCount = Math.round((barcMatch.kwc * 1000) / PANEL_WATT);
                }
            }
        }

        if (state.configMode === 'batitech') {
            const bModel = BATITECH_MODELS[state.selectedBatitechModel] || BATITECH_MODELS['BT-3.1.15'];
            finalSolarCount = bModel.nbModules || 90;
            finalSolarPower = bModel.puissanceKwc || 30.15;
        }

        const availableWidths = TYPE_WIDTHS_MAP[state.buildingType] || TYPE_WIDTHS_MAP['symetrique'];

        // --- CUSTOM MODE OVERRIDE ---
        if (state.configMode === 'custom') {
            const rawCp = state.customParams || {};
            const cp = {
                ...DEFAULT_CUSTOM_PARAMS,
                ...rawCp,
                width: Number(rawCp.width) > 0 ? Number(rawCp.width) : DEFAULT_CUSTOM_PARAMS.width,
                baySpacing: Number(rawCp.baySpacing) > 0 ? Number(rawCp.baySpacing) : DEFAULT_CUSTOM_PARAMS.baySpacing,
                bayCount: Number(rawCp.bayCount) > 0 ? Number(rawCp.bayCount) : DEFAULT_CUSTOM_PARAMS.bayCount,
                ridgeHeight: Number(rawCp.ridgeHeight) > 0 ? Number(rawCp.ridgeHeight) : DEFAULT_CUSTOM_PARAMS.ridgeHeight,
                leftEaveHeight: Number(rawCp.leftEaveHeight) > 0 ? Number(rawCp.leftEaveHeight) : DEFAULT_CUSTOM_PARAMS.leftEaveHeight,
                rightEaveHeight: Number(rawCp.rightEaveHeight) > 0 ? Number(rawCp.rightEaveHeight) : DEFAULT_CUSTOM_PARAMS.rightEaveHeight,
                leftPitch: !isNaN(Number(rawCp.leftPitch)) ? Number(rawCp.leftPitch) : DEFAULT_CUSTOM_PARAMS.leftPitch,
                rightPitch: !isNaN(Number(rawCp.rightPitch)) ? Number(rawCp.rightPitch) : DEFAULT_CUSTOM_PARAMS.rightPitch,
                leftExtWidth: Number(rawCp.leftExtWidth) || Number(state.leftWidth) || DEFAULT_CUSTOM_PARAMS.leftExtWidth,
                leftExtHeight: Number(rawCp.leftExtHeight) || DEFAULT_CUSTOM_PARAMS.leftExtHeight,
                rightExtWidth: Number(rawCp.rightExtWidth) || Number(state.rightWidth) || DEFAULT_CUSTOM_PARAMS.rightExtWidth,
                rightExtHeight: Number(rawCp.rightExtHeight) || DEFAULT_CUSTOM_PARAMS.rightExtHeight,
                buildingType: rawCp.buildingType || DEFAULT_CUSTOM_PARAMS.buildingType,
                proportion: rawCp.proportion || DEFAULT_CUSTOM_PARAMS.proportion,
                leftExtension: rawCp.leftExtension || state.leftSide || DEFAULT_CUSTOM_PARAMS.leftExtension,
                rightExtension: rawCp.rightExtension || state.rightSide || DEFAULT_CUSTOM_PARAMS.rightExtension,
            };
            const customLength = cp.bayCount * cp.baySpacing;
            
            // Re-calculate spans correctly
            const getSpans = (w, t, p) => {
                const safeW = Number(w) > 0 ? Number(w) : 15.0;
                if (t === 'symetrique') return { left: safeW / 2, right: safeW / 2 };
                if (t === 'monopente') return { left: 0, right: safeW };
                const matches = (p || '1/2-1/2').match(/(\d+)\/(\d+)-(\d+)\/(\d+)/);
                if (matches) {
                    const lNum = parseInt(matches[1]);
                    const lDen = parseInt(matches[2]);
                    const left = (lNum / lDen) * safeW;
                    return { left, right: safeW - left };
                }
                return { left: safeW / 2, right: safeW / 2 };
            };
            const spans = getSpans(cp.width, cp.buildingType, cp.proportion);

            // Solar for custom
            let customSolarCount = 0;
            if (state.hasSolar) {
                const lLength = customLength + 1.0;
                // Left slope
                const leftSlope = spans.left / Math.cos(cp.leftPitch * Math.PI / 180) + 0.5;
                customSolarCount += getPanelCount(leftSlope, lLength);
                // Right slope
                if (cp.buildingType !== 'monopente') {
                    const rightSlope = spans.right / Math.cos(cp.rightPitch * Math.PI / 180) + 0.5;
                    customSolarCount += getPanelCount(rightSlope, lLength);
                }
                // Extensions
                if (cp.leftExtension !== 'none') {
                    const extSlope = cp.leftExtWidth / Math.cos(cp.leftPitch * Math.PI / 180) + 0.2;
                    customSolarCount += getPanelCount(extSlope, lLength, cp.leftExtWidth < 4.0 ? 0.20 : 0.50);
                }
                if (cp.rightExtension !== 'none') {
                    const extSlope = cp.rightExtWidth / Math.cos(cp.rightPitch * Math.PI / 180) + 0.2;
                    customSolarCount += getPanelCount(extSlope, lLength, cp.rightExtWidth < 4.0 ? 0.20 : 0.50);
                }
            }

            const PANEL_WATT = state.isAcama ? 460 : 465;

            return {
                ...state,
                availableWidths,
                buildingType: cp.buildingType,
                width: cp.width,
                length: customLength,
                ridgeHeight: cp.ridgeHeight,
                eaveHeight: cp.leftEaveHeight, // Base reference
                rightEaveHeight: cp.rightEaveHeight, // For components that support it
                roofPitch: cp.leftPitch, // For components that support it
                rightPitch: cp.rightPitch,
                baySpacing: cp.baySpacing,
                bayCount: cp.bayCount,
                leftSide: cp.leftExtension,
                rightSide: cp.rightExtension,
                leftWidth: cp.leftExtWidth,
                rightWidth: cp.rightExtWidth,
                leftExtHeight: cp.leftExtHeight,
                rightExtHeight: cp.rightExtHeight,
                solarStats: { count: customSolarCount, power: (customSolarCount * PANEL_WATT) / 1000 },
                customSpans: spans, // To use in Roof.jsx
            };
        }

        return {
            ...state,
            availableWidths,
            length,
            ridgeHeight,
            solarStats: { count: finalSolarCount, power: finalSolarPower },
        };
    }, [
        state,
        length,
        ridgeHeight
    ]);

    return solarStats;
};

export const useConfiguratorActions = () => {
    return React.useMemo(() => ({
        loadBuildingConfig: (data) => useConfiguratorStore.getState().loadBuildingConfig(data),
        setWidth: (w) => useConfiguratorStore.getState().setWidth(w),
        setBaySpacing: (s) => useConfiguratorStore.getState().setBaySpacing(s),
        setBayCount: (c) => useConfiguratorStore.getState().setBayCount(c),
        incrementBayCount: () => useConfiguratorStore.getState().incrementBayCount(),
        decrementBayCount: () => useConfiguratorStore.getState().decrementBayCount(),
        setBuildingType: (t) => useConfiguratorStore.getState().setBuildingType(t),
        setLeftSide: (t) => useConfiguratorStore.getState().setLeftSide(t),
        setRightSide: (t) => useConfiguratorStore.getState().setRightSide(t),
        toggleSolar: () => useConfiguratorStore.getState().toggleSolar(),
        toggleDimensions: () => useConfiguratorStore.getState().toggleDimensions(),
        reset: () => useConfiguratorStore.getState().reset(),
        getSummary: () => useConfiguratorStore.getState().getSummary(),
        setEponaModel: (m) => useConfiguratorStore.getState().setEponaModel(m),
        setTalianModel: (m) => useConfiguratorStore.getState().setTalianModel(m),
        setTalian1Model: (m) => useConfiguratorStore.getState().setTalian1Model(m),
        setTalian3Model: (m) => useConfiguratorStore.getState().setTalian3Model(m),
        setTalian5Model: (m) => useConfiguratorStore.getState().setTalian5Model(m),
        setBatitechModel: (m) => useConfiguratorStore.getState().setBatitechModel(m),
        setIsAcama: (v) => useConfiguratorStore.getState().setIsAcama(v),
        setConfigMode: (m) => useConfiguratorStore.getState().setConfigMode(m),
        updateCustomParams: (u) => useConfiguratorStore.getState().updateCustomParams(u),
        setRoofPitch: (p) => useConfiguratorStore.getState().setRoofPitch(p),
        setEaveHeight: (h) => useConfiguratorStore.getState().setEaveHeight(h),
        setDimensions: (d) => useConfiguratorStore.getState().setDimensions(d),
        setDimensionFontSize: (s) => useConfiguratorStore.getState().setDimensionFontSize(s),
    }), []);
};
