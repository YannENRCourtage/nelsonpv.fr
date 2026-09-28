import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, CheckCircle2, AlertTriangle, AlertCircle,
  Loader2, X, ExternalLink, ShieldCheck, MapPin, Building, User, FileText,
  Eye, RefreshCw, Download
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

  // Visionneuse du courrier PDF
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const isInitialMount = useRef(true);

  // Génération / Récupération du Blob PDF pour la prévisualisation
  const loadPdfPreview = async (item, customRecipient = null) => {
    if (!item) return;
    setIsLoadingPdf(true);
    setPreviewError(null);

    try {
      let source = null;
      const targetRecipient = customRecipient || recipient;
      if (typeof generatePdfFn === 'function') {
        const itemToGen = {
          ...item,
          ...targetRecipient,
          recipientNom: targetRecipient?.nom,
          contactName: targetRecipient?.nom,
          nom_societe: targetRecipient?.nom_societe,
          clientName: targetRecipient?.nom_societe || item.clientName
        };
        const genRes = await generatePdfFn(itemToGen);
        source = genRes?.blob || genRes?.arrayBuffer || genRes;
      } else {
        source = item.blob || item.arrayBuffer;
      }

      if (source) {
        let blobToUse = source;
        if (source instanceof ArrayBuffer) {
          blobToUse = new Blob([source], { type: 'application/pdf' });
        }
        setPdfBlob(blobToUse);
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        const url = URL.createObjectURL(blobToUse);
        setPdfUrl(url);
      } else {
        setPreviewError("Aperçu non disponible immédiatement.");
      }
    } catch (err) {
      console.warn("Erreur chargement aperçu PDF courrier:", err);
      setPreviewError("Erreur lors de la génération de l'aperçu PDF.");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Initialisation à l'ouverture de la modal
  useEffect(() => {
    if (isOpen && prospect) {
      isInitialMount.current = true;
      const extracted = extractRecipientFromProspect(prospect);
      setRecipient(extracted);
      setResult(null);
      setError(null);
      setIsSending(false);
      loadPdfPreview(prospect, extracted);
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, prospect]);

  // Re-génération debouncée de l'aperçu PDF lorsque l'utilisateur modifie les champs destinataire
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isOpen || !prospect) return;

    const timer = setTimeout(() => {
      loadPdfPreview(prospect, recipient);
    }, 450);

    return () => clearTimeout(timer);
  }, [recipient.nom, recipient.nom_societe, recipient.adresse_ligne1, recipient.code_postal, recipient.ville]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!recipient.adresse_ligne1 || !recipient.code_postal || !recipient.ville) {
      setError("Veuillez renseigner une adresse, un code postal et une ville valides.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // 1. Utiliser le PDF pré-généré ou le générer
      let pdfSource = pdfBlob;
      if (!pdfSource && typeof generatePdfFn === 'function') {
        const itemToGen = {
          ...prospect,
          ...recipient,
          recipientNom: recipient?.nom,
          contactName: recipient?.nom,
          nom_societe: recipient?.nom_societe,
          clientName: recipient?.nom_societe || prospect.clientName
        };
        const genRes = await generatePdfFn(itemToGen);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center pt-16 pb-4 px-2 sm:px-6 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-7xl lg:max-w-[1500px] h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white shrink-0">
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
              className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grille 2 Colonnes : Visionneuse PDF (gauche) & Paramètres Envoi (droite) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
            
            {/* COLONNE GAUCHE : VISIONNEUSE PDF DU COURRIER */}
            <div className="lg:col-span-7 bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col h-[350px] lg:h-full min-h-0">
              <div className="px-4 py-2.5 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Visionneuse du courrier avant envoi</span>
                </div>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded-md border border-slate-300 shadow-xs"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Plein écran
                  </a>
                )}
              </div>

              <div className="flex-1 relative bg-slate-200 flex items-center justify-center overflow-hidden">
                {isLoadingPdf ? (
                  <div className="flex flex-col items-center gap-2 text-slate-600 p-6 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">Génération de la visionneuse PDF en cours...</span>
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    className="w-full h-full border-0 bg-white"
                    title="Visionneuse du courrier postal"
                  />
                ) : previewError ? (
                  <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                    <p>{previewError}</p>
                    <button
                      type="button"
                      onClick={() => loadPdfPreview(prospect, recipient)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Recharger l'aperçu
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Chargement du document...
                  </div>
                )}
              </div>
            </div>

            {/* COLONNE DROITE : FORMULAIRE DESTINATAIRE & OPTIONS */}
            <div className="lg:col-span-5 p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Résumé du document */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-sm text-blue-950">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-slate-800 text-xs sm:text-sm">
                      <strong>Document :</strong> Offre commerciale &amp; Étude (2 pages, recto-verso)
                    </span>
                  </div>
                  <span className="px-2.5 py-1 font-bold text-xs bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 shrink-0">
                    P1 AFNOR + P2 Étude
                  </span>
                </div>

                {/* Formulaire Adresse Destinataire */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Adresse du Destinataire (Fenêtre d'enveloppe)
                    </label>
                    <span className="text-xs text-slate-600 font-medium">Calibré fenêtre DL / C5</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 mb-1">Raison Sociale / Entreprise</label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          value={recipient.nom_societe}
                          onChange={(e) => setRecipient({ ...recipient, nom_societe: e.target.value })}
                          placeholder="Ex: SARL DUPONT ou EARL DU CHÊNE"
                          className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-black bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 mb-1">Contact / Attention de</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          value={recipient.nom}
                          onChange={(e) => setRecipient({ ...recipient, nom: e.target.value })}
                          placeholder="Ex: M. Jean DUPONT"
                          className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-black bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 mb-1">Adresse (N° et Voie) *</label>
                      <input
                        type="text"
                        value={recipient.adresse_ligne1}
                        onChange={(e) => setRecipient({ ...recipient, adresse_ligne1: e.target.value })}
                        placeholder="Ex: 12 Rue de la Paix"
                        className="w-full px-3 py-2 text-sm font-semibold text-black bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Code Postal *</label>
                      <input
                        type="text"
                        value={recipient.code_postal}
                        onChange={(e) => setRecipient({ ...recipient, code_postal: e.target.value })}
                        placeholder="Ex: 33000"
                        maxLength={5}
                        className="w-full px-3 py-2 text-sm font-mono font-bold text-black bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Ville *</label>
                      <input
                        type="text"
                        value={recipient.ville}
                        onChange={(e) => setRecipient({ ...recipient, ville: e.target.value })}
                        placeholder="Ex: BORDEAUX"
                        className="w-full px-3 py-2 text-sm font-bold uppercase text-black bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Options d'affranchissement & impression */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Mode d'envoi La Poste :</span>
                    <span className="text-emerald-700 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Lettre Verte J+3
                    </span>
                  </div>
                  <ul className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 pt-0.5">
                    <li>• Impression : <strong className="text-slate-800">Couleur Haute Qualité</strong></li>
                    <li>• Recto / Verso : <strong className="text-slate-800">Oui (1 feuille)</strong></li>
                    <li>• Affranchissement : <strong className="text-slate-800">Facteur J+3</strong></li>
                    <li>• Enveloppe : <strong className="text-slate-800">Fenêtre DL/C5</strong></li>
                  </ul>
                </div>

                {/* Alerte Erreur */}
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Erreur lors de l'envoi postal</span>
                    </div>
                    <p className="text-rose-700 leading-relaxed">
                      {typeof error === 'string' ? error : error.message}
                    </p>
                    {error?.errorCode === 'SERVICEPOSTAL_ACCOUNT_403' && (
                      <div className="mt-2 p-2 bg-white/80 rounded-lg border border-rose-200 text-[11px] text-rose-950 font-medium">
                        👉 <strong>Comment débloquer :</strong> Rendez-vous sur votre compte <strong>servicepostal.com</strong> &gt; Paramètres du compte pour valider l'option API de production.
                      </div>
                    )}
                  </div>
                )}

                {/* Succès */}
                {result && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Courrier envoyé avec succès à La Poste !</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[11px]">
                      <div>UID envoi : <strong className="text-slate-800">{result.uid}</strong></div>
                      <div>Statut : <strong className="text-emerald-700 uppercase">{result.statut || 'Validé'}</strong></div>
                      {result.total && <div>Coût total : <strong>{Number(result.total).toFixed(2)} € HT</strong></div>}
                      {result.affranchissement && <div>Affranchissement : <strong>{Number(result.affranchissement).toFixed(2)} €</strong></div>}
                    </div>
                    {result.url && (
                      <div className="pt-1">
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
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {result ? 'Fermer' : 'Annuler'}
            </button>

            {!result ? (
              <button
                onClick={handleSend}
                disabled={isSending || !recipient.adresse_ligne1 || !recipient.code_postal || !recipient.ville}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-colors cursor-pointer"
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
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors cursor-pointer"
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

