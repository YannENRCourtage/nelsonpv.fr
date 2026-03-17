import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { apiService } from '@/services/api.js';
import { toast } from '@/components/ui/use-toast.js';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import {
  BarChart3, FileText, Calculator, TrendingUp, Users, Building,
  FileDown, Save, ChevronDown, Search, X, CheckCircle, AlertCircle,
  AlertTriangle, RefreshCw, Plus, Trash2
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'suivi', label: 'SUIVI', icon: Users },
  { id: 'suivi_bat', label: 'SUIVI BAT TYPE', icon: Building },
  { id: 'calcul', label: 'CALCUL', icon: Calculator },
  { id: 'bp_projets', label: 'BUSINESS PLAN PROJETS', icon: TrendingUp },
  { id: 'prop_bac', label: 'PROPOSITION CLIENT BAC', icon: FileText },
  { id: 'prop_be', label: 'PROPOSITION CLIENT BE', icon: FileText },
  { id: 'devis', label: 'DEVIS', icon: FileDown },
  { id: 'data', label: 'DATA', icon: BarChart3 },
];

const SUIVI_BAT_DATA = [
  { type:'TYPE 1 MINI', spv:'ACAMA SPV1', kwc:100, cout_bat:62000, massifs:10, longueur:30, largeur:12.4, travees:5, hSud:2.5, hNord:4.5, faitage:4.5, surfSud:195, surfNord:0, surfTot:195, penteSud:10, penteNord:0, modH:6, modL:6, totalMod:216, puissMax:99.36, prodSud:1050 },
  { type:'TYPE 1 MID', spv:'ACAMA SPV1', kwc:140, cout_bat:72000, massifs:12, longueur:42, largeur:12.4, travees:7, hSud:2.5, hNord:4.5, faitage:4.5, surfSud:273, surfNord:0, surfTot:273, penteSud:10, penteNord:0, modH:6, modL:9, totalMod:294, puissMax:135.24, prodSud:1050 },
  { type:'TYPE 1 MAXI', spv:'ACAMA SPV1', kwc:200, cout_bat:89000, massifs:16, longueur:60, largeur:12.4, travees:10, hSud:2.5, hNord:4.5, faitage:4.5, surfSud:390, surfNord:0, surfTot:390, penteSud:10, penteNord:0, modH:6, modL:12, totalMod:420, puissMax:193.2, prodSud:1050 },
  { type:'TYPE 2 MINI', spv:'ACAMA SPV1', kwc:200, cout_bat:98000, massifs:14, longueur:42, largeur:19.3, travees:7, hSud:2.5, hNord:5.5, faitage:5.5, surfSud:252, surfNord:252, surfTot:504, penteSud:10, penteNord:10, modH:6, modL:7, totalMod:434, puissMax:199.64, prodSud:1050, prodNord:900 },
  { type:'TYPE 9 MID', spv:'ACAMA SPV1', kwc:350, cout_bat:174000, massifs:24, longueur:60+7.5, largeur:29.8, travees:10, hSud:3.5, hNord:6, faitage:6, surfSud:450, surfNord:300, surfTot:750, penteSud:11, penteNord:8, modH:10, modL:15, totalMod:754, puissMax:346.84, prodSud:1123, prodNord:980 },
  { type:'TYPE 9 MAXI', spv:'ACAMA SPV1', kwc:500, cout_bat:220000, massifs:30, longueur:90, largeur:29.8, travees:15, hSud:3.5, hNord:6, faitage:6, surfSud:675, surfNord:450, surfTot:1125, penteSud:11, penteNord:8, modH:10, modL:20, totalMod:1080, puissMax:496.8, prodSud:1123, prodNord:980 },
];

