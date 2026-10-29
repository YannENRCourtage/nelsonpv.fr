/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GÉNÉRATEUR DE RAPPORT PDF — PROPOSITION DE STOCKAGE BESS
 * Format A4 professionnel aux couleurs d'ENR COURTAGE & NELSON
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';

/**
 * Formatage numérique strict avec espace ASCII standard (U+0020).
 * Évite le bug jsPDF où le caractère narrow no-break space (U+202F)
 * de Intl / toLocaleString('fr-FR') est rendu par un slash "/".
 */
export function formatNum(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const n = Number(val);
  const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
}

/**
 * Formatage d'un nombre avec signe explicite (+ ou -), sans jamais produire "+-".
 */
export function formatSignedNum(val, decimals = 0, suffix = ' €') {
  if (val === null || val === undefined || isNaN(val)) return `0${suffix}`;
  const n = Number(val);
  const absFormatted = formatNum(Math.abs(n), decimals);
  if (n > 0) return `+${absFormatted}${suffix}`;
  if (n < 0) return `-${absFormatted}${suffix}`;
  return `0${suffix}`;
}

/**
 * Rendu vectoriel du graphique 24h : Profil de charge journalier type
 * (Sans batterie vs Avec batterie) avec écrêtage de pointe
 */
function drawDailyProfileChartPdf(doc, x, y, w, h, data = [], peakKw = 90, newPeakKw = 50) {
  // Cadre de fond
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  // Titre & Sous-titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('Courbe de charge journalière type', x + 4, y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`Écrêtage de pointe vers ${formatNum(newPeakKw, 1)} kW et recharge en Heures Creuses`, x + 4, y + 8.5);

  // Légende alignée à droite
  // Sans batterie (Gris)
  doc.setFillColor(148, 163, 184);
  doc.circle(x + w - 44, y + 4.5, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Sans batterie', x + w - 41, y + 5.5);

  // Avec batterie (Vert Émeraude)
  doc.setFillColor(16, 185, 129);
  doc.circle(x + w - 21, y + 4.5, 1.2, 'F');
  doc.setTextColor(16, 185, 129);
  doc.text('Avec batterie', x + w - 18, y + 5.5);

  // Zone de traçage
  const plotX = x + 14;
  const plotY = y + 11.5;
  const plotW = w - 20;
  const plotH = h - 17;

  // Échelle Y
  const maxKw = Math.max(100, Math.ceil((peakKw * 1.1) / 10) * 10);
  const steps = 4;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round((maxKw / steps) * s);
    const gy = plotY + plotH - (s / steps) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(`${val} kW`, plotX - 1.5, gy + 1, { align: 'right' });
  }

  // Axe X (heures : 00h à 24h par pas de 3h pour affichage pleine largeur)
  const hourTicks = [
    { label: '00h', frac: 0 },
    { label: '03h', frac: 0.125 },
    { label: '06h', frac: 0.25 },
    { label: '09h', frac: 0.375 },
    { label: '12h', frac: 0.5 },
    { label: '15h', frac: 0.625 },
    { label: '18h', frac: 0.75 },
    { label: '21h', frac: 0.875 },
    { label: '24h', frac: 1.0 }
  ];
  hourTicks.forEach(t => {
    const gx = plotX + t.frac * plotW;
    doc.text(t.label, gx, plotY + plotH + 3.8, { align: 'center' });
  });

  // Tracé de la courbe "Sans batterie" (Gris)
  if (data && data.length > 1) {
    const n = data.length;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    for (let i = 0; i < n - 1; i++) {
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - (data[i].consoAvant / maxKw) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - (data[i + 1].consoAvant / maxKw) * plotH;
      doc.line(x1, y1, x2, y2);
    }

    // Remplissage vert clair sous la courbe avec batterie
    doc.setFillColor(209, 250, 229);
    for (let i = 0; i < n - 1; i++) {
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - (data[i].consoApres / maxKw) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - (data[i + 1].consoApres / maxKw) * plotH;
      const baseGroundY = plotY + plotH;
      doc.triangle(x1, y1, x2, y2, x1, baseGroundY, 'F');
      doc.triangle(x2, y2, x2, baseGroundY, x1, baseGroundY, 'F');
    }

    // Ligne verte solide au-dessus
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.6);
    for (let i = 0; i < n - 1; i++) {
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - (data[i].consoApres / maxKw) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - (data[i + 1].consoApres / maxKw) * plotH;
      doc.line(x1, y1, x2, y2);
    }
  }

  // Ligne de plafond (Pointe écrêtée)
  const capY = plotY + plotH - (newPeakKw / maxKw) * plotH;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.3);
  doc.line(plotX, capY, plotX + plotW, capY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(16, 185, 129);
  doc.text(`Plafond : ${formatNum(newPeakKw, 1)} kW`, plotX + plotW - 1, capY - 1, { align: 'right' });
}

/**
 * Rendu vectoriel du graphique : Projection de Trésorerie Cumulée sur 20 ans
 */
