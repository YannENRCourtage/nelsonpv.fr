/**
 * Catalogue des modèles BatiTech® et référentiels du séchoir solaire thermovoltaïque Cogen'Air®
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MODÈLES BATITECH
// ═══════════════════════════════════════════════════════════════════════════════

export const BATITECH_MODELS = {
  'BT-3.1.15': {
    id: 'BT-3.1.15',
    name: 'BatiTech 3.1.15',
    puissanceKwc: 30.15,
    nbModules: 90,
    investissementBrut: 327053,
    zones: 1,
    ventilators: 1,
    description: 'Séchoir compact — 1 zone de séchage',
    dimensions: '18m × 20m',
    surfaceToiture: 360,
    length: 18,
    width: 20,
    capacitesMax: {
      fourrage_vrac: 300,
      bottes_carrees: 140,
      cereales_ble: 270,
      cereales_mais: 60,
      plaquettes_bois: 450,
    },
    // Décomposition investissement officielle (Image 3)
    postesInvestissement: {
      structureMetallique: 217822,
      systemeCogenAir: 77386,
      centraleSolaire: 31845,
      // Alias pour rétro-compatibilité
      totalBatiment: 217822,
      totalBase: 77386,
      totalInstallateurPV: 31845,
      lotCentraleThermovoltaique: 38693,
      processAeraulique: 38693,
      ingenieurie: 3000,
      portManutention: 735,
    },
    // Options détaillées spécifiques (Images 4 et 5)
    options: {
      auventNord: 4500,
      auventSud: 4500,
      auventNordSud: 9000,
      traveeSupplementaire: 20250,
      auventDescription: 'Structure + couverture bac acier (sur 3 travées de 6m)',
    },
    // Frais de fonctionnement annuels (maintenance)
    chargesAnnuelles: {
      ventilation: 1421,
      fraisFoinBottes: 0,
      maintenance: 300,
    },
  },
  'BT-6.2.15': {
    id: 'BT-6.2.15',
    name: 'BatiTech 6.2.15',
    puissanceKwc: 63.30,
    nbModules: 189,
    investissementBrut: 564986,
    zones: 2,
    ventilators: 2,
    description: 'Séchoir intermédiaire — 2 zones de séchage',
    dimensions: '36m × 20m',
    surfaceToiture: 720,
    length: 36,
    width: 20,
    capacitesMax: {
      fourrage_vrac: 640,
      bottes_carrees: 270,
      cereales_ble: 540,
      cereales_mais: 110,
      plaquettes_bois: 900,
    },
    // Décomposition investissement officielle (Image 3)
    postesInvestissement: {
      structureMetallique: 380751,
      systemeCogenAir: 137296,
      centraleSolaire: 46939,
      // Alias pour rétro-compatibilité
      totalBatiment: 380751,
      totalBase: 137296,
      totalInstallateurPV: 46939,
      lotCentraleThermovoltaique: 68648,
      processAeraulique: 68648,
      ingenieurie: 3000,
      portManutention: 735,
    },
    // Options détaillées spécifiques (Images 4 et 5)
    options: {
      auventNord: 9000,
      auventSud: 9000,
      auventNordSud: 18000,
      traveeSupplementaire: 20250,
      auventDescription: 'Structure + couverture bac acier (sur 6 travées de 6m)',
    },
    chargesAnnuelles: {
      ventilation: 2842,
      fraisFoinBottes: 0,
      maintenance: 500,
    },
  },
  'BT-8.3.15': {
    id: 'BT-8.3.15',
    name: 'BatiTech 8.3.15',
    puissanceKwc: 93.80,
    nbModules: 280,
    investissementBrut: 764501,
    zones: 3,
    ventilators: 3,
    description: 'Séchoir grande capacité — 3 zones de séchage',
    dimensions: '48m × 20m',
    surfaceToiture: 960,
    length: 48,
    width: 20,
    capacitesMax: {
      fourrage_vrac: 980,
      bottes_carrees: 410,
      cereales_ble: 810,
      cereales_mais: 160,
      plaquettes_bois: 1340,
    },
    // Décomposition investissement officielle (Image 3)
    postesInvestissement: {
      structureMetallique: 514302,
      systemeCogenAir: 194220,
      centraleSolaire: 55979,
      // Alias pour rétro-compatibilité
      totalBatiment: 514302,
      totalBase: 194220,
      totalInstallateurPV: 55979,
      lotCentraleThermovoltaique: 97110,
      processAeraulique: 97110,
      ingenieurie: 3000,
      portManutention: 735,
    },
    // Options détaillées spécifiques (Images 4 et 5)
    options: {
      auventNord: 12000,
      auventSud: 12000,
      auventNordSud: 24000,
      traveeSupplementaire: 20250,
      auventDescription: 'Structure + couverture bac acier (sur 8 travées de 6m)',
    },
    chargesAnnuelles: {
      ventilation: 4263,
      fraisFoinBottes: 0,
      maintenance: 800,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PALIERS CEE COGEN'AIR (Certificats d'Économies d'Énergie)
// ═══════════════════════════════════════════════════════════════════════════════

export const CEE_TIERS = [
  { maxModules: 108, label: 'De 0 à 36 kWc (0 à 108 modules)', prixUnitaire: 330 },
  { maxModules: 300, label: 'De 36 à 100 kWc (108 à 300 modules)', prixUnitaire: 317 },
  { maxModules: 500, label: 'De 100 à 170 kWc (300 à 500 modules)', prixUnitaire: 306 },
  { maxModules: 750, label: 'De 170 à 250 kWc (500 à 750 modules)', prixUnitaire: 286 },
];

export const FIXATION_COST_PER_PANEL = 101; // €/panneau

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ZONES CLIMATIQUES CEE (H1, H2, H3) par département
// ═══════════════════════════════════════════════════════════════════════════════

export const ZONES_CLIMATIQUES = {
  // H1 — Nord / Nord-Est / Centre
  '01': 'H1', '02': 'H1', '03': 'H1', '05': 'H1', '08': 'H1', '10': 'H1',
  '14': 'H1', '15': 'H1', '18': 'H1', '19': 'H1', '21': 'H1', '23': 'H1',
  '25': 'H1', '27': 'H1', '28': 'H1', '36': 'H1', '38': 'H1', '39': 'H1',
  '41': 'H1', '42': 'H1', '43': 'H1', '45': 'H1', '51': 'H1', '52': 'H1',
  '54': 'H1', '55': 'H1', '57': 'H1', '58': 'H1', '59': 'H1', '60': 'H1',
  '61': 'H1', '62': 'H1', '63': 'H1', '67': 'H1', '68': 'H1', '69': 'H1',
  '70': 'H1', '71': 'H1', '73': 'H1', '74': 'H1', '75': 'H1', '76': 'H1',
  '77': 'H1', '78': 'H1', '80': 'H1', '87': 'H1', '88': 'H1', '89': 'H1',
  '90': 'H1', '91': 'H1', '92': 'H1', '93': 'H1', '94': 'H1', '95': 'H1',

  // H2 — Ouest / Sud-Ouest / Façade Atlantique
  '04': 'H2', '07': 'H2', '09': 'H2', '12': 'H2', '16': 'H2', '17': 'H2',
  '22': 'H2', '24': 'H2', '26': 'H2', '29': 'H2', '31': 'H2', '32': 'H2',
  '33': 'H2', '35': 'H2', '37': 'H2', '40': 'H2', '44': 'H2', '46': 'H2',
  '47': 'H2', '48': 'H2', '49': 'H2', '50': 'H2', '53': 'H2', '56': 'H2',
  '64': 'H2', '65': 'H2', '72': 'H2', '79': 'H2', '81': 'H2', '82': 'H2',
  '84': 'H2', '85': 'H2', '86': 'H2',

  // H3 — Pourtour Méditerranéen
  '06': 'H3', '11': 'H3', '13': 'H3', '20': 'H3', '30': 'H3', '34': 'H3',
  '66': 'H3', '83': 'H3', '2A': 'H3', '2B': 'H3',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MATRICE DE CAPACITÉS DE SÉCHAGE MULTI-ZONES (Référence ENR Courtage)
// ═══════════════════════════════════════════════════════════════════════════════

export const DRYING_CAPACITIES = {
  'BT-3.1.15': {
    fourrage_vrac: { A: 180, B: 300, C: 360, D: 520 },
    bottes_carrees: { A: 120, B: 140, C: 160, D: 190 },
    cereales_ble: { A: 260, B: 270, C: 280, D: 290 },
    cereales_mais: { A: 50, B: 60, C: 60, D: 70 },
    plaquettes_bois: { A: 420, B: 450, C: 470, D: 500 },
  },
  'BT-6.2.15': {
    fourrage_vrac: { A: 370, B: 640, C: 760, D: 1100 },
    bottes_carrees: { A: 250, B: 270, C: 340, D: 380 },
    cereales_ble: { A: 550, B: 540, C: 560, D: 580 },
    cereales_mais: { A: 100, B: 110, C: 110, D: 140 },
    plaquettes_bois: { A: 820, B: 900, C: 950, D: 1010 },
  },
  'BT-8.3.15': {
    fourrage_vrac: { A: 550, B: 980, C: 1140, D: 1630 },
    bottes_carrees: { A: 350, B: 410, C: 480, D: 580 },
    cereales_ble: { A: 790, B: 810, C: 840, D: 860 },
    cereales_mais: { A: 140, B: 160, C: 200, D: 210 },
    plaquettes_bois: { A: 1260, B: 1340, C: 1400, D: 1510 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BARÈMES DE VENTILATION PAR MATIÈRE (€/an par cellule/ventilateur)
// ═══════════════════════════════════════════════════════════════════════════════

export const VENTILATOR_COSTS_PER_MATERIAL = {
  fourrage_vrac: 1421,
  bottes_carrees: 1421,
  cereales_ble: 426,
  cereales_mais: 1051,
  plaquettes_bois: 9207,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ZONES DE SÉCHAGE / ENSOLEILLEMENT (A, B, C, D)
// ═══════════════════════════════════════════════════════════════════════════════

export const DRYING_ZONE_BY_DEPARTMENT = {
  // Zone A - Méditerranée (1200-1400 kWh/kWc)
  '04': 'A', '06': 'A', '13': 'A', '20': 'A', '2A': 'A', '2B': 'A',
  '30': 'A', '34': 'A', '66': 'A', '83': 'A', '84': 'A',
  // Zone B - Sud / Sud-Ouest / Rhône-Alpes (1100-1200 kWh/kWc)
  '01': 'B', '03': 'B', '05': 'B', '07': 'B', '09': 'B', '11': 'B', '12': 'B',
  '15': 'B', '16': 'B', '17': 'B', '19': 'B', '23': 'B', '24': 'B', '26': 'B',
  '31': 'B', '32': 'B', '33': 'B', '38': 'B', '40': 'B', '42': 'B', '43': 'B',
  '46': 'B', '47': 'B', '48': 'B', '63': 'B', '64': 'B', '65': 'B', '69': 'B',
  '73': 'B', '74': 'B', '79': 'B', '81': 'B', '82': 'B', '86': 'B', '87': 'B',
  // Zone C - Centre / Ouest (1000-1100 kWh/kWc)
  '18': 'C', '21': 'C', '22': 'C', '25': 'C', '28': 'C', '29': 'C', '35': 'C',
  '36': 'C', '37': 'C', '39': 'C', '41': 'C', '44': 'C', '45': 'C', '49': 'C',
  '53': 'C', '56': 'C', '58': 'C', '70': 'C', '71': 'C', '72': 'C', '85': 'C',
  '89': 'C', '90': 'C',
  // Zone D - Nord / Est (800-1000 kWh/kWc)
  '02': 'D', '08': 'D', '10': 'D', '14': 'D', '27': 'D', '50': 'D', '51': 'D',
  '52': 'D', '54': 'D', '55': 'D', '57': 'D', '59': 'D', '60': 'D', '61': 'D',
  '62': 'D', '67': 'D', '68': 'D', '75': 'D', '76': 'D', '77': 'D', '78': 'D',
  '80': 'D', '88': 'D', '91': 'D', '92': 'D', '93': 'D', '94': 'D', '95': 'D',
};

export const ZONES_SECHAGE = DRYING_ZONE_BY_DEPARTMENT;

export function getDryingZone(deptCode) {
  if (!deptCode) return 'B';
  const clean = String(deptCode).trim().toUpperCase();
  return DRYING_ZONE_BY_DEPARTMENT[clean] || 'B';
}

export function getDryingCapacity(modelId = 'BT-3.1.15', materialId = 'fourrage_vrac', deptCode = '32') {
  const mId = modelId.startsWith('BT-') ? modelId : `BT-${modelId}`;
  const zone = getDryingZone(deptCode);
  const modelMatrix = DRYING_CAPACITIES[mId] || DRYING_CAPACITIES['BT-3.1.15'];
  if (modelMatrix && modelMatrix[materialId]) {
    return modelMatrix[materialId][zone] || modelMatrix[materialId]['B'] || 0;
  }
  const fallbackModel = BATITECH_MODELS[mId] || BATITECH_MODELS['BT-3.1.15'];
  return fallbackModel?.capacitesMax?.[materialId] || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PRODUCTION SOLAIRE RÉGIONALE (kWh/kWc/an) — Référence ENR Courtage
// ═══════════════════════════════════════════════════════════════════════════════

export const PRODUCTIBLE_BY_REGION = {
  '1200': ['04', '05', '06', '13', '83', '84', '20', '2A', '2B'],
  '1150': ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82', '07', '26', '01', '38', '42', '43', '63', '69', '73', '74', '03', '15', '16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  '1100': ['22', '29', '35', '56', '44', '49', '53', '72', '85', '18', '28', '36', '37', '41', '45', '21', '25', '39', '58', '70', '71', '89', '90'],
  '1050': ['14', '27', '50', '61', '76', '75', '77', '78', '91', '92', '93', '94', '95', '08', '10', '51', '52', '54', '55', '57', '67', '68', '88', '02', '59', '60', '62', '80']
};

export function getProductibleForDept(deptCode) {
  if (!deptCode) return 1150;
  const clean = String(deptCode).trim().toUpperCase();
  for (const [ratio, depts] of Object.entries(PRODUCTIBLE_BY_REGION)) {
    if (depts.includes(clean)) return parseInt(ratio, 10);
  }
  return 1150;
}

export const PRODUCTION_SOLAIRE_DEPT = new Proxy({}, {
  get: (target, prop) => getProductibleForDept(prop)
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. COEFFICIENTS D'ORIENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const ORIENTATION_COEFFICIENTS = {
  'est':        0.85,
  'sud-est':    0.95,
  'sud':        1.00,
  'sud-ouest':  0.95,
  'ouest':      0.85,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MATIÈRES DE SÉCHAGE (Référentiel ENR Courtage)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 7. FILIÈRES DE SÉCHAGE & VALORISATION
// ═══════════════════════════════════════════════════════════════════════════════

export const DRYING_YIELDS = {
  fourrage_vrac: 6.0,
  bottes_carrees: 6.0,
  cereales_ble: 7.5,
  cereales_mais: 7.0,
  plaquettes_bois: 10.0,
};

export const DRYING_MATERIALS = [
  {
    id: 'fourrage_vrac',
    label: 'Fourrage vrac (Séchage en grange)',
    shortLabel: 'Fourrage vrac',
    icon: '🌿',
    unit: 't MS/an',
    yieldPerHa: 6.0,
    defaultPlusValueQualite: 55,
    defaultEconomieEnergie: 10,
    defaultVolume: 300,
    description: 'Foin en vrac séché sous panneaux thermovoltaïques Cogen\'Air®',
  },
  {
    id: 'bottes_carrees',
    label: 'Bottes carrées (Foin conditionné)',
    shortLabel: 'Bottes carrées',
    icon: '📦',
    unit: 't MS/an',
    yieldPerHa: 6.0,
    defaultPlusValueQualite: 50,
    defaultEconomieEnergie: 10,
    defaultVolume: 140,
    description: 'Bottes de foin rectangulaires haute densité séchées sous grange',
  },
  {
    id: 'cereales_ble',
    label: 'Céréales - Blé tendre',
    shortLabel: 'Blé tendre',
    icon: '🌾',
    unit: 't MS/an',
    yieldPerHa: 7.5,
    defaultPlusValueQualite: 25,
    defaultEconomieEnergie: 15,
    defaultVolume: 270,
    description: 'Séchage de blé tendre et céréales à paille',
  },
  {
    id: 'cereales_mais',
    label: 'Céréales - Maïs grain',
    shortLabel: 'Maïs grain',
    icon: '🌽',
    unit: 't MS/an',
    yieldPerHa: 7.0,
    defaultPlusValueQualite: 35,
    defaultEconomieEnergie: 25,
    defaultVolume: 60,
    description: 'Séchage de maïs grain haute humidité',
  },
  {
    id: 'plaquettes_bois',
    label: 'Plaquettes forestières (Bois énergie)',
    shortLabel: 'Plaquettes bois',
    icon: '🪵',
    unit: 't MS/an',
    yieldPerHa: 10.0,
    defaultPlusValueQualite: 30,
    defaultEconomieEnergie: 20,
    defaultVolume: 450,
    description: 'Plaquettes forestières et copeaux pour chaufferie bois',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// 8. PARAMÈTRES FINANCIERS PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_FINANCIAL_PARAMS = {
  tauxEmprunt: 0.034,        // 3.40%
  dureeEmprunt: 25,          // ans
  subventionPAE: 0,           // Non déduite de base (affichée à titre indicatif)
  apportsEnPropre: 0,        // €
  inflationProduits: 0.02,   // 2%
  inflationCharges: 0.02,    // 2%
  dureeVieProjet: 20,        // ans (pour VAN & TRI)
  dureeSimulation: 25,       // ans (pour le graphique trésorerie)
  tauxActualisation: 0.034,  // pour la VAN (aligné sur taux moyen pondéré des emprunts)
  venteElectricitePV: 0,     // Retiré selon demande utilisateur
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. CORRESPONDANCE DÉPARTEMENTS -> RÉGIONS (en toutes lettres)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEPARTEMENTS_REGIONS = {
  '01': 'Auvergne-Rhône-Alpes',
  '02': 'Hauts-de-France',
  '03': 'Auvergne-Rhône-Alpes',
  '04': 'Provence-Alpes-Côte d\'Azur',
  '05': 'Provence-Alpes-Côte d\'Azur',
  '06': 'Provence-Alpes-Côte d\'Azur',
  '07': 'Auvergne-Rhône-Alpes',
  '08': 'Grand Est',
  '09': 'Occitanie',
  '10': 'Grand Est',
  '11': 'Occitanie',
  '12': 'Occitanie',
  '13': 'Provence-Alpes-Côte d\'Azur',
  '14': 'Normandie',
  '15': 'Auvergne-Rhône-Alpes',
  '16': 'Nouvelle-Aquitaine',
  '17': 'Nouvelle-Aquitaine',
  '18': 'Centre-Val de Loire',
  '19': 'Nouvelle-Aquitaine',
  '2A': 'Corse',
  '2B': 'Corse',
  '20': 'Corse',
  '21': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne',
  '23': 'Nouvelle-Aquitaine',
  '24': 'Nouvelle-Aquitaine',
  '25': 'Bourgogne-Franche-Comté',
  '26': 'Auvergne-Rhône-Alpes',
  '27': 'Normandie',
  '28': 'Centre-Val de Loire',
  '29': 'Bretagne',
  '30': 'Occitanie',
  '31': 'Occitanie',
  '32': 'Occitanie',
  '33': 'Nouvelle-Aquitaine',
  '34': 'Occitanie',
  '35': 'Bretagne',
  '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire',
  '38': 'Auvergne-Rhône-Alpes',
  '39': 'Bourgogne-Franche-Comté',
  '40': 'Nouvelle-Aquitaine',
  '41': 'Centre-Val de Loire',
  '42': 'Auvergne-Rhône-Alpes',
  '43': 'Auvergne-Rhône-Alpes',
  '44': 'Pays de la Loire',
  '45': 'Centre-Val de Loire',
  '46': 'Occitanie',
  '47': 'Nouvelle-Aquitaine',
  '48': 'Occitanie',
  '49': 'Pays de la Loire',
  '50': 'Normandie',
  '51': 'Grand Est',
  '52': 'Grand Est',
  '53': 'Pays de la Loire',
  '54': 'Grand Est',
  '55': 'Grand Est',
  '56': 'Bretagne',
  '57': 'Grand Est',
  '58': 'Bourgogne-Franche-Comté',
  '59': 'Hauts-de-France',
  '60': 'Hauts-de-France',
  '61': 'Normandie',
  '62': 'Hauts-de-France',
  '63': 'Auvergne-Rhône-Alpes',
  '64': 'Nouvelle-Aquitaine',
  '65': 'Occitanie',
  '66': 'Occitanie',
  '67': 'Grand Est',
  '68': 'Grand Est',
  '69': 'Auvergne-Rhône-Alpes',
  '70': 'Bourgogne-Franche-Comté',
  '71': 'Bourgogne-Franche-Comté',
  '72': 'Pays de la Loire',
  '73': 'Auvergne-Rhône-Alpes',
  '74': 'Auvergne-Rhône-Alpes',
  '75': 'Île-de-France',
  '76': 'Normandie',
  '77': 'Île-de-France',
  '78': 'Île-de-France',
  '79': 'Nouvelle-Aquitaine',
  '80': 'Hauts-de-France',
  '81': 'Occitanie',
  '82': 'Occitanie',
  '83': 'Provence-Alpes-Côte d\'Azur',
  '84': 'Provence-Alpes-Côte d\'Azur',
  '85': 'Pays de la Loire',
  '86': 'Nouvelle-Aquitaine',
  '87': 'Nouvelle-Aquitaine',
  '88': 'Grand Est',
  '89': 'Bourgogne-Franche-Comté',
  '90': 'Bourgogne-Franche-Comté',
  '91': 'Île-de-France',
  '92': 'Île-de-France',
  '93': 'Île-de-France',
  '94': 'Île-de-France',
  '95': 'Île-de-France',
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
};

export const getRegionForDepartment = (deptCode) => {
  if (!deptCode) return 'France';
  const clean = String(deptCode).trim().toUpperCase();
  return DEPARTEMENTS_REGIONS[clean] || 'France';
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. SUBVENTIONS RÉGIONALES & ADEME (Base de données & Règles de calcul)
// ═══════════════════════════════════════════════════════════════════════════════

export const SUBVENTIONS_CONFIG = [
  {
    id: "ademe_fonds_chaleur_national",
    nom: "Fonds Chaleur ADEME (National)",
    regions: ["TOUTES"],
    typeCalcul: "sur_mesure",
    description: "Aide nationale. Montant variable post-étude."
  },
  {
    id: "pcae_pays_de_la_loire",
    nom: "PCAE - Pays de la Loire",
    regions: ["Pays de la Loire"],
    typeCalcul: "pourcentage_plafonne",
    tauxBase: 0.30, 
    montantMax: 150000,
    majorationJA: 0.10, 
    description: "Plan de Compétitivité et d'Adaptation des Exploitations."
  },
  {
    id: "ambition_eleveurs_grand_est",
    nom: "Plan Ambition Éleveurs - Grand Est",
    regions: ["Grand Est"],
    typeCalcul: "pourcentage_plafonne",
    tauxBase: 0.40, 
    montantMax: 60000,
    description: "Aide aux investissements (Plafond 60k€)."
  },
  {
    id: "pcae_nouvelle_aquitaine",
    nom: "PCAE / PME - Nouvelle-Aquitaine",
    regions: ["Nouvelle-Aquitaine"],
    typeCalcul: "pourcentage_plafonne",
    tauxBase: 0.30, 
    montantMax: 100000, 
    majorationJA: 0.10,
    description: "Plan de Modernisation des Exploitations."
  },
  {
    id: "pcae_bretagne",
    nom: "PCAE - Bretagne",
    regions: ["Bretagne"],
    typeCalcul: "pourcentage_plafonne",
    tauxBase: 0.30,
    montantMax: 80000,
    description: "Soutien aux investissements matériels."
  }
];

/**
 * Détermine la ou les subventions régionales éligibles pour une région / département donné.
 * L'assiette éligible est : Investissement Brut HT - Prime CEE.
 *
 * @param {string} departement - Code département (ex: '33', '59', '67') ou nom de région
 * @param {number} investissementBrut - Investissement Brut Séchoir HT
 * @param {number} primeCEE - Montant de la prime CEE
 * @returns {{
 *   region: string,
 *   subventionRegionale: object|null,
 *   assietteEligible: number,
 *   montantEstime: number,
 *   tauxTexte: string,
 *   description: string,
 *   fondsChaleurAdeme: object
 * }}
 */
