import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, CheckCircle2, AlertTriangle, AlertCircle,
  Loader2, X, ExternalLink, ShieldCheck, MapPin, Building, User, FileText
} from 'lucide-react';
import { extractRecipientFromProspect, sendPostalLetter } from '@/services/servicePostalService';

export default function ServicePostalModal({
  isOpen,
  onClose,
  prospect,
  generatePdfFn,
  onSuccess
}) {
  const [recipient, setRecipient] = useState({
    nom_societe: '',
    nom: '',
    adresse_ligne1: '',
    adresse_ligne2: '',
    code_postal: '',
    ville: '',
    pays: 'FRANCE'
  });

  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Initialisation à l'ouverture de la modal
  useEffect(() => {
    if (isOpen && prospect) {
      const extracted = extractRecipientFromProspect(prospect);
      setRecipient(extracted);
      setResult(null);
      setError(null);
      setIsSending(false);
    }
  }, [isOpen, prospect]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!recipient.adresse_ligne1 || !recipient.code_postal || !recipient.ville) {
      setError("Veuillez renseigner une adresse, un code postal et une ville valides.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // 1. Génération du PDF si nécessaire
      let pdfSource = prospect.blob || prospect.arrayBuffer;
      if (!pdfSource && typeof generatePdfFn === 'function') {
        const genRes = await generatePdfFn(prospect);
        pdfSource = genRes?.blob || genRes?.arrayBuffer || genRes;
      }

      if (!pdfSource) {
        throw new Error("Impossible de générer le document PDF pour l'envoi postal.");
      }

      // 2. Envoi via l'API ServicePostal
      const sendRes = await sendPostalLetter({
        pdfSource,
        recipient,
        options: {
          affranchissement: 'verte',
          couleur: 'couleur',
          recto_verso: 'rectoverso',
          reference: prospect.pacage ? `PACAGE_${prospect.pacage}` : (prospect.id ? `PROSPECT_${prospect.id}` : undefined)
        }
      });

      setResult(sendRes);
      if (typeof onSuccess === 'function') {
        onSuccess(sendRes, prospect);
      }
    } catch (err) {
      console.error('Erreur envoi ServicePostal:', err);
      setError({
        message: err.message,
        errorCode: err.errorCode,
        details: err.details
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Mail className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Expédition Postale La Poste</h3>
                <p className="text-xs text-blue-200">Connecteur ServicePostal API • Format AFNOR NF Z 10-011</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
            {/* Résumé de l'offre */}
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-950">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Document :</strong> Offre commerciale &amp; Étude de faisabilité (2 pages, recto-verso)
                </span>
              </div>
              <span className="px-2 py-0.5 font-bold text-[10px] bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                P1 Lettre AFNOR + P2 Étude
              </span>
            </div>

            {/* Formulaire Adresse Destinataire */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Adresse du Destinataire (Fenêtre d'enveloppe)
                </label>
                <span className="text-[10.5px] text-slate-500">Calibré pour fenêtre DL / C5</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Raison Sociale / Entreprise</label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={recipient.nom_societe}
                      onChange={(e) => setRecipient({ ...recipient, nom_societe: e.target.value })}
                      placeholder="Ex: SARL DUPONT ou EARL DU CHÊNE"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact / Attention de</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={recipient.nom}
                      onChange={(e) => setRecipient({ ...recipient, nom: e.target.value })}
                      placeholder="Ex: M. Jean DUPONT ou Direction Générale"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Adresse (N° et Voie) *</label>
                  <input
                    type="text"
                    value={recipient.adresse_ligne1}
                    onChange={(e) => setRecipient({ ...recipient, adresse_ligne1: e.target.value })}
                    placeholder="Ex: 12 Rue de la Paix"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Code Postal *</label>
                  <input
                    type="text"
                    value={recipient.code_postal}
                    onChange={(e) => setRecipient({ ...recipient, code_postal: e.target.value })}
                    placeholder="Ex: 33000"
                    maxLength={5}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={recipient.ville}
                    onChange={(e) => setRecipient({ ...recipient, ville: e.target.value })}
                    placeholder="Ex: BORDEAUX"
                    className="w-full px-3 py-2 text-xs font-bold uppercase border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Options d'affranchissement & impression */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Mode d'envoi &amp; traitement La Poste :</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Lettre Verte J+3
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 pt-1">
                <li>• Impression : <strong>Couleur Haute Qualité</strong></li>
                <li>• Recto / Verso : <strong>Oui (1 feuille)</strong></li>
                <li>• Affranchissement : <strong>Distribution facteur J+3</strong></li>
                <li>• Enveloppe : <strong>Fenêtre transparente normalisée</strong></li>
              </ul>
            </div>

            {/* Alerte Erreur */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Erreur lors de l'envoi postal</span>
                </div>
                <p className="text-rose-700 leading-relaxed">
                  {typeof error === 'string' ? error : error.message}
                </p>
                {error?.errorCode === 'SERVICEPOSTAL_ACCOUNT_403' && (
                  <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-rose-200 text-[11px] text-rose-950 font-medium">
                    👉 <strong>Comment débloquer :</strong> Rendez-vous sur votre compte <strong>servicepostal.com</strong> &gt; Paramètres du compte pour valider l'option API de production (ou contactez le support ServicePostal pour l'activation de votre clé).
                  </div>
                )}
              </div>
            )}

            {/* Succès */}
            {result && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Courrier envoyé avec succès à La Poste !</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div>UID envoi : <strong className="text-slate-800">{result.uid}</strong></div>
                  <div>Statut : <strong className="text-emerald-700 uppercase">{result.statut || 'Validé'}</strong></div>
                  {result.total && <div>Coût total : <strong>{Number(result.total).toFixed(2)} € HT</strong></div>}
                  {result.affranchissement && <div>Affranchissement : <strong>{Number(result.affranchissement).toFixed(2)} €</strong></div>}
                </div>
                {result.url && (
                  <div className="pt-2">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold underline text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Voir le document chez Service Postal
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              {result ? 'Fermer' : 'Annuler'}
            </button>

            {!result ? (
              <button
                onClick={handleSend}
                disabled={isSending || !recipient.adresse_ligne1 || !recipient.code_postal || !recipient.ville}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-colors"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transmission en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirmer et Envoyer par La Poste
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
              >
                Terminer
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
