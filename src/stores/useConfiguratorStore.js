import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

export const useConfiguratorStore = create(
    persist(
        (set, get) => ({
    // ... (existing constants and params)
    roofPitch: 10,
    eaveHeight: 5.5,
    width: 18.6,
    buildingType: 'symetrique', // Default
    baySpacing: 7.5,
    bayCount: 4,
    showDimensions: true,
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

    // --- CUSTOM MODE (SUR-MESURE) ---
    configMode: 'predefined', // 'predefined' | 'custom'
    customParams: {
        buildingType: 'symetrique',
        proportion: '1/2-1/2',
        width: 15,
        baySpacing: 7.5,
        bayCount: 4,
        ridgeHeight: 5,
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
    },

    get availableWidths() {
        const type = get().buildingType;
        return TYPE_WIDTHS_MAP[type] || TYPE_WIDTHS_MAP['symetrique'];
    },

    // ACTIONS
    setBuildingType: (type) => {
        if (TYPE_WIDTHS_MAP[type]) {
            const defaultWidth = TYPE_WIDTHS_MAP[type][0];
            const updates = { buildingType: type, width: defaultWidth, fixedLength: null };

            // Forcer la hauteur de sablière pour Monopente + Pente 15°
            if (type === 'monopente') {
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
                updates.roofPitch = 10; // Reset to 10° for Symmetrical/Asymmetrical
            }

            set(updates);
        }
    },
    setIsAcama: (val) => set({ isAcama: !!val }),
    setWidth: (width) => {
        // Allow setting width if it exists in current type's list
        // Or broadly check if valid number to avoid locking
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

    // New Extension Actions
    setLeftSide: (type) => {
        if (['none', 'auvent', 'appentis'].includes(type)) {
            set({ leftSide: type });
        }
    },
    setRightSide: (type) => {
        if (['none', 'auvent', 'appentis'].includes(type)) {
            set({ rightSide: type });
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

    hasSolar: false,
    toggleSolar: () => set((state) => ({ hasSolar: !state.hasSolar })),
    toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),

    setConfigMode: (mode) => set({ configMode: mode }),

    updateCustomParams: (updates) => {
        set((state) => {
            const newParams = { ...state.customParams, ...updates };

            const getSpans = (width, type, proportion) => {
                if (type === 'symetrique') return { left: width / 2, right: width / 2 };
                if (type === 'monopente') return { left: 0, right: width };
                // Asymetrique
                const matches = proportion.match(/(\d+)\/(\d+)-(\d+)\/(\d+)/);
                if (matches) {
                    const lNum = parseInt(matches[1]);
                    const lDen = parseInt(matches[2]);
                    const left = (lNum / lDen) * width;
                    return { left, right: width - left };
                }
                return { left: width / 2, right: width / 2 };
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
                // Priority: Keep pitches fixed, update Ridge Height? 
                // Actually user usually wants Ridge fixed if they move Eave.
                // Re-sync pitches based on fixed ridge.
                if (spans.left > 0) {
                    newParams.leftPitch = Math.atan((newParams.ridgeHeight - newParams.leftEaveHeight) / spans.left) * 180 / Math.PI;
                }
                if (spans.right > 0) {
                    newParams.rightPitch = Math.atan((newParams.ridgeHeight - newParams.rightEaveHeight) / spans.right) * 180 / Math.PI;
                }
            }
            // 5. If Width or Proportion changed
            else if (updates.width !== undefined || updates.proportion !== undefined || updates.buildingType !== undefined) {
                // Keep Pitches fixed, update Ridge Height
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

            return { customParams: newParams };
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
        hasSolar: false,
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
        const ridgeHeight = WIDTH_HEIGHT_MAP[state.width] || (state.eaveHeight + (state.width / 2) * Math.tan(state.roofPitch * Math.PI / 180));
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

        // Override for ACAMA EPONA/TALIAN models if fixed values exist
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
                finalSolarCount = model.fixedPanelCount || solarCount;
            }
        }

        const availableWidths = TYPE_WIDTHS_MAP[state.buildingType] || TYPE_WIDTHS_MAP['symetrique'];

        // --- CUSTOM MODE OVERRIDE ---
        if (state.configMode === 'custom') {
            const cp = state.customParams;
            const customLength = cp.bayCount * cp.baySpacing;
            
            // Re-calculate spans correctly
            const getSpans = (w, t, p) => {
                if (t === 'symetrique') return { left: w / 2, right: w / 2 };
                if (t === 'monopente') return { left: 0, right: w };
                const matches = p.match(/(\d+)\/(\d+)-(\d+)\/(\d+)/);
                if (matches) {
                    const lNum = parseInt(matches[1]);
                    const lDen = parseInt(matches[2]);
                    const left = (lNum / lDen) * w;
                    return { left, right: w - left };
                }
                return { left: w / 2, right: w / 2 };
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
        setIsAcama: (v) => useConfiguratorStore.getState().setIsAcama(v),
        setConfigMode: (m) => useConfiguratorStore.getState().setConfigMode(m),
        updateCustomParams: (u) => useConfiguratorStore.getState().updateCustomParams(u),
    }), []);
};
