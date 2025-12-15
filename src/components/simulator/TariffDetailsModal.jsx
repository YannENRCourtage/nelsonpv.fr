import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export default function TariffDetailsModal({ onClose }) {
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
                    <ul className="space-y-4 text-gray-700">
                        <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            <span>9kWc à 36 kWc : <span className="font-semibold">10.49 c€/kWh</span></span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            <span>36kWc à 100kWc : <span className="font-semibold">9.12 c€/kWh</span></span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            <span>100kWc à 500kWc : <span className="font-semibold">Appel d'offre simplifié</span></span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            <span>{'>'}500kWc : <span className="font-semibold">Appel d'offre CRE</span></span>
                        </li>
                    </ul>
                </div>

                <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-2 rounded-b-lg">
                    <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
}
