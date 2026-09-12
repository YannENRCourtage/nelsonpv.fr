import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSatelliteSnapshot, generateBeforeAfterDualSnapshot } from '@/utils/satelliteSnapshot';
import { calculateAllFinancingScenarios } from '@/services/solarFinancingEngine';
import { drawSechoirChargesChart } from '@/components/simulator/sechoir/SechoirPDFGenerator.jsx';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64';

const BORNE_7_4KW_IMG = '/images/borne_irve_7_4kw.jpg';
const BORNE_DOUBLE_IMG = '/images/borne_irve_double.jpg';

// ─── Helper Réglementaire Loi APER (Art. 40) pour Ombrières de Parking ────────
export function getLoiAperNotice(parkingArea) {
  const area = Number(parkingArea) || 0;
  if (area < 1500) {
    return {
      status: 'volontaire',
      badge: 'PROJET VOLONTAIRE',
      badgeBg: '#10b981',
      badgeColor: '#ffffff',
      border: '#bbf7d0',
      bg: '#f0fdf4',
      titleColor: '#166534',
      textColor: '#15803d',
      icon: '🛡️',
      title: 'Cadre Réglementaire Loi APER',
      text: "Projet d'ombrières volontaire : le parking étudié est sous le seuil d'assujettissement de 1 500 m² (aucune contrainte ni sanction réglementaire APER obligatoire).<br/>Valorisation foncière et confort usagers immédiats."
    };
  } else if (area < 10000) {
    return {
      status: 'obligation_2028',
      badge: 'CONFORMITÉ LOI APER 2028',
      badgeBg: '#d97706',
      badgeColor: '#ffffff',
      border: '#fde68a',
      bg: '#fffbeb',
      titleColor: '#92400e',
      textColor: '#92400e',
      icon: '⚖️',
      title: 'Conformité Loi APER (Art. 40)',
      text: "Obligation légale pour ce parking (1 500 à 10 000 m²) : équiper au minimum 50 % de la superficie en ombrières photovoltaïques d'ici le 1er juillet 2028.<br/>Sanctions encourues en cas de non-respect : pénalité administrative et financière annuelle pouvant atteindre jusqu'à 20 000 € par an jusqu'à régularisation effective."
    };
  } else {
    return {
      status: 'urgence_2026',
      badge: 'URGENCE LÉGALE APER (≥ 10 000 m²)',
      badgeBg: '#dc2626',
      badgeColor: '#ffffff',
      border: '#fecaca',
      bg: '#fef2f2',
      titleColor: '#991b1b',
      textColor: '#991b1b',
      icon: '⚠️',
      title: 'Obligation d\'Urgence Loi APER (Art. 40)',
      text: "Obligation légale prioritaire pour ce parking (≥ 10 000 m²) : obligation d'équiper au minimum 50 % de la superficie en ombrières d'ici le 1er juillet 2026 (ou 2028 selon type de gestion).<br/>Sanctions encourues en cas de non-respect : pénalité administrative et financière annuelle pouvant atteindre jusqu'à 40 000 € par an jusqu'à régularisation effective."
    };
  }
}

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

