import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase.js';
import { apiService } from '@/services/api';

// ─── IndexedDB Local Cache Layer ─────────────────────────────────────────────
const DB_NAME = 'nelson_urbanisme_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

let dbPromise = null;

function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.warn('[UrbanismeMediaCache] IndexedDB error:', event.target.error);
      resolve(null);
    };
  });

  return dbPromise;
}

/**
 * Sauvegarde une image en cache local IndexedDB (Base64 / Data URL)
 */
export async function cacheMediaLocal(projectId, buildingKey, imageKey, dataUrl) {
  if (!projectId || !imageKey || !dataUrl) return;
  try {
    const db = await getDb();
    if (!db) return;

    const id = `${projectId}::${buildingKey || 'b0'}::${imageKey}`;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id,
      projectId,
      buildingKey: buildingKey || 'b0',
      imageKey,
      dataUrl,
      updatedAt: Date.now(),
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[UrbanismeMediaCache] Erreur cache local:', e);
  }
}

/**
 * Récupère toutes les images locales en cache pour un projet donné
 */
export async function getAllCachedMediaForProject(projectId) {
  if (!projectId) return { captures: {}, photos: {}, buildingsMedia: {} };
  try {
    const db = await getDb();
    if (!db) return { captures: {}, photos: {}, buildingsMedia: {} };

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('projectId');
    const request = index.getAll(projectId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const records = request.result || [];
        const result = {
          captures: {},
          photos: {},
          buildingsMedia: {},
        };

        for (const item of records) {
          const { buildingKey, imageKey, dataUrl } = item;
          if (!dataUrl) continue;

          if (buildingKey === 'b0' || buildingKey === 'general' || !buildingKey) {
            if (['facade_sud', 'facade_nord', 'facade_est', 'facade_ouest', 'vue_couverture', 'situation_ign', 'satellite', 'masse_projet'].includes(imageKey)) {
              result.captures[imageKey] = dataUrl;
            } else {
              result.photos[imageKey] = dataUrl;
            }
          }

          if (!result.buildingsMedia[buildingKey]) {
            result.buildingsMedia[buildingKey] = { captures: {}, photos: {} };
          }

          if (['facade_sud', 'facade_nord', 'facade_est', 'facade_ouest', 'vue_couverture'].includes(imageKey)) {
            result.buildingsMedia[buildingKey].captures[imageKey] = dataUrl;
          } else {
            result.buildingsMedia[buildingKey].photos[imageKey] = dataUrl;
          }
        }

        resolve(result);
      };

      request.onerror = () => resolve({ captures: {}, photos: {}, buildingsMedia: {} });
    });
  } catch (e) {
    console.warn('[UrbanismeMediaCache] Erreur lecture cache:', e);
    return { captures: {}, photos: {}, buildingsMedia: {} };
  }
}

// ─── Firebase Storage Upload Layer ───────────────────────────────────────────

/**
 * Convertit une Data URL en Blob JPEG optimisé
 */
async function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:')) return null;

  try {
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (e) {
    console.warn('Erreur conversion dataUrlToBlob:', e);
    return null;
  }
}

/**
 * Upload d'une image Urbanisme vers Firebase Storage
 * @param {string} dataUrl - Image en Base64 Data URL ou URL existante
 * @param {string} projectId - ID du projet
 * @param {string} buildingKey - Clé du bâtiment (ex: 'bat-1', 'b0')
 * @param {string} imageKey - Clé de l'image (ex: 'facade_sud', 'apres', 'avant')
 * @returns {Promise<string>} - URL de téléchargement Firebase Storage HTTPS
 */
export async function uploadUrbanismeDataUrl(dataUrl, projectId, buildingKey = 'b0', imageKey = 'image') {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  const trimmed = dataUrl.trim();

  // Si c'est déjà une URL distante hébergée (Firebase Storage, CDN), ne pas re-téléverser
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Si ce n'est pas une Data URL valide, abandonner
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    const blob = await dataUrlToBlob(trimmed);
    if (!blob) return trimmed;

    const safeProjId = (projectId || 'temp_project').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeBldg = (buildingKey || 'b0').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeKey = (imageKey || 'img').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeKey}_${Date.now()}.jpg`;

    const storagePath = `projects/${safeProjId}/urbanisme/${safeBldg}/${filename}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        projectId: safeProjId,
        buildingKey: safeBldg,
        imageKey: safeKey,
      }
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.error(`[UrbanismeMediaService] Échec upload Firebase Storage (${imageKey}):`, err);
    // En cas d'erreur réseau / règles Firebase, conserver la Data URL en secours local
    return trimmed;
  }
}

