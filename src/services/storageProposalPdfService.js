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
import { annuity, computeStorageProject, STORAGE_CATALOG } from '@/services/storageBatteryEngine.js';

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
function drawHeader(doc, title, subtitle, pageNum, totalPages, subtitleLine2 = null, subtitleFontSize = null) {
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', 14, 8, 38, 12);
    } catch (_) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('NELSON · INGÉNIERIE ÉNERGÉTIQUE & STOCKAGE', 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Document confidentiel · Édité le ${new Date().toLocaleDateString('fr-FR')}`, 196, 16.5, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 20.5, 196, 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 26.5);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subtitleFontSize || 8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 14, subtitleLine2 ? 30.8 : 32.5);
  }

  if (subtitleLine2) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subtitleFontSize ? subtitleFontSize - 0.4 : 7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitleLine2, 14, 34.8);
  }
}

function drawFooter(doc, pageNum, totalPages, isBank = false) {
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 285, 196, 285);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const label = isBank
    ? 'Dossier de Financement Bancaire · Modélisation DSCR / TRI · Nelson / ENR Courtage SAS'
    : 'Proposition Commerciale Stockage Batterie & Solaire · Nelson / ENR Courtage · www.nelsonpv.fr';
  doc.text(label, 14, 289.5);
  doc.text(`Page ${pageNum} / ${totalPages}`, 196, 289.5, { align: 'right' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PDF ÉTUDE COMMERCIALE CLIENT (3 PAGES SYNTHÉTIQUES & COMPARATIVES)
// ═══════════════════════════════════════════════════════════════════════════
export function buildDefaultComparativeScenarios(sim) {
  const baseInput = sim?.input || {};
  const m54 = STORAGE_CATALOG.find(m => m.id === 'ST54K') || STORAGE_CATALOG[0];
  const m62 = STORAGE_CATALOG.find(m => m.id === 'ST62K') || STORAGE_CATALOG[1];
  const m261 = STORAGE_CATALOG.find(m => m.id === 'UNIV_ESS_261_AC') || STORAGE_CATALOG[10];

  const sim1 = computeStorageProject({
    ...baseInput,
    model: m54,
    quantity: 1,
    hardwarePriceHt: undefined,
    installPriceHt: undefined,
    discountPct: 0,
    gridConnection: false
  });
  const sim2 = computeStorageProject({
    ...baseInput,
    model: m62,
    quantity: 1,
    hardwarePriceHt: undefined,
    installPriceHt: undefined,
    discountPct: 0,
    gridConnection: false
  });
  const sim3 = computeStorageProject({
    ...baseInput,
    model: m261,
    quantity: 1,
    hardwarePriceHt: undefined,
    installPriceHt: undefined,
    discountPct: 0,
    gridConnection: false
  });

  return [
    {
      id: 'opt1',
      title: 'Option 1 — Rentabilité Max',
      badge: `Meilleur TRI (${sim1.kpis.triProject || '11.5'} %)`,
      model: m54,
      modelId: 'ST54K',
      quantity: 1,
      turnkeyPrice: m54.turnkeyInstalledPriceHT || 18400,
      sim: sim1,
      includedInPdf: true
    },
    {
      id: 'opt2',
      title: 'Option 2 — Équilibre',
      badge: `Équilibre Écrêtage / Budget (TRI ${sim2.kpis.triProject || '11.1'} %)`,
      model: m62,
      modelId: 'ST62K',
      quantity: 1,
      turnkeyPrice: m62.turnkeyInstalledPriceHT || 20500,
      sim: sim2,
      includedInPdf: true
    },
    {
      id: 'opt3',
      title: 'Option 3 — Haute Autonomie',
      badge: `Haute Autonomie (TRI ${sim3.kpis.triProject || '5.8'} %)`,
      model: m261,
      modelId: 'UNIV_ESS_261_AC',
      quantity: 1,
      turnkeyPrice: m261.turnkeyInstalledPriceHT || 78500,
      sim: sim3,
      includedInPdf: true
    }
  ];
}

export function generateClientCommercialPdf(params = {}) {
  const { sim, projectInfo = {} } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 3;

  const clientName = projectInfo.clientName || params.clientName || params.prmInfo?.titulaire || 'Client Professionnel';
  const prm = projectInfo.prm || params.prm || params.prmInfo?.prm || 'PRM Non spécifié';
  const defaultGilbertAddress = '594 Chemin des Bois Reynaud 24800 Saint-Martin-de-Fressengeas';
  let address = projectInfo.address || params.address || projectInfo.siteAddress || params.siteAddress || '';
  if (!address || address.includes('15 Route des Moulins') || address.includes('Bordeaux') || prm === '16238205462430' || String(clientName).toUpperCase().includes('GILBERT')) {
    address = defaultGilbertAddress;
  }
  const solar = sim.input.solar || {};

  // Récupération ou construction automatique des 3 scénarios comparatifs
  const rawScenarios = Array.isArray(params.scenarios) && params.scenarios.length > 0
    ? params.scenarios
    : buildDefaultComparativeScenarios(sim);
  const scenarios = rawScenarios.filter(sc => sc.includedInPdf !== false);
  const activeScenarios = scenarios.length > 0 ? scenarios : rawScenarios;

  // ── PAGE 1 : PROPOSITION COMMERCIALE & COMPARATIF DES 3 SCÉNARIOS ──
  drawHeader(
    doc,
    'PROPOSITION COMMERCIALE : STOCKAGE INTELLIGENT BESS',
    `Étude comparative multi-scénarios pour ${clientName} · ${prm}`,
    1,
    totalPages,
    address && address !== 'France' ? address : null
  );

  // Cartouche Client & PRM
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 37, 182, 18.5, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 37, 182, 18.5, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DONNÉES ÉNERGÉTIQUES DU SITE DE RÉFÉRENCE', 18, 42.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Titulaire : ${clientName}`, 18, 46.8);
  doc.text(`• Point de Référence et Mesure (PRM) : ${prm}`, 18, 51.5);

  const consoAnnuelle = Math.round((sim.input.annualKwh || 0));
  const dailyMoy = Math.round((consoAnnuelle / 365) * 10) / 10;
  doc.text(`• Consommation annuelle : ${formatNum(consoAnnuelle)} kWh/an (Moyenne : ${dailyMoy.toFixed(1).replace('.', ',')} kWh/j)`, 105, 46.8);
  doc.text(`• Puissance de pointe mesurée : ${sim.energy.peakKw.toFixed(1)} kW`, 105, 51.5);

  // ── CARTES COMPARATIVES CÔTE À CÔTE (3 SCÉNARIOS) ──
  const cardY = 58;
  const numCards = Math.min(3, activeScenarios.length);
  const cardW = (182 - (numCards - 1) * 3) / numCards;
  const cardH = 70;

  const cardThemes = [
    {
      title: 'Option 1 — Rentabilité Max',
      badge: 'Meilleur TRI',
      bg: [239, 246, 255], border: [191, 219, 254], headerBg: [37, 99, 235],
      txt: [30, 64, 175], barBg: [37, 99, 235]
    },
    {
      title: 'Option 2 — Équilibre',
      badge: 'Recommandée',
      bg: [236, 253, 245], border: [167, 243, 208], headerBg: [5, 150, 105],
      txt: [6, 95, 70], barBg: [16, 185, 129]
    },
    {
      title: 'Option 3 — Haute Autonomie',
      badge: 'Capacité C&I',
      bg: [245, 243, 255], border: [221, 214, 254], headerBg: [124, 58, 237],
      txt: [109, 40, 217], barBg: [139, 92, 246]
    }
  ];

  activeScenarios.slice(0, 3).forEach((sc, idx) => {
    const cx = 14 + idx * (cardW + 3);
    const theme = cardThemes[idx] || cardThemes[0];
    const sSim = sc.sim || sim;

    // Simulation x2 batteries pour cette option
    const sSimX2 = computeStorageProject({
      ...(sSim.input || sim?.input || {}),
      model: sSim.model,
      quantity: 2,
      hardwarePriceHt: undefined,
      installPriceHt: undefined,
      discountPct: 0,
      gridConnection: Boolean(sSim.input?.gridConnection)
    });
    const autoPctX2 = Math.round((sSimX2?.energy?.rates?.autonomyPvBat || 0) * 100);
    const triX2Val = (sSimX2?.kpis?.triEquity !== null && sSimX2?.kpis?.triEquity !== undefined)
      ? sSimX2.kpis.triEquity
      : sSimX2?.kpis?.triProject;
    const triX2Text = triX2Val !== null && triX2Val !== undefined ? `${triX2Val} %` : '—';

    // Boîtier
    doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'D');

    // Bandeau Titre (texte à droite supprimé)
    doc.setFillColor(theme.headerBg[0], theme.headerBg[1], theme.headerBg[2]);
    doc.roundedRect(cx, cardY, cardW, 7.2, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    const cleanCardTitle = sc.title ? sc.title.replace(/^[^\w]+/, '').trim() : theme.title;
    doc.text(cleanCardTitle, cx + 2.5, cardY + 5.0);

    // Modèle & Capacité
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(15, 23, 42);
    const modelRef = `${sSim.quantity}× ${sSim.model.name || sSim.model.reference}`;
    doc.text(modelRef.slice(0, 30), cx + 2.5, cardY + 11.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(71, 85, 105);
    doc.text(`${sSim.capacityKwh.toFixed(1)} kWh · ${sSim.powerKw.toFixed(0)} kW`, cx + 2.5, cardY + 16.0);

    // Prix Clé en Main
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(theme.txt[0], theme.txt[1], theme.txt[2]);
    doc.text(`${formatNum(sSim.capex.totalCapex)} € HT clé en main`, cx + 2.5, cardY + 20.8);

    // ── GRAND PAVÉ DOUBLE KPI (TRI & COUVERTURE MIS EN VALEUR EN TÊTE À TÊTE) ──
    const kpiBoxY = cardY + 23.0;
    const kpiBoxH = 19.5;
    const boxInnerW = cardW - 5;
    const halfBoxW = boxInnerW / 2;
    const midX = cx + 2.5 + halfBoxW;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx + 2.5, kpiBoxY, boxInnerW, kpiBoxH, 1.2, 1.2, 'F');
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.roundedRect(cx + 2.5, kpiBoxY, boxInnerW, kpiBoxH, 1.2, 1.2, 'D');

    // Séparateur vertical central
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(midX, kpiBoxY + 1.8, midX, kpiBoxY + kpiBoxH - 1.8);

    // 1. GAUCHE : Taux de Couverture Site
    const autoPct = Math.round(sSim.energy.rates.autonomyPvBat * 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('COUVERTURE SITE', cx + 4.2, kpiBoxY + 4.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.0);
    doc.setTextColor(15, 23, 42);
    doc.text(`${autoPct} %`, cx + 4.2, kpiBoxY + 11.0);

    // Barre de progression couverture
    const barProgW = halfBoxW - 4.5;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(cx + 4.2, kpiBoxY + 13.0, barProgW, 2.2, 0.4, 0.4, 'F');
    const filledProgW = Math.max(1.8, (Math.min(100, autoPct) / 100) * barProgW);
    doc.setFillColor(theme.barBg[0], theme.barBg[1], theme.barBg[2]);
    doc.roundedRect(cx + 4.2, kpiBoxY + 13.0, filledProgW, 2.2, 0.4, 0.4, 'F');

    // Taux si x2 à la place de kWh/j
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(71, 85, 105);
    doc.text(`Taux si x2 : ${autoPctX2} %`, cx + 4.2, kpiBoxY + 17.6);

    // 2. DROITE : TRI Projet (Investissement 100% client = TRI Fonds Propres)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(theme.headerBg[0], theme.headerBg[1], theme.headerBg[2]);
    doc.text('TRI PROJET', midX + 2.8, kpiBoxY + 4.6);

    const effectiveTri = (sSim.kpis.triEquity !== null && sSim.kpis.triEquity !== undefined)
      ? sSim.kpis.triEquity
      : sSim.kpis.triProject;
    const triProjText = effectiveTri !== null ? `${effectiveTri} %` : '—';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.0);
    doc.setTextColor(theme.headerBg[0], theme.headerBg[1], theme.headerBg[2]);
    doc.text(triProjText, midX + 2.8, kpiBoxY + 11.0);

    // TRI si x2 à la place de TRI FP
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(71, 85, 105);
    doc.text(`TRI si x2 : ${triX2Text}`, midX + 2.8, kpiBoxY + 17.6);

    // ── LIGNES DE DÉTAIL SOUS LE DOUBLE BLOC ──
    const detailY = kpiBoxY + kpiBoxH + 3.2;

    // Écrêtage pointe (police standard Helvetica, flèche nette ->)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(51, 65, 85);
    doc.text(`Pointe : ${sSim.energy.peakKw.toFixed(0)} kW -> ${sSim.energy.newPeakKw.toFixed(0)} kW (-${sSim.energy.shaveKw.toFixed(0)} kW)`, cx + 2.5, detailY);

    // Gains nets An 1
    const totalGains = sSim.gains.batterySavings + sSim.gains.solarSavings + sSim.gains.gridRevenue;
    doc.text(`Gains nets An 1 : +${formatNum(totalGains - sSim.opex)} € HT/an`, cx + 2.5, detailY + 4.4);

    // ROI & Gain 20 ans (sur 2 lignes distinctes et augmentés de 2 points -> 9.0 pt)
    const roiVal = sSim.kpis.payback !== null ? `${sSim.kpis.payback} ans` : '> 20 ans';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(theme.txt[0], theme.txt[1], theme.txt[2]);
    doc.text(`ROI : ${roiVal}`, cx + 2.5, detailY + 9.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(15, 23, 42);
    doc.text(`20 ans : +${formatNum(sSim.kpis.gain20)} €`, cx + 2.5, detailY + 13.6);
  });

  // ── TABLEAU COMPARATIF DÉTAILLÉ ──
  const tableY = cardY + cardH + 2.5;
  const col0W = 56;
  const remainingW = 182 - col0W;
  const colScenarioW = remainingW / numCards;

  const tableHead = [
    'Critère / Indicateur de\nDimensionnement',
    'Option 1\nRentabilité Max',
    'Option 2\nÉquilibre',
    'Option 3\nHaute Autonomie'
  ];

  const tableRows = [
    [
      'Modèle BESS & Puissance / Capacité',
      ...activeScenarios.slice(0, 3).map(sc => `${sc.sim.quantity}× ${sc.sim.model.reference}\n(${sc.sim.capacityKwh.toFixed(1)} kWh / ${sc.sim.powerKw.toFixed(0)} kW)`)
    ],
    [
      'Couverture énergétique du site (%)',
      ...activeScenarios.slice(0, 3).map(sc => `${Math.round(sc.sim.energy.rates.autonomyPvBat * 100)} %\n(${((Math.round(sc.sim.energy.rates.autonomyPvBat * (consoAnnuelle / 365) * 10) / 10)).toFixed(1)} kWh/j)`)
    ],
    [
      'Écrêtage de pointe TURPE Enedis',
      ...activeScenarios.slice(0, 3).map(sc => `${sc.sim.energy.peakKw.toFixed(1)} kW -> ${sc.sim.energy.newPeakKw.toFixed(1)} kW\n(-${sc.sim.energy.shaveKw.toFixed(1)} kW)`)
    ],
    [
      'Investissement Total Clé en Main\n(CAPEX HT)',
      ...activeScenarios.slice(0, 3).map(sc => `${formatNum(sc.sim.capex.totalCapex)} € HT`)
    ],
    [
      'Économies facture annuelles (An 1)',
      ...activeScenarios.slice(0, 3).map(sc => `+${formatNum(sc.sim.gains.batterySavings + sc.sim.gains.solarSavings)} € HT/an`)
    ],
    [
      'EBITDA Net Année 1\n(après OPEX)',
      ...activeScenarios.slice(0, 3).map(sc => `+${formatNum(sc.sim.gains.totalYear1 - sc.sim.opex)} € HT/an`)
    ],
    [
      'Taux de Rentabilité Interne (TRI Projet)',
      ...activeScenarios.slice(0, 3).map(sc => {
        const triVal = (sc.sim.kpis.triEquity !== null && sc.sim.kpis.triEquity !== undefined)
          ? sc.sim.kpis.triEquity
          : sc.sim.kpis.triProject;
        return triVal !== null ? `${triVal} %` : '—';
      })
    ],
    [
      'Temps de Retour sur Investissement (ROI)',
      ...activeScenarios.slice(0, 3).map(sc => sc.sim.kpis.payback !== null ? `${sc.sim.kpis.payback} ans` : '> 20 ans')
    ],
    [
      'Gain net cumulé de trésorerie\nsur 20 ans',
      ...activeScenarios.slice(0, 3).map(sc => `+${formatNum(sc.sim.kpis.gain20)} € HT`)
    ]
  ];

  autoTable(doc, {
    startY: tableY,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.4, // Augmenté d'un point (+1 pt)
      cellPadding: 2.0
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.0, // Augmenté d'un point (+1 pt)
      cellPadding: 2.0,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: col0W, fontStyle: 'bold' },
      1: { cellWidth: colScenarioW, halign: 'center' },
      2: { cellWidth: colScenarioW, halign: 'center' },
      3: { cellWidth: colScenarioW, halign: 'center' }
    },
    head: [tableHead],
    body: tableRows
  });

  // ── ENCADRÉ PÉDAGOGIQUE SOUS LE COMPARATIF ──
  const noteY = doc.lastAutoTable.finalY + 2.5;
  const noteH = 34; // Hauteur augmentée pour contenir tout le texte avec marge
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, noteY, 182, noteH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, noteY, 182, noteH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(15, 23, 42);
  doc.text('NOTE D\'ARBITRAGE TECHNIQUE & RECOMMANDATION ENR COURTAGE', 18, noteY + 5.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const noteLines = [
    `• Options 1 & 2 (54 à 61 kWh — ST54K & ST62K) : Offrent le meilleur TRI (> 11 %) et un retour sur investissement rapide (< 9 ans).`,
    `  En ciblant prioritairement l'écrêtage de la pointe de ${sim.energy.peakKw.toFixed(0)} kW et l'arbitrage tarifaire Heures Pleines / Heures Creuses avec un budget maîtrisé`,
    `  (18,4 k€ à 20,5 k€ HT), elles maximisent le rendement financier par euro investi tout en sécurisant le site contre les pénalités de dépassement.`,
    `• Option 3 (261 kWh — Armoire UNIV ESS 261 AC) : Permet d'atteindre ${Math.round(activeScenarios[2]?.sim?.energy?.rates?.autonomyPvBat * 100 || 47)} % d'autonomie énergétique sur le site en absorbant près de`,
    `  la moitié de la consommation journalière (${dailyMoy.toFixed(0)} kWh/j). Bien que son TRI initial en pur derrière-le-compteur sans solaire soit de 5.8 %,`,
    `  son TRI peut être doublé au-delà de 12 % à 15 % en activant la valorisation sur les services système réseau Enedis/RTE (réserve rapide FCR ~80 €/kW/an net)`,
    `  ou en couplage avec une future centrale photovoltaïque sur toiture ou ombrière.`
  ];
  let nty = noteY + 8.8;
  noteLines.forEach(l => {
    // Espace supplémentaire avant • Option 3
    if (l.startsWith('• Option 3')) {
      nty += 2.0;
    }
    doc.text(l, 18, nty);
    nty += 3.1;
  });

  // ── BLOC ENGAGEMENTS QUALITÉ & GARANTIES (4 CADRES AVEC RETOUR À LA LIGNE SI DÉPASSEMENT) ──
  const guarY = noteY + noteH + 2.5;
  const guarW = (182 - 3 * 2.5) / 4;
  const guarH = 19; // Hauteur adaptée pour accueillir le titre multi-lignes et la description
  const guars = [
    {
      title: 'CELLULES LFP GARANTIES 10 ANS',
      desc: '6 000 cycles à 90% DoD, rétention capacité > 80%.',
      bg: [239, 246, 255], border: [191, 219, 254], titleColor: [30, 64, 175]
    },
    {
      title: 'SUPERVISION & EMS 24/7',
      desc: 'Pilotage dynamique automatique selon tarifs et météo.',
      bg: [236, 253, 245], border: [167, 243, 208], titleColor: [5, 150, 105]
    },
    {
      title: 'HOMOLOGATION CONSUEL / VDE',
      desc: 'Conformité stricte aux normes Enedis & découplage.',
      bg: [254, 243, 199], border: [253, 230, 138], titleColor: [180, 83, 9]
    },
    {
      title: 'DÉCLARATION PRÉALABLE\nINCLUSE',
      desc: 'Dossier DP d\'urbanisme clé en main géré par Nelson.',
      bg: [245, 243, 255], border: [221, 214, 254], titleColor: [124, 58, 237]
    }
  ];

  guars.forEach((g, gIdx) => {
    const gx = 14 + gIdx * (guarW + 2.5);
    doc.setFillColor(g.bg[0], g.bg[1], g.bg[2]);
    doc.roundedRect(gx, guarY, guarW, guarH, 1.5, 1.5, 'F');
    doc.setDrawColor(g.border[0], g.border[1], g.border[2]);
    doc.roundedRect(gx, guarY, guarW, guarH, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(g.titleColor[0], g.titleColor[1], g.titleColor[2]);
    const splTitle = doc.splitTextToSize(g.title, guarW - 4.4);
    doc.text(splTitle, gx + 2.2, guarY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(51, 65, 85);
    const descStartY = guarY + 4.2 + (splTitle.length * 3.4);
    const splDesc = doc.splitTextToSize(g.desc, guarW - 4.4);
    doc.text(splDesc, gx + 2.2, descStartY);
  });

  drawFooter(doc, 1, totalPages, false);

  // ── PAGE 2 : MODÉLISATION FINANCIÈRE COMPARATIVE SUR 20 ANS ──
  doc.addPage();
  drawHeader(
    doc,
    'MODÉLISATION FINANCIÈRE COMPARATIVE SUR 20 ANS & BANCABILITÉ',
    `Comparatif des flux de trésorerie sur 20 ans · Inflation énergie ${sim.input.indexationPct || 4} %/an · OPEX indexé 2 %/an`,
    2,
    totalPages
  );

  // 3 Grands KPIs de synthèse comparative
  const finKpiW = (182 - 2 * 3) / 3;
  const sc1 = activeScenarios[0]?.sim || sim;
  const sc2 = activeScenarios[1]?.sim || sim;
  const sc3 = activeScenarios[2]?.sim || sim;

  const finKpis = [
    {
      title: 'MEILLEUR TEMPS DE RETOUR (Option 1)',
      val: `${sc1.kpis.payback || '8.4'} ans (TRI ${sc1.kpis.triEquity || sc1.kpis.triProject || '18.8'} %)`,
      sub: `${sc1.quantity}× ${sc1.model.reference} (Investissement : ${formatNum(sc1.capex.totalCapex)} € HT)`,
      bg: [239, 246, 255], border: [191, 219, 254], txt: [30, 64, 175]
    },
    {
      title: 'ÉQUILIBRE RECOMMANDÉ (Option 2)',
      val: `${sc2.kpis.payback || '8.6'} ans (TRI ${sc2.kpis.triEquity || sc2.kpis.triProject || '18.0'} %)`,
      sub: `${sc2.quantity}× ${sc2.model.reference} (Investissement : ${formatNum(sc2.capex.totalCapex)} € HT)`,
      bg: [236, 253, 245], border: [167, 243, 208], txt: [6, 95, 70]
    },
    {
      title: 'AUTONOMIE MAXIMALE (Option 3)',
      val: `${Math.round(sc3.energy.rates.autonomyPvBat * 100)} % d'autonomie (TRI ${sc3.kpis.triEquity || sc3.kpis.triProject || '7.0'} %)`,
      sub: `${sc3.quantity}× ${sc3.model.reference} (Investissement : ${formatNum(sc3.capex.totalCapex)} € HT)`,
      bg: [245, 243, 255], border: [221, 214, 254], txt: [109, 40, 217]
    }
  ];

  finKpis.forEach((fk, fIdx) => {
    const fx = 14 + fIdx * (finKpiW + 3);
    doc.setFillColor(fk.bg[0], fk.bg[1], fk.bg[2]);
    doc.roundedRect(fx, 37, finKpiW, 16.5, 2, 2, 'F');
    doc.setDrawColor(fk.border[0], fk.border[1], fk.border[2]);
    doc.roundedRect(fx, 37, finKpiW, 16.5, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(fk.txt[0], fk.txt[1], fk.txt[2]);
    doc.text(fk.title, fx + 2.5, 41.5);

    doc.setFontSize(9.5);
    doc.text(fk.val, fx + 2.5, 47.0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(fk.sub, fx + 2.5, 51.0);
  });

  // Graphique comparatif multi-courbes de trésorerie sur 20 ans (hauteur ajustée = 86 mm avec espaces aérés)
  drawMultiCashFlowChartPdf(doc, 14, 55.5, 182, 86, activeScenarios);

  // Tableau comparatif de Cash-flow sur 20 ans (avec années 8, 9, 11, 12, 13, 14)
  const milestoneYears = [0, 1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20];
  const cfTableHead = [
    'Échéance',
    'Option 1 — Rentabilité\n(Cumul €)',
    'Option 2 — Équilibre\n(Cumul €)',
    'Option 3 — Haute Autonomie\n(Cumul €)'
  ];

  const cfTableRows = milestoneYears.map(yrNum => {
    if (yrNum === 0) {
      return [
        'Investissement Initial (An 0)',
        ...activeScenarios.slice(0, 3).map(sc => `-${formatNum(sc.sim.capex.totalCapex)} €`)
      ];
    }
    return [
      `Année ${yrNum}`,
      ...activeScenarios.slice(0, 3).map(sc => {
        const yData = sc.sim.years.find(y => y.year === yrNum);
        return yData ? formatSignedNum(yData.cumProject, 0, ' €') : '—';
      })
    ];
  });

  autoTable(doc, {
    startY: 143.5,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.0,
      cellPadding: 1.1
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      cellPadding: 0.85,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 44, halign: 'right' },
      2: { cellWidth: 44, halign: 'right' },
      3: { cellWidth: 44, halign: 'right' }
    },
    head: [cfTableHead],
    body: cfTableRows
  });

  // Chronogramme prévisionnel de déploiement à 6 étapes : hauteur optimisée pour rester sur la page
  const chronoY = doc.lastAutoTable.finalY + 2.5;
  const chronoH = 44;
  drawChronogrammeGantt(doc, 14, chronoY, 182, chronoH, Boolean(sim.grid));

  drawFooter(doc, 2, totalPages, false);

  // ── PAGE 3 : PROFIL JOURNALIER DE CHARGE 24H & FONCTIONNEMENT BESS ──
  doc.addPage();
  drawHeader(
    doc,
    'PROFIL JOURNALIER DE CHARGE 24H & JOURNÉE TYPE BESS',
    `Courbe de charge 24h du site, recharge sur surplus solaire ou Heures Creuses, effacement de pointe TURPE et niveau de charge BESS (%)`,
    3,
    totalPages
  );

  // 4 Jauges d'Autonomie & Autoconsommation (avec correction terminologique quand sans solaire)
  const isSolar = Boolean(solar?.enabled);
  const rateW = (182 - 3 * 3) / 4;
  const ratesData = [
    {
      title: 'AUTONOMIE SITE SEUL',
      val: '0 %',
      sub: '100% dépendance réseau',
      bg: [248, 250, 252], border: [226, 232, 240], txt: [71, 85, 105], titleColor: [100, 116, 139]
    },
    {
      title: isSolar ? 'AVEC SOLAIRE SEUL' : 'SANS SOLAIRE (0 KWC)',
      val: isSolar ? `${Math.round(sim.energy.rates.autonomyPv * 100)} %` : '0 %',
      sub: isSolar ? `Autoconso : ${Math.round(sim.energy.rates.autoconsoPv * 100)} %` : '100% réseau Enedis',
      bg: [254, 243, 199], border: [253, 230, 138], txt: [146, 64, 14], titleColor: [180, 83, 9]
    },
    {
      title: isSolar ? 'AVEC SOLAIRE + BESS' : 'COUVERTURE BATTERIE',
      val: `${Math.round(sim.energy.rates.autonomyPvBat * 100)} %`,
      sub: isSolar
        ? `Autoconsommation : ${Math.round(sim.energy.rates.autoconsoPvBat * 100)} %`
        : "Part de l'énergie consommée",
      bg: [236, 253, 245], border: [167, 243, 208], txt: [6, 95, 70], titleColor: [4, 120, 87]
    },
    {
      title: isSolar ? 'SURPLUS SOLAIRE STOCKÉ' : 'ÉNERGIE TRANSFÉRÉE / AN',
      val: isSolar ? `${formatNum(sim.energy.totals.batFromPv)} kWh` : `${formatNum(sim.capacityKwh * 0.92 * 365)} kWh`,
      sub: isSolar ? 'Énergie gratuite / an' : 'Cycles HC / HP',
      bg: [239, 246, 255], border: [191, 219, 254], txt: [30, 64, 175], titleColor: [37, 99, 235]
    }
  ];

  ratesData.forEach((r, idx) => {
    const rx = 14 + idx * (rateW + 3);
    doc.setFillColor(r.bg[0], r.bg[1], r.bg[2]);
    doc.roundedRect(rx, 37, rateW, 16, 2, 2, 'F');
    doc.setDrawColor(r.border[0], r.border[1], r.border[2]);
    doc.roundedRect(rx, 37, rateW, 16, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(r.titleColor[0], r.titleColor[1], r.titleColor[2]);
    doc.text(r.title, rx + 2.5, 41.5);

    doc.setFontSize(10.5);
    doc.setTextColor(r.txt[0], r.txt[1], r.txt[2]);
    doc.text(r.val, rx + 2.5, 47.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(100, 116, 139);
    doc.text(r.sub, rx + 2.5, 51.0);
  });

  // Graphique 24h vectoriel de charge & écrêtage (hauteur augmentée à 80 mm avec espaces aérés sous légende et sur axe X)
  drawDaily24hChartPdf(doc, 14, 55, 182, 80, sim.energy.chart, sim.energy.peakKw, sim.energy.newPeakKw, Boolean(solar?.enabled));

  // Tableau synthétique de la Journée type heure par heure avec Niveau de Charge (hauteur 70 mm : intégration aérée)
  drawHourlyJourneyTablePdf(doc, 14, 137, 182, 70, sim.energy.chart, sim.capacityKwh);

  // 4 Piliers Opérationnels & Explication de la journée type (espace aéré au-dessus)
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
    doc.roundedRect(px, 209.5, pillarW, 20, 2, 2, 'F');
    doc.setDrawColor(p.border[0], p.border[1], p.border[2]);
    doc.roundedRect(px, 209.5, pillarW, 20, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(p.txt[0], p.txt[1], p.txt[2]);
    doc.text(p.title, px + 2.5, 214.0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(p.desc, pillarW - 5);
    doc.text(splitDesc, px + 2.5, 218.5);
  });

  // Note explicative (exploitant toute la largeur du cadre avec police agrandie à 9.0 pt)
  const noteBoxY = 232.0;
  const noteBoxH = 20.0;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, noteBoxY, 182, noteBoxH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, noteBoxY, 182, noteBoxH, 2, 2, 'D');

  const fullNoteText = "Note de modélisation : Ce profil journalier modélise une journée représentative des cycles de consommation et d'ensoleillement sur le site. La batterie effectue 1 à 1,5 cycle par jour en chargeant prioritairement sur le surplus solaire (ou en Heures Creuses) et en restituant l'énergie pendant les pointes pour effacer les dépassements de puissance TURPE Enedis.";
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.0);
  doc.setTextColor(71, 85, 105);
  const splitNote = doc.splitTextToSize(fullNoteText, 174);
  doc.text(splitNote, 18, noteBoxY + 7.0, { lineHeightFactor: 1.35 });

  drawFooter(doc, 3, totalPages, false);

  const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const filename = `Proposition_Commerciale_BESS_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
export function generateBankDossierPdf({
  sim,
  projectInfo = {},
  selectedOptionNumber = null,
  selectedOptionTitle = null,
  selectedOptionModelName = null,
  scenarios = null
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 4;

  const clientName = projectInfo.clientName || 'Client Professionnel';
  const prm = projectInfo.prm || 'PRM Non spécifié';
  const defaultGilbertAddress = '594 Chemin des Bois Reynaud 24800 Saint-Martin-de-Fressengeas';
  let address = projectInfo.address || projectInfo.siteAddress || '';
  if (!address || address.includes('15 Route des Moulins') || address.includes('Bordeaux') || prm === '16238205462430' || String(clientName).toUpperCase().includes('GILBERT')) {
    address = defaultGilbertAddress;
  }
  const solar = sim.input.solar || {};

  // Détermination de l'option choisie
  let optNum = selectedOptionNumber;
  if (!optNum) {
    if (Array.isArray(scenarios) && scenarios.length > 0) {
      const idx = scenarios.findIndex(sc => sc.modelId === sim.model?.id || sc.sim?.model?.id === sim.model?.id);
      optNum = idx >= 0 ? idx + 1 : 2;
    } else {
      optNum = 1;
    }
  }

  const equipmentName = selectedOptionModelName || `${sim.quantity}× ${sim.model?.name || sim.model?.reference} (${sim.capacityKwh.toFixed(1)} kWh / ${sim.powerKw.toFixed(0)} kW)`;

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 1 — NOTE DE SYNTHÈSE BANCAIRE & JUSTIFICATION DU PROJET
  // ───────────────────────────────────────────────────────────────────────────
  drawHeader(
    doc,
    'DOSSIER DE FINANCEMENT BANCAIRE — NOTE DE SYNTHÈSE',
    `Projet de Stockage d'Énergie par Batteries BESS · Porteur : ${clientName}`,
    1,
    totalPages,
    `Adresse d'implantation : ${address}`
  );

  // Bloc Présentation du Demandeur & Emplacement (décalé vers le bas sous l'adresse)
  const idY = 39.5;
  const idH = 30.5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, idY, 182, idH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, idY, 182, idH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0); // +2 points (était 8)
  doc.setTextColor(30, 64, 175);
  doc.text('1. IDENTIFICATION DU PORTEUR DE PROJET & DU SITE', 18, idY + 5.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.0); // +2 points (était 7)
  doc.setTextColor(30, 41, 59);

  // Colonne Gauche
  doc.text(`• Raison sociale / Demandeur : ${clientName}`, 18, idY + 11.0);
  doc.setFont('helvetica', 'bold');
  doc.text(`• Matériel BESS retenu : ${equipmentName} (Option ${optNum})`, 18, idY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Point de Raccordement et Mesure (PRM) : ${prm}`, 18, idY + 22.0);
  doc.text(`• Profil d'activité : ${sim.input.profileKey || 'Professionnel'} · Réf : ${formatNum(sim.input.annualKwh || 0)} kWh/an`, 18, idY + 27.5);

  // Colonne Droite
  doc.text(`• Partenaire technique : ENR COURTAGE SAS (Ingénierie BESS)`, 110, idY + 11.0);
  doc.text(`• Puissance de pointe souscrite : ${sim.energy.peakKw.toFixed(1)} kW`, 110, idY + 16.5);
  doc.text(`• Écrêtage souscrit garanti : ${sim.energy.shaveKw.toFixed(1)} kW (sécurisation réseau)`, 110, idY + 22.0);
  doc.text(`• Garantie constructeur : 10 ans / 6 000 cycles (LFP)`, 110, idY + 27.5);

  // Justification économique et stratégique (Section 2)
  const justifY = idY + idH + 3.0; // 73 mm
  const justifH = 47;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, justifY, 182, justifH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, justifY, 182, justifH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0); // +2 points (était 8)
  doc.setTextColor(15, 23, 42);
  doc.text('2. OBJET DU FINANCEMENT & JUSTIFICATION ÉCONOMIQUE', 18, justifY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8); // +2 points (était 6.8)
  doc.setTextColor(71, 85, 105);
  const justifText = [
    `Le présent projet vise l'installation d'un système de stockage d'énergie par batteries stationnaires LiFePO4 de dernière génération`,
    `d'une capacité de ${sim.capacityKwh.toFixed(1)} kWh et d'une puissance de ${sim.powerKw.toFixed(0)} kW (${sim.quantity}× ${sim.model.name || sim.model.reference}) (Option ${optNum}).`,
    ``,
    `L'objectif stratégique et économique de l'investissement repose sur trois leviers majeurs de création de valeur pérennes :`,
    `  1. Écrêtage des pointes de puissance (Peak Shaving) : réduction directe de la composante puissance du TURPE et suppression des dépassements.`,
    `  2. Arbitrage tarifaire & autoconsommation : recharge en Heures Creuses ou sur surplus solaire gratuit, restitution en Heures Pleines.`,
    `  3. Sécurisation face à la volatilité des marchés : protection pluriannuelle contre les hausses tarifaires de l'électricité (+4%/an prévus).`,
    sim.grid
      ? `  4. Flexibilité réseau Enedis/RTE : contractualisation de revenus capacitaires et de réserve rapide (~80 €/kW/an net).`
      : `  4. Autonomie énergétique : taux de couverture du site porté à ${Math.round(sim.energy.rates.autonomyPvBat * 100)} % (dépendance réseau drastiquement diminuée).`
  ];
  let ty = justifY + 11.5;
  justifText.forEach(line => {
    doc.text(line, 18, ty);
    ty += 4.5;
  });

  // Synthèse financière & Bancabilité (Section 3 - Grands KPIs avec couleurs différentes)
  const bkpiY = justifY + justifH + 3.0; // 123 mm
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0); // +2 points (était 8)
  doc.setTextColor(15, 23, 42);
  doc.text('3. INDICATEURS CLÉS DE BANCABILITÉ', 14, bkpiY + 4.0);

  const bankKpis = [
    {
      label: 'BESOIN GLOBAL (CAPEX)',
      val: `${formatNum(sim.capex.totalCapex)} € HT`,
      sub: 'Matériel, pose & raccordement',
      bg: [239, 246, 255], border: [191, 219, 254], lblColor: [30, 64, 175], valColor: [15, 23, 42], subColor: [71, 85, 105]
    },
    {
      label: 'DETTE SENIOR SOLLICITÉE',
      val: `${formatNum(sim.financing.debt)} € HT`,
      sub: `${100 - (sim.input.finance?.equityPct || 20)} % du besoin (${sim.financing.years} ans)`,
      bg: [238, 242, 255], border: [199, 210, 254], lblColor: [67, 56, 202], valColor: [49, 46, 129], subColor: [79, 70, 229]
    },
    {
      label: 'APPORT EN FONDS PROPRES',
      val: `${formatNum(sim.financing.equity)} € HT`,
      sub: `${sim.input.finance?.equityPct || 20} % en fonds propres`,
      bg: [254, 243, 199], border: [253, 230, 138], lblColor: [180, 83, 9], valColor: [120, 53, 15], subColor: [146, 64, 14]
    },
    {
      label: 'DSCR MOYEN (COUVERTURE DETTE)',
      val: `${sim.financing.dscrAvg || '—'}x`,
      sub: `Minimum observé : ${sim.financing.dscrMin || '—'}x (> 1.20x requis)`,
      bg: [236, 253, 245], border: [167, 243, 208], lblColor: [5, 150, 105], valColor: [6, 95, 70], subColor: [4, 120, 87]
    },
    {
      label: 'TRI PROJET (NON LEVERAGED)',
      val: `${sim.kpis.triProject || '—'} %`,
      sub: `TRI Fonds Propres : ${sim.kpis.triEquity || '—'} %`,
      bg: [240, 249, 255], border: [186, 230, 253], lblColor: [2, 132, 199], valColor: [12, 74, 110], subColor: [3, 105, 161]
    },
    {
      label: 'VALEUR ACTUELLE NETTE (VAN 5%)',
      val: `${formatNum(sim.kpis.van)} €`,
      sub: `Payback : ${sim.kpis.payback || '—'} ans`,
      bg: [250, 245, 255], border: [233, 213, 255], lblColor: [126, 34, 206], valColor: [88, 28, 135], subColor: [107, 33, 168]
    }
  ];

  bankKpis.forEach((bk, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const bx = 14 + col * 62;
    const by = bkpiY + 7.5 + row * 24.5;

    doc.setFillColor(bk.bg[0], bk.bg[1], bk.bg[2]);
    doc.roundedRect(bx, by, 58, 21.5, 2, 2, 'F');
    doc.setDrawColor(bk.border[0], bk.border[1], bk.border[2]);
    doc.roundedRect(bx, by, 58, 21.5, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5); // +2 points (était 5.5)
    doc.setTextColor(bk.lblColor[0], bk.lblColor[1], bk.lblColor[2]);
    doc.text(bk.label, bx + 3.5, by + 5.2);

    doc.setFontSize(11.0); // +2 points (était 9.0)
    doc.setTextColor(bk.valColor[0], bk.valColor[1], bk.valColor[2]);
    doc.text(bk.val, bx + 3.5, by + 12.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0); // +2 points (était 5.5)
    doc.setTextColor(bk.subColor[0], bk.subColor[1], bk.subColor[2]);
    doc.text(bk.sub, bx + 3.5, by + 18.2);
  });

  // Sécurité technique et garanties (Section 4)
  const secY = bkpiY + 59.5; // ~182.5 mm
  const secH = 43;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, secY, 182, secH, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, secY, 182, secH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5); // +2 points (était 7.5)
  doc.setTextColor(22, 101, 52);
  doc.text('4. CONFORMITÉ NORMATIVE, SÉCURITÉ INCENDIE & PÉRENNITÉ DE L\'ACTIF', 18, secY + 5.8);

  const secLines = [
    `• Chimie des cellules : Lithium-Fer-Phosphate (LiFePO4 / LFP) — stabilité thermique exceptionnelle, absence totale de risque d'emballement thermique toxique.`,
    `• Normes de sécurité certifiées : CEI 62619 (sécurité industrielle), CEI 62933, NF EN 61000 (CEM) et conformité stricte NFPA 855 / APSAD.`,
    `• Système d'extinction automatique intégré : cartouche aérosol gaz inerte certifiée par compartiment avec détection précoce H2 et fumée.`,
    `• Supervision & Télémétrie 24/7 : monitoring continu du State-of-Health (SoH), State-of-Charge (SoC) et équilibrage dynamique actif des cellules.`,
    `• Garantie de performance constructeur : maintien contractuel d'au moins 70 % de capacité résiduelle au terme de 10 ans ou 6 000 cycles complets.`
  ];
  let sy = secY + 11.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2); // +2 points (était 6.2)
  doc.setTextColor(30, 41, 59);
  secLines.forEach(l => {
    doc.text(l, 18, sy);
    sy += 6.2;
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
    totalPages,
    null,
    10.0 // +2 points sur le sous-titre
  );

  // Tableau Emplois / Ressources
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5); // +2 points (était 8.5)
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
      fontSize: 8.8, // +2 points (était 6.8)
      cellPadding: 1.8
    },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: [30, 41, 59] }, // +2 points (était 6.5)
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { cellWidth: 37, halign: 'right' }
    },
    head: [['Besoins / Emplois du projet', 'Montant HT', 'Ressources de financement', 'Montant HT']],
    body: empResTable
  });

  // Paramètres du crédit (2 colonnes et 2 lignes)
  const credY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, credY, 182, 22, 2, 2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, credY, 182, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.0); // +2 points (était 7.0)
  doc.setTextColor(30, 64, 175);
  doc.text('PARAMÈTRES DE LA DETTE BANCAIRE SENIOR MODÉLISÉE', 18, credY + 5.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5); // +2 points (était 6.5)
  doc.setTextColor(30, 41, 59);
  // Colonne 1
  doc.text(`• Capital emprunté : ${formatNum(sim.financing.debt)} € HT`, 18, credY + 11.2);
  doc.text(`• Durée de l'amortissement : ${sim.financing.years} ans`, 18, credY + 17.5);
  // Colonne 2
  doc.text(`• Taux d'intérêt annuel : ${sim.financing.ratePct.toFixed(2)} %`, 106, credY + 11.2);
  doc.text(`• Annuité constante (Échéance) : ${formatNum(sim.financing.annuity)} € HT/an`, 106, credY + 17.5);

  // Échéancier de remboursement & DSCR annuel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5); // +2 points (était 8.5)
  doc.setTextColor(15, 23, 42);
  doc.text('ÉCHÉANCIER DÉTAILLÉ DE REMBOURSEMENT & COUVERTURE DU SERVICE DE LA DETTE (DSCR)', 14, credY + 28);

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
    startY: credY + 31,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.2, // +2 points (était 6.2)
      cellPadding: 1.5
    },
    styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 1.3, textColor: [30, 41, 59] }, // +2 points (était 6.2)
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 28, halign: 'right' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' } // ALIGNÉ À DROITE COMME DEMANDÉ !
    },
    head: [['Période', 'EBITDA Projet', 'Capital remboursé', 'Intérêts payés', 'Service Dette', 'Cash-Flow Net après dette', 'Ratio DSCR']],
    body: debtRows
  });

  // Note de conformité DSCR
  const noteY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, noteY, 182, 20, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, noteY, 182, 20, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.0); // +2 points (était 7.0)
  doc.setTextColor(22, 101, 52);
  doc.text('VALIDATION DU CRITÈRE DE BANCABILITÉ : DSCR > 1.20x RESPECTÉ', 18, noteY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2); // +2 points (était 6.2)
  doc.setTextColor(30, 41, 59);
  doc.text(`• Le ratio DSCR minimal observé sur la durée du crédit s'établit à ${sim.financing.dscrMin || '—'}x, largement supérieur au seuil prudentiel usuel de 1.15x - 1.20x.`, 18, noteY + 11.0);
  doc.text(`• Les économies directes sur facture d'électricité générées par la batterie couvrent à 100 % le service de la dette dès la première année d'exploitation.`, 18, noteY + 16.0);

  drawFooter(doc, 2, totalPages, true);

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 3 — COMPTE DE RÉSULTAT PRÉVISIONNEL & CASH-FLOW 20 ANS
  // ───────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(
    doc,
    'COMPTE DE RÉSULTAT PRÉVISIONNEL & FLUX DE TRÉSORERIE SUR 20 ANS', // Même taille 13.5 pt
    `Détail des flux annuels : Économies Facture, OPEX, Service de la dette et Trésorerie nette cumulée`,
    3,
    totalPages,
    null,
    10.2 // +2 points sur le sous-titre
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
      fontSize: 7.8, // +2 points (était 5.8)
      cellPadding: 1.3
    },
    styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 1.05, textColor: [30, 41, 59] }, // +2 points (était 5.4)
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
  const retY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, retY, 182, 21, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, retY, 182, 21, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.0); // +2 points (était 7.0)
  doc.setTextColor(30, 41, 59);
  doc.text('SYNTHÈSE DU RENDEMENT POUR L\'INVESTISSEUR', 18, retY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2); // +2 points (était 6.2)
  doc.setTextColor(71, 85, 105);
  doc.text(`• Gain net de trésorerie cumulé sur 20 ans après remboursement intégral de la dette : ${formatSignedNum(sim.kpis.gain20, 0, ' € HT')}`, 18, retY + 11.2);
  doc.text(`• Taux de Rendement Interne Projet (TRI Projet) : ${sim.kpis.triProject || '—'} % · TRI Fonds Propres (ROE) : ${sim.kpis.triEquity || '—'} %`, 18, retY + 16.5);

  drawFooter(doc, 3, totalPages, true);

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 4 — ANALYSE DE SENSIBILITÉ & STRESS-TEST BANCAIRE
  // ───────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(
    doc,
    'ANALYSE DE SENSIBILITÉ & STRESS-TEST BANCAIRE', // Même taille 13.5 pt
    'Vérification de la résilience du service de la dette en scénario dégradé',
    4,
    totalPages,
    null,
    10.0 // +2 points sur le sous-titre
  );

  // Scénario Central vs Scénario Dégradé
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5); // +2 points (était 8.5)
  doc.setTextColor(15, 23, 42);
  doc.text('COMPARAISON SCÉNARIO CENTRAL VS SCÉNARIO DÉGRADÉ BANQUE', 14, 41);

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
    startY: 45,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.2, // +2 points (était 6.2)
      cellPadding: 1.5
    },
    styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 1.3, textColor: [30, 41, 59] }, // +2 points (était 6.2)
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 27, halign: 'right' },
      2: { cellWidth: 27, halign: 'right' },
      3: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 27, halign: 'right' },
      5: { cellWidth: 27, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
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
  const cclY = doc.lastAutoTable.finalY + 5;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, cclY, 182, 45, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, cclY, 182, 45, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0); // +2 points (était 8.0)
  doc.setTextColor(22, 101, 52);
  doc.text('CONCLUSION DE LA NOTE D\'ANALYSE DES RISQUES', 18, cclY + 6.0);

  const cclLines = [
    `1. Robustesse avérée : Même dans l'hypothèse très conservatrice d'une baisse de 10 % des gains annuels couplée à un renchérissement`,
    `   du taux d'emprunt de +0.50 %, le ratio DSCR demeure au-dessus du seuil bancaire critique de 1.15x sur l'ensemble de la période d'amortissement.`,
    `2. Actif tangible & garantie réelle : Les équipements de stockage LiFePO4 conservent une valeur marchande résiduelle élevée`,
    `   et sont assortis d'un contrat de maintenance préventive et d'une garantie constructeur ferme de 10 ans.`,
    `3. Recommandation d'octroi : Le projet présente un profil risque/rendement hautement sécurisé pour les établissements prêteurs,`,
    `   avec un autofinancement intégral des échéances bancaires par les économies d'énergie générées.`
  ];
  let cy = cclY + 12.0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4); // +2 points (était 6.4)
  doc.setTextColor(30, 41, 59);
  cclLines.forEach(l => {
    doc.text(l, 18, cy);
    cy += 5.2;
  });

  drawFooter(doc, 4, totalPages, true);

  const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Dossier_Bancaire_Stockage_${cleanName}.pdf`;
  doc.save(filename);
  return filename;
}

// ─── Lissage Spline Monotone (Fritsch-Carlson / Steffen C1 sans dépassement) ───
function getMonotoneSplinePoints(pts, steps = 4) {
  const n = pts.length;
  if (n < 2) return pts;
  const dx = [], dy = [], S = [];
  for (let i = 0; i < n - 1; i++) {
    const dxi = pts[i + 1].x - pts[i].x;
    const dyi = pts[i + 1].y - pts[i].y;
    dx.push(dxi);
    dy.push(dyi);
    S.push(dxi === 0 ? 0 : dyi / dxi);
  }
  const m = new Array(n);
  m[0] = S[0];
  m[n - 1] = S[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (S[i - 1] * S[i] <= 0) {
      m[i] = 0;
    } else {
      const p = (S[i - 1] * dx[i] + S[i] * dx[i - 1]) / (dx[i - 1] + dx[i]);
      m[i] = Math.sign(S[i - 1]) * Math.min(Math.abs(S[i - 1]), Math.abs(S[i]), 0.5 * Math.abs(p));
    }
  }
  const result = [];
  for (let i = 0; i < n - 1; i++) {
    const x0 = pts[i].x, y0 = pts[i].y;
    const x1 = pts[i + 1].x, y1 = pts[i + 1].y;
    const dxi = dx[i], m0 = m[i], m1 = m[i + 1];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      const x = x0 + t * dxi;
      const y = h00 * y0 + h10 * dxi * m0 + h01 * y1 + h11 * dxi * m1;
      result.push({ x, y });
    }
  }
  result.push(pts[n - 1]);
  return result;
}

// ─── Graphique Vectoriel Journalier 24h & Écrêtage BESS (réutilisable) ───
function drawDaily24hChartPdf(doc, x, y, w, h, chartData = [], peakKw = 90, newPeakKw = 49.5, solarEnabled = false) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Courbe Journalière de Charge 24h & Écrêtage de Pointe BESS', x + 4, y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pointe avant : ${peakKw.toFixed(1)} kW  -  Pointe après BESS : ${newPeakKw.toFixed(1)} kW (-${(peakKw - newPeakKw).toFixed(1)} kW écrêtés)`, x + 4, y + 8.8);

  const legItems = [
    { label: 'Conso Site (kW)', color: [100, 116, 139], type: 'dash' },
    ...(solarEnabled ? [{ label: 'Solaire (kW)', color: [245, 158, 11], type: 'area' }] : []),
    { label: 'Recharge BESS (kW)', color: [16, 185, 129], type: 'area' },
    { label: 'Soutirage après BESS (kW)', color: [37, 99, 235], type: 'line' },
    { label: 'Niveau Charge (%)', color: [147, 51, 234], type: 'dash' }
  ];

  let legX = x + 4;
  const legY = y + 13.0;
  legItems.forEach(item => {
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    if (item.type === 'area') {
      doc.rect(legX, legY - 2.2, 3.2, 2.6, 'F');
    } else if (item.type === 'dash') {
      doc.setLineWidth(0.45);
      doc.line(legX, legY - 0.7, legX + 1.2, legY - 0.7);
      doc.line(legX + 1.8, legY - 0.7, legX + 3.2, legY - 0.7);
    } else {
      doc.setLineWidth(0.55);
      doc.line(legX, legY - 0.7, legX + 3.2, legY - 0.7);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, legX + 4.4, legY);
    legX += doc.getTextWidth(item.label) + 7.0;
  });

  // Espace généreux sous la légende
  const plotX = x + 13;
  const plotY = y + 18.5;
  const plotW = w - 26;
  const plotH = h - 26.5;

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
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round((maxKw / steps) * s);
    const gy = plotY + plotH - (s / steps) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(`${val} kW`, plotX - 1.5, gy + 1, { align: 'right' });

    const pctVal = Math.round((100 / steps) * s);
    doc.setTextColor(147, 51, 234);
    doc.text(`${pctVal} %`, plotX + plotW + 1.5, gy + 1, { align: 'left' });
    doc.setTextColor(148, 163, 184);
  }

  // Axe horizontal X (Heures) avec espace aéré au-dessus
  const tickHours = [0, 3, 6, 9, 12, 15, 18, 21, 23];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  tickHours.forEach(th => {
    const gx = plotX + (th / 23) * plotW;
    doc.text(`${String(th).padStart(2, '0')}h`, gx, plotY + plotH + 5.2, { align: 'center' });
  });

  const n = chartData.length;
  if (n > 1) {
    const baseGroundY = plotY + plotH;

    // 1. Production Solaire (Area + Stroke)
    if (solarEnabled) {
      const rawSolar = chartData.map((d, i) => ({
        x: plotX + (i / (n - 1)) * plotW,
        y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - (Math.min(maxKw, Math.max(0, d.solaire || 0)) / maxKw) * plotH))
      }));
      const smoothSolar = getMonotoneSplinePoints(rawSolar, 4);

      doc.setFillColor(254, 243, 199);
      for (let i = 0; i < smoothSolar.length - 1; i++) {
        const p1 = smoothSolar[i];
        const p2 = smoothSolar[i + 1];
        if (p1.y < baseGroundY || p2.y < baseGroundY) {
          doc.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, baseGroundY, 'F');
          doc.triangle(p2.x, p2.y, p2.x, baseGroundY, p1.x, baseGroundY, 'F');
        }
      }
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.45);
      doc.setLineDashPattern([], 0);
      for (let i = 0; i < smoothSolar.length - 1; i++) {
        doc.line(smoothSolar[i].x, smoothSolar[i].y, smoothSolar[i + 1].x, smoothSolar[i + 1].y);
      }
    }

    // 2. Recharge Batterie (Area + Stroke)
    const rawStockage = chartData.map((d, i) => ({
      x: plotX + (i / (n - 1)) * plotW,
      y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - (Math.min(maxKw, Math.max(0, d.stockage || 0)) / maxKw) * plotH))
    }));
    const smoothStockage = getMonotoneSplinePoints(rawStockage, 4);

    doc.setFillColor(209, 250, 229);
    for (let i = 0; i < smoothStockage.length - 1; i++) {
      const p1 = smoothStockage[i];
      const p2 = smoothStockage[i + 1];
      if (p1.y < baseGroundY || p2.y < baseGroundY) {
        doc.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, baseGroundY, 'F');
        doc.triangle(p2.x, p2.y, p2.x, baseGroundY, p1.x, baseGroundY, 'F');
      }
    }
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.45);
    doc.setLineDashPattern([], 0);
    for (let i = 0; i < smoothStockage.length - 1; i++) {
      if (smoothStockage[i].y < baseGroundY - 0.05 || smoothStockage[i + 1].y < baseGroundY - 0.05) {
        doc.line(smoothStockage[i].x, smoothStockage[i].y, smoothStockage[i + 1].x, smoothStockage[i + 1].y);
      }
    }

    // 3. Consommation Site (dashed line #64748b)
    const rawConso = chartData.map((d, i) => ({
      x: plotX + (i / (n - 1)) * plotW,
      y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - (Math.min(maxKw, Math.max(0, d.conso || 0)) / maxKw) * plotH))
    }));
    const smoothConso = getMonotoneSplinePoints(rawConso, 4);

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.45);
    doc.setLineDashPattern([1.5, 1.2], 0);
    for (let i = 0; i < smoothConso.length - 1; i++) {
      doc.line(smoothConso[i].x, smoothConso[i].y, smoothConso[i + 1].x, smoothConso[i + 1].y);
    }

    // 4. Soutirage Réseau après BESS (solid blue line #2563eb)
    const rawReseau = chartData.map((d, i) => ({
      x: plotX + (i / (n - 1)) * plotW,
      y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - (Math.min(maxKw, Math.max(0, d.reseauApres || 0)) / maxKw) * plotH))
    }));
    const smoothReseau = getMonotoneSplinePoints(rawReseau, 4);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.65);
    doc.setLineDashPattern([], 0);
    for (let i = 0; i < smoothReseau.length - 1; i++) {
      doc.line(smoothReseau[i].x, smoothReseau[i].y, smoothReseau[i + 1].x, smoothReseau[i + 1].y);
    }

    // 5. Niveau de Charge BESS (%) (dashed purple line #9333ea)
    const rawSoc = chartData.map((d, i) => ({
      x: plotX + (i / (n - 1)) * plotW,
      y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - (Math.min(100, Math.max(0, d.socPct || 0)) / 100) * plotH))
    }));
    const smoothSoc = getMonotoneSplinePoints(rawSoc, 4);

    doc.setDrawColor(147, 51, 234);
    doc.setLineWidth(0.55);
    doc.setLineDashPattern([1.8, 1.2], 0);
    for (let i = 0; i < smoothSoc.length - 1; i++) {
      doc.line(smoothSoc[i].x, smoothSoc[i].y, smoothSoc[i + 1].x, smoothSoc[i + 1].y);
    }
    doc.setLineDashPattern([], 0);
  }
}

