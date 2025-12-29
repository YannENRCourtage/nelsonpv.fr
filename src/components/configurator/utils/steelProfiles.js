import * as THREE from 'three';

/**
 * Génère une THREE.Shape représentant la section transversale d'un profilé IPE/IPN.
 * La forme est centrée sur l'origine (0, 0) pour faciliter les rotations.
 * 
 * @param {Object} params - Paramètres du profilé
 * @param {number} params.h - Hauteur totale du profilé (m)
 * @param {number} params.b - Largeur des semelles (m)
 * @param {number} params.tw - Épaisseur de l'âme (web thickness) (m)
 * @param {number} params.tf - Épaisseur des semelles (flange thickness) (m)
 * @param {number} [params.r=0] - Rayon de congé (fillet radius) (m)
 * @returns {THREE.Shape} La forme 2D du profilé en I
 */
export function createIPEShape({ h, b, tw, tf, r = 0 }) {
    const shape = new THREE.Shape();

    // Demi-dimensions pour centrage
    const h2 = h / 2;
    const b2 = b / 2;
    const tw2 = tw / 2;

    // Démarrage au coin inférieur gauche de la semelle inférieure
    shape.moveTo(-b2, -h2);

    // Semelle inférieure (bottom flange) - tracé horaire
    shape.lineTo(b2, -h2);
    shape.lineTo(b2, -h2 + tf);

    // Transition vers l'âme avec congé droit
    if (r > 0) {
        shape.lineTo(tw2 + r, -h2 + tf);
        shape.quadraticCurveTo(tw2, -h2 + tf, tw2, -h2 + tf + r);
    } else {
        shape.lineTo(tw2, -h2 + tf);
    }

    // Âme droite (web right side)
    shape.lineTo(tw2, h2 - tf - r);

    // Transition vers semelle supérieure avec congé droit
    if (r > 0) {
        shape.quadraticCurveTo(tw2, h2 - tf, tw2 + r, h2 - tf);
    } else {
        shape.lineTo(tw2, h2 - tf);
    }

    // Semelle supérieure (top flange) - partie droite
    shape.lineTo(b2, h2 - tf);
    shape.lineTo(b2, h2);
    shape.lineTo(-b2, h2);
    shape.lineTo(-b2, h2 - tf);

    // Transition vers l'âme avec congé gauche
    if (r > 0) {
        shape.lineTo(-tw2 - r, h2 - tf);
        shape.quadraticCurveTo(-tw2, h2 - tf, -tw2, h2 - tf - r);
    } else {
        shape.lineTo(-tw2, h2 - tf);
    }

    // Âme gauche (web left side)
    shape.lineTo(-tw2, -h2 + tf + r);

    // Transition vers semelle inférieure avec congé gauche
    if (r > 0) {
        shape.quadraticCurveTo(-tw2, -h2 + tf, -tw2 - r, -h2 + tf);
    } else {
        shape.lineTo(-tw2, -h2 + tf);
    }

    // Retour au point de départ
    shape.lineTo(-b2, -h2 + tf);
    shape.lineTo(-b2, -h2);

    return shape;
}

/**
 * Catalogue de profilés IPE normalisés (norme européenne EN 10034)
 * Toutes les dimensions sont en mètres.
 * 
 * Nomenclature :
 * - h: hauteur totale
 * - b: largeur des semelles
 * - tw: épaisseur de l'âme (web)
 * - tf: épaisseur des semelles (flange)
 * - r: rayon de congé
 */
