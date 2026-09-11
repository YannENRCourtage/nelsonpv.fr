import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Zap, Sun, Battery, Euro, Check,
  Sliders, ShieldCheck, Building2, Landmark, Clock,
  Loader2, CheckCircle2, ArrowRight, Download
} from 'lucide-react';

/**
 * CommercialOfferConfigModal
 * Modale de paramétrage interactif de l'offre commerciale avant export PDF
 * Permet de sélectionner :
 * - Modèle de valorisation (Vente Totale / Autoconsommation + Surplus / Autoconsommation + Batterie)
 * - Tarif d'achat EDF OA et coût évité de l'électricité
 * - Solutions de financement à inclure et comparer (Tiers-Investisseur / Crédit / Abonnement)
 * - Options des pages (Lettre d'accompagnement, Tableau d'amortissement 20 ans)
 */
export default function CommercialOfferConfigModal({
  isOpen,
  onClose,
  item,
  onConfirmGenerate
}) {
  const simulation = item?.simulation || item || {};
  const powerKwc = Math.round(Number(simulation.installedKwc || simulation.kwc || simulation.power || 100) * 10) / 10;
  const annualProdKwh = Math.round(Number(simulation.annualProductionKwh || (powerKwc * 1150)));

  // 1. Modèle de valorisation
  const [economicModel, setEconomicModel] = useState('vente_totale');

  // 2. Tarifs de l'électricité
  const [tarifEdfOa, setTarifEdfOa] = useState(0.085);
  const [electricityBuyPrice, setElectricityBuyPrice] = useState(0.22);

  // 3. Solutions de financement à inclure
  const [financingChoices, setFinancingChoices] = useState([
    'tiers_investisseur',
    'credit_bancaire',
    'abonnement'
  ]);

  // 4. Pages optionnelles
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [includeAmortizationTable, setIncludeAmortizationTable] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (isOpen && simulation) {
      const initialModel = simulation.economicModel || (simulation.type === 'autoconsommation' ? 'autoconsommation' : 'vente_totale');
      setEconomicModel(initialModel);
      
      const defTarif = initialModel === 'vente_totale'
        ? (powerKwc > 500 ? 0.078 : (powerKwc >= 100 ? 0.085 : 0.11))
        : 0.12; // Tarif surplus standard
      setTarifEdfOa(simulation.tarifEdfOaKwh || defTarif);
      setElectricityBuyPrice(0.22);
      
      if (simulation.excludeThirdParty) {
        setFinancingChoices(['credit_bancaire', 'abonnement']);
      } else {
        setFinancingChoices(['tiers_investisseur', 'credit_bancaire', 'abonnement']);
      }
    }
  }, [isOpen, simulation, powerKwc]);

  // Ajustement automatique du tarif conseillé lors du changement de modèle
  const handleModelChange = (newModel) => {
    setEconomicModel(newModel);
    if (newModel === 'vente_totale') {
      setTarifEdfOa(powerKwc > 500 ? 0.078 : (powerKwc >= 100 ? 0.085 : 0.11));
    } else {
      setTarifEdfOa(0.12);
    }
  };

  const toggleFinancing = (key) => {
    setFinancingChoices(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Au moins une solution obligatoire
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Calcul dynamique des gains en temps réel pour l'aperçu dans la modale
  const estimatedAnnualGain = Math.round(
    economicModel === 'vente_totale'
      ? annualProdKwh * Number(tarifEdfOa || 0.085)
      : economicModel === 'autoconsommation_stockage'
      ? (annualProdKwh * 0.95 * Number(electricityBuyPrice || 0.22)) + (annualProdKwh * 0.05 * Number(tarifEdfOa || 0.12))
      : (annualProdKwh * 0.65 * Number(electricityBuyPrice || 0.22)) + (annualProdKwh * 0.35 * Number(tarifEdfOa || 0.12))
  );

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    try {
      await onConfirmGenerate({
        economicModel,
        tarifEdfOa: Number(tarifEdfOa),
        electricityBuyPrice: Number(electricityBuyPrice),
        financingChoices,
        includeCoverLetter,
        includeAmortizationTable
      });
      onClose();
    } catch (err) {
      console.error('Erreur génération offre PDF configurée:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* EN-TÊTE DE LA MODALE */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Configuration de l'Offre Commerciale PDF
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-md">
                  {simulation.clientName || simulation.address || 'Toiture Photovoltaïque'} &bull; {powerKwc} kWc
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CONTENU DU PARAMÉTRAGE */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">

            {/* 1. MODÈLE DE VALORISATION (RADIO BOUTONS ÉLÉGANTS) */}
            <div className="space-y-2.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Modèle de valorisation de l'électricité</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Option A : Vente Totale */}
                <div
                  onClick={() => handleModelChange('vente_totale')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    economicModel === 'vente_totale'
                      ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-md shadow-emerald-950/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-xs text-white flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-400" />
                      Vente Totale
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      economicModel === 'vente_totale' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {economicModel === 'vente_totale' && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    100% injecté sur le réseau EDF OA. Tarif garanti par l'État sur 20 ans.
                  </p>
                </div>

                {/* Option B : Autoconsommation + Surplus */}
                <div
                  onClick={() => handleModelChange('autoconsommation')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    economicModel === 'autoconsommation'
                      ? 'border-blue-500 bg-blue-950/30 text-white shadow-md shadow-blue-950/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-xs text-white flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-blue-400" />
                      Autoconso + Surplus
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      economicModel === 'autoconsommation' ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                    }`}>
                      {economicModel === 'autoconsommation' && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Consommation locale en priorité (~65%) et revente du surplus à EDF OA.
                  </p>
                </div>

                {/* Option C : Autoconsommation + Batterie */}
                <div
                  onClick={() => handleModelChange('autoconsommation_stockage')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    economicModel === 'autoconsommation_stockage'
                      ? 'border-purple-500 bg-purple-950/30 text-white shadow-md shadow-purple-950/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-xs text-white flex items-center gap-1.5">
                      <Battery className="w-4 h-4 text-purple-400" />
                      Autoconso + Batterie
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      economicModel === 'autoconsommation_stockage' ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                    }`}>
                      {economicModel === 'autoconsommation_stockage' && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Stockage batterie diurne pour effacement nocturne. Autonomie ~95%.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. TARIFS DE VALORISATION ÉLECTRICITÉ (INPUTS ÉDITABLES) */}
            <div className="space-y-2.5 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <Euro className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Paramétrage des tarifs de l'électricité</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input Tarif EDF OA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-400">
                      {economicModel === 'vente_totale' ? 'Tarif d\'achat EDF OA (contrat 20 ans)' : 'Tarif de rachat du Surplus'}
                    </span>
                    <span className="text-[10px] text-slate-500">en €/kWh</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.001"
                      min="0.01"
                      max="0.50"
                      value={tarifEdfOa}
                      onChange={(e) => setTarifEdfOa(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <span className="absolute right-3 text-xs font-semibold text-slate-500">€/kWh</span>
                  </div>
                </div>

                {/* Input Électricité économisée si Autoconso */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-400">
                      Prix d'achat électricité soutirée (économisée)
                    </span>
                    <span className="text-[10px] text-slate-500">en €/kWh</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="0.80"
                      disabled={economicModel === 'vente_totale'}
                      value={electricityBuyPrice}
                      onChange={(e) => setElectricityBuyPrice(e.target.value)}
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                        economicModel === 'vente_totale'
                          ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'border-slate-700 text-blue-400 focus:outline-none focus:border-blue-500'
                      }`}
                    />
                    <span className="absolute right-3 text-xs font-semibold text-slate-500">€/kWh</span>
                  </div>
                </div>
              </div>

              {/* Badge dynamique aperçu des gains */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Gains annuels estimés (An 1) :</span>
                <span className="text-emerald-400 font-black text-xs">
                  +{estimatedAnnualGain.toLocaleString('fr-FR')} €/an
                </span>
              </div>
            </div>

            {/* 3. SOLUTIONS DE FINANCEMENT À COMPARER (CASES À COCHER) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>3. Solutions de financement à inclure dans le comparatif</span>
                </label>
                <span className="text-[10px] text-slate-500">Min. 1 solution cochée</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Tiers-Investisseur */}
                <div
                  onClick={() => toggleFinancing('tiers_investisseur')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    financingChoices.includes('tiers_investisseur')
                      ? 'border-purple-500/80 bg-purple-950/20 text-white'
                      : 'border-slate-800 bg-slate-950/30 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      financingChoices.includes('tiers_investisseur') ? 'border-purple-400 bg-purple-600 text-white' : 'border-slate-700'
                    }`}>
                      {financingChoices.includes('tiers_investisseur') && <Check className="w-3 h-3 stroke-3" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">Tiers-Investisseur</div>
                      <div className="text-[10px] text-slate-400">0 € d'apport &bull; Loyer garanti</div>
                    </div>
                  </div>
                </div>

                {/* Crédit Bancaire */}
                <div
                  onClick={() => toggleFinancing('credit_bancaire')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    financingChoices.includes('credit_bancaire')
                      ? 'border-blue-500/80 bg-blue-950/20 text-white'
                      : 'border-slate-800 bg-slate-950/30 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      financingChoices.includes('credit_bancaire') ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700'
                    }`}>
                      {financingChoices.includes('credit_bancaire') && <Check className="w-3 h-3 stroke-3" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">Crédit Bancaire</div>
                      <div className="text-[10px] text-slate-400">Propriétaire J1 &bull; Prêt pro</div>
                    </div>
                  </div>
                </div>

                {/* Abonnement Solaire */}
                <div
                  onClick={() => toggleFinancing('abonnement')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    financingChoices.includes('abonnement')
                      ? 'border-teal-500/80 bg-teal-950/20 text-white'
                      : 'border-slate-800 bg-slate-950/30 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      financingChoices.includes('abonnement') ? 'border-teal-400 bg-teal-600 text-white' : 'border-slate-700'
                    }`}>
                      {financingChoices.includes('abonnement') && <Check className="w-3 h-3 stroke-3" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">Abonnement Solaire</div>
                      <div className="text-[10px] text-slate-400">Leasing LOA avec option d'achat</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. OPTIONS SUPPLÉMENTAIRES */}
            <div className="flex items-center gap-6 pt-2 border-t border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeCoverLetter}
                  onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Inclure la lettre d'accompagnement (Page 1)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeAmortizationTable}
                  onChange={(e) => setIncludeAmortizationTable(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Tableau d'amortissement 20 ans (Page 5)</span>
              </label>
            </div>

          </div>

          {/* PIED DE PAGE & BOUTON D'ACTION */}
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isGenerating || financingChoices.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération du PDF en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Générer le PDF Commercial</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
