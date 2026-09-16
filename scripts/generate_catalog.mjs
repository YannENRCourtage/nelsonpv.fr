import fs from 'fs';
import xlsx from 'xlsx';

const wb = xlsx.readFile('./Tableaux bâtiments complet.xlsx');
const barconniereXlsx = xlsx.utils.sheet_to_json(wb.Sheets['BARCONNIERE']);
const acamaXlsx = xlsx.utils.sheet_to_json(wb.Sheets['ACAMA']);
const pdfRows = JSON.parse(fs.readFileSync('./scripts/pdf_rows_extracted.json'));

const parseEuro = (s) => parseFloat(String(s).replace(/[€\s]/g, '').replace(',', '.'));

// Parse all PDF rows into a lookup
const pdfParsed = {};
for (const r of pdfRows) {
  if (r.items.length < 8) continue;
  const items = r.items;
  if (!/^[A-Z][A-Z0-9]*$/.test(items[1])) continue;
  
  const id = items[1];
  const gamme = items[0];
  const len = items.length;
  
  const ratioKwc = parseEuro(items[len - 1]);
  const totalSansPv = parseEuro(items[len - 2]);
  const couverture = parseEuro(items[len - 3]);
  const fondations = parseEuro(items[len - 4]);
  const charpente = parseEuro(items[len - 5]);
  
  const key = `${gamme}_${id}`;
  pdfParsed[key] = {
    charpente,
    fondations,
    couverture,
    totalSansPv,
    ratioKwc,
  };
}

