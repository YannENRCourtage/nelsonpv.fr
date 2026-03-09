import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, Edit, Search, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { listSimulations, deleteSimulation, updateSimulation } from '../services/firebase/simulations.service.js';
import { toast } from "@/components/ui/use-toast.js";
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

export default function Finance() {
    const navigate = useNavigate();
    const { activeTenantId } = useAuth();
    const isAcama = activeTenantId === 'acama';
    const [simulations, setSimulations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);

    useEffect(() => {
        loadSimulations();
    }, [activeTenantId]);

    const loadSimulations = async () => {
        try {
            setIsLoading(true);
            const data = await listSimulations(activeTenantId);
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

    const handleEdit = (simulation) => {
        // Préparer les données pour le simulateur
        const simulatorData = {
            id: simulation.id,
            projectId: simulation.projectId,
            projectName: simulation.projectName,
            params: {
                power: simulation.power || 120,
                productible: simulation.productible || 1200,
                production: (simulation.power || 120) * (simulation.productible || 1200),
                estimatedProduction: simulation.estimatedProduction || ((simulation.power || 120) * 1.2 * (simulation.productible || 1200)),
                tarifTH: simulation.tarifTB || 0.09,
                tarifACC: simulation.tarifACC || 0.14,
                turpe: simulation.turpe || 0.012,
                prixAchatACC: simulation.prixAchatACC !== undefined ? simulation.prixAchatACC : 0.40,
                partACC: simulation.partACC || 40,
                interestRate: simulation.interestRate !== undefined ? simulation.interestRate : 3.9
            },
            costs: {
                installationRate: simulation.installationRate !== undefined ? simulation.installationRate : 0.50,
                installation: simulation.installation || 0,
                charpente: simulation.charpente || 0,
                couverture: isAcama ? 0 : (simulation.couverture || 0),
                agregateur: isAcama ? (simulation.agregateur || 0) : 0,
                fondations: isAcama ? 0 : (simulation.fondations || 0),
                resteACharge: isAcama ? (simulation.resteACharge || 0) : 0,
                raccordement: simulation.raccordement || 0,
                developpement: simulation.developpement || 0,
                fraisCommerciaux: simulation.fraisCommerciaux || ((simulation.power || 120) * 50),
                soulte: simulation.soulte || 0,
                maintenance: simulation.maintenance || 10,
                bardage: simulation.bardage || 0,
                cheneaux: simulation.cheneaux || 0,
                batterie: simulation.batterie || 0
            }
        };

        // Naviguer vers le simulateur avec les données
        navigate('/simulator', { state: { simulationData: simulatorData } });
    };

    const handleCommentChange = (id, value) => {
        setSimulations(prev => prev.map(sim =>
            sim.id === id ? { ...sim, comments: value } : sim
        ));
    };

    const handleCommentBlur = async (id, value) => {
        try {
            await updateSimulation(id, { comments: value });
        } catch (error) {
            console.error("Erreur update commentaire", error);
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

    const handleExport = () => {
        if (selectedRows.length === 0) {
            toast({
                title: "Aucune sélection",
                description: "Veuillez sélectionner au moins une ligne à exporter.",
                variant: "destructive"
            });
            return;
        }

        // Préparer les données pour l'export
        const dataToExport = selectedRows.map(sim => {
            const rowData = {
                'Projet': sim.projectName,
                'Commentaires': sim.comments || '',
                'Puissance (kWc)': sim.power || 0,
                'Productible (kWh/kWc)': sim.productible || 0,
                'Tarif TB (€/kWh)': sim.tarifTB || 0,
                'Tarif ACC (€/kWh)': sim.tarifACC || 0,
                'Part d\'ACC (%)': sim.partACC || 0,
                'Installation (€)': sim.installation || 0,
                'Charpente (€)': sim.charpente || 0
            };

            if (isAcama) {
                rowData['Agrégateur (€)'] = sim.agregateur || 0;
                rowData['Reste à Charge (€)'] = sim.resteACharge || 0;
            } else {
                rowData['Couverture (€)'] = sim.couverture || 0;
                rowData['Fondations (€)'] = sim.fondations || 0;
            }

            rowData['Raccordement (€)'] = sim.raccordement || 0;
            rowData['Développement (€)'] = sim.developpement || 0;
            rowData['Coût total (€)'] = sim.totalCost || 0;
            rowData['TRI (%)'] = sim.tri || 0;
            rowData['DSCR Moyen'] = sim.averageDSCR || 0;
            rowData['ROI Sans ACC (ans)'] = sim.paybackWithoutACC || 0;
            rowData['ROI Avec ACC (ans)'] = sim.paybackWithACC || 0;

            return rowData;
        });

        // Créer le fichier Excel
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Simulations");

        // Télécharger le fichier
        const fileName = `simulations_finance_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        toast({
            title: "Export réussi",
            description: `${selectedRows.length} simulation(s) exportée(s) avec succès.`,
            className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg"
        });
    };

    const toggleRowSelection = (sim) => {
        setSelectedRows(prev => {
            const isSelected = prev.some(s => s.id === sim.id);
            if (isSelected) {
                return prev.filter(s => s.id !== sim.id);
            } else {
                return [...prev, sim];
            }
        });
    };

    const toggleAllRows = () => {
        if (selectedRows.length === filteredSimulations.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows([...filteredSimulations]);
        }
    };

    // Filtrer les simulations en fonction du terme de recherche
    const filteredSimulations = simulations.filter(sim =>
        sim.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

                {/* Barre de recherche et bouton Exporter */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher un projet..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={handleExport}
                            disabled={selectedRows.length === 0}
                            className="bg-teal-700 hover:bg-teal-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exporter ({selectedRows.length})
                        </Button>
                    </div>
                    {searchTerm && (
                        <p className="mt-2 text-sm text-gray-600">
                            {filteredSimulations.length} résultat{filteredSimulations.length > 1 ? 's' : ''} trouvé{filteredSimulations.length > 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Tableau des simulations */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            Chargement des simulations...
                        </div>
                    ) : filteredSimulations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">
                                {searchTerm ? 'Aucun projet trouvé' : 'Aucune simulation sauvegardée'}
                            </p>
                            <p className="text-sm mt-2">
                                {searchTerm
                                    ? 'Essayez de modifier votre recherche'
                                    : 'Les simulations créées depuis le Simulateur apparaîtront ici'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-teal-700 text-white">
                                    <tr>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.length === filteredSimulations.length && filteredSimulations.length > 0}
                                                onChange={toggleAllRows}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-3 py-4 text-left text-sm font-semibold border-r border-teal-600 w-48">
                                            <div className="leading-tight">Projet</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600 w-64">
                                            <div className="leading-tight">Commentaires</div>
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
                                        <th className="px-1 py-4 text-center text-xs font-semibold border-r border-teal-600 w-20">
                                            <div className="leading-tight">Part d'ACC</div>
                                            <div className="text-xs font-normal opacity-90">(%)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Installation</div>
                                            <div className="text-xs font-normal opacity-90">(€)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Charpente</div>
                                            <div className="text-xs font-normal opacity-90">(€)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">{isAcama ? 'Agrégateur' : 'Couverture'}</div>
                                            <div className="text-xs font-normal opacity-90">(€)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">{isAcama ? 'Reste à Charge' : 'Fondations'}</div>
                                            <div className="text-xs font-normal opacity-90">(€)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Raccordement</div>
                                            <div className="text-xs font-normal opacity-90">(€)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Dév.</div>
                                            <div className="text-xs font-normal opacity-90">(€)</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">Coût total</div>
                                            <div className="text-xs font-normal opacity-90">du projet</div>
                                        </th>
                                        <th className="px-1 py-4 text-center text-xs font-semibold border-r border-teal-600 w-16">
                                            <div className="leading-tight">TRI</div>
                                            <div className="text-xs font-normal opacity-90">Projet</div>
                                        </th>
                                        <th className="px-3 py-4 text-center text-sm font-semibold border-r border-teal-600">
                                            <div className="leading-tight">DSCR</div>
                                            <div className="text-xs font-normal opacity-90">Moyen</div>
                                        </th>
                                        <th className="px-1 py-4 text-center text-xs font-semibold border-r border-teal-600 w-24">
                                            <div className="leading-tight">ROI</div>
                                            <div className="text-xs font-normal opacity-90">Sans ACC</div>
                                        </th>
                                        <th className="px-1 py-4 text-center text-xs font-semibold border-r border-teal-600 w-24">
                                            <div className="leading-tight">ROI</div>
                                            <div className="text-xs font-normal opacity-90">Avec ACC</div>
                                        </th>
                                        <th className="px-1 py-4 text-center text-sm font-semibold w-24">
                                            <div className="leading-tight">Actions</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredSimulations.map((sim) => (
                                        <tr key={sim.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-4 text-center border-r border-gray-200">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.some(s => s.id === sim.id)}
                                                    onChange={() => toggleRowSelection(sim)}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 border-r border-gray-200">
                                                <Link
                                                    to={`/project/${sim.projectId}/edit`}
                                                    className="font-medium text-teal-600 hover:text-teal-800 hover:underline"
                                                >
                                                    {sim.projectName}
                                                </Link>
                                            </td>
                                            <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-200">
                                                <textarea
                                                    className="w-full text-xs border border-gray-200 rounded p-1 focus:border-teal-500 focus:outline-none bg-transparent min-h-[50px] resize-y"
                                                    value={sim.comments || ''}
                                                    placeholder="..."
                                                    onChange={(e) => handleCommentChange(sim.id, e.target.value)}
                                                    onBlur={(e) => handleCommentBlur(sim.id, sim.comments)}
                                                    rows={2}
                                                />
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
                                            <td className="px-1 py-4 text-xs text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.partACC, 0)} %
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatCurrency(sim.installation)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatCurrency(sim.charpente)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatCurrency(isAcama ? sim.agregateur : sim.couverture)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatCurrency(isAcama ? sim.resteACharge : sim.fondations)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatCurrency(sim.raccordement)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatCurrency(sim.developpement)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200 font-medium">
                                                {formatCurrency(sim.totalCost)}
                                            </td>
                                            <td className="px-1 py-4 text-xs text-gray-900 text-center border-r border-gray-200 font-medium">
                                                {formatPercent(sim.tri)}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 text-center border-r border-gray-200">
                                                {formatNumber(sim.averageDSCR, 2)}
                                            </td>
                                            <td className="px-1 py-4 text-xs text-gray-900 text-center border-r border-gray-200">
                                                {formatYears(sim.paybackWithoutACC)}
                                            </td>
                                            <td className="px-1 py-4 text-xs text-gray-900 text-center border-r border-gray-200">
                                                {formatYears(sim.paybackWithACC)}
                                            </td>
                                            <td className="px-1 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(sim)}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 w-8 h-8"
                                                        title="Modifier"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(sim.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-8 h-8"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
