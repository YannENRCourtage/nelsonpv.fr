import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Users, Zap, CheckCircle2, Clock, AlertCircle, AlertTriangle,
  Calendar, MapPin, Building, Sun, Battery, Ruler, Navigation, MessageSquare,
  Sparkles, Mail, ShieldCheck, ChevronRight, Check, ArrowLeft, RefreshCw,
  FolderKanban, ExternalLink
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getUserColor } from '@/lib/utils';

/**
 * EtudeDossierView — Vue détaillée du workflow de développement d'un projet solaire
 * Architecture Monday.com : En-tête 2 colonnes, Frise de progression (9 étapes validées),
 * 3 Zones distinctes (Urbanisme, Mandatement, Action externe), synchronisation fidèle avec le CRM.
 */
export default function EtudeDossierView({
  project,
  allProjects = [],
  onBackToDossiers,
  onOpenUrbanismeWizard,
  onOpenEmailMandatement,
  onOpenRaccordementModal,
  onOpenAosModal,
  onOpenConsuelModal,
  professionals = [],
}) {
  // Définition des 9 étapes réparties dans les 3 zones
  const INITIAL_STEPS_CONFIG = [
    // ── ZONE 1 : URBANISME ──────────────────────────────────────────
    {
      id: 'cu',
      zone: 'urbanisme',
      title: 'Certificat d\'Urbanisme (CUo)',
      subtitle: 'Demande de CU opérationnel auprès de la mairie',
      icon: FileText,
      badge: 'Urbanisme',
      color: 'border-blue-500 text-blue-600 bg-blue-50',
      actionLabel: 'Générer le dossier CU',
      actionType: 'urbanisme',
      urbanismeType: 'cu',
    },
    {
      id: 'dp',
      zone: 'urbanisme',
      title: 'Déclaration Préalable (DP)',
      subtitle: 'Dossier DP complet (Cerfa + 7 plans graphiques)',
      icon: FileText,
      badge: 'Urbanisme',
      color: 'border-purple-500 text-purple-600 bg-purple-50',
      actionLabel: 'Générer le dossier DP',
      actionType: 'urbanisme',
      urbanismeType: 'dp',
    },
    {
      id: 'pc',
      zone: 'urbanisme',
      title: 'Permis de Construire (PC)',
      subtitle: 'Dossier PC complet (Cerfa + 8 plans + Notice + 3D)',
      icon: FileText,
      badge: 'Urbanisme',
      color: 'border-indigo-500 text-indigo-600 bg-indigo-50',
      actionLabel: 'Générer le dossier PC',
      actionType: 'urbanisme',
      urbanismeType: 'pc',
    },

    // ── ZONE 2 : MANDATEMENT ────────────────────────────────────────
    {
      id: 'huissier',
      zone: 'mandatement',
      title: 'Mandatement Huissier',
      subtitle: 'Constat d\'affichage du panneau sur 2 mois (3 passages)',
      icon: Users,
      badge: 'Mandatement',
      color: 'border-amber-500 text-amber-600 bg-amber-50',
      actionLabel: 'Générer un mail Huissier',
      actionType: 'mandatement',
      mandatementType: 'huissier',
    },
    {
      id: 'geometre',
      zone: 'mandatement',
      title: 'Mandatement Géomètre',
      subtitle: 'Division parcellaire et plan de bornage officiel',
      icon: Users,
      badge: 'Mandatement',
      color: 'border-emerald-500 text-emerald-600 bg-emerald-50',
      actionLabel: 'Générer un mail Géomètre',
      actionType: 'mandatement',
      mandatementType: 'geometre',
    },
    {
      id: 'notaire',
      zone: 'mandatement',
      title: 'Mandatement Notaire',
      subtitle: 'Rédaction et signature du Bail Emphytéotique',
      icon: Users,
      badge: 'Mandatement',
      color: 'border-pink-500 text-pink-600 bg-pink-50',
      actionLabel: 'Générer un mail Notaire',
      actionType: 'mandatement',
      mandatementType: 'notaire',
    },

    // ── ZONE 3 : ACTION EXTERNE ─────────────────────────────────────
    {
      id: 'raccordement',
      zone: 'action_externe',
      title: 'Demande de raccordement',
      subtitle: 'Dépôt portail Enedis/RTE, obtention PTF et CRA',
      icon: Zap,
      badge: 'Réseau',
      color: 'border-yellow-500 text-yellow-600 bg-yellow-50',
      actionLabel: 'Gérer le raccordement',
      actionType: 'raccordement',
    },
    {
      id: 'aos_ao',
      zone: 'action_externe',
      title: 'Dossier AOS / AO',
      subtitle: 'Appels d\'offres CRE et conformité administrative',
      icon: ShieldCheck,
      badge: 'CRE / AO',
      color: 'border-cyan-500 text-cyan-600 bg-cyan-50',
      actionLabel: 'Gérer le dossier AO',
      actionType: 'aos_ao',
    },
    {
      id: 'consuel',
      zone: 'action_externe',
      title: 'Demande de Consuel',
      subtitle: 'Attestation de conformité électrique pour mise en service',
      icon: ShieldCheck,
      badge: 'Conformité',
      color: 'border-teal-500 text-teal-600 bg-teal-50',
      actionLabel: 'Gérer la demande Consuel',
      actionType: 'consuel',
    },
  ];

  // État local des étapes pour le projet
  const [stepsState, setStepsState] = useState({});
  const [projectComments, setProjectComments] = useState('');
  const [isCommentSaved, setIsCommentSaved] = useState(false);

  // Charger les données sauvegardées pour ce projet
  useEffect(() => {
    if (!project?.id) return;

    // Charger les commentaires
    const savedComment = localStorage.getItem(`nelson_comment_${project.id}`) || project.notes || project.description || '';
    setProjectComments(savedComment);

    // Charger l'état des 9 étapes
    const savedSteps = localStorage.getItem(`nelson_workflow_${project.id}`);
    if (savedSteps) {
      try {
        setStepsState(JSON.parse(savedSteps));
      } catch (e) {
        console.error('Erreur chargement workflow local:', e);
      }
    } else {
      // Initialisation par défaut
      const defaultState = {};
      INITIAL_STEPS_CONFIG.forEach(s => {
        defaultState[s.id] = {
          status: 'pending',
          lastIntervention: '14/08/2026',
          deadline: '',
          notes: '',
        };
      });
      setStepsState(defaultState);
    }
  }, [project?.id]);

  // Sauvegarde d'une étape avec synchronisation mutuelle DP / PC
  const updateStep = (stepId, updates) => {
    let newStepsState = {
      ...stepsState,
      [stepId]: {
        ...(stepsState[stepId] || {}),
        ...updates,
        lastIntervention: '14/08/2026',
      }
    };

    // Si DP validé -> PC passe automatiquement à 'ns' s'il était en attente (et vice-versa)
    if (stepId === 'dp' && updates.status === 'validated') {
      if (!newStepsState.pc || newStepsState.pc.status === 'pending') {
        newStepsState.pc = { ...(newStepsState.pc || {}), status: 'ns', lastIntervention: '14/08/2026' };
      }
    } else if (stepId === 'pc' && updates.status === 'validated') {
      if (!newStepsState.dp || newStepsState.dp.status === 'pending') {
        newStepsState.dp = { ...(newStepsState.dp || {}), status: 'ns', lastIntervention: '14/08/2026' };
      }
    }

    setStepsState(newStepsState);
    if (project?.id) {
      localStorage.setItem(`nelson_workflow_${project.id}`, JSON.stringify(newStepsState));
    }
  };

  // Sauvegarde des commentaires
  const handleCommentChange = (val) => {
    setProjectComments(val);
    if (project?.id) {
      localStorage.setItem(`nelson_comment_${project.id}`, val);
      setIsCommentSaved(true);
      setTimeout(() => setIsCommentSaved(false), 2000);
    }
  };

  // Calcul du % d'avancement strict sur 7 étapes :
  // Zone 1 : Urbanisme = 1 étape max (soit DP, soit PC. Le CUo n'est pas une étape d'avancement).
  // Zone 2 : Mandatement = 3 étapes (Huissier, Géomètre, Notaire)
  // Zone 3 : Action externe = 3 étapes (Raccordement, Dossier AOS/AO, Consuel)
  const totalSteps = 7;
  const validatedCount = useMemo(() => {
    let count = 0;
    // 1. Urbanisme (1 pt si DP ou PC validé)
    if (stepsState.dp?.status === 'validated' || stepsState.pc?.status === 'validated') {
      count += 1;
    }
    // 2. Mandatement (3 pts max)
    if (stepsState.huissier?.status === 'validated') count += 1;
    if (stepsState.geometre?.status === 'validated') count += 1;
    if (stepsState.notaire?.status === 'validated') count += 1;
    // 3. Action externe (3 pts max)
    if (stepsState.raccordement?.status === 'validated') count += 1;
    if (stepsState.aos_ao?.status === 'validated') count += 1;
    if (stepsState.consuel?.status === 'validated') count += 1;

    return count;
  }, [stepsState]);

  const progressPercent = Math.round((validatedCount / totalSteps) * 100);

  // Vérification des alertes de deadline
  const todayStr = new Date().toISOString().split('T')[0];

  const checkIsOverdue = (step) => {
    const s = stepsState[step.id];
    if (!s?.deadline || s?.status === 'validated' || s?.status === 'ns') return false;
    return s.deadline <= todayStr;
  };

  // Gestion du clic d'action sur l'étape
  const handleStepAction = (step) => {
    if (step.actionType === 'urbanisme') {
      onOpenUrbanismeWizard(step.urbanismeType);
    } else if (step.actionType === 'mandatement') {
      onOpenEmailMandatement(step.mandatementType);
    } else if (step.actionType === 'raccordement') {
      onOpenRaccordementModal();
    } else if (step.actionType === 'aos_ao') {
      onOpenAosModal();
    } else if (step.actionType === 'consuel') {
      onOpenConsuelModal();
    }
  };

  // Statuts Monday.com (avec statut NS "Non significatif")
  const STATUS_OPTIONS = [
    { id: 'pending', label: 'En attente', bg: 'bg-[#c4c4c4]', text: 'text-white' },
    { id: 'in_progress', label: 'En cours', bg: 'bg-[#fdab3d]', text: 'text-white' },
    { id: 'validated', label: 'Validée ✓', bg: 'bg-[#00c875]', text: 'text-white' },
    { id: 'ns', label: 'NS', bg: 'bg-slate-400', text: 'text-white', description: 'Non significatif' },
  ];

  // Numérotation stricte des dossiers à 6 chiffres YYDDNN (synchronisée avec la vue Dossiers)
  const dossierNumber = useMemo(() => {
    if (!project) return '263201';
    if (project.dossier_num) return project.dossier_num;

    const list = (allProjects && allProjects.length > 0) ? allProjects : [project];
    const deptYearCounters = {};
    const map = {};

    const sorted = [...list].sort((a, b) => {
      const da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
      const db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
      return da - db;
    });

    sorted.forEach((p, idx) => {
      let year = '26';
      const dateVal = p.createdAt || p.created_at || p.updatedAt;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          year = String(d.getFullYear()).slice(-2);
        }
      }
      const rawZip = String(p.zip || p.zipCode || p.code_postal || p.postalCode || '');
      let dept = '32';
      if (rawZip && rawZip.length >= 2) {
        dept = rawZip.substring(0, 2);
      } else if (p.address) {
        const match = p.address.match(/\b(0[1-9]|[1-8][0-9]|9[0-8]|2[ABab])\d{3}\b/);
        if (match) dept = match[1];
      }
      const key = `${year}_${dept}`;
      deptYearCounters[key] = (deptYearCounters[key] || 0) + 1;
      const numInDept = String(deptYearCounters[key]).padStart(2, '0');
      map[p.id || idx] = `${year}${dept}${numInDept}`;
    });

    return map[project.id] || project.dossier_num || '263302';
  }, [project, allProjects]);

  const renderStepCard = (step) => {
    const s = stepsState[step.id] || { status: 'pending', lastIntervention: '14/08/2026', deadline: '' };
    const isOverdue = checkIsOverdue(step);
    const currentStatusOpt = STATUS_OPTIONS.find(opt => opt.id === s.status) || STATUS_OPTIONS[0];

    return (
      <div
        key={step.id}
        className={`bg-white rounded-xl p-3 border transition-all shadow-2xs hover:shadow-xs relative overflow-hidden flex flex-col justify-between ${
          s.status === 'validated'
            ? 'border-emerald-300 bg-emerald-50/10'
            : isOverdue
              ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
              : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Barre supérieure couleur Monday selon statut */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentStatusOpt.bg}`} />

        <div className="space-y-2 pt-0.5">
          {/* Header carte : Titre & Badge Statut interactif */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${step.color}`}>
                <step.icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate" title={step.title}>{step.title}</h4>
                <p className="text-[9.5px] text-slate-500 font-medium line-clamp-1">{step.subtitle}</p>
              </div>
            </div>

            {/* Sélecteur de statut Monday.com (avec NS) */}
            <div className="relative flex-shrink-0">
              <select
                value={s.status || 'pending'}
                onChange={(e) => updateStep(step.id, { status: e.target.value })}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer appearance-none border-none outline-none shadow-2xs transition-all ${currentStatusOpt.bg} ${currentStatusOpt.text}`}
              >
                <option value="pending" className="bg-slate-700 text-white font-bold">En attente</option>
                <option value="in_progress" className="bg-amber-600 text-white font-bold">En cours</option>
                <option value="validated" className="bg-emerald-600 text-white font-bold">Validée ✓</option>
                <option value="ns" className="bg-slate-500 text-white font-bold">NS</option>
              </select>
            </div>
          </div>

          {/* Alerte si date de fin dépassée */}
          {isOverdue && (
            <div className="flex items-center gap-1 p-1.5 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-extrabold animate-pulse border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
              <span>Échéance dépassée !</span>
            </div>
          )}

          {/* Section Dates (Dernière intervention & Date de fin) */}
          <div className="grid grid-cols-2 gap-1.5 text-[9.5px] bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div>
              <span className="text-slate-400 font-semibold block text-[9px]">Dernière intervention :</span>
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-slate-400" />
                {s.lastIntervention || '14/08/2026'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[9px]">Date de fin (Échéance) :</span>
              <input
                type="date"
                value={s.deadline || ''}
                onChange={(e) => updateStep(step.id, { deadline: e.target.value })}
                className={`w-full bg-white border rounded px-1 py-0 text-[9.5px] font-bold outline-none ${
                  isOverdue ? 'border-rose-400 text-rose-700 bg-rose-50' : 'border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Bouton d'action principal de l'étape */}
        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
          <button
            onClick={() => handleStepAction(step)}
            className="w-full py-1.5 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs hover:shadow-xs transition-all"
          >
            {step.actionLabel}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Formatage de la date de saisie / première sauvegarde
  const formatSaisieDate = (dateVal) => {
    if (!dateVal) return '14/08/2026';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return String(dateVal);
    }
  };

  // Nom complet du projet fidèle au CRM (ex: "DEVEAU 17210 ORIGNOLLES")
  const getFullProjectName = (p) => {
    if (!p) return 'Projet sans nom';
    if (p.projectName) return p.projectName;
    const parts = [p.name, p.zip || p.zipCode, p.city].filter(Boolean);
    if (parts.length > 1) return parts.join(' ').toUpperCase();
    return p.name || 'Projet sans nom';
  };

  const clientName = `${project?.name || ''} ${project?.firstName || ''}`.trim() || 'Client non renseigné';
  const fullProjectTitle = getFullProjectName(project);
  const powerDisplay = project?.kwc ? (project.kwc.toString().toLowerCase().includes('kwc') ? project.kwc : `${project.kwc} kWc`) : (project?.projectSize ? `${project.projectSize} kWc` : '-');
  const chefProjetName = project?.assignedUser || project?.chef_projet || project?.chefProjet || project?.project_manager || project?.manager || 'Yann';
  const commercialName = project?.commercial || project?.commercial_name || project?.salesRep || 'Yann';
  const dateSaisie = formatSaisieDate(project?.created_at || project?.createdAt || project?.date_creation || project?.dateCreation || project?.creationDate || project?.date || '2026-08-14');

  // Extraction propre des références cadastrales (section et numéro séparés)
  const rawSection = project?.cadastre_section || project?.cadastreSection || (project?.cadastre ? project.cadastre.split(' ')[0] : '') || project?.section || '';
  const rawNumero = project?.cadastre_numero || project?.cadastreNumero || project?.cadastre_parcel || project?.parcelle || project?.parcel || (project?.cadastre ? project.cadastre.split(' ').slice(1).join(' ') : '') || '';
  const cadastreSection = rawSection ? rawSection.replace(/^Sec\.?\s*/i, '').trim() : '';
  const cadastreNumero = rawNumero ? rawNumero.replace(/^n°?\s*/i, '').trim() : '';
  const cadastreSurface = project?.cadastre_surface || project?.surface_terrain || project?.surfaceTerrain || project?.surface || '';

  return (
    <div className="w-full space-y-4">
      {/* ── BOUTON RETOUR & BARRE DU DOSSIER ──────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBackToDossiers}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux dossiers
        </button>

        <span className="text-xs font-bold text-slate-400">
          Dossier : <strong className="text-slate-800 font-black px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-mono">{dossierNumber}</strong>
        </span>
      </div>

      {/* ── EN-TÊTE PROJET (2 Colonnes : Infos Clés & Commentaires) ──── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* GAUCHE (8/12) : Informations Clés du Projet */}
          <div className="lg:col-span-8 space-y-2.5">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{fullProjectTitle}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
                    {powerDisplay}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {commercialName && (
                    <span className={`px-2.5 py-0.5 ${getUserColor(commercialName)} text-xs font-extrabold rounded-full shadow-2xs`}>
                      {commercialName}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-slate-400">
                    Saisi le {dateSaisie}
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                {project?.address ? `${project.address}, ` : ''}{project?.zip || project?.zipCode ? `${project.zip || project.zipCode} ` : ''}{project?.city || ''}
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-700">Client : {clientName}</span>
              </p>
            </div>

            {/* Métadonnées 4 blocs compactes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                <span className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Type de projet</span>
                <span className="font-extrabold text-slate-900 truncate block text-xs">{project?.type || 'Construction'}</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                <span className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Cadastre</span>
                <span className="font-extrabold text-slate-900 truncate block text-xs">
                  {cadastreSection ? `Sec. ${cadastreSection}` : 'Sec. —'} {cadastreNumero ? `n° ${cadastreNumero}` : 'n° —'}
                </span>
                {cadastreSurface && (
                  <span className="text-[9px] font-semibold text-slate-500 block">{cadastreSurface} m²</span>
                )}
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                <span className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Coordonnées GPS</span>
                <span className="font-extrabold text-slate-900 truncate block text-xs font-mono" title={project?.gps || '-'}>
                  {project?.gps ? `${project.gps.slice(0, 18)}...` : '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                <span className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Chef de projet</span>
                <span className="font-extrabold text-indigo-700 truncate block text-xs">
                  {chefProjetName}
                </span>
              </div>
            </div>
          </div>

          {/* DROITE (4/12) : Zone Commentaires du Dossier */}
          <div className="lg:col-span-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                <span className="flex items-center gap-1 text-blue-700">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Commentaires du dossier
                </span>
                {isCommentSaved && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Enregistré
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={projectComments}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder="Ajoutez des remarques ou suivis spécifiques..."
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none shadow-2xs"
              />
            </div>
            <p className="text-[9.5px] text-slate-400 italic mt-0.5">
              Synchronisé automatiquement avec la fiche dossier.
            </p>
          </div>
        </div>
      </div>

      {/* ── FRISE D'AVANCEMENT HORIZONTALE (Strictement % des étapes Validées) ── */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Progression globale du développement
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-bold text-xs">{validatedCount}/{totalSteps} étapes validées</span>
            <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-lg text-xs font-black shadow-xs">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Barre colorée de progression */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {/* ── LES 3 ZONES DE WORKFLOW EN 3 COLONNES (SANS SCROLL VERTICAL) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* COLONNE 1 : URBANISME (CUo, DP, PC) */}
        <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              1. Urbanisme (Autorisations de construire)
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">Pièces &amp; Cerfas</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {INITIAL_STEPS_CONFIG.filter(s => s.zone === 'urbanisme').map(renderStepCard)}
          </div>
        </div>

        {/* COLONNE 2 : MANDATEMENT (Huissier, Géomètre, Notaire) */}
        <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              2. Mandatement (Partenaires tiers &amp; Foncier)
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">Mails auto</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {INITIAL_STEPS_CONFIG.filter(s => s.zone === 'mandatement').map(renderStepCard)}
          </div>
        </div>

        {/* COLONNE 3 : ACTION EXTERNE (Raccordement, AOS/AO, Consuel) */}
        <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              3. Action externe (Réseau, CRE &amp; Consuel)
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">ENEDIS &amp; Consuel</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {INITIAL_STEPS_CONFIG.filter(s => s.zone === 'action_externe').map(renderStepCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
