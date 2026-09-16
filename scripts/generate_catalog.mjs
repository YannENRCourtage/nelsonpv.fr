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

// Group series to calculate delta per 7.50m bay
const seriesData = {};
barconniereXlsx.forEach(row => {
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
    
    if (r1['Gamme'].startsWith('OMBRIERE')) {
      const tot1 = Number(r1['Tarif sans PV (€)']);
      const tot2 = Number(r2['Tarif sans PV (€)']);
      const dTot = (tot2 - tot1) / numBays;
      traveeSupBySeries[sKey] = {
        charpente_travee: Math.round(dTot * 0.50 * 100) / 100,
        fondations_travee: Math.round(dTot * 0.25 * 100) / 100,
        couverture_travee: Math.round(dTot * 0.25 * 100) / 100,
        total_travee: Math.round(dTot * 100) / 100,
      };
    } else {
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

const barconniereCatalog = barconniereXlsx.map((row) => {
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
  
  if (gamme.startsWith('OMBRIERE')) {
    charpente = Math.round(totalSansPv * 0.50 * 100) / 100;
    fondations = Math.round(totalSansPv * 0.25 * 100) / 100;
    couverture = Math.round(totalSansPv * 0.25 * 100) / 100;
  } else {
    const p = pdfParsed[`${gamme}_${id}`];
    if (p) {
      charpente = p.charpente;
      fondations = p.fondations;
      couverture = p.couverture;
      totalSansPv = p.totalSansPv;
      if (p.ratioKwc) ratioKwc = p.ratioKwc;
    }
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
console.log('Successfully written src/data/barconniereCatalog.js');
