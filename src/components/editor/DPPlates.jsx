import React from 'react';
import { getInstallationTypeInfo } from '@/services/UrbanismeDocService';
import batteryPhotoDefault from '@/assets/battery_photo.jpg';

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
    borderBottom: '2px solid #00429d',
    paddingBottom: '5mm',
    marginBottom: '5mm'
};

const LOGO_NELSON = "https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/338201d787e373b4c0b156cb07a5b792.png"; 

export const PlateHeader = ({ title, project, showBranding }) => {
    const clientFullName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Client';
    return (
        <div style={HEADER_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={LOGO_NELSON} alt="Nelson" style={{ height: '12mm' }} />
                <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                    <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#00429d' }}>NELSON</div>
                    {showBranding ? (
                        <div style={{ fontSize: '8pt', color: '#666', fontWeight: 'bold' }}>nelsonpv.fr</div>
                    ) : (
                        <div style={{ fontSize: '8pt', color: '#666' }}>L'énergie solaire simplifiée</div>
                    )}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#00429d' }}>{title}</div>
                <div style={{ fontSize: '9pt', color: '#333' }}>
                    Projet : {clientFullName} — {project?.city || project?.cadastre_commune || ''} ({project?.zip || project?.zipCode || ''})
                </div>
            </div>
        </div>
    );
};

export const Footer = ({ project }) => (
    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt', color: '#666', borderTop: '1px solid #eee', paddingTop: '3mm' }}>
        <div>NELSON - nelsonpv.fr</div>
        <div>Dossier de Déclaration Préalable</div>
        <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
    </div>
);

/**
 * PLANCHE 1 : COUVERTURE DP
 */
export const PlateCover = ({ project, installationType }) => {
    const typeInfo = getInstallationTypeInfo(installationType || project?.type || 'batiment_solaire', project?.kwc || project?.projectSize);
    const clientFullName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Demandeur';

    return (
        <div style={PAGE_STYLE} id="dp-plate-cover">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', border: '1px solid #00429d', padding: '15mm', boxSizing: 'border-box' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <img src={LOGO_NELSON} alt="Nelson" style={{ height: '18mm' }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#00429d' }}>DOSSIER D'URBANISME</div>
                        <div style={{ fontSize: '10pt', color: '#666' }}>Déclaration Préalable de Travaux</div>
                    </div>
                </div>

                {/* Center Title */}
                <div style={{ textAlign: 'center', margin: '10mm 0' }}>
                    <div style={{ fontSize: '24pt', fontWeight: '900', color: '#00429d', textTransform: 'uppercase', marginBottom: '4mm' }}>
                        {typeInfo.title}
                    </div>
                    <div style={{ fontSize: '14pt', color: '#334155', fontWeight: 'bold' }}>
                        {typeInfo.subtitle}
                    </div>
                </div>

                {/* Project Details Box */}
                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '8mm' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm' }}>
                        <div>
                            <div style={{ fontSize: '10pt', color: '#64748b', textTransform: 'uppercase', marginBottom: '1mm', fontWeight: 'bold' }}>Demandeur (Maître d'ouvrage) :</div>
                            <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#0f172a' }}>{clientFullName}</div>
                            {project?.email && <div style={{ fontSize: '10pt', color: '#334155', marginTop: '1mm' }}>{project.email}</div>}
                            {project?.phone && <div style={{ fontSize: '10pt', color: '#334155' }}>{project.phone}</div>}
                        </div>
                        <div>
                            <div style={{ fontSize: '10pt', color: '#64748b', textTransform: 'uppercase', marginBottom: '1mm', fontWeight: 'bold' }}>Adresse du terrain :</div>
                            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#0f172a' }}>{project?.address || project?.adresse || '—'}</div>
                            <div style={{ fontSize: '12pt', color: '#334155' }}>{project?.zip || project?.zipCode || ''} {project?.city || project?.commune || ''}</div>
                            <div style={{ fontSize: '10.5pt', color: '#00429d', marginTop: '2mm', fontWeight: 'bold' }}>
                                Section {project?.cadastre_section || project?.section || '-'} n° {project?.cadastre_numero || project?.numero || '-'} {project?.cadastre_surface ? `(${project.cadastre_surface} m²)` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <Footer project={project} />
            </div>
        </div>
    );
};

/**
 * PLANCHE 2 : PLAN DE SITUATION (DP1)
 */
export const PlateSituation = ({ project, captures }) => {
    return (
        <div style={{ ...PAGE_STYLE, paddingTop: '12mm', paddingLeft: '12mm', paddingRight: '12mm', paddingBottom: '8mm', backgroundColor: '#fff' }} id="dp-plate-situation">
            <PlateHeader title="DP1 — PLAN DE SITUATION" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '8mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                        Vue Cartographique (IGN / Cadastre)
                    </div>
                    <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={captures?.ign || captures?.cadastre || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan IGN" crossOrigin="anonymous" />
                    </div>
                </div>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                        Vue Aérienne (Géoportail / Satellite)
                    </div>
                    <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={captures?.satellite || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Vue Satellite" crossOrigin="anonymous" />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE 3 : PLAN DE MASSE (DP2)
 */
export const PlateMasse = ({ project, captures }) => {
    return (
        <div style={{ ...PAGE_STYLE, paddingTop: '12mm', paddingLeft: '12mm', paddingRight: '12mm', paddingBottom: '8mm', backgroundColor: '#fff' }} id="dp-plate-masse">
            <PlateHeader title="DP2 — PLAN DE MASSE DES CONSTRUCTIONS" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={captures?.masse_projet || captures?.satellite || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan de masse" crossOrigin="anonymous" />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP3 : PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION
 */
export const PlateSection = ({ project, captures }) => {
    const isBattery = project?.type === 'batterie';
    const longueur = project?.longueur || '30.0';
    const largeur = project?.largeur || '16.4';
    const hauteurEgout = project?.hauteur_egout || '4.0';
    const pente = project?.pente || '15';

    if (isBattery) {
        const batteryName = project?.battery_model || "CESC Mercury 261";
        return (
            <div style={PAGE_STYLE} id="dp-plate-section">
                <PlateHeader title="DP3 — PLAN EN COUPE (BATTERIE)" project={project} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100mm', height: '90mm', borderBottom: '1px solid #999', marginBottom: '5mm' }}>
                        <div style={{ position: 'absolute', bottom: '-8mm', left: 0, right: 0, textAlign: 'center', fontSize: '10pt', color: '#999', fontStyle: 'italic' }}>Terrain naturel existant (plat — pas de terrassement)</div>
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '50mm', height: '100mm', backgroundColor: '#fef3c7', border: '1.5px solid #d97706', display: 'flex', flexDirection: 'column', padding: '2mm' }}>
                            <div style={{ position: 'absolute', top: '-10mm', left: 0, right: 0, textAlign: 'center' }}>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#d97706' }}>{batteryName}</div>
                            </div>
                            <div style={{ flex: 1, border: '1px solid #f59e0b', marginBottom: '1mm', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9pt', color: '#d97706', fontWeight: 'bold' }}>Armoire Batterie</div>
                        </div>
                    </div>
                </div>
                <Footer project={project} />
            </div>
        );
    }

    return (
        <div style={PAGE_STYLE} id="dp-plate-section">
            <PlateHeader title="DP3 — PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6mm', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#1e293b' }}>
                        Coupe transversale — Bâtiment agricole photovoltaïque ({largeur}m x {longueur}m)
                    </div>
                    <svg width="680" height="220" viewBox="0 0 680 220" style={{ maxWidth: '100%', height: 'auto' }}>
                        <line x1="40" y1="180" x2="640" y2="180" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
                        <text x="340" y="200" textAnchor="middle" fill="#64748b" fontSize="11" fontStyle="italic">Terrain naturel existant (TN = 0.00)</text>

                        <rect x="140" y="90" width="12" height="90" fill="#334155" />
                        <rect x="528" y="60" width="12" height="120" fill="#334155" />

                        <polygon points="135,90 545,55 540,65 140,98" fill="#1e293b" />
                        <polygon points="140,88 540,53 538,47 138,82" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />

                        <line x1="110" y1="90" x2="110" y2="180" stroke="#ef4444" strokeWidth="1.5" />
                        <text x="100" y="140" textAnchor="end" fill="#ef4444" fontSize="11" fontWeight="bold">H. Egout : {hauteurEgout}m</text>

                        <line x1="570" y1="55" x2="570" y2="180" stroke="#ef4444" strokeWidth="1.5" />
                        <text x="580" y="120" textAnchor="start" fill="#ef4444" fontSize="11" fontWeight="bold">H. Faîtage : {(Number(hauteurEgout) + Number(largeur) * Math.tan((pente * Math.PI) / 180)).toFixed(2)}m</text>

                        <line x1="140" y1="210" x2="540" y2="210" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="340" y="215" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">Largeur : {largeur} m (Pente toiture {pente}°)</text>
                    </svg>
                    <div style={{ fontSize: '9pt', color: '#64748b' }}>
                        Charpente métallique traitée anti-corrosion, toiture en bac acier recevant modules photovoltaïques intégrés.
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP4 : FAÇADES ET TOITURES
 */
export const PlateFacades = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-facades">
            <PlateHeader title="DP4 — PLAN DES FAÇADES ET TOITURES / VUE 3D" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                <img src={captures?.facades_projet || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Façades" crossOrigin="anonymous" />
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP6 : DOCUMENT GRAPHIQUE D'INSERTION (Side-by-Side sur la même ligne)
 */
export const PlateInsertion = ({ project, captures, photos }) => {
    const photoAvant = photos?.avant || captures?.photo_avant || '';
    const photoApres = photos?.apres || captures?.photo_apres || '';

    return (
        <div style={PAGE_STYLE} id="dp-plate-insertion">
            <PlateHeader title="DP6 — DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2.5mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b' }}>
                        1. VUE DE L'ÉTAT INITIAL (AVANT PROJET)
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={photoAvant} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Avant" crossOrigin="anonymous" />
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2.5mm', background: '#dcfce7', borderBottom: '1px solid #86efac', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#166534' }}>
                        2. VUE APRÈS PROJET (SIMULATION 3D D'INSERTION PAYSAGÈRE)
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={photoApres} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Après" crossOrigin="anonymous" />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP7 : ENVIRONNEMENT PROCHE
 */
export const PlateEnvProche = ({ project, captures, photos }) => {
    const photoProche = photos?.proche || captures?.env_proche || captures?.satellite || '';
    return (
        <div style={PAGE_STYLE} id="dp-plate-env-proche">
            <PlateHeader title="DP7 — PHOTOGRAPHIE DE L'ENVIRONNEMENT PROCHE" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={photoProche} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Env Proche" crossOrigin="anonymous" />
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateInsertionNotice = ({ project }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-notice-insertion">
            <PlateHeader title="DP11 — NOTICE DESCRIPTIVE DES TRAVAUX" project={project} showBranding={true} />
            <div style={{ flex: 1, padding: '6mm 10mm', overflowY: 'hidden', fontSize: '10pt', lineHeight: '1.5', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>
                <h3 style={{ fontSize: '11pt', fontWeight: 'bold', color: '#00429d', marginBottom: '2mm' }}>Objet de la Déclaration Préalable</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                    {project?.description || `Construction d'un bâtiment agricole à charpente métallique recevant une centrale solaire photovoltaïque intégrée en toiture d'une puissance de ${project?.kwc || 100} kWc.`}
                </p>
                <div style={{ marginTop: '5mm', padding: '4mm', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 'bold', color: '#00429d', marginBottom: '2mm' }}>Caractéristiques de l'ouvrage :</div>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        <li>Emprise et dimensions : {project?.largeur || '16.4'} m de large par {project?.longueur || '30.0'} m de long</li>
                        <li>Hauteur à l'égout : {project?.hauteur_egout || '4.0'} m — Pente toiture : {project?.pente || '15'}°</li>
                        <li>Destination : Activité agricole, stockage et production d'énergie solaire photovoltaïque</li>
                    </ul>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};