export function calculateEligibleSubventions(departement, investissementBrut = 0, primeCEE = 0) {
  const region = getRegionForDepartment(departement) || 'France';
  const assietteEligible = Math.max(0, (Number(investissementBrut) || 0) - (Number(primeCEE) || 0));

  const fondsChaleurAdeme = SUBVENTIONS_CONFIG.find(s => s.id === "ademe_fonds_chaleur_national");
  const specificSub = SUBVENTIONS_CONFIG.find(s => s.regions && s.regions.includes(region) && s.id !== "ademe_fonds_chaleur_national");

  if (specificSub) {
    let montantEstime = 0;
    if (specificSub.typeCalcul === 'pourcentage_plafonne') {
      montantEstime = Math.min(assietteEligible * (specificSub.tauxBase || 0), specificSub.montantMax || Infinity);
    }
    const tauxPct = Math.round((specificSub.tauxBase || 0) * 100);
    const majorationJA = specificSub.majorationJA ? ` (+${Math.round(specificSub.majorationJA * 100)}% JA)` : '';
    const tauxTexte = `${tauxPct}%${majorationJA}`;

    return {
      region,
      subventionRegionale: specificSub,
      assietteEligible,
      montantEstime: Math.round(montantEstime),
      tauxTexte,
      description: specificSub.description,
      fondsChaleurAdeme,
    };
  }

  // Fallback si pas de subvention régionale spécifique listée : ADEME Fonds Chaleur national / PCAE local
  return {
    region,
    subventionRegionale: null,
    assietteEligible,
    montantEstime: 0,
    tauxTexte: 'Sur étude',
    description: `Dispositifs régionaux ${region} (PCAE / FEADER) ou Fonds Chaleur ADEME selon éligibilité.`,
    fondsChaleurAdeme,
  };
}
