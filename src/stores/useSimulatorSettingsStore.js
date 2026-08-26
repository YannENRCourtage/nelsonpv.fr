import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Données solaires régionales en France (kWh / kWc / an) ──────────────────
export const REGIONAL_SOLAR_PRODUCTION = {
  // Zone 1 : Sud, PACA, Corse, Occitanie Sud (1350 - 1450 kWh/kWc/an)
  zone1: {
    label: 'Zone Sud / Méditerranée (PACA, Corse, Occitanie Sud)',
    baseProd: 1400,
    departments: ['04', '05', '06', '13', '83', '84', '2A', '2B', '66', '11', '34', '30']
  },
  // Zone 2 : Sud-Ouest, Nouvelle-Aquitaine, Auvergne Sud, Occitanie Nord (1200 - 1300 kWh/kWc/an)
  zone2: {
    label: 'Zone Sud-Ouest / Centre-Sud (Nouvelle-Aquitaine, Occitanie Nord)',
    baseProd: 1250,
    departments: ['33', '40', '64', '47', '24', '32', '31', '81', '82', '09', '65', '12', '46', '19', '87', '23', '16', '17', '79', '86', '07', '26', '38', '73', '74', '15', '43', '63', '48']
  },
  // Zone 3 : Centre, Pays de la Loire, Poitou, Bourgogne, Alsace (1100 - 1200 kWh/kWc/an)
  zone3: {
    label: 'Zone Ouest / Centre / Est (Pays de la Loire, Centre-Val de Loire, Bourgogne)',
    baseProd: 1150,
    departments: ['44', '49', '53', '72', '85', '37', '41', '45', '18', '28', '36', '21', '71', '58', '89', '25', '39', '70', '90', '67', '68']
  },
  // Zone 4 : Nord, Île-de-France, Normandie, Bretagne, Grand-Est, Hauts-de-France (950 - 1100 kWh/kWc/an)
  zone4: {
    label: 'Zone Nord / Île-de-France / Normandie / Bretagne',
    baseProd: 1050,
    departments: ['75', '77', '78', '91', '92', '93', '94', '95', '14', '50', '61', '27', '76', '22', '29', '35', '56', '59', '62', '02', '60', '80', '08', '10', '51', '52', '54', '55', '57', '88']
  }
};

export const getProductionForDepartment = (deptCode) => {
  if (!deptCode) return 1250;
  const cleanCode = String(deptCode).padStart(2, '0').substring(0, 2);
  for (const key of Object.keys(REGIONAL_SOLAR_PRODUCTION)) {
    const zone = REGIONAL_SOLAR_PRODUCTION[key];
    if (zone.departments.includes(cleanCode)) {
      return zone.baseProd;
    }
  }
  return 1250;
};

