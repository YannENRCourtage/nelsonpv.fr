import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ChevronDown, ChevronUp, Plus, Minus, TrendingUp, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, getDryingCapacity } from '@/data/sechoirBatitechModels.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

function HorizontalMaterialCard({ material, maxCapacity, modelName, onToggle, onChangeVolume, onChangeParams }) {
  const [expandedSettings, setExpandedSettings] = useState(false);

  const vol = Number(material.volume || 0);
  const pvVal = Number(material.plusValueQualite || 0);
  const eeVal = Number(material.economieEnergie || 0);

  const gainQualite = vol * pvVal;
  const gainEnergie = vol * eeVal;
  const totalMatiere = gainQualite + gainEnergie;

  const isOverCapacity = maxCapacity && vol > maxCapacity;

  return (
    <div 
      onClick={!material.enabled ? onToggle : undefined}
      className={`rounded-3xl border transition-all duration-200 shadow-md flex flex-col justify-between p-4 ${
        material.enabled 
          ? 'bg-slate-800/95 border-emerald-500/60 shadow-emerald-500/10 ring-1 ring-emerald-500/40' 
          : 'bg-slate-800/40 border-slate-700/60 opacity-85 hover:opacity-100 hover:border-emerald-500/50 cursor-pointer'
      }`}>
      {/* Haut de carte : Icône + Titre + Toggle */}
      <div>
        <div 
          className="flex items-start justify-between cursor-pointer select-none gap-2 pb-2.5" 
          onClick={onToggle}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`p-2.5 rounded-2xl text-2xl flex items-center justify-center shrink-0 transition-colors ${
              material.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
            }`}>
              <span>{material.icon || '🌿'}</span>
            </div>
            <div className="min-w-0">
              <span className={`font-black text-base sm:text-lg block truncate ${material.enabled ? 'text-white' : 'text-slate-300'}`} title={material.label}>
                {material.shortLabel || material.label}
              </span>
              <span className="text-sm text-slate-300 block truncate font-medium">{material.unit}</span>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <div className={`w-11 h-6 rounded-full relative shrink-0 transition-colors mt-0.5 ${material.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <motion.div 
              layout
              className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-md"
              initial={false}
              animate={{ left: material.enabled ? '24px' : '4px' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 line-clamp-2 min-h-[38px] leading-relaxed">
          {material.description || material.label}
        </p>

        {/* Capacité maximale du modèle choisi */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mt-2 pt-2 border-t border-slate-700/60">
          <span>Capacité modèle :</span>
          <span className="text-amber-400 font-bold">{maxCapacity ? `${maxCapacity} ${material.unit}` : '—'}</span>
        </div>
      </div>

      {/* Zone de saisie Volume quand activé */}
      {material.enabled ? (
        <div className="mt-3 pt-3 border-t border-slate-700/70 space-y-2.5">
          <div className="flex items-center justify-between gap-1.5 bg-slate-950/80 p-2 rounded-2xl border border-slate-700">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChangeVolume(Math.max(0, vol - 10)); }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors shrink-0"
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
              className="w-20 text-center font-black bg-transparent text-white focus:outline-none text-base"
            />
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChangeVolume(vol + 10); }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Indicateur de respect / dépassement de la capacité */}
          {vol > 0 && maxCapacity && (
            isOverCapacity ? (
              <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl px-2.5 py-1 text-[11px] text-amber-300 font-bold flex items-center justify-between shadow-sm">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  Capacité conseillée ({maxCapacity} {material.unit})
                </span>
                <span className="text-amber-400 font-black">+{vol - maxCapacity}</span>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-2.5 py-1 text-[11px] text-slate-300 font-medium flex items-center justify-between shadow-sm">
                <span className="flex items-center gap-1 text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  Remplissage
                </span>
                <span className="text-emerald-400 font-bold">{Math.round((vol / maxCapacity) * 100)}% ({vol}/{maxCapacity})</span>
              </div>
            )
          )}

          {/* Badge gain temps réel */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-2.5 text-center shadow-sm">
            <span className="text-xs uppercase font-bold text-emerald-400 block tracking-wider">Gain estimé</span>
            <strong className="text-base font-black text-emerald-300">+{fmt(totalMatiere)} €/an</strong>
          </div>

          {/* Paramètres avancés ajustables */}
          <div className="pt-1">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpandedSettings(!expandedSettings); }}
              className="flex items-center justify-between w-full text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              <span>Ajuster barèmes</span>
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
                  <div className="space-y-2 pt-2.5 text-sm bg-slate-900/90 p-3 rounded-2xl border border-slate-800 mt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Qualité (€/t)</span>
                      <input 
                        type="number"
                        value={material.plusValueQualite}
                        onChange={(e) => onChangeParams({ plusValueQualite: Number(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 text-right bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Énergie (€/t)</span>
                      <input 
                        type="number"
                        value={material.economieEnergie}
                        onChange={(e) => onChangeParams({ economieEnergie: Number(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 text-right bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-2.5 border-t border-slate-700/40 text-center">
          <span className="text-sm text-slate-400 italic">Cliquer pour activer</span>
        </div>
      )}
    </div>
  );
}

export default function Step4Drying() {
  const materials = useSechoirStore((state) => state.materials);
  const selectedModelId = useSechoirStore((state) => state.selectedModelId);
  const departement = useSechoirStore((state) => state.departement) || '32';
  const toggleMaterial = useSechoirStore((state) => state.toggleMaterial);
  const updateMaterialVolume = useSechoirStore((state) => state.updateMaterialVolume);
  const updateMaterialParams = useSechoirStore((state) => state.updateMaterialParams);

  const activeModel = BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'];
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
        <Leaf className="w-9 h-9 shrink-0" />
        <div>
          <h2 className="text-3xl font-black text-white">Besoins en Séchage &amp; Valorisation</h2>
          <p className="text-lg text-slate-300">
            Activez et configurez vos besoins de séchage pour le modèle <strong className="text-amber-400">{activeModel.name}</strong> ({activeModel.dimensions} — {activeModel.zones} cellule{activeModel.zones > 1 ? 's' : ''}) pour estimer vos gains d'exploitation.
          </p>
        </div>
      </div>

      {/* 5 CHOIX ALIGNÉS SUR LA MÊME LIGNE EN DESKTOP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-24 sm:pb-28">
        {materials.map((mat) => {
          const cap = getDryingCapacity(selectedModelId, mat.id, departement) || activeModel?.capacitesMax?.[mat.id];
          return (
            <HorizontalMaterialCard
              key={mat.id}
              material={mat}
              maxCapacity={cap}
              modelName={activeModel.name}
              onToggle={() => toggleMaterial(mat.id)}
              onChangeVolume={(val) => updateMaterialVolume(mat.id, val)}
              onChangeParams={(params) => updateMaterialParams(mat.id, params)}
            />
          );
        })}
      </div>

      {/* SYNTHÈSE STICKY EN BAS */}
      <div className="fixed bottom-0 left-0 right-0 sm:sticky bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-5 sm:rounded-3xl sm:border sm:bg-slate-800/90 shadow-2xl z-20">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Valorisation Agricole &amp; Chaleur Solaire Totale
          </h3>
          <span className="text-base text-emerald-400 font-bold">
            {activeMaterials.length} filière(s) active(s)
          </span>
        </div>

        {activeMaterials.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3.5 text-base text-slate-200">
            {activeMaterials.map(m => {
              const subtotal = Number(m.volume || 0) * ((Number(m.plusValueQualite) || 0) + (Number(m.economieEnergie) || 0));
              return (
                <span key={m.id} className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
                  <span>{m.shortLabel || m.label} ({m.volume} {m.unit}):</span>
                  <strong className="text-emerald-400 font-bold">+{fmt(subtotal)} €/an</strong>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-base text-slate-400 mb-3.5 italic">
            Activez au moins une filière ci-dessus et indiquez votre tonnage pour calculer les économies.
          </p>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-700">
          <span className="font-black text-lg text-white">Gain Annuel Total (Delta Produits)</span>
          <span className="text-3xl sm:text-4xl font-black text-amber-400">+{fmt(totalDeltaProduits)} €/an</span>
        </div>
      </div>
    </motion.div>
  );
}
