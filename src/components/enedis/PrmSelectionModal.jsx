// src/components/enedis/PrmSelectionModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Zap,
  Building2,
  Home,
  Check,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Edit3,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Modale de sélection de PRM lors de la détection de plusieurs compteurs
 * à une même adresse (ex: maison + hangar agricole / plusieurs ateliers).
 * Intègre les flux réels Enedis, le croisement Sirene et la saisie manuelle 14 chiffres.
 */
export default function PrmSelectionModal({
  isOpen,
  onClose,
  candidates = [],
  onSelectPrm,
  address = '',
  companyName = '',
  clientName = '',
  isLoading = false,
  error = null
}) {
  const [mounted, setMounted] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPrm, setManualPrm] = useState('');
  const [manualError, setManualError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si aucun candidat n'est présent après chargement, afficher directement la saisie manuelle
  useEffect(() => {
    if (!isLoading && candidates.length === 0) {
      setShowManualInput(true);
    }
  }, [isLoading, candidates.length]);

  if (!isOpen) return null;
  if (!mounted || typeof document === 'undefined') return null;

  const handleSelectCandidate = (candidate) => {
    if (onSelectPrm) {
      onSelectPrm(candidate);
    }
    onClose();
  };

  const handleValidateManual = (e) => {
    e.preventDefault();
    const clean = manualPrm.replace(/\D/g, '');
    if (clean.length !== 14) {
      setManualError('Le numéro PRM doit comporter exactement 14 chiffres.');
      return;
    }
    setManualError('');
    if (onSelectPrm) {
      onSelectPrm({
        prm: clean,
        puissance_souscrite_kva: null,
        titulaire: companyName || clientName || 'Saisie manuelle',
        complement_adresse: 'Saisi manuellement par le commercial',
        isManual: true
      });
    }
    onClose();
  };

  const formatPrm = (prm = '') => {
    const s = prm.toString().padEnd(14, ' ');
    return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 8)} ${s.slice(8, 11)} ${s.slice(11, 14)}`.trim();
  };

  const modalTitle = isLoading
    ? 'Recherche de compteurs Enedis & Sirene'
    : candidates.length === 0
    ? 'Recherche de compteur Enedis'
    : candidates.length === 1
    ? 'Compteur détecté à cette adresse'
    : 'Plusieurs compteurs détectés à cette adresse';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ isolation: 'isolate' }}
    >
      <div className="relative z-[100000] bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête de la modale */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shrink-0 border bg-amber-500/20 text-amber-400 border-amber-500/30">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : candidates.length === 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {modalTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {companyName ? <span className="text-amber-300 font-semibold">{companyName} — </span> : null}
                {address || 'Adresse sélectionnée'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. ÉTAT DE CHARGEMENT */}
        {isLoading && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center"></div>
              <Zap className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <p className="text-sm font-bold text-white">
                Recherche des compteurs Enedis et croisement Sirene en cours à cette adresse...
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interrogation en direct de l'API Enedis (SGE Tiers) et vérification de la raison sociale officielle dans l'annuaire d'entreprises de l'État (Sirene).
              </p>
            </div>
          </div>
        )}

        {/* 2. ÉTAT ERREUR TECHNIQUE */}
        {!isLoading && error && (
          <div className="p-4 mx-6 mt-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3. ÉTAT AUCUN COMPTEUR TROUVÉ (EMPTY STATE) */}
        {!isLoading && candidates.length === 0 && (
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Aucun compteur trouvé à cette adresse exacte. Veuillez saisir le PRM manuellement.
                </p>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  L'adresse indiquée n'a pas renvoyé de point de livraison automatique (absence dans le référentiel Enedis ou libellé de voie spécifique). Vous pouvez renseigner directement le numéro PRM à 14 chiffres ci-dessous.
                </p>
              </div>
            </div>

            {/* Saisie manuelle immédiate */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                Numéro de PRM (14 chiffres) :
              </label>
              <form onSubmit={handleValidateManual} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  maxLength={14}
                  value={manualPrm}
                  onChange={(e) => {
                    setManualPrm(e.target.value.replace(/\D/g, ''));
                    setManualError('');
                  }}
                  placeholder="Ex: 16138350177475"
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm tracking-widest flex-1 focus:border-amber-400"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 h-10 shadow-md shadow-amber-500/20"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Valider ce PRM
                </Button>
              </form>
              {manualError && (
                <p className="text-xs text-red-400 font-medium">{manualError}</p>
              )}
            </div>
          </div>
        )}

        {/* 4. ÉTAT LISTE DES COMPTEURS CANDIDATS */}
        {!isLoading && candidates.length > 0 && (
          <>
            {/* Message d'aide */}
            <div className="px-6 pt-4 pb-2 bg-slate-900/60 border-b border-slate-800/60">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Sélectionnez le compteur professionnel alimentant le bâtiment ou l'installation à équiper.
                </span>
              </div>
            </div>

            {/* Liste des compteurs candidats */}
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {candidates.map((cand, idx) => {
                const isRec = cand.isRecommended;
                const power = cand.puissance_souscrite_kva;
                const isResidential = cand.titulaire === 'Compteur Résidentiel' || cand.usage === 'Résidentiel';
                const isSireneMatch = cand.sireneMatched;
                const titulaire = cand.titulaire || (isResidential ? 'Compteur Résidentiel' : 'Non renseigné');
                const complement = cand.complement_adresse || cand.adresse?.complement_adresse;

                return (
                  <div
                    key={cand.prm || idx}
                    onClick={() => handleSelectCandidate(cand)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isRec
                        ? 'bg-amber-500/10 border-amber-500/60 hover:bg-amber-500/15 hover:border-amber-400 ring-1 ring-amber-500/40'
                        : isResidential
                        ? 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 opacity-90'
                        : 'bg-slate-950/90 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Informations du compteur */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-black tracking-wider text-white">
                            {formatPrm(cand.prm)}
                          </span>
                          
                          {/* Badge Puissance souscrite */}
                          {power !== null && power !== undefined && (
                            <Badge className={`px-2.5 py-0.5 text-xs font-bold ${
                              power >= 36 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                : power > 9
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              <Zap className="w-3 h-3 mr-1 inline" />
                              {power} kVA
                            </Badge>
                          )}

                          {/* Badge Segment */}
                          {cand.segment && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                              {cand.segment}
                            </span>
                          )}

                          {/* Badge Recommandé */}
                          {isRec && (
                            <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5">
                              ⭐ Recommandé
                            </Badge>
                          )}
                        </div>

                        {/* Titulaire / Raison Sociale croisée Sirene ou Résidentiel RGPD */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {isSireneMatch ? (
                            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-white font-bold">{titulaire}</span>
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] px-1.5 py-0 font-normal">
                                Entreprise certifiée Sirene
                              </Badge>
                            </div>
                          ) : isResidential ? (
                            <div className="flex items-center gap-1.5 text-slate-300 font-medium bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                              <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-300 font-medium">{titulaire}</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Usage Domestique • RGPD)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-white font-semibold">{titulaire}</span>
                            </div>
                          )}

                          {cand.etat_contractuel && (
                            <span className="text-slate-500 text-[11px]">
                              • {cand.etat_contractuel}
                            </span>
                          )}
                        </div>

                        {/* Complément d'adresse ou explications du score */}
                        {complement && (
                          <div className="text-xs text-amber-200/90 font-medium pl-1 italic">
                            ↳ {complement}
                          </div>
                        )}

                        {cand.recommendationReason && isRec && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 pl-1">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{cand.recommendationReason}</span>
                          </div>
                        )}
                      </div>

                      {/* Bouton de sélection */}
                      <div className="shrink-0 flex items-center justify-end sm:justify-start">
                        <Button
                          type="button"
                          size="sm"
                          className={`rounded-xl font-bold text-xs px-3.5 py-2 transition-all ${
                            isRec
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCandidate(cand);
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Choisir ce compteur
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Repli saisie manuelle si le compteur voulu n'est pas dans la liste */}
              <div className="pt-2">
                {!showManualInput ? (
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors pt-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Le compteur recherché n'apparaît pas ? Saisir manuellement le PRM</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Saisie manuelle du PRM (14 chiffres) :
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowManualInput(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-300"
                      >
                        Annuler
                      </button>
                    </div>
                    
                    <form onSubmit={handleValidateManual} className="flex gap-2">
                      <Input
                        type="text"
                        maxLength={14}
                        value={manualPrm}
                        onChange={(e) => {
                          setManualPrm(e.target.value.replace(/\D/g, ''));
                          setManualError('');
                        }}
                        placeholder="Ex: 16138350177475"
                        className="bg-slate-900 border-slate-700 text-white font-mono text-sm tracking-widest flex-1"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4"
                      >
                        Valider
                      </Button>
                    </form>
                    {manualError && (
                      <p className="text-xs text-red-400">{manualError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Conforme RGPD • Flux Enedis & API Sirene
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Fermer
          </Button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
