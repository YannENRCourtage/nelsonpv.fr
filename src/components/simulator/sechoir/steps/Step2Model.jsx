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
        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Building2 className="text-amber-500 w-7 h-7" />
          Modèle BatiTech®
        </h2>
        <p className="text-base text-slate-300">
          Sélectionnez la configuration de séchoir adaptée à votre exploitation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
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
                relative cursor-pointer rounded-3xl p-6 transition-all duration-300
                ${isSelected 
                  ? 'ring-2 ring-amber-400 shadow-xl shadow-amber-400/20 bg-slate-800/90' 
                  : 'bg-slate-800/40 border border-slate-700/60 hover:border-amber-400/40 hover:shadow-amber-400/10'}
              `}
            >
              {isSelected && (
                <div className="absolute top-5 right-5">
                  <CheckCircle2 className="w-7 h-7 text-amber-400" />
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <div className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold bg-amber-500/15 text-amber-400 rounded-full mb-2 border border-amber-500/30">
                    {model.zones} {model.zones > 1 ? 'zones' : 'zone'}
                  </div>
                  <h3 className="text-2xl font-black text-white">{model.name}</h3>
                </div>

                <div className="space-y-3 text-base text-slate-300">
                  <div className="flex justify-between border-b border-slate-700/60 pb-2.5">
                    <span className="text-slate-400 font-medium">Puissance</span>
                    <span className="font-bold text-white text-base">{(model?.puissanceKwc ? Number(model.puissanceKwc) : 30.15).toFixed(2)} kWc</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/60 pb-2.5">
                    <span className="text-slate-400 font-medium">Modules</span>
                    <span className="font-bold text-white text-base">{model.nbModules} Cogen'Air®</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/60 pb-2.5">
                    <span className="text-slate-400 font-medium">Dimensions</span>
                    <span className="font-bold text-amber-400 text-base">{model.dimensions}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400 font-medium">Investissement</span>
                    <span className="font-black text-white text-lg">{formatCurrency(model.investissementBrut)} HT</span>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mt-4 leading-relaxed">
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
