// src/components/enedis/PrmSelectionModal.jsx
import React, { useState } from 'react';
import { X, Zap, Building2, Check, AlertTriangle, HelpCircle, ShieldCheck, ArrowRight, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Modale de sélection de PRM lors de la détection de plusieurs compteurs
 * à une même adresse (ex: maison + hangar agricole / plusieurs ateliers).
 */
export default function PrmSelectionModal({
  isOpen,
  onClose,
  candidates = [],
  onSelectPrm,
  address = '',
  companyName = '',
  clientName = ''
}) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPrm, setManualPrm] = useState('');
  const [manualError, setManualError] = useState('');

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* En-tête de la modale */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Plusieurs compteurs détectés à cette adresse
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

        {/* Message d'aide */}
        <div className="px-6 pt-4 pb-2 bg-slate-900/60 border-b border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Sélectionnez le compteur professionnel alimentant le bâtiment à équiper en solaire.
            </span>
          </div>
        </div>

        {/* Liste des compteurs candidats */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {candidates.map((cand, idx) => {
            const isRec = cand.isRecommended;
            const power = cand.puissance_souscrite_kva;
            const titulaire = cand.titulaire || cand.nom_client || 'Non renseigné';
            const complement = cand.complement_adresse || cand.adresse?.complement_adresse;

            return (
              <div
                key={cand.prm || idx}
                onClick={() => handleSelectCandidate(cand)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                  isRec
                    ? 'bg-amber-500/10 border-amber-500/60 hover:bg-amber-500/15 hover:border-amber-400 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/80 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Informations du compteur */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-black tracking-wider text-white">
                        {formatPrm(cand.prm)}
                      </span>
                      
                      {/* Badge Puissance souscrite */}
                      {power !== null && power !== undefined && (
                        <Badge className={`px-2 py-0.5 text-xs font-bold ${
                          power >= 36 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
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
                        <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5">
                          ⭐ Recommandé
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-semibold text-white">{titulaire}</span>
                      {cand.etat_contractuel && (
                        <span className="text-slate-500 text-[11px]">
                          • {cand.etat_contractuel}
                        </span>
                      )}
                    </div>

                    {complement && (
                      <div className="text-xs text-amber-200/90 font-medium pl-5 italic">
                        ↳ {complement}
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

          {/* Section de saisie manuelle en repli */}
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
                    className="bg-slate-900 border-slate-700 text-white font-mono text-sm tracking-wider flex-1"
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

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Vérification SGE Tiers Enedis
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
}
