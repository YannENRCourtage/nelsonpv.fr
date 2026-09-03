import React from 'react';
import { resolveDemandeurNames } from '@/services/SmartCerfaService';
import { getProxiedImageUrl } from '@/utils/imageProxy';

const PAGE_STYLE = {
    width: '297mm',
    height: '210mm',
    padding: '10mm 15mm 8mm 15mm',
    boxSizing: 'border-box',
    background: '#ffffff',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
    pageBreakAfter: 'always',
    overflow: 'hidden'
};

const PlateHeader = ({ title, project }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama || isGreenInvest;

    let bName = project?.buildingName ? project.buildingName.toUpperCase() : '';
    if (isNoBattery && bName) {
        bName = bName.replace(/STATION BATTERIES[^\)]*\)?/gi, isAcama ? 'BÂTIMENT' : (project?.buildingType?.includes('ombriere') ? 'OMBRIÈRE' : 'BÂTIMENT')).trim();
    }
    const cleanTitle = (title || '').trim();
    const showSuffix = bName && bName !== 'BÂTIMENT 1 (PRINCIPAL)' && !cleanTitle.toUpperCase().includes(bName);
    const finalTitle = showSuffix ? `${cleanTitle} — ${bName}` : cleanTitle;

    const names = resolveDemandeurNames(project);
    let clientFullName = `${names.lastName} ${names.firstName}`.trim() || project?.lastName || project?.name || 'Demandeur';
    if (isNoBattery && clientFullName.toLowerCase().includes('batterie')) {
        clientFullName = (project?.firstName ? `${project.firstName} ${project?.lastName || ''}`.trim() : '') || project?.clientName || 'Demandeur';
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #00429d', paddingBottom: '2mm', marginBottom: '3mm' }}>
            <div>
                <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#00429d', letterSpacing: '0.5px' }}>
                    NELSON
                </div>
                <div style={{ fontSize: '7pt', color: '#666' }}>L'énergie solaire simplifiée</div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#00429d' }}>
                    {finalTitle}
                </div>
                <div style={{ fontSize: '7.5pt', color: '#333' }}>
                    Projet : {clientFullName} — {project?.city || project?.commune || 'Cadastre'} ({project?.zip || project?.zipCode || '32'})
                </div>
            </div>
        </div>
    );
};

const Footer = ({ project }) => {
    const today = new Date().toLocaleDateString('fr-FR');
    return (
        <div style={{
            position: 'absolute',
            bottom: '4.5mm',
            left: '15mm',
            right: '15mm',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '8.5pt',
            color: '#475569',
            borderTop: '1.5px solid #00429d',
            paddingTop: '2mm',
            background: '#ffffff'
        }}>
            <span style={{ fontWeight: 'bold', color: '#00429d' }}>NELSON - nelsonpv.fr</span>
            <span style={{ letterSpacing: '1px', fontWeight: '600' }}>DOSSIER DE PERMIS DE CONSTRUIRE</span>
            <span>Date : {today}</span>
        </div>
    );
};

const ImageUploadZone = ({ isInteractive, photo, onUpload, defaultText = "Cliquez pour ajouter l'image", label = "Image", imageStyle = {} }) => {
    const proxiedSrc = getProxiedImageUrl(photo);

    if (!isInteractive && photo) {
        return (
            <img 
                src={proxiedSrc} 
                alt={label} 
                loading="eager"
                decoding="sync"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxWidth: '100%', maxHeight: '100%', ...imageStyle }} 
            />
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
                <img 
                    src={proxiedSrc} 
                    alt={label} 
                    loading="eager"
                    decoding="sync"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', ...imageStyle }} 
                />
            ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '9pt', padding: '10px' }}>
                    <div style={{ fontSize: '18pt', marginBottom: '4px' }}>📷</div>
                    {defaultText}
                </div>
            )}
            {isInteractive && (
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onUpload) {
                            const reader = new FileReader();
                            reader.onload = (ev) => onUpload(ev.target.result);
                            reader.readAsDataURL(file);
                        }
                    }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
            )}
        </div>
    );
};

