import { findBessOdreData } from './bessOdreMatrix.js';

export const BESS_PORTFOLIO_SITES = [
  {
    "id": "site_1",
    "name": "GRANGER",
    "postcode": "19210",
    "city": "Saint-Éloy-les-Tuileries",
    "address": "19210 Saint-Éloy-les-Tuileries",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.458446,
    "lng": 1.284627,
    "substation": {
      "name": "LUBERSAC",
      "code": "LUBER",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 10.5,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 8.3,
      "resteAffecterMw": 0,
      "fileAttenteMw": 21,
      "lat": 45.422266799366184,
      "lng": 1.4090700157544982
    }
  },
  {
    "id": "site_2",
    "name": "PRAVIE",
    "postcode": "82170",
    "city": "Grisolles",
    "address": "82170 Grisolles",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 43.820389,
    "lng": 1.293516,
    "substation": {
      "name": "Lesquive 2",
      "code": "LESQ2",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 2.3,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 0,
      "resteAffecterMw": 80,
      "fileAttenteMw": 0,
      "lat": 43.81573466077229,
      "lng": 1.2659000247457957
    }
  },
  {
    "id": "site_3",
    "name": "DOMERGUE MEUZAC",
    "postcode": "87380",
    "city": "Meuzac",
    "address": "87380 Meuzac",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.548952,
    "lng": 1.417756,
    "substation": {
      "name": "LE REPAIRE",
      "code": "REPAI",
      "voltageLevel": "63 / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 8.6,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 0,
      "resteAffecterMw": 0,
      "fileAttenteMw": 0,
      "lat": 45.60788310970211,
      "lng": 1.489510958516563
    }
  },
  {
    "id": "site_4",
    "name": "PLANTE",
    "postcode": "40300",
    "city": "Port-de-Lanne",
    "address": "40300 Port-de-Lanne",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 43.561118,
    "lng": -1.184031,
    "substation": {
      "name": "GUICHE",
      "code": "GUICH",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 4.9,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 13.1,
      "resteAffecterMw": 0,
      "fileAttenteMw": 7.9,
      "lat": 43.52161012308792,
      "lng": -1.21061624123144
    }
  },
  {
    "id": "site_5",
    "name": "HOUSSAIT YOUNG",
    "postcode": "33930",
    "city": "Vendays-Montalivet",
    "address": "33930 Vendays-Montalivet",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.34446,
    "lng": -1.089784,
    "substation": {
      "name": "ST-VIVIEN",
      "code": "SSVIV",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 9.9,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 3.9,
      "resteAffecterMw": 8.6,
      "fileAttenteMw": 5.5,
      "lat": 45.42195148053101,
      "lng": -1.027861815826686
    }
  },
  {
    "id": "site_6",
    "name": "LATOURNERIE",
    "postcode": "24310",
    "city": "Brantôme en Périgord",
    "address": "24310 Brantôme en Périgord",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.372246,
    "lng": 0.662133,
    "substation": {
      "name": "BRANTOME",
      "code": "BRANT",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 3.5,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 7.2,
      "resteAffecterMw": 0.5,
      "fileAttenteMw": 16.2,
      "lat": 45.38686649501708,
      "lng": 0.6224968226231131
    }
  },
  {
    "id": "site_7",
    "name": "BATIOT",
    "postcode": "32220",
    "city": "Mongauzy",
    "address": "32220 Mongauzy",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 43.5072,
    "lng": 0.808096,
    "substation": {
      "name": "SEMEZIES",
      "code": "SEMEZ",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 6.9,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 1.9,
      "resteAffecterMw": 1.6,
      "fileAttenteMw": 4.5,
      "lat": 43.51109843280327,
      "lng": 0.7228107266072441
    }
  },
  {
    "id": "site_8",
    "name": "CUBERTAFON",
    "postcode": "19210",
    "city": "Saint-Julien-le-Vendômois",
    "address": "19210 Saint-Julien-le-Vendômois",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.454773,
    "lng": 1.313675,
    "substation": {
      "name": "LUBERSAC",
      "code": "LUBER",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 8.3,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 8.3,
      "resteAffecterMw": 0,
      "fileAttenteMw": 21,
      "lat": 45.422266799366184,
      "lng": 1.4090700157544982
    }
  },
  {
    "id": "site_9",
    "name": "SOULIGNAC",
    "postcode": "33820",
    "city": "Val-de-Livenne",
    "address": "33820 Val-de-Livenne",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.275598,
    "lng": -0.506839,
    "substation": {
      "name": "ETAULIERS",
      "code": "ETAUL",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 7.7,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 8.2,
      "resteAffecterMw": 0,
      "fileAttenteMw": 8.2,
      "lat": 45.224180981247734,
      "lng": -0.5729124182831349
    }
  },
  {
    "id": "site_10",
    "name": "ARBOIN",
    "postcode": "47120",
    "city": "Duras",
    "address": "47120 Duras",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.678615,
    "lng": 0.196581,
    "substation": {
      "name": "LA SAUVETAT",
      "code": "SAUVE",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 11.8,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 44.9,
      "resteAffecterMw": 0,
      "fileAttenteMw": 18.8,
      "lat": 44.64422468369006,
      "lng": 0.33745916539370935
    }
  },
  {
    "id": "site_11",
    "name": "MISSAULT FRESSENGEAS",
    "postcode": "24800",
    "city": "Saint-Martin-de-Fressengeas",
    "address": "24800 Saint-Martin-de-Fressengeas",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.455635,
    "lng": 0.834728,
    "substation": {
      "name": "THIVIERS",
      "code": "THIVI",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 6.7,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 12.9,
      "resteAffecterMw": 0,
      "fileAttenteMw": 62.2,
      "lat": 45.410907280178414,
      "lng": 0.8924630933094297
    }
  },
  {
    "id": "site_12",
    "name": "MISSAULT LACOUSSIERE",
    "postcode": "24470",
    "city": "Saint-Saud-Lacoussière",
    "address": "24470 Saint-Saud-Lacoussière",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.537286,
    "lng": 0.832955,
    "substation": {
      "name": "NONTRON",
      "code": "NONTR",
      "voltageLevel": "HTA / HTB1 / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 13.7,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 14.3,
      "resteAffecterMw": 0,
      "fileAttenteMw": 11.9,
      "lat": 45.51504327883197,
      "lng": 0.6602911076437614
    }
  },
  {
    "id": "site_13",
    "name": "GIOT",
    "postcode": "23600",
    "city": "Leyrat",
    "address": "23600 Leyrat",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 46.360924,
    "lng": 2.293981,
    "substation": {
      "name": "BOUSSAC",
      "code": "BOUS5",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 5.9,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 13.3,
      "resteAffecterMw": 0.5,
      "fileAttenteMw": 7.2,
      "lat": 46.34628897239144,
      "lng": 2.2200084921595233
    }
  },
  {
    "id": "site_14",
    "name": "BOURDETTES",
    "postcode": "65140",
    "city": "Mansan",
    "address": "65140 Mansan",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 43.339838,
    "lng": 0.193437,
    "substation": {
      "name": "VIC-EN-BIGORRE",
      "code": "V.BIG",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 10.8,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 5.4,
      "resteAffecterMw": 7,
      "fileAttenteMw": 13.6,
      "lat": 43.383084635070034,
      "lng": 0.07355040242316724
    }
  },
  {
    "id": "site_15",
    "name": "CIROLI",
    "postcode": "33890",
    "city": "Juillac",
    "address": "33890 Juillac",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.814913,
    "lng": 0.054852,
    "substation": {
      "name": "AURIOLLES",
      "code": "AURIO",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 7.9,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 7.9,
      "resteAffecterMw": 0.3,
      "fileAttenteMw": 27.2,
      "lat": 44.74778749649646,
      "lng": 0.02382241148442521
    }
  },
  {
    "id": "site_16",
    "name": "DOMERGUE ARGENCES",
    "postcode": "12420",
    "city": "Argences-en-Aubrac",
    "address": "12420 Argences-en-Aubrac",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.802013,
    "lng": 2.759214,
    "substation": {
      "name": "RUEYRES",
      "code": "RUEYR",
      "voltageLevel": "HTA / HTB1 / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 5.9,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 5.8,
      "resteAffecterMw": 0,
      "fileAttenteMw": 36.2,
      "lat": 44.77253858369784,
      "lng": 2.6974562232881185
    }
  },
  {
    "id": "site_17",
    "name": "BERTRANDIE",
    "postcode": "24240",
    "city": "Monestier",
    "address": "24240 Monestier",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.774889,
    "lng": 0.311438,
    "substation": {
      "name": "STE-FOY-LA-GRANDE",
      "code": "SSFOY",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 9,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 20.6,
      "resteAffecterMw": 0,
      "fileAttenteMw": 31.1,
      "lat": 44.836333744556235,
      "lng": 0.23805326615259492
    }
  },
  {
    "id": "site_18",
    "name": "COMBY",
    "postcode": "19210",
    "city": "Saint-Éloy-les-Tuileries",
    "address": "19210 Saint-Éloy-les-Tuileries",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.458446,
    "lng": 1.284627,
    "substation": {
      "name": "LUBERSAC",
      "code": "LUBER",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 10.5,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 8.3,
      "resteAffecterMw": 0,
      "fileAttenteMw": 21,
      "lat": 45.422266799366184,
      "lng": 1.4090700157544982
    }
  },
  {
    "id": "site_19",
    "name": "DOUMENS",
    "postcode": "33750",
    "city": "Beychac-et-Caillau",
    "address": "33750 Beychac-et-Caillau",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.874311,
    "lng": -0.375722,
    "substation": {
      "name": "POMPIGNAC",
      "code": "POMPI",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 4,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 0,
      "resteAffecterMw": 2,
      "fileAttenteMw": 0,
      "lat": 44.864389217579365,
      "lng": -0.42513502454982444
    }
  },
  {
    "id": "site_20",
    "name": "LARDY",
    "postcode": "23150",
    "city": "Maisonnisses",
    "address": "23150 Maisonnisses",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 46.056502,
    "lng": 1.907133,
    "substation": {
      "name": "LAVAUD",
      "code": "LAVAU",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 10.6,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 5.1,
      "resteAffecterMw": 0,
      "fileAttenteMw": 7.8,
      "lat": 46.15167132199841,
      "lng": 1.9068918686853655
    }
  },
  {
    "id": "site_21",
    "name": "FRECHEVILLE",
    "postcode": "47210",
    "city": "Saint-Eutrope-de-Born",
    "address": "47210 Saint-Eutrope-de-Born",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.577018,
    "lng": 0.708187,
    "substation": {
      "name": "CANCON",
      "code": "CANCO",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 7.2,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 14.9,
      "resteAffecterMw": 0,
      "fileAttenteMw": 10.3,
      "lat": 44.530068530120644,
      "lng": 0.6460138151631378
    }
  },
  {
    "id": "site_22",
    "name": "LAGROT",
    "postcode": "24320",
    "city": "Saint-Paul-Lizonne",
    "address": "24320 Saint-Paul-Lizonne",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.316192,
    "lng": 0.279422,
    "substation": {
      "name": "BERTRIC",
      "code": "BERTR",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 6.1,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 21.6,
      "resteAffecterMw": 0,
      "fileAttenteMw": 13.6,
      "lat": 45.29562045421253,
      "lng": 0.35114258155877565
    }
  },
  {
    "id": "site_23",
    "name": "MEILLAT 2",
    "postcode": "23210",
    "city": "Mourioux-Vieilleville",
    "address": "1a La Ribiere 23210 Mourioux-Vieilleville",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 46.08293,
    "lng": 1.65819,
    "substation": {
      "name": "CHATELUS 2",
      "code": "CTLU2",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 5.4,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 0,
      "resteAffecterMw": 2,
      "fileAttenteMw": 0,
      "lat": 46.028673820804784,
      "lng": 1.6422674324486621
    }
  },
  {
    "id": "site_24",
    "name": "MEILLAT 1",
    "postcode": "23210",
    "city": "Mourioux-Vieilleville",
    "address": "1a La Ribiere 23210 Mourioux-Vieilleville",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 46.08293,
    "lng": 1.65819,
    "substation": {
      "name": "CHATELUS 2",
      "code": "CTLU2",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 5.4,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 0,
      "resteAffecterMw": 2,
      "fileAttenteMw": 0,
      "lat": 46.028673820804784,
      "lng": 1.6422674324486621
    }
  },
  {
    "id": "site_25",
    "name": "NADAUD",
    "postcode": "17210",
    "city": "Montlieu-la-Garde",
    "address": "17210 Montlieu-la-Garde",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.231412,
    "lng": -0.254689,
    "substation": {
      "name": "MONTGUYON",
      "code": "MTGUY",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 5.3,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 5.4,
      "resteAffecterMw": 2.7,
      "fileAttenteMw": 144.8,
      "lat": 45.19666628523816,
      "lng": -0.20818194220661868
    }
  },
  {
    "id": "site_26",
    "name": "CASTEBRUNET 2",
    "postcode": "82300",
    "city": "Caussade",
    "address": "82300 Caussade",
    "lat": 44.12374,
    "lng": 1.564486,
    "spv": "SPV A",
    "rent": 3000,
    "substation": {
      "name": "LERE",
      "code": "LERE ",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 5.7,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 8.9,
      "resteAffecterMw": 0,
      "fileAttenteMw": 24.5,
      "lat": 44.164979009979355,
      "lng": 1.5224595863683899
    }
  },
  {
    "id": "site_27",
    "name": "CASTEBRUNET 3",
    "postcode": "82300",
    "city": "Monteils",
    "address": "82300 Monteils",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.172643,
    "lng": 1.566018,
    "substation": {
      "name": "LERE",
      "code": "LERE ",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 3.6,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 8.9,
      "resteAffecterMw": 0,
      "fileAttenteMw": 24.5,
      "lat": 44.164979009979355,
      "lng": 1.5224595863683899
    }
  },
  {
    "id": "site_28",
    "name": "CHAUFFAILLE",
    "postcode": "19210",
    "city": "Ségur-le-Château",
    "address": "19210 Ségur-le-Château",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.44336,
    "lng": 1.326375,
    "substation": {
      "name": "LUBERSAC",
      "code": "LUBER",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 6.9,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 8.3,
      "resteAffecterMw": 0,
      "fileAttenteMw": 21,
      "lat": 45.422266799366184,
      "lng": 1.4090700157544982
    }
  },
  {
    "id": "site_29",
    "name": "DAVID",
    "postcode": "19350",
    "city": "Concèze",
    "address": "19350 Concèze",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 45.363896,
    "lng": 1.3365,
    "substation": {
      "name": "LUBERSAC",
      "code": "LUBER",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 8.6,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 8.3,
      "resteAffecterMw": 0,
      "fileAttenteMw": 21,
      "lat": 45.422266799366184,
      "lng": 1.4090700157544982
    }
  },
  {
    "id": "site_30",
    "name": "REGNIER",
    "postcode": "82150",
    "city": "Montaigu-de-Quercy",
    "address": "82150 Montaigu-de-Quercy",
    "spv": "SPV A",
    "rent": 3000,
    "lat": 44.345573,
    "lng": 1.031583,
    "substation": {
      "name": "LAUZERTE",
      "code": "LAUZE",
      "voltageLevel": "HTA / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 9.9,
      "quotePartS3renr": "84.13  k€/MW",
      "capaciteReserveeMw": 4.9,
      "resteAffecterMw": 7.6,
      "fileAttenteMw": 15.5,
      "lat": 44.274986238835574,
      "lng": 1.1081831848733814
    }
  },
  {
    "id": "site_31",
    "name": "PAILLOT",
    "postcode": "87600",
    "city": "Rochechouart",
    "address": "87600 Rochechouart",
    "lat": 45.847811,
    "lng": 0.852996,
    "spv": "SPV B",
    "rent": 3000,
    "substation": {
      "name": "PLAUD",
      "code": "PLAUD",
      "voltageLevel": "63 / 20 kV",
      "gestionnaire": "Enedis",
      "distanceKm": 6.6,
      "quotePartS3renr": "92.73  k€/MW",
      "capaciteReserveeMw": 0,
      "resteAffecterMw": 0,
      "fileAttenteMw": 0,
      "lat": 45.90683241469936,
      "lng": 0.8540641925712604
    }
  }
];

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
 * Extrait la valeur de portefeuille BESS d'un projet CRM à travers tous les champs possibles
 */
