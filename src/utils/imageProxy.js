/**
 * Utilitaires pour le chargement et le proxy des images (Firebase Storage, CDNs, URLs distantes)
 * Résout définitivement les problèmes de CORS pour la génération de PDF (DP, PC, Fiches Techniques)
 * sur toutes les plateformes (Web, Mobile iOS/Android, PWA).
 */

/**
 * Transforme une URL d'image en URL passant par notre proxy backend Vercel si nécessaire.
 * Les URLs en data: ou locales ne sont pas altérées.
 * 
 * @param {string} url - URL source de l'image
 * @returns {string} - URL finale à utiliser dans <img src="..." />
 */
export function getProxiedImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    // Data URLs et Blob URLs sont déjà locales en mémoire
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
        return trimmed;
    }

    // Déjà une URL proxy
    if (trimmed.startsWith('/api/proxy-image') || trimmed.includes('/api/proxy-image?url=')) {
        return trimmed;
    }

    // Chemins relatifs locaux (ex: /images/logo.png, /templates/...)
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }

    // URLs externes (Firebase Storage, Google Cloud Storage, CDNs tiers)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Si c'est sur le même domaine en production ou local sans CORS
        try {
            if (typeof window !== 'undefined' && window.location) {
                const parsed = new URL(trimmed);
                if (parsed.origin === window.location.origin) {
                    return trimmed;
                }
            }
        } catch (e) {
            // Ignorer l'erreur d'URL parsing
        }

        // Passer par le proxy serverless
        return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
    }

    return trimmed;
}

/**
 * Télécharge une image et la convertit en Base64 Data URL (data:image/...;base64,...)
 * Garantit 0 blocage CORS et 0 tainting du Canvas html2canvas.
 * 
 * @param {string} url - URL distante ou locale de l'image
 * @param {number} [timeoutMs=20000] - Timeout en millisecondes
 * @returns {Promise<string|null>} - Data URL en base64 ou null en cas d'échec
 */
