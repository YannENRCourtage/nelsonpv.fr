import * as XLSX from 'xlsx';
import { PV_PORTFOLIO_SITES, computePvFinancials } from '../data/pvPortfolioData.js';
import { formatResteAffecterDistanceWithFallback } from './odreSubstationFallback.js';
import { BESS_ODRE_MATRIX, findBessOdreData } from '../data/bessOdreMatrix.js';

/**
 * SERVICE D'EXPORT EXCEL CONSOLIDÉ DU PORTEFEUILLE PV (PHOTOVOLTAÏQUE)
 * Intègre la colonne L "Reste à affecter (Distance)" et la chronique 20 ans
 */

export function generatePvPortfolioExcelData(sites = PV_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 20;
  const debtRate = options.debtRate || 4.0;
  const studyDuration = options.studyDuration || 20;

  // Calcul dynamique de chaque site PV
  const siteResults = sites.map((site, index) => {
    const fin = computePvFinancials(site, {
      debtDuration,
      debtRate,
      studyDuration
    });

    return {
      siteRaw: site,
      index: index + 1,
      fin
    };
  });

  // Tableau consolidé des sites PV (Feuille 1)
  const portfolioRows = siteResults.map(({ index, siteRaw, fin }) => ({
    'N°': index,
    'Site': fin.siteName,
    'SPV': siteRaw.spv || 'HÉLIOS SPV 1',
    'Commune': fin.commune,
    'Code Postal': fin.codePostal,
    'Puissance (kWc)': fin.kwc,
    'Production (MWh/an)': fin.prodMwh,
    'Poste Source ODRE': fin.posteSource,
    'Distance (km)': fin.distanceKm,
    'Quote-Part S3REnR': fin.quotePartS3REnR,
    'Reste à affecter (MW)': siteRaw.substation?.resteAffecterMw ?? 0,
    'Reste à affecter (Distance)': formatResteAffecterDistanceWithFallback(siteRaw.substation?.resteAffecterMw ?? 0, fin.distanceKm, siteRaw.lat, siteRaw.lng, fin.posteSource),
    'Zone CRE 2025-227': fin.zoneCre,
    'CAPEX Total (€)': Math.round(fin.capexTotal),
    'CA Annuel 1 (€)': Math.round(fin.caAnnuel),
    'EBITDA An 1 (€)': Math.round(fin.ebitdaAn1),
    'TRI Projet (%)': Number(fin.triProjet.toFixed(2)),
    'Payback (ans)': Number(fin.payback.toFixed(1)),
    'Loyer / Soulte (€/an)': String(siteRaw.name || siteRaw.siteName || siteRaw.client || '').toLowerCase().includes('latournerie')
      ? 2250
      : ((siteRaw.rent !== undefined && siteRaw.rent !== null) ? Number(siteRaw.rent) : 0)
  }));

  // Chronique financière consolidée (Feuille 2 - 20 ans)
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
        sumCa += rowY.ca || 0;
        sumOpex += rowY.opex || 0;
        sumEbitda += rowY.ebitda || 0;
        sumDebtService += rowY.serviceDette || 0;
        sumCfNet += rowY.cfNet || 0;
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
 * Déclenche le téléchargement du fichier Excel consolidé PV
 */
export function exportPvPortfolioToExcel(sites = PV_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 20;
  const debtRate = options.debtRate || 4.0;
  const portfolioTag = options.portfolioName ? `${options.portfolioName}` : 'HELIOS';
  const { portfolioRows, chronoRows } = generatePvPortfolioExcelData(sites, options);

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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsPortfolio, `Portefeuille_PV_${portfolioTag}`);
  XLSX.utils.book_append_sheet(wb, wsChrono, 'Modele_Financier_20_Ans');

  const fileName = `Portefeuille_PV_${portfolioTag}_Consolide_${debtDuration}ans_${debtRate}pct_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Génère les données de la Matrice Caparéseau ODRE pour les centrales PV
 */
export function generatePvOdreMatrixData(sites = PV_PORTFOLIO_SITES, options = {}) {
  const actualSites = (sites && sites.length > 0) ? sites : PV_PORTFOLIO_SITES;
  const debtDuration = options.debtDuration || 20;
  const debtRate = options.debtRate || 4.0;
  const studyDuration = options.studyDuration || 20;
  const rawPortfolioName = options.portfolioName || 'HELIOS';
  const portfolioTag = rawPortfolioName === 'ALL' ? 'CONSOLIDE' : rawPortfolioName;

  return actualSites.map((site, index) => {
    const fin = computePvFinancials(site, {
      debtDuration,
      debtRate,
      studyDuration
    });
    const siteRaw = site;

    const siteName = fin.siteName || siteRaw.name || siteRaw.client || `Centrale PV ${index + 1}`;
    const client = siteRaw.client || siteRaw.client_name || siteRaw.clientName || siteName;
    const spv = siteRaw.spv || (portfolioTag ? `${portfolioTag} SPV 1` : 'HÉLIOS SPV 1');
    const commune = fin.commune || siteRaw.city || siteRaw.commune || '';
    const codePostal = fin.codePostal || siteRaw.postcode || siteRaw.zip || siteRaw.cp || '';
    const cpStr = String(codePostal).trim();
    const departement = siteRaw.dept || siteRaw.departement || (cpStr.length >= 2 ? cpStr.slice(0, 2) : '');

    const odreMatch = findBessOdreData ? findBessOdreData(siteName || client, commune, siteRaw.address) : null;

    const lat = siteRaw.lat || siteRaw.latitude || odreMatch?.latitude || '';
    const lng = siteRaw.lng || siteRaw.longitude || odreMatch?.longitude || '';

    const subst = siteRaw.substation || {};
    const posteSource = fin.posteSource || subst.name || subst.code || odreMatch?.posteSourceEnedis || 'ODRE';
    const tension = subst.voltageLevel || subst.tension || odreMatch?.tension || 'HTA 20 kV';
    const distanceKm = fin.distanceKm ?? subst.distanceKm ?? odreMatch?.distanceKm ?? 5.0;
    const quotePartS3REnR = fin.quotePartS3REnR || subst.quotePartS3renr || subst.quotePartS3REnR || odreMatch?.quotePartS3REnR || '92.73 k€/MW';
    const capaciteResiduelleMw = subst.resteAffecterMw !== undefined 
      ? subst.resteAffecterMw 
      : (fin.resteAffecterMw ?? odreMatch?.capaciteResiduelleOdreMw ?? 0);
    const resteAffecterDist = formatResteAffecterDistanceWithFallback(capaciteResiduelleMw, distanceKm, lat, lng, posteSource);
    const typologieZoneCre = fin.zoneCre || subst.statutRaccordement || odreMatch?.typologieZoneCre || 'Zone standard Enedis';
    const statutRaccordement = subst.statutRaccordement || fin.zoneCre || odreMatch?.statutRaccordement || 'Zone standard Enedis';

    const puissanceKwc = fin.kwc || siteRaw.kwc || siteRaw.powerKwc || 0;
    const prodMwh = fin.prodMwh || (siteRaw.productible ? Math.round((puissanceKwc * siteRaw.productible) / 1000) : Math.round(puissanceKwc * 1.125));

    return {
      'N°': index + 1,
      'Site / Bailleur': siteName,
      'Client': client,
      'SPV': spv,
      'Commune': commune,
      'Code Postal': codePostal,
      'Département': departement,
      'Latitude': lat,
      'Longitude': lng,
      'Poste Source Enedis': posteSource,
      'Tension': tension,
      'Distance Réseau (km)': distanceKm,
      'Quote-Part S3REnR': quotePartS3REnR,
      'Capacité Résiduelle ODRE (MW)': capaciteResiduelleMw,
      'Reste à affecter (Distance)': resteAffecterDist,
      'Typologie Zone CRE 2025-227': typologieZoneCre,
      'Puissance PV (kWc)': puissanceKwc,
      'Production (MWh/an)': prodMwh,
      'Statut Raccordement / Transfo': statutRaccordement
    };
  });
}

/**
 * Déclenche le téléchargement de la Matrice Caparéseau ODRE des centrales PV
 */
export function exportPvOdreMatrixToExcel(sites = PV_PORTFOLIO_SITES, options = {}) {
  const actualSites = (sites && sites.length > 0) ? sites : PV_PORTFOLIO_SITES;
  const rawPortfolioName = options.portfolioName || 'HELIOS';
  const portfolioTag = rawPortfolioName === 'ALL' ? 'CONSOLIDE' : rawPortfolioName;

  const dataRows = generatePvOdreMatrixData(actualSites, options);

  const ws = XLSX.utils.json_to_sheet(dataRows);
  const headers = Object.keys(dataRows[0] || {});
  ws['!cols'] = headers.map(key => {
    const maxLen = Math.max(
      key.length,
      ...dataRows.map(r => (r[key] !== null && r[key] !== undefined ? String(r[key]).length : 0))
    );
    return { wch: Math.max(maxLen + 3, 10) };
  });

  const sheetName = `Capareseau_ODRE_PV_${portfolioTag}`.slice(0, 31);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = `Matrice_Capareseau_ODRE_PV_${portfolioTag}_${actualSites.length}_Sites_ENR_COURTAGE.xlsx`;
  XLSX.writeFile(wb, fileName);
}
