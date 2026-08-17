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
      { id: 1, power: 7.4, price: 2600, target: 'Hôtels, restaurants, TPE', position: 'Entrée de gamme' },
      { id: 2, power: 11, price: 2960, target: 'PME, bureaux, commerces', position: 'Standard triphasé' },
      { id: 3, power: 22, price: 2960, target: 'Hôtels, restaurants, flottes', position: 'Rapide AC' },
      { id: 4, power: 60, price: 21062, target: 'Parkings publics, aires, grands hôtels', position: 'Recharge rapide DC' },
      { id: 5, power: 120, price: 39365, target: 'Autoroutes, grands complexes', position: 'Ultra-rapide DC' },
    ],
    defaultInstallFeePerPoint: 1000,
    defaultMarginPerRecharge: 4.0,
    defaultSalePriceKwh: 0.40,
    defaultElectricityCostKwh: 0.20,
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

  // 2. Autoconsommation Solaire
  autoconsommation: {
    pricePerKwcGrid: [
      { kwc: 3, pricePerKwc: 2.30, totalPriceHT: 6900, defaultAutoconsoRate: 85 },
      { kwc: 6, pricePerKwc: 1.80, totalPriceHT: 10800, defaultAutoconsoRate: 65 },
      { kwc: 9, pricePerKwc: 1.50, totalPriceHT: 13500, defaultAutoconsoRate: 55 },
      { kwc: 15, pricePerKwc: 1.30, totalPriceHT: 19500, defaultAutoconsoRate: 50 },
      { kwc: 22, pricePerKwc: 1.15, totalPriceHT: 25300, defaultAutoconsoRate: 45 },
      { kwc: 36, pricePerKwc: 0.98, totalPriceHT: 35280, defaultAutoconsoRate: 40 },
    ],
    defaultValorisationAutoconso: 0.26,
    defaultValorisationSurplus: 0.13,
    defaultElectricityInflation: 3.5,
    defaultNationalYield: 1250,
    orientationCoefficients: {
      south: { label: 'Plein Sud (180°)', coeff: 1.00 },
      south_east: { label: 'Sud-Est (135°)', coeff: 0.95 },
      south_west: { label: 'Sud-Ouest (225°)', coeff: 0.95 },
      east: { label: 'Est (90°)', coeff: 0.85 },
      west: { label: 'Ouest (270°)', coeff: 0.85 },
      north: { label: 'Nord / Nord-Est / Nord-Ouest', coeff: 0.75 }
    },
    inclinationCoefficients: {
      deg30: { label: '30° (Optimal standard)', coeff: 1.00 },
      deg15: { label: '15° (Pente faible)', coeff: 0.96 },
      deg45: { label: '45° (Pente forte)', coeff: 0.96 },
      deg0: { label: '0° (Toit plat terrasse)', coeff: 0.90 },
      deg60: { label: '>45° (Forte inclinaison)', coeff: 0.90 }
    }
  },

  // 3. Toiture Photovoltaïque
  toiturePv: {
    tarifsAchatEdfOa: [
      { maxKwc: 36, label: 'Inférieur à 36 kWc', tarifAchatKwh: 0.1312, primeInjectionKwh: 0.04 },
      { maxKwc: 100, label: '36 kWc à 100 kWc', tarifAchatKwh: 0.1141, primeInjectionKwh: 0.03 },
      { maxKwc: 500, label: '100 kWc à 500 kWc', tarifAchatKwh: 0.1085, primeInjectionKwh: 0.02 },
    ],
    surfaceToPowerRatio: 5.0,
    installationCostPerKwc: 950,
    raccordementCostBase: 12000,
    turpeAnnualPerKwc: 12.0,
    maintenanceAnnualPerKwc: 10.0,
    loyerAnnuelM2Toiture: 5.5,
    soulteM2Toiture: 45.0,
  },

  // 4. Structure Métallique & Gamme ECO-EVO
  structure: {
    charpenteCostM2: 75.0,
    couvertureBacAcierM2: 28.0,
    fondationsCostM2: 25.0,
    pvIntegrationPerWc: 0.55,
    raccordementStandard: 15000,
    fraisDeveloppement: 5000,
    defaultEaveHeight: 4.5,
    defaultRoofPitch: 10,
    ecoEvoCatalog: DEFAULT_ECO_EVO_CATALOG
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

      updateEcoEvoItem: (id, updatedItem) => set((state) => {
        const catalog = state.settings.structure.ecoEvoCatalog || DEFAULT_ECO_EVO_CATALOG;
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
        const grid = get().settings.autoconsommation.pricePerKwcGrid || [];
        const match = grid.find(g => g.kwc === kwc);
        if (match) return match.totalPriceHT;
        // Interpolation
        return Math.round(kwc * 1500);
      },

      getDefaultAutoconsoRate: (kwc) => {
        const grid = get().settings.autoconsommation.pricePerKwcGrid || [];
        const match = grid.find(g => g.kwc === kwc);
        if (match) return match.defaultAutoconsoRate;
        return 60;
      }
    }),
    {
      name: 'nelson_simulator_database_v3',
    }
  )
);