export async function fetchImageAsDataUrl(url, timeoutMs = 20000) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Déjà une data URL
    if (trimmed.startsWith('data:')) {
        return trimmed;
    }

    // Blob URL
    if (trimmed.startsWith('blob:')) {
        try {
            const res = await fetch(trimmed);
            const blob = await res.blob();
            return await blobToDataUrl(blob);
        } catch (e) {
            console.warn('Erreur conversion blob to dataUrl:', e);
            return null;
        }
    }

    // 1. Tenter d'abord la route proxy avec format=base64
    const proxyBase64Url = `/api/proxy-image?url=${encodeURIComponent(trimmed)}&format=base64`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(proxyBase64Url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && data.dataUrl) {
                return data.dataUrl;
            }
        }
    } catch (proxyErr) {
        console.warn('Proxy JSON base64 fetch échoué, essai streaming binaire:', proxyErr);
    }

    // 2. Fallback: Récupérer le binaire via proxy classique et convertir en base64 côté client
    try {
        const proxyStreamUrl = `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(proxyStreamUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const contentType = res.headers.get('content-type') || 'image/png';
            const arrayBuffer = await res.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return `data:${contentType};base64,${window.btoa(binary)}`;
        }
    } catch (streamErr) {
        console.warn('Proxy streaming fetch échoué:', streamErr);
    }

    // 3. Dernier fallback: Fetch direct (si CORS est autorisé ou même origine)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(trimmed, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const blob = await res.blob();
            return await blobToDataUrl(blob);
        }
    } catch (directErr) {
        console.error('Tous les modes de téléchargement ont échoué pour:', trimmed, directErr);
    }

    return null;
}

/**
 * Convertit un Blob en Data URL via FileReader
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Précharge et convertit toutes les images d'un projet (urbanisme_captures, pc_photos, photos, bâtiments)
 * en Base64 Data URLs avant la génération de PDF.
 * Permet à html2canvas de capturer instantanément sans aucun appel réseau ni restriction CORS.
 * 
 * @param {Object} project - Projet source
 * @returns {Promise<Object>} - Projet enrichi avec toutes les images en data URLs
 */
export async function preloadProjectImages(project) {
    if (!project || typeof project !== 'object') return project;

    const cloned = JSON.parse(JSON.stringify(project));

    // 1. Convertir urbanisme_captures
    if (cloned.urbanisme_captures && typeof cloned.urbanisme_captures === 'object') {
        const keys = Object.keys(cloned.urbanisme_captures);
        await Promise.all(
            keys.map(async (k) => {
                const val = cloned.urbanisme_captures[k];
                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                    const dataUrl = await fetchImageAsDataUrl(val);
                    if (dataUrl) cloned.urbanisme_captures[k] = dataUrl;
                }
            })
        );
    }

    // 2. Convertir pc_photos
    if (cloned.pc_photos && typeof cloned.pc_photos === 'object') {
        const keys = Object.keys(cloned.pc_photos);
        await Promise.all(
            keys.map(async (k) => {
                const val = cloned.pc_photos[k];
                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                    const dataUrl = await fetchImageAsDataUrl(val);
                    if (dataUrl) cloned.pc_photos[k] = dataUrl;
                }
            })
        );
    }

    // 3. Convertir photos (array ou object)
    if (Array.isArray(cloned.photos)) {
        cloned.photos = await Promise.all(
            cloned.photos.map(async (p) => {
                if (typeof p === 'string' && !p.startsWith('data:')) {
                    const dataUrl = await fetchImageAsDataUrl(p);
                    return dataUrl || p;
                }
                return p;
            })
        );
    }

    // 4. Convertir pour chaque bâtiment configuré
    if (Array.isArray(cloned.buildings)) {
        await Promise.all(
            cloned.buildings.map(async (b) => {
                if (b && typeof b === 'object') {
                    // Captures du bâtiment
                    if (b.captures && typeof b.captures === 'object') {
                        const bKeys = Object.keys(b.captures);
                        await Promise.all(
                            bKeys.map(async (k) => {
                                const val = b.captures[k];
                                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                                    const dataUrl = await fetchImageAsDataUrl(val);
                                    if (dataUrl) b.captures[k] = dataUrl;
                                }
                            })
                        );
                    }
                    if (b.urbanisme_captures && typeof b.urbanisme_captures === 'object') {
                        const bKeys = Object.keys(b.urbanisme_captures);
                        await Promise.all(
                            bKeys.map(async (k) => {
                                const val = b.urbanisme_captures[k];
                                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                                    const dataUrl = await fetchImageAsDataUrl(val);
                                    if (dataUrl) b.urbanisme_captures[k] = dataUrl;
                                }
                            })
                        );
                    }
                    // Photos du bâtiment
                    if (b.photos && typeof b.photos === 'object') {
                        const bKeys = Object.keys(b.photos);
                        await Promise.all(
                            bKeys.map(async (k) => {
                                const val = b.photos[k];
                                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                                    const dataUrl = await fetchImageAsDataUrl(val);
                                    if (dataUrl) b.photos[k] = dataUrl;
                                }
                            })
                        );
                    }
                    if (b.pc_photos && typeof b.pc_photos === 'object') {
                        const bKeys = Object.keys(b.pc_photos);
                        await Promise.all(
                            bKeys.map(async (k) => {
                                const val = b.pc_photos[k];
                                if (val && typeof val === 'string' && !val.startsWith('data:')) {
                                    const dataUrl = await fetchImageAsDataUrl(val);
                                    if (dataUrl) b.pc_photos[k] = dataUrl;
                                }
                            })
                        );
                    }
                    // Masse capture spécifique
                    if (b.masse_capture && typeof b.masse_capture === 'string' && !b.masse_capture.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture);
                        if (dataUrl) b.masse_capture = dataUrl;
                    }
                }
            })
        );
    }

    return cloned;
}
