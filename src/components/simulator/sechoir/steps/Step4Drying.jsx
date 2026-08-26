import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ChevronDown, ChevronUp, Plus, Minus, TrendingUp, Sparkles } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

function HorizontalMaterialCard({ material, onToggle, onChangeVolume, onChangeParams }) {
  const [expandedSettings, setExpandedSettings] = useState(false);

  const vol = Number(material.volume || 0);
  const pvVal = Number(material.plusValueQualite || 0);
  const eeVal = Number(material.economieEnergie || 0);

  const gainQualite = vol * pvVal;
  const gainEnergie = vol * eeVal;
  const totalMatiere = gainQualite + gainEnergie;

  return (
    <div className={`rounded-2xl border transition-all duration-200 shadow-md flex flex-col justify-between p-3.5 ${
      material.enabled 
        ? 'bg-slate-800/90 border-emerald-500/60 shadow-emerald-500/10 ring-1 ring-emerald-500/40' 
        : 'bg-slate-800/40 border-slate-700/60 opacity-85 hover:opacity-100 hover:border-slate-600'
    }`}>
      {/* Haut de carte : Icône + Titre + Toggle */}
      <div>
        <div 
          className="flex items-start justify-between cursor-pointer select-none gap-2 pb-2" 
          onClick={onToggle}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`p-2 rounded-xl text-xl flex items-center justify-center shrink-0 transition-colors ${
              material.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
            }`}>
              <span>{material.icon || '🌿'}</span>
            </div>
            <div className="min-w-0">
              <span className={`font-bold text-xs sm:text-sm block truncate ${material.enabled ? 'text-white' : 'text-slate-300'}`} title={material.label}>
                {material.shortLabel || material.label}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">{material.unit}</span>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <div className={`w-10 h-5 rounded-full relative shrink-0 transition-colors mt-0.5 ${material.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <motion.div 
              layout
              className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 shadow-md"
              initial={false}
              animate={{ left: material.enabled ? '22px' : '3px' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </div>

        {/* Sous-titre complet si différent */}
        <p className="text-[10px] text-slate-400 line-clamp-2 min-h-[28px]">
          {material.description || material.label}
        </p>
      </div>

      {/* Zone de saisie Volume quand activé */}
      {material.enabled ? (
        <div className="mt-3 pt-2.5 border-t border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between gap-1 bg-slate-950/70 p-1.5 rounded-xl border border-slate-700">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChangeVolume(Math.max(0, vol - 10)); }}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors shrink-0"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input 
              type="number"
              min="0"
              step="5"
              value={material.volume === 0 ? '' : material.volume}
              onChange={(e) => onChangeVolume(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              onClick={(e) => e.stopPropagation()}
              className="w-16 text-center font-black bg-transparent text-white focus:outline-none text-xs"
            />
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChangeVolume(vol + 10); }}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Badge gain temps réel */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-1.5 text-center">
            <span className="text-[9px] uppercase font-bold text-emerald-400 block">Gain estimé</span>
            <strong className="text-xs font-black text-emerald-300">+{fmt(totalMatiere)} €/an</strong>
          </div>

          {/* Paramètres avancés ajustables */}
          <div className="pt-1">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpandedSettings(!expandedSettings); }}
              className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <span>Ajuster barèmes</span>
              {expandedSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            <AnimatePresence>
              {expandedSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2 text-[10px] bg-slate-900/90 p-2 rounded-xl border border-slate-800 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Qualité (€/t)</span>
                      <input 
                        type="number"
                        value={material.plusValueQualite}
                        onChange={(e) => onChangeParams({ plusValueQualite: Number(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 text-right bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-white font-bold"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Énergie (€/t)</span>
                      <input 
                        type="number"
                        value={material.economieEnergie}
                        onChange={(e) => onChangeParams({ economieEnergie: Number(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 text-right bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-white font-bold"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-2 border-t border-slate-700/40 text-center">
          <span className="text-[11px] text-slate-500 italic">Cliquer pour activer</span>
        </div>
      )}
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
      className="space-y-5 relative"
    >
      <div className="flex items-center space-x-3 text-emerald-400">
        <Leaf className="w-7 h-7 shrink-0" />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Besoins en Séchage & Valorisation</h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Activez et configurez vos besoins de séchage parmi les 5 filières pour estimer vos gains d'exploitation.
          </p>
        </div>
      </div>

      {/* 5 CHOIX ALIGNÉS SUR LA MÊME LIGNE EN DESKTOP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pb-24 sm:pb-28">
        {materials.map((mat) => (
          <HorizontalMaterialCard
            key={mat.id}
            material={mat}
            onToggle={() => toggleMaterial(mat.id)}
            onChangeVolume={(val) => updateMaterialVolume(mat.id, val)}
            onChangeParams={(params) => updateMaterialParams(mat.id, params)}
          />
        ))}
      </div>

      {/* SYNTHÈSE STICKY EN BAS */}
      <div className="fixed bottom-0 left-0 right-0 sm:sticky bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-4 sm:p-5 sm:rounded-2xl sm:border sm:bg-slate-800/90 shadow-2xl z-20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Valorisation Agricole & Chaleur Solaire Totale
          </h3>
          <span className="text-xs text-emerald-400 font-semibold">
            {activeMaterials.length} filière(s) active(s)
          </span>
        </div>

        {activeMaterials.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-300">
            {activeMaterials.map(m => {
              const subtotal = Number(m.volume || 0) * ((Number(m.plusValueQualite) || 0) + (Number(m.economieEnergie) || 0));
              return (
                <span key={m.id} className="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5">
                  <span>{m.shortLabel || m.label} ({m.volume} {m.unit}):</span>
                  <strong className="text-emerald-400">+{fmt(subtotal)} €/an</strong>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-3 italic">
            Activez au moins une filière ci-dessus et indiquez votre tonnage pour calculer les économies.
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
