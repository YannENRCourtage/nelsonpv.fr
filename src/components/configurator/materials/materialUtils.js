import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Génère une Normal Map procédurale pour simuler le relief d'un bac acier ondulé.
 * Économise énormément de polygones par rapport à une géométrie réelle.
 * 
 * @param {number} width - Largeur de la texture (puissance de 2 recommandée)
 * @param {number} height - Hauteur de la texture
 * @param {number} frequency - Nombre d'ondulations horizontales
 * @returns {THREE.CanvasTexture}
 */
export function createCorrugatedNormalMap(width = 512, height = 512, frequency = 20) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const imgData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const u = x / width; // [0, 1]

            // Onde sinusoïdale
            const angle = u * Math.PI * 2 * frequency;
            const wave = Math.sin(angle);

            // Calcul de la normale (vecteur perpendiculaire à la surface)
            // Pour une fonction z = A*sin(kx), la dérivée est dz/dx = A*k*cos(kx)
            const amplitude = 1.0;
            const k = Math.PI * 2 * frequency / width;
            const dzdx = amplitude * k * Math.cos(angle);

            // Vecteur normal non normalisé : (-dz/dx, 0, 1)
            const nx = -dzdx;
            const ny = 0;
            const nz = 1;

            // Normalisation
            const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const normX = nx / length;
            const normY = ny / length;
            const normZ = nz / length;

            // Conversion [-1, 1] → [0, 255]
            const idx = (y * width + x) * 4;
            imgData.data[idx] = (normX + 1) * 127.5; // R
            imgData.data[idx + 1] = (normY + 1) * 127.5; // G
            imgData.data[idx + 2] = (normZ + 1) * 127.5; // B
            imgData.data[idx + 3] = 255; // A
        }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10); // Répétition de l'ondulation

    return texture;
}

/**
 * Génère une Roughness Map pour simuler l'aspect pailleté de l'acier galvanisé (zinc).
 * Le motif de cristallisation du zinc crée des variations de brillance.
 * 
 * @param {number} size - Taille de la texture (carrée)
 * @returns {THREE.CanvasTexture}
 */
export function createGalvanizedRoughnessMap(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imgData = ctx.createImageData(size, size);

    // Générateur de bruit haute fréquence (simule les cristaux de zinc)
    for (let i = 0; i < imgData.data.length; i += 4) {
        // Bruit aléatoire dans la plage [100, 180]
        // (évite les extrêmes pour garder un aspect métallique cohérent)
        const noise = Math.floor(Math.random() * 80 + 100);

        imgData.data[i] = noise; // R
        imgData.data[i + 1] = noise; // G
        imgData.data[i + 2] = noise; // B
        imgData.data[i + 3] = 255; // A
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);

    return texture;
}

/**
 * Hook React pour créer un matériau Bac Acier ondulé.
 * Utilise MeshStandardMaterial avec une Normal Map procédurale.
 * 
 * @param {Object} props
 * @param {string} props.color - Couleur du bac acier (hex)
 * @param {number} props.metalness - Métallicité [0, 1]
 * @param {number} props.roughness - Rugosité [0, 1]
 * @returns {JSX.Element}
 */
export function useCorrugatedSteelMaterial({
    color = '#5c6166',
    metalness = 0.3,
    roughness = 0.4
} = {}) {
    const normalMap = useMemo(() => createCorrugatedNormalMap(), []);

    return useMemo(
        () => ({
            color,
            metalness,
            roughness,
            normalMap,
            normalScale: new THREE.Vector2(1, 1),
            envMapIntensity: 1.0
        }),
        [color, metalness, roughness, normalMap]
    );
}

/**
 * Hook React pour créer un matériau Acier Galvanisé.
 * Aspect pailleté typique du zinc cristallisé.
 * 
 * @param {Object} props
 * @param {string} props.color - Couleur de base
 * @param {number} props.metalness - Métallicité [0, 1]
 * @param {number} props.roughness - Rugosité moyenne [0, 1]
 * @returns {JSX.Element}
 */
export function useGalvanizedSteelMaterial({
    color = '#d0d0d0',
    metalness = 0.6,
    roughness = 0.5
} = {}) {
    const roughnessMap = useMemo(() => createGalvanizedRoughnessMap(), []);

    return useMemo(
        () => ({
            color,
            metalness,
            roughness,
            roughnessMap,
            envMapIntensity: 1.2
        }),
        [color, metalness, roughness, roughnessMap]
    );
}
