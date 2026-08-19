import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';

// ─── Générateur de Graphique Financier Haute Résolution pour le PDF (30 ans) ──
const generateFinancialChartImage = ({ sim, width = 800, height = 374 }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Grille & Axes
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5;
  const numLines = 5;
  for (let i = 0; i <= numLines; i++) {
    const y = 30 + (i * (height - 65)) / numLines;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(width - 25, y);
    ctx.stroke();
  }

  // Calcul des données 30 ans
  const totalInv = sim.totalInvestmentHT || sim.resteACharge || 13500;
  const annualGain = sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRevenue || 1800;
  const inflation = 0.035;
  const paybackYear = Number(sim.paybackYear) || 8;

  const points = [];
  let cumul = -totalInv;
  let minCumul = -totalInv;
  let maxCumul = 0;

  for (let yr = 1; yr <= 30; yr++) {
    const yrFactor = Math.pow(1 + inflation, yr - 1);
    cumul += Math.round(annualGain * yrFactor);
    if (cumul > maxCumul) maxCumul = cumul;
    points.push({ yr, cumul });
  }

  const range = maxCumul - minCumul || 1;
  const getX = (yr) => 60 + ((yr - 1) * (width - 95)) / 29;
  const getY = (c) => height - 35 - ((c - minCumul) * (height - 75)) / range;

  // Ligne 0 € (Point mort)
  const yZero = getY(0);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(60, yZero);
  ctx.lineTo(width - 25, yZero);
  ctx.stroke();
  ctx.setLineDash([]);

  // Barres ou zone bicolore 30 ans
  const barWidth = (width - 110) / 32;
  points.forEach(p => {
    const bx = getX(p.yr) - barWidth / 2;
    const by = getY(p.cumul);
    const bh = Math.abs(yZero - by);
    ctx.fillStyle = p.cumul >= 0 ? '#10b981' : '#3b82f6';
    if (p.cumul >= 0) {
      ctx.fillRect(bx, by, barWidth, bh);
    } else {
      ctx.fillRect(bx, yZero, barWidth, bh);
    }
  });

  // Courbe principale verte
  ctx.beginPath();
  ctx.moveTo(getX(1), getY(points[0].cumul));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(getX(points[i].yr), getY(points[i].cumul));
  }
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Point d'amortissement rouge
  const paybackPt = points.find(p => p.yr === Math.round(paybackYear)) || points[7];
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
  [1, 5, 10, 15, 20, 25, 30].forEach(yr => {
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

  // Titre propre sans "(Revente Totale / Loyer)"
  const typeTitle = isAuto ? 'Autoconsommation Photovoltaïque'
    : isToiture ? 'Toiture Photovoltaïque'
    : isStruct ? 'Structure Métallique & Hangar Solaire'
    : 'Infrastructure de Recharge Véhicules Électriques (IRVE)';

  const clientName = customClientName || sim.clientName || selectedProject?.name || selectedProject?.lastName || sim.cityName || 'Client NELSON';
  const clientAddress = sim.address || selectedProject?.address || (sim.cityName ? `${sim.cityName} (${sim.departmentCode || 'France'})` : 'Adresse du site');

  // Vue satellite
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

  // Graphique financier 30 ans
  const financialChartImg = generateFinancialChartImage({ sim, width: 800, height: 374 });

  // Calculs financiers pour les 3 cartes de cumuls 10 / 20 / 30 ans
  const totalInv = sim.totalInvestmentHT || sim.resteACharge || 10800;
  const annualGain = sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRevenue || 1528;
  const inflation = 0.035;

  let cumul10 = sim.cumul10 !== undefined ? sim.cumul10 : -totalInv;
  let cumul20 = sim.cumul20 !== undefined ? sim.cumul20 : -totalInv;
  let cumul30 = sim.cumul30 !== undefined ? sim.cumul30 : (sim.totalGains30Years !== undefined ? sim.totalGains30Years : -totalInv);

  if (sim.cumul10 === undefined) {
    let c = -totalInv;
    for (let yr = 1; yr <= 30; yr++) {
      const yrGain = Math.round(annualGain * Math.pow(1 + inflation, yr - 1));
      c += yrGain;
      if (yr === 10) cumul10 = c;
      if (yr === 20) cumul20 = c;
      if (yr === 30) cumul30 = c;
    }
  }

  const dispCumul10 = Math.max(0, cumul10);
  const dispCumul20 = Math.max(0, cumul20);
  const dispCumul30 = Math.max(0, cumul30);

  // Impact écologique
  const annualProd = sim.annualProductionKwh || 7125;
  const co2Avoided = (Math.round((annualProd * 0.0005) * 10) / 10).toLocaleString('fr-FR');
  const treesPlanted = Math.round(annualProd * 0.00143);
  const householdsFed = (Math.round((annualProd / 4500) * 10) / 10).toLocaleString('fr-FR');

  // Format A4 Portrait
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
    : sim.annualRevenue
    ? `+${sim.annualRevenue.toLocaleString('fr-FR')} €`
    : `+${(Math.round((sim.annualProductionKwh || 11250) * 0.20)).toLocaleString('fr-FR')} €`;

  const calculatedPower = sim.kwc ? `${sim.kwc} kWc` : (sim.power ? `${sim.power} kW` : (sim.annualProductionKwh ? `${(sim.annualProductionKwh / 1050).toFixed(2)} kWc` : '36 kWc'));

  // HTML conditionnel selon la solution
  let technicalHypothesesHtml = '';
  if (isIrve) {
    // Cadre Hypothèses spécifique IRVE avec tarifs €/kWh
    const marginSession = sim.effectiveMargin ? Number(sim.effectiveMargin) : 4.00;
    const marginKwh = marginSession / 40;
    const purchaseKwh = 0.18;
    const sellKwh = purchaseKwh + marginKwh;

    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-bottom: 10px;">
        <div style="font-size: 8pt; font-weight: 800; color: #059669; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
          Paramètres du Site &amp; Bornes IRVE
        </div>
        <table style="width: 100%; font-size: 7.5pt; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Adresse du parking :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${clientAddress}</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Points de charge :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #059669;">${sim.quantity || 1} borne(s) (${sim.power || 22} kW)</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Tarifs électricité :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">Achat : ${purchaseKwh.toFixed(2)} €/kWh &nbsp;|&nbsp; Vente : ${sellKwh.toFixed(2)} €/kWh</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Taux conso personnelle :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #d97706;">${sim.personalConsoRate || 0} % (Marge 0€)</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; color: #64748b;">Recharges estimées :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.rechargesPerMonth || 205} rech./mois</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Marge session publique :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #059669;">${marginSession.toFixed(2)} € / session (+${marginKwh.toFixed(2)} €/kWh)</td>
          </tr>
        </table>
      </div>
    `;
  } else if (isToiture || isStruct) {
    // Cadre Toiture / Structure SANS "Taux d'autoconsommation" ni "Gisement régional", avec Puissance installée
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-bottom: 10px;">
        <div style="font-size: 8pt; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
          Hypothèses Techniques de Dimensionnement
        </div>
        <table style="width: 100%; font-size: 7.5pt; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Adresse du site :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${clientAddress}</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Puissance installée :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #00429d;">${calculatedPower}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; color: #64748b;">Production estimée :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0284c7;">
              ${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh / an` : '7 125 kWh / an'}
            </td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Orientation / Pente :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.orientationLabel || 'Plein Sud'} (${sim.pitch || 15}°)</td>
          </tr>
        </table>
      </div>
    `;
  } else {
    // Autoconsommation standard avec Puissance installée
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-bottom: 10px;">
        <div style="font-size: 8pt; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
          Hypothèses Techniques de Dimensionnement
        </div>
        <table style="width: 100%; font-size: 7.5pt; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Adresse du site :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${clientAddress}</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Puissance installée :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #00429d;">${calculatedPower}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Productible annuel :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0284c7;">
              ${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh / an` : '7 125 kWh / an'}
            </td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Orientation / Inclinaison :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.orientationLabel || 'Plein Sud'} (${sim.pitch || 30}°)</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; color: #64748b;">Taux d'autoconsommation :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${autoconsoDisplay}</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b;">Région solaire :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${sim.departmentCode || '33'}</td>
          </tr>
        </table>
      </div>
    `;
  }

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

        <!-- 2. TABLEAU DES HYPOTHÈSES TECHNIQUES -->
        ${technicalHypothesesHtml}

        <!-- 3. SYNTHÈSE DES 4 KPIS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;">
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Puissance</div>
            <div style="font-size: 13pt; font-weight: 900; color: #00429d; margin: 1px 0;">${calculatedPower}</div>
            <div style="font-size: 6.5pt; color: #64748b;">${sim.roofSurface ? `${sim.roofSurface} m² toiture` : sim.quantity ? `${sim.quantity} borne(s)` : ''}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">${isIrve ? 'Revenus Annuels' : 'Production Annuelle'}</div>
            <div style="font-size: 13pt; font-weight: 900; color: #0284c7; margin: 1px 0;">${isIrve ? `${(sim.annualRevenue || 0).toLocaleString('fr-FR')} €` : (sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh` : '-')}</div>
            <div style="font-size: 6.5pt; color: #64748b;">${isIrve ? 'Recettes estimées' : `Région ${sim.departmentCode || '33'}`}</div>
          </div>

          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Gains / an (An 1)</div>
            <div style="font-size: 13pt; font-weight: 900; color: #16a34a; margin: 1px 0;">${annualGainFormatted}</div>
            <div style="font-size: 6.5pt; color: #166534;">Bénéfice net annuel</div>
          </div>

          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Amortissement</div>
            <div style="font-size: 13pt; font-weight: 900; color: #9333ea; margin: 1px 0;">${sim.paybackYear || 8} ans</div>
            <div style="font-size: 6.5pt; color: #6b21a8;">Invest. : ${sim.totalInvestmentHT ? sim.totalInvestmentHT.toLocaleString('fr-FR') : sim.resteACharge ? sim.resteACharge.toLocaleString('fr-FR') : '-'} € HT</div>
          </div>
        </div>

        <!-- 4. VISUELS : VUE 3D CONFIGURATEUR ET/OU PLAN SATELLITE -->
        ${isStruct ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; height: 260px;">
            <!-- 4a. VISUEL 3D DU BÂTIMENT CONFIGURÉ (PUR, SANS ESPACE AU-DESSUS DU TITRE) -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; position: relative;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 8px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2;">
                Vue 3D — Bâtiment ${sim.length ? Number(sim.length).toFixed(1) : '30.0'}m × ${sim.width ? Number(sim.width).toFixed(1) : '20.0'}m
              </div>
              ${sim.building3dScreenshot ? `
                <img src="${sim.building3dScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue 3D du Bâtiment" />
              ` : `
                <div style="color: #64748b; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                  <strong style="color: #0f172a; display: block; margin-bottom: 3px;">Hangar Solaire 3D</strong>
                  ${sim.length ? Number(sim.length).toFixed(1) : '30'}m × ${sim.width ? Number(sim.width).toFixed(1) : '20'}m (${sim.floorArea || Math.round((sim.length || 30) * (sim.width || 20))} m²)
                </div>
              `}
            </div>

            <!-- 4b. IMPLANTATION SATELLITE SUR LE TERRAIN (SANS ESPACE AU-DESSUS DU TITRE) -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; position: relative;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 8px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2;">
                Implantation Satellite sur la Parcelle
              </div>
              ${finalMapScreenshot ? `
                <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite du site" />
              ` : `
                <div style="color: #94a3b8; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                  <strong style="color: #ffffff;">Repérage Satellite</strong>
                  <div style="font-size: 7.5pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
                </div>
              `}
              <div style="position: absolute; bottom: 6px; right: 8px; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2px 7px; border-radius: 4px; font-size: 7pt; font-weight: bold;">
                Surface : ${sim.floorArea || Math.round((sim.length || 30) * (sim.width || 20))} m²
              </div>
            </div>
          </div>
        ` : `
          <!-- 4. VISUEL SATELLITE (+10% HAUTEUR : 330px) -->
          <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: 10px; height: 330px; display: flex; align-items: center; justify-content: center; position: relative;">
            ${finalMapScreenshot ? `
              <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite du site" />
            ` : `
              <div style="color: #94a3b8; font-size: 10pt; text-align: center; padding: 15px;">
                <strong style="color: #ffffff;">Repérage Satellite du Site</strong>
                <div style="font-size: 8pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
              </div>
            `}
            <div style="position: absolute; bottom: 6px; right: 8px; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2px 7px; border-radius: 4px; font-size: 7.5pt; font-weight: bold;">
              ${isIrve ? `Implantation : ${sim.quantity || 1} borne(s)` : `Surface : ${sim.roofSurface || sim.floorArea || 83} m²`}
            </div>
          </div>
        `}

        <!-- 5. GRAPHIQUE FINANCIER D'AMORTISSEMENT (+10% HAUTEUR : 225px) -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; margin-bottom: 8px;">
          <div style="font-size: 8pt; font-weight: 800; color: #00429d; text-transform: uppercase; margin-bottom: 2px;">
            Projection Financière des Gains Cumulés (30 ans)
          </div>
          <div style="height: 225px; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${financialChartImg}" style="width: 100%; height: 100%; object-fit: contain;" alt="Graphique Amortissement" />
          </div>

          <!-- 3 CARTES DE CUMULS SANS PADDING SUPÉRIEUR INUTILE (10, 20, 30 ANS) -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px; text-align: center;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 4px 4px 4px;">
              <span style="font-size: 6pt; color: #64748b; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; display: block;">sur 10 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #0f172a; margin: 0;">+${dispCumul10.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 4px 4px 4px;">
              <span style="font-size: 6pt; color: #64748b; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; display: block;">sur 20 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #0f172a; margin: 0;">+${dispCumul20.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 2px 4px 4px 4px;">
              <span style="font-size: 6pt; color: #166534; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; display: block;">sur 30 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #16a34a; margin: 0;">+${dispCumul30.toLocaleString('fr-FR')} €</div>
            </div>
          </div>
        </div>

        <!-- 6. ZONE VOTRE IMPACT SUR L'ENVIRONNEMENT (+10% HAUTEUR) -->
        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 9px 12px; margin-bottom: 4px;">
          <div style="font-size: 8pt; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 5px;">
            🌱 Votre Impact sur l'Environnement
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 7px 4px;">
              <div style="font-size: 10.5pt; font-weight: 900; color: #16a34a;">${co2Avoided} tonnes</div>
              <div style="font-size: 6.5pt; color: #64748b;">de CO₂ évitées par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 7px 4px;">
              <div style="font-size: 10.5pt; font-weight: 900; color: #16a34a;">${treesPlanted}</div>
              <div style="font-size: 6.5pt; color: #64748b;">arbres plantés par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 7px 4px;">
              <div style="font-size: 10.5pt; font-weight: 900; color: #0d9488;">${householdsFed}</div>
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

    const safeTitle = (sim.title || 'Offre_Commerciale_NELSON').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Erreur export PDF Commercial Offer:', err);
  } finally {
    document.body.removeChild(container);
  }
};
