import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen, Search, Trash2, FileDown, ExternalLink,
  Sun, Zap, Building2, Sliders, Calendar, MapPin, CheckCircle2,
  AlertCircle, ArrowUpRight, LayoutGrid, Table as TableIcon
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
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'

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
    <div className="w-full space-y-6 pb-12">
      
      {/* Header Pleine Largeur */}
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

          <div className="flex items-center gap-3">
            {/* Toggle Mode Vignettes / Mode Tableau */}
            <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setDisplayMode('grid')}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  displayMode === 'grid' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-300 hover:text-white'
                }`}
                title="Affichage Vignettes"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Vignettes</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  displayMode === 'table' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-300 hover:text-white'
                }`}
                title="Affichage Tableau"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Tableau</span>
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
              <strong>{simulations.length}</strong> étude(s)
            </div>
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
                className={`px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[280px]">
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

      {/* Contenu : Mode Vignettes OU Mode Tableau */}
      {filteredSimulations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Aucune simulation enregistrée</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Lancez une étude dans l'onglet Simulateurs et cliquez sur "Sauvegarder" pour retrouver votre dossier ici.
          </p>
        </div>
      ) : displayMode === 'grid' ? (
        
        /* ═══ VUE VIGNETTES (GRID) ═══ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSimulations.map((sim) => {
            const badge = getTypeBadge(sim.type || sim.projectType);
            const Icon = badge.icon;
            const formattedDate = sim.createdAt ? new Date(sim.createdAt).toLocaleDateString('fr-FR') : '-';

            return (
              <motion.div
                key={sim.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${badge.color}`}>
                      <Icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                      <Calendar className="w-3 h-3" />
                      {formattedDate}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm mb-1 leading-snug line-clamp-2">
                    {sim.title || sim.name || 'Simulation sans titre'}
                  </h3>

                  {(sim.address || sim.cityName) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{sim.address || sim.cityName}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Puissance</span>
                      <strong className="text-xs font-black text-slate-800">
                        {sim.kwc ? `${sim.kwc} kWc` : sim.power ? `${sim.power} kW` : '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Investissement</span>
                      <strong className="text-xs font-black text-slate-800">
                        {sim.totalInvestmentHT ? `${sim.totalInvestmentHT.toLocaleString('fr-FR')} €` : sim.resteACharge ? `${sim.resteACharge.toLocaleString('fr-FR')} €` : '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Gains / an</span>
                      <strong className="text-xs font-black text-emerald-600">
                        {sim.annualBenefitYear1 ? `+${sim.annualBenefitYear1.toLocaleString('fr-FR')} €` : sim.annualRevenue ? `+${sim.annualRevenue.toLocaleString('fr-FR')} €` : '-'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onDeleteSimulation(sim.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    title="Supprimer la simulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadSimulation(sim)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ouvrir
                    </button>

                    <button
                      type="button"
                      onClick={() => onExportPDF(sim)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0e2b4d] hover:bg-slate-900 text-white text-xs font-black transition-all flex items-center gap-1 shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      PDF A4
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        
        /* ═══ VUE TABLEAU (TABLE) ═══ */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Type Solution</th>
                  <th className="p-3.5">Titre / Dossier</th>
                  <th className="p-3.5">Localisation</th>
                  <th className="p-3.5 text-center">Puissance</th>
                  <th className="p-3.5 text-right">Investissement HT</th>
                  <th className="p-3.5 text-right text-emerald-700">Gains An 1</th>
                  <th className="p-3.5 text-center">Amortissement</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {filteredSimulations.map((sim) => {
                  const badge = getTypeBadge(sim.type || sim.projectType);
                  const Icon = badge.icon;
                  const formattedDate = sim.createdAt ? new Date(sim.createdAt).toLocaleDateString('fr-FR') : '-';

                  return (
                    <tr key={sim.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">{formattedDate}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${badge.color}`}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 max-w-[200px] truncate">{sim.title || sim.name}</td>
                      <td className="p-3.5 text-slate-500 max-w-[160px] truncate">{sim.address || sim.cityName || '-'}</td>
                      <td className="p-3.5 text-center font-bold">{sim.kwc ? `${sim.kwc} kWc` : sim.power ? `${sim.power} kW` : '-'}</td>
                      <td className="p-3.5 text-right font-black">{sim.totalInvestmentHT ? `${sim.totalInvestmentHT.toLocaleString('fr-FR')} €` : sim.resteACharge ? `${sim.resteACharge.toLocaleString('fr-FR')} €` : '-'}</td>
                      <td className="p-3.5 text-right font-black text-emerald-600">
                        {sim.annualBenefitYear1 ? `+${sim.annualBenefitYear1.toLocaleString('fr-FR')} €` : sim.annualRevenue ? `+${sim.annualRevenue.toLocaleString('fr-FR')} €` : '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold">{sim.paybackYear || 8} ans</td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLoadSimulation(sim)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                            title="Ouvrir la simulation"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onExportPDF(sim)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0e2b4d] hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1"
                            title="Générer PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSimulation(sim.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
