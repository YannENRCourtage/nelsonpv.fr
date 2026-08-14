import React, { useRef } from 'react';
import { getInstallationTypeInfo } from '@/services/UrbanismeDocService';

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

const PlateHeader = ({ title, project, showBranding }) => {
    const clientFullName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Client';
    return (
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
                    Projet : {clientFullName} — {project?.city || project?.cadastre_commune || ''} ({project?.zip || project?.zipCode || ''})
                </div>
            </div>
        </div>
    );
};

const Footer = ({ project }) => (
    <div style={{ marginTop: '5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt', color: '#666', borderTop: '1px solid #eee', paddingTop: '3mm' }}>
        <div>NELSON - nelsonpv.fr</div>
        <div style={{ fontWeight: 'bold' }}>DOSSIER DE PERMIS DE CONSTRUIRE</div>
        <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
    </div>
);

// Composant réutilisable pour afficher ou uploader une image
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

export const PlateCover = ({ project, installationType }) => {
    const typeInfo = getInstallationTypeInfo(installationType || project?.installationType || project?.type, project?.projectSize || project?.kwc);
    const clientFullName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Demandeur';

    return (
        <div style={PAGE_STYLE} id="pc-plate-cover">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{ fontSize: '30pt', color: '#10b981', textAlign: 'center', marginBottom: '6mm', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    Dossier de Permis de Construire
                </h1>
                <h2 style={{ fontSize: '18pt', color: '#333', textAlign: 'center', marginBottom: '3mm', fontWeight: 'bold' }}>
                    {typeInfo.title}
                </h2>
                <p style={{ fontSize: '13pt', color: '#666', textAlign: 'center', marginBottom: '12mm' }}>
                    {typeInfo.subtitle}
                </p>

                <div style={{ width: '88%', padding: '8mm', border: '2px solid #10b981', borderRadius: '4mm', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', fontSize: '11pt' }}>
                        <div>
                            <strong style={{ color: '#666' }}>Maître d'Ouvrage (Demandeur) :</strong><br />
                            <span style={{ fontSize: '13pt', fontWeight: 'bold', color: '#00429d' }}>{clientFullName}</span><br />
                            {project?.email && <>{project.email}<br /></>}
                            {project?.phone && <>{project.phone}</>}
                        </div>
                        <div>
                            <strong style={{ color: '#666' }}>Lieu des Travaux :</strong><br />
                            {project?.address || project?.adresse || '—'}<br />
                            {project?.zip || project?.zipCode || ''} {project?.city || project?.commune || ''}
                        </div>
                        <div style={{ gridColumn: 'span 2', marginTop: '4mm', borderTop: '1px solid #ccc', paddingTop: '4mm' }}>
                            <strong style={{ color: '#666' }}>Références Cadastrales :</strong><br />
                            Commune de {project?.cadastre_commune || project?.city || project?.commune || '...........'}<br />
                            Section {project?.cadastre_section || project?.section || '...'} Parcelle n° {project?.cadastre_numero || project?.numero || '...'}
                            <br />
                            Superficie du terrain : {project?.cadastre_surface || project?.surface ? `${project.cadastre_surface || project.surface} m²` : '...'}
                        </div>
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSituation = ({ project, captures, isInteractive, onUpload }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-situation">
            <PlateHeader title="PC1 : PLAN DE SITUATION" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '8mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '3mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '10pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                        Vue Cartographique (IGN / Cadastre)
                    </div>
                    <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={captures?.ign || captures?.cadastre} 
                            onUpload={(data) => onUpload && onUpload('ign', data)} 
                            defaultText="Plan de situation cartographique IGN" 
                            label="Plan IGN"
                        />
                    </div>
                </div>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '3mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '10pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                        Vue Aérienne (Géoportail / Satellite)
                    </div>
                    <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={captures?.satellite} 
                            onUpload={(data) => onUpload && onUpload('satellite', data)} 
                            defaultText="Vue aérienne satellite Géoportail" 
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
            <PlateHeader title="PC2 : PLAN DE MASSE DES CONSTRUCTIONS" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '5mm', flexDirection: 'column' }}>
                 <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '3mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={captures?.masse_projet || captures?.satellite} 
                        onUpload={(data) => onUpload && onUpload('masse_projet', data)} 
                        defaultText="Plan de masse (OpenStreetMap Zoom 19 / Cadastre)" 
                        label="Plan de Masse"
                    />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSection = ({ project, captures, isInteractive, onUpload }) => {
    const isBattery = project?.type === 'batterie';
    const longueur = project?.longueur || '30.0';
    const largeur = project?.largeur || '16.4';
    const hauteurEgout = project?.hauteur_egout || '4.0';
    const pente = project?.pente || '15';

    return (
        <div style={PAGE_STYLE} id="pc-plate-section">
            <PlateHeader title="PC3 : PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '6mm', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                {captures?.coupe_projet ? (
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={captures?.coupe_projet} 
                        onUpload={(data) => onUpload && onUpload('coupe_projet', data)} 
                        defaultText="Plan en coupe inséré" 
                        label="Plan en coupe"
                    />
                ) : !isBattery ? (
                    /* Rendu vectoriel architectural du bâtiment avec cotations */
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#1e293b' }}>
                            Coupe transversale — Bâtiment agricole photovoltaïque ({largeur}m x {longueur}m)
                        </div>
                        <svg width="680" height="220" viewBox="0 0 680 220" style={{ maxWidth: '100%', height: 'auto' }}>
                            {/* Ligne Terrain */}
                            <line x1="40" y1="180" x2="640" y2="180" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
                            <text x="340" y="200" textAnchor="middle" fill="#64748b" fontSize="11" fontStyle="italic">Terrain naturel existant (TN = 0.00)</text>

                            {/* Poteaux */}
                            <rect x="140" y="90" width="12" height="90" fill="#334155" />
                            <rect x="528" y="60" width="12" height="120" fill="#334155" />

                            {/* Toiture / Charpente */}
                            <polygon points="135,90 545,55 540,65 140,98" fill="#1e293b" />
                            {/* Panneaux solaires bleus */}
                            <polygon points="140,88 540,53 538,47 138,82" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />

                            {/* Cotations */}
                            {/* Hauteur égout gauche */}
                            <line x1="110" y1="90" x2="110" y2="180" stroke="#ef4444" strokeWidth="1.5" />
                            <text x="100" y="140" textAnchor="end" fill="#ef4444" fontSize="11" fontWeight="bold">H. Egout : {hauteurEgout}m</text>

                            {/* Hauteur Faîtage droite */}
                            <line x1="570" y1="55" x2="570" y2="180" stroke="#ef4444" strokeWidth="1.5" />
                            <text x="580" y="120" textAnchor="start" fill="#ef4444" fontSize="11" fontWeight="bold">H. Faîtage : {(Number(hauteurEgout) + Number(largeur) * Math.tan((pente * Math.PI) / 180)).toFixed(2)}m</text>

                            {/* Largeur Bâtiment */}
                            <line x1="140" y1="210" x2="540" y2="210" stroke="#0284c7" strokeWidth="1.5" />
                            <text x="340" y="215" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">Largeur : {largeur} m (Pente toiture {pente}°)</text>
                        </svg>
                        <div style={{ fontSize: '9pt', color: '#64748b' }}>
                            Charpente métallique traitée anti-corrosion, toiture en bac acier recevant modules photovoltaïques intégrés.
                        </div>
                    </div>
                ) : (
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={captures?.coupe_projet} 
                        onUpload={(data) => onUpload && onUpload('coupe_projet', data)} 
                        defaultText="Plan en coupe batterie à insérer" 
                        label="Plan en coupe"
                    />
                )}
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateNotice = ({ project, noticeText, onNoticeChange, isInteractive }) => {
    return (
        <div style={PAGE_STYLE} id="pc-plate-notice">
            <PlateHeader title="PC4 : NOTICE DESCRIPTIVE DU PROJET" project={project} showBranding={true} />
            <div style={{ flex: 1, padding: '5mm', overflowY: 'hidden', fontSize: '10pt', lineHeight: '1.5', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '3mm', background: '#fff' }}>
                {isInteractive ? (
                    <textarea 
                        style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}
                        value={noticeText}
                        onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                        placeholder="Saisissez ou collez la notice descriptive du projet ici..."
                    />
                ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {noticeText || project?.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Notice descriptive du projet solaire.</span>}
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
            <PlateHeader title="PC5 : PLAN DES FAÇADES ET TOITURES / VUE 3D" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '4mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                <ImageUploadZone 
                    isInteractive={isInteractive} 
                    photo={captures?.facades_projet} 
                    onUpload={(data) => onUpload && onUpload('facades_projet', data)} 
                    defaultText="Vue 3D / Plan des façades et toitures du projet" 
                    label="Plan des façades & toitures"
                />
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE
 * Affiche les vues Avant et Après sur la MÊME LIGNE HORIZONTALE (side-by-side)
 */
export const PlateInsertion = ({ project, photos, isInteractive, onUpload }) => (
    <div style={PAGE_STYLE} id="pc-plate-insertion">
        <PlateHeader title="PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm' }}>
            {/* VUE AVANT PROJET (GAUCHE) */}
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '2.5mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b' }}>
                    1. VUE DE L'ÉTAT INITIAL DU SITE (AVANT TRAVAUX)
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={photos?.avant} 
                        onUpload={(data) => onUpload && onUpload('avant', data)} 
                        defaultText="Photo avant projet (État initial du terrain)" 
                        label="Photo Avant"
                    />
                </div>
            </div>

            {/* VUE APRÈS PROJET (DROITE) */}
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '2.5mm', background: '#dcfce7', borderBottom: '1px solid #86efac', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#166534' }}>
                    2. VUE APRÈS PROJET (SIMULATION 3D D'INSERTION PAYSAGÈRE)
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={photos?.apres} 
                        onUpload={(data) => onUpload && onUpload('apres', data)} 
                        defaultText="Simulation d'insertion 3D paysagère" 
                        label="Simulation Après"
                    />
                </div>
            </div>
        </div>
        <Footer project={project} />
    </div>
);

export const PlateEnvProcheLointain = ({ project, photos, isInteractive, onUpload }) => (
    <div style={PAGE_STYLE} id="pc-plate-env">
        <PlateHeader title="PC7 / PC8 : ENVIRONNEMENT PROCHE ET LOINTAIN" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm' }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '2.5mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b' }}>
                    PC7 - VUE DE L'ENVIRONNEMENT PROCHE
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={photos?.proche} 
                        onUpload={(data) => onUpload && onUpload('proche', data)} 
                        defaultText="Photo de l'environnement proche" 
                        label="Photo Proche"
                    />
                </div>
            </div>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '2.5mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b' }}>
                    PC8 - VUE DE L'ENVIRONNEMENT LOINTAIN
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={photos?.lointain} 
                        onUpload={(data) => onUpload && onUpload('lointain', data)} 
                        defaultText="Photo de l'environnement lointain" 
                        label="Photo Lointain"
                    />
                </div>
            </div>
        </div>
        <Footer project={project} />
    </div>
);
