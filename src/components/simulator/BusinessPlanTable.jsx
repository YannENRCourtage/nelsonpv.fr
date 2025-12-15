import React from 'react';
import { Table } from 'lucide-react';

export default function BusinessPlanTable({ businessPlan }) {
    if (!businessPlan || businessPlan.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-500">Aucune donnée de business plan disponible</p>
            </div>
        );
    }

    const formatCurrency = (value) => {
        // Handle undefined or null safely
        if (value === undefined || value === null || isNaN(value)) return '0';
        return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    // Check if Prime is active (if > 0 in any year, or just first year)
    // Actually primeAutoconso in businessPlan logic is populated if active.
    // If it's 0 everywhere, we hide the row.
    const hasPrime = businessPlan.some(year => year.primeAutoconso > 0);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
                <Table className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-800">Business Plan (20 ans)</h2>
            </div>

            <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold sticky left-0 bg-gray-100 z-10">Année</th>
                            {businessPlan.map((year) => (
                                <th key={year.annee} className="text-center p-2 font-semibold min-w-[80px]">
                                    &nbsp;&nbsp;{year.annee}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Chiffre d'affaires */}
                        <tr className="bg-blue-50 border-b border-gray-200">
                            <td colSpan={businessPlan.length + 1} className="p-2 font-bold text-blue-900">
                                Chiffre d'affaires
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Vente ACC</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-blue-700">
                                    {formatCurrency(year.venteACC)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Vente Surplus (Tb)</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-blue-700">
                                    {formatCurrency(year.venteSurplus)}
                                </td>
                            ))}
                        </tr>
                        {hasPrime && (
                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-2 sticky left-0 bg-white">Prime à l'autoconsommation</td>
                                {businessPlan.map((year) => (
                                    <td key={year.annee} className="text-right p-2 text-blue-700">
                                        {formatCurrency(year.primeAutoconso)}
                                    </td>
                                ))}
                            </tr>
                        )}
                        <tr className="bg-blue-100 border-b-2 border-blue-300 font-semibold">
                            <td className="p-2 sticky left-0 bg-blue-100">Total CA</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-blue-900">
                                    {formatCurrency(year.totalCA)}
                                </td>
                            ))}
                        </tr>

                        {/* Charges d'exploitation */}
                        <tr className="bg-red-50 border-b border-gray-200">
                            <td colSpan={businessPlan.length + 1} className="p-2 font-bold text-red-900">
                                Charges d'exploitation
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Maintenance</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-red-700">
                                    {formatCurrency(year.maintenance)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Rachat Bail Toit</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-red-700">
                                    {formatCurrency(year.rachatBailToit)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Assurance</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-red-700">
                                    {formatCurrency(year.assurance)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">IFER</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-red-700">
                                    {formatCurrency(year.ifer)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Divers</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-red-700">
                                    {formatCurrency(year.divers)}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-red-100 border-b-2 border-red-300 font-semibold">
                            <td className="p-2 sticky left-0 bg-red-100">Total Charges</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-red-900">
                                    {formatCurrency(year.totalCharges)}
                                </td>
                            ))}
                        </tr>

                        {/* Résultats */}
                        <tr className="bg-green-100 border-b-2 border-green-300 font-semibold">
                            <td className="p-2 sticky left-0 bg-green-100">Excédent Brut d'Exploitation (EBE)</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-green-900">
                                    {formatCurrency(year.ebe)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Amortissement & Provisions</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2">
                                    {formatCurrency(year.amortissement)}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-yellow-100 border-b-2 border-yellow-300 font-semibold">
                            <td className="p-2 sticky left-0 bg-yellow-100">Résultat d'exploitation (RBT)</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-yellow-900">
                                    {formatCurrency(year.rbt)}
                                </td>
                            ))}
                        </tr>

                        {/* Financement */}
                        <tr className="bg-purple-50 border-b border-gray-200">
                            <td colSpan={businessPlan.length + 1} className="p-2 font-bold text-purple-900">
                                Financement
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Intérêts</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-purple-700">
                                    {formatCurrency(year.interets)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Rembt Capital</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-purple-700">
                                    {formatCurrency(year.rembtCapital)}
                                </td>
                            ))}
                        </tr>

                        {/* Résultat final */}
                        <tr className="bg-indigo-100 border-b-2 border-indigo-300 font-semibold">
                            <td className="p-2 sticky left-0 bg-indigo-100">Résultat avant impôts (RAI)</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-indigo-900">
                                    {formatCurrency(year.rai)}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 sticky left-0 bg-white">Impôt sur les sociétés</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2">
                                    {formatCurrency(year.impot)}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-green-200 border-b-2 border-green-400 font-bold">
                            <td className="p-2 sticky left-0 bg-green-200">Résultat Net</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-green-900">
                                    {formatCurrency(year.resultatNet)}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-gray-100 border-b-2 border-gray-300 font-semibold">
                            <td className="p-2 sticky left-0 bg-gray-100">Conversion de la dette (DACH)</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-gray-700">
                                    {formatCurrency(year.dach)}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-white border-t-2 border-gray-300 font-bold">
                            <td className="p-2 sticky left-0 bg-white">DSCR</td>
                            {businessPlan.map((year) => (
                                <td key={year.annee} className="text-right p-2 text-gray-800">
                                    {year.dscr.toFixed(2)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="text-sm text-gray-500 italic mt-4 text-center">
                Hypothèses : Inflation maintenance: 1%/an. Inflation CA Tb: 1%/an. Inflation CA ACC: 2%/an. Inflation Assurance: 2%/an. Inflation Divers: 2%/an. Inflation IFER: 1%/an.
            </div>
        </div>
    );
}
