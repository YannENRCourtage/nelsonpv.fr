import * as XLSX from 'xlsx';
import { BESS_PORTFOLIO_SITES } from '../data/bessPortfolioData.js';
import { BESS_ODRE_MATRIX } from '../data/bessOdreMatrix.js';
import { computeBessFinancials } from './bessSimulationEngine.js';

/**
 * SERVICE D'EXPORT EXCEL CONSOLIDÉ DU PORTEFEUILLE BESS (31 SITES / 15.5 MW)
 * Harmonisé strictement avec le moteur financier Nelson (computeBessFinancials)
 */

export function generateBessPortfolioExcelData(sites = BESS_PORTFOLIO_SITES, options = {}) {
  const debtDuration = options.debtDuration || 12;
  const debtRate = options.debtRate || 4.30;
  const studyDuration = options.studyDuration || 15;

  // Calcul dynamique de chaque site via computeBessFinancials
  const siteResults = sites.map((site, index) => {
    const fin = computeBessFinancials(site, {
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

  // Tableau consolidé des 31 sites (Feuille 1)
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
    'Zone CRE 2025-227': fin.zoneCre,
    'CAPEX Total (€)': Math.round(fin.capexTotal),
    'CA Annuel 1 (€)': Math.round(fin.caAnnuel),
    'EBITDA An 1 (€)': Math.round(fin.ebitdaAn1),
    'TRI Projet (%)': Number(fin.triProjet.toFixed(2)),
    'Payback (ans)': Number(fin.payback.toFixed(1)),
    'Loyer Dalle (€/an)': siteRaw.rent || 3000
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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsPortfolio, 'Portefeuille_BESS_31_Sites');
  XLSX.utils.book_append_sheet(wb, wsChrono, 'Modele_Financier_15_Ans');

  const fileName = `Portefeuille_BESS_31_Sites_Consolide_${debtDuration}ans_${debtRate}pct_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Déclenche le téléchargement de la matrice ODRE Caparéseau
 */
export function exportBessOdreMatrixToExcel() {
  const dataRows = BESS_ODRE_MATRIX.map(s => ({
    'N°': s.id,
    'Site / Bailleur': s.siteName,
    'Client': s.client,
    'Commune': s.commune,
    'Code Postal': s.codePostal,
    'Département': s.departement,
    'Latitude': s.latitude,
    'Longitude': s.longitude,
    'Poste Source Enedis': s.posteSourceEnedis,
    'Tension': s.tension,
    'Distance Réseau (km)': s.distanceKm,
    'Quote-Part S3REnR': s.quotePartS3REnR,
    'Capacité Résiduelle ODRE (MW)': s.capaciteResiduelleOdreMw,
    'Typologie Zone CRE 2025-227': s.typologieZoneCre,
    'Puissance BESS (kW)': s.puissanceKw,
    'Capacité BESS (kWh)': s.capaciteKwh,
    'Statut Raccordement / Transfo': s.statutRaccordement
  }));

  const ws = XLSX.utils.json_to_sheet(dataRows);
  const headers = Object.keys(dataRows[0] || {});
  ws['!cols'] = headers.map(key => {
    const maxLen = Math.max(
      key.length,
      ...dataRows.map(r => (r[key] !== null && r[key] !== undefined ? String(r[key]).length : 0))
    );
    return { wch: Math.max(maxLen + 3, 10) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Capareseau_ODRE_31_Sites');
  XLSX.writeFile(wb, 'Matrice_Capareseau_ODRE_31_Postes_Sources_ENR_COURTAGE.xlsx');
}
