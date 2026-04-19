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

const PlateHeader = ({ title, project }) => (
    <div style={HEADER_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={LOGO_NELSON} alt="Nelson" style={{ height: '12mm' }} />
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#00429d' }}>NELSON</div>
                <div style={{ fontSize: '8pt', color: '#666' }}>L'énergie solaire simplifiée</div>
            </div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#00429d' }}>{title}</div>
            <div style={{ fontSize: '9pt', color: '#333' }}>
                Projet : {project?.name} - {project?.city} ({project?.zip})
            </div>
        </div>
    </div>
);

/**
 * PLANCHE 2 : PLAN DE SITUATION (Grille 3)
 */
export const PlateSituation = ({ project, captures }) => {
    // captures = { ign: '...', cadastre: '...', satellite: '...' }
    return (
        <div style={PAGE_STYLE} id="dp-plate-situation">
            <PlateHeader title="DP1 : PLAN DE SITUATION" project={project} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '5mm', flex: 1 }}>
                <div style={{ gridColumn: 'span 2', border: '1px solid #ddd', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(0,66,157,0.8)', color: 'white', padding: '1mm 3mm', fontSize: '10pt', fontWeight: 'bold', zIndex: 10 }}>Vue Aérienne</div>
                    <img src={captures?.satellite} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Satellite" />
                </div>
                <div style={{ border: '1px solid #ddd', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(0,66,157,0.8)', color: 'white', padding: '1mm 3mm', fontSize: '10pt', fontWeight: 'bold', zIndex: 10 }}>IGN</div>
                    <img src={captures?.ign} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="IGN" />
                </div>
                <div style={{ border: '1px solid #ddd', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '2mm', left: '2mm', background: 'rgba(0,66,157,0.8)', color: 'white', padding: '1mm 3mm', fontSize: '10pt', fontWeight: 'bold', zIndex: 10 }}>Cadastre</div>
                    <img src={captures?.cadastre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cadastre" />
                </div>
            </div>
            <div style={{ marginTop: '3mm', fontSize: '8pt', color: '#666', textAlign: 'center' }}>
                Échelle indicative - Coordonnées GPS : {project?.gps}
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
 * PLANCHE 4 : NOTICE & INSERTION
 */
export const PlateNotice = ({ project, captures }) => {
    return (
        <div style={PAGE_STYLE} id="dp-plate-notice">
            <PlateHeader title="DP4 : NOTICE & INSERTION" project={project} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8mm', flex: 1 }}>
                <div style={{ spaceY: '4mm' }}>
                    <h3 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#00429d', marginBottom: '3mm' }}>Notice Descriptive</h3>
                    <p style={{ fontSize: '9pt', lineHeight: '1.4', textAlign: 'justify' }}>
                        Le projet consiste en l'installation d'une centrale photovoltaïque en autoconsommation. 
                        Les panneaux seront de type monocristallin avec une finition <b>Full Black (RAL 9005)</b> pour une insertion optimale.
                    </p>
                    <p style={{ fontSize: '9pt', lineHeight: '1.4', textAlign: 'justify', marginTop: '3mm' }}>
                        En complément, une solution de stockage d'énergie est prévue avec l'installation de <b>2 batteries Mercury 261</b>. 
                        Ces unités seront positionnées sur une dalle béton à proximité du point de livraison, minimisant l'impact visuel et sonore.
                    </p>
                    <div style={{ marginTop: '5mm', padding: '3mm', background: '#f0f7ff', border: '1px solid #cce3ff', borderRadius: '4px' }}>
                        <h4 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#00429d', marginBottom: '2mm' }}>Matériaux & Teintes</h4>
                        <ul style={{ fontSize: '8pt', paddingLeft: '15px' }}>
                            <li>Toiture : Bac Acier RAL 7016 (Gris Anthracite)</li>
                            <li>Panneaux : Verre traité antireflet, cadre noir RAL 9005</li>
                            <li>Stockage : Coffrets blancs/verts Mercury 261</li>
                        </ul>
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '4mm' }}>
                    <div style={{ border: '1px solid #ddd', position: 'relative' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '1mm', fontSize: '8pt', textAlign: 'center' }}>Photo Avant (Insertion)</div>
                        <img src={captures?.photo_avant} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avant" />
                    </div>
                    <div style={{ border: '1px solid #ddd', position: 'relative' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,100,0,0.5)', color: 'white', padding: '1mm', fontSize: '8pt', textAlign: 'center' }}>Photo Après (Insertion)</div>
                        <img src={captures?.photo_apres || captures?.photo_projet} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Après" />
                    </div>
                </div>
            </div>
            
            {/* Visual Mercury 261 integration */}
            <div style={{ marginTop: '5mm', display: 'flex', gap: '5mm', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '3mm' }}>
                <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#666' }}>Détail Stockage :</div>
                <img src="/images/mercury261/batterie1.png" style={{ height: '25mm' }} alt="Mercury 261" />
                <div style={{ fontSize: '8pt', fontStyle: 'italic' }}>
                    Unité Mercury 261 sur dalle béton préfabriquée.
                </div>
            </div>
        </div>
    );
};
