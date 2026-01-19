import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { listSimulations, deleteSimulation } from '../services/firebase/simulations.service.js';
import { toast } from "@/components/ui/use-toast.js";

export default function Finance() {
    const [simulations, setSimulations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSimulations();
    }, []);

    const loadSimulations = async () => {
        try {
            setIsLoading(true);
            const data = await listSimulations();
            setSimulations(data);
        } catch (error) {
            console.error('Erreur chargement simulations:', error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les simulations.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (simulationId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette simulation ?')) {
            return;
        }

        try {
            await deleteSimulation(simulationId);
            toast({
                title: "Simulation supprimée",
                description: "La simulation a été supprimée avec succès.",
                className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg"
            });
            loadSimulations(); // Recharger la liste
        } catch (error) {
            console.error('Erreur suppression simulation:', error);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer la simulation.",
                variant: "destructive"
            });
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const formatPercent = (value) => {
        return `${(value || 0).toFixed(2)} %`;
    };

    const formatYears = (value) => {
        return `${(value || 0).toFixed(1)} ans`;
    };

    const formatNumber = (value, decimals = 0) => {
        return (value || 0).toFixed(decimals);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-teal-700" />
                        <div>
                            <h1 className="text-3xl font-bold text-teal-700">
                                Finance - Simulations Sauvegardées {simulations.length > 0 && `(${simulations.length})`}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Historique des simulations financières rattachées aux projets
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tableau des simulations */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            Chargement des simulations...
                        </div>
                    ) : simulations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">Aucune simulation sauvegardée</p>
                            <p className="text-sm mt-2">
                                Les simulations créées depuis le Simulateur apparaîtront ici
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-teal-700 text-white">
                                    <tr>
                                        <th className="px-3 py-4 text-left text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Projet</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Puissance</div>
                                            <div className="text-xs font-normal opacity-90">(kWc)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Productible</div>
                                            <div className="text-xs font-normal opacity-90">(kWh/kWc)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Tarif TB</div>
                                            <div className="text-xs font-normal opacity-90">(€/kWh)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Tarif ACC</div>
                                            <div className="text-xs font-normal opacity-90">(€/kWh)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Part d'ACC</div>
                                            <div className="text-xs font-normal opacity-90">(%)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Coût total</div>
                                            <div className="text-xs font-normal opacity-90">du projet</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">TRI</div>
                                            <div className="text-xs font-normal opacity-90">Projet</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">DSCR</div>
                                            <div className="text-xs font-normal opacity-90">Moyen</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">ROI</div>
                                            <div className="text-xs font-normal opacity-90">Sans ACC</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">ROI</div>
                                            <div className="text-xs font-normal opacity-90">Avec ACC</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold">
                                            <div className="leading-tight">Actions</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {simulations.map((sim) => (
                                        <tr key={sim.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200">
                                                <Link
                                                    to={`/project/${sim.projectId}/edit`}
                                                    className="font-medium text-teal-600 hover:text-teal-800 hover:underline"
                                                >
                                                    {sim.projectName}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.power, 0)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.productible, 0)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.tarifTB, 4)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.tarifACC, 4)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.partACC, 0)} %
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200 font-medium">
                                                {formatCurrency(sim.totalCost)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200 font-medium">
                                                {formatPercent(sim.tri)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.averageDSCR, 2)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatYears(sim.paybackWithoutACC)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatYears(sim.paybackWithACC)}
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(sim.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Statistiques */}
                {simulations.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">
                            Statistiques
                        </h2>
                        <p className="text-gray-600">
                            Total de simulations : <span className="font-bold text-teal-700">{simulations.length}</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