// Ombrières exact data from updated Tableaux bâtiments complet.xlsx
const OMBRIERES_EXACT_DATA = [
  // OMBRIERE VL SIMPLE GAUCHE (OM3)
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M1', code: 'OM3', longueur: 30, largeur: 6.92, surface: 207.6, sabliere: '2.93m', faitage: '4.96m', travees: '4 x 7.5m', kwc: 52, charpente: 13597.80, fondations: 15749.99, couverture: 0, tarif: 29347.80, ratioKwc: 0.56, ratioM2: 141.37, coutTravee: 5250.30 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M2', code: 'OM3', longueur: 37.5, largeur: 6.92, surface: 259.5, sabliere: '2.93m', faitage: '4.96m', travees: '5 x 7.5m', kwc: 65, charpente: 16118.10, fondations: 18480.00, couverture: 0, tarif: 34598.10, ratioKwc: 0.53, ratioM2: 133.33, coutTravee: 5250.30 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M3', code: 'OM3', longueur: 45, largeur: 6.92, surface: 311.4, sabliere: '2.93m', faitage: '4.96m', travees: '6 x 7.5m', kwc: 76, charpente: 18638.41, fondations: 21210.00, couverture: 0, tarif: 39848.41, ratioKwc: 0.52, ratioM2: 127.97, coutTravee: 5250.31 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M4', code: 'OM3', longueur: 52.5, largeur: 6.92, surface: 363.3, sabliere: '2.93m', faitage: '4.96m', travees: '7 x 7.5m', kwc: 89, charpente: 20973.36, fondations: 23940.00, couverture: 0, tarif: 44913.36, ratioKwc: 0.50, ratioM2: 123.63, coutTravee: 5064.95 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M5', code: 'OM3', longueur: 60, largeur: 6.92, surface: 415.2, sabliere: '2.93m', faitage: '4.96m', travees: '8 x 7.5m', kwc: 102, charpente: 23493.66, fondations: 26670.00, couverture: 0, tarif: 50163.66, ratioKwc: 0.49, ratioM2: 120.82, coutTravee: 5250.30 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M6', code: 'OM3', longueur: 67.5, largeur: 6.92, surface: 467.1, sabliere: '2.93m', faitage: '4.96m', travees: '9 x 7.5m', kwc: 113, charpente: 26013.97, fondations: 29399.99, couverture: 0, tarif: 55413.97, ratioKwc: 0.49, ratioM2: 118.63, coutTravee: 5250.31 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M7', code: 'OM3', longueur: 75, largeur: 6.92, surface: 519.0, sabliere: '2.93m', faitage: '4.96m', travees: '10 x 7.5m', kwc: 126, charpente: 28348.92, fondations: 32129.99, couverture: 0, tarif: 60478.92, ratioKwc: 0.48, ratioM2: 116.53, coutTravee: 5064.95 },

  // OMBRIERE VL SIMPLE DROITE (OD3)
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D1', code: 'OD3', longueur: 30, largeur: 6.92, surface: 207.6, sabliere: '2.93m', faitage: '4.96m', travees: '4 x 7.5m', kwc: 52, charpente: 13597.80, fondations: 13650.00, couverture: 0, tarif: 27247.80, ratioKwc: 0.52, ratioM2: 131.25, coutTravee: 4830.30 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D2', code: 'OD3', longueur: 37.5, largeur: 6.92, surface: 259.5, sabliere: '2.93m', faitage: '4.96m', travees: '5 x 7.5m', kwc: 65, charpente: 16118.10, fondations: 15959.99, couverture: 0, tarif: 32078.10, ratioKwc: 0.49, ratioM2: 123.62, coutTravee: 4830.30 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D3', code: 'OD3', longueur: 45, largeur: 6.92, surface: 311.4, sabliere: '2.93m', faitage: '4.96m', travees: '6 x 7.5m', kwc: 76, charpente: 18638.41, fondations: 18270.00, couverture: 0, tarif: 36908.41, ratioKwc: 0.49, ratioM2: 118.52, coutTravee: 4830.31 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D4', code: 'OD3', longueur: 52.5, largeur: 6.92, surface: 363.3, sabliere: '2.93m', faitage: '4.96m', travees: '7 x 7.5m', kwc: 89, charpente: 20973.36, fondations: 20580.00, couverture: 0, tarif: 41553.36, ratioKwc: 0.47, ratioM2: 114.38, coutTravee: 4644.95 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D5', code: 'OD3', longueur: 60, largeur: 6.92, surface: 415.2, sabliere: '2.93m', faitage: '4.96m', travees: '8 x 7.5m', kwc: 102, charpente: 23493.66, fondations: 22890.00, couverture: 0, tarif: 46383.66, ratioKwc: 0.45, ratioM2: 111.71, coutTravee: 4830.30 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D6', code: 'OD3', longueur: 67.5, largeur: 6.92, surface: 467.1, sabliere: '2.93m', faitage: '4.96m', travees: '9 x 7.5m', kwc: 113, charpente: 26013.97, fondations: 25200.00, couverture: 0, tarif: 51213.97, ratioKwc: 0.45, ratioM2: 109.64, coutTravee: 4848.31 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D7', code: 'OD3', longueur: 75, largeur: 6.92, surface: 519.0, sabliere: '2.93m', faitage: '4.96m', travees: '10 x 7.5m', kwc: 126, charpente: 28348.92, fondations: 27510.00, couverture: 0, tarif: 55858.92, ratioKwc: 0.44, ratioM2: 107.63, coutTravee: 4626.95 },

  // OMBRIERE VL DOUBLE (O4)
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4A', code: 'O4', longueur: 30, largeur: 9.14, surface: 274.2, sabliere: '3m', faitage: '4.61m', travees: '4 x 7.5m', kwc: 65, charpente: 15399.36, fondations: 13650.00, couverture: 0, tarif: 29049.36, ratioKwc: 0.44, ratioM2: 105.94, coutTravee: 5097.22 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4B', code: 'O4', longueur: 37.5, largeur: 9.14, surface: 342.75, sabliere: '3m', faitage: '4.61m', travees: '5 x 7.5m', kwc: 81, charpente: 18186.58, fondations: 15959.99, couverture: 0, tarif: 34146.58, ratioKwc: 0.42, ratioM2: 99.63, coutTravee: 5097.22 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4C', code: 'O4', longueur: 45, largeur: 9.14, surface: 411.3, sabliere: '3m', faitage: '4.61m', travees: '6 x 7.5m', kwc: 100, charpente: 20973.80, fondations: 18270.00, couverture: 0, tarif: 39243.80, ratioKwc: 0.39, ratioM2: 95.41, coutTravee: 5097.21 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4D', code: 'O4', longueur: 52.5, largeur: 9.14, surface: 479.85, sabliere: '3m', faitage: '4.61m', travees: '7 x 7.5m', kwc: 115, charpente: 23761.01, fondations: 20580.00, couverture: 0, tarif: 44341.01, ratioKwc: 0.39, ratioM2: 92.41, coutTravee: 5097.22 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4E', code: 'O4', longueur: 60, largeur: 9.14, surface: 548.4, sabliere: '3m', faitage: '4.61m', travees: '8 x 7.5m', kwc: 130, charpente: 26548.23, fondations: 22890.00, couverture: 0, tarif: 49438.23, ratioKwc: 0.38, ratioM2: 90.15, coutTravee: 5097.22 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4F', code: 'O4', longueur: 67.5, largeur: 9.14, surface: 616.95, sabliere: '3m', faitage: '4.61m', travees: '9 x 7.5m', kwc: 145, charpente: 29335.45, fondations: 25200.00, couverture: 0, tarif: 54535.45, ratioKwc: 0.38, ratioM2: 88.40, coutTravee: 5097.22 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4G', code: 'O4', longueur: 75, largeur: 9.14, surface: 685.5, sabliere: '3m', faitage: '4.61m', travees: '10 x 7.5m', kwc: 163, charpente: 32122.66, fondations: 27510.00, couverture: 0, tarif: 59632.66, ratioKwc: 0.37, ratioM2: 86.99, coutTravee: 5097.21 },

  // OMBRIERE VL DOUBLE+ (O5)
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5A', code: 'O5', longueur: 30, largeur: 11.35, surface: 340.5, sabliere: '2.8m', faitage: '4.74m', travees: '4 x 7.5m', kwc: 91, charpente: 18465.37, fondations: 13650.00, couverture: 0, tarif: 32115.37, ratioKwc: 0.35, ratioM2: 94.32, coutTravee: 5927.87 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5B', code: 'O5', longueur: 37.5, largeur: 11.35, surface: 425.625, sabliere: '2.8m', faitage: '4.74m', travees: '5 x 7.5m', kwc: 119, charpente: 22083.24, fondations: 15959.99, couverture: 0, tarif: 38043.24, ratioKwc: 0.34, ratioM2: 89.38, coutTravee: 5927.87 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5C', code: 'O5', longueur: 45, largeur: 11.35, surface: 510.75, sabliere: '2.8m', faitage: '4.74m', travees: '6 x 7.5m', kwc: 133, charpente: 25515.75, fondations: 18270.00, couverture: 0, tarif: 43785.75, ratioKwc: 0.33, ratioM2: 85.73, coutTravee: 5742.51 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5D', code: 'O5', longueur: 52.5, largeur: 11.35, surface: 595.875, sabliere: '2.8m', faitage: '4.74m', travees: '7 x 7.5m', kwc: 156, charpente: 28948.25, fondations: 20580.00, couverture: 0, tarif: 49528.25, ratioKwc: 0.32, ratioM2: 83.12, coutTravee: 5742.50 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5E', code: 'O5', longueur: 60, largeur: 11.35, surface: 681.0, sabliere: '2.8m', faitage: '4.74m', travees: '8 x 7.5m', kwc: 179, charpente: 32380.76, fondations: 22890.00, couverture: 0, tarif: 55270.76, ratioKwc: 0.31, ratioM2: 81.16, coutTravee: 5742.51 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5F', code: 'O5', longueur: 67.5, largeur: 11.35, surface: 766.125, sabliere: '2.8m', faitage: '4.74m', travees: '9 x 7.5m', kwc: 198, charpente: 35998.63, fondations: 25200.00, couverture: 0, tarif: 61198.63, ratioKwc: 0.31, ratioM2: 79.88, coutTravee: 5927.87 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5G', code: 'O5', longueur: 75, largeur: 11.35, surface: 851.25, sabliere: '2.8m', faitage: '4.74m', travees: '10 x 7.5m', kwc: 221, charpente: 39431.13, fondations: 27510.00, couverture: 0, tarif: 66941.13, ratioKwc: 0.30, ratioM2: 78.64, coutTravee: 5742.50 },

  // OMBRIERE PL 16m (O7)
  { gamme: 'OMBRIERE PL 16m', id: 'O7A', code: 'O7', longueur: 30, largeur: 15.80, surface: 474.0, sabliere: '5.1m', faitage: '7.86m', travees: '4 x 7.5m', kwc: 117, charpente: 28798.81, fondations: 15399.99, couverture: 0, tarif: 44198.81, ratioKwc: 0.38, ratioM2: 93.25, coutTravee: 8459.20 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7B', code: 'O7', longueur: 37.5, largeur: 15.80, surface: 592.5, sabliere: '5.1m', faitage: '7.86m', travees: '5 x 7.5m', kwc: 146, charpente: 34598.01, fondations: 18060.00, couverture: 0, tarif: 52658.01, ratioKwc: 0.36, ratioM2: 88.87, coutTravee: 8459.20 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7C', code: 'O7', longueur: 45, largeur: 15.80, surface: 711.0, sabliere: '5.1m', faitage: '7.86m', travees: '6 x 7.5m', kwc: 175, charpente: 40582.57, fondations: 20720.00, couverture: 0, tarif: 61302.57, ratioKwc: 0.35, ratioM2: 86.22, coutTravee: 8644.56 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7D', code: 'O7', longueur: 52.5, largeur: 15.80, surface: 829.5, sabliere: '5.1m', faitage: '7.86m', travees: '7 x 7.5m', kwc: 201, charpente: 46381.77, fondations: 23380.00, couverture: 0, tarif: 69761.77, ratioKwc: 0.35, ratioM2: 84.10, coutTravee: 8459.20 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7E', code: 'O7', longueur: 60, largeur: 15.80, surface: 948.0, sabliere: '5.1m', faitage: '7.86m', travees: '8 x 7.5m', kwc: 230, charpente: 52366.33, fondations: 26040.00, couverture: 0, tarif: 78406.33, ratioKwc: 0.34, ratioM2: 82.71, coutTravee: 8644.56 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7F', code: 'O7', longueur: 67.5, largeur: 15.80, surface: 1066.5, sabliere: '5.1m', faitage: '7.86m', travees: '9 x 7.5m', kwc: 255, charpente: 58005.53, fondations: 28699.99, couverture: 0, tarif: 87705.53, ratioKwc: 0.34, ratioM2: 82.24, coutTravee: 9299.20 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7G', code: 'O7', longueur: 75, largeur: 15.80, surface: 1185.0, sabliere: '5.1m', faitage: '7.86m', travees: '10 x 7.5m', kwc: 286, charpente: 64990.08, fondations: 31359.99, couverture: 0, tarif: 96350.08, ratioKwc: 0.34, ratioM2: 81.31, coutTravee: 8644.55 },

  // OMBRIERE PL 20m (O9)
  { gamme: 'OMBRIERE PL 20m', id: 'O9A', code: 'O9', longueur: 30, largeur: 20.22, surface: 606.6, sabliere: '5.73m', faitage: '9.29m', travees: '4 x 7.5m', kwc: 156, charpente: 39550.20, fondations: 22050.00, couverture: 0, tarif: 61600.20, ratioKwc: 0.39, ratioM2: 101.55, coutTravee: 12131.38 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9B', code: 'O9', longueur: 37.5, largeur: 20.22, surface: 758.25, sabliere: '5.73m', faitage: '9.29m', travees: '5 x 7.5m', kwc: 195, charpente: 47691.58, fondations: 26040.00, couverture: 0, tarif: 73731.58, ratioKwc: 0.38, ratioM2: 97.24, coutTravee: 12131.38 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9C', code: 'O9', longueur: 45, largeur: 20.22, surface: 909.9, sabliere: '5.73m', faitage: '9.29m', travees: '6 x 7.5m', kwc: 228, charpente: 55832.96, fondations: 30029.99, couverture: 0, tarif: 85862.96, ratioKwc: 0.38, ratioM2: 94.37, coutTravee: 12131.38 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9D', code: 'O9', longueur: 52.5, largeur: 20.22, surface: 1061.55, sabliere: '5.73m', faitage: '9.29m', travees: '7 x 7.5m', kwc: 267, charpente: 64814.34, fondations: 34020.00, couverture: 0, tarif: 98834.34, ratioKwc: 0.37, ratioM2: 93.10, coutTravee: 12971.38 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9E', code: 'O9', longueur: 60, largeur: 20.22, surface: 1213.2, sabliere: '5.73m', faitage: '9.29m', travees: '8 x 7.5m', kwc: 306, charpente: 72955.73, fondations: 38010.00, couverture: 0, tarif: 110965.73, ratioKwc: 0.36, ratioM2: 91.47, coutTravee: 12131.38 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9F', code: 'O9', longueur: 67.5, largeur: 20.22, surface: 1364.85, sabliere: '5.73m', faitage: '9.29m', travees: '9 x 7.5m', kwc: 340, charpente: 81097.11, fondations: 42000.00, couverture: 0, tarif: 123097.11, ratioKwc: 0.36, ratioM2: 90.19, coutTravee: 12131.38 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9G', code: 'O9', longueur: 75, largeur: 20.22, surface: 1516.5, sabliere: '5.73m', faitage: '9.29m', travees: '10 x 7.5m', kwc: 379, charpente: 89428.85, fondations: 45990.00, couverture: 0, tarif: 135418.85, ratioKwc: 0.36, ratioM2: 89.29, coutTravee: 12316.74 },

  // OMBRIERE PL 25m (O11)
  { gamme: 'OMBRIERE PL 25m', id: 'O11A', code: 'O11', longueur: 30, largeur: 24.65, surface: 739.5, sabliere: '5m', faitage: '9.35m', travees: '4 x 7.5m', kwc: 184, charpente: 46915.93, fondations: 22050.00, couverture: 0, tarif: 68965.93, ratioKwc: 0.37, ratioM2: 93.26, coutTravee: 14456.74 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11B', code: 'O11', longueur: 37.5, largeur: 24.65, surface: 924.375, sabliere: '5m', faitage: '9.35m', travees: '5 x 7.5m', kwc: 227, charpente: 57382.67, fondations: 26040.00, couverture: 0, tarif: 83422.67, ratioKwc: 0.37, ratioM2: 90.25, coutTravee: 14456.73 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11C', code: 'O11', longueur: 45, largeur: 24.65, surface: 1109.25, sabliere: '5m', faitage: '9.35m', travees: '6 x 7.5m', kwc: 276, charpente: 68504.05, fondations: 30029.99, couverture: 0, tarif: 98534.05, ratioKwc: 0.36, ratioM2: 88.83, coutTravee: 15111.38 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11D', code: 'O11', longueur: 52.5, largeur: 24.65, surface: 1294.125, sabliere: '5m', faitage: '9.35m', travees: '7 x 7.5m', kwc: 317, charpente: 78970.78, fondations: 34020.00, couverture: 0, tarif: 112990.78, ratioKwc: 0.36, ratioM2: 87.31, coutTravee: 14456.73 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11E', code: 'O11', longueur: 60, largeur: 24.65, surface: 1479.0, sabliere: '5m', faitage: '9.35m', travees: '8 x 7.5m', kwc: 358, charpente: 89437.52, fondations: 38010.00, couverture: 0, tarif: 127447.52, ratioKwc: 0.36, ratioM2: 86.17, coutTravee: 14456.74 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11F', code: 'O11', longueur: 67.5, largeur: 24.65, surface: 1663.875, sabliere: '5m', faitage: '9.35m', travees: '9 x 7.5m', kwc: 398, charpente: 99718.89, fondations: 42000.00, couverture: 0, tarif: 141718.89, ratioKwc: 0.36, ratioM2: 85.17, coutTravee: 14271.37 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11G', code: 'O11', longueur: 75, largeur: 24.65, surface: 1848.75, sabliere: '5m', faitage: '9.35m', travees: '10 x 7.5m', kwc: 450, charpente: 110185.63, fondations: 45990.00, couverture: 0, tarif: 156175.63, ratioKwc: 0.35, ratioM2: 84.48, coutTravee: 14456.74 },
];

