import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, Download, RefreshCw, Plus, Filter, MessageSquare, 
  CheckCircle2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, 
  Building2, Zap, Euro, ShieldCheck, X, FileSpreadsheet, Eye, SlidersHorizontal, Trash2,
  Clock, Check, Edit2, RotateCcw, ArrowLeftRight, ChevronLeft, ChevronRight
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

// Options de statuts prédéfinis pour les badges
const STATUS_PRESETS = {
  retour_geometre: [
    '1 - DEMANDE EN COURS',
    'TRANSMIS GEOMETRE',
    '3 - DEVIS RECU',
    '5 - EN COURS GEOMETRE',
    '6 - PLAN IMPLANT RECU',
    '7 - DA RECU'
  ],
  devis_valide: [
    'VALIDE',
    'FAIT',
    'EN ATTENTE',
    'NON',
    'A RELANCER'
  ],
  plan_pc: [
    'OK',
    'FAIT',
    'EN COURS',
    'A FAIRE',
    'NON'
  ],
  enr_courtage: [
    'VALIDE',
    'FAIT',
    'EN COURS',
    'NON',
    'OK'
  ],
  geometre_ab6: [
    'VALIDE',
    'FAIT',
    'EN COURS',
    'EN ATTENTE',
    'NON'
  ]
};

// Formateur de statuts avec badges de couleur
const StatusBadge = ({ value }) => {
  if (!value || String(value).trim() === '') return <span className="text-slate-300">-</span>;
  const str = String(value).trim();
  const lower = str.toLowerCase();

  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (lower === 'valide' || lower === 'validé' || lower.includes('plan implant recu') || lower === 'ok') {
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  } else if (lower === 'fait' || lower.includes('devis recu')) {
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-medium';
  } else if (lower.includes('transmis') || lower.includes('cours') || lower === 'envoye' || lower === 'envoyé' || lower.includes('da recu')) {
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-medium';
  } else if (lower === 'non' || lower.includes('refus')) {
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] border leading-tight whitespace-nowrap', badgeClass)}>
      {str}
    </span>
  );
};

