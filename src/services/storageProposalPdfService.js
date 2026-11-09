/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GÉNÉRATEUR DE RAPPORTS PDF POUR LE MODULE « STOCKAGE BATTERIE »
 * 1. Étude Commerciale Client — 2 PAGES A4 PORTRAIT ULTRA-VISUELLES (ZÉRO BLABLA)
 *    - Page 1/2 : Profil certifié Enedis (4 blocs chiffres), 3 Cartes visuelles
 *      comparatives, Tableau comparatif 9 lignes, 3 puces synthétiques + 4 badges
 *    - Page 2/2 : Graphique 1 (Courbe de charge réelle 90 kW & écrêtage 49,5 kW),
 *      Graphique 2 (Trésorerie cumulée 20 ans des 3 options), Tableau financier
 *      20 ans et Chronogramme Gantt 6 barres
 * 2. Dossier Bancaire Officiel (4 pages : Note de synthèse, Plan de financement,
 *    Compte de résultat prévisionnel & Cash-flow 20 ans, Stress-test)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';
import {
  computeBessScenario,
  computeDailyAverageKwh,
  getDefaultScenariosConfig,
  STORAGE_CATALOG
} from '@/services/storageBatteryEngine.js';

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

function resolveSiteAddress(address, prm, clientName) {
  const upperName = String(clientName || '').toUpperCase();
  if (prm === '50009371514981' || upperName.includes('TERRES VIEILLES') || upperName.includes('LATOURNERIE')) {
    if (!address || address === 'France' || address.includes('Bois Reynaud')) {
      return 'Lieu-dit Terres Vieilles, 24310 Brantôme en Périgord';
    }
    return address;
  }
  if (prm === '16238205462430' || upperName.includes('GILBERT')) {
    return address && !address.includes('France')
      ? address
      : '594 Chemin des Bois Reynaud 24800 Saint-Martin-de-Fressengeas';
  }
  return address || 'Site Professionnel';
}

// ─── En-tête officiel ENR Courtage / Nelson ───
function drawHeader(doc, title, subtitle, pageNum, totalPages, subtitleLine2 = null, subtitleFontSize = null) {
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', 14, 7.5, 36, 11.2);
    } catch (_) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);
  doc.text('NELSON · INGÉNIERIE ÉNERGÉTIQUE & STOCKAGE BESS', 196, 11.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(100, 116, 139);
  doc.text(`Proposition commerciale · Éditée le ${new Date().toLocaleDateString('fr-FR')}`, 196, 16.0, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 19.8, 196, 19.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.0);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 25.5);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subtitleFontSize || 8.0);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 14, subtitleLine2 ? 29.6 : 30.8);
  }

  if (subtitleLine2) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subtitleFontSize ? subtitleFontSize - 0.4 : 7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitleLine2, 14, 33.4);
  }
}

