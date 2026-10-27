/**
 * Service d'historique et de persistance des téléchargements de l'application NELSON
 * Intercepte automatiquement tous les téléchargements (<a download>, Blob URLs, Data URLs)
 * et conserve les fichiers dans IndexedDB pour permettre de les rouvrir à tout moment
 * depuis le menu "Téléchargements" (y compris en mode application / PWA).
 */

const DB_NAME = 'nelson_downloads_db';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';
const MAX_DOWNLOADS = 35;

const blobByUrlMap = new Map();
const protectedBlobUrls = new Set();
let memoryDownloads = [];
let initialized = false;
let dbPromise = null;

function openDownloadsDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function notifyListeners(newItem = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('nelson:downloads-updated', {
      detail: {
        downloads: [...memoryDownloads],
        latestDownload: newItem,
      },
    })
  );
}

async function loadDownloadsFromDb() {
  const db = await openDownloadsDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? req.result : [];
        rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const hydrated = rows.map((row) => {
          let objectUrl = row.objectUrl || null;
          if (row.blob instanceof Blob) {
            objectUrl = URL.createObjectURL(row.blob);
            protectedBlobUrls.add(objectUrl);
          }
          return {
            ...row,
            objectUrl,
          };
        });
        memoryDownloads = hydrated;
        notifyListeners(null);
        resolve(hydrated);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function saveDownloadToDb(entry) {
  const db = await openDownloadsDb();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id: entry.id,
      fileName: entry.fileName,
      mimeType: entry.mimeType,
      size: entry.size,
      timestamp: entry.timestamp,
      blob: entry.blob || null,
      dataUrl: entry.blob ? null : (entry.dataUrl || null),
    });

    // Nettoyer les anciens au-delà de MAX_DOWNLOADS
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const all = Array.isArray(getAllReq.result) ? getAllReq.result : [];
      if (all.length > MAX_DOWNLOADS) {
        all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const toDelete = all.slice(MAX_DOWNLOADS);
        toDelete.forEach((oldItem) => {
          try {
            store.delete(oldItem.id);
          } catch {
            // ignore
          }
        });
      }
    };
  } catch {
    // ignore IndexedDB errors
  }
}

export async function removeDownloadEntry(id) {
  memoryDownloads = memoryDownloads.filter((item) => item.id !== id);
  notifyListeners(null);

  const db = await openDownloadsDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    // ignore
  }
}

export async function clearAllDownloads() {
  memoryDownloads = [];
  notifyListeners(null);

  const db = await openDownloadsDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
}

export function getDownloadsList() {
  return [...memoryDownloads];
}

export async function recordDownload({ fileName, href, blob = null }) {
  try {
    let resolvedBlob = blob;
    let resolvedMime = blob?.type || '';
    let resolvedSize = blob?.size || 0;
    let persistentUrl = href;

    if (!resolvedBlob && typeof href === 'string') {
      if (href.startsWith('blob:')) {
        if (blobByUrlMap.has(href)) {
          resolvedBlob = blobByUrlMap.get(href);
        } else {
          try {
            const resp = await fetch(href);
            resolvedBlob = await resp.blob();
          } catch {
            // fallback
          }
        }
      } else if (href.startsWith('data:')) {
        try {
          const resp = await fetch(href);
          resolvedBlob = await resp.blob();
        } catch {
          // fallback
        }
      }
    }

    if (resolvedBlob instanceof Blob) {
      resolvedMime = resolvedBlob.type || resolvedMime;
      resolvedSize = resolvedBlob.size || resolvedSize;
      persistentUrl = URL.createObjectURL(resolvedBlob);
      protectedBlobUrls.add(persistentUrl);
    }

    const cleanName = (fileName || 'Document_NELSON.pdf').trim();

    // Éviter les doublons exacts déclenchés dans la même seconde
    const now = Date.now();
    const recentDuplicate = memoryDownloads.find(
      (d) => d.fileName === cleanName && Math.abs(now - d.timestamp) < 1200
    );
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const entry = {
      id: `dl_${now}_${Math.random().toString(36).slice(2, 8)}`,
      fileName: cleanName,
      mimeType: resolvedMime || guessMimeType(cleanName),
      size: resolvedSize,
      timestamp: now,
      blob: resolvedBlob || null,
      objectUrl: persistentUrl,
      dataUrl: !resolvedBlob && typeof href === 'string' && href.startsWith('data:') ? href : null,
    };

    memoryDownloads = [entry, ...memoryDownloads].slice(0, MAX_DOWNLOADS);
    notifyListeners(entry);
    await saveDownloadToDb(entry);
    return entry;
  } catch (err) {
    console.warn('[DownloadHistory] Erreur enregistrement téléchargement:', err);
    return null;
  }
}

