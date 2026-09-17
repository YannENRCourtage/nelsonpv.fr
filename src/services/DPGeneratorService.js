import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { smartFillCerfa, resolveDemandeurNames } from './SmartCerfaService';
import { preloadProjectImages } from '@/utils/imageProxy';

/**
 * Capture un élément DOM précis et le convertit en Uint8Array (PDF individuel haute définition)
 */
async function captureDomElementToPdfBytes(elementId, landscape = true) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`[exportDossierDepotZip] Élément introuvable: #${elementId}`);
    return null;
  }

  // 1. Attendre que toutes les balises <img> soient chargées et décodées
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (!img.src) return Promise.resolve();
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        }
        setTimeout(resolve, 1500);
      });
    })
  );

  await new Promise(r => setTimeout(r, 250));

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 20000,
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
    const doc = await PDFDocument.create();
    const img = await doc.embedJpg(dataUrl);
    const dims = landscape ? [841.89, 595.28] : [595.28, 841.89];
    const page = doc.addPage(dims);
    page.drawImage(img, { x: 0, y: 0, width: dims[0], height: dims[1] });
    return await doc.save();
  } catch (err) {
    console.error(`[exportDossierDepotZip] Erreur capture #${elementId}:`, err);
    return null;
  }
}

/**
 * Générateur de notice descriptive PDF de secours qualité architecte via pdf-lib
 */
async function generateNoticePdf(project, type, chosenType) {
  try {
    const doc = await PDFDocument.create();
    const fontR = await doc.embedFont(StandardFonts.Helvetica);
    const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

    const W = 841.89;
    const H = 595.28;
    const page = doc.addPage([W, H]);

    // Fond & Bandes déco
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: rgb(0.05, 0.30, 0.68) });
    page.drawRectangle({ x: 0, y: H - 74, width: W, height: 4, color: rgb(0.98, 0.65, 0.02) });

    // Titre
    page.drawText('NOTICE DESCRIPTIVE DU PROJET', {
      x: 40,
      y: H - 42,
      size: 18,
      font: fontB,
      color: rgb(1, 1, 1)
    });
    page.drawText(`Pièce jointe au dossier de ${type.toUpperCase()} — Cadre réglementaire R.431-8 du Code de l'Urbanisme`, {
      x: 40,
      y: H - 58,
      size: 10,
      font: fontR,
      color: rgb(0.88, 0.93, 0.99)
    });

    // Cartouche Références
    const startY = H - 105;
    page.drawRectangle({
      x: 40,
      y: startY - 50,
      width: W - 80,
      height: 50,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1
    });

    page.drawText(`Demandeur : ${project.demandeur || project.name || project.lastName || '—'}`, {
      x: 55,
      y: startY - 20,
      size: 10,
      font: fontB,
      color: rgb(0.1, 0.15, 0.25)
    });
    page.drawText(`Commune : ${project.city || project.commune || '—'} (${project.zip || '—'})`, {
      x: 55,
      y: startY - 38,
      size: 9.5,
      font: fontR,
      color: rgb(0.3, 0.35, 0.45)
    });
    page.drawText(`Parcelle : Section ${project.cadastre_section || '—'} N° ${project.cadastre_numero || '—'} (${project.cadastre_surface || '—'} m²)`, {
      x: 350,
      y: startY - 20,
      size: 9.5,
      font: fontR,
      color: rgb(0.3, 0.35, 0.45)
    });
    page.drawText(`Type : ${chosenType || project.type || 'Centrale Photovoltaïque'} | Puissance : ${project.puissance || project.kwc || '—'}`, {
      x: 350,
      y: startY - 38,
      size: 9.5,
      font: fontR,
      color: rgb(0.3, 0.35, 0.45)
    });

    // Contenu Notice
    const rawNotice = project.noticeText || project.noticeAgricole || project.pc_notice || project.objet_travaux || project.description || 'Notice descriptive du projet photovoltaïque.';
    const paras = rawNotice.split(/\r?\n/);
    let curY = startY - 80;

    for (const p of paras) {
      if (!p.trim()) {
        curY -= 10;
        continue;
      }
      const words = p.split(' ');
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).length > 115) {
          page.drawText(line.trim(), { x: 45, y: curY, size: 9, font: fontR, color: rgb(0.15, 0.20, 0.25) });
          curY -= 14;
          line = w;
        } else {
          line = line ? `${line} ${w}` : w;
        }
      }
      if (line.trim()) {
        page.drawText(line.trim(), { x: 45, y: curY, size: 9, font: fontR, color: rgb(0.15, 0.20, 0.25) });
        curY -= 16;
      }
      if (curY < 40) break;
    }

    // Bas de page
    page.drawRectangle({ x: 0, y: 0, width: W, height: 20, color: rgb(0.05, 0.30, 0.68) });
    page.drawText('NELSON — Logiciel d\'Ingénierie & d\'Urbanisme Solaire', {
      x: 40,
      y: 6,
      size: 8,
      font: fontR,
      color: rgb(1, 1, 1)
    });

    return await doc.save();
  } catch (e) {
    console.warn('[exportDossierDepotZip] Erreur fallback notice descriptive:', e);
    return null;
  }
}