// Group series to calculate delta per 7.50m bay for buildings
const seriesData = {};
barconniereXlsx.forEach(row => {
  if (row['Gamme'].startsWith('OMBRIERE')) return;
  const g = row['Gamme'];
  const seriesKey = `${g}_${row['Largeur'] || ''}`;
  if (!seriesData[seriesKey]) seriesData[seriesKey] = [];
  seriesData[seriesKey].push(row);
});

const traveeSupBySeries = {};
Object.entries(seriesData).forEach(([sKey, list]) => {
  list.sort((a, b) => Number(a['Longueur']) - Number(b['Longueur']));
  if (list.length >= 2) {
    const r1 = list[0];
    const r2 = list[1];
    const lenDelta = Number(r2['Longueur']) - Number(r1['Longueur']);
    const numBays = lenDelta / 7.5;
    
    const p1 = pdfParsed[`${r1['Gamme']}_${r1['#']}`];
    const p2 = pdfParsed[`${r2['Gamme']}_${r2['#']}`];
    if (p1 && p2) {
      const dCharp = (p2.charpente - p1.charpente) / numBays;
      const dFond = (p2.fondations - p1.fondations) / numBays;
      const dCouv = (p2.couverture - p1.couverture) / numBays;
      const dTot = (p2.totalSansPv - p1.totalSansPv) / numBays;
      traveeSupBySeries[sKey] = {
        charpente_travee: Math.round(dCharp * 100) / 100,
        fondations_travee: Math.round(dFond * 100) / 100,
        couverture_travee: Math.round(dCouv * 100) / 100,
        total_travee: Math.round(dTot * 100) / 100,
      };
    }
  }
});

