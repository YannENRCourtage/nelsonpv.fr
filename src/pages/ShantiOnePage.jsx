import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, Download, RefreshCw, Plus, Filter, MessageSquare, 
  CheckCircle2, AlertCircle, ArrowUpDown, ChevronDown, 
  Building2, Zap, Euro, ShieldCheck, X, FileSpreadsheet, Eye, SlidersHorizontal, Trash2,
  Clock, Check
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { isShantiOneAuthorized } from '@/services/firebase/auth.service.js';
import { 
  subscribeToShantiOneProjects, 
  updateShantiOneProject, 
  addShantiOneUpdate, 
  toggleLikeShantiOneUpdate, 
  deleteShantiOneUpdate, 
  exportShantiOneToExcel,
  seedShantiOneProjects
} from '@/services/firebase/shantiOne.service.js';
import MondayUpdatesDrawer from '@/components/MondayUpdatesDrawer.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Composant Bulle MAJ identique à Monday
const UpdateBubble = ({ count = 0, onClick }) => {
  const hasUpdates = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center justify-center p-1 rounded-lg transition-transform active:scale-90 cursor-pointer"
      title={hasUpdates ? `${count} mise(s) à jour - Cliquer pour ouvrir` : 'Ajouter une mise à jour'}
    >
      <div className={`relative flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
        hasUpdates 
          ? 'text-slate-700 hover:text-blue-600' 
          : 'text-slate-400 group-hover:text-blue-500'
      }`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 transition-transform group-hover:scale-110"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          {!hasUpdates && (
            <>
              <line x1="12" y1="8.5" x2="12" y2="14.5" strokeWidth="2" />
              <line x1="9" y1="11.5" x2="15" y2="11.5" strokeWidth="2" />
            </>
          )}
        </svg>

        {hasUpdates && (
          <span className="absolute -bottom-1 -right-1 min-w-[17px] h-[17px] px-1 bg-[#475569] text-white text-[9.5px] font-black rounded-full flex items-center justify-center shadow-xs border border-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
    </button>
  );
};

// Formateur de statuts avec badges de couleur
const StatusBadge = ({ value, type = 'default' }) => {
  if (!value || String(value).trim() === '') return <span className="text-slate-300">-</span>;
  const str = String(value).trim();
  const lower = str.toLowerCase();

  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (lower === 'valide' || lower === 'validé' || lower.includes('plan implant recu') || lower === 'ok') {
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  } else if (lower === 'fait' || lower.includes('devis recu')) {
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-medium';
  } else if (lower.includes('transmis') || lower.includes('cours') || lower === 'envoye' || lower === 'envoyé') {
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (lower === 'non' || lower.includes('refus')) {
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] border leading-tight whitespace-nowrap', badgeClass)}>
      {str}
    </span>
  );
};