function guessMimeType(fileName = '') {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.csv')) return 'text/csv';
  return 'application/octet-stream';
}

export function initDownloadHistoryInterceptor() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Charger l'historique existant depuis IndexedDB
  loadDownloadsFromDb();

  // 1. Intercepter URL.createObjectURL pour garder une référence au Blob
  const origCreateObjectURL = URL.createObjectURL.bind(URL);
  const origRevokeObjectURL = URL.revokeObjectURL.bind(URL);

  URL.createObjectURL = function (obj) {
    const url = origCreateObjectURL(obj);
    if (obj instanceof Blob) {
      blobByUrlMap.set(url, obj);
      // Nettoyer la map temporaire après 5 minutes si non utilisé
      setTimeout(() => {
        if (!protectedBlobUrls.has(url)) {
          blobByUrlMap.delete(url);
        }
      }, 5 * 60 * 1000);
    }
    return url;
  };

  URL.revokeObjectURL = function (url) {
    if (protectedBlobUrls.has(url)) {
      return;
    }
    return origRevokeObjectURL(url);
  };

  // Helper commun pour inspecter un élément <a> déclenchant un téléchargement
  const captureAnchorDownload = (anchor) => {
    try {
      if (!anchor || anchor.dataset?.nelsonIgnoreIntercept) return;
      const downloadAttr = anchor.getAttribute?.('download') ?? anchor.download;
      const href = anchor.getAttribute?.('href') || anchor.href || '';
      if (!href) return;

      const hasDownload =
        (downloadAttr !== null && downloadAttr !== undefined && String(downloadAttr).trim() !== '') ||
        href.startsWith('blob:');

      if (hasDownload) {
        const blob = blobByUrlMap.get(href) || null;
        const name = String(downloadAttr || anchor.download || 'Document_NELSON.pdf').trim();
        recordDownload({
          fileName: name,
          href,
          blob,
        });
      }
    } catch (e) {
      console.warn('[DownloadHistory] Intercept error:', e);
    }
  };

  // 2. Intercepter HTMLAnchorElement.prototype.click
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (...args) {
    captureAnchorDownload(this);
    return origAnchorClick.apply(this, args);
  };

  // 3. Intercepter EventTarget.prototype.dispatchEvent (utilisé par jsPDF.save / FileSaver.saveAs / XLSX)
  const origDispatchEvent = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (event, ...rest) {
    try {
      if (
        event &&
        event.type === 'click' &&
        typeof HTMLAnchorElement !== 'undefined' &&
        this instanceof HTMLAnchorElement
      ) {
        captureAnchorDownload(this);
      }
    } catch {
      // ignore
    }
    return origDispatchEvent.call(this, event, ...rest);
  };

  // 4. Écouter aussi les clics DOM classiques sur <a download>
  document.addEventListener(
    'click',
    (e) => {
      try {
        const anchor = e.target?.closest?.('a[download]');
        if (!anchor || anchor.dataset?.nelsonIgnoreIntercept) return;
        const fileName = anchor.getAttribute('download') || anchor.download || 'Document_NELSON';
        const href = anchor.getAttribute('href') || anchor.href || '';
        if (href) {
          const blob = blobByUrlMap.get(href) || null;
          recordDownload({ fileName, href, blob });
        }
      } catch {
        // ignore
      }
    },
    true
  );
}
