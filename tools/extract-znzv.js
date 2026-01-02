import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const inputFile = path.resolve('ZNZV.xlsx');
const outputFile = path.resolve('src/data/znzv.json');

console.log(`Reading from ${inputFile}...`);

if (!fs.existsSync(inputFile)) {
    console.error('File not found:', inputFile);
    process.exit(1);
}

const workbook = XLSX.readFile(inputFile);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(sheet, { header: 'A' });

// Expected Columns: A=Zip, B=Seisme, C=Neige, D=Vent
// Skip header row if strictly 'Code Postal' etc, but user said Col A is zip.
// Let's assume row 1 might be header. We'll check content.

const znzvMap = {};

data.forEach(row => {
    let zip = row['A'];
    const seisme = row['B'];
    const neige = row['C'];
    const vent = row['D'];

    if (zip && (seisme || neige || vent)) {
        // Ensure zip is string (pad 5 chars?)
        zip = String(zip).trim();
        if (zip.length === 4) zip = '0' + zip; // France zip codes

        znzvMap[zip] = {
            seisme: String(seisme || '').trim(),
            neige: String(neige || '').trim(),
            vent: String(vent || '').trim()
        };
    }
});

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(znzvMap, null, 2));

console.log(`Extracted ${Object.keys(znzvMap).length} entries to ${outputFile}`);
