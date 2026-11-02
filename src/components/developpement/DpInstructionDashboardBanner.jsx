import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, FileText, 
  ChevronDown, ChevronUp, ChevronRight, Send, MapPin, Building,
  Sparkles, Filter, ExternalLink, Search, RefreshCw, Mail, Check, Copy
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  calculateDpTimeline, 
  resolveProjectDepositDate, 
  normalizeDpNumber,
  formatToFrenchDate,
  formatToIsoDate,
  searchAndSyncDp
} from '@/services/dpInstructionService';

export default function DpInstructionDashboardBanner({
  projects = [],
  activeProjectId = null,
  onSelectProject,
  onRequestCertificate,
  onUpdateProject,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'en_cours' | 'accord_tacite' | 'accord_obtenu'
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(null);

  // Analyse et calcul de la chronologie de tous les projets ayant fait l'objet d'un vrai dépôt de DP
  const analyzedProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    return projects.map(p => {
      // Détection numéro DP brut et normalisation avec ou sans espaces
      const rawDp = p.dp_registration_number || 
                    p.numero_dp || 
                    p.num_dp || 
                    p.devWorkflow?.dp?.registrationNumber || 
                    '';

      const norm = normalizeDpNumber(rawDp);
      const displayDp = norm?.normalized || rawDp;

      // Détection date de dépôt DP par ordre de priorité strict (vrais dépôts uniquement)
      const resolvedDate = resolveProjectDepositDate(p);

      // Régime
      const regime = p.dp_regime || p.devWorkflow?.dp?.regime || '1_mois';
      const hasComplement = Boolean(p.dp_has_complement || p.devWorkflow?.dp?.hasComplement);
      const complementDate = p.dp_complement_date || p.devWorkflow?.dp?.complementDate || null;
      const certificateObtained = Boolean(
        p.dp_certificate_obtained || 
        p.devWorkflow?.dp?.status === 'validated' || 
        p.dp_status === 'validated'
      );
      const hasRefusal = Boolean(p.dp_refusal || p.devWorkflow?.dp?.status === 'refused');
      const displayDate = p.dp_display_date || p.date_constat_huissier || p.devWorkflow?.huissier?.lastIntervention;

      const timeline = calculateDpTimeline({
        depositDate: resolvedDate,
        regime,
        hasComplement,
        complementDate,
        hasRefusal,
        certificateObtained,
        displayDate,
      });

      // Mairie info existante
      const mairie = p.dp_mairie_info || p.devWorkflow?.dp?.dp_mairie_info || null;

      // Statut de l'étape DP dans le workflow
      const dpStep = p.devWorkflow?.dp || {};
      const dpStatus = p.dp_status || dpStep.status || 'pending';
      const isStepPending = dpStatus === 'pending';

      // Un dossier ne doit apparaître dans le suivi des délais DP QUE s'il a fait l'objet d'un dépôt réel :
      // 1. Soit il a un vrai numéro de DP officiel (ex: DP 087 126 26 00074) et non pas un placeholder
      // 2. Soit son certificat ou accord est déjà obtenu / validé
      // 3. Soit il a une date de dépôt explicite ET son étape DP n'est PAS en attente / pending
      const hasRealDpNumber = Boolean(
        rawDp && 
        rawDp.length >= 7 && 
        !rawDp.toLowerCase().includes('attente') &&
        !rawDp.toLowerCase().includes('sans')
      );
      const hasRealDepositDate = Boolean(resolvedDate && timeline?.isValid);
      const isDeposited = Boolean(
        hasRealDpNumber || 
        certificateObtained || 
        (hasRealDepositDate && !isStepPending)
      );

      return {
        project: p,
        dpNum: displayDp,
        rawDp,
        codeInsee: norm?.codeInsee || p.inseeCode || p.citycode || '',
        isDeposited,
        depositDate: resolvedDate,
        timeline,
        mairieInfo: mairie,
        commune: p.city || p.commune || mairie?.commune || norm?.comm3 || '',
        dpt: p.zip ? p.zip.slice(0, 2) : (norm?.dpt2 || ''),
        title: p.name || p.title || `Projet ${p.id || ''}`,
      };
    }).filter(item => item.isDeposited);
  }, [projects]);

  // Compteurs
  const stats = useMemo(() => {
    let all = analyzedProjects.length;
    let enCours = 0;
    let accordTacite = 0;
    let accordObtenu = 0;

    analyzedProjects.forEach(item => {
      const status = item.timeline?.status;
      const isObtained = Boolean(
        status === 'certificat_obtenu' ||
        item.project?.dp_certificate_obtained ||
        item.project?.dp_status === 'validated' ||
        item.project?.devWorkflow?.dp?.status === 'validated' ||
        item.timeline?.certificateObtained
      );

      if (isObtained) {
        accordObtenu++;
      } else if (status === 'accord_tacite') {
        accordTacite++;
      } else if (status === 'en_cours') {
        enCours++;
      }
    });

    return { all, enCours, accordTacite, accordObtenu };
  }, [analyzedProjects]);

  // Filtrage des éléments affichés (Onglet + Recherche texte avec ou sans espace)
  const filteredList = useMemo(() => {
    const qClean = searchQuery.trim().toUpperCase().replace(/[\s\-_.]/g, '');

    return analyzedProjects.filter(item => {
      // Filtre statut
      const status = item.timeline?.status;
      const isObtained = Boolean(
        status === 'certificat_obtenu' ||
        item.project?.dp_certificate_obtained ||
        item.project?.dp_status === 'validated' ||
        item.project?.devWorkflow?.dp?.status === 'validated' ||
        item.timeline?.certificateObtained
      );

      if (filter === 'en_cours' && (status !== 'en_cours' || isObtained)) return false;
      if (filter === 'accord_tacite' && (status !== 'accord_tacite' || isObtained)) return false;
      if (filter === 'accord_obtenu' && !isObtained) return false;

      // Filtre recherche textuelle
      if (qClean) {
        const itemDpClean = String(item.dpNum || '').toUpperCase().replace(/[\s\-_.]/g, '');
        const itemTitle = String(item.title || '').toUpperCase();
        const itemCommune = String(item.commune || '').toUpperCase();
        const matchDp = itemDpClean.includes(qClean);
        const matchTitle = itemTitle.includes(searchQuery.trim().toUpperCase());
        const matchCommune = itemCommune.includes(searchQuery.trim().toUpperCase());
        return matchDp || matchTitle || matchCommune;
      }

      return true;
    });
  }, [analyzedProjects, filter, searchQuery]);

  // Handler de synchronisation automatique multi-sources (SITADEL & Annuaire Mairie)
  const handleSearchAndSync = async (dpQuery = searchQuery) => {
    const target = dpQuery.trim();
    if (!target) {
      toast({
        title: "Saisie requise",
        description: "Veuillez renseigner un numéro de DP (ex: DP0871262600074 ou DP 087 126 26 00074).",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSyncing(true);
      setSyncSuccessMsg(null);

      // Trouver le projet actif ou correspondant au numéro
      const cleanTarget = target.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const matchedItem = analyzedProjects.find(item => {
        const itemClean = String(item.rawDp || item.dpNum || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return itemClean === cleanTarget || itemClean.includes(cleanTarget);
      });

      const projectToUse = matchedItem?.project || (projects.length > 0 ? projects[0] : null);

      const res = await searchAndSyncDp(target, projectToUse);
      if (res && res.success) {
        setSyncSuccessMsg(`DP ${res.normalizedDp} synchronisée ! Mairie de ${res.communeName} (${res.mairieInfo?.email || 'Email vérifié'})`);
        toast({
          title: "Synchronisation réussie !",
          description: `DP ${res.normalizedDp} identifiée. Mairie : ${res.mairieInfo?.nomMairie} • Dépôt : ${res.depositDateFormatted}`,
        });

        // Mise à jour si callback fourni
        if (onUpdateProject && projectToUse?.id) {
          onUpdateProject(projectToUse.id, {
            dp_registration_number: res.normalizedDp,
            numero_dp: res.normalizedDp,
            dp_deposit_date: res.depositDateIso,
            dp_mairie_info: res.mairieInfo,
          });
        }
      }
    } catch (err) {
      console.error('Erreur recherche & sync DP:', err);
      toast({
        title: "Recherche DP",
        description: err.message || "Impossible d'interroger SITADEL ou l'annuaire mairie pour ce numéro.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (analyzedProjects.length === 0) {
    return null; // Pas de dossiers DP à afficher
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-230px)]">
      {/* Barre supérieure dégradée */}
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      {/* Header du bandeau */}
      <div className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-200/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Suivi des Délais d'Instruction — Déclarations Préalables (DP)
              </h3>
              {stats.accordTacite > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {stats.accordTacite} accord{stats.accordTacite > 1 ? 's' : ''} tacite{stats.accordTacite > 1 ? 's' : ''} acquis !
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">
              Calcul légal jour par jour &bull; Articles R.423-23, L.424-2 et R.424-13 du Code de l'urbanisme
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton Réduire / Développer */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Masquer la liste</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Afficher {filteredList.length} dossier{filteredList.length > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══ BARRE DE RECHERCHE & SYNCHRONISATION MULTI-SOURCES (AVEC OU SANS ESPACES) ═══ */}
      <div className="p-3 sm:px-6 bg-slate-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchAndSync(searchQuery);
            }}
            placeholder="Rechercher ou synchroniser un n° DP avec/sans espaces (ex: DP0871262600074 ou DP 087 126 26 00074)..."
            className="w-full pl-9 pr-24 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl font-medium outline-none transition-all shadow-2xs placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => handleSearchAndSync(searchQuery)}
            disabled={isSyncing}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Interroger SITADEL / DiDo SDES et l'Annuaire officiel de la Mairie"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Recherche...' : 'Rechercher'}</span>
          </button>
        </div>

        {syncSuccessMsg && (
          <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 4 Pilules de Filtres rapides avec compteurs dynamiques */}
      <div className="p-3 sm:px-6 bg-white border-b border-slate-100 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>Tous nos dossiers DP</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filter === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'}`}>
            {stats.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('en_cours')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            filter === 'en_cours'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80'
          }`}
        >
          <span>⏳ En cours d'instruction</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filter === 'en_cours' ? 'bg-amber-700 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
            {stats.enCours}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('accord_tacite')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            filter === 'accord_tacite'
              ? 'bg-emerald-600 text-white shadow-xs animate-pulse ring-2 ring-emerald-400/50'
              : stats.accordTacite > 0
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold animate-pulse shadow-xs'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span>🚨 Délai dépassé — Accord tacite à réclamer</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${filter === 'accord_tacite' ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-900'}`}>
            {stats.accordTacite}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('accord_obtenu')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            filter === 'accord_obtenu'
              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80'
          }`}
        >
          <span>✅ Accords DP déjà obtenus</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${filter === 'accord_obtenu' ? 'bg-blue-800 text-white' : 'bg-blue-200/80 text-blue-900'}`}>
            {stats.accordObtenu}
          </span>
        </button>
      </div>

      {/* Liste dépliable des dossiers DP */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-1 flex flex-col min-h-0"
          >
            <div className="p-4 sm:px-6 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[500px]">
              {filteredList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                  Aucun dossier ne correspond à votre filtre ou recherche.
                </div>
              ) : (
                filteredList.map((item) => {
                  const isSelected = activeProjectId === item.project.id;
                  const tl = item.timeline;
                  const isObtained = Boolean(
                    tl?.status === 'certificat_obtenu' ||
                    item.project?.dp_certificate_obtained ||
                    item.project?.dp_status === 'validated' ||
                    item.project?.devWorkflow?.dp?.status === 'validated' ||
                    tl?.certificateObtained
                  );
                  const isTacit = !isObtained && tl?.status === 'accord_tacite';

                  return (
                    <div
                      key={item.project.id}
                      onClick={() => onSelectProject && onSelectProject(item.project)}
                      className={`py-3.5 px-3 rounded-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 border border-blue-200/80 shadow-2xs' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Colonne 1 : Titre + DP + Commune */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {item.dpNum || 'DP en attente de numéro'}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1 text-slate-700 font-bold">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            {item.commune} {item.dpt ? `(${item.dpt})` : ''}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span>Déposé le : <strong className="text-slate-800">{tl?.depositDateFormatted || '—'}</strong></span>
                          <span className="text-slate-300">&bull;</span>
                          <span>Échéance légale : <strong className="text-slate-800">{tl?.legalDueDateFormatted || '—'}</strong></span>
                          {item.mairieInfo?.email && (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-indigo-700 font-bold flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" />
                                {item.mairieInfo.email}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Colonne 2 : Barre de progression + Badge d'état + Boutons d'action */}
                      <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
                        <div className="w-28 hidden lg:flex flex-col gap-1 text-[10px]">
                          <div className="flex justify-between font-bold text-slate-500">
                            <span>Progression</span>
                            <span>{tl?.progressPercent || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isTacit ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                              }`} 
                              style={{ width: `${tl?.progressPercent || 0}%` }} 
                            />
                          </div>
                        </div>

                        {/* Badge de statut */}
                        <div className="shrink-0">
                          {isObtained ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              Accord obtenu
                            </span>
                          ) : isTacit ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm animate-pulse">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ACCORD TACITE ({tl?.counterBadge || 'J+X'})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {tl?.counterBadge || 'En cours'}
                            </span>
                          )}
                        </div>

                        {/* Boutons Actions Directs */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isTacit && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onRequestCertificate) {
                                    onRequestCertificate({
                                      project: item.project,
                                      timeline: tl,
                                      mairieInfo: item.mairieInfo || item.project.dp_mairie_info || null
                                    });
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="Préparer et copier l'email pour la Mairie"
                              >
                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="hidden sm:inline">Mail Mairie</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onRequestCertificate) {
                                    onRequestCertificate({
                                      project: item.project,
                                      timeline: tl,
                                      mairieInfo: item.mairieInfo || item.project.dp_mairie_info || null
                                    });
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                title="Générer la demande officielle de certificat d'accord tacite"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Réclamer Certificat</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectProject) onSelectProject(item.project);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Ouvrir l'étude du dossier"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}