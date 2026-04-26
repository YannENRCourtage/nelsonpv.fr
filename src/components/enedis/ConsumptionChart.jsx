import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { Zap, TrendingDown, Calendar, Table2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Parsing Enedis v5 ───────────────────────────────────────────────────────
function parseIntervals(apiResult) {
  if (!apiResult || apiResult.error) return [];
  const readings = apiResult?.meter_reading?.interval_reading || [];
  return readings
    .map(r => ({ date: r.date || r.timestamp || '', value: parseFloat(r.value || 0) }))
    .filter(r => r.date && !isNaN(r.value));
}

// ─── Agrégations ─────────────────────────────────────────────────────────────
function aggregateByDay(dailyReadings, nDays = 14) {
  return dailyReadings.slice(-nDays).map(r => ({
    label: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    kWh: parseFloat((r.value / 1000).toFixed(2)),
    date: r.date
  }));
}

function aggregateByWeek(dailyReadings) {
  const weeks = {};
  dailyReadings.forEach(({ date, value }) => {
    const d = new Date(date);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    const key = monday.toISOString().split('T')[0];
    const label = `S. ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
    if (!weeks[key]) weeks[key] = { label, kWh: 0 };
    weeks[key].kWh += value / 1000;
  });
  return Object.values(weeks).map(w => ({ ...w, kWh: parseFloat(w.kWh.toFixed(1)) })).slice(-26);
}

function aggregateByMonth(dailyReadings) {
  const months = {};
  dailyReadings.forEach(({ date, value }) => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!months[key]) months[key] = { label, kWh: 0 };
    months[key].kWh += value / 1000;
  });
  return Object.values(months).map(m => ({ ...m, kWh: parseFloat(m.kWh.toFixed(1)) }));
}

// ─── Composant principal ──────────────────────────────────────────────────────
const ConsumptionChart = ({ data, loading }) => {
  const [period, setPeriod] = useState('month');  // 'day' | 'week' | 'month'
  const [viewMode, setViewMode] = useState('chart');  // 'chart' | 'table'
  const [activeTab, setActiveTab] = useState('conso');  // 'conso' | 'load'

  // Parsing des données
  const daily = useMemo(() => parseIntervals(data?.daily), [data]);
  const loadCurve = useMemo(() => parseIntervals(data?.loadCurve), [data]);
  const maxPowerData = useMemo(() => parseIntervals(data?.maxPower), [data]);

  // Calcul de la puissance max (depuis maxPower, fallback loadCurve)
  const peakKw = useMemo(() => {
    const src = maxPowerData.length > 0 ? maxPowerData : loadCurve;
    return src.reduce((max, r) => Math.max(max, r.value / 1000), 0);
  }, [maxPowerData, loadCurve]);

  // Données agrégées selon période
  const chartData = useMemo(() => {
    if (period === 'day') return aggregateByDay(daily, 14);
    if (period === 'week') return aggregateByWeek(daily);
    return aggregateByMonth(daily);
  }, [daily, period]);

  // Courbe de charge — derniers 30 jours
  const loadData = useMemo(() => {
    if (loadCurve.length > 0) {
      return loadCurve.slice(-96).map(r => ({
        time: new Date(r.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        kW: parseFloat((r.value / 1000).toFixed(3))
      }));
    }
    // Fallback : puissance max journalière
    return maxPowerData.slice(-30).map(r => ({
      time: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      kW: parseFloat((r.value / 1000).toFixed(3))
    }));
  }, [loadCurve, maxPowerData]);

  // KPIs
  const totalKwh = useMemo(() => daily.reduce((s, r) => s + r.value, 0) / 1000, [daily]);
  const avgDaily = useMemo(() => daily.length > 0 ? totalKwh / daily.length : 0, [daily, totalKwh]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center text-slate-400 gap-3">
      <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      Chargement des données Enedis...
    </div>
  );

  if (!data || daily.length === 0) {
    return <div className="text-slate-400 p-8 text-center">Aucune donnée disponible pour cette période.</div>;
  }

  const PERIOD_OPTS = [
    { key: 'day', label: 'Jour (14j)' },
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
  ];

  const tooltipStyle = {
    borderRadius: '12px', border: '1px solid #e2e8f0',
    fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
  };

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Zap size={14} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Conso annuelle</span>
          </div>
          <p className="text-4xl font-black">{Math.round(totalKwh).toLocaleString('fr-FR')}</p>
          <p className="text-sm opacity-70 font-medium mt-1">kWh / an</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-200">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Calendar size={14} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Moy. journalière</span>
          </div>
          <p className="text-4xl font-black">{avgDaily.toFixed(1)}</p>
          <p className="text-sm opacity-70 font-medium mt-1">kWh / jour</p>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-amber-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <TrendingDown size={14} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Puissance max</span>
          </div>
          <p className="text-4xl font-black">{peakKw.toFixed(2)}</p>
          <p className="text-sm opacity-70 font-medium mt-1">kW (pointe)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-0">
        {[{ key: 'conso', label: 'Consommation' }, { key: 'load', label: 'Courbe de charge' }].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'conso' && (
        <div>
          {/* Contrôles période + vue */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {PERIOD_OPTS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    period === p.key
                      ? 'bg-white shadow text-blue-700'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'chart' ? 'bg-white shadow' : ''}`}
                title="Graphique"
              >
                <BarChart3 size={16} className={viewMode === 'chart' ? 'text-blue-600' : 'text-slate-400'} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
                title="Tableau"
              >
                <Table2 size={16} className={viewMode === 'table' ? 'text-blue-600' : 'text-slate-400'} />
              </button>
            </div>
          </div>

          {viewMode === 'chart' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-400 mb-4 font-medium">
                {chartData.length} {period === 'day' ? 'jours' : period === 'week' ? 'semaines' : 'mois'}
                {' '}— {Math.round(chartData.reduce((s, d) => s + d.kWh, 0)).toLocaleString('fr-FR')} kWh total
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" fontSize={11} tick={{ fill: '#94a3b8' }} tickMargin={8}
                    interval={period === 'day' ? 0 : period === 'week' ? 3 : 0} />
                  <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} unit=" kWh" width={65} />
                  <Tooltip formatter={v => [`${v} kWh`, 'Consommation']} contentStyle={tooltipStyle} />
                  <Bar dataKey="kWh" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-auto max-h-96 custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-slate-600">Période</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-600">Consommation (kWh)</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-600">% du total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {chartData.map((row, i) => {
                      const total = chartData.reduce((s, r) => s + r.kWh, 0);
                      const pct = total > 0 ? ((row.kWh / total) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-700">{row.label}</td>
                          <td className="px-6 py-3 text-right font-bold text-blue-700">{row.kWh.toLocaleString('fr-FR')}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-24 bg-slate-100 rounded-full h-2">
                                <div className="bg-blue-500 rounded-full h-2" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-slate-500 text-xs w-10">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-6 py-3 font-black text-slate-800">TOTAL</td>
                      <td className="px-6 py-3 text-right font-black text-blue-800">
                        {chartData.reduce((s, r) => s + r.kWh, 0).toLocaleString('fr-FR')} kWh
                      </td>
                      <td className="px-6 py-3 text-right font-black text-slate-500">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'load' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-slate-400 font-medium">
              {loadData.length > 0
                ? `${loadCurve.length > 0 ? '30 derniers jours · ' : 'Puissance max journalière · '}${loadData.length} points`
                : 'Aucune donnée de courbe de charge disponible'}
            </p>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'chart' ? 'bg-white shadow' : ''}`}
              >
                <BarChart3 size={16} className={viewMode === 'chart' ? 'text-blue-600' : 'text-slate-400'} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
              >
                <Table2 size={16} className={viewMode === 'table' ? 'text-blue-600' : 'text-slate-400'} />
              </button>
            </div>
          </div>

          {loadData.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-12 text-center text-slate-400">
              Courbe de charge non disponible pour ce compteur
            </div>
          ) : viewMode === 'chart' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={loadData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" fontSize={10} tick={{ fill: '#94a3b8' }}
                    interval={Math.floor(loadData.length / 8)} />
                  <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} unit=" kW" width={55} />
                  <Tooltip formatter={v => [`${v} kW`, 'Puissance']} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="kW" stroke="#10b981" strokeWidth={2}
                    fill="url(#greenGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-auto max-h-96 custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-slate-600">Horodatage</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-600">Puissance (kW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700">{row.time}</td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-700">{row.kW}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsumptionChart;
