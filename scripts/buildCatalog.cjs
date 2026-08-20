const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Tableaux bâtiments complet.xlsx');
const wb = xlsx.readFile(filePath);

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  if (typeof val === 'string') {
    val = val.replace(',', '.').trim();
    if (val.includes('+')) {
      const parts = val.split('+').map(p => parseFloat(p.trim()) || 0);
      return parts.reduce((a, b) => a + b, 0);
    }
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// 1. Barconniere
const rawBarc = xlsx.utils.sheet_to_json(wb.Sheets['BARCONNIERE']);
const barcList = rawBarc.filter(r => r['Gamme'] && r['#']).map(r => {
  const longueur = parseNum(r['Longueur']);
  const largeur = parseNum(r['Largeur']);
  const surface = parseNum(r['Surface']) || Math.round(longueur * largeur);
  const tarif = Math.round(parseNum(r['Tarif sans PV (€)']));
  const kwc = parseNum(r['Puissance']);
  const ratioKwc = parseNum(r['Ratio Tarif/Puissance']) || (kwc > 0 ? Number((tarif / (kwc * 1000)).toFixed(2)) : 0);
  const ratioM2 = Math.round(parseNum(r['Ratio Tarif/Surface'])) || (surface > 0 ? Math.round(tarif / surface) : 0);

  return {
    gamme: String(r['Gamme']).trim(),
    id: String(r['#']).replace(/^#/, '').trim(),
    code: String(r['Equivalence Barconnière'] || '').trim(),
    longueur,
    largeur: Number(largeur.toFixed(2)),
    surface: Number(surface.toFixed(1)),
    poteau: r['Poteau'] ? String(r['Poteau']).trim() : '',
    sabliere: r['Sablière'] ? String(r['Sablière']).trim() : '',
    faitage: r['Faitage'] ? String(r['Faitage']).trim() : '',
    travees: r['Travées'] ? String(r['Travées']).trim() : '',
    auventSud: r['Auvent Sud'] ? String(r['Auvent Sud']).trim() : '',
    auventNord: r['Auvent Nord'] ? String(r['Auvent Nord']).trim() : '',
    kwc,
    tarif,
    ratioKwc: Number(ratioKwc.toFixed(2)),
    ratioM2
  };
});

// 2. Acama
const rawAcama = xlsx.utils.sheet_to_json(wb.Sheets['ACAMA']);
const acamaList = rawAcama.filter(r => r['Gamme'] && r['#']).map(r => {
  const longueur = parseNum(r['Longueur']);
  const largeur = parseNum(r['Largeur']);
  const surface = parseNum(r['Surface']) || Math.round(longueur * largeur);
  const tarif = Math.round(parseNum(r['Tarif sans PV (€)']));
  const kwc = parseNum(r['Puissance']);
  const ratioKwc = parseNum(r['Ratio Tarif/Puissance']) || (kwc > 0 ? Number((tarif / (kwc * 1000)).toFixed(2)) : 0);
  const ratioM2 = surface > 0 ? Math.round(tarif / surface) : 0;

  return {
    gamme: String(r['Gamme']).trim(),
    id: String(r['#']).replace(/^#/, '').trim(),
    code: String(r['Gamme']).trim() + ' ' + String(r['#']).replace(/^#/, '').trim(),
    longueur,
    largeur: Number(largeur.toFixed(2)),
    surface: Number(surface.toFixed(1)),
    poteau: '',
    sabliere: r['Sablière'] ? String(r['Sablière']).trim() + 'm' : '',
    faitage: r['Faitage'] ? String(r['Faitage']).trim() + 'm' : '',
    travees: r['Travées'] && r['Largeur travée'] ? (r['Travées'] + ' x ' + r['Largeur travée'] + 'm') : (r['Travées'] ? String(r['Travées']) : ''),
    kwc,
    tarif,
    ratioKwc: Number(ratioKwc.toFixed(2)),
    ratioM2,
    inclinaison: r['Inclinaison'] ? String(r['Inclinaison']).trim() : ''
  };
});

const outContent = `/**
 * Catalogue Officiel Complet (Barconnière & Acama)
 * Généré automatiquement depuis Tableaux bâtiments complet.xlsx
 */

export const BARCONNIERE_CATALOG = ${JSON.stringify(barcList, null, 2)};

export const ACAMA_CATALOG = ${JSON.stringify(acamaList, null, 2)};

/**
 * Recherche intelligente du modèle correspondant dans les catalogues
 */
export function findBarconniereBuilding({
  length = 30.0,
  width = 15.0,
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

    if (matches.length > 0) {
      return { ...matches[0], exactMatch: true };
    }

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
      return {
        ...item,
        tarif: Math.round(item.tarif * surfaceRatio),
        surface: floorArea,
        exactMatch: false,
      };
    }
  }

  // 1. Filtrer par typologie Barconnière
  let candidateGammes = [];

  if (bType.includes('ombriere') || bType.includes('parking')) {
    candidateGammes = ['OMBRIERE VL SIMPLE GAUCHE', 'OMBRIERE VL SIMPLE DROITE', 'OMBRIERE VL DOUBLE', 'OMBRIERE VL DOUBLE+', 'OMBRIERE PL 16m', 'OMBRIERE PL 20m', 'OMBRIERE PL 25m'];
  } else if (bType.startsWith('mono')) {
    candidateGammes = ['ATLAS 12', 'ATLAS 16'];
  } else if (bType.startsWith('asym')) {
    if (totalWidth > 23.5) {
      candidateGammes = ['CYRUS 25', 'CYRUS 29', 'ORION 20'];
    } else {
      candidateGammes = ['ORION 16', 'ORION 20'];
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

  // Chercher match exact
  let matches = BARCONNIERE_CATALOG.filter(item => {
    const matchGamme = candidateGammes.length === 0 || candidateGammes.includes(item.gamme);
    const matchWidth = Math.abs(item.largeur - totalWidth) < 0.6 || Math.abs(item.largeur - width) < 0.6;
    const matchLength = Math.abs(item.longueur - length) < 1.0;
    return matchGamme && matchWidth && matchLength;
  });

  if (matches.length > 0) {
    return {
      ...matches[0],
      exactMatch: true,
    };
  }

  // Chercher match le plus proche
  let closest = BARCONNIERE_CATALOG.reduce((best, cur) => {
    const isPreferredGamme = candidateGammes.includes(cur.gamme);
    const widthDiff = Math.abs(cur.largeur - totalWidth);
    const lengthDiff = Math.abs(cur.longueur - length);
    const score = (widthDiff * 3) + lengthDiff + (isPreferredGamme ? 0 : 25);

    if (!best || score < best.score) {
      return { item: cur, score };
    }
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
    tarif: Math.round(floorArea * 122),
    ratioKwc: 0.57,
    ratioM2: 122,
    exactMatch: false,
  };
}
`;

const destPath = path.join(__dirname, '..', 'src', 'data', 'barconniereCatalog.js');
fs.writeFileSync(destPath, outContent, 'utf8');
console.log('Successfully generated barconniereCatalog.js with', barcList.length, 'Barconnière rows and', acamaList.length, 'Acama rows.');
