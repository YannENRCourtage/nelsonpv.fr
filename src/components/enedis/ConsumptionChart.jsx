import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { Zap, TrendingDown, Calendar, Table2, BarChart3 } from 'lucide-react';

// ─── Parsing Enedis v5 ───────────────────────────────────────────────────────
function parseIntervals(apiResult) {
  if (!apiResult || apiResult.error) return [];
  return (apiResult?.meter_reading?.interval_reading || [])
    .map(r => ({ date: r.date || '', value: parseFloat(r.value || 0) }))
    .filter(r => r.date && !isNaN(r.value));
}

function aggregateByDay(readings) {
  return readings.map(r => ({
    label: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    kWh: parseFloat((r.value / 1000).toFixed(2)), date: r.date
  }));
}

function aggregateByWeek(readings) {
  const w = {};
  readings.forEach(({ date, value }) => {
    const d = new Date(date);
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = mon.toISOString().split('T')[0];
    const label = `S.${mon.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
    if (!w[key]) w[key] = { label, kWh: 0 };
    w[key].kWh += value / 1000;
  });
  return Object.values(w).map(x => ({ ...x, kWh: parseFloat(x.kWh.toFixed(1)) }));
}

function aggregateByMonth(readings) {
  const m = {};
  readings.forEach(({ date, value }) => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!m[key]) m[key] = { label, kWh: 0 };
    m[key].kWh += value / 1000;
  });
  return Object.values(m).map(x => ({ ...x, kWh: parseFloat(x.kWh.toFixed(1)) }));
}

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
const TS = { borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600 };

const CrosshairCursor = (props) => {
  const { stroke = '#cbd5e1', points, activeCoordinate, coordinate, offset, height, width } = props;
  
  // activeCoordinate gives us the exact x,y of the hovered data point
  const cursorX = activeCoordinate?.x ?? coordinate?.x ?? (points && points.length > 0 ? points[0].x : undefined);
  let cursorY = activeCoordinate?.y ?? coordinate?.y;

  // DOM Fallback pour récupérer le Y exact du point actif si recharts ne le passe pas
  if (cursorY === undefined) {
    const activeDot = document.querySelector('.recharts-active-dot circle') || document.querySelector('.recharts-active-dot');
    if (activeDot) {
      const cy = activeDot.getAttribute('cy');
      if (cy) cursorY = parseFloat(cy);
    }
  }

  if (cursorX === undefined) return null;
  
  // Use offset to bound the lines within the chart area
  const topY = offset?.top ?? 0;
  const bottomY = topY + (offset?.height ?? height ?? 500);
  const leftX = offset?.left ?? 0;
  const rightX = leftX + (offset?.width ?? width ?? 800);

  return (
    <g>
      {/* Ligne verticale */}
      <line
        x1={cursorX}
        y1={topY}
        x2={cursorX}
        y2={bottomY}
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {/* Ligne horizontale */}
      {cursorY !== undefined && (
        <line
          x1={leftX}
          y1={cursorY}
          x2={rightX}
          y2={cursorY}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
    </g>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const ConsumptionChart = ({ data, loading }) => {
  const [period, setPeriod] = useState('month');
  const [viewMode, setViewMode] = useState('chart');
  const [activeTab, setActiveTab] = useState('conso');

  // Calcul des bornes disponibles
  const daily = useMemo(() => parseIntervals(data?.daily), [data]);
  const loadCurve = useMemo(() => parseIntervals(data?.loadCurve), [data]);
  const maxPowerData = useMemo(() => parseIntervals(data?.maxPower), [data]);

  const minDate = useMemo(() => daily[0]?.date || '', [daily]);
  const maxDate = useMemo(() => daily[daily.length - 1]?.date || '', [daily]);

  // Filtre de période (date range personnalisé)
  const [startFilter, setStartFilter] = useState('');
  const [endFilter, setEndFilter] = useState('');

  // Données filtrées
  const filteredDaily = useMemo(() => {
    if (!startFilter && !endFilter) return daily;
    return daily.filter(r => (!startFilter || r.date >= startFilter) && (!endFilter || r.date <= endFilter));
  }, [daily, startFilter, endFilter]);

  const filteredLoad = useMemo(() => {
    if (!startFilter && !endFilter) return loadCurve;
    return loadCurve.filter(r => (!startFilter || r.date >= startFilter) && (!endFilter || r.date <= endFilter));
  }, [loadCurve, startFilter, endFilter]);

  const filteredMax = useMemo(() => {
    if (!startFilter && !endFilter) return maxPowerData;
    return maxPowerData.filter(r => (!startFilter || r.date >= startFilter) && (!endFilter || r.date <= endFilter));
  }, [maxPowerData, startFilter, endFilter]);

  // Agrégation selon période
  const chartData = useMemo(() => {
    if (period === 'day') return aggregateByDay(filteredDaily);
    if (period === 'week') return aggregateByWeek(filteredDaily);
    return aggregateByMonth(filteredDaily);
  }, [filteredDaily, period]);

  // Courbe de charge (30 min ou max power en fallback)
  const loadData = useMemo(() => {
    const src = filteredLoad.length > 0 ? filteredLoad : filteredMax;
    return src.slice(-96 * 2).map(r => ({
      time: new Date(r.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      kW: parseFloat((r.value / 1000).toFixed(3))
    }));
  }, [filteredLoad, filteredMax]);

  // Puissance max journalière
  const maxPwrChart = useMemo(() =>
    filteredMax.map(r => ({
      date: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      kW: parseFloat((r.value / 1000).toFixed(3))
    })), [filteredMax]);

  // KPIs
  const totalKwh = useMemo(() => filteredDaily.reduce((s, r) => s + r.value, 0) / 1000, [filteredDaily]);
  const avgDaily = useMemo(() => filteredDaily.length > 0 ? totalKwh / filteredDaily.length : 0, [filteredDaily, totalKwh]);
  const peakKw = useMemo(() => {
    const src = filteredMax.length > 0 ? filteredMax : filteredLoad;
    return src.reduce((mx, r) => Math.max(mx, r.value / 1000), 0);
  }, [filteredMax, filteredLoad]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center text-slate-400 gap-3">
      <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      Chargement des données Enedis...
    </div>
  );

  if (!data || daily.length === 0) return (
    <div className="text-slate-400 p-8 text-center">Aucune donnée disponible.</div>
  );

  const PERIODS = [{ k: 'day', l: 'Jour' }, { k: 'week', l: 'Semaine' }, { k: 'month', l: 'Mois' }];

  const ChartToggle = () => (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
      <button onClick={() => setViewMode('chart')} className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'chart' ? 'bg-white shadow' : ''}`} title="Graphique">
        <BarChart3 size={15} className={viewMode === 'chart' ? 'text-blue-600' : 'text-slate-400'} />
      </button>
      <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow' : ''}`} title="Tableau">
        <Table2 size={15} className={viewMode === 'table' ? 'text-blue-600' : 'text-slate-400'} />
      </button>
    </div>
  );

  const DataTable = ({ rows, cols }) => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>{cols.map(c => <th key={c.k} className="px-5 py-3 text-left font-bold text-slate-600 whitespace-nowrap">{c.l}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {cols.map(c => <td key={c.k} className="px-5 py-2.5 text-slate-700">{c.fmt ? c.fmt(row[c.k]) : row[c.k]}</td>)}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-5 py-3 font-black text-slate-800">TOTAL</td>
                <td className="px-5 py-3 font-black text-blue-800">
                  {rows.reduce((s, r) => s + (parseFloat(r.kWh) || 0), 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kWh
                </td>
                {cols.length > 2 && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 p-6" id="enedis-chart-root">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Conso annuelle', val: Math.round(totalKwh).toLocaleString('fr-FR'), unit: 'kWh / an', bg: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-200' },
          { label: 'Moy. journalière', val: avgDaily.toFixed(1), unit: 'kWh / jour', bg: 'from-emerald-400 to-green-600', shadow: 'shadow-green-200' },
          { label: 'Puissance max', val: peakKw.toFixed(2), unit: 'kW (pointe)', bg: 'from-orange-400 to-amber-600', shadow: 'shadow-orange-200' },
        ].map(k => (
          <div key={k.label} className={`bg-gradient-to-br ${k.bg} rounded-2xl p-4 text-white shadow-lg ${k.shadow}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{k.label}</p>
            <p className="text-3xl font-black">{k.val}</p>
            <p className="text-xs opacity-70 mt-0.5">{k.unit}</p>
          </div>
        ))}
      </div>


      {/* ── Filtre date range ── */}
      <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
        <Calendar size={16} className="text-slate-400 shrink-0" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Période :</span>
        <input type="date" value={startFilter || minDate} min={minDate} max={maxDate}
          onChange={e => setStartFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        <span className="text-slate-400 font-bold">→</span>
        <input type="date" value={endFilter || maxDate} min={minDate} max={maxDate}
          onChange={e => setEndFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        {(startFilter || endFilter) && (
          <button onClick={() => { setStartFilter(''); setEndFilter(''); }}
            className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors ml-auto shrink-0">
            Réinitialiser
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 shrink-0">{filteredDaily.length} jours</span>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-slate-100">
        {[{ k: 'conso', l: 'Consommation' }, { k: 'load', l: 'Courbe de charge' }, { k: 'maxpwr', l: 'Puissance max' }].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === t.k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ─── Tab : Consommation ─── */}
      {activeTab === 'conso' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {PERIODS.map(p => (
                <button key={p.k} onClick={() => setPeriod(p.k)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    period === p.k ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {p.l}
                </button>
              ))}
            </div>
            <ChartToggle />
          </div>

          {viewMode === 'chart' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-400 mb-3 font-medium">
                {chartData.length} {period === 'day' ? 'jours' : period === 'week' ? 'semaines' : 'mois'}
                {' · '}{chartData.reduce((s, d) => s + d.kWh, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kWh total
              </p>
              <ResponsiveContainer width="100%" height={550}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" fontSize={11} tick={{ fill: '#94a3b8' }} tickMargin={8}
                    interval={period === 'day' ? 1 : period === 'week' ? 3 : 0} />
                  <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} unit=" kWh" width={68} />
                  <Tooltip formatter={v => [`${v} kWh`, 'Consommation']} contentStyle={TS} />
                  <Bar dataKey="kWh" fill="url(#barGrad)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DataTable rows={chartData} cols={[
              { k: 'label', l: 'Période' },
              { k: 'kWh', l: 'Consommation (kWh)', fmt: v => `${parseFloat(v).toLocaleString('fr-FR')} kWh` },
            ]} />
          )}
        </div>
      )}

      {/* ─── Tab : Courbe de charge ─── */}
      {activeTab === 'load' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-400 font-medium">
              {filteredLoad.length > 0 ? `30 derniers jours (30 min) · ${loadData.length} points` : 'Fallback : puissance max journalière'}
            </p>
            <ChartToggle />
          </div>

          {loadData.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-12 text-center text-slate-400">
              Courbe de charge non disponible pour ce compteur
            </div>
          ) : viewMode === 'chart' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <ResponsiveContainer width="100%" height={550}>
                <AreaChart data={loadData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" fontSize={10} tick={{ fill: '#94a3b8' }} interval={Math.floor(loadData.length / 8)} />
                  <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} unit=" kW" width={55} />
                  <Tooltip formatter={v => [`${v} kW`, 'Puissance']} contentStyle={TS} cursor={<CrosshairCursor stroke="#10b981" />} />
                  <Area type="monotone" dataKey="kW" stroke="#10b981" strokeWidth={2} fill="url(#greenGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DataTable rows={loadData} cols={[{ k: 'time', l: 'Horodatage' }, { k: 'kW', l: 'Puissance (kW)' }]} />
          )}
        </div>
      )}

      {/* ─── Tab : Puissance max ─── */}
      {activeTab === 'maxpwr' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-400 font-medium">
              Puissance maximale journalière · {maxPwrChart.length} jours · Max : {peakKw.toFixed(2)} kW
            </p>
            <ChartToggle />
          </div>

          {maxPwrChart.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-12 text-center text-slate-400">Puissance max non disponible</div>
          ) : viewMode === 'chart' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <ResponsiveContainer width="100%" height={550}>
                <LineChart data={maxPwrChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: '#94a3b8' }} interval={Math.floor(maxPwrChart.length / 10)} />
                  <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} unit=" kW" width={55} />
                  <Tooltip formatter={v => [`${v} kW`, 'Puissance max']} contentStyle={TS} cursor={<CrosshairCursor stroke="#f59e0b" />} />
                  <Line type="monotone" dataKey="kW" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DataTable rows={maxPwrChart} cols={[{ k: 'date', l: 'Date' }, { k: 'kW', l: 'Puissance max (kW)' }]} />
          )}
        </div>
      )}
    </div>
  );
};

export default ConsumptionChart;
