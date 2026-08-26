/**
 * SechoirPDFGenerator — Génération PDF Récapitulatif Séchoir BatiTech®
 * ──────────────────────────────────────────────────────────────────────────────
 * Utilise jsPDF + html2canvas pour générer un PDF A4 Portrait multi-pages
 * reprenant le bilan financier, la synthèse globale des bénéfices d'exploitation,
 * et le tableau des flux de trésorerie sur 25 ans.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Formatage ─────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDec = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);

// ─── Génération du graphique des charges (Bénéfices BatiTech Page 2) ──────────

export function drawSechoirChargesChart(canvas) {
  canvas.width = 1600;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  // Fond blanc pur
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
    '-100% (Suppression totale)',
    '-90% (Baisse des achats)',
    '-80% (Remplacés par un fourrage plus riche)',
    '-70% (Moins de passages au champ)',
    '-65% (Gain de temps)'
  ];
  const colors = [c_green, '#28a745', '#5cb85c', '#20B2AA', '#48D1CC'];

  const leftMargin = 260;
  const rightMargin = 620;
  const topMargin = 20;
  const bottomMargin = 90;
  const chartWidth = canvas.width - leftMargin - rightMargin;
  const chartHeight = canvas.height - topMargin - bottomMargin;
  const barSlot = chartHeight / categories.length;
  const barH = barSlot * 0.62;

  // Lignes d'axes X et Y
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1.5;

  // Axe horizontal inférieur
  ctx.beginPath();
  ctx.moveTo(leftMargin, topMargin + chartHeight);
  ctx.lineTo(leftMargin + chartWidth, topMargin + chartHeight);
  ctx.stroke();

  // Axe vertical gauche
  ctx.beginPath();
  ctx.moveTo(leftMargin, topMargin);
  ctx.lineTo(leftMargin, topMargin + chartHeight);
  ctx.stroke();

  // Graduations X : 0, 25, 50, 75, 100
  const xticks = [0, 25, 50, 75, 100];
  xticks.forEach(tick => {
    const x = leftMargin + (tick / 100) * chartWidth;
    ctx.beginPath();
    ctx.moveTo(x, topMargin + chartHeight);
    ctx.lineTo(x, topMargin + chartHeight + 8);
    ctx.stroke();

    ctx.fillStyle = c_blue;
    ctx.font = 'bold 21px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tick.toString(), x, topMargin + chartHeight + 30);
  });

  // Titre Axe X
  ctx.fillStyle = c_blue;
  ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Baisse estimée des charges annuelles d'exploitation (%)", leftMargin + chartWidth / 2, topMargin + chartHeight + 68);

  // Barres & Annotations
  for (let i = 0; i < categories.length; i++) {
    const yCenter = topMargin + (i + 0.5) * barSlot;
    const yTop = yCenter - barH / 2;
    const barW = (reductions[i] / 100) * chartWidth;

    // Libellé catégorie à gauche
    ctx.fillStyle = c_blue;
    ctx.font = 'bold 21px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'right';
    if (categories[i].length === 2) {
      ctx.fillText(categories[i][0], leftMargin - 18, yCenter - 3);
      ctx.fillText(categories[i][1], leftMargin - 18, yCenter + 19);
    } else {
      ctx.fillText(categories[i][0], leftMargin - 18, yCenter + 8);
    }

    // Barre colorée
    ctx.fillStyle = colors[i];
    ctx.fillRect(leftMargin, yTop, barW, barH);

    // Texte explicatif à droite de la barre
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 21px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(explanations[i], leftMargin + barW + 16, yCenter + 8);
  }
}

// ─── Génération du graphique de trésorerie en Canvas ───────────────────────────

function drawTreasuryChart(canvas, cashFlows) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const padding = { top: 40, right: 30, bottom: 50, left: 80 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Fond
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Calculer les bornes
  const values = (cashFlows || []).map(cf => cf.cumul);
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const barWidth = chartW / (cashFlows?.length || 25) * 0.75;
  const gap = chartW / (cashFlows?.length || 25) * 0.25;

  // Ligne de référence Y = 0
  const zeroY = padding.top + (maxVal / range) * chartH;

  // Grille horizontale
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (i / gridSteps) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();

    // Labels Y
    const val = maxVal - (i / gridSteps) * range;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(Math.round(val))} €`, padding.left - 8, y + 4);
  }

  // Barres
  (cashFlows || []).forEach((cf, i) => {
    const x = padding.left + i * (chartW / cashFlows.length) + gap / 2;
    const barH = Math.abs(cf.cumul / range) * chartH;
    const isPositive = cf.cumul >= 0;

    const y = isPositive ? zeroY - barH : zeroY;

    // Dégradé
    const gradient = ctx.createLinearGradient(x, y, x, y + barH);
    if (isPositive) {
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#059669');
    } else {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barH);

    // Labels X (tous les 5 ans)
    if (i % 5 === 0 || i === cashFlows.length - 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`A${cf.annee}`, x + barWidth / 2, H - padding.bottom + 18);
    }
  });

  // Ligne Y=0
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(W - padding.right, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Titre
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Évolution de la Trésorerie Cumulée (25 ans)', W / 2, 25);

  // Légende
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Années', W / 2 - 20, H - 8);
}

// ─── Fonction principale de génération PDF ─────────────────────────────────────

/**
 * Génère et télécharge le PDF récapitulatif du simulateur Séchoir BatiTech®.
 *
 * @param {object} params
 * @param {object} params.results - Résultats calculés (de calculateFullSimulation)
 * @param {string} params.address - Adresse du projet
 * @param {string} params.commune - Commune
 * @param {string} params.departement - Département
 * @param {string} params.orientation - Orientation
 * @param {Array} params.materials - Matières de séchage
 * @param {object} params.financialParams - Paramètres financiers
 * @param {string} [params.projectName] - Nom du projet CRM
 * @param {boolean} [params.includeBenefitsPage=true] - Inclure la page de synthèse globale des bénéfices
 * @param {boolean} [params.includeCashFlowPage=true] - Inclure le tableau détaillé des flux de trésorerie
 */
