/**
 * webglUtils.js — Gestion sécurisée des contextes WebGL pour Three.js et React Three Fiber
 * Évite les crashs "Error creating WebGL context with your selected attributes",
 * gère la perte de contexte, la libération des ressources et le fallback logiciel/WebGL 1.
 */

/**
 * Vérifie si WebGL (WebGL2 ou WebGL1) est supporté sur le navigateur actuel
 * sans faire fuiter de contexte WebGL permanent.
 */
export function isWebGLAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false, powerPreference: 'default' }) ||
               canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false, powerPreference: 'default' }) ||
               canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false, powerPreference: 'default' });
    if (!gl) return false;

    // Forcer la libération immédiate du contexte de test pour ne pas impacter le quota du navigateur
    const loseContextExt = gl.getExtension('WEBGL_lose_context');
    if (loseContextExt) {
      loseContextExt.loseContext();
    }
    return true;
  } catch (e) {
    console.warn('[WebGLUtils] Échec vérification support WebGL:', e);
    return false;
  }
}

/**
 * Configuration sécurisée des attributs du renderer WebGL
 * Conforme aux meilleures pratiques pour GPU intégrés, mode basse consommation et compatibilité maximale.
 */
export function getSafeGlConfig(overrides = {}) {
  return {
    powerPreference: 'default', // "default" au lieu de "high-performance" pour compatibilité GPU intégrés
    failIfMajorPerformanceCaveat: false, // Autoriser le fallback logiciel (SwiftShader / Mesa)
    preserveDrawingBuffer: true, // Nécessaire pour les captures d'écran et snapshots PDF
    antialias: true,
    alpha: true,
    depth: true,
    stencil: false,
    ...overrides
  };
}

/**
 * Attache les gestionnaires d'événements de perte et restauration de contexte WebGL sur le canvas
 */
export function attachWebGLContextHandlers(canvas, { onLost, onRestored } = {}) {
  if (!canvas || typeof canvas.addEventListener !== 'function') return () => {};

  const handleContextLost = (event) => {
    event.preventDefault(); // Indispensable pour permettre à Three.js / WebGL de restaurer le contexte plus tard
    console.warn('[WebGLUtils] Contexte WebGL perdu (webglcontextlost).');
    if (onLost) onLost(event);
  };

  const handleContextRestored = (event) => {
    console.info('[WebGLUtils] Contexte WebGL restauré avec succès (webglcontextrestored).');
    if (onRestored) onRestored(event);
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
  };
}

/**
 * Nettoie proprement les ressources Three.js d'une scène pour libérer la mémoire GPU
 * et ne pas dépasser la limite de contextes simultanés du navigateur.
 */
export function disposeThreeScene(scene, gl) {
  try {
    if (scene) {
      scene.traverse((object) => {
        if (object.isMesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => disposeMaterial(mat));
            } else {
              disposeMaterial(object.material);
            }
          }
        }
      });
      scene.clear();
    }

    if (gl) {
      if (typeof gl.dispose === 'function') {
        gl.dispose();
      }
      if (gl.forceContextLoss && typeof gl.forceContextLoss === 'function') {
        gl.forceContextLoss();
      }
    }
  } catch (err) {
    console.warn('[WebGLUtils] Erreur lors du nettoyage de la scène Three.js:', err);
  }
}

function disposeMaterial(mat) {
  if (!mat) return;
  for (const key of Object.keys(mat)) {
    const value = mat[key];
    if (value && typeof value === 'object' && 'minFilter' in value && typeof value.dispose === 'function') {
      value.dispose();
    }
  }
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}
