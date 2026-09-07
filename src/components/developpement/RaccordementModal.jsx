import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug, Zap, FileText, ExternalLink, Download, X, CheckSquare,
  Square, Info, ChevronRight, ChevronLeft, Loader2, Building2, Globe,
  ShieldCheck, AlertCircle, CheckCircle2, Phone, Mail, FileDown,
  Clock, Archive, Save, Send, Layers, BatteryCharging, Sun,
  Calendar, Check, AlertTriangle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import raccordementService, {
  MANDATAIRE_INFO,
  INSTALLATION_TYPES,
  INJECTION_TYPES,
  VOLTAGE_LEVELS,
  ENEDIS_CHECKLIST_DOCS,
  formatDateFr,
  formatEuro,
  calculatePtfCountdown,
  getInitialRaccordementData,
  generateEnedisMandatPdf,
  generateConsuelCerfaPdf,
  generateEnedisGlobalZip,
} from '@/services/raccordementDocumentService';

// Portails officiels
const PORTALS = {
  enedisConnect: {
    name: 'Enedis Connect (Producteur)',
    url: 'https://connect.enedis.fr',
    desc: 'Portail de dépôt officiel pour les raccordements BT et HTA',
    color: '#007DC5',
  },
  enedisDirect: {
    name: 'Raccordement Direct Enedis',
    url: 'https://www.raccordement-elec.enedis.fr',
    desc: 'Suivi direct des affaires de raccordement Enedis',
    color: '#007DC5',
  },
  consuel: {
    name: 'Portail Consuel Pro',
    url: 'https://www.consuel.com',
    desc: 'Dépôt des dossiers techniques SC 144B et Violet BESS',
    color: '#059669',
  },
  rte: {
    name: 'Portail Clients RTE (> 10 MW)',
    url: 'https://clients.rte-france.com',
    desc: 'Pour les très grandes centrales raccordées au réseau de transport',
    color: '#0032A0',
  },
};