export default function ShantiOnePage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [spvFilter, setSpvFilter] = useState('ALL');
  const [geometreFilter, setGeometreFilter] = useState('ALL');
  const [devisFilter, setDevisFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'rowIdx', direction: 'asc' });
  const [selectedProjectForUpdates, setSelectedProjectForUpdates] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [cellEditValue, setCellEditValue] = useState('');

  // Vérification RBAC
  const isAuthorized = isShantiOneAuthorized(user);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToShantiOneProjects(
      (data) => {
        setProjects(data);
        setLoading(false);
      },
      (err) => {
        console.warn('[ShantiOne] Notice de souscription Firestore (fallback local actif):', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthorized]);

  // Si non autorisé : Affichage 403 propre
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Accès restreint — Shanti One</h1>
        <p className="text-slate-600 max-w-md mb-6">
          Cette page collaborative est strictement réservée à la direction générale (Yann, Véronique, Laurent GUYON, Delphine BARDE).
        </p>
        <Button onClick={() => window.location.href = '/'} className="bg-slate-800 hover:bg-slate-900 text-white">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  // Options de filtrage
  const spvOptions = useMemo(() => {
    const set = new Set();
    projects.forEach(p => { if (p.spv) set.add(p.spv); });
    return Array.from(set).sort();
  }, [projects]);

  const geometreOptions = useMemo(() => {
    const set = new Set();
    projects.forEach(p => { if (p.geometre) set.add(p.geometre); });
    return Array.from(set).sort();
  }, [projects]);

  // Filtrage et tri
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Recherche textuelle
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const searchable = [
          p.projet, p.spv, p.adresse_projet, p.geometre, p.retour_geometre,
          p.courtier, p.notaire, p.mail, p.tel, p.type_projet_detail, p.observ_geometre
        ].map(v => String(v || '').toLowerCase()).join(' ');
        if (!searchable.includes(query)) return false;
      }

      // Filtre SPV
      if (spvFilter !== 'ALL' && p.spv !== spvFilter) return false;

      // Filtre Géomètre
      if (geometreFilter !== 'ALL' && p.geometre !== geometreFilter) return false;

      // Filtre Devis / Statuts
      if (devisFilter === 'VALIDE') {
        const val = String(p.devis_valide || '').toUpperCase();
        if (val !== 'VALIDE' && val !== 'VALIDÉ') return false;
      } else if (devisFilter === 'FAIT') {
        const val = String(p.devis_valide || '').toUpperCase();
        if (val !== 'FAIT') return false;
      } else if (devisFilter === 'ATTENTE') {
        const val = String(p.devis_valide || '').toUpperCase();
        if (val === 'VALIDE' || val === 'VALIDÉ' || val === 'FAIT') return false;
      }

      return true;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      if (!key) return 0;
      let valA = a[key] ?? '';
      let valB = b[key] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return direction === 'asc' ? -1 : 1;
      if (strA > strB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, searchQuery, spvFilter, geometreFilter, devisFilter, sortConfig]);

  // Comptage par statut pour les boutons de filtre
  const statusCounts = useMemo(() => {
    let valide = 0;
    let fait = 0;
    let attente = 0;
    projects.forEach(p => {
      const val = String(p.devis_valide || '').toUpperCase();
      if (val === 'VALIDE' || val === 'VALIDÉ') {
        valide++;
      } else if (val === 'FAIT') {
        fait++;
      } else {
        attente++;
      }
    });
    return { valide, fait, attente };
  }, [projects]);

  // Totaux calculés dynamiquement
  const stats = useMemo(() => {
    let totalKwc = 0;
    let totalDevisGeometre = 0;
    let totalAb6 = 0;
    let validCount = 0;

    filteredProjects.forEach(p => {
      const kwc = parseFloat(String(p.puissance_kwc).replace(',', '.')) || 0;
      const devis = parseFloat(String(p.mtt_ht_devis_geometre).replace(',', '.')) || 0;
      const ab6 = parseFloat(String(p.montant_ht_ab6).replace(',', '.')) || 0;
      totalKwc += kwc;
      totalDevisGeometre += devis;
      totalAb6 += ab6;
      if (String(p.devis_valide || '').toUpperCase() === 'VALIDE' || String(p.devis_valide || '').toUpperCase() === 'VALIDÉ') validCount++;
    });

    return { totalKwc, totalDevisGeometre, totalAb6, validCount };
  }, [filteredProjects]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCellClick = (id, field, currentValue) => {
    setEditingCell({ id, field });
    setCellEditValue(currentValue ?? '');
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    let newValue = cellEditValue;
    if (['puissance_kwc', 'mtt_ht_devis_geometre', 'montant_ht_ab6'].includes(field)) {
      if (newValue !== '') {
        const num = parseFloat(String(newValue).replace(',', '.'));
        if (!isNaN(num)) newValue = num;
      }
    }

    // Mise à jour optimiste locale
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: newValue } : p));
    setEditingCell(null);

    try {
      await updateShantiOneProject(id, { [field]: newValue }, user);
    } catch (err) {
      toast({ title: 'Erreur', description: 'Échec de sauvegarde', variant: 'destructive' });
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser l'ensemble des données du tableau Shanti One à partir du fichier Excel source initial ?")) return;
    try {
      setLoading(true);
      await seedShantiOneProjects();
      toast({ title: 'Succès', description: 'Données réinitialisées avec succès depuis le fichier source.' });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-12 w-full">
      {/* ═══ TOP BANNER & METRICS ═══ */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 shadow-xs w-full">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl shadow-md">
                <Building2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Shanti One
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredProjects.length} / {projects.length} projets
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium border border-slate-200 hidden sm:inline-block">
                Fichier 17/09/2026
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Suivi collaboratif des projets solaires, études géomètres et démarches urbanisme (PERSEA, CASSIOPEA, CEPHEUS...)
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportShantiOneToExcel(filteredProjects)}
              className="text-xs font-semibold h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4 mr-1.5 text-emerald-600" />
              Exporter Excel (.xlsx)
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetData}
              title="Réimporter la source Excel"
              className="h-9 px-2.5 text-slate-400 hover:text-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI Mini-Cards */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Puissance totale</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {stats.totalKwc.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">kWc</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Devis Géomètre HT</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {stats.totalDevisGeometre.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">€ HT</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Montant AB6 HT</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {stats.totalAb6.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">€ HT</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Devis Validés</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
              {stats.validCount} <span className="text-xs font-normal text-slate-500">dossiers</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FILTER & SEARCH TOOLBAR ═══ */}
      <div className="w-full px-4 lg:px-6 py-3">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            {/* Recherche globale */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Rechercher par projet, géomètre, commune, SPV..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtre SPV */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">SPV:</span>
              <select
                value={spvFilter}
                onChange={(e) => setSpvFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
              >
                <option value="ALL">Toutes les SPV</option>
                {spvOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Filtre Géomètre */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Géomètre:</span>
              <select
                value={geometreFilter}
                onChange={(e) => setGeometreFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
              >
                <option value="ALL">Tous les géomètres</option>
                {geometreOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Boutons pour les 3 statuts de devis (au lieu du menu déroulant) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Statut :</span>

            <Button
              type="button"
              variant={devisFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevisFilter('ALL')}
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5 border-slate-200 transition-all",
                devisFilter === 'ALL'
                  ? "bg-slate-800 hover:bg-slate-900 text-white border-slate-800 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 bg-white"
              )}
            >
              Tous ({projects.length})
            </Button>

            <Button
              type="button"
              variant={devisFilter === 'VALIDE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevisFilter(prev => prev === 'VALIDE' ? 'ALL' : 'VALIDE')}
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5 border-slate-200 transition-all",
                devisFilter === 'VALIDE'
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 font-bold shadow-xs"
                  : "text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 bg-white"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Validé ({statusCounts.valide})
            </Button>

            <Button
              type="button"
              variant={devisFilter === 'FAIT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevisFilter(prev => prev === 'FAIT' ? 'ALL' : 'FAIT')}
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5 border-slate-200 transition-all",
                devisFilter === 'FAIT'
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 font-bold shadow-xs"
                  : "text-amber-700 hover:bg-amber-50 hover:border-amber-300 bg-white"
              )}
            >
              <Check className="w-3.5 h-3.5 text-amber-500" />
              Fait ({statusCounts.fait})
            </Button>

            <Button
              type="button"
              variant={devisFilter === 'ATTENTE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevisFilter(prev => prev === 'ATTENTE' ? 'ALL' : 'ATTENTE')}
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5 border-slate-200 transition-all",
                devisFilter === 'ATTENTE'
                  ? "bg-slate-600 hover:bg-slate-700 text-white border-slate-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:border-slate-300 bg-white"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              En attente ({statusCounts.attente})
            </Button>

            {(searchQuery || spvFilter !== 'ALL' || geometreFilter !== 'ALL' || devisFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSpvFilter('ALL');
                  setGeometreFilter('ALL');
                  setDevisFilter('ALL');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 h-8 px-2 hover:bg-rose-50 ml-1"
              >
                Effacer filtres
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ INTERACTIVE SPREADSHEET TABLE ═══ */}
      <div className="w-full px-4 lg:px-6 flex-1">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border-collapse relative">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap min-w-full">
              {/* EN-TÊTES */}
              <thead className="sticky top-0 z-30 bg-slate-900 text-white font-semibold text-[11px] shadow-sm uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-12 text-center sticky left-0 z-40 bg-slate-900 border-r border-slate-800">
                    N°
                  </th>
                  <th className="px-2 py-3 w-16 text-center sticky left-12 z-40 bg-slate-900 border-r border-slate-800">
                    MAJ
                  </th>
                  <th 
                    onClick={() => handleSort('projet')} 
                    className="px-3 py-3 w-36 sticky left-28 z-40 bg-slate-900 border-r border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>PROJET</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('spv')} className="px-3 py-3 border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    SPV
                  </th>
                  <th onClick={() => handleSort('puissance_kwc')} className="px-3 py-3 text-right border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    kWc
                  </th>
                  <th className="px-3 py-3 border-r border-slate-800">ENR C.</th>
                  <th className="px-3 py-3 border-r border-slate-800">Courtier</th>
                  <th className="px-3 py-3 border-r border-slate-800 min-w-[220px]">Adresse Projet</th>
                  <th className="px-3 py-3 border-r border-slate-800">Modèle</th>
                  <th className="px-3 py-3 border-r border-slate-800">Plan PC/DP</th>
                  <th className="px-3 py-3 border-r border-slate-800">GPS</th>
                  <th className="px-3 py-3 border-r border-slate-800">Tél</th>
                  <th className="px-3 py-3 border-r border-slate-800">Mail</th>
                  <th className="px-3 py-3 border-r border-slate-800">Type Projet</th>
                  <th className="px-3 py-3 border-r border-slate-800 min-w-[180px]">Détail Type</th>
                  <th className="px-3 py-3 border-r border-slate-800">Accord DP</th>
                  <th className="px-3 py-3 border-r border-slate-800">Accord PC</th>
                  <th className="px-3 py-3 border-r border-slate-800">PC</th>
                  <th className="px-3 py-3 border-r border-slate-800">Pièces C.</th>
                  <th className="px-3 py-3 border-r border-slate-800">Unité Fonc.</th>
                  <th className="px-3 py-3 border-r border-slate-800">Fiche Proj.</th>
                  <th onClick={() => handleSort('retour_geometre')} className="px-3 py-3 border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    Retour Géomètre
                  </th>
                  <th onClick={() => handleSort('geometre')} className="px-3 py-3 border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    Géomètre
                  </th>
                  <th onClick={() => handleSort('mtt_ht_devis_geometre')} className="px-3 py-3 text-right border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    Devis Géomètre HT
                  </th>
                  <th onClick={() => handleSort('devis_valide')} className="px-3 py-3 text-center border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    Devis Validé
                  </th>
                  <th className="px-3 py-3 border-r border-slate-800">Géomètre AB6</th>
                  <th onClick={() => handleSort('montant_ht_ab6')} className="px-3 py-3 text-right border-r border-slate-800 cursor-pointer hover:bg-slate-800">
                    Montant AB6 HT
                  </th>
                  <th className="px-3 py-3 border-r border-slate-800 min-w-[240px]">Observ Géomètre</th>
                  <th className="px-3 py-3 border-r border-slate-800 min-w-[140px]">Notaire</th>
                </tr>
              </thead>

              {/* CORPS DU TABLEAU */}
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={29} className="py-16 text-center text-slate-400">
                      Chargement des projets Shanti One...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={29} className="py-16 text-center text-slate-400">
                      Aucun projet ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p, idx) => {
                    const updateCount = Array.isArray(p.__updates) ? p.__updates.length : 0;
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? 'bg-white' : 'bg-slate-50/70';

                    // Helper pour cellule éditable
                    const renderEditableCell = (field, className = '', isNum = false) => {
                      const isEditing = editingCell?.id === p.id && editingCell?.field === field;
                      const rawVal = p[field] ?? '';

                      if (isEditing) {
                        return (
                          <input
                            autoFocus
                            value={cellEditValue}
                            onChange={(e) => setCellEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className={cn('w-full h-full px-2 py-1 bg-blue-50 border border-blue-400 text-xs rounded outline-none', className)}
                          />
                        );
                      }

                      let display = rawVal;
                      if (isNum && typeof rawVal === 'number') {
                        display = rawVal.toLocaleString('fr-FR');
                      }

                      return (
                        <div
                          onClick={() => handleCellClick(p.id, field, rawVal)}
                          className={cn('px-3 py-2 cursor-pointer hover:bg-blue-50/50 transition-colors truncate min-h-[36px] flex items-center', className)}
                          title={String(rawVal)}
                        >
                          {rawVal !== '' ? display : <span className="text-slate-300">-</span>}
                        </div>
                      );
                    };

                    return (
                      <tr key={p.id} className={cn(rowBg, 'hover:bg-blue-50/30 transition-colors group')}>
                        {/* 1. N° */}
                        <td className={cn('px-2 py-2 text-center text-slate-400 text-[11px] sticky left-0 z-20 border-r border-slate-200', rowBg)}>
                          {idx + 1}
                        </td>

                        {/* 2. MAJ BUBBLE */}
                        <td className={cn('px-1 py-1 text-center sticky left-12 z-20 border-r border-slate-200 select-none', rowBg)}>
                          <div className="flex items-center justify-center">
                            <UpdateBubble
                              count={updateCount}
                              onClick={() => setSelectedProjectForUpdates(p)}
                            />
                          </div>
                        </td>

                        {/* 3. PROJET (STICKY) */}
                        <td className={cn('px-3 py-2 font-black text-slate-900 sticky left-28 z-20 border-r border-slate-200 shadow-xs', rowBg)}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{p.projet}</span>
                          </div>
                        </td>

                        {/* SPV */}
                        <td className="border-r border-slate-200">
                          <div className="px-3 py-2 font-semibold text-blue-700">
                            {p.spv || <span className="text-slate-300">-</span>}
                          </div>
                        </td>

                        {/* Puissance (kWc) */}
                        <td className="border-r border-slate-200 text-right">
                          {renderEditableCell('puissance_kwc', 'text-right font-medium', true)}
                        </td>

                        {/* ENR Courtage */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.enr_courtage} />
                        </td>

                        {/* Courtier */}
                        <td className="border-r border-slate-200">
                          {renderEditableCell('courtier')}
                        </td>

                        {/* Adresse Projet */}
                        <td className="border-r border-slate-200 max-w-[280px]">
                          {renderEditableCell('adresse_projet')}
                        </td>

                        {/* Modèle de base */}
                        <td className="border-r border-slate-200 font-mono text-[11px]">
                          {renderEditableCell('modele_base')}
                        </td>

                        {/* Plan PC / DP */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.plan_pc} />
                        </td>

                        {/* GPS */}
                        <td className="border-r border-slate-200 font-mono text-[10.5px] text-slate-500">
                          {renderEditableCell('gps')}
                        </td>

                        {/* Tél */}
                        <td className="border-r border-slate-200 text-slate-600 font-medium">
                          {renderEditableCell('tel')}
                        </td>

                        {/* Mail */}
                        <td className="border-r border-slate-200 text-slate-600">
                          {renderEditableCell('mail')}
                        </td>

                        {/* Type Projet */}
                        <td className="border-r border-slate-200">
                          {renderEditableCell('type_projet_categorie')}
                        </td>

                        {/* Détail Type */}
                        <td className="border-r border-slate-200">
                          {renderEditableCell('type_projet_detail')}
                        </td>

                        {/* ACCORD DP */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.accord_dp} />
                        </td>

                        {/* ACCORD PC */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.accord_pc} />
                        </td>

                        {/* PC */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.pc} />
                        </td>

                        {/* Pièces Complémentaires */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.pieces_complementaires} />
                        </td>

                        {/* Unité Foncière */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.unite_fonciere} />
                        </td>

                        {/* Fiche Projet Géomètre */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.fiche_projet_geometre} />
                        </td>

                        {/* RETOUR GEOMETRE */}
                        <td className="border-r border-slate-200">
                          <div className="px-3 py-2">
                            <StatusBadge value={p.retour_geometre} />
                          </div>
                        </td>

                        {/* GEOMETRE */}
                        <td className="border-r border-slate-200 font-semibold text-slate-800">
                          {renderEditableCell('geometre')}
                        </td>

                        {/* MTT HT DEVIS GEOMETRE */}
                        <td className="border-r border-slate-200 text-right font-medium">
                          {renderEditableCell('mtt_ht_devis_geometre', 'text-right font-bold text-slate-900', true)}
                        </td>

                        {/* DEVIS VALIDE */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.devis_valide} />
                        </td>

                        {/* Géomètre AB6 */}
                        <td className="border-r border-slate-200 text-center">
                          <StatusBadge value={p.geometre_ab6} />
                        </td>

                        {/* Montant HT AB6 */}
                        <td className="border-r border-slate-200 text-right font-medium">
                          {renderEditableCell('montant_ht_ab6', 'text-right', true)}
                        </td>

                        {/* Observ Géomètre */}
                        <td className="border-r border-slate-200 text-slate-600 italic">
                          {renderEditableCell('observ_geometre')}
                        </td>

                        {/* Notaire */}
                        <td className="border-r border-slate-200 font-medium">
                          {renderEditableCell('notaire')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* LIGNE DE TOTALISATION CONSOLIDÉE */}
              {filteredProjects.length > 0 && (
                <tfoot className="sticky bottom-0 z-30 bg-slate-900 text-white font-bold text-xs shadow-md">
                  <tr>
                    <td className="px-3 py-3 text-center sticky left-0 z-40 bg-slate-900 border-r border-slate-800">
                      ∑
                    </td>
                    <td className="px-2 py-3 sticky left-12 z-40 bg-slate-900 border-r border-slate-800 text-center text-slate-400">
                      -
                    </td>
                    <td className="px-3 py-3 sticky left-28 z-40 bg-slate-900 border-r border-slate-800 font-black">
                      TOTAL ({filteredProjects.length})
                    </td>
                    <td className="px-3 py-3 border-r border-slate-800">-</td>
                    <td className="px-3 py-3 text-right border-r border-slate-800 text-emerald-400 font-black">
                      {stats.totalKwc.toLocaleString('fr-FR')} kWc
                    </td>
                    <td colSpan={18} className="px-3 py-3 border-r border-slate-800 text-center text-slate-400 font-normal">
                      Synthèse consolidée des 33 projets
                    </td>
                    <td className="px-3 py-3 text-right border-r border-slate-800 text-emerald-400 font-black">
                      {stats.totalDevisGeometre.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} € HT
                    </td>
                    <td className="px-3 py-3 text-center border-r border-slate-800 text-emerald-300">
                      {stats.validCount} validés
                    </td>
                    <td className="px-3 py-3 border-r border-slate-800">-</td>
                    <td className="px-3 py-3 text-right border-r border-slate-800 text-emerald-400 font-black">
                      {stats.totalAb6.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} € HT
                    </td>
                    <td colSpan={2} className="px-3 py-3 border-r border-slate-800">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ═══ TIROIR LATÉRAL DE MISES À JOUR (DRAWER MONDAY) ═══ */}
      {selectedProjectForUpdates && (
        <MondayUpdatesDrawer
          isOpen={!!selectedProjectForUpdates}
          row={{
            id: selectedProjectForUpdates.id,
            projet: selectedProjectForUpdates.projet,
            data: {
              Nom: `${selectedProjectForUpdates.projet} — ${selectedProjectForUpdates.adresse_projet || ''}`,
              __updates: selectedProjectForUpdates.__updates || []
            }
          }}
          columns={['Nom']}
          tabName={`Shanti One : ${selectedProjectForUpdates.projet}`}
          onClose={() => setSelectedProjectForUpdates(null)}
          onAddUpdate={async (rowId, text) => {
            const project = projects.find(p => p.id === rowId) || selectedProjectForUpdates;
            const newUpd = await addShantiOneUpdate(project, text, user);
            // Mise à jour de l'état local immédiat
            setProjects(prev => prev.map(p => {
              if (p.id === rowId) {
                const updatedList = [newUpd, ...(p.__updates || [])];
                return { ...p, __updates: updatedList };
              }
              return p;
            }));
            setSelectedProjectForUpdates(prev => prev ? { ...prev, __updates: [newUpd, ...(prev.__updates || [])] } : null);
          }}
          onToggleLike={async (rowId, updateId) => {
            const project = projects.find(p => p.id === rowId) || selectedProjectForUpdates;
            await toggleLikeShantiOneUpdate(project, updateId);
            setProjects(prev => prev.map(p => {
              if (p.id === rowId) {
                const list = (p.__updates || []).map(u => u.id === updateId ? { ...u, liked: !u.liked, likes: !u.liked ? (u.likes || 0) + 1 : Math.max(0, (u.likes || 1) - 1) } : u);
                return { ...p, __updates: list };
              }
              return p;
            }));
          }}
          onDeleteUpdate={async (rowId, updateId) => {
            const project = projects.find(p => p.id === rowId) || selectedProjectForUpdates;
            await deleteShantiOneUpdate(project, updateId);
            setProjects(prev => prev.map(p => {
              if (p.id === rowId) {
                const list = (p.__updates || []).filter(u => u.id !== updateId);
                return { ...p, __updates: list };
              }
              return p;
            }));
            setSelectedProjectForUpdates(prev => prev ? { ...prev, __updates: (prev.__updates || []).filter(u => u.id !== updateId) } : null);
          }}
        />
      )}
    </div>
  );
}
