import { findBessOdreData } from './bessOdreMatrix.js';

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
    rent: 0,
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

/**
 * Extrait précisément les coordonnées GPS d'un projet CRM ou site de référence.
 * Priorités :
 * 1. lat/lng ou latitude/longitude numériques directes
 * 2. Parsing du champ p.gps ("lat, lng" ou "lat; lng")
 * 3. Géométrie polygonale/centroïde des map features (p.features)
 * 4. Matrice officielle ODRE certifiée (par nom, commune, adresse)
 * 5. Coordonnées du site mock si correspondance
 * 6. Centroïde du département (Grand Sud-Ouest) avec dispersion déterministe pour éviter tout chevauchement
 */
export function extractProjectCoordinates(p, mock = null) {
  // 1. Coordonnées directes sur l'objet projet
  const pLat = parseFloat(p?.lat || p?.latitude);
  const pLng = parseFloat(p?.lng || p?.longitude);
  if (!isNaN(pLat) && !isNaN(pLng) && pLat > 41 && pLat < 51.5 && pLng > -5.5 && pLng < 9.5) {
    return { lat: +pLat.toFixed(6), lng: +pLng.toFixed(6) };
  }

  // 2. Parsing de la chaîne GPS du CRM ("45.847811, 0.852996")
  if (p?.gps && typeof p.gps === 'string') {
    const sep = p.gps.includes(';') ? ';' : ',';
    const parts = p.gps.split(sep).map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (parts[0] > 41 && parts[0] < 51.5 && parts[1] > -5.5 && parts[1] < 9.5) {
        return { lat: +parts[0].toFixed(6), lng: +parts[1].toFixed(6) };
      }
    }
  }

  // 3. Extraction depuis les polygones / features cartographiques
  const features = p?.features || p?.map_state?.features || [];
  for (const feat of features) {
    if (feat.latLngs && Array.isArray(feat.latLngs) && feat.latLngs.length > 0) {
      const pt = feat.latLngs[0];
      const fLat = parseFloat(pt.lat || pt[0]);
      const fLng = parseFloat(pt.lng || pt[1]);
      if (!isNaN(fLat) && !isNaN(fLng) && fLat > 41 && fLat < 51.5 && fLng > -5.5 && fLng < 9.5) {
        return { lat: +fLat.toFixed(6), lng: +fLng.toFixed(6) };
      }
    }
    if (feat.geometry?.coordinates && Array.isArray(feat.geometry.coordinates)) {
      const coords = feat.geometry.coordinates[0];
      if (Array.isArray(coords) && coords.length > 0) {
        const pt = coords[0];
        const fLng = parseFloat(pt[0]);
        const fLat = parseFloat(pt[1]);
        if (!isNaN(fLat) && !isNaN(fLng) && fLat > 41 && fLat < 51.5 && fLng > -5.5 && fLng < 9.5) {
          return { lat: +fLat.toFixed(6), lng: +fLng.toFixed(6) };
        }
      }
    }
  }

  // 4. Correspondance automatique avec la Matrice ODRE certifiée (31 postes sources)
  const odre = findBessOdreData(
    p?.name || p?.client_name || p?.client,
    p?.city || p?.commune,
    p?.address
  );
  if (odre && odre.latitude && odre.longitude) {
    return { lat: +odre.latitude.toFixed(6), lng: +odre.longitude.toFixed(6) };
  }

  // 5. Coordonnées du mock de référence si trouvé
  if (mock?.lat && mock?.lng) {
    return { lat: +mock.lat.toFixed(6), lng: +mock.lng.toFixed(6) };
  }

  // 6. Géolocalisation par département / code postal dans le Grand Sud-Ouest
  const cp = String(p?.postcode || p?.zip || p?.cp || '').trim();
  const dept = cp.length >= 2 ? cp.substring(0, 2) : String(p?.dept || '').trim();
  const DEPT_COORDS = {
    '24': { lat: 45.18, lng: 0.72 }, // Dordogne (Périgueux, Bergerac, Prigonrieux)
    '33': { lat: 44.84, lng: -0.58 }, // Gironde (Bordeaux, Libourne)
    '47': { lat: 44.33, lng: 0.45 }, // Lot-et-Garonne (Agen, Marmande, Duras)
    '40': { lat: 43.89, lng: -0.89 }, // Landes (Mont-de-Marsan, Dax)
    '64': { lat: 43.30, lng: -0.37 }, // Pyrénées-Atlantiques (Pau, Bayonne)
    '32': { lat: 43.65, lng: 0.58 }, // Gers (Auch)
    '82': { lat: 44.02, lng: 1.35 }, // Tarn-et-Garonne (Montauban, Castelsarrasin)
    '81': { lat: 43.93, lng: 2.15 }, // Tarn (Albi, Castres)
    '31': { lat: 43.60, lng: 1.44 }, // Haute-Garonne (Toulouse)
    '65': { lat: 43.23, lng: 0.08 }, // Hautes-Pyrénées (Tarbes)
    '19': { lat: 45.27, lng: 1.77 }, // Corrèze (Tulle, Brive)
    '87': { lat: 45.83, lng: 1.26 }, // Haute-Vienne (Limoges, Rochechouart)
    '23': { lat: 46.17, lng: 1.87 }, // Creuse (Guéret)
    '16': { lat: 45.65, lng: 0.16 }, // Charente (Angoulême)
    '17': { lat: 45.75, lng: -0.63 }, // Charente-Maritime (La Rochelle, Saintes)
    '46': { lat: 44.45, lng: 1.44 }, // Lot (Cahors)
    '12': { lat: 44.35, lng: 2.57 }, // Aveyron (Rodez)
  };

  const strHash = (p?.name || p?.id || p?.city || 'site').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  if (DEPT_COORDS[dept]) {
    const jitterLat = ((strHash % 17) - 8) * 0.025;
    const jitterLng = (((strHash * 3) % 17) - 8) * 0.025;
    return {
      lat: +(DEPT_COORDS[dept].lat + jitterLat).toFixed(6),
      lng: +(DEPT_COORDS[dept].lng + jitterLng).toFixed(6)
    };
  }

  // 7. Fallback régional Grand Sud-Ouest avec dispersion déterministe
  const jitterLat = ((strHash % 25) - 12) * 0.05;
  const jitterLng = (((strHash * 7) % 25) - 12) * 0.05;
  return {
    lat: +(44.8 + jitterLat).toFixed(6),
    lng: +(0.8 + jitterLng).toFixed(6)
  };
}

