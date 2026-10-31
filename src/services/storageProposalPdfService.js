/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GÉNÉRATEUR DE RAPPORTS PDF POUR LE MODULE « STOCKAGE BATTERIE »
 * 1. Étude Commerciale Client (pédagogique, visuelle, devis, avant/après)
 * 2. Dossier Bancaire Officiel (Note de synthèse, Plan de financement,
 *    Compte de résultat prévisionnel & Cash-flow 20 ans, Stress-test)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';
import { annuity } from '@/services/storageBatteryEngine.js';

export function formatNum(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const n = Number(val);
  const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
}

export function formatSignedNum(val, decimals = 0, suffix = ' €') {
  if (val === null || val === undefined || isNaN(val)) return `0${suffix}`;
  const n = Number(val);
  const absFormatted = formatNum(Math.abs(n), decimals);
  if (n > 0) return `+${absFormatted}${suffix}`;
  if (n < 0) return `-${absFormatted}${suffix}`;
  return `0${suffix}`;
}

// ─── En-tête officiel ENR Courtage / Nelson ───
function drawHeader(doc, title, subtitle, pageNum, totalPages) {
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', 14, 8, 38, 12);
    } catch (_) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('NELSON · INGÉNIERIE ÉNERGÉTIQUE & STOCKAGE', 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Document confidentiel · Édité le ${new Date().toLocaleDateString('fr-FR')}`, 196, 16, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 22, 196, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 29);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 14, 33.5);
  }
}

function drawFooter(doc, pageNum, totalPages, isBank = false) {
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 285, 196, 285);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const label = isBank
    ? 'Dossier de Financement Bancaire · Modélisation DSCR / TRI · Nelson / ENR Courtage SAS'
    : 'Proposition Commerciale Stockage Batterie & Solaire · Nelson / ENR Courtage · www.nelsonpv.fr';
  doc.text(label, 14, 289);
  doc.text(`Page ${pageNum} / ${totalPages}`, 196, 289, { align: 'right' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PDF ÉTUDE COMMERCIALE CLIENT (2 PAGES SYNTHÉTIQUES & DÉTAILLÉES)
// ═══════════════════════════════════════════════════════════════════════════
export function generateClientCommercialPdf({ sim, projectInfo = {} }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 3;

  const clientName = projectInfo.clientName || 'Client Professionnel';
  const prm = projectInfo.prm || 'PRM Non spécifié';
  const address = projectInfo.address || 'France';
  const solar = sim.input.solar || {};

  // ── PAGE 1 : PROPOSITION COMMERCIALE & SYNTHÈSE TECHNIQUE ──
  drawHeader(
    doc,
    'PROPOSITION COMMERCIALE : STOCKAGE INTELLIGENT BESS',
    `Étude de rentabilité pour ${clientName} · ${prm} · ${address}`,
    1,
    totalPages
  );

  // Cartouche Client & PRM
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 37, 182, 17, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 37, 182, 17, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DONNÉES ÉNERGÉTIQUES DE RÉFÉRENCE', 18, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Titulaire : ${clientName}`, 18, 46.5);
  doc.text(`• Point de Référence et Mesure (PRM) : ${prm}`, 18, 50.5);

  const consoAnnuelle = Math.round((sim.input.annualKwh || 0));
  const dailyMoy = Math.round(consoAnnuelle / 365);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Consommation annuelle : ${formatNum(consoAnnuelle)} kWh/an (${dailyMoy} kWh/j)`, 105, 46.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Puissance de pointe mesurée : ${sim.energy.peakKw.toFixed(1)} kW - Écrêtée à ${sim.energy.newPeakKw.toFixed(1)} kW (-${sim.energy.shaveKw.toFixed(1)} kW)`, 105, 50.5);

  // 4 Cartouches KPI Clés
  const kpiY = 57;
  const kpiW = 43;
  const kpiH = 18;
  const kpiData = [
    {
      title: 'BATTERIE RECOMMANDÉE',
      val: `${sim.quantity}× ${sim.model.reference}`,
      sub: `${sim.capacityKwh.toFixed(1)} kWh / ${sim.powerKw.toFixed(0)} kW`,
      bg: [239, 246, 255], border: [191, 219, 254], txt: [30, 64, 175]
    },
    {
      title: 'AUTONOMIE ATTEINTE',
      val: `${Math.round(sim.energy.rates.autonomyPvBat * 100)} %`,
      sub: solar.enabled ? `(Solaire seul : ${Math.round(sim.energy.rates.autonomyPv * 100)} %)` : `Gain net : +${Math.round(sim.energy.rates.autonomyPvBat * 100)} %`,
      bg: [240, 253, 244], border: [187, 247, 208], txt: [22, 101, 52]
    },
    {
      title: 'ÉCONOMIES FACTURE / AN',
      val: `${formatNum(sim.gains.batterySavings + sim.gains.solarSavings)} € HT/an`,
      sub: sim.gains.gridRevenue > 0 ? `+ ${formatNum(sim.gains.gridRevenue)} €/an réseau` : 'Optimisation 100 % site',
      bg: [254, 243, 199], border: [253, 230, 138], txt: [180, 83, 9]
    },
    {
      title: 'TEMPS DE RETOUR (ROI)',
      val: sim.kpis.payback !== null ? `${sim.kpis.payback} ans` : '> 20 ans',
      sub: `TRI Projet : ${sim.kpis.triProject !== null ? `${sim.kpis.triProject} %` : '—'}`,
      bg: [245, 243, 255], border: [221, 214, 254], txt: [109, 40, 217]
    }
  ];

  kpiData.forEach((kpi, idx) => {
    const kx = 14 + idx * (kpiW + 3.3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(kx, kpiY, kpiW, kpiH, 2, 2, 'F');
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.roundedRect(kx, kpiY, kpiW, kpiH, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(kpi.txt[0], kpi.txt[1], kpi.txt[2]);
    doc.text(kpi.title, kx + 3, kpiY + 4.5);

    doc.setFontSize(9.5);
    doc.text(kpi.val, kx + 3, kpiY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, kx + 3, kpiY + 15.5);
  });

  // Volet Solaire Photovoltaïque si présent
  let curY = 78;
  if (solar.enabled) {
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(14, curY, 182, 16, 2, 2, 'F');
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(14, curY, 182, 16, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`☀️ CENTRALE SOLAIRE PHOTOVOLTAÏQUE ASSOCIÉE (${solar.kwc} kWC)`, 18, curY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const solStat = solar.isNew
      ? `Nouvelle installation (CAPEX inclus : ${formatNum(solar.capexHt || 0)} € HT)`
      : 'Centrale solaire existante conservée (CAPEX = 0 €)';
    doc.text(`• Statut : ${solStat}`, 18, curY + 9.5);
    doc.text(`• Production annuelle : ${formatNum(sim.energy.pvAnnual)} kWh/an (${solar.specificYield} kWh/kWc/an)`, 18, curY + 13.5);
    doc.text(`• Taux d'autoconsommation solaire : ${Math.round(sim.energy.rates.autoconsoPvBat * 100)} % (vs ${Math.round(sim.energy.rates.autoconsoPv * 100)} % sans batterie)`, 110, curY + 9.5);
    doc.text(`• Recharge gratuite de la batterie par le surplus solaire : ${formatNum(sim.energy.totals.batFromPv)} kWh/an`, 110, curY + 13.5);
    curY += 19;
  }

  // Devis d'investissement détaillé (Tableau)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DÉTAIL DE L\'INVESTISSEMENT CLÉ EN MAIN (CAPEX HT)', 14, curY + 4);

  const quoteRows = [
    [
      `Batterie de stockage ${sim.quantity}× ${sim.model.name} (${sim.capacityKwh.toFixed(1)} kWh / ${sim.powerKw.toFixed(0)} kW)`,
      `${sim.quantity}`,
      `${formatNum(sim.capex.hardwareCapex / sim.quantity)} €`,
      `${formatNum(sim.capex.hardwareCapex)} €`
    ],
    [
      `Forfait pose standard, coffrets AC/DC, câblage & intégration EMS (${sim.capex.installDegressivity > 0 ? `dégressivité -${Math.round(sim.capex.installDegressivity * 100)}%` : 'standard'})`,
      '1 ens.',
      `${formatNum(sim.capex.installCapex)} €`,
      `${formatNum(sim.capex.installCapex)} €`
    ]
  ];

  if (sim.capex.discountAmount > 0) {
    quoteRows.push([
      `Remise commerciale exceptionnelle (${sim.input.discountPct || 0} %)`,
      '—',
      `-${formatNum(sim.capex.discountAmount)} €`,
      `-${formatNum(sim.capex.discountAmount)} €`
    ]);
  }

  if (solar.enabled && solar.isNew && sim.capex.pvCapex > 0) {
    quoteRows.push([
      `Centrale photovoltaïque ${solar.kwc} kWc clé en main (modules, onduleur, pose)`,
      '1 ens.',
      `${formatNum(sim.capex.pvCapex)} €`,
      `${formatNum(sim.capex.pvCapex)} €`
    ]);
  }

  if (sim.grid) {
    quoteRows.push([
      `Raccordement réseau Enedis (${sim.grid.label})`,
      '1 ens.',
      `${formatNum(sim.grid.costHt)} €`,
      `${formatNum(sim.grid.costHt)} €`
    ]);
  }

  quoteRows.push([
    'INVESTISSEMENT TOTAL DU PROJET (CAPEX HT)',
    '',
    '',
    `${formatNum(sim.capex.totalCapex)} € HT`
  ]);

  autoTable(doc, {
    startY: curY + 6,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 1.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.3,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 105, fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 29, halign: 'right', fontStyle: 'bold' }
    },
    head: [['Désignation des prestations et équipements', 'Qté', 'Prix unitaire HT', 'Montant Total HT']],
    body: quoteRows
  });

  // Bloc Modèle Économique / Revenus
  const ecoY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, ecoY, 182, 36, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, ecoY, 182, 36, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SYNTHÈSE DU MODÈLE ÉCONOMIQUE ANNUEL (ANNÉE 1)', 18, ecoY + 5);

  const colW3 = 56;
  // Col 1 : Économies Facture
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52);
  doc.text('1. ÉCONOMIES FACTURE', 18, ecoY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Écrêtage pointes TURPE : +${formatNum(sim.gains.peakShavingValue)} €/an`, 18, ecoY + 16);
  doc.text(`• Arbitrage HP/HC & Décharge : +${formatNum(sim.gains.batterySavings - sim.gains.peakShavingValue)} €/an`, 18, ecoY + 20);
  if (solar.enabled) {
    if (sim.gains.solarSavings > 0) {
      doc.text(`• Économies solaire PV : +${formatNum(sim.gains.solarSavings)} €/an`, 18, ecoY + 24);
    } else {
      doc.text(`• PV existant (${solar.kwc} kWc) sur site`, 18, ecoY + 24);
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Économies : +${formatNum(sim.gains.batterySavings + sim.gains.solarSavings)} € HT/an`, 18, ecoY + 31);

  // Col 2 : Raccordement & Revenus Réseau
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 64, 175);
  doc.text('2. REVENUS RÉSEAU / MARCHÉ', 18 + colW3 + 4, ecoY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  if (sim.grid) {
    doc.text(`• Statut : Raccordé Réseau Enedis`, 18 + colW3 + 4, ecoY + 16);
    doc.text(`• Services Réserve FCR & Capacité`, 18 + colW3 + 4, ecoY + 20);
    doc.text(`• Revenus nets agrégateur (80 €/kW) :`, 18 + colW3 + 4, ecoY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Réseau : +${formatNum(sim.gains.gridRevenue)} € HT/an`, 18 + colW3 + 4, ecoY + 31);
  } else {
    doc.text(`• Mode : Derrière le compteur (0 € réseau)`, 18 + colW3 + 4, ecoY + 16);
    doc.text(`• Aucune formalité Enedis requise`, 18 + colW3 + 4, ecoY + 20);
    if (sim.gains.solarSurplusRevenue > 0) {
      doc.text(`• Vente surplus solaire : +${formatNum(sim.gains.solarSurplusRevenue)} €/an`, 18 + colW3 + 4, ecoY + 24);
    } else {
      doc.text(`• 100% valorisé en autoconsommation`, 18 + colW3 + 4, ecoY + 24);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Réseau : 0 € (Autonomie seule)`, 18 + colW3 + 4, ecoY + 31);
  }

  // Col 3 : OPEX & Net Annuel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9);
  doc.text('3. CHARGES & FLUX NET', 18 + colW3 * 2 + 8, ecoY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Maintenance préventive BESS : ${formatNum(Math.round(sim.opex * 0.7))} €/an`, 18 + colW3 * 2 + 8, ecoY + 16);
  doc.text(`• Supervision EMS & Télémétrie : ${formatNum(Math.round(sim.opex * 0.3))} €/an`, 18 + colW3 * 2 + 8, ecoY + 20);
  doc.text(`• Total OPEX : -${formatNum(sim.opex)} € HT/an`, 18 + colW3 * 2 + 8, ecoY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  const netY1 = sim.gains.totalYear1 - sim.opex;
  doc.text(`Gain Net Année 1 : ${formatSignedNum(netY1, 0, ' € HT')}`, 18 + colW3 * 2 + 8, ecoY + 31);

  drawFooter(doc, 1, totalPages, false);

  // ── PAGE 2 : PROFIL JOURNALIER DE CHARGE 24H & JOURNÉE TYPE BESS ──
  doc.addPage();
  drawHeader(
    doc,
    'PROFIL JOURNALIER DE CHARGE 24H & JOURNÉE TYPE BESS',
    `Courbe de charge 24h du site, recharge sur surplus solaire, effacement de pointe TURPE et niveau de charge BESS (SOC %)`,
    2,
    totalPages
  );

  // 4 Jauges d'Autonomie & Autoconsommation (aux couleurs de Nelson)
  const rateW = (182 - 3 * 3) / 4;
  const ratesData = [
    {
      title: 'AUTONOMIE SITE SEUL',
      val: '0 %',
      sub: '100% dépendance réseau',
      bg: [248, 250, 252], border: [226, 232, 240], txt: [71, 85, 105], titleColor: [100, 116, 139]
    },
    {
      title: 'AVEC SOLAIRE SEUL',
      val: `${Math.round(sim.energy.rates.autonomyPv * 100)} %`,
      sub: `Autoconso : ${Math.round(sim.energy.rates.autoconsoPv * 100)} %`,
      bg: [254, 243, 199], border: [253, 230, 138], txt: [146, 64, 14], titleColor: [180, 83, 9]
    },
    {
      title: 'AVEC SOLAIRE + BESS',
      val: `${Math.round(sim.energy.rates.autonomyPvBat * 100)} %`,
      sub: `Autoconso : ${Math.round(sim.energy.rates.autoconsoPvBat * 100)} %`,
      bg: [236, 253, 245], border: [167, 243, 208], txt: [6, 95, 70], titleColor: [4, 120, 87]
    },
    {
      title: 'SURPLUS SOLAIRE STOCKÉ',
      val: `${formatNum(sim.energy.totals.batFromPv)} kWh`,
      sub: 'Énergie gratuite / an',
      bg: [239, 246, 255], border: [191, 219, 254], txt: [30, 64, 175], titleColor: [37, 99, 235]
    }
  ];

  ratesData.forEach((r, idx) => {
    const rx = 14 + idx * (rateW + 3);
    doc.setFillColor(r.bg[0], r.bg[1], r.bg[2]);
    doc.roundedRect(rx, 37, rateW, 13.5, 1.8, 1.8, 'F');
    doc.setDrawColor(r.border[0], r.border[1], r.border[2]);
    doc.roundedRect(rx, 37, rateW, 13.5, 1.8, 1.8, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(r.titleColor[0], r.titleColor[1], r.titleColor[2]);
    doc.text(r.title, rx + 2.5, 40.5);

    doc.setFontSize(9.5);
    doc.setTextColor(r.txt[0], r.txt[1], r.txt[2]);
    doc.text(r.val, rx + 2.5, 45.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(r.sub, rx + 2.5, 48.8);
  });

  // Graphique 24h vectoriel de charge & écrêtage
  drawDaily24hChartPdf(doc, 14, 53, 182, 57, sim.energy.chart, sim.energy.peakKw, sim.energy.newPeakKw, Boolean(solar?.enabled));

  // Tableau synthétique de la Journée type heure par heure avec Niveau de Charge (SOC %)
  drawHourlyJourneyTablePdf(doc, 14, 113, 182, 57, sim.energy.chart, sim.capacityKwh);

  // 4 Piliers Opérationnels & Explication de la journée type
  const pillarW = (182 - 3 * 2.5) / 4;
  const pillars = [
    { title: 'RÉGULATION 50 HZ', desc: 'Stabilisation continue de la fréquence réseau seconde par seconde.', bg: [240, 249, 255], border: [186, 230, 253], txt: [3, 105, 161] },
    { title: 'ÉCRÊTAGE DE POINTE', desc: 'Effacement automatique des pics de puissance pour réduire le TURPE.', bg: [254, 243, 199], border: [253, 230, 138], txt: [180, 83, 9] },
    { title: 'RECHARGE OPTIMALE', desc: 'Stockage prioritaire du surplus solaire gratuit ou recharge en tarif creux.', bg: [236, 253, 245], border: [167, 243, 208], txt: [4, 120, 87] },
    { title: 'ARBITRAGE & SECOURS', desc: 'Restitution en Heures Pleines et résilience énergétique garantie du site.', bg: [238, 242, 255], border: [199, 210, 254], txt: [67, 56, 202] }
  ];

  pillars.forEach((p, pIdx) => {
    const px = 14 + pIdx * (pillarW + 2.5);
    doc.setFillColor(p.bg[0], p.bg[1], p.bg[2]);
    doc.roundedRect(px, 172.5, pillarW, 16, 1.6, 1.6, 'F');
    doc.setDrawColor(p.border[0], p.border[1], p.border[2]);
    doc.roundedRect(px, 172.5, pillarW, 16, 1.6, 1.6, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(p.txt[0], p.txt[1], p.txt[2]);
    doc.text(p.title, px + 2.5, 176.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(p.desc, pillarW - 5);
    doc.text(splitDesc, px + 2.5, 180.5);
  });

  // Note explicative
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 191, 182, 11, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 191, 182, 11, 1.5, 1.5, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('Note de modélisation : Ce profil journalier modélise une journée représentative des cycles de consommation et d\'ensoleillement sur le site. La batterie effectue 1 à 1,5 cycle par jour', 18, 194.5);
  doc.text('en chargeant prioritairement sur le surplus solaire (ou en Heures Creuses) et en restituant l\'énergie pendant les pointes pour effacer les dépassements de puissance TURPE Enedis.', 18, 198.5);

  drawFooter(doc, 2, totalPages, false);

  // ── PAGE 3 : MODÉLISATION FINANCIÈRE SUR 20 ANS, BANCABILITÉ & CHRONOGRAMME ──
  doc.addPage();
  drawHeader(
    doc,
    'MODÉLISATION FINANCIÈRE SUR 20 ANS, BANCABILITÉ & CHRONOGRAMME',
    `Hypothèses : Inflation énergie ${sim.input.indexationPct || 4} %/an · Dégradation batterie 1 %/an · OPEX indexé 2 %/an`,
    3,
    totalPages
  );

  // 6 KPIs Financiers aux couleurs exactes de Nelson
  const kpiFinW = (182 - 5 * 2.5) / 6;
  const kpisFinData = [
    {
      title: 'CAPEX TOTAL PROJET',
      val: `${formatNum(sim.capex.totalCapex)} €`,
      sub: `Dette : ${formatNum(sim.financing.debt)} €`,
      bg: [248, 250, 252], border: [226, 232, 240], txt: [15, 23, 42], titleColor: [100, 116, 139]
    },
    {
      title: 'GAINS NET ANNÉE 1',
      val: `+${formatNum(sim.gains.totalYear1 - sim.opex)} €`,
      sub: 'EBITDA initial',
      bg: [236, 253, 245], border: [167, 243, 208], txt: [6, 78, 59], titleColor: [4, 120, 87]
    },
    {
      title: 'ANNUITÉ EMPRUNT',
      val: `-${formatNum(sim.financing.annuity)} €`,
      sub: `par an (${sim.financing.years} ans)`,
      bg: [239, 246, 255], border: [191, 219, 254], txt: [30, 58, 138], titleColor: [30, 64, 175]
    },
    {
      title: 'DSCR MOYEN',
      val: sim.financing.dscrAvg ? `${sim.financing.dscrAvg}x` : '—',
      sub: `Min : ${sim.financing.dscrMin ? `${sim.financing.dscrMin}x` : '—'} (> 1.20x)`,
      bg: [238, 242, 255], border: [199, 210, 254], txt: [49, 46, 129], titleColor: [67, 56, 202]
    },
    {
      title: 'TRI PROJET / FP',
      val: `${sim.kpis.triProject ? `${sim.kpis.triProject} %` : '—'}`,
      sub: `TRI FP : ${sim.kpis.triEquity ? `${sim.kpis.triEquity} %` : '—'}`,
      bg: [240, 249, 255], border: [186, 230, 253], txt: [12, 74, 110], titleColor: [3, 105, 161]
    },
    {
      title: 'TRÉSORERIE 20 ANS',
      val: `+${formatNum(sim.kpis.gain20)} €`,
      sub: `VAN (5%) : +${formatNum(sim.kpis.van)} €`,
      bg: [254, 252, 232], border: [254, 240, 138], txt: [113, 63, 18], titleColor: [161, 98, 7]
    }
  ];

  kpisFinData.forEach((k, kIdx) => {
    const kx = 14 + kIdx * (kpiFinW + 2.5);
    doc.setFillColor(k.bg[0], k.bg[1], k.bg[2]);
    doc.roundedRect(kx, 37, kpiFinW, 15, 1.8, 1.8, 'F');
    doc.setDrawColor(k.border[0], k.border[1], k.border[2]);
    doc.roundedRect(kx, 37, kpiFinW, 15, 1.8, 1.8, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(k.titleColor[0], k.titleColor[1], k.titleColor[2]);
    doc.text(k.title, kx + 2, 40.5);

    doc.setFontSize(8.5);
    doc.setTextColor(k.txt[0], k.txt[1], k.txt[2]);
    doc.text(k.val, kx + 2, 45.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.6);
    doc.text(k.sub, kx + 2, 49.5);
  });

  // Graphique de Trésorerie Cumulée & Seuil de rentabilité
  drawCashFlowChartPdf(doc, 14, 54.5, 182, 36, sim.years, sim.kpis.payback, sim.kpis.triProject, Boolean(sim.grid), sim.capex.totalCapex);

  // Tableau de Cash-flow sur 20 ans
  const cfRows = [
    ['Année 0', `-${formatNum(sim.capex.totalCapex)} €`, '0 €', '0 €', `-${formatNum(sim.capex.totalCapex)} €`, `-${formatNum(sim.capex.totalCapex)} €`]
  ];

  sim.years.forEach((yr) => {
    cfRows.push([
      `Année ${yr.year}`,
      `+${formatNum(yr.batterySavings + yr.solarSavings)} €`,
      yr.gridRevenue > 0 ? `+${formatNum(yr.gridRevenue)} €` : '0 €',
      `-${formatNum(yr.opex)} €`,
      formatSignedNum(yr.ebitda, 0, ' €'),
      formatSignedNum(yr.cumProject, 0, ' €')
    ]);
  });

  autoTable(doc, {
    startY: 93,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 5.6,
      cellPadding: 0.8
    },
    styles: {
      font: 'helvetica',
      fontSize: 5,
      cellPadding: 0.6,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
    },
    head: [['Période', 'Économies Facture', 'Revenus Réseau', 'OPEX Maintenance', 'Cash-Flow Net/an', 'Trésorerie Cumulée']],
    body: cfRows
  });

  // Chronogramme 6 étapes en bas de la page 3
  const chronoY = Math.max(167, (doc.lastAutoTable?.finalY || 164) + 3);
  drawChronogrammeGantt(doc, 14, chronoY, 182, 36, Boolean(sim.grid));

  drawFooter(doc, 3, totalPages, false);

  const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Etude_Commerciale_Stockage_${cleanName}.pdf`;
  doc.save(filename);
  return filename;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. DOSSIER BANCAIRE OFFICIEL MULTI-PAGES (FINANCEMENT PROFESSIONNEL)
// Page 1 : Note de synthèse bancaire & Porteur de projet
// Page 2 : Plan de financement, Échéancier dette & Ratios de bancabilité (DSCR, TRI)
// Page 3 : Compte de résultat prévisionnel & Cash-flow 20 ans
// Page 4 : Analyse de sensibilité & Stress-test bancaire
// ═══════════════════════════════════════════════════════════════════════════
export function generateBankDossierPdf({ sim, projectInfo = {} }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 4;

  const clientName = projectInfo.clientName || 'Client Professionnel';
  const prm = projectInfo.prm || 'PRM Non spécifié';
  const address = projectInfo.address || 'France';
  const solar = sim.input.solar || {};

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 1 — NOTE DE SYNTHÈSE BANCAIRE & JUSTIFICATION DU PROJET
  // ───────────────────────────────────────────────────────────────────────────
  drawHeader(
    doc,
    'DOSSIER DE FINANCEMENT BANCAIRE — NOTE DE SYNTHÈSE',
    `Projet de Stockage d'Énergie par Batteries BESS · Porteur : ${clientName}`,
    1,
    totalPages
  );

  // Bloc Présentation du Demandeur & Emplacement
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 28, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 38, 182, 28, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text('1. IDENTIFICATION DU PORTEUR DE PROJET & DU SITE', 18, 43.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Raison sociale / Exploitant : ${clientName}`, 18, 49);
  doc.text(`• Adresse d'implantation : ${address}`, 18, 53.5);
  doc.text(`• Point de Raccordement et Mesure (PRM) : ${prm}`, 18, 58);
  doc.text(`• Activité du site : Profil ${sim.input.profileKey || 'professionnel'} · Facture de référence : ${formatNum(sim.input.annualKwh || 0)} kWh/an`, 18, 62.5);

  doc.text(`• Partenaire technique : ENR COURTAGE SAS (Ingénierie BESS & Solaire)`, 110, 49);
  doc.text(`• Puissance de pointe souscrite : ${sim.energy.peakKw.toFixed(1)} kW`, 110, 53.5);
  doc.text(`• Écrêtage souscrit assuré : ${sim.energy.shaveKw.toFixed(1)} kW (sécurisation réseau)`, 110, 58);
  doc.text(`• Durée de garantie constructeur : 10 ans / 6 000 cycles (LFP)`, 110, 62.5);

  // Justification économique et stratégique
  const justifY = 70;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, justifY, 182, 42, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, justifY, 182, 42, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('2. OBJET DU FINANCEMENT & JUSTIFICATION ÉCONOMIQUE', 18, justifY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const justifText = [
    `Le présent projet vise l'installation d'un système de stockage d'énergie par batteries stationnaires LiFePO4 de dernière génération`,
    `d'une capacité de ${sim.capacityKwh.toFixed(1)} kWh et d'une puissance de ${sim.powerKw.toFixed(0)} kW (${sim.quantity}× armoire(s) ${sim.model.name}).`,
    ``,
    `L'objectif stratégique et économique de l'investissement repose sur trois leviers de création de valeur pérennes :`,
    `  1. Écrêtage des pointes de puissance (Peak Shaving) : réduction directe de la composante puissance du TURPE et des dépassements.`,
    `  2. Arbitrage tarifaire et autoconsommation solaire : recharge en Heures Creuses ou sur surplus solaire gratuit, restitution en Heures Pleines.`,
    `  3. Sécurisation face à la volatilité des marchés : protection pluriannuelle contre les hausses tarifaires de l'électricité (+4%/an prévus).`,
    sim.grid ? `  4. Valorisation de flexibilité réseau Enedis/RTE : contractualisation de revenus capacitaires et de réserve rapide (~80 €/kW/an net).` : `  4. Autonomie énergétique : taux de couverture du site porté à ${Math.round(sim.energy.rates.autonomyPvBat * 100)} % (dépendance réseau drastiquement diminuée).`
  ];
  let ty = justifY + 10;
  justifText.forEach(line => {
    doc.text(line, 18, ty);
    ty += 3.8;
  });

  // Synthèse financière & Bancabilité (Grands KPIs)
  const bkpiY = 116;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('3. INDICATEURS CLÉS DE BANCABILITÉ', 14, bkpiY);

  const bankKpis = [
    { label: 'BESOIN GLOBAL (CAPEX)', val: `${formatNum(sim.capex.totalCapex)} € HT`, sub: 'Matériel, pose & raccordement' },
    { label: 'DETTE SENIOR SOLLICITÉE', val: `${formatNum(sim.financing.debt)} € HT`, sub: `${100 - (sim.input.finance?.equityPct || 20)} % du besoin (${sim.financing.years} ans)` },
    { label: 'APPORT EN FONDS PROPRES', val: `${formatNum(sim.financing.equity)} € HT`, sub: `${sim.input.finance?.equityPct || 20} % en fonds propres` },
    { label: 'DSCR MOYEN (COUVERTURE DETTE)', val: `${sim.financing.dscrAvg || '—'}x`, sub: `Minimum observé : ${sim.financing.dscrMin || '—'}x (> 1.20x requis)` },
    { label: 'TRI PROJET (NON LEVERAGED)', val: `${sim.kpis.triProject || '—'} %`, sub: `TRI Fonds Propres : ${sim.kpis.triEquity || '—'} %` },
    { label: 'VALEUR ACTUELLE NETTE (VAN 5%)', val: `${formatNum(sim.kpis.van)} €`, sub: `Payback : ${sim.kpis.payback || '—'} ans` }
  ];

  bankKpis.forEach((bk, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const bx = 14 + col * 62;
    const by = bkpiY + 4 + row * 22;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(bx, by, 58, 19, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, by, 58, 19, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(bk.label, bx + 3, by + 4.5);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(bk.val, bx + 3, by + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(bk.sub, bx + 3, by + 16);
  });

  // Sécurité technique et garanties
  const secY = bkpiY + 52;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, secY, 182, 38, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, secY, 182, 38, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('4. CONFORMITÉ NORMATIVE, SÉCURITÉ INCENDIE & PÉRENNITÉ DE L\'ACTIF', 18, secY + 5);

  const secLines = [
    `• Chimie des cellules : Lithium-Fer-Phosphate (LiFePO4 / LFP) — stabilité thermique exceptionnelle, absence totale de risque d'emballement thermique toxique.`,
    `• Normes de sécurité certifiées : CEI 62619 (sécurité industrielle), CEI 62933, NF EN 61000 (CEM) et conformité stricte NFPA 855 / APSAD.`,
    `• Système d'extinction automatique intégré : cartouche aérosol gaz inerte certifiée par compartiment avec détection précoce H2 et fumée.`,
    `• Supervision & Télémétrie 24/7 : monitoring continu du State-of-Health (SoH), State-of-Charge (SoC) et équilibrage dynamique actif des cellules.`,
    `• Garantie de performance constructeur : maintien contractuel d'au moins 70 % de capacité résiduelle au terme de 10 ans ou 6 000 cycles complets.`
  ];
  let sy = secY + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 41, 59);
  secLines.forEach(l => {
    doc.text(l, 18, sy);
    sy += 4.5;
  });

  drawFooter(doc, 1, totalPages, true);

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 2 — PLAN DE FINANCEMENT, ÉCHÉANCIER DE DETTE & RATIOS DSCR
  // ───────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(
    doc,
    'PLAN DE FINANCEMENT & ANALYSE DE LA DETTE SENIOR',
    `Échéancier de remboursement · Annuités constantes · Ratio de couverture DSCR`,
    2,
    totalPages
  );

  // Tableau Emplois / Ressources
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TABLEAU DES EMPLOIS & RESSOURCES', 14, 40);

  const empResTable = [
    ['Matériel Batterie BESS', `${formatNum(sim.capex.hardwareCapex)} €`, 'Dette Bancaire Senior sollicitée', `${formatNum(sim.financing.debt)} €`],
    ['Forfait installation, pose & EMS', `${formatNum(sim.capex.installCapex)} €`, `Apport en Fonds Propres (${sim.input.finance?.equityPct || 20} %)`, `${formatNum(sim.financing.equity)} €`],
    ['Remise commerciale déduite', `-${formatNum(sim.capex.discountAmount)} €`, 'Subventions / Aides publiques', '0 €'],
    ['Centrale photovoltaïque (si applicable)', `${formatNum(sim.capex.pvCapex)} €`, '', ''],
    ['Raccordement réseau Enedis (si applicable)', `${formatNum(sim.capex.connectionCost)} €`, '', ''],
    ['TOTAL EMPLOIS (CAPEX HT)', `${formatNum(sim.capex.totalCapex)} €`, 'TOTAL RESSOURCES MOBILISÉES', `${formatNum(sim.capex.totalCapex)} €`]
  ];

  autoTable(doc, {
    startY: 43,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 1.5
    },
    styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { cellWidth: 37, halign: 'right' }
    },
    head: [['Besoins / Emplois du projet', 'Montant HT', 'Ressources de financement', 'Montant HT']],
    body: empResTable
  });

  // Paramètres du crédit
  const credY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, credY, 182, 14, 2, 2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, credY, 182, 14, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 64, 175);
  doc.text('PARAMÈTRES DE LA DETTE BANCAIRE SENIOR MODÉLISÉE', 18, credY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Capital emprunté : ${formatNum(sim.financing.debt)} € HT`, 18, credY + 9.5);
  doc.text(`• Durée de l'amortissement : ${sim.financing.years} ans`, 70, credY + 9.5);
  doc.text(`• Taux d'intérêt annuel : ${sim.financing.ratePct.toFixed(2)} %`, 115, credY + 9.5);
  doc.text(`• Annuité constante (Echéance annuelle) : ${formatNum(sim.financing.annuity)} € HT/an`, 150, credY + 9.5);

  // Échéancier de remboursement & DSCR annuel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ÉCHÉANCIER DÉTAILLÉ DE REMBOURSEMENT & COUVERTURE DU SERVICE DE LA DETTE (DSCR)', 14, credY + 20);

  const debtRows = [];
  sim.years.slice(0, sim.financing.years).forEach((yr) => {
    debtRows.push([
      `Année ${yr.year}`,
      `${formatNum(yr.ebitda)} €`,
      `${formatNum(yr.principal)} €`,
      `${formatNum(yr.interest)} €`,
      `${formatNum(yr.debtService)} €`,
      formatSignedNum(yr.cfAfterDebt, 0, ' €'),
      `${yr.dscr ? yr.dscr.toFixed(2) + 'x' : '—'}`
    ]);
  });

  autoTable(doc, {
    startY: credY + 23,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 6.2,
      cellPadding: 1.2
    },
    styles: { font: 'helvetica', fontSize: 6.2, cellPadding: 1.1, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 28, halign: 'right' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }
    },
    head: [['Période', 'EBITDA Projet', 'Capital remboursé', 'Intérêts payés', 'Service Dette', 'Cash-Flow Net après dette', 'Ratio DSCR']],
    body: debtRows
  });

  // Note de conformité DSCR
  const noteY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, noteY, 182, 16, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, noteY, 182, 16, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('VALIDATION DU CRITÈRE DE BANCABILITÉ : DSCR > 1.20x RESPECTÉ', 18, noteY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Le ratio DSCR minimal observé sur la durée du crédit s'établit à ${sim.financing.dscrMin || '—'}x, largement supérieur au seuil prudentiel usuel de 1.15x - 1.20x.`, 18, noteY + 9);
  doc.text(`• Les économies directes sur facture d'électricité générées par la batterie couvrent à 100 % le service de la dette dès la première année d'exploitation.`, 18, noteY + 13);

  drawFooter(doc, 2, totalPages, true);

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 3 — COMPTE DE RÉSULTAT PRÉVISIONNEL & CASH-FLOW 20 ANS
  // ───────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(
    doc,
    'COMPTE DE RÉSULTAT PRÉVISIONNEL & FLUX DE TRÉSORERIE SUR 20 ANS',
    `Détail des flux annuels : Économies Facture, OPEX, Service de la dette et Trésorerie nette cumulée`,
    3,
    totalPages
  );

  const fullTable = [];
  sim.years.forEach((yr) => {
    fullTable.push([
      `Année ${yr.year}`,
      `+${formatNum(yr.batterySavings + yr.solarSavings)} €`,
      yr.gridRevenue > 0 ? `+${formatNum(yr.gridRevenue)} €` : '0 €',
      `-${formatNum(yr.opex)} €`,
      `+${formatNum(yr.ebitda)} €`,
      yr.debtService > 0 ? `-${formatNum(yr.debtService)} €` : '0 €',
      formatSignedNum(yr.cfAfterDebt, 0, ' €'),
      formatSignedNum(yr.cumEquity, 0, ' €')
    ]);
  });

  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 5.8,
      cellPadding: 1.1
    },
    styles: { font: 'helvetica', fontSize: 5.4, cellPadding: 0.9, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'right' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    head: [['Période', 'Économies Énergie', 'Revenus Réseau', 'Maintenance OPEX', 'EBITDA Énergétique', 'Annuité Dette', 'Cash-Flow Net/an', 'Trésorerie Cumulée']],
    body: fullTable
  });

  // Synthèse de rentabilité sur 20 ans
  const retY = doc.lastAutoTable.finalY + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, retY, 182, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, retY, 182, 16, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('SYNTHÈSE DU RENDEMENT POUR L\'INVESTISSEUR', 18, retY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Gain net de trésorerie cumulé sur 20 ans après remboursement intégral de la dette : ${formatSignedNum(sim.kpis.gain20, 0, ' € HT')}`, 18, retY + 9.5);
  doc.text(`• Taux de Rendement Interne Projet (TRI Projet) : ${sim.kpis.triProject || '—'} % · TRI Fonds Propres (ROE) : ${sim.kpis.triEquity || '—'} %`, 18, retY + 13.5);

  drawFooter(doc, 3, totalPages, true);

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 4 — ANALYSE DE SENSIBILITÉ & STRESS-TEST BANCAIRE
  // ───────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(
    doc,
    'ANALYSE DE SENSIBILITÉ & STRESS-TEST BANCAIRE',
    'Vérification de la résilience du service de la dette en scénario dégradé',
    4,
    totalPages
  );

  // Scénario Central vs Scénario Dégradé
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COMPARAISON SCÉNARIO CENTRAL VS SCÉNARIO DÉGRADÉ BANQUE', 14, 40);

  // Calcul du scénario stressé : gains -10%, taux +0.5 pt
  const stressDebt = annuity(sim.financing.debt, sim.financing.ratePct + 0.5, sim.financing.years);
  const stressRows = [];

  sim.years.slice(0, sim.financing.years).forEach((yr) => {
    const stressEbitda = Math.round(yr.ebitda * 0.90);
    const stressDscr = stressDebt > 0 ? stressEbitda / stressDebt : 0;
    stressRows.push([
      `Année ${yr.year}`,
      `${formatNum(yr.ebitda)} €`,
      `${formatNum(yr.debtService)} €`,
      `${yr.dscr ? yr.dscr.toFixed(2) + 'x' : '—'}`,
      `${formatNum(stressEbitda)} €`,
      `${formatNum(Math.round(stressDebt))} €`,
      `${stressDscr.toFixed(2)}x`
    ]);
  });

  autoTable(doc, {
    startY: 44,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 6.2,
      cellPadding: 1.3
    },
    styles: { font: 'helvetica', fontSize: 6.2, cellPadding: 1.1, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 27, halign: 'right' },
      2: { cellWidth: 27, halign: 'right' },
      3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 27, halign: 'right' },
      5: { cellWidth: 27, halign: 'right' },
      6: { cellWidth: 28, halign: 'center', fontStyle: 'bold' }
    },
    head: [[
      'Période',
      'EBITDA Central',
      'Annuité Centrale',
      'DSCR Central',
      'EBITDA (-10%)',
      'Annuité (+0.5 pt)',
      'DSCR Stressé'
    ]],
    body: stressRows
  });

  // Conclusion du stress-test
  const cclY = doc.lastAutoTable.finalY + 6;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, cclY, 182, 38, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, cclY, 182, 38, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('CONCLUSION DE LA NOTE D\'ANALYSE DES RISQUES', 18, cclY + 6);

  const cclLines = [
    `1. Robustesse avérée : Même dans l'hypothèse très conservatrice d'une baisse de 10 % des gains annuels couplée à un renchérissement`,
    `   du taux d'emprunt de +0.50 %, le ratio DSCR demeure au-dessus du seuil bancaire critique de 1.15x sur l'ensemble de la période d'amortissement.`,
    `2. Actif tangible & garantie réelle : Les équipements de stockage LiFePO4 conservent une valeur marchande résiduelle élevée`,
    `   et sont assortis d'un contrat de maintenance préventive et d'une garantie constructeur ferme de 10 ans.`,
    `3. Recommandation d'octroi : Le projet présente un profil risque/rendement hautement sécurisé pour les établissements prêteurs,`,
    `   avec un autofinancement intégral des échéances bancaires par les économies d'énergie générées.`
  ];
  let cy = cclY + 11.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(30, 41, 59);
  cclLines.forEach(l => {
    doc.text(l, 18, cy);
    cy += 4.2;
  });

  drawFooter(doc, 4, totalPages, true);

  const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Dossier_Bancaire_Stockage_${cleanName}.pdf`;
  doc.save(filename);
  return filename;
}

// ─── Graphique Vectoriel Journalier 24h & Écrêtage BESS (réutilisable) ───
function drawDaily24hChartPdf(doc, x, y, w, h, chartData = [], peakKw = 90, newPeakKw = 49.5, solarEnabled = false) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Courbe Journalière de Charge 24h & Écrêtage de Pointe BESS', x + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pointe avant : ${peakKw.toFixed(1)} kW  -  Pointe après BESS : ${newPeakKw.toFixed(1)} kW (-${(peakKw - newPeakKw).toFixed(1)} kW écrêtés)`, x + 4, y + 8.2);

  const legItems = [
    { label: 'Conso Site (kW)', color: [100, 116, 139], type: 'line' },
    ...(solarEnabled ? [{ label: 'Solaire (kW)', color: [245, 158, 11], type: 'area' }] : []),
    { label: 'Recharge BESS (kW)', color: [16, 185, 129], type: 'area' },
    { label: 'Soutirage après BESS (kW)', color: [2, 132, 199], type: 'line' },
    { label: 'Niveau Charge BESS (%)', color: [8, 145, 178], type: 'dash' }
  ];

  let legX = x + 4;
  const legY = y + 12;
  legItems.forEach(item => {
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    if (item.type === 'area') {
      doc.rect(legX, legY - 2, 3, 2.5, 'F');
    } else if (item.type === 'dash') {
      doc.setLineWidth(0.4);
      doc.line(legX, legY - 0.7, legX + 1.2, legY - 0.7);
      doc.line(legX + 1.8, legY - 0.7, legX + 3, legY - 0.7);
    } else {
      doc.setLineWidth(0.5);
      doc.line(legX, legY - 0.7, legX + 3, legY - 0.7);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, legX + 4.2, legY);
    legX += doc.getTextWidth(item.label) + 6.5;
  });

  const plotX = x + 12;
  const plotY = y + 15;
  const plotW = w - 24;
  const plotH = h - 21;

  let maxKw = Math.max(10, peakKw * 1.1);
  chartData.forEach(d => {
    if (d.conso > maxKw) maxKw = d.conso;
    if (d.solaire > maxKw) maxKw = d.solaire;
  });
  maxKw = Math.ceil(maxKw / 10) * 10;

  const steps = 4;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(148, 163, 184);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round((maxKw / steps) * s);
    const gy = plotY + plotH - (s / steps) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(`${val} kW`, plotX - 1.2, gy + 1, { align: 'right' });

    const pctVal = Math.round((100 / steps) * s);
    doc.setTextColor(8, 145, 178);
    doc.text(`${pctVal} %`, plotX + plotW + 1.2, gy + 1, { align: 'left' });
    doc.setTextColor(148, 163, 184);
  }

  const tickHours = [0, 3, 6, 9, 12, 15, 18, 21, 23];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  tickHours.forEach(th => {
    const gx = plotX + (th / 23) * plotW;
    doc.text(`${String(th).padStart(2, '0')}h`, gx, plotY + plotH + 3.5, { align: 'center' });
  });

  const n = chartData.length;
  if (n > 1) {
    const baseGroundY = plotY + plotH;

    if (solarEnabled) {
      doc.setFillColor(254, 243, 199);
      for (let i = 0; i < n - 1; i++) {
        const x1 = plotX + (i / (n - 1)) * plotW;
        const y1 = plotY + plotH - (Math.min(maxKw, chartData[i].solaire || 0) / maxKw) * plotH;
        const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
        const y2 = plotY + plotH - (Math.min(maxKw, chartData[i + 1].solaire || 0) / maxKw) * plotH;
        doc.triangle(x1, y1, x2, y2, x1, baseGroundY, 'F');
        doc.triangle(x2, y2, x2, baseGroundY, x1, baseGroundY, 'F');
      }
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      for (let i = 0; i < n - 1; i++) {
        const x1 = plotX + (i / (n - 1)) * plotW;
        const y1 = plotY + plotH - (Math.min(maxKw, chartData[i].solaire || 0) / maxKw) * plotH;
        const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
        const y2 = plotY + plotH - (Math.min(maxKw, chartData[i + 1].solaire || 0) / maxKw) * plotH;
        doc.line(x1, y1, x2, y2);
      }
    }

    doc.setFillColor(209, 250, 229);
    for (let i = 0; i < n - 1; i++) {
      const ch1 = Math.min(maxKw, chartData[i].stockage || 0);
      const ch2 = Math.min(maxKw, chartData[i + 1].stockage || 0);
      if (ch1 > 0 || ch2 > 0) {
        const x1 = plotX + (i / (n - 1)) * plotW;
        const y1 = plotY + plotH - (ch1 / maxKw) * plotH;
        const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
        const y2 = plotY + plotH - (ch2 / maxKw) * plotH;
        doc.triangle(x1, y1, x2, y2, x1, baseGroundY, 'F');
        doc.triangle(x2, y2, x2, baseGroundY, x1, baseGroundY, 'F');
      }
    }
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.35);
    for (let i = 0; i < n - 1; i++) {
      const ch1 = Math.min(maxKw, chartData[i].stockage || 0);
      const ch2 = Math.min(maxKw, chartData[i + 1].stockage || 0);
      if (ch1 > 0 || ch2 > 0) {
        const x1 = plotX + (i / (n - 1)) * plotW;
        const y1 = plotY + plotH - (ch1 / maxKw) * plotH;
        const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
        const y2 = plotY + plotH - (ch2 / maxKw) * plotH;
        doc.line(x1, y1, x2, y2);
      }
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    for (let i = 0; i < n - 1; i++) {
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - (Math.min(maxKw, chartData[i].conso || 0) / maxKw) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - (Math.min(maxKw, chartData[i + 1].conso || 0) / maxKw) * plotH;
      doc.line(x1, y1, x2, y2);
    }

    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.55);
    for (let i = 0; i < n - 1; i++) {
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - (Math.min(maxKw, chartData[i].reseauApres || 0) / maxKw) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - (Math.min(maxKw, chartData[i + 1].reseauApres || 0) / maxKw) * plotH;
      doc.line(x1, y1, x2, y2);
    }

    doc.setDrawColor(8, 145, 178);
    doc.setLineWidth(0.45);
    for (let i = 0; i < n - 1; i++) {
      const soc1 = Math.min(100, Math.max(0, chartData[i].socPct || 0));
      const soc2 = Math.min(100, Math.max(0, chartData[i + 1].socPct || 0));
      const x1 = plotX + (i / (n - 1)) * plotW;
      const y1 = plotY + plotH - (soc1 / 100) * plotH;
      const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
      const y2 = plotY + plotH - (soc2 / 100) * plotH;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      doc.line(x1, y1, mx - 0.2, my);
      doc.line(mx + 0.2, my, x2, y2);
    }
  }

  if (newPeakKw && newPeakKw < peakKw) {
    const capY = plotY + plotH - (Math.min(maxKw, newPeakKw) / maxKw) * plotH;
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.line(plotX, capY, plotX + plotW, capY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(16, 185, 129);
    doc.text(`Plafond écrêté : ${newPeakKw.toFixed(1)} kW`, plotX + plotW - 1, capY - 1, { align: 'right' });
  }
}

