import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { smartFillCerfa, resolveDemandeurNames } from './SmartCerfaService';

// ─── Types d'installation ────────────────────────────────────────────────────

export function getInstallationTypeInfo(type, projectSize) {
  const kwcVal = projectSize ? `${projectSize} kWc` : 'Centrale Solaire';
  const t = (type || '').toLowerCase();
  
  if (t.includes('batterie')) {
    return {
      title: 'Système de stockage par batterie',
      subtitle: `${kwcVal} — Raccordement réseau ENEDIS`,
      cerfaText: `Installation d'un système de stockage d'énergie par batterie`,
      code: 'BATTERIE',
      isNewConstruction: true,
    };
  }
  if (t.includes('ombriere') || t.includes('ombrière')) {
    return {
      title: 'Ombrière de parking photovoltaïque',
      subtitle: `${kwcVal} — raccordement réseau ENEDIS`,
      cerfaText: `Construction d'une ombrière de parking photovoltaïque de ${kwcVal}`,
      code: 'OMBRIERE',
      isNewConstruction: true,
    };
  }
  if (t.includes('toiture')) {
    return {
      title: 'Centrale photovoltaïque en toiture existante',
      subtitle: `${kwcVal} — raccordement réseau ENEDIS`,
      cerfaText: `Installation de panneaux photovoltaïques en toiture de ${kwcVal}`,
      code: 'TOITURE',
      isNewConstruction: false,
    };
  }
  // Par défaut : Bâtiment agricole solaire
  return {
    title: "Bâtiment à charpente métallique équipé d'une centrale photovoltaïque",
    subtitle: `${kwcVal} — raccordement réseau ENEDIS`,
    cerfaText: `Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque de ${kwcVal}`,
    code: 'BAT_SOLAIRE',
    isNewConstruction: true,
  };
}

// ─── Couleurs design ─────────────────────────────────────────────────────────

const C = {
  blue:       rgb(0.05, 0.30, 0.68),     // #0D4DAD
  blueLight:  rgb(0.10, 0.45, 0.85),     // #1973D9
  bluePale:   rgb(0.88, 0.93, 0.99),     // #E1EEF9
  dark:       rgb(0.10, 0.12, 0.18),     // #1A1F2E
  gray:       rgb(0.45, 0.48, 0.55),     // #737A8C
  grayLight:  rgb(0.92, 0.93, 0.95),     // #EAEFF1
  white:      rgb(1, 1, 1),
  green:      rgb(0.08, 0.62, 0.39),     // #149F64
  accent:     rgb(0.98, 0.65, 0.02),     // #FAA505
};

// Utilitaire : coupe le texte en lignes de maxChars caractères
function wrapText(text, maxChars) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

// ─── Dessin de la page de couverture qualité architecte ──────────────────────

