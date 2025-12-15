import React, { useState } from 'react';
import { Euro, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import DefaultCostsModal from './DefaultCostsModal';

export default function ProjectCostsSection({ costs, onCostsChange, totalCost }) {
    const [showDefaultCostsModal, setShowDefaultCostsModal] = useState(false);

    // Order matching simuacc.fr (Image 5)
    const costFields = [
        { key: 'installation', label: 'Installation', unit: '€' },
        { key: 'charpente', label: 'Charpente', unit: '€' },
        { key: 'couverture', label: 'Couverture', unit: '€' },
        { key: 'fondations', label: 'Fondations', unit: '€' },
        { key: 'raccordement', label: 'Raccordement', unit: '€' },
        { key: 'developpement', label: 'Développement', unit: '€' },
        { key: 'fraisCommerciaux', label: 'Frais Commerciaux', unit: '€' },
        { key: 'soulte', label: 'Soulte', unit: '€' },
        { key: 'maintenance', label: 'Maintenance', unit: '€/kWc/an' }
    ];

    const optionFields = [
        { key: 'bardage', label: 'Bardage', unit: '€' },
        { key: 'cheneaux', label: 'Chéneaux Et Descente', unit: '€' },
        { key: 'batterie', label: 'Batterie', unit: '€' }
    ];

    const handleChange = (field, value) => {
        onCostsChange({ ...costs, [field]: parseFloat(value) || 0 });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-bold text-gray-800">Coûts du Projet</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDefaultCostsModal(true)}
                    className="text-sm"
                >
                    <Settings className="h-4 w-4 mr-2" />
                    Détails coûts du projet
                </Button>
            </div>

            <div className="flex-grow space-y-6">
                {/* Main Costs Grid: 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {costFields.map((field) => (
                        <div key={field.key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                {field.label}
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    value={costs[field.key] || 0}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-xs">
                                        {field.unit === '€' ? '€' : (field.unit === '€/kWc/an' ? '' : '€')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {optionFields.map((field) => (
                            <div key={field.key}>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {field.label}
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={costs[field.key] || 0}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-xs">€</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex justify-between items-center">
                    <span className="text-lg font-bold text-indigo-900">Coût Total du Projet</span>
                    <span className="text-2xl font-bold text-indigo-700">
                        {totalCost.toLocaleString('fr-FR')} €
                    </span>
                </div>
            </div>

            {showDefaultCostsModal && (
                <DefaultCostsModal
                    onClose={() => setShowDefaultCostsModal(false)}
                />
            )}
        </div>
    );
}