// ─── Catalogue Gamme ECO & EVO Bâtiments Standards ───────────────────────────
export const DEFAULT_ECO_EVO_CATALOG = [
  { id: 'eco_12x18', gamme: 'ECO', name: 'ECO 12×18 (216 m²)', length: 18, width: 12, eaveHeight: 4.5, roofPitch: 10, kwc: 36, charpentePrice: 17280, couverturePrice: 6480, fondationsPrice: 5400, pvPrice: 19800, soulte: 6480, resteACharge: 22680 },
  { id: 'eco_15x24', gamme: 'ECO', name: 'ECO 15×24 (360 m²)', length: 24, width: 15, eaveHeight: 5.0, roofPitch: 10, kwc: 60, charpentePrice: 27000, couverturePrice: 10800, fondationsPrice: 9000, pvPrice: 33000, soulte: 10800, resteACharge: 36000 },
  { id: 'eco_18x30', gamme: 'ECO', name: 'ECO 18×30 (540 m²)', length: 30, width: 18, eaveHeight: 5.0, roofPitch: 10, kwc: 100, charpentePrice: 40500, couverturePrice: 16200, fondationsPrice: 13500, pvPrice: 55000, soulte: 18000, resteACharge: 52200 },
  { id: 'eco_20x36', gamme: 'ECO', name: 'ECO 20×36 (720 m²)', length: 36, width: 20, eaveHeight: 5.5, roofPitch: 10, kwc: 140, charpentePrice: 54000, couverturePrice: 21600, fondationsPrice: 18000, pvPrice: 77000, soulte: 25200, resteACharge: 68400 },
  { id: 'eco_24x42', gamme: 'ECO', name: 'ECO 24×42 (1008 m²)', length: 42, width: 24, eaveHeight: 6.0, roofPitch: 10, kwc: 200, charpentePrice: 75600, couverturePrice: 30240, fondationsPrice: 25200, pvPrice: 110000, soulte: 36000, resteACharge: 95040 },
  { id: 'evo_15x30', gamme: 'EVO', name: 'EVO 15×30 (450 m²)', length: 30, width: 15, eaveHeight: 5.0, roofPitch: 15, kwc: 85, charpentePrice: 36000, couverturePrice: 13950, fondationsPrice: 11250, pvPrice: 46750, soulte: 15300, resteACharge: 45900 },
  { id: 'evo_18x36', gamme: 'EVO', name: 'EVO 18×36 (648 m²)', length: 36, width: 18, eaveHeight: 5.5, roofPitch: 15, kwc: 125, charpentePrice: 51840, couverturePrice: 20088, fondationsPrice: 16200, pvPrice: 68750, soulte: 22500, resteACharge: 65628 },
  { id: 'evo_20x42', gamme: 'EVO', name: 'EVO 20×42 (840 m²)', length: 42, width: 20, eaveHeight: 6.0, roofPitch: 15, kwc: 165, charpentePrice: 67200, couverturePrice: 26040, fondationsPrice: 21000, pvPrice: 90750, soulte: 29700, resteACharge: 84540 },
  { id: 'evo_24x48', gamme: 'EVO', name: 'EVO 24×48 (1152 m²)', length: 48, width: 24, eaveHeight: 6.0, roofPitch: 15, kwc: 230, charpentePrice: 92160, couverturePrice: 35712, fondationsPrice: 28800, pvPrice: 126500, soulte: 41400, resteACharge: 115272 }
];

