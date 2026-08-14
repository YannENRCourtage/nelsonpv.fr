import React from 'react';
import { getInstallationTypeInfo } from '@/services/UrbanismeDocService';
import batteryPhotoDefault from '@/assets/battery_photo.jpg';

// Dimensions A4 Paysage : 297 x 210 mm avec marges équilibrées et espace pour le footer rehaussé
const PAGE_STYLE = {
    width: '297mm',
    height: '210mm',
    padding: '8mm 10mm 12mm 10mm',
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
    paddingBottom: '3.5mm',
    marginBottom: '3.5mm'
};

const LOGO_NELSON = "https://horizons-cdn.hostinger.com/350bc103-daf8-48b5-9a02-076489f36a7d/338201d787e373b4c0b156cb07a5b792.png"; 

export const PlateHeader = ({ title, project, showBranding }) => {
    const clientFullName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Client';
    return (
        <div style={HEADER_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={LOGO_NELSON} alt="Nelson" style={{ height: '10.5mm' }} />
                <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                    <div style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#00429d' }}>NELSON</div>
                    {showBranding ? (
                        <div style={{ fontSize: '7.5pt', color: '#666', fontWeight: 'bold' }}>nelsonpv.fr</div>
                    ) : (
                        <div style={{ fontSize: '7.5pt', color: '#666' }}>L'énergie solaire simplifiée</div>
                    )}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12.5pt', fontWeight: 'bold', color: '#00429d' }}>{title}</div>
                <div style={{ fontSize: '8.5pt', color: '#333' }}>
                    Projet : {clientFullName} — {project?.city || project?.cadastre_commune || ''} ({project?.zip || project?.zipCode || ''})
                </div>
            </div>
        </div>
    );
};

export const Footer = ({ project }) => (
    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8.5pt', color: '#475569', borderTop: '1.5px solid #00429d', paddingTop: '3mm', paddingBottom: '1mm' }}>
        <div style={{ fontWeight: 'bold' }}>NELSON - nelsonpv.fr</div>
        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOSSIER DE DÉCLARATION PRÉALABLE</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', border: '1.5px solid #00429d', padding: '10mm', boxSizing: 'border-box', marginBottom: '5mm' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <img src={LOGO_NELSON} alt="Nelson" style={{ height: '14mm' }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#00429d' }}>DOSSIER D'URBANISME</div>
                        <div style={{ fontSize: '9pt', color: '#666' }}>Déclaration Préalable de Travaux</div>
                    </div>
                </div>

                {/* Main Titles */}
                <div style={{ textAlign: 'center', margin: '6mm 0' }}>
                    <h1 style={{ fontSize: '20pt', fontWeight: '900', color: '#00429d', margin: 0, textTransform: 'uppercase' }}>
                        {typeInfo.title}
                    </h1>
                    <h2 style={{ fontSize: '12pt', color: '#4b5563', marginTop: '3mm', fontWeight: 'bold' }}>
                        {typeInfo.subtitle}
                    </h2>
                </div>

                {/* Left details + Right table */}
                <div style={{ display: 'flex', gap: '8mm' }}>
                    <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '4mm', borderRadius: '4px', borderLeft: '4px solid #16a34a', fontSize: '9.5pt', lineHeight: 1.4 }}>
                        <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '1.5mm' }}>DEMANDEUR :</div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '10.5pt' }}>{clientFullName}</div>
                        <div>Commune : {project?.cadastre_commune || project?.city || '—'}</div>
                        <div>Section & Parcelle : {project?.cadastre_section || '—'} {project?.cadastre_numero || '—'}</div>
                        <div>Surface du terrain : {project?.cadastre_surface || project?.surface || '—'} m²</div>
                        <div>Puissance crête : {project?.kwc || 100} kWc</div>
                        <div>Type : {typeInfo.title}</div>
                    </div>

                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '4mm', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '9.5pt', lineHeight: 1.4 }}>
                        <div style={{ fontWeight: 'bold', color: '#00429d', marginBottom: '1.5mm' }}>ADRESSE DU TERRAIN :</div>
                        <div>{project?.address || project?.adresse || '—'}</div>
                        <div>{project?.zip || project?.zipCode || ''} {project?.city || project?.commune || ''}</div>
                        <div style={{ marginTop: '2mm', fontWeight: 'bold', color: '#00429d' }}>DESCRIPTIF SOMMAIRE :</div>
                        <div style={{ fontSize: '8.5pt', color: '#334155' }}>
                            {project?.description || `Construction d'un bâtiment agricole solaire photovoltaïque d'une puissance de ${project?.kwc || 100} kWc.`}
                        </div>
                    </div>
                </div>

            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP1 : PLAN DE SITUATION (Hauteur légèrement réduite et mentions sur 2 lignes)
 */
