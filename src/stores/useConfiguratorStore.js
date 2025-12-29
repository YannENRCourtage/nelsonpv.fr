import { create } from 'zustand';

/**
 * Mapping STRICT : Largeur → Hauteur Faîtage
 * Correspondance exacte selon spécifications SCREB
 */
const WIDTH_HEIGHT_MAP = {
    15.0: 6.82,
    18.6: 7.14,
    22.3: 7.47,
    26.0: 7.80,
    29.8: 8.12,
    33.5: 8.45
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

    // ========== GETTERS CALCULÉS ==========

    /**
     * Retourne la hauteur de faîtage correspondant à la largeur sélectionnée
     * @returns {number} Hauteur en mètres
     */
    get ridgeHeight() {
        const width = get().width;
        return WIDTH_HEIGHT_MAP[width] || WIDTH_HEIGHT_MAP[18.6]; // Fallback
    },

    /**
     * Calcule la longueur totale du bâtiment
     * Formule : Espacement × Nombre de travées
     * @returns {number} Longueur en mètres
     */
    get length() {
        return get().baySpacing * get().bayCount;
    },

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
     * Réinitialise la configuration aux valeurs par défaut
     */
    reset: () => set({
        width: 18.6,
        baySpacing: 7.5,
        bayCount: 4
    }),

    /**
     * Retourne un résumé de la configuration actuelle
     * @returns {Object}
     */
    getSummary: () => {
        const state = get();
        return {
            width: state.width,
            ridgeHeight: state.ridgeHeight,
            eaveHeight: state.eaveHeight,
            roofPitch: state.roofPitch,
            baySpacing: state.baySpacing,
            bayCount: state.bayCount,
            length: state.length
        };
    }
}));

/**
 * Hook helper pour récupérer uniquement les valeurs calculées
 * Évite les re-renders inutiles
 */
export const useConfiguratorValues = () => {
    const state = useConfiguratorStore();
    return {
        width: state.width,
        ridgeHeight: state.ridgeHeight,
        eaveHeight: state.eaveHeight,
        roofPitch: state.roofPitch,
        baySpacing: state.baySpacing,
        bayCount: state.bayCount,
        length: state.length
    };
};

/**
 * Hook helper pour récupérer uniquement les actions
 */
export const useConfiguratorActions = () => {
    return useConfiguratorStore((state) => ({
        setWidth: state.setWidth,
        setBaySpacing: state.setBaySpacing,
        setBayCount: state.setBayCount,
        incrementBayCount: state.incrementBayCount,
        decrementBayCount: state.decrementBayCount,
        reset: state.reset,
        getSummary: state.getSummary
    }));
};
