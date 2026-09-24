import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  TrendingUp,
  BatteryCharging,
  Zap,
  MapPin,
  FileDown,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Table as TableIcon,
  Landmark,
  Percent,
  Calendar,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { BESS_PORTFOLIO_SITES, getBessPortfolioSites } from '../../data/bessPortfolioData.js';
import { getCreSubstationQualification } from '../../services/creZonesService.js';
import { calculateIrr, calculatePmt, calculateProjectPayback, calculateEquityPayback, computeBessFinancials } from '../../services/bessSimulationEngine.js';
import { exportBessPortfolioToExcel, exportBessOdreMatrixToExcel } from '../../services/exportBessExcel.js';
import * as XLSX from 'xlsx';

const fmtEur = (v) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0))} €`;
const fmtK = (v) => `${(v / 1000).toFixed(0)} k€`;
const fmtM = (v) => `${(v / 1000000).toFixed(2)} M€`;
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

export default function BessPortfolioView({ onSelectSite, onExportPdf, onDataChange, projects = [] }) {
  const [selectedPortfolio, setSelectedPortfolio] = useState('VOLTA'); // 'VOLTA' | 'TESLA' | 'ALL'
  const [selectedSpv, setSelectedSpv] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChronique, setExpandedChronique] = useState(false);

  // Paramètres de dette senior modifiables
  const [debtDuration, setDebtDuration] = useState(12); // en années (e.g. 10, 12, 15, 20)
  const [debtRate, setDebtRate] = useState(4.30); // en % (e.g. 3.80, 4.00, 4.30, 4.50, 5.00)

  // Modèle unitaire standardisé (4 armoires CESC Mercury 261 = 500 kW / 1044 kWh)
  const unitPower = 500; // kW
  const unitCapacity = 1044; // kWh
  const nbCyclesJour = 2.0; // 2 cycles/jour
  const studyYears = 15;

  // Harmonisation des sites BESS avec les projets CRM et attribution portefeuille VOLTA / TESLA
  const allPortfolioSites = useMemo(() => {
    return getBessPortfolioSites(projects, 'ALL');
  }, [projects]);

  // Sites actifs filtrés par portefeuille (VOLTA vs TESLA vs TOUS)
  const activeSites = useMemo(() => {
    if (selectedPortfolio === 'ALL') return allPortfolioSites;
    return allPortfolioSites.filter(s => s.portfolio === selectedPortfolio);
  }, [allPortfolioSites, selectedPortfolio]);

  // Calcul financier de chaque site et agrégation avec dette dynamique via computeBessFinancials
  const { analyzedSites, consolidatedTotals, consolidatedChronique } = useMemo(() => {
    const rateDecimal = (debtRate || 4.30) / 100;
    const durationYears = debtDuration || 12;

    const sites = activeSites.map((site, index) => {
      const fin = computeBessFinancials(site, {
        debtDuration: durationYears,
        debtRate: debtRate || 4.30,
        studyDuration: studyYears
      });
      const creQualification = getCreSubstationQualification(site.substation?.name || fin.posteSource, site.substation?.code);

      return {
        ...site,
        index: index + 1,
        powerKw: unitPower,
        capacityKwh: unitCapacity,
        capexTotal: fin.capexTotal,
        caAnnuel: fin.caAnnuel,
        opexAnnuel: fin.opexAnnuel,
        turpeAnnuel: fin.turpeAnnuel,
        ebitda: fin.ebitdaAn1,
        ebitdaAn1: fin.ebitdaAn1,
        triProjet: fin.triProjet,
        payback: fin.payback,
        paybackAnnees: fin.paybackAnnees,
        paybackFormatted: fin.paybackFormatted,
        paybackEquity: fin.paybackEquity,
        dscrMoyen: fin.dscrMoyen,
        creQualification,
        fin,
        rows: fin.rows.map(r => ({
          year: r.year,
          ca: r.caTotalBrut,
          opex: r.opex,
          ebitda: r.ebe,
          serviceDette: r.serviceDette,
          cfNet: r.cashFlow
        }))
      };
    });

    // Agrégation consolidée du portefeuille
    const totalSites = sites.length;
    const totalPowerMw = (totalSites * unitPower) / 1000; // 15.5 MW
    const totalCapacityMwh = (totalSites * unitCapacity) / 1000; // 32.36 MWh
    const totalCapex = sites.reduce((sum, s) => sum + s.capexTotal, 0);
    const totalCaAn1 = sites.reduce((sum, s) => sum + s.caAnnuel, 0);
    const totalOpexAn1 = sites.reduce((sum, s) => sum + s.opexAnnuel, 0);
    const totalEbitdaAn1 = sites.reduce((sum, s) => sum + s.ebitda, 0);
    const totalLoyersAn1 = sites.reduce((sum, s) => sum + (s.rent || 3000), 0);
    const totalAnnuite = Math.abs(calculatePmt(rateDecimal, durationYears, totalCapex));

    // Chronique consolidée 15 ans
    const chronique = [];
    const consolidatedCfProjet = [-totalCapex];

    for (let y = 1; y <= studyYears; y++) {
      const caY = sites.reduce((sum, s) => sum + s.rows[y - 1].ca, 0);
      const opexY = sites.reduce((sum, s) => sum + s.rows[y - 1].opex, 0);
      const ebitdaY = caY - opexY;
      const servDetteY = y <= durationYears ? totalAnnuite : 0;
      const isY = sites.reduce((sum, s) => {
        const amort = s.capexTotal / studyYears;
        const interest = y <= durationYears ? (s.capexTotal * (1 - (y - 1) / durationYears) * rateDecimal) : 0;
        const resFisc = Math.max(0, s.rows[y - 1].ebitda - amort - interest);
        return sum + (resFisc * 0.25);
      }, 0);
      const cfNetY = ebitdaY - servDetteY - isY;

      consolidatedCfProjet.push(ebitdaY - isY);

      chronique.push({
        year: y,
        ca: caY,
        opex: opexY,
        ebitda: ebitdaY,
        serviceDette: servDetteY,
        cfNet: cfNetY,
        cumulCf: y === 1 ? cfNetY : 0
      });
    }

    let runningCumul = 0;
    chronique.forEach(row => {
      runningCumul += row.cfNet;
      row.cumulCf = runningCumul;
    });

    const triConsolide = calculateIrr(consolidatedCfProjet, 0.08);
    const paybackConsol = calculateProjectPayback(totalCapex, chronique.map(c => c.ebitda));

    // Calcul du DSCR moyen portefeuille pendant la période de dette
    const dscrArray = chronique.filter(c => c.serviceDette > 0).map(c => c.ebitda / c.serviceDette);
    const avgDscr = dscrArray.length > 0 ? dscrArray.reduce((a, b) => a + b, 0) / dscrArray.length : 1.98;

    return {
      analyzedSites: sites,
      consolidatedTotals: {
        totalSites,
        totalPowerMw,
        totalCapacityMwh,
        totalCapex,
        totalCaAn1,
        totalOpexAn1,
        totalEbitdaAn1,
        totalLoyersAn1,
        totalAnnuite,
        avgDscr,
        debtDuration: durationYears,
        debtRate: debtRate,
        triConsolide,
        paybackConsol: paybackConsol || (totalCapex / totalEbitdaAn1)
      },
      consolidatedChronique: chronique
    };
  }, [debtDuration, debtRate, activeSites]);

  // Propagation des données mises à jour au parent
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        debtDuration,
        debtRate,
        analyzedSites,
        consolidatedTotals,
        consolidatedChronique,
        selectedPortfolio
      });
    }
  }, [debtDuration, debtRate, analyzedSites, consolidatedTotals, consolidatedChronique, selectedPortfolio, onDataChange]);

  // Filtrage des sites
  const filteredSites = useMemo(() => {
    return analyzedSites.filter(site => {
      const matchSpv = selectedSpv === 'ALL' || site.spv === selectedSpv;
      const matchSearch =
        !searchTerm ||
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.substation?.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSpv && matchSearch;
    });
  }, [analyzedSites, selectedSpv, searchTerm]);

// Données réseau ODRE / Caparéseau des 31 postes sources du portefeuille BESS
const ODRE_CAPARESEAU_31_SITES = [
  { id: 1, site: "PAILLOT Noël", city: "Rochechouart", cp: "87600", dept: "87", lat: 45.847811, lng: 0.852996, substation: "PLAUD", distKm: 6.6, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix injection" },
  { id: 2, site: "BATIOT Olivier", city: "Mongausy", cp: "32220", dept: "32", lat: 43.496370, lng: 0.834241, substation: "SEMEZIES", distKm: 5.9, s3renrStr: "84 130 €/MW", capOdre: 1.6, zoneCre: "Poche signal-prix injection" },
  { id: 3, site: "DOMERGUE David", city: "Meuzac", cp: "87380", dept: "87", lat: 45.566247, lng: 1.397687, substation: "LE REPAIRE", distKm: 8.6, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 4, site: "CUBERTAFON René", city: "Saint-Julien-le-Vendômois", cp: "19210", dept: "19", lat: 45.460274, lng: 1.298160, substation: "LUBERSAC", distKm: 8.3, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 5, site: "PLANTE Jean-Pierre", city: "Port-de-Lanne", cp: "40300", dept: "40", lat: 43.558940, lng: -1.199501, substation: "GUICHE", distKm: 4.9, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 6, site: "PRAVIE Clémence", city: "Grisolles", cp: "82170", dept: "82", lat: 43.806232, lng: 1.295833, substation: "LESQUIVE 2", distKm: 2.3, s3renrStr: "84 130 €/MW", capOdre: 80.0, zoneCre: "Zone standard Enedis" },
  { id: 7, site: "LATOURNERIE Franck", city: "Brantôme en Périgord", cp: "24310", dept: "24", lat: 45.328888, lng: 0.651040, substation: "BRANTOME", distKm: 3.5, s3renrStr: "92 730 €/MW", capOdre: 0.5, zoneCre: "Poche signal-prix soutirage" },
  { id: 8, site: "DAVID Louis", city: "Concèze", cp: "19350", dept: "19", lat: 45.353329, lng: 1.314195, substation: "LUBERSAC", distKm: 8.6, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 9, site: "GRANGER Bruno", city: "Saint-Éloy-les-Tuileries", cp: "19210", dept: "19", lat: 45.442533, lng: 1.267710, substation: "LUBERSAC", distKm: 10.5, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 10, site: "CASTEBRUNET Jérémy", city: "Caussade", cp: "82300", dept: "82", lat: 44.123740, lng: 1.564486, substation: "LERE", distKm: 5.7, s3renrStr: "84 130 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 11, site: "BERTRANDIE Sébastien", city: "Monestier", cp: "24240", dept: "24", lat: 44.773569, lng: 0.300107, substation: "STE-FOY-LA-GRANDE", distKm: 9.0, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 12, site: "GIOT Joachim", city: "Leyrat", cp: "23600", dept: "23", lat: 46.360561, lng: 2.306566, substation: "BOUSSAC", distKm: 5.9, s3renrStr: "92 730 €/MW", capOdre: 0.5, zoneCre: "Poche signal-prix injection" },
  { id: 13, site: "ARBOIN Régis", city: "Duras", cp: "47120", dept: "47", lat: 44.659496, lng: 0.222735, substation: "LA SAUVETAT", distKm: 11.8, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche mixte injection & soutirage" },
  { id: 14, site: "MISSAULT David", city: "Saint-Saud-Lacoussière", cp: "24470", dept: "24", lat: 45.558769, lng: 0.804488, substation: "NONTRON", distKm: 13.7, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 15, site: "MEILLAT Maxime", city: "Mourioux-Vieilleville", cp: "23210", dept: "23", lat: 46.082964, lng: 1.538518, substation: "CHATELUS 2", distKm: 5.4, s3renrStr: "92 730 €/MW", capOdre: 2.0, zoneCre: "Zone standard Enedis" },
  { id: 16, site: "SOULIGNAC Thierry", city: "Val-de-Livenne", cp: "33860", dept: "33", lat: 45.264357, lng: -0.550408, substation: "ETAULIERS", distKm: 7.7, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 17, site: "CHAUFFAILLE Franck", city: "Payzac", cp: "24270", dept: "24", lat: 45.436230, lng: 1.288728, substation: "LUBERSAC", distKm: 6.9, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 18, site: "CIROLI", city: "Juillac", cp: "33890", dept: "33", lat: 44.809547, lng: 0.037304, substation: "AURIOLLES", distKm: 7.9, s3renrStr: "92 730 €/MW", capOdre: 0.3, zoneCre: "Poche signal-prix soutirage" },
  { id: 19, site: "BOURDETTES Sandrine", city: "Mansan", cp: "65140", dept: "65", lat: 43.343730, lng: 0.194628, substation: "VIC-EN-BIGORRE", distKm: 10.8, s3renrStr: "84 130 €/MW", capOdre: 7.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 20, site: "CASTEBRUNET Jérémy", city: "Caussade", cp: "82300", dept: "82", lat: 44.117157, lng: 1.566758, substation: "LERE", distKm: 5.5, s3renrStr: "84 130 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 21, site: "FRECHEVILLE Mathieu", city: "Saint-Eutrope-de-Born", cp: "47210", dept: "47", lat: 44.588327, lng: 0.665431, substation: "CANCON", distKm: 7.2, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix injection" },
  { id: 22, site: "CASTEBRUNET Jérémy", city: "Monteils", cp: "82300", dept: "82", lat: 44.165754, lng: 1.564963, substation: "LERE", distKm: 3.6, s3renrStr: "84 130 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" },
  { id: 23, site: "DOUMENS Morgan", city: "Beychac-et-Caillau", cp: "33750", dept: "33", lat: 44.870054, lng: -0.397698, substation: "POMPIGNAC", distKm: 4.0, s3renrStr: "92 730 €/MW", capOdre: 2.0, zoneCre: "Zone standard Enedis" },
  { id: 24, site: "HOUSSAIT-YOUNG Jérôme", city: "Vendays-Montalivet", cp: "33930", dept: "33", lat: 45.338321, lng: -1.071016, substation: "ST-VIVIEN", distKm: 9.9, s3renrStr: "92 730 €/MW", capOdre: 8.6, zoneCre: "Poche signal-prix soutirage" },
  { id: 25, site: "MISSAULT David", city: "Saint-Martin-de-Fressengeas", cp: "24800", dept: "24", lat: 45.438589, lng: 0.815692, substation: "THIVIERS", distKm: 6.7, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Poche mixte injection & soutirage" },
  { id: 26, site: "LARDY Michel", city: "Maisonnisses", cp: "23150", dept: "23", lat: 46.067915, lng: 1.907318, substation: "LAVAUD", distKm: 10.6, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 27, site: "CELERIE Thomas", city: "Beyssenac", cp: "19230", dept: "19", lat: 45.400772, lng: 1.284338, substation: "LUBERSAC", distKm: 7.1, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 28, site: "MEILLAT Maxime", city: "Mourioux-Vieilleville", cp: "23210", dept: "23", lat: 46.081523, lng: 1.633909, substation: "CHATELUS 2", distKm: 5.4, s3renrStr: "92 730 €/MW", capOdre: 2.0, zoneCre: "Zone standard Enedis" },
  { id: 29, site: "DOMERGUE David", city: "Argences en Aubrac", cp: "12420", dept: "12", lat: 44.807528, lng: 2.798446, substation: "RUEYRES", distKm: 5.9, s3renrStr: "84 130 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix injection" },
  { id: 30, site: "COMBY Fabrice", city: "Saint-Éloy-les-Tuileries", cp: "19210", dept: "19", lat: 45.452807, lng: 1.284563, substation: "LUBERSAC", distKm: 10.5, s3renrStr: "92 730 €/MW", capOdre: 0.0, zoneCre: "Zone standard Enedis" },
  { id: 31, site: "CASTEBRUNET Jérémy", city: "Saint-Cirq", cp: "82300", dept: "82", lat: 44.124392, lng: 1.583302, substation: "LERE", distKm: 6.2, s3renrStr: "84 130 €/MW", capOdre: 0.0, zoneCre: "Poche signal-prix soutirage" }
];

  // Export Excel du business plan consolidé par site
  const handleExportExcel = () => {
    exportBessPortfolioToExcel(activeSites, {
      debtDuration,
      debtRate,
      studyDuration: studyYears,
      portfolioName: selectedPortfolio
    });
  };

  // Export Excel de la Matrice Caparéseau ODRE des 31 postes sources
  const handleExportOdreMatrix = () => {
    exportBessOdreMatrixToExcel();
  };

  return (
    <div id="pdf-section-bess-portfolio" className="space-y-5 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
      {/* ── En-tête Portefeuille & Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Layers className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                PORTEFEUILLE MULTI-PROJETS BESS — {selectedPortfolio === 'ALL' ? 'CONSOLIDÉ' : selectedPortfolio} ({consolidatedTotals.totalSites} SITES / {consolidatedTotals.totalPowerMw.toFixed(1)} MW)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Consolidation {selectedPortfolio === 'ALL' ? 'globale' : `du portefeuille ${selectedPortfolio}`} de {consolidatedTotals.totalSites} unités de 500 kW / 1044 kWh (CESC Mercury 261) • Raccordements ODRE réels • Modèle 15 ans
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3" data-html2canvas-ignore="true">
          {/* Sélecteur de Portefeuille VOLTA / TESLA */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg border border-white/20">
            <button
              type="button"
              onClick={() => setSelectedPortfolio('VOLTA')}
              className={`px-3 py-1.5 text-xs font-black rounded-md transition-all flex items-center gap-1.5 ${
                selectedPortfolio === 'VOLTA'
                  ? 'bg-blue-600 text-white shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Portefeuille VOLTA</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-900/80 text-blue-200">
                {allPortfolioSites.filter(s => s.portfolio === 'VOLTA').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPortfolio('TESLA')}
              className={`px-3 py-1.5 text-xs font-black rounded-md transition-all flex items-center gap-1.5 ${
                selectedPortfolio === 'TESLA'
                  ? 'bg-red-600 text-white shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Portefeuille TESLA</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-red-900/80 text-red-200">
                {allPortfolioSites.filter(s => s.portfolio === 'TESLA').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPortfolio('ALL')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                selectedPortfolio === 'ALL'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous ({allPortfolioSites.length})
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all flex items-center gap-1.5"
            title="Télécharger l'analyse consolidée complète au format Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            BP consolidé par site
          </button>
          <button
            onClick={handleExportOdreMatrix}
            className="px-3 py-2 text-xs font-bold bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-xs"
            title="Télécharger la matrice Caparéseau ODRE des 31 postes sources au format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
            Matrice CAPARESEAU ODRE
          </button>
        </div>
      </div>

      {/* ── Paramètres de Financement Dette Sénior (Durée & Taux Modifiables) ── */}
      <div className="bg-white rounded-xl border-2 border-blue-200/80 shadow-md p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black">
              <Landmark className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  STRUCTURE & PARAMÈTRES DE FINANCEMENT (DETTE SÉNIOR)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Simulation Interactive
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ajustez la durée et le taux d'intérêt bancaire pour recalculer en temps réel le cash-flow, le DSCR, le payback et le dossier PDF.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Contrôle Durée de la Dette */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Durée d'Amortissement
              </label>
              <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                {debtDuration} ans
              </span>
            </div>
            
            {/* Pills de sélection rapide */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {[10, 12, 15, 20].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDebtDuration(d)}
                  className={`py-1 text-xs font-bold rounded-lg border transition-all ${
                    debtDuration === d
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d} ans
                </button>
              ))}
            </div>

            {/* Slider / Range */}
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={debtDuration}
              onChange={e => setDebtDuration(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>5 ans</span>
              <span>12 ans (Standard)</span>
              <span>20 ans</span>
            </div>
          </div>

          {/* Contrôle Taux d'Intérêt */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-600" />
                Taux d'Intérêt Bancaire
              </label>
              <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                {debtRate.toFixed(2)} %
              </span>
            </div>

            {/* Pills de sélection rapide */}
            <div className="grid grid-cols-5 gap-1 mb-2.5">
              {[3.80, 4.00, 4.30, 4.50, 5.00].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDebtRate(r)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    debtRate === r
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.toFixed(2)}%
                </button>
              ))}
            </div>

            {/* Slider / Range */}
            <input
              type="range"
              min="2.0"
              max="8.0"
              step="0.05"
              value={debtRate}
              onChange={e => setDebtRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>2.00%</span>
              <span>4.30% (Standard)</span>
              <span>8.00%</span>
            </div>
          </div>

          {/* Métrique Annuité Portefeuille */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Annuité Totale Portefeuille
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {fmtEur(consolidatedTotals.totalAnnuite)} <span className="text-xs font-medium text-slate-500">/ an</span>
            </div>
            <div className="text-[10px] font-semibold text-blue-700 mt-1 bg-blue-50/80 px-2 py-1 rounded border border-blue-100">
              ~{fmtEur(consolidatedTotals.totalAnnuite / 31)} / an / site ({debtDuration} ans)
            </div>
          </div>

          {/* Métrique DSCR Portefeuille */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ratio DSCR Moyen
            </div>
            <div className="text-lg font-black text-emerald-700 mt-1">
              {consolidatedTotals.avgDscr.toFixed(2)}x
            </div>
            <div className="text-[10px] font-semibold text-emerald-800 mt-1 bg-emerald-50/80 px-2 py-1 rounded border border-emerald-100">
              Couverture dette bancaire ({debtDuration} ans)
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards Consolidation ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puissance Globale</div>
          <div className="text-xl font-black text-slate-900 mt-1">15.5 MW</div>
          <div className="text-[10px] font-semibold text-blue-600 mt-0.5">31 × 500 kW HTA</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacité Stockage</div>
          <div className="text-xl font-black text-slate-900 mt-1">32.36 MWh</div>
          <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">31 × 1044 kWh (2h)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAPEX Consolidé</div>
          <div className="text-xl font-black text-slate-900 mt-1">{fmtM(consolidatedTotals.totalCapex)}</div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">~350 k€ / site raccordé</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CA Annuel An 1</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{fmtM(consolidatedTotals.totalCaAn1)}</div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">~121,4 k€ / unité</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EBITDA An 1</div>
          <div className="text-xl font-black text-blue-600 mt-1">{fmtM(consolidatedTotals.totalEbitdaAn1)}</div>
          <div className="text-[10px] font-semibold text-blue-700 mt-0.5">Marge : 82%</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TRI / Payback</div>
          <div className="text-xl font-black text-purple-600 mt-1">{fmtPct(consolidatedTotals.triConsolide)}</div>
          <div className="text-[10px] font-bold text-purple-700 mt-0.5">Retour : {consolidatedTotals.paybackConsol.toFixed(1)} ans</div>
        </div>
      </div>

      {/* ── Chronique Prévisionnelle Consolidée 15 ans (P&L Dépliable) ─────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div 
          onClick={() => setExpandedChronique(!expandedChronique)}
          className="p-3.5 bg-slate-100 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Compte de Résultat Consolidé 15 Ans — Portefeuille 31 Sites
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>{expandedChronique ? 'Masquer le tableau' : 'Afficher les 15 années'}</span>
            {expandedChronique ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {expandedChronique && (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-bold">
                  <th className="p-2 text-left">Poste Financier (€)</th>
                  {consolidatedChronique.map(c => (
                    <th key={c.year} className="p-2 whitespace-nowrap">A{c.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="font-bold text-emerald-700 bg-emerald-50/40">
                  <td className="p-2 text-left">Chiffre d'Affaires Consolidé</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.ca)}</td>)}
                </tr>
                <tr className="text-slate-600">
                  <td className="p-2 text-left">OPEX & Acheminement TURPE 7</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2 text-rose-600">-{fmtEur(c.opex)}</td>)}
                </tr>
                <tr className="font-black bg-blue-50/50 text-blue-900 border-t border-b border-blue-200">
                  <td className="p-2 text-left">EBITDA Portefeuille</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.ebitda)}</td>)}
                </tr>
                <tr className="text-slate-600">
                  <td className="p-2 text-left">Service de la Dette ({debtDuration} ans à {debtRate.toFixed(2)}%)</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2 text-slate-500">{c.serviceDette > 0 ? `-${fmtEur(c.serviceDette)}` : '—'}</td>)}
                </tr>
                <tr className="font-bold bg-amber-50/50 text-amber-800">
                  <td className="p-2 text-left">Cash-Flow Net Annuel</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.cfNet)}</td>)}
                </tr>
                <tr className="font-black bg-slate-100 text-slate-900">
                  <td className="p-2 text-left">Trésorerie Cumulée</td>
                  {consolidatedChronique.map(c => <td key={c.year} className="p-2">{fmtEur(c.cumulCf)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Table Détaillée des 31 Sites BESS ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Inventaire Exhaustif des 31 Sites du Portefeuille
            </h3>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-blue-100 text-blue-800">
              {filteredSites.length} / 31 sites
            </span>
          </div>

          <div className="flex items-center gap-2" data-html2canvas-ignore="true">
            {/* Filtre SPV */}
            <select
              value={selectedSpv}
              onChange={e => setSelectedSpv(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les SPV</option>
              <option value="SPV A">SPV A</option>
              <option value="SPV B">SPV B</option>
              <option value="SPV C">SPV C</option>
              <option value="SPV D">SPV D</option>
              <option value="SPV E">SPV E</option>
            </select>

            {/* Barre de recherche */}
            <input
              type="text"
              placeholder="Rechercher commune, site ou poste..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold text-left">
                <th className="p-2.5">N°</th>
                <th className="p-2.5">Site / SPV</th>
                <th className="p-2.5">Localisation</th>
                <th className="p-2.5">Poste Source Enedis (ODRE)</th>
                <th className="p-2.5 text-center">Distance</th>
                <th className="p-2.5">Zone CRE 2025-227</th>
                <th className="p-2.5 text-right">CAPEX</th>
                <th className="p-2.5 text-right">CA An 1</th>
                <th className="p-2.5 text-right">EBITDA</th>
                <th className="p-2.5 text-center">TRI</th>
                <th className="p-2.5 text-center">Payback</th>
                <th className="p-2.5 text-center" data-html2canvas-ignore="true">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSites.map(s => (
                <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="p-2.5 font-bold text-slate-400">{s.index}</td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[10px] font-semibold text-blue-600 uppercase">{s.spv}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-800">{s.city}</div>
                    <div className="text-[10px] text-slate-400">{s.postcode}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-800">{s.substation?.name || '—'}</div>
                    <div className="text-[10px] text-slate-500">
                      QP : {s.substation?.quotePartS3renr || '—'} • Disp : {s.substation?.resteAffecterMw != null ? `${s.substation.resteAffecterMw} MW` : '—'}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-bold text-slate-700">
                    {s.substation?.distanceKm ? `${s.substation.distanceKm} km` : '—'}
                  </td>
                  <td className="p-2.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {s.creQualification?.label || 'Zone Standard'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-semibold text-slate-800">{fmtEur(s.capexTotal)}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                  <td className="p-2.5 text-right font-black text-blue-700">{fmtEur(s.ebitda)}</td>
                  <td className="p-2.5 text-center font-black text-purple-700">{fmtPct(s.triProjet)}</td>
                  <td className="p-2.5 text-center font-bold text-slate-600">{s.payback.toFixed(1)} ans</td>
                  <td className="p-2.5 text-center" data-html2canvas-ignore="true">
                    {onSelectSite && (
                      <button
                        onClick={() => onSelectSite(s)}
                        className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors"
                        title="Charger ce site en simulation unitaire détaillée"
                      >
                        Simuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
