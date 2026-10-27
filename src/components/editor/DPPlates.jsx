import React from 'react';
import { getInstallationTypeInfo } from '@/services/UrbanismeDocService';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { resolveDemandeurNames, DEFAULT_BESS_CADRE_4_1 } from '@/services/SmartCerfaService';
import { findBessOdreData } from '@/data/bessOdreMatrix';

const batteryPhotoDefault = '/images/battery_photo.jpg';

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

const LOGO_NELSON = "/logo-nelson.png"; 

export const SafePlateImage = ({ src, alt = '', style = {}, className = '' }) => {
    const finalSrc = getProxiedImageUrl(src);
    if (!finalSrc) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8', fontSize: '7.5pt', textAlign: 'center', padding: '4px', boxSizing: 'border-box', ...style }}>
                <span>{alt || 'Visuel non disponible'}</span>
            </div>
        );
    }

    return (
        <img
            src={finalSrc}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', ...style }}
            className={className}
            loading="eager"
            decoding="sync"
        />
    );
}; 

export const PlateHeader = ({ title, project, showBranding }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;

    const names = resolveDemandeurNames(project);
    let clientFullName = project?.clientFullName || (names.lastName ? `${names.lastName} ${names.firstName}`.trim() : (project?.clientName || project?.name || 'Demandeur'));
    if (isNoBattery && clientFullName.toLowerCase().includes('batterie')) {
        clientFullName = (project?.firstName ? `${project.firstName} ${project?.lastName || ''}`.trim() : '') || project?.clientName || 'Demandeur';
    }

    let bName = project?.buildingName ? project.buildingName.toUpperCase() : '';
    if (isNoBattery && bName) {
        bName = bName.replace(/STATION BATTERIES[^\)]*\)?/gi, isAcama ? 'BÂTIMENT' : (project?.buildingType?.includes('ombriere') ? 'OMBRIÈRE' : 'BÂTIMENT')).trim();
    }
    const cleanTitle = (title || '').trim();
    // Ne jamais doubler le nom du bâtiment
    const finalTitle = bName && !cleanTitle.toUpperCase().includes(bName) 
        ? `${cleanTitle} — ${bName}` 
        : cleanTitle;

    return (
        <div style={HEADER_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={getProxiedImageUrl(LOGO_NELSON)} alt="Nelson" style={{ height: '10.5mm' }} />
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
                <div style={{ fontSize: '12.5pt', fontWeight: 'bold', color: '#00429d' }}>{finalTitle}</div>
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
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;
    const typeInfo = getInstallationTypeInfo(isNoBattery ? 'batiment_solaire' : (installationType || project?.type || 'batiment_solaire'), project?.kwc || project?.projectSize, isNoBattery);
    
    const names = resolveDemandeurNames(project);
    let clientFullName = project?.clientFullName || (names.lastName ? `${names.lastName} ${names.firstName}`.trim() : (project?.clientName || project?.name || 'Demandeur'));
    if (isNoBattery && clientFullName.toLowerCase().includes('batterie')) {
        clientFullName = (project?.firstName ? `${project.firstName} ${project?.lastName || ''}`.trim() : '') || project?.clientName || 'Demandeur';
    }

    return (
        <div style={PAGE_STYLE} id="dp-plate-cover">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', border: '1.5px solid #00429d', padding: '10mm', boxSizing: 'border-box', marginBottom: '5mm' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <img src={getProxiedImageUrl(LOGO_NELSON)} alt="Nelson" style={{ height: '14mm' }} />
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
                            {(() => {
                                const isBat = !isNoBattery && (project?.solutionType === 'battery' || installationType === 'battery' || installationType === 'batterie_standalone') && project?.solutionType !== 'building' && project?.solutionType !== 'ombriere';
                                if (isBat) {
                                    return DEFAULT_BESS_CADRE_4_1;
                                }
                                if (project?.description && !/batterie|bess|stockage d'énergie/i.test(project.description)) {
                                    return project.description;
                                }
                                return (project?.solutionType === 'building' || isNoBattery)
                                    ? `Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque d'une puissance de ${project?.kwc || 100} kWc.`
                                    : `Installation d'une ombrière photovoltaïque en structure métallique d'une puissance de ${project?.kwc || 100} kWc.`;
                            })()}
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
                        <img src={getProxiedImageUrl(captures?.ign || captures?.cadastre || '')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Carte IGN" crossOrigin="anonymous" />
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.25' }}>
                        <div>Vue Aérienne</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(Géoportail / Satellite)</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={getProxiedImageUrl(captures?.satellite || '')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Vue Aérienne" crossOrigin="anonymous" />
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
export const PlateMasse = ({ project, captures, viewNumber = 1 }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;

    const rawBuildings = project?.buildings && Array.isArray(project.buildings) && project.buildings.length > 0
        ? project.buildings
        : [{
            name: isNoBattery ? (isAcama ? 'Bâtiment 1' : 'Ombrière 1') : ((project?.solutionType === 'battery') ? 'Station Batteries Stand-Alone' : (project?.solutionType === 'building' ? 'Bâtiment 1' : 'Ombrière 1')),
            length: Number(project?.longueur || (project?.solutionType === 'battery' ? 6.20 : 30)),
            width: Number(project?.largeur || (project?.solutionType === 'battery' ? 3.20 : 20)),
            masse_capture: captures?.masse_projet || captures?.satellite
        }];

    const isMulti = rawBuildings.length > 1;

    return (
        <div style={PAGE_STYLE} id={`dp-plate-masse${viewNumber === 2 ? '-vue2' : ''}`}>
            <PlateHeader 
                title={viewNumber === 2 
                    ? "DP2 — PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS (Vue 2 — Zoom étendu — Coté dans les 3 dimensions — Art. R. 431-36 b)" 
                    : "DP2 — PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS (Coté dans les 3 dimensions — Art. R. 431-36 b)"} 
                project={project} 
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                {isMulti ? (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rawBuildings.length, 2)}, 1fr)`, gap: '4mm', flex: 1, height: '100%' }}>
                        {rawBuildings.map((b, idx) => {
                            const bPhoto = (viewNumber === 2 
                                ? (b?.masse_capture_2 || captures?.masse_projet_2 || project?.masse_capture_2 || project?.urbanisme_captures?.masse_projet_2) 
                                : (b?.masse_capture || (idx === 0 ? captures?.masse_projet : null) || project?.masse_capture || project?.urbanisme_captures?.masse_projet)) 
                                || (viewNumber === 2 ? '' : captures?.satellite);
                            let bLen = Number(b.length || (b.bayCount || 5) * (b.baySpacing || 7.5) || project?.longueur || 30);
                            let bW = Number(b.totalWidth || b.width || project?.largeur || 20);
                            if (isNoBattery && (bW <= 6.0 || bLen <= 6.0)) {
                                bLen = Math.max(bLen, 30);
                                bW = Math.max(bW, 15);
                            }
                            const bArea = Math.round(bLen * bW);
                            const isBatB = !isNoBattery && (b.solutionType === 'battery' || (project?.solutionType === 'battery' && project?.solutionType !== 'building' && project?.solutionType !== 'ombriere'));
                            let bDisplayName = b.name || (isAcama ? `Bâtiment ${idx + 1}` : (isBatB ? 'Station Batteries Stand-Alone' : (project?.solutionType === 'building' ? `Bâtiment ${idx + 1}` : `Ombrière ${idx + 1}`)));
                            if (isNoBattery || project?.solutionType === 'building') {
                                bDisplayName = bDisplayName.replace(/Station Batteries[^\)]*\)?/gi, 'Bâtiment');
                            }
                            if (!isBatB) {
                                const targetLabel = (isAcama || project?.solutionType === 'building') ? 'Bâtiment' : 'Ombrière';
                                bDisplayName = bDisplayName
                                    .replace(/Bâtiment/gi, targetLabel)
                                    .replace(/Ombrière/gi, targetLabel)
                                    .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
                                    .trim();
                            }
                            if (!bDisplayName) bDisplayName = isBatB ? 'Station Batteries Stand-Alone' : ((isAcama || project?.solutionType === 'building') ? `Bâtiment ${idx + 1}` : `Ombrière ${idx + 1}`);

                            const bZoomRaw = (viewNumber === 2 
                                ? (b?.masse_zoom_2 || captures?.masse_zoom_2 || project?.masse_zoom_2 || project?.urbanisme_captures?.masse_zoom_2 || captures?.masse_zoom || 16) 
                                : (b?.masse_zoom || (idx === 0 ? captures?.masse_zoom : null) || project?.masse_zoom || project?.urbanisme_captures?.masse_zoom || 18));
                            const bZoom = bZoomRaw;
                            const bRidge = Number(b.ridgeHeight || project?.hauteur_faitage || 6.2);
                            const bEave = Number(b.eaveHeight || project?.hauteur_egout || 4.5);

                            return (
                                <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '3mm', background: '#f8fafc', padding: '2mm', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                        <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                            DP2 — Plan de Masse{viewNumber === 2 ? ' (Vue 2)' : ''} : {bDisplayName} (OpenStreetMap Zoom {bZoom})
                                        </span>
                                        <span style={{ fontSize: '7pt', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '0.5mm 1.5mm', borderRadius: '2mm' }}>
                                            {bLen.toFixed(1)}m × {bW.toFixed(1)}m ({bArea} m²)
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '2mm', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={getProxiedImageUrl(bPhoto || '')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan de masse" crossOrigin="anonymous" />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2mm', padding: '1mm 1.5mm', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.5mm', fontSize: '6.5pt', color: '#334155' }}>
                                        <div style={{ display: 'flex', gap: '2.5mm', flexWrap: 'wrap' }}>
                                            <span><strong>Cotation 3D :</strong> L={bLen.toFixed(1)}m × l={bW.toFixed(1)}m</span>
                                            <span><strong>Altimétrie :</strong> {isBatB ? `Hauteur max +${bEave.toFixed(2)}m (Dalle +0.15m / TN 0.00m)` : `Faîtage +${bRidge.toFixed(2)}m / Sablière +${bEave.toFixed(2)}m (TN 0.00m)`}</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Nord ↑ | Cotes d'implantation</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (() => {
                    const b = rawBuildings[0];
                    const bPhoto = (viewNumber === 2 
                        ? (b?.masse_capture_2 || captures?.masse_projet_2 || project?.masse_capture_2 || project?.urbanisme_captures?.masse_projet_2) 
                        : (b?.masse_capture || captures?.masse_projet || project?.masse_capture || project?.urbanisme_captures?.masse_projet)) 
                        || (viewNumber === 2 ? '' : captures?.satellite);
                    let bLen = Number(b?.length || (b?.bayCount || 5) * (b?.baySpacing || 7.5) || project?.longueur || 30);
                    let bW = Number(b?.totalWidth || b?.width || project?.largeur || 20);
                    if (isNoBattery && (bW <= 6.0 || bLen <= 6.0)) {
                        bLen = Math.max(bLen, 30);
                        bW = Math.max(bW, 15);
                    }
                    const bArea = Math.round(bLen * bW);
                    const isBatB = !isNoBattery && (b?.solutionType === 'battery' || (project?.solutionType === 'battery' && project?.solutionType !== 'building' && project?.solutionType !== 'ombriere'));
                    let bDisplayName = b?.name || (isAcama ? 'Bâtiment 1' : (isBatB ? 'Station Batteries Stand-Alone' : (project?.solutionType === 'building' ? 'Bâtiment 1' : 'Ombrière 1')));
                    if (isNoBattery || project?.solutionType === 'building') {
                        bDisplayName = bDisplayName.replace(/Station Batteries[^\)]*\)?/gi, 'Bâtiment');
                    }
                    if (!isBatB) {
                        const targetLabel = (isAcama || project?.solutionType === 'building') ? 'Bâtiment' : 'Ombrière';
                        bDisplayName = bDisplayName
                            .replace(/Bâtiment/gi, targetLabel)
                            .replace(/Ombrière/gi, targetLabel)
                            .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
                            .trim();
                    }
                    if (!bDisplayName) bDisplayName = isBatB ? 'Station Batteries Stand-Alone' : ((isAcama || project?.solutionType === 'building') ? 'Bâtiment 1' : 'Ombrière 1');

                    const bZoomRaw = (viewNumber === 2 
                        ? (b?.masse_zoom_2 || captures?.masse_zoom_2 || project?.masse_zoom_2 || project?.urbanisme_captures?.masse_zoom_2 || captures?.masse_zoom || 16) 
                        : (b?.masse_zoom || captures?.masse_zoom || project?.masse_zoom || project?.urbanisme_captures?.masse_zoom || 18));
                    const bZoom = bZoomRaw;
                    const bRidge = Number(b?.ridgeHeight || project?.hauteur_faitage || 6.2);
                    const bEave = Number(b?.eaveHeight || project?.hauteur_egout || 4.5);

                    return (
                        <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '2mm' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                    DP2 — Plan de Masse{viewNumber === 2 ? ' (Vue 2)' : ''} : {bDisplayName} (OpenStreetMap Zoom {bZoom})
                                </span>
                                <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '0.5mm 2mm', borderRadius: '2mm' }}>
                                    {bLen.toFixed(1)}m × {bW.toFixed(1)}m ({bArea} m²)
                                </span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '2mm', background: '#ffffff' }}>
                                <img src={getProxiedImageUrl(bPhoto || '')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan de masse" crossOrigin="anonymous" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5mm', padding: '1.2mm 2.5mm', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '1.5mm', fontSize: '7.2pt', color: '#334155' }}>
                                <div style={{ display: 'flex', gap: '3.5mm' }}>
                                    <span><strong>1. Longueur :</strong> {bLen.toFixed(1)} m</span>
                                    <span><strong>2. Largeur :</strong> {bW.toFixed(1)} m (Emprise : {bArea} m²)</span>
                                    <span><strong>3. Altimétrie :</strong> {isBatB ? `Hauteur max +${bEave.toFixed(2)} m (Dalle +0.15m / TN 0.00m)` : `Faîtage +${bRidge.toFixed(2)} m | Sablière +${bEave.toFixed(2)} m (TN = 0.00 m)`}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '3mm', fontWeight: 'bold' }}>
                                    <span style={{ color: '#0f172a' }}>Orientation : N ↑</span>
                                    <span style={{ color: '#dc2626' }}>Cotes de recul & d'implantation aux limites</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * COMPOSANT ATOMIQUE : BOÎTE PLAN EN COUPE TRANSVERSALE SVG
 */
export const CoupeBox = ({ project, coupeLetter = "AA'", isMulti = false, boxHeight = '62mm' }) => {
    // Détection stricte du type d'ouvrage
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;

    let longueur = project?.longueur || project?.length || '30.0';
    let largeur = parseFloat(project?.largeur || project?.width || 20.0);
    let hauteurEgout = parseFloat(project?.hauteur_egout || project?.eaveHeight || 4.0);
    let pente = parseFloat(project?.pente || project?.roofPitch || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);

    if (isNoBattery || project?.solutionType === 'building') {
        if (largeur <= 6.0) largeur = 16.4;
        if (parseFloat(longueur) <= 6.0) longueur = '30.0';
        if (hauteurEgout <= 2.6) hauteurEgout = 4.0;
        if (pente === 0) pente = 10;
    }
    
    let rawType = (project?.buildingType || '').toLowerCase();
    if ((isNoBattery || project?.solutionType === 'building') && (rawType.includes('battery') || rawType.includes('batterie') || rawType === 'battery_standalone')) {
        rawType = isAcama ? 'symetrique' : 'asymetrique_1';
    }
    const isBattery = !isNoBattery && (
        project?.solutionType === 'battery' ||
        (
            project?.solutionType !== 'building' &&
            project?.solutionType !== 'ombriere' &&
            (rawType.includes('battery') || rawType.includes('batterie') || Boolean(project?.isBattery) || (project?.isBatteryStandAlone === 'Oui') || (project?.type || '').toLowerCase().includes('batterie'))
        )
    );
    
    if (isBattery) {
        const bQty = 4;
        const bLen = Number(project?.batteryStorage?.dalleLength || project?.longueur || 6.20);
        const bModel = project?.battery_model || project?.batteryStorage?.model || 'CESC Mercury 261';
        const bPower = Number(project?.kwc || project?.puissance || project?.batteryStorage?.powerKw || 500);

        return (
            <div style={{ height: boxHeight, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: isMulti ? '1mm 3.5mm' : '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                    <span style={{ fontSize: isMulti ? '8pt' : '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                        DP3 — COUPE DE TERRAIN &amp; DES INSTALLATIONS (COUPE TRANSVERSALE {coupeLetter}) — CENTRALE DE STOCKAGE BATTERIES
                    </span>
                    <span style={{ fontSize: isMulti ? '6.5pt' : '7pt', color: '#64748b' }}>
                        4× {bModel} ({bPower} kW / 1 044 kWh) • Dalle 6.20m × 3.20m • Échelle indicative
                    </span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <svg viewBox="0 0 700 165" style={{ width: '100%', height: '100%', maxHeight: '160px' }}>
                        <defs>
                            <linearGradient id="c-bat-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#334155" />
                                <stop offset="100%" stopColor="#1e293b" />
                            </linearGradient>
                            <pattern id="c-mesh-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
                                <path d="M 0 6 L 6 0 M 0 0 L 6 6" fill="none" stroke="#2d6a4f" strokeWidth="0.6" opacity="0.6" />
                            </pattern>
                        </defs>
                        {/* Sol TN */}
                        <line x1="20" y1="130" x2="680" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
                        <text x="30" y="142" fill="#64748b" fontSize="6.5" fontStyle="italic">Terrain Naturel TN ±0.00</text>
                        <text x="670" y="142" textAnchor="end" fill="#64748b" fontSize="6.5" fontStyle="italic">Terrain plat conservé</text>

                        {/* Dalle béton armé étanche 6.20m (+0.15m) */}
                        <rect x="145" y="122" width="410" height="8" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />
                        <text x="350" y="128" textAnchor="middle" fill="#1e293b" fontSize="5.5" fontWeight="bold">Dalle béton armé étanche 6,20 m avec bac de rétention (+0,15 m / TN)</text>

                        {/* 4 Armoires CESC Mercury 261 */}
                        {[0, 1, 2, 3].map((idx) => {
                            const cw = 65;
                            const cx = 175 + idx * (cw + 16);
                            return (
                                <g key={idx}>
                                    <rect x={cx} y="55" width={cw} height="67" fill="url(#c-bat-grad)" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
                                    <rect x={cx + 3} y="51" width={cw - 6} height="4" fill="#0f172a" stroke="#0f172a" strokeWidth="0.8" rx="0.8" />
                                    <line x1={cx + cw / 2} y1="55" x2={cx + cw / 2} y2="122" stroke="#475569" strokeWidth="0.8" />
                                    <rect x={cx + cw / 2 - 12} y="62" width="24" height="10" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" rx="0.8" />
                                    <circle cx={cx + cw / 2 - 5} cy="76" r="1.5" fill="#22c55e" />
                                    <circle cx={cx + cw / 2} cy="76" r="1.5" fill="#facc15" />
                                    <circle cx={cx + cw / 2 + 5} cy="76" r="1.5" fill="#ef4444" />
                                    <rect x={cx + 6} y="85" width="23" height="20" fill="#0f172a" rx="0.5" opacity="0.8" />
                                    <rect x={cx + 36} y="85" width="23" height="20" fill="#0f172a" rx="0.5" opacity="0.8" />
                                    <text x={cx + cw / 2} y="116" textAnchor="middle" fill="#93c5fd" fontSize="5.5" fontWeight="bold">BESS #{idx + 1}</text>
                                </g>
                            );
                        })}

                        {/* Poste de raccordement HTA */}
                        <rect x="502" y="65" width="36" height="57" fill="#e2e8f0" stroke="#475569" strokeWidth="1" rx="1" />
                        <text x="520" y="98" textAnchor="middle" fill="#0f172a" fontSize="6" fontWeight="bold">HTA</text>

                        {/* Clôture grillagée thermolaquée verte RAL 6005 (H 2.00m) */}
                        <rect x="125" y="68" width="450" height="62" fill="url(#c-mesh-pattern)" stroke="#1b4332" strokeWidth="1" />
                        <line x1="125" y1="68" x2="125" y2="130" stroke="#1b4332" strokeWidth="2.5" />
                        <line x1="237" y1="68" x2="237" y2="130" stroke="#1b4332" strokeWidth="1.5" />
                        <line x1="350" y1="68" x2="350" y2="130" stroke="#1b4332" strokeWidth="1.5" />
                        <line x1="462" y1="68" x2="462" y2="130" stroke="#1b4332" strokeWidth="1.5" />
                        <line x1="575" y1="68" x2="575" y2="130" stroke="#1b4332" strokeWidth="2.5" />
                        <text x="120" y="98" textAnchor="end" fill="#1b4332" fontSize="6.2" fontWeight="bold">Clôture RAL 6005 (2.00m)</text>

                        {/* Cotes de Hauteur BESS (2.38m) */}
                        <line x1="155" y1="51" x2="155" y2="130" stroke="#ef4444" strokeWidth="0.8" />
                        <line x1="151" y1="51" x2="159" y2="51" stroke="#ef4444" strokeWidth="0.8" />
                        <line x1="151" y1="130" x2="159" y2="130" stroke="#ef4444" strokeWidth="0.8" />
                        <text x="147" y="93" textAnchor="end" fill="#ef4444" fontSize="6.8" fontWeight="bold">H : 2.38m</text>

                        {/* Cotes de Longueur Dalle (6.20m) */}
                        <line x1="145" y1="148" x2="555" y2="148" stroke="#2563eb" strokeWidth="0.8" />
                        <line x1="145" y1="144" x2="145" y2="152" stroke="#2563eb" strokeWidth="0.8" />
                        <line x1="555" y1="144" x2="555" y2="152" stroke="#2563eb" strokeWidth="0.8" />
                        <text x="350" y="156" textAnchor="middle" fill="#2563eb" fontSize="7" fontWeight="bold">Longueur dalle : 6.20m (Largeur : 3.20m)</text>
                    </svg>
                </div>
            </div>
        );
    }

    const isOmbriere = !isAcama && (rawType.startsWith('ombriere') || rawType.includes('ombriere') || rawType.includes('ombrière'));
    const isPL = isOmbriere && (rawType.includes('ombriere_pl') || (rawType.includes('pl') && !rawType.includes('simple')) || largeur >= 13.0);
    const isSimple = isOmbriere && !isPL && (rawType.includes('simple') || largeur <= 7.5);
    const isDouble = isOmbriere && !isPL && !isSimple;
    const isMonopente = !isOmbriere && rawType.includes('monopente');
    const isSym = !isOmbriere && rawType.includes('symetrique') && !rawType.includes('asym');
    const isAsym2 = !isOmbriere && (rawType.includes('asymetrique_2') || (!isSym && (Math.abs(largeur - 25.5) < 0.8 || Math.abs(largeur - 29.1) < 0.8)));
    const isAsym1 = !isOmbriere && !isMonopente && !isSym && !isAsym2;
    const isAsym = isAsym1 || isAsym2;

    const hasAppentisLeft = project?.leftSide === 'appentis';
    const hasAuventLeft = !hasAppentisLeft && (project?.leftSide === 'auvent' || Boolean(project?.auvent && project?.auvent !== 'none' && project?.auvent !== false));
    const hasExtLeft = hasAuventLeft || hasAppentisLeft;

    const hasAppentisRight = project?.rightSide === 'appentis' || (!project?.rightSide && Boolean(project?.appentis && project?.appentis !== 'none' && project?.appentis !== false));
    const hasAuventRight = !hasAppentisRight && (project?.rightSide === 'auvent' || (!project?.rightSide && Boolean(project?.auvent && project?.auvent !== 'none' && project?.auvent !== false)));
    const hasExtRight = hasAuventRight || hasAppentisRight;

    const extRightWidth = hasAppentisRight ? ((Number(project?.rightWidth) && Number(project?.rightWidth) > 5) ? Number(project.rightWidth) : 9.3) : (hasAuventRight ? (Number(project?.rightWidth) || 4.0) : 0);
    const extLeftWidth = hasAppentisLeft ? ((Number(project?.leftWidth) && Number(project?.leftWidth) > 5) ? Number(project.leftWidth) : 9.3) : (hasAuventLeft ? (Number(project?.leftWidth) || 4.0) : 0);

    let rightEaveHeight = 4.00;
    let ridgeHeight = 7.40;
    let leftEaveHeight = 6.40;
    let clearanceHeight = 2.20;
    let effectivePitch = pente || 10;
    let realRoofWidth = largeur;
    let realGroundWidth = largeur;
    let massifWidth = 1.70;
    let massifHeight = 0.35;

    if (isOmbriere) {
        effectivePitch = pente || 10;
        if (isPL) {
            if (largeur > 22.0) { realRoofWidth = 25.03; realGroundWidth = 24.65; leftEaveHeight = 9.35; ridgeHeight = 9.35; rightEaveHeight = 5.00; clearanceHeight = 3.38; }
            else if (largeur > 18.0) { realRoofWidth = 20.53; realGroundWidth = 20.22; leftEaveHeight = 9.29; ridgeHeight = 9.29; rightEaveHeight = 5.73; clearanceHeight = 3.38; }
            else { realRoofWidth = 16.03; realGroundWidth = 15.79; leftEaveHeight = 7.86; ridgeHeight = 7.86; rightEaveHeight = 5.08; clearanceHeight = 3.38; }
        } else if (isSimple) {
            realRoofWidth = (largeur >= 6.0 || Math.abs(largeur - 6.9) < 0.5) ? 6.90 : (largeur > 0 ? largeur : 5.20);
            realGroundWidth = realRoofWidth;
            leftEaveHeight = Number(project?.ridgeHeight || 4.10); ridgeHeight = leftEaveHeight; rightEaveHeight = Number(project?.eaveHeight || 2.90); clearanceHeight = 2.40; massifWidth = 1.30;
        } else {
            if (largeur > 10.0 || Math.abs(largeur - 11.3) < 1.0) { realRoofWidth = 11.53; realGroundWidth = 11.35; leftEaveHeight = 4.74; ridgeHeight = 5.11; rightEaveHeight = 2.80; clearanceHeight = 2.20; }
            else { realRoofWidth = 9.28; realGroundWidth = 9.14; leftEaveHeight = 4.61; ridgeHeight = 4.89; rightEaveHeight = 3.00; clearanceHeight = 3.00; }
        }
    } else if (isMonopente) {
        effectivePitch = pente || 15; rightEaveHeight = hauteurEgout || 4.00; ridgeHeight = rightEaveHeight + largeur * Math.tan(effectivePitch * Math.PI / 180); leftEaveHeight = ridgeHeight; realRoofWidth = largeur; realGroundWidth = largeur;
    } else if (isSym) {
        effectivePitch = pente || 10; leftEaveHeight = hauteurEgout || 5.50; rightEaveHeight = leftEaveHeight; ridgeHeight = leftEaveHeight + ((largeur / 2) * Math.tan(effectivePitch * Math.PI / 180)); realRoofWidth = largeur; realGroundWidth = largeur;
    } else if (isAsym2) {
        effectivePitch = pente || 10; rightEaveHeight = (hauteurEgout && hauteurEgout <= 4.5) ? hauteurEgout : 4.00;
        ridgeHeight = (Math.abs(largeur - 25.5) < 0.8) ? 8.90 : (Math.abs(largeur - 29.1) < 0.8 ? 9.80 : (rightEaveHeight + (largeur * 0.75 * Math.tan(effectivePitch * Math.PI / 180))));
        leftEaveHeight = (Math.abs(largeur - 25.5) < 0.8) ? 6.90 : (Math.abs(largeur - 29.1) < 0.8 ? 7.90 : (ridgeHeight - (largeur * 0.25 * Math.tan(effectivePitch * Math.PI / 180))));
        realRoofWidth = largeur; realGroundWidth = largeur;
    } else {
        // asymetrique_1 (Standard Hangar Asymétrique 1 zone)
        effectivePitch = pente || 15; rightEaveHeight = (hauteurEgout && hauteurEgout <= 4.5) ? hauteurEgout : 4.00;
        ridgeHeight = (Math.abs(largeur - 20.0) < 0.5) ? 8.40 : ((Math.abs(largeur - 16.4) < 0.5 || Math.abs(largeur - 16.0) < 0.5) ? 7.40 : (rightEaveHeight + (largeur * 0.75 * Math.tan(effectivePitch * Math.PI / 180))));
        leftEaveHeight = (Math.abs(largeur - 20.0) < 0.5) ? 7.40 : ((Math.abs(largeur - 16.4) < 0.5 || Math.abs(largeur - 16.0) < 0.5) ? 6.40 : (ridgeHeight - (largeur * 0.25 * Math.tan(effectivePitch * Math.PI / 180))));
        realRoofWidth = largeur; realGroundWidth = largeur;
    }

    const totalRealWidth = isOmbriere ? realRoofWidth : ((hasExtLeft ? extLeftWidth : 0) + largeur + (hasExtRight ? extRightWidth : 0));
    const maxRealHeight = Math.max(ridgeHeight, leftEaveHeight, rightEaveHeight) + 1.2;
    const availableDrawingWidth = 500;
    const availableDrawingHeight = isMulti ? 95 : 110;
    const pxPerM = Math.min(availableDrawingWidth / Math.max(8, totalRealWidth), availableDrawingHeight / Math.max(4.0, maxRealHeight), 22);

    const mainWidthSvg = (isOmbriere ? realRoofWidth : largeur) * pxPerM;
    const extLeftSvgWidth = (hasExtLeft ? extLeftWidth : 0) * pxPerM;
    const extRightSvgWidth = (hasExtRight ? extRightWidth : 0) * pxPerM;
    const totalSvgWidth = extLeftSvgWidth + mainWidthSvg + extRightSvgWidth;
    const startSvgX = Math.round((680 - totalSvgWidth) / 2);
    const mainLeftSvgX = startSvgX + extLeftSvgWidth;
    const mainRightSvgX = mainLeftSvgX + mainWidthSvg;
    const extLeftSvgX = startSvgX;
    const extRightSvgX = mainRightSvgX + extRightSvgWidth;
    const centerX = (mainLeftSvgX + mainRightSvgX) / 2;
    const apexSvgX = isOmbriere ? mainLeftSvgX : (isAsym ? (mainLeftSvgX + largeur * 0.25 * pxPerM) : (mainLeftSvgX + mainWidthSvg * 0.5));
    const groundY = isMulti ? 138 : 142;
    const groundYLeft = groundY + Math.sin((terrainSlopeDeg * Math.PI) / 180) * (totalSvgWidth * 0.2);
    const groundYRight = groundY - Math.sin((terrainSlopeDeg * Math.PI) / 180) * (totalSvgWidth * 0.2);
    const apexSvgY = groundY - ridgeHeight * pxPerM;
    const leftEaveSvgY = groundY - leftEaveHeight * pxPerM;
    const rightEaveSvgY = groundY - rightEaveHeight * pxPerM;
    const clearanceSvgY = groundY - clearanceHeight * pxPerM;
    const rightSlopeSvg = (mainRightSvgX > apexSvgX) ? (rightEaveSvgY - apexSvgY) / (mainRightSvgX - apexSvgX) : Math.tan((effectivePitch * Math.PI) / 180) * 0.6;
    const leftSlopeSvg = (apexSvgX > mainLeftSvgX) ? (leftEaveSvgY - apexSvgY) / (apexSvgX - mainLeftSvgX) : Math.tan((effectivePitch * Math.PI) / 180) * 0.6;
    const extRightSvgY = rightEaveSvgY + (extRightSvgX - mainRightSvgX) * rightSlopeSvg;
    const extLeftSvgY = leftEaveSvgY + (mainLeftSvgX - extLeftSvgX) * leftSlopeSvg;

    const scaleTotalWidth = 10 * pxPerM;
    const scaleSegWidth = 2 * pxPerM;
    const scaleStartX = 660 - scaleTotalWidth;
    const scaleY = 172;

    const asym2LeftDist = 13.1;
    const asym2RightDist = (Math.abs(largeur - 25.5) < 0.8) ? 12.4 : (Math.abs(largeur - 29.1) < 0.8 ? 16.0 : (largeur - 13.1));
    const middleColSvgX = mainLeftSvgX + asym2LeftDist * pxPerM;
    const middleColTopY = apexSvgY + (rightEaveSvgY - apexSvgY) * ((middleColSvgX - apexSvgX) / (mainRightSvgX - apexSvgX));

    const displayPitch = effectivePitch;
    let extRightHeight = hasAppentisRight ? 3.90 : Math.max(2.4, rightEaveHeight - extRightWidth * Math.tan((effectivePitch * Math.PI) / 180));
    let extLeftHeight = hasAppentisLeft ? 3.90 : Math.max(2.4, leftEaveHeight - extLeftWidth * Math.tan((effectivePitch * Math.PI) / 180));
    if (hasAuventLeft) {
        if (isAsym2 && Math.abs(largeur - 25.5) < 0.8) extLeftHeight = 5.90;
        else if (isAsym2 && Math.abs(largeur - 29.1) < 0.8) extLeftHeight = 6.90;
        else if (isAsym1 && Math.abs(largeur - 20.0) < 0.5) extLeftHeight = 6.40;
        else if (isAsym1 && Math.abs(largeur - 16.4) < 0.5) extLeftHeight = 5.40;
    }
    if (hasAuventRight) {
        if (isAsym2 && Math.abs(largeur - 25.5) < 0.8) extRightHeight = 3.30;
        else if (isAsym2 && Math.abs(largeur - 29.1) < 0.8) extRightHeight = 3.30;
    }

    const roofTypeLabel = (isOmbriere && !(isDouble || isAsym || isSym)) ? 'monopente (ombrière VL/PL)' : isAsym ? (isAsym2 ? 'double pente asymétrique 2 zones' : 'double pente asymétrique') : isSym ? 'double pente symétrique' : 'photovoltaïque';

    const coupeSvgContent = (
        <svg width="680" height="186" viewBox="0 0 680 186" style={{ width: '100%', height: '100%', maxHeight: isMulti ? '50mm' : '85mm' }}>
            {/* Badges d'Orientation NORD / SUD */}
            <rect x="70" y="6" width="44" height="14" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.2" />
            <text x="92" y="16" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">NORD</text>

            <rect x="585" y="6" width="38" height="14" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.2" />
            <text x="604" y="16" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">SUD</text>

            {/* 1. Ligne de Terrain Naturel (TN) */}
            <line x1="20" y1={groundYLeft} x2="660" y2={groundYRight} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 3" />
            <text x="35" y={groundYLeft + 11} fill="#64748b" fontSize="7.5" fontStyle="italic">Terrain naturel conservé (TN Aval) ±0.00</text>
            <text x="655" y={groundYRight - 4} textAnchor="end" fill="#64748b" fontSize="7.5" fontStyle="italic">TN Amont</text>

            {/* 2. Dessin selon la typologie */}
            {isOmbriere ? (
                isDouble ? (
                    /* ── OMBRIÈRE DOUBLE VL (Structure en V - Modèles O4 / O5) ── */
                    (() => {
                        const mWidth = massifWidth * pxPerM;
                        const mHeight = massifHeight * pxPerM;
                        const mX = centerX - mWidth / 2;
                        const mY = groundY - mHeight;
                        const footLeftX = centerX - mWidth * 0.36;
                        const footRightX = centerX + mWidth * 0.36;
                        const postLeftTopX = centerX - mainWidthSvg * 0.22;
                        const postLeftTopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.28;
                        const postRightTopX = centerX + mainWidthSvg * 0.22;
                        const postRightTopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.72;
                        
                        const tLeftX = footLeftX + (postLeftTopX - footLeftX) * ((mY - clearanceSvgY) / (mY - postLeftTopY));
                        const tRightX = footRightX + (postRightTopX - footRightX) * ((mY - clearanceSvgY) / (mY - postRightTopY));

                        return (
                            <g>
                                {/* Massif béton et semelle */}
                                <rect x={mX} y={mY} width={mWidth} height={mHeight} fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
                                <pattern id="dp-beton-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
                                    <path d="M 0 6 L 6 0 M 0 0 L 6 6" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                                </pattern>
                                <rect x={mX} y={mY} width={mWidth} height={mHeight} fill="url(#dp-beton-pattern)" opacity="0.4" />
                                <text x={centerX} y={mY + mHeight / 2 + 3} textAnchor="middle" fill="#475569" fontSize="6.5" fontWeight="bold">Massif Béton Armé</text>

                                {/* Poteaux obliques en V (profils IPE / HEA acier galvanisé) */}
                                <line x1={footLeftX} y1={mY} x2={postLeftTopX} y2={postLeftTopY} stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
                                <line x1={footRightX} y1={mY} x2={postRightTopX} y2={postRightTopY} stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />

                                {/* Traverse horizontale métallique */}
                                <line x1={tLeftX} y1={clearanceSvgY} x2={tRightX} y2={clearanceSvgY} stroke="#334155" strokeWidth="3" />

                                {/* Croix de Saint-André entre poteaux obliques */}
                                <line x1={footLeftX} y1={mY} x2={tRightX} y2={clearanceSvgY} stroke="#64748b" strokeWidth="1.5" />
                                <line x1={footRightX} y1={mY} x2={tLeftX} y2={clearanceSvgY} stroke="#64748b" strokeWidth="1.5" />

                                {/* Pannes et couverture photovoltaïque continue (bleu solaire) */}
                                <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
                                <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="10 3" />

                                {/* Cote de Hauteur Libre sous traverse */}
                                <line x1={centerX} y1={clearanceSvgY} x2={centerX} y2={groundY} stroke="#059669" strokeWidth="1" strokeDasharray="2 1.5" />
                                <line x1={centerX - 4} y1={clearanceSvgY} x2={centerX + 4} y2={clearanceSvgY} stroke="#059669" strokeWidth="1" />
                                <line x1={centerX - 4} y1={groundY} x2={centerX + 4} y2={groundY} stroke="#059669" strokeWidth="1" />
                                <text x={centerX + 6} y={clearanceSvgY + (groundY - clearanceSvgY) / 2 + 2.5} fill="#059669" fontSize="7" fontWeight="bold">
                                    Passage libre : {clearanceHeight.toFixed(2)}m
                                </text>

                                {/* Cote Toiture supérieure */}
                                <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 9} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 9} stroke="#2563eb" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 13} x2={mainLeftSvgX - 8} y2={leftEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                <line x1={mainRightSvgX + 8} y1={rightEaveSvgY - 13} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                <text x={centerX} y={(leftEaveSvgY + rightEaveSvgY) / 2 - 12} textAnchor="middle" fill="#1e40af" fontSize="7.5" fontWeight="bold">
                                    Toiture : {realRoofWidth.toFixed(2)}m
                                </text>
                            </g>
                        );
                    })()
                ) : isPL ? (
                    /* ── OMBRIÈRE PL (Structure avec 2 poteaux verticaux et Croix de Saint-André complète - Modèles O7 / O9 / O11) ── */
                    (() => {
                        const postSpacingM = largeur > 22.0 ? 12.00 : (largeur > 18.0 ? 10.00 : 8.00);
                        const overhangM = (realGroundWidth - postSpacingM) / 2;

                        const p1X = mainLeftSvgX + overhangM * pxPerM;
                        const p2X = mainLeftSvgX + (overhangM + postSpacingM) * pxPerM;

                        const p1Ratio = overhangM / realGroundWidth;
                        const p2Ratio = (overhangM + postSpacingM) / realGroundWidth;

                        const p1TopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * p1Ratio;
                        const p2TopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * p2Ratio;

                        const midPostsX = (p1X + p2X) / 2;

                        return (
                            <g>
                                {/* Massifs / Semelles béton sous chaque poteau */}
                                <rect x={p1X - 10} y={groundY - 5} width="20" height="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />
                                <rect x={p2X - 10} y={groundY - 5} width="20" height="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />

                                {/* Poteaux verticaux */}
                                <line x1={p1X} y1={groundY - 5} x2={p1X} y2={p1TopY} stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
                                <line x1={p2X} y1={groundY - 5} x2={p2X} y2={p2TopY} stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />

                                {/* Traverse horizontale à 3.38m de passage libre */}
                                <line x1={p1X} y1={clearanceSvgY} x2={p2X} y2={clearanceSvgY} stroke="#334155" strokeWidth="3" />

                                {/* Croix de Saint-André d'un poteau à l'autre */}
                                <line x1={p1X} y1={groundY - 5} x2={p2X} y2={p2TopY} stroke="#475569" strokeWidth="1.8" />
                                <line x1={p2X} y1={groundY - 5} x2={p1X} y2={p1TopY} stroke="#475569" strokeWidth="1.8" />
                                <circle cx={midPostsX} cy={clearanceSvgY} r="3" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />

                                {/* Couverture photovoltaïque continue (bleu solaire) */}
                                <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
                                <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="10 3" />

                                {/* Passage libre (3.38m) */}
                                <line x1={midPostsX} y1={clearanceSvgY} x2={midPostsX} y2={groundY} stroke="#059669" strokeWidth="1" strokeDasharray="2 1.5" />
                                <line x1={midPostsX - 4} y1={clearanceSvgY} x2={midPostsX + 4} y2={clearanceSvgY} stroke="#059669" strokeWidth="1" />
                                <line x1={midPostsX - 4} y1={groundY} x2={midPostsX + 4} y2={groundY} stroke="#059669" strokeWidth="1" />
                                <text x={midPostsX + 6} y={clearanceSvgY + (groundY - clearanceSvgY) / 2 + 2.5} fill="#059669" fontSize="7" fontWeight="bold">
                                    Passage libre : {clearanceHeight.toFixed(2)}m
                                </text>

                                {/* Cotes de répartition au sol : Porte-à-faux G / Entraxe / Porte-à-faux D */}
                                <line x1={mainLeftSvgX} y1={groundY + 11} x2={p1X} y2={groundY + 11} stroke="#0284c7" strokeWidth="0.8" />
                                <line x1={mainLeftSvgX} y1={groundY + 8} x2={mainLeftSvgX} y2={groundY + 14} stroke="#0284c7" strokeWidth="0.8" />
                                <line x1={p1X} y1={groundY + 8} x2={p1X} y2={groundY + 14} stroke="#0284c7" strokeWidth="0.8" />
                                <text x={(mainLeftSvgX + p1X) / 2} y={groundY + 9} textAnchor="middle" fill="#0284c7" fontSize="5.8" fontWeight="bold">
                                    {overhangM.toFixed(2)}m
                                </text>

                                <line x1={p1X} y1={groundY + 11} x2={p2X} y2={groundY + 11} stroke="#0284c7" strokeWidth="0.8" />
                                <line x1={p2X} y1={groundY + 8} x2={p2X} y2={groundY + 14} stroke="#0284c7" strokeWidth="0.8" />
                                <text x={midPostsX} y={groundY + 9} textAnchor="middle" fill="#0284c7" fontSize="6.2" fontWeight="bold">
                                    {postSpacingM.toFixed(2)}m
                                </text>

                                <line x1={p2X} y1={groundY + 11} x2={mainRightSvgX} y2={groundY + 11} stroke="#0284c7" strokeWidth="0.8" />
                                <line x1={mainRightSvgX} y1={groundY + 8} x2={mainRightSvgX} y2={groundY + 14} stroke="#0284c7" strokeWidth="0.8" />
                                <text x={(p2X + mainRightSvgX) / 2} y={groundY + 9} textAnchor="middle" fill="#0284c7" fontSize="5.8" fontWeight="bold">
                                    {overhangM.toFixed(2)}m
                                </text>

                                {/* Cote Toiture supérieure */}
                                <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 9} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 9} stroke="#2563eb" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 13} x2={mainLeftSvgX - 8} y2={leftEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                <line x1={mainRightSvgX + 8} y1={rightEaveSvgY - 13} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                <text x={centerX} y={(leftEaveSvgY + rightEaveSvgY) / 2 - 12} textAnchor="middle" fill="#1e40af" fontSize="7.5" fontWeight="bold">
                                    Toiture : {realRoofWidth.toFixed(2)}m
                                </text>
                            </g>
                        );
                    })()
                ) : (
                    /* ── OMBRIÈRE SIMPLE VL (Poteau avec bracons obliques et toiture solaire) ── */
                    (() => {
                        const mWidth = massifWidth * pxPerM;
                        const mHeight = massifHeight * pxPerM;
                        // Poteau positionné à 45% de la largeur
                        const postBaseX = mainLeftSvgX + mainWidthSvg * 0.45;
                        const mX = postBaseX - mWidth / 2;
                        const mY = groundY - mHeight;

                        // Point de jonction poteau / toiture
                        const postTopRatio = 0.45;
                        const postTopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * postTopRatio;

                        // Bracons obliques
                        const strutLeftRatio = 0.15;
                        const strutRightRatio = 0.78;
                        const strutLeftRoofX = mainLeftSvgX + mainWidthSvg * strutLeftRatio;
                        const strutLeftRoofY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * strutLeftRatio;
                        const strutRightRoofX = mainLeftSvgX + mainWidthSvg * strutRightRatio;
                        const strutRightRoofY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * strutRightRatio;

                        const strutMidPostY = postTopY + (mY - postTopY) * 0.45;

                        return (
                            <g>
                                {/* Massif béton */}
                                <rect x={mX} y={mY} width={mWidth} height={mHeight} fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" rx="0.5" />
                                <text x={postBaseX} y={mY + mHeight / 2 + 3} textAnchor="middle" fill="#475569" fontSize="6" fontWeight="bold">Massif Béton</text>

                                {/* Poteau métallique principal */}
                                <line x1={postBaseX} y1={mY} x2={postBaseX} y2={postTopY} stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />

                                {/* Bracons inclinés de renfort */}
                                <line x1={postBaseX} y1={strutMidPostY} x2={strutLeftRoofX} y2={strutLeftRoofY} stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                                <line x1={postBaseX} y1={strutMidPostY} x2={strutRightRoofX} y2={strutRightRoofY} stroke="#334155" strokeWidth="3" strokeLinecap="round" />

                                {/* Toiture solaire inclinée continue */}
                                <line x1={mainLeftSvgX - 4} y1={leftEaveSvgY} x2={mainRightSvgX + 4} y2={rightEaveSvgY} stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
                                <line x1={mainLeftSvgX - 4} y1={leftEaveSvgY} x2={mainRightSvgX + 4} y2={rightEaveSvgY} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="8 2.5" />

                                {/* Cote Hauteur Sablière Haute (Gauche) */}
                                <line x1={mainLeftSvgX - 16} y1={leftEaveSvgY} x2={mainLeftSvgX - 16} y2={groundY} stroke="#dc2626" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 20} y1={leftEaveSvgY} x2={mainLeftSvgX - 12} y2={leftEaveSvgY} stroke="#dc2626" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 20} y1={groundY} x2={mainLeftSvgX - 12} y2={groundY} stroke="#dc2626" strokeWidth="1" />
                                <text x={mainLeftSvgX - 24} y={(leftEaveSvgY + groundY) / 2 + 2} textAnchor="end" fill="#dc2626" fontSize="7" fontWeight="bold">
                                    Sablière Haute : {leftEaveHeight.toFixed(2)}m
                                </text>

                                {/* Cote Hauteur Sablière Basse (Droite) */}
                                <line x1={mainRightSvgX + 16} y1={rightEaveSvgY} x2={mainRightSvgX + 16} y2={groundY} stroke="#dc2626" strokeWidth="1" />
                                <line x1={mainRightSvgX + 12} y1={rightEaveSvgY} x2={mainRightSvgX + 20} y2={rightEaveSvgY} stroke="#dc2626" strokeWidth="1" />
                                <line x1={mainRightSvgX + 12} y1={groundY} x2={mainRightSvgX + 20} y2={groundY} stroke="#dc2626" strokeWidth="1" />
                                <text x={mainRightSvgX + 24} y={(rightEaveSvgY + groundY) / 2 + 2} fill="#dc2626" fontSize="7" fontWeight="bold">
                                    Sablière Basse : {rightEaveHeight.toFixed(2)}m
                                </text>

                                {/* Cote Passage Libre sous bracon */}
                                <line x1={postBaseX + 18} y1={clearanceSvgY} x2={postBaseX + 18} y2={groundY} stroke="#059669" strokeWidth="1" strokeDasharray="2 1.5" />
                                <line x1={postBaseX + 14} y1={clearanceSvgY} x2={postBaseX + 22} y2={clearanceSvgY} stroke="#059669" strokeWidth="1" />
                                <line x1={postBaseX + 14} y1={groundY} x2={postBaseX + 22} y2={groundY} stroke="#059669" strokeWidth="1" />
                                <text x={postBaseX + 26} y={clearanceSvgY + (groundY - clearanceSvgY) / 2 + 2.5} fill="#059669" fontSize="6.5" fontWeight="bold">
                                    Passage libre : {clearanceHeight.toFixed(2)}m
                                </text>

                                {/* Cote Largeur totale au sol */}
                                <line x1={mainLeftSvgX} y1={groundY + 14} x2={mainRightSvgX} y2={groundY + 14} stroke="#0284c7" strokeWidth="1.2" />
                                <line x1={mainLeftSvgX} y1={groundY + 10} x2={mainLeftSvgX} y2={groundY + 18} stroke="#0284c7" strokeWidth="1.2" />
                                <line x1={mainRightSvgX} y1={groundY + 10} x2={mainRightSvgX} y2={groundY + 18} stroke="#0284c7" strokeWidth="1.2" />
                                <text x={centerX} y={groundY + 23} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">
                                    ▲ Largeur : {realGroundWidth.toFixed(2)}m (Emprise au sol)
                                </text>

                                {/* Cote Toiture supérieure */}
                                <line x1={mainLeftSvgX - 4} y1={leftEaveSvgY - 9} x2={mainRightSvgX + 4} y2={rightEaveSvgY - 9} stroke="#2563eb" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 4} y1={leftEaveSvgY - 13} x2={mainLeftSvgX - 4} y2={leftEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                <line x1={mainRightSvgX + 4} y1={rightEaveSvgY - 13} x2={mainRightSvgX + 4} y2={rightEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                <text x={centerX} y={(leftEaveSvgY + rightEaveSvgY) / 2 - 12} textAnchor="middle" fill="#1e40af" fontSize="7.5" fontWeight="bold">
                                    Toiture : {realRoofWidth.toFixed(2)}m
                                </text>
                            </g>
                        );
                    })()
                )
            ) : (
                /* ── BÂTIMENT AGRICOLE CLASSIQUE ── */
                <g>
                    <rect x={mainLeftSvgX} y={leftEaveSvgY} width="8" height={groundYLeft - leftEaveSvgY} fill="#1e293b" />
                    <rect x={mainRightSvgX - 8} y={rightEaveSvgY} width="8" height={groundYRight - rightEaveSvgY} fill="#1e293b" />

                    {/* Poteau intermédiaire pour asymétrique 2 zones */}
                    {isAsym2 && (
                        <>
                            <rect x={middleColSvgX - 4} y={middleColTopY} width="8" height={groundY - middleColTopY} fill="#1e293b" />
                            <text x={middleColSvgX} y={groundY + 8} textAnchor="middle" fill="#64748b" fontSize="6.5" fontStyle="italic">Poteau intermédiaire</text>
                        </>
                    )}

                    {hasAppentisRight && <rect x={extRightSvgX - 7} y={extRightSvgY} width="7" height={groundYRight - extRightSvgY} fill="#1e293b" />}
                    {hasAppentisLeft && <rect x={extLeftSvgX} y={extLeftSvgY} width="7" height={groundYLeft - extLeftSvgY} fill="#1e293b" />}

                    {/* Versant Nord (Couverture Solaire Photovoltaïque Intégrale) */}
                    <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                    <polygon points={`${mainLeftSvgX - 4},${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 7} ${mainLeftSvgX - 4},${leftEaveSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                    {[0.25, 0.5, 0.75].map((ratio, idx) => {
                        const px = mainLeftSvgX + (apexSvgX - mainLeftSvgX) * ratio;
                        const py = leftEaveSvgY + (apexSvgY - leftEaveSvgY) * ratio;
                        return <line key={idx} x1={px} y1={py - 7} x2={px} y2={py - 2} stroke="#93c5fd" strokeWidth="1" />;
                    })}

                    {/* Versant Sud (Couverture Solaire Photovoltaïque Intégrale) */}
                    <line x1={apexSvgX} y1={apexSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                    <polygon points={`${apexSvgX},${apexSvgY - 2} ${mainRightSvgX + 4},${rightEaveSvgY - 2} ${mainRightSvgX + 4},${rightEaveSvgY - 7} ${apexSvgX},${apexSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                    {[0.12, 0.25, 0.38, 0.5, 0.63, 0.76, 0.88].map((ratio, idx) => {
                        const px = apexSvgX + (mainRightSvgX - apexSvgX) * ratio;
                        const py = apexSvgY + (rightEaveSvgY - apexSvgY) * ratio;
                        return <line key={idx} x1={px} y1={py - 7} x2={px} y2={py - 2} stroke="#93c5fd" strokeWidth="1" />;
                    })}

                    {hasExtRight && (
                        <>
                            <line x1={mainRightSvgX} y1={rightEaveSvgY} x2={extRightSvgX} y2={extRightSvgY} stroke="#1e293b" strokeWidth="3.5" />
                            <polygon points={`${mainRightSvgX},${rightEaveSvgY - 2} ${extRightSvgX + 4},${extRightSvgY - 2} ${extRightSvgX + 4},${extRightSvgY - 7} ${mainRightSvgX},${rightEaveSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                            <text x={(mainRightSvgX + extRightSvgX) / 2} y={Math.min(rightEaveSvgY, extRightSvgY) - 10} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">
                                {hasAppentisRight ? `Appentis +${extRightWidth.toFixed(2)}m` : `Auvent +${extRightWidth.toFixed(2)}m`}
                            </text>
                        </>
                    )}
                    {hasExtLeft && (
                        <>
                            <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={extLeftSvgX} y2={extLeftSvgY} stroke="#1e293b" strokeWidth="3.5" />
                            <polygon points={`${mainLeftSvgX},${leftEaveSvgY - 2} ${extLeftSvgX - 4},${extLeftSvgY - 2} ${extLeftSvgX - 4},${extLeftSvgY - 7} ${mainLeftSvgX},${leftEaveSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                            <text x={(mainLeftSvgX + extLeftSvgX) / 2} y={Math.min(leftEaveSvgY, extLeftSvgY) - 10} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">
                                {hasAppentisLeft ? `Appentis +${extLeftWidth.toFixed(2)}m` : `Auvent +${extLeftWidth.toFixed(2)}m`}
                            </text>
                        </>
                    )}
                </g>
            )}

            {/* 3. Titre et description toiture */}
            <text x={350} y={8} textAnchor="middle" fill="#1e3a8a" fontSize="8" fontWeight="bold">
                Toiture {roofTypeLabel} : pente {displayPitch}° ({Math.round(Math.tan((displayPitch * Math.PI) / 180) * 100)}%) {isOmbriere ? '• Façade EST (Pignon) ' : ''}• {isOmbriere ? 'Structure métallique & Modules solaires' : 'Couverture solaire intégrale'}
            </text>

            {/* 4. Cotes de Hauteur (Sablière Haute / Égout Nord) */}
            {hasExtLeft ? (
                <g>
                    <line x1={extLeftSvgX - 12} y1={extLeftSvgY} x2={extLeftSvgX - 12} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                    <line x1={extLeftSvgX - 15} y1={extLeftSvgY} x2={extLeftSvgX - 9} y2={extLeftSvgY} stroke="#ef4444" strokeWidth="1" />
                    <line x1={extLeftSvgX - 15} y1={groundYLeft} x2={extLeftSvgX - 9} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                    <text x={extLeftSvgX - 18} y={extLeftSvgY + (groundYLeft - extLeftSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="8" fontWeight="bold">
                        Égout Nord : {extLeftHeight.toFixed(2)}m
                    </text>
                </g>
            ) : (
                <g>
                    <line x1={mainLeftSvgX - 16} y1={leftEaveSvgY} x2={mainLeftSvgX - 16} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                    <line x1={mainLeftSvgX - 19} y1={leftEaveSvgY} x2={mainLeftSvgX - 13} y2={leftEaveSvgY} stroke="#ef4444" strokeWidth="1" />
                    <line x1={mainLeftSvgX - 19} y1={groundYLeft} x2={mainLeftSvgX - 13} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                    <text x={mainLeftSvgX - 22} y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="8" fontWeight="bold">
                        {isOmbriere ? `Sablière Haute : ${leftEaveHeight.toFixed(2)}m` : `Sablière Nord : ${leftEaveHeight.toFixed(2)}m`}
                    </text>
                </g>
            )}

            {/* Cotes de Hauteur (Sablière Basse / Égout Sud) */}
            {hasExtRight ? (
                <g>
                    <line x1={extRightSvgX + 12} y1={extRightSvgY} x2={extRightSvgX + 12} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                    <line x1={extRightSvgX + 9} y1={extRightSvgY} x2={extRightSvgX + 15} y2={extRightSvgY} stroke="#ef4444" strokeWidth="1" />
                    <line x1={extRightSvgX + 9} y1={groundYRight} x2={extRightSvgX + 15} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                    <text x={extRightSvgX + 18} y={extRightSvgY + (groundYRight - extRightSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="8" fontWeight="bold">
                        Égout Sud : {extRightHeight.toFixed(2)}m
                    </text>
                </g>
            ) : (
                <g>
                    <line x1={mainRightSvgX + 16} y1={rightEaveSvgY} x2={mainRightSvgX + 16} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                    <line x1={mainRightSvgX + 13} y1={rightEaveSvgY} x2={mainRightSvgX + 19} y2={rightEaveSvgY} stroke="#ef4444" strokeWidth="1" />
                    <line x1={mainRightSvgX + 13} y1={groundYRight} x2={mainRightSvgX + 19} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                    <text x={mainRightSvgX + 22} y={rightEaveSvgY + (groundYRight - rightEaveSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="8" fontWeight="bold">
                        {isOmbriere ? `Sablière Basse : ${rightEaveHeight.toFixed(2)}m` : `Égout Sud : ${rightEaveHeight.toFixed(2)}m`}
                    </text>
                </g>
            )}

            {/* Faîtage / Sablière Haute (uniquement pour bâtiment à double pente) */}
            {!isOmbriere && !isMonopente && (
                <g>
                    <line x1={apexSvgX} y1={apexSvgY} x2={apexSvgX} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
                    <line x1={apexSvgX - 4} y1={apexSvgY} x2={apexSvgX + 4} y2={apexSvgY} stroke="#ef4444" strokeWidth="1" />
                    <text x={apexSvgX + 6} y={apexSvgY + 16} fill="#ef4444" fontSize="8" fontWeight="bold">
                        {isAsym ? `Sablière Haute : ${ridgeHeight.toFixed(2)}m` : `Faîtage : ${ridgeHeight.toFixed(2)}m`}
                    </text>
                </g>
            )}

            {/* 5. Cotes d'emprise au sol */}
            {isAsym2 ? (
                <g>
                    <line x1={mainLeftSvgX} y1={groundY} x2={mainLeftSvgX} y2="152" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                    <line x1={middleColSvgX} y1={groundY} x2={middleColSvgX} y2="152" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                    <line x1={mainRightSvgX} y1={groundY} x2={mainRightSvgX} y2="152" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />

                    <line x1={mainLeftSvgX} y1="150" x2={middleColSvgX} y2="150" stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={mainLeftSvgX} y1={146} x2={mainLeftSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={middleColSvgX} y1={146} x2={middleColSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                    <text x={(mainLeftSvgX + middleColSvgX) / 2} y="146" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
                        {asym2LeftDist.toFixed(2)} m
                    </text>

                    <line x1={middleColSvgX} y1="150" x2={mainRightSvgX} y2="150" stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={middleColSvgX} y1={146} x2={middleColSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={mainRightSvgX} y1={146} x2={mainRightSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                    <text x={(middleColSvgX + mainRightSvgX) / 2} y="146" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
                        {asym2RightDist.toFixed(2)} m
                    </text>

                    <line x1={mainLeftSvgX} y1="162" x2={mainRightSvgX} y2="162" stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={mainLeftSvgX} y1={158} x2={mainLeftSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={mainRightSvgX} y1={158} x2={mainRightSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                    <text x={centerX} y="171" textAnchor="middle" fill="#0284c7" fontSize="8" fontWeight="bold">
                        ▲ Largeur : {realGroundWidth.toFixed(2)} m (Emprise au sol)
                    </text>
                </g>
            ) : (
                <g>
                    <line x1={mainLeftSvgX} y1={groundY} x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                    <line x1={mainRightSvgX} y1={groundY} x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                    <line x1={mainLeftSvgX} y1="158" x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={mainLeftSvgX} y1={153} x2={mainLeftSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={mainRightSvgX} y1={153} x2={mainRightSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                    <text x={centerX} y="169" textAnchor="middle" fill="#0284c7" fontSize="8.5" fontWeight="bold">
                        ▲ Largeur : {realGroundWidth.toFixed(2)} m (Emprise au sol)
                    </text>

                    {hasExtRight && (
                        <g>
                            <line x1={mainRightSvgX} y1="158" x2={extRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                            <line x1={extRightSvgX} y1={153} x2={extRightSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                            <text x={(mainRightSvgX + extRightSvgX) / 2} y={169} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">+{extRightWidth.toFixed(2)}m</text>
                        </g>
                    )}

                    {hasExtLeft && (
                        <g>
                            <line x1={extLeftSvgX} y1="158" x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                            <line x1={extLeftSvgX} y1={153} x2={extLeftSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                            <text x={(extLeftSvgX + mainLeftSvgX) / 2} y={169} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">+{extLeftWidth.toFixed(2)}m</text>
                        </g>
                    )}
                </g>
            )}

            {/* Barre d'échelle métrique EXACTE */}
            <g transform={`translate(${scaleStartX}, ${scaleY})`}>
                <rect x={0} y={0} width={scaleSegWidth} height={3} fill="#0f172a" />
                <rect x={scaleSegWidth} y={0} width={scaleSegWidth} height={3} fill="#cbd5e1" />
                <rect x={scaleSegWidth * 2} y={0} width={scaleSegWidth} height={3} fill="#0f172a" />
                <rect x={scaleSegWidth * 3} y={0} width={scaleSegWidth} height={3} fill="#cbd5e1" />
                <rect x={scaleSegWidth * 4} y={0} width={scaleSegWidth} height={3} fill="#0f172a" />
                <text x={0} y={6.5} fill="#475569" fontSize="5.5" textAnchor="middle">0</text>
                <text x={scaleSegWidth} y={6.5} fill="#475569" fontSize="5.5" textAnchor="middle">2</text>
                <text x={scaleSegWidth * 2} y={6.5} fill="#475569" fontSize="5.5" textAnchor="middle">4</text>
                <text x={scaleSegWidth * 3} y={6.5} fill="#475569" fontSize="5.5" textAnchor="middle">6</text>
                <text x={scaleSegWidth * 4} y={6.5} fill="#475569" fontSize="5.5" textAnchor="middle">8</text>
                <text x={scaleTotalWidth} y={6.5} fill="#0f172a" fontSize="6" fontWeight="bold" textAnchor="middle">10m</text>
            </g>
        </svg>
    );

    const buildingTitle = project?.buildingName ? project.buildingName.toUpperCase() : (isMulti ? `OMBRIÈRE` : 'CONSTRUCTION');

    return (
        <div style={{ height: boxHeight, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: isMulti ? '1mm 3.5mm' : '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                <span style={{ fontSize: isMulti ? '8pt' : '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                    DP3 — COUPE DE TERRAIN &amp; DU BÂTIMENT (COUPE TRANSVERSALE {coupeLetter}) — {buildingTitle}
                </span>
                <span style={{ fontSize: isMulti ? '6.5pt' : '7pt', color: '#64748b' }}>
                    Dimensions : {realGroundWidth.toFixed(2)}m × {longueur}m{hasAuventRight ? ` (+ Auvent ${extRightWidth.toFixed(2)}m)` : hasAppentisRight ? ` (+ Appentis ${extRightWidth.toFixed(2)}m)` : ''}{hasAuventLeft ? ` (+ Auvent ${extLeftWidth.toFixed(2)}m Gauche)` : hasAppentisLeft ? ` (+ Appentis ${extLeftWidth.toFixed(2)}m Gauche)` : ''} • Échelle indicative
                </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {coupeSvgContent}
            </div>
        </div>
    );
};

/**
 * PLANCHE DP3 : PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION (& NOTICE DESCRIPTIVE OPTIONNELLE)
 */
export const PlateCoupe = ({ project, captures, noticeText, includeNotice = false }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;

    const hasNotice = Boolean(includeNotice || project?.includeNotice || project?.hasNotice);
    const rawNoticeText = noticeText || project?.noticeText || project?.noticeAgricole || project?.pc_notice || project?.description;
    let cleanNoticeText = (rawNoticeText || '').replace(/^NOTICE\s+D['’]INSERTION\s*&\s*DESCRIPTIVE\s+DU\s+PROJET\s*/i, '').trim();

    if (isNoBattery && cleanNoticeText) {
        cleanNoticeText = cleanNoticeText
            .replace(/Le système de stockage batterie est[^\n]*\n?/gi, '')
            .replace(/ainsi qu'un système de stockage batterie[^\n,\.]*/gi, '')
            .replace(/Le site sera également équipé d'un système de stockage d'énergie[^\n]*\n?/gi, '')
            .replace(/et le système de stockage batterie/gi, '')
            .replace(/Station Batteries \([^\)]*\)/gi, isAcama ? 'Bâtiment' : 'Ombrière');
    }

    return (
        <div style={PAGE_STYLE} id="dp-plate-coupe">
            <PlateHeader 
                title={hasNotice ? "DP3 : PLAN EN COUPE & NOTICE DESCRIPTIVE" : "DP3 — PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION"} 
                project={project} 
            />
            {hasNotice ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5mm', marginBottom: '8mm' }}>
                    {/* HAUT : DP3 PLAN EN COUPE TRANSVERSALE */}
                    <CoupeBox project={project} coupeLetter="AA'" isMulti={false} boxHeight="62mm" />

                    {/* BAS : NOTICE DESCRIPTIVE DU PROJET */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '2.5mm 4.5mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            NOTICE D'INSERTION &amp; DESCRIPTIVE DU PROJET
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                                {cleanNoticeText}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '5mm' }}>
                    <CoupeBox project={project} coupeLetter="AA'" isMulti={false} boxHeight="135mm" />
                </div>
            )}
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP3 MULTI-BÂTIMENTS : 2 COUPES SUPERPOSÉES SUR UNE SEULE PAGE
 */
export const PlateCoupeMulti = ({ project, buildings = [] }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;

    const bList = (buildings && buildings.length > 0) ? buildings : (project?.buildings || [project]);
    const b1 = bList[0] || project;
    const b2 = bList[1] || project;

    const b1Name = isNoBattery 
        ? (b1.name ? b1.name.replace(/Station Batteries[^\)]*\)?/gi, isAcama ? 'Bâtiment' : 'Ombrière').replace(/Bâtiment/gi, isAcama ? 'Bâtiment' : 'Ombrière').trim() : (isAcama ? 'Bâtiment 1' : 'Ombrière 1'))
        : (b1.name ? b1.name.replace(/Bâtiment/gi, 'Ombrière').replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '').trim() : 'Ombrière 1');

    const b2Name = isNoBattery 
        ? (b2.name ? b2.name.replace(/Station Batteries[^\)]*\)?/gi, isAcama ? 'Bâtiment' : 'Ombrière').replace(/Bâtiment/gi, isAcama ? 'Bâtiment' : 'Ombrière').trim() : (isAcama ? 'Bâtiment 2' : 'Ombrière 2'))
        : (b2.name ? b2.name.replace(/Bâtiment/gi, 'Ombrière').replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '').trim() : 'Ombrière 2');

    const b1Proj = {
        ...project,
        ...b1,
        isAcama,
        isGreenInvest,
        largeur: String(b1.width || b1.largeur || (isNoBattery ? 16.4 : 20.0)),
        longueur: String(b1.length || b1.longueur || 37.5),
        hauteur_egout: String(b1.eaveHeight || b1.hauteur_egout || 4.0),
        pente: String(b1.roofPitch || b1.pente || 15),
        buildingType: (isNoBattery && (b1.buildingType === 'battery_standalone' || !b1.buildingType)) ? (isAcama ? 'symetrique' : 'asymetrique_1') : (b1.buildingType || 'asymetrique_1'),
        leftSide: b1.leftSide || 'none',
        rightSide: b1.rightSide || 'none',
        leftWidth: b1.leftWidth || 4.0,
        rightWidth: b1.rightWidth || 4.0,
        buildingName: b1Name || 'Ombrière 1',
    };

    const b2Proj = {
        ...project,
        ...b2,
        isAcama,
        isGreenInvest,
        largeur: String(b2.width || b2.largeur || (isNoBattery ? 16.4 : 9.1)),
        longueur: String(b2.length || b2.longueur || 30.0),
        hauteur_egout: String(b2.eaveHeight || b2.hauteur_egout || 4.0),
        pente: String(b2.roofPitch || b2.pente || 15),
        buildingType: (isNoBattery && (b2.buildingType === 'battery_standalone' || !b2.buildingType)) ? (isAcama ? 'symetrique' : 'asymetrique_1') : (b2.buildingType || 'asymetrique_1'),
        leftSide: b2.leftSide || 'none',
        rightSide: b2.rightSide || 'none',
        leftWidth: b2.leftWidth || 4.0,
        rightWidth: b2.rightWidth || 4.0,
        buildingName: b2Name || 'Ombrière 2',
    };

    return (
        <div style={PAGE_STYLE} id="dp-plate-coupe-multi">
            <PlateHeader 
                title="DP3 — PLANS EN COUPE DU TERRAIN ET DES CONSTRUCTIONS" 
                project={project} 
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', marginBottom: '6mm', justifyContent: 'space-between' }}>
                {/* 1ère Coupe */}
                <CoupeBox project={b1Proj} coupeLetter="AA'" isMulti={true} boxHeight="62mm" />

                {/* 2ème Coupe */}
                <CoupeBox project={b2Proj} coupeLetter="BB'" isMulti={true} boxHeight="62mm" />
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE NOTICE DÉDIÉE PLEINE PAGE (POUR PROJET MULTI-BÂTIMENTS)
 */
export const PlateNoticeDedicated = ({ project, noticeText }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama;

    const rawNotice = noticeText || project?.noticeText || project?.noticeAgricole || project?.pc_notice || project?.description || '';
    let cleanNotice = rawNotice.replace(/^NOTICE\s+D['’]INSERTION\s*&\s*DESCRIPTIVE\s+DU\s+PROJET\s*/i, '').trim();

    if (isNoBattery && cleanNotice) {
        cleanNotice = cleanNotice
            .replace(/Le système de stockage batterie est[^\n]*\n?/gi, '')
            .replace(/ainsi qu'un système de stockage batterie[^\n,\.]*/gi, '')
            .replace(/Le site sera également équipé d'un système de stockage d'énergie[^\n]*\n?/gi, '')
            .replace(/et le système de stockage batterie/gi, '')
            .replace(/Station Batteries \([^\)]*\)/gi, isAcama ? 'Bâtiment' : 'Ombrière');
    }

    return (
        <div style={PAGE_STYLE} id="dp-plate-notice-dedicated">
            <PlateHeader 
                title="NOTICE D'INSERTION & DESCRIPTIVE DU PROJET" 
                project={project} 
            />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '5mm 7mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '6mm' }}>
                <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '2.5mm', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5mm' }}>
                    Notice descriptive &amp; Justification du projet
                </div>
                <div style={{ flex: 1, overflow: 'hidden', fontSize: '7.2pt', lineHeight: '1.42', color: '#334155', whiteSpace: 'pre-line' }}>
                    {cleanNotice}
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateSectionAndNotice = (props) => <PlateCoupe {...props} includeNotice={true} />;
export const PlateSection = PlateCoupe;

/**
 * VUES ARCHITECTURALES VECTORIELLES HD STANDARDISÉES POUR DP4 BESS (500 kW / 1044 kWh)
 * 4 Armoires CESC Mercury 261 + Dalle béton armé étanche (sans grillage)
 */
export const BessElevationSud = ({ showFence = false }) => (
    <svg viewBox="0 0 540 210" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
            <linearGradient id="bess-grad-s" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
        </defs>
        {/* Titre vue */}
        <text x="270" y="24" textAnchor="middle" fill="#334155" fontSize="7.5" fontWeight="bold">Façade Principale (Sud) — 4 armoires Mercury 261</text>

        {/* Ligne TN */}
        <line x1="15" y1="168" x2="525" y2="168" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="25" y="180" fill="#64748b" fontSize="7.5" fontStyle="italic">Terrain Naturel TN ±0.00</text>

        {/* Dalle béton armé 6.20m */}
        <rect x="65" y="157" width="410" height="11" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />
        <text x="270" y="165" textAnchor="middle" fill="#334155" fontSize="6.5" fontWeight="bold">Dalle béton armé étanche 6,20 m (+0,15 m / TN)</text>

        {/* 4 Armoires CESC Mercury 261 */}
        {[0, 1, 2, 3].map(i => {
            const x = 90 + i * 86;
            return (
                <g key={i}>
                    <rect x={x} y="44" width="76" height="113" fill="url(#bess-grad-s)" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
                    <rect x={x - 1} y="39" width="78" height="5" fill="#0f172a" rx="0.8" />
                    <line x1={x + 38} y1="44" x2={x + 38} y2="157" stroke="#475569" strokeWidth="0.8" />
                    <rect x={x + 24} y="52" width="28" height="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" rx="1" />
                    <circle cx={x + 31} cy="73" r="1.8" fill="#22c55e" />
                    <circle cx={x + 38} cy="73" r="1.8" fill="#facc15" />
                    <circle cx={x + 45} cy="73" r="1.8" fill="#ef4444" />
                    <rect x={x + 7} y="86" width="28" height="28" fill="#0f172a" rx="0.5" opacity="0.8" />
                    <rect x={x + 41} y="86" width="28" height="28" fill="#0f172a" rx="0.5" opacity="0.8" />
                    <rect x={x + 7} y="122" width="62" height="30" fill="#0f172a" rx="0.5" opacity="0.8" />
                    <text x={x + 38} y="81" textAnchor="middle" fill="#93c5fd" fontSize="6.5" fontWeight="bold">MERCURY #{i + 1}</text>
                </g>
            );
        })}

        {showFence && (
            <g>
                <rect x="67" y="62" width="406" height="95" fill="rgba(21,128,61,0.14)" stroke="#15803d" strokeWidth="1.8" />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(k => (
                    <line key={k} x1={67 + k * 25.3} y1="62" x2={67 + k * 25.3} y2="157" stroke="#15803d" strokeWidth={k % 4 === 0 ? "2" : "0.8"} opacity="0.85" />
                ))}
                <line x1="67" y1="88" x2="473" y2="88" stroke="#15803d" strokeWidth="1.2" />
                <line x1="67" y1="132" x2="473" y2="132" stroke="#15803d" strokeWidth="1.2" />
                <text x="470" y="58" textAnchor="end" fill="#15803d" fontSize="6.5" fontWeight="bold">Clôture rigide vert RAL 6005 (H: 2,00 m)</text>
            </g>
        )}
        {/* Cotes de Hauteur (2.38m) */}
        <line x1="28" y1="39" x2="28" y2="168" stroke="#ef4444" strokeWidth="1" />
        <line x1="24" y1="39" x2="32" y2="39" stroke="#ef4444" strokeWidth="1" />
        <line x1="24" y1="168" x2="32" y2="168" stroke="#ef4444" strokeWidth="1" />
        <text x="24" y="104" textAnchor="end" fill="#ef4444" fontSize="7.5" fontWeight="bold">H : 2,38 m</text>

        {showFence && (
            <g>
                <rect x="67" y="62" width="406" height="95" fill="rgba(21,128,61,0.14)" stroke="#15803d" strokeWidth="1.8" />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(k => (
                    <line key={k} x1={67 + k * 25.3} y1="62" x2={67 + k * 25.3} y2="157" stroke="#15803d" strokeWidth={k % 4 === 0 ? "2" : "0.8"} opacity="0.85" />
                ))}
                <line x1="67" y1="88" x2="473" y2="88" stroke="#15803d" strokeWidth="1.2" />
                <line x1="67" y1="132" x2="473" y2="132" stroke="#15803d" strokeWidth="1.2" />
                <text x="470" y="58" textAnchor="end" fill="#15803d" fontSize="6.5" fontWeight="bold">Clôture rigide vert RAL 6005 (H: 2,00 m)</text>
            </g>
        )}
        {/* Cotes de Longueur Dalle (6.20m) */}
        <line x1="65" y1="190" x2="475" y2="190" stroke="#2563eb" strokeWidth="1" />
        <line x1="65" y1="186" x2="65" y2="194" stroke="#2563eb" strokeWidth="1" />
        <line x1="475" y1="186" x2="475" y2="194" stroke="#2563eb" strokeWidth="1" />
        <text x="270" y="200" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">Longueur dalle : 6,20 m</text>
    </svg>
);

export const BessElevationNord = ({ showFence = false }) => (
    <svg viewBox="0 0 540 210" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
            <linearGradient id="bess-grad-n" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
        </defs>
        {/* Titre vue */}
        <text x="270" y="24" textAnchor="middle" fill="#334155" fontSize="7.5" fontWeight="bold">Façade Arrière (Nord) — Échangeurs thermiques</text>

        {/* Ligne TN */}
        <line x1="15" y1="168" x2="525" y2="168" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="25" y="180" fill="#64748b" fontSize="7.5" fontStyle="italic">Terrain Naturel TN ±0.00</text>

        {/* Dalle béton armé 6.20m */}
        <rect x="65" y="157" width="410" height="11" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />
        <text x="270" y="165" textAnchor="middle" fill="#334155" fontSize="6.5" fontWeight="bold">Dalle béton armé étanche 6,20 m (+0,15 m / TN)</text>

        {/* 4 Armoires CESC Mercury 261 (Face Arrière) */}
        {[0, 1, 2, 3].map(i => {
            const x = 90 + i * 86;
            return (
                <g key={i}>
                    <rect x={x} y="44" width="76" height="113" fill="url(#bess-grad-n)" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
                    <rect x={x - 1} y="39" width="78" height="5" fill="#0f172a" rx="0.8" />
                    <rect x={x + 6} y="49" width="64" height="48" fill="#0f172a" rx="0.5" opacity="0.85" />
                    <text x={x + 38} y="75" textAnchor="middle" fill="#94a3b8" fontSize="6">Échangeur Thermique</text>
                    <rect x={x + 8} y="106" width="60" height="46" fill="#0f172a" rx="0.5" opacity="0.85" />
                    <text x={x + 38} y="132" textAnchor="middle" fill="#64748b" fontSize="6">Accès Maintenance</text>
                </g>
            );
        })}

        {/* Cotes de Longueur Dalle (6.20m) */}
        <line x1="65" y1="190" x2="475" y2="190" stroke="#2563eb" strokeWidth="1" />
        <line x1="65" y1="186" x2="65" y2="194" stroke="#2563eb" strokeWidth="1" />
        <line x1="475" y1="186" x2="475" y2="194" stroke="#2563eb" strokeWidth="1" />
        <text x="270" y="200" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">Longueur dalle : 6,20 m</text>
    </svg>
);

export const BessElevationEst = ({ showFence = false }) => (
    <svg viewBox="0 0 340 210" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
            <linearGradient id="bess-grad-e" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
        </defs>
        {/* Titre vue */}
        <text x="170" y="24" textAnchor="middle" fill="#334155" fontSize="7.5" fontWeight="bold">Pignon Latéral Est (Gauche)</text>

        {/* Ligne TN */}
        <line x1="10" y1="168" x2="330" y2="168" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="15" y="180" fill="#64748b" fontSize="7" fontStyle="italic">TN ±0.00</text>

        {/* Dalle largeur 3.20m */}
        <rect x="45" y="157" width="250" height="11" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />
        <text x="170" y="165" textAnchor="middle" fill="#334155" fontSize="6.5" fontWeight="bold">Largeur dalle : 3,20 m</text>

        {/* Profil de l'armoire Mercury 261 (Profondeur 1.00m) */}
        <rect x="125" y="44" width="90" height="113" fill="url(#bess-grad-e)" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
        <rect x={123} y="39" width="94" height="5" fill="#0f172a" rx="0.8" />
        <rect x="135" y="55" width="70" height="35" fill="#0f172a" rx="0.5" opacity="0.85" />
        <text x="170" y="75" textAnchor="middle" fill="#93c5fd" fontSize="6.5" fontWeight="bold">P = 1,00 m</text>

        {showFence && (
            <g>
                <rect x="47" y="62" width="246" height="95" fill="rgba(21,128,61,0.14)" stroke="#15803d" strokeWidth="1.8" />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => (
                    <line key={k} x1={47 + k * 24.6} y1="62" x2={47 + k * 24.6} y2="157" stroke="#15803d" strokeWidth={k % 5 === 0 ? "2" : "0.8"} opacity="0.85" />
                ))}
                <line x1="47" y1="88" x2="293" y2="88" stroke="#15803d" strokeWidth="1.2" />
                <line x1="47" y1="132" x2="293" y2="132" stroke="#15803d" strokeWidth="1.2" />
                <text x="290" y="58" textAnchor="end" fill="#15803d" fontSize="6" fontWeight="bold">Clôture RAL 6005</text>
            </g>
        )}
        {/* Cotes Largeur Dalle */}
        <line x1="45" y1="190" x2="295" y2="190" stroke="#2563eb" strokeWidth="1" />
        <line x1="45" y1="186" x2="45" y2="194" stroke="#2563eb" strokeWidth="1" />
        <line x1="295" y1="186" x2="295" y2="194" stroke="#2563eb" strokeWidth="1" />
        <text x="170" y="200" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">Largeur dalle : 3,20 m</text>
    </svg>
);

export const BessElevationOuest = ({ showFence = false }) => (
    <svg viewBox="0 0 340 210" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
            <linearGradient id="bess-grad-w" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
        </defs>
        {/* Titre vue */}
        <text x="170" y="24" textAnchor="middle" fill="#334155" fontSize="7.5" fontWeight="bold">Pignon Latéral Ouest (Droit — Raccordement HTA)</text>

        {/* Ligne TN */}
        <line x1="10" y1="168" x2="330" y2="168" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="15" y="180" fill="#64748b" fontSize="7" fontStyle="italic">TN ±0.00</text>

        {/* Dalle largeur 3.20m */}
        <rect x="45" y="157" width="250" height="11" fill="#cbd5e1" stroke="#475569" strokeWidth="1" rx="0.5" />
        <text x="170" y="165" textAnchor="middle" fill="#334155" fontSize="6.5" fontWeight="bold">Largeur dalle : 3,20 m</text>

        {/* Profil de l'armoire + Poste HTA */}
        <rect x="85" y="44" width="85" height="113" fill="url(#bess-grad-w)" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
        <rect x="180" y="70" width="35" height="87" fill="#e2e8f0" stroke="#475569" strokeWidth="1" rx="1" />
        <text x="197" y="115" textAnchor="middle" fill="#0f172a" fontSize="6.5" fontWeight="bold">HTA</text>

        {/* Cotes Largeur Dalle */}
        <line x1="45" y1="190" x2="295" y2="190" stroke="#2563eb" strokeWidth="1" />
        <line x1="45" y1="186" x2="45" y2="194" stroke="#2563eb" strokeWidth="1" />
        <line x1="295" y1="186" x2="295" y2="194" stroke="#2563eb" strokeWidth="1" />
        <text x="170" y="200" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">Largeur dalle : 3,20 m</text>
    </svg>
);

export const BessElevationToiture = ({ showFence = false }) => (
    <svg viewBox="0 0 400 210" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        {/* Titre vue */}
        <text x="200" y="32" textAnchor="middle" fill="#334155" fontSize="7.5" fontWeight="bold">Vue de dessus / Couverture — Emprise au sol dalle (19,84 m²)</text>

        {/* Périmètre Dalle béton 6.20m x 3.20m */}
        <rect x="40" y="45" width="320" height="120" fill="#f1f5f9" stroke="#3b82f6" strokeWidth="1.5" rx="2" />

        {/* 4 Armoires CESC Mercury 261 vues de dessus */}
        {[0, 1, 2, 3].map(i => {
            const x = 55 + i * 65;
            return (
                <g key={i}>
                    <rect x={x} y="62" width="55" height="52" fill="#1e293b" stroke="#60a5fa" strokeWidth="1" rx="1" />
                    <text x={x + 27.5} y="90" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="bold">BESS #{i + 1}</text>
                    <text x={x + 27.5} y="102" textAnchor="middle" fill="#93c5fd" fontSize="5">Mercury 261</text>
                </g>
            );
        })}

        {/* Compartiment Poste HTA */}
        <rect x="318" y="62" width="30" height="52" fill="#e2e8f0" stroke="#475569" strokeWidth="1" rx="1" />
        <text x="333" y="90" textAnchor="middle" fill="#0f172a" fontSize="6.5" fontWeight="bold">HTA</text>

        {/* Flèche Nord */}
        <g transform="translate(372, 70)">
            <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <polygon points="0,-10 4,-1 0,-3" fill="#dc2626" />
            <polygon points="0,-10 -4,-1 0,-3" fill="#991b1b" />
            <polygon points="0,10 4,1 0,3" fill="#475569" />
            <polygon points="0,10 -4,1 0,3" fill="#1e293b" />
            <text x="0" y="-12" textAnchor="middle" fill="#dc2626" fontSize="6.5" fontWeight="bold">N</text>
        </g>

        {/* Cotes Longueur et Largeur */}
        <line x1="40" y1="180" x2="360" y2="180" stroke="#2563eb" strokeWidth="1" />
        <line x1="40" y1="176" x2="40" y2="184" stroke="#2563eb" strokeWidth="1" />
        <line x1="360" y1="176" x2="360" y2="184" stroke="#2563eb" strokeWidth="1" />
        <text x="200" y="191" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">Longueur dalle : 6,20 m</text>

        <line x1="22" y1="45" x2="22" y2="165" stroke="#2563eb" strokeWidth="1" />
        <line x1="18" y1="45" x2="26" y2="45" stroke="#2563eb" strokeWidth="1" />
        <line x1="18" y1="165" x2="26" y2="165" stroke="#2563eb" strokeWidth="1" />
        <text x="18" y="108" textAnchor="end" fill="#2563eb" fontSize="7" fontWeight="bold">3,20 m</text>
    </svg>
);

/**
 * PLANCHE DP4 : FAÇADES ET TOITURES (5 Vues 3D / Architecturales HD)
 */
export const PlateFacades = ({ project, captures }) => {
    const safeCaptures = captures || project?.urbanisme_captures || project?.captures || {};
    const safePhotos = project?.photos || project?.pc_photos || {};
    const sud = safeCaptures.facade_sud || safeCaptures.facades_projet || safeCaptures.sud || safePhotos.facade_sud || safePhotos.sud || project?.facade_sud;
    const nord = safeCaptures.facade_nord || safeCaptures.nord || safePhotos.facade_nord || safePhotos.nord || project?.facade_nord;
    const est = safeCaptures.facade_est || safeCaptures.est || safePhotos.facade_est || safePhotos.est || project?.facade_est;
    const ouest = safeCaptures.facade_ouest || safeCaptures.ouest || safePhotos.facade_ouest || safePhotos.ouest || project?.facade_ouest;
    const toiture = safeCaptures.vue_couverture || safeCaptures.toiture || safeCaptures.dessus || safeCaptures.section || safePhotos.vue_couverture || safePhotos.dessus || project?.vue_couverture;

    const isBattery = Boolean(
        project?.isBattery ||
        project?.isBatteryStandAlone ||
        project?.solutionType === 'battery' ||
        project?.urbanisme_solutionType === 'battery' ||
        project?.installationType === 'Station Batteries Stand-Alone' ||
        (project?.type || '').toLowerCase().includes('batterie')
    );

    const renderSlot = (src, alt, label, fallbackBessComponent = null) => {
        if (src) {
            return <SafePlateImage src={src} alt={alt} style={{ maxHeight: '92%' }} />;
        }
        if (isBattery && fallbackBessComponent) {
            return fallbackBessComponent;
        }
        return (
            <div style={{ color: '#94a3b8', fontSize: '7pt', fontStyle: 'italic', textAlign: 'center', padding: '2mm' }}>
                {label || 'En attente de capture 3D'}
            </div>
        );
    };

    return (
        <div style={PAGE_STYLE} id="dp-plate-facades">
            <PlateHeader title="DP4 — PLAN DES FAÇADES ET TOITURES / VUES 3D" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', maxHeight: '148mm', marginBottom: '4mm' }}>
                <div style={{ flex: 1.15, display: 'flex', gap: '3.5mm', minHeight: '66mm' }}>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>1. FAÇADE SUD (FACE AVANT)</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            {renderSlot(sud, "Façade Sud", "Façade Sud non capturée", <BessElevationSud showFence={Boolean(safeCaptures.showFence || project?.bessShowFence)} />)}
                        </div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>2. FAÇADE NORD (FACE ARRIÈRE)</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            {renderSlot(nord, "Façade Nord", "Façade Nord non capturée", <BessElevationNord showFence={Boolean(safeCaptures.showFence || project?.bessShowFence)} />)}
                        </div>
                    </div>
                </div>

                <div style={{ flex: 0.95, display: 'flex', gap: '3.5mm', minHeight: '56mm', alignItems: 'stretch' }}>
                    {/* Est */}
                    <div style={{ flex: 1.2, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>3. FAÇADE EST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON GAUCHE)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1.5mm 0.5mm' }}>
                            {renderSlot(est, "Façade Est", "Façade Est non capturée", <BessElevationEst showFence={Boolean(safeCaptures.showFence || project?.bessShowFence)} />)}
                        </div>
                    </div>
                    {/* Ouest */}
                    <div style={{ flex: 1.2, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>4. FAÇADE OUEST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON DROIT &amp; ACCÈS)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1.5mm 0.5mm' }}>
                            {renderSlot(ouest, "Façade Ouest", "Façade Ouest non capturée", <BessElevationOuest showFence={Boolean(safeCaptures.showFence || project?.bessShowFence)} />)}
                        </div>
                    </div>
                    {/* Toiture / Dessus */}
                    <div style={{ flex: 1.35, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#dbeafe', color: '#1e40af', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>5. VUE DU DESSUS / PLAN D'EMPRISE</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1.5mm 0.5mm' }}>
                            {renderSlot(toiture, "Vue Toiture", "Vue Toiture non capturée", <BessElevationToiture showFence={Boolean(safeCaptures.showFence || project?.bessShowFence)} />)}
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
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const safeCaptures = captures || project?.urbanisme_captures || project?.captures || {};
    const photoAvant = safePhotos.avant || safeCaptures.photo_avant || project?.pc_photos?.avant || project?.photos?.avant || '';
    const photoApres = safePhotos.apres || safeCaptures.photo_apres || project?.pc_photos?.apres || project?.photos?.apres || '';

    return (
        <div style={PAGE_STYLE} id="dp-plate-insertion">
            <PlateHeader title="DP6 — DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: '124mm', marginBottom: '6mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#1e293b', lineHeight: '1.25' }}>
                        <div>1. VUE DE L'ÉTAT INITIAL</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(AVANT TRAVAUX)</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm', background: '#ffffff' }}>
                        {photoAvant ? (
                            <SafePlateImage src={photoAvant} alt="État Initial (Avant Travaux)" />
                        ) : (
                            <div style={{ color: '#94a3b8', fontSize: '8pt', fontStyle: 'italic', textAlign: 'center', padding: '4mm' }}>
                                En attente de photographie de terrain (État initial)
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2mm', background: '#dcfce7', borderBottom: '1px solid #86efac', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#166534', lineHeight: '1.25' }}>
                        <div>2. VUE APRÈS PROJET</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#15803d', marginTop: '1px' }}>(SIMULATION 3D D'INSERTION PAYSAGÈRE)</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm', background: '#ffffff' }}>
                        {photoApres ? (
                            <SafePlateImage src={photoApres} alt="Vue après projet (Simulation 3D)" />
                        ) : (
                            <div style={{ color: '#94a3b8', fontSize: '8pt', fontStyle: 'italic', textAlign: 'center', padding: '4mm' }}>
                                En attente de simulation 3D (Insertion paysagère)
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnv = ({ project, captures, photos, includeLointain = true }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    // Rendu conditionnel strict : uniquement les photos importées par l'utilisateur (AUCUN fallback satellite)
    const photoProche = safePhotos.proche || project?.pc_photos?.proche || project?.photos?.proche || '';
    const photoLointain = safePhotos.lointain || project?.pc_photos?.lointain || project?.photos?.lointain || '';
    const showBoth = Boolean(includeLointain && (photoLointain || project?.hasLointain));

    return (
        <div style={PAGE_STYLE} id="dp-plate-env">
            <PlateHeader 
                title={showBoth ? "DP7 & DP8 : ENVIRONNEMENT PROCHE ET LOINTAIN" : "DP7 — PHOTOGRAPHIE DE L'ENVIRONNEMENT PROCHE"} 
                project={project} 
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                        DP7 — Photographie dans l'environnement proche
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm', background: '#ffffff' }}>
                        {photoProche ? (
                            <SafePlateImage src={photoProche} alt="Environnement Proche" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', fontSize: '8pt', fontStyle: 'italic' }}>
                                <span>Emplacement réservé à la photographie de l'environnement proche</span>
                                <span style={{ fontSize: '7pt', color: '#cbd5e1' }}>(Aucune photo importée)</span>
                            </div>
                        )}
                    </div>
                </div>

                {showBoth && (
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            DP8 — Photographie dans le paysage lointain
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm', background: '#ffffff' }}>
                            {photoLointain ? (
                                <SafePlateImage src={photoLointain} alt="Paysage Lointain" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', fontSize: '8pt', fontStyle: 'italic' }}>
                                    <span>Emplacement réservé à la photographie du paysage lointain</span>
                                    <span style={{ fontSize: '7pt', color: '#cbd5e1' }}>(Aucune photo importée)</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvProche = ({ project, captures, photos }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const photoProche = safePhotos.proche || project?.pc_photos?.proche || project?.photos?.proche || '';
    return (
        <div style={PAGE_STYLE} id="dp-plate-env-proche">
            <PlateHeader title="DP7 — PHOTOGRAPHIE DE L'ENVIRONNEMENT PROCHE" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '145mm', marginBottom: '5mm' }}>
                <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                    DP7 — Photographie dans l'environnement proche
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '2mm', background: '#ffffff' }}>
                    {photoProche ? (
                        <SafePlateImage src={photoProche} alt="Environnement Proche" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', fontSize: '8.5pt', fontStyle: 'italic' }}>
                            <span>Emplacement réservé à la photographie de l'environnement proche</span>
                            <span style={{ fontSize: '7.5pt', color: '#cbd5e1' }}>(Aucune photo importée)</span>
                        </div>
                    )}
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateInsertionNotice = ({ project, noticeText }) => {
    const defaultDesc = `Installation d'une structure ombrière photovoltaïque recevant une centrale solaire intégrée en toiture d'une puissance de ${project?.kwc || 100} kWc.`;
    const fullText = noticeText || project?.noticeText || project?.description || defaultDesc;

    return (
        <div style={PAGE_STYLE} id="dp-plate-notice-insertion">
            <PlateHeader title="DP11 — NOTICE DESCRIPTIVE DES TRAVAUX" project={project} showBranding={true} />
            <div style={{ flex: 1, padding: '5mm 8mm', overflowY: 'hidden', fontSize: '9pt', lineHeight: '1.4', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', maxHeight: '135mm', marginBottom: '5mm', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#00429d', marginBottom: '2mm' }}>Objet & Notice descriptive du Projet</h3>
                <div style={{ flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '8.5pt', lineHeight: '1.45', color: '#334155' }}>
                    {fullText}
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
                        src={getProxiedImageUrl(batteryPhoto || project?.urbanisme_captures?.facades_projet || "https://nelsonpv.fr/mercury_product_photo.jpg")} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff' }} 
                        alt="Aspect extérieur" 
                        crossOrigin="anonymous"
                    />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvLointain = ({ project, captures, photos }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const photoLointain = safePhotos.lointain || project?.pc_photos?.lointain || project?.photos?.lointain || '';
    return (
        <div style={PAGE_STYLE} id="dp-plate-env-lointain">
            <PlateHeader title="DP8 — PHOTOGRAPHIE DU PAYSAGE LOINTAIN" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '145mm', marginBottom: '5mm' }}>
                <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                    DP8 — Photographie dans le paysage lointain
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '2mm', background: '#ffffff' }}>
                    {photoLointain ? (
                        <SafePlateImage src={photoLointain} alt="Paysage Lointain" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', fontSize: '8.5pt', fontStyle: 'italic' }}>
                            <span>Emplacement réservé à la photographie du paysage lointain</span>
                            <span style={{ fontSize: '7.5pt', color: '#cbd5e1' }}>(Aucune photo importée)</span>
                        </div>
                    )}
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

const LOGO_ENR_COURTAGE_BASE64 = "data:image/png;base64,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";

function resolveBessNoticeInfo(project = {}, docType = 'dp') {
    const odreSite = findBessOdreData(
        project?.name || project?.client_name || project?.clientName || project?.id,
        project?.city || project?.commune,
        project?.address,
        project?.lat,
        project?.lng
    );

    const names = resolveDemandeurNames(project);
    const rawLast = (project?.dp_config?.declarant?.nom || names?.lastName || project?.lastName || project?.name || 'BAILLEUR').trim();
    const rawFirst = (project?.dp_config?.declarant?.prenom || names?.firstName || project?.firstName || '').trim();

    let demandeur = (project?.demandeur || '').trim();
    if (!demandeur || demandeur === rawLast) {
        let civ = (project?.civilite || '').trim();
        if (!civ) {
            if (/bertrandie/i.test(rawLast)) civ = 'M.';
            else if (/duport|michaud/i.test(rawLast)) civ = 'Mme';
        }
        demandeur = `${civ ? civ + ' ' : ''}${rawLast.toUpperCase()}${rawFirst ? ' ' + rawFirst : ''}`.trim();
    }

    const commune = (
        project?.dp_config?.terrain?.ville ||
        project?.commune ||
        project?.city ||
        project?.cadastre_commune ||
        odreSite?.commune ||
        'COMMUNE'
    ).trim();

    const cp = String(
        project?.dp_config?.terrain?.code_postal ||
        project?.zip ||
        project?.postalCode ||
        project?.code_postal ||
        odreSite?.codePostal ||
        ''
    ).trim();

    const rawAddress = (
        project?.dp_config?.terrain?.adresse ||
        project?.address ||
        project?.adresse ||
        ''
    ).trim();

    let adresse = rawAddress;
    if (!adresse) {
        adresse = `${cp ? cp + ' ' : ''}${commune.toUpperCase()}`;
    } else if (!adresse.toLowerCase().includes(commune.toLowerCase())) {
        adresse = `${adresse}, ${cp ? cp + ' ' : ''}${commune.toUpperCase()}`;
    }

    const rawParcelles = (Array.isArray(project?.parcelles) && project.parcelles.length > 0)
        ? project.parcelles
        : (Array.isArray(project?.cadastre_parcelles) && project.cadastre_parcelles.length > 0)
            ? project.cadastre_parcelles
            : [];

    const primarySection = (
        project?.dp_config?.terrain?.section ||
        project?.cadastre_section ||
        project?.section ||
        rawParcelles[0]?.section ||
        odreSite?.section ||
        'A'
    ).trim();

    const primaryNumero = (
        project?.dp_config?.terrain?.parcelle ||
        project?.cadastre_numero ||
        project?.numero ||
        rawParcelles[0]?.numero ||
        odreSite?.numero ||
        '1'
    ).trim();

    const parcelleStr = rawParcelles.length > 1
        ? `Parcelles ${rawParcelles.map(p => `${(p.section || '').trim()} ${(p.numero || '').trim()}`.trim()).filter(Boolean).join(', ')}`
        : `Parcelle ${primarySection} ${primaryNumero}`;

    let numDossier = (
        project?.numero_dp ||
        project?.dp_number ||
        project?.urbanisme_number ||
        ''
    ).trim();
    if (!numDossier) {
        if (/monestier/i.test(commune) && primaryNumero === '319') {
            numDossier = 'DP 024 276 26 00012';
        } else if (/cassien/i.test(commune) && primaryNumero === '331') {
            numDossier = 'DP 024 384 26 00005';
        }
    }

    const typePrefix = docType === 'pc' ? 'PC' : 'DP';
    const cadastre = numDossier
        ? `${parcelleStr} • ${numDossier}`
        : `${parcelleStr} • Dossier ${typePrefix}`;

    const refP2 = `Réf. : ${commune.toUpperCase()} (${parcelleStr}${numDossier ? ` • ${numDossier}` : ''})`;

    const puissanceKw = project?.dp_config?.technique?.puissance_kw || 500;
    const capaciteKwh = project?.dp_config?.technique?.capacite_kwh || 1044;
    const installation = `BESS ${puissanceKw} kW / ${capaciteKwh.toLocaleString('fr-FR')} kWh (< 20 m²)`;

    const deptCode = cp.length >= 2 ? cp.substring(0, 2) : (project?.cadastre_code_insee ? String(project.cadastre_code_insee).substring(0, 2) : '24');
    const sdisLabel = deptCode && /^\d{2,3}$/.test(deptCode) ? `SDIS ${deptCode}` : 'SDIS';

    const communeFormatted = commune.charAt(0).toUpperCase() + commune.slice(1).toLowerCase();
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const lieuDate = `${communeFormatted}, le ${dateStr}`;

    return {
        demandeur,
        signataire: demandeur,
        adresse,
        cadastre,
        refP2,
        installation,
        sdisLabel,
        lieuDate,
        typePrefix,
        isPC: docType === 'pc'
    };
}

export const PlateNoticeSecuriteIncendieBess = ({ project, docType = 'dp', page = 1 }) => {
    const info = resolveBessNoticeInfo(project, docType);

    const portraitPageStyle = {
        width: '210mm',
        height: '297mm',
        padding: '10mm 12mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
    };

    if (page === 1) {
        return (
            <div style={portraitPageStyle} data-portrait="true">
                <div>
                    {/* EN-TÊTE OFFICIEL */}
                    <header className="flex items-start justify-between pb-3.5 border-b-2 border-slate-900 mb-4">
                        <div className="flex flex-col items-start">
                            <img
                                src={LOGO_ENR_COURTAGE_BASE64}
                                alt="ENR COURTAGE"
                                style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }}
                            />
                            <div className="mt-1">
                                <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                    Ingénierie &amp; Infrastructures de Stockage Réseau
                                </div>
                                <div className="text-[8.5px] text-slate-500 mt-0.5">
                                    7 Rue Gutenberg, 33700 Mérignac • SIREN 881 890 982
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="inline-block px-2.5 py-1 rounded bg-rose-100 text-rose-900 border border-rose-300 text-[9.5px] font-extrabold uppercase tracking-wider">
                                PIÈCE COMPLÉMENTAIRE {info.typePrefix} • SÉCURITÉ INCENDIE
                            </span>
                            <div className="text-[9.5px] font-bold text-slate-700 mt-1">
                                Justification Article R.111-2 du Code de l'urbanisme
                            </div>
                            <div className="text-[8.5px] text-slate-500">
                                Prévention du risque feux de forêt (DFCI) &amp; Dispositions SDIS
                            </div>
                        </div>
                    </header>

                    {/* BANDEAU TITRE & IDENTIFICATION DU PROJET */}
                    <div className="bg-slate-900 text-white rounded-xl p-4 mb-4">
                        <div className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">
                            {info.isPC
                                ? 'ANNEXE TECHNIQUE AU PERMIS DE CONSTRUIRE'
                                : 'ANNEXE TECHNIQUE À LA DÉCLARATION PRÉALABLE DE TRAVAUX'}
                        </div>
                        <h1 className="text-[15px] font-black uppercase tracking-tight leading-snug text-white">
                            NOTICE DE SÉCURITÉ INCENDIE, PRÉVENTION DU RISQUE FEUX DE FORÊT (DFCI) &amp; DISPOSITIONS D'INTERVENTION SDIS
                        </h1>
                        <div className="mt-3 pt-2.5 border-t border-slate-700 grid grid-cols-4 gap-3 text-[10.5px]">
                            <div>
                                <span className="text-slate-400 text-[8.5px] uppercase font-bold block">Demandeur / Pétitionnaire</span>
                                <strong className="text-white font-bold block mt-0.5">{info.demandeur}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[8.5px] uppercase font-bold block">Commune &amp; Adresse</span>
                                <strong className="text-white font-bold block mt-0.5">{info.adresse}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[8.5px] uppercase font-bold block">Référence Cadastrale &amp; {info.typePrefix}</span>
                                <strong className="text-amber-300 font-bold font-mono block mt-0.5">{info.cadastre}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[8.5px] uppercase font-bold block">Installation projetée</span>
                                <strong className="text-emerald-400 font-bold block mt-0.5">{info.installation}</strong>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 1 : OBJET ET CADRE RÉGLEMENTAIRE */}
                    <section className="mb-4">
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                            <span className="w-5 h-5 rounded bg-slate-900 text-white text-[10.5px] font-black flex items-center justify-center">1</span>
                            <h2 className="text-[11.5px] font-black uppercase tracking-wider text-slate-900">
                                Objet de la Notice &amp; Conformité à l'Article R.111-2 du Code de l'Urbanisme
                            </h2>
                        </div>
                        <p className="text-[10.5px] text-slate-700 leading-relaxed text-justify">
                            La présente notice technique détaille l'ensemble des dispositifs constructifs, technologiques et opérationnels de sécurité incendie intégrés au projet d'implantation d'une unité compacte de stockage d'énergie par batteries stationnaires (<em>BESS Stand-Alone</em>) d'une puissance nominale de <strong>500 kW</strong> (capacité <strong>1 044 kWh</strong>), installée sur une dalle en béton armé incombustible de <strong>19,84 m²</strong> (&lt; 20 m²) raccordée au réseau public HTA 20 kV.
                        </p>
                        <p className="text-[10.5px] text-slate-700 leading-relaxed text-justify mt-1.5">
                            Lorsque le terrain d'assiette est situé dans la bande de 200 mètres d'un massif forestier répertorié sensible au risque d'incendie de forêt, l'<strong>article R.111-2 du Code de l'urbanisme</strong> prévoit que le projet peut être accepté <em>« sous réserve de l'observation de prescriptions spéciales »</em> garantissant la sécurité publique. La présente notice établit formellement ces prescriptions selon une triple barrière de protection : <strong>(1) Confinement intrinsèque à la source sans flamme externe</strong>, <strong>(2) Coupure minérale incombustible et débroussaillement OLD sur 50 mètres</strong>, et <strong>(3) Dispositifs dédiés d'accès et de coupure d'urgence pour le SDIS</strong>.
                        </p>
                    </section>

                    {/* SECTION 2 : CARACTÉRISTIQUES TECHNIQUES & STABILITÉ THERMIQUE LFP */}
                    <section className="mb-4">
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                            <span className="w-5 h-5 rounded bg-slate-900 text-white text-[10.5px] font-black flex items-center justify-center">2</span>
                            <h2 className="text-[11.5px] font-black uppercase tracking-wider text-slate-900">
                                Caractéristiques Techniques &amp; Sécurité Intrinsèque des Armoires (Chimie LFP)
                            </h2>
                        </div>
                        <p className="text-[10.5px] text-slate-700 leading-relaxed mb-2">
                            L'installation ne comporte aucun bâtiment clos visitable ni local recevant du public. Elle est constituée de <strong>4 armoires métalliques extérieures autonomes</strong> de marque <strong>CESC / SolaX Power – Modèle Mercury 261</strong> (125 kW / 261 kWh par armoire) :
                        </p>

                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-left border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-extrabold uppercase text-[9px]">
                                        <th className="py-1.5 px-3 w-1/3">Paramètre de Sécurité</th>
                                        <th className="py-1.5 px-3">Spécification Technique Certifiée</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-700">
                                    <tr>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-50/60">Configuration &amp; Gabarit</td>
                                        <td className="py-1.5 px-3">4 armoires métalliques extérieures monoblocs sur dalle béton (Dimensions unitaires : L 1,15 m × P 1,44 m × H 2,38 m).</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-50/60">Chimie des Cellules</td>
                                        <td className="py-1.5 px-3"><strong className="text-emerald-700">LiFePO4 (Lithium-Fer-Phosphate – LFP)</strong> sans nickel ni cobalt. Chimie la plus stable de l'industrie (seuil de décomposition thermique &gt; 270 °C contre 150 °C en NMC, liaison covalente P-O empêchant toute libération d'oxygène).</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-50/60">Enveloppe &amp; Étanchéité</td>
                                        <td className="py-1.5 px-3">Acier galvanisé thermolaqué incombustible (<strong>Classe A1 / M0</strong>), indice de protection <strong>IP55 / IP66</strong> (armoire) et <strong>IP67</strong> (modules), interdisant toute projection d'escarbilles, de gouttelettes ou d'arc électrique vers l'extérieur.</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-50/60">Refroidissement Actif</td>
                                        <td className="py-1.5 px-3">Régulation thermique par <strong>refroidissement liquide (Liquide HVAC)</strong> maintenant les cellules entre 20 °C et 25 °C et éliminant tout point chaud.</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-50/60">Normes &amp; Certifications Feux</td>
                                        <td className="py-1.5 px-3"><strong className="text-slate-900">UL 9540A</strong> (Essai de non-propagation d'emballement thermique entre cellules), <strong className="text-slate-900">NFPA 855</strong> (Standard de protection incendie des systèmes BESS), <strong>CEI 62619</strong>, <strong>CEI 62933-5-2</strong>, <strong>UN 38.3</strong>.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* SECTION 3 : SYSTÈME D'EXTINCTION AUTOMATIQUE INTÉGRÉ */}
                    <section>
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                            <span className="w-5 h-5 rounded bg-slate-900 text-white text-[10.5px] font-black flex items-center justify-center">3</span>
                            <h2 className="text-[11.5px] font-black uppercase tracking-wider text-slate-900">
                                Système Intégré de Détection Précoce &amp; d'Extinction Automatique (Norme NFPA 855)
                            </h2>
                        </div>
                        <p className="text-[10.5px] text-slate-700 leading-relaxed mb-2">
                            Chaque armoire CESC Mercury 261 embarque nativement une défense incendie active autonome à <strong>4 niveaux de sécurité redondants</strong> :
                        </p>

                        <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                                <strong className="text-slate-900 block mb-0.5">1. Surveillance BMS 24h/24 à la milliseconde</strong>
                                <span className="text-slate-600 leading-snug block">Contrôle continu de la tension, du courant et de la température de chaque cellule. Coupure galvanique instantanée au moindre écart avant toute surchauffe.</span>
                            </div>
                            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                                <strong className="text-slate-900 block mb-0.5">2. Détection précoce multi-capteurs (Gaz / Fumée / T°)</strong>
                                <span className="text-slate-600 leading-snug block">Capteurs de gaz de dégazage précoce (H₂ et CO), détecteurs optiques de fumée et sondes thermiques vélocimétriques intégrés dans chaque compartiment.</span>
                            </div>
                            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                                <strong className="text-slate-900 block mb-0.5">3. Évents de décompression &amp; anti-déflagration</strong>
                                <span className="text-slate-600 leading-snug block">Soupapes de surpression calibrées et ventilation d'extraction ATEX évitant toute accumulation gazeuse interne.</span>
                            </div>
                            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50">
                                <strong className="text-rose-900 block mb-0.5">4. Extinction automatique par Aérosol NFPA 855</strong>
                                <span className="text-slate-700 leading-snug block">Déclenchement automatique d'un <strong>générateur d'aérosol ignifuge condensé</strong> étouffant instantanément tout départ de feu à l'intérieur de l'enveloppe close, sans flamme extérieure.</span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* PIED DE PAGE 1 */}
                <footer className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500 mt-3">
                    <div><strong>ENR COURTAGE SAS</strong> • Notice de Sécurité Incendie &amp; DFCI (Art. R.111-2 du Code de l'urbanisme)</div>
                    <div className="font-mono font-bold">Page 1 / 2</div>
                </footer>
            </div>
        );
    }

    // PAGE 2
    return (
        <div style={portraitPageStyle} data-portrait="true">
            <div>
                {/* RAPPEL EN-TÊTE PAGE 2 */}
                <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-slate-200 text-[9.5px] text-slate-500">
                    <span className="font-bold text-slate-800 uppercase">
                        Notice de Sécurité Incendie &amp; DFCI / SDIS — Station BESS 500 kW / 1 044 kWh
                    </span>
                    <span className="font-mono font-semibold text-slate-700">{info.refP2}</span>
                </div>

                {/* SECTION 4 : AMÉNAGEMENT DU SITE ET COUPURE DE COMBUSTIBLE DFCI */}
                <section className="mb-4">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white text-[10.5px] font-black flex items-center justify-center">4</span>
                        <h2 className="text-[11.5px] font-black uppercase tracking-wider text-slate-900">
                            Aménagement du Site &amp; Coupure de Combustible DFCI (Prescriptions Spéciales R.111-2)
                        </h2>
                    </div>
                    <p className="text-[10.5px] text-slate-700 leading-relaxed mb-3">
                        Bien que le projet soit implanté au sein d'un secteur agricole déjà anthropisé et entretenu (hors massif boisé), le maître d'ouvrage met en œuvre une <strong>triple coupure de combustible minérale et végétale</strong> supprimant tout risque d'éclosion ou de propagation vers l'environnement :
                    </p>

                    <div className="grid grid-cols-12 gap-4 items-center mb-2">
                        {/* Liste des 4 barrières physiques */}
                        <div className="col-span-7 space-y-2 text-[10px]">
                            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
                                <strong className="text-slate-900">A. Socle 100 % minéral incombustible (Dalle béton A1 / M0) :</strong>
                                <p className="text-slate-600 mt-0.5">Les 4 armoires reposent sur une dalle pleine en béton armé de <strong>6,20 m × 3,20 m (19,84 m²)</strong>, surélevée de 15 cm par rapport au terrain naturel.</p>
                            </div>
                            <div className="p-2 rounded-lg border border-amber-200 bg-amber-50/40">
                                <strong className="text-amber-950">B. Ceinture stérile en graviers concassés sur 2,00 mètres :</strong>
                                <p className="text-slate-700 mt-0.5">Une bande périphérique de <strong>2,00 m de largeur tout autour de la dalle béton</strong> est intégralement décapée, équipée d'un feutre géotextile anti-végétation et recouverte de <strong>graviers concassés minéraux incombustibles (ép. 10 cm)</strong>. Aucune herbe sèche ne peut se trouver au contact de la station.</p>
                            </div>
                            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
                                <strong className="text-slate-900">C. Clôture rigide périmétrique de sécurité (H 2,00 m) :</strong>
                                <p className="text-slate-600 mt-0.5">Enceinte en panneaux treillis soudés rigides thermolaqués (RAL 6005) avec portillon verrouillé interdisant toute intrusion.</p>
                            </div>
                            <div className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/40">
                                <strong className="text-emerald-950">D. Obligations Légales de Débroussaillement (OLD — Rayon 50 m) :</strong>
                                <p className="text-slate-700 mt-0.5">Maintien permanent d'une <strong>zone débroussaillée de 50 mètres de rayon</strong> autour de l'installation (fauchage régulier, absence de broussailles ou de stockage de matériaux combustibles, mise à distance des houppiers).</p>
                            </div>
                        </div>

                        {/* Schéma technique SVG de la coupe / vue en plan DFCI */}
                        <div className="col-span-5 border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-center">
                            <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-600 mb-2 text-center">
                                Schéma de Principe — Ceinture Incombustible DFCI
                            </span>
                            <svg viewBox="0 0 280 210" className="w-full h-auto max-w-[245px]">
                                <rect x="6" y="6" width="268" height="198" rx="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
                                <text x="140" y="20" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#047857">ZONE DÉBROUSSAILLÉE ENTRETENUE (OLD 50m)</text>

                                <rect x="34" y="32" width="212" height="142" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                                <text x="140" y="45" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#b45309">BANDE STÉRILE GRAVIERS MINÉRAUX (2,00 m)</text>

                                <rect x="58" y="56" width="164" height="90" rx="3" fill="#e2e8f0" stroke="#15803d" strokeWidth="2.5" />
                                <text x="140" y="68" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#1e293b">DALLE BÉTON ARMÉ INCOMBUSTIBLE A1 (19,84 m²)</text>

                                <g fill="#0f172a" stroke="#38bdf8" strokeWidth="1">
                                    <rect x="68" y="76" width="32" height="44" rx="2" />
                                    <rect x="105" y="76" width="32" height="44" rx="2" />
                                    <rect x="142" y="76" width="32" height="44" rx="2" />
                                    <rect x="179" y="76" width="32" height="44" rx="2" />
                                </g>
                                <g fontSize="6.5" fontWeight="bold" fill="#ffffff" textAnchor="middle">
                                    <text x="84" y="96">BESS 1</text><text x="84" y="105" fill="#fde047">125 kW</text>
                                    <text x="121" y="96">BESS 2</text><text x="121" y="105" fill="#fde047">125 kW</text>
                                    <text x="158" y="96">BESS 3</text><text x="158" y="105" fill="#fde047">125 kW</text>
                                    <text x="195" y="96">BESS 4</text><text x="195" y="105" fill="#fde047">125 kW</text>
                                </g>

                                <rect x="122" y="143" width="36" height="6" fill="#22c55e" />
                                <circle cx="172" cy="146" r="5" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
                                <text x="140" y="160" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#dc2626">Portillon d'accès + Coupure Pompier (AU)</text>

                                <rect x="34" y="180" width="212" height="18" rx="2" fill="#94a3b8" />
                                <text x="140" y="192" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#ffffff">VOIE CARROSSABLE D'ACCÈS ENGINS SDIS (≥ 3,00 m)</text>
                            </svg>
                        </div>
                    </div>
                </section>

                {/* SECTION 5 : DISPOSITIONS OPÉRATIONNELLES POUR LE SDIS */}
                <section className="mb-4">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white text-[10.5px] font-black flex items-center justify-center">5</span>
                        <h2 className="text-[11.5px] font-black uppercase tracking-wider text-slate-900">
                            Accessibilité &amp; Dispositions Opérationnelles dédiées aux Services de Secours ({info.sdisLabel})
                        </h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-[10px]">
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                            <strong className="text-slate-900 block mb-1">🚒 Desserte &amp; Accès Engins</strong>
                            <p className="text-slate-600 leading-snug">Implantation en bordure immédiate d'une voie carrossable (largeur ≥ 3,00 m, hauteur libre ≥ 3,50 m, portance 16 tonnes) permettant le stationnement d'un fourgon d'incendie à moins de 10 m.</p>
                        </div>
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                            <strong className="text-rose-700 block mb-1">🛑 Coupure d'Urgence Pompier</strong>
                            <p className="text-slate-600 leading-snug">Bouton d'<strong>Arrêt d'Urgence (AU) général sous boîtier bris de glace</strong> positionné en limite extérieure de clôture, assurant l'isolement galvanique instantané des batteries et du réseau HTA Enedis.</p>
                        </div>
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                            <strong className="text-slate-900 block mb-1">📞 Affichage &amp; Astreinte 24/7</strong>
                            <p className="text-slate-600 leading-snug">Panneau inaltérable sur le portillon indiquant la chimie LFP, le schéma unifilaire de coupure, les consignes d'intervention SDIS et le numéro d'astreinte télésurveillance 24h/24.</p>
                        </div>
                    </div>
                </section>

                {/* SECTION 6 : ENGAGEMENT FORMEL DU PÉTITIONNAIRE */}
                <section className="p-4 rounded-xl border-2 border-slate-900 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                            6. Engagement Formel du Pétitionnaire (Application de l'Article R.111-2 du Code de l'Urbanisme)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[8.5px] font-extrabold border border-emerald-300">
                            ENGAGEMENT FERME &amp; OPPOSABLE
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-700 leading-relaxed text-justify">
                        Le demandeur et la société <strong>ENR COURTAGE SAS</strong> s'engagent expressément à mettre en œuvre et à maintenir pendant toute la durée d'exploitation de la station BESS l'intégralité des mesures de sécurité décrites dans la présente notice : <strong>(1) Utilisation exclusive d'armoires certifiées LFP avec extinction automatique par aérosol NFPA 855 intégrée</strong>, <strong>(2) Dalle en béton armé incombustible entourée d'une bande stérile de graviers minéraux de 2,00 m</strong>, <strong>(3) Respect permanent des Obligations Légales de Débroussaillement (OLD) dans un rayon de 50 mètres</strong>, et <strong>(4) Installation d'une coupure d'urgence externe accessible au SDIS</strong>. Le demandeur accepte que ces dispositions soient inscrites à titre de <strong>prescriptions spéciales</strong> dans l'arrêté {info.isPC ? 'accordant le Permis de Construire' : 'de non-opposition à la Déclaration Préalable'}.
                    </p>
                </section>
            </div>

            {/* PIED DE PAGE 2 */}
            <footer className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500 mt-3">
                <div><strong>ENR COURTAGE SAS</strong> • 7 Rue Gutenberg, 33700 Mérignac • contact@enr-courtage.fr • 07.63.87.71.40</div>
                <div className="font-mono font-bold">Page 2 / 2</div>
            </footer>
        </div>
    );
};

export const PlateNotice = ({ project, captures }) => (
    <PlateInsertionNotice project={project} />
);
