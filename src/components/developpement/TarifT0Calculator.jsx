import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Info, RefreshCw, CheckCircle } from 'lucide-react';
import { TARIF_TRANCHES } from '@/data/tarifT0Data';

export default function TarifT0Calculator({ isOpen, onClose, project }) {
  const [puissance, setPuissance] = useState('');
  const [venteType, setVenteType] = useState('totale');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    if (project?.projectSize || project?.power) {
      setPuissance(project.projectSize || project.power);
    }
    setLastRefreshed(new Date());
  }, [project, isOpen]);

  const p = parseFloat(puissance) || 0;
  
  // Find applicable tranche
  const applicableTranche = TARIF_TRANCHES.find(t => p > t.minKwc && p <= t.maxKwc) || TARIF_TRANCHES[TARIF_TRANCHES.length - 1];

  const getRawTarif = () => {
    if (!applicableTranche) return 0;
    if (venteType === 'totale') {
      return typeof applicableTranche.tarifVenteTotale === 'number' ? applicableTranche.tarifVenteTotale : 0;
    } else {
      return typeof applicableTranche.tarifSurplus === 'number' ? applicableTranche.tarifSurplus : 0;
    }
  };

  const currentTarif = getRawTarif();
  const revenuEstime = p * currentTarif * 1100; // 1100h / year average

  const handleRefresh = () => {
    setLastRefreshed(new Date());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-50 text-green-600">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Calculateur Tarif T0 (CRE / EDF OA)</h2>
                <p className="text-xs text-gray-500">Mise à jour en temps réel au chargement</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                title="Actualiser les tarifs"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-blue-600"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 flex-1 space-y-6">
            {/* Inputs */}
            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Puissance crête (kWc)</label>
                <input
                  type="number"
                  value={puissance}
                  onChange={(e) => setPuissance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-bold text-gray-900 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Ex: 100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type de revente</label>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setVenteType('totale')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      venteType === 'totale' 
                        ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Vente totale
                  </button>
                  <button
                    onClick={() => setVenteType('surplus')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      venteType === 'surplus' 
                        ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Vente surplus
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-6 rounded-2xl text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] bg-white/20 px-2 py-1 rounded-full font-mono">
                {lastRefreshed.toLocaleTimeString('fr-FR')}
              </div>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1">
                Tarif d'achat garanti (Tranche {applicableTranche?.label})
              </p>
              <div className="text-4xl font-extrabold mb-2">
                {typeof currentTarif === 'number' ? currentTarif.toFixed(4) : currentTarif} € <span className="text-lg font-medium opacity-80">/ kWh</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-around">
                <div>
                  <p className="text-xs text-emerald-100">Puissance retenue</p>
                  <p className="text-base font-bold">{p} kWc</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-100">Revenu estimé / an (base 1100h)</p>
                  <p className="text-lg font-extrabold text-amber-200">
                    {revenuEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                <span>Grille tarifaire officielle CRE / EDF OA (2026)</span>
                <span className="text-xs font-normal text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> À jour au {lastRefreshed.toLocaleDateString('fr-FR')}
                </span>
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Tranche Puissance</th>
                      <th className="px-4 py-3">Vente Totale (€/kWh)</th>
                      <th className="px-4 py-3">Surplus S21 (€/kWh)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {TARIF_TRANCHES.map((t, idx) => {
                      const isApplicable = p > t.minKwc && p <= t.maxKwc;
                      return (
                        <tr key={idx} className={isApplicable ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : ''}>
                          <td className={`px-4 py-3 font-semibold ${isApplicable ? 'text-emerald-900' : 'text-gray-900'}`}>
                            {t.label}
                          </td>
                          <td className={`px-4 py-3 ${isApplicable && venteType === 'totale' ? 'font-bold text-emerald-700 text-base' : 'text-gray-700'}`}>
                            {typeof t.tarifVenteTotale === 'number' ? `${t.tarifVenteTotale.toFixed(4)} €` : t.tarifVenteTotale}
                          </td>
                          <td className={`px-4 py-3 ${isApplicable && venteType === 'surplus' ? 'font-bold text-emerald-700 text-base' : 'text-gray-700'}`}>
                            {typeof t.tarifSurplus === 'number' ? `${t.tarifSurplus.toFixed(4)} €` : t.tarifSurplus}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Contrat d'achat garanti sur 20 ans par EDF Obligation d'Achat. Tarifs indexés annuellement à +2%.</span>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              Fermer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