function getFamilyAndCategory(gamme) {
  if (gamme.startsWith('OMBRIERE PL')) {
    return { family: 'OMBRIERE_PL', category: 'Ombrières de parking PL', pente_degres: 10 };
  }
  if (gamme.startsWith('OMBRIERE VL')) {
    return { family: 'OMBRIERE_VL', category: 'Ombrières de parking VL', pente_degres: 10 };
  }
  if (gamme.startsWith('YOKO')) {
    return { family: 'MONOPENTE', category: 'Monopentes', pente_degres: 15 };
  }
  if (gamme.startsWith('HELIOS') || gamme.startsWith('SOLEA')) {
    return { family: 'SYMETRIQUE', category: 'Halls Symétriques', pente_degres: 10 };
  }
  return { family: 'ASYMETRIQUE', category: 'Asymétriques & Auvents', pente_degres: 15 };
}

const parseDim = (val) => {
  if (val === undefined || val === null) return 0;
  const n = parseFloat(String(val).replace('m', '').replace(',', '.').trim());
  return isNaN(n) ? 0 : n;
};

// 1. Process standard buildings (non-ombrieres)
const buildingModels = barconniereXlsx
  .filter(row => !row['Gamme'].startsWith('OMBRIERE'))
  .map((row) => {
    const gamme = row['Gamme'];
    const id = row['#'];
    const code = row['Equivalence Barconnière'] || id;
    const longueur = Number(row['Longueur']);
    
    let largeur = row['Largeur'];
    let largeurNum = typeof largeur === 'number' ? largeur : parseFloat(String(largeur).replace(',', '.'));
    if (typeof largeur === 'string' && largeur.includes('+')) {
      const parts = largeur.split('+').map(p => parseFloat(p.trim().replace(',', '.')));
      largeurNum = parts.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    }
    
    const surface = Number(row['Surface']) || Math.round(longueur * largeurNum);
    const puissance = Number(row['Puissance']);
    const { family, category, pente_degres } = getFamilyAndCategory(gamme);
    
    const seriesKey = `${gamme}_${row['Largeur'] || ''}`;
    const traveeSup = traveeSupBySeries[seriesKey] || {
      charpente_travee: 0,
      fondations_travee: 0,
      couverture_travee: 0,
      total_travee: 0,
    };
    
    let charpente = 0;
    let fondations = 0;
    let couverture = 0;
    let totalSansPv = Number(row['Tarif sans PV (€)']);
    let ratioKwc = Number(row['Ratio Tarif/Puissance']);
    
    const p = pdfParsed[`${gamme}_${id}`];
    if (p) {
      charpente = p.charpente;
      fondations = p.fondations;
      couverture = p.couverture;
      totalSansPv = p.totalSansPv;
      if (p.ratioKwc) ratioKwc = p.ratioKwc;
    }
    
    const ratioSurface = surface > 0 ? Math.round((totalSansPv / surface) * 100) / 100 : 0;

    return {
      gamme,
      id,
      code,
      designation: `${gamme} (${id})`,
      family,
      category,
      longueur,
      largeur: largeurNum,
      largeurRaw: String(largeur),
      surface,
      poteau: row['Poteau'] || '',
      sabliere: String(row['Sablière'] || ''),
      faitage: String(row['Faitage'] || ''),
      travees: String(row['Travées'] || ''),
      auventSud: row['Auvent Sud'] || '',
      auventNord: row['Auvent Nord'] || '',
      optionApAu: row['Option Ap/Au'] || '',
      kwc: puissance,
      puissance,
      tarif: totalSansPv,
      ratioKwc: Math.round(ratioKwc * 100) / 100,
      ratioM2: Math.round(ratioSurface),
      dimensions: {
        largeur_m: largeurNum,
        longueur_base_m: longueur,
        hauteur_sabliere_m: parseDim(row['Sablière']),
        hauteur_faitage_m: parseDim(row['Faitage']),
        pente_degres,
        largeur_travee_m: 7.5,
        travees: String(row['Travées'] || ''),
      },
      pricing_ht: {
        charpente_base_ht: charpente,
        fondations_base_ht: fondations,
        couverture_base_ht: couverture,
        total_base_ht: totalSansPv,
        cout_travee_sup_ht: traveeSup,
      },
      ratios: {
        ratio_puissance: Math.round(ratioKwc * 100) / 100,
        ratio_surface: ratioSurface,
      },
    };
  });