export function computePvFinancials(site, options = {}) {
  const debtDuration = options.debtDuration || 20;
  const debtRate = options.debtRate || 4.3;
  const studyDuration = options.studyDuration || 20;

  // Si le site a déjà ses rows 20 ans calculées et ses résultats complets, on les respecte fidèlement
  if (site.rows && site.rows.length >= studyDuration && site.capexTotal && site.ebitdaAn1) {
    return {
      ...site,
      studyDuration,
      debtDuration,
      debtRate
    };
  }

  const kwc = Number(site.kwc) || 250;
  const productible = Number(site.productible) || 1125;
  const tarifS21 = site.tarifBas || options.tarifS21 || 0.082; // €/kWh
  const coutKwcCentrale = options.coutKwcCentrale || 490; // €/kWc
  const coutCentrale = site.coutCentrale !== undefined ? Number(site.coutCentrale) : Math.round(kwc * coutKwcCentrale);
  const coutCharpente = site.coutCharpente !== undefined ? Number(site.coutCharpente) : 0;
  const raccordement = site.raccordement !== undefined ? Number(site.raccordement) : Math.min(65000, Math.round(15000 + (site.substation?.distanceKm || 5) * 4500));
  const frais = site.frais !== undefined ? Number(site.frais) : Math.round((coutCentrale + coutCharpente) * 0.01);
  const capexTotal = site.capexTotal ? Number(site.capexTotal) : (coutCentrale + coutCharpente + raccordement + frais);

  // Calcul revenus An 1 (S21 injection totale avec palier 1 100 kWh/kWc)
  const prodMwh = (kwc * productible) / 1000;
  let caAnnuel;
  if (site.caAnnuel) {
    caAnnuel = Number(site.caAnnuel);
  } else if (productible > 1100) {
    const prodBas = kwc * 1100;
    const prodHaut = kwc * (productible - 1100);
    caAnnuel = Math.round((prodBas * tarifS21) + (prodHaut * 0.04));
  } else {
    caAnnuel = Math.round(kwc * productible * tarifS21);
  }

  // OPEX annuels : STRICTEMENT AUCUN LOYER FONCIER PAR DÉFAUT (loyer = 0 €)
  const maintenance = site.maintenanceAn1 !== undefined ? Number(site.maintenanceAn1) : Math.round(kwc * 7.5);
  const assurance = site.assuranceAn1 !== undefined ? Number(site.assuranceAn1) : Math.round(kwc * 3.5);
  const taxesLocales = site.taxesLocalesAn1 !== undefined ? Number(site.taxesLocalesAn1) : 0;
  const loyer = (site.rent !== undefined && site.rent !== null) ? Number(site.rent) : 0; // 0 € par défaut
  const opexAnnuel = site.opexAnnuel ? Number(site.opexAnnuel) : (maintenance + assurance + taxesLocales + loyer);
  const ebitdaAn1 = site.ebitdaAn1 ? Number(site.ebitdaAn1) : (caAnnuel - opexAnnuel);

  // Dette senior (90% emprunt, 10% apport)
  const emprunt = site.emprunt ? Number(site.emprunt) : Math.round(capexTotal * 0.90);
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

  const triProjet = site.triProjet ? Number(site.triProjet) : Math.max(5.0, Math.min(18.0, (ebitdaAn1 / capexTotal) * 100 * 0.95));
  const paybackProjet = site.payback ? Number(site.payback) : payback;

  const totalRecettesStudy = rows.reduce((s, r) => s + r.ca, 0);
  const totalOpexStudy = rows.reduce((s, r) => s + r.opex, 0);
  const totalCashFlowNet = rows.reduce((s, r) => s + r.cfNet, 0);
  const dscrMoyen = site.dscrMoyen ? Number(site.dscrMoyen) : (rows.filter(r => r.serviceDette > 0).reduce((s, r) => s + r.dscr, 0) / (debtDuration || 1));

  return {
    ...site,
    siteName: site.name,
    commune: site.city || site.commune,
    codePostal: site.postcode || site.zip || site.cp,
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
    payback: paybackProjet,
    totalRecettesStudy,
    totalOpexStudy,
    totalCashFlowNet,
    dscrMoyen,
    rows
  };
}

