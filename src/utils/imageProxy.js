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

import { getAllCachedMediaForProject } from '@/services/urbanismeMediaService';
import { findBessOdreData } from '@/data/bessOdreMatrix';

const altimetryCache = new Map();

/**
 * Résout les coordonnées GPS centrales et l'orientation d'un projet pour le calcul du profil altimétrique.
 */
export function resolveProjectAltimetryCoords(project = {}) {
    let centerLat = null;
    let centerLng = null;
    let bearingRad = (70 * Math.PI) / 180; // Orientation par défaut WSW -> ENE

    // 1. Chercher un profil altimétrique ou un rectangle (batterie / bâtiment) dans project.features
    const features = Array.isArray(project?.features) ? project.features : [];
    const savedAltiFeature = features.find((f) => f && f.type === 'altimetryProfile' && Array.isArray(f.line) && f.line.length >= 2);
    if (savedAltiFeature) {
        const p0 = savedAltiFeature.line[0];
        const p1 = savedAltiFeature.line[savedAltiFeature.line.length - 1];
        const lat0 = Number(p0?.lat ?? p0?.[0]);
        const lng0 = Number(p0?.lng ?? p0?.[1]);
        const lat1 = Number(p1?.lat ?? p1?.[0]);
        const lng1 = Number(p1?.lng ?? p1?.[1]);
        if (!isNaN(lat0) && !isNaN(lng0) && !isNaN(lat1) && !isNaN(lng1) && lat0 !== 0) {
            centerLat = (lat0 + lat1) / 2;
            centerLng = (lng0 + lng1) / 2;
            const dY = (lat1 - lat0) * 111320;
            const dX = (lng1 - lng0) * 111320 * Math.cos((centerLat * Math.PI) / 180);
            if (Math.abs(dX) > 0.01 || Math.abs(dY) > 0.01) {
                bearingRad = Math.atan2(dX, dY);
            }
        }
    }

    if (centerLat === null || centerLng === null) {
        const rectFeat =
            features.find((f) => f && f.type === 'rectangle' && (f.isBattery || (f.buildingName && String(f.buildingName).toLowerCase().includes('batterie')))) ||
            features.find((f) => f && f.type === 'rectangle' && (f.isPredefinedBuilding || f.buildingName)) ||
            features.find((f) => f && f.type === 'rectangle');
        if (rectFeat && Array.isArray(rectFeat.coords) && rectFeat.coords.length >= 2) {
            const validCoords = rectFeat.coords
                .map((c) => ({ lat: Number(c?.lat ?? c?.[0]), lng: Number(c?.lng ?? c?.[1]) }))
                .filter((c) => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0);
            if (validCoords.length >= 2) {
                centerLat = validCoords.reduce((s, c) => s + c.lat, 0) / validCoords.length;
                centerLng = validCoords.reduce((s, c) => s + c.lng, 0) / validCoords.length;
                const dY = (validCoords[1].lat - validCoords[0].lat) * 111320;
                const dX = (validCoords[1].lng - validCoords[0].lng) * 111320 * Math.cos((centerLat * Math.PI) / 180);
                const baseAngle = Math.atan2(dX, dY);
                const rotRad = ((Number(rectFeat.angle) || 0) * Math.PI) / 180;
                bearingRad = baseAngle + rotRad;
            }
        }
    }

    // 2. Coordonnées explicites du projet
    if (centerLat === null || centerLng === null) {
        const candLat = Number(
            project?.bessLatitude ||
            project?.bess_lat ||
            project?.implantation?.lat ||
            project?.dp_config?.implantation?.lat ||
            project?.lat
        );
        const candLng = Number(
            project?.bessLongitude ||
            project?.bess_lng ||
            project?.implantation?.lng ||
            project?.dp_config?.implantation?.lng ||
            project?.lng
        );
        if (!isNaN(candLat) && !isNaN(candLng) && candLat !== 0 && candLng !== 0) {
            centerLat = candLat;
            centerLng = candLng;
        }
    }

    // 3. Champ GPS string "lat, lng"
    if ((centerLat === null || centerLng === null) && typeof project?.gps === 'string' && project.gps.includes(',')) {
        const parts = project.gps.split(',').map((v) => Number(v.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0) {
            centerLat = parts[0];
            centerLng = parts[1];
        }
    }

    // 4. Matrice ODRE BESS
    if (centerLat === null || centerLng === null) {
        const odre = findBessOdreData(
            project?.name || project?.clientName || project?.client_name || project?.lastName || project?.demandeur || '',
            project?.city || project?.commune || project?.cadastre_commune || '',
            project?.address || project?.clientAddress || '',
            project?.lat,
            project?.lng
        );
        if (odre && odre.latitude && odre.longitude) {
            centerLat = Number(odre.bessLatitude || odre.latitude);
            centerLng = Number(odre.bessLongitude || odre.longitude);
        }
    }

    if (centerLat === null || centerLng === null || isNaN(centerLat) || isNaN(centerLng)) {
        centerLat = 45.75118;
        centerLng = 0.627512;
    }

    return { centerLat, centerLng, bearingRad };
}

/**
 * Construit un profil altimétrique de repli synchrone (avant réponse IGN ou hors-ligne)
 * avec plateforme mise à plat au centre et profils de terrain naturel à gauche et à droite.
 */
export function buildFallbackAltimetryProfile(project = {}) {
    if (project?.altimetryTerrainProfile && Array.isArray(project.altimetryTerrainProfile.points) && project.altimetryTerrainProfile.points.length >= 5) {
        return project.altimetryTerrainProfile;
    }

    const rawType = String(project?.buildingType || project?.type || '').toLowerCase();
    const isBattery =
        project?.solutionType === 'battery' ||
        Boolean(project?.isBattery) ||
        Boolean(project?.isBatteryStandAlone) ||
        rawType.includes('battery') ||
        rawType.includes('batterie');

    const platformLengthM = isBattery
        ? Number(project?.batteryStorage?.dalleLength || project?.longueur || 6.20) || 6.20
        : Math.max(6.0, parseFloat(project?.largeur || project?.width || 16.4) || 16.4);

    const leftMarginM = isBattery ? 6.0 : Math.max(5.0, Math.round(platformLengthM * 0.35));
    const rightMarginM = leftMarginM;
    const totalDistM = leftMarginM + platformLengthM + rightMarginM;
    const platStartDist = leftMarginM;
    const platEndDist = leftMarginM + platformLengthM;
    const talusM = isBattery ? 0.65 : 1.0;

    // Si un profil manuel a été enregistré dans le projet, récupérer son altitude moyenne
    const features = Array.isArray(project?.features) ? project.features : [];
    const savedProfile = project?.altimetryProfile || features.find((f) => f && f.type === 'altimetryProfile');
    const savedAlts = Array.isArray(savedProfile?.data)
        ? savedProfile.data.map((d) => Number(d.altitude)).filter((z) => !isNaN(z) && z > 0)
        : [];

    const parsedProjAlt = parseFloat(String(project?.altitude || project?.terrain_altitude || '').replace(',', '.'));
    const baseAlt = savedAlts.length > 0
        ? savedAlts.reduce((a, b) => a + b, 0) / savedAlts.length
        : (!isNaN(parsedProjAlt) && parsedProjAlt > 1 && Math.abs(parsedProjAlt - 140.62) > 0.05 ? parsedProjAlt : 271.5);

    const slopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 2.2) || 2.2;
    const totalDeltaZ = savedAlts.length >= 2
        ? (savedAlts[savedAlts.length - 1] - savedAlts[0])
        : Math.min(1.6, Math.max(0.55, Math.tan((slopeDeg * Math.PI) / 180) * totalDistM));

    const numSamples = 25;
    const points = [];
    for (let i = 0; i < numSamples; i++) {
        const ratio = i / (numSamples - 1);
        const dist = ratio * totalDistM;
        const centered = ratio - 0.5;
        // Légère ondulation naturelle + pente régulière du terrain
        const undulation = Math.sin(ratio * Math.PI * 2.2) * 0.06;
        const naturalAlt = baseAlt + centered * totalDeltaZ + undulation;
        points.push({ dist, naturalAlt, leveledAlt: naturalAlt });
    }

    const platPoints = points.filter((p) => p.dist >= platStartDist && p.dist <= platEndDist);
    const platformAlt = platPoints.length > 0
        ? platPoints.reduce((s, p) => s + p.naturalAlt, 0) / platPoints.length
        : baseAlt;

    points.forEach((p) => {
        if (p.dist >= platStartDist && p.dist <= platEndDist) {
            p.leveledAlt = platformAlt;
        } else if (p.dist > platStartDist - talusM && p.dist < platStartDist) {
            const t = (p.dist - (platStartDist - talusM)) / talusM;
            p.leveledAlt = p.naturalAlt * (1 - t) + platformAlt * t;
        } else if (p.dist > platEndDist && p.dist < platEndDist + talusM) {
            const t = (p.dist - platEndDist) / talusM;
            p.leveledAlt = platformAlt * (1 - t) + p.naturalAlt * t;
        } else {
            p.leveledAlt = p.naturalAlt;
        }
    });

    const natAlts = points.map((p) => p.naturalAlt);
    const minAlt = Math.min(...natAlts);
    const maxAlt = Math.max(...natAlts);
    const deniveleTotal = Math.abs(points[points.length - 1].naturalAlt - points[0].naturalAlt);
    const penteMoyenne = totalDistM > 0 ? (Math.abs(maxAlt - minAlt) / totalDistM) * 100 : 3.2;

    return {
        points,
        platformAlt,
        minAlt,
        maxAlt,
        leftAlt: points[0].naturalAlt,
        rightAlt: points[points.length - 1].naturalAlt,
        totalDistM,
        platStartDist,
        platEndDist,
        platformLengthM,
        stats: {
            distance: totalDistM,
            deniveleTotal: savedProfile?.stats?.deniveleTotal ?? deniveleTotal,
            penteMoyenne: savedProfile?.stats?.penteMoyenne ?? penteMoyenne,
            maxPente: savedProfile?.stats?.maxPente ?? Math.max(penteMoyenne * 1.8, 7.2)
        },
        source: 'fallback'
    };
}

