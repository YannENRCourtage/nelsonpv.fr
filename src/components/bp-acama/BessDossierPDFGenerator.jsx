import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { BESS_PORTFOLIO_SITES } from '../../data/bessPortfolioData.js';
import { getCreSubstationQualification } from '../../services/creZonesService.js';

// Base de données des 31 sites
const SITES_DATABASE = [
  { id: 1, name: "PAILLOT", client: "PAILLOT Noël", address: "5 ZA des Plats", cp: "87600", city: "Rochechouart", gps: "45.847811, 0.852996", substation: "PLAUD", dist: "6.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 2, name: "BATIOT", client: "BATIOT Olivier", address: "72 Chemin du Campas", cp: "32220", city: "Mongausy", gps: "43.496370, 0.834241", substation: "SEMEZIES", dist: "5.9 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 3, name: "DOMERGUE MEUZAC", client: "DOMERGUE David", address: "1725 Route du Grand Pré", cp: "87380", city: "Meuzac", gps: "45.566247, 1.397687", substation: "LE REPAIRE", dist: "8.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 4, name: "CUBERTAFON", client: "CUBERTAFON René", address: "8 Route de la Barrière", cp: "19210", city: "Saint-Julien-le-Vendômois", gps: "45.460274, 1.298160", substation: "LUBERSAC", dist: "8.3 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 5, name: "PLANTE", client: "PLANTE Jean-Pierre", address: "581 Route Départementale 817", cp: "40300", city: "Port-de-Lanne", gps: "43.558940, -1.199501", substation: "GUICHE", dist: "4.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 6, name: "PRAVIE", client: "PRAVIE Clémence", address: "336 Chemin de Falieres", cp: "82170", city: "Grisolles", gps: "43.806232, 1.295833", substation: "LESQUIVE 2", dist: "2.3 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 7, name: "LATOURNERIE", client: "LATOURNERIE Franck", address: "467 Chemin des Terres Vieilles", cp: "24310", city: "Brantôme en Périgord", gps: "45.328888, 0.651040", substation: "BRANTOME", dist: "3.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 8, name: "DAVID", client: "DAVID Louis", address: "1053 route de saint-cyr les champagnes", cp: "19350", city: "Concèze", gps: "45.353329, 1.314195", substation: "LUBERSAC", dist: "8.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 9, name: "GRANGER", client: "GRANGER BRUNO", address: "3 Route des Forges", cp: "19210", city: "Saint-Éloy-les-Tuileries", gps: "45.442533, 1.267710", substation: "LUBERSAC", dist: "10.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 10, name: "CASTEBRUNET 2", client: "CASTEBRUNET 2 Jérémy", address: "763 Chemin de Calsos", cp: "82300", city: "Caussade", gps: "44.123740, 1.564486", substation: "LERE", dist: "5.7 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 11, name: "BERTRANDIE", client: "BERTRANDIE Sébastien", address: "301 Route de la Roche", cp: "24240", city: "Monestier", gps: "44.773569, 0.300107", substation: "STE-FOY-LA-GRANDE", dist: "9.0 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 12, name: "GIOT", client: "GIOT Joachim", address: "2 Le Cluzeau", cp: "23600", city: "Leyrat", gps: "46.360561, 2.306566", substation: "BOUSSAC", dist: "5.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 13, name: "ARBOIN", client: "ARBOIN Régis", address: "47 Chemin de piquemole", cp: "47120", city: "Duras", gps: "44.659496, 0.222735", substation: "LA SAUVETAT", dist: "11.8 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 14, name: "MISSAULT LACOUSSIÈRE", client: "MISSAULT David", address: "1348 Route des Bouleaux", cp: "24470", city: "Saint-Saud-Lacoussière", gps: "45.558769, 0.804488", substation: "NONTRON", dist: "13.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 15, name: "MEILLAT 1", client: "MEILLAT 1 Maxime", address: "1a La Ribiere", cp: "23210", city: "Mourioux-Vieilleville", gps: "46.082964, 1.638518", substation: "CHATELUS 2", dist: "5.4 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 16, name: "SOULIGNAC", client: "SOULIGNAC Thierry", address: "Route de Lombardie", cp: "33860", city: "Val-de-Livenne", gps: "45.264357, -0.550408", substation: "ETAULIERS", dist: "7.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 17, name: "CHAUFFAILLE", client: "CHAUFFAILLE Franck", address: "2 Route de Saint Yrieix", cp: "24270", city: "PAYZAC", gps: "45.436230, 1.288720", substation: "LUBERSAC", dist: "6.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 18, name: "CIROLI", client: "CIROLI", address: "66 Lieu Dit Pinasse", cp: "33890", city: "Juillac", gps: "44.809547, 0.037304", substation: "AURIOLLES", dist: "7.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 19, name: "BOURDETTES", client: "BOURDETTES Sandrine", address: "10 Route de la Bohème", cp: "65140", city: "Mansan", gps: "43.343730, 0.194628", substation: "VIC-EN-BIGORRE", dist: "10.8 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 20, name: "CASTEBRUNET 1", client: "CASTEBRUNET Jérémy", address: "1074 Chemin de Guillounet", cp: "82300", city: "Caussade", gps: "44.117157, 1.566758", substation: "LERE", dist: "5.5 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 21, name: "FRECHEVILLE", client: "FRECHEVILLE Mathieu", address: "45 Cluzelou-haut", cp: "47210", city: "SAINT EUTROPE DE BORN", gps: "44.588327, 0.665431", substation: "CANCON", dist: "7.2 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 22, name: "CASTEBRUNET 3", client: "CASTEBRUNET 3 Jérémy", address: "93 Chemin des Peyrières", cp: "82300", city: "Monteils", gps: "44.165754, 1.564963", substation: "LERE", dist: "3.6 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 23, name: "DOUMENS", client: "DOUMENS Morgan", address: "4 Route de Salleboeuf", cp: "33750", city: "Beychac-et-Caillau", gps: "44.870054, -0.397698", substation: "POMPIGNAC", dist: "4.0 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 24, name: "HOUSSAIT-YOUNG", client: "HOUSSAIT-YOUNG Jérôme", address: "94 Route d'Hourtin", cp: "33930", city: "Vendays-Montalivet", gps: "45.338321, -1.071016", substation: "ST-VIVIEN", dist: "9.9 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 25, name: "MISSAULT FRESSENGEAS", client: "MISSAULT David", address: "Route de la Baine", cp: "24800", city: "Saint-Martin-de-Fressengeas", gps: "45.438589, 0.815692", substation: "THIVIERS", dist: "6.7 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 26, name: "LARDY", client: "LARDY Michel", address: "Outrelaigue", cp: "23150", city: "Maisonnisses", gps: "46.067915, 1.907318", substation: "LAVAUD", dist: "10.6 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 27, name: "CELERIE", client: "CELERIE Thomas", address: "301 route de la Valade", cp: "19230", city: "Beyssenac", gps: "45.400772, 1.284338", substation: "LUBERSAC", dist: "7.1 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 28, name: "MEILLAT 2", client: "MEILLAT 2 Maxime", address: "1a la Ribiére", cp: "23210", city: "Mourioux-Vieilleville", gps: "46.081523, 1.633909", substation: "CHATELUS 2", dist: "5.4 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 29, name: "DOMERGUE ARGENCES", client: "DOMERGUE David", address: "1 Route de Plagnes", cp: "12420", city: "Argences en Aubrac", gps: "44.807528, 2.790446", substation: "RUEYRES", dist: "5.9 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 30, name: "COMBY", client: "COMBY Fabrice", address: "14 Route de Besse", cp: "19210", city: "Saint-Éloy-les-Tuileries", gps: "45.452807, 1.284563", substation: "LUBERSAC", dist: "10.5 km", s3renr: "92.73 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" },
  { id: 31, name: "CASTEBRUNET 4", client: "CASTEBRUNET 4 Jérémy", address: "3750 Route de Bioule", cp: "82300", city: "Saint-Cirq", gps: "44.124392, 1.583302", substation: "LERE", dist: "6.2 km", s3renr: "84.13 k€/MW", power: "500 kW", cap: "1044 kWh", ebitda: "48 299 €", payback: "4.8 ans" }
];

// Matrice Financière 15 ans
const YEARS_15 = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040];
const FINANCIAL_MATRIX = {
  revFcr: [85848, 87565, 89316, 91103, 92925, 94783, 96679, 98612, 100585, 102596, 104648, 106741, 108876, 111054, 113275],
  revCapa: [8750, 8925, 9104, 9286, 9471, 9661, 9854, 10051, 10252, 10457, 10666, 10880, 11097, 11319, 11545],
  revArb: [29380, 29668, 29958, 30252, 30548, 30848, 31150, 31455, 31764, 32075, 32390, 32707, 33027, 33351, 33678],
  opexTurpe: [8317, 8483, 8653, 8826, 9003, 9183, 9366, 9554, 9745, 9940, 10139, 10341, 10548, 10759, 10974],
  opexRecharge: [34295, 34981, 35681, 36394, 37122, 37865, 38622, 39394, 40182, 40986, 41806, 42642, 43495, 44365, 45252],
  opexAgregateur: [22316, 22762, 23217, 23682, 24155, 24639, 25131, 25634, 26147, 26670, 27203, 27747, 28302, 28868, 29446],
  opexAutres: [10750, 10885, 11023, 11163, 11306, 11453, 11602, 11754, 11909, 12067, 12229, 12393, 12561, 12732, 12907],
  debtService: [25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 25288, 0, 0, 0]
};

