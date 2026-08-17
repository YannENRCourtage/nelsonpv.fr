import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Car, ShieldCheck, Lightbulb, TrendingUp,
  Save, FileDown, CheckCircle2, ChevronRight, Sliders, Euro, Calculator
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { useSimulatorSettingsStore } from '@/stores/useSimulatorSettingsStore';
import EvComparator from '@/components/simulator/EvComparator';

export default function IrveFrontSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { settings } = useSimulatorSettingsStore();
  const irveSettings = settings.irve;

  const products = irveSettings.products || [];
  const [selectedPower, setSelectedPower] = useState(22);
  const [quantity, setQuantity] = useState(1);
  const [targetTypology, setTargetTypology] = useState('personnalise');
  const [usageType, setUsageType] = useState('NonEligible');
  const [pricingMode, setPricingMode] = useState('margin');
  const [marginPerRecharge, setMarginPerRecharge] = useState(irveSettings.defaultMarginPerRecharge || 4.0);
  const [salePrice, setSalePrice] = useState(irveSettings.defaultSalePriceKwh || 0.40);
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(irveSettings.defaultElectricityCostKwh || 0.20);
  const [rechargesPerMonth, setRechargesPerMonth] = useState(205);
  const [financeYears, setFinanceYears] = useState(irveSettings.defaultFinanceYears || 5);
  const [clientDeposit, setClientDeposit] = useState(0);

  const currentProduct = useMemo(() => {
    return products.find(p => p.power === selectedPower) || products[0] || { power: 22, price: 2960 };
  }, [products, selectedPower]);

  const typologies = irveSettings.typologies || {
    personnalise: { label: 'Personnalisé', estimate: 205 },
    tpe: { label: 'TPE / Bureaux', estimate: 30 },
    copro: { label: 'Copropriété', estimate: 60 },
    restaurant: { label: 'Restaurant', estimate: 150 },
    hotel: { label: 'Hôtel', estimate: 300 },
    parking: { label: 'Parking public', estimate: 500 },
    flotte: { label: 'Flotte entreprise', estimate: 100 },
  };

  const handleTypologyChange = (val) => {
    setTargetTypology(val);
    if (typologies[val]?.estimate !== null && typologies[val]?.estimate !== undefined) {
      setRechargesPerMonth(typologies[val].estimate);
    }
  };

  const hardwareCost = currentProduct.price * quantity;
  const installCostTotal = (irveSettings.defaultInstallFeePerPoint || 1000) * quantity;
  const totalInvestment = hardwareCost + installCostTotal;

  const subvention = useMemo(() => {
    const sub = irveSettings.subventions?.[usageType];
    if (!sub || !sub.rate) return 0;
    return Math.min(totalInvestment * sub.rate, sub.cap * quantity);
  }, [usageType, totalInvestment, quantity, irveSettings]);

  const resteACharge = totalInvestment - subvention;

  const effectiveMargin = useMemo(() => {
    if (pricingMode === 'price') {
      return Math.max(0, (salePrice - electricityCostPerKwh) * 48);
    }
    return marginPerRecharge;
  }, [pricingMode, salePrice, electricityCostPerKwh, marginPerRecharge]);

  const monthlyRevenue = effectiveMargin * rechargesPerMonth;
  const annualRevenue = monthlyRevenue * 12;
  const breakEvenMonths = monthlyRevenue > 0 ? (resteACharge / monthlyRevenue) : 0;
  const breakEvenYears = (breakEvenMonths / 12).toFixed(1);

  const actualFinanced = Math.max(0, resteACharge - clientDeposit);
  const monthlyRate = ((irveSettings.financeInterestRate || 8.0) / 100) / 12;
  const totalMonths = financeYears * 12;
  const monthlyLease = actualFinanced > 0
    ? (actualFinanced * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
    : 0;

  const chartData = useMemo(() => {
    const data = [];
    let currentProfit = -resteACharge;
    const dynamicMonths = Math.max(24, Math.min(60, Math.ceil((breakEvenMonths + 12) / 6) * 6));

    for (let m = 1; m <= dynamicMonths; m++) {
      currentProfit += monthlyRevenue;
      data.push({
        month: `M${m}`,
        profit: Math.round(currentProfit),
        isPositive: currentProfit >= 0
      });
    }
    return data;
  }, [resteACharge, monthlyRevenue, breakEvenMonths]);

  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'irve',
        title: `Bornes IRVE ${quantity}x ${selectedPower} kW — ${currentProduct.position || ''}`,
        power: selectedPower,
        quantity,
        targetTypology,
        rechargesPerMonth,
        pricingMode,
        effectiveMargin,
        monthlyRevenue,
        annualRevenue,
        totalInvestment,
        subvention,
        resteACharge,
        breakEvenMonths: Math.round(breakEvenMonths),
        breakEvenYears,
        monthlyLease: Math.round(monthlyLease),
        paybackYear: breakEvenYears
      });
    }
  }, [
    selectedPower, quantity, currentProduct, targetTypology, rechargesPerMonth,
    pricingMode, effectiveMargin, monthlyRevenue, annualRevenue, totalInvestment,
    subvention, resteACharge, breakEvenMonths, breakEvenYears, monthlyLease, onStateUpdate
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      
      {/* Header élargi de 30% */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-3">
          <div>
            <span className="text-xs font-black tracking-widest uppercase text-blue-400 block mb-0.5">
              Simulateur de Rentabilité IRVE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Infrastructures de <span className="text-emerald-400">Recharge Électrique</span>
            </h2>
            <p className="text-sm text-slate-300 mt-0.5 max-w-3xl">
              Estimez le retour sur investissement de l'installation de bornes de recharge pour votre parking ou votre flotte d'entreprise.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 self-end md:self-auto">
            <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-white">
              {quantity} × Borne {selectedPower} kW ({currentProduct.price.toLocaleString('fr-FR')} € HT)
            </span>
          </div>
        </div>
      </div>

      <EvComparator />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Colonne Gauche */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Configuration de la Station
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Puissance de la borne</label>
              <div className="grid grid-cols-3 gap-2.5">
                {products.map(p => (
                  <button
                    key={p.id || p.power}
                    type="button"
                    onClick={() => setSelectedPower(p.power)}
                    className={`p-2.5 rounded-xl text-xs font-black transition-all border ${
                      selectedPower === p.power
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-sm">{p.power} kW</span>
                    <span className="text-[11px] font-normal opacity-85 block">{p.price.toLocaleString('fr-FR')} €</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Nombre de points de charge</span>
                <span className="text-blue-600 font-black text-sm">{quantity} borne(s)</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Profil d'établissement / Usage</label>
              <select
                value={targetTypology}
                onChange={(e) => handleTypologyChange(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                {Object.entries(typologies).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} {v.estimate ? `(~${v.estimate} rech./mois)` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Recharges estimées par mois</span>
                <span className="text-emerald-600 font-black text-sm">{rechargesPerMonth} recharges</span>
              </div>
              <input
                type="range"
                min="10"
                max="800"
                step="10"
                value={rechargesPerMonth}
                onChange={(e) => setRechargesPerMonth(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Marge nette par session</span>
                <span className="text-emerald-600 font-black text-sm">{marginPerRecharge.toFixed(2)} € / recharge</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={marginPerRecharge}
                onChange={(e) => setMarginPerRecharge(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Colonne Droite */}
        <div className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase block">Revenus Mensuels</span>
              <span className="text-2xl font-black text-emerald-600 block my-1">
                +{monthlyRevenue.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">€/mois</span>
              </span>
              <span className="text-xs text-slate-400">+{annualRevenue.toLocaleString('fr-FR')} € / an</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase block">Investissement Net</span>
              <span className="text-2xl font-black text-slate-900 block my-1">
                {resteACharge.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">€ HT</span>
              </span>
              <span className="text-xs text-slate-400">Matériel + Pose ({totalInvestment} €)</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase block">Retour sur Invest.</span>
              <span className="text-2xl font-black text-blue-600 block my-1">
                {breakEvenMonths < 12 ? `${Math.round(breakEvenMonths)} mois` : `${breakEvenYears} ans`}
              </span>
              <span className="text-xs text-slate-400">Amorti à M{Math.round(breakEvenMonths)}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
              <span>Évolution du résultat financier net</span>
              <span className="text-emerald-600">Bénéfice net cumulé</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                  <Tooltip
                    formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} €`, 'Résultat net']}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  />
                  <ReferenceLine x={`M${Math.round(breakEvenMonths)}`} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} />
                  <Bar dataKey="profit" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