/**
 * Interroge l'API Altimétrie IGN RGE ALTI (Géoplateforme data.geopf.fr, identique à l'outil "Profil Alti")
 * pour générer le profil altimétrique réel du terrain avec mise à plat à l'emplacement de la plateforme
 * et profils de terrain naturel conservés à gauche et à droite.
 */
export async function fetchProjectAltimetryProfile(project = {}) {
    if (project?.altimetryTerrainProfile && project.altimetryTerrainProfile.source === 'ign' && Array.isArray(project.altimetryTerrainProfile.points)) {
        return project.altimetryTerrainProfile;
    }

    const { centerLat, centerLng, bearingRad } = resolveProjectAltimetryCoords(project);
    const rawType = String(project?.buildingType || project?.type || '').toLowerCase();
    const isBattery =
        project?.solutionType === 'battery' ||
        Boolean(project?.isBattery) ||
        Boolean(project?.isBatteryStandAlone) ||
        rawType.includes('battery') ||
        rawType.includes('batterie');

    const platformLengthM = isBattery
        ? Number(project?.batteryStorage?.dalleLength || project?.longueur || 6.20) || 6.20
        : Math.max(6.0, parseFloat(project?.largeur || project?.width || 16.4) || 16.4);

    const leftMarginM = isBattery ? 6.0 : Math.max(5.0, Math.round(platformLengthM * 0.35));
    const rightMarginM = leftMarginM;
    const totalDistM = leftMarginM + platformLengthM + rightMarginM;
    const platStartDist = leftMarginM;
    const platEndDist = leftMarginM + platformLengthM;
    const talusM = isBattery ? 0.65 : 1.0;

    const cacheKey = `${centerLat.toFixed(5)}_${centerLng.toFixed(5)}_${bearingRad.toFixed(2)}_${totalDistM.toFixed(1)}`;
    if (altimetryCache.has(cacheKey)) {
        return altimetryCache.get(cacheKey);
    }

    const numSamples = 25;
    const sampleCoords = [];
    for (let i = 0; i < numSamples; i++) {
        const ratio = i / (numSamples - 1);
        const dist = ratio * totalDistM;
        const offsetM = dist - totalDistM / 2;
        const lat = centerLat + (offsetM * Math.cos(bearingRad)) / 111320;
        const lng = centerLng + (offsetM * Math.sin(bearingRad)) / (111320 * Math.cos((centerLat * Math.PI) / 180));
        sampleCoords.push({ dist, lat, lng, alt: null });
    }

    try {
        const lons = sampleCoords.map((p) => p.lng.toFixed(6)).join('|');
        const lats = sampleCoords.map((p) => p.lat.toFixed(6)).join('|');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(
            `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?resource=ign_rge_alti_wld&lon=${lons}&lat=${lats}&zonly=false`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.elevations) && data.elevations.length === numSamples) {
                let validCount = 0;
                data.elevations.forEach((elev, idx) => {
                    const z = Number(elev?.z);
                    if (!isNaN(z) && z > -100 && z < 5000) {
                        sampleCoords[idx].alt = z;
                        validCount++;
                    }
                });

                if (validCount >= Math.floor(numSamples * 0.7)) {
                    // Combler d'éventuels trous isolés
                    let lastValid = sampleCoords.find((p) => p.alt !== null)?.alt || 200;
                    sampleCoords.forEach((p) => {
                        if (p.alt === null) p.alt = lastValid;
                        else lastValid = p.alt;
                    });

                    const rawAlts = sampleCoords.map((p) => p.alt);
                    const rawMin = Math.min(...rawAlts);
                    const rawMax = Math.max(...rawAlts);

                    // Si le MNT IGN est localement très plat (< 0.12m d'écart), ajouter un léger profil naturel continu
                    // pour que la pente du terrain naturel à gauche et à droite de la plateforme mise à plat soit bien lisible
                    const needMicroRelief = (rawMax - rawMin) < 0.12;
                    const points = sampleCoords.map((p, idx) => {
                        const ratio = idx / (numSamples - 1);
                        const micro = needMicroRelief ? (ratio - 0.5) * 0.55 + Math.sin(ratio * Math.PI * 2) * 0.04 : 0;
                        const naturalAlt = p.alt + micro;
                        return { dist: p.dist, lat: p.lat, lng: p.lng, naturalAlt, leveledAlt: naturalAlt };
                    });

                    const platPoints = points.filter((p) => p.dist >= platStartDist && p.dist <= platEndDist);
                    const platformAlt = platPoints.length > 0
                        ? platPoints.reduce((s, p) => s + p.naturalAlt, 0) / platPoints.length
                        : points[Math.floor(points.length / 2)].naturalAlt;

                    points.forEach((p) => {
                        if (p.dist >= platStartDist && p.dist <= platEndDist) {
                            p.leveledAlt = platformAlt;
                        } else if (p.dist > platStartDist - talusM && p.dist < platStartDist) {
                            const t = (p.dist - (platStartDist - talusM)) / talusM;
                            p.leveledAlt = p.naturalAlt * (1 - t) + platformAlt * t;
                        } else if (p.dist > platEndDist && p.dist < platEndDist + talusM) {
                            const t = (p.dist - platEndDist) / talusM;
                            p.leveledAlt = platformAlt * (1 - t) + p.naturalAlt * t;
                        } else {
                            p.leveledAlt = p.naturalAlt;
                        }
                    });

                    let denivelePos = 0;
                    let deniveleNeg = 0;
                    let maxPente = 0;
                    for (let i = 1; i < points.length; i++) {
                        const diff = points[i].naturalAlt - points[i - 1].naturalAlt;
                        if (diff > 0) denivelePos += diff;
                        else deniveleNeg += Math.abs(diff);
                        const segDist = points[i].dist - points[i - 1].dist;
                        if (segDist > 0) {
                            const p = (Math.abs(diff) / segDist) * 100;
                            if (p > maxPente) maxPente = p;
                        }
                    }

                    const natAlts = points.map((p) => p.naturalAlt);
                    const minAlt = Math.min(...natAlts);
                    const maxAlt = Math.max(...natAlts);
                    const deniveleTotal = Math.abs(points[points.length - 1].naturalAlt - points[0].naturalAlt);
                    const penteMoyenne = totalDistM > 0 ? ((denivelePos + deniveleNeg) / totalDistM) * 100 : 0;

                    const features = Array.isArray(project?.features) ? project.features : [];
                    const savedProfile = project?.altimetryProfile || features.find((f) => f && f.type === 'altimetryProfile');

                    const result = {
                        points,
                        platformAlt,
                        minAlt,
                        maxAlt,
                        leftAlt: points[0].naturalAlt,
                        rightAlt: points[points.length - 1].naturalAlt,
                        totalDistM,
                        platStartDist,
                        platEndDist,
                        platformLengthM,
                        stats: {
                            distance: savedProfile?.stats?.distance || totalDistM,
                            deniveleTotal: savedProfile?.stats?.deniveleTotal ?? deniveleTotal,
                            penteMoyenne: savedProfile?.stats?.penteMoyenne ?? penteMoyenne,
                            maxPente: savedProfile?.stats?.maxPente ?? maxPente
                        },
                        source: 'ign'
                    };
                    altimetryCache.set(cacheKey, result);
                    return result;
                }
            }
        }
    } catch (err) {
        console.warn('[fetchProjectAltimetryProfile] Repli sur profil altimétrique calculé:', err?.message || err);
    }

    const fallback = buildFallbackAltimetryProfile(project);
    altimetryCache.set(cacheKey, fallback);
    return fallback;
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

    // Récupérer le cache local IndexedDB si disponible (accès instantané 0ms)
    let cached = null;
    if (cloned.id) {
        try {
            cached = await getAllCachedMediaForProject(cloned.id);
        } catch (e) {
            console.warn('Erreur lecture cache local dans preloadProjectImages:', e);
        }
    }

    if (cached) {
        if (cached.captures && Object.keys(cached.captures).length > 0) {
            cloned.urbanisme_captures = { ...cached.captures, ...(cloned.urbanisme_captures || {}) };
        }
        if (cached.photos && Object.keys(cached.photos).length > 0) {
            cloned.pc_photos = { ...cached.photos, ...(cloned.pc_photos || {}) };
        }
    }

    // 1. Convertir urbanisme_captures (ne jamais écraser une Data URL fraîche par un vieux cache)
    if (cloned.urbanisme_captures && typeof cloned.urbanisme_captures === 'object') {
        const keys = Object.keys(cloned.urbanisme_captures);
        await Promise.all(
            keys.map(async (k) => {
                const val = cloned.urbanisme_captures[k];
                if (val && typeof val === 'string' && val.startsWith('data:')) {
                    return;
                }
                if (cached?.captures?.[k]) {
                    cloned.urbanisme_captures[k] = cached.captures[k];
                    return;
                }
                if (val && typeof val === 'string') {
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
                if (val && typeof val === 'string' && val.startsWith('data:')) {
                    return;
                }
                if (cached?.photos?.[k]) {
                    cloned.pc_photos[k] = cached.photos[k];
                    return;
                }
                if (val && typeof val === 'string') {
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

    // 3bis. Convertir masse_capture directes au niveau du projet
    if (cloned.masse_capture && typeof cloned.masse_capture === 'string' && !cloned.masse_capture.startsWith('data:')) {
        const dataUrl = await fetchImageAsDataUrl(cloned.masse_capture);
        if (dataUrl) cloned.masse_capture = dataUrl;
    }
    if (cloned.masse_capture_2 && typeof cloned.masse_capture_2 === 'string' && !cloned.masse_capture_2.startsWith('data:')) {
        const dataUrl = await fetchImageAsDataUrl(cloned.masse_capture_2);
        if (dataUrl) cloned.masse_capture_2 = dataUrl;
    }
    if (cloned.masse_capture_3 && typeof cloned.masse_capture_3 === 'string' && !cloned.masse_capture_3.startsWith('data:')) {
        const dataUrl = await fetchImageAsDataUrl(cloned.masse_capture_3);
        if (dataUrl) cloned.masse_capture_3 = dataUrl;
    }

    // 4. Convertir pour chaque bâtiment configuré
    if (Array.isArray(cloned.buildings)) {
        await Promise.all(
            cloned.buildings.map(async (b, bIdx) => {
                if (b && typeof b === 'object') {
                    const bKey = b.id || `bat-${bIdx + 1}`;
                    const bCache = cached?.buildingsMedia?.[bKey] || cached?.buildingsMedia?.[`b${bIdx}`] || {};

                    // Captures du bâtiment
                    if (b.captures && typeof b.captures === 'object') {
                        const bKeys = Object.keys(b.captures);
                        await Promise.all(
                            bKeys.map(async (k) => {
                                const val = b.captures[k];
                                if (val && typeof val === 'string' && val.startsWith('data:')) {
                                    return;
                                }
                                if (bCache?.captures?.[k]) {
                                    b.captures[k] = bCache.captures[k];
                                    return;
                                }
                                if (val && typeof val === 'string') {
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
                                if (val && typeof val === 'string' && val.startsWith('data:')) {
                                    return;
                                }
                                if (bCache?.captures?.[k]) {
                                    b.urbanisme_captures[k] = bCache.captures[k];
                                    return;
                                }
                                if (val && typeof val === 'string') {
                                    const dataUrl = await fetchImageAsDataUrl(val);
                                    if (dataUrl) b.urbanisme_captures[k] = dataUrl;
                                }
                            })
                        );
                    }
                    // Propriétés directes de plan de masse du bâtiment
                    if (b.masse_capture && typeof b.masse_capture === 'string' && !b.masse_capture.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture);
                        if (dataUrl) b.masse_capture = dataUrl;
                    }
                    if (b.masse_capture_2 && typeof b.masse_capture_2 === 'string' && !b.masse_capture_2.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture_2);
                        if (dataUrl) b.masse_capture_2 = dataUrl;
                    }
                    if (b.masse_capture_3 && typeof b.masse_capture_3 === 'string' && !b.masse_capture_3.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture_3);
                        if (dataUrl) b.masse_capture_3 = dataUrl;
                    }
                    // Photos du bâtiment
                    if (b.photos && typeof b.photos === 'object') {
                        const bKeys = Object.keys(b.photos);
                        await Promise.all(
                            bKeys.map(async (k) => {
                                const val = b.photos[k];
                                if (val && typeof val === 'string' && val.startsWith('data:')) {
                                    return;
                                }
                                if (bCache?.photos?.[k]) {
                                    b.photos[k] = bCache.photos[k];
                                    return;
                                }
                                if (val && typeof val === 'string') {
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
                                if (val && typeof val === 'string' && val.startsWith('data:')) {
                                    return;
                                }
                                if (bCache?.photos?.[k]) {
                                    b.pc_photos[k] = bCache.photos[k];
                                    return;
                                }
                                if (val && typeof val === 'string') {
                                    const dataUrl = await fetchImageAsDataUrl(val);
                                    if (dataUrl) b.pc_photos[k] = dataUrl;
                                }
                            })
                        );
                    }
                    // Masse capture spécifique (Vue 1 et Vue 2)
                    if (b.masse_capture && typeof b.masse_capture === 'string' && !b.masse_capture.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture);
                        if (dataUrl) b.masse_capture = dataUrl;
                    }
                    if (b.masse_capture_2 && typeof b.masse_capture_2 === 'string' && !b.masse_capture_2.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture_2);
                        if (dataUrl) b.masse_capture_2 = dataUrl;
                    }
                    if (b.masse_capture_3 && typeof b.masse_capture_3 === 'string' && !b.masse_capture_3.startsWith('data:')) {
                        const dataUrl = await fetchImageAsDataUrl(b.masse_capture_3);
                        if (dataUrl) b.masse_capture_3 = dataUrl;
                    }
                }
            })
        );
    }

    // 5. Précharger le profil altimétrique IGN du terrain pour le plan en coupe (DP3 / PC3)
    try {
        const altiProfile = await fetchProjectAltimetryProfile(cloned);
        if (altiProfile) {
            cloned.altimetryTerrainProfile = altiProfile;
            if (!cloned.altitude || String(cloned.altitude).includes('140.62')) {
                cloned.altitude = `${altiProfile.platformAlt.toFixed(2)} m`;
            }
        }
    } catch (e) {
        console.warn('Erreur préchargement profil altimétrique:', e);
    }

    return cloned;
}
