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

const ImageUploadZone = ({ isInteractive, photo, onUpload, defaultText = "Cliquez pour ajouter l'image", label = "Image" }) => {
    if (!isInteractive && photo) {
        return (
            <img 
                src={photo} 
                alt={label} 
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
            />
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
                <img src={photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                        <strong>Type d'ouvrage :</strong> {project?.description || `Construction d'un bâtiment agricole avec centrale solaire photovoltaïque intégrée en toiture de ${project?.kwc || 100} kWc.`}<br />
                        <strong>Puissance de l'installation :</strong> {project?.kwc ? `${project.kwc} kWc` : '100 kWc'}<br />
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
            <div style={{ flex: 1, display: 'flex', gap: '8mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '2.5mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
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
                    <div style={{ padding: '2.5mm', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '9.5pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '135mm', marginBottom: '5mm' }}>
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
 * PLANCHE COMBINÉE PC3 / PC4 : COUPE TRANSVERSALE DYNAMIQUE FIDÈLE AU MODÈLE & NOTICE DESCRIPTIVE
 * Directive 3 : Reproduction exacte de la coupe (Asymétrique, Symétrique, Monopente, Ombrière, Auvents, etc.)
 */
export const PlateSectionAndNotice = ({ project, noticeText, onNoticeChange, isInteractive }) => {
    const longueur = project?.longueur || '30.0';
    const largeur = parseFloat(project?.largeur || 20.0);
    const hauteurEgout = parseFloat(project?.hauteur_egout || 4.0);
    const pente = parseFloat(project?.pente || 15);
    const terrainSlopeDeg = parseFloat(project?.pente_terrain || project?.terrain_slope || 3);
    const bType = (project?.buildingType || project?.type || 'asymetrique_1').toLowerCase();
    const hasAuvent = project?.rightSide === 'auvent' || project?.leftSide === 'auvent';
    const hasAppentis = project?.rightSide === 'appentis' || project?.leftSide === 'appentis';

    const isAsym = bType.includes('asymetrique');
    const isSym = bType.includes('symetrique');
    const isMonopente = bType.includes('monopente');
    const isOmbriere = bType.includes('ombriere');

    // Calculs de hauteurs réelles
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
        leftEaveHeight = hauteurEgout;
        rightEaveHeight = hauteurEgout;
    }

    // Coordonnées SVG (Base largeur X: 150 -> 530, Largeur graphique = 380px)
    const groundYLeft = 142 + Math.sin((terrainSlopeDeg * Math.PI) / 180) * 110;
    const groundYRight = 142 - Math.sin((terrainSlopeDeg * Math.PI) / 180) * 110;

    // Calcul des points SVG de toiture
    let apexSvgX = 245; // Asymétrique 1 zone : Faîtage décalé à gauche
    let apexSvgY = 22;  // Haut faîtage
    let leftEaveSvgY = 56;
    let rightEaveSvgY = 56;

    if (isSym) {
        apexSvgX = 340;
        apexSvgY = 25;
        leftEaveSvgY = 58;
        rightEaveSvgY = 58;
    } else if (isMonopente) {
        apexSvgX = 530;
        apexSvgY = 22;
        leftEaveSvgY = 60;
        rightEaveSvgY = 22;
    } else if (isAsym) {
        apexSvgX = 245;
        apexSvgY = 20;
        leftEaveSvgY = 48;
        rightEaveSvgY = 58;
    }

    return (
        <div style={PAGE_STYLE} id="pc-plate-section-notice">
            <PlateHeader title="PC3 : PLAN EN COUPE & PC4 : NOTICE DESCRIPTIVE" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', maxHeight: '138mm', marginBottom: '5mm' }}>
                
                {/* ── HAUT : PC3 PLAN EN COUPE DYNAMIQUE ── */}
                <div style={{ height: '82mm', border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '2.5mm 5mm', background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1mm' }}>
                        <span style={{ fontSize: '9pt', fontWeight: 'bold', color: '#0f172a' }}>
                            PC3 — Coupe transversale & Profil altimétrique ({isAsym ? 'Bâtiment Asymétrique 1 zone' : isSym ? 'Bâtiment Bi-pente Symétrique' : isMonopente ? 'Bâtiment Monopente' : 'Structure Solaire'})
                        </span>
                        <span style={{ fontSize: '7.5pt', color: '#64748b' }}>
                            Échelle indicative • Dimensions : {largeur.toFixed(2)}m × {longueur}m
                        </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="680" height="142" viewBox="0 0 680 142" style={{ width: '100%', height: '100%', maxHeight: '68mm' }}>
                            {/* 1. Ligne de Terrain Naturel (TN) */}
                            <line x1="30" y1={groundYLeft} x2="650" y2={groundYRight} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" />
                            <text x="45" y={groundYLeft + 12} fill="#64748b" fontSize="8" fontStyle="italic">TN Aval (-0.30m)</text>
                            <text x="635" y={groundYRight + 12} textAnchor="end" fill="#64748b" fontSize="8" fontStyle="italic">TN Amont (+0.40m)</text>

                            {/* 2. Poteaux métalliques principaux */}
                            <rect x="150" y={leftEaveSvgY} width="9" height={groundYLeft - leftEaveSvgY} fill="#334155" />
                            <rect x="521" y={rightEaveSvgY} width="9" height={groundYRight - rightEaveSvgY} fill="#334155" />

                            {/* 3. Portique / Arbalétriers & Toiture photovoltaïque */}
                            {isAsym ? (
                                <>
                                    {/* Versant gauche court */}
                                    <line x1="150" y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                                    {/* Versant droit long (Solaire PV) */}
                                    <line x1={apexSvgX} y1={apexSvgY} x2="530" y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`146,${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 6} 146,${leftEaveSvgY - 6}`} fill="#334155" />
                                    <polygon points={`${apexSvgX},${apexSvgY - 2} 534,${rightEaveSvgY - 2} 534,${rightEaveSvgY - 7} ${apexSvgX},${apexSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                </>
                            ) : isSym ? (
                                <>
                                    <line x1="150" y1={leftEaveSvgY} x2={apexSvgX} y2={apexSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <line x1={apexSvgX} y1={apexSvgY} x2="530" y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`146,${leftEaveSvgY - 2} ${apexSvgX},${apexSvgY - 2} ${apexSvgX},${apexSvgY - 7} 146,${leftEaveSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                    <polygon points={`${apexSvgX},${apexSvgY - 2} 534,${rightEaveSvgY - 2} 534,${rightEaveSvgY - 7} ${apexSvgX},${apexSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                </>
                            ) : (
                                <>
                                    <line x1="150" y1={leftEaveSvgY} x2="530" y2={rightEaveSvgY} stroke="#1e293b" strokeWidth="5" />
                                    <polygon points={`146,${leftEaveSvgY - 2} 534,${rightEaveSvgY - 2} 534,${rightEaveSvgY - 7} 146,${leftEaveSvgY - 7}`} fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                                </>
                            )}

                            {/* Extension AUVENT / APPENTIS si présente */}
                            {(hasAuvent || hasAppentis) && (
                                <>
                                    <line x1="530" y1={rightEaveSvgY} x2="595" y2={rightEaveSvgY + 8} stroke="#1e293b" strokeWidth="4" />
                                    <polygon points={`530,${rightEaveSvgY - 2} 597,${rightEaveSvgY + 6} 597,${rightEaveSvgY + 2} 530,${rightEaveSvgY - 6}`} fill="#475569" />
                                    <text x="562" y={rightEaveSvgY - 10} textAnchor="middle" fill="#475569" fontSize="7.5" fontWeight="bold">Auvent +4m</text>
                                    {hasAppentis && <rect x="590" y={rightEaveSvgY + 8} width="6" height={groundYRight - (rightEaveSvgY + 8)} fill="#334155" />}
                                </>
                            )}

                            {/* 4. Information PENTE : AU-DESSUS DU VERSANT */}
                            <text x={isAsym ? 385 : apexSvgX} y={apexSvgY - 10} textAnchor="middle" fill="#1e3a8a" fontSize="9.5" fontWeight="bold">
                                ▲ Pente toiture : {pente}° ({Math.round(Math.tan((pente * Math.PI) / 180) * 100)}%)
                            </text>

                            {/* 5. Rappel Hauteur Égout à gauche */}
                            <line x1="125" y1={leftEaveSvgY} x2="125" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="120" y1={leftEaveSvgY} x2="130" y2={leftEaveSvgY} stroke="#ef4444" strokeWidth="1.2" />
                            <line x1="120" y1={groundYLeft} x2="130" y2={groundYLeft} stroke="#ef4444" strokeWidth="1.2" />
                            <text x="115" y={leftEaveSvgY + (groundYLeft - leftEaveSvgY) / 2 + 3} textAnchor="end" fill="#ef4444" fontSize="8.5" fontWeight="bold">
                                H. Égout : {hauteurEgout.toFixed(2)}m
                            </text>

                            {/* 6. Rappel Hauteur Faîtage */}
                            <line x1={apexSvgX} y1={apexSvgY} x2={apexSvgX} y2={groundYLeft} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
                            <text x={apexSvgX + 6} y={apexSvgY + 30} fill="#ef4444" fontSize="8.5" fontWeight="bold">
                                H. Faîtage : {ridgeHeight.toFixed(2)}m
                            </text>

                            {/* 7. Largeur d'emprise au sol placée STRICTEMENT AU-DESSUS du trait bleu */}
                            <text x="340" y="122" textAnchor="middle" fill="#0284c7" fontSize="10.5" fontWeight="bold">
                                ▼ Largeur : {largeur.toFixed(2)} m (Emprise au sol)
                            </text>
                            <line x1="150" y1="130" x2="530" y2="130" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1="150" y1="124" x2="150" y2="136" stroke="#0284c7" strokeWidth="1.5" />
                            <line x1="530" y1="124" x2="530" y2="136" stroke="#0284c7" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>

                {/* ── BAS : PC4 NOTICE DESCRIPTIVE DU PROJET ── */}
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', padding: '3mm 5mm', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '1mm' }}>
                        PC4 — Notice descriptive du projet & Caractéristiques architecturales
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', fontSize: '8pt', lineHeight: '1.35', color: '#334155' }}>
                        {isInteractive ? (
                            <textarea 
                                style={{ width: '100%', height: '100%', border: 'none', resize: 'none', outline: 'none', fontSize: '8pt', fontFamily: 'Arial, sans-serif' }}
                                value={noticeText || project?.description || ''}
                                onChange={(e) => onNoticeChange && onNoticeChange(e.target.value)}
                                placeholder="Notice descriptive du projet..."
                            />
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {noticeText || project?.description || `Construction d'un bâtiment agricole à charpente métallique recevant une centrale solaire photovoltaïque intégrée en toiture de ${project?.kwc || 100} kWc.
• Dimensions de l'ouvrage : Longueur ${longueur}m, Largeur ${largeur.toFixed(2)}m, Hauteur égout ${hauteurEgout.toFixed(2)}m, Hauteur faîtage ${ridgeHeight.toFixed(2)}m, Pente toiture ${pente}°.
• Matériaux : Structure acier galvanisé RAL 7016, toiture bac acier avec modules photovoltaïques monocristallins foncés traités anti-reflets.
• Destination : Activité agricole, stockage et production d'énergie solaire photovoltaïque renouvelable raccordée au réseau ENEDIS.`}
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
 * Directive 4 : Vue Toiture élargie en format paysage horizontal, fonds blancs purs neutres
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3mm', maxHeight: '135mm', marginBottom: '5mm' }}>
                
                {/* Ligne 1 : Façades Longs Pans (Sud & Nord) */}
                <div style={{ flex: 1, display: 'flex', gap: '3.5mm' }}>
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

                {/* Ligne 2 : Pignons (Est & Ouest réduits) et Vue Toiture (Élargie en format paysage horizontal) */}
                <div style={{ flex: 1.15, display: 'flex', gap: '3.5mm' }}>
                    {/* Façade Est */}
                    <div style={{ flex: 0.85, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.8mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            3. FAÇADE EST (PIGNON GAUCHE)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
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
                    <div style={{ flex: 0.85, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        <div style={{ padding: '1.8mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                            4. FAÇADE OUEST (PIGNON DROIT)
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                            <ImageUploadZone 
                                isInteractive={isInteractive} 
                                photo={ouest || sud} 
                                onUpload={(data) => onUpload && onUpload('facade_ouest', data)} 
                                defaultText="Vue Façade Ouest" 
                                label="Façade Ouest"
                            />
                        </div>
                    </div>

                    {/* Vue Couverture (Toiture Élargie) */}
                    <div style={{ flex: 1.8, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8mm', maxHeight: '135mm', marginBottom: '5mm' }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', position: 'relative', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '2.5mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                    1. VUE DE L'ÉTAT INITIAL DU SITE (AVANT TRAVAUX)
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
                <div style={{ padding: '2.5mm', background: '#dcfce7', borderBottom: '1px solid #86efac', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#166534' }}>
                    2. VUE APRÈS PROJET (SIMULATION 3D D'INSERTION PAYSAGÈRE)
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm', maxHeight: '135mm', marginBottom: '5mm' }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '3mm', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                <div style={{ padding: '2mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
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
                <div style={{ padding: '2mm', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
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
export const PlateImpact = (props) => <PlateNotice {...props} />;
export const PlateCover = PlateGarde;
