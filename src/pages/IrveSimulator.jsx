import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { FileDown, Calculator, ShieldCheck, Lightbulb, CheckCircle2, Save, Trash2, Search, X, FolderOpen, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '@/config/firebase.js';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast.js';
import EvComparator from '@/components/simulator/EvComparator';

// ─── Tarifs solaires (0.98€/Wc pour 36kWc, +2% par kWc en remontant) ──────────
const SOLAR_POWERS = [1, 3, 5, 9, 15, 22, 36];
const SOLAR_BASE_PRICE_PER_WC = 0.98; // pour 36kWc
const getSolarPricePerWc = (kwc) => {
  const stepsFrom36 = 36 - kwc;
  return SOLAR_BASE_PRICE_PER_WC * Math.pow(1.02, stepsFrom36);
};
const getSolarTotalPrice = (kwc) => {
  return Math.round(getSolarPricePerWc(kwc) * kwc * 1000);
};

// ─── Types de bailleurs ──────────────────────────────────────────────────────
const LANDLORD_TYPES = [
  { id: 'particulier', label: 'Particulier', autoconsoRate: 0.75, elecPrice: 0.22, prodFactor: 1100 },
  { id: 'bailleur_social', label: 'Bailleur social (HLM)', autoconsoRate: 0.60, elecPrice: 0.18, prodFactor: 1100 },
  { id: 'bailleur_prive', label: 'Bailleur privé', autoconsoRate: 0.65, elecPrice: 0.20, prodFactor: 1100 },
  { id: 'entreprise', label: 'Entreprise / Tertiaire', autoconsoRate: 0.85, elecPrice: 0.20, prodFactor: 1100 },
  { id: 'collectivite', label: 'Collectivité', autoconsoRate: 0.80, elecPrice: 0.16, prodFactor: 1100 },
];

// ─── Champ centré style "Section 2" ─────────────────────────────────────────
const CenteredInput = ({ className, ...props }) => (
  <Input
    {...props}
    className={cn('text-center font-semibold', className)}
    style={{ paddingTop: 0, paddingBottom: 0, lineHeight: '2.5rem', height: '2.5rem', ...props.style }}
  />
);

// ─── Composant ProjectSelect (inline) ────────────────────────────────────────
const ProjectSelect = ({ projects, activeProjectId, onSelect }) => {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const dropdownRef = useRef(null);

  const filteredProjects = React.useMemo(() => {
    if (!search) return projects;
    return projects.filter(p =>
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-colors border border-slate-600 text-left"
        onClick={() => setShowSearch(!showSearch)}
      >
        <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate flex-1">
          {activeProject ? <span className="text-blue-300 font-medium">{activeProject.name}</span> : 'Sélectionner un projet...'}
        </span>
      </button>

      {showSearch && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[200] max-h-[280px] flex flex-col">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                placeholder="Rechercher..."
                className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-md bg-slate-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-500 italic"
              onClick={() => { onSelect(null); setShowSearch(false); }}
            >
              — Aucun projet —
            </button>
            {filteredProjects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center italic">Aucun projet trouvé</div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors flex flex-col gap-0.5",
                    activeProjectId === project.id && "bg-blue-50 border-l-2 border-blue-500"
                  )}
                  onClick={() => { onSelect(project.id); setShowSearch(false); }}
                >
                  <span className="font-medium text-slate-900 truncate">{project.name}</span>
                  {(project.address || project.city) && (
                    <span className="text-xs text-slate-500 truncate">
                      {[project.address, project.zip, project.city].filter(Boolean).join(' ')}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function IrveSimulator() {
  const { user } = useAuth();
  const { projects } = useProjects();

  // ── Type de projet
  const [projectType, setProjectType] = useState('irve'); // 'irve' | 'solar'

  // ── Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('simulations'); // 'simulations' | 'tarifs'
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [simName, setSimName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGammeExpanded, setIsGammeExpanded] = useState(true);
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);

  // ── Refs PDF – IRVE
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);
  const page3Ref = useRef(null);
  // ── Refs PDF – Solaire (2 pages séparées)
  const solarPage1Ref = useRef(null); // Puissance + Avantages
  const solarPage2Ref = useRef(null); // Simulation Financière

  // ── IRVE – Gamme produits
  const [products, setProducts] = useState([
    { id: 1, power: 7.4, price: 2600, target: 'Hôtels, restaurants, TPE', position: 'Entrée de gamme' },
    { id: 2, power: 11, price: 2960, target: 'PME, bureaux, commerces', position: 'Standard triphasé' },
    { id: 3, power: 22, price: 2960, target: 'Hôtels, restaurants, flottes', position: 'Rapide AC' },
    { id: 4, power: 60, price: 21062, target: 'Parkings publics, aires, grands hôtels', position: 'Recharge rapide DC' },
    { id: 5, power: 120, price: 39365, target: 'Autoroutes, grands complexes', position: 'Ultra-rapide DC' },
  ]);

  // ── IRVE – Simulateur ROI
  const [quantity, setQuantity] = useState(1);
  const [usageType, setUsageType] = useState('NonEligible');
  const [installFeePerPoint, setInstallFeePerPoint] = useState(1000);
  const [selectedPower, setSelectedPower] = useState(22);
  const [marginPerRecharge, setMarginPerRecharge] = useState(4);
  const [rechargesPerMonth, setRechargesPerMonth] = useState(205);
  const [pricingMode, setPricingMode] = useState('margin'); // 'margin' | 'price'
  const [salePrice, setSalePrice] = useState(0.40); // tarif de vente €/kWh
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(0.20); // coût élec €/kWh
  const [targetTypology, setTargetTypology] = useState('personnalise');
  const [customFinanceAmount, setCustomFinanceAmount] = useState('');
  const [financeYears, setFinanceYears] = useState(5);
  const [clientDeposit, setClientDeposit] = useState(0);
  const [inflationRate, setInflationRate] = useState(2);
  const [maintenanceCost, setMaintenanceCost] = useState(200);

  // ── Solaire – État
  const [selectedKwc, setSelectedKwc] = useState(9);
  const [solarPricePerWc, setSolarPricePerWc] = useState(getSolarPricePerWc(9));
  const [solarProductionFactor, setSolarProductionFactor] = useState(1100);
  const [solarElecPrice, setSolarElecPrice] = useState(0.20);
  const [solarAutoconsoRate, setSolarAutoconsoRate] = useState(70);
  const [solarLandlordType, setSolarLandlordType] = useState('entreprise');
  const [solarSunlibMode, setSolarSunlibMode] = useState(false);
  const [solarSunlibYears, setSolarSunlibYears] = useState(10);
  const [solarInflation, setSolarInflation] = useState(3);

  // ─── Firebase – Chargement simulations ──────────────────────────────────────
  const getSimulationsCollection = useCallback(() => {
    const tenantId = user?.activeTenantId || user?.tenantId || 'enr-courtage-energie';
    return collection(db, 'tenants', tenantId, 'irve_simulations');
  }, [user]);

  useEffect(() => {
    const loadSimulations = async () => {
      setIsLoadingSimulations(true);
      try {
        const col = getSimulationsCollection();
        const q = query(col, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setSimulations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Erreur chargement simulations:', err);
      } finally {
        setIsLoadingSimulations(false);
      }
    };
    loadSimulations();
  }, [getSimulationsCollection]);

  // ─── IRVE – Calculs ─────────────────────────────────────────────────────────
  const currentProduct = products.find(p => p.power === selectedPower) || products[0];
  const hardwareCost = currentProduct.price * quantity;
  const installCostTotal = installFeePerPoint * quantity;
  const totalInvestment = hardwareCost + installCostTotal;

  const typologies = {
    'personnalise': { label: 'Personnalisé', estimate: null },
    'tpe': { label: 'TPE / Bureaux', estimate: 30 },
    'copro': { label: 'Copropriété', estimate: 60 },
    'restaurant': { label: 'Restaurant', estimate: 150 },
    'hotel': { label: 'Hôtel', estimate: 300 },
    'parking': { label: 'Parking public', estimate: 500 },
    'flotte': { label: 'Flotte entreprise', estimate: 100 },
  };

  const handleTypologyChange = (value) => {
    setTargetTypology(value);
    if (typologies[value].estimate !== null) setRechargesPerMonth(typologies[value].estimate);
  };

  const calculateSubvention = () => {
    switch (usageType) {
      case 'Copro': return Math.min(totalInvestment * 0.5, 1660 * quantity);
      case 'PL': return Math.min(totalInvestment * 0.5, 15000 * quantity);
      case 'Voirie': return Math.min(totalInvestment * 0.3, 9000 * quantity);
      case 'Salariés': return Math.min(totalInvestment * 0.2, 600 * quantity);
      default: return 0;
    }
  };

  const subvention = calculateSubvention();
  const resteACharge = totalInvestment - subvention;
  const effectiveMargin = pricingMode === 'price' ? Math.max(0, (salePrice - electricityCostPerKwh) * 48) : marginPerRecharge;
  const monthlyRevenue = effectiveMargin * rechargesPerMonth;
  const breakEvenMonths = monthlyRevenue > 0 ? resteACharge / monthlyRevenue : 0;
  const breakEvenDisplay = breakEvenMonths > 0 ? breakEvenMonths.toFixed(1) : '-';

  const displayFinanceAmount = customFinanceAmount !== '' ? Number(customFinanceAmount) : resteACharge;
  const actualFinanced = Math.max(0, displayFinanceAmount - clientDeposit);
  const financeRate = 0.08 / 12;
  const financeMonths = financeYears * 12;
  const monthlyLease = actualFinanced > 0
    ? (actualFinanced * financeRate) / (1 - Math.pow(1 + financeRate, -financeMonths))
    : 0;

  const generateIrveChartData = () => {
    const data = [];
    let currentProfit = -resteACharge;
    const dynamicMonths = Math.max(36, Math.ceil((breakEvenMonths + 12) / 12) * 12);
    for (let month = 1; month <= dynamicMonths; month++) {
      currentProfit += monthlyRevenue;
      data.push({ month: month.toString(), profit: Math.round(currentProfit), isPositive: currentProfit >= 0 });
    }
    return data;
  };
  const irveChartData = generateIrveChartData();
  const irveRoiMonth = irveChartData.find(d => d.profit >= 0)?.month || null;

  // ─── Solaire – Calculs ───────────────────────────────────────────────────────
  const solarTotalPriceHT = Math.round(solarPricePerWc * selectedKwc * 1000);
  const solarAnnualProduction = selectedKwc * solarProductionFactor;
  const solarAutoconsoKwh = solarAnnualProduction * (solarAutoconsoRate / 100);
  const solarAnnualSavings = solarAutoconsoKwh * solarElecPrice;
  const solarMonthlySavings = solarAnnualSavings / 12;

  // Abonnement SunLib
  const sunlibRate = 0.075 / 12;
  const sunlibMonths = solarSunlibYears * 12;
  const sunlibMonthlyLease = solarTotalPriceHT > 0
    ? (solarTotalPriceHT * sunlibRate) / (1 - Math.pow(1 + sunlibRate, -sunlibMonths))
    : 0;

  const solarNetMonthly = solarSunlibMode
    ? solarMonthlySavings - sunlibMonthlyLease
    : solarMonthlySavings;
  const solarNetAnnual = solarNetMonthly * 12;

  const solarBreakEvenYears = solarSunlibMode
    ? null
    : (solarMonthlySavings > 0 ? solarTotalPriceHT / (solarAnnualSavings * Math.pow(1 + solarInflation / 100, 0)) : 0);

  const generateSolarChartData = () => {
    const data = [];
    let cumul = solarSunlibMode ? 0 : -solarTotalPriceHT;
    for (let year = 1; year <= 25; year++) {
      const annualSav = solarAnnualSavings * Math.pow(1 + solarInflation / 100, year - 1);
      const cost = solarSunlibMode ? sunlibMonthlyLease * 12 : 0;
      cumul += annualSav - cost;
      data.push({ year: `${year}`, gain: Math.round(cumul), isPositive: cumul >= 0 });
    }
    return data;
  };
  const solarChartData = generateSolarChartData();
  const solarRoiYear = solarChartData.find(d => d.gain >= 0)?.year || null;

  // ─── Simulation – Sauvegarde / Chargement ────────────────────────────────────
  const buildSimPayload = () => ({
    name: simName || `Simulation ${new Date().toLocaleDateString('fr-FR')}`,
    projectType,
    createdAt: new Date().toISOString(),
    clientProjectId: selectedProjectId,
    irve: { products, quantity, usageType, installFeePerPoint, selectedPower, marginPerRecharge, rechargesPerMonth, targetTypology, financeYears, clientDeposit, customFinanceAmount, inflationRate, maintenanceCost, pricingMode, salePrice, electricityCostPerKwh },
    solar: { selectedKwc, solarPricePerWc, solarProductionFactor, solarElecPrice, solarAutoconsoRate, solarLandlordType, solarSunlibMode, solarSunlibYears, solarInflation },
  });

  const loadSimPayload = (sim) => {
    setProjectType(sim.projectType || 'irve');
    setSelectedProjectId(sim.clientProjectId || null);
    if (sim.irve) {
      const i = sim.irve;
      if (i.products) setProducts(i.products);
      if (i.quantity !== undefined) setQuantity(i.quantity);
      if (i.usageType) setUsageType(i.usageType);
      if (i.installFeePerPoint !== undefined) setInstallFeePerPoint(i.installFeePerPoint);
      if (i.selectedPower !== undefined) setSelectedPower(i.selectedPower);
      if (i.marginPerRecharge !== undefined) setMarginPerRecharge(i.marginPerRecharge);
      if (i.rechargesPerMonth !== undefined) setRechargesPerMonth(i.rechargesPerMonth);
      if (i.pricingMode) setPricingMode(i.pricingMode);
      if (i.salePrice !== undefined) setSalePrice(i.salePrice);
      if (i.electricityCostPerKwh !== undefined) setElectricityCostPerKwh(i.electricityCostPerKwh);
      else if (i.electricityCostPerRecharge !== undefined) setElectricityCostPerKwh(i.electricityCostPerRecharge / 48 || 0.20);
      if (i.targetTypology) setTargetTypology(i.targetTypology);
      if (i.financeYears !== undefined) setFinanceYears(i.financeYears);
      if (i.clientDeposit !== undefined) setClientDeposit(i.clientDeposit);
      if (i.customFinanceAmount !== undefined) setCustomFinanceAmount(i.customFinanceAmount);
      if (i.inflationRate !== undefined) setInflationRate(i.inflationRate);
      if (i.maintenanceCost !== undefined) setMaintenanceCost(i.maintenanceCost);
    }
    if (sim.solar) {
      const s = sim.solar;
      if (s.selectedKwc !== undefined) setSelectedKwc(s.selectedKwc);
      if (s.solarPricePerWc !== undefined) setSolarPricePerWc(s.solarPricePerWc);
      if (s.solarProductionFactor !== undefined) setSolarProductionFactor(s.solarProductionFactor);
      if (s.solarElecPrice !== undefined) setSolarElecPrice(s.solarElecPrice);
      if (s.solarAutoconsoRate !== undefined) setSolarAutoconsoRate(s.solarAutoconsoRate);
      if (s.solarLandlordType) setSolarLandlordType(s.solarLandlordType);
      if (s.solarSunlibMode !== undefined) setSolarSunlibMode(s.solarSunlibMode);
      if (s.solarSunlibYears !== undefined) setSolarSunlibYears(s.solarSunlibYears);
      if (s.solarInflation !== undefined) setSolarInflation(s.solarInflation);
    }
    toast({ title: 'Simulation chargée', description: sim.name });
  };

  const handleSaveSimulation = async () => {
    setIsSaving(true);
    try {
      const col = getSimulationsCollection();
      const id = `sim_${Date.now()}`;
      const payload = buildSimPayload();
      await setDoc(doc(col, id), payload);
      setSimulations(prev => [{ id, ...payload }, ...prev]);
      setSimName('');
      toast({ title: 'Simulation sauvegardée', description: payload.name });
    } catch (err) {
      console.error('Erreur sauvegarde simulation:', err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la simulation.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSimulation = async (simId) => {
    try {
      const col = getSimulationsCollection();
      await deleteDoc(doc(col, simId));
      setSimulations(prev => prev.filter(s => s.id !== simId));
    } catch (err) {
      console.error('Erreur suppression simulation:', err);
    }
  };

  // ─── Changement de puissance solaire ────────────────────────────────────────
  const handleKwcChange = (kwc) => {
    setSelectedKwc(kwc);
    setSolarPricePerWc(getSolarPricePerWc(kwc));
    const lt = LANDLORD_TYPES.find(l => l.id === solarLandlordType);
    if (lt) {
      setSolarAutoconsoRate(lt.autoconsoRate * 100);
      setSolarElecPrice(lt.elecPrice);
      setSolarProductionFactor(lt.prodFactor);
    }
  };

  const handleLandlordTypeChange = (typeId) => {
    setSolarLandlordType(typeId);
    const lt = LANDLORD_TYPES.find(l => l.id === typeId);
    if (lt) {
      setSolarAutoconsoRate(lt.autoconsoRate * 100);
      setSolarElecPrice(lt.elecPrice);
      setSolarProductionFactor(lt.prodFactor);
    }
  };

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const selectedProject = (projects || []).find(p => p.id === selectedProjectId);

  const handleExportPDF = async () => {
    const refs = projectType === 'irve'
      ? [page1Ref, page2Ref, page3Ref].filter(r => r.current)
      : [solarPage1Ref, solarPage2Ref].filter(r => r.current);

    if (refs.length === 0) return;

    // Temporarily expand the gamme section for PDF capture
    const wasGammeExpanded = isGammeExpanded;
    if (!wasGammeExpanded) {
      setIsGammeExpanded(true);
      // Wait for React to re-render
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < refs.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(refs[i].current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        let imgH = (canvas.height * pdfWidth) / canvas.width;
        let finalW = pdfWidth;
        if (imgH > pdfHeight - 10) { imgH = pdfHeight - 10; finalW = (canvas.width * imgH) / canvas.height; }
        pdf.addImage(imgData, 'PNG', (pdfWidth - finalW) / 2, 5, finalW, imgH);
      }

      const clientName = selectedProject?.name ? `_${selectedProject.name.replace(/\s+/g, '_')}` : '';
      const typeLabel = projectType === 'irve' ? 'IRVE' : 'Solaire';
      pdf.save(`Etude_${typeLabel}${clientName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erreur PDF:', err);
    } finally {
      // Restore previous state
      if (!wasGammeExpanded) {
        setIsGammeExpanded(false);
      }
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden">

      {/* ════ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <aside className={cn(
        'bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-72' : 'w-12'
      )}>
        {/* Sidebar header */}
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between min-h-[52px]">
          {sidebarOpen && (
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Simulations</h2>
              <p className="text-[11px] text-slate-400">ENR Courtage</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white transition-colors ml-auto"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Projet CRM */}
            <div className="px-3 py-3 border-b border-slate-700">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Projet CRM
              </p>
              <ProjectSelect
                projects={projects || []}
                activeProjectId={selectedProjectId}
                onSelect={setSelectedProjectId}
              />
              {selectedProject && (
                <div className="mt-2 bg-slate-800 rounded-md px-2 py-1.5 text-[11px] text-slate-300">
                  <p className="font-semibold text-blue-300 truncate">{selectedProject.name}</p>
                  {selectedProject.city && <p className="text-slate-400">{selectedProject.city}</p>}
                </div>
              )}
            </div>

            {/* Onglets sidebar */}
            <div className="flex border-b border-slate-700">
              {[
                { id: 'simulations', label: 'Simulations' },
                { id: 'tarifs', label: 'Solution & Tarifs' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold transition-colors',
                    sidebarTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu onglet Simulations */}
            {sidebarTab === 'simulations' && (
              <div className="flex-1 overflow-y-auto">
                {/* Sauvegarde */}
                <div className="px-3 py-3 border-b border-slate-700">
                  <input
                    value={simName}
                    onChange={e => setSimName(e.target.value)}
                    placeholder="Nom de la simulation..."
                    className="w-full bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 text-sm mb-2 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSaveSimulation}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>

                {/* Liste des simulations */}
                <div className="px-3 py-2">
                  {isLoadingSimulations ? (
                    <p className="text-slate-500 text-xs text-center py-4">Chargement...</p>
                  ) : simulations.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4 italic">Aucune simulation sauvegardée</p>
                  ) : (
                    <div className="space-y-2">
                      {simulations.map(sim => (
                        <div key={sim.id} className="bg-slate-800 rounded-lg px-2.5 py-2 group">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-200 truncate">{sim.name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {sim.projectType === 'solar' ? 'Solaire' : 'IRVE'} · {sim.createdAt ? new Date(sim.createdAt).toLocaleDateString('fr-FR') : ''}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => loadSimPayload(sim)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Charger"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSimulation(sim.id)}
                                className="text-slate-600 hover:text-red-400 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contenu onglet Solution & Tarifs */}
            {sidebarTab === 'tarifs' && (
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Offre Commerciale IRVE</p>
                <div className="space-y-2">
                  {products.map(p => (
                    <div key={p.id} className="bg-slate-800 rounded-lg px-2.5 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-300">{p.power} kW</span>
                        <span className="text-xs font-semibold text-slate-200">{p.price.toLocaleString('fr-FR')} €</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">{p.target}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 italic">{p.position}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-5">Offre Commerciale Solaire</p>
                <div className="space-y-2">
                  {SOLAR_POWERS.map(kwc => (
                    <div key={kwc} className={cn('rounded-lg px-2.5 py-2', kwc === selectedKwc ? 'bg-amber-900/60 border border-amber-500/40' : 'bg-slate-800')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-bold', kwc === selectedKwc ? 'text-amber-300' : 'text-slate-300')}>{kwc} kWc</span>
                        <span className="text-xs font-semibold text-slate-200">{getSolarTotalPrice(kwc).toLocaleString('fr-FR')} €</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{getSolarPricePerWc(kwc).toFixed(4)} €/Wc</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </aside>

      {/* ════ CONTENU PRINCIPAL ════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-600" />
                Simulateur
              </h1>
              {selectedProject && (
                <p className="text-xs text-blue-600 font-semibold mt-0.5">{selectedProject.name}</p>
              )}
            </div>

            {/* Boutons choix du type de projet */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 ml-4">
              <button
                onClick={() => setProjectType('irve')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
                  projectType === 'irve'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                )}
              >
                IRVE
              </button>
              <button
                onClick={() => setProjectType('solar')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
                  projectType === 'solar'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                )}
              >
                Autoconsommation
              </button>
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-sm font-semibold transition-colors shadow"
          >
            <FileDown className="h-4 w-4" />
            Exporter (PDF)
          </button>
        </div>

        {/* ════ CONTENU IRVE ══════════════════════════════════════════════════ */}
        {projectType === 'irve' && (
          <div className="p-6 space-y-8 max-w-[95rem] mx-auto pb-20">

            {/* PAGE 1 PDF */}
            <div ref={page1Ref} className="space-y-6 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="text-center mb-6 pb-6 border-b border-slate-200">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Étude de Rentabilité : Projet IRVE</h2>
                <p className="text-slate-500 mt-3 text-lg">Démontrez l'intérêt d'investir dans une infrastructure de recharge</p>
                {selectedProject && (
                  <p className="text-blue-600 font-semibold mt-2">Client : {selectedProject.name}</p>
                )}
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded-lg text-sm shadow-sm">
                <strong>Important – Éligibilité aux aides 2026 :</strong> La prime ADVENIR n'est plus applicable pour la majorité des projets hôteliers et de restauration classiques. Les aides (Régionales, CEE, Amortissement) dépendent de votre situation.
              </div>

              {/* Comparateur de véhicules */}
              <EvComparator />

              {/* Arguments commerciaux */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-t-4 border-t-amber-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-500" />
                      Conformité & Loi LOM
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-3">
                    <p className="text-slate-700 text-sm">
                      <span className="font-bold text-amber-700">Obligation réglementaire :</span> Depuis le 1er janvier 2025, les bâtiments non résidentiels avec un parking de plus de 20 places doivent s'équiper.
                    </p>
                    <p className="text-slate-700 text-sm">Évitez les sanctions et valorisez votre patrimoine immobilier en vous mettant en conformité avec la Loi LOM.</p>
                  </CardContent>
                </Card>
                <Card className="border-t-4 border-t-blue-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-blue-500" />
                      Intérêts Commerciaux
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <ul className="list-disc pl-5 space-y-2 text-slate-700 text-sm">
                      <li><span className="font-semibold">Visibilité accrue :</span> Soyez visible sur Booking.com, Google Maps et Chargemap.</li>
                      <li><span className="font-semibold">Nouveaux revenus :</span> Transformez votre parking en centre de profit.</li>
                      <li><span className="font-semibold">Fidélisation :</span> Attirez une clientèle au fort pouvoir d'achat.</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Offre Commerciale – visible dans l'interface, hors PDF */}
            <Card className="border-t-4 border-t-blue-500 shadow-lg border-x-0 border-b-0 rounded-xl overflow-hidden bg-white">
              <CardHeader
                className="bg-slate-50/50 border-b border-slate-100 pb-4 cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                onClick={() => setIsGammeExpanded(!isGammeExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-slate-800">1. Offre Commerciale : Gamme &amp; Positionnement</CardTitle>
                  {isGammeExpanded
                    ? <ChevronUp className="w-5 h-5 text-slate-400 transition-transform" />
                    : <ChevronDown className="w-5 h-5 text-slate-400 transition-transform" />
                  }
                </div>
              </CardHeader>
              {isGammeExpanded && (
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead className="font-semibold text-slate-700">Puissance (kW)</TableHead>
                          <TableHead className="font-semibold text-slate-700">Prix HT (€)</TableHead>
                          <TableHead className="font-semibold text-slate-700">Usage Cible</TableHead>
                          <TableHead className="font-semibold text-slate-700">Positionnement</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                              <CenteredInput
                                type="number"
                                value={product.power}
                                onChange={(e) => setProducts(products.map(p => p.id === product.id ? { ...p, power: Number(e.target.value) || e.target.value } : p))}
                                className="w-24 border-slate-300 focus:ring-blue-500"
                              />
                            </TableCell>
                            <TableCell>
                              <CenteredInput
                                type="number"
                                value={product.price}
                                onChange={(e) => setProducts(products.map(p => p.id === product.id ? { ...p, price: Number(e.target.value) || e.target.value } : p))}
                                className="w-32 border-slate-300 focus:ring-blue-500"
                              />
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium">{product.target}</TableCell>
                            <TableCell className="text-slate-500">{product.position}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* PAGE 2 PDF – Simulateur ROI */}
            <div ref={page2Ref} className="space-y-8 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <Card className="border-t-4 border-t-emerald-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-xl font-bold text-slate-800">2. Simulateur Interactif de ROI</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Panneau de contrôle */}
                    <div className="lg:col-span-4 space-y-7 bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold mb-3 block text-slate-700">Quantité</Label>
                          <CenteredInput type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full bg-white border-slate-300" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-3 block text-slate-700">Frais install./borne HT</Label>
                          <CenteredInput type="number" value={installFeePerPoint} onChange={(e) => setInstallFeePerPoint(Number(e.target.value))} className="w-full bg-white border-slate-300" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 -mt-4">Investissement total estimé : <span className="font-bold">{totalInvestment.toLocaleString('fr-FR')} € HT</span></p>

                      <div className="pt-2">
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Type d'usage (Éligibilité Aides)</Label>
                        <Select value={usageType} onValueChange={setUsageType}>
                          <SelectTrigger className="bg-white border-slate-300" style={{ height: '2.5rem', lineHeight: '2.5rem' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NonEligible">Non éligible (Hôtels, Restaurants...)</SelectItem>
                            <SelectItem value="Copro">Copropriété / Résidence hôtelière</SelectItem>
                            <SelectItem value="PL">Poids lourds / Logistique</SelectItem>
                            <SelectItem value="Voirie">Collectivité / Voirie publique</SelectItem>
                            <SelectItem value="Salariés">Entreprise - Salariés uniquement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Puissance de la borne (kW)</Label>
                        <Select value={selectedPower.toString()} onValueChange={(v) => setSelectedPower(Number(v))}>
                          <SelectTrigger className="bg-white border-slate-300 mb-2" style={{ height: '2.5rem', lineHeight: '2.5rem' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={p.power.toString()}>{p.power} kW</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          Temps de recharge (0–80% Tesla Model 3) : <span className="font-bold text-slate-700">{selectedPower > 0 ? (48 / selectedPower).toFixed(1) : 0} h</span>
                        </p>
                      </div>

                      <div className="pt-5 border-t border-slate-200">
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Cible (Typologie)</Label>
                        <Select value={targetTypology} onValueChange={handleTypologyChange}>
                          <SelectTrigger className="bg-white border-slate-300 mb-4" style={{ height: '2.5rem', lineHeight: '2.5rem' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(typologies).map(([key, config]) => (
                              <SelectItem key={key} value={key}>{config.label} {config.estimate ? `(~${config.estimate}/mois)` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Toggle Mode Tarification */}
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-3">
                          <button
                            onClick={() => setPricingMode('margin')}
                            className={cn(
                              'flex-1 py-1.5 text-xs font-semibold transition-colors',
                              pricingMode === 'margin' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'
                            )}
                          >
                            Marge / recharge
                          </button>
                          <button
                            onClick={() => setPricingMode('price')}
                            className={cn(
                              'flex-1 py-1.5 text-xs font-semibold transition-colors',
                              pricingMode === 'price' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'
                            )}
                          >
                            Tarif de vente
                          </button>
                        </div>

                        {pricingMode === 'margin' ? (
                          <>
                            <Label className="text-sm font-semibold mb-3 block text-slate-700">Marge par recharge (€)</Label>
                            <div className="flex items-center gap-4 mb-2">
                              <Slider value={[marginPerRecharge]} onValueChange={(val) => setMarginPerRecharge(val[0])} max={20} step={0.1} className="flex-1 cursor-pointer" />
                              <CenteredInput type="number" step="0.1" value={marginPerRecharge} onChange={(e) => setMarginPerRecharge(Number(e.target.value))} className="w-24 bg-white border-slate-300" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Label className="text-sm font-semibold mb-1 block text-slate-700">Tarif de vente (€ / kWh)</Label>
                            <div className="flex items-center gap-4 mb-2">
                              <Slider value={[salePrice]} onValueChange={(val) => setSalePrice(val[0])} max={1} step={0.01} className="flex-1 cursor-pointer" />
                              <CenteredInput type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="w-24 bg-white border-slate-300" />
                            </div>
                            <Label className="text-sm font-semibold mb-1 block text-slate-700">Coût électricité (€ / kWh)</Label>
                            <div className="flex items-center gap-4 mb-2">
                              <Slider value={[electricityCostPerKwh]} onValueChange={(val) => setElectricityCostPerKwh(val[0])} max={1} step={0.01} className="flex-1 cursor-pointer" />
                              <CenteredInput type="number" step="0.01" value={electricityCostPerKwh} onChange={(e) => setElectricityCostPerKwh(Number(e.target.value))} className="w-24 bg-white border-slate-300" />
                            </div>
                            <p className="text-xs text-slate-500 mb-2">Marge nette : <span className="font-bold text-emerald-700">{((salePrice - electricityCostPerKwh) * 48).toFixed(2)} € / recharge</span> (base 48 kWh)</p>
                          </>
                        )}
                        <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-2 rounded-md border border-emerald-100">
                          Gains mensuels estimés : {Math.round(monthlyRevenue).toLocaleString('fr-FR')} € / mois
                          <span className="font-normal text-emerald-500 ml-1">= {effectiveMargin.toFixed(2)} € × {rechargesPerMonth} recharges</span>
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-3 block text-slate-700">Recharges estimées / mois</Label>
                        <div className="flex items-center gap-4">
                          <Slider value={[rechargesPerMonth]} onValueChange={(val) => setRechargesPerMonth(val[0])} max={1000} step={5} className="flex-1 cursor-pointer" />
                          <CenteredInput type="number" value={rechargesPerMonth} onChange={(e) => { setRechargesPerMonth(Number(e.target.value)); setTargetTypology('personnalise'); }} className="w-24 bg-white border-slate-300" />
                        </div>
                      </div>
                    </div>

                    {/* Résultats & Graphique */}
                    <div className="lg:col-span-8 flex flex-col justify-between">
                      <div className="grid grid-cols-3 gap-5 mb-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Subvention Advenir</p>
                          <p className="text-3xl font-extrabold text-slate-800">{Math.round(subvention).toLocaleString('fr-FR')} €</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Reste à charge HT</p>
                          <p className="text-3xl font-extrabold text-slate-800">{Math.round(resteACharge).toLocaleString('fr-FR')} €</p>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center text-center">
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Point mort</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-extrabold text-emerald-600">{breakEvenDisplay}</p>
                            {breakEvenMonths > 0 && <p className="text-sm font-bold text-emerald-600">mois</p>}
                          </div>
                          {breakEvenMonths > 0 && <p className="text-xs font-semibold text-emerald-700 mt-1">({(breakEvenMonths / 12).toFixed(1)} ans)</p>}
                        </div>
                      </div>

                      <div className="h-80 w-full bg-[#1e293b] rounded-2xl p-5 shadow-xl border border-slate-800">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={irveChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#475569' }} />
                            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#475569' }} tickFormatter={(val) => `${val / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} formatter={(val) => [`${val.toLocaleString('fr-FR')} €`, 'Profit Cumulé']} labelFormatter={(l) => `Mois ${l}`} cursor={{ fill: '#334155', opacity: 0.4 }} />
                            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                            {irveRoiMonth && <ReferenceLine x={irveRoiMonth} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" label={{ position: 'top', value: 'ROI', fill: '#60a5fa', fontWeight: 'bold', fontSize: 13 }} />}
                            <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={40}>
                              {irveChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isPositive ? '#34d399' : '#60a5fa'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Gain financier brut estimé</h3>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Mensuel', value: monthlyRevenue },
                            { label: 'Annuel', value: monthlyRevenue * 12 },
                            { label: 'Sur 3 ans', value: monthlyRevenue * 36 },
                            { label: 'Sur 5 ans', value: monthlyRevenue * 60 },
                          ].map(item => (
                            <div key={item.label} className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">{item.label}</p>
                              <p className="text-lg font-bold text-emerald-700">{Math.round(item.value).toLocaleString('fr-FR')} €</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PAGE 3 PDF – Financement SunLib */}
            <div ref={page3Ref} className="space-y-8 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <Card className="border-t-4 border-t-indigo-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-xl font-bold text-slate-800">3. Simulation de Financement SunLib</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-8">
                        <div>
                          <Label className="text-sm font-semibold mb-3 block text-slate-700">Montant de l'installation (€)</Label>
                          <CenteredInput type="number" value={customFinanceAmount !== '' ? customFinanceAmount : Math.round(resteACharge)} onChange={(e) => setCustomFinanceAmount(e.target.value)} className="w-1/2 bg-white border-slate-300" />
                          <p className="text-xs text-slate-500 mt-2">Laissez vide pour utiliser le Reste à Charge calculé ci-dessus.</p>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <Label className="text-sm font-semibold text-slate-700">Durée de financement</Label>
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{financeYears} ans</span>
                          </div>
                          <Slider value={[financeYears]} onValueChange={(val) => setFinanceYears(val[0])} min={1} max={10} step={1} className="cursor-pointer" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-3 block text-slate-700">Apport du client (€)</Label>
                          <CenteredInput type="number" value={clientDeposit} onChange={(e) => setClientDeposit(Number(e.target.value))} className="w-1/2 bg-white border-slate-300" />
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-4">Informations sur la simulation</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Objectif du projet</span><span className="font-semibold">Infrastructures de Recharge (IRVE)</span></div>
                          <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Type de financement</span><span className="font-semibold">Location Longue Durée / Crédit-Bail</span></div>
                          <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Montant financé</span><span className="font-semibold">{Math.round(actualFinanced).toLocaleString('fr-FR')} €</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Durée</span><span className="font-semibold">{financeYears} ans</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-[#2D3748] rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl" />
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-lg">Mensualité</h4>
                            <span className="bg-white/20 text-xs px-2 py-1 rounded text-white font-medium">estimation</span>
                          </div>
                          <div className="text-4xl font-extrabold flex items-baseline gap-1 mb-4">
                            <span className="text-3xl font-medium opacity-80">~</span>
                            {Math.round(monthlyLease).toLocaleString('fr-FR')}
                            <span className="text-lg font-medium opacity-80">€ / mois</span>
                          </div>
                          <div className="border-t border-slate-600 pt-4">
                            <p className="font-bold text-sm">Soit {Math.round(monthlyLease * 12).toLocaleString('fr-FR')} € par an</p>
                            <p className="text-[10px] text-slate-400 mt-2">Ce loyer est indicatif. ±10% selon analyse financière.</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4">Inclus dans votre devis</h4>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> <span>Installation infrastructure de recharge</span></li>
                          <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> <span>Raccordement et conformité</span></li>
                          <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> <span>Mise en service</span></li>
                          <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" /> <span>Frais bancaires (SunLib)</span></li>
                          <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" /> <span>Accompagnement administratif</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="text-xs text-slate-400 text-center mt-8 pt-6 border-t border-slate-200">
                Document généré par ENR Courtage Énergie{selectedProject ? ` – ${selectedProject.name}` : ''}<br />
                Ces simulations sont données à titre indicatif et ne constituent pas une offre contractuelle.
              </div>
            </div>
          </div>
        )}

        {/* ════ CONTENU SOLAIRE ═══════════════════════════════════════════════ */}
        {projectType === 'solar' && (
          <div className="p-6 space-y-8 max-w-[95rem] mx-auto pb-20">

            {/* ── PAGE 1 PDF SOLAIRE – Puissance + Avantages ──────────────────── */}
            <div ref={solarPage1Ref} className="space-y-6 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-center mb-6 pb-6 border-b border-slate-200">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Étude de Rentabilité : Autoconsommation Solaire</h2>
                <p className="text-slate-500 mt-3 text-lg">Estimation du retour sur investissement d'une installation photovoltaïque</p>
                {selectedProject && <p className="text-amber-600 font-semibold mt-2">Client : {selectedProject.name}</p>}
              </div>

              {/* Puissance installée */}
              <Card className="border-t-4 border-t-amber-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-xl font-bold text-slate-800">Puissance installée</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-3 mb-6">
                    {SOLAR_POWERS.map(kwc => (
                      <button
                        key={kwc}
                        onClick={() => handleKwcChange(kwc)}
                        className={cn(
                          'px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2',
                          selectedKwc === kwc
                            ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                        )}
                      >
                        {kwc} kWc
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead className="font-semibold text-slate-700">Paramètre</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-center">Valeur</TableHead>
                          <TableHead className="font-semibold text-slate-700">Unité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">Puissance installée</TableCell>
                          <TableCell>
                            <CenteredInput type="number" value={selectedKwc} onChange={(e) => { const v = Number(e.target.value); setSelectedKwc(v); setSolarPricePerWc(getSolarPricePerWc(v)); }} className="w-32 border-slate-300 mx-auto" />
                          </TableCell>
                          <TableCell className="text-slate-500">kWc</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">Prix unitaire</TableCell>
                          <TableCell>
                            <CenteredInput type="number" step="0.001" value={solarPricePerWc.toFixed(4)} onChange={(e) => setSolarPricePerWc(Number(e.target.value))} className="w-32 border-slate-300 mx-auto" />
                          </TableCell>
                          <TableCell className="text-slate-500">€/Wc</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-amber-50 bg-amber-50/30">
                          <TableCell className="font-bold text-slate-800">Prix total HT</TableCell>
                          <TableCell className="text-center">
                            <span className="text-xl font-extrabold text-amber-700">{solarTotalPriceHT.toLocaleString('fr-FR')} €</span>
                          </TableCell>
                          <TableCell className="text-slate-500">HT</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">Production estimée</TableCell>
                          <TableCell>
                            <CenteredInput type="number" value={solarProductionFactor} onChange={(e) => setSolarProductionFactor(Number(e.target.value))} className="w-32 border-slate-300 mx-auto" />
                          </TableCell>
                          <TableCell className="text-slate-500">kWh/kWc/an</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">Prix de l'électricité</TableCell>
                          <TableCell>
                            <CenteredInput type="number" step="0.01" value={solarElecPrice} onChange={(e) => setSolarElecPrice(Number(e.target.value))} className="w-32 border-slate-300 mx-auto" />
                          </TableCell>
                          <TableCell className="text-slate-500">€/kWh</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">Taux d'autoconsommation</TableCell>
                          <TableCell>
                            <CenteredInput type="number" min="0" max="100" value={solarAutoconsoRate} onChange={(e) => setSolarAutoconsoRate(Number(e.target.value))} className="w-32 border-slate-300 mx-auto" />
                          </TableCell>
                          <TableCell className="text-slate-500">%</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">Inflation électricité</TableCell>
                          <TableCell>
                            <CenteredInput type="number" step="0.5" min="0" max="10" value={solarInflation} onChange={(e) => setSolarInflation(Number(e.target.value))} className="w-32 border-slate-300 mx-auto" />
                          </TableCell>
                          <TableCell className="text-slate-500">%/an</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Zones d'avantages */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-t-4 border-t-amber-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-500" />
                      Économies & Indépendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-3">
                    <p className="text-slate-700 text-sm">
                      <span className="font-bold text-amber-700">Réduction immédiate de la facture :</span> L'énergie autoconsommée remplace l'achat au réseau, dont le prix augmente en moyenne de 3 à 5 % par an.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-sm">
                      <li><span className="font-semibold">Retour sur investissement</span> en 7 à 12 ans selon la puissance et l'usage.</li>
                      <li><span className="font-semibold">Durée de vie</span> des panneaux : 25 à 30 ans de production garantie.</li>
                      <li><span className="font-semibold">Revente possible</span> du surplus au réseau (obligation d'achat EDF OA).</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-emerald-500" />
                      Impact Environnemental & RSE
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-3">
                    <p className="text-slate-700 text-sm">
                      <span className="font-bold text-emerald-700">Énergie 100 % renouvelable :</span> Chaque kWh autoproduit évite l'émission de CO₂ fossile et renforce l'engagement RSE de l'organisation.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-sm">
                      <li><span className="font-semibold">Réduction des émissions</span> de CO₂ : ~450 g évités par kWh solaire.</li>
                      <li><span className="font-semibold">Valorisation du patrimoine</span> immobilier et des actifs bâtimentaires.</li>
                      <li><span className="font-semibold">Conformité aux objectifs</span> RE2020 et politiques bas-carbone.</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      Attractivité & Valorisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-3">
                    <p className="text-slate-700 text-sm">
                      <span className="font-bold text-blue-700">Un atout différenciateur :</span> Produire sa propre énergie est un argument fort auprès des locataires, clients et partenaires financiers.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-sm">
                      <li><span className="font-semibold">Bailleur social :</span> Réduction des charges communes pour les locataires.</li>
                      <li><span className="font-semibold">Entreprise / tertiaire :</span> Maîtrise des coûts d'exploitation et compétitivité.</li>
                      <li><span className="font-semibold">Collectivité :</span> Exemplarité et économies sur les bâtiments publics.</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── Type de bailleur (UI uniquement, hors PDF) ───────────────────── */}
            <Card className="border-t-4 border-t-orange-400 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl font-bold text-slate-800">2. Type de bailleur / porteur de projet</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 mb-4">
                  {LANDLORD_TYPES.map(lt => (
                    <button
                      key={lt.id}
                      onClick={() => handleLandlordTypeChange(lt.id)}
                      className={cn(
                        'px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 border-2',
                        solarLandlordType === lt.id
                          ? 'bg-orange-500 border-orange-500 text-white shadow-md scale-105'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
                      )}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  Les valeurs de taux d'autoconsommation et de prix d'électricité sont pré-remplies selon le type de bailleur. Elles restent modifiables dans le tableau ci-dessus.
                </p>
              </CardContent>
            </Card>

            {/* ── PAGE 2 PDF SOLAIRE – Simulation Financière ───────────────────── */}
            <div ref={solarPage2Ref} className="space-y-6 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-center mb-4 pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Étude de Rentabilité : Autoconsommation Solaire</h2>
                {selectedProject && <p className="text-amber-600 font-semibold mt-1 text-sm">Client : {selectedProject.name}</p>}
              </div>

              <Card className="border-t-4 border-t-emerald-500 shadow-lg border-x-0 border-b-0 rounded-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-800">Simulation Financière</CardTitle>
                    <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                      <button
                        onClick={() => setSolarSunlibMode(false)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                          !solarSunlibMode ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                        )}
                      >
                        Achat direct
                      </button>
                      <button
                        onClick={() => setSolarSunlibMode(true)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                          solarSunlibMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                        )}
                      >
                        Abonnement SunLib
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                      <div className="space-y-3">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Production annuelle estimée</p>
                          <p className="text-2xl font-extrabold text-slate-800">{Math.round(solarAnnualProduction).toLocaleString('fr-FR')} <span className="text-sm font-medium text-slate-500">kWh/an</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Énergie autoconsommée</p>
                          <p className="text-2xl font-extrabold text-slate-800">{Math.round(solarAutoconsoKwh).toLocaleString('fr-FR')} <span className="text-sm font-medium text-slate-500">kWh/an</span></p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                          <p className="text-xs text-emerald-600 uppercase font-semibold mb-1">Économie annuelle brute</p>
                          <p className="text-2xl font-extrabold text-emerald-700">{Math.round(solarAnnualSavings).toLocaleString('fr-FR')} €/an</p>
                        </div>
                        {solarSunlibMode && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                            <p className="text-xs text-indigo-600 uppercase font-semibold mb-1">Loyer SunLib mensuel</p>
                            <p className="text-2xl font-extrabold text-indigo-700">~{Math.round(sunlibMonthlyLease).toLocaleString('fr-FR')} €/mois</p>
                            <div className="flex items-center gap-2 mt-3">
                              <Label className="text-xs text-indigo-600 font-semibold whitespace-nowrap">Durée</Label>
                              <CenteredInput type="number" min="5" max="20" value={solarSunlibYears} onChange={(e) => setSolarSunlibYears(Number(e.target.value))} className="w-20 border-indigo-200 bg-white text-indigo-700" />
                              <span className="text-xs text-indigo-500">ans</span>
                            </div>
                          </div>
                        )}
                        <div className={cn('rounded-xl p-4 border', solarNetMonthly >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
                          <p className={cn('text-xs uppercase font-semibold mb-1', solarNetMonthly >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {solarSunlibMode ? 'Gain net mensuel (après loyer)' : 'Économie mensuelle'}
                          </p>
                          <p className={cn('text-2xl font-extrabold', solarNetMonthly >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                            {solarNetMonthly >= 0 ? '+' : ''}{Math.round(solarNetMonthly).toLocaleString('fr-FR')} €/mois
                          </p>
                        </div>
                        {!solarSunlibMode && solarBreakEvenYears > 0 && (
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <p className="text-xs text-amber-600 uppercase font-semibold mb-1">Point mort estimé</p>
                            <p className="text-2xl font-extrabold text-amber-700">{solarBreakEvenYears.toFixed(1)} <span className="text-sm font-medium">ans</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-6">
                      <div className="h-80 w-full bg-[#1e293b] rounded-2xl p-5 shadow-xl border border-slate-800">
                        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase">Évolution de la rentabilité sur 25 ans</p>
                        <ResponsiveContainer width="100%" height="90%">
                          <BarChart data={solarChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#475569' }} label={{ value: 'Année', position: 'insideBottomRight', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#475569' }} tickFormatter={(val) => `${Math.round(val / 1000)}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} formatter={(val) => [`${val.toLocaleString('fr-FR')} €`, 'Gain cumulé']} labelFormatter={(l) => `Année ${l}`} cursor={{ fill: '#334155', opacity: 0.4 }} />
                            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                            {solarRoiYear && <ReferenceLine x={solarRoiYear} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" label={{ position: 'top', value: 'ROI', fill: '#fbbf24', fontWeight: 'bold', fontSize: 13 }} />}
                            <Bar dataKey="gain" radius={[4, 4, 0, 0]} maxBarSize={40}>
                              {solarChartData.map((entry, index) => (
                                <Cell key={`cell-solar-${index}`} fill={entry.isPositive ? '#34d399' : '#f59e0b'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4">
                          {solarSunlibMode ? 'Gain financier net estimé (après loyer SunLib)' : 'Économie financière estimée'}
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Mensuel', value: solarNetMonthly },
                            { label: 'Annuel', value: solarNetAnnual },
                            { label: 'Sur 10 ans', value: solarNetAnnual * 10 },
                            { label: 'Sur 20 ans', value: solarNetAnnual * 20 },
                          ].map(item => (
                            <div key={item.label} className={cn('text-center p-3 rounded-lg border', item.value >= 0 ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100')}>
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">{item.label}</p>
                              <p className={cn('text-lg font-bold', item.value >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {item.value >= 0 ? '+' : ''}{Math.round(item.value).toLocaleString('fr-FR')} €
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-slate-400 text-center mt-8 pt-6 border-t border-slate-200">
                Document généré par ENR Courtage Énergie{selectedProject ? ` – ${selectedProject.name}` : ''}<br />
                Ces simulations sont données à titre indicatif et ne constituent pas une offre contractuelle. Les économies dépendent de la consommation réelle et du prix de l'électricité.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