function drawCashFlowChartPdf(doc, x, y, w, h, data = [], paybackYears = 8.5, safeIrr = 6.4, includeGrid = false) {
  // Cadre de fond
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  // Titre & Sous-titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('Projection de Trésorerie Cumulée & Amortissement', x + 4, y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`Amorti en ${paybackYears} ans · TRI Projet : ${safeIrr} % · Seuil de rentabilité atteint`, x + 4, y + 8.5);

  // Légende alignée à droite
  const legColor = includeGrid ? [16, 185, 129] : [37, 99, 235];
  doc.setFillColor(legColor[0], legColor[1], legColor[2]);
  doc.circle(x + w - 36, y + 4.5, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(legColor[0], legColor[1], legColor[2]);
  doc.text(includeGrid ? 'Avec raccordement' : 'Autonomie seule', x + w - 33, y + 5.5);

  // Zone de traçage
  const plotX = x + 16;
  const plotY = y + 11.5;
  const plotW = w - 22;
  const plotH = h - 17;

  // Calcul du min et max des valeurs
  let minVal = 0;
  let maxVal = 0;
  data.forEach(d => {
    const val = includeGrid && d.avecRaccordement !== null && d.avecRaccordement !== undefined
      ? d.avecRaccordement
      : d.autonomieSeule;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  });
  if (minVal === 0) minVal = -85000;
  if (maxVal <= 0) maxVal = 60000;
  minVal = Math.floor(minVal / 10000) * 10000;
  maxVal = Math.ceil((maxVal * 1.15) / 10000) * 10000;

  const totalRange = Math.max(10000, maxVal - minVal);
  const zeroFrac = (0 - minVal) / totalRange;
  const zeroY = plotY + plotH - zeroFrac * plotH;

  // Grille Y et labels
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);

  // Ligne de min
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.text(`${Math.round(minVal / 1000)}k€`, plotX - 1.5, plotY + plotH + 1, { align: 'right' });

  // Ligne de max
  doc.line(plotX, plotY, plotX + plotW, plotY);
  doc.text(`+${Math.round(maxVal / 1000)}k€`, plotX - 1.5, plotY + 1, { align: 'right' });

  // Ligne rouge 0 € (Seuil de rentabilité)
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.3);
  doc.line(plotX, zeroY, plotX + plotW, zeroY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(239, 68, 68);
  doc.text('0 € (Seuil de rentabilité)', plotX + 1, zeroY - 1);

  // Axe X (An 0 à An 20 par pas de 2 ans)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  for (let yr = 0; yr <= 20; yr += 2) {
    const gx = plotX + (yr / 20) * plotW;
    doc.text(`An ${yr}`, gx, plotY + plotH + 3.8, { align: 'center' });
  }

  // Tracé de la courbe
  if (data && data.length > 1) {
    const n = data.length;
    doc.setDrawColor(legColor[0], legColor[1], legColor[2]);
    doc.setLineWidth(0.7);

    for (let i = 0; i < n - 1; i++) {
      const v1 = includeGrid && data[i].avecRaccordement !== null && data[i].avecRaccordement !== undefined ? data[i].avecRaccordement : data[i].autonomieSeule;
      const v2 = includeGrid && data[i + 1].avecRaccordement !== null && data[i + 1].avecRaccordement !== undefined ? data[i + 1].avecRaccordement : data[i + 1].autonomieSeule;
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - ((v1 - minVal) / totalRange) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - ((v2 - minVal) / totalRange) * plotH;
      doc.line(x1, y1, x2, y2);
    }

    // Points circulaires
    doc.setFillColor(legColor[0], legColor[1], legColor[2]);
    for (let i = 0; i < n; i++) {
      const v = includeGrid && data[i].avecRaccordement !== null && data[i].avecRaccordement !== undefined ? data[i].avecRaccordement : data[i].autonomieSeule;
      const px = plotX + (i / (n - 1)) * plotW;
      const py = plotY + plotH - ((v - minVal) / totalRange) * plotH;
      doc.circle(px, py, 0.7, 'F');
    }

    // Point final Année 20 avec texte
    const lastVal = includeGrid && data[n - 1].avecRaccordement !== null && data[n - 1].avecRaccordement !== undefined ? data[n - 1].avecRaccordement : data[n - 1].autonomieSeule;
    const lastX = plotX + plotW;
    const lastY = plotY + plotH - ((lastVal - minVal) / totalRange) * plotH;
    doc.circle(lastX, lastY, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(legColor[0], legColor[1], legColor[2]);
    doc.text(formatSignedNum(lastVal, 0, ' €'), lastX - 1, lastY - 2, { align: 'right' });
  }
}

/**
 * Rendu vectoriel du chronogramme prévisionnel de déploiement
 * Adaptatif selon le mode raccordé (5-6 mois) ou non raccordé (6-8 semaines).
 * Sans coût, sans intervenants, sans géomètre/notaire, promesse de bail remplacée par validation devis.
 */
