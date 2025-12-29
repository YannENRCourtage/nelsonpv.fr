import * as THREE from 'three';

/**
 * Génère une THREE.Shape représentant la section transversale d'un profilé IPE/IPN.
 * 
 * @param {number} h Hauteur totale du profilé (ex: 0.2 pour IPE 200)
 * @param {number} b Largeur des ailes (ex: 0.1 pour IPE 200)
 * @param {number} e Epaisseur de l'âme (web)
 * @param {number} f Epaisseur des ailes (flange)
 * @param {number} r Rayon de congé (fillet radius) - Optionnel
 * @returns {THREE.Shape} La forme 2D du profilé
 */
export const generateIPEShape = (h, b, e, f, r = 0) => {
    const shape = new THREE.Shape();

    // Moitiés pour centrer le profilé en (0,0)
    const h2 = h / 2;
    const b2 = b / 2;
    const e2 = e / 2;

    // Point de départ: Coin inférieur droit de l'âme (juste avant le congé bas-droit)
    // On dessine dans le sens anti-horaire

    // 1. Début âme droite bas
    shape.moveTo(e2, -h2 + f + r);

    // 2. Congé vers aile basse droite
    if (r > 0) {
        shape.quadraticCurveTo(e2, -h2 + f, e2 + r, -h2 + f);
    } else {
        shape.lineTo(e2, -h2 + f);
    }

    // 3. Aile basse droite (dessous)
    shape.lineTo(b2, -h2 + f);  // Intérieur aile
    shape.lineTo(b2, -h2);      // Coin bas droite ext
    shape.lineTo(-b2, -h2);     // Coin bas gauche ext
    shape.lineTo(-b2, -h2 + f); // Intérieur aile gauche

    // 4. Congé vers âme gauche bas
    if (r > 0) {
        shape.lineTo(-e2 - r, -h2 + f);
        shape.quadraticCurveTo(-e2, -h2 + f, -e2, -h2 + f + r);
    } else {
        shape.lineTo(-e2, -h2 + f);
    }

    // 5. Remontée âme gauche
    shape.lineTo(-e2, h2 - f - r);

    // 6. Congé vers aile haute gauche
    if (r > 0) {
        shape.quadraticCurveTo(-e2, h2 - f, -e2 - r, h2 - f);
    } else {
        shape.lineTo(-e2, h2 - f);
    }

    // 7. Aile haute gauche
    shape.lineTo(-b2, h2 - f);
    shape.lineTo(-b2, h2);
    shape.lineTo(b2, h2);
    shape.lineTo(b2, h2 - f);

    // 8. Congé vers âme droite haut
    if (r > 0) {
        shape.lineTo(e2 + r, h2 - f);
        shape.quadraticCurveTo(e2, h2 - f, e2, h2 - f - r);
    } else {
        shape.lineTo(e2, h2 - f);
    }

    // 9. Redescente âme droite
    shape.lineTo(e2, -h2 + f + r); // Retour point départ (ou presque)

    return shape;
};

/**
 * Données standard pour quelques profilés courants (dimensions en mètres)
 */
export const IPE_Ref = {
    IPE80: { h: 0.08, b: 0.046, e: 0.0038, f: 0.0052, r: 0.005 },
    IPE100: { h: 0.10, b: 0.055, e: 0.0041, f: 0.0057, r: 0.007 },
    IPE180: { h: 0.18, b: 0.091, e: 0.0053, f: 0.0080, r: 0.009 },
    IPE200: { h: 0.20, b: 0.100, e: 0.0056, f: 0.0085, r: 0.012 },
    IPE220: { h: 0.22, b: 0.110, e: 0.0059, f: 0.0092, r: 0.012 },
    IPE240: { h: 0.24, b: 0.120, e: 0.0062, f: 0.0098, r: 0.015 },
    IPE300: { h: 0.30, b: 0.150, e: 0.0071, f: 0.0107, r: 0.015 },
    IPE360: { h: 0.36, b: 0.170, e: 0.0080, f: 0.0127, r: 0.018 },
    IPE450: { h: 0.45, b: 0.190, e: 0.0094, f: 0.0146, r: 0.021 },
};
