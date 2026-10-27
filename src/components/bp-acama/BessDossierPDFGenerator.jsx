import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  SlidersHorizontal,
  AlertCircle,
  Table as TableIcon,
  Coins
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import BatteryStationVisualizer from '../developpement/BatteryStationVisualizer.jsx';
import { BESS_PORTFOLIO_SITES, getBessPortfolioSites } from '../../data/bessPortfolioData.js';
import { calculatePmt, computeBessFinancials } from '../../services/bessSimulationEngine.js';
import BessProjectSingleSheet from './BessProjectSingleSheet.jsx';
import BessDailyCycleVisualizer from './BessDailyCycleVisualizer.jsx';

// Composant interne Leaflet pour recentrer la carte sur les projets sélectionnés
function MapBoundsUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      } catch (err) {
        // Fallback silencieux
      }
    }
  }, [bounds, map]);
  return null;
}

// Helper pour le calcul dynamique des métriques et du Payback réel de chaque site du répertoire
const computeDynamicSiteMetrics = (site, fc = 2500) => {
  const customFc = fc !== undefined ? fc : (site?.fraisCommerciaux !== undefined ? site.fraisCommerciaux : 2500);
  const fin = computeBessFinancials(site, { fraisCommerciaux: customFc });
  return {
    capexTotal: fin.capexTotal,
    ebitdaAn1: fin.ebitdaAn1,
    caAnnuel: fin.caAnnuel,
    opexAnnuel: fin.opexAnnuel,
    turpeAnnuel: fin.turpeAnnuel,
    payback: fin.payback,
    paybackAnnees: fin.paybackAnnees,
    paybackFormatted: fin.paybackFormatted,
    triProjet: fin.triProjet,
    triProjetFormatted: fin.triProjetFormatted,
    zoneCre: fin.zoneCre,
    fin
  };
};

// Formateur monétaire
const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  return Math.round(val).toLocaleString('fr-FR') + ' €';
};

// Base de données consolidée des 31 sites BESS (15.5 MW / 32.36 MWh) hydratée avec computeBessFinancials
const RAW_SITES_DATABASE = [
  { id: 1, name: "PAILLOT", client: "PAILLOT Noël", address: "5 ZA des Plats", cp: "87600", city: "Rochechouart", dept: "87", gps: "45.847811, 0.852996", lat: 45.847811, lng: 0.852996, substation: "PLAUD", dist: "6.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 2, name: "BATIOT", client: "BATIOT Olivier", address: "72 Chemin du Campas", cp: "32220", city: "Mongausy", dept: "32", gps: "43.496370, 0.834241", lat: 43.496370, lng: 0.834241, substation: "SEMEZIES", dist: "5.9 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 3, name: "DOMERGUE MEUZAC", client: "DOMERGUE David", address: "1725 Route du Grand Pré", cp: "87380", city: "Meuzac", dept: "87", gps: "45.566247, 1.397687", lat: 45.566247, lng: 1.397687, substation: "LE REPAIRE", dist: "8.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 4, name: "CUBERTAFON", client: "CUBERTAFON René", address: "8 Route de la Barrière", cp: "19210", city: "Saint-Julien-le-Vendômois", dept: "19", gps: "45.460274, 1.298160", lat: 45.460274, lng: 1.298160, substation: "LUBERSAC", dist: "8.3 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 5, name: "PLANTE", client: "PLANTE Jean-Pierre", address: "581 Route Départementale 817", cp: "40300", city: "Port-de-Lanne", dept: "40", gps: "43.558940, -1.199501", lat: 43.558940, lng: -1.199501, substation: "GUICHE", dist: "4.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 6, name: "PRAVIE", client: "PRAVIE Clémence", address: "336 Chemin de Falieres", cp: "82170", city: "Grisolles", dept: "82", gps: "43.806232, 1.295833", lat: 43.806232, lng: 1.295833, substation: "LESQUIVE 2", dist: "2.3 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 7, name: "LATOURNERIE", client: "LATOURNERIE Franck", address: "467 Chemin des Terres Vieilles", cp: "24310", city: "Brantôme en Périgord", dept: "24", gps: "45.328888, 0.651040", lat: 45.328888, lng: 0.651040, substation: "BRANTOME", dist: "3.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 8, name: "DAVID", client: "DAVID Louis", address: "1053 route de saint-cyr les champagnes", cp: "19350", city: "Concèze", dept: "19", gps: "45.353329, 1.314195", lat: 45.353329, lng: 1.314195, substation: "LUBERSAC", dist: "8.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 9, name: "GRANGER", client: "GRANGER BRUNO", address: "3 Route des Forges", cp: "19210", city: "Saint-Éloy-les-Tuileries", dept: "19", gps: "45.442533, 1.267710", lat: 45.442533, lng: 1.267710, substation: "LUBERSAC", dist: "10.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 10, name: "CASTEBRUNET 2", client: "CASTEBRUNET Jérémy", address: "763 Chemin de Calsos", cp: "82300", city: "Caussade", dept: "82", gps: "44.123740, 1.564486", lat: 44.123740, lng: 1.564486, substation: "LERE", dist: "5.7 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 11, name: "BERTRANDIE", client: "BERTRANDIE Sébastien", address: "301 Route de la Roche", cp: "24240", city: "Monestier", dept: "24", gps: "44.773569, 0.300107", lat: 44.773569, lng: 0.300107, substation: "STE-FOY-LA-GRANDE", dist: "9.0 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 12, name: "GIOT", client: "GIOT Joachim", address: "2 Le Cluzeau", cp: "23600", city: "Leyrat", dept: "23", gps: "46.360561, 2.306566", lat: 46.360561, lng: 2.306566, substation: "BOUSSAC", dist: "5.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 13, name: "ARBOIN", client: "ARBOIN Régis", address: "47 Chemin de piquemole", cp: "47120", city: "Duras", dept: "47", gps: "44.659496, 0.222735", lat: 44.659496, lng: 0.222735, substation: "LA SAUVETAT", dist: "11.8 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 14, name: "MISSAULT LACOUSSIÈRE", client: "MISSAULT David", address: "1348 Route des Bouleaux", cp: "24470", city: "Saint-Saud-Lacoussière", dept: "24", gps: "45.558769, 0.804488", lat: 45.558769, lng: 0.804488, substation: "NONTRON", dist: "13.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 15, name: "MEILLAT 1", client: "MEILLAT Maxime", address: "1a La Ribiere", cp: "23210", city: "Mourioux-Vieilleville", dept: "23", gps: "46.082964, 1.638518", lat: 46.082964, lng: 1.638518, substation: "CHATELUS 2", dist: "5.4 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 16, name: "SOULIGNAC", client: "SOULIGNAC Thierry", address: "Route de Lombardie", cp: "33860", city: "Val-de-Livenne", dept: "33", gps: "45.264357, -0.550408", lat: 45.264357, lng: -0.550408, substation: "ETAULIERS", dist: "7.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 17, name: "CHAUFFAILLE", client: "CHAUFFAILLE Franck", address: "2 Route de Saint Yrieix", cp: "24270", city: "PAYZAC", dept: "24", gps: "45.436230, 1.288720", lat: 45.436230, lng: 1.288720, substation: "LUBERSAC", dist: "6.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 18, name: "CIROLI", client: "CIROLI", address: "66 Lieu Dit Pinasse", cp: "33890", city: "Juillac", dept: "33", gps: "44.809547, 0.037304", lat: 44.809547, lng: 0.037304, substation: "AURIOLLES", dist: "7.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 19, name: "BOURDETTES", client: "BOURDETTES Sandrine", address: "10 Route de la Bohème", cp: "65140", city: "Mansan", dept: "65", gps: "43.343730, 0.194628", lat: 43.343730, lng: 0.194628, substation: "VIC-EN-BIGORRE", dist: "10.8 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 20, name: "CASTEBRUNET 1", client: "CASTEBRUNET Jérémy", address: "1074 Chemin de Guillounet", cp: "82300", city: "Caussade", dept: "82", gps: "44.117157, 1.566758", lat: 44.117157, lng: 1.566758, substation: "LERE", dist: "5.5 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 21, name: "FRECHEVILLE", client: "FRECHEVILLE Mathieu", address: "45 Cluzelou-haut", cp: "47210", city: "SAINT EUTROPE DE BORN", dept: "47", gps: "44.588327, 0.665431", lat: 44.588327, lng: 0.665431, substation: "CANCON", dist: "7.2 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 22, name: "CASTEBRUNET 3", client: "CASTEBRUNET Jérémy", address: "93 Chemin des Peyrières", cp: "82300", city: "Monteils", dept: "82", gps: "44.165754, 1.564963", lat: 44.165754, lng: 1.564963, substation: "LERE", dist: "3.6 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 23, name: "DOUMENS", client: "DOUMENS Morgan", address: "4 Route de Salleboeuf", cp: "33750", city: "Beychac-et-Caillau", dept: "33", gps: "44.870054, -0.397698", lat: 44.870054, lng: -0.397698, substation: "POMPIGNAC", dist: "4.0 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 24, name: "HOUSSAIT-YOUNG", client: "HOUSSAIT-YOUNG Jérôme", address: "94 Route d'Hourtin", cp: "33930", city: "Vendays-Montalivet", dept: "33", gps: "45.338321, -1.071016", lat: 45.338321, lng: -1.071016, substation: "ST-VIVIEN", dist: "9.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 25, name: "MISSAULT FRESSENGEAS", client: "MISSAULT David", address: "Route de la Baine", cp: "24800", city: "Saint-Martin-de-Fressengeas", dept: "24", gps: "45.438589, 0.815692", lat: 45.438589, lng: 0.815692, substation: "THIVIERS", dist: "6.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 26, name: "MEILLAT 2", client: "MEILLAT Maxime", address: "1a la Ribiére", cp: "23210", city: "Mourioux-Vieilleville", dept: "23", gps: "46.081523, 1.633909", lat: 46.081523, lng: 1.633909, substation: "CHATELUS 2", dist: "5.4 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 27, name: "DOMERGUE ARGENCES", client: "DOMERGUE David", address: "1 Route de Plagnes", cp: "12420", city: "Argences en Aubrac", dept: "12", gps: "44.807528, 2.790446", lat: 44.807528, lng: 2.790446, substation: "RUEYRES", dist: "5.9 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 28, name: "COMBY", client: "COMBY Fabrice", address: "14 Route de Besse", cp: "19210", city: "Saint-Éloy-les-Tuileries", dept: "19", gps: "45.452807, 1.284563", lat: 45.452807, lng: 1.284563, substation: "LUBERSAC", dist: "10.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" },
  { id: 29, name: "CASTEBRUNET 4", client: "CASTEBRUNET Jérémy", address: "3750 Route de Bioule", cp: "82300", city: "Saint-Cirq", dept: "82", gps: "44.124392, 1.583302", lat: 44.124392, lng: 1.583302, substation: "LERE", dist: "6.2 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", rent: "3 000 €" }
];

const SITES_DATABASE = RAW_SITES_DATABASE.map(s => {
  const m = computeDynamicSiteMetrics(s);
  return {
    ...s,
    ebitda: fmtEur(m.ebitdaAn1),
    payback: m.paybackFormatted,
    ebitdaAn1: m.ebitdaAn1,
    paybackAnnees: m.paybackAnnees
  };
});

// Matrice Financière 15 ans avec dégradation batterie 2.2%/an, FCR 15.1h/j, pertes recharge et loyer 3 000 €/an sur 20 ans
const YEARS_15 = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040];

const generateBess15YearMatrix = () => {
  const revFcr = [];
  const revCapa = [];
  const revArb = [];
  const opexTurpe = [];
  const opexRecharge = [];
  const opexAgregateur = [];
  const opexAutres = [];

  for (let i = 0; i < 15; i++) {
    const infl = Math.pow(1.02, i);
    const deg = Math.pow(1 - 0.022, i);

    const fcr = 53936 * infl;
    const capa = 8750 * infl;
    const arb = 30485 * deg * infl;
    const totalRev = fcr + capa + arb;

    const turpe = 8317 * infl;
    const recharge = 3118 * deg * infl;
    const agregateur = totalRev * 0.18;
    const autres = 8750 * infl;

    revFcr.push(Math.round(fcr));
    revCapa.push(Math.round(capa));
    revArb.push(Math.round(arb));
    opexTurpe.push(Math.round(turpe));
    opexRecharge.push(Math.round(recharge));
    opexAgregateur.push(Math.round(agregateur));
    opexAutres.push(Math.round(autres));
  }

  return { revFcr, revCapa, revArb, opexTurpe, opexRecharge, opexAgregateur, opexAutres };
};