async function drawCoverPage(doc, project, type, installationType) {
  const fontR = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  const typeLabels = { cu: "Certificat d'Urbanisme opérationnel", dp: 'Déclaration Préalable de Travaux', pc: 'Permis de Construire' };
  const typeColors = { cu: C.blue, dp: C.green, pc: rgb(0.4, 0.1, 0.7) };
  const typeLabel = typeLabels[type] || 'Dossier Urbanisme';
  const typeColor = typeColors[type] || C.blue;

  const W = 841.89; // A4 Landscape width  (pt)
  const H = 595.28; // A4 Landscape height (pt)

  const page = doc.addPage([W, H]);

  // ── Fond général ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.97, 0.98, 1) });

  // ── Bande latérale gauche ─────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: 200, height: H, color: C.blue });
  for (let i = 0; i < 10; i++) {
    page.drawRectangle({ x: 190 + i * 1, y: 0, width: 2, height: H, color: rgb(0.05 + i * 0.05, 0.30 + i * 0.03, 0.68 + i * 0.01), opacity: 0.15 });
  }

  // ── Logo NELSON ───────────────────────────────────────────────
  page.drawText('NELSON', { x: 18, y: H - 60, size: 22, font: fontB, color: C.white });
  page.drawText('Développement & Ingénierie PV', { x: 18, y: H - 78, size: 8, font: fontR, color: rgb(1, 1, 1, 0.6) });

  page.drawRectangle({ x: 18, y: H - 90, width: 164, height: 1, color: rgb(1, 1, 1, 0.2) });

  // ── Informations du projet (colonne gauche) ───────────────────
  const clientName = `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`.trim() || project?.clientName || 'Demandeur';
  const communeName = project?.city || project?.cadastre_commune || project?.commune || '—';
  const sectionVal = (project?.cadastre_section || project?.section) ? `${project.cadastre_section || project.section} n° ${project.cadastre_numero || project.numero || '—'}` : '—';
  const surfaceVal = (project?.cadastre_surface || project?.surface) ? `${project.cadastre_surface || project.surface} m²` : '—';
  const rawKwc = project?.kwc || project?.projectSize;
  const puissanceVal = rawKwc ? (String(rawKwc).includes('kWc') ? String(rawKwc) : `${rawKwc} kWc`) : '—';
  // Dynamic type label based on configured buildings
  let installCode;
  const projectBuildings = project?.buildings || [];
  if (projectBuildings.length > 1) {
    const hasOmbriere = projectBuildings.some(b => (b.buildingType || '').toLowerCase().includes('ombriere'));
    if (hasOmbriere) {
      installCode = 'Bâtiment et Ombrière';
    } else {
      installCode = `${projectBuildings.length} Bâtiments agricoles PV`;
    }
  } else {
    installCode = getInstallationTypeInfo(installationType || project?.type).code;
  }
  if (project?.batteryStorage?.enabled) {
    installCode += ' + Stockage batterie';
  }

  const drawLeft = (label, value, yPos) => {
    page.drawText(label.toUpperCase(), { x: 18, y: yPos + 14, size: 7, font: fontR, color: rgb(1,1,1,0.6) });
    page.drawText((value || '—').substring(0, 24), { x: 18, y: yPos, size: 9.5, font: fontB, color: C.white });
  };

  drawLeft('Demandeur',  clientName,                          H - 140);
  drawLeft('Commune',    communeName,                         H - 175);
  drawLeft('Section',    sectionVal,                          H - 210);
  drawLeft('Surface',    surfaceVal,                          H - 245);
  drawLeft('Puissance',  puissanceVal,                        H - 280);
  drawLeft('Type',       installCode,                         H - 315);

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  page.drawText('Date de génération', { x: 18, y: 55, size: 7, font: fontR, color: rgb(1,1,1,0.5) });
  page.drawText(today, { x: 18, y: 40, size: 8, font: fontB, color: C.white });
  page.drawText('Généré par nelsonpv.fr', { x: 18, y: 22, size: 7, font: fontR, color: rgb(1,1,1,0.4) });

  // ── Zone centrale ─────────────────────────────────────────────
  const cx = 220;

  // Bandeau type de dossier
  page.drawRectangle({ x: cx, y: H - 90, width: W - cx - 20, height: 46, color: typeColor });
  page.drawText(typeLabel.toUpperCase(), { x: cx + 16, y: H - 58, size: 14, font: fontB, color: C.white });
  page.drawText('Dossier de demande d\'autorisation d\'urbanisme', { x: cx + 16, y: H - 73, size: 8, font: fontR, color: rgb(1,1,1,0.75) });

  // Titre du projet
  const typeInfo = getInstallationTypeInfo(installationType || project?.type, project?.kwc || project?.projectSize);
  page.drawText(typeInfo.title, { x: cx + 16, y: H - 115, size: 16, font: fontB, color: C.dark });
  page.drawText(typeInfo.subtitle, { x: cx + 16, y: H - 135, size: 10, font: fontR, color: C.gray });

  page.drawRectangle({ x: cx + 16, y: H - 145, width: 60, height: 3, color: typeColor });

  // ── Tableau récapitulatif (avec wrap propre de l'adresse sur 2-3 lignes) ──
  const tableY = H - 200;
  const fullAddress = `${project?.address || project?.adresse || '—'}, ${project?.zip || project?.zipCode || ''} ${project?.city || project?.commune || ''}`.trim().replace(/^,\s*/, '');
  const cols = [
    { label: 'Adresse du terrain', value: fullAddress, isAddress: true },
    { label: 'Référence cadastrale', value: (project?.cadastre_section || project?.section) ? `Section ${project.cadastre_section || project.section} n° ${project.cadastre_numero || project.numero || '—'}` : '—' },
    { label: 'Surface terrain', value: surfaceVal },
    { label: 'Puissance installée', value: puissanceVal },
  ];

  const colW = (W - cx - 36) / cols.length;
  cols.forEach((col, i) => {
    const colX = cx + 16 + i * colW;
    // Header
    page.drawRectangle({ x: colX, y: tableY, width: colW - 6, height: 22, color: C.bluePale });
    page.drawText(col.label.toUpperCase(), { x: colX + 6, y: tableY + 7, size: 6.5, font: fontR, color: C.blue });
    
    // Value
    if (col.isAddress) {
      const addrLines = wrapText(col.value, 22);
      addrLines.slice(0, 3).forEach((line, lineIdx) => {
        page.drawText(line, {
          x: colX + 6,
          y: tableY - 14 - (lineIdx * 11),
          size: 8.5,
          font: fontB,
          color: C.dark
        });
      });
    } else {
      page.drawText(col.value.substring(0, 30), { x: colX + 6, y: tableY - 14, size: 9, font: fontB, color: C.dark });
    }
  });

  // ── Description (objet des travaux) ──────────────────────────
  page.drawText('OBJET DES TRAVAUX', { x: cx + 16, y: H - 285, size: 7.5, font: fontB, color: C.gray });
  
  // Utiliser le texte synthétique Cerfa / nature des travaux et non la notice PC4 complète
  const objetText = (project?.objet_travaux || project?.objetTravaux)
    ? (project.objet_travaux || project.objetTravaux)
    : (project?.description && !project.description.includes("NOTICE D'INSERTION") && !project.description.includes('1- OBJET') && project.description.length < 250)
      ? project.description
      : typeInfo.cerfaText;

  const descLines = wrapText(objetText, 72);
  descLines.slice(0, 6).forEach((line, i) => {
    page.drawText(line, { x: cx + 16, y: H - 300 - i * 13, size: 9.5, font: fontR, color: C.dark });
  });

  // ── Footer barre ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: 16, color: typeColor });
  page.drawText('DOSSIER CONFIDENTIEL — Usage réservé à la procédure d\'instruction', {
    x: 220, y: 4, size: 7, font: fontR, color: rgb(1,1,1,0.7)
  });

  page.drawText('Page 1', { x: W - 60, y: 4, size: 7, font: fontR, color: rgb(1,1,1,0.7) });
}

