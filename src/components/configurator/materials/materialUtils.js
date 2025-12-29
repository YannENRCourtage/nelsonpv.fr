import * as THREE from 'three';

/**
 * Génère une Normal Map procédurale pour simuler du Bac Acier (Ondulé).
 * Crée un motif sinusoïdal répété verticalement.
 */
export const createCorrugatedNormalMap = () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Remplir avec neutre (0.5, 0.5, 1.0) -> RGB(128, 128, 255)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // Paramètres ondulation
    const frequency = 20; // Nombre d'ondes

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // L'ondulation est constante sur Y (verticale) et varie sur X (horizontale)
            // Bac acier : ondes verticales. Donc constant sur Y, varie sur X ?
            // Si on veut des ondes verticales (comme des tuyaux debouts), z varie selon x.
            // La normale varie selon x.

            // Hauteur z = sin(x * freq)
            // Normale x = -dz/dx = -cos(x * freq)

            const u = x / size;
            const angle = u * Math.PI * 2 * frequency;

            // Calcul vecteur normal (nx, ny, nz)
            // Surface z(x) = A * sin(kx)
            // Tangente T = (1, 0, A*k*cos(kx))
            // Normale N = (-A*k*cos(kx), 0, 1) normalisé

            // On simplifie : nx varie comme -cos(angle)
            let nx = -Math.cos(angle);
            let ny = 0;
            let nz = 1; // Composante Z dominante

            // Normalisation
            const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= l;
            ny /= l;
            nz /= l;

            // Mapping vers RGB [0, 255]
            // [-1, 1] -> [0, 255]
            const r = Math.floor((nx + 1) * 127.5);
            const g = Math.floor((ny + 1) * 127.5); // 128
            const b = Math.floor((nz + 1) * 127.5); // ~255

            const index = (y * size + x) * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    return texture;
};

/**
 * Génère une Roughness Map de bruit pour simuler l'acier galvanisé.
 */
export const createGalvanizedRoughnessMap = () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Bruit aléatoire entre 100 et 200 (gris moyen)
        const val = Math.floor(Math.random() * 100) + 100;
        data[i] = val;     // R
        data[i + 1] = val;   // G
        data[i + 2] = val;   // B
        data[i + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
};
