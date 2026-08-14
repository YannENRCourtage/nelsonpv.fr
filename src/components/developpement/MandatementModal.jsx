import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Mail, Plus, Check } from 'lucide-react';

const TITLES = {
  geometre: 'Mandatement Géomètre',
  notaire: 'Mandatement Notaire',
  huissier: 'Constat Huissier'
};

export default function MandatementModal({ isOpen, onClose, type, project, professionals = [], onAddProfessional }) {
  const [selectedPro, setSelectedPro] = useState('');
  const [isAddingPro, setIsAddingPro] = useState(false);
  const [newPro, setNewPro] = useState({ name: '', company: '', email: '', phone: '', address: '' });
  const [copied, setCopied] = useState(false);

  // Dynamic state based on type
  const [prestationType, setPrestationType] = useState('Division parcellaire');
  const [bailDuration, setBailDuration] = useState('30');
  const [startDate, setStartDate] = useState('');

  if (!isOpen) return null;

  const currentPros = professionals.filter(p => p.type === type);
  const selectedProData = currentPros.find(p => p.id === selectedPro) || (isAddingPro ? newPro : null);

  const getEmailContent = () => {
    const projectName = project?.name || '[Nom du projet]';
    const address = `${project?.address || ''}, ${project?.commune || ''}`.trim() || '[Adresse]';
    const cadastre = project?.cadastre || '[Section/Parcelle]';

    if (type === 'geometre') {
      return `Madame, Monsieur,\n\nNous vous mandatons pour réaliser une ${prestationType.toLowerCase()} pour le projet ${projectName}.\n\nAdresse : ${address}\nCadastre : ${cadastre}\n\nMerci de nous faire parvenir votre devis.\n\nCordialement,\nENR COURTAGE`;
    }
    if (type === 'notaire') {
      return `Maître,\n\nNous vous mandatons pour la rédaction d'un bail emphytéotique de ${bailDuration} ans pour le projet ${projectName}.\n\nAdresse : ${address}\n\nLes documents cadastraux et plans sont joints.\n\nCordialement,\nENR COURTAGE`;
    }
    if (type === 'huissier') {
      return `Maître,\n\nNous vous mandatons pour réaliser un constat d'affichage du panneau de chantier pour le projet ${projectName}.\n\nAdresse : ${address}\nDate de début : ${startDate || '[Date]'}\nDurée : 2 mois.\n\nMerci de réaliser 2 constats.\n\nCordialement,\nENR COURTAGE`;
    }
    return '';
  };

  const emailContent = getEmailContent();
  const subject = `${TITLES[type]} - Projet ${project?.name || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePro = () => {
    if (onAddProfessional && newPro.name) {
      onAddProfessional({ ...newPro, type });
      setIsAddingPro(false);
      // Ideally select the newly added pro here
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
            <h2 className="text-xl font-semibold text-gray-900">{TITLES[type]}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 flex-1 space-y-6">
            {/* Professional Selector */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700">Sélection du professionnel</h3>
                {!isAddingPro && (
                  <button
                    onClick={() => setIsAddingPro(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                )}
              </div>

              {isAddingPro ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text" placeholder="Nom complet"
                      value={newPro.name} onChange={e => setNewPro({...newPro, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text" placeholder="Entreprise / Étude"
                      value={newPro.company} onChange={e => setNewPro({...newPro, company: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="email" placeholder="Email"
                      value={newPro.email} onChange={e => setNewPro({...newPro, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="tel" placeholder="Téléphone"
                      value={newPro.phone} onChange={e => setNewPro({...newPro, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <input
                    type="text" placeholder="Adresse complète"
                    value={newPro.address} onChange={e => setNewPro({...newPro, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setIsAddingPro(false)} className="text-sm text-gray-500 px-3 py-1.5 hover:bg-gray-100 rounded-md">Annuler</button>
                    <button onClick={handleSavePro} className="text-sm text-white bg-blue-600 px-3 py-1.5 hover:bg-blue-700 rounded-md">Sauvegarder</button>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedPro}
                  onChange={(e) => setSelectedPro(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Sélectionner un professionnel...</option>
                  {currentPros.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.company}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Specific Fields */}
            {type === 'geometre' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Prestation</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" checked={prestationType === 'Division parcellaire'} onChange={() => setPrestationType('Division parcellaire')} className="text-blue-600" />
                    Division parcellaire
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" checked={prestationType === 'Division parcellaire volumétrique'} onChange={() => setPrestationType('Division parcellaire volumétrique')} className="text-blue-600" />
                    Division parcellaire volumétrique
                  </label>
                </div>
              </div>
            )}

            {type === 'notaire' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Durée du bail emphytéotique</h3>
                <div className="flex items-center gap-2">
                  <input type="number" value={bailDuration} onChange={(e) => setBailDuration(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <span className="text-sm text-gray-600">ans</span>
                </div>
              </div>
            )}

            {type === 'huissier' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Date de début d'affichage</h3>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            )}

            {/* Email Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Aperçu de l'email</h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans">
                {emailContent}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier l\'email'}
            </button>
            <a
              href={`mailto:${selectedProData?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Ouvrir dans le client email
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
