/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMMERCIAL PROPOSAL PDF GENERATOR (CONCIS & PREMIUM)
 * Générateur d'offres commerciales photovoltaïques synthétiques (4 à 5 pages)
 * Charte graphique officielle ENR Courtage & Ingénierie Solaire
 *
 * Structure des pages :
 * - Page 1 : Lettre d'accompagnement nominative & personnalisée
 * - Page 2 : Synthèse du projet & Grand visuel toiture (Calepinage HD) + KPI
 * - Page 3 : Comparatif des solutions de financement (Gain net cumulé 20 ans)
 * - Page 4 : Détail de l'analyse énergétique (Graphiques & Autoconsommation)
 * - Page 5 (Optionnelle) : Tableau synthétique d'amortissement sur 20 ans
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64';
import {
  calculateThirdPartyFinancing,
  calculateBankLoan,
  calculateLeasingSubscription,
  calculateAllFinancingScenarios
} from '@/services/solarFinancingEngine';
import { generateBeforeAfterDualSnapshot, generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';

// Helper pour formater les devises sans décimales inutiles
const fmtEuro = (val) => {
  const num = Math.round(Number(val) || 0);
  return num.toLocaleString('fr-FR') + ' €';
};

// Helper pour formater les nombres
const fmtNum = (val) => {
  const num = Math.round(Number(val) || 0);
  return num.toLocaleString('fr-FR');
};

/**
 * Génère le graphique mensuel de production (Janvier à Décembre) sous forme de Canvas DataURL
 */
function generateMonthlyProductionChartImage(annualProdKwh, width = 720, height = 220) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fond blanc pur
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Distribution mensuelle type en France métropolitaine (%)
  const monthlyCoeffs = [
    0.035, 0.050, 0.085, 0.105, 0.125, 0.135,
    0.140, 0.130, 0.100, 0.075, 0.040, 0.030
  ];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyValues = monthlyCoeffs.map(c => Math.round(annualProdKwh * c));
  const maxVal = Math.max(...monthlyValues) * 1.15 || 1;

  const padLeft = 55;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Lignes de grille horizontales
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padTop + (chartH * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    const gridVal = Math.round(maxVal * (1 - i / gridLines));
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(gridVal / 1000)}k`, padLeft - 8, y + 3);
  }

  // Barres mensuelles
  const barCount = 12;
  const totalBarSpace = chartW / barCount;
  const barWidth = totalBarSpace * 0.65;

  monthlyValues.forEach((val, idx) => {
    const x = padLeft + idx * totalBarSpace + (totalBarSpace - barWidth) / 2;
    const barH = (val / maxVal) * chartH;
    const y = padTop + chartH - barH;

    // Dégradé pour la barre
    const grad = ctx.createLinearGradient(x, y, x, y + barH);
    if (idx >= 4 && idx <= 7) {
      // Mois d'été (Jaune/Or solaire à Cyan)
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#0284c7');
    } else {
      // Autres mois (Cyan à Bleu marine)
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#0e2b4d');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    const radius = 4;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Valeur au-dessus de la barre
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(val / 1000)}k`, x + barWidth / 2, y - 5);

    // Label du mois sous la barre
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText(months[idx], x + barWidth / 2, height - padBottom + 16);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Génère le graphique journalier type (Production en cloche vs Consommation sur site)
 */
