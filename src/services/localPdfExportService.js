/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOCAL PDF EXPORT SERVICE
 * Gestionnaire d'enregistrement local hybride à 3 niveaux :
 * Niveau 1 : Micro-daemon Node.js local (écriture directe silencieuse C:\Users\Utilisateur\PDF TOITURES)
 * Niveau 2 : File System Access API du navigateur (sélection unique du dossier C:\Users\Utilisateur\PDF TOITURES)
 * Niveau 3 : Téléchargement unitaire direct / ZIP
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
  // ─── NIVEAU 1 : Micro-Agent Local (Écriture 100% directe et silencieuse) ─────
  if (preferBridge) {
    try {
      // Conversion en base64 pour transmission HTTP rapide
      const buffer = arrayBuffer || (blob ? await blob.arrayBuffer() : null);
      if (buffer) {
        const uint8 = new Uint8Array(buffer);
        let binary = '';
        const len = uint8.byteLength;
        // Découpage par blocs de 16 Ko pour éviter tout débordement de pile d'arguments
        const chunkSize = 16384;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = uint8.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);

        const res = await fetch(`${LOCAL_BRIDGE_URL}/api/save-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, base64 })
        });

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
      // Si l'agent local n'est pas joignable, basculer au niveau 2
      console.warn('Agent local non disponible, basculement vers File System Access API:', err.message);
    }
  }

  // ─── NIVEAU 2 : File System Access API (Sélection préalable du dossier) ──────
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      const content = blob || new Blob([arrayBuffer], { type: 'application/pdf' });
      await writable.write(content);
      await writable.close();

      return {
        success: true,
        method: 'file-system-access-api',
        filename
      };
    } catch (err) {
      console.error('Erreur écriture File System Access API:', err);
    }
  }

  // ─── NIVEAU 3 : Téléchargement classique par lien blob ───────────────────────
  try {
    const content = blob || new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return {
      success: true,
      method: 'browser-download',
      filename
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

// Demander à l'utilisateur de sélectionner le dossier C:\Users\Utilisateur\PDF TOITURES
export async function requestDirectoryPicker() {
  if (typeof window !== 'undefined' && window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        id: 'nelson-pdf-toitures',
        startIn: 'documents'
      });
      return handle;
    } catch (err) {
      if (err.name === 'AbortError') {
        return null; // Annulé par l'utilisateur
      }
      console.warn('showDirectoryPicker non disponible ou refusé:', err);
      return null;
    }
  }
  return null;
}
