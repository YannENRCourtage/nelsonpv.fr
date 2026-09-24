/**
 * SechoirPDFGenerator — Dossier d'Étude Complet Séchoir Multi-Matières BatiTech® (6 Pages Paysage)
 * ──────────────────────────────────────────────────────────────────────────────
 * Génère un document PDF A4 Paysage (Landscape) 6 pages haute résolution :
 *  - Page 1 : Page Résultats intégrale (5 KPIs avec puissance installée kWc, dimensions et surface, Investissement Initial & Financement, Flux de Trésorerie, Subventions Régionales)
 *  - Page 2 : Business Plan Détaillé sur 25 ans (Grand Graphique ROI surélevé + Tableau Complet des 25 Années avec colonne Charges)
 *  - Page 3 : Simulation d'Autoconsommation de la Production Solaire PV (6 hypothèses de consommation 5k à 50k kWh/an, sans surplus, option stockage batterie BESS, tableau matriciel & bar chart)
 *  - Page 4 : Vue 3D réelle Configurateur selon modèle (3.1.15 / 6.2.15 / 8.3.15) et Implantation Satellite superposées
 *  - Page 5 : Schémas Techniques de Séchage Solaire BatiTech® (Vues 3D, coupes transversales, caissons & bottes, grilles de séchage)
 *  - Page 6 : Synthèse des Bénéfices d'Exploitation (Avantages Financiers/Opérationnels + Grand Graphique de Baisse des Charges)
 *
 * Fond blanc pur, pagination au-dessus du trait, en-têtes et pieds de page officiels NELSON.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot.js';
import { BATITECH_MODELS, getRegionForDepartment } from '@/data/sechoirBatitechModels.js';
import { BATITECH_3D_IMAGES } from '@/data/batitechImagesBase64.js';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';
import useSechoirStore from '@/stores/useSechoirStore.js';

// ─── Formatage ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDec = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);

// ─── Graphique des Réductions de Charges (Page 4) ──────────────────────────────
export function drawSechoirChargesChart(canvas) {
  canvas.width = 1800;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const c_blue = '#0D3660';
  const c_green = '#00B050';

  const categories = [
    ['Prestations', 'externes'],
    ["Plastiques", "d'enrubannage"],
    ['Compléments', 'alimentaires'],
    ['Carburant', '(tracteur)'],
    ["Main", "d'œuvre"]
  ];
  const reductions = [100, 90, 80, 70, 65];
  const explanations = [
    '-100% (Suppression totale des frais)',
    '-90% (Zéro consommables enrubannage)',
    '-80% (Substitué par un foin séché à haute valeur nutritive)',
    '-70% (Moins de passages au champ)',
    '-65% (Gain de temps et manutention réduite)'
  ];
  const colors = [c_green, '#16a34a', '#22c55e', '#0d9488', '#0284c7'];

  const leftMargin = 260;
  const rightMargin = 640;
  const topMargin = 25;
  const bottomMargin = 85;
  const chartWidth = canvas.width - leftMargin - rightMargin;
  const chartHeight = canvas.height - topMargin - bottomMargin;
  const barSlot = chartHeight / categories.length;
  const barH = barSlot * 0.65;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;

  // Axes
  ctx.beginPath();
  ctx.moveTo(leftMargin, topMargin + chartHeight);
  ctx.lineTo(leftMargin + chartWidth, topMargin + chartHeight);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftMargin, topMargin);
  ctx.lineTo(leftMargin + chartHeight, topMargin + chartHeight);
  ctx.stroke();

  // Graduations X : 0, 25, 50, 75, 100%
  const xticks = [0, 25, 50, 75, 100];
  xticks.forEach(tick => {
    const x = leftMargin + (tick / 100) * chartWidth;
    ctx.beginPath();
    ctx.moveTo(x, topMargin + chartHeight);
    ctx.lineTo(x, topMargin + chartHeight + 8);
    ctx.stroke();

    ctx.fillStyle = c_blue;
    ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${tick}%`, x, topMargin + chartHeight + 34);
  });

  // Titre Axe X
  ctx.fillStyle = c_blue;
  ctx.font = 'bold 24px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Baisse estimée des charges annuelles d'exploitation (%)", leftMargin + chartWidth / 2, topMargin + chartHeight + 72);

  // Barres & Textes
  for (let i = 0; i < categories.length; i++) {
    const yCenter = topMargin + (i + 0.5) * barSlot;
    const yTop = yCenter - barH / 2;
    const barW = (reductions[i] / 100) * chartWidth;

    // Label gauche
    ctx.fillStyle = c_blue;
    ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    if (categories[i].length === 2) {
      ctx.fillText(categories[i][0], leftMargin - 18, yCenter - 4);
      ctx.fillText(categories[i][1], leftMargin - 18, yCenter + 20);
    } else {
      ctx.fillText(categories[i][0], leftMargin - 18, yCenter + 8);
    }

    // Barre
    ctx.fillStyle = colors[i];
    ctx.fillRect(leftMargin, yTop, barW, barH);

    // Texte droite
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(explanations[i], leftMargin + barW + 18, yCenter + 8);
  }
}

// ─── Graphique de Trésorerie Cumulée (Page 3) ──────────────────────────────────
export function drawLandscapeTreasuryChart(canvas, cashFlows, roi = 8.79) {
  canvas.width = 1800;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;
  const padding = { top: 48, right: 40, bottom: 55, left: 100 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const validFlows = (cashFlows || []).filter(cf => cf.annee > 0);
  const values = validFlows.map(cf => cf.cumul);
  const maxVal = Math.max(...values, 0) || 400000;
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const count = validFlows.length || 25;
  const barWidth = (chartW / count) * 0.76;
  const gap = (chartW / count) * 0.24;

  const zeroY = padding.top + (maxVal / range) * chartH;

  // Grille horizontale
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (i / gridSteps) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();

    const val = maxVal - (i / gridSteps) * range;
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(Math.round(val))} €`, padding.left - 12, y + 6);
  }

  // Barres
  let roiBarX = null;
  let roiBarY = null;
  const roiYear = Math.ceil(Number(roi || 8.79));

  validFlows.forEach((cf, i) => {
    const x = padding.left + i * (chartW / count) + gap / 2;
    const barH = Math.max(4, Math.abs(cf.cumul / range) * chartH);
    const isPositive = cf.cumul >= 0;
    const y = isPositive ? zeroY - barH : zeroY;

    if (cf.annee === roiYear) {
      roiBarX = x + barWidth / 2;
      roiBarY = y;
    }

    ctx.fillStyle = isPositive ? '#10b981' : '#ef4444';
    ctx.fillRect(x, y, barWidth, barH);

    // Labels X (1, 2, 3... sans le "A")
    ctx.fillStyle = '#475569';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${cf.annee}`, x + barWidth / 2, H - padding.bottom + 24);
  });

  // Ligne Y=0
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(W - padding.right, zeroY);
  ctx.stroke();

  // Indicateur visuel du ROI sur le graphique
  if (roiBarX !== null) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(roiBarX, padding.top + 10);
    ctx.lineTo(roiBarX, H - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Badge ROI
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(roiBarX - 110, padding.top + 8, 220, 32, 8);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`★ ROI : ${Number(roi || 8.79).toFixed(1)} ans (Année ${roiYear})`, roiBarX, padding.top + 29);
  }

  // Titre du graphique
  ctx.fillStyle = '#0D3660';
  ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Évolution de la Trésorerie Cumulée (25 ans) — Amortissement (ROI) estimé à ${Number(roi || 8.79).toFixed(1)} ans`, padding.left, 28);
}

// ─── Simulation Autoconsommation & Factures (Page 3) ───────────────────────────
export const AUTOCONSOMMATION_TIERS = [5000, 10000, 15000, 20000, 30000, 50000];
export const INITIAL_PRICE_PER_KWH = 0.25;
export const INFLATION_RATE_ELEC = 0.02;
export const FACTOR_25_YEARS_ELEC = (Math.pow(1 + INFLATION_RATE_ELEC, 25) - 1) / INFLATION_RATE_ELEC;

export function getAutoconsumptionData(consKwh, pvProdKwh, withBattery = false) {
  let autoprodRate = 0;
  if (!withBattery) {
    if (consKwh === 5000) autoprodRate = 0.40;
    else if (consKwh === 10000) autoprodRate = 0.42;
    else if (consKwh === 15000) autoprodRate = 0.45;
    else if (consKwh === 20000) autoprodRate = 0.48;
    else if (consKwh === 30000) autoprodRate = 0.50;
    else autoprodRate = 0.48; // 50 000
  } else {
    if (consKwh === 5000) autoprodRate = 0.90;
    else if (consKwh === 10000) autoprodRate = 0.85;
    else if (consKwh === 15000) autoprodRate = 0.82;
    else if (consKwh === 20000) autoprodRate = 0.78;
    else if (consKwh === 30000) autoprodRate = 0.72;
    else autoprodRate = 0.60; // 50 000
  }

  // Autoconsommation plafonnée par la production PV disponible (avec coefficient d'efficience)
  const autoconsoKwh = Math.min(consKwh * autoprodRate, pvProdKwh * 0.92);
  const realAutoprodRate = autoconsoKwh / consKwh;

  const initialBill = consKwh * INITIAL_PRICE_PER_KWH;
  const savingsYear1 = autoconsoKwh * INITIAL_PRICE_PER_KWH;
  const residualBill = initialBill - savingsYear1;
  const cumulativeSavings25 = savingsYear1 * FACTOR_25_YEARS_ELEC;

  return {
    consKwh,
    label: `${fmt(consKwh / 1000)} k`,
    autoconsoKwh: Math.round(autoconsoKwh),
    autoprodRate: realAutoprodRate,
    initialBill: Math.round(initialBill),
    savingsYear1: Math.round(savingsYear1),
    residualBill: Math.round(residualBill),
    cumulativeSavings25: Math.round(cumulativeSavings25),
  };
}

export function drawAutoconsumptionBarChart(canvas, data) {
  canvas.width = 1400;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;
  const padding = { top: 30, right: 30, bottom: 65, left: 110 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Échelle Y
  const maxVal = Math.max(...data.map(d => d.initialBill), 12500);
  const yCeil = Math.ceil(maxVal / 2000) * 2000;

  // Lignes de grille horizontales
  const steps = 7;
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= steps; i++) {
    const val = (yCeil / steps) * i;
    const y = padding.top + chartH - (val / yCeil) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(Math.round(val))} €`, padding.left - 14, y + 6);
  }

  // Groupes de barres
  const groupCount = data.length;
  const groupSlot = chartW / groupCount;
  const barW = groupSlot * 0.24;
  const barGap = groupSlot * 0.04;

  data.forEach((d, i) => {
    const groupCenter = padding.left + (i + 0.5) * groupSlot;
    const x1 = groupCenter - barW * 1.5 - barGap;
    const x2 = groupCenter - barW * 0.5;
    const x3 = groupCenter + barW * 0.5 + barGap;

    const h1 = Math.max(3, (d.initialBill / yCeil) * chartH);
    const h2 = Math.max(3, (d.savingsYear1 / yCeil) * chartH);
    const h3 = Math.max(3, (d.residualBill / yCeil) * chartH);

    const y1 = padding.top + chartH - h1;
    const y2 = padding.top + chartH - h2;
    const y3 = padding.top + chartH - h3;

    const fillRoundedBar = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    };

    // Barre 1 : Facture Sans Solaire (Gris #cbd5e1)
    fillRoundedBar(x1, y1, barW, h1, '#cbd5e1');

    // Barre 2 : Économie Autoconsommée (Vert #10b981)
    fillRoundedBar(x2, y2, barW, h2, '#10b981');

    // Barre 3 : Facture Réseau Résiduelle (Ambre #f59e0b)
    fillRoundedBar(x3, y3, barW, h3, '#f59e0b');

    // Label Axe X
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, groupCenter, H - padding.bottom + 32);
  });

  // Ligne de base
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartH);
  ctx.lineTo(W - padding.right, padding.top + chartH);
  ctx.stroke();
}

// ─── Header & Footer Helpers ───────────────────────────────────────────────────
function renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge = 'ÉTUDE DE RENTABILITÉ & DOSSIER TECHNIQUE COMPLET' }) {
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #0D3660; padding-bottom: 5px; margin-bottom: 9px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR COURTAGE" style="height: 28px; width: auto; object-fit: contain; display: block;" />
        <span style="font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">${pageBadge}</span>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">
          Séchoir Multi-Matières <span style="color: #f59e0b;">BatiTech®</span> — <span style="color: #0f172a;">${modelName || 'BatiTech 6.2.15'}</span>
        </div>
        <div style="font-size: 7.2pt; font-weight: 600; color: #475569; margin-top: 2px;">
          <strong>Client :</strong> ${clientName || 'Exploitation Agricole'} &bull; <strong>Date :</strong> ${dateStr} &bull; <strong>Adresse :</strong> ${clientAddress}
        </div>
      </div>
    </div>
  `;
}

function renderLandscapeFooter({ pageNum, totalPages = 6, dateStr }) {
  return `
    <div style="position: absolute; bottom: 5mm; left: 14mm; right: 14mm; font-family: Montserrat, Arial, sans-serif;">
      <!-- Numéro de page au-dessus de la ligne -->
      <div style="display: flex; justify-content: flex-end; font-size: 7.5pt; font-weight: 800; color: #0D3660; margin-bottom: 3px;">
        Page ${pageNum} / ${totalPages}
      </div>

      <!-- Ligne séparatrice et mentions -->
      <div style="border-top: 1.5px solid #cbd5e1; padding-top: 3px; display: flex; justify-content: space-between; align-items: center; font-size: 6.8pt; color: #64748b;">
        <div style="display: flex; gap: 15px; align-items: center;">
          <span style="font-weight: 800; color: #0D3660;">NELSON — nelsonpv.fr</span>
          <span>Courtage en Énergies Renouvelables &amp; Ingénierie Solaire</span>
        </div>
        <div>
          <span>contact@enr-courtage.fr &bull; ${dateStr}</span>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : DOSSIER 6 PAGES PAYSAGE HAUTE DÉFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateSechoirPDF({
  results,
  address,
  commune,
  departement = '33',
  orientation = 'sud',
  materials = [],
  financialParams = {},
  projectName,
  customClientName,
  returnBlobOnly = false,
  mapCenter = null,
  coords = null,
  latitude = null,
  longitude = null,
  hasBattery = null,
}) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:297mm;background:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;';
  document.body.appendChild(container);

  const sechoirState = useSechoirStore.getState();
  const withBattery = hasBattery !== null && hasBattery !== undefined
    ? Boolean(hasBattery)
    : Boolean(sechoirState.hasBattery);

  const r = results || {};
  const modelId = sechoirState.selectedModelId || r.model?.id || 'BT-6.2.15';
  const modelObj = BATITECH_MODELS[modelId] || BATITECH_MODELS['BT-6.2.15'];
  const modelName = r.model?.name || modelObj.name;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const clientName = customClientName || sechoirState.clientName || projectName || commune || 'Client NELSON';
  const clientAddress = address || sechoirState.addressLabel || sechoirState.address || (commune ? `${commune} (${departement})` : `Département ${departement}`);
  const regionName = getRegionForDepartment(departement);

  const bLength = Number(modelObj.length || 36);
  const bWidth = Number(modelObj.width || 20);
  const bDims = modelObj.dimensions || `${bLength}m × ${bWidth}m`;
  const surfaceBat = modelObj.surfaceToiture || modelObj.surface || (bLength * bWidth);

  const sub = r.subventionsEligibles || {};
  const subReg = sub.subventionRegionale || {};
  const subNom = subReg.nom || `PCAE / PME - ${regionName}`;
  const subDesc = sub.description || 'Plan de Modernisation des Exploitations.';
  const subMontant = sub.montantEstime || 0;
  const subTaux = sub.tauxTexte || '30% (+10% JA)';
  const subPlafond = subReg.montantMax || 100000;
  const subAssiette = sub.assietteEligible || r.financing?.investissementNet || (modelObj.investissementBrut - (r.cee?.primeTotal || 0));
  const roiBonifie = r.roiBonifie !== undefined && r.roiBonifie !== null ? r.roiBonifie : null;
  const baseRoi = r.roi || 8.12;

  const puissanceKwc = r.puissancePV || modelObj.puissanceKwc || modelObj.puissanceCogenAir || (
    modelId === 'BT-3.1.15' ? 30.15 : modelId === 'BT-6.2.15' ? 63.30 : 93.80
  );
  const nbModules = modelObj.nbModules || (
    modelId === 'BT-3.1.15' ? 90 : modelId === 'BT-6.2.15' ? 189 : 280
  );
  const pvProdKwh = r.productionPV || (
    modelId === 'BT-3.1.15' ? 34673 : modelId === 'BT-6.2.15' ? 72795 : 107870
  );

  const getOrientationDisplayLabel = (ang) => {
    let cardinal = 'Sud';
    if (ang >= -22 && ang <= 22) cardinal = 'Sud';
    else if (ang > 22 && ang <= 67) cardinal = 'Sud-Ouest';
    else if (ang > 67 && ang <= 112) cardinal = 'Ouest';
    else if (ang > 112 && ang <= 157) cardinal = 'Nord-Ouest';
    else if (ang < -22 && ang >= -67) cardinal = 'Sud-Est';
    else if (ang < -67 && ang >= -112) cardinal = 'Est';
    else if (ang < -112 && ang >= -157) cardinal = 'Nord-Est';
    else cardinal = 'Nord';

    const degStr = ang > 0 ? `+${ang}°` : `${ang}°`;
    return `${cardinal} (${degStr})`;
  };

  const rotVal = typeof sechoirState.rotation === 'number' ? sechoirState.rotation : (
    typeof r.rotation === 'number' ? r.rotation : (
      orientation === 'ouest' ? 90 :
      orientation === 'sud-ouest' ? 45 :
      orientation === 'sud-est' ? -45 :
      orientation === 'est' ? -90 : -23
    )
  );

  const orientationDisplay = r.orientationLabel || getOrientationDisplayLabel(rotVal);

  // Position satellite exacte (priorité aux coordonnées de l'exploitation transmises)
  const explicitCoords = mapCenter || coords || (latitude && longitude ? [Number(latitude), Number(longitude)] : null);
  const exactMapCenter = explicitCoords || sechoirState.mapCenter || r.mapCenter || (
    sechoirState.latitude && sechoirState.longitude ? [Number(sechoirState.latitude), Number(sechoirState.longitude)] : [43.6047, 1.4442]
  );

  const totalPages = 6;

  const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  try {
    // ─── 1. CAPTURES HAUTE RÉSOLUTION (IMAGE 3D DU CONFIGURATEUR + SATELLITE + SCHÉMAS) ──
    // Helper pour charger les images en Base64 et nettoyer d'éventuelles bordures parasites
    const loadImgAsBase64 = async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          // Nettoyage automatique des éventuels artéfacts de capture (lignes noires sur les bords extrêmes)
          return await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const d = imgData.data;
                const w = canvas.width;
                const h = canvas.height;

                let rightEdgeDark = 0;
                for (let y = 0; y < h; y++) {
                  const idx = (y * w + (w - 1)) * 4;
                  if (d[idx] < 120 && d[idx + 1] < 120 && d[idx + 2] < 120) {
                    rightEdgeDark++;
                  }
                }
                if (rightEdgeDark > h * 0.15) {
                  for (let y = 0; y < h; y++) {
                    for (let x = Math.max(0, w - 5); x < w; x++) {
                      const idx = (y * w + x) * 4;
                      d[idx] = 255;
                      d[idx + 1] = 255;
                      d[idx + 2] = 255;
                      d[idx + 3] = 255;
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);
                  resolve(canvas.toDataURL('image/jpeg', 0.95));
                  return;
                }
                resolve(base64);
              } catch (err) {
                resolve(base64);
              }
            };
            img.onerror = () => resolve(base64);
            img.src = base64;
          });
        }
      } catch (e) {
        console.warn('Fallback url image:', url, e);
      }
      return url;
    };

    // Image Vue 3D Extérieure (gauche) pour Page 3 (selon modèle)
    let left3dImgUrl = '/vue_3d_batitech_6_2_15_v5.jpg';
    if (modelId === 'BT-3.1.15' || modelId.includes('3.1')) {
      left3dImgUrl = '/vue_3d_batitech_3_1_15.jpg';
    } else if (modelId === 'BT-8.3.15' || modelId.includes('8.3')) {
      left3dImgUrl = '/vue_3d_batitech_8_3_15_v2.jpg';
    } else {
      left3dImgUrl = '/vue_3d_batitech_6_2_15_v5.jpg';
    }

    // Image Vue Intérieure / Caissons (droite) pour Page 3 (selon modèle)
    let right3dImgUrl = '/batitech_interieur_6_2_15_v2.png';
    if (modelId === 'BT-3.1.15' || modelId.includes('3.1')) {
      right3dImgUrl = '/batitech_interieur_3_1_15.jpg';
    } else if (modelId === 'BT-8.3.15' || modelId.includes('8.3')) {
      right3dImgUrl = '/batitech_interieur_8_3_15_v2.png';
    } else {
      right3dImgUrl = '/batitech_interieur_6_2_15_v2.png';
    }

    const [left3dImgBase64, right3dImgBase64, schema1Img, schema2Img, schema4Img, schemaGrillesImg, realisationImgBase64] = await Promise.all([
      loadImgAsBase64(left3dImgUrl),
      loadImgAsBase64(right3dImgUrl),
      loadImgAsBase64('/schema_sechoir_1 v2.jpg'),
      loadImgAsBase64('/Schema séchoir 2.png'),
      loadImgAsBase64('/schema_sechoir_4.jpg'),
      loadImgAsBase64('/schema_sechoir_grilles.png'),
      loadImgAsBase64('/realisation_batitech.png'),
    ]);

    const snapshotSat = await generateSatelliteSnapshot({
      center: exactMapCenter,
      buildings: [{
        name: `Séchoir ${modelName}`,
        length: bLength,
        width: bWidth,
        rotation: rotVal,
      }],
      building: { length: bLength, width: bWidth, rotation: rotVal },
      width: 1300,
      height: 810,
      zoom: 19,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 1 : PAGE RÉSULTATS INTÉGRALE PLEINE PAGE ────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge: 'PLANCHE 1 • ÉTUDE DE RENTABILITÉ &amp; BILAN TECHNIQUE' })}

        <!-- 5 KPIS EN HAUT DE PAGE (STYLE RÉSULTATS) -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 9px;">
          <!-- 1. Puissance & Bâtiment (5ème bulle à gauche) -->
          <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 10px; padding: 7px 10px;">
            <div style="font-size: 8.2pt; font-weight: bold; color: #0284c7; text-transform: uppercase; letter-spacing: 0.4px;">⚡ Puissance &amp; Bâtiment</div>
            <div style="font-size: 16pt; font-weight: 900; color: #0f172a; margin: 1px 0;">${fmtDec(puissanceKwc, 2)} <span style="font-size: 9pt; font-weight: normal; color: #64748b;">kWc</span></div>
            <div style="font-size: 7.8pt; color: #0369a1; font-weight: 600;">${bDims} &bull; ${fmt(surfaceBat)} m²</div>
          </div>

          <!-- 2. Production Solaire -->
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 7px 10px;">
            <div style="font-size: 8.2pt; font-weight: bold; color: #d97706; text-transform: uppercase; letter-spacing: 0.4px;">☀️ Production Solaire</div>
            <div style="font-size: 16pt; font-weight: 900; color: #0f172a; margin: 1px 0;">${fmt(r.productionPV || pvProdKwh)} <span style="font-size: 9pt; font-weight: normal; color: #64748b;">kWh/an</span></div>
            <div style="font-size: 7.8pt; color: #64748b;">Zone ${departement} &bull; ${orientationDisplay}</div>
          </div>

          <!-- 3. Valorisation Matière -->
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 7px 10px;">
            <div style="font-size: 8.2pt; font-weight: bold; color: #166534; text-transform: uppercase; letter-spacing: 0.4px;">📈 Valorisation Matière</div>
            <div style="font-size: 16pt; font-weight: 900; color: #16a34a; margin: 1px 0;">+${fmt(r.produits?.deltaProduits)} <span style="font-size: 9pt; font-weight: normal; color: #166534;">€/an</span></div>
            <div style="font-size: 7.8pt; color: #166534;">Gains séchage + économies</div>
          </div>

          <!-- 4. Charges & Ventilation -->
          <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 10px; padding: 7px 10px;">
            <div style="font-size: 8.2pt; font-weight: bold; color: #9f1239; text-transform: uppercase; letter-spacing: 0.4px;">💨 Charges &amp; Ventilation</div>
            <div style="font-size: 16pt; font-weight: 900; color: #e11d48; margin: 1px 0;">-${fmt(r.charges?.deltaCharges)} <span style="font-size: 9pt; font-weight: normal; color: #9f1239;">€/an</span></div>
            <div style="font-size: 7.8pt; color: #9f1239;">Ventilation (${fmt(r.charges?.detail?.ventilation || 0)} €) + Entretien</div>
          </div>

          <!-- 5. Impact EBE -->
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 7px 10px;">
            <div style="font-size: 8.2pt; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.4px;">📊 Impact sur l'EBE</div>
            <div style="font-size: 16pt; font-weight: 900; color: #2563eb; margin: 1px 0;">+${fmt(r.deltaEBE)} <span style="font-size: 9pt; font-weight: normal; color: #1e40af;">€/an</span></div>
            <div style="font-size: 7.8pt; color: #1e40af;">Surplus brut d'exploitation</div>
          </div>
        </div>

        <!-- 2 GRANDS BLOCS CENTRAUX PLEINE LARGEUR (STYLE RÉSULTATS) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: 122mm; box-sizing: border-box;">
          
          <!-- COLONNE GAUCHE : INVESTISSEMENT INITIAL & FLUX DE TRÉSORERIE ANNUELS -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            
            <!-- 1. Investissement Initial & Financement -->
            <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 8px 12px; flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 5px;">
                <span style="font-size: 10.5pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">1. Investissement Initial &amp; Financement</span>
                <span style="font-size: 8.5pt; font-weight: bold; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">GARANTI &amp; CONTRACTUEL</span>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2.5px 0; color: #475569;">Investissement Brut Séchoir :</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${fmt(modelObj.investissementBrut)} € HT</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9; color: #16a34a;"><td style="padding: 2.5px 0; font-weight: bold;">Prime CEE Cogen'Air® (Fiche AGRI-EQ-110) :</td><td style="text-align: right; font-weight: 900;">-${fmt(r.cee?.primeTotal)} €</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0; background: #fffbeb;"><td style="padding: 3px 4px; font-weight: 900; color: #b45309;">Investissement Net à Financer :</td><td style="padding: 3px 4px; text-align: right; font-weight: 900; color: #b45309; font-size: 11pt;">${fmt(r.financing?.investissementNet)} € HT</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2.5px 0; color: #64748b;">Montant financé par Emprunt :</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${fmt(r.financing?.investissementNet)} €</td></tr>
                <tr><td style="padding: 2.5px 0; color: #dc2626;">Annuité constante (25 ans @ 3.40%) :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.annuite)} €/an</td></tr>
              </table>
            </div>

            <!-- 2. Flux de Trésorerie Annuels d'Exploitation -->
            <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 8px 12px; flex: 1;">
              <div style="font-size: 10.5pt; font-weight: 800; color: #0D3660; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 5px; text-transform: uppercase;">
                2. Flux de Trésorerie Annuels d'Exploitation
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2.5px 0; color: #475569;">Valorisation Matière (Delta Produits) :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">+${fmt(r.produits?.deltaProduits)} €/an</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2.5px 0; color: #475569;">Charges d'exploitation &amp; ventilation :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.charges?.deltaCharges)} €/an</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 2.5px 0 6px 0; color: #475569;">Annuité d'emprunt :</td><td style="padding: 2.5px 0 6px 0; text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.annuite)} €/an</td></tr>
                <tr style="height: 6px;"><td colspan="2" style="padding: 0; border: none;"></td></tr>
                <tr style="background: ${(r.gainNetAnnuel || 0) >= 0 ? '#f0fdf4' : '#fef2f2'}; border-top: 1.5px solid ${(r.gainNetAnnuel || 0) >= 0 ? '#bbf7d0' : '#fecaca'};">
                  <td style="padding: 4px 6px;">
                    <div style="font-weight: 900; color: ${(r.gainNetAnnuel || 0) >= 0 ? '#166534' : '#991b1b'}; font-size: 10.5pt;">GAIN NET ANNUEL D'EXPLOITATION</div>
                    <div style="font-size: 8.5pt; color: ${(r.gainNetAnnuel || 0) >= 0 ? '#15803d' : '#b91c1c'};">Après remboursement intégral de l'annuité</div>
                  </td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 900; color: ${(r.gainNetAnnuel || 0) >= 0 ? '#166534' : '#dc2626'}; font-size: 15pt;">
                    ${(r.gainNetAnnuel || 0) >= 0 ? '+' : ''}${fmt(r.gainNetAnnuel)} €/an
                  </td>
                </tr>
              </table>
            </div>

          </div>

          <!-- COLONNE DROITE : SUBVENTIONS RÉGIONALES & AIDES ÉLIGIBLES -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 10px 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                <span style="font-size: 11pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">🏛️ Subventions Régionales &amp; Aides Éligibles</span>
                <span style="font-size: 8.5pt; font-weight: bold; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px;">À TITRE INDICATIF</span>
              </div>
              <div style="font-size: 9.5pt; color: #64748b; margin-bottom: 5px;">
                Région identifiée : <strong style="color: #0D3660;">${regionName}</strong> (Département ${departement})
              </div>

              <!-- Dispositif Territorial Principal -->
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px;">
                  <div>
                    <div style="font-size: 8.8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Dispositif Territorial</div>
                    <div style="font-size: 10.5pt; font-weight: 900; color: #0D3660; margin: 1px 0;">${subNom}</div>
                  </div>
                  ${subMontant > 0 ? `
                    <div style="background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; font-size: 9.2pt; font-weight: 900; padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
                      Jusqu'à ${fmt(subMontant)} €
                    </div>
                  ` : ''}
                </div>
                <div style="font-size: 9pt; color: #475569; margin-bottom: 4px; font-style: italic;">${subDesc}</div>
                <div style="display: flex; flex-direction: column; gap: 3px; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 9pt;">
                  <div>Assiette éligible (Brut - CEE) : <strong style="color: #0f172a;">${fmt(subAssiette)} € HT</strong></div>
                  <div>Taux d'aide indicatif : <strong style="color: #0D3660;">${subTaux}</strong></div>
                </div>
                ${subPlafond ? `
                  <div style="display: flex; justify-content: space-between; font-size: 8.5pt; color: #64748b; margin-top: 3px; padding: 0 2px;">
                    <span>Plafond maximum de subvention :</span>
                    <strong style="color: #334155;">${fmt(subPlafond)} €</strong>
                  </div>
                ` : ''}
              </div>

              <!-- Fonds Chaleur ADEME -->
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px 10px; margin-bottom: 6px;">
                <div style="font-size: 9.8pt; font-weight: 900; color: #0D3660;">☀️ Fonds Chaleur ADEME (National)</div>
                <div style="font-size: 8.8pt; color: #475569; margin-top: 2px; line-height: 1.25;">
                  Éligible pour la valorisation de la chaleur solaire thermovoltaïque Cogen'Air®. Montant variable calculé post-étude thermique.
                </div>
              </div>

              <!-- Impact sur le ROI si subvention obtenue -->
              ${roiBonifie !== null ? `
                <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 8px; padding: 5px 10px; display: flex; justify-content: space-between; align-items: center; white-space: nowrap;">
                  <span style="font-size: 9.2pt; font-weight: 800; color: #065f46;">
                    ✅ ROI en cas d'obtention de l'aide :
                  </span>
                  <span style="font-size: 10.5pt; font-weight: 900; color: #047857;">
                    ~${Number(roiBonifie).toFixed(1)} ans <span style="font-size: 8.8pt; color: #64748b; font-weight: normal;">(vs ${Number(baseRoi).toFixed(1)} ans)</span>
                  </span>
                </div>
              ` : ''}
            </div>

            <!-- Note d'avertissement réglementaire -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; font-size: 8.2pt; color: #92400e; line-height: 1.3; margin-top: 4px;">
              ⚠️ Les subventions régionales (PCAE, FEADER, Plan Ambition Éleveurs) et nationales (ADEME) sont soumises à instruction de dossier et aux appels à projets en cours. Pour préserver un calcul de rentabilité prudent et réaliste, <strong>elles ne sont pas déduites de l'emprunt de base</strong>.
            </div>
          </div>

        </div>

        ${renderLandscapeFooter({ pageNum: 1, totalPages, dateStr })}
      </div>
    `;

    const canvas1 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1122,
      windowWidth: 1122,
    });
    pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 2 : BUSINESS PLAN & TABLEAU DES FLUX SUR 25 ANS AVEC CHARGES ────
    // ═══════════════════════════════════════════════════════════════════════════
    const chartCanvas = document.createElement('canvas');
    drawLandscapeTreasuryChart(chartCanvas, r.treasury?.cashFlows || [], r.roi || 8.79);
    const treasuryChartImg = chartCanvas.toDataURL('image/png');

    const validFlows = (r.treasury?.cashFlows || []).filter(cf => cf.annee > 0);
    const col1 = validFlows.slice(0, 13);
    const col2 = validFlows.slice(13, 25);

    const baseCharges = r.charges?.deltaCharges || 0;
    const baseProduits = r.produits?.deltaProduits || 0;
    const inflation = financialParams?.inflationProduits || 0.02;

    const renderTableColumn = (rows) => rows.map(cf => {
      const yearIdx = cf.annee;
      const chargesY = Math.round(baseCharges * Math.pow(1 + inflation, yearIdx - 1));
      const produitsY = Math.round(baseProduits * Math.pow(1 + inflation, yearIdx - 1));
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 8.2pt;">
          <td style="padding: 2px 3px; font-weight: bold; color: #0D3660; text-align: center;">${cf.annee}</td>
          <td style="padding: 2px 3px; text-align: right; color: #16a34a; font-weight: 600;">+${fmt(produitsY)} €</td>
          <td style="padding: 2px 3px; text-align: right; color: #dc2626;">-${fmt(chargesY)} €</td>
          <td style="padding: 2px 3px; text-align: right; color: ${cf.annuiteEmprunt > 0 ? '#dc2626' : '#94a3b8'};">-${fmt(cf.annuiteEmprunt)} €</td>
          <td style="padding: 2px 3px; text-align: right; color: ${cf.fluxNet >= 0 ? '#166534' : '#dc2626'}; font-weight: bold;">${cf.fluxNet >= 0 ? '+' : ''}${fmt(cf.fluxNet)} €</td>
          <td style="padding: 2px 3px; text-align: right; color: ${cf.cumul >= 0 ? '#d97706' : '#64748b'}; font-weight: 900;">${fmt(cf.cumul)} €</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge: 'PLANCHE 2 • BUSINESS PLAN DÉTAILLÉ SUR 25 ANS' })}

        <!-- Grand Graphique de Trésorerie Cumulée Pleine Largeur Agrandit -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 3px 8px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: center; margin-bottom: 6px;">
          <img src="${treasuryChartImg}" alt="Trésorerie Cumulée" style="max-width: 99%; height: 58mm; display: block; margin: 0 auto;" />
        </div>

        <!-- Tableau des flux sur 2 colonnes (Années 1-13 et 14-25) avec colonne Charges -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px;">
          <!-- Colonne 1 : Années 1 à 13 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #0D3660; color: #ffffff; font-size: 8.8pt; height: 26px;">
                  <th style="padding: 4px 3px; text-align: center; vertical-align: middle; line-height: 1.2;">Année</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Produits (+2%/an)</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Charges &amp; Vent.</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Annuité</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Flux Net</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Cumul</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableColumn(col1)}
              </tbody>
            </table>
          </div>

          <!-- Colonne 2 : Années 14 à 25 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #0D3660; color: #ffffff; font-size: 8.8pt; height: 26px;">
                  <th style="padding: 4px 3px; text-align: center; vertical-align: middle; line-height: 1.2;">Année</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Produits (+2%/an)</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Charges &amp; Vent.</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Annuité</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Flux Net</th>
                  <th style="padding: 4px 3px; text-align: right; vertical-align: middle; line-height: 1.2;">Cumul</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableColumn(col2)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Synthèse des Indicateurs Financiers Avancés -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 4px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 4px 10px; text-align: center;">
            <span style="font-size: 8.2pt; color: #166534; font-weight: bold; text-transform: uppercase;">Valeur Actuelle Nette (VAN 20 ans)</span>
            <div style="font-size: 12.5pt; font-weight: 900; color: #16a34a;">+${fmt(r.van)} €</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 4px 10px; text-align: center;">
            <span style="font-size: 8.2pt; color: #92400e; font-weight: bold; text-transform: uppercase;">Taux de Rendement Interne (TRI)</span>
            <div style="font-size: 12.5pt; font-weight: 900; color: #d97706;">${r.triPercent || '10.33'} %</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; text-align: center;">
            <span style="font-size: 8.2pt; color: #475569; font-weight: bold; text-transform: uppercase;">Temps de Retour sur Investissement (ROI)</span>
            <div style="font-size: 12.5pt; font-weight: 900; color: #0284c7;">${Number(r.roi || 8.79).toFixed(1)} ans</div>
          </div>
        </div>

        ${renderLandscapeFooter({ pageNum: 2, totalPages, dateStr })}
      </div>
    `;

    const canvas2 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1122,
      windowWidth: 1122,
    });
    pdf.addPage();
    pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 3 : SIMULATION D'AUTOCONSOMMATION DE LA PRODUCTION PV SOLAIRE ────
    // ═══════════════════════════════════════════════════════════════════════════
    const autoconsoData = AUTOCONSOMMATION_TIERS.map(cons =>
      getAutoconsumptionData(cons, pvProdKwh, withBattery)
    );
    const maxSaving = Math.max(...autoconsoData.map(d => d.savingsYear1), 0);
    const maxCumul25 = Math.max(...autoconsoData.map(d => d.cumulativeSavings25), 0);

    const autoconsoCanvas = document.createElement('canvas');
    drawAutoconsumptionBarChart(autoconsoCanvas, autoconsoData);
    const autoconsoChartImg = autoconsoCanvas.toDataURL('image/png');

    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 7mm 14mm 8mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge: 'PLANCHE 3 • SIMULATION AUTOCONSOMMATION' })}

        <!-- 4 KPIS EN HAUT DE PAGE -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 7px;">
          <!-- 1. Coût Électricité Réseau -->
          <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 6px 10px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.4px;">⚡ Coût Électricité Réseau</div>
            <div style="font-size: 15pt; font-weight: 900; color: #0f172a; margin: 1px 0; font-family: 'JetBrains Mono', Consolas, monospace;">0,250 € / kWh</div>
            <div style="font-size: 7.5pt; color: #64748b;">Inflation contractuelle : <strong style="color: #0f172a;">+2,0 % / an</strong></div>
          </div>

          <!-- 2. Gisement PV Disponible -->
          <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 6px 10px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.4px;">☀️ Production Solaire BatiTech®</div>
            <div style="font-size: 15pt; font-weight: 900; color: #0284c7; margin: 1px 0; font-family: 'JetBrains Mono', Consolas, monospace;">${fmt(pvProdKwh)} kWh/an</div>
            <div style="font-size: 7.5pt; color: #64748b;">${fmtDec(puissanceKwc, 2)} kWc &bull; ${nbModules} modules Cogen'Air®</div>
          </div>

          <!-- 3. Économie Facture Maximale -->
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 10px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.4px;">💰 Économie Facture An 1 (Max)</div>
            <div style="font-size: 15pt; font-weight: 900; color: #16a34a; margin: 1px 0; font-family: 'JetBrains Mono', Consolas, monospace;">+${fmt(maxSaving)} €/an</div>
            <div style="font-size: 7.5pt; color: #166534; font-weight: 600;">Sur profil 50 000 kWh/an</div>
          </div>

          <!-- 4. Économie Cumulée 25 ans -->
          <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 8px; padding: 6px 10px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #3730a3; text-transform: uppercase; letter-spacing: 0.4px;">📈 Cumul Économisé (25 ans @ +2%)</div>
            <div style="font-size: 15pt; font-weight: 900; color: #4338ca; margin: 1px 0; font-family: 'JetBrains Mono', Consolas, monospace;">+${fmt(maxCumul25)} €</div>
            <div style="font-size: 7.5pt; color: #4338ca; font-weight: 600;">Protection face aux hausses tarifaires</div>
          </div>
        </div>

        <!-- GRILLE CENTRALE DÉCISIONNELLE : TABLEAU (7/12) + GRAPHIQUE (5/12) -->
        <div style="display: grid; grid-template-columns: 7.2fr 4.8fr; gap: 9px; margin-bottom: 7px; height: 106mm; box-sizing: border-box;">
          
          <!-- COLONNE GAUCHE : TABLEAU DES 6 HYPOTHÈSES DE CONSOMMATION -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 7px 10px; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 5px;">
                <div>
                  <div style="font-size: 8.5pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">
                    Matrice d'Analyse des Économies selon la Consommation de l'Exploitation
                  </div>
                  <div style="font-size: 7pt; color: #64748b; margin-top: 1px;">
                    Calcul à 0,25 €/kWh indexé à +2%/an &bull; Mode : <strong style="color: ${withBattery ? '#4338ca' : '#166534'};">${withBattery ? '🔋 Avec Batterie (Stockage BESS couplé)' : '⚡ Sans Batterie (Autoconsommation directe)'}</strong>
                  </div>
                </div>
                <span style="font-size: 7.5pt; font-weight: bold; background: #fef3c7; color: #92400e; padding: 2px 7px; border-radius: 4px; white-space: nowrap;">
                  6 Hypothèses
                </span>
              </div>

              <!-- TABLEAU DENSE HAUTE LISIBILITÉ -->
              <table style="width: 100%; border-collapse: collapse; font-size: 7.8pt;">
                <thead>
                  <tr style="background: #f8fafc; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 7pt; border-bottom: 1.5px solid #cbd5e1;">
                    <th style="padding: 4px 5px; text-align: left;">Consommation</th>
                    <th style="padding: 4px 5px; text-align: left;">Autoconso (kWh)</th>
                    <th style="padding: 4px 5px; text-align: center;">Taux Couv.</th>
                    <th style="padding: 4px 5px; text-align: right;">Facture Sans PV</th>
                    <th style="padding: 4px 5px; text-align: right; color: #166534;">Économie An 1</th>
                    <th style="padding: 4px 5px; text-align: right;">Facture Résiduelle</th>
                    <th style="padding: 4px 5px; text-align: right; color: #4338ca;">Cumul 25 ans (+2%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${autoconsoData.map(row => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 3.5px 5px; font-weight: 900; color: #0f172a; font-family: 'JetBrains Mono', Consolas, monospace;">${fmt(row.consKwh)} kWh/an</td>
                      <td style="padding: 3.5px 5px; color: #334155; font-family: 'JetBrains Mono', Consolas, monospace;">${fmt(row.autoconsoKwh)} kWh</td>
                      <td style="padding: 3.5px 5px; text-align: center;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-weight: 800; font-size: 7.2pt; ${withBattery ? 'background: #e0e7ff; color: #3730a3;' : 'background: #dcfce7; color: #166534;'}">
                          ${(row.autoprodRate * 100).toFixed(0)} %
                        </span>
                      </td>
                      <td style="padding: 3.5px 5px; text-align: right; color: #64748b; font-family: 'JetBrains Mono', Consolas, monospace;">${fmt(row.initialBill)} €</td>
                      <td style="padding: 3.5px 5px; text-align: right; color: #16a34a; font-weight: 900; font-family: 'JetBrains Mono', Consolas, monospace;">+${fmt(row.savingsYear1)} €/an</td>
                      <td style="padding: 3.5px 5px; text-align: right; color: #d97706; font-weight: 700; font-family: 'JetBrains Mono', Consolas, monospace;">${fmt(row.residualBill)} €/an</td>
                      <td style="padding: 3.5px 5px; text-align: right; color: #4338ca; font-weight: 900; font-family: 'JetBrains Mono', Consolas, monospace;">+${fmt(row.cumulativeSavings25)} €</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Notes de Méthodologie & Formules -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 5px; padding-top: 5px; border-top: 1px solid #f1f5f9; font-size: 6.8pt; color: #64748b;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 7px;">
                <strong style="color: #0f172a;">Formule d'actualisation 25 ans :</strong><br />
                &sum;<sub>t=0..24</sub> Économie An 1 &times; (1 + 0,02)<sup>t</sup> = Économie An 1 &times; 32,030
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 7px;">
                <strong style="color: #0f172a;">Cadrage économique :</strong><br />
                Hypothèse 100% économies de facture (sans simulation de revente en surplus).
              </div>
            </div>
          </div>

          <!-- COLONNE DROITE : GRAPHIQUE COMPARATIF -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 7px 10px; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px;">
                <div>
                  <div style="font-size: 8.5pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">
                    Comparatif Facture Initiale vs Résiduelle
                  </div>
                  <div style="font-size: 7pt; color: #64748b;">Dépense annuelle évitée en Année 1 (€/an)</div>
                </div>
                <span style="font-size: 7.2pt; font-weight: bold; ${withBattery ? 'background: #e0e7ff; color: #3730a3;' : 'background: #dcfce7; color: #166534;'}; padding: 2px 7px; border-radius: 4px;">
                  ${withBattery ? '🔋 Avec batterie' : '⚡ Sans batterie'}
                </span>
              </div>

              <!-- Canvas Bar Chart -->
              <div style="width: 100%; text-align: center; margin: 2px 0;">
                <img src="${autoconsoChartImg}" style="width: 100%; height: 58mm; object-fit: contain; display: block; margin: 0 auto;" alt="Comparatif Factures" />
              </div>
            </div>

            <!-- Légende personnalisée -->
            <div style="display: flex; justify-content: space-around; font-size: 6.8pt; color: #475569; padding-top: 4px; border-top: 1px solid #f1f5f9;">
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: #cbd5e1;"></span> Facture Sans Solaire (0,25 €)
              </span>
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: #10b981;"></span> Économie Autoconsommée
              </span>
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: #f59e0b;"></span> Facture Réseau Résiduelle
              </span>
            </div>
          </div>

        </div>

        <!-- 3 BLOCS DÉCISIONNELS EN BAS DE PAGE -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 2px;">
          <!-- Brique 1 : L'apport de la Batterie -->
          <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 8px; padding: 6px 9px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #3730a3; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span>🔋</span> Apport d'un Stockage Batterie
            </div>
            <div style="font-size: 7pt; color: #475569; line-height: 1.35;">
              Le stockage batterie stocke les excédents de mi-journée pour alimenter les besoins du soir et du matin (traite, ventilation). Taux d'autoproduction accru de <strong style="color: #3730a3;">+25 % à +45 %</strong>.
            </div>
          </div>

          <!-- Brique 2 : Bouclier Tarifaire Long Terme -->
          <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 6px 9px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #92400e; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span>🛡️</span> Bouclier Tarifaire Long Terme
            </div>
            <div style="font-size: 7pt; color: #475569; line-height: 1.35;">
              Avec une inflation de <strong style="color: #0f172a;">2,0 % / an</strong>, le kWh réseau passera de 0,25 € en 2026 à <strong style="color: #92400e;">0,407 € en 2050</strong>. Chaque kWh autoconsommé protège les marges de l'exploitation.
            </div>
          </div>

          <!-- Brique 3 : Synergie avec le Séchage BatiTech -->
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 9px;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #166534; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span>🌾</span> Synergie avec le Séchage BatiTech®
            </div>
            <div style="font-size: 7pt; color: #475569; line-height: 1.35;">
              Ces économies d'électricité viennent <strong style="color: #166534;">s'ajouter en surplus direct</strong> aux <strong style="color: #166534;">+${fmt(r.produits?.deltaProduits)} €/an</strong> de valorisation matière (fourrage, bois) des Planches 1 &amp; 2.
            </div>
          </div>
        </div>

        ${renderLandscapeFooter({ pageNum: 3, totalPages, dateStr })}
      </div>
    `;

    const canvas3 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1122,
      windowWidth: 1122,
    });
    pdf.addPage();
    pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 4 : VUE 3D CONFIGURATEUR & CARTE SATELLITE (SUPERPOSÉES) ────────
    // ═══════════════════════════════════════════════════════════════════════════
    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge: 'PLANCHE 4 • VUE 3D &amp; IMPLANTATION SATELLITE' })}

        <!-- 2 LIGNES DE CADRES (3D EN HAUT, RÉALISATION (1/3) + SATELLITE (2/3) EN BAS) -->
        <div style="display: flex; flex-direction: column; gap: 8px; height: 164mm; box-sizing: border-box;">
          
          <!-- CADRE DU HAUT : VUE 3D CONFIGURATEUR (GAUCHE) + VUE INTERIEURE/CAISSONS (DROITE) -->
          <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; height: 75mm; position: relative; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; padding: 2px 8px;">
            <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 0 12px; height: 26px; display: flex; align-items: center; justify-content: center; border-bottom-right-radius: 6px; font-size: 7.8pt; font-weight: bold; z-index: 2; line-height: 1; box-sizing: border-box;">
              Vue 3D BatiTech® (${bDims} — ${puissanceKwc} kWc)
            </div>
            
            <!-- Vue 3D BatiTech (décalée à gauche) -->
            <div style="flex: 1; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2px 4px; box-sizing: border-box;">
              <img src="${left3dImgBase64}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; margin: auto; transform: scale(1.08);" alt="Vue 3D ${modelName}" />
            </div>

            <!-- Image Vue Intérieure / Caissons (à droite) -->
            <div style="width: 46%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2px 4px; box-sizing: border-box;">
              <img src="${right3dImgBase64}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; margin: auto; transform: scale(0.92);" alt="Vue Intérieure ${modelName}" />
            </div>

            <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 0 10px; height: 24px; display: flex; align-items: center; justify-content: center; border-top-left-radius: 6px; font-size: 7pt; font-weight: bold; line-height: 1; box-sizing: border-box; z-index: 2;">
              Cogen'Air® Intégré
            </div>
          </div>

          <!-- LIGNE DU BAS : RÉALISATION (1/2 GAUCHE) + IMPLANTATION SATELLITE (1/2 DROITE) -->
          <div style="display: flex; gap: 8px; flex: 1; min-height: 81mm; box-sizing: border-box;">
            
            <!-- CADRE GAUCHE (1/2) : RÉALISATION -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; flex: 1; width: calc(50% - 4px); height: 100%; position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 0 12px; height: 26px; display: flex; align-items: center; justify-content: center; border-bottom-right-radius: 6px; font-size: 7.8pt; font-weight: bold; z-index: 2; line-height: 1; box-sizing: border-box;">
                Réalisation
              </div>
              <img src="${realisationImgBase64}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Réalisation BatiTech" />
            </div>

            <!-- CADRE DROITE (1/2) : IMPLANTATION SATELLITE SUR LE TERRAIN -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; flex: 1; width: calc(50% - 4px); height: 100%; position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 0 12px; height: 26px; display: flex; align-items: center; justify-content: center; border-bottom-right-radius: 6px; font-size: 7.8pt; font-weight: bold; z-index: 2; line-height: 1; box-sizing: border-box;">
                Implantation Satellite sur la Parcelle
              </div>
              ${snapshotSat ? `
                <img src="${snapshotSat}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite" />
              ` : `
                <div style="color: #94a3b8; font-size: 9pt; text-align: center; margin: auto; padding: 10px;">
                  <strong style="color: #ffffff;">Repérage Satellite</strong>
                  <div style="font-size: 7.5pt; margin-top: 2px; color: #94a3b8;">${clientAddress}</div>
                </div>
              `}
              <div style="position: absolute; bottom: 6px; right: 10px; background: transparent; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95); padding: 2px 6px; font-size: 7.5pt; font-weight: bold;">
                Orientation : ${orientationDisplay}
              </div>
            </div>

          </div>

        </div>

        ${renderLandscapeFooter({ pageNum: 4, totalPages, dateStr })}
      </div>
    `;

    const canvas4 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1122,
      windowWidth: 1122,
    });
    pdf.addPage();
    pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 5 : SCHÉMAS TECHNIQUES DE SÉCHAGE SOLAIRE BATITECH ──────────────
    // ═══════════════════════════════════════════════════════════════════════════
    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge: 'PLANCHE 5 • SCHÉMAS TECHNIQUES &amp; FONCTIONNEMENT' })}

        <!-- CONTENEUR SCHÉMAS EN 2 LIGNES (LIGNE 1 : 3 SCHÉMAS CÔTE À CÔTE, LIGNE 2 : GRILLES PLEINE LARGEUR) -->
        <div style="display: flex; flex-direction: column; gap: 8px; height: 164mm; box-sizing: border-box;">
          
          <!-- LIGNE 1 : SCHÉMA 1 (GAUCHE), SCHÉMA 2 (CENTRE), SCHÉMA 4 (DROITE) -->
          <div style="display: flex; gap: 8px; height: 78mm; align-items: stretch;">
            <!-- Schéma 1 (3D Bâtiment Séchoir) -->
            <div style="flex: 1.1; border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 4px 6px; box-sizing: border-box;">
              <img src="${schema1Img}" style="max-width: 98%; max-height: 94%; width: auto; height: auto; object-fit: contain; display: block; margin: auto;" alt="Schéma séchoir 1" />
            </div>

            <!-- Schéma 2 (Coupe Transversale) -->
            <div style="flex: 1.25; border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 4px 6px; box-sizing: border-box;">
              <img src="${schema2Img}" style="max-width: 98%; max-height: 94%; width: auto; height: auto; object-fit: contain; display: block; margin: auto;" alt="Schéma séchoir 2" />
            </div>

            <!-- Schéma 4 (Caisson & Bottes) - Décalé de 0.5cm à gauche et police agrandie -->
            <div style="flex: 0.95; border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 2px 4px; box-sizing: border-box;">
              <img src="${schema4Img}" style="max-width: 100%; max-height: 98%; width: auto; height: auto; object-fit: contain; display: block; margin: auto; transform: translateX(-5mm) scale(1.18);" alt="Schéma séchoir 4" />
            </div>
          </div>

          <!-- LIGNE 2 : GRILLES DE SÉCHAGE (PLEINE LARGEUR) -->
          <div style="flex: 1; min-height: 76mm; border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 4px 10px; box-sizing: border-box;">
            <img src="${schemaGrillesImg}" style="max-width: 98%; max-height: 94%; width: auto; height: auto; object-fit: contain; display: block; margin: auto;" alt="Grilles de séchage au sol" />
          </div>

        </div>

        ${renderLandscapeFooter({ pageNum: 5, totalPages, dateStr })}
      </div>
    `;

    const canvas5 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1122,
      windowWidth: 1122,
    });
    pdf.addPage();
    pdf.addImage(canvas5.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 6 : AVANTAGES FINANCIERS & GRAND GRAPHIQUE BAISSE DES CHARGES ───
    // ═══════════════════════════════════════════════════════════════════════════
    const chargesCanvas = document.createElement('canvas');
    drawSechoirChargesChart(chargesCanvas);
    const chargesChartImg = chargesCanvas.toDataURL('image/png');

    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName, pageBadge: 'PLANCHE 6 • SYNTHÈSE DES BÉNÉFICES &amp; BAISSE DES CHARGES' })}

        <!-- Synthèse d'introduction (Agrandie) -->
        <div style="background-color: #f8fafc; border-left: 5px solid #00B050; padding: 11px 20px; margin-bottom: 12px; text-align: justify; font-size: 9.8pt; font-weight: 600; color: #0D3660; border-radius: 0 6px 6px 0; line-height: 1.45;">
          Le séchoir BatiTech® est un outil stratégique permettant à l’exploitant de gagner en <strong style="color: #0D3660;">rentabilité</strong>, en <strong style="color: #0D3660;">autonomie</strong> et en <strong style="color: #0D3660;">sécurité</strong>, tout en améliorant considérablement la qualité des productions et les conditions de travail au quotidien.
        </div>

        <!-- 2 Colonnes Avantages Financiers & Opérationnels (Hauteur et Police +2pt) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 10px;">
          <!-- Avantages Financiers -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column;">
            <div style="background-color: #0D3660; color: #ffffff; padding: 7px 16px; font-size: 10.5pt; font-weight: 800; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
              Avantages Financiers
            </div>
            <div style="padding: 12px 16px; font-size: 8.8pt; line-height: 1.48; color: #334155; flex: 1; display: flex; flex-direction: column; justify-content: space-around;">
              <div>&bull; <strong style="color: #0D3660;">Baisse radicale des charges :</strong> Économies majeures sur les compléments alimentaires, le carburant, la main-d’œuvre et arrêt total des prestations externes.</div>
              <div style="margin-top: 4px;">&bull; <strong style="color: #0D3660;">Valorisation de la production :</strong> Un fourrage plus nutritif qui augmente la quantité, la qualité et le prix de vente du lait ou de la viande.</div>
              <div style="margin-top: 4px;">&bull; <strong style="color: #0D3660;">Nouveaux revenus :</strong> Valorisation de la production solaire thermique &amp; électrique Cogen'Air® et prestations de séchage pour tiers.</div>
              <div style="margin-top: 4px;">&bull; <strong style="color: #0D3660;">Valorisation patrimoniale :</strong> Création d'un actif immobilier durable et pérenne sur l'exploitation.</div>
            </div>
          </div>

          <!-- Avantages Opérationnels -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column;">
            <div style="background-color: #00B050; color: #ffffff; padding: 7px 16px; font-size: 10.5pt; font-weight: 800; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
              Avantages Opérationnels
            </div>
            <div style="padding: 12px 16px; font-size: 8.8pt; line-height: 1.48; color: #334155; flex: 1; display: flex; flex-direction: column; justify-content: space-around;">
              <div>&bull; <strong style="color: #0D3660;">Qualité Premium :</strong> Fourrage homogène, très riche en protéines et hautement appétant, limitant les refus.</div>
              <div style="margin-top: 4px;">&bull; <strong style="color: #0D3660;">Santé animale renforcée :</strong> L'alimentation sèche de qualité diminue drastiquement les risques sanitaires et vétérinaires.</div>
              <div style="margin-top: 4px;">&bull; <strong style="color: #0D3660;">Indépendance météo :</strong> Liberté de récolter et sécher au stade optimal sans craindre les intempéries.</div>
              <div style="margin-top: 4px;">&bull; <strong style="color: #0D3660;">Impact Écologique :</strong> Zéro plastique agricole d'enrubannage et énergie solaire 100% renouvelable.</div>
            </div>
          </div>
        </div>

        <!-- Grand Graphique de Baisse des Charges -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 6px 12px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: center;">
          <img src="${chargesChartImg}" alt="Baisse des charges" style="max-width: 98%; height: 70mm; display: block; margin: 0 auto;" />
        </div>

        ${renderLandscapeFooter({ pageNum: 6, totalPages, dateStr })}
      </div>
    `;

    const canvas6 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1122,
      windowWidth: 1122,
    });
    pdf.addPage();
    pdf.addImage(canvas6.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

    const filename = `Dossier_Etude_Sechoir_BatiTech_${modelName.replace(/\s+/g, '_')}_${(clientName || 'Client').replace(/\s+/g, '_')}.pdf`;
    if (returnBlobOnly) {
      const blob = pdf.output('blob');
      return { blob, filename, pdf };
    }
    pdf.save(filename);
    return { filename, pdf };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
