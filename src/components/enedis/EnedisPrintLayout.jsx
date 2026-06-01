import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// Parse la structure Enedis v5 et agrège par mois
function parseAndAggregateMonthly(apiResult) {
  if (!apiResult || apiResult.error) return [];
  const readings = apiResult?.meter_reading?.interval_reading || [];
  const m = {};
  readings.forEach(r => {
    const d = new Date(r.date || '');
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!m[key]) m[key] = { label, kWh: 0 };
    m[key].kWh += parseFloat(r.value || 0) / 1000;
  });
  return Object.values(m).map(x => ({ ...x, kWh: parseFloat(x.kWh.toFixed(1)) }));
}

function parseLoadCurve(apiResult, maxResult) {
  const load = apiResult?.meter_reading?.interval_reading || [];
  const maxP = maxResult?.meter_reading?.interval_reading || [];
  const src = load.length > 0 ? load : maxP;
  return src.slice(-96).map(r => ({
    time: new Date(r.date || '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    kW: parseFloat((parseFloat(r.value || 0) / 1000).toFixed(3))
  }));
}

const EnedisPrintLayout = ({ visible, prm, data, consent }) => {
  if (!data) return null;

  const monthly = parseAndAggregateMonthly(data.daily);
  const loadData = parseLoadCurve(data.loadCurve, data.maxPower);

  const daily = data?.daily?.meter_reading?.interval_reading || [];
  const totalKwh = daily.reduce((s, r) => s + parseFloat(r.value || 0), 0) / 1000;
  const avgDaily = daily.length > 0 ? totalKwh / daily.length : 0;

  const maxPwrReadings = data?.maxPower?.meter_reading?.interval_reading || [];
  const loadReadings = data?.loadCurve?.meter_reading?.interval_reading || [];
  const src = maxPwrReadings.length > 0 ? maxPwrReadings : loadReadings;
  const peakKw = src.reduce((mx, r) => Math.max(mx, parseFloat(r.value || 0) / 1000), 0);

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const titulaire = consent?.titulaire || 'Titulaire non renseigné';
  const adresse = consent?.adresse || '';
  const consentDate = consent?.updatedAt
    ? new Date(consent.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <>
      <style>{`
        #enedis-print-layout {
          display: none;
        }
        @media screen {
          #enedis-print-layout {
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 277mm;
            height: 190mm;
            overflow: hidden;
          }
        }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { visibility: hidden !important; }
          #enedis-print-layout, #enedis-print-layout * { visibility: visible !important; }
          #enedis-print-layout {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 277mm !important;
            height: 190mm !important;
            background: white;
            z-index: 99999;
          }
        }
      `}</style>

      <div id="enedis-print-layout" style={{ display: visible ? 'block' : 'none' }}>
        <div style={{
          width: '277mm', height: '190mm', padding: '0', fontFamily: 'Inter, Arial, sans-serif',
          display: 'flex', flexDirection: 'column', gap: '6mm', background: 'white'
        }}>

          {/* ── En-tête ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563eb', paddingBottom: '4mm' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
                <div style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', borderRadius: '6px', padding: '4px 10px' }}>
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '12pt', letterSpacing: '1px' }}>ENEDIS</span>
                </div>
                <div>
                  <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1e293b' }}>Rapport de Consommation — Data Connect v5</div>
                  <div style={{ fontSize: '8pt', color: '#64748b' }}>Généré le {today}</div>
                </div>
              </div>
              <div style={{ marginTop: '2mm' }}>
                <div style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600 }}>POINT DE MESURE (PRM)</div>
                <div style={{ fontSize: '14pt', fontWeight: 900, color: '#1e293b', letterSpacing: '1px', fontFamily: 'monospace' }}>{prm}</div>
                {titulaire !== 'Titulaire non renseigné' && (
                  <div style={{ fontSize: '9pt', color: '#334155', fontWeight: 600 }}>{titulaire}</div>
                )}
                {adresse && <div style={{ fontSize: '8pt', color: '#64748b' }}>{adresse}</div>}
                <div style={{ fontSize: '8pt', color: '#64748b' }}>Consentement : {consentDate}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '8pt', color: '#94a3b8' }}>Produit par</div>
              <div style={{ fontSize: '11pt', fontWeight: 900, color: '#2563eb' }}>NELSON</div>
              <div style={{ fontSize: '7pt', color: '#94a3b8' }}>ENR Courtage Énergie</div>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4mm' }}>
            {[
              { label: 'Consommation annuelle', val: `${Math.round(totalKwh).toLocaleString('fr-FR')} kWh`, color: '#2563eb', bg: '#eff6ff' },
              { label: 'Moyenne journalière', val: `${avgDaily.toFixed(1)} kWh/jour`, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Puissance max (pointe)', val: `${peakKw.toFixed(2)} kW`, color: '#d97706', bg: '#fffbeb' },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg, borderLeft: `3px solid ${k.color}`, borderRadius: '6px', padding: '3mm 4mm' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
                <div style={{ fontSize: '14pt', fontWeight: 900, color: k.color, marginTop: '1mm' }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* ── Graphiques ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '4mm', flex: 1, minHeight: 0 }}>
            {/* Histogramme mensuel */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '3mm', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2mm' }}>
                Consommation mensuelle (kWh)
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={monthly} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" fontSize={7} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={7} tick={{ fill: '#94a3b8' }} unit=" kWh" width={50} />
                    <Tooltip formatter={v => [`${v} kWh`, '']} contentStyle={{ fontSize: '8px' }} />
                    <Bar dataKey="kWh" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courbe de charge */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '3mm', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2mm' }}>
                Courbe de charge (kW) {loadData.length === 0 ? '— N/D' : ''}
              </div>
              {loadData.length > 0 ? (
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={loadData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="printGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" fontSize={7} tick={{ fill: '#94a3b8' }} interval={11} />
                      <YAxis fontSize={7} tick={{ fill: '#94a3b8' }} unit=" kW" width={40} />
                      <Tooltip formatter={v => [`${v} kW`, '']} contentStyle={{ fontSize: '8px' }} />
                      <Area type="monotone" dataKey="kW" stroke="#10b981" strokeWidth={1.5} fill="url(#printGreen)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '8pt' }}>
                  Données non disponibles pour ce compteur
                </div>
              )}
            </div>
          </div>

          {/* ── Pied de page ── */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '7pt', color: '#94a3b8' }}>
              Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
              Durée du consentement : 3 ans maximum, révocable à tout moment.
            </span>
            <span style={{ fontSize: '7pt', color: '#94a3b8' }}>nelsonpv.fr</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default EnedisPrintLayout;
