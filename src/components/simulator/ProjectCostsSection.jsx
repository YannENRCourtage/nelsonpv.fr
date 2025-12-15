import React, { useState } from 'react';
import { Euro, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import DefaultCostsModal from './DefaultCostsModal';
import TariffDetailsModal from './TariffDetailsModal';

export default function ProjectCostsSection({ costs, onCostsChange, totalCost }) {
    const [showDefaultsModal, setShowDefaultsModal] = useState(false);
    const [showTariffsModal, setShowTariffsModal] = useState(false);

    const handleChange = (field, value) => {
        onCostsChange({ ...costs, [field]: parseFloat(value) || 0 });
    };

    const costFields = [
        { key: 'installation', label: 'Installation', icon: '🔧' },
        { key: 'charpente', label: 'Charpente', icon: '🏗️' },
        { key: 'couverture', label: 'Couverture', icon: '🏠' },
        { key: 'terrassement', label: 'Terrassement', icon: '⛏️' },
        { key: 'raccordement', label: 'Raccordement', icon: '🔌' },
        { key: 'fraisConnexion', label: 'Frais Connexion', icon: '💳' },
        { key: 'fraisContrat', label: 'Frais Contrat', icon: '📄' },
        { key: 'developpement', label: 'Développement', icon: '💡' },
        { key: 'declaissement', label: 'Déclaissement', icon: '📋' },
        { key: 'sortie', label: 'Sortie', icon: '🚪' },
    ];

    const optionFields = [
        { key: 'batterie', label: 'Batterie', icon: '🔋' },
        { key: 'onduleur', label: 'Onduleur', icon: '⚡' },
        { key: 'chargeur3DSecours', label: 'Chargeur 3D Secours', icon: '🔌' },
    ];

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-800">Coûts du Projet</h2>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDefaultsModal(true)}
                        className="text-sm"
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres par défaut
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTariffsModal(true)}
                        className="text-sm"
                    >
                        <Info className="h-4 w-4 mr-2" />
                        Détails des tarifs
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {costFields.map(({ key, label, icon }) => (
                    <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {icon} {label}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={costs[key] || 0}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="absolute right-3 top-2 text-gray-400 text-sm">€</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t pt-4 mb-6">
                <h3 className="text-md font-semibold text-gray-700 mb-4">Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {optionFields.map(({ key, label, icon }) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {icon} {label}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={costs[key] || 0}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="absolute right-3 top-2 text-gray-400 text-sm">€</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">Coût Total du Projet</span>
                    <span className="text-3xl font-bold text-blue-700">
                        {totalCost.toLocaleString('fr-FR')} €
                    </span>
                </div>
            </div>

            {showDefaultsModal && (
                <DefaultCostsModal
                    costs={costs}
                    onSave={onCostsChange}
                    onClose={() => setShowDefaultsModal(false)}
                />
            )}

            {showTariffsModal && (
                <TariffDetailsModal onClose={() => setShowTariffsModal(false)} />
            )}
        </div>
    );
}
