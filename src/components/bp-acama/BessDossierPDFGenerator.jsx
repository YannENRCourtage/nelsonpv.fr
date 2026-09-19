import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  FileDown,
  Loader2,
  Zap,
  BatteryCharging,
  TrendingUp,
  ShieldCheck,
  Layers,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Activity,
  Printer,
  X,
  Compass,
  Maximize2
} from 'lucide-react';
import { BESS_PORTFOLIO_SITES } from '../../data/bessPortfolioData.js';

// Base de données consolidée des 31 sites BESS (15.5 MW / 32.36 MWh)
const SITES_DATABASE = [
  { id: 1, name: "PAILLOT", client: "PAILLOT Noël", address: "5 ZA des Plats", cp: "87600", city: "Rochechouart", dept: "87", gps: "45.847811, 0.852996", lat: 45.847811, lng: 0.852996, substation: "PLAUD", dist: "6.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 2, name: "BATIOT", client: "BATIOT Olivier", address: "72 Chemin du Campas", cp: "32220", city: "Mongausy", dept: "32", gps: "43.496370, 0.834241", lat: 43.496370, lng: 0.834241, substation: "SEMEZIES", dist: "5.9 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 3, name: "DOMERGUE MEUZAC", client: "DOMERGUE David", address: "1725 Route du Grand Pré", cp: "87380", city: "Meuzac", dept: "87", gps: "45.566247, 1.397687", lat: 45.566247, lng: 1.397687, substation: "LE REPAIRE", dist: "8.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 4, name: "CUBERTAFON", client: "CUBERTAFON René", address: "8 Route de la Barrière", cp: "19210", city: "Saint-Julien-le-Vendômois", dept: "19", gps: "45.460274, 1.298160", lat: 45.460274, lng: 1.298160, substation: "LUBERSAC", dist: "8.3 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 5, name: "PLANTE", client: "PLANTE Jean-Pierre", address: "581 Route Départementale 817", cp: "40300", city: "Port-de-Lanne", dept: "40", gps: "43.558940, -1.199501", lat: 43.558940, lng: -1.199501, substation: "GUICHE", dist: "4.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 6, name: "PRAVIE", client: "PRAVIE Clémence", address: "336 Chemin de Falieres", cp: "82170", city: "Grisolles", dept: "82", gps: "43.806232, 1.295833", lat: 43.806232, lng: 1.295833, substation: "LESQUIVE 2", dist: "2.3 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 7, name: "LATOURNERIE", client: "LATOURNERIE Franck", address: "467 Chemin des Terres Vieilles", cp: "24310", city: "Brantôme en Périgord", dept: "24", gps: "45.328888, 0.651040", lat: 45.328888, lng: 0.651040, substation: "BRANTOME", dist: "3.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 8, name: "DAVID", client: "DAVID Louis", address: "1053 route de saint-cyr les champagnes", cp: "19350", city: "Concèze", dept: "19", gps: "45.353329, 1.314195", lat: 45.353329, lng: 1.314195, substation: "LUBERSAC", dist: "8.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 9, name: "GRANGER", client: "GRANGER BRUNO", address: "3 Route des Forges", cp: "19210", city: "Saint-Éloy-les-Tuileries", dept: "19", gps: "45.442533, 1.267710", lat: 45.442533, lng: 1.267710, substation: "LUBERSAC", dist: "10.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 10, name: "CASTEBRUNET 2", client: "CASTEBRUNET 2 Jérémy", address: "763 Chemin de Calsos", cp: "82300", city: "Caussade", dept: "82", gps: "44.123740, 1.564486", lat: 44.123740, lng: 1.564486, substation: "LERE", dist: "5.7 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 11, name: "BERTRANDIE", client: "BERTRANDIE Sébastien", address: "301 Route de la Roche", cp: "24240", city: "Monestier", dept: "24", gps: "44.773569, 0.300107", lat: 44.773569, lng: 0.300107, substation: "STE-FOY-LA-GRANDE", dist: "9.0 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 12, name: "GIOT", client: "GIOT Joachim", address: "2 Le Cluzeau", cp: "23600", city: "Leyrat", dept: "23", gps: "46.360561, 2.306566", lat: 46.360561, lng: 2.306566, substation: "BOUSSAC", dist: "5.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 13, name: "ARBOIN", client: "ARBOIN Régis", address: "47 Chemin de piquemole", cp: "47120", city: "Duras", dept: "47", gps: "44.659496, 0.222735", lat: 44.659496, lng: 0.222735, substation: "LA SAUVETAT", dist: "11.8 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 14, name: "MISSAULT LACOUSSIÈRE", client: "MISSAULT David", address: "1348 Route des Bouleaux", cp: "24470", city: "Saint-Saud-Lacoussière", dept: "24", gps: "45.558769, 0.804488", lat: 45.558769, lng: 0.804488, substation: "NONTRON", dist: "13.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 15, name: "MEILLAT 1", client: "MEILLAT 1 Maxime", address: "1a La Ribiere", cp: "23210", city: "Mourioux-Vieilleville", dept: "23", gps: "46.082964, 1.638518", lat: 46.082964, lng: 1.638518, substation: "CHATELUS 2", dist: "5.4 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 16, name: "SOULIGNAC", client: "SOULIGNAC Thierry", address: "Route de Lombardie", cp: "33860", city: "Val-de-Livenne", dept: "33", gps: "45.264357, -0.550408", lat: 45.264357, lng: -0.550408, substation: "ETAULIERS", dist: "7.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 17, name: "CHAUFFAILLE", client: "CHAUFFAILLE Franck", address: "2 Route de Saint Yrieix", cp: "24270", city: "PAYZAC", dept: "24", gps: "45.436230, 1.288720", lat: 45.436230, lng: 1.288720, substation: "LUBERSAC", dist: "6.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 18, name: "CIROLI", client: "CIROLI", address: "66 Lieu Dit Pinasse", cp: "33890", city: "Juillac", dept: "33", gps: "44.809547, 0.037304", lat: 44.809547, lng: 0.037304, substation: "AURIOLLES", dist: "7.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 19, name: "BOURDETTES", client: "BOURDETTES Sandrine", address: "10 Route de la Bohème", cp: "65140", city: "Mansan", dept: "65", gps: "43.343730, 0.194628", lat: 43.343730, lng: 0.194628, substation: "VIC-EN-BIGORRE", dist: "10.8 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 20, name: "CASTEBRUNET 1", client: "CASTEBRUNET Jérémy", address: "1074 Chemin de Guillounet", cp: "82300", city: "Caussade", dept: "82", gps: "44.117157, 1.566758", lat: 44.117157, lng: 1.566758, substation: "LERE", dist: "5.5 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 21, name: "FRECHEVILLE", client: "FRECHEVILLE Mathieu", address: "45 Cluzelou-haut", cp: "47210", city: "SAINT EUTROPE DE BORN", dept: "47", gps: "44.588327, 0.665431", lat: 44.588327, lng: 0.665431, substation: "CANCON", dist: "7.2 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 22, name: "CASTEBRUNET 3", client: "CASTEBRUNET 3 Jérémy", address: "93 Chemin des Peyrières", cp: "82300", city: "Monteils", dept: "82", gps: "44.165754, 1.564963", lat: 44.165754, lng: 1.564963, substation: "LERE", dist: "3.6 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 23, name: "DOUMENS", client: "DOUMENS Morgan", address: "4 Route de Salleboeuf", cp: "33750", city: "Beychac-et-Caillau", dept: "33", gps: "44.870054, -0.397698", lat: 44.870054, lng: -0.397698, substation: "POMPIGNAC", dist: "4.0 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 24, name: "HOUSSAIT-YOUNG", client: "HOUSSAIT-YOUNG Jérôme", address: "94 Route d'Hourtin", cp: "33930", city: "Vendays-Montalivet", dept: "33", gps: "45.338321, -1.071016", lat: 45.338321, lng: -1.071016, substation: "ST-VIVIEN", dist: "9.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 25, name: "MISSAULT FRESSENGEAS", client: "MISSAULT David", address: "Route de la Baine", cp: "24800", city: "Saint-Martin-de-Fressengeas", dept: "24", gps: "45.438589, 0.815692", lat: 45.438589, lng: 0.815692, substation: "THIVIERS", dist: "6.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 26, name: "LARDY", client: "LARDY Michel", address: "Outrelaigue", cp: "23150", city: "Maisonnisses", dept: "23", gps: "46.067915, 1.907318", lat: 46.067915, lng: 1.907318, substation: "LAVAUD", dist: "10.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 27, name: "CELERIE", client: "CELERIE Thomas", address: "301 route de la Valade", cp: "19230", city: "Beyssenac", dept: "19", gps: "45.400772, 1.284338", lat: 45.400772, lng: 1.284338, substation: "LUBERSAC", dist: "7.1 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 28, name: "MEILLAT 2", client: "MEILLAT 2 Maxime", address: "1a la Ribiére", cp: "23210", city: "Mourioux-Vieilleville", dept: "23", gps: "46.081523, 1.633909", lat: 46.081523, lng: 1.633909, substation: "CHATELUS 2", dist: "5.4 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 29, name: "DOMERGUE ARGENCES", client: "DOMERGUE David", address: "1 Route de Plagnes", cp: "12420", city: "Argences en Aubrac", dept: "12", gps: "44.807528, 2.790446", lat: 44.807528, lng: 2.790446, substation: "RUEYRES", dist: "5.9 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 30, name: "COMBY", client: "COMBY Fabrice", address: "14 Route de Besse", cp: "19210", city: "Saint-Éloy-les-Tuileries", dept: "19", gps: "45.452807, 1.284563", lat: 45.452807, lng: 1.284563, substation: "LUBERSAC", dist: "10.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" },
  { id: 31, name: "CASTEBRUNET 4", client: "CASTEBRUNET 4 Jérémy", address: "3750 Route de Bioule", cp: "82300", city: "Saint-Cirq", dept: "82", gps: "44.124392, 1.583302", lat: 44.124392, lng: 1.583302, substation: "LERE", dist: "6.2 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €", ebitda: "50 300 €", payback: "4.6 ans" }
];

// Matrice Financière 15 ans avec loyer 3 000 €/an sur 20 ans
const YEARS_15 = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040];
const FINANCIAL_MATRIX = {
  revFcr: [85848, 87565, 89316, 91103, 92925, 94783, 96679, 98612, 100585, 102596, 104648, 106741, 108876, 111054, 113275],
  revCapa: [8750, 8925, 9104, 9286, 9471, 9661, 9854, 10051, 10252, 10457, 10666, 10880, 11097, 11319, 11545],
  revArb: [29380, 29668, 29958, 30252, 30548, 30848, 31150, 31455, 31764, 32075, 32390, 32707, 33027, 33351, 33678],
  opexTurpe: [8317, 8483, 8653, 8826, 9003, 9183, 9366, 9554, 9745, 9940, 10139, 10341, 10548, 10759, 10974],
  opexRecharge: [34295, 34981, 35681, 36394, 37122, 37865, 38622, 39394, 40182, 40986, 41806, 42642, 43495, 44365, 45252],
  opexAgregateur: [22316, 22762, 23217, 23682, 24155, 24639, 25131, 25634, 26147, 26670, 27203, 27747, 28302, 28868, 29446],
  // opexAutres An 1 : Loyer 3 000 € + Maint 4 000 € + Assurance 1 750 € = 8 750 €
  opexAutres: [8750, 8885, 9023, 9163, 9306, 9453, 9602, 9754, 9909, 10067, 10229, 10393, 10561, 10732, 10907],
  debtService: [25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 0, 0, 0]
};

