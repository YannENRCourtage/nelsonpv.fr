import React from 'react';
import { create } from 'zustand';

/**
 * Mapping of Building Types to Allowed Widths
 */
const TYPE_WIDTHS_MAP = {
    'symetrique': [15.0, 18.6, 22.3, 26.0, 29.8, 33.5],
    'asymetrique_1': [16.4, 20.0],
    'asymetrique_2': [25.5, 29.1],
    'monopente': [12.7, 16.4],
    'ombriere_vl_simple': [6.0],
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
    25.5: 7.8,
    29.1: 8.1,
    // Monopente
    12.7: 6.6,
    // Ombrière VL simple (Low pitch?)
    6.0: 4.5, // Arbitrary
    // Ombrière VL double
    9.1: 5.0,
    11.3: 5.5,
    // Ombrière PL
    15.8: 6.0,
    20.2: 6.5,
    24.6: 7.0
};

const MONOPENTE_HEIGHTS = {
    12.7: 7.4,
    16.4: 8.4
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

    // EXTENSIONS (Left/Right)
    leftSide: 'none', // 'none', 'auvent', 'appentis'
    rightSide: 'none', // 'none', 'auvent', 'appentis'

    get availableWidths() {
        const type = get().buildingType;
        return TYPE_WIDTHS_MAP[type] || TYPE_WIDTHS_MAP['symetrique'];
    },

    // ACTIONS
    setBuildingType: (type) => {
        if (TYPE_WIDTHS_MAP[type]) {
            const defaultWidth = TYPE_WIDTHS_MAP[type][0];
            const updates = { buildingType: type, width: defaultWidth };

            // Forcer la hauteur de sablière pour Monopente
            if (type === 'monopente') {
                updates.eaveHeight = 4.0;

                // Disable Appentis if selected
                const state = get();
                if (state.leftSide === 'appentis') updates.leftSide = 'none';
                if (state.rightSide === 'appentis') updates.rightSide = 'none';
            } else {
                updates.eaveHeight = 5.5;
            }

            set(updates);
        }
    },
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
        hasSolar: false
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
        const length = state.baySpacing * state.bayCount;
        const ridgeHeight = WIDTH_HEIGHT_MAP[state.width] || WIDTH_HEIGHT_MAP[18.6];

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
                const slope = 9.3 / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length + 1.0);
            }

            // Right Side Extension
            if (state.rightSide === 'auvent') {
                const slope = 4.0 / Math.cos(angleRad);
                solarCount += getPanelCount(slope, length);
            } else if (state.rightSide === 'appentis') {
                const slope = 9.3 / Math.cos(angleRad);
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
            solarStats: { count: solarCount, power: solarPower }
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
        state.showDimensions
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
        getSummary: () => useConfiguratorStore.getState().getSummary()
    }), []);
};