const BE_TABLES = {
  presence_bac: [
    { capacite:'100-150 KWc', p1000:{loyer:931,soulte:8342}, p1050:{loyer:1447,soulte:18645}, p1100:{loyer:1947,soulte:null}, p1150:{loyer:2447,soulte:25428}, p1200:{loyer:3010,soulte:30103}, p1250:{loyer:null,soulte:null}, p1300:{loyer:null,soulte:null} },
    { capacite:'150-200 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:18645}, p1100:{loyer:null,soulte:null}, p1150:{loyer:null,soulte:25428}, p1200:{loyer:3010,soulte:30103}, p1250:{loyer:3777,soulte:37770}, p1300:{loyer:null,soulte:null} },
    { capacite:'200-250 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:18888}, p1100:{loyer:2542,soulte:30504}, p1150:{loyer:3010,soulte:36126}, p1200:{loyer:4143,soulte:49716}, p1250:{loyer:4992,soulte:59904}, p1300:{loyer:null,soulte:null} },
    { capacite:'250-300 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:3448,soulte:41376}, p1150:{loyer:4082,soulte:48984}, p1200:{loyer:5378,soulte:64536}, p1250:{loyer:6186,soulte:74232}, p1300:{loyer:null,soulte:null} },
    { capacite:'300-350 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:3777,soulte:45324}, p1150:{loyer:4444,soulte:53328}, p1200:{loyer:6123,soulte:73476}, p1250:{loyer:7051,soulte:84612}, p1300:{loyer:7995,soulte:95940} },
    { capacite:'350-400 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:4143,soulte:49716}, p1150:{loyer:4992,soulte:59904}, p1200:{loyer:6768,soulte:81216}, p1250:{loyer:7914,soulte:94968}, p1300:{loyer:8853,soulte:106236} },
    { capacite:'400-450 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:4133,soulte:49596}, p1150:{loyer:5333,soulte:63996}, p1200:{loyer:7281,soulte:87372}, p1250:{loyer:8442,soulte:101304}, p1300:{loyer:9405,soulte:112860} },
    { capacite:'450-500 KWc', p1000:{loyer:null,soulte:null}, p1050:{loyer:null,soulte:null}, p1100:{loyer:null,soulte:null}, p1150:{loyer:5831,soulte:69972}, p1200:{loyer:7995,soulte:95940}, p1250:{loyer:9225,soulte:110700}, p1300:{loyer:10074,soulte:120888} },
  ]
};

// ─── DSCR Calculation Engine ─────────────────────────────────────────────────

function computeBusinessPlan(params) {
  const {
    kwc = 346.84,
    productible = 1123.08,
    tarifBas = 0.0846,
    tarifHaut = 0.04,
    seuilKwhKwc = 1100,
    maintenance = 1734.20,
    locationCompteur = 660,
    assurance = 867.10,
    taxesLocales = 0,
    gestionAdmin = 0,
    totalInvestissement = 435655.12,
    apport = 0,
    dureeEmprunt = 20,
    tauxCredit = 4,
    indexationTarif = 0.006,
    indexationOpex = 0.02,
    degradation = 0.004,
  } = params;

  const emprunt = Math.max(0, totalInvestissement - apport);
  const tauxMensuel = tauxCredit / 100 / 12;
  const nMois = dureeEmprunt * 12;
  const mensualite = emprunt > 0 && tauxMensuel > 0
    ? emprunt * (tauxMensuel * Math.pow(1 + tauxMensuel, nMois)) / (Math.pow(1 + tauxMensuel, nMois) - 1)
    : emprunt / nMois;
  const annuite = mensualite * 12;

  const prodTotale = kwc * productible;
  const prodBas = Math.min(prodTotale, kwc * seuilKwhKwc);
  const prodHaut = Math.max(0, prodTotale - prodBas);

  const rows = [];
  let dscrs = [];

  for (let i = 0; i < 20; i++) {
    const deg = Math.pow(1 - degradation, i);
    const idxT = Math.pow(1 + indexationTarif, i);
    const idxO = Math.pow(1 + indexationOpex, i);

    const pb = prodBas * deg;
    const ph = prodHaut * deg;
    const ca = pb * tarifBas * idxT + ph * tarifHaut * idxT;

    const maint = maintenance * idxO;
    const loc = locationCompteur * idxO;
    const ass = assurance * idxO;
    const taxes = taxesLocales * idxO;
    const admin = gestionAdmin * idxO;
    const totalOpex = maint + loc + ass + taxes + admin;
    const annuiteYear = i < dureeEmprunt ? annuite : 0;
    const totalCharges = totalOpex + annuiteYear;
    const dscr = totalCharges > 0 ? ca / totalCharges : 0;

    dscrs.push(dscr);
    rows.push({ year: 2026 + i, kwcDeg: kwc * deg, prod: (pb + ph), prodBas: pb, prodHaut: ph, ca, maint, loc, ass, taxes, admin, annuite: annuiteYear, totalCharges, dscr });
  }

  const dscrMoyen = dscrs.reduce((a, b) => a + b, 0) / dscrs.length;
  return { rows, dscrMoyen, annuite, emprunt };
}

function computeResteACharge(params, targetDscr = 1.16) {
  // Binary search: find the apport needed so dscrMoyen >= targetDscr
  let lo = 0, hi = params.totalInvestissement * 0.9;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { dscrMoyen } = computeBusinessPlan({ ...params, apport: mid });
    if (dscrMoyen >= targetDscr) { hi = mid; } else { lo = mid; }
  }
  const minApport = params.totalInvestissement * 0.1;
  return Math.max(0, Math.ceil(hi) - minApport);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n, dec = 0) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (n) => `${fmt(n, 2)} €`;
const fmtPct = (n) => `${fmt(n * 100, 1)}%`;

function Field({ label, value, onChange, type = 'text', suffix, className }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="text-xs text-slate-600 w-48 shrink-0">{label}</label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type={type}
          className="border border-slate-200 rounded px-2 py-1 text-xs w-full focus:ring-1 focus:ring-blue-500 outline-none"
          value={value ?? ''}
          onChange={e => onChange?.(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          step={type === 'number' ? 'any' : undefined}
        />
        {suffix && <span className="text-xs text-slate-500 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, className }) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 p-4 space-y-2', className)}>
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ─── Tab: BUSINESS PLAN PROJETS ──────────────────────────────────────────────

function TabBpProjets({ projects, selectedProject, setSelectedProject, params, setParams, computeBusinessPlan, computeResteACharge }) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const set = useCallback((k, v) => setParams(p => ({ ...p, [k]: v })), [setParams]);

  const saveBp = async () => {
    if (!selectedProject) return;
    try {
      await apiService.updateProject(selectedProject.id, { bpAcamaState: params });
      toast({ title: 'BP Sauvegardé', description: `L'état du business plan pour ${selectedProject.name} a été enregistré.` });
    } catch (e) {
      toast({ title: 'Erreur sauvegarde', variant: 'destructive', description: e.message });
    }
  };

  const totalConstruction = params.coutCentrale + params.coutCharpente + params.raccordement + params.frais + params.soulte;
  const tva = totalConstruction * 0.20;
  const totalInvestissement = totalConstruction + tva;
  const apport10 = totalInvestissement * 0.1;
  const apportSoulte = apport10 + params.soulte;

  const bpParams = { ...params, totalInvestissement, apport: apport10 };
  const { rows, dscrMoyen, annuite, emprunt } = useMemo(() => computeBusinessPlan(bpParams), [JSON.stringify(bpParams)]);

  const resteACharge = useMemo(() => computeResteACharge({ ...params, totalInvestissement }, 1.16), [JSON.stringify({ ...params, totalInvestissement })]);

  const dscrColor = dscrMoyen >= 1.16 ? 'text-green-600 bg-green-50' : dscrMoyen >= 1.10 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
  const DscrIcon = dscrMoyen >= 1.16 ? CheckCircle : dscrMoyen >= 1.10 ? AlertTriangle : AlertCircle;

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const applyProject = (p) => {
    setSelectedProject(p);
    setShowSearch(false);
  };

  const applyToProject = async () => {
    if (!selectedProject) return;
    try {
      await apiService.updateProject(selectedProject.id, { resteACharge });
      toast({ title: 'Reste à charge appliqué', description: `${fmtEur(resteACharge)} mis à jour dans le projet ${selectedProject.name}` });
    } catch (e) {
      toast({ title: 'Erreur', variant: 'destructive', description: e.message });
    }
  };

  const prodTotale = params.kwc * params.productible;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Project selector & Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
        <span className="text-xs font-semibold text-blue-700">Projet CRM :</span>
        <div className="relative flex-1">
          <button onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-2 bg-white border border-blue-300 rounded px-3 py-1.5 text-xs w-full text-left hover:bg-blue-50">
            {selectedProject ? selectedProject.name : 'Sélectionner un projet...'}
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          {showSearch && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-80">
              <div className="p-2 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1">
                  <Search className="w-3 h-3 text-slate-400" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent text-xs outline-none flex-1" />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredProjects.map(p => (
                  <button key={p.id} onClick={() => applyProject(p)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-50">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-slate-500">{p.city} • {p.puissance} kWc</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {selectedProject && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveBp} className="bg-green-600 hover:bg-green-700 text-white text-xs h-8">
              <Save className="w-3 h-3 mr-1" /> Sauvegarder BP
            </Button>
            <button onClick={() => { setSelectedProject(null); setSearch(''); }} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT: Inputs */}
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Données du projet">
              <Field label="Puissance installée (KWc)" value={params.kwc} onChange={v => set('kwc', v)} type="number" />
              <Field label="Productible (KWh/KWc)" value={params.productible} onChange={v => set('productible', v)} type="number" />
              <div className="text-xs text-slate-500 pt-1">Production totale : <b>{fmt(prodTotale)} KWh/an</b></div>
            </SectionCard>
            <SectionCard title="Tarifs d'achat">
              <Field label="Tarif ≤ 1 100 KWh/KWc" value={params.tarifBas} onChange={v => set('tarifBas', v)} type="number" suffix="€/kWh" />
              <Field label="Tarif > 1 100 KWh/KWc" value={params.tarifHaut} onChange={v => set('tarifHaut', v)} type="number" suffix="€/kWh" />
              <Field label="Seuil (KWh/KWc)" value={params.seuilKwhKwc} onChange={v => set('seuilKwhKwc', v)} type="number" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Investissement">
              <Field label="Centrale solaire" value={params.coutCentrale} onChange={v => set('coutCentrale', v)} type="number" suffix="€" />
              <Field label="Charpente / Bâtiment" value={params.coutCharpente} onChange={v => set('coutCharpente', v)} type="number" suffix="€" />
              <Field label="Raccordement" value={params.raccordement} onChange={v => set('raccordement', v)} type="number" suffix="€" />
              <Field label="Frais" value={params.frais} onChange={v => set('frais', v)} type="number" suffix="€" />
              <Field label="Soulte" value={params.soulte} onChange={v => set('soulte', v)} type="number" suffix="€" />
              <div className="border-t border-slate-100 pt-1 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Total construction :</span><b>{fmtEur(totalConstruction)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">TVA 20% :</span><b>{fmtEur(tva)}</b></div>
                <div className="flex justify-between text-blue-700"><span className="font-semibold">Total investissement :</span><b>{fmtEur(totalInvestissement)}</b></div>
              </div>
            </SectionCard>
            <SectionCard title="OPEX annuels">
              <Field label="Maintenance" value={params.maintenance} onChange={v => set('maintenance', v)} type="number" suffix="€/an" />
              <Field label="Location compteur" value={params.locationCompteur} onChange={v => set('locationCompteur', v)} type="number" suffix="€/an" />
              <Field label="Assurance" value={params.assurance} onChange={v => set('assurance', v)} type="number" suffix="€/an" />
              <Field label="Taxes locales" value={params.taxesLocales} onChange={v => set('taxesLocales', v)} type="number" suffix="€/an" />
              <Field label="Gestion administrative" value={params.gestionAdmin} onChange={v => set('gestionAdmin', v)} type="number" suffix="€/an" />
            </SectionCard>
          </div>
          <SectionCard title="Banque">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Durée de l'emprunt" value={params.dureeEmprunt} onChange={v => set('dureeEmprunt', v)} type="number" suffix="ans" />
              <Field label="Taux de crédit" value={params.tauxCredit} onChange={v => set('tauxCredit', v)} type="number" suffix="%" />
              <Field label="Indexation tarif" value={params.indexationTarif * 100} onChange={v => set('indexationTarif', v / 100)} type="number" suffix="%" />
              <Field label="Indexation OPEX" value={params.indexationOpex * 100} onChange={v => set('indexationOpex', v / 100)} type="number" suffix="%" />
              <Field label="Dégradation modules" value={params.degradation * 100} onChange={v => set('degradation', v / 100)} type="number" suffix="%" />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Apport (10%) :</span><b>{fmtEur(apport10)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Emprunt :</span><b>{fmtEur(emprunt)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Annuité :</span><b>{fmtEur(annuite)}</b></div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          {/* DSCR box */}
          <div className={cn('rounded-xl border-2 p-4 text-center', dscrMoyen >= 1.16 ? 'border-green-300 bg-green-50' : dscrMoyen >= 1.10 ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50')}>
            <DscrIcon className={cn('w-8 h-8 mx-auto mb-1', dscrColor.split(' ')[0])} />
            <div className="text-2xl font-black text-slate-900">{fmtPct(dscrMoyen)}</div>
            <div className={cn('text-xs font-semibold mt-1 px-2 py-0.5 rounded-full inline-block', dscrColor)}>DSCR MOYEN 20 ANS</div>
            <div className="text-[10px] text-slate-500 mt-1">Seuil bancaire : 116%</div>
          </div>

          {/* Reste à charge */}
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Reste à charge calculé</div>
            <div className="text-2xl font-black text-white mt-1">{fmtEur(resteACharge)}</div>
            <div className="text-[10px] text-slate-400 mt-1">Pour atteindre DSCR ≥ 116%</div>
            {selectedProject && (
              <Button onClick={applyToProject} size="sm" className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs">
                <Save className="w-3 h-3 mr-1" /> Appliquer au projet
              </Button>
            )}
          </div>

          <SectionCard title="Indicateurs">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Apport avec soulte :</span><b>{fmtEur(apportSoulte)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Emprunt net :</span><b>{fmtEur(emprunt)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">CA an 1 :</span><b>{fmtEur(rows[0]?.ca)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Total charges an 1 :</span><b>{fmtEur(rows[0]?.totalCharges)}</b></div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Plan 20 ans table */}
      <SectionCard title="Plan d'affaires 20 ans">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {['Année','Puiss. (kWc)','Production','Prod ≤1100','Prod >1100','CA (€)','Maint.','Loc. compteur','Assurance','Annuité','Total charges','DSCR'].map(h => (
                  <th key={h} className="border border-slate-200 px-1 py-1 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={cn('hover:bg-blue-50', i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                  <td className="border border-slate-200 px-1 py-0.5 font-semibold">{r.year}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.kwcDeg, 2)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.prod)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.prodBas)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.prodHaut)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right font-medium">{fmt(r.ca, 0)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.maint, 0)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.loc, 0)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.ass, 0)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.annuite, 0)}</td>
                  <td className="border border-slate-200 px-1 py-0.5 text-right">{fmt(r.totalCharges, 0)}</td>
                  <td className={cn('border border-slate-200 px-1 py-0.5 text-right font-bold', r.dscr >= 1.16 ? 'text-green-700' : r.dscr >= 1.10 ? 'text-orange-700' : 'text-red-700')}>
                    {fmtPct(r.dscr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: SUIVI ───────────────────────────────────────────────────────────────

function TabSuivi() {
  const [rows, setRows] = useState([
    { id: 1, dev: 'ACAMA', nom: 'RICHARD_17430_BAC', spv: 'CH-TTPAGE', kwc: 346.84, adresse: '', commune: '', cp: '', gps: '', tel: '', zone_sism: 'A2', zone_vent: 'A', zone_neige: 'A', altitude: 291, type_trav: 'BAC', type_bat: 'TYPE 9 MID', nb_hang: 1, categorie: 'Agricole', productible: 1123.08, production: 389528, dist_hta: '', dist_priv: '' },
    { id: 2, dev: 'ACAMA', nom: 'LAHAYE_PVA_BAC', spv: 'CH-TTPAGE', kwc: 346.84, adresse: '', commune: '', cp: '', gps: '', tel: '', zone_sism: '', zone_vent: '', zone_neige: '', altitude: '', type_trav: 'BAC', type_bat: 'TYPE 9 MID', nb_hang: 1, categorie: 'Agricole', productible: '', production: '', dist_hta: '', dist_priv: '' },
  ]);

  const cols = [
    { key: 'id', label: 'N°', width: 30 }, { key: 'dev', label: 'Dev.' }, { key: 'nom', label: 'Nom projet', width: 140 },
    { key: 'spv', label: 'SPV' }, { key: 'kwc', label: 'KWc' }, { key: 'adresse', label: 'Adresse' },
    { key: 'commune', label: 'Commune' }, { key: 'cp', label: 'CP' }, { key: 'gps', label: 'GPS' },
    { key: 'tel', label: 'Tél.' }, { key: 'zone_sism', label: 'Z. Sism.' }, { key: 'zone_vent', label: 'Z. Vent' },
    { key: 'zone_neige', label: 'Z. Neige' }, { key: 'altitude', label: 'Alt. (m)' }, { key: 'type_trav', label: 'Type trav.' },
    { key: 'type_bat', label: 'Type bat.' }, { key: 'nb_hang', label: 'Nb hang.' }, { key: 'categorie', label: 'Catégorie' },
    { key: 'productible', label: 'Productible (KWh/KWc)' }, { key: 'production', label: 'Prod. an. (KWh)' },
    { key: 'dist_hta', label: 'Dist. HTA (m)' }, { key: 'dist_priv', label: 'Dist. privée (m)' },
  ];

  const addRow = () => setRows(r => [...r, { id: r.length + 1, dev: 'ACAMA', nom: '', spv: 'CH-TTPAGE', kwc: 0, adresse: '', commune: '', cp: '', gps: '', tel: '', zone_sism: '', zone_vent: '', zone_neige: '', altitude: '', type_trav: 'BAC', type_bat: '', nb_hang: 1, categorie: 'Agricole', productible: '', production: '', dist_hta: '', dist_priv: '' }]);
  const update = (id, k, v) => setRows(r => r.map(row => row.id === id ? { ...row, [k]: v } : row));
  const del = (id) => setRows(r => r.filter(row => row.id !== id));

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Nouvelle ligne
        </Button>
        <span className="text-xs text-slate-500">{rows.length} projets</span>
      </div>
      <div className="overflow-auto border border-slate-200 rounded-lg">
        <table className="text-[10px] border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              {cols.map(c => <th key={c.key} style={{ width: c.width || 80 }} className="border border-slate-600 px-2 py-1.5 font-semibold whitespace-nowrap">{c.label}</th>)}
              <th className="border border-slate-600 px-2 py-1.5 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {cols.map(c => (
                  <td key={c.key} className="border border-slate-200 p-0">
                    <input
                      className="w-full px-2 py-1 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400"
                      value={row[c.key] ?? ''}
                      onChange={e => update(row.id, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-slate-200 text-center">
                  <button onClick={() => del(row.id)} className="text-red-400 hover:text-red-600 p-0.5"><X className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: SUIVI BAT TYPE ─────────────────────────────────────────────────────

function TabSuiviBatType() {
  const cols = [
    'Type','SPV','KWc','Coût bat. (€)','Massifs','Long. (m)','Larg. (m)','Travées',
    'H. Sud (m)','H. Nord (m)','Faitage (m)','Surf Sud (m²)','Surf Nord (m²)','Surf Tot (m²)',
    'Pente Sud (°)','Pente Nord (°)','Mod H Sud','Mod L Sud','Total Mod','Puiss Max (KWc)','Prod Sud','Prod Nord'
  ];
  const keys = ['type','spv','kwc','cout_bat','massifs','longueur','largeur','travees','hSud','hNord','faitage','surfSud','surfNord','surfTot','penteSud','penteNord','modH','modL','totalMod','puissMax','prodSud','prodNord'];

  return (
    <div className="p-4">
      <div className="overflow-auto border border-slate-200 rounded-lg">
        <table className="text-[10px] border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              {cols.map(c => <th key={c} className="border border-slate-600 px-2 py-1.5 font-semibold whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {SUIVI_BAT_DATA.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                {keys.map(k => (
                  <td key={k} className="border border-slate-200 px-2 py-1 whitespace-nowrap font-medium text-slate-700">{row[k] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: BE Tables ──────────────────────────────────────────────────────────


function TabData() {
  const [rows, setRows] = useState([
    { id:1, type:'1 MINI', spv:'ACAMA SPV1', cap:270, massifs:22, long:53.72, larg:23.47, travees:7, lTravee:7.5, hSud:4, hNord:4, hFait:6.9, lRemS:11.97, lRemN:11.97, sSud:643.0, sNord:643.0, sTot:1286.1, axeS:11.82, axeN:11.82, pS:14.01, pN:14.01, bPO_d:115.54, bPO_e:8088, bPE_d:115.54, bPE_e:8088, bLN_d:231.69, bLN_e:12743, bLS_d:231.69, bLS_e:12743, chS:6017, chN:6017, faitage:1612, anticond:2572 },
    { id:2, type:'1 MID', spv:'ACAMA SPV1', cap:306, massifs:24, long:60.67, larg:23.47, travees:8, lTravee:7.5, hSud:4, hNord:4, hFait:6.9, lRemS:11.97, lRemN:11.97, sSud:725.6, sNord:725.6, sTot:1451.2, axeS:11.82, axeN:11.82, pS:14.01, pN:14.01, bPO_d:115.54, bPO_e:8088, bPE_d:115.54, bPE_e:8088, bLN_d:264.75, bLN_e:14561, bLS_d:264.75, bLS_e:14561, chS:6789, chN:6789, faitage:1819, anticond:2902 },
    { id:3, type:'1 MAXI', spv:'ACAMA SPV1', cap:342, massifs:26, long:68.05, larg:23.47, travees:9, lTravee:7.5, hSud:4, hNord:4, hFait:6.9, lRemS:11.97, lRemN:11.97, sSud:814.6, sNord:814.6, sTot:1629.1, axeS:11.82, axeN:11.82, pS:14.01, pN:14.01, bPO_d:115.54, bPO_e:8088, bPE_d:115.54, bPE_e:8088, bLN_d:297.84, bLN_e:16381, bLS_d:231.69, bLS_e:12743, chS:7622, chN:7622, faitage:2042, anticond:3258 },
    { id:4, type:'2 MINI', spv:'ACAMA SPV1', cap:189, massifs:21, long:37.55, larg:24.26, travees:6, lTravee:6.2, hSud:4.35, hNord:9.67, hFait:0, lRemS:23.26, lRemN:0, sSud:873.6, sNord:0, sTot:873.6, axeS:22.44, axeN:0, pS:11, pN:0, bPO_d:157.15, bPO_e:11001, bPE_d:157.15, bPE_e:11001, bLN_d:375.75, bLN_e:20666, bLS_d:231.69, bLS_e:12743, chS:4207, chN:4207, faitage:1127, anticond:1747 },
    { id:5, type:'2 MID', spv:'ACAMA SPV1', cap:315, massifs:30, long:62.36, larg:24.26, travees:10, lTravee:6.2, hSud:4.35, hNord:9.67, hFait:0, lRemS:23.26, lRemN:0, sSud:1450.5, sNord:0, sTot:1450.5, axeS:22.44, axeN:0, pS:11, pN:0, bPO_d:157.15, bPO_e:11001, bPE_d:157.15, bPE_e:11001, bLN_d:623, bLN_e:34265, bLS_d:231.69, bLS_e:12743, chS:6986, chN:6986, faitage:1871, anticond:2901 },
    { id:6, type:'2 MAXI', spv:'ACAMA SPV1', cap:342, massifs:33, long:68.55, larg:24.26, travees:11, lTravee:6.2, hSud:4.35, hNord:9.67, hFait:0, lRemS:23.26, lRemN:0, sSud:1590.1, sNord:0, sTot:1590.1, axeS:22.44, axeN:0, pS:11, pN:0, bPO_d:157.15, bPO_e:11001, bPE_d:157.15, bPE_e:11001, bLN_d:686.03, bLN_e:37732, bLS_d:231.69, bLS_e:12743, chS:7656, chN:7656, faitage:2051, anticond:3180 },
    { id:7, type:'3 MINI', spv:'ACAMA SPV1', cap:234.9, massifs:22, long:52.84, larg:21.13, travees:7, lTravee:7.5, hSud:2.56, hNord:2.56, hFait:4.7, lRemS:10.7, lRemN:10.7, sSud:565.2, sNord:565.2, sTot:1126.5, axeS:10.29, axeN:10.29, pS:11.75, pN:11.75, bPO_d:73.2, bPO_e:5124, bPE_d:73.2, bPE_e:5124, bLN_d:190.22, bLN_e:10462, bLS_d:231.69, bLS_e:12743, chS:5896, chN:5896, faitage:1579, anticond:2253 },
    { id:8, type:'3 MID', spv:'ACAMA SPV1', cap:307.8, massifs:24, long:68, larg:21.13, travees:9, lTravee:7.5, hSud:2.56, hNord:2.56, hFait:4.7, lRemS:10.7, lRemN:10.7, sSud:727.6, sNord:727.6, sTot:1455.2, axeS:10.29, axeN:10.29, pS:11.75, pN:11.75, bPO_d:73.2, bPO_e:5124, bPE_d:73.2, bPE_e:5124, bLN_d:144.1, bLN_e:14451, bLS_d:231.69, bLS_e:12743, chS:7616, chN:7616, faitage:2040, anticond:2910 },
    { id:9, type:'3 MAXI', spv:'ACAMA SPV1', cap:405, massifs:30, long:90.14, larg:21.13, travees:12, lTravee:7.5, hSud:2.56, hNord:2.56, hFait:4.7, lRemS:10.7, lRemN:10.7, sSud:964.5, sNord:964.5, sTot:1929.0, axeS:10.29, axeN:10.29, pS:11.75, pN:11.75, bPO_d:73.2, bPO_e:5124, bPE_d:73.2, bPE_e:5124, bLN_d:257.25, bLN_e:14149, bLS_d:231.69, bLS_e:12743, chS:10096, chN:10096, faitage:2704, anticond:3858 },
  ]);

  const cols = [
    { key: 'type', label: 'du projet', width: 90 },
    { key: 'spv', label: 'S/PV', width: 90 },
    { key: 'cap', label: 'Capacité', width: 60 },
    { key: 'massifs', label: 'Nb massifs', width: 60 },
    { key: 'long', label: 'Long. Bat', width: 70 },
    { key: 'larg', label: 'Larg. Bat', width: 70 },
    { key: 'travees', label: 'Nb Travées', width: 60 },
    { key: 'lTravee', label: 'Larg. Travée', width: 70 },
    { key: 'hSud', label: 'H. Sud', width: 60 },
    { key: 'hNord', label: 'H. Nord', width: 60 },
    { key: 'hFait', label: 'H. Faitage', width: 60 },
    { key: 'lRemS', label: 'L. Remp. S', width: 70 },
    { key: 'lRemN', label: 'L. Remp. N', width: 70 },
    { key: 'sSud', label: 'Surf. S', width: 70 },
    { key: 'sNord', label: 'Surf. N', width: 70 },
    { key: 'sTot', label: 'Surf. Tot', width: 70 },
    { key: 'axeS', label: 'Axe S-F', width: 70 },
    { key: 'axeN', label: 'Axe N-F', width: 70 },
    { key: 'pS', label: 'Pente S', width: 60 },
    { key: 'pN', label: 'Pente N', width: 60 },
    { key: 'bPO_d', label: 'BP P O (Dim)', width: 80 },
    { key: 'bPO_e', label: 'BP P O (€)', width: 80 },
    { key: 'bPE_d', label: 'BP P E (Dim)', width: 80 },
    { key: 'bPE_e', label: 'BP P E (€)', width: 80 },
    { key: 'bLN_d', label: 'BP LP N (Dim)', width: 80 },
    { key: 'bLN_e', label: 'BP LP N (€)', width: 80 },
    { key: 'bLS_d', label: 'BP LP S (Dim)', width: 80 },
    { key: 'bLS_e', label: 'BP LP S (€)', width: 80 },
    { key: 'chS', label: 'Chéneau S', width: 80 },
    { key: 'chN', label: 'Chéneau N', width: 80 },
    { key: 'faitage', label: 'Faitage v.', width: 80 },
    { key: 'anticond', label: 'Anti-cond.', width: 80 },
  ];

  const update = (id, k, v) => setRows(r => r.map(row => row.id === id ? { ...row, [k]: v } : row));

  return (
    <div className="p-4 overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Base de données technique (DATA 2)</h3>
        <Button size="sm" onClick={() => setRows(r => [...r, { id: Date.now(), type:'' }])} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7">
          <Plus className="w-3 h-3 mr-1" /> Ajouter ligne
        </Button>
      </div>
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-sm bg-white">
        <table className="text-[10px] border-collapse min-w-max">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800 text-white">
              {cols.map(c => (
                <th key={c.key} style={{ width: c.width }} className="border border-slate-600 px-2 py-2 font-semibold text-center whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="border border-slate-600 px-2 py-2 w-8">✕</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={cn('group', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-blue-50/30 font-medium')}>
                {cols.map(c => (
                  <td key={c.key} className="border border-slate-200 p-0 overflow-hidden">
                    <input
                      className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-center transition-all"
                      value={row[c.key] ?? ''}
                      onChange={e => update(row.id, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-slate-200 text-center group-hover:bg-red-50">
                  <button onClick={() => setRows(r => r.filter(x => x.id !== row.id))} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabPropositionBE({ selectedProject, params }) {
  const [data, setData] = useState({
    nomProjet: '',
    mixte: 'NON',
    typeBat: '',
    zoneNeige: 'N/A',
    zoneVent: 'N/A',
    altitude: 'N/A',
    gps: '',
    superficie: 'N/A',
    prodMoyen: '',
    puissance: '',
    tarif: '',
    ombrage: 'NON',
    longTranchee: 'N/A',
    distPublique: 'N/A',
    soulte: '',
    optionOffert: '',
    dateRealisation: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    dateValidite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    pcComplete: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    depotDepose: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    realiseBy: 'S.B',
    valideBy: 'A.M',
    remarques: '',
  });

  useEffect(() => {
    if (selectedProject) {
      setData(prev => ({
        ...prev,
        nomProjet: selectedProject.name || '',
        mixte: selectedProject.mixte || 'NON',
        typeBat: selectedProject.type_bat || '',
        zoneNeige: selectedProject.snow_zone || 'N/A',
        zoneVent: selectedProject.wind_zone || 'N/A',
        altitude: selectedProject.altitude || 'N/A',
        gps: selectedProject.gps || '',
        superficie: selectedProject.surface || 'N/A',
        prodMoyen: params?.productible || '',
        puissance: params?.kwc || '',
        tarif: params?.tarifBas || '0.0846',
        ombrage: selectedProject.ombrage || 'NON',
        longTranchee: selectedProject.dist_hta || 'N/A',
        distPublique: selectedProject.dist_hta || 'N/A',
        soulte: params?.soulte || '',
      }));
    }
  }, [selectedProject, params]);

  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const Section = ({ title, children }) => (
    <div className="mb-4">
      <div className="bg-[#1e293b] text-white text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider">{title}</div>
      <div className="bg-white border-x border-b border-slate-200">{children}</div>
    </div>
  );

  const Row = ({ label, value, onChange, isLast }) => (
    <div className={cn("flex border-b border-slate-100 last:border-0", isLast && "border-0")}>
      <div className="w-1/2 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-700 border-r border-slate-200 uppercase">{label}</div>
      <div className="w-1/2 px-3 py-2 text-[10px] font-medium text-slate-900 flex items-center">
        {onChange ? (
          <input 
            type="text" 
            className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <span>{value ?? '—'}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-100 min-h-full">
      <div className="max-w-xl mx-auto bg-white shadow-xl p-8 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-4 uppercase tracking-tighter">Proposition Client BE</h2>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
            <FileDown className="w-4 h-4" /> Imprimer / PDF
          </Button>
        </div>

        <Section title="Projet">
          <Row label="Nom du Projet :" value={data.nomProjet} onChange={v => update('nomProjet', v)} />
          <Row label="Présence Projet Mixte :" value={data.mixte} onChange={v => update('mixte', v)} />
          <Row label="Type Bâtiment :" value={data.typeBat} onChange={v => update('typeBat', v)} />
          <Row label="Zone neige :" value={data.zoneNeige} onChange={v => update('zoneNeige', v)} />
          <Row label="Zone vent :" value={data.zoneVent} onChange={v => update('zoneVent', v)} />
          <Row label="Altitude :" value={data.altitude} onChange={v => update('altitude', v)} />
          <Row label="Point GPS :" value={data.gps} onChange={v => update('gps', v)} />
          <Row label="Superficie (m²) :" value={data.superficie} onChange={v => update('superficie', v)} />
          <Row label="Productible moyen en kWh/kWc :" value={data.prodMoyen} onChange={v => update('prodMoyen', v)} />
          <Row label="Puissance (kWc) :" value={data.puissance} onChange={v => update('puissance', v)} />
          <Row label="Tarif en vigueur en c€/kWh :" value={data.tarif} onChange={v => update('tarif', v)} />
          <Row label="Présence Ombrage :" value={data.ombrage} onChange={v => update('ombrage', v)} isLast />
        </Section>

        <Section title="Raccordement Partie Privée">
          <Row label="Longueur tranchée (ml) :" value={data.longTranchee} onChange={v => update('longTranchee', v)} isLast />
        </Section>

        <Section title="Raccordement Partie Publique">
          <Row label="Distance (ml) :" value={data.distPublique} onChange={v => update('distPublique', v)} isLast />
        </Section>

        <Section title="Dilan Projet">
          <Row label="Soulte :" value={fmtEur(data.soulte)} onChange={v => update('soulte', v)} />
          <Row label="Option Offert :" value={data.optionOffert} onChange={v => update('optionOffert', v)} isLast />
        </Section>

        <Section title="Dates Clés">
          <Row label="Date de réalisation :" value={data.dateRealisation} onChange={v => update('dateRealisation', v)} />
          <Row label="Offre valable jusqu'au :" value={data.dateValidite} onChange={v => update('dateValidite', v)} />
          <Row label="PC à Compléter avant le :" value={data.pcComplete} onChange={v => update('pcComplete', v)} />
          <Row label="Dépôt à déposer avant le :" value={data.depotDepose} onChange={v => update('depotDepose', v)} isLast />
        </Section>

        <Section title="Responsabilité">
          <Row label="Réalisé par :" value={data.realiseBy} onChange={v => update('realiseBy', v)} />
          <Row label="Validé par :" value={data.valideBy} onChange={v => update('valideBy', v)} />
          <Row label="Remarques :" value={data.remarques} onChange={v => update('remarques', v)} isLast />
        </Section>
      </div>
    </div>
  );
}

function TabDevis({ selectedProject, params }) {
  const [data, setData] = useState({
    dateDevis: new Date().toLocaleDateString('fr-FR'),
    dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    etudeRenfort: 0,
    etudeImplant: 0,
    etudeNoteCalcul: 0,
    etudeCalepinage: 0,
    transportCharpente: 0,
    fournitureBac: 0,
    anticondensation: 0,
    transportCouverture: 0,
    levage: 0,
    securite: 0,
    montage: 0,
    etudeElec: 0,
    securiteElec: 0,
    poseModules: 0,
  });

  const kwc = params?.kwc || 0;
  const longBat = parseFloat(selectedProject?.longueur) || 0;
  const largBat = parseFloat(selectedProject?.largeur) || 0;
  const nbTravees = parseInt(selectedProject?.nb_travees) || 0;
  const largTravee = parseFloat(selectedProject?.larg_travee) || 0;
  const surface = parseFloat(selectedProject?.surface) || 0;

  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const subtotalBat = (parseFloat(data.etudeRenfort) || 0) + 
                     (parseFloat(data.etudeImplant) || 0) + 
                     (parseFloat(data.etudeNoteCalcul) || 0) + 
                     (parseFloat(data.etudeCalepinage) || 0) + 
                     (parseFloat(data.transportCharpente) || 0) + 
                     (parseFloat(data.fournitureBac) || 0) + 
                     (parseFloat(data.anticondensation) || 0) + 
                     (parseFloat(data.transportCouverture) || 0) + 
                     (parseFloat(data.levage) || 0) + 
                     (parseFloat(data.securite) || 0) + 
                     (parseFloat(data.montage) || 0) +
                     (params?.coutCharpente || 0);

  const subtotalElec = (parseFloat(data.etudeElec) || 0) + 
                      (parseFloat(data.securiteElec) || 0) + 
                      (parseFloat(data.poseModules) || 0) +
                      (params?.coutCentrale || 0) +
                      (params?.onduleurs || 0);

  const subtotalRaccordement = (params?.raccordement || 0);
  
  const totalHT = subtotalBat + subtotalElec + subtotalRaccordement;

  const Row = ({ label, value, unit, onChange, isHeader, isSubtotal }) => (
    <div className={cn(
      "flex border-b border-slate-100 py-2 px-3 items-center hover:bg-slate-50 transition-colors", 
      isHeader && "bg-slate-800 text-white font-bold hover:bg-slate-800", 
      isSubtotal && "bg-slate-100 font-bold border-t-2 border-slate-200"
    )}>
      <div className={cn("text-base flex-1", isHeader && "uppercase tracking-wider")}>{label}</div>
      <div className="flex items-center gap-2 w-56">
        {onChange ? (
          <input 
            type="text" 
            className="w-full bg-transparent text-right outline-none border-b border-transparent focus:border-blue-400 text-sm px-1 font-medium"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <div className="w-full text-right text-base font-bold">{typeof value === 'number' ? fmt(value, 2) : (value ?? '—')}</div>
        )}
        <div className="w-12 text-[10px] text-slate-400 text-right uppercase font-bold">{unit}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="max-w-3xl mx-auto w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-auto flex flex-col no-scrollbar">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <FileDown className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">DEVIS TECHNIQUE</h3>
          </div>
          <Button size="sm" className="gap-2 shadow-sm" onClick={() => window.print()}>
            <FileDown className="w-4 h-4" />
            Générer le Devis
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
             <div className="space-y-3">
               <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500 font-medium w-40">Date de réalisation :</span>
                  <input className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-32 shadow-sm" value={data.dateDevis} onChange={e => update('dateDevis', e.target.value)} />
               </div>
               <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500 font-medium w-40">Date de validité :</span>
                  <input className="bg-white border border-slate-200 rounded px-2 py-1 outline-none w-32 shadow-sm" value={data.dateValidite} onChange={e => update('dateValidite', e.target.value)} />
               </div>
             </div>
             <div className="text-right">
               <div className="text-sm font-black text-slate-800 uppercase">PROJET : {selectedProject?.name || 'Non sélectionné'}</div>
               <div className="text-xs text-slate-500 mt-2 font-medium">Client : {selectedProject?.client_name || '—'}</div>
             </div>
          </div>

          <div className="border border-slate-100 rounded-lg overflow-hidden">
            {/* LOT BATIMENT */}
            <Row label="LOT BÂTIMENT (Charpente & Couverture)" isHeader />
            <Row label="Études techniques" className="font-bold text-blue-700 bg-blue-50/30" />
            <Row label="  • Étude de renforcement" value={data.etudeRenfort} unit="€ HT" onChange={v => update('etudeRenfort', v)} />
            <Row label="  • Plan d'implantation & descente de charge" value={data.etudeImplant} unit="€ HT" onChange={v => update('etudeImplant', v)} />
            <Row label="  • Plan d'ensemble & note de calcul" value={data.etudeNoteCalcul} unit="€ HT" onChange={v => update('etudeNoteCalcul', v)} />
            <Row label="  • Plan de calepinage couverture" value={data.etudeCalepinage} unit="€ HT" onChange={v => update('etudeCalepinage', v)} />
            
            <Row label="Ossature & Charpente" className="font-bold text-blue-700 bg-blue-50/30" />
            <Row label="  • Coût matériel Charpente (BP)" value={params?.coutCharpente} unit="€ HT" />
            <Row label="  • Largeur totale extérieur poteaux" value={fmt(largBat, 2)} unit="ml" />
            <Row label="  • Longueur totale" value={fmt(longBat, 2)} unit="ml" />
            <Row label="  • Nombre de travées / Largeur travée" value={`${nbTravees} u / ${fmt(largTravee, 2)} ml`} unit="" />
            <Row label="  • Transport et déchargement charpente" value={data.transportCharpente} unit="€ HT" onChange={v => update('transportCharpente', v)} />

            <Row label="Couverture & Finitions" className="font-bold text-blue-700 bg-blue-50/30" />
            <Row label="  • Fourniture Bac Acier (BAC ACIER)" value={data.fournitureBac} unit="€ HT" onChange={v => update('fournitureBac', v)} />
            <Row label="  • Surface couverture totale" value={fmt(surface, 0)} unit="m²" />
            <Row label="  • Film anti-condensation / Épaisseur 75/100" value={data.anticondensation} unit="€ HT" onChange={v => update('anticondensation', v)} />
            <Row label="  • Transport et déchargement couverture" value={data.transportCouverture} unit="€ HT" onChange={v => update('transportCouverture', v)} />

            <Row label="Pose & Logistique" className="font-bold text-blue-700 bg-blue-50/30" />
            <Row label="  • Location engins de levage & montage" value={data.levage} unit="€ HT" onChange={v => update('levage', v)} />
            <Row label="  • Sécurité chantier (EPI / EPC)" value={data.securite} unit="€ HT" onChange={v => update('securite', v)} />
            <Row label="  • Montage charpente & pose couverture" value={data.montage} unit="€ HT" onChange={v => update('montage', v)} />
            <Row label="SOUS-TOTAL LOT BÂTIMENT" value={subtotalBat} unit="€ HT" isSubtotal />

            {/* LOT ELEC */}
            <div className="h-6 bg-slate-50" />
            <Row label="LOT ÉLECTRICITÉ (Photovoltaïque)" isHeader />
            <Row label="Ingénierie & Sécurité" className="font-bold text-blue-700 bg-blue-50/30" />
            <Row label="  • Développement, Raccordement & Études PV" value={data.etudeElec} unit="€ HT" onChange={v => update('etudeElec', v)} />
            <Row label="  • Sécurité électrique & Travaux" value={data.securiteElec} unit="€ HT" onChange={v => update('securiteElec', v)} />
            
            <Row label="Matériel & Pose" className="font-bold text-blue-700 bg-blue-50/30" />
            <Row label="  • Coût matériel Centrale PV (BP)" value={params?.coutCentrale} unit="€ HT" />
            <Row label="  • Puissance totale installée" value={fmt(kwc, 2)} unit="kWc" />
            <Row label="  • Fourniture des Onduleurs (BP)" value={params?.onduleurs} unit="€ HT" />
            <Row label="  • Pose & Raccordement modules" value={data.poseModules} unit="€ HT" onChange={v => update('poseModules', v)} />
            <Row label="SOUS-TOTAL LOT ÉLECTRICITÉ" value={subtotalElec} unit="€ HT" isSubtotal />

            {/* RACCORDEMENT */}
            <div className="h-6 bg-slate-50" />
            <Row label="FRAIS DE RACCORDEMENT" isHeader />
            <Row label="Coûts Enedis / Privé (BP)" value={subtotalRaccordement} unit="€ HT" isSubtotal />
          </div>

          {/* Final Summary */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="flex justify-between items-end relative z-10">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Montant Total du Devis</span>
                <p className="text-[10px] text-slate-500 max-w-sm italic leading-tight">
                  Ce devis est une estimation basée sur les paramètres techniques du projet. 
                  Une étude de sol et un levé topographique sont nécessaires pour validation finale.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-blue-400 font-bold block mb-1">TOTAL HT</span>
                <span className="text-3xl font-black tabular-nums">{fmtEur(totalHT)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Simple placeholder ─────────────────────────────────────────────────

function TabPlaceholder({ label }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-slate-400">
      <FileText className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs mt-1 opacity-60">Disponible prochainement</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BpAcama() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState('bp_projets');
  const [selectedProject, setSelectedProject] = useState(null);

  const [params, setParams] = useState({
    kwc: 346.84,
    productible: 1123.08,
    tarifBas: 0.0846,
    tarifHaut: 0.04,
    seuilKwhKwc: 1100,
    maintenance: 1734.20,
    locationCompteur: 660,
    assurance: 867.10,
    taxesLocales: 0,
    gestionAdmin: 0,
    coutCentrale: 169951.60,
    coutCharpente: 171381.00,
    raccordement: 18300.00,
    frais: 3413.33,
    soulte: -9048.54,
    dureeEmprunt: 20,
    tauxCredit: 4,
    indexationTarif: 0.006,
    indexationOpex: 0.02,
    degradation: 0.004,
  });

  // Persistence: Load saved state or calculate defaults when project changes
  useEffect(() => {
    if (!selectedProject) return;

    // 1. Try to load saved state
    if (selectedProject.bpAcamaState) {
      setParams(selectedProject.bpAcamaState);
      return;
    }

    // 2. Otherwise calculate defaults
    const kwc = parseFloat(selectedProject.puissance) || 346.84;
    const prod = parseFloat(selectedProject.productible) || 1123.08;
    
    // Raccordement formula: 12450 + 19.5 * dist_hta
    const distHta = parseFloat(selectedProject.dist_hta) || 0;
    const raccordement = 12450 + (distHta * 19.5);

    // Centrale logic: 490€/kWc
    const coutCentrale = kwc * 490;

    // Charpente lookup
    const batType = SUIVI_BAT_DATA.find(b => b.type === selectedProject.type_bat) || SUIVI_BAT_DATA[SUIVI_BAT_DATA.length - 1];
    const coutCharpente = batType.cout_bat || 171381;

    // OPEX
    const maintenance = kwc * 5;
    const assurance = kwc * 2.5;
    const taxesLocales = kwc * 2.5;

    // Frais (roughly 1% of subtotal)
    const subtotal = coutCentrale + coutCharpente + raccordement;
    const frais = subtotal * 0.01;

    setParams(prev => ({
      ...prev,
      kwc,
      productible: prod,
      coutCentrale,
      coutCharpente,
      raccordement,
      maintenance,
      assurance,
      taxesLocales,
      frais,
      soulte: parseFloat(selectedProject.soulte) || 0
    }));
  }, [selectedProject]);

  const isAdmin = user?.role === 'admin';
  const isAlexandru = user?.email === 'a.mihailov@acama-energies.fr';

  // Access Control: Admins + Alexandru
  if (!isAdmin && !isAlexandru) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Accès refusé</h2>
          <p className="text-sm text-slate-500 mt-1">Nécessite des droits administrateur ou un accès spécifique.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'bp_projets': return (
        <TabBpProjets 
          projects={projects || []} 
          selectedProject={selectedProject} 
          setSelectedProject={setSelectedProject}
          params={params}
          setParams={setParams}
          computeBusinessPlan={computeBusinessPlan}
          computeResteACharge={computeResteACharge}
        />
      );
      case 'suivi': return <TabSuivi />;
      case 'suivi_bat': return <TabSuiviBatType />;
      case 'prop_be': return <TabPropositionBE selectedProject={selectedProject} params={params} />;
      case 'data': return <TabData />;
      case 'devis': return <TabDevis selectedProject={selectedProject} params={params} />;
      default: return <TabPlaceholder label={TABS.find(t => t.id === activeTab)?.label || ''} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-700">
          <h1 className="text-sm font-bold text-white">BP ACAMA</h1>
          <p className="text-[10px] text-slate-400">Business Plan ACAMA</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-left text-xs transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-700 text-[10px] text-slate-400">
          Interface ACAMA • {new Date().getFullYear()}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-sm font-bold text-slate-800">{TABS.find(t => t.id === activeTab)?.label}</h2>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
