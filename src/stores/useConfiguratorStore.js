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
export const useConfiguratorStore = create((set, get) => ({
    // ========== CONSTANTES MÉTIER (NON MODIFIABLES) ==========

    /**
     * Pente de toiture fixe
     * @constant {number}
     */
    roofPitch: 10, // Degrés

    /**
     * Hauteur sous égout fixe
     * @constant {number}
     */
    eaveHeight: 5.5, // Mètres

    // ========== PARAMÈTRES CONFIGURABLES ==========

    /**
     * Largeur du bâtiment (portée)
     * Doit être une des valeurs du WIDTH_HEIGHT_MAP
     * @type {number}
     */
    width: 18.6, // Valeur par défaut

    /**
     * Espacement entre les travées (portiques)
     * Choix binaire : 6m ou 7.5m
     * @type {number}
     */
    baySpacing: 7.5, // 6m ou 7.5m (DEFAULT 7.5m)

    /**
     * Nombre de travées
     * Minimum absolu : 4
     * @type {number}
     */
    bayCount: 4,

    /**
     * Présence d'un auvent (accolé gauche)
     * @type {boolean}
     */
    hasAwning: false,

    /**
     * Affichage des côtes
     * @type {boolean}
     */
    showDimensions: true,

    // ========== GETTERS CALCULÉS ==========

    /**
     * Retourne la liste des largeurs disponibles
     * @returns {number[]}
     */
    get availableWidths() {
        return AVAILABLE_WIDTHS;
    },

    // ========== ACTIONS ==========

    /**
     * Change la largeur du bâtiment
     * Valide que la largeur fait partie du mapping
     * @param {number} width - Nouvelle largeur
     */
    setWidth: (width) => {
        if (WIDTH_HEIGHT_MAP[width] !== undefined) {
            set({ width });
        } else {
            console.warn(`Largeur ${width}m non valide. Largeurs autorisées:`, Object.keys(WIDTH_HEIGHT_MAP));
        }
    },

    /**
     * Change l'espacement des travées
     * Uniquement 6m ou 7.5m acceptés
     * @param {number} spacing - 6 ou 7.5
     */
    setBaySpacing: (spacing) => {
        if (spacing === 6 || spacing === 7.5) {
            set({ baySpacing: spacing });
        } else {
            console.warn('Espacement doit être 6m ou 7.5m');
        }
    },

    /**
     * Change le nombre de travées
     * Applique la contrainte min = 4
     * @param {number} count - Nombre de travées souhaité
     */
    setBayCount: (count) => {
        const validCount = Math.max(4, Math.floor(count));
        set({ bayCount: validCount });
    },

    /**
     * Incrémente le nombre de travées
     */
    incrementBayCount: () => {
        set((state) => ({ bayCount: state.bayCount + 1 }));
    },

    /**
     * Décrémente le nombre de travées (min 4)
     */
    decrementBayCount: () => {
        set((state) => ({ bayCount: Math.max(4, state.bayCount - 1) }));
    },

    /**
     * Active/Désactive l'appentis (Droite)
     * Si activé, désactive l'auvent (Gauche) pour éviter conflit visuel/structurel
     */
    toggleAwning: () => {
        set((state) => {
            const newValue = !state.hasAwning;
            return {
                hasAwning: newValue,
                // Si on active l'appentis, on désactive l'auvent
                hasAuvent: newValue ? false : state.hasAuvent
            };
        });
    },

    /**
     * Présence d'un auvent (accolé gauche)
     * @type {boolean}
     */
    hasAuvent: false,

    /**
     * Active/Désactive l'auvent (Gauche)
     * Si activé, désactive l'appentis (Droite)
     */
    toggleAuvent: () => {
        set((state) => {
            const newValue = !state.hasAuvent;
            return {
                hasAuvent: newValue,
                // Si on active l'auvent, on désactive l'appentis
                hasAwning: newValue ? false : state.hasAwning
            };
        });
    },

    /**
     * Présence de couverture solaire PV
     * @type {boolean}
     */
    hasSolar: false,

    /**
     * Active/Désactive la couverture solaire
     */
    toggleSolar: () => {
        set((state) => ({ hasSolar: !state.hasSolar }));
    },

    /**
     * Active/Désactive l'affichage des côtes
     */
    toggleDimensions: () => {
        set((state) => ({ showDimensions: !state.showDimensions }));
    },

    /**
     * Réinitialise la configuration aux valeurs par défaut
     */
    reset: () => set({
        width: 18.6,
        baySpacing: 7.5,
        bayCount: 4,
        hasAwning: false,
        showDimensions: true
    }),

    /**
     * Retourne un résumé de la configuration actuelle
     * @returns {Object}
     */
    getSummary: () => {
        const state = get();
        // Recalcul needed inside getSummary if accessed directly
        const length = state.baySpacing * state.bayCount;
        const ridgeHeight = WIDTH_HEIGHT_MAP[state.width] || WIDTH_HEIGHT_MAP[18.6];
        return {
            width: state.width,
            ridgeHeight: ridgeHeight,
            eaveHeight: state.eaveHeight,
            roofPitch: state.roofPitch,
            baySpacing: state.baySpacing,
            bayCount: state.bayCount,
            length: length,
            hasAwning: state.hasAwning,
            showDimensions: state.showDimensions
        };
    }
}));

