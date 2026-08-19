import React from 'react';
import { resolveDemandeurNames } from '@/services/SmartCerfaService';

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

const PlateHeader = ({ title, project }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #00429d', paddingBottom: '2mm', marginBottom: '3mm' }}>
        <div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#00429d', letterSpacing: '0.5px' }}>
                NELSON
            </div>
            <div style={{ fontSize: '7pt', color: '#666' }}>L'énergie solaire simplifiée</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#00429d' }}>
                {title}{project?.buildingName && project.buildingName !== 'Bâtiment 1 (Principal)' ? ` — ${project.buildingName.toUpperCase()}` : ''}
            </div>
            <div style={{ fontSize: '7.5pt', color: '#333' }}>
                Projet : {project?.lastName || project?.name || 'Solaire'} {project?.firstName || ''} — {project?.city || project?.commune || 'Cadastre'} ({project?.zip || project?.zipCode || '32'})
            </div>
        </div>
    </div>
);

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
    if (!isInteractive && photo) {
        return (
            <img 
                src={photo} 
                alt={label} 
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxWidth: '100%', maxHeight: '100%', ...imageStyle }} 
            />
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
                <img src={photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', ...imageStyle }} />
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
    const names = resolveDemandeurNames(project);
    const clientFullName = `${names.lastName} ${names.firstName}`.trim() || project?.name || 'Demandeur';
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
    const rawBuildings = project?.buildings && Array.isArray(project.buildings) && project.buildings.length > 0
        ? project.buildings
        : null;

    const isMulti = Boolean(rawBuildings && rawBuildings.length > 1);

    return (
        <div style={PAGE_STYLE} id="pc-plate-masse">
            <PlateHeader title="PC2 : PLAN DE MASSE DES CONSTRUCTIONS" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                {isMulti ? (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rawBuildings.length, 2)}, 1fr)`, gap: '4mm', flex: 1, height: '100%' }}>
                        {rawBuildings.map((b, idx) => {
                            const bPhoto = b.masse_capture || (idx === 0 ? captures?.masse_projet : null) || captures?.satellite;
                            const bLen = Number(b.length || (b.bayCount || 5) * (b.baySpacing || 6) || project?.longueur || 30);
                            const bW = Number(b.width || project?.largeur || 20);
                            const bArea = Math.round(bLen * bW);
                            const bRot = Number(b.rotation || 0);

                            return (
                                <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '3mm', background: '#f8fafc', padding: '2mm', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                        <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                            PC2 — Plan de Masse : {b.name || `Bâtiment ${idx + 1}`}
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
                                            defaultText={`Plan de masse : ${b.name || `Bâtiment ${idx + 1}`}`} 
                                            label={`Plan de Masse (${b.name || `Bât. ${idx + 1}`})`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '3mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <ImageUploadZone 
                            isInteractive={isInteractive} 
                            photo={captures?.masse_projet || captures?.satellite} 
                            onUpload={(data) => onUpload && onUpload('masse_projet', data)} 
                            defaultText="Plan de masse (Cadastre / OpenStreetMap)" 
                            label="Plan de Masse"
                        />
                    </div>
                )}
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE COMBINÉE PC3 / PC4 : COUPE TRANSVERSALE ASYMÉTRIQUE FIDÈLE AU MODÈLE
 */
export const PlateSectionAndNotice = ({ project, noticeText, onNoticeChange, isInteractive }) => {
    const longueur = project?.longueur || '30.0';
    const largeur = parseFloat(project?.largeur || 20.0);
    const hauteurEgout = parseFloat(project?.hauteur_egout || 4.0);
    const pente = parseFloat(project?.pente || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);
    const displayKwc = project?.kwc || project?.puissance || project?.projectSize || '';
    
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
    
    // Détection stricte du type de bâtiment
    const rawType = (project?.buildingType || project?.installationType || project?.type || 'asymetrique_1').toLowerCase();
    const isOmbriere = rawType.includes('ombriere');
    const isMonopente = rawType.includes('monopente');
    const isSym = rawType.includes('symetrique') && !rawType.includes('asym');
    const isAsym2 = rawType.includes('asymetrique_2') || Math.abs(largeur - 25.5) < 0.8 || Math.abs(largeur - 29.1) < 0.8;
    const isAsym = (!isOmbriere && !isMonopente && !isSym) || rawType.includes('asym');

    // Détection des extensions (Auvent / Appentis)
    const hasAuventLeft = Boolean(project?.leftSide === 'auvent');
    const hasAppentisLeft = Boolean(project?.leftSide === 'appentis');
    const hasExtLeft = hasAuventLeft || hasAppentisLeft;

    const hasAuventRight = Boolean(project?.rightSide === 'auvent' || (project?.auvent && project?.auvent !== 'none' && project?.auvent !== false));
    const hasAppentisRight = Boolean(project?.rightSide === 'appentis' || (project?.appentis && project?.appentis !== 'none' && project?.appentis !== false));
    const hasExtRight = hasAuventRight || hasAppentisRight;

    const hasAuvent = hasAuventLeft || hasAuventRight;
    const hasAppentis = hasAppentisLeft || hasAppentisRight;

    // Dimensions extensions
    const extRightWidth = hasAppentisRight ? (Number(project?.rightWidth) || 9.3) : (hasAuventRight ? 4.0 : 0);
    const extLeftWidth = hasAppentisLeft ? (Number(project?.leftWidth) || 9.3) : (hasAuventLeft ? 4.0 : 0);

    // Calculs dimensionnels exacts fidèles au configurateur 3D
    let rightEaveHeight = 4.00;
    let ridgeHeight = 7.40;
    let leftEaveHeight = 6.40;
    let effectivePitch = isOmbriere ? 10 : (isSym ? 10 : (isAsym || isMonopente ? 15 : pente));

    if (isOmbriere) {
        effectivePitch = 10;
        if (rawType.includes('pl')) {
            if (Math.abs(largeur - 15.8) < 0.8) { rightEaveHeight = 6.00; ridgeHeight = 7.90; leftEaveHeight = 7.90; }
            else if (Math.abs(largeur - 20.2) < 0.8) { rightEaveHeight = 6.50; ridgeHeight = 9.30; leftEaveHeight = 9.30; }
            else if (Math.abs(largeur - 24.6) < 0.8) { rightEaveHeight = 7.00; ridgeHeight = 9.30; leftEaveHeight = 9.30; }
            else { rightEaveHeight = 6.00; ridgeHeight = 6.00 + largeur * Math.tan(10 * Math.PI / 180); leftEaveHeight = ridgeHeight; }
        } else if (rawType.includes('simple')) {
            rightEaveHeight = 2.93;
            ridgeHeight = 4.10;
            leftEaveHeight = 4.10;
        } else {
            // Ombrière Double
            if (Math.abs(largeur - 11.3) < 0.8) { rightEaveHeight = 2.80; ridgeHeight = 4.70; leftEaveHeight = 4.70; }
            else { rightEaveHeight = 3.00; ridgeHeight = 4.60; leftEaveHeight = 4.60; }
        }
    } else if (isMonopente) {
        effectivePitch = 15;
        rightEaveHeight = 4.00;
        if (Math.abs(largeur - 12.7) < 0.8) { ridgeHeight = 7.40; leftEaveHeight = 7.40; }
        else if (Math.abs(largeur - 16.4) < 0.8) { ridgeHeight = 8.40; leftEaveHeight = 8.40; }
        else { ridgeHeight = rightEaveHeight + largeur * Math.tan(15 * Math.PI / 180); leftEaveHeight = ridgeHeight; }
    } else if (isAsym) {
        effectivePitch = 15;
        rightEaveHeight = 4.00;
        if (Math.abs(largeur - 16.4) < 0.8 || Math.abs(largeur - 16) < 0.8) {
            ridgeHeight = 7.40;
            leftEaveHeight = 6.40;
        } else if (Math.abs(largeur - 20) < 0.8) {
            ridgeHeight = 8.40;
            leftEaveHeight = 7.40;
        } else if (Math.abs(largeur - 25.5) < 0.8) {
            ridgeHeight = 8.90;
            leftEaveHeight = 6.90;
        } else if (Math.abs(largeur - 29.1) < 0.8) {
            ridgeHeight = 9.80;
            leftEaveHeight = 7.90;
        } else {
            ridgeHeight = rightEaveHeight + (largeur * 0.75 * Math.tan(15 * Math.PI / 180));
            leftEaveHeight = Math.max(3.0, ridgeHeight - (largeur * 0.25 * Math.tan(15 * Math.PI / 180)));
        }
    } else {
        // Symétrique
        effectivePitch = 10;
        leftEaveHeight = 5.50;
        rightEaveHeight = 5.50;
        const defaultSymHeights = {
            15.0: 6.80,
            18.6: 7.10,
            22.3: 7.50,
            26.0: 7.79,
            29.8: 8.10,
            33.5: 8.50,
        };
        const closestW = Object.keys(defaultSymHeights).find(w => Math.abs(largeur - Number(w)) < 0.6);
        if (closestW) {
            ridgeHeight = defaultSymHeights[closestW];
        } else {
            ridgeHeight = leftEaveHeight + ((largeur / 2) * Math.tan(10 * Math.PI / 180));
        }
    }

    // Calcul de la largeur totale réelle (Bâtiment + Extensions) pour un dimensionnement 100% proportionnel
    const totalRealWidth = (hasExtLeft ? extLeftWidth : 0) + largeur + (hasExtRight ? extRightWidth : 0);
    
    // Largeur disponible pour le dessin dans le viewBox (X de 90 à 590 = 500px)
    const availableDrawingWidth = 500;
    const pxPerMeter = Math.min(26, availableDrawingWidth / Math.max(12, totalRealWidth));
    
    const mainWidthSvg = largeur * pxPerMeter;
    const extLeftSvgWidth = (hasExtLeft ? extLeftWidth : 0) * pxPerMeter;
    const extRightSvgWidth = (hasExtRight ? extRightWidth : 0) * pxPerMeter;
    const totalSvgWidth = extLeftSvgWidth + mainWidthSvg + extRightSvgWidth;
    
    // Centrage horizontal parfait
    const startSvgX = Math.round((680 - totalSvgWidth) / 2);
    const mainLeftSvgX = startSvgX + extLeftSvgWidth;
    const mainRightSvgX = mainLeftSvgX + mainWidthSvg;
    const extLeftSvgX = startSvgX;
    const extRightSvgX = mainRightSvgX + extRightSvgWidth;

    // Position faîtage X
    const apexSvgX = isOmbriere
      ? mainLeftSvgX
      : (isAsym ? (mainLeftSvgX + mainWidthSvg * 0.25) : (mainLeftSvgX + mainWidthSvg * 0.5));

    // Coordonnées Y
    const groundYLeft = 140 + Math.sin((terrainSlopeDeg * Math.PI) / 180) * 105;
    const groundYRight = 140 - Math.sin((terrainSlopeDeg * Math.PI) / 180) * 105;

    const apexSvgY = Math.max(14, 140 - ridgeHeight * 13.5);
    const leftEaveSvgY = Math.max(18, groundYLeft - leftEaveHeight * 13.5);
    const rightEaveSvgY = Math.max(22, groundYRight - rightEaveHeight * 13.5);

    // Calcul de la pente et des extrémités d'extensions : STRICTEMENT CO-LINÉAIRES À LA TOITURE PRINCIPALE
    const rightSlopeSvg = (mainRightSvgX > apexSvgX) ? (rightEaveSvgY - apexSvgY) / (mainRightSvgX - apexSvgX) : Math.tan((displayPitch * Math.PI) / 180) * 0.6;
    const leftSlopeSvg = (apexSvgX > mainLeftSvgX) ? (leftEaveSvgY - apexSvgY) / (apexSvgX - mainLeftSvgX) : Math.tan((displayPitch * Math.PI) / 180) * 0.6;

    const extRightSvgY = rightEaveSvgY + (extRightSvgX - mainRightSvgX) * rightSlopeSvg;
    const extLeftSvgY = leftEaveSvgY + (mainLeftSvgX - extLeftSvgX) * leftSlopeSvg;

    // Hauteurs réelles au bout des extensions
    const extRightHeight = Math.max(2.4, rightEaveHeight - extRightWidth * Math.tan((displayPitch * Math.PI) / 180));
    const extLeftHeight = Math.max(2.4, leftEaveHeight - extLeftWidth * Math.tan((displayPitch * Math.PI) / 180));

    // Calcul échelle métrique
    const scaleTotalWidth = 10 * pxPerMeter; // Largeur exacte de la barre 10m
    const scaleSegWidth = 2 * pxPerMeter; // Largeur segment 2m
    const scaleStartX = 660 - scaleTotalWidth; // Ancré en bas à droite sous TN Amont
    const scaleY = 173; // Positionné en bas à droite

    const roofTypeLabel = isOmbriere ? 'monopente (ombrière VL/PL)' : isAsym ? (isAsym2 ? 'double pente asymétrique 2 zones' : 'double pente asymétrique') : isSym ? 'double pente symétrique' : 'photovoltaïque';

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

    // Nettoyer tout doublon de titre éventuel au début du texte de la notice
    const cleanNoticeText = effectiveNoticeText
        ? effectiveNoticeText.replace(/^\s*NOTICE\s+D['’]INSERTION(?:\s*&|\s+ET)?\s*(?:DESCRIPTIVE\s+DU\s+PROJET)?\s*\n+/i, '').trim()
        : null;

    const default5PointsNotice = `1- OBJET DE LA DEMANDE
La demande de permis de construire porte sur la construction d'un hangar à usage agricole avec toiture photovoltaïque. Il servira de stockage de matériel et céréales (${totalSurface}m²).

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
Le projet a pour objet la construction d'un hangar de forme rectangulaire (longueur : ${longueur}m, largeur : ${largeur.toFixed(2)}m${hasAuventRight ? ' + Auvent 4.00m' : hasAppentisRight ? ` + Appentis ${extRightWidth.toFixed(2)}m` : ''}) en structure métallique (RAL 7016 / 7005), composé de ${bayCount} travées de ${baySpacing}m d'entraxe. La toiture sera constituée d'une double pente ${roofTypeLabel} (${displayPitch}°) avec pour couverture un bac acier anti condensation sur les deux versants (RAL 7016). Des panneaux photovoltaïques (RAL 9005) viendront recouvrir le bac acier sur l'ensemble de la toiture, permettant de créer une centrale de production d'électricité photovoltaïque de ${displayKwcStr}.
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
                            Dimensions : {largeur.toFixed(2)}m × {longueur}m{hasAuventRight ? ' (+ Auvent 4.00m)' : hasAppentisRight ? ` (+ Appentis ${extRightWidth.toFixed(2)}m)` : ''}{hasAuventLeft ? ' (+ Auvent 4.00m Gauche)' : hasAppentisLeft ? ` (+ Appentis ${extLeftWidth.toFixed(2)}m Gauche)` : ''} • Échelle indicative
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
                            <line x1="20" y1={groundYLeft} x2="660" y2={groundYRight} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" />
                            <text x="35" y={groundYLeft + 12} fill="#64748b" fontSize="7.5" fontStyle="italic">Terrain naturel conservé (TN Aval)</text>
                            <text x="655" y={groundYRight - 4} textAnchor="end" fill="#64748b" fontSize="7.5" fontStyle="italic">TN Amont</text>

                            {/* 2. Poteaux métalliques principaux */}
                            {!isOmbriere && <rect x={mainLeftSvgX} y={leftEaveSvgY} width="9" height={groundYLeft - leftEaveSvgY} fill="#334155" />}
                            {!isOmbriere && <rect x={mainRightSvgX - 9} y={rightEaveSvgY} width="9" height={groundYRight - rightEaveSvgY} fill="#334155" />}

                            {/* Poteaux Appentis */}
                            {hasAppentisRight && (
                                <>
                                    <rect x={extRightSvgX - 8} y={extRightSvgY} width="8" height={groundYRight - extRightSvgY} fill="#334155" />
                                    <text x={extRightSvgX - 4} y={groundYRight + 10} textAnchor="middle" fill="#64748b" fontSize="6" fontStyle="italic">Poteau appentis</text>
                                </>
                            )}
                            {hasAppentisLeft && (
                                <>
                                    <rect x={extLeftSvgX} y={extLeftSvgY} width="8" height={groundYLeft - extLeftSvgY} fill="#334155" />
                                    <text x={extLeftSvgX + 4} y={groundYLeft + 10} textAnchor="middle" fill="#64748b" fontSize="6" fontStyle="italic">Poteau appentis</text>
                                </>
                            )}

                            {/* 3. Portique & PANNEAUX SOLAIRES SUR TOUTE LA TOITURE */}
                            {isOmbriere ? (
                                <>
                                    {/* Ombrière : Poteau central en Y/V avec jambes de force et arbalétrier monopente 10° */}
                                    <rect x="260" y={groundYLeft - 6} width="90" height="8" rx="1.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                                    <rect x="275" y={groundYLeft - 10} width="60" height="4" rx="1" fill="#94a3b8" />
                                    <text x="305" y={groundYLeft + 8} textAnchor="middle" fill="#64748b" fontSize="6.5" fontStyle="italic">Massif béton</text>

                                    <line x1="288" y1={groundYLeft - 10} x2="225" y2={leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.32 + 8} stroke="#334155" strokeWidth="9" strokeLinecap="round" />
                                    <line x1="322" y1={groundYLeft - 10} x2="385" y2={leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.68 + 8} stroke="#334155" strokeWidth="9" strokeLinecap="round" />
                                    
                                    <line x1="274" y1={groundYLeft - 32} x2="336" y2={groundYLeft - 32} stroke="#475569" strokeWidth="3" />
                                    <line x1="284" y1={groundYLeft - 12} x2="334" y2={groundYLeft - 32} stroke="#64748b" strokeWidth="1.5" />
                                    <line x1="326" y1={groundYLeft - 12} x2="276" y2={groundYLeft - 32} stroke="#64748b" strokeWidth="1.5" />

                                    <line x1={mainLeftSvgX - 10} y1={leftEaveSvgY} x2={mainRightSvgX + 10} y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                                    
                                    <polygon points={`${mainLeftSvgX - 14},${leftEaveSvgY - 2} ${mainRightSvgX + 14},${rightEaveSvgY - 2} ${mainRightSvgX + 14},${rightEaveSvgY - 10} ${mainLeftSvgX - 14},${leftEaveSvgY - 10}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
                                    {[0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88].map((ratio, idx) => {
                                        const px = (mainLeftSvgX - 10) + (mainRightSvgX - mainLeftSvgX + 20) * ratio;
                                        const py = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * ratio;
                                        return <line key={idx} x1={px} y1={py - 10} x2={px} y2={py - 2} stroke="#93c5fd" strokeWidth="1.2" />;
                                    })}

                                    <text x="305" y={groundYLeft - 42} textAnchor="middle" fill="#1e40af" fontSize="7" fontWeight="bold">
                                        Poteau central en Y/V
                                    </text>
                                </>
                            ) : (
                                <>
                                    {/* Versant Nord */}
                                    <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`${mainLeftSvgX - 4},${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 8} ${mainLeftSvgX - 4},${leftEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                    <line x1={mainLeftSvgX + (apexSvgX - mainLeftSvgX) * 0.5} y1={leftEaveSvgY + (apexSvgY - leftEaveSvgY) * 0.5 - 8} x2={mainLeftSvgX + (apexSvgX - mainLeftSvgX) * 0.5} y2={leftEaveSvgY + (apexSvgY - leftEaveSvgY) * 0.5 - 2} stroke="#93c5fd" strokeWidth="1" />

                                    {/* Versant Sud */}
                                    <line x1={apexSvgX} y1={apexSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`${apexSvgX},${apexSvgY - 2} ${mainRightSvgX + 4},${rightEaveSvgY - 2} ${mainRightSvgX + 4},${rightEaveSvgY - 8} ${apexSvgX},${apexSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                    {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                                        const px = apexSvgX + (mainRightSvgX - apexSvgX) * ratio;
                                        const py = apexSvgY + (rightEaveSvgY - apexSvgY) * ratio;
                                        return <line key={idx} x1={px} y1={py - 8} x2={px} y2={py - 2} stroke="#93c5fd" strokeWidth="1" />;
                                    })}

                                    {/* Poteau intermédiaire pour asymétrique 2 zones */}
                                    {isAsym2 && (
                                        <>
                                            <rect x={mainLeftSvgX + mainWidthSvg * 0.47} y={apexSvgY + (rightEaveSvgY - apexSvgY) * 0.32} width="8" height={groundYLeft + (groundYRight - groundYLeft) * 0.46 - (apexSvgY + (rightEaveSvgY - apexSvgY) * 0.32)} fill="#334155" />
                                            <text x={mainLeftSvgX + mainWidthSvg * 0.47 + 4} y={groundYLeft + (groundYRight - groundYLeft) * 0.46 + 10} textAnchor="middle" fill="#64748b" fontSize="6" fontStyle="italic">Poteau intermédiaire</text>
                                        </>
                                    )}

                                    {/* Toiture Extension Droite (Auvent ou Appentis dans le parfait prolongement de la pente) */}
                                    {hasExtRight && (
                                        <>
                                            <line x1={mainRightSvgX} y1={rightEaveSvgY} x2={extRightSvgX} y2={extRightSvgY} stroke="#1e293b" strokeWidth="4.5" />
                                            <polygon points={`${mainRightSvgX},${rightEaveSvgY - 2} ${extRightSvgX + 4},${extRightSvgY - 2} ${extRightSvgX + 4},${extRightSvgY - 8} ${mainRightSvgX},${rightEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                            <line x1={mainRightSvgX + (extRightSvgX - mainRightSvgX) * 0.5} y1={rightEaveSvgY + (extRightSvgY - rightEaveSvgY) * 0.5 - 8} x2={mainRightSvgX + (extRightSvgX - mainRightSvgX) * 0.5} y2={rightEaveSvgY + (extRightSvgY - rightEaveSvgY) * 0.5 - 2} stroke="#93c5fd" strokeWidth="1" />
                                            <text x={(mainRightSvgX + extRightSvgX) / 2} y={Math.min(rightEaveSvgY, extRightSvgY) - 12} textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
                                                {hasAppentisRight ? `Appentis +${extRightWidth.toFixed(2)}m` : `Auvent +${extRightWidth.toFixed(2)}m`}
                                            </text>
                                        </>
                                    )}

                                    {/* Toiture Extension Gauche (Auvent ou Appentis dans le parfait prolongement de la pente) */}
                                    {hasExtLeft && (
                                        <>
                                            <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={extLeftSvgX} y2={extLeftSvgY} stroke="#1e293b" strokeWidth="4.5" />
                                            <polygon points={`${mainLeftSvgX},${leftEaveSvgY - 2} ${extLeftSvgX - 4},${extLeftSvgY - 2} ${extLeftSvgX - 4},${extLeftSvgY - 8} ${mainLeftSvgX},${leftEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                            <line x1={mainLeftSvgX + (extLeftSvgX - mainLeftSvgX) * 0.5} y1={leftEaveSvgY + (extLeftSvgY - leftEaveSvgY) * 0.5 - 8} x2={mainLeftSvgX + (extLeftSvgX - mainLeftSvgX) * 0.5} y2={leftEaveSvgY + (extLeftSvgY - leftEaveSvgY) * 0.5 - 2} stroke="#93c5fd" strokeWidth="1" />
                                            <text x={(mainLeftSvgX + extLeftSvgX) / 2} y={Math.min(leftEaveSvgY, extLeftSvgY) - 12} textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
                                                {hasAppentisLeft ? `Appentis +${extLeftWidth.toFixed(2)}m` : `Auvent +${extLeftWidth.toFixed(2)}m`}
                                            </text>
                                        </>
                                    )}
                                </>
                            )}

                            {/* 4. Mentions de Toiture & PENTE REMONTÉE AU-DESSUS DE LA COUVERTURE */}
                            <text x={350} y={8} textAnchor="middle" fill="#1e3a8a" fontSize="8" fontWeight="bold">
                                Toiture {roofTypeLabel} : pente {displayPitch}° ({Math.round(Math.tan((displayPitch * Math.PI) / 180) * 100)}%) {isOmbriere ? '• Façade EST (Pignon) ' : ''}• {isOmbriere ? 'Structure métallique & Modules solaires' : 'Bac acier RAL 7016 + Modules solaires'}
                            </text>

                            {/* 5. Rappel Hauteurs d'égout et Faîtage */}
                            {hasExtLeft ? (
                                <>
                                    <line x1={extLeftSvgX - 14} y1={extLeftSvgY} x2={extLeftSvgX - 14} y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={extLeftSvgX - 18} y1={extLeftSvgY} x2={extLeftSvgX - 10} y2={extLeftSvgY} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={extLeftSvgX - 18} y1={groundYLeft} x2={extLeftSvgX - 10} y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                                    <text x={extLeftSvgX - 22} y={extLeftSvgY + (groundYLeft - extLeftSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                        Égout Nord : {extLeftHeight.toFixed(2)}m
                                    </text>
                                </>
                            ) : (
                                <>
                                    <line x1={mainLeftSvgX - 22} y1={leftEaveSvgY} x2={mainLeftSvgX - 22} y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={mainLeftSvgX - 26} y1={leftEaveSvgY} x2={mainLeftSvgX - 18} y2={leftEaveSvgY} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={mainLeftSvgX - 26} y1={groundYLeft} x2={mainLeftSvgX - 18} y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                                    <text x={mainLeftSvgX - 30} y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                        {isOmbriere ? `Sablière Haute : ${leftEaveHeight.toFixed(2)}m` : `Sablière Nord : ${leftEaveHeight.toFixed(2)}m`}
                                    </text>
                                </>
                            )}

                            {/* Égout Sud au point le plus bas */}
                            {hasExtRight ? (
                                <>
                                    <line x1={extRightSvgX + 14} y1={extRightSvgY} x2={extRightSvgX + 14} y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={extRightSvgX + 10} y1={extRightSvgY} x2={extRightSvgX + 18} y2={extRightSvgY} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={extRightSvgX + 10} y1={groundYRight} x2={extRightSvgX + 18} y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <text x={extRightSvgX + 22} y={extRightSvgY + (groundYRight - extRightSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                        Égout Sud : {extRightHeight.toFixed(2)}m
                                    </text>
                                </>
                            ) : (
                                <>
                                    <line x1={mainRightSvgX + 22} y1={rightEaveSvgY} x2={mainRightSvgX + 22} y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={mainRightSvgX + 18} y1={rightEaveSvgY} x2={mainRightSvgX + 26} y2={rightEaveSvgY} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={mainRightSvgX + 18} y1={groundYRight} x2={mainRightSvgX + 26} y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <text x={mainRightSvgX + 30} y={rightEaveSvgY + (groundYRight - rightEaveSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                        {isOmbriere ? `Sablière Basse : ${rightEaveHeight.toFixed(2)}m` : `Égout Sud : ${rightEaveHeight.toFixed(2)}m`}
                                    </text>
                                </>
                            )}

                            {/* Faîtage */}
                            <line x1={apexSvgX} y1={apexSvgY} x2={apexSvgX} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
                            <text x={apexSvgX + 6} y={apexSvgY + 20} fill="#ef4444" fontSize="8" fontWeight="bold">
                                Faîtage : {ridgeHeight.toFixed(2)}m
                            </text>

                            {/* 6. Largeur d'emprise au sol : TRAIT BLEU ET INDICATION */}
                            <line x1={mainLeftSvgX} y1={isOmbriere ? leftEaveSvgY : groundYLeft} x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.45" />
                            <line x1={mainRightSvgX} y1={isOmbriere ? rightEaveSvgY : groundYRight} x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.45" />

                            <line x1={mainLeftSvgX} y1="158" x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1={mainLeftSvgX} y1="152" x2={mainLeftSvgX} y2="164" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1={mainRightSvgX} y1="152" x2={mainRightSvgX} y2="164" stroke="#0284c7" strokeWidth="1.5" />

                            <text x={(mainLeftSvgX + mainRightSvgX) / 2} y="170" textAnchor="middle" fill="#0284c7" fontSize="8.5" fontWeight="bold">
                                ▲ Largeur : {largeur.toFixed(2)} m (Emprise au sol)
                            </text>

                            {/* Cote extension droite au sol (trait continu solide, proportionnel) */}
                            {hasExtRight && (
                                <>
                                    <line x1={extRightSvgX} y1={groundYRight} x2={extRightSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.45" />
                                    <line x1={mainRightSvgX} y1="158" x2={extRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.5" />
                                    <line x1={extRightSvgX} y1="152" x2={extRightSvgX} y2="164" stroke="#0284c7" strokeWidth="1.5" />
                                    <text x={(mainRightSvgX + extRightSvgX) / 2} y="170" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">+{extRightWidth.toFixed(2)}m</text>
                                </>
                            )}

                            {/* Cote extension gauche au sol (trait continu solide, proportionnel) */}
                            {hasExtLeft && (
                                <>
                                    <line x1={extLeftSvgX} y1={groundYLeft} x2={extLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.45" />
                                    <line x1={extLeftSvgX} y1="158" x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="1.5" />
                                    <line x1={extLeftSvgX} y1="152" x2={extLeftSvgX} y2="164" stroke="#0284c7" strokeWidth="1.5" />
                                    <text x={(extLeftSvgX + mainLeftSvgX) / 2} y="170" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">+{extLeftWidth.toFixed(2)}m</text>
                                </>
                            )}

                            {/* Barre d'échelle métrique EXACTE (0 à 10m) en bas à droite sous TN Amont */}
                            <g transform={`translate(${scaleStartX}, ${scaleY})`}>
                                <rect x={0} y={0} width={scaleSegWidth} height={3.5} fill="#0f172a" />
                                <rect x={scaleSegWidth} y={0} width={scaleSegWidth} height={3.5} fill="#cbd5e1" />
                                <rect x={scaleSegWidth * 2} y={0} width={scaleSegWidth} height={3.5} fill="#0f172a" />
                                <rect x={scaleSegWidth * 3} y={0} width={scaleSegWidth} height={3.5} fill="#cbd5e1" />
                                <rect x={scaleSegWidth * 4} y={0} width={scaleSegWidth} height={3.5} fill="#0f172a" />
                                
                                <text x={0} y={7} fill="#475569" fontSize="5.5" textAnchor="middle">0</text>
                                <text x={scaleSegWidth} y={7} fill="#475569" fontSize="5.5" textAnchor="middle">2</text>
                                <text x={scaleSegWidth * 2} y={7} fill="#475569" fontSize="5.5" textAnchor="middle">4</text>
                                <text x={scaleSegWidth * 3} y={7} fill="#475569" fontSize="5.5" textAnchor="middle">6</text>
                                <text x={scaleSegWidth * 4} y={7} fill="#475569" fontSize="5.5" textAnchor="middle">8</text>
                                <text x={scaleTotalWidth} y={7} fill="#0f172a" fontSize="6" fontWeight="bold" textAnchor="middle">10m</text>
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
                                    <div>Le projet se situe sur la commune de {projectCity} ({projectZip}) au {projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro {projectCadastre} (surface : {projectSurface}). Le terrain est globalement plat et se trouve à une altitude de {projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>3- LE PROJET</strong>
                                    <div>Le projet a pour objet la construction d'un hangar de forme rectangulaire (longueur : {longueur}m, largeur : {largeur.toFixed(2)}m${hasAuvent ? ' + Auvent 4.00m' : ''}) en structure métallique (RAL 7016 / 7005), composé de ${bayCount} travées de ${baySpacing}m d'entraxe. La toiture sera constituée d'une double pente ${roofTypeLabel} (${pente}°) avec pour couverture un bac acier anti condensation sur les deux versants (RAL 7016). Des panneaux photovoltaïques (RAL 9005) viendront recouvrir le bac acier sur l'ensemble de la toiture${displayKwc ? `, permettant de créer une centrale de production d'électricité photovoltaïque de ${displayKwc} kWc` : ''}.</div>
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
 * Directive : Titres Pignon Gauche et Droit sur 2 lignes, hauteur de cadre Est et Ouest réduite, images à 90% hauteur
 */
export const PlateFacades = ({ project, captures, isInteractive, onUpload }) => {
    const sud = captures?.facade_sud || captures?.facades_projet;
    const nord = captures?.facade_nord;
    const est = captures?.facade_est;
    const ouest = captures?.facade_ouest;
    const toiture = captures?.vue_couverture || captures?.toiture;

    const compressedStyle = { transform: 'scaleY(0.9)', transformOrigin: 'center' };

    return (
        <div style={PAGE_STYLE} id="pc-plate-facades">
            <PlateHeader title="PC5 : PLAN DES FAÇADES ET TOITURES (5 VUES 3D)" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                
                {/* Ligne 1 : Façades Longs Pans (Sud & Nord) */}
                <div style={{ flex: 1, display: 'flex', gap: '4mm', minHeight: '52mm' }}>
                    {/* Façade Sud */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.8mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            1. FAÇADE SUD (VUE AVANT / LONG PAN)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
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
                        <div style={{ padding: '1.8mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            2. FAÇADE NORD (VUE ARRIÈRE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
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

                {/* Ligne 2 : Pignons (Est & Ouest à hauteur de cadre réduite) et Vue Toiture avec hauteur d'image compressée de 10% */}
                <div style={{ flex: 1.15, display: 'flex', gap: '4mm', minHeight: '54mm', alignItems: 'center' }}>
                    {/* Façade Est : Cadre à hauteur réduite, sous-titre sur 2e ligne, image compressée de 10% */}
                    <div style={{ flex: 0.95, height: '88%', border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.2' }}>
                            <div>3. FAÇADE EST</div>
                            <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '0.5px' }}>(PIGNON GAUCHE)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={est || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_est', data)} 
                                defaultText="Vue Façade Est" 
                                label="Façade Est"
                                imageStyle={compressedStyle}
                            />
                        </div>
                    </div>

                    {/* Façade Ouest : Cadre à hauteur réduite, sous-titre sur 2e ligne, image compressée de 10% */}
                    <div style={{ flex: 0.95, height: '88%', border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a', lineHeight: '1.2' }}>
                            <div>4. FAÇADE OUEST</div>
                            <div style={{ fontSize: '6.5pt', fontWeight: 'normal', color: '#64748b', marginTop: '0.5px' }}>(PIGNON DROIT)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={ouest || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_ouest', data)} 
                                defaultText="Vue Façade Ouest" 
                                label="Façade Ouest"
                                imageStyle={compressedStyle}
                            />
                        </div>
                    </div>

                    {/* Vue Couverture : Cadre standard, image compressée de 10% */}
                    <div style={{ flex: 1.5, height: '100%', border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.8mm', background: '#dbeafe', borderBottom: '1px solid #93c5fd', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', color: '#1e40af' }}>
                            5. VUE COUVERTURE (PLAN TOITURE PHOTOVOLTAÏQUE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={toiture || sud} 
                                onUpload={(data) => onUpload && onUpload('vue_couverture', data)} 
                                defaultText="Vue Couverture Toiture (Format Paysage)" 
                                label="Plan Toiture"
                                imageStyle={compressedStyle}
                            />
                        </div>
                    </div>
                </div>

            </div>
            <Footer project={project} />
        </div>
    );
};

export const PlateInsertion = ({ project, photos, isInteractive, onUpload }) => (
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
                        photo={photos?.avant} 
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
                        photo={photos?.apres} 
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

export const PlateEnv = ({ project, photos, isInteractive, onUpload }) => (
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
                        photo={photos?.proche} 
                        onUpload={(data) => onUpload && onUpload('proche', data)} 
                        defaultText="Photo environnement proche (vue depuis la voie publique)" 
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
                        photo={photos?.lointain} 
                        onUpload={(data) => onUpload && onUpload('lointain', data)} 
                        defaultText="Photo paysage lointain (vue panoramique du site)" 
                        label="Env. Lointain"
                    />
                </div>
            </div>
        </div>
        <Footer project={project} />
    </div>
);

export const PlateEnvProche = (props) => <PlateEnv {...props} />;
export const PlateEnvLointain = (props) => <PlateEnv {...props} />;
export const PlateEnvProcheLointain = (props) => <PlateEnv {...props} />;
export const PlateImpact = (props) => <PlateNotice {...props} />;
export const PlateCover = PlateGarde;
