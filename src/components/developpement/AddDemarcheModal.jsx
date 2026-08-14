import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Home, Zap, FileText, Settings2 } from 'lucide-react';

const DEMARCHE_TYPES = [
  { id: 'dp_solaire', label: 'DP Solaire en toiture', icon: Sun },
  { id: 'pc_agricole', label: 'PC Bâtiment agricole', icon: Home },
  { id: 'raccordement', label: 'Raccordement Enedis', icon: Zap },
  { id: 'bail', label: 'Bail emphytéotique', icon: FileText },
  { id: 'custom', label: 'Personnalisée', icon: Settings2 },
];

export default function AddDemarcheModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [includeDefault, setIncludeDefault] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && type) {
      onAdd({
        name,
        type,
        description,
        includeDefault
      });
      // Reset form
      setName('');
      setType('');
      setDescription('');
      setIncludeDefault(true);
      onClose();
    }
  };

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
            <h2 className="text-xl font-semibold text-gray-900">Ajouter une démarche</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="px-6 py-5 space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la démarche</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Permis de construire Mairie 2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Type de démarche</label>
                <div className="grid grid-cols-2 gap-3">
                  {DEMARCHE_TYPES.map((dt) => (
                    <button
                      type="button"
                      key={dt.id}
                      onClick={() => setType(dt.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        type === dt.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <dt.icon className={`w-5 h-5 ${type === dt.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">{dt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnelle)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Précisions sur cette démarche..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow min-h-[100px] resize-y"
                />
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <input
                  type="checkbox"
                  id="includeDefault"
                  checked={includeDefault}
                  onChange={(e) => setIncludeDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="includeDefault" className="text-sm text-gray-700 cursor-pointer">
                  Générer automatiquement les étapes par défaut pour ce type de démarche
                </label>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!name || !type}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer la démarche
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
