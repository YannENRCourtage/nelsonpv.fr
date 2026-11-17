import React from 'react';
import { resolveDemandeurNames } from '@/services/SmartCerfaService';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { CoupeBox, useProjectAltimetryProfile } from './DPPlates';

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

export const PlateMasse = ({ project, captures, isInteractive, onUpload, viewNumber = 1 }) => {
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
        <div style={PAGE_STYLE} id={`pc-plate-masse${viewNumber === 3 ? '-vue3' : (viewNumber === 2 ? '-vue2' : '')}`}>
            <PlateHeader 
                title={viewNumber === 3
                    ? "PC2 : PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS (Vue 3 — Zoom d'ensemble — Coté dans les 3 dimensions — Art. R. 431-9)"
                    : (viewNumber === 2 
                        ? "PC2 : PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS (Vue 2 — Zoom étendu — Coté dans les 3 dimensions — Art. R. 431-9)" 
                        : "PC2 : PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS (Coté dans les 3 dimensions — Art. R. 431-9)")} 
                project={project} 
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                {isMulti ? (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rawBuildings.length, 2)}, 1fr)`, gap: '4mm', flex: 1, height: '100%' }}>
                        {rawBuildings.map((b, idx) => {
                            const bPhoto = (viewNumber === 3
                                ? (b?.masse_capture_3 || captures?.masse_projet_3 || project?.masse_capture_3 || project?.urbanisme_captures?.masse_projet_3)
                                : (viewNumber === 2 
                                    ? (b?.masse_capture_2 || captures?.masse_projet_2 || project?.masse_capture_2 || project?.urbanisme_captures?.masse_projet_2) 
                                    : (b?.masse_capture || (idx === 0 ? captures?.masse_projet : null) || project?.masse_capture || project?.urbanisme_captures?.masse_projet))) 
                                || (viewNumber > 1 ? '' : captures?.satellite);
                            let bLen = Number(b.length || (b.bayCount || 5) * (b.baySpacing || 7.5) || project?.longueur || 30);
                            let bW = Number(b.totalWidth || b.width || project?.largeur || 20);
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

                            const bZoomRaw = (viewNumber === 3
                                ? (b?.masse_zoom_3 || captures?.masse_zoom_3 || project?.masse_zoom_3 || project?.urbanisme_captures?.masse_zoom_3 || captures?.masse_zoom || 15)
                                : (viewNumber === 2 
                                    ? (b?.masse_zoom_2 || captures?.masse_zoom_2 || project?.masse_zoom_2 || project?.urbanisme_captures?.masse_zoom_2 || captures?.masse_zoom || 16) 
                                    : (b?.masse_zoom || (idx === 0 ? captures?.masse_zoom : null) || project?.masse_zoom || project?.urbanisme_captures?.masse_zoom || 18)));
                            const bZoom = bZoomRaw;
                            const bRidge = Number(b.ridgeHeight || project?.hauteur_faitage || 6.2);
                            const bEave = Number(b.eaveHeight || project?.hauteur_egout || 4.5);

                            return (
                                <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '3mm', background: '#f8fafc', padding: '2mm', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                        <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                            PC2 — Plan de Masse{viewNumber === 3 ? ' (Vue 3)' : (viewNumber === 2 ? ' (Vue 2)' : '')} : {bDisplayName} (OpenStreetMap Zoom {bZoom})
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2mm', padding: '1mm 1.5mm', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.5mm', fontSize: '6.5pt', color: '#334155' }}>
                                        <div style={{ display: 'flex', gap: '2.5mm', flexWrap: 'wrap' }}>
                                            <span><strong>Cotation 3D :</strong> L={bLen.toFixed(1)}m × l={bW.toFixed(1)}m</span>
                                            <span><strong>Altimétrie :</strong> Faîtage +{bRidge.toFixed(2)}m / Sablière +{bEave.toFixed(2)}m (TN 0.00m)</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Nord ↑ | Cotes d'implantation</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (() => {
                    const b = rawBuildings[0];
                    const bPhoto = (viewNumber === 3
                        ? (b?.masse_capture_3 || captures?.masse_projet_3 || project?.masse_capture_3 || project?.urbanisme_captures?.masse_projet_3)
                        : (viewNumber === 2 
                            ? (b?.masse_capture_2 || captures?.masse_projet_2 || project?.masse_capture_2 || project?.urbanisme_captures?.masse_projet_2) 
                            : (b?.masse_capture || captures?.masse_projet || project?.masse_capture || project?.urbanisme_captures?.masse_projet))) 
                        || (viewNumber > 1 ? '' : captures?.satellite);
                    let bLen = Number(b?.length || (b?.bayCount || 5) * (b?.baySpacing || 7.5) || project?.longueur || 30);
                    let bW = Number(b?.totalWidth || b?.width || project?.largeur || 20);
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

                    const bZoomRaw = (viewNumber === 3
                        ? (b?.masse_zoom_3 || captures?.masse_zoom_3 || project?.masse_zoom_3 || project?.urbanisme_captures?.masse_zoom_3 || captures?.masse_zoom || 15)
                        : (viewNumber === 2 
                            ? (b?.masse_zoom_2 || captures?.masse_zoom_2 || project?.masse_zoom_2 || project?.urbanisme_captures?.masse_zoom_2 || captures?.masse_zoom || 16) 
                            : (b?.masse_zoom || captures?.masse_zoom || project?.masse_zoom || project?.urbanisme_captures?.masse_zoom || 18)));
                    const bZoom = bZoomRaw;
                    const bRidge = Number(b?.ridgeHeight || project?.hauteur_faitage || 6.2);
                    const bEave = Number(b?.eaveHeight || project?.hauteur_egout || 4.5);

                    return (
                        <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '2mm' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                    PC2 — Plan de Masse{viewNumber === 3 ? ' (Vue 3)' : (viewNumber === 2 ? ' (Vue 2)' : '')} : {bDisplayName} (OpenStreetMap Zoom {bZoom})
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5mm', padding: '1.2mm 2.5mm', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '1.5mm', fontSize: '7.2pt', color: '#334155' }}>
                                <div style={{ display: 'flex', gap: '3.5mm' }}>
                                    <span><strong>1. Longueur :</strong> {bLen.toFixed(1)} m</span>
                                    <span><strong>2. Largeur :</strong> {bW.toFixed(1)} m (Emprise : {bArea} m²)</span>
                                    <span><strong>3. Altimétrie :</strong> Faîtage +{bRidge.toFixed(2)} m | Sablière +{bEave.toFixed(2)} m (TN = 0.00 m)</span>
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
    
    const altProfile = useProjectAltimetryProfile(project);

    if (isBattery) {
        const bNoticeRaw = effectiveNoticeText || '';
        const bNoticeClean = (altProfile?.platformAlt && bNoticeRaw.includes('140.62'))
            ? bNoticeRaw.replace(/140\.62\s*m?/g, `${altProfile.platformAlt.toFixed(2)} m`)
            : bNoticeRaw;
        const bTextLen = bNoticeClean.length;
        const bLineCount = bNoticeClean.split('\n').length;
        const bFontSize = (bTextLen > 2700 || bLineCount > 32) ? '6.7pt' : (bTextLen > 2200 || bLineCount > 26) ? '7.0pt' : '7.3pt';
        const bLineHeight = (bTextLen > 2700 || bLineCount > 32) ? '1.16' : (bTextLen > 2200 || bLineCount > 26) ? '1.20' : '1.26';
        const bParagraphs = bNoticeClean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
        const bParaGap = (bTextLen > 2200 || bLineCount > 26) ? '1.1mm' : '1.6mm';

        return (
            <div style={{ ...PAGE_STYLE, padding: '5.5mm 12mm 7.5mm 12mm' }} id="pc-plate-section-notice">
                <PlateHeader title="PC3 : PLAN EN COUPE & PC4 : NOTICE DESCRIPTIVE" project={project} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5mm', marginBottom: '1mm', minHeight: 0 }}>
                    <CoupeBox project={project} coupeLetter="AA'" isMulti={false} boxHeight="41mm" codePrefix="PC3" />

                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '2.5mm', padding: '2mm 4mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                        <div style={{ fontSize: '8.6pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1mm', textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0 }}>
                            NOTICE D'INSERTION &amp; DESCRIPTIVE DU PROJET
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', fontSize: bFontSize, lineHeight: bLineHeight, color: '#334155', display: 'flex', flexDirection: 'column', gap: bParaGap }}>
                            {bParagraphs.map((para, pIdx) => (
                                <div key={pIdx} style={{ whiteSpace: 'pre-line', fontSize: bFontSize, lineHeight: bLineHeight, color: '#334155' }}>
                                    {para}
                                </div>
                            ))}
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

    const roofTypeLabel = (isOmbriere && !(isDouble || isAsym || isSym)) ? 'monopente (ombrière VL/PL)' : isAsym ? (isAsym2 ? 'double pente asymétrique 2 zones' : 'double pente asymétrique') : isSym ? 'double pente symétrique' : 'photovoltaïque';

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
Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées.`;

    const finalCleanNotice = (altProfile?.platformAlt && cleanNoticeText && cleanNoticeText.includes('140.62'))
        ? cleanNoticeText.replace(/140\.62\s*m?/g, `${altProfile.platformAlt.toFixed(2)} m`)
        : cleanNoticeText;
    const pcTextLen = (finalCleanNotice || default5PointsNotice).length;
    const pcLineCount = (finalCleanNotice || default5PointsNotice).split('\n').length;
    const pcFontSize = (pcTextLen > 2700 || pcLineCount > 32) ? '6.7pt' : (pcTextLen > 2200 || pcLineCount > 26) ? '7.0pt' : '7.3pt';
    const pcLineHeight = (pcTextLen > 2700 || pcLineCount > 32) ? '1.16' : (pcTextLen > 2200 || pcLineCount > 26) ? '1.20' : '1.26';
    const pcParagraphs = finalCleanNotice ? finalCleanNotice.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];
    const pcParaGap = (pcTextLen > 2200 || pcLineCount > 26) ? '1.1mm' : '1.6mm';

    return (
        <div style={{ ...PAGE_STYLE, padding: '5.5mm 12mm 7.5mm 12mm' }} id="pc-plate-section-notice">
            <PlateHeader title="PC3 : PLAN EN COUPE & PC4 : NOTICE DESCRIPTIVE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5mm', marginBottom: '1mm', minHeight: 0 }}>
                
                {/* ── HAUT : PC3 PLAN EN COUPE TRANSVERSALE DYNAMIQUE (hauteur réduite + profil altimétrique IGN) ── */}
                <CoupeBox project={project} coupeLetter="AA'" isMulti={false} boxHeight="41mm" codePrefix="PC3" />

                {/* ── BAS : PC4 NOTICE DESCRIPTIVE DU PROJET (cadre agrandi pour afficher l'intégralité du texte) ── */}
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '2.5mm', padding: '2mm 4mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ fontSize: '8.6pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1mm', textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0 }}>
                        NOTICE D'INSERTION &amp; DESCRIPTIVE DU PROJET
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', fontSize: pcFontSize, lineHeight: pcLineHeight, color: '#334155' }}>
                        {isInteractive ? (
                            <textarea 
                                style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: pcFontSize, fontFamily: 'Arial, sans-serif', lineHeight: pcLineHeight }}
                                value={finalCleanNotice || default5PointsNotice}
                                onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                                placeholder="Notice descriptive du projet..."
                            />
                        ) : finalCleanNotice ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: pcParaGap }}>
                                {pcParagraphs.map((para, pIdx) => (
                                    <div key={pIdx} style={{ whiteSpace: 'pre-line', fontSize: pcFontSize, lineHeight: pcLineHeight, color: '#334155' }}>
                                        {para}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm', fontSize: pcFontSize, lineHeight: pcLineHeight }}>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>1- OBJET DE LA DEMANDE</strong>
                                    <div>La demande de permis de construire porte sur la construction d'un hangar à usage agricole avec toiture photovoltaïque. Il servira de stockage de matériel et céréales ({totalSurface}m²).</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>2- LE SITE</strong>
                                    <div>Le projet se situe sur la commune de {projectCity} (${projectZip}) au {projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${altProfile?.platformAlt ? `${altProfile.platformAlt.toFixed(2)} m` : projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.</div>
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
                                    <div>Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées.</div>
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
    const safePhotos = project?.photos || project?.pc_photos || {};
    const sud = safeCaptures.facade_sud || safeCaptures.facades_projet || safeCaptures.sud || safePhotos.facade_sud || safePhotos.sud || project?.urbanisme_captures?.facade_sud || project?.captures?.facade_sud || project?.facade_sud;
    const nord = safeCaptures.facade_nord || safeCaptures.nord || safePhotos.facade_nord || safePhotos.nord || project?.urbanisme_captures?.facade_nord || project?.captures?.facade_nord || project?.facade_nord;
    const est = safeCaptures.facade_est || safeCaptures.est || safePhotos.facade_est || safePhotos.est || project?.urbanisme_captures?.facade_est || project?.captures?.facade_est || project?.facade_est;
    const ouest = safeCaptures.facade_ouest || safeCaptures.ouest || safePhotos.facade_ouest || safePhotos.ouest || project?.urbanisme_captures?.facade_ouest || project?.captures?.facade_ouest || project?.facade_ouest;
    const toiture = safeCaptures.vue_couverture || safeCaptures.toiture || safeCaptures.dessus || safeCaptures.section || safePhotos.vue_couverture || safePhotos.dessus || project?.urbanisme_captures?.vue_couverture || project?.captures?.vue_couverture || project?.vue_couverture;

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
                                photo={nord} 
                                onUpload={(data) => onUpload && onUpload('facade_nord', data)} 
                                defaultText="Vue Façade Nord non capturée" 
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
                                photo={est} 
                                onUpload={(data) => onUpload && onUpload('facade_est', data)} 
                                defaultText="Vue Façade Est non capturée" 
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
                                photo={ouest} 
                                onUpload={(data) => onUpload && onUpload('facade_ouest', data)} 
                                defaultText="Vue Façade Ouest non capturée" 
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
                                photo={toiture} 
                                onUpload={(data) => onUpload && onUpload('vue_couverture', data)} 
                                defaultText="Vue Couverture non capturée" 
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
    const photoAvant = safePhotos.avant || safeCaptures.photo_avant || project?.pc_photos?.avant || project?.photos?.avant || '';
    const photoApres = safePhotos.apres || safeCaptures.photo_apres || project?.pc_photos?.apres || project?.photos?.apres || '';

    const isBattery = Boolean(
        project?.isBattery ||
        project?.isBatteryStandAlone ||
        project?.solutionType === 'battery' ||
        project?.urbanisme_solutionType === 'battery' ||
        project?.installationType === 'Station Batteries Stand-Alone' ||
        (project?.type || '').toLowerCase().includes('batterie') ||
        (project?.buildingName || '').toLowerCase().includes('batterie')
    );

    const defaultBessJustification = `• Bonne intégration dans le paysage et vis-à-vis des tiers : Installation technique de gabarit très réduit (emprise au sol inférieure à 20 m², soit 19,84 m², et hauteur limitée à 2,38 m). Les teintes mates des armoires et la clôture en treillis rigide vert mousse (RAL 6005) s'intègrent sobrement dans la trame végétale existante, sans nuisance visuelle ni co-visibilité directe pour les habitations riveraines.
• Absence d'atteinte au caractère de la zone agricole (Art. L. 151-11 C. Urb.) : Équipement d'intérêt collectif et services publics (régulation et sécurisation du réseau public d'électricité Enedis) implanté en bordure immédiate des ouvrages électriques existants (< 30 m) sur un délaissé de parcelle non cultivé de moins de 20 m². Le projet ne consomme aucune terre agricole exploitable et ne génère aucune gêne pour les circulations d'engins agricoles.
• Mesures paysagères mises en œuvre : Maintien intégral des haies, arbres et écrans végétaux existants aux abords immédiats de la station, et habillage par clôture perméable RAL 6005 conforme au PLU (complétée le cas échéant par une revégétalisation d'essences locales en périphérie).`;

    const rawJustification = project?.dp6_justification !== undefined && project?.dp6_justification !== null && String(project.dp6_justification).trim() !== ''
        ? String(project.dp6_justification)
        : defaultBessJustification;
    const justificationLines = rawJustification.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    return (
        <div style={PAGE_STYLE} id="pc-plate-insertion">
            <PlateHeader title="PC6 : DOCUMENT GRAPHIQUE D'INSERTION PAYSAGÈRE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: isBattery ? '112mm' : '124mm', marginBottom: isBattery ? '2.5mm' : '6mm' }}>
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
                            defaultText="En attente de photographie du terrain existant" 
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
                            defaultText="En attente de simulation 3D d'insertion paysagère" 
                            label="Projet 3D"
                        />
                    </div>
                </div>
            </div>

            {isBattery && (
                <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '2.2mm 3.5mm',
                    marginBottom: '2mm',
                    fontSize: '8.5pt',
                    lineHeight: '1.32',
                    color: '#1e293b',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        fontWeight: 'bold',
                        color: '#0f172a',
                        marginBottom: '1.2mm',
                        fontSize: '8.5pt',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2px'
                    }}>
                        NOTE DE JUSTIFICATION DE L'INSERTION PAYSAGÈRE ET AGRICOLE (ART. R. 431-10 c DU CODE DE L'URBANISME)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm' }}>
                        {justificationLines.map((line, idx) => {
                            const colonIdx = line.indexOf(':');
                            if (colonIdx > 0 && colonIdx < 110) {
                                const prefix = line.slice(0, colonIdx + 1);
                                const rest = line.slice(colonIdx + 1);
                                return (
                                    <div key={idx} style={{ textAlign: 'justify' }}>
                                        <strong style={{ color: '#0f172a' }}>{prefix}</strong>{rest}
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} style={{ textAlign: 'justify' }}>
                                    {line}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Footer project={project} />
        </div>
    );
};

export const PlateEnv = ({ project, captures, photos, isInteractive, onUpload }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    // Rendu conditionnel strict : uniquement les photos uploadées (aucun fallback satellite)
    const photoProche = safePhotos.proche || project?.pc_photos?.proche || project?.photos?.proche || '';
    const photoLointain = safePhotos.lointain || project?.pc_photos?.lointain || project?.photos?.lointain || '';

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
                            defaultText="En attente de photo environnement proche" 
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
                            defaultText="En attente de photo paysage lointain" 
                            label="Paysage Lointain"
                        />
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvProche = ({ project, captures, photos, isInteractive, onUpload }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const photoProche = safePhotos.proche || project?.pc_photos?.proche || project?.photos?.proche || '';

    return (
        <div style={PAGE_STYLE} id="pc-plate-env-proche">
            <PlateHeader title="PC7 — PHOTOGRAPHIE DANS L'ENVIRONNEMENT PROCHE" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '145mm', marginBottom: '5mm' }}>
                <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                    PC7 — Photographie dans l'environnement proche
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '2mm' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={photoProche} 
                        onUpload={(data) => onUpload && onUpload('proche', data)} 
                        defaultText="En attente de photo environnement proche" 
                        label="Env. Proche"
                    />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvLointain = ({ project, captures, photos, isInteractive, onUpload }) => {
    const safePhotos = photos || project?.pc_photos || project?.photos || {};
    const photoLointain = safePhotos.lointain || project?.pc_photos?.lointain || project?.photos?.lointain || '';

    return (
        <div style={PAGE_STYLE} id="pc-plate-env-lointain">
            <PlateHeader title="PC8 — PHOTOGRAPHIE DANS LE PAYSAGE LOINTAIN" project={project} />
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '145mm', marginBottom: '5mm' }}>
                <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                    PC8 — Photographie dans le paysage lointain
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', padding: '2mm' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={photoLointain} 
                        onUpload={(data) => onUpload && onUpload('lointain', data)} 
                        defaultText="En attente de photo paysage lointain" 
                        label="Paysage Lointain"
                    />
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateEnvProcheLointain = (props) => <PlateEnv {...props} />;
export const PlateImpact = (props) => <PlateNotice {...props} />;
export const PlateCover = PlateGarde;