export default function RaccordementModal({ isOpen, onClose, project, onSave }) {
  // ── Initialisation des données de raccordement ──────────────────────────────
  const [formData, setFormData] = useState(() => getInitialRaccordementData(project));
  const [currentStep, setCurrentStep] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Synchronisation lors de l'ouverture ou changement de projet
  useEffect(() => {
    if (project && isOpen) {
      setFormData(getInitialRaccordementData(project));
      setHasUnsavedChanges(false);
    }
  }, [project, isOpen]);

  // Variables calculées
  const powerKwc = parseFloat(project?.kwc || project?.projectSize || formData.puissanceInjectionKva || 0);
  const isHTA = formData.tension === 'HTA' || powerKwc >= 250;
  const isRTE = formData.tension === 'HTB' || powerKwc >= 10000;
  const isBess = formData.natureInstallation === 'bess_standalone' || formData.natureInstallation === 'hybride_pv_bess';

  // Calcul du délai légal PTF (3 mois)
  const ptfCountdown = useMemo(() => {
    return calculatePtfCountdown(formData.dateReceptionPtf);
  }, [formData.dateReceptionPtf]);

  // Gestion des changements de champs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const nextVal = type === 'checkbox' ? checked : value;
      const updated = { ...prev, [name]: nextVal };

      // Ajustement automatique de la tension si puissance modifiée
      if (name === 'puissanceInjectionKva') {
        const p = parseFloat(value) || 0;
        if (p >= 250 && prev.tension === 'BT') {
          updated.tension = 'HTA';
        }
      }

      // Si choix BESS, ajuster le type d'injection par défaut
      if (name === 'natureInstallation') {
        if (value === 'bess_standalone' || value === 'hybride_pv_bess') {
          if (updated.typeInjection === 'injection_totale') {
            updated.typeInjection = 'card_is';
          }
          if (!updated.puissanceSoutirageKva || updated.puissanceSoutirageKva === 0) {
            updated.puissanceSoutirageKva = updated.puissanceInjectionKva || 100;
          }
          updated.consuelType = 'dossier_violet_bess';
        } else {
          updated.consuelType = 'sc144b_pv';
        }
      }

      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Gestion des cases à cocher des pièces jointes
  const handleTogglePiece = (docId) => {
    setFormData(prev => ({
      ...prev,
      piecesJointes: {
        ...(prev.piecesJointes || {}),
        [docId]: !prev.piecesJointes?.[docId],
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Enregistrement des données
  const handleSave = () => {
    if (onSave) {
      onSave({
        raccordement: formData,
        siret: formData.siretProducteur,
        prm: formData.prmPdr,
      });
    }
    setHasUnsavedChanges(false);
    toast({
      title: 'Dossier raccordement enregistré',
      description: 'L\'ensemble des informations techniques et contractuelles a été mis à jour.',
    });
  };

  // Actions de génération de documents
  const handleDownloadMandat = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateEnedisMandatPdf(project, formData, { download: true });
      toast({
        title: 'Mandat Enedis téléchargé',
        description: 'Le mandat officiel de représentation a été généré au format PDF.',
      });
    } catch (e) {
      console.error('Erreur génération Mandat:', e);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le Mandat Enedis.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadConsuel = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateConsuelCerfaPdf(project, formData, { download: true });
      toast({
        title: 'Dossier Consuel téléchargé',
        description: 'Le dossier technique de conformité pré-rempli a été généré.',
      });
    } catch (e) {
      console.error('Erreur génération Consuel:', e);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le dossier Consuel.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsGeneratingZip(true);
    try {
      await generateEnedisGlobalZip(project, formData);
      toast({
        title: 'Export Global ZIP téléchargé',
        description: 'L\'archive complète prête pour Enedis Connect a été générée avec succès.',
      });
    } catch (e) {
      console.error('Erreur export ZIP:', e);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer l\'archive ZIP.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingZip(false);
    }
  };

  if (!isOpen) return null;

  // Configuration des 5 étapes du Stepper
  const STEPS = [
    {
      number: 1,
      title: 'Demande Initiale',
      shortTitle: '1. Connect',
      icon: Send,
      desc: 'Préparation du dossier pour Enedis Connect / RTE',
      badge: formData.demandeStatus === 'recevable' ? 'Recevable' : (formData.demandeStatus === 'deposee' ? 'Déposée' : 'À préparer'),
      isCompleted: formData.demandeStatus === 'recevable' || formData.demandeStatus === 'deposee',
    },
    {
      number: 2,
      title: 'PTF (Offre Enedis)',
      shortTitle: '2. PTF',
      icon: Clock,
      desc: 'Proposition Technique et Financière — Délai légal 3 mois',
      badge: formData.ptfStatus === 'acceptee' ? 'Acceptée' : (formData.ptfStatus === 'recue' ? 'Reçue' : 'En attente'),
      isCompleted: formData.ptfStatus === 'acceptee',
    },
    {
      number: 3,
      title: 'Convention CRD',
      shortTitle: '3. CRD',
      icon: ShieldCheck,
      desc: 'Signature de la convention et versement de l\'acompte',
      badge: formData.crdStatus === 'acompte_regle' ? 'Acompte Réglé' : (formData.crdStatus === 'signee' ? 'Signée' : 'À signer'),
      isCompleted: formData.crdStatus === 'acompte_regle' || formData.crdStatus === 'signee',
    },
    {
      number: 4,
      title: 'Travaux & Consuel',
      shortTitle: '4. Consuel',
      icon: CheckCircle2,
      desc: 'Avancement des travaux et attestation de conformité',
      badge: formData.consuelStatus === 'vise' ? 'Visa Validé' : (formData.consuelStatus === 'depose' ? 'En instruction' : 'Non déposé'),
      isCompleted: formData.consuelStatus === 'vise',
    },
    {
      number: 5,
      title: 'CARD & MES',
      shortTitle: '5. CARD / MES',
      icon: Zap,
      desc: 'Contrat d\'Accès au Réseau et Mise En Service définitive',
      badge: formData.mesStatus === 'effectuee' ? 'En Service' : (formData.mesStatus === 'planifiee' ? 'Planifiée' : 'En attente'),
      isCompleted: formData.mesStatus === 'effectuee',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-hidden">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-slate-200"
        style={{ height: '92vh', maxHeight: '860px' }}
      >
        {/* ═══ 1. EN-TÊTE CORPORATE ════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md">
                <Plug className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base md:text-lg tracking-tight">Raccordement Enedis & RTE</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    Cycle de vie CRD / CARD
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                  <span className="font-medium text-white">{project?.name || project?.lastName || 'Projet'}</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold">{powerKwc} kWc</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    isRTE ? 'bg-rose-500/30 text-rose-300 border border-rose-400/30' :
                    isHTA ? 'bg-amber-500/30 text-amber-300 border border-amber-400/30' :
                    'bg-blue-500/30 text-blue-300 border border-blue-400/30'
                  }`}>
                    {formData.tension} {isHTA && '(≥ 250 kVA)'} {isRTE && '(> 10 MW)'}
                  </span>
                  {isBess && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30 flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3" />
                      Stockage BESS (Psout: {formData.puissanceSoutirageKva} kVA)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'en-tête */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadZip}
                disabled={isGeneratingZip}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 transition-all"
                title="Télécharger l'ensemble des pièces pour Enedis Connect"
              >
                {isGeneratingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                Export Global ZIP
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ 2. STEPPER DE NAVIGATION (5 ÉTAPES) ═════════════════════════ */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 md:px-6 py-2.5 flex-shrink-0">
          <div className="grid grid-cols-5 gap-1.5 md:gap-3">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isDone = step.isCompleted;

              return (
                <button
                  key={step.number}
                  onClick={() => setCurrentStep(step.number)}
                  className={`group flex items-center gap-2 p-2 rounded-xl text-left transition-all relative ${
                    isActive
                      ? 'bg-white shadow-sm border border-blue-500 ring-2 ring-blue-500/10'
                      : 'hover:bg-slate-200/60 border border-transparent'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-extrabold text-xs transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                  }`}>
                    {isDone && !isActive ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <div className="hidden lg:block min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{step.badge}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ 3. CORPS DE LA MODALE — CONTENU DES ÉTAPES ════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40">
          <AnimatePresence mode="wait">
            
            {/* ─────────────────────────────────────────────────────────────
                ÉTAPE 1 : DEMANDE INITIALE CONNECT
            ───────────────────────────────────────────────────────────── */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Alerte contextuelle Tension & BESS */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  isHTA ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-blue-50/80 border-blue-200 text-blue-900'
                }`}>
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isHTA ? 'text-amber-600' : 'text-blue-600'}`} />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-sm">
                      {isHTA
                        ? 'Installation raccordable en HTA (≥ 250 kVA) — Direction Régionale Enedis'
                        : 'Installation raccordable en Basse Tension (BT ≤ 250 kVA) — Enedis Connect'}
                    </p>
                    <p className="opacity-90">
                      Le mandataire <strong>{MANDATAIRE_INFO.raisonSociale}</strong> est habilité à déposer votre dossier complet.
                      {isBess && ' Pour un stockage BESS, Enedis exige la double déclaration de puissance (Pinj en injection et Psout en soutirage pour la recharge).'}
                    </p>
                  </div>
                </div>

                {/* Actions rapides Documents */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Documents Réglementaires Pré-Remplis (Génération Automatique)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadMandat}
                      disabled={isGeneratingPdf}
                      className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-blue-800 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-blue-600 text-white group-hover:scale-105 transition-transform">
                          <FileDown className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Mandat de représentation signé</p>
                          <p className="text-[11px] text-blue-600/80">Mandant: Client • Mandataire: ENR COURTAGE</p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      disabled={isGeneratingZip}
                      className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Export Global Enedis Connect (.ZIP)</p>
                          <p className="text-[11px] text-emerald-600/80">Mandat, Consuel, JSON & Guide de dépôt</p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-emerald-500 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Formulaire de l'Étape 1 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Paramètres Techniques du Raccordement
                    </p>
                    <span className="text-[11px] text-slate-500">Portail Enedis Connect</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nature Installation */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nature de l'installation</label>
                      <select
                        name="natureInstallation"
                        value={formData.natureInstallation}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        {INSTALLATION_TYPES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Puissance d'injection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Puissance d'injection (Pinj kVA)
                      </label>
                      <input
                        type="number"
                        name="puissanceInjectionKva"
                        value={formData.puissanceInjectionKva}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Puissance de soutirage (BESS) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Puissance soutirage (Psout kVA)</span>
                        {isBess && <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.2 rounded">BESS</span>}
                      </label>
                      <input
                        type="number"
                        name="puissanceSoutirageKva"
                        value={formData.puissanceSoutirageKva}
                        onChange={handleChange}
                        placeholder={isBess ? "Recharge batterie" : "0 (Sans batterie)"}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                          isBess ? 'border-purple-300 bg-purple-50/30 text-purple-900' : 'border-slate-200 text-slate-700'
                        }`}
                      />
                    </div>

                    {/* Domaine de Tension */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Domaine de tension</label>
                      <select
                        name="tension"
                        value={formData.tension}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        {VOLTAGE_LEVELS.map(v => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type d'injection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Type d'injection / Contrat</label>
                      <select
                        name="typeInjection"
                        value={formData.typeInjection}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        {INJECTION_TYPES.map(i => (
                          <option key={i.id} value={i.id}>{i.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* PRM / PDR */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">PRM / PDR existant (14 chiffres)</label>
                      <input
                        type="text"
                        name="prmPdr"
                        value={formData.prmPdr}
                        onChange={handleChange}
                        maxLength={14}
                        placeholder="Laisser vide si nouveau PDR"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* SIRET Producteur */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">SIRET du producteur</label>
                      <input
                        type="text"
                        name="siretProducteur"
                        value={formData.siretProducteur}
                        onChange={handleChange}
                        placeholder="14 chiffres du demandeur"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* N° Affaire Enedis Connect */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">N° Affaire Enedis Connect</label>
                      <input
                        type="text"
                        name="enedisAffaireId"
                        value={formData.enedisAffaireId}
                        onChange={handleChange}
                        placeholder="Ex: DEM-2026-98745"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Date de dépôt */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de dépôt portail</label>
                      <input
                        type="date"
                        name="dateDepotDemande"
                        value={formData.dateDepotDemande}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist des pièces jointes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Checklist des Pièces du Dossier Enedis Connect
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {Object.values(formData.piecesJointes || {}).filter(Boolean).length} / {ENEDIS_CHECKLIST_DOCS.length} pièces réunies
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ENEDIS_CHECKLIST_DOCS.map(docItem => {
                      const isChecked = !!formData.piecesJointes?.[docItem.id];
                      return (
                        <label
                          key={docItem.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePiece(docItem.id)}
                            className="w-4 h-4 rounded text-blue-600 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-tight">
                              {docItem.label}
                              {docItem.required && <span className="text-rose-500 ml-1 text-[10px] font-bold">*requis</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{docItem.desc}</p>
                          </div>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Liens Portails */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <a
                    href={PORTALS.enedisConnect.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/50 text-blue-800 font-bold text-xs transition-colors"
                  >
                    <span>Portail Enedis Connect</span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  </a>
                  <a
                    href={PORTALS.enedisDirect.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors"
                  >
                    <span>Raccordement Direct</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                  {isRTE && (
                    <a
                      href={PORTALS.rte.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs transition-colors"
                    >
                      <span>Portail RTE (> 10 MW)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                    </a>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ÉTAPE 2 : PTF (PROPOSITION TECHNIQUE ET FINANCIÈRE)
            ───────────────────────────────────────────────────────────── */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* BANDEAU COMPTE À REBOURS PTF (3 MOIS STRICTS) */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                  ptfCountdown.status === 'expired'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : ptfCountdown.status === 'critical'
                    ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/20'
                    : ptfCountdown.status === 'warning'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        ptfCountdown.status === 'expired' ? 'bg-rose-600 text-white' :
                        ptfCountdown.status === 'critical' || ptfCountdown.status === 'warning' ? 'bg-amber-500 text-white' :
                        'bg-emerald-600 text-white'
                      }`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm">
                            Délai de Validité Réglementaire de la PTF (3 mois)
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-black/5">
                            Art. L. 342-1 Code de l'Énergie
                          </span>
                        </div>
                        <p className="text-xs opacity-90 mt-0.5">
                          {formData.dateReceptionPtf ? (
                            <>Reçue le <strong>{formatDateFr(formData.dateReceptionPtf)}</strong> • Date limite légale d'acceptation : <strong>{ptfCountdown.formattedDeadline}</strong></>
                          ) : (
                            <>Renseignez la date de réception de l'offre pour activer le compte à rebours légal des 3 mois.</>
                          )}
                        </p>
                      </div>
                    </div>

                    {formData.dateReceptionPtf && ptfCountdown.daysRemaining !== null && (
                      <div className={`px-4 py-2 rounded-xl text-center font-extrabold text-xs shadow-sm flex-shrink-0 ${
                        ptfCountdown.status === 'expired'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : ptfCountdown.status === 'critical'
                          ? 'bg-amber-500 text-white animate-bounce'
                          : ptfCountdown.status === 'warning'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {ptfCountdown.daysRemaining < 0
                          ? `Expirée depuis ${Math.abs(ptfCountdown.daysRemaining)} j`
                          : `${ptfCountdown.daysRemaining} jours restants`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulaire PTF */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Analyse et Données Financières de la PTF
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Statut de la PTF</label>
                      <select
                        name="ptfStatus"
                        value={formData.ptfStatus}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="en_attente">⏳ En attente de transmission Enedis</option>
                        <option value="recue">📬 Reçue — En cours d'analyse</option>
                        <option value="acceptee">✅ Validée & Acceptée par le client</option>
                        <option value="refusee">❌ Refusée / Recours Enedis</option>
                        <option value="perimee">⛔ Périmée (Délai 3 mois dépassé)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de notification PTF</label>
                      <input
                        type="date"
                        name="dateReceptionPtf"
                        value={formData.dateReceptionPtf}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Coût Travaux Enedis (€ TTC)</label>
                      <input
                        type="number"
                        name="coutTravauxEnedisTtc"
                        value={formData.coutTravauxEnedisTtc}
                        onChange={handleChange}
                        placeholder="Ex: 45000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Quote-Part S3REnR (€ TTC)</label>
                      <input
                        type="number"
                        name="quotePartS3renr"
                        value={formData.quotePartS3renr}
                        onChange={handleChange}
                        placeholder="Quote-part régionale schéma EnR"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Délai prévisionnel travaux (Mois)</label>
                      <input
                        type="number"
                        name="delaiTravauxEnedisMois"
                        value={formData.delaiTravauxEnedisMois}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Acompte demandé (30%)</label>
                      <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-blue-800">
                        {formData.coutTravauxEnedisTtc
                          ? formatEuro(Math.round(parseFloat(formData.coutTravauxEnedisTtc) * 0.3))
                          : 'À calculer selon PTF'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Solution technique retenue par Enedis</label>
                    <textarea
                      name="solutionTechniquePtf"
                      value={formData.solutionTechniquePtf}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Ex: Raccordement en coupure d'artère sur câble HTA 20 kV existant. Création d'un poste de livraison client en limite de propriété avec cellule disjoncteur 630 A et comptage 4 quadrants."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ÉTAPE 3 : CONVENTION CRD & ACOMPTE
            ───────────────────────────────────────────────────────────── */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs space-y-1">
                  <p className="font-bold text-sm">Convention de Raccordement Définitive (CRD)</p>
                  <p className="opacity-90 leading-relaxed">
                    La CRD est le contrat synallagmatique engageant formellement Enedis à exécuter les travaux de raccordement.
                    Le versement de l'acompte (généralement 30% du montant du devis) conditionne le verrouillage du créneau d'exécution et les commandes de matériel (câbles, cellules HTA, transformateurs).
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Suivi Contractuel de la CRD et de l'Acompte
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Statut Convention CRD</label>
                      <select
                        name="crdStatus"
                        value={formData.crdStatus}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="a_signer">📝 CRD reçue — En attente signature client</option>
                        <option value="signee">✍️ CRD signée par les deux parties</option>
                        <option value="acompte_regle">💰 Acompte réglé & Encaissé par Enedis</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Référence du Contrat CRD</label>
                      <input
                        type="text"
                        name="crdReference"
                        value={formData.crdReference}
                        onChange={handleChange}
                        placeholder="Ex: CRD-2026-ENEDIS-042"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de signature CRD</label>
                      <input
                        type="date"
                        name="dateSignatureCrd"
                        value={formData.dateSignatureCrd}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Montant de l'acompte (€ TTC)</label>
                      <input
                        type="number"
                        name="montantAcompteTtc"
                        value={formData.montantAcompteTtc}
                        onChange={handleChange}
                        placeholder="Ex: 13500"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de paiement acompte</label>
                      <input
                        type="date"
                        name="datePaiementAcompte"
                        value={formData.datePaiementAcompte}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Référence virement bancaire</label>
                      <input
                        type="text"
                        name="refVirementAcompte"
                        value={formData.refVirementAcompte}
                        onChange={handleChange}
                        placeholder="Ex: VIR-ENEDIS-CRD-8765"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ÉTAPE 4 : TRAVAUX & CONSUEL
            ───────────────────────────────────────────────────────────── */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Bandeau d'action Consuel PDF */}
                <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-600 text-white">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Attestation de Conformité Électrique (CONSUEL)
                      </h4>
                      <p className="text-xs text-slate-500">
                        {isBess
                          ? 'Dossier Technique Violet (Stockage autonome ou couplé — NF C 15-712-3)'
                          : 'Dossier Technique SC 144B (Production Photovoltaïque — NF C 15-712-1)'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadConsuel}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow transition-all flex-shrink-0"
                  >
                    {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    Générer Dossier Consuel (PDF)
                  </button>
                </div>

                {/* Formulaire Travaux & Consuel */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Suivi du Visa Consuel et des Spécifications Techniques
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Type de Dossier Consuel</label>
                      <select
                        name="consuelType"
                        value={formData.consuelType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="sc144b_pv">Dossier SC 144B (Photovoltaïque pur)</option>
                        <option value="dossier_violet_bess">Dossier Violet (Batterie BESS / Hybride)</option>
                        <option value="jaune_bt">Dossier Jaune (Basse Tension standard)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">N° de Dossier Consuel</label>
                      <input
                        type="text"
                        name="consuelNumero"
                        value={formData.consuelNumero}
                        onChange={handleChange}
                        placeholder="Ex: CS-2026-87421"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-teal-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Statut Consuel</label>
                      <select
                        name="consuelStatus"
                        value={formData.consuelStatus}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="non_depose">⚪ Non déposé</option>
                        <option value="depose">📬 Déposé sur consuel.com</option>
                        <option value="en_cours">⏳ Instruction par l'inspecteur</option>
                        <option value="vise">✅ Attestation Visée (Accord Enedis)</option>
                        <option value="non_conforme">⚠️ Non-conformités à lever</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Marque Onduleurs / PCS</label>
                      <input
                        type="text"
                        name="onduleurMarque"
                        value={formData.onduleurMarque}
                        onChange={handleChange}
                        placeholder="Ex: Sungrow, Huawei, SMA"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Modèle Onduleurs</label>
                      <input
                        type="text"
                        name="onduleurModele"
                        value={formData.onduleurModele}
                        onChange={handleChange}
                        placeholder="Ex: SG125HX / SUN2000-100KTL"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Dispositif de Découplage</label>
                      <input
                        type="text"
                        name="onduleurProtectionDecouplage"
                        value={formData.onduleurProtectionDecouplage}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de dépôt Consuel</label>
                      <input
                        type="date"
                        name="consuelDateDepot"
                        value={formData.consuelDateDepot}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de visite d'inspection</label>
                      <input
                        type="date"
                        name="consuelDateVisite"
                        value={formData.consuelDateVisite}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date d'obtention du Visa</label>
                      <input
                        type="date"
                        name="consuelDateVisa"
                        value={formData.consuelDateVisa}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                ÉTAPE 5 : CARD & MISE EN SERVICE (MES)
            ───────────────────────────────────────────────────────────── */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 text-xs space-y-1">
                  <p className="font-bold text-sm">Contrat d'Accès au Réseau (CARD / CAE) & Mise En Service (MES)</p>
                  <p className="opacity-90 leading-relaxed">
                    Ultime jalon du cycle de raccordement : signature du CARD autorisant l'injection (et le soutirage si stockage BESS), remise de l'attestation Consuel visée à l'agent Enedis, et mise sous tension définitive de la centrale.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Contrat d'Accès et Planification de la Mise En Service
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Type de Contrat d'Accès</label>
                      <select
                        name="cardType"
                        value={formData.cardType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="card_i">CARD-I (Injection pure HTA)</option>
                        <option value="card_is">CARD-IS (Injection & Soutirage — BESS HTA)</option>
                        <option value="cae">CAE (Contrat Accès & Exploitation BT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">N° de Contrat CARD / CAE</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        placeholder="Ex: CARD-2026-8871"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Statut Mise En Service</label>
                      <select
                        name="mesStatus"
                        value={formData.mesStatus}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="en_attente">⏳ En attente de finalisation travaux</option>
                        <option value="planifiee">📅 Rendez-vous Enedis fixé</option>
                        <option value="effectuee">⚡ Centrale Mise En Service (Active)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de signature CARD</label>
                      <input
                        type="date"
                        name="dateSignatureCard"
                        value={formData.dateSignatureCard}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date prévisionnelle MES</label>
                      <input
                        type="date"
                        name="datePrevueMes"
                        value={formData.datePrevueMes}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date effective de MES</label>
                      <input
                        type="date"
                        name="dateEffectiveMes"
                        value={formData.dateEffectiveMes}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Notes et observations d'exploitation</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Commentaires sur les réglages des relais de protection, mise en service du comptage 4 quadrants, index initial..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ═══ 4. PIED DE PAGE INTERACTIF & SAUVEGARDE ══════════════════════ */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              disabled={currentStep === 5}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {hasUnsavedChanges && (
              <span className="hidden sm:inline-block text-[11px] font-medium text-amber-600">
                Modifications non enregistrées
              </span>
            )}

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Enregistrer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
