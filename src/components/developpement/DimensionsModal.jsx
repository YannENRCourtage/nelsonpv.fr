import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, Check, AlertTriangle } from 'lucide-react';

/**
 * DimensionsModal — Modale fallback ergonomique demandant à l'utilisateur de saisir 
 * les côtes exactes du bâtiment (Longueur, Largeur, Hauteur à l'égout, Pente) s'il s'agit de données manquantes dans la base.
 */
export default function DimensionsModal({ isOpen, onClose, initialDimensions = {}, onSave }) {
  const [dimensions, setDimensions] = useState({
    longueur: initialDimensions.longueur || initialDimensions.length || '30',
    largeur: initialDimensions.largeur || initialDimensions.width || '15',
    hauteur_egout: initialDimensions.hauteur_egout || initialDimensions.hauteur || '6.0',
    pente: initialDimensions.pente || initialDimensions.slope || '15',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(dimensions);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-base text-amber-900">Côtes du bâtiment à compléter</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-gray-600">
              Les côtes exactes du bâtiment n'ont pas été détectées dans la base de données. Veuillez les renseigner ci-dessous pour générer l'insertion paysagère PC6 et ajuster le calque du projet.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Longueur du bâtiment (m) *</label>
                <input
                  type="number" step="0.1" required
                  value={dimensions.longueur}
                  onChange={e => setDimensions(prev => ({ ...prev, longueur: e.target.value }))}
                  placeholder="Ex: 30.0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Largeur du bâtiment (m) *</label>
                <input
                  type="number" step="0.1" required
                  value={dimensions.largeur}
                  onChange={e => setDimensions(prev => ({ ...prev, largeur: e.target.value }))}
                  placeholder="Ex: 15.0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hauteur à l'égout (m) *</label>
                <input
                  type="number" step="0.1" required
                  value={dimensions.hauteur_egout}
                  onChange={e => setDimensions(prev => ({ ...prev, hauteur_egout: e.target.value }))}
                  placeholder="Ex: 6.0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pente de toiture (°) *</label>
                <input
                  type="number" step="1" required
                  value={dimensions.pente}
                  onChange={e => setDimensions(prev => ({ ...prev, pente: e.target.value }))}
                  placeholder="Ex: 15"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button" onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" /> Valider & Générer le visuel
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
