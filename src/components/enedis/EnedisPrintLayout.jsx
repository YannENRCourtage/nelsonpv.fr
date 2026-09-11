import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';

// ─── Parsing Enedis v5 ───────────────────────────────────────────────────────
function parseIntervals(apiResult) {
  if (!apiResult || apiResult.error) return [];
  return (apiResult?.meter_reading?.interval_reading || [])
    .map(r => ({ date: r.date || '', value: parseFloat(r.value || 0) }))
    .filter(r => r.date && !isNaN(r.value));
}

function parseAndAggregateMonthly(apiResult) {
  const readings = parseIntervals(apiResult);
  if (readings.length === 0) return [];
  const m = {};
  readings.forEach(({ date, value }) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!m[key]) m[key] = { label, kWh: 0 };
    m[key].kWh += value / 1000;
  });
  return Object.values(m).map(x => ({ ...x, kWh: parseFloat(x.kWh.toFixed(1)) }));
}

function parseLoadCurve(loadResult, maxResult) {
  const load = parseIntervals(loadResult);
  const maxP = parseIntervals(maxResult);
  const src = load.length > 0 ? load : maxP;
  return src.slice(-96 * 2).map(r => ({
    time: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    shortTime: new Date(r.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    kW: parseFloat((r.value / 1000).toFixed(3))
  }));
}

function parseMaxPower(maxResult, loadResult) {
  const maxReadings = parseIntervals(maxResult);
  if (maxReadings.length > 0) {
    return maxReadings.map(r => ({
      date: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      kW: parseFloat((r.value / 1000).toFixed(2))
    }));
  }
  // Fallback : pic journalier déduit de la courbe de charge
  const loadReadings = parseIntervals(loadResult);
  if (loadReadings.length > 0) {
    const dailyMap = {};
    loadReadings.forEach(r => {
      const d = new Date(r.date);
      const dayKey = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const kw = r.value / 1000;
      if (!dailyMap[dayKey] || kw > dailyMap[dayKey].kW) {
        dailyMap[dayKey] = { date: dayKey, kW: parseFloat(kw.toFixed(2)) };
      }
    });
    return Object.values(dailyMap);
  }
  return [];
}

const EnedisPrintLayout = ({ visible, prm, data, consent, ownerName, ownerAddress }) => {
  if (!data) return null;

  const monthly = parseAndAggregateMonthly(data.daily);
  const loadData = parseLoadCurve(data.loadCurve, data.maxPower);
  const maxPwrChart = parseMaxPower(data.maxPower, data.loadCurve);

  const dailyReadings = parseIntervals(data.daily);
  const totalKwh = dailyReadings.reduce((s, r) => s + r.value, 0) / 1000;
  const avgDaily = dailyReadings.length > 0 ? totalKwh / dailyReadings.length : 0;

  const maxReadings = parseIntervals(data.maxPower);
  const loadReadings = parseIntervals(data.loadCurve);
  const peakSource = maxReadings.length > 0 ? maxReadings : loadReadings;
  const peakKw = peakSource.reduce((mx, r) => Math.max(mx, r.value / 1000), 0);

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Coordonnées du titulaire avec fallback hiérarchique
  const titulaire = ownerName
    || data?.mandate?.titulaire
    || consent?.titulaire
    || consent?.clientName
    || 'Client';

  const adresse = ownerAddress
    || data?.mandate?.adresse
    || consent?.adresse
    || '';

  const consentDate = consent?.updatedAt || data?.mandate?.signedAt
    ? new Date(consent?.updatedAt || data?.mandate?.signedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : today;

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
            width: 194mm;
            height: 283mm;
            overflow: hidden;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #enedis-print-layout, #enedis-print-layout * {
            visibility: visible !important;
          }
          #enedis-print-layout {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 194mm !important;
            max-width: 194mm !important;
            height: 283mm !important;
            max-height: 283mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            z-index: 9999999 !important;
          }
        }
      `}</style>

      <div id="enedis-print-layout" style={{ display: visible ? 'flex' : 'none' }}>
        <div style={{
          width: '194mm',
          height: '283mm',
          maxHeight: '283mm',
          padding: '0',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'white',
          boxSizing: 'border-box'
        }}>

          {/* ── 1. EN-TÊTE ── */}
          <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '3mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '2mm' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    display: 'inline-block'
                  }}>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '11pt', letterSpacing: '0.8px' }}>ENEDIS</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '10pt', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      Rapport de Consommation — Data Connect v5
                    </div>
                    <div style={{ fontSize: '7.5pt', color: '#64748b' }}>
                      Généré le {today}
                    </div>
                  </div>
                </div>

                {/* PRM, Titulaire & Adresse */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1.5mm' }}>
                  <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Point de mesure (PRM)
                  </div>
                  <div style={{ fontSize: '13pt', fontWeight: 900, color: '#0f172a', letterSpacing: '1px', fontFamily: 'monospace', lineHeight: 1.2 }}>
                    {prm}
                  </div>
                  <div style={{ fontSize: '9pt', fontWeight: 700, color: '#1e293b', marginTop: '1px' }}>
                    {titulaire}
                  </div>
                  {adresse ? (
                    <div style={{ fontSize: '8pt', color: '#475569', maxWidth: '125mm', lineHeight: 1.3 }}>
                      {adresse}
                    </div>
                  ) : null}
                  <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '1px' }}>
                    Consentement : {consentDate}
                  </div>
                </div>
              </div>

              {/* Logo Nelson / ENR Courtage */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Produit par</div>
                <div style={{ fontSize: '13pt', fontWeight: 900, color: '#2563eb', letterSpacing: '0.5px', lineHeight: 1.1 }}>NELSON</div>
                <div style={{ fontSize: '7.5pt', fontWeight: 600, color: '#64748b' }}>ENR Courtage Énergie</div>
              </div>
            </div>
          </div>

          {/* ── 2. LES 3 CADRES KPI ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3mm' }}>
            <div style={{ background: '#eff6ff', borderLeft: '3.5px solid #2563eb', borderRadius: '6px', padding: '2.5mm 3.5mm' }}>
              <div style={{ fontSize: '6.8pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Consommation annuelle
              </div>
              <div style={{ fontSize: '13.5pt', fontWeight: 900, color: '#2563eb', marginTop: '1px', lineHeight: 1.1 }}>
                {Math.round(totalKwh).toLocaleString('fr-FR')} <span style={{ fontSize: '8pt', fontWeight: 700 }}>kWh</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', borderLeft: '3.5px solid #16a34a', borderRadius: '6px', padding: '2.5mm 3.5mm' }}>
              <div style={{ fontSize: '6.8pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Moyenne journalière
              </div>
              <div style={{ fontSize: '13.5pt', fontWeight: 900, color: '#16a34a', marginTop: '1px', lineHeight: 1.1 }}>
                {avgDaily.toFixed(1)} <span style={{ fontSize: '8pt', fontWeight: 700 }}>kWh/j</span>
              </div>
            </div>

            <div style={{ background: '#fffbeb', borderLeft: '3.5px solid #d97706', borderRadius: '6px', padding: '2.5mm 3.5mm' }}>
              <div style={{ fontSize: '6.8pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Puissance max (pointe)
              </div>
              <div style={{ fontSize: '13.5pt', fontWeight: 900, color: '#d97706', marginTop: '1px', lineHeight: 1.1 }}>
                {peakKw.toFixed(2)} <span style={{ fontSize: '8pt', fontWeight: 700 }}>kW</span>
              </div>
            </div>
          </div>

          {/* ── 3. GRAPHIQUE 1 : CONSOMMATION MENSUELLE ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '2.5mm 3mm 2mm 3mm',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm' }}>
              <div style={{ fontSize: '7.5pt', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Consommation mensuelle (kWh)
              </div>
              <div style={{ fontSize: '6.8pt', color: '#64748b', fontWeight: 600 }}>
                {monthly.length} mois · {Math.round(totalKwh).toLocaleString('fr-FR')} kWh total
              </div>
            </div>
            {monthly.length > 0 ? (
              <div style={{ width: '100%', height: '115px' }}>
                <ResponsiveContainer width="100%" height={115}>
                  <BarChart data={monthly} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="printBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={7} tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis fontSize={7} tick={{ fill: '#64748b' }} unit=" kWh" width={48} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <Bar dataKey="kWh" fill="url(#printBarGrad)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '115px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '7.5pt' }}>
                Données mensuelles non disponibles
              </div>
            )}
          </div>

          {/* ── 4. GRAPHIQUE 2 : COURBE DE CHARGE ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '2.5mm 3mm 2mm 3mm',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm' }}>
              <div style={{ fontSize: '7.5pt', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Courbe de charge (kW)
              </div>
              <div style={{ fontSize: '6.8pt', color: '#64748b', fontWeight: 600 }}>
                {loadData.length > 0 ? `${loadData.length} relevés (pas de 30 min)` : 'Non disponible'}
              </div>
            </div>
            {loadData.length > 0 ? (
              <div style={{ width: '100%', height: '115px' }}>
                <ResponsiveContainer width="100%" height={115}>
                  <AreaChart data={loadData} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="printGreenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="shortTime"
                      fontSize={7}
                      tick={{ fill: '#64748b' }}
                      interval={Math.max(1, Math.floor(loadData.length / 10))}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis fontSize={7} tick={{ fill: '#64748b' }} unit=" kW" width={48} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <Area type="monotone" dataKey="kW" stroke="#10b981" strokeWidth={1.5} fill="url(#printGreenGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '115px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '7.5pt' }}>
                Courbe de charge non disponible pour ce compteur
              </div>
            )}
          </div>

          {/* ── 5. GRAPHIQUE 3 : PUISSANCE MAX ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '2.5mm 3mm 2mm 3mm',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5mm' }}>
              <div style={{ fontSize: '7.5pt', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Puissance maximale journalière (kW)
              </div>
              <div style={{ fontSize: '6.8pt', color: '#64748b', fontWeight: 600 }}>
                {maxPwrChart.length > 0 ? `${maxPwrChart.length} jours · Pic max : ${peakKw.toFixed(2)} kW` : 'Non disponible'}
              </div>
            </div>
            {maxPwrChart.length > 0 ? (
              <div style={{ width: '100%', height: '115px' }}>
                <ResponsiveContainer width="100%" height={115}>
                  <LineChart data={maxPwrChart} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      fontSize={7}
                      tick={{ fill: '#64748b' }}
                      interval={Math.max(1, Math.floor(maxPwrChart.length / 10))}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis fontSize={7} tick={{ fill: '#64748b' }} unit=" kW" width={48} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <Line type="monotone" dataKey="kW" stroke="#f59e0b" strokeWidth={1.6} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '115px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '7.5pt' }}>
                Historique de puissance maximale non disponible
              </div>
            )}
          </div>

          {/* ── 6. PIED DE PAGE ── */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '6.5pt', color: '#94a3b8', lineHeight: 1.2, maxWidth: '160mm' }}>
              Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
              Rapport extrait via l'API certifiée Enedis Data Connect v5. Durée du consentement : 3 ans maximum, révocable à tout moment.
            </span>
            <span style={{ fontSize: '7.5pt', fontWeight: 800, color: '#2563eb' }}>
              nelsonpv.fr
            </span>
          </div>

        </div>
      </div>
    </>
  );
};

export default EnedisPrintLayout;
