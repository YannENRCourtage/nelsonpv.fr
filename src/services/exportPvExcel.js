import * as XLSX from 'xlsx';
import { PV_PORTFOLIO_SITES, computePvFinancials } from '../data/pvPortfolioData.js';
import { formatResteAffecterDistance } from './exportBessExcel.js';
import { BESS_ODRE_MATRIX } from '../data/bessOdreMatrix.js';

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
    'Reste à affecter (Distance)': formatResteAffecterDistance(siteRaw.substation?.resteAffecterMw ?? 0, fin.distanceKm),
    'Zone CRE 2025-227': fin.zoneCre,
    'CAPEX Total (€)': Math.round(fin.capexTotal),
    'CA Annuel 1 (€)': Math.round(fin.caAnnuel),
    'EBITDA An 1 (€)': Math.round(fin.ebitdaAn1),
    'TRI Projet (%)': Number(fin.triProjet.toFixed(2)),
    'Payback (ans)': Number(fin.payback.toFixed(1)),
    'Loyer / Soulte (€/an)': siteRaw.rent || 3000
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