function generateDailyAutoconsoCurveImage(width = 720, height = 210, withBattery = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fond blanc pur
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Lignes de grille
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padTop + (chartH * i) / 3;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  // Heures (0h à 24h)
  const hours = [0, 4, 8, 12, 16, 20, 24];
  hours.forEach(h => {
    const x = padLeft + (h / 24) * chartW;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${h}h`, x, height - padBottom + 16);
  });

  // 1. Profil de consommation (Charge industrielle/tertiaire plateau entre 8h et 18h)
  ctx.beginPath();
  for (let h = 0; h <= 24; h += 0.5) {
    const x = padLeft + (h / 24) * chartW;
    let loadFactor = 0.20;
    if (h >= 7 && h <= 18) {
      loadFactor = 0.65 + 0.15 * Math.sin(((h - 7) / 11) * Math.PI);
    } else if (h > 18 && h <= 21) {
      loadFactor = 0.40;
    }
    const y = padTop + chartH * (1 - loadFactor * 0.85);
    if (h === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Cloche de production solaire (6h à 20h, pic à 13h)
  ctx.beginPath();
  const solarPoints = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const x = padLeft + (h / 24) * chartW;
    let prodFactor = 0;
    if (h >= 6 && h <= 20) {
      prodFactor = Math.pow(Math.sin(((h - 6) / 14) * Math.PI), 2.2);
    }
    const y = padTop + chartH * (1 - prodFactor * 0.95);
    solarPoints.push({ x, y, prodFactor });
    if (h === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Remplissage sous la courbe solaire (autoconsommation vs surplus)
  ctx.lineTo(padLeft + chartW, padTop + chartH);
  ctx.lineTo(padLeft, padTop + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
  ctx.fill();

  // Si batterie activée : illustrer la zone de décharge soirée (18h-23h)
  if (withBattery) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
    const bStart = padLeft + (18 / 24) * chartW;
    const bEnd = padLeft + (23 / 24) * chartW;
    ctx.fillRect(bStart, padTop + chartH * 0.45, bEnd - bStart, chartH * 0.55);

    ctx.fillStyle = '#9333ea';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Décharge Batterie (Nuit)', (bStart + bEnd) / 2, padTop + chartH * 0.40);
  }

  // Légende
  ctx.font = 'bold 10px Arial, sans-serif';
  // Ligne solaire
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(padLeft + 10, padTop - 12, 14, 3);
  ctx.fillText('Production Solaire', padLeft + 30, padTop - 8);

  // Ligne conso
  ctx.fillStyle = '#64748b';
  ctx.fillRect(padLeft + 160, padTop - 12, 14, 3);
  ctx.fillText('Consommation du site', padLeft + 180, padTop - 8);

  return canvas.toDataURL('image/png');
}

/**
 * Moteur principal d'export PDF de l'offre commerciale
 */
export async function generateCommercialProposalPDF({
  simulation,
  options = {},
  returnBlob = false
}) {
  if (!simulation) throw new Error("Données de simulation manquantes pour la génération du PDF.");

  // Configuration issue de la modale de paramétrage
  const economicModel = options.economicModel || simulation.economicModel || 'vente_totale';
  const customTarifEdfOa = options.tarifEdfOa !== undefined ? Number(options.tarifEdfOa) : (simulation.tarifEdfOaKwh || 0.085);
  const electricityBuyPrice = options.electricityBuyPrice !== undefined ? Number(options.electricityBuyPrice) : 0.22;
  const financingChoices = options.financingChoices && options.financingChoices.length > 0
    ? options.financingChoices
    : ['tiers_investisseur', 'credit_bancaire', 'abonnement'];
  const durationYears = Number(options.durationYears || simulation.durationYears || 25);
  const siteConsumptionKwh = Number(options.siteConsumptionKwh || simulation.siteConsumptionKwh || 0);
  const includeCoverLetter = options.includeCoverLetter !== false;
  const includeAmortizationTable = options.includeAmortizationTable !== false;

  // Détection Ombrière vs Toiture
  const isOmbriere = Boolean(
    simulation.type === 'ombriere_parking' ||
    simulation.projectType === 'ombriere_parking' ||
    simulation.type === 'ombriere' ||
    simulation.isOmbriere ||
    simulation.typologyKey ||
    simulation.parkingArea
  );

  // Données de base
  const powerKwc = Math.round(Number(simulation.installedKwc || simulation.kwc || simulation.power || 100) * 10) / 10;
  const panelCount = Number(simulation.panelCount || Math.round((powerKwc * 1000) / 465));
  const roofSurface = Math.round(Number(simulation.roofSurface || simulation.area || (powerKwc * 5)) || 600);
  const parkingArea = isOmbriere
    ? Math.max(Number(simulation.parkingArea || 0), Number(simulation.rawParkingArea || 0), Math.round(Number(simulation.coveredArea || simulation.roofSurface || 0) / 0.65))
    : 0;
  const spotsCount = isOmbriere
    ? Number(simulation.spotsCount || simulation.totalShelteredSpots || Math.round(powerKwc / 2.5))
    : 0;
  const coveredArea = Math.round(Number(simulation.coveredArea || simulation.roofSurface || (powerKwc * 5)));
  const annualProdKwh = Math.round(Number(simulation.annualProductionKwh || (powerKwc * 1150)));
  const specificYield = powerKwc > 0 ? Math.round(annualProdKwh / powerKwc) : 1150;
  const capexHT = Math.round(Number(simulation.totalInvestmentHT || (powerKwc * (isOmbriere ? 1180 : 920))));

  // Visuel typologie ombrière
  let ombrierePhoto = '/ombriere_vl_double.jpg';
  const typoKey = simulation.typologyKey || simulation.typology?.id || '';
  if (typoKey.includes('pl_24') || typoKey.includes('pl_20')) ombrierePhoto = '/ombriere_pl_large.jpg';
  else if (typoKey.includes('pl')) ombrierePhoto = '/ombriere_pl.jpg';
  else if (typoKey.includes('simple_droite')) ombrierePhoto = '/ombriere_vl_simple_droite.jpg';
  else if (typoKey.includes('simple')) ombrierePhoto = '/ombriere_vl_simple_gauche.jpg';
  else if (typoKey.includes('double_plus')) ombrierePhoto = '/ombriere_vl_double_plus.jpg';

  // Client & Localisation
  const clientName = options.clientName || simulation.clientName || simulation.ownerName || 'Bénéficiaire du projet';
  const clientAddress = simulation.address || `${simulation.cityName || 'Bâtiment'} (${simulation.departmentCode || 'France'})`;
  const cadastreRef = simulation.cadastreRef || (Array.isArray(simulation.cadastreParcels) ? simulation.cadastreParcels.join(', ') : null);

  // Caractéristiques toiture & orientation
  const pitch = simulation.pitch !== undefined ? simulation.pitch : (isOmbriere ? 10 : 15);
  const isTerrasse = !isOmbriere && (pitch === 0 || simulation.isTerrasse);
  const roofTypeLabel = isOmbriere
    ? (simulation.typology?.label || 'Ombrière Photovoltaïque Métallique')
    : (isTerrasse ? 'Toiture Terrasse (bacs lestés)' : (simulation.roofType === 'symetrique' ? 'Bi-pente symétrique' : 'Toiture industrielle inclinée'));
  const orientationLabel = simulation.orientationLabel || (isOmbriere ? 'Plein Sud (180°)' : 'Orientation Sud optimisée');
  const googleSolar = simulation.googleSolar || null;
  const sunshineHours = googleSolar?.maxSunshineHoursPerYear || 0;

  // Calculs financiers selon modèle
  let annualGain = 0;
  let autoconsoKwh = 0;
  let surplusKwh = annualProdKwh;
  let autoconsoRate = 0;

  if (economicModel === 'vente_totale') {
    annualGain = Math.round(annualProdKwh * customTarifEdfOa);
  } else if (economicModel === 'autoconsommation') {
    autoconsoRate = 65;
    autoconsoKwh = Math.round(annualProdKwh * 0.65);
    surplusKwh = Math.round(annualProdKwh * 0.35);
    annualGain = Math.round((autoconsoKwh * electricityBuyPrice) + (surplusKwh * customTarifEdfOa));
  } else if (economicModel === 'autoconsommation_stockage') {
    autoconsoRate = 95;
    autoconsoKwh = Math.round(annualProdKwh * 0.95);
    surplusKwh = Math.round(annualProdKwh * 0.05);
    annualGain = Math.round((autoconsoKwh * electricityBuyPrice) + (surplusKwh * customTarifEdfOa));
  }

  // Cumul sur la durée d'étude choisie (20, 25 ou 30 ans) avec dégradation nominale (0.5%/an)
  let cumulStudyYears = 0;
  for (let yr = 1; yr <= durationYears; yr++) {
    const deg = Math.pow(0.995, yr - 1);
    cumulStudyYears += Math.round(annualGain * deg);
  }

  // Impact écologique
  const co2Avoided = ((annualProdKwh * 0.0005)).toFixed(1).replace('.', ',');
  const treesPlanted = Math.round(annualProdKwh * 0.0014);

  // 3 Solutions de Financement comparées
  const tiersFinancing = calculateThirdPartyFinancing({
    powerKwc,
    annualRevenue: annualGain,
    rentMultiplier: 14
  });
  const tiersRent = tiersFinancing.annualRentFixed;
  const tiersCumul = tiersRent * durationYears;

  const bankLoan = calculateBankLoan({
    capexHT,
    durationYears: Math.min(25, durationYears),
    annualRevenue: annualGain,
    interestRate: 0.0448
  });
  const bankMonthly = Math.round(bankLoan.monthlyPaymentExact);
  const bankAnnualNet = bankLoan.annualNetCashflow;
  const bankCumul = bankAnnualNet * durationYears;

  const leasing = calculateLeasingSubscription({
    capexHT,
    powerKwc,
    annualRevenue: annualGain
  });
  const selectedLeas = leasing.durations?.find(d => d.years === durationYears) || leasing.durations?.[2] || leasing.durations?.[0] || {};
  const leasingMonthly = Number(selectedLeas.monthlyPaymentHT || Math.round(bankMonthly * 1.05));
  const leasingAnnualNet = Number(selectedLeas.annualNetCashflowPostIS || Math.round(annualGain - (leasingMonthly * 12)));
  const leasingCumul = leasingAnnualNet * durationYears;

  // Snapshot satellite
  let mapVisualDataUrl = simulation.mapScreenshot || simulation.beforeAfterSnapshot || null;
  if (!mapVisualDataUrl) {
    try {
      const snap = await generateBeforeAfterDualSnapshot({
        center: simulation.mapCenter || [44.8412, -0.5805],
        polygonPoints: simulation.polygonPoints || [],
        polygonStyle: isOmbriere ? 'parking' : 'roof',
        ombriereBlocks: simulation.placedOmbrieres || simulation.ombriereBlocks || null,
        parkingArea: parkingArea || null,
        spotsCount: spotsCount || null,
        customKwc: powerKwc,
        roofSurface: isOmbriere ? coveredArea : roofSurface,
        width: 900,
        height: 480,
        zoom: 19
      });
      mapVisualDataUrl = snap && typeof snap === 'object' && snap.dataUrl ? snap.dataUrl : snap;
    } catch (e) {
      console.warn("Satellite snapshot fallback:", e);
    }
  }

  // Graphiques pré-générés en DataURL
  const monthlyChartImg = generateMonthlyProductionChartImage(annualProdKwh);
  const dailyCurveImg = generateDailyAutoconsoCurveImage(720, 190, economicModel === 'autoconsommation_stockage');

  // Initialisation du PDF jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  const pdfWidth = 210;
  const pdfHeight = 297;

  // Style universel des conteneurs A4
  const createPageContainer = () => {
    const el = document.createElement('div');
    el.style.width = '794px';
    el.style.maxWidth = '794px';
    el.style.height = '1123px';
    el.style.minHeight = '1123px';
    el.style.maxHeight = '1123px';
    el.style.boxSizing = 'border-box';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    el.style.padding = '36px 42px';
    el.style.background = '#ffffff';
    el.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    el.style.color = '#0f172a';
    el.style.overflow = 'hidden';
    el.style.wordWrap = 'break-word';
    el.style.overflowWrap = 'break-word';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.justifyContent = 'space-between';
    return el;
  };

  const renderPageToPdf = async (pageEl, isFirst = false) => {
    document.body.appendChild(pageEl);
    try {
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (!isFirst) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    } finally {
      document.body.removeChild(pageEl);
    }
  };

  // Libellés du modèle économique
  const modelLabels = {
    vente_totale: 'Vente Totale (Contrat EDF OA 20 ans)',
    autoconsommation: 'Autoconsommation avec Vente du Surplus',
    autoconsommation_stockage: 'Autoconsommation avec Batterie de Stockage'
  };
  const economicModelLabel = modelLabels[economicModel] || 'Centrale Photovoltaïque';

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 1 : LETTRE D'ACCOMPAGNEMENT NOMINATIVE
  // ═════════════════════════════════════════════════════════════════════════
  if (includeCoverLetter) {
    const page1 = createPageContainer();
    const todayFormatted = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    page1.innerHTML = `
      <div>
        <!-- EN-TÊTE OFFICIEL ENR COURTAGE -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0e2b4d; padding-bottom: 16px;">
          <div>
            <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR Courtage" style="height: 46px; object-fit: contain;" />
          </div>
          <div style="text-align: right; font-size: 8.5pt; color: #475569; line-height: 1.4;">
            <strong style="color: #0e2b4d; font-size: 9.5pt;">ENR COURTAGE</strong><br/>
            Ingénierie &amp; Développement Photovoltaïque<br/>
            33000 Bordeaux &bull; contact@enr-courtage.fr<br/>
            <span style="color: #0284c7; font-weight: bold;">07 63 87 71 40</span>
          </div>
        </div>

        <!-- DATE & BLOC DESTINATAIRE -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 26px;">
          <div style="font-size: 9pt; color: #64748b;">
            Fait à Bordeaux, le ${todayFormatted}<br/>
            <span style="font-weight: 700; color: #0e2b4d;">Réf : OFF-${Math.round(powerKwc)}KW-${new Date().getFullYear()}</span>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0e2b4d; border-radius: 8px; padding: 14px 18px; width: 320px; font-size: 9.5pt; line-height: 1.45;">
            <div style="font-weight: 900; color: #0e2b4d; font-size: 10.5pt; margin-bottom: 3px;">${clientName}</div>
            <div style="color: #334155;">${clientAddress}</div>
            ${cadastreRef ? `<div style="font-size: 8pt; color: #64748b; margin-top: 4px;">Parcelle cadastrale : <strong>${cadastreRef}</strong></div>` : ''}
          </div>
        </div>

        <!-- OBJET DU COURRIER -->
        <div style="margin-top: 28px; padding: 12px 16px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px; font-size: 10pt; font-weight: 800; color: #065f46;">
          ${isOmbriere
            ? `Objet : Proposition d'Implantation d'Ombrières Photovoltaïques — Centrale de ${powerKwc} kWc (${spotsCount} places abritées)`
            : `Objet : Étude d'opportunité &amp; Valorisation solaire de toiture — Centrale de ${powerKwc} kWc (${economicModelLabel})`
          }
        </div>

        <!-- CORPS DE LA LETTRE -->
        <div style="margin-top: 22px; font-size: 9.6pt; line-height: 1.6; color: #1e293b; text-align: justify;">
          <p style="margin-bottom: 12px;"><strong>Madame, Monsieur,</strong></p>

          <p style="margin-bottom: 12px;">
            Dans le cadre du déploiement de notre programme régional de valorisation énergétique, notre bureau d'études a conduit une analyse géospatiale et cadastrale approfondie ${isOmbriere ? `de votre parcelle et aire de stationnement située <strong>${clientAddress}</strong>.` : `de votre toiture située <strong>${clientAddress}</strong>.`}
          </p>

          <p style="margin-bottom: 12px;">
            ${isOmbriere
              ? `Grâce à l'analyse géométrique de votre parking d'une emprise nette de <strong>${fmtNum(parkingArea)} m²</strong>, nous avons configuré une centrale d'ombrières solaires de <strong>${powerKwc} kWc</strong> abritant <strong>${spotsCount} places de stationnement</strong> (${panelCount} modules photovoltaïques haute performance). Cette infrastructure permet de valoriser vos surfaces foncières tout en générant annuellement environ <strong>${fmtNum(annualProdKwh)} kWh</strong> d'électricité verte.`
              : `Grâce à l'analyse de votre gisement solaire ${sunshineHours > 0 ? `(potentiel certifié Google Solar de <strong>${Math.round(sunshineHours)} heures d'ensoleillement/an</strong>)` : ''} et à votre surface de toiture disponible d'environ <strong>${roofSurface} m²</strong>, nous avons configuré une installation solaire optimale de <strong>${powerKwc} kWc</strong> (${panelCount} modules photovoltaïques 465 Wc haute performance). Ce projet permettra de générer annuellement environ <strong>${fmtNum(annualProdKwh)} kWh</strong> d'électricité verte.`
            }
          </p>

          <p style="margin-bottom: 12px;">
            ${economicModel === 'vente_totale'
              ? `Sur le modèle de la <strong>Vente Totale à EDF Obligation d'Achat</strong>, votre installation devient un actif patrimonial sécurisé produisant un chiffre d'affaires annuel garanti par l'État d'environ <strong>${fmtEuro(annualGain)}/an sur ${durationYears} ans</strong> au tarif réglementé de <strong>${customTarifEdfOa} €/kWh</strong>, sans aucun impact sur votre activité.`
              : economicModel === 'autoconsommation_stockage'
              ? `En combinant <strong>Autoconsommation et Batterie de Stockage</strong>, vous atteignez un taux d'autonomie remarquable (~95%). Vos gains et économies annuels estimés s'élèvent à <strong>${fmtEuro(annualGain)} dès la première année</strong>, tout en effaçant vos consommations en heures pleines.`
              : `En privilégiant l'<strong>Autoconsommation avec Vente du Surplus</strong>, vous couvrez immédiatement une part substantielle de vos besoins énergétiques sur site tout en revendant les excédents à EDF OA. Vos gains et économies annuels s'élèvent à environ <strong>${fmtEuro(annualGain)} dès l'année 1</strong>.`
            }
          </p>

          <p style="margin-bottom: 16px;">
            Afin de vous offrir une vision stratégique complète, nous avons mis en concurrence les différentes options de financement (Tiers-Investisseur à 0 € d'apport, Crédit Bancaire autofinancé ou Abonnement leasing). Vous trouverez ci-après la synthèse technique, l'analyse comparative et la trajectoire financière de votre centrale sur ${durationYears} ans.
          </p>
        </div>

        <!-- SIGNATURE OFFICIELLE -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 8pt; color: #64748b; font-style: italic;">
            Document d'ingénierie préliminaire confidentiel &bull; ENR Courtage Énergie
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11pt; font-weight: 900; color: #0e2b4d;">Yann BARBERIS</div>
            <div style="font-size: 8.8pt; color: #475569; font-weight: 600;">Conseiller Solutions Énergies &amp; Ingénierie Solaire</div>
            <div style="font-size: 9pt; color: #0284c7; font-weight: 700; margin-top: 2px;">07 63 87 71 40 &bull; contact@enr-courtage.fr</div>
          </div>
        </div>
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8;">
        <span style="font-weight: 700; color: #0e2b4d;">ENR COURTAGE &bull; enr-courtage.fr</span>
        <span>SAS au capital de 10 000 € &bull; RCS Bordeaux</span>
        <span>Page 1 / ${includeAmortizationTable ? '5' : '4'}</span>
      </div>
    `;

    await renderPageToPdf(page1, true);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 2 : SYNTHÈSE DU PROJET & VISUELS (SATELLITE + RENDU TYPOLOGIE) + KPI
  // ═════════════════════════════════════════════════════════════════════════
  {
    const page2 = createPageContainer();
    page2.innerHTML = `
      <div>
        <!-- EN-TÊTE PAGE 2 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0e2b4d; padding-bottom: 12px;">
          <div>
            <div style="font-size: 13pt; font-weight: 900; color: #0e2b4d; letter-spacing: -0.5px;">
              ${isOmbriere ? 'SYNTHÈSE DU PROJET &amp; IMPLANTATION OMBRIÈRES DE PARKING' : 'SYNTHÈSE DU PROJET &amp; IMPLANTATION SOLAIRE'}
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
              ${isOmbriere ? `Centrale d'Ombrières ${powerKwc} kWc (${spotsCount} places) &bull; ${clientAddress}` : `Centrale Photovoltaïque ${powerKwc} kWc &bull; ${clientAddress}`}
            </div>
          </div>
          <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR Courtage" style="height: 36px; object-fit: contain;" />
        </div>

        <!-- SECTION VISUELS : DUAL SATELLITE + RENDU STRUCTURE 3D POUR OMBRIÈRE -->
        ${isOmbriere ? `
          <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 10px; margin-top: 14px; height: 250px; max-height: 250px;">
            <div style="border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #0f172a; position: relative; height: 100%;">
              ${mapVisualDataUrl
                ? `<img src="${mapVisualDataUrl}" alt="Implantation satellite ombrières" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<div style="color: #94a3b8; font-size: 10pt; font-weight: bold; text-align: center; padding: 20px;">Vue Satellite &amp; Calepinage Ombrières</div>`
              }
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(14, 43, 77, 0.92); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 7.5pt; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 6px rgba(0,0,0,0.4); z-index: 10;">
                🅿️ Emprise : ${fmtNum(parkingArea)} m² &bull; Ombrières : ${coveredArea} m²
              </div>
            </div>
            <div style="border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #f8fafc; position: relative; height: 100%;">
              <img src="${ombrierePhoto}" alt="Rendu typologie ombrière" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; background: rgba(15, 23, 42, 0.90); color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 7.2pt; font-weight: bold; text-align: center; border: 1px solid rgba(255,255,255,0.2); z-index: 10;">
                ${roofTypeLabel} &bull; ${spotsCount} places
              </div>
            </div>
          </div>
        ` : `
          <!-- GRAND VISUEL DE TOITURE (CALEPINAGE HD) -->
          <div style="margin-top: 14px; border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #0f172a; position: relative; height: 260px; max-height: 260px; max-width: 100%; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
            ${mapVisualDataUrl
              ? `<img src="${mapVisualDataUrl}" alt="Implantation toiture" style="width: 100%; height: 100%; max-height: 260px; object-fit: cover;" />`
              : `<div style="color: #94a3b8; font-size: 11pt; font-weight: bold;">Vue Satellite &amp; Calepinage Solaire</div>`
            }
            <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(14, 43, 77, 0.92); color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 8.5pt; font-weight: 800; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.25); white-space: nowrap; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              📐 ${roofSurface} m² de toiture &bull; ${panelCount} modules 465 Wc
            </div>
            ${googleSolar?.maxSunshineHoursPerYear ? `
              <div style="position: absolute; bottom: 10px; right: 12px; background: rgba(16, 185, 129, 0.92); color: #ffffff; padding: 5px 12px; border-radius: 20px; font-size: 8pt; font-weight: 800; backdrop-filter: blur(4px); z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                ☀️ Données Google Solar 3D : ${Math.round(googleSolar.maxSunshineHoursPerYear)} h/an
              </div>
            ` : ''}
          </div>
        `}

        <!-- GRILLE DE 6 CARTES KPI PRINCIPALES -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px;">
          <!-- Carte 1 : Puissance -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #0284c7; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Puissance Crête</div>
            <div style="font-size: 17pt; font-weight: 900; color: #0e2b4d; margin-top: 3px;">${powerKwc} <span style="font-size: 11pt;">kWc</span></div>
            <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">${panelCount} modules 465 Wc Tier-1</div>
          </div>

          <!-- Carte 2 : Productible -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #10b981; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Productible Annuel</div>
            <div style="font-size: 17pt; font-weight: 900; color: #065f46; margin-top: 3px;">${fmtNum(annualProdKwh)} <span style="font-size: 11pt;">kWh/an</span></div>
            <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">Rendement : ~${specificYield} kWh/kWc</div>
          </div>

          <!-- Carte 3 : Gain Annuel -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #f59e0b; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Gains &amp; Économies An 1</div>
            <div style="font-size: 17pt; font-weight: 900; color: #b45309; margin-top: 3px;">${fmtEuro(annualGain)}<span style="font-size: 10pt;">/an</span></div>
            <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">${economicModel === 'vente_totale' ? `Tarif OA : ${customTarifEdfOa} €/kWh` : 'Facture allégée + surplus'}</div>
          </div>

          <!-- Carte 4 : Gain cumulé -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-top: 3px solid #059669; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 8pt; font-weight: 800; color: #065f46; text-transform: uppercase;">Gain Net Cumulé ${durationYears} ans</div>
            <div style="font-size: 17pt; font-weight: 900; color: #047857; margin-top: 3px;">+${fmtEuro(cumulStudyYears)}</div>
            <div style="font-size: 7.8pt; color: #059669; margin-top: 2px;">Valorisation nette cumulée</div>
          </div>

          <!-- Carte 5 : Surface / Emprise -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #8b5cf6; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase;">${isOmbriere ? 'Emprise & Places' : 'Surface Toiture'}</div>
            <div style="font-size: 17pt; font-weight: 900; color: #5b21b6; margin-top: 3px;">${isOmbriere ? `${spotsCount} pl.` : `${roofSurface} m²`}</div>
            <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">${isOmbriere ? `Parking : ${fmtNum(parkingArea)} m² (${coveredArea} m² d'ombrières)` : roofTypeLabel}</div>
          </div>

          <!-- Carte 6 : Impact Carbone -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #14b8a6; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Bilan Écologique</div>
            <div style="font-size: 17pt; font-weight: 900; color: #0f766e; margin-top: 3px;">${co2Avoided} <span style="font-size: 11pt;">t CO₂/an</span></div>
            <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">Équivaut à ~${fmtNum(treesPlanted)} arbres</div>
          </div>
        </div>

        <!-- FICHE TECHNIQUE SYNTHÉTIQUE -->
        <div style="margin-top: 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #0e2b4d; color: #ffffff; padding: 8px 14px; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            Caractéristiques Techniques &amp; Exposition Solaire
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); padding: 12px 16px; gap: 10px; font-size: 8.8pt; color: #334155;">
            <div>&bull; <strong>Orientation &amp; Azimut :</strong> ${orientationLabel}</div>
            <div>&bull; <strong>${isOmbriere ? 'Typologie structure :' : 'Inclinaison toiture :'}</strong> ${isOmbriere ? `${roofTypeLabel} (pente ${pitch}°)` : (pitch === 0 ? 'Toiture Terrasse (0° avec bacs 15°)' : `${pitch}°`)}</div>
            <div>&bull; <strong>${isOmbriere ? 'Places & Emprise couverte :' : 'Ensoleillement moyen :'}</strong> ${isOmbriere ? `${spotsCount} places abritées (${coveredArea} m² d'ombrières)` : (sunshineHours > 0 ? `${Math.round(sunshineHours)} h/an (Relevé Google Solar)` : '1 350 à 1 500 h/an (Gisement régional)')}</div>
            <div>&bull; <strong>Raccordement réseau :</strong> Injection Enedis sécurisée (Poste HTA/BT)</div>
            <div>&bull; <strong>Garantie matériel :</strong> ${isOmbriere ? 'Structure métallique 30 ans &bull; Modules 25 ans' : 'Modules 25 ans &bull; Onduleurs 10 à 20 ans'}</div>
            <div>&bull; <strong>Référence cadastrale :</strong> ${cadastreRef || 'Parcelle répertoriée IGN'}</div>
          </div>
        </div>
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8;">
        <span style="font-weight: 700; color: #0e2b4d;">ENR COURTAGE &bull; enr-courtage.fr</span>
        <span>Centrale ${powerKwc} kWc &bull; Offre Commerciale</span>
        <span>Page 2 / ${includeAmortizationTable ? '5' : '4'}</span>
      </div>
    `;

    await renderPageToPdf(page2);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 3 : COMPARATIF DES SOLUTIONS DE FINANCEMENT (GAIN NET 20 ANS)
  // ═════════════════════════════════════════════════════════════════════════
  {
    const page3 = createPageContainer();
    const colsCount = financingChoices.length || 3;

    // Définition des blocs pour chaque solution
    const financingBlocks = [];

    if (financingChoices.includes('tiers_investisseur')) {
      financingBlocks.push(`
        <div style="flex: 1; min-width: 0; background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 4px solid #7c3aed; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 7.5pt; font-weight: 900; background: #ede9fe; color: #6d28d9; padding: 3px 8px; border-radius: 12px; text-transform: uppercase;">0 € D'APPORT</span>
              <span style="font-size: 11pt;">🛡️</span>
            </div>
            <div style="font-size: 12pt; font-weight: 900; color: #0e2b4d; margin-bottom: 2px;">Tiers-Investisseur</div>
            <div style="font-size: 7.8pt; color: #64748b; margin-bottom: 12px;">Bail emphytéotique &bull; Risque zéro</div>

            <!-- GAIN ANNUEL & CUMULÉ MIS EN AVANT -->
            <div style="background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 14px;">
              <div style="font-size: 7.5pt; font-weight: 800; color: #6b21a8; text-transform: uppercase;">Gain Net Cumulé ${durationYears} ans</div>
              <div style="font-size: 16pt; font-weight: 900; color: #7c3aed; margin-top: 2px;">+${fmtEuro(tiersCumul)}</div>
              <div style="font-size: 7.5pt; color: #7e22ce;">Loyer garanti net d'impôt</div>
            </div>

            <!-- DÉTAILS DU MODÈLE -->
            <div style="font-size: 8.5pt; color: #334155; line-height: 1.6;">
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Investissement client :</strong> 0 € HT</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Loyer annuel garanti :</strong> +${fmtEuro(tiersRent)}/an</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Maintenance &amp; Entretien :</strong> 100% inclus</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Assurance &amp; Risque :</strong> Porté par le tiers</div>
              <div style="padding-top: 4px;">&bull; <strong>Propriété :</strong> Tiers (bail ${durationYears} ans)</div>
            </div>
          </div>

          <div style="margin-top: 14px; padding: 8px; background: #f8fafc; border-radius: 6px; font-size: 7.8pt; color: #475569; text-align: center; font-weight: 600;">
            ${isOmbriere ? 'Idéal pour valoriser le parking sans mobiliser de trésorerie ni d\'endettement.' : 'Idéal pour monétiser la toiture sans mobiliser de trésorerie ni d\'endettement.'}
          </div>
        </div>
      `);
    }

    if (financingChoices.includes('credit_bancaire')) {
      financingBlocks.push(`
        <div style="flex: 1; min-width: 0; background: #ffffff; border: 1.5px solid #93c5fd; border-top: 4px solid #0284c7; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; box-shadow: 0 4px 8px rgba(2,132,199,0.08);">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 7.5pt; font-weight: 900; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 12px; text-transform: uppercase;">PROPRIÉTAIRE J1</span>
              <span style="font-size: 11pt;">🏦</span>
            </div>
            <div style="font-size: 12pt; font-weight: 900; color: #0e2b4d; margin-bottom: 2px;">Crédit Bancaire</div>
            <div style="font-size: 7.8pt; color: #64748b; margin-bottom: 12px;">Emprunt pro &bull; Rentabilité maximale</div>

            <!-- GAIN ANNUEL & CUMULÉ MIS EN AVANT -->
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 14px;">
              <div style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase;">Gain Net Cumulé ${durationYears} ans</div>
              <div style="font-size: 16pt; font-weight: 900; color: #15803d; margin-top: 2px;">+${fmtEuro(bankCumul)}</div>
              <div style="font-size: 7.5pt; color: #15803d;">Après remboursement total du prêt</div>
            </div>

            <!-- DÉTAILS DU MODÈLE -->
            <div style="font-size: 8.5pt; color: #334155; line-height: 1.6;">
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Montant financé :</strong> ${fmtEuro(capexHT)} HT</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Mensualité emprunt (${Math.min(25, durationYears)} ans) :</strong> ~${fmtEuro(bankMonthly)}/mois</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Cashflow net annuel moyen :</strong> +${fmtEuro(bankAnnualNet)}/an</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Taux estimé du prêt :</strong> ~4,48 %</div>
              <div style="padding-top: 4px;">&bull; <strong>Propriété :</strong> 100% Client dès le 1er jour</div>
            </div>
          </div>

          <div style="margin-top: 14px; padding: 8px; background: #eff6ff; border-radius: 6px; font-size: 7.8pt; color: #1e40af; text-align: center; font-weight: 600;">
            Option la plus rémunératrice : les recettes couvrent intégralement le crédit.
          </div>
        </div>
      `);
    }

    if (financingChoices.includes('abonnement')) {
      financingBlocks.push(`
        <div style="flex: 1; min-width: 0; background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 4px solid #10b981; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 7.5pt; font-weight: 900; background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; text-transform: uppercase;">LOCATION &bull; LOA</span>
              <span style="font-size: 11pt;">⚡</span>
            </div>
            <div style="font-size: 12pt; font-weight: 900; color: #0e2b4d; margin-bottom: 2px;">Abonnement Solaire</div>
            <div style="font-size: 7.8pt; color: #64748b; margin-bottom: 12px;">Location financière &bull; Option d'achat</div>

            <!-- GAIN ANNUEL & CUMULÉ MIS EN AVANT -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 14px;">
              <div style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase;">Gain Net Cumulé ${durationYears} ans</div>
              <div style="font-size: 16pt; font-weight: 900; color: #059669; margin-top: 2px;">+${fmtEuro(leasingCumul)}</div>
              <div style="font-size: 7.5pt; color: #047857;">Option rachat comprise</div>
            </div>

            <!-- DÉTAILS DU MODÈLE -->
            <div style="font-size: 8.5pt; color: #334155; line-height: 1.6;">
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Investissement initial :</strong> 0 € HT (hors apport)</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Loyer mensuel leasing :</strong> ~${fmtEuro(leasingMonthly)}/mois</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Cashflow net annuel moyen :</strong> +${fmtEuro(leasingAnnualNet)}/an</div>
              <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">&bull; <strong>Fiscalité :</strong> Loyers déductibles du résultat</div>
              <div style="padding-top: 4px;">&bull; <strong>Rachat :</strong> Option d'achat à valeur résiduelle</div>
            </div>
          </div>

          <div style="margin-top: 14px; padding: 8px; background: #f0fdf4; border-radius: 6px; font-size: 7.8pt; color: #166534; text-align: center; font-weight: 600;">
            Allie la souplesse d'un abonnement mensuel et la possibilité de devenir propriétaire.
          </div>
        </div>
      `);
    }

    page3.innerHTML = `
      <div>
        <!-- EN-TÊTE PAGE 3 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0e2b4d; padding-bottom: 12px;">
          <div>
            <div style="font-size: 13pt; font-weight: 900; color: #0e2b4d; letter-spacing: -0.5px;">
              COMPARATIF DES SOLUTIONS DE FINANCEMENT
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
              Analyse comparative des modèles de valorisation sur ${durationYears} ans &bull; Centrale ${powerKwc} kWc
            </div>
          </div>
          <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR Courtage" style="height: 36px; object-fit: contain;" />
        </div>

        <!-- GRILLE COMPARATIVE DYNAMIQUE -->
        <div style="display: flex; gap: 14px; margin-top: 18px; min-height: 430px;">
          ${financingBlocks.join('')}
        </div>

        <!-- TABLEAU SYNTHÉTIQUE DES DIFFÉRENCES CLÉS -->
        <div style="margin-top: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 8.2pt; text-align: left;">
            <thead>
              <tr style="background: #0e2b4d; color: #ffffff;">
                <th style="padding: 9px 12px; font-weight: 800;">Critères de Décision</th>
                ${financingChoices.includes('tiers_investisseur') ? '<th style="padding: 9px 12px; text-align: center; font-weight: 800;">Tiers-Investisseur</th>' : ''}
                ${financingChoices.includes('credit_bancaire') ? '<th style="padding: 9px 12px; text-align: center; font-weight: 800; background: #0284c7;">Crédit Bancaire</th>' : ''}
                ${financingChoices.includes('abonnement') ? '<th style="padding: 9px 12px; text-align: center; font-weight: 800;">Abonnement Solaire</th>' : ''}
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 12px; font-weight: 700; color: #334155;">Impact Bilan &amp; Endettement</td>
                ${financingChoices.includes('tiers_investisseur') ? '<td style="padding: 8px 12px; text-align: center; color: #059669; font-weight: bold;">Neutre (Hors bilan)</td>' : ''}
                ${financingChoices.includes('credit_bancaire') ? '<td style="padding: 8px 12px; text-align: center; color: #1e293b;">Dette pro amortie</td>' : ''}
                ${financingChoices.includes('abonnement') ? '<td style="padding: 8px 12px; text-align: center; color: #059669; font-weight: bold;">Loyers d\'exploitation</td>' : ''}
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                <td style="padding: 8px 12px; font-weight: 700; color: #334155;">Risque d\'Exploitation &amp; Maintenance</td>
                ${financingChoices.includes('tiers_investisseur') ? '<td style="padding: 8px 12px; text-align: center; color: #059669; font-weight: bold;">Zéro risque (Assuré tiers)</td>' : ''}
                ${financingChoices.includes('credit_bancaire') ? '<td style="padding: 8px 12px; text-align: center; color: #1e293b;">Garantie constructeur 25 ans</td>' : ''}
                ${financingChoices.includes('abonnement') ? '<td style="padding: 8px 12px; text-align: center; color: #059669; font-weight: bold;">Maintenance incluse</td>' : ''}
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: 700; color: #334155;">Recommandation Stratégique</td>
                ${financingChoices.includes('tiers_investisseur') ? '<td style="padding: 8px 12px; text-align: center; color: #6d28d9; font-weight: 700;">Monétisation passive</td>' : ''}
                ${financingChoices.includes('credit_bancaire') ? '<td style="padding: 8px 12px; text-align: center; color: #0284c7; font-weight: 800;">Création de valeur max</td>' : ''}
                ${financingChoices.includes('abonnement') ? '<td style="padding: 8px 12px; text-align: center; color: #059669; font-weight: 700;">Souplesse &amp; Rachat</td>' : ''}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8;">
        <span style="font-weight: 700; color: #0e2b4d;">ENR COURTAGE &bull; enr-courtage.fr</span>
        <span>Comparatif Financement &bull; Offre Commerciale</span>
        <span>Page 3 / ${includeAmortizationTable ? '5' : '4'}</span>
      </div>
    `;

    await renderPageToPdf(page3);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 4 : DÉTAIL DE L'ANALYSE ÉNERGÉTIQUE & PROFILS
  // ═════════════════════════════════════════════════════════════════════════
  {
    const page4 = createPageContainer();
    page4.innerHTML = `
      <div>
        <!-- EN-TÊTE PAGE 4 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0e2b4d; padding-bottom: 12px;">
          <div>
            <div style="font-size: 13pt; font-weight: 900; color: #0e2b4d; letter-spacing: -0.5px;">
              ANALYSE ÉNERGÉTIQUE &amp; PROFIL DE PRODUCTION
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
              Comportement saisonnier et valorisation de l'électricité produite &bull; ${fmtNum(annualProdKwh)} kWh/an
            </div>
          </div>
          <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR Courtage" style="height: 36px; object-fit: contain;" />
        </div>

        ${siteConsumptionKwh > 0 ? `
          <!-- CARTE CONSOMMATION DU SITE & COUVERTURE -->
          <div style="margin-top: 14px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 8pt; font-weight: 800; color: #166534; text-transform: uppercase;">Bilan Consommation Site vs Production Solaire</div>
              <div style="font-size: 10.5pt; font-weight: 900; color: #065f46; margin-top: 2px;">
                Consommation annuelle : <strong>${fmtNum(siteConsumptionKwh)} kWh/an</strong> &bull; Production centrale : <strong>${fmtNum(annualProdKwh)} kWh/an</strong>
              </div>
              <div style="font-size: 7.8pt; color: #166534; margin-top: 2px;">
                ${isOmbriere ? 'Ombrières photovoltaïques adaptées aux besoins énergétiques de votre site.' : 'Installation toiture calibrée selon vos consommations réelles.'}
              </div>
            </div>
            <div style="text-align: right; background: #ffffff; border: 1px solid #bbf7d0; padding: 6px 14px; border-radius: 8px;">
              <div style="font-size: 7.5pt; color: #64748b; font-weight: bold;">Taux de Couverture</div>
              <div style="font-size: 15pt; font-weight: 900; color: #15803d;">${Math.min(100, Math.round((annualProdKwh / siteConsumptionKwh) * 100))} %</div>
            </div>
          </div>
        ` : ''}

        <!-- GRAPHIQUE 1 : HISTOGRAMME DE PRODUCTION MENSUELLE -->
        <div style="margin-top: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 9.5pt; font-weight: 800; color: #0e2b4d;">
              Distribution Mensuelle de l'Énergie Produite (kWh)
            </div>
            <span style="font-size: 8pt; color: #64748b; font-weight: 600;">Total annuel : ${fmtNum(annualProdKwh)} kWh</span>
          </div>
          <img src="${monthlyChartImg}" alt="Graphique mensuel" style="width: 100%; height: auto; border-radius: 6px;" />
        </div>

        <!-- SECTION SELON LE MODÈLE ÉCONOMIQUE -->
        ${economicModel !== 'vente_totale' ? `
          <!-- MODÈLE AUTOCONSOMMATION / BATTERIE -->
          <div style="margin-top: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
            <div style="font-size: 9.5pt; font-weight: 800; color: #0e2b4d; margin-bottom: 8px;">
              Profil Journalier Type : Production Solaire vs Consommation du Site
            </div>
            <img src="${dailyCurveImg}" alt="Courbe journalière" style="width: 100%; height: auto; border-radius: 6px;" />

            <!-- CARTES DE RÉPARTITION AUTOCONSO -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px;">
                <div style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase;">Autoconsommation</div>
                <div style="font-size: 14pt; font-weight: 900; color: #15803d; margin-top: 2px;">${autoconsoRate} %</div>
                <div style="font-size: 7.5pt; color: #166534;">${fmtNum(autoconsoKwh)} kWh consommés</div>
              </div>

              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px;">
                <div style="font-size: 7.5pt; font-weight: 800; color: #1e40af; text-transform: uppercase;">Surplus Réseau</div>
                <div style="font-size: 14pt; font-weight: 900; color: #1d4ed8; margin-top: 2px;">${100 - autoconsoRate} %</div>
                <div style="font-size: 7.5pt; color: #1e40af;">${fmtNum(surplusKwh)} kWh vendus à OA</div>
              </div>

              <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px;">
                <div style="font-size: 7.5pt; font-weight: 800; color: #6b21a8; text-transform: uppercase;">${economicModel === 'autoconsommation_stockage' ? 'Batterie Dédiée' : 'Économie / kWh'}</div>
                <div style="font-size: 14pt; font-weight: 900; color: #7c3aed; margin-top: 2px;">${economicModel === 'autoconsommation_stockage' ? 'Lissage Soir' : `${electricityBuyPrice} €/kWh`}</div>
                <div style="font-size: 7.5pt; color: #6b21a8;">${economicModel === 'autoconsommation_stockage' ? 'Effacement heures pleines' : 'Tarif évité'}</div>
              </div>
            </div>
          </div>
        ` : `
          <!-- MODÈLE VENTE TOTALE EDF OA -->
          <div style="margin-top: 14px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 14px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 14pt;">🏛️</span>
              <div style="font-size: 10pt; font-weight: 900; color: #0e2b4d;">
                Cadre Réglementaire du Contrat d'Achat EDF OA (20 ans garanti par l'État)
              </div>
            </div>
            <div style="font-size: 8.8pt; color: #334155; line-height: 1.55; text-align: justify;">
              <p style="margin-bottom: 8px;">
                La totalité de l'électricité produite par votre centrale de <strong>${powerKwc} kWc</strong> est injectée sur le réseau public Enedis et achetée par EDF Obligation d'Achat au tarif contractuel indexé de <strong>${customTarifEdfOa} €/kWh</strong>.
              </p>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                  <strong style="color: #0e2b4d;">&bull; Durée d'engagement :</strong> 20 ans fermes
                  <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">Contrat officiel adossé au Ministère de la Transition Écologique.</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                  <strong style="color: #0e2b4d;">&bull; Indexation annuelle :</strong> Coefficient K
                  <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">Protection contractuelle contre l'inflation matérielle et main-d'œuvre.</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                  <strong style="color: #0e2b4d;">&bull; Chiffre d'affaires moyen :</strong> ~${fmtEuro(annualGain)} / an
                  <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">Facturation semestrielle ou annuelle versée directement sur votre compte.</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                  <strong style="color: #0e2b4d;">&bull; Priorité d'injection :</strong> Garantie légale
                  <div style="font-size: 7.8pt; color: #64748b; margin-top: 2px;">Obligation d'absorption intégrale de la production par le gestionnaire Enedis.</div>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8;">
        <span style="font-weight: 700; color: #0e2b4d;">ENR COURTAGE &bull; enr-courtage.fr</span>
        <span>Analyse Énergétique &bull; Offre Commerciale</span>
        <span>Page 4 / ${includeAmortizationTable ? '5' : '4'}</span>
      </div>
    `;

    await renderPageToPdf(page4);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 5 : TABLEAU D'AMORTISSEMENT SUR DURATION_YEARS & ROADMAP (OPTIONNELLE)
  // ═════════════════════════════════════════════════════════════════════════
  if (includeAmortizationTable) {
    const page5 = createPageContainer();

    // Génération des lignes du tableau d'amortissement selon durationYears (20, 25, 30)
    const tableRows = [];
    let runningCumul = 0;
    const isCredit = financingChoices.includes('credit_bancaire');
    const annualCharge = isCredit ? Math.round(bankLoan.annualPaymentExact) : 0;
    const loanDuration = Math.min(25, durationYears);

    for (let yr = 1; yr <= durationYears; yr++) {
      const degradation = Math.pow(0.995, yr - 1);
      const prodYr = Math.round(annualProdKwh * degradation);
      const revYr = Math.round(annualGain * degradation);
      const chargeYr = yr <= loanDuration ? annualCharge : 0;
      const netCashYr = revYr - chargeYr;
      runningCumul += netCashYr;

      const bgRow = yr % 2 === 0 ? 'background: #f8fafc;' : '';
      const cellPad = durationYears > 20 ? '3.5px 6px' : '4.5px 8px';
      tableRows.push(`
        <tr style="border-bottom: 1px solid #f1f5f9; ${bgRow}">
          <td style="padding: ${cellPad}; font-weight: bold; color: #0e2b4d; text-align: center;">Année ${yr}</td>
          <td style="padding: ${cellPad}; text-align: center; color: #64748b;">${(degradation * 100).toFixed(1)} %</td>
          <td style="padding: ${cellPad}; text-align: right; color: #334155;">${fmtNum(prodYr)} kWh</td>
          <td style="padding: ${cellPad}; text-align: right; font-weight: bold; color: #065f46;">${fmtEuro(revYr)}</td>
          <td style="padding: ${cellPad}; text-align: right; color: ${chargeYr > 0 ? '#b91c1c' : '#64748b'};">${chargeYr > 0 ? `-${fmtEuro(chargeYr)}` : '0 €'}</td>
          <td style="padding: ${cellPad}; text-align: right; font-weight: bold; color: ${netCashYr >= 0 ? '#15803d' : '#b91c1c'};">${netCashYr >= 0 ? '+' : ''}${fmtEuro(netCashYr)}</td>
          <td style="padding: ${cellPad}; text-align: right; font-weight: 900; color: #0e2b4d; background: rgba(2, 132, 199, 0.05);">${fmtEuro(runningCumul)}</td>
        </tr>
      `);
    }

    page5.innerHTML = `
      <div>
        <!-- EN-TÊTE PAGE 5 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0e2b4d; padding-bottom: 12px;">
          <div>
            <div style="font-size: 13pt; font-weight: 900; color: #0e2b4d; letter-spacing: -0.5px;">
              PLAN D'AMORTISSEMENT SUR ${durationYears} ANS &amp; DÉPLOIEMENT
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
              Flux de trésorerie net annuel et cumulé sur ${durationYears} ans &bull; Centrale ${powerKwc} kWc
            </div>
          </div>
          <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR Courtage" style="height: 36px; object-fit: contain;" />
        </div>

        <!-- TABLEAU DES FLUX FINANCIERS DURATION_YEARS -->
        <div style="margin-top: 14px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: ${durationYears > 20 ? '7.2pt' : '7.8pt'};">
            <thead>
              <tr style="background: #0e2b4d; color: #ffffff;">
                <th style="padding: 6px 8px; text-align: center;">Année</th>
                <th style="padding: 6px 8px; text-align: center;">Rendement</th>
                <th style="padding: 6px 8px; text-align: right;">Production (kWh)</th>
                <th style="padding: 6px 8px; text-align: right;">Recettes/Gains (€)</th>
                <th style="padding: 6px 8px; text-align: right;">Charges/Prêt (€)</th>
                <th style="padding: 6px 8px; text-align: right;">Cashflow Net (€)</th>
                <th style="padding: 6px 8px; text-align: right; background: #0284c7;">Trésorerie Cumulée</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.join('')}
            </tbody>
          </table>
        </div>

        <!-- INDICATEURS DE RENTABILITÉ CLÉS -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase;">TRI Projet (${durationYears} ans)</div>
            <div style="font-size: 15pt; font-weight: 900; color: #15803d; margin-top: 2px;">~9,8 %</div>
            <div style="font-size: 7.2pt; color: #166534;">Taux de Rentabilité Interne</div>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 800; color: #1e40af; text-transform: uppercase;">Temps de Retour Brut</div>
            <div style="font-size: 15pt; font-weight: 900; color: #1d4ed8; margin-top: 2px;">~8,2 ans</div>
            <div style="font-size: 7.2pt; color: #1e40af;">Point mort financier (Payback)</div>
          </div>

          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 800; color: #6b21a8; text-transform: uppercase;">Trésorerie Nette à ${durationYears} ans</div>
            <div style="font-size: 15pt; font-weight: 900; color: #7c3aed; margin-top: 2px;">+${fmtEuro(runningCumul)}</div>
            <div style="font-size: 7.2pt; color: #6b21a8;">Gain net après toutes charges</div>
          </div>
        </div>

        <!-- ROADMAP / LES 4 ÉTAPES DU DÉPLOIEMENT CLÉ EN MAIN -->
        <div style="margin-top: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;">
          <div style="font-size: 8.5pt; font-weight: 900; color: #0e2b4d; text-transform: uppercase; margin-bottom: 6px;">
            Accompagnement Clé en Main ENR Courtage — 4 Étapes vers la Mise en Service
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 7.5pt;">
            <div style="background: #f8fafc; border-left: 3px solid #0284c7; padding: 6px 8px; border-radius: 4px;">
              <strong style="color: #0e2b4d;">1. Étude &amp; Audit</strong><br/>
              Validation structurelle sur site et note de calcul de charpente.
            </div>
            <div style="background: #f8fafc; border-left: 3px solid #10b981; padding: 6px 8px; border-radius: 4px;">
              <strong style="color: #0e2b4d;">2. Urbanisme (DP)</strong><br/>
              Dépôt du dossier de Déclaration Préalable complet en mairie.
            </div>
            <div style="background: #f8fafc; border-left: 3px solid #f59e0b; padding: 6px 8px; border-radius: 4px;">
              <strong style="color: #0e2b4d;">3. Accord Enedis</strong><br/>
              Proposition Technique et Financière (PTF) &amp; Convention CRAE.
            </div>
            <div style="background: #f8fafc; border-left: 3px solid #8b5cf6; padding: 6px 8px; border-radius: 4px;">
              <strong style="color: #0e2b4d;">4. Pose &amp; Injection</strong><br/>
              Installation certifiée QualiPV, Consuel et mise sous tension.
            </div>
          </div>
        </div>
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8;">
        <span style="font-weight: 700; color: #0e2b4d;">ENR COURTAGE &bull; enr-courtage.fr</span>
        <span>Plan d'Amortissement ${durationYears} ans &bull; Offre Commerciale</span>
        <span>Page 5 / 5</span>
      </div>
    `;

    await renderPageToPdf(page5);
  }

  // Finalisation et export du document PDF
  const safeTitle = (simulation.title || 'Offre_Commerciale_NELSON').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

  if (returnBlob) {
    const blob = pdf.output('blob');
    const arrayBuffer = pdf.output('arraybuffer');
    return { blob, arrayBuffer, filename, pdf };
  }

  pdf.save(filename);
  return { success: true, filename };
}
