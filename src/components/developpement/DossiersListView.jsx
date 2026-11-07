import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Folder, Search, MapPin, Zap, User, UserCheck, Building, Sun, Battery,
  CheckCircle2, Clock, AlertCircle, XCircle, Calendar, MessageSquare,
  Filter, Sparkles, Check, TrendingUp, FileText
} from 'lucide-react';
import { getUserColor } from '@/lib/utils';
import { apiService } from '@/services/api';
import { BESS_PORTFOLIO_SITES, getProjectBessPortfolio, normalizePortfolioName } from '@/data/bessPortfolioData';

/**
 * DossiersListView — Vue Monday.com des dossiers de développement (sur 2 lignes par projet)
 * Contient le toggle "Mes projets", filtres par statut colorés, lignes épaisses 2 lignes,
 * pourcentage d'avancement sur 7 étapes (urbanisme, mandatement, raccordement...),
 * zone commentaire élargie en hauteur, synchronisation stricte CRM du nom de projet et chef de projet.
 */
export default function DossiersListView({
  projects = [],
  currentUser,
  onSelectProject,
  activeProjectId
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMyProjects, setOnlyMyProjects] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['all']);
  const [selectedPortfolio, setSelectedPortfolio] = useState('all'); // 'all' | 'VOLTA' | 'FARADAY'
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  // Configuration des statuts façon Monday.com
  const STATUS_CONFIG = {
    all: { label: 'Tous', bg: 'bg-slate-700', text: 'text-white' },
    nouveau: { label: 'En attente', bg: 'bg-[#0073ea]', text: 'text-white', lightBg: 'bg-blue-50', border: 'border-blue-200' },
    en_cours: { label: 'En cours', bg: 'bg-[#fdab3d]', text: 'text-white', lightBg: 'bg-amber-50', border: 'border-amber-200' },
    termine: { label: 'Terminé', bg: 'bg-[#00c875]', text: 'text-white', lightBg: 'bg-emerald-50', border: 'border-emerald-200' },
    abandonne: { label: 'Abandonné', bg: 'bg-[#e2445c]', text: 'text-white', lightBg: 'bg-rose-50', border: 'border-rose-200' },
  };

  const formatUpdatedDate = (dateVal) => {
    if (!dateVal) return '14/08/2026';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '14/08/2026';
    return d.toLocaleDateString('fr-FR');
  };

  const getFullProjectName = (p) => {
    if (!p) return 'Projet sans nom';
    if (p.projectName) return p.projectName;
    const parts = [p.name, p.zip || p.zipCode, p.city].filter(Boolean);
    if (parts.length > 1) return parts.join(' ').toUpperCase();
    return p.name || 'Projet sans nom';
  };

  const getChefProjet = (p) => {
    const chef = p.assignedUser || p.chef_projet || p.chefProjet || p.project_manager || p.manager;
    return (chef && chef !== 'Contact' && chef !== '-') ? chef : '-';
  };

  const getCommercial = (p) => {
    return p.commercial || p.commercial_name || p.assignedTo || '-';
  };

  // Récupération intelligente et normalisée du numéro d'enregistrement officiel (DP, PC ou CU)
  const getProjectRegisteredNumber = (p) => {
    if (!p) return null;
    const steps = p.devWorkflow || p.workflow || p.stepsState || {};

    // 1. Déclaration Préalable (DP prioritaire)
    const dpNum = p.dp_registration_number || 
      p.numero_dp || 
      p.num_dp || 
      p.dpNumber || 
      p.dp_num || 
      p.dp_numero || 
      steps.dp?.registrationNumber || 
      steps.dp?.dpNumber;

    if (dpNum && String(dpNum).trim()) {
      const raw = String(dpNum).trim();
      return {
        type: 'DP',
        raw,
        label: raw.toUpperCase().startsWith('DP') ? raw : `DP ${raw}`
      };
    }

    // 2. Permis de Construire (PC)
    const pcNum = p.pc_registration_number || 
      p.numero_pc || 
      p.num_pc || 
      p.pcNumber || 
      steps.pc?.registrationNumber;

    if (pcNum && String(pcNum).trim()) {
      const raw = String(pcNum).trim();
      return {
        type: 'PC',
        raw,
        label: raw.toUpperCase().startsWith('PC') ? raw : `PC ${raw}`
      };
    }

    // 3. Certificat d'Urbanisme (CU)
    const cuNum = p.cu_registration_number || 
      p.numero_cu || 
      p.num_cu || 
      p.cuNumber || 
      steps.cu?.registrationNumber;

    if (cuNum && String(cuNum).trim()) {
      const raw = String(cuNum).trim();
      return {
        type: 'CU',
        raw,
        label: raw.toUpperCase().startsWith('CU') ? raw : `CU ${raw}`
      };
    }

    return null;
  };

  // Calcul du % d'avancement strict sur 7 étapes pour chaque projet
  const getProjectDevProgress = (p) => {
    let steps = p.devWorkflow || p.workflow || p.stepsState;
    if (!steps && p.id) {
      try {
        const local = localStorage.getItem(`nelson_workflow_${p.id}`);
        if (local) steps = JSON.parse(local);
      } catch {}
    }
    if (!steps) return { count: 0, totalSteps: 7, percent: 0 };

    let count = 0;
    const totalSteps = 7;
    if (steps.dp?.status === 'validated' || steps.pc?.status === 'validated') count += 1;
    if (steps.huissier?.status === 'validated') count += 1;
    if (steps.geometre?.status === 'validated') count += 1;
    if (steps.notaire?.status === 'validated') count += 1;
    if (steps.raccordement?.status === 'validated') count += 1;
    if (steps.aos_ao?.status === 'validated') count += 1;
    if (steps.consuel?.status === 'validated') count += 1;

    const percent = Math.round((count / totalSteps) * 100);
    return { count, totalSteps, percent };
  };

  // Calcul du statut de développement réel du dossier
  const getProjectDevStatus = (p) => {
    if (!p) return 'nouveau';

    // 1. Statut explicite si présent
    const explicitStatus = p.devStatus || p.statut_developpement || p.developmentStatus || p.development_status;
    if (explicitStatus) {
      const s = String(explicitStatus).toLowerCase();
      if (s.includes('termin') || s.includes('valid') || s.includes('conforme') || s.includes('gagn')) return 'termine';
      if (s.includes('abandon') || s.includes('refus') || s.includes('perdu') || s.includes('annul')) return 'abandonne';
      if (s.includes('cours') || s.includes('progress')) return 'en_cours';
      if (s.includes('nouveau') || s.includes('attente') || s.includes('prospect') || s.includes('draft') || s.includes('pending')) return 'nouveau';
    }

    // 2. Vérification des étapes du workflow de développement
    let steps = p.devWorkflow || p.workflow || p.stepsState;
    if (!steps && p.id) {
      try {
        const local = localStorage.getItem(`nelson_workflow_${p.id}`);
        if (local) steps = JSON.parse(local);
      } catch {}
    }

    if (steps && typeof steps === 'object') {
      const stepValues = Object.values(steps);
      const hasRejected = stepValues.some(s => s && (s.status === 'rejected' || s.status === 'abandonne'));
      const allRejectedOrPending = stepValues.length > 0 && stepValues.every(s => !s || s.status === 'rejected' || s.status === 'abandonne' || s.status === 'pending');
      if (hasRejected && allRejectedOrPending) {
        return 'abandonne';
      }

      const hasInProgress = stepValues.some(s => s && (s.status === 'in_progress' || s.status === 'en_cours'));
      const { count, totalSteps, percent } = getProjectDevProgress(p);

      if (percent === 100 || count >= totalSteps) return 'termine';
      if (hasInProgress || count > 0) return 'en_cours';
      return 'nouveau';
    }

    return 'nouveau';
  };

  const handleToggleStatus = (statusKey) => {
    if (statusKey === 'all') {
      setSelectedStatuses(['all']);
      return;
    }
    let updated = selectedStatuses.filter(s => s !== 'all');
    if (updated.includes(statusKey)) {
      updated = updated.filter(s => s !== statusKey);
      if (updated.length === 0) updated = ['all'];
    } else {
      updated.push(statusKey);
    }
    setSelectedStatuses(updated);
  };

  // Détection du portefeuille (VOLTA ou FARADAY) pour chaque projet
  const getProjectPortfolio = (p) => {
    if (!p) return null;
    try {
      const fromBess = getProjectBessPortfolio(p);
      if (fromBess) {
        const norm = normalizePortfolioName(fromBess);
        if (norm.includes('FARADAY') || norm.includes('TESLA') || norm === 'SPV B') return 'FARADAY';
        if (norm.includes('VOLTA') || norm === 'SPV A') return 'VOLTA';
      }
    } catch (_) {}

    const direct = p.bess_portfolio || 
                   p.portfolio_bess || 
                   p.portefeuille_bess || 
                   p.bessPortfolio || 
                   p.portefeuille || 
                   p.portfolio || 
                   p.pv_portfolio || 
                   p.data?.bess_portfolio || 
                   p.data?.portefeuille || 
                   p.bp_bess_data?.portfolio || 
                   p.bpAcamaState?.bess_portfolio || 
                   '';
    const s = String(direct).toUpperCase().trim();
    if (s.includes('FARADAY') || s.includes('TESLA') || s === 'SPV B') return 'FARADAY';
    if (s.includes('VOLTA') || s === 'SPV A') return 'VOLTA';

    if (p.spv === 'SPV B') return 'FARADAY';
    if (p.spv === 'SPV A') return 'VOLTA';

    const pName = (p.name || '').toUpperCase().trim();
    const pClient = (p.client_name || p.client || `${p.firstName || ''} ${p.name || ''}`).toUpperCase().trim();

    // Exclusion explicite DUPORT, LABEGUERIE, LARDY et CELERIE de VOLTA (ils sont FARADAY)
    if (pName.includes('DUPORT') || pClient.includes('DUPORT') ||
        pName.includes('LABEGUERIE') || pClient.includes('LABEGUERIE') ||
        pName.includes('LARDY') || pClient.includes('LARDY') ||
        pName.includes('CELERIE') || pClient.includes('CELERIE')) {
      return 'FARADAY';
    }

    if (Array.isArray(BESS_PORTFOLIO_SITES)) {
      const matchSite = BESS_PORTFOLIO_SITES.find(site => {
        if (p.id && site.id && (p.id === site.id || p.id === `site_${site.id}`)) return true;
        const sName = (site.name || '').toUpperCase().trim();
        const sCity = (site.city || '').toUpperCase().trim();
        const pCity = (p.city || p.commune || '').toUpperCase().trim();
        if (sName && (pName === sName || pName.includes(sName) || sName.includes(pName))) return true;
        if (sCity && pCity && sCity === pCity && (pName.includes(sName) || sName.includes(pName))) return true;
        return false;
      });

      if (matchSite) {
        if (matchSite.bess_portfolio === 'FARADAY' || matchSite.spv === 'SPV B') return 'FARADAY';
        return 'VOLTA';
      }
    }

    const comm = (p.devComments || p.description || p.notes || '').toUpperCase();
    if (comm.includes('FARADAY')) return 'FARADAY';
    if (comm.includes('VOLTA')) return 'VOLTA';

    return null;
  };

  const portfolioCounts = useMemo(() => {
    let volta = 0;
    let faraday = 0;
    projects.forEach(p => {
      const port = getProjectPortfolio(p);
      if (port === 'VOLTA') volta++;
      else if (port === 'FARADAY') faraday++;
    });
    return { VOLTA: volta, FARADAY: faraday, all: projects.length };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (onlyMyProjects && currentUser) {
        const uName = (currentUser.name || currentUser.displayName || '').toLowerCase();
        const uFirst = (currentUser.firstName || '').toLowerCase();
        const uEmail = (currentUser.email || '').toLowerCase();
        const commercial = getCommercial(p).toLowerCase();
        const chef = getChefProjet(p).toLowerCase();
        const createdBy = (p.createdBy || p.author || '').toLowerCase();

        const isCommercial = commercial.includes(uName) || commercial.includes(uFirst) || (uEmail && commercial.includes(uEmail));
        const isChef = chef.includes(uName) || chef.includes(uFirst) || (uEmail && chef.includes(uEmail));
        const isCreator = createdBy.includes(uName) || createdBy.includes(uFirst);

        if (!isCommercial && !isChef && !isCreator && !p.is_mine) return false;
      }

      // Filtre portefeuille (VOLTA ou FARADAY)
      if (selectedPortfolio !== 'all') {
        const port = getProjectPortfolio(p);
        if (port !== selectedPortfolio) return false;
      }

      if (!selectedStatuses.includes('all')) {
        const pStatus = getProjectDevStatus(p);
        if (!selectedStatuses.includes(pStatus)) return false;
      }

      if (searchTerm.trim() !== '') {
        const clean = searchTerm.toLowerCase().trim();
        const fullProjName = getFullProjectName(p).toLowerCase();
        const client = `${p.name || ''} ${p.firstName || ''}`.toLowerCase();
        const city = (p.city || '').toLowerCase();
        const addr = (p.address || '').toLowerCase();
        const zip = (p.zip || p.zipCode || '').toLowerCase();
        const comm = getCommercial(p).toLowerCase();
        const chef = getChefProjet(p).toLowerCase();
        const reg = getProjectRegisteredNumber(p);
        const matchReg = reg
          ? (reg.label.toLowerCase().includes(clean) || reg.raw.toLowerCase().includes(clean) || reg.raw.replace(/\s+/g, '').toLowerCase().includes(clean.replace(/\s+/g, '')))
          : false;

        const matchName = fullProjName.includes(clean);
        const matchClient = client.includes(clean);
        const matchCity = city.includes(clean);
        const matchAddr = addr.includes(clean);
        const matchZip = zip.includes(clean);
        const matchComm = comm.includes(clean);
        const matchChef = chef.includes(clean);

        if (!matchName && !matchClient && !matchCity && !matchAddr && !matchZip && !matchComm && !matchChef && !matchReg) return false;
      }
      return true;
    });
  }, [projects, onlyMyProjects, currentUser, selectedStatuses, selectedPortfolio, searchTerm]);

  // Sauvegarde rapide du commentaire (Local + Firestore en temps réel + sync chat)
  const handleSaveComment = async (projectId, e) => {
    e.stopPropagation();
    const comment = commentInputs[projectId];
    if (comment !== undefined) {
      localStorage.setItem(`nelson_comment_${projectId}`, comment);
      setEditingCommentId(null);
      try {
        const targetProj = projects.find(p => p.id === projectId);
        let currentLines = Array.isArray(targetProj?.chatLines) ? [...targetProj.chatLines] : [];
        try {
          const fresh = await apiService.getProject(projectId);
          if (fresh && Array.isArray(fresh.chatLines)) {
            currentLines = [...fresh.chatLines];
          }
        } catch (e) {
          console.warn('Could not fetch fresh chatLines:', e);
        }

        const author = currentUser?.name || currentUser?.displayName || currentUser?.firstName || targetProj?.assignedUser || targetProj?.commercial || 'Yann';
        const cleanText = (comment || '').trim();

        let updatedLines = [...currentLines];
        if (cleanText) {
          const existingIdx = updatedLines.findIndex(l => l.source === 'devComments');
          const devLine = {
            who: author,
            text: cleanText,
            timestamp: new Date().toISOString(),
            source: 'devComments',
          };
          if (existingIdx >= 0) {
            updatedLines[existingIdx] = devLine;
          } else {
            updatedLines.push(devLine);
          }
        } else {
          updatedLines = updatedLines.filter(l => l.source !== 'devComments');
        }

        if (targetProj) {
          targetProj.devComments = comment;
          targetProj.notes = comment;
          targetProj.chatLines = updatedLines;
        }

        await apiService.updateProject(projectId, {
          devComments: comment,
          notes: comment,
          chatLines: updatedLines,
          updatedAt: new Date().toISOString(),
        });
        window.dispatchEvent(new Event('projectsUpdated'));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Erreur mise à jour commentaire Firestore:', err);
      }
    }
  };

  const getSavedComment = (p) => {
    if (!p) return '';
    return p.devComments || p.notes || (p.id ? localStorage.getItem(`nelson_comment_${p.id}`) : '') || p.description || '';
  };

  const getTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('batterie')) return <Battery className="w-3.5 h-3.5 text-purple-600" />;
    if (t.includes('ombrière') || t.includes('ombriere')) return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    return <Building className="w-3.5 h-3.5 text-blue-600" />;
  };

  const dossierNumbersMap = useMemo(() => {
    const deptYearCounters = {};
    const map = {};
    const sorted = [...projects].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    sorted.forEach((p, idx) => {
      let year = '26';
      const dateVal = p.createdAt || p.created_at || p.updatedAt;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) year = String(d.getFullYear()).slice(-2);
      }
      const rawZip = String(p.zip || p.zipCode || p.code_postal || '');
      let dept = '32';
      if (rawZip && rawZip.length >= 2) dept = rawZip.substring(0, 2);
      const key = `${year}_${dept}`;
      deptYearCounters[key] = (deptYearCounters[key] || 0) + 1;
      map[p.id || idx] = `${year}${dept}${String(deptYearCounters[key]).padStart(2, '0')}`;
    });
    return map;
  }, [projects]);

  return (
    <div className="w-full space-y-5">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Dossiers de Développement
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold">{filteredProjects.length}</span>
            </h2>
            <p className="text-xs text-slate-500">Suivi exhaustif des démarches d'urbanisme, mandatements et raccordement.</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-3 max-w-full min-w-0">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Rechercher nom, n° DP, client, ville..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
          </div>
          <button onClick={() => setOnlyMyProjects(!onlyMyProjects)} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${onlyMyProjects ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
            <UserCheck className="w-3.5 h-3.5" />
            <span>Mes projets</span>
            {onlyMyProjects && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
          </button>

          {/* Filtres Portefeuille BESS : VOLTA / FARADAY */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedPortfolio('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                selectedPortfolio === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Tous ({portfolioCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPortfolio(selectedPortfolio === 'VOLTA' ? 'all' : 'VOLTA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedPortfolio === 'VOLTA'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-900 hover:bg-amber-100/60'
              }`}
              title="Filtrer uniquement sur le portefeuille VOLTA"
            >
              <span>⚡ VOLTA</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedPortfolio === 'VOLTA' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
                {portfolioCounts.VOLTA}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPortfolio(selectedPortfolio === 'FARADAY' ? 'all' : 'FARADAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedPortfolio === 'FARADAY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:text-emerald-900 hover:bg-emerald-100/60'
              }`}
              title="Filtrer uniquement sur le portefeuille FARADAY"
            >
              <span>🔋 FARADAY</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedPortfolio === 'FARADAY' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
                {portfolioCounts.FARADAY}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar scrollbar-none max-w-full flex-nowrap shrink-0 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => handleToggleStatus(key)} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${selectedStatuses.includes(key) ? `${cfg.bg} ${cfg.text} shadow-xs scale-102` : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 space-y-3">
          <Folder className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Aucun dossier trouvé</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((p, index) => {
            const clientFullName = `${p.name || ''} ${p.firstName || ''}`.trim() || 'Client non renseigné';
            const projectName = getFullProjectName(p);
            const powerDisplay = p.kwc ? (p.kwc.toString().toLowerCase().includes('kwc') ? p.kwc : `${p.kwc} kWc`) : (p.projectSize ? `${p.projectSize} kWc` : '-');
            const statusKey = getProjectDevStatus(p);
            const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.en_cours;
            const commercialName = getCommercial(p);
            const chefProjetName = getChefProjet(p);
            const projectType = p.type || 'Construction';
            const savedComment = getSavedComment(p);
            const lastUpdated = formatUpdatedDate(p.updatedAt);
            const isSelected = activeProjectId === p.id;
            const devProgress = getProjectDevProgress(p);
            const regInfo = getProjectRegisteredNumber(p);
            const projectPortfolio = getProjectPortfolio(p);

            return (
              <motion.div
                key={p.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => onSelectProject(p)}
                className={`w-full bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group select-none ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                    : 'border-slate-200/90 hover:border-blue-400'
                }`}
              >
                {/* Bordure latérale de couleur Monday */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${statusCfg.bg}`} />

                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  {/* ── PARTIE GAUCHE (6/12) : 2 Sous-lignes Élargies ──────────────── */}
                  <div className="lg:col-span-6 p-4 pl-6 space-y-2 flex flex-col justify-center">
                    {/* Ligne 1 : N° Dossier (6 chiffres) | Nom du projet | Puissance */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-black px-2 py-0.5 bg-slate-100 text-blue-900 border border-slate-200 rounded-md tracking-wider flex-shrink-0 font-mono shadow-2xs">
                          {dossierNumbersMap[p.id || index] || p.dossier_num || `2632${String(index + 1).padStart(2, '0')}`}
                        </span>
                        {projectPortfolio && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPortfolio(projectPortfolio);
                            }}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 transition-transform hover:scale-105 shadow-2xs ${
                              projectPortfolio === 'VOLTA'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            }`}
                            title={`Portefeuille ${projectPortfolio} — Cliquer pour filtrer`}
                          >
                            {projectPortfolio === 'VOLTA' ? '⚡ VOLTA' : '🔋 FARADAY'}
                          </span>
                        )}
                        {/* Numéro officiel DP / Urbanisme */}
                        {regInfo ? (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-mono text-xs font-black bg-indigo-50 text-indigo-900 border border-indigo-300 shadow-2xs shrink-0 whitespace-nowrap tracking-wide"
                            title={`Numéro officiel ${regInfo.type} : ${regInfo.label}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{regInfo.label}</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[10.5px] font-bold bg-slate-50 text-slate-400 border border-dashed border-slate-200 shrink-0 whitespace-nowrap"
                            title="Numéro officiel DP en attente d'enregistrement"
                          >
                            <FileText className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>DP en attente</span>
                          </span>
                        )}
                        <h3 className="text-base font-extrabold text-slate-900 truncate group-hover:text-blue-600 transition-colors" title={projectName}>
                          {projectName}
                        </h3>
                      </div>

                      <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-blue-600 text-blue-600" />
                        {powerDisplay}
                      </span>
                    </div>

                    {/* Ligne 2 : Nom du client | Adresse | CP | Ville Complète sans coupure */}
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-nowrap overflow-hidden">
                      <span className="font-bold text-slate-800 flex items-center gap-1 flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {clientFullName}
                      </span>
                      <span className="text-slate-300 flex-shrink-0">•</span>
                      <span className="flex items-center gap-1 text-slate-500 font-medium truncate flex-1 min-w-0" title={`${p.address ? `${p.address}, ` : ''}${p.zip || p.zipCode ? `${p.zip || p.zipCode} ` : ''}${p.city || ''}`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        {p.address ? `${p.address}, ` : ''}{p.zip || p.zipCode ? `${p.zip || p.zipCode} ` : ''}{p.city || ''}
                      </span>
                    </div>
                  </div>

                  {/* ── PARTIE CENTRALE (3/12) : Statut & Avancement Workflow ─────────────── */}
                  <div className="lg:col-span-3 p-4 space-y-2.5 flex flex-col justify-center bg-slate-50/40">
                    {/* Ligne 1 : Statut du projet | Avancement % | Nom du Commercial */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-semibold text-slate-400">Statut :</span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${statusCfg.bg} ${statusCfg.text} shadow-2xs`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Badge Avancement & % (7 étapes au total) */}
                      <div 
                        className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs"
                        title={`Progression du développement : ${devProgress.count} sur ${devProgress.totalSteps} étapes validées (${devProgress.percent}%)`}
                      >
                        <TrendingUp className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500">Avanc. :</span>
                        <span className={`text-[11px] font-black px-1.5 py-0.2 rounded ${
                          devProgress.percent === 100 
                            ? 'bg-emerald-500 text-white' 
                            : devProgress.percent > 0 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {devProgress.percent}%
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400">({devProgress.count}/{devProgress.totalSteps})</span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 hidden sm:block">
                          <div 
                            className={`h-full transition-all duration-300 rounded-full ${
                              devProgress.percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${devProgress.percent}%` }}
                          />
                        </div>
                      </div>

                      {commercialName && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full ${getUserColor(commercialName)} text-xs font-bold truncate max-w-[100px] text-center shadow-2xs`}
                          title={`Commercial : ${commercialName}`}
                        >
                          {commercialName}
                        </span>
                      )}
                    </div>

                    {/* Ligne 2 : Type de projet | Nom du Chef de projet */}
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        {getTypeIcon(projectType)}
                        <span className="truncate max-w-[140px]">{projectType}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <span className="text-[10px] text-slate-400 font-semibold">Chef :</span>
                        <span className="font-bold text-slate-800 truncate max-w-[120px]" title={`Chef de projet : ${chefProjetName}`}>
                          {chefProjetName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── EXTRÊME DROITE (3/12) : Commentaires & Date (Élargi en hauteur) ──────── */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="lg:col-span-3 p-3.5 flex flex-col justify-between bg-slate-50/80 hover:bg-slate-50 transition-colors h-full min-h-[90px]"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1 text-slate-600">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        Commentaires
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lastUpdated}
                      </span>
                    </div>

                    {editingCommentId === p.id ? (
                      <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                        <textarea
                          rows={3}
                          autoFocus
                          value={commentInputs[p.id] !== undefined ? commentInputs[p.id] : savedComment}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                          className="w-full p-2 bg-white border border-blue-400 rounded-lg text-xs font-medium text-slate-800 focus:outline-none resize-none shadow-xs flex-1"
                          placeholder="Ajouter une note..."
                        />
                        <div className="flex justify-end gap-1 pt-1">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={(e) => handleSaveComment(p.id, e)}
                            className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCommentId(p.id);
                          setCommentInputs({ ...commentInputs, [p.id]: savedComment });
                        }}
                        className="text-xs text-slate-600 italic cursor-text hover:text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex items-start overflow-hidden"
                        title="Cliquez pour modifier le commentaire"
                      >
                        {savedComment ? (
                          <p className="line-clamp-3 leading-relaxed">{savedComment}</p>
                        ) : (
                          <span className="text-slate-400 not-italic">+ Ajouter un commentaire...</span>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
