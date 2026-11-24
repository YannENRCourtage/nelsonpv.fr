import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug, Zap, FileText, Download, X, Info, Loader2, Building2,
  ShieldCheck, AlertCircle, CheckCircle2, FileDown,
  Clock, Archive, Save, Layers, BatteryCharging,
  Check, AlertTriangle, RefreshCw, Upload, MapPin, Sparkles,
  CheckSquare, HelpCircle, Eye, ExternalLink, Copy
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cadastreService } from '@/services/CadastreService';
import {
  ENR_COURTAGE_INFO,
  DEFAULT_INFO_COMPLEMENTAIRES_056E,
  DEFAULT_NOTE_ORAMP_CORPS,
  SCHEMAS_COMPTAGE_056E,
  ENEDIS_056E_CHECKLIST_PIECES,
  ENEDIS_SIMULATION_DIAGNOSTIC_OPTIONS,
  extractProjectEnedisVariables,
  buildNoteOraMpSiteLine,
  generateDefaultEnrCourtageStampDataUrl,
  getInitialEnedis056EData,
  generateEnedis056EPdf,
  generateOraMpNotePdf,
  generateEnedisCompletePackPdf,
  generateEnedisCompletePackZip,
  computeEnedisNetworkPreDiagnosis,
  buildEnedisSimulatorClipboardPayload,
  openEnedisSimulatorWithClipboard,
  getSavedEnedisSimulation,
  saveEnedisSimulationToStorage,
  parseEnedisSimulationPdf,
} from '@/services/raccordementDocumentService';

const PCS_CONSTRUCTOR_PRESETS = [
  {
    label: 'CESC Mercury 261 (125 kVA)',
    marqueRef: 'CESC Mercury 261 — PCS Bidirectionnel 125 kVA (IGBT-MLI)',
    modeleBatterie: 'CESC Mercury 261 - LFP',
  },
  {
    label: 'Kehua BCS125K (125 kVA)',
    marqueRef: 'Kehua Tech BCS125K-B-HUD — PCS 125 kVA Triphasé (IGBT-MLI)',
    modeleBatterie: 'CESC / CATL LFP + PCS Kehua 125 kVA',
  },
  {
    label: 'Sungrow SC125CX (125 kVA)',
    marqueRef: 'Sungrow SC125CX — PCS Bidirectionnel 125 kVA (IGBT-MLI)',
    modeleBatterie: 'Sungrow PowerStack / LFP 125 kW',
  },
  {
    label: 'Huawei LUNA2000 (125 kVA)',
    marqueRef: 'Huawei LUNA2000-125KTL-M0 — PCS Smart 125 kVA (IGBT-MLI)',
    modeleBatterie: 'Huawei LUNA2000 Smart String ESS',
  },
];

