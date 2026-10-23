import * as XLSX from 'xlsx';
import { BESS_PORTFOLIO_SITES } from '../data/bessPortfolioData.js';
import { BESS_ODRE_MATRIX } from '../data/bessOdreMatrix.js';
import { computeBessFinancials } from './bessSimulationEngine.js';
import { formatResteAffecterDistanceWithFallback } from './odreSubstationFallback.js';

/**
 * SERVICE D'EXPORT EXCEL CONSOLIDÉ DU PORTEFEUILLE BESS
 * Harmonisé strictement avec le moteur financier Nelson (computeBessFinancials)
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

export function generateBessPortfolioExcelData(sites = BESS_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 12;
  const debtRate = options.debtRate || 4.30;
  const studyDuration = options.studyDuration || 15;
  const loyerDalle = options.loyerDalle !== undefined ? options.loyerDalle : options.rent;

  // Calcul dynamique de chaque site via computeBessFinancials
  const siteResults = sites.map((site, index) => {
    const fin = computeBessFinancials(site, {
      debtDuration,
      debtRate,
      studyDuration,
      fraisCommerciaux: site.fraisCommerciaux !== undefined ? site.fraisCommerciaux : options.fraisCommerciaux,
      loyerDalle: loyerDalle !== undefined ? loyerDalle : (site.rent ?? (options.portfolioName === 'FARADAY' ? 2000 : 3000))
    });

    return {
      siteRaw: site,
      index: index + 1,
      fin
    };
  });

// Tableau consolidé des sites (Feuille 1)
  const portfolioRows = siteResults.map(({ index, siteRaw, fin }) => ({
    'N°': index,
    'Site': fin.siteName,
    'SPV': siteRaw.spv || 'SPV A',
    'Commune': fin.commune,
    'Code Postal': fin.codePostal,
    'Puissance (kW)': 500,
    'Capacité (kWh)': 1044,
    'Poste Source ODRE': fin.posteSource,
    'Distance (km)': fin.distanceKm,
    'Quote-Part S3REnR': fin.quotePartS3REnR,
    'Reste à affecter (MW)': siteRaw.substation?.resteAffecterMw ?? '—',
    'Reste à affecter (Distance)': formatResteAffecterDistanceWithFallback(siteRaw.substation?.resteAffecterMw, fin.distanceKm, siteRaw.lat, siteRaw.lng, fin.posteSource),
    'Zone CRE 2025-227': fin.zoneCre,
    'CAPEX Total (€)': Math.round(fin.capexTotal),
    'CA Annuel 1 (€)': Math.round(fin.caAnnuel),
    'EBITDA An 1 (€)': Math.round(fin.ebitdaAn1),
    'TRI Projet (%)': Number(fin.triProjet.toFixed(2)),
    'Payback (ans)': Number(fin.payback.toFixed(1)),
    'Loyer Dalle (€/an)': fin.loyerDalle ?? loyerDalle ?? siteRaw.rent ?? (options.portfolioName === 'FARADAY' ? 2000 : 3000)
  }));

  // Chronique financière consolidée (Feuille 2)
  const chronoRows = [];
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
      'Année': `Année ${y} (${2025 + y})`,
      'CA Consolidé (€)': Math.round(sumCa),
      'OPEX Consolidés (€)': Math.round(sumOpex),
      'EBITDA Consolidé (€)': Math.round(sumEbitda),
      [`Service Dette (${debtDuration} ans à ${debtRate.toFixed(2)}%) (€)`]: Math.round(sumDebtService),
      'Cash-Flow Net (€)': Math.round(sumCfNet)
    });
  }

  // Calcul du cumul trésorerie
  let cumul = 0;
  chronoRows.forEach(row => {
    cumul += row['Cash-Flow Net (€)'];
    row['Cumul Trésorerie (€)'] = Math.round(cumul);
  });

  return { portfolioRows, chronoRows, siteResults };
}

/**
 * Déclenche le téléchargement du fichier Excel consolidé 31 sites
 */
export function exportBessPortfolioToExcel(sites = BESS_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 12;
  const debtRate = options.debtRate || 4.30;
  const { portfolioRows, chronoRows } = generateBessPortfolioExcelData(sites, options);

  const wsPortfolio = XLSX.utils.json_to_sheet(portfolioRows);
  const wsChrono = XLSX.utils.json_to_sheet(chronoRows);

  // Auto-fit columns
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
  XLSX.utils.book_append_sheet(wb, wsPortfolio, `Portefeuille_BESS_${portfolioTag}`);
  XLSX.utils.book_append_sheet(wb, wsChrono, 'Modele_Financier_15_Ans');

  const fileName = `Portefeuille_BESS_${portfolioTag}_Consolide_${debtDuration}ans_${debtRate}pct_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Déclenche le téléchargement de la matrice ODRE Caparéseau pour le portefeuille actif
 * @param {Array} [sites] Sites du portefeuille actif (ex: activeSites FARADAY ou VOLTA)
 * @param {Object} [options] Options d'export dont options.portfolioName
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
