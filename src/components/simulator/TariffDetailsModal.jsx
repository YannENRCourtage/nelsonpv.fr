import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const TARIFFS_KEY = 'simulator_tariffs';

const DEFAULT_TARIFFS = [
    { range: '0-9 kWc', tarif: 0.1430 },
    { range: '9-36 kWc', tarif: 0.1215 },
    { range: '36-100 kWc', tarif: 0.1070 },
    { range: '>100 kWc', tarif: 0.0940 },
];

export default function TariffDetailsModal({ onClose }) {
    const [tariffs, setTariffs] = useState(DEFAULT_TARIFFS);

    useEffect(() => {
        const saved = localStorage.getItem(TARIFFS_KEY);
        if (saved) {
            try {
                setTariffs(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading tariffs:', e);
            }
        }
    }, []);

    const handleChange = (index, value) => {
        const newTariffs = [...tariffs];
        newTariffs[index].tarif = parseFloat(value) || 0;
        setTariffs(newTariffs);
    };

    const handleSave = () => {
        localStorage.setItem(TARIFFS_KEY, JSON.stringify(tariffs));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">Détails des tarifs d'achat</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Tarifs d'achat de l'électricité photovoltaïque selon la puissance installée.
                    </p>

                    <div className="space-y-4">
                        {tariffs.map((tariff, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <span className="font-medium text-gray-700">{tariff.range}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={tariff.tarif}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <span className="text-gray-600">€/kWh</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Note :</strong> Ces tarifs sont indicatifs et peuvent varier selon les
                            conditions du contrat d'achat et la réglementation en vigueur.
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-2 rounded-b-lg">
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Enregistrer
                    </Button>
                </div>
            </div>
        </div>
    );
}
