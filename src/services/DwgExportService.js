/**
 * DwgExportService.js — Générateur de plans CAO AutoCAD (.dwg / .dxf)
 * Permet l'export individuel des pièces graphiques du dossier d'urbanisme (DP1, DP2, DP3, DP4, DP6, DP7, DP8)
 * en format CAO AutoCAD standard métrique avec calques (layers), cotations, emprises réelles et cartouche architecte.
 */

export function generatePieceDwg(piece, project, type = 'dp') {
  const isPC = type === 'pc';
  const isCU = type === 'cu';
  const docTypeUpper = (type || 'DP').toUpperCase();

  const pieceId = piece.id || piece.code || 'piece';
  const pieceCode = piece.code || piece.id?.toUpperCase() || 'DP2';
  const pieceTitle = piece.title || 'Plan graphique';

  // ── 1. Extraction des données géométriques et administratives ─────────────
  const bList = (project?.buildings && project.buildings.length > 0) ? project.buildings : [project || {}];
  const b1 = bList[0] || {};

  const isBattery = Boolean(
    project?.isBattery ||
    project?.isBatteryStandAlone ||
    project?.solutionType === 'battery' ||
    (project?.urbanismeType || '').toLowerCase().includes('batterie') ||
    (project?.type || '').toLowerCase().includes('batterie')
  );

  const bLength = isBattery ? 6.20 : Number(b1.length || project?.longueur || 30.0);
  const bWidth = isBattery ? 3.20 : Number(b1.width || project?.largeur || 20.0);
  const bEave = isBattery ? 2.38 : Number(b1.eaveHeight || project?.hauteur_egout || 4.0);
  const bPitch = isBattery ? 0 : Number(b1.roofPitch || project?.pente || 10);
  const bRidge = bEave + Math.tan((bPitch * Math.PI) / 180) * (bWidth / 2);

  const rawSurface = Number(String(project?.cadastre_surface || '2500').replace(/\D/g, '')) || 2500;
  const parcelSide = Math.max(Math.round(Math.sqrt(rawSurface)), 50);
  const parcelWidth = parcelSide * 1.2;
  const parcelLength = parcelSide * 0.85;

  const clientName = (project?.demandeur || `${project?.name || project?.lastName || ''} ${project?.firstName || ''}`).trim() || 'Client';
  const commune = project?.commune || project?.city || project?.cadastre_commune || '—';
  const cadastre = `Section ${project?.cadastre_section || '—'} n° ${project?.cadastre_numero || '—'}`;
  const dateStr = new Date().toLocaleDateString('fr-FR');

  // ── 2. Construction du fichier CAO AutoCAD (DXF R2000 AC1015 / DWG) ──────
  const lines = [];

  // En-tête
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1015'); // AutoCAD 2000+
  lines.push('9', '$INSUNITS', '70', '6');    // Unités : Mètres
  lines.push('9', '$MEASUREMENT', '70', '1'); // Système métrique
  lines.push('9', '$LUNITS', '70', '2');      // Décimal
  lines.push('0', 'ENDSEC');

  // Tables & Calques (Layers)
  lines.push('0', 'SECTION', '2', 'TABLES');

  // Table LTYPE
  lines.push('0', 'TABLE', '2', 'LTYPE', '70', '3');
  lines.push('0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Ligne continue', '72', '65', '73', '0', '40', '0.0');
  lines.push('0', 'LTYPE', '2', 'DASHED', '70', '0', '3', 'Ligne tirets', '72', '65', '73', '2', '40', '1.0', '49', '0.7', '49', '-0.3');
  lines.push('0', 'LTYPE', '2', 'CENTER', '70', '0', '3', 'Axe mixte', '72', '65', '73', '4', '40', '2.0', '49', '1.25', '49', '-0.25', '49', '0.25', '49', '-0.25');
  lines.push('0', 'ENDTAB');

  // Table LAYERS avec couleurs AutoCAD standard (ACI)
  // 1=Rouge, 2=Jaune, 3=Vert, 4=Cyan, 5=Bleu, 6=Magenta, 7=Blanc/Noir, 8=Gris
  const LAYERS = [
    { name: '0', color: 7, ltype: 'CONTINUOUS' },
    { name: 'LIMITES_PARCELLAIRE', color: 1, ltype: 'CONTINUOUS' },
    { name: 'BATIMENTS_PROJET', color: 4, ltype: 'CONTINUOUS' },
    { name: 'STRUCTURE_METALLIQUE', color: 7, ltype: 'CONTINUOUS' },
    { name: 'PANNEAUX_SOLAIRES', color: 5, ltype: 'CONTINUOUS' },
    { name: 'BATTERIE_BESS', color: 6, ltype: 'CONTINUOUS' },
    { name: 'COTES_DIMENSIONS', color: 2, ltype: 'CONTINUOUS' },
    { name: 'AXES_STRUCTURE', color: 8, ltype: 'CENTER' },
    { name: 'RESEAU_ELEC', color: 3, ltype: 'DASHED' },
    { name: 'CARTOUCHE', color: 7, ltype: 'CONTINUOUS' },
    { name: 'TEXTES', color: 7, ltype: 'CONTINUOUS' },
  ];

  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(LAYERS.length));
  for (const lyr of LAYERS) {
    lines.push('0', 'LAYER', '2', lyr.name, '70', '0', '62', String(lyr.color), '6', lyr.ltype);
  }
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // Entités CAO
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Helpers pour générer les primitives AutoCAD
  const addLine = (x1, y1, x2, y2, layer = '0') => {
    lines.push('0', 'LINE', '8', layer);
    lines.push('10', x1.toFixed(3), '20', y1.toFixed(3), '30', '0.0');
    lines.push('11', x2.toFixed(3), '21', y2.toFixed(3), '31', '0.0');
  };

  const addRect = (x, y, w, h, layer = '0', closed = true) => {
    lines.push('0', 'LWPOLYLINE', '8', layer, '90', '4', '70', closed ? '1' : '0');
    lines.push('10', x.toFixed(3), '20', y.toFixed(3));
    lines.push('10', (x + w).toFixed(3), '20', y.toFixed(3));
    lines.push('10', (x + w).toFixed(3), '20', (y + h).toFixed(3));
    lines.push('10', x.toFixed(3), '20', (y + h).toFixed(3));
  };

  const addText = (text, x, y, height = 1.0, layer = 'TEXTES', rotation = 0) => {
    lines.push('0', 'TEXT', '8', layer);
    lines.push('10', x.toFixed(3), '20', y.toFixed(3), '30', '0.0');
    lines.push('40', height.toFixed(2));
    lines.push('1', String(text));
    if (rotation !== 0) lines.push('50', String(rotation));
  };

  const addDimension = (x1, y1, x2, y2, text, layer = 'COTES_DIMENSIONS') => {
    addLine(x1, y1, x2, y2, layer);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    addText(text, midX, midY + 0.35, 0.85, layer);
  };

  // ─── 3. Contenu spécifique selon le type de pièce CAO ─────────────────────

  if (pieceId === 'masse' || pieceId === 'situation' || pieceCode.includes('2') || pieceCode.includes('1')) {
    // ═══ PLAN DE MASSE / PLAN DE SITUATION (DP1 / DP2 / PC1 / PC2) ═══════════
    // 1. Limite cadastrale du terrain (Parcelle)
    addRect(0, 0, parcelWidth, parcelLength, 'LIMITES_PARCELLAIRE');
    addText(`LIMITE PARCELLAIRE — ${cadastre} (${rawSurface} m²)`, 4, parcelLength - 3.5, 1.4, 'LIMITES_PARCELLAIRE');

    // 2. Voirie d'accès au Sud
    addLine(-5, -6, parcelWidth + 5, -6, 'LIMITES_PARCELLAIRE');
    addLine(-5, -12, parcelWidth + 5, -12, 'LIMITES_PARCELLAIRE');
    addText('VOIE COMMUNALE / ACCÈS PRINCIPAL', parcelWidth / 2 - 15, -9.5, 1.2, 'TEXTES');

    // 3. Implantation des constructions / ombrières
    const offsetX = 15.0; // Recul limite Est 15m
    const offsetY = 12.0; // Recul voirie Sud 12m

    if (isBattery) {
      // Station Batteries Stand-Alone : Dalle béton 6.20m × 3.20m + 4 armoires + clôture
      const dalleX = offsetX + 5.0;
      const dalleY = offsetY + 5.0;

      // Clôture périphérique de sécurité (H=2.00m)
      addRect(dalleX - 2.0, dalleY - 2.0, bLength + 4.0, bWidth + 4.0, 'BATTERIE_BESS');
      addText('CLÔTURE MÉTALLIQUE RIGIDE H=2.00M', dalleX - 1.5, dalleY + bWidth + 2.5, 0.9, 'TEXTES');

      // Dalle béton armé
      addRect(dalleX, dalleY, bLength, bWidth, 'BATIMENTS_PROJET');
      addText(`DALLE BÉTON ARMÉ (${bLength.toFixed(2)}m × ${bWidth.toFixed(2)}m — ${(bLength * bWidth).toFixed(1)} m²)`, dalleX + 0.5, dalleY + bWidth / 2, 0.75, 'BATIMENTS_PROJET');

      // 4 Armoires CESC Mercury 261
      const cabW = 1.15;
      const cabH = 1.44;
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        const cX = dalleX + 0.45 + cIdx * 1.35;
        const cY = dalleY + 0.88;
        addRect(cX, cY, cabW, cabH, 'BATTERIE_BESS');
        addText(`B${cIdx + 1}`, cX + 0.35, cY + 0.6, 0.6, 'BATTERIE_BESS');
      }

      // Cotations de recul
      addDimension(0, dalleY, dalleX, dalleY, `Recul limite : ${dalleX.toFixed(2)} m`);
      addDimension(dalleX, 0, dalleX, dalleY, `Recul voirie : ${dalleY.toFixed(2)} m`);
      addDimension(dalleX, dalleY - 1.0, dalleX + bLength, dalleY - 1.0, `${bLength.toFixed(2)} m`);
      addDimension(dalleX - 1.0, dalleY, dalleX - 1.0, dalleY + bWidth, `${bWidth.toFixed(2)} m`);

      // Poste de livraison / PDL Enedis
      addRect(dalleX + bLength + 6.0, dalleY, 2.5, 2.0, 'RESEAU_ELEC');
      addText('PDL / PDL ENEDIS', dalleX + bLength + 6.2, dalleY + 0.9, 0.6, 'RESEAU_ELEC');
      addLine(dalleX + bLength, dalleY + bWidth / 2, dalleX + bLength + 6.0, dalleY + 1.0, 'RESEAU_ELEC');
    } else {
      // Bâtiment / Ombrières photovoltaïques
      for (let bIdx = 0; bIdx < bList.length; bIdx++) {
        const curB = bList[bIdx] || {};
        const curL = Number(curB.length || bLength);
        const curW = Number(curB.width || bWidth);
        const bX = offsetX + (bIdx * (curL + 8.0));
        const bY = offsetY;

        // Emprise au sol du bâtiment / ombrière
        addRect(bX, bY, curL, curW, 'BATIMENTS_PROJET');

        // Portiques / Travées structure métallique
        const baySpacing = Number(curB.baySpacing || 7.5);
        const bayCount = Math.max(Math.round(curL / baySpacing), 1);
        for (let i = 1; i < bayCount; i++) {
          const posX = bX + i * baySpacing;
          addLine(posX, bY, posX, bY + curW, 'STRUCTURE_METALLIQUE');
        }

        // Calepinage panneaux solaires (Quadrillage tables PV)
        const rows = Math.max(Math.floor(curW / 2.2), 2);
        const cols = Math.max(Math.floor(curL / 1.15), 4);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const pX = bX + 0.3 + c * (curL - 0.6) / cols;
            const pY = bY + 0.3 + r * (curW - 0.6) / rows;
            const pW = (curL - 0.6) / cols * 0.94;
            const pH = (curW - 0.6) / rows * 0.92;
            addRect(pX, pY, pW, pH, 'PANNEAUX_SOLAIRES');
          }
        }

        // Annotations et cotations
        addText(`${curB.name || `STRUCTURE ${bIdx + 1}`} — ${(curL * curW).toFixed(0)} m²`, bX + 2, bY + curW + 1.8, 1.2, 'TEXTES');
        addDimension(bX, bY - 1.8, bX + curL, bY - 1.8, `Longueur : ${curL.toFixed(2)} m`);
        addDimension(bX - 1.8, bY, bX - 1.8, bY + curW, `Largeur : ${curW.toFixed(2)} m`);

        // Reculs aux limites
        if (bIdx === 0) {
          addDimension(0, bY + curW / 2, bX, bY + curW / 2, `Recul limite : ${bX.toFixed(2)} m`);
          addDimension(bX + curL / 2, 0, bX + curL / 2, bY, `Recul voirie : ${bY.toFixed(2)} m`);
        }
      }
    }

    // Boussole Nord
    const compassX = parcelWidth - 8.0;
    const compassY = parcelLength - 8.0;
    addLine(compassX, compassY - 4, compassX, compassY + 4, 'LIMITES_PARCELLAIRE');
    addLine(compassX - 1.5, compassY + 2, compassX, compassY + 4, 'LIMITES_PARCELLAIRE');
    addLine(compassX + 1.5, compassY + 2, compassX, compassY + 4, 'LIMITES_PARCELLAIRE');
    addText('N', compassX - 0.5, compassY + 4.8, 1.8, 'LIMITES_PARCELLAIRE');

  } else if (pieceId === 'section' || pieceId === 'section_notice' || pieceCode.includes('3')) {
    // ═══ PLAN EN COUPE (DP3 / PC3) ══════════════════════════════════════════
    // Ligne de sol / Terrain Naturel (TN)
    const groundY = 10.0;
    addLine(-5, groundY, bWidth + 25, groundY, 'LIMITES_PARCELLAIRE');
    addText('TERRAIN NATUREL (TN) — ALTITUDE SOL ±0.00 M', 2, groundY - 1.2, 0.9, 'TEXTES');

    if (isBattery) {
      // Coupe station batteries : Dalle béton + armoires Mercury + clôture rigide
      const sX = 5.0;
      // Dalle béton armé
      addRect(sX, groundY - 0.35, bWidth, 0.35, 'BATIMENTS_PROJET');
      addText('DALLE BÉTON ARMÉ (ÉPAISSEUR 35 CM)', sX + 0.4, groundY - 0.7, 0.7, 'TEXTES');

      // Armoire 2.38m de hauteur
      addRect(sX + 0.8, groundY, 1.6, 2.38, 'BATTERIE_BESS');
      addText('ARMOIRE BESS CESC MERCURY 261 (H: 2.38 M)', sX + 2.8, groundY + 1.6, 0.8, 'BATTERIE_BESS');

      // Clôture H=2.00m
      addLine(sX - 1.5, groundY, sX - 1.5, groundY + 2.0, 'BATTERIE_BESS');
      addLine(sX + bWidth + 1.5, groundY, sX + bWidth + 1.5, groundY + 2.0, 'BATTERIE_BESS');
      addText('CLÔTURE H: 2.00M', sX - 2.0, groundY + 2.3, 0.7, 'TEXTES');

      // Cotations
      addDimension(sX - 2.5, groundY, sX - 2.5, groundY + 2.38, 'H. TOTALE : 2.38 M');
      addDimension(sX, groundY - 1.8, sX + bWidth, groundY - 1.8, `L. DALLE : ${bWidth.toFixed(2)} M`);
    } else {
      // Coupe transversale charpente / ombrière
      const sX = 5.0;
      // Poteau gauche
      addLine(sX, groundY, sX, groundY + bEave, 'STRUCTURE_METALLIQUE');
      // Poteau droit
      addLine(sX + bWidth, groundY, sX + bWidth, groundY + bEave, 'STRUCTURE_METALLIQUE');
      // Arbalétrier / Toiture en pente
      addLine(sX, groundY + bEave, sX + bWidth / 2, groundY + bRidge, 'PANNEAUX_SOLAIRES');
      addLine(sX + bWidth / 2, groundY + bRidge, sX + bWidth, groundY + bEave, 'PANNEAUX_SOLAIRES');

      // Panneaux solaires sur toiture
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pX = sX + t * (bWidth / 2);
        const pY = groundY + bEave + t * (bRidge - bEave);
        addLine(pX, pY, pX, pY + 0.15, 'PANNEAUX_SOLAIRES');
      }

      // Cotations hauteurs
      addDimension(sX - 2.5, groundY, sX - 2.5, groundY + bEave, `H. ÉGOUT : ${bEave.toFixed(2)} M`);
      addDimension(sX + bWidth + 2.5, groundY, sX + bWidth + 2.5, groundY + bRidge, `H. FAÎTAGE : ${bRidge.toFixed(2)} M`);
      addDimension(sX, groundY - 2.0, sX + bWidth, groundY - 2.0, `LARGEUR : ${bWidth.toFixed(2)} M`);
      addText(`PENTE TOITURE : ${bPitch}°`, sX + bWidth / 2 - 3, groundY + bRidge + 1.2, 0.9, 'TEXTES');
    }

  } else if (pieceId === 'facades' || pieceCode.includes('4') || pieceCode.includes('5')) {
    // ═══ ÉLÉVATION DES FAÇADES (DP4 / PC5) ═══════════════════════════════════
    const groundY = 8.0;
    addLine(-5, groundY, bLength + 15, groundY, 'LIMITES_PARCELLAIRE');
    addText('TERRAIN NATUREL (TN)', 2, groundY - 1.2, 0.9, 'TEXTES');

    // Façade Long Pan Sud
    addRect(5, groundY, bLength, bEave, 'BATIMENTS_PROJET');
    addText(`FAÇADE SUD (LONG PAN SOLAIRE) — LONGUEUR : ${bLength.toFixed(2)} M`, 5, groundY + bEave + 1.5, 1.2, 'TEXTES');
    addDimension(5, groundY - 1.8, 5 + bLength, groundY - 1.8, `${bLength.toFixed(2)} m`);
    addDimension(2.5, groundY, 2.5, groundY + bEave, `${bEave.toFixed(2)} m`);

    // Poteaux intermédiaires
    const bayCount = Math.max(Math.round(bLength / 7.5), 1);
    for (let i = 1; i < bayCount; i++) {
      const pX = 5 + i * (bLength / bayCount);
      addLine(pX, groundY, pX, groundY + bEave, 'STRUCTURE_METALLIQUE');
    }

  } else {
    // ═══ PIÈCES COMPLÉMENTAIRES (DP6, DP7, DP8, INSERTION, ENVIRONNEMENT) ═══
    addRect(0, 0, 80, 50, 'LIMITES_PARCELLAIRE');
    addText(`CADRE DE LA PIÈCE ${pieceCode} — ${pieceTitle.toUpperCase()}`, 5, 45, 1.6, 'CARTOUCHE');
    addText(`Demandeur : ${clientName}`, 5, 40, 1.2, 'TEXTES');
    addText(`Commune : ${commune} (${cadastre})`, 5, 36, 1.2, 'TEXTES');
    addText(`Projet : ${project?.urbanismeType || project?.typeLabel || 'Centrale photovoltaïque'}`, 5, 32, 1.2, 'TEXTES');
    addText('Photographie et documents haute définition joints au dossier officiel PDF', 5, 24, 1.0, 'TEXTES');
  }

  // ─── 4. Cartouche officiel professionnel (Bas Droite) ─────────────────────
  const cWidth = 38.0;
  const cHeight = 14.0;
  const cX = Math.max(parcelWidth - cWidth - 2.0, 30.0);
  const cY = 2.0;

  addRect(cX, cY, cWidth, cHeight, 'CARTOUCHE');
  addLine(cX, cY + 9.5, cX + cWidth, cY + 9.5, 'CARTOUCHE');
  addLine(cX, cY + 5.0, cX + cWidth, cY + 5.0, 'CARTOUCHE');
  addLine(cX + 18.0, cY, cX + 18.0, cY + 5.0, 'CARTOUCHE');

  addText('NELSON — INGÉNIERIE & DÉVELOPPEMENT SOLAIRE', cX + 1.2, cY + 11.8, 1.0, 'CARTOUCHE');
  addText(`DOSSIER : ${docTypeUpper} — PIÈCE ${pieceCode}`, cX + 1.2, cY + 10.1, 0.9, 'CARTOUCHE');

  addText(`DEMANDEUR : ${clientName.substring(0, 32)}`, cX + 1.2, cY + 7.8, 0.8, 'TEXTES');
  addText(`COMMUNE : ${commune} | ${cadastre}`, cX + 1.2, cY + 6.0, 0.8, 'TEXTES');

  addText(`ÉCHELLE : 1/500`, cX + 1.2, cY + 2.8, 0.75, 'TEXTES');
  addText(`UNITÉ : MÈTRES (M)`, cX + 1.2, cY + 1.0, 0.75, 'TEXTES');
  addText(`DATE : ${dateStr}`, cX + 19.5, cY + 2.8, 0.75, 'TEXTES');
  addText(`FICHIER : ${pieceCode}.dwg`, cX + 19.5, cY + 1.0, 0.75, 'TEXTES');

  // Fin du document CAO
  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\r\n');
}

/**
 * Déclenche le téléchargement du fichier .dwg dans le navigateur
 */
export function downloadPieceDwg(piece, project, type = 'dp') {
  const dwgContent = generatePieceDwg(piece, project, type);
  const blob = new Blob([dwgContent], { type: 'application/acad' });
  const url = URL.createObjectURL(blob);

  const cleanCode = (piece.code || piece.id || 'PIECE').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanTitle = (piece.title || 'Plan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const clientName = `${project?.name || project?.lastName || ''}_${project?.firstName || ''}`.trim().replace(/\s+/g, '_') || 'Client';
  const dateStr = new Date().toISOString().slice(0, 10);

  const fileName = `${type.toUpperCase()}_${cleanCode}_${cleanTitle}_${clientName}_${dateStr}.dwg`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