export const PlateSituation = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-situation">
            <PlateHeader title="DP1 — PLAN DE SITUATION DU TERRAIN" project={project} />
            <div style={{ flex: 1, display: 'flex', gap: '8mm', maxHeight: '126mm', marginBottom: '6mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.25' }}>
                        <div>Vue Cartographique</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(IGN / Cadastre)</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={captures?.ign || captures?.cadastre || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Carte IGN" crossOrigin="anonymous" />
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.25' }}>
                        <div>Vue Aérienne</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(Géoportail / Satellite)</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={captures?.satellite || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Vue Aérienne" crossOrigin="anonymous" />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP2 : PLAN DE MASSE (Cadre réduit en hauteur pour rehausser le footer)
 */
export const PlateMasse = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-masse">
            <PlateHeader title="DP2 — PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ padding: '2.5mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b' }}>
                    PLAN DE MASSE DE L'ÉTAT PROJETÉ (OPENSTREETMAP ZOOM 19 / EXTRAIT CADASTRAL)
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
export const PlateCoupe = ({ project }) => {
    const longueur = project?.longueur || '30.0';
    const largeur = parseFloat(project?.largeur || 20.0);
    const hauteurEgout = parseFloat(project?.hauteur_egout || 4.0);
    const pente = parseFloat(project?.pente || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);
    
    const rawType = (project?.buildingType || project?.installationType || project?.type || 'asymetrique_1').toLowerCase();
    const isOmbriere = rawType.includes('ombriere');
    const isMonopente = rawType.includes('monopente');
    const isSym = rawType.includes('symetrique') && !rawType.includes('asym');
    const isAsym = !isOmbriere && !isMonopente && !isSym;
    
    const hasAuvent = project?.rightSide === 'auvent' || project?.leftSide === 'auvent' || isAsym;

    let ridgeHeight = hauteurEgout + (largeur * 0.75 * Math.tan((pente * Math.PI) / 180));
    let leftEaveHeight = hauteurEgout;
    let rightEaveHeight = hauteurEgout;

    if (isAsym) {
        rightEaveHeight = hauteurEgout;
        ridgeHeight = rightEaveHeight + (largeur * 0.75 * Math.tan((pente * Math.PI) / 180));
        leftEaveHeight = Math.max(3.0, ridgeHeight - (largeur * 0.25 * Math.tan((pente * Math.PI) / 180)));
    } else if (isMonopente) {
        leftEaveHeight = hauteurEgout;
        ridgeHeight = leftEaveHeight + (largeur * Math.tan((pente * Math.PI) / 180));
        rightEaveHeight = ridgeHeight;
    } else if (isSym) {
        ridgeHeight = hauteurEgout + ((largeur / 2) * Math.tan((pente * Math.PI) / 180));
    }

    const groundYLeft = 140 + Math.sin((terrainSlopeDeg * Math.PI) / 180) * 105;
    const groundYRight = 140 - Math.sin((terrainSlopeDeg * Math.PI) / 180) * 105;

    const apexSvgX = isAsym ? 218 : 305;
    const apexSvgY = 20;
    const leftEaveSvgY = isAsym ? 44 : 54;
    const rightEaveSvgY = 54;
    const auventTipSvgX = 550;
    const auventTipSvgY = 66;

    const pxPerM = 350 / (largeur || 20.0);
    const scaleTotalWidth = 10 * pxPerM;
    const scaleSegWidth = 2 * pxPerM;
    const scaleStartX = 660 - scaleTotalWidth;
    const scaleY = 146;

    const roofTypeLabel = isAsym ? 'asymétrique' : isSym ? 'symétrique' : 'photovoltaïque';

    return (
        <div style={PAGE_STYLE} id="dp-plate-coupe">
            <PlateHeader title="DP3 — PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5mm 8mm', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm' }}>
                    <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#0f172a' }}>
                        Coupe transversale AA' — Bâtiment photovoltaïque & Terrain naturel
                    </span>
                    <span style={{ fontSize: '8.5pt', color: '#64748b' }}>
                        Dimensions : {largeur.toFixed(2)}m × {longueur}m • Échelle indicative
                    </span>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="680" height="156" viewBox="0 0 680 156" style={{ width: '100%', height: '100%', maxHeight: '85mm' }}>
                        {/* Badges d'Orientation NORD / SUD */}
                        <rect x="70" y="8" width="46" height="15" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                        <text x="93" y="19" textAnchor="middle" fill="#2563eb" fontSize="8" fontWeight="bold">NORD</text>

                        <rect x="585" y="8" width="40" height="15" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                        <text x="605" y="19" textAnchor="middle" fill="#2563eb" fontSize="8" fontWeight="bold">SUD</text>

                        <line x1="20" y1={groundYLeft} x2="660" y2={groundYRight} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" />
                        <text x="35" y={groundYLeft + 12} fill="#64748b" fontSize="8" fontStyle="italic">Terrain naturel conservé (TN Aval)</text>
                        <text x="655" y={groundYRight - 4} textAnchor="end" fill="#64748b" fontSize="8" fontStyle="italic">TN Amont</text>

                        <rect x="130" y={leftEaveSvgY} width="9" height={groundYLeft - leftEaveSvgY} fill="#334155" />
                        <rect x="472" y={rightEaveSvgY} width="9" height={groundYRight - rightEaveSvgY} fill="#334155" />

                        {isAsym ? (
                            <>
                                {/* Versant court Nord avec panneaux solaires */}
                                <line x1="130" y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                                <polygon points={`126,${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 8} 126,${leftEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                
                                {/* Versant long Sud avec panneaux solaires */}
                                <line x1={apexSvgX} y1={apexSvgY} x2="480" y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                <polygon points={`${apexSvgX},${apexSvgY - 2} 484,${rightEaveSvgY - 2} 484,${rightEaveSvgY - 8} ${apexSvgX},${apexSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                
                                {/* Auvent avec panneaux solaires */}
                                {hasAuvent && (
                                    <>
                                        <line x1="480" y1={rightEaveSvgY} x2={auventTipSvgX} y2={auventTipSvgY} stroke="#1e293b" strokeWidth="4" />
                                        <polygon points={`480,${rightEaveSvgY - 2} ${auventTipSvgX + 4},${auventTipSvgY - 2} ${auventTipSvgX + 4},${auventTipSvgY - 8} 480,${rightEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                        <text x={(480 + auventTipSvgX) / 2} y={rightEaveSvgY - 14} textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">Auvent +4.00m</text>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <line x1="130" y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                                <line x1={apexSvgX} y1={apexSvgY} x2="480" y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                <polygon points={`126,${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 8} 126,${leftEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                <polygon points={`${apexSvgX},${apexSvgY - 2} 484,${rightEaveSvgY - 2} 484,${rightEaveSvgY - 8} ${apexSvgX},${apexSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                            </>
                        )}

                        {/* 4. Mentions de Toiture & PENTE REMONTÉE */}
                        <text x={350} y={8} textAnchor="middle" fill="#1e3a8a" fontSize="8.5" fontWeight="bold">
                            Toiture {roofTypeLabel} : pente {pente}° ({Math.round(Math.tan((pente * Math.PI) / 180) * 100)}%) • Bac acier RAL 7016 + Modules solaires
                        </text>

                        {/* Rappel Hauteurs */}
                        <line x1="108" y1={leftEaveSvgY} x2="108" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                        <text x="100" y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="8" fontWeight="bold">
                            Égout Nord : {leftEaveHeight.toFixed(2)}m
                        </text>

                        <line x1="502" y1={rightEaveSvgY} x2="502" y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                        <text x="510" y={rightEaveSvgY + (groundYRight - rightEaveSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="8" fontWeight="bold">
                            Égout Sud : {rightEaveHeight.toFixed(2)}m
                        </text>

                        <line x1={apexSvgX} y1={apexSvgY} x2={apexSvgX} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
                        <text x={apexSvgX + 6} y={apexSvgY + 24} fill="#ef4444" fontSize="8.5" fontWeight="bold">
                            Faîtage : {ridgeHeight.toFixed(2)}m
                        </text>

                        <text x="305" y={118} textAnchor="middle" fill="#0284c7" fontSize="9.5" fontWeight="bold">
                            ▼ Largeur : {largeur.toFixed(2)} m (Emprise au sol)
                        </text>
                        <line x1="130" y1={125} x2="480" y2={125} stroke="#0284c7" strokeWidth="1.5" />

                        {/* Barre d'échelle métrique EXACTE (0 à 10m) en bas à droite sous TN Amont */}
                        <g transform={`translate(${scaleStartX}, ${scaleY})`}>
                            <rect x={0} y={0} width={scaleSegWidth} height={4} fill="#0f172a" />
                            <rect x={scaleSegWidth} y={0} width={scaleSegWidth} height={4} fill="#cbd5e1" />
                            <rect x={scaleSegWidth * 2} y={0} width={scaleSegWidth} height={4} fill="#0f172a" />
                            <rect x={scaleSegWidth * 3} y={0} width={scaleSegWidth} height={4} fill="#cbd5e1" />
                            <rect x={scaleSegWidth * 4} y={0} width={scaleSegWidth} height={4} fill="#0f172a" />
                            
                            <text x={0} y={8} fill="#475569" fontSize="6" textAnchor="middle">0</text>
                            <text x={scaleSegWidth} y={8} fill="#475569" fontSize="6" textAnchor="middle">2</text>
                            <text x={scaleSegWidth * 2} y={8} fill="#475569" fontSize="6.5" textAnchor="middle">4</text>
                            <text x={scaleSegWidth * 3} y={8} fill="#475569" fontSize="6.5" textAnchor="middle">6</text>
                            <text x={scaleSegWidth * 4} y={8} fill="#475569" fontSize="6.5" textAnchor="middle">8</text>
                            <text x={scaleTotalWidth} y={8} fill="#0f172a" fontSize="6.5" fontWeight="bold" textAnchor="middle">10m</text>
                        </g>
                    </svg>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSection = PlateCoupe;

/**
 * PLANCHE DP4 : FAÇADES ET TOITURES (5 Vues 3D)
 */
export const PlateFacades = ({ project, captures }) => {
    const sud = captures?.facade_sud || captures?.facades_projet;
    const nord = captures?.facade_nord;
    const est = captures?.facade_est;
    const ouest = captures?.facade_ouest;
    const toiture = captures?.vue_couverture || captures?.toiture;

    return (
        <div style={PAGE_STYLE} id="dp-plate-facades">
            <PlateHeader title="DP4 — PLAN DES FAÇADES ET TOITURES / VUES 3D" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ flex: 1, display: 'flex', gap: '3mm' }}>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>1. FAÇADE SUD</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Sud" />
                        </div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>2. FAÇADE NORD</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={nord || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Nord" />
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1.15, display: 'flex', gap: '3mm', alignItems: 'center' }}>
                    {/* Est : cadre à hauteur réduite avec titre sur 2 lignes */}
                    <div style={{ flex: 0.85, height: '88%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>3. FAÇADE EST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON GAUCHE)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={est || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleY(0.9)', transformOrigin: 'center' }} alt="Est" />
                        </div>
                    </div>
                    {/* Ouest : cadre à hauteur réduite avec titre sur 2 lignes */}
                    <div style={{ flex: 0.85, height: '88%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>4. FAÇADE OUEST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON DROIT)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={ouest || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleY(0.9)', transformOrigin: 'center' }} alt="Ouest" />
                        </div>
                    </div>
                    {/* Toiture */}
                    <div style={{ flex: 1.8, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#dbeafe', color: '#1e40af', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>5. VUE COUVERTURE (PAYSAGE)</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={toiture || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleY(0.9)', transformOrigin: 'center' }} alt="Toiture" />
                        </div>
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP6 : DOCUMENT GRAPHIQUE D'INSERTION (Side-by-Side)
 */
export const PlateInsertion = ({ project, captures, photos }) => {
    const photoAvant = photos?.avant || captures?.photo_avant || '';
    const photoApres = photos?.apres || captures?.photo_apres || '';

    return (
        <div style={PAGE_STYLE} id="dp-plate-insertion">
            <PlateHeader title="DP6 — DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: '124mm', marginBottom: '6mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b', lineHeight: '1.25' }}>
                        <div>1. VUE DE L'ÉTAT INITIAL</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(AVANT TRAVAUX)</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={photoAvant} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Avant" crossOrigin="anonymous" />
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#dcfce7', borderBottom: '1px solid #86efac', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#166534', lineHeight: '1.25' }}>
                        <div>2. VUE APRÈS PROJET</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#15803d', marginTop: '1px' }}>(SIMULATION 3D D'INSERTION PAYSAGÈRE)</div>
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

export const PlateEnvProche = ({ project, captures, photos }) => {
    const photoProche = photos?.proche || captures?.env_proche || captures?.satellite || '';
    return (
        <div style={PAGE_STYLE} id="dp-plate-env-proche">
            <PlateHeader title="DP7 — PHOTOGRAPHIE DE L'ENVIRONNEMENT PROCHE" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '135mm', marginBottom: '5mm' }}>
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
            <div style={{ flex: 1, padding: '5mm 8mm', overflowY: 'hidden', fontSize: '9.5pt', lineHeight: '1.45', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', maxHeight: '135mm', marginBottom: '5mm' }}>
                <h3 style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#00429d', marginBottom: '2mm' }}>Objet de la Déclaration Préalable</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                    {project?.description || `Construction d'un bâtiment agricole à charpente métallique recevant une centrale solaire photovoltaïque intégrée en toiture d'une puissance de ${project?.kwc || 100} kWc.`}
                </p>
                <div style={{ marginTop: '4mm', padding: '3.5mm', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 'bold', color: '#00429d', marginBottom: '1.5mm' }}>Caractéristiques de l'ouvrage :</div>
                    <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '9pt' }}>
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

export const PlateAspect = ({ project, batteryPhoto }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-aspect">
            <PlateHeader title="DP5 : REPRÉSENTATION DE L'ASPECT EXTÉRIEUR" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6mm', padding: '4mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', flex: 1 }}>
                    <img 
                        src={batteryPhoto || project?.urbanisme_captures?.facades_projet || "https://nelsonpv.fr/mercury_product_photo.jpg"} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff' }} 
                        alt="Aspect extérieur" 
                    />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvLointain = ({ project, captures, photos }) => (
    <div style={PAGE_STYLE} id="dp-plate-env-lointain">
        <PlateHeader title="DP8 : PHOTOGRAPHIE DE L'ENVIRONNEMENT LOINTAIN" project={project} />
        <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '135mm', marginBottom: '5mm' }}>
            <img src={photos?.lointain || captures?.env_lointain || captures?.satellite || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Env Lointain" crossOrigin="anonymous" />
        </div>
        <Footer project={project} />
    </div>
);

export const PlateNotice = ({ project, captures }) => (
    <PlateInsertionNotice project={project} />
);
