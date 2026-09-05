import React, { useEffect } from 'react';

/**
 * SecurityShield
 * Renforce la sécurité côté client pour empêcher la récupération et le scraping des données :
 * - Bloque le menu contextuel (clic droit) sur les données métier, plans et images (toléré sur les inputs)
 * - Intercepte les raccourcis de dev/scraping (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
 * - Empêche le glisser-déposer sauvage des images techniques
 * - Affiche un avertissement de sécurité dissuasif dans la console du navigateur
 * - Empêche l'encapsulation non autorisée en iframe (anti-clickjacking)
 */
export default function SecurityShield() {
  useEffect(() => {
    // 1. Anti-Framebusting / Protection Clickjacking côté client
    try {
      if (window.top && window.top !== window.self) {
        window.top.location = window.self.location;
      }
    } catch {
      // Bloqué par cross-origin policy, sécurisé par X-Frame-Options: DENY
    }

    // 2. Avertissement dissuasif dans la console
    const bannerStyle = 'color: #dc2626; font-size: 22px; font-weight: bold; background: #fee2e2; padding: 6px 12px; border-radius: 4px;';
    const textStyle = 'color: #1f2937; font-size: 13px; font-weight: 500; line-height: 1.5;';
    console.log('%c⚠️ AVERTISSEMENT DE SÉCURITÉ NELSON PV', bannerStyle);
    console.log(
      '%cPlateforme propriétaire sous licence exclusive ENR Courtage Énergie.\nToute tentative d\'extraction automatisée, de rétro-ingénierie ou de reproduction des données (projets, clients, simulations) est strictement interdite et passible de poursuites (Art. 323-1 et s. du Code pénal).',
      textStyle
    );

    // 3. Gestionnaire anti-clic droit intelligent (préserve les champs de saisie pour l'utilisateur)
    const handleContextMenu = (e) => {
      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (!isInput) {
        e.preventDefault();
      }
    };

    // 4. Blocage des raccourcis d'inspection et de copie de source
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd) {
        // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
        if (e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          return false;
        }

        // Ctrl+U (Afficher code source)
        if (e.key === 'u' || e.key === 'U') {
          e.preventDefault();
          return false;
        }

        // Ctrl+S (Sauvegarder la page complète)
        if (e.key === 's' || e.key === 'S') {
          // Permettre seulement dans les inputs si souhaité, sinon bloquer la capture HTML
          const target = e.target;
          const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
          if (!isInput) {
            e.preventDefault();
            return false;
          }
        }
      }
    };

    // 5. Anti-drag d'images techniques
    const handleDragStart = (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('dragstart', handleDragStart, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('dragstart', handleDragStart, { capture: true });
    };
  }, []);

  return null;
}
