import * as XLSX from 'xlsx';
import { BESS_PORTFOLIO_SITES } from '../data/bessPortfolioData.js';
import { BESS_ODRE_MATRIX } from '../data/bessOdreMatrix.js';
import { computeBessFinancials } from './bessSimulationEngine.js';
import { formatResteAffecterDistanceWithFallback } from './odreSubstationFallback.js';

/**
 * SERVICE D'EXPORT EXCEL CONSOLIDÉ DU PORTEFEUILLE BESS
 * Harmonisé strictement avec le moteur financier Nelson (computeBessFinancials & Clean Horizon)
 */

export function formatResteAffecterDistance(mw, distanceKm) {
  let mwStr = '0';
  if (mw !== null && mw !== undefined && mw !== '—') {
    const num = typeof mw === 'number' ? mw : parseFloat(String(mw).replace(',', '.'));
    if (!isNaN(num)) {
      mwStr = Number.isInteger(num) ? String(num) : num.toString().replace('.', ',');
    }
  }
  let distStr = '0';
  if (distanceKm !== null && distanceKm !== undefined && distanceKm !== '—') {
    const numD = typeof distanceKm === 'number' ? distanceKm : parseFloat(String(distanceKm).replace(',', '.'));
    if (!isNaN(numD)) {
      distStr = Number.isInteger(numD) ? String(numD) : numD.toString();
    }
  }
  return `${mwStr} (${distStr})`;
}

export function resolveSiteGpsString(site = {}) {
  if (site.gps && typeof site.gps === 'string' && site.gps.trim().length > 3) {
    return site.gps.trim();
  }
  const lat = site.lat ?? site.latitude;
  const lng = site.lng ?? site.longitude;
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  }
  return '—';
}

