/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GÉNÉRATEUR DE RAPPORT PDF — PROPOSITION DE STOCKAGE BESS SAFRA
 * Format A4 professionnel aux couleurs d'ENR COURTAGE & SAFRA New Energy
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';

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

  // Badge Partenaire SAFRA New Energy (droite)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(140, 11, 56, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(140, 11, 56, 14, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(234, 88, 12); // #ea580c (Orange Safra)
  doc.text('SAFRA NEW ENERGY', 144, 17);
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
  doc.text('Étude Technico-Économique & Simulation de Rentabilité SAFRA', 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le ${dateStr} · Document confidentiel Nelson / ENR Courtage Énergie`, 14, 45);

  // ── CADRE 1 : INFORMATIONS CLIENT & PROFIL ENEDIS ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 48, 182, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 48, 182, 28, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TITULAIRE DU COMPTEUR', 18, 54);
  doc.text('POINT DE MESURE (PRM)', 95, 54);
  doc.text('DONNÉES ENEDIS DATA CONNECT', 145, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(titulaire || 'Client Professionnel', 18, 60);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(String(prm || '50009371514981'), 95, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${Math.round(consoAnnuelleKwh).toLocaleString('fr-FR')} kWh / an`, 145, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(adresse || 'Adresse de raccordement du site', 18, 66, { maxWidth: 72 });
  doc.text(`Moyenne : ${consoJourMoyKwh.toFixed(1)} kWh/jour · Pointe max : ${peakKw.toFixed(1)} kW`, 145, 66);

  // ── CADRE 2 : SOLUTION RETENUE SAFRA ──
  doc.setFillColor(239, 246, 255); // Fond bleu très clair
  doc.roundedRect(14, 80, 182, 38, 3, 3, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, 80, 182, 38, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text('SOLUTION DE STOCKAGE RECOMMANDÉE & CONFIGURÉE', 18, 86);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${quantity}× ${model.name}`, 18, 93);

  // 3 Mini-badges de specs techniques
  // Badge Capacité
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(18, 98, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('CAPACITÉ TOTALE', 22, 103);
  doc.setFontSize(11);
  doc.text(`${totalCapacityKwh.toFixed(1)} kWh`, 22, 109);

  // Badge Puissance
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(70, 98, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('PUISSANCE NOMINALE', 74, 103);
  doc.setFontSize(11);
  doc.text(`${totalPowerKw.toFixed(0)} kW`, 74, 109);

  // Badge Autonomie
  doc.setFillColor(249, 115, 22);
  doc.roundedRect(122, 98, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('AUTONOMIE ATTEINTE', 126, 103);
  doc.setFontSize(11);
  doc.text(`${totalAutonomyPercent} %`, 126, 109);

  // ── 4 CARTES KPI FINANCIÈRES ──
  const kpiY = 123;
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
  doc.text(`${annualBillSavings.toLocaleString('fr-FR')} €/an`, 17, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`HP/HC + Peak Shaving`, 17, kpiY + 18);

  // KPI 2 : Revenus Réseau
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(60, kpiY, kpiW, kpiH, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(60, kpiY, kpiW, kpiH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.text('REVENUS RÉSEAU', 63, kpiY + 6);
  doc.setFontSize(11);
  doc.text(includeGridConnection ? `${gridAnnualRevenues.toLocaleString('fr-FR')} €/an` : '0 € HT/an', 63, kpiY + 13);
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
  doc.text(`${totalCapexHt.toLocaleString('fr-FR')} € HT`, 109, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Matériel + Pose ${includeGridConnection ? '+ Racc' : ''}`, 109, kpiY + 18);

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
  doc.text('Détail des Économies Annuelles Réalisées', 14, 153);

  autoTable(doc, {
    startY: 156,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    head: [['Poste d\'optimisation', 'Principe de fonctionnement', 'Impact physique', 'Gain estimé (€ HT/an)']],
    body: [
      [
        'Écrêtage de pointe (Peak Shaving)',
        'Effacement automatique lors des dépassements et pics tarifaires TURPE',
        `Pointe abaissée de ${peakKw.toFixed(1)} kW à ${newPeakKw.toFixed(1)} kW (-${peakShavedKw.toFixed(1)} kW)`,
        `${peakShavingSavingsYear.toLocaleString('fr-FR')} € / an`
      ],
      [
        'Arbitrage Heures Pleines / Heures Creuses',
        'Recharge en Heures Creuses / Solaire et décharge intelligente en Heures Pleines',
        `${Math.round(totalCapacityKwh * 0.90 * 300).toLocaleString('fr-FR')} kWh stockés & restitués/an`,
        `${arbitrageSavingsYear.toLocaleString('fr-FR')} € / an`
      ],
      [
        'Gain d\'Autonomie & Sécurisation',
        'Augmentation de la part d\'énergie décarbonée et réduction de dépendance réseau',
        `Couverture du site portée de ${baseAutonomyPercent}% à ${totalAutonomyPercent}%`,
        'Inclus dans facture'
      ],
      [
        'TOTAL ÉCONOMIES DIRECTES FACTURE',
        'Gain net annuel récurrent sur la facture électrique d\'électricité',
        'Effacement garanti par supervision EMS SAFRA',
        `${annualBillSavings.toLocaleString('fr-FR')} € HT / an`
      ]
    ]
  });

  // ── CADRE 4 : STATUT DE RACCORDEMENT RÉSEAU ENEDIS ──
  const netY = doc.lastAutoTable.finalY + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, netY, 182, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, netY, 182, 30, 2, 2, 'D');

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
    doc.text('• Optionnel : Un raccordement réseau ultérieur peut être étudié pour valoriser l\'injection sur les marchés.', 18, netY + 27);
  } else {
    doc.text(`• Mode sélectionné : AVEC RACCORDEMENT RÉSEAU (${gridFeasibility.voltageDomain === 'BT_C4' ? 'Basse Tension BT C4 ≤ 250 kW' : 'Haute Tension HTA 20 kV > 250 kW'}).`, 18, netY + 12);
    doc.text(`• Statut technique : ${gridFeasibility.badge} · Budget raccordement estimé : ${connectionCapex.toLocaleString('fr-FR')} € HT.`, 18, netY + 17);
    doc.text(`• Revenus de marché prévisionnels (FCR, Réserve rapide, Capacité RTE) : +${gridAnnualRevenues.toLocaleString('fr-FR')} € HT / an.`, 18, netY + 22);
    if (gridFeasibility.warningMessage || gridFeasibility.errorMessage) {
      doc.setTextColor(220, 38, 38);
      doc.text(gridFeasibility.warningMessage || gridFeasibility.errorMessage, 18, netY + 27, { maxWidth: 174 });
    }
  }

  // Pied de page Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nelson / ENR Courtage Énergie · www.nelsonpv.fr · Partenaire Intégrateur BESS SAFRA', 14, 287);
  doc.text('Page 1 / 2', 185, 287);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : BUSINESS PLAN SUR 12 ANS & ENGAGEMENT CONTRACTUEL
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Barre supérieure bleue Nelson
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('PLAN FINANCIER & PROJECTION DE TRÉSORERIE SUR 12 ANS', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Simulation financière d'amortissement avec dégradation batterie de 2.0%/an et inflation OPEX 2.0%/an`, 14, 26);

  // Tableau de Cash Flow sur 12 ans
  const tableData = [];
  tableData.push(['Année 0', `-${totalCapexHt.toLocaleString('fr-FR')} €`, '0 €', '0 €', `-${totalCapexHt.toLocaleString('fr-FR')} €`, `-${totalCapexHt.toLocaleString('fr-FR')} €`]);

  for (let y = 1; y <= 12; y++) {
    const item = cumulativeCashFlowChartData[y];
    const deg = Math.pow(1 - 0.02, y - 1);
    const billSav = Math.round(annualBillSavings * deg);
    const gridRev = Math.round(gridAnnualRevenues * deg);
    const opex = Math.round((hardwareCapex * 0.012) * Math.pow(1 + 0.02, y - 1));
    const netCash = billSav + gridRev - opex;

    tableData.push([
      `Année ${y}`,
      `${billSav.toLocaleString('fr-FR')} €`,
      includeGridConnection ? `${gridRev.toLocaleString('fr-FR')} €` : '0 €',
      `-${opex.toLocaleString('fr-FR')} €`,
      `+${netCash.toLocaleString('fr-FR')} €`,
      `${(item.avecRaccordement !== null ? item.avecRaccordement : item.autonomieSeule).toLocaleString('fr-FR')} €`
    ]);
  }

  autoTable(doc, {
    startY: 32,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    head: [['Période', 'Économies Facture', 'Revenus Réseau', 'Maintenance OPEX', 'Cash-Flow Net/an', 'Trésorerie Cumulée']],
    body: tableData
  });

  // ── SYNTHÈSE DES GAINS CUMULÉS SUR 12 ANS ──
  const synthY = doc.lastAutoTable.finalY + 8;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, synthY, 182, 34, 3, 3, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, synthY, 182, 34, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('BILAN RENTABILITÉ GLOBALE À 12 ANS', 18, synthY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`• Investissement initial Total (CAPEX) : ${totalCapexHt.toLocaleString('fr-FR')} € HT`, 18, synthY + 14);
  doc.text(`• Temps de retour sur investissement (Payback) : ${safePayback} ans (TRI Projet : ${safeIrr} %)`, 18, synthY + 20);
  doc.text(`• Gain net de trésorerie cumulé après amortissement total : +${netGain12YearsHt.toLocaleString('fr-FR')} € HT`, 18, synthY + 26);

  // ── BLOC CADRE GARANTIE & SIGNATURES ──
  const signY = synthY + 42;
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, signY, 88, 38, 2, 2, 'D');
  doc.roundedRect(108, signY, 88, 38, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('POUR LE CLIENT / REPRÉSENTANT LÉGAL', 18, signY + 6);
  doc.text('POUR NELSON / ENR COURTAGE ÉNERGIE', 112, signY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nom : ${titulaire || 'Représentant client'}`, 18, signY + 12);
  doc.text('Date et signature (précédée de "Bon pour accord") :', 18, signY + 18);

  doc.text('Yann ROULET — Directeur Général', 112, signY + 12);
  doc.text('Partenaire Distributeur & Intégrateur SAFRA', 112, signY + 18);

  // Pied de page Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nelson / ENR Courtage Énergie · www.nelsonpv.fr · Partenaire Intégrateur BESS SAFRA', 14, 287);
  doc.text('Page 2 / 2', 185, 287);

  // Téléchargement automatique
  const cleanPrm = String(prm || 'PRM').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `Proposition_BESS_SAFRA_${cleanPrm}_${model.reference.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
  return fileName;
}