// Configuration par défaut des colonnes du tableau
const DEFAULT_COLUMNS = [
  { id: 'no', label: 'N°', width: 48, minWidth: 40, sticky: true, fixed: true },
  { id: 'maj', label: 'MAJ', width: 56, minWidth: 50, sticky: true, fixed: true },
  { id: 'projet', label: 'PROJET', width: 170, minWidth: 120, sticky: true, fixed: true, sortable: true },
  { id: 'spv', label: 'SPV', width: 120, minWidth: 80, sortable: true, editable: true, type: 'text' },
  { id: 'puissance_kwc', label: 'kWc', width: 85, minWidth: 60, sortable: true, editable: true, type: 'number', align: 'right' },
  { id: 'enr_courtage', label: 'ENR C.', width: 95, minWidth: 70, editable: true, type: 'badge_enr', align: 'center' },
  { id: 'courtier', label: 'Courtier', width: 110, minWidth: 80, editable: true, type: 'text' },
  { id: 'adresse_projet', label: 'Adresse Projet', width: 230, minWidth: 150, editable: true, type: 'text' },
  { id: 'modele_base', label: 'Modèle', width: 100, minWidth: 80, editable: true, type: 'text' },
  { id: 'plan_pc', label: 'Plan PC/DP', width: 110, minWidth: 80, editable: true, type: 'badge_plan', align: 'center' },
  { id: 'gps', label: 'GPS', width: 130, minWidth: 90, editable: true, type: 'text' },
  { id: 'tel', label: 'Tél', width: 110, minWidth: 80, editable: true, type: 'text' },
  { id: 'mail', label: 'Mail', width: 180, minWidth: 100, editable: true, type: 'text' },
  { id: 'type_projet_categorie', label: 'Type Projet', width: 120, minWidth: 90, editable: true, type: 'text' },
  { id: 'type_projet_detail', label: 'Détail Type', width: 170, minWidth: 120, editable: true, type: 'text' },
  { id: 'retour_geometre', label: 'Retour Géomètre', width: 210, minWidth: 150, sortable: true, editable: true, type: 'badge_geometre' },
  { id: 'geometre', label: 'Géomètre', width: 130, minWidth: 90, sortable: true, editable: true, type: 'text' },
  { id: 'mtt_ht_devis_geometre', label: 'Devis Géomètre HT', width: 140, minWidth: 100, sortable: true, editable: true, type: 'number', align: 'right' },
  { id: 'devis_valide', label: 'Devis Validé', width: 115, minWidth: 90, sortable: true, editable: true, type: 'badge_devis', align: 'center' },
  { id: 'geometre_ab6', label: 'Géomètre AB6', width: 115, minWidth: 90, editable: true, type: 'badge_ab6', align: 'center' },
  { id: 'montant_ht_ab6', label: 'Montant AB6 HT', width: 125, minWidth: 95, sortable: true, editable: true, type: 'number', align: 'right' },
  { id: 'observ_geometre', label: 'Observ Géomètre', width: 230, minWidth: 140, editable: true, type: 'text' },
  { id: 'notaire', label: 'Notaire', width: 140, minWidth: 90, editable: true, type: 'text' },
];

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

  // Configuration dynamique des colonnes
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('shanti_one_columns_config_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => {
            const def = DEFAULT_COLUMNS.find(d => d.id === c.id);
            return def ? { ...def, ...c } : c;
          });
        }
      }
    } catch (e) {
      console.warn('[ShantiOne] Erreur chargement config colonnes:', e);
    }
    return DEFAULT_COLUMNS;
  });

  // Sauvegarde persistante des colonnes
  useEffect(() => {
    try {
      localStorage.setItem('shanti_one_columns_config_v3', JSON.stringify(columns));
    } catch (_) {}
  }, [columns]);

  // État pour renommage de colonne
  const [renamingColId, setRenamingColId] = useState(null);
  const [renameInputVal, setRenameInputVal] = useState('');

  // État pour ajout d'une colonne
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');

  // État pour édition de cellule
  const [editingCell, setEditingCell] = useState(null); // { id, field, type }
  const [cellEditValue, setCellEditValue] = useState('');
  const [isCustomStatus, setIsCustomStatus] = useState(false);
  const [customStatusValue, setCustomStatusValue] = useState('');

  // Refs et états pour la barre de défilement horizontal visible à toute hauteur
  const tableContainerRef = useRef(null);
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(3200);

  // Synchronisation bidirectionnelle du défilement horizontal entre le tableau et les barres
  const syncScroll = useCallback((source, target1, target2) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const scrollLeft = source.scrollLeft;
    if (target1 && target1.scrollLeft !== scrollLeft) target1.scrollLeft = scrollLeft;
    if (target2 && target2.scrollLeft !== scrollLeft) target2.scrollLeft = scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleTableScroll = useCallback((e) => {
    syncScroll(e.currentTarget, topScrollRef.current, bottomScrollRef.current);
  }, [syncScroll]);

  const handleTopScroll = useCallback((e) => {
    syncScroll(e.currentTarget, tableContainerRef.current, bottomScrollRef.current);
  }, [syncScroll]);

  const handleBottomScroll = useCallback((e) => {
    syncScroll(e.currentTarget, tableContainerRef.current, topScrollRef.current);
  }, [syncScroll]);

  // Observer la largeur réelle de défilement du tableau
  useEffect(() => {
    const updateScrollWidth = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
      }
    };
    updateScrollWidth();
    let observer;
    if (typeof ResizeObserver !== 'undefined' && tableContainerRef.current) {
      observer = new ResizeObserver(updateScrollWidth);
      observer.observe(tableContainerRef.current);
    }
    window.addEventListener('resize', updateScrollWidth);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateScrollWidth);
    };
  }, [columns, projects]);

  // Calcul des coordonnées sticky (left en px) pour éviter tout chevauchement
  const stickyOffsets = useMemo(() => {
    const offsets = {};
    let currentLeft = 0;
    columns.forEach(col => {
      if (col.sticky) {
        offsets[col.id] = currentLeft;
        currentLeft += (col.width || 100);
      }
    });
    return offsets;
  }, [columns]);

  // Gestion de la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEditingCell(null);
        setIsCustomStatus(false);
        setRenamingColId(null);
        setIsAddColumnOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Redimensionnement de colonne au curseur (drag handle)
  const handleMouseDownResize = (e, colId, currentWidth) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;

    const onMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(45, Math.round(currentWidth + diff));
      setColumns(prev => prev.map(c => c.id === colId ? { ...c, width: newWidth } : c));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Renommage d'une colonne
  const handleStartRename = (col) => {
    setRenamingColId(col.id);
    setRenameInputVal(col.label);
  };

  const handleSaveRename = () => {
    if (renamingColId && renameInputVal.trim()) {
      setColumns(prev => prev.map(c => c.id === renamingColId ? { ...c, label: renameInputVal.trim() } : c));
      toast({ title: 'Colonne renommée', description: `Nouveau titre : ${renameInputVal.trim()}` });
    }
    setRenamingColId(null);
  };

  // Suppression d'une colonne
  const handleDeleteColumn = (colId, colLabel) => {
    if (!window.confirm(`Masquer la colonne "${colLabel}" ?`)) return;
    setColumns(prev => prev.filter(c => c.id !== colId));
    toast({ title: 'Colonne masquée', description: `La colonne "${colLabel}" a été masquée du tableau.` });
  };

  // Réinitialisation des colonnes par défaut
  const handleResetColumns = () => {
    if (!window.confirm('Rétablir la disposition et la largeur d\'origine de toutes les colonnes ?')) return;
    localStorage.removeItem('shanti_one_columns_config_v3');
    setColumns(DEFAULT_COLUMNS);
    toast({ title: 'Colonnes réinitialisées', description: 'Configuration d\'origine rétablie.' });
  };

  // Ajout d'une nouvelle colonne
  const handleAddColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const colId = 'col_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newCol = {
      id: colId,
      label: newColName.trim(),
      width: 150,
      minWidth: 80,
      editable: true,
      type: newColType,
      removable: true
    };
    setColumns(prev => [...prev, newCol]);
    setIsAddColumnOpen(false);
    setNewColName('');
    setNewColType('text');
    toast({ title: 'Colonne ajoutée', description: `La colonne "${newCol.label}" a été ajoutée.` });
  };

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

    const totalGeometresHT = totalDevisGeometre + totalAb6;

    return { totalKwc, totalDevisGeometre, totalAb6, totalGeometresHT, validCount };
  }, [filteredProjects]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: 'rowIdx', direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Édition de cellule générique
  const handleCellClick = (id, field, currentValue, type) => {
    setEditingCell({ id, field, type });
    setCellEditValue(currentValue ?? '');
    setIsCustomStatus(false);
    setCustomStatusValue(currentValue ?? '');
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { id, field, type } = editingCell;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    let newValue = cellEditValue;
    if (type === 'number' || ['puissance_kwc', 'mtt_ht_devis_geometre', 'montant_ht_ab6'].includes(field)) {
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

  // Sauvegarde directe (1 clic) pour les sélections de statuts / badges
  const handleDirectSave = async (id, field, value) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setEditingCell(null);
    setIsCustomStatus(false);

    try {
      await updateShantiOneProject(id, { [field]: value }, user);
    } catch (err) {
      console.error(`[ShantiOne] Erreur mise à jour directe ${field}:`, err);
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
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-6 w-full">
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddColumnOpen(true)}
              className="text-xs font-semibold h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" />
              + Colonne
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetColumns}
              title="Rétablir colonnes par défaut"
              className="text-xs font-medium h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Colonnes par défaut
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportShantiOneToExcel(filteredProjects, columns)}
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

        {/* KPI Cards avec couleurs de fond et regroupement des géomètres (AB6 inclus) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3 pt-3 border-t border-slate-100">
          {/* 1. Puissance Totale */}
          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 border border-amber-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Puissance totale</span>
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shadow-2xs">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
              {stats.totalKwc.toLocaleString('fr-FR')} <span className="text-xs font-bold text-amber-700 ml-0.5">kWc</span>
            </div>
            <div className="text-[11px] font-medium text-amber-700/85 mt-1.5 flex items-center justify-between">
              <span>{filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''} suivi{filteredProjects.length > 1 ? 's' : ''}</span>
              {filteredProjects.length > 0 && (
                <span className="font-semibold">Moy. {(stats.totalKwc / filteredProjects.length).toFixed(0)} kWc</span>
              )}
            </div>
          </div>

          {/* 2. Total Devis Géomètres HT (AB6 + autres géomètres regroupés) */}
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-sky-100/40 border border-blue-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Total Devis Géomètres HT</span>
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shadow-2xs">
                <Euro className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
              {stats.totalGeometresHT.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-blue-700 ml-0.5">€ HT</span>
            </div>
            <div className="text-[11px] font-medium text-blue-700/85 mt-1.5 flex items-center justify-between gap-1">
              <span>AB6 & tous géomètres</span>
              <span className="text-[10.5px] bg-blue-100/90 text-blue-800 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                Dont AB6 : {stats.totalAb6.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
              </span>
            </div>
          </div>

          {/* 3. Devis Validés */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-100/40 border border-emerald-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Devis Validés</span>
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 flex items-center gap-1.5">
              {stats.validCount} <span className="text-xs font-bold text-emerald-700">dossier{stats.validCount > 1 ? 's' : ''}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-700/85 mt-1.5 flex items-center justify-between gap-1">
              <span>Taux de validation</span>
              <span className="text-[10.5px] bg-emerald-100/90 text-emerald-800 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                {filteredProjects.length > 0 ? Math.round((stats.validCount / filteredProjects.length) * 100) : 0}% des projets
              </span>
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

          {/* Boutons pour les 3 statuts de devis */}
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
      <div className="w-full px-4 lg:px-6 flex-1 flex flex-col">
        <style>{`
          .shanti-scrollbar::-webkit-scrollbar {
            height: 9px;
            width: 8px;
          }
          .shanti-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .shanti-scrollbar::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          .shanti-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .shanti-dark-scrollbar::-webkit-scrollbar {
            height: 9px;
          }
          .shanti-dark-scrollbar::-webkit-scrollbar-track {
            background: #0f172a;
          }
          .shanti-dark-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
          }
          .shanti-dark-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* BARRE DE DÉFILEMENT HORIZONTAL SUPÉRIEURE (Accessible immédiatement sans devoir descendre) */}
          <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-3 text-slate-600 text-xs select-none">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 shrink-0">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Défilement horizontal :</span>
            </div>

            {/* Piste de défilement horizontal synchronisée */}
            <div 
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="flex-1 overflow-x-auto overflow-y-hidden h-3.5 rounded bg-slate-200/80 hover:bg-slate-200 transition-colors cursor-pointer shanti-scrollbar"
              style={{ scrollbarWidth: 'auto' }}
              title="Faites glisser cette barre pour faire défiler les colonnes horizontalement"
            >
              <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
            </div>

            {/* Boutons de défilement rapide */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (tableContainerRef.current) {
                    tableContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
                  }
                }}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs hover:text-blue-600 transition-colors flex items-center gap-0.5 text-[11px] font-medium"
                title="Faire défiler vers la gauche"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Gauche</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (tableContainerRef.current) {
                    tableContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
                  }
                }}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs hover:text-blue-600 transition-colors flex items-center gap-0.5 text-[11px] font-medium"
                title="Faire défiler vers la droite"
              >
                <span className="hidden md:inline">Droite</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CONTENEUR DU TABLEAU AVEC DÉFILEMENT BIDIRECTIONNEL */}
          <div 
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-285px)] min-h-[400px] border-collapse relative shanti-scrollbar"
          >
            <table className="border-collapse text-left text-xs whitespace-nowrap" style={{ width: 'max-content', minWidth: '100%' }}>
              {/* EN-TÊTES */}
              <thead className="sticky top-0 z-30 bg-slate-900 text-white font-semibold text-[11px] shadow-sm uppercase tracking-wider">
                <tr>
                  {columns.map(col => {
                    const isSticky = Boolean(col.sticky);
                    const leftPos = isSticky ? stickyOffsets[col.id] : undefined;
                    const isRenaming = renamingColId === col.id;

                    return (
                      <th
                        key={col.id}
                        style={{
                          width: `${col.width}px`,
                          minWidth: `${col.width}px`,
                          maxWidth: `${col.width}px`,
                          ...(isSticky ? { position: 'sticky', left: `${leftPos}px`, zIndex: 40 } : {})
                        }}
                        className={cn(
                          "px-2.5 py-3 border-r border-slate-800 select-none relative group/th bg-slate-900",
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden pr-2">
                          {isRenaming ? (
                            <input
                              autoFocus
                              type="text"
                              value={renameInputVal}
                              onChange={(e) => setRenameInputVal(e.target.value)}
                              onBlur={handleSaveRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename();
                                if (e.key === 'Escape') setRenamingColId(null);
                              }}
                              className="w-full bg-slate-800 text-white px-1.5 py-0.5 rounded text-[11px] border border-blue-400 outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!col.fixed) handleStartRename(col);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!col.fixed) handleStartRename(col);
                              }}
                              title={col.fixed ? col.label : "Cliquer pour modifier le titre"}
                              className={cn(
                                "truncate font-bold", 
                                !col.fixed && "cursor-pointer hover:text-blue-300 transition-colors"
                              )}
                            >
                              {col.label}
                            </span>
                          )}

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Bouton de tri dédié : Le tri ne se déclenche QUE lors du clic sur ce bouton */}
                            {col.sortable && !isRenaming && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSort(col.id);
                                }}
                                title={
                                  sortConfig.key === col.id
                                    ? (sortConfig.direction === 'asc' ? 'Trié croissant (cliquer pour décroissant)' : 'Trié décroissant (cliquer pour annuler le tri)')
                                    : `Cliquer sur ce symbole pour trier par ${col.label}`
                                }
                                className={cn(
                                  "p-1 rounded transition-colors flex items-center justify-center cursor-pointer",
                                  sortConfig.key === col.id 
                                    ? "text-blue-400 bg-slate-800 hover:bg-slate-700 ring-1 ring-blue-500/40" 
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                              >
                                {sortConfig.key === col.id ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            
                            {/* Bouton pour renommer au survol */}
                            {!isRenaming && !col.fixed && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(col);
                                }}
                                title="Renommer la colonne"
                                className="opacity-0 group-hover/th:opacity-100 transition-opacity p-0.5 hover:text-blue-400 cursor-pointer"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            )}

                            {/* Bouton pour masquer/supprimer au survol */}
                            {!col.fixed && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteColumn(col.id, col.label);
                                }}
                                title="Masquer cette colonne"
                                className="opacity-0 group-hover/th:opacity-100 transition-opacity p-0.5 hover:text-rose-400 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Poignée de redimensionnement de la colonne */}
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, col.id, col.width)}
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-emerald-500/70 select-none z-50 transition-colors"
                          title="Glisser pour redimensionner"
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* CORPS DU TABLEAU */}
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                      Chargement des projets Shanti One...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                      Aucun projet ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p, idx) => {
                    const updateCount = Array.isArray(p.__updates) ? p.__updates.length : 0;
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? 'bg-white' : 'bg-slate-50/70';

                    return (
                      <tr key={p.id} className={cn(rowBg, 'hover:bg-blue-50/30 transition-colors group')}>
                        {columns.map(col => {
                          const isSticky = Boolean(col.sticky);
                          const leftPos = isSticky ? stickyOffsets[col.id] : undefined;
                          const cellStyle = {
                            width: `${col.width}px`,
                            minWidth: `${col.width}px`,
                            maxWidth: `${col.width}px`,
                            ...(isSticky ? { position: 'sticky', left: `${leftPos}px`, zIndex: 20 } : {})
                          };

                          // 1. Colonne N°
                          if (col.id === 'no') {
                            return (
                              <td
                                key={col.id}
                                style={cellStyle}
                                className={cn("px-2 py-2 text-center text-slate-400 text-[11px] border-r border-slate-200", rowBg)}
                              >
                                {idx + 1}
                              </td>
                            );
                          }

                          // 2. Colonne MAJ Bubble
                          if (col.id === 'maj') {
                            return (
                              <td
                                key={col.id}
                                style={cellStyle}
                                className={cn("px-1 py-1 text-center border-r border-slate-200 select-none", rowBg)}
                              >
                                <div className="flex items-center justify-center">
                                  <UpdateBubble
                                    count={updateCount}
                                    onClick={() => setSelectedProjectForUpdates(p)}
                                  />
                                </div>
                              </td>
                            );
                          }

                          // 3. Colonne Projet (Sticky)
                          if (col.id === 'projet') {
                            return (
                              <td
                                key={col.id}
                                style={cellStyle}
                                className={cn("px-3 py-2 font-black text-slate-900 border-r border-slate-200 shadow-xs", rowBg)}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate" title={p.projet}>{p.projet}</span>
                                </div>
                              </td>
                            );
                          }

                          // 4. Colonnes de type Statut / Badge (retour_geometre, devis_valide, plan_pc, enr_courtage, etc.)
                          const isBadgeCol = col.type?.startsWith('badge_') || ['retour_geometre', 'devis_valide', 'plan_pc', 'enr_courtage', 'geometre_ab6'].includes(col.id);
                          if (isBadgeCol) {
                            const isEditing = editingCell?.id === p.id && editingCell?.field === col.id;
                            const presets = STATUS_PRESETS[col.id] || STATUS_PRESETS.retour_geometre;
                            const rawVal = p[col.id];

                            return (
                              <td
                                key={col.id}
                                style={cellStyle}
                                className="border-r border-slate-200 relative p-0"
                              >
                                {isEditing ? (
                                  <div className="relative p-1">
                                    {/* Backdrop invisible pour fermer au clic en dehors */}
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell(null);
                                        setIsCustomStatus(false);
                                      }}
                                    />

                                    {/* Menu contextuel de sélection de statut */}
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={cn(
                                        "absolute left-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 min-w-[250px] text-left",
                                        idx > filteredProjects.length - 6 ? "bottom-full mb-1" : "top-full mt-1"
                                      )}
                                    >
                                      {!isCustomStatus ? (
                                        <div className="space-y-1">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1 flex items-center justify-between border-b border-slate-100 mb-1">
                                            <span>{col.label}</span>
                                            <span className="text-[9px] text-slate-400 font-normal">1 clic pour choisir</span>
                                          </div>

                                          <div className="space-y-0.5 max-h-56 overflow-y-auto">
                                            {presets.map((opt) => {
                                              const isSelected = String(rawVal || '').toLowerCase() === String(opt).toLowerCase();
                                              return (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  onClick={() => handleDirectSave(p.id, col.id, opt)}
                                                  className={cn(
                                                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-100 transition-colors",
                                                    isSelected && "bg-blue-50/80 ring-1 ring-blue-300 font-bold"
                                                  )}
                                                >
                                                  <StatusBadge value={opt} />
                                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                                                </button>
                                              );
                                            })}
                                          </div>

                                          {rawVal && !presets.map(o => o.toLowerCase()).includes(String(rawVal).toLowerCase()) && (
                                            <div className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 flex items-center justify-between my-1">
                                              <div className="truncate">
                                                <span className="text-[10px] text-slate-400 block">Valeur actuelle :</span>
                                                <span className="font-semibold text-slate-800">{rawVal}</span>
                                              </div>
                                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                                            </div>
                                          )}

                                          <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex flex-col gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setIsCustomStatus(true);
                                                setCustomStatusValue(rawVal || '');
                                              }}
                                              className="w-full text-left px-2.5 py-1.5 rounded text-xs text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
                                            >
                                              <span>✏️ Saisie personnalisée...</span>
                                            </button>
                                            {rawVal && (
                                              <button
                                                type="button"
                                                onClick={() => handleDirectSave(p.id, col.id, '')}
                                                className="w-full text-left px-2.5 py-1 rounded text-[11px] text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                                              >
                                                <span>✕ Vider le champ</span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2 p-1">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Saisie libre {col.label}
                                          </div>
                                          <input
                                            autoFocus
                                            type="text"
                                            value={customStatusValue}
                                            onChange={(e) => setCustomStatusValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleDirectSave(p.id, col.id, customStatusValue.trim());
                                              } else if (e.key === 'Escape') {
                                                setIsCustomStatus(false);
                                              }
                                            }}
                                            placeholder="Ex: TRANSMIS / RELANCE"
                                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-blue-500 outline-none"
                                          />
                                          <div className="flex items-center justify-end gap-1.5 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => setIsCustomStatus(false)}
                                              className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                                            >
                                              Retour
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDirectSave(p.id, col.id, customStatusValue.trim())}
                                              className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 shadow-xs"
                                            >
                                              Enregistrer
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => handleCellClick(p.id, col.id, rawVal, col.type)}
                                    className={cn(
                                      "px-3 py-2 cursor-pointer hover:bg-blue-50/60 rounded flex items-center group/cell transition-colors min-h-[36px]",
                                      col.align === 'center' ? 'justify-center' : 'justify-between'
                                    )}
                                    title="Cliquer pour modifier"
                                  >
                                    <StatusBadge value={rawVal} />
                                    {col.align !== 'center' && (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          }

                          // 5. Autres colonnes textuelles ou numériques éditables
                          const isEditing = editingCell?.id === p.id && editingCell?.field === col.id;
                          const rawVal = p[col.id] ?? '';

                          if (isEditing) {
                            return (
                              <td key={col.id} style={cellStyle} className="border-r border-slate-200 p-0">
                                <input
                                  autoFocus
                                  type={col.type === 'number' ? 'number' : 'text'}
                                  step="any"
                                  value={cellEditValue}
                                  onChange={(e) => setCellEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full h-full px-2.5 py-2 bg-blue-50 border-2 border-blue-500 text-xs rounded outline-none font-medium text-slate-900"
                                />
                              </td>
                            );
                          }

                          let displayVal = rawVal;
                          if (col.type === 'number' && typeof rawVal === 'number') {
                            displayVal = rawVal.toLocaleString('fr-FR');
                          }

                          return (
                            <td
                              key={col.id}
                              style={cellStyle}
                              onClick={() => handleCellClick(p.id, col.id, rawVal, col.type)}
                              className={cn(
                                "border-r border-slate-200 px-3 py-2 cursor-pointer hover:bg-blue-50/50 transition-colors min-h-[36px]",
                                col.align === 'right' ? 'text-right font-medium' : col.align === 'center' ? 'text-center' : 'text-left',
                                col.id === 'spv' && 'font-semibold text-blue-700'
                              )}
                              title={String(rawVal)}
                            >
                              <div className="truncate">
                                {rawVal !== '' ? displayVal : <span className="text-slate-300">-</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* LIGNE DE TOTALISATION CONSOLIDÉE */}
              {filteredProjects.length > 0 && (
                <tfoot className="sticky bottom-0 z-30 bg-slate-900 text-white font-bold text-xs shadow-md">
                  <tr>
                    {columns.map(col => {
                      const isSticky = Boolean(col.sticky);
                      const leftPos = isSticky ? stickyOffsets[col.id] : undefined;
                      const cellStyle = {
                        width: `${col.width}px`,
                        minWidth: `${col.width}px`,
                        maxWidth: `${col.width}px`,
                        ...(isSticky ? { position: 'sticky', left: `${leftPos}px`, zIndex: 40 } : {})
                      };

                      if (col.id === 'no') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-3 py-3 text-center bg-slate-900 border-r border-slate-800">
                            ∑
                          </td>
                        );
                      }
                      if (col.id === 'maj') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-2 py-3 text-center text-slate-400 bg-slate-900 border-r border-slate-800">
                            -
                          </td>
                        );
                      }
                      if (col.id === 'projet') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-3 py-3 font-black bg-slate-900 border-r border-slate-800">
                            TOTAL ({filteredProjects.length})
                          </td>
                        );
                      }
                      if (col.id === 'puissance_kwc') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-3 py-3 text-right text-emerald-400 font-black border-r border-slate-800">
                            {stats.totalKwc.toLocaleString('fr-FR')} kWc
                          </td>
                        );
                      }
                      if (col.id === 'mtt_ht_devis_geometre') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-3 py-3 text-right text-emerald-400 font-black border-r border-slate-800">
                            {stats.totalDevisGeometre.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} € HT
                          </td>
                        );
                      }
                      if (col.id === 'montant_ht_ab6') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-3 py-3 text-right text-emerald-400 font-black border-r border-slate-800">
                            {stats.totalAb6.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} € HT
                          </td>
                        );
                      }
                      if (col.id === 'devis_valide') {
                        return (
                          <td key={col.id} style={cellStyle} className="px-3 py-3 text-center text-emerald-300 font-bold border-r border-slate-800">
                            {stats.validCount} validés
                          </td>
                        );
                      }

                      return (
                        <td key={col.id} style={cellStyle} className="px-3 py-3 text-center text-slate-400 border-r border-slate-800">
                          -
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* BARRE DE DÉFILEMENT HORIZONTAL INFÉRIEURE FLOTTANTE / COLLANTE */}
          <div 
            ref={bottomScrollRef}
            onScroll={handleBottomScroll}
            className="sticky bottom-0 z-35 w-full overflow-x-auto overflow-y-hidden bg-slate-900 border-t border-slate-700 py-1 shadow-md select-none shanti-dark-scrollbar"
            style={{ height: '14px', scrollbarWidth: 'auto' }}
            title="Barre de défilement horizontal (synchronisée)"
          >
            <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
          </div>
        </div>
      </div>

      {/* ═══ MODAL AJOUT DE COLONNE ═══ */}
      {isAddColumnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-800 text-sm">Ajouter une colonne</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddColumnOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddColumnSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nom de la colonne
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="Ex: Date dépôt mairie, Référence client..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Type de données
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                >
                  <option value="text">Texte libre</option>
                  <option value="number">Nombre / Montant</option>
                  <option value="badge_select">Statut / Badge de couleur</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddColumnOpen(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Ajouter au tableau
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
