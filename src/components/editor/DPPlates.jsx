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
                            {project?.description || `Installation d'une ombrière photovoltaïque en structure métallique d'une puissance de ${project?.kwc || 100} kWc.`}
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
    const rawBuildings = project?.buildings && Array.isArray(project.buildings) && project.buildings.length > 0
        ? project.buildings
        : [{
            name: 'Ombrière 1 (Principale)',
            length: Number(project?.longueur || 30),
            width: Number(project?.largeur || 20),
            masse_capture: captures?.masse_projet || captures?.satellite
        }];

    const isMulti = rawBuildings.length > 1;

    return (
        <div style={PAGE_STYLE} id="dp-plate-masse">
            <PlateHeader title="DP2 — PLAN DE MASSE DES CONSTRUCTIONS ET AMÉNAGEMENTS" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                {isMulti ? (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rawBuildings.length, 2)}, 1fr)`, gap: '4mm', flex: 1, height: '100%' }}>
                        {rawBuildings.map((b, idx) => {
                            const bPhoto = b.masse_capture || (idx === 0 ? captures?.masse_projet : null) || captures?.satellite;
                            const bLen = Number(b.length || (b.bayCount || 5) * (b.baySpacing || 7.5) || project?.longueur || 30);
                            const bW = Number(b.width || project?.largeur || 20);
                            const bArea = Math.round(bLen * bW);
                            const bDisplayName = b.name ? b.name.replace(/Bâtiment/gi, 'Ombrière').replace(/Principalee+/gi, 'Principale').replace(/\bPrincipal\b/g, 'Principale') : `Ombrière ${idx + 1}`;

                            return (
                                <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '3mm', background: '#f8fafc', padding: '2mm', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                        <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                            DP2 — Plan de Masse : {bDisplayName}
                                        </span>
                                        <span style={{ fontSize: '7pt', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '0.5mm 1.5mm', borderRadius: '2mm' }}>
                                            {bLen.toFixed(1)}m × {bW.toFixed(1)}m ({bArea} m²)
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '2mm', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={bPhoto || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan de masse" crossOrigin="anonymous" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (() => {
                    const b = rawBuildings[0];
                    const bPhoto = b?.masse_capture || captures?.masse_projet || captures?.satellite;
                    const bLen = Number(b?.length || (b?.bayCount || 5) * (b?.baySpacing || 7.5) || project?.longueur || 30);
                    const bW = Number(b?.width || project?.largeur || 20);
                    const bArea = Math.round(bLen * bW);
                    const bDisplayName = b?.name ? b.name.replace(/Bâtiment/gi, 'Ombrière').replace(/Principalee+/gi, 'Principale').replace(/\bPrincipal\b/g, 'Principale') : 'Ombrière 1 (Principale)';

                    return (
                        <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '2mm' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm', padding: '0 1mm' }}>
                                <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                    DP2 — Plan de Masse : {bDisplayName} (OpenStreetMap Zoom 19)
                                </span>
                                <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '0.5mm 2mm', borderRadius: '2mm' }}>
                                    {bLen.toFixed(1)}m × {bW.toFixed(1)}m ({bArea} m²)
                                </span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '2mm', background: '#ffffff' }}>
                                <img src={bPhoto || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan de masse" crossOrigin="anonymous" />
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
 * PLANCHE DP3 : PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION (& NOTICE DESCRIPTIVE OPTIONNELLE)
 */
export const PlateCoupe = ({ project, captures, noticeText, includeNotice = false }) => {
    const longueur = project?.longueur || '30.0';
    const largeur = parseFloat(project?.largeur || 20.0);
    const hauteurEgout = parseFloat(project?.hauteur_egout || 4.0);
    const pente = parseFloat(project?.pente || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);
    
    // Détection stricte du type d'ouvrage
    const rawType = (project?.buildingType || project?.installationType || project?.type || 'asymetrique_1').toLowerCase();
    const isOmbriere = rawType.includes('ombriere');
    const isPL = isOmbriere && (rawType.includes('pl') || largeur >= 14.5);
    const isSimple = isOmbriere && !isPL && (rawType.includes('simple') || largeur <= 6.5);
    const isDouble = isOmbriere && !isPL && !isSimple;
    const isMonopente = !isOmbriere && rawType.includes('monopente');
    const isSym = !isOmbriere && rawType.includes('symetrique') && !rawType.includes('asym');
    const isAsym2 = !isOmbriere && (rawType.includes('asymetrique_2') || (!isSym && (Math.abs(largeur - 25.5) < 0.8 || Math.abs(largeur - 29.1) < 0.8)));
    const isAsym = !isOmbriere && !isMonopente && !isSym;

    // Détection des extensions (Auvent / Appentis)
    const hasAppentisLeft = project?.leftSide === 'appentis';
    const hasAuventLeft = !hasAppentisLeft && project?.leftSide === 'auvent';
    const hasExtLeft = hasAuventLeft || hasAppentisLeft;

    const hasAppentisRight = project?.rightSide === 'appentis' || (!project?.rightSide && Boolean(project?.appentis && project?.appentis !== 'none' && project?.appentis !== false));
    const hasAuventRight = !hasAppentisRight && (project?.rightSide === 'auvent' || (!project?.rightSide && Boolean(project?.auvent && project?.auvent !== 'none' && project?.auvent !== false)));
    const hasExtRight = hasAuventRight || hasAppentisRight;

    // Dimensions extensions : Appentis par défaut à 9.30m, Auvent à 4.00m
    const extRightWidth = hasAppentisRight ? ((Number(project?.rightWidth) && Number(project?.rightWidth) > 5) ? Number(project.rightWidth) : 9.3) : (hasAuventRight ? (Number(project?.rightWidth) || 4.0) : 0);
    const extLeftWidth = hasAppentisLeft ? ((Number(project?.leftWidth) && Number(project?.leftWidth) > 5) ? Number(project.leftWidth) : 9.3) : (hasAuventLeft ? (Number(project?.leftWidth) || 4.0) : 0);

    // Données pour la notice descriptive
    const hasNotice = Boolean(includeNotice || project?.includeNotice || project?.hasNotice);
    const projectAddress = project?.address || project?.clientAddress || project?.location || 'Lieu-dit Le Projet';
    const projectCity = project?.city || project?.clientCity || 'Commune du projet';
    const projectZip = project?.zip || project?.postalCode || '00000';
    const projectCadastre = project?.cadastre || project?.parcelle || 'Section A n° 001';
    const projectSurface = project?.parcelleSurface ? `${project.parcelleSurface} m²` : '3 500 m²';
    const totalSurface = Math.round((largeur + (hasExtLeft ? extLeftWidth : 0) + (hasExtRight ? extRightWidth : 0)) * longueur);
    const displayKwc = project?.kwc || Math.round(totalSurface * 0.20);
    const cleanNoticeText = noticeText || project?.noticeText || project?.noticeAgricole || project?.pc_notice || project?.description;

    const default5PointsNoticeDP = `1- OBJET DE LA DÉCLARATION PRÉALABLE
