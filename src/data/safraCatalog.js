/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOGUE OFFICIEL DES SOLUTIONS DE STOCKAGE BESS SAFRA
 * Source : SAFRA New Energy (https://safra.fr/new-energy/stockage/)
 * Gammes UNIV LV / HV, Armoires industrielles C&I et Conteneurs forte capacité
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const SAFRA_CATALOG = [
  // ─── A. GAMME BASSE TENSION - UNIV LV STORAGE SYSTEMS (Résidentiel / Petit Tertiaire) ───
  {
    id: 'UNIV5100W',
    family: 'LV',
    familyLabel: 'Basse Tension (UNIV LV)',
    reference: 'UNIV5100W',
    name: 'Batterie SAFRA UNIV 5100W',
    category: 'residential_small_commercial',
    capacityKwh: 5.12,
    powerKw: 3.0,
    powerRange: '2.5 à 5.0 kW',
    voltageType: 'Basse Tension (LV 51.2V)',
    coolingType: 'Air naturel',
    efficiency: 95,
    defaultPriceHt: 3490,
    defaultInstallHt: 1200,
    dimensions: '600 × 480 × 160 mm',
    weightKg: 49,
    description: 'Batterie murale compacte LiFePO4 pour résidentiel et petit tertiaire. Optimisation d’autoconsommation et secours.',
    imageUrl: '/images/battery/battery_photo.jpg',
    badge: 'Résidentiel & TPE',
    targetConsoJourMax: 20,
    targetPeakKwMax: 6
  },
  {
    id: 'UNIV7600W',
    family: 'LV',
    familyLabel: 'Basse Tension (UNIV LV)',
    reference: 'UNIV7600W',
    name: 'Batterie SAFRA UNIV 7600W',
    category: 'residential_small_commercial',
    capacityKwh: 7.68,
    powerKw: 5.0,
    powerRange: '3.8 à 5.0 kW',
    voltageType: 'Basse Tension (LV 76.8V)',
    coolingType: 'Air naturel',
    efficiency: 95,
    defaultPriceHt: 4890,
    defaultInstallHt: 1500,
    dimensions: '650 × 520 × 190 mm',
    weightKg: 72,
    description: 'Système LiFePO4 basse tension pour commerces et habitations avec pompe à chaleur et recharge VE.',
    imageUrl: '/images/battery/battery_photo.jpg',
    badge: 'Commerce & Tertiaire léger',
    targetConsoJourMax: 35,
    targetPeakKwMax: 10
  },
  {
    id: 'UNIV-16.2kWh(I)',
    family: 'LV',
    familyLabel: 'Basse Tension (UNIV LV)',
    reference: 'UNIV-16.2kWh(I)',
    name: 'Batterie SAFRA UNIV 16.2 kWh (I)',
    category: 'residential_small_commercial',
    capacityKwh: 16.00,
    powerKw: 8.0,
    powerRange: '6.0 à 8.0 kW',
    voltageType: 'Basse Tension (LV 160V)',
    coolingType: 'Air forcé intelligent',
    efficiency: 95.5,
    defaultPriceHt: 8900,
    defaultInstallHt: 2000,
    dimensions: '850 × 600 × 240 mm',
    weightKg: 145,
    description: 'Stockage tout-en-un 16 kWh pour ateliers artisanaux, boulangeries et exploitations agricoles légères.',
    imageUrl: '/images/battery/battery_photo.jpg',
    badge: 'Artisanat & Petite Ferme',
    targetConsoJourMax: 60,
    targetPeakKwMax: 15
  },

  // ─── B. GAMME HAUTE TENSION - UNIV HV STORAGE SYSTEMS (Tertiaire / PME / Agricole) ───
  {
    id: 'ST15K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST15K',
    name: 'Système SAFRA UNIV ST15K',
    category: 'commercial_pme',
    capacityKwh: 15.36,
    powerKw: 15.0,
    powerRange: '15 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96,
    defaultPriceHt: 11900,
    defaultInstallHt: 2500,
    dimensions: '900 × 650 × 280 mm',
    weightKg: 160,
    description: 'Tour modulaire LiFePO4 haute tension 15 kW / 15.36 kWh pour PME et tertiaire.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'PME & Tertiaire',
    targetConsoJourMax: 80,
    targetPeakKwMax: 20
  },
  {
    id: 'ST23K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST23K',
    name: 'Système SAFRA UNIV ST23K',
    category: 'commercial_pme',
    capacityKwh: 23.04,
    powerKw: 23.0,
    powerRange: '23 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96,
    defaultPriceHt: 15900,
    defaultInstallHt: 2800,
    dimensions: '1050 × 650 × 280 mm',
    weightKg: 220,
    description: 'Système haute tension modulaire 23 kW / 23 kWh. Idéal effacement de pointes et autoconsommation tertiaire.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'PME & Agroalimentaire',
    targetConsoJourMax: 110,
    targetPeakKwMax: 28
  },
  {
    id: 'ST31K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST31K',
    name: 'Système SAFRA UNIV ST31K',
    category: 'commercial_pme',
    capacityKwh: 30.72,
    powerKw: 31.0,
    powerRange: '31 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96,
    defaultPriceHt: 19900,
    defaultInstallHt: 3200,
    dimensions: '1200 × 650 × 280 mm',
    weightKg: 280,
    description: 'Système haute tension 31 kW / 30.7 kWh. Écrêtage tarifaire pour bâtiment d’élevage et PME.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'Agricole & PME',
    targetConsoJourMax: 140,
    targetPeakKwMax: 36
  },
  {
    id: 'ST38K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST38K',
    name: 'Système SAFRA UNIV ST38K',
    category: 'commercial_pme',
    capacityKwh: 38.40,
    powerKw: 38.0,
    powerRange: '38 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96,
    defaultPriceHt: 23900,
    defaultInstallHt: 3600,
    dimensions: '1350 × 650 × 280 mm',
    weightKg: 340,
    description: 'Configuration 38 kW / 38.4 kWh. Couverture de puissance souscrite jusqu’à 42 kVA.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'Agricole & Tertiaire',
    targetConsoJourMax: 180,
    targetPeakKwMax: 44
  },
  {
    id: 'ST46K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST46K',
    name: 'Système SAFRA UNIV ST46K',
    category: 'commercial_pme',
    capacityKwh: 46.08,
    powerKw: 46.0,
    powerRange: '46 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96.2,
    defaultPriceHt: 27900,
    defaultInstallHt: 4000,
    dimensions: '1500 × 650 × 280 mm',
    weightKg: 400,
    description: 'Configuration 46 kW / 46.1 kWh. Réduction de facture TURPE et sécurisation alimentation.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'Supermarché & PME',
    targetConsoJourMax: 220,
    targetPeakKwMax: 52
  },
  {
    id: 'ST54K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST54K',
    name: 'Système SAFRA UNIV ST54K',
    category: 'commercial_pme',
    capacityKwh: 53.76,
    powerKw: 54.0,
    powerRange: '54 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96.2,
    defaultPriceHt: 31900,
    defaultInstallHt: 4500,
    dimensions: '1650 × 650 × 280 mm',
    weightKg: 460,
    description: 'Configuration 54 kW / 53.8 kWh. Gestion dynamique de charge pour flotte IRVE et ateliers.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'Hub IRVE & PME',
    targetConsoJourMax: 260,
    targetPeakKwMax: 60
  },
  {
    id: 'ST62K',
    family: 'HV',
    familyLabel: 'Haute Tension (UNIV HV)',
    reference: 'ST62K',
    name: 'Système SAFRA UNIV ST62K',
    category: 'commercial_pme',
    capacityKwh: 61.44,
    powerKw: 62.0,
    powerRange: '62 kW',
    voltageType: 'Haute Tension (HV)',
    coolingType: 'Air forcé intelligent',
    efficiency: 96.5,
    defaultPriceHt: 35900,
    defaultInstallHt: 5000,
    dimensions: '1800 × 650 × 280 mm',
    weightKg: 520,
    description: 'Système haute tension 62 kW / 61.4 kWh. Le sommet de la gamme modulaire ST pour fortes puissances BT.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: 'Industrie & Gros élevage',
    targetConsoJourMax: 320,
    targetPeakKwMax: 70
  },

  // ─── C. GAMME INDUSTRIELLE & COMMERCIALE C&I (Refroidissement Liquide) ───
  {
    id: 'UNIV_ESS_261_AC',
    family: 'CI',
    familyLabel: 'Industrielle & Tertiaire C&I',
    reference: 'UNIV ESS 261 AC',
    name: 'Armoire SAFRA UNIV ESS 261 AC (Liquid Cooling)',
    category: 'industrial_ci',
    capacityKwh: 261.0,
    powerKw: 232.0,
    powerRange: '125 kW à 232 kW',
    voltageType: 'Basse Tension C4 (3×400V AC)',
    coolingType: 'Refroidissement liquide haute performance (Liquid Cooling)',
    efficiency: 97.2,
    defaultPriceHt: 89000,
    defaultInstallHt: 8500,
    dimensions: '1350 × 1300 × 2200 mm',
    weightKg: 2850,
    description: 'Armoire extérieure étanche IP55 de 232 kW et 261 kWh à refroidissement liquide. Système AC Coupled avec onduleur réversible et EMS intégré. Raccordement direct 250 kW BT C4.',
    imageUrl: '/images/battery/cesc_mercury_front.png',
    badge: '⭐ Recommandé C&I / Agricole',
    isFlagship: true,
    scalableMaxUnits: 4, // 261, 522, 1044 kWh
    targetConsoJourMax: 1200,
    targetPeakKwMax: 250
  },
  {
    id: 'UNIV_ESS_261_DC',
    family: 'CI',
    familyLabel: 'Industrielle & Tertiaire C&I',
    reference: 'UNIV ESS 261 DC',
    name: 'Armoire SAFRA UNIV ESS 261 DC (Liquid Cooling)',
    category: 'industrial_ci',
    capacityKwh: 261.0,
    powerKw: 232.0,
    powerRange: '232 kW',
    voltageType: 'Système DC Coupled',
    coolingType: 'Refroidissement liquide (Liquid Cooling)',
    efficiency: 97.5,
    defaultPriceHt: 84000,
    defaultInstallHt: 8000,
    dimensions: '1350 × 1300 × 2200 mm',
    weightKg: 2650,
    description: 'Armoire extérieure étanche IP55 261 kWh pour couplage direct DC avec onduleur central ou centrale solaire.',
    imageUrl: '/images/battery/cesc_mercury_side.png',
    badge: 'Couplage Direct Solaire DC',
    scalableMaxUnits: 4,
    targetConsoJourMax: 1200,
    targetPeakKwMax: 250
  },

  // ─── D. GAMME CONTENEURS HAUTE CAPACITÉ (Refroidissement Liquide) ───
  {
    id: 'CONTENEUR_698KWH',
    family: 'CONTAINER',
    familyLabel: 'Conteneurs Forte Capacité',
    reference: 'Conteneur 698 kWh',
    name: 'Conteneur SAFRA BESS 698 kWh (Liquid Cooling)',
    category: 'container_utility',
    capacityKwh: 698.88,
    powerKw: 350.0,
    powerRange: '350 kW à 500 kW',
    voltageType: 'HTA 20 kV (ou BT forte intensité)',
    coolingType: 'Refroidissement liquide intégré (Liquid Cooling)',
    efficiency: 97.8,
    defaultPriceHt: 215000,
    defaultInstallHt: 15000,
    dimensions: '6058 × 2438 × 2896 mm (Conteneur 20ft)',
    weightKg: 8500,
    description: 'Conteneur tout-en-un 698.88 kWh mobile ou stationnaire à refroidissement liquide. Équipé détection incendie gaz inerte, CVC et supervision SCADA.',
    imageUrl: '/images/battery/cesc_mercury_group.jpg',
    badge: 'Conteneur Compact 698 kWh',
    targetConsoJourMax: 3500,
    targetPeakKwMax: 500
  },
  {
    id: 'UNIV_CONTAINER_5MWH',
    family: 'CONTAINER',
    familyLabel: 'Conteneurs Forte Capacité',
    reference: 'UNIV Container ESS 5 MWh',
    name: 'Conteneur SAFRA UNIV Container ESS 5 MWh',
    category: 'container_utility',
    capacityKwh: 5000.0,
    powerKw: 2500.0,
    powerRange: '2.5 MW / 5.0 MWh',
    voltageType: 'HTA 20 kV direct',
    coolingType: 'Refroidissement liquide industriel de dernière génération',
    efficiency: 98.0,
    defaultPriceHt: 1150000,
    defaultInstallHt: 45000,
    dimensions: '12192 × 2438 × 2896 mm (Conteneur 40ft High Cube)',
    weightKg: 38000,
    description: 'Configuration standard de puissance 2.5 MW / 5 000 kWh pour raccordement direct au réseau HTA ou grand site industriel intensif.',
    imageUrl: '/images/battery/cesc_mercury_group.jpg',
    badge: 'Centrale Utility 5 MWh',
    targetConsoJourMax: 25000,
    targetPeakKwMax: 3000
  }
];

/**
 * Algorithme de sélection automatique du modèle SAFRA optimal
 * selon la consommation journalière moyenne (kWh/j) et la puissance de pointe (kW)
 */
export function recommendSafraModel(consoJourMoyKwh = 578.6, peakKw = 90.0) {
  const cJour = Number(consoJourMoyKwh) || 578.6;
  const pKw = Number(peakKw) || 90.0;

  // Cas 1 : Très grands consommateurs industriels (> 1500 kWh/j ou pointe > 300 kW)
  if (cJour > 2500 || pKw > 400) {
    const model = SAFRA_CATALOG.find(m => m.id === 'UNIV_CONTAINER_5MWH') || SAFRA_CATALOG[SAFRA_CATALOG.length - 1];
    return {
      primaryModel: model,
      quantity: 1,
      alternateModel: SAFRA_CATALOG.find(m => m.id === 'CONTENEUR_698KWH'),
      alternateQuantity: 2,
      reason: `Site intensif (${Math.round(cJour)} kWh/j, pointe ${pKw.toFixed(1)} kW) : Conteneur 5 MWh pour absorption de charge massive.`
    };
  }

  if (cJour > 750 || pKw > 250) {
    const model = SAFRA_CATALOG.find(m => m.id === 'CONTENEUR_698KWH') || SAFRA_CATALOG[SAFRA_CATALOG.length - 2];
    return {
      primaryModel: model,
      quantity: 1,
      alternateModel: SAFRA_CATALOG.find(m => m.id === 'UNIV_ESS_261_AC'),
      alternateQuantity: 2,
      reason: `Consommation importante (${Math.round(cJour)} kWh/j, pointe ${pKw.toFixed(1)} kW) : Conteneur 698 kWh ou 2× armoires 261 kWh.`
    };
  }

  // Cas 2 : Coeur de cible C&I / Tertiaire / Agricole (ex: 578.6 kWh/j, pointe 90 kW)
  // Règle prompt : 1× Armoire SAFRA UNIV ESS 261 AC (232 kW / 261 kWh) en 1er choix, ou 2× ST62K en variante
  if (cJour >= 120 || pKw >= 60) {
    const primary = SAFRA_CATALOG.find(m => m.id === 'UNIV_ESS_261_AC') || SAFRA_CATALOG[10];
    const alternate = SAFRA_CATALOG.find(m => m.id === 'ST62K') || SAFRA_CATALOG[9];
    return {
      primaryModel: primary,
      quantity: 1,
      alternateModel: alternate,
      alternateQuantity: 2,
      reason: `Profil idéal C&I (${Math.round(cJour)} kWh/j, pointe ${pKw.toFixed(1)} kW) : 1× Armoire UNIV ESS 261 AC (232 kW / 261 kWh) couvre 45% du besoin quotidien et 100% de la pointe de 90 kW.`
    };
  }

  // Cas 3 : Gamme Haute Tension HV (ST15K à ST62K)
  if (cJour >= 35 || pKw >= 15) {
    const sortedHv = SAFRA_CATALOG.filter(m => m.family === 'HV');
    const bestFit = sortedHv.find(m => m.capacityKwh >= cJour * 0.40 && m.powerKw >= pKw * 0.70) || sortedHv[sortedHv.length - 1];
    return {
      primaryModel: bestFit,
      quantity: 1,
      alternateModel: SAFRA_CATALOG.find(m => m.id === 'UNIV_ESS_261_AC'),
      alternateQuantity: 1,
      reason: `Profil PME / agricole (${Math.round(cJour)} kWh/j, pointe ${pKw.toFixed(1)} kW) : Système haute tension ${bestFit.reference} pour couverture optimale.`
    };
  }

  // Cas 4 : Petit tertiaire et résidentiel (Gamme LV)
  const sortedLv = SAFRA_CATALOG.filter(m => m.family === 'LV');
  const bestLv = sortedLv.find(m => m.capacityKwh >= cJour * 0.45) || sortedLv[sortedLv.length - 1];
  return {
    primaryModel: bestLv,
    quantity: 1,
    alternateModel: SAFRA_CATALOG.find(m => m.id === 'ST15K'),
    alternateQuantity: 1,
    reason: `Profil basse tension (${Math.round(cJour)} kWh/j) : Batterie murale ${bestLv.reference} pour autoconsommation et sécurité.`
  };
}
