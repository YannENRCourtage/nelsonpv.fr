import React, { useRef } from 'react';

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
    borderBottom: '2px solid #10b981',
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

// Composant réutilisable pour uploader une image au clic
const ImageUploadZone = ({ isInteractive, label, photo, onUpload, defaultText }) => {
    const fileInputRef = useRef(null);

    const handleClick = () => {
        if (isInteractive && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => onUpload(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div 
            onClick={handleClick}
            style={{ 
                width: '100%', height: '100%', position: 'relative', 
                cursor: isInteractive ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: isInteractive && !photo ? 'rgba(16,185,129,0.05)' : 'transparent',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                if (isInteractive && !photo) e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)';
            }}
            onMouseLeave={(e) => {
                if (isInteractive && !photo) e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.05)';
            }}
        >
            {isInteractive && (
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                />
            )}
            {photo ? (
                <img src={photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                    {isInteractive ? (
                        <>
                            <div style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>
                                + Charger une image
                            </div>
                            <span style={{ fontSize: '11px', pointerEvents: 'none' }}>{label || defaultText}</span>
                        </>
                    ) : (
                        <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>{defaultText}</span>
                    )}
                </div>
            )}
        </div>
    );
};

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

export const PlateSituation = ({ project, captures, isInteractive, onUpload }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-situation">
            <PlateHeader title="PC1 : PLAN DE SITUATION" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '10mm' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #ccc', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                        Vue Cartographique (IGN / OpenStreetMap)
                    </div>
                    <div style={{ flex: 1, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={captures?.ign || captures?.cadastre} 
                            onUpload={(data) => onUpload('ign', data)} 
                            defaultText="Plan de situation non défini" 
                            label="Plan IGN"
                        />
                    </div>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #ccc', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                        Vue Aérienne (Géoportail)
                    </div>
                    <div style={{ flex: 1, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={captures?.satellite} 
                            onUpload={(data) => onUpload('satellite', data)} 
                            defaultText="Vue aérienne non définie" 
                            label="Vue Aérienne"
                        />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateMasse = ({ project, captures, isInteractive, onUpload }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-masse">
            <PlateHeader title="PC2 : PLAN DE MASSE" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '5mm', flexDirection: 'column' }}>
                 <div style={{ flex: 1, background: '#e2e8f0', border: '1px solid #ccc', borderRadius: '2mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={captures?.masse_projet} 
                        onUpload={(data) => onUpload('masse_projet', data)} 
                        defaultText="Plan de masse à charger" 
                        label="Plan de Masse"
                    />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSection = ({ project, captures, isInteractive, onUpload }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-section">
            <PlateHeader title="PC3 : PLAN EN COUPE" project={project} />
            <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', padding: '5mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={captures?.coupe_projet} 
                    onUpload={(data) => onUpload('coupe_projet', data)} 
                    defaultText="Plan en coupe à insérer" 
                    label="Plan en coupe"
                />
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateNotice = ({ project, noticeText, onNoticeChange, isInteractive }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-notice">
            <PlateHeader title="PC4 : NOTICE DESCRIPTIVE (NOTICE AGRICOLE)" project={project} showBranding={true} />
            <div style={{ flex: 1, padding: '5mm', overflowY: 'hidden', fontSize: '10pt', lineHeight: '1.5', color: '#1e293b', border: '1px solid #ccc', borderRadius: '2mm', background: '#fff' }}>
                {isInteractive ? (
                    <textarea 
                        style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}
                        value={noticeText}
                        onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                        placeholder="Saisissez ou collez la notice descriptive / notice agricole du projet ici..."
                    />
                ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {noticeText || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucune notice descriptive saisie.</span>}
                    </div>
                )}
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateFacades = ({ project, captures, isInteractive, onUpload }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-facades">
            <PlateHeader title="PC5 : PLAN DES FAÇADES ET TOITURES" project={project} />
            <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '2mm', padding: '5mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={captures?.facades_projet} 
                    onUpload={(data) => onUpload('facades_projet', data)} 
                    defaultText="Plan des façades à insérer" 
                    label="Plan des façades"
                />
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateInsertion = ({ project, photos, isInteractive, onUpload }) => (
    <div style={PAGE_STYLE} id="pc-plate-insertion">
        <PlateHeader title="PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold', zIndex: 10 }}>
                    AVANT PROJET
                </div>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={photos?.avant} 
                    onUpload={(data) => onUpload('avant', data)} 
                    defaultText="Photo avant projet manquante" 
                    label="Photo Avant"
                />
            </div>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold', zIndex: 10 }}>
                    APRÈS PROJET (Simulation)
                </div>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={photos?.apres} 
                    onUpload={(data) => onUpload('apres', data)} 
                    defaultText="Simulation d'insertion manquante" 
                    label="Simulation Après"
                />
            </div>
        </div>
        <Footer project={project} />
    </div>
);

export const PlateEnvProcheLointain = ({ project, photos, isInteractive, onUpload }) => (
    <div style={PAGE_STYLE} id="pc-plate-env">
        <PlateHeader title="PC7 / PC8 : ENVIRONNEMENT PROCHE ET LOINTAIN" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold', zIndex: 10 }}>
                    PC7 - ENVIRONNEMENT PROCHE
                </div>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={photos?.proche} 
                    onUpload={(data) => onUpload('proche', data)} 
                    defaultText="Photo de l'environnement proche manquante" 
                    label="Photo Proche"
                />
            </div>
            <div style={{ height: '75mm', border: '1px solid #ccc', borderRadius: '2mm', position: 'relative', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(255,255,255,0.9)', padding: '1mm 3mm', borderRadius: '1mm', fontSize: '9pt', fontWeight: 'bold', zIndex: 10 }}>
                    PC8 - ENVIRONNEMENT LOINTAIN
                </div>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={photos?.lointain} 
                    onUpload={(data) => onUpload('lointain', data)} 
                    defaultText="Photo de l'environnement lointain manquante" 
                    label="Photo Lointain"
                />
            </div>
        </div>
        <Footer project={project} />
    </div>
);