/**
 * Normalise un nom de portefeuille sans accents et en majuscules pour comparaison stricte et robuste
 */
export function normalizePortfolioName(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * Extrait la valeur de portefeuille PV d'un projet CRM à travers tous les champs possibles
 */
export function getProjectPvPortfolio(p) {
  if (!p) return '';
  const val = p.pv_portfolio || 
              p.portfolio_pv || 
              p.pvPortfolio || 
              p.portfolio || 
              p.portefeuille_pv || 
              p.portefeuille || 
              p.data?.pv_portfolio || 
              p.data?.portefeuille_pv || 
              p.data?.pvPortfolio || 
              p.bp_pv_data?.portfolio || 
              p.bp_pv_data?.pv_portfolio || 
              p.bpAcamaState?.pv_portfolio || 
              p.bpAcamaState?.portfolio || 
              p.customFields?.pv_portfolio || 
              '';
  return String(val).trim();
}

/**
 * Construit la liste exacte des centrales appartenant au portefeuille PV (ex: HELIOS, CASSIOPEE).
 * RÈGLE STRICTE : Seuls les projets dont la fiche projet comporte explicitement l'affectation au portefeuille PV
 * apparaissent dans la liste.
 * Reprend fidèlement les chiffrages réels, configurations de bâtiments, CAPEX et OPEX
 * réalisés pour chaque projet indépendamment (aucun loyer foncier arbitraire).
 */
export function getPvPortfolioSites(projects = [], portfolioName = 'HELIOS', currentContext = null) {
  const normTarget = normalizePortfolioName(portfolioName || 'HELIOS');

  // Helper de normalisation sans accents pour comparaison de texte (noms, villes)
  const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  // Helper pour vérifier si un projet CRM est affecté au portefeuille PV demandé
  const isAssignedToPort = (p) => {
    if (!p) return false;
    const rawPort = getProjectPvPortfolio(p);
    const normPort = normalizePortfolioName(rawPort);
    if (!normPort || normPort === 'NON AFFECTE' || normPort === 'AUCUN' || normPort === 'NONE' || normPort === 'NULL' || normPort === 'UNDEFINED') {
      return false;
    }
    if (normTarget !== 'ALL') {
      return normPort === normTarget;
    }
    return true;
  };

  // Helper pour trouver un site mock correspondant
  const findMatchingMockSite = (p) => {
    const pName = normalize(p.name);
    const pClient = normalize(p.client_name || p.client || `${p.firstName || ''} ${p.name || ''}`);
    const pCity = normalize(p.city || p.commune);

    return PV_PORTFOLIO_SITES.find(s => {
      if (p.id && s.id && p.id === s.id) return true;
      const sName = normalize(s.name);
      const sClient = normalize(s.client);
      const sCity = normalize(s.city || s.commune);

      if (pName && (sName.includes(pName) || sClient.includes(pName))) return true;
      if (pClient && (sName.includes(pClient) || sClient.includes(pClient))) return true;
      if (pCity && sCity && pCity === sCity && pName && (sName.includes(pName) || sClient.includes(pName))) return true;
      return false;
    });
  };

  // Récupération et fusion exhaustive de toutes les sources de projets (state React, cache LS, multi-tenant)
  const mergedMap = new Map();
  if (typeof window !== 'undefined') {
    try {
      const gList = JSON.parse(localStorage.getItem('nelson:projects:green-invest:v1') || '[]');
      const eList = JSON.parse(localStorage.getItem('nelson:projects:enr-courtage-energie:v1') || '[]');
      const aList = JSON.parse(localStorage.getItem('nelson:projects:acama:v1') || '[]');
      [...gList, ...eList, ...aList].forEach(p => {
        if (p && p.id) mergedMap.set(p.id, p);
      });
    } catch (e) {
      // ignore
    }
  }

  // Superposer les projets transmis dynamiquement par React
  if (Array.isArray(projects)) {
    projects.forEach(p => {
      if (p && p.id) {
        const existing = mergedMap.get(p.id) || {};
        mergedMap.set(p.id, { ...existing, ...p });
      }
    });
  }

  // Si un projet actif est ouvert dans l'éditeur (currentContext.currentProject), le fusionner en priorité
  if (currentContext?.currentProject && currentContext.currentProject.id) {
    const curP = currentContext.currentProject;
    const existing = mergedMap.get(curP.id) || {};
    mergedMap.set(curP.id, { ...existing, ...curP });
  }

  let effectiveProjects = Array.from(mergedMap.values());

  // Si aucun projet CRM n'est fourni ou trouvé
  if (effectiveProjects.length === 0) {
    return [];
  }

  const resultSites = [];
  const displayPortLabel = portfolioName === 'ALL' ? 'HELIOS' : portfolioName;

  // Parcourir STRICTEMENT les projets CRM qui ont le portefeuille affecté dans leur fiche
  effectiveProjects.forEach((p, idx) => {
    if (isAssignedToPort(p)) {
      const mock = findMatchingMockSite(p);
      const coords = extractProjectCoordinates(p, mock);

      // Vérifier si ce projet correspond au projet actuellement ouvert dans l'éditeur BP
      const isCurrentProject = currentContext?.currentProject && (
        (p.id && currentContext.currentProject.id && p.id === currentContext.currentProject.id) ||
        (normalize(p.name) && normalize(p.name) === normalize(currentContext.currentProject.name))
      );

      // Extraire la configuration BP sauvegardée ou les bâtiments dessinés
      const savedState = p.bp_pv_data || p.bpAcamaState || {};
      const savedBuildings = savedState.buildings || [];

      let pKwc = 0;
      let pProd = 0;
      let pCentrale = 0;
      let pCharpente = 0;
      let pRaccordement = 0;
      let pFrais = 0;
      let pCapex = 0;
      let pMaint = undefined;
      let pAssur = undefined;
      let pTaxes = 0;
      let pLoyer = 0;
      let pCa = undefined;
      let pEbitda = undefined;
      let pOpex = undefined;
      let pTri = undefined;
      let pPayback = undefined;
      let pRows = undefined;

      if (isCurrentProject && currentContext.currentParams && currentContext.currentResults) {
        // PROJET EN COURS DANS L'ÉDITEUR BP : reprendre fidèlement ses chiffres exacts
        const curPar = currentContext.currentParams;
        const curRes = currentContext.currentResults;
        pKwc = Number(curPar.kwc || curRes.kwc || 250);
        pProd = Number(curPar.productible || curRes.productible || 1125);
        pCentrale = Number(curPar.coutCentrale || Math.round(pKwc * 490));
        pCharpente = Number(curPar.coutCharpente || 0);
        pRaccordement = Number(curPar.raccordement || 0);
        pFrais = Number(curPar.frais || 0);
        pCapex = Number(curRes.capexTotal || curPar.totalInvestissement || (pCentrale + pCharpente + pRaccordement + pFrais));
        pMaint = curPar.maintenance ? Number(curPar.maintenance) : Math.round(pKwc * 7.5);
        pAssur = curPar.assurance ? Number(curPar.assurance) : Math.round(pKwc * 3.5);
        pTaxes = curPar.taxesLocales ? Number(curPar.taxesLocales) : 0;
        pLoyer = 0; // AUCUN LOYER FONCIER
        pCa = Number(curRes.caAnnuel || curRes.revAn1 || 0);
        pEbitda = Number(curRes.ebitdaAn1 || curRes.ebitda || 0);
        pOpex = Number(curRes.totalOpexAn1 || curRes.opexAnnuel || 0);
        pTri = Number(curRes.triProjet || 0);
        pPayback = Number(curRes.payback || 0);
        if (currentContext.currentRows && currentContext.currentRows.length >= 20) {
          pRows = currentContext.currentRows;
        }
      } else if (p.bpResults) {
        // Chiffrage BP précalculé sur le projet
        const res = p.bpResults;
        pKwc = Number(res.kwc || p.kwc || 250);
        pProd = Number(res.productible || 1125);
        pCapex = Number(res.capexTotal || res.totalConstruction || 250000);
        pCentrale = Number(res.coutCentrale || Math.round(pKwc * 490));
        pCharpente = Number(res.coutCharpente || 0);
        pRaccordement = Number(res.raccordement || 0);
        pFrais = Number(res.frais || 0);
        pCa = Number(res.caAnnuel || (res.totalCA ? (res.totalCA / 20) : 0));
        pEbitda = Number(res.ebitdaAn1 || res.ebitda || 0);
        pOpex = Number(res.opexAnnuel || (res.caAnnuel - res.ebitdaAn1) || 0);
        pTri = Number(res.triProjet || 0);
        pPayback = Number(res.payback || 0);
        pLoyer = 0;
        if (res.rows && res.rows.length >= 20) pRows = res.rows;
      } else if (savedBuildings.length > 0) {
        // État BP sauvegardé avec liste de bâtiments
        pKwc = savedBuildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0), 0);
        pCentrale = savedBuildings.reduce((sum, b) => sum + (parseFloat(b.coutCentrale) || 0), 0);
        pCharpente = savedBuildings.reduce((sum, b) => sum + (parseFloat(b.coutCharpente) || 0), 0);
        const totalProdKwh = savedBuildings.reduce((sum, b) => sum + (parseFloat(b.kwc) || 0) * (parseFloat(b.productible) || 0), 0);
        pProd = pKwc > 0 ? (totalProdKwh / pKwc) : (parseFloat(p.solarYieldRoof1 || p.productible) || 1125);
        pRaccordement = parseFloat(savedState.raccordement) || 0;
        pFrais = parseFloat(savedState.frais) || 0;
        pCapex = pCentrale + pCharpente + pRaccordement + pFrais + (parseFloat(savedState.soulte) || 0);
        pMaint = savedState.maintenance ? parseFloat(savedState.maintenance) : Math.round(pKwc * 7.5);
        pAssur = savedState.assurance ? parseFloat(savedState.assurance) : Math.round(pKwc * 3.5);
        pTaxes = savedState.taxesLocales ? parseFloat(savedState.taxesLocales) : 0;
        pLoyer = 0;
      } else {
        // Bâtiments multi-puissances (b1, b2, etc.) ou map features ou champs directs
        const buildingFeatures = (p.features || []).filter(f => (f.type === 'rectangle' && !f.isBattery) || (f.type === 'polygon' && f.isPredefinedBuilding));
        if (buildingFeatures.length > 0) {
          pKwc = buildingFeatures.reduce((sum, f) => sum + (parseFloat(f.power || f.kwc || f.puissance) || 0), 0);
          pCentrale = pKwc * 490;
          pCharpente = buildingFeatures.reduce((sum, f) => sum + (parseFloat(f.cout_bat || f.coutCharpente) || 0), 0);
        } else {
          const b1 = parseFloat(p.puissance) || 0;
          const b2 = parseFloat(p.puissance2) || 0;
          const b3 = parseFloat(p.puissance3) || 0;
          const b4 = parseFloat(p.puissance4) || 0;
          const multi = b1 + b2 + b3 + b4;
          if (multi > 0) {
            pKwc = multi;
            pCentrale = pKwc * 490;
            pCharpente = parseFloat(p.coutCharpente) || 0;
          } else {
            pKwc = parseFloat(p.kwc || p.puissance) || mock?.kwc || 250;
            pCentrale = Math.round(pKwc * 490);
            pCharpente = parseFloat(p.coutCharpente) || 0;
          }
        }
        pProd = parseFloat(p.productible || p.solarYieldRoof1) || mock?.productible || 1125;
        pRaccordement = parseFloat(p.raccordement) || Math.min(65000, Math.round(15000 + (p.substation?.distanceKm || mock?.substation?.distanceKm || 5) * 4500));
        pFrais = parseFloat(p.frais) || Math.round((pCentrale + pCharpente) * 0.01);
        pCapex = parseFloat(p.capex || p.prix_total_ht) || (pCentrale + pCharpente + pRaccordement + pFrais);
        pLoyer = 0;
      }

      // ODRE Substation
      const subst = p.substation || mock?.substation || {
        name: "ODRE",
        distanceKm: 5.0,
        quotePartS3renr: "92.73 k€/MW",
        resteAffecterMw: 0,
        statutRaccordement: "Zone standard Enedis"
      };

      const siteId = p.id || mock?.id || `pv_site_${idx + 1}`;
      const projectName = p.name || mock?.siteName || mock?.name || `Centrale ${idx + 1}`;
      const siteFullName = normalizePortfolioName(projectName).startsWith(normTarget)
        ? projectName
        : `${displayPortLabel} - ${projectName}`;

      const siteObj = {
        id: siteId,
        name: siteFullName,
        siteName: projectName,
        client: [p.firstName, p.name].filter(Boolean).join(' ') || p.client_name || mock?.client || 'Client',
        postcode: p.zip || p.postcode || p.cp || mock?.postcode || '',
        city: p.city || p.commune || mock?.city || '',
        address: p.address || mock?.address || '',
        typeBat: p.type_bat || p.typeBat || mock?.typeBat || 'Bâtiment BAC',
        spv: p.spv || mock?.spv || `${displayPortLabel} SPV 1`,
        kwc: pKwc,
        productible: pProd,
        surface: p.surface || mock?.surface || Math.round(pKwc * 5),
        rent: 0, // STRICTEMENT AUCUN LOYER FONCIER
        coutCentrale: pCentrale,
        coutCharpente: pCharpente,
        raccordement: pRaccordement,
        frais: pFrais,
        capexTotal: pCapex,
        maintenanceAn1: pMaint,
        assuranceAn1: pAssur,
        taxesLocalesAn1: pTaxes,
        loyerAn1: 0,
        caAnnuel: pCa,
        ebitdaAn1: pEbitda,
        opexAnnuel: pOpex,
        triProjet: pTri,
        payback: pPayback,
        rows: pRows,
        lat: coords.lat,
        lng: coords.lng,
        substation: subst,
        crmProject: p
      };

      const completeFin = computePvFinancials(siteObj);
      resultSites.push({
        ...siteObj,
        ...completeFin,
        id: siteId,
        name: siteObj.name,
        siteName: siteObj.siteName,
        lat: coords.lat,
        lng: coords.lng
      });
    }
  });

  return resultSites;
}


