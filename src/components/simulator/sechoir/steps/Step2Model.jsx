import React from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2 } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';

export default function Step2Model() {
  const selectedModelId = useSechoirStore((state) => state.selectedModelId);
  const setModel = useSechoirStore((state) => state.setModel);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="text-amber-500 w-6 h-6" />
          Modèle BatiTech®
        </h2>
        <p className="text-slate-300">
          Sélectionnez la configuration de séchoir adaptée à votre exploitation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {Object.entries(BATITECH_MODELS).map(([modelId, model], index) => {
          const isSelected = selectedModelId === modelId;
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={modelId}
              onClick={() => setModel(modelId)}
              className={`
                relative cursor-pointer rounded-2xl p-6 transition-all duration-300
                ${isSelected 
                  ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20 bg-slate-800/80' 
                  : 'bg-slate-800/40 border border-slate-700/50 hover:border-amber-400/30 hover:shadow-amber-400/10'}
              `}
            >
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="w-6 h-6 text-amber-400" />
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <div className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 rounded-full mb-2">
                    {model.zones} {model.zones > 1 ? 'zones' : 'zone'}
                  </div>
                  <h3 className="text-xl font-bold text-white">{model.name}</h3>
                </div>

                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between border-b border-slate-700/50 pb-2">
                    <span className="text-slate-400">Puissance</span>
                    <span className="font-semibold text-white">{model.puissanceKwc.toFixed(2)} kWc</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-2">
                    <span className="text-slate-400">Modules</span>
                    <span className="font-semibold text-white">{model.nbModules} Cogen'Air®</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-2">
                    <span className="text-slate-400">Dimensions</span>
                    <span className="font-semibold text-white">{model.dimensions}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Investissement</span>
                    <span className="font-bold text-amber-400">{formatCurrency(model.investissementBrut)} HT</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  {model.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