/**
 * Export complet du dossier d'urbanisme sous forme d'archive ZIP structurée selon la nomenclature réglementaire
 * @param {Object} params
 * @param {Object} params.project Données complètes du projet
 * @param {string} params.type 'dp' | 'pc' | 'cu'
 * @param {string} params.chosenType Intitulé du type d'installation
 * @param {Object} params.selectedPages Sélection des pages
 * @param {Object} params.mairieInfo Informations de la mairie et du portail SVE
 * @param {Function} params.onProgress Callback de statut (message)
 */
export async function exportDossierDepotZip({ project, type = 'dp', chosenType, selectedPages, mairieInfo, onProgress }) {
  try {
    const notify = (msg) => {
      console.log(`[exportDossierDepotZip] ${msg}`);
      if (typeof onProgress === 'function') onProgress(msg);
    };

    notify('Préparation et sécurisation des données du projet...');
    const safeProject = await preloadProjectImages(project);

    const isPC = type === 'pc';
    const isCU = type === 'cu';
    const prefix = isPC ? 'PC' : (isCU ? 'CU' : 'DP');
    const domPrefix = isPC ? 'dev-pc-' : 'dev-';

    const zip = new JSZip();

    // ── 1. Génération CERFA dument rempli ───────────────────────────────────────
    notify('Génération du CERFA officiel prérempli...');
    let cerfaUrl;
    if (isPC) {
      cerfaUrl = '/templates/cerfa_13404.pdf';
    } else {
      const isResidential =
        String(safeProject?.category || '').toLowerCase().includes('resid') ||
        String(safeProject?.category || '').toLowerCase().includes('maison') ||
        String(safeProject?.segment || '').toLowerCase().includes('resid') ||
        String(safeProject?.segment || '').toLowerCase().includes('particulier') ||
        String(safeProject?.type || '').toLowerCase().includes('resid') ||
        String(safeProject?.destination || '').toLowerCase().includes('resid') ||
        safeProject?.cerfaModel === '13703';

      cerfaUrl = isResidential ? '/templates/cerfa_13703.pdf' : '/cerfa_DPC_16702_03.pdf';
    }

    const isBat = (
      safeProject?.solutionType === 'battery' ||
      chosenType === 'battery' ||
      (chosenType || safeProject?.type || '').toLowerCase().includes('batterie') ||
      Boolean(safeProject?.isBatteryStandAlone)
    );
    const effInstallType = isBat
      ? 'batterie_standalone'
      : (safeProject?.solutionType === 'building' ? 'batiment_solaire' : (safeProject?.solutionType === 'ombriere' ? 'ombriere' : (chosenType || 'batiment_solaire')));

    try {
      const cerfaBytes = await smartFillCerfa(cerfaUrl, safeProject, type, effInstallType, []);
      if (cerfaBytes) {
        zip.file(`00_CERFA_${prefix}.pdf`, cerfaBytes);
      }
    } catch (cerfaErr) {
      console.warn('[exportDossierDepotZip] Erreur cerfa, poursuite du ZIP:', cerfaErr);
    }

    // ── 2. Capture des planches individuelles ────────────────────────────────────

    // A. Plan de Situation (DP1 / PC1)
    notify('Export de la pièce 1 (Plan de situation)...');
    const sitBytes = await captureDomElementToPdfBytes(isPC ? 'dev-pc-plate-situation' : 'dev-plate-situation');
    if (sitBytes) {
      zip.file(`${prefix}1_Plan_de_Situation.pdf`, sitBytes);
    }

    // B. Plan de Masse (DP2 / PC2)
    notify('Export de la pièce 2 (Plan de masse)...');
    const masseDomId = isPC ? 'dev-pc-plate-masse' : 'dev-plate-masse';
    const masseBytes = await captureDomElementToPdfBytes(masseDomId);
    if (masseBytes) {
      zip.file(`${prefix}2_Plan_de_Masse.pdf`, masseBytes);
    }

    // Vue 2 du plan de masse si existante
    const masse2DomId = isPC ? 'dev-pc-plate-masse-vue2' : 'dev-plate-masse-vue2';
    if (document.getElementById(masse2DomId)) {
      const masse2Bytes = await captureDomElementToPdfBytes(masse2DomId);
      if (masse2Bytes) {
        zip.file(`${prefix}2_Plan_de_Masse_Vue2.pdf`, masse2Bytes);
      }
    }

    // Multi-bâtiments supplémentaires
    if (safeProject.buildings && safeProject.buildings.length > 1) {
      for (let bIdx = 1; bIdx < safeProject.buildings.length; bIdx++) {
        const bId = isPC ? `dev-pc-plate-masse-${bIdx}` : `dev-plate-masse-${bIdx}`;
        if (document.getElementById(bId)) {
          const bBytes = await captureDomElementToPdfBytes(bId);
          if (bBytes) {
            zip.file(`${prefix}2_Plan_de_Masse_Batiment_${bIdx + 1}.pdf`, bBytes);
          }
        }
      }
    }

    // C. Plan en Coupe (DP3 / PC3)
    notify('Export de la pièce 3 (Plan en coupe)...');
    let sectionDomId = isPC ? 'dev-pc-plate-section-notice' : 'dev-plate-section';
    if (!isPC && document.getElementById('dev-plate-coupe-multi')) {
      sectionDomId = 'dev-plate-coupe-multi';
    }
    const sectionBytes = await captureDomElementToPdfBytes(sectionDomId);
    if (sectionBytes) {
      zip.file(`${prefix}3_Plan_en_Coupe.pdf`, sectionBytes);
    }

    // D. Façades et Toitures (DP4 / PC4 ou PC5)
    notify('Export de la pièce 4 (Plans façades & toitures)...');
    const facadesDomId = isPC ? 'dev-pc-plate-facades' : 'dev-plate-facades';
    const facadesBytes = await captureDomElementToPdfBytes(facadesDomId);
    if (facadesBytes) {
      zip.file(`${prefix}4_Plans_Facades_Toitures.pdf`, facadesBytes);
    }

    // E. Insertion Paysagère (DP6 / PC6)
    notify('Export de la pièce 6 (Document d\'insertion paysagère)...');
    const insertionDomId = isPC ? 'dev-pc-plate-insertion' : 'dev-plate-insertion';
    const insertionBytes = await captureDomElementToPdfBytes(insertionDomId);
    if (insertionBytes) {
      zip.file(`${prefix}6_Document_Insertion_Paysagere.pdf`, insertionBytes);
    }

    // F. Environnement Proche (DP7 / PC7)
    notify('Export de la pièce 7 (Photographie environnement proche)...');
    const envProcheDomId = isPC ? 'dev-pc-plate-env-proche' : 'dev-plate-env-proche';
    const envProcheBytes = await captureDomElementToPdfBytes(envProcheDomId);
    if (envProcheBytes) {
      zip.file(`${prefix}7_Environnement_Proche.pdf`, envProcheBytes);
    }

    // G. Environnement Lointain (DP8 / PC8)
    notify('Export de la pièce 8 (Photographie environnement lointain)...');
    const envLointainDomId = isPC ? 'dev-pc-plate-env-lointain' : 'dev-plate-env-lointain';
    const envLointainBytes = await captureDomElementToPdfBytes(envLointainDomId);
    if (envLointainBytes) {
      zip.file(`${prefix}8_Environnement_Lointain.pdf`, envLointainBytes);
    }

    // H. Notice Descriptive du Projet
    notify('Export de la Notice Descriptive du Projet...');
    let noticeBytes = null;
    if (document.getElementById('dev-plate-notice-dedicated')) {
      noticeBytes = await captureDomElementToPdfBytes('dev-plate-notice-dedicated');
    }
    if (!noticeBytes) {
      noticeBytes = await generateNoticePdf(safeProject, type, chosenType);
    }
    if (noticeBytes) {
      zip.file('Notice_Descriptive_Projet.pdf', noticeBytes);
    }

    // ── 3. Fichier récapitulatif INSTRUCTIONS_DEPOT.txt ────────────────────────
    notify('Génération des instructions de dépôt...');
    const names = resolveDemandeurNames(safeProject);
    const instructionsContent = `================================================================================
DOSSIER OFFICIEL DE DEPOT D'AUTORISATION D'URBANISME (${type.toUpperCase()})
Plateforme Nelson — Préparation automatisée des pièces réglementaires
================================================================================
Date de génération : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}

1. DEMANDEUR / DECLARANT
--------------------------------------------------------------------------------
Nom / Raison Sociale : ${names.demandeur || safeProject.name || safeProject.lastName || '—'}
Adresse déclarant : ${safeProject.address || '—'}
Commune : ${safeProject.zip || ''} ${safeProject.city || safeProject.commune || ''}
Email de contact : ${safeProject.email || '—'}
Téléphone : ${safeProject.phone || safeProject.telephone || '—'}

2. TERRAIN & CARACTERISTIQUES DU PROJET
--------------------------------------------------------------------------------
Adresse des travaux : ${safeProject.address || '—'}
Commune compétente : ${safeProject.city || safeProject.commune || '—'} (${safeProject.zip || '—'})
Références cadastrales : Section ${safeProject.cadastre_section || '—'} | N° ${safeProject.cadastre_numero || '—'} | Surface : ${safeProject.cadastre_surface || '—'} m²
Désignation des travaux :
${safeProject.objet_travaux || safeProject.description || 'Installation solaire photovoltaïque'}
Puissance envisagée : ${safeProject.puissance || (safeProject.kwc ? safeProject.kwc + ' kWc' : '—')}

3. TELESERVICE D'URBANISME OFFICIEL (SAISINE PAR VOIE ELECTRONIQUE - SVE)
--------------------------------------------------------------------------------
Mairie compétente : ${mairieInfo?.nom || `Mairie de ${safeProject.city || 'la Commune'}`}
Guichet détecté : ${mairieInfo?.portal?.name || 'Téléservice National AD\'AU'}
Lien d'accès direct au téléservice :
👉 ${mairieInfo?.portal?.url || 'https://www.service-public.fr/particuliers/vosdroits/R52221'}

Étapes de dépôt en ligne :
1. Connectez-vous sur le lien ci-dessus via FranceConnect ou votre compte usager.
2. Téléversez les pièces jointes PDF de ce dossier ZIP aux étapes correspondantes.
3. Validez la téléprocédure : vous recevrez immédiatement votre Accusé d'Enregistrement Électronique (AEE).

4. NOMENCLATURE DES PIECES DETACHEES INCLUSES DANS CETTE ARCHIVE (.ZIP)
--------------------------------------------------------------------------------
- 00_CERFA_${prefix}.pdf : Formulaire réglementaire officiel dument pré-rempli
- ${prefix}1_Plan_de_Situation.pdf : Plan de situation à double échelle (IGN 1/25000 & Satellite 1/2000)
- ${prefix}2_Plan_de_Masse.pdf : Plan de masse coté dans les 3 dimensions, orienté Nord
- ${prefix}3_Plan_en_Coupe.pdf : Plan en coupe transversale de l'ouvrage et du profil de terrain
- ${prefix}4_Plans_Facades_Toitures.pdf : Vues des façades et toitures sous les angles cardinaux
- ${prefix}6_Document_Insertion_Paysagere.pdf : Simulation photomontage d'intégration dans le site futur
- ${prefix}7_Environnement_Proche.pdf : Photographie intégrée dans son environnement proche
- ${prefix}8_Environnement_Lointain.pdf : Photographie intégrée dans le paysage lointain
- Notice_Descriptive_Projet.pdf : Notice explicative détaillée des matériaux et aspects architecturaux

5. RECOURS DE SECOURS — OPTION DEPOT PAPIER (LETTRE RECOMMANDEE AR)
--------------------------------------------------------------------------------
Si vous préférez un dépôt postal par lettre recommandée avec accusé de réception :
${mairieInfo?.adresseLrar || `Mairie de ${safeProject.city || 'la Commune'}\nService Urbanisme\n${safeProject.zip || ''} ${(safeProject.city || '').toUpperCase()}`}

Téléphone Mairie : ${mairieInfo?.telephone || '—'}
Courriel Mairie : ${mairieInfo?.email || '—'}
Nombre d'exemplaires papier requis :
- Pour une Déclaration Préalable (DP) : 2 exemplaires complets (CERFA + pièces graphiques)
- Pour un Permis de Construire (PC) : 4 exemplaires complets
================================================================================
`;

    zip.file('INSTRUCTIONS_DEPOT.txt', instructionsContent);

    // ── 4. Compression et téléchargement ────────────────────────────────────────
    notify('Compression de l\'archive ZIP finale...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const cleanProjectName = (safeProject.name || safeProject.lastName || 'Projet').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const zipFileName = `Dossier_Depot_${cleanProjectName}_${dateStr}.zip`;

    notify('Téléchargement du dossier ZIP...');
    saveAs(zipBlob, zipFileName);

    return { success: true, fileName: zipFileName };
  } catch (error) {
    console.error('[exportDossierDepotZip] Erreur:', error);
    throw error;
  }
}

/**
 * Service de génération de Dossier de Déclaration Préalable (DP) - conservation compatibilité
 */
export async function generateDPDossier(project, plates) {
  try {
    console.log("Démarrage de la génération DP pour:", project.name);

    // 1. Charger le template Cerfa 13404
    const cerfaBuffer = await fetch('/templates/cerfa_13404.pdf').then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(cerfaBuffer);
    const form = pdfDoc.getForm();

    // 2. Remplissage des champs de base
    const fieldMapping = {
      'topmostSubform[0].Page2[0].F1_nom[0]': project.lastName || project.name,
      'topmostSubform[0].Page2[0].F1_prenom[0]': project.firstName || '',
      'topmostSubform[0].Page2[0].F2_adresseNum[0]': project.address?.split(' ')[0] || '',
      'topmostSubform[0].Page2[0].F2_adresseVoie[0]': project.address?.split(' ').slice(1).join(' ') || '',
      'topmostSubform[0].Page2[0].F2_commune[0]': project.city || '',
      'topmostSubform[0].Page2[0].F2_cp[0]': project.zip || '',
      'topmostSubform[0].Page3[0].F3_numSection[0]': project.cadastre_section || '',
      'topmostSubform[0].Page3[0].F3_numParcelle[0]': project.cadastre_numero || '',
      'topmostSubform[0].Page3[0].F3_surfaceParcelle[0]': project.cadastre_surface || '',
      'topmostSubform[0].Page16[0].F9N_nom[0]': `${project.firstName || ''} ${project.lastName || project.name}`,
      'topmostSubform[0].Page16[0].F9D_date[0]': `${String(new Date().getDate()).padStart(2, '0')}${String(new Date().getMonth() + 1).padStart(2, '0')}${new Date().getFullYear()}`,
    };

    Object.entries(fieldMapping).forEach(([name, value]) => {
      try {
        const field = form.getTextField(name);
        if (field) field.setText(String(value));
      } catch (e) {
        console.warn(`Champ non trouvé ou non supporté: ${name}`);
      }
    });

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    firstPage.drawRectangle({
      x: 50,
      y: 20,
      width: 200,
      height: 30,
      color: { r: 1, g: 1, b: 1 }
    });
    firstPage.drawText("Dossier généré par NELSON", {
      x: 60,
      y: 30,
      size: 10,
      color: { r: 0, g: 0.26, b: 0.61 }
    });

    const cerfaFilledBytes = await pdfDoc.save();

    const finalDoc = await PDFDocument.create();

    if (plates) {
      const plateIds = [
        'dp-plate-cover',
        'dp-plate-situation', 
        'dp-plate-masse', 
        'dp-plate-section',
        'dp-plate-facades',
        'dp-plate-aspect',
        'dp-plate-insertion',
        'dp-plate-env-proche',
        'dp-plate-env-lointain',
        'dp-plate-notice-insertion'
      ];
      for (const id of plateIds) {
        if (plates[id]) {
          try {
            const plateData = plates[id];
            let plateImg;
            if (plateData.startsWith('data:image/jpeg')) {
              plateImg = await finalDoc.embedJpg(plateData);
            } else {
              plateImg = await finalDoc.embedPng(plateData);
            }

            const page = finalDoc.addPage([841.89, 595.28]);
            page.drawImage(plateImg, {
              x: 0,
              y: 0,
              width: 841.89,
              height: 595.28,
            });
          } catch (err) {
            console.error(`Erreur sur la planche ${id}:`, err);
          }
        }
      }
    }

    const cerfaDoc = await PDFDocument.load(cerfaFilledBytes);
    const cerfaPages = await finalDoc.copyPages(cerfaDoc, cerfaDoc.getPageIndices());
    cerfaPages.forEach((page) => finalDoc.addPage(page));
    
    const finalPdfBytes = await finalDoc.save();
    
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DP_${project.name || 'Projet'}.pdf`;
    link.click();

    return true;
  } catch (error) {
    console.error("Erreur génération DP:", error);
    throw error;
  }
}