export function generateBessPortfolioExcelData(sites = BESS_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 12;
  const debtRate = options.debtRate || 4.30;
  const studyDuration = options.studyDuration || 20;
  const defaultPortfolioLoyer = (options.portfolioName === 'FARADAY' || options.portfolioName === 'EDISON') ? 2000 : 3000;
  const loyerDalle = options.loyerDalle !== undefined ? Number(options.loyerDalle) : (options.rent !== undefined ? Number(options.rent) : defaultPortfolioLoyer);

  // Calcul dynamique de chaque site via computeBessFinancials (en respectant les valeurs personnalisées si déjà calculées dans la vue)
  const siteResults = sites.map((site, index) => {
    const siteSpecificLoyer = site.customRent !== undefined
      ? Number(site.customRent)
      : (loyerDalle !== undefined ? loyerDalle : (site.rent ?? defaultPortfolioLoyer));

    const fin = computeBessFinancials(site, {
      debtDuration,
      debtRate,
      studyDuration,
      capexMode: options.capexMode,
      capexBreakdown: options.capexBreakdown,
      financingMode: options.financingMode,
      revenueModel: options.revenueModel,
      fraisCommerciaux: site.fraisCommerciaux !== undefined ? site.fraisCommerciaux : options.fraisCommerciaux,
      loyerDalle: siteSpecificLoyer
    });

    return {
      siteRaw: site,
      index: index + 1,
      siteSpecificLoyer,
      fin
    };
  });

  // Tableau consolidé des sites (Feuille 1) — Colonne SPV remplacée par Coordonnées GPS
  const portfolioRows = siteResults.map(({ index, siteRaw, siteSpecificLoyer, fin }) => {
    const capexVal = siteRaw.capexTotal !== undefined ? Math.round(siteRaw.capexTotal) : Math.round(fin.capexTotal);
    const caVal = siteRaw.caAnnuel !== undefined ? Math.round(siteRaw.caAnnuel) : Math.round(fin.caAnnuel);
    const ebitdaVal = siteRaw.ebitda !== undefined ? Math.round(siteRaw.ebitda) : Math.round(fin.ebitdaAn1);
    const triVal = siteRaw.triProjet !== undefined ? Number(Number(siteRaw.triProjet).toFixed(2)) : Number(fin.triProjet.toFixed(2));
    const paybackVal = siteRaw.payback !== undefined ? Number(Number(siteRaw.payback).toFixed(1)) : Number(fin.payback.toFixed(1));

    return {
      'N°': index,
      'Site': siteRaw.name || fin.siteName,
      'Coordonnées GPS': resolveSiteGpsString(siteRaw),
      'Commune': siteRaw.city || fin.commune,
      'Code Postal': siteRaw.postcode || siteRaw.cp || fin.codePostal,
      'Puissance (kW)': siteRaw.powerKw || 500,
      'Capacité (kWh)': siteRaw.capacityKwh || 1044,
      'Poste Source ODRE': siteRaw.substation?.name || fin.posteSource,
      'Distance (km)': siteRaw.substation?.distanceKm ?? fin.distanceKm,
      'Quote-Part S3REnR': siteRaw.substation?.quotePartS3renr || fin.quotePartS3REnR,
      'Reste à affecter (MW)': siteRaw.substation?.resteAffecterMw ?? '—',
      'Reste à affecter (Distance)': formatResteAffecterDistanceWithFallback(
        siteRaw.substation?.resteAffecterMw,
        siteRaw.substation?.distanceKm ?? fin.distanceKm,
        siteRaw.lat,
        siteRaw.lng,
        siteRaw.substation?.name || fin.posteSource
      ),
      'Zone CRE 2025-227': siteRaw.creQualification?.label || fin.zoneCre,
      'CAPEX Total (€)': capexVal,
      'CA Annuel 1 (€)': caVal,
      'EBITDA An 1 (€)': ebitdaVal,
      'TRI Projet (%)': triVal,
      'Payback (ans)': paybackVal,
      'Loyer Dalle (€/an)': Math.round(siteSpecificLoyer)
    };
  });

  // Chronique financière consolidée (Feuille 2)
  const chronoRows = [];
  if (Array.isArray(options.consolidatedChronique) && options.consolidatedChronique.length > 0) {
    options.consolidatedChronique.forEach((c) => {
      chronoRows.push({
        'Année': `Année ${c.year} (${c.calendarYear || (2026 + c.year)})`,
        'CA Consolidé (€)': Math.round(c.ca || 0),
        'OPEX Consolidés (€)': Math.round(c.opex || 0),
        'EBITDA Consolidé (€)': Math.round(c.ebitda || 0),
        [`Service Dette (${debtDuration} ans à ${Number(debtRate).toFixed(2)}%) (€)`]: Math.round(c.serviceDette || 0),
        'Cash-Flow Net (€)': Math.round(c.cfNet || 0),
        'Cumul Trésorerie (€)': Math.round(c.cumulCf || 0)
      });
    });
  } else {
    for (let y = 1; y <= studyDuration; y++) {
      let sumCa = 0;
      let sumOpex = 0;
      let sumEbitda = 0;
      let sumDebtService = 0;
      let sumCfNet = 0;

      siteResults.forEach(({ fin }) => {
        const rowY = fin.rows?.[y - 1];
        if (rowY) {
          sumCa += rowY.caTotalBrut || 0;
          sumOpex += rowY.opex || 0;
          sumEbitda += rowY.ebe || 0;
          sumDebtService += rowY.serviceDette || 0;
          sumCfNet += rowY.cashFlow || 0;
        }
      });

      chronoRows.push({
        'Année': `Année ${y} (${2026 + y})`,
        'CA Consolidé (€)': Math.round(sumCa),
        'OPEX Consolidés (€)': Math.round(sumOpex),
        'EBITDA Consolidé (€)': Math.round(sumEbitda),
        [`Service Dette (${debtDuration} ans à ${Number(debtRate).toFixed(2)}%) (€)`]: Math.round(sumDebtService),
        'Cash-Flow Net (€)': Math.round(sumCfNet)
      });
    }

    let cumul = 0;
    chronoRows.forEach(row => {
      cumul += row['Cash-Flow Net (€)'];
      row['Cumul Trésorerie (€)'] = Math.round(cumul);
    });
  }

  return { portfolioRows, chronoRows, siteResults };
}

/**
 * Déclenche le téléchargement du fichier Excel consolidé du portefeuille BESS
 */
