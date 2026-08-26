/**
 * SechoirPDFGenerator — Génération PDF Récapitulatif Séchoir BatiTech®
 * ──────────────────────────────────────────────────────────────────────────────
 * Utilise jsPDF + html2canvas pour générer un PDF A4 Portrait multi-pages
 * reprenant le bilan financier, les KPIs et le graphique de trésorerie.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Formatage ─────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
const fmtDec = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

// ─── Génération du graphique en Canvas ─────────────────────────────────────────

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
  const values = cashFlows.map(cf => cf.cumul);
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const barWidth = chartW / cashFlows.length * 0.75;
  const gap = chartW / cashFlows.length * 0.25;

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
  cashFlows.forEach((cf, i) => {
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
}) {
  // Créer le conteneur HTML temporaire
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif;';
  document.body.appendChild(container);

  const r = results;
  const modelName = r.model?.name || 'BatiTech';
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ─── Page 1 : Synthèse ───────────────────────────────────────────────────

  container.innerHTML = `
    <div style="width:210mm;min-height:297mm;padding:15mm 18mm;box-sizing:border-box;background:linear-gradient(135deg,#0a0f1a 0%,#1e293b 50%,#0f172a 100%);">
      
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
          <div style="font-size:13px;color:#e2e8f0;font-weight:bold;">${commune || address}</div>
          <div style="font-size:10px;color:#64748b;margin-top:1mm;">Département ${departement} — Orientation ${orientation}</div>
        </div>
        <div style="flex:1;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm 5mm;">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2mm;">Modèle</div>
          <div style="font-size:13px;color:#f59e0b;font-weight:bold;">${modelName}</div>
          <div style="font-size:10px;color:#64748b;margin-top:1mm;">${r.model?.puissanceKwc} kWc — ${r.model?.nbModules} modules Cogen'Air®</div>
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
          <tr><td style="padding:2mm 0;color:#94a3b8;">Prime CEE (Cogen'Air®)</td><td style="text-align:right;color:#10b981;font-weight:bold;">- ${fmt(r.cee?.primeTotal)} €</td></tr>
          <tr><td style="padding:2mm 0;color:#94a3b8;">Subventions (PAE)</td><td style="text-align:right;color:#10b981;font-weight:bold;">- ${fmt(financialParams?.subventionPAE || 100000)} €</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:3mm 0;color:#f59e0b;font-weight:bold;">Investissement Net</td><td style="text-align:right;color:#f59e0b;font-weight:bold;font-size:13px;">${fmt(r.financing?.investissementNet)} €</td></tr>
          <tr><td style="padding:2mm 0;color:#94a3b8;">Emprunt</td><td style="text-align:right;color:#e2e8f0;font-weight:bold;">${fmt(r.financing?.emprunt)} €</td></tr>
          <tr><td style="padding:2mm 0;color:#94a3b8;">Annuité (${financialParams?.dureeEmprunt || 25} ans, ${fmtDec((financialParams?.tauxEmprunt || 0.034) * 100)}%)</td><td style="text-align:right;color:#ef4444;font-weight:bold;">- ${fmt(r.annuite)} €/an</td></tr>
        </table>
      </div>

      <!-- Compte de résultat -->
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:5mm 6mm;margin-bottom:8mm;">
        <div style="font-size:12px;font-weight:bold;color:#e2e8f0;margin-bottom:4mm;padding-bottom:2mm;border-bottom:1px solid #334155;">Compte de Résultat</div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <tr><td style="padding:2mm 0;color:#94a3b8;">Augmentation des produits (Delta Produits)</td><td style="text-align:right;color:#10b981;font-weight:bold;">+ ${fmt(r.produits?.deltaProduits)} €/an</td></tr>
          <tr><td style="padding:2mm 0;color:#94a3b8;">Réduction des charges</td><td style="text-align:right;color:#ef4444;font-weight:bold;">- ${fmt(r.charges?.deltaCharges)} €/an</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:3mm 0;color:#10b981;font-weight:bold;">Impact sur l'EBE</td><td style="text-align:right;color:#10b981;font-weight:bold;font-size:14px;">+ ${fmt(r.deltaEBE)} €/an</td></tr>
          <tr><td style="padding:2mm 0;color:#94a3b8;">Montant de l'annuité</td><td style="text-align:right;color:#ef4444;font-weight:bold;">- ${fmt(r.annuite)} €/an</td></tr>
          <tr style="border-top:1px solid #475569;"><td style="padding:3mm 0;color:#f59e0b;font-weight:bold;font-size:12px;">Gain Net Annuel</td><td style="text-align:right;color:#f59e0b;font-weight:bold;font-size:15px;">+ ${fmt(r.gainNetAnnuel)} €/an</td></tr>
        </table>
      </div>

      <!-- Indicateurs avancés -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">Temps de retour</div>
          <div style="font-size:20px;font-weight:900;color:#06b6d4;">${fmtDec(r.roi)} ans</div>
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">TRI</div>
          <div style="font-size:20px;font-weight:900;color:#a78bfa;">${r.triPercent} %</div>
          <div style="font-size:8px;color:#64748b;margin-top:1mm;">Pour ${financialParams?.dureeVieProjet || 20} ans</div>
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm;text-align:center;">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2mm;">VAN</div>
          <div style="font-size:20px;font-weight:900;color:#10b981;">${fmt(r.van)} €</div>
          <div style="font-size:8px;color:#64748b;margin-top:1mm;">Taux actualisation ${fmtDec((financialParams?.tauxActualisation || 0.034) * 100)}%</div>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="margin-top:10mm;padding-top:3mm;border-top:1px solid #334155;display:flex;justify-content:space-between;font-size:8px;color:#475569;">
        <span>Séchoir BatiTech® — Étude générée par nelsonpv.fr</span>
        <span>Page 1/2</span>
      </div>
    </div>
  `;

  // Capturer Page 1
  const canvas1 = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#0f172a',
    width: 794, // 210mm @ 96dpi
    windowWidth: 794,
  });

  // ─── Page 2 : Graphique de trésorerie ─────────────────────────────────────

  // Générer le graphique en canvas
  const chartCanvas = document.createElement('canvas');
  chartCanvas.width = 1400;
  chartCanvas.height = 600;
  drawTreasuryChart(chartCanvas, r.treasury.cashFlows);
  const chartDataUrl = chartCanvas.toDataURL('image/png');

  // Tableau des flux
  const flowRows = r.treasury.cashFlows
    .filter((_, i) => i % 1 === 0) // tous les ans
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
    <div style="width:210mm;min-height:297mm;padding:12mm 18mm;box-sizing:border-box;background:linear-gradient(135deg,#0a0f1a 0%,#1e293b 50%,#0f172a 100%);">
      
      <!-- Graphique -->
      <div style="margin-bottom:8mm;">
        <img src="${chartDataUrl}" style="width:100%;border-radius:8px;border:1px solid #334155;" />
      </div>

      <!-- Tableau des flux -->
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:4mm 5mm;">
        <div style="font-size:12px;font-weight:bold;color:#e2e8f0;margin-bottom:3mm;padding-bottom:2mm;border-bottom:1px solid #334155;">Tableau des Flux de Trésorerie</div>
        <table style="width:100%;font-size:9px;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #334155;">
              <th style="padding:2mm;text-align:left;color:#94a3b8;font-weight:bold;">Année</th>
              <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Flux Opérationnel</th>
              <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Annuité</th>
              <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Flux Net</th>
              <th style="padding:2mm;text-align:right;color:#94a3b8;font-weight:bold;">Cumul</th>
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
        <span>Page 2/2</span>
      </div>
    </div>
  `;

  // Capturer Page 2
  const canvas2 = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#0f172a',
    width: 794,
    windowWidth: 794,
  });

  // ─── Assemblage PDF ──────────────────────────────────────────────────────

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  // Page 1
  const imgData1 = canvas1.toDataURL('image/png');
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData1, 'PNG', 0, 0, pdfW, pdfH);

  // Page 2
  pdf.addPage();
  const imgData2 = canvas2.toDataURL('image/png');
  pdf.addImage(imgData2, 'PNG', 0, 0, pdfW, pdfH);

  // Nom de fichier
  const filename = `Etude_Sechoir_BatiTech_${modelName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
  pdf.save(filename);

  // Nettoyage
  document.body.removeChild(container);
}
