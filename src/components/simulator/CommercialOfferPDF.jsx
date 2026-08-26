import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot, generateBeforeAfterDualSnapshot } from '@/utils/satelliteSnapshot';

const BORNE_7_4KW_IMG = '/images/borne_irve_7_4kw.jpg';
const BORNE_DOUBLE_IMG = '/images/borne_irve_double.jpg';

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

  // Calcul des données (25 ans pour Séchoir, 30 ans pour les autres)
  const isSechoir = sim.type === 'sechoir_batitech' || sim.type === 'sechoir';
  const maxYears = isSechoir ? 25 : 30;
  const totalInv = sim.totalInvestmentHT || sim.resteACharge || 13500;
  const annualGain = isSechoir ? (sim.gainNetAnnuel || sim.deltaEBE || 12921) : (sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRevenue || 1800);
  const inflation = isSechoir ? 0.02 : 0.035;
  const paybackYear = Number(sim.paybackYear || sim.roi) || (isSechoir ? 7.29 : 8);

  const points = [];
  let minCumul = isSechoir ? 0 : -totalInv;
  let maxCumul = 0;

  if (isSechoir && Array.isArray(sim.cashFlows) && sim.cashFlows.length > 0) {
    sim.cashFlows.forEach(cf => {
      if (cf.annee >= 1 && cf.annee <= maxYears) {
        const c = Number(cf.cumul || 0);
        if (c < minCumul) minCumul = c;
        if (c > maxCumul) maxCumul = c;
        points.push({ yr: cf.annee, cumul: c });
      }
    });
  } else {
    let cumul = isSechoir ? 0 : -totalInv;
    for (let yr = 1; yr <= maxYears; yr++) {
      const yrFactor = Math.pow(1 + inflation, yr - 1);
      cumul += Math.round(annualGain * yrFactor);
      if (cumul < minCumul) minCumul = cumul;
      if (cumul > maxCumul) maxCumul = cumul;
      points.push({ yr, cumul });
    }
  }

  const range = maxCumul - minCumul || 1;
  const getX = (yr) => 60 + ((yr - 1) * (width - 95)) / (maxYears - 1);
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

  // Barres
  const barWidth = (width - 110) / (maxYears + 2);
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
  const paybackPt = points.find(p => p.yr === Math.round(paybackYear)) || points[Math.min(points.length - 1, Math.round(paybackYear) || 7)];
  const pbX = getX(paybackPt ? paybackPt.yr : Math.min(maxYears, Math.round(paybackYear) || 7));
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
  ctx.fillText(`Amortissement (${Number(paybackYear).toFixed(2)} ans)`, pbX, 16);

  // Labels Axes X
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  const xLabels = isSechoir ? [1, 5, 10, 15, 20, 25] : [1, 5, 10, 15, 20, 25, 30];
  xLabels.forEach(yr => {
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
  const isSechoir = sim.type === 'sechoir_batitech' || sim.type === 'sechoir';
  const isIrve = sim.type === 'irve' || sim.projectType === 'irve';

  // Titre propre sans "(Revente Totale / Loyer)"
  const typeTitle = isAuto ? 'Autoconsommation Photovoltaïque'
    : isToiture ? 'Toiture Photovoltaïque'
    : isStruct ? 'Structure Métallique & Hangar Solaire'
    : isSechoir ? 'Séchoir Multi-Matières BatiTech®'
    : 'Infrastructure de Recharge Véhicules Électriques (IRVE)';

  const clientName = customClientName || sim.clientName || selectedProject?.name || selectedProject?.lastName || sim.cityName || 'Client NELSON';
  const clientAddress = sim.address || selectedProject?.address || (sim.cityName ? `${sim.cityName} (${sim.departmentCode || 'France'})` : 'Adresse du site');

  // Vue satellite ou Visuel Avant / Après (Côte à côte pour Toiture et Autoconso)
  let finalMapScreenshot = null;
  if (isAuto || isToiture) {
    try {
      finalMapScreenshot = await generateBeforeAfterDualSnapshot({
        center: sim.mapCenter || [43.6047, 1.4442],
        polygonPoints: sim.polygonPoints || [],
        customKwc: sim.kwc || sim.installedKwc || sim.power || 6,
        roofSurface: sim.roofSurface || 83,
        ridgeIndex: sim.ridgeIndex || 0,
        isLandscape: sim.isLandscape ?? false,
        width: 900,
        height: 420,
        zoom: 19
      });
    } catch (e) {
      console.warn('Génération dual snapshot avant-après:', e);
    }
  }

  if (!finalMapScreenshot) {
    try {
      finalMapScreenshot = sim.mapScreenshot || await generateSatelliteSnapshot({
        center: sim.mapCenter || [43.6047, 1.4442],
        polygonPoints: sim.polygonPoints || [],
        buildings: sim.buildings || (isSechoir ? [{ length: Number(sim.length || 18), width: Number(sim.width || 20), rotation: Number(sim.rotation || 0) }] : []),
        building: isSechoir ? { length: Number(sim.length || 18), width: Number(sim.width || 20), rotation: Number(sim.rotation || 0) } : null,
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
  const annualGain = isSechoir ? (sim.gainNetAnnuel || sim.deltaEBE || 13833) : (sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRevenue || 1528);
  const inflation = isSechoir ? 0.02 : 0.035;

  let cumul10 = sim.cumul10 !== undefined ? sim.cumul10 : (isSechoir ? 169145 : -totalInv);
  let cumul20 = sim.cumul20 !== undefined ? sim.cumul20 : (isSechoir ? 416000 : -totalInv);
  let cumul30 = sim.cumul30 !== undefined ? sim.cumul30 : (sim.totalGains30Years !== undefined ? sim.totalGains30Years : (isSechoir ? 720000 : -totalInv));

  if (sim.cumul10 === undefined && !isSechoir) {
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

  const annualGainFormatted = isSechoir
    ? `+${(sim.deltaEBE || 32450).toLocaleString('fr-FR')} €`
    : sim.annualBenefitYear1
    ? `+${sim.annualBenefitYear1.toLocaleString('fr-FR')} €`
    : sim.annualRevenueReventeTotale
    ? `+${sim.annualRevenueReventeTotale.toLocaleString('fr-FR')} €`
    : sim.annualRevenue
    ? `+${sim.annualRevenue.toLocaleString('fr-FR')} €`
    : `+${(Math.round((sim.annualProductionKwh || 11250) * 0.20)).toLocaleString('fr-FR')} €`;

  const calculatedPower = sim.kwc ? `${sim.kwc} kWc` : (sim.installedKwc ? `${sim.installedKwc} kWc` : (sim.power ? `${sim.power} kW` : (sim.annualProductionKwh ? `${(sim.annualProductionKwh / 1050).toFixed(2)} kWc` : '36 kWc')));

  // Hypothèse de tarif EDF OA selon la puissance
  const kwcNumber = Number(sim.kwc || sim.installedKwc || sim.power || (sim.annualProductionKwh ? sim.annualProductionKwh / 1050 : 100));
  let edfOaTarifLabel = 'Tarif EDF OA : 0.082 €/kWh';
  if (kwcNumber < 100) {
    edfOaTarifLabel = 'Tarif EDF OA : 0.011 €/kWh';
  } else if (kwcNumber <= 500) {
    edfOaTarifLabel = 'Tarif EDF OA : 0.082 €/kWh';
  } else {
    edfOaTarifLabel = 'Tarif EDF OA : 0.0829 €/kWh';
  }
  if (sim.tarifEdfOaKwh) {
    edfOaTarifLabel = `Tarif EDF OA : ${sim.tarifEdfOaKwh} €/kWh`;
  }

  // Photo et titre de borne IRVE selon puissance
  const irvePower = Number(sim.power || (sim.selectedStation && sim.selectedStation.power) || 22);
  const bornePhoto = irvePower <= 7.4 ? BORNE_7_4KW_IMG : BORNE_DOUBLE_IMG;
  const borneTitle = irvePower <= 7.4 ? 'Borne de Recharge IRVE (7.4 kW)' : `Borne de Recharge IRVE (${irvePower} kW)`;

  // HTML conditionnel selon la solution
  const resolveOrientationName = (simObj) => {
    let ori = '';
    if (simObj?.orientationLabel) {
      ori = simObj.orientationLabel;
    } else {
      const r = Number(simObj?.rotation !== undefined ? simObj.rotation : (simObj?.buildings && simObj.buildings[0] && simObj.buildings[0].rotation !== undefined ? simObj.buildings[0].rotation : 0));
      const norm = ((((Number(r) + 180) % 360) + 360) % 360) - 180;
      if (norm === 0) ori = 'Plein Sud (0°)';
      else if (Math.abs(norm) >= 135) ori = `Nord (${r > 0 ? `+${r}` : r}°)`;
      else if (norm > 45) ori = `Ouest (+${r}°)`;
      else if (norm > 0 && norm <= 45) ori = `Sud-Ouest (+${r}°)`;
      else if (norm < -45) ori = `Est (${r}°)`;
      else if (norm < 0 && norm >= -45) ori = `Sud-Est (${r}°)`;
      else ori = 'Plein Sud (0°)';
    }

    // Si ori contient déjà une inclinaison avec "/"
    if (ori.includes('/')) return ori;

    // Détermination de l'inclinaison de la toiture
    const tiltVal = Number(
      simObj?.tilt !== undefined ? simObj.tilt :
      simObj?.roofPitch !== undefined ? simObj.roofPitch :
      simObj?.pitch !== undefined ? simObj.pitch :
      simObj?.slope !== undefined ? simObj.slope :
      (simObj?.buildings && simObj.buildings[0] && (simObj.buildings[0].tilt || simObj.buildings[0].roofPitch || simObj.buildings[0].pitch)) ||
      30
    );

    return `${ori} / ${Math.round(tiltVal)}°`;
  };

  let technicalHypothesesHtml = '';
  if (isIrve) {
    // Cadre Hypothèses spécifique IRVE avec tarifs €/kWh
    const marginSession = sim.effectiveMargin ? Number(sim.effectiveMargin) : 4.00;
    const marginKwh = marginSession / 40;
    const purchaseKwh = 0.18;
    const sellKwh = purchaseKwh + marginKwh;

    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-top: 10px; margin-bottom: 10px;">
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
  } else if (isSechoir) {
    // Helper pour insérer un retour à la ligne avant le code postal
    const formatAddressWithPostalBreak = (addr) => {
      if (!addr) return 'Site du Projet';
      const match = addr.match(/^(.*?)\s*(\b\d{5}\b.*)$/);
      if (match && match[1] && match[2]) {
        return `${match[1].trim()}<br/>${match[2].trim()}`;
      }
      return addr;
    };

    // Helper pour le nombre de cellules de chauffage BatiTech
    const getCellulesText = (modelId, modelName) => {
      const str = `${modelId || ''} ${modelName || ''}`.toLowerCase();
      if (str.includes('8.3') || str.includes('3 zone') || str.includes('3 cell')) {
        return '3 Cellules 6×15m (270 m² utiles)';
      }
      if (str.includes('6.2') || str.includes('2 zone') || str.includes('2 cell')) {
        return '2 Cellules 6×15m (180 m² utiles)';
      }
      return '1 Cellule 6×15m (90 m² utiles)';
    };

    // Cadre Hypothèses spécifique Séchoir BatiTech
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-top: 10px; margin-bottom: 10px;">
        <div style="font-size: 8pt; font-weight: 800; color: #d97706; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
          Paramètres du Projet &amp; Dimensionnement Séchoir BatiTech®
        </div>
        <table style="width: 100%; font-size: 7.5pt; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b; vertical-align: top; white-space: nowrap; width: 18%;">Adresse du site&nbsp;:</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; vertical-align: top; width: 32%;">${formatAddressWithPostalBreak(clientAddress)}</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b; vertical-align: top; white-space: nowrap; width: 18%;">Modèle étudié&nbsp;:</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #d97706; vertical-align: top; width: 32%;">
              <div>${sim.modelName || 'BatiTech 3.1.15'} — ${sim.dimensions || '18m × 20m'}</div>
              <div style="font-size: 6.8pt; color: #64748b; font-weight: 600; margin-top: 1px;">${getCellulesText(sim.modelId, sim.modelName)}</div>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b; white-space: nowrap;">Générateur Cogen'Air®&nbsp;:</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${calculatedPower} (${sim.nbModules || 90} modules)</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b; white-space: nowrap;">Productible solaire&nbsp;:</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0284c7;">${(sim.annualProductionKwh || 75000).toLocaleString('fr-FR')} kWh / an</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; color: #64748b; white-space: nowrap;">Orientation / Pente&nbsp;:</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${resolveOrientationName(sim)} (15° standard)</td>
            <td style="padding: 2px 0 2px 15px; color: #64748b; white-space: nowrap;">Filières de séchage&nbsp;:</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #16a34a;">${sim.activeMaterialsText || 'Fourrage en vrac, Bottes, Céréales'}</td>
          </tr>
        </table>
      </div>
    `;
  } else if (isToiture || isStruct) {
    // Cadre Toiture / Structure SANS "Taux d'autoconsommation" ni "Gisement régional", avec Puissance installée
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-top: 10px; margin-bottom: 10px;">
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
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${resolveOrientationName(sim)}</td>
          </tr>
        </table>
      </div>
    `;
  } else {
    // Autoconsommation standard avec Puissance installée
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 12px; margin-top: 10px; margin-bottom: 10px;">
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
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${resolveOrientationName(sim)}</td>
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
            <div style="font-size: 6.5pt; color: #64748b;">${isSechoir ? `${sim.nbModules || 90} panneaux Cogen'Air` : (sim.roofSurface ? `${sim.roofSurface} m² toiture` : sim.quantity ? `${sim.quantity} borne(s)` : '')}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">${isSechoir ? 'Valorisation Matière' : isIrve ? 'Revenus Annuels' : 'Production Annuelle'}</div>
            <div style="font-size: 13pt; font-weight: 900; color: ${isSechoir ? '#16a34a' : '#0284c7'}; margin: 1px 0;">${isSechoir ? `+${(sim.deltaProduits || 25720).toLocaleString('fr-FR')} €` : isIrve ? `${(sim.annualRevenue || 0).toLocaleString('fr-FR')} €` : (sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh` : '-')}</div>
            <div style="font-size: 6.5pt; color: #64748b;">${isSechoir ? 'Gains séchage + économies' : isIrve ? 'Recettes estimées' : `Région ${sim.departmentCode || '33'}`}</div>
          </div>

          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">${isSechoir ? 'Prime CEE (AGRI-EQ-110)' : isIrve ? 'Investissement net' : 'Gains / an (An 1)'}</div>
            <div style="font-size: 13pt; font-weight: 900; color: #16a34a; margin: 1px 0;">${isSechoir ? `-${(sim.primeCEE || 38790).toLocaleString('fr-FR')} €` : isIrve ? `${(sim.totalInvestmentHT || sim.resteACharge || 3960).toLocaleString('fr-FR')} € HT` : annualGainFormatted}</div>
            <div style="font-size: 6.5pt; color: #166534;">${isSechoir ? 'Cogen\'Air® Certifiée' : isIrve ? `Coût ${sim.quantity || 1} borne(s)` : isStruct ? edfOaTarifLabel : isToiture ? `Tarif EDF OA : ${sim.tarifEdfOaKwh || '0.082'} €/kWh` : `${Math.round(sim.annualSavingsAutoconso || ((sim.annualBenefitYear1 || 1462) * 0.88)).toLocaleString('fr-FR')} € écon. + ${Math.round(sim.annualRevenueSurplus || ((sim.annualBenefitYear1 || 1462) * 0.12)).toLocaleString('fr-FR')} € surplus`}</div>
          </div>

          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Amortissement</div>
            <div style="font-size: 13pt; font-weight: 900; color: #9333ea; margin: 1px 0;">${isSechoir ? `${Number(sim.paybackYear || sim.roi || 7.29).toFixed(2)} ans` : `${sim.paybackYear || 8} ans`}</div>
            <div style="font-size: 6.5pt; color: #6b21a8;">${isSechoir ? `Invest. : ${(sim.investissementNet || sim.totalInvestmentHT || 327053).toLocaleString('fr-FR')} € HT` : isIrve ? `Soit ${sim.paybackMonths || Math.round((Number(sim.paybackYear) || 0.4) * 12)} mois` : `Invest. : ${sim.totalInvestmentHT ? sim.totalInvestmentHT.toLocaleString('fr-FR') : sim.resteACharge ? sim.resteACharge.toLocaleString('fr-FR') : '-'} € HT`}</div>
          </div>
        </div>

        <!-- 4. VISUELS : VUE 3D CONFIGURATEUR ET/OU PLAN SATELLITE (+10% HAUTEUR) -->
        ${isSechoir ? `
          <!-- 4. VISUELS SÉCHOIR BATITECH : PLAN FINANCEMENT (GAUCHE) + CARTE SATELLITE (DROITE) -->
          <div style="display: grid; grid-template-columns: 1fr 1.25fr; gap: 8px; margin-bottom: 10px; height: 310px;">
            <!-- 4a. TABLEAU PLAN DE FINANCEMENT & COMPTE DE RÉSULTAT -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; font-size: 7pt;">
              <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; text-transform: uppercase;">
                Plan de Financement &amp; Rentabilité
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 6.8pt;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.5px 0; color: #64748b;">Investissement Brut Séchoir :</td><td style="text-align: right; font-weight: bold;">${(sim.totalInvestmentHT || 127053).toLocaleString('fr-FR')} € HT</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.5px 0; color: #16a34a;">Prime CEE Cogen'Air (AGRI-EQ-110) :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">-${(sim.primeCEE || 38790).toLocaleString('fr-FR')} €</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.5px 0; color: #16a34a;">Subventions (PAE Éleveurs) :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">-${(sim.subventionsPAE !== undefined ? sim.subventionsPAE : 100000).toLocaleString('fr-FR')} €</td></tr>
                <tr style="border-bottom: 1px solid #cbd5e1; background: #fffbeb;"><td style="padding: 2px 0; font-weight: bold; color: #b45309;">Investissement Net Réel :</td><td style="text-align: right; font-weight: 900; color: #b45309;">${(sim.investissementNet !== undefined ? sim.investissementNet : (sim.totalInvestmentHT ? Math.max(0, sim.totalInvestmentHT - (sim.primeCEE || 0) - (sim.subventionsPAE || 100000)) : 430421)).toLocaleString('fr-FR')} € HT</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.5px 0; color: #64748b;">Montant de l'emprunt (25 ans) :</td><td style="text-align: right; font-weight: bold;">${(sim.emprunt !== undefined ? sim.emprunt : (sim.investissementNet || 430421)).toLocaleString('fr-FR')} €</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.5px 0; color: #dc2626;">Montant moyen de l'annuité :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${(sim.annuite || 11299).toLocaleString('fr-FR')} €/an</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.5px 0; color: #16a34a;">Impact annuel sur l'EBE :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">+${(sim.deltaEBE || 24220).toLocaleString('fr-FR')} €/an</td></tr>
                <tr style="background: #f0fdf4;"><td style="padding: 2.5px 0; font-weight: 900; color: #166534;">Gain Net Annuel d'Exploitation :</td><td style="text-align: right; font-weight: 900; color: #166534; font-size: 7.5pt;">+${(sim.gainNetAnnuel || 12921).toLocaleString('fr-FR')} €/an</td></tr>
              </table>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px; text-align: center;">
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; height: 38px; min-height: 38px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
                  <span style="font-size: 5.8pt; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">VAN (20 ans)</span>
                  <div style="font-size: 8.5pt; font-weight: 900; color: #16a34a; line-height: 1;">+${(sim.van || 127853).toLocaleString('fr-FR')} €</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; height: 38px; min-height: 38px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
                  <span style="font-size: 5.8pt; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">TRI (20 ans)</span>
                  <div style="font-size: 8.5pt; font-weight: 900; color: #d97706; line-height: 1;">${sim.triPercent || '7.06'} %</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; height: 38px; min-height: 38px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
                  <span style="font-size: 5.8pt; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">ROI net</span>
                  <div style="font-size: 8.5pt; font-weight: 900; color: #0284c7; line-height: 1;">${Number(sim.paybackYear || sim.roi || 7.29).toFixed(2)} ans</div>
                </div>
              </div>
            </div>

            <!-- 4b. IMPLANTATION SATELLITE DU SÉCHOIR -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; position: relative; height: 100%;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">Implantation Satellite Séchoir BatiTech® (${sim.dimensions || '18m × 20m'})</div>
              ${finalMapScreenshot ? `
                <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite du site" />
              ` : `
                <div style="color: #94a3b8; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                  <strong style="color: #ffffff;">Repérage Satellite</strong>
                  <div style="font-size: 7.5pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
                </div>
              `}
              <div style="position: absolute; bottom: 6px; right: 6px; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 6.8pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">Orientation : ${sim.orientationLabel || 'Sud'}</div>
            </div>
          </div>
        ` : isStruct ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; ${sim.buildings && sim.buildings.length > 1 ? 'height: 310px;' : 'height: 290px;'}">
            <!-- 4a. VISUEL(S) 3D DU/DES BÂTIMENT(S) -->
            ${sim.buildings && sim.buildings.length > 1 ? `
              <div style="display: grid; grid-template-rows: 1fr 1fr; gap: 6px; height: 100%;">
                ${sim.buildings.slice(0, 2).map((b, bIdx) => `
                  <div style="border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; position: relative; height: 100%;">
                    <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 6px; border-bottom-right-radius: 4px; font-size: 6.5pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">Vue 3D — ${b.name || `Bâtiment ${bIdx + 1}`} (${Number(b.length || 30).toFixed(1)}m × ${Number(b.width || 20).toFixed(1)}m)</div>
                    ${(b.screenshot3d || sim.building3dScreenshot) ? `
                      <img src="${b.screenshot3d || sim.building3dScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue 3D ${b.name || `Bâtiment ${bIdx + 1}`}" />
                    ` : `
                      <div style="color: #64748b; font-size: 7.5pt; text-align: center; margin: auto; padding: 6px;">
                        <strong style="color: #0f172a; display: block;">${b.name || `Bâtiment ${bIdx + 1}`}</strong>
                        ${Number(b.length || 30).toFixed(1)}m × ${Number(b.width || 20).toFixed(1)}m (${Math.round((b.length || 30) * (b.width || 20))} m²)
                      </div>
                    `}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; position: relative; height: 100%;">
                <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">Vue 3D — Bâtiment ${sim.length ? Number(sim.length).toFixed(1) : '30.0'}m × ${sim.width ? Number(sim.width).toFixed(1) : '20.0'}m</div>
                ${sim.building3dScreenshot ? `
                  <img src="${sim.building3dScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue 3D du Bâtiment" />
                ` : `
                  <div style="color: #64748b; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                    <strong style="color: #0f172a; display: block; margin-bottom: 3px;">Hangar Solaire 3D</strong>
                    ${sim.length ? Number(sim.length).toFixed(1) : '30'}m × ${sim.width ? Number(sim.width).toFixed(1) : '20'}m (${sim.floorArea || Math.round((sim.length || 30) * (sim.width || 20))} m²)
                  </div>
                `}
              </div>
            `}

            <!-- 4b. IMPLANTATION SATELLITE SUR LE TERRAIN -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; position: relative; height: 100%;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">Implantation Satellite sur la Parcelle</div>
              ${finalMapScreenshot ? `
                <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite du site" />
              ` : `
                <div style="color: #94a3b8; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                  <strong style="color: #ffffff;">Repérage Satellite</strong>
                  <div style="font-size: 7.5pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
                </div>
              `}
              <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-top-left-radius: 6px; font-size: 7pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">Surface : ${sim.floorArea || Math.round((sim.length || 30) * (sim.width || 20))} m²</div>
            </div>
          </div>
        ` : isIrve ? `
          <!-- 4. VISUELS IRVE : PHOTO DE LA BORNE (GAUCHE) + IMPLANTATION SATELLITE (DROITE) -->
          <div style="display: grid; grid-template-columns: 1fr 1.35fr; gap: 8px; margin-bottom: 10px; height: 330px;">
            <!-- 4a. VISUEL PHOTO DE LA BORNE DE RECHARGE -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; position: relative; height: 100%;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 6px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">${borneTitle}</div>
              <img src="${bornePhoto}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Borne de recharge" />
              <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 6px; border-top-left-radius: 6px; font-size: 7pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">${sim.quantity || 1} unité(s) installée(s)</div>
            </div>

            <!-- 4b. IMPLANTATION SATELLITE SUR LE PARKING -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; position: relative; height: 100%;">
              <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 6px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">Implantation Satellite sur le Parking</div>
              ${finalMapScreenshot ? `
                <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite du parking" />
              ` : `
                <div style="color: #94a3b8; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                  <strong style="color: #ffffff;">Repérage Satellite</strong>
                  <div style="font-size: 7.5pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
                </div>
              `}
              <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 6px; border-top-left-radius: 6px; font-size: 7pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">${sim.quantity || 1} borne(s) (${irvePower} kW)</div>
            </div>
          </div>
        ` : `
          <!-- 4. VISUEL DUAL AVANT / APRÈS (TOITURE & AUTOCONSO) OU UNIQUE (AUTRES) -->
          <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: 10px; position: relative; height: 195px; display: flex; align-items: center; justify-content: center;">
            ${finalMapScreenshot ? `
              <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Implantation Visuelle du Projet" />
            ` : `
              <div style="color: #94a3b8; font-size: 9pt; text-align: center; padding: 15px;">
                <strong style="color: #ffffff; display: block; font-size: 11pt; margin-bottom: 4px;">Plan d'Implantation Solaire</strong>
                <div style="font-size: 8pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
              </div>
            `}
            <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-top-left-radius: 6px; font-size: 7.5pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">Surface : ${sim.roofSurface || sim.floorArea || 83} m²</div>
          </div>
        `}

        <!-- 5. GRAPHIQUE FINANCIER D'AMORTISSEMENT -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; margin-bottom: 8px;">
          <div style="font-size: 8pt; font-weight: 800; color: #00429d; text-transform: uppercase; margin-bottom: 2px;">
            ${isSechoir ? 'Projection Financière des Gains Cumulés (25 ans)' : 'Projection Financière des Gains Cumulés (30 ans)'}
          </div>
          <div style="height: ${isStruct && sim.buildings && sim.buildings.length > 1 ? '195px' : '225px'}; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${financialChartImg}" style="width: 100%; height: 100%; object-fit: contain;" alt="Graphique Amortissement" />
          </div>

          <!-- 3 CARTES DE CUMULS VERTICALEMENT CENTRÉES (10, 20, 30 ANS) -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px; text-align: center;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; height: 38px; min-height: 38px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <span style="font-size: 6pt; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">sur 10 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #0f172a; line-height: 1;">+${dispCumul10.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; height: 38px; min-height: 38px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <span style="font-size: 6pt; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">sur 20 ans</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #0f172a; line-height: 1;">+${dispCumul20.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; height: 38px; min-height: 38px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <span style="font-size: 6pt; color: #166534; font-weight: bold; text-transform: uppercase; line-height: 1; margin-bottom: 2px;">${isSechoir ? 'sur 20 ans (net)' : 'sur 30 ans'}</span>
              <div style="font-size: 9.5pt; font-weight: 900; color: #16a34a; line-height: 1;">+${(isSechoir ? dispCumul20 : dispCumul30).toLocaleString('fr-FR')} €</div>
            </div>
          </div>
        </div>

        <!-- 6. ZONE VOTRE IMPACT SUR L'ENVIRONNEMENT VERTICALEMENT CENTRÉE -->
        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 9px 12px; margin-bottom: 4px;">
          <div style="font-size: 8pt; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 5px;">
            🌱 Votre Impact sur l'Environnement
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; height: 44px; min-height: 44px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <div style="font-size: 10pt; font-weight: 900; color: #16a34a; line-height: 1; margin-bottom: 2px;">${co2Avoided} tonnes</div>
              <div style="font-size: 6.5pt; color: #64748b; line-height: 1;">de CO₂ évitées par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; height: 44px; min-height: 44px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <div style="font-size: 10pt; font-weight: 900; color: #16a34a; line-height: 1; margin-bottom: 2px;">${treesPlanted}</div>
              <div style="font-size: 6.5pt; color: #64748b; line-height: 1;">arbres plantés par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; height: 44px; min-height: 44px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <div style="font-size: 10pt; font-weight: 900; color: #0d9488; line-height: 1; margin-bottom: 2px;">${householdsFed}</div>
              <div style="font-size: 6.5pt; color: #64748b; line-height: 1;">foyer(s) alimenté(s) en électricité</div>
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
    const imgProps = pdf.getImageProperties(imgData);
    
    // Calculer la hauteur réelle de l'image en mm proportionnellement à la largeur A4
    const imgHeightMm = (imgProps.height * pdfWidth) / imgProps.width;

    if (imgHeightMm <= pdfHeight + 2) {
      // Le contenu tient sur une seule page
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page : découper l'image en tranches de hauteur pdfHeight
      const totalPages = Math.ceil(imgHeightMm / pdfHeight);
      const srcSliceHeight = imgProps.height / totalPages;
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        
        // Créer un canvas temporaire pour chaque tranche
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgProps.width;
        sliceCanvas.height = Math.ceil(srcSliceHeight);
        const sliceCtx = sliceCanvas.getContext('2d');
        
        // Remplir le fond blanc
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        
        // Dessiner la tranche depuis le canvas source
        const srcImg = new Image();
        srcImg.src = imgData;
        await new Promise(r => { srcImg.onload = r; if (srcImg.complete) r(); });
        
        sliceCtx.drawImage(
          srcImg,
          0, Math.floor(page * srcSliceHeight),  // sx, sy
          imgProps.width, Math.ceil(srcSliceHeight),  // sWidth, sHeight
          0, 0,  // dx, dy
          sliceCanvas.width, sliceCanvas.height  // dWidth, dHeight
        );
        
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(sliceData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
    }

    const safeTitle = (sim.title || 'Offre_Commerciale_NELSON').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Erreur export PDF Commercial Offer:', err);
  } finally {
    document.body.removeChild(container);
  }
};
