import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';

// ─── Générateur de Graphique Financier Haute Résolution pour le PDF ──────────
const generateFinancialChartImage = ({ sim, width = 800, height = 320 }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Grille & Axes
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5;
  const numLines = 5;
  for (let i = 0; i <= numLines; i++) {
    const y = 30 + (i * (height - 60)) / numLines;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(width - 30, y);
    ctx.stroke();
  }

  // Calcul des données 25 ans
  const totalInv = sim.totalInvestmentHT || sim.resteACharge || 13500;
  const annualGain = sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRentLoyer || 1800;
  const inflation = 0.035;
  const paybackYear = Number(sim.paybackYear) || 8;

  const points = [];
  let cumul = -totalInv;
  let minCumul = -totalInv;
  let maxCumul = 0;

  for (let yr = 1; yr <= 25; yr++) {
    const yrFactor = Math.pow(1 + inflation, yr - 1);
    cumul += Math.round(annualGain * yrFactor);
    if (cumul > maxCumul) maxCumul = cumul;
    points.push({ yr, cumul });
  }

  const range = maxCumul - minCumul || 1;
  const getX = (yr) => 60 + ((yr - 1) * (width - 100)) / 24;
  const getY = (c) => height - 35 - ((c - minCumul) * (height - 70)) / range;

  // Ligne 0 € (Point mort)
  const yZero = getY(0);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(60, yZero);
  ctx.lineTo(width - 30, yZero);
  ctx.stroke();
  ctx.setLineDash([]);

  // Aire verte sous la courbe
  ctx.beginPath();
  ctx.moveTo(getX(1), getY(points[0].cumul));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(getX(points[i].yr), getY(points[i].cumul));
  }
  ctx.lineTo(getX(25), yZero);
  ctx.lineTo(getX(1), yZero);
  ctx.closePath();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fill();

  // Courbe principale verte
  ctx.beginPath();
  ctx.moveTo(getX(1), getY(points[0].cumul));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(getX(points[i].yr), getY(points[i].cumul));
  }
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Point d'amortissement rouge
  const paybackPt = points.find(p => p.yr === paybackYear) || points[7];
  const pbX = getX(paybackPt ? paybackPt.yr : 8);
  const pbY = getY(0);

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pbX, 20);
  ctx.lineTo(pbX, height - 30);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(pbX, pbY, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Label Point d'amortissement
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Amortissement (${paybackYear} ans)`, pbX, 16);

  // Labels Axes X
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  [1, 5, 10, 15, 20, 25].forEach(yr => {
    ctx.fillText(`An ${yr}`, getX(yr), height - 12);
  });

  return canvas.toDataURL('image/jpeg', 0.92);
};

export const generateCommercialOfferPDF = async ({ simulation, selectedProject, customClientName = null }) => {
  if (!simulation) return;

  const sim = simulation;
  const isAuto = sim.type === 'autoconsommation' || sim.projectType === 'solar';
  const isToiture = sim.type === 'toiture_pv';
  const isStruct = sim.type === 'structure_metallique';
  const isIrve = sim.type === 'irve' || sim.projectType === 'irve';

  const typeTitle = isAuto ? 'Autoconsommation Photovoltaïque'
    : isToiture ? 'Toiture Photovoltaïque (Revente Totale / Loyer)'
    : isStruct ? 'Structure Métallique & Hangar Solaire'
    : 'Infrastructure de Recharge Véhicules Électriques (IRVE)';

  const clientName = customClientName || selectedProject?.name || selectedProject?.lastName || sim.clientName || sim.cityName || 'Client Privé';
  const clientAddress = sim.address || selectedProject?.address || (sim.cityName ? `${sim.cityName} (${sim.departmentCode || 'France'})` : 'Adresse du projet');

  // Vue satellite haute résolution (+30% hauteur : 310px)
  let finalMapScreenshot = sim.mapScreenshot;
  if (!finalMapScreenshot) {
    try {
      finalMapScreenshot = await generateSatelliteSnapshot({
        center: sim.mapCenter || [43.6047, 1.4442],
        polygonPoints: sim.polygonPoints || [],
        width: 800,
        height: 650,
        zoom: 19
      });
    } catch (e) {
      console.warn('Génération satellite de secours:', e);
    }
  }

  // Graphique financier haute définition (+20% hauteur : 196px)
  const financialChartImg = generateFinancialChartImage({ sim, width: 800, height: 320 });

  // Calculs financiers pour les 3 cartes de cumuls
  const totalInv = sim.totalInvestmentHT || sim.resteACharge || 10800;
  const annualGain = sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRentLoyer || 1528;
  const inflation = 0.035;

  let cumul10 = -totalInv;
  let cumul20 = -totalInv;
  let cumul25 = -totalInv;

  for (let yr = 1; yr <= 25; yr++) {
    const yrGain = Math.round(annualGain * Math.pow(1 + inflation, yr - 1));
    if (yr <= 10) cumul10 += yrGain;
    if (yr <= 20) cumul20 += yrGain;
    if (yr <= 25) cumul25 += yrGain;
  }

  const dispCumul10 = Math.max(0, cumul10);
  const dispCumul20 = Math.max(0, cumul20);
  const dispCumul25 = Math.max(0, cumul25);

  // Impact écologique
  const annualProd = sim.annualProductionKwh || 7125;
  const co2Avoided = (Math.round((annualProd * 0.0005) * 10) / 10).toLocaleString('fr-FR');
  const treesPlanted = Math.round(annualProd * 0.00143);
  const householdsFed = (Math.round((annualProd / 4500) * 10) / 10).toLocaleString('fr-FR');

  // Format A4 Portrait : 210mm x 297mm
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.padding = '7mm 11mm';
  container.style.background = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';

  const autoconsoDisplay = sim.autoconsoRate
    ? (sim.autoconsoKwh && sim.autoconsoKwh > 0 ? `${sim.autoconsoRate} % (${sim.autoconsoKwh.toLocaleString('fr-FR')} kWh)` : `${sim.autoconsoRate} %`)
    : '65 %';

  const annualGainFormatted = sim.annualBenefitYear1
    ? `+${sim.annualBenefitYear1.toLocaleString('fr-FR')} €`
    : sim.annualRevenueReventeTotale
    ? `+${sim.annualRevenueReventeTotale.toLocaleString('fr-FR')} €`
    : sim.annualRentLoyer
    ? `+${sim.annualRentLoyer.toLocaleString('fr-FR')} €`
    : sim.annualRevenue
    ? `+${sim.annualRevenue.toLocaleString('fr-FR')} €`
    : `+${(Math.round((sim.annualProductionKwh || 11250) * 0.20)).toLocaleString('fr-FR')} €`;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; min-height: 283mm; justify-content: space-between;">
      
      <div>
        <!-- 1. EN-TÊTE PROFESSIONNEL -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #00429d; padding-bottom: 5px; margin-bottom: 7px;">
          <div>
            <div style="font-size: 18pt; font-weight: 900; color: #00429d; letter-spacing: 0.5px;">NELSON</div>
            <div style="font-size: 7.5pt; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 1px;">Étude de Faisabilité &amp; Offre Commerciale</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11pt; font-weight: 800; color: #0f172a;">${typeTitle}</div>
            <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
              <strong>Client :</strong> ${clientName} &nbsp;|&nbsp; <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 1px;"><strong>Adresse :</strong> ${clientAddress}</div>
          </div>
        </div>

        <!-- 2. TABLEAU DES HYPOTHÈSES TECHNIQUES DE DIMENSIONNEMENT -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-bottom: 12px;">
          <div style="font-size: 8pt; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
            Hypothèses Techniques de Dimensionnement
          </div>

          <table style="width: 100%; font-size: 7.5pt; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 2px 0; color: #64748b;">Adresse du site :</td>
              <td style="padding: 2px 0; text-align: right; font-weight: bold;">${clientAddress}</td>
              <td style="padding: 2px 0 2px 15px; color: #64748b;">Orientation du pan :</td>
              <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.orientationLabel || 'Plein Sud'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 2px 0; color: #64748b;">Productible solaire :</td>
              <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0284c7;">
                ${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh / an` : '7 125 kWh / an'}
              </td>
              <td style="padding: 2px 0 2px 15px; color: #64748b;">Inclinaison de toiture :</td>
              <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.pitch || 30}°</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b;">Taux autoconsommation :</td>
              <td style="padding: 2px 0; text-align: right; font-weight: bold;">${autoconsoDisplay}</td>
              <td style="padding: 2px 0 2px 15px; color: #64748b;">Gisement régional :</td>
              <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.regionalBaseYield || 1250} kWh/kWc</td>
            </tr>
          </table>
        </div>

        <!-- 3. SYNTHÈSE DES 4 KPIS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;">
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Puissance</div>
            <div style="font-size: 13pt; font-weight: 900; color: #00429d; margin: 1px 0;">${sim.kwc ? `${sim.kwc} kWc` : sim.power ? `${sim.power} kW` : '-'}</div>
            <div style="font-size: 6.5pt; color: #64748b;">${sim.roofSurface ? `${sim.roofSurface} m² toiture` : sim.quantity ? `${sim.quantity} borne(s)` : ''}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Production Annuelle</div>
            <div style="font-size: 13pt; font-weight: 900; color: #0284c7; margin: 1px 0;">${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh` : sim.annualRevenue ? `${sim.annualRevenue.toLocaleString('fr-FR')} €` : '-'}</div>
            <div style="font-size: 6.5pt; color: #64748b;">Gisement ${sim.regionalBaseYield || 1250} kWh/kWc</div>
          </div>

          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Gains / an (An 1)</div>
            <div style="font-size: 13pt; font-weight: 900; color: #16a34a; margin: 1px 0;">${annualGainFormatted}</div>
            <div style="font-size: 6.5pt; color: #166534;">Économies &amp; Vente</div>
          </div>

          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Amortissement</div>
            <div style="font-size: 13pt; font-weight: 900; color: #9333ea; margin: 1px 0;">${sim.paybackYear || 8} ${typeof sim.paybackYear === 'number' || !isNaN(Number(sim.paybackYear)) ? 'ans' : ''}</div>
            <div style="font-size: 6.5pt; color: #6b21a8;">Invest. : ${sim.totalInvestmentHT ? sim.totalInvestmentHT.toLocaleString('fr-FR') : sim.resteACharge ? sim.resteACharge.toLocaleString('fr-FR') : '-'} € HT</div>
          </div>
        </div>

        <!-- 4. VISUEL SATELLITE HAUTE DÉFINITION (+30% HAUTEUR : 310px) -->
        <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: 10px; height: 310px; display: flex; align-items: center; justify-content: center; position: relative;">
          ${finalMapScreenshot ? `
            <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover;" alt="Vue toiture satellite" />
          ` : `
            <div style="color: #94a3b8; font-size: 10pt; text-align: center; padding: 15px;">
              <strong style="color: #ffffff;">Repérage Satellite du Pan de Toiture</strong>
              <div style="font-size: 8pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
            </div>
          `}
          <div style="position: absolute; bottom: 6px; right: 8px; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2px 7px; border-radius: 4px; font-size: 7.5pt; font-weight: bold;">
            Délimitation toiture : ${sim.roofSurface || 83} m²
          </div>
        </div>

        <!-- 5. GRAPHIQUE FINANCIER D'AMORTISSEMENT (+20% HAUTEUR : 196px) -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; margin-bottom: 8px;">
          <div style="font-size: 8pt; font-weight: 800; color: #00429d; text-transform: uppercase; margin-bottom: 2px;">
            Projection Financière des Gains Cumulés (25 ans)
          </div>
          <div style="height: 196px; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${financialChartImg}" style="width: 100%; height: 100%; object-fit: contain;" alt="Graphique Amortissement" />
          </div>

          <!-- 3 CARTES DE CUMULS DE GAIN EN DESSOUS DU GRAPHIQUE -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; text-align: center;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px;">
              <span style="font-size: 6pt; color: #64748b; font-weight: bold; text-transform: uppercase;">sur 10 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #0f172a;">+${dispCumul10.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px;">
              <span style="font-size: 6pt; color: #64748b; font-weight: bold; text-transform: uppercase;">sur 20 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #0f172a;">+${dispCumul20.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px;">
              <span style="font-size: 6pt; color: #166534; font-weight: bold; text-transform: uppercase;">sur 25 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #16a34a;">+${dispCumul25.toLocaleString('fr-FR')} €</div>
            </div>
          </div>
        </div>

        <!-- 6. ZONE VOTRE IMPACT SUR L'ENVIRONNEMENT (+10% HAUTEUR) -->
        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 8px 12px; margin-bottom: 4px;">
          <div style="font-size: 8pt; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 5px;">
            🌱 Votre Impact sur l'Environnement
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 4px;">
              <div style="font-size: 10pt; font-weight: 900; color: #16a34a;">${co2Avoided} tonnes</div>
              <div style="font-size: 6.5pt; color: #64748b;">de CO₂ évitées par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 4px;">
              <div style="font-size: 10pt; font-weight: 900; color: #16a34a;">${treesPlanted}</div>
              <div style="font-size: 6.5pt; color: #64748b;">arbres plantés par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 4px;">
              <div style="font-size: 10pt; font-weight: 900; color: #0d9488;">${householdsFed}</div>
              <div style="font-size: 6.5pt; color: #64748b;">foyer(s) alimenté(s) en électricité</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 7. PIED DE PAGE PROFESSIONNEL -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #00429d; padding-top: 4px; font-size: 7pt; color: #475569;">
        <span style="font-weight: bold; color: #00429d;">NELSON — nelsonpv.fr</span>
        <span>Courtage en Énergies Renouvelables &amp; Ingénierie Solaire</span>
        <span>contact@enr-courtage.fr</span>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = resolve;
                img.onerror = resolve;
              }
            })
        )
      );
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const safeTitle = (sim.title || 'Offre_Commerciale_Solaire').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Erreur export PDF Commercial Offer:', err);
  } finally {
    document.body.removeChild(container);
  }
};
