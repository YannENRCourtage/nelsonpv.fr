import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ChevronDown, ChevronUp, Plus, Minus, Check } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { calculateDeltaProduits } from '@/components/simulator/sechoir/sechoirCalculations.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

function MaterialCard({ material, onToggle, onChangeVolume, onChangeParams }) {
  const [expandedSettings, setExpandedSettings] = useState(false);

  return (
    <div className={`rounded-xl border transition-colors ${material.enabled ? 'bg-gray-800 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-lg ${material.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
            <span className="text-2xl" role="img" aria-label={material.label}>{material.icon || '🌿'}</span>
          </div>
          <span className={`font-medium text-lg ${material.enabled ? 'text-white' : 'text-gray-400'}`}>{material.label}</span>
        </div>
        
        {/* Toggle Switch */}
        <div className={`w-12 h-6 rounded-full relative transition-colors ${material.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}>
          <motion.div 
            layout
            className="w-4 h-4 rounded-full bg-white absolute top-1"
            initial={false}
            animate={{ left: material.enabled ? '26px' : '4px' }}
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
            <div className="p-4 pt-0 border-t border-gray-700/50 mt-2">
              <div className="flex items-center space-x-4 py-4">
                <label className="text-sm text-gray-300 flex-1">Volume traité ({material.unit}/an)</label>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => onChangeVolume(Math.max(0, material.volume - 10))}
                    className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input 
                    type="number"
                    value={material.volume}
                    onChange={(e) => onChangeVolume(Number(e.target.value))}
                    className="w-20 text-center bg-gray-900 border border-gray-600 rounded p-1 text-white"
                  />
                  <button 
                    onClick={() => onChangeVolume(material.volume + 10)}
                    className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 bg-gray-900/50 rounded-lg p-3">
                <button 
                  onClick={() => setExpandedSettings(!expandedSettings)}
                  className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <span>Ajuster la valorisation</span>
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
                      <div className="space-y-3 pt-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-gray-400">Plus-value qualité (€/{material.unit})</label>
                          <input 
                            type="number"
                            value={material.plusValueQualite}
                            onChange={(e) => onChangeParams({ plusValueQualite: Number(e.target.value) })}
                            className="w-20 text-right bg-gray-800 border border-gray-600 rounded p-1 text-sm text-white"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-gray-400">Économie d'énergie fossile (€/{material.unit})</label>
                          <input 
                            type="number"
                            value={material.economieEnergie}
                            onChange={(e) => onChangeParams({ economieEnergie: Number(e.target.value) })}
                            className="w-20 text-right bg-gray-800 border border-gray-600 rounded p-1 text-sm text-white"
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

  const ventesElectricitePV = 4000;
  
  const activeMaterials = materials.filter(m => m.enabled);
  let totalMatiere = 0;
  activeMaterials.forEach(m => {
    totalMatiere += m.volume * ((m.plusValueQualite || 0) + (m.economieEnergie || 0));
  });

  const totalDeltaProduits = totalMatiere + ventesElectricitePV;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 relative"
    >
      <div className="flex items-center space-x-3 text-emerald-400 mb-6">
        <Leaf className="w-8 h-8" />
        <div>
          <h2 className="text-2xl font-bold text-white">Besoins en Séchage & Valorisation</h2>
          <p className="text-gray-400">Configurez vos besoins en séchage pour chaque matière et ajustez la valorisation.</p>
        </div>
      </div>

      <div className="space-y-4 pb-32">
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

      {/* Sticky Summary */}
      <div className="fixed bottom-0 left-0 right-0 lg:sticky bg-gray-900 border-t border-gray-800 p-4 lg:p-6 lg:rounded-xl lg:border lg:bg-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none z-10">
        <h3 className="text-lg font-semibold text-white mb-4">Valorisation Agricole & Chaleur Solaire Totale</h3>
        <div className="space-y-2 mb-4">
          {activeMaterials.map(m => (
            <div key={m.id} className="flex justify-between text-sm text-gray-300 border-b border-gray-700/50 pb-1">
              <span>{m.label} ({m.volume} {m.unit})</span>
              <span>{fmt(m.volume * ((m.plusValueQualite || 0) + (m.economieEnergie || 0)))} €/an</span>
            </div>
          ))}
          <div className="flex justify-between text-sm text-gray-300">
            <span>Vente électricité PV</span>
            <span>{fmt(ventesElectricitePV)} €/an</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-700">
          <span className="font-medium text-white">Total Delta Produits</span>
          <span className="text-2xl font-bold text-amber-500">{fmt(totalDeltaProduits)} €/an</span>
        </div>
      </div>
    </motion.div>
  );
}