// ========== HOOKS ==========

/**
 * Hook helper pour récupérer uniquement les valeurs calculées
 * Évite les re-renders inutiles
 */
export const useConfiguratorValues = () => {
    const state = useConfiguratorStore();

    return React.useMemo(() => {
        // Derived Calculations (Reactive)
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
            // Main Roof: 2 sides
            const halfWidth = state.width / 2;
            const angleRad = (state.roofPitch * Math.PI) / 180;
            const geoSlope = halfWidth / Math.cos(angleRad);
            const roofSlope = geoSlope + 0.50; // + overhang
            const roofLength = length + 1.0; // + overhangs front/back

            solarCount += getPanelCount(roofSlope, roofLength) * 2;

            // Auvent
            if (state.hasAuvent) {
                const auventSlope = 4.0 / Math.cos(angleRad);
                // Auvent length matches building bay structure roughly
                solarCount += getPanelCount(auventSlope, length);
            }

            // Awning
            if (state.hasAwning) {
                const awningWidth = 9.3;
                const awningSlope = awningWidth / Math.cos(angleRad);
                solarCount += getPanelCount(awningSlope, length + 1.0);
            }
        }

        const solarPower = (solarCount * 465) / 1000; // kWc

        return {
            availableWidths: AVAILABLE_WIDTHS,
            width: state.width,
            ridgeHeight: ridgeHeight,
            eaveHeight: state.eaveHeight,
            roofPitch: state.roofPitch,
            baySpacing: state.baySpacing,
            bayCount: state.bayCount,
            length: length,
            hasAwning: state.hasAwning,
            hasAuvent: state.hasAuvent,
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
        state.hasAwning,
        state.hasAuvent,
        state.hasSolar,
        state.showDimensions
    ]);
};

/**
 * Hook helper pour récupérer uniquement les actions
 * VERSION STABILISÉE: Ne déclenche pas de re-render (pas de souscription au state)
 * Les actions sont statiques car définies une seule fois dans le store.
 */
export const useConfiguratorActions = () => {
    return React.useMemo(() => ({
        setWidth: (w) => useConfiguratorStore.getState().setWidth(w),
        setBaySpacing: (s) => useConfiguratorStore.getState().setBaySpacing(s),
        setBayCount: (c) => useConfiguratorStore.getState().setBayCount(c),
        incrementBayCount: () => useConfiguratorStore.getState().incrementBayCount(),
        decrementBayCount: () => useConfiguratorStore.getState().decrementBayCount(),
        toggleAwning: () => useConfiguratorStore.getState().toggleAwning(),
        toggleAuvent: () => useConfiguratorStore.getState().toggleAuvent(),
        toggleSolar: () => useConfiguratorStore.getState().toggleSolar(),
        toggleDimensions: () => useConfiguratorStore.getState().toggleDimensions(),
        reset: () => useConfiguratorStore.getState().reset(),
        getSummary: () => useConfiguratorStore.getState().getSummary()
    }), []);
};