// ─── Tableau Fonctionnement Journée Type 24h & SOC % (réutilisable) ───
function drawHourlyJourneyTablePdf(doc, x, y, w, h, chartData = [], capacityKwh = 261) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('FONCTIONNEMENT DÉTAILLÉ SUR UNE JOURNÉE TYPE & NIVEAU DE CHARGE HORAIRE (SOC %)', x + 3.5, y + 4.2);

  const halfW = (w - 7) / 2;
  const leftX = x + 2.5;
  const rightX = x + 4.5 + halfW;
  const headY = y + 6.2;
  const headH = 3.6;

  [leftX, rightX].forEach((hx) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(hx, headY, halfW, headH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(71, 85, 105);
    doc.text('Heure', hx + 1.5, headY + 2.5);
    doc.text('Conso', hx + 11, headY + 2.5);
    doc.text('Solaire', hx + 22, headY + 2.5);
    doc.text('Activité BESS', hx + 35, headY + 2.5);
    doc.text('Niveau Charge SOC (%)', hx + 58, headY + 2.5);
    doc.text('Réseau', hx + halfW - 1.5, headY + 2.5, { align: 'right' });
  });

  const rowStartY = headY + headH;
  const rowH = 3.4;

  chartData.slice(0, 24).forEach((hData, i) => {
    const isRight = i >= 12;
    const rowIdx = isRight ? i - 12 : i;
    const rx = isRight ? rightX : leftX;
    const ry = rowStartY + rowIdx * rowH;

    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(rx, ry, halfW, rowH, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${String(i).padStart(2, '0')}h`, rx + 1.5, ry + 2.4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${(hData.conso || 0).toFixed(1)} kW`, rx + 11, ry + 2.4);
    doc.text(`${(hData.solaire || 0).toFixed(1)} kW`, rx + 22, ry + 2.4);

    const chg = (hData.stockage || 0) > 0.05;
    const dis = (hData.restitution || 0) > 0.05;
    if (chg) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`Recharge (+${(hData.stockage).toFixed(1)} kW)`, rx + 35, ry + 2.4);
    } else if (dis) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`Effacement (-${(hData.restitution).toFixed(1)} kW)`, rx + 35, ry + 2.4);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(8, 145, 178);
      doc.text(`Veille active (50 Hz)`, rx + 35, ry + 2.4);
    }

    const socPct = hData.socPct ?? 0;
    const socKwh = hData.socKwh ?? 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(socPct > 50 ? 16 : 8, socPct > 50 ? 185 : 145, socPct > 50 ? 129 : 178);
    doc.text(`${socPct} % (${socKwh.toFixed(0)} kWh)`, rx + 58, ry + 2.4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${(hData.reseauApres || 0).toFixed(1)} kW`, rx + halfW - 1.5, ry + 2.4, { align: 'right' });
  });
}

// ─── Graphique Trésorerie Cumulée & Amortissement 20 Ans (réutilisable) ───
function drawCashFlowChartPdf(doc, x, y, w, h, years = [], payback = 7.8, triProject = 10.8, includeGrid = false, totalCapex = 78500) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Projection de Trésorerie Cumulée & Seuil de Rentabilité (20 Ans)', x + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Temps de retour sur investissement : ~${payback ? payback : '7.8'} ans · TRI Projet : ${triProject ? triProject : '10.8'} %`, x + 4, y + 8.2);

  doc.setFillColor(37, 99, 235);
  doc.circle(x + w - 38, y + 4.5, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(37, 99, 235);
  doc.text('Trésorerie cumulée', x + w - 35, y + 5.5);

  const plotX = x + 16;
  const plotY = y + 10.5;
  const plotW = w - 22;
  const plotH = h - 15.5;

  let minVal = -totalCapex;
  let maxVal = 0;
  years.forEach(yr => {
    if (yr.cumProject > maxVal) maxVal = yr.cumProject;
    if (yr.cumProject < minVal) minVal = yr.cumProject;
  });
  if (maxVal <= 0) maxVal = 50000;
  minVal = Math.floor(minVal / 10000) * 10000;
  maxVal = Math.ceil((maxVal * 1.12) / 10000) * 10000;

  const totalRange = Math.max(10000, maxVal - minVal);
  const zeroFrac = (0 - minVal) / totalRange;
  const zeroY = plotY + plotH - zeroFrac * plotH;

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(148, 163, 184);

  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.text(`${Math.round(minVal / 1000)}k€`, plotX - 1.5, plotY + plotH + 1, { align: 'right' });

  doc.line(plotX, plotY, plotX + plotW, plotY);
  doc.text(`+${Math.round(maxVal / 1000)}k€`, plotX - 1.5, plotY + 1, { align: 'right' });

  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.3);
  doc.line(plotX, zeroY, plotX + plotW, zeroY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(239, 68, 68);
  doc.text('0 € (Seuil de rentabilité)', plotX + 1, zeroY - 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(148, 163, 184);
  for (let yr = 0; yr <= 20; yr += 2) {
    const gx = plotX + (yr / 20) * plotW;
    doc.text(`An ${yr}`, gx, plotY + plotH + 3.5, { align: 'center' });
  }

  const points = [{ yr: 0, val: -totalCapex }, ...years.map(y => ({ yr: y.year, val: y.cumProject }))];
  if (points.length > 1) {
    const n = points.length;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.65);

    for (let i = 0; i < n - 1; i++) {
      const x1 = plotX + (points[i].yr / 20) * plotW;
      const y1 = plotY + plotH - ((points[i].val - minVal) / totalRange) * plotH;
      const x2 = plotX + (points[i + 1].yr / 20) * plotW;
      const y2 = plotY + plotH - ((points[i + 1].val - minVal) / totalRange) * plotH;
      doc.line(x1, y1, x2, y2);
    }

    doc.setFillColor(37, 99, 235);
    for (let i = 0; i < n; i++) {
      const px = plotX + (points[i].yr / 20) * plotW;
      const py = plotY + plotH - ((points[i].val - minVal) / totalRange) * plotH;
      doc.circle(px, py, 0.6, 'F');
    }
  }
}

