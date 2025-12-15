import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const DEFAULT_COSTS_KEY = 'simulator_default_costs';

export default function DefaultCostsModal({ costs, onSave, onClose }) {
    const [localCosts, setLocalCosts] = useState(costs);

    useEffect(() => {
        // Load saved defaults from localStorage
        const saved = localStorage.getItem(DEFAULT_COSTS_KEY);
        if (saved) {
            try {
                setLocalCosts(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading default costs:', e);
            }
        }
    }, []);

    const handleChange = (field, value) => {
        setLocalCosts({ ...localCosts, [field]: parseFloat(value) || 0 });
    };

    const handleSave = () => {
        localStorage.setItem(DEFAULT_COSTS_KEY, JSON.stringify(localCosts));
        onSave(localCosts);
        onClose();
    };

    const costFields = [
        { key: 'installation', label: 'Installation (€/kWc)' },
        { key: 'maintenance', label: 'Maintenance (€/kWc/an)' },
        { key: 'charpente', label: 'Charpente (€)' },
        { key: 'couverture', label: 'Couverture (€)' },
        { key: 'fondations', label: 'Fondations (€)' },
        { key: 'raccordement', label: 'Raccordement (€)' },
        { key: 'developpement', label: 'Développement (€)' },
        { key: 'soulte', label: 'Soulte (€)' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Paramètres des Coûts par Défaut</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Ajustez les valeurs par défaut utilisées dans le simulateur. Ces valeurs seront
                        sauvegardées pour vos prochaines visites.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {costFields.map(({ key, label }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {label}
                                </label>
                                <input
                                    type="number"
                                    value={localCosts[key] || 0}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Enregistrer et Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
}