// Formateur monétaire
const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  return Math.round(val).toLocaleString('fr-FR') + ' €';
};

/**
 * Générateur et Visionneuse Plein Écran du Dossier d'Investissement BESS
 * A4 Paysage Strict (297 x 210 mm) • Fonds Blancs Purs • Cartographie Grand Sud-Ouest & Visuel Dalle Béton + Grillage
 */
export default function BessDossierPDFGenerator({
  isOpen,
  onClose,
  mode: initialMode = 'portfolio', // 'single' | 'portfolio'
  projectData = null,
  batteryConfig = null,
  batteryResults = null,
  networkQualification = null,
  portfolioData = null
}) {
  const [activeMode, setActiveMode] = useState(initialMode || 'portfolio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');

  // Synchronisation dynamique du mode lorsque les props changent
  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode);
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const isPort = activeMode === 'portfolio';
  const mult = isPort ? 31 : 1;

  // Recherche du site unitaire
  const selectedSite = SITES_DATABASE.find(s => s.name.toUpperCase() === (projectData?.name || '').toUpperCase()) || SITES_DATABASE[7]; // Concèze

  // Nom institutionnel affiché
  const headerProjectTitle = isPort
    ? "Portefeuille Consolidé BESS 15,50 MW / 32,36 MWh"
    : `Centrale BESS Stand-Alone 500 kW / 1 044 kWh (${projectData?.name || selectedSite.name})`;

  const headerProjectSubtitle = isPort
    ? "Grappe territoriale de 31 unités standardisées (500 kW / 1 044 kWh) raccordées au réseau HTA 20 kV Enedis dans le Grand Sud-Ouest (Nouvelle-Aquitaine & Occitanie). Monétisation agrégée en Value Stacking sous le régime TURPE 7 délibéré CRE 2025-227."
    : `Unité de stockage stationnaire autonome par batterie LFP (4 armoires CESC Mercury 261) raccordée au réseau HTA 20 kV Enedis (${selectedSite.substation} - ${selectedSite.dist}). Monétisation optimisée en Value Stacking sous le barème TURPE 7.`;

  // Métriques KPI institutionnelles
  const kpi = {
    irrProject: isPort ? '20.5%' : '20.8%',
    irrEquity: isPort ? 'TRI Equity : 37.4%' : 'TRI Equity : 38.1%',
    payback: isPort ? '4.6 ans' : '4.6 ans',
    paybackEquity: isPort ? 'Sur Fonds Propres : 2.2 ans' : 'Sur Fonds Propres : 2.2 ans',
    ebitda: isPort ? '1.56 M€' : '50 300 €',
    ebitdaSub: isPort ? 'EBITDA consolidé net (31 sites)' : 'Marge opérationnelle ~40.6%',
    revenue: isPort ? '3.84 M€' : '123 978 €',
    revenueSub: isPort ? 'Value Stacking 31 sites (2 c/j)' : '2 cycles journaliers (24h)',
    capex: isPort ? '7.23 M€' : '233 250 €',
    capexSub: isPort ? '~233 k€ / site raccordé clé en main' : '466 € / kW installé',
    turpeGain: isPort ? '+439 673 €' : '+14 183 €',
    turpeSub: isPort ? 'Gain annuel réseau consolidé' : 'Économie directe vs barème',
    rent: isPort ? '93 000 € / an' : '3 000 € / an',
    rentSub: isPort ? '31 baux notariés 20 ans verrouillés' : 'Bail notarié 20 ans (750 €/brique)',
    fcr: isPort ? '2 661 288 € / an' : '85 848 € / an',
    arb: isPort ? '910 780 € / an' : '29 380 € / an',
    capa: isPort ? '271 250 € / an' : '8 750 € / an',
    totalRevDonut: isPort ? '3 843 318 € / an' : '123 978 € / an',
    totalRevSub: isPort ? 'Portefeuille Consolidé 15.5 MW' : 'Unité 500 kW / 1 044 kWh',
    tableTitle: isPort ? "Plan d'Affaires Prévisionnel Consolidé sur 15 Ans (31 Sites / 15.5 MW)" : "Plan d'Affaires Prévisionnel sur 15 Ans (Unitaire 500 kW / 1 044 kWh)",
    badgePaybackSmall: isPort ? "4.6 ans (Projet) / 2.2 ans (Equity)" : "4.6 ans (Projet) / 2.2 ans (Equity)",
    dscrMoyenBadge: isPort ? "DSCR Portefeuille : 1.98x (Excellence bancaire)" : "DSCR Moyen : 1.98x (Min bancaire 1.15x)",
    techConfig: isPort ? "124 armoires extérieures réparties sur 31 sites" : "4 armoires extérieures CESC Mercury 261 (1.15m x 1.44m x 2.38m)",
    techPowerCap: isPort ? "15.5 MW / 32.36 MWh consolidés" : "500 kW / 1 044 kWh (Ratio 2h de décharge)"
  };

  // Répartition des 31 sites pour les planches 6 et 7
  const sitesP1 = SITES_DATABASE.slice(0, 16);
  const sitesP2 = SITES_DATABASE.slice(16);

  // Données du graphique 15 ans
  const maxEbitda = isPort ? 2100000 : 70000;
  const chartBars = YEARS_15.map((y, i) => {
    const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
    const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
    const ebitda = rev - opex;
    const debt = FINANCIAL_MATRIX.debtService[i] * mult;
    const cf = ebitda - debt;
    return { year: y, ebitda, cf };
  });

  // Moteur d'export PDF A4 Paysage Pleine Largeur
  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setProgressStep('Initialisation du moteur d’impression...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const pages = document.querySelectorAll('.bess-render-page');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setProgressStep(`Rendu vectoriel & capture planche ${i + 1} / ${pages.length}...`);

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1380,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        // Pleine largeur exacte (0 marge pour couvrir 100% de la page A4 paysage)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      const fileName = isPort
        ? `Dossier_Investissement_BESS_Portefeuille_15.5MW_TURPE7_${fileDate}.pdf`
        : `Dossier_Investissement_BESS_${projectData?.name || 'Unitaire_500kW'}_TURPE7_${fileDate}.pdf`;

      setProgressStep('Finalisation et enregistrement du document...');
      pdf.save(fileName);
      setIsGenerating(false);
    } catch (err) {
      console.error('Erreur lors de la génération du dossier PDF:', err);
      alert('Une erreur est survenue lors de la création du PDF. Veuillez réessayer.');
      setIsGenerating(false);
    }
  };

  const totalPagesCount = isPort ? 7 : 5;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[60px] z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      {/* Conteneur Modal Global Agrandie et Repositionnée sous le Header */}
      <div className="relative w-full max-w-[1540px] h-[calc(100vh-76px)] bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        
        {/* ========================================================================= */}
        {/* BARRE SUPÉRIEURE DE NAVIGATION ET EXPORT (FOND BLANC PUR) */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Logo ENR Courtage */}
            <div className="flex items-center gap-3">
              <img
                src="/logo-enr-courtage-inline.png"
                alt="ENR COURTAGE"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-[#0b192c] leading-none">
                  ENR<span className="text-[#0284c7] font-extrabold ml-1">COURTAGE</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-bold text-slate-500 mt-0.5">
                  Mémorandum d'Investissement BESS • Barème TURPE 7
                </span>
              </div>
            </div>

            {/* Commutateur interactif Unitaire vs Portefeuille */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  !isPort
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Centrale Unitaire (500 kW / 1 044 kWh)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('portfolio')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isPort
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Portefeuille Consolidé (31 Sites / 15.5 MW)
              </button>
            </div>
          </div>

          {/* Actions : Badge Conformité, Impression & Bouton Fermer Haut */}
          <div className="flex items-center gap-3">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CRE 2025-227 & TURPE 7 Conforme
            </span>

            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressStep}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Imprimer / Exporter en PDF (A4 Paysage)</span>
                </>
              )}
            </button>

            {/* Bouton Fermer Haut Droit */}
            <button
              onClick={onClose}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Fermer la visionneuse"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Fermer</span>
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* CONTENEUR DE PRÉVISUALISATION SCROLLABLE AVEC LES PLANCHES DU DOSSIER */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 space-y-8 bg-slate-200/90 flex flex-col items-center">
          <div className="text-center text-xs text-slate-600 font-bold bg-white/80 px-4 py-1.5 rounded-full border border-slate-300 shadow-xs">
            Aperçu fidèle des {totalPagesCount} planches A4 Paysage • Pleine largeur 297 × 210 mm • Fonds blancs • Prêt pour export
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 1 : SYNTHÈSE EXÉCUTIVE & CHIFFRES CLÉS (FOND BLANC) */}
          {/* ========================================================================= */}
          <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        Stockage Stationnaire BESS HTA
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Régime Délibéré CRE 2025-227
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                        2 Cycles / Jour
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                        Bail Notarié 20 Ans
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight mt-1.5">
                      {headerProjectTitle}
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 max-w-3xl">
                      {headerProjectSubtitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Édition d'Analyse</span>
                  <span className="text-sm font-extrabold text-[#0b192c]">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  <span className="text-xs font-bold text-cyan-600 block mt-0.5">ENR COURTAGE • M&A Infrastructure</span>
                </div>
              </div>

              {/* Les 6 grands chiffres clés visuels avec bordures micro-dégradées */}
              <div className="grid grid-cols-6 gap-3.5 mb-6">
                <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">TRI Projet & Equity</div>
                    <div className="text-2xl font-black text-purple-900 mt-1">{kpi.irrProject}</div>
                  </div>
                  <div className="text-[11px] font-bold text-purple-600 mt-1">{kpi.irrEquity}</div>
                </div>

                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Temps de Retour Net</div>
                    <div className="text-2xl font-black text-emerald-900 mt-1">{kpi.payback}</div>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-1">{kpi.paybackEquity}</div>
                </div>

                <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">EBITDA Net An 1</div>
                    <div className="text-2xl font-black text-amber-900 mt-1">{kpi.ebitda}</div>
                  </div>
                  <div className="text-[11px] font-bold text-amber-600 mt-1">{kpi.ebitdaSub}</div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">Chiffre d'Affaires Brut</div>
                    <div className="text-2xl font-black text-blue-900 mt-1">{kpi.revenue}</div>
                  </div>
                  <div className="text-[11px] font-bold text-blue-600 mt-1">{kpi.revenueSub}</div>
                </div>

                <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-600 to-slate-800"></div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700">CAPEX Clé en Main</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{kpi.capex}</div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 mt-1">{kpi.capexSub}</div>
                </div>

                <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Gain Annuel TURPE 7</div>
                    <div className="text-2xl font-black text-cyan-900 mt-1">{kpi.turpeGain}</div>
                  </div>
                  <div className="text-[11px] font-bold text-cyan-600 mt-1">{kpi.turpeSub}</div>
                </div>
              </div>

              {/* Deux grands blocs d'analyse comparative et de sécurisation foncière */}
              <div className="grid grid-cols-2 gap-6">
                {/* Bloc 1 : Spécifications Techniques Matériel */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h3 className="font-extrabold text-[#0b192c] text-sm uppercase tracking-wide">
                        Spécifications Techniques Matériel (CESC Mercury 261)
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      LiFePO4 Certifié
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Configuration technique :</span>
                      <span className="font-bold text-[#0b192c]">{kpi.techConfig}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Puissance nominale & Capacité :</span>
                      <span className="font-extrabold text-blue-700">{kpi.techPowerCap}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Emprise au sol par unité :</span>
                      <span className="font-bold text-emerald-700">19.84 m² sur dalle béton (&lt; 20 m² Déclaration Préalable DP)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Clôture & Sécurité périmétrique :</span>
                      <span className="font-bold text-slate-800">Grillage rigide thermo-laqué H 2.00m avec portillon sécurisé</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Rendement Round-Trip (AC-AC) :</span>
                      <span className="font-bold text-[#0b192c]">88.0% certifié en cycles nominaux</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-medium text-slate-500">Refroidissement & Sécurité incendie :</span>
                      <span className="font-bold text-[#0b192c]">Liquide HVAC • Aérosol NFPA 855 asservi</span>
                    </div>
                  </div>
                </div>

                {/* Bloc 2 : Insertion Réseau Enedis & Sécurisation Foncière 20 Ans */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <h3 className="font-extrabold text-[#0b192c] text-sm uppercase tracking-wide">
                        Insertion Réseau Enedis & Sécurisation Foncière
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Baux Notariés 20 Ans
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Domaine de tension de raccordement :</span>
                      <span className="font-bold text-[#0b192c]">HTA 20 000 V (Option HTA1 Courte Utilisation)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Distance privée de raccordement :</span>
                      <span className="font-bold text-[#0b192c]">10 mètres optimisés (Minimisation du génie civil)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Sécurisation foncière des sites :</span>
                      <span className="font-extrabold text-emerald-700">Promesses de bail sur 20 ans signées (3 000 € HT/an/site)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Statut Réseau Postes Sources :</span>
                      <span className="font-bold text-slate-800">Transfos sol &ge; 400 kVA identifiés (Dépôts libres acquéreur)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Protocoles de communication :</span>
                      <span className="font-bold text-[#0b192c]">IEC 61850 &amp; Conformité téléaction RTE / PICASSO</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-medium text-slate-500">Délai prévisionnel de COD :</span>
                      <span className="font-bold text-cyan-700">6 à 9 mois post-purges administratives de la DP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Mémorandum d'Investissement Institutionnel BESS</div>
              <div className="font-semibold text-slate-600">Modèle certifié Délibération CRE 2025-227 • TURPE 7</div>
              <div className="font-bold text-[#0b192c]">Planche 1 / {totalPagesCount} (Paysage)</div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 2 : DÉCRYPTAGE RÉGLEMENTAIRE TURPE 7 (CRE 2025-227) */}
          {/* ========================================================================= */}
          <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Levier Réglementaire &amp; Juridique
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight mt-1.5">
                      TURPE 7 &amp; Délibération CRE 2025–227 : Le Pivot de Rentabilité du BESS
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                      Comment les nouvelles règles tarifaires de la Commission de Régulation de l'Énergie décuplent les rendements du stockage en France.
                    </p>
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase block">Gain Économique Réseau</span>
                  <span className="text-base font-black text-emerald-800">{isPort ? '+439 673 € / an de marge brute' : '+14 183 € / an de marge brute'}</span>
                </div>
              </div>

              {/* Les 4 piliers fondateurs de la réforme */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl p-4 shadow-xs transition-all">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center mb-2.5">
                    01
                  </div>
                  <h4 className="font-extrabold text-[#0b192c] text-sm mb-1.5">Fin du Double Péage Réseau</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Exonération totale de la Composante de Soutirage (CS) sur 88% de l'énergie réinjectée au réseau, supprimant l'asymétrie historique.
                  </p>
                </div>

                <div className="bg-white border-2 border-blue-100 hover:border-blue-300 rounded-2xl p-4 shadow-xs transition-all">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center mb-2.5">
                    02
                  </div>
                  <h4 className="font-extrabold text-[#0b192c] text-sm mb-1.5">Tarif HTA1 Courte Utilisation</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prime fixe de puissance souscrite abaissée à 13.20 €/kW/an, parfaitement dimensionnée pour les profils de cycles intensifs 2h.
                  </p>
                </div>

                <div className="bg-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-4 shadow-xs transition-all">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center mb-2.5">
                    03
                  </div>
                  <h4 className="font-extrabold text-[#0b192c] text-sm mb-1.5">Signaux-Prix Géographiques</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Valorisation de l'injection en zones saturées S3REnR, offrant des primes d'équilibrage et d'écrêtement local très attractives.
                  </p>
                </div>

                <div className="bg-white border-2 border-purple-100 hover:border-purple-300 rounded-2xl p-4 shadow-xs transition-all">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center mb-2.5">
                    04
                  </div>
                  <h4 className="font-extrabold text-[#0b192c] text-sm mb-1.5">Impact Direct sur le TRI</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Réduction immédiate de plus de 40% des OPEX d'acheminement, propulsant le TRI Projet de 16.5% à 20.5% (+400 bps).
                  </p>
                </div>
              </div>

              {/* Tableau comparatif Avant vs Après Réforme TURPE 7 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h4 className="font-black text-[#0b192c] text-xs uppercase tracking-wider mb-3">
                  Comparatif Tarifaire Analytique : Ancien Régime vs Barème TURPE 7 Délibéré
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                        <th className="p-3 w-1/3">Composante Tarifaire d'Acheminement</th>
                        <th className="p-3 w-1/4 text-red-600">Ancien Régime (Sans Neutralité)</th>
                        <th className="p-3 w-1/4 text-emerald-700">Régime TURPE 7 Délibération CRE 2025-227</th>
                        <th className="p-3 text-right">Gain Annuel Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Composante de Soutirage Variable (CS)</td>
                        <td className="p-3 text-red-500">Plein tarif sur 100% de l'énergie chargée</td>
                        <td className="p-3 text-emerald-700 font-bold">Exonération totale sur les 88% d'énergie réinjectée</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{isPort ? '+293 880 € / an' : '+9 480 € / an'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Composante Fixe de Puissance (CS Fixe)</td>
                        <td className="p-3 text-red-500">Tarification longue utilisation rigide</td>
                        <td className="p-3 text-emerald-700 font-bold">Formule HTA1 Courte Utilisation (13.20 €/kW/an)</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{isPort ? '+105 400 € / an' : '+3 400 € / an'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Pertes Réseau non récupérables</td>
                        <td className="p-3 text-red-500">Double taxation cumulée</td>
                        <td className="p-3 text-emerald-700 font-bold">Strictement limitée aux 12% de conversion de cycle</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{isPort ? '+40 393 € / an' : '+1 303 € / an'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Composantes de Gestion &amp; Comptage (CG/CC)</td>
                        <td className="p-3 text-slate-500">Forfaits conventionnels</td>
                        <td className="p-3 text-slate-800">Comptage 4 quadrants télé-relevé Enedis (661 €/an/site)</td>
                        <td className="p-3 text-right font-bold text-slate-400">Neutre</td>
                      </tr>
                      <tr className="bg-emerald-50/60 font-black text-slate-900">
                        <td className="p-3 uppercase">Total Facture Annuelle TURPE Réseau</td>
                        <td className="p-3 text-red-600 line-through">{isPort ? '697 500 € / an' : '22 500 € / an'}</td>
                        <td className="p-3 text-emerald-800 text-sm">{isPort ? '257 827 € / an' : '8 317 € / an'}</td>
                        <td className="p-3 text-right text-emerald-700 text-sm font-black">{isPort ? '+439 673 € / an' : '+14 183 € / an'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Direction Juridique &amp; Régulation Énergie</div>
              <div className="font-semibold text-slate-600">Arrêté CRE 2025-78 &amp; Délibération 2025-227</div>
              <div className="font-bold text-[#0b192c]">Planche 2 / {totalPagesCount} (Paysage)</div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 3 : VALUE STACKING & 2 CYCLES / JOUR (FOND BLANC) */}
          {/* ========================================================================= */}
          <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      Valorisation Marché &amp; Trading Algorithmique
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight mt-1.5">
                      L'Empilement de Valeur (Value Stacking) à 2 Cycles Quotidiens
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                      Monétisation 24h/24 combinant réserve primaire 50 Hz, réserve rapide aFRR PICASSO, capacité RTE et arbitrage spot.
                    </p>
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-right">
                  <span className="text-[11px] font-bold text-blue-600 uppercase block">Chiffre d'Affaires Brut An 1</span>
                  <span className="text-base font-black text-blue-900">{kpi.totalRevDonut}</span>
                </div>
              </div>

              {/* Les 3 flux de revenus détaillés + Donut chart SVG vectoriel */}
              <div className="grid grid-cols-12 gap-6 mb-6 items-center">
                {/* 3 Blocs de flux à gauche */}
                <div className="col-span-8 space-y-3.5">
                  {/* Flux 1 : FCR & PICASSO */}
                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                        69.2%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b192c] text-sm">
                          1. Réserve Primaire 50 Hz (FCR) &amp; PICASSO (aFRR Réglage Secondaire)
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Rémunération de la mise à disposition de puissance symétrique à la milliseconde pour stabiliser le réseau européen. Temps de réponse &lt; 600 ms certifié par CESC, bien supérieur à la norme de 4s exigée pour les enchères européennes PICASSO.
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-4 shrink-0">
                      <span className="text-base font-black text-blue-900">{kpi.fcr}</span>
                    </div>
                  </div>

                  {/* Flux 2 : Arbitrage Spot EPEX */}
                  <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 font-black text-xs flex items-center justify-center shrink-0">
                        23.7%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b192c] text-sm">
                          2. Arbitrage Spot EPEX (Day-Ahead &amp; Intraday — 2 Cycles / Jour)
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Exploitation de la volatilité horaire des prix de gros. Exécution de 2 cycles complets par jour : recharge nocturne (surproduction éolienne) et recharge méridienne (surproduction solaire à prix négatifs), restitués aux pics du matin et du soir.
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-4 shrink-0">
                      <span className="text-base font-black text-cyan-900">{kpi.arb}</span>
                    </div>
                  </div>

                  {/* Flux 3 : Marché de Capacité */}
                  <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                        7.1%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b192c] text-sm">
                          3. Marché de Capacité RTE (Garantie de Puissance Pointes Hiver)
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Certification de disponibilité lors des jours de tension réseau (PP2 RTE). Cession de garanties de capacité aux fournisseurs obligés. Rémunération récurrente sécurisée valorisée à 35 €/kW/an avec facteur de derating 0.5 certifié.
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-4 shrink-0">
                      <span className="text-base font-black text-emerald-900">{kpi.capa}</span>
                    </div>
                  </div>
                </div>

                {/* Donut Chart SVG Vectoriel à droite */}
                <div className="col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Structure des Revenus An 1
                  </span>
                  
                  <div className="relative w-44 h-44 my-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#2563eb" strokeWidth="15" strokeDasharray="165.3 238.7" strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#06b6d4" strokeWidth="15" strokeDasharray="56.6 238.7" strokeDashoffset="-165.3" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="15" strokeDasharray="16.9 238.7" strokeDashoffset="-221.9" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-[#0b192c]">{isPort ? '3.84 M€' : '124 k€'}</span>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase">CA Brut Total</span>
                    </div>
                  </div>

                  <div className="w-full mt-2 pt-2 border-t border-slate-100 flex justify-around text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> FCR 69.2%
                    </span>
                    <span className="flex items-center gap-1 text-cyan-700">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Arbitrage 23.7%
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Capacité 7.1%
                    </span>
                  </div>
                </div>
              </div>

              {/* Horodatage du profil de dispatching 24h à 2 cycles */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Chronométrie Standardisée d'une Journée Type à 2 Cycles (Dispatching Heures Creuses / Pointes)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    4 h de charge nocturne + 3 h de charge méridienne solaire
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase block">01h00 – 05h00 (4h)</span>
                    <span className="font-bold text-slate-900 block mt-0.5">Charge Cycle 1 (Creux Nuit)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Soutirage aux prix bas / éolien</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-extrabold text-amber-700 uppercase block">07h30 – 09h30 (2h)</span>
                    <span className="font-bold text-slate-900 block mt-0.5">Décharge Cycle 1 (Pointe Matin)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Injection au pic de consommation</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-extrabold text-cyan-700 uppercase block">12h00 – 15h00 (3h)</span>
                    <span className="font-bold text-slate-900 block mt-0.5">Charge Cycle 2 (Creux Solaire)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Absorption des prix négatifs PV</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">18h30 – 21h00 (2.5h)</span>
                    <span className="font-bold text-slate-900 block mt-0.5">Décharge Cycle 2 (Pointe Soir)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Restitution au tarif maximum journalier</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Trading &amp; Optimisation Marchés de Flexibilité</div>
              <div className="font-semibold text-slate-600">Algorithme d'agrégation certifié 2 cycles quotidiens</div>
              <div className="font-bold text-[#0b192c]">Planche 3 / {totalPagesCount} (Paysage)</div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 4 : PLAN D'AFFAIRES PRÉVISIONNEL SUR 15 ANS (FOND BLANC) */}
          {/* ========================================================================= */}
          <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      Modélisation Financière Analytique
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      {kpi.tableTitle}
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Hypothèses contractuelles : Dette senior 12 ans à 4.30% • Inflation 2.0%/an • Dégradation batterie 1.0%/an • Loyer foncier 3 000 €/an/site sur 20 ans.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                    {kpi.badgePaybackSmall}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black">
                    {kpi.dscrMoyenBadge}
                  </span>
                </div>
              </div>

              {/* Tableau Financier Pleine Largeur sur les 15 Années d'Étude (2026 à 2040) */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs mb-4">
                <table className="w-full text-right text-[11px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800 font-extrabold border-b border-slate-200">
                      <th className="p-2 text-left font-black w-44 sticky left-0 bg-slate-50 z-10">Ligne Financière (€)</th>
                      {YEARS_15.map((y) => (
                        <th key={y} className="p-1.5 text-center font-bold">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="bg-blue-50/50 font-bold text-blue-900">
                      <td className="p-2 text-left sticky left-0 bg-blue-50/90 z-10">1. Chiffre d'Affaires Brut</td>
                      {YEARS_15.map((_, i) => {
                        const val = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        return <td key={i} className="p-1.5">{fmtEur(val)}</td>;
                      })}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• Dont Réserve FCR &amp; PICASSO</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">{fmtEur(FINANCIAL_MATRIX.revFcr[i] * mult)}</td>)}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• Dont Capacité RTE PP2</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">{fmtEur(FINANCIAL_MATRIX.revCapa[i] * mult)}</td>)}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• Dont Arbitrage Spot 2 c/j</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">{fmtEur(FINANCIAL_MATRIX.revArb[i] * mult)}</td>)}
                    </tr>

                    <tr className="bg-red-50/40 font-bold text-red-900">
                      <td className="p-2 text-left sticky left-0 bg-red-50/90 z-10">2. OPEX d'Exploitation Total</td>
                      {YEARS_15.map((_, i) => {
                        const val = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        return <td key={i} className="p-1.5">-{fmtEur(val)}</td>;
                      })}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• Énergie de Recharge (Soutirage)</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">-{fmtEur(FINANCIAL_MATRIX.opexRecharge[i] * mult)}</td>)}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• Commission Agrégateur 18%</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">-{fmtEur(FINANCIAL_MATRIX.opexAgregateur[i] * mult)}</td>)}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• TURPE 7 Réseau Abattu</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">-{fmtEur(FINANCIAL_MATRIX.opexTurpe[i] * mult)}</td>)}
                    </tr>
                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 pl-4 text-left sticky left-0 bg-white z-10">• Baux 20 ans + Maint + Assurance</td>
                      {YEARS_15.map((_, i) => <td key={i} className="p-1">-{fmtEur(FINANCIAL_MATRIX.opexAutres[i] * mult)}</td>)}
                    </tr>

                    <tr className="bg-emerald-50/60 font-black text-emerald-950 text-xs">
                      <td className="p-2 text-left sticky left-0 bg-emerald-50/90 z-10">3. EBITDA Net d'Exploitation</td>
                      {YEARS_15.map((_, i) => {
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        return <td key={i} className="p-1.5 text-emerald-800">{fmtEur(rev - opex)}</td>;
                      })}
                    </tr>

                    <tr className="text-slate-600 text-[10.5px]">
                      <td className="p-1.5 text-left sticky left-0 bg-white z-10">4. Service Dette Senior (12 ans)</td>
                      {YEARS_15.map((_, i) => {
                        const val = FINANCIAL_MATRIX.debtService[i] * mult;
                        return <td key={i} className="p-1">{val > 0 ? `-${fmtEur(val)}` : '0 €'}</td>;
                      })}
                    </tr>

                    <tr className="bg-cyan-50/60 font-black text-cyan-950 text-xs">
                      <td className="p-2 text-left sticky left-0 bg-cyan-50/90 z-10">5. Cash-Flow Net Disponible</td>
                      {YEARS_15.map((_, i) => {
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        const ebitda = rev - opex;
                        const debt = FINANCIAL_MATRIX.debtService[i] * mult;
                        return <td key={i} className="p-1.5 text-cyan-800">{fmtEur(ebitda - debt)}</td>;
                      })}
                    </tr>

                    <tr className="bg-slate-50 text-[10.5px] font-bold text-slate-800">
                      <td className="p-1.5 text-left sticky left-0 bg-slate-50 z-10">Ratio DSCR de Dette Senior</td>
                      {YEARS_15.map((_, i) => {
                        const val = FINANCIAL_MATRIX.debtService[i] * mult;
                        if (val === 0) return <td key={i} className="p-1 text-slate-400">—</td>;
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        const dscr = ((rev - opex) / val).toFixed(2);
                        return <td key={i} className="p-1 text-emerald-700 font-extrabold">{dscr}x</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bar-Chart Vectoriel 15 Ans Pleine Largeur (EBITDA vs Cash-Flow Net) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#0b192c] uppercase tracking-wide">
                    Trajectoire Financière 15 Ans (2026 à 2040) • EBITDA vs Cash-Flow Disponible
                  </span>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-3 h-3 rounded-xs bg-blue-600"></span> EBITDA Net
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-700">
                      <span className="w-3 h-3 rounded-xs bg-cyan-500"></span> Cash-Flow Net (Post-Dette)
                    </span>
                  </div>
                </div>

                <div className="h-28 flex items-end justify-between gap-2 pt-2 px-2 border-b border-slate-300">
                  {chartBars.map((b) => {
                    const hEbitda = Math.min(100, Math.max(10, (b.ebitda / maxEbitda) * 100));
                    const hCf = Math.min(100, Math.max(5, (b.cf / maxEbitda) * 100));
                    return (
                      <div key={b.year} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div
                            className="w-1/2 bg-blue-600 rounded-t-xs transition-all hover:bg-blue-700"
                            style={{ height: `${hEbitda}%` }}
                            title={`EBITDA ${b.year}: ${fmtEur(b.ebitda)}`}
                          ></div>
                          <div
                            className="w-1/2 bg-cyan-500 rounded-t-xs transition-all hover:bg-cyan-600"
                            style={{ height: `${hCf}%` }}
                            title={`Cash-Flow ${b.year}: ${fmtEur(b.cf)}`}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{b.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Direction Financière &amp; Modélisation d'Actifs</div>
              <div className="font-semibold text-slate-600">Plan d'affaires audité 15 ans • Inflation 2.0%</div>
              <div className="font-bold text-[#0b192c]">Planche 4 / {totalPagesCount} (Paysage)</div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 5 : CARTOGRAPHIE GÉOGRAPHIQUE & VISUEL TECHNIQUE DE L'INSTALLATION */}
          {/* ========================================================================= */}
          <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      Implantation &amp; Ingénierie Pré-Construction
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      {isPort
                        ? "Cartographie des 31 Projets & Standard Technique de la Station BESS"
                        : `Implantation Territoriale & Visuel Architectural de la Station (${selectedSite.name})`}
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      {isPort
                        ? "Grappe régionale Grand Sud-Ouest (Nouvelle-Aquitaine & Occitanie) • Standard industriel 4 armoires CESC Mercury 261 sur dalle béton 19.84 m² ceinturée d'un grillage rigide."
                        : `Localisation cadastrale et intégration réseau de la centrale ${selectedSite.name} • Dalle béton armé 19.84 m² avec clôture rigide H 2.00 m (Déclaration Préalable DP).`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                    Emprise Sol 19.84 m² (&lt; 20 m² DP)
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black">
                    Clôture Treillis H 2.00 m
                  </span>
                </div>
              </div>

              {/* Contenu double volet : Cartographie à gauche + Rendu architectural 3D à droite */}
              <div className="grid grid-cols-12 gap-6 items-stretch mb-2">
                
                {/* 1. CÔTÉ GAUCHE (7/12) : CARTOGRAPHIE GÉOGRAPHIQUE DU GRAND SUD-OUEST */}
                <div className="col-span-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide">
                        {isPort ? "Cartographie des Implantations • Grand Sud-Ouest" : `Localisation & Raccordement Réseau • ${selectedSite.city} (${selectedSite.cp})`}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {isPort ? "31 Sites BESS Standardisés" : `Poste Source ${selectedSite.substation} (${selectedSite.dist})`}
                    </span>
                  </div>

                  {/* Carte Vectorielle Stylisée du Sud-Ouest avec les points géographiques */}
                  <div className="relative w-full h-[380px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
                    <svg viewBox="0 0 600 400" className="w-full h-full">
                      <defs>
                        {/* Grille de fond */}
                        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
                        </pattern>
                        {/* Dégradé des contours régionaux */}
                        <linearGradient id="regionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
                        </linearGradient>
                      </defs>

                      <rect width="600" height="400" fill="url(#grid)" />

                      {/* Contour stylisé de la Nouvelle-Aquitaine et Occitanie */}
                      <path
                        d="M 120 40 L 260 30 L 380 45 L 450 110 L 510 180 L 490 280 L 420 360 L 320 375 L 200 360 L 140 280 L 110 190 Z"
                        fill="url(#regionGrad)"
                        stroke="#334155"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />

                      {/* Ligne côtière Atlantique */}
                      <path
                        d="M 120 40 Q 100 130 110 190 Q 120 250 140 280 Q 150 330 170 360"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        strokeOpacity="0.4"
                      />

                      {/* Villes repères principales */}
                      <g className="text-[10px] font-bold fill-slate-400">
                        <circle cx="210" cy="185" r="3.5" fill="#94a3b8" />
                        <text x="218" y="189">Bordeaux</text>

                        <circle cx="340" cy="300" r="3.5" fill="#94a3b8" />
                        <text x="348" y="304">Toulouse</text>

                        <circle cx="350" cy="120" r="3.5" fill="#94a3b8" />
                        <text x="358" y="124">Limoges</text>

                        <circle cx="360" cy="190" r="3.5" fill="#94a3b8" />
                        <text x="368" y="194">Brive</text>

                        <circle cx="280" cy="270" r="3.5" fill="#94a3b8" />
                        <text x="288" y="274">Montauban</text>

                        <circle cx="180" cy="330" r="3.5" fill="#94a3b8" />
                        <text x="188" y="334">Pau</text>
                      </g>

                      {/* Affichage des pins BESS */}
                      {isPort ? (
                        SITES_DATABASE.map((site) => {
                          // Projection géographique approximative sur la vue 600x400
                          // lat: 43.3 (bas) à 46.4 (haut) -> y: 360 à 50
                          // lng: -1.2 (gauche) à 2.8 (droite) -> x: 120 à 510
                          const x = 120 + ((site.lng - (-1.2)) / (2.8 - (-1.2))) * (510 - 120);
                          const y = 360 - ((site.lat - 43.3) / (46.4 - 43.3)) * (360 - 50);

                          return (
                            <g key={site.id} className="cursor-pointer group">
                              {/* Halo lumineux */}
                              <circle cx={x} cy={y} r="8" fill="#38bdf8" fillOpacity="0.2" className="animate-pulse" />
                              {/* Point principal */}
                              <circle cx={x} cy={y} r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                            </g>
                          );
                        })
                      ) : (
                        // Mode Unitaire : zoom sur le site sélectionné
                        (() => {
                          const x = 300;
                          const y = 200;
                          return (
                            <g>
                              {/* Cercle d'influence réseau */}
                              <circle cx={x} cy={y} r="70" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                              <circle cx={x} cy={y} r="14" fill="#38bdf8" fillOpacity="0.3" className="animate-pulse" />
                              <circle cx={x} cy={y} r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                              {/* Poste source associé */}
                              <circle cx={x + 45} cy={y - 35} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                              <line x1={x} y1={y} x2={x + 45} y2={y - 35} stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
                              <text x={x - 20} y={y + 24} fill="#38bdf8" fontSize="12" fontWeight="900">{selectedSite.name} (500 kW)</text>
                              <text x={x + 55} y={y - 32} fill="#10b981" fontSize="10" fontWeight="bold">Poste {selectedSite.substation} ({selectedSite.dist})</text>
                            </g>
                          );
                        })()
                      )}
                    </svg>

                    {/* Légende superposée sur la carte */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 text-[10px] text-white flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Stockage BESS 500 kW (31 sites)
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-300 font-medium">Postes Sources HTA 20 kV Enedis</span>
                    </div>
                  </div>

                  {/* Synthèse départementale sous la carte */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-[10.5px]">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-blue-900 block">Nouvelle-Aquitaine</span>
                      <span className="text-slate-500 font-bold">22 Sites (11.0 MW)</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-purple-900 block">Occitanie</span>
                      <span className="text-slate-500 font-bold">9 Sites (4.5 MW)</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-emerald-900 block">Raccordement HTA</span>
                      <span className="text-slate-500 font-bold">100% Enedis 20 kV</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-amber-900 block">Baux Sécurisés</span>
                      <span className="text-slate-500 font-bold">3 000 €/an • 20 ans</span>
                    </div>
                  </div>
                </div>

                {/* 2. CÔTÉ DROIT (6/12) : VISUEL TECHNIQUE DE L'INSTALLATION (DALLE BÉTON + GRILLAGE) */}
                <div className="col-span-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide">
                        Standard Architectural BESS • Dalle Béton 19.84 m² &amp; Clôture Rigide
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Déclaration Préalable DP Conforme
                    </span>
                  </div>

                  {/* Rendu 3D Isométrique / Schéma Technique Vectoriel de la Station */}
                  <div className="relative w-full h-[380px] bg-gradient-to-b from-slate-100 to-slate-200 rounded-xl overflow-hidden border border-slate-300 flex items-center justify-center p-2">
                    <svg viewBox="0 0 540 340" className="w-full h-full">
                      {/* Sol / Terrain naturel */}
                      <polygon points="40,240 270,330 500,240 270,150" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />

                      {/* Dalle Béton Armé (6.20m x 3.20m = 19.84 m²) */}
                      {/* Épaisseur dalle */}
                      <polygon points="100,220 270,290 440,220 440,230 270,300 100,230" fill="#94a3b8" />
                      {/* Surface supérieure dalle lissée */}
                      <polygon points="100,220 270,290 440,220 270,150" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

                      {/* Les 4 armoires extérieures CESC Mercury 261 alignées sur la dalle */}
                      {[0, 1, 2, 3].map((idx) => {
                        // Décalage isométrique pour chaque armoire
                        const ox = 150 + idx * 55;
                        const oy = 210 + idx * 18 - (idx * 6);
                        const w = 42;
                        const h = 82;
                        const depth = 32;

                        return (
                          <g key={idx}>
                            {/* Ombre portée armoire */}
                            <polygon points={`${ox},${oy+5} ${ox+w},${oy+5-12} ${ox+w+depth},${oy+5-22} ${ox+depth},${oy+5-10}`} fill="rgba(0,0,0,0.15)" />
                            
                            {/* Face avant armoire (Façade Sud RAL 9003 blanc pur) */}
                            <polygon points={`${ox},${oy} ${ox+w},${oy-15} ${ox+w},${oy-15-h} ${ox},${oy-h}`} fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
                            
                            {/* Persiennes de ventilation haute */}
                            <line x1={ox+6} y1={oy-h+12} x2={ox+w-6} y2={oy-15-h+12} stroke="#334155" strokeWidth="2.5" />
                            <line x1={ox+6} y1={oy-h+18} x2={ox+w-6} y2={oy-15-h+18} stroke="#334155" strokeWidth="2.5" />
                            <line x1={ox+6} y1={oy-h+24} x2={ox+w-6} y2={oy-15-h+24} stroke="#334155" strokeWidth="2.5" />

                            {/* Voyants LED et Coup de poing arrêt d'urgence */}
                            <circle cx={ox+w-10} cy={oy-15-h+35} r="2" fill="#22c55e" />
                            <circle cx={ox+w-10} cy={oy-15-h+45} r="3" fill="#ef4444" />

                            {/* Face latérale armoire */}
                            <polygon points={`${ox+w},${oy-15} ${ox+w+depth},${oy-25} ${ox+w+depth},${oy-25-h} ${ox+w},${oy-15-h}`} fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                            
                            {/* Toit de l'armoire */}
                            <polygon points={`${ox},${oy-h} ${ox+w},${oy-15-h} ${ox+w+depth},${oy-25-h} ${ox+depth},${oy-10-h}`} fill="#ffffff" stroke="#64748b" strokeWidth="1" />

                            {/* Mention CESC sur l'armoire */}
                            <text x={ox+8} y={oy-h+40} fontSize="7" fontWeight="900" fill="#1e293b">CESC</text>
                          </g>
                        );
                      })}

                      {/* Panneaux de grillage en treillis rigide thermo-laqué H 2.00m ceinturant la dalle */}
                      {/* Poteaux métalliques verticaux */}
                      {[[85, 215], [270, 295], [455, 215], [270, 135], [177, 255], [362, 255]].map(([px, py], i) => (
                        <g key={i}>
                          <line x1={px} y1={py} x2={px} y2={py-75} stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx={px} cy={py-76} r="2" fill="#166534" />
                        </g>
                      ))}

                      {/* Panneaux treillis soudé (Lignes horizontales du grillage) */}
                      {[-70, -50, -30, -10].map((dy) => (
                        <g key={dy} stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.85">
                          <line x1="85" y1={215+dy} x2="270" y2={295+dy} />
                          <line x1="270" y1={295+dy} x2="455" y2={215+dy} />
                          <line x1="455" y1={215+dy} x2="270" y2={135+dy} />
                          <line x1="270" y1={135+dy} x2="85" y2={215+dy} />
                        </g>
                      ))}

                      {/* Portillon d'accès technique sécurisé avec poignée */}
                      <rect x="235" y="240" width="28" height="50" fill="none" stroke="#166534" strokeWidth="1.5" />
                      <circle cx="260" cy="265" r="1.5" fill="#ca8a04" />

                      {/* Lignes de cotations réglementaires DP */}
                      {/* Cotation Longueur dalle 6.20 m */}
                      <line x1="80" y1="230" x2="250" y2="305" stroke="#2563eb" strokeWidth="1.5" />
                      <text x="145" y="280" fontSize="10" fontWeight="900" fill="#1d4ed8">6.20 m</text>

                      {/* Cotation Largeur dalle 3.20 m */}
                      <line x1="285" y1="305" x2="465" y2="225" stroke="#2563eb" strokeWidth="1.5" />
                      <text x="385" y="275" fontSize="10" fontWeight="900" fill="#1d4ed8">3.20 m</text>

                      {/* Cotation Hauteur armoire 2.38 m */}
                      <line x1="70" y1="210" x2="70" y2="128" stroke="#7c3aed" strokeWidth="1.5" />
                      <text x="25" y="170" fontSize="10" fontWeight="900" fill="#6d28d9">H 2.38 m</text>

                      {/* Badge Emprise au sol < 20 m² */}
                      <g transform="translate(180, 20)">
                        <rect width="180" height="26" rx="6" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                        <text x="90" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#047857">
                          Emprise Dalle : 19.84 m² (&lt; 20 m²)
                        </text>
                      </g>
                    </svg>

                    {/* Badge indicatif sur le schéma */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-300 text-[10px] font-bold text-slate-700">
                      Vue Axonométrique d'Élévation Sud
                    </div>
                  </div>

                  {/* Fiche technique de génie civil et sécurité */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[10.5px]">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-slate-800 block">Dalle Béton Armé</span>
                      <span className="text-slate-500 font-bold">6.20m × 3.20m (19.84 m²)</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-slate-800 block">Clôture Grillage Rigide</span>
                      <span className="text-slate-500 font-bold">Treillis soudé H 2.00 m</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="font-extrabold text-slate-800 block">Sécurité &amp; Incendie</span>
                      <span className="text-slate-500 font-bold">Aérosol NFPA 855 asservi</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Ingénierie &amp; Raccordement Haute Tension Enedis</div>
              <div className="font-semibold text-slate-600">Standard technique DP certifié • Norme NF C 15-100 / NF C 13-100</div>
              <div className="font-bold text-[#0b192c]">Planche 5 / {totalPagesCount} (Paysage)</div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 6 : RÉPERTOIRE FONCIER & RÉSEAU DES PROJETS (SITES 1 À 16) */}
          {/* ========================================================================= */}
          <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      Audit Foncier &amp; Raccordement HTA (Partie 1)
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      {isPort
                        ? "Répertoire Foncier & Réseau des 31 Projets BESS (Sites #1 à #16)"
                        : `Fiche Projet Détaillée & Sécurisation Foncière (${selectedSite.name})`}
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      {isPort
                        ? "Identification cadastrale, coordonnées GPS décimales, rattachement aux postes sources Enedis/ODRE et quote-part S3REnR."
                        : `Détail technique et cadastral du projet ${selectedSite.name} situé à ${selectedSite.city} (${selectedSite.cp}).`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                    Bail 20 ans : 3 000 €/an/site
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black">
                    HTA 20 kV Enedis
                  </span>
                </div>
              </div>

              {/* Tableau exhaustif des 16 premiers sites */}
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5 w-36">Nom Projet &amp; Bailleur</th>
                      <th className="p-2.5 w-36">Commune &amp; CP</th>
                      <th className="p-2.5 w-44">Coordonnées GPS</th>
                      <th className="p-2.5 w-32">Poste Source Enedis</th>
                      <th className="p-2.5 w-20 text-center">Dist. Réseau</th>
                      <th className="p-2.5 w-24 text-right">Quote-part</th>
                      <th className="p-2.5 w-28 text-center">Puissance / Capacité</th>
                      <th className="p-2.5 w-24 text-right">Loyer 20 ans</th>
                      <th className="p-2.5 w-24 text-right">EBITDA An 1</th>
                      <th className="p-2.5 w-20 text-center">Payback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
                    {sitesP1.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2 text-center font-bold text-slate-400">{s.id}</td>
                        <td className="p-2">
                          <span className="font-extrabold text-slate-900 block leading-tight">{s.name}</span>
                          <span className="text-[10px] text-slate-400">{s.client}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-semibold text-slate-800 block leading-tight">{s.city}</span>
                          <span className="text-[10px] text-slate-400">{s.cp} ({s.dept})</span>
                        </td>
                        <td className="p-2 font-mono text-[10px] text-blue-700">{s.gps}</td>
                        <td className="p-2 font-extrabold text-emerald-800">{s.substation}</td>
                        <td className="p-2 text-center font-semibold text-slate-600">{s.dist}</td>
                        <td className="p-2 text-right font-semibold text-slate-600">{s.s3renr}</td>
                        <td className="p-2 text-center font-bold text-slate-900">
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">{s.power} / {s.cap}</span>
                        </td>
                        <td className="p-2 text-right font-extrabold text-amber-700">{s.rent}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{s.ebitda}</td>
                        <td className="p-2 text-center font-bold text-slate-700">{s.payback}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pied de page institutionnel */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Répertoire Juridique &amp; Foncier Sécurisé</div>
              <div className="font-semibold text-slate-600">31 Promesses de Baux Notariées 20 Ans • Raccordements HTA Identifiés</div>
              <div className="font-bold text-[#0b192c]">Planche 6 / {totalPagesCount} (Paysage)</div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 7 : RÉPERTOIRE FONCIER & RÉSEAU DES PROJETS (SITES 17 À 31 + TOTAL) */}
          {/* ========================================================================= */}
          {isPort && (
            <section className="bess-render-page bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
              <div>
                {/* En-tête de planche */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo-enr-courtage-inline.png"
                      alt="ENR COURTAGE"
                      className="h-11 w-auto object-contain"
                    />
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                        Audit Foncier &amp; Raccordement HTA (Partie 2)
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                        Répertoire Foncier &amp; Réseau des 31 Projets BESS (Sites #17 à #31)
                      </h2>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Identification cadastrale, coordonnées GPS décimales, rattachement aux postes sources Enedis/ODRE et quote-part S3REnR.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                      Total Consolidé 15.5 MW
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black">
                      32.36 MWh
                    </span>
                  </div>
                </div>

                {/* Tableau exhaustif des sites 17 à 31 + Ligne de total consolidé */}
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
                        <th className="p-2.5 w-8 text-center">#</th>
                        <th className="p-2.5 w-36">Nom Projet &amp; Bailleur</th>
                        <th className="p-2.5 w-36">Commune &amp; CP</th>
                        <th className="p-2.5 w-44">Coordonnées GPS</th>
                        <th className="p-2.5 w-32">Poste Source Enedis</th>
                        <th className="p-2.5 w-20 text-center">Dist. Réseau</th>
                        <th className="p-2.5 w-24 text-right">Quote-part</th>
                        <th className="p-2.5 w-28 text-center">Puissance / Capacité</th>
                        <th className="p-2.5 w-24 text-right">Loyer 20 ans</th>
                        <th className="p-2.5 w-24 text-right">EBITDA An 1</th>
                        <th className="p-2.5 w-20 text-center">Payback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
                      {sitesP2.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2 text-center font-bold text-slate-400">{s.id}</td>
                          <td className="p-2">
                            <span className="font-extrabold text-slate-900 block leading-tight">{s.name}</span>
                            <span className="text-[10px] text-slate-400">{s.client}</span>
                          </td>
                          <td className="p-2">
                            <span className="font-semibold text-slate-800 block leading-tight">{s.city}</span>
                            <span className="text-[10px] text-slate-400">{s.cp} ({s.dept})</span>
                          </td>
                          <td className="p-2 font-mono text-[10px] text-blue-700">{s.gps}</td>
                          <td className="p-2 font-extrabold text-emerald-800">{s.substation}</td>
                          <td className="p-2 text-center font-semibold text-slate-600">{s.dist}</td>
                          <td className="p-2 text-right font-semibold text-slate-600">{s.s3renr}</td>
                          <td className="p-2 text-center font-bold text-slate-900">
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">{s.power} / {s.cap}</span>
                          </td>
                          <td className="p-2 text-right font-extrabold text-amber-700">{s.rent}</td>
                          <td className="p-2 text-right font-black text-emerald-700">{s.ebitda}</td>
                          <td className="p-2 text-center font-bold text-slate-700">{s.payback}</td>
                        </tr>
                      ))}

                      {/* LIGNE DE TOTAL CONSOLIDÉ 31 SITES */}
                      <tr className="bg-gradient-to-r from-blue-900 via-indigo-950 to-[#0b192c] text-white font-black text-xs">
                        <td className="p-3 text-center text-amber-300 font-black">TOT</td>
                        <td className="p-3 uppercase tracking-wider text-amber-300">Total Consolidé (31 Projets)</td>
                        <td className="p-3 text-slate-300">Grand Sud-Ouest</td>
                        <td className="p-3 font-mono text-[10px] text-cyan-300">Grappe Nouvelle-Aquitaine / Occitanie</td>
                        <td className="p-3 text-emerald-300 font-extrabold">31 Postes HTA</td>
                        <td className="p-3 text-center text-slate-300">7.2 km moy.</td>
                        <td className="p-3 text-right text-slate-300">90.1 k€ moy.</td>
                        <td className="p-3 text-center text-cyan-300 font-extrabold">15.5 MW / 32.36 MWh</td>
                        <td className="p-3 text-right text-amber-300 font-black">93 000 €/an</td>
                        <td className="p-3 text-right text-emerald-400 font-black text-sm">1.56 M€</td>
                        <td className="p-3 text-center text-emerald-300 font-black">4.6 ans</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pied de page institutionnel */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>ENR COURTAGE SAS • Synthèse Globale du Portefeuille M&amp;A</div>
                <div className="font-semibold text-slate-600">Consolidation Complète 31 Sites • 15.50 MW / 32.36 MWh</div>
                <div className="font-bold text-[#0b192c]">Planche 7 / {totalPagesCount} (Paysage)</div>
              </div>
            </section>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BARRE INFÉRIEURE PERSISTANTE : BOUTON IMPRESSION ET BOUTON FERMER BAS */}
        {/* ========================================================================= */}
        <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">
              {isPort ? 'Mode Portefeuille Consolidé (31 Projets / 15.5 MW)' : `Mode Simulation Unitaire (${selectedSite.name} - 500 kW)`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">
              {totalPagesCount} Planches A4 Paysage Pleine Largeur • Fonds Blancs • Loyer 3 000 €/an sur 20 ans
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressStep}</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Imprimer / Exporter en PDF (A4 Paysage)</span>
                </>
              )}
            </button>

            {/* Bouton Fermer Bas Droit */}
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Fermer la visionneuse"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Fermer</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