// 2. Process Ombrières models with internal codes (O3M1..O11G) and exact breakdown
const ombriereModels = OMBRIERES_EXACT_DATA.map((o) => {
  const { family, category, pente_degres } = getFamilyAndCategory(o.gamme);
  return {
    gamme: o.gamme,
    id: o.id,
    code: o.code,
    designation: `${o.gamme} (${o.id})`,
    family,
    category,
    longueur: o.longueur,
    largeur: o.largeur,
    largeurRaw: String(o.largeur),
    surface: o.surface,
    poteau: '',
    sabliere: o.sabliere,
    faitage: o.faitage,
    travees: o.travees,
    auventSud: '',
    auventNord: '',
    optionApAu: '',
    kwc: o.kwc,
    puissance: o.kwc,
    tarif: o.tarif,
    ratioKwc: o.ratioKwc,
    ratioM2: Math.round(o.ratioM2),
    dimensions: {
      largeur_m: o.largeur,
      longueur_base_m: o.longueur,
      hauteur_sabliere_m: parseDim(o.sabliere),
      hauteur_faitage_m: parseDim(o.faitage),
      pente_degres,
      largeur_travee_m: 7.5,
      travees: o.travees,
    },
    pricing_ht: {
      charpente_base_ht: o.charpente,
      fondations_base_ht: o.fondations,
      couverture_base_ht: o.couverture,
      total_base_ht: o.tarif,
      cout_travee_sup_ht: {
        charpente_travee: Math.round((o.coutTravee * (o.charpente / (o.charpente + o.fondations))) * 100) / 100,
        fondations_travee: Math.round((o.coutTravee * (o.fondations / (o.charpente + o.fondations))) * 100) / 100,
        couverture_travee: 0,
        total_travee: o.coutTravee,
      },
    },
    ratios: {
      ratio_puissance: o.ratioKwc,
      ratio_surface: o.ratioM2,
    },
  };
});

