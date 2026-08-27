import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ChevronDown, ChevronUp, Plus, Minus, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, getDryingCapacity, DRYING_YIELDS } from '@/data/sechoirBatitechModels.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

function HorizontalMaterialCard({ material, maxCapacity, modelName, onToggle, onChangeVolume, onChangeParams }) {
  const [expandedSettings, setExpandedSettings] = useState(false);

  const vol = Number(material.volume || 0);
  const pvVal = Number(material.plusValueQualite || 0);
  const eeVal = Number(material.economieEnergie || 0);
  const yieldVal = Number(material.yieldPerHa || DRYING_YIELDS[material.id] || 6.0);

  // État local pour la saisie fluide de la surface (Ha)
  const [surfaceInput, setSurfaceInput] = useState(() => {
    return vol > 0 ? String(Math.round((vol / yieldVal) * 10) / 10) : '';
  });

  // Synchronisation de la surface lorsque le tonnage (volume) change depuis l'extérieur (boutons +/- ou reset)
  useEffect(() => {
    if (vol > 0) {
      const derived = Math.round((vol / yieldVal) * 10) / 10;
      if (parseFloat(surfaceInput) !== derived) {
        setSurfaceInput(String(derived));
      }
    } else if (vol === 0 && surfaceInput !== '') {
      setSurfaceInput('');
    }
  }, [vol, yieldVal]);

  // Handler saisie Surface (Ha) -> Met à jour Tonnage (t MS/an)
  const handleSurfaceChange = (e) => {
    const raw = e.target.value;
    setSurfaceInput(raw);
    if (raw === '' || raw === null) {
      onChangeVolume(0);
      return;
    }
    const num = parseFloat(raw.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      const calculatedTonnage = Math.round(num * yieldVal);
      onChangeVolume(calculatedTonnage);
    }
  };

  // Handler saisie Tonnage (t MS/an) -> Met à jour Surface (Ha)
  const handleVolumeChange = (newVol) => {
    const safeVol = Math.max(0, Math.round(newVol) || 0);
    onChangeVolume(safeVol);
    if (safeVol > 0) {
      setSurfaceInput(String(Math.round((safeVol / yieldVal) * 10) / 10));
    } else {
      setSurfaceInput('');
    }
  };

  const gainQualite = vol * pvVal;
  const gainEnergie = vol * eeVal;
  const totalMatiere = gainQualite + gainEnergie;

  const isOverCapacity = maxCapacity && vol > maxCapacity;

  return (
    <div 
      onClick={!material.enabled ? onToggle : undefined}
      className={`rounded-3xl border transition-all duration-200 shadow-md flex flex-col justify-between p-4 sm:p-5 ${
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
            <div className={`p-2.5 rounded-2xl text-2xl sm:text-3xl flex items-center justify-center shrink-0 transition-colors ${
              material.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
            }`}>
              <span>{material.icon || '🌿'}</span>
            </div>
            <div className="min-w-0">
              <span className={`font-black text-lg sm:text-xl block truncate ${material.enabled ? 'text-white' : 'text-slate-200'}`} title={material.label}>
                {material.shortLabel || material.label}
              </span>
              <span className="text-sm sm:text-base text-slate-300 block truncate font-semibold">{material.unit}</span>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <div className={`w-11 h-6 rounded-full relative shrink-0 transition-colors mt-1 ${material.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
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
        <p className="text-sm sm:text-base text-slate-300 line-clamp-2 min-h-[42px] leading-relaxed">
          {material.description || material.label}
        </p>

        {/* Capacité maximale du modèle choisi */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-300 mt-2.5 pt-2.5 border-t border-slate-700/60">
          <span>Capacité modèle :</span>
          <span className="text-amber-400 font-extrabold text-sm sm:text-base">{maxCapacity ? `${maxCapacity} ${material.unit}` : '—'}</span>
        </div>
      </div>

      {/* Zone de saisie Volume & Surface quand activé */}
      {material.enabled ? (
        <div className="mt-3.5 pt-3.5 border-t border-slate-700/70 space-y-2.5">
          {/* LIGNE 1 : Saisie de la Surface (Ha) élargie */}
          <div className="bg-slate-950/80 p-2.5 px-3 rounded-2xl border border-slate-700 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-black text-slate-200 truncate">
                Surface exploitée
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                Rendement : {yieldVal} t/ha
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input 
                type="number"
                min="0"
                step="0.5"
                value={surfaceInput}
                onChange={handleSurfaceChange}
                placeholder="0"
                onClick={(e) => e.stopPropagation()}
                className="w-24 sm:w-28 text-center font-black bg-slate-900/90 text-emerald-400 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-base sm:text-lg focus:outline-none"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-300">Ha</span>
            </div>
          </div>

          {/* LIGNE 2 : Contrôleur Tonnage (t MS/an) avec boutons [-] et [+] */}
          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-700 flex items-center justify-between gap-1 shadow-inner">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); handleVolumeChange(Math.max(0, vol - (vol >= 100 ? 20 : 10))); }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors shrink-0 active:scale-95"
              title="Diminuer le tonnage"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-1">
              <input 
                type="number"
                min="0"
                step="5"
                value={vol === 0 ? '' : vol}
                onChange={(e) => handleVolumeChange(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                onClick={(e) => e.stopPropagation()}
                className="w-20 text-center font-black bg-transparent text-white focus:outline-none text-base sm:text-lg"
              />
              <span className="text-xs sm:text-sm text-slate-300 font-bold whitespace-nowrap">t MS/an</span>
            </div>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); handleVolumeChange(vol + (vol >= 100 ? 20 : 10)); }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-colors shrink-0 active:scale-95"
              title="Augmenter le tonnage"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Indicateur de respect / dépassement de la capacité */}
          {vol > 0 && maxCapacity && (
            isOverCapacity ? (
              <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-amber-300 font-bold flex items-center justify-between shadow-sm">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Capacité ({maxCapacity} {material.unit})
                </span>
                <span className="text-amber-400 font-black">+{vol - maxCapacity}</span>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-slate-300 font-medium flex items-center justify-between shadow-sm">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Remplissage
                </span>
                <span className="text-emerald-400 font-bold">{Math.round((vol / maxCapacity) * 100)}% ({vol}/{maxCapacity})</span>
              </div>
            )
          )}

          {/* Badge gain temps réel */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-2.5 text-center shadow-sm">
            <span className="text-xs uppercase font-bold text-emerald-400 block tracking-wider">Gain estimé</span>
            <strong className="text-lg sm:text-xl font-black text-emerald-300">+{fmt(totalMatiere)} €/an</strong>
          </div>

          {/* Paramètres avancés ajustables */}
          <div className="pt-1">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpandedSettings(!expandedSettings); }}
              className="flex items-center justify-between w-full text-sm sm:text-base font-bold text-slate-300 hover:text-white transition-colors"
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
                  <div className="space-y-2.5 pt-2.5 text-sm sm:text-base bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 mt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs sm:text-sm font-semibold">Rendement (t/ha)</span>
                      <input 
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={material.yieldPerHa || yieldVal}
                        onChange={(e) => onChangeParams({ yieldPerHa: Number(e.target.value) || yieldVal })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 text-right bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs sm:text-sm font-semibold">Qualité (€/t)</span>
                      <input 
                        type="number"
                        value={material.plusValueQualite}
                        onChange={(e) => onChangeParams({ plusValueQualite: Number(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 text-right bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs sm:text-sm font-semibold">Énergie (€/t)</span>
                      <input 
                        type="number"
                        value={material.economieEnergie}
                        onChange={(e) => onChangeParams({ economieEnergie: Number(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 text-right bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 pt-3 border-t border-slate-700/40 text-center">
          <span className="text-sm sm:text-base text-slate-300 italic font-medium">Cliquer pour activer</span>
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
              const yieldVal = Number(m.yieldPerHa || DRYING_YIELDS[m.id] || 6.0);
              const surfaceVal = Math.round((Number(m.volume || 0) / yieldVal) * 10) / 10;
              return (
                <span key={m.id} className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
                  <span>{m.shortLabel || m.label} ({m.volume} {m.unit} • {surfaceVal} Ha):</span>
                  <strong className="text-emerald-400 font-bold">+{fmt(subtotal)} €/an</strong>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-base text-slate-400 mb-3.5 italic">
            Activez au moins une filière ci-dessus et indiquez votre surface ou tonnage pour calculer les économies.
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
