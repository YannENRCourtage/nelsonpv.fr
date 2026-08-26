import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Info } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { ORIENTATION_COEFFICIENTS } from '@/data/sechoirBatitechModels.js';

const ORIENTATIONS = [
  { id: 'Est', label: 'Est', angle: -90 },
  { id: 'Sud-Est', label: 'Sud-Est', angle: -45 },
  { id: 'Sud', label: 'Sud', angle: 0 },
  { id: 'Sud-Ouest', label: 'Sud-Ouest', angle: 45 },
  { id: 'Ouest', label: 'Ouest', angle: 90 },
];

export default function Step3Orientation() {
  const orientation = useSechoirStore((state) => state.orientation);
  const setOrientation = useSechoirStore((state) => state.setOrientation);

  // Fallback if ORIENTATION_COEFFICIENTS is not perfectly matched
  const getCoefficient = (orient) => {
    if (ORIENTATION_COEFFICIENTS && ORIENTATION_COEFFICIENTS[orient]) {
      return ORIENTATION_COEFFICIENTS[orient];
    }
    // Default mock coefficients if missing
    const defaults = { 'Est': 0.85, 'Sud-Est': 0.95, 'Sud': 1.00, 'Sud-Ouest': 0.95, 'Ouest': 0.85 };
    return defaults[orient] || 1.00;
  };

  const selectedOrientData = ORIENTATIONS.find((o) => o.id === orientation) || ORIENTATIONS[2];
  const coeff = getCoefficient(orientation || 'Sud');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Compass className="text-amber-500 w-6 h-6" />
          Orientation du Bâtiment
        </h2>
        <p className="text-slate-300">
          Choisissez l'orientation de la toiture principale du séchoir.
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-100/80">
          Inclinaison de toiture : 15° (Standard Charpente Barconnière)
        </p>
      </div>

      <div className="space-y-8">
        <div className="flex flex-wrap justify-center gap-3">
          {ORIENTATIONS.map((opt) => {
            const isSelected = orientation === opt.id || (!orientation && opt.id === 'Sud');
            
            return (
              <button
                key={opt.id}
                onClick={() => setOrientation(opt.id)}
                className={`
                  px-6 py-3 rounded-xl font-medium transition-all duration-300
                  ${isSelected 
                    ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-500/25 scale-105' 
                    : 'bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-amber-400/40 hover:bg-slate-700/60'}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-48 h-48 rounded-full border-4 border-slate-700 flex items-center justify-center bg-slate-800/30">
            {/* Cardinal points */}
            <div className="absolute top-2 text-slate-400 font-bold text-sm">N</div>
            <div className="absolute bottom-2 text-slate-400 font-bold text-sm">S</div>
            <div className="absolute right-2 text-slate-400 font-bold text-sm">E</div>
            <div className="absolute left-2 text-slate-400 font-bold text-sm">O</div>
            
            <motion.div 
              className="relative w-full h-full flex items-center justify-center"
              initial={false}
              animate={{ rotate: selectedOrientData.angle }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {/* Compass Needle */}
              <div className="w-1 h-32 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full shadow-lg relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-400 rotate-45 rounded-sm" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 border-2 border-amber-500 rounded-full z-10" />
              </div>
            </motion.div>
          </div>
          
          <motion.div
            key={orientation}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            <div className="text-sm text-slate-400 mb-1">Coefficient de production</div>
            <div className="text-2xl font-bold text-amber-400">{coeff.toFixed(2)}</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
