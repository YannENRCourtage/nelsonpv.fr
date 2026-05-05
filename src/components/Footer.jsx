import React from "react";
import './Footer.css';

const siteLinks = {
  "enr-courtage.fr": "https://www.enr-courtage.fr/",
  "enr-courtage-energie.fr": "https://www.enr-courtage-energie.fr/",
  "monelectricitelocale.fr": "https://www.monelectricitelocale.fr/",
  "batimentneufgratuit.fr": "https://www.batimentneufgratuit.fr/",
  "mapartdesoleil.fr": "https://www.mapartdesoleil.fr/"
};

export default function Footer() {
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
          </div>
        </div>
        <div className="footer__bottom">
          <p>© 2020 Groupe ENR Courtage. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}