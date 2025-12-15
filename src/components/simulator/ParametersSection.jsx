import React, { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Switch } from '@/components/ui/switch';
import TariffDetailsModal from './TariffDetailsModal';

export default function ParametersSection({ params, onParamsChange }) {
    const [showTariffsModal, setShowTariffsModal] = useState(false);

    const handleChange = (field, value) => {
        onParamsChange({ ...params, [field]: parseFloat(value) || 0 });
    };

    const handleSwitchChange = (field, checked) => {
        onParamsChange({ ...params, [field]: checked });
    };

    const handleSliderChange = (e) => {
        handleChange('power', e.target.value);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-teal-600" />
                    <h2 className="text-xl font-bold text-gray-800">Paramètres</h2>
                </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Grid Layout:
                    Row 1: Puissance costCol1 | Tarif TB costCol2
                    Row 2: Production Annuelle Banner (Col span 2)
                    Row 3: Productible costCol1 | Tarif ACC costCol2
                    Row 4: Prime (Col span 2 or separate)
                */}

                {/* Row 1 */}
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
                        Tarif TB (€/kWh)
                    </label>
                    <input
                        type="number"
                        step="0.005"
                        value={params.tarifTH || 0.12}
                        onChange={(e) => handleChange('tarifTH', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>

                {/* Row 2: Production Annuelle Banner */}
                <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                    <span className="font-semibold text-blue-900">Production annuelle :</span>
                    <span className="text-xl font-bold text-blue-700">
                        {Math.round(params.production || 0).toLocaleString('fr-FR')} <span className="text-sm font-normal">kWh</span>
                    </span>
                </div>

                {/* Row 3 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Productible (kWh/kWc)
                    </label>
                    <input
                        type="number"
                        value={params.productible || 1200}
                        onChange={(e) => {
                            const prod = parseFloat(e.target.value) || 0;
                            // Calculate production immediately
                            onParamsChange({ ...params, productible: prod, production: (params.power || 0) * prod });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tarif ACC (€/kWh)
                    </label>
                    <input
                        type="number"
                        step="0.005"
                        value={params.tarifACC || 0.12}
                        onChange={(e) => handleChange('tarifACC', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>

                {/* Row 4: Part ACC and Prime */}
                {/* Part ACC - Full width or half? Previous layout had partial cols. 
                    Let's keep Part ACC in a column if possible or full width. 
                    Given the request "Zone Paramètres... Production annuelle ... entre les lignes ...", 
                    Part ACC wasn't explicitly mentioned to move, but I need to fit it.
                    I'll put Part ACC below Tariff ACC or in a new row.
                    I'll make a new row for Part ACC and Prime.
                 */}
                <div className="md:col-span-2 space-y-4">
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

                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <label className="text-sm font-bold text-gray-700">
                            Prime à l'autoconsommation
                        </label>
                        <Switch
                            checked={params.withPrime !== false}
                            onCheckedChange={(checked) => handleSwitchChange('withPrime', checked)}
                            disabled={params.power > 100}
                            className={`data-[state=checked]:bg-orange-500`}
                        />
                    </div>
                </div>
            </div>

            {
                showTariffsModal && (
                    <TariffDetailsModal onClose={() => setShowTariffsModal(false)} />
                )
            }
        </div >
    );
}
