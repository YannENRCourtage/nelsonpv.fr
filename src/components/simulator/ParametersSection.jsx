import React, { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Switch } from '@/components/ui/switch';
import TariffDetailsModal from './TariffDetailsModal';

export default function ParametersSection({ params, onParamsChange, onManualTarifChange }) {
    const [showTariffsModal, setShowTariffsModal] = useState(false);
    const [tarifTBText, setTarifTBText] = useState('');

    const handleChange = (field, value) => {
        // Replace both comma and dot with dot for parsing (normalize input)
        // This allows users to type either . or , and it will work
        const normalized = String(value).replace(',', '.');
        onParamsChange({ ...params, [field]: parseFloat(normalized) || 0 });
    };

    const handleSwitchChange = (field, checked) => {
        onParamsChange({ ...params, [field]: checked });
    };

    const handleSliderChange = (e) => {
        handleChange('power', e.target.value);
    };

    // Intercepter le point du pavé numérique et le convertir en virgule
    const handleKeyPress = (e) => {
        // Si c'est un point (.), on empêche l'insertion et on insère une virgule
        if (e.key === '.' || e.key === 'Decimal') {
            e.preventDefault();
            const target = e.target;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const currentValue = target.value;

            // Créer la nouvelle valeur avec une virgule
            const newValue = currentValue.substring(0, start) + ',' + currentValue.substring(end);

            // Mettre à jour manuellement
            target.value = newValue;

            // Repositionner le curseur
            const newPosition = start + 1;
            target.setSelectionRange(newPosition, newPosition);

            // Déclencher manuellement l'événement input pour que React détecte le changement
            const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
            target.dispatchEvent(inputEvent);
        }
    };

    // Handler for Tarif TB free text input
    const handleTarifTBChange = (e) => {
        setTarifTBText(e.target.value);
    };

    const handleTarifTBBlur = () => {
        const normalized = String(tarifTBText).replace(',', '.');
        const numValue = parseFloat(normalized);
        if (!isNaN(numValue)) {
            // Round to 4 decimal places
            const roundedValue = Math.round(numValue * 10000) / 10000;
            onParamsChange({ ...params, tarifTH: roundedValue });
            if (onManualTarifChange) {
                onManualTarifChange();
            }
        }
        // Reset text state to sync with params
        setTarifTBText('');
    };

    const handleTarifTBFocus = () => {
        // Set text value when focusing
        setTarifTBText(String(params.tarifTH || 0.085));
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
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
                {/* Row 1 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Puissance (kWc)
                    </label>
                    <input
                        type="number"
                        name="power"
                        value={params.power || 0}
                        onChange={(e) => handleChange('power', e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Productible (kWh/kWc)
                    </label>
                    <input
                        type="number"
                        name="productible"
                        value={params.productible || 1200}
                        onChange={(e) => {
                            const normalized = String(e.target.value).replace(',', '.');
                            const prod = parseFloat(normalized) || 0;
                            const power = params.power || 0;
                            // Update both productible and calculated production
                            onParamsChange({
                                ...params,
                                productible: prod,
                                production: power * prod
                            });
                        }}
                        onKeyPress={handleKeyPress}
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
                        Tarif TB (€/kWh)
                    </label>
                    <input
                        type="text"
                        name="tarifTH"
                        value={tarifTBText || params.tarifTH || 0.085}
                        onChange={handleTarifTBChange}
                        onFocus={handleTarifTBFocus}
                        onBlur={handleTarifTBBlur}
                        onKeyPress={handleKeyPress}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tarif ACC (€/kWh)
                    </label>
                    <input
                        type="number"
                        name="tarifACC"
                        step="0.005"
                        value={params.tarifACC || 0.12}
                        onChange={(e) => handleChange('tarifACC', e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>

                {/* Row 4: Part ACC and Prime */}
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Part d'ACC
                            </label>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    name="partACC"
                                    min="0"
                                    max="100"
                                    value={params.partACC || 0}
                                    onChange={(e) => {
                                        let val = parseFloat(e.target.value);
                                        if (isNaN(val)) val = 0;
                                        if (val > 100) val = 100;
                                        if (val < 0) val = 0;
                                        onParamsChange({ ...params, partACC: val, prixAchatACC: val / 100 });
                                    }}
                                    onKeyPress={handleKeyPress}
                                    className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent mr-1"
                                />
                                <span className="text-sm text-gray-600">%</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={params.partACC || 0}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onParamsChange({ ...params, partACC: val, prixAchatACC: val / 100 });
                            }}
                            className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span>{Math.round(params.partACC || 0)}%</span>
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
                            disabled={params.power > 99.9}
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
