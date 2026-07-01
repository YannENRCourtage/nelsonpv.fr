/**
 * Hook de polling pour détecter automatiquement le consentement Enedis
 * Interroge l'API toutes les Xs pour détecter si un nouveau consentement est arrivé
 */
import { useEffect, useRef, useCallback } from 'react';

/**
 * @param {string|null} prm - PRM à surveiller (null = pas de polling)
 * @param {boolean} active - Activer/désactiver le polling
 * @param {function} onConsentDetected - Callback quand un consentement est détecté
 * @param {number} intervalMs - Intervalle de polling en ms (défaut: 8000)
 */
export function useEnedisPolling({ prm, active, onConsentDetected, intervalMs = 8000 }) {
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const lastKnownConsents = useRef(new Set());

  const checkForNewConsent = useCallback(async () => {
    if (!prm || !mountedRef.current) return;
    try {
      const res = await fetch('/api/enedis/fetch?action=list_consents');
      if (!res.ok || !mountedRef.current) return;
      const json = await res.json();
      const consents = json.consents || [];
      const found = consents.find(c => c.prm === prm);
      if (found && !lastKnownConsents.current.has(prm)) {
        lastKnownConsents.current.add(prm);
        onConsentDetected(found);
      }
    } catch (e) {
      // Ignore silently
    }
  }, [prm, onConsentDetected]);

  useEffect(() => {
    mountedRef.current = true;
    if (active && prm && prm.length === 14) {
      checkForNewConsent();
      intervalRef.current = setInterval(checkForNewConsent, intervalMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, prm, checkForNewConsent, intervalMs]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const resetPolling = useCallback((newPrm) => {
    lastKnownConsents.current.delete(newPrm || prm);
  }, [prm]);

  return { resetPolling };
}
