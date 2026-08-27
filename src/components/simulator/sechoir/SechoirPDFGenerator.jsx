/**
 * SechoirPDFGenerator — Dossier d'Étude Complet Séchoir Multi-Matières BatiTech®
 * ──────────────────────────────────────────────────────────────────────────────
 * Génère un document PDF A4 Paysage (Landscape) multi-pages haute résolution :
 *  - Page 1 : Synthèse du projet, paramètres complets, double visuel 3D & Implantation satellite, KPIs
 *  - Page 2 : Analyse économique détaillée, avantages financiers/opérationnels, graphique de baisse des charges, subventions
 *  - Page 3 : Business plan sur 25 ans, tableau complet des flux de trésorerie et graphique cumulé
 *
 * Fond blanc pur, en-tête et pied de page officiels NELSON.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot.js';
import { generateBatitech3DSnapshot } from '@/utils/batitech3dSnapshot.js';
import { BATITECH_MODELS, DRYING_YIELDS, getRegionForDepartment } from '@/data/sechoirBatitechModels.js';

// ─── Formatage ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDec = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);

// ─── Graphique des Réductions de Charges (Page 2) ──────────────────────────────
export function drawSechoirChargesChart(canvas) {
  canvas.width = 1600;
  canvas.height = 420;
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

  const leftMargin = 220;
  const rightMargin = 580;
  const topMargin = 20;
  const bottomMargin = 70;
  const chartWidth = canvas.width - leftMargin - rightMargin;
  const chartHeight = canvas.height - topMargin - bottomMargin;
  const barSlot = chartHeight / categories.length;
  const barH = barSlot * 0.62;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;

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
    ctx.lineTo(x, topMargin + chartHeight + 6);
    ctx.stroke();

    ctx.fillStyle = c_blue;
    ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${tick}%`, x, topMargin + chartHeight + 25);
  });

  // Titre Axe X
  ctx.fillStyle = c_blue;
  ctx.font = 'bold 19px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Baisse estimée des charges annuelles d'exploitation (%)", leftMargin + chartWidth / 2, topMargin + chartHeight + 54);

  // Barres & Textes
  for (let i = 0; i < categories.length; i++) {
    const yCenter = topMargin + (i + 0.5) * barSlot;
    const yTop = yCenter - barH / 2;
    const barW = (reductions[i] / 100) * chartWidth;

    // Label gauche
    ctx.fillStyle = c_blue;
    ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    if (categories[i].length === 2) {
      ctx.fillText(categories[i][0], leftMargin - 15, yCenter - 2);
      ctx.fillText(categories[i][1], leftMargin - 15, yCenter + 16);
    } else {
      ctx.fillText(categories[i][0], leftMargin - 15, yCenter + 6);
    }

    // Barre
    ctx.fillStyle = colors[i];
    ctx.fillRect(leftMargin, yTop, barW, barH);

    // Texte droite
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(explanations[i], leftMargin + barW + 14, yCenter + 6);
  }
}

// ─── Graphique de Trésorerie Cumulée (Page 3) ──────────────────────────────────
export function drawLandscapeTreasuryChart(canvas, cashFlows, roi = 8.79) {
  canvas.width = 1600;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;
  const padding = { top: 35, right: 30, bottom: 45, left: 80 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const values = (cashFlows || []).map(cf => cf.cumul);
  const maxVal = Math.max(...values, 0) || 400000;
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const count = cashFlows?.length || 25;
  const barWidth = (chartW / count) * 0.75;
  const gap = (chartW / count) * 0.25;

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
    ctx.font = 'bold 14px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(Math.round(val))} €`, padding.left - 10, y + 5);
  }

  // Barres
  (cashFlows || []).forEach((cf, i) => {
    const x = padding.left + i * (chartW / count) + gap / 2;
    const barH = Math.max(3, Math.abs(cf.cumul / range) * chartH);
    const isPositive = cf.cumul >= 0;
    const y = isPositive ? zeroY - barH : zeroY;

    ctx.fillStyle = isPositive ? '#10b981' : '#ef4444';
    ctx.fillRect(x, y, barWidth, barH);

    // Labels X
    ctx.fillStyle = '#475569';
    ctx.font = '12px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`A${cf.annee}`, x + barWidth / 2, H - padding.bottom + 18);
  });

  // Ligne Y=0
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(W - padding.right, zeroY);
  ctx.stroke();

  // Titre
  ctx.fillStyle = '#0D3660';
  ctx.font = 'bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Évolution de la Trésorerie Cumulée (25 ans) — Amortissement (ROI) estimé à ${Number(roi || 8.79).toFixed(2)} ans`, padding.left, 20);
}

// ─── Header & Footer Helpers ───────────────────────────────────────────────────
function renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName }) {
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #0D3660; padding-bottom: 5px; margin-bottom: 10px;">
      <div style="display: flex; align-items: baseline; gap: 12px;">
        <span style="font-size: 24pt; font-weight: 900; color: #0D3660; line-height: 1; letter-spacing: 0.5px; font-family: Montserrat, Arial, sans-serif;">NELSON</span>
        <span style="font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">ÉTUDE DE RENTABILITÉ &amp; DOSSIER TECHNIQUE COMPLET</span>
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

function renderLandscapeFooter({ pageNum, totalPages, dateStr }) {
  return `
    <div style="position: absolute; bottom: 8mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #cbd5e1; padding-top: 4px; font-size: 6.8pt; color: #64748b; font-family: Montserrat, Arial, sans-serif;">
      <div style="display: flex; gap: 15px; align-items: center;">
        <span style="font-weight: 800; color: #0D3660;">NELSON — nelsonpv.fr</span>
        <span>Courtage en Énergies Renouvelables &amp; Ingénierie Solaire</span>
      </div>
      <div>
        <span>contact@enr-courtage.fr &bull; ${dateStr}</span>
      </div>
      <div style="font-weight: bold; color: #0D3660;">
        Page ${pageNum} / ${totalPages}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : GÉNÉRATION DU DOSSIER PAYSAGE MULTI-PAGES
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
  includeBenefitsPage = true,
  includeCashFlowPage = true,
}) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:297mm;background:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;';
  document.body.appendChild(container);

  const r = results || {};
  const modelId = r.model?.id || 'BT-6.2.15';
  const modelObj = BATITECH_MODELS[modelId] || BATITECH_MODELS['BT-6.2.15'];
  const modelName = r.model?.name || modelObj.name;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const clientName = customClientName || projectName || commune || 'Client NELSON';
  const clientAddress = address || (commune ? `${commune} (${departement})` : `Département ${departement}`);
  const regionName = getRegionForDepartment(departement);

  const bLength = Number(modelObj.length || 36);
  const bWidth = Number(modelObj.width || 20);
  const bDims = modelObj.dimensions || `${bLength}m × ${bWidth}m`;

  const rotVal = typeof orientation === 'number' ? orientation : (
    orientation === 'ouest' ? 90 :
    orientation === 'sud-ouest' ? 45 :
    orientation === 'sud-est' ? -45 :
    orientation === 'est' ? -90 : -19
  );

  const totalPages = 1 + (includeBenefitsPage ? 1 : 0) + (includeCashFlowPage ? 1 : 0);

  // Initialisation jsPDF A4 Paysage
  const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  let currentPage = 1;

  try {
    // ─── 1. CAPTURES VISUELLES HAUTE RÉSOLUTION (3D & SATELLITE) ─────────────
    const [snapshot3d, snapshotSat] = await Promise.all([
      // 1a. Rendu 3D BatiTech fidèle au configurateur
      generateBatitech3DSnapshot({
        modelId,
        length: bLength,
        width: bWidth,
        imgWidth: 900,
        imgHeight: 520,
      }),
      // 1b. Vue Satellite haute précision avec bâtiment à l'échelle
      generateSatelliteSnapshot({
        center: r.mapCenter || [43.6047, 1.4442],
        buildings: [{
          name: `Séchoir ${modelName}`,
          length: bLength,
          width: bWidth,
          rotation: rotVal,
        }],
        building: { length: bLength, width: bWidth, rotation: rotVal },
        width: 900,
        height: 520,
        zoom: 19,
      }),
    ]);

    // Active Materials Filter
    const activeMats = (materials || []).filter(m => m.enabled && m.volume > 0);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 1 : SYNTHÈSE GLOBALE, PARAMÈTRES, VISUELS 3D & SATELLITE ────────
    // ═══════════════════════════════════════════════════════════════════════════
    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

        <!-- 4 KPIS EN HAUT DE PAGE -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px;">
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Puissance Solaire Cogen'Air®</div>
            <div style="font-size: 13pt; font-weight: 900; color: #0284c7; margin: 1px 0;">${Number(modelObj.puissanceKwc || 63.30).toFixed(2)} kWc</div>
            <div style="font-size: 6.5pt; color: #475569;">${modelObj.nbModules || 189} modules &bull; ${fmt(r.productionPV)} kWh/an</div>
          </div>
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 10px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Valorisation Matière</div>
            <div style="font-size: 13pt; font-weight: 900; color: #16a34a; margin: 1px 0;">+${fmt(r.produits?.deltaProduits)} €/an</div>
            <div style="font-size: 6.5pt; color: #166534;">Gains séchage + économies énergie</div>
          </div>
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 10px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Prime CEE (AGRI-EQ-110)</div>
            <div style="font-size: 13pt; font-weight: 900; color: #15803d; margin: 1px 0;">-${fmt(r.cee?.primeTotal)} €</div>
            <div style="font-size: 6.5pt; color: #166534;">Cogen'Air® Certifiée</div>
          </div>
          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 8px; padding: 6px 10px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Amortissement (ROI)</div>
            <div style="font-size: 13pt; font-weight: 900; color: #9333ea; margin: 1px 0;">${Number(r.roi || 8.79).toFixed(2)} ans</div>
            <div style="font-size: 6.5pt; color: #6b21a8;">Gain Net : +${fmt(r.gainNetAnnuel)} €/an</div>
          </div>
        </div>

        <!-- ZONE CENTRALE : 3 COLONNES (PARAMÈTRES / VISUEL 3D / IMPLANTATION SATELLITE) -->
        <div style="display: grid; grid-template-columns: 1.15fr 1.15fr 1.15fr; gap: 10px; height: 125mm; box-sizing: border-box;">
          
          <!-- COLONNE 1 : FICHE TECHNIQUE & FILIÈRES ACTIVÉES -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between; font-size: 6.8pt; box-sizing: border-box;">
            <div>
              <div style="font-size: 7.5pt; font-weight: 800; color: #0D3660; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase;">
                Dimensionnement &amp; Filières
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 6.5pt; margin-bottom: 4px;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1px 0; color: #64748b;">Modèle de Séchoir :</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${modelName}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1px 0; color: #64748b;">Dimensions &amp; Surface :</td><td style="text-align: right; font-weight: bold; color: #d97706;">${bDims} (${modelObj.surfaceToiture || 720} m²)</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1px 0; color: #64748b;">Cellules de Séchage :</td><td style="text-align: right; font-weight: bold;">${modelObj.zones || 2} cellule(s) (15m prof.)</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1px 0; color: #64748b;">Orientation / Pente :</td><td style="text-align: right; font-weight: bold;">${r.orientationLabel || 'Sud (-19°)'} / 15° (27%)</td></tr>
              </table>

              <div style="font-size: 7pt; font-weight: 800; color: #0D3660; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin: 4px 0 2px 0; text-transform: uppercase;">
                Besoins en Séchage Configurés
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 6.2pt;">
                <thead>
                  <tr style="border-bottom: 1px solid #cbd5e1; background: #e2e8f0;">
                    <th style="padding: 1.5px 2px; text-align: left; color: #0f172a;">Filière</th>
                    <th style="padding: 1.5px 2px; text-align: center; color: #0f172a;">Surface</th>
                    <th style="padding: 1.5px 2px; text-align: center; color: #0f172a;">Tonnage</th>
                    <th style="padding: 1.5px 2px; text-align: right; color: #0f172a;">Gain</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeMats.length > 0 ? activeMats.map(m => {
                    const yld = Number(m.yieldPerHa || DRYING_YIELDS[m.id] || 6.0);
                    const ha = Math.round((Number(m.volume || 0) / yld) * 10) / 10;
                    const subtotal = Number(m.volume || 0) * ((Number(m.plusValueQualite) || 0) + (Number(m.economieEnergie) || 0));
                    return `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 1.5px 2px; font-weight: bold; color: #1e293b;">${m.shortLabel || m.label}</td>
                        <td style="padding: 1.5px 2px; text-align: center; color: #0284c7; font-weight: bold;">${ha} Ha</td>
                        <td style="padding: 1.5px 2px; text-align: center; color: #475569;">${m.volume} t</td>
                        <td style="padding: 1.5px 2px; text-align: right; color: #16a34a; font-weight: bold;">+${fmt(subtotal)} €</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr><td colspan="4" style="padding: 4px; text-align: center; color: #94a3b8; font-style: italic;">Aucune matière configurée</td></tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- TABLEAU FINANCIER SYNTHÉTIQUE -->
            <div style="border-top: 1.5px solid #e2e8f0; padding-top: 3px; margin-top: 3px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 6.3pt;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 1px 0; color: #64748b;">Investissement Brut :</td><td style="text-align: right; font-weight: bold;">${fmt(modelObj.investissementBrut)} € HT</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background: #fffbeb;"><td style="padding: 1px 0; font-weight: bold; color: #b45309;">Investissement Net :</td><td style="text-align: right; font-weight: 900; color: #b45309;">${fmt(r.financing?.investissementNet)} € HT</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 1px 0; color: #dc2626;">Annuité emprunt (25 ans) :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.annuite)} €/an</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 1px 0; color: #16a34a;">Impact EBE :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">+${fmt(r.deltaEBE)} €/an</td></tr>
                <tr style="background: #f0fdf4; border-top: 1px solid #bbf7d0;"><td style="padding: 2px 2px; font-weight: 900; color: #166534;">Gain Net Annuel :</td><td style="padding: 2px 2px; text-align: right; font-weight: 900; color: #166534; font-size: 7.2pt;">+${fmt(r.gainNetAnnuel)} €/an</td></tr>
              </table>
            </div>
          </div>

          <!-- COLONNE 2 : VISUEL 3D SÉCHOIR BATITECH (CONFIGURATEUR) -->
          <div style="border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; position: relative; height: 100%; box-sizing: border-box;">
            <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 8px; border-bottom-right-radius: 6px; font-size: 6.8pt; font-weight: bold; z-index: 2; line-height: 1;">
              Vue 3D Configurateur BatiTech® (${bDims})
            </div>
            ${snapshot3d ? `
              <img src="${snapshot3d}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Rendu 3D Séchoir BatiTech" />
            ` : `
              <div style="color: #64748b; font-size: 8pt; text-align: center; margin: auto; padding: 10px;">
                <strong style="color: #0f172a; display: block;">Modèle 3D BatiTech®</strong>
                ${bDims} — Bardage RAL 7016
              </div>
            `}
            <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2px 6px; border-top-left-radius: 6px; font-size: 6.2pt; font-weight: bold;">
              Cogen'Air® Intégré
            </div>
          </div>

          <!-- COLONNE 3 : IMPLANTATION SATELLITE SUR LE TERRAIN -->
          <div style="border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; position: relative; height: 100%; box-sizing: border-box;">
            <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 8px; border-bottom-right-radius: 6px; font-size: 6.8pt; font-weight: bold; z-index: 2; line-height: 1;">
              Implantation Satellite sur la Parcelle
            </div>
            ${snapshotSat ? `
              <img src="${snapshotSat}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite" />
            ` : `
              <div style="color: #94a3b8; font-size: 8pt; text-align: center; margin: auto; padding: 10px;">
                <strong style="color: #ffffff;">Repérage Satellite</strong>
                <div style="font-size: 7pt; margin-top: 2px; color: #94a3b8;">${clientAddress}</div>
              </div>
            `}
            <div style="position: absolute; bottom: 6px; right: 6px; background: transparent; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9); padding: 2px 4px; font-size: 6.8pt; font-weight: bold;">
              Orientation : ${r.orientationLabel || 'Sud'}
            </div>
          </div>

        </div>

        ${renderLandscapeFooter({ pageNum: currentPage, totalPages, dateStr })}
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

    const imgData1 = canvas1.toDataURL('image/png');
    pdf.addImage(imgData1, 'PNG', 0, 0, pdfW, pdfH);

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 2 : SYNTHÈSE GLOBALE DES BÉNÉFICES & BAISSE DES CHARGES ─────────
    // ═══════════════════════════════════════════════════════════════════════════
    if (includeBenefitsPage) {
      currentPage++;
      const chargesCanvas = document.createElement('canvas');
      drawSechoirChargesChart(chargesCanvas);
      const chargesChartImg = chargesCanvas.toDataURL('image/png');

      container.innerHTML = `
        <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
          ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

          <!-- Synthèse d'introduction -->
          <div style="background-color: #f8fafc; border-left: 5px solid #00B050; padding: 8px 16px; margin-bottom: 8px; text-align: justify; font-size: 8.2pt; font-weight: 600; color: #0D3660; border-radius: 0 6px 6px 0; line-height: 1.35;">
            Le séchoir BatiTech® est un outil stratégique permettant à l’exploitant de gagner en <strong style="color: #0D3660;">rentabilité</strong>, en <strong style="color: #0D3660;">autonomie</strong> et en <strong style="color: #0D3660;">sécurité</strong>, tout en améliorant considérablement la qualité des productions et les conditions de travail au quotidien.
          </div>

          <!-- 2 Colonnes Avantages Financiers & Opérationnels -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
            <!-- Avantages Financiers -->
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="background-color: #0D3660; color: #ffffff; padding: 5px 12px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
                Avantages Financiers
              </div>
              <div style="padding: 8px 12px; font-size: 7.2pt; line-height: 1.38; color: #334155;">
                <div style="margin-bottom: 4px;">&bull; <strong style="color: #0D3660;">Baisse radicale des charges :</strong> Économies majeures sur les compléments alimentaires, le carburant, la main-d’œuvre et arrêt total des prestations externes.</div>
                <div style="margin-bottom: 4px;">&bull; <strong style="color: #0D3660;">Valorisation de la production :</strong> Un fourrage plus nutritif qui augmente la quantité, la qualité et le prix de vente du lait ou de la viande.</div>
                <div style="margin-bottom: 4px;">&bull; <strong style="color: #0D3660;">Nouveaux revenus :</strong> Valorisation de la production solaire thermique &amp; électrique Cogen'Air® et prestations de séchage pour tiers.</div>
                <div>&bull; <strong style="color: #0D3660;">Valorisation patrimoniale :</strong> Création d'un actif immobilier durable et pérenne sur l'exploitation.</div>
              </div>
            </div>

            <!-- Avantages Opérationnels -->
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="background-color: #00B050; color: #ffffff; padding: 5px 12px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
                Avantages Opérationnels
              </div>
              <div style="padding: 8px 12px; font-size: 7.2pt; line-height: 1.38; color: #334155;">
                <div style="margin-bottom: 4px;">&bull; <strong style="color: #0D3660;">Qualité Premium :</strong> Fourrage homogène, très riche en protéines et hautement appétant, limitant les refus.</div>
                <div style="margin-bottom: 4px;">&bull; <strong style="color: #0D3660;">Santé animale renforcée :</strong> L'alimentation sèche de qualité diminue drastiquement les risques sanitaires et vétérinaires.</div>
                <div style="margin-bottom: 4px;">&bull; <strong style="color: #0D3660;">Indépendance météo :</strong> Liberté de récolter et sécher au stade optimal sans craindre les intempéries.</div>
                <div>&bull; <strong style="color: #0D3660;">Impact Écologique :</strong> Zéro plastique agricole d'enrubannage et énergie solaire 100% renouvelable.</div>
              </div>
            </div>
          </div>

          <!-- Cadre du graphique de baisse des charges -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 4px 8px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: center; margin-bottom: 8px;">
            <img src="${chargesChartImg}" alt="Baisse des charges" style="max-width: 98%; height: 52mm; display: block; margin: 0 auto;" />
          </div>

          <!-- Encart Subventions Régionales -->
          <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 6px; padding: 4px 10px; font-size: 6.8pt; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #92400e; text-transform: uppercase;">🏛️ Subventions Régionales &amp; Aides Éligibles :</strong>
              <span style="color: #78350f; margin-left: 6px;">${r.subventionsEligibles?.subventionRegionale?.nom || 'Dispositif Régional (PCAE / FEADER)'} (${regionName}) &bull; Fonds Chaleur ADEME</span>
            </div>
            <div style="color: #92400e; font-weight: bold;">
              Assiette éligible : ${fmt(r.financing?.investissementNet)} € HT
            </div>
          </div>

          ${renderLandscapeFooter({ pageNum: currentPage, totalPages, dateStr })}
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
      const imgData2 = canvas2.toDataURL('image/png');
      pdf.addImage(imgData2, 'PNG', 0, 0, pdfW, pdfH);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 3 : BUSINESS PLAN & TABLEAU DES FLUX DE TRÉSORERIE (25 ANS) ────
    // ═══════════════════════════════════════════════════════════════════════════
    if (includeCashFlowPage) {
      currentPage++;
      const chartCanvas = document.createElement('canvas');
      drawLandscapeTreasuryChart(chartCanvas, r.treasury?.cashFlows || [], r.roi || 8.79);
      const treasuryChartImg = chartCanvas.toDataURL('image/png');

      // Table des 25 ans
      const cFlows = r.treasury?.cashFlows || [];
      const col1 = cFlows.slice(0, 13);
      const col2 = cFlows.slice(13, 25);

      const renderTableColumn = (rows) => rows.map(cf => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 6pt;">
          <td style="padding: 1.5px 2px; font-weight: bold; color: #0D3660; text-align: center;">A${cf.annee}</td>
          <td style="padding: 1.5px 2px; text-align: right; color: #16a34a; font-weight: 600;">+${fmt(cf.fluxOperationnel)} €</td>
          <td style="padding: 1.5px 2px; text-align: right; color: ${cf.annuiteEmprunt > 0 ? '#dc2626' : '#94a3b8'};">-${fmt(cf.annuiteEmprunt)} €</td>
          <td style="padding: 1.5px 2px; text-align: right; color: ${cf.fluxNet >= 0 ? '#166534' : '#dc2626'}; font-weight: bold;">${cf.fluxNet >= 0 ? '+' : ''}${fmt(cf.fluxNet)} €</td>
          <td style="padding: 1.5px 2px; text-align: right; color: ${cf.cumul >= 0 ? '#d97706' : '#64748b'}; font-weight: 900;">${fmt(cf.cumul)} €</td>
        </tr>
      `).join('');

      container.innerHTML = `
        <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
          ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

          <!-- Graphique de Trésorerie Cumulée -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 2px 8px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: center; margin-bottom: 8px;">
            <img src="${treasuryChartImg}" alt="Trésorerie Cumulée" style="max-width: 98%; height: 48mm; display: block; margin: 0 auto;" />
          </div>

          <!-- Tableau des flux sur 2 colonnes (Années 1-13 et 14-25) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px;">
            <!-- Colonne 1 : Années 1 à 13 -->
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #f8fafc;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #0D3660; color: #ffffff; font-size: 6.2pt;">
                    <th style="padding: 2px; text-align: center;">Année</th>
                    <th style="padding: 2px; text-align: right;">Flux Exploitation</th>
                    <th style="padding: 2px; text-align: right;">Annuité</th>
                    <th style="padding: 2px; text-align: right;">Flux Net</th>
                    <th style="padding: 2px; text-align: right;">Cumul</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderTableColumn(col1)}
                </tbody>
              </table>
            </div>

            <!-- Colonne 2 : Années 14 à 25 -->
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #f8fafc;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #0D3660; color: #ffffff; font-size: 6.2pt;">
                    <th style="padding: 2px; text-align: center;">Année</th>
                    <th style="padding: 2px; text-align: right;">Flux Exploitation</th>
                    <th style="padding: 2px; text-align: right;">Annuité</th>
                    <th style="padding: 2px; text-align: right;">Flux Net</th>
                    <th style="padding: 2px; text-align: right;">Cumul</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderTableColumn(col2)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Synthèse des Indicateurs Financiers Avancés -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 6px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 8px; text-align: center;">
              <span style="font-size: 5.8pt; color: #166534; font-weight: bold; text-transform: uppercase;">Valeur Actuelle Nette (VAN 20 ans)</span>
              <div style="font-size: 9pt; font-weight: 900; color: #16a34a;">+${fmt(r.van)} €</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; text-align: center;">
              <span style="font-size: 5.8pt; color: #92400e; font-weight: bold; text-transform: uppercase;">Taux de Rendement Interne (TRI)</span>
              <div style="font-size: 9pt; font-weight: 900; color: #d97706;">${r.triPercent || '10.33'} %</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; text-align: center;">
              <span style="font-size: 5.8pt; color: #475569; font-weight: bold; text-transform: uppercase;">Temps de Retour sur Investissement (ROI)</span>
              <div style="font-size: 9pt; font-weight: 900; color: #0284c7;">${Number(r.roi || 8.79).toFixed(2)} ans</div>
            </div>
          </div>

          ${renderLandscapeFooter({ pageNum: currentPage, totalPages, dateStr })}
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
      const imgData3 = canvas3.toDataURL('image/png');
      pdf.addImage(imgData3, 'PNG', 0, 0, pdfW, pdfH);
    }

    const filename = `Dossier_Etude_Sechoir_BatiTech_${modelName.replace(/\s+/g, '_')}_${(clientName || 'Client').replace(/\s+/g, '_')}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
