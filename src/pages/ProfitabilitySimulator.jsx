import React, { useState, useEffect } from 'react';
import { FileDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useLocation } from 'react-router-dom';
import { safeLocalStorage } from '../lib/storage.js';
import ParametersSection from '../components/simulator/ParametersSection';
import ProjectCostsSection from '../components/simulator/ProjectCostsSection';
import ProfitabilitySection from '../components/simulator/ProfitabilitySection';
import CumulativeGainsChart from '../components/simulator/CumulativeGainsChart';
import BusinessPlanTable from '../components/simulator/BusinessPlanTable';
import { calculateAllMetrics, calculateEstimatedProduction, calculateRequiredResteACharge } from '../lib/profitabilityCalculations';
import { generateSimulatorPDF } from '../components/simulator/SimulatorPDFGenerator';
import SaveSimulationModal from '../components/simulator/SaveSimulationModal';
import { createSimulation, updateSimulation } from '../services/firebase/simulations.service.js';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast.js";



const DEFAULT_PARAMS = {
    power: 120,
    production: 120000,
    estimatedProduction: 144000,
    tarifTH: 0.085,
    tarifACC: 0.14,
    turpe: 0.012,
    prixAchatACC: 0.40, // Part ACC 40%
    partACC: 40,        // Default Part ACC
    interestRate: 3.9
};

const DEFAULT_COSTS = {
    installationRate: 0.50, // 0.50 €/Wc (500 €/kWc)
    installation: 0, // Calculated
    charpente: 30000,
    couverture: 15000,
    fondations: 15000,
    agregateur: 0,
    resteACharge: 0,
    raccordement: 15000,
    developpement: 5000,
    fraisCommerciaux: 0, // Calculated
    soulte: 0,
    maintenance: 10,
    bardage: 0,
    cheneaux: 0,
    batterie: 0
};