const barconniereCatalog = [...buildingModels, ...ombriereModels];

// 3. Process ACAMA models
const acamaCatalog = acamaXlsx.map((row) => {
  const gamme = String(row['Gamme'] || '').trim();
  const id = String(row['#'] || '').trim();
  const code = id;
  const longueur = Number(row['Longueur']);
  const largeur = Number(row['Largeur']);
  const surface = Math.round(Number(row['Surface']) || longueur * largeur);
  const puissance = Number(row['Puissance']);
  const tarif = Number(row['Tarif sans PV (€)']);
  const ratioKwc = Number(row['Ratio Tarif/Puissance']);
  const ratioM2 = surface > 0 ? Math.round(tarif / surface) : 0;
  const roofWeighting = Math.round((Number(row['Pondération toiture 1']) || 0.5) * 100);
  const angleStr = String(row['Inclinaison'] || '14°').replace('°', '').trim();
  const angle = parseFloat(angleStr) || 14;
  
  return {
    gamme,
    id,
    code,
    designation: `${gamme} - ${id}`,
    longueur,
    largeur,
    surface,
    sabliere: `${row['Sablière'] || 4}m`,
    faitage: `${row['Faitage'] || 4}m`,
    travees: `${row['Travées'] || ''} x ${row['Largeur travée'] || 7.5}m`,
    puissance,
    kwc: puissance,
    tarif,
    ratioKwc: Math.round(ratioKwc * 100) / 100,
    ratioM2,
    roofWeighting,
    angle,
    dimensions: {
      largeur_m: largeur,
      longueur_base_m: longueur,
      hauteur_sabliere_m: Number(row['Sablière']) || 4,
      hauteur_faitage_m: Number(row['Faitage']) || 4,
      pente_degres: angle,
      largeur_travee_m: Number(row['Largeur travée']) || 7.5,
      travees: `${row['Travées'] || ''} x ${row['Largeur travée'] || 7.5}m`,
    },
    pricing_ht: {
      charpente_base_ht: Math.round(tarif * 0.5 * 100) / 100,
      fondations_base_ht: Math.round(tarif * 0.25 * 100) / 100,
      couverture_base_ht: Math.round(tarif * 0.25 * 100) / 100,
      total_base_ht: tarif,
      cout_travee_sup_ht: {
        charpente_travee: 0,
        fondations_travee: 0,
        couverture_travee: 0,
        total_travee: 0,
      }
    },
    ratios: {
      ratio_puissance: Math.round(ratioKwc * 100) / 100,
      ratio_surface: ratioM2,
    }
  };
});

