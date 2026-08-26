import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Zap, TrendingUp, Clock, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, DEFAULT_FINANCIAL_PARAMS } from '@/data/sechoirBatitechModels.js';
import { calculateFullSimulation } from '@/components/simulator/sechoir/sechoirCalculations.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

export default function Step5Results({ onExportPDF }) {
  const selectedModelId = useSechoirStore((state) => state.selectedModelId);
  const orientation = useSechoirStore((state) => state.orientation);
  const departement = useSechoirStore((state) => state.departement);
  const materials = useSechoirStore((state) => state.materials);
  const financialParams = useSechoirStore((state) => state.financialParams) || DEFAULT_FINANCIAL_PARAMS;
  const setLastResults = useSechoirStore((state) => state.setLastResults);

  const results = useMemo(() => {
    return calculateFullSimulation({
      selectedModelId,
      orientation,
      departement,
      materials,
      financialParams
    });
  }, [selectedModelId, orientation, departement, materials, financialParams]);

  useEffect(() => {
    if (results) {
      setLastResults(results);
    }
  }, [results, setLastResults]);

  if (!results) return null;

  const { model, cee, productionPV, produits, financing, annuite, deltaEBE, gainNetAnnuel, treasury, roi, van, tri, triPercent } = results;

  // Ensure cashFlows array exists
  const chartData = treasury?.cashFlows || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-amber-500">
          <BarChart3 className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold text-white">Bilan Financier & Modèle Économique</h2>
            <p className="text-gray-400">Synthèse de votre projet Séchoir BatiTech</p>
          </div>
        </div>
        {onExportPDF && (
          <button 
            onClick={onExportPDF}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <FileDown className="w-5 h-5" />
            <span>Télécharger PDF</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="flex items-center space-x-3 text-amber-400 mb-2">
              <Zap className="w-5 h-5" />
              <h3 className="font-medium text-gray-300">Production PV</h3>
            </div>
            <p className="text-2xl font-bold text-white">{fmt(productionPV)} <span className="text-sm font-normal text-gray-400">kWh/an</span></p>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="flex items-center space-x-3 text-emerald-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-medium text-gray-300">Valorisation Agricole</h3>
            </div>
            <p className="text-2xl font-bold text-white">{fmt(produits?.deltaProduits)} <span className="text-sm font-normal text-gray-400">€/an</span></p>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="flex items-center space-x-3 text-blue-400 mb-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-medium text-gray-300">Impact sur l'EBE</h3>
            </div>
            <p className="text-2xl font-bold text-white">+{fmt(deltaEBE)} <span className="text-sm font-normal text-gray-400">€/an</span></p>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 relative overflow-hidden">
            <div className="flex items-center space-x-3 text-cyan-400 mb-2">
              <Clock className="w-5 h-5" />
              <h3 className="font-medium text-gray-300">Temps de Retour (ROI)</h3>
            </div>
            <p className="text-2xl font-bold text-white">{roi?.toFixed(2)} <span className="text-sm font-normal text-gray-400">ans</span></p>
            <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none">
              <svg width="80" height="80" viewBox="0 0 100 100" className="text-cyan-400 fill-current">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray="250" strokeDashoffset="50" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col justify-between">
          <h3 className="text-lg font-semibold text-white mb-4">Plan de Financement</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between text-gray-300">
              <span>Investissement Brut</span>
              <span className="text-white">{fmt(financing?.investissementBrut)} €</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Prime CEE estimée</span>
              <span className="text-emerald-400">-{fmt(cee)} €</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Subventions (ex: PAE)</span>
              <span className="text-emerald-400">-{fmt(financing?.subventions)} €</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between font-medium">
              <span className="text-white">Investissement Net</span>
              <span className="text-amber-500 font-bold">{fmt(financing?.investissementNet)} €</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between text-gray-300">
              <span>Emprunt</span>
              <span className="text-white">{fmt(financing?.montantEmprunt)} €</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Annuité ({financialParams?.dureeEmprunt} ans, {financialParams?.tauxEmprunt}%)</span>
              <span className="text-red-400">{fmt(annuite)} €/an</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between text-lg">
              <span className="text-gray-300">Delta EBE</span>
              <span className="text-emerald-400">+{fmt(deltaEBE)} €/an</span>
            </div>
            <div className="flex justify-between text-xl font-bold mt-1 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
              <span className="text-white">Gain Net Annuel</span>
              <span className="text-amber-500">+{fmt(gainNetAnnuel)} €/an</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Évolution de la Trésorerie Cumulée</h3>
        
        <div className="h-80 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="annee" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <YAxis 
                stroke="#9CA3AF" 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(val) => `${fmt(val / 1000)} k€`}
                width={80}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#fff' }}
                formatter={(value) => [`${fmt(value)} €`, 'Cumul Trésorerie']}
                labelFormatter={(label) => `Année ${label}`}
              />
              <ReferenceLine y={0} stroke="#4B5563" />
              <Bar dataKey="cumul" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cumul >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div>
            <p className="text-sm text-gray-400">Valeur Actuelle Nette (VAN)</p>
            <p className="text-lg font-semibold text-white">{fmt(van)} €</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Taux de Rendement Interne (TRI)</p>
            <p className="text-lg font-semibold text-white">{triPercent?.toFixed(2)} %</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Temps de Retour sur Investissement</p>
            <p className="text-lg font-semibold text-white">{roi?.toFixed(2)} ans</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
