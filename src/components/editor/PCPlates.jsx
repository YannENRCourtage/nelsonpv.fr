import React from 'react';

// Dimensions A4 Paysage : 297 x 210 mm
const PAGE_STYLE = {
    width: '297mm',
    height: '210mm',
    padding: '10mm',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    color: '#333',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
};

const HEADER_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #10b981', // Green theme for PC
    paddingBottom: '5mm',
    marginBottom: '5mm'
};

const LOGO_NELSON = "https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/338201d787e373b4c0b156cb07a5b792.png"; 

const PlateHeader = ({ title, project, showBranding }) => (
    <div style={HEADER_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={LOGO_NELSON} alt="Nelson" style={{ height: '12mm' }} />
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#10b981' }}>NELSON</div>
                {showBranding ? (
                    <div style={{ fontSize: '8pt', color: '#666', fontWeight: 'bold' }}>nelsonpv.fr</div>
                ) : (
                    <div style={{ fontSize: '8pt', color: '#666' }}>L'énergie solaire simplifiée</div>
                )}
            </div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#10b981' }}>{title}</div>
            <div style={{ fontSize: '9pt', color: '#333' }}>
                Projet : {project?.firstName} {project?.lastName} - {project?.city} ({project?.zip})
            </div>
        </div>
    </div>
);

const Footer = ({ project }) => (
    <div style={{ marginTop: '5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt', color: '#666', borderTop: '1px solid #eee', paddingTop: '3mm' }}>
        <div>NELSON - nelsonpv.fr</div>
        <div style={{ fontWeight: 'bold' }}>DOSSIER DE PERMIS DE CONSTRUIRE</div>
        <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
    </div>
);

export const PlateCover = ({ project }) => (
    <div style={PAGE_STYLE} id="pc-plate-cover">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '32pt', color: '#10b981', textAlign: 'center', marginBottom: '10mm', textTransform: 'uppercase' }}>
                Dossier de Permis de Construire
            </h1>
            <h2 style={{ fontSize: '24pt', color: '#333', textAlign: 'center', marginBottom: '20mm' }}>
                Bâtiment Photovoltaïque
            </h2>

            <div style={{ width: '80%', padding: '10mm', border: '2px solid #10b981', borderRadius: '4mm', background: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', fontSize: '12pt' }}>
                    <div>
                        <strong style={{ color: '#666' }}>Maître d'Ouvrage :</strong><br />
                        {project?.firstName} {project?.lastName}<br />
                        {project?.email && <>{project.email}<br /></>}
                        {project?.phone && <>{project.phone}</>}
                    </div>
                    <div>
                        <strong style={{ color: '#666' }}>Lieu des Travaux :</strong><br />
                        {project?.address}<br />
                        {project?.zip} {project?.city}
                    </div>
                    <div style={{ gridColumn: 'span 2', marginTop: '5mm', borderTop: '1px solid #ccc', paddingTop: '5mm' }}>
                        <strong style={{ color: '#666' }}>Références Cadastrales :</strong><br />
                        Commune de {project?.cadastre_commune || project?.city || '...........'}<br />
                        Section {project?.cadastre_section || '...'} Parcelle {project?.cadastre_numero || '...'}
                        <br />
                        Superficie : {project?.cadastre_surface ? `${project.cadastre_surface} m²` : '...'}
                    </div>
                </div>
            </div>
        </div>
        <Footer project={project} />
    </div>
);

export const PlateSituation = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-situation">
            <PlateHeader title="PC1 : PLAN DE SITUATION" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '10mm' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #ccc', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                        Vue Cartographique (IGN / OpenStreetMap)
                    </div>
                    <div style={{ flex: 1, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {captures?.cadastre || captures?.ign ? (
                            <img src={captures?.cadastre || captures?.ign} alt="Plan IGN/Cadastre" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: '#64748b' }}>Plan de situation non défini</span>
                        )}
                    </div>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #ccc', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                        Vue Aérienne (Géoportail)
                    </div>
                    <div style={{ flex: 1, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {captures?.satellite ? (
                            <img src={captures.satellite} alt="Vue Aérienne" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: '#64748b' }}>Vue aérienne non définie</span>
                        )}
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateMasse = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-masse">
            <PlateHeader title="PC2 : PLAN DE MASSE" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '5mm', flexDirection: 'column' }}>
                 <div style={{ flex: 1, background: '#e2e8f0', border: '1px solid #ccc', borderRadius: '2mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {captures?.masse_projet ? (
                        <img src={captures.masse_projet} alt="Plan de Masse" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <span style={{ color: '#64748b' }}>Plan de masse non défini (capturez depuis l'éditeur)</span>
                    )}
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSection = ({ project }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-section">
            <PlateHeader title="PC3 : PLAN EN COUPE" project={project} />
            <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', padding: '5mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: '12pt', fontWeight: 'bold' }}>Plan en coupe à insérer</p>
                    <p style={{ fontSize: '10pt' }}>(Schéma type de structure ou coupe terrain depuis l'éditeur 3D)</p>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateNotice = ({ project, noticeText }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-notice">
            <PlateHeader title="PC4 : NOTICE DESCRIPTIVE (NOTICE AGRICOLE)" project={project} showBranding={true} />
            <div style={{ flex: 1, padding: '5mm', overflowY: 'hidden', fontSize: '10pt', lineHeight: '1.5', color: '#1e293b', border: '1px solid #ccc', borderRadius: '2mm', background: '#fff' }}>
                {noticeText ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{noticeText}</div>
                ) : (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '20mm' }}>
                        Aucune notice descriptive saisie. Veuillez la compléter dans l'interface.
                    </div>
                )}
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateFacades = ({ project }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-facades">
            <PlateHeader title="PC5 : PLAN DES FAÇADES ET TOITURES" project={project} />
            <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', padding: '5mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: '12pt', fontWeight: 'bold' }}>Plan des façades à insérer</p>
                    <p style={{ fontSize: '10pt' }}>(Généré par le configurateur 3D)</p>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateInsertion = ({ project, photos }) => (
    <div style={PAGE_STYLE} id="pc-plate-insertion">
        <PlateHeader title="PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold' }}>
                    AVANT PROJET
                </div>
                {photos?.avant ? (
                    <img src={photos.avant} alt="Avant projet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ color: '#64748b' }}>Photo avant projet manquante</span>
                )}
            </div>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold' }}>
                    APRÈS PROJET (Simulation)
                </div>
                {photos?.apres ? (
                    <img src={photos.apres} alt="Après projet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ color: '#64748b' }}>Simulation d'insertion manquante</span>
                )}
            </div>
        </div>
        <Footer project={project} />
    </div>
);

export const PlateEnvProcheLointain = ({ project, photos }) => (
    <div style={PAGE_STYLE} id="pc-plate-env">
        <PlateHeader title="PC7 / PC8 : ENVIRONNEMENT PROCHE ET LOINTAIN" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold' }}>
                    PC7 - ENVIRONNEMENT PROCHE
                </div>
                {photos?.proche ? (
                    <img src={photos.proche} alt="Environnement Proche" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ color: '#64748b' }}>Photo de l'environnement proche manquante</span>
                )}
            </div>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold' }}>
                    PC8 - ENVIRONNEMENT LOINTAIN
                </div>
                {photos?.lointain ? (
                    <img src={photos.lointain} alt="Environnement Lointain" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ color: '#64748b' }}>Photo de l'environnement lointain manquante</span>
                )}
            </div>
        </div>
        <Footer project={project} />
    </div>
);
