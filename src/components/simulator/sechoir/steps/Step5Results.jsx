import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Zap, Clock, ShieldCheck } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';
import { calculateFullSimulation } from '@/components/simulator/sechoir/sechoirCalculations.js';

export default function Step5Results() {
  const selectedModelId = useSechoirStore((state) => state.selectedModelId) || 'BT-3.1.15';
  const orientation = useSechoirStore((state) => state.orientation) || 'sud';
  const departement = useSechoirStore((state) => state.departement) || '33';
  const materials = useSechoirStore((state) => state.materials);
  const financialParams = useSechoirStore((state) => state.financialParams);
  const setLastResults = useSechoirStore((state) => state.setLastResults);

  // Recalculer les résultats complets
  const results = useMemo(() => {
    return calculateFullSimulation({
      model: selectedModelId,
      orientation,
      departement,
      materials,
      financialParams,
    });
  }, [selectedModelId, orientation, departement, materials, financialParams]);

  useEffect(() => {
    if (results) {
      setLastResults(results);
    }
  }, [results, setLastResults]);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

  const {
    model = BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'],
    cee = { primeTotal: 0 },
    productionPV = 0,
    produits = { deltaProduits: 0 },
    deltaEBE = 0,
    financing = { investissementNet: 0, subventionsTotal: 0, emprunt: 0 },
    annuite = 0,
    gainNetAnnuel = 0,
    treasury = { cashFlows: [] },
    roi = 0,
    van = 0,
    triPercent = '0.00',
  } = results || {};

  const activeModel = model || BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'];
  const puissanceKwcVal = activeModel?.puissanceKwc ? Number(activeModel.puissanceKwc) : 30.15;

  const chartData = useMemo(() => {
    return (treasury.cashFlows || []).map((cf) => ({
      annee: cf.annee,
      fluxNet: cf.fluxNet,
      cumul: cf.cumul,
    }));
  }, [treasury.cashFlows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="text-amber-500 w-9 h-9" />
            Bilan Financier &amp; Modèle Économique
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-1">
            Étude de rentabilité : {activeModel?.name || 'BatiTech 3.1.15'} ({puissanceKwcVal.toFixed(2)} kWc — {activeModel?.nbModules || 90} panneaux Cogen'Air® — {activeModel?.dimensions || '18m × 20m'})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne Gauche : KPIs Clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Production Solaire */}
          <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
              <Zap className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider">Production Solaire</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white">{fmt(productionPV)} <span className="text-base font-normal text-slate-400">kWh/an</span></p>
            <span className="text-sm text-slate-400 mt-1.5 block">Gisement zone {departement} • Orientation {orientation}</span>
          </div>

          {/* Valorisation Matière */}
          <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2.5 text-emerald-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider">Valorisation Matière</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-400">+{fmt(produits?.deltaProduits)} <span className="text-base font-normal text-slate-400">€/an</span></p>
            <span className="text-sm text-slate-400 mt-1.5 block">Gains séchage + économies fossiles</span>
          </div>

          {/* Impact EBE */}
          <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2.5 text-blue-400 mb-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider">Impact EBE Annuel</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-blue-400">+{fmt(deltaEBE)} <span className="text-base font-normal text-slate-400">€/an</span></p>
            <span className="text-sm text-slate-400 mt-1.5 block">Surplus brut d'exploitation</span>
          </div>

          {/* ROI */}
          <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md relative overflow-hidden">
            <div className="flex items-center space-x-2.5 text-cyan-400 mb-2">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider">Retour Investissement</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-cyan-400">{roi !== null && roi !== undefined ? Number(roi).toFixed(2) : '—'} <span className="text-base font-normal text-slate-400">ans</span></p>
            <span className="text-sm text-slate-400 mt-1.5 block">Temps de retour net d'aides</span>
          </div>
        </div>

        {/* Colonne Droite : Plan de Financement */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 shadow-md flex flex-col justify-between">
          <h3 className="text-lg font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Plan de Financement &amp; Subventions
          </h3>
          
          <div className="space-y-3.5 text-base">
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
              <span className="font-bold">-{fmt(financing?.subventionPAE ?? (financialParams?.subventionPAE || 100000))} €</span>
            </div>
            
            <div className="pt-2.5 border-t border-slate-700 flex justify-between font-bold text-lg">
              <span className="text-white">Investissement Net Réel :</span>
              <span className="text-amber-400 font-black">{fmt(financing?.investissementNet)} € HT</span>
            </div>
            
            <div className="pt-2.5 border-t border-slate-700 flex justify-between text-slate-300">
              <span>Montant financé par Emprunt :</span>
              <span className="font-bold text-white">{fmt(financing?.emprunt)} €</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Annuité constante ({financialParams?.dureeEmprunt || 25} ans @ {((financialParams?.tauxEmprunt || 0.034) * 100).toFixed(2)}%) :</span>
              <span className="font-bold">-{fmt(annuite)} €/an</span>
            </div>
            
            <div className="pt-3 mt-1 border-t border-slate-700 flex justify-between items-center bg-slate-900/90 p-4 rounded-2xl border border-slate-700/60">
              <span className="font-bold text-white text-base uppercase">Gain Net Annuel d'Exploitation :</span>
              <span className="text-3xl font-black text-amber-400">+{fmt(gainNetAnnuel)} €/an</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique de Trésorerie Cumulée sur 25 ans */}
      <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Évolution de la Trésorerie Cumulée (25 ans)
          </h3>
          <span className="text-sm text-slate-400">Inflation calculée à 2%/an</span>
        </div>
        
        <div className="h-72 sm:h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="annee" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 13 }}
                tickFormatter={(val) => `${fmt(val / 1000)} k€`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '0.75rem', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}
                itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}
                formatter={(value) => [`${fmt(value)} €`, 'Trésorerie Cumulée']}
                labelFormatter={(label) => `Année ${label}`}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
              {roi && Number(roi) > 0 && Number(roi) <= 25 && (
                <ReferenceLine 
                  x={Math.round(Number(roi))} 
                  stroke="#06b6d4" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: `ROI : ${Number(roi).toFixed(2)} ans`, 
                    fill: '#22d3ee', 
                    position: 'insideTop', 
                    fontSize: 13, 
                    fontWeight: 'bold',
                    dy: 10,
                  }} 
                />
              )}
              <Bar dataKey="cumul" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cumul >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-700 text-center">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <p className="text-sm text-slate-400 uppercase font-semibold">Valeur Actuelle Nette (VAN)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">+{fmt(van)} €</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <p className="text-sm text-slate-400 uppercase font-semibold">Taux de Rendement Interne (TRI)</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{triPercent} %</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <p className="text-sm text-slate-400 uppercase font-semibold">Temps de Retour sur Investissement</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{roi !== null && roi !== undefined ? Number(roi).toFixed(2) : '—'} ans</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
