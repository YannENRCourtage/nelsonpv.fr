import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Zap, Sun, Building2, Sliders, CheckCircle2,
  Euro, Info, Table, Plus, Trash2
} from 'lucide-react';
import { useSimulatorSettingsStore, DEFAULT_ECO_EVO_CATALOG } from '@/stores/useSimulatorSettingsStore';
import { toast } from '@/components/ui/use-toast';

export default function SimulatorDatabaseTab() {
  const {
    settings,
    updateIrveSettings,
    updateAutoconsoSettings,
    updateToiturePvSettings,
    updateStructureSettings,
    updateEcoEvoItem
  } = useSimulatorSettingsStore();

  const [activeSubTab, setActiveSubTab] = useState('structure'); // 'irve' | 'autoconso' | 'toiture' | 'structure'

  const irve = settings.irve;
  const auto = settings.autoconsommation;
  const toiture = settings.toiturePv;
  const struct = settings.structure;
  const ecoEvoCatalog = struct.ecoEvoCatalog || DEFAULT_ECO_EVO_CATALOG;

  return (
    <div className="w-full space-y-6 pb-12">
      
      {/* Header Pleine Largeur */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-blue-400 block mb-0.5">
                Back-Office / Paramétrage
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Base de données des Solutions &amp; Tarifs
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Sauvegarde automatique en direct
          </div>
        </div>

        {/* 4 Onglets de Solutions */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {[
            { id: 'structure', label: '1. Structure Métallique & ECO-EVO', icon: Sliders },
            { id: 'autoconso', label: '2. Autoconsommation', icon: Sun },
            { id: 'toiture', label: '3. Toiture Photovoltaïque', icon: Building2 },
            { id: 'irve', label: '4. Borne IRVE', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 1. STRUCTURE MÉTALLIQUE & GAMME ECO-EVO ══════════════════════════ */}
      {activeSubTab === 'structure' && (
        <div className="space-y-6">
          
          {/* Barèmes Gros-Œuvre */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Barèmes Gros-Œuvre Métallique (€ / m² au sol)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Charpente Métallique (€/m²)</label>
                <input
                  type="number"
                  value={struct.charpenteCostM2}
                  onChange={(e) => updateStructureSettings({ charpenteCostM2: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Couverture Bac Acier (€/m²)</label>
                <input
                  type="number"
                  value={struct.couvertureBacAcierM2}
                  onChange={(e) => updateStructureSettings({ couvertureBacAcierM2: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Plots &amp; Fondations Béton (€/m²)</label>
                <input
                  type="number"
                  value={struct.fondationsCostM2}
                  onChange={(e) => updateStructureSettings({ fondationsCostM2: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Raccordement Standard (€ HT)</label>
                <input
                  type="number"
                  value={struct.raccordementStandard}
                  onChange={(e) => updateStructureSettings({ raccordementStandard: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* TABLEAU COMPLET DE LA GAMME ECO & EVO */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-indigo-600" />
                  Grille Tarifaire Gamme ECO &amp; EVO (Bâtiments Standards)
                </h3>
                <p className="text-xs text-slate-500">
                  Tous les modèles de hangars solaires avec décomposition des coûts et calcul automatique de la soulte tiers-investisseur.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Gamme</th>
                    <th className="p-3">Modèle / Nom</th>
                    <th className="p-3 text-center">Dim. (L × l)</th>
                    <th className="p-3 text-center">Surface</th>
                    <th className="p-3 text-center">Puissance PV</th>
                    <th className="p-3 text-right">Charpente (€)</th>
                    <th className="p-3 text-right">Couverture (€)</th>
                    <th className="p-3 text-right">Fondations (€)</th>
                    <th className="p-3 text-right">Centrale PV (€)</th>
                    <th className="p-3 text-right text-emerald-700">Soulte (€)</th>
                    <th className="p-3 text-right text-purple-700">Reste à Charge (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {ecoEvoCatalog.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          item.gamme === 'ECO' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {item.gamme}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.name}</td>
                      <td className="p-3 text-center">{item.length}m × {item.width}m</td>
                      <td className="p-3 text-center font-bold">{item.length * item.width} m²</td>
                      <td className="p-3 text-center font-black text-blue-600">{item.kwc} kWc</td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={item.charpentePrice}
                          onChange={(e) => updateEcoEvoItem(item.id, { charpentePrice: Number(e.target.value) })}
                          className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={item.couverturePrice}
                          onChange={(e) => updateEcoEvoItem(item.id, { couverturePrice: Number(e.target.value) })}
                          className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={item.fondationsPrice}
                          onChange={(e) => updateEcoEvoItem(item.id, { fondationsPrice: Number(e.target.value) })}
                          className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={item.pvPrice}
                          onChange={(e) => updateEcoEvoItem(item.id, { pvPrice: Number(e.target.value) })}
                          className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        +{item.soulte.toLocaleString('fr-FR')} €
                      </td>
                      <td className="p-3 text-right font-black text-purple-600">
                        {item.resteACharge.toLocaleString('fr-FR')} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2. AUTOCONSOMMATION ═══════════════════════════════════════════════ */}
      {activeSubTab === 'autoconso' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            Grille Tarifaire Clé en Main Autoconsommation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Valorisation Autoconsommation (€/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={auto.defaultValorisationAutoconso}
                onChange={(e) => updateAutoconsoSettings({ defaultValorisationAutoconso: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rachat Surplus EDF OA (€/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={auto.defaultValorisationSurplus}
                onChange={(e) => updateAutoconsoSettings({ defaultValorisationSurplus: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Inflation annuelle électricité (%)</label>
              <input
                type="number"
                step="0.1"
                value={auto.defaultElectricityInflation}
                onChange={(e) => updateAutoconsoSettings({ defaultElectricityInflation: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ 3. TOITURE PHOTOVOLTAÏQUE ════════════════════════════════════════ */}
      {activeSubTab === 'toiture' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            Tarifs Grandes Toitures &amp; Revente Totale
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Coût d'installation moyen (€/kWc)</label>
              <input
                type="number"
                value={toiture.installationCostPerKwc}
                onChange={(e) => updateToiturePvSettings({ installationCostPerKwc: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Loyer Annuel Toiture (€/m²/an)</label>
              <input
                type="number"
                step="0.1"
                value={toiture.loyerAnnuelM2Toiture}
                onChange={(e) => updateToiturePvSettings({ loyerAnnuelM2Toiture: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Coût raccordement de base (€)</label>
              <input
                type="number"
                value={toiture.raccordementCostBase}
                onChange={(e) => updateToiturePvSettings({ raccordementCostBase: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. BORNE IRVE ════════════════════════════════════════════════════ */}
      {activeSubTab === 'irve' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            Catalogue Matériel Bornes de Recharge
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Marge par recharge par défaut (€)</label>
              <input
                type="number"
                step="0.1"
                value={irve.defaultMarginPerRecharge}
                onChange={(e) => updateIrveSettings({ defaultMarginPerRecharge: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Frais de pose par borne (€ HT)</label>
              <input
                type="number"
                value={irve.defaultInstallFeePerPoint}
                onChange={(e) => updateIrveSettings({ defaultInstallFeePerPoint: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Taux financement crédit-bail (%)</label>
              <input
                type="number"
                step="0.1"
                value={irve.financeInterestRate}
                onChange={(e) => updateIrveSettings({ financeInterestRate: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
