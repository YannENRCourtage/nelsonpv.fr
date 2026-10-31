import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Battery,
  BatteryCharging,
  Sun,
  Zap,
  TrendingUp,
  FileDown,
  Building2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Landmark,
  Euro,
  Flame,
  Percent,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  STORAGE_CATALOG,
  LOAD_PROFILES,
  computeStorageProject,
  findOptimalBattery,
  readPrmCache,
  PRM_HANDOFF_KEY,
  fmtEur,
  fmtNum
} from '@/services/storageBatteryEngine';
import {
  generateClientCommercialPdf,
  generateBankDossierPdf
} from '@/services/storageProposalPdfService';
import { useToast } from '@/components/ui/use-toast';

export default function StorageBatterySimulator({ selectedProject, onSaveSimulation, onStateUpdate }) {
  const { toast } = useToast();

  // ── 1. Source des données : 'prm' (Enedis Data Connect) ou 'manual' ──
  const [sourceMode, setSourceMode] = useState('prm');
  const [prmList, setPrmList] = useState([]);
  const [selectedPrm, setSelectedPrm] = useState('50009371514981');
  const [clientName, setClientName] = useState('EARL DES TERRES VIEILLES');
  const [siteAddress, setSiteAddress] = useState('LIEU DIT TERRES VIEILLES, 24310 BRANTOME EN PERIGORD');

  // Données de consommation
  const [annualKwh, setAnnualKwh] = useState(211781);
  const [peakKw, setPeakKw] = useState(90.0);
  const [profileKey, setProfileKey] = useState('agricole');
  const [hpPrice, setHpPrice] = useState(0.20);
  const [hcPrice, setHcPrice] = useState(0.14);
  const [turpePrice, setTurpePrice] = useState(35);
  const [hourlyProfile, setHourlyProfile] = useState(null);

  // ── 2. Production Solaire Photovoltaïque sur Site ──
  const [solarEnabled, setSolarEnabled] = useState(false);
  const [solarIsNew, setSolarIsNew] = useState(false); // false = existant (CAPEX 0 €), true = nouveau projet
  const [solarKwc, setSolarKwc] = useState(100);
  const [solarSpecificYield, setSolarSpecificYield] = useState(1180);
  const [solarCapexHt, setSolarCapexHt] = useState(95000);
  const [solarSellPrice, setSolarSellPrice] = useState(0.04);

  // ── 3. Configuration de la Batterie BESS ──
  const [selectedModelId, setSelectedModelId] = useState('UNIV_ESS_261_AC');
  const [quantity, setQuantity] = useState(1);
  const [customHwPrice, setCustomHwPrice] = useState(null);
  const [customInstallPrice, setCustomInstallPrice] = useState(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [customOpex, setCustomOpex] = useState(null);
  const [indexationPct, setIndexationPct] = useState(4);

  // ── 4. Mode de Raccordement Réseau Enedis ──
  const [gridConnection, setGridConnection] = useState(false);
  const [gridDistanceM, setGridDistanceM] = useState(25);

  // ── 5. Paramètres de Financement Bancaire ──
  const [loanRatePct, setLoanRatePct] = useState(4.2);
  const [loanYears, setLoanYears] = useState(10);
  const [equityPct, setEquityPct] = useState(20);

  // Filtre d'affichage du catalogue
  const [catalogFilter, setCatalogFilter] = useState('ALL');

  // Modèle actuel
  const currentModel = useMemo(() => {
    return STORAGE_CATALOG.find(m => m.id === selectedModelId) || STORAGE_CATALOG[10];
  }, [selectedModelId]);

  // Initialisation et chargement des PRM Enedis (via API ou cache local)
  const refreshPrmList = useCallback(async () => {
    const fallbackList = [
      {
        prm: '50009371514981',
        name: 'EARL DES TERRES VIEILLES',
        address: 'LIEU DIT TERRES VIEILLES, 24310 BRANTOME EN PERIGORD',
        annualKwh: 211781,
        peakKw: 90.0,
        profile: 'agricole'
      },
      {
        prm: '30002220753998',
        name: 'YANN BARBERIS',
        address: '12 Avenue de l’Énergie, 33127 Saint-Jean-d’Illac',
        annualKwh: 6017,
        peakKw: 6.16,
        profile: 'residentiel'
      },
      {
        prm: '16138350177475',
        name: 'CLIENT COMMERCE',
        address: 'Centre Commercial, 33000 Bordeaux',
        annualKwh: 6472,
        peakKw: 9.0,
        profile: 'tertiaire'
      },
      {
        prm: '16190882589306',
        name: 'ATELIER ARTISANAL',
        address: 'Zone Artisanale, 24000 Périgueux',
        annualKwh: 3307,
        peakKw: 12.0,
        profile: 'industriel'
      }
    ];

    try {
      const res = await fetch('/api/enedis/fetch?action=list_consents');
      if (res.ok) {
        const json = await res.json();
        const apiConsents = json.consents || [];
        const merged = [...fallbackList];
        apiConsents.forEach(c => {
          if (!merged.some(m => m.prm === c.prm)) {
            merged.push({
              prm: c.prm,
              name: c.titulaire || c.clientName || 'Client Enedis',
              address: c.adresse || 'France',
              annualKwh: Number(c.annualConsumption) || 5850,
              peakKw: Number(c.peakKw) || 9.0,
              profile: 'agricole'
            });
          }
        });
        setPrmList(merged);
        return;
      }
    } catch (_) {}

    // En cas d'échec API, lire le cache local
    const localCache = readPrmCache();
    const localEntries = Object.values(localCache).map(c => ({
      prm: c.prm,
      name: c.titulaire || c.name || 'Client PRM',
      address: c.adresse || c.address || 'France',
      annualKwh: Number(c.annualConsumption || c.annualKwh) || 5850,
      peakKw: Number(c.peakKw) || 9.0,
      profile: 'agricole',
      hourlyProfile: c.hourlyProfile || null
    }));
    const combined = [...fallbackList];
    localEntries.forEach(e => {
      if (!combined.some(c => c.prm === e.prm)) combined.push(e);
    });
    setPrmList(combined);
  }, []);

  useEffect(() => {
    refreshPrmList();
  }, [refreshPrmList]);

  // Écoute de la passerelle Enedis (via localStorage ou URL)
  useEffect(() => {
    try {
      const handoffRaw = localStorage.getItem(PRM_HANDOFF_KEY);
      if (handoffRaw) {
        const h = JSON.parse(handoffRaw);
        if (h && h.prm) {
          setSelectedPrm(h.prm);
          if (h.titulaire || h.clientName) setClientName(h.titulaire || h.clientName);
          if (h.adresse) setSiteAddress(h.adresse);
          if (h.annualKwh) setAnnualKwh(Number(h.annualKwh));
          if (h.peakKw) setPeakKw(Number(h.peakKw));
          if (h.hourlyProfile) setHourlyProfile(h.hourlyProfile);
          setSourceMode('prm');
          localStorage.removeItem(PRM_HANDOFF_KEY);
          toast({
            title: 'Données Enedis pré-chargées ✓',
            description: `PRM ${h.prm} connecté avec succès.`
          });
        }
      }
    } catch (_) {}
  }, [toast]);

  // Mise à jour lors du changement de PRM dans la liste
  const handleSelectPrm = (prmVal) => {
    setSelectedPrm(prmVal);
    const item = prmList.find(p => p.prm === prmVal);
    if (item) {
      setClientName(item.name || 'Client Professionnel');
      setSiteAddress(item.address || 'France');
      setAnnualKwh(item.annualKwh || 50000);
      setPeakKw(item.peakKw || 30.0);
      setProfileKey(item.profile || 'agricole');
      if (item.hourlyProfile) setHourlyProfile(item.hourlyProfile);
      else setHourlyProfile(null);
    }
  };

  // Moteur de calcul complet
  const sim = useMemo(() => {
    return computeStorageProject({
      annualKwh,
      peakKw,
      profileKey,
      hourlyProfileKw: sourceMode === 'prm' ? hourlyProfile : null,
      hpPrice,
      hcPrice,
      turpePowerPrice: turpePrice,
      solar: {
        enabled: solarEnabled,
        isNew: solarIsNew,
        kwc: Number(solarKwc) || 0,
        specificYield: Number(solarSpecificYield) || 1180,
        capexHt: Number(solarCapexHt) || 0,
        sellPrice: Number(solarSellPrice) || 0.04
      },
      model: currentModel,
      quantity,
      hardwarePriceHt: customHwPrice !== null ? customHwPrice : undefined,
      installPriceHt: customInstallPrice !== null ? customInstallPrice : undefined,
      discountPct,
      opexAnnualHt: customOpex !== null ? customOpex : undefined,
      indexationPct,
      gridConnection,
      gridDistanceM,
      gridRevenuePerKw: 80,
      finance: {
        ratePct: Number(loanRatePct) || 4.2,
        years: Number(loanYears) || 10,
        equityPct: Number(equityPct) || 20
      },
      horizon: 20
    });
  }, [
    annualKwh,
    peakKw,
    profileKey,
    hourlyProfile,
    sourceMode,
    hpPrice,
    hcPrice,
    turpePrice,
    solarEnabled,
    solarIsNew,
    solarKwc,
    solarSpecificYield,
    solarCapexHt,
    solarSellPrice,
    currentModel,
    quantity,
    customHwPrice,
    customInstallPrice,
    discountPct,
    customOpex,
    indexationPct,
    gridConnection,
    gridDistanceM,
    loanRatePct,
    loanYears,
    equityPct
  ]);

  // Transmettre l'état de simulation au parent (pour sauvegarder / exporter)
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'stockage',
        solution: 'stockage',
        clientName,
        prm: selectedPrm,
        sim,
        totalCapex: sim.capex.totalCapex,
        payback: sim.kpis.payback,
        tri: sim.kpis.triProject,
        annualSavings: sim.gains.batterySavings + sim.gains.solarSavings + sim.gains.gridRevenue
      });
    }
  }, [sim, clientName, selectedPrm, onStateUpdate]);

  // Action : Dimensionnement optimal automatique
  const handleAutoDimension = () => {
    const opt = findOptimalBattery({
      annualKwh,
      peakKw,
      profileKey,
      hpPrice,
      hcPrice,
      solar: {
        enabled: solarEnabled,
        kwc: solarKwc,
        specificYield: solarSpecificYield
      },
      gridConnection
    });
    setSelectedModelId(opt.model.id);
    setQuantity(opt.quantity);
    setCustomHwPrice(null);
    setCustomInstallPrice(null);
    toast({
      title: 'Dimensionnement optimal appliqué ✨',
      description: `${opt.quantity}× ${opt.model.name} (${(opt.model.capacityKwh * opt.quantity).toFixed(1)} kWh)`
    });
  };

  // Export PDF Commercial
  const [isExportingCommercial, setIsExportingCommercial] = useState(false);
  const handleExportCommercialPdf = () => {
    setIsExportingCommercial(true);
    try {
      generateClientCommercialPdf({
        sim,
        projectInfo: { clientName, prm: selectedPrm, address: siteAddress }
      });
      toast({
        title: 'Étude Commerciale téléchargée ✓',
        description: 'Le PDF client de proposition de stockage a été généré.'
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur export PDF', description: e.message, variant: 'destructive' });
    } finally {
      setTimeout(() => setIsExportingCommercial(false), 500);
    }
  };

  // Export PDF Bancaire
  const [isExportingBank, setIsExportingBank] = useState(false);
  const handleExportBankPdf = () => {
    setIsExportingBank(true);
    try {
      generateBankDossierPdf({
        sim,
        projectInfo: { clientName, prm: selectedPrm, address: siteAddress }
      });
      toast({
        title: 'Dossier Bancaire téléchargé ✓',
        description: 'Le dossier complet de financement sur 4 pages est prêt pour la banque.'
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur export bancaire', description: e.message, variant: 'destructive' });
    } finally {
      setTimeout(() => setIsExportingBank(false), 500);
    }
  };

  // Modèles filtrés pour le catalogue
  const filteredModels = useMemo(() => {
    if (catalogFilter === 'ALL') return STORAGE_CATALOG;
    return STORAGE_CATALOG.filter(m => m.family === catalogFilter);
  }, [catalogFilter]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto pb-12">
      {/* ── BANDEAU TITRE & BOUTONS D'EXPORT PDF MAJEURS ── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <BatteryCharging className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                Nelson BESS Engine v5
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Derrière le compteur &amp; Raccordé Réseau
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Simulateur Stockage Batterie &amp; Couplage Solaire
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Étude technico-économique, autoconsommation solaire, écrêtage TURPE et modélisation bancaire DSCR
            </p>
          </div>
        </div>

        {/* Double Export PDF */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportCommercialPdf}
            disabled={isExportingCommercial}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-slate-950" />
            <span>{isExportingCommercial ? 'Génération...' : '📄 PDF Étude Commerciale Client'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportBankPdf}
            disabled={isExportingBank}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Landmark className="w-4 h-4 text-amber-300" />
            <span>{isExportingBank ? 'Génération...' : '🏦 PDF Dossier Bancaire (Financement)'}</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 1 : SOURCE DES DONNÉES (MODE A : PRM ENEDIS vs MODE B : MANUEL) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">1</span>
            <h3 className="text-sm font-black text-slate-900">Source des données de consommation du site</h3>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSourceMode('prm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${sourceMode === 'prm' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mode A : Importer PRM Enedis Data Connect
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('manual')}
              className={`px-3 py-1.5 rounded-lg transition-all ${sourceMode === 'manual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mode B : Profil Manuel (Sans PRM)
            </button>
          </div>
        </div>

        {sourceMode === 'prm' ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Sélectionner un PRM déjà autorisé dans Nelson :</label>
              <select
                value={selectedPrm}
                onChange={e => handleSelectPrm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 shadow-inner"
              >
                {prmList.map(p => (
                  <option key={p.prm} value={p.prm}>
                    PRM {p.prm} — {p.name} ({fmtNum(p.annualKwh)} kWh/an — Pic {p.peakKw} kW)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 italic">
                📍 {siteAddress} · Titulaire : <strong className="text-slate-700">{clientName}</strong>
              </p>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wide block">Données Enedis injectées</span>
                <div className="text-base font-black text-blue-950 mt-0.5">
                  {fmtNum(annualKwh)} kWh/an
                </div>
                <div className="text-xs font-semibold text-blue-800">
                  Moyenne {fmtNum(annualKwh / 365, 1)} kWh/j · Pointe max {peakKw.toFixed(1)} kW
                </div>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Courbe horaire active
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Consommation annuelle</label>
              <div className="relative">
                <input
                  type="number"
                  value={annualKwh}
                  onChange={e => setAnnualKwh(Math.max(1000, Number(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-9 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">kWh/an</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Pointe max mesurée</label>
              <div className="relative">
                <input
                  type="number"
                  value={peakKw}
                  onChange={e => setPeakKw(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-7 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">kW</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Profil d'activité</label>
              <select
                value={profileKey}
                onChange={e => setProfileKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {Object.entries(LOAD_PROFILES).map(([k, p]) => (
                  <option key={k} value={k}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tarif Heures Pleines</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={hpPrice}
                  onChange={e => setHpPrice(Number(e.target.value) || 0.2)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-11 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">€/kWh</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tarif Heures Creuses</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={hcPrice}
                  onChange={e => setHcPrice(Number(e.target.value) || 0.14)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-11 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">€/kWh</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">TURPE Puissance</label>
              <div className="relative">
                <input
                  type="number"
                  value={turpePrice}
                  onChange={e => setTurpePrice(Number(e.target.value) || 35)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-12 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">€/kW/an</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 2 : COUPLAGE SOLAIRE PHOTOVOLTAÏQUE SUR SITE ── */}
      <div className={`rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${solarEnabled ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">2</span>
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Production Solaire Photovoltaïque sur Site
              </h3>
              <p className="text-xs text-slate-500">Recharge gratuite prioritaire de la batterie sur surplus solaire</p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-700">Inclure du solaire photovoltaïque</span>
            <input
              type="checkbox"
              checked={solarEnabled}
              onChange={e => setSolarEnabled(e.target.checked)}
              className="w-5 h-5 rounded-md text-amber-500 focus:ring-amber-400 border-slate-300 cursor-pointer"
            />
          </label>
        </div>

        {solarEnabled && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Statut de la centrale solaire</label>
              <select
                value={solarIsNew ? 'new' : 'existing'}
                onChange={e => setSolarIsNew(e.target.value === 'new')}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="existing">Centrale existante (CAPEX PV = 0 €)</option>
                <option value="new">Nouvelle centrale à installer</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Puissance Crête Solaire</label>
              <div className="relative">
                <input
                  type="number"
                  value={solarKwc}
                  onChange={e => {
                    const kwc = Math.max(1, Number(e.target.value) || 0);
                    setSolarKwc(kwc);
                    if (solarIsNew) setSolarCapexHt(Math.round(kwc * 950));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-9 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">kWc</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Productible spécifique</label>
              <div className="relative">
                <input
                  type="number"
                  value={solarSpecificYield}
                  onChange={e => setSolarSpecificYield(Number(e.target.value) || 1180)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-16 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">kWh/kWc/an</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {solarIsNew ? 'Coût d’investissement PV (CAPEX HT)' : 'Valorisation surplus injecté'}
              </label>
              {solarIsNew ? (
                <div className="relative">
                  <input
                    type="number"
                    value={solarCapexHt}
                    onChange={e => setSolarCapexHt(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-8 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">€ HT</span>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={solarSellPrice}
                    onChange={e => setSolarSellPrice(Number(e.target.value) || 0.04)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-12 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">€/kWh</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 3 : PROPOSITION & DIMENSIONNEMENT DE LA BATTERIE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">3</span>
            <div>
              <h3 className="text-sm font-black text-slate-900">Dimensionnement du Système de Stockage BESS</h3>
              <p className="text-xs text-slate-500">Catalogue complet SAFRA / UNIV Storage (gammes LV, HV, C&amp;I et Conteneurs)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoDimension}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Recommandation Optimale Automatique
          </button>
        </div>

        {/* Filtres de gamme */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 text-xs font-bold">
          <span className="text-slate-400 mr-1">Gammes :</span>
          {[
            { id: 'ALL', label: 'Toutes les gammes' },
            { id: 'LV', label: 'Basse Tension (UNIV LV)' },
            { id: 'HV', label: 'Haute Tension (UNIV HV)' },
            { id: 'CI', label: 'Industrielle & Tertiaire C&I' },
            { id: 'CONTAINER', label: 'Conteneurs Forte Capacité' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCatalogFilter(f.id)}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                catalogFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cartes du catalogue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 max-h-80 overflow-y-auto pr-1">
          {filteredModels.map(m => {
            const isSelected = m.id === selectedModelId;
            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedModelId(m.id);
                  setCustomHwPrice(null);
                  setCustomInstallPrice(null);
                }}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                      {m.familyLabel}
                    </span>
                    {m.isFlagship && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        ⭐ Recommandé
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-slate-900 mt-1">{m.name}</h4>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-1">
                    <span>{m.capacityKwh} kWh</span>
                    <span>•</span>
                    <span>{m.powerKw} kW</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Clé en main posé</span>
                    <span className="text-xs font-black text-slate-900">
                      {fmtEur(m.turnkeyInstalledPriceHT)} HT
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {isSelected ? 'Sélectionné' : 'Choisir'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quantité & Paramètres tarifaires personnalisables */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombre d'unités</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 4].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    quantity === q
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {q}×
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Prix matériel unitaire</label>
            <div className="relative">
              <input
                type="number"
                value={customHwPrice !== null ? customHwPrice : currentModel.sellingHardwarePriceHT}
                onChange={e => setCustomHwPrice(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-8 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">€ HT</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Forfait pose unitaire</label>
            <div className="relative">
              <input
                type="number"
                value={customInstallPrice !== null ? customInstallPrice : Math.max(0, currentModel.turnkeyInstalledPriceHT - currentModel.sellingHardwarePriceHT)}
                onChange={e => setCustomInstallPrice(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-8 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">€ HT</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Remise commerciale</label>
            <div className="relative">
              <input
                type="number"
                value={discountPct}
                onChange={e => setDiscountPct(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-7 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">OPEX annuel (Maintenance)</label>
            <div className="relative">
              <input
                type="number"
                value={customOpex !== null ? customOpex : sim.opex}
                onChange={e => setCustomOpex(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-8 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">€/an</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Inflation électricité</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={indexationPct}
                onChange={e => setIndexationPct(Number(e.target.value) || 4)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 pr-8 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-bold">%/an</span>
            </div>
          </div>
        </div>

        {/* Option Raccordement Réseau Enedis */}
        <div className={`mt-4 p-3.5 rounded-xl border transition-all ${gridConnection ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={gridConnection}
                onChange={e => setGridConnection(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-black text-slate-900">
                Raccorder la batterie au réseau Enedis (Valorisation Marché : Réserve FCR / aFRR / Capacité)
              </span>
            </label>

            {gridConnection && (
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-slate-600">Distance poste :</span>
                <input
                  type="number"
                  value={gridDistanceM}
                  onChange={e => setGridDistanceM(Math.max(5, Number(e.target.value) || 25))}
                  className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center font-bold"
                />
                <span className="text-slate-500">m</span>
              </div>
            )}
          </div>

          {gridConnection && sim.grid && (
            <div className="mt-2.5 pt-2.5 border-t border-indigo-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {sim.grid.label} · Coût raccordement : <strong>{fmtEur(sim.grid.costHt)} HT</strong>
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Revenus réseau estimés : +{fmtEur(sim.gains.gridRevenue)} HT/an
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4 : RÉSULTATS ÉNERGÉTIQUES & GRAPHIQUE 24H AVANT/APRÈS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Profil Journalier de Charge 24h &amp; Écrêtage de Pointe
            </h3>
            <p className="text-xs text-slate-500">
              Courbe de charge du site, production solaire, recharge gratuite sur surplus et décharge en Heures Pleines
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span>Pointe avant : <strong className="text-slate-900">{sim.energy.peakKw.toFixed(1)} kW</strong></span>
            <span>→</span>
            <span>Pointe après : <strong className="text-emerald-700">{sim.energy.newPeakKw.toFixed(1)} kW</strong> (-{sim.energy.shaveKw.toFixed(1)} kW)</span>
          </div>
        </div>

        {/* 4 Jauges d'autonomie et d'autoconsommation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block uppercase">Autonomie Site Seul</span>
            <span className="text-lg font-black text-slate-700">0 %</span>
            <span className="text-[10px] text-slate-400 block">100% dépendance réseau</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
            <span className="text-[10px] font-bold text-amber-800 block uppercase">Avec Solaire Seul</span>
            <span className="text-lg font-black text-amber-900">
              {Math.round(sim.energy.rates.autonomyPv * 100)} %
            </span>
            <span className="text-[10px] text-amber-700 block">Autoconsommation : {Math.round(sim.energy.rates.autoconsoPv * 100)} %</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 block uppercase">Avec Solaire + Batterie</span>
            <span className="text-lg font-black text-emerald-900">
              {Math.round(sim.energy.rates.autonomyPvBat * 100)} %
            </span>
            <span className="text-[10px] text-emerald-700 block font-bold">Autoconsommation : {Math.round(sim.energy.rates.autoconsoPvBat * 100)} %</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 block uppercase">Surplus Solaire Stocké</span>
            <span className="text-lg font-black text-blue-900">
              {fmtNum(sim.energy.totals.batFromPv)} kWh
            </span>
            <span className="text-[10px] text-blue-700 block">Énergie gratuite / an</span>
          </div>
        </div>

        {/* Graphique Recharts */}
        <div className="h-64 sm:h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sim.energy.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {/* Solaire */}
              {solarEnabled && (
                <Area type="monotone" dataKey="solaire" name="Production Solaire (kW)" fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
              )}
              {/* Charge batterie */}
              <Area type="monotone" dataKey="stockage" name="Recharge Batterie (kW)" fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} />
              {/* Consommation site */}
              <Line type="monotone" dataKey="conso" name="Consommation Site (kW)" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              {/* Soutirage réseau après batterie */}
              <Line type="monotone" dataKey="reseauApres" name="Soutirage Réseau après BESS (kW)" stroke="#0284c7" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 5 : BUSINESS PLAN SUR 20 ANS & PARAMÈTRES BANCAIRES ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              Modélisation Financière &amp; Bancabilité (DSCR / TRI / VAN)
            </h3>
            <p className="text-xs text-slate-500">Plan de financement sur 20 ans et couverture du service de la dette</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Dette :</span>
            <input
              type="number"
              value={loanYears}
              onChange={e => setLoanYears(Math.max(1, Number(e.target.value) || 10))}
              className="w-12 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-bold"
            />
            <span className="text-slate-500">ans à</span>
            <input
              type="number"
              step="0.1"
              value={loanRatePct}
              onChange={e => setLoanRatePct(Number(e.target.value) || 4.2)}
              className="w-14 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-bold"
            />
            <span className="text-slate-500">% · Apport</span>
            <input
              type="number"
              value={equityPct}
              onChange={e => setEquityPct(Math.min(100, Math.max(0, Number(e.target.value) || 20)))}
              className="w-14 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-bold"
            />
            <span className="text-slate-500">%</span>
          </div>
        </div>

        {/* 6 Indicateurs financiers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block uppercase">CAPEX Total Projet</span>
            <span className="text-base font-black text-slate-900">{fmtEur(sim.capex.totalCapex)}</span>
            <span className="text-[10px] text-slate-500 block">Dette : {fmtEur(sim.financing.debt)}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 block uppercase">Gains Net Année 1</span>
            <span className="text-base font-black text-emerald-900">
              +{fmtEur(sim.gains.totalYear1 - sim.opex)}
            </span>
            <span className="text-[10px] text-emerald-700 block">EBITDA initial</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 block uppercase">Annuité Emprunt</span>
            <span className="text-base font-black text-blue-900">
              -{fmtEur(sim.financing.annuity)}
            </span>
            <span className="text-[10px] text-blue-700 block">par an ({sim.financing.years} ans)</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <span className="text-[10px] font-bold text-indigo-800 block uppercase">DSCR Moyen</span>
            <span className="text-base font-black text-indigo-900">
              {sim.financing.dscrAvg ? `${sim.financing.dscrAvg}x` : '—'}
            </span>
            <span className="text-[10px] text-indigo-700 block">Min : {sim.financing.dscrMin ? `${sim.financing.dscrMin}x` : '—'} (> 1.20x)</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
            <span className="text-[10px] font-bold text-purple-800 block uppercase">TRI Projet / FP</span>
            <span className="text-base font-black text-purple-900">
              {sim.kpis.triProject !== null ? `${sim.kpis.triProject} %` : '—'}
            </span>
            <span className="text-[10px] text-purple-700 block">TRI FP : {sim.kpis.triEquity !== null ? `${sim.kpis.triEquity} %` : '—'}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 block uppercase">Trésorerie 20 ans</span>
            <span className="text-base font-black text-amber-900">
              +{fmtEur(sim.kpis.gain20)}
            </span>
            <span className="text-[10px] text-amber-700 block">VAN (5%) : +{fmtEur(sim.kpis.van)}</span>
          </div>
        </div>

        {/* Tableau compact des 10 premières années */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-900 text-white font-bold text-[10.5px]">
              <tr>
                <th className="py-2 px-3">Année</th>
                <th className="py-2 px-3 text-right">Économies Facture</th>
                <th className="py-2 px-3 text-right">Revenus Réseau</th>
                <th className="py-2 px-3 text-right">OPEX</th>
                <th className="py-2 px-3 text-right">EBITDA</th>
                <th className="py-2 px-3 text-right">Annuité Crédit</th>
                <th className="py-2 px-3 text-right font-black">Cash-Flow Net</th>
                <th className="py-2 px-3 text-center">DSCR</th>
                <th className="py-2 px-3 text-right">Trésorerie Cumulée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {sim.years.slice(0, 10).map(yr => (
                <tr key={yr.year} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 font-bold">Année {yr.year}</td>
                  <td className="py-1.5 px-3 text-right text-emerald-700">+{fmtEur(yr.batterySavings + yr.solarSavings)}</td>
                  <td className="py-1.5 px-3 text-right text-blue-700">{yr.gridRevenue > 0 ? `+${fmtEur(yr.gridRevenue)}` : '0 €'}</td>
                  <td className="py-1.5 px-3 text-right text-rose-600">-{fmtEur(yr.opex)}</td>
                  <td className="py-1.5 px-3 text-right font-bold">+{fmtEur(yr.ebitda)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-500">{yr.debtService > 0 ? `-${fmtEur(yr.debtService)}` : '0 €'}</td>
                  <td className="py-1.5 px-3 text-right font-black text-emerald-800">+{fmtEur(yr.cfAfterDebt)}</td>
                  <td className="py-1.5 px-3 text-center font-bold text-indigo-700">{yr.dscr ? `${yr.dscr.toFixed(2)}x` : '—'}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-900">{fmtEur(yr.cumProject)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
