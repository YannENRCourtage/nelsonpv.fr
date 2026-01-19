import React, { useState, useEffect } from 'react';
import { FileDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import ParametersSection from '../components/simulator/ParametersSection';
import ProjectCostsSection from '../components/simulator/ProjectCostsSection';
import ProfitabilitySection from '../components/simulator/ProfitabilitySection';
import CumulativeGainsChart from '../components/simulator/CumulativeGainsChart';
import BusinessPlanTable from '../components/simulator/BusinessPlanTable';
import { calculateAllMetrics, calculateEstimatedProduction } from '../lib/profitabilityCalculations';
import { generateSimulatorPDF } from '../components/simulator/SimulatorPDFGenerator';
import SaveSimulationModal from '../components/simulator/SaveSimulationModal';
import { createSimulation } from '../services/firebase/simulations.service.js';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast.js";



const DEFAULT_PARAMS = {
    power: 120,
    production: 120000,
    estimatedProduction: 144000,
    tarifTH: 0.12,
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
    const { user } = useAuth();
    const [params, setParams] = useState(DEFAULT_PARAMS);
    const [costs, setCosts] = useState(DEFAULT_COSTS);
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


    // Load saved defaults
    useEffect(() => {
        const savedCosts = localStorage.getItem('simulator_default_costs_v4');
        if (savedCosts) {
            try {
                // Merge saved defaults with structure to ensure installationRate exists
                const parsed = JSON.parse(savedCosts);
                setCosts(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error loading saved costs:', e);
            }
        }
    }, []);

    // Recalculate metrics
    useEffect(() => {
        const calculated = calculateAllMetrics(params, costs);
        setMetrics(calculated);
    }, [params, costs]);

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
        const newInstallation = power * rate * 1000;
        const newFraisCommerciaux = power * 50;

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

        // 3. Tariff Logic based on Power
        // < 36: 0.1049
        // 36 - 99.9: 0.0912
        // 100 - 499.9: 0.09
        // >= 500: 0.085
        let newTarifTH = params.tarifTH;
        if (power < 36) newTarifTH = 0.1049;
        else if (power < 100) newTarifTH = 0.0912;
        else if (power < 500) newTarifTH = 0.09;
        else newTarifTH = 0.085;

        // Apply Tariff if changed.
        // Note: This forces the tariff. If user changes it manually, it will reset if power changes?
        // Yes, standard behavior for simulators often. If user wants manual, they change power then tariff.
        // But here we might overwrite user input if they change power slightly?
        // Assuming this is desired "Default behavior".

        // 4. Prime Logic
        // Disable Prime if Power > 99.9 (User said "superieur à 99.9")
        // Checkbox: withPrime
        let newWithPrime = params.withPrime;
        if (power > 99.9 && newWithPrime !== false) {
            newWithPrime = false;
        }

        // Apply Params changes
        if (newTarifTH !== params.tarifTH || newWithPrime !== params.withPrime) {
            setParams(prev => ({
                ...prev,
                tarifTH: newTarifTH,
                withPrime: newWithPrime
            }));
        }

    }, [params.power, params.productible, params.production, params.tarifTH, params.withPrime, costs.installationRate]);

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
                tarifTB: params.tarifTH,
                tarifACC: params.tarifACC,
                partACC: params.partACC || (params.prixAchatACC * 100),
                // Coûts
                totalCost: metrics.totalCost,
                // Métriques financières
                tri: metrics.tri,
                averageDSCR: metrics.averageDSCR,
                paybackWithoutACC: metrics.paybackWithoutACC,
                paybackWithACC: metrics.paybackWithACC
            };

            // user.uid au lieu de user.id (Firebase Auth utilise uid)
            await createSimulation(simulationData, user?.uid);

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
                                    onClick={() => setIsSaveModalOpen(true)}
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
                            <ParametersSection params={params} onParamsChange={setParams} />
                        </div>

                        {/* Project Costs Section - 2/3 width */}
                        <div className="lg:col-span-2">
                            <ProjectCostsSection
                                costs={costs}
                                onCostsChange={setCosts}
                                totalCost={metrics.totalCost}
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