export default function ProfitabilitySimulator() {
    const { user, activeTenantId } = useAuth();
    const location = useLocation();
    const isAcama = activeTenantId === 'acama';

    // Set initial params based on tenant
    const initialParams = isAcama ? {
        ...DEFAULT_PARAMS,
        partACC: 0,
        prixAchatACC: 0
    } : DEFAULT_PARAMS;

    // Set initial costs based on tenant
    const initialCosts = isAcama ? {
        ...DEFAULT_COSTS,
        couverture: 0,
        fondations: 0,
        agregateur: 2500,
        resteACharge: 0
    } : DEFAULT_COSTS;

    const [params, setParams] = useState(initialParams);
    const [costs, setCosts] = useState(initialCosts);
    const [metrics, setMetrics] = useState({
        totalCost: 0,
        businessPlan: [],
        cumulativeGains: [],
        tri: 0,
        drci: 0,
        paybackWithoutACC: 0,
        paybackWithACC: 0,
        averageDSCR: 0
    });
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [editingSimulation, setEditingSimulation] = useState(null);
    const [manualTarifOverride, setManualTarifOverride] = useState(false);

    // Charger les données de simulation si passées via navigation (depuis Finance)
    useEffect(() => {
        if (location.state?.simulationData) {
            const { params: simParams, costs: simCosts, id, projectId, projectName } = location.state.simulationData;
            setParams(simParams);
            setCosts(simCosts);
            if (id) {
                setEditingSimulation({ id, projectId, projectName });
            }

            // Nettoyer l'état de navigation pour éviter de recharger au refresh
            window.history.replaceState({}, document.title);

            toast({
                title: "Simulation chargée",
                description: "Les données de la simulation ont été chargées avec succès.",
                className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg"
            });
        }
    }, [location]);

    // Load saved defaults
    useEffect(() => {
        try {
            const savedCosts = safeLocalStorage.getItem('simulator_default_costs_v4');
            if (savedCosts && !isAcama) {
                // Merge saved defaults with structure to ensure installationRate exists
                const parsed = JSON.parse(savedCosts);
                setCosts(prev => ({ ...prev, ...parsed }));
            }
        } catch (e) {
            console.error('Error loading saved costs:', e);
        }
    }, [isAcama]);

    // Recalculate metrics
    useEffect(() => {
        const calculated = calculateAllMetrics(params, costs);
        setMetrics(calculated);
    }, [params, costs]);

    // Handler for automatic constraint solver (ACAMA only)
    const handleAutoCalculateResteACharge = () => {
        const optimalReste = calculateRequiredResteACharge(params, costs);
        setCosts(prev => ({ ...prev, resteACharge: optimalReste }));
    };

    // Auto-Logic: Costs, Production, Tariffs, Prime
    useEffect(() => {
        const power = params.power || 0;
        const productible = params.productible || 1200;
        const newProduction = power * productible;

        // 1. Update Production if needed
        if (params.production !== newProduction) {
            setParams(prev => ({ ...prev, production: newProduction }));
        }

        // 2. Cost calculations
        // Installation = Power * Rate * 1000 (if Rate is €/Wc)
        // User said Rate 0.50 c€/kWc ??? No, user said 0.50 (c€/kWc).
        // But user check: 99kWc -> 49500€. 99 * 500 = 49500.
        // So 0.50 * 1000 = 500.
        // Rate is indeed 0.50.
        const rate = costs.installationRate !== undefined ? costs.installationRate : 0.50;
        const newInstallation = isAcama ? power * 0.50 * 1000 : power * rate * 1000;
        const newFraisCommerciaux = power * (isAcama ? 30 : 50);

        setCosts(prev => {
            let updated = { ...prev };
            let changed = false;

            if (Math.abs(prev.installation - newInstallation) > 0.01) {
                updated.installation = newInstallation;
                changed = true;
            }
            if (Math.abs(prev.fraisCommerciaux - newFraisCommerciaux) > 0.01) {
                updated.fraisCommerciaux = newFraisCommerciaux;
                changed = true;
            }
            return changed ? updated : prev;
        });

        // 3. Prime Logic
        // Disable Prime if Power > 99.9 (User said "superieur à 99.9")
        // Checkbox: withPrime
        let newWithPrime = params.withPrime;
        if (power > 99.9 && newWithPrime !== false) {
            newWithPrime = false;
        }

        // Apply Params changes (only for Prime)
        if (newWithPrime !== params.withPrime) {
            setParams(prev => ({
                ...prev,
                withPrime: newWithPrime
            }));
        }

    }, [params.power, params.productible, params.production, params.withPrime, costs.installationRate, isAcama]);

    // Auto-calculate Reste à charge on parameter/cost changes (except resteACharge itself)
    useEffect(() => {
        if (!isAcama) return;

        const optimalReste = calculateRequiredResteACharge(params, costs);

        if (optimalReste !== costs.resteACharge) {
            setCosts(prev => ({ ...prev, resteACharge: optimalReste }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isAcama,
        params,
        costs.installationRate,
        costs.installation,
        costs.charpente,
        costs.agregateur,
        costs.raccordement,
        costs.developpement,
        costs.fraisCommerciaux,
        costs.soulte,
        costs.maintenance,
        costs.bardage,
        costs.cheneaux,
        costs.batterie
    ]);

    const handleGeneratePDF = () => {
        generateSimulatorPDF({
            elementId: 'profitability-simulator-content',
            fileName: `Simulateur_Rentabilite_${new Date().toISOString().split('T')[0]}.pdf`
        });
    };

    const handleSaveSimulation = async (project) => {
        try {
            const simulationData = {
                projectId: project.id,
                projectName: `${project.name || ''} ${project.zip || ''} ${project.city || ''}`.trim() || 'Projet sans nom',
                // Paramètres
                power: params.power,
                productible: params.power > 0 ? params.production / params.power : 1200,
                estimatedProduction: params.estimatedProduction,
                tarifTB: params.tarifTH,
                tarifACC: params.tarifACC,
                turpe: params.turpe,
                prixAchatACC: params.prixAchatACC,
                partACC: params.partACC !== undefined ? params.partACC : (params.prixAchatACC * 100),
                interestRate: params.interestRate,
                // Coûts détaillés
                installationRate: costs.installationRate,
                installation: costs.installation || 0,
                charpente: costs.charpente || 0,
                couverture: isAcama ? 0 : (costs.couverture || 0),
                agregateur: isAcama ? (costs.agregateur || 0) : 0,
                fondations: isAcama ? 0 : (costs.fondations || 0),
                resteACharge: isAcama ? (costs.resteACharge || 0) : 0,
                raccordement: costs.raccordement || 0,
                developpement: costs.developpement || 0,
                fraisCommerciaux: costs.fraisCommerciaux || 0,
                soulte: costs.soulte || 0,
                maintenance: costs.maintenance || 10,
                bardage: costs.bardage || 0,
                cheneaux: costs.cheneaux || 0,
                batterie: costs.batterie || 0,
                // Coût total
                totalCost: metrics.totalCost,
                // Métriques financières
                tri: metrics.tri,
                averageDSCR: metrics.averageDSCR,
                paybackWithoutACC: metrics.paybackWithoutACC,
                paybackWithACC: metrics.paybackWithACC
            };

            // user.uid au lieu de user.id (Firebase Auth utilise uid)
            await createSimulation(simulationData, user?.uid, activeTenantId);

            toast({
                title: "Simulation sauvegardée !",
                description: `La simulation a été rattachée au projet "${simulationData.projectName}".`,
                variant: "default",
                className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg"
            });
        } catch (error) {
            console.error('Erreur sauvegarde simulation:', error);
            toast({
                title: "Erreur",
                description: "Impossible de sauvegarder la simulation.",
                variant: "destructive"
            });
        }
    };

    const handleUpdateExistingSimulation = async () => {
        if (!editingSimulation || !editingSimulation.id) return;

        try {
            const simulationData = {
                // Keep existing project association
                projectId: editingSimulation.projectId,
                projectName: editingSimulation.projectName,
                // Paramètres
                power: params.power,
                productible: params.power > 0 ? params.production / params.power : 1200,
                estimatedProduction: params.estimatedProduction,
                tarifTB: params.tarifTH,
                tarifACC: params.tarifACC,
                turpe: params.turpe,
                prixAchatACC: params.prixAchatACC,
                partACC: params.partACC !== undefined ? params.partACC : (params.prixAchatACC * 100),
                interestRate: params.interestRate,
                // Coûts détaillés
                installationRate: costs.installationRate,
                installation: costs.installation || 0,
                charpente: costs.charpente || 0,
                couverture: isAcama ? 0 : (costs.couverture || 0),
                agregateur: isAcama ? (costs.agregateur || 0) : 0,
                fondations: isAcama ? 0 : (costs.fondations || 0),
                resteACharge: isAcama ? (costs.resteACharge || 0) : 0,
                raccordement: costs.raccordement || 0,
                developpement: costs.developpement || 0,
                fraisCommerciaux: costs.fraisCommerciaux || 0,
                soulte: costs.soulte || 0,
                maintenance: costs.maintenance || 10,
                bardage: costs.bardage || 0,
                cheneaux: costs.cheneaux || 0,
                batterie: costs.batterie || 0,
                // Coût total
                totalCost: metrics.totalCost,
                // Métriques financières
                tri: metrics.tri,
                averageDSCR: metrics.averageDSCR,
                paybackWithoutACC: metrics.paybackWithoutACC,
                paybackWithACC: metrics.paybackWithACC
            };

            await updateSimulation(editingSimulation.id, simulationData);

            toast({
                title: "Simulation mise à jour !",
                description: "Les modifications ont été enregistrées sur la simulation existante.",
                variant: "default",
                className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg"
            });
        } catch (error) {
            console.error('Erreur mise à jour simulation:', error);
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour la simulation.",
                variant: "destructive"
            });
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
            <div className="w-full px-4 sm:px-6 lg:px-8" id="profitability-simulator-content">
                <div id="simulator-top-section">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-teal-700 mb-2">
                                    Simulateur de Gain Producteur
                                </h1>
                                <p className="text-gray-600">
                                    Projetez les gains et la rentabilité de votre projet solaire.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        if (editingSimulation) {
                                            handleUpdateExistingSimulation();
                                        } else {
                                            setIsSaveModalOpen(true);
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-full"
                                    data-html2canvas-ignore="true"
                                >
                                    <Save className="h-5 w-5 mr-2" />
                                    Sauvegarder
                                </Button>
                                <Button
                                    onClick={handleGeneratePDF}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                                    data-html2canvas-ignore="true"
                                >
                                    <FileDown className="h-5 w-5 mr-2" />
                                    Générer PDF
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid - Adjusted Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Parameters Section - 1/3 width */}
                        <div className="lg:col-span-1">
                            <ParametersSection
                                params={params}
                                onParamsChange={setParams}
                                onManualTarifChange={() => setManualTarifOverride(true)}
                            />
                        </div>

                        {/* Project Costs Section - 2/3 width */}
                        <div className="lg:col-span-2">
                            <ProjectCostsSection
                                costs={costs}
                                onCostsChange={setCosts}
                                totalCost={metrics.totalCost}
                                isAcama={isAcama}
                                onAutoCalculateResteACharge={handleAutoCalculateResteACharge}
                            />
                        </div>
                    </div>

                    {/* Profitability Section */}
                    <div className="mb-6">
                        <ProfitabilitySection
                            metrics={metrics}
                            params={params}
                            onParamsChange={setParams}
                        />
                    </div>

                    {/* Cumulative Gains Chart */}
                    <div className="mb-6">
                        <CumulativeGainsChart
                            data={metrics.cumulativeGains}
                            totalCost={metrics.totalCost}
                        />
                    </div>
                </div>

                {/* Business Plan Table */}
                <div id="business-plan-section" className="mb-6">
                    <BusinessPlanTable businessPlan={metrics.businessPlan} />
                </div>
            </div>

            {/* Modal de sauvegarde */}
            <SaveSimulationModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSaveSimulation}
            />
        </div>
    );
}
