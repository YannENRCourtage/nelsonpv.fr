import React, { useState, useEffect } from 'react';
import { Euro, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import DefaultCostsModal from './DefaultCostsModal';

const CostInput = ({ value, onChange, unit }) => {
    const [localValue, setLocalValue] = useState(value || 0);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        // Update local value if external value changes
        // Only if NOT focused, OR if the numeric value is different (external update)
        const currentParsed = parseFloat(String(localValue).replace(',', '.'));

        // Si on est focus, on ne veut SURTOUT PAS que "1500.0" soit écrasé par "1500"
        if (isFocused) {
            // On accepte l'update externe SEULEMENT si la valeur change vraiment (ex: calcul auto)
            // Si c'est juste un re-render avec la même valeur (1500 vs 1500), on ne touche pas à localValue
            if (currentParsed !== value) {
                // C'est un vrai changement externe (ex: 1500 -> 50000)
                // On doit mettre à jour, tant pis pour le curseur (cas rare pendant la saisie)
                setLocalValue(value);
            }
        } else {
            // Pas focus, on synchronise toujours pour être propre
            if (currentParsed !== value) {
                setLocalValue(value);
            }
        }
    }, [value, isFocused]);

    const handleChange = (e) => {
        let val = e.target.value;
        // Allow numbers, comma, dot. Remove other chars.
        val = val.replace(/[^0-9.,]/g, '');

        // Only one dot or comma
        const parts = val.split(/[.,]/);
        if (parts.length > 2) return; // More than one separator

        setLocalValue(val);

        // Notify parent only if valuable number
        const normalized = val.replace(',', '.');
        const parsed = parseFloat(normalized);

        // If it ends with separator, don't update parent yet
        if (!isNaN(parsed) && !val.endsWith('.') && !val.endsWith(',')) {
            // IMPORTANT: Ne notifier que si la valeur numérique CHANGE.
            // Si on tape "1500.0", parsed = 1500. Si value = 1500, on ne fait rien.
            // Cela empêche le parent de renvoyer "1500" et de déclencher le useEffect qui pourrait (s'il était mal codé) écraser "1500.0"
            if (parsed !== value) {
                onChange(parsed);
            }
        } else if (val === '') {
            onChange(0);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        // On blur, force formatting to parent's value to clean up "10." -> "10"
        setLocalValue(value);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === '.' || e.key === 'Decimal') {
            e.preventDefault();
            const target = e.target;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const oldVal = target.value;
            const newVal = oldVal.substring(0, start) + ',' + oldVal.substring(end);

            // Trigger change manually
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(target, newVal);
            const ev = new Event('input', { bubbles: true });
            target.dispatchEvent(ev);
        }
    };

    return (
        <div className="relative rounded-md shadow-sm">
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                className="block w-full pl-3 pr-8 h-[45px] py-0 text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent flex items-center"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-xs">
                    {unit === '€' ? '€' : (unit === '€/kWc/an' ? '' : '€')}
                </span>
            </div>
        </div>
    );
};

export default function ProjectCostsSection({ costs, onCostsChange, totalCost, isAcama = false, onAutoCalculateResteACharge }) {
    const [showDefaultCostsModal, setShowDefaultCostsModal] = useState(false);

    // Order matching simuacc.fr (Image 5)
    let costFields = [
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

    if (isAcama) {
        costFields = [
            { key: 'installation', label: 'Installation', unit: '€' },
            { key: 'charpente', label: 'Charpente', unit: '€' },
            { key: 'agregateur', label: 'Agrégateur', unit: '€' },
            { key: 'resteACharge', label: 'Reste à Charge', unit: '€', hasAutoButton: true },
            { key: 'raccordement', label: 'Raccordement', unit: '€' },
            { key: 'developpement', label: 'Développement', unit: '€' },
            { key: 'fraisCommerciaux', label: 'Frais Commerciaux', unit: '€' },
            { key: 'soulte', label: 'Soulte', unit: '€' },
            { key: 'maintenance', label: 'Maintenance', unit: '€/kWc/an' }
        ];
    }

    const optionFields = [
        { key: 'bardage', label: 'Bardage', unit: '€' },
        { key: 'cheneaux', label: 'Chéneaux Et Descente', unit: '€' },
        { key: 'batterie', label: 'Batterie', unit: '€' }
    ];

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

            <div className="flex-grow space-y-4">
                {/* Main Costs Grid: 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
                    {costFields.map((field) => (
                        <div key={field.key}>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-gray-500">
                                    {field.label}
                                </label>
                                {field.hasAutoButton && (
                                    <button
                                        className="text-[10px] bg-teal-100 text-teal-700 hover:bg-teal-200 px-1.5 py-0.5 rounded transition-colors"
                                        onClick={() => onAutoCalculateResteACharge()}
                                    >
                                        Auto
                                    </button>
                                )}
                            </div>
                            <CostInput
                                value={costs[field.key] || 0}
                                onChange={(val) => onCostsChange({ ...costs, [field.key]: val })}
                                unit={field.unit}
                            />
                            {field.key === 'soulte' && (
                                <p className="text-xs text-gray-500 mt-1">
                                    (rente annuelle sur 20 ans = soulte/16 soit {
                                        ((costs['soulte'] || 0) / 16).toLocaleString('fr-FR', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2
                                        })
                                    } €)
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-100 pt-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
                        {optionFields.map((field) => (
                            <div key={field.key}>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {field.label}
                                </label>
                                <CostInput
                                    value={costs[field.key] || 0}
                                    onChange={(val) => onCostsChange({ ...costs, [field.key]: val })}
                                    unit={field.unit}
                                />
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
