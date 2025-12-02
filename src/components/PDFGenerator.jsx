import React from 'react';

// Ce composant est maintenant prêt à être importé
// dans votre fichier d'assemblage PDF principal pour les pages de carte.
export const PDFSymbolLegend = ({ isForCapturePage = false }) => {
  const symbols = [
    { label: 'Lieu Projet', icon: '📍' }, { label: 'Accès', icon: '🚪' },
    { label: 'Maison', icon: '🏠' }, { label: 'SDIS', icon: '🚒' },
    { label: 'Transfo', icon: '⚡️' }, { label: 'PDL', icon: '🔌' },
    { label: 'Voisin', icon: '👥' }, { label: 'Bâtiment', icon: '🏢' },
  ];

  // Style ajusté pour correspondre à la légende en bas de page
  const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap', // Permet de passer à la ligne si pas assez de place
    justifyContent: 'center', // Centre les icônes
    alignItems: 'center',
    gap: '20px', // Espace entre les icônes
    padding: '2px 0', // padding réduit pour réduire la hauteur
    borderTop: '1px solid #eee',
    background: 'white',
    width: '100%',
  };

  const iconStyle = {
    fontSize: '12px' // police icône réduite
  };

  const labelStyle = {
    fontSize: '9px', // police texte réduite
    fontFamily: 'Arial, sans-serif',
    color: '#333'
  };

  return (
    // MODIFICATION : Ajout d'un conteneur pour rogner de 20% de chaque côté (width 60%)
    <div style={{ width: '60%', margin: '0 auto', overflow: 'hidden' }}>
      <div style={containerStyle}>
        {symbols.map(symbol => (
          <div key={symbol.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={iconStyle}>{symbol.icon}</span>
            <span style={labelStyle}>{symbol.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant principal pour la PREMIÈRE PAGE (Fiche Projet)
const PDFGenerator = ({ project }) => {
  if (!project) return null;

  const p = project || {};
  // const client = p.client || {}; // Données lues depuis la racine

  const fieldStyle = {
    marginBottom: '12px', // Espace vertical entre les lignes
  };

  const labelStyle = {
    fontWeight: 'bold',
    fontSize: '15px', // Police plus grande
    color: '#000',
    display: 'block', // Met le label au-dessus
    marginBottom: '3px', // Petit espace entre label et valeur
  };

  const valueStyle = {
    fontSize: '15px', // Police plus grande
    color: '#333',
  };

  // Fonction pour formater l'adresse
  const formatAddress = () => {
    const parts = [p.address, p.zip, p.city].filter(Boolean); // Filtre les parties vides
    return parts.join(', ') || 'N/A';
  };

  // Fonction pour formater le nom du client
  const formatClientName = () => {
    // CORRIGÉ : Lit 'firstName' et 'name' (Nom*) depuis la racine 'p'
    const parts = [p.firstName, p.name].filter(Boolean);
    return parts.join(' ') || 'N/A';
  };

  // Fonction pour formater le NOM DU PROJET (comme le header)
  const formatProjectName = () => {
    // CORRIGÉ : Utilise p.name (Nom*), p.zip, p.city
    const title = `${p.name || ''} ${p.zip || ''} ${p.city || ''}`.trim();
    if (!p.name) {
      return 'N/A'; // Fallback
    }
    return title.toUpperCase() || 'N/A';
  };

  return (
    // Conteneur A4 PAYSAGE (297mm x 210mm)
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', width: '297mm', height: '210mm', padding: '15mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: 'white' }}>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* LOGO MODIFIÉ : Utilisation de l'URL complète pour plus de fiabilité */}
        <img
          src="https://enr-courtage.fr/wp-content/uploads/2023/11/logo-enr-courtage-v3.png"
          alt="ENR Courtage Logo"
          style={{ height: '50px', width: 'auto' }}
        />
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#000' }}>FICHE PROJET</h1>
      </header>

      <hr style={{ border: 0, borderTop: '2px solid #3b82f6', marginBottom: '25px', width: '100%' }} />

      <main style={{ flexGrow: 1, fontSize: '15px' }}>

        {/* Grille pour les champs de données - 2 colonnes pour PAYSAGE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 25px' }}>

          {/* Colonne 1 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={fieldStyle}>
              <span style={labelStyle}>Nom du projet :</span>
              <span style={valueStyle}>{formatProjectName()}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Client :</span>
              <span style={valueStyle}>{formatClientName()}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Email client :</span>
              <span style={valueStyle}>{p.email || 'N/A'}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Adresse du projet :</span>
              <span style={valueStyle}>{formatAddress()}</span>
            </div>
          </div>

          {/* Colonne 2 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={fieldStyle}>
              <span style={labelStyle}>Téléphone client :</span>
              <span style={valueStyle}>{p.phone || 'N/A'}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>GPS :</span>
              <span style={valueStyle}>{p.gps || 'N/A'}</span>
            </div>
            <div style={fieldStyle}>
              {/* CORRIGÉ : Label changé en "Projet" */}
              <span style={labelStyle}>Projet :</span>
              {/* CORRIGÉ : Valeur pointe vers 'projectSize' */}
              <span style={valueStyle}>{p.projectSize || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Section Commentaires (prend toute la largeur) */}
        <div style={{ ...fieldStyle, marginTop: '20px' }}>
          <span style={labelStyle}>Commentaires :</span>
          <div style={{
            ...valueStyle,
            border: '1px solid #eee',
            padding: '10px',
            minHeight: '50px', // Hauteur réduite pour paysage
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            background: '#f9f9f9'
          }}>
            {p.comments || ''}
          </div>
        </div>
      </main>

      {/* FOOTER SUPPRIMÉ - La légende n'est plus sur cette page */}
    </div>
  );
};

export default PDFGenerator;