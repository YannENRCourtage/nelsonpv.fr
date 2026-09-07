import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const LOCAL_BRIDGE_URL = 'http://127.0.0.1:4199';

// Vérifier si le daemon local est actif
export async function checkLocalBridgeHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${LOCAL_BRIDGE_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

// Demander l'ouverture du dossier local dans l'Explorateur Windows
export async function openLocalFolderInExplorer() {
  try {
    const res = await fetch(`${LOCAL_BRIDGE_URL}/api/open-folder`, { method: 'POST' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

// Enregistrer un fichier PDF selon la meilleure méthode disponible
export async function savePdfToLocalDestination({
  filename,
  blob,
  arrayBuffer,
  directoryHandle = null,
  preferBridge = true
}) {
  // ─── NIVEAU 1 : File System Access API (Sélection préalable du dossier par l'utilisateur) ─────
  // Prioritaire dans le navigateur car 100% direct sur le disque sans passer par le réseau local HTTP
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      const content = blob || new Blob([arrayBuffer], { type: 'application/pdf' });
      await writable.write(content);
      await writable.close();

      return {
        success: true,
        method: 'file-system-access',
        filename,
        folderName: directoryHandle.name
      };
    } catch (err) {
      console.warn('Échec écriture via File System Access API:', err.message);
    }
  }

  // ─── NIVEAU 2 : Micro-Agent Local (Si daemon local actif sur localhost:4199) ─────
  if (preferBridge) {
    try {
      const buffer = arrayBuffer || (blob ? await blob.arrayBuffer() : null);
      if (buffer) {
        const uint8 = new Uint8Array(buffer);
        let binary = '';
        const len = uint8.byteLength;
        const chunkSize = 16384;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = uint8.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${LOCAL_BRIDGE_URL}/api/save-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, base64 }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          return {
            success: true,
            method: 'local-bridge',
            fullPath: json.fullPath,
            filename: json.filename
          };
        }
      }
    } catch (err) {
      // Ignorer si daemon non actif
    }
  }

  // ─── NIVEAU 3 : Téléchargement direct standard (Firefox, Safari, Mobile) ──
  try {
    const content = blob || new Blob([arrayBuffer], { type: 'application/pdf' });
    saveAs(content, filename);

    return {
      success: true,
      method: 'browser-download',
      filename,
      folderName: 'Téléchargements (Firefox)'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Demande à l'utilisateur de sélectionner un dossier local via l'API native du navigateur
 * Compatible Chrome, Edge, Brave, Opera
 */
export async function requestDirectoryPicker() {
  if (typeof window === 'undefined') {
    return { success: false, supported: false, error: 'Environnement non disponible.' };
  }

  // Prise en charge native de Mozilla Firefox (où showDirectoryPicker n'existe pas)
  // Permet l'enregistrement local transparent dans le dossier Téléchargements de l'ordinateur
  if (!window.showDirectoryPicker) {
    return {
      success: true,
      supported: false,
      isFirefoxMode: true,
      folderName: 'Téléchargements (Dossier Firefox)'
    };
  }

  try {
    // 1. Appel propre direct sans options id/startIn restrictives pour une compatibilité maximale
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (!handle) {
      return { success: false, cancelled: true };
    }

    // 2. Vérification / demande des droits d'écriture
    if (handle.queryPermission) {
      let perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && handle.requestPermission) {
        perm = await handle.requestPermission({ mode: 'readwrite' });
      }
      if (perm !== 'granted') {
        return {
          success: false,
          error: "Permission d'écriture refusée pour le dossier sélectionné."
        };
      }
    }

    return {
      success: true,
      supported: true,
      handle,
      folderName: handle.name
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    
    // Essai de repli sans l'argument mode
    try {
      const handle = await window.showDirectoryPicker();
      return {
        success: true,
        supported: true,
        handle,
        folderName: handle.name
      };
    } catch (err2) {
      if (err2.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: `Impossible d'ouvrir le sélecteur de dossier : ${err2.message}`
      };
    }
  }
}

/**
 * Exporte l'ensemble des résultats de simulation sous la forme d'une archive ZIP complète
 */
export async function exportResultsAsZip(results, zipName = 'Nelson_Prospection_Toitures.zip') {
  if (!results || results.length === 0) {
    throw new Error('Aucun fichier à exporter dans l’archive.');
  }

  const zip = new JSZip();
  let count = 0;

  for (const r of results) {
    const filename = r.filename || `Offre_Toiture_${r.building?.osmId || count}.pdf`;
    const content = r.blob || (r.arrayBuffer ? new Blob([r.arrayBuffer], { type: 'application/pdf' }) : null);
    if (content) {
      zip.file(filename, content);
      count++;
    }
  }

  if (count === 0) {
    throw new Error('Aucun contenu PDF valide trouvé dans les résultats.');
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  saveAs(blob, zipName);
  return { success: true, count, blob };
}
