import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Table as TableIcon,
  Sparkles,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { getBessPortfolioSites, normalizePortfolioName } from '../../data/bessPortfolioData.js';
import { getCreSubstationQualification } from '../../services/creZonesService.js';
import { computeBessFinancials } from '../../services/bessSimulationEngine.js';
import {
  BESS_PRESETS,
  getScaledCapexPreset,
  computeBessLenderModel,
  computeBessStressTests
} from '../../services/bessLenderFinanceEngine.js';
import { exportBessPortfolioToExcel, exportBessOdreMatrixToExcel } from '../../services/exportBessExcel.js';
import { usePortfolios } from '@/contexts/PortfolioContext.jsx';
import PortfolioManagerModal from '@/components/portfolios/PortfolioManagerModal.jsx';
import BessPortfolioLenderModal from './BessPortfolioLenderModal.jsx';
import {
  BessGlobalSelectorsBar,
  BessCapexBreakdownCard,
  BessAssumptions4ColumnsGrid,
  BessLender4SummaryCards,
  BessCleanHorizonChartsSection,
  BessCompleteAnnualTable,
  BessSensitivityMatrixSection,
  fmtEur,
  fmtPct
} from './BessUnifiedDashboardComponents.jsx';

const fmtM = (v) => `${((v || 0) / 1000000).toFixed(2)} M€`;