export const IPE_CATALOG = {
    IPE80: {
        h: 0.080,
        b: 0.046,
        tw: 0.0038,
        tf: 0.0052,
        r: 0.005,
        label: 'IPE 80'
    },
    IPE100: {
        h: 0.100,
        b: 0.055,
        tw: 0.0041,
        tf: 0.0057,
        r: 0.007,
        label: 'IPE 100'
    },
    IPE120: {
        h: 0.120,
        b: 0.064,
        tw: 0.0044,
        tf: 0.0063,
        r: 0.007,
        label: 'IPE 120'
    },
    IPE140: {
        h: 0.140,
        b: 0.073,
        tw: 0.0047,
        tf: 0.0069,
        r: 0.007,
        label: 'IPE 140'
    },
    IPE160: {
        h: 0.160,
        b: 0.082,
        tw: 0.0050,
        tf: 0.0074,
        r: 0.009,
        label: 'IPE 160'
    },
    IPE180: {
        h: 0.180,
        b: 0.091,
        tw: 0.0053,
        tf: 0.0080,
        r: 0.009,
        label: 'IPE 180'
    },
    IPE200: {
        h: 0.200,
        b: 0.100,
        tw: 0.0056,
        tf: 0.0085,
        r: 0.012,
        label: 'IPE 200'
    },
    IPE220: {
        h: 0.220,
        b: 0.110,
        tw: 0.0059,
        tf: 0.0092,
        r: 0.012,
        label: 'IPE 220'
    },
    IPE240: {
        h: 0.240,
        b: 0.120,
        tw: 0.0062,
        tf: 0.0098,
        r: 0.015,
        label: 'IPE 240'
    },
    IPE270: {
        h: 0.270,
        b: 0.135,
        tw: 0.0066,
        tf: 0.0102,
        r: 0.015,
        label: 'IPE 270'
    },
    IPE300: {
        h: 0.300,
        b: 0.150,
        tw: 0.0071,
        tf: 0.0107,
        r: 0.015,
        label: 'IPE 300'
    },
    IPE330: {
        h: 0.330,
        b: 0.160,
        tw: 0.0075,
        tf: 0.0117,
        r: 0.018,
        label: 'IPE 330'
    },
    IPE360: {
        h: 0.360,
        b: 0.170,
        tw: 0.0080,
        tf: 0.0127,
        r: 0.018,
        label: 'IPE 360'
    },
    IPE400: {
        h: 0.400,
        b: 0.180,
        tw: 0.0086,
        tf: 0.0135,
        r: 0.021,
        label: 'IPE 400'
    },
    IPE450: {
        h: 0.450,
        b: 0.190,
        tw: 0.0094,
        tf: 0.0146,
        r: 0.021,
        label: 'IPE 450'
    },
    IPE500: {
        h: 0.500,
        b: 0.200,
        tw: 0.0102,
        tf: 0.0160,
        r: 0.021,
        label: 'IPE 500'
    },
    IPE550: {
        h: 0.550,
        b: 0.210,
        tw: 0.0111,
        tf: 0.0171,
        r: 0.024,
        label: 'IPE 550'
    },
    IPE600: {
        h: 0.600,
        b: 0.220,
        tw: 0.0120,
        tf: 0.0190,
        r: 0.024,
        label: 'IPE 600'
    },
};

/**
 * Crée une géométrie 3D extrudée à partir d'un profilé IPE.
 * 
 * @param {string} profileName - Nom du profilé (ex: 'IPE300')
 * @param {number} length - Longueur d'extrusion (m)
 * @returns {THREE.ExtrudeGeometry}
 */
export function createIPEGeometry(profileName, length) {
    const profile = IPE_CATALOG[profileName];

    if (!profile) {
        console.warn(`Profilé ${profileName} non trouvé dans le catalogue. Utilisation de IPE200 par défaut.`);
        return createIPEGeometry('IPE200', length);
    }

    const shape = createIPEShape(profile);

    return new THREE.ExtrudeGeometry(shape, {
        depth: length,
        bevelEnabled: false,
        steps: 1 // Pas besoin de subdivision pour une extrusion linéaire
    });
}

/**
 * Retourne la liste des noms de profilés disponibles pour les UI (dropdowns)
 * @returns {string[]}
 */
export function getAvailableProfiles() {
    return Object.keys(IPE_CATALOG);
}
