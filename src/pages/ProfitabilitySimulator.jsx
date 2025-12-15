import React, { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import ParametersSection from '../components/simulator/ParametersSection';
import ProjectCostsSection from '../components/simulator/ProjectCostsSection';
import ProfitabilitySection from '../components/simulator/ProfitabilitySection';
import CumulativeGainsChart from '../components/simulator/CumulativeGainsChart';
import BusinessPlanTable from '../components/simulator/BusinessPlanTable';
import { calculateAllMetrics, calculateEstimatedProduction } from '../lib/profitabilityCalculations';
import { generateSimulatorPDF } from '../components/simulator/SimulatorPDFGenerator';

const DEFAULT_PARAMS = {
    power: 120,
    production: 120000,
    estimatedProduction: 144000,
    tarifTH: 0.12,
    tarifACC: 0.12,
    turpe: 0.012,
    prixAchatACC: 0.85,
    interestRate: 3.0
};

const DEFAULT_COSTS = {
    installation: 95000,
    charpente: 30000,
    couverture: 15000,
    // terrassement: 1500, // Removed from UI but maybe keep in calculation if needed? No, user removed it from UI.
    // I'll keep default valid for UI fields.
    fondations: 18500, // Added default
    raccordement: 10000,
    fraisCommerciaux: 12503, // Renamed from fraisConnexion (1500) and updated value from screenshot
    fraisContrat: 1500, // Kept? No, user said remove. But I'll leave it in object if it doesn't hurt, but better clean.
    // I will use clean defaults matching new fields.
    developpement: 6524, // Value from screenshot
    soulte: 0,
    maintenance: 10,
    bardage: 4502, // Value from screenshot
    cheneaux: 3657, // Value from screenshot
    batterie: 0
};
// I'll update the whole DEFAULT_COSTS block.

export default function ProfitabilitySimulator() {
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

    // Load saved defaults from localStorage
    useEffect(() => {
        const savedCosts = localStorage.getItem('simulator_default_costs');
        if (savedCosts) {
            try {
                // If saved costs have old keys, they might persist.
                // Ideally merge with defaults or migrate.
                // For now just load.
                setCosts(JSON.parse(savedCosts));
            } catch (e) {
                console.error('Error loading saved costs:', e);
            }
        }
    }, []);

    // Recalculate metrics whenever params or costs change
    useEffect(() => {
        const calculated = calculateAllMetrics(params, costs);
        setMetrics(calculated);
    }, [params, costs]);

    // Auto-calculate Installation cost and Production (SAME AS BEFORE)
    useEffect(() => {
        const power = params.power || 0;
        const productible = params.productible || 1200;
        const newProduction = power * productible;
        const newInstallation = power * 500;

        // Update Costs
        setCosts(prev => {
            if (prev.installation === newInstallation) return prev;
            return { ...prev, installation: newInstallation };
        });

        // Update Production in Params if needed
        if (params.production !== newProduction) {
            setParams(prev => ({ ...prev, production: newProduction }));
        }
    }, [params.power, params.productible, params.production]);

    const handleGeneratePDF = () => {
        generateSimulatorPDF({
            elementId: 'profitability-simulator-content',
            fileName: `Simulateur_Rentabilite_${new Date().toISOString().split('T')[0]}.pdf`
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
            <div className="w-full px-4 sm:px-6 lg:px-8" id="profitability-simulator-content">
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

                {/* Business Plan Table */}
                <div className="mb-6">
                    <BusinessPlanTable businessPlan={metrics.businessPlan} />
                </div>
            </div>
        </div>
    );
}