/**
 * Persiste l'ensemble des médias d'un projet dans Firebase Storage et Firestore
 * Déclenche les uploads en parallèle et met à jour le document projet sans dépasser la limite de 1MB.
 */
export async function persistProjectUrbanismeMedia(projectId, activeTenantId, captures = {}, photos = {}, buildings = []) {
  if (!projectId) return null;

  try {
    const uploadTasks = [];
    const cleanCaptures = { ...captures };
    const cleanPhotos = { ...photos };
    const cleanBuildings = (buildings || []).map(b => ({ ...b, captures: { ...(b.captures || {}) }, photos: { ...(b.photos || {}) } }));

    // 1. Upload Captures globales (DP4, PC5, Cartes)
    for (const [k, val] of Object.entries(captures || {})) {
      if (val && typeof val === 'string' && val.startsWith('data:')) {
        uploadTasks.push(
          uploadUrbanismeDataUrl(val, projectId, 'general', k).then(url => {
            if (url) cleanCaptures[k] = url;
          })
        );
      }
    }

    // 2. Upload Photos globales (DP6, DP7, DP8, PC6, PC7, PC8)
    for (const [k, val] of Object.entries(photos || {})) {
      if (val && typeof val === 'string' && val.startsWith('data:')) {
        uploadTasks.push(
          uploadUrbanismeDataUrl(val, projectId, 'general', k).then(url => {
            if (url) cleanPhotos[k] = url;
          })
        );
      }
    }

    // 3. Upload par Bâtiment
    for (let bIdx = 0; bIdx < cleanBuildings.length; bIdx++) {
      const b = cleanBuildings[bIdx];
      const bKey = b.id || `bat-${bIdx + 1}`;

      if (b.captures) {
        for (const [k, val] of Object.entries(b.captures)) {
          if (val && typeof val === 'string' && val.startsWith('data:')) {
            uploadTasks.push(
              uploadUrbanismeDataUrl(val, projectId, bKey, k).then(url => {
                if (url) b.captures[k] = url;
              })
            );
          }
        }
      }

      if (b.photos) {
        for (const [k, val] of Object.entries(b.photos)) {
          if (val && typeof val === 'string' && val.startsWith('data:')) {
            uploadTasks.push(
              uploadUrbanismeDataUrl(val, projectId, bKey, k).then(url => {
                if (url) b.photos[k] = url;
              })
            );
          }
        }
      }
    }

    // Attendre tous les uploads Firebase Storage
    if (uploadTasks.length > 0) {
      await Promise.all(uploadTasks);
    }

    // 4. Filtrer les chaînes base64 restantes pour ne pas dépasser la limite de 1MB de Firestore
    const stripDataUrls = (obj) => {
      const sanitized = {};
      for (const [k, v] of Object.entries(obj || {})) {
        if (typeof v === 'string' && v.startsWith('data:')) {
          continue; // Conservé dans IndexedDB localement, non envoyé à Firestore pour éviter l'erreur de quota
        }
        sanitized[k] = v;
      }
      return sanitized;
    };

    const firestoreCaptures = stripDataUrls(cleanCaptures);
    const firestorePhotos = stripDataUrls(cleanPhotos);
    const firestoreBuildings = cleanBuildings.map(b => ({
      ...b,
      captures: stripDataUrls(b.captures),
      photos: stripDataUrls(b.photos),
    }));

    // 5. Mettre à jour Firestore avec les URLs Firebase Storage nettoyées
    const updates = {
      urbanisme_captures: firestoreCaptures,
      pc_photos: firestorePhotos,
      buildings: firestoreBuildings,
      updatedAt: new Date().toISOString(),
    };

    try {
      await apiService.updateProject(projectId, updates, activeTenantId);
    } catch (saveErr) {
      console.warn('[UrbanismeMediaService] Avertissement updateProject Firestore:', saveErr);
    }

    return updates;
  } catch (err) {
    console.error('[UrbanismeMediaService] Erreur persistance média:', err);
    return null;
  }
}
