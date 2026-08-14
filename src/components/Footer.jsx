import React, { useState, useEffect } from "react";
import './Footer.css';

const siteLinks = {
  "enr-courtage.fr": "https://www.enr-courtage.fr/",
  "enr-courtage-energie.fr": "https://www.enr-courtage-energie.fr/"
};

export default function Footer() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. Vérifier si l'événement a déjà été capturé globalement avant le rendu du composant
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
      console.log("Bouton d'installation affiché");
    }

    // 2. Écouter si l'événement est capturé après le rendu du composant
    const handlePromptCaptured = () => {
      if (window.deferredPwaPrompt) {
        setDeferredPrompt(window.deferredPwaPrompt);
        console.log("Bouton d'installation affiché");
      }
    };

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      console.log("Événement d'installation capturé");
      setDeferredPrompt(e);
      console.log("Bouton d'installation affiché");
    };

    window.addEventListener("pwa-prompt-captured", handlePromptCaptured);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("pwa-prompt-captured", handlePromptCaptured);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('edg')) {
        alert("Pour installer l'application sur Microsoft Edge :\n1. Cliquez sur le menu (...) en haut à droite\n2. Allez dans 'Applications'\n3. Cliquez sur 'Installer ce site en tant qu'application'.");
      } else if (ua.includes('firefox')) {
        alert("Pour installer l'application sur Firefox :\n1. Cliquez sur le menu (≡) en haut à droite\n2. Sélectionnez 'Installer' ou 'Ajouter à l'écran d'accueil'.");
      } else if (ua.includes('safari') && !ua.includes('chrome')) {
        alert("Pour installer l'application sur Safari :\n1. Cliquez sur le bouton Partager ⎋\n2. Sélectionnez 'Sur l'écran d'accueil'.");
      } else {
        alert("Pour installer l'application NELSON, utilisez la fonction 'Installer l'application' ou 'Ajouter à l'écran d'accueil' dans le menu de votre navigateur.");
      }
    }
  };

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__main">
          <div className="footer__brand">
            <a href="https://www.enr-courtage.fr/" target="_blank" rel="noopener noreferrer">
              <img src="/logo-footer.png" alt="Groupe ENR Courtage" className="footer__logo" />
            </a>
            <div className="footer__brand-text">
              <p className="footer__brand-title">  Groupe ENR Courtage</p>
              <p className="footer__tagline">  Solutions en énergies renouvelables</p>
            </div>
          </div>
          <div className="footer__links">
            <div className="footer__contact">
              <h3 className="footer__heading">CONTACT</h3>
              <ul className="footer__list">
                <li>contact@enr-courtage.fr</li>
                <li>7 Rue Gutenberg, 33700 Mérignac</li>
                <li className="footer__enerplan">
                  <a href="https://www.enerplan.asso.fr/" target="_blank" rel="noopener noreferrer">
                    <img src="/images/enerplan-logo.png" alt="" className="footer__enerplan-logo" />
                  </a>
                  <span className="footer__enerplan-text">Adhérent ENERPLAN</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer__sites">
            <h3 className="footer__heading">NOS SITES</h3>
            <ul className="footer__list">
              {Object.entries(siteLinks).map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="footer__link-item">{name}</a>
                </li>
              ))}
            </ul>
            <button 
              onClick={handleInstallClick} 
              className="footer__install-btn"
              style={{ 
                marginTop: '1rem', 
                padding: '0.6rem 1rem', 
                background: '#2563eb', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
              onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Télécharger l'application
            </button>
          </div>
        </div>
        <div className="footer__bottom">
          <p>© 2020 Groupe ENR Courtage. Tous droits réservés.</p>
          <div className="footer__legal">
            <a href="/mentions-legales" className="footer__legal-link">Mentions Légales</a>
            <span className="footer__separator">•</span>
            <a href="/politique-confidentialite" className="footer__legal-link">Politique de Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
}