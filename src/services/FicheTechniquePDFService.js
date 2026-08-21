import jsPDF from 'jspdf';
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';

/**
 * Charge une image et retourne une promesse avec son instance HTMLImageElement
 */
const loadImage = async (src) => {
    if (!src) return null;
    if (typeof src === 'object' && src.src) return src;

    // Si c'est déjà une Data URL ou Blob URL
    if (src.startsWith('data:') || src.startsWith('blob:')) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    // Chargement par fetch pour garantir l'accès sans faille aux assets publics
    try {
        const res = await fetch(src);
        if (res.ok) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = objectUrl;
            });
        }
    } catch (e) {
        // Fallback standard
    }

    return new Promise((resolve) => {
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
    imgFacadeSud = null,
    imageSettings = {},
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
    // 1. BANDE SUPÉRIEURE (HEADER AVEC ÉCART SUPÉRIEUR)
    // ==========================================
    const headerLineY = 27.0; // Écart ajouté au-dessus de la ligne (descendue de 22mm à 27mm)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerLineY, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(6, headerLineY, pageWidth - 6, headerLineY);

    // Logo "Logo fond blanc inline.png" (gauche, descendu en conséquence)
    try {
        let logoHeader = await loadImage('/logo-enr-courtage-inline.png');
        if (!logoHeader) logoHeader = await loadImage('/Logo fond blanc inline.png');
        if (!logoHeader) logoHeader = await loadImage('/logo-header.png');

        if (logoHeader) {
            const aspect = (logoHeader.width || 200) / (logoHeader.height || 50);
            const targetH = 14;
            const targetW = Math.min(targetH * aspect, 52);
            pdf.addImage(logoHeader, 'PNG', 8, 7.5, targetW, targetH, undefined, 'FAST');
        } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(15);
            pdf.setTextColor(30, 58, 138);
            pdf.text('ENR COURTAGE', 8, 17);
        }
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.setTextColor(30, 58, 138);
        pdf.text('ENR COURTAGE', 8, 17);
    }

    // Titre "FICHE TECHNIQUE" (droite, descendu en conséquence)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14.5);
    pdf.setTextColor(15, 23, 42); // Slate 900
    pdf.text('FICHE TECHNIQUE', pageWidth - 8, 14.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139); // Slate 500
    const subHeader = isCustom 
        ? `Configuration Sur-Mesure • ${floorArea} m²` 
        : `${gammeName} • ${buildingCode ? `Modèle ${buildingCode} • ` : ''}${floorArea} m²`;
    pdf.text(subHeader, pageWidth - 8, 21.0, { align: 'right' });

    // ==========================================
    // 2. BANDE VERTICALE GAUCHE (SIDEBAR SYNTHÈSE - HAUTEUR RÉDUITE)
    // ==========================================
    const sideX = 6;
    const sideY = 29.5; // Démarre sous le nouveau header
    const sideW = 56;
    const sideH = 252.0; // Hauteur réduite en conséquence (s'arrête proprement au-dessus du footer)

    // Fond sombre élégant de la sidebar (Bleu Ardoise Nuit #0f172a)
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(sideX, sideY, sideW, sideH, 2.5, 2.5, 'F');

    let curY = sideY + 4.5;
    const padL = sideX + 3.5;
    const padR = sideX + sideW - 3.5;

    // Helper pour dessiner un titre de section dans la sidebar
    const drawSectionTitle = (title, color = [56, 189, 248]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.2);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(title.toUpperCase(), padL, curY);
        curY += 1.6;
        pdf.setDrawColor(51, 65, 85);
        pdf.setLineWidth(0.25);
        pdf.line(padL, curY, padR, curY);
        curY += 2.6;
    };

    // Helper pour afficher une ligne clé-valeur
    const drawRow = (label, value, isHighlight = false, valColor = null) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.7);
        pdf.setTextColor(148, 163, 184); // Slate 400
        pdf.text(label, padL, curY);

        pdf.setFont('helvetica', isHighlight ? 'bold' : 'normal');
        pdf.setFontSize(6.9);
        if (valColor) {
            pdf.setTextColor(valColor[0], valColor[1], valColor[2]);
        } else {
            pdf.setTextColor(isHighlight ? 255 : 241, isHighlight ? 255 : 245, isHighlight ? 255 : 249);
        }
        pdf.text(String(value), padR, curY, { align: 'right' });
        curY += 3.4;
    };

    // --- BLOC 1 : IDENTIFICATION DU BÂTIMENT ---
    drawSectionTitle('1. Identification');
    if (!isCustom) {
        drawRow('Gamme :', gammeName, true, [255, 255, 255]);
        if (buildingCode) drawRow('Modèle :', buildingCode, true, [251, 191, 36]);
        if (equivalenceCode) drawRow('Équivalence :', equivalenceCode, false, [203, 213, 225]);
    } else {
        drawRow('Modèle :', 'Sur-Mesure', true, [251, 191, 36]);
        drawRow('Grille :', 'Sur-mesure', false, [167, 139, 250]);
    }
    curY += 2.0;

    // --- BLOC 2 : STRUCTURE & DIMENSIONS ---
    drawSectionTitle('2. Structure & Dimensions');
    drawRow('Typologie :', typologyLabel.length > 20 ? typologyLabel.substring(0, 18) + '...' : typologyLabel);
    drawRow('Longueur :', `${length.toFixed(2)} m`);
    drawRow('Largeur totale :', `${totalWidth.toFixed(2)} m`);
    drawRow('Surface au sol :', `${floorArea} m²`, true, [56, 189, 248]);
    drawRow('Travées :', barcMatch.travees || `${config.bayCount} × ${config.baySpacing} m`);
    
    // Indication altitude sous travées
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.0);
    pdf.setTextColor(148, 163, 184);
    pdf.text('(travées 7,5m jusqu’à 200m d’altitude,', padL, curY);
    curY += 1.8;
    pdf.text('et 6,00m de 200m à 500m d’altitude)', padL, curY);
    curY += 2.2;

    drawRow('Avants-toit :', 'environ 50 cm');
    drawRow('Niveau fondations :', '+/- 0.0 m');
    if (config.leftSide !== 'none') drawRow('Ext. Gauche :', `${config.leftSide === 'appentis' ? 'Appentis' : 'Auvent'} (${leftExt}m)`);
    if (config.rightSide !== 'none') drawRow('Ext. Droite :', `${config.rightSide === 'appentis' ? 'Appentis' : 'Auvent'} (${rightExt}m)`);
    curY += 2.0;

    // --- BLOC 3 : HAUTEURS & TOITURE ---
    drawSectionTitle('3. Hauteurs & Toiture');
    drawRow('Hauteur Sablière :', barcMatch.sabliere || `${Number(config.eaveHeight || 4).toFixed(2)} m`);
    drawRow('Hauteur Faîtage :', barcMatch.faitage || `${Number(config.ridgeHeight || 7.4).toFixed(2)} m`);
    drawRow('Pente de toit :', pitchLabel);
    drawRow('Couverture :', 'Bac acier (RAL 7016)');
    drawRow('Anti-condensation :', 'Feutre régulateur');
    drawRow('Peinture :', 'Anti-rouille');
    curY += 2.0;

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
        pdf.setFontSize(5.2);
        pdf.setTextColor(203, 213, 225);
        pdf.text('(hypothèse 1150 kWh/kWc)', padR, curY, { align: 'right' });
        curY += 2.8;

        // Tarif achat estimé selon puissance
        let tarifAchat = '0.011 € / kWh';
        let tarifNum = 0.011;
        if (installedKwc < 100) {
            tarifAchat = '0.011 € / kWh';
            tarifNum = 0.011;
        } else if (installedKwc <= 500) {
            tarifAchat = '0.082 € / kWh';
            tarifNum = 0.082;
        } else {
            tarifAchat = '0.0829 € / kWh';
            tarifNum = 0.0829;
        }
        drawRow('Tarif achat estimé :', tarifAchat, true, [251, 191, 36]);

        // Gain estimé An 1 (Tarif achat x Production estimée)
        const gainEstimeAn1 = tarifNum * estimatedProductionKwh;
        drawRow('Gain estimé An 1 :', `${formatNumber(gainEstimeAn1.toFixed(2))} €`, true, [52, 211, 153]);
    } else {
        drawRow('Option solaire :', 'Non incluse (Sans PV)', false, [148, 163, 184]);
    }
    curY += 2.0;

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

    // --- PRÉ-CHARGEMENT DES IMAGES ---
    const rawType = (config?.buildingType || '').toLowerCase();
    const rawGamme = (gammeName || '').toLowerCase();
    const rawTypo = (typologyLabel || '').toLowerCase();

    // Modèle symétrique avec ou sans appentis ou auvent
    const isSymetrique = 
        rawType.includes('symetrique') || 
        rawType.includes('bipente') || 
        rawType === 'epona' || 
        rawGamme.includes('helios') || 
        rawTypo.includes('symétrique') || 
        rawTypo.includes('symetrique');

    const isAsym1 = 
        rawType.includes('asymetrique_1') || 
        rawGamme.includes('orion') || 
        rawTypo.includes('asymétrique 1') || 
        rawTypo.includes('asymetrique 1');

    const isAsym2 = 
        rawType.includes('asymetrique_2') || 
        rawGamme.includes('cyrus') || 
        rawTypo.includes('asymétrique 2') || 
        rawTypo.includes('asymetrique 2');

    const isOmbriere = 
        rawType.includes('ombriere') || 
        rawGamme.includes('ombriere') || 
        rawTypo.includes('ombrière') || 
        rawTypo.includes('ombriere');

    const hasExtraPhoto = isSymetrique || isAsym1 || isAsym2 || isOmbriere;

    let photoUrlToLoad = null;
    if (isSymetrique) {
        photoUrlToLoad = '/hangar_symetrique.png';
    } else if (isAsym1) {
        photoUrlToLoad = '/hangar_asymetrique_1_zone.png';
    } else if (isAsym2) {
        photoUrlToLoad = '/hangar_asymetrique_2_zones.png';
    } else if (isOmbriere) {
        photoUrlToLoad = '/ombriere_vl_simple_gauche.png';
    }

    const [loadedMain3D, loadedPignon, loadedFacadeSud, loadedHangarPhoto] = await Promise.all([
        loadImage(imgMain3D),
        loadImage(imgPignon),
        loadImage(imgFacadeSud),
        photoUrlToLoad ? loadImage(photoUrlToLoad) : Promise.resolve(null),
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
    // 3. ZONE CENTRALE & DROITE : TITRE + 3 VISUELS ÉPURÉS (SANS CADRE NI TITRE) + À VOTRE CHARGE
    // ==========================================
    const mainX = 66;
    const mainW = 138;
    const mainCenterX = mainX + (mainW / 2);

    // --- EN-TÊTE : PLAN DE STRUCTURE (Avec espace aéré supplémentaire au-dessus, descendu avec le header) ---
    const titleY = 36.0; // Espace ajouté avant les mots "Plan de structure"
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42); // Slate 900
    pdf.text('Plan de structure', mainCenterX, titleY, { align: 'center' });

    const subtitleDim = `${length.toFixed(2)}m × ${totalWidth.toFixed(2)}m - ${floorArea} m²${config.hasSolar ? ` - ${installedKwc.toFixed(1)} kWc` : ''}`;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(0, 66, 157); // Bleu NELSON
    pdf.text(subtitleDim, mainCenterX, titleY + 5.5, { align: 'center' });

    // Helper pour dessiner une image épurée directement sur fond blanc en restant strictement dans son cadre
    const drawSeamlessImage = (imgObj, x, y, maxW, maxH, alignLeft = false) => {
        if (!imgObj) return;
        try {
            let imgW = maxW;
            let imgH = maxH;

            if (imgObj.width && imgObj.height) {
                const imgAspect = imgObj.width / imgObj.height;
                const containerAspect = maxW / maxH;

                if (imgAspect > containerAspect) {
                    imgW = maxW;
                    imgH = maxW / imgAspect;
                } else {
                    imgH = maxH;
                    imgW = maxH * imgAspect;
                }

                // Sécurité stricte pour ne jamais déborder du cadre prévu
                if (imgW > maxW) {
                    imgW = maxW;
                    imgH = maxW / imgAspect;
                }
                if (imgH > maxH) {
                    imgH = maxH;
                    imgW = imgH * imgAspect;
                }
            }

            const imgX = alignLeft ? x : x + (maxW - imgW) / 2;
            const imgY = y + (maxH - imgH) / 2;

            pdf.addImage(imgObj, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');
        } catch (err) {
            console.warn('Erreur rendu image épurée:', err);
        }
    };

    // VISUEL 1 (Haut) : Vue 3D Perspective épurée sur fond blanc (Centrée horizontalement et bornée strictement)
    const topY = 48.0;
    const topH = hasExtraPhoto ? 64.0 : 78.0;
    drawSeamlessImage(loadedMain3D, mainX, topY, mainW, topH, false); // Centrée et contenue dans mainW

    // VISUEL 2 (Milieu Gauche) : Vue Pignon épurée sur fond blanc (abaissée en conséquence, alignée à gauche)
    const midY = hasExtraPhoto ? 118.0 : 134.0;
    const midH = 38.0;
    const pignonW = 75.0;
    drawSeamlessImage(loadedPignon, mainX, midY, pignonW, midH, true); // Cadre laissé à sa place à gauche

    // --- CADRE : À VOTRE CHARGE (Positionné à droite de l'image du pignon, abaissé au même niveau) ---
    const chargeX = 145.0;
    const chargeY = midY;
    const chargeW = 59.0;
    const chargeH = midH;

    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(chargeX, chargeY, chargeW, chargeH, 2, 2, 'FD');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(chargeX, chargeY, chargeW, chargeH, 2, 2, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(15, 23, 42); // Slate 900
    pdf.text('À votre charge :', chargeX + 3.5, chargeY + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(51, 65, 85); // Slate 700

    const chargeItems = [
        "•  Terrassement / empièrement (si nécessaire)",
        "•  Tranchée du bâtiment jusqu'au point de livraison (compteur)",
        "•  Équipements optionnels : chéneaux / bardage / évacuation des eaux pluviales / portails / autres.."
    ];

    const maxTextW = chargeW - 6.5; // ~48.5mm
    let textCursorY = chargeY + 10.0;

    chargeItems.forEach((item) => {
        const lines = pdf.splitTextToSize(item, maxTextW);
        pdf.text(lines, chargeX + 3.5, textCursorY);
        textCursorY += (lines.length * 2.7) + 1.4;
    });

    // VISUEL 3 (Bas) : Vue Façade Sud épurée sur fond blanc (Descendue vers le bas)
    const sudY = hasExtraPhoto ? 164.0 : 180.0;
    const sudH = hasExtraPhoto ? 44.0 : 54.0;
    drawSeamlessImage(loadedFacadeSud, mainX, sudY, mainW, sudH, false);

    // ==========================================
    // 4. PIED DE PAGE (FOOTER) & PHOTO 3D RÉALISTE (SYMÉTRIQUE / ASYMÉTRIQUE 1&2 / OMBRIÈRE VL SIMPLE)
    // ==========================================
    const footerY = 285;

    // Rendu de l'image 3D réaliste (Image en pièce jointe) si symétrique, asymétrique 1 ou 2 zones, ou ombrière VL simple gauche
    if (hasExtraPhoto && loadedHangarPhoto && loadedHangarPhoto.width && loadedHangarPhoto.height) {
        const maxPhotoW = mainW; // 138mm
        const maxPhotoH = 58; // max 58mm height
        const photoAspect = loadedHangarPhoto.width / loadedHangarPhoto.height;

        let photoW = maxPhotoW;
        let photoH = photoW / photoAspect;
        if (photoH > maxPhotoH) {
            photoH = maxPhotoH;
            photoW = photoH * photoAspect;
        }

        const photoX = mainCenterX - (photoW / 2);
        const photoY = (footerY - 4.5) - photoH; // Juste au dessus de la phrase disclaimer
        pdf.addImage(loadedHangarPhoto, 'PNG', photoX, photoY, photoW, photoH, undefined, 'FAST');
    }

    // Phrase centrée horizontalement par rapport à la zone des images (mainCenterX)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.2);
    pdf.setTextColor(148, 163, 184); // Slate 400
    const disclaimerText = "Des modifications mineures pourront être apportées en fonction de l’évolution des panneaux photovoltaïques";
    pdf.text(disclaimerText, mainCenterX, footerY - 2.5, { align: 'center' });

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