// ─── Valeurs par défaut pour la Base de Données ──────────────────────────────
export const DEFAULT_DATABASE_SETTINGS = {
  // 1. Borne IRVE
  irve: {
    products: [
      { id: 'prod_7', power: 7.4, price: 2600, target: 'Hôtels, restaurants, TPE', position: 'Entrée de gamme' },
      { id: 'prod_11', power: 11.0, price: 2960, target: 'PME, bureaux, commerces', position: 'Standard triphasé' },
      { id: 'prod_22', power: 22.0, price: 2960, target: 'Hôtels, restaurants, flottes', position: 'Rapide AC' },
      { id: 'prod_60', power: 60.0, price: 21062, target: 'Parkings publics, aires, grands hôtels', position: 'Recharge rapide DC' },
      { id: 'prod_120', power: 120.0, price: 39365, target: 'Autoroutes, grands complexes', position: 'Ultra-rapide DC' },
    ],
    defaultInstallFeePerPoint: 1000,
    defaultMarginPerRecharge: 4.000,
    defaultSalePriceKwh: 0.400,
    defaultElectricityCostKwh: 0.200,
    financeInterestRate: 8.0,
    defaultFinanceYears: 5,
    defaultMaintenanceAnnual: 200,
    defaultInflationRate: 2.0,
    typologies: {
      personnalise: { label: 'Personnalisé', estimate: 205 },
      tpe: { label: 'TPE / Bureaux', estimate: 30 },
      copro: { label: 'Copropriété', estimate: 60 },
      restaurant: { label: 'Restaurant', estimate: 150 },
      hotel: { label: 'Hôtel', estimate: 300 },
      parking: { label: 'Parking public', estimate: 500 },
      flotte: { label: 'Flotte entreprise', estimate: 100 },
    },
    subventions: {
      Copro: { rate: 0.5, cap: 1660, label: 'Copropriété (Advenir / CEE)' },
      PL: { rate: 0.5, cap: 15000, label: 'Poids Lourds' },
      Voirie: { rate: 0.3, cap: 9000, label: 'Voirie publique' },
      Salariés: { rate: 0.2, cap: 600, label: 'Flotte / Salariés' },
      NonEligible: { rate: 0, cap: 0, label: 'Non éligible' },
    }
  },

  // 2. Autoconsommation Solaire (Tranches de puissance dynamiques avec tarifs ENR-Courtage)
  autoconsommation: {
    priceTiers: [
      { id: 'tier_0_3', minKwc: 0, maxKwc: 3, label: '0 à 3 kWc', pricePerWc: 2.300, defaultAutoconsoRate: 85 },
      { id: 'tier_3_6', minKwc: 3, maxKwc: 6, label: '3 à 6 kWc', pricePerWc: 1.800, defaultAutoconsoRate: 65 },
      { id: 'tier_6_9', minKwc: 6, maxKwc: 9, label: '6 à 9 kWc', pricePerWc: 1.500, defaultAutoconsoRate: 55 },
      { id: 'tier_9_15', minKwc: 9, maxKwc: 15, label: '9 à 15 kWc', pricePerWc: 1.300, defaultAutoconsoRate: 50 },
      { id: 'tier_15_22', minKwc: 15, maxKwc: 22, label: '15 à 22 kWc', pricePerWc: 1.150, defaultAutoconsoRate: 45 },
      { id: 'tier_22_36', minKwc: 22, maxKwc: 36, label: '22 à 36 kWc', pricePerWc: 0.980, defaultAutoconsoRate: 40 },
      { id: 'tier_36_100', minKwc: 36, maxKwc: 100, label: '36 à 100 kWc', pricePerWc: 0.920, defaultAutoconsoRate: 35 },
    ],
    defaultValorisationAutoconso: 0.260,
    defaultValorisationSurplus: 0.130,
    defaultElectricityInflation: 3.5,
    defaultNationalYield: 1250,
    orientationCoefficients: {
      south: { label: 'Plein Sud (0°)', coeff: 1.000 },
      south_east: { label: 'Sud-Est (-45°)', coeff: 0.950 },
      south_west: { label: 'Sud-Ouest (+45°)', coeff: 0.950 },
      east: { label: 'Plein Est (-90°)', coeff: 0.850 },
      west: { label: 'Plein Ouest (+90°)', coeff: 0.850 },
      north: { label: 'Plein Nord (180°)', coeff: 0.750 }
    },
    inclinationCoefficients: {
      deg30: { label: '30° (Optimal standard)', coeff: 1.000 },
      deg15: { label: '15° (Pente faible)', coeff: 0.960 },
      deg45: { label: '45° (Pente forte)', coeff: 0.960 },
      deg0: { label: '0° (Toit plat terrasse)', coeff: 0.900 },
      deg60: { label: '>45° (Forte inclinaison)', coeff: 0.900 }
    }
  },

  // 3. Toiture Photovoltaïque (Tarifs EDF OA avec 3 chiffres après la virgule)
  toiturePv: {
    tarifsAchatEdfOa: [
      { id: 'edf_36', minKwc: 0, maxKwc: 36, label: '0 à 36 kWc', tarifAchatKwh: 0.131, primeInjectionKwh: 0.040 },
      { id: 'edf_100', minKwc: 36, maxKwc: 100, label: '36 à 100 kWc', tarifAchatKwh: 0.114, primeInjectionKwh: 0.030 },
      { id: 'edf_500', minKwc: 100, maxKwc: 500, label: '100 à 500 kWc', tarifAchatKwh: 0.085, primeInjectionKwh: 0.020 },
    ],
    surfaceToPowerRatio: 5.0,
    installationCostPerKwc: 950.000,
    raccordementCostBase: 12000,
    turpeAnnualPerKwc: 12.000,
    maintenanceAnnualPerKwc: 10.000,
    loyerAnnuelM2Toiture: 5.500,
    soulteM2Toiture: 45.000,
  },

  // 4. Structure Métallique & Gamme ECO-EVO
  structure: {
    charpenteCostM2: 75.000,
    couvertureBacAcierM2: 28.000,
    fondationsCostM2: 25.000,
    pvIntegrationPerWc: 0.550,
    raccordementStandard: 15000,
    fraisDeveloppement: 5000,
    defaultEaveHeight: 4.5,
    defaultRoofPitch: 10,
    ecoEvoCatalog: DEFAULT_ECO_EVO_CATALOG
  },

  // 5. Séchoir Multi-Matières BatiTech® Cogen'Air®
  sechoir: {
    models: {
      'BT-3.1.15': {
        id: 'BT-3.1.15',
        name: 'BatiTech 3.1.15',
        puissanceKwc: 30.15,
        nbModules: 90,
        investissementBrut: 327053,
        zones: 1,
        dimensions: '18m × 20m',
        surfaceToiture: 360,
        chargesAnnuellesVentilation: 500,
        chargesAnnuellesFoin: 700,
        chargesAnnuellesMaintenance: 300,
      },
      'BT-6.2.15': {
        id: 'BT-6.2.15',
        name: 'BatiTech 6.2.15',
        puissanceKwc: 63.30,
        nbModules: 189,
        investissementBrut: 564986,
        zones: 2,
        dimensions: '36m × 20m',
        surfaceToiture: 720,
        chargesAnnuellesVentilation: 1500,
        chargesAnnuellesFoin: 2000,
        chargesAnnuellesMaintenance: 500,
      },
      'BT-8.3.15': {
        id: 'BT-8.3.15',
        name: 'BatiTech 8.3.15',
        puissanceKwc: 93.80,
        nbModules: 280,
        investissementBrut: 764501,
        zones: 3,
        dimensions: '48m × 20m',
        surfaceToiture: 960,
        chargesAnnuellesVentilation: 2200,
        chargesAnnuellesFoin: 3000,
        chargesAnnuellesMaintenance: 800,
      },
    },
    financialParams: {
      tauxEmprunt: 3.40,           // en % (3.40%)
      dureeEmprunt: 25,            // en années (25 ans)
      subventionPAE: 0,            // en € (affiché à titre indicatif)
      tauxActualisation: 3.40,     // en % (3.40%)
      inflationProduits: 2.00,     // en % (2.00%)
      dureeVieProjet: 20,          // en années (20 ans)
      fixationCostPerPanel: 101,   // en €/panneau
    },
    materials: [
      { id: 'fourrage_vrac', label: 'Fourrage vrac (Séchage en grange)', plusValueQualite: 55, economieEnergie: 10, unit: 't MS/an' },
      { id: 'bottes_carrees', label: 'Bottes carrées (Foin conditionné)', plusValueQualite: 50, economieEnergie: 10, unit: 't MS/an' },
      { id: 'cereales_ble', label: 'Céréales - Blé tendre', plusValueQualite: 10, economieEnergie: 12, unit: 't MS/an' },
      { id: 'cereales_mais', label: 'Céréales - Maïs grain', plusValueQualite: 35, economieEnergie: 25, unit: 't MS/an' },
      { id: 'plaquettes_bois', label: 'Plaquettes forestières (Bois énergie)', plusValueQualite: 8, economieEnergie: 18, unit: 't MS/an' },
    ],
  }
};