export function getProjectBessPortfolio(p) {
  if (!p) return '';
  const direct = p.bess_portfolio || 
                 p.portfolio_bess || 
                 p.bessPortfolio || 
                 p.portefeuille_bess || 
                 p.data?.bess_portfolio || 
                 p.data?.portefeuille_bess || 
                 p.data?.bessPortfolio || 
                 p.bp_bess_data?.portfolio || 
                 p.bp_bess_data?.bess_portfolio || 
                 p.bpAcamaState?.bess_portfolio || 
                 p.customFields?.bess_portfolio || 
                 p.portfolio ||
                 '';
  const val = String(direct).trim();
  const norm = normalizePortfolioName(val);
  if (norm === 'AUCUN' || norm === 'NON AFFECTE' || norm === 'AUCUN / NON' || norm === 'NONE' || norm === 'NULL' || norm === 'UNDEFINED' || norm === 'NON') {
    return '';
  }

  // Exclusion explicite DUPORT et LABEGUERIE du portefeuille BESS
  const pName = (p.name || '').toLowerCase();
  const pClient = (p.client_name || p.client || '').toLowerCase();
  if (pName.includes('duport') || pClient.includes('duport') || pName.includes('labeguerie') || pClient.includes('labeguerie')) {
    if (!val || norm === 'VOLTA') {
      return '';
    }
  }

  if (p.isBatteryStandAlone === 'Non' || p.isBatteryStandAlone === false) {
    if (!val) return '';
  }
  if (val) return val;

  // Si le projet est marqué comme Batterie SA / Stand-alone
  if (p.isBatteryStandAlone === 'Oui' || 
      p.type === 'Batterie SA' || 
      (p.type_projet || '').toLowerCase().includes('batterie') ||
      (p.type || '').toLowerCase().includes('batterie') ||
      (p.projectSize || '').toLowerCase().includes('batterie') ||
      (p.projet || '').toLowerCase().includes('batterie')) {
    return (p.spv === 'SPV B' ? 'TESLA' : 'VOLTA');
  }

  return '';
}