export const PlateGarde = ({ project }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama || isGreenInvest;

    const names = resolveDemandeurNames(project);
    let clientFullName = `${names.lastName} ${names.firstName}`.trim() || project?.name || 'Demandeur';
    if (isNoBattery && clientFullName.toLowerCase().includes('batterie')) {
        clientFullName = (project?.firstName ? `${project.firstName} ${project?.lastName || ''}`.trim() : '') || project?.clientName || 'Demandeur';
    }
    const displayKwc = project?.kwc || project?.puissance || project?.projectSize || '';

    return (
        <div style={PAGE_STYLE} id="pc-plate-garde">
            <div style={{ borderBottom: '3px solid #00429d', paddingBottom: '4mm', marginBottom: '8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ fontSize: '24pt', fontWeight: 'bold', color: '#00429d' }}>NELSON</div>
                    <div style={{ fontSize: '10pt', color: '#666' }}>Ingénierie & Développement Photovoltaïque</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#333' }}>DOSSIER DE PERMIS DE CONSTRUIRE</div>
                    <div style={{ fontSize: '9.5pt', color: '#00429d', fontWeight: 'bold' }}>Pièces architecturales et graphiques (PC1 à PC8)</div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', gap: '10mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ flex: 1.2, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4mm', padding: '6mm', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ color: '#00429d', fontSize: '13pt', borderBottom: '1.5px solid #00429d', paddingBottom: '2mm', marginBottom: '4mm' }}>
                        Nature et Caractéristiques du Projet
                    </h3>
                    <p style={{ fontSize: '10pt', lineHeight: '1.5', color: '#333', margin: 0 }}>
                        <strong>Type d'ouvrage :</strong> {project?.description || `Construction d'un bâtiment agricole avec centrale solaire photovoltaïque intégrée en toiture${displayKwc ? ` de ${displayKwc} kWc` : ''}.`}<br />
                        <strong>Puissance de l'installation :</strong> {displayKwc ? `${displayKwc} kWc` : ''}<br />
                        <strong>Dimensions principales :</strong> Longueur {project?.longueur || '30.0'} m × Largeur {project?.largeur || '20.0'} m<br />
                        <strong>Surface au sol (Emprise) :</strong> {project?.largeur && project?.longueur ? Math.round(parseFloat(project.largeur) * parseFloat(project.longueur)) : 600} m²
                    </p>
                </div>

                <div style={{ flex: 1.2, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4mm', padding: '6mm', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ color: '#00429d', fontSize: '13pt', borderBottom: '1.5px solid #00429d', paddingBottom: '2mm', marginBottom: '4mm' }}>
                        Informations Administratives
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', fontSize: '9.5pt' }}>
                        <div>
                            <strong style={{ color: '#666' }}>Maître d'Ouvrage (Demandeur) :</strong><br />
                            <span style={{ fontSize: '11pt', fontWeight: 'bold', color: '#00429d' }}>{clientFullName}</span><br />
                            {project?.email && <>{project.email}<br /></>}
                            {project?.phone && <>{project.phone}</>}
                        </div>
                        <div>
                            <strong style={{ color: '#666' }}>Lieu des Travaux :</strong><br />
                            {project?.address || project?.adresse || '—'}<br />
                            {project?.zip || project?.zipCode || ''} {project?.city || project?.commune || ''}
                        </div>
                        <div style={{ gridColumn: 'span 2', marginTop: '2mm', borderTop: '1px solid #ccc', paddingTop: '2mm' }}>
                            <strong style={{ color: '#666' }}>Références Cadastrales :</strong><br />
                            Commune de {project?.cadastre_commune || project?.city || project?.commune || '—'}<br />
                            Section {project?.cadastre_section || project?.section || '...'} Parcelle n° {project?.cadastre_numero || project?.numero || '...'} (Superficie : {project?.cadastre_surface ? `${project.cadastre_surface} m²` : '—'})
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
            <div style={{ flex: 1, display: 'flex', gap: '8mm', maxHeight: '126mm', marginBottom: '6mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.25' }}>
                        <div>Vue Cartographique</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(IGN / Cadastre)</div>
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
                    <div style={{ padding: '2mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.25' }}>
                        <div>Vue Aérienne</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(Géoportail / Satellite)</div>
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
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama || isGreenInvest;

    const rawBuildings = project?.buildings && Array.isArray(project.buildings) && project.buildings.length > 0
        ? project.buildings
        : [{
            name: 'Bâtiment 1',
            length: Number(project?.longueur || 30),
            width: Number(project?.largeur || 20),
            masse_capture: captures?.masse_projet || captures?.satellite
        }];

    const isMulti = rawBuildings.length > 1;

    return (
        <div style={PAGE_STYLE} id="pc-plate-masse">
            <PlateHeader title="PC2 : PLAN DE MASSE DES CONSTRUCTIONS" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                {isMulti ? (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rawBuildings.length, 2)}, 1fr)`, gap: '4mm', flex: 1, height: '100%' }}>
                        {rawBuildings.map((b, idx) => {
                            const bPhoto = b.masse_capture || (idx === 0 ? captures?.masse_projet : null) || captures?.satellite;
                            let bLen = Number(b.length || (b.bayCount || 5) * (b.baySpacing || 7.5) || project?.longueur || 30);
                            let bW = Number(b.width || project?.largeur || 20);
                            if (isNoBattery && (bW <= 6.0 || bLen <= 6.0)) {
                                bLen = Math.max(bLen, 30);
                                bW = Math.max(bW, 15);
                            }
                            const bArea = Math.round(bLen * bW);
                            let bDisplayName = b.name || `Bâtiment ${idx + 1}`;
                            if (isNoBattery) {
                                bDisplayName = bDisplayName.replace(/Station Batteries[^\)]*\)?/gi, 'Bâtiment');
                            }
                            bDisplayName = bDisplayName.replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '').trim();
                            if (!bDisplayName) bDisplayName = `Bâtiment ${idx + 1}`;

                            return (
                                <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '3mm', background: '#f8fafc', padding: '2mm', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                        <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                            PC2 — Plan de Masse : {bDisplayName}
                                        </span>
                                        <span style={{ fontSize: '7pt', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '0.5mm 1.5mm', borderRadius: '2mm' }}>
                                            {bLen.toFixed(1)}m × {bW.toFixed(1)}m ({bArea} m²)
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '2mm', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ImageUploadZone 
                                            isInteractive={isInteractive} 
                                            photo={bPhoto} 
                                            onUpload={(data) => onUpload && onUpload(`masse_projet_${idx}`, data)} 
                                            defaultText={`Plan de masse : ${bDisplayName}`} 
                                            label={`Plan de Masse (${bDisplayName})`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (() => {
                    const b = rawBuildings[0];
                    const bPhoto = b?.masse_capture || captures?.masse_projet || captures?.satellite;
                    let bLen = Number(b?.length || (b?.bayCount || 5) * (b?.baySpacing || 7.5) || project?.longueur || 30);
                    let bW = Number(b?.width || project?.largeur || 20);
                    if (isNoBattery && (bW <= 6.0 || bLen <= 6.0)) {
                        bLen = Math.max(bLen, 30);
                        bW = Math.max(bW, 15);
                    }
                    const bArea = Math.round(bLen * bW);
                    let bDisplayName = b?.name || 'Bâtiment 1';
                    if (isNoBattery) {
                        bDisplayName = bDisplayName.replace(/Station Batteries[^\)]*\)?/gi, 'Bâtiment');
                    }
                    bDisplayName = bDisplayName.replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '').trim();
                    if (!bDisplayName) bDisplayName = 'Bâtiment 1';

                    return (
                        <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '2mm' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                    PC2 — Plan de Masse : {bDisplayName} (OpenStreetMap Zoom 19)
                                </span>
                                <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '0.5mm 2mm', borderRadius: '2mm' }}>
                                    {bLen.toFixed(1)}m × {bW.toFixed(1)}m ({bArea} m²)
                                </span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '2mm', background: '#ffffff' }}>
                                <ImageUploadZone 
                                    isInteractive={isInteractive} 
                                    photo={bPhoto} 
                                    onUpload={(data) => onUpload && onUpload('masse_projet', data)} 
                                    defaultText="Plan de masse (OpenStreetMap Zoom 19)" 
                                    label="Plan de Masse"
                                />
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
 * PLANCHE COMBINÉE PC3 / PC4 : COUPE TRANSVERSALE ASYMÉTRIQUE FIDÈLE AU MODÈLE
 */
