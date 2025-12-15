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
                            Productible (kWh/kWc)
                        </label>
                        <input
                            type="number"
                            value={params.productible || 1200}
                            onChange={(e) => {
                                const prod = parseFloat(e.target.value) || 0;
                                // update productible, and production annual
                                // assuming I can add 'productible' to params or just calculate production.
                                // I'll use a local handler for this input that updates production.
                                handleChange('production', (params.power || 0) * prod);
                                // Also store productible if needed? Or just derived?
                                // User said "simuacc.fr" -> likely explicit field.
                                // I'll infer it's stored in params.productible if existing, else logic.
                                // I'll update handleChange to updating 'productible' and 'production'.
                                onParamsChange({ ...params, productible: prod, production: (params.power || 0) * prod });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Production annuelle (kWh)
                        </label>
                        <input
                            type="number"
                            value={params.production || 0}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Part d'ACC: {Math.round((params.partACC || 40))}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={params.partACC || 40}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                // Update partACC and derived prixAchatACC (which is usually inverse or related?)
                                // User said "Part d'ACC: 40%". Previous code had "Prix d'ACC" field.
                                // If Part ACC = 40%, then Surplus = 60%.
                                // And "Prix d'ACC" in calculations was used as % of ACC? 
                                // Line 88 of prev file: value={params.prixAchatACC || 0.85}. 
                                // Let's assume params.partACC is the percentage (0-100).
                                // And I should likely update prixAchatACC to val/100.
                                onParamsChange({ ...params, partACC: val, prixAchatACC: val / 100 });
                            }}
                            className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span>{params.partACC || 40}%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                {/* Colonne 2 */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tarif TB (€/kWh)*
                        </label>
                        <input
                            type="number"
                            step="0.0001"
                            value={params.tarifTH || 0.12}
                            onChange={(e) => handleChange('tarifTH', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <p className="text-xs text-blue-500 mt-1 cursor-pointer">*détails tarifs Tb</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tarif ACC (€/kWh)
                        </label>
                        <input
                            type="number"
                            step="0.0001"
                            value={params.tarifACC || 0.12}
                            onChange={(e) => handleChange('tarifACC', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
