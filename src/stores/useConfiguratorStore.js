import React from 'react';
import { create } from 'zustand';

/**
 * Mapping STRICT : Largeur → Hauteur Faîtage
 * Correspondance exacte selon spécifications SCREB
 */
const WIDTH_HEIGHT_MAP = {
    15.0: 6.8,
    18.6: 7.1,
    22.3: 7.5,
    26.0: 7.8,
    29.8: 8.1,
    33.5: 8.5
};

const AVAILABLE_WIDTHS = Object.keys(WIDTH_HEIGHT_MAP).map(Number).sort((a, b) => a - b);

/**
 * Store Zustand pour le Configurateur 3D
 * Logique métier codée en dur selon contraintes SCREB
 */
// ... (imports and constants)

export const useConfiguratorStore = create((set, get) => ({
    // ... (existing constants and params)
    roofPitch: 10,
    eaveHeight: 5.5,
    width: 18.6,
    baySpacing: 7.5,
    bayCount: 4,
    showDimensions: true,

    // EXTENSIONS (Left/Right)
    leftSide: 'none', // 'none', 'auvent', 'appentis'
    rightSide: 'none', // 'none', 'auvent', 'appentis'

    get availableWidths() {
        return AVAILABLE_WIDTHS;
    },

    // ACTIONS
    setWidth: (width) => {
        if (WIDTH_HEIGHT_MAP[width] !== undefined) set({ width });
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
        const ridgeHeight = WIDTH_HEIGHT_MAP[state.width] || WIDTH_HEIGHT_MAP[18.6];
        return {
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

        return {
            availableWidths: AVAILABLE_WIDTHS,
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
        setLeftSide: (t) => useConfiguratorStore.getState().setLeftSide(t),
        setRightSide: (t) => useConfiguratorStore.getState().setRightSide(t),
        toggleSolar: () => useConfiguratorStore.getState().toggleSolar(),
        toggleDimensions: () => useConfiguratorStore.getState().toggleDimensions(),
        reset: () => useConfiguratorStore.getState().reset(),
        getSummary: () => useConfiguratorStore.getState().getSummary()
    }), []);
};
