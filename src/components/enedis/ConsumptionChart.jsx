import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Zap, TrendingDown, Calendar, Activity } from 'lucide-react';

// Parse la structure Enedis v5 : meter_reading.interval_reading[{value, date}]
function parseIntervals(apiResult) {
  if (!apiResult) return [];
  const readings = apiResult?.meter_reading?.interval_reading || [];
  return readings.map(r => ({
    date: r.date || r.timestamp || '',
    value: parseFloat(r.value || 0)
  })).filter(r => r.date && !isNaN(r.value));
}

// Agrège les données journalières par mois (Wh → kWh)
function aggregateByMonth(dailyReadings) {
  const months = {};
  dailyReadings.forEach(({ date, value }) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!months[key]) months[key] = { month: label, kWh: 0 };
    months[key].kWh += value / 1000;
  });
  return Object.values(months).map(m => ({ ...m, kWh: parseFloat(m.kWh.toFixed(1)) }));
}

// Filtre les 7 derniers jours de courbe de charge (48 points/jour × 7 = 336)
function getRecentLoadCurve(loadReadings) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return loadReadings
    .filter(r => new Date(r.date) >= cutoff)
    .map(r => {
      const d = new Date(r.date);
      return {
        time: d.toLocaleTimeString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        kW: parseFloat((r.value / 1000).toFixed(3))
      };
    });
}

const BLUE = '#2563eb';
const GREEN = '#10b981';
const ORANGE = '#f59e0b';

const ConsumptionChart = ({ data, loading }) => {
  const [activeTab, setActiveTab] = useState('daily');

  const daily = useMemo(() => parseIntervals(data?.daily), [data]);
  const loadCurve = useMemo(() => parseIntervals(data?.loadCurve), [data]);
  const maxPower = useMemo(() => parseIntervals(data?.maxPower), [data]);

  const monthlyData = useMemo(() => aggregateByMonth(daily), [daily]);
  const loadCurveData = useMemo(() => getRecentLoadCurve(loadCurve.length > 0 ? loadCurve : loadCurve), [loadCurve]);
  const recentLoad = useMemo(() => getRecentLoadCurve(loadCurve), [loadCurve]);

  // Stats résumé
  const totalKwh = useMemo(() => daily.reduce((s, r) => s + r.value, 0) / 1000, [daily]);
  const avgDaily = useMemo(() => daily.length > 0 ? totalKwh / daily.length : 0, [daily, totalKwh]);
  const peakKw = useMemo(() => loadCurve.reduce((max, r) => Math.max(max, r.value / 1000), 0), [loadCurve]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center text-slate-400">
      <Activity className="animate-pulse mr-2" />Chargement des données Enedis...
    </div>
  );

  if (!data || (daily.length === 0 && loadCurve.length === 0)) {
    return <div className="text-muted-foreground p-4">Aucune donnée disponible pour cette période.</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Zap size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Conso annuelle</span>
          </div>
          <p className="text-3xl font-black text-blue-900">{totalKwh.toFixed(0)}</p>
          <p className="text-sm text-blue-600 font-medium">kWh / an</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Calendar size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Moyenne journalière</span>
          </div>
          <p className="text-3xl font-black text-green-900">{avgDaily.toFixed(1)}</p>
          <p className="text-sm text-green-600 font-medium">kWh / jour</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <TrendingDown size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Puissance max</span>
          </div>
          <p className="text-3xl font-black text-orange-900">{peakKw.toFixed(2)}</p>
          <p className="text-sm text-orange-600 font-medium">kW (pointe)</p>
        </div>
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
          <TabsTrigger value="daily" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow font-semibold">
            Mensuel (kWh)
          </TabsTrigger>
          <TabsTrigger value="load_curve" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow font-semibold">
            Courbe de charge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <div className="p-4 bg-white rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 mb-4 font-medium">Consommation mensuelle agrégée ({daily.length} jours)</p>
            {monthlyData.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Aucune donnée quotidienne disponible</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={11} tickMargin={8} tick={{ fill: '#64748b' }} />
                  <YAxis fontSize={11} unit=" kWh" tick={{ fill: '#64748b' }} width={70} />
                  <Tooltip
                    formatter={(v) => [`${v} kWh`, 'Consommation']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="kWh" name="Consommation" fill={BLUE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="load_curve">
          <div className="p-4 bg-white rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Courbe de charge — {recentLoad.length > 0 ? '7 derniers jours (30 min)' : 'données non disponibles'}
            </p>
            {recentLoad.length === 0 && loadCurve.length > 0 ? (
              // Afficher les 96 derniers points si filtre 7j vide
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={loadCurve.slice(-96).map(r => ({
                  time: new Date(r.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  kW: parseFloat((r.value / 1000).toFixed(3))
                }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" fontSize={10} tick={{ fill: '#64748b' }} interval={11} />
                  <YAxis fontSize={11} unit=" kW" tick={{ fill: '#64748b' }} width={60} />
                  <Tooltip
                    formatter={(v) => [`${v} kW`, 'Puissance']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="kW" stroke={GREEN} strokeWidth={2} fill="url(#greenGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : recentLoad.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={recentLoad} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="greenGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" fontSize={10} tick={{ fill: '#64748b' }} interval={23} />
                  <YAxis fontSize={11} unit=" kW" tick={{ fill: '#64748b' }} width={60} />
                  <Tooltip
                    formatter={(v) => [`${v} kW`, 'Puissance']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="kW" stroke={GREEN} strokeWidth={2} fill="url(#greenGrad2)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-8">Aucune courbe de charge disponible</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsumptionChart;