La présente déclaration préalable a pour objet l'installation d'une structure ombrière photovoltaïque en toiture d'une puissance de ${displayKwc} kWc (${totalSurface}m²).

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est plat et l'accès se fait directement depuis la voirie existante.

3- LE PROJET
Le projet consiste en l'implantation d'une structure ombrière photovoltaïque en charpente métallique (RAL 7016) de dimensions ${largeur.toFixed(2)}m de large par ${longueur}m de long, avec une toiture supportant des modules solaires monocristallins noirs. La hauteur libre sous structure et la pente respectent l'intégration paysagère.

4- RACCORDEMENT AUX RÉSEAUX
La production électrique de la centrale photovoltaïque sera injectée sur le réseau public de distribution d'électricité (ENEDIS) via un point de livraison situé sur la parcelle.

5- SÉCURITÉ & ENVIRONNEMENT
L'ouvrage ne génère aucune nuisance sonore ni rejet dans l'environnement. Les eaux de pluie s'écoulent naturellement sur le terrain.`;

    // Calculs dimensionnels RÉELS & PROPORTIONNELS selon les fiches constructeur
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
            if (largeur > 22.0) {
                realRoofWidth = 25.03; realGroundWidth = 24.65;
                leftEaveHeight = 9.35; ridgeHeight = 9.65; rightEaveHeight = 5.00;
                clearanceHeight = 3.38;
            } else if (largeur > 18.0) {
                realRoofWidth = 20.53; realGroundWidth = 20.22;
                leftEaveHeight = 9.29; ridgeHeight = 9.60; rightEaveHeight = 5.73;
                clearanceHeight = 3.38;
            } else {
                realRoofWidth = 16.03; realGroundWidth = 15.79;
                leftEaveHeight = 7.86; ridgeHeight = 8.16; rightEaveHeight = 5.08;
                clearanceHeight = 3.38;
            }
        } else if (isSimple) {
            realRoofWidth = largeur > 5.2 ? 5.80 : 5.00;
            realGroundWidth = largeur;
            leftEaveHeight = 4.10; ridgeHeight = 4.35; rightEaveHeight = 2.93;
            clearanceHeight = 2.40; massifWidth = 1.20;
        } else {
            if (largeur > 10.0 || Math.abs(largeur - 11.3) < 1.0) {
                realRoofWidth = 11.53; realGroundWidth = 11.35;
                leftEaveHeight = 4.74; ridgeHeight = 5.11; rightEaveHeight = 2.80;
                clearanceHeight = 2.20; massifWidth = 1.70;
            } else {
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
    } else {
        effectivePitch = pente || 15;
        rightEaveHeight = hauteurEgout || 4.00;
        ridgeHeight = rightEaveHeight + (largeur * 0.75 * Math.tan(effectivePitch * Math.PI / 180));
        leftEaveHeight = Math.max(3.0, ridgeHeight - (largeur * 0.25 * Math.tan(effectivePitch * Math.PI / 180)));
        realRoofWidth = largeur;
        realGroundWidth = largeur;
    }

    const displayPitch = effectivePitch;

    const totalRealWidth = isOmbriere
        ? realRoofWidth
        : ((hasExtLeft ? extLeftWidth : 0) + largeur + (hasExtRight ? extRightWidth : 0));
    
    const maxRealHeight = Math.max(ridgeHeight, leftEaveHeight, rightEaveHeight) + 1.2;

    // Échelle UNIFORME X & Y (1:1 Isométrique)
    const availableDrawingWidth = 500;
    const availableDrawingHeight = 110;
    const pxPerMeterX = availableDrawingWidth / Math.max(8, totalRealWidth);
    const pxPerMeterY = availableDrawingHeight / Math.max(4.0, maxRealHeight);
    const pxPerM = Math.min(pxPerMeterX, pxPerMeterY, 22);

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

    const apexSvgX = isOmbriere
      ? mainLeftSvgX
      : (isAsym ? (mainLeftSvgX + mainWidthSvg * 0.25) : (mainLeftSvgX + mainWidthSvg * 0.5));

    const groundY = 142;
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

    // Hauteur d'égout de l'extension : 3.90m pour Appentis, ou calculée pour Auvent
    const extRightHeight = hasAppentisRight ? 3.90 : Math.max(2.4, rightEaveHeight - extRightWidth * Math.tan((effectivePitch * Math.PI) / 180));
    const extLeftHeight = hasAppentisLeft ? 3.90 : Math.max(2.4, leftEaveHeight - extLeftWidth * Math.tan((effectivePitch * Math.PI) / 180));

    const scaleTotalWidth = 10 * pxPerM;
    const scaleSegWidth = 2 * pxPerM;
    const scaleStartX = 660 - scaleTotalWidth;
    const scaleY = 172;

    const asym2LeftDist = 13.1;
    const asym2RightDist = (Math.abs(largeur - 25.5) < 0.8) ? 12.4 : (Math.abs(largeur - 29.1) < 0.8 ? 16.0 : (largeur - 13.1));
    const middleColSvgX = mainLeftSvgX + asym2LeftDist * pxPerM;
    const middleColTopY = apexSvgY + (rightEaveSvgY - apexSvgY) * ((middleColSvgX - apexSvgX) / (mainRightSvgX - apexSvgX));

    const roofTypeLabel = isOmbriere ? 'monopente (ombrière VL/PL)' : isAsym ? (isAsym2 ? 'double pente asymétrique 2 zones' : 'double pente asymétrique') : isSym ? 'double pente symétrique' : 'photovoltaïque';

    const coupeSvgContent = (
        <svg width="680" height="186" viewBox="0 0 680 186" style={{ width: '100%', height: '100%', maxHeight: hasNotice ? '54mm' : '85mm' }}>
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
                                /* ── OMBRIÈRE PL (Multi-poteaux verticaux avec contreventements) ── */
                                (() => {
                                    const p1X = mainLeftSvgX + mainWidthSvg * 0.25;
                                    const p2X = mainLeftSvgX + mainWidthSvg * 0.75;
                                    const p1TopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.25;
                                    const p2TopY = leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.75;

                                    return (
                                        <g>
                                            <rect x={p1X - 12} y={groundY - 6} width="24" height="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" rx="1" />
                                            <rect x={p2X - 12} y={groundY - 6} width="24" height="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" rx="1" />

                                            <rect x={p1X - 4} y={p1TopY} width="8" height={groundY - p1TopY} fill="#1e293b" rx="0.5" />
                                            <rect x={p2X - 4} y={p2TopY} width="8" height={groundY - p2TopY} fill="#1e293b" rx="0.5" />

                                            <line x1={p1X} y1={clearanceSvgY} x2={p2X} y2={clearanceSvgY} stroke="#334155" strokeWidth="2.5" />
                                            <line x1={p1X} y1={clearanceSvgY} x2={p2X} y2={p2TopY + 3} stroke="#475569" strokeWidth="2" />
                                            <line x1={p2X} y1={clearanceSvgY} x2={p1X} y2={p1TopY + 3} stroke="#475569" strokeWidth="2" />

                                            <polygon
                                                points={`${mainLeftSvgX - 8},${leftEaveSvgY} ${mainRightSvgX + 8},${rightEaveSvgY} ${mainRightSvgX + 8},${rightEaveSvgY - 5} ${mainLeftSvgX - 8},${leftEaveSvgY - 5}`}
                                                fill="#1d4ed8"
                                                stroke="#60a5fa"
                                                strokeWidth="1"
                                            />
                                            {[0.15, 0.35, 0.55, 0.75, 0.95].map((r, i) => (
                                                <line key={i} x1={mainLeftSvgX + mainWidthSvg * r} y1={leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * r - 5} x2={mainLeftSvgX + mainWidthSvg * r} y2={leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * r} stroke="#93c5fd" strokeWidth="1" />
                                            ))}

                                            <line x1={mainLeftSvgX - 8} y1={leftEaveSvgY - 9} x2={mainRightSvgX + 8} y2={rightEaveSvgY - 9} stroke="#2563eb" strokeWidth="1" />
                                            <text x={centerX} y={(leftEaveSvgY + rightEaveSvgY) / 2 - 12} textAnchor="middle" fill="#1e40af" fontSize="7.5" fontWeight="bold">
                                                Toiture PL : {realRoofWidth.toFixed(2)}m
                                            </text>
                                        </g>
                                    );
                                })()
                            ) : (
                                /* ── OMBRIÈRE SIMPLE VL ── */
                                <g>
                                    <rect x={mainLeftSvgX + mainWidthSvg * 0.4} y={groundY - 6} width="20" height="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" rx="1" />
                                    <line x1={mainLeftSvgX + mainWidthSvg * 0.5} y1={groundY - 6} x2={mainLeftSvgX + mainWidthSvg * 0.35} y2={leftEaveSvgY + (rightEaveSvgY - leftEaveSvgY) * 0.35} stroke="#1e293b" strokeWidth="6" />
                                    <polygon points={`${mainLeftSvgX - 6},${leftEaveSvgY} ${mainRightSvgX + 6},${rightEaveSvgY} ${mainRightSvgX + 6},${rightEaveSvgY - 5} ${mainLeftSvgX - 6},${leftEaveSvgY - 5}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                </g>
                            )
                        ) : (
                            /* ── BÂTIMENT AGRICOLE CLASSIQUE ── */
                            <g>
                                <rect x={mainLeftSvgX} y={leftEaveSvgY} width="8" height={groundYLeft - leftEaveSvgY} fill="#334155" />
                                <rect x={mainRightSvgX - 8} y={rightEaveSvgY} width="8" height={groundYRight - rightEaveSvgY} fill="#334155" />

                                {/* Poteau intermédiaire pour asymétrique 2 zones */}
                                {isAsym2 && (
                                    <>
                                        <rect x={middleColSvgX - 4} y={middleColTopY} width="8" height={groundY - middleColTopY} fill="#334155" />
                                        <text x={middleColSvgX} y={groundY + 8} textAnchor="middle" fill="#64748b" fontSize="6" fontStyle="italic">Poteau intermédiaire</text>
                                    </>
                                )}

                                {hasAppentisRight && <rect x={extRightSvgX - 7} y={extRightSvgY} width="7" height={groundYRight - extRightSvgY} fill="#334155" />}
                                {hasAppentisLeft && <rect x={extLeftSvgX} y={extLeftSvgY} width="7" height={groundYLeft - extLeftSvgY} fill="#334155" />}

                                {/* Versant Nord */}
                                <line x1={mainLeftSvgX} y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="4.5" />
                                <polygon points={`${mainLeftSvgX - 4},${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 7} ${mainLeftSvgX - 4},${leftEaveSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />

                                {/* Versant Sud */}
                                <line x1={apexSvgX} y1={apexSvgY} x2={mainRightSvgX} y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="4.5" />
                                <polygon points={`${apexSvgX},${apexSvgY - 2} ${mainRightSvgX + 4},${rightEaveSvgY - 2} ${mainRightSvgX + 4},${rightEaveSvgY - 7} ${apexSvgX},${apexSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
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
                            Toiture {roofTypeLabel} : pente {displayPitch}° ({Math.round(Math.tan((displayPitch * Math.PI) / 180) * 100)}%) {isOmbriere ? '• Façade EST (Pignon) ' : ''}• {isOmbriere ? 'Structure métallique & Modules solaires' : 'Bac acier RAL 7016 + Modules solaires'}
                        </text>

                        {/* 4. Cotes de Hauteur (Sablière Haute / Égout Nord) */}
                        {hasExtLeft ? (
                            <g>
                                <line x1={extLeftSvgX - 12} y1={extLeftSvgY} x2={extLeftSvgX - 12} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                <line x1={extLeftSvgX - 15} y1={extLeftSvgY} x2={extLeftSvgX - 9} y2={extLeftSvgY} stroke="#ef4444" strokeWidth="1" />
                                <line x1={extLeftSvgX - 15} y1={groundYLeft} x2={extLeftSvgX - 9} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                <text x={extLeftSvgX - 18} y={extLeftSvgY + (groundYLeft - extLeftSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                    Égout Nord : {extLeftHeight.toFixed(2)}m
                                </text>
                            </g>
                        ) : (
                            <g>
                                <line x1={mainLeftSvgX - 16} y1={leftEaveSvgY} x2={mainLeftSvgX - 16} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 19} y1={leftEaveSvgY} x2={mainLeftSvgX - 13} y2={leftEaveSvgY} stroke="#ef4444" strokeWidth="1" />
                                <line x1={mainLeftSvgX - 19} y1={groundYLeft} x2={mainLeftSvgX - 13} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" />
                                <text x={mainLeftSvgX - 22} y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7.5" fontWeight="bold">
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
                                <text x={extRightSvgX + 18} y={extRightSvgY + (groundYRight - extRightSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                    Égout Sud : {extRightHeight.toFixed(2)}m
                                </text>
                            </g>
                        ) : (
                            <g>
                                <line x1={mainRightSvgX + 16} y1={rightEaveSvgY} x2={mainRightSvgX + 16} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                                <line x1={mainRightSvgX + 13} y1={rightEaveSvgY} x2={mainRightSvgX + 19} y2={rightEaveSvgY} stroke="#ef4444" strokeWidth="1" />
                                <line x1={mainRightSvgX + 13} y1={groundYRight} x2={mainRightSvgX + 19} y2={groundYRight} stroke="#ef4444" strokeWidth="1" />
                                <text x={mainRightSvgX + 22} y={rightEaveSvgY + (groundYRight - rightEaveSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7.5" fontWeight="bold">
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
                                <text x={centerX} y="171" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
                                    ▲ Largeur : {realGroundWidth.toFixed(2)} m (Emprise au sol)
                                </text>

                                {/* Extension droite au sol */}
                                {hasExtRight && (
                                    <g>
                                        <line x1={mainRightSvgX} y1="162" x2={extRightSvgX} y2="162" stroke="#0284c7" strokeWidth="1.2" />
                                        <line x1={extRightSvgX} y1={158} x2={extRightSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                                        <text x={(mainRightSvgX + extRightSvgX) / 2} y="171" textAnchor="middle" fill="#0284c7" fontSize="6.5" fontWeight="bold">+{extRightWidth.toFixed(2)}m</text>
                                    </g>
                                )}

                                {/* Extension gauche au sol */}
                                {hasExtLeft && (
                                    <g>
                                        <line x1={extLeftSvgX} y1="162" x2={mainLeftSvgX} y2="162" stroke="#0284c7" strokeWidth="1.2" />
                                        <line x1={extLeftSvgX} y1={158} x2={extLeftSvgX} y2={166} stroke="#0284c7" strokeWidth="1.2" />
                                        <text x={(extLeftSvgX + mainLeftSvgX) / 2} y="171" textAnchor="middle" fill="#0284c7" fontSize="6.5" fontWeight="bold">+{extLeftWidth.toFixed(2)}m</text>
                                    </g>
                                )}
                            </g>
                        ) : (
                            <g>
                                <line x1={mainLeftSvgX} y1={groundY} x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                                <line x1={mainRightSvgX} y1={groundY} x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
                                <line x1={mainLeftSvgX} y1="158" x2={mainRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                                <line x1={mainLeftSvgX} y1="153" x2={mainLeftSvgX} y2="163" stroke="#0284c7" strokeWidth="1.2" />
                                <line x1={mainRightSvgX} y1="153" x2={mainRightSvgX} y2="163" stroke="#0284c7" strokeWidth="1.2" />
                                <text x={centerX} y="169" textAnchor="middle" fill="#0284c7" fontSize="8.5" fontWeight="bold">
                                    ▲ Largeur : {realGroundWidth.toFixed(2)} m (Emprise au sol)
                                </text>

                                {/* Cote extension droite au sol */}
                                {hasExtRight && (
                                    <g>
                                        <line x1={mainRightSvgX} y1="158" x2={extRightSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                                        <line x1={extRightSvgX} y1="153" x2={extRightSvgX} y2="163" stroke="#0284c7" strokeWidth="1.2" />
                                        <text x={(mainRightSvgX + extRightSvgX) / 2} y="169" textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">+{extRightWidth.toFixed(2)}m</text>
                                    </g>
                                )}

                                {/* Cote extension gauche au sol */}
                                {hasExtLeft && (
                                    <g>
                                        <line x1={extLeftSvgX} y1="158" x2={mainLeftSvgX} y2="158" stroke="#0284c7" strokeWidth="1.2" />
                                        <line x1={extLeftSvgX} y1="153" x2={extLeftSvgX} y2="163" stroke="#0284c7" strokeWidth="1.2" />
                                        <text x={(extLeftSvgX + mainLeftSvgX) / 2} y="169" textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">+{extLeftWidth.toFixed(2)}m</text>
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

    return (
        <div style={PAGE_STYLE} id="dp-plate-coupe">
            <PlateHeader 
                title={hasNotice ? "DP3 : PLAN EN COUPE & NOTICE DESCRIPTIVE" : "DP3 — PLAN EN COUPE DU TERRAIN ET DE LA CONSTRUCTION"} 
                project={project} 
            />
            {hasNotice ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5mm', marginBottom: '8mm' }}>
                    {/* HAUT : DP3 PLAN EN COUPE TRANSVERSALE */}
                    <div style={{ height: '62mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                            <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                                DP3 — COUPE DE TERRAIN & DU BÂTIMENT (COUPE TRANSVERSALE AA')
                            </span>
                            <span style={{ fontSize: '7pt', color: '#64748b' }}>
                                Dimensions : {largeur.toFixed(2)}m × {longueur}m{hasAuventRight ? ` (+ Auvent ${extRightWidth.toFixed(2)}m)` : hasAppentisRight ? ` (+ Appentis ${extRightWidth.toFixed(2)}m)` : ''}{hasAuventLeft ? ` (+ Auvent ${extLeftWidth.toFixed(2)}m Gauche)` : hasAppentisLeft ? ` (+ Appentis ${extLeftWidth.toFixed(2)}m Gauche)` : ''} • Échelle indicative
                            </span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {coupeSvgContent}
                        </div>
                    </div>

                    {/* BAS : NOTICE DESCRIPTIVE DU PROJET */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '2.5mm 4.5mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            NOTICE D'INSERTION & DESCRIPTIVE DU PROJET
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '6.5pt', lineHeight: '1.3', color: '#334155' }}>
                                {cleanNoticeText || default5PointsNoticeDP}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4mm 6mm', display: 'flex', flexDirection: 'column', background: '#f8fafc', maxHeight: '135mm', marginBottom: '5mm' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm' }}>
                        <span style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                            Coupe transversale AA' — Ombrière photovoltaïque & Terrain naturel
                        </span>
                        <span style={{ fontSize: '8pt', color: '#64748b' }}>
                            Dimensions : {largeur.toFixed(2)}m × {longueur}m{hasAuventRight ? ` (+ Auvent ${extRightWidth.toFixed(2)}m)` : hasAppentisRight ? ` (+ Appentis ${extRightWidth.toFixed(2)}m)` : ''}{hasAuventLeft ? ` (+ Auvent ${extLeftWidth.toFixed(2)}m Gauche)` : hasAppentisLeft ? ` (+ Appentis ${extLeftWidth.toFixed(2)}m Gauche)` : ''} • Échelle indicative
                        </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {coupeSvgContent}
                    </div>
                </div>
            )}
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
    const sud = captures?.facade_sud || captures?.facades_projet;
    const nord = captures?.facade_nord;
    const est = captures?.facade_est;
    const ouest = captures?.facade_ouest;
    const toiture = captures?.vue_couverture || captures?.toiture;

    return (
        <div style={PAGE_STYLE} id="dp-plate-facades">
            <PlateHeader title="DP4 — PLAN DES FAÇADES ET TOITURES / VUES 3D" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', maxHeight: '148mm', marginBottom: '4mm' }}>
                <div style={{ flex: 1, display: 'flex', gap: '3.5mm', minHeight: '62mm' }}>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>1. FAÇADE SUD</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            <img src={sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Sud" />
                        </div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#f1f5f9', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>2. FAÇADE NORD</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            <img src={nord || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Nord" />
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1.15, display: 'flex', gap: '3.5mm', minHeight: '64mm', alignItems: 'stretch' }}>
                    {/* Est */}
                    <div style={{ flex: 0.9, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>3. FAÇADE EST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON GAUCHE)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            <img src={est || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Est" />
                        </div>
                    </div>
                    {/* Ouest */}
                    <div style={{ flex: 0.9, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.2mm 1mm', background: '#f1f5f9', fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                            <div>4. FAÇADE OUEST</div>
                            <div style={{ fontSize: '6pt', fontWeight: 'normal', color: '#64748b' }}>(PIGNON DROIT)</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            <img src={ouest || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Ouest" />
                        </div>
                    </div>
                    {/* Toiture */}
                    <div style={{ flex: 1.6, height: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '1.5mm', background: '#dbeafe', color: '#1e40af', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>5. VUE COUVERTURE (PAYSAGE)</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1mm' }}>
                            <img src={toiture || sud || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Toiture" />
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

export const PlateEnv = ({ project, captures, photos, includeLointain = true }) => {
    const photoProche = photos?.proche || captures?.env_proche || captures?.satellite || '';
    const photoLointain = photos?.lointain || captures?.env_lointain || captures?.satellite || '';
    const showBoth = Boolean(includeLointain && (photoLointain || photos?.lointain || project?.hasLointain));

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
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                        <img src={photoProche} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Env Proche" crossOrigin="anonymous" />
                    </div>
                </div>

                {showBoth && (
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            DP8 — Photographie dans le paysage lointain
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                            <img src={photoLointain} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Env Lointain" crossOrigin="anonymous" />
                        </div>
                    </div>
                )}
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
