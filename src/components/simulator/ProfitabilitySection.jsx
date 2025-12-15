import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function ProfitabilitySection({ metrics, params, onParamsChange }) {
    const { tri = 0, averageDSCR = 0, paybackWithoutACC = 0, paybackWithACC = 0 } = metrics;
    // averageDSCR passed from calculateAllMetrics

    const handleChange = (field, value) => {
        onParamsChange({ ...params, [field]: parseFloat(value) || 0 });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <h2 className="text-xl font-bold text-gray-800">Rentabilité</h2>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                        Taux d'intérêt (%):
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={params.interestRate || 3.0}
                        onChange={(e) => handleChange('interestRate', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        TRI Projet
                    </label>
                    <div className="text-3xl font-bold text-green-700">
                        {tri.toFixed(2)}%
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        DSCR Moyen
                    </label>
                    <div className="text-3xl font-bold text-blue-700">
                        {Math.min(averageDSCR, 9.99).toFixed(2)}
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

                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
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
