
import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'Tableaux bâtiments complet.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const formatted = data.map(row => {
    // Example row: { Gamme: 'SOLEA 34', '#': 'S26', Longueur: 30, Largeur: 34, Surface: 1020, Poteau: '4/26/4m', Sablière: '4.6m', Faitage: '7.8m', Travées: '4 x 7.5m', Puissance: 217, 'Tarif sans PV (€)': 99196 }
    
    const travees = parseInt(row['Travées']) || 0;
    const faitage = parseFloat(row['Faitage']) || 0;
    const hParts = (row['Poteau'] || '').split('/');
    const hSud = parseFloat(hParts[0]) || 4;
    const hNord = parseFloat(hParts[hParts.length - 1]) || 4;

    return {
        type: `${row['Gamme']} ${row['#']}`,
        spv: 'GREEN INVEST',
        kwc: row['Puissance'],
        cout_bat: row['Tarif sans PV (€)'],
        longueur: row['Longueur'],
        largeur: row['Largeur'],
        travees: travees,
        hSud: hSud,
        hNord: hNord,
        faitage: faitage,
        surfTot: row['Surface']
    };
});

console.log('const SUIVI_BAT_DATA_GREEN_INVEST = [');
formatted.forEach(item => {
    console.log(`  { type:'${item.type}', spv:'${item.spv}', kwc:${item.kwc}, cout_bat:${item.cout_bat}, longueur:${item.longueur}, largeur:${item.largeur}, travees:${item.travees}, hSud:${item.hSud}, hNord:${item.hNord}, faitage:${item.faitage}, surfTot:${item.surfTot} },`);
});
console.log('];');
