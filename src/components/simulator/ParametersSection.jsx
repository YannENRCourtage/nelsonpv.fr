import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ParametersSection({ params, onParamsChange }) {
    const handleChange = (field, value) => {
        onParamsChange({ ...params, [field]: parseFloat(value) || 0 });
    };

    const handleSliderChange = (e) => {
        const power = parseFloat(e.target.value);
        handleChange('power', power);
        // Auto-calculate estimated production
        handleChange('estimatedProduction', power * 1200);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800">Paramètres</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonne 1 */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Puissance (kWc)
                        </label>
                        <input
                            type="number"
                            value={params.power || 0}
                            onChange={(e) => handleChange('power', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Production annuelle (kWh)
                        </label>
                        <input
                            type="number"
                            value={params.production || 0}
                            onChange={(e) => handleChange('production', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Production annuelle estimée
                        </label>
                        <div className="bg-teal-50 px-4 py-3 rounded-md">
                            <span className="text-2xl font-bold text-teal-700">
                                {(params.estimatedProduction || 0).toLocaleString()} kWh
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Puissance (kWc) - Slider
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="500"
                            step="1"
                            value={params.power || 0}
                            onChange={handleSliderChange}
                            className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0 kWc</span>
                            <span>{params.power || 0} kWc</span>
                            <span>500 kWc</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Prix d'ACC (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={params.prixAchatACC || 0.85}
                            onChange={(e) => handleChange('prixAchatACC', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Colonne 2 */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tarif TH (€/kWh)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            value={params.tarifTH || 0.12}
                            onChange={(e) => handleChange('tarifTH', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tarif ACC (€/kWh)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            value={params.tarifACC || 0.12}
                            onChange={(e) => handleChange('tarifACC', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            TURPE (€/kWh)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            value={params.turpe || 0.012}
                            onChange={(e) => handleChange('turpe', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
