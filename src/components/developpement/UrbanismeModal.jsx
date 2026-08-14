import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Car, Building, Battery, CheckCircle2, Info } from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'toiture', label: 'Panneaux en toiture', icon: Home },
  { id: 'ombriere', label: 'Ombrière de parking', icon: Car },
  { id: 'batiment_solaire', label: 'Bâtiment solaire', icon: Building },
  { id: 'batterie', label: 'Batterie de stockage', icon: Battery },
];

const DOCUMENTS_BY_TYPE = {
  cu: [
    'Cerfa CU (Informations & Renseignements d\'urbanisme)',
    'CU1 - Plan de situation cadastral',
    'CU2 - Plan de masse du projet'
  ],
  dp: [
    'Cerfa DPC (Déclaration Préalable pré-remplie)',
    'DPC1 - Plan de situation',
    'DPC2 - Plan de masse',
    'DPC3 - Plan en coupe',
    'DPC4 - Plan de façades et toitures',
    'DPC6 - Document graphique d\'insertion',
    'DPC7 - Environnement proche',
    'DPC8 - Environnement lointain',
    'DPC11 - Notice descriptive des travaux'
  ],
  pc: [
    'Cerfa PC 13404 (Permis de Construire pré-rempli)',
    'PC1 - Plan de situation',
    'PC2 - Plan de masse',
    'PC3 - Plan en coupe du terrain et de la construction',
    'PC4 - Notice descriptive / agricole',
    'PC5 - Plan des façades et des toitures',
    'PC6 - Document graphique d\'insertion paysagère',
    'PC7 - Environnement proche',
    'PC8 - Environnement lointain'
  ]
};

const TITLES = {
  cu: "Certificat d'Urbanisme (CU)",
  dp: "Déclaration Préalable (DP)",
  pc: "Permis de Construire (PC)"
};

export default function UrbanismeModal({ isOpen, onClose, type, project, onGenerate }) {
  const [selectedProjectType, setSelectedProjectType] = useState(project?.type || 'batiment_solaire');

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (selectedProjectType && onGenerate) {
      onGenerate(type, selectedProjectType);
    }
  };

  const clientFullName = `${project?.firstName || ''} ${project?.lastName || project?.name || ''}`.trim() || 'Client';

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
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">{TITLES[type]}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex-1 space-y-6">
            {/* Project Info */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Projet concerné</h3>
              <p className="text-base font-bold text-gray-900">{clientFullName}</p>
              <p className="text-sm text-gray-600 mt-1">
                {project?.address} {project?.zip} {project?.city} • Cadastre: Section {project?.cadastre_section || '—'} n° {project?.cadastre_numero || '—'} ({project?.cadastre_surface ? `${project.cadastre_surface} m²` : ''})
              </p>
            </div>

            {/* Type Selector */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Type d'installation</h3>
              <div className="grid grid-cols-2 gap-3">
                {PROJECT_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedProjectType(pt.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedProjectType === pt.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <pt.icon className={`w-6 h-6 ${selectedProjectType === pt.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{pt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Documents générés</h3>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {DOCUMENTS_BY_TYPE[type]?.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
              <Info className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                La génération des dossiers d'urbanisme est <strong>gratuite et intégrée</strong>. 
                Les documents seront pré-remplis avec les informations du projet.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedProjectType}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Générer le dossier complet
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
