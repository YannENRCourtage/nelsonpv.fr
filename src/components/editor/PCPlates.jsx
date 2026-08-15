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
            <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#00429d' }}>{title}</div>
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
    const displayKwc = project?.kwc || project?.puissance || project?.projectSize || 256;

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
                        <strong>Type d'ouvrage :</strong> {project?.description || `Construction d'un bâtiment agricole avec centrale solaire photovoltaïque intégrée en toiture de ${displayKwc} kWc.`}<br />
                        <strong>Puissance de l'installation :</strong> {displayKwc} kWc<br />
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
    return (
        <div style={PAGE_STYLE} id="pc-plate-masse">
            <PlateHeader title="PC2 : PLAN DE MASSE DES CONSTRUCTIONS" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '3mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <ImageUploadZone 
                        isInteractive={isInteractive} 
                        photo={captures?.masse_projet || captures?.satellite} 
                        onUpload={(data) => onUpload && onUpload('masse_projet', data)} 
                        defaultText="Plan de masse (Cadastre / OpenStreetMap)" 
                        label="Plan de Masse"
                    />
                </div>
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
    const displayKwc = project?.kwc || project?.puissance || project?.projectSize || 256;
    const effectiveNoticeText = noticeText || project?.noticeText || project?.description;
    
    // Détection stricte : asymétrique par défaut (ne pas confondre avec symétrique)
    const rawType = (project?.buildingType || project?.installationType || project?.type || 'asymetrique_1').toLowerCase();
    const isOmbriere = rawType.includes('ombriere');
    const isMonopente = rawType.includes('monopente');
    const isSym = rawType.includes('symetrique') && !rawType.includes('asym');
    const isAsym = !isOmbriere && !isMonopente && !isSym;
    const hasAuvent = Boolean(project?.rightSide === 'auvent' || project?.leftSide === 'auvent' || project?.hasAuvent || (project?.auvent && project?.auvent !== 'none' && project?.auvent !== false));
    const hasAppentis = Boolean(project?.rightSide === 'appentis' || project?.leftSide === 'appentis' || project?.hasAppentis || (project?.appentis && project?.appentis !== 'none' && project?.appentis !== false));

    // Calculs dimensionnels fidèles au configurateur
    let rightEaveHeight = hauteurEgout;
    let ridgeHeight = 7.40;
    let leftEaveHeight = 6.40;

    if (isMonopente) {
        leftEaveHeight = hauteurEgout;
        ridgeHeight = leftEaveHeight + (largeur * Math.tan((pente * Math.PI) / 180));
        rightEaveHeight = ridgeHeight;
    } else if (isSym) {
        ridgeHeight = hauteurEgout + ((largeur / 2) * Math.tan((pente * Math.PI) / 180));
        leftEaveHeight = hauteurEgout;
        rightEaveHeight = hauteurEgout;
    } else if (isAsym) {
        if (Math.abs(largeur - 16.4) < 0.8 || Math.abs(largeur - 16) < 0.8) {
            ridgeHeight = 7.40;
            leftEaveHeight = 6.40;
        } else if (Math.abs(largeur - 20) < 0.8) {
            ridgeHeight = 8.40;
            leftEaveHeight = 7.40;
        } else {
            ridgeHeight = rightEaveHeight + (largeur * 0.75 * Math.tan((pente * Math.PI) / 180));
            leftEaveHeight = Math.max(3.0, ridgeHeight - (largeur * 0.25 * Math.tan((pente * Math.PI) / 180)));
        }
    }

    // Coordonnées SVG (Portée bâtiment X: 130 -> 480, Largeur graphique = 350px)
    const groundYLeft = 140 + Math.sin((terrainSlopeDeg * Math.PI) / 180) * 105;
    const groundYRight = 140 - Math.sin((terrainSlopeDeg * Math.PI) / 180) * 105;

    const apexSvgX = isAsym ? 218 : 305;
    const apexSvgY = 20;
    const leftEaveSvgY = isAsym ? 44 : 54;
    const rightEaveSvgY = 54;
    const auventTipSvgX = 550;
    const auventTipSvgY = 66;

    // Calcul de l'échelle métrique exacte (350px pour largeur mètres)
    const pxPerMeter = 350 / (largeur || 20.0);
    const scaleTotalWidth = 10 * pxPerMeter; // Largeur exacte de la barre 10m
    const scaleSegWidth = 2 * pxPerMeter; // Largeur segment 2m
    const scaleStartX = 660 - scaleTotalWidth; // Ancré en bas à droite sous TN Amont
    const scaleY = 153; // Abaissé de 0.3cm en bas à droite

    const roofTypeLabel = isAsym ? 'asymétrique' : isSym ? 'symétrique' : 'photovoltaïque';

    const projectCity = project?.city || project?.cadastre_commune || project?.commune || 'SAINT ARAILLES';
    const projectZip = project?.zip || project?.zipCode || project?.postalCode || '32100';
    const projectAddress = project?.address || project?.clientAddress || project?.siteAddress || '2810 Chemin de l\'osse';
    const projectCadastre = (project?.cadastre_section ? `${project.cadastre_section} ` : '') + (project?.cadastre_parcel || project?.parcel || project?.parcelle || '000 B 633');
    const projectSurface = project?.surface_terrain ? `${project.surface_terrain} m²` : (project?.cadastre_surface ? `${project.cadastre_surface} m²` : '18 384m²');
    const projectAltitude = project?.altitude || '140.62m';
    const totalSurface = (largeur * longueur).toFixed(2);
    const bayCount = project?.bayCount || 5;
    const baySpacing = project?.baySpacing || 6;

    const default5PointsNotice = `NOTICE D'INSERTION

