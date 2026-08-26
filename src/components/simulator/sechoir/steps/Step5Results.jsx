import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Zap, Clock, ShieldCheck, 
  Landmark, Info, Sparkles, Wind, Coins, CheckCircle2, AlertCircle 
} from 'lucide-react';
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
import { BATITECH_MODELS, getRegionForDepartment } from '@/data/sechoirBatitechModels.js';
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
    charges = { deltaCharges: 0, detail: {} },
    deltaEBE = 0,
    financing = { investissementNet: 0, subventionsTotal: 0, emprunt: 0 },
    subventionsEligibles = {},
    roiBonifie = null,
    annuite = 0,
    gainNetAnnuel = 0,
    treasury = { cashFlows: [] },
    roi = 0,
    van = 0,
    triPercent = '0.00',
  } = results || {};

  const activeModel = model || BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'];
  const puissanceKwcVal = activeModel?.puissanceKwc ? Number(activeModel.puissanceKwc) : 30.15;
  const regionName = getRegionForDepartment(departement);

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
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="text-amber-500 w-9 h-9" />
            Bilan Financier &amp; Modèle Économique
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-1">
            Étude de rentabilité : <strong className="text-white">{activeModel?.name || 'BatiTech 3.1.15'}</strong> ({puissanceKwcVal.toFixed(2)} kWc — {activeModel?.nbModules || 90} panneaux Cogen'Air® — {activeModel?.dimensions || '18m × 20m'}) • Région <strong className="text-amber-400">{regionName}</strong>
          </p>
        </div>
      </div>

      {/* 4 Cartes KPIs Clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Production Solaire */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
            <Zap className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Production Solaire</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{fmt(productionPV)} <span className="text-sm font-normal text-slate-400">kWh/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Gisement zone {departement} • {orientation}</span>
        </div>

        {/* Valorisation Matière */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-emerald-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Valorisation Matière</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">+{fmt(produits?.deltaProduits)} <span className="text-sm font-normal text-slate-400">€/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Gains séchage + économies énergie</span>
        </div>

        {/* Charges d'Exploitation & Ventilation */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-rose-400 mb-2">
            <Wind className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Charges &amp; Ventilation</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-400">-{fmt(charges?.deltaCharges)} <span className="text-sm font-normal text-slate-400">€/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Ventilation ({fmt(charges?.detail?.ventilation || 0)} €) + Entretien</span>
        </div>

        {/* Impact EBE */}
        <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-md">
          <div className="flex items-center space-x-2.5 text-blue-400 mb-2">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Impact sur l'EBE</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-400">+{fmt(deltaEBE)} <span className="text-sm font-normal text-slate-400">€/an</span></p>
          <span className="text-xs text-slate-400 mt-1.5 block">Surplus brut d'exploitation</span>
        </div>
      </div>

      {/* Bloc Central : 2 Colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Colonne Gauche : Modèle Économique Contractuel (Investissement Initial & Flux de Trésorerie) */}
        <div className="space-y-4">
          
          {/* Cadre 1 : Investissement Initial & Plan de Financement */}
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 shadow-md">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                1. Investissement Initial &amp; Financement
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Garanti &amp; Contractuel
              </span>
            </h3>
            
            <div className="space-y-2.5 text-base">
              <div className="flex justify-between text-slate-300">
                <span>Investissement Brut Séchoir :</span>
                <span className="font-bold text-white">{fmt(model.investissementBrut)} € HT</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Prime CEE Cogen'Air® (Fiche AGRI-EQ-110) :</span>
                <span className="font-bold">-{fmt(cee?.primeTotal)} €</span>
              </div>
              
              <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-lg">
                <span className="text-white">Investissement Net à Financer :</span>
                <span className="text-amber-400 font-black">{fmt(financing?.investissementNet)} € HT</span>
              </div>
              
              <div className="pt-2 border-t border-slate-700 flex justify-between text-slate-300 text-sm">
                <span>Montant financé par Emprunt :</span>
                <span className="font-bold text-white">{fmt(financing?.emprunt)} €</span>
              </div>
              <div className="flex justify-between text-red-400 text-sm">
                <span>Annuité constante ({financialParams?.dureeEmprunt || 25} ans @ {((financialParams?.tauxEmprunt || 0.034) * 100).toFixed(2)}%) :</span>
                <span className="font-bold">-{fmt(annuite)} €/an</span>
              </div>
            </div>
          </div>

          {/* Cadre 2 : Flux de Trésorerie Annuels */}
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 shadow-md">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              2. Flux de Trésorerie Annuels d'Exploitation
            </h3>

            <div className="space-y-2.5 text-base">
              <div className="flex justify-between text-slate-300">
                <span>Valorisation Matière (Delta Produits) :</span>
                <span className="font-bold text-emerald-400">+{fmt(produits?.deltaProduits)} €/an</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Charges d'exploitation &amp; ventilation :</span>
                <span className="font-bold text-rose-400">-{fmt(charges?.deltaCharges)} €/an</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Annuité d'emprunt :</span>
                <span className="font-bold text-red-400">-{fmt(annuite)} €/an</span>
              </div>

              <div className="pt-3 mt-1 border-t border-slate-700 flex justify-between items-center bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 shadow-inner">
                <div>
                  <span className="font-bold text-white text-sm uppercase block">Gain Net Annuel d'Exploitation</span>
                  <span className="text-xs text-slate-400 font-medium">Après remboursement intégral de l'annuité</span>
                </div>
                <span className="text-3xl font-black text-amber-400">+{fmt(gainNetAnnuel)} €/an</span>
              </div>
            </div>
          </div>

        </div>

        {/* Colonne Droite : Subventions Régionales & ADEME (Affichage Informatif) */}
        <div className="bg-gradient-to-br from-slate-800/95 via-slate-850 to-slate-900 rounded-3xl border-2 border-amber-500/40 p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          
          {/* Badge Informatif en haut */}
          <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[11px] px-3.5 py-1 rounded-bl-2xl uppercase tracking-wider shadow-md">
            À titre indicatif
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-3 text-amber-400">
              <Landmark className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-lg font-black text-white">
                  Subventions Régionales &amp; Aides Éligibles
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Région identifiée : <span className="text-amber-300 font-bold">{subventionsEligibles.region || regionName}</span>
                </p>
              </div>
            </div>

            {/* Dispositif Régional Principal */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 space-y-3 mt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs uppercase font-bold text-amber-400 block tracking-wider">Dispositif Territorial</span>
                  <h4 className="text-base font-black text-white">
                    {subventionsEligibles.subventionRegionale?.nom || 'Dispositif Régional (PCAE / FEADER)'}
                  </h4>
                </div>
                {subventionsEligibles.montantEstime > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 font-black text-xs px-2.5 py-1 rounded-xl border border-emerald-500/40 shrink-0">
                    Jusqu'à {fmt(subventionsEligibles.montantEstime)} €
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {subventionsEligibles.description}
              </p>

              {/* Détails du calcul indicatif */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-xl">
                  <span className="text-slate-400 block">Assiette éligible (Brut - CEE)</span>
                  <strong className="text-white font-bold text-sm">{fmt(subventionsEligibles.assietteEligible)} € HT</strong>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl">
                  <span className="text-slate-400 block">Taux d'aide indicatif</span>
                  <strong className="text-amber-300 font-bold text-sm">{subventionsEligibles.tauxTexte}</strong>
                </div>
              </div>

              {subventionsEligibles.subventionRegionale?.montantMax && (
                <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                  <span>Plafond maximum de subvention :</span>
                  <strong className="text-slate-200">{fmt(subventionsEligibles.subventionRegionale.montantMax)} €</strong>
                </div>
              )}
            </div>

            {/* Dispositif National ADEME */}
            <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/90 mt-3 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block font-bold">Fonds Chaleur ADEME (National)</strong>
                <span className="text-slate-300">
                  Éligible pour la valorisation de la chaleur solaire thermovoltaïque Cogen'Air®. Montant variable calculé post-étude thermique.
                </span>
              </div>
            </div>

            {/* Impact sur le ROI si subvention obtenue */}
            {roiBonifie !== null && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 mt-3 flex items-center justify-between text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-200 font-medium">
                    ROI bonifié en cas d'obtention de l'aide :
                  </span>
                </div>
                <strong className="text-emerald-300 text-sm font-black">
                  ~{roiBonifie.toFixed(2)} ans <span className="text-slate-400 font-normal text-xs">(vs {Number(roi).toFixed(2)} ans)</span>
                </strong>
              </div>
            )}
          </div>

          {/* Note d'explication transparente */}
          <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Les subventions régionales (PCAE, FEADER, Plan Ambition Éleveurs) et nationales (ADEME) sont soumises à instruction de dossier et aux appels à projets en cours. Pour préserver un calcul de rentabilité prudent et réaliste, <strong>elles ne sont pas déduites de l'emprunt de base</strong>.
            </p>
          </div>

        </div>

      </div>

      {/* Graphique de Trésorerie Cumulée sur 25 ans */}
      <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-400" />
              Évolution de la Trésorerie Cumulée (25 ans)
            </h3>
            <p className="text-sm text-slate-400">Basé sur le plan contractuel (Investissement Net = Brut - Prime CEE)</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
            Inflation produits calculée à 2%/an
          </span>
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

        {/* 3 Indicateurs Financiers Avancés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-700 text-center">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <p className="text-sm text-slate-400 uppercase font-semibold">Valeur Actuelle Nette (VAN)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">+{fmt(van)} €</p>
            <p className="text-xs text-slate-400 mt-0.5">Sur 20 ans @ 3.40%</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <p className="text-sm text-slate-400 uppercase font-semibold">Taux de Rendement Interne (TRI)</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{triPercent} %</p>
            <p className="text-xs text-slate-400 mt-0.5">Rentabilité brute du projet</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <p className="text-sm text-slate-400 uppercase font-semibold">Temps de Retour sur Investissement</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{roi !== null && roi !== undefined ? Number(roi).toFixed(2) : '—'} ans</p>
            <p className="text-xs text-slate-400 mt-0.5">Amortissement sur flux d'EBE</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
