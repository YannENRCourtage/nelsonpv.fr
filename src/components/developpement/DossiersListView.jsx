import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Folder, Search, MapPin, Zap, User, UserCheck, Building, Sun, Battery,
  CheckCircle2, Clock, AlertCircle, XCircle, Calendar, MessageSquare,
  Filter, Sparkles, Check
} from 'lucide-react';

/**
 * DossiersListView — Vue Monday.com des dossiers de développement (sur 2 lignes par projet)
 * Contient le toggle "Mes projets", filtres par statut colorés, lignes épaisses 2 lignes,
 * zone commentaire élargie en hauteur sans bouton redondant, synchronisation stricte CRM
 * du nom de projet et du chef de projet.
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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  // Configuration des statuts façon Monday.com
  const STATUS_CONFIG = {
    all: { label: 'Tous', bg: 'bg-slate-700', text: 'text-white' },
    nouveau: { label: 'Nouveau', bg: 'bg-[#0073ea]', text: 'text-white', lightBg: 'bg-blue-50', border: 'border-blue-200' },
    en_cours: { label: 'En cours', bg: 'bg-[#fdab3d]', text: 'text-white', lightBg: 'bg-amber-50', border: 'border-amber-200' },
    termine: { label: 'Terminé', bg: 'bg-[#00c875]', text: 'text-white', lightBg: 'bg-emerald-50', border: 'border-emerald-200' },
    abandonne: { label: 'Abandonné', bg: 'bg-[#e2445c]', text: 'text-white', lightBg: 'bg-rose-50', border: 'border-rose-200' },
  };

  // Normalisation du statut du projet pour correspondre à nos 4 statuts clés
  const normalizeStatus = (rawStatus) => {
    const s = (rawStatus || '').toLowerCase();
    if (s.includes('termin') || s.includes('valid') || s.includes('conforme') || s.includes('gagn')) return 'termine';
    if (s.includes('abandon') || s.includes('refus') || s.includes('perdu') || s.includes('annul')) return 'abandonne';
    if (s.includes('nouveau') || s.includes('attente') || s.includes('prospect') || s.includes('draft')) return 'nouveau';
    return 'en_cours';
  };

  // Formatage propre de la date de mise à jour (avec 14/08/2026 par défaut si non renseigné/invalide)
  const formatUpdatedDate = (dateVal) => {
    if (!dateVal) return '14/08/2026';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '14/08/2026';
    return d.toLocaleDateString('fr-FR');
  };

  // Nom complet du projet identique au CRM (ex: "DEVEAU 17210 ORIGNOLLES")
  const getFullProjectName = (p) => {
    if (!p) return 'Projet sans nom';
    if (p.projectName) return p.projectName;
    const parts = [p.name, p.zip || p.zipCode, p.city].filter(Boolean);
    if (parts.length > 1) return parts.join(' ').toUpperCase();
    return p.name || 'Projet sans nom';
  };

  // Chef de projet fidèle au CRM (champ assignedUser en priorité)
  const getChefProjet = (p) => {
    return p.assignedUser || p.chef_projet || p.chefProjet || p.project_manager || p.manager || 'Yann';
  };

  // Commercial fidèle au CRM
  const getCommercial = (p) => {
    return p.commercial || p.commercial_name || p.assignedTo || 'Yann';
  };

  // Toggle du filtre de statut
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

  // Filtrage des projets
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // 1. Filtre "Mes projets" (l'utilisateur connecté est Commercial OU Chef de projet)
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

        if (!isCommercial && !isChef && !isCreator && !p.is_mine) {
          return false;
        }
      }

      // 2. Filtre de statut
      if (!selectedStatuses.includes('all')) {
        const pStatus = normalizeStatus(p.status || p.crm_status);
        if (!selectedStatuses.includes(pStatus)) return false;
      }

      // 3. Filtre de recherche texte
      if (searchTerm.trim() !== '') {
        const clean = searchTerm.toLowerCase().trim();
        const fullTitle = getFullProjectName(p).toLowerCase();
        const matchName = fullTitle.includes(clean);
        const matchClient = (p.firstName || '').toLowerCase().includes(clean) || (p.name || '').toLowerCase().includes(clean);
        const matchCity = (p.city || p.cadastre_commune || '').toLowerCase().includes(clean);
        const matchAddr = (p.address || '').toLowerCase().includes(clean);
        const matchZip = (p.zip || p.zipCode || '').toString().toLowerCase().includes(clean);
        const matchComm = getCommercial(p).toLowerCase().includes(clean);
        const matchChef = getChefProjet(p).toLowerCase().includes(clean);

        if (!matchName && !matchClient && !matchCity && !matchAddr && !matchZip && !matchComm && !matchChef) {
          return false;
        }
      }

      return true;
    });
  }, [projects, onlyMyProjects, currentUser, selectedStatuses, searchTerm]);

  // Sauvegarde rapide du commentaire
  const handleSaveComment = (projectId, e) => {
    e.stopPropagation();
    const comment = commentInputs[projectId];
    if (comment !== undefined) {
      localStorage.setItem(`nelson_comment_${projectId}`, comment);
      setEditingCommentId(null);
    }
  };

  const getSavedComment = (projectId, fallback) => {
    return localStorage.getItem(`nelson_comment_${projectId}`) || fallback || '';
  };

  const getTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('batterie')) return <Battery className="w-3.5 h-3.5 text-purple-600" />;
    if (t.includes('ombrière') || t.includes('ombriere')) return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    return <Building className="w-3.5 h-3.5 text-blue-600" />;
  };

  return (
    <div className="w-full space-y-5">
      {/* ── BARRE D'OUTILS ET FILTRES (Style Monday.com) ────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Titre & Compteur */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Dossiers de Développement
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold">
                {filteredProjects.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Suivi exhaustif des démarches d'urbanisme, mandatements et raccordement.
            </p>
          </div>
        </div>

        {/* Contrôles de filtrage */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Recherche */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher nom, client, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* Toggle "Mes projets" */}
          <button
            onClick={() => setOnlyMyProjects(!onlyMyProjects)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              onlyMyProjects
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Mes projets</span>
            {onlyMyProjects && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
          </button>

          {/* Filtres Statuts Monday.com */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const isActive = selectedStatuses.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => handleToggleStatus(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    isActive
                      ? `${cfg.bg} ${cfg.text} shadow-xs scale-102`
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── LISTE DES LIGNES PROJETS (Cartes épaisses 2 sous-lignes) ──── */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 space-y-3">
          <Folder className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Aucun dossier trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ajustez vos filtres ou effectuez une nouvelle recherche pour afficher les dossiers de développement.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((p, index) => {
            const clientFullName = `${p.name || ''} ${p.firstName || ''}`.trim() || 'Client non renseigné';
            const projectName = getFullProjectName(p);
            const powerDisplay = p.kwc ? (p.kwc.toString().toLowerCase().includes('kwc') ? p.kwc : `${p.kwc} kWc`) : (p.projectSize ? `${p.projectSize} kWc` : '-');
            const statusKey = normalizeStatus(p.status || p.crm_status);
            const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.en_cours;
            const commercialName = getCommercial(p);
            const chefProjetName = getChefProjet(p);
            const projectType = p.type || 'Construction';
            const savedComment = getSavedComment(p.id, p.notes || p.description);
            const lastUpdated = formatUpdatedDate(p.updatedAt);
            const isSelected = activeProjectId === p.id;

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
                  {/* ── PARTIE GAUCHE (5/12) : 2 Sous-lignes ──────────────── */}
                  <div className="lg:col-span-5 p-4 pl-6 space-y-2.5 flex flex-col justify-center">
                    {/* Ligne 1 : Nom du projet | Puissance */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md tracking-wider flex-shrink-0">
                          {p.dossier_num || `DOS-${(p.id || index + 100).toString().slice(-4)}`}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 truncate group-hover:text-blue-600 transition-colors" title={projectName}>
                          {projectName}
                        </h3>
                      </div>

                      <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-blue-600 text-blue-600" />
                        {powerDisplay}
                      </span>
                    </div>

                    {/* Ligne 2 : Nom du client | Adresse | CP | Ville */}
                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {clientFullName}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-500 font-medium truncate max-w-[260px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        {p.address ? `${p.address}, ` : ''}{p.zip || p.zipCode ? `${p.zip || p.zipCode} ` : ''}{p.city || ''}
                      </span>
                    </div>
                  </div>

                  {/* ── PARTIE DROITE (4/12) : 2 Sous-lignes ─────────────── */}
                  <div className="lg:col-span-4 p-4 space-y-2.5 flex flex-col justify-center bg-slate-50/40">
                    {/* Ligne 1 : Statut du projet | Nom du Commercial */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">Statut :</span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-extrabold ${statusCfg.bg} ${statusCfg.text} shadow-2xs`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
                          {commercialName.charAt(0)}
                        </div>
                        <span className="truncate max-w-[130px]" title={`Commercial : ${commercialName}`}>
                          {commercialName}
                        </span>
                      </div>
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