1- OBJET DE LA DEMANDE
La demande de permis de construire porte sur la construction d'un hangar à usage agricole avec toiture photovoltaïque. Il servira de stockage de matériel et céréales (${totalSurface}m²).

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
Le projet a pour objet la construction d'un hangar de forme rectangulaire (longueur : ${longueur}m, largeur : ${largeur.toFixed(2)}m${hasAuvent ? ' + Auvent 4.00m' : ''}) en structure métallique (RAL 7016 / 7005), composé de ${bayCount} travées de ${baySpacing}m d'entraxe. La toiture sera constituée d'une double pente ${roofTypeLabel} (${pente}°) avec pour couverture un bac acier anti condensation sur les deux versants (RAL 7016). Des panneaux photovoltaïques (RAL 9005) viendront recouvrir le bac acier sur l'ensemble de la toiture, permettant de créer une centrale de production d'électricité photovoltaïque de ${displayKwc} kWc.
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5mm', maxHeight: '142mm', marginBottom: '4mm' }}>
                
                {/* ── HAUT : PC3 PLAN EN COUPE TRANSVERSALE DYNAMIQUE (CADRE RÉDUIT) ── */}
                <div style={{ height: '56mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '1.5mm 4mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                        <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>
                            PC3 — COUPE DE TERRAIN & DU BÂTIMENT (COUPE TRANSVERSALE AA')
                        </span>
                        <span style={{ fontSize: '7pt', color: '#64748b' }}>
                            Dimensions : {largeur.toFixed(2)}m × {longueur}m{hasAuvent ? ' (+ Auvent 4.00m)' : hasAppentis ? ' (+ Appentis)' : ''} • Échelle indicative
                        </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="680" height="162" viewBox="0 0 680 162" style={{ width: '100%', height: '100%', maxHeight: '48mm' }}>
                            
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
                            <rect x="130" y={leftEaveSvgY} width="9" height={groundYLeft - leftEaveSvgY} fill="#334155" />
                            <rect x="472" y={rightEaveSvgY} width="9" height={groundYRight - rightEaveSvgY} fill="#334155" />

                            {hasAppentis && (
                                <rect x="545" y={auventTipSvgY} width="6" height={groundYRight - auventTipSvgY} fill="#334155" />
                            )}

                            {/* 3. Portique & PANNEAUX SOLAIRES SUR TOUTE LA TOITURE (VERSANT COURT NORD + VERSANT LONG SUD + AUVENT) */}
                            {isAsym ? (
                                <>
                                    {/* Versant court Nord (5m) */}
                                    <line x1="130" y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`126,${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 8} 126,${leftEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                    <line x1={130 + (apexSvgX - 130) * 0.5} y1={leftEaveSvgY + (apexSvgY - leftEaveSvgY) * 0.5 - 8} x2={130 + (apexSvgX - 130) * 0.5} y2={leftEaveSvgY + (apexSvgY - leftEaveSvgY) * 0.5 - 2} stroke="#93c5fd" strokeWidth="1" />

                                    {/* Versant long Sud (15m) */}
                                    <line x1={apexSvgX} y1={apexSvgY} x2="480" y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`${apexSvgX},${apexSvgY - 2} 484,${rightEaveSvgY - 2} 484,${rightEaveSvgY - 8} ${apexSvgX},${apexSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                    {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                                        const px = apexSvgX + (480 - apexSvgX) * ratio;
                                        const py = apexSvgY + (rightEaveSvgY - apexSvgY) * ratio;
                                        return <line key={idx} x1={px} y1={py - 8} x2={px} y2={py - 2} stroke="#93c5fd" strokeWidth="1" />;
                                    })}

                                    {/* Auvent Sud (+4m) */}
                                    {hasAuvent && (
                                        <>
                                            <line x1="480" y1={rightEaveSvgY} x2={auventTipSvgX} y2={auventTipSvgY} stroke="#1e293b" strokeWidth="4" />
                                            <polygon points={`480,${rightEaveSvgY - 2} ${auventTipSvgX + 4},${auventTipSvgY - 2} ${auventTipSvgX + 4},${auventTipSvgY - 8} 480,${rightEaveSvgY - 8}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                            <line x1={480 + (auventTipSvgX - 480) * 0.5} y1={rightEaveSvgY + (auventTipSvgY - rightEaveSvgY) * 0.5 - 8} x2={480 + (auventTipSvgX - 480) * 0.5} y2={rightEaveSvgY + (auventTipSvgY - rightEaveSvgY) * 0.5 - 2} stroke="#93c5fd" strokeWidth="1" />
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

                            {/* 4. Mentions de Toiture & PENTE REMONTÉE AU-DESSUS DE LA COUVERTURE */}
                            <text x={350} y={8} textAnchor="middle" fill="#1e3a8a" fontSize="8" fontWeight="bold">
                                Toiture {roofTypeLabel} : pente {pente}° ({Math.round(Math.tan((pente * Math.PI) / 180) * 100)}%) • Bac acier RAL 7016 + Modules solaires
                            </text>

                            {/* 5. Rappel Hauteurs d'égout et Faîtage */}
                            <line x1="108" y1={leftEaveSvgY} x2="108" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="104" y1={leftEaveSvgY} x2="112" y2={leftEaveSvgY} stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="104" y1={groundYLeft} x2="112" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                            <text x="100" y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                Sablière Nord : {leftEaveHeight.toFixed(2)}m
                            </text>

                            {/* Égout Sud au point le plus bas (si auvent / appentis, en bas de la couverture à 3.00m) */}
                            {hasAuvent || hasAppentis ? (
                                <>
                                    <line x1={auventTipSvgX + 16} y1={auventTipSvgY} x2={auventTipSvgX + 16} y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={auventTipSvgX + 12} y1={auventTipSvgY} x2={auventTipSvgX + 20} y2={auventTipSvgY} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1={auventTipSvgX + 12} y1={groundYRight} x2={auventTipSvgX + 20} y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <text x={auventTipSvgX + 24} y={auventTipSvgY + (groundYRight - auventTipSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                        Égout Sud : 3.00m
                                    </text>
                                </>
                            ) : (
                                <>
                                    <line x1="502" y1={rightEaveSvgY} x2="502" y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1="498" y1={rightEaveSvgY} x2="506" y2={rightEaveSvgY} stroke="#ef4444" strokeWidth="1.2" />
                                    <line x1="498" y1={groundYRight} x2="506" y2={groundYRight} stroke="#ef4444" strokeWidth="1.2" />
                                    <text x="510" y={rightEaveSvgY + (groundYRight - rightEaveSvgY) / 2 + 3} textAnchor="start" fill="#ef4444" fontSize="7.5" fontWeight="bold">
                                        Égout Sud : {rightEaveHeight.toFixed(2)}m
                                    </text>
                                </>
                            )}

                            <line x1={apexSvgX} y1={apexSvgY} x2={apexSvgX} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
                            <text x={apexSvgX + 6} y={apexSvgY + 22} fill="#ef4444" fontSize="8" fontWeight="bold">
                                Faîtage : {ridgeHeight.toFixed(2)}m
                            </text>

                            {/* 6. Largeur d'emprise au sol AU-DESSUS du trait bleu */}
                            <text x="305" y="118" textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="bold">
                                ▼ Largeur : {largeur.toFixed(2)} m (Emprise au sol)
                            </text>
                            <line x1="130" y1="125" x2="480" y2="125" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1="130" y1="120" x2="130" y2="130" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1="480" y1="120" x2="480" y2="130" stroke="#0284c7" strokeWidth="1.5" />

                            {/* Cote de l'auvent au sol */}
                            {hasAuvent && (
                                <>
                                    <line x1="480" y1="125" x2={auventTipSvgX} y2="125" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                                    <line x1={auventTipSvgX} y1="120" x2={auventTipSvgX} y2="130" stroke="#0284c7" strokeWidth="1.5" />
                                    <text x={(480 + auventTipSvgX) / 2} y="133" textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">+4.00m</text>
                                </>
                            )}

                            {/* Barre d'échelle métrique EXACTE (0 à 10m) abaissée de 0.3cm en bas à droite sous TN Amont */}
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

                {/* ── BAS : PC4 NOTICE DESCRIPTIVE DU PROJET (SYNTHÈSE EN 5 POINTS) ── */}
                <div style={{ height: '84mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '2.5mm 4.5mm', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        NOTICE D'INSERTION & DESCRIPTIVE DU PROJET
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', fontSize: '6.8pt', lineHeight: '1.28', color: '#334155' }}>
                        {isInteractive ? (
                            <textarea 
                                style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '6.8pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.3' }}
                                value={effectiveNoticeText || default5PointsNotice}
                                onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                                placeholder="Notice descriptive du projet..."
                            />
                        ) : effectiveNoticeText ? (
                            <div style={{ whiteSpace: 'pre-line', fontSize: '6.8pt', lineHeight: '1.28', color: '#334155' }}>
                                {effectiveNoticeText}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
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
                                    <div>Le projet a pour objet la construction d'un hangar de forme rectangulaire (longueur : {longueur}m, largeur : {largeur.toFixed(2)}m{hasAuvent ? ' + Auvent 4.00m' : ''}) en structure métallique (RAL 7016 / 7005), composé de {bayCount} travées de {baySpacing}m d'entraxe. La toiture sera constituée d'une double pente {roofTypeLabel} ({pente}°) avec pour couverture un bac acier anti condensation sur les deux versants (RAL 7016). Des panneaux photovoltaïques (RAL 9005) viendront recouvrir le bac acier sur l'ensemble de la toiture, permettant de créer une centrale de production d'électricité photovoltaïque de {displayKwc} kWc.</div>
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
