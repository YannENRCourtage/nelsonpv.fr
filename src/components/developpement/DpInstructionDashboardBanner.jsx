import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, FileText, 
  ChevronDown, ChevronUp, ChevronRight, Send, MapPin, Building,
  Sparkles, Filter, ExternalLink
} from 'lucide-react';
import { calculateDpTimeline } from '@/services/dpInstructionService';

export default function DpInstructionDashboardBanner({
  projects = [],
  activeProjectId = null,
  onSelectProject,
  onRequestCertificate,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'en_cours' | 'accord_tacite' | 'certificat_obtenu'
  const [isExpanded, setIsExpanded] = useState(true);

  // Analyse et calcul de la chronologie de tous les projets ayant une DP
  const analyzedProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    return projects.map(p => {
      // Détection numéro DP
      const dpNum = p.dp_registration_number || 
                    p.numero_dp || 
                    p.num_dp || 
                    p.devWorkflow?.dp?.registrationNumber || 
                    '';

      // Détection date de dépôt DP
      const depDate = p.dp_deposit_date || 
                      p.date_depot_dp || 
                      p.devWorkflow?.dp?.depositDate || 
                      p.devWorkflow?.dp?.deadline ? null : null; // ne pas confondre avec deadline

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

      // Calcul timeline si on a une date de dépôt OU un numéro de DP avec date estimée
      let effectiveDepositDate = depDate;
      if (!effectiveDepositDate && dpNum) {
        // Si numéro DP présent mais pas de date explicite, fallback sur createdAt ou date du projet
        effectiveDepositDate = p.createdAt || p.created_at || p.date || null;
      }

      const timeline = calculateDpTimeline({
        depositDate: effectiveDepositDate,
        regime,
        hasComplement,
        complementDate,
        hasRefusal,
        certificateObtained,
        displayDate,
      });

      return {
        project: p,
        dpNum,
        hasDp: Boolean(dpNum || depDate || p.devWorkflow?.dp?.registrationNumber),
        depositDate: effectiveDepositDate,
        timeline,
        commune: p.city || p.commune || '',
        dpt: p.zip ? p.zip.slice(0, 2) : '',
        title: p.name || p.title || `Projet ${p.id || ''}`,
      };
    }).filter(item => item.hasDp);
  }, [projects]);

  // Compteurs
  const stats = useMemo(() => {
    let all = analyzedProjects.length;
    let enCours = 0;
    let accordTacite = 0;
    let certifie = 0;

    analyzedProjects.forEach(item => {
      const status = item.timeline?.status;
      if (status === 'accord_tacite') accordTacite++;
      else if (status === 'certificat_obtenu') certifie++;
      else if (status === 'en_cours') enCours++;
    });

    return { all, enCours, accordTacite, certifie };
  }, [analyzedProjects]);

  // Filtrage des éléments affichés
  const filteredList = useMemo(() => {
    return analyzedProjects.filter(item => {
      const status = item.timeline?.status;
      if (filter === 'all') return true;
      if (filter === 'en_cours') return status === 'en_cours';
      if (filter === 'accord_tacite') return status === 'accord_tacite';
      if (filter === 'certificat_obtenu') return status === 'certificat_obtenu';
      return true;
    });
  }, [analyzedProjects, filter]);

  if (analyzedProjects.length === 0) {
    return null; // Pas de dossiers DP à afficher
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-5">
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white animate-pulse shadow-xs">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
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

      {/* 4 Pilules de Filtres rapides avec compteurs dynamiques */}
      <div className="p-3 sm:px-6 bg-white border-b border-slate-100 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
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
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
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
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
            filter === 'accord_tacite'
              ? 'bg-emerald-600 text-white shadow-xs animate-pulse ring-2 ring-emerald-400/50'
              : stats.accordTacite > 0
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold animate-pulse'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span>🚨 Délai dépassé — Accord tacite à réclamer</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filter === 'accord_tacite' ? 'bg-emerald-800 text-white' : 'bg-emerald-600 text-white'}`}>
            {stats.accordTacite}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('certificat_obtenu')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
            filter === 'certificat_obtenu'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80'
          }`}
        >
          <span>✅ Certificat obtenu / Purgé</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filter === 'certificat_obtenu' ? 'bg-blue-800 text-white' : 'bg-blue-200/80 text-blue-900'}`}>
            {stats.certifie}
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
            className="overflow-hidden"
          >
            <div className="p-4 sm:px-6 divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {filteredList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                  Aucun dossier ne correspond à ce filtre.
                </div>
              ) : (
                filteredList.map((item) => {
                  const isSelected = activeProjectId === item.project.id;
                  const tl = item.timeline;
                  const isTacit = tl?.status === 'accord_tacite';

                  return (
                    <div
                      key={item.project.id}
                      onClick={() => onSelectProject && onSelectProject(item.project)}
                      className={`py-3 px-3 rounded-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer ${
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
                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{item.commune} {item.dpt ? `(${item.dpt})` : ''}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span>Déposé le : <strong className="text-slate-700">{tl?.depositDateFormatted || '—'}</strong></span>
                          <span className="text-slate-300">&bull;</span>
                          <span>Échéance légale : <strong className="text-slate-700">{tl?.legalDueDateFormatted || '—'}</strong></span>
                        </p>
                      </div>

                      {/* Colonne 2 : Barre de progression + Badge d'état */}
                      <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
                        <div className="w-32 hidden lg:flex flex-col gap-1 text-[10px]">
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
                          {isTacit ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm animate-pulse">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ACCORD TACITE ACQUIS
                            </span>
                          ) : tl?.status === 'certificat_obtenu' ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              Certificat obtenu
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              J-{tl?.daysRemaining || 0}
                            </span>
                          )}
                        </div>

                        {/* Bouton Action */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isTacit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRequestCertificate) {
                                  onRequestCertificate(item.project, tl);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                              title="Générer la demande officielle de certificat d'accord tacite"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Réclamer Certificat</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectProject) onSelectProject(item.project);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="Ouvrir le dossier"
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