export default function RaccordementModal({ isOpen, onClose, project, onSave }) {
  const [activeTab, setActiveTab] = useState('fiche_a');
  const [formData, setFormData] = useState(() => getInitialEnedis056EData(project));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [generatingAction, setGeneratingAction] = useState(null); // '056e' | 'oramp' | 'pack_pdf' | 'pack_zip' | null
  const [showOraTooltip, setShowOraTooltip] = useState(false);
  const [defaultStampUrl, setDefaultStampUrl] = useState(null);
  const [noteSiteManuallyEdited, setNoteSiteManuallyEdited] = useState(false);

  // État Simulation indicative Enedis (Pré-diagnostic, PDF importé & références extraites)
  const [enedisSimulation, setEnedisSimulation] = useState(() => getSavedEnedisSimulation(project));
  const [isParsingSimPdf, setIsParsingSimPdf] = useState(false);
  const [isDraggingSimPdf, setIsDraggingSimPdf] = useState(false);

  const fileInputRef = useRef(null);
  const simPdfInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const loadedProjectIdRef = useRef(null);

  const networkPreDiagnosis = computeEnedisNetworkPreDiagnosis(project);
  const simulatorClipboardPayload = buildEnedisSimulatorClipboardPayload(project, formData);

  const persistSimulationData = (nextSim) => {
    setEnedisSimulation(nextSim);
    if (!project?.id) return;
    saveEnedisSimulationToStorage(project.id, nextSim);
    const todayFr = new Date().toLocaleDateString('fr-FR');
    if (onSave) {
      onSave({
        enedisSimulation: nextSim,
        lastIntervention: todayFr,
        derniereIntervention: todayFr,
      });
    }
  };

  const handleImportEnedisSimulationPdf = async (file) => {
    if (!file) return;
    setIsParsingSimPdf(true);
    try {
      const parsed = await parseEnedisSimulationPdf(file);
      if (parsed) {
        persistSimulationData(parsed);
        setLastSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        toast({
          title: 'PDF de simulation Enedis importé ✓',
          description: `Simulation n° ${parsed.simulationNumber} (Réf. ${parsed.reference}) • Diagnostic : ${parsed.diagnosticReseau}`,
        });
      }
    } catch (err) {
      console.error('Erreur import PDF simulation Enedis:', err);
      toast({
        title: 'Erreur lecture PDF',
        description: 'Impossible d’extraire automatiquement le PDF de simulation Enedis.',
        variant: 'destructive',
      });
    } finally {
      setIsParsingSimPdf(false);
    }
  };

  const handleUpdateSimulationField = (field, value) => {
    const base = enedisSimulation || {
      simulationNumber: '',
      reference: '',
      diagnosticReseau: 'Adaptation de réseau',
      dateSimulation: new Date().toLocaleDateString('fr-FR'),
      fileName: '',
    };
    const updated = { ...base, [field]: value };
    persistSimulationData(updated);
  };

  // Générer le cachet vectoriel ENR COURTAGE au montage
  useEffect(() => {
    const url = generateDefaultEnrCourtageStampDataUrl();
    if (url) setDefaultStampUrl(url);
  }, []);

  // Résolution asynchrone Cadastre / Code INSEE
  const resolveCadastreAndInseeAsync = async (initialData) => {
    const lat = parseFloat(initialData.siteLatitude);
    const lng = parseFloat(initialData.siteLongitude);
    const cp = initialData.siteCodePostal;

    if (!initialData.siteCodeInsee || !initialData.siteParcelle || initialData.siteParcelle === 'À préciser') {
      let resolvedInsee = initialData.siteCodeInsee;
      let resolvedParcelle = initialData.siteParcelle;
      let resolvedCommune = initialData.siteCommune;

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
          // ignore
        }
      }

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
          // ignore
        }
      }

      if (resolvedInsee !== initialData.siteCodeInsee || resolvedParcelle !== initialData.siteParcelle) {
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
    }
  };

  // Initialisation à l'ouverture de la modale ou au changement de projet
  useEffect(() => {
    if (project && isOpen) {
      const initial = getInitialEnedis056EData(project);
      setFormData(initial);
      setEnedisSimulation(getSavedEnedisSimulation(project));
      setNoteSiteManuallyEdited(false);
      loadedProjectIdRef.current = project.id;
      resolveCadastreAndInseeAsync(initial);
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

  // Action globale : Recharger tous les champs depuis le projet actif
  const handleReloadFromProject = () => {
    if (!project) return;
    const freshData = getInitialEnedis056EData(project, null, { forceReload: true });
    setFormData(freshData);
    setNoteSiteManuallyEdited(false);
    persistEnedisData(freshData, false);
    resolveCadastreAndInseeAsync(freshData);
    toast({
      title: 'Dossier rechargé depuis le projet ✓',
      description: 'Les 4 onglets (Fiche A, Fiche C, Fiche E4/T1 et Note ORA-MP) ont été ré-hydratés avec les données du projet actif.',
    });
  };

  // Handler générique de modification de champ
  const handleFieldChange = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Si Pracc_inj change, recalculer automatiquement Qmin (-0,35 × Pracc_inj), Qmax (0,40 × Pracc_inj) et ΔPmax défaut (0,5 × Pracc_inj)
      if (name === 'puissanceRaccInjectionKw' || name === 'puissanceProductionInstalleeKw') {
        const pKw = parseFloat(value);
        if (!isNaN(pKw) && pKw > 0) {
          const qMinR = parseFloat(updated.qMinRatio) || -0.35;
          const qMaxR = parseFloat(updated.qMaxRatio) || 0.4;
          updated.qMinKvar = String(Math.round(qMinR * pKw));
          updated.qMaxKvar = String(Math.round(qMaxR * pKw));
          if (updated.deltaPmaxMode !== 'autre') {
            const dKw = Math.round(0.5 * pKw);
            updated.deltaPmaxKwMin = String(dKw);
            updated.deltaPmaxMwMin = String((dKw / 1000).toFixed(2));
          }
        }
      }

      // Synchroniser capacité kWh <-> Énergie stockable MWh
      if (name === 'capaciteTotaleKwh') {
        const kwh = parseFloat(value);
        if (!isNaN(kwh) && kwh > 0) {
          updated.energieStockableMwh = kwh % 1000 === 0
            ? String(kwh / 1000)
            : (kwh / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
        }
      }

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
          beneficiaireCodePostal: ENR_COURTAGE_INFO.codePostal,
          beneficiaireVille: ENR_COURTAGE_INFO.ville,
          beneficiaireCpVillePays: ENR_COURTAGE_INFO.cpVillePays,
          interlocuteurNomPrenom: ENR_COURTAGE_INFO.interlocuteurNomPrenom,
          interlocuteurFonction: ENR_COURTAGE_INFO.fonction,
          interlocuteurTelephone: ENR_COURTAGE_INFO.telephone,
          interlocuteurEmail: ENR_COURTAGE_INFO.email,
          siteSiret: ENR_COURTAGE_INFO.siret,
        };
      } else {
        updated = {
          ...prev,
          modeRepresentation: 'client_producteur_enr_mandataire',
          beneficiaireType: 'Société',
          beneficiaireRaisonSociale: vars.spvRaisonSociale || 'SPV / Client Producteur',
          beneficiaireFormeJuridique: vars.spvFormeJuridique || 'SAS / SCI',
          beneficiaireSiren: vars.spvSiren || ENR_COURTAGE_INFO.siren,
          beneficiaireSiret: vars.spvSiret || ENR_COURTAGE_INFO.siret,
          beneficiaireAdresse: vars.spvAdresse || vars.adresse || ENR_COURTAGE_INFO.adresse,
          beneficiaireCodePostal: vars.spvCodePostal || vars.codePostal || ENR_COURTAGE_INFO.codePostal,
          beneficiaireVille: vars.spvVille || vars.commune || ENR_COURTAGE_INFO.ville,
          beneficiaireCpVillePays: vars.spvCpVillePays || `${vars.codePostal || '33700'} ${vars.commune || 'Mérignac'} - France`,
          interlocuteurNomPrenom: `${vars.clientNom} ${vars.clientPrenom}`.trim() || ENR_COURTAGE_INFO.interlocuteurNomPrenom,
          interlocuteurFonction: vars.clientFonction || 'Président / Gérant',
          interlocuteurTelephone: vars.clientTel || ENR_COURTAGE_INFO.telephone,
          interlocuteurEmail: vars.clientEmail || ENR_COURTAGE_INFO.email,
          siteSiret: vars.spvSiret || prev.siteSiret || ENR_COURTAGE_INFO.siret,
          // Mandataire = ENR COURTAGE
          typeMandatRepresentation: 'special',
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

  // Action : Enregistrer explicitement les modifications
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
      subtitle: 'Enedis-MOP-RES_056E (Pages 4 à 10/41)',
      icon: Building2,
    },
    {
      id: 'fiche_c',
      badge: 'Onglet 2',
      shortCode: 'Fiche C',
      title: 'Fiche C – Raccordement HTA, Q=f(U) & ΔPmax',
      subtitle: 'Enedis-MOP-RES_056E (Pages 14 à 19/41)',
      icon: Zap,
    },
    {
      id: 'fiche_e4_t1',
      badge: 'Onglet 3',
      shortCode: 'Fiche E4 / T1',
      title: 'Fiche E4 / T1 – Stockage Batterie & Onduleurs PCS',
      subtitle: 'Enedis-MOP-RES_056E (Pages 20-22 & 35-36/41)',
      icon: BatteryCharging,
    },
    {
      id: 'note_oramp',
      badge: 'Onglet 4',
      shortCode: 'Note ORA-MP',
      title: 'Note Complémentaire ORA-MP Prioritaire',
      subtitle: 'Art. 11 NMO-RES_030E & Variante 2A 046E',
      icon: FileText,
    },
  ];

  const activeStampSrc = formData.signatureImageBase64 || defaultStampUrl;
  const previewParagraphs = String(formData.noteCorps || DEFAULT_NOTE_ORAMP_CORPS)
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 12 }}
        className="bg-white rounded-3xl shadow-2xl w-[95vw] max-w-7xl h-[92vh] max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
      >
        {/* ═══════════════════════════════════════════════════════════════════
            1. EN-TÊTE FIXE DE LA MODALE (Nom du projet, Commune, Statut, Recharger)
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
                    {formData.siteNomInstallation || project?.name || 'Demande de Raccordement Enedis BESS 500 kW'}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    Enedis-MOP-RES_056E (V2) + Note ORA-MP Prioritaire
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
                    BESS 4 × 125 kW — HTA 20 kV — {formData.puissanceRaccInjectionKw || 500} kW Inj. / {formData.puissanceRaccSoutirageKw || 500} kW Sout.
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

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleReloadFromProject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-cyan-200 border border-white/15 transition-colors cursor-pointer"
                title="Ré-hydrater automatiquement tous les champs des 4 onglets depuis les données du projet actif"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recharger depuis le projet</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
                title="Fermer la modale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. BARRE FIXE DES 4 ONGLETS D'ÉDITION
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 md:px-6 py-2 flex-shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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
            3. CORPS SCROLLABLE DE LA MODALE — SIMULATION ENEDIS + 4 ONGLETS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/60 space-y-5">
          {/* ═══════════════════════════════════════════════════════════════════
              BLOC DÉDIÉ : SIMULATION INDICATIVE DE RACCORDEMENT ENEDIS
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border-2 border-blue-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-600 text-white flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Simulation indicative Enedis
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  Pré-diagnostic Réseau Local (Caparéseau / ODRE) &amp; Simulateur Officiel Enedis
                </h3>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    networkPreDiagnosis.isStandardProbable
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {networkPreDiagnosis.badgeLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEnedisSimulatorWithClipboard(project, formData, toast)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xs transition-all cursor-pointer"
                  title="Copie automatiquement le nom du poste client, les coordonnées GPS et 500 kW dans le presse-papiers puis ouvre le simulateur Enedis"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir le simulateur Enedis
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* 1. Encart Pré-diagnostic réseau instantané (5 colonnes) */}
              <div className="lg:col-span-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    1. Pré-diagnostic réseau instantané (NELSON)
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {networkPreDiagnosis.tension}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 block">Poste source associé :</span>
                    <span className="font-black text-slate-900 block truncate" title={networkPreDiagnosis.posteSource}>
                      {networkPreDiagnosis.posteSource}
                    </span>
                    <span className="text-[10.5px] font-bold text-blue-700">
                      Distance : {networkPreDiagnosis.distanceKm != null ? `${networkPreDiagnosis.distanceKm} km` : '— km'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 block">Capacité résiduelle &amp; File :</span>
                    <span className={`font-black block ${networkPreDiagnosis.capaciteResiduelleMw > 0.5 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {networkPreDiagnosis.capaciteResiduelleMw} MW disponible
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-600">
                      File d’attente : {networkPreDiagnosis.fileAttenteMw} MW
                    </span>
                  </div>

                  <div className="col-span-2 bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Quote-part S3REnR estimée (500 kW) :</span>
                      <span className="font-black text-slate-900 text-xs">
                        {networkPreDiagnosis.quotePart500KwEur.toLocaleString('fr-FR')} € HT{' '}
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          (barème : {networkPreDiagnosis.quotePartUnitaireStr})
                        </span>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {networkPreDiagnosis.typologieZoneCre}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Paramètres prêts à coller dans le simulateur Enedis (3 colonnes) */}
              <div className="lg:col-span-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">
                    2. Paramètres copiés
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(simulatorClipboardPayload.text);
                        toast({
                          title: 'Paramètres copiés ! Collez les coordonnées dans le simulateur Enedis',
                          description: simulatorClipboardPayload.nomPosteClient,
                        });
                      } catch (e) {
                        // ignore
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copier
                  </button>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-200/70 text-[11px] space-y-1 font-medium text-slate-700">
                  <div className="truncate">
                    <span className="text-slate-400 font-bold">Poste client :</span>{' '}
                    <strong className="text-slate-900">{simulatorClipboardPayload.nomPosteClient}</strong>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-bold">GPS :</span>{' '}
                    <strong className="font-mono text-blue-900">{simulatorClipboardPayload.gpsCoords}</strong>
                  </div>
                  <div className="flex items-center justify-between pt-0.5 border-t border-slate-100">
                    <span>
                      <span className="text-slate-400 font-bold">Type :</span>{' '}
                      <strong className="text-slate-900">{simulatorClipboardPayload.type}</strong>
                    </span>
                    <span className="font-black text-blue-700">{simulatorClipboardPayload.puissance}</span>
                  </div>
                </div>

                <p className="text-[10px] text-blue-800 leading-tight">
                  Ces 4 paramètres sont copiés automatiquement au clic sur « Ouvrir le simulateur Enedis ».
                </p>
              </div>

              {/* 3. Import & Parsing du PDF de simulation Enedis (4 colonnes) */}
              <div className="lg:col-span-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    3. Importer le PDF de simulation Enedis
                  </span>
                  {enedisSimulation?.fileDataUrl && (
                    <a
                      href={enedisSimulation.fileDataUrl}
                      download={enedisSimulation.fileName || 'Simulation_Enedis.pdf'}
                      className="text-[10px] font-extrabold text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Télécharger PDF
                    </a>
                  )}
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingSimPdf(true); }}
                  onDragLeave={() => setIsDraggingSimPdf(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingSimPdf(false);
                    const f = e.dataTransfer?.files?.[0];
                    if (f) handleImportEnedisSimulationPdf(f);
                  }}
                >
                  <input
                    ref={simPdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportEnedisSimulationPdf(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => simPdfInputRef.current?.click()}
                    disabled={isParsingSimPdf}
                    className={`w-full py-2 px-3 rounded-xl border-2 border-dashed text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isDraggingSimPdf
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : enedisSimulation?.fileName
                          ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 hover:bg-emerald-100/70'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isParsingSimPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {enedisSimulation?.fileName
                        ? `📄 ${enedisSimulation.fileName} (Cliquer/Glisser pour remplacer)`
                        : 'Glisser-déposer le PDF Enedis (ex: Simulation_7060609_7060610.pdf)'}
                    </span>
                  </button>
                </div>

                {/* Champs extraits / saisie rapide assistée */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500">N° Simulation</label>
                    <input
                      type="text"
                      value={enedisSimulation?.simulationNumber || ''}
                      onChange={(e) => handleUpdateSimulationField('simulationNumber', e.target.value)}
                      placeholder="7060609"
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500">Référence</label>
                    <input
                      type="text"
                      value={enedisSimulation?.reference || ''}
                      onChange={(e) => handleUpdateSimulationField('reference', e.target.value)}
                      placeholder="7060609 / 7060610"
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500">Diagnostic réseau</label>
                    <select
                      value={enedisSimulation?.diagnosticReseau || 'Adaptation de réseau'}
                      onChange={(e) => handleUpdateSimulationField('diagnosticReseau', e.target.value)}
                      className="w-full px-1.5 py-1 rounded-lg border border-slate-200 bg-white text-[10.5px] font-bold text-slate-900"
                    >
                      {ENEDIS_SIMULATION_DIAGNOSTIC_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500">Date simulation</label>
                    <input
                      type="text"
                      value={enedisSimulation?.dateSimulation || ''}
                      onChange={(e) => handleUpdateSimulationField('dateSimulation', e.target.value)}
                      placeholder="JJ/MM/AAAA"
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ─────────────────────────────────────────────────────────────
                ONGLET 1 : FICHE A – DONNÉES GÉNÉRALES (Pages 4 à 10/41 du 056E)
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'fiche_a' && (
              <motion.div
                key="fiche_a"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* A.1 Bénéficiaire du raccordement (Producteur) & Mandataire (Pages 4-5/41) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Fiche A — Pages 4 &amp; 5/41 du 056E
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        1. Bénéficiaire du raccordement (Producteur) &amp; Mandataire
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-extrabold text-slate-700">Type :</span>
                        {['Société', 'Particulier', 'Collectivité'].map((tOption) => (
                          <label key={tOption} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="beneficiaireType"
                              value={tOption}
                              checked={formData.beneficiaireType === tOption}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{tOption}</span>
                          </label>
                        ))}
                      </div>

                      {/* Switch rapide Producteur / Mandataire */}
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
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
                  </div>

                  {/* Grille sur 4 colonnes pour exploiter max-w-7xl */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom / Raison sociale *</label>
                      <input
                        type="text"
                        name="beneficiaireRaisonSociale"
                        value={formData.beneficiaireRaisonSociale}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Forme juridique *</label>
                      <input
                        type="text"
                        name="beneficiaireFormeJuridique"
                        value={formData.beneficiaireFormeJuridique}
                        onChange={handleInputChange}
                        placeholder="SASU (SAS au capital de 5 000 €)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">N° SIREN *</label>
                      <input
                        type="text"
                        name="beneficiaireSiren"
                        value={formData.beneficiaireSiren}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">N° SIRET *</label>
                      <input
                        type="text"
                        name="beneficiaireSiret"
                        value={formData.beneficiaireSiret}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Adresse (du siège social) *</label>
                      <input
                        type="text"
                        name="beneficiaireAdresse"
                        value={formData.beneficiaireAdresse}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Code Postal – Ville – Pays *</label>
                      <input
                        type="text"
                        name="beneficiaireCpVillePays"
                        value={formData.beneficiaireCpVillePays}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Interlocuteur (Nom, Prénom) *</label>
                      <input
                        type="text"
                        name="interlocuteurNomPrenom"
                        value={formData.interlocuteurNomPrenom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Fonction du représentant *</label>
                      <input
                        type="text"
                        name="interlocuteurFonction"
                        value={formData.interlocuteurFonction}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Téléphone *</label>
                      <input
                        type="text"
                        name="interlocuteurTelephone"
                        value={formData.interlocuteurTelephone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600">E-mail *</label>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('interlocuteurEmail', 'y.barberis@enr-courtage.fr')}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold border border-slate-200 cursor-pointer"
                        >
                          y.barberis@
                        </button>
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

                  {/* Si mode Client/SPV Producteur + ENR COURTAGE Mandataire : afficher l'encart Mandataire (Page 5/41) */}
                  {formData.modeRepresentation === 'client_producteur_enr_mandataire' && (
                    <div className="mt-2 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-indigo-950">
                          LE MANDATAIRE (Page 5/41 du 056E — ENR COURTAGE tiers habilité)
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-900 cursor-pointer">
                            <input
                              type="radio"
                              name="typeMandatRepresentation"
                              value="special"
                              checked={formData.typeMandatRepresentation !== 'simple'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-indigo-600"
                            />
                            <span>Mandat Spécial de représentation</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 cursor-pointer">
                            <input
                              type="radio"
                              name="typeMandatRepresentation"
                              value="simple"
                              checked={formData.typeMandatRepresentation === 'simple'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-indigo-600"
                            />
                            <span>Mandat Simple</span>
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
                          <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">Nom du représentant</label>
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

                {/* A.2 Localisation du Site (Dynamique, Page 5/41) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        2. Localisation du Site (Page 5/41 — Auto-hydraté depuis le projet BESS actif)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Format officiel : BESS Standalone - [Commune] ([Nom Projet/Client]) • Coordonnées GPS WGS84 Décimal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleReloadFromProject}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recharger depuis le projet
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nom de l’Installation * (BESS Standalone - [Commune] ([Nom Projet/Client]))
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
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">SIRET du site (entité porteuse)</label>
                      <input
                        type="text"
                        name="siteSiret"
                        value={formData.siteSiret}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
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

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Adresse du site *</label>
                      <input
                        type="text"
                        name="siteAdresse"
                        value={formData.siteAdresse}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Code Postal *</label>
                        <input
                          type="text"
                          name="siteCodePostal"
                          value={formData.siteCodePostal}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Code INSEE *</label>
                        <input
                          type="text"
                          name="siteCodeInsee"
                          value={formData.siteCodeInsee}
                          onChange={handleInputChange}
                          placeholder="Ex: 33281"
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Ville / Commune *</label>
                      <input
                        type="text"
                        name="siteCommune"
                        value={formData.siteCommune}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4 bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-extrabold text-blue-900 mb-1">
                          Latitude (Décimal WGS84) *
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
                          Longitude (Décimal WGS84) *
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
                      <div className="px-3 py-2 rounded-lg bg-white border border-blue-200 text-xs font-mono font-extrabold text-blue-950 flex items-center justify-between">
                        <span className="text-[10px] font-sans font-bold text-blue-600 uppercase">Format 056E :</span>
                        <span>({formData.siteLatitude || '—'} ; {formData.siteLongitude || '—'})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* A.3 Caractéristiques Injection / Soutirage, Raccordement Actuel & Comptage (Pages 6 à 9/41) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        3. Caractéristiques Injection / Soutirage, Raccordement Actuel &amp; Comptage (Pages 6 à 9/41)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        P_installée = 500 kW • P_racc_inj = 500 kW • P_racc_sout = 500 kW • Cas 1 : Nouveau Point de Raccordement dédié.
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      P_installée &ge; 250 kVA &rarr; Raccordement HTA (Fiche C)
                    </span>
                  </div>

                  {/* Ligne 1 : Puissances Injection / Soutirage (4 colonnes) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                      <label className="block text-[11px] font-extrabold text-blue-950 mb-1">
                        P<sub>installée</sub> (Page 6/41) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="puissanceProductionInstalleeKw"
                          value={formData.puissanceProductionInstalleeKw}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-xs font-black text-blue-900"
                        />
                        <span className="text-xs font-black text-blue-800">kW</span>
                      </div>
                      <span className="text-[10px] text-blue-700 font-semibold mt-1 block">Bridage statique : Non</span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                      <label className="block text-[11px] font-extrabold text-blue-950 mb-1">
                        P<sub>racc_inj</sub> Injection (Page 6/41) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="puissanceRaccInjectionKw"
                          value={formData.puissanceRaccInjectionKw}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-xs font-black text-blue-900"
                        />
                        <span className="text-xs font-black text-blue-800">kW</span>
                      </div>
                      <span className="text-[10px] text-blue-700 font-semibold mt-1 block">4 × 125 kW = 500 kW</span>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
                      <label className="block text-[11px] font-extrabold text-purple-950 mb-1">
                        P<sub>racc_sout</sub> Soutirage (Page 7/41) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="puissanceRaccSoutirageKw"
                          value={formData.puissanceRaccSoutirageKw}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white text-xs font-black text-purple-900"
                        />
                        <span className="text-xs font-black text-purple-800">kW</span>
                      </div>
                      <span className="text-[10px] text-purple-700 font-semibold mt-1 block">Recharge BESS sur réseau HTA</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Période de fonctionnement (p. 7/41)
                      </label>
                      <input
                        type="text"
                        name="periodeProductionEnvisagee"
                        value={formData.periodeProductionEnvisagee}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Stockage stationnaire 365 j/an</span>
                    </div>
                  </div>

                  {/* Ligne 2 : Raccordement actuel, Cas 1, Valorisation, Comptage (2 colonnes) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800">Site déjà raccordé au RPD ? (Page 7/41) :</span>
                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="siteDejaRaccordeRpd"
                              value="non"
                              checked={formData.siteDejaRaccordeRpd === 'non'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span>Non (par défaut)</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="siteDejaRaccordeRpd"
                              value="oui"
                              checked={formData.siteDejaRaccordeRpd === 'oui'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span>Oui</span>
                          </label>
                        </div>
                      </div>

                      {formData.siteDejaRaccordeRpd === 'oui' && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">N° PDL / PRM existant (14 chiffres)</label>
                          <input
                            type="text"
                            name="sitePrmExistant"
                            value={formData.sitePrmExistant}
                            onChange={handleInputChange}
                            maxLength={14}
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5 pt-1">
                        <span className="block text-[11px] font-extrabold text-slate-700">Souhait du Demandeur * :</span>
                        {[
                          { id: 'cas_1', label: "Cas 1 : la création d'un nouveau Point de Raccordement dédié à la présente demande" },
                          { id: 'cas_2', label: "Cas 2 : le raccordement sur le Point de Raccordement existant (même entité juridique)" },
                          { id: 'cas_3', label: "Cas 3 : le raccordement indirect sur le Point de Raccordement existant (autre entité)" },
                        ].map((cas) => (
                          <label
                            key={cas.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              formData.souhaitDemandeur === cas.id
                                ? 'bg-blue-50 border-blue-400 font-bold text-blue-950'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="souhaitDemandeur"
                              value={cas.id}
                              checked={formData.souhaitDemandeur === cas.id}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0"
                            />
                            <span className="leading-snug">{cas.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Modalité de la valorisation souhaitée (Page 8/41) *
                        </label>
                        <input
                          type="text"
                          name="modaliteValorisation"
                          value={formData.modaliteValorisation}
                          onChange={handleInputChange}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Schéma de référence pour le dispositif de comptage (Page 8/41) *
                        </label>
                        <select
                          name="schemaComptage"
                          value={formData.schemaComptage}
                          onChange={handleInputChange}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                        >
                          {SCHEMAS_COMPTAGE_056E.map((sc) => (
                            <option key={sc.id} value={sc.id}>{sc.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="block text-[10.5px] font-bold text-slate-700 mb-1">
                            Aucun autre projet même INSEE (Art. L.336-4, p. 9/41) :
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 cursor-pointer">
                              <input
                                type="radio"
                                name="attestationAbsenceAutreProjetInsee"
                                value="oui"
                                checked={formData.attestationAbsenceAutreProjetInsee === 'oui'}
                                onChange={handleInputChange}
                                className="w-3.5 h-3.5 text-emerald-600"
                              />
                              <span>Oui (aucun autre)</span>
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="attestationAbsenceAutreProjetInsee"
                                value="non"
                                checked={formData.attestationAbsenceAutreProjetInsee === 'non'}
                                onChange={handleInputChange}
                                className="w-3.5 h-3.5 text-blue-600"
                              />
                              <span>Non</span>
                            </label>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="block text-[10.5px] font-bold text-slate-700 mb-1">
                            Demande de raccordement groupée (p. 9/41) :
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 cursor-pointer">
                              <input
                                type="radio"
                                name="projetsGroupesInjection"
                                value="non"
                                checked={formData.projetsGroupesInjection === 'non'}
                                onChange={handleInputChange}
                                className="w-3.5 h-3.5 text-blue-600"
                              />
                              <span>Non (défaut)</span>
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="projetsGroupesInjection"
                                value="oui"
                                checked={formData.projetsGroupesInjection === 'oui'}
                                onChange={handleInputChange}
                                className="w-3.5 h-3.5 text-blue-600"
                              />
                              <span>Oui</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* A.4 Encadré « INFORMATIONS COMPLÉMENTAIRES » (Page 9/41 du 056E) — TEXTE OBLIGATOIRE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 bg-amber-50/90 p-4 md:p-5 rounded-2xl border-2 border-amber-400 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-600 text-white">
                          Page 9/41 du 056E — OBLIGATOIRE
                        </span>
                        <h3 className="text-sm font-black text-amber-950">
                          4. Encadré « INFORMATIONS COMPLÉMENTAIRES » (Demande ORA-MP Prioritaire)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFieldChange('informationsComplementaires', DEFAULT_INFO_COMPLEMENTAIRES_056E)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Restaurer le texte réglementaire exact
                      </button>
                    </div>

                    <textarea
                      name="informationsComplementaires"
                      value={formData.informationsComplementaires}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-3 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900 leading-relaxed focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
                    />

                    <p className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                      <span>
                        Texte auto-injecté en Page 9/41 du formulaire Enedis-MOP-RES_056E V2 et renvoyant à la Note annexée « Demande ORA-MP prioritaire ».
                      </span>
                    </p>
                  </div>

                  {/* A.5 Type de demande (Page 10/41) */}
                  <div className="lg:col-span-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2.5">
                    <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                      5. Type de demande (Page 10/41)
                    </h3>
                    <div className="space-y-2 flex-1 flex flex-col justify-center">
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.typeDemande === 'offre_raccordement_travaux_enedis'
                            ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-bold shadow-2xs'
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
                          <span className="text-xs block leading-snug">
                            Offre de Raccordement avec travaux réalisés par Enedis
                          </span>
                          <span className="text-[10px] text-blue-700 font-semibold">Coché automatiquement</span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.typeDemande === 'proposition_avant_completude'
                            ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-bold shadow-2xs'
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
                          <span className="text-xs block leading-snug">
                            Proposition de raccordement avant complétude du dossier
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ONGLET 2 : FICHE C – RACCORDEMENT HTA (Pages 14 à 19/41 du 056E)
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'fiche_c' && (
              <motion.div
                key="fiche_c"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* C.1 Emplacement du Poste de Livraison (Page 14/41) & OSE anticipé (Page 15/41) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Fiche C — Pages 14 à 19/41 du 056E (HTA 20 kV)
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        1. Emplacement du Poste de Livraison HTA (Page 14/41) &amp; Réseau Intérieur (Page 15/41)
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
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
                          Raccordement de référence (limite domaine privé accessible 24h/24)
                        </span>
                        <span className="text-[10px] text-blue-700 font-semibold">Coché par défaut — Réfaction tarifaire applicable</span>
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
                            Autre configuration (Déport du poste à l’intérieur du site)
                          </span>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] font-semibold">Distance d :</span>
                            <input
                              type="number"
                              name="distanceDomainePublicM"
                              value={formData.distanceDomainePublicM}
                              onChange={handleInputChange}
                              className="w-20 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <span className="text-xs font-bold">mètres</span>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">OSE anticipé (Page 15/41) :</span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="oseAnticipe"
                              value="oui"
                              checked={formData.oseAnticipe === 'oui'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span>Oui</span>
                          </label>
                          <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 cursor-pointer">
                            <input
                              type="radio"
                              name="oseAnticipe"
                              value="non"
                              checked={formData.oseAnticipe !== 'oui'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span>Non (défaut)</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">Mise sous tension transfo (p. 15/41)</label>
                        <select
                          name="miseSousTensionTransfo"
                          value={formData.miseSousTensionTransfo}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                        >
                          <option value="simultanee">Simultanée par fermeture du disjoncteur général</option>
                          <option value="echelonnee">Échelonnée 1 à 1</option>
                          <option value="magnetises">Transformateurs magnétisés par les machines</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* C.2 Loi de régulation locale de puissance réactive Q = f(U) (Pages 15-16/41) & ΔPmax (Page 17/41) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Loi de régulation locale Q = f(U) (Page 16/41) */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          2. Loi de régulation locale de puissance réactive Q = f(U) (Page 16/41)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Valeurs par défaut Enedis : Qmin = -0,35 × Pracc_inj et Qmax = 0,40 × Pracc_inj
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Arrêté 9 juin 2020
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                      <span className="text-xs font-extrabold text-blue-950">
                        Étude avec loi de régulation locale Q = f(U) * :
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="loiRegulationReactiveQfU"
                            value="oui"
                            checked={formData.loiRegulationReactiveQfU !== 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span>Oui (coché par défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="loiRegulationReactiveQfU"
                            value="non"
                            checked={formData.loiRegulationReactiveQfU === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                          Q<sub>min</sub> (-0,35 × P<sub>racc_inj</sub>)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            name="qMinKvar"
                            value={formData.qMinKvar}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-black text-slate-900"
                          />
                          <span className="text-xs font-bold text-slate-700">kVAR</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">Ratio Qmin / Pracc_inj = {formData.qMinRatio || '-0,35'}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                          Q<sub>max</sub> (+0,40 × P<sub>racc_inj</sub>)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            name="qMaxKvar"
                            value={formData.qMaxKvar}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-black text-slate-900"
                          />
                          <span className="text-xs font-bold text-slate-700">kVAR</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">Ratio Qmax / Pracc_inj = {formData.qMaxRatio || '0,40'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Déclaration ΔPmax sur 1 minute & Régulation P = f(f) (Page 17/41) */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          3. Variation maximale ΔP<sub>max</sub> sur 1 min &amp; P = f(f) (Page 17/41)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Valeur par défaut stockage : 0,5 × 500 kW = 0,25 MW/min (250 kW/min)
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Page 17/41
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.deltaPmaxMode !== 'autre'
                            ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deltaPmaxMode"
                          value="defaut_stockage"
                          checked={formData.deltaPmaxMode !== 'autre'}
                          onChange={() => {
                            const pKw = parseFloat(formData.puissanceRaccInjectionKw) || 500;
                            const dKw = Math.round(0.5 * pKw);
                            handleFieldChange('deltaPmaxMode', 'defaut_stockage');
                            handleFieldChange('deltaPmaxKwMin', String(dKw));
                            handleFieldChange('deltaPmaxMwMin', String((dKw / 1000).toFixed(2)));
                          }}
                          className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <span className="text-xs block">
                            Valeur par défaut pour installation de stockage (coché automatiquement)
                          </span>
                          <span className="text-[11px] text-emerald-800 font-extrabold block mt-0.5">
                            ΔP<sub>max</sub> = 0,5 × {formData.puissanceRaccInjectionKw || 500} kW = {formData.deltaPmaxMwMin || '0,25'} MW/min ({formData.deltaPmaxKwMin || '250'} kW/min)
                          </span>
                        </div>
                      </label>

                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="deltaPmaxMode"
                            value="autre"
                            checked={formData.deltaPmaxMode === 'autre'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Autre valeur ΔP<sub>max</sub> (&le; 8 MW/min) :</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            name="deltaPmaxMwMin"
                            value={formData.deltaPmaxMwMin}
                            onChange={handleInputChange}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-center"
                          />
                          <span className="text-xs font-bold text-slate-700">MW / min</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">
                        Régulation de puissance active P = f(f) (Page 17/41) :
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="regulationPuissanceActivePf"
                            value="oui"
                            checked={formData.regulationPuissanceActivePf !== 'non'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-emerald-600"
                          />
                          <span>Oui (défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="regulationPuissanceActivePf"
                            value="non"
                            checked={formData.regulationPuissanceActivePf === 'non'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* C.3 Options pour recevoir plusieurs solutions de raccordement (Page 16/41) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-black text-slate-900">
                      4. Options pour recevoir plusieurs solutions de raccordement (Page 16/41)
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">Enedis-MOP-RES_056E p. 16/41</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Option 1 : Devis d'étude division de parc */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">Division de parc :</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="devisDivisionParc"
                            value="oui"
                            checked={formData.devisDivisionParc === 'oui'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Oui</span>
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 cursor-pointer">
                          <input
                            type="radio"
                            name="devisDivisionParc"
                            value="non"
                            checked={formData.devisDivisionParc === 'non'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>

                    {/* Option 2 : Puissance d'injection plus faible */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">P<sub>inj</sub> plus faible (&ge; 70%) :</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="devisPuissanceInjectionFaible"
                            value="oui"
                            checked={formData.devisPuissanceInjectionFaible === 'oui'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Oui</span>
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 cursor-pointer">
                          <input
                            type="radio"
                            name="devisPuissanceInjectionFaible"
                            value="non"
                            checked={formData.devisPuissanceInjectionFaible === 'non'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>

                    {/* Option 4 : Capacité d'accueil des 3 départs HTA existants */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">Capacité 3 départs HTA proches :</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="capaciteAccueil3DepartsHta"
                            value="oui"
                            checked={formData.capaciteAccueil3DepartsHta === 'oui'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-emerald-600"
                          />
                          <span>Oui (défaut)</span>
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="capaciteAccueil3DepartsHta"
                            value="non"
                            checked={formData.capaciteAccueil3DepartsHta === 'non'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Option 3 : Offre à modulation de puissance générale 70% vs Gabarit Horaire Stockage */}
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-black text-slate-900">
                          Case générale « Offre à modulation de puissance (P<sub>gar inj</sub> &ge; 70 % Pracc_inj) » :
                        </span>
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
                          <span className="text-[11px] font-bold text-slate-700">P<sub>gar inj</sub> =</span>
                          <input
                            type="number"
                            name="puissanceGarantieInjectionKw"
                            value={formData.puissanceGarantieInjectionKw}
                            onChange={handleInputChange}
                            className="w-16 text-xs font-black text-blue-800 outline-none text-center border-b border-amber-300"
                          />
                          <span className="text-[11px] font-bold text-slate-700">kW</span>
                        </div>
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
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                          <input
                            type="radio"
                            checked={Boolean(formData.devisOffreModulationPuissance) === false}
                            onChange={() => handleFieldChange('devisOffreModulationPuissance', false)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>Non (ne pas substituer au gabarit horaire)</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <p className="font-semibold leading-snug">
                        <strong>Règle Enedis BESS 500 kW :</strong> cette case générale d’offre à modulation indique une puissance garantie minimale de 70 %. Elle <strong>n’est pas un substitut</strong> à la demande spécifique de gabarit horaire pour stockage (interdiction d’injection 10 h – 18 h de mars à octobre) inscrite en Page 9/41 (Fiche A) et dans la Note complémentaire ORA-MP jointe (Art. 11 Enedis-NMO-RES_030E &amp; Variante 2A Enedis-MOP-RES_046E).
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ONGLET 3 : FICHES E4 / T1 – CARACTÉRISTIQUES TECHNOLOGIQUES & STOCKAGE
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'fiche_e4_t1' && (
              <motion.div
                key="fiche_e4_t1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* 1. FICHE T1 — CARACTÉRISTIQUES DE PRODUCTION & STOCKAGE (Pages 21-22/41 du 056E) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Fiche T1 — Pages 21 &amp; 22/41 du 056E
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        1. Fiche T1 – Caractéristiques Technologiques &amp; Complémentaires pour le Stockage
                      </h3>
                    </div>

                    {/* Boutons sélection rapide Énergie Stockable (1 MWh / 1,044 MWh / 2 MWh) */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Configuration capacité :</span>
                      {[
                        { label: '1 MWh (1000 kWh)', mwh: '1', kwh: '1000', unitKwh: '250' },
                        { label: '1,044 MWh (4×261 kWh)', mwh: '1,044', kwh: '1044', unitKwh: '261' },
                        { label: '2 MWh (2000 kWh)', mwh: '2', kwh: '2000', unitKwh: '500' },
                      ].map((preset) => (
                        <button
                          key={preset.mwh}
                          type="button"
                          onClick={() => {
                            handleFieldChange('energieStockableMwh', preset.mwh);
                            handleFieldChange('capaciteTotaleKwh', preset.kwh);
                            handleFieldChange('capaciteUnitaireKwh', preset.unitKwh);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer ${
                            String(formData.energieStockableMwh) === preset.mwh
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                      <label className="block text-[11px] font-extrabold text-blue-950 mb-1">
                        Filière (Page 21/41) *
                      </label>
                      <input
                        type="text"
                        name="filiereT1"
                        value={formData.filiereT1}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-xs font-black text-blue-950"
                      />
                      <span className="text-[10px] text-blue-700 font-semibold mt-1 block">Coché : STOCKAGE HORS HYDRAULIQUE</span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                      <label className="block text-[11px] font-extrabold text-blue-950 mb-1">
                        Technologie (Page 21/41) *
                      </label>
                      <select
                        name="technologieT1"
                        value={formData.technologieT1}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-xs font-black text-blue-950"
                      >
                        <option value="BATTERIE">BATTERIE (Coché par défaut)</option>
                        <option value="HYDROGENE">HYDROGÈNE</option>
                        <option value="VOLANT_INERTIE">VOLANT D’INERTIE</option>
                      </select>
                      <span className="text-[10px] text-blue-700 font-semibold mt-1 block">Cellules LFP (LiFePO4)</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-[11px] font-extrabold text-slate-800 mb-1">
                        Nb total de groupes (Page 21/41) *
                      </label>
                      <input
                        type="number"
                        name="nombreGroupesProductionStockage"
                        value={formData.nombreGroupesProductionStockage}
                        onChange={(e) => {
                          handleFieldChange('nombreGroupesProductionStockage', e.target.value);
                          handleFieldChange('nombreUnites', e.target.value);
                          handleFieldChange('onduleurNombreUnites', e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-black text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 font-semibold mt-1 block">4 unités de 125 kW = 500 kW</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <label className="block text-[11px] font-extrabold text-emerald-950 mb-1">
                        Moyen de stockage (Page 22/41) *
                      </label>
                      <div className="flex items-center gap-4 pt-1">
                        <label className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-900 cursor-pointer">
                          <input
                            type="radio"
                            name="comprendMoyenStockage"
                            value="oui"
                            checked={formData.comprendMoyenStockage !== 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span>Oui (coché)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="comprendMoyenStockage"
                            value="non"
                            checked={formData.comprendMoyenStockage === 'non'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-slate-600"
                          />
                          <span>Non</span>
                        </label>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold mt-1.5 block">Stockage autonome HTA</span>
                    </div>

                    {/* Ligne 2 de Fiche T1 (Page 22/41) : Charge, Décharge, Énergie stockable MWh, Capacité kWh */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Puissance active max en charge (kW) *
                      </label>
                      <input
                        type="number"
                        name="puissanceMaxChargeKw"
                        value={formData.puissanceMaxChargeKw}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-blue-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Puissance active max en décharge (kW) *
                      </label>
                      <input
                        type="number"
                        name="puissanceMaxDechargeKw"
                        value={formData.puissanceMaxDechargeKw}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-blue-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-purple-900 mb-1">
                        Énergie stockable (MWh — Page 22/41) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          name="energieStockableMwh"
                          value={formData.energieStockableMwh}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-purple-50/40 text-xs font-black text-purple-950"
                        />
                        <span className="text-xs font-black text-purple-800">MWh</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Capacité énergétique totale (kWh)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="capaciteTotaleKwh"
                          value={formData.capaciteTotaleKwh}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                        />
                        <span className="text-xs font-bold text-slate-700">kWh</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. FICHE E4 — ONDULEUR ASSURANT LE TRANSIT TOTAL DE PUISSANCE (Pages 35-36/41 du 056E) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        Fiche E4 — Pages 35 &amp; 36/41 du 056E
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        2. Fiche E4 – Onduleurs / PCS assurant le transit total de puissance (4 × 125 kVA = 500 kVA)
                      </h3>
                    </div>

                    {/* Sélection rapide marque / référence constructeur PCS */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Constructeur PCS :</span>
                      {PCS_CONSTRUCTOR_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            handleFieldChange('onduleurMarqueRef', preset.marqueRef);
                            handleFieldChange('modeleBatterie', preset.modeleBatterie);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                            formData.onduleurMarqueRef === preset.marqueRef
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Marque et référence de l’onduleur / PCS (Page 35/41) *
                      </label>
                      <input
                        type="text"
                        name="onduleurMarqueRef"
                        value={formData.onduleurMarqueRef}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-purple-50/30 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Référence du document constructeur &amp; Certificat NF EN 50549-2 *
                      </label>
                      <input
                        type="text"
                        name="onduleurDocumentRef"
                        value={formData.onduleurDocumentRef}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Puissance apparente nominale unitaire (kVA) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          name="onduleurPuissanceApparenteUnitaireKva"
                          value={formData.onduleurPuissanceApparenteUnitaireKva}
                          onChange={(e) => {
                            const unitKva = parseFloat(e.target.value) || 125;
                            const qty = parseFloat(formData.onduleurNombreUnites) || 4;
                            handleFieldChange('onduleurPuissanceApparenteUnitaireKva', e.target.value);
                            handleFieldChange('onduleurPuissanceMaximaleUnitaireKva', e.target.value);
                            handleFieldChange('onduleurPuissanceApparenteTotaleKva', String(Math.round(unitKva * qty)));
                            handleFieldChange('puissanceApparenteMaximaleKva', String(Math.round(unitKva * qty)));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-900"
                        />
                        <span className="text-xs font-bold text-slate-600">kVA (×{formData.onduleurNombreUnites || 4})</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Puissance apparente totale (4 PCS) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          name="onduleurPuissanceApparenteTotaleKva"
                          value={formData.onduleurPuissanceApparenteTotaleKva}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/40 text-xs font-black text-blue-900"
                        />
                        <span className="text-xs font-black text-blue-800">kVA</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Courant nominal In par unité (A) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          name="onduleurCourantNominalUnitaireA"
                          value={formData.onduleurCourantNominalUnitaireA}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                        />
                        <span className="text-xs font-bold text-slate-600">A</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tension de sortie assignée (V) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          name="onduleurTensionSortieV"
                          value={formData.onduleurTensionSortieV}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                        />
                        <span className="text-xs font-bold text-slate-600">V AC</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">Type d’électronique de puissance * :</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 text-xs font-black text-blue-900 cursor-pointer">
                          <input
                            type="radio"
                            name="onduleurTypeElectronique"
                            value="igbt_mli"
                            checked={formData.onduleurTypeElectronique !== 'thyristors'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Commutation forcée (IGBT-MLI)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="onduleurTypeElectronique"
                            value="thyristors"
                            checked={formData.onduleurTypeElectronique === 'thyristors'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-slate-600"
                          />
                          <span>Thyristors</span>
                        </label>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">Type de connexion * :</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs font-black text-blue-900 cursor-pointer">
                          <input
                            type="radio"
                            name="onduleurTypeConnexion"
                            value="triphase"
                            checked={formData.onduleurTypeConnexion !== 'monophase'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span>Triphasé</span>
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="onduleurTypeConnexion"
                            value="monophase"
                            checked={formData.onduleurTypeConnexion === 'monophase'}
                            onChange={handleInputChange}
                            className="w-3.5 h-3.5 text-slate-600"
                          />
                          <span>Mono</span>
                        </label>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600">Court-circuit Ip (A)</label>
                        <input
                          type="text"
                          name="onduleurIpA"
                          value={formData.onduleurIpA}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600">Ik&apos;&apos; (A / unité)</label>
                        <input
                          type="text"
                          name="onduleurIkA"
                          value={formData.onduleurIkA}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Transformateur élévateur BT/HTA (Page 20/41) & Certification des données */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                      3. Transformateur Élévateur BT / HTA 20 kV (Page 20/41 du 056E)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Sn (kVA)</label>
                        <input
                          type="text"
                          name="transfoPuissanceNominaleKva"
                          value={formData.transfoPuissanceNominaleKva}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Primaire HTA</label>
                        <input
                          type="text"
                          name="transfoTensionPrimaireHta"
                          value={formData.transfoTensionPrimaireHta}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Secondaire BT</label>
                        <input
                          type="text"
                          name="transfoTensionSecondaireBt"
                          value={formData.transfoTensionSecondaireBt}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Couplage</label>
                        <input
                          type="text"
                          name="transfoCouplage"
                          value={formData.transfoCouplage}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Ucc (%)</label>
                        <input
                          type="text"
                          name="transfoUccPercent"
                          value={formData.transfoUccPercent}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                      4. Certification des données (Signature 056E)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Signataire</label>
                        <input
                          type="text"
                          name="signataireNomPrenom"
                          value={formData.signataireNomPrenom}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Lieu</label>
                        <input
                          type="text"
                          name="signatureLieu"
                          value={formData.signatureLieu}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Date</label>
                        <input
                          type="text"
                          name="signatureDate"
                          value={formData.signatureDate}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
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
                className="space-y-4"
              >
                {/* Bandeau d'explication réglementaire */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white border border-blue-800/50 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        Pièce jointe obligatoire au 056E
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Art. 11 Enedis-NMO-RES_030E &amp; Variante 2A Enedis-MOP-RES_046E (Gabarit 10h–18h Mars à Octobre)
                      </span>
                    </div>
                    <h3 className="text-sm font-black">
                      Note complémentaire — Demande prioritaire d’ORA-MP pour stockage autonome 500 kW
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNoteSiteManuallyEdited(false);
                      setFormData(prev => {
                        const next = {
                          ...prev,
                          noteObjet: 'Demande prioritaire d\'ORA-MP pour stockage autonome 500 kW',
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
                        description: 'Le modèle officiel complet (6 paragraphes) avec les variables du projet a été restauré.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restaurer le modèle officiel ORA-MP
                  </button>
                </div>

                {/* Vue Côte-à-Côte Desktop : Éditeur à gauche (7 col) + Prévisualisation A4 en direct à droite (5 col) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* Colonne Gauche : Éditeur structuré */}
                  <div className="xl:col-span-7 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
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
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Salutation</label>
                        <input
                          type="text"
                          name="noteSalutation"
                          value={formData.noteSalutation}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          Ligne Site (Site : [nom du site] - Commune : [commune] ([CP]) - Référence parcelle : [référence])
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
                          Synchroniser depuis Fiche A
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
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Corps de la Note Complémentaire ORA-MP (6 paragraphes officiels — 100 % modifiable)
                      </label>
                      <textarea
                        name="noteCorps"
                        value={formData.noteCorps}
                        onChange={handleInputChange}
                        rows={12}
                        className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                    {/* Bloc Cachet & Signature */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <label className="inline-flex items-center gap-2 text-xs font-black text-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            name="inclureCachetSignature"
                            checked={Boolean(formData.inclureCachetSignature)}
                            onChange={handleInputChange}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span>Apposer le cachet et la signature d’ENR COURTAGE sur les PDF</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            Importer un cachet personnalisé
                          </button>
                          {formData.signatureImageBase64 && (
                            <button
                              type="button"
                              onClick={() => handleFieldChange('signatureImageBase64', null)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                            >
                              Cachet par défaut
                            </button>
                          )}
                        </div>
                      </div>

                      {formData.inclureCachetSignature && activeStampSrc && (
                        <img
                          src={activeStampSrc}
                          alt="Cachet ENR COURTAGE"
                          className="h-14 w-auto object-contain bg-white p-1 rounded-lg border border-slate-200"
                        />
                      )}
                    </div>
                  </div>

                  {/* Colonne Droite : Prévisualisation A4 en direct de la Note ORA-MP */}
                  <div className="xl:col-span-5 bg-white rounded-2xl border-2 border-blue-900/20 shadow-md overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-cyan-300">
                        <Eye className="w-3.5 h-3.5" />
                        Aperçu en direct — Note à joindre au 056E (PDF A4)
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">ENR COURTAGE</span>
                    </div>

                    <div className="p-5 space-y-3.5 text-[11.5px] leading-relaxed text-slate-800 bg-white">
                      {/* En-tête aperçu */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <p className="font-black text-xs text-slate-950">{formData.beneficiaireRaisonSociale || 'ENR COURTAGE'}</p>
                          <p className="text-[10px] text-slate-600">{formData.beneficiaireAdresse} — {formData.beneficiaireCpVillePays}</p>
                          <p className="text-[10px] font-mono font-bold text-blue-900">SIREN : {formData.beneficiaireSiren} | SIRET : {formData.beneficiaireSiret}</p>
                        </div>
                        <div className="text-right bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 text-[9.5px] font-bold text-blue-950">
                          <div>ANNEXE AU 056E (V2)</div>
                          <div className="text-blue-700">Art. 11 NMO-RES_030E</div>
                          <div className="text-blue-700">Variante 2A MOP-RES_046E</div>
                        </div>
                      </div>

                      {/* Encadré Objet & Site */}
                      <div className="p-3 rounded-xl bg-slate-50 border-l-4 border-blue-600 space-y-1">
                        <p className="font-black text-slate-950 text-xs">
                          <span className="text-blue-700">Objet :</span> {formData.noteObjet}
                        </p>
                        <p className="font-bold text-slate-800 text-[11px]">
                          <span className="text-blue-700">Site :</span> {formData.noteSiteLigne}
                        </p>
                      </div>

                      {/* Corps de la note */}
                      <div className="space-y-2 text-slate-800">
                        <p className="font-bold text-slate-950">{formData.noteSalutation}</p>
                        {previewParagraphs.map((para, idx) => (
                          <p key={idx} className="text-[11px] leading-snug text-justify">
                            {para}
                          </p>
                        ))}
                      </div>

                      {/* Pied de note / Signature */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                        <div className="text-[11px] space-y-0.5">
                          <p className="font-bold text-slate-900">
                            Fait à : {formData.noteFaitA} — Le : {formData.noteDate}
                          </p>
                          <p className="font-extrabold text-blue-950">
                            {formData.noteNomQualiteDemandeur}
                          </p>
                        </div>
                        {formData.inclureCachetSignature && activeStampSrc && (
                          <img
                            src={activeStampSrc}
                            alt="Signature"
                            className="h-14 w-auto object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════════
              ENCART RÉCAPITULATIF : CHECKLIST DES PIÈCES À JOINDRE
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Checklist des pièces à déposer sur le portail Enedis avec les 2 PDF générés (056E V2 + Note ORA-MP)
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
            4. PIED DE MODALE FIXE (FOOTER) — BARRE D'ACTIONS
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

            {/* Bouton 4 : Télécharger le Pack Complet Enedis (PDF / ZIP) */}
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