// ─── Capture DOM plates ───────────────────────────────────────────────────────

async function captureplate(doc, elementId, landscape = true) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`[UrbanismeDoc] Element #${elementId} not found`);
    return;
  }

  await new Promise(r => setTimeout(r, 200));

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
    const img = await doc.embedJpg(dataUrl);
    const dims = landscape ? [841.89, 595.28] : [595.28, 841.89];
    const page = doc.addPage(dims);
    page.drawImage(img, { x: 0, y: 0, width: dims[0], height: dims[1] });

    // Notice descriptive: texte déjà capturé par html2canvas, pas de champ AcroForm superposé
  } catch (err) {
    console.error(`[UrbanismeDoc] Error capturing #${elementId}:`, err);
  }
}

// ─── Génération complète du dossier ──────────────────────────────────────────

export async function generateFullUrbanismePDF({ type, project, installationType, plateIds = [], includeCover = true, includeCerfa = true, onProgress }) {
  try {
    const finalDoc = await PDFDocument.create();

    // 1. Page de couverture qualité architecte
    if (includeCover) {
      if (onProgress) onProgress('Génération de la page de couverture...');
      await drawCoverPage(finalDoc, project, type, installationType || 'batiment_solaire');
    }

    // 2. Capture des planches graphiques
    for (let i = 0; i < plateIds.length; i++) {
      const id = plateIds[i];
      if (onProgress) onProgress(`Capture planche ${i + 1}/${plateIds.length}...`);
      await captureplate(finalDoc, id);
    }

    // 3. CERFA pré-rempli via SmartCerfaService (avec fallback robuste)
    if (includeCerfa) {
      if (onProgress) onProgress('Pré-remplissage du formulaire CERFA...');

      try {
        const cerfaUrl = type === 'pc'
          ? '/templates/cerfa_13404.pdf'
          : type === 'dp'
            ? '/templates/cerfa_13404.pdf'
            : '/cerfa_16702-02.pdf';

        const cerfaType = type === 'cu' ? 'cu' : type === 'pc' ? 'pc' : 'dp';

        const filledCerfaBytes = await smartFillCerfa(cerfaUrl, project, cerfaType, installationType || 'batiment_solaire', plateIds);
        if (filledCerfaBytes) {
          const cerfaDoc = await PDFDocument.load(filledCerfaBytes);
          const cerfaPages = await finalDoc.copyPages(cerfaDoc, cerfaDoc.getPageIndices());
          cerfaPages.forEach(p => finalDoc.addPage(p));
        }
      } catch (cerfaErr) {
        console.warn('[UrbanismeDoc] Erreur pré-remplissage CERFA, continuation avec les planches graphiques:', cerfaErr);
      }
    }

    // 4. Finalisation
    if (onProgress) onProgress('Finalisation du PDF...');
    const finalPdfBytes = await finalDoc.save();

    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const clientName = `${project?.name || project?.lastName || ''}_${project?.firstName || ''}`.trim().replace(/\s+/g, '_') || 'Client';
    const typeUpper = (type || 'DOSSIER').toUpperCase();
    const link = document.createElement('a');
    link.href = url;
    link.download = `${typeUpper}_${clientName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();

    // Ouverture dans un nouvel onglet
    try { window.open(url, '_blank'); } catch (e) { /* silent */ }

    return true;
  } catch (err) {
    console.error('[UrbanismeDoc] generateFullUrbanismePDF error:', err);
    throw err;
  }
}

export { smartFillCerfa as prefillCerfa };