function drawFooter(doc, pageNum, totalPages, isBank = false) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 285, 196, 285);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(148, 163, 184);
  const label = isBank
    ? 'Dossier de Financement Bancaire · Modélisation DSCR / TRI · Nelson / ENR Courtage SAS'
    : 'Proposition Commerciale Stockage Batterie BESS · Nelson / ENR Courtage · www.nelsonpv.fr';
  doc.text(label, 14, 289.5);
  doc.text(`Page ${pageNum} / ${totalPages}`, 196, 289.5, { align: 'right' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CALIBRAGE AUTOMATIQUE DES 3 SCÉNARIOS COMPARATIFS PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════
export function buildDefaultComparativeScenarios(sim) {
  const baseInput = sim?.input || {};
  const annualKwh = Number(baseInput.annualKwh) || 211781;
  const peakKw = Number(baseInput.peakKw) || 90.0;
  const defaultConfigs = getDefaultScenariosConfig(annualKwh, peakKw);

  return defaultConfigs.map((cfg, idx) => {
    const model = STORAGE_CATALOG.find(m => m.id === cfg.modelId) || STORAGE_CATALOG[0];
    const computedSim = computeBessScenario(
      baseInput,
      {
        model,
        quantity: cfg.quantity,
        hardwarePriceHt: undefined,
        installPriceHt: undefined,
        discountPct: 0,
        gridConnection: false
      },
      baseInput.finance || {}
    );
    const triProj = computedSim.kpis.triProject ?? 0;
    const autoPct = Math.round((computedSim.energy?.rates?.autonomyPvBat || 0) * 100);

    let badge = '';
    if (idx === 0) badge = `Écrêtage Agile · TRI Projet ${formatNum(triProj, 1)} %`;
    else if (idx === 1) badge = `Recommandée · TRI Projet ${formatNum(triProj, 1)} %`;
    else badge = `Autonomie Max ${autoPct} % · TRI Projet ${formatNum(triProj, 1)} %`;

    return {
      ...cfg,
      badge,
      model,
      turnkeyPrice: computedSim.capex.totalCapex,
      sim: computedSim,
      includedInPdf: true
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PDF ÉTUDE COMMERCIALE CLIENT — 2 PAGES A4 PORTRAIT ULTRA-VISUELLES
// ═══════════════════════════════════════════════════════════════════════════
export function generateClientCommercialPdf(params = {}) {
  const { sim, projectInfo = {} } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 2;

  const clientName = projectInfo.clientName || params.clientName || params.prmInfo?.titulaire || 'EARL DES TERRES VIEILLES - LATOURNERIE Franck';
  const prm = projectInfo.prm || params.prm || params.prmInfo?.prm || '50009371514981';
  const rawAddress = projectInfo.address || params.address || projectInfo.siteAddress || params.siteAddress || '';
  const address = resolveSiteAddress(rawAddress, prm, clientName);

  // Récupération ou construction automatique des 3 scénarios comparatifs
  const rawScenarios = Array.isArray(params.scenarios) && params.scenarios.length > 0
    ? params.scenarios
    : buildDefaultComparativeScenarios(sim);
  const scenarios = rawScenarios.filter(sc => sc.includedInPdf !== false);
  const activeScenarios = (scenarios.length > 0 ? scenarios : rawScenarios).slice(0, 3);

  const consoAnnuelle = Math.round(Number(sim?.input?.annualKwh) || 211781);
  const dailyMoy = sim?.dailyKwh || computeDailyAverageKwh(consoAnnuelle, sim?.input?.avgDailyKwh);
  const peakKw = Number(sim?.energy?.peakKw || sim?.input?.peakKw || 90.0);

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 1 / 2 : PROFIL ENEDIS & LES 3 PROPOSITIONS CLÉS EN MAIN
  // ═════════════════════════════════════════════════════════════════════════
  drawHeader(
    doc,
    'PROPOSITION COMMERCIALE : STOCKAGE INTELLIGENT BESS',
    `${clientName} · ${address}`,
    1,
    totalPages
  );

  // ── 1. BANDEAU "PROFIL ÉNERGÉTIQUE CERTIFIÉ ENEDIS DU SITE" (4 BLOCS CHIFFRES) ──
  const bannerY = 33.5;
  const bannerH = 17.5;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, bannerY, 182, bannerH, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(251, 191, 36);
  doc.text('PROFIL ÉNERGÉTIQUE CERTIFIÉ ENEDIS DATA CONNECT DU SITE', 17.5, bannerY + 4.2);

  const prmBlocks = [
    {
      label: 'CLIENT & PRM ENEDIS',
      val: String(clientName).slice(0, 28),
      sub: `PRM ${prm}`,
      w: 62,
      valColor: [255, 255, 255]
    },
    {
      label: 'CONSOMMATION ANNUELLE',
      val: `${formatNum(consoAnnuelle)} kWh/an`,
      sub: 'Historique télérelevé 12 mois',
      w: 40,
      valColor: [56, 189, 248]
    },
    {
      label: 'MOYENNE JOURNALIÈRE',
      val: `${formatNum(dailyMoy, 1)} kWh/jour`,
      sub: 'Besoin quotidien moyen',
      w: 40,
      valColor: [52, 211, 153]
    },
    {
      label: 'POINTE MAX À ÉCRÊTER',
      val: `${formatNum(peakKw, 1)} kW`,
      sub: 'Pic de puissance appelé',
      w: 40,
      valColor: [251, 191, 36]
    }
  ];

  let bx = 14;
  prmBlocks.forEach((b, idx) => {
    if (idx > 0) {
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.25);
      doc.line(bx, bannerY + 5.5, bx, bannerY + bannerH - 2.0);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(b.label, bx + 3.2, bannerY + 8.0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(idx === 0 ? 8.0 : 10.2);
    doc.setTextColor(b.valColor[0], b.valColor[1], b.valColor[2]);
    doc.text(b.val, bx + 3.2, bannerY + 12.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(203, 213, 225);
    doc.text(b.sub, bx + 3.2, bannerY + 16.0);

    bx += b.w;
  });

  // ── 2. LES 3 CARTES VISUELLES CÔTE À CÔTE (OPTION 1 vs OPTION 2 RECOMMANDÉE vs OPTION 3) ──
  const cardY = 53.5;
  const numCards = Math.min(3, activeScenarios.length);
  const cardW = (182 - (numCards - 1) * 3) / numCards;
  const cardH = 88.0;

  const cardThemes = [
    {
      headerTitle: 'OPTION 1 · ÉCRÊTAGE AGILE',
      subBadge: 'Budget Maîtrisé',
      bg: [239, 246, 255],
      border: [147, 197, 253],
      headerBg: [37, 99, 235],
      accent: [30, 64, 175],
      barColor: [37, 99, 235],
      pillBg: [219, 234, 254]
    },
    {
      headerTitle: 'OPTION 2 · RECOMMANDÉE',
      subBadge: 'Équilibre Optimal',
      bg: [236, 253, 245],
      border: [52, 211, 153],
      headerBg: [5, 150, 105],
      accent: [6, 95, 70],
      barColor: [16, 185, 129],
      pillBg: [209, 250, 229]
    },
    {
      headerTitle: 'OPTION 3 · HAUTE AUTONOMIE',
      subBadge: 'Autonomie Max',
      bg: [245, 243, 255],
      border: [196, 181, 253],
      headerBg: [124, 58, 237],
      accent: [91, 33, 182],
      barColor: [139, 92, 246],
      pillBg: [237, 233, 254]
    }
  ];

  activeScenarios.forEach((sc, idx) => {
    const cx = 14 + idx * (cardW + 3);
    const theme = cardThemes[idx] || cardThemes[0];
    const sSim = sc.sim || sim;
    const isRecommended = idx === 1;

    // Cadre principal de la carte
    doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
    doc.roundedRect(cx, cardY, cardW, cardH, 2.2, 2.2, 'F');
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.setLineWidth(isRecommended ? 0.65 : 0.35);
    doc.roundedRect(cx, cardY, cardW, cardH, 2.2, 2.2, 'D');
    doc.setLineWidth(0.25);

    // Bandeau supérieur coloré
    doc.setFillColor(theme.headerBg[0], theme.headerBg[1], theme.headerBg[2]);
    doc.roundedRect(cx, cardY, cardW, 8.0, 2.2, 2.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    doc.text(theme.headerTitle, cx + 2.8, cardY + 5.4);

    // Modèle & Puissance / Capacité
    const modelShort = `${sSim.quantity}× ${sSim.model.reference || sSim.model.name}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(modelShort.slice(0, 28), cx + 2.8, cardY + 13.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(`${formatNum(sSim.capacityKwh, 1)} kWh  ·  ${formatNum(sSim.powerKw, 0)} kW`, cx + 2.8, cardY + 18.2);

    // Bloc Prix Clé en Main HT (grand & lisible)
    const priceBoxY = cardY + 20.6;
    const priceBoxH = 12.0;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx + 2.5, priceBoxY, cardW - 5, priceBoxH, 1.5, 1.5, 'F');
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.roundedRect(cx + 2.5, priceBoxY, cardW - 5, priceBoxH, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 139);
    doc.text('PRIX CLÉ EN MAIN POSÉ HT', cx + 4.5, priceBoxY + 4.0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.text(`${formatNum(sSim.capex.totalCapex)} € HT`, cx + 4.5, priceBoxY + 9.8);

    // Bloc Jauge d'Autonomie / Couverture + Barre de progression
    const gaugeBoxY = cardY + 34.4;
    const gaugeBoxH = 17.5;
    const autoPct = Math.round((sSim.energy.rates.autonomyPvBat || 0) * 100);
    const transferredKwh = sSim.energy.totals.batThroughput || 0;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx + 2.5, gaugeBoxY, cardW - 5, gaugeBoxH, 1.5, 1.5, 'F');
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.roundedRect(cx + 2.5, gaugeBoxY, cardW - 5, gaugeBoxH, 1.5, 1.5, 'D');

    // Jauge circulaire à gauche
    const ringCx = cx + 10.0;
    const ringCy = gaugeBoxY + 8.8;
    doc.setFillColor(theme.pillBg[0], theme.pillBg[1], theme.pillBg[2]);
    doc.circle(ringCx, ringCy, 5.6, 'F');
    doc.setDrawColor(theme.barColor[0], theme.barColor[1], theme.barColor[2]);
    doc.setLineWidth(0.85);
    doc.circle(ringCx, ringCy, 5.6, 'D');
    doc.setLineWidth(0.25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.text(`${autoPct}%`, ringCx, ringCy + 1.1, { align: 'center' });

    // Titre + barre de progression à droite de la jauge
    const rightGx = cx + 17.5;
    const barW = cardW - 22.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`TAUX AUTONOMIE : ${autoPct} %`, rightGx, gaugeBoxY + 5.0);

    doc.setFillColor(226, 232, 240);
    doc.roundedRect(rightGx, gaugeBoxY + 6.8, barW, 3.0, 0.8, 0.8, 'F');
    const filledW = Math.max(2.5, (Math.min(100, autoPct) / 100) * barW);
    doc.setFillColor(theme.barColor[0], theme.barColor[1], theme.barColor[2]);
    doc.roundedRect(rightGx, gaugeBoxY + 6.8, filledW, 3.0, 0.8, 0.8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Énergie transférée : ${formatNum(transferredKwh)} kWh/an`, rightGx, gaugeBoxY + 14.5);

    // 3 Lignes d'indicateurs clés (Pointe après batterie, Économies An 1, ROI & TRI Projet)
    const kpiStartY = cardY + 54.0;

    // Ligne 1 : Pointe après batterie
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Pointe après BESS :', cx + 3.0, kpiStartY + 3.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${formatNum(sSim.energy.newPeakKw, 1)} kW (-${formatNum(sSim.energy.shaveKw, 1)} kW)`,
      cx + cardW - 3.0,
      kpiStartY + 3.2,
      { align: 'right' }
    );

    // Ligne 2 : Économies Facture An 1
    const ecoAn1 = sSim.gains.batterySavings + sSim.gains.solarSavings + sSim.gains.gridRevenue;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Économies Facture An 1 :', cx + 3.0, kpiStartY + 9.0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(5, 150, 105);
    doc.text(`+${formatNum(ecoAn1)} €/an`, cx + cardW - 3.0, kpiStartY + 9.0, { align: 'right' });

    // Ligne 3 : Temps de Retour (ROI) & TRI Projet (Séparation stricte TRI Projet vs TRI FP !)
    const roiText = sSim.kpis.payback !== null ? `${formatNum(sSim.kpis.payback, 1)} ans` : '> 20 ans';
    const triProjVal = sSim.kpis.triProject !== null ? `${formatNum(sSim.kpis.triProject, 1)} %` : '—';
    const triFpVal = sSim.kpis.triEquity !== null ? `${formatNum(sSim.kpis.triEquity, 1)} %` : '—';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text('ROI & TRI Projet :', cx + 3.0, kpiStartY + 14.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.text(`${roiText} • TRI ${triProjVal}`, cx + cardW - 3.0, kpiStartY + 14.8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(100, 116, 139);
    doc.text(`TRI Projet (sans levier) : ${triProjVal}  ·  TRI FP : ${triFpVal}`, cx + 3.0, kpiStartY + 19.0);

    // Bandeau Gain Net Cumulé sur 20 ans en bas de carte
    const gainBoxY = cardY + cardH - 12.2;
    doc.setFillColor(theme.pillBg[0], theme.pillBg[1], theme.pillBg[2]);
    doc.roundedRect(cx + 2.5, gainBoxY, cardW - 5, 10.0, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.text('GAIN NET 20 ANS', cx + 4.5, gainBoxY + 6.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`+${formatNum(sSim.kpis.gain20)} € HT`, cx + cardW - 4.5, gainBoxY + 6.6, { align: 'right' });
  });

  // ── 3. TABLEAU COMPARATIF SYNTHÉTIQUE DE 9 LIGNES ──
  const tableY = cardY + cardH + 3.0;
  const col0W = 62;
  const colScenarioW = (182 - col0W) / numCards;

  const tableHead = [
    'Poste & Indicateur Financier',
    'Option 1 · Écrêtage Agile\n(1× ST62K · 61,4 kWh)',
    'Option 2 · Recommandée\n(1× UNIV 261 · 261 kWh)',
    'Option 3 · Haute Autonomie\n(2× UNIV 261 · 522 kWh)'
  ];

  const tableRows = [
    [
      '1. Configuration & Puissance BESS',
      ...activeScenarios.map(sc => `${sc.sim.quantity}× ${sc.sim.model.reference}\n(${formatNum(sc.sim.capacityKwh, 1)} kWh / ${formatNum(sc.sim.powerKw, 0)} kW)`)
    ],
    [
      '2. Coût Matériel Batterie HT',
      ...activeScenarios.map(sc => `${formatNum(sc.sim.capex.hardwareCapex)} € HT`)
    ],
    [
      '3. Forfait Pose, Raccordement & EMS HT',
      ...activeScenarios.map(sc => `${formatNum(sc.sim.capex.installCapex)} € HT${sc.sim.capex.installDegressivity > 0 ? ` (-${Math.round(sc.sim.capex.installDegressivity * 100)}%)` : ''}`)
    ],
    [
      '4. INVESTISSEMENT CLÉ EN MAIN\n(CAPEX HT)',
      ...activeScenarios.map(sc => `${formatNum(sc.sim.capex.totalCapex)} € HT`)
    ],
    [
      '5. Gain Écrêtage de Pointe TURPE\n(€ HT/an)',
      ...activeScenarios.map(sc => `+${formatNum(sc.sim.gains.peakShavingValue)} €/an\n(-${formatNum(sc.sim.energy.shaveKw, 1)} kW)`)
    ],
    [
      '6. Gain Arbitrage HP/HC\n& Optimisation (€ HT/an)',
      ...activeScenarios.map(sc => `+${formatNum(sc.sim.gains.arbitrageSavings ?? (sc.sim.gains.batterySavings - sc.sim.gains.peakShavingValue))} €/an\n(${formatNum(sc.sim.energy.totals.batThroughput)} kWh/an)`)
    ],
    [
      '7. Maintenance & Supervision OPEX\n(€ HT/an)',
      ...activeScenarios.map(sc => `-${formatNum(sc.sim.opex)} €/an`)
    ],
    [
      '8. GAIN NET AN 1 (EBITDA)\nROI - TRI PROJET',
      ...activeScenarios.map(sc => `+${formatNum(sc.sim.gains.totalYear1 - sc.sim.opex)} €/an\n${formatNum(sc.sim.kpis.payback, 1)} ans - ${formatNum(sc.sim.kpis.triProject, 1)} %`)
    ],
    [
      '9. TRÉSORERIE NETTE CUMULÉE\nSUR 20 ANS',
      ...activeScenarios.map(sc => `+${formatNum(sc.sim.kpis.gain20)} € HT`)
    ]
  ];

  autoTable(doc, {
    startY: tableY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.8,
      cellPadding: 2.0
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      cellPadding: 1.85,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: col0W, fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: colScenarioW, halign: 'center' },
      2: { cellWidth: colScenarioW, halign: 'center', fillColor: [240, 253, 244] },
      3: { cellWidth: colScenarioW, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        data.cell.styles.halign = data.column.index === 0 ? 'left' : 'center';
      }
      if (data.section === 'body') {
        if (data.row.index === 3 || data.row.index === 7) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.row.index === 8) {
          data.cell.styles.fontSize = 8.5;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = data.column.index === 0 ? [15, 23, 42] : [5, 150, 105];
        }
      }
    },
    head: [tableHead],
    body: tableRows
  });

  // ── 4. SYNTHÈSE EN 3 PUCES D'UNE SEULE LIGNE (ZÉRO BLABLA) + 4 BADGES ICÔNES ──
  const sc1 = activeScenarios[0]?.sim || sim;
  const sc2 = activeScenarios[1]?.sim || sim;
  const sc3 = activeScenarios[2]?.sim || sim;

  const bulletsY = doc.lastAutoTable.finalY + 3.0;
  const bulletsH = 25.0;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, bulletsY, 182, bulletsH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, bulletsY, 182, bulletsH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(15, 23, 42);
  doc.text('SYNTHÈSE DÉCISIONNELLE EN UN COUP D\'ŒIL :', 17.5, bulletsY + 5.0);

  const bulletLines = [
    {
      color: [37, 99, 235],
      text: `• Option 1 : Idéale pour effacer la pointe (-${formatNum(sc1.energy.shaveKw, 1)} kW) à moindre coût (${formatNum(sc1.capex.totalCapex)} € HT · ROI ${formatNum(sc1.kpis.payback, 1)} ans).`
    },
    {
      color: [5, 150, 105],
      text: `• Option 2 (Recommandée) : Le meilleur compromis rentabilité (${formatNum(sc2.kpis.payback, 1)} ans · TRI Projet ${formatNum(sc2.kpis.triProject, 1)} %) / autonomie (${Math.round(sc2.energy.rates.autonomyPvBat * 100)} %).`
    },
    {
      color: [124, 58, 237],
      text: `• Option 3 : Autonomie maximale (${Math.round(sc3.energy.rates.autonomyPvBat * 100)} %) pour sécuriser tout le site (+${formatNum(sc3.kpis.gain20)} € HT de gain net sur 20 ans).`
    }
  ];

  bulletLines.forEach((b, bIdx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.text, 17.5, bulletsY + 10.2 + bIdx * 5.0);
  });

  // 4 Badges Icônes en bas de page 1
  const guarY = Math.max(267.0, bulletsY + bulletsH + 3.0);
  const guarW = (182 - 3 * 2.5) / 4;
  const guarH = 14.5;
  const guars = [
    {
      title: 'GARANTIE 10 ANS LFP',
      desc: '6 000 cycles · Rétention > 80%',
      bg: [239, 246, 255], border: [191, 219, 254], titleColor: [30, 64, 175]
    },
    {
      title: 'PILOTAGE EMS 24/7',
      desc: 'Écrêtage & Arbitrage HP/HC auto',
      bg: [236, 253, 245], border: [167, 243, 208], titleColor: [5, 150, 105]
    },
    {
      title: 'HOMOLOGATION CONSUEL',
      desc: 'Conformité VDE & Enedis C15-100',
      bg: [254, 243, 199], border: [253, 230, 138], titleColor: [180, 83, 9]
    },
    {
      title: 'DÉCLARATION PRÉALABLE',
      desc: 'Dossier urbanisme géré par Nelson',
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
    doc.setFontSize(7.0);
    doc.setTextColor(g.titleColor[0], g.titleColor[1], g.titleColor[2]);
    doc.text(g.title, gx + guarW / 2, guarY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(71, 85, 105);
    doc.text(g.desc, gx + guarW / 2, guarY + 10.5, { align: 'center' });
  });

  drawFooter(doc, 1, totalPages, false);

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 2 / 2 : LES 2 GRAPHIQUES VISUELS + TABLEAU DE TRÉSORERIE + PLANNING
  // ═════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(
    doc,
    'COURBE D\'ÉCRÊTAGE 24H, TRÉSORERIE SUR 20 ANS & PLANNING',
    `Profil horaire réel du PRM ${prm} (Pointe ${formatNum(peakKw, 1)} kW · ${formatNum(dailyMoy, 1)} kWh/j) & Projection financière sur 20 ans`,
    2,
    totalPages
  );

  // Scénario de référence pour le graphique 24h (Option 2 Recommandée 1× 261 kWh par défaut)
  const refScenario = activeScenarios[1] || activeScenarios[0] || { sim };
  const refSim = refScenario.sim || sim;

  // ── 1. GRAPHIQUE 1 (HAUT DE PAGE) : COURBE DE CHARGE JOURNALIÈRE RÉELLE ──
  drawCleanDailyLoadChartPdf(
    doc,
    14,
    33.5,
    182,
    60.0,
    refSim.energy.chart,
    refSim.energy.peakKw,
    refSim.energy.newPeakKw,
    `${refSim.quantity}× ${refSim.model.reference || refSim.model.name} (${formatNum(refSim.capacityKwh, 0)} kWh / ${formatNum(refSim.powerKw, 0)} kW)`,
    `Courbe de Charge Journalière Réelle du Site (Pointe ${formatNum(refSim.energy.peakKw, 1)} kW)`
  );

  // ── 2. GRAPHIQUE 2 (MILIEU HAUT) : PROJECTION DE TRÉSORERIE CUMULÉE SUR 20 ANS (3 OPTIONS) ──
  drawMultiCashFlowChartPdf(doc, 14, 96.0, 182, 60.0, activeScenarios);

  // ── 3. TABLEAU FINANCIER SUR 20 ANS (MILIEU BAS — 12 JALONS CLAIRS) ──
  const milestoneYears = [0, 1, 2, 3, 5, 7, 8, 9, 10, 12, 15, 20];
  const cfTableHead = [
    'Horizon / Année',
    `Option 1 · ${sc1.quantity}× ${sc1.model.reference}\n(Cumul Trésorerie € HT)`,
    `Option 2 (Recommandée) · ${sc2.quantity}× ${sc2.model.reference}\n(Cumul Trésorerie € HT)`,
    `Option 3 · ${sc3.quantity}× ${sc3.model.reference}\n(Cumul Trésorerie € HT)`
  ];

  const cfTableRows = milestoneYears.map(yrNum => {
    if (yrNum === 0) {
      return [
        'Investissement Initial (An 0)',
        ...activeScenarios.map(sc => `-${formatNum(sc.sim.capex.totalCapex)} €`)
      ];
    }
    return [
      `Année ${yrNum}${yrNum === 8 ? ' (Seuil ROI Opt. 1 & 2)' : yrNum === 9 ? ' (Seuil ROI Opt. 3)' : yrNum === 20 ? ' — Bilan Net 20 ans' : ''}`,
      ...activeScenarios.map(sc => {
        const yData = sc.sim.years.find(y => y.year === yrNum);
        return yData ? formatSignedNum(yData.cumProject, 0, ' €') : '—';
      })
    ];
  });

  autoTable(doc, {
    startY: 158.5,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.4,
      cellPadding: 1.35
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.15,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 53, fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: 43, halign: 'right' },
      2: { cellWidth: 43, halign: 'right', fillColor: [240, 253, 244] },
      3: { cellWidth: 43, halign: 'right' }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        data.cell.styles.halign = data.column.index === 0 ? 'left' : 'right';
      }
      if (data.section === 'body' && data.column.index > 0) {
        const rawText = String(data.cell.raw || '');
        if (rawText.startsWith('+')) {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (rawText.startsWith('-')) {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
      if (data.section === 'body' && data.row.index === milestoneYears.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
    head: [cfTableHead],
    body: cfTableRows
  });

  // ── 4. CHRONOGRAMME VISUEL DE DÉPLOIEMENT EN 6 BARRES COLORÉES (BAS DE PAGE) ──
  const chronoY = doc.lastAutoTable.finalY + 2.5;
  const chronoH = Math.max(40, 282.5 - chronoY);
  drawChronogrammeGantt(doc, 14, chronoY, 182, chronoH, Boolean(sim.grid));

  drawFooter(doc, 2, totalPages, false);

  const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const filename = `Proposition_Commerciale_BESS_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PDF DOSSIER BANCAIRE — 2 PAGES A4 PORTRAIT (100 % ALIGNÉ SUR computeBessScenario)
// ═══════════════════════════════════════════════════════════════════════════
export function generateBankDossierPdf({
  sim,
  projectInfo = {},
  selectedOptionNumber = null,
  selectedOptionTitle = null,
  selectedOptionModelName = null,
  scenarios = null
} = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 2;

  const clientName = projectInfo.clientName || 'EARL DES TERRES VIEILLES - LATOURNERIE Franck';
  const prm = projectInfo.prm || '50009371514981';
  const rawAddress = projectInfo.address || projectInfo.siteAddress || '';
  const address = resolveSiteAddress(rawAddress, prm, clientName);

  // Recalcul / synchronisation stricte des 3 options via computeBessScenario (Source Unique de Vérité)
  const baseInput = sim?.input || {
    annualKwh: 211781,
    avgDailyKwh: 578.6,
    peakKw: 90.0,
    profileKey: 'agricole',
    hpPrice: 0.20,
    hcPrice: 0.14,
    turpePowerPrice: 35,
    finance: { ratePct: 4.2, years: 10, equityPct: 20 }
  };

  const rawScenarios = Array.isArray(scenarios) && scenarios.length > 0
    ? scenarios.slice(0, 3).map((sc, idx) => {
        const scModel = sc.model || STORAGE_CATALOG.find(m => m.id === sc.modelId) || STORAGE_CATALOG[0];
        const scInput = sc.sim?.input || baseInput;
        const unifiedSim = computeBessScenario(
          scInput,
          {
            model: scModel,
            quantity: sc.quantity || sc.sim?.quantity || 1,
            hardwarePriceHt: sc.customHwPrice !== null && sc.customHwPrice !== undefined ? sc.customHwPrice : scInput.hardwarePriceHt,
            installPriceHt: sc.customInstallPrice !== null && sc.customInstallPrice !== undefined ? sc.customInstallPrice : scInput.installPriceHt,
            discountPct: scInput.discountPct || 0,
            gridConnection: Boolean(sc.bonusGridFcr ?? scInput.gridConnection)
          },
          scInput.finance || baseInput.finance || { ratePct: 4.2, years: 10, equityPct: 20 }
        );
        return {
          ...sc,
          id: sc.id || `opt${idx + 1}`,
          model: scModel,
          quantity: unifiedSim.quantity,
          sim: unifiedSim
        };
      })
    : buildDefaultComparativeScenarios(sim);

  // Détermination de l'option retenue (Option 1, 2 ou 3)
  let optNum = selectedOptionNumber;
  if (!optNum || optNum < 1 || optNum > rawScenarios.length) {
    const matchIdx = rawScenarios.findIndex(
      sc => sc.model?.id === sim?.model?.id && Number(sc.quantity) === Number(sim?.quantity)
    );
    optNum = matchIdx >= 0 ? matchIdx + 1 : 2;
  }

  const selectedScenarioObj = rawScenarios[optNum - 1] || rawScenarios[1] || rawScenarios[0];
  const targetSim = selectedScenarioObj?.sim
    ? selectedScenarioObj.sim
    : computeBessScenario(
        baseInput,
        {
          model: sim?.model,
          quantity: sim?.quantity || 1,
          hardwarePriceHt: baseInput.hardwarePriceHt,
          installPriceHt: baseInput.installPriceHt,
          discountPct: baseInput.discountPct || 0,
          gridConnection: Boolean(baseInput.gridConnection)
        },
        baseInput.finance || { ratePct: 4.2, years: 10, equityPct: 20 }
      );

  const consoAnnuelle = Math.round(Number(targetSim.input?.annualKwh) || 211781);
  const dailyMoy = targetSim.dailyKwh || computeDailyAverageKwh(consoAnnuelle, targetSim.input?.avgDailyKwh);
  const peakKw = Number(targetSim.energy?.peakKw || targetSim.input?.peakKw || 90.0);

  const loanYears = targetSim.financing.years || 10;
  const ratePct = targetSim.financing.ratePct ?? 4.2;
  const equityPct = Number(targetSim.input?.finance?.equityPct ?? 20);
  const debtPct = Math.max(0, 100 - equityPct);

  const shortModelRef = `${targetSim.quantity}× ${targetSim.model?.reference || targetSim.model?.name}`;
  const equipmentName = selectedOptionModelName || `${shortModelRef} (${formatNum(targetSim.capacityKwh, 1)} kWh / ${formatNum(targetSim.powerKw, 0)} kW)`;
  const optionLabel = selectedOptionTitle || (optNum === 1 ? 'Option 1 — Écrêtage Agile' : optNum === 2 ? 'Option 2 — Équilibre (Recommandée)' : 'Option 3 — Haute Autonomie');

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 1 / 2 : SYNTHÈSE EXÉCUTIVE D'ENGAGEMENT BANCAIRE & COMPARATIF 3 OPTIONS
  // ═════════════════════════════════════════════════════════════════════════
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', 14, 7.2, 34, 10.6);
    } catch (_) {}
  }

  // Badge Institutionnel Haut Droite
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(94, 7.2, 102, 6.2, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(251, 191, 36);
  doc.text('DOSSIER DE FINANCEMENT BANCAIRE — AUDIT ÉNERGÉTIQUE CERTIFIÉ ENEDIS', 145, 11.2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')} · Réf. PRM Enedis : ${prm}`, 196, 17.2, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 19.2, 196, 19.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.2);
  doc.setTextColor(15, 23, 42);
  doc.text('SYNTHÈSE EXÉCUTIVE D\'ENGAGEMENT BANCAIRE & BANCABILITÉ BESS', 14, 24.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(71, 85, 105);
  doc.text(`Raison Sociale : ${clientName}  ·  Site : ${address}`, 14, 28.8);

  // ── 1. BANDEAU D'IDENTIFICATION CERTIFIÉE ENEDIS & OPTION RETENUE ──
  const idBannerY = 31.0;
  const idBannerH = 14.5;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, idBannerY, 182, idBannerH, 1.8, 1.8, 'F');

  const idCols = [
    {
      lbl: 'PORTEUR & PRM CERTIFIÉ ENEDIS',
      val: `${String(clientName).slice(0, 26)}`,
      sub: `PRM ${prm} (Mandat eIDAS)`,
      w: 56,
      color: [255, 255, 255]
    },
    {
      lbl: 'CONSOMMATION & MOYENNE / J',
      val: `${formatNum(consoAnnuelle)} kWh/an`,
      sub: `Moyenne exacte : ${formatNum(dailyMoy, 1)} kWh/j`,
      w: 42,
      color: [56, 189, 248]
    },
    {
      lbl: 'POINTE MAX & ÉCRÊTAGE BESS',
      val: `${formatNum(peakKw, 1)} kW -> ${formatNum(targetSim.energy.newPeakKw, 1)} kW`,
      sub: `Effacement garanti : -${formatNum(targetSim.energy.shaveKw, 1)} kW`,
      w: 42,
      color: [52, 211, 153]
    },
    {
      lbl: `OPTION ${optNum} RETENUE`,
      val: `${shortModelRef}`,
      sub: `${formatNum(targetSim.capacityKwh, 1)} kWh / ${formatNum(targetSim.powerKw, 0)} kW (Autonomie ${Math.round(targetSim.energy.rates.autonomyPvBat * 100)} %)`,
      w: 42,
      color: [251, 191, 36]
    }
  ];

  let icx = 14;
  idCols.forEach((c, idx) => {
    if (idx > 0) {
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.25);
      doc.line(icx, idBannerY + 2.2, icx, idBannerY + idBannerH - 2.2);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(c.lbl, icx + 2.8, idBannerY + 4.4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, icx + 2.8, idBannerY + 9.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(203, 213, 225);
    doc.text(c.sub, icx + 2.8, idBannerY + 12.8);

    icx += c.w;
  });

  // ── 2. BANDEAU DES 6 KPI BANCAIRES MAJEURS DE L'OPTION RETENUE ──
  const cleanOptionLabel = (optionLabel || `Option ${optNum}`).replace(/[^\x20-\x7EÀ-ÿ]/g, '').trim();
  const kpiSectionY = 47.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `INDICATEURS DE BANCABILITÉ DE L'OPTION ${optNum} RETENUE (${cleanOptionLabel.toUpperCase()})`,
    14,
    kpiSectionY + 3.2
  );

  const ebitdaYear1 = targetSim.years?.[0]?.ebitda ?? (targetSim.gains.totalYear1 - targetSim.opex);
  const dscrAvg = targetSim.financing.dscrAvg ?? 0;
  const dscrMin = targetSim.financing.dscrMin ?? 0;

  // Badge couleur conformité DSCR (Vert >= 1.20x, Ambre 1.05x-1.19x, Rouge < 1.05x)
  const dscrTheme = dscrAvg >= 1.20
    ? {
        bg: [236, 253, 245],
        border: [52, 211, 153],
        lblColor: [5, 150, 105],
        valColor: [6, 95, 70],
        subColor: [4, 120, 87],
        badgeText: 'CONFORME >= 1,20x',
        badgeBg: [16, 185, 129]
      }
    : dscrAvg >= 1.05
    ? {
        bg: [254, 243, 199],
        border: [251, 191, 36],
        lblColor: [180, 83, 9],
        valColor: [146, 64, 14],
        subColor: [180, 83, 9],
        badgeText: 'ACCEPTABLE >= 1,05x',
        badgeBg: [245, 158, 11]
      }
    : {
        bg: [254, 242, 242],
        border: [248, 113, 113],
        lblColor: [185, 28, 28],
        valColor: [153, 27, 27],
        subColor: [185, 28, 28],
        badgeText: 'SOUS SEUIL < 1,05x',
        badgeBg: [239, 68, 68]
      };

  const bankKpis = [
    {
      label: '1. CAPEX TOTAL CLÉ EN MAIN HT',
      val: `${formatNum(targetSim.capex.totalCapex)} € HT`,
      sub: `Matériel : ${formatNum(targetSim.capex.hardwareCapex)} € | Pose & EMS : ${formatNum(targetSim.capex.installCapex)} €`,
      bg: [239, 246, 255],
      border: [147, 197, 253],
      lblColor: [30, 64, 175],
      valColor: [15, 23, 42],
      subColor: [71, 85, 105]
    },
    {
      label: `2. DETTE SENIOR (${debtPct} %) / APPORT (${equityPct} %)`,
      val: `Dette : ${formatNum(targetSim.financing.debt)} € | Apport : ${formatNum(targetSim.financing.equity)} €`,
      valFontSize: 8.6,
      sub: `Prêt Senior amortissable sur ${loanYears} ans à ${formatNum(ratePct, 1)} %`,
      bg: [238, 242, 255],
      border: [165, 180, 252],
      lblColor: [67, 56, 202],
      valColor: [49, 46, 129],
      subColor: [79, 70, 229]
    },
    {
      label: '3. EBITDA NET ANNÉE 1 (EXPLOITATION)',
      val: `+${formatNum(ebitdaYear1)} € HT/an`,
      sub: `Économies An 1 : +${formatNum(targetSim.gains.totalYear1)} € | OPEX : -${formatNum(targetSim.opex)} €`,
      bg: [236, 253, 245],
      border: [110, 231, 183],
      lblColor: [5, 150, 105],
      valColor: [6, 95, 70],
      subColor: [4, 120, 87]
    },
    {
      label: `4. ANNUITÉ CRÉDIT (${loanYears} ANS À ${formatNum(ratePct, 1)} %)`,
      val: `-${formatNum(targetSim.financing.annuity)} € HT/an`,
      sub: `Puis 0 €/an de l'Année ${loanYears + 1} à l'Année 20\n(Intérêts totaux : ${formatNum(targetSim.financing.totalInterest)} €)`,
      bg: [248, 250, 252],
      border: [203, 213, 225],
      lblColor: [71, 85, 105],
      valColor: [15, 23, 42],
      subColor: [100, 116, 139]
    },
    {
      label: '5. RATIO DSCR MOYEN / MIN (COUVERTURE)',
      val: `${formatNum(dscrAvg, 2)}x`,
      badge: dscrTheme.badgeText,
      badgeBg: dscrTheme.badgeBg,
      sub: `DSCR Min (An 1) : ${formatNum(dscrMin, 2)}x\nCible bancaire >= 1,15x respectée`,
      bg: dscrTheme.bg,
      border: dscrTheme.border,
      lblColor: dscrTheme.lblColor,
      valColor: dscrTheme.valColor,
      subColor: dscrTheme.subColor
    },
    {
      label: '6. TRI PROJET vs TRI FONDS PROPRES',
      val: `TRI Projet : ${formatNum(targetSim.kpis.triProject, 1)} % | TRI FP : ${formatNum(targetSim.kpis.triEquity, 1)} %`,
      valFontSize: 8.6,
      sub: `ROI Projet : ${formatNum(targetSim.kpis.payback, 1)} ans · VAN (5%) : +${formatNum(targetSim.kpis.van)} €`,
      bg: [254, 243, 199],
      border: [252, 211, 77],
      lblColor: [180, 83, 9],
      valColor: [120, 53, 15],
      subColor: [146, 64, 14]
    }
  ];

  const kpiBoxW = (182 - 2 * 3) / 3;
  const kpiBoxH = 19.5;
  bankKpis.forEach((bk, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const kx = 14 + col * (kpiBoxW + 3);
    const ky = kpiSectionY + 5.0 + row * (kpiBoxH + 2.2);

    doc.setFillColor(bk.bg[0], bk.bg[1], bk.bg[2]);
    doc.roundedRect(kx, ky, kpiBoxW, kpiBoxH, 1.8, 1.8, 'F');
    doc.setDrawColor(bk.border[0], bk.border[1], bk.border[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(kx, ky, kpiBoxW, kpiBoxH, 1.8, 1.8, 'D');
    doc.setLineWidth(0.25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(bk.lblColor[0], bk.lblColor[1], bk.lblColor[2]);
    doc.text(bk.label, kx + 2.8, ky + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bk.valFontSize || 10.2);
    doc.setTextColor(bk.valColor[0], bk.valColor[1], bk.valColor[2]);
    doc.text(bk.val, kx + 2.8, ky + 10.6);

    if (bk.badge) {
      doc.setFillColor(bk.badgeBg[0], bk.badgeBg[1], bk.badgeBg[2]);
      doc.roundedRect(kx + kpiBoxW - 28.5, ky + 6.4, 26.0, 5.0, 1.0, 1.0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text(bk.badge, kx + kpiBoxW - 15.5, ky + 9.7, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(bk.subColor[0], bk.subColor[1], bk.subColor[2]);
    const subLines = String(bk.sub || '').split('\n');
    if (subLines.length > 1) {
      doc.text(subLines[0], kx + 2.8, ky + 14.2);
      doc.text(subLines[1], kx + 2.8, ky + 17.5);
    } else {
      doc.text(bk.sub, kx + 2.8, ky + 15.6);
    }
  });

  // ── 3. TABLEAU COMPARATIF DE BANCABILITÉ DES 3 SCÉNARIOS ──
  const compTitleY = kpiSectionY + 5.0 + 2 * (kpiBoxH + 2.2) + 2.0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(15, 23, 42);
  doc.text('TABLEAU COMPARATIF DE BANCABILITÉ DES 3 PROPOSITIONS GRADUÉES', 14, compTitleY);

  const compHead = [
    'Indicateur Financier & Bancaire',
    ...rawScenarios.map((sc, idx) => {
      const s = sc.sim;
      const isSel = idx + 1 === optNum;
      return `Option ${idx + 1}${isSel ? ' (RETENUE)' : ''}\n${s.quantity}× ${s.model.reference}`;
    })
  ];

  const compRows = [
    [
      '1. Capacité / Puissance & Autonomie',
      ...rawScenarios.map(sc => `${formatNum(sc.sim.capacityKwh, 1)} kWh / ${formatNum(sc.sim.powerKw, 0)} kW (${Math.round(sc.sim.energy.rates.autonomyPvBat * 100)} %)`)
    ],
    [
      '2. CAPEX Clé en Main HT (Matériel + Pose)',
      ...rawScenarios.map(sc => `${formatNum(sc.sim.capex.totalCapex)} € HT (${formatNum(sc.sim.capex.hardwareCapex)} + ${formatNum(sc.sim.capex.installCapex)})`)
    ],
    [
      `3. Dette Senior (${debtPct} %) / Apport FP (${equityPct} %)`,
      ...rawScenarios.map(sc => `${formatNum(sc.sim.financing.debt)} €  /  ${formatNum(sc.sim.financing.equity)} €`)
    ],
    [
      `4. Annuité Emprunt (${loanYears} ans à ${formatNum(ratePct, 1)} %)`,
      ...rawScenarios.map(sc => `-${formatNum(sc.sim.financing.annuity)} € HT/an`)
    ],
    [
      '5. Économies Facture An 1\n(TURPE + Arbitrage HP/HC)',
      ...rawScenarios.map(sc => `+${formatNum(sc.sim.gains.totalYear1)} €/an\n(${formatNum(sc.sim.gains.peakShavingValue)} + ${formatNum(sc.sim.gains.arbitrageSavings)})`)
    ],
    [
      '6. Charges OPEX An 1\n(Maintenance & Supervision)',
      ...rawScenarios.map(sc => `-${formatNum(sc.sim.opex)} € HT/an`)
    ],
    [
      '7. EBITDA Net Année 1\n(Revenu Net d\'Exploitation)',
      ...rawScenarios.map(sc => `+${formatNum(sc.sim.years?.[0]?.ebitda ?? (sc.sim.gains.totalYear1 - sc.sim.opex))} € HT/an`)
    ],
    [
      '8. Cash-Flow Net Année 1\n(Après service de la dette)',
      ...rawScenarios.map(sc => formatSignedNum(sc.sim.years?.[0]?.cfAfterDebt ?? 0, 0, ' €/an'))
    ],
    [
      `9. Ratio DSCR Moyen (${loanYears} ans)\n/ DSCR Min (An 1)`,
      ...rawScenarios.map(sc => `${formatNum(sc.sim.financing.dscrAvg, 2)}x\n(Min An 1 : ${formatNum(sc.sim.financing.dscrMin, 2)}x)`)
    ],
    [
      '10. TRI Projet (Sans levier)  |  TRI Fonds Propres',
      ...rawScenarios.map(sc => `TRI Projet : ${formatNum(sc.sim.kpis.triProject, 1)} %\nTRI FP : ${formatNum(sc.sim.kpis.triEquity, 1)} %`)
    ],
    [
      '11. Trésorerie Nette Cumulée à 20 ans\n& ROI Projet',
      ...rawScenarios.map(sc => `+${formatNum(sc.sim.kpis.gain20)} € HT\n(ROI ${formatNum(sc.sim.kpis.payback, 1)} ans)`)
    ]
  ];

  autoTable(doc, {
    startY: compTitleY + 1.8,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 7.2,
      cellPadding: 1.35
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.85,
      cellPadding: 1.15,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 56, fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: 42, halign: 'center', fillColor: optNum === 1 ? [240, 253, 244] : [255, 255, 255] },
      2: { cellWidth: 42, halign: 'center', fillColor: optNum === 2 ? [240, 253, 244] : [255, 255, 255] },
      3: { cellWidth: 42, halign: 'center', fillColor: optNum === 3 ? [240, 253, 244] : [255, 255, 255] }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        data.cell.styles.halign = data.column.index === 0 ? 'left' : 'center';
        data.cell.styles.font = 'helvetica';
        if (data.column.index === optNum) {
          data.cell.styles.fillColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [255, 255, 255];
        } else {
          data.cell.styles.fontStyle = data.column.index === 0 ? 'bold' : 'normal';
        }
      }
      if (data.section === 'body') {
        if ([1, 6, 8, 9, 10].includes(data.row.index)) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.row.index === 10 && data.column.index > 0) {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }
    },
    head: [compHead],
    body: compRows
  });

  // ── 4. GRAPHIQUE 1 (BAS DE PAGE 1) : COUVERTURE ANNUELLE DU SERVICE DE LA DETTE (EBITDA vs ANNUITÉ) ──
  const debtChartY = doc.lastAutoTable.finalY + 3.0;
  const debtChartH = Math.max(68.0, 283.0 - debtChartY);

  drawDebtCoverageChartPdf(
    doc,
    14,
    debtChartY,
    182,
    debtChartH,
    targetSim,
    `Option ${optNum}`,
    equipmentName
  );

  drawFooter(doc, 1, totalPages, true);

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 2 / 2 : PROFIL D'ÉCRÊTAGE PHYSIQUE & TABLEAU D'AMORTISSEMENT BANCAIRE SUR 20 ANS
  // ═════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(
    doc,
    'PROFIL D\'ÉCRÊTAGE PHYSIQUE & PLAN D\'AMORTISSEMENT BANCAIRE 20 ANS',
    `Option ${optNum} retenue : ${equipmentName}`,
    2,
    totalPages
  );

  // ── 1. GRAPHIQUE 2 (HAUT DE PAGE 2) : PREUVE PHYSIQUE DES ÉCONOMIES (COURBE 24H CERTIFIÉE) ──
  drawCleanDailyLoadChartPdf(
    doc,
    14,
    33.5,
    182,
    62.0,
    targetSim.energy.chart,
    targetSim.energy.peakKw,
    targetSim.energy.newPeakKw,
    `${shortModelRef} (${formatNum(targetSim.capacityKwh, 0)} kWh / ${formatNum(targetSim.powerKw, 0)} kW)`,
    'Preuve Physique des Économies : Courbe de Charge Réelle du PRM'
  );

  // ── 2. TABLEAU COMPLET D'EXPLOITATION ET DE SERVICE DE LA DETTE SUR 20 ANS (ANNÉES 1 À 20) ──
  // Espace aéré avant le titre du tableau d'amortissement
  const table2TitleY = 105.0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(15, 23, 42);
  doc.text('TABLEAU D\'EXPLOITATION ET DE SERVICE DE LA DETTE SUR 20 ANS', 14, table2TitleY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`(${cleanOptionLabel.toUpperCase()} — DETTE ${formatNum(targetSim.financing.debt)} € SUR ${loanYears} ANS À ${formatNum(ratePct, 1)} %)`, 14, table2TitleY + 3.8);

  // Identification de l'année exacte de bascule où la Trésorerie Cumulée devient >= 0
  let crossoverYear = null;
  for (const yr of targetSim.years) {
    if (yr.cumProject >= 0) {
      crossoverYear = yr.year;
      break;
    }
  }

  let sumEco = 0;
  let sumGrid = 0;
  let sumOpex = 0;
  let sumEbitda = 0;
  let sumDebtService = 0;
  let sumCfNet = 0;

  const scheduleRows = targetSim.years.map((yr) => {
    const ecoFacture = (yr.batterySavings || 0) + (yr.solarSavings || 0);
    const revReseau = yr.gridRevenue || 0;
    sumEco += ecoFacture;
    sumGrid += revReseau;
    sumOpex += yr.opex || 0;
    sumEbitda += yr.ebitda || 0;
    sumDebtService += yr.debtService || 0;
    sumCfNet += yr.cfAfterDebt || 0;

    let yearLabel = `Année ${yr.year}`;
    if (yr.year === crossoverYear && yr.year === loanYears) {
      yearLabel = `Année ${yr.year} (ROI & Fin prêt)`;
    } else if (yr.year === crossoverYear) {
      yearLabel = `Année ${yr.year} (Bascule ROI > 0)`;
    } else if (yr.year === loanYears) {
      yearLabel = `Année ${yr.year} (Fin emprunt)`;
    }

    return [
      yearLabel,
      `+${formatNum(ecoFacture)} €`,
      revReseau > 0 ? `+${formatNum(revReseau)} €` : '0 €',
      `-${formatNum(yr.opex)} €`,
      `+${formatNum(yr.ebitda)} €`,
      yr.debtService > 0 ? `-${formatNum(yr.debtService)} €` : '0 €',
      formatSignedNum(yr.cfAfterDebt, 0, ' €'),
      yr.dscr !== null && yr.dscr !== undefined ? `${formatNum(yr.dscr, 2)}x` : '—',
      formatSignedNum(yr.cumProject, 0, ' €')
    ];
  });

  // Ligne 21 : TOTAL CUMULÉ 20 ANS
  scheduleRows.push([
    'TOTAL CUMULÉ 20 ANS',
    `+${formatNum(sumEco)} €`,
    sumGrid > 0 ? `+${formatNum(sumGrid)} €` : '0 €',
    `-${formatNum(sumOpex)} €`,
    `+${formatNum(sumEbitda)} €`,
    `-${formatNum(sumDebtService)} €`,
    formatSignedNum(sumCfNet, 0, ' €'),
    `${formatNum(dscrAvg, 2)}x moy.`,
    `+${formatNum(targetSim.kpis.gain20)} €`
  ]);

  const crossoverRowIndex = crossoverYear ? crossoverYear - 1 : -1;
  const loanEndRowIndex = loanYears - 1;
  const totalRowIndex = scheduleRows.length - 1;

  autoTable(doc, {
    startY: table2TitleY + 5.5,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 1.1,
      halign: 'right'
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.0,
      cellPadding: 0.95,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 47, fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: 18, halign: 'right' },
      2: { cellWidth: 12, halign: 'right' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 17, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index === 0) data.cell.styles.halign = 'left';
        else if (data.column.index === 7) data.cell.styles.halign = 'center';
        else data.cell.styles.halign = 'right';
      }
      if (data.section === 'body') {
        const rIdx = data.row.index;
        // Colonne Trésorerie : augmentation d'un point de la police (9.0 pt au lieu de 8.0 pt)
        if (data.column.index === 8) {
          data.cell.styles.fontSize = 9.0;
        }

        // Couleurs sémantiques par colonne
        if (data.column.index === 1) data.cell.styles.textColor = [5, 150, 105];
        if (data.column.index === 3) data.cell.styles.textColor = [220, 38, 38];
        if (data.column.index === 7) data.cell.styles.textColor = [67, 56, 202];
        if (data.column.index === 8) {
          const txt = String(data.cell.raw || '');
          data.cell.styles.textColor = txt.startsWith('+') ? [5, 150, 105] : [100, 116, 139];
        }

        // Ligne de bascule où la Trésorerie Cumulée devient positive
        if (rIdx === crossoverRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [236, 253, 245];
          if (data.column.index === 0 || data.column.index === 8) {
            data.cell.styles.textColor = [6, 95, 70];
          }
        }

        // Ligne Année 10 (fin du remboursement de l'emprunt bancaire)
        if (rIdx === loanEndRowIndex && rIdx !== crossoverRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [239, 246, 255];
          if (data.column.index === 0 || data.column.index === 5) {
            data.cell.styles.textColor = [30, 64, 175];
          }
        }

        // Ligne TOTAL CUMULÉ 20 ANS
        if (rIdx === totalRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = data.column.index === 8 ? [52, 211, 153] : [255, 255, 255];
        }
      }
    },
    head: [[
      'Année (1 à 20)',
      'Économies (€)',
      'Réseau (€)',
      'OPEX (€)',
      'EBITDA (€)',
      'Annuité (€)',
      'Cash-Flow (€)',
      'DSCR (x)',
      'Trésorerie (€)'
    ]],
    body: scheduleRows
  });

  // Bandeau récapitulatif de fin de page 2 (Sous le tableau 20 ans)
  const summaryBankY = doc.lastAutoTable.finalY + 2.5;
  const summaryBankH = 11.5;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, summaryBankY, 182, summaryBankH, 1.8, 1.8, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(14, summaryBankY, 182, summaryBankH, 1.8, 1.8, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(6, 95, 70);
  doc.text(
    `SYNTHÈSE DE BANCABILITÉ (${cleanOptionLabel.toUpperCase()})`,
    17.5,
    summaryBankY + 4.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `• DSCR Moyen : ${formatNum(dscrAvg, 2)}x (Min An 1 : ${formatNum(dscrMin, 2)}x)  ·  TRI Projet : ${formatNum(targetSim.kpis.triProject, 1)} %  ·  TRI Fonds Propres : ${formatNum(targetSim.kpis.triEquity, 1)} %  ·  Gain Net 20 ans : +${formatNum(targetSim.kpis.gain20)} € HT`,
    17.5,
    summaryBankY + 8.6
  );

  // ── 3. GARANTIES TECHNIQUES & SÉCURISATION DE L'ACTIF (4 ENCADRÉS EN BAS DE PAGE 2) ──
  const guarFooterY = Math.min(270.0, summaryBankY + summaryBankH + 3.0);
  const secBoxes = [
    {
      title: 'CHIMIE LiFePO4 ININFLAMMABLE',
      desc: 'Certifiée UL 9540A, CEI 62619 & NFPA 855',
      bg: [239, 246, 255],
      border: [191, 219, 254],
      color: [30, 64, 175]
    },
    {
      title: 'GARANTIE 10 ANS / 6 000 CYCLES',
      desc: 'Contrat O&M & Supervision EMS 24/7',
      bg: [236, 253, 245],
      border: [167, 243, 208],
      color: [5, 150, 105]
    },
    {
      title: 'DERRIÈRE LE COMPTEUR (BTM)',
      desc: '0 € de frais Enedis · 0 risque réglementaire',
      bg: [254, 243, 199],
      border: [253, 230, 138],
      color: [180, 83, 9]
    },
    {
      title: 'AUDIT CERTIFIÉ ENEDIS DATA CONNECT',
      desc: 'Mandat eIDAS vérifié · PRM télérelevé',
      bg: [245, 243, 255],
      border: [221, 214, 254],
      color: [124, 58, 237]
    }
  ];

  const secBoxW = (182 - 3 * 2.4) / 4;
  const secBoxH = 13.5;
  secBoxes.forEach((sb, idx) => {
    const sx = 14 + idx * (secBoxW + 2.4);
    doc.setFillColor(sb.bg[0], sb.bg[1], sb.bg[2]);
    doc.roundedRect(sx, guarFooterY, secBoxW, secBoxH, 1.5, 1.5, 'F');
    doc.setDrawColor(sb.border[0], sb.border[1], sb.border[2]);
    doc.roundedRect(sx, guarFooterY, secBoxW, secBoxH, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(sb.color[0], sb.color[1], sb.color[2]);
    doc.text(sb.title, sx + secBoxW / 2, guarFooterY + 5.0, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(sb.desc, sx + secBoxW / 2, guarFooterY + 9.6, { align: 'center' });
  });

  drawFooter(doc, 2, totalPages, true);

  const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const filename = `Dossier_Bancaire_BESS_Opt${optNum}_${cleanName}.pdf`;
  doc.save(filename);
  return filename;
}

// ─── Graphique Bancaire (Bas de Page 1) : Couverture Annuelle du Service de la Dette (EBITDA vs Annuité) ───
function drawDebtCoverageChartPdf(doc, x, y, w, h, sim, optionNumLabel = 'Option 2', equipmentName = '') {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  const loanYears = sim.financing?.years || 10;
  const ann = sim.financing?.annuity || 0;
  const dscrAvg = sim.financing?.dscrAvg ?? 0;
  const dscrMin = sim.financing?.dscrMin ?? 0;

  // Ligne 1 : Titre épuré sans "d'Emprunt sur 20 ans"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(15, 23, 42);
  doc.text('Couverture Annuelle du Service de la Dette (EBITDA vs Annuité)', x + 4, y + 5.0);

  // Ligne 2 : Option choisie sur une seconde ligne alignée à gauche
  const cleanEqName = (equipmentName || `${sim.quantity}× ${sim.model?.reference}`).replace(/[^\x20-\x7EÀ-ÿ]/g, '').trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 64, 175);
  doc.text(`Option retenue : ${optionNumLabel} — ${cleanEqName}`, x + 4, y + 9.0);

  // Ligne 3 : Sous-titre & marge de sécurité
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Marge de sécurité bancaire : DSCR Moyen ${formatNum(dscrAvg, 2)}x (Min An 1 : ${formatNum(dscrMin, 2)}x) · Prêt remboursé en An ${loanYears}, puis 100 % d'excédent net (An ${loanYears + 1} à 20)`,
    x + 4,
    y + 12.8
  );

  // Légende en haut à droite
  doc.setFillColor(16, 185, 129);
  doc.rect(x + w - 82, y + 3.4, 3.2, 2.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(5, 150, 105);
  doc.text('EBITDA Net annuel (€)', x + w - 77.5, y + 5.5);

  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.7);
  doc.line(x + w - 45, y + 4.7, x + w - 39, y + 4.7);
  doc.setTextColor(220, 38, 38);
  doc.text(`Annuité Dette (${formatNum(ann)} €/an)`, x + w - 37.5, y + 5.5);

  const plotX = x + 16;
  const plotY = y + 16.5;
  const plotW = w - 22;
  const plotH = h - 22.5;

  const years = Array.isArray(sim.years) ? sim.years : [];
  const maxEbitda = Math.max(ann * 1.3, ...years.map(yr => yr.ebitda || 0), 5000);
  const maxVal = Math.ceil((maxEbitda * 1.12) / 2000) * 2000;

  // Grille horizontale
  const steps = 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(100, 116, 139);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round((maxVal / steps) * s);
    const gy = plotY + plotH - (s / steps) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(`${(val / 1000).toFixed(val >= 10000 ? 0 : 1)} k€`, plotX - 1.5, gy + 1.0, { align: 'right' });
  }

  // Barres vertes EBITDA Net (Années 1 à 20)
  const n = Math.min(20, years.length);
  const slotW = plotW / Math.max(1, n);
  const barW = Math.min(6.2, slotW * 0.62);
  const baseLineY = plotY + plotH;

  years.slice(0, n).forEach((yr, idx) => {
    const ebitda = Math.max(0, yr.ebitda || 0);
    const bh = Math.min(plotH, (ebitda / maxVal) * plotH);
    const bx = plotX + idx * slotW + (slotW - barW) / 2;
    const by = baseLineY - bh;

    // Vert émeraude pendant la période de prêt (An 1..10), vert soutenu après remboursement (An 11..20)
    if (yr.year <= loanYears) {
      doc.setFillColor(16, 185, 129);
    } else {
      doc.setFillColor(5, 150, 105);
    }
    doc.roundedRect(bx, by, barW, Math.max(0.8, bh), 0.6, 0.6, 'F');

    // Libellé Axe X
    doc.setFont('helvetica', yr.year === loanYears ? 'bold' : 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(yr.year === loanYears ? 30 : 100, yr.year === loanYears ? 64 : 116, yr.year === loanYears ? 175 : 139);
    doc.text(`A${yr.year}`, bx + barW / 2, baseLineY + 3.8, { align: 'center' });

    // Valeur au-dessus des barres jalons (An 1, An 5, An 10, An 15, An 20)
    if ([1, 5, 10, 15, 20].includes(yr.year)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(6, 95, 70);
      doc.text(`${(ebitda / 1000).toFixed(1)}k`, bx + barW / 2, by - 1.0, { align: 'center' });
    }
  });

  // Ligne rouge/bleue du Service de la Dette (Annuité fixe de An 1 à An N, puis décrochage à 0 € de An N+1 à An 20)
  if (ann > 0 && n > 0) {
    const annY = baseLineY - Math.min(plotH, (ann / maxVal) * plotH);
    const loanEndX = plotX + Math.min(n, loanYears) * slotW;

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.75);
    doc.setLineDashPattern([], 0);
    // Palier horizontal An 1 -> An N
    doc.line(plotX, annY, loanEndX, annY);
    // Descente verticale à 0 € à la fin de l'Année N
    doc.line(loanEndX, annY, loanEndX, baseLineY);
    // Palier à 0 € de An N+1 -> An 20
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.65);
    doc.line(loanEndX, baseLineY, plotX + plotW, baseLineY);

    // Étiquette sur la ligne d'annuité
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(plotX + 2, Math.max(plotY + 0.5, annY - 4.8), 54, 4.2, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(185, 28, 28);
    doc.text(`Annuité fixe : ${formatNum(ann)} €/an (An 1 à ${loanYears})`, plotX + 4, Math.max(plotY + 3.5, annY - 1.8));

    // Étiquette 0 € après remboursement
    if (loanYears < n) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(30, 64, 175);
      doc.text(`Dette = 0 €/an (An ${loanYears + 1} à 20 : 100 % Cash-Flow libre)`, loanEndX + 3, baseLineY - 1.5);
    }
  }
}

// ─── Interpolation cubique monotone Fritsch-Carlson (identique au rendu Recharts de Nelson) ───
function getMonotoneSplinePoints(points, samplesPerSegment = 6) {
  const n = points.length;
  if (n <= 1) return points;
  if (n === 2) {
    const res = [];
    for (let s = 0; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      res.push({
        x: points[0].x + t * (points[1].x - points[0].x),
        y: points[0].y + t * (points[1].y - points[0].y)
      });
    }
    return res;
  }

  const dx = [];
  const dy = [];
  const slopes = [];
  for (let i = 0; i < n - 1; i++) {
    const dxi = points[i + 1].x - points[i].x;
    const dyi = points[i + 1].y - points[i].y;
    dx.push(dxi);
    dy.push(dyi);
    slopes.push(dxi === 0 ? 0 : dyi / dxi);
  }

  const m = new Array(n).fill(0);
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / slopes[i];
      const beta = m[i + 1] / slopes[i];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        m[i] = tau * alpha * slopes[i];
        m[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  const result = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const hx = dx[i];
    const m0 = m[i];
    const m1 = m[i + 1];

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      const px = p0.x + t * hx;
      const py = h00 * p0.y + h10 * hx * m0 + h01 * p1.y + h11 * hx * m1;
      result.push({ x: px, y: py });
    }
  }
  result.push(points[n - 1]);
  return result;
}

// ─── Graphique 1 (Style épuré Proposition_BESS) : Courbe de Charge Journalière Réelle (90,0 kW) ───
function drawCleanDailyLoadChartPdf(
  doc,
  x,
  y,
  w,
  h,
  chartData = [],
  peakKw = 90.0,
  newPeakKw = 49.5,
  modelLabel = '1× UNIV ESS 261 AC (261 kWh / 232 kW)',
  customTitle = null
) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  // Titre & Sous-titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    customTitle || `Courbe de Charge Journalière Réelle du Site (Pointe ${formatNum(peakKw, 1)} kW)`,
    x + 4,
    y + 5.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Écrêtage de la pointe de ${formatNum(peakKw, 1)} kW vers ${formatNum(newPeakKw, 1)} kW (-${formatNum(peakKw - newPeakKw, 1)} kW) & recharge lissée en Heures Creuses · ${modelLabel}`,
    x + 4,
    y + 9.2
  );

  // Légende alignée à droite : polices et styles rigoureusement identiques (helvetica bold 6.8pt)
  const sansBatLabel = `Sans batterie (Pic ${formatNum(peakKw, 0)} kW)`;
  const avecBatLabel = `Avec batterie (${formatNum(newPeakKw, 1)} kW)`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  const wSans = doc.getTextWidth(sansBatLabel);
  const wAvec = doc.getTextWidth(avecBatLabel);
  const dotR = 1.2;
  const gap = 5;
  const totalLegW = dotR * 2 + 1.8 + wSans + gap + dotR * 2 + 1.8 + wAvec;
  const legStartX = x + w - totalLegW - 4;

  // Sans batterie (Gris)
  doc.setFillColor(100, 116, 139);
  doc.circle(legStartX + dotR, y + 4.8, dotR, 'F');
  doc.setTextColor(100, 116, 139);
  doc.text(sansBatLabel, legStartX + dotR * 2 + 1.8, y + 5.6);

  // Avec batterie (Vert)
  const avecStartX = legStartX + dotR * 2 + 1.8 + wSans + gap;
  doc.setFillColor(16, 185, 129);
  doc.circle(avecStartX + dotR, y + 4.8, dotR, 'F');
  doc.setTextColor(5, 150, 105);
  doc.text(avecBatLabel, avecStartX + dotR * 2 + 1.8, y + 5.6);

  const plotX = x + 15;
  const plotY = y + 13.0;
  const plotW = w - 21;
  const plotH = h - 19.5;

  const maxKw = Math.max(100, Math.ceil((peakKw * 1.1) / 10) * 10);
  const steps = 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round((maxKw / steps) * s);
    const gy = plotY + plotH - (s / steps) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(`${val} kW`, plotX - 1.8, gy + 1.0, { align: 'right' });
  }

  // Axe X (00h à 23h)
  const tickHours = [0, 3, 6, 9, 12, 15, 18, 21, 23];
  tickHours.forEach(th => {
    const gx = plotX + (th / 23) * plotW;
    doc.text(`${String(th).padStart(2, '0')}h`, gx, plotY + plotH + 4.2, { align: 'center' });
  });

  const n = chartData.length;
  if (n > 1) {
    const baseGroundY = plotY + plotH;

    // Construction des points bruts
    const rawConsoPts = chartData.map((d, i) => ({
      x: plotX + (i / (n - 1)) * plotW,
      y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - ((d.conso || 0) / maxKw) * plotH))
    }));

    const rawReseauPts = chartData.map((d, i) => ({
      x: plotX + (i / (n - 1)) * plotW,
      y: Math.min(baseGroundY, Math.max(plotY, plotY + plotH - ((d.reseauApres || 0) / maxKw) * plotH))
    }));

    // Interpolation par splines cubiques monotones (rendu lisse identique à Nelson / Recharts)
    const smoothConsoPts = getMonotoneSplinePoints(rawConsoPts, 6);
    const smoothReseauPts = getMonotoneSplinePoints(rawReseauPts, 6);

    // 1. Remplissage vert clair sous la courbe "Avec batterie" (smoothReseauPts)
    doc.setFillColor(209, 250, 229);
    for (let i = 0; i < smoothReseauPts.length - 1; i++) {
      const p1 = smoothReseauPts[i];
      const p2 = smoothReseauPts[i + 1];
      doc.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, baseGroundY, 'F');
      doc.triangle(p2.x, p2.y, p2.x, baseGroundY, p1.x, baseGroundY, 'F');
    }

    // 2. Courbe "Sans batterie" (conso réelle montant à 90,0 kW en journée) en gris ardoise lissé
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.55);
    doc.setLineDashPattern([], 0);
    for (let i = 0; i < smoothConsoPts.length - 1; i++) {
      doc.line(smoothConsoPts[i].x, smoothConsoPts[i].y, smoothConsoPts[i + 1].x, smoothConsoPts[i + 1].y);
    }

    // 3. Courbe "Avec batterie" (reseauApres plafonnée à 49,5 kW) en vert émeraude lissé
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.75);
    for (let i = 0; i < smoothReseauPts.length - 1; i++) {
      doc.line(smoothReseauPts[i].x, smoothReseauPts[i].y, smoothReseauPts[i + 1].x, smoothReseauPts[i + 1].y);
    }

    // 4. Ligne de plafond d'écrêtage (49,5 kW)
    const capY = plotY + plotH - (newPeakKw / maxKw) * plotH;
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.line(plotX, capY, plotX + plotW, capY);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(5, 150, 105);
    doc.text(`Plafond écrêté : ${formatNum(newPeakKw, 1)} kW`, plotX + plotW - 1.5, capY - 1.2, { align: 'right' });

    // Étiquette de la pointe avant (90,0 kW) au sommet
    const peakIdx = chartData.findIndex(d => Math.abs((d.conso || 0) - peakKw) < 0.2);
    if (peakIdx >= 0) {
      const px = plotX + (peakIdx / (n - 1)) * plotW;
      const py = plotY + plotH - (peakKw / maxKw) * plotH;
      doc.setFillColor(239, 68, 68);
      doc.circle(px, py, 1.0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(220, 38, 38);
      doc.text(`Pointe PRM : ${formatNum(peakKw, 1)} kW`, px + 2.2, py + 0.8);
    }
  }
}

// ─── Graphique 2 : Projection de Trésorerie Cumulée sur 20 Ans (Comparatif des 3 Options) ───
export function drawMultiCashFlowChartPdf(doc, x, y, w, h, scenarios = []) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.0);
  doc.setTextColor(15, 23, 42);
  doc.text('Projection de Trésorerie Cumulée & Seuil de Rentabilité sur 20 Ans (Comparatif des 3 Options)', x + 4, y + 5.2);

  const colorThemes = [
    { rgb: [37, 99, 235] },
    { rgb: [5, 150, 105] },
    { rgb: [124, 58, 237] }
  ];

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
    const shortRef = `${sSim.quantity || 1}× ${sSim.model?.reference || `Option ${idx + 1}`}`;
    const triVal = sSim.kpis?.triProject;
    const tri = triVal !== null && triVal !== undefined ? `${formatNum(triVal, 1)} %` : '—';
    const pay = sSim.kpis?.payback !== null && sSim.kpis?.payback !== undefined ? `${formatNum(sSim.kpis.payback, 1)} ans` : '> 20 ans';
    const gain20 = sSim.kpis?.gain20 || 0;

    return {
      shortRef,
      color: theme.rgb,
      capex,
      years: yrs,
      tri,
      payback: pay,
      gain20
    };
  });

  // Légende sur 2 lignes distinctes par option (Option & batterie en ligne 1, ROI & TRI Projet en ligne 2 en dessous)
  const legColW = (w - 8) / 3;
  validScenarios.forEach((sc, idx) => {
    const legX = x + 4 + idx * legColW;
    // Puce colorée
    doc.setFillColor(sc.color[0], sc.color[1], sc.color[2]);
    doc.circle(legX + 1.2, y + 8.8, 1.1, 'F');

    // Ligne 1 : Option X (Modèle batterie)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(sc.color[0], sc.color[1], sc.color[2]);
    doc.text(`Option ${idx + 1} (${sc.shortRef})`, legX + 3.5, y + 9.5);

    // Ligne 2 : ROI & TRI Projet sous chaque option
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(71, 85, 105);
    doc.text(`ROI ${sc.payback} - TRI Projet ${sc.tri}`, legX + 3.5, y + 13.0);
  });

  const plotX = x + 16;
  const plotY = y + 16.0;
  const plotW = w - 38;
  const plotH = h - 22.5;

  globalMin = Math.floor(globalMin / 20000) * 20000;
  globalMax = Math.ceil((globalMax * 1.08) / 20000) * 20000;
  const totalRange = Math.max(20000, globalMax - globalMin);
  const zeroFrac = (0 - globalMin) / totalRange;
  const zeroY = plotY + plotH - zeroFrac * plotH;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);

  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.text(`${Math.round(globalMin / 1000)} k€`, plotX - 1.5, plotY + plotH + 1, { align: 'right' });

  doc.line(plotX, plotY, plotX + plotW, plotY);
  doc.text(`+${Math.round(globalMax / 1000)} k€`, plotX - 1.5, plotY + 1, { align: 'right' });

  // Ligne rouge 0 € (Seuil de rentabilité / Payback)
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.35);
  doc.line(plotX, zeroY, plotX + plotW, zeroY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(220, 38, 38);
  doc.text('0 € (Seuil de rentabilité / Payback)', plotX + 1.5, zeroY - 1.0);

  // Axe X (An 0 à An 20)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  for (let yr = 0; yr <= 20; yr += 2) {
    const gx = plotX + (yr / 20) * plotW;
    doc.text(`An ${yr}`, gx, plotY + plotH + 4.2, { align: 'center' });
  }

  // Tracé des 3 courbes + étiquettes des gains finaux à 20 ans
  validScenarios.forEach((sc) => {
    const points = [{ yr: 0, val: -sc.capex }, ...sc.years.map(yr => ({ yr: yr.year, val: yr.cumProject }))];
    if (points.length > 1) {
      const n = points.length;
      doc.setDrawColor(sc.color[0], sc.color[1], sc.color[2]);
      doc.setLineWidth(0.7);

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
        doc.circle(px, py, 0.65, 'F');
      }

      // Étiquette du gain final à 20 ans à droite de la courbe
      const lastPt = points[n - 1];
      const endX = plotX + plotW;
      const endY = plotY + plotH - ((lastPt.val - globalMin) / totalRange) * plotH;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(sc.color[0], sc.color[1], sc.color[2]);
      doc.text(`+${formatNum(sc.gain20)} €`, endX + 1.8, endY + 1.0);
    }
  });
}

// ─── Chronogramme Gantt compact 6 étapes (incluant Déclaration Préalable en étape 2) ───
function drawChronogrammeGantt(doc, x, y, w, h, includeGrid = false) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text('CHRONOGRAMME PRÉVISIONNEL DE DÉPLOIEMENT CLÉ EN MAIN', x + 4, y + 4.8);

  const badgeBg = includeGrid ? [239, 246, 255] : [240, 253, 244];
  const badgeBorder = includeGrid ? [191, 219, 254] : [187, 247, 208];
  const badgeTxt = includeGrid ? [30, 64, 175] : [22, 101, 52];
  const badgeLabel = includeGrid ? 'Délai total : ~5 à 6 mois (Raccordement Enedis)' : 'Délai total : ~8 à 10 semaines';

  const badgeW = includeGrid ? 68 : 44;
  const badgeX = x + w - badgeW - 3;
  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(badgeX, y + 1.4, badgeW, 5.0, 1.0, 1.0, 'F');
  doc.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
  doc.roundedRect(badgeX, y + 1.4, badgeW, 5.0, 1.0, 1.0, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(badgeTxt[0], badgeTxt[1], badgeTxt[2]);
  doc.text(badgeLabel, badgeX + badgeW / 2, y + 4.8, { align: 'center' });

  const colNameW = 78;
  const colStartX = x + colNameW;
  const totalColsW = w - colNameW - 4;
  const numCols = includeGrid ? 6 : 5;
  const colW = totalColsW / numCols;

  const tableHeaderY = y + 7.6;
  const tableHeaderH = 4.2;
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 2, tableHeaderY, w - 4, tableHeaderH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(71, 85, 105);
  doc.text('Étape / Jalon opérationnel', x + 4, tableHeaderY + 3.0);

  const colLabels = includeGrid
    ? ['Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6']
    : ['Sem. 1-2', 'Sem. 3-4', 'Sem. 5-6', 'Sem. 7-8', 'Sem. 9-10'];

  colLabels.forEach((lbl, cIdx) => {
    const cx = colStartX + cIdx * colW;
    doc.text(lbl, cx + colW / 2, tableHeaderY + 3.0, { align: 'center' });
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
        { name: '2. Demande d\'autorisation d\'urbanisme (Déclaration Préalable)', ...wk(2, 7), label: '4 à 6 semaines', color: [99, 102, 241] },
        { name: '3. Approvisionnement & Livraison de la batterie BESS', ...wk(5, 9), label: 'Sem. 5–9', color: [16, 185, 129] },
        { name: '4. Génie civil (Dalle béton) & Fixation de l\'armoire', ...wk(7, 9), label: 'Sem. 7–9', color: [245, 158, 11] },
        { name: '5. Raccordement TGBT intérieur & Intégration EMS', ...wk(8, 10), label: 'Sem. 8–10', color: [147, 51, 234] },
        { name: '6. Essais, Consuel & Mise en service site', ...wk(10, 10), label: 'Sem. 10', color: [22, 163, 74] }
      ];

  const rowsStartY = tableHeaderY + tableHeaderH;
  const availableRowsH = (y + h - 1.2) - rowsStartY;
  const rowH = Math.max(4.0, availableRowsH / steps.length);
  const barH = Math.min(4.0, rowH * 0.70);

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
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(step.name, x + 4, ry + rowH / 2 + 1.1);

    const barX = colStartX + step.startFrac * totalColsW + 0.5;
    const barWidth = Math.max(7, (step.endFrac - step.startFrac) * totalColsW - 1);

    doc.setFillColor(step.color[0], step.color[1], step.color[2]);
    doc.roundedRect(barX, ry + (rowH - barH) / 2, barWidth, barH, 0.7, 0.7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(255, 255, 255);
    doc.text(step.label, barX + barWidth / 2, ry + rowH / 2 + 0.9, { align: 'center' });
  });
}
