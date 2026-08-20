import jsPDF from 'jspdf';
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';

/**
 * Charge une image et retourne une promesse avec son instance HTMLImageElement
 */
const loadImage = (src) => {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

/**
 * Helper de formatage de nombre avec espacement fin sans espace insécable élargi
 */
const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * Générateur officiel de la Fiche Technique Bâtiment (A4 Portrait)
 */
export async function generateFicheTechniquePDF({
    config,
    isAcama = false,
    imgMain3D = null,
    imgPignon = null,
    img2D = null,
    imgFacadeSud = null,
}) {
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;

    const length = Number(config.length || 30.0);
    const mainWidth = Number(config.width || 15.0);
    const leftExt = config.leftSide !== 'none' ? Number(config.leftWidth || 0) : 0;
    const rightExt = config.rightSide !== 'none' ? Number(config.rightWidth || 0) : 0;
    const totalWidth = mainWidth + leftExt + rightExt;
    const floorArea = Math.round(length * totalWidth);

    const isCustom = config.configMode === 'custom' || (!isAcama && config.buildingType === 'custom');

    const barcMatch = findBarconniereBuilding({
        length,
        width: mainWidth,
        buildingType: config.buildingType || 'symetrique',
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth || 0,
        rightWidth: config.rightWidth || 0,
        isAcama,
    });

    const gammeName = isCustom ? 'Bâtiment Sur-Mesure' : barcMatch.gamme;
    const buildingCode = String(barcMatch.id || '').replace(/^#/, '').trim();
    const equivalenceCode = String(barcMatch.code || '').trim();

    // Typologie libellé lisible
    const TYPE_LABELS = {
        symetrique: 'Bipente Symétrique',
        asymetrique_1: 'Asymétrique 1 zone',
        asymetrique_2: 'Asymétrique 2 zones',
        monopente: 'Monopente',
        ombriere_pl: 'Ombrière Poids Lourds (PL)',
        ombriere_vl_double: 'Ombrière VL Double',
        ombriere_vl_simple_droite: 'Ombrière VL Simple (Droite)',
        ombriere_vl_simple_gauche: 'Ombrière VL Simple (Gauche)',
        custom: 'Bâtiment Sur-Mesure',
    };
    const typologyLabel = TYPE_LABELS[config.buildingType] || config.buildingType || 'Structure Métallique';

    // Données Solaires
    const installedKwc = Number(config.solarStats?.power) || barcMatch.kwc || Math.round(floorArea * 0.20);
    const panelCount = Number(config.solarStats?.count) || Math.round((installedKwc * 1000) / (isAcama ? 460 : 465));
    const estimatedProductionKwh = Math.round(installedKwc * 1150);

    // Chiffrage
    const totalBuildingCost = isCustom ? Math.round(floorArea * 128) : barcMatch.tarif;
    const pvCostPerWc = 0.55;
    const pvInstallationCost = Math.round(installedKwc * 1000 * pvCostPerWc + 15000);
    const totalProjectCost = totalBuildingCost + (config.hasSolar ? pvInstallationCost : 0);

    // Ratios
    const ratioCostPerM2 = floorArea > 0 ? Math.round(totalBuildingCost / floorArea) : barcMatch.ratioM2;
    const ratioTotalCostPerWc = installedKwc > 0 ? (totalProjectCost / (installedKwc * 1000)).toFixed(2) : '0.00';
    const ratioStructureCostPerWc = installedKwc > 0 ? (totalBuildingCost / (installedKwc * 1000)).toFixed(2) : (barcMatch.ratioKwc?.toFixed(2) || '0.00');

    // Calcul Pente en Degrés et Pourcentage
    const pitchDeg = Number(config.roofPitch || 10);
    const pitchPct = Math.round(Math.tan(pitchDeg * (Math.PI / 180)) * 100);
    const pitchLabel = `${pitchDeg}° (${pitchPct}%)`;

    // ==========================================
    // 1. BANDE SUPÉRIEURE (HEADER)
    // ==========================================
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 22, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(6, 22, pageWidth - 6, 22);

    // Logo "Logo fond blanc inline.png" (gauche)
    try {
        let logoHeader = await loadImage('/logo-enr-courtage-inline.png');
        if (!logoHeader) logoHeader = await loadImage('/Logo fond blanc inline.png');
        if (!logoHeader) logoHeader = await loadImage('/logo-header.png');

        if (logoHeader) {
            const aspect = (logoHeader.width || 200) / (logoHeader.height || 50);
            const targetH = 13;
            const targetW = Math.min(targetH * aspect, 50);
            pdf.addImage(logoHeader, 'PNG', 8, 4.5, targetW, targetH, undefined, 'FAST');
        } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(15);
            pdf.setTextColor(30, 58, 138);
            pdf.text('ENR COURTAGE', 8, 14);
        }
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.setTextColor(30, 58, 138);
        pdf.text('ENR COURTAGE', 8, 14);
    }

    // Titre "FICHE TECHNIQUE" (droite)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14.5);
    pdf.setTextColor(15, 23, 42); // Slate 900
    pdf.text('FICHE TECHNIQUE', pageWidth - 8, 11, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139); // Slate 500
    const subHeader = isCustom 
        ? `Configuration Sur-Mesure • ${floorArea} m²` 
        : `${gammeName} • ${buildingCode ? `Code ${buildingCode} • ` : ''}${floorArea} m²`;
    pdf.text(subHeader, pageWidth - 8, 17, { align: 'right' });

    // ==========================================
    // 2. BANDE VERTICALE GAUCHE (SIDEBAR SYNTHÈSE)
    // ==========================================
    const sideX = 6;
    const sideY = 24;
    const sideW = 56;
    const sideH = 258;

    // Fond sombre élégant de la sidebar (Bleu Ardoise Nuit #0f172a)
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(sideX, sideY, sideW, sideH, 2.5, 2.5, 'F');

    let curY = sideY + 5;
    const padL = sideX + 3.5;
    const padR = sideX + sideW - 3.5;

    // Helper pour dessiner un titre de section dans la sidebar
    const drawSectionTitle = (title, color = [56, 189, 248]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.2);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(title.toUpperCase(), padL, curY);
        curY += 1.8;
        pdf.setDrawColor(51, 65, 85);
        pdf.setLineWidth(0.25);
        pdf.line(padL, curY, padR, curY);
        curY += 3.2;
    };

    // Helper pour afficher une ligne clé-valeur
    const drawRow = (label, value, isHighlight = false, valColor = null) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.8);
        pdf.setTextColor(148, 163, 184); // Slate 400
        pdf.text(label, padL, curY);

        pdf.setFont('helvetica', isHighlight ? 'bold' : 'normal');
        pdf.setFontSize(7.0);
        if (valColor) {
            pdf.setTextColor(valColor[0], valColor[1], valColor[2]);
        } else {
            pdf.setTextColor(isHighlight ? 255 : 241, isHighlight ? 255 : 245, isHighlight ? 255 : 249);
        }
        pdf.text(String(value), padR, curY, { align: 'right' });
        curY += 3.8;
    };

    // --- BLOC 1 : IDENTIFICATION DU BÂTIMENT ---
    drawSectionTitle('1. Identification');
    if (!isCustom) {
        drawRow('Gamme :', gammeName, true, [255, 255, 255]);
        if (buildingCode) drawRow('Code modèle :', buildingCode, true, [251, 191, 36]);
        if (equivalenceCode) drawRow('Équivalence :', equivalenceCode, false, [203, 213, 225]);
    } else {
        drawRow('Modèle :', 'Sur-Mesure', true, [251, 191, 36]);
        drawRow('Grille :', 'Sur-mesure', false, [167, 139, 250]);
    }
    curY += 1.5;

    // --- BLOC 2 : STRUCTURE & DIMENSIONS ---
    drawSectionTitle('2. Structure & Dimensions');
    drawRow('Typologie :', typologyLabel.length > 20 ? typologyLabel.substring(0, 18) + '...' : typologyLabel);
    drawRow('Longueur :', `${length.toFixed(2)} m`);
    drawRow('Largeur totale :', `${totalWidth.toFixed(2)} m`);
    drawRow('Surface au sol :', `${floorArea} m²`, true, [56, 189, 248]);
    drawRow('Travées :', barcMatch.travees || `${config.bayCount} × ${config.baySpacing} m`);
    
    // Indication altitude sous travées
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.2);
    pdf.setTextColor(148, 163, 184);
    pdf.text('(travées 7,5m jusqu’à 200m d’altitude,', padL, curY);
    curY += 2.2;
    pdf.text('et 6,00m de 200m à 500m d’altitude)', padL, curY);
    curY += 3.2;

    drawRow('Avants-toit :', 'environ 50 cm');
    drawRow('Niveau fondations :', '+/- 0.0 m');
    if (config.leftSide !== 'none') drawRow('Ext. Gauche :', `${config.leftSide === 'appentis' ? 'Appentis' : 'Auvent'} (${leftExt}m)`);
    if (config.rightSide !== 'none') drawRow('Ext. Droite :', `${config.rightSide === 'appentis' ? 'Appentis' : 'Auvent'} (${rightExt}m)`);
    curY += 1.5;

    // --- BLOC 3 : HAUTEURS & TOITURE ---
    drawSectionTitle('3. Hauteurs & Toiture');
    drawRow('Hauteur Sablière :', barcMatch.sabliere || `${Number(config.eaveHeight || 4).toFixed(2)} m`);
    drawRow('Hauteur Faîtage :', barcMatch.faitage || `${Number(config.ridgeHeight || 7.4).toFixed(2)} m`);
    drawRow('Pente de toit :', pitchLabel);
    drawRow('Couverture :', 'Bac acier (RAL 7016)');
    drawRow('Anti-condensation :', 'Feutre régulateur');
    drawRow('Peinture :', 'Anti-rouille');
    curY += 1.5;

    // --- BLOC 4 : CENTRALE PHOTOVOLTAÏQUE ---
    drawSectionTitle('4. Énergie Solaire', [251, 191, 36]);
    if (config.hasSolar) {
        drawRow('Statut PV :', 'Activée', true, [251, 191, 36]);
        drawRow('Puissance :', `${installedKwc.toFixed(1)} kWc`, true, [251, 191, 36]);
        drawRow('Nombre modules :', `${panelCount} panneaux`);
        drawRow('Technologie :', `${isAcama ? 460 : 465} Wc`);
        drawRow('Prod. estimée :', `~${formatNumber(estimatedProductionKwh)} kWh/an`);
        
        // Sous-ligne hypothèse
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(5.4);
        pdf.setTextColor(203, 213, 225);
        pdf.text('(hypothèse 1150 kWh/kWc)', padR, curY, { align: 'right' });
        curY += 3.5;
    } else {
        drawRow('Option solaire :', 'Non incluse (Sans PV)', false, [148, 163, 184]);
    }
    curY += 1.5;

    // --- BLOC 5 : TARIFICATION & RATIOS ---
    drawSectionTitle('5. Chiffrage & Ratios', [52, 211, 153]);
    drawRow('Structure métal. :', `${formatNumber(totalBuildingCost)} € HT`, true, [255, 255, 255]);
    if (config.hasSolar) {
        drawRow('Centrale PV :', `${formatNumber(pvInstallationCost)} € HT`);
        drawRow('Total Projet :', `${formatNumber(totalProjectCost)} € HT`, true, [52, 211, 153]);
    }
    drawRow('Ratio / Surface :', `${formatNumber(ratioCostPerM2)} € / m²`, true, [56, 189, 248]);
    if (config.hasSolar && installedKwc > 0) {
        drawRow('Ratio Total / Wc :', `${ratioTotalCostPerWc} € / Wc`);
        drawRow('Ratio Struct. / Wc :', `${ratioStructureCostPerWc} € / Wc`);
    }

    // --- PRÉ-CHARGEMENT DES IMAGES POUR UN RATIO & CADRAGE PARFAIT SANS DÉFORMATION ---
    const [loadedMain3D, loadedPignon, loaded2D, loadedFacadeSud] = await Promise.all([
        loadImage(imgMain3D),
        loadImage(imgPignon),
        loadImage(img2D),
        loadImage(imgFacadeSud),
    ]);

    // --- LOGO NELSON EN BAS DU CADRE BLEU (CENTRE ET REDUIT) ---
    try {
        const logoNelson = await loadImage('/logo-nelson.png');
        if (logoNelson) {
            const nelsonW = 15;
            const nelsonH = 5.8;
            const nelsonX = sideX + (sideW - nelsonW) / 2;
            const nelsonY = sideY + sideH - 9.5;
            pdf.addImage(logoNelson, 'PNG', nelsonX, nelsonY, nelsonW, nelsonH, undefined, 'FAST');
        }
    } catch (e) {
        console.warn('Erreur logo Nelson:', e);
    }

    // ==========================================
    // 3. ZONE CENTRALE & DROITE : 4 VISUELS 3D/2D
    // ==========================================
    const mainX = 66;
    const mainW = 138;

    // Helper pour dessiner un cadre visuel élégant avec centrage H/V parfait sans débordement
    const drawImageCard = (title, x, y, w, h, imgObj) => {
        // Fond blanc du cadre avec bordure grise
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(x, y, w, h, 2, 2, 'S');

        // Bandeau titre supérieur
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, y, w, 5.5, 2, 2, 'F');
        pdf.rect(x, y + 3.5, w, 2, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.line(x, y + 5.5, x + w, y + 5.5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text(title.toUpperCase(), x + 3, y + 4.0);

        // Insertion Image parfaitement centrée horizontalement et verticalement sans déformation
        if (imgObj) {
            try {
                const imgMargin = 1.5;
                const containerX = x + imgMargin;
                const containerY = y + 5.5 + imgMargin;
                const containerW = w - (imgMargin * 2);
                const containerH = h - 5.5 - (imgMargin * 2);

                let imgW = containerW;
                let imgH = containerH;
                let imgX = containerX;
                let imgY = containerY;

                if (imgObj.width && imgObj.height) {
                    const imgAspect = imgObj.width / imgObj.height;
                    const containerAspect = containerW / containerH;

                    if (imgAspect > containerAspect) {
                        // Image plus large : ajuste à la largeur et centre verticalement
                        imgW = containerW;
                        imgH = containerW / imgAspect;
                        imgY = containerY + (containerH - imgH) / 2;
                    } else {
                        // Image plus haute : ajuste à la hauteur et centre horizontalement
                        imgH = containerH;
                        imgW = containerH * imgAspect;
                        imgX = containerX + (containerW - imgW) / 2;
                    }
                }

                pdf.addImage(imgObj, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');
            } catch (err) {
                console.warn('Erreur rendu image:', title, err);
            }
        }
    };

    // VISUEL 1 (Haut) : Vue 3D configurée principale
    drawImageCard('Vue 3D Principale du Bâtiment (Perspective)', mainX, 24, mainW, 82, loadedMain3D);

    // VISUELS 2 & 3 (Milieu) : Pignon Gauche + Visuel 2D côte à côte
    const midY = 109;
    const midH = 82;
    const halfW = (mainW - 3) / 2; // 67.5 mm chacun
    drawImageCard('Vue Pignon (Gauche)', mainX, midY, halfW, midH, loadedPignon);
    drawImageCard('Élévation 2D / Coupe Technique', mainX + halfW + 3, midY, halfW, midH, loaded2D);

    // VISUEL 4 (Bas) : Vue Façade Sud (Long Pan Solaire)
    drawImageCard('Vue Façade Sud (Long Pan Solaire)', mainX, 194, mainW, 88, loadedFacadeSud);

    // ==========================================
    // 4. PIED DE PAGE (FOOTER)
    // ==========================================
    const footerY = 285;
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.line(sideX, footerY, pageWidth - sideX, footerY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.3);
    pdf.setTextColor(100, 116, 139);
    const legalNotice = "Les droits d'exploitation et de propriété intellectuelle appartiennent à ENR COURTAGE. Document confidentiel et non contractuel.";
    pdf.text(legalNotice, sideX, footerY + 4.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 138); // Bleu Marine
    const contactInfo = "contact@enr-courtage.fr   •   enr-courtage.fr";
    pdf.text(contactInfo, pageWidth - sideX, footerY + 4.5, { align: 'right' });

    // Date de génération
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Document généré le ${dateStr}`, sideX, footerY + 8);

    // Téléchargement du fichier
    const cleanName = (gammeName || 'Batiment').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Fiche_Technique_${cleanName}_${buildingCode || 'NELSON'}.pdf`;
    pdf.save(fileName);
}
