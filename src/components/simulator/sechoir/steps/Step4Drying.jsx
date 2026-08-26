import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ChevronDown, ChevronUp, Plus, Minus, TrendingUp, Zap, Sparkles } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

function MaterialCard({ material, onToggle, onChangeVolume, onChangeParams }) {
  const [expandedSettings, setExpandedSettings] = useState(false);

  const vol = Number(material.volume || 0);
  const pvVal = Number(material.plusValueQualite || 0);
  const eeVal = Number(material.economieEnergie || 0);

  const gainQualite = vol * pvVal;
  const gainEnergie = vol * eeVal;
  const totalMatiere = gainQualite + gainEnergie;

  return (
    <div className={`rounded-2xl border transition-all duration-200 shadow-md ${material.enabled ? 'bg-slate-800/80 border-emerald-500/50 shadow-emerald-500/5 ring-1 ring-emerald-500/30' : 'bg-slate-800/40 border-slate-700/60 opacity-80'}`}>
      <div 
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none" 
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className={`p-2.5 rounded-xl text-2xl flex items-center justify-center transition-colors ${material.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/60 text-slate-400'}`}>
            <span>{material.icon || '🌿'}</span>
          </div>
          <div>
            <span className={`font-bold text-base sm:text-lg block ${material.enabled ? 'text-white' : 'text-slate-400'}`}>
              {material.label}
            </span>
            {material.enabled && vol > 0 ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{fmt(totalMatiere)} €/an de gain estimé
              </span>
            ) : (
              <span className="text-xs text-slate-500">{material.unit}</span>
            )}
          </div>
        </div>
        
        {/* Toggle Switch */}
        <div className={`w-12 h-6 rounded-full relative transition-colors ${material.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
          <motion.div 
            layout
            className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-md"
            initial={false}
            animate={{ left: material.enabled ? '28px' : '4px' }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
      </div>

      <AnimatePresence>
        {material.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-700/60 mt-1 space-y-4">
              {/* Saisie Volume */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-200 block">Volume annuel traité</label>
                  <span className="text-[11px] text-slate-400">Exprimé en {material.unit}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChangeVolume(Math.max(0, vol - 10)); }}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input 
                    type="number"
                    min="0"
                    step="5"
                    value={material.volume === 0 ? '' : material.volume}
                    onChange={(e) => onChangeVolume(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    onClick={(e) => e.stopPropagation()}
                    className="w-24 text-center font-bold bg-slate-950 border border-slate-600 rounded-lg py-1.5 px-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChangeVolume(vol + 10); }}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Détail des économies & valorisation en temps réel */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Plus-value qualité</span>
                  <strong className="text-emerald-400 text-sm">+{fmt(gainQualite)} €/an</strong>
                  <span className="text-[10px] text-slate-500 block">({pvVal} €/{material.unit})</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Économie énergie</span>
                  <strong className="text-blue-400 text-sm">+{fmt(gainEnergie)} €/an</strong>
                  <span className="text-[10px] text-slate-500 block">({eeVal} €/{material.unit})</span>
                </div>
              </div>

              {/* Paramètres avancés ajustables */}
              <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/40">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedSettings(!expandedSettings); }}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <span>Ajuster les barèmes (€/{material.unit})</span>
                  {expandedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                <AnimatePresence>
                  {expandedSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 pt-3 border-t border-slate-800 mt-2 text-xs">
                        <div className="flex justify-between items-center">
                          <label className="text-slate-300">Plus-value qualité (€/{material.unit})</label>
                          <input 
                            type="number"
                            value={material.plusValueQualite}
                            onChange={(e) => onChangeParams({ plusValueQualite: Number(e.target.value) || 0 })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 text-right bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-slate-300">Économie d'énergie fossile (€/{material.unit})</label>
                          <input 
                            type="number"
                            value={material.economieEnergie}
                            onChange={(e) => onChangeParams({ economieEnergie: Number(e.target.value) || 0 })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 text-right bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Step4Drying() {
  const materials = useSechoirStore((state) => state.materials);
  const toggleMaterial = useSechoirStore((state) => state.toggleMaterial);
  const updateMaterialVolume = useSechoirStore((state) => state.updateMaterialVolume);
  const updateMaterialParams = useSechoirStore((state) => state.updateMaterialParams);

  const activeMaterials = materials.filter(m => m.enabled && m.volume > 0);
  
  let totalDeltaProduits = 0;
  activeMaterials.forEach(m => {
    totalDeltaProduits += Number(m.volume || 0) * ((Number(m.plusValueQualite) || 0) + (Number(m.economieEnergie) || 0));
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 relative"
    >
      <div className="flex items-center space-x-3 text-emerald-400">
        <Leaf className="w-7 h-7" />
        <div>
          <h2 className="text-2xl font-bold text-white">Besoins en Séchage & Valorisation</h2>
          <p className="text-slate-300 text-sm">Configurez vos matières à sécher et visualisez les économies générées en temps réel.</p>
        </div>
      </div>

      <div className="space-y-3.5 pb-28 sm:pb-32">
        {materials.map((mat) => (
          <MaterialCard
            key={mat.id}
            material={mat}
            onToggle={() => toggleMaterial(mat.id)}
            onChangeVolume={(val) => updateMaterialVolume(mat.id, val)}
            onChangeParams={(params) => updateMaterialParams(mat.id, params)}
          />
        ))}
      </div>

      {/* Synthèse sticky en bas */}
      <div className="fixed bottom-0 left-0 right-0 sm:sticky bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-4 sm:p-5 sm:rounded-2xl sm:border sm:bg-slate-800/90 shadow-2xl z-20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Valorisation Agricole & Chaleur Solaire Totale
          </h3>
          <span className="text-xs text-emerald-400 font-semibold">
            {activeMaterials.length} matière(s) configurée(s)
          </span>
        </div>

        {activeMaterials.length > 0 ? (
          <div className="space-y-1 mb-3 max-h-24 overflow-y-auto">
            {activeMaterials.map(m => {
              const subtotal = Number(m.volume || 0) * ((Number(m.plusValueQualite) || 0) + (Number(m.economieEnergie) || 0));
              return (
                <div key={m.id} className="flex justify-between text-xs text-slate-300 border-b border-slate-700/50 pb-0.5">
                  <span>{m.label} ({m.volume} {m.unit})</span>
                  <span className="font-semibold text-emerald-400">+{fmt(subtotal)} €/an</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-3 italic">
            Activez une ou plusieurs matières ci-dessus et renseignez votre tonnage pour estimer vos gains.
          </p>
        )}

        <div className="flex justify-between items-center pt-2.5 border-t border-slate-700">
          <span className="font-bold text-sm text-white">Gain Annuel Total (Delta Produits)</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400">+{fmt(totalDeltaProduits)} €/an</span>
        </div>
      </div>
    </motion.div>
  );
}