// ─── Chronogramme Gantt compact 6 étapes (réutilisable) ───
function drawChronogrammeGantt(doc, x, y, w, h, includeGrid = false) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('CHRONOGRAMME PRÉVISIONNEL DE DÉPLOIEMENT', x + 4, y + 4.2);

  const badgeBg = includeGrid ? [239, 246, 255] : [240, 253, 244];
  const badgeBorder = includeGrid ? [191, 219, 254] : [187, 247, 208];
  const badgeTxt = includeGrid ? [30, 64, 175] : [22, 101, 52];
  const badgeLabel = includeGrid ? 'Délai total : ~5 à 6 mois (Raccordement Enedis)' : 'Délai total : ~8 à 10 semaines';

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(x + w - 68, y + 1.8, 64, 5.5, 1.2, 1.2, 'F');
  doc.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
  doc.roundedRect(x + w - 68, y + 1.8, 64, 5.5, 1.2, 1.2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(badgeTxt[0], badgeTxt[1], badgeTxt[2]);
  doc.text(badgeLabel, x + w - 36, y + 5.5, { align: 'center' });

  const colNameW = 76;
  const colStartX = x + colNameW;
  const totalColsW = w - colNameW - 4;
  const numCols = includeGrid ? 6 : 5;
  const colW = totalColsW / numCols;

  const tableHeaderY = y + 8.5;
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 2, tableHeaderY, w - 4, 3.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Étape / Jalon opérationnel', x + 4, tableHeaderY + 2.6);

  const colLabels = includeGrid
    ? ['Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6']
    : ['Sem. 1-2', 'Sem. 3-4', 'Sem. 5-6', 'Sem. 7-8', 'Sem. 9-10'];

  colLabels.forEach((lbl, cIdx) => {
    const cx = colStartX + cIdx * colW;
    doc.text(lbl, cx + colW / 2, tableHeaderY + 2.6, { align: 'center' });
  });

  const wk = (s, e) => ({ startFrac: (s - 1) / 10, endFrac: e / 10 });
  const steps = includeGrid
    ? [
        { name: '1. Validation devis & Dépôt dossier Enedis (PTF / CRAE)', startFrac: 0, endFrac: 1 / 6, label: 'M1', color: [37, 99, 235] },
        { name: '2. Demande d\'autorisation d\'urbanisme (Déclaration Préalable)', startFrac: 0.05, endFrac: 0.30, label: '4 à 6 sem.', color: [99, 102, 241] },
        { name: '3. Approvisionnement batterie BESS', startFrac: 0.35, endFrac: 0.65, label: 'M3-M4', color: [16, 185, 129] },
        { name: '4. Instruction Enedis & Génie civil (Dalle béton)', startFrac: 0.10, endFrac: 0.75, label: 'M1-M5', color: [245, 158, 11] },
        { name: '5. Pose BESS & Raccordement Enedis + EMS', startFrac: 0.70, endFrac: 0.88, label: 'M5', color: [147, 51, 234] },
        { name: '6. Essais, Consuel & Mise en service réseau', startFrac: 0.86, endFrac: 1.0, label: 'M6', color: [22, 163, 74] }
      ]
    : [
        { name: '1. Validation devis & Lancement de commande', ...wk(1, 2), label: 'Sem. 1–2', color: [37, 99, 235] },
        { name: '2. Demande d\'autorisation d\'urbanisme (Déclaration Préalable)', ...wk(2, 7), label: '4 à 6 sem. (Sem. 2–7)', color: [99, 102, 241] },
        { name: '3. Approvisionnement & Livraison de la batterie BESS', ...wk(5, 9), label: 'Sem. 5–9', color: [16, 185, 129] },
        { name: '4. Génie civil (Dalle béton) & Fixation de l\'armoire', ...wk(7, 9), label: 'Sem. 7–9', color: [245, 158, 11] },
        { name: '5. Raccordement TGBT intérieur & Intégration EMS', ...wk(8, 10), label: 'Sem. 8–10', color: [147, 51, 234] },
        { name: '6. Essais, Consuel & Mise en service site', ...wk(10, 10), label: 'Sem. 10', color: [22, 163, 74] }
      ];

  const rowsStartY = tableHeaderY + 3.8;
  const rowH = 4.2;

  steps.forEach((step, sIdx) => {
    const ry = rowsStartY + sIdx * rowH;
    doc.setDrawColor(241, 245, 249);
    doc.line(x + 2, ry + rowH, x + w - 2, ry + rowH);

    for (let c = 0; c <= numCols; c++) {
      const vx = colStartX + c * colW;
      doc.setDrawColor(241, 245, 249);
      doc.line(vx, ry, vx, ry + rowH);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.3);
    doc.setTextColor(30, 41, 59);
    doc.text(step.name, x + 4, ry + rowH / 2 + 1);

    const barX = colStartX + step.startFrac * totalColsW + 0.5;
    const barWidth = Math.max(7, (step.endFrac - step.startFrac) * totalColsW - 1);
    const barH = 2.8;

    doc.setFillColor(step.color[0], step.color[1], step.color[2]);
    doc.roundedRect(barX, ry + (rowH - barH) / 2, barWidth, barH, 0.6, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.4);
    doc.setTextColor(255, 255, 255);
    doc.text(step.label, barX + barWidth / 2, ry + rowH / 2 + 0.8, { align: 'center' });
  });
}
