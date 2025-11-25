import React from 'react';

export const PDFSymbolLegend = ({ isForCapturePage = false }) => {
    const symbols = [
        { label: 'Lieu Projet', icon: '📍' }, { label: 'Accès', icon: '🚪' },
        { label: 'Maison', icon: '🏠' }, { label: 'SDIS', icon: '🚒' },
        { label: 'Transfo', icon: '⚡️' }, { label: 'PDL', icon: '🔌' },
        { label: 'Voisin', icon: '👥' }, { label: 'Bâtiment', icon: '🏢' },
    ];

    const containerStyle = {
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: isForCapturePage ? '1px 0' : '5px 0',
        borderTop: '1px solid #eee',
        background: 'white',
        width: '100%',
        transform: isForCapturePage ? 'scale(0.8)' : 'none',
        transformOrigin: 'center',
    };

    const iconStyle = {
        fontSize: isForCapturePage ? '12px' : '14px'
    };

    const labelStyle = {
        fontSize: isForCapturePage ? '9px' : '9px'
    };

    return (
        <div style={containerStyle}>
            {symbols.map(symbol => (
                <div key={symbol.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={iconStyle}>{symbol.icon}</span>
                    <span style={labelStyle}>{symbol.label}</span>
                </div>
            ))}
        </div>
    );
};

const PDFGenerator = ({ project }) => {
  if (!project) return null;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', width: '297mm', height: '210mm', padding: '10mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: 'white' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <img 
                src="https://enr-courtage.fr/wp-content/uploads/2023/11/logo-enr-courtage-v3.png" 
                alt="ENR Courtage Logo" 
                style={{ height: '40px', width: 'auto' }}
            />
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>Fiche Projet</h1>
        </header>
        <hr style={{ border: 0, borderTop: '1.5px solid #3b82f6', marginBottom: '15px', width: '100%' }}/>
        
        <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Client:</strong> {`${project.name || ''} ${project.firstName || ''}`.trim() || 'N/A'}</span>
              <span><strong>Tél:</strong> {project.phone || 'N/A'}</span>
              <span><strong>Email:</strong> {project.email || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <span><strong>Adresse:</strong> {`${project.address || ''}, ${project.zip || ''} ${project.city || ''}`.trim()}</span>
              <span><strong>GPS:</strong> {project.gps || 'N/A'}</span>
          </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <span><strong>Taille du projet:</strong> {project.projectSize || 'N/A'}</span>
          </div>
          
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Commentaires</h2>
            <div style={{ fontSize: '11px', border: '1px solid #eee', padding: '8px', minHeight: '3cm', whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
                {project.comments || ''}
            </div>
          </div>
        </main>

        <footer style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <PDFSymbolLegend />
        </footer>
    </div>
  );
};

export default PDFGenerator;