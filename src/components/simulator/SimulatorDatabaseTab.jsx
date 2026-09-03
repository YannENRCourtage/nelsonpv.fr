import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Zap, Sun, Building2, Sliders, CheckCircle2,
  Euro, Info, Table, Plus, Trash2, Leaf
} from 'lucide-react';
import { useSimulatorSettingsStore, DEFAULT_ECO_EVO_CATALOG } from '@/stores/useSimulatorSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

export default function SimulatorDatabaseTab() {
  const { activeTenantId } = useAuth();
  const isAcama = activeTenantId === 'acama';

  const {
    settings,
    updateIrveSettings,
    updateAutoconsoSettings,
    updateToiturePvSettings,
    updateStructureSettings,
    updateSechoirSettings,
    updateSechoirModel,
    updateSechoirFinancial,
    updateSechoirMaterial,
    addAutoconsoTier,
    updateAutoconsoTier,
    deleteAutoconsoTier,
    addToitureTarifOa,
    updateToitureTarifOa,
    deleteToitureTarifOa,
    addIrveProduct,
    updateIrveProduct,
    deleteIrveProduct,
    addEcoEvoItem,
    updateEcoEvoItem,
    deleteEcoEvoItem
  } = useSimulatorSettingsStore();

  const [activeSubTab, setActiveSubTab] = useState('autoconso'); // 'autoconso' | 'toiture' | 'structure' | 'irve' | 'sechoir'

  // Sur ACAMA, interdire l'accès aux paramétrages Séchoir BatiTech
  useEffect(() => {
    if (isAcama && activeSubTab === 'sechoir') {
      setActiveSubTab('autoconso');
    }
  }, [isAcama, activeSubTab]);

  const irve = settings.irve;
  const auto = settings.autoconsommation;
  const toiture = settings.toiturePv;
  const struct = settings.structure;
  const sechoir = settings.sechoir || {};
  const sechoirModels = sechoir.models || {};
  const sechoirFinancial = sechoir.financialParams || {};
  const sechoirMaterials = sechoir.materials || [];

  const ecoEvoCatalog = struct.ecoEvoCatalog || DEFAULT_ECO_EVO_CATALOG;
  const autoconsoTiers = auto.priceTiers || [];
  const toitureTarifsOa = toiture.tarifsAchatEdfOa || [];
  const irveProducts = irve.products || [];

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

        {/* 5 Onglets de Solutions */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {[
            { id: 'autoconso', label: '1. Autoconsommation', icon: Sun },
            { id: 'toiture', label: '2. Toiture Photovoltaïque', icon: Building2 },
            { id: 'structure', label: isAcama ? '3. Structure Métallique' : '3. Structure Métallique & ECO-EVO', icon: Sliders },
            { id: 'irve', label: '4. Borne IRVE', icon: Zap },
            { id: 'sechoir', label: '5. Séchoir BatiTech', icon: Leaf },
          ].filter(tab => isAcama ? tab.id !== 'sechoir' : true).map((tab) => {
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

      {/* ═══ 1. AUTOCONSOMMATION : TRANCHES DE PUISSANCE LIBRES (ENR-COURTAGE) ═══ */}
      {activeSubTab === 'autoconso' && (
        <div className="space-y-6">
          
          {/* Paramètres généraux avec 3 décimales */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Hypothèses Économiques Globales (3 décimales)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Valorisation Autoconsommation (€/kWh)</label>
                <input
                  type="number"
                  step="0.001"
                  value={auto.defaultValorisationAutoconso}
                  onChange={(e) => updateAutoconsoSettings({ defaultValorisationAutoconso: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rachat Surplus EDF OA (€/kWh)</label>
                <input
                  type="number"
                  step="0.001"
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

          {/* TABLEAU DES PALIERS / TRANCHES DE PUISSANCE */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-amber-600" />
                  Barème par Tranches de Puissance (€/Wc) — Autoconsommation
                </h3>
                <p className="text-xs text-slate-500">
                  Définissez librement les tarifs par paliers de puissance (0 à 3 kWc, 3 à 6 kWc, etc.).
                </p>
              </div>

              <button
                type="button"
                onClick={() => addAutoconsoTier({ minKwc: 36, maxKwc: 100, label: '36 à 100 kWc', pricePerWc: 0.900, defaultAutoconsoRate: 35 })}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter une tranche
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Libellé Tranche</th>
                    <th className="p-3 text-center">Min (kWc)</th>
                    <th className="p-3 text-center">Max (kWc)</th>
                    <th className="p-3 text-right">Tarif Clé en Main (€ / Wc)</th>
                    <th className="p-3 text-right">Taux Autoconso (%)</th>
                    <th className="p-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {autoconsoTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <input
                          type="text"
                          value={tier.label || ''}
                          onChange={(e) => updateAutoconsoTier(tier.id, { label: e.target.value })}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={tier.minKwc}
                          onChange={(e) => updateAutoconsoTier(tier.id, { minKwc: Number(e.target.value) })}
                          className="w-16 p-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={tier.maxKwc}
                          onChange={(e) => updateAutoconsoTier(tier.id, { maxKwc: Number(e.target.value) })}
                          className="w-16 p-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={tier.pricePerWc}
                          onChange={(e) => updateAutoconsoTier(tier.id, { pricePerWc: Number(e.target.value) })}
                          className="w-24 p-1.5 text-right font-black text-blue-600 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={tier.defaultAutoconsoRate}
                          onChange={(e) => updateAutoconsoTier(tier.id, { defaultAutoconsoRate: Number(e.target.value) })}
                          className="w-16 p-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteAutoconsoTier(tier.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer la tranche"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2. TOITURE PHOTOVOLTAÏQUE ════════════════════════════════════════ */}
      {activeSubTab === 'toiture' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              Paramètres Grandes Toitures &amp; Revente Totale
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coût d'installation moyen (€/kWc)</label>
                <input
                  type="number"
                  step="0.001"
                  value={toiture.installationCostPerKwc}
                  onChange={(e) => updateToiturePvSettings({ installationCostPerKwc: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Loyer Annuel Toiture (€/m²/an)</label>
                <input
                  type="number"
                  step="0.001"
                  value={toiture.loyerAnnuelM2Toiture}
                  onChange={(e) => updateToiturePvSettings({ loyerAnnuelM2Toiture: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coût raccordement base (€)</label>
                <input
                  type="number"
                  value={toiture.raccordementCostBase}
                  onChange={(e) => updateToiturePvSettings({ raccordementCostBase: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Soulte (€/m² toiture)</label>
                <input
                  type="number"
                  step="0.001"
                  value={toiture.soulteM2Toiture}
                  onChange={(e) => updateToiturePvSettings({ soulteM2Toiture: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* TABLEAU DES TARIFS ACHAT EDF OA */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-blue-600" />
                  Barème Arrêté Tarifaire EDF OA (€ / kWh)
                </h3>
                <p className="text-xs text-slate-500">
                  Tarifs d'achat garantis sur 20 ans avec 3 décimales (ex: 0.131 €/kWh, 0.085 €/kWh).
                </p>
              </div>

              <button
                type="button"
                onClick={() => addToitureTarifOa({ minKwc: 500, maxKwc: 1000, label: '500 à 1000 kWc', tarifAchatKwh: 0.075, primeInjectionKwh: 0.010 })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter un tarif OA
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Libellé</th>
                    <th className="p-3 text-center">Min (kWc)</th>
                    <th className="p-3 text-center">Max (kWc)</th>
                    <th className="p-3 text-right">Tarif Achat (€/kWh)</th>
                    <th className="p-3 text-right">Prime Injection (€/kWh)</th>
                    <th className="p-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {toitureTarifsOa.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.label || ''}
                          onChange={(e) => updateToitureTarifOa(item.id, { label: e.target.value })}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={item.minKwc || 0}
                          onChange={(e) => updateToitureTarifOa(item.id, { minKwc: Number(e.target.value) })}
                          className="w-16 p-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={item.maxKwc || 100}
                          onChange={(e) => updateToitureTarifOa(item.id, { maxKwc: Number(e.target.value) })}
                          className="w-16 p-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={item.tarifAchatKwh}
                          onChange={(e) => updateToitureTarifOa(item.id, { tarifAchatKwh: Number(e.target.value) })}
                          className="w-24 p-1.5 text-right font-black text-emerald-600 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={item.primeInjectionKwh || 0}
                          onChange={(e) => updateToitureTarifOa(item.id, { primeInjectionKwh: Number(e.target.value) })}
                          className="w-20 p-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteToitureTarifOa(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer ce tarif"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 3. STRUCTURE MÉTALLIQUE & GAMME ECO-EVO ══════════════════════════ */}
      {activeSubTab === 'structure' && (
        <div className="space-y-6">
          
          {/* Barèmes Gros-Œuvre avec 3 décimales */}
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
                  step="0.001"
                  value={struct.charpenteCostM2}
                  onChange={(e) => updateStructureSettings({ charpenteCostM2: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Couverture Bac Acier (€/m²)</label>
                <input
                  type="number"
                  step="0.001"
                  value={struct.couvertureBacAcierM2}
                  onChange={(e) => updateStructureSettings({ couvertureBacAcierM2: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Plots &amp; Fondations Béton (€/m²)</label>
                <input
                  type="number"
                  step="0.001"
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

          {/* TABLEAU COMPLET DE LA GAMME ECO & EVO AVEC AJOUT / SUPPRESSION (Masqué pour ACAMA) */}
          {!isAcama && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-indigo-600" />
                  Grille Tarifaire Gamme ECO &amp; EVO (Bâtiments Standards)
                </h3>
                <p className="text-xs text-slate-500">
                  Éditez les tarifs ou ajoutez de nouveaux modèles standards à la volée.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addEcoEvoItem({ gamme: 'ECO', name: 'ECO 16×32 (512 m²)', length: 32, width: 16, kwc: 95, charpentePrice: 38000, couverturePrice: 15000, fondationsPrice: 12000, pvPrice: 52000, soulte: 17000, resteACharge: 48000 })}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter un modèle ECO/EVO
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Gamme</th>
                    <th className="p-3">Modèle / Nom</th>
                    <th className="p-3 text-center">Dim. (L × l)</th>
                    <th className="p-3 text-center">Surface</th>
                    <th className="p-3 text-center">Puissance</th>
                    <th className="p-3 text-right">Charpente (€)</th>
                    <th className="p-3 text-right">Couverture (€)</th>
                    <th className="p-3 text-right">Fondations (€)</th>
                    <th className="p-3 text-right">Centrale PV (€)</th>
                    <th className="p-3 text-right text-emerald-700">Soulte (€)</th>
                    <th className="p-3 text-right text-purple-700">Reste (€)</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {ecoEvoCatalog.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <select
                          value={item.gamme}
                          onChange={(e) => updateEcoEvoItem(item.id, { gamme: e.target.value })}
                          className="p-1 rounded-lg text-[10px] font-black border border-slate-200 bg-white"
                        >
                          <option value="ECO">ECO</option>
                          <option value="EVO">EVO</option>
                        </select>
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateEcoEvoItem(item.id, { name: e.target.value })}
                          className="w-32 p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <input
                          type="number"
                          value={item.length}
                          onChange={(e) => updateEcoEvoItem(item.id, { length: Number(e.target.value) })}
                          className="w-12 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                        <span className="mx-1">×</span>
                        <input
                          type="number"
                          value={item.width}
                          onChange={(e) => updateEcoEvoItem(item.id, { width: Number(e.target.value) })}
                          className="w-12 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center font-bold">{item.length * item.width} m²</td>
                      <td className="p-3 text-center font-black text-blue-600">
                        <input
                          type="number"
                          value={item.kwc}
                          onChange={(e) => updateEcoEvoItem(item.id, { kwc: Number(e.target.value) })}
                          className="w-16 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-600"
                        />
                      </td>
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
                        <input
                          type="number"
                          value={item.soulte}
                          onChange={(e) => updateEcoEvoItem(item.id, { soulte: Number(e.target.value) })}
                          className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-emerald-600"
                        />
                      </td>
                      <td className="p-3 text-right font-black text-purple-600">
                        <input
                          type="number"
                          value={item.resteACharge}
                          onChange={(e) => updateEcoEvoItem(item.id, { resteACharge: Number(e.target.value) })}
                          className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-purple-600"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteEcoEvoItem(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer ce modèle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      )}

      {/* ═══ 4. BORNE IRVE ════════════════════════════════════════════════════ */}
      {activeSubTab === 'irve' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              Paramètres Économiques Bornes de Recharge
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Marge par recharge (€)</label>
                <input
                  type="number"
                  step="0.001"
                  value={irve.defaultMarginPerRecharge}
                  onChange={(e) => updateIrveSettings({ defaultMarginPerRecharge: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prix vente kWh public (€)</label>
                <input
                  type="number"
                  step="0.001"
                  value={irve.defaultSalePriceKwh}
                  onChange={(e) => updateIrveSettings({ defaultSalePriceKwh: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coût achat électricité (€/kWh)</label>
                <input
                  type="number"
                  step="0.001"
                  value={irve.defaultElectricityCostKwh}
                  onChange={(e) => updateIrveSettings({ defaultElectricityCostKwh: Number(e.target.value) })}
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
            </div>
          </div>

          {/* TABLEAU DU CATALOGUE MATÉRIEL BORNES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-emerald-600" />
                  Catalogue Bornes de Recharge (Puissances &amp; Tarifs)
                </h3>
                <p className="text-xs text-slate-500">
                  Modifiez les prix unitaires ou ajoutez de nouvelles bornes AC/DC.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addIrveProduct({ power: 50.0, price: 16500, target: 'Supermarchés, concessions', position: 'Rapide DC' })}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter une borne
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 text-center">Puissance (kW)</th>
                    <th className="p-3">Positionnement</th>
                    <th className="p-3">Cible / Usage</th>
                    <th className="p-3 text-right">Prix Fourniture (€ HT)</th>
                    <th className="p-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {irveProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-black text-blue-600">
                        <input
                          type="number"
                          step="0.1"
                          value={prod.power}
                          onChange={(e) => updateIrveProduct(prod.id, { power: Number(e.target.value) })}
                          className="w-20 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={prod.position || ''}
                          onChange={(e) => updateIrveProduct(prod.id, { position: e.target.value })}
                          className="w-full p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={prod.target || ''}
                          onChange={(e) => updateIrveProduct(prod.id, { target: e.target.value })}
                          className="w-full p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={prod.price}
                          onChange={(e) => updateIrveProduct(prod.id, { price: Number(e.target.value) })}
                          className="w-28 p-1 text-right font-black text-emerald-600 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteIrveProduct(prod.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer cette borne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 5. SÉCHOIR MULTI-MATIÈRES BATITECH® COGEN'AIR® (Masqué pour ACAMA) ═══ */}
      {activeSubTab === 'sechoir' && !isAcama && (
        <div className="space-y-6">

          {/* 5a. Hypothèses Économiques & Paramètres Financiers */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Leaf className="w-4 h-4 text-amber-500" />
              Hypothèses Économiques &amp; Paramètres Financiers par Défaut
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Taux d'emprunt bancaire (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sechoirFinancial.tauxEmprunt ?? 3.40}
                  onChange={(e) => updateSechoirFinancial({ tauxEmprunt: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Durée de l'emprunt (années)</label>
                <input
                  type="number"
                  value={sechoirFinancial.dureeEmprunt ?? 25}
                  onChange={(e) => updateSechoirFinancial({ dureeEmprunt: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Aide Régionale Indicative par défaut (€)</label>
                <input
                  type="number"
                  value={sechoirFinancial.subventionPAE ?? 0}
                  onChange={(e) => updateSechoirFinancial({ subventionPAE: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Taux d'actualisation VAN (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sechoirFinancial.tauxActualisation ?? 3.40}
                  onChange={(e) => updateSechoirFinancial({ tauxActualisation: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Inflation annuelle prévisionnelle (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sechoirFinancial.inflationProduits ?? 2.0}
                  onChange={(e) => updateSechoirFinancial({ inflationProduits: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Coût fixation par panneau (€/panneau)</label>
                <input
                  type="number"
                  value={sechoirFinancial.fixationCostPerPanel ?? 101}
                  onChange={(e) => updateSechoirFinancial({ fixationCostPerPanel: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 5b. Modèles BatiTech® Standards & Investissement Brut */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Catalogue des Modèles BatiTech® &amp; Tarifs d'Investissement Brut (€ HT)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3">Modèle</th>
                    <th className="p-3 text-center">Zones Séchage</th>
                    <th className="p-3 text-center">Puissance (kWc)</th>
                    <th className="p-3 text-center">Modules Cogen'Air®</th>
                    <th className="p-3 text-center">Dimensions</th>
                    <th className="p-3 text-center">Surface Toiture (m²)</th>
                    <th className="p-3 text-right">Investissement Brut (€ HT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {Object.entries(sechoirModels).map(([id, mod]) => (
                    <tr key={id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">
                        {mod.name || id}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-black">
                          {mod.zones} zone{mod.zones > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.05"
                          value={mod.puissanceKwc}
                          onChange={(e) => updateSechoirModel(id, { puissanceKwc: Number(e.target.value) })}
                          className="w-20 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={mod.nbModules}
                          onChange={(e) => updateSechoirModel(id, { nbModules: Number(e.target.value) })}
                          className="w-16 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="text"
                          value={mod.dimensions || ''}
                          onChange={(e) => updateSechoirModel(id, { dimensions: e.target.value })}
                          className="w-24 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={mod.surfaceToiture || 360}
                          onChange={(e) => updateSechoirModel(id, { surfaceToiture: Number(e.target.value) })}
                          className="w-20 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={mod.investissementBrut}
                          onChange={(e) => updateSechoirModel(id, { investissementBrut: Number(e.target.value) })}
                          className="w-32 p-1 text-right font-black text-amber-600 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5c. Barème de Valorisation des Matières & Économies d'Énergie */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-600" />
              Barème de Valorisation Agricole &amp; Économies d'Énergie (€/t MS)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3">Filière / Matière Agricole</th>
                    <th className="p-3 text-center">Unité</th>
                    <th className="p-3 text-right">Plus-value Qualité (€/t)</th>
                    <th className="p-3 text-right">Économie Énergie Fossile (€/t)</th>
                    <th className="p-3 text-right text-emerald-700">Gain Total par Tonne (€/t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {sechoirMaterials.map((mat) => {
                    const pv = Number(mat.plusValueQualite || 0);
                    const ee = Number(mat.economieEnergie || 0);
                    const totalUnit = pv + ee;

                    return (
                      <tr key={mat.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          {mat.label}
                        </td>
                        <td className="p-3 text-center text-slate-500 font-mono">
                          {mat.unit || 't MS/an'}
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="0.5"
                            value={mat.plusValueQualite}
                            onChange={(e) => updateSechoirMaterial(mat.id, { plusValueQualite: Number(e.target.value) })}
                            className="w-24 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-700"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="0.5"
                            value={mat.economieEnergie}
                            onChange={(e) => updateSechoirMaterial(mat.id, { economieEnergie: Number(e.target.value) })}
                            className="w-24 p-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-amber-700"
                          />
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600 text-sm">
                          +{totalUnit.toFixed(1)} €/t
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