const content = `/**
 * Catalogue Officiel Complet (Barconnière GREEN INVEST & Acama)
 * Source: Tableaux bâtiments complet.xlsx & Barconnière Décomposition Officielle
 * Total modèles: ${barconniereCatalog.length} Green Invest / ${acamaCatalog.length} Acama
 */

export const BARCONNIERE_CATALOG = ${JSON.stringify(barconniereCatalog, null, 2)};

export const ACAMA_CATALOG = ${JSON.stringify(acamaCatalog, null, 2)};

/**
 * Recherche intelligente d'un bâtiment dans le catalogue selon les dimensions et typologie
 */
export function findBarconniereBuilding({
  length = 30,
  width = 15,
  buildingType = 'symetrique',
  leftSide = 'none',
  rightSide = 'none',
  leftWidth = 0,
  rightWidth = 0,
  isAcama = false,
}) {
  const totalWidth = width + (leftSide !== 'none' ? Number(leftWidth) : 0) + (rightSide !== 'none' ? Number(rightWidth) : 0);
  const floorArea = Math.round(length * totalWidth);
  const bType = String(buildingType).toLowerCase();

  // Mode Acama
  if (isAcama) {
    let matches = ACAMA_CATALOG.filter(item => {
      const matchWidth = Math.abs(item.largeur - totalWidth) < 0.6 || Math.abs(item.largeur - width) < 0.6;
      const matchLength = Math.abs(item.longueur - length) < 1.5;
      return matchWidth && matchLength;
    });

    if (matches.length > 0) return { ...matches[0], exactMatch: true };
    
    let closest = ACAMA_CATALOG.reduce((best, cur) => {
      const widthDiff = Math.abs(cur.largeur - totalWidth);
      const lengthDiff = Math.abs(cur.longueur - length);
      const score = (widthDiff * 3) + lengthDiff;
      if (!best || score < best.score) return { item: cur, score };
      return best;
    }, null);
    
    if (closest && closest.item) {
      const item = closest.item;
      const surfaceRatio = floorArea / (item.surface || 1);
      return { ...item, tarif: Math.round(item.tarif * surfaceRatio), surface: floorArea, exactMatch: false };
    }
  }

  // 1. Filtrer par typologie Barconnière
  let candidateGammes = [];

  if (bType.includes('ombriere') || bType.includes('parking')) {
    if (bType.includes('droite')) {
      candidateGammes = ['OMBRIERE VL SIMPLE DROITE'];
    } else if (bType.includes('gauche') || (bType.includes('simple') && !bType.includes('double') && !bType.includes('pl'))) {
      candidateGammes = ['OMBRIERE VL SIMPLE GAUCHE'];
    } else if (bType.includes('double+') || bType.includes('double_plus') || (bType.includes('double') && totalWidth >= 10.5)) {
      candidateGammes = ['OMBRIERE VL DOUBLE+'];
    } else if (bType.includes('double')) {
      candidateGammes = ['OMBRIERE VL DOUBLE'];
    } else if (bType.includes('pl') || totalWidth >= 14.0) {
      if (totalWidth >= 23.0 || bType.includes('25')) {
        candidateGammes = ['OMBRIERE PL 25m'];
      } else if (totalWidth >= 18.0 || bType.includes('20')) {
        candidateGammes = ['OMBRIERE PL 20m'];
      } else {
        candidateGammes = ['OMBRIERE PL 16m'];
      }
    } else {
      candidateGammes = ['OMBRIERE VL SIMPLE GAUCHE', 'OMBRIERE VL SIMPLE DROITE', 'OMBRIERE VL DOUBLE', 'OMBRIERE VL DOUBLE+', 'OMBRIERE PL 16m', 'OMBRIERE PL 20m', 'OMBRIERE PL 25m'];
    }
  } else if (bType.startsWith('mono')) {
    if (width >= 14.5 || totalWidth >= 22.0) {
      candidateGammes = ['ATLAS 16'];
    } else {
      candidateGammes = ['ATLAS 12'];
    }
  } else if (bType.startsWith('asym')) {
    if (bType.includes('2') || width >= 23.5) {
      candidateGammes = width >= 27.0 ? ['CYRUS 29', 'CYRUS 25'] : ['CYRUS 25', 'CYRUS 29'];
    } else {
      candidateGammes = width >= 18.0 ? ['ORION 20', 'ORION 16'] : ['ORION 16', 'ORION 20'];
    }
  } else if (leftSide === 'appentis' && rightSide === 'appentis') {
    candidateGammes = ['YOKO 33', 'YOKO 37', 'YOKO 41', 'YOKO 45', 'YOKO 48'];
  } else if (leftSide === 'appentis' || rightSide === 'appentis') {
    candidateGammes = ['KEREN 24', 'KEREN 28', 'KEREN 32', 'KEREN 35', 'KEREN 39', 'KEREN 43'];
  } else if ((leftSide === 'auvent' && rightSide === 'auvent') || (totalWidth > width + 4.5)) {
    candidateGammes = ['SOLEA 21', 'SOLEA 26', 'SOLEA 30', 'SOLEA 34', 'SOLEA 37', 'SOLEA 41'];
  } else {
    // Symétrique standard
    candidateGammes = ['HELIOS 15', 'HELIOS 18', 'HELIOS 22', 'HELIOS 26', 'HELIOS 29', 'HELIOS 33'];
  }

  const hasExtensions = leftSide !== 'none' || rightSide !== 'none';

  // Chercher match exact
  let matches = BARCONNIERE_CATALOG.filter(item => {
    const matchGamme = candidateGammes.length === 0 || candidateGammes.includes(item.gamme);
    const matchWidth = hasExtensions
      ? Math.abs(item.largeur - totalWidth) < 0.6
      : (Math.abs(item.largeur - totalWidth) < 0.6 || Math.abs(item.largeur - width) < 0.6);
    const matchLength = Math.abs(item.longueur - length) < 1.0;

    let matchAuvents = true;
    if (bType.startsWith('mono')) {
      const wantAuventSud = (rightSide === 'auvent');
      const itemAuventSud = (item.auventSud === 'Oui');
      matchAuvents = (wantAuventSud === itemAuventSud);
    }

    return matchGamme && matchWidth && matchLength && matchAuvents;
  });

  if (matches.length > 0) return { ...matches[0], exactMatch: true };

  // Chercher match le plus proche
  let closest = BARCONNIERE_CATALOG.reduce((best, cur) => {
    const isPreferredGamme = candidateGammes.includes(cur.gamme);
    const widthDiff = Math.abs(cur.largeur - totalWidth);
    const lengthDiff = Math.abs(cur.longueur - length);
    const score = (widthDiff * 3) + lengthDiff + (isPreferredGamme ? 0 : 100);

    if (!best || score < best.score) return { item: cur, score };
    return best;
  }, null);

  if (closest && closest.item) {
    const item = closest.item;
    const surfaceRatio = floorArea / (item.surface || 1);
    const estimatedTarif = Math.round(item.tarif * surfaceRatio);
    return {
      ...item,
      tarif: estimatedTarif,
      surface: floorArea,
      exactMatch: false,
    };
  }

  // Fallback par défaut
  return {
    gamme: 'HELIOS 15',
    id: 'H1',
    code: 'S4.4 0.0 0.0',
    longueur: length,
    largeur: totalWidth,
    surface: floorArea,
    kwc: Math.round(floorArea * 0.20),
    puissance: Math.round(floorArea * 0.20),
    tarif: Math.round(floorArea * 122),
    ratioKwc: 0.57,
    ratioM2: 122,
    exactMatch: false,
    dimensions: {
      largeur_m: totalWidth,
      longueur_base_m: length,
      hauteur_sabliere_m: 5.5,
      hauteur_faitage_m: 6.82,
      pente_degres: 10,
      largeur_travee_m: 7.5,
      travees: '4 x 7.5m',
    },
    pricing_ht: {
      charpente_base_ht: Math.round(floorArea * 122 * 0.45),
      fondations_base_ht: Math.round(floorArea * 122 * 0.28),
      couverture_base_ht: Math.round(floorArea * 122 * 0.27),
      total_base_ht: Math.round(floorArea * 122),
      cout_travee_sup_ht: {
        charpente_travee: 4827,
        fondations_travee: 2700,
        couverture_travee: 3350,
        total_travee: 10877,
      }
    },
    ratios: {
      ratio_puissance: 0.57,
      ratio_surface: 122,
    }
  };
}
`;

fs.writeFileSync('./src/data/barconniereCatalog.js', content, 'utf8');
console.log('Successfully updated src/data/barconniereCatalog.js with exact ombriere data');
