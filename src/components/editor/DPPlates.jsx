import React from 'react';

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

const LOGO_NELSON = "https://nelsonpv.fr/logo.png"; // À vérifier ou utiliser une image locale

const PlateHeader = ({ title, project, showBranding }) => (
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
                Projet : {project?.firstName} {project?.lastName} - {project?.city} ({project?.zip})
            </div>
        </div>
    </div>
);

const Footer = ({ project }) => (
    <div style={{ marginTop: '5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt', color: '#666', borderTop: '1px solid #eee', paddingTop: '3mm' }}>
        <div>NELSON - nelsonpv.fr</div>
        <div style={{ fontWeight: 'bold' }}>DOSSIER DE DÉCLARATION PRÉALABLE</div>
        <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
    </div>
);

/**
 * PLANCHE 1 : PAGE DE GARDE
 */
export const PlateCover = ({ project }) => (
    <div style={{ ...PAGE_STYLE, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', border: '15mm solid #1e293b' }} id="dp-plate-cover">
        <div style={{ backgroundColor: 'white', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20mm', color: '#333', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10mm', right: '10mm', fontSize: '10pt', color: '#666' }}>{new Date().toLocaleDateString('fr-FR')}</div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32pt', fontWeight: 'bold', color: '#00429d', marginBottom: '5mm', letterSpacing: '2px' }}>DÉCLARATION PRÉALABLE</h1>
                <h2 style={{ fontSize: '18pt', fontWeight: 'bold', color: '#333', marginBottom: '2mm' }}>Installation de stockage batterie CESC Mercury 261</h2>
                <p style={{ fontSize: '14pt', color: '#666', marginBottom: '15mm' }}>250 kW / 522 kWh — raccordement réseau ENEDIS</p>
                
                <div style={{ width: '80mm', height: '1px', backgroundColor: '#ddd', marginBottom: '15mm' }}></div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8mm', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '10pt', color: '#666', textTransform: 'uppercase', marginBottom: '2mm' }}>Maître d'ouvrage :</div>
                        <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#333' }}>{project?.lastName || project?.name} {project?.firstName}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10pt', color: '#666', textTransform: 'uppercase', marginBottom: '2mm' }}>Adresse du projet :</div>
                        <div style={{ fontSize: '12pt', fontWeight: 'medium', color: '#333' }}>{project?.address}</div>
                        <div style={{ fontSize: '12pt', fontWeight: 'medium', color: '#333' }}>{project?.zip} {project?.city}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15mm', borderTop: '1px solid #eee', paddingTop: '10mm' }}>
                <img src={LOGO_NELSON} alt="Nelson" style={{ height: '15mm' }} />
                <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#00429d', letterSpacing: '1px' }}>{project?.dp_data?.cover_branding || 'NELSONPV.FR'}</div>
            </div>
        </div>
    </div>
);

/**
 * PLANCHE 2 : PLAN DE SITUATION (Grille 3)
 */
export const PlateSituation = ({ project, captures }) => {
    return (
        <div style={{ ...PAGE_STYLE, paddingTop: '15mm', paddingLeft: '15mm', paddingRight: '15mm', paddingBottom: '10mm', backgroundColor: '#fff' }} id="dp-plate-situation">
            <div style={{ position: 'absolute', top: '5mm', left: '15mm', fontSize: '10pt', color: '#333' }}>
                DP1 — Plan de situation - {project?.cadastre_commune || project?.city || ''}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '5mm' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>DP1 — Plan de situation</div>
                    <div style={{ fontSize: '11pt', color: '#333', lineHeight: '1.2' }}>
                        {project?.address} {project?.zip} {project?.city} — {project?.cadastre_commune || project?.city}<br/>
                        Parcelle {project?.cadastre_section} {project?.cadastre_numero}
                    </div>
                </div>
                
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={captures?.cadastre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Plan de situation cadastral" />
                </div>
            </div>
        </div>
    );
};

/**
 * PLANCHE 3 : PLAN DE MASSE
 */
export const PlateMasse = ({ project, captures }) => {
    // captures = { masse_edl: '...', masse_projet: '...' }
    return (
        <div style={PAGE_STYLE} id="dp-plate-masse">
            <PlateHeader title="DP2 : PLAN DE MASSE" project={project} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', flex: 1 }}>
                <div style={{ border: '1px solid #ddd', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ background: '#f8f9fa', padding: '2mm', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>État de Lieux (EDL)</div>
                     <img src={captures?.masse_edl} style={{ flex: 1, objectFit: 'contain' }} alt="EDL" />
                </div>
                <div style={{ border: '1px solid #ddd', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ background: '#eef2ff', padding: '2mm', fontWeight: 'bold', borderBottom: '1px solid #ddd', color: '#00429d' }}>Projet</div>
                     <img src={captures?.masse_projet} style={{ flex: 1, objectFit: 'contain' }} alt="Projet" />
                </div>
            </div>
            <div style={{ marginTop: '5mm', background: '#f8f9fa', padding: '3mm', fontSize: '9pt', border: '1px solid #ddd' }}>
                <span style={{ fontWeight: 'bold' }}>Légende :</span> 🔌 Points de Livraison (PDL) | 📍 Emplacement des unités de stockage | 🟦 Panneaux Photovoltaïques
            </div>
        </div>
    );
};

/**
 * PLANCHE DP3 : PLAN EN COUPE
 */
export const PlateSection = ({ project }) => {
    const batteryName = project?.battery_model || "CESC Mercury 261";
    return (
        <div style={PAGE_STYLE} id="dp-plate-section">
            <PlateHeader title={`DP3 — Plan en coupe ${batteryName}`} project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '10mm' }}>
                <div style={{ position: 'relative', width: '120mm', height: '80mm', borderBottom: '2px solid #333', marginBottom: '15mm' }}>
                    <div style={{ position: 'absolute', bottom: '-8mm', left: 0, fontSize: '8pt', color: '#666', fontWeight: 'bold' }}>TERRAIN NATUREL EXISTANT (PLAT — PAS DE TERRASSEMENT)</div>
                    
                    {/* Dessin Batterie Profil */}
                    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '35mm', height: '65mm', backgroundColor: '#fff7ed', border: '1.5px solid #f97316', display: 'flex', flexDirection: 'column', padding: '2mm', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '7pt', textAlign: 'center', fontWeight: 'bold', color: '#9a3412', marginBottom: '2mm', textTransform: 'uppercase' }}>{batteryName}</div>
                        <div style={{ flex: 1, border: '1px solid #fdba74', marginBottom: '1mm', borderRadius: '1px' }}></div>
                        <div style={{ flex: 1, border: '1px solid #fdba74', marginBottom: '1mm', borderRadius: '1px' }}></div>
                        <div style={{ flex: 1, border: '1px solid #fdba74', marginBottom: '1mm', borderRadius: '1px' }}></div>
                        
                        {/* Cotes hauteur */}
                        <div style={{ position: 'absolute', left: '40mm', top: 0, bottom: 0, width: '10mm', borderLeft: '1px solid #ef4444', borderTop: '1px solid #ef4444', borderBottom: '1px solid #ef4444', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '9pt', color: '#ef4444', fontWeight: 'bold', paddingLeft: '2mm' }}>2,40 m</span>
                        </div>
                        
                        {/* Cotes largeur */}
                        <div style={{ position: 'absolute', bottom: '-12mm', left: 0, right: 0, height: '5mm', borderBottom: '1px solid #ef4444', borderLeft: '1px solid #ef4444', borderRight: '1px solid #ef4444', display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: '9pt', color: '#ef4444', fontWeight: 'bold', paddingTop: '6mm', position: 'absolute' }}>1,35 m</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', width: '90%', marginTop: '10mm' }}>
                    <div style={{ padding: '4mm', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '9pt', fontWeight: 'black', color: '#64748b', textTransform: 'uppercase', marginBottom: '2mm', letterSpacing: '0.05em' }}>Spécifications élévation</h4>
                        <ul style={{ fontSize: '8pt', color: '#334155', listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ marginBottom: '1mm' }}>• Hauteur totale : 2.40 m</li>
                            <li style={{ marginBottom: '1mm' }}>• Profondeur : 1.35 m</li>
                            <li style={{ marginBottom: '1mm' }}>• Largeur : 1.00 m</li>
                            <li style={{ marginBottom: '1mm' }}>• Fondations : Dalle béton existante (pas de creusement)</li>
                        </ul>
                    </div>
                    <div style={{ padding: '4mm', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '9pt', fontWeight: 'black', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '2mm', letterSpacing: '0.05em' }}>Contexte du sol</h4>
                        <p style={{ fontSize: '8pt', color: '#1e3a8a', lineHeight: '1.4', fontStyle: 'italic', margin: 0 }}>
                            Le projet s'implante sur un terrain horizontal sans modification de l'altimétrie naturelle. 
                            L'armoire de stockage est simplement posée sur le socle technique.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * PLANCHE DP4 : FAÇADES ET TOITURES
 */
export const PlateFacades = ({ project, batteryPhoto }) => {
    const batteryName = project?.battery_model || "CESC Mercury 261";
    return (
        <div style={PAGE_STYLE} id="dp-plate-facades">
            <PlateHeader title={`DP4 — Façades ${batteryName}`} project={project} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10mm', padding: '5mm' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8mm', justifyContent: 'center' }}>
                    <div style={{ background: '#f8f9fa', padding: '5mm', borderRadius: '12px', border: '1px solid #e2e8f0', height: '60mm', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '8pt', fontWeight: 'black', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4mm', letterSpacing: '0.05em' }}>Vue de face (V1)</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '4mm' }}>
                            <div style={{ width: '25mm', height: '38mm', border: '1.5px solid #f97316', backgroundColor: '#fff', position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: '2mm 2mm auto 2mm', height: '1mm', backgroundColor: '#fff7ed', borderBottom: '0.5px solid #fdba74' }}></div>
                                <div style={{ position: 'absolute', top: '10mm', inset: 'auto 2mm auto 2mm', height: '1mm', backgroundColor: '#fff7ed', borderBottom: '0.5px solid #fdba74' }}></div>
                            </div>
                        </div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '5mm', borderRadius: '12px', border: '1px solid #e2e8f0', height: '60mm', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '8pt', fontWeight: 'black', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4mm', letterSpacing: '0.05em' }}>Vue de côté (V2)</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '4mm' }}>
                            <div style={{ width: '35mm', height: '38mm', border: '1.5px solid #f97316', backgroundColor: '#fff' }}></div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #dbeafe', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                        <img src={batteryPhoto || "https://nelsonpv.fr/mercury_product_photo.jpg"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Aspect" />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4mm', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff' }}>
                            <p style={{ fontSize: '9pt', fontWeight: 'black', textTransform: 'uppercase', margin: 0, letterSpacing: '0.1em' }}>{batteryName}</p>
                            <p style={{ fontSize: '7pt', opacity: 0.8, fontStyle: 'italic', margin: '1mm 0 0 0' }}>Photographie du produit fini Nelson Mercury</p>
                        </div>
                    </div>
                    <div style={{ marginTop: '6mm', padding: '4mm', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                        <p style={{ fontSize: '8pt', color: '#92400e', fontWeight: 'bold', margin: 0, lineHeight: '1.4' }}>
                            Coloris standard : RAL 7016 (Gris anthracite). 
                            Matériau : Acier haute résistance thermolaqué.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * PLANCHE DP8.1 : NOTICE D'INSERTION (Texte Officiel Hangar3D)
 */
export const PlateInsertionNotice = ({ project }) => {
    const data = project?.dp_data || {};
    const batteryName = project?.battery_model || "CESC Mercury 261";
    const count = project?.battery_quantity || 2;
    const power = count * 125; // Exemple: 250kW pour 2 armoires
    const capacity = count * 261; // Exemple: 522kWh pour 2 armoires
    const emprise = count * 7.5; // Exemple emprise au sol estimée

    return (
        <div style={PAGE_STYLE} id="dp-plate-notice-insertion">
            <PlateHeader title="NOTICE D'INSERTION (DP 8.1)" project={project} showBranding={true} />
            <div style={{ flex: 1, padding: '5mm 10mm', overflowY: 'hidden', fontSize: '8.5pt', lineHeight: '1.4', color: '#1e293b' }}>
                
                <section style={{ marginBottom: '4mm' }}>
                    <h3 style={{ fontSize: '10pt', fontWeight: '900', borderBottom: '1px solid #000', marginBottom: '2mm', textTransform: 'uppercase' }}>1 — OBJET DE LA DEMANDE</h3>
                    <p>
                        La demande de Déclaration Préalable porte sur l'installation de {count} armoire(s) de stockage stationnaire par batteries {batteryName}, d'une puissance totale de {power} kW et d'une capacité de {capacity} kWh, raccordée en injection-soutirage au réseau public de distribution d'électricité pour la fourniture de services système (arbitrage, réserve de fréquence, mécanisme de capacité).
                    </p>
                </section>

                <section style={{ marginBottom: '4mm' }}>
                    <h3 style={{ fontSize: '10pt', fontWeight: '900', borderBottom: '1px solid #000', marginBottom: '2mm', textTransform: 'uppercase' }}>2 — LE SITE</h3>
                    <p>
                        Le projet se situe à {project?.address || '—'}, commune de {project?.city || project?.cadastre_commune || '—'}, dans le département de {project?.zip?.substring(0,2) || '—'}. 
                        Le terrain concerné est composé de la parcelle section {project?.cadastre_section || '—'} n°{project?.cadastre_numero || '—'}, d'une superficie de {project?.cadastre_surface || '—'} m². 
                        L'accès au projet se fait par un chemin existant.
                    </p>
                </section>

                <section style={{ marginBottom: '4mm' }}>
                    <h3 style={{ fontSize: '10pt', fontWeight: '900', borderBottom: '1px solid #000', marginBottom: '2mm', textTransform: 'uppercase' }}>3 — LE PROJET</h3>
                    <p>
                        Le projet consiste en l'installation de {count} armoire(s) de stockage batterie {batteryName} (lithium ion). 
                        Dimensions : H 2,40 m x L 1,00 m x P 1,35 m - capacité 261 kWh par armoire - acier galvanisé revêtu, coloris gris/blanc. 
                        Les armoires sont posées sur une dalle béton au sol d'une emprise totale de {emprise} m² intégrant les dégagements nécessaires à la maintenance (accès façade, arrière et espacement thermique). 
                        Elles ne constituent pas une construction au sens de la surface de plancher.
                    </p>
                </section>

                <section style={{ marginBottom: '4mm' }}>
                    <h3 style={{ fontSize: '10pt', fontWeight: '900', borderBottom: '1px solid #000', marginBottom: '2mm', textTransform: 'uppercase' }}>4 — RACCORDEMENT AUX RÉSEAUX</h3>
                    <p>
                        Les armoires sont raccordées de manière bidirectionnelle (injection et soutirage) au réseau de distribution ENEDIS via un point de livraison (PDL). Le raccordement est réalisé par câbles enterrés entre les armoires, le point de livraison et le poste de transformation.
                    </p>
                    <p style={{ marginTop: '1mm' }}>
                        L'emplacement du point de livraison et du transformateur (le cas échéant) indiqué dans les pièces graphiques n'apparaît qu'à titre indicatif. Le positionnement définitif demeure à l'appréciation du gestionnaire de réseau en fonction du site et des équipements déjà existants.
                    </p>
                </section>

                <section>
                    <h3 style={{ fontSize: '10pt', fontWeight: '900', borderBottom: '1px solid #000', marginBottom: '2mm', textTransform: 'uppercase' }}>5 — INTÉRÊT POUR LE RÉSEAU ÉLECTRIQUE</h3>
                    <p>
                        L'installation de stockage par batteries contribue directement à la stabilité et à la résilience du réseau électrique national. En tant qu'actif raccordé au réseau de distribution ENEDIS, elle participe à plusieurs mécanismes de service système :
                    </p>
                    <ul style={{ marginTop: '1mm', paddingLeft: '5mm', listStyleType: 'dash' }}>
                        <li><strong>Réserve de fréquence (aFFR / FCR) :</strong> réponse automatique aux écarts de fréquence du réseau, service rémunéré par RTE dans le cadre des appels d'offres de réglage fréquence.</li>
                        <li><strong>Activation d'énergie :</strong> injection ou soutirage sur signal de RTE pour compenser les déséquilibres production/consommation en temps réel.</li>
                        <li><strong>Mécanisme de capacité :</strong> participation au marché de capacité obligatoire (décret n°2012-1405), contribuant à la sécurité d'approvisionnement lors des pointes de consommation hivernales.</li>
                        <li><strong>Trading / arbitrage :</strong> optimisation des flux d'énergie en achetant l'électricité en heures creuses et en la restituant en heures de pointe, contribuant au lissage de la courbe de charge.</li>
                    </ul>
                    <p style={{ marginTop: '2mm', fontStyle: 'italic' }}>
                        À ce titre, l'installation s'inscrit pleinement dans les objectifs de la Programmation Pluriannuelle de l'Énergie (PPE) qui prévoit un développement massif du stockage stationnaire pour accompagner l'intégration des énergies renouvelables intermittentes sur le réseau.
                    </p>
                </section>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP5 : REPRÉSENTATION DE L'ASPECT EXTÉRIEUR
 */
export const PlateAspect = ({ project, batteryPhoto }) => {
    const batteryName = project?.battery_model || "CESC Mercury 261";
    return (
        <div style={PAGE_STYLE} id="dp-plate-aspect">
            <PlateHeader title="DP5 : REPRÉSENTATION DE L'ASPECT EXTÉRIEUR" project={project} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8mm', padding: '5mm' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10mm', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5mm' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', flex: 1, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                            <img 
                                src={batteryPhoto || "https://nelsonpv.fr/mercury_product_photo.jpg"} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                alt="Produit" 
                            />
                        </div>
                        <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                            Photographie de l'unité de stockage {batteryName} (Finition Standard)
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6mm' }}>
                        <div style={{ background: '#f8f9fa', padding: '6mm', borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1 }}>
                            <h4 style={{ fontSize: '10pt', fontWeight: 'black', color: '#1e3a8a', marginBottom: '4mm', borderBottom: '1.5px solid #dbeafe', paddingBottom: '2mm', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matériaux et Finitions</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4mm' }}>
                                <div style={{ background: '#fff', padding: '3mm', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1mm 0' }}>Structure</p>
                                    <p style={{ fontSize: '7.5pt', color: '#64748b', margin: 0 }}>Châssis en acier haute résistance, traitement anti-corrosion C5.</p>
                                </div>
                                <div style={{ background: '#fff', padding: '3mm', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1mm 0' }}>Coloris</p>
                                    <p style={{ fontSize: '7.5pt', color: '#64748b', margin: 0 }}>Finition RAL 7016 Gris Anthracite, aspect mat anti-réflexion.</p>
                                </div>
                                <div style={{ background: '#fff', padding: '3mm', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '8pt', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1mm 0' }}>Technique</p>
                                    <p style={{ fontSize: '7.5pt', color: '#64748b', margin: 0 }}>Grilles de ventilation avec protection IP55 et filtres.</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: '#eff6ff', padding: '5mm', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                            <h4 style={{ fontSize: '9pt', fontWeight: 'bold', color: '#1e40af', marginBottom: '3mm' }}>Spécifications unitaires</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
                                    <span style={{ color: '#1e3a8a' }}>Puissance max.</span>
                                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>250 kW</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
                                    <span style={{ color: '#1e3a8a' }}>Capacité nominale</span>
                                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>522 kWh</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
                                    <span style={{ color: '#1e3a8a' }}>Poids total</span>
                                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>~ 4.2 tonnes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer project={project} />
        </div>
    );
};

/**
 * PLANCHE DP6 : DOCUMENT GRAPHIQUE D'INSERTION
 */
export const PlateInsertion = ({ project, captures }) => (
    <div style={PAGE_STYLE} id="dp-plate-insertion">
        <PlateHeader title="DP6 : DOCUMENT GRAPHIQUE D'INSERTION" project={project} />
        <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr 1fr', gap: '5mm' }}>
            <div style={{ border: '1px solid #ddd', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '1mm 3mm', fontSize: '9pt', fontWeight: 'bold', zIndex: 10, borderRadius: '4px' }}>État Initial (Photo Avant)</div>
                <img src={captures?.photo_avant || captures?.satellite} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avant" />
            </div>
            <div style={{ border: '1px solid #00429d', borderSize: '2px', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
                <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(0,66,157,0.8)', color: 'white', padding: '1mm 3mm', fontSize: '9pt', fontWeight: 'bold', zIndex: 10, borderRadius: '4px' }}>Projet Inséré (Photo Après)</div>
                <img src={captures?.photo_apres || captures?.masse_projet} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Après" />
            </div>
        </div>
        <div style={{ marginTop: '3mm', fontSize: '8pt', color: '#666', textAlign: 'center' }}>
            Simulation de l'intégration paysagère des unités de stockage stationnaire.
        </div>
    </div>
);

/**
 * PLANCHE DP7 : PHOTO ENVIRONNEMENT PROCHE
 */
export const PlateEnvProche = ({ project, captures }) => (
    <div style={PAGE_STYLE} id="dp-plate-env-proche">
        <PlateHeader title="DP7 : PHOTOGRAPHIE DE L'ENVIRONNEMENT PROCHE" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            <div style={{ border: '1px solid #ddd', flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
                <img src={captures?.env_proche || captures?.ign} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Env Proche" />
                <div style={{ position: 'absolute', bottom: '5mm', right: '5mm', background: 'white', padding: '2mm 4mm', border: '1px solid #00429d', borderRadius: '4px', fontSize: '10pt', fontWeight: 'bold', color: '#00429d' }}>Vue P1</div>
            </div>
            <div style={{ fontSize: '9pt', color: '#666', fontStyle: 'italic' }}>
                Vue de l'emplacement du projet depuis la limite parcellaire immédiate.
            </div>
        </div>
    </div>
);

/**
 * PLANCHE DP8 : PHOTO ENVIRONNEMENT LOINTAIN
 */
export const PlateEnvLointain = ({ project, captures }) => (
    <div style={PAGE_STYLE} id="dp-plate-env-lointain">
        <PlateHeader title="DP8 : PHOTOGRAPHIE DE L'ENVIRONNEMENT LOINTAIN" project={project} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            <div style={{ border: '1px solid #ddd', flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
                <img src={captures?.env_lointain || captures?.satellite} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Env Lointain" />
                <div style={{ position: 'absolute', bottom: '5mm', right: '5mm', background: 'white', padding: '2mm 4mm', border: '1px solid #00429d', borderRadius: '4px', fontSize: '10pt', fontWeight: 'bold', color: '#00429d' }}>Vue P2</div>
            </div>
            <div style={{ fontSize: '9pt', color: '#666', fontStyle: 'italic' }}>
                Vue panoramique intégrant le site dans son paysage environnant.
            </div>
        </div>
    </div>
);

/**
 * Ancienne Planche Notice (Maintenue pour compatibilité mais découpée)
 */
export const PlateNotice = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-notice">
            <PlateHeader title="DÉTAILS TECHNIQUES & MATÉRIAUX" project={project} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8mm', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4mm' }}>
                    <h3 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#00429d', marginBottom: '3mm' }}>Notice Descriptive</h3>
                    <p style={{ fontSize: '9pt', lineHeight: '1.4', textAlign: 'justify' }}>
                        L'installation comprend la pose de <b>{project?.batteryQuantity || 4} batteries</b> sur une dalle béton préfabriquée. 
                        Les unités sont conçues pour une insertion paysagère discrète avec des teintes neutres (RAL 7016 / 9005).
                    </p>
                    <div style={{ marginTop: '5mm', padding: '3mm', background: '#f0f7ff', border: '1px solid #cce3ff', borderRadius: '4px' }}>
                        <h4 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#00429d', marginBottom: '2mm' }}>Matériaux & Teintes</h4>
                        <ul style={{ fontSize: '8pt', paddingLeft: '15px' }}>
                            <li>Stockage : Coffrets Mercury (Teintes RAL 7016 / 9005)</li>
                            <li>Support : Dalle béton gris naturel ou préfabriquée</li>
                        </ul>
                    </div>
                </div>
                
                <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={captures?.photo_projet || captures?.masse_projet} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Détail" />
                </div>
            </div>
        </div>
    );
};
