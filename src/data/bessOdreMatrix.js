/**
 * MATRICE OFFICIELLE CAPARESEAU / ODRE DES 31 POSTES SOURCES BESS
 * Source : Open Data Réseaux Énergies (ODRE) & Fichier Enedis ENR COURTAGE
 * "Matrice_Capareseau_ODRE_31_Postes_Sources_ENR_COURTAGE.xlsx"
 * 
 * Données certifiées Niveau 1 : Officiel Direct Enedis & CRE 2025-227
 */

export const BESS_ODRE_MATRIX = [
  {
    id: 1,
    siteName: "PAILLOT",
    client: "PAILLOT Noël",
    commune: "Rochechouart",
    codePostal: "87600",
    departement: "87",
    latitude: 45.847811,
    longitude: 0.852996,
    posteSourceEnedis: "PLAUD",
    tension: "HTA 20 kV",
    distanceKm: 6.6,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix injection",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 2,
    siteName: "BATIOT",
    client: "BATIOT Olivier",
    commune: "Mongausy",
    codePostal: "32220",
    departement: "32",
    latitude: 43.496370,
    longitude: 0.834241,
    posteSourceEnedis: "SEMEZIES",
    tension: "HTA 20 kV",
    distanceKm: 5.9,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 1.6,
    typologieZoneCre: "Poche signal-prix injection",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 3,
    siteName: "DOMERGUE",
    client: "DOMERGUE David",
    commune: "Meuzac",
    codePostal: "87380",
    departement: "87",
    latitude: 45.566247,
    longitude: 1.397687,
    posteSourceEnedis: "LE REPAIRE",
    tension: "HTA 20 kV",
    distanceKm: 8.6,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 4,
    siteName: "CUBERTAFON",
    client: "CUBERTAFON René",
    commune: "Saint-Julien-le-Vendômois",
    codePostal: "19210",
    departement: "19",
    latitude: 45.460274,
    longitude: 1.298160,
    posteSourceEnedis: "LUBERSAC",
    tension: "HTA 20 kV",
    distanceKm: 8.3,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF",
    section: "AY",
    numero: "0130",
    contenance: 7305
  },
  {
    id: 5,
    siteName: "PLANTE",
    client: "PLANTE Jean-Pierre",
    commune: "Port-de-Lanne",
    codePostal: "40300",
    departement: "40",
    latitude: 43.558940,
    longitude: -1.199501,
    posteSourceEnedis: "GUICHE",
    tension: "HTA 20 kV",
    distanceKm: 4.9,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 6,
    siteName: "PRAVIE",
    client: "PRAVIE Clémence",
    commune: "Grisolles",
    codePostal: "82170",
    departement: "82",
    latitude: 43.806645,
    longitude: 1.296311,
    bessLatitude: 43.806645,
    bessLongitude: 1.296311,
    section: "ZB",
    numero: "0062",
    contenance: 27100,
    posteSourceEnedis: "LESQUIVE 2",
    tension: "HTA 20 kV",
    distanceKm: 2.3,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 80.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 7,
    siteName: "LATOURNERIE",
    client: "LATOURNERIE Franck",
    commune: "Brantôme en Périgord",
    codePostal: "24310",
    departement: "24",
    latitude: 45.328888,
    longitude: 0.651040,
    posteSourceEnedis: "BRANTOME",
    tension: "HTA 20 kV",
    distanceKm: 3.5,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.5,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 8,
    siteName: "DAVID",
    client: "DAVID Louis",
    commune: "Concèze",
    codePostal: "19350",
    departement: "19",
    latitude: 45.353329,
    longitude: 1.314195,
    posteSourceEnedis: "LUBERSAC",
    tension: "HTA 20 kV",
    distanceKm: 8.6,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 9,
    siteName: "GRANGER",
    client: "GRANGER Bruno",
    commune: "Saint-Éloy-les-Tuileries",
    codePostal: "19210",
    departement: "19",
    latitude: 45.442533,
    longitude: 1.267710,
    posteSourceEnedis: "LUBERSAC",
    tension: "HTA 20 kV",
    distanceKm: 10.5,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 10,
    siteName: "CASTEBRUNET",
    client: "CASTEBRUNET Jérémy",
    commune: "Caussade",
    codePostal: "82300",
    departement: "82",
    latitude: 44.123740,
    longitude: 1.564486,
    posteSourceEnedis: "LERE",
    tension: "HTA 20 kV",
    distanceKm: 5.7,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 11,
    siteName: "BERTRANDIE",
    client: "BERTRANDIE Sébastien",
    commune: "Monestier",
    codePostal: "24240",
    departement: "24",
    latitude: 44.773569,
    longitude: 0.300107,
    posteSourceEnedis: "STE-FOY-LA-GRANDE",
    tension: "HTA 20 kV",
    distanceKm: 9.0,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 12,
    siteName: "GIOT",
    client: "GIOT Joachim",
    commune: "Leyrat",
    codePostal: "23600",
    departement: "23",
    latitude: 46.360561,
    longitude: 2.306566,
    posteSourceEnedis: "BOUSSAC",
    tension: "HTA 20 kV",
    distanceKm: 5.9,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.5,
    typologieZoneCre: "Poche signal-prix injection",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 13,
    siteName: "ARBOIN",
    client: "ARBOIN Régis",
    commune: "Duras",
    codePostal: "47120",
    departement: "47",
    latitude: 44.659496,
    longitude: 0.222735,
    posteSourceEnedis: "LA SAUVETAT",
    tension: "HTA 20 kV",
    distanceKm: 11.8,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche mixte injection & soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 14,
    siteName: "MISSAULT",
    client: "MISSAULT David",
    commune: "Saint-Saud-Lacoussière",
    codePostal: "24470",
    departement: "24",
    latitude: 45.558769,
    longitude: 0.804488,
    posteSourceEnedis: "NONTRON",
    tension: "HTA 20 kV",
    distanceKm: 13.7,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 15,
    siteName: "MEILLAT",
    client: "MEILLAT Maxime",
    commune: "Mourioux-Vieilleville",
    codePostal: "23210",
    departement: "23",
    latitude: 46.082964,
    longitude: 1.538518,
    posteSourceEnedis: "CHATELUS 2",
    tension: "HTA 20 kV",
    distanceKm: 5.4,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 2.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 16,
    siteName: "SOULIGNAC",
    client: "SOULIGNAC Thierry",
    commune: "Val-de-Livenne",
    codePostal: "33860",
    departement: "33",
    latitude: 45.264357,
    longitude: -0.550408,
    posteSourceEnedis: "ETAULIERS",
    tension: "HTA 20 kV",
    distanceKm: 7.7,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 17,
    siteName: "CHAUFFAILLE",
    client: "CHAUFFAILLE Franck",
    commune: "Payzac",
    codePostal: "24270",
    departement: "24",
    latitude: 45.436230,
    longitude: 1.288728,
    posteSourceEnedis: "LUBERSAC",
    tension: "HTA 20 kV",
    distanceKm: 6.9,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 18,
    siteName: "CIROLI",
    client: "CIROLI",
    commune: "Juillac",
    codePostal: "33890",
    departement: "33",
    latitude: 44.809547,
    longitude: 0.037304,
    posteSourceEnedis: "AURIOLLES",
    tension: "HTA 20 kV",
    distanceKm: 7.9,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.3,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 19,
    siteName: "BOURDETTES",
    client: "BOURDETTES Sandrine",
    commune: "Mansan",
    codePostal: "65140",
    departement: "65",
    latitude: 43.343730,
    longitude: 0.194628,
    posteSourceEnedis: "VIC-EN-BIGORRE",
    tension: "HTA 20 kV",
    distanceKm: 10.8,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 7.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 20,
    siteName: "CASTEBRUNET",
    client: "CASTEBRUNET Jérémy",
    commune: "Caussade",
    codePostal: "82300",
    departement: "82",
    latitude: 44.117157,
    longitude: 1.566758,
    posteSourceEnedis: "LERE",
    tension: "HTA 20 kV",
    distanceKm: 5.5,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 21,
    siteName: "FRECHEVILLE",
    client: "FRECHEVILLE Mathieu",
    commune: "Saint-Eutrope-de-Born",
    codePostal: "47210",
    departement: "47",
    latitude: 44.588327,
    longitude: 0.665431,
    posteSourceEnedis: "CANCON",
    tension: "HTA 20 kV",
    distanceKm: 7.2,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix injection",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 22,
    siteName: "CASTEBRUNET",
    client: "CASTEBRUNET Jérémy",
    commune: "Monteils",
    codePostal: "82300",
    departement: "82",
    latitude: 44.165754,
    longitude: 1.564963,
    posteSourceEnedis: "LERE",
    tension: "HTA 20 kV",
    distanceKm: 3.6,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 23,
    siteName: "DOUMENS",
    client: "DOUMENS Morgan",
    commune: "Beychac-et-Caillau",
    codePostal: "33750",
    departement: "33",
    latitude: 44.870054,
    longitude: -0.397698,
    posteSourceEnedis: "POMPIGNAC",
    tension: "HTA 20 kV",
    distanceKm: 4.0,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 2.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 24,
    siteName: "HOUSSAIT-YOUNG",
    client: "HOUSSAIT-YOUNG Jérôme",
    commune: "Vendays-Montalivet",
    codePostal: "33930",
    departement: "33",
    latitude: 45.338321,
    longitude: -1.071016,
    posteSourceEnedis: "ST-VIVIEN",
    tension: "HTA 20 kV",
    distanceKm: 9.9,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 8.6,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 25,
    siteName: "MISSAULT",
    client: "MISSAULT David",
    commune: "Saint-Martin-de-Fressengeas",
    codePostal: "24800",
    departement: "24",
    latitude: 45.438589,
    longitude: 0.815692,
    posteSourceEnedis: "THIVIERS",
    tension: "HTA 20 kV",
    distanceKm: 6.7,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche mixte injection & soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 26,
    siteName: "LARDY",
    client: "LARDY Michel",
    commune: "Maisonnisses",
    codePostal: "23150",
    departement: "23",
    latitude: 46.067915,
    longitude: 1.907318,
    posteSourceEnedis: "LAVAUD",
    tension: "HTA 20 kV",
    distanceKm: 10.6,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 27,
    siteName: "CELERIE",
    client: "CELERIE Thomas",
    commune: "Beyssenac",
    codePostal: "19230",
    departement: "19",
    latitude: 45.400772,
    longitude: 1.284338,
    posteSourceEnedis: "LUBERSAC",
    tension: "HTA 20 kV",
    distanceKm: 7.1,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 28,
    siteName: "MEILLAT",
    client: "MEILLAT Maxime",
    commune: "Mourioux-Vieilleville",
    codePostal: "23210",
    departement: "23",
    latitude: 46.081523,
    longitude: 1.633909,
    posteSourceEnedis: "CHATELUS 2",
    tension: "HTA 20 kV",
    distanceKm: 5.4,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 2.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 29,
    siteName: "DOMERGUE",
    client: "DOMERGUE David",
    commune: "Argences en Aubrac",
    codePostal: "12420",
    departement: "12",
    latitude: 44.807528,
    longitude: 2.798446,
    posteSourceEnedis: "RUEYRES",
    tension: "HTA 20 kV",
    distanceKm: 5.9,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix injection",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 30,
    siteName: "COMBY",
    client: "COMBY Fabrice",
    commune: "Saint-Éloy-les-Tuileries",
    codePostal: "19210",
    departement: "19",
    latitude: 45.452807,
    longitude: 1.284563,
    posteSourceEnedis: "LUBERSAC",
    tension: "HTA 20 kV",
    distanceKm: 10.5,
    quotePartS3REnR: "92.73 k€/MW",
    quotePartS3renrEur: 92730,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Zone standard Enedis",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  },
  {
    id: 31,
    siteName: "CASTEBRUNET",
    client: "CASTEBRUNET Jérémy",
    commune: "Saint-Cirq",
    codePostal: "82300",
    departement: "82",
    latitude: 44.124392,
    longitude: 1.583302,
    posteSourceEnedis: "LERE",
    tension: "HTA 20 kV",
    distanceKm: 6.2,
    quotePartS3REnR: "84.13 k€/MW",
    quotePartS3renrEur: 84130,
    capaciteResiduelleOdreMw: 0.0,
    typologieZoneCre: "Poche signal-prix soutirage",
    puissanceKw: 500,
    capaciteKwh: 1044,
    statutRaccordement: "Transfo sol libre - Dépôt PTF"
  }
];

/**
 * Calcul standardisé du coût de raccordement BESS (Norme Enedis / CRE)
 * @param {number} distanceKm Distance géodésique ou réseau en kilomètres
 * @param {number} distPriv Distance privée en mètres (défaut 10m)
 * @returns {{ raccordementHTCost: number, raccordementCost: number, distanceMeters: number }}
 */
export function computeBessRaccordementCost(distanceKm, distPriv = 10) {
  const dKm = parseFloat(distanceKm) || 5.0;
  const dPriv = parseFloat(distPriv) || 10;
  const raccordementHTCost = Math.round(15000 + (dKm * 1000 * 0.035 * 1000));
  const raccordementCost = Math.min(115000, Math.round(35000 + (raccordementHTCost * 0.45) + (dPriv * 20)));
  return {
    raccordementHTCost,
    raccordementCost,
    distanceMeters: Math.round(dKm * 1000)
  };
}

/**
 * Recherche et appariement intelligent d'un site projet avec la matrice ODRE des 31 sites
 * @param {string|number} search Identifier, nom du projet ou du client
 * @param {string} [city] Commune du projet
 * @param {string} [address] Adresse ou code postal
 * @param {number} [lat] Latitude décimale
 * @param {number} [lng] Longitude décimale
 * @returns {object|null} Données réseau ODRE certifiées ou null
 */
export function findBessOdreData(search, city = '', address = '', lat = null, lng = null) {
  if (!search && !city && !address && !lat) return null;

  const rawSearch = String(search || '').trim().toUpperCase();
  const rawCity = String(city || '').trim().toUpperCase();
  const rawAddress = String(address || '').trim().toUpperCase();

  // 1. Recherche par ID direct (si nombre 1 à 31)
  if (typeof search === 'number' || /^\d+$/.test(rawSearch)) {
    const num = parseInt(rawSearch, 10);
    const byId = BESS_ODRE_MATRIX.find(s => s.id === num);
    if (byId) return byId;
  }

  // 2. Recherche par proximité GPS exacte (< 1.5 km)
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const byCoords = BESS_ODRE_MATRIX.find(s => {
      const dLat = Math.abs(s.latitude - latNum);
      const dLng = Math.abs(s.longitude - lngNum);
      return dLat < 0.015 && dLng < 0.015; // ~1.5 km
    });
    if (byCoords) return byCoords;
  }

  // 3. Normalisation des chaînes pour matcher le nom du projet ou client
  const normalize = (str) =>
    (str || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, " ")
      .trim();

  const cleanSearch = normalize(rawSearch);
  const cleanCity = normalize(rawCity);
  const cleanAddr = normalize(rawAddress);

  // 3. Correspondance prioritaire sur le mot-clé exact de site (ex: "PRAVIE", "GRANGER", "LATOURNERIE")
  const searchWords = cleanSearch.split(/\s+/).filter(Boolean);
  for (const s of BESS_ODRE_MATRIX) {
    const sName = normalize(s.siteName);
    if (sName && (cleanSearch === sName || searchWords.includes(sName) || cleanSearch.startsWith(sName + " ") || cleanSearch.endsWith(" " + sName))) {
      return s;
    }
  }

  // 4. Correspondance standard sur le nom de site ou le client
  for (const s of BESS_ODRE_MATRIX) {
    const sName = normalize(s.siteName);
    const sClient = normalize(s.client);
    const sCommune = normalize(s.commune);

    // Correspondance sur le nom de site ou le client
    if (cleanSearch && (cleanSearch.includes(sName) || sClient.includes(cleanSearch) || cleanSearch.includes(sClient))) {
      if (cleanCity || cleanAddr) {
        if (cleanCity.includes(sCommune) || cleanAddr.includes(sCommune) || cleanAddr.includes(s.codePostal)) {
          return s;
        }
      } else {
        return s;
      }
    }

    // Correspondance sur la commune
    if (cleanCity && cleanCity === sCommune) {
      return s;
    }
  }

  // Deuxième passe plus permissive (si commune dans l'adresse ou recherche)
  for (const s of BESS_ODRE_MATRIX) {
    const sCommune = normalize(s.commune);
    if ((cleanSearch && cleanSearch.includes(sCommune)) || (cleanAddr && cleanAddr.includes(sCommune))) {
      return s;
    }
  }

  return null;
}
