/**
 * DONNÉES DU PORTEFEUILLE PHOTOVOLTAÏQUE HÉLIOS (MULTI-SITES PV)
 * 20 sites certifiés avec puissances réelles, productibles, et raccordements ODRE
 */

export const PV_PORTFOLIO_SITES = [
  {
    id: "pv_site_1",
    name: "HÉLIOS - Toiture Rochechouart",
    client: "PAILLOT Noël",
    postcode: "87600",
    city: "Rochechouart",
    address: "5 ZA des Plats, 87600 Rochechouart",
    typeBat: "HELIOS 22 H30 (BAC)",
    spv: "HÉLIOS SPV 1",
    kwc: 251.0,
    productible: 1125,
    surface: 1173,
    rent: 2800,
    lat: 45.847811,
    lng: 0.852996,
    substation: {
      name: "PLAUD",
      code: "PLAUD",
      voltageLevel: "HTA 20 kV",
      distanceKm: 6.6,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche signal-prix injection"
    }
  },
  {
    id: "pv_site_2",
    name: "HÉLIOS - Hangar Mongausy",
    client: "BATIOT Olivier",
    postcode: "32220",
    city: "Mongausy",
    address: "72 Chemin du Campas, 32220 Mongausy",
    typeBat: "HELIOS 26 H42 (BAC)",
    spv: "HÉLIOS SPV 1",
    kwc: 338.0,
    productible: 1180,
    surface: 1563,
    rent: 3500,
    lat: 43.496370,
    lng: 0.834241,
    substation: {
      name: "SEMEZIES",
      code: "SEMEZ",
      voltageLevel: "HTA 20 kV",
      distanceKm: 5.9,
      quotePartS3renr: "84.13 k€/MW",
      resteAffecterMw: 1.6,
      statutRaccordement: "Poche signal-prix injection"
    }
  },
  {
    id: "pv_site_3",
    name: "HÉLIOS - Bâtiment Meuzac",
    client: "DOMERGUE David",
    postcode: "87380",
    city: "Meuzac",
    address: "1725 Route du Grand Pré, 87380 Meuzac",
    typeBat: "HELIOS 18 H20 (BAC)",
    spv: "HÉLIOS SPV 1",
    kwc: 302.0,
    productible: 1110,
    surface: 1395,
    rent: 3200,
    lat: 45.566247,
    lng: 1.397687,
    substation: {
      name: "LE REPAIRE",
      code: "REPAI",
      voltageLevel: "63 / 20 kV",
      distanceKm: 8.6,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_4",
    name: "HÉLIOS - Bâtiment Agricole Cubertafon",
    client: "CUBERTAFON René",
    postcode: "19210",
    city: "Saint-Julien-le-Vendômois",
    address: "8 Route de la Barrière, 19210 Saint-Julien-le-Vendômois",
    typeBat: "HELIOS 22 H34 (BAC)",
    spv: "HÉLIOS SPV 1",
    kwc: 401.0,
    productible: 1140,
    surface: 1844,
    rent: 4200,
    lat: 45.460274,
    lng: 1.298160,
    substation: {
      name: "LUBERSAC",
      code: "LUBER",
      voltageLevel: "HTA 20 kV",
      distanceKm: 8.3,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_5",
    name: "HÉLIOS - Ombrière Port-de-Lanne",
    client: "PLANTE Jean-Pierre",
    postcode: "40300",
    city: "Port-de-Lanne",
    address: "581 Route Départementale 817, 40300 Port-de-Lanne",
    typeBat: "OMB TYPE PL",
    spv: "HÉLIOS SPV 1",
    kwc: 276.0,
    productible: 1220,
    surface: 1270,
    rent: 3000,
    lat: 43.558940,
    lng: -1.199501,
    substation: {
      name: "GUICHE",
      code: "GUICH",
      voltageLevel: "HTA 20 kV",
      distanceKm: 4.9,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_6",
    name: "HÉLIOS - Toiture Grisolles",
    client: "PRAVIE Clémence",
    postcode: "82170",
    city: "Grisolles",
    address: "336 Chemin de Falieres, 82170 Grisolles",
    typeBat: "HELIOS 29 H51 (BAC)",
    spv: "HÉLIOS SPV 1",
    kwc: 386.0,
    productible: 1240,
    surface: 1758,
    rent: 4000,
    lat: 43.806232,
    lng: 1.295833,
    substation: {
      name: "LESQUIVE 2",
      code: "LESQ2",
      voltageLevel: "HTA 20 kV",
      distanceKm: 2.3,
      quotePartS3renr: "84.13 k€/MW",
      resteAffecterMw: 80.0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_7",
    name: "HÉLIOS - Hangar Brantôme",
    client: "LATOURNERIE Franck",
    postcode: "24310",
    city: "Brantôme en Périgord",
    address: "467 Chemin des Terres Vieilles, 24310 Brantôme",
    typeBat: "HELIOS 18 H18 (BAC)",
    spv: "HÉLIOS SPV 1",
    kwc: 241.0,
    productible: 1130,
    surface: 1116,
    rent: 2600,
    lat: 45.328888,
    lng: 0.651040,
    substation: {
      name: "BRANTOME",
      code: "BRANT",
      voltageLevel: "HTA 20 kV",
      distanceKm: 3.5,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0.5,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_8",
    name: "HÉLIOS - Bâtiment Concèze",
    client: "DAVID Louis",
    postcode: "19350",
    city: "Concèze",
    address: "1053 route de saint-cyr les champagnes, 19350 Concèze",
    typeBat: "HELIOS 22 H29 (BAC)",
    spv: "HÉLIOS SPV 2",
    kwc: 217.0,
    productible: 1135,
    surface: 1006,
    rent: 2400,
    lat: 45.353329,
    lng: 1.314195,
    substation: {
      name: "LUBERSAC",
      code: "LUBER",
      voltageLevel: "HTA 20 kV",
      distanceKm: 8.6,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_9",
    name: "HÉLIOS - Toiture St-Éloy",
    client: "GRANGER Bruno",
    postcode: "19210",
    city: "Saint-Éloy-les-Tuileries",
    address: "3 Route des Forges, 19210 Saint-Éloy-les-Tuileries",
    typeBat: "HELIOS 26 H46 (BAC)",
    spv: "HÉLIOS SPV 2",
    kwc: 511.0,
    productible: 1145,
    surface: 2345,
    rent: 5500,
    lat: 45.442533,
    lng: 1.267710,
    substation: {
      name: "LUBERSAC",
      code: "LUBER",
      voltageLevel: "HTA 20 kV",
      distanceKm: 10.5,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_10",
    name: "HÉLIOS - Toiture Caussade",
    client: "CASTEBRUNET Jérémy",
    postcode: "82300",
    city: "Caussade",
    address: "763 Chemin de Calsos, 82300 Caussade",
    typeBat: "HELIOS 22 H32 (BAC)",
    spv: "HÉLIOS SPV 2",
    kwc: 329.0,
    productible: 1250,
    surface: 1509,
    rent: 3600,
    lat: 44.123740,
    lng: 1.564486,
    substation: {
      name: "LERE",
      code: "LERE",
      voltageLevel: "HTA 20 kV",
      distanceKm: 5.7,
      quotePartS3renr: "84.13 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_11",
    name: "HÉLIOS - Hangar Monestier",
    client: "BERTRANDIE Sébastien",
    postcode: "24240",
    city: "Monestier",
    address: "301 Route de la Roche, 24240 Monestier",
    typeBat: "HELIOS 18 H24 (BAC)",
    spv: "HÉLIOS SPV 2",
    kwc: 423.0,
    productible: 1190,
    surface: 1953,
    rent: 4600,
    lat: 44.773569,
    lng: 0.300107,
    substation: {
      name: "STE-FOY-LA-GRANDE",
      code: "STEFO",
      voltageLevel: "HTA 20 kV",
      distanceKm: 9.0,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_12",
    name: "HÉLIOS - Bâtiment Leyrat",
    client: "GIOT Joachim",
    postcode: "23600",
    city: "Leyrat",
    address: "2 Le Cluzeau, 23600 Leyrat",
    typeBat: "HELIOS 15 H9 (BAC)",
    spv: "HÉLIOS SPV 2",
    kwc: 290.0,
    productible: 1105,
    surface: 1350,
    rent: 3000,
    lat: 46.360561,
    lng: 2.306566,
    substation: {
      name: "BOUSSAC",
      code: "BOUSS",
      voltageLevel: "HTA 20 kV",
      distanceKm: 5.9,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0.5,
      statutRaccordement: "Poche signal-prix injection"
    }
  },
  {
    id: "pv_site_13",
    name: "HÉLIOS - Hangar Duras",
    client: "ARBOIN Régis",
    postcode: "47120",
    city: "Duras",
    address: "47 Chemin de piquemole, 47120 Duras",
    typeBat: "HELIOS 22 H36 (BAC)",
    spv: "HÉLIOS SPV 2",
    kwc: 474.0,
    productible: 1210,
    surface: 2179,
    rent: 5000,
    lat: 44.659496,
    lng: 0.222735,
    substation: {
      name: "LA SAUVETAT",
      code: "LASAU",
      voltageLevel: "HTA 20 kV",
      distanceKm: 11.8,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche mixte injection & soutirage"
    }
  },
  {
    id: "pv_site_14",
    name: "HÉLIOS - Bâtiment Saint-Saud",
    client: "MISSAULT David",
    postcode: "24470",
    city: "Saint-Saud-Lacoussière",
    address: "1348 Route des Bouleaux, 24470 Saint-Saud",
    typeBat: "HELIOS 18 H16 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 181.0,
    productible: 1115,
    surface: 837,
    rent: 2000,
    lat: 45.558769,
    lng: 0.804488,
    substation: {
      name: "NONTRON",
      code: "NONTR",
      voltageLevel: "HTA 20 kV",
      distanceKm: 13.7,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_15",
    name: "HÉLIOS - Toiture Mourioux",
    client: "MEILLAT Maxime",
    postcode: "23210",
    city: "Mourioux-Vieilleville",
    address: "1a La Ribiere, 23210 Mourioux-Vieilleville",
    typeBat: "HELIOS 22 H28 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 178.0,
    productible: 1100,
    surface: 838,
    rent: 1900,
    lat: 46.082964,
    lng: 1.538518,
    substation: {
      name: "CHATELUS 2",
      code: "CHATE",
      voltageLevel: "HTA 20 kV",
      distanceKm: 5.4,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 2.0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_16",
    name: "HÉLIOS - Bâtiment Val-de-Livenne",
    client: "SOULIGNAC Thierry",
    postcode: "33860",
    city: "Val-de-Livenne",
    address: "Route de Lombardie, 33860 Val-de-Livenne",
    typeBat: "HELIOS 26 H44 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 429.0,
    productible: 1205,
    surface: 1954,
    rent: 4700,
    lat: 45.264357,
    lng: -0.550408,
    substation: {
      name: "ETAULIERS",
      code: "ETAUL",
      voltageLevel: "HTA 20 kV",
      distanceKm: 7.7,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_17",
    name: "HÉLIOS - Hangar Payzac",
    client: "CHAUFFAILLE Franck",
    postcode: "24270",
    city: "Payzac",
    address: "2 Route de Saint Yrieix, 24270 Payzac",
    typeBat: "HELIOS 22 H30 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 251.0,
    productible: 1130,
    surface: 1173,
    rent: 2700,
    lat: 45.436230,
    lng: 1.288728,
    substation: {
      name: "LUBERSAC",
      code: "LUBER",
      voltageLevel: "HTA 20 kV",
      distanceKm: 6.9,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Zone standard Enedis"
    }
  },
  {
    id: "pv_site_18",
    name: "HÉLIOS - Toiture Juillac",
    client: "CIROLI",
    postcode: "33890",
    city: "Juillac",
    address: "66 Lieu Dit Pinasse, 33890 Juillac",
    typeBat: "HELIOS 18 H22 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 362.0,
    productible: 1215,
    surface: 1674,
    rent: 3900,
    lat: 44.809547,
    lng: 0.037304,
    substation: {
      name: "AURIOLLES",
      code: "AURIO",
      voltageLevel: "HTA 20 kV",
      distanceKm: 7.9,
      quotePartS3renr: "92.73 k€/MW",
      resteAffecterMw: 0.3,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_19",
    name: "HÉLIOS - Hangar Mansan",
    client: "BOURDETTES Sandrine",
    postcode: "65140",
    city: "Mansan",
    address: "10 Route de la Bohème, 65140 Mansan",
    typeBat: "HELIOS 29 H49 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 290.0,
    productible: 1220,
    surface: 1339,
    rent: 3200,
    lat: 43.343730,
    lng: 0.194628,
    substation: {
      name: "VIC-EN-BIGORRE",
      code: "VICEN",
      voltageLevel: "HTA 20 kV",
      distanceKm: 10.8,
      quotePartS3renr: "84.13 k€/MW",
      resteAffecterMw: 7.0,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  },
  {
    id: "pv_site_20",
    name: "HÉLIOS - Toiture Saint-Cirq",
    client: "CASTEBRUNET Jérémy",
    postcode: "82300",
    city: "Saint-Cirq",
    address: "3750 Route de Bioule, 82300 Saint-Cirq",
    typeBat: "HELIOS 26 H40 (BAC)",
    spv: "HÉLIOS SPV 3",
    kwc: 255.0,
    productible: 1235,
    surface: 1172,
    rent: 2800,
    lat: 44.124392,
    lng: 1.583302,
    substation: {
      name: "LERE",
      code: "LERE",
      voltageLevel: "HTA 20 kV",
      distanceKm: 6.2,
      quotePartS3renr: "84.13 k€/MW",
      resteAffecterMw: 0,
      statutRaccordement: "Poche signal-prix soutirage"
    }
  }
];

export function computePvFinancials(site, options = {}) {
  const debtDuration = options.debtDuration || 20;
  const debtRate = options.debtRate || 4.3;
  const studyDuration = options.studyDuration || 20;

  const kwc = Number(site.kwc) || 250;
  const productible = Number(site.productible) || 1125;
  const tarifS21 = options.tarifS21 || 0.082; // €/kWh
  const coutKwcCentrale = options.coutKwcCentrale || 490; // €/kWc
  const coutCharpente = site.coutCharpente || Math.round(kwc * 280);
  const coutCentrale = Math.round(kwc * coutKwcCentrale);
  const raccordement = site.raccordement || Math.min(65000, Math.round(15000 + (site.substation?.distanceKm || 5) * 4500));
  const frais = Math.round((coutCentrale + coutCharpente) * 0.01);
  const ingenieurDP = 7500;
  const capexTotal = coutCentrale + coutCharpente + raccordement + frais + ingenieurDP;

  // Calcul revenus An 1 (S21 injection totale / surplus)
  const prodMwh = (kwc * productible) / 1000;
  const caAnnuel = Math.round(kwc * productible * tarifS21);

  // OPEX annuels
  const maintenance = Math.round(kwc * 7.5);
  const assurance = Math.round(kwc * 3.5);
  const taxesLocales = Math.round(kwc * 1.5);
  const loyer = site.rent || Math.round(kwc * 10);
  const opexAnnuel = maintenance + assurance + taxesLocales + loyer;
  const ebitdaAn1 = caAnnuel - opexAnnuel;

  // Dette senior (90% emprunt, 10% apport)
  const emprunt = Math.round(capexTotal * 0.90);
  const apport10 = capexTotal - emprunt;
  const rateDecimal = debtRate / 100;
  const annuiteDette = Math.round(
    emprunt * (rateDecimal / (1 - Math.pow(1 + rateDecimal, -debtDuration)))
  );

  // Chronique 20 ans
  const rows = [];
  let detteDebut = emprunt;
  const cashFlowsProjet = [-capexTotal];
  let cumulCashFlow = 0;

  for (let y = 1; y <= studyDuration; y++) {
    const deg = Math.pow(1 - 0.0045, y - 1);
    const idxT = Math.pow(1 + 0.006, y - 1);
    const idxOpex = Math.pow(1 + 0.02, y - 1);

    const caY = Math.round(caAnnuel * deg * idxT);
    const maintY = Math.round(maintenance * idxOpex);
    const assurY = Math.round(assurance * idxOpex);
    const taxesY = Math.round(taxesLocales * idxOpex);
    const loyerY = Math.round(loyer * idxOpex);
    const mraY = y === 11 ? Math.round(coutCentrale * 0.1) : 0;
    const opexY = maintY + assurY + taxesY + loyerY + mraY;

    const ebitdaY = caY - opexY;
    const servDetteY = y <= debtDuration ? annuiteDette : 0;
    const interestY = y <= debtDuration ? Math.round(detteDebut * rateDecimal) : 0;
    const principalY = servDetteY > 0 ? servDetteY - interestY : 0;
    const amort = Math.round(capexTotal / studyDuration);
    const ebitY = ebitdaY - amort;
    const resFiscal = Math.max(0, ebitY - interestY);
    const isY = resFiscal > 0 ? (resFiscal < 42500 ? Math.round(resFiscal * 0.15) : Math.round((42500 * 0.15) + ((resFiscal - 42500) * 0.25))) : 0;
    const cafdsY = ebitdaY - isY;
    const dscrY = servDetteY > 0 ? (cafdsY / servDetteY) : 9.99;
    const cfNetY = Math.round(ebitdaY - servDetteY - isY);
    cumulCashFlow += cfNetY;

    cashFlowsProjet.push(cafdsY);

    rows.push({
      year: 2025 + y,
      yearIndex: y,
      ca: caY,
      caTotal: caY,
      maint: maintY,
      assur: assurY,
      taxes: taxesY,
      loyer: loyerY,
      mra: mraY,
      opex: opexY,
      ebitda: ebitdaY,
      amortissement: amort,
      ebit: ebitY,
      interets: interestY,
      resFiscal,
      is: isY,
      cafds: cafdsY,
      principal: principalY,
      serviceDette: servDetteY,
      dscr: dscrY,
      cfNet: cfNetY,
      tresorerie: cfNetY,
      cumulCashFlow,
      detteFin: Math.max(0, detteDebut - principalY)
    });

    detteDebut = Math.max(0, detteDebut - principalY);
  }

  // TRI & Payback
  let cumulCf = 0;
  let payback = studyDuration;
  for (let y = 0; y < rows.length; y++) {
    cumulCf += rows[y].ebitda;
    if (cumulCf >= capexTotal) {
      const prevCumul = cumulCf - rows[y].ebitda;
      payback = y + (capexTotal - prevCumul) / (rows[y].ebitda || 1);
      break;
    }
  }

  // Approximation TRI
  const triProjet = Math.max(5.0, Math.min(18.0, (ebitdaAn1 / capexTotal) * 100 * 0.95));

  const totalRecettesStudy = rows.reduce((s, r) => s + r.ca, 0);
  const totalOpexStudy = rows.reduce((s, r) => s + r.opex, 0);
  const totalCashFlowNet = rows.reduce((s, r) => s + r.cfNet, 0);
  const dscrMoyen = rows.filter(r => r.serviceDette > 0).reduce((s, r) => s + r.dscr, 0) / (debtDuration || 1);

  return {
    siteName: site.name,
    commune: site.city,
    codePostal: site.postcode,
    posteSource: site.substation?.name || "ODRE",
    distanceKm: site.substation?.distanceKm || 5.0,
    quotePartS3REnR: site.substation?.quotePartS3renr || "92.73 k€/MW",
    resteAffecterMw: site.substation?.resteAffecterMw ?? 0,
    zoneCre: site.substation?.statutRaccordement || "Zone standard Enedis",
    kwc,
    productible,
    prodMwh: Math.round(prodMwh),
    capexTotal,
    emprunt,
    apport10,
    coutCentrale,
    coutCharpente,
    raccordement,
    frais,
    caAnnuel,
    opexAnnuel,
    maintenanceAn1: maintenance,
    assuranceAn1: assurance,
    taxesLocalesAn1: taxesLocales,
    loyerAn1: loyer,
    annuiteDette,
    ebitdaAn1,
    triProjet,
    payback,
    totalRecettesStudy,
    totalOpexStudy,
    totalCashFlowNet,
    dscrMoyen,
    rows
  };
}