// Formatters
const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  return Math.round(val).toLocaleString('fr-FR') + ' €';
};

/**
 * Composant Modal & Générateur PDF Haute Précision inspiré fidèlement de dossier_investissement_bess_turpe_7_enr_courtage.html
 */
export default function BessDossierPDFGenerator({
  isOpen,
  onClose,
  mode: initialMode = 'portfolio', // 'single' | 'portfolio'
  projectData = null,
  batteryConfig = null,
  batteryResults = null,
  networkQualification = null
}) {
  const [activeMode, setActiveMode] = useState(initialMode || 'portfolio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');

  if (!isOpen) return null;

  const mult = activeMode === 'portfolio' ? 31 : 1;
  const isPort = activeMode === 'portfolio';

  // Métriques KPI
  const kpi = {
    irrProject: isPort ? '19.8%' : '20.1%',
    irrEquity: isPort ? 'TRI Equity : 35.2%' : 'TRI Equity : 36.8%',
    payback: '4.8 ans',
    paybackEquity: isPort ? 'Sur Fonds Propres : 2.3 ans' : 'Sur Fonds Propres : 2.4 ans',
    ebitda: isPort ? '1.50 M€' : '48 299 €',
    ebitdaSub: isPort ? 'EBITDA consolidé net (31 sites)' : 'Marge opérationnelle ~39.0%',
    revenue: isPort ? '3.84 M€' : '123 978 €',
    revenueSub: isPort ? 'Value Stacking 31 sites (2 c/j)' : '2 cycles journaliers (24h)',
    capex: isPort ? '7.23 M€' : '233 250 €',
    capexSub: isPort ? '~233 k€ / site raccordé clé en main' : '466 € / kW installé',
    turpeGain: isPort ? '+439 673 €' : '+14 183 €',
    turpeSub: isPort ? 'Gain annuel réseau consolidé' : 'Économie directe vs barème',
    fcr: isPort ? '2 661 288 € / an' : '85 848 € / an',
    arb: isPort ? '910 780 € / an' : '29 380 € / an',
    capa: isPort ? '271 250 € / an' : '8 750 € / an',
    totalRevDonut: isPort ? '3 843 318 € / an' : '123 978 € / an',
    totalRevSub: isPort ? 'Portefeuille Consolidé 15.5 MW' : 'Unité 500 kW / 1 044 kWh',
    tableTitle: isPort ? "Plan d'Affaires Prévisionnel Consolidé sur 15 Ans (31 Sites)" : "Plan d'Affaires Prévisionnel sur 15 Ans (Unitaire 500 kW)",
    badgePaybackSmall: isPort ? "4.8 ans (Projet) / 2.3 ans (Equity)" : "4.8 ans (Projet) / 2.4 ans (Equity)",
    dscrMoyenBadge: isPort ? "DSCR Portefeuille : 1.94x (Excellence bancaire)" : "DSCR Moyen : 1.94x (Min bancaire 1.15x)",
    techConfig: isPort ? "124 armoires extérieures réparties sur 31 sites" : "4 armoires extérieures (1.15m x 1.44m x 2.38m)",
    techPowerCap: isPort ? "15.5 MW / 32.36 MWh consolidés" : "500 kW / 1 044 kWh (Ratio 2h de décharge)"
  };

  // Répartition des sites sur Planche 5 et 6 pour le portefeuille
  const sitesP1 = SITES_DATABASE.slice(0, 16);
  const sitesP2 = SITES_DATABASE.slice(16);

  // Recherche d'un site unitaire
  const selectedSite = SITES_DATABASE.find(s => s.name.toUpperCase() === (projectData?.name || '').toUpperCase()) || SITES_DATABASE[7]; // Défaut DAVID (#8)

  // Données de graphique
  const maxEbitda = isPort ? 2000000 : 65000;
  const chartBars = YEARS_15.map((y, i) => {
    const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
    const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
    const ebitda = rev - opex;
    const debt = FINANCIAL_MATRIX.debtService[i] * mult;
    const cf = ebitda - debt;
    return { year: y, ebitda, cf };
  });

  // Générateur PDF A4 Paysage Pleine Largeur
  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setProgressStep('Initialisation du moteur d’impression...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210 mm

      const pages = document.querySelectorAll('.bess-render-page');
      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        setProgressStep(`Capture vectorielle haute définition - Planche ${i + 1} / ${totalPages}...`);
        const pageEl = pages[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);

        if (i > 0) {
          pdf.addPage();
        }

        // Full-bleed A4 Paysage exact (0 mm de marge pour occuper 100% de la page)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      const fileName = isPort
        ? `Dossier_Investissement_BESS_Portefeuille_15.5MW_TURPE7_${fileDate}.pdf`
        : `Dossier_Investissement_BESS_${projectData?.name || 'Unitaire_500kW'}_TURPE7_${fileDate}.pdf`;

      setProgressStep('Finalisation et enregistrement du document...');
      pdf.save(fileName);
      setIsGenerating(false);
      onClose();
    } catch (err) {
      console.error('Erreur lors de la génération du dossier PDF:', err);
      alert('Une erreur est survenue lors de la création du PDF. Veuillez réessayer.');
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      {/* Conteneur Modal Global */}
      <div className="relative w-full max-w-7xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-4 flex flex-col max-h-[96vh]">
        
        {/* BARRE SUPÉRIEURE DE NAVIGATION ET EXPORT (FOND BLANC PUR ET STYLES DE LA PAGE MODÈLE) */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Logo ENR Courtage existant */}
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
                  Mémorandum d'Investissement BESS • TURPE 7
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

          {/* Actions : Badge Conformité, Impression & Export PDF */}
          <div className="flex items-center gap-3">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CRE 2025-227 & TURPE 7 Conforme
            </span>

            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
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

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* CONTENEUR DE PRÉVISUALISATION SCROLLABLE AVEC LES PLANCHES DU DOSSIER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-slate-200">
          <div className="text-center text-xs text-slate-500 font-semibold mb-2">
            Aperçu fidèle des {isPort ? '6' : '5'} planches A4 Paysage plein écran • Fonds blancs • Prêt pour export
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 1 : SYNTHÈSE EXÉCUTIVE & CHIFFRES CLÉS (FOND BLANC) */}
          {/* ========================================================================= */}
          <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
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
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight mt-1.5">
                      {isPort ? 'Portefeuille BESS Stand-Alone 15.5 MW / 32.36 MWh' : `Centrale BESS Stand-Alone 500 kW / 1 044 kWh (${projectData?.name || selectedSite.name})`}
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 max-w-3xl">
                      {isPort
                        ? 'Grappe territoriale consolidée de 31 unités standardisées (500 kW / 1 044 kWh) raccordées au réseau HTA Enedis dans le Sud-Ouest. Programme d\'investissement souverain optimisé TURPE 7.'
                        : `Unité de stockage stationnaire autonome par batterie LFP raccordée au réseau HTA 20 kV Enedis (${selectedSite.substation} - ${selectedSite.dist}). Monétisation optimisée en Value Stacking sous le nouveau barème TURPE 7.`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Édition d'Analyse</span>
                  <span className="text-sm font-extrabold text-[#0b192c]">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  <span className="text-xs font-bold text-cyan-600 block mt-0.5">ENR COURTAGE • M&A Infrastructure</span>
                </div>
              </div>

              {/* Les 6 grands chiffres clés visuels */}
              <div className="grid grid-cols-6 gap-3.5 mb-6">
                <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">TRI Projet & Equity</div>
                  <div className="text-2xl font-black text-purple-900 mt-1">{kpi.irrProject}</div>
                  <div className="text-[11px] font-bold text-purple-600 mt-0.5">{kpi.irrEquity}</div>
                </div>

                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Temps de Retour Net</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{kpi.payback}</div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-0.5">{kpi.paybackEquity}</div>
                </div>

                <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">EBITDA Net An 1</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">{kpi.ebitda}</div>
                  <div className="text-[11px] font-bold text-amber-700 mt-0.5">{kpi.ebitdaSub}</div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">Chiffre d'Affaires Brut</div>
                  <div className="text-2xl font-black text-blue-900 mt-1">{kpi.revenue}</div>
                  <div className="text-[11px] font-bold text-blue-600 mt-0.5">{kpi.revenueSub}</div>
                </div>

                <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-400 to-slate-600"></div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">CAPEX Clé en main</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{kpi.capex}</div>
                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">{kpi.capexSub}</div>
                </div>

                <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Gain Annuel TURPE 7</div>
                  <div className="text-2xl font-black text-cyan-800 mt-1">{kpi.turpeGain}</div>
                  <div className="text-[11px] font-bold text-cyan-600 mt-0.5">{kpi.turpeSub}</div>
                </div>
              </div>

              {/* Deux blocs comparatifs techniques & fonciers */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Spécifications Techniques Matériel (CESC Mercury 261)
                    </h3>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">LiFePO4 certifié</span>
                  </div>
                  <ul className="text-xs space-y-2.5 text-slate-700 font-medium">
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Configuration :</span>
                      <span className="font-bold text-slate-900">{kpi.techConfig}</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Puissance & Capacité :</span>
                      <span className="font-bold text-slate-900">{kpi.techPowerCap}</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Emprise au sol totale :</span>
                      <span className="font-bold text-emerald-700">&lt; 20 m² sur dalle béton (Déclaration Préalable DP)</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Rendement Round-Trip (AC-AC) :</span>
                      <span className="font-bold text-slate-900">88.0% certifié en cycles nominaux</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500">Refroidissement & Sécurité Incendie :</span>
                      <span className="font-bold text-slate-900">Liquide HVAC + Aérosol NFPA 855 asservi</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Insertion Réseau Enedis & Sécurisation Foncière
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Bail notarié 30 ans</span>
                  </div>
                  <ul className="text-xs space-y-2.5 text-slate-700 font-medium">
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Domaine de tension de livraison :</span>
                      <span className="font-bold text-slate-900">HTA 20 000 V (Option HTA1 Courte Utilisation)</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Distance privée raccordement :</span>
                      <span className="font-bold text-blue-700">10 mètres optimisés (Minimisation du génie civil)</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Sécurisation foncière du site :</span>
                      <span className="font-bold text-slate-900">Promesse de bail notariée (5 000 €/an/site indexé)</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Protocoles de communication :</span>
                      <span className="font-bold text-slate-900">IEC 61850 & Conformité téléaction RTE / PICASSO</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500">Délai prévisionnel de COD :</span>
                      <span className="font-bold text-cyan-700">6 à 9 mois post-purges administratives de la DP</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cartouche bas de page */}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>ENR COURTAGE SAS • Dossier d'Investissement Institutionnel BESS</span>
              <span>Modèle certifié Délibération CRE 2025-227</span>
              <span className="font-bold text-slate-700">Planche 1 / {isPort ? '6' : '5'} (Paysage)</span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 2 : DÉCRYPTAGE RÉGLEMENTAIRE TURPE 7 & DÉLIBÉRATION CRE 2025-227 */}
          {/* ========================================================================= */}
          <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                <div className="flex items-center gap-4">
                  <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-10 w-auto object-contain" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-200">
                      Levier Réglementaire & Juridique
                    </span>
                    <h2 className="text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      TURPE 7 & Délibération CRE 2025–227 : Le Pivot de Rentabilité du BESS
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Comment les nouvelles règles tarifaires de la Commission de Régulation de l'Énergie décuplent les rendements du stockage en France.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                    {isPort ? '+439 673 € / an de marge brute' : '+14 183 € / an de marge brute'}
                  </span>
                </div>
              </div>

              {/* Les 4 Piliers en cartes blanches avec bordures de couleur */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 shadow-sm relative">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-black text-sm mb-2.5">
                    01
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">Fin du Double Péage Réseau</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
                    La CRE neutralise totalement la part variable d'acheminement sur l'électricité soutirée dès lors qu'elle est réinjectée. Seules les pertes de conversion physique (12% pour un rendement de 88%) supportent la part variable.
                  </p>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-sm relative">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm mb-2.5">
                    02
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">Tarif HTA1 Courte Utilisation</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
                    Application d'une composante fixe de puissance modérée (13.20 €/kW/an) et de gestion/comptage 4 quadrants télé-relevé, plafonnant le coût d'accès réseau à seulement ~8 317 € par unité de 500 kW.
                  </p>
                </div>

                <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm relative">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm mb-2.5">
                    03
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">Signaux-Prix Géographiques</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
                    L'Annexe CRE 2025-227 cartographie les 3 357 postes sources. Dans le Sud (zones d'injection solaire), le stockage absorbe la saturation photovoltaïque à midi et bénéficie d'une valorisation accrue de flexibilité.
                  </p>
                </div>

                <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm relative">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm mb-2.5">
                    04
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">Impact Direct sur le TRI</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
                    L'économie de plus de 14 000 €/an par tranche de 500 kW gonfle directement l'EBITDA distribuable, ramenant le temps de retour sur investissement sous la barre des 5 ans sans effet de levier (et 2.3 ans avec dette).
                  </p>
                </div>
              </div>

              {/* Tableau comparatif Avant / Après */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Composante Tarifaire d'Acheminement</th>
                      <th className="py-3 px-4 text-rose-700">Ancien Régime (Sans Neutralité)</th>
                      <th className="py-3 px-4 text-emerald-700">Régime TURPE 7 Délibération CRE 2025-227</th>
                      <th className="py-3 px-4 text-right">Gain Annuel Net {isPort ? '(Consolidé 31 Sites)' : '(Par 500 kW)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#0b192c]">Composante de Soutirage Variable (CS)</td>
                      <td className="py-2.5 px-4 text-rose-600">Plein tarif sur 100% de l'énergie chargée</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-700">Exonération totale sur les 88% d'énergie réinjectée</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-600">+{isPort ? '347 200 € / an' : '11 200 € / an'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#0b192c]">Composante Fixe de Puissance (CS Fixe)</td>
                      <td className="py-2.5 px-4 text-slate-500">Tarification longue utilisation rigide</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-700">Formule HTA1 Courte Utilisation (13.20 €/kW/an)</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-600">+{isPort ? '55 800 € / an' : '1 800 € / an'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#0b192c]">Pertes Réseau non récupérables</td>
                      <td className="py-2.5 px-4 text-slate-500">Double taxation cumulée</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-700">Strictement limitée aux 12% de conversion de cycle</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-600">+{isPort ? '17 050 € / an' : '550 € / an'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#0b192c]">Composantes de Gestion & Comptage (CG/CC)</td>
                      <td className="py-2.5 px-4 text-slate-500">Forfaits conventionnels</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-700">Comptage 4 quadrants télé-relevé Enedis (661 €/an/site)</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-600">+{isPort ? '19 623 € / an' : '633 € / an'}</td>
                    </tr>
                    <tr className="bg-cyan-50/70 border-t-2 border-cyan-300 font-bold">
                      <td className="py-3 px-4 text-[#0b192c] text-sm">TOTAL FACTURE ANNUELLE TURPE RÉSEAU</td>
                      <td className="py-3 px-4 text-rose-600 line-through text-sm">~{isPort ? '697 500 € / an' : '22 500 € / an'}</td>
                      <td className="py-3 px-4 text-cyan-800 text-sm font-black">{isPort ? '257 827 € / an' : '8 317 € / an'}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 text-sm font-black">+{isPort ? '439 673 € / an' : '14 183 € / an'} économisés</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>ENR COURTAGE SAS • Direction Juridique & Régulation Énergie</span>
              <span>Arrêté CRE 2025-78 & Délibération 2025-227</span>
              <span className="font-bold text-slate-700">Planche 2 / {isPort ? '6' : '5'} (Paysage)</span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 3 : VALUE STACKING & 2 CYCLES / JOUR (FOND BLANC) */}
          {/* ========================================================================= */}
          <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                <div className="flex items-center gap-4">
                  <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-10 w-auto object-contain" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                      Valorisation Marché & Trading Algorithmique
                    </span>
                    <h2 className="text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                      L'Empilement de Valeur (Value Stacking) à 2 Cycles Quotidiens
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Monétisation 24h/24 combinant réserve primaire 50 Hz, réserve rapide aFRR PICASSO, capacité RTE et arbitrage spot.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-300">
                    Chiffre d'Affaires Brut : {isPort ? '3 843 318 € / an' : '123 978 € / an'}
                  </span>
                </div>
              </div>

              {/* Deux colonnes : 3 Flux + Donut & 2 Cycles */}
              <div className="grid grid-cols-3 gap-5 items-start mb-4">
                <div className="col-span-2 space-y-3">
                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 font-black text-sm shrink-0 border border-blue-200">
                      69.2%
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-[#0b192c] uppercase tracking-wider">
                          1. Réserve Primaire 50 Hz (FCR) & PICASSO (aFRR Réglage Secondaire)
                        </h4>
                        <span className="text-xs font-black text-blue-700">{kpi.fcr}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed text-justify">
                        Rémunération de la mise à disposition de puissance symétrique à la milliseconde pour stabiliser le réseau européen. Temps de réponse &lt; 400 ms certifié par CESC, bien supérieur à la norme de 4s exigée pour les enchères européennes PICASSO.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 font-black text-sm shrink-0 border border-cyan-200">
                      23.7%
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-[#0b192c] uppercase tracking-wider">
                          2. Arbitrage Spot EPEX (Day-Ahead & Intraday — 2 Cycles / Jour)
                        </h4>
                        <span className="text-xs font-black text-cyan-700">{kpi.arb}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed text-justify">
                        Exploitation de la volatilité horaire des prix de gros. Exécution de 2 cycles complets par jour : recharge nocturne (surproduction éolienne) et recharge méridienne (surproduction solaire à prix négatifs), restitués aux pics du matin et du soir.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm shrink-0 border border-emerald-200">
                      7.1%
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-[#0b192c] uppercase tracking-wider">
                          3. Marché de Capacité RTE (Garantie de Puissance Pointes Hiver)
                        </h4>
                        <span className="text-xs font-black text-emerald-700">{kpi.capa}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed text-justify">
                        Certification de disponibilité lors des jours de tension réseau PP2 (RTE). Cession de garanties de capacité aux fournisseurs obligés, constituant une rente contractuelle annuelle dérisquée.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Donut Chart SVG et Chronologie des 2 Cycles */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 text-center">
                      Structure des Revenus An 1
                    </div>

                    {/* Donut SVG Vectoriel */}
                    <div className="relative w-36 h-36 mx-auto my-2">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {/* FCR 69.2% - stroke #0284c7 */}
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#0284c7" strokeWidth="5" strokeDasharray="69.2 30.8" strokeDashoffset="0"></circle>
                        {/* Arbitrage 23.7% - stroke #06b6d4 */}
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#06b6d4" strokeWidth="5" strokeDasharray="23.7 76.3" strokeDashoffset="-69.2"></circle>
                        {/* Capacité 7.1% - stroke #059669 */}
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#059669" strokeWidth="5" strokeDasharray="7.1 92.9" strokeDashoffset="-92.9"></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                        <span className="text-xs font-black text-slate-900">{isPort ? '3.84 M€' : '124 k€'}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-black text-[#0b192c]">{kpi.totalRevDonut}</div>
                      <div className="text-[11px] font-bold text-slate-500">{kpi.totalRevSub}</div>
                    </div>
                  </div>

                  {/* Chronologie 2 Cycles */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 text-center">
                      Cycle Quotidien Standardisé (2 Cycles / Jour)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                        <span className="font-black text-blue-800 block">01h - 05h : Charge 1</span>
                        <span className="text-slate-600 font-medium">Creux éolien de nuit</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
                        <span className="font-black text-amber-800 block">07h30 - 09h30 : Décharge 1</span>
                        <span className="text-slate-600 font-medium">Pointe du matin</span>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                        <span className="font-black text-blue-800 block">12h - 15h : Charge 2</span>
                        <span className="text-slate-600 font-medium">Pic solaire à midi</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
                        <span className="font-black text-amber-800 block">18h30 - 21h : Décharge 2</span>
                        <span className="text-slate-600 font-medium">Pointe du soir</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>ENR COURTAGE SAS • Trading Algorithmique & Réserves Rapides</span>
              <span>Compatible Plateforme PICASSO (RTE)</span>
              <span className="font-bold text-slate-700">Planche 3 / {isPort ? '6' : '5'} (Paysage)</span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHE 4 : PLAN D'AFFAIRES PRÉVISIONNEL SUR 15 ANS (FOND BLANC & 15 ANS VISIBLES) */}
          {/* ========================================================================= */}
          <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center gap-4">
                  <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-10 w-auto object-contain" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      Modélisation Financière Certifiée
                    </span>
                    <h2 className="text-xl font-black text-[#0b192c] tracking-tight mt-0.5">
                      {kpi.tableTitle}
                    </h2>
                    <p className="text-xs font-medium text-slate-600">
                      Projection intégrant inflation (2%/an), dégradation LFP (1.5%/an) et dette senior (12 ans @ 4.3%).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Temps de Retour Réel</span>
                    <span className="text-sm font-black text-emerald-700">{kpi.badgePaybackSmall}</span>
                  </div>
                  <div className="text-right pl-4 border-l border-slate-200">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Couverture de Dette</span>
                    <span className="text-sm font-black text-blue-700">{kpi.dscrMoyenBadge}</span>
                  </div>
                </div>
              </div>

              {/* TABLEAU FINANCIER COMPLET SUR 15 ANS (15 COLONNES NETTES) */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mb-3">
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider">
                      <th className="py-2 px-2.5 text-left">Poste / Année (€)</th>
                      {YEARS_15.map(y => (
                        <th key={y} className="py-2 px-2 text-right">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    <tr className="font-black bg-blue-50/60 text-[#0b192c]">
                      <td className="py-1.5 px-2.5 text-blue-800">CHIFFRE D'AFFAIRES BRUT (VALUE STACKING)</td>
                      {YEARS_15.map((y, i) => {
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        return <td key={y} className="py-1.5 px-2 text-right text-blue-800 font-extrabold">{Math.round(rev).toLocaleString('fr-FR')} €</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• Réserve Fréquence 50 Hz (FCR / aFRR)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px]">{Math.round(FINANCIAL_MATRIX.revFcr[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• Marché de Capacité RTE (PP2)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px]">{Math.round(FINANCIAL_MATRIX.revCapa[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• Arbitrage Spot EPEX (2 cycles/j)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px]">{Math.round(FINANCIAL_MATRIX.revArb[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>

                    <tr className="font-black bg-rose-50/50 text-[#0b192c]">
                      <td className="py-1.5 px-2.5 text-rose-800">TOTAL CHARGES OPÉRATIONNELLES (OPEX)</td>
                      {YEARS_15.map((y, i) => {
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        return <td key={y} className="py-1.5 px-2 text-right text-rose-700 font-extrabold">-{Math.round(opex).toLocaleString('fr-FR')} €</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• Énergie de Recharge (Achat creux)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px] text-rose-600">-{Math.round(FINANCIAL_MATRIX.opexRecharge[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• Commission Agrégateur (18% CA)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px] text-rose-600">-{Math.round(FINANCIAL_MATRIX.opexAgregateur[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• TURPE 7 Réseau HTA1 CU (Abattu)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px] font-bold text-cyan-700">-{Math.round(FINANCIAL_MATRIX.opexTurpe[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 pl-5 text-[10px]">• Loyer Dalle, Maintenance, Assurances</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px] text-rose-600">-{Math.round(FINANCIAL_MATRIX.opexAutres[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>

                    <tr className="font-black bg-amber-50/70 text-slate-900 border-t-2 border-amber-300">
                      <td className="py-1.5 px-2.5 text-amber-900 font-black">EBITDA OPÉRATIONNEL NET (EBE)</td>
                      {YEARS_15.map((y, i) => {
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        return <td key={y} className="py-1.5 px-2 text-right text-amber-900 font-black">{Math.round(rev - opex).toLocaleString('fr-FR')} €</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-1 px-2.5 text-slate-600 text-[10px]">Service Dette Senior (12 ans @ 4.3%)</td>
                      {YEARS_15.map((y, i) => <td key={y} className="py-1 px-2 text-right text-[10px] text-slate-700">-{Math.round(FINANCIAL_MATRIX.debtService[i] * mult).toLocaleString('fr-FR')} €</td>)}
                    </tr>
                    <tr className="font-black bg-emerald-50 text-slate-900 border-t border-emerald-300">
                      <td className="py-1.5 px-2.5 text-emerald-800 font-black">CASH-FLOW NET ANNUEL (FLUX DISPONIBLE)</td>
                      {YEARS_15.map((y, i) => {
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]) * mult;
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]) * mult;
                        const debt = FINANCIAL_MATRIX.debtService[i] * mult;
                        return <td key={y} className="py-1.5 px-2 text-right text-emerald-700 font-black">{Math.round(rev - opex - debt).toLocaleString('fr-FR')} €</td>;
                      })}
                    </tr>
                    <tr className="text-[10px] text-slate-600 font-bold bg-slate-50">
                      <td className="py-1 px-2.5">Ratio de Couverture Dette (DSCR)</td>
                      {YEARS_15.map((y, i) => {
                        if (FINANCIAL_MATRIX.debtService[i] === 0) return <td key={y} className="py-1 px-2 text-right text-slate-400">—</td>;
                        const rev = (FINANCIAL_MATRIX.revFcr[i] + FINANCIAL_MATRIX.revCapa[i] + FINANCIAL_MATRIX.revArb[i]);
                        const opex = (FINANCIAL_MATRIX.opexTurpe[i] + FINANCIAL_MATRIX.opexRecharge[i] + FINANCIAL_MATRIX.opexAgregateur[i] + FINANCIAL_MATRIX.opexAutres[i]);
                        const dscr = (rev - opex) / FINANCIAL_MATRIX.debtService[i];
                        return <td key={y} className="py-1 px-2 text-right font-extrabold text-blue-700">{dscr.toFixed(2)}x</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* GRAPHIQUE EN BARRES SVG 15 ANS (EBITDA EN BLEU ET CASHFLOW EN VERT) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Chronique de Trésorerie Nette & Capacité d'Autofinancement (15 Ans)
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-3 h-3 rounded-sm bg-[#0284c7]"></span> EBITDA Net
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-3 h-3 rounded-sm bg-[#059669]"></span> Cash-Flow Net (Flux Libre)
                    </span>
                  </div>
                </div>

                {/* SVG Bar Chart */}
                <div className="h-32 w-full">
                  <svg viewBox="0 0 1200 130" className="w-full h-full">
                    {/* Lignes de repère */}
                    <line x1="40" y1="20" x2="1180" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="60" x2="1180" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="100" x2="1180" y2="100" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Barres pour les 15 ans */}
                    {chartBars.map((b, idx) => {
                      const xBase = 60 + idx * 74;
                      const hEbitda = Math.min(80, Math.max(10, (b.ebitda / maxEbitda) * 80));
                      const hCf = Math.min(80, Math.max(10, (b.cf / maxEbitda) * 80));
                      return (
                        <g key={b.year}>
                          {/* Barre EBITDA (Bleu) */}
                          <rect
                            x={xBase}
                            y={100 - hEbitda}
                            width="22"
                            height={hEbitda}
                            fill="#0284c7"
                            rx="2"
                          />
                          {/* Barre Cash-Flow (Vert) */}
                          <rect
                            x={xBase + 24}
                            y={100 - hCf}
                            width="22"
                            height={hCf}
                            fill="#059669"
                            rx="2"
                          />
                          {/* Label Année */}
                          <text
                            x={xBase + 23}
                            y="118"
                            fontSize="10"
                            fontWeight="bold"
                            fill="#64748b"
                            textAnchor="middle"
                          >
                            {b.year}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>ENR COURTAGE SAS • Modélisation Financière 15 Ans</span>
              <span>Hypothèse de dette senior 80% • Fiscalité IS 15–25%</span>
              <span className="font-bold text-slate-700">Planche 4 / {isPort ? '6' : '5'} (Paysage)</span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* PLANCHES 5 & 6 : RÉPERTOIRE DES SITES (TOUS LES 31 SITES VISIBLES) */}
          {/* ========================================================================= */}
          {isPort ? (
            <>
              {/* PLANCHE 5 : SITES 1 À 16 */}
              <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <div className="flex items-center gap-4">
                      <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-10 w-auto object-contain" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                          Pipeline Foncier Sécurisé (Partie 1/2)
                        </span>
                        <h2 className="text-xl font-black text-[#0b192c] tracking-tight mt-1">
                          Répertoire Foncier & Réseau des 31 Projets BESS — Sites #1 à #16
                        </h2>
                        <p className="text-xs font-medium text-slate-600">
                          Grappe de sites sécurisés par promesse de bail notariée, raccordement HTA Enedis et emprise &lt; 20 m² en DP.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                        16 Unités • 8.0 MW / 16.7 MWh
                      </span>
                    </div>
                  </div>

                  {/* Tableau des 16 premiers sites */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Nom Projet</th>
                          <th className="py-2.5 px-3">Commune & CP</th>
                          <th className="py-2.5 px-3">Coordonnées GPS</th>
                          <th className="py-2.5 px-3">Poste Source ODRE</th>
                          <th className="py-2.5 px-3">Dist. Réseau</th>
                          <th className="py-2.5 px-3">Quote-Part S3REnR</th>
                          <th className="py-2.5 px-3">Puissance / Capacité</th>
                          <th className="py-2.5 px-3 text-right">EBITDA An 1</th>
                          <th className="py-2.5 px-3 text-right">Payback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-medium text-[11px]">
                        {sitesP1.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-400">{s.id}</td>
                            <td className="py-2 px-3 font-extrabold text-[#0b192c]">{s.name}</td>
                            <td className="py-2 px-3 text-slate-700">{s.city} ({s.cp})</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-blue-700">{s.gps}</td>
                            <td className="py-2 px-3 font-bold text-emerald-700">{s.substation}</td>
                            <td className="py-2 px-3 text-slate-600">{s.dist}</td>
                            <td className="py-2 px-3 text-slate-700">{s.s3renr}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{s.power} / {s.cap}</td>
                            <td className="py-2 px-3 text-right font-black text-amber-700">{s.ebitda}</td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600">{s.payback}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
                  <span>ENR COURTAGE SAS • 7 Rue Gutenberg, 33700 Mérignac • contact@enr-courtage.fr</span>
                  <span>Plateforme Transactionnelle M&A • Strictement Confidentiel</span>
                  <span className="font-bold text-slate-700">Planche 5 / 6 (Paysage)</span>
                </div>
              </section>

              {/* PLANCHE 6 : SITES 17 À 31 & TOTAL CONSOLIDÉ */}
              <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <div className="flex items-center gap-4">
                      <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-10 w-auto object-contain" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                          Pipeline Foncier Sécurisé (Partie 2/2)
                        </span>
                        <h2 className="text-xl font-black text-[#0b192c] tracking-tight mt-1">
                          Répertoire Foncier & Réseau des 31 Projets BESS — Sites #17 à #31
                        </h2>
                        <p className="text-xs font-medium text-slate-600">
                          Consolidation exhaustive des 31 unités prêtes à construire (15.5 MW / 32.36 MWh).
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                        Total 31 Unités • 15.5 MW Consolidés
                      </span>
                    </div>
                  </div>

                  {/* Tableau des 15 derniers sites et ligne de consolidation */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Nom Projet</th>
                          <th className="py-2.5 px-3">Commune & CP</th>
                          <th className="py-2.5 px-3">Coordonnées GPS</th>
                          <th className="py-2.5 px-3">Poste Source ODRE</th>
                          <th className="py-2.5 px-3">Dist. Réseau</th>
                          <th className="py-2.5 px-3">Quote-Part S3REnR</th>
                          <th className="py-2.5 px-3">Puissance / Capacité</th>
                          <th className="py-2.5 px-3 text-right">EBITDA An 1</th>
                          <th className="py-2.5 px-3 text-right">Payback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-medium text-[11px]">
                        {sitesP2.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-400">{s.id}</td>
                            <td className="py-2 px-3 font-extrabold text-[#0b192c]">{s.name}</td>
                            <td className="py-2 px-3 text-slate-700">{s.city} ({s.cp})</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-blue-700">{s.gps}</td>
                            <td className="py-2 px-3 font-bold text-emerald-700">{s.substation}</td>
                            <td className="py-2 px-3 text-slate-600">{s.dist}</td>
                            <td className="py-2 px-3 text-slate-700">{s.s3renr}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{s.power} / {s.cap}</td>
                            <td className="py-2 px-3 text-right font-black text-amber-700">{s.ebitda}</td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600">{s.payback}</td>
                          </tr>
                        ))}

                        {/* Ligne Total Consolidé 31 Sites */}
                        <tr className="bg-gradient-to-r from-slate-900 to-blue-950 text-white font-black text-xs">
                          <td colSpan={7} className="py-3 px-3 uppercase tracking-wider text-emerald-300">
                            TOTAL CONSOLIDÉ PORTEFEUILLE (31 SITES • 15.5 MW / 32.36 MWh)
                          </td>
                          <td className="py-3 px-3 font-extrabold text-white">15.5 MW / 32.36 MWh</td>
                          <td className="py-3 px-3 text-right text-amber-300 font-black">1.50 M€</td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-black">4.8 ans</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
                  <span>ENR COURTAGE SAS • 7 Rue Gutenberg, 33700 Mérignac • contact@enr-courtage.fr</span>
                  <span>Plateforme Transactionnelle M&A • Strictement Confidentiel</span>
                  <span className="font-bold text-slate-700">Planche 6 / 6 (Paysage)</span>
                </div>
              </section>
            </>
          ) : (
            /* PLANCHE 5 : FICHE FONCIER & RÉSEAU DU SITE INDIVIDUEL */
            <section className="bess-render-page mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between" style={{ width: '1380px', minHeight: '940px', boxSizing: 'border-box' }}>
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                  <div className="flex items-center gap-4">
                    <img src="/logo-enr-courtage-inline.png" alt="ENR COURTAGE" className="h-10 w-auto object-contain" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        Fiche Foncier & Raccordement Projet
                      </span>
                      <h2 className="text-2xl font-black text-[#0b192c] tracking-tight mt-1">
                        Qualification Réseau & Droits Fonciers — {projectData?.name || selectedSite.name}
                      </h2>
                      <p className="text-xs font-medium text-slate-600">
                        Localisation précise, rattachement ODRE Enedis et conformité de la promesse de bail notariée.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      Site #8 • Concèze (19)
                    </span>
                  </div>
                </div>

                {/* Données de localisation et d'insertion réseau */}
                <div className="grid grid-cols-2 gap-5 mb-5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                      Localisation & Données Foncières du Projet
                    </h3>
                    <ul className="text-xs space-y-2 text-slate-700 font-medium">
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Nom du site :</span>
                        <span className="font-bold text-slate-900">{projectData?.name || selectedSite.name}</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Commune & Code Postal :</span>
                        <span className="font-bold text-slate-900">{selectedSite.city} ({selectedSite.cp})</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Adresse d'implantation :</span>
                        <span className="font-bold text-slate-900">{selectedSite.address}</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Coordonnées GPS WGS84 :</span>
                        <span className="font-mono font-bold text-blue-700">{selectedSite.gps}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-500">Sécurisation foncière :</span>
                        <span className="font-bold text-emerald-700">Promesse de bail notariée 30 ans (5 000 €/an indexé)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                      Poste Source ODRE & Caractéristiques Réseau
                    </h3>
                    <ul className="text-xs space-y-2 text-slate-700 font-medium">
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Poste Source Enedis :</span>
                        <span className="font-bold text-emerald-700">{selectedSite.substation}</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Distance réseau à vol d'oiseau :</span>
                        <span className="font-bold text-slate-900">{selectedSite.dist}</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Quote-Part S3REnR :</span>
                        <span className="font-bold text-slate-900">{selectedSite.s3renr}</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Qualification TURPE 7 CRE 2025-227 :</span>
                        <span className="font-bold text-cyan-700">Zone Standard (Économie +14 183 €/an)</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-500">Raccordement HTA :</span>
                        <span className="font-bold text-blue-700">HTA 20 kV (10 m de distance privée)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Insertion dans la grappe des 31 projets */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                  <div className="font-bold text-slate-900 mb-1">Synergies d'Échelle & Agrégation Territoriale :</div>
                  <p className="text-slate-600 leading-relaxed">
                    Ce projet fait partie intégrante du programme territorial de 31 centrales BESS pilotées par ENR COURTAGE. Il bénéficie de contrats-cadres négociés pour l'achat matériel (CESC Mercury 261), les polices d'assurance tous risques et l'agrégation de marché RTE / EPEX SPOT (commission préférentielle de 18% sur le CA brut).
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[11px] text-slate-500 font-medium">
                <span>ENR COURTAGE SAS • Fiche Foncier & Raccordement Projet</span>
                <span>Audit d'Implantation HTA Enedis • Confidentiel</span>
                <span className="font-bold text-slate-700">Planche 5 / 5 (Paysage)</span>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
