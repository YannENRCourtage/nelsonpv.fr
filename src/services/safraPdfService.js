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
    netGain12YearsHt,
    cumulativeCashFlowChartData
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

  // Nom nettoyé du modèle (sans mention de marque tierce non souhaitée)
  const cleanModelName = (model?.name || 'Armoire ESS 261 AC (Liquid Cooling)')
    .replace(/SAFRA\s*/gi, '')
    .trim();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : PROPOSITION COMMERCIALE & DIMENSIONNEMENT TECHNIQUE
  // ═══════════════════════════════════════════════════════════════════════════

  // Barre supérieure bleue Nelson
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(0, 0, 210, 8, 'F');

  // Logo ENR Courtage / Nelson (gauche)
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', 14, 12, 45, 11);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('NELSON', 14, 20);
    }
  }

  // Badge BESS & Autonomie (droite) — aucune mention de Safra New Energy
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(140, 11, 56, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(140, 11, 56, 14, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(37, 99, 235);
  doc.text('STOCKAGE BESS', 144, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Solutions de Stockage BESS', 144, 22);

  // Titre principal du dossier
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('PROPOSITION DE STOCKAGE INTELLIGENT BESS', 14, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text('Étude Technico-Économique & Simulation de Rentabilité BESS', 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le ${dateStr} · Document confidentiel Nelson / ENR Courtage`, 14, 45);

  // ── CADRE 1 : INFORMATIONS CLIENT & PROFIL ENEDIS ──
  // Hauteur ajustée pour accueillir le titulaire sur 2 lignes distinctes
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 48, 182, 30, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 48, 182, 30, 3, 3, 'D');

  // En-têtes de colonnes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TITULAIRE DU COMPTEUR', 18, 54);
  doc.text('POINT DE MESURE (PRM)', 95, 54);
  doc.text('DONNÉES ENEDIS DATA CONNECT', 145, 54);

  // Colonne 1 : Titulaire sur 2 lignes (Société puis Contact) + Adresse
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName, 18, 60, { maxWidth: 74 });

  if (contactName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(contactName, 18, 65, { maxWidth: 74 });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(cleanAddress, 18, contactName ? 71 : 66.5, { maxWidth: 74 });

  // Colonne 2 : PRM (police Helvetica, même taille et graisse que le document)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(String(prm || '50009371514981'), 95, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Compteur communicant Linky', 95, 66);

  // Colonne 3 : Données Enedis (chiffres formatés sans slash "/")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatNum(consoAnnuelleKwh)} kWh / an`, 145, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Moyenne : ${formatNum(consoJourMoyKwh, 1)} kWh/j · Pic : ${formatNum(peakKw, 1)} kW`, 145, 66);

  // ── CADRE 2 : SOLUTION RETENUE BESS ──
  doc.setFillColor(239, 246, 255); // Fond bleu très clair
  doc.roundedRect(14, 82, 182, 38, 3, 3, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, 82, 182, 38, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text('SOLUTION DE STOCKAGE RECOMMANDÉE & CONFIGURÉE', 18, 88);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${quantity}× ${cleanModelName}`, 18, 95);

  // 3 Mini-badges de specs techniques
  // Badge Capacité
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(18, 100, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('CAPACITÉ TOTALE', 22, 105);
  doc.setFontSize(10.5);
  doc.text(`${formatNum(totalCapacityKwh, 1)} kWh`, 22, 111);

  // Badge Puissance
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(70, 100, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('PUISSANCE NOMINALE', 74, 105);
  doc.setFontSize(10.5);
  doc.text(`${formatNum(totalPowerKw, 0)} kW`, 74, 111);

  // Badge Autonomie
  doc.setFillColor(249, 115, 22);
  doc.roundedRect(122, 100, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('AUTONOMIE ATTEINTE', 126, 105);
  doc.setFontSize(10.5);
  doc.text(`${formatNum(totalAutonomyPercent, 0)} %`, 126, 111);

  // ── 4 CARTES KPI FINANCIÈRES ──
  const kpiY = 124;
  const kpiW = 43;
  const kpiH = 22;

  // KPI 1 : Économies Facture
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('ÉCONOMIES FACTURE', 17, kpiY + 6);
  doc.setFontSize(11);
  doc.text(`${formatNum(annualBillSavings)} € / an`, 17, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`HP/HC + Peak Shaving`, 17, kpiY + 18);

  // KPI 2 : Revenus Réseau
  if (includeGridConnection) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(60, kpiY, kpiW, kpiH, 2, 2, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(60, kpiY, kpiW, kpiH, 2, 2, 'D');
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(60, kpiY, kpiW, kpiH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(60, kpiY, kpiW, kpiH, 2, 2, 'D');
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  if (includeGridConnection) {
    doc.setTextColor(30, 64, 175);
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text('REVENUS RÉSEAU', 63, kpiY + 6);
  doc.setFontSize(11);
  doc.text(includeGridConnection ? `${formatNum(gridAnnualRevenues)} € / an` : '0 € HT / an', 63, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(includeGridConnection ? 'Services Système & FCR' : 'Mode Autonomie seul', 63, kpiY + 18);

  // KPI 3 : CAPEX Total
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(106, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(106, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('INVESTISSEMENT TOTAL', 109, kpiY + 6);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatNum(totalCapexHt)} € HT`, 109, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Matériel + Pose ${includeGridConnection ? '+ Raccordement' : ''}`, 109, kpiY + 18);

  // KPI 4 : Temps de retour
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(152, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(152, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(154, 52, 18);
  doc.text('TEMPS DE RETOUR', 155, kpiY + 6);
  doc.setFontSize(11);
  doc.text(`${safePayback} ans`, 155, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`TRI Projet : ${safeIrr} %`, 155, kpiY + 18);

  // ── CADRE 3 : DÉCOMPOSITION TECHNIQUE DES GAINS SUR FACTURE ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Détail des Économies Annuelles Réalisées', 14, 154);

  autoTable(doc, {
    startY: 157,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    head: [['Poste d\'optimisation', 'Principe de fonctionnement', 'Impact physique', 'Gain estimé (€ HT/an)']],
    body: [
      [
        'Écrêtage de pointe (Peak Shaving)',
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
  const netY = doc.lastAutoTable.finalY + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, netY, 182, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, netY, 182, 32, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STATUT DU RACCORDEMENT RÉSEAU ENEDIS', 18, netY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  if (!includeGridConnection) {
    doc.text('• Mode sélectionné : DERRIÈRE LE COMPTEUR (SANS RACCORDEMENT RÉSEAU SUPPLÉMENTAIRE).', 18, netY + 12);
    doc.text('• Coût de raccordement réseau Enedis = 0 € HT. Aucun délai administratif de raccordement.', 18, netY + 17);
    doc.text('• L\'énergie stockée est intégralement valorisée sur le site en autoconsommation et effacement de pointe.', 18, netY + 22);
    doc.text('• Optionnel : Un raccordement réseau ultérieur peut être activé pour valoriser l\'injection sur les marchés.', 18, netY + 27);
  } else {
    doc.text(`• Mode sélectionné : AVEC RACCORDEMENT RÉSEAU (${gridFeasibility.voltageDomain === 'BT_C4' ? 'Basse Tension BT C4 ≤ 250 kW' : 'Haute Tension HTA 20 kV > 250 kW'}).`, 18, netY + 12);
    doc.text(`• Statut technique : ${gridFeasibility.badge} · Budget raccordement estimé : ${formatNum(connectionCapex)} € HT.`, 18, netY + 17);
    doc.text(`• Revenus de marché prévisionnels (FCR, Réserve rapide, Capacité RTE) : +${formatNum(gridAnnualRevenues)} € HT / an.`, 18, netY + 22);
    if (gridFeasibility.warningMessage || gridFeasibility.errorMessage) {
      doc.setTextColor(220, 38, 38);
      doc.text(gridFeasibility.warningMessage || gridFeasibility.errorMessage, 18, netY + 27, { maxWidth: 174 });
    }
  }

  // Pied de page Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nelson / ENR Courtage · www.nelsonpv.fr · Solutions de Stockage Intelligent BESS', 14, 287);
  doc.text('Page 1 / 2', 185, 287);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : BUSINESS PLAN SUR 12 ANS & DÉTAIL DES REVENUS / CAPEX / OPEX
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Barre supérieure bleue Nelson
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('PLAN FINANCIER & PROJECTION DE TRÉSORERIE SUR 12 ANS', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Simulation financière d'amortissement avec dégradation batterie de 2.0%/an et inflation OPEX 2.0%/an`, 14, 23);

  // Tableau de Cash Flow sur 12 ans (avec chiffres formatés sans slash "/")
  const tableData = [];
  tableData.push([
    'Année 0',
    `-${formatNum(totalCapexHt)} €`,
    '0 €',
    '0 €',
    `-${formatNum(totalCapexHt)} €`,
    `-${formatNum(totalCapexHt)} €`
  ]);

  for (let y = 1; y <= 12; y++) {
    const item = cumulativeCashFlowChartData[y] || {};
    const deg = Math.pow(1 - 0.02, y - 1);
    const billSav = Math.round(annualBillSavings * deg);
    const gridRev = Math.round(gridAnnualRevenues * deg);
    const opex = Math.round((hardwareCapex * 0.012) * Math.pow(1 + 0.02, y - 1));
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

  autoTable(doc, {
    startY: 28,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    head: [['Période', 'Économies Facture', 'Revenus Réseau', 'Maintenance OPEX', 'Cash-Flow Net/an', 'Trésorerie Cumulée']],
    body: tableData
  });

  // ── SYNTHÈSE DES GAINS CUMULÉS SUR 12 ANS ──
  const synthY = doc.lastAutoTable.finalY + 6;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, synthY, 182, 30, 3, 3, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, synthY, 182, 30, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);
  doc.text('BILAN RENTABILITÉ GLOBALE À 12 ANS', 18, synthY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`• Investissement initial Total (CAPEX) : ${formatNum(totalCapexHt)} € HT`, 18, synthY + 12);
  doc.text(`• Temps de retour sur investissement (Payback) : ${safePayback} ans (TRI Projet : ${safeIrr} %)`, 18, synthY + 17);
  // Affichage strict positif ou négatif, sans jamais "+-"
  doc.text(`• Gain net de trésorerie cumulé après amortissement total : ${formatSignedNum(netGain12YearsHt, 0, ' € HT')}`, 18, synthY + 22);

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAIL DES REVENUS, CAPEX ET OPEX (CAS RACCORDÉ OU AUTONOMIE)
  // Remplace les anciens cadres de signature supprimés
  // ═══════════════════════════════════════════════════════════════════════════
  const detailY = synthY + 36;
  const colW = 58;
  const cardH = 76;

  // Calcul des détails de valorisation
  const fcrRevenuesYear = Math.round(totalPowerKw * 45);
  const capacityRevenuesYear = Math.round(totalPowerKw * 20);
  const spotArbitrageYear = Math.round(totalPowerKw * 15);

  const annualOpexMaintenance = Math.round(hardwareCapex * 0.012);
  const annualOpexSupervision = 200;
  const annualOpexAssurance = Math.round(hardwareCapex * 0.003);
  const totalAnnualOpex = annualOpexMaintenance + annualOpexSupervision + annualOpexAssurance;

  // Grand Cadre englobant
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, detailY, 182, cardH, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, detailY, 182, cardH, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    includeGridConnection
      ? 'DÉTAIL DU MODÈLE ÉCONOMIQUE RÉSEAU : REVENUS, CAPEX & OPEX'
      : 'DÉTAIL DU MODÈLE ÉCONOMIQUE DERRIÈRE LE COMPTEUR : REVENUS, CAPEX & OPEX',
    18,
    detailY + 7
  );

  // ── COLONNE 1 : DÉTAIL DES REVENUS ──
  const c1X = 18;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(c1X, detailY + 11, colW - 3, cardH - 15, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c1X, detailY + 11, colW - 3, cardH - 15, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(
    includeGridConnection ? '1. REVENUS RÉSEAU ANNUELS' : '1. ÉCONOMIES DIRECTES FACTURE',
    c1X + 3,
    detailY + 17
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);

  if (includeGridConnection) {
    doc.text(`• Réserve rapide FCR/aFRR :`, c1X + 3, detailY + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatNum(fcrRevenuesYear)} € HT/an`, c1X + 3, detailY + 27);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Garantie Capacité RTE :`, c1X + 3, detailY + 33);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatNum(capacityRevenuesYear)} € HT/an`, c1X + 3, detailY + 37);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Arbitrage marché Spot :`, c1X + 3, detailY + 43);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatNum(spotArbitrageYear)} € HT/an`, c1X + 3, detailY + 47);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Valorisation nette d'agrégateur`, c1X + 3, detailY + 54);
    doc.text(`(déduction commission 15% incluse).`, c1X + 3, detailY + 58);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`Total : +${formatNum(gridAnnualRevenues)} € HT/an`, c1X + 3, detailY + 66);
  } else {
    doc.text(`• Écrêtage pointe TURPE :`, c1X + 3, detailY + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatNum(peakShavingSavingsYear)} € HT/an`, c1X + 3, detailY + 27);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Arbitrage HP / HC :`, c1X + 3, detailY + 33);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatNum(arbitrageSavingsYear)} € HT/an`, c1X + 3, detailY + 37);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Taux d'autonomie :`, c1X + 3, detailY + 43);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalAutonomyPercent} % (gain +${totalAutonomyPercent - baseAutonomyPercent}%)`, c1X + 3, detailY + 47);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Réduction de dépendance réseau`, c1X + 3, detailY + 54);
    doc.text(`et sécurisation tarifaire active.`, c1X + 3, detailY + 58);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`Total : +${formatNum(annualBillSavings)} € HT/an`, c1X + 3, detailY + 66);
  }

  // ── COLONNE 2 : DÉTAIL DU CAPEX ──
  const c2X = c1X + colW + 1;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(c2X, detailY + 11, colW - 3, cardH - 15, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c2X, detailY + 11, colW - 3, cardH - 15, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175);
  doc.text('2. INVESTISSEMENT TOTAL (CAPEX)', c2X + 3, detailY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);

  doc.text(`• Matériel de stockage BESS :`, c2X + 3, detailY + 23);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNum(hardwareCapex)} € HT`, c2X + 3, detailY + 27);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Pose, raccordement & EMS :`, c2X + 3, detailY + 33);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNum(installCapex)} € HT`, c2X + 3, detailY + 37);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Raccordement réseau Enedis :`, c2X + 3, detailY + 43);
  doc.setFont('helvetica', 'bold');
  doc.text(
    includeGridConnection ? `${formatNum(connectionCapex)} € HT` : '0 € HT (Derrière compteur)',
    c2X + 3,
    detailY + 47
  );

  doc.setFont('helvetica', 'normal');
  if (includeGridConnection) {
    if (gridFeasibility.voltageDomain === 'BT_C4') {
      doc.text(`(Comptage C4 + AGCP + Liaison BT`, c2X + 3, detailY + 54);
      doc.text(`Exonéré quote-part S3REnR).`, c2X + 3, detailY + 58);
    } else {
      doc.text(`(Quote-part S3REnR ${formatNum(gridFeasibility.quotePartS3renrCost)} €`, c2X + 3, detailY + 54);
      doc.text(`+ Cellule Enedis & Livraison HTA).`, c2X + 3, detailY + 58);
    }
  } else {
    doc.text(`Aucun coût réseau Enedis`, c2X + 3, detailY + 54);
    doc.text(`ni frais de guichet d'injection.`, c2X + 3, detailY + 58);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`Total : ${formatNum(totalCapexHt)} € HT`, c2X + 3, detailY + 66);

  // ── COLONNE 3 : DÉTAIL DES OPEX ──
  const c3X = c2X + colW + 1;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(c3X, detailY + 11, colW - 3, cardH - 15, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c3X, detailY + 11, colW - 3, cardH - 15, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(154, 52, 18);
  doc.text('3. CHARGES ANNUELLES (OPEX)', c3X + 3, detailY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);

  doc.text(`• Maintenance préventive BESS :`, c3X + 3, detailY + 23);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNum(annualOpexMaintenance)} € HT/an`, c3X + 3, detailY + 27);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Supervision EMS & Télémétrie :`, c3X + 3, detailY + 33);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNum(annualOpexSupervision)} € HT/an`, c3X + 3, detailY + 37);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Assurance exploitation :`, c3X + 3, detailY + 43);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNum(annualOpexAssurance)} € HT/an`, c3X + 3, detailY + 47);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Indexation inflation : 2.0 %/an`, c3X + 3, detailY + 54);
  doc.text(`• Dégradation batterie : 2.0 %/an`, c3X + 3, detailY + 58);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(154, 52, 18);
  doc.text(`Total : -${formatNum(totalAnnualOpex)} € HT/an`, c3X + 3, detailY + 66);

  // Pied de page Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nelson / ENR Courtage · www.nelsonpv.fr · Solutions de Stockage Intelligent BESS', 14, 287);
  doc.text('Page 2 / 2', 185, 287);

  // Téléchargement automatique
  const cleanPrm = String(prm || 'PRM').replace(/[^a-zA-Z0-9]/g, '');
  const cleanRef = (model?.reference || 'BESS').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Proposition_BESS_${cleanPrm}_${cleanRef}.pdf`;
  doc.save(fileName);
  return fileName;
}