export async function generateSechoirPDF({
  results,
  address,
  commune,
  departement,
  orientation,
  materials,
  financialParams,
  projectName,
  includeBenefitsPage = true,
  includeCashFlowPage = true,
}) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;';
  document.body.appendChild(container);

  const r = results || {};
  const modelName = r.model?.name || 'BatiTech';
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  let pageCount = 0;

  try {
    // ─── PAGE 1 : Bilan Financier & Plan de Financement ───────────────────────
    container.innerHTML = `
      <div style="width:210mm;min-height:297mm;padding:15mm 18mm;box-sizing:border-box;background:linear-gradient(135deg,#0a0f1a 0%,#1e293b 50%,#0f172a 100%);color:#e2e8f0;font-family:Arial,sans-serif;">
        
        <!-- En-tête -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8mm;padding-bottom:5mm;border-bottom:2px solid #f59e0b;">
          <div>
            <div style="font-size:24px;font-weight:900;color:#f59e0b;letter-spacing:-0.5px;">Séchoir BatiTech®</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2mm;">Étude de rentabilité — Séchoir solaire thermovoltaïque Cogen'Air®</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#94a3b8;">${dateStr}</div>
            ${projectName ? `<div style="font-size:11px;color:#e2e8f0;font-weight:bold;margin-top:1mm;">${projectName}</div>` : ''}
            <div style="font-size:10px;color:#64748b;margin-top:1mm;">nelsonpv.fr</div>
          </div>
        </div>

        <!-- Infos projet -->
        <div style="display:flex;gap:5mm;margin-bottom:8mm;">
          <div style="flex:1;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm 5mm;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2mm;">Localisation</div>
            <div style="font-size:13px;color:#e2e8f0;font-weight:bold;">${commune || address || 'France'}</div>
            <div style="font-size:10px;color:#64748b;margin-top:1mm;">Département ${departement || '33'} — Orientation ${orientation || 'Sud'}</div>
          </div>
          <div style="flex:1;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm 5mm;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2mm;">Modèle BatiTech</div>
            <div style="font-size:13px;color:#f59e0b;font-weight:bold;">${modelName}</div>
            <div style="font-size:10px;color:#64748b;margin-top:1mm;">${r.model?.puissanceKwc || '30.15'} kWc — ${r.model?.nbModules || '90'} modules Cogen'Air®</div>
          </div>
        </div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4mm;margin-bottom:8mm;">
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Production PV</div>
            <div style="font-size:18px;font-weight:900;color:#f59e0b;">${fmt(r.productionPV)}</div>
            <div style="font-size:10px;color:#64748b;">kWh/an</div>
          </div>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Impact EBE</div>
            <div style="font-size:18px;font-weight:900;color:#10b981;">+${fmt(r.deltaEBE)}</div>
            <div style="font-size:10px;color:#64748b;">€/an</div>
          </div>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">ROI</div>
            <div style="font-size:18px;font-weight:900;color:#06b6d4;">${fmtDec(r.roi)}</div>
            <div style="font-size:10px;color:#64748b;">années</div>
          </div>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Gain Net Annuel</div>
            <div style="font-size:18px;font-weight:900;color:#f59e0b;">+${fmt(r.gainNetAnnuel)}</div>
            <div style="font-size:10px;color:#64748b;">€/an</div>
          </div>
        </div>

        <!-- Plan de financement -->
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:5mm 6mm;margin-bottom:8mm;">
          <div style="font-size:12px;font-weight:bold;color:#e2e8f0;margin-bottom:4mm;padding-bottom:2mm;border-bottom:1px solid #334155;">Plan de Financement</div>
          <table style="width:100%;font-size:11px;border-collapse:collapse;">
            <tr><td style="padding:2mm 0;color:#94a3b8;">Investissement Brut</td><td style="text-align:right;color:#e2e8f0;font-weight:bold;">${fmt(r.model?.investissementBrut)} €</td></tr>
            <tr><td style="padding:2mm 0;color:#94a3b8;">Prime CEE (Cogen'Air® - Fiche AGRI-EQ-110)</td><td style="text-align:right;color:#10b981;font-weight:bold;">- ${fmt(r.cee?.primeTotal)} €</td></tr>
            <tr style="border-top:1px solid #334155;"><td style="padding:3mm 0;color:#f59e0b;font-weight:bold;">Investissement Net à Financer</td><td style="text-align:right;color:#f59e0b;font-weight:bold;font-size:13px;">${fmt(r.financing?.investissementNet)} €</td></tr>
            ${r.subventionsEligibles?.montantEstime ? `
              <tr><td style="padding:1.5mm 0;color:#94a3b8;font-size:9.5px;"><em>Aide régionale estimée (${r.subventionsEligibles?.subventionRegionale?.nom || 'PCAE'})</em></td><td style="text-align:right;color:#d97706;font-size:9.5px;"><em>jusqu'à ${fmt(r.subventionsEligibles.montantEstime)} € (indicatif)</em></td></tr>
            ` : ''}
            <tr><td style="padding:2mm 0;color:#94a3b8;">Emprunt bancaire</td><td style="text-align:right;color:#e2e8f0;font-weight:bold;">${fmt(r.financing?.emprunt)} €</td></tr>
            <tr><td style="padding:2mm 0;color:#94a3b8;">Annuité (${financialParams?.dureeEmprunt || 25} ans, ${fmtDec((financialParams?.tauxEmprunt || 0.034) * 100)}%)</td><td style="text-align:right;color:#ef4444;font-weight:bold;">- ${fmt(r.annuite)} €/an</td></tr>
          </table>
        </div>

        <!-- Compte de résultat -->
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:5mm 6mm;margin-bottom:8mm;">
          <div style="font-size:12px;font-weight:bold;color:#e2e8f0;margin-bottom:4mm;padding-bottom:2mm;border-bottom:1px solid #334155;">Compte de Résultat Prévisionnel</div>
          <table style="width:100%;font-size:11px;border-collapse:collapse;">
            <tr><td style="padding:2mm 0;color:#94a3b8;">Augmentation des produits (Delta Produits Séchage + Solaire)</td><td style="text-align:right;color:#10b981;font-weight:bold;">+ ${fmt(r.produits?.deltaProduits)} €/an</td></tr>
            <tr><td style="padding:2mm 0;color:#94a3b8;">Réduction des charges d'exploitation</td><td style="text-align:right;color:#ef4444;font-weight:bold;">- ${fmt(r.charges?.deltaCharges)} €/an</td></tr>
            <tr style="border-top:1px solid #334155;"><td style="padding:3mm 0;color:#10b981;font-weight:bold;">Impact annuel sur l'EBE</td><td style="text-align:right;color:#10b981;font-weight:bold;font-size:14px;">+ ${fmt(r.deltaEBE)} €/an</td></tr>
            <tr><td style="padding:2mm 0;color:#94a3b8;">Montant de l'annuité d'emprunt</td><td style="text-align:right;color:#ef4444;font-weight:bold;">- ${fmt(r.annuite)} €/an</td></tr>
            <tr style="border-top:1px solid #475569;"><td style="padding:3mm 0;color:#f59e0b;font-weight:bold;font-size:12px;">Gain Net Annuel d'Exploitation</td><td style="text-align:right;color:#f59e0b;font-weight:bold;font-size:15px;">+ ${fmt(r.gainNetAnnuel)} €/an</td></tr>
          </table>
        </div>

        <!-- Indicateurs avancés -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm;">
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Temps de retour (ROI)</div>
            <div style="font-size:20px;font-weight:900;color:#06b6d4;">${fmtDec(r.roi)} ans</div>
          </div>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Taux de Rendement Interne (TRI)</div>
            <div style="font-size:20px;font-weight:900;color:#a78bfa;">${r.triPercent} %</div>
            <div style="font-size:8px;color:#64748b;margin-top:1mm;">Pour ${financialParams?.dureeVieProjet || 20} ans</div>
          </div>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Valeur Actuelle Nette (VAN)</div>
            <div style="font-size:20px;font-weight:900;color:#10b981;">${fmt(r.van)} €</div>
            <div style="font-size:8px;color:#64748b;margin-top:1mm;">Taux actualisation ${fmtDec((financialParams?.tauxActualisation || 0.034) * 100)}%</div>
          </div>
        </div>

        <!-- Pied de page -->
        <div style="margin-top:10mm;padding-top:3mm;border-top:1px solid #334155;display:flex;justify-content:space-between;font-size:8px;color:#475569;">
          <span>Séchoir BatiTech® — Étude générée par nelsonpv.fr</span>
          <span>Page 1 / ${1 + (includeBenefitsPage ? 1 : 0) + (includeCashFlowPage ? 1 : 0)}</span>
        </div>
      </div>
    `;

    const canvas1 = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0f172a',
      width: 794,
      windowWidth: 794,
    });

    const imgData1 = canvas1.toDataURL('image/png');
    pdf.addImage(imgData1, 'PNG', 0, 0, pdfW, pdfH);
    pageCount++;

    // ─── PAGE 2 : Synthèse Globale des Bénéfices d'Exploitation (Visuel Nelson BatiTech) ──
    if (includeBenefitsPage) {
      const chargesCanvas = document.createElement('canvas');
      drawSechoirChargesChart(chargesCanvas);
      const chargesChartImg = chargesCanvas.toDataURL('image/png');

      container.innerHTML = `
        <div style="width:210mm;min-height:297mm;padding:10mm 15mm;box-sizing:border-box;background-color:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;position:relative;">
          
          <!-- Header Générique Nelson -->
          <div style="display:table;width:100%;border-bottom:3px solid #0D3660;padding-bottom:8px;margin-bottom:15px;">
            <div style="display:table-cell;vertical-align:bottom;width:35%;">
              <h1 style="font-size:28pt;font-weight:800;color:#0D3660;margin:0;letter-spacing:1px;line-height:1;font-family:Montserrat,Arial,sans-serif;">NELSON</h1>
            </div>
            <div style="display:table-cell;vertical-align:bottom;text-align:right;width:65%;">
              <p style="font-size:14pt;font-weight:700;color:#0D3660;margin:0 0 4px 0;text-transform:uppercase;font-family:Montserrat,Arial,sans-serif;">
                Séchoir Multi-Matières <span style="color:#F29400;">BatiTech®</span>
              </p>
              <p style="font-size:10pt;color:#0D3660;font-weight:600;margin:0;font-family:Montserrat,Arial,sans-serif;">
                Synthèse Globale des Bénéfices d'Exploitation
              </p>
            </div>
          </div>

          <!-- Intro / Synthesis Box -->
          <div style="background-color:#F8FAFC;border-left:5px solid #00B050;padding:12px 20px;margin-bottom:20px;text-align:justify;font-size:11pt;font-weight:600;color:#0D3660;border-radius:0 6px 6px 0;line-height:1.45;">
            Le séchoir BatiTech® est un outil stratégique permettant à l’exploitant de gagner en <strong style="color:#0D3660;">rentabilité</strong>, en <strong style="color:#0D3660;">autonomie</strong> et en <strong style="color:#0D3660;">sécurité</strong>, tout en améliorant considérablement la qualité de ses productions et ses conditions de travail au quotidien.
          </div>

          <!-- Columns - Alignement strict 2 colonnes -->
          <div style="display:table;width:100%;table-layout:fixed;margin-bottom:15px;">
            <div style="display:table-cell;vertical-align:top;width:50%;padding-right:7.5px;">
              <div style="border:1px solid #D0D6E0;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.03);background:#ffffff;">
                <div style="background-color:#0D3660;color:#ffffff;padding:10px 15px;font-size:11.5pt;font-weight:700;text-transform:uppercase;text-align:center;letter-spacing:0.5px;">
                  Avantages Financiers
                </div>
                <div style="padding:15px;background:#ffffff;">
                  <ul style="padding-left:18px;margin:0;font-size:10pt;line-height:1.45;color:#333333;">
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Baisse radicale des charges :</strong> Économies majeures sur les compléments alimentaires, le carburant, la main-d’œuvre, l'achat de plastiques et l'arrêt total des prestations externes.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Valorisation de la production :</strong> Un fourrage plus nutritif qui augmente la quantité, la qualité et le prix de vente du lait ou de la viande.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Nouveaux revenus <span style="color:#F29400;font-weight:bold;">(PV &amp; Presta)</span> :</strong> Génération de revenus complémentaires via l'énergie photovoltaïque (autoconsommation/revente) et des prestations de séchage pour tiers.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Sécurisation économique :</strong> Maîtrise du calendrier annulant les pertes de récoltes liées aux aléas météorologiques.</li>
                    <li style="margin-bottom:0;text-align:justify;"><strong style="color:#0D3660;">Valorisation du patrimoine :</strong> Création d’un bâtiment de stockage durable et valorisant pour l'exploitation.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style="display:table-cell;vertical-align:top;width:50%;padding-left:7.5px;">
              <div style="border:1px solid #D0D6E0;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.03);background:#ffffff;">
                <div style="background-color:#00B050;color:#ffffff;padding:10px 15px;font-size:11.5pt;font-weight:700;text-transform:uppercase;text-align:center;letter-spacing:0.5px;">
                  Avantages Opérationnels
                </div>
                <div style="padding:15px;background:#ffffff;">
                  <ul style="padding-left:18px;margin:0;font-size:10pt;line-height:1.45;color:#333333;">
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Qualité Premium du fourrage :</strong> Produit plus homogène, très nutritif et hautement appétant, limitant le gaspillage.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Santé animale renforcée :</strong> L'alimentation sèche de haute qualité diminue drastiquement les risques sanitaires liés aux fourrages fermentés.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Indépendance totale :</strong> Liberté de récolter et de sécher au moment optimal, sans dépendre de coopératives ou prestataires.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Conditions de travail :</strong> Moins de manipulations fastidieuses au champ et un environnement globalement plus sain.</li>
                    <li style="margin-bottom:10px;text-align:justify;"><strong style="color:#0D3660;">Polyvalence :</strong> Une seule installation capable de sécher fourrage, céréales, maïs, bois et diverses biomasses.</li>
                    <li style="margin-bottom:0;text-align:justify;"><strong style="color:#0D3660;">Impact Écologique :</strong> Zéro plastique agricole et fonctionnement à l'énergie solaire propre.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Le cadre du graphique aligné avec la largeur totale -->
          <div style="display:block;width:100%;text-align:center;border:1px solid #D0D6E0;border-radius:8px;padding:10px 0;background-color:#ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.03);margin-bottom:18px;">
            <img src="${chargesChartImg}" alt="Impact Réduction des Charges" style="max-width:96%;height:auto;display:block;margin:0 auto;" />
          </div>

          <!-- Pied de page identique à la page 1 -->
          <div style="position: absolute; bottom: 10mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #00429d; padding-top: 4px; font-size: 7pt; color: #475569; font-family: Montserrat, Arial, sans-serif;">
            <span style="font-weight: bold; color: #00429d;">NELSON — nelsonpv.fr</span>
            <span>Courtage en Énergies Renouvelables &amp; Ingénierie Solaire</span>
            <span>contact@enr-courtage.fr</span>
          </div>

        </div>
      `;

      const canvas2 = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      pdf.addPage();
      const imgData2 = canvas2.toDataURL('image/png');
      pdf.addImage(imgData2, 'PNG', 0, 0, pdfW, pdfH);
      pageCount++;
    }

    // ─── PAGE 3 : Graphique & Tableau de Trésorerie sur 25 ans ────────────────
    if (includeCashFlowPage) {
      const chartCanvas = document.createElement('canvas');
      chartCanvas.width = 1400;
      chartCanvas.height = 600;
      drawTreasuryChart(chartCanvas, r.treasury?.cashFlows || []);
      const chartDataUrl = chartCanvas.toDataURL('image/png');

      const flowRows = (r.treasury?.cashFlows || [])
        .map(cf => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:1.5mm 2mm;font-weight:bold;color:#e2e8f0;">${cf.annee}</td>
            <td style="padding:1.5mm 2mm;text-align:right;color:#94a3b8;">${cf.annee === 0 ? '—' : fmt(cf.fluxOperationnel) + ' €'}</td>
            <td style="padding:1.5mm 2mm;text-align:right;color:${cf.annuiteEmprunt > 0 ? '#ef4444' : '#94a3b8'};">${cf.annuiteEmprunt > 0 ? '-' + fmt(cf.annuiteEmprunt) + ' €' : '—'}</td>
            <td style="padding:1.5mm 2mm;text-align:right;color:${cf.fluxNet >= 0 ? '#10b981' : '#ef4444'};font-weight:bold;">${cf.fluxNet >= 0 ? '+' : ''}${fmt(cf.fluxNet)} €</td>
            <td style="padding:1.5mm 2mm;text-align:right;color:${cf.cumul >= 0 ? '#f59e0b' : '#94a3b8'};font-weight:bold;">${fmt(cf.cumul)} €</td>
          </tr>
        `).join('');

      container.innerHTML = `
        <div style="width:210mm;min-height:297mm;padding:12mm 18mm;box-sizing:border-box;background:linear-gradient(135deg,#0a0f1a 0%,#1e293b 50%,#0f172a 100%);color:#e2e8f0;font-family:Arial,sans-serif;">
          
          <!-- Graphique -->
          <div style="margin-bottom:8mm;">
            <img src="${chartDataUrl}" style="width:100%;border-radius:8px;border:1px solid #334155;" />
          </div>

          <!-- Tableau des flux -->
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm 5mm;">
            <div style="font-size:12px;font-weight:bold;color:#e2e8f0;margin-bottom:3mm;padding-bottom:2mm;border-bottom:1px solid #334155;">Tableau des Flux de Trésorerie Prévisionnels (25 ans)</div>
            <table style="width:100%;font-size:9px;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid #334155;">
                  <th style="padding:2mm;text-align:left;color:#94a3b8;font-weight:bold;">Année</th>
                  <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Flux Opérationnel</th>
                  <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Annuité Emprunt</th>
                  <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Flux Net</th>
                  <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Trésorerie Cumulée</th>
                </tr>
              </thead>
              <tbody>
                ${flowRows}
              </tbody>
            </table>
          </div>

          <!-- Mentions -->
          <div style="margin-top:6mm;padding:3mm 4mm;background:#1e293b50;border:1px solid #33415550;border-radius:6px;">
            <div style="font-size:8px;color:#64748b;line-height:1.5;">
              <strong style="color:#94a3b8;">Hypothèses :</strong> Inflation produits ${fmtDec((financialParams?.inflationProduits || 0.02) * 100)}%/an — 
              Taux emprunt ${fmtDec((financialParams?.tauxEmprunt || 0.034) * 100)}% sur ${financialParams?.dureeEmprunt || 25} ans — 
              Durée de vie projet ${financialParams?.dureeVieProjet || 20} ans — 
              Taux actualisation VAN ${fmtDec((financialParams?.tauxActualisation || 0.034) * 100)}%<br/>
              <strong style="color:#94a3b8;">Avertissement :</strong> Cette étude est fournie à titre indicatif et ne constitue pas un engagement contractuel. 
              Les montants présentés sont des estimations basées sur les données fournies et les hypothèses retenues.
            </div>
          </div>

          <!-- Pied de page -->
          <div style="margin-top:6mm;padding-top:3mm;border-top:1px solid #334155;display:flex;justify-content:space-between;font-size:8px;color:#475569;">
            <span>Séchoir BatiTech® — Étude générée par nelsonpv.fr — ${dateStr}</span>
            <span>Page ${pageCount + 1} / ${1 + (includeBenefitsPage ? 1 : 0) + (includeCashFlowPage ? 1 : 0)}</span>
          </div>
        </div>
      `;

      const canvas3 = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        width: 794,
        windowWidth: 794,
      });

      pdf.addPage();
      const imgData3 = canvas3.toDataURL('image/png');
      pdf.addImage(imgData3, 'PNG', 0, 0, pdfW, pdfH);
    }

    // Nom de fichier et téléchargement
    const filename = `Etude_Sechoir_BatiTech_${modelName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

