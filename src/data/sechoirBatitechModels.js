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
    description: 'Séchoir compact — 1 zone de séchage',
    dimensions: '18m × 20m',
    surfaceToiture: 360,
    length: 18,
    width: 20,
    // Décomposition investissement (proportionnelle au modèle BP Excel K23 = 426 700€ pour ~100 kWc)
    postesInvestissement: {
      lotCentraleThermovoltaique: 26850,   // proportionné
      processAeraulique: 25600,
      ingenieurie: 3000,
      portManutention: 735,
      totalBase: 52585,
      totalBatiment: 125000,
      totalInstallateurPV: 30900,
      griffe: 32068,
      terrassement: 11580,
      beton: 25480,
      dompaireOSB: 23170,
      scierie: 13290,
      autochargeuse: 0,
      porte: 7730,
      electricite: 7730,
    },
    // Frais de fonctionnement annuels (ventilation, maintenance)
    chargesAnnuelles: {
      ventilation: 500,
      fraisFoinBottes: 700,
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
    description: 'Séchoir intermédiaire — 2 zones de séchage',
    dimensions: '36m × 20m',
    surfaceToiture: 720,
    length: 36,
    width: 20,
    postesInvestissement: {
      lotCentraleThermovoltaique: 34716,
      processAeraulique: 33145,
      ingenieurie: 3000,
      portManutention: 735,
      totalBase: 68000,
      totalBatiment: 162000,
      totalInstallateurPV: 40000,
      griffe: 41500,
      terrassement: 15000,
      beton: 33000,
      dompaireOSB: 30000,
      scierie: 17200,
      autochargeuse: 20000,
      porte: 10000,
      electricite: 10000,
    },
    chargesAnnuelles: {
      ventilation: 1500,
      fraisFoinBottes: 2000,
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
    description: 'Séchoir grande capacité — 3 zones de séchage',
    dimensions: '48m × 20m',
    surfaceToiture: 960,
    length: 48,
    width: 20,
    postesInvestissement: {
      lotCentraleThermovoltaique: 51500,
      processAeraulique: 49100,
      ingenieurie: 3000,
      portManutention: 735,
      totalBase: 100735,
      totalBatiment: 240000,
      totalInstallateurPV: 59300,
      griffe: 61500,
      terrassement: 22200,
      beton: 48900,
      dompaireOSB: 44500,
      scierie: 25500,
      autochargeuse: 20000,
      porte: 14830,
      electricite: 14830,
    },
    chargesAnnuelles: {
      ventilation: 2200,
      fraisFoinBottes: 3000,
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
// 4. ZONES DE SÉCHAGE (1 à 4, potentiel évapotranspiration)
// ═══════════════════════════════════════════════════════════════════════════════

export const ZONES_SECHAGE = {
  // Zone 1 — Très favorable (Sud)
  '06': 1, '11': 1, '13': 1, '30': 1, '34': 1, '66': 1, '83': 1, '84': 1,
  '2A': 1, '2B': 1, '20': 1,

  // Zone 2 — Favorable (Sud-Ouest / Rhône-Alpes)
  '04': 2, '05': 2, '07': 2, '09': 2, '12': 2, '26': 2, '31': 2, '32': 2,
  '33': 2, '40': 2, '46': 2, '47': 2, '48': 2, '64': 2, '65': 2, '81': 2,
  '82': 2,

  // Zone 3 — Moyenne (Centre / Ouest)
  '01': 3, '03': 3, '15': 3, '16': 3, '17': 3, '18': 3, '19': 3, '21': 3,
  '23': 3, '24': 3, '36': 3, '37': 3, '38': 3, '41': 3, '42': 3, '43': 3,
  '44': 3, '45': 3, '49': 3, '58': 3, '63': 3, '69': 3, '71': 3, '72': 3,
  '73': 3, '74': 3, '79': 3, '85': 3, '86': 3, '87': 3,

  // Zone 4 — Moins favorable (Nord)
  '02': 4, '08': 4, '10': 4, '14': 4, '22': 4, '25': 4, '27': 4, '28': 4,
  '29': 4, '35': 4, '39': 4, '50': 4, '51': 4, '52': 4, '53': 4, '54': 4,
  '55': 4, '56': 4, '57': 4, '59': 4, '60': 4, '61': 4, '62': 4, '67': 4,
  '68': 4, '70': 4, '75': 4, '76': 4, '77': 4, '78': 4, '80': 4, '88': 4,
  '89': 4, '90': 4, '91': 4, '92': 4, '93': 4, '94': 4, '95': 4,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PRODUCTION SOLAIRE RÉGIONALE (kWh/kWc/an) par département
// ═══════════════════════════════════════════════════════════════════════════════

export const PRODUCTION_SOLAIRE_DEPT = {
  // Zone 1 Sud (1350-1500 kWh/kWc/an)
  '06': 1450, '11': 1400, '13': 1450, '20': 1500, '2A': 1500, '2B': 1500,
  '30': 1400, '34': 1420, '66': 1380, '83': 1450, '84': 1400,
  // Zone 2 Sud-Ouest / Rhône-Alpes (1200-1350)
  '04': 1350, '05': 1300, '07': 1300, '09': 1250, '12': 1250, '26': 1300,
  '31': 1250, '32': 1250, '33': 1250, '38': 1250, '40': 1250, '46': 1220,
  '47': 1230, '48': 1280, '64': 1200, '65': 1200, '69': 1250, '73': 1250,
  '74': 1250, '81': 1250, '82': 1250,
  // Zone 3 Centre / Ouest (1100-1200)
  '01': 1200, '03': 1180, '15': 1200, '16': 1180, '17': 1200, '18': 1150,
  '19': 1180, '21': 1150, '23': 1150, '24': 1200, '36': 1150, '37': 1150,
  '41': 1150, '42': 1200, '43': 1200, '44': 1180, '45': 1150, '49': 1170,
  '58': 1150, '63': 1180, '71': 1160, '72': 1140, '79': 1170, '85': 1180,
  '86': 1160, '87': 1160,
  // Zone 4 Nord (1000-1100)
  '02': 1080, '08': 1060, '10': 1080, '14': 1070, '22': 1080, '25': 1100,
  '27': 1070, '28': 1100, '29': 1080, '35': 1080, '39': 1100, '50': 1060,
  '51': 1080, '52': 1080, '53': 1080, '54': 1060, '55': 1070, '56': 1080,
  '57': 1050, '59': 1030, '60': 1070, '61': 1080, '62': 1030, '67': 1080,
  '68': 1100, '70': 1080, '75': 1080, '76': 1050, '77': 1090, '78': 1080,
  '80': 1050, '88': 1060, '89': 1100, '90': 1080, '91': 1090, '92': 1080,
  '93': 1080, '94': 1080, '95': 1070,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. COEFFICIENTS D'ORIENTATION (facteur multiplicatif sur la production)
// ═══════════════════════════════════════════════════════════════════════════════

export const ORIENTATION_COEFFICIENTS = {
  'est':        0.82,
  'sud-est':    0.93,
  'sud':        1.00,
  'sud-ouest':  0.93,
  'ouest':      0.82,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MATIÈRES DE SÉCHAGE (référentiel par défaut)
// ═══════════════════════════════════════════════════════════════════════════════

export const DRYING_MATERIALS = [
  {
    id: 'fourrage_vrac',
    label: 'Fourrage vrac (Séchage en grange)',
    shortLabel: 'Fourrage vrac',
    icon: '🌿',
    unit: 't MS/an',
    defaultPlusValueQualite: 25,
    defaultEconomieEnergie: 15,
    defaultVolume: 0,
    description: 'Foin en vrac séché sous panneaux thermovoltaïques Cogen\'Air®',
  },
  {
    id: 'bottes_carrees',
    label: 'Bottes carrées (Foin conditionné)',
    shortLabel: 'Bottes carrées',
    icon: '📦',
    unit: 't MS/an',
    defaultPlusValueQualite: 30,
    defaultEconomieEnergie: 20,
    defaultVolume: 0,
    description: 'Bottes de foin rectangulaires haute densité séchées sous grange',
  },
  {
    id: 'cereales_ble',
    label: 'Céréales - Blé tendre',
    shortLabel: 'Blé tendre',
    icon: '🌾',
    unit: 't MS/an',
    defaultPlusValueQualite: 10,
    defaultEconomieEnergie: 12,
    defaultVolume: 0,
    description: 'Séchage de blé tendre et céréales à paille',
  },
  {
    id: 'cereales_mais',
    label: 'Céréales - Maïs grain',
    shortLabel: 'Maïs grain',
    icon: '🌽',
    unit: 't MS/an',
    defaultPlusValueQualite: 12,
    defaultEconomieEnergie: 16,
    defaultVolume: 0,
    description: 'Séchage de maïs grain haute humidité',
  },
  {
    id: 'plaquettes_bois',
    label: 'Plaquettes forestières (Bois énergie)',
    shortLabel: 'Plaquettes bois',
    icon: '🪵',
    unit: 't MS/an',
    defaultPlusValueQualite: 8,
    defaultEconomieEnergie: 18,
    defaultVolume: 0,
    description: 'Plaquettes forestières et copeaux pour chaufferie bois',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PARAMÈTRES FINANCIERS PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_FINANCIAL_PARAMS = {
  tauxEmprunt: 0.034,        // 3.40%
  dureeEmprunt: 25,          // ans
  subventionPAE: 100000,     // Plan Ambitions Éleveurs
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