export const PlateSectionAndNotice = ({ project, noticeText, onNoticeChange, isInteractive }) => {
    const isAcama = Boolean(project?.isAcama) || project?.tenantId === 'acama' || false;
    const isGreenInvest = Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest' || false;
    const isNoBattery = isAcama || isGreenInvest;

    let longueur = project?.longueur || '30.0';
    let largeur = parseFloat(project?.largeur || 20.0);
    let hauteurEgout = parseFloat(project?.hauteur_egout || 4.0);
    let pente = parseFloat(project?.pente || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);
    const displayKwc = project?.kwc || project?.puissance || project?.projectSize || '';

    if (isNoBattery) {
        if (largeur <= 6.0) largeur = 16.4;
        if (parseFloat(longueur) <= 6.0) longueur = '30.0';
        if (hauteurEgout <= 2.6) hauteurEgout = 4.0;
        if (pente === 0) pente = 10;
    }
    
    // Priorité absolue à la notice descriptive structurée en 5 points
    const candidateNotice = (noticeText && noticeText.includes("1- OBJET"))
      ? noticeText
      : (project?.noticeText && project.noticeText.includes("1- OBJET"))
        ? project.noticeText
        : (project?.noticeAgricole && project.noticeAgricole.includes("1- OBJET"))
          ? project.noticeAgricole
          : (project?.pc_notice && project.pc_notice.includes("1- OBJET"))
            ? project.pc_notice
            : (noticeText || project?.noticeText || project?.noticeAgricole || project?.pc_notice || project?.notice_descriptive);
    const effectiveNoticeText = (candidateNotice && candidateNotice.length > 50) ? candidateNotice : null;
    const cleanedNoticeText = (isNoBattery && effectiveNoticeText) 
        ? effectiveNoticeText
            .replace(/Le système de stockage batterie est[^\n]*\n?/gi, '')
            .replace(/ainsi qu'un système de stockage batterie[^\n,\.]*/gi, '')
            .replace(/Le site sera également équipé d'un système de stockage d'énergie[^\n]*\n?/gi, '')
            .replace(/et le système de stockage batterie/gi, '')
            .replace(/Station Batteries \([^\)]*\)/gi, 'Bâtiment')
        : effectiveNoticeText;
    
    // Détection stricte du type d'ouvrage
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
        const bCap = Number(project?.batteryStorage?.capacityKwh || (bQty * 261));

        return (
            <div style={PAGE_STYLE} id="pc-plate-section-notice">
                <PlateHeader title="PC3 : PLAN EN COUPE & PC4 : NOTICE DESCRIPTIVE" project={project} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5mm', marginBottom: '8mm' }}>
                    <div style={{ height: '62mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                            <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                PC3 — COUPE DE TERRAIN &amp; DES INSTALLATIONS (COUPE TRANSVERSALE AA') — CENTRALE DE STOCKAGE BATTERIES
                            </span>
                            <span style={{ fontSize: '7pt', color: '#64748b' }}>
                                {bQty}× {bModel} ({bPower} kW / {bCap} kWh) • Dalle {bLen.toFixed(2)}m × 6.00m • Échelle indicative
                            </span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="680" height="186" viewBox="0 0 680 186" style={{ width: '100%', height: '100%', maxHeight: '54mm' }}>
                                <line x1="20" y1="130" x2="660" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
                                <text x="30" y="142" fill="#64748b" fontSize="6.5" fontStyle="italic">Terrain Naturel TN ±0.00</text>
                                <text x="650" y="142" textAnchor="end" fill="#64748b" fontSize="6.5" fontStyle="italic">Terrain plat conservé</text>

                                <rect x="150" y="122" width="380" height="8" fill="#94a3b8" stroke="#475569" strokeWidth="1" rx="0.5" />
                                <text x="340" y="128" textAnchor="middle" fill="#1e293b" fontSize="5.5" fontWeight="bold">Dalle béton armé étanche avec bac de rétention</text>

                                {Array.from({ length: Math.min(4, bQty) }).map((_, idx) => {
                                    const cw = Math.min(65, 260 / Math.min(4, bQty));
                                    const cx = 175 + idx * (cw + 12);
                                    return (
                                        <g key={idx}>
                                            <rect x={cx} y="55" width={cw} height="67" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" rx="1.5" />
                                            <rect x={cx + 4} y="50" width={cw - 8} height="5" fill="#334155" stroke="#0f172a" strokeWidth="0.8" rx="1" />
                                            <line x1={cx + cw / 2} y1="55" x2={cx + cw / 2} y2="122" stroke="#475569" strokeWidth="0.8" />
                                            <circle cx={cx + cw / 2 - 3} cy="88" r="1.5" fill="#facc15" />
                                            <circle cx={cx + cw / 2 + 3} cy="88" r="1.5" fill="#facc15" />
                                            <text x={cx + cw / 2} y="115" textAnchor="middle" fill="#93c5fd" fontSize="5.5" fontWeight="bold">BESS #{idx + 1}</text>
                                        </g>
                                    );
                                })}

                                <rect x="480" y="65" width="35" height="57" fill="#e2e8f0" stroke="#475569" strokeWidth="1" rx="1" />
                                <text x="497" y="98" textAnchor="middle" fill="#0f172a" fontSize="5.5" fontWeight="bold">HTA</text>

                                <line x1="130" y1="70" x2="550" y2="70" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
                                <line x1="130" y1="70" x2="130" y2="130" stroke="#334155" strokeWidth="2" />
                                <line x1="550" y1="70" x2="550" y2="130" stroke="#334155" strokeWidth="2" />
                                <text x="125" y="100" textAnchor="end" fill="#64748b" fontSize="6" fontWeight="bold">Clôture 2.00m</text>

                                <line x1="160" y1="55" x2="160" y2="130" stroke="#ef4444" strokeWidth="0.8" />
                                <line x1="156" y1="55" x2="164" y2="55" stroke="#ef4444" strokeWidth="0.8" />
                                <line x1="156" y1="130" x2="164" y2="130" stroke="#ef4444" strokeWidth="0.8" />
                                <text x="152" y="95" textAnchor="end" fill="#ef4444" fontSize="7" fontWeight="bold">H : 2.60m</text>

                                <line x1="150" y1="148" x2="530" y2="148" stroke="#2563eb" strokeWidth="0.8" />
                                <line x1="150" y1="144" x2="150" y2="152" stroke="#2563eb" strokeWidth="0.8" />
                                <line x1="530" y1="144" x2="530" y2="152" stroke="#2563eb" strokeWidth="0.8" />
                                <text x="340" y="156" textAnchor="middle" fill="#2563eb" fontSize="7" fontWeight="bold">Longueur dalle : {bLen.toFixed(2)}m</text>
                            </svg>
                        </div>
                    </div>

                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '2.5mm 4.5mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            NOTICE D'INSERTION &amp; DESCRIPTIVE DU PROJET
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                                {effectiveNoticeText}
                            </div>
                        </div>
                    </div>
                </div>
                <Footer project={project} />
            </div>
        );
    }

    const isOmbriere = rawType.startsWith('ombriere');
    const isPL = isOmbriere && (rawType.includes('ombriere_pl') || (rawType.includes('pl') && !rawType.includes('simple')) || largeur >= 13.0);
    const isSimple = isOmbriere && !isPL && (rawType.includes('simple') || largeur <= 7.5);
    const isDouble = isOmbriere && !isPL && !isSimple;
    const isMonopente = !isOmbriere && rawType.includes('monopente');
    const isSym = !isOmbriere && rawType.includes('symetrique') && !rawType.includes('asym');
    const isAsym2 = !isOmbriere && (rawType.includes('asymetrique_2') || (!isSym && (Math.abs(largeur - 25.5) < 0.8 || Math.abs(largeur - 29.1) < 0.8)));
    const isAsym1 = !isOmbriere && !isMonopente && !isSym && !isAsym2;
    const isAsym = isAsym1 || isAsym2;

    // Détection des extensions (Auvent / Appentis)
    const hasAppentisLeft = project?.leftSide === 'appentis';
    const hasAuventLeft = !hasAppentisLeft && (project?.leftSide === 'auvent' || Boolean(project?.auvent && project?.auvent !== 'none' && project?.auvent !== false));
    const hasExtLeft = hasAuventLeft || hasAppentisLeft;

    const hasAppentisRight = project?.rightSide === 'appentis' || (!project?.rightSide && Boolean(project?.appentis && project?.appentis !== 'none' && project?.appentis !== false));
    const hasAuventRight = !hasAppentisRight && (project?.rightSide === 'auvent' || (!project?.rightSide && Boolean(project?.auvent && project?.auvent !== 'none' && project?.auvent !== false)));
    const hasExtRight = hasAuventRight || hasAppentisRight;

    const hasAuvent = hasAuventLeft || hasAuventRight;
    const hasAppentis = hasAppentisLeft || hasAppentisRight;

    // Dimensions extensions : Appentis par défaut à 9.30m, Auvent à 4.00m
    const extRightWidth = hasAppentisRight ? ((Number(project?.rightWidth) && Number(project?.rightWidth) > 5) ? Number(project.rightWidth) : 9.3) : (hasAuventRight ? (Number(project?.rightWidth) || 4.0) : 0);
    const extLeftWidth = hasAppentisLeft ? ((Number(project?.leftWidth) && Number(project?.leftWidth) > 5) ? Number(project.leftWidth) : 9.3) : (hasAuventLeft ? (Number(project?.leftWidth) || 4.0) : 0);

    // Calculs dimensionnels RÉELS & PROPORTIONNELS selon les fiches techniques constructeur
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
            // Ombrières Poids Lourds (O7, O9, O11)
            if (largeur > 22.0) {
                // O11
                realRoofWidth = 25.03; realGroundWidth = 24.65;
                leftEaveHeight = 9.35; ridgeHeight = 9.35; rightEaveHeight = 5.00;
                clearanceHeight = 3.38;
            } else if (largeur > 18.0) {
                // O9
                realRoofWidth = 20.53; realGroundWidth = 20.22;
                leftEaveHeight = 9.29; ridgeHeight = 9.29; rightEaveHeight = 5.73;
                clearanceHeight = 3.38;
            } else {
                // O7
                realRoofWidth = 16.03; realGroundWidth = 15.79;
                leftEaveHeight = 7.86; ridgeHeight = 7.86; rightEaveHeight = 5.08;
                clearanceHeight = 3.38;
            }
        } else if (isSimple) {
            // Ombrière Simple VL
            realRoofWidth = (largeur >= 6.0 || Math.abs(largeur - 6.9) < 0.5) ? 6.90 : (largeur > 0 ? largeur : 5.20);
            realGroundWidth = realRoofWidth;
            leftEaveHeight = Number(project?.ridgeHeight || 4.10);
            ridgeHeight = leftEaveHeight;
            rightEaveHeight = Number(project?.eaveHeight || 2.90);
            clearanceHeight = 2.40;
            massifWidth = 1.30;
            massifHeight = 0.35;
        } else {
            // Ombrière Double VL (O4 / O5)
            if (largeur > 10.0 || Math.abs(largeur - 11.3) < 1.0) {
                // O5 - Double VL 5 rangées
                realRoofWidth = 11.53; realGroundWidth = 11.35;
                leftEaveHeight = 4.74; ridgeHeight = 5.11; rightEaveHeight = 2.80;
                clearanceHeight = 2.20; massifWidth = 1.70;
            } else {
                // O4 - Double VL 4 rangées
                realRoofWidth = 9.28; realGroundWidth = 9.14;
                leftEaveHeight = 4.61; ridgeHeight = 4.89; rightEaveHeight = 3.00;
                clearanceHeight = 3.00; massifWidth = 1.70;
            }
        }
    } else if (isMonopente) {
        effectivePitch = pente || 15;
        rightEaveHeight = hauteurEgout || 4.00;
        ridgeHeight = rightEaveHeight + largeur * Math.tan(effectivePitch * Math.PI / 180);
        leftEaveHeight = ridgeHeight;
        realRoofWidth = largeur;
        realGroundWidth = largeur;
    } else if (isSym) {
        effectivePitch = pente || 10;
        leftEaveHeight = hauteurEgout || 5.50;
        rightEaveHeight = leftEaveHeight;
        ridgeHeight = leftEaveHeight + ((largeur / 2) * Math.tan(effectivePitch * Math.PI / 180));
        realRoofWidth = largeur;
        realGroundWidth = largeur;
    } else if (isAsym2) {
        effectivePitch = pente || 10;
        rightEaveHeight = (hauteurEgout && hauteurEgout <= 4.5) ? hauteurEgout : 4.00;
        ridgeHeight = (Math.abs(largeur - 25.5) < 0.8) ? 8.90 : (Math.abs(largeur - 29.1) < 0.8 ? 9.80 : (rightEaveHeight + (largeur * 0.75 * Math.tan(effectivePitch * Math.PI / 180))));
        leftEaveHeight = (Math.abs(largeur - 25.5) < 0.8) ? 6.90 : (Math.abs(largeur - 29.1) < 0.8 ? 7.90 : (ridgeHeight - (largeur * 0.25 * Math.tan(effectivePitch * Math.PI / 180))));
        realRoofWidth = largeur;
        realGroundWidth = largeur;
    } else {
        // Asymétrique 1 zone (16.4m, 20m, etc.)
        effectivePitch = pente || 15;
        rightEaveHeight = (hauteurEgout && hauteurEgout <= 4.5) ? hauteurEgout : 4.00;
        ridgeHeight = rightEaveHeight + (largeur * 0.75 * Math.tan(effectivePitch * Math.PI / 180));
        leftEaveHeight = ridgeHeight - (largeur * 0.25 * Math.tan(effectivePitch * Math.PI / 180));
        realRoofWidth = largeur;
        realGroundWidth = largeur;
    }

    const displayPitch = effectivePitch;

    // Largeur totale réelle (Bâtiment + Extensions ou Ombrière)
    const totalRealWidth = isOmbriere
        ? realRoofWidth
        : ((hasExtLeft ? extLeftWidth : 0) + largeur + (hasExtRight ? extRightWidth : 0));
    
    const maxRealHeight = Math.max(ridgeHeight, leftEaveHeight, rightEaveHeight) + 1.2;

    // Échelle UNIFORME X & Y (1:1 Isométrique) pour conserver les vraies proportions
    const availableDrawingWidth = 480;
    const availableDrawingHeight = 108;
    const pxPerMeterX = availableDrawingWidth / Math.max(8, totalRealWidth);
    const pxPerMeterY = availableDrawingHeight / Math.max(4.0, maxRealHeight);
    const pxPerMeter = Math.min(pxPerMeterX, pxPerMeterY, 22);
    const pxPerM = pxPerMeter;

    const mainWidthSvg = (isOmbriere ? realRoofWidth : largeur) * pxPerMeter;
    const extLeftSvgWidth = (hasExtLeft ? extLeftWidth : 0) * pxPerMeter;
    const extRightSvgWidth = (hasExtRight ? extRightWidth : 0) * pxPerMeter;
    const totalSvgWidth = extLeftSvgWidth + mainWidthSvg + extRightSvgWidth;

    // Centrage horizontal
    const startSvgX = Math.round((680 - totalSvgWidth) / 2);
    const mainLeftSvgX = startSvgX + extLeftSvgWidth;
    const mainRightSvgX = mainLeftSvgX + mainWidthSvg;
    const extLeftSvgX = startSvgX;
    const extRightSvgX = mainRightSvgX + extRightSvgWidth;
    const centerX = (mainLeftSvgX + mainRightSvgX) / 2;

    // Position faîtage X
    const apexSvgX = isOmbriere
      ? mainLeftSvgX
      : (isAsym ? (mainLeftSvgX + mainWidthSvg * 0.25) : (mainLeftSvgX + mainWidthSvg * 0.5));

    // Coordonnées Y de référence sol
    const groundY = 142;
    const groundYLeft = groundY + Math.sin((terrainSlopeDeg * Math.PI) / 180) * (totalSvgWidth * 0.2);
    const groundYRight = groundY - Math.sin((terrainSlopeDeg * Math.PI) / 180) * (totalSvgWidth * 0.2);

    const apexSvgY = groundY - ridgeHeight * pxPerMeter;
    const leftEaveSvgY = groundY - leftEaveHeight * pxPerMeter;
    const rightEaveSvgY = groundY - rightEaveHeight * pxPerMeter;
    const clearanceSvgY = groundY - clearanceHeight * pxPerMeter;

    // Extensions éventuelles
    const rightSlopeSvg = (mainRightSvgX > apexSvgX) ? (rightEaveSvgY - apexSvgY) / (mainRightSvgX - apexSvgX) : Math.tan((displayPitch * Math.PI) / 180) * 0.6;
    const leftSlopeSvg = (apexSvgX > mainLeftSvgX) ? (leftEaveSvgY - apexSvgY) / (apexSvgX - mainLeftSvgX) : Math.tan((displayPitch * Math.PI) / 180) * 0.6;

    const extRightSvgY = rightEaveSvgY + (extRightSvgX - mainRightSvgX) * rightSlopeSvg;
    const extLeftSvgY = leftEaveSvgY + (mainLeftSvgX - extLeftSvgX) * leftSlopeSvg;

    // Hauteur d'égout de l'extension : 3.90m pour Appentis, ou calculée pour Auvent
    let extRightHeight = hasAppentisRight ? 3.90 : Math.max(2.4, rightEaveHeight - extRightWidth * Math.tan((displayPitch * Math.PI) / 180));
    let extLeftHeight = hasAppentisLeft ? 3.90 : Math.max(2.4, leftEaveHeight - extLeftWidth * Math.tan((displayPitch * Math.PI) / 180));
    if (hasAuventLeft) {
        if (isAsym2 && Math.abs(largeur - 25.5) < 0.8) extLeftHeight = 5.90;
        else if (isAsym2 && Math.abs(largeur - 29.1) < 0.8) extLeftHeight = 6.90;
        else if (isAsym1 && Math.abs(largeur - 20.0) < 0.5) extLeftHeight = 6.40;
        else if (isAsym1 && Math.abs(largeur - 16.4) < 0.5) extLeftHeight = 5.40;
    }
    if (hasAuventRight) {
        if (isAsym2 && Math.abs(largeur - 25.5) < 0.8) extRightHeight = 3.30;
    }

    // Échelle métrique
    const scaleTotalWidth = 10 * pxPerMeter;
    const scaleSegWidth = 2 * pxPerMeter;
    const scaleStartX = 660 - scaleTotalWidth;
    const scaleY = 172;

    const roofTypeLabel = isOmbriere ? 'monopente (ombrière VL/PL)' : isAsym ? (isAsym2 ? 'double pente asymétrique 2 zones' : 'double pente asymétrique') : isSym ? 'double pente symétrique' : 'photovoltaïque';

    const asym2LeftDist = 13.1;
    const asym2RightDist = (Math.abs(largeur - 25.5) < 0.8) ? 12.4 : (Math.abs(largeur - 29.1) < 0.8 ? 16.0 : (largeur - 13.1));
    const middleColSvgX = mainLeftSvgX + asym2LeftDist * pxPerMeter;
    const middleColTopY = apexSvgY + (rightEaveSvgY - apexSvgY) * ((middleColSvgX - apexSvgX) / (mainRightSvgX - apexSvgX));

    const projectCity = project?.city || project?.cadastre_commune || project?.commune || project?.ville || 'SAINT AVIT SAINT NAZAIRE';
    const projectZip = project?.zip || project?.zipCode || project?.postalCode || project?.code_postal || '33220';
    const projectAddress = project?.address || project?.clientAddress || project?.siteAddress || project?.street || project?.adresse || '2069 Route de la Catine';
    const projectCadastre = (project?.cadastre_section ? `${project.cadastre_section} ` : '') + (project?.cadastre_parcel || project?.parcel || project?.parcelle || '000 B 633');
    const projectSurface = project?.surface_terrain ? `${project.surface_terrain} m²` : (project?.cadastre_surface ? `${project.cadastre_surface} m²` : '18 384m²');
    const projectAltitude = project?.altitude || '140.62m';
    const totalSurface = (largeur * longueur).toFixed(2);
    const bayCount = project?.bayCount || 5;
    const baySpacing = project?.baySpacing || 7.5;
    const displayKwcStr = displayKwc ? `${displayKwc} kWc` : '0 kWc';

    const cleanNoticeText = cleanedNoticeText
        ? cleanedNoticeText.replace(/^\s*NOTICE\s+D['’]INSERTION(?:\s*&|\s+ET)?\s*(?:DESCRIPTIVE\s+DU\s+PROJET)?\s*\n+/i, '').trim()
        : null;

    const default5PointsNotice = `1- OBJET DE LA DEMANDE
La demande de permis de construire porte sur la construction d'un hangar à usage agricole avec toiture photovoltaïque. Il servira de stockage de matériel et céréales (${totalSurface}m²).

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
Le projet a pour objet la construction d'un hangar de forme rectangulaire (longueur : ${longueur}m, largeur : ${largeur.toFixed(2)}m${hasAuventRight ? ` + Auvent ${extRightWidth.toFixed(2)}m` : hasAppentisRight ? ` + Appentis ${extRightWidth.toFixed(2)}m` : ''}) en structure métallique (RAL 7016 / 7005), composé de ${bayCount} travées de ${baySpacing}m d'entraxe. La toiture sera constituée d'une double pente ${roofTypeLabel} (${displayPitch}°) avec pour couverture un bac acier anti condensation sur les deux versants (RAL 7016). Des panneaux photovoltaïques (RAL 9005) viendront recouvrir le bac acier sur l'ensemble de la toiture, permettant de créer une centrale de production d'électricité photovoltaïque de ${displayKwcStr}.
Ce bâtiment sera ouvert et non clos. Les façades Est, Ouest, Nord et Sud seront ouvertes.
Un terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.
Des tranchées drainantes seront réalisées tout autour du bâtiment projet afin d'évacuer les eaux pluviales par infiltration dans le sol.

4- RACCORDEMENT AUX RESEAUX
Le bâtiment ne sera pas raccordé aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.
Seule l'électricité produite par la centrale photovoltaïque est renvoyée dans le réseau ENEDIS via un point de livraison situé sur la parcelle au Sud de la parcelle (PDL).
L'emplacement du point de livraison indiqué dans les pièces graphiques de l'autorisation d'urbanisme n'apparaît qu'à titre indicatif.
Le positionnement du point de livraison et d'un transformateur (le cas échéant) demeure à l'appréciation finale du gestionnaire de réseau en fonction du site et des équipements déjà existants.

5- SECURITE INCENDIE
Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf PC 02 - Plan de masse).`;

    return (
        <div style={PAGE_STYLE} id="pc-plate-section-notice">
            <PlateHeader title="PC3 : PLAN EN COUPE & PC4 : NOTICE DESCRIPTIVE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5mm', marginBottom: '8mm' }}>
                
                {/* ── HAUT : PC3 PLAN EN COUPE TRANSVERSALE DYNAMIQUE ── */}
                <div style={{ height: '62mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                        <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                            PC3 — COUPE DE TERRAIN & DU BÂTIMENT (COUPE TRANSVERSALE AA')
                        </span>
                        <span style={{ fontSize: '7pt', color: '#64748b' }}>
                            Dimensions : {largeur.toFixed(2)}m × {longueur}m{hasAuventRight ? ` (+ Auvent ${extRightWidth.toFixed(2)}m)` : hasAppentisRight ? ` (+ Appentis ${extRightWidth.toFixed(2)}m)` : ''}{hasAuventLeft ? ` (+ Auvent ${extLeftWidth.toFixed(2)}m Gauche)` : hasAppentisLeft ? ` (+ Appentis ${extLeftWidth.toFixed(2)}m Gauche)` : ''} • Échelle indicative
                        </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="680" height="186" viewBox="0 0 680 186" style={{ width: '100%', height: '100%', maxHeight: '54mm' }}>
                            
                            {/* Badges d'Orientation NORD / SUD */}
                            <rect x="70" y="6" width="44" height="14" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.2" />
                            <text x="92" y="16" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">NORD</text>

                            <rect x="585" y="6" width="38" height="14" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.2" />
                            <text x="604" y="16" textAnchor="middle" fill="#2563eb" fontSize="7.5" fontWeight="bold">SUD</text>

                            {/* 1. Ligne de Terrain Naturel (TN) */}
                            <line x1="20" y1={groundYLeft} x2="660" y2={groundYRight} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 3" />
                            <text x="35" y={groundYLeft + 11} fill="#64748b" fontSize="7" fontStyle="italic">Terrain naturel (TN Aval) ±0.00</text>
                            <text x="655" y={groundYRight - 4} textAnchor="end" fill="#64748b" fontSize="7" fontStyle="italic">TN Amont</text>

                            {/* 2. Dessin selon la typologie */}
                            {isOmbriere ? (
                                isDouble ? (
                                    /* ── OMBRIÈRE DOUBLE VL (Structure en V - Modèles O4 / O5) ── */
                                    (() => {
                                        const mWidth = massifWidth * pxPerMeter;
                                        const mHeight = massifHeight * pxPerMeter;
                                        const mX = centerX - mWidth / 2;
                                        const mY = groundY - mHeight;
                                        const footLeftX = centerX - mWidth * 0.36;
                                        const footRightX = centerX + mWidth * 0.36;
                                        const postLeftTopX = centerX - mainWidthSvg * 0.22;
                                        const postLeftTopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.28;
                                        const postRightTopX = centerX + mainWidthSvg * 0.22;
                                        const postRightTopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.72;
                                        
                                        // Intersections traverse horizontale
                                        const tLeftX = footLeftX + (postLeftTopX - footLeftX) * ((mY - clearanceSvgY) / (mY - postLeftTopY));
                                        const tRightX = footRightX + (postRightTopX - footRightX) * ((mY - clearanceSvgY) / (mY - postRightTopY));

                                        return (
                                            <g>
                                                {/* Massif béton et semelle */}
                                                <rect x={mX - 4} y={groundY - 2} width={mWidth + 8} height={4} fill="#94a3b8" rx="1" />
                                                <rect x={mX} y={mY} width={mWidth} height={mHeight} fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" rx="1.5" />
                                                <rect x={footLeftX - 5} y={mY - 2} width="10" height="2.5" fill="#334155" />
                                                <rect x={footRightX - 5} y={mY - 2} width="10" height="2.5" fill="#334155" />
                                                <text x={centerX} y={groundY + 8} textAnchor="middle" fill="#64748b" fontSize="6" fontStyle="italic">Massif béton ({massifWidth.toFixed(2)}m)</text>

                                                {/* Poteaux inclinés en V */}
                                                <line x1={footLeftX} y1={mY} x2={postLeftTopX} y2={postLeftTopY + 3} stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />
                                                <line x1={footRightX} y1={mY} x2={postRightTopX} y2={postRightTopY + 3} stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />

                                                {/* Traverse horizontale à hauteur libre */}
                                                <line x1={tLeftX} y1={clearanceSvgY} x2={tRightX} y2={clearanceSvgY} stroke="#334155" strokeWidth="2.8" />

                                                {/* Croix de Saint-André supérieure allant d'un poteau oblique à l'autre */}
                                                <line x1={tLeftX} y1={clearanceSvgY} x2={postRightTopX} y2={postRightTopY + 3} stroke="#475569" strokeWidth="2" />
                                                <line x1={tRightX} y1={clearanceSvgY} x2={postLeftTopX} y2={postLeftTopY + 3} stroke="#475569" strokeWidth="2" />

                                                {/* Pannes régulières IPE et Modules Solaires */}
                                                <polygon
                                                    points={`${mainLeftSvgX - 8},${leftEaveSvgY} ${mainRightSvgX + 8},${rightEaveSvgY} ${mainRightSvgX + 8},${rightEaveSvgY - 5} ${mainLeftSvgX - 8},${leftEaveSvgY - 5}`}
                                                    fill="#1d4ed8"
                                                    stroke="#60a5fa"
                                                    strokeWidth="1"
                                                />
                                                {[0.12, 0.32, 0.50, 0.68, 0.88].map((ratio, idx) => {
                                                    const px = (mainLeftSvgX - 8) + (mainWidthSvg + 16) * ratio;
                                                    const py = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * ratio;
                                                    return (
                                                        <g key={idx}>
                                                            <line x1={px} y1={py + 1} x2={px} y2={py + 4} stroke="#1e293b" strokeWidth="2" />
                                                            <line x1={px} y1={py - 5} x2={px} y2={py} stroke="#93c5fd" strokeWidth="1" />
                                                        </g>
                                                    );
                                                })}

                                                {/* Cote de Hauteur Libre sous traverse */}
                                                <line x1={centerX} y1={clearanceSvgY} x2={centerX} y2={groundY} stroke="#059669" strokeWidth="1" strokeDasharray="2 1.5" />
                                                <line x1={centerX - 4} y1={clearanceSvgY} x2={centerX + 4} y2={clearanceSvgY} stroke="#059669" strokeWidth="1" />
                                                <line x1={centerX - 4} y1={groundY} x2={centerX + 4} y2={groundY} stroke="#059669" strokeWidth="1" />
                                                <text x={centerX + 6} y={clearanceSvgY + (groundY - clearanceSvgY) / 2 + 2.5} fill="#059669" fontSize="6.5" fontWeight="bold">
                                                    Passage libre : {clearanceHeight.toFixed(2)}m
                                                </text>

                                                {/* Cote Toiture supérieure */}
                                                <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 9} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 9} stroke="#2563eb" strokeWidth="1" />
                                                <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 13} x2={mainLeftSvgX - 8} y2={leftEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                                <line x1={mainRightSvgX + 8} y1={rightEaveSvgY - 13} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 5} stroke="#2563eb" strokeWidth="1" />
                                                <text x={centerX} y={(leftEaveSvgY + rightEaveSvgY) / 2 - 12} textAnchor="middle" fill="#1e40af" fontSize="7" fontWeight="bold">
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

                                        const p1X = mainLeftSvgX + overhangM * pxPerMeter;
                                        const p2X = mainLeftSvgX + (overhangM + postSpacingM) * pxPerMeter;

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
                                        const postBaseX = mainLeftSvgX + mainWidthSvg * 0.45;
                                        const mX = postBaseX - mWidth / 2;
                                        const mY = groundY - mHeight;

                                        const postTopRatio = 0.45;
                                        const postTopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * postTopRatio;

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
                                /* ── BÂTIMENT AGRICOLE CLASSIQUE (Symétrique / Asymétrique / Monopente) ── */
                                <g>
                                    <rect x={mainLeftSvgX} y={leftEaveSvgY} width="7" height={groundYLeft - leftEaveSvgY} fill="#334155" />
                                    <rect x={mainRightSvgX - 7} y={rightEaveSvgY} width="7" height={groundYRight - rightEaveSvgY} fill="#334155" />

                                    {/* Poteau intermédiaire pour asymétrique 2 zones */}
                                    {isAsym2 && (
                                        <>
                                            <rect x={middleColSvgX - 3.5} y={middleColTopY} width="7" height={groundY - middleColTopY} fill="#334155" />
                                            <text x={middleColSvgX} y={groundY + 8} textAnchor="middle" fill="#64748b" fontSize="5.5" fontStyle="italic">Poteau intermédiaire</text>
                                        </>
                                    )}

                                    {/* Poteaux Appentis */}
                                    {hasAppentisRight && <rect x={extRightSvgX - 7} y={extRightSvgY} width="7" height={groundYRight - extRightSvgY} fill="#334155" />}
                                    {hasAppentisLeft && <rect x={extLeftSvgX} y={extLeftSvgY} width="7" height={groundYLeft - extLeftSvgY} fill="#334155" />}

                                    {/* Versant Nord */}
                                    <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="4" />
                                    <polygon points={`${mainLeftSvgX - 3},${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 6} ${mainLeftSvgX - 3},${leftEaveSvgY - 6}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />

                                    {/* Versant Sud */}
                                    <line x1={apexSvgX} y1={apexSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="4" />
                                    <polygon points={`${apexSvgX},${apexSvgY - 2} ${mainRightSvgX + 3},${rightEaveSvgY - 2} ${mainRightSvgX + 3},${rightEaveSvgY - 6} ${apexSvgX},${apexSvgY - 6}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />

                                    {/* Extensions éventuelles */}
                                    {hasExtRight && (
                                        <>
                                            <line x1={mainRightSvgX} y1={rightEaveSvgY} x2={extRightSvgX} y2={extRightSvgY} stroke="#1e293b" strokeWidth="3" />
                                            <polygon points={`${mainRightSvgX},${rightEaveSvgY - 2} ${extRightSvgX + 3},${extRightSvgY - 2} ${extRightSvgX + 3},${extRightSvgY - 6} ${mainRightSvgX},${rightEaveSvgY - 6}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                            <text x={(mainRightSvgX + extRightSvgX) / 2} y={Math.min(rightEaveSvgY, extRightSvgY) - 9} textAnchor="middle" fill="#0284c7" fontSize="6.5" fontWeight="bold">
                                                {hasAppentisRight ? `Appentis +${extRightWidth.toFixed(2)}m` : `Auvent +${extRightWidth.toFixed(2)}m`}
                                            </text>
                                        </>
                                    )}
                                    {hasExtLeft && (
                                        <>
                                            <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={extLeftSvgX} y2={extLeftSvgY} stroke="#1e293b" strokeWidth="3" />
                                            <polygon points={`${mainLeftSvgX},${leftEaveSvgY - 2} ${extLeftSvgX - 3},${extLeftSvgY - 2} ${extLeftSvgX - 3},${extLeftSvgY - 6} ${mainLeftSvgX},${leftEaveSvgY - 6}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                            <text x={(mainLeftSvgX + extLeftSvgX) / 2} y={Math.min(leftEaveSvgY, extLeftSvgY) - 9} textAnchor="middle" fill="#0284c7" fontSize="6.5" fontWeight="bold">
                                                {hasAppentisLeft ? `Appentis +${extLeftWidth.toFixed(2)}m` : `Auvent +${extLeftWidth.toFixed(2)}m`}
                                            </text>
                                        </>
                                    )}
                                </g>
                            )}

                            {/* 3. Titre et description toiture */}
                            <text x={350} y={8} textAnchor="middle" fill="#1e3a8a" fontSize="7.5" fontWeight="bold">
                                Toiture {roofTypeLabel} : pente {displayPitch}° ({Math.round(Math.tan((displayPitch * Math.PI) / 180) * 100)}%) {isOmbriere ? '• Façade EST (Pignon) ' : ''}• {isOmbriere ? 'Structure métallique & Modules solaires' : 'Bac acier RAL 7016 + Modules solaires'}
                            </text>

                            {/* 4. Cotes de Hauteur (Sablière Haute / Égout Nord) */}
                            {hasExtLeft ? (
                                <g>
                                    <line x1={extLeftSvgX - 12} y1={extLeftSvgY} x2={extLeftSvgX - 12} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                    <line x1={extLeftSvgX - 15} y1={extLeftSvgY} x2={extLeftSvgX - 9} y2={extLeftSvgY} stroke="#ef4444" strokeWidth="1" />
                                    <line x1={extLeftSvgX - 15} y1={groundYLeft} x2={extLeftSvgX - 9} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                    <text x={extLeftSvgX - 18} y={extLeftSvgY + (groundYLeft - extLeftSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7" fontWeight="bold">
                                        Égout Nord : {extLeftHeight.toFixed(2)}m
                                    </text>
                                </g>
                            ) : (
                                <g>
                                    <line x1={mainLeftSvgX - 16} y1={leftEaveSvgY} x2={mainLeftSvgX - 16} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                    <line x1={mainLeftSvgX - 19} y1={leftEaveSvgY} x2={mainLeftSvgX - 13} y2={leftEaveSvgY} stroke="#ef4444" strokeWidth="1" />
                                    <line x1={mainLeftSvgX - 19} y1={groundYLeft} x2={mainLeftSvgX - 13} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                    <text x={mainLeftSvgX - 22} y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7" fontWeight="bold">
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
                                    <text x={extRightSvgX + 18} y={extRightSvgY + (groundYRight - extRightSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7" fontWeight="bold">
                                        Égout Sud : {extRightHeight.toFixed(2)}m
                                    </text>
                                </g>
                            ) : (
                                <g>
                                    <line x1={mainRightSvgX + 16} y1={rightEaveSvgY} x2={mainRightSvgX + 16} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                                    <line x1={mainRightSvgX + 13} y1={rightEaveSvgY} x2={mainRightSvgX + 19} y2={rightEaveSvgY} stroke="#ef4444" strokeWidth="1" />
                                    <line x1={mainRightSvgX + 13} y1={groundYRight} x2={mainRightSvgX + 19} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                                    <text x={mainRightSvgX + 22} y={rightEaveSvgY + (groundYRight - rightEaveSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7" fontWeight="bold">
                                        {isOmbriere ? `Sablière Basse : ${rightEaveHeight.toFixed(2)}m` : `Égout Sud : ${rightEaveHeight.toFixed(2)}m`}
                                    </text>
                                </g>
                            )}

                            {/* Faîtage / Sommet */}
                            <line x1={apexSvgX} y1={apexSvgY} x2={apexSvgX} y2={groundYLeft} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3 2" />
                            <text x={apexSvgX + 5} y={apexSvgY + 16} fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                Faîtage : {ridgeHeight.toFixed(2)}m
                            </text>

                            {/* 5. Cotes d'emprise au sol (avec cotes internes intermédiaires pour Asymétrique 2 zones) */}
                            {isAsym2 ? (
                                <g>
                                    {/* Lignes repères verticales discrètes */}
                                    <line x1={middleColSvgX} y1={groundY} x2={middleColSvgX} y2="152" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                                    <line x1={mainLeftSvgX} y1={groundY} x2={mainLeftSvgX} y2="152" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                                    <line x1={mainRightSvgX} y1={groundY} x2={mainRightSvgX} y2="152" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />

                                    {/* Cote Zone Gauche (ex: 13.10 m) */}
                                    <line x1={mainLeftSvgX} y1="150" x2={middleColSvgX} y2="150" stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={mainLeftSvgX} y1={146} x2={mainLeftSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={middleColSvgX} y1={146} x2={middleColSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                                    <text x={(mainLeftSvgX + middleColSvgX) / 2} y="146" textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">
                                        {asym2LeftDist.toFixed(2)} m
                                    </text>

                                    {/* Cote Zone Droite (ex: 12.40 m) */}
                                    <line x1={middleColSvgX} y1="150" x2={mainRightSvgX} y2="150" stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={mainRightSvgX} y1={146} x2={mainRightSvgX} y2={154} stroke="#0284c7" strokeWidth="1.2" />
                                    <text x={(middleColSvgX + mainRightSvgX) / 2} y="146" textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">
                                        {asym2RightDist.toFixed(2)} m
                                    </text>

                                    {/* Cote Globale au sol */}
                                    <line x1={mainLeftSvgX} y1="162" x2={mainRightSvgX} y2="162" stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={mainLeftSvgX} y1={158} x2={mainLeftSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={mainRightSvgX} y1={158} x2={mainRightSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                                    <text x={centerX} y={171} textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
                                        ▲ Largeur : {realGroundWidth.toFixed(2)} m (Emprise au sol)
                                    </text>

                                    {/* Extension droite au sol */}
                                    {hasExtRight && (
                                        <g>
                                            <line x1={mainRightSvgX} y1="162" x2={extRightSvgX} y2="162" stroke="#0284c7" strokeWidth="1.2" />
                                            <line x1={extRightSvgX} y1={158} x2={extRightSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                                            <text x={(mainRightSvgX + extRightSvgX) / 2} y={171} textAnchor="middle" fill="#0284c7" fontSize="6.5" fontWeight="bold">+{extRightWidth.toFixed(2)}m</text>
                                        </g>
                                    )}

                                    {/* Extension gauche au sol */}
                                    {hasExtLeft && (
                                        <g>
                                            <line x1={extLeftSvgX} y1="162" x2={mainLeftSvgX} y2="162" stroke="#0284c7" strokeWidth="1.2" />
                                            <line x1={extLeftSvgX} y1={158} x2={extLeftSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                                            <text x={(extLeftSvgX + mainLeftSvgX) / 2} y={171} textAnchor="middle" fill="#0284c7" fontSize="6.5" fontWeight="bold">+{extLeftWidth.toFixed(2)}m</text>
                                        </g>
                                    )}
                                </g>
                            ) : (
                                <g>
                                    <line x1={mainLeftSvgX} y1={groundY} x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                                    <line x1={mainRightSvgX} y1={groundY} x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                                    <line x1={mainLeftSvgX} y1="158" x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={mainLeftSvgX} y1={153} x2={mainLeftSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                                    <line x1={mainRightSvgX} y1={153} x2={mainRightSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                                    <text x={centerX} y={169} textAnchor="middle" fill="#0284c7" fontSize="8" fontWeight="bold">
                                        ▲ Largeur : {realGroundWidth.toFixed(2)} m (Emprise au sol)
                                    </text>

                                    {/* Cote extension droite au sol */}
                                    {hasExtRight && (
                                        <g>
                                            <line x1={mainRightSvgX} y1="158" x2={extRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                                            <line x1={extRightSvgX} y1={153} x2={extRightSvgX} y2={163} stroke="#0284c7" strokeWidth="1.2" />
                                            <text x={(mainRightSvgX + extRightSvgX) / 2} y={169} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">+{extRightWidth.toFixed(2)}m</text>
                                        </g>
                                    )}

                                    {/* Cote extension gauche au sol */}
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
                                <text x={0} y={6.5} fill="#475569" fontSize="5" textAnchor="middle">0</text>
                                <text x={scaleSegWidth} y={6.5} fill="#475569" fontSize="5" textAnchor="middle">2</text>
                                <text x={scaleSegWidth * 2} y={6.5} fill="#475569" fontSize="5" textAnchor="middle">4</text>
                                <text x={scaleSegWidth * 3} y={6.5} fill="#475569" fontSize="5" textAnchor="middle">6</text>
                                <text x={scaleSegWidth * 4} y={6.5} fill="#475569" fontSize="5" textAnchor="middle">8</text>
                                <text x={scaleTotalWidth} y={6.5} fill="#0f172a" fontSize="5.5" fontWeight="bold" textAnchor="middle">10m</text>
                            </g>
                        </svg>
                    </div>
                </div>

                {/* ── BAS : PC4 NOTICE DESCRIPTIVE DU PROJET (SYNTHÈSE EN 5 POINTS ÉTENDUE JUSQU'AU TRAIT BLEU) ── */}
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '2.5mm 4.5mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        NOTICE D'INSERTION & DESCRIPTIVE DU PROJET
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                        {isInteractive ? (
                            <textarea 
                                style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '6.5pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.3' }}
                                value={cleanNoticeText || default5PointsNotice}
                                onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                                placeholder="Notice descriptive du projet..."
                            />
                        ) : cleanNoticeText ? (
                            <div style={{ whiteSpace: 'pre-line', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                                {cleanNoticeText}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm', fontSize: '6.5pt', lineHeight: '1.3' }}>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>1- OBJET DE LA DEMANDE</strong>
                                    <div>La demande de permis de construire porte sur la construction d'un hangar à usage agricole avec toiture photovoltaïque. Il servira de stockage de matériel et céréales ({totalSurface}m²).</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>2- LE SITE</strong>
                                    <div>Le projet se situe sur la commune de {projectCity} (${projectZip}) au {projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>3- LE PROJET</strong>
                                    <div>Le projet a pour objet la construction d'un hangar de forme rectangulaire (longueur : ${longueur}m, largeur : ${largeur.toFixed(2)}m${hasAuvent ? ' + Auvent 4.00m' : ''}) en structure métallique (RAL 7016 / 7005), composé de ${bayCount} travées de ${baySpacing}m d'entraxe. La toiture sera constituée d'une double pente ${roofTypeLabel} (${pente}°) avec pour couverture un bac acier anti condensation sur les deux versants (RAL 7016). Des panneaux photovoltaïques (RAL 9005) viendront recouvrir le bac acier sur l'ensemble de la toiture${displayKwc ? `, permettant de créer une centrale de production d'électricité photovoltaïque de ${displayKwc} kWc` : ''}.</div>
                                    <div>Ce bâtiment sera ouvert et non clos. Les façades Est, Ouest, Nord et Sud seront ouvertes. Un terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée. Des tranchées drainantes seront réalisées tout autour du bâtiment projet afin d'évacuer les eaux pluviales par infiltration dans le sol.</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>4- RACCORDEMENT AUX RESEAUX</strong>
                                    <div>Le bâtiment ne sera pas raccordé aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là. Seule l'électricité produite par la centrale photovoltaïque est renvoyée dans le réseau ENEDIS via un point de livraison situé sur la parcelle au Sud de la parcelle (PDL). L'emplacement du point de livraison indiqué dans les pièces graphiques de l'autorisation d'urbanisme n'apparaît qu'à titre indicatif.</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>5- SECURITE INCENDIE</strong>
                                    <div>Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf PC 02 - Plan de masse).</div>
                                </div>
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
 * PLANCHE PC5 : PLAN DES FAÇADES ET TOITURES (5 VUES 3D)
 */
export const PlateFacades = ({ project, captures, isInteractive, onUpload }) => {
    const safeCaptures = captures || project?.urbanisme_captures || project?.captures || {};
    const sud = safeCaptures.facade_sud || safeCaptures.facades_projet || project?.urbanisme_captures?.facade_sud || project?.captures?.facade_sud || project?.facade_sud;
    const nord = safeCaptures.facade_nord || project?.urbanisme_captures?.facade_nord || project?.captures?.facade_nord || project?.facade_nord;
    const est = safeCaptures.facade_est || project?.urbanisme_captures?.facade_est || project?.captures?.facade_est || project?.facade_est;
    const ouest = safeCaptures.facade_ouest || project?.urbanisme_captures?.facade_ouest || project?.captures?.facade_ouest || project?.facade_ouest;
    const toiture = safeCaptures.vue_couverture || safeCaptures.toiture || project?.urbanisme_captures?.vue_couverture || project?.captures?.vue_couverture || project?.vue_couverture;

    return (
        <div style={PAGE_STYLE} id="pc-plate-facades">
            <PlateHeader title="PC5 : PLAN DES FAÇADES ET TOITURES (5 VUES 3D)" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', maxHeight: '148mm', marginBottom: '4mm' }}>
                
                {/* Ligne 1 : Façades Longs Pans (Sud & Nord) */}
                <div style={{ flex: 1.15, display: 'flex', gap: '3.5mm', minHeight: '66mm' }}>
                    {/* Façade Sud */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            1. FAÇADE SUD (VUE AVANT / LONG PAN)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '1mm' }}>
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
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            2. FAÇADE NORD (VUE ARRIÈRE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '1mm' }}>
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

                {/* Ligne 2 : Pignons (Est & Ouest) et Vue Toiture */}
                <div style={{ flex: 0.95, display: 'flex', gap: '3.5mm', minHeight: '56mm', alignItems: 'stretch' }}>
                    {/* Façade Est */}
                    <div style={{ flex: 1.2, height: '100%', border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.2' }}>
                            <div>3. FAÇADE EST</div>
                            <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '0.5px' }}>(PIGNON GAUCHE)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '1.5mm 0.5mm' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={est || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_est', data)} 
                                defaultText="Vue Façade Est" 
                                label="Façade Est"
                                imageStyle={{ maxHeight: '92%' }}
                            />
                        </div>
                    </div>

                    {/* Façade Ouest */}
                    <div style={{ flex: 1.2, height: '100%', border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.2' }}>
                            <div>4. FAÇADE OUEST</div>
                            <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '0.5px' }}>(PIGNON DROIT)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '1.5mm 0.5mm' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={ouest || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_ouest', data)} 
                                defaultText="Vue Façade Ouest" 
                                label="Façade Ouest"
                                imageStyle={{ maxHeight: '92%' }}
                            />
                        </div>
                    </div>

                    {/* Vue Couverture */}
                    <div style={{ flex: 1.35, height: '100%', border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.5mm', background: '#dbeafe', borderBottom: '1px solid #93c5fd', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#1e40af' }}>
                            5. VUE COUVERTURE (PLAN TOITURE PHOTOVOLTAÏQUE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '1.5mm 0.5mm' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={toiture || sud} 
                                onUpload={(data) => onUpload && onUpload('vue_couverture', data)} 
                                defaultText="Vue Couverture Toiture (Format Paysage)" 
                                label="Plan Toiture"
                                imageStyle={{ maxHeight: '92%' }}
                            />
                        </div>
                    </div>
                </div>

            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateInsertion = ({ project, captures, photos, isInteractive, onUpload }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const safeCaptures = captures || project?.urbanisme_captures || project?.captures || {};
    const photoAvant = safePhotos.avant || safeCaptures.photo_avant || project?.pc_photos?.avant || project?.photos?.avant || project?.urbanisme_captures?.photo_avant || project?.avant || '';
    const photoApres = safePhotos.apres || safeCaptures.photo_apres || project?.pc_photos?.apres || project?.photos?.apres || project?.urbanisme_captures?.photo_apres || project?.apres || '';

    return (
        <div style={PAGE_STYLE} id="pc-plate-insertion">
            <PlateHeader title="PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: '124mm', marginBottom: '6mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '2mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.25' }}>
                        <div>1. VUE DE L'ÉTAT INITIAL DU SITE</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '1px' }}>(AVANT TRAVAUX)</div>
                    </div>
                    <div style={{ flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={photoAvant} 
                            onUpload={(data) => onUpload && onUpload('avant', data)} 
                            defaultText="Photo du terrain existant" 
                            label="État Initial"
                        />
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '2mm', background: '#dcfce7', borderBottom: '1px solid #86efac', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#166534', lineHeight: '1.25' }}>
                        <div>2. VUE APRÈS PROJET</div>
                        <div style={{ fontSize: '7.5pt', fontWeight: 'normal', color: '#15803d', marginTop: '1px' }}>(SIMULATION 3D D'INSERTION PAYSAGÈRE)</div>
                    </div>
                    <div style={{ flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={photoApres} 
                            onUpload={(data) => onUpload && onUpload('apres', data)} 
                            defaultText="Incrustation 3D du projet sur le terrain" 
                            label="Projet 3D"
                        />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnv = ({ project, captures, photos, isInteractive, onUpload }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const safeCaptures = captures || project?.urbanisme_captures || project?.captures || {};
    const photoProche = safePhotos.proche || safeCaptures.env_proche || safeCaptures.satellite || project?.pc_photos?.proche || project?.photos?.proche || project?.urbanisme_captures?.env_proche || project?.proche || '';
    const photoLointain = safePhotos.lointain || safeCaptures.env_lointain || safeCaptures.satellite || project?.pc_photos?.lointain || project?.photos?.lointain || project?.urbanisme_captures?.env_lointain || project?.lointain || '';

    return (
        <div style={PAGE_STYLE} id="pc-plate-env">
            <PlateHeader title="PC7 & PC8 : ENVIRONNEMENT PROCHE ET LOINTAIN" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                        PC7 — Photographie dans l'environnement proche
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={photoProche} 
                            onUpload={(data) => onUpload && onUpload('proche', data)} 
                            defaultText="Photo environnement proche" 
                            label="Env. Proche"
                        />
                    </div>
                </div>

                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                        PC8 — Photographie dans le paysage lointain
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={photoLointain} 
                            onUpload={(data) => onUpload && onUpload('lointain', data)} 
                            defaultText="Photo paysage lointain" 
                            label="Paysage Lointain"
                        />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvProche = (props) => <PlateEnv {...props} />;
export const PlateEnvLointain = (props) => <PlateEnv {...props} />;
export const PlateEnvProcheLointain = (props) => <PlateEnv {...props} />;
export const PlateImpact = (props) => <PlateNotice {...props} />;
export const PlateCover = PlateGarde;
