import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Zap, Sun, Building2, Sliders, Save, RotateCcw,
  Plus, Trash2, CheckCircle2, AlertCircle, Euro, Info
} from 'lucide-react';
import { useSimulatorSettingsStore, DEFAULT_DATABASE_SETTINGS } from '@/stores/useSimulatorSettingsStore';
import { toast } from '@/components/ui/use-toast';

export default function SimulatorDatabaseTab() {
  const {
    settings,
    updateIrveSettings,
    updateAutoconsoSettings,
    updateToiturePvSettings,
    updateStructureSettings,
    resetToDefaults
  } = useSimulatorSettingsStore();

  const [activeSubTab, setActiveSubTab] = useState('irve'); // 'irve' | 'autoconso' | 'toiture' | 'structure'

  // États locaux éditables
  const [irveState, setIrveState] = useState(settings.irve);
  const [autoconsoState, setAutoconsoState] = useState(settings.autoconsommation);
  const [toitureState, setToitureState] = useState(settings.toiturePv);
  const [structureState, setStructureState] = useState(settings.structure);

  const handleSaveAll = () => {
    updateIrveSettings(irveState);
    updateAutoconsoSettings(autoconsoState);
    updateToiturePvSettings(toitureState);
    updateStructureSettings(structureState);
    toast({
      title: 'Paramètres enregistrés',
      description: 'La base de données du simulateur a été mise à jour avec succès.',
    });
  };

  const handleResetSection = (section) => {
    resetToDefaults(section);
    if (section === 'irve') setIrveState(DEFAULT_DATABASE_SETTINGS.irve);
    if (section === 'autoconsommation') setAutoconsoState(DEFAULT_DATABASE_SETTINGS.autoconsommation);
    if (section === 'toiturePv') setToitureState(DEFAULT_DATABASE_SETTINGS.toiturePv);
    if (section === 'structure') setStructureState(DEFAULT_DATABASE_SETTINGS.structure);
    toast({
      title: 'Paramètres réinitialisés',
      description: 'Les valeurs par défaut ont été restaurées.',
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
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
                Base de données des Solutions
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleResetSection(activeSubTab === 'autoconso' ? 'autoconsommation' : activeSubTab === 'toiture' ? 'toiturePv' : activeSubTab)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
            >
              <Save className="w-3.5 h-3.5" />
              Enregistrer tout
            </button>
          </div>
        </div>

        {/* 4 Onglets de Solutions */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {[
            { id: 'irve', label: '1. Borne IRVE', icon: Zap },
            { id: 'autoconso', label: '2. Autoconsommation', icon: Sun },
            { id: 'toiture', label: '3. Toiture Photovoltaïque', icon: Building2 },
            { id: 'structure', label: '4. Structure Métallique', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
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

      {/* ═══ 1. BASE DE DONNÉES IRVE ════════════════════════════════════════════ */}
      {activeSubTab === 'irve' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Gamme Commerciale &amp; Tarifs des Bornes IRVE
            </h3>
            <p className="text-xs text-slate-500">
              Modifiez les prix de vente HT, les puissances et les usages cibles de chaque modèle.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Puissance (kW)</th>
                  <th className="p-3">Prix Vente HT (€)</th>
                  <th className="p-3">Usage Cible</th>
                  <th className="p-3">Positionnement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {irveState.products.map((prod, idx) => (
                  <tr key={prod.id || idx}>
                    <td className="p-3 font-bold text-slate-800">
                      <input
                        type="number"
                        value={prod.power}
                        onChange={(e) => {
                          const updated = [...irveState.products];
                          updated[idx] = { ...updated[idx], power: Number(e.target.value) };
                          setIrveState({ ...irveState, products: updated });
                        }}
                        className="w-16 p-1.5 border border-slate-200 rounded-lg text-center font-bold"
                      /> kW
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={prod.price}
                        onChange={(e) => {
                          const updated = [...irveState.products];
                          updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                          setIrveState({ ...irveState, products: updated });
                        }}
                        className="w-24 p-1.5 border border-slate-200 rounded-lg font-bold text-blue-600"
                      /> €
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={prod.target}
                        onChange={(e) => {
                          const updated = [...irveState.products];
                          updated[idx] = { ...updated[idx], target: e.target.value };
                          setIrveState({ ...irveState, products: updated });
                        }}
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={prod.position}
                        onChange={(e) => {
                          const updated = [...irveState.products];
                          updated[idx] = { ...updated[idx], position: e.target.value };
                          setIrveState({ ...irveState, products: updated });
                        }}
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Frais d'installation (€ / borne)</label>
              <input
                type="number"
                value={irveState.defaultInstallFeePerPoint}
                onChange={(e) => setIrveState({ ...irveState, defaultInstallFeePerPoint: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Marge par recharge par défaut (€)</label>
              <input
                type="number"
                step="0.5"
                value={irveState.defaultMarginPerRecharge}
                onChange={(e) => setIrveState({ ...irveState, defaultMarginPerRecharge: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Taux de financement annuel (%)</label>
              <input
                type="number"
                step="0.5"
                value={irveState.financeInterestRate}
                onChange={(e) => setIrveState({ ...irveState, financeInterestRate: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2. BASE DE DONNÉES AUTOCONSOMMATION ═════════════════════════════════ */}
      {activeSubTab === 'autoconso' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Grille Tarifaire &amp; Paramètres Économiques Autoconsommation
            </h3>
            <p className="text-xs text-slate-500">
              Barème des prix clé en main, taux d'autoconsommation par défaut et tarifs de valorisation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Puissance (kWc)</th>
                  <th className="p-3">Prix unitaire (€/kWc)</th>
                  <th className="p-3">Prix Total Clé en main (€ HT)</th>
                  <th className="p-3">Taux Autoconsommation (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {autoconsoState.pricePerKwcGrid.map((item, idx) => (
                  <tr key={item.kwc || idx}>
                    <td className="p-3 font-bold text-slate-800">{item.kwc} kWc</td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.05"
                        value={item.pricePerKwc}
                        onChange={(e) => {
                          const updated = [...autoconsoState.pricePerKwcGrid];
                          const p = Number(e.target.value);
                          updated[idx] = { ...updated[idx], pricePerKwc: p, totalPriceHT: Math.round(p * item.kwc * 1000) };
                          setAutoconsoState({ ...autoconsoState, pricePerKwcGrid: updated });
                        }}
                        className="w-20 p-1.5 border border-slate-200 rounded-lg text-center font-bold"
                      /> €/Wc
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.totalPriceHT}
                        onChange={(e) => {
                          const updated = [...autoconsoState.pricePerKwcGrid];
                          updated[idx] = { ...updated[idx], totalPriceHT: Number(e.target.value) };
                          setAutoconsoState({ ...autoconsoState, pricePerKwcGrid: updated });
                        }}
                        className="w-28 p-1.5 border border-slate-200 rounded-lg font-bold text-emerald-700"
                      /> €
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.defaultAutoconsoRate}
                        onChange={(e) => {
                          const updated = [...autoconsoState.pricePerKwcGrid];
                          updated[idx] = { ...updated[idx], defaultAutoconsoRate: Number(e.target.value) };
                          setAutoconsoState({ ...autoconsoState, pricePerKwcGrid: updated });
                        }}
                        className="w-16 p-1.5 border border-slate-200 rounded-lg text-center font-bold text-blue-600"
                      /> %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Valorisation kWh autoconsommé (€/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={autoconsoState.defaultValorisationAutoconso}
                onChange={(e) => setAutoconsoState({ ...autoconsoState, defaultValorisationAutoconso: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Valorisation surplus vendu (€/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={autoconsoState.defaultValorisationSurplus}
                onChange={(e) => setAutoconsoState({ ...autoconsoState, defaultValorisationSurplus: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Inflation électricité annuelle (%)</label>
              <input
                type="number"
                step="0.1"
                value={autoconsoState.defaultElectricityInflation}
                onChange={(e) => setAutoconsoState({ ...autoconsoState, defaultElectricityInflation: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ 3. BASE DE DONNÉES TOITURE PHOTOVOLTAÏQUE ════════════════════════════ */}
      {activeSubTab === 'toiture' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Tarifs d'Achat EDF OA &amp; Barèmes Toitures Existantes
            </h3>
            <p className="text-xs text-slate-500">
              Arrêté tarifaire S21, ratios de dimensionnement et redevances de location de toiture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ratio Surface / Puissance (m² / kWc)</label>
              <input
                type="number"
                step="0.1"
                value={toitureState.surfaceToPowerRatio}
                onChange={(e) => setToitureState({ ...toitureState, surfaceToPowerRatio: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 5.0 m² par kWc</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Loyer Annuel Toiture (€ / m² / an)</label>
              <input
                type="number"
                step="0.5"
                value={toitureState.loyerAnnuelM2Toiture}
                onChange={(e) => setToitureState({ ...toitureState, loyerAnnuelM2Toiture: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">En mode location au propriétaire</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Coût d'installation moyen (€ / kWc)</label>
              <input
                type="number"
                value={toitureState.installationCostPerKwc}
                onChange={(e) => setToitureState({ ...toitureState, installationCostPerKwc: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. BASE DE DONNÉES STRUCTURE MÉTALLIQUE ══════════════════════════════ */}
      {activeSubTab === 'structure' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Coûts de Construction Charpente Métallique &amp; Hangar
            </h3>
            <p className="text-xs text-slate-500">
              Prix unitaires au m² pour la charpente, couverture bac acier, fondations et intégration photovoltaïque.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Charpente Métallique (€ / m² sol)</label>
              <input
                type="number"
                value={structureState.charpenteCostM2}
                onChange={(e) => setStructureState({ ...structureState, charpenteCostM2: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Couverture Bac Acier (€ / m² toiture)</label>
              <input
                type="number"
                value={structureState.couvertureBacAcierM2}
                onChange={(e) => setStructureState({ ...structureState, couvertureBacAcierM2: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fondations Béton (€ / m² sol)</label>
              <input
                type="number"
                value={structureState.fondationsCostM2}
                onChange={(e) => setStructureState({ ...structureState, fondationsCostM2: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