export function exportBessPortfolioToExcel(sites = BESS_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 12;
  const debtRate = options.debtRate || 4.30;
  const studyDuration = options.studyDuration || 20;
  const { portfolioRows, chronoRows } = generateBessPortfolioExcelData(sites, options);

  const wsPortfolio = XLSX.utils.json_to_sheet(portfolioRows);
  const wsChrono = XLSX.utils.json_to_sheet(chronoRows);

  const fitCols = (rows) => {
    const headers = Object.keys(rows[0] || {});
    return headers.map(key => {
      const maxLen = Math.max(
        key.length,
        ...rows.map(r => (r[key] !== null && r[key] !== undefined ? String(r[key]).length : 0))
      );
      return { wch: Math.max(maxLen + 3, 10) };
    });
  };

  wsPortfolio['!cols'] = fitCols(portfolioRows);
  wsChrono['!cols'] = fitCols(chronoRows);

  const portfolioTag = options.portfolioName ? `${options.portfolioName}` : `${sites.length}_Sites`;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsPortfolio, `Portefeuille_BESS_${portfolioTag}`.slice(0, 31));
  XLSX.utils.book_append_sheet(wb, wsChrono, `Modele_Financier_${studyDuration}_Ans`.slice(0, 31));

  const fileName = `Portefeuille_BESS_${portfolioTag}_Consolide_${debtDuration}ans_${Number(debtRate).toFixed(1)}pct_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Déclenche le téléchargement de la matrice ODRE Caparéseau pour le portefeuille actif
 */
export function exportBessOdreMatrixToExcel(sites = null, options = {}) {
  const targetSites = (Array.isArray(sites) && sites.length > 0) ? sites : BESS_ODRE_MATRIX;

  const dataRows = targetSites.map((s, idx) => {
    const id = s.id || (idx + 1);
    const siteName = s.siteName || s.name || `Projet BESS ${idx + 1}`;
    const client = s.client || s.client_name || '';
    const commune = s.commune || s.city || '';
    const codePostal = s.codePostal || s.postcode || s.cp || '';
    const departement = s.departement || s.dept || (codePostal ? String(codePostal).substring(0, 2) : '');
    const gps = resolveSiteGpsString(s);
    const latitude = s.latitude ?? s.lat;
    const longitude = s.longitude ?? s.lng;
    const posteSourceEnedis = s.posteSourceEnedis || s.substation?.name || s.poste_source || 'ODRE';
    const tension = s.tension || s.substation?.voltageLevel || 'HTA 20 kV';
    const distanceKm = s.distanceKm ?? s.substation?.distanceKm ?? 5.0;
    const quotePartS3REnR = s.quotePartS3REnR || s.substation?.quotePartS3renr || '92.73 k€/MW';
    const capaciteResiduelleOdreMw = s.capaciteResiduelleOdreMw ?? s.substation?.resteAffecterMw ?? 0;
    const typologieZoneCre = s.typologieZoneCre || s.creQualification?.label || s.substation?.typologieZoneCre || 'Zone standard Enedis';
    const puissanceKw = s.puissanceKw || s.powerKw || 500;
    const capaciteKwh = s.capaciteKwh || s.capacityKwh || 1044;
    const statutRaccordement = s.statutRaccordement || s.substation?.statutRaccordement || 'Transfo sol libre - Dépôt PTF';

    return {
      'N°': id,
      'Site / Bailleur': siteName,
      'Client': client,
      'Coordonnées GPS': gps,
      'Commune': commune,
      'Code Postal': codePostal,
      'Département': departement,
      'Latitude': latitude,
      'Longitude': longitude,
      'Poste Source Enedis': posteSourceEnedis,
      'Tension': tension,
      'Distance Réseau (km)': distanceKm,
      'Quote-Part S3REnR': quotePartS3REnR,
      'Capacité Résiduelle ODRE (MW)': capaciteResiduelleOdreMw,
      'Typologie Zone CRE 2025-227': typologieZoneCre,
      'Puissance BESS (kW)': puissanceKw,
      'Capacité BESS (kWh)': capaciteKwh,
      'Statut Raccordement / Transfo': statutRaccordement
    };
  });

  const ws = XLSX.utils.json_to_sheet(dataRows);
  const headers = Object.keys(dataRows[0] || {});
  ws['!cols'] = headers.map(key => {
    const maxLen = Math.max(
      key.length,
      ...dataRows.map(r => (r[key] !== null && r[key] !== undefined ? String(r[key]).length : 0))
    );
    return { wch: Math.max(maxLen + 3, 10) };
  });

  const portfolioTag = options.portfolioName ? options.portfolioName.toUpperCase() : (targetSites === BESS_ODRE_MATRIX ? 'VOLTA' : `${targetSites.length}_Sites`);
  const count = targetSites.length;
  const sheetName = `Capareseau_ODRE_${portfolioTag}_${count}_Sites`.slice(0, 31);
  const fileName = `Matrice_Capareseau_ODRE_${portfolioTag}_${count}_Postes_Sources_ENR_COURTAGE.xlsx`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}
