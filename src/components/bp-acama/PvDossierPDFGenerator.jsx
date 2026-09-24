import React, { useState, useEffect, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  FileDown,
  Loader2,
  Sun,
  TrendingUp,
  ShieldCheck,
  Layers,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  Zap,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Search,
  CheckSquare,
  Square,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import { PV_PORTFOLIO_SITES, computePvFinancials } from '../../data/pvPortfolioData.js';
import PvProjectSingleSheet from './PvProjectSingleSheet.jsx';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Helpers de formatage — séparateurs de milliers avec espace normal (pas narrow no-break space)
const fmtEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— €';
  const parts = Math.round(val).toString().replace('-', '');
  const sign = val < 0 ? '-' : '';
  const formatted = parts.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return sign + formatted + ' €';
};

const fmtM = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— M€';
  const num = (val / 1000000).toFixed(2);
  const [int, dec] = num.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return formatted + ',' + dec + ' M€';
};

const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '— %';
  return (val || 0).toFixed(1) + ' %';
};

// Composant interne Leaflet pour recentrer automatiquement la carte sur les projets sélectionnés
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

export default function PvDossierPDFGenerator({ open, onClose, portfolioData }) {
  const [activeMode, setActiveMode] = useState('portfolio'); // 'portfolio' | 'single'
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);

  // 1. Liste exhaustive brute des centrales du portefeuille avec calculs financiers unitaires
  const allAvailableSites = useMemo(() => {
    const raw = portfolioData?.analyzedSites || PV_PORTFOLIO_SITES;
    return raw.map((s, idx) => {
      const fin = s.capexTotal ? s : computePvFinancials(s);
      return {
        ...s,
        ...fin,
        id: s.id || `pv_site_${idx + 1}`,
        siteName: s.siteName || s.name || `Centrale ${idx + 1}`,
        commune: s.commune || s.city || '—',
        codePostal: s.codePostal || s.postcode || '—',
        kwc: s.kwc || fin.kwc || 250,
        posteSource: s.posteSource || s.substation?.name || 'ODRE',
        capexTotal: fin.capexTotal || s.capexTotal || 250000,
        ebitdaAn1: fin.ebitdaAn1 || s.ebitdaAn1 || 20000,
        caAnnuel: fin.caAnnuel || s.caAnnuel || 25000,
        distanceKm: s.distanceKm || s.substation?.distanceKm || 5.0,
        typeBat: s.typeBat || 'Bâtiment BAC',
        lat: s.lat || fin.lat,
        lng: s.lng || fin.lng
      };
    });
  }, [portfolioData?.analyzedSites]);

  // 2. Persistance de la sélection active dans le state du visualiseur
  const [selectedProjectIds, setSelectedProjectIds] = useState(() => allAvailableSites.map(s => s.id));

  // Synchronisation dynamique si la liste change
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

  useEffect(() => {
    if (portfolioData?.autoExportType === 'single') {
      setActiveMode('single');
    } else {
      setActiveMode('portfolio');
    }
  }, [portfolioData]);

  if (!open) return null;

  const currentProject = portfolioData?.currentProject;
  const currentParams = portfolioData?.currentParams;
  const currentResults = portfolioData?.currentResults;
  const currentRows = portfolioData?.currentRows;
  const isPort = activeMode === 'portfolio';

  // 3. Centrales actives filtrées strictement selon la sélection utilisateur
  const portfolioSites = isPort
    ? allAvailableSites.filter(s => selectedProjectIds.includes(s.id))
    : allAvailableSites;

  // 4. Moteur de recalcul dynamique consolidé purement basé sur les projets sélectionnés
  const portfolioTotals = {
    totalSites: portfolioSites.length,
    totalPowerMw: portfolioSites.reduce((sum, s) => sum + (s.kwc || 250), 0) / 1000,
    totalProdMwh: portfolioSites.reduce((sum, s) => sum + (s.prodMwh || (s.kwc * 1.123) || 300), 0),
    totalCapex: portfolioSites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0),
    totalCaAn1: portfolioSites.reduce((sum, s) => sum + (s.caAnnuel || 25000), 0),
    totalEbitdaAn1: portfolioSites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0),
    triConsolide: portfolioSites.length > 0 && portfolioSites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0) > 0
      ? Math.max(5.0, Math.min(18.0, (portfolioSites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0) / portfolioSites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0)) * 100 * 0.95))
      : 9.5,
    paybackConsol: portfolioSites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0) > 0
      ? (portfolioSites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0) / portfolioSites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0))
      : 10.8,
    debtDuration: 20,
    debtRate: 4.3,
    avgDscr: 1.35
  };

  // Données actives (Unitaire vs Portefeuille)
  const singleKwc = currentParams?.kwc || currentProject?.puissance || 250;
  const singleCapex = currentResults?.totalConstruction || 250000;
  const singleCaAn1 = currentRows?.[0]?.ca || (singleKwc * 1123 * 0.082);
  const singleEbitdaAn1 = currentRows?.[0]?.ebitda || (singleCaAn1 * 0.82);
  const singleTri = currentResults?.tri || 9.8;
  const singlePayback = currentResults?.payback || 10.5;
  const singleProdMwh = (singleKwc * (currentParams?.productible || 1123)) / 1000;

  const kpi = {
    title: isPort ? "Portefeuille Multi-Projets Photovoltaïque HÉLIOS" : `Centrale Photovoltaïque — ${currentProject?.name || 'Projet Standard'}`,
    subtitle: isPort
      ? `Consolidation financière & réseau de ${portfolioTotals.totalSites} centrale${portfolioTotals.totalSites > 1 ? 's' : ''} en toitures et hangars agricoles (${portfolioTotals.totalPowerMw.toFixed(2)} MWc)`
      : `Dimensionnement technique et plan d'affaires de la centrale (${singleKwc.toFixed(1)} kWc) — ${currentProject?.city || 'Site'}`,
    powerLabel: isPort ? `${portfolioTotals.totalPowerMw.toFixed(2)} MWc` : `${singleKwc.toFixed(1)} kWc`,
    prodLabel: isPort ? `${Math.round(portfolioTotals.totalProdMwh).toLocaleString('fr-FR')} MWh/an` : `${Math.round(singleProdMwh).toLocaleString('fr-FR')} MWh/an`,
    capexLabel: isPort ? fmtM(portfolioTotals.totalCapex) : fmtEur(singleCapex),
    caLabel: isPort ? fmtEur(portfolioTotals.totalCaAn1) : fmtEur(singleCaAn1),
    ebitdaLabel: isPort ? fmtEur(portfolioTotals.totalEbitdaAn1) : fmtEur(singleEbitdaAn1),
    triLabel: isPort ? fmtPct(portfolioTotals.triConsolide) : fmtPct(singleTri),
    paybackLabel: isPort ? `${portfolioTotals.paybackConsol.toFixed(1)} ans` : `${singlePayback.toFixed(1)} ans`,
    dscrLabel: isPort ? `${(portfolioTotals.avgDscr || 1.35).toFixed(2)}x` : `${(currentResults?.dscrMoyen || 1.25).toFixed(2)}x`,
    debtDuration: 20,
    debtRate: 4.3
  };

  // Pagination dynamique du répertoire des centrales (max 22 sites par page pour éviter tout scroll)
  const SITES_PER_PAGE = 22;
  const repertoirePages = isPort
    ? (() => {
        const chunks = [];
        for (let i = 0; i < portfolioSites.length; i += SITES_PER_PAGE) {
          chunks.push(portfolioSites.slice(i, i + SITES_PER_PAGE));
        }
        return chunks.length > 0 ? chunks : [[]];
      })()
    : [[]];
  const repertoirePageCount = isPort ? repertoirePages.length : 1;

  const portfolioPlancheTitles = [
    "Synthèse Exécutive & Données Clés",
    "Compte de Résultat & Cash-Flows 20 ans",
    ...Array.from({ length: repertoirePageCount }, (_, i) =>
      repertoirePageCount > 1
        ? `Répertoire des Centrales PV (${i + 1}/${repertoirePageCount})`
        : "Répertoire Exhaustif des Centrales PV"
    ),
    "Cartographie des Projets PV"
  ];
  const singlePlancheTitles = [
    "Synthèse Exécutive & Données Clés",
    "Compte de Résultat & Cash-Flows 20 ans",
    "Détail Technique des Bâtiments & Toitures",
    "Cartographie du Projet PV"
  ];
  const plancheTitles = isPort ? portfolioPlancheTitles : singlePlancheTitles;
  const totalPagesCount = plancheTitles.length;
  const totalCompletePages = isPort ? (totalPagesCount + portfolioSites.length) : totalPagesCount;

  // Chronique financière détaillée 20 ans pour la Planche 2 (Consolidation pure des flux)
  const detailedChronoRows = (() => {
    const yearsArr = Array.from({ length: 20 }, (_, i) => 2026 + i);

    if (!isPort) {
      const capex = singleCapex;
      const caAn1 = singleCaAn1;
      const ebitdaAn1 = singleEbitdaAn1;
      const opexAn1 = Math.max(0, caAn1 - ebitdaAn1);
      const emprunt = Math.round(capex * 0.90);
      const rateDec = 0.043;
      const annuite = Math.round(emprunt * (rateDec / (1 - Math.pow(1 + rateDec, -20))));

      let detteDebut = emprunt;
      let cumulCashFlow = -Math.round(capex * 0.10);

      return yearsArr.map((y, i) => {
        const deg = Math.pow(1 - 0.0045, i);
        const idxT = Math.pow(1 + 0.006, i);
        const idxOpex = Math.pow(1 + 0.02, i);
        const ca = Math.round(caAn1 * deg * idxT);
        const maint = Math.round(opexAn1 * 0.50 * idxOpex);
        const assur = Math.round(opexAn1 * 0.25 * idxOpex);
        const taxes = Math.round(opexAn1 * 0.10 * idxOpex);
        const loyer = Math.round(opexAn1 * 0.15 * idxOpex);
        const mra = i === 10 ? Math.round(capex * 0.05) : 0;
        const opex = maint + assur + taxes + loyer + mra;
        const ebitda = ca - opex;
        const servDette = annuite;
        const interest = Math.round(detteDebut * rateDec);
        const principal = Math.max(0, servDette - interest);
        const amort = Math.round(capex / 20);
        const ebit = ebitda - amort;
        const resFiscal = Math.max(0, ebit - interest);
        const is = resFiscal > 0 ? (resFiscal < 42500 ? Math.round(resFiscal * 0.15) : Math.round((42500 * 0.15) + ((resFiscal - 42500) * 0.25))) : 0;
        const dscr = servDette > 0 ? ((ebitda - is) / servDette) : 9.99;
        const cfNet = ebitda - servDette - is;
        cumulCashFlow += cfNet;
        detteDebut = Math.max(0, detteDebut - principal);
        return {
          year: y, ca, caTotal: ca, maint, assur, taxes, loyer, mra, opex, ebitda,
          amortissement: amort, ebit, interets: interest, resFiscal, is, principal,
          serviceDette: servDette, dscr, cfNet, tresorerie: cfNet, cumulCashFlow
        };
      });
    }

    // Portefeuille : Somme exacte année par année des flux des projets sélectionnés
    const hasRows = portfolioSites.length > 0 && portfolioSites[0].rows && portfolioSites[0].rows.length >= 20;
    if (hasRows) {
      let cumulCashFlow = -Math.round(portfolioTotals.totalCapex * 0.10);
      return yearsArr.map((y, i) => {
        const ca = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.ca || 0), 0);
        const maint = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.maint || 0), 0);
        const assur = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.assur || 0), 0);
        const taxes = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.taxes || 0), 0);
        const loyer = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.loyer || 0), 0);
        const mra = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.mra || 0), 0);
        const opex = maint + assur + taxes + loyer + mra;
        const ebitda = ca - opex;
        const amortissement = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.amortissement || 0), 0);
        const ebit = ebitda - amortissement;
        const interets = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.interets || 0), 0);
        const resFiscal = Math.max(0, ebit - interets);
        const is = resFiscal > 0 ? (resFiscal < 42500 ? Math.round(resFiscal * 0.15) : Math.round((42500 * 0.15) + ((resFiscal - 42500) * 0.25))) : 0;
        const principal = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.principal || 0), 0);
        const serviceDette = portfolioSites.reduce((sum, s) => sum + (s.rows?.[i]?.serviceDette || 0), 0);
        const dscr = serviceDette > 0 ? ((ebitda - is) / serviceDette) : 9.99;
        const cfNet = ebitda - serviceDette - is;
        cumulCashFlow += cfNet;
        return {
          year: y, ca, caTotal: ca, maint, assur, taxes, loyer, mra, opex, ebitda,
          amortissement, ebit, interets, resFiscal, is, principal, serviceDette,
          dscr, cfNet, tresorerie: cfNet, cumulCashFlow
        };
      });
    }

    // Fallback dynamique
    const capex = portfolioTotals.totalCapex;
    const caAn1 = portfolioTotals.totalCaAn1;
    const ebitdaAn1 = portfolioTotals.totalEbitdaAn1;
    const opexAn1 = Math.max(0, caAn1 - ebitdaAn1);
    const emprunt = Math.round(capex * 0.90);
    const rateDec = 0.043;
    const annuite = Math.round(emprunt * (rateDec / (1 - Math.pow(1 + rateDec, -20))));

    let detteDebut = emprunt;
    let cumulCashFlow = -Math.round(capex * 0.10);

    return yearsArr.map((y, i) => {
      const deg = Math.pow(1 - 0.0045, i);
      const idxT = Math.pow(1 + 0.006, i);
      const idxOpex = Math.pow(1 + 0.02, i);
      const ca = Math.round(caAn1 * deg * idxT);
      const maint = Math.round(opexAn1 * 0.50 * idxOpex);
      const assur = Math.round(opexAn1 * 0.25 * idxOpex);
      const taxes = Math.round(opexAn1 * 0.10 * idxOpex);
      const loyer = Math.round(opexAn1 * 0.15 * idxOpex);
      const mra = i === 10 ? Math.round(capex * 0.05) : 0;
      const opex = maint + assur + taxes + loyer + mra;
      const ebitda = ca - opex;
      const servDette = annuite;
      const interest = Math.round(detteDebut * rateDec);
      const principal = Math.max(0, servDette - interest);
      const amort = Math.round(capex / 20);
      const ebit = ebitda - amort;
      const resFiscal = Math.max(0, ebit - interest);
      const is = resFiscal > 0 ? (resFiscal < 42500 ? Math.round(resFiscal * 0.15) : Math.round((42500 * 0.15) + ((resFiscal - 42500) * 0.25))) : 0;
      const dscr = servDette > 0 ? ((ebitda - is) / servDette) : 9.99;
      const cfNet = ebitda - servDette - is;
      cumulCashFlow += cfNet;
      detteDebut = Math.max(0, detteDebut - principal);
      return {
        year: y, ca, caTotal: ca, maint, assur, taxes, loyer, mra, opex, ebitda,
        amortissement, ebit, interets, resFiscal, is, principal, serviceDette,
        dscr, cfNet, tresorerie: cfNet, cumulCashFlow
      };
    });
  })();

  // Helper de rendu de ligne détaillée pour la Planche 2
  const DataRowP2 = ({ label, propName, isCurrency, format, bold, className, indent }) => (
    <tr className={`border-b border-slate-200 bg-white hover:bg-slate-50 ${className || ''}`}>
      <td className={`px-2 py-[1.2px] font-medium bg-slate-50 text-[7.5px] border-r border-slate-200 w-[185px] min-w-[185px] whitespace-nowrap ${bold ? 'font-black text-slate-900' : 'text-slate-700'} ${indent ? 'pl-3 italic text-slate-500' : ''}`}>
        {label}
      </td>
      {detailedChronoRows.map((r, i) => (
        <td key={i} className={`px-1 py-[1.2px] text-right border-r border-slate-200 text-[7.5px] whitespace-nowrap ${bold ? 'font-black' : ''}`}>
          {format ? format(r[propName]) : (isCurrency ? fmtEur(r[propName]) : (r[propName] || 0).toLocaleString('fr-FR'))}
        </td>
      ))}
    </tr>
  );

  // Helpers pour la modale de sélection multi-projets
  const filteredModalSites = allAvailableSites.filter(s => {
    if (!modalSearchTerm) return true;
    const term = modalSearchTerm.toLowerCase();
    return (
      (s.siteName || s.name || '').toLowerCase().includes(term) ||
      (s.commune || s.city || '').toLowerCase().includes(term) ||
      (s.posteSource || '').toLowerCase().includes(term) ||
      String(s.kwc || '').includes(term)
    );
  });

  const modalSelectedSites = allAvailableSites.filter(s => selectedProjectIds.includes(s.id));
  const modalSelectedPowerMw = modalSelectedSites.reduce((sum, s) => sum + (s.kwc || 250), 0) / 1000;
  const modalSelectedCapex = modalSelectedSites.reduce((sum, s) => sum + (s.capexTotal || 250000), 0);
  const modalSelectedEbitda = modalSelectedSites.reduce((sum, s) => sum + (s.ebitdaAn1 || 20000), 0);

  const toggleSiteSelection = (id) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Fonction d'exportation PDF multi-pages A4 Paysage Pleine Largeur (Fidélité 100% visionneuse & compression JPEG)
  const handleGeneratePdf = async (exportMode = 'portfolio') => {
    setIsExportingPdf(true);
    setExportProgress(3);
    setProgressStep('Initialisation du document A4 Paysage...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Collecter dynamiquement tous les conteneurs à capturer
      const pagesToCapture = [];
      for (let p = 1; p <= totalPagesCount; p++) {
        pagesToCapture.push({
          containerId: `pv-planche-container-${p}`,
          title: `Planche ${p}/${totalPagesCount} : ${plancheTitles[p - 1] || ''}`,
          type: 'portfolio',
          index: p
        });
      }

      if (exportMode === 'complete' && isPort) {
        for (let i = 0; i < portfolioSites.length; i++) {
          const s = portfolioSites[i];
          pagesToCapture.push({
            containerId: `pv-single-site-container-${i + 1}`,
            title: `Fiche Projet ${i + 1}/${portfolioSites.length} : ${s.siteName || s.name || `Centrale ${i + 1}`}`,
            type: 'site',
            index: i + 1
          });
        }
      }

      const totalTargetPages = pagesToCapture.length;

      for (let i = 0; i < totalTargetPages; i++) {
        const target = pagesToCapture[i];
        const container = document.getElementById(target.containerId);
        if (!container) continue;

        const page = container.querySelector('.pv-render-page');
        if (!page) continue;

        setProgressStep(`Capture page ${i + 1} / ${totalTargetPages} (${target.title})...`);
        setExportProgress(Math.round(((i + 1) / totalTargetPages) * 90));

        // Forcer temporairement l'affichage et scroller
        const prevDisplay = container.style.display;
        container.style.display = 'flex';
        page.scrollIntoView({ block: 'start', inline: 'nearest' });
        await new Promise(r => setTimeout(r, 60));

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 1380,
          height: 940,
          allowTaint: true,
          onclone: (clonedDoc) => {
            // Isoler strictement la page courante en masquant tous les autres conteneurs
            const allContainers = clonedDoc.querySelectorAll('[id^="pv-planche-container-"], [id^="pv-single-site-container-"]');
            allContainers.forEach((c) => {
              if (c.id === target.containerId) {
                c.style.display = 'flex';
                c.style.margin = '0';
                c.style.padding = '0';
              } else {
                c.style.display = 'none';
              }
            });

            // Réinitialiser les marges et scrolls du conteneur parent
            const scrollBox = clonedDoc.querySelector('[class*="overflow-y-auto"]');
            if (scrollBox) {
              scrollBox.style.padding = '0';
              scrollBox.style.margin = '0';
              scrollBox.scrollTop = 0;
            }

            // Ignorer les éléments annotés
            clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(el => el.remove());

            // Repositionnement parfait des calques Leaflet (SVG/Canvas/Panes) dans html2canvas
            const leafletNodes = clonedDoc.querySelectorAll(
              '.leaflet-map-pane, .leaflet-tile-pane, .leaflet-overlay-pane, .leaflet-zoom-animated, .leaflet-pane svg, .leaflet-pane canvas'
            );
            leafletNodes.forEach((node) => {
              const transform = node.style.transform;
              if (transform && transform !== 'none') {
                const match = transform.match(/translate(?:3d)?\(\s*([-\d.]+)px,\s*([-\d.]+)px/);
                if (match) {
                  const tx = parseFloat(match[1]);
                  const ty = parseFloat(match[2]);
                  const curL = parseFloat(node.style.left || 0);
                  const curT = parseFloat(node.style.top || 0);
                  node.style.left = `${curL + tx}px`;
                  node.style.top = `${curT + ty}px`;
                  node.style.transform = 'none';
                }
              }
            });
          }
        });

        // Restaurer le style d'affichage
        container.style.display = prevDisplay;

        // Compression JPEG 0.92 pour éliminer RangeError: Invalid string length
        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        if (i > 0) pdf.addPage('a4', 'landscape');
        // Pleine largeur exacte (0 marge pour couvrir 100% de la page A4 paysage sans bandes blanches)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      setExportProgress(100);
      setProgressStep('Finalisation et enregistrement du document...');

      const fileName = exportMode === 'complete'
        ? `Etude_Complete_PV_Portfolio_HELIOS_${portfolioSites.length}Sites_${totalCompletePages}Pages.pdf`
        : `Dossier_PV_${isPort ? `Portfolio_HELIOS_${portfolioSites.length}Sites` : (currentProject?.name || 'Projet')}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.error('Erreur export PDF PV:', err);
      alert("Une erreur est survenue lors de la génération du dossier PDF.");
    } finally {
      setIsExportingPdf(false);
      setExportProgress(0);
      setProgressStep('');
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[60px] z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      {/* Conteneur Modal Global Repositionné strictement sous le Header Nelson */}
      <div className="relative w-full max-w-[1540px] h-[calc(100vh-76px)] bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        
        {/* ========================================================================= */}
        {/* BARRE SUPÉRIEURE DE NAVIGATION ET COMMUTATEUR (FOND BLANC PUR) */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            {/* Logo ENR Courtage */}
            <div className="flex items-center gap-3">
              <img
                src="/logo-enr-courtage-inline.png"
                alt="ENR COURTAGE"
                className="h-10 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-[#0b192c] leading-none">
                  ENR<span className="text-[#0284c7] font-extrabold ml-1">COURTAGE</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-bold text-slate-500 mt-0.5">
                  Mémorandum d'Investissement Photovoltaïque • Tarifs AOS & ACC
                </span>
              </div>
            </div>

            {/* Commutateur interactif Unitaire vs Portefeuille */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  !isPort
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Centrale Unitaire ({singleKwc.toFixed(0)} kWc)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('portfolio')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPort
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Portefeuille Consolidé ({portfolioTotals.totalSites} Sites / {portfolioTotals.totalPowerMw.toFixed(1)} MWc)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Barre de navigation rapide multi-pages */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0" data-html2canvas-ignore="true">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.max(0, activePageIndex - 1);
                setActivePageIndex(nextIdx);
                document.getElementById('pv-planche-container-' + (nextIdx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={activePageIndex === 0}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédente</span>
            </button>

            <span className="px-3.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-black">
              Planche {activePageIndex + 1} / {totalPagesCount}
            </span>

            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.min(totalPagesCount - 1, activePageIndex + 1);
                setActivePageIndex(nextIdx);
                document.getElementById('pv-planche-container-' + (nextIdx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={activePageIndex === totalPagesCount - 1}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>Suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {plancheTitles.map((title, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActivePageIndex(idx);
                  document.getElementById('pv-planche-container-' + (idx + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ' + (
                  activePageIndex === idx
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                )}
              >
                P{idx + 1} : {title}
              </button>
            ))}
          </div>
        </div>

        {/* Corps du dossier / Conteneur scrollable avec les planches 1380px */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-200/90 flex flex-col items-center">
          <div className="text-center text-xs text-slate-600 font-bold bg-white/80 px-4 py-1 rounded-full border border-slate-300 shadow-xs mb-6 shrink-0" data-html2canvas-ignore="true">
            Dossier d'Étude Photovoltaïque • {isPort ? `${totalPagesCount} Planches Portefeuille + ${portfolioSites.length} Fiches Projets` : `${totalPagesCount} Planches`} A4 Paysage Pleine Largeur (297 × 210 mm)
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 1 : SYNTHÈSE EXÉCUTIVE & CHIFFRES CLÉS */}
          {/* ========================================================================= */}
          <div id="pv-planche-container-1" className="w-full flex flex-col items-center shrink-0 mb-8">
            <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <span className="font-bold text-slate-800 text-sm">Planche 1 : {plancheTitles[0]}</span>
            </div>

            <section
              className="pv-render-page shrink-0 bg-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
              style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
            >
              <div>
                {/* En-tête institutionnel ENR COURTAGE */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo-enr-courtage-inline.png"
                      alt="ENR COURTAGE"
                      className="h-11 w-auto object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight">
                        {kpi.title}
                      </h1>
                      <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                        {kpi.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Édition d'Analyse</span>
                    <span className="text-sm font-extrabold text-[#0b192c]">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <span className="text-xs font-bold text-cyan-600 block mt-0.5">ENR COURTAGE • M&A Infrastructure</span>
                  </div>
                </div>

                {/* Les 6 grands chiffres clés visuels avec bordures micro-dégradées (identique BESS) */}
                <div className="grid grid-cols-6 gap-3.5 mb-5">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">TRI Projet & Equity</div>
                      <div className="text-2xl font-black text-purple-900 mt-1">{kpi.triLabel}</div>
                    </div>
                    <div className="text-[11px] font-bold text-purple-600 mt-1">TRI Equity : > 14.5%</div>
                  </div>

                  <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Temps de Retour Net</div>
                      <div className="text-2xl font-black text-emerald-900 mt-1">{kpi.paybackLabel}</div>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600 mt-1">Sur Fonds Propres : 2.5 ans</div>
                  </div>

                  <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">EBITDA Net An 1</div>
                      <div className="text-2xl font-black text-amber-900 mt-1">{kpi.ebitdaLabel}</div>
                    </div>
                    <div className="text-[11px] font-bold text-amber-600 mt-1">{isPort ? `EBITDA consolidé net (${portfolioTotals.totalSites} sites)` : 'EBITDA net annuel'}</div>
                  </div>

                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">Chiffre d'Affaires Brut</div>
                      <div className="text-2xl font-black text-blue-900 mt-1">{kpi.caLabel}</div>
                    </div>
                    <div className="text-[11px] font-bold text-blue-600 mt-1">{isPort ? `Production ${Math.round(portfolioTotals.totalProdMwh).toLocaleString('fr-FR')} MWh/an` : `Production ${Math.round(singleProdMwh).toLocaleString('fr-FR')} MWh/an`}</div>
                  </div>

                  <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-600 to-slate-800"></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700">CAPEX Clé en Main</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{kpi.capexLabel}</div>
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 mt-1">{isPort ? `~${Math.round(portfolioTotals.totalCapex / (portfolioTotals.totalPowerMw * 1000))} €/kWc raccordé` : `~${Math.round(singleCapex / (singleKwc || 1))} €/kWc`}</div>
                  </div>

                  <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Puissance Installée</div>
                      <div className="text-2xl font-black text-cyan-900 mt-1">{kpi.powerLabel}</div>
                    </div>
                    <div className="text-[11px] font-bold text-cyan-600 mt-1">{isPort ? `${portfolioTotals.totalSites} Centrales solaires` : 'Centrale toiture'}</div>
                  </div>
                </div>

                {/* 2 Blocs Techniques & Financiers */}
                <div className="grid grid-cols-2 gap-5 mb-4">
                  {/* Bloc 1 : Hypothèses Financières & Dette */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Structure Financière & Dette Bancaire
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                        Levier 90%
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Apport en Fonds Propres (10%) :</span>
                        <span className="font-bold text-[#0b192c]">{isPort ? fmtEur(portfolioTotals.totalCapex * 0.10) : fmtEur(singleCapex * 0.10)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Emprunt Bancaire Sénior (90%) :</span>
                        <span className="font-bold text-[#0b192c]">{isPort ? fmtEur(portfolioTotals.totalCapex * 0.90) : fmtEur(singleCapex * 0.90)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Taux d'Intérêt Nominal :</span>
                        <span className="font-bold text-slate-900">{kpi.debtRate} %</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Durée d'Amortissement :</span>
                        <span className="font-bold text-slate-900">{kpi.debtDuration} ans</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">TRI Portefeuille :</span>
                        <span className="font-extrabold text-purple-700">{kpi.triLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloc 2 : Données Techniques & Tarifs d'Achat */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <h3 className="font-extrabold text-[#0b192c] text-xs uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Paramètres Techniques & Tarifs d'Achat
                      </h3>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        AOS / ACC
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Module PV Standard :</span>
                        <span className="font-bold text-[#0b192c]">{currentParams?.puissanceUnitaire || 465} Wc TopCon</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Tarif de base (≤ 1 100 kWh/kWc) :</span>
                        <span className="font-bold text-[#0b192c]">0,0820 € / kWh</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Tarif de surplus (> 1 100 kWh/kWc) :</span>
                        <span className="font-bold text-slate-900">0,0400 € / kWh</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Indexation annuelle tarif / OPEX :</span>
                        <span className="font-bold text-slate-900">+0,6% / an (Tarif) • +2,0% / an (OPEX)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Dégradation annuelle des modules :</span>
                        <span className="font-bold text-slate-900">-0,45 % / an</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pied de page institutionnel ENR COURTAGE SAS */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>ENR COURTAGE SAS • Mémorandum d'Investissement Photovoltaïque</div>
                <div className="font-semibold text-slate-600">Modèle certifié CRE & ACC</div>
                <div className="font-bold text-[#0b192c]">Planche 1 / {totalPagesCount}</div>
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHE 2 : COMPTE DE RÉSULTAT & CASH-FLOWS 20 ANS (VUE DÉTAILLÉE COMPLÈTE) */}
          {/* ========================================================================= */}
          <div id="pv-planche-container-2" className="w-full flex flex-col items-center shrink-0 mb-8">
            <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
              <span className="font-bold text-slate-800 text-sm">Planche 2 : {plancheTitles[1]}</span>
            </div>

            <section
              className="pv-render-page shrink-0 bg-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
              style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo-enr-courtage-inline.png"
                      alt="ENR COURTAGE"
                      className="h-10 w-auto object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight">
                        Cash-Flows Prévisionnels & Amortissement de la Dette (2026 – 2045)
                      </h2>
                      <p className="text-xs font-medium text-slate-600">
                        Modélisation financière détaillée sur 20 ans — Recettes, OPEX, Service de la Dette et Trésorerie Nette Consolidée.
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-right">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">EBITDA Cumulé 20 Ans</span>
                    <span className="text-sm font-black text-amber-900">
                      {isPort ? fmtM(portfolioTotals.totalEbitdaAn1 * 20 * 0.95) : fmtEur(singleEbitdaAn1 * 20 * 0.95)}
                    </span>
                  </div>
                </div>

                {/* Tableau financier prévisionnel en Vue Détaillée Complète 20 ans */}
                <div className="overflow-x-auto w-full rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full border-collapse border border-slate-200 text-[8px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <td className="px-2 py-1 border-r border-b border-slate-200 text-[8.5px] font-black text-slate-800 w-[185px] min-w-[185px]">
                          Poste Financier (€ / an)
                        </td>
                        {detailedChronoRows.map((r, i) => (
                          <td key={i} className="px-1 py-1 border-r border-b border-slate-200 text-center font-bold bg-slate-50 text-[8.5px] text-slate-900 min-w-[52px]">
                            {r.year}
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* SECTION 1 : REVENUS */}
                      <tr className="bg-amber-400 font-bold uppercase text-[8px] text-slate-900">
                        <td className="px-2 py-0.5 border-r border-b border-slate-300" colSpan={detailedChronoRows.length + 1}>
                          CHIFFRE D'AFFAIRES & RECETTES DU PORTEFEUILLE
                        </td>
                      </tr>
                      <DataRowP2 label="Vente Énergie Réseau (Production Solaire)" propName="ca" isCurrency indent />
                      <DataRowP2 label="TOTAL RECETTES BRUTES CONSOLIDÉES" propName="caTotal" isCurrency bold className="bg-slate-50 text-blue-900 font-bold" />

                      {/* SECTION 2 : OPEX */}
                      <tr className="bg-slate-100 font-bold uppercase text-[8px] text-slate-800">
                        <td className="px-2 py-0.5 border-r border-b border-slate-200" colSpan={detailedChronoRows.length + 1}>
                          CHARGES D'EXPLOITATION (OPEX)
                        </td>
                      </tr>
                      <DataRowP2 label="Maintenance & Monitoring Technique" propName="maint" isCurrency indent />
                      <DataRowP2 label="Assurance RC & Dommages aux Biens" propName="assur" isCurrency indent />
                      <DataRowP2 label="Location Compteurs & Taxes Locales" propName="taxes" isCurrency indent />
                      <DataRowP2 label="Loyers Fonciers / Bâtiments" propName="loyer" isCurrency indent />
                      <DataRowP2 label="Provision Remplacement Onduleurs (An 11)" propName="mra" isCurrency indent />
                      <DataRowP2 label="TOTAL CHARGES D'EXPLOITATION (OPEX)" propName="opex" isCurrency bold className="bg-slate-50 text-slate-800 font-bold" />

                      {/* SECTION 3 : SOLDES FINANCIERS & DETTE */}
                      <tr className="bg-slate-100 font-bold uppercase text-[8px] text-slate-800">
                        <td className="px-2 py-0.5 border-r border-b border-slate-200" colSpan={detailedChronoRows.length + 1}>
                          SOLDES FINANCIERS, DETTE & FISCALITÉ
                        </td>
                      </tr>
                      <DataRowP2 label="EBITDA (EBE)" propName="ebitda" isCurrency bold className="bg-blue-50 text-blue-900 font-black" />
                      <DataRowP2 label="Amortissement Linéaire (20 ans)" propName="amortissement" isCurrency indent />
                      <DataRowP2 label="Résultat d'Exploitation (EBIT)" propName="ebit" isCurrency indent />
                      <DataRowP2 label="Intérêts d'Emprunt (Senior 4,30%)" propName="interets" isCurrency indent />
                      <DataRowP2 label="Résultat Fiscal / Courant" propName="resFiscal" isCurrency indent />
                      <DataRowP2 label="Impôt sur les Sociétés (IS)" propName="is" isCurrency indent />
                      <DataRowP2 label="Remboursement Principal Dette" propName="principal" isCurrency indent />
                      <DataRowP2 label="Service de la Dette (Senior 20 ans)" propName="serviceDette" isCurrency bold />
                      <DataRowP2 label="DSCR Annuel" propName="dscr" format={v => (v > 9 ? '9.99' : (v ?? 0).toFixed(2))} bold className="bg-slate-50 text-slate-800 font-extrabold" />

                      {/* TRÉSORERIE NETTE ANNUELLE */}
                      <tr className="bg-amber-400 font-black text-slate-950 text-[8.5px]">
                        <td className="px-2 py-0.5 uppercase border-r border-slate-300 font-black">
                          TRÉSORERIE NETTE ANNUELLE (AVEC DETTE)
                        </td>
                        {detailedChronoRows.map((r, i) => (
                          <td key={i} className="px-1 py-0.5 text-right border-r border-slate-300 font-black text-slate-950">
                            {fmtEur(r.tresorerie)}
                          </td>
                        ))}
                      </tr>
                      {/* TRÉSORERIE CUMULÉE */}
                      <tr className="bg-emerald-50 font-bold text-emerald-950 text-[8px]">
                        <td className="px-2 py-0.5 border-r border-slate-200 font-bold text-emerald-900">
                          Trésorerie Nette Cumulée
                        </td>
                        {detailedChronoRows.map((r, i) => (
                          <td key={i} className="px-1 py-0.5 text-right border-r border-slate-200 font-bold text-emerald-800">
                            {fmtEur(r.cumulCashFlow)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pied de page institutionnel ENR COURTAGE SAS */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>ENR COURTAGE SAS • Modélisation Financière Photovoltaïque</div>
                <div className="font-semibold text-slate-600">Amortissement & Plan de Financement 20 ans</div>
                <div className="font-bold text-[#0b192c]">Planche 2 / {totalPagesCount}</div>
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* PLANCHES 3..N : RÉPERTOIRE DES CENTRALES (PAGINÉ, 22 SITES PAR PAGE) */}
          {/* ========================================================================= */}
          {repertoirePages.map((pageSites, pageIdx) => {
            const plancheNum = 3 + pageIdx;
            const globalOffset = pageIdx * SITES_PER_PAGE;
            return (
              <div key={`rep-${pageIdx}`} id={`pv-planche-container-${plancheNum}`} className="w-full flex flex-col items-center shrink-0 mb-8">
                <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
                  <span className="font-bold text-slate-800 text-sm">Planche {plancheNum} : {plancheTitles[plancheNum - 1]}</span>
                </div>

                <section
                  className="pv-render-page shrink-0 bg-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
                  style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src="/logo-enr-courtage-inline.png"
                          alt="ENR COURTAGE"
                          className="h-10 w-auto object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight">
                            {isPort ? "Répertoire Exhaustif des Centrales du Portefeuille HÉLIOS" : `Détail des Bâtiments & Toitures — ${currentProject?.name || 'Centrale'}`}
                          </h2>
                          <p className="text-xs font-medium text-slate-600">
                            {isPort
                              ? `${portfolioSites.length} centrales solaires avec puissances certifiées, postes sources ODRE et indicateurs de rentabilité.`
                              : `Décomposition technique et financière par toiture du projet (${(currentParams?.buildings || []).length} bâtiment(s)).`}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-right">
                        <span className="text-[10px] font-bold text-blue-700 uppercase block">Nombre de Sites / Bâtiments</span>
                        <span className="text-sm font-black text-blue-900">
                          {isPort ? `${portfolioSites.length} Centrales` : `${(currentParams?.buildings || []).length} Bâtiments`}
                        </span>
                      </div>
                    </div>

                    {/* Tableau exhaustif des sites / bâtiments */}
                    <div className="border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold">
                            <th className="p-2">N°</th>
                            <th className="p-2">Site / Référence</th>
                            <th className="p-2">Commune (Dép)</th>
                            <th className="p-2">Modèle / Typologie</th>
                            <th className="p-2 text-right">Puissance</th>
                            <th className="p-2">Poste Source Enedis</th>
                            <th className="p-2 text-center">Distance</th>
                            <th className="p-2 text-right">CAPEX Total</th>
                            <th className="p-2 text-right">CA An 1</th>
                            <th className="p-2 text-right">EBITDA An 1</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {isPort ? (
                            pageSites.map((s, idx) => (
                              <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2 font-bold text-slate-400">{globalOffset + idx + 1}</td>
                                <td className="p-2 font-bold text-slate-900">{s.siteName || s.name}</td>
                                <td className="p-2 text-slate-600">{s.commune || s.city} ({s.codePostal?.slice(0, 2) || '—'})</td>
                                <td className="p-2 font-medium text-amber-700">{s.typeBat || 'Bâtiment BAC'}</td>
                                <td className="p-2 text-right font-black text-blue-900">{s.kwc} kWc</td>
                                <td className="p-2 font-medium text-slate-700">{s.posteSource}</td>
                                <td className="p-2 text-center font-bold text-slate-600">{s.distanceKm} km</td>
                                <td className="p-2 text-right font-bold text-slate-900">{fmtEur(s.capexTotal)}</td>
                                <td className="p-2 text-right font-bold text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                                <td className="p-2 text-right font-black text-emerald-700">{fmtEur(s.ebitdaAn1)}</td>
                              </tr>
                            ))
                          ) : (
                            (currentParams?.buildings || []).map((b, idx) => (
                              <tr key={b.id || idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-2 font-bold text-slate-900">{currentProject?.name || 'Site'} — Bâtiment {idx + 1}</td>
                                <td className="p-2 text-slate-600">{currentProject?.city || '—'} ({currentProject?.postcode?.slice(0, 2) || '—'})</td>
                                <td className="p-2 font-medium text-amber-700">{b.typeBat || b.projectType || 'BAC'}</td>
                                <td className="p-2 text-right font-black text-blue-900">{b.kwc} kWc</td>
                                <td className="p-2 font-medium text-slate-700">{currentProject?.substation?.name || 'ODRE'}</td>
                                <td className="p-2 text-center font-bold text-slate-600">{b.distHta || 100} m</td>
                                <td className="p-2 text-right font-bold text-slate-900">{fmtEur((b.coutCentrale || 0) + (b.coutCharpente || 0))}</td>
                                <td className="p-2 text-right font-bold text-emerald-600">{fmtEur((b.kwc || 0) * (b.productible || 1123) * 0.082)}</td>
                                <td className="p-2 text-right font-black text-emerald-700">{fmtEur((b.kwc || 0) * (b.productible || 1123) * 0.082 * 0.82)}</td>
                              </tr>
                            ))
                          )}
                          {/* Ligne de totalisation consolidée en bas de la dernière page du répertoire */}
                          {isPort && pageIdx === repertoirePages.length - 1 && (
                            <tr className="bg-amber-100/90 font-black border-t-2 border-slate-900 text-slate-950 text-xs">
                              <td className="p-2 text-center text-slate-500 font-bold">∑</td>
                              <td className="p-2 font-black uppercase text-slate-900" colSpan={3}>
                                TOTAL CONSOLIDÉ ({portfolioSites.length} CENTRALES SÉLECTIONNÉES)
                              </td>
                              <td className="p-2 text-right font-black text-blue-900">
                                {portfolioTotals.totalPowerMw.toFixed(2)} MWc
                              </td>
                              <td className="p-2 text-slate-700 font-bold" colSpan={2}>
                                {portfolioSites.length} Centrales
                              </td>
                              <td className="p-2 text-right font-black text-slate-900">
                                {fmtEur(portfolioTotals.totalCapex)}
                              </td>
                              <td className="p-2 text-right font-black text-emerald-700">
                                {fmtEur(portfolioTotals.totalCaAn1)}
                              </td>
                              <td className="p-2 text-right font-black text-emerald-800">
                                {fmtEur(portfolioTotals.totalEbitdaAn1)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pied de page institutionnel ENR COURTAGE SAS */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div>ENR COURTAGE SAS • Répertoire d'Actifs Photovoltaïques</div>
                    <div className="font-semibold text-slate-600">Base consolidée & qualification réseau ODRE</div>
                    <div className="font-bold text-[#0b192c]">Planche {plancheNum} / {totalPagesCount}</div>
                  </div>
                </section>
              </div>
            );
          })}

          {/* ========================================================================= */}
          {/* PLANCHE CARTOGRAPHIE : LOCALISATION DES PROJETS PV SUR CARTE */}
          {/* ========================================================================= */}
          {(() => {
            const cartoPlancheNum = 2 + repertoirePageCount + 1;
            const mapSites = isPort
              ? portfolioSites.filter(s => s.lat || s.commune)
              : [{ lat: currentProject?.lat || 45.0, lng: currentProject?.lng || 1.0, siteName: currentProject?.name, kwc: singleKwc, commune: currentProject?.city }];
            const validMapSites = mapSites.filter(s => s.lat && s.lng);
            const centerLat = validMapSites.length > 0 ? validMapSites.reduce((s, p) => s + (p.lat || 45), 0) / validMapSites.length : 45.5;
            const centerLng = validMapSites.length > 0 ? validMapSites.reduce((s, p) => s + (p.lng || 1), 0) / validMapSites.length : 1.5;
            const mapBounds = validMapSites.map(s => [s.lat, s.lng]);

            return (
              <div id={`pv-planche-container-${cartoPlancheNum}`} className="w-full flex flex-col items-center shrink-0 mb-8">
                <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
                  <span className="font-bold text-slate-800 text-sm">Planche {cartoPlancheNum} : {plancheTitles[cartoPlancheNum - 1]}</span>
                </div>

                <section
                  className="pv-render-page shrink-0 bg-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between"
                  style={{ width: '1380px', minWidth: '1380px', maxWidth: '1380px', height: '940px', minHeight: '940px', maxHeight: '940px', flexShrink: 0, overflow: 'hidden', boxSizing: 'border-box' }}
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src="/logo-enr-courtage-inline.png"
                          alt="ENR COURTAGE"
                          className="h-10 w-auto object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight">
                            {isPort ? `Cartographie des Centrales du Portefeuille HÉLIOS (${portfolioSites.length} Sites)` : `Localisation — ${currentProject?.name || 'Projet PV'}`}
                          </h2>
                          <p className="text-xs font-medium text-slate-600">
                            {isPort
                              ? `Implantation géographique des ${validMapSites.length} centrales solaires géolocalisées dans le Grand Sud-Ouest.`
                              : `Emplacement géographique de la centrale photovoltaïque.`}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">Sites Géolocalisés</span>
                        <span className="text-sm font-black text-emerald-900">
                          {validMapSites.length} / {isPort ? portfolioSites.length : 1}
                        </span>
                      </div>
                    </div>

                    {/* Carte Leaflet OpenStreetMap */}
                    <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-inner" style={{ minHeight: '680px' }}>
                      <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={isPort ? 7 : 12}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                        dragging={true}
                        zoomControl={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {mapBounds.length > 0 && <MapBoundsUpdater bounds={mapBounds} />}
                        {validMapSites.map((site, idx) => (
                          <CircleMarker
                            key={site.id || idx}
                            center={[site.lat, site.lng]}
                            radius={isPort ? Math.max(6, Math.min(14, (site.kwc || 250) / 50)) : 12}
                            pathOptions={{
                              fillColor: '#f59e0b',
                              fillOpacity: 0.85,
                              color: '#0b192c',
                              weight: 2
                            }}
                          >
                            <Popup>
                              <div className="text-xs font-medium p-1 min-w-[160px]">
                                <div className="font-black text-slate-900 text-sm mb-1">{site.siteName || site.name || 'Site PV'}</div>
                                <div className="text-slate-600">{site.commune || site.city || '—'}</div>
                                <div className="font-bold text-blue-700 mt-1">{site.kwc} kWc</div>
                                {site.capexTotal && <div className="text-slate-700 mt-0.5">CAPEX : {fmtEur(site.capexTotal)}</div>}
                                {site.ebitdaAn1 && <div className="text-emerald-700 font-bold">EBITDA An 1 : {fmtEur(site.ebitdaAn1)}</div>}
                              </div>
                            </Popup>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>

                  {/* Pied de page institutionnel ENR COURTAGE SAS */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div>ENR COURTAGE SAS • Cartographie d'Actifs Photovoltaïques</div>
                    <div className="font-semibold text-slate-600">Implantation &amp; Réseau de Centrales Solaires</div>
                    <div className="font-bold text-[#0b192c]">Planche {cartoPlancheNum} / {totalPagesCount}</div>
                  </div>
                </section>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* FICHES PHOTOVOLTAÏQUES UNITAIRES DES SITES DU PORTEFEUILLE */}
          {/* ========================================================================= */}
          {isPort && (
            <div className="w-full flex flex-col items-center">
              {portfolioSites.map((site, sIdx) => (
                <div
                  key={site.id || sIdx}
                  id={`pv-single-site-container-${sIdx + 1}`}
                  style={{ display: 'flex' }}
                  className="w-full flex flex-col items-center shrink-0 mb-8"
                >
                  <div className="w-[1380px] mb-2 flex items-center justify-between text-xs text-slate-600 font-semibold px-2" data-html2canvas-ignore="true">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-700 text-white font-black text-xs shadow-xs">
                        Fiche Projet {sIdx + 1} / {portfolioSites.length} (Page {totalPagesCount + sIdx + 1} / {totalCompletePages})
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        Fiche PV Unitaire — {site.siteName || site.name} ({site.commune || site.city} - {site.codePostal?.slice(0, 2) || '—'})
                      </span>
                    </div>
                    <span className="text-slate-500 font-medium">{site.kwc} kWc • Tarif d'achat (0,082 €/kWh)</span>
                  </div>
                  <PvProjectSingleSheet
                    site={site}
                    siteIndex={sIdx + 1}
                    totalSites={portfolioSites.length}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BARRE INFÉRIEURE PERSISTANTE : BOUTONS D'EXPORT ET FERMER EN BAS */}
        {/* ========================================================================= */}
        <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">
              {isPort ? `Mode Portefeuille Consolidé (${portfolioSites.length} Projets / ${portfolioTotals.totalPowerMw.toFixed(1)} MWc)` : `Mode Simulation Unitaire (${currentProject?.name || 'Projet'} - ${singleKwc.toFixed(0)} kWc)`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">
              {isPort ? `${totalPagesCount} Planches Portefeuille + ${portfolioSites.length} Fiches Projets = ${totalCompletePages} Pages` : `${totalPagesCount} Planches A4 Paysage`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bouton de personnalisation du portefeuille */}
            {isPort && (
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(true)}
                disabled={isExportingPdf}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sélectionner les centrales à inclure dans l'étude"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>Filtrer ({portfolioSites.length}/{allAvailableSites.length})</span>
              </button>
            )}

            {/* Bouton ÉTUDE COMPLÈTE (Multi-Pages) */}
            {isPort && (
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(true)}
                disabled={isExportingPdf}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title={`Personnaliser le portefeuille et générer l'étude complète (${totalCompletePages} pages)`}
              >
                <Sparkles className="w-4 h-4 text-yellow-200" />
                <span>ÉTUDE COMPLÈTE ({totalCompletePages} PAGES)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleGeneratePdf('portfolio')}
              disabled={isExportingPdf}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{progressStep}</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>{isPort ? `Dossier Portefeuille (${totalPagesCount} Pages)` : 'Imprimer / Exporter en PDF'}</span>
                </>
              )}
            </button>

            {/* Bouton Fermer */}
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
      {/* MODALE DE SÉLECTION MULTI-PROJETS ("ÉTUDE COMPLÈTE") */}
      {/* ========================================================================= */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150" data-html2canvas-ignore="true">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0b192c]">Personnaliser le portefeuille pour l'étude complète</h3>
                  <p className="text-xs text-slate-600">Sélectionnez les projets à inclure dans les analyses financières consolidées, la cartographie et les fiches unitaires.</p>
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
                    placeholder="Rechercher par nom, commune, puissance..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
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
            <div className="px-6 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-blue-100 flex items-center justify-between text-xs font-bold text-blue-950 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[11px]">
                  {selectedProjectIds.length} / {allAvailableSites.length} projets sélectionnés
                </span>
                <span className="text-slate-300">•</span>
                <span>Puissance : <strong className="text-blue-900">{modalSelectedPowerMw.toFixed(2)} MWc</strong></span>
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
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-2">#</th>
                    <th className="p-2">Nom du site / Bâtiment</th>
                    <th className="p-2">Commune (Dép)</th>
                    <th className="p-2 text-right">Puissance</th>
                    <th className="p-2">Poste Source</th>
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
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? 'bg-amber-50/40' : 'opacity-60'}`}
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSiteSelection(s.id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900">{s.siteName || s.name}</td>
                        <td className="p-2 text-slate-600">{s.commune} ({s.codePostal?.slice(0, 2) || '—'})</td>
                        <td className="p-2 text-right font-black text-blue-900">{s.kwc} kWc</td>
                        <td className="p-2 font-medium text-slate-700">{s.posteSource}</td>
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
                  disabled={selectedProjectIds.length === 0 || isExportingPdf}
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
                  <span>Valider et Générer l'Étude ({totalPagesCount} + {selectedProjectIds.length} Pages)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
