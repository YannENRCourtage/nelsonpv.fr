import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen, Search, Trash2, FileDown, ExternalLink,
  Sun, Zap, Building2, Sliders, Calendar, MapPin, CheckCircle2, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function SimulatorArchivesTab({
  simulations = [],
  onLoadSimulation,
  onDeleteSimulation,
  onExportPDF
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'autoconsommation' | 'toiture_pv' | 'structure_metallique' | 'irve'
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSimulations = simulations.filter(sim => {
    const matchType = filterType === 'all' || sim.type === filterType || (filterType === 'irve' && sim.projectType === 'irve') || (filterType === 'autoconsommation' && sim.projectType === 'solar');
    const matchSearch = !searchQuery || 
      (sim.title || sim.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sim.address || sim.cityName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'autoconsommation':
      case 'solar':
        return { label: 'Autoconsommation Solaire', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Sun };
      case 'toiture_pv':
        return { label: 'Toiture Photovoltaïque', color: 'bg-amber-100 text-amber-900 border-amber-200', icon: Building2 };
      case 'structure_metallique':
        return { label: 'Structure Métallique', color: 'bg-blue-100 text-blue-900 border-blue-200', icon: Sliders };
      case 'irve':
      default:
        return { label: 'Recharge IRVE', color: 'bg-purple-100 text-purple-900 border-purple-200', icon: Zap };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-amber-400 block mb-0.5">
                Historique &amp; Études Réalisées
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Archives des Simulations
              </h2>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10">
            <strong>{simulations.length}</strong> étude(s) enregistrée(s)
          </div>
        </div>

        {/* Filtres & Recherche */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'autoconsommation', label: 'Autoconsommation' },
              { id: 'toiture_pv', label: 'Toiture PV' },
              { id: 'structure_metallique', label: 'Bâtiment 3D' },
              { id: 'irve', label: 'IRVE' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-amber-500 text-white shadow-md font-black'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une simulation..."
              className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:bg-white/20"
            />
          </div>
        </div>
      </div>

      {/* Liste des simulations */}
      {filteredSimulations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-700">Aucune simulation trouvée</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Lancez une simulation dans l'un des 4 simulateurs et cliquez sur "Sauvegarder l'étude" pour la retrouver ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSimulations.map((sim) => {
            const badge = getTypeBadge(sim.type || sim.projectType);
            const Icon = badge.icon;
            return (
              <div
                key={sim.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border ${badge.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {sim.createdAt ? new Date(sim.createdAt).toLocaleDateString('fr-FR') : 'Récent'}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 leading-tight">
                    {sim.title || sim.name || 'Simulation Solaire'}
                  </h4>

                  {sim.address && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{sim.address}</span>
                    </p>
                  )}
                </div>

                {/* Métriques clés */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Puissance</span>
                    <strong className="text-slate-800 text-sm">
                      {sim.kwc ? `${sim.kwc} kWc` : sim.power ? `${sim.power} kW` : '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Investissement</span>
                    <strong className="text-slate-800 text-sm">
                      {sim.totalInvestmentHT ? `${sim.totalInvestmentHT.toLocaleString('fr-FR')} €` : sim.resteACharge ? `${sim.resteACharge.toLocaleString('fr-FR')} €` : '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Gains / an</span>
                    <strong className="text-emerald-600 text-sm">
                      {sim.annualBenefitYear1 ? `+${sim.annualBenefitYear1.toLocaleString('fr-FR')} €` : sim.annualRevenue ? `+${sim.annualRevenue.toLocaleString('fr-FR')} €` : '-'}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onDeleteSimulation && onDeleteSimulation(sim.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Supprimer la simulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadSimulation && onLoadSimulation(sim)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Ouvrir
                    </button>

                    <button
                      type="button"
                      onClick={() => onExportPDF && onExportPDF(sim)}
                      className="px-4 py-1.5 bg-[#0e2b4d] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      PDF A4
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
