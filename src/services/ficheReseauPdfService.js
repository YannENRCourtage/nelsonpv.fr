/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FICHE D'ÉTUDE DE RACCORDEMENT & COMPARATIF D'ARCHITECTURE (PDF 1 PAGE A4)
 * Bureau d'études ENR & AMO Raccordement — NELSON / SAS ENR COURTAGE
 * Ton : 100 % neutre, factuel, bienveillant et technique (aucun parti pris)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';

/**
 * Formatage numérique strict avec espace ASCII standard (U+0020).
 * Évite le bug jsPDF où le caractère narrow no-break space de toLocaleString est rendu par "/".
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
 * Génère la Fiche d'Étude de Raccordement & Comparatif d'Architecture Réseau (A4 Portrait, 1 page)
 */
export async function generateFicheReseauPdf({
  project = {},
  projectCoords = [48.5907, 0.1905],
  nearestSubstation = null,
  nearestHtaLine = null,
  distToHtaMeters = 25,
  isInsideCorridor = true,
  bessPowerKw = 800,
  bessMode = 'soutirage',
  costEstimation = {}
}) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186 mm

  // Helper de dessin de cadre avec bordure et fond
  const drawCard = (x, y, w, h, bgColor = [255, 255, 255], borderColor = [226, 232, 240], radius = 2) => {
    doc.setFillColor(...bgColor);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, radius, radius, 'FD');
  };

  // Données calculées de raccordement
  const projectName = project?.name || 'Site d’étude';
  const projectCity = project?.city || project?.commune || 'Localisation étudiée';
  const coordsStr = `${projectCoords[0].toFixed(5)}, ${projectCoords[1].toFixed(5)}`;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const targetPowerKva = bessPowerKw;
  const targetPowerMw = bessPowerKw / 1000;
  const targetPowerStr = targetPowerKva >= 1000 
    ? `${formatNum(targetPowerMw, 1)} MW (${formatNum(targetPowerKva)} kVA)`
    : `${formatNum(targetPowerKva)} kVA (${formatNum(targetPowerMw, 2)} MW)`;

  // Capacités Poste Source RTE
  const subName = nearestSubstation?.name || 'Poste Source de secteur';
  const subTerritory = nearestSubstation?.territory_name || 'Réseau public RTE / Enedis';
  const subDistKm = nearestSubstation ? (nearestSubstation.distanceMeters / 1000).toFixed(2) : '3.80';
  const subRealDistKm = (parseFloat(subDistKm) * 1.3).toFixed(2); // × 1.3 longueur électrique
  const subNa = parseFloat(nearestSubstation?.values?.INFO_NA) || 0;
  const subInjectionMw = subNa;
  const subInjectionKva = Math.round(subInjectionMw * 1000);
  const subSoutirageMw = subNa > 0 ? parseFloat(Math.max(4.9, subNa * 1.35).toFixed(1)) : 4.9;
  const subSoutirageKva = Math.round(subSoutirageMw * 1000);
  const subQueue = nearestSubstation?.values?.INFO_FAS3R || '0';
  const subQp = nearestSubstation?.values?.INFO_QP || '12,30 k€/MW';

  // Capacités Tronçon HTA le plus proche
  const lineDepart = nearestHtaLine?.depart || `${subName}_C101`;
  const isSouterrain = nearestHtaLine?.isSouterrain ?? true;
  const lineInjectionMw = nearestHtaLine?.injection ?? subInjectionMw;
  const lineInjectionKva = Math.round(lineInjectionMw * 1000);
  const lineSoutirageMw = nearestHtaLine?.soutirage ?? subSoutirageMw;
  const lineSoutirageKva = Math.round(lineSoutirageMw * 1000);

  // Vérification Faisabilité technique
  const isEligibleSoutirage = targetPowerKva <= lineSoutirageKva;
  const isEligibleInjection = targetPowerKva <= lineInjectionKva;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. EN-TÊTE OFFICIEL AVEC LOGO & TITRE
  // ═══════════════════════════════════════════════════════════════════════════
  let currentY = 10;

  // Logo EnR Courtage / Nelson
  try {
    if (ENR_COURTAGE_LOGO_BASE64) {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', marginX, currentY, 36, 10);
    }
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('ENR COURTAGE', marginX, currentY + 7);
  }

  // Badge En-tête Droit
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.roundedRect(pageWidth - marginX - 60, currentY, 60, 5.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('INGÉNIERIE HTA / BT — FACTUEL & NEUTRE', pageWidth - marginX - 30, currentY + 3.8, { align: 'center' });

  // Titre principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('FICHE D\'ÉTUDE DE RACCORDEMENT & COMPARATIF D\'ARCHITECTURE', marginX, currentY + 16.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cadrage des capacités réseau Enedis Open Data & Caparéseau RTE — Analyse objective de dimensionnement', marginX, currentY + 20.8);

  currentY += 23.5;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BANDEAU DE SYNTHÈSE DU PROJET ÉTUDIÉ
  // ═══════════════════════════════════════════════════════════════════════════
  const ribbonH = 14;
  drawCard(marginX, currentY, contentWidth, ribbonH, [248, 250, 252], [203, 213, 225], 2);

  const colW = contentWidth / 4;

  // Col 1 : Projet & Commune
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PROJET & EMPLACEMENT', marginX + 4, currentY + 4.5);
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(projectName, colW - 6)[0], marginX + 4, currentY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(projectCity, marginX + 4, currentY + 12);

  // Col 2 : Coordonnées GPS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('COORDONNÉES GPS', marginX + colW + 4, currentY + 4.5);
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(coordsStr, marginX + colW + 4, currentY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Réf. étude : NELSON-${new Date().getFullYear()}`, marginX + colW + 4, currentY + 12);

  // Col 3 : Puissance étudiée & Mode
  const modeLabel = bessMode === 'soutirage' 
    ? 'Soutirage seul (IRVE / Conso)' 
    : bessMode === 'injection' 
    ? 'Injection seule (Solaire PV)' 
    : 'BESS Stockage (Mixte)';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRANSFORMATEUR ÉTUDIÉ', marginX + colW * 2 + 4, currentY + 4.5);
  doc.setFontSize(8);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text(`${targetPowerKva} kVA`, marginX + colW * 2 + 4, currentY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(modeLabel, marginX + colW * 2 + 4, currentY + 12);

  // Col 4 : Date & Statut préliminaire
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE & STATUT RÉSEAU', marginX + colW * 3 + 4, currentY + 4.5);
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(isEligibleSoutirage ? '● Capacité Réseau Favorable' : '● Réseau Contraint', marginX + colW * 3 + 4, currentY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Établi le ${dateStr}`, marginX + colW * 3 + 4, currentY + 12);

  currentY += ribbonH + 4.5;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SECTION 1 : ÉTAT DES CAPACITÉS RÉSEAU (POSTE SOURCE RTE & TRONÇON HTA)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ÉTAT DES CAPACITÉS DU RÉSEAU PUBLIC (POSTE SOURCE RTE & TRONÇON HTA ENEDIS)', marginX, currentY + 2.5);

  currentY += 5;

  // Deux colonnes pour la Section 1 (Poste Source vs Tronçon HTA)
  const cardW = (contentWidth - 6) / 2; // 90 mm
  const card1H = 43;

  // --- Carte 1.A : Poste Source RTE ---
  drawCard(marginX, currentY, cardW, card1H, [255, 255, 255], [203, 213, 225], 2);

  // En-tête Carte Poste Source
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, cardW, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`⚡ Poste Source RTE : ${subName}`, marginX + 3.5, currentY + 4.5);

  let py = currentY + 10;
  const subRows = [
    { label: 'Distance vol d\'oiseau :', val: `${subDistKm} km` },
    { label: 'Longueur électrique estimée (× 1,3) :', val: `${subRealDistKm} km` },
    { label: 'Capacité Max Transfo (Soutirage) :', val: `${formatNum(subSoutirageKva)} kVA (${subSoutirageMw} MW)`, color: [2, 132, 199] },
    { label: 'Capacité Max Transfo (Injection) :', val: subInjectionMw > 0 ? `${formatNum(subInjectionKva)} kVA (${subInjectionMw} MW)` : '0 kVA (Saturé)', color: subInjectionMw > 0 ? [16, 185, 129] : [100, 116, 139] },
    { label: 'File d\'attente S3REnR :', val: `${subQueue} MW` },
    { label: 'Quote-part unitaire S3REnR :', val: subQp },
  ];

  subRows.forEach(row => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text(row.label, marginX + 3.5, py);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(row.color || [15, 23, 42]));
    doc.text(row.val, marginX + cardW - 3.5, py, { align: 'right' });
    py += 5;
  });

  // --- Carte 1.B : Tronçon HTA Enedis le plus proche ---
  const card2X = marginX + cardW + 6;
  drawCard(card2X, currentY, cardW, card1H, [255, 255, 255], [203, 213, 225], 2);

  // En-tête Carte Tronçon HTA
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(card2X, currentY, cardW, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`🔌 Tronçon HTA 20 kV : ${lineDepart}`, card2X + 3.5, currentY + 4.5);

  let py2 = currentY + 10;
  const lineRows = [
    { label: 'Distance au réseau HTA :', val: `${distToHtaMeters} m (${isInsideCorridor ? 'Corridor < 350 m OK' : 'Extension > 350 m'})` },
    { label: 'Type d\'ouvrage Enedis :', val: isSouterrain ? 'Liaison Souterraine HTA' : 'Ligne Aérienne HTA' },
    { label: 'Max Transfo Soutirage (Conso / IRVE) :', val: `${formatNum(lineSoutirageKva)} kVA (${lineSoutirageMw} MW)`, color: [2, 132, 199] },
    { label: 'Max Transfo Injection (Prod PV) :', val: lineInjectionMw > 0 ? `${formatNum(lineInjectionKva)} kVA (${lineInjectionMw} MW)` : '0 kVA (Saturé)', color: lineInjectionMw > 0 ? [16, 185, 129] : [100, 116, 139] },
    { label: 'Raccordement coupure d\'artère :', val: 'Éligible jusqu\'à 1 250 kVA' },
    { label: 'Départ direct Poste Source requis :', val: 'Uniquement si > 3 600 kVA' },
  ];

  lineRows.forEach(row => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text(row.label, card2X + 3.5, py2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(row.color || [15, 23, 42]));
    doc.text(row.val, card2X + cardW - 3.5, py2, { align: 'right' });
    py2 += 5;
  });

  currentY += card1H + 3.5;

  // --- Encadré Synthèse Faisabilité / Éligibilité ---
  const eligH = 11;
  const isOk = isEligibleSoutirage;
  drawCard(marginX, currentY, contentWidth, eligH, isOk ? [240, 253, 244] : [254, 242, 242], isOk ? [187, 247, 208] : [254, 202, 202], 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...(isOk ? [22, 101, 52] : [153, 27, 27]));
  doc.text(
    isOk 
      ? `✓ DIAGNOSTIC DE FAISABILITÉ : Poste HTA/BT ${targetPowerKva} kVA Éligible en soutirage sur le tronçon HTA existant`
      : `⚠ CONTRAINTE RÉSEAU : La puissance demandée (${targetPowerKva} kVA) excède la capacité du départ HTA local (${formatNum(lineSoutirageKva)} kVA)`,
    marginX + 4,
    currentY + 4.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    isOk
      ? `La marge disponible en soutirage sur le départ ${lineDepart} (${formatNum(lineSoutirageKva)} kVA / ${lineSoutirageMw} MW) permet le raccordement en coupure d'artère sans nécessiter de départ direct dédié depuis le poste source.`
      : `Un départ dédié depuis le Poste Source (${subName}) ou une optimisation de l'architecture d'alimentation avec batterie tampon est requis.`,
    marginX + 4,
    currentY + 8.5
  );

  currentY += eligH + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SECTION 2 : COMPARATIF TECHNIQUE ET ÉCONOMIQUE OBJECTIF DES 2 ARCHITECTURES
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. COMPARATIF OBJECTIF DES ARCHITECTURES DE RACCORDEMENT (HTA VS BASSE TENSION OPTIMISÉE)', marginX, currentY + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Comparaison factuelle et transparente des deux solutions envisageables selon les contraintes techniques et le calendrier de déploiement.', marginX, currentY + 6.8);

  currentY += 9.5;

  // Calculs budgétaires prévisionnels factuels
  // Architecture A : Raccordement HTA Dédié
  const liaisonHtaCost = costEstimation.costLiaison || Math.round(distToHtaMeters * 80);
  const celluleHtaCost = costEstimation.costCelluleEnedis || 20000;
  const posteTransfoCost = costEstimation.costPosteLivraison || 26000;
  // Quote-part S3REnR : 0 € en soutirage pur (art. L. 342-12)
  const qpCost = bessMode === 'soutirage' ? 0 : (costEstimation.costQuotePart || 0);
  const totalArchA = qpCost + liaisonHtaCost + celluleHtaCost + posteTransfoCost;

  // Architecture B : Optimisation BT C4 (≤ 250 kVA) + BESS
  const totalArchB_Enedis = 9000; // Fourchette standard 8 500 € – 9 500 € HT

  const archH = 100;

  // --- COLONNE ARCHITECTURE A (HTA DÉDIÉ) ---
  drawCard(marginX, currentY, cardW, archH, [248, 250, 252], [203, 213, 225], 2);

  // En-tête Architecture A
  doc.setFillColor(224, 242, 254); // Sky-100
  doc.roundedRect(marginX, currentY, cardW, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(3, 105, 161); // Sky-700
  doc.text('ARCHITECTURE A : Raccordement HTA Dédié', marginX + 3.5, currentY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(14, 116, 144);
  doc.text(`Poste privatif HTA/BT ${targetPowerKva} kVA (Norme NF C 13-100)`, marginX + 3.5, currentY + 7.2);

  let ay = currentY + 12;

  // A. Principe
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('Principe d\'intégration :', marginX + 3.5, ay);
  ay += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  const descA = 'Raccordement direct en coupure d\'artère sur la boucle 20 kV Enedis. Implantation d\'un poste préfabriqué privatif abritant cellules HTA, transfo abaisseur et tableau général basse tension (TGBT).';
  const splitA = doc.splitTextToSize(descA, cardW - 7);
  doc.text(splitA, marginX + 3.5, ay);
  ay += splitA.length * 2.8 + 2;

  // A. Avantages
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52); // Green
  doc.text('✓ Avantages techniques :', marginX + 3.5, ay);
  ay += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(51, 65, 85);
  const advA = [
    '• Puissance réseau directe élevée sans contrainte d\'écrêtage.',
    '• Répond aux fortes puissances de recharge simultanées (IRVE, bus).',
    '• Ouvrage dimensionné pour extensions futures de puissance.'
  ];
  advA.forEach(line => {
    doc.text(line, marginX + 3.5, ay);
    ay += 2.8;
  });
  ay += 1.5;

  // A. Points de vigilance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(194, 65, 12); // Amber-700
  doc.text('⚠ Points de vigilance & Contraintes :', marginX + 3.5, ay);
  ay += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(51, 65, 85);
  const vigA = [
    '• Emprise au sol nécessaire pour le poste (~15 à 20 m²) + accès Enedis 24/7.',
    '• Entretien et vérifications périodiques privatives (NF C 13-100).',
    '• Délais Enedis d\'instruction (PTF) et de travaux : 12 à 18 mois.'
  ];
  vigA.forEach(line => {
    doc.text(line, marginX + 3.5, ay);
    ay += 2.8;
  });
  ay += 2;

  // A. Budget indicatif
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX + 2.5, ay, cardW - 5, 23, 1.5, 1.5, 'F');
  let by = ay + 3.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BUDGET PRÉVISIONNEL INDICATIF (HT) :', marginX + 4.5, by);
  by += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.9);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Liaison souterraine HTA (${distToHtaMeters} m Enedis) :`, marginX + 4.5, by);
  doc.text(`${formatNum(liaisonHtaCost)} €`, marginX + cardW - 4.5, by, { align: 'right' });
  by += 2.9;
  doc.text('• Cellule comptage & raccordement HTA :', marginX + 4.5, by);
  doc.text(`${formatNum(celluleHtaCost)} €`, marginX + cardW - 4.5, by, { align: 'right' });
  by += 2.9;
  doc.text(`• Poste de transformation HTA/BT ${targetPowerKva} kVA :`, marginX + 4.5, by);
  doc.text(`${formatNum(posteTransfoCost)} €`, marginX + cardW - 4.5, by, { align: 'right' });
  by += 3.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(3, 105, 161);
  doc.text('Total indicatif Architecture A :', marginX + 4.5, by);
  doc.text(`~ ${formatNum(totalArchA)} € HT`, marginX + cardW - 4.5, by, { align: 'right' });

  // A. Délai
  ay += 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Délai moyen constaté :', marginX + 3.5, ay);
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('12 à 18 mois', marginX + cardW - 3.5, ay, { align: 'right' });


  // --- COLONNE ARCHITECTURE B (OPTIMISATION BT + BESS) ---
  drawCard(card2X, currentY, cardW, archH, [248, 250, 252], [203, 213, 225], 2);

  // En-tête Architecture B
  doc.setFillColor(220, 252, 231); // Emerald-100
  doc.roundedRect(card2X, currentY, cardW, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(22, 101, 52); // Emerald-700
  doc.text('ARCHITECTURE B : Basse Tension C4 + Batterie Tampon', card2X + 3.5, currentY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(21, 128, 61);
  doc.text('Raccordement BT ≤ 250 kVA + Stockage BESS / Ombrières PV', card2X + 3.5, currentY + 7.2);

  let by2 = currentY + 12;

  // B. Principe
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('Principe d\'intégration :', card2X + 3.5, by2);
  by2 += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  const descB = 'Maintien du raccordement en Basse Tension (Tarif C4, 400 V triphasé) couplé à une batterie tampon stationnaire (BESS) et/ou ombrières photovoltaïques pour absorber les appels de puissance de pointe.';
  const splitB = doc.splitTextToSize(descB, cardW - 7);
  doc.text(splitB, card2X + 3.5, by2);
  by2 += splitB.length * 2.8 + 2;

  // B. Avantages
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52);
  doc.text('✓ Avantages techniques :', card2X + 3.5, by2);
  by2 += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(51, 65, 85);
  const advB = [
    '• Maintien en domaine Basse Tension (aucun poste HTA privatif à acquérir).',
    '• Lissage actif des pointes de charge (écrêtage / réduction abonnement TURPE).',
    '• Déploiement rapide sur le site sans travaux lourds de voirie publique.',
    '• Synergie naturelle avec l\'énergie solaire autoproduite locale.'
  ];
  advB.forEach(line => {
    doc.text(line, card2X + 3.5, by2);
    by2 += 2.8;
  });
  by2 += 1.5;

  // B. Points de vigilance
  by2 += 1.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(194, 65, 12);
  doc.text('⚠ Points de vigilance & Contraintes :', card2X + 3.5, by2);
  by2 += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(51, 65, 85);
  const vigB = [
    '• Pilotage intelligent (EMS) requis pour coordonner charge et batterie.',
    '• Autonomie de pointe tributaire de la capacité utile du pack batterie.',
    '• Investissement matériel dans le pack batterie tampon.'
  ];
  vigB.forEach(line => {
    doc.text(line, card2X + 3.5, by2);
    by2 += 2.8;
  });
  by2 += 2;

  // B. Budget indicatif
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(card2X + 2.5, by2, cardW - 5, 23, 1.5, 1.5, 'F');
  let bby = by2 + 3.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BUDGET PRÉVISIONNEL INDICATIF (HT) :', card2X + 4.5, bby);
  bby += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.9);
  doc.setTextColor(71, 85, 105);
  doc.text('• Raccordement Enedis BT C4 (coffret comptage) :', card2X + 4.5, bby);
  doc.text('8 500 € – 9 500 €', card2X + cardW - 4.5, bby, { align: 'right' });
  bby += 2.9;
  doc.text('• Batterie tampon stationnaire (BESS) :', card2X + 4.5, bby);
  doc.text('Selon capacité kWh', card2X + cardW - 4.5, bby, { align: 'right' });
  bby += 2.9;
  doc.text('• Économie d\'infrastructure réseau HTA :', card2X + 4.5, bby);
  doc.text(`~ ${formatNum(totalArchA - totalArchB_Enedis)} € préservés`, card2X + cardW - 4.5, bby, { align: 'right' });
  bby += 3.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52);
  doc.text('Raccordement réseau Enedis BT :', card2X + 4.5, bby);
  doc.text('8 500 € – 9 500 € HT', card2X + cardW - 4.5, bby, { align: 'right' });

  // B. Délai
  by2 += 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Délai moyen constaté :', card2X + 3.5, by2);
  doc.setFontSize(7.2);
  doc.setTextColor(16, 185, 129);
  doc.text('3 à 6 mois', card2X + cardW - 3.5, by2, { align: 'right' });

  currentY += archH + 4;

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PIED DE PAGE TECHNIQUE & MENTIONS LÉGALES
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('SAS ENR COURTAGE — Plateforme NELSON (nelsonpv.fr) | AMO Raccordement Réseau Électrique & Bureau d\'études Énergies Renouvelables', marginX, currentY);

  currentY += 3.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  const disclaimer = 'Note méthodologique : Ce document constitue une étude technique préliminaire réalisée à partir des données ouvertes Enedis Open Data et RTE Caparéseau. Les budgets et délais indiqués sont fournis à titre indicatif et restent subordonnés à la délivrance de la Proposition Technique et Financière (PTF) officielle par le gestionnaire de réseau Enedis. Aucune garantie contractuelle ne saurait être déduite de ce document préparatoire.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, marginX, currentY);

  // Nom de fichier propre et professionnel
  const sanitizedProject = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `Fiche_Etude_Reseau_${sanitizedProject}_${targetPowerKva}kVA.pdf`;

  // Sauvegarde / Téléchargement direct
  doc.save(filename);
  return filename;
}