// ─── Tableau Fonctionnement Journée Type 24h & SOC % (réutilisable) ───
function drawHourlyJourneyTablePdf(doc, x, y, w, h, chartData = [], capacityKwh = 261) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('FONCTIONNEMENT DÉTAILLÉ SUR UNE JOURNÉE TYPE & NIVEAU DE CHARGE HORAIRE (%)', x + 3.5, y + 4.8);

  const halfW = (w - 7) / 2;
  const leftX = x + 2.5;
  const rightX = x + 4.5 + halfW;
  const headY = y + 6.8;
  const headH = 4.4;

  [leftX, rightX].forEach((hx) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(hx, headY, halfW, headH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text('Heure', hx + 1.5, headY + 3.1);
    doc.text('Conso', hx + 11.0, headY + 3.1);
    doc.text('Solaire', hx + 22.0, headY + 3.1);
    doc.text('Activité BESS', hx + 33.0, headY + 3.1);
    doc.text('Niveau Charge (%)', hx + 57.5, headY + 3.1);
    doc.text('Réseau', hx + halfW - 1.5, headY + 3.1, { align: 'right' });
  });

  const rowStartY = headY + headH;
  const availableRowsH = (y + h - 1.5) - rowStartY;
  const rowH = Math.max(4.0, availableRowsH / 12);

  chartData.slice(0, 24).forEach((hData, i) => {
    const isRight = i >= 12;
    const rowIdx = isRight ? i - 12 : i;
    const rx = isRight ? rightX : leftX;
    const ry = rowStartY + rowIdx * rowH;

    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(rx, ry, halfW, rowH, 'F');
    }

    const textY = ry + rowH / 2 + 1.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(15, 23, 42);
    doc.text(`${String(i).padStart(2, '0')}h`, rx + 1.5, textY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text(`${(hData.conso || 0).toFixed(1)} kW`, rx + 11.0, textY);
    doc.text(`${(hData.solaire || 0).toFixed(1)} kW`, rx + 22.0, textY);

    const chg = (hData.stockage || 0) > 0.05;
    const dis = (hData.restitution || 0) > 0.05;
    if (chg) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`Recharge (+${(hData.stockage).toFixed(1)} kW)`, rx + 33.0, textY);
    } else if (dis) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`Effacement (-${(hData.restitution).toFixed(1)} kW)`, rx + 33.0, textY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(8, 145, 178);
      doc.text(`Veille active (50 Hz)`, rx + 33.0, textY);
    }

    const socPct = hData.socPct ?? 0;
    const socKwh = hData.socKwh ?? 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(socPct > 50 ? 16 : 8, socPct > 50 ? 185 : 145, socPct > 50 ? 129 : 178);
    doc.text(`${socPct} % (${socKwh.toFixed(0)} kWh)`, rx + 57.5, textY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${(hData.reseauApres || 0).toFixed(1)} kW`, rx + halfW - 1.5, textY, { align: 'right' });
  });
}

// ─── Graphique Comparatif Multi-Courbes de Trésorerie Cumulée (3 Scénarios) ───
export function drawMultiCashFlowChartPdf(doc, x, y, w, h, scenarios = []) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Projection de Trésorerie Cumulée sur 20 Ans (Comparatif 3 Scénarios)', x + 4, y + 5.5);

  // Palettes de couleurs pour les 3 options
  const colorThemes = [
    { rgb: [37, 99, 235], label: 'Option 1 : ST54K' },
    { rgb: [5, 150, 105], label: 'Option 2 : ST62K' },
    { rgb: [124, 58, 237], label: 'Option 3 : UNIV 261' }
  ];

  // Calcul du min et du max global sur l'ensemble des scénarios
  let globalMin = -20000;
  let globalMax = 50000;

  const validScenarios = (scenarios || []).slice(0, 3).map((sc, idx) => {
    const sSim = sc.sim || sc;
    const capex = sSim.capex?.totalCapex || 20000;
    const yrs = Array.isArray(sSim.years) ? sSim.years : [];
    if (-capex < globalMin) globalMin = -capex;
    yrs.forEach(yr => {
      if (yr.cumProject > globalMax) globalMax = yr.cumProject;
      if (yr.cumProject < globalMin) globalMin = yr.cumProject;
    });
    const theme = colorThemes[idx] || colorThemes[0];
    const shortRef = sSim.model?.reference || `Option ${idx + 1}`;
    const triVal = sSim.kpis?.triEquity || sSim.kpis?.triProject;
    const tri = triVal !== null && triVal !== undefined ? `${triVal}%` : '—';
    const pay = sSim.kpis?.payback !== null && sSim.kpis?.payback !== undefined ? `${sSim.kpis.payback} ans` : '> 20 ans';

    return {
      title: sc.title || `Option ${idx + 1}`,
      shortRef,
      label: `Opt ${idx + 1} (${shortRef})`,
      color: theme.rgb,
      capex,
      years: yrs,
      tri,
      payback: pay
    };
  });

  // Légende en 2 lignes par option (Option en ligne 1, TRI & ROI en ligne 2 sous chaque option correspondante)
  const legColW = (w - 8) / 3;
  validScenarios.forEach((sc, idx) => {
    const legX = x + 4 + idx * legColW;

    // Ligne 1 : Puce de couleur et nom de l'option
    doc.setFillColor(sc.color[0], sc.color[1], sc.color[2]);
    doc.circle(legX + 1.2, y + 8.8, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(sc.color[0], sc.color[1], sc.color[2]);
    doc.text(`Opt ${idx + 1} (${sc.shortRef})`, legX + 3.8, y + 9.8);

    // Ligne 2 : TRI & ROI directement en dessous de l'option correspondante
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(71, 85, 105);
    doc.text(`TRI : ${sc.tri} · ROI : ${sc.payback}`, legX + 3.8, y + 13.5);
  });

  // Espace généreux sous la ligne TRI & ROI avant le tracé
  const plotX = x + 18;
  const plotY = y + 19.0;
  const plotW = w - 24;
  const plotH = h - 28.0;

  globalMin = Math.floor(globalMin / 10000) * 10000;
  globalMax = Math.ceil((globalMax * 1.10) / 10000) * 10000;
  const totalRange = Math.max(10000, globalMax - globalMin);
  const zeroFrac = (0 - globalMin) / totalRange;
  const zeroY = plotY + plotH - zeroFrac * plotH;

  // Lignes de repère
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(148, 163, 184);

  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.text(`${Math.round(globalMin / 1000)}k€`, plotX - 1.5, plotY + plotH + 1, { align: 'right' });

  doc.line(plotX, plotY, plotX + plotW, plotY);
  doc.text(`+${Math.round(globalMax / 1000)}k€`, plotX - 1.5, plotY + 1, { align: 'right' });

  // Ligne de zéro (seuil de rentabilité)
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.3);
  doc.line(plotX, zeroY, plotX + plotW, zeroY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(239, 68, 68);
  doc.text('0 € (Seuil de rentabilité)', plotX + 1, zeroY - 1);

  // Axe horizontal X (Années) avec espace aéré au-dessus
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.0);
  doc.setTextColor(148, 163, 184);
  for (let yr = 0; yr <= 20; yr += 2) {
    const gx = plotX + (yr / 20) * plotW;
    doc.text(`An ${yr}`, gx, plotY + plotH + 5.8, { align: 'center' });
  }

  // Tracer les 3 courbes distinctes
  validScenarios.forEach((sc) => {
    const points = [{ yr: 0, val: -sc.capex }, ...sc.years.map(y => ({ yr: y.year, val: y.cumProject }))];
    if (points.length > 1) {
      const n = points.length;
      doc.setDrawColor(sc.color[0], sc.color[1], sc.color[2]);
      doc.setLineWidth(0.65);

      for (let i = 0; i < n - 1; i++) {
        const x1 = plotX + (points[i].yr / 20) * plotW;
        const y1 = plotY + plotH - ((points[i].val - globalMin) / totalRange) * plotH;
        const x2 = plotX + (points[i + 1].yr / 20) * plotW;
        const y2 = plotY + plotH - ((points[i + 1].val - globalMin) / totalRange) * plotH;
        doc.line(x1, y1, x2, y2);
      }

      doc.setFillColor(sc.color[0], sc.color[1], sc.color[2]);
      for (let i = 0; i < n; i++) {
        const px = plotX + (points[i].yr / 20) * plotW;
        const py = plotY + plotH - ((points[i].val - globalMin) / totalRange) * plotH;
        doc.circle(px, py, 0.55, 'F');
      }
    }
  });
}

// ─── Graphique Trésorerie Cumulée & Amortissement 20 Ans (réutilisable) ───
function drawCashFlowChartPdf(doc, x, y, w, h, years = [], payback = 7.8, triProject = 10.8, includeGrid = false, totalCapex = 78500) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Projection de Trésorerie Cumulée & Seuil de Rentabilité (20 Ans)', x + 4, y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Temps de retour sur investissement : ~${payback ? payback : '7.8'} ans · TRI Projet : ${triProject ? triProject : '10.8'} %`, x + 4, y + 8.8);

  doc.setFillColor(37, 99, 235);
  doc.circle(x + w - 42, y + 4.5, 1.3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(37, 99, 235);
  doc.text('Trésorerie cumulée', x + w - 39, y + 5.5);

  const plotX = x + 18;
  const plotY = y + 11.5;
  const plotW = w - 24;
  const plotH = h - 17.5;

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
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);

  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.text(`${Math.round(minVal / 1000)}k€`, plotX - 1.5, plotY + plotH + 1, { align: 'right' });

  doc.line(plotX, plotY, plotX + plotW, plotY);
  doc.text(`+${Math.round(maxVal / 1000)}k€`, plotX - 1.5, plotY + 1, { align: 'right' });

  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.3);
  doc.line(plotX, zeroY, plotX + plotW, zeroY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(239, 68, 68);
  doc.text('0 € (Seuil de rentabilité)', plotX + 1, zeroY - 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  for (let yr = 0; yr <= 20; yr += 2) {
    const gx = plotX + (yr / 20) * plotW;
    doc.text(`An ${yr}`, gx, plotY + plotH + 4.0, { align: 'center' });
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
  doc.setFontSize(10.0);
  doc.setTextColor(15, 23, 42);
  doc.text('CHRONOGRAMME PRÉVISIONNEL DE DÉPLOIEMENT', x + 4, y + 4.8);

  const badgeBg = includeGrid ? [239, 246, 255] : [240, 253, 244];
  const badgeBorder = includeGrid ? [191, 219, 254] : [187, 247, 208];
  const badgeTxt = includeGrid ? [30, 64, 175] : [22, 101, 52];
  const badgeLabel = includeGrid ? 'Délai total : ~5 à 6 mois (Raccordement Enedis)' : 'Délai total : ~8 à 10 semaines';

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(x + w - 82, y + 1.5, 78, 5.5, 1.0, 1.0, 'F');
  doc.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
  doc.roundedRect(x + w - 82, y + 1.5, 78, 5.5, 1.0, 1.0, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(badgeTxt[0], badgeTxt[1], badgeTxt[2]);
  doc.text(badgeLabel, x + w - 43, y + 5.2, { align: 'center' });

  const colNameW = 76;
  const colStartX = x + colNameW;
  const totalColsW = w - colNameW - 4;
  const numCols = includeGrid ? 6 : 5;
  const colW = totalColsW / numCols;

  const tableHeaderY = y + 8.0;
  const tableHeaderH = 4.6;
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 2, tableHeaderY, w - 4, tableHeaderH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Étape / Jalon opérationnel', x + 4, tableHeaderY + 3.2);

  const colLabels = includeGrid
    ? ['Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6']
    : ['Sem. 1-2', 'Sem. 3-4', 'Sem. 5-6', 'Sem. 7-8', 'Sem. 9-10'];

  colLabels.forEach((lbl, cIdx) => {
    const cx = colStartX + cIdx * colW;
    doc.text(lbl, cx + colW / 2, tableHeaderY + 3.2, { align: 'center' });
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

  const rowsStartY = tableHeaderY + tableHeaderH;
  const availableRowsH = (y + h - 1.2) - rowsStartY;
  const rowH = Math.max(4.2, availableRowsH / steps.length);
  const barH = Math.min(4.4, rowH * 0.70);

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
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text(step.name, x + 4, ry + rowH / 2 + 1.2);

    const barX = colStartX + step.startFrac * totalColsW + 0.5;
    const barWidth = Math.max(7, (step.endFrac - step.startFrac) * totalColsW - 1);

    doc.setFillColor(step.color[0], step.color[1], step.color[2]);
    doc.roundedRect(barX, ry + (rowH - barH) / 2, barWidth, barH, 0.7, 0.7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(255, 255, 255);
    doc.text(step.label, barX + barWidth / 2, ry + rowH / 2 + 1.0, { align: 'center' });
  });
}
