import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2, Clock, AlertCircle, FileText, Calendar, Upload, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

/**
 * ConsuelModal — Gestion et suivi de la demande d'Attestation de Conformité Électrique (Consuel)
 * Requis pour la mise en service de la centrale photovoltaïque par ENEDIS.
 */
export default function ConsuelModal({
  isOpen,
  onClose,
  project,
  onSave
}) {
  const [dossierNumber, setDossierNumber] = useState(project?.consuel_number || '');
  const [consuelStatus, setConsuelStatus] = useState(project?.consuel_status || 'en_cours');
  const [dateDepot, setDateDepot] = useState(project?.consuel_date_depot || new Date().toISOString().split('T')[0]);
  const [dateVisite, setDateVisite] = useState(project?.consuel_date_visite || '');
  const [notes, setNotes] = useState(project?.consuel_notes || '');

  const CONSUEL_STEPS = [
    { id: 'etude', label: '1. Schéma unifilaire & Certificats de conformité DIN VDE des onduleurs', done: true },
    { id: 'depot', label: '2. Saisie du formulaire Cerfa Jaune (ou Bleu) sur le portail Consuel Pro', done: !!dossierNumber },
    { id: 'paiement', label: '3. Règlement des frais de visa & instruction par l\'inspecteur', done: consuelStatus !== 'en_attente' },
    { id: 'visite', label: '4. Visite de contrôle sur site & Levée éventuelle des non-conformités', done: consuelStatus === 'vise' },
    { id: 'visa', label: '5. Délivrance de l\'Attestation Consuel visée (Code SC et validation)', done: consuelStatus === 'vise' },
  ];

  const handleSaveConsuel = () => {
    if (onSave) {
      onSave({
        consuel_number: dossierNumber,
        consuel_status: consuelStatus,
        consuel_date_depot: dateDepot,
        consuel_date_visite: dateVisite,
        consuel_notes: notes,
      });
    }
    toast({
      title: 'Dossier Consuel mis à jour',
      description: 'Les informations et le statut Consuel ont été enregistrés.',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg leading-tight">Demande de Consuel (Conformité Électrique)</h3>
                <p className="text-xs text-white/80">Projet {project?.name || ''} — Puissance : {project?.kwc ? `${project.kwc} kWc` : 'N/A'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* Checklist Étapes */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-800 text-xs mb-1">Étapes réglementaires Consuel Photovoltaïque</h4>
              {CONSUEL_STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2.5 text-xs">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                  )}
                  <span className={step.done ? 'text-slate-900 font-semibold' : 'text-slate-500 font-medium'}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Champs Saisie */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Numéro de dossier / Référence Consuel</label>
                <input
                  type="text"
                  value={dossierNumber}
                  onChange={(e) => setDossierNumber(e.target.value)}
                  placeholder="Ex: CSL-2026-98432"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Statut d'instruction</label>
                <select
                  value={consuelStatus}
                  onChange={(e) => setConsuelStatus(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="en_attente">⏳ En attente de constitution</option>
                  <option value="en_cours">⚡ Dossier déposé / En cours d'instruction</option>
                  <option value="visite_programmee">📅 Visite de contrôle programmée</option>
                  <option value="vise">✅ Attestation Consuel Visée (Conforme)</option>
                  <option value="non_conforme">⚠️ Non-conformité / Travaux requis</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date de dépôt du dossier</label>
                <input
                  type="date"
                  value={dateDepot}
                  onChange={(e) => setDateDepot(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date de visite ou de visa final</label>
                <input
                  type="date"
                  value={dateVisite}
                  onChange={(e) => setDateVisite(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Notes & Observations */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Observations & Remarques techniques</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Renseignez ici le nom de l'inspecteur, numéro de téléphone, date d'envoi à ENEDIS..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Lien portail Consuel */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-900">Accéder au portail officiel Consuel Pro :</span>
              <a
                href="https://mon-espace.consuel.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
              >
                mon-espace.consuel.com <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
              Annuler
            </button>
            <button
              onClick={handleSaveConsuel}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Enregistrer les modifications
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
