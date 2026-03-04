import React from 'react';
import { create } from 'zustand';

/**
 * Mapping of Building Types to Allowed Widths
 */
const TYPE_WIDTHS_MAP = {
    'symetrique': [15.0, 18.6, 22.3, 26.0, 29.8, 33.5],
    'epona': [23.6], // ACAMA-only
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
        rightEaveHeight: 3.8, // Sablière Droite (Image 1) - Corrected 3.83 -> 3.8
        ridgeHeight: 9.41,   // Faîtage (Image 1)
        roofPitch: 17,      // Pente réelle 3D pour alignement (Phase 16)
        bayCount: 6,
        baySpacing: 7.5,
        leftSide: 'none',
        rightSide: 'none',
    },
    'EPONA_65': {
        label: 'EPONA 65 / 65x35m',
        width: 23.6,
        fixedLength: 65,     // Longueur affichée
        eaveHeight: 5.0,     // Sablière Gauche (Image 1)
        rightEaveHeight: 3.8, // Sablière Droite (Image 1) - Corrected 3.83 -> 3.8
        ridgeHeight: 9.41,   // Faîtage (Image 1)
        roofPitch: 17,      // Pente réelle 3D pour alignement (Phase 16)
        bayCount: 8,
        baySpacing: 8.125,
        leftSide: 'none',
        rightSide: 'none',
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
    },
    'TALIAN_4_MID': {
        label: 'TALIAN 4 MID / 45.2x37.5m',
        width: 13.7,
        baySpacing: 7.533,
        bayCount: 6,
        fixedLength: 45.2,
        eaveHeight: 4.5,
        roofPitch: 6,
        leftSide: 'appentis',
        rightSide: 'appentis',
        leftWidth: 11.2,
        rightWidth: 11.2,
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
    }
};

export const useConfiguratorStore = create((set, get) => ({
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
    fixedLength: null,  // Override for EPONA/TALIAN models
    leftWidth: 9.3,     // Standard
    rightWidth: 9.3,    // Standard

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

    hasSolar: false,
    toggleSolar: () => set((state) => ({ hasSolar: !state.hasSolar })),
    toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),

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
}));

export const useConfiguratorValues = () => {
    const state = useConfiguratorStore();

    return React.useMemo(() => {
        // Length: use fixedLength for EPONA, otherwise compute from bays
        const length = state.fixedLength || (state.baySpacing * state.bayCount);
        const ridgeHeight = (state.buildingType === 'monopente' && MONOPENTE_HEIGHTS[state.width])
            ? MONOPENTE_HEIGHTS[state.width]
            : (WIDTH_HEIGHT_MAP[state.width] ||
                // For EPONA, use hardcoded ridge 9.4m. For TALIAN, calculate/fixed
                (state.buildingType === 'epona' ? 9.4 :
                    (state.isAcama && state.buildingType === 'symetrique' && Math.abs(state.width - 13.7) < 0.1)
                        ? state.eaveHeight + (state.width / 2) * Math.tan(state.roofPitch * Math.PI / 180)
                        : (state.isAcama && state.buildingType === 'symetrique' && Math.abs(state.width - 18.8) < 0.1)
                            ? 6.7 // TALIAN 1 Fixed Ridge Height
                            : (state.isAcama && state.buildingType === 'symetrique' && Math.abs(state.width - 17.5) < 0.1)
                                ? 4.5 // TALIAN 3 Fixed Ridge Height
                                : WIDTH_HEIGHT_MAP[state.width] || WIDTH_HEIGHT_MAP[18.6]));


        // --- SOLAR STATS ---
        const PANEL_WIDTH = 1.134;
        const PANEL_HEIGHT = 1.762;
        const GAP = 0.01;
        const MARGIN = 0.50;

        const getPanelCount = (surfWidth, surfLength) => {
            const uW = surfWidth - 2 * MARGIN;
            const uL = surfLength - 2 * MARGIN;
            if (uW <= 0 || uL <= 0) return 0;
            // Option A
            const cXA = Math.floor((uW + GAP) / (PANEL_WIDTH + GAP));
            const cZA = Math.floor((uL + GAP) / (PANEL_HEIGHT + GAP));
            const tA = cXA * cZA;
            // Option B
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

            // Left Side Extension
            if (state.leftSide === 'auvent') {
                const slope = 4.0 / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length);
            } else if (state.leftSide === 'appentis') {
                const slope = state.leftWidth / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0);
            }

            // Right Side Extension
            if (state.rightSide === 'auvent') {
                const slope = 4.0 / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length);
            } else if (state.rightSide === 'appentis') {
                const slope = state.rightWidth / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0);
            }
        }

        const solarPower = (solarCount * 465) / 1000;

        const availableWidths = TYPE_WIDTHS_MAP[state.buildingType] || TYPE_WIDTHS_MAP['symetrique'];

        return {
            availableWidths,
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
            hasSolar: state.hasSolar,
            showDimensions: state.showDimensions,
            solarStats: { count: solarCount, power: solarPower },
            fixedLength: state.fixedLength,
            selectedEponaModel: state.selectedEponaModel,
            selectedTalianModel: state.selectedTalianModel,
            selectedTalian1Model: state.selectedTalian1Model,
            selectedTalian3Model: state.selectedTalian3Model,
            leftWidth: state.leftWidth,
            rightWidth: state.rightWidth,
            isAcama: state.isAcama,
        };
    }, [
        state.width,
        state.eaveHeight,
        state.roofPitch,
        state.baySpacing,
        state.bayCount,
        state.buildingType,
        state.leftSide,
        state.rightSide,
        state.hasSolar,
        state.showDimensions,
        state.selectedEponaModel,
        state.selectedTalianModel,
        state.selectedTalian1Model,
        state.selectedTalian3Model,
        state.leftWidth,
        state.rightWidth,
        state.isAcama,
    ]);
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
        setIsAcama: (v) => useConfiguratorStore.getState().setIsAcama(v),
    }), []);
};
