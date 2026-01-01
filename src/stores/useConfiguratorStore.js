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
     * NOTE: Derived values (length, ridgeHeight) are now computed in hooks 
     * to avoid reactivity issues with getters in Zustand state object.
     */

    /**
     * Retourne la liste des largeurs disponibles
     * @returns {number[]}
     */
    get availableWidths() {
        return Object.keys(WIDTH_HEIGHT_MAP).map(Number).sort((a, b) => a - b);
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

/**
 * Hook helper pour récupérer uniquement les valeurs calculées
 * Évite les re-renders inutiles
 */
export const useConfiguratorValues = () => {
    const state = useConfiguratorStore();

    // Derived Calculations (Reactive)
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
        hasAuvent: state.hasAuvent,
        showDimensions: state.showDimensions
    };
};

/**
 * Hook helper pour récupérer uniquement les actions
 */
/**
 * Hook helper pour récupérer uniquement les actions
 * VERSION STABILISÉE: Ne déclenche pas de re-render (pas de souscription au state)
 * Les actions sont statiques car définies une seule fois dans le store.
 */
export const useConfiguratorActions = () => {
    // On utilise useMemo pour retourner toujours la même instance d'objet actions
    // On appelle directement les méthodes du store via getState() pour éviter la souscription
    return React.useMemo(() => ({
        setWidth: (w) => useConfiguratorStore.getState().setWidth(w),
        setBaySpacing: (s) => useConfiguratorStore.getState().setBaySpacing(s),
        setBayCount: (c) => useConfiguratorStore.getState().setBayCount(c),
        incrementBayCount: () => useConfiguratorStore.getState().incrementBayCount(),
        decrementBayCount: () => useConfiguratorStore.getState().decrementBayCount(),
        toggleAwning: () => useConfiguratorStore.getState().toggleAwning(),
        toggleAuvent: () => useConfiguratorStore.getState().toggleAuvent(),
        toggleDimensions: () => useConfiguratorStore.getState().toggleDimensions(),
        reset: () => useConfiguratorStore.getState().reset(),
        getSummary: () => useConfiguratorStore.getState().getSummary()
    }), []);
};