/**
 * Construit la liste harmonisée des centrales appartenant au portefeuille BESS (VOLTA, TESLA ou ALL).
 * RÈGLE STRICTE :
 * - Les projets dont la fiche comporte le portefeuille BESS sélectionné apparaissent dans la liste.
 * - Tout dossier abandonné (statut 'Abandonné') est STRICTEMENT exclu de tous les portefeuilles.
 * - Les dossiers DUPORT et LABEGUERIE ne doivent pas apparaître dans le portefeuille VOLTA.
 * - Aucun doublon n'est toléré.
 *
 * @param {Array} projects Liste des projets CRM (tenant actif)
 * @param {string} portfolioFilter 'ALL' | 'VOLTA' | 'TESLA' | 'LOUXOR' etc.
 * @returns {Array} Liste des sites BESS enrichis
 */
export function getBessPortfolioSites(projects = [], portfolioFilter = 'ALL') {
  const normTarget = normalizePortfolioName(portfolioFilter || 'ALL');

  // Helper de normalisation sans accents pour comparaison robuste
  const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  const isAbandoned = (p) => {
    if (!p) return false;
    const s = (p.status || p.statut || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    return s === 'abandonne' || s.includes('abandon') || s.includes('annul') || s.includes('perdu') || s.includes('refus');
  };

  // Récupération des projets sans polluer avec les caches d'autres tenants
  let effectiveProjects = [];
  if (Array.isArray(projects) && projects.length > 0) {
    effectiveProjects = projects;
  } else if (typeof window !== 'undefined') {
    try {
      const activeTenant = localStorage.getItem('nelson:active_tenant_id') || 'enr-courtage-energie';
      const stored = localStorage.getItem(`nelson:projects:${activeTenant}:v1`) || localStorage.getItem('nelson:projects:v1');
      if (stored) {
        effectiveProjects = JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
  }

  const resultSites = [];

  // Helper pour trouver un site mock de référence (pour enrichir les propriétés techniques/réseau si besoin)
  const findMatchingMockSite = (p) => {
    const pName = normalize(p.name);
    const pClient = normalize(p.client_name || p.client || `${p.firstName || ''} ${p.name || ''}`);
    const pCity = normalize(p.city || p.commune);

    return BESS_PORTFOLIO_SITES.find(site => {
      if (p.id && site.id && (p.id === site.id || p.id === `site_${site.id}`)) return true;
      const sName = normalize(site.name);
      const sClient = normalize(site.client);
      const sCity = normalize(site.city || site.commune);

      if (pName && sName && (sName === pName || sName.includes(pName) || pName.includes(sName))) return true;
      if (pClient && sName && (sName.includes(pClient) || pClient.includes(sName))) return true;
      if (pCity && sCity && pCity === sCity && pName && (sName.includes(pName) || sClient.includes(pName))) return true;
      return false;
    });
  };

  // 1. SI des projets CRM sont disponibles (cas nominal de l'application)
  if (effectiveProjects.length > 0) {
    const seenKeys = new Set();

    effectiveProjects.forEach((p, idx) => {
      if (!p || isAbandoned(p)) return;

      const pNameNorm = normalize(p.name || '');
      const pClientNorm = normalize(p.client_name || p.client || `${p.firstName || ''} ${p.name || ''}`);
      const pCityNorm = normalize(p.city || p.commune || '');

      // Exclusion explicite DUPORT et LABEGUERIE
      if (pNameNorm.includes('duport') || pClientNorm.includes('duport') || 
          pNameNorm.includes('labeguerie') || pClientNorm.includes('labeguerie')) {
        return;
      }

      const pPort = getProjectBessPortfolio(p);
      if (!pPort) return;

      const normPort = normalizePortfolioName(pPort);
      if (normTarget !== 'ALL' && normTarget !== 'TOUS' && normPort !== normTarget) {
        return;
      }

      // Clé d'unicité stricte pour éliminer TOUT doublon (par ID ou par combinaison Nom/Client + Ville)
      const nameKey = pNameNorm || pClientNorm;
      const dedupeKey = `${nameKey}__${pCityNorm}`;
      if (p.id && seenKeys.has(`id_${p.id}`)) return;
      if (dedupeKey && dedupeKey !== '__' && seenKeys.has(dedupeKey)) return;

      if (p.id) seenKeys.add(`id_${p.id}`);
      if (dedupeKey && dedupeKey !== '__') seenKeys.add(dedupeKey);

      const mock = findMatchingMockSite(p);
      const pId = p.id || mock?.id || `crm_bess_${idx + 1}`;
      const rawClient = [p.firstName, p.name].filter(Boolean).join(' ') || p.client_name || p.client || mock?.client || 'Client';
      const clientName = rawClient
        .replace(/\b([A-Za-zÀ-ÿ]+)\s+[0-9]+\s+([A-Za-zÀ-ÿ]+)\b/g, '$1 $2')
        .replace(/\s+[0-9]+$/g, '')
        .trim();

      const cp = p.zip || p.postcode || p.cp || mock?.postcode || '';
      const city = p.city || p.commune || mock?.city || '';
      const dept = cp ? cp.substring(0, 2) : (mock?.dept || 'FR');

      // Extraction robuste des coordonnées GPS
      let lat = null;
      let lng = null;
      if (p.gps && typeof p.gps === 'string' && p.gps.includes(',')) {
        const parts = p.gps.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(parts[0]) && !isNaN(parts[1]) && (parts[0] !== 0 || parts[1] !== 0)) {
          lat = parts[0];
          lng = parts[1];
        }
      }
      if (lat === null && p.lat !== undefined && !isNaN(parseFloat(p.lat)) && parseFloat(p.lat) !== 45.0) lat = parseFloat(p.lat);
      if (lat === null && p.latitude !== undefined && !isNaN(parseFloat(p.latitude))) lat = parseFloat(p.latitude);
      if (lng === null && p.lng !== undefined && !isNaN(parseFloat(p.lng)) && (parseFloat(p.lng) !== 1.0 || lat !== 45.0)) lng = parseFloat(p.lng);
      if (lng === null && p.longitude !== undefined && !isNaN(parseFloat(p.longitude))) lng = parseFloat(p.longitude);

      if (lat === null && mock?.lat !== undefined) lat = parseFloat(mock.lat);
      if (lng === null && mock?.lng !== undefined) lng = parseFloat(mock.lng);

      const odre = findBessOdreData(p.name, city, p.address, lat, lng);
      if ((lat === null || isNaN(lat) || (lat === 45.0 && lng === 1.0)) && odre?.latitude && odre?.longitude) {
        lat = parseFloat(odre.latitude);
        lng = parseFloat(odre.longitude);
      }

      if (lat === null || isNaN(lat)) lat = 45.0;
      if (lng === null || isNaN(lng)) lng = 1.0;

      const distKm = Number(odre?.distanceKm || p.distance_raccordement_km || p.distancePoste || p.substation?.distanceKm || mock?.substation?.distanceKm || 5.0);

      const substation = (typeof p.substation === 'object' && p.substation?.name) ? p.substation : {
        name: odre?.posteSourceEnedis || p.poste_source || p.substationName || mock?.substation?.name || "ODRE",
        code: odre?.codePoste || p.code_poste || mock?.substation?.code || "ODRE",
        voltageLevel: odre?.tension || mock?.substation?.voltageLevel || "HTA / 20 kV",
        gestionnaire: "Enedis",
        distanceKm: distKm,
        quotePartS3renr: odre?.quotePartS3REnR || mock?.substation?.quotePartS3renr || "92.73  k€/MW",
        quotePartS3renrEur: odre?.quotePartS3renrEur || mock?.substation?.quotePartS3renrEur || 92730,
        capaciteReserveeMw: odre?.capaciteReserveeMw || mock?.substation?.capaciteReserveeMw || 0,
        resteAffecterMw: odre?.capaciteResiduelleOdreMw ?? mock?.substation?.resteAffecterMw ?? 0,
        fileAttenteMw: 0,
        statutRaccordement: odre?.statutRaccordement || mock?.substation?.statutRaccordement || "Zone standard Enedis",
        typologieZoneCre: odre?.typologieZoneCre || mock?.substation?.typologieZoneCre || "Zone standard Enedis"
      };

      resultSites.push({
        ...(mock || {}),
        id: pId,
        name: p.name || mock?.name || `Projet BESS ${idx + 1}`,
        client: clientName,
        postcode: cp,
        cp,
        city,
        dept,
        address: p.address || `${cp} ${city}`.trim() || mock?.address || '',
        spv: p.spv || mock?.spv || (normPort === 'TESLA' ? 'SPV B' : 'SPV A'),
        rent: Number(p.rent || p.loyer_annuel || p.loyer || mock?.rent || 3000),
        lat,
        lng,
        gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        substation,
        portfolio: pPort,
        bess_portfolio: pPort,
        crmProject: p
      });
    });

    return resultSites;
  }

  // 2. SI AUCUN PROJET CRM N'EST DISPONIBLE : Fallback sur BESS_PORTFOLIO_SITES (données démo)
  BESS_PORTFOLIO_SITES.forEach((site) => {
    let port = site.bess_portfolio || (site.spv === 'SPV B' ? 'TESLA' : 'VOLTA');
    const normPort = normalizePortfolioName(port);
    if (normTarget !== 'ALL' && normTarget !== 'TOUS' && normPort !== normTarget) {
      return;
    }
    resultSites.push({
      ...site,
      portfolio: port,
      bess_portfolio: port,
      crmProject: null
    });
  });

  return resultSites;
}