export default function BessPortfolioView({
  onSelectSite,
  onExportPdf,
  onDataChange,
  projects = [],
  initialPortfolio = 'VOLTA',
  selectedPortfolio: externalPortfolio,
  onSelectPortfolio
}) {
  const { bessPortfolios, canManagePortfolios } = usePortfolios();
  const [internalPortfolio, setInternalPortfolio] = useState(externalPortfolio || initialPortfolio || 'VOLTA');
  // Source de vérité synchrone sans décalage d'un cycle de rendu entre la barre supérieure et la vue portefeuille
  const selectedPortfolio = externalPortfolio || internalPortfolio || 'VOLTA';
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isLenderModalOpen, setIsLenderModalOpen] = useState(false);
  const [selectedSpv, setSelectedSpv] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChronique, setExpandedChronique] = useState(true);

  // Palier de puissance par site (défaut 0.50 MW = 500 kW / 1 044 kWh)
  const [presetKey, setPresetKey] = useState('0.50');
  const currentPreset = BESS_PRESETS[presetKey] || BESS_PRESETS['0.50'];

  // Paramètres unifiés du modèle financier & CAPEX détaillé
  const [inputs, setInputs] = useState(() => ({
    ...(BESS_PRESETS['0.50']),
    capexMode: 'COMPTE_PROPRE',
    financingMode: 'WITH_LOAN',
    revenueModel: 'CLEAN_HORIZON',
    horizonYears: 20,
    lifeYears: 20,
    loanDurationYears: 12,
    loanYears: 12,
    debtSharePct: 80,
    nominalRatePct: 4.10,
    insuranceRatePct: 0.20,
    roundTripEfficiencyPct: 88.0,
    availabilityPct: 98.0,
    batteryDegradationPct: 1.37,
    revenueDegradationPct: 1.37,
    aggregatorFeePct: 12.0,
    opexInflationPct: 1.5,
    discountRatePct: 7.0,
    taxReducedThreshold: 42500,
    taxReducedRatePct: 15.0,
    taxNormalRatePct: 25.0,
    withIS: true,
    cfeAn: 1000,
    taxeFonciereAn: 500,
    maintenanceAn1: 1500,
    opexAn1: 1500,
    assuranceAn1: 1840,
    turpeAn1: 11664,
    fraisCommerciaux: 0,
    loyerAn1: ['FARADAY', 'EDISON'].includes(normalizePortfolioName(externalPortfolio || initialPortfolio)) ? 2000 : 3000,
    loyer1: ['FARADAY', 'EDISON'].includes(normalizePortfolioName(externalPortfolio || initialPortfolio)) ? 2000 : 3000,
    capexBreakdown: getScaledCapexPreset('COMPTE_PROPRE', 0.50)
  }));

  // Surcharges CAPEX et Loyer site par site dans le tableau d'inventaire
  const [siteCapexOverrides, setSiteCapexOverrides] = useState({});
  const [siteRentOverrides, setSiteRentOverrides] = useState({});

  // Synchronisation avec le portefeuille sélectionné dans la barre supérieure parente
  useEffect(() => {
    if (externalPortfolio && externalPortfolio !== internalPortfolio) {
      setInternalPortfolio(externalPortfolio);
    }
  }, [externalPortfolio, internalPortfolio]);

  const handlePortfolioSelect = (portName) => {
    setInternalPortfolio(portName);
    if (onSelectPortfolio) {
      onSelectPortfolio(portName);
    }
  };

  // Basculement automatique du loyer bailleur par défaut selon le portefeuille (modifiable à tout moment par l'utilisateur)
  useEffect(() => {
    setSelectedSpv('ALL');
    setSiteRentOverrides({});
    const scale = (currentPreset.powerMw || 0.50) / 0.50;
    const defaultRent = ['FARADAY', 'EDISON'].includes(normalizePortfolioName(selectedPortfolio)) ? 2000 : 3000;
    const scaledRent = Math.round(defaultRent * scale);
    setInputs(prev => ({
      ...prev,
      loyerAn1: scaledRent,
      loyer1: scaledRent
    }));
  }, [selectedPortfolio, currentPreset.powerMw]);

  // Liste garantie des portefeuilles BESS (VOLTA, FARADAY, EDISON + portefeuilles personnalisés)
  const effectiveBessPortfolios = useMemo(() => {
    const list = Array.isArray(bessPortfolios) ? [...bessPortfolios] : [];
    const defaults = [
      { id: 'bess-volta', name: 'VOLTA', type: 'BESS', spv: 'SPV A (VOLTA)' },
      { id: 'bess-faraday', name: 'FARADAY', type: 'BESS', spv: 'SPV B (FARADAY)' },
      { id: 'bess-edison', name: 'EDISON', type: 'BESS', spv: 'SPV C (EDISON)' }
    ];
    defaults.forEach(def => {
      if (!list.some(p => normalizePortfolioName(p.name) === def.name)) {
        list.push(def);
      }
    });
    return list;
  }, [bessPortfolios]);

  // Tous les sites BESS
  const allPortfolioSites = useMemo(() => {
    return getBessPortfolioSites(projects, 'ALL');
  }, [projects]);

  // Sites actifs filtrés par portefeuille (VOLTA vs FARADAY vs EDISON vs TOUS)
  const activeSites = useMemo(() => {
    const normSel = normalizePortfolioName(selectedPortfolio);
    if (!normSel || normSel === 'ALL' || normSel === 'TOUS') return allPortfolioSites;
    return allPortfolioSites.filter(s => normalizePortfolioName(s.portfolio) === normSel);
  }, [allPortfolioSites, selectedPortfolio]);

  const nbSites = Math.max(1, activeSites.length);
  const unitPowerKw = Math.round((currentPreset.powerMw || 0.50) * 1000);
  const unitCapacityKwh = Math.round((currentPreset.capacityMwh || 1.044) * 1000);

  // Handlers de sélection globale
  const handleSelectPreset = (key) => {
    if (!BESS_PRESETS[key]) return;
    setPresetKey(key);
    const targetPreset = BESS_PRESETS[key];
    const mode = inputs.capexMode || 'COMPTE_PROPRE';
    const scaledBreakdown = getScaledCapexPreset(mode, targetPreset.powerMw);
    const scale = targetPreset.powerMw / 0.50;
    const totalUnitCap = Object.values(scaledBreakdown).reduce((a, b) => a + Number(b || 0), 0);
    const baseRent = normalizePortfolioName(selectedPortfolio) === 'FARADAY' ? 2000 : 3000;

    setInputs(prev => ({
      ...prev,
      palierKey: key,
      powerMw: targetPreset.powerMw,
      capacityMwh: targetPreset.capacityMwh,
      capexBreakdown: scaledBreakdown,
      maintenanceAn1: Math.round(1500 * scale),
      opexAn1: Math.round(1500 * scale),
      assuranceAn1: Math.round(totalUnitCap * 0.01),
      ass1: Math.round(totalUnitCap * 0.01),
      turpeAn1: Math.round(11664 * scale),
      loyerAn1: Math.round(baseRent * scale),
      loyer1: Math.round(baseRent * scale),
      cfeAn: Math.round(1000 * scale),
      taxeFonciereAn: Math.round(500 * scale)
    }));
  };

  const handleSelectCapexMode = (mode) => {
    const pMw = currentPreset.powerMw || 0.50;
    const scaledBreakdown = getScaledCapexPreset(mode, pMw);
    const totalUnitCap = Object.values(scaledBreakdown).reduce((a, b) => a + Number(b || 0), 0);
    setSiteCapexOverrides({});
    setInputs(prev => ({
      ...prev,
      capexMode: mode,
      capexBreakdown: scaledBreakdown,
      assuranceAn1: Math.round(totalUnitCap * 0.01),
      ass1: Math.round(totalUnitCap * 0.01)
    }));
  };

  const handleUpdateCapexField = (field, value) => {
    setInputs(prev => {
      const currentB = prev.capexBreakdown || getScaledCapexPreset(prev.capexMode || 'COMPTE_PROPRE', currentPreset.powerMw);
      const nextB = { ...currentB, [field]: Number(value) || 0 };
      return {
        ...prev,
        capexBreakdown: nextB
      };
    });
  };

  const handleSelectFinancingMode = (fMode) => {
    setInputs(prev => ({
      ...prev,
      financingMode: fMode,
      debtSharePct: fMode === 'CASH' ? 0 : (prev.debtSharePct > 0 ? prev.debtSharePct : 80)
    }));
  };

  const handleSelectRevenueModel = (rModel) => {
    setInputs(prev => {
      const nextHorizon = rModel === 'CLEAN_HORIZON' ? 20 : (rModel === 'ENR_COURTAGE' ? 15 : (prev.horizonYears || 20));
      const nextDeg = rModel === 'CLEAN_HORIZON' ? 1.37 : (rModel === 'ENR_COURTAGE' ? 2.20 : (prev.batteryDegradationPct || 1.37));
      return {
        ...prev,
        revenueModel: rModel,
        horizonYears: nextHorizon,
        lifeYears: nextHorizon,
        batteryDegradationPct: nextDeg,
        revenueDegradationPct: nextDeg
      };
    });
  };

  const handleSelectHorizonYears = (h) => {
    setInputs(prev => ({
      ...prev,
      horizonYears: Number(h),
      lifeYears: Number(h)
    }));
  };

  const updateInput = (field, value) => {
    if (typeof value === 'boolean' || field === 'revenueModel' || field === 'financingMode' || field === 'capexMode') {
      setInputs(prev => ({ ...prev, [field]: value }));
      return;
    }
    const num = parseFloat(value);
    const parsedVal = isNaN(num) ? value : num;
    const aliasMap = {
      opex1: 'opexAn1',
      opexAn1: 'opex1',
      ass1: 'assuranceAn1',
      assuranceAn1: 'ass1',
      loyer1: 'loyerAn1',
      loyerAn1: 'loyer1'
    };
    setInputs(prev => {
      const next = { ...prev, [field]: parsedVal };
      if (aliasMap[field]) next[aliasMap[field]] = parsedVal;
      return next;
    });
  };

  // Modèle financier unitaire de référence (pour 1 site du portefeuille)
  const unitModel = useMemo(() => {
    return computeBessLenderModel({
      ...inputs,
      palierKey: presetKey,
      powerMw: currentPreset.powerMw,
      nbSites: 1
    });
  }, [inputs, presetKey, currentPreset.powerMw]);

  // Analyse détaillée de chaque site + Total CAPEX consolidé tenant compte des éventuelles surcharges site par site
  const { analyzedSites, portfolioCapexOverride } = useMemo(() => {
    const baseUnitCapex = unitModel.capex;
    const baseUnitCaAn1 = unitModel.rows[0]?.revenuCorrige || 93484;
    const baseUnitOpexAn1 = unitModel.rows[0]?.totalChargesOpex || 29722;
    const baseUnitEbitdaAn1 = unitModel.rows[0]?.ebitda || 63762;
    const baseUnitTurpeAn1 = unitModel.rows[0]?.turpe7 || 11664;

    const sites = activeSites.map((site, index) => {
      const fin = computeBessFinancials(site, {
        capexMode: inputs.capexMode,
        capexBreakdown: inputs.capexBreakdown,
        financingMode: inputs.financingMode,
        revenueModel: inputs.revenueModel,
        horizonYears: inputs.horizonYears,
        studyDuration: inputs.horizonYears,
        debtDuration: inputs.loanDurationYears,
        debtRate: (Number(inputs.nominalRatePct || 4.10) + Number(inputs.insuranceRatePct || 0.20)),
        fraisCommerciaux: inputs.fraisCommerciaux || 0,
        loyerDalle: inputs.loyerAn1
      });
      const creQualification = getCreSubstationQualification(site.substation?.name || fin.posteSource, site.substation?.code);

      const siteOverrideCapex = siteCapexOverrides[site.id];
      const effectiveSiteCapex = siteOverrideCapex !== undefined && siteOverrideCapex !== null
        ? Number(siteOverrideCapex)
        : baseUnitCapex;

      const siteOverrideRent = siteRentOverrides[site.id];
      const effectiveSiteRent = siteOverrideRent !== undefined && siteOverrideRent !== null
        ? Number(siteOverrideRent)
        : Number(inputs.loyerAn1 || 3000);
      const rentDelta = effectiveSiteRent - Number(inputs.loyerAn1 || 3000);
      const effectiveSiteEbitdaAn1 = Math.round(baseUnitEbitdaAn1 - rentDelta);
      const effectiveSiteOpexAn1 = Math.round(baseUnitOpexAn1 + rentDelta);

      // Recalcul du TRI et Payback du site si le CAPEX ou le Loyer du site est surchargé
      const sitePayback = effectiveSiteEbitdaAn1 > 0 ? (effectiveSiteCapex / effectiveSiteEbitdaAn1) : 4.0;
      const capexRatio = baseUnitCapex > 0 ? (baseUnitCapex / Math.max(1, effectiveSiteCapex)) : 1;
      const ebitdaRatio = baseUnitEbitdaAn1 > 0 ? (effectiveSiteEbitdaAn1 / baseUnitEbitdaAn1) : 1;
      const siteTri = unitModel.kpis.triProjet * Math.pow(capexRatio * ebitdaRatio, 0.65);

      const resolvedGps = site.gps || ((site.lat && site.lng) ? `${Number(site.lat).toFixed(6)}, ${Number(site.lng).toFixed(6)}` : '—');

      return {
        ...site,
        gps: resolvedGps,
        index: index + 1,
        powerKw: unitPowerKw,
        capacityKwh: unitCapacityKwh,
        capexTotal: effectiveSiteCapex,
        isCapexOverridden: siteOverrideCapex !== undefined,
        customRent: effectiveSiteRent,
        isRentOverridden: siteOverrideRent !== undefined,
        odreRaccordementCost: fin.raccordementCost,
        caAnnuel: Math.round(baseUnitCaAn1),
        opexAnnuel: effectiveSiteOpexAn1,
        turpeAnnuel: Math.round(baseUnitTurpeAn1),
        ebitda: effectiveSiteEbitdaAn1,
        ebitdaAn1: effectiveSiteEbitdaAn1,
        triProjet: siteTri,
        payback: sitePayback,
        paybackAnnees: Number(sitePayback.toFixed(1)),
        paybackFormatted: `${sitePayback.toFixed(1)} ans`,
        dscrMoyen: unitModel.kpis.dscrAvg,
        creQualification,
        fin: {
          ...fin,
          capexTotal: effectiveSiteCapex,
          caAnnuel: Math.round(baseUnitCaAn1),
          caBrutAn1: Math.round(baseUnitCaAn1),
          opexAnnuel: effectiveSiteOpexAn1,
          turpeAnnuel: Math.round(baseUnitTurpeAn1),
          ebitdaAn1: effectiveSiteEbitdaAn1,
          ebitda: effectiveSiteEbitdaAn1,
          loyerDalle: effectiveSiteRent,
          triProjet: siteTri,
          payback: sitePayback,
          paybackAnnees: Number(sitePayback.toFixed(1)),
          paybackFormatted: `${sitePayback.toFixed(1)} ans`
        },
        rows: unitModel.rows.map(r => ({
          year: r.year,
          ca: r.revenuCorrige,
          opex: r.totalChargesOpex + rentDelta,
          ebitda: r.ebitda - rentDelta,
          serviceDette: r.serviceDette,
          cfNet: r.cashFlowNet - rentDelta
        }))
      };
    });

    const sumCapex = sites.reduce((acc, s) => acc + s.capexTotal, 0);
    return {
      analyzedSites: sites,
      portfolioCapexOverride: Object.keys(siteCapexOverrides).length > 0 ? sumCapex : null
    };
  }, [activeSites, unitModel, inputs, siteCapexOverrides, siteRentOverrides, unitPowerKw, unitCapacityKwh]);

  // Modèle financier consolidé du portefeuille (N sites)
  const portfolioModel = useMemo(() => {
    return computeBessLenderModel({
      ...inputs,
      palierKey: presetKey,
      powerMw: currentPreset.powerMw,
      nbSites,
      ...(portfolioCapexOverride !== null ? { capexTotalOverride: portfolioCapexOverride } : {})
    });
  }, [inputs, presetKey, currentPreset.powerMw, nbSites, portfolioCapexOverride]);

  // Stress-tests consolidés du portefeuille
  const portfolioStress = useMemo(() => {
    return computeBessStressTests(portfolioModel, {
      ...inputs,
      palierKey: presetKey,
      powerMw: currentPreset.powerMw,
      nbSites
    });
  }, [portfolioModel, inputs, presetKey, currentPreset.powerMw, nbSites]);

  // Totaux et chronique consolidés (compatibles avec Dossier Prêteur, Étude Complète & Export Excel)
  const { consolidatedTotals, consolidatedChronique } = useMemo(() => {
    const k = portfolioModel.kpis;
    const p = portfolioModel.params;
    const r0 = portfolioModel.rows[0] || {};

    const chronique = portfolioModel.rows.map(r => ({
      year: r.year,
      calendarYear: r.calendarYear,
      ca: r.revenuCorrige,
      caBrut: r.revenuBrutTotal,
      tradingBrut: r.tradingBrut,
      afrrCapBrut: r.afrrCapBrut,
      afrrEnergyBrut: r.afrrEnergyBrut,
      capacityMechBrut: r.capacityMechBrut,
      opex: r.totalChargesOpex,
      ebitda: r.ebitda,
      serviceDette: r.serviceDette,
      is: r.is,
      cfNet: r.cashFlowNet,
      cumulCf: r.tresorerieCumulee,
      dscr: r.dscr
    }));

    return {
      consolidatedTotals: {
        totalSites: nbSites,
        totalPowerMw: (nbSites * unitPowerKw) / 1000,
        totalCapacityMwh: (nbSites * unitCapacityKwh) / 1000,
        totalCapex: k.capexTotal,
        unitCapex: Math.round(k.capexTotal / nbSites),
        totalCaAn1: r0.revenuCorrige || 0,
        totalCaBrutAn1: r0.revenuBrutTotal || 0,
        totalOpexAn1: r0.totalChargesOpex || 0,
        totalEbitdaAn1: r0.ebitda || 0,
        totalLoyersAn1: r0.loyerFoncier || 0,
        loyerBailleur: p.loyerAn1,
        totalAnnuite: k.annuiteConstante || 0,
        avgDscr: k.dscrAvg || 0,
        dscrMin: k.dscrMin || 0,
        debtDuration: p.loanDurationYears,
        debtRate: k.allInDebtRate,
        horizonYears: p.horizonYears,
        capexMode: p.capexMode,
        financingMode: p.financingMode,
        revenueModel: p.revenueModel,
        triConsolide: k.triProjet,
        triFondsPropres: k.triFondsPropres,
        vanProjet: k.vanProjet,
        vanFondsPropres: k.vanFondsPropres,
        paybackConsol: k.paybackSimple || k.paybackActualise || 4.0
      },
      consolidatedChronique: chronique
    };
  }, [portfolioModel, nbSites, unitPowerKw, unitCapacityKwh]);

  // Propagation des données mises à jour au parent (BpAcama.jsx) sans boucle de re-render sur la référence callback
  useEffect(() => {
    if (onDataChangeRef.current) {
      onDataChangeRef.current({
        debtDuration: inputs.loanDurationYears,
        debtRate: Number(inputs.nominalRatePct || 4.10) + Number(inputs.insuranceRatePct || 0.20),
        fraisCommerciaux: inputs.fraisCommerciaux,
        loyerBailleur: inputs.loyerAn1,
        capexMode: inputs.capexMode,
        financingMode: inputs.financingMode,
        revenueModel: inputs.revenueModel,
        horizonYears: inputs.horizonYears,
        unifiedInputs: inputs,
        portfolioModel,
        portfolioStress,
        analyzedSites,
        consolidatedTotals,
        consolidatedChronique,
        selectedPortfolio
      });
    }
  }, [inputs, portfolioModel, portfolioStress, analyzedSites, consolidatedTotals, consolidatedChronique, selectedPortfolio]);

  // Filtrage des sites dans le tableau d'inventaire
  const filteredSites = useMemo(() => {
    return analyzedSites.filter(site => {
      const q = (searchTerm || '').toLowerCase();
      return (
        !q ||
        (site.name || '').toLowerCase().includes(q) ||
        (site.city || '').toLowerCase().includes(q) ||
        (site.gps || '').toLowerCase().includes(q) ||
        (site.substation?.name || '').toLowerCase().includes(q)
      );
    });
  }, [analyzedSites, searchTerm]);

  // Export Excel du business plan consolidé par site
  const handleExportExcel = () => {
    exportBessPortfolioToExcel(analyzedSites, {
      debtDuration: inputs.loanDurationYears,
      debtRate: Number(inputs.nominalRatePct || 4.10) + Number(inputs.insuranceRatePct || 0.20),
      fraisCommerciaux: inputs.fraisCommerciaux,
      loyerDalle: inputs.loyerAn1,
      studyDuration: inputs.horizonYears,
      capexMode: inputs.capexMode,
      capexBreakdown: inputs.capexBreakdown,
      financingMode: inputs.financingMode,
      revenueModel: inputs.revenueModel,
      consolidatedChronique,
      portfolioName: selectedPortfolio
    });
  };

  // Export Excel de la Matrice Caparéseau ODRE des postes sources pour le portefeuille actif
  const handleExportOdreMatrix = () => {
    exportBessOdreMatrixToExcel(activeSites, {
      portfolioName: selectedPortfolio
    });
  };

  const isCashMode = portfolioModel.params.isCashMode;
  const isDscrCompliant = isCashMode || (portfolioModel.kpis.dscrMin ?? 1.2) >= 1.20;
  const isDscrAcceptable = isCashMode || (portfolioModel.kpis.dscrMin ?? 1.2) >= 1.10;

  return (
    <div id="pdf-section-bess-portfolio" className="space-y-5 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
      {/* ── En-tête Portefeuille & Actions ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Layers className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                PORTEFEUILLE MULTI-PROJETS BESS — {selectedPortfolio === 'ALL' ? 'CONSOLIDÉ' : selectedPortfolio} ({consolidatedTotals.totalSites} SITES / {Number(consolidatedTotals.totalPowerMw).toFixed(1)} MW)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Consolidation {selectedPortfolio === 'ALL' ? 'globale' : `du portefeuille ${selectedPortfolio}`} de {consolidatedTotals.totalSites} unités de {unitPowerKw} kW / {unitCapacityKwh} kWh (CESC Mercury 261) • {inputs.capexMode === 'COMPTE_TIERS' ? 'Compte Tiers' : 'Compte Propre'} • Modèle {inputs.horizonYears} ans ({inputs.revenueModel === 'CLEAN_HORIZON' ? 'Clean Horizon' : 'ENR Courtage'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" data-html2canvas-ignore="true">
          {/* Sélecteur dynamique de Portefeuille BESS */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg border border-white/20">
            {effectiveBessPortfolios.map(port => {
              const count = allPortfolioSites.filter(s => normalizePortfolioName(s.portfolio) === normalizePortfolioName(port.name)).length;
              const isSelected = normalizePortfolioName(selectedPortfolio) === normalizePortfolioName(port.name);
              return (
                <button
                  key={port.id}
                  type="button"
                  onClick={() => handlePortfolioSelect(port.name)}
                  className={`px-3 py-1.5 text-xs font-black rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{port.name}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${isSelected ? 'bg-blue-900/80 text-blue-200' : 'bg-white/10 text-slate-300'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handlePortfolioSelect('ALL')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                selectedPortfolio === 'ALL'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous ({allPortfolioSites.length})
            </button>

            {canManagePortfolios && (
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(true)}
                className="px-2 py-1.5 text-xs font-bold text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-md transition-all flex items-center gap-1 border-l border-white/20 ml-1 pl-2 cursor-pointer"
                title="Gérer les portefeuilles PV & BESS (Admin)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Gérer</span>
              </button>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Télécharger l'analyse consolidée complète au format Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            BP consolidé ({selectedPortfolio === 'ALL' ? 'TOUS' : selectedPortfolio})
          </button>
          <button
            onClick={handleExportOdreMatrix}
            className="px-3 py-2 text-xs font-bold bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={`Télécharger la matrice Caparéseau ODRE des ${activeSites.length} postes sources (${selectedPortfolio}) au format Excel`}
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
            Matrice CAPARESEAU ODRE ({selectedPortfolio === 'ALL' ? 'TOUS' : selectedPortfolio})
          </button>
          <button
            onClick={() => setIsLenderModalOpen(true)}
            className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-lg border border-blue-500/40 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            title={`Ouvrir et générer le Dossier Prêteur Consolidé pour Banques et Financeurs (${selectedPortfolio})`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Dossier Prêteur ({selectedPortfolio === 'ALL' ? 'TOUS' : selectedPortfolio})
          </button>
          {onExportPdf && (
            <button
              onClick={() =>
                onExportPdf({
                  debtDuration: inputs.loanDurationYears,
                  debtRate: Number(inputs.nominalRatePct || 4.10) + Number(inputs.insuranceRatePct || 0.20),
                  fraisCommerciaux: inputs.fraisCommerciaux,
                  loyerBailleur: inputs.loyerAn1,
                  capexMode: inputs.capexMode,
                  financingMode: inputs.financingMode,
                  revenueModel: inputs.revenueModel,
                  horizonYears: inputs.horizonYears,
                  unifiedInputs: inputs,
                  portfolioModel,
                  portfolioStress,
                  analyzedSites,
                  consolidatedTotals,
                  consolidatedChronique,
                  selectedPortfolio
                })
              }
              className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg border border-amber-400/40 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title={`Ouvrir l'Étude Complète & Mémorandum d'Investissement pour le portefeuille ${selectedPortfolio}`}
            >
              <Sparkles className="w-4 h-4 text-yellow-200" />
              Étude Complète ({selectedPortfolio === 'ALL' ? 'TOUS' : selectedPortfolio})
            </button>
          )}
        </div>
      </div>

      {/* ── 1. SÉLECTEURS GLOBAUX (CAPEX PROPRE/TIERS | PRÊT/COMPTANT | CLEAN HORIZON 20A) ── */}
      <BessGlobalSelectorsBar
        capexMode={inputs.capexMode || 'COMPTE_PROPRE'}
        onSelectCapexMode={handleSelectCapexMode}
        financingMode={inputs.financingMode || 'WITH_LOAN'}
        onSelectFinancingMode={handleSelectFinancingMode}
        revenueModel={inputs.revenueModel || 'CLEAN_HORIZON'}
        onSelectRevenueModel={handleSelectRevenueModel}
        horizonYears={inputs.horizonYears || 20}
        onSelectHorizonYears={handleSelectHorizonYears}
        powerMw={currentPreset.powerMw}
        nbSites={nbSites}
      />

      {/* ── Barre Paliers de Puissance unitaire, Loyer Bailleur & Conformité Bancaire ── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3" data-html2canvas-ignore="true">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mr-1">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Puissance / Site :
          </span>
          {Object.entries(BESS_PRESETS).map(([key]) => {
            const isSelected = presetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{key} MW ({Number(key) * 1000} kW)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {(Number(key) * 2.088).toFixed(2)} MWh
                </span>
              </button>
            );
          })}
        </div>

        {/* Sélecteur rapide et éditable du Loyer Bailleur (€/an/site) directement en haut de page */}
        <div className="flex flex-wrap items-center gap-1.5 bg-emerald-50/70 px-3 py-1.5 rounded-xl border border-emerald-200">
          <span className="text-xs font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1 mr-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            Loyer Bailleur :
          </span>
          {[1500, 2000, 2400, 2500, 3000].map(l => {
            const scale = (currentPreset.powerMw || 0.50) / 0.50;
            const scaledL = Math.round(l * scale);
            const isSel = Number(inputs.loyerAn1 ?? 3000) === scaledL;
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setSiteRentOverrides({});
                  updateInput('loyerAn1', scaledL);
                  updateInput('loyer1', scaledL);
                }}
                className={`px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  isSel
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-100/60'
                }`}
              >
                {scaledL.toLocaleString('fr-FR')} €
              </button>
            );
          })}
          <div className="flex items-center gap-1 ml-1">
            <input
              type="number"
              step="100"
              min="0"
              value={Math.round(inputs.loyerAn1 ?? 3000)}
              onChange={e => {
                const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                setSiteRentOverrides({});
                updateInput('loyerAn1', v);
                updateInput('loyer1', v);
              }}
              className="w-20 px-2 py-1 text-xs font-black text-right rounded-lg border border-emerald-300 bg-white text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Saisir un loyer annuel personnalisé (€/an/site)"
            />
            <span className="text-[11px] font-bold text-emerald-800">€/an</span>
          </div>
        </div>

        {/* Badge de conformité bancaire du portefeuille */}
        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-black ${
          isDscrCompliant
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : isDscrAcceptable
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {isDscrCompliant ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <span>
            {isCashMode
              ? '100% FONDS PROPRES (PAYÉ COMPTANT — SANS DETTE)'
              : isDscrCompliant
              ? `BANQUE COMPLIANT (DSCR min ${portfolioModel.kpis.dscrMin.toFixed(2)}x ≥ 1,20x)`
              : isDscrAcceptable
              ? `CONFORME LIMITE (DSCR min ${portfolioModel.kpis.dscrMin.toFixed(2)}x ≥ 1,10x)`
              : `NON CONFORME BANQUE (DSCR min ${portfolioModel.kpis.dscrMin.toFixed(2)}x < 1,10x)`}
          </span>
        </div>
      </div>

      {/* ── KPI Cards Consolidation ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puissance Globale</div>
          <div className="text-xl font-black text-slate-900 mt-1">{Number(consolidatedTotals.totalPowerMw).toFixed(2)} MW</div>
          <div className="text-[10px] font-semibold text-blue-600 mt-0.5">{consolidatedTotals.totalSites} × {unitPowerKw} kW HTA</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacité Stockage</div>
          <div className="text-xl font-black text-slate-900 mt-1">{Number(consolidatedTotals.totalCapacityMwh).toFixed(2)} MWh</div>
          <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">{consolidatedTotals.totalSites} × {unitCapacityKwh} kWh (2h)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAPEX Consolidé</div>
          <div className="text-xl font-black text-slate-900 mt-1">{fmtM(consolidatedTotals.totalCapex)}</div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{fmtEur(consolidatedTotals.unitCapex)} / site</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CA Corrigé An 1</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{fmtM(consolidatedTotals.totalCaAn1)}</div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">{fmtEur(consolidatedTotals.totalCaAn1 / nbSites)} / site (Brut: {fmtEur(consolidatedTotals.totalCaBrutAn1 / nbSites)})</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EBITDA An 1</div>
          <div className="text-xl font-black text-blue-600 mt-1">{fmtM(consolidatedTotals.totalEbitdaAn1)}</div>
          <div className="text-[10px] font-semibold text-blue-700 mt-0.5">{fmtEur(consolidatedTotals.totalEbitdaAn1 / nbSites)} / site</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TRI Projet / FP</div>
          <div className="text-xl font-black text-purple-600 mt-1">{fmtPct(consolidatedTotals.triConsolide)}</div>
          <div className="text-[10px] font-bold text-purple-700 mt-0.5">
            TRI FP : {fmtPct(consolidatedTotals.triFondsPropres)} • Payback {consolidatedTotals.paybackConsol.toFixed(1)}a
          </div>
        </div>
      </div>

      {/* ── 4 Cartes de Synthèse Prêteur Consolidées ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Synthèse Bancaire Prêteur Consolidée — Portefeuille {selectedPortfolio === 'ALL' ? 'Tous' : selectedPortfolio} ({nbSites} Sites)
          </h3>
          <span className="text-xs font-bold text-slate-500">
            Horizon {inputs.horizonYears} ans • {inputs.capexMode === 'COMPTE_TIERS' ? 'Pour Compte Tiers' : 'Pour Compte Propre'}
          </span>
        </div>
        <BessLender4SummaryCards model={portfolioModel} />
      </div>

      {/* ── 2. VENTILATION CAPEX DÉTAILLÉE & ÉDITABLE (MOYEN PAR SITE + CONSOLIDÉ PORTEFEUILLE) ── */}
      <BessCapexBreakdownCard
        capexSummary={portfolioModel.capexSummary}
        capexMode={inputs.capexMode || 'COMPTE_PROPRE'}
        onUpdateCapexField={handleUpdateCapexField}
        onSelectCapexMode={handleSelectCapexMode}
        powerMw={currentPreset.powerMw}
        nbSites={nbSites}
        fraisCommerciaux={inputs.fraisCommerciaux || 0}
      />

      {/* ── 4. GRAPHIQUES CLEAN HORIZON (2027-2046) & TRAJECTOIRE EBITDA VS DETTE ── */}
      <BessCleanHorizonChartsSection model={portfolioModel} />

      {/* ── 3. LES 4 COLONNES D'HYPOTHÈSES FINANCIÈRES & OPEX (100% ÉDITABLES EN PORTEFEUILLE) ── */}
      <BessAssumptions4ColumnsGrid
        inputs={inputs}
        model={portfolioModel}
        onUpdateInput={updateInput}
        onSelectRevenueModel={handleSelectRevenueModel}
        onSelectHorizonYears={handleSelectHorizonYears}
        onResetToDefault={() => handleSelectPreset(presetKey)}
        powerMw={currentPreset.powerMw}
        nbSites={nbSites}
      />

      {/* ── 5. TABLEAU COMPLET ANNÉE PAR ANNÉE CONSOLIDÉ (AN 1 À AN 20 + TOTAL) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          onClick={() => setExpandedChronique(!expandedChronique)}
          className="p-4 bg-slate-100 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Compte de Résultat, Flux de Trésorerie & Service de la Dette Consolidé ({inputs.horizonYears} Ans — {nbSites} Sites)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>{expandedChronique ? 'Masquer le tableau détaillé' : `Afficher les ${inputs.horizonYears} années`}</span>
            {expandedChronique ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {expandedChronique && (
          <div className="p-4 space-y-5">
            <BessCompleteAnnualTable model={portfolioModel} />
            <div className="pt-4 border-t border-slate-200">
              <BessSensitivityMatrixSection stress={portfolioStress} model={portfolioModel} />
            </div>
          </div>
        )}
      </div>

      {/* ── Table Détaillée des Sites BESS (Coordonnées GPS, CAPEX et Loyer éditables site par site) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Inventaire Exhaustif des {consolidatedTotals.totalSites} Sites du Portefeuille (CAPEX & Loyer Éditables par Site)
            </h3>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-blue-100 text-blue-800">
              {filteredSites.length} / {consolidatedTotals.totalSites} sites
            </span>
            {(Object.keys(siteCapexOverrides).length > 0 || Object.keys(siteRentOverrides).length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSiteCapexOverrides({});
                  setSiteRentOverrides({});
                }}
                className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser surcharges ({Object.keys(siteCapexOverrides).length + Object.keys(siteRentOverrides).length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2" data-html2canvas-ignore="true">
            <input
              type="text"
              placeholder="Rechercher commune, site, GPS ou poste..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 w-52 sm:w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold text-left">
                <th className="p-2.5">N°</th>
                <th className="p-2.5">Site</th>
                <th className="p-2.5">Coordonnées GPS</th>
                <th className="p-2.5">Localisation</th>
                <th className="p-2.5">Poste Source Enedis (ODRE)</th>
                <th className="p-2.5 text-center">Distance</th>
                <th className="p-2.5">Zone CRE 2025-227</th>
                <th className="p-2.5 text-right">CAPEX Site (Éditable)</th>
                <th className="p-2.5 text-right">CA Corrigé An 1</th>
                <th className="p-2.5 text-right">EBITDA An 1</th>
                <th className="p-2.5 text-right">Loyer Bailleur</th>
                <th className="p-2.5 text-center">TRI Projet</th>
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
                    {s.client && s.client !== s.name && (
                      <div className="text-[10px] text-slate-400">{s.client}</div>
                    )}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-blue-700 font-semibold whitespace-nowrap">
                    {s.gps}
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
                  <td className="p-2.5 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="1000"
                        value={Math.round(s.capexTotal)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSiteCapexOverrides(prev => ({
                            ...prev,
                            [s.id]: isNaN(val) ? 0 : val
                          }));
                        }}
                        className={`w-24 px-1.5 py-0.5 text-right text-xs font-bold rounded border ${
                          s.isCapexOverridden
                            ? 'bg-amber-50 border-amber-400 text-amber-950'
                            : 'bg-blue-50/60 border-blue-200 text-slate-800'
                        }`}
                        title="Modifier le CAPEX spécifique de ce site"
                      />
                      <span className="text-[10px] font-bold text-slate-500">€</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-right font-bold text-emerald-600">{fmtEur(s.caAnnuel)}</td>
                  <td className="p-2.5 text-right font-black text-blue-700">{fmtEur(s.ebitda)}</td>
                  <td className="p-2.5 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="100"
                        value={Math.round(s.customRent ?? inputs.loyerAn1 ?? 3000)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSiteRentOverrides(prev => ({
                            ...prev,
                            [s.id]: isNaN(val) ? 0 : val
                          }));
                        }}
                        className={`w-20 px-1.5 py-0.5 text-right text-xs font-bold rounded border ${
                          s.isRentOverridden
                            ? 'bg-amber-50 border-amber-400 text-amber-950'
                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                        }`}
                        title="Modifier le loyer bailleur annuel de ce site"
                      />
                      <span className="text-[10px] font-bold text-slate-500">€</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-black text-purple-700">{fmtPct(s.triProjet)}</td>
                  <td className="p-2.5 text-center font-bold text-slate-600">{s.payback.toFixed(1)} ans</td>
                  <td className="p-2.5 text-center" data-html2canvas-ignore="true">
                    {onSelectSite && (
                      <button
                        onClick={() => onSelectSite(s)}
                        className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors cursor-pointer"
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

      <PortfolioManagerModal
        open={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        projects={projects}
      />

      {isLenderModalOpen && (
        <BessPortfolioLenderModal
          isOpen={isLenderModalOpen}
          onClose={() => setIsLenderModalOpen(false)}
          portfolioName={selectedPortfolio}
          sites={analyzedSites}
          consolidatedTotals={consolidatedTotals}
          consolidatedChronique={consolidatedChronique}
          debtDuration={inputs.loanDurationYears}
          debtRate={Number(inputs.nominalRatePct || 4.10) + Number(inputs.insuranceRatePct || 0.20)}
          loyerBailleurPerSite={inputs.loyerAn1}
          fraisCommerciauxPerSite={inputs.fraisCommerciaux}
          unifiedInputs={inputs}
          portfolioModel={portfolioModel}
          portfolioStress={portfolioStress}
        />
      )}
    </div>
  );
}
