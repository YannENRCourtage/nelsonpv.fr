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
    paddingBottom: '4mm',
    marginBottom: '4mm'
};

const LOGO_NELSON = "https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/338201d787e373b4c0b156cb07a5b792.png"; 

export const PlateHeader = ({ title, project, showBranding }) => {
    const clientFullName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Client';
    return (
        <div style={HEADER_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={LOGO_NELSON} alt="Nelson" style={{ height: '11mm' }} />
                <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                    <div style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#10b981' }}>NELSON</div>
                    {showBranding ? (
                        <div style={{ fontSize: '7.5pt', color: '#666', fontWeight: 'bold' }}>nelsonpv.fr</div>
                    ) : (
                        <div style={{ fontSize: '7.5pt', color: '#666' }}>L'énergie solaire simplifiée</div>
                    )}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#10b981' }}>{title}</div>
                <div style={{ fontSize: '8.5pt', color: '#333' }}>
                    Projet : {clientFullName} — {project?.city || project?.cadastre_commune || ''} ({project?.zip || project?.zipCode || ''})
                </div>
            </div>
        </div>
    );
};

export const Footer = ({ project }) => (
    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7.5pt', color: '#666', borderTop: '1px solid #eee', paddingTop: '2.5mm' }}>
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
            reader.onload = (event) => onUpload && onUpload(event.target.result);
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    {isInteractive ? (
                        <>
                            <div style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' }}>
                                + Charger une image
                            </div>
                            <span style={{ fontSize: '10px', pointerEvents: 'none' }}>{label || defaultText}</span>
                        </>
                    ) : (
                        <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{defaultText}</span>
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
            <PlateHeader title="PC1 : PLAN DE SITUATION DU TERRAIN" project={project} />
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

/**
 * PLANCHE COMBINÉE PC3 / PC4 : PLAN EN COUPE DU TERRAIN & NOTICE DESCRIPTIVE SUR LA MÊME PAGE
 */
export const PlateSectionAndNotice = ({ project, noticeText, onNoticeChange, isInteractive }) => {
    const longueur = project?.longueur || '30.0';
    const largeur = parseFloat(project?.largeur || 16.4);
    const hauteurEgout = parseFloat(project?.hauteur_egout || 4.0);
    const pente = parseFloat(project?.pente || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3); // Pente naturelle du terrain
    const ridgeHeight = (hauteurEgout + largeur * Math.tan((pente * Math.PI) / 180)).toFixed(2);

    // Points de dessin SVG pour le profil altimétrique et la coupe
    const groundYLeft = 145 + Math.sin((terrainSlopeDeg * Math.PI) / 180) * 120;
    const groundYRight = 145 - Math.sin((terrainSlopeDeg * Math.PI) / 180) * 120;

    return (
        <div style={PAGE_STYLE} id="pc-plate-section-notice">
            <PlateHeader title="PC3 : PLAN EN COUPE & PC4 : NOTICE DESCRIPTIVE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4mm' }}>
                
                {/* ── HAUT : PC3 PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION ── */}
                <div style={{ height: '88mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '3mm 5mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm' }}>
                        <span style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                            PC3 — Coupe transversale & Profil altimétrique (Pente terrain {terrainSlopeDeg}°)
                        </span>
                        <span style={{ fontSize: '8pt', color: '#64748b' }}>
                            Échelle indicative • Dimensions : {largeur}m × {longueur}m
                        </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="680" height="150" viewBox="0 0 680 150" style={{ width: '100%', height: '100%', maxHeight: '72mm' }}>
                            {/* 1. Ligne de Terrain Naturel (TN) inclinée selon l'altimétrie */}
                            <line x1="30" y1={groundYLeft} x2="650" y2={groundYRight} stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 3" />
                            <text x="50" y={groundYLeft + 14} fill="#64748b" fontSize="9" fontStyle="italic">TN Aval (-0.30m)</text>
                            <text x="630" y={groundYRight + 14} textAnchor="end" fill="#64748b" fontSize="9" fontStyle="italic">TN Amont (+0.40m)</text>

                            {/* 2. Poteaux métalliques de structure */}
                            <rect x="150" y="55" width="10" height={groundYLeft - 55} fill="#334155" />
                            <rect x="520" y="30" width="10" height={groundYRight - 30} fill="#334155" />

                            {/* 3. Toiture métallique et modules solaires */}
                            <polygon points={`145,55 535,28 530,35 150,62`} fill="#1e293b" />
                            <polygon points={`148,53 533,26 531,21 146,48`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />

                            {/* 4. Information PENTE : STRICTEMENT AU-DESSUS DE LA COUVERTURE */}
                            <text x="340" y="20" textAnchor="middle" fill="#1e3a8a" fontSize="10.5" fontWeight="bold">
                                ▲ Pente toiture : {pente}° ({Math.round(Math.tan((pente * Math.PI) / 180) * 100)}%)
                            </text>

                            {/* 5. Rappel Hauteur Égout à gauche */}
                            <line x1="125" y1="55" x2="125" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="120" y1="55" x2="130" y2="55" stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="120" y1={groundYLeft} x2="130" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                            <text x="115" y="90" textAnchor="end" fill="#ef4444" fontSize="9.5" fontWeight="bold">H. Égout : {hauteurEgout.toFixed(2)}m</text>

                            {/* 6. Rappel Hauteur Faîtage à droite */}
                            <line x1="550" y1="28" x2="550" y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="545" y1="28" x2="555" y2="28" stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="545" y1={groundYRight} x2="555" y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                            <text x="560" y="75" textAnchor="start" fill="#ef4444" fontSize="9.5" fontWeight="bold">H. Faîtage : {ridgeHeight}m</text>

                            {/* 7. Ligne de Largeur et texte STRICTEMENT AU-DESSOUS DU TRAIT */}
                            <line x1="150" y1="130" x2="530" y2="130" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1="150" y1="124" x2="150" y2="136" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1="530" y1="124" x2="530" y2="136" stroke="#0284c7" strokeWidth="1.5" />
                            {/* Texte AU-DESSOUS */}
                            <text x="340" y="145" textAnchor="middle" fill="#0284c7" fontSize="10.5" fontWeight="bold">
                                ▼ Largeur : {largeur.toFixed(2)} m (Emprise au sol)
                            </text>
                        </svg>
                    </div>
                </div>

                {/* ── BAS : PC4 NOTICE DESCRIPTIVE (NOTICE DU PROJET) ── */}
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '3.5mm 6mm', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5mm' }}>
                        PC4 — Notice descriptive du projet & Caractéristiques architecturales
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', fontSize: '8.5pt', lineHeight: '1.4', color: '#334155' }}>
                        {isInteractive ? (
                            <textarea 
                                style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '8.5pt', fontFamily: 'Arial, sans-serif' }}
                                value={noticeText || project?.description || ''}
                                onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                                placeholder="Notice descriptive du projet..."
                            />
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {noticeText || project?.description || `Construction d'un bâtiment agricole à charpente métallique recevant une centrale solaire photovoltaïque intégrée en toiture de ${project?.kwc || 100} kWc.
• Dimensions de l'ouvrage : Longueur ${longueur}m, Largeur ${largeur}m, Hauteur égout ${hauteurEgout}m, Pente toiture ${pente}°.
• Matériaux : Structure acier galvanisé, toiture bac acier avec modules photovoltaïques monocristallins foncés, finition soignée anti-reflet.
• Destination : Activité agricole, stockage de matériel/fourrage et valorisation de l'énergie solaire renouvelable.`}
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSection = (props) => <PlateSectionAndNotice {...props} />;
export const PlateNotice = (props) => <PlateSectionAndNotice {...props} />;

/**
 * PLANCHE PC5 : PLAN DES FAÇADES ET TOITURES (5 ZONES : SUD, NORD, EST, OUEST, TOITURE)
 */
export const PlateFacades = ({ project, captures, isInteractive, onUpload }) => {
    const sud = captures?.facade_sud || captures?.facades_projet;
    const nord = captures?.facade_nord;
    const est = captures?.facade_est;
    const ouest = captures?.facade_ouest;
    const toiture = captures?.vue_couverture || captures?.toiture;

    return (
        <div style={PAGE_STYLE} id="pc-plate-facades">
            <PlateHeader title="PC5 : PLAN DES FAÇADES ET TOITURES (5 VUES 3D)" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                
                {/* Ligne 1 : Façades Longs Pans (Sud & Nord) */}
                <div style={{ flex: 1.1, display: 'flex', gap: '4mm' }}>
                    {/* Façade Sud */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            1. FAÇADE SUD (VUE AVANT / LONG PAN)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={sud} 
                                onUpload={(data) => onUpload && onUpload('facade_sud', data)} 
                                defaultText="Vue Façade Sud" 
                                label="Façade Sud"
                            />
                        </div>
                    </div>

                    {/* Façade Nord */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            2. FAÇADE NORD (VUE ARRIÈRE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={nord || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_nord', data)} 
                                defaultText="Vue Façade Nord" 
                                label="Façade Nord"
                            />
                        </div>
                    </div>
                </div>

                {/* Ligne 2 : Pignons (Est & Ouest) et Vue Toiture (Couverture) */}
                <div style={{ flex: 1, display: 'flex', gap: '4mm' }}>
                    {/* Façade Est */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            3. FAÇADE EST (PIGNON GAUCHE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={est || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_est', data)} 
                                defaultText="Vue Façade Est" 
                                label="Façade Est"
                            />
                        </div>
                    </div>

                    {/* Façade Ouest */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            4. FAÇADE OUEST (PIGNON DROIT)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={ouest || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_ouest', data)} 
                                defaultText="Vue Façade Ouest" 
                                label="Façade Ouest"
                            />
                        </div>
                    </div>

                    {/* Vue Couverture (Toiture) */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2mm', background: '#dbeafe', borderBottom: '1px solid #93c5fd', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#1e40af' }}>
                            5. VUE COUVERTURE (PLAN TOITURE PV)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={toiture || sud} 
                                onUpload={(data) => onUpload && onUpload('vue_couverture', data)} 
                                defaultText="Vue Couverture Toiture" 
                                label="Plan Toiture"
                            />
                        </div>
                    </div>
                </div>

            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE (Side-by-Side)
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
