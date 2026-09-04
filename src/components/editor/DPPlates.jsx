import React from 'react';
import { getInstallationTypeInfo } from '@/services/UrbanismeDocService';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { resolveDemandeurNames } from '@/services/SmartCerfaService';

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
    const isNoBattery = isAcama || isGreenInvest;

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
    const isNoBattery = isAcama || isGreenInvest;
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
                            {project?.description || (isNoBattery ? `Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque d'une puissance de ${project?.kwc || 100} kWc.` : `Installation d'une ombrière photovoltaïque en structure métallique d'une puissance de ${project?.kwc || 100} kWc.`)}
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
    const isNoBattery = isAcama || isGreenInvest;

    const rawBuildings = project?.buildings && Array.isArray(project.buildings) && project.buildings.length > 0
        ? project.buildings
        : [{
            name: isNoBattery ? (isAcama ? 'Bâtiment 1' : 'Ombrière 1') : 'Ombrière 1',
            length: Number(project?.longueur || 30),
            width: Number(project?.largeur || 20),
            masse_capture: captures?.masse_projet || captures?.satellite
        }];

    const isMulti = rawBuildings.length > 1;

    return (
        <div style={PAGE_STYLE} id={`dp-plate-masse${viewNumber === 2 ? '-vue2' : ''}`}>
            <PlateHeader 
                title={viewNumber === 2 
                    ? "DP2 — PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS (Vue 2 — Zoom étendu)" 
                    : "DP2 — PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS"} 
                project={project} 
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                {isMulti ? (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rawBuildings.length, 2)}, 1fr)`, gap: '4mm', flex: 1, height: '100%' }}>
                        {rawBuildings.map((b, idx) => {
                            const bPhoto = (viewNumber === 2 ? (b.masse_capture_2 || captures?.masse_projet_2) : null) || b.masse_capture || (idx === 0 ? captures?.masse_projet : null) || captures?.satellite;
                            let bLen = Number(b.length || (b.bayCount || 5) * (b.baySpacing || 7.5) || project?.longueur || 30);
                            let bW = Number(b.totalWidth || b.width || project?.largeur || 20);
                            if (isNoBattery && (bW <= 6.0 || bLen <= 6.0)) {
                                bLen = Math.max(bLen, 30);
                                bW = Math.max(bW, 15);
                            }
                            const bArea = Math.round(bLen * bW);
                            let bDisplayName = b.name || (isAcama ? `Bâtiment ${idx + 1}` : `Ombrière ${idx + 1}`);
                            if (isNoBattery) {
                                bDisplayName = bDisplayName.replace(/Station Batteries[^\)]*\)?/gi, isAcama ? 'Bâtiment' : 'Ombrière');
                            }
                            bDisplayName = bDisplayName
                                .replace(/Bâtiment/gi, isAcama ? 'Bâtiment' : 'Ombrière')
                                .replace(/Ombrière/gi, isAcama ? 'Bâtiment' : 'Ombrière')
                                .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
                                .trim();
                            if (!bDisplayName) bDisplayName = isAcama ? `Bâtiment ${idx + 1}` : `Ombrière ${idx + 1}`;

                            const bZoom = (viewNumber === 2 ? (b.masse_zoom_2 || project?.masse_zoom_2 || captures?.masse_zoom_2) : null) || b.masse_zoom || project?.masse_zoom || captures?.masse_zoom || 18;

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
                                </div>
                            );
                        })}
                    </div>
                ) : (() => {
                    const b = rawBuildings[0];
                    const bPhoto = (viewNumber === 2 ? (b?.masse_capture_2 || captures?.masse_projet_2) : null) || b?.masse_capture || captures?.masse_projet || captures?.satellite;
                    let bLen = Number(b?.length || (b?.bayCount || 5) * (b?.baySpacing || 7.5) || project?.longueur || 30);
                    let bW = Number(b?.totalWidth || b?.width || project?.largeur || 20);
                    if (isNoBattery && (bW <= 6.0 || bLen <= 6.0)) {
                        bLen = Math.max(bLen, 30);
                        bW = Math.max(bW, 15);
                    }
                    const bArea = Math.round(bLen * bW);
                    let bDisplayName = b?.name || (isAcama ? 'Bâtiment 1' : 'Ombrière 1');
                    if (isNoBattery) {
                        bDisplayName = bDisplayName.replace(/Station Batteries[^\)]*\)?/gi, isAcama ? 'Bâtiment' : 'Ombrière');
                    }
                    bDisplayName = bDisplayName
                        .replace(/Bâtiment/gi, isAcama ? 'Bâtiment' : 'Ombrière')
                        .replace(/Ombrière/gi, isAcama ? 'Bâtiment' : 'Ombrière')
                        .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
                        .trim();
                    if (!bDisplayName) bDisplayName = isAcama ? 'Bâtiment 1' : 'Ombrière 1';

                    const bZoom = (viewNumber === 2 ? (b?.masse_zoom_2 || project?.masse_zoom_2 || captures?.masse_zoom_2) : null) || b?.masse_zoom || project?.masse_zoom || captures?.masse_zoom || 18;

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
    const isNoBattery = isAcama || isGreenInvest;

    let longueur = project?.longueur || project?.length || '30.0';
    let largeur = parseFloat(project?.largeur || project?.width || 20.0);
    let hauteurEgout = parseFloat(project?.hauteur_egout || project?.eaveHeight || 4.0);
    let pente = parseFloat(project?.pente || project?.roofPitch || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);

    if (isNoBattery) {
        if (largeur <= 6.0) largeur = 16.4;
        if (parseFloat(longueur) <= 6.0) longueur = '30.0';
        if (hauteurEgout <= 2.6) hauteurEgout = 4.0;
        if (pente === 0) pente = 10;
    }
    
    let rawType = (project?.buildingType || '').toLowerCase();
    if (isNoBattery && (rawType.includes('battery') || rawType.includes('batterie') || rawType === 'battery_standalone')) {
        rawType = isAcama ? 'symetrique' : 'asymetrique_1';
    }
    const isBattery = !isNoBattery && (rawType.includes('battery') || rawType.includes('batterie') || Boolean(project?.isBattery) || (project?.isBatteryStandAlone === 'Oui') || (project?.type || '').toLowerCase().includes('batterie'));
    
    if (isBattery) {
        const bQty = Number(project?.battery_quantity || project?.batteryStorage?.quantity || 1) || 1;
        const bLen = Number(project?.batteryStorage?.dalleLength || project?.longueur || Math.max(6.0, bQty * 3.2 + 3.0));
        const bModel = project?.battery_model || project?.batteryStorage?.model || 'BESS Stand-Alone';
        const bPower = Number(project?.kwc || project?.puissance || project?.batteryStorage?.powerKw || (bQty * 125));

        return (
            <div style={{ height: boxHeight, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: isMulti ? '1mm 3.5mm' : '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                    <span style={{ fontSize: isMulti ? '8pt' : '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                        DP3 — COUPE DE TERRAIN &amp; DES INSTALLATIONS (COUPE TRANSVERSALE {coupeLetter}) — CENTRALE DE STOCKAGE BATTERIES
                    </span>
                    <span style={{ fontSize: isMulti ? '6.5pt' : '7pt', color: '#64748b' }}>
                        {bQty}× {bModel} ({bPower} kW) • Dalle {bLen.toFixed(2)}m × 6.00m • Échelle indicative
                    </span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <svg viewBox="0 0 700 165" style={{ width: '100%', height: '100%', maxHeight: '160px' }}>
                        <defs>
                            <linearGradient id="c-bat-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#334155" />
                                <stop offset="100%" stopColor="#1e293b" />
                            </linearGradient>
                        </defs>
                        <line x1="20" y1="130" x2="680" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
                        <text x="30" y="142" fill="#64748b" fontSize="6.5" fontStyle="italic">Terrain Naturel TN ±0.00</text>
                        <text x="670" y="142" textAnchor="end" fill="#64748b" fontSize="6.5" fontStyle="italic">Terrain plat conservé</text>

                        <rect x="160" y="122" width="380" height="8" fill="#94a3b8" stroke="#475569" strokeWidth="1" rx="0.5" />
                        <text x="350" y="128" textAnchor="middle" fill="#1e293b" fontSize="5.5" fontWeight="bold">Dalle béton armé étanche avec bac de rétention</text>

                        {Array.from({ length: Math.min(4, bQty) }).map((_, idx) => {
                            const cw = Math.min(65, 260 / Math.min(4, bQty));
                            const cx = 185 + idx * (cw + 12);
                            return (
                                <g key={idx}>
                                    <rect x={cx} y="55" width={cw} height="67" fill="url(#c-bat-grad)" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
                                    <rect x={cx + 4} y="50" width={cw - 8} height="5" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" rx="1" />
                                    <line x1={cx + cw / 2} y1="55" x2={cx + cw / 2} y2="122" stroke="#475569" strokeWidth="0.8" />
                                    <circle cx={cx + cw / 2 - 3} cy="88" r="1.5" fill="#facc15" />
                                    <circle cx={cx + cw / 2 + 3} cy="88" r="1.5" fill="#facc15" />
                                    <text x={cx + cw / 2} y="115" textAnchor="middle" fill="#93c5fd" fontSize="5.5" fontWeight="bold">BESS #{idx + 1}</text>
                                </g>
                            );
                        })}

                        <rect x="490" y="65" width="35" height="57" fill="#e2e8f0" stroke="#475569" strokeWidth="1" rx="1" />
                        <text x="507" y="98" textAnchor="middle" fill="#0f172a" fontSize="5.5" fontWeight="bold">HTA</text>

                        <line x1="140" y1="70" x2="560" y2="70" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
                        <line x1="140" y1="70" x2="140" y2="130" stroke="#334155" strokeWidth="2" />
                        <line x1="560" y1="70" x2="560" y2="130" stroke="#334155" strokeWidth="2" />
                        <text x="135" y="100" textAnchor="end" fill="#64748b" fontSize="6" fontWeight="bold">Clôture 2.00m</text>

                        <line x1="170" y1="55" x2="170" y2="130" stroke="#ef4444" strokeWidth="0.8" />
                        <line x1="166" y1="55" x2="174" y2="55" stroke="#ef4444" strokeWidth="0.8" />
                        <line x1="166" y1="130" x2="174" y2="130" stroke="#ef4444" strokeWidth="0.8" />
                        <text x="162" y="95" textAnchor="end" fill="#ef4444" fontSize="7" fontWeight="bold">H : 2.60m</text>

                        <line x1="160" y1="148" x2="540" y2="148" stroke="#2563eb" strokeWidth="0.8" />
                        <line x1="160" y1="144" x2="160" y2="152" stroke="#2563eb" strokeWidth="0.8" />
                        <line x1="540" y1="144" x2="540" y2="152" stroke="#2563eb" strokeWidth="0.8" />
                        <text x="350" y="156" textAnchor="middle" fill="#2563eb" fontSize="7" fontWeight="bold">Longueur dalle : {bLen.toFixed(2)}m</text>
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

    const roofTypeLabel = isOmbriere ? 'monopente (ombrière VL/PL)' : isAsym ? (isAsym2 ? 'double pente asymétrique 2 zones' : 'double pente asymétrique') : isSym ? 'double pente symétrique' : 'photovoltaïque';

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
    const isNoBattery = isAcama || isGreenInvest;

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
    const isNoBattery = isAcama || isGreenInvest;

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
    const isNoBattery = isAcama || isGreenInvest;

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
 * PLANCHE DP4 : FAÇADES ET TOITURES (5 Vues 3D)
 */
export const PlateFacades = ({ project, captures }) => {
    const safeCaptures = captures || project?.urbanisme_captures || project?.captures || {};
    const sud = safeCaptures.facade_sud || safeCaptures.facades_projet;
    const nord = safeCaptures.facade_nord;
    const est = safeCaptures.facade_est;
    const ouest = safeCaptures.facade_ouest;
    const toiture = safeCaptures.vue_couverture || safeCaptures.toiture;

    const renderSlot = (src, alt, label) => {
        if (src) {
            return <SafePlateImage src={src} alt={alt} style={{ maxHeight: '92%' }} />;
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
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>1. FAÇADE SUD</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            {renderSlot(sud, "Façade Sud", "Façade Sud non capturée")}
                        </div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>2. FAÇADE NORD</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            {renderSlot(nord, "Façade Nord", "Façade Nord non capturée")}
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
                            {renderSlot(est, "Façade Est", "Façade Est non capturée")}
                        </div>
                    </div>
                    {/* Ouest */}
                    <div style={{ flex: 1.2, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>4. FAÇADE OUEST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON DROIT)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1.5mm 0.5mm' }}>
                            {renderSlot(ouest, "Façade Ouest", "Façade Ouest non capturée")}
                        </div>
                    </div>
                    {/* Toiture */}
                    <div style={{ flex: 1.35, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#dbeafe', color: '#1e40af', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>5. VUE COUVERTURE (PAYSAGE)</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1.5mm 0.5mm' }}>
                            {renderSlot(toiture, "Vue Toiture", "Vue Toiture non capturée")}
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

export const PlateNotice = ({ project, captures }) => (
    <PlateInsertionNotice project={project} />
);