export const generateCommercialOfferPDF = async ({ simulation, selectedProject, customClientName = null, returnBlob = false }) => {
  if (!simulation) return null;

  const sim = simulation;
  const isAuto = sim.type === 'autoconsommation' || sim.projectType === 'solar';
  const isToiture = sim.type === 'toiture_pv';
  const isOmbriere = Boolean(
    sim.type === 'ombriere_parking' ||
    sim.projectType === 'ombriere_parking' ||
    sim.type === 'ombriere' ||
    sim.type === 'ombrieres' ||
    sim.isOmbriere ||
    (typeof sim.buildingType === 'string' && sim.buildingType.startsWith('ombriere')) ||
    (Array.isArray(sim.buildings) && sim.buildings.some(b => typeof b?.buildingType === 'string' && b.buildingType.startsWith('ombriere'))) ||
    (typeof sim.modelId === 'string' && sim.modelId.startsWith('ombriere')) ||
    (typeof sim.title === 'string' && (sim.title.toLowerCase().includes('ombrière') || sim.title.toLowerCase().includes('ombriere'))) ||
    (typeof sim.clientName === 'string' && (sim.clientName.toLowerCase().includes('ombrière') || sim.clientName.toLowerCase().includes('ombriere'))) ||
    [15.8, 20.2, 24.6, 6.9, 9.1, 11.3].includes(Math.round(Number(sim.width || 0) * 10) / 10) ||
    (Array.isArray(sim.buildings) && sim.buildings.some(b => [15.8, 20.2, 24.6, 6.9, 9.1, 11.3].includes(Math.round(Number(b?.width || 0) * 10) / 10)))
  );
  const isStruct = (sim.type === 'structure_metallique' || sim.type === 'structure') && !isOmbriere;
  const isSechoir = sim.type === 'sechoir_batitech' || sim.type === 'sechoir';
  const isIrve = sim.type === 'irve' || sim.projectType === 'irve';

  // Titre propre sans "(Revente Totale / Loyer)"
  const typeTitle = isAuto ? 'Autoconsommation Photovoltaïque'
    : isToiture ? 'Toiture Photovoltaïque'
    : isOmbriere ? 'Ombrière de Parking Photovoltaïque'
    : isStruct ? 'Structure Métallique & Hangar Solaire'
    : isSechoir ? 'Séchoir Multi-Matières <span style="color: #F29400;">BatiTech®</span>'
    : 'Infrastructure de Recharge Véhicules Électriques (IRVE)';

  const clientName = customClientName || sim.clientName || selectedProject?.name || selectedProject?.lastName || sim.cityName || 'Client NELSON';
  const clientAddress = sim.address || selectedProject?.address || (sim.cityName ? `${sim.cityName} (${sim.departmentCode || 'France'})` : 'Adresse du site');

  // Détection du choix utilisateur pour le visuel de gauche (Vue 3D ou Vue Avant par défaut)
  const wants3D = sim.visualChoice === '3d_and_after' || sim.leftVisualChoice === '3d' || sim.pdfVisualChoice === '3d_and_after';

  // Vue satellite ou Visuel Avant / Après (Côte à côte pour Toiture, Ombrière et Structure)
  let finalMapScreenshot = sim.mapScreenshotDataUrl || sim.beforeAfterSnapshot || null;
  let singleMapScreenshot = sim.singleMapScreenshot || sim.mapScreenshot || null;

  // Si l'utilisateur a choisi la vue Avant / Après (par défaut), on génère la vue duale Avant/Après
  if (!wants3D && !finalMapScreenshot && (isAuto || isToiture || isOmbriere || isStruct)) {
    try {
      finalMapScreenshot = await generateBeforeAfterDualSnapshot({
        center: sim.mapCenter || [43.6047, 1.4442],
        polygonPoints: sim.polygonPoints || [],
        polygonStyle: isOmbriere ? 'parking' : 'roof',
        ombriereBlocks: sim.placedOmbrieres || sim.ombriereBlocks || null,
        buildings: (sim.buildings && sim.buildings.length > 0) ? sim.buildings : (sim.length ? [{ length: sim.length, width: sim.width, rotation: sim.rotation }] : null),
        customKwc: sim.kwc || sim.installedKwc || sim.power || 100,
        roofSurface: sim.roofSurface || sim.floorArea || sim.parkingArea || 83,
        parkingArea: sim.parkingArea || sim.floorArea || null,
        spotsCount: sim.spotsCount || null,
        ridgeIndex: sim.ridgeIndex || 0,
        isLandscape: sim.isLandscape ?? false,
        width: 950,
        height: (isOmbriere || isStruct) ? 480 : isToiture ? 520 : 480,
        zoom: 19
      });
    } catch (e) {
      console.warn('Génération dual snapshot avant-après:', e);
    }
  }

  // Si la vue 3D + Satellite simple est nécessaire
  if (!singleMapScreenshot) {
    try {
      const bLen = isSechoir
        ? Number(sim.length || (sim.modelId === 'BT-8.3.15' ? 48 : sim.modelId === 'BT-6.2.15' ? 36 : 18))
        : Number(sim.length || 30);
      const bWid = Number(sim.width || 20);
      const bRot = Number(sim.rotation !== undefined ? sim.rotation : 0);

      singleMapScreenshot = sim.mapScreenshot || await generateSatelliteSnapshot({
        center: sim.mapCenter || [43.6047, 1.4442],
        polygonPoints: sim.polygonPoints || [],
        polygonStyle: isOmbriere ? 'parking' : 'roof',
        ombriereBlocks: sim.placedOmbrieres || sim.ombriereBlocks || null,
        buildings: (sim.buildings && sim.buildings.length > 0)
          ? sim.buildings.map(b => ({
              ...b,
              length: Number(b.length || bLen),
              width: Number(b.width || bWid),
              rotation: Number(b.rotation !== undefined ? b.rotation : bRot)
            }))
          : [{ length: bLen, width: bWid, rotation: bRot, name: `Bâtiment 1` }],
        building: { length: bLen, width: bWid, rotation: bRot },
        width: 850,
        height: 480,
        zoom: 19
      });
    } catch (e) {
      console.warn('Génération satellite simple de secours:', e);
    }
  }

  if (!finalMapScreenshot) {
    finalMapScreenshot = singleMapScreenshot;
  }

  const img3D = sim.building3dScreenshot || sim.screenshot3d || (isOmbriere ? '/ombriere_vl_double.jpg' : null);

  // Graphique financier 30 ans (compacté pour ombrière et structure pour tenir sur 1 page A4)
  const financialChartImg = generateFinancialChartImage({
    sim,
    width: 800,
    height: (isOmbriere || isStruct) ? 280 : isToiture ? 360 : 374
  });

  // Calculs financiers pour les 3 cartes de cumuls 10 / 20 / 30 ans
  const totalInv = sim.totalInvestmentHT || sim.capexHT || sim.resteACharge || 10800;
  const annualGain = isSechoir ? (sim.gainNetAnnuel || sim.deltaEBE || 13833) : (sim.annualBenefitYear1 || sim.annualRevenueReventeTotale || sim.annualRevenue || 1528);
  const inflation = isSechoir ? 0.02 : 0.035;

  // Calcul consolidé des scénarios de financement
  const powerKwc = Number(sim.installedKwc || sim.power || sim.kwc || 100);
  const capexHT = Number(sim.totalInvestmentHT || sim.capexHT || Math.round(powerKwc * 920));
  const annualRev = Number(sim.annualRevenueReventeTotale || sim.annualBenefitYear1 || sim.annualRevenue || Math.round(powerKwc * 1100 * 0.085));

  const financing = sim.financing || calculateAllFinancingScenarios({
    capexHT,
    powerKwc,
    annualRevenue: annualRev,
    rentMultiplier: 14,
    bankDurationYears: 20,
    leasingDurationYears: 20
  });

  // Cadre réglementaire Loi APER pour ombrières de parking
  const baseOmbriereArea = Number(sim.parkingArea || sim.coveredArea || sim.roofSurface || sim.floorArea || (sim.length && sim.width ? sim.length * sim.width : 0) || 0);
  const parkingArea = Number(sim.parkingArea) || (isOmbriere ? Math.max(1500, Math.round(baseOmbriereArea * 2)) : baseOmbriereArea);
  const aperNotice = getLoiAperNotice(parkingArea);

  // Financement valorisé : Crédit Bancaire & Abonnement Solaire
  const bankAnnualNet = Number(
    financing?.bankLoan?.annualNetCashflow ??
    financing?.bankLoan?.annualNetCashFlow ??
    (annualRev - (financing?.bankLoan?.annualPaymentExact || 0))
  );
  const bankCumul20 = bankAnnualNet * 20;
  const bankCumul30 = (bankAnnualNet * 20) + (annualRev * 10);

  const selectedLeasing = financing?.selectedLeasing || financing?.leasing?.durations?.[2] || {};
  const leasingMonthly = Number(selectedLeasing.monthlyPaymentHT || 0);
  const leasingCoverage = Number(selectedLeasing.coveragePercent || 75);
  const leasingNetPostIS = Number(selectedLeasing.annualNetCashflowPostIS || 0);
  const leasingEffortMonthly = Math.round(Math.abs(leasingNetPostIS) / 12);
  const leasingGains30 = Number(
    selectedLeasing.totalNetGains30Years ||
    ((selectedLeasing.postBuyoutGains || (annualRev * 10)) + (leasingNetPostIS * 20)) ||
    0
  );

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

  // Format A4 Portrait strict (210mm x 297mm)
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.height = '297mm';
  container.style.maxHeight = '297mm';
  container.style.minHeight = '297mm';
  container.style.padding = '6.5mm 10.5mm';
  container.style.background = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'hidden';

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
    let result = '';
    if (simObj?.roofType === 'terrasse' || simObj?.isTerrasse || simObj?.pitch === 0) {
      result = simObj?.orientationLabel || 'Toiture terrasse (Toit plat 0°) • Pose sur bacs lestés';
    } else if (simObj?.orientationLabel && simObj.orientationLabel.includes('• Pente')) {
      result = simObj.orientationLabel;
    } else {
      let ori = '';
      if (simObj?.roofType === 'symetrique' && simObj?.pan1 && simObj?.pan2) {
        ori = `Symétrique : ${simObj.pan1.rawLabel || simObj.pan1.label || 'Sud'} (${simObj.pan1.angle}°) / ${simObj.pan2.rawLabel || simObj.pan2.label || 'Nord'} (${simObj.pan2.angle}°)`;
      } else if (simObj?.orientationLabel) {
        ori = simObj.orientationLabel
          .replace(/\(2 pans\)/gi, '')
          .replace(/\(1 pan\)/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
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

      // Détermination de l'inclinaison de la toiture
      const tiltVal = Number(
        simObj?.tilt !== undefined ? simObj.tilt :
        simObj?.roofPitch !== undefined ? simObj.roofPitch :
        simObj?.pitch !== undefined ? simObj.pitch :
        simObj?.slope !== undefined ? simObj.slope :
        (simObj?.buildings && simObj.buildings[0] && (simObj.buildings[0].tilt || simObj.buildings[0].roofPitch || simObj.buildings[0].pitch)) ||
        30
      );

      result = `${ori} • Pente ${Math.round(tiltVal)}°`;
    }

    // Retirer systématiquement toute indication de pondération de surface (ex: "(70%)", "(30%)")
    return result.replace(/\s*\(\d+%\)/g, '').replace(/\s+/g, ' ').trim();
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
  } else if (isOmbriere) {
    // Cadre Ombrière de Parking Solaire avec emprise et places
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 5px 10px; margin-top: 4px; margin-bottom: 6px;">
        <div style="font-size: 7.5pt; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 3px;">
          Hypothèses Techniques — Ombrières de Parking Solaire
        </div>
        <table style="width: 100%; font-size: 7pt; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Typologie :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0f172a;">${sim.typology?.label || 'Ombrière VL double'}</td>
            <td style="padding: 2px 0 2px 12px; color: #64748b;">Puissance installée :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #00429d;">${calculatedPower}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 2px 0; color: #64748b;">Emprise parking nette :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">
              ${sim.parkingArea || 0} m² (${sim.spotsCount || 0} places abritées)
              ${sim.buildingArea ? `<br/><span style="font-size: 6.2pt; color: #64748b; font-weight: normal;">(hors bâti : ${sim.buildingArea} m²)</span>` : ''}
            </td>
            <td style="padding: 2px 0 2px 12px; color: #64748b;">Surface couverte ombrières :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #16a34a;">${sim.coveredArea || sim.roofSurface || 0} m² (${sim.coverageRatio || 0}%)</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; color: #64748b;">Productible attendu :</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0284c7;">${sim.annualProductionKwh ? `${Number(sim.annualProductionKwh).toLocaleString('fr-FR')} kWh / an` : '-'}</td>
            <td style="padding: 2px 0 2px 12px; color: #64748b;">${sim.economicModel === 'autoconsommation' || sim.economicModel === 'autoconsommation_stockage' ? 'Mode de valorisation :' : 'Tarif achat EDF OA :'}</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #16a34a;">${sim.economicModel === 'autoconsommation_stockage' ? 'Autoconso 100% + Stockage' : sim.economicModel === 'autoconsommation' ? 'Autoconso + Vente Surplus' : `${sim.tarifEdfOaKwh || '0.085'} € / kWh (Revente 100%)`}</td>
          </tr>
        </table>
      </div>
    `;
  } else if (isToiture || isStruct) {
    // Cadre Toiture / Structure à 2 lignes strictes avec colonnes totalement dissociées
    technicalHypothesesHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: ${isToiture ? '6px 12px 5px 12px' : '6px 12px 5px 12px'}; margin-top: ${isToiture ? '6px' : '8px'}; margin-bottom: ${isToiture ? '6px' : '8px'}; box-sizing: border-box;">
        <div style="font-size: ${isToiture ? '8pt' : '7.5pt'}; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 2.5px;">
          Hypothèses Techniques de Dimensionnement
        </div>
        
        <!-- Ligne 1 : Adresse du site (élargie 72%) & Puissance installée (réduite 28%) -->
        <table style="width: 100%; font-size: ${isToiture ? '7.6pt' : '7.2pt'}; border-collapse: collapse; table-layout: fixed; border-bottom: 1px solid #e2e8f0;">
          <colgroup>
            <col style="width: 72%;">
            <col style="width: 28%;">
          </colgroup>
          <tr>
            <td style="padding: 2.5px 8px 2.5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span style="color: #64748b;">Adresse du site : </span>
              <strong style="color: #0f172a;">${clientAddress}</strong>
            </td>
            <td style="padding: 2.5px 0; text-align: right; white-space: nowrap;">
              <span style="color: #64748b;">Puissance installée : </span>
              <strong style="color: #00429d;">${calculatedPower}</strong>
            </td>
          </tr>
        </table>

        <!-- Ligne 2 : Production estimée (réduite 32%) & Orientation / Pente (élargie 68%) -->
        <table style="width: 100%; font-size: ${isToiture ? '7.6pt' : '7.2pt'}; border-collapse: collapse; table-layout: fixed;">
          <colgroup>
            <col style="width: 32%;">
            <col style="width: 68%;">
          </colgroup>
          <tr>
            <td style="padding: 2.5px 8px 2.5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span style="color: #64748b;">Production estimée : </span>
              <strong style="color: #0284c7;">${sim.annualProductionKwh ? `${Number(sim.annualProductionKwh).toLocaleString('fr-FR')} kWh / an` : '7 125 kWh / an'}</strong>
            </td>
            <td style="padding: 2.5px 0; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span style="color: #64748b;">Orientation / Pente : </span>
              <strong style="color: #0f172a;">${resolveOrientationName(sim)}</strong>
            </td>
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

  // Helper pour éviter le doublon "ans" dans l'amortissement
  const formatPaybackDisplay = (val) => {
    if (val === null || val === undefined || val === '') return '8 ans';
    const str = String(val).trim();
    if (str.toLowerCase().endsWith('ans')) return str;
    return `${str} ans`;
  };

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; max-height: 284mm; min-height: 284mm; justify-content: space-between; box-sizing: border-box;">
      
      <div>
        <!-- 1. EN-TÊTE PROFESSIONNEL -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #00429d; padding-bottom: 5px; margin-bottom: 7px;">
          <div>
            <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR COURTAGE" style="height: 28px; width: auto; object-fit: contain; margin-bottom: 2px; display: block;" />
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
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: ${isToiture ? '8px' : '12px'};">
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: ${isToiture ? '8px 6px' : '6px'}; text-align: center;">
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; font-weight: bold; color: #64748b; text-transform: uppercase;">Puissance</div>
            <div style="font-size: ${isToiture ? '14pt' : '13pt'}; font-weight: 900; color: #00429d; margin: 1px 0;">${calculatedPower}</div>
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; color: #64748b;">${isSechoir ? `${sim.nbModules || 90} panneaux Cogen'Air` : (sim.roofSurface ? `${sim.roofSurface} m² ${(isOmbriere || isStruct || sim.type === 'ombriere_parking') ? 'surface au sol' : 'toiture'}` : sim.quantity ? `${sim.quantity} borne(s)` : '')}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: ${isToiture ? '8px 6px' : '6px'}; text-align: center;">
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; font-weight: bold; color: #64748b; text-transform: uppercase;">${isSechoir ? 'Valorisation Matière' : isIrve ? 'Revenus Annuels' : 'Production Annuelle'}</div>
            <div style="font-size: ${isToiture ? '14pt' : '13pt'}; font-weight: 900; color: ${isSechoir ? '#16a34a' : '#0284c7'}; margin: 1px 0;">${isSechoir ? `+${(sim.deltaProduits || 25720).toLocaleString('fr-FR')} €` : isIrve ? `${(sim.annualRevenue || 0).toLocaleString('fr-FR')} €` : (sim.annualProductionKwh ? `${Number(sim.annualProductionKwh).toLocaleString('fr-FR')} kWh` : '-')}</div>
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; color: #64748b;">${isSechoir ? 'Gains séchage + économies' : isIrve ? 'Recettes estimées' : `Région ${sim.departmentCode || '33'}`}</div>
          </div>

          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: ${isToiture ? '8px 6px' : '6px'}; text-align: center;">
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; font-weight: bold; color: #166534; text-transform: uppercase;">${isSechoir ? 'Prime CEE (AGRI-EQ-110)' : isIrve ? 'Investissement net' : 'Gains / an (An 1)'}</div>
            <div style="font-size: ${isToiture ? '14pt' : '13pt'}; font-weight: 900; color: #16a34a; margin: 1px 0;">${isSechoir ? `-${(sim.primeCEE || 38790).toLocaleString('fr-FR')} €` : isIrve ? `${(sim.totalInvestmentHT || sim.resteACharge || 3960).toLocaleString('fr-FR')} € HT` : annualGainFormatted}</div>
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; color: #166534;">${isSechoir ? 'Cogen\'Air® Certifiée' : isIrve ? `Coût ${sim.quantity || 1} borne(s)` : sim.economicModel === 'autoconsommation_stockage' ? '100% Autoconso + Stockage' : (sim.economicModel === 'vente_totale' || (isOmbriere && sim.economicModel !== 'autoconsommation')) ? `100% Vente Totale (${sim.tarifEdfOaKwh || '0.085'} €/kWh)` : isStruct ? edfOaTarifLabel : isToiture ? (sim.economicModel === 'autoconsommation' ? `${Math.round(sim.annualSavingsAutoconso || ((sim.annualBenefitYear1 || 1462) * 0.88)).toLocaleString('fr-FR')} € écon. + ${Math.round(sim.annualRevenueSurplus || ((sim.annualBenefitYear1 || 1462) * 0.12)).toLocaleString('fr-FR')} € surplus` : `Tarif EDF OA : ${sim.tarifEdfOaKwh || '0.085'} €/kWh`) : `${Math.round(sim.annualSavingsAutoconso || ((sim.annualBenefitYear1 || 1462) * 0.88)).toLocaleString('fr-FR')} € écon. + ${Math.round(sim.annualRevenueSurplus || ((sim.annualBenefitYear1 || 1462) * 0.12)).toLocaleString('fr-FR')} € surplus`}</div>
          </div>

          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 8px; padding: ${isToiture ? '8px 6px' : '6px'}; text-align: center;">
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Amortissement</div>
            <div style="font-size: ${isToiture ? '14pt' : '13pt'}; font-weight: 900; color: #9333ea; margin: 1px 0;">${isSechoir ? ((sim.paybackYear || sim.roi) ? `${Number(sim.paybackYear || sim.roi).toFixed(2)} ans` : 'N/A') : formatPaybackDisplay(sim.paybackYear || 8)}</div>
            <div style="font-size: ${isToiture ? '7pt' : '6.5pt'}; color: #6b21a8;">${isSechoir ? `Invest. : ${(sim.investissementNet || sim.totalInvestmentHT || 327053).toLocaleString('fr-FR')} € HT` : isIrve ? `Soit ${sim.paybackMonths || Math.round((Number(sim.paybackYear) || 0.4) * 12)} mois` : `Invest. : ${sim.totalInvestmentHT ? Number(sim.totalInvestmentHT).toLocaleString('fr-FR') : sim.resteACharge ? Number(sim.resteACharge).toLocaleString('fr-FR') : '-'} € HT`}</div>
          </div>
        </div>

        <!-- 4. VISUELS : VUE 3D CONFIGURATEUR ET/OU PLAN SATELLITE (+10% HAUTEUR) -->
        ${isSechoir ? `
          <!-- 4. VISUELS SÉCHOIR BATITECH : PLAN FINANCEMENT (GAUCHE) + CARTE SATELLITE (DROITE) -->
          <div style="display: grid; grid-template-columns: 1fr 1.25fr; gap: 8px; margin-bottom: 10px; height: 310px;">
            <!-- 4a. TABLEAU PLAN DE FINANCEMENT & COMPTE DE RÉSULTAT -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; padding: 4px 6px; display: flex; flex-direction: column; justify-content: space-between; font-size: 6.5pt; height: 100%; box-sizing: border-box;">
              <div style="font-size: 7.2pt; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 0px; text-transform: uppercase;">
                Plan de Financement &amp; Rentabilité
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 6pt; margin: 1px 0;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.2px 0; color: #64748b;">Investissement Brut Séchoir :</td><td style="text-align: right; font-weight: bold;">${(sim.totalInvestmentHT || 327053).toLocaleString('fr-FR')} € HT</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 1.2px 0; color: #16a34a;">Prime CEE Cogen'Air (AGRI-EQ-110) :</td><td style="text-align: right; font-weight: bold; color: #16a34a;">-${(sim.primeCEE || 38790).toLocaleString('fr-FR')} €</td></tr>
                <tr style="border-bottom: 1px solid #cbd5e1; background: #fffbeb;"><td style="padding: 1px 0; font-weight: bold; color: #b45309;">Investissement Net à Financer :</td><td style="text-align: right; font-weight: 900; color: #b45309;">${(sim.investissementNet !== undefined ? sim.investissementNet : (sim.totalInvestmentHT ? Math.max(0, sim.totalInvestmentHT - (sim.primeCEE || 0)) : 288263)).toLocaleString('fr-FR')} € HT</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 0.8px 0; color: #64748b;">Montant de l'emprunt (25 ans) :</td><td style="text-align: right; font-weight: bold;">${(sim.emprunt !== undefined ? sim.emprunt : (sim.investissementNet || 288263)).toLocaleString('fr-FR')} €</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 0.8px 0; color: #dc2626;">Montant moyen de l'annuité :</td><td style="text-align: right; font-weight: bold; color: #dc2626;">-${(sim.annuite || 0).toLocaleString('fr-FR')} €/an</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 0.8px 0; color: #16a34a;">Impact annuel sur l'EBE :</td><td style="text-align: right; font-weight: bold; color: ${(sim.deltaEBE || 0) >= 0 ? '#16a34a' : '#dc2626'};">${(sim.deltaEBE || 0) >= 0 ? '+' : ''}${(sim.deltaEBE || 0).toLocaleString('fr-FR')} €/an</td></tr>
                <tr><td colspan="2" style="height: 3px; font-size: 1px; line-height: 1px; padding: 0;">&nbsp;</td></tr>
                <tr style="background: ${(sim.gainNetAnnuel || 0) >= 0 ? '#f0fdf4' : '#fef2f2'}; border-top: 1px solid ${(sim.gainNetAnnuel || 0) >= 0 ? '#bbf7d0' : '#fecaca'}; border-bottom: 1px solid ${(sim.gainNetAnnuel || 0) >= 0 ? '#86efac' : '#fca5a5'};"><td style="padding: 1.5px 2px; font-weight: 900; color: ${(sim.gainNetAnnuel || 0) >= 0 ? '#166534' : '#991b1b'};">Gain Net Annuel d'Exploitation :</td><td style="padding: 1.5px 2px; text-align: right; font-weight: 900; color: ${(sim.gainNetAnnuel || 0) >= 0 ? '#166534' : '#dc2626'}; font-size: 6.8pt;">${(sim.gainNetAnnuel || 0) >= 0 ? '+' : ''}${(sim.gainNetAnnuel || 0).toLocaleString('fr-FR')} €/an</td></tr>
              </table>

              <!-- Encart Subventions Régionales & Aides Éligibles -->
              <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 6px; padding: 4px 6px; margin: 2.5px 0; font-size: 5.8pt; line-height: 1.3; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fef08a; padding-bottom: 1.5px; margin-bottom: 2px;">
                  <span style="font-weight: 800; color: #92400e; text-transform: uppercase; font-size: 6.2pt; white-space: nowrap;">
                    🏛️ Subventions régionales &amp; aides éligibles
                  </span>
                  ${sim.subventionRegionaleMontant ? `
                    <span style="background: #dcfce7; color: #166534; font-weight: bold; font-size: 5.5pt; padding: 1px 4px; border-radius: 4px;">
                      Jusqu'à ${sim.subventionRegionaleMontant.toLocaleString('fr-FR')} €
                    </span>
                  ` : ''}
                </div>
                <div style="color: #78350f;">
                  <div style="display: flex; justify-content: space-between; font-size: 5.6pt;">
                    <span><strong>${sim.subventionRegionaleNom || 'PCAE / PME - ' + (sim.regionName || 'Nouvelle-Aquitaine')}</strong> :</span>
                    <span style="color: #92400e; font-weight: bold;">Taux ${sim.subventionTauxTexte || '30% (+10% JA)'}</span>
                  </div>
                  <div style="color: #475569; font-size: 5.2pt; font-style: italic;">
                    ${sim.subventionDescription || 'Plan de Modernisation des Exploitations.'} &bull; Assiette ${(sim.investissementNet || 288263).toLocaleString('fr-FR')} € HT
                  </div>
                  <div style="color: #854d0e; font-size: 5.2pt; margin-top: 1px;">
                    &bull; <strong>Fonds Chaleur ADEME</strong> : Éligible valorisation chaleur solaire Cogen'Air®
                  </div>
                  ${sim.roiBonifie !== undefined && sim.roiBonifie !== null ? `
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 1.5px 4px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center; color: #065f46; font-size: 5.5pt; font-weight: bold;">
                      <span>✅ ROI bonifié avec aide :</span>
                      <span>~${Number(sim.roiBonifie).toFixed(2)} ans <span style="font-size: 5pt; color: #64748b; font-weight: normal;">(vs ${Number(sim.roi || 8.12).toFixed(2)} ans)</span></span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; border-top: 1px solid #e2e8f0; padding-top: 2px; text-align: center;">
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; height: 30px; min-height: 30px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
                  <span style="font-size: 5.2pt; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 1px;">VAN (20 ans)</span>
                  <div style="font-size: 7.5pt; font-weight: 900; color: ${(sim.van || 0) >= 0 ? '#16a34a' : '#dc2626'}; line-height: 1;">${(sim.van || 0) >= 0 ? '+' : ''}${(sim.van || 0).toLocaleString('fr-FR')} €</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; height: 30px; min-height: 30px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
                  <span style="font-size: 5.2pt; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 1px;">TRI (20 ans)</span>
                  <div style="font-size: 7.5pt; font-weight: 900; color: #d97706; line-height: 1;">${sim.triPercent || 'N/A'} %</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; height: 30px; min-height: 30px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
                  <span style="font-size: 5.2pt; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 1px;">ROI net</span>
                  <div style="font-size: 7.5pt; font-weight: 900; color: #0284c7; line-height: 1;">${(sim.paybackYear || sim.roi) ? `${Number(sim.paybackYear || sim.roi).toFixed(2)} ans` : 'N/A'}</div>
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
              <div style="position: absolute; bottom: 6px; right: 6px; background: transparent; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9); padding: 2px 4px; font-size: 6.8pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">Orientation : ${sim.orientationLabel || 'Sud'}</div>
            </div>
          </div>
        ` : (isStruct || isOmbriere) ? (
          wants3D ? `
            <!-- 4. GRILLE 2 COLONNES : VUE 3D (GAUCHE) + IMPLANTATION SATELLITE APRÈS (DROITE) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 5px; height: 313px;">
              <!-- 4a. VUE 3D DU BÂTIMENT OU DE L'OMBRIÈRE -->
              <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; position: relative; height: 100%;">
                <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">
                  ${isOmbriere ? 'Vue 3D — Ombrière Photovoltaïque' : `Vue 3D — Bâtiment ${sim.length ? Number(sim.length).toFixed(1) : '30.0'}m × ${sim.width ? Number(sim.width).toFixed(1) : '20.0'}m`}
                </div>
                ${img3D ? `
                  <img src="${img3D}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue 3D" />
                ` : `
                  <div style="color: #64748b; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                    <strong style="color: #0f172a; display: block; margin-bottom: 3px;">${isOmbriere ? 'Ombrière Photovoltaïque 3D' : 'Hangar Solaire 3D'}</strong>
                    ${sim.kwc || 0} kWc
                  </div>
                `}
              </div>

              <!-- 4b. IMPLANTATION SATELLITE SUR LE TERRAIN / PARKING -->
              <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; position: relative; height: 100%;">
                <div style="position: absolute; top: 0; left: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-bottom-right-radius: 6px; font-size: 7pt; font-weight: bold; z-index: 2; margin: 0; line-height: 1; display: flex; align-items: center;">
                  ${isOmbriere ? 'Implantation Satellite sur le Parking' : 'Implantation Satellite sur la Parcelle'}
                </div>
                ${singleMapScreenshot ? `
                  <img src="${singleMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Vue satellite du site" />
                ` : `
                  <div style="color: #94a3b8; font-size: 8.5pt; text-align: center; margin: auto; padding: 15px;">
                    <strong style="color: #ffffff;">Repérage Satellite</strong>
                    <div style="font-size: 7.5pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
                  </div>
                `}
                <div style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 7px; border-top-left-radius: 6px; font-size: 7pt; font-weight: bold; margin: 0; line-height: 1; display: flex; align-items: center;">
                  ${isOmbriere ? `Ombrières : ${sim.coveredArea || sim.roofSurface || 0} m² (${sim.spotsCount || 0} pl.)` : `Surface : ${sim.floorArea || Math.round((sim.length || 30) * (sim.width || 20))} m²`}
                </div>
              </div>
            </div>
          ` : `
            <!-- 4. VISUEL DUAL AVANT / APRÈS CÔTE À CÔTE AU MÊME ZOOM (100% VISIBLE) -->
            <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: 5px; position: relative; height: 313px; display: flex; align-items: center; justify-content: center;">
              ${finalMapScreenshot ? `
                <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Implantation Visuelle Avant / Après" />
              ` : `
                <div style="color: #94a3b8; font-size: 9pt; text-align: center; padding: 15px;">
                  <strong style="color: #ffffff; display: block; font-size: 11pt; margin-bottom: 4px;">Plan d'Implantation Solaire</strong>
                  <div style="font-size: 8pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
                </div>
              `}
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.92); color: #ffffff; padding: 5px 10px; border-radius: 6px; font-size: 8pt; font-weight: bold; margin: 0; line-height: 1.2; display: flex; align-items: center; box-shadow: 0 3px 8px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); z-index: 10;">
                ${isOmbriere ? `Emprise Parking : ${Math.max(Number(sim.parkingArea || 0), Number(sim.rawParkingArea || 0), Math.round(Number(sim.coveredArea || sim.roofSurface || 0) / 0.65)).toLocaleString('fr-FR')} m² &bull; Ombrières : ${sim.coveredArea || sim.roofSurface || 0} m² (${sim.spotsCount || 0} pl.)` : `Surface : ${sim.floorArea || Math.round((sim.length || 30) * (sim.width || 20))} m² &bull; ${sim.kwc || 0} kWc`}
              </div>
            </div>
          `
        ) : isIrve ? `
          <!-- 4. VISUELS IRVE : PHOTO DE LA BORNE (GAUCHE) + IMPLANTATION SATELLITE (DROITE) -->
          <div style="display: grid; grid-template-columns: 1fr 1.35fr; gap: 8px; margin-bottom: 8px; height: 330px;">
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
          <div style="border: 2px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: ${isOmbriere ? '5px' : isToiture ? '8px' : '12px'}; position: relative; height: ${isOmbriere ? '313px' : isToiture ? '270px' : '260px'}; display: flex; align-items: center; justify-content: center;">
            ${finalMapScreenshot ? `
              <img src="${finalMapScreenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" alt="Implantation Visuelle du Projet" />
            ` : `
              <div style="color: #94a3b8; font-size: 9pt; text-align: center; padding: 15px;">
                <strong style="color: #ffffff; display: block; font-size: 11pt; margin-bottom: 4px;">Plan d'Implantation Solaire</strong>
                <div style="font-size: 8pt; margin-top: 3px; color: #94a3b8;">${clientAddress}</div>
              </div>
            `}
            <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.92); color: #ffffff; padding: 5px 10px; border-radius: 6px; font-size: 8pt; font-weight: bold; margin: 0; line-height: 1.2; display: flex; align-items: center; box-shadow: 0 3px 8px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); z-index: 10;">
              ${isOmbriere ? `Emprise Parking : ${Math.max(Number(sim.parkingArea || 0), Number(sim.rawParkingArea || 0), Math.round(Number(sim.coveredArea || sim.roofSurface || 0) / 0.65)).toLocaleString('fr-FR')} m² &bull; Ombrières : ${sim.coveredArea || sim.roofSurface || 0} m² (${sim.spotsCount || 0} pl.)` : `Surface : ${sim.roofSurface || sim.floorArea || 83} m²`}
            </div>
          </div>
        `}

        <!-- 5. GRAPHIQUE FINANCIER D'AMORTISSEMENT -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: ${(isOmbriere || isStruct) ? '5px 10px' : isToiture ? '7px 10px' : '9px 12px'}; margin-bottom: ${(isOmbriere || isStruct) ? '5px' : isToiture ? '8px' : '11px'};">
          <div style="font-size: ${(isOmbriere || isStruct) ? '7.5pt' : isToiture ? '8pt' : '7.5pt'}; font-weight: 800; color: #00429d; text-transform: uppercase; margin-bottom: 2px;">
            ${isSechoir ? 'Projection Financière des Gains Cumulés (25 ans)' : 'Projection Financière des Gains Cumulés (30 ans)'}
          </div>
          <div style="height: ${(isOmbriere || isStruct) ? '140px' : isToiture ? '175px' : '240px'}; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${financialChartImg}" style="width: 100%; height: 100%; object-fit: contain;" alt="Graphique Amortissement" />
          </div>

          <!-- 3 CARTES DE CUMULS VERTICALEMENT CENTRÉES (10, 20, 30 ANS) -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 3px; text-align: center;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; height: ${(isOmbriere || isStruct) ? '33px' : isToiture ? '40px' : '38px'}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <span style="font-size: ${(isOmbriere || isStruct) ? '5.5pt' : isToiture ? '6pt' : '5.5pt'}; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1; margin-bottom: 1.5px;">sur 10 ans</span>
              <div style="font-size: ${(isOmbriere || isStruct) ? '9pt' : '9.5pt'}; font-weight: 900; color: #0f172a; line-height: 1;">+${dispCumul10.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; height: ${(isOmbriere || isStruct) ? '33px' : isToiture ? '40px' : '38px'}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <span style="font-size: ${(isOmbriere || isStruct) ? '5.5pt' : isToiture ? '6pt' : '5.5pt'}; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1; margin-bottom: 1.5px;">sur 20 ans</span>
              <div style="font-size: ${(isOmbriere || isStruct) ? '9pt' : '9.5pt'}; font-weight: 900; color: #0f172a; line-height: 1;">+${dispCumul20.toLocaleString('fr-FR')} €</div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; height: ${(isOmbriere || isStruct) ? '33px' : isToiture ? '40px' : '38px'}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
              <span style="font-size: ${(isOmbriere || isStruct) ? '5.5pt' : isToiture ? '6pt' : '5.5pt'}; color: #166534; font-weight: bold; text-transform: uppercase; line-height: 1; margin-bottom: 1.5px;">${isSechoir ? 'sur 20 ans (net)' : 'sur 30 ans'}</span>
              <div style="font-size: ${(isOmbriere || isStruct) ? '9pt' : '9.5pt'}; font-weight: 900; color: #16a34a; line-height: 1;">+${(isSechoir ? dispCumul20 : dispCumul30).toLocaleString('fr-FR')} €</div>
            </div>
          </div>
        </div>

        <!-- 6. SECTION SOLUTIONS DE FINANCEMENT (2 SCÉNARIOS POUR OMBRIÈRES & STRUCTURE, OU 3 POUR TOITURE) -->
        ${(isOmbriere || isStruct) ? `
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 9px; padding: 3px 8px; margin-bottom: 2px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; border-bottom: 1px solid #e2e8f0; padding-bottom: 1.5px;">
            <span style="font-size: 7.8pt; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
              ${isOmbriere ? '💡 Solutions de Financement Ombrière Comparées' : '💡 Solutions de Financement Bâtiment Solaire Comparées'}
            </span>
            <span style="font-size: 6.4pt; color: #64748b; font-weight: bold;">
              Investissement : ${Number(capexHT || 0).toLocaleString('fr-FR')} € HT &bull; CA EDF OA : ~${Number(annualRev || 0).toLocaleString('fr-FR')} €/an
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px;">
            <!-- Cadre 1 : Crédit Bancaire -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 7px; padding: 2px 7px 3px 7px; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px;">
                <span style="font-size: 8.8pt; font-weight: 900; color: #1e40af; text-transform: uppercase; white-space: nowrap;">1. Crédit Bancaire</span>
                <span style="background: #2563eb; color: #ffffff; font-size: 6.2pt; font-weight: 900; padding: 1.5px 6px; border-radius: 4px; white-space: nowrap; letter-spacing: 0.2px;">PROPRIÉTAIRE J1</span>
              </div>
              <div style="font-size: 7.2pt; color: #475569; margin-bottom: 2px;">Prêt pro 20 ans amortissable (4.48%) &bull; Actif inscrit au bilan</div>
              <table style="width: 100%; font-size: 7.8pt; border-collapse: collapse;">
                <tr><td style="padding: 1px 0; color: #64748b;">Mensualité du prêt :</td><td style="padding: 1px 0; text-align: right; font-weight: bold; color: #1e40af;">~${Number(financing?.bankLoan?.monthlyPaymentExact || 0).toLocaleString('fr-FR')} €/m (${Number(financing?.bankLoan?.annualPaymentExact || 0).toLocaleString('fr-FR')} €/an)</td></tr>
                <tr><td style="padding: 1px 0; color: #64748b;">Cash-flow net (An 1) :</td><td style="padding: 1px 0; text-align: right; font-weight: 900; color: ${bankAnnualNet >= 0 ? '#16a34a' : '#1e40af'};">${bankAnnualNet >= 0 ? '+' : ''}${bankAnnualNet.toLocaleString('fr-FR')} €/an net</td></tr>
                <tr><td style="padding: 1px 0; color: #64748b;">Gain net cumulé (20 ans) :</td><td style="padding: 1px 0; text-align: right; font-weight: bold; color: #1e40af;">+${Math.max(0, bankCumul20).toLocaleString('fr-FR')} €</td></tr>
                <tr><td style="font-weight: bold; color: #1e40af; padding-top: 1.5px;">Bénéfice net global (30 ans) :</td><td style="text-align: right; font-weight: 900; color: #1e40af; font-size: 8.8pt; padding-top: 1.5px;">+${Math.max(0, bankCumul30).toLocaleString('fr-FR')} €</td></tr>
              </table>
            </div>

            <!-- Cadre 2 : Abonnement (Leasing SunLib) -->
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 7px; padding: 2px 7px 3px 7px; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px;">
                <span style="font-size: 8.8pt; font-weight: 900; color: #6b21a8; text-transform: uppercase; white-space: nowrap;">2. Abonnement</span>
                <span style="background: #9333ea; color: #ffffff; font-size: 6.2pt; font-weight: 900; padding: 1.5px 7px; border-radius: 4px; white-space: nowrap; letter-spacing: 0.2px; text-align: center; display: inline-block;">100% HORS-BILAN &bull; 0 € DETTE</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7.2pt; color: #475569; margin-bottom: 2px;">
                <span>Leasing LOA 20 ans &bull; Loyers déductibles IS</span>
                <span style="color: #16a34a; font-weight: bold;">Rachat : 1 € au terme</span>
              </div>
              <table style="width: 100%; font-size: 7.8pt; border-collapse: collapse;">
                <tr><td style="padding: 1.5px 0; color: #64748b;">Loyer mensuel HT :</td><td style="padding: 1.5px 0; text-align: right; font-weight: bold; color: #6b21a8;">${leasingMonthly.toLocaleString('fr-FR')} €/m</td></tr>
                <tr><td style="padding: 1.5px 0; color: #64748b;">Économie d'impôt (IS 25%) :</td><td style="padding: 1.5px 0; text-align: right; font-weight: bold; color: #16a34a;">+${Number(selectedLeasing.taxSavingsIS || 0).toLocaleString('fr-FR')} €/an déductibles</td></tr>
                <tr><td style="font-weight: bold; color: #6b21a8; padding-top: 1.5px;">Bénéfice net global (30 ans) :</td><td style="text-align: right; font-weight: 900; color: #16a34a; font-size: 8.8pt; padding-top: 1.5px;">+${Math.max(0, leasingGains30).toLocaleString('fr-FR')} €</td></tr>
              </table>
            </div>
          </div>
        </div>

        ${isOmbriere ? `
        <!-- CADRE OBLIGATION & SANCTIONS LOI APER (OMBRIÈRES DE PARKING UNIQUEMENT) -->
        <div style="background: ${aperNotice.bg}; border: 1.3px solid ${aperNotice.border}; border-radius: 8px; padding: 3px 8px; margin-top: 0px; margin-bottom: 2px; box-sizing: border-box;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 9pt; line-height: 1;">${aperNotice.icon}</span>
              <span style="font-size: 7.2pt; font-weight: 900; color: ${aperNotice.titleColor}; text-transform: uppercase; letter-spacing: 0.3px;">
                ${aperNotice.title} &bull; Emprise Parking Étudié : ${parkingArea.toLocaleString('fr-FR')} m²
              </span>
            </div>
            <span style="background: ${aperNotice.badgeBg}; color: ${aperNotice.badgeColor}; font-size: 5.5pt; font-weight: 900; padding: 1.5px 6px; border-radius: 4px; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.3px;">
              ${aperNotice.badge}
            </span>
          </div>
          <div style="font-size: 6.4pt; color: ${aperNotice.textColor}; line-height: 1.25;">
            ${aperNotice.text}
          </div>
        </div>
        ` : ''}
        ` : isToiture ? `
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 9px; padding: 6px 9px; margin-bottom: 6px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
            <span style="font-size: 7.5pt; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
              💡 Solutions de Financement Comparées
            </span>
            <span style="font-size: 6.2pt; color: #64748b; font-weight: bold;">
              Investissement : ${Number(capexHT || 0).toLocaleString('fr-FR')} € HT &bull; CA EDF OA : ~${Number(annualRev || 0).toLocaleString('fr-FR')} €/an
            </span>
          </div>

          ${(() => {
            const excludeThirdParty = sim.excludeThirdParty === true || sim.showThirdParty === false;
            return `
            <div style="display: grid; grid-template-columns: repeat(${excludeThirdParty ? 2 : 3}, 1fr); gap: 6px;">
              ${!excludeThirdParty ? `
              <!-- Cadre 1 : Tiers-Financement -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 7px; padding: 4px 6px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <span style="font-size: 6.8pt; font-weight: 900; color: #166534; text-transform: uppercase;">1. Tiers-Investisseur</span>
                  <span style="background: #16a34a; color: #ffffff; font-size: 5pt; font-weight: 900; padding: 1.5px 3.5px; border-radius: 3px;">0 € APPORT</span>
                </div>
                <div style="font-size: 5.5pt; color: #475569; margin-bottom: 2px;">Bail 30 ans &bull; Toiture valorisée clé en main</div>
                <table style="width: 100%; font-size: 5.8pt; border-collapse: collapse;">
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Loyer garanti (ans 1-20) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #166534;">+${Number(financing?.thirdParty?.annualRentFixed || 0).toLocaleString('fr-FR')} €/an</td></tr>
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Intéressement (ans 21-30) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #166534;">10 % du CA annuel</td></tr>
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Investissement client :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #166534;">0 € (clé en main)</td></tr>
                  <tr style="border-top: 1px solid #bbf7d0;"><td style="font-weight: bold; color: #166534; padding-top: 1.5px;">Cumul garanti (20 ans) :</td><td style="text-align: right; font-weight: 900; color: #166534; font-size: 6.8pt; padding-top: 1.5px;">+${Number(financing?.thirdParty?.cumulYears1To20 || 0).toLocaleString('fr-FR')} €</td></tr>
                </table>
              </div>
              ` : ''}

              <!-- Cadre ${excludeThirdParty ? '1' : '2'} : Crédit Bancaire -->
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 7px; padding: 4px 6px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <span style="font-size: 6.8pt; font-weight: 900; color: #1e40af; text-transform: uppercase;">${excludeThirdParty ? '1' : '2'}. Crédit Bancaire</span>
                  <span style="background: #2563eb; color: #ffffff; font-size: 5pt; font-weight: 900; padding: 1.5px 3.5px; border-radius: 3px;">PROPRIÉTAIRE J1</span>
                </div>
                <div style="font-size: 5.5pt; color: #475569; margin-bottom: 2px;">Prêt pro 20 ans amortissable (4.48%)</div>
                <table style="width: 100%; font-size: 5.8pt; border-collapse: collapse;">
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Mensualité de prêt :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #1e40af;">~${Number(financing?.bankLoan?.monthlyPaymentExact || 0).toLocaleString('fr-FR')} €/m</td></tr>
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Cash-flow net (An 1) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: 900; color: ${bankAnnualNet >= 0 ? '#16a34a' : '#1e40af'};">${bankAnnualNet >= 0 ? '+' : ''}${bankAnnualNet.toLocaleString('fr-FR')} €/an</td></tr>
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Gain net cumulé (20 ans) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #1e40af;">+${Math.max(0, bankCumul20).toLocaleString('fr-FR')} €</td></tr>
                  <tr><td style="font-weight: bold; color: #1e40af; padding-top: 1.5px;">Bénéfice global (30 ans) :</td><td style="text-align: right; font-weight: 900; color: #1e40af; font-size: 6.8pt; padding-top: 1.5px;">+${Math.max(0, bankCumul30).toLocaleString('fr-FR')} €</td></tr>
                </table>
              </div>

              <!-- Cadre ${excludeThirdParty ? '2' : '3'} : Abonnement (Leasing) -->
              <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 7px; padding: 4px 6px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <span style="font-size: 6.8pt; font-weight: 900; color: #6b21a8; text-transform: uppercase; white-space: nowrap;">${excludeThirdParty ? '2' : '3'}. Abonnement</span>
                  <span style="background: #9333ea; color: #ffffff; font-size: 5pt; font-weight: 900; padding: 1.5px 4px; border-radius: 3px; white-space: nowrap;">100% HORS-BILAN</span>
                </div>
                <div style="font-size: 5.5pt; color: #475569; margin-bottom: 2px;">Leasing 20 ans &bull; Rachat 1 € &bull; 0 € dette</div>
                <table style="width: 100%; font-size: 5.8pt; border-collapse: collapse;">
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Loyer HT (~${leasingCoverage}% couvert) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #6b21a8;">${leasingMonthly.toLocaleString('fr-FR')} €/m</td></tr>
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Effort d'épargne (post-IS) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: 900; color: #6b21a8;">${leasingNetPostIS >= 0 ? `Autofinancé` : `~${leasingEffortMonthly.toLocaleString('fr-FR')} €/m`}</td></tr>
                  <tr><td style="padding: 1.2px 0; color: #64748b;">Économie d'impôt (IS 25%) :</td><td style="padding: 1.2px 0; text-align: right; font-weight: bold; color: #166534;">+${Number(selectedLeasing.taxSavingsIS || 0).toLocaleString('fr-FR')} €/an</td></tr>
                  <tr><td style="font-weight: bold; color: #6b21a8; padding-top: 1.5px;">Bénéfice global (30 ans) :</td><td style="text-align: right; font-weight: 900; color: #16a34a; font-size: 6.8pt; padding-top: 1.5px;">+${Math.max(0, leasingGains30).toLocaleString('fr-FR')} €</td></tr>
                </table>
              </div>
            </div>
            `;
          })()}
        </div>
        ` : ''}
      </div>

      <!-- 7. ZONE VOTRE IMPACT SUR L'ENVIRONNEMENT (COLLÉE JUSTE AU-DESSUS DU PIED DE PAGE) -->
      <div style="margin-top: auto; margin-bottom: 2px;">
        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 9px; padding: ${(isOmbriere || isStruct) ? '5px 10px' : isToiture ? '7px 10px' : '8px 12px'}; margin-bottom: 0;">
          <div style="font-size: ${(isOmbriere || isStruct) ? '7.2pt' : isToiture ? '8pt' : '8pt'}; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 2px;">
            🌱 Votre Impact sur l'Environnement
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; height: ${(isOmbriere || isStruct) ? '34px' : isToiture ? '46px' : '44px'}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 0; margin: 0;">
              <div style="font-size: ${(isOmbriere || isStruct) ? '9pt' : isToiture ? '10.5pt' : '10pt'}; font-weight: 900; color: #16a34a; line-height: 1.15; margin: 0; padding: 0;">${co2Avoided} tonnes</div>
              <div style="font-size: ${(isOmbriere || isStruct) ? '5.5pt' : isToiture ? '6.2pt' : '6.5pt'}; color: #64748b; line-height: 1.15; margin: 0; padding: 0;">de CO₂ évitées par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; height: ${(isOmbriere || isStruct) ? '34px' : isToiture ? '46px' : '44px'}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 0; margin: 0;">
              <div style="font-size: ${(isOmbriere || isStruct) ? '9pt' : isToiture ? '10.5pt' : '10pt'}; font-weight: 900; color: #16a34a; line-height: 1.15; margin: 0; padding: 0;">${treesPlanted}</div>
              <div style="font-size: ${(isOmbriere || isStruct) ? '5.5pt' : isToiture ? '6.2pt' : '6.5pt'}; color: #64748b; line-height: 1.15; margin: 0; padding: 0;">arbres plantés par an</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; height: ${(isOmbriere || isStruct) ? '34px' : isToiture ? '46px' : '44px'}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 0; margin: 0;">
              <div style="font-size: ${(isOmbriere || isStruct) ? '9pt' : isToiture ? '10.5pt' : '10pt'}; font-weight: 900; color: #0d9488; line-height: 1.15; margin: 0; padding: 0;">${householdsFed}</div>
              <div style="font-size: ${(isOmbriere || isStruct) ? '5.5pt' : isToiture ? '6.2pt' : '6.5pt'}; color: #64748b; line-height: 1.15; margin: 0; padding: 0;">foyer(s) alimenté(s) en électricité</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 8. PIED DE PAGE PROFESSIONNEL -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #00429d; padding-top: 3.5px; font-size: 7pt; color: #475569; margin-top: 1px;">
        <span style="font-weight: bold; color: #00429d;">enr-courtage.fr</span>
        <span>Energies Renouvelables &amp; Ingénierie Solaire</span>
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

    // Si c'est un séchoir BatiTech et que l'option d'inclure la page 2 est demandée (désactivée par défaut pour 1 page unique)
    const shouldIncludeSechoirPage2 = isSechoir && Boolean(sim.includeBenefitsPage || sim.includePage2);
    if (shouldIncludeSechoirPage2) {
      const chargesCanvas = document.createElement('canvas');
      drawSechoirChargesChart(chargesCanvas);
      const chargesChartImg = chargesCanvas.toDataURL('image/png');

      const page2Container = document.createElement('div');
      page2Container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;';
      page2Container.innerHTML = `
        <div style="width:210mm;min-height:297mm;padding:10mm 15mm;box-sizing:border-box;background-color:#ffffff;color:#333333;font-family:Montserrat,Arial,sans-serif;position:relative;">
          
          <!-- Header Générique Nelson -->
          <div style="display:table;width:100%;border-bottom:3px solid #0D3660;padding-bottom:8px;margin-bottom:15px;">
            <div style="display:table-cell;vertical-align:bottom;width:35%;">
              <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR COURTAGE" style="height:32px;width:auto;object-fit:contain;display:block;margin-bottom:2px;" />
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
            <span style="font-weight: bold; color: #00429d;">enr-courtage.fr</span>
            <span>Energies Renouvelables &amp; Ingénierie Solaire</span>
            <span>contact@enr-courtage.fr</span>
          </div>

        </div>
      `;

      document.body.appendChild(page2Container);
      try {
        const page2Canvas = await html2canvas(page2Container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794,
        });
        pdf.addPage();
        const page2ImgData = page2Canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(page2ImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } finally {
        document.body.removeChild(page2Container);
      }
    }

    // Si c'est une ombrière, une toiture ou un séchoir avec option courrier de prospection, ajouter le Courrier d'accompagnement
    // Si c'est une ombrière, une toiture ou un séchoir avec option courrier de prospection, ajouter le Courrier d'accompagnement
    if ((isOmbriere || isToiture || isSechoir) && sim.includeCoverLetter) {
      const pageCoverContainer = document.createElement('div');
      pageCoverContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;max-height:297mm;background:#ffffff;color:#0f172a;font-family:Arial,sans-serif;overflow:hidden;box-sizing:border-box;';
      
      const targetCompany = isSechoir
        ? (sim.ownerName || sim.clientName || (sim.pacage ? `Exploitation Agricole (PACAGE ${sim.pacage})` : 'Direction de l\'exploitation'))
        : (sim.ownerName || sim.company || sim.clientName || 'Direction de l\'établissement');
      const targetAddress = sim.address || clientAddress || '';
      const formattedDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      // Formatage strict de l'adresse destinataire aux normes AFNOR NF Z 10-011 (Fenêtre DL / C5)
      // Emplacement standard : haut droit, top 45mm, right 20mm, max 85mm x 45mm, max 6 lignes
      let streetLine = targetAddress.trim();
      let postalCityLine = '';

      const cpMatch = streetLine.match(/\b(\d{5})\b\s*(.*)$/);
      if (cpMatch) {
        const foundCp = cpMatch[1];
        const foundCity = (cpMatch[2] || sim.cityName || '').replace(/[,\.]/g, '').trim().toUpperCase();
        postalCityLine = `${foundCp} ${foundCity}`;
        streetLine = streetLine.replace(cpMatch[0], '').replace(/[,\s]+$/, '').trim();
      } else {
        const cp = sim.postalCode || sim.codePostal || (sim.departmentCode ? `${sim.departmentCode}000` : '33000');
        const city = (sim.cityName || sim.ville || 'FRANCE').replace(/[,\.]/g, '').trim().toUpperCase();
        postalCityLine = `${cp} ${city}`;
      }

      const afnorQuality = isSechoir
        ? 'À l\'attention de la Direction d\'Exploitation'
        : 'À l\'attention de la Direction Générale';

      const afnorLines = [
        afnorQuality,
        targetCompany.toUpperCase(),
        streetLine ? streetLine : null,
        postalCityLine,
        'FRANCE'
      ].filter(Boolean).slice(0, 6);

      const letterSubject = isToiture
        ? 'Objet : Valorisation photovoltaïque et optimisation énergétique de votre toiture — Étude d’opportunité ci-jointe'
        : isOmbriere
        ? 'Objet : Mise en conformité Loi APER et valorisation de votre parking — Étude d’opportunité ci-jointe'
        : `Objet : Projet d’installation d’un Séchoir Solaire Thermovoltaïque BatiTech® (${sim.modelName || 'BatiTech'}) — PACAGE ${sim.pacage || ''} — Étude d’opportunité ci-jointe`;

      const letterBodyHtml = isToiture ? `
              <p style="margin: 0 0 9px 0; font-weight: bold; color: #0f172a;">Madame, Monsieur,</p>

              <p style="margin: 0 0 9px 0;">
                Dans le cadre de l'optimisation des charges d'exploitation et de la transition énergétique, les toitures de bâtiments professionnels et tertiaires représentent un <strong>gisement énergétique et financier majeur</strong>, particulièrement adapté à la production d'énergie solaire.
              </p>

              <p style="margin: 0 0 9px 0;">
                Plutôt que de laisser votre surface de toiture inerte, ce projet constitue un <strong>levier direct de création de valeur et de valorisation patrimoniale</strong> pour votre site situé au <strong>${targetAddress}</strong>.
              </p>

              <p style="margin: 0 0 9px 0;">
                Grâce à notre plateforme d'ingénierie et d’analyse spatiale par satellite, nous avons établi une première <strong>étude de faisabilité technique et économique</strong> sur votre toiture, jointe à ce courrier en Page 2.
              </p>

              <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 9px 13px; margin: 9px 0;">
                <div style="font-size: 9.5pt; font-weight: 800; color: #00429d; margin-bottom: 6px; text-transform: uppercase;">
                  L'implantation d'une centrale solaire sur votre toiture vous apporte plusieurs bénéfices stratégiques :
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 8.9pt; line-height: 1.45; color: #334155;">
                  <li style="margin-bottom: 6px;">
                    <strong>Revenus garantis sur 20 ans :</strong> valorisation directe de vos surfaces de toiture par la revente de l'électricité produite avec un tarif garanti par l'État (EDF OA) ou économies substantielles sur votre facture électrique.
                  </li>
                  <li style="margin-bottom: 6px;">
                    <strong>Valorisation de votre patrimoine :</strong> préservation du clos-couvert, renforcement de la valeur vénale de l'actif immobilier et amélioration concrète du bilan carbone de votre entreprise.
                  </li>
                  <li style="margin-bottom: 0;">
                    <strong>Préservation de votre trésorerie :</strong> nos solutions de financement s'adaptent à vos choix comptables, par un crédit professionnel amortissable générateur d'excédent net ou par une formule d'abonnement 100 % hors-bilan sans dette inscrite, avec rachat pour 1 € en fin de contrat.
                  </li>
                </ul>
              </div>

              <p style="margin: 9px 0;">
                Le document ci-joint en Page 2 vous présente le calepinage sur mesure appliqué à votre toiture, le productible prévisionnel ainsi que les retombées financières chiffrées sur 30 ans.
              </p>

              <p style="margin: 9px 0;">
                Je vous propose un bref échange dans les prochains jours afin de faire le point sur vos objectifs et d’ajuster ces paramètres à vos priorités d'exploitation.
              </p>

              <p style="margin: 9px 0 11px 0;">
                Je vous prie d'agréer, Madame, Monsieur, l’expression de mes salutations distinguées.
              </p>
      ` : isOmbriere ? `
              <p style="margin: 0 0 9px 0; font-weight: bold; color: #0f172a;">Madame, Monsieur,</p>

              <p style="margin: 0 0 9px 0;">
                La loi relative à l’accélération de la production d’énergies renouvelables <strong>(loi APER, article 40)</strong> impose désormais à tous les parcs de stationnement extérieurs de plus de 1 500 m² d’équiper au moins <strong>50 % de leur superficie en ombrières photovoltaïques</strong>. Les échéances de mise en conformité (2026 à 2028 selon la taille et le mode de gestion) approchent, et la réglementation prévoit des sanctions financières administratives pouvant atteindre <strong>20 000 € à 40 000 € par an</strong> jusqu’à régularisation.
              </p>

              <p style="margin: 0 0 9px 0;">
                Plutôt que de subir cette contrainte légale comme une charge, ce projet constitue un <strong>levier direct de valorisation financière et patrimoniale</strong> pour votre site situé au <strong>${targetAddress}</strong>.
              </p>

              <p style="margin: 0 0 9px 0;">
                Grâce à notre plateforme d'ingénierie et d’analyse spatiale par satellite, nous avons établi une première <strong>étude de faisabilité technique et économique</strong> sur votre parking, jointe à ce courrier en Page 2.
              </p>

              <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 9px 13px; margin: 9px 0;">
                <div style="font-size: 9.5pt; font-weight: 800; color: #00429d; margin-bottom: 6px; text-transform: uppercase;">
                  L'implantation d'ombrières solaires sur votre site vous apporte plusieurs bénéfices stratégiques :
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 8.9pt; line-height: 1.45; color: #334155;">
                  <li style="margin-bottom: 6px;">
                    <strong>Confort et attractivité :</strong> protection des véhicules de vos collaborateurs et clients contre les intempéries et la chaleur, tout en affichant un engagement environnemental concret.
                  </li>
                  <li style="margin-bottom: 6px;">
                    <strong>Revenus garantis sur 20 ans :</strong> valorisation de vos surfaces foncières existantes via la vente totale de l'électricité produite avec un tarif garanti par l'État (EDF OA).
                  </li>
                  <li style="margin-bottom: 0;">
                    <strong>Préservation de votre trésorerie :</strong> nos solutions s'adaptent à vos impératifs comptables, soit via un crédit bancaire amortissable générant un excédent net dès la première année, soit par une formule d'abonnement 100 % hors-bilan (les loyers sont largement compensés par la production solaire et vous rachetez l'infrastructure pour 1 € symbolique en fin de contrat).
                  </li>
                </ul>
              </div>

              <p style="margin: 9px 0;">
                Le document ci-joint en Page 2 vous présente le calepinage sur mesure appliqué à vos allées de stationnement, le productible prévisionnel ainsi que les retombées financières chiffrées sur 30 ans.
              </p>

              <p style="margin: 9px 0;">
                Je vous propose un bref échange dans les prochains jours afin de faire le point sur vos obligations réglementaires et d’ajuster ces paramètres à vos priorités d'exploitation.
              </p>

              <p style="margin: 9px 0 11px 0;">
                Je vous prie d'agréer, Madame, Monsieur, l’expression de mes salutations distinguées.
              </p>
      ` : `
              <p style="margin: 0 0 9px 0; font-weight: bold; color: #0f172a;">Madame, Monsieur,</p>

              <p style="margin: 0 0 9px 0;">
                Dans le cadre de la transition agro-écologique, de la hausse continue des coûts de l’énergie et de la recherche d'autonomie fourragère, les exploitations agricoles disposent d'un levier d'optimisation décisif : le <strong>séchage solaire thermovoltaïque innovant</strong>.
              </p>

              <p style="margin: 0 0 9px 0;">
                Plutôt qu’un simple hangar de stockage inerte, l’implantation d’un séchoir solaire actif <strong>${sim.modelName || 'BatiTech'}</strong> (${sim.dimensions || '18m × 20m'}) sur votre exploitation située au <strong>${targetAddress}</strong> constitue un véritable <strong>outil de création de valeur agronomique et de rentabilité financière</strong>.
              </p>

              <p style="margin: 0 0 9px 0;">
                Grâce à notre plateforme d'ingénierie et d’analyse territoriale, nous avons établi une première <strong>étude de faisabilité technique et économique personnalisée</strong> pour votre exploitation${sim.pacage ? ` (PACAGE n° ${sim.pacage})` : ''}, jointe à ce courrier en Page 2.
              </p>

              <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 9px 13px; margin: 9px 0;">
                <div style="font-size: 9.5pt; font-weight: 800; color: #00429d; margin-bottom: 6px; text-transform: uppercase;">
                  L'implantation d'un Séchoir Thermovoltaïque BatiTech® vous apporte des atouts majeurs :
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 8.9pt; line-height: 1.45; color: #334155;">
                  <li style="margin-bottom: 6px;">
                    <strong>Valorisation agronomique &amp; gains de séchage :</strong> préservation optimale de la valeur nutritive (protéines, appétence), réduction drastique des pertes au champ et valorisation directe estimée à <strong>+${(sim.deltaProduits || 0).toLocaleString('fr-FR')} €/an</strong>${sim.activeMaterialsText ? ` (${sim.activeMaterialsText})` : ''}.
                  </li>
                  <li style="margin-bottom: 6px;">
                    <strong>Production d'énergie solaire décarbonée :</strong> toiture solaire thermovoltaïque Cogen’Air® de <strong>${sim.kwc || 30.15} kWc</strong> (${sim.nbModules || 90} modules) générant un productible attendu de <strong>${(sim.annualProductionKwh || 0).toLocaleString('fr-FR')} kWh/an</strong> tout en insufflant l'air chaud nécessaire au séchage.
                  </li>
                  <li style="margin-bottom: 6px;">
                    <strong>Subventions bonifiées &amp; Prime CEE AGRI-EQ-110 :</strong> déduction immédiate d'une prime CEE de <strong>${(sim.primeCEE || 0).toLocaleString('fr-FR')} €</strong> sur l'investissement brut${(sim.subventionRegionaleMontant || 0) > 0 ? `, complétée par des aides régionales estimées jusqu'à ${sim.subventionRegionaleMontant.toLocaleString('fr-FR')} € (${sim.subventionRegionaleNom || 'PCAE'})` : ''}.
                  </li>
                  <li style="margin-bottom: 0;">
                    <strong>Rentabilité financière pérenne :</strong> un <strong>Gain net d'exploitation de ${(sim.gainNetAnnuel || 0) >= 0 ? '+' : ''}${(sim.gainNetAnnuel || 0).toLocaleString('fr-FR')} €/an</strong> après remboursement intégral de l'annuité d'emprunt, pour un amortissement (ROI) estimé à <strong>${sim.roi ? Number(sim.roi).toFixed(1) : Number(sim.paybackYear || 0).toFixed(1)} ans</strong>.
                  </li>
                </ul>
              </div>

              <p style="margin: 9px 0;">
                Le dossier ci-joint en Page 2 détaille le dimensionnement technique sur mesure du bâtiment, les filières valorisées ainsi que le plan de financement prévisionnel sur 25 ans.
              </p>

              <p style="margin: 9px 0;">
                Je me tiens à votre entière disposition pour échanger dans les prochains jours, affiner ces simulations selon vos volumes précis et vérifier l'éligibilité de votre exploitation aux dispositifs de subvention en vigueur.
              </p>

              <p style="margin: 9px 0 11px 0;">
                Je vous prie d'agréer, Madame, Monsieur, l’expression de mes salutations distinguées.
              </p>
      `;

      pageCoverContainer.innerHTML = `
        <div style="width: 210mm; min-height: 297mm; max-height: 297mm; height: 297mm; box-sizing: border-box; background-color: #ffffff; color: #0f172a; font-family: Arial, sans-serif; position: relative; overflow: hidden;">
          
          <!-- BLOC EXPÉDITEUR ENR COURTAGE (HAUT GAUCHE, HORS ZONE AFNOR) -->
          <div style="position: absolute; top: 15mm; left: 20mm; width: 85mm; box-sizing: border-box; font-family: Arial, sans-serif;">
            <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR COURTAGE" style="height: 38px; width: auto; object-fit: contain; margin-bottom: 5px; display: block;" />
            <div style="font-size: 8.2pt; color: #475569; line-height: 1.4;">
              <strong style="color: #00429d; font-size: 8.8pt;">ENR COURTAGE</strong><br/>
              7 Rue Gutenberg &bull; 33700 MÉRIGNAC<br/>
              contact@enr-courtage.fr &bull; 07 63 87 71 40<br/>
              <span style="color: #0284c7; font-weight: bold;">www.enr-courtage.fr</span>
            </div>
          </div>

          <!-- BLOC DESTINATAIRE STRICTEMENT CALIBRÉ AUX NORMES AFNOR NF Z 10-011 (HAUT DROIT, FENÊTRE ENVELOPPE DL / C5) -->
          <!-- Position géométrique standard : top 45mm, right 20mm, largeur max 85mm, hauteur max 45mm -->
          <div style="position: absolute; top: 45mm; right: 20mm; width: 85mm; height: 45mm; max-height: 45mm; box-sizing: border-box; overflow: hidden; font-family: Arial, sans-serif; text-align: left; padding: 2mm 0 0 2mm;">
            ${afnorLines.map((line, idx) => {
              if (idx === 0) {
                return `<div style="font-size: 7.8pt; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.2px; margin-bottom: 2px; line-height: 1.2;">${line}</div>`;
              }
              if (idx === 1) {
                return `<div style="font-size: 10pt; font-weight: 900; color: #0f172a; margin-bottom: 2px; line-height: 1.2; text-transform: uppercase;">${line}</div>`;
              }
              return `<div style="font-size: 9.2pt; color: #334155; line-height: 1.35;">${line}</div>`;
            }).join('')}
          </div>

          <!-- DATE & LIEU (CALÉ EN DESSOUS DU BLOC AFNOR) -->
          <div style="position: absolute; top: 93mm; right: 20mm; font-size: 9.5pt; color: #475569; text-align: right;">
            Mérignac, le ${formattedDate}
          </div>

          <!-- CORPS DU COURRIER (OCCUPE L'ESPACE DE TOP 99MM JUSQU'À BOTTOM 16MM) -->
          <div style="position: absolute; top: 99mm; left: 20mm; right: 20mm; bottom: 16mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
            <div>
              <!-- OBJET DU COURRIER -->
              <div style="background: #eff6ff; border-left: 4px solid #00429d; padding: 6px 12px; border-radius: 0 6px 6px 0; margin-bottom: 9px;">
                <div style="font-size: 9.6pt; font-weight: 900; color: #00429d; line-height: 1.3;">
                  ${letterSubject}
                </div>
              </div>

              <!-- TEXTE PRINCIPAL -->
              <div style="font-size: 9.1pt; line-height: 1.46; color: #1e293b; text-align: justify;">
                ${letterBodyHtml}
              </div>
            </div>

            <!-- SIGNATURE & PJ -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 5px; border-top: 1px solid #f1f5f9;">
              <div style="font-size: 8pt; color: #64748b; font-style: italic; max-width: 58%;">
                <strong>P.J. :</strong> ${isToiture ? 'Étude de faisabilité & offre commerciale — Centrale toiture photovoltaïque (Page 2)' : isOmbriere ? 'Étude de faisabilité & offre commerciale — Ombrière de parking photovoltaïque (Page 2)' : 'Étude de faisabilité & offre commerciale — Séchoir Thermovoltaïque BatiTech® (Page 2)'}
              </div>

              <div style="text-align: right; min-width: 210px;">
                <div style="font-size: 11pt; font-weight: 900; color: #00429d;">Yann BARBERIS</div>
                <div style="font-size: 9pt; color: #475569; font-weight: bold; margin-top: 1px;">${isSechoir ? 'Conseiller solutions énergies & agro-solaire' : 'Conseiller solutions énergies'}</div>
                <div style="font-size: 8.8pt; color: #0284c7; font-weight: bold; margin-top: 1px;">07 63 87 71 40</div>
                <div style="font-size: 8.4pt; color: #64748b;">y.barberis@enr-courtage.fr</div>
              </div>
            </div>
          </div>

          <!-- PIED DE PAGE STRICT (FIXÉ À 7MM DU BAS) -->
          <div style="position: absolute; bottom: 7mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 3px; font-size: 7.5pt; color: #64748b;">
            <span style="font-weight: bold; color: #00429d;">enr-courtage.fr</span>
            <span>Energies Renouvelables &amp; Ingénierie Solaire &bull; SAS au capital de 10 000 €</span>
            <span>contact@enr-courtage.fr</span>
          </div>

        </div>
      `;

      document.body.appendChild(pageCoverContainer);
      try {
        const coverCanvas = await html2canvas(pageCoverContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794,
        });
        const coverImgData = coverCanvas.toDataURL('image/jpeg', 0.95);
        
        // ── INVERSION DE L'ORDRE DES PAGES (UNIVERSEL TOITURE, OMBRIÈRE, SÉCHOIR) ──
        // La Lettre de prospection nominative et personnalisée devient systématiquement la PAGE 1
        // L'Étude de faisabilité commerciale et le calepinage glissent en PAGE 2
        pdf.insertPage(1);
        pdf.setPage(1);
        pdf.addImage(coverImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } finally {
        document.body.removeChild(pageCoverContainer);
      }
    }

    const safeTitle = (sim.title || 'Offre_Commerciale_NELSON').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
    if (returnBlob) {
      const blob = pdf.output('blob');
      const arrayBuffer = pdf.output('arraybuffer');
      return { blob, arrayBuffer, filename, pdf };
    }
    pdf.save(filename);
    return { success: true, filename };
  } catch (err) {
    console.error('Erreur export PDF Commercial Offer:', err);
    return null;
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
};
