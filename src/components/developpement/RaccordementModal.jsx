import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug, Zap, FileText, Download, X, Info, Loader2, Building2,
  ShieldCheck, AlertCircle, CheckCircle2, FileDown,
  Clock, Archive, Save, Layers, BatteryCharging,
  Check, AlertTriangle, RefreshCw, Upload, MapPin, Sparkles,
  CheckSquare, HelpCircle, Eye
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cadastreService } from '@/services/CadastreService';
import {
  ENR_COURTAGE_INFO,
  DEFAULT_INFO_COMPLEMENTAIRES_056E,
  DEFAULT_NOTE_ORAMP_CORPS,
  SCHEMAS_COMPTAGE_056E,
  ENEDIS_056E_CHECKLIST_PIECES,
  extractProjectEnedisVariables,
  buildNoteOraMpSiteLine,
  generateDefaultEnrCourtageStampDataUrl,
  getInitialEnedis056EData,
  generateEnedis056EPdf,
  generateOraMpNotePdf,
  generateEnedisCompletePackPdf,
  generateEnedisCompletePackZip,
} from '@/services/raccordementDocumentService';

export default function RaccordementModal({ isOpen, onClose, project, onSave }) {
  const [activeTab, setActiveTab] = useState('fiche_a');
  const [formData, setFormData] = useState(() => getInitialEnedis056EData(project));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [generatingAction, setGeneratingAction] = useState(null); // '056e' | 'oramp' | 'pack_pdf' | 'pack_zip' | null
  const [showOraTooltip, setShowOraTooltip] = useState(false);
  const [defaultStampUrl, setDefaultStampUrl] = useState(null);
  const [noteSiteManuallyEdited, setNoteSiteManuallyEdited] = useState(false);

  const fileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const loadedProjectIdRef = useRef(null);

  // Générer le cachet vectoriel ENR COURTAGE au montage
  useEffect(() => {
    const url = generateDefaultEnrCourtageStampDataUrl();
    if (url) setDefaultStampUrl(url);
  }, []);

  // Initialisation à l'ouverture de la modale ou au changement de projet
  useEffect(() => {
    if (project && isOpen) {
      const initial = getInitialEnedis056EData(project);
      setFormData(initial);
      setNoteSiteManuallyEdited(false);
      loadedProjectIdRef.current = project.id;

      // Auto-résolution asynchrone du Code INSEE et/ou de la parcelle si manquants
      const lat = parseFloat(initial.siteLatitude);
      const lng = parseFloat(initial.siteLongitude);
      const cp = initial.siteCodePostal;

      if (!initial.siteCodeInsee || !initial.siteParcelle || initial.siteParcelle === 'À préciser') {
        (async () => {
          let resolvedInsee = initial.siteCodeInsee;
          let resolvedParcelle = initial.siteParcelle;
          let resolvedCommune = initial.siteCommune;

          // 1. Essai via API Cadastre IGN si coordonnées GPS valides
          if (!isNaN(lat) && !isNaN(lng)) {
            try {
              const cad = await cadastreService.getParcelle(lat, lng);
              if (cad) {
                if (!resolvedInsee && cad.code_departement && cad.code_commune) {
                  resolvedInsee = `${cad.code_departement}${cad.code_commune}`;
                }
                if ((!resolvedParcelle || resolvedParcelle === 'À préciser') && cad.section && cad.numero) {
                  resolvedParcelle = `Section ${cad.section} n° ${cad.numero}`;
                }
                if ((!resolvedCommune || resolvedCommune === 'Commune') && cad.nom_commune) {
                  resolvedCommune = cad.nom_commune;
                }
              }
            } catch (e) {
              // Ignorer silencieusement
            }
          }

          // 2. Essai via geo.api.gouv.fr si le code INSEE est toujours manquant
          if (!resolvedInsee) {
            try {
              const geoUrl = (!isNaN(lat) && !isNaN(lng))
                ? `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=nom,code,codesPostaux`
                : (cp ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(cp)}&fields=nom,code,codesPostaux` : null);
              if (geoUrl) {
                const res = await fetch(geoUrl);
                if (res.ok) {
                  const list = await res.json();
                  if (Array.isArray(list) && list.length > 0) {
                    const match = list.find(c => resolvedCommune && c.nom.toLowerCase() === resolvedCommune.toLowerCase()) || list[0];
                    if (match?.code) {
                      resolvedInsee = match.code;
                    }
                  }
                }
              }
            } catch (e) {
              // Ignorer silencieusement
            }
          }

          if (resolvedInsee !== initial.siteCodeInsee || resolvedParcelle !== initial.siteParcelle) {
            setFormData(prev => {
              const next = {
                ...prev,
                siteCodeInsee: prev.siteCodeInsee || resolvedInsee,
                siteParcelle: (!prev.siteParcelle || prev.siteParcelle === 'À préciser') ? resolvedParcelle : prev.siteParcelle,
              };
              next.noteSiteLigne = buildNoteOraMpSiteLine(next);
              return next;
            });
          }
        })();
      }
    }
  }, [project?.id, isOpen]);

  // Persistance automatique dans localStorage et projet.enedisData lors de toute modification
  const persistEnedisData = (nextData, syncInterventionDate = false) => {
    if (!project?.id) return;

    try {
      localStorage.setItem(`nelson_enedis_data_${project.id}`, JSON.stringify(nextData));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage enedisData:', e);
    }

    const todayFr = new Date().toLocaleDateString('fr-FR');
    let existingWorkflow = project.devWorkflow || project.workflow || project.stepsState || null;
    if (!existingWorkflow) {
      try {
        const localWf = localStorage.getItem(`nelson_workflow_${project.id}`);
        if (localWf) existingWorkflow = JSON.parse(localWf);
      } catch (e) {
        // ignore
      }
    }

    const payload = {
      enedisData: nextData,
      raccordement: nextData,
    };

    if (syncInterventionDate) {
      const currentRacStep = existingWorkflow?.raccordement || {
        status: 'in_progress',
        deadline: '',
        notes: '',
      };
      const updatedWorkflow = {
        ...(existingWorkflow || {}),
        raccordement: {
          ...currentRacStep,
          status: (!currentRacStep.status || currentRacStep.status === 'pending') ? 'in_progress' : currentRacStep.status,
          lastIntervention: todayFr,
        },
      };
      try {
        localStorage.setItem(`nelson_workflow_${project.id}`, JSON.stringify(updatedWorkflow));
      } catch (e) {
        // ignore
      }
      payload.devWorkflow = updatedWorkflow;
      payload.lastIntervention = todayFr;
      payload.derniereIntervention = todayFr;
    }

    if (onSave) {
      onSave(payload);
    }
  };

  // Handler générique de modification de champ
  const handleFieldChange = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Synchroniser automatiquement la ligne "Site :" de la Note ORA-MP si un champ de localisation Fiche A change
      if (
        !noteSiteManuallyEdited &&
        ['siteNomInstallation', 'siteCommune', 'siteCodePostal', 'siteParcelle', 'siteLatitude', 'siteLongitude'].includes(name)
      ) {
        updated.noteSiteLigne = buildNoteOraMpSiteLine(updated);
      }

      if (name === 'noteSiteLigne') {
        setNoteSiteManuallyEdited(true);
      }

      // Persistance immédiate en localStorage + debounce vers le parent / Firestore
      try {
        if (project?.id) {
          localStorage.setItem(`nelson_enedis_data_${project.id}`, JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        persistEnedisData(updated, false);
        setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }, 450);

      return updated;
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    handleFieldChange(name, type === 'checkbox' ? checked : value);
  };

  // Switch rapide Producteur : "ENR COURTAGE en tant que Producteur" vs "Client/SPV Producteur + ENR COURTAGE Mandataire"
  const handleSwitchRepresentationMode = (mode) => {
    const vars = extractProjectEnedisVariables(project);
    setFormData(prev => {
      let updated;
      if (mode === 'enr_producteur') {
        updated = {
          ...prev,
          modeRepresentation: 'enr_producteur',
          beneficiaireType: ENR_COURTAGE_INFO.type,
          beneficiaireRaisonSociale: ENR_COURTAGE_INFO.raisonSociale,
          beneficiaireFormeJuridique: ENR_COURTAGE_INFO.formeJuridique,
          beneficiaireSiren: ENR_COURTAGE_INFO.siren,
          beneficiaireSiret: ENR_COURTAGE_INFO.siret,
          beneficiaireAdresse: ENR_COURTAGE_INFO.adresse,
          beneficiaireCpVillePays: ENR_COURTAGE_INFO.cpVillePays,
          interlocuteurNomPrenom: ENR_COURTAGE_INFO.interlocuteurNomPrenom,
          interlocuteurFonction: ENR_COURTAGE_INFO.fonction,
          interlocuteurTelephone: ENR_COURTAGE_INFO.telephone,
          interlocuteurEmail: ENR_COURTAGE_INFO.email,
        };
      } else {
        updated = {
          ...prev,
          modeRepresentation: 'client_producteur_enr_mandataire',
          beneficiaireType: 'Société',
          beneficiaireRaisonSociale: vars.spvRaisonSociale || 'SPV / Client Producteur',
          beneficiaireFormeJuridique: 'SAS / SCI',
          beneficiaireSiren: vars.spvSiren || ENR_COURTAGE_INFO.siren,
          beneficiaireSiret: vars.spvSiret || ENR_COURTAGE_INFO.siret,
          beneficiaireAdresse: vars.adresse || ENR_COURTAGE_INFO.adresse,
          beneficiaireCpVillePays: `${vars.codePostal || '33700'} ${vars.commune || 'Mérignac'} - France`,
          interlocuteurNomPrenom: `${vars.clientNom} ${vars.clientPrenom}`.trim() || ENR_COURTAGE_INFO.interlocuteurNomPrenom,
          interlocuteurFonction: 'Président / Gérant',
          interlocuteurTelephone: vars.clientTel || ENR_COURTAGE_INFO.telephone,
          interlocuteurEmail: vars.clientEmail || ENR_COURTAGE_INFO.email,
          // Mandataire = ENR COURTAGE
          mandataireRaisonSociale: ENR_COURTAGE_INFO.raisonSociale,
          mandataireFormeJuridique: ENR_COURTAGE_INFO.formeJuridique,
          mandataireSiren: ENR_COURTAGE_INFO.siren,
          mandataireSiret: ENR_COURTAGE_INFO.siret,
          mandataireAdresse: ENR_COURTAGE_INFO.adresse,
          mandataireCpVillePays: ENR_COURTAGE_INFO.cpVillePays,
          mandataireInterlocuteur: ENR_COURTAGE_INFO.interlocuteurNomPrenom,
          mandataireFonction: ENR_COURTAGE_INFO.fonction,
          mandataireTelephone: ENR_COURTAGE_INFO.telephone,
          mandataireEmail: ENR_COURTAGE_INFO.email,
        };
      }
      persistEnedisData(updated, false);
      return updated;
    });
  };

  // Gestion des cases à cocher de la checklist des pièces à joindre
  const handleToggleChecklistPiece = (pieceId) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        checklistPieces: {
          ...(prev.checklistPieces || {}),
          [pieceId]: !prev.checklistPieces?.[pieceId],
        },
      };
      persistEnedisData(updated, false);
      return updated;
    });
  };

  // Import d'une image de cachet / signature personnalisée
  const handleUploadSignatureImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (dataUrl) {
        handleFieldChange('signatureImageBase64', dataUrl);
        handleFieldChange('inclureCachetSignature', true);
        toast({
          title: 'Cachet / Signature importé',
          description: 'L’image sera intégrée au bas du Formulaire 056E et de la Note ORA-MP.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Action : Enregistrer explicitement les modifications + synchroniser Date de dernière intervention
  const handleSaveModifications = () => {
    setIsSaving(true);
    try {
      persistEnedisData(formData, true);
      setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      toast({
        title: 'Modifications enregistrées ✓',
        description: `Dossier Enedis sauvegardé et Date de dernière intervention mise à jour (${new Date().toLocaleDateString('fr-FR')}).`,
      });
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  // Action : Générer le Formulaire 056E (PDF)
  const handleGenerate056EPdf = async () => {
    setGeneratingAction('056e');
    try {
      persistEnedisData(formData, true);
      const res = await generateEnedis056EPdf(project, formData, { download: true });
      setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      toast({
        title: 'Formulaire Enedis-MOP-RES_056E généré',
        description: `Fichier téléchargé : ${res.filename}`,
      });
    } catch (err) {
      console.error('Erreur génération PDF 056E:', err);
      toast({
        title: 'Erreur de génération PDF',
        description: 'Impossible de générer le Formulaire Enedis-MOP-RES_056E.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAction(null);
    }
  };

  // Action : Générer la Note ORA-MP (PDF)
  const handleGenerateOraMpPdf = async () => {
    setGeneratingAction('oramp');
    try {
      persistEnedisData(formData, true);
      const res = await generateOraMpNotePdf(project, formData, { download: true });
      setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      toast({
        title: 'Note Complémentaire ORA-MP générée',
        description: `Fichier téléchargé : ${res.filename}`,
      });
    } catch (err) {
      console.error('Erreur génération PDF Note ORA-MP:', err);
      toast({
        title: 'Erreur de génération PDF',
        description: 'Impossible de générer la Note Complémentaire ORA-MP.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAction(null);
    }
  };

  // Action : Télécharger le Pack Complet Enedis (PDF fusionné)
  const handleDownloadPackMergedPdf = async () => {
    setGeneratingAction('pack_pdf');
    try {
      persistEnedisData(formData, true);
      const res = await generateEnedisCompletePackPdf(project, formData, { download: true });
      setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      toast({
        title: 'Pack Complet Enedis (PDF fusionné) téléchargé',
        description: `Formulaire 056E + Note ORA-MP réunis dans ${res.filename}`,
      });
    } catch (err) {
      console.error('Erreur génération Pack PDF fusionné:', err);
      toast({
        title: 'Erreur de génération',
        description: 'Impossible de fusionner le Pack Complet Enedis.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAction(null);
    }
  };

  // Action : Télécharger le Pack Complet Enedis (.ZIP)
  const handleDownloadPackZip = async () => {
    setGeneratingAction('pack_zip');
    try {
      persistEnedisData(formData, true);
      const res = await generateEnedisCompletePackZip(project, formData);
      setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      toast({
        title: 'Archive ZIP Enedis téléchargée',
        description: `Pack complet (056E + Note ORA-MP + Checklist) généré : ${res.filename}`,
      });
    } catch (err) {
      console.error('Erreur génération Pack ZIP:', err);
      toast({
        title: 'Erreur export ZIP',
        description: 'Impossible de générer l’archive ZIP Enedis.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAction(null);
    }
  };

  if (!isOpen) return null;

  // Statut actuel de l'étape Raccordement sur la carte Développement
  const stepStatus = project?.devWorkflow?.raccordement?.status || 'in_progress';
  const statusBadgeMap = {
    pending: { label: 'En attente', cls: 'bg-slate-500/30 text-slate-200 border-slate-400/30' },
    in_progress: { label: 'En cours d’instruction', cls: 'bg-amber-500/25 text-amber-300 border-amber-400/40' },
    validated: { label: 'Validée ✓', cls: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40' },
    refused: { label: 'Refus', cls: 'bg-rose-500/25 text-rose-300 border-rose-400/40' },
    ns: { label: 'NS', cls: 'bg-slate-500/25 text-slate-300 border-slate-400/40' },
  };
  const currentStatusBadge = statusBadgeMap[stepStatus] || statusBadgeMap.in_progress;

  const TABS = [
    {
      id: 'fiche_a',
      badge: 'Onglet 1',
      shortCode: 'Fiche A',
      title: 'Fiche A – Données Générales & Localisation',
      subtitle: 'Enedis-MOP-RES_056E (p. 3 à 10/41)',
      icon: Building2,
    },
    {
      id: 'fiche_c',
      badge: 'Onglet 2',
      shortCode: 'Fiche C',
      title: 'Fiche C – Raccordement HTA & Options de Modulation',
      subtitle: 'Enedis-MOP-RES_056E (p. 15 à 17/41)',
      icon: Zap,
    },
    {
      id: 'fiche_e4_t1',
      badge: 'Onglet 3',
      shortCode: 'Fiche E4 / T1',
      title: 'Fiche E4 / T1 – Caractéristiques Stockage & Batteries',
      subtitle: 'Enedis-MOP-RES_056E (BESS 4×125 kW)',
      icon: BatteryCharging,
    },
    {
      id: 'note_oramp',
      badge: 'Onglet 4',
      shortCode: 'Note ORA-MP',
      title: 'Note Complémentaire ORA-MP',
      subtitle: 'Art. 11 NMO-RES_030E & Variante 2A 046E',
      icon: FileText,
    },
  ];

  const activeStampSrc = formData.signatureImageBase64 || defaultStampUrl;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-5 overflow-hidden">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-slate-200"
        style={{ height: '94vh', maxHeight: '900px' }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            1. EN-TÊTE DE LA MODALE (Nom du projet, Commune, Statut)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-5 py-3.5 text-white border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md flex-shrink-0">
                <Plug className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-sm md:text-base tracking-tight truncate">
                    {formData.siteNomInstallation || project?.name || 'Demande de Raccordement Enedis'}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    Enedis-MOP-RES_056E (V2) + Note ORA-MP
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${currentStatusBadge.cls}`}>
                    Statut : {currentStatusBadge.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Commune : {formData.siteCommune || '—'} {formData.siteCodePostal ? `(${formData.siteCodePostal})` : ''}
                  </span>
                  {formData.siteCodeInsee && (
                    <>
                      <span>•</span>
                      <span className="text-slate-300 font-mono text-[11px]">INSEE : {formData.siteCodeInsee}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-amber-300 font-bold">
                    HTA 20 kV — {formData.puissanceRaccInjectionKw || 500} kW Inj. / {formData.puissanceRaccSoutirageKw || 500} kW Sout.
                  </span>
                  {lastSavedAt && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sauvegardé à {lastSavedAt}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
              title="Fermer la modale"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. BARRE DES 4 ONGLETS D'ÉDITION
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 md:px-5 py-2 flex-shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-950 shadow-sm border border-blue-500 ring-2 ring-blue-500/15'
                      : 'bg-white/60 hover:bg-white text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <TabIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {tab.shortCode}
                      </span>
                    </div>
                    <p className={`text-xs font-extrabold truncate mt-0.5 ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                      {tab.title}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{tab.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. CORPS DE LA MODALE — CONTENU DES 4 ONGLETS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-slate-50/60 space-y-5">
          <AnimatePresence mode="wait">
            {/* ─────────────────────────────────────────────────────────────
                ONGLET 1 : FICHE A – DONNÉES GÉNÉRALES & LOCALISATION
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'fiche_a' && (
              <motion.div
                key="fiche_a"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* A.1 Bénéficiaire du raccordement (Producteur) & Mandataire */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Fiche A — Enedis-MOP-RES_056E (Version 2)
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        1. Bénéficiaire du raccordement (Producteur) &amp; Mandataire
                      </h3>
                    </div>

                    {/* Switch rapide Producteur / Mandataire */}
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSwitchRepresentationMode('enr_producteur')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          formData.modeRepresentation === 'enr_producteur'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ENR COURTAGE en tant que Producteur
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchRepresentationMode('client_producteur_enr_mandataire')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          formData.modeRepresentation === 'client_producteur_enr_mandataire'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Client/SPV Producteur + ENR COURTAGE Mandataire
                      </button>
                    </div>
                  </div>

                  {/* Type : Société (coché par défaut) */}
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-xs font-extrabold text-slate-700">Type de Bénéficiaire :</span>
                    {['Société', 'Particulier', 'Collectivité'].map((tOption) => (
                      <label key={tOption} className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="beneficiaireType"
                          value={tOption}
                          checked={formData.beneficiaireType === tOption}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{tOption}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom / Raison sociale</label>
                      <input
                        type="text"
                        name="beneficiaireRaisonSociale"
                        value={formData.beneficiaireRaisonSociale}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Forme juridique</label>
                      <input
                        type="text"
                        name="beneficiaireFormeJuridique"
                        value={formData.beneficiaireFormeJuridique}
                        onChange={handleInputChange}
                        placeholder="SASU (ou SAS au capital de 5 000 €)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">SIREN</label>
                        <input
                          type="text"
                          name="beneficiaireSiren"
                          value={formData.beneficiaireSiren}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">SIRET</label>
                        <input
                          type="text"
                          name="beneficiaireSiret"
                          value={formData.beneficiaireSiret}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Adresse du siège social</label>
                      <input
                        type="text"
                        name="beneficiaireAdresse"
                        value={formData.beneficiaireAdresse}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Code Postal – Ville – Pays</label>
                      <input
                        type="text"
                        name="beneficiaireCpVillePays"
                        value={formData.beneficiaireCpVillePays}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Interlocuteur (Nom, Prénom)</label>
                      <input
                        type="text"
                        name="interlocuteurNomPrenom"
                        value={formData.interlocuteurNomPrenom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Fonction du représentant</label>
                      <input
                        type="text"
                        name="interlocuteurFonction"
                        value={formData.interlocuteurFonction}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Téléphone</label>
                      <input
                        type="text"
                        name="interlocuteurTelephone"
                        value={formData.interlocuteurTelephone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600">E-mail de contact</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFieldChange('interlocuteurEmail', 'y.barberis@enr-courtage.fr')}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold border border-slate-200 cursor-pointer"
                          >
                            y.barberis@enr-courtage.fr
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('interlocuteurEmail', 'contact@enr-courtage.fr')}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold border border-slate-200 cursor-pointer"
                          >
                            contact@enr-courtage.fr
                          </button>
                        </div>
                      </div>
                      <input
                        type="email"
                        name="interlocuteurEmail"
                        value={formData.interlocuteurEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-blue-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Si mode Client/SPV Producteur + ENR COURTAGE Mandataire : afficher l'encart Mandataire */}
                  {formData.modeRepresentation === 'client_producteur_enr_mandataire' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-indigo-950">
                          Mandataire désigné (ENR COURTAGE)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          Mandat de représentation Enedis
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">Raison sociale Mandataire</label>
                          <input
                            type="text"
                            name="mandataireRaisonSociale"
                            value={formData.mandataireRaisonSociale}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">SIRET Mandataire</label>
                          <input
                            type="text"
                            name="mandataireSiret"
                            value={formData.mandataireSiret}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">Interlocuteur Mandataire</label>
                          <input
                            type="text"
                            name="mandataireInterlocuteur"
                            value={formData.mandataireInterlocuteur}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">E-mail Mandataire</label>
                          <input
                            type="text"
                            name="mandataireEmail"
                            value={formData.mandataireEmail}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* A.2 Localisation du Site (dynamique selon le projet ouvert) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        2. Localisation du Site (Dynamique selon le projet actif)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Pré-rempli depuis le dossier projet et modifiable librement avant génération du 056E.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const vars = extractProjectEnedisVariables(project);
                        setFormData(prev => {
                          const next = {
                            ...prev,
                            siteNomInstallation: vars.nom,
                            siteSiret: vars.siret,
                            siteAdresse: vars.adresse,
                            siteCodePostal: vars.codePostal,
                            siteCommune: vars.commune,
                            siteCodeInsee: vars.codeInsee || prev.siteCodeInsee,
                            siteParcelle: vars.parcelle,
                            siteLatitude: vars.latitude,
                            siteLongitude: vars.longitude,
                          };
                          next.noteSiteLigne = buildNoteOraMpSiteLine(next);
                          persistEnedisData(next, false);
                          return next;
                        });
                        toast({ title: 'Données du site réinitialisées', description: 'Les coordonnées du projet actif ont été rechargées.' });
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recharger depuis le projet
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nom de l’Installation (ex: BESS Standalone - Commune)
                      </label>
                      <input
                        type="text"
                        name="siteNomInstallation"
                        value={formData.siteNomInstallation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">SIRET du site</label>
                      <input
                        type="text"
                        name="siteSiret"
                        value={formData.siteSiret}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Adresse du site</label>
                      <input
                        type="text"
                        name="siteAdresse"
                        value={formData.siteAdresse}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Référence parcelle cadastrale</label>
                      <input
                        type="text"
                        name="siteParcelle"
                        value={formData.siteParcelle}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Code Postal</label>
                      <input
                        type="text"
                        name="siteCodePostal"
                        value={formData.siteCodePostal}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Ville / Commune</label>
                      <input
                        type="text"
                        name="siteCommune"
                        value={formData.siteCommune}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Code INSEE Commune</label>
                      <input
                        type="text"
                        name="siteCodeInsee"
                        value={formData.siteCodeInsee}
                        onChange={handleInputChange}
                        placeholder="Ex: 33281"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-extrabold text-blue-900 mb-1">
                          Coordonnées GPS du Point de Raccordement — Latitude (WGS84 Décimal)
                        </label>
                        <input
                          type="text"
                          name="siteLatitude"
                          value={formData.siteLatitude}
                          onChange={handleInputChange}
                          placeholder="Ex: 45.566247"
                          className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-blue-900 mb-1">
                          Coordonnées GPS du Point de Raccordement — Longitude (WGS84 Décimal)
                        </label>
                        <input
                          type="text"
                          name="siteLongitude"
                          value={formData.siteLongitude}
                          onChange={handleInputChange}
                          placeholder="Ex: 1.397687"
                          className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* A.3 Raccordement actuel au réseau & Valorisation / Comptage */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Raccordement actuel au réseau */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                    <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                      3. Raccordement actuel au réseau (RPD)
                    </h3>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Site déjà raccordé au RPD ?</label>
                      <div className="flex items-center gap-5">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="siteDejaRaccordeRpd"
                            value="non"
                            checked={formData.siteDejaRaccordeRpd === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non (par défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="siteDejaRaccordeRpd"
                            value="oui"
                            checked={formData.siteDejaRaccordeRpd === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Oui</span>
                        </label>
                      </div>

                      {formData.siteDejaRaccordeRpd === 'oui' && (
                        <div className="pt-1">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">N° PDL / PRM existant (14 chiffres)</label>
                          <input
                            type="text"
                            name="sitePrmExistant"
                            value={formData.sitePrmExistant}
                            onChange={handleInputChange}
                            maxLength={14}
                            placeholder="Ex: 14253698741236"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Souhait du Demandeur :</label>
                      <div className="space-y-2">
                        {[
                          {
                            id: 'cas_1',
                            label: "Cas 1 : la création d'un nouveau Point de Raccordement dédié à la présente demande",
                          },
                          {
                            id: 'cas_2',
                            label: "Cas 2 : le raccordement sur un Point de Livraison (PDL) existant",
                          },
                          {
                            id: 'cas_3',
                            label: "Cas 3 : la modification d'une installation de production ou de stockage existante",
                          },
                        ].map((cas) => (
                          <label
                            key={cas.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              formData.souhaitDemandeur === cas.id
                                ? 'bg-blue-50/70 border-blue-400 font-bold text-blue-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="souhaitDemandeur"
                              value={cas.id}
                              checked={formData.souhaitDemandeur === cas.id}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                            />
                            <span className="leading-snug">{cas.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Valorisation & Comptage */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                    <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                      4. Valorisation &amp; Comptage
                    </h3>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Modalité de valorisation</label>
                      <input
                        type="text"
                        name="modaliteValorisation"
                        value={formData.modaliteValorisation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Schéma de comptage (S1 à S9 ou Autre)</label>
                      <select
                        name="schemaComptage"
                        value={formData.schemaComptage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {SCHEMAS_COMPTAGE_056E.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.label}</option>
                        ))}
                      </select>
                      {formData.schemaComptage === 'Autre' && (
                        <input
                          type="text"
                          name="schemaComptageAutre"
                          value={formData.schemaComptageAutre}
                          onChange={handleInputChange}
                          placeholder="Précisez le schéma de comptage..."
                          className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      )}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        Attestation d’absence d’autre projet sur le même code INSEE (Art. L.336-4) :
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="attestationAbsenceAutreProjetInsee"
                            value="oui"
                            checked={formData.attestationAbsenceAutreProjetInsee === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span>Oui (aucun autre projet)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="attestationAbsenceAutreProjetInsee"
                            value="non"
                            checked={formData.attestationAbsenceAutreProjetInsee === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">Projets groupés en injection :</label>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="projetsGroupesInjection"
                            value="non"
                            checked={formData.projetsGroupesInjection === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non (coché par défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="projetsGroupesInjection"
                            value="oui"
                            checked={formData.projetsGroupesInjection === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Oui</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* A.4 Encadré « INFORMATIONS COMPLÉMENTAIRES » (Page 9/41 du 056E) — TRÈS IMPORTANT */}
                <div className="bg-amber-50/90 p-4 md:p-5 rounded-2xl border-2 border-amber-400 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-600 text-white">
                        Page 9/41 du 056E — TRÈS IMPORTANT
                      </span>
                      <h3 className="text-sm font-black text-amber-950">
                        5. Encadré « INFORMATIONS COMPLÉMENTAIRES » (Demande prioritaire ORA-MP)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('informationsComplementaires', DEFAULT_INFO_COMPLEMENTAIRES_056E)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Restaurer le texte réglementaire exact
                    </button>
                  </div>

                  <textarea
                    name="informationsComplementaires"
                    value={formData.informationsComplementaires}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-3.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900 leading-relaxed focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
                  />

                  <p className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    <span>
                      Ce texte réglementaire est injecté dans l’encadré « Informations complémentaires » (Page 9/41 du formulaire Enedis-MOP-RES_056E) et renvoie à la Note ORA-MP annexée.
                    </span>
                  </p>
                </div>

                {/* A.5 Type de demande */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    6. Type de demande (Page 10/41 du 056E)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.typeDemande === 'offre_raccordement_travaux_enedis'
                          ? 'bg-blue-50/70 border-blue-500 text-blue-950 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="typeDemande"
                        value="offre_raccordement_travaux_enedis"
                        checked={formData.typeDemande === 'offre_raccordement_travaux_enedis'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <span className="text-xs block">
                          Offre de Raccordement avec travaux sur les ouvrages dédiés réalisés par Enedis
                        </span>
                        <span className="text-[10px] text-blue-700 font-semibold">Recommandé — Coché par défaut</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.typeDemande === 'proposition_avant_completude'
                          ? 'bg-blue-50/70 border-blue-500 text-blue-950 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="typeDemande"
                        value="proposition_avant_completude"
                        checked={formData.typeDemande === 'proposition_avant_completude'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <span className="text-xs block">
                          Proposition de raccordement avant complétude du dossier
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Instruction préliminaire avant complétude</span>
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ONGLET 2 : FICHE C – CARACTÉRISTIQUES HTA & OPTIONS
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'fiche_c' && (
              <motion.div
                key="fiche_c"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* C.1 Configuration du Poste de Livraison */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Fiche C — Enedis-MOP-RES_056E (Pages 15 à 17/41)
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-1">
                      1. Configuration du Poste de Livraison HTA (Page 15/41)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.configPosteLivraison === 'reference_domaine_public'
                          ? 'bg-blue-50/70 border-blue-500 text-blue-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="configPosteLivraison"
                        value="reference_domaine_public"
                        checked={formData.configPosteLivraison === 'reference_domaine_public'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 mt-0.5"
                      />
                      <div>
                        <span className="text-xs block">
                          Raccordement de référence (accessible depuis le domaine public)
                        </span>
                        <span className="text-[10px] text-blue-700 font-semibold">Coché par défaut</span>
                      </div>
                    </label>

                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        formData.configPosteLivraison === 'autre_configuration'
                          ? 'bg-blue-50/70 border-blue-500 text-blue-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="configPosteLivraison"
                          value="autre_configuration"
                          checked={formData.configPosteLivraison === 'autre_configuration'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-bold block">
                            Autre configuration (Poste distant du domaine public)
                          </span>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] font-semibold">Distance d (en mètres) :</span>
                            <input
                              type="number"
                              name="distanceDomainePublicM"
                              value={formData.distanceDomainePublicM}
                              onChange={handleInputChange}
                              className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <span className="text-xs font-bold">m</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* C.2 Puissances de raccordement demandées & Puissance réactive */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    2. Puissance de raccordement demandée &amp; Puissance réactive
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                      <label className="block text-xs font-extrabold text-blue-950 mb-1">
                        En injection (P<sub>racc inj</sub>)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="puissanceRaccInjectionKw"
                          value={formData.puissanceRaccInjectionKw}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white text-sm font-black text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-black text-blue-800">kW</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200">
                      <label className="block text-xs font-extrabold text-purple-950 mb-1">
                        En soutirage (P<sub>racc sout</sub>)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="puissanceRaccSoutirageKw"
                          value={formData.puissanceRaccSoutirageKw}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-sm font-black text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <span className="text-xs font-black text-purple-800">kW</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <label className="block text-xs font-extrabold text-slate-800">
                        Puissance réactive (Arrêté du 9 juin 2020)
                      </label>
                      <div className="flex items-center gap-5 pt-2">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="puissanceReactiveConforme"
                            value="oui"
                            checked={formData.puissanceReactiveConforme === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span>Oui (par défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="puissanceReactiveConforme"
                            value="non"
                            checked={formData.puissanceReactiveConforme === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* C.3 Options pour recevoir plusieurs solutions de raccordement (Page 16/41) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-black text-slate-900">
                      3. Options pour recevoir plusieurs solutions de raccordement (Page 16/41)
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">Enedis-MOP-RES_056E p. 16/41</span>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1 : Devis d'étude division de parc */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">
                        Devis d’étude division de parc :
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="devisDivisionParc"
                            value="oui"
                            checked={formData.devisDivisionParc === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Oui</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                          <input
                            type="radio"
                            name="devisDivisionParc"
                            value="non"
                            checked={formData.devisDivisionParc === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non (par défaut)</span>
                        </label>
                      </div>
                    </div>

                    {/* Option 2 : Devis d'étude puissance d'injection plus faible */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-slate-800">
                          Devis d’étude puissance d’injection plus faible :
                        </span>
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-600">P<sub>racc inj min</sub> =</span>
                          <input
                            type="number"
                            name="puissanceInjectionMinKw"
                            value={formData.puissanceInjectionMinKw}
                            onChange={handleInputChange}
                            className="w-16 text-xs font-black text-slate-900 outline-none text-center border-b border-slate-300"
                          />
                          <span className="text-[11px] font-bold text-slate-700">kW</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="devisPuissanceInjectionFaible"
                            value="oui"
                            checked={formData.devisPuissanceInjectionFaible === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Oui</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                          <input
                            type="radio"
                            name="devisPuissanceInjectionFaible"
                            value="non"
                            checked={formData.devisPuissanceInjectionFaible === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non (par défaut)</span>
                        </label>
                      </div>
                    </div>

                    {/* Option 3 : Devis d'étude Offre à modulation de puissance + Pgar inj + Infobulle d'alerte */}
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="inline-flex items-center gap-2 text-xs font-black text-slate-900 cursor-pointer">
                            <input
                              type="checkbox"
                              name="devisOffreModulationPuissance"
                              checked={Boolean(formData.devisOffreModulationPuissance)}
                              onChange={handleInputChange}
                              className="w-4 h-4 rounded text-blue-600"
                            />
                            <span>Devis d’étude Offre à modulation de puissance (Oui / Non)</span>
                          </label>

                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
                            <span className="text-[11px] font-bold text-slate-700">P<sub>gar inj</sub> =</span>
                            <input
                              type="number"
                              name="puissanceGarantieInjectionKw"
                              value={formData.puissanceGarantieInjectionKw}
                              onChange={handleInputChange}
                              className="w-16 text-xs font-black text-blue-800 outline-none text-center border-b border-amber-300"
                            />
                            <span className="text-[11px] font-bold text-slate-700">kW (soit &ge; 70 %)</span>
                          </div>

                          {/* Bouton Infobulle d'alerte */}
                          <button
                            type="button"
                            onClick={() => setShowOraTooltip(prev => !prev)}
                            onMouseEnter={() => setShowOraTooltip(true)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-950 hover:bg-amber-300 transition-colors cursor-pointer"
                            title="Attention : cette case générale indique une puissance garantie minimale de 70 %. Elle ne remplace pas la demande spécifique de gabarit horaire pour stockage décrite en page 9 et dans la note jointe."
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Infobulle d’alerte réglementaire
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              checked={Boolean(formData.devisOffreModulationPuissance) === true}
                              onChange={() => handleFieldChange('devisOffreModulationPuissance', true)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>Oui</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              checked={Boolean(formData.devisOffreModulationPuissance) === false}
                              onChange={() => handleFieldChange('devisOffreModulationPuissance', false)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>Non</span>
                          </label>
                        </div>
                      </div>

                      {/* Infobulle d'alerte permanente / déployable */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <p className="font-semibold leading-snug">
                          <strong>Attention :</strong> cette case générale indique une puissance garantie minimale de 70 %. Elle ne remplace pas la demande spécifique de gabarit horaire pour stockage décrite en page 9 et dans la note jointe.
                        </p>
                      </div>
                    </div>

                    {/* Option 4 : Capacité d'accueil des 3 départs HTA existants les plus proches */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">
                        Capacité d’accueil des 3 départs HTA existants les plus proches :
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="capaciteAccueil3DepartsHta"
                            value="oui"
                            checked={formData.capaciteAccueil3DepartsHta === 'oui'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span>Oui (coché par défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="capaciteAccueil3DepartsHta"
                            value="non"
                            checked={formData.capaciteAccueil3DepartsHta === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* C.4 Régulation de puissance active P = f(f) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      4. Régulation de puissance active P = f(f) (Page 17/41)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Participation du système de stockage au réglage de la fréquence réseau (Arrêté du 9 juin 2020)
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                      <input
                        type="radio"
                        name="regulationPuissanceActivePf"
                        value="oui"
                        checked={formData.regulationPuissanceActivePf === 'oui'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <span>Oui (coché par défaut)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="regulationPuissanceActivePf"
                        value="non"
                        checked={formData.regulationPuissanceActivePf === 'non'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ONGLET 3 : FICHES E4 / T1 – CARACTÉRISTIQUES STOCKAGE & BATTERIES
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'fiche_e4_t1' && (
              <motion.div
                key="fiche_e4_t1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* E4.1 Architecture par défaut (modifiable) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      Fiches E4 &amp; T1 — Enedis-MOP-RES_056E (Version 2)
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-1">
                      1. Architecture Technique Stockage &amp; Batteries (Fiche E4)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Type d’installation</label>
                      <input
                        type="text"
                        name="typeInstallationStockage"
                        value={formData.typeInstallationStockage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Modèle des unités</label>
                      <input
                        type="text"
                        name="modeleBatterie"
                        value={formData.modeleBatterie}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-purple-900 bg-purple-50/40 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre d’unités (Texte descriptif)</label>
                      <input
                        type="text"
                        name="nombreUnitesTexte"
                        value={formData.nombreUnitesTexte}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Puissance active totale installée (P<sub>installée</sub> kW)
                      </label>
                      <input
                        type="number"
                        name="puissanceActiveTotaleInstalleeKw"
                        value={formData.puissanceActiveTotaleInstalleeKw}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Puissance apparente maximale (kVA)
                      </label>
                      <input
                        type="number"
                        name="puissanceApparenteMaximaleKva"
                        value={formData.puissanceApparenteMaximaleKva}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Mode de raccordement</label>
                      <input
                        type="text"
                        name="modeRaccordement"
                        value={formData.modeRaccordement}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Capacité totale installée (kWh)</label>
                      <input
                        type="number"
                        name="capaciteTotaleKwh"
                        value={formData.capaciteTotaleKwh}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Convertisseurs / Onduleurs (PCS)</label>
                      <input
                        type="text"
                        name="onduleursPcsDetail"
                        value={formData.onduleursPcsDetail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Protection de découplage HTA</label>
                      <input
                        type="text"
                        name="protectionDecouplageDetail"
                        value={formData.protectionDecouplageDetail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Conformité normative</label>
                      <input
                        type="text"
                        name="conformiteNormative"
                        value={formData.conformiteNormative}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* T1 : Caractéristiques du Transformateur élévateur BT/HTA */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    2. Caractéristiques du Transformateur Élévateur BT / HTA (Fiche T1)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Puissance nominale (kVA)</label>
                      <input
                        type="text"
                        name="transfoPuissanceNominaleKva"
                        value={formData.transfoPuissanceNominaleKva}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Tension Primaire HTA</label>
                      <input
                        type="text"
                        name="transfoTensionPrimaireHta"
                        value={formData.transfoTensionPrimaireHta}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Tension Secondaire BT</label>
                      <input
                        type="text"
                        name="transfoTensionSecondaireBt"
                        value={formData.transfoTensionSecondaireBt}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Couplage</label>
                      <input
                        type="text"
                        name="transfoCouplage"
                        value={formData.transfoCouplage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Tension court-circuit Ucc (%)</label>
                      <input
                        type="text"
                        name="transfoUccPercent"
                        value={formData.transfoUccPercent}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Certification des données */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    3. Certification des données (Signature du formulaire 056E)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom – Prénom du signataire</label>
                      <input
                        type="text"
                        name="signataireNomPrenom"
                        value={formData.signataireNomPrenom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Lieu</label>
                      <input
                        type="text"
                        name="signatureLieu"
                        value={formData.signatureLieu}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Date (JJ/MM/AAAA)</label>
                      <input
                        type="text"
                        name="signatureDate"
                        value={formData.signatureDate}
                        onChange={handleInputChange}
                        placeholder="JJ/MM/AAAA"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ONGLET 4 : NOTE COMPLÉMENTAIRE « DEMANDE PRIORITAIRE D'ORA-MP »
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'note_oramp' && (
              <motion.div
                key="note_oramp"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Bandeau d'explication réglementaire */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white border border-blue-800/50 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        Annexe obligatoire au 056E
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Art. 11 Enedis-NMO-RES_030E &amp; Variante 2A Enedis-MOP-RES_046E
                      </span>
                    </div>
                    <h3 className="text-sm font-black">
                      Note complémentaire — Demande prioritaire d’ORA-MP pour stockage autonome (500 kW)
                    </h3>
                    <p className="text-xs text-slate-300">
                      Toutes les variables du projet ont été injectées automatiquement. Vous pouvez modifier librement chaque paragraphe avant l’export PDF 1 page.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setNoteSiteManuallyEdited(false);
                        setFormData(prev => {
                          const next = {
                            ...prev,
                            noteObjet: 'Demande prioritaire d’ORA-MP pour stockage autonome — 500 kW',
                            noteSiteLigne: buildNoteOraMpSiteLine(prev),
                            noteSalutation: 'Madame, Monsieur,',
                            noteCorps: DEFAULT_NOTE_ORAMP_CORPS,
                            noteFaitA: 'Mérignac',
                            noteDate: new Date().toLocaleDateString('fr-FR'),
                            noteNomQualiteDemandeur: 'Yann BARBERIS, Président – ENR COURTAGE',
                          };
                          persistEnedisData(next, false);
                          return next;
                        });
                        toast({
                          title: 'Note ORA-MP réinitialisée',
                          description: 'Le modèle réglementaire officiel avec les variables du projet a été restauré.',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réinitialiser le modèle ORA-MP
                    </button>
                  </div>
                </div>

                {/* Éditeur structuré + Aperçu */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="grid grid-cols-1 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Objet de la note</label>
                      <input
                        type="text"
                        name="noteObjet"
                        value={formData.noteObjet}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-blue-950 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          Identification du Site (Nom, Commune, CP, Parcelle, Coordonnées GPS)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setNoteSiteManuallyEdited(false);
                            handleFieldChange('noteSiteLigne', buildNoteOraMpSiteLine(formData));
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Synchroniser depuis l’Onglet 1 (Fiche A)
                        </button>
                      </div>
                      <input
                        type="text"
                        name="noteSiteLigne"
                        value={formData.noteSiteLigne}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/40 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Civilité / Salutation</label>
                      <input
                        type="text"
                        name="noteSalutation"
                        value={formData.noteSalutation}
                        onChange={handleInputChange}
                        className="w-full sm:w-64 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Corps de la Note Complémentaire ORA-MP (100 % éditable)
                      </label>
                      <textarea
                        name="noteCorps"
                        value={formData.noteCorps}
                        onChange={handleInputChange}
                        rows={11}
                        className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Fait à</label>
                        <input
                          type="text"
                          name="noteFaitA"
                          value={formData.noteFaitA}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Le (Date du jour)</label>
                        <input
                          type="text"
                          name="noteDate"
                          value={formData.noteDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom et qualité du demandeur</label>
                        <input
                          type="text"
                          name="noteNomQualiteDemandeur"
                          value={formData.noteNomQualiteDemandeur}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Bloc Cachet & Signature d'ENR COURTAGE */}
                    <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <label className="inline-flex items-center gap-2 text-xs font-black text-slate-900 cursor-pointer">
                            <input
                              type="checkbox"
                              name="inclureCachetSignature"
                              checked={Boolean(formData.inclureCachetSignature)}
                              onChange={handleInputChange}
                              className="w-4 h-4 rounded text-blue-600"
                            />
                            <span>Insérer l’image du cachet / signature d’ENR COURTAGE en bas de page</span>
                          </label>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Un cachet officiel ENR COURTAGE (7 Rue Gutenberg 33700 Mérignac, SIREN 881 890 982) avec signature est pré-intégré. Vous pouvez aussi importer votre propre image PNG/JPG.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleUploadSignatureImage}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Importer une image de cachet / signature
                          </button>

                          {formData.signatureImageBase64 && (
                            <button
                              type="button"
                              onClick={() => handleFieldChange('signatureImageBase64', null)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                            >
                              Utiliser le cachet officiel ENR COURTAGE par défaut
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Aperçu miniature du cachet & signature */}
                      {formData.inclureCachetSignature && activeStampSrc && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 mb-1">Aperçu Cachet &amp; Signature</span>
                          <img
                            src={activeStampSrc}
                            alt="Cachet et signature ENR COURTAGE"
                            className="h-20 w-auto object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════════
              ENCART RÉCAPITULATIF PERMANENT : CHECKLIST DES PIÈCES À JOINDRE
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Checklist des pièces à déposer sur le portail Enedis avec les 2 PDF générés
                </h4>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {Object.values(formData.checklistPieces || {}).filter(Boolean).length} / {ENEDIS_056E_CHECKLIST_PIECES.length} pièces cochées
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {ENEDIS_056E_CHECKLIST_PIECES.map((piece) => {
                const checked = Boolean(formData.checklistPieces?.[piece.id]);
                return (
                  <label
                    key={piece.id}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'bg-emerald-50/50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleChecklistPiece(piece.id)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 mt-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold leading-tight">{piece.label}</p>
                      <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{piece.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. PIED DE MODALE (FOOTER) — BARRE D'ACTIONS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="px-4 md:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
          {/* Bouton 1 : Enregistrer les modifications */}
          <button
            type="button"
            onClick={handleSaveModifications}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Save className="w-3.5 h-3.5 text-blue-600" />}
            Enregistrer les modifications
          </button>

          {/* Boutons de génération PDF & Pack Complet Enedis */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bouton 2 : Générer le Formulaire 056E (PDF) */}
            <button
              type="button"
              onClick={handleGenerate056EPdf}
              disabled={generatingAction !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 transition-all cursor-pointer disabled:opacity-50"
            >
              {generatingAction === '056e' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
              )}
              Générer le Formulaire 056E (PDF)
            </button>

            {/* Bouton 3 : Générer la Note ORA-MP (PDF) */}
            <button
              type="button"
              onClick={handleGenerateOraMpPdf}
              disabled={generatingAction !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 transition-all cursor-pointer disabled:opacity-50"
            >
              {generatingAction === 'oramp' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
              )}
              Générer la Note ORA-MP (PDF)
            </button>

            {/* Bouton 4 (Principal) : Télécharger le Pack Complet Enedis (PDF fusionné + option ZIP) */}
            <div className="inline-flex items-center rounded-xl shadow-sm overflow-hidden border border-emerald-700">
              <button
                type="button"
                onClick={handleDownloadPackMergedPdf}
                disabled={generatingAction !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer disabled:opacity-50"
                title="Télécharger un PDF unique fusionnant le Formulaire 056E (V2) et la Note Complémentaire ORA-MP"
              >
                {generatingAction === 'pack_pdf' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Télécharger le Pack Complet Enedis (PDF)
              </button>
              <button
                type="button"
                onClick={handleDownloadPackZip}
                disabled={generatingAction !== null}
                className="inline-flex items-center gap-1 px-2.5 py-2.5 text-xs font-extrabold text-emerald-100 bg-emerald-800 hover:bg-emerald-900 border-l border-emerald-600 transition-all cursor-pointer disabled:opacity-50"
                title="Télécharger le Pack Complet Enedis au format Archive .ZIP (PDF séparés + PDF fusionné + Checklist)"
              >
                {generatingAction === 'pack_zip' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
                <span>ZIP</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