function drawChronogrammePdf(doc, x, y, w, h, includeGridConnection = false) {
  // Cadre extérieur
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('CHRONOGRAMME PRÉVISIONNEL DE DÉPLOIEMENT', x + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  const subtitle = includeGridConnection
    ? 'Planning d\'anticipation avec instruction Enedis en temps masqué · Délai global : ~5 à 6 mois'
    : 'Planning de déploiement derrière le compteur (aucun délai Enedis) · Délai global : ~6 à 8 semaines';
  doc.text(subtitle, x + 4, y + 8.2);

  // Badge Délai total
  const badgeColor = includeGridConnection ? [37, 99, 235] : [22, 101, 52];
  const badgeBg = includeGridConnection ? [239, 246, 255] : [240, 253, 244];
  const badgeBorder = includeGridConnection ? [191, 219, 254] : [187, 247, 208];

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(x + w - 46, y + 2.2, 42, 6.2, 1.5, 1.5, 'F');
  doc.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
  doc.roundedRect(x + w - 46, y + 2.2, 42, 6.2, 1.5, 1.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(includeGridConnection ? 'Délai total : ~5 à 6 mois' : 'Délai total : ~6 à 8 semaines', x + w - 25, y + 6.4, { align: 'center' });

  // Colonnes
  const colNameW = 76;
  const colStartX = x + colNameW;
  const totalColsW = w - colNameW - 4;
  const numCols = includeGridConnection ? 6 : 4;
  const colW = totalColsW / numCols;

  // Bandeau en-tête des colonnes
  const tableHeaderY = y + 10.2;
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 2, tableHeaderY, w - 4, 4.0, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Étape / Jalon opérationnel', x + 4, tableHeaderY + 2.8);

  const colLabels = includeGridConnection
    ? ['Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6']
    : ['Sem. 1-2 (M1)', 'Sem. 3-4 (M1)', 'Sem. 5-6 (M2)', 'Sem. 7-8 (M2)'];

  colLabels.forEach((lbl, cIdx) => {
    const cx = colStartX + cIdx * colW;
    doc.text(lbl, cx + colW / 2, tableHeaderY + 2.8, { align: 'center' });
  });

  // Définition des jalons opérationnels
  const steps = includeGridConnection
    ? [
        {
          name: '1. Validation devis & Dépôt dossier Enedis (PTF / CRAE)',
          startFrac: 0,
          endFrac: 1 / 6,
          label: 'M1',
          color: [37, 99, 235]
        },
        {
          name: '2. Instruction Enedis & Proposition Technique (PTF)',
          startFrac: 0.10,
          endFrac: 0.50,
          label: 'M1 à M3 (Instruction)',
          color: [245, 158, 11]
        },
        {
          name: '3. Commande & Approvisionnement batterie (temps masqué)',
          startFrac: 0.33,
          endFrac: 0.67,
          label: 'M2 à M4 (Fabrication)',
          color: [16, 185, 129]
        },
        {
          name: '4. Génie civil (Dalle), pose BESS & Raccordement Enedis',
          startFrac: 0.67,
          endFrac: 0.83,
          label: 'M4 à M5',
          color: [139, 92, 246]
        },
        {
          name: '5. Attestation Consuel & Mise en service réseau Enedis',
          startFrac: 0.83,
          endFrac: 1.0,
          label: 'M5 à M6',
          color: [6, 182, 212]
        }
      ]
    : [
        {
          name: '1. Validation devis & Lancement de commande',
          startFrac: 0,
          endFrac: 0.25,
          label: 'Sem. 1-2',
          color: [37, 99, 235]
        },
        {
          name: '2. Approvisionnement & Livraison de la batterie BESS',
          startFrac: 0.20,
          endFrac: 0.65,
          label: 'Sem. 2 à 5',
          color: [16, 185, 129]
        },
        {
          name: '3. Génie civil (Dalle béton) & Fixation de l\'armoire',
          startFrac: 0.55,
          endFrac: 0.82,
          label: 'Sem. 5-7',
          color: [245, 158, 11]
        },
        {
          name: '4. Raccordement TGBT intérieur & Intégration EMS',
          startFrac: 0.70,
          endFrac: 0.95,
          label: 'Sem. 6-8',
          color: [139, 92, 246]
        },
        {
          name: '5. Essais de fonctionnement & Mise en service site',
          startFrac: 0.88,
          endFrac: 1.0,
          label: 'Sem. 8',
          color: [6, 182, 212]
        }
      ];

  // Tracé des lignes et barres de planning compact
  const rowsStartY = tableHeaderY + 4.0;
  const rowHeight = Math.max(4.6, (h - 16) / steps.length);

  steps.forEach((step, sIdx) => {
    const ry = rowsStartY + sIdx * rowHeight;

    // Ligne séparatrice
    doc.setDrawColor(241, 245, 249);
    doc.line(x + 2, ry + rowHeight, x + w - 2, ry + rowHeight);

    // Lignes verticales de colonnes en fond
    for (let c = 0; c <= numCols; c++) {
      const vx = colStartX + c * colW;
      doc.setDrawColor(241, 245, 249);
      doc.line(vx, ry, vx, ry + rowHeight);
    }

    // Nom de l'étape
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(30, 41, 59);
    doc.text(step.name, x + 4, ry + rowHeight / 2 + 1);

    // Barre colorée
    const barX = colStartX + step.startFrac * totalColsW + 0.5;
    const barWidth = Math.max(8, (step.endFrac - step.startFrac) * totalColsW - 1);
    const barHeight = Math.min(3.2, rowHeight - 1.4);

    doc.setFillColor(step.color[0], step.color[1], step.color[2]);
    doc.roundedRect(barX, ry + (rowHeight - barHeight) / 2, barWidth, barHeight, 0.8, 0.8, 'F');

    // Label sur la barre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(255, 255, 255);
    doc.text(step.label, barX + barWidth / 2, ry + rowHeight / 2 + 0.9, { align: 'center' });
  });
}

export function generateSafraProposalPdf({
  simResult,
  prm = '',
  titulaire = '',
  adresse = '',
  consoAnnuelleKwh = 211781,
  consoJourMoyKwh = 578.6,
  peakKw = 90.0,
  today = ''
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    model,
    quantity,
    pricingMode = 'TURNKEY',
    totalCapacityKwh,
    totalPowerKw,
    hardwareCapex,
    installCapex,
    connectionCapex,
    totalCapexHt,
    annualBillSavings,
    arbitrageSavingsYear,
    peakShavingSavingsYear,
    peakShavedKw,
    newPeakKw,
    baseAutonomyPercent,
    totalAutonomyPercent,
    includeGridConnection,
    gridFeasibility,
    gridAnnualRevenues,
    annualEbitdaHt,
    safePayback,
    safeIrr,
    netGain20YearsHt,
    netGain15YearsHt,
    netGain12YearsHt,
    cumulativeCashFlowChartData,
    dailyProfileChartData
  } = simResult;

  const dateStr = today || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── DÉCOMPOSITION DU TITULAIRE DU COMPTEUR ──
  let companyName = titulaire || 'Client Professionnel';
  let contactName = '';

  if (titulaire.includes('(') && titulaire.includes(')')) {
    const match = titulaire.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      companyName = match[1].trim();
      contactName = match[2].trim();
    }
  } else if (titulaire.toLowerCase().includes('latournerie')) {
    companyName = 'EARL DES TERRES VIEILLES';
    contactName = 'LATOURNERIE Franck';
  }

  // Remplacement de VALEUIL par BRANTOME EN PERIGORD
  const cleanAddress = (adresse || 'Lieu-dit Terres Vieilles, 24310 BRANTOME EN PERIGORD')
    .replace(/VALEUIL/gi, 'BRANTOME EN PERIGORD');

  // Nom nettoyé du modèle (sans mention de marque tierce non souhaitée ni Liquid Cooling)
  const cleanModelName = (model?.name || 'Armoire ESS 261 AC')
    .replace(/SAFRA\s*/gi, '')
    .replace(/\s*\(Liquid Cooling\)/gi, '')
    .replace(/\s*Liquid Cooling/gi, '')
    .trim();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : PROPOSITION COMMERCIALE & DIMENSIONNEMENT TECHNIQUE
  // ═══════════════════════════════════════════════════════════════════════════

  // Logo ENR Courtage / Nelson (gauche)
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', 14, 10, 45, 11);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('NELSON', 14, 18);
    }
  }

  // Date d'édition et document confidentiel en haut à droite
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le ${dateStr}`, 196, 14, { align: 'right' });
  doc.text('Document confidentiel', 196, 19, { align: 'right' });

  // Titre principal du dossier
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('PROPOSITION DE STOCKAGE INTELLIGENT BESS', 14, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text('Étude Technico-Économique & Simulation de Rentabilité BESS', 14, 32.5);

  // ── CADRE 1 : INFORMATIONS CLIENT & PROFIL ENEDIS ──
  // Hauteur réduite avec adresse sur une seule ligne
  const c1Y = 36;
  const c1H = 22;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, c1Y, 182, c1H, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, c1Y, 182, c1H, 2.5, 2.5, 'D');

  // En-têtes de colonnes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TITULAIRE DU COMPTEUR', 18, c1Y + 4.8);
  doc.text('POINT DE MESURE (PRM)', 95, c1Y + 4.8);
  doc.text('DONNÉES ENEDIS DATA CONNECT', 145, c1Y + 4.8);

  // Colonne 1 : Titulaire sur 2 lignes (Société puis Contact) + Adresse sur 1 seule ligne
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName, 18, c1Y + 9.5, { maxWidth: 74 });

  if (contactName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(contactName, 18, c1Y + 14, { maxWidth: 74 });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(cleanAddress, 18, contactName ? c1Y + 18.5 : c1Y + 15, { maxWidth: 74 });

  // Colonne 2 : PRM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(37, 99, 235);
  doc.text(String(prm || '50009371514981'), 95, c1Y + 10.5);

  // Colonne 3 : Données Enedis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatNum(consoAnnuelleKwh)} kWh / an`, 145, c1Y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Moyenne : ${formatNum(consoJourMoyKwh, 1)} kWh/j · Pic : ${formatNum(peakKw, 1)} kW`, 145, c1Y + 15);

  // ── CADRE 2 : SOLUTION RETENUE BESS ──
  const c2Y = c1Y + c1H + 3.5; // 61.5
  const c2H = 32;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, c2Y, 182, c2H, 2.5, 2.5, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, c2Y, 182, c2H, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(37, 99, 235);
  doc.text('SOLUTION DE STOCKAGE RECOMMANDÉE & CONFIGURÉE', 18, c2Y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${quantity}× ${cleanModelName}`, 18, c2Y + 11.5);

  // 4 Badges de specs techniques sur UNE SEULE LIGNE (largeur 41.5mm chacun, espacement 2.5mm)
  const bW = 41.5;
  const bH = 13.5;
  const bY = c2Y + 14.5;

  // Badge 1 : Capacité (Bleu)
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(18, bY, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CAPACITÉ TOTALE', 21, bY + 4.5);
  doc.setFontSize(9.5);
  doc.text(`${formatNum(totalCapacityKwh, 1)} kWh`, 21, bY + 10.5);

  // Badge 2 : Puissance (Vert)
  const b2X = 18 + bW + 2.5; // 62
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(b2X, bY, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PUISSANCE NOMINALE', b2X + 3, bY + 4.5);
  doc.setFontSize(9.5);
  doc.text(`${formatNum(totalPowerKw, 0)} kW`, b2X + 3, bY + 10.5);

  // Badge 3 : Autonomie (Orange)
  const b3X = b2X + bW + 2.5; // 106
  doc.setFillColor(249, 115, 22);
  doc.roundedRect(b3X, bY, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('AUTONOMIE ATTEINTE', b3X + 3, bY + 4.5);
  doc.setFontSize(9.5);
  doc.text(`${formatNum(totalAutonomyPercent, 0)} %`, b3X + 3, bY + 10.5);

  // Badge 4 : TECHNOLOGIE (Violet / Indigo)
  const b4X = b3X + bW + 2.5; // 150
  doc.setFillColor(109, 40, 217);
  doc.roundedRect(b4X, bY, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TECHNOLOGIE', b4X + 3, bY + 4.5);
  doc.setFontSize(5.2);
  doc.text('LFP (Lithium-Fer-Phosphate)', b4X + 3, bY + 8.2);
  doc.text('à refroidissement liquide.', b4X + 3, bY + 11.5);

  // ── 5 CARTES KPI FINANCIÈRES (AVEC TRI PROJET SORTI DANS UN CADRE DÉDIÉ) ──
  const kpiY = c2Y + c2H + 3.5; // 97
  const kpiW = 34.4;
  const kpiH = 20;

  // KPI 1 : Économies Facture
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(22, 101, 52);
  doc.text('ÉCONOMIES FACTURE', 16.5, kpiY + 4.8);
  doc.setFontSize(9.5);
  doc.text(`${formatNum(annualBillSavings)} €/an`, 16.5, kpiY + 11);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('HP/HC + Écrêtage', 16.5, kpiY + 16);

  // KPI 2 : Revenus Réseau
  const kpi2X = 14 + kpiW + 2.5; // 50.9
  if (includeGridConnection) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(kpi2X, kpiY, kpiW, kpiH, 2, 2, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(kpi2X, kpiY, kpiW, kpiH, 2, 2, 'D');
    doc.setTextColor(30, 64, 175);
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(kpi2X, kpiY, kpiW, kpiH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kpi2X, kpiY, kpiW, kpiH, 2, 2, 'D');
    doc.setTextColor(100, 116, 139);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.text('REVENUS RÉSEAU', kpi2X + 2.5, kpiY + 4.8);
  doc.setFontSize(9.5);
  doc.text(includeGridConnection ? `${formatNum(gridAnnualRevenues)} €/an` : '0 € HT/an', kpi2X + 2.5, kpiY + 11);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(includeGridConnection ? 'Services Système' : 'Autonomie seule', kpi2X + 2.5, kpiY + 16);

  // KPI 3 : Investissement Total (CAPEX)
  const kpi3X = kpi2X + kpiW + 2.5; // 87.8
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi3X, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(kpi3X, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('INVESTISSEMENT TOTAL', kpi3X + 2.5, kpiY + 4.8);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatNum(totalCapexHt)} € HT`, kpi3X + 2.5, kpiY + 11);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(pricingMode === 'HARDWARE_ONLY' ? 'Matériel seul' : 'Clé en main posé', kpi3X + 2.5, kpiY + 16);

  // KPI 4 : Temps de retour
  const kpi4X = kpi3X + kpiW + 2.5; // 124.7
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(kpi4X, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(kpi4X, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(154, 52, 18);
  doc.text('TEMPS DE RETOUR', kpi4X + 2.5, kpiY + 4.8);
  doc.setFontSize(9.5);
  doc.text(`${safePayback} ans`, kpi4X + 2.5, kpiY + 11);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Amortissement brut', kpi4X + 2.5, kpiY + 16);

  // KPI 5 : TRI Projet (Cadre dédié avec couleur distincte violet)
  const kpi5X = kpi4X + kpiW + 2.5; // 161.6
  doc.setFillColor(245, 243, 255); // Fond violet très clair
  doc.roundedRect(kpi5X, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(kpi5X, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(109, 40, 217); // Texte violet soutenu
  doc.text('TRI PROJET', kpi5X + 2.5, kpiY + 4.8);
  doc.setFontSize(9.5);
  doc.text(`${safeIrr} %`, kpi5X + 2.5, kpiY + 11);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Rentabilité brute', kpi5X + 2.5, kpiY + 16);

  // ── CADRE 3 : DÉCOMPOSITION TECHNIQUE DES GAINS SUR FACTURE ──
  const table1TitleY = kpiY + kpiH + 4.5; // 121.5
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Détail des Économies Annuelles Réalisées', 14, table1TitleY);

  autoTable(doc, {
    startY: table1TitleY + 2.5,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.9,
      textColor: [30, 41, 59]
    },
    head: [['Poste d\'optimisation', 'Principe de fonctionnement', 'Impact physique', 'Gain estimé (€ HT/an)']],
    body: [
      [
        'Écrêtage de pointe',
        'Effacement automatique lors des dépassements et pics tarifaires TURPE',
        `Pointe abaissée de ${formatNum(peakKw, 1)} kW à ${formatNum(newPeakKw, 1)} kW (-${formatNum(peakShavedKw, 1)} kW)`,
        `${formatNum(peakShavingSavingsYear)} € / an`
      ],
      [
        'Arbitrage Heures Pleines / Heures Creuses',
        'Recharge en Heures Creuses / Solaire et décharge intelligente en Heures Pleines',
        `${formatNum(Math.round(totalCapacityKwh * 0.90 * 300))} kWh stockés & restitués/an`,
        `${formatNum(arbitrageSavingsYear)} € / an`
      ],
      [
        'Gain d\'Autonomie & Sécurisation',
        'Augmentation de la part d\'énergie décarbonée et réduction de dépendance réseau',
        `Couverture du site portée de ${baseAutonomyPercent}% à ${totalAutonomyPercent}%`,
        'Inclus dans facture'
      ],
      [
        'TOTAL ÉCONOMIES DIRECTES FACTURE',
        'Gain net annuel récurrent sur la facture d\'électricité',
        'Effacement garanti par supervision EMS intelligente',
        `${formatNum(annualBillSavings)} € HT / an`
      ]
    ]
  });

  // ── CADRE 4 : STATUT DU RACCORDEMENT RÉSEAU ENEDIS ──
  const netY = doc.lastAutoTable.finalY + 3;
  const netH = 22;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, netY, 182, netH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, netY, 182, netH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STATUT DU RACCORDEMENT RÉSEAU ENEDIS', 18, netY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);

  if (!includeGridConnection) {
    doc.text('• Mode sélectionné : DERRIÈRE LE COMPTEUR (SANS RACCORDEMENT RÉSEAU SUPPLÉMENTAIRE).', 18, netY + 9);
    doc.text('• Coût de raccordement réseau Enedis = 0 € HT. Aucun délai administratif de raccordement.', 18, netY + 13);
    doc.text('• L\'énergie stockée est intégralement valorisée sur le site en autoconsommation et effacement de pointe.', 18, netY + 17);
    doc.text('• Optionnel : Un raccordement réseau ultérieur peut être activé pour valoriser l\'injection sur les marchés.', 18, netY + 21);
  } else {
    const domainLabel = gridFeasibility.voltageDomain === 'BT_C4' ? 'Basse Tension BT C4 <= 250 kW' : 'Haute Tension HTA 20 kV > 250 kW';
    const cleanBadgeText = (gridFeasibility.badge || '').replace(/[^\w\s\dÀ-ÿ,.:;()/'"+=-]/g, '').trim();
    doc.text(`• Mode sélectionné : AVEC RACCORDEMENT RÉSEAU (${domainLabel}).`, 18, netY + 9);
    doc.text(`• Statut technique : ${cleanBadgeText} · Budget raccordement estimé : ${formatNum(connectionCapex)} € HT.`, 18, netY + 13);
    doc.text(`• Revenus de marché prévisionnels (FCR, Réserve rapide, Capacité RTE) : +${formatNum(gridAnnualRevenues)} € HT / an.`, 18, netY + 17);
    const alertMsg = (gridFeasibility.warningMessage || gridFeasibility.errorMessage || '').replace(/[^\w\s\dÀ-ÿ,.:;()/'"+=-]/g, '').trim();
    if (alertMsg) {
      doc.setTextColor(220, 38, 38);
      doc.text(alertMsg, 18, netY + 21, { maxWidth: 174 });
    }
  }

  // ── CADRE 5 : DÉTAIL DU MODÈLE ÉCONOMIQUE (REVENUS, CAPEX & OPEX) ──
  // Hauteur légèrement réduite (72 mm) pour rester confortablement au-dessus de la pagination sur la Page 1
  const detailY = netY + netH + 2.5;
  const cardH = 72;
  const colW = 57;
  const subCardH = cardH - 9; // 63mm

  // Calcul des détails financiers
  const fcrRevenuesYear = Math.round(totalPowerKw * 45);
  const capacityRevenuesYear = Math.round(totalPowerKw * 20);
  const spotArbitrageYear = Math.round(totalPowerKw * 15);

  const annualOpexMaintenance = Math.round(hardwareCapex * 0.012);
  const annualOpexSupervision = 200;
  const annualOpexAssurance = Math.round(hardwareCapex * 0.003);
  const totalAnnualOpex = annualOpexMaintenance + annualOpexSupervision + annualOpexAssurance;

  // Grand Cadre englobant Page 1
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, detailY, 182, cardH, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, detailY, 182, cardH, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    includeGridConnection
      ? 'DÉTAIL DU MODÈLE ÉCONOMIQUE RÉSEAU : REVENUS, CAPEX & OPEX'
      : 'DÉTAIL DU MODÈLE ÉCONOMIQUE DERRIÈRE LE COMPTEUR : REVENUS, CAPEX & OPEX',
    18,
    detailY + 4.8
  );

  // ── COLONNE 1 : DÉTAIL DES REVENUS / ÉCONOMIES ──
  const c1X = 17.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(c1X, detailY + 6.8, colW - 1, subCardH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c1X, detailY + 6.8, colW - 1, subCardH, 2, 2, 'D');

  // En-tête bandeau colonne 1
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(c1X + 1.5, detailY + 8.0, colW - 4, 5.8, 1.2, 1.2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(c1X + 1.5, detailY + 8.0, colW - 4, 5.8, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(22, 101, 52);
  doc.text(
    includeGridConnection ? '1. REVENUS RÉSEAU ANNUELS' : '1. ÉCONOMIES FACTURE',
    c1X + 3.5,
    detailY + 12.0
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);

  if (includeGridConnection) {
    doc.text('• Réserve rapide FCR/aFRR :', c1X + 3.5, detailY + 17.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`+${formatNum(fcrRevenuesYear)} € HT/an`, c1X + 3.5, detailY + 21.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('• Garantie Capacité RTE :', c1X + 3.5, detailY + 26.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`+${formatNum(capacityRevenuesYear)} € HT/an`, c1X + 3.5, detailY + 30.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('• Arbitrage marché Spot :', c1X + 3.5, detailY + 35.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`+${formatNum(spotArbitrageYear)} € HT/an`, c1X + 3.5, detailY + 39.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('• Net agrégateur (comm. 15% déduite).', c1X + 3.5, detailY + 45.0);
    doc.text('• Injection bi-directionnelle HTA.', c1X + 3.5, detailY + 48.8);
  } else {
    doc.text('• Écrêtage pointes TURPE :', c1X + 3.5, detailY + 17.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`+${formatNum(peakShavingSavingsYear)} € HT/an`, c1X + 3.5, detailY + 21.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('• Arbitrage Heures Pleines/Creuses :', c1X + 3.5, detailY + 26.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`+${formatNum(arbitrageSavingsYear)} € HT/an`, c1X + 3.5, detailY + 30.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('• Taux d\'autonomie atteint :', c1X + 3.5, detailY + 35.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`${totalAutonomyPercent} % (gain net +${totalAutonomyPercent - baseAutonomyPercent}%)`, c1X + 3.5, detailY + 39.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('• Réduction dépendance & sécurisation.', c1X + 3.5, detailY + 45.0);
    doc.text('• Valorisation 100% sur le site.', c1X + 3.5, detailY + 48.8);
  }

  // Cartouche total bas colonne 1
  const totY1 = detailY + subCardH - 8.8;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(c1X + 2, totY1, colW - 5, 7.2, 1.2, 1.2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(c1X + 2, totY1, colW - 5, 7.2, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52);
  doc.text(
    includeGridConnection ? `Total : +${formatNum(gridAnnualRevenues)} € HT/an` : `Total : +${formatNum(annualBillSavings)} € HT/an`,
    c1X + colW / 2 - 1,
    totY1 + 4.8,
    { align: 'center' }
  );

  // ── COLONNE 2 : DÉTAIL DU CAPEX ──
  const c2X = c1X + colW + 1.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(c2X, detailY + 6.8, colW - 1, subCardH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c2X, detailY + 6.8, colW - 1, subCardH, 2, 2, 'D');

  // En-tête bandeau colonne 2
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(c2X + 1.5, detailY + 8.0, colW - 4, 5.8, 1.2, 1.2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(c2X + 1.5, detailY + 8.0, colW - 4, 5.8, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 64, 175);
  doc.text('2. INVESTISSEMENT (CAPEX)', c2X + 3.5, detailY + 12.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);

  doc.text('• Matériel de stockage BESS :', c2X + 3.5, detailY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`${formatNum(hardwareCapex)} € HT`, c2X + 3.5, detailY + 21.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('• Pose, ingénierie & EMS :', c2X + 3.5, detailY + 26.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(pricingMode === 'HARDWARE_ONLY' ? '0 € HT (Fourniture pure)' : `${formatNum(installCapex)} € HT`, c2X + 3.5, detailY + 30.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('• Raccordement réseau Enedis :', c2X + 3.5, detailY + 35.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(
    includeGridConnection ? `${formatNum(connectionCapex)} € HT` : '0 € HT (Derrière compteur)',
    c2X + 3.5,
    detailY + 39.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (includeGridConnection) {
    if (gridFeasibility.voltageDomain === 'BT_C4') {
      doc.text('• Liaison BT C4 direct Enedis.', c2X + 3.5, detailY + 45.0);
      doc.text('• Exonéré de quote-part S3REnR.', c2X + 3.5, detailY + 48.8);
    } else {
      doc.text(`• Quote-part S3REnR ${formatNum(gridFeasibility.quotePartS3renrCost)} €`, c2X + 3.5, detailY + 45.0);
      doc.text('+ Cellule Enedis & Livraison HTA.', c2X + 3.5, detailY + 48.8);
    }
  } else {
    doc.text('• Raccordement TGBT client direct.', c2X + 3.5, detailY + 45.0);
    doc.text('• Aucun frais Enedis ni guichet.', c2X + 3.5, detailY + 48.8);
  }

  // Cartouche total bas colonne 2
  const totY2 = detailY + subCardH - 8.8;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(c2X + 2, totY2, colW - 5, 7.2, 1.2, 1.2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(c2X + 2, totY2, colW - 5, 7.2, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 64, 175);
  doc.text(`Total : ${formatNum(totalCapexHt)} € HT`, c2X + colW / 2 - 1, totY2 + 4.8, { align: 'center' });

  // ── COLONNE 3 : DÉTAIL DES OPEX ──
  const c3X = c2X + colW + 1.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(c3X, detailY + 6.8, colW - 1, subCardH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c3X, detailY + 6.8, colW - 1, subCardH, 2, 2, 'D');

  // En-tête bandeau colonne 3
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(c3X + 1.5, detailY + 8.0, colW - 4, 5.8, 1.2, 1.2, 'F');
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(c3X + 1.5, detailY + 8.0, colW - 4, 5.8, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(154, 52, 18);
  doc.text('3. CHARGES ANNUELLES (OPEX)', c3X + 3.5, detailY + 12.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);

  doc.text('• Maintenance préventive BESS :', c3X + 3.5, detailY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(154, 52, 18);
  doc.text(`${formatNum(annualOpexMaintenance)} € HT/an`, c3X + 3.5, detailY + 21.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('• Supervision EMS & Télémétrie :', c3X + 3.5, detailY + 26.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(154, 52, 18);
  doc.text(`${formatNum(annualOpexSupervision)} € HT/an`, c3X + 3.5, detailY + 30.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('• Assurance exploitation :', c3X + 3.5, detailY + 35.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(154, 52, 18);
  doc.text(`${formatNum(annualOpexAssurance)} € HT/an`, c3X + 3.5, detailY + 39.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('• Indexation énergie : +5.0 %/an.', c3X + 3.5, detailY + 45.0);
  doc.text('• Dégradation batterie : 1.0 %/an.', c3X + 3.5, detailY + 48.8);

  // Cartouche total bas colonne 3
  const totY3 = detailY + subCardH - 8.8;
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(c3X + 2, totY3, colW - 5, 7.2, 1.2, 1.2, 'F');
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(c3X + 2, totY3, colW - 5, 7.2, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(154, 52, 18);
  doc.text(`Total : -${formatNum(totalAnnualOpex)} € HT/an`, c3X + colW / 2 - 1, totY3 + 4.8, { align: 'center' });

  // Pied de page Page 1 (au-dessus duquel le cadre 5 est maintenant positionné en toute sécurité)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Page 1 / 2', 196, 287, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : BUSINESS PLAN SUR 20 ANS, GRAPHIQUES SUPERPOSÉS, TABLEAU AGRANDI & CHRONOGRAMME COMPACT
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('PLAN FINANCIER & SIMULATION ÉNERGÉTIQUE SUR 20 ANS', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Dégradation batterie 1.0 %/an · Inflation énergie 5.0 %/an · Dégressivité des coûts de pose appliquée', 14, 15);

  // ── LES 2 GRAPHIQUES SUPERPOSÉS PLEINE LARGEUR (HAUTEUR OPTIMISÉE À 39MM) ──
  // Graphique 1 : Courbe de charge 24h journalière type
  drawDailyProfileChartPdf(doc, 14, 17, 182, 39, dailyProfileChartData, peakKw, newPeakKw);

  // Graphique 2 : Projection de trésorerie cumulée sur 20 ans
  drawCashFlowChartPdf(doc, 14, 58, 182, 39, cumulativeCashFlowChartData, safePayback, safeIrr, includeGridConnection);

  // ── SYNTHÈSE DES GAINS CUMULÉS SUR 20 ANS ──
  const synthY = 99;
  const synthH = 16;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, synthY, 182, synthH, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, synthY, 182, synthH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(22, 101, 52);
  doc.text('BILAN RENTABILITÉ GLOBALE À 20 ANS', 18, synthY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text(`• Investissement initial Total (CAPEX) : ${formatNum(totalCapexHt)} € HT (dégressivité de pose incluse)`, 18, synthY + 8.2);
  doc.text(`• Temps de retour sur investissement : ${safePayback} ans (TRI Projet : ${safeIrr} %)`, 18, synthY + 11.6);
  doc.text(`• Gain net de trésorerie cumulé à 20 ans après amortissement total : ${formatSignedNum(netGain20YearsHt ?? netGain15YearsHt, 0, ' € HT')}`, 18, synthY + 14.8);

  // ── TABLEAU DE CASH-FLOW SUR 20 ANS (DONNÉES AGRANDIES & TRÈS LISIBLES) ──
  const tableData = [];
  tableData.push([
    'Année 0',
    `-${formatNum(totalCapexHt)} €`,
    '0 €',
    '0 €',
    `-${formatNum(totalCapexHt)} €`,
    `-${formatNum(totalCapexHt)} €`
  ]);

  for (let y = 1; y <= 20; y++) {
    const item = cumulativeCashFlowChartData[y] || {};
    const deg = Math.pow(1 - 0.01, y - 1); // 1.0% dégradation
    const energyInf = Math.pow(1 + 0.05, y - 1); // 5.0% inflation énergie
    const opexInf = Math.pow(1 + 0.02, y - 1);
    const billSav = Math.round(annualBillSavings * deg * energyInf);
    const gridRev = Math.round(gridAnnualRevenues * deg * Math.pow(1 + 0.02, y - 1));
    const opex = Math.round((hardwareCapex * 0.012) * opexInf);
    const netCash = billSav + gridRev - opex;

    const cumVal = (item.avecRaccordement !== null && item.avecRaccordement !== undefined)
      ? item.avecRaccordement
      : (item.autonomieSeule || 0);

    tableData.push([
      `Année ${y}`,
      `${formatNum(billSav)} €`,
      includeGridConnection ? `${formatNum(gridRev)} €` : '0 €',
      `-${formatNum(opex)} €`,
      formatSignedNum(netCash, 0, ' €'),
      formatSignedNum(cumVal, 0, ' €')
    ]);
  }

  const tableStartY = synthY + synthH + 2.5; // 117.5
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 1.2
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.6,
      cellPadding: 1.1,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { fontStyle: 'bold', halign: 'right' },
      5: { fontStyle: 'bold', halign: 'right' }
    },
    head: [['Période', 'Économies Facture', 'Revenus Réseau', 'Maintenance OPEX', 'Cash-Flow Net/an', 'Trésorerie Cumulée']],
    body: tableData
  });

  // ── CADRE CHRONOGRAMME PRÉVISIONNEL DE DÉPLOIEMENT (HAUTEUR RÉDUITE À 42MM EN BAS DE PAGE) ──
  const chronoY = doc.lastAutoTable.finalY + 2.5;
  const chronoH = 42;
  drawChronogrammePdf(doc, 14, chronoY, 182, chronoH, includeGridConnection);

  // Pied de page Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nelson / ENR Courtage · www.nelsonpv.fr · Solutions de Stockage Intelligent BESS', 14, 287);
  doc.text('Page 2 / 2', 196, 287, { align: 'right' });

  // Téléchargement automatique
  const cleanPrm = String(prm || 'PRM').replace(/[^a-zA-Z0-9]/g, '');
  const cleanRef = (model?.reference || 'BESS').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Proposition_BESS_${cleanPrm}_${cleanRef}.pdf`;
  doc.save(fileName);
  return fileName;
}