export const useSimulatorSettingsStore = create(
  persist(
    (set, get) => ({
      settings: DEFAULT_DATABASE_SETTINGS,

      // Mise à jour de section avec auto-save
      updateIrveSettings: (newIrve) => set((state) => ({
        settings: { ...state.settings, irve: { ...state.settings.irve, ...newIrve } }
      })),

      updateAutoconsoSettings: (newAuto) => set((state) => ({
        settings: { ...state.settings, autoconsommation: { ...state.settings.autoconsommation, ...newAuto } }
      })),

      updateToiturePvSettings: (newToiture) => set((state) => ({
        settings: { ...state.settings, toiturePv: { ...state.settings.toiturePv, ...newToiture } }
      })),

      updateStructureSettings: (newStruct) => set((state) => ({
        settings: { ...state.settings, structure: { ...state.settings.structure, ...newStruct } }
      })),

      updateSechoirSettings: (newSechoir) => set((state) => ({
        settings: { ...state.settings, sechoir: { ...(state.settings.sechoir || DEFAULT_DATABASE_SETTINGS.sechoir), ...newSechoir } }
      })),

      updateSechoirModel: (modelId, updatedFields) => set((state) => {
        const prevSechoir = state.settings.sechoir || DEFAULT_DATABASE_SETTINGS.sechoir;
        const prevModels = prevSechoir.models || DEFAULT_DATABASE_SETTINGS.sechoir.models;
        return {
          settings: {
            ...state.settings,
            sechoir: {
              ...prevSechoir,
              models: {
                ...prevModels,
                [modelId]: {
                  ...(prevModels[modelId] || {}),
                  ...updatedFields,
                }
              }
            }
          }
        };
      }),

      updateSechoirFinancial: (updatedFields) => set((state) => {
        const prevSechoir = state.settings.sechoir || DEFAULT_DATABASE_SETTINGS.sechoir;
        const prevFin = prevSechoir.financialParams || DEFAULT_DATABASE_SETTINGS.sechoir.financialParams;
        return {
          settings: {
            ...state.settings,
            sechoir: {
              ...prevSechoir,
              financialParams: {
                ...prevFin,
                ...updatedFields,
              }
            }
          }
        };
      }),

      updateSechoirMaterial: (matId, updatedFields) => set((state) => {
        const prevSechoir = state.settings.sechoir || DEFAULT_DATABASE_SETTINGS.sechoir;
        const prevMats = prevSechoir.materials || DEFAULT_DATABASE_SETTINGS.sechoir.materials;
        const newMats = prevMats.map(m => m.id === matId ? { ...m, ...updatedFields } : m);
        return {
          settings: {
            ...state.settings,
            sechoir: {
              ...prevSechoir,
              materials: newMats,
            }
          }
        };
      }),

      // ─── Actions CRUD Autoconsommation Tiers ───
      addAutoconsoTier: (tier) => set((state) => {
        const tiers = state.settings.autoconsommation?.priceTiers || DEFAULT_DATABASE_SETTINGS.autoconsommation.priceTiers;
        const newTier = {
          id: `tier_${Date.now()}`,
          minKwc: tier?.minKwc || 0,
          maxKwc: tier?.maxKwc || 10,
          label: tier?.label || `${tier?.minKwc || 0} à ${tier?.maxKwc || 10} kWc`,
          pricePerWc: tier?.pricePerWc || 1.500,
          defaultAutoconsoRate: tier?.defaultAutoconsoRate || 50,
        };
        return {
          settings: {
            ...state.settings,
            autoconsommation: {
              ...state.settings.autoconsommation,
              priceTiers: [...tiers, newTier]
            }
          }
        };
      }),

      updateAutoconsoTier: (id, updatedFields) => set((state) => {
        const tiers = state.settings.autoconsommation?.priceTiers || DEFAULT_DATABASE_SETTINGS.autoconsommation.priceTiers;
        const newTiers = tiers.map(t => t.id === id ? { ...t, ...updatedFields } : t);
        return {
          settings: {
            ...state.settings,
            autoconsommation: {
              ...state.settings.autoconsommation,
              priceTiers: newTiers
            }
          }
        };
      }),

      deleteAutoconsoTier: (id) => set((state) => {
        const tiers = state.settings.autoconsommation?.priceTiers || DEFAULT_DATABASE_SETTINGS.autoconsommation.priceTiers;
        return {
          settings: {
            ...state.settings,
            autoconsommation: {
              ...state.settings.autoconsommation,
              priceTiers: tiers.filter(t => t.id !== id)
            }
          }
        };
      }),

      // ─── Actions CRUD Toiture PV Tarifs OA ───
      addToitureTarifOa: (tarif) => set((state) => {
        const tarifs = state.settings.toiturePv?.tarifsAchatEdfOa || DEFAULT_DATABASE_SETTINGS.toiturePv.tarifsAchatEdfOa;
        const newTarif = {
          id: `oa_${Date.now()}`,
          minKwc: tarif?.minKwc || 0,
          maxKwc: tarif?.maxKwc || 100,
          label: tarif?.label || `${tarif?.minKwc || 0} à ${tarif?.maxKwc || 100} kWc`,
          tarifAchatKwh: tarif?.tarifAchatKwh || 0.114,
          primeInjectionKwh: tarif?.primeInjectionKwh || 0.030,
        };
        return {
          settings: {
            ...state.settings,
            toiturePv: {
              ...state.settings.toiturePv,
              tarifsAchatEdfOa: [...tarifs, newTarif]
            }
          }
        };
      }),

      updateToitureTarifOa: (id, updatedFields) => set((state) => {
        const tarifs = state.settings.toiturePv?.tarifsAchatEdfOa || DEFAULT_DATABASE_SETTINGS.toiturePv.tarifsAchatEdfOa;
        return {
          settings: {
            ...state.settings,
            toiturePv: {
              ...state.settings.toiturePv,
              tarifsAchatEdfOa: tarifs.map(t => t.id === id ? { ...t, ...updatedFields } : t)
            }
          }
        };
      }),

      deleteToitureTarifOa: (id) => set((state) => {
        const tarifs = state.settings.toiturePv?.tarifsAchatEdfOa || DEFAULT_DATABASE_SETTINGS.toiturePv.tarifsAchatEdfOa;
        return {
          settings: {
            ...state.settings,
            toiturePv: {
              ...state.settings.toiturePv,
              tarifsAchatEdfOa: tarifs.filter(t => t.id !== id)
            }
          }
        };
      }),

      // ─── Actions CRUD IRVE Products ───
      addIrveProduct: (prod) => set((state) => {
        const products = state.settings.irve?.products || DEFAULT_DATABASE_SETTINGS.irve.products;
        const newProd = {
          id: `prod_${Date.now()}`,
          power: prod?.power || 22.0,
          price: prod?.price || 3000,
          target: prod?.target || 'Bureaux, commerces',
          position: prod?.position || 'Standard'
        };
        return {
          settings: {
            ...state.settings,
            irve: {
              ...state.settings.irve,
              products: [...products, newProd]
            }
          }
        };
      }),

      updateIrveProduct: (id, updatedFields) => set((state) => {
        const products = state.settings.irve?.products || DEFAULT_DATABASE_SETTINGS.irve.products;
        return {
          settings: {
            ...state.settings,
            irve: {
              ...state.settings.irve,
              products: products.map(p => p.id === id ? { ...p, ...updatedFields } : p)
            }
          }
        };
      }),

      deleteIrveProduct: (id) => set((state) => {
        const products = state.settings.irve?.products || DEFAULT_DATABASE_SETTINGS.irve.products;
        return {
          settings: {
            ...state.settings,
            irve: {
              ...state.settings.irve,
              products: products.filter(p => p.id !== id)
            }
          }
        };
      }),

      // ─── Actions CRUD ECO & EVO ───
      addEcoEvoItem: (item) => set((state) => {
        const catalog = state.settings.structure?.ecoEvoCatalog || DEFAULT_ECO_EVO_CATALOG;
        const newItem = {
          id: `eco_${Date.now()}`,
          gamme: item?.gamme || 'ECO',
          name: item?.name || 'Nouveau Hangar Standard',
          length: item?.length || 30,
          width: item?.width || 15,
          eaveHeight: item?.eaveHeight || 5.0,
          roofPitch: item?.roofPitch || 10,
          kwc: item?.kwc || 80,
          charpentePrice: item?.charpentePrice || 35000,
          couverturePrice: item?.couverturePrice || 14000,
          fondationsPrice: item?.fondationsPrice || 11000,
          pvPrice: item?.pvPrice || 44000,
          soulte: item?.soulte || 14000,
          resteACharge: item?.resteACharge || 46000
        };
        return {
          settings: {
            ...state.settings,
            structure: {
              ...state.settings.structure,
              ecoEvoCatalog: [...catalog, newItem]
            }
          }
        };
      }),

      updateEcoEvoItem: (id, updatedItem) => set((state) => {
        const catalog = state.settings.structure?.ecoEvoCatalog || DEFAULT_ECO_EVO_CATALOG;
        const newCatalog = catalog.map(item => item.id === id ? { ...item, ...updatedItem } : item);
        return {
          settings: {
            ...state.settings,
            structure: {
              ...state.settings.structure,
              ecoEvoCatalog: newCatalog
            }
          }
        };
      }),

      deleteEcoEvoItem: (id) => set((state) => {
        const catalog = state.settings.structure?.ecoEvoCatalog || DEFAULT_ECO_EVO_CATALOG;
        return {
          settings: {
            ...state.settings,
            structure: {
              ...state.settings.structure,
              ecoEvoCatalog: catalog.filter(item => item.id !== id)
            }
          }
        };
      }),

      // Réinitialisation par défaut
      resetToDefaults: (section = null) => {
        if (!section) {
          set({ settings: DEFAULT_DATABASE_SETTINGS });
        } else {
          set((state) => ({
            settings: {
              ...state.settings,
              [section]: DEFAULT_DATABASE_SETTINGS[section]
            }
          }));
        }
      },

      // Getters pratiques
      getSolarPriceForKwc: (kwc) => {
        const tiers = get().settings.autoconsommation?.priceTiers || DEFAULT_DATABASE_SETTINGS.autoconsommation.priceTiers;
        const numKwc = Number(kwc) || 3;
        const match = tiers.find(t => numKwc > Number(t.minKwc || 0) && numKwc <= Number(t.maxKwc || 1000));
        if (match && match.pricePerWc) {
          return Math.round(numKwc * 1000 * Number(match.pricePerWc));
        }
        // Fallback standard
        if (numKwc <= 3) return Math.round(numKwc * 1000 * 2.300);
        if (numKwc <= 6) return Math.round(numKwc * 1000 * 1.800);
        if (numKwc <= 9) return Math.round(numKwc * 1000 * 1.500);
        if (numKwc <= 15) return Math.round(numKwc * 1000 * 1.300);
        if (numKwc <= 22) return Math.round(numKwc * 1000 * 1.150);
        if (numKwc <= 36) return Math.round(numKwc * 1000 * 0.980);
        return Math.round(numKwc * 1000 * 0.920);
      },

      getDefaultAutoconsoRate: (kwc) => {
        const tiers = get().settings.autoconsommation?.priceTiers || DEFAULT_DATABASE_SETTINGS.autoconsommation.priceTiers;
        const numKwc = Number(kwc) || 3;
        const match = tiers.find(t => numKwc > Number(t.minKwc || 0) && numKwc <= Number(t.maxKwc || 1000));
        if (match && match.defaultAutoconsoRate) return Number(match.defaultAutoconsoRate);
        if (numKwc <= 3) return 85;
        if (numKwc <= 6) return 65;
        if (numKwc <= 9) return 55;
        if (numKwc <= 15) return 50;
        if (numKwc <= 22) return 45;
        if (numKwc <= 36) return 40;
        return 35;
      }
    }),
    {
      name: 'nelson_simulator_database_v6',
    }
  )
);
