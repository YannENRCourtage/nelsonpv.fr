/**
 * SechoirPDFGenerator — Dossier d'Étude Complet Séchoir Multi-Matières BatiTech® (4 Pages Paysage)
 * ──────────────────────────────────────────────────────────────────────────────
 * Génère un document PDF A4 Paysage (Landscape) 4 pages haute résolution :
 *  - Page 1 : Page Résultats intégrale (4 KPIs, Investissement Initial & Financement, Flux de Trésorerie, Subventions Régionales)
 *  - Page 2 : Vue 3D réelle Configurateur selon modèle (3.1.15 / 6.2.15 / 8.3.15) et Implantation Satellite superposées
 *  - Page 3 : Business Plan Détaillé sur 25 ans (Grand Graphique ROI surélevé + Tableau Complet des 25 Années avec colonne Charges)
 *  - Page 4 : Synthèse des Bénéfices d'Exploitation (Avantages Financiers/Opérationnels + Grand Graphique de Baisse des Charges)
 *
 * Fond blanc pur, pagination au-dessus du trait, en-têtes et pieds de page officiels NELSON.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot.js';
import { BATITECH_MODELS, getRegionForDepartment } from '@/data/sechoirBatitechModels.js';
import { BATITECH_3D_IMAGES } from '@/data/batitechImagesBase64.js';
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
    ctx.fillText(`★ ROI : ${Number(roi || 8.79).toFixed(2)} ans (Année ${roiYear})`, roiBarX, padding.top + 29);
  }

  // Titre du graphique
  ctx.fillStyle = '#0D3660';
  ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Évolution de la Trésorerie Cumulée (25 ans) — Amortissement (ROI) estimé à ${Number(roi || 8.79).toFixed(2)} ans`, padding.left, 28);
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

function renderLandscapeFooter({ pageNum, totalPages = 4, dateStr }) {
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
// FONCTION PRINCIPALE : DOSSIER 4 PAGES PAYSAGE HAUTE DÉFINITION
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
}) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:297mm;background:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;';
  document.body.appendChild(container);

  const sechoirState = useSechoirStore.getState();
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

  const rotVal = typeof sechoirState.rotation === 'number' ? sechoirState.rotation : (
    orientation === 'ouest' ? 90 :
    orientation === 'sud-ouest' ? 45 :
    orientation === 'sud-est' ? -45 :
    orientation === 'est' ? -90 : -6
  );

  // Position satellite exacte
  const exactMapCenter = sechoirState.mapCenter || r.mapCenter || (
    sechoirState.latitude && sechoirState.longitude ? [Number(sechoirState.latitude), Number(sechoirState.longitude)] : [43.6047, 1.4442]
  );

  const totalPages = 4;

  const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  try {
    // ─── 1. CAPTURES HAUTE RÉSOLUTION (IMAGE 3D DU CONFIGURATEUR + SATELLITE ORIENTATION) ──
    const batitech3dImg = BATITECH_3D_IMAGES[modelId] || BATITECH_3D_IMAGES['BT-6.2.15'];

    const snapshotSat = await generateSatelliteSnapshot({
      center: exactMapCenter,
      buildings: [{
        name: `Séchoir ${modelName}`,
        length: bLength,
        width: bWidth,
        rotation: rotVal,
      }],
      building: { length: bLength, width: bWidth, rotation: rotVal },
      width: 1400,
      height: 700,
      zoom: 19,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── PAGE 1 : PAGE RÉSULTATS INTÉGRALE PLEINE PAGE ────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

        <!-- 4 KPIS EN HAUT DE PAGE (STYLE RÉSULTATS) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
          <!-- 1. Production Solaire -->
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 7.2pt; font-weight: bold; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Production Solaire</div>
            <div style="font-size: 16pt; font-weight: 900; color: #0f172a; margin: 2px 0;">${fmt(r.productionPV)} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">kWh/an</span></div>
            <div style="font-size: 6.8pt; color: #64748b;">Gisement zone ${departement} &bull; ${r.orientationLabel || 'Sud'}</div>
          </div>

          <!-- 2. Valorisation Matière -->
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 7.2pt; font-weight: bold; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">📈 Valorisation Matière</div>
            <div style="font-size: 16pt; font-weight: 900; color: #16a34a; margin: 2px 0;">+${fmt(r.produits?.deltaProduits)} <span style="font-size: 8pt; font-weight: normal; color: #166534;">€/an</span></div>
            <div style="font-size: 6.8pt; color: #166534;">Gains séchage + économies énergie</div>
          </div>

          <!-- 3. Charges & Ventilation -->
          <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 7.2pt; font-weight: bold; color: #9f1239; text-transform: uppercase; letter-spacing: 0.5px;">💨 Charges &amp; Ventilation</div>
            <div style="font-size: 16pt; font-weight: 900; color: #e11d48; margin: 2px 0;">-${fmt(r.charges?.deltaCharges)} <span style="font-size: 8pt; font-weight: normal; color: #9f1239;">€/an</span></div>
            <div style="font-size: 6.8pt; color: #9f1239;">Ventilation (${fmt(r.charges?.detail?.ventilation || 0)} €) + Entretien</div>
          </div>

          <!-- 4. Impact EBE -->
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 7.2pt; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">📊 Impact sur l'EBE</div>
            <div style="font-size: 16pt; font-weight: 900; color: #2563eb; margin: 2px 0;">+${fmt(r.deltaEBE)} <span style="font-size: 8pt; font-weight: normal; color: #1e40af;">€/an</span></div>
            <div style="font-size: 6.8pt; color: #1e40af;">Surplus brut d'exploitation</div>
          </div>
        </div>

        <!-- 2 GRANDS BLOCS CENTRAUX PLEINE LARGEUR (STYLE RÉSULTATS) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; height: 120mm; box-sizing: border-box;">
          
          <!-- COLONNE GAUCHE : INVESTISSEMENT INITIAL & FLUX DE TRÉSORERIE ANNUELS -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            
            <!-- 1. Investissement Initial & Financement -->
            <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 10px 14px; flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 6px;">
                <span style="font-size: 8.5pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">1. Investissement Initial &amp; Financement</span>
                <span style="font-size: 6.5pt; font-weight: bold; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">GARANTI &amp; CONTRACTUEL</span>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 3px 0; color: #475569;">Investissement Brut Séchoir :</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${fmt(modelObj.investissementBrut)} € HT</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9; color: #16a34a;"><td style="padding: 3px 0; font-weight: bold;">Prime CEE Cogen'Air® (Fiche AGRI-EQ-110) :</td><td style="text-align: right; font-weight: 900;">-${fmt(r.cee?.primeTotal)} €</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0; background: #fffbeb;"><td style="padding: 4px 4px; font-weight: 900; color: #b45309;">Investissement Net à Financer :</td><td style="padding: 4px 4px; text-align: right; font-weight: 900; color: #b45309; font-size: 9pt;">${fmt(r.financing?.investissementNet)} € HT</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 3px 0; color: #64748b;">Montant financé par Emprunt :</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${fmt(r.financing?.investissementNet)} €</td></tr>
                <tr><td style="padding: 3px 0; color: #dc2626;">Annuité constante (25 ans @ 3.40%) :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.annuite)} €/an</td></tr>
              </table>
            </div>

            <!-- 2. Flux de Trésorerie Annuels d'Exploitation -->
            <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 10px 14px; flex: 1;">
              <div style="font-size: 8.5pt; font-weight: 800; color: #0D3660; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 6px; text-transform: uppercase;">
                2. Flux de Trésorerie Annuels d'Exploitation
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 3px 0; color: #475569;">Valorisation Matière (Delta Produits) :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">+${fmt(r.produits?.deltaProduits)} €/an</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 3px 0; color: #475569;">Charges d'exploitation &amp; ventilation :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.charges?.deltaCharges)} €/an</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 3px 0; color: #475569;">Annuité d'emprunt :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${fmt(r.annuite)} €/an</td></tr>
                <tr style="background: #f0fdf4; border-top: 1.5px solid #bbf7d0;">
                  <td style="padding: 5px 6px;">
                    <div style="font-weight: 900; color: #166534; font-size: 8.5pt;">GAIN NET ANNUEL D'EXPLOITATION</div>
                    <div style="font-size: 6.5pt; color: #15803d;">Après remboursement intégral de l'annuité</div>
                  </td>
                  <td style="padding: 5px 6px; text-align: right; font-weight: 900; color: #166534; font-size: 13pt;">
                    +${fmt(r.gainNetAnnuel)} €/an
                  </td>
                </tr>
              </table>
            </div>

          </div>

          <!-- COLONNE DROITE : SUBVENTIONS RÉGIONALES & AIDES ÉLIGIBLES -->
          <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 12px 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
                <span style="font-size: 9pt; font-weight: 800; color: #0D3660; text-transform: uppercase;">🏛️ Subventions Régionales &amp; Aides Éligibles</span>
                <span style="font-size: 6.5pt; font-weight: bold; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px;">À TITRE INDICATIF</span>
              </div>
              <div style="font-size: 7.5pt; color: #64748b; margin-bottom: 8px;">
                Région identifiée : <strong style="color: #0D3660;">${regionName}</strong> (Département ${departement})
              </div>

              <!-- Dispositif PCAE / FEADER -->
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px;">
                <div style="font-size: 6.8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Dispositif Territorial</div>
                <div style="font-size: 8.5pt; font-weight: 900; color: #0D3660; margin: 1px 0;">Dispositif Régional (PCAE / FEADER)</div>
                <div style="font-size: 7pt; color: #475569; margin-bottom: 6px;">Dispositifs régionaux ${regionName} (PCAE / FEADER) ou Fonds Chaleur ADEME selon éligibilité.</div>
                <div style="display: flex; justify-content: space-between; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 7pt;">
                  <span>Assiette éligible (Brut - CEE) : <strong style="color: #0f172a;">${fmt(r.financing?.investissementNet)} € HT</strong></span>
                  <span>Taux indicatif : <strong style="color: #0D3660;">Sur étude</strong></span>
                </div>
              </div>

              <!-- Fonds Chaleur ADEME -->
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;">
                <div style="font-size: 8pt; font-weight: 900; color: #0D3660;">☀️ Fonds Chaleur ADEME (National)</div>
                <div style="font-size: 7pt; color: #475569; margin-top: 3px; line-height: 1.35;">
                  Éligible pour la valorisation de la chaleur solaire thermovoltaïque Cogen'Air®. Montant variable calculé post-étude thermique.
                </div>
              </div>
            </div>

            <!-- Note d'avertissement réglementaire -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; font-size: 6.5pt; color: #92400e; line-height: 1.35;">
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
    // ─── PAGE 2 : VUE 3D CONFIGURATEUR & CARTE SATELLITE (SUPERPOSÉES) ────────
    // ═══════════════════════════════════════════════════════════════════════════
    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

        <!-- 2 CADRES PLEINE LARGEUR SUPERPOSÉS (3D EN HAUT, SATELLITE EN BAS) -->
        <div style="display: flex; flex-direction: column; gap: 8px; height: 160mm; box-sizing: border-box;">
          
          <!-- CADRE DU HAUT : VUE 3D CONFIGURATEUR SELON MODÈLE (IMAGE 2, 3, 4) -->
          <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; flex: 1; position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
            <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 10px; border-bottom-right-radius: 6px; font-size: 7.2pt; font-weight: bold; z-index: 2; line-height: 1;">
              Vue 3D Configurateur BatiTech® (${bDims})
            </div>
            <img src="${batitech3dImg}" style="max-width: 98%; max-height: 96%; object-fit: contain; display: block; margin: auto;" alt="Vue 3D ${modelName}" />
            <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2.5px 8px; border-top-left-radius: 6px; font-size: 6.8pt; font-weight: bold;">
              Cogen'Air® Intégré
            </div>
          </div>

          <!-- CADRE DU BAS : IMPLANTATION SATELLITE SUR LE TERRAIN -->
          <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; flex: 1; position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
            <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 10px; border-bottom-right-radius: 6px; font-size: 7.2pt; font-weight: bold; z-index: 2; line-height: 1;">
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
              Orientation : ${r.orientationLabel || 'Sud'}
            </div>
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
    // ─── PAGE 3 : BUSINESS PLAN & TABLEAU DES FLUX SUR 25 ANS AVEC CHARGES ────
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
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 6.2pt;">
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
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

        <!-- Grand Graphique de Trésorerie Cumulée Pleine Largeur Agrandit -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 4px 10px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: center; margin-bottom: 8px;">
          <img src="${treasuryChartImg}" alt="Trésorerie Cumulée" style="max-width: 99%; height: 60mm; display: block; margin: 0 auto;" />
        </div>

        <!-- Tableau des flux sur 2 colonnes (Années 1-13 et 14-25) avec colonne Charges -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
          <!-- Colonne 1 : Années 1 à 13 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #0D3660; color: #ffffff; font-size: 6.4pt;">
                  <th style="padding: 3px 2px; text-align: center;">Année</th>
                  <th style="padding: 3px 2px; text-align: right;">Produits (+2%/an)</th>
                  <th style="padding: 3px 2px; text-align: right;">Charges &amp; Vent.</th>
                  <th style="padding: 3px 2px; text-align: right;">Annuité</th>
                  <th style="padding: 3px 2px; text-align: right;">Flux Net</th>
                  <th style="padding: 3px 2px; text-align: right;">Cumul</th>
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
                <tr style="background: #0D3660; color: #ffffff; font-size: 6.4pt;">
                  <th style="padding: 3px 2px; text-align: center;">Année</th>
                  <th style="padding: 3px 2px; text-align: right;">Produits (+2%/an)</th>
                  <th style="padding: 3px 2px; text-align: right;">Charges &amp; Vent.</th>
                  <th style="padding: 3px 2px; text-align: right;">Annuité</th>
                  <th style="padding: 3px 2px; text-align: right;">Flux Net</th>
                  <th style="padding: 3px 2px; text-align: right;">Cumul</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableColumn(col2)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Synthèse des Indicateurs Financiers Avancés -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 6px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 5px 10px; text-align: center;">
            <span style="font-size: 6.2pt; color: #166534; font-weight: bold; text-transform: uppercase;">Valeur Actuelle Nette (VAN 20 ans)</span>
            <div style="font-size: 10.5pt; font-weight: 900; color: #16a34a;">+${fmt(r.van)} €</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 5px 10px; text-align: center;">
            <span style="font-size: 6.2pt; color: #92400e; font-weight: bold; text-transform: uppercase;">Taux de Rendement Interne (TRI)</span>
            <div style="font-size: 10.5pt; font-weight: 900; color: #d97706;">${r.triPercent || '10.33'} %</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px 10px; text-align: center;">
            <span style="font-size: 6.2pt; color: #475569; font-weight: bold; text-transform: uppercase;">Temps de Retour sur Investissement (ROI)</span>
            <div style="font-size: 10.5pt; font-weight: 900; color: #0284c7;">${Number(r.roi || 8.79).toFixed(2)} ans</div>
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
    // ─── PAGE 4 : AVANTAGES FINANCIERS & GRAND GRAPHIQUE BAISSE DES CHARGES ───
    // ═══════════════════════════════════════════════════════════════════════════
    const chargesCanvas = document.createElement('canvas');
    drawSechoirChargesChart(chargesCanvas);
    const chargesChartImg = chargesCanvas.toDataURL('image/png');

    container.innerHTML = `
      <div style="width: 297mm; height: 210mm; padding: 8mm 14mm 10mm 14mm; box-sizing: border-box; background: #ffffff; color: #1e293b; font-family: Montserrat, Arial, sans-serif; position: relative;">
        ${renderLandscapeHeader({ clientName, dateStr, clientAddress, modelName })}

        <!-- Synthèse d'introduction -->
        <div style="background-color: #f8fafc; border-left: 5px solid #00B050; padding: 9px 18px; margin-bottom: 10px; text-align: justify; font-size: 8.5pt; font-weight: 600; color: #0D3660; border-radius: 0 6px 6px 0; line-height: 1.38;">
          Le séchoir BatiTech® est un outil stratégique permettant à l’exploitant de gagner en <strong style="color: #0D3660;">rentabilité</strong>, en <strong style="color: #0D3660;">autonomie</strong> et en <strong style="color: #0D3660;">sécurité</strong>, tout en améliorant considérablement la qualité des productions et les conditions de travail au quotidien.
        </div>

        <!-- 2 Colonnes Avantages Financiers & Opérationnels -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
          <!-- Avantages Financiers -->
          <div style="border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="background-color: #0D3660; color: #ffffff; padding: 6px 14px; font-size: 9pt; font-weight: 700; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
              Avantages Financiers
            </div>
            <div style="padding: 10px 14px; font-size: 7.5pt; line-height: 1.4; color: #334155;">
              <div style="margin-bottom: 5px;">&bull; <strong style="color: #0D3660;">Baisse radicale des charges :</strong> Économies majeures sur les compléments alimentaires, le carburant, la main-d’œuvre et arrêt total des prestations externes.</div>
              <div style="margin-bottom: 5px;">&bull; <strong style="color: #0D3660;">Valorisation de la production :</strong> Un fourrage plus nutritif qui augmente la quantité, la qualité et le prix de vente du lait ou de la viande.</div>
              <div style="margin-bottom: 5px;">&bull; <strong style="color: #0D3660;">Nouveaux revenus :</strong> Valorisation de la production solaire thermique &amp; électrique Cogen'Air® et prestations de séchage pour tiers.</div>
              <div>&bull; <strong style="color: #0D3660;">Valorisation patrimoniale :</strong> Création d'un actif immobilier durable et pérenne sur l'exploitation.</div>
            </div>
          </div>

          <!-- Avantages Opérationnels -->
          <div style="border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="background-color: #00B050; color: #ffffff; padding: 6px 14px; font-size: 9pt; font-weight: 700; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">
              Avantages Opérationnels
            </div>
            <div style="padding: 10px 14px; font-size: 7.5pt; line-height: 1.4; color: #334155;">
              <div style="margin-bottom: 5px;">&bull; <strong style="color: #0D3660;">Qualité Premium :</strong> Fourrage homogène, très riche en protéines et hautement appétant, limitant les refus.</div>
              <div style="margin-bottom: 5px;">&bull; <strong style="color: #0D3660;">Santé animale renforcée :</strong> L'alimentation sèche de qualité diminue drastiquement les risques sanitaires et vétérinaires.</div>
              <div style="margin-bottom: 5px;">&bull; <strong style="color: #0D3660;">Indépendance météo :</strong> Liberté de récolter et sécher au stade optimal sans craindre les intempéries.</div>
              <div>&bull; <strong style="color: #0D3660;">Impact Écologique :</strong> Zéro plastique agricole d'enrubannage et énergie solaire 100% renouvelable.</div>
            </div>
          </div>
        </div>

        <!-- Grand Graphique de Baisse des Charges Agrandit -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 6px 12px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: center;">
          <img src="${chargesChartImg}" alt="Baisse des charges" style="max-width: 98%; height: 75mm; display: block; margin: 0 auto;" />
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

    const filename = `Dossier_Etude_Sechoir_BatiTech_${modelName.replace(/\s+/g, '_')}_${(clientName || 'Client').replace(/\s+/g, '_')}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