const FINANCIAL_MATRIX = generateBess15YearMatrix();

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
  portfolioData = null,
  projects = []
}) {
  const [activeMode, setActiveMode] = useState(initialMode || 'portfolio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Frais commerciaux configurables pour l'étude (Standard : 5 000 €/MW = 2 500 € pour 500 kW)
  const [fraisCommerciaux, setFraisCommerciaux] = useState(() => {
    return portfolioData?.fraisCommerciaux ?? batteryConfig?.fraisCommerciaux ?? 2500;
  });

  useEffect(() => {
    if (portfolioData?.fraisCommerciaux !== undefined) {
      setFraisCommerciaux(portfolioData.fraisCommerciaux);
    } else if (batteryConfig?.fraisCommerciaux !== undefined) {
      setFraisCommerciaux(batteryConfig.fraisCommerciaux);
    }
  }, [portfolioData?.fraisCommerciaux, batteryConfig?.fraisCommerciaux]);

  // Base de données consolidée des sites BESS (hydratée depuis portfolioData ou getBessPortfolioSites)
  const allAvailableSites = useMemo(() => {
    const targetPort = portfolioData?.selectedPortfolio || 'ALL';
    const rawSites = (portfolioData?.analyzedSites && portfolioData.analyzedSites.length > 0)
      ? portfolioData.analyzedSites
      : getBessPortfolioSites(projects, targetPort);

    if (!rawSites || rawSites.length === 0) {
      return RAW_SITES_DATABASE.map((s, idx) => {
        const m = computeDynamicSiteMetrics(s, fraisCommerciaux);
        return {
          ...s,
          id: s.id || `bess_site_${idx + 1}`,
          capexTotal: m.capexTotal,
          ebitda: fmtEur(m.ebitdaAn1),
          payback: m.paybackFormatted,
          ebitdaAn1: m.ebitdaAn1,
          paybackAnnees: m.paybackAnnees
        };
      });
    }

    return rawSites.map((s, idx) => {
      const m = computeDynamicSiteMetrics(s, fraisCommerciaux);
      const cp = s.cp || s.postcode || '';
      return {
        ...s,
        id: s.id || `bess_site_${idx + 1}`,
        client: s.client || s.client_name || 'Client',
        cp,
        dept: s.dept || (cp ? cp.substring(0, 2) : 'FR'),
        gps: s.gps || (s.lat && s.lng ? `${Number(s.lat).toFixed(6)}, ${Number(s.lng).toFixed(6)}` : ''),
        substation: typeof s.substation === 'object' ? (s.substation?.name || 'ODRE') : (s.substation || 'ODRE'),
        dist: s.dist || (s.substation?.distanceKm ? `${s.substation.distanceKm} km` : '5.0 km'),
        s3renr: s.s3renr || s.substation?.quotePartS3renr || "92.73 k€/MW",
        power: s.power || `${s.powerKw || 500} kW`,
        cap: s.cap || `${s.capacityKwh || 1044} kWh`,
        rent: s.rent ? (typeof s.rent === 'number' ? fmtEur(s.rent) : s.rent) : "3 000 €",
        capexTotal: m.capexTotal,
        ebitda: fmtEur(m.ebitdaAn1),
        payback: m.paybackFormatted,
        ebitdaAn1: m.ebitdaAn1,
        paybackAnnees: m.paybackAnnees
      };
    });
  }, [portfolioData?.analyzedSites, portfolioData?.selectedPortfolio, projects, fraisCommerciaux]);

  const [selectedProjectIds, setSelectedProjectIds] = useState(() => allAvailableSites.map(s => s.id));
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const scrollContainerRef = useRef(null);

  const isPort = activeMode === 'portfolio';

  // 1. Projets BESS filtrés selon la sélection de l'utilisateur
  const selectedBessSites = isPort
    ? allAvailableSites.filter(s => selectedProjectIds.includes(s.id))
    : allAvailableSites;
  const mult = isPort ? selectedBessSites.length : 1;
  const portName = portfolioData?.selectedPortfolio || 'VOLTA';

  // Si tous les projets tiennent sur la planche 8 (<= 18 sites), on omet la planche 9
  const totalPagesCount = isPort ? (selectedBessSites.length > 18 ? 9 : 8) : 7;

  // Synchronisation dynamique si allAvailableSites change
  useEffect(() => {
    if (allAvailableSites.length > 0) {
      setSelectedProjectIds(prev => {
        if (prev && prev.length > 0) {
          const valid = prev.filter(id => allAvailableSites.some(s => s.id === id));
          if (valid.length > 0) return valid;
        }
        return allAvailableSites.map(s => s.id);
      });
    }
  }, [allAvailableSites]);

  // Synchronisation dynamique du mode lorsque les props changent
  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode === 'complete' ? 'portfolio' : initialMode);
    }
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (activePageIndex >= totalPagesCount) {
      setActivePageIndex(0);
    }
  }, [totalPagesCount, activePageIndex]);

  // Auto-déclenchement si mode complete demandé
  useEffect(() => {
    if (isOpen && (initialMode === 'complete' || portfolioData?.autoExportType === 'complete')) {
      const timer = setTimeout(() => {
        handleGeneratePdf('complete');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode, portfolioData]);

  // Recherche du site unitaire
  const selectedSite = allAvailableSites.find(s => s.name?.toUpperCase() === (projectData?.name || '').toUpperCase()) || allAvailableSites[0] || SITES_DATABASE[7]; // Concèze

  // Nom institutionnel affiché dynamique
  const headerProjectTitle = isPort
    ? `Portefeuille Consolidé BESS ${(mult * 0.5).toFixed(2).replace('.', ',')} MW / ${(mult * 1.044).toFixed(2).replace('.', ',')} MWh`
    : `Centrale BESS Stand-Alone 500 kW / 1 044 kWh (${projectData?.name || selectedSite.name})`;

  const headerProjectSubtitle = isPort
    ? `Grappe territoriale de ${mult} unité${mult > 1 ? 's standardisées' : ' standardisée'} (500 kW / 1 044 kWh) raccordée${mult > 1 ? 's' : ''} au réseau HTA 20 kV Enedis dans le Grand Sud-Ouest (Nouvelle-Aquitaine & Occitanie). Monétisation agrégée en Value Stacking sous le régime TURPE 7 délibéré CRE 2025-227.`
    : `Unité de stockage stationnaire autonome par batterie LFP (4 armoires CESC Mercury 261) raccordée au réseau HTA 20 kV Enedis (${selectedSite.substation} - ${selectedSite.dist}). Monétisation optimisée en Value Stacking sous le barème TURPE 7.`;

  // Paramètres de dette senior dynamiques
  const debtDuration = portfolioData?.debtDuration ?? 12;
  const debtRate = portfolioData?.debtRate ?? 4.30;

  // Matrice financière dynamique consolidée calculée site par site
  const dynamicFinancialMatrix = useMemo(() => {
    const sitesToUse = isPort ? selectedBessSites : [selectedSite];
    const revFcr = [];
    const revCapa = [];
    const revArb = [];
    const opexTurpe = [];
    const opexRecharge = [];
    const opexAgregateur = [];
    const opexAutres = [];
    const debtService = [];

    const siteSimulations = sitesToUse.map(s => {
      return computeBessFinancials(s, {
        studyDuration: 15,
        debtDuration: debtDuration || 12,
        debtRate: debtRate || 4.30,
        fraisCommerciaux: s.fraisCommerciaux !== undefined ? s.fraisCommerciaux : fraisCommerciaux
      });
    });

    for (let i = 0; i < 15; i++) {
      let sumFcr = 0;
      let sumCapa = 0;
      let sumArb = 0;
      let sumTurpe = 0;
      let sumRecharge = 0;
      let sumAgreg = 0;
      let sumAutres = 0;
      let sumDebt = 0;

      siteSimulations.forEach(fin => {
        const row = fin.rows?.[i] || {};
        sumFcr += (row.revFCR || 0);
        sumCapa += (row.revCapacite || 0);
        sumArb += (row.revArbitrage || 0);
        sumTurpe += (row.turpeAn || 0);
        sumRecharge += (row.coutRechargeAn || 0);
        sumAgreg += (row.commAgregateur || 0);
        const other = (row.maint || 0) + (row.assur || 0) + (row.revBailleur || 0);
        sumAutres += other;
        sumDebt += (row.serviceDette || 0);
      });

      revFcr.push(Math.round(sumFcr));
      revCapa.push(Math.round(sumCapa));
      revArb.push(Math.round(sumArb));
      opexTurpe.push(Math.round(sumTurpe));
      opexRecharge.push(Math.round(sumRecharge));
      opexAgregateur.push(Math.round(sumAgreg));
      opexAutres.push(Math.round(sumAutres));
      debtService.push(Math.round(sumDebt));
    }

    return { revFcr, revCapa, revArb, opexTurpe, opexRecharge, opexAgregateur, opexAutres, debtService };
  }, [isPort, selectedBessSites, selectedSite, debtRate, debtDuration, fraisCommerciaux]);

  // Calcul dynamique du DSCR moyen
  const dscrArray = YEARS_15.map((_, i) => {
    const rev = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
    const opex = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
    const ebitda = rev - opex;
    const debtVal = dynamicFinancialMatrix.debtService[i];
    if (debtVal === 0) return null;
    return ebitda / debtVal;
  });
  const validDscr = dscrArray.filter(v => v !== null);
  const avgDscr = validDscr.length > 0 ? (validDscr.reduce((a, b) => a + b, 0) / validDscr.length) : 1.98;

  // Totaux cumulés et métriques unifiées basés exclusivement sur les projets sélectionnés
  const singleMetrics = !isPort ? computeDynamicSiteMetrics(selectedSite, fraisCommerciaux) : null;

  // Chronique 15 ans pour le Compte de Résultat Consolidé affiché en bas de Planche 1
  const bessP1Chronique = useMemo(() => {
    let cumul = 0;
    return YEARS_15.map((_, i) => {
      const ca = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
      const opex = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
      const ebitda = ca - opex;
      const serviceDette = dynamicFinancialMatrix.debtService[i];
      const cfNet = ebitda - serviceDette;
      cumul += cfNet;
      return {
        year: i + 1,
        ca,
        opex,
        ebitda,
        serviceDette,
        cfNet,
        cumulCf: cumul
      };
    });
  }, [dynamicFinancialMatrix]);
  const totalEbitdaAllSites = selectedBessSites.reduce((sum, s) => sum + s.ebitdaAn1, 0);
  const totalCaAllSites = selectedBessSites.reduce((sum, s) => sum + computeDynamicSiteMetrics(s, fraisCommerciaux).caAnnuel, 0);
  const totalCapexAllSites = selectedBessSites.reduce((sum, s) => sum + computeDynamicSiteMetrics(s, fraisCommerciaux).capexTotal, 0);
  const totalRentAllSites = selectedBessSites.reduce((sum, s) => {
    const val = typeof s.rent === 'number' ? s.rent : parseFloat(String(s.rent || '0').replace(/[^0-9]/g, ''));
    return sum + (isNaN(val) || val === 0 ? (s.portfolio === 'FARADAY' ? 2000 : 3000) : val);
  }, 0);

  // Totaux cumulés 15 ans
  const cumulRev = YEARS_15.reduce((acc, _, i) => acc + (dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i]), 0);
  const cumulOpex = YEARS_15.reduce((acc, _, i) => acc + (dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i]), 0);
  const cumulEbitda = cumulRev - cumulOpex;
  const cumulDebt = dynamicFinancialMatrix.debtService.reduce((acc, v) => acc + v, 0);
  const cumulCf = cumulEbitda - cumulDebt;

  // Métriques KPI institutionnelles
  const kpi = {
    irrProject: isPort ? '20.5%' : (singleMetrics?.triProjetFormatted || '17.2%'),
    irrEquity: isPort ? 'TRI Equity : 37.4%' : 'TRI Equity : 38.1%',
    payback: isPort ? '5.0 ans' : (singleMetrics?.paybackFormatted || '5.0 ans'),
    paybackEquity: isPort ? 'Sur Fonds Propres : 2.2 ans' : 'Sur Fonds Propres : 2.2 ans',
    ebitda: isPort ? `${(totalEbitdaAllSites / 1000000).toFixed(2)} M€` : fmtEur(singleMetrics?.ebitdaAn1 || 56215),
    ebitdaSub: isPort ? `EBITDA consolidé net (${mult} site${mult > 1 ? 's' : ''})` : 'Marge opérationnelle ~61%',
    revenue: isPort ? `${(totalCaAllSites / 1000000).toFixed(2)} M€` : fmtEur(singleMetrics?.caAnnuel || 93171),
    revenueSub: isPort ? `Value Stacking ${mult} site${mult > 1 ? 's' : ''} (2 c/j)` : '2 cycles journaliers (24h)',
    capex: isPort ? `${(totalCapexAllSites / 1000000).toFixed(2)} M€` : fmtEur(singleMetrics?.capexTotal || 292400),
    capexSub: isPort ? `~${Math.round(totalCapexAllSites / (mult || 1) / 1000)} k€ / site raccordé` : '585 € / kW installé',
    turpeGain: isPort ? `+${Math.round(mult * 14183).toLocaleString('fr-FR')} €` : '+14 183 €',
    turpeSub: isPort ? 'Gain annuel réseau consolidé' : 'Économie directe vs barème',
    rent: isPort ? `${totalRentAllSites.toLocaleString('fr-FR')} € / an` : '3 000 € / an',
    rentSub: isPort ? `${mult} baux notariés 20 ans verrouillés` : 'Bail notarié 20 ans (750 €/brique)',
    fcr: isPort ? `${Math.round(mult * 53936).toLocaleString('fr-FR')} € / an` : '53 936 € / an',
    arb: isPort ? `${Math.round(mult * 30485).toLocaleString('fr-FR')} € / an` : '30 485 € / an',
    capa: isPort ? `${Math.round(mult * 8750).toLocaleString('fr-FR')} € / an` : '8 750 € / an',
    totalRevDonut: isPort ? `${(totalCaAllSites / 1000000).toFixed(2)} M€ / an` : `${fmtEur(singleMetrics?.caAnnuel || 93171)} / an`,
    totalRevSub: isPort ? `Portefeuille Consolidé ${(mult * 0.5).toFixed(1)} MW` : 'Unité 500 kW / 1 044 kWh',
    tableTitle: isPort ? (<>Plan d'Affaires Prévisionnel Consolidé sur 15 Ans<br />({mult} Sites / {(mult * 0.5).toFixed(1)} MW)</>) : (<>Plan d'Affaires Prévisionnel sur 15 Ans<br />(Unitaire 500 kW / 1 044 kWh)</>),
    badgePaybackSmall: (
      <>
        <span className="whitespace-nowrap">{isPort ? '5.0 ans (Projet)' : `${singleMetrics?.paybackFormatted || '5.0 ans'} (Projet)`}</span>
        <br />
        <span className="whitespace-nowrap text-[10px] font-bold text-emerald-700">2.2 ans (Equity)</span>
      </>
    ),
    dscrMoyenBadge: isPort ? (
      <>
        <span className="whitespace-nowrap">DSCR Portefeuille : {avgDscr.toFixed(2)}</span>
        <br />
        <span className="whitespace-nowrap text-[10px] font-bold text-blue-700">(Excellence bancaire)</span>
      </>
    ) : (
      <>
        <span className="whitespace-nowrap">DSCR Moyen : {avgDscr.toFixed(2)}</span>
        <br />
        <span className="whitespace-nowrap text-[10px] font-bold text-blue-700">(Min bancaire 1.15x)</span>
      </>
    ),
    techConfig: isPort ? `${mult * 4} armoires extérieures réparties sur ${mult} sites` : "4 armoires extérieures CESC Mercury 261 (1.15m x 1.44m x 2.38m)",
    techPowerCap: isPort ? `${(mult * 0.5).toFixed(1)} MW / ${(mult * 1.044).toFixed(2)} MWh consolidés` : "500 kW / 1 044 kWh (Ratio 2h de décharge)"
  };

  // Répartition des sites sélectionnés pour les planches 8 et 9
  const sitesP1 = selectedBessSites.slice(0, 18);
  const sitesP2 = selectedBessSites.slice(18);

  // Helpers pour la modale de sélection multi-projets BESS
  const filteredModalSites = allAvailableSites.filter(s => {
    if (!modalSearchTerm) return true;
    const term = modalSearchTerm.toLowerCase();
    const subName = typeof s.substation === 'object' ? s.substation?.name : s.substation;
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.client || '').toLowerCase().includes(term) ||
      (s.city || '').toLowerCase().includes(term) ||
      (String(subName || '')).toLowerCase().includes(term) ||
      (s.dept || '').includes(term) ||
      (s.cp || '').includes(term)
    );
  });

  const modalSelectedSites = allAvailableSites.filter(s => selectedProjectIds.includes(s.id));
  const modalSelectedPowerMw = modalSelectedSites.length * 0.5;
  const modalSelectedCapMwh = modalSelectedSites.length * 1.044;
  const modalSelectedCapex = modalSelectedSites.reduce((sum, s) => sum + s.capexTotal, 0);
  const modalSelectedEbitda = modalSelectedSites.reduce((sum, s) => sum + s.ebitdaAn1, 0);

  const toggleSiteSelection = (id) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Données du graphique 15 ans
  const maxEbitda = isPort ? 2100000 : 70000;
  const chartBars = YEARS_15.map((y, i) => {
    const rev = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
    const opex = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
    const ebitda = rev - opex;
    const debt = dynamicFinancialMatrix.debtService[i];
    const cf = ebitda - debt;
    return { year: y, ebitda, cf };
  });

  /**
   * Extrait et agrège toutes les règles CSS de l'application (Vite/Tailwind, styles inline et balises distantes)
   * pour injection synchrone dans le sandbox html2canvas via une balise <style> dédiée.
   */
  const getHighFidelityStyles = async () => {
    let cssOutput = '';
    const fontImports = [
      "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');"
    ];

    // 1. Lire document.styleSheets
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          if (sheet && sheet.cssRules) {
            for (let j = 0; j < sheet.cssRules.length; j++) {
              const rule = sheet.cssRules[j];
              if (rule.type === CSSRule.IMPORT_RULE) {
                fontImports.push(rule.cssText);
              } else {
                cssOutput += rule.cssText + '\n';
              }
            }
          }
        } catch (errSheet) {
          // Ignorer SecurityError sur les feuilles cross-origin
        }
      }
    } catch (err) {
      console.warn('[PDF] Erreur lecture document.styleSheets:', err);
    }

    // 2. Si le CSS extrait est insuffisant (< 25 000 caractères, typique quand le CSS externe n'a pas pu être lu directement)
    // Fetcher directement tous les fichiers <link rel="stylesheet">
    if (cssOutput.length < 25000) {
      try {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        for (const link of links) {
          if (link.href) {
            try {
              const res = await fetch(link.href, { cache: 'force-cache' });
              if (res.ok) {
                const text = await res.text();
                cssOutput += '\n' + text;
              }
            } catch (fetchErr) {
              console.warn('[PDF] Impossible de charger le CSS distant:', link.href, fetchErr);
            }
          }
        }
      } catch (err) {
        console.warn('[PDF] Erreur globale lors du fetch des link stylesheets:', err);
      }
    }

    // 3. Ajouter également toutes les balises <style> inline du document actuel
    try {
      const inlineStyles = document.querySelectorAll('style');
      inlineStyles.forEach(s => {
        if (s.textContent) {
          cssOutput += '\n' + s.textContent;
        }
      });
    } catch (err) {
      console.warn('[PDF] Erreur inline styles:', err);
    }

    return fontImports.join('\n') + '\n\n' + cssOutput;
  };

  // Moteur d'export PDF A4 Paysage Pleine Largeur (Supporte Portfolio planches ou Étude Complète fiches)
  const handleGeneratePdf = async (exportType = 'portfolio') => {
    setIsGenerating(true);
    const isComplete = exportType === 'complete';
    setProgressStep(isComplete ? 'Initialisation de l\'Étude Complète BESS...' : 'Initialisation du moteur d’impression...');
    await new Promise(r => setTimeout(r, 200));

    try {
      // 1. Précharger tous les styles CSS haute fidélité et attendre les polices web
      setProgressStep('Chargement des polices et des styles haute fidélité...');
      const appStyles = await getHighFidelityStyles();
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch (fontErr) {
        // Ignorer si l'API document.fonts n'est pas supportée
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Construction de la liste ordonnée des pages à capturer
      const pagesToCapture = [];
      const planchesCount = totalPagesCount;

      // 1. Les planches du dossier portefeuille (Planches 1 à totalPagesCount)
      for (let i = 1; i <= planchesCount; i++) {
        const el = document.getElementById(`bess-planche-container-${i}`);
        if (el) {
          pagesToCapture.push({
            containerId: `bess-planche-container-${i}`,
            title: `Planche ${i}/${totalPagesCount} : ${plancheTitles[i - 1]}`,
            type: 'portfolio',
            index: i
          });
        }
      }

      // 2. Si Étude Complète : ajouter les fiches unitaires BESS des sites sélectionnés
      if (isComplete) {
        for (let j = 1; j <= selectedBessSites.length; j++) {
          const site = selectedBessSites[j - 1];
          pagesToCapture.push({
            containerId: `bess-single-site-container-${j}`,
            title: `Fiche Site ${j}/${selectedBessSites.length} : ${site?.name || `Site ${j}`}`,
            type: 'site',
            index: j,
            site
          });
        }
      }

      const totalTargetPages = pagesToCapture.length;

      for (let i = 0; i < totalTargetPages; i++) {
        const target = pagesToCapture[i];
        const container = document.getElementById(target.containerId);
        if (!container) continue;

        const page = container.querySelector('.bess-render-page');
        if (!page) continue;

        if (isComplete) {
          if (target.type === 'portfolio') {
            setProgressStep(`Capture Planche Portefeuille ${target.index}/${totalPagesCount} (${plancheTitles[target.index - 1] || ''}) [Page ${i + 1}/${totalTargetPages}]...`);
          } else {
            setProgressStep(`Capture Fiche Projet ${target.index}/${selectedBessSites.length} (${target.site?.name || ''}) [Page ${i + 1}/${totalTargetPages}]...`);
          }
        } else {
          setProgressStep(`Capture Planche ${i + 1} / ${totalTargetPages} (${target.title})...`);
        }

        // Forcer temporairement l'affichage du conteneur pour la capture
        const prevDisplay = container.style.display;
        container.style.display = 'flex';
        page.scrollIntoView({ block: 'start', inline: 'nearest' });

        // Laisser un court temps de rendu pour le DOM, la carte et le visualiseur 3D
        const waitMs = (target.type === 'portfolio' && target.index === 7) ? 250 : 70;
        await new Promise(r => setTimeout(r, waitMs));

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 1380,
          height: 940,
          windowWidth: 1440,
          windowHeight: 1024,
          scrollX: 0,
          scrollY: 0,
          allowTaint: true,
          onclone: (clonedDoc) => {
            // 1. Injecter l'intégralité du CSS sous forme de balise <style> synchrone dans clonedDoc.head
            if (appStyles) {
              const styleTag = clonedDoc.createElement('style');
              styleTag.setAttribute('type', 'text/css');
              styleTag.appendChild(clonedDoc.createTextNode(appStyles));
              clonedDoc.head.appendChild(styleTag);
            }

            // 2. Nettoyer les balises <link rel="stylesheet"> qui risquent d'échouer ou de bloquer le sandbox
            clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(l => l.remove());

            // 3. Base URL pour résoudre logos et images relatives
            const baseTag = clonedDoc.createElement('base');
            baseTag.href = window.location.origin;
            clonedDoc.head.appendChild(baseTag);

            // 4. Supprimer explicitement les éléments marqués ignore
            clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(el => el.remove());

            // 5. Forcer la police globale sur le document cloné
            clonedDoc.documentElement.style.fontFamily = "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            clonedDoc.body.style.fontFamily = "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

            // 6. Isoler strictement la page courante en masquant tous les autres conteneurs
            const allContainers = clonedDoc.querySelectorAll('[id^="bess-planche-container-"], [id^="bess-single-site-container-"]');
            allContainers.forEach((c) => {
              if (c.id === target.containerId) {
                c.style.display = 'flex';
                c.style.flexDirection = 'column';
                c.style.alignItems = 'center';
                c.style.margin = '0';
                c.style.padding = '0';
              } else {
                c.style.display = 'none';
              }
            });

            // 7. Réinitialiser les marges et scrolls du document cloné
            clonedDoc.documentElement.scrollTop = 0;
            clonedDoc.body.scrollTop = 0;
            clonedDoc.documentElement.style.margin = '0';
            clonedDoc.documentElement.style.padding = '0';
            clonedDoc.body.style.margin = '0';
            clonedDoc.body.style.padding = '0';

            const scrollBox = clonedDoc.querySelector('[class*="overflow-y-auto"]');
            if (scrollBox) {
              scrollBox.style.padding = '0';
              scrollBox.style.margin = '0';
              scrollBox.scrollTop = 0;
            }

            // 8. Forcer les dimensions exactes sur l'élément de page cloné
            const targetContainer = clonedDoc.getElementById(target.containerId);
            const clonedPage = targetContainer?.querySelector('.bess-render-page');
            if (clonedPage) {
              clonedPage.style.width = '1380px';
              clonedPage.style.minWidth = '1380px';
              clonedPage.style.maxWidth = '1380px';
              clonedPage.style.height = '940px';
              clonedPage.style.minHeight = '940px';
              clonedPage.style.maxHeight = '940px';
              clonedPage.style.boxSizing = 'border-box';
              clonedPage.style.overflow = 'hidden';

              // Copier le contenu de tous les <canvas> (WebGL Three.js, Leaflet Canvas) depuis le DOM réel
              const origCanvases = page.querySelectorAll('canvas');
              const clonedCanvases = clonedPage.querySelectorAll('canvas');
              origCanvases.forEach((origCanvas, idx) => {
                const clonedCanvas = clonedCanvases[idx];
                if (clonedCanvas && origCanvas.width > 0 && origCanvas.height > 0) {
                  try {
                    clonedCanvas.width = origCanvas.width;
                    clonedCanvas.height = origCanvas.height;
                    const ctx = clonedCanvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(origCanvas, 0, 0);
                    }
                  } catch (e) {
                    console.warn('[PDF] Impossible de copier le canvas:', e);
                  }
                }
              });
            }

            // 9. Correction Leaflet : convertir translate3d en top/left pour html2canvas
            const leafletPanes = clonedDoc.querySelectorAll('.leaflet-map-pane, .leaflet-tile-pane, .leaflet-overlay-pane, .leaflet-marker-pane, .leaflet-tooltip-pane, .leaflet-popup-pane, .leaflet-shadow-pane');
            leafletPanes.forEach(pane => {
              const transform = pane.style.transform || '';
              const match = transform.match(/translate3d\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/);
              if (match) {
                pane.style.transform = 'none';
                pane.style.left = match[1] + 'px';
                pane.style.top = match[2] + 'px';
              }
            });
            const leafletTiles = clonedDoc.querySelectorAll('.leaflet-tile');
            leafletTiles.forEach(tile => {
              const transform = tile.style.transform || '';
              const match = transform.match(/translate3d\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/);
              if (match) {
                tile.style.transform = 'none';
                tile.style.left = match[1] + 'px';
                tile.style.top = match[2] + 'px';
                tile.style.position = 'absolute';
              }
            });
            const svgPanes = clonedDoc.querySelectorAll('.leaflet-overlay-pane svg');
            svgPanes.forEach(svg => {
              const transform = svg.style.transform || '';
              const match = transform.match(/translate3d\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/);
              if (match) {
                svg.style.transform = 'none';
                svg.style.left = match[1] + 'px';
                svg.style.top = match[2] + 'px';
              }
            });
          }
        });

        // Restaurer le style d'affichage d'origine
        container.style.display = prevDisplay;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        // Pleine largeur exacte (0 marge pour couvrir 100% de la page A4 paysage)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      let fileName = '';
      if (isComplete) {
        fileName = `Etude_Complete_BESS_Portefeuille_${selectedBessSites.length}_Sites_${totalPagesCount + selectedBessSites.length}_Pages_${fileDate}.pdf`;
      } else if (isPort) {
        fileName = `Dossier_Investissement_BESS_Portefeuille_${selectedBessSites.length}_Sites_${(selectedBessSites.length * 0.5).toFixed(1)}MW_TURPE7_${fileDate}.pdf`;
      } else {
        fileName = `Dossier_Investissement_BESS_${projectData?.name || 'Unitaire_500kW'}_TURPE7_${fileDate}.pdf`;
      }

      setProgressStep('Finalisation et enregistrement du document...');
      pdf.save(fileName);
      setIsGenerating(false);
    } catch (err) {
      console.error('Erreur lors de la génération du dossier PDF:', err);
      alert('Une erreur est survenue lors de la création du PDF. Veuillez réessayer.');
      setIsGenerating(false);
    }
  };

  const plancheTitles = isPort ? (
    selectedBessSites.length > 18 ? [
      "Synthèse Exécutive & Chiffres Clés",
      "Cadre Réglementaire & Barème TURPE 7",
      "L'Empilement de Valeur (Value Stacking)",
      "24 Heures dans la Vie d'une Batterie",
      "Plan d'Affaires Prévisionnel 15 Ans",
      "Trajectoire EBITDA vs Cash-Flow Disponible",
      "Standard Technique DP & Cartographie Volta",
      "Répertoire Foncier & Réseau (Sites #1 à #18)",
      `Répertoire Foncier & Réseau (Sites #19 à #${selectedBessSites.length} & Total)`
    ] : [
      "Synthèse Exécutive & Chiffres Clés",
      "Cadre Réglementaire & Barème TURPE 7",
      "L'Empilement de Valeur (Value Stacking)",
      "24 Heures dans la Vie d'une Batterie",
      "Plan d'Affaires Prévisionnel 15 Ans",
      "Trajectoire EBITDA vs Cash-Flow Disponible",
      "Standard Technique DP & Cartographie Volta",
      `Répertoire Foncier & Réseau (${selectedBessSites.length} Sites & Total)`
    ]
  ) : [
    "Synthèse Exécutive & Chiffres Clés",
    "Cadre Réglementaire & Barème TURPE 7",
    "L'Empilement de Valeur (Value Stacking)",
    "24 Heures dans la Vie d'une Batterie",
    "Plan d'Affaires Prévisionnel 15 Ans",
    "Trajectoire EBITDA vs Cash-Flow Disponible",
    "Standard Technique DP & Implantation Site"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[64px] z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      {/* Conteneur Modal Global Agrandie et Repositionnée sous le Header */}
      <div className="relative w-full max-w-[1540px] h-[calc(100vh-96px)] max-h-[86vh] bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        
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
                Portefeuille Consolidé ({selectedBessSites.length} Sites / {((selectedBessSites.length * 500) / 1000).toFixed(1)} MW)
              </button>
            </div>
          </div>

          {/* Actions réservées au bas de page */}
          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* ========================================================================= */}
        {/* BARRE DE NAVIGATION RAPIDE MULTI-PAGES */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0" data-html2canvas-ignore="true">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.max(0, activePageIndex - 1);
                setActivePageIndex(nextIdx);
                document.getElementById('bess-planche-container-' + (nextIdx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={activePageIndex === 0}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédente</span>
            </button>

            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black tracking-wide shadow-2xs">
              Planche {activePageIndex + 1} / {totalPagesCount}
            </span>

            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.min(totalPagesCount - 1, activePageIndex + 1);
                setActivePageIndex(nextIdx);
                document.getElementById('bess-planche-container-' + (nextIdx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={activePageIndex === totalPagesCount - 1}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-all"
            >
              <span>Suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Accès direct rapide par planche */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {plancheTitles.map((title, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActivePageIndex(idx);
                  document.getElementById('bess-planche-container-' + (idx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ' + (
                  activePageIndex === idx
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                )}
                title={title}
              >
                P{idx + 1} : {title}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTENEUR DE PRÉVISUALISATION SCROLLABLE AVEC LES PLANCHES DU DOSSIER */}
        {/* ========================================================================= */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-200/90 flex flex-col items-center">
          <div className="text-center text-xs text-slate-600 font-bold bg-white/80 px-4 py-1.5 rounded-full border border-slate-300 shadow-xs mb-6 shrink-0" data-html2canvas-ignore="true">
            Dossier d'Étude BESS • {totalPagesCount} Planches A4 Paysage Indépendantes • Pleine Largeur 297 × 210 mm • Fonds Blancs
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 1 : SYNTHÈSE EXÉCUTIVE & CHIFFRES CLÉS (FOND BLANC) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-1"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 1 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[0]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight">
                      {headerProjectTitle}
                    </h1>
                    <p className="text-xs font-medium text-slate-600 mt-0.5 max-w-4xl">
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

              {/* Les 7 grands chiffres clés visuels avec bordures micro-dégradées (DSCR à droite de Temps de retour) */}
              <div className="grid grid-cols-7 gap-2.5 mb-3">
                <div className="bg-white border-2 border-purple-200 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-purple-700">TRI Projet & Equity</div>
                    <div className="text-xl font-black text-purple-900 mt-0.5">{kpi.irrProject}</div>
                  </div>
                  <div className="text-[10px] font-bold text-purple-600 mt-0.5">{kpi.irrEquity}</div>
                </div>

                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-emerald-700">Temps de Retour Net</div>
                    <div className="text-xl font-black text-emerald-900 mt-0.5">{kpi.payback}</div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-0.5">{kpi.paybackEquity}</div>
                </div>

                <div className="bg-white border-2 border-indigo-200 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-600"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-indigo-700">Ratio DSCR Moyen</div>
                    <div className="text-xl font-black text-indigo-900 mt-0.5">{avgDscr.toFixed(2)}x</div>
                  </div>
                  <div className="text-[10px] font-bold text-indigo-600 mt-0.5">{isPort ? 'Excellence bancaire' : 'Seuil min: 1.15x'}</div>
                </div>

                <div className="bg-white border-2 border-amber-200 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-amber-700">EBITDA Net An 1</div>
                    <div className="text-xl font-black text-amber-900 mt-0.5">{kpi.ebitda}</div>
                  </div>
                  <div className="text-[10px] font-bold text-amber-600 mt-0.5">{kpi.ebitdaSub}</div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-blue-700">Chiffre d'Affaires Brut</div>
                    <div className="text-xl font-black text-blue-900 mt-0.5">{kpi.revenue}</div>
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 mt-0.5">{kpi.revenueSub}</div>
                </div>

                <div className="bg-white border-2 border-slate-300 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-600 to-slate-800"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-slate-700">CAPEX Clé en Main</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">{kpi.capex}</div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 mt-0.5">{kpi.capexSub}</div>
                </div>

                <div className="bg-white border-2 border-cyan-200 rounded-2xl p-3 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-cyan-700">Gain Annuel TURPE 7</div>
                    <div className="text-xl font-black text-cyan-900 mt-0.5">{kpi.turpeGain}</div>
                  </div>
                  <div className="text-[10px] font-bold text-cyan-600 mt-0.5">{kpi.turpeSub}</div>
                </div>
              </div>

              {/* Deux grands blocs d'analyse comparative et de sécurisation foncière */}
              <div className="grid grid-cols-2 gap-4 mb-2">
                {/* Bloc 1 : Spécifications Techniques Matériel */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide">
                        Spécifications Techniques Matériel (CESC Mercury 261)
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      LiFePO4 Certifié
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-700">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Configuration technique :</span>
                      <span className="font-bold text-[#0b192c]">{kpi.techConfig}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Puissance nominale & Capacité :</span>
                      <span className="font-extrabold text-blue-700">{kpi.techPowerCap}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Emprise au sol par unité :</span>
                      <span className="font-bold text-emerald-700">19.84 m² sur dalle béton (&lt; 20 m² Déclaration Préalable DP)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Clôture & Sécurité périmétrique :</span>
                      <span className="font-bold text-slate-800">Grillage rigide thermo-laqué H 2.00m avec portillon sécurisé</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Rendement Round-Trip (AC-AC) :</span>
                      <span className="font-bold text-[#0b192c]">88.0% certifié en cycles nominaux</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="font-medium text-slate-500">Refroidissement & Sécurité incendie :</span>
                      <span className="font-bold text-[#0b192c]">Liquide HVAC • Aérosol NFPA 855 asservi</span>
                    </div>
                  </div>
                </div>

                {/* Bloc 2 : Insertion Réseau Enedis & Sécurisation Foncière 20 Ans */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide">
                        Insertion Réseau Enedis & Sécurisation Foncière
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Baux Notariés 20 Ans
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-700">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Domaine de tension de raccordement :</span>
                      <span className="font-bold text-[#0b192c]">HTA 20 000 V (Option HTA1 Courte Utilisation)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Distance privée de raccordement :</span>
                      <span className="font-bold text-[#0b192c]">10 mètres optimisés (Minimisation du génie civil)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Sécurisation foncière des sites :</span>
                      <span className="font-extrabold text-emerald-700">Promesses de bail sur 20 ans signées (3 000 € HT/an/site)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Statut Réseau Postes Sources :</span>
                      <span className="font-bold text-slate-800">Transfos sol &ge; 400 kVA identifiés (Dépôts libres acquéreur)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Protocoles de communication :</span>
                      <span className="font-bold text-[#0b192c]">IEC 61850 &amp; Conformité téléaction RTE / PICASSO</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="font-medium text-slate-500">Délai prévisionnel de COD :</span>
                      <span className="font-bold text-cyan-700">6 à 9 mois post-purges administratives de la DP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Compte de Résultat Consolidé 15 Ans (Page 1 en bas) ─────── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden mt-1">
                <div className="px-4 py-1.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-[10.5px] font-black uppercase text-slate-800 tracking-wider">
                      Compte de Résultat Consolidé 15 Ans — {isPort ? `Portefeuille BESS ${portName}` : `Centrale BESS — ${projectData?.name || selectedSite.name}`}
                    </span>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Flux Prévisionnels Consolidés • {debtDuration} ans @ {debtRate.toFixed(2)}%
                  </span>
                </div>

                <div className="overflow-x-auto p-1.5">
                  <table className="w-full text-right border-collapse text-[7.5px]">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold">
                        <th className="p-1 text-left w-[175px] min-w-[175px] text-[8px]">Poste Financier (€)</th>
                        {bessP1Chronique.map(c => (
                          <th key={c.year} className="p-1 text-center whitespace-nowrap">A{c.year}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="font-bold text-emerald-700 bg-emerald-50/40">
                        <td className="p-1 text-left font-bold text-slate-800">Chiffre d'Affaires Consolidé</td>
                        {bessP1Chronique.map(c => <td key={c.year} className="p-1 whitespace-nowrap">{fmtEur(c.ca)}</td>)}
                      </tr>
                      <tr className="text-slate-600">
                        <td className="p-1 text-left">OPEX &amp; Acheminement TURPE 7</td>
                        {bessP1Chronique.map(c => <td key={c.year} className="p-1 text-rose-600 whitespace-nowrap">-{fmtEur(c.opex)}</td>)}
                      </tr>
                      <tr className="font-black bg-blue-50/50 text-blue-900 border-t border-b border-blue-200">
                        <td className="p-1 text-left font-black text-blue-950">EBITDA Portefeuille</td>
                        {bessP1Chronique.map(c => <td key={c.year} className="p-1 whitespace-nowrap">{fmtEur(c.ebitda)}</td>)}
                      </tr>
                      <tr className="text-slate-600">
                        <td className="p-1 text-left">Service de la Dette ({debtDuration} ans à {debtRate.toFixed(2)}%)</td>
                        {bessP1Chronique.map(c => <td key={c.year} className="p-1 text-slate-500 whitespace-nowrap">{c.serviceDette > 0 ? `-${fmtEur(c.serviceDette)}` : '—'}</td>)}
                      </tr>
                      <tr className="font-bold bg-amber-50/50 text-amber-950">
                        <td className="p-1 text-left font-bold text-amber-950">Cash-Flow Net Annuel</td>
                        {bessP1Chronique.map(c => <td key={c.year} className="p-1 whitespace-nowrap">{fmtEur(c.cfNet)}</td>)}
                      </tr>
                      <tr className="font-black bg-slate-100 text-slate-950">
                        <td className="p-1 text-left font-black text-slate-950">Trésorerie Cumulée</td>
                        {bessP1Chronique.map(c => <td key={c.year} className="p-1 whitespace-nowrap">{fmtEur(c.cumulCf)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel sans la mention "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Mémorandum d'Investissement Institutionnel BESS</div>
              <div className="font-semibold text-slate-600">Modèle certifié Délibération CRE 2025-227 • TURPE 7</div>
              <div className="font-bold text-[#0b192c]">Planche 1 / {totalPagesCount}</div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 2 : DÉCRYPTAGE RÉGLEMENTAIRE TURPE 7 (CRE 2025-227) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-2"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 2 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[1]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche avec retour à la ligne dans le titre et cadre élargi sur une seule ligne à droite */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-12 w-auto object-contain"
                  />
                  <div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1 leading-snug">
                      TURPE 7 &amp; Délibération CRE 2025–227 :<br />
                      Le Pivot de Rentabilité du BESS
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                      Comment les nouvelles règles tarifaires de la Commission de Régulation de l'Énergie décuplent les rendements du stockage en France.
                    </p>
                  </div>
                </div>
                {/* Cadre élargi pour garder le gain sur une seule ligne */}
                <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-right whitespace-nowrap min-w-[310px] shadow-xs">
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase block tracking-wider">Gain Économique Réseau</span>
                  <span className="text-sm font-black text-emerald-800 whitespace-nowrap block mt-0.5">
                    {isPort ? '+439 673 € / an de marge brute' : '+14 183 € / an de marge brute'}
                  </span>
                </div>
              </div>

              {/* Les 4 piliers fondateurs de la réforme */}
              <div className="grid grid-cols-4 gap-4 mb-5">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h4 className="font-black text-[#0b192c] text-xs uppercase tracking-wider mb-2.5">
                  Comparatif Tarifaire Analytique : Ancien Régime vs Barème TURPE 7 Délibéré
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                        <th className="p-2.5 w-1/3">Composante Tarifaire d'Acheminement</th>
                        <th className="p-2.5 w-1/4 text-red-600">Ancien Régime (Sans Neutralité)</th>
                        <th className="p-2.5 w-1/4 text-emerald-700">Régime TURPE 7 Délibération CRE 2025-227</th>
                        <th className="p-2.5 text-right">Gain Annuel Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900">Composante de Soutirage Variable (CS)</td>
                        <td className="p-2.5 text-red-500">Plein tarif sur 100% de l'énergie chargée</td>
                        <td className="p-2.5 text-emerald-700 font-bold">Exonération totale sur les 88% d'énergie réinjectée</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">{isPort ? '+293 880 € / an' : '+9 480 € / an'}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900">Composante Fixe de Puissance (CS Fixe)</td>
                        <td className="p-2.5 text-red-500">Tarification longue utilisation rigide</td>
                        <td className="p-2.5 text-emerald-700 font-bold">Formule HTA1 Courte Utilisation (13.20 €/kW/an)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">{isPort ? '+105 400 € / an' : '+3 400 € / an'}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900">Pertes Réseau non récupérables</td>
                        <td className="p-2.5 text-red-500">Double taxation cumulée</td>
                        <td className="p-2.5 text-emerald-700 font-bold">Strictement limitée aux 12% de conversion de cycle</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">{isPort ? '+40 393 € / an' : '+1 303 € / an'}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900">Composantes de Gestion &amp; Comptage (CG/CC)</td>
                        <td className="p-2.5 text-slate-500">Forfaits conventionnels</td>
                        <td className="p-2.5 text-slate-800 leading-tight">Comptage 4 quadrants télé-relevé Enedis<br />(661 €/an/site)</td>
                        <td className="p-2.5 text-right font-bold text-slate-400">Neutre</td>
                      </tr>
                      <tr className="bg-emerald-50/60 font-black text-slate-900">
                        <td className="p-2.5 uppercase">Total Facture Annuelle TURPE Réseau</td>
                        <td className="p-2.5 text-red-600 font-bold">
                          {isPort ? '697 500 € / an' : '22 500 € / an'}
                        </td>
                        <td className="p-2.5 text-emerald-800 text-sm">{isPort ? '257 827 € / an' : '8 317 € / an'}</td>
                        <td className="p-2.5 text-right text-emerald-700 text-sm font-black">{isPort ? '+439 673 € / an' : '+14 183 € / an'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel sans "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Levier Réglementaire &amp; Juridique</div>
              <div className="font-semibold text-slate-600">Arrêté CRE 2025-78 &amp; Délibération 2025-227</div>
              <div className="font-bold text-[#0b192c]">Planche 2 / {totalPagesCount}</div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 3 : VALUE STACKING & 2 CYCLES / JOUR (FOND BLANC) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-3"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 3 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[2]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-12 w-auto object-contain"
                  />
                  <div>

                    <h2 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight mt-1">
                      L'Empilement de Valeur (Value Stacking) à 2 Cycles Quotidiens
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                      Monétisation 24h/24 combinant réserve primaire 50 Hz, réserve rapide aFRR PICASSO, capacité RTE et arbitrage spot.
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-right">
                  <span className="text-[11px] font-bold text-blue-600 uppercase block">Chiffre d'Affaires Brut An 1</span>
                  <span className="text-base font-black text-blue-900">{kpi.totalRevDonut}</span>
                </div>
              </div>

              {/* Disposition harmonisée : Les 3 flux de gauche légèrement réduits + Cadre Donut à droite agrandi à hauteur égale */}
              <div className="grid grid-cols-12 gap-4 mb-3 items-stretch">
                {/* 3 Blocs de flux à gauche (7 colonnes) avec chiffres centrés sans espace au dessus */}
                <div className="col-span-7 flex flex-col justify-between space-y-2.5">
                  {/* Flux 1 : FCR & PICASSO */}
                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-11 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0 self-center">
                        58.7%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b192c] text-xs">
                          1. Réserve Primaire 50 Hz (FCR) &amp; PICASSO (aFRR Réglage Secondaire)
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          Rémunération de la mise à disposition de puissance symétrique à la milliseconde pour stabiliser le réseau européen (~15.6 h/jour allouées). Temps de réponse &lt; 600 ms certifié par CESC, bien supérieur à la norme de 4s exigée pour les enchères européennes PICASSO.
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      <span className="text-sm font-black text-blue-900 whitespace-nowrap">{kpi.fcr}</span>
                    </div>
                  </div>

                  {/* Flux 2 : Arbitrage Spot EPEX */}
                  <div className="bg-white border-2 border-cyan-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-11 rounded-xl bg-cyan-100 text-cyan-800 font-black text-xs flex items-center justify-center shrink-0 self-center">
                        31.8%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b192c] text-xs">
                          2. Arbitrage Spot EPEX (Day-Ahead &amp; Intraday — 2 Cycles / Jour)
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          Exploitation de la volatilité horaire des prix de gros. Exécution de 2 cycles complets par jour : recharge nocturne (surproduction éolienne) et recharge méridienne (surproduction solaire à prix négatifs), restitués aux pics du matin et du soir.
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      <span className="text-sm font-black text-cyan-900 whitespace-nowrap">{kpi.arb}</span>
                    </div>
                  </div>

                  {/* Flux 3 : Marché de Capacité */}
                  <div className="bg-white border-2 border-emerald-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-11 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 self-center">
                        9.5%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b192c] text-xs">
                          3. Marché de Capacité RTE (Garantie de Puissance Pointes Hiver)
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          Certification de disponibilité lors des jours de tension réseau (PP2 RTE). Cession de garanties de capacité aux fournisseurs obligés. Rémunération récurrente sécurisée valorisée à 35 €/kW/an avec facteur de derating 0.5 certifié.
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      <span className="text-sm font-black text-emerald-900 whitespace-nowrap">{kpi.capa}</span>
                    </div>
                  </div>
                </div>

                {/* Donut Chart SVG Vectoriel Agrandie à droite (5 colonnes) de hauteur égale aux 3 cadres de gauche */}
                <div className="col-span-5 bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between items-center text-center h-full">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    STRUCTURE DES REVENUS AN 1
                  </span>
                  
                  <div className="relative w-40 h-40 my-0.5 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Anneau de fond */}
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="15" />
                      {/* FCR 58.7% : de 0° (50, 12) à 211.32° (30.25, 82.46) */}
                      <path d="M 50 12 A 38 38 0 1 1 30.25 82.46" fill="none" stroke="#2563eb" strokeWidth="15" />
                      {/* Arbitrage 31.8% : de 211.32° (30.25, 82.46) à 325.80° (28.64, 18.57) */}
                      <path d="M 30.25 82.46 A 38 38 0 0 1 28.64 18.57" fill="none" stroke="#06b6d4" strokeWidth="15" />
                      {/* Capacité 9.5% : de 325.80° (28.64, 18.57) à 360° (50, 12) — Boucle complète à 360° */}
                      <path d="M 28.64 18.57 A 38 38 0 0 1 50 12" fill="none" stroke="#10b981" strokeWidth="15" />
                      {/* Texte au centre vectoriel direct garanti sans décalage html2canvas */}
                      <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fill="#0b192c" style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        {isPort ? kpi.revenue : '92 k€'}
                      </text>
                      <text x="50" y="58" textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" style={{ fontSize: '5px', fontWeight: 800, letterSpacing: '0.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        CA BRUT TOTAL
                      </text>
                    </svg>
                  </div>

                  <div className="w-full pt-3 border-t border-slate-100 flex justify-around text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> FCR 58.7%
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Arbitrage 31.8%
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Capacité 9.5%
                    </span>
                  </div>
                </div>
              </div>

              {/* Architecture Opérationnelle & Règles de Marché des 2 Cycles Quotidiens */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-black uppercase text-[#0b192c] tracking-tight">
                      Architecture Opérationnelle des 2 Cycles Quotidiens &amp; Arbitrage Algorithmique
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Pilotage Optimisé 24h/24
                  </span>
                </div>

                {/* 4 Piliers Stratégiques */}
                <div className="grid grid-cols-4 gap-3 mb-3.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-blue-900">Cycle 1 • Nuit &amp; Réveil</span>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">02h - 08h</span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 leading-snug">
                        Achat nocturne sur Day-Ahead au creux de demande. Restitution dynamique sur la pointe du matin (06h-08h) aux prix forts.
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9.5px] font-bold text-blue-800">
                      → Spread moyen capté : 45 à 90 €/MWh
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-amber-900">Cycle 2 • Solaire &amp; Soir</span>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">11h - 21h</span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 leading-snug">
                        Recharge méridienne sur surplus PV (prix très bas ou négatifs). Injection lors de la pointe vespérale (18h-21h).
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9.5px] font-bold text-amber-800">
                      → Spread moyen capté : 80 à 160 €/MWh
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-indigo-900">Trading Algorithmique</span>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">Temps Réel</span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 leading-snug">
                        Algorithme connecté en continu aux marchés européens (PICASSO / MARI / EPEX). Bascule dynamique selon opportunités.
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9.5px] font-bold text-indigo-800">
                      → Temps de réaction &lt; 600 ms
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-emerald-900">Cyclabilité &amp; Sécurité</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">LFP Li-ion</span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 leading-snug">
                        Plage de SoC maîtrisée (10%-95%) et régulation thermique liquide (23°C ± 2°C). Garantie 15 ans et 6 000 cycles.
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9.5px] font-bold text-emerald-800">
                      → Dégradation modélisée à 2.2%/an
                    </div>
                  </div>
                </div>

                {/* Tableau Synthétique des Marchés Monétisés */}
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-[10px] border-collapse bg-white">
                    <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Flux de Monétisation</th>
                        <th className="py-2.5 px-3">Marché Cible &amp; Contrepartie</th>
                        <th className="py-2.5 px-3">Engagement Opérationnel</th>
                        <th className="py-2.5 px-3 text-center">Part du CA</th>
                        <th className="py-2.5 px-3 text-right">CA Brut An 1</th>
                        <th className="py-2.5 px-3">Profil de Risque &amp; Visibilité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-bold text-blue-900">1. Réserve Primaire 50 Hz (FCR) &amp; PICASSO</td>
                        <td className="py-2 px-3">RTE / Plateforme Européenne (Enchères 4h)</td>
                        <td className="py-2 px-3">Veille active continue &amp; puissance symétrique (±500 kW)</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-700">58.7%</td>
                        <td className="py-2 px-3 text-right font-black text-blue-900">{kpi.fcr}</td>
                        <td className="py-2 px-3 text-emerald-700 font-semibold">Très faible • Rémunération capacitaire sécurisée</td>
                      </tr>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-bold text-cyan-900">2. Arbitrage Spot EPEX (Day-Ahead &amp; Intraday)</td>
                        <td className="py-2 px-3">Bourse EPEX Spot France (MWh Physique)</td>
                        <td className="py-2 px-3">2 cycles de charge/décharge quotidiens (1 044 kWh)</td>
                        <td className="py-2 px-3 text-center font-bold text-cyan-700">31.8%</td>
                        <td className="py-2 px-3 text-right font-black text-cyan-900">{kpi.arb}</td>
                        <td className="py-2 px-3 text-amber-700 font-semibold">Modéré • Volatilité positive des prix horaires</td>
                      </tr>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-bold text-emerald-900">3. Mécanisme de Capacité RTE</td>
                        <td className="py-2 px-3">Fournisseurs obligés / Enchères RTE</td>
                        <td className="py-2 px-3">Mise à disposition garantie lors des jours PP2 d'hiver</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">9.5%</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-900">{kpi.capa}</td>
                        <td className="py-2 px-3 text-emerald-700 font-semibold">Nul • Garantie réglementaire (35 €/kW/an certifiés)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel sans "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Valorisation Marché &amp; Trading Algorithmique</div>
              <div className="font-semibold text-slate-600">Algorithme d'agrégation certifié 2 cycles quotidiens</div>
              <div className="font-bold text-[#0b192c]">Planche 3 / {totalPagesCount}</div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 4 : 24 HEURES DANS LA VIE D'UNE BATTERIE (FOND BLANC) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-4"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 4 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[3]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div className="flex flex-col h-full justify-between">
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight mt-0.5">
                      24 Heures dans la Vie d'une Batterie BESS
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                      Une journée type d'arbitrage et de régulation réseau : simulation heure par heure du comportement technique et économique.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Disponibilité Opérationnelle</span>
                    <span className="text-sm font-black text-emerald-900">98.5% (24h/24)</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-right">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">Régime de cycles</span>
                    <span className="text-sm font-black text-blue-900">2 Cycles Complets / Jour</span>
                  </div>
                </div>
              </div>

              {/* Composant Dédié Pleine Page */}
              <div className="flex-1 flex flex-col justify-center">
                <BessDailyCycleVisualizer defaultHour={13} isPdf={isGenerating} standalonePage={true} />
              </div>

              {/* Pied de page institutionnel */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>ENR COURTAGE SAS • Modélisation Opérationnelle 24h &amp; Pilotage Marchés</div>
                <div className="font-semibold text-slate-600">Double cycle quotidien &amp; arbitrage temps réel EPEX / RTE FCR</div>
                <div className="font-bold text-[#0b192c]">Planche 4 / {totalPagesCount}</div>
              </div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 5 : PLAN D'AFFAIRES PRÉVISIONNEL SUR 15 ANS (TABLEAU SEUL, FOND BLANC) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-5"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 5 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[4]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
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

                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      {kpi.tableTitle}
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5 leading-snug">
                      Chronique 15 ans détaillée : Dette senior {debtDuration} ans à {debtRate.toFixed(2)}% • Inflation 2.0%/an • Dégradation batterie 2.2%/an<br />
                      Loyer foncier 3 000 €/an/site sur 20 ans.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black text-center whitespace-nowrap leading-tight">
                    {kpi.badgePaybackSmall}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black text-center whitespace-nowrap leading-tight">
                    {kpi.dscrMoyenBadge}
                  </span>
                </div>
              </div>

              {/* Tableau Financier Pleine Page sur les 15 Années d'Étude avec police adaptée anti-retour à la ligne pour le € */}
              <div className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-xs mb-4">
                <table className="w-full table-fixed text-right border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800 font-extrabold border-b border-slate-200">
                      <th className="w-[190px] p-2 text-left font-black bg-slate-50 sticky left-0 z-10 whitespace-nowrap text-[9px]">Ligne Financière (€)</th>
                      {YEARS_15.map((y) => (
                        <th key={y} className="py-2 px-0.5 text-center font-bold whitespace-nowrap text-[8.5px] w-[calc((100%-190px)/15)]">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="bg-blue-50/50 font-bold text-blue-900">
                      <td className="w-[190px] p-1.5 pl-2.5 text-left sticky left-0 bg-blue-50/90 z-10 whitespace-nowrap text-[8.5px] font-bold">1. Chiffre d'Affaires Brut</td>
                      {YEARS_15.map((_, i) => {
                        const val = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
                        return <td key={i} className="py-1.5 px-0.5 whitespace-nowrap text-[8px] tabular-nums">{fmtEur(val)}</td>;
                      })}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">• Dont Réserve FCR &amp; PICASSO</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">{fmtEur(dynamicFinancialMatrix.revFcr[i])}</td>)}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">• Dont Capacité RTE PP2</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">{fmtEur(dynamicFinancialMatrix.revCapa[i])}</td>)}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">• Dont Arbitrage Spot 2 c/j</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">{fmtEur(dynamicFinancialMatrix.revArb[i])}</td>)}
                    </tr>

                    <tr className="bg-red-50/40 font-bold text-red-900">
                      <td className="w-[190px] p-1.5 pl-2.5 text-left sticky left-0 bg-red-50/90 z-10 whitespace-nowrap text-[8.5px] font-bold">2. OPEX d'Exploitation Total</td>
                      {YEARS_15.map((_, i) => {
                        const val = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
                        return <td key={i} className="py-1.5 px-0.5 whitespace-nowrap text-[8px] tabular-nums">-{fmtEur(val)}</td>;
                      })}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]" title="Coût Énergie Recharge (Pertes de cycle non réinjectées)">• Coût Énergie Recharge</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">-{fmtEur(dynamicFinancialMatrix.opexRecharge[i])}</td>)}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">• Commission Agrégateur 18%</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">-{fmtEur(dynamicFinancialMatrix.opexAgregateur[i])}</td>)}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">• TURPE 7 Réseau Abattu</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">-{fmtEur(dynamicFinancialMatrix.opexTurpe[i])}</td>)}
                    </tr>
                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-3.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">• Baux 20 ans + Maint + Assurance</td>
                      {YEARS_15.map((_, i) => <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">-{fmtEur(dynamicFinancialMatrix.opexAutres[i])}</td>)}
                    </tr>

                    <tr className="bg-emerald-50/60 font-black text-emerald-950">
                      <td className="w-[190px] p-1.5 pl-2.5 text-left sticky left-0 bg-emerald-50/90 z-10 whitespace-nowrap text-[9px] font-black">3. EBITDA Net d'Exploitation</td>
                      {YEARS_15.map((_, i) => {
                        const rev = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
                        const opex = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
                        return <td key={i} className="py-1.5 px-0.5 text-emerald-800 whitespace-nowrap text-[8px] font-bold tabular-nums">{fmtEur(rev - opex)}</td>;
                      })}
                    </tr>

                    <tr className="text-slate-600">
                      <td className="w-[190px] p-1 pl-2.5 text-left sticky left-0 bg-white z-10 whitespace-nowrap text-[8px]">4. Service Dette Senior ({debtDuration} ans à {debtRate.toFixed(2)}%)</td>
                      {YEARS_15.map((_, i) => {
                        const val = dynamicFinancialMatrix.debtService[i];
                        return <td key={i} className="py-1 px-0.5 whitespace-nowrap text-[7.5px] tabular-nums">{val > 0 ? `-${fmtEur(val)}` : '0 €'}</td>;
                      })}
                    </tr>

                    <tr className="bg-cyan-50/60 font-black text-cyan-950">
                      <td className="w-[190px] p-1.5 pl-2.5 text-left sticky left-0 bg-cyan-50/90 z-10 whitespace-nowrap text-[9px] font-black">5. Cash-Flow Net Disponible</td>
                      {YEARS_15.map((_, i) => {
                        const rev = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
                        const opex = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
                        const ebitda = rev - opex;
                        const debt = dynamicFinancialMatrix.debtService[i];
                        return <td key={i} className="py-1.5 px-0.5 text-cyan-800 whitespace-nowrap text-[8px] font-bold tabular-nums">{fmtEur(ebitda - debt)}</td>;
                      })}
                    </tr>

                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="w-[190px] p-1.5 pl-2.5 text-left sticky left-0 bg-slate-50 z-10 whitespace-nowrap text-[8.5px] font-bold">Ratio DSCR de Dette Senior</td>
                      {YEARS_15.map((_, i) => {
                        const val = dynamicFinancialMatrix.debtService[i];
                        if (val === 0) return <td key={i} className="py-1.5 px-0.5 text-slate-400 whitespace-nowrap text-[8px] text-center">—</td>;
                        const rev = dynamicFinancialMatrix.revFcr[i] + dynamicFinancialMatrix.revCapa[i] + dynamicFinancialMatrix.revArb[i];
                        const opex = dynamicFinancialMatrix.opexTurpe[i] + dynamicFinancialMatrix.opexRecharge[i] + dynamicFinancialMatrix.opexAgregateur[i] + dynamicFinancialMatrix.opexAutres[i];
                        const dscr = ((rev - opex) / val).toFixed(2);
                        return <td key={i} className="py-1.5 px-0.5 text-emerald-700 font-extrabold whitespace-nowrap text-[8px] tabular-nums text-center">{dscr}x</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3 Blocs synthétiques sous le tableau */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">CA Cumulé 15 Ans</span>
                  <span className="text-lg font-black text-blue-900">{isPort ? `${(cumulRev / 1000000).toFixed(2)} M€` : `${fmtEur(cumulRev)}`}</span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">EBITDA Net Cumulé 15 Ans</span>
                  <span className="text-lg font-black text-emerald-900">{isPort ? `${(cumulEbitda / 1000000).toFixed(2)} M€` : `${fmtEur(cumulEbitda)}`}</span>
                </div>
                <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 block">Cash-Flow Net Cumulé 15 Ans</span>
                  <span className="text-lg font-black text-cyan-900">{isPort ? `${(cumulCf / 1000000).toFixed(2)} M€` : `${fmtEur(cumulCf)}`}</span>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel sans "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Modélisation Financière Analytique</div>
              <div className="font-semibold text-slate-600">Plan d'affaires audité 15 ans • Inflation 2.0%</div>
              <div className="font-bold text-[#0b192c]">Planche 5 / {totalPagesCount}</div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 6 (NOUVELLE PLANCHE DÉDIÉE) : TRAJECTOIRE FINANCIÈRE 15 ANS (BAR-CHART) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-6"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 6 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[5]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
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

                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      Trajectoire Financière 15 Ans (2026 à 2040)<br />EBITDA vs Cash-Flow Disponible
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Comparaison dynamique annuelle entre la rentabilité opérationnelle brute (EBITDA) et les flux nets de trésorerie après service de la dette senior.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shrink-0">
                  <span className="flex items-center gap-2 text-blue-700 shrink-0">
                    <span className="w-3.5 h-3.5 rounded-xs bg-blue-600 shrink-0"></span>
                    <span className="leading-tight text-left">
                      <span className="whitespace-nowrap">EBITDA Net</span>
                      <br />
                      <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">d'Exploitation</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-cyan-700 shrink-0">
                    <span className="w-3.5 h-3.5 rounded-xs bg-cyan-500 shrink-0"></span>
                    <span className="leading-tight text-left">
                      <span className="whitespace-nowrap">Cash-Flow Net</span>
                      <br />
                      <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">(Post-Dette)</span>
                    </span>
                  </span>
                </div>
              </div>

              {/* Grand Graphique Vectoriel Pleine Page 15 Ans */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4 shadow-xs">
                <div className="h-[430px] flex items-end justify-between gap-3 pt-12 pb-1 px-4 border-b-2 border-slate-300 relative">
                  {/* Lignes de repères horizontales */}
                  <div className="absolute inset-x-0 top-1/4 border-b border-slate-200 border-dashed pointer-events-none"></div>
                  <div className="absolute inset-x-0 top-2/4 border-b border-slate-200 border-dashed pointer-events-none"></div>
                  <div className="absolute inset-x-0 top-3/4 border-b border-slate-200 border-dashed pointer-events-none"></div>

                  {chartBars.map((b) => {
                    const hEbitda = Math.min(100, Math.max(12, (b.ebitda / maxEbitda) * 100));
                    const hCf = Math.min(100, Math.max(6, (b.cf / maxEbitda) * 100));
                    const fmtBarEbitda = isPort ? `${(b.ebitda / 1000000).toFixed(2)}M` : `${Math.round(b.ebitda / 1000)}k`;
                    const fmtBarCf = isPort ? `${(b.cf / 1000000).toFixed(2)}M` : `${Math.round(b.cf / 1000)}k`;

                    return (
                      <div key={b.year} className="flex-1 flex flex-col items-center h-full justify-end group z-10">
                        <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
                          {/* Barre EBITDA (Bleu) */}
                          <div
                            className="w-1/2 bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-sm transition-all hover:brightness-110 shadow-xs relative flex justify-center"
                            style={{ height: `${hEbitda}%` }}
                            title={`EBITDA ${b.year}: ${fmtEur(b.ebitda)}`}
                          >
                            {/* Chiffre EBITDA - Niveau Haut (décalé au-dessus) */}
                            <div
                              className="absolute left-1/2 -translate-x-1/2 text-[9px] font-black text-blue-900 bg-blue-50/95 border border-blue-200 px-1 py-0.5 rounded shadow-2xs whitespace-nowrap"
                              style={{ bottom: 'calc(100% + 18px)' }}
                            >
                              {fmtBarEbitda}
                            </div>
                          </div>

                          {/* Barre Cash-Flow Net (Cyan) */}
                          <div
                            className="w-1/2 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all hover:brightness-110 shadow-xs relative flex justify-center"
                            style={{ height: `${hCf}%` }}
                            title={`Cash-Flow ${b.year}: ${fmtEur(b.cf)}`}
                          >
                            {/* Chiffre Cash-Flow Net - Niveau Bas (décalé juste au-dessus de sa barre) */}
                            <div
                              className="absolute left-1/2 -translate-x-1/2 text-[9px] font-black text-cyan-900 bg-cyan-50/95 border border-cyan-200 px-1 py-0.5 rounded shadow-2xs whitespace-nowrap"
                              style={{ bottom: 'calc(100% + 2px)' }}
                            >
                              {fmtBarCf}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-slate-800 mt-2">{b.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4 Blocs d'analyse financière pluriannuelle sous le grand graphique */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border-2 border-blue-200 rounded-xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase block">Marge Opérationnelle</span>
                  <span className="text-xl font-black text-blue-900 mt-0.5 block">~60.1%</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Excellence opérationnelle</span>
                </div>
                <div className="bg-white border-2 border-cyan-200 rounded-xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-cyan-700 uppercase block">Fin Dette Senior</span>
                  <span className="text-xl font-black text-cyan-900 mt-0.5 block">Année {debtDuration} ({2025 + debtDuration})</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Dette 100% amortie</span>
                </div>
                <div className="bg-white border-2 border-emerald-200 rounded-xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">DSCR Moyen Portefeuille</span>
                  <span className="text-xl font-black text-emerald-900 mt-0.5 block">{avgDscr.toFixed(2)}x</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Seuil bancaire min. 1.15x</span>
                </div>
                <div className="bg-white border-2 border-purple-200 rounded-xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-purple-700 uppercase block">TRI Projet / Equity</span>
                  <span className="text-xl font-black text-purple-900 mt-0.5 block">{kpi.irrProject} / 37.4%</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Effet de levier optimisé</span>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel sans "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Visualisation Graphique Haute Résolution</div>
              <div className="font-semibold text-slate-600">Trajectoire pluriannuelle certifiée • Cash-Flow post-dette</div>
              <div className="font-bold text-[#0b192c]">Planche 6 / {totalPagesCount}</div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 7 : CARTOGRAPHIE VOLTA (IMAGE 5) & VISUEL DALLE BÉTON DP (IMAGE 4) */}
          {/* ========================================================================= */}
          <div
            id="bess-planche-container-7"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 7 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[6]}
                </span>
              </div>
            </div>
            <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-0.5">
                      {isPort ? (
                        <>Cartographie des Implantations &amp;<br />Visuel Technique de la Station BESS 500 kW</>
                      ) : (
                        <>Cartographie &amp;<br />Rendu Architectural de la Station ({selectedSite.name})</>
                      )}
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      {isPort
                        ? "Cartographie Grand Sud-Ouest identique à la plateforme investisseurs VOLTA • Visuel technique de la station 500 kW (dalle 19.84 m² et clôture rigide vert RAL 6005) conforme au dossier DP."
                        : `Implantation géographique et modèle 3D de la centrale ${selectedSite.name} • 4 armoires Mercury 261 sur dalle 19.84 m² avec clôture rigide H 2.00 m.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black text-center leading-tight">
                    <span className="whitespace-nowrap">Emprise Dalle 19.84 m²</span>
                    <br />
                    <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">(&lt; 20 m² DP)</span>
                  </span>

                </div>
              </div>

              {/* Contenu double volet : Cartographie VOLTA à gauche + Rendu 3D de l'installation à droite */}
              <div className="grid grid-cols-12 gap-5 items-stretch">
                
                {/* 1. CÔTÉ GAUCHE (6/12) : CARTE DES IMPLANTATIONS DU PORTEFEUILLE (SANS BARRE HAUTE NI FILIGRANE API) */}
                <div className="col-span-6 bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-700 shadow-md flex flex-col justify-between relative" style={{ height: '480px', position: 'relative', isolation: 'isolate', zIndex: 0 }}>
                  {/* Carte Interactive Leaflet Grand Sud-Ouest */}
                  <div className="relative w-full flex-1 bg-slate-800 h-full" style={{ position: 'relative', isolation: 'isolate' }}>
                    <MapContainer
                      preferCanvas={true}
                      center={[44.75, 0.6]}
                      zoom={7}
                      scrollWheelZoom={false}
                      zoomControl={true}
                      style={{ width: '100%', height: '100%', minHeight: '480px' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        crossOrigin="anonymous"
                      />
                      {/* Affichage des pins BESS bleus / cyan avec contour blanc */}
                      {selectedBessSites.map((site) => (
                        <CircleMarker
                          key={site.id}
                          center={[site.lat, site.lng]}
                          radius={6.5}
                          pathOptions={{
                            fillColor: '#00a2e8',
                            fillOpacity: 0.95,
                            color: '#ffffff',
                            weight: 2
                          }}
                        >
                          <Popup>
                            <div className="text-slate-900 text-xs p-1">
                              <strong className="block text-blue-700 font-bold">{site.name} (500 kW)</strong>
                              <span>{site.city} ({site.cp})</span>
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Poste Source : {site.substation} ({site.dist})</div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                      {selectedBessSites.length > 0 && (
                        <MapBoundsUpdater bounds={selectedBessSites.map(s => [s.lat, s.lng])} />
                      )}
                    </MapContainer>

                    {/* Légende épurée dédiée exclusivement au stockage BESS */}
                    <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-lg text-[10px] text-white">
                      <div className="flex items-center gap-2 font-bold text-cyan-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00a2e8]"></span>
                        <span>{isPort ? `Stockage Stationnaire BESS (${selectedBessSites.length} Sites HTA)` : `Centrale BESS ${selectedSite.name} (500 kW)`}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CÔTÉ DROIT (6/12) : VISUEL DE LA DALLE AVEC CLÔTURE VERTE IDENTIQUE À L'IMAGE 4 */}
                <div className="col-span-6 bg-white rounded-2xl overflow-hidden border border-slate-300 shadow-md flex flex-col justify-between" style={{ height: '480px' }}>
                  {/* Utilisation directe du composant 3D officiel de la page DP (Image 4) */}
                  <BatteryStationVisualizer
                    powerKw={500}
                    cabinetCount={4}
                    cabinetModel="CESC Mercury 261"
                    dalleLength={6.20}
                    dalleWidth={3.20}
                    viewMode="3D"
                    showDimensions={false}
                    showCaptureButtons={false}
                    showTopBar={false}
                    showFenceToggle={false}
                    height="100%"
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Fiche technique de conformité réglementaire DP sous les deux volets */}
              <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="font-black text-slate-800 block">Dalle Béton Armé</span>
                  <span className="text-slate-500 font-bold">6.20 m × 3.20 m (19.84 m²)</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="font-black text-slate-800 block">Clôture Treillis Soudé</span>
                  <span className="text-slate-500 font-bold">Hauteur 2.00 m Sécurisée</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="font-black text-slate-800 block">Sécurité Incendie &amp; Rétention</span>
                  <span className="text-slate-500 font-bold">Aérosol NFPA 855 asservi</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="font-black text-slate-800 block">Procédure Urbanisme</span>
                  <span className="text-emerald-700 font-bold">Déclaration Préalable (DP) &lt; 20 m²</span>
                </div>
              </div>
            </div>

            {/* Pied de page institutionnel sans "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Implantation Territoriale &amp; Ingénierie Pré-Construction</div>
              <div className="font-semibold text-slate-600">Cartographie VOLTA • Standard technique DP certifié</div>
              <div className="font-bold text-[#0b192c]">Planche 7 / {totalPagesCount}</div>
            </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 8 : RÉPERTOIRE FONCIER & RÉSEAU DES PROJETS (SITES 1 À 16) */}
          {/* ========================================================================= */}
          {isPort && (
          <div
            id="bess-planche-container-8"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 8 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[7]}
                </span>
              </div>
            </div>
              <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div>
              {/* En-tête de planche */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo-enr-courtage-inline.png"
                    alt="ENR COURTAGE"
                    className="h-11 w-auto object-contain"
                  />
                  <div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-0.5">
                      {isPort
                        ? (selectedBessSites.length > 18
                            ? `Répertoire Foncier & Réseau des ${selectedBessSites.length} Projets BESS (Sites #1 à #18)`
                            : `Répertoire Foncier & Réseau des ${selectedBessSites.length} Projets BESS`)
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
                    Bail 20 ans : {portName === 'FARADAY' ? '2 000' : '3 000'} €/an/site
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black">
                    HTA 20 kV Enedis
                  </span>
                </div>
              </div>

              {/* Tableau compact des 18 premiers sites sans débordement vertical */}
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-[10.5px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-1.5 px-2 w-8 text-center">#</th>
                      <th className="py-1.5 px-2 w-36">Nom Projet &amp; Bailleur</th>
                      <th className="py-1.5 px-2 w-36">Commune &amp; CP</th>
                      <th className="py-1.5 px-2 w-44">Coordonnées GPS</th>
                      <th className="py-1.5 px-2 w-32">Poste Source Enedis</th>
                      <th className="py-1.5 px-2 w-20 text-center">Dist. Réseau</th>
                      <th className="py-1.5 px-2 w-24 text-right">Quote-part</th>
                      <th className="py-1.5 px-2 w-28 text-center">Puissance / Capacité</th>
                      <th className="py-1.5 px-2 w-24 text-right">Loyer 20 ans</th>
                      <th className="py-1.5 px-2 w-24 text-right">EBITDA An 1</th>
                      <th className="py-1.5 px-2 w-20 text-center">Payback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sitesP1.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-1 px-2">
                          <span className="font-extrabold text-slate-900 block leading-tight">{s.name}</span>
                          <span className="text-[9.5px] text-slate-400">{s.client}</span>
                        </td>
                        <td className="py-1 px-2">
                          <span className="font-semibold text-slate-800 block leading-tight">{s.city}</span>
                          <span className="text-[9.5px] text-slate-400">{s.cp} ({s.dept})</span>
                        </td>
                        <td className="py-1 px-2 font-mono text-[9.5px] text-blue-700">{s.gps}</td>
                        <td className="py-1 px-2 font-extrabold text-emerald-800">{s.substation}</td>
                        <td className="py-1 px-2 text-center font-semibold text-slate-600">{s.dist}</td>
                        <td className="py-1 px-2 text-right font-semibold text-slate-600">{s.s3renr}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-900">
                          <span className="px-1 py-0.5 rounded-md bg-blue-50 text-blue-700 block leading-tight">{s.power} /<br />{s.cap}</span>
                        </td>
                        <td className="py-1 px-2 text-right font-extrabold text-amber-700">{s.rent}</td>
                        <td className="py-1 px-2 text-right font-black text-emerald-700">{s.ebitda}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-700">{computeDynamicSiteMetrics(s).paybackFormatted}</td>
                      </tr>
                    ))}

                    {/* Si 18 sites ou moins, totalisation consolidée directe en Planche 8 */}
                    {selectedBessSites.length <= 18 && (
                      <tr className="bg-gradient-to-r from-blue-900 via-indigo-950 to-[#0b192c] text-white font-black text-[11px]">
                        <td className="py-1.5 px-2 text-center text-amber-300 font-black">∑</td>
                        <td className="py-1.5 px-2 uppercase tracking-wider text-amber-300 leading-tight">Total Consolidé<br />({selectedBessSites.length} Projets)</td>
                        <td className="py-1.5 px-2 text-slate-300">Grand Sud-Ouest</td>
                        <td className="py-1.5 px-2 font-mono text-[9.5px] text-cyan-300">Grappe Nouvelle-Aquitaine / Occitanie</td>
                        <td className="py-1.5 px-2 text-emerald-300 font-extrabold">{selectedBessSites.length} Postes HTA</td>
                        <td className="py-1.5 px-2 text-center text-slate-300">7.2 km moy.</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">90.1 k€ moy.</td>
                        <td className="py-1.5 px-2 text-center text-cyan-300 font-extrabold leading-tight">{(selectedBessSites.length * 0.5).toFixed(1)} MW /<br />{(selectedBessSites.length * 1.044).toFixed(2)} MWh</td>
                        <td className="py-1.5 px-2 text-right text-amber-300 font-black">{totalRentAllSites.toLocaleString('fr-FR')} €/an</td>
                        <td className="py-1.5 px-2 text-right text-emerald-400 font-black text-xs">{(totalEbitdaAllSites / 1000000).toFixed(2)} M€</td>
                        <td className="py-1.5 px-2 text-center text-emerald-300 font-black">5.0 ans</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pied de page institutionnel sans "(Paysage)" */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>ENR COURTAGE SAS • Audit Foncier &amp; Raccordement HTA {selectedBessSites.length > 18 ? '(Partie 1)' : ''}</div>
              <div className="font-semibold text-slate-600">{selectedBessSites.length} Promesses de Baux Notariées 20 Ans • Raccordements HTA Identifiés</div>
              <div className="font-bold text-[#0b192c]">Planche 8 / {totalPagesCount}</div>
            </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PLANCHE 9 : RÉPERTOIRE FONCIER & RÉSEAU DES PROJETS (SITES 19+ OU TOTAL) */}
          {/* ========================================================================= */}
          {isPort && selectedBessSites.length > 18 && (
          <div
            id="bess-planche-container-9"
            style={{ display: 'flex' }}
            className="w-full flex flex-col items-center shrink-0 mb-8"
          >
            <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs shadow-xs">
                  Planche 9 sur {totalPagesCount}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {plancheTitles[8]}
                </span>
              </div>
            </div>
              <section className="bess-render-page shrink-0 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between" style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
              <div>
                {/* En-tête de planche */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo-enr-courtage-inline.png"
                      alt="ENR COURTAGE"
                      className="h-11 w-auto object-contain"
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight mt-0.5">
                        {selectedBessSites.length > 18
                          ? `Répertoire Foncier & Réseau des ${selectedBessSites.length} Projets BESS (Sites #19 à #${selectedBessSites.length})`
                          : `Synthèse Consolidée Foncière & Réseau (${selectedBessSites.length} Sites)`}
                      </h2>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Identification cadastrale, coordonnées GPS décimales, rattachement aux postes sources Enedis/ODRE et quote-part S3REnR.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                      Total Consolidé {(selectedBessSites.length * 0.5).toFixed(1)} MW
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 text-xs font-black">
                      {(selectedBessSites.length * 1.044).toFixed(2)} MWh
                    </span>
                  </div>
                </div>

                {/* Tableau compact des sites 19 à N + Ligne de total consolidé garantie sans coupure */}
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-[10.5px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                        <th className="py-2 px-2 w-8 text-center">#</th>
                        <th className="py-2 px-2 w-36">Nom Projet &amp; Bailleur</th>
                        <th className="py-2 px-2 w-36">Commune &amp; CP</th>
                        <th className="py-2 px-2 w-44">Coordonnées GPS</th>
                        <th className="py-2 px-2 w-32">Poste Source Enedis</th>
                        <th className="py-2 px-2 w-20 text-center">Dist. Réseau</th>
                        <th className="py-2 px-2 w-24 text-right">Quote-part</th>
                        <th className="py-2 px-2 w-28 text-center">Puissance / Capacité</th>
                        <th className="py-2 px-2 w-24 text-right">Loyer 20 ans</th>
                        <th className="py-2 px-2 w-24 text-right">EBITDA An 1</th>
                        <th className="py-2 px-2 w-20 text-center">Payback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {sitesP2.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1 px-2 text-center font-bold text-slate-400">{18 + idx + 1}</td>
                          <td className="py-1 px-2">
                            <span className="font-extrabold text-slate-900 block leading-tight">{s.name}</span>
                            <span className="text-[9.5px] text-slate-400">{s.client}</span>
                          </td>
                          <td className="py-1 px-2">
                            <span className="font-semibold text-slate-800 block leading-tight">{s.city}</span>
                            <span className="text-[9.5px] text-slate-400">{s.cp} ({s.dept})</span>
                          </td>
                          <td className="py-1 px-2 font-mono text-[9.5px] text-blue-700">{s.gps}</td>
                          <td className="py-1 px-2 font-extrabold text-emerald-800">{s.substation}</td>
                          <td className="py-1 px-2 text-center font-semibold text-slate-600">{s.dist}</td>
                          <td className="py-1 px-2 text-right font-semibold text-slate-600">{s.s3renr}</td>
                          <td className="py-1 px-2 text-center font-bold text-slate-900">
                            <span className="px-1 py-0.5 rounded-md bg-blue-50 text-blue-700 block leading-tight">{s.power} /<br />{s.cap}</span>
                          </td>
                          <td className="py-1 px-2 text-right font-extrabold text-amber-700">{s.rent}</td>
                          <td className="py-1 px-2 text-right font-black text-emerald-700">{s.ebitda}</td>
                          <td className="py-1 px-2 text-center font-bold text-slate-700">{computeDynamicSiteMetrics(s).paybackFormatted}</td>
                        </tr>
                      ))}

                      {sitesP2.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-6 text-center text-slate-500 italic bg-slate-50">
                            L'intégralité des {selectedBessSites.length} centrales BESS retenues est listée sur la Planche 8 précédente.
                          </td>
                        </tr>
                      )}

                      {/* LIGNE DE TOTAL CONSOLIDÉ (affichée uniquement si sitesP2.length > 0 afin d'éviter tout doublon avec la Planche 8) */}
                      {sitesP2.length > 0 && (
                        <tr className="bg-gradient-to-r from-blue-900 via-indigo-950 to-[#0b192c] text-white font-black text-[11px]">
                          <td className="py-2 px-2 text-center text-amber-300 font-black">∑</td>
                          <td className="py-2 px-2 uppercase tracking-wider text-amber-300 leading-tight">Total Consolidé<br />({selectedBessSites.length} Projets)</td>
                          <td className="py-2 px-2 text-slate-300">Grand Sud-Ouest</td>
                          <td className="py-2 px-2 font-mono text-[9.5px] text-cyan-300">Grappe Nouvelle-Aquitaine / Occitanie</td>
                          <td className="py-2 px-2 text-emerald-300 font-extrabold">{selectedBessSites.length} Postes HTA</td>
                          <td className="py-2 px-2 text-center text-slate-300">7.2 km moy.</td>
                          <td className="py-2 px-2 text-right text-slate-300">90.1 k€ moy.</td>
                          <td className="py-2 px-2 text-center text-cyan-300 font-extrabold leading-tight">{(selectedBessSites.length * 0.5).toFixed(1)} MW /<br />{(selectedBessSites.length * 1.044).toFixed(2)} MWh</td>
                          <td className="py-2 px-2 text-right text-amber-300 font-black">{totalRentAllSites.toLocaleString('fr-FR')} €/an</td>
                          <td className="py-2 px-2 text-right text-emerald-400 font-black text-xs">{(totalEbitdaAllSites / 1000000).toFixed(2)} M€</td>
                          <td className="py-2 px-2 text-center text-emerald-300 font-black">5.0 ans</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pied de page institutionnel sans "(Paysage)" garanti 100% visible */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>ENR COURTAGE SAS • Audit Foncier &amp; Raccordement HTA (Partie 2)</div>
                <div className="font-semibold text-slate-600">Consolidation Complète {selectedBessSites.length} Sites • {(selectedBessSites.length * 0.5).toFixed(2)} MW / {(selectedBessSites.length * 1.044).toFixed(2)} MWh</div>
                <div className="font-bold text-[#0b192c]">Planche 9 / {totalPagesCount}</div>
              </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FICHES BESS UNITAIRES DES SITES SÉLECTIONNÉS (POUR L'ÉTUDE COMPLÈTE) */}
          {/* ========================================================================= */}
          {isPort && (
            <div className="w-full flex flex-col items-center">
              {selectedBessSites.map((site, sIdx) => (
                <div
                  key={site.id || sIdx}
                  id={`bess-single-site-container-${sIdx + 1}`}
                  style={{ display: 'flex' }}
                  className="w-full flex flex-col items-center shrink-0 mb-8"
                >
                  <div className="w-[1380px] mb-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-700 text-white font-black text-xs shadow-xs">
                        Fiche Projet {sIdx + 1} / {selectedBessSites.length} (Page {totalPagesCount + sIdx + 1} / {totalPagesCount + selectedBessSites.length})
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        Fiche BESS Unitaire — Projet {site.name} ({site.city} - {site.dept})
                      </span>
                    </div>
                    <span className="text-slate-500 font-medium">500 kW / 1 044 kWh • TURPE 7 HTA1 CU</span>
                  </div>
                  <BessProjectSingleSheet
                    site={site}
                    siteIndex={sIdx + 1}
                    totalSites={selectedBessSites.length}
                    studyDuration={20}
                    fraisCommerciaux={fraisCommerciaux}
                    plancheOffset={totalPagesCount}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BARRE INFÉRIEURE PERSISTANTE : BOUTON IMPRESSION ET BOUTON FERMER BAS */}
        {/* ========================================================================= */}
        <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">
              {isPort ? `Mode Portefeuille Consolidé (${selectedBessSites.length} Projets / ${(selectedBessSites.length * 0.5).toFixed(1)} MW)` : `Mode Simulation Unitaire (${selectedSite.name} - 500 kW)`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">
              {isPort ? `${totalPagesCount} Planches Portefeuille + ${selectedBessSites.length} Fiches Projets = ${totalPagesCount + selectedBessSites.length} Pages` : `${totalPagesCount} Planches A4 Paysage`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bouton de personnalisation du portefeuille */}
            {isPort && (
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(true)}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sélectionner les centrales BESS à inclure"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
                <span>Filtrer ({selectedBessSites.length}/{allAvailableSites.length})</span>
              </button>
            )}

            {/* Bouton ÉTUDE COMPLÈTE */}
            {isPort && (
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(true)}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title={`Personnaliser le portefeuille et générer l'étude complète (${totalPagesCount + selectedBessSites.length} pages)`}
              >
                <Sparkles className="w-4 h-4 text-yellow-200" />
                <span>ÉTUDE COMPLÈTE ({totalPagesCount + selectedBessSites.length} PAGES)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleGeneratePdf('portfolio')}
              disabled={isGenerating}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressStep}</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>{isPort ? `Dossier Portefeuille (${totalPagesCount} Pages)` : 'Imprimer / Exporter en PDF'}</span>
                </>
              )}
            </button>

            {/* Bouton Fermer Bas Droit */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Fermer la visionneuse"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Fermer</span>
            </button>
          </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* MODALE DE SÉLECTION MULTI-PROJETS BESS ("ÉTUDE COMPLÈTE") */}
      {/* ========================================================================= */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150" data-html2canvas-ignore="true">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0b192c]">Personnaliser le portefeuille BESS pour l'étude complète</h3>
                  <p className="text-xs text-slate-600">Sélectionnez les centrales de stockage stationnaire à inclure dans les analyses financières consolidées, la cartographie et les fiches unitaires.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de contrôle et recherche */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, bailleur, commune, poste source..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {modalSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setModalSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProjectIds(allAvailableSites.map(s => s.id))}
                  className="px-3 py-1.5 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Tout sélectionner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProjectIds([])}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Tout désélectionner</span>
                </button>
              </div>
            </div>

            {/* Compteur dynamique en haut de modale */}
            <div className="px-6 py-2.5 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-b border-cyan-100 flex items-center justify-between text-xs font-bold text-slate-900 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-700 text-white font-extrabold text-[11px]">
                  {selectedProjectIds.length} / {allAvailableSites.length} projets sélectionnés
                </span>
                <span className="text-slate-300">•</span>
                <span>Puissance : <strong className="text-cyan-900">{modalSelectedPowerMw.toFixed(1)} MW / {modalSelectedCapMwh.toFixed(2)} MWh</strong></span>
                <span className="text-slate-300">•</span>
                <span>CAPEX total : <strong className="text-slate-900">{fmtEur(modalSelectedCapex)}</strong></span>
                <span className="text-slate-300">•</span>
                <span>EBITDA An 1 : <strong className="text-emerald-700">{fmtEur(modalSelectedEbitda)}</strong></span>
              </div>
              {selectedProjectIds.length === 0 && (
                <span className="text-red-600 font-black text-xs flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Veuillez sélectionner au moins un projet
                </span>
              )}
            </div>

            {/* Paramètre Frais commerciaux pour l'Étude */}
            <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-extrabold text-slate-800">Frais commerciaux :</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={fraisCommerciaux}
                    onChange={(e) => setFraisCommerciaux(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-24 px-2.5 py-1 text-xs font-black text-slate-900 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                  />
                  <span className="font-bold text-slate-600">€ / projet</span>
                </div>
                <span className="text-[11px] text-slate-600 font-semibold bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                  {fraisCommerciaux === 2500 ? 'Standard 5 000 €/MW (2 500 € pour 500 kW)' : `${Math.round((fraisCommerciaux / 500) * 1000).toLocaleString('fr-FR')} €/MW`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFraisCommerciaux(2500)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    fraisCommerciaux === 2500
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  2 500 € (5 000 €/MW)
                </button>
                <button
                  type="button"
                  onClick={() => setFraisCommerciaux(0)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    fraisCommerciaux === 0
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  0 € (Invest. propre)
                </button>
                <button
                  type="button"
                  onClick={() => setFraisCommerciaux(5000)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    fraisCommerciaux === 5000
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  5 000 €
                </button>
              </div>
            </div>

            {/* Table list */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-extrabold z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.length === allAvailableSites.length && allAvailableSites.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedProjectIds(allAvailableSites.map(s => s.id));
                          else setSelectedProjectIds([]);
                        }}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-2">#</th>
                    <th className="p-2">Nom du site &amp; Bailleur</th>
                    <th className="p-2">Commune (Dép)</th>
                    <th className="p-2 text-center">Puissance / Capacité</th>
                    <th className="p-2">Poste Source Enedis</th>
                    <th className="p-2 text-right">CAPEX Total</th>
                    <th className="p-2 text-right">EBITDA An 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModalSites.map((s, idx) => {
                    const isChecked = selectedProjectIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        onClick={() => toggleSiteSelection(s.id)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? 'bg-cyan-50/40' : 'opacity-60'}`}
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSiteSelection(s.id)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2">
                          <span className="font-extrabold text-slate-900 block leading-tight">{s.name}</span>
                          <span className="text-[10px] text-slate-400">{s.client}</span>
                        </td>
                        <td className="p-2 text-slate-600">{s.city} ({s.dept})</td>
                        <td className="p-2 text-center font-bold text-slate-800">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold">500 kW / 1 044 kWh</span>
                        </td>
                        <td className="p-2 font-medium text-emerald-800">{s.substation} ({s.dist})</td>
                        <td className="p-2 text-right font-bold text-slate-800">{fmtEur(s.capexTotal)}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{fmtEur(s.ebitdaAn1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={selectedProjectIds.length === 0}
                  onClick={() => {
                    if (selectedProjectIds.length === 0) return;
                    setIsSelectModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Appliquer à la visionneuse ({selectedProjectIds.length} sites)
                </button>

                <button
                  type="button"
                  disabled={selectedProjectIds.length === 0 || isGenerating}
                  onClick={() => {
                    if (selectedProjectIds.length === 0) return;
                    setIsSelectModalOpen(false);
                    setTimeout(() => {
                      handleGeneratePdf('complete');
                    }, 150);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-yellow-200" />
                  <span>Valider et Générer l'Étude ({totalPagesCount} + {selectedBessSites.length} Pages)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
