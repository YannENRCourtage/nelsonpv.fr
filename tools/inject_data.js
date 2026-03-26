
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = 'Tableaux bâtiments complet.xlsx';
const targetFile = 'src/pages/BpAcama.jsx';

// 1. Read Excel
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

// 2. Format JS Data Array
const formatted = data.map(row => {
    const travees = parseInt(row['Travées']) || 0;
    const faitage = parseFloat(row['Faitage']) || 0;
    
    // Use Sablière for height, fallback to 4
    const height = parseFloat(row['Sablière']) || 4;
    const hSud = height;
    const hNord = height;

    return `  { type:'${row['Gamme']} ${row['#']}', spv:'GREEN INVEST', kwc:${row['Puissance']}, cout_bat:${row['Tarif sans PV (€)']}, longueur:${row['Longueur']}, largeur:${row['Largeur']}, travees:${travees}, hSud:${hSud}, hNord:${hNord}, faitage:${faitage}, surfTot:${row['Surface']} },`;
});

const newArrayContent = [
    'const SUIVI_BAT_DATA_GREEN_INVEST = [',
    ...formatted,
    '];'
].join('\n');

// 3. Read and Update BpAcama.jsx
let content = fs.readFileSync(targetFile, 'utf8');
const lines = content.split('\n');

// Find the block to replace
const startLineIdx = lines.findIndex(l => l.includes('const SUIVI_BAT_DATA_GREEN_INVEST = ['));
if (startLineIdx === -1) {
    console.error('Could not find start marker');
    process.exit(1);
}

// Find the corresponding closing ];
let endLineIdx = -1;
for (let i = startLineIdx; i < lines.length; i++) {
    if (lines[i].trim() === '];') {
        endLineIdx = i;
        break;
    }
}

if (endLineIdx === -1) {
    console.error('Could not find end marker');
    process.exit(1);
}

console.log(`Replacing lines ${startLineIdx + 1} to ${endLineIdx + 1}`);

const newLines = [
    ...lines.slice(0, startLineIdx),
    newArrayContent,
    ...lines.slice(endLineIdx + 1)
];

fs.writeFileSync(targetFile, newLines.join('\n'), 'utf8');
console.log('Update successful!');
