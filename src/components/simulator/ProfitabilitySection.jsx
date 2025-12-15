import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function ProfitabilitySection({ metrics }) {
    const { tri = 0, drci = 0, paybackWithoutACC = 0, paybackWithACC = 0 } = metrics;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">Rentabilité</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Taux d'intérêt (%)
                    </label>
                    <div className="text-3xl font-bold text-green-700">3.0</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        TRI moyen
                    </label>
                    <div className="text-3xl font-bold text-green-700">
                        {tri.toFixed(2)}%
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        DRCI Moyen
                    </label>
                    <div className="text-3xl font-bold text-blue-700">
                        {drci.toFixed(2)}
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Retour sur investissement (sans ACC)
                    </label>
                    <div className="text-3xl font-bold text-purple-700">
                        {paybackWithoutACC.toFixed(1)} ans
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Retour sur investissement (avec ACC)
                    </label>
                    <div className="text-3xl font-bold text-indigo-700">
                        {paybackWithACC.toFixed(1)} ans
                    </div>
                </div>
            </div>
        </div>
    );
}
