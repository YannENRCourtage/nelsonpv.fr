import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import xlsx from 'xlsx';

async function main() {
  const data = new Uint8Array(fs.readFileSync('C:/Users/Utilisateur/Desktop/1.pdf'));
  const doc = await pdfjs.getDocument({ data }).promise;
  let allPdfRows = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const rowsByY = {};
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5] * 2) / 2;
      if (!rowsByY[y]) rowsByY[y] = [];
      rowsByY[y].push({ x: item.transform[4], str: item.str.trim() });
    }
    const sortedYs = Object.keys(rowsByY).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = rowsByY[y].filter(it => it.str.length > 0).sort((a, b) => a.x - b.x);
      if (rowItems.length > 3) {
        allPdfRows.push({ page: p, y, items: rowItems.map(it => it.str) });
      }
    }
  }

  console.log('Total PDF rows:', allPdfRows.length);
  fs.writeFileSync('./scripts/pdf_rows_extracted.json', JSON.stringify(allPdfRows, null, 2));

  const wb = xlsx.readFile('./Tableaux bâtiments complet.xlsx');
  const barconniereSheet = wb.Sheets['BARCONNIERE'];
  const barconniereJson = xlsx.utils.sheet_to_json(barconniereSheet);
  console.log('Total XLSX BARCONNIERE rows:', barconniereJson.length);
  fs.writeFileSync('./scripts/xlsx_rows_extracted.json', JSON.stringify(barconniereJson, null, 2));

  console.log('Sample PDF rows (first 10):');
  for (let i = 0; i < Math.min(10, allPdfRows.length); i++) {
    console.log(allPdfRows[i].items.join(' | '));
  }
}

main().catch(console.error);
