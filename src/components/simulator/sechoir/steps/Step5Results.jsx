import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Zap, TrendingUp, Clock, FileDown, ShieldCheck, Euro } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, DEFAULT_FINANCIAL_PARAMS } from '@/data/sechoirBatitechModels.js';
import { calculateFullSimulation } from '@/components/simulator/sechoir/sechoirCalculations.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

export default function Step5Results({ onExportPDF }) {
  const selectedModelId = useSechoirStore((state) => state.selectedModelId) || 'BT-6.2.15';
  const orientation = useSechoirStore((state) => state.orientation) || 'Sud';
  const departement = useSechoirStore((state) => state.departement) || '32';
  const materials = useSechoirStore((state) => state.materials) || [];
  const financialParams = useSechoirStore((state) => state.financialParams) || DEFAULT_FINANCIAL_PARAMS;
  const setLastResults = useSechoirStore((state) => state.setLastResults);

  const model = BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-6.2.15'];

  const results = useMemo(() => {
    return calculateFullSimulation({
      model,
      selectedModelId,
      orientation,
      departement,
      materials,
      financialParams
    });
  }, [model, selectedModelId, orientation, departement, materials, financialParams]);

  useEffect(() => {
    if (results) {
      setLastResults(results);
    }
  }, [results, setLastResults]);

  if (!results) {
    return (
      <div className="text-center py-12 text-slate-400">
        Calcul en cours...
      </div>
    );
  }

  const {
    cee,
    productionPV,
    produits,
    financing,
    annuite,
    deltaEBE,
    gainNetAnnuel,
    treasury,
    roi,
    van,
    triPercent
  } = results;

  const chartData = treasury?.cashFlows || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-amber-500">
          <BarChart3 className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-white">Bilan Financier & Modèle Économique</h2>
            <p className="text-slate-300 text-sm">
              Étude de rentabilité : <strong>{model.name}</strong> ({model.puissanceKwc} kWc — {model.nbModules} panneaux Cogen'Air®)
            </p>
          </div>
        </div>
        {onExportPDF && (
          <button 
            type="button"
            onClick={onExportPDF}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
          >
            <FileDown className="w-5 h-5" />
            <span>Télécharger l'Étude PDF</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne Gauche : KPIs Clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Production Solaire */}
          <div className="bg-slate-800/70 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
              <Zap className="w-5 h-5" />
              <h3 className="font-bold text-xs uppercase text-slate-300">Production Solaire</h3>
            </div>
            <p className="text-2xl font-black text-white">{fmt(productionPV)} <span className="text-xs font-normal text-slate-400">kWh/an</span></p>
            <span className="text-[11px] text-slate-400 mt-1 block">Gisement zone {departement} • Orientation {orientation}</span>
          </div>

          {/* Valorisation Agricole */}
          <div className="bg-slate-800/70 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2.5 text-emerald-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold text-xs uppercase text-slate-300">Valorisation Matière</h3>
            </div>
            <p className="text-2xl font-black text-emerald-400">+{fmt(produits?.deltaProduits)} <span className="text-xs font-normal text-slate-400">€/an</span></p>
            <span className="text-[11px] text-slate-400 mt-1 block">Gains séchage + économies fossiles</span>
          </div>

          {/* Impact EBE */}
          <div className="bg-slate-800/70 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2.5 text-blue-400 mb-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-bold text-xs uppercase text-slate-300">Impact EBE Annuel</h3>
            </div>
            <p className="text-2xl font-black text-blue-400">+{fmt(deltaEBE)} <span className="text-xs font-normal text-slate-400">€/an</span></p>
            <span className="text-[11px] text-slate-400 mt-1 block">Surplus brut d'exploitation</span>
          </div>

          {/* ROI */}
          <div className="bg-slate-800/70 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md relative overflow-hidden">
            <div className="flex items-center space-x-2.5 text-cyan-400 mb-2">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-xs uppercase text-slate-300">Retour Investissement</h3>
            </div>
            <p className="text-2xl font-black text-cyan-400">{roi !== null && roi !== undefined ? Number(roi).toFixed(2) : '—'} <span className="text-xs font-normal text-slate-400">ans</span></p>
            <span className="text-[11px] text-slate-400 mt-1 block">Temps de retour net d'aides</span>
          </div>
        </div>

        {/* Colonne Droite : Plan de Financement */}
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700 p-5 sm:p-6 shadow-md flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Plan de Financement & Subventions
          </h3>
          
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Investissement Brut Séchoir :</span>
              <span className="font-bold text-white">{fmt(model.investissementBrut)} € HT</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Prime CEE Cogen'Air (AGRI-EQ-110) :</span>
              <span className="font-bold">-{fmt(cee?.primeTotal)} €</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Subventions (Plan Ambitions Éleveurs) :</span>
              <span className="font-bold">-{fmt(financing?.subventionsTotal)} €</span>
            </div>
            
            <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-sm">
              <span className="text-white">Investissement Net Réel :</span>
              <span className="text-amber-400 font-black">{fmt(financing?.investissementNet)} € HT</span>
            </div>
            
            <div className="pt-2 border-t border-slate-700 flex justify-between text-slate-300">
              <span>Montant financé par Emprunt :</span>
              <span className="font-bold text-white">{fmt(financing?.emprunt)} €</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Annuité constante ({financialParams?.dureeEmprunt || 25} ans @ {((financialParams?.tauxEmprunt || 0.034) * 100).toFixed(2)}%) :</span>
              <span className="font-bold">-{fmt(annuite)} €/an</span>
            </div>
            
            <div className="pt-2.5 mt-1 border-t border-slate-700 flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="font-bold text-white text-xs uppercase">Gain Net Annuel d'Exploitation :</span>
              <span className="text-xl font-black text-amber-400">+{fmt(gainNetAnnuel)} €/an</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique de Trésorerie Cumulée sur 25 ans */}
      <div className="bg-slate-800/70 rounded-2xl border border-slate-700 p-5 sm:p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Évolution de la Trésorerie Cumulée (25 ans)
          </h3>
          <span className="text-xs text-slate-400">Inflation calculée à 2%/an</span>
        </div>
        
        <div className="h-72 sm:h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="annee" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${fmt(val / 1000)} k€`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                formatter={(value) => [`${fmt(value)} €`, 'Trésorerie Cumulée']}
                labelFormatter={(label) => `Année ${label}`}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
              <Bar dataKey="cumul" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cumul >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-700 text-center">
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-semibold">Valeur Actuelle Nette (VAN)</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">+{fmt(van)} €</p>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-semibold">Taux de Rendement Interne (TRI)</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{triPercent} %</p>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-semibold">Temps de Retour sur Investissement</p>
            <p className="text-lg font-black text-cyan-400 mt-0.5">{roi !== null && roi !== undefined ? Number(roi).toFixed(2) : '—'} ans</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
