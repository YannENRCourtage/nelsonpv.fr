import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, LabelList, ReferenceLine
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
    time: new Date(r.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    kW: parseFloat((r.value / 1000).toFixed(3))
  }));
}

function parseMaxPower(maxResult, loadResult) {
  const maxReadings = parseIntervals(maxResult);
  if (maxReadings.length > 0) {
    return maxReadings.map(r => ({
      date: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      kW: parseFloat((r.value / 1000).toFixed(3))
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
        dailyMap[dayKey] = { date: dayKey, kW: parseFloat(kw.toFixed(3)) };
      }
    });
    return Object.values(dailyMap);
  }
  return [];
}

const EnedisPrintLayout = ({ visible, prm, data, consent, ownerName, ownerAddress }) => {
  if (!data) return null;

  const monthly = useMemo(() => parseAndAggregateMonthly(data.daily), [data.daily]);
  const loadData = useMemo(() => parseLoadCurve(data.loadCurve, data.maxPower), [data.loadCurve, data.maxPower]);
  const maxPwrChart = useMemo(() => parseMaxPower(data.maxPower, data.loadCurve), [data.maxPower, data.loadCurve]);

  const dailyReadings = useMemo(() => parseIntervals(data.daily), [data.daily]);
  const totalKwh = useMemo(() => dailyReadings.reduce((s, r) => s + r.value, 0) / 1000, [dailyReadings]);
  const avgDaily = useMemo(() => (dailyReadings.length > 0 ? totalKwh / dailyReadings.length : 0), [dailyReadings, totalKwh]);

  const maxReadings = useMemo(() => parseIntervals(data.maxPower), [data.maxPower]);
  const loadReadings = useMemo(() => parseIntervals(data.loadCurve), [data.loadCurve]);
  const peakSource = maxReadings.length > 0 ? maxReadings : loadReadings;
  const peakKw = useMemo(() => peakSource.reduce((mx, r) => Math.max(mx, r.value / 1000), 0), [peakSource]);

  // Points Min & Max pour la Courbe de Charge
  const maxLoadPoint = useMemo(() => {
    if (!loadData || loadData.length === 0) return null;
    return loadData.reduce((prev, curr) => (curr.kW > prev.kW ? curr : prev), loadData[0]);
  }, [loadData]);

  const minLoadPoint = useMemo(() => {
    if (!loadData || loadData.length === 0) return null;
    return loadData.reduce((prev, curr) => (curr.kW < prev.kW ? curr : prev), loadData[0]);
  }, [loadData]);

  // Points Min & Max pour la Puissance Maximale Journalière
  const maxPwrPoint = useMemo(() => {
    if (!maxPwrChart || maxPwrChart.length === 0) return null;
    return maxPwrChart.reduce((prev, curr) => (curr.kW > prev.kW ? curr : prev), maxPwrChart[0]);
  }, [maxPwrChart]);

  const minPwrPoint = useMemo(() => {
    if (!maxPwrChart || maxPwrChart.length === 0) return null;
    return maxPwrChart.reduce((prev, curr) => (curr.kW < prev.kW ? curr : prev), maxPwrChart[0]);
  }, [maxPwrChart]);

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Coordonnées du titulaire avec fallback hiérarchique
  const titulaire = ownerName
    || data?.mandate?.titulaire
    || consent?.titulaire
    || consent?.clientName
    || 'Client';

  // Séparation du titulaire sur 2 lignes (Raison sociale / Représentant)
  let titulaireLine1 = titulaire;
  let titulaireLine2 = '';
  if (titulaire.includes('(') && titulaire.includes(')')) {
    const match = titulaire.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      titulaireLine1 = match[1].trim();
      titulaireLine2 = match[2].trim();
    }
  } else if (titulaire.toLowerCase().includes('latournerie')) {
    titulaireLine1 = 'EARL DES TERRES VIEILLES';
    titulaireLine2 = 'LATOURNERIE Franck';
  }

  const rawAdresse = ownerAddress
    || data?.mandate?.adresse
    || consent?.adresse
    || '';

  // Remplacement de VALEUIL par BRANTOME EN PERIGORD
  const adresse = rawAdresse.replace(/VALEUIL/gi, 'BRANTOME EN PERIGORD');

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
            width: 190mm;
            overflow: hidden;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 9mm 10mm;
          }
          html, body {
            width: 210mm !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #enedis-print-layout, #enedis-print-layout * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #enedis-print-layout {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 190mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            z-index: 9999999 !important;
          }
          .enedis-print-page {
            width: 190mm !important;
            height: 279mm !important;
            min-height: 279mm !important;
            max-height: 279mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: stretch !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: white !important;
            padding: 1mm 0 !important;
          }
          .enedis-print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      <div id="enedis-print-layout" style={{ display: visible ? 'block' : 'none' }}>

        {/* ══════════════════════════════════════════════════════════════════════
            PAGE 1 / 2 : EN-TÊTE + KPIS COULEURS + CONSOMMATION MENSUELLE
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="enedis-print-page" style={{
          width: '190mm',
          height: '279mm',
          minHeight: '279mm',
          maxHeight: '279mm',
          margin: '0 auto',
          padding: '1mm 0',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'white',
          boxSizing: 'border-box'
        }}>

          {/* ── 1. EN-TÊTE PAGE 1 ── */}
          <div style={{ borderBottom: '2.5px solid #2563eb', paddingBottom: '3mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3.5mm', marginBottom: '2mm' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    borderRadius: '6px',
                    padding: '3px 9px',
                    display: 'inline-block',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '11pt', letterSpacing: '0.8px' }}>ENEDIS</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5pt', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                      Rapport de Consommation — Data Connect v5
                    </div>
                    <div style={{ fontSize: '8pt', color: '#64748b' }}>
                      Généré le {today} · Mandat Tiers certifié eIDAS
                    </div>
                  </div>
                </div>

                {/* PRM, Titulaire & Adresse */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', marginTop: '2mm' }}>
                  <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Point de mesure (PRM)
                  </div>
                  <div style={{ fontSize: '13.5pt', fontWeight: 900, color: '#0f172a', letterSpacing: '1px', fontFamily: 'monospace', lineHeight: 1.2 }}>
                    {prm}
                  </div>
                  <div style={{ fontSize: '9.5pt', fontWeight: 800, color: '#1e293b', marginTop: '1px' }}>
                    {titulaireLine1}
                  </div>
                  {titulaireLine2 && (
                    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#475569' }}>
                      {titulaireLine2}
                    </div>
                  )}
                  {adresse ? (
                    <div style={{ fontSize: '8pt', color: '#475569', maxWidth: '125mm', lineHeight: 1.3 }}>
                      {adresse}
                    </div>
                  ) : null}
                  <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '1px' }}>
                    Consentement certifié : {consentDate}
                  </div>
                </div>
              </div>

              {/* Logo Nelson / ENR Courtage */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Produit par</div>
                <div style={{ fontSize: '15pt', fontWeight: 900, color: '#2563eb', letterSpacing: '0.5px', lineHeight: 1.1 }}>NELSON</div>
                <div style={{ fontSize: '8pt', fontWeight: 600, color: '#64748b' }}>ENR Courtage</div>
              </div>
            </div>
          </div>

          {/* ── 2. LES 3 CADRES KPI EN PLEINE COULEUR (IDENTIQUES À L'ÉCRAN) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3.5mm' }}>
            {/* KPI 1 : Conso annuelle (Bleu) */}
            <div style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              backgroundColor: '#2563eb',
              borderRadius: '12px',
              padding: '4mm 4.5mm',
              color: '#ffffff',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              boxShadow: '0 3px 6px rgba(37,99,235,0.2)'
            }}>
              <div style={{ fontSize: '7.2pt', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Conso annuelle
              </div>
              <div style={{ fontSize: '16pt', fontWeight: 900, color: '#ffffff', marginTop: '1.5mm', lineHeight: 1.1 }}>
                {Math.round(totalKwh).toLocaleString('fr-FR')} <span style={{ fontSize: '9pt', fontWeight: 700, opacity: 0.9 }}>kWh</span>
              </div>
              <div style={{ fontSize: '6.8pt', color: 'rgba(255,255,255,0.8)', marginTop: '0.8mm', fontWeight: 600 }}>
                kWh / an
              </div>
            </div>

            {/* KPI 2 : Moyenne journalière (Vert) */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              backgroundColor: '#10b981',
              borderRadius: '12px',
              padding: '4mm 4.5mm',
              color: '#ffffff',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              boxShadow: '0 3px 6px rgba(16,185,129,0.2)'
            }}>
              <div style={{ fontSize: '7.2pt', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Moy. journalière
              </div>
              <div style={{ fontSize: '16pt', fontWeight: 900, color: '#ffffff', marginTop: '1.5mm', lineHeight: 1.1 }}>
                {avgDaily.toFixed(1)} <span style={{ fontSize: '9pt', fontWeight: 700, opacity: 0.9 }}>kWh/j</span>
              </div>
              <div style={{ fontSize: '6.8pt', color: 'rgba(255,255,255,0.8)', marginTop: '0.8mm', fontWeight: 600 }}>
                kWh / jour
              </div>
            </div>

            {/* KPI 3 : Puissance max (Orange) */}
            <div style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              backgroundColor: '#f97316',
              borderRadius: '12px',
              padding: '4mm 4.5mm',
              color: '#ffffff',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              boxShadow: '0 3px 6px rgba(249,115,22,0.2)'
            }}>
              <div style={{ fontSize: '7.2pt', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Puissance max
              </div>
              <div style={{ fontSize: '16pt', fontWeight: 900, color: '#ffffff', marginTop: '1.5mm', lineHeight: 1.1 }}>
                {peakKw.toFixed(2)} <span style={{ fontSize: '9pt', fontWeight: 700, opacity: 0.9 }}>kW</span>
              </div>
              <div style={{ fontSize: '6.8pt', color: 'rgba(255,255,255,0.8)', marginTop: '0.8mm', fontWeight: 600 }}>
                kW (pointe)
              </div>
            </div>
          </div>

          {/* ── 3. GRAPHIQUE 1 : CONSOMMATION MENSUELLE AVEC VALEURS CHIFFRÉES ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '4mm 4.5mm 3.5mm 4.5mm',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5mm' }}>
              <div>
                <div style={{ fontSize: '9pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Consommation mensuelle (kWh)
                </div>
                <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '0.5mm' }}>
                  Historique certifié par relève quotidienne Linky
                </div>
              </div>
              <div style={{
                fontSize: '7.8pt',
                color: '#1e40af',
                fontWeight: 700,
                background: '#eff6ff',
                padding: '2.5px 9px',
                borderRadius: '5px',
                border: '1px solid #bfdbfe'
              }}>
                {monthly.length} mois · {Math.round(totalKwh).toLocaleString('fr-FR')} kWh total
              </div>
            </div>

            {monthly.length > 0 ? (
              <>
                <div style={{ width: '100%', height: '235px' }}>
                  <ResponsiveContainer width="100%" height={235}>
                    <BarChart
                      data={monthly}
                      margin={{ top: 22, right: 12, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="printBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        fontSize={8}
                        tick={{ fill: '#334155', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        fontSize={8}
                        tick={{ fill: '#64748b' }}
                        unit=" kWh"
                        width={52}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        domain={[0, dataMax => Math.ceil(dataMax * 1.15)]}
                      />
                      <Bar dataKey="kWh" fill="url(#printBarGrad)" radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="kWh"
                          position="top"
                          formatter={(val) => Math.round(val).toLocaleString('fr-FR')}
                          style={{ fill: '#0f172a', fontSize: '7.8pt', fontWeight: 800 }}
                          offset={6}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tableau récapitulatif mensuel en badges */}
                <div style={{
                  marginTop: '3.5mm',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(monthly.length, 7)}, 1fr)`,
                  gap: '2mm',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '2.5mm'
                }}>
                  {monthly.map((m, idx) => (
                    <div key={idx} style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '5px',
                      padding: '2mm 1mm',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700, textTransform: 'capitalize' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '8.8pt', color: '#0f172a', fontWeight: 800, marginTop: '1px' }}>
                        {Math.round(m.kWh).toLocaleString('fr-FR')}
                      </div>
                      <div style={{ fontSize: '6pt', color: '#94a3b8', fontWeight: 600 }}>
                        kWh
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: '235px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '8pt' }}>
                Données mensuelles non disponibles
              </div>
            )}
          </div>

          {/* ── 4. BLOC CADRE TECHNIQUE ET CONFORMITÉ ── */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '3.5mm 4.5mm',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '3.5mm'
          }}>
            <div>
              <div style={{ fontSize: '7.2pt', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Compteur communicant
              </div>
              <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1mm', lineHeight: 1.35 }}>
                Raccordement Enedis Linky. Relève automatisée v5 certifiée avec pas 30 minutes.
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7.2pt', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Profil de consommation
              </div>
              <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1mm', lineHeight: 1.35 }}>
                Consommation totale annuelle : <strong style={{ color: '#1e293b' }}>{Math.round(totalKwh).toLocaleString('fr-FR')} kWh</strong>. Analyse pour dimensionnement PV.
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7.2pt', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Mandat de collecte
              </div>
              <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1mm', lineHeight: 1.35 }}>
                Consentement tiers eIDAS valide 3 ans. Données confidentielles réservées à l'étude.
              </div>
            </div>
          </div>

          {/* ── 5. PIED DE PAGE 1 ── */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '6.8pt', color: '#94a3b8', lineHeight: 1.2, maxWidth: '140mm' }}>
              Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
              Rapport extrait via l'API certifiée Enedis Data Connect v5. Mandat tiers certifié eIDAS.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3.5mm' }}>
              <span style={{ fontSize: '7.5pt', fontWeight: 700, color: '#64748b' }}>
                Page 1 / 2
              </span>
              <span style={{ fontSize: '8pt', fontWeight: 800, color: '#2563eb' }}>
                nelsonpv.fr
              </span>
            </div>
          </div>

        </div>


        {/* ══════════════════════════════════════════════════════════════════════
            PAGE 2 / 2 : COURBE DE CHARGE (KW) + PUISSANCE MAX (KW)
            VISUEL 100% IDENTIQUE AUX ONGLETS DE NELSON + MIN / MAX INDIQUÉS
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="enedis-print-page" style={{
          width: '190mm',
          height: '279mm',
          minHeight: '279mm',
          maxHeight: '279mm',
          margin: '0 auto',
          padding: '1mm 0',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'white',
          boxSizing: 'border-box'
        }}>

          {/* ── EN-TÊTE PAGE 2 ── */}
          <div style={{ borderBottom: '2.5px solid #2563eb', paddingBottom: '3mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3.5mm' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  borderRadius: '6px',
                  padding: '3px 9px',
                  display: 'inline-block',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '10.5pt', letterSpacing: '0.8px' }}>ENEDIS</span>
                </div>
                <div>
                  <div style={{ fontSize: '10.5pt', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                    Rapport de Consommation — Profils de Charge et Puissance
                  </div>
                  <div style={{ fontSize: '7.5pt', color: '#64748b' }}>
                    PRM : <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{prm}</span> · Titulaire : <span style={{ fontWeight: 700, color: '#1e293b' }}>{titulaireLine1}{titulaireLine2 ? ` (${titulaireLine2})` : ''}</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14pt', fontWeight: 900, color: '#2563eb', letterSpacing: '0.5px', lineHeight: 1.1 }}>NELSON</div>
                <div style={{ fontSize: '7.5pt', fontWeight: 600, color: '#64748b' }}>ENR Courtage</div>
              </div>
            </div>
          </div>

          {/* ── GRAPHIQUE 2 : COURBE DE CHARGE (IDENTIQUE À L'ONGLET NELSON) ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '4mm 4.5mm 3.5mm 4.5mm',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5mm' }}>
              <div>
                <div style={{ fontSize: '9pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Courbe de charge (kW)
                </div>
                <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5mm' }}>
                  {loadData.length > 0 ? `30 derniers jours (30 min) · ${loadData.length} points` : 'Non disponible'}
                </div>
              </div>

              {/* Indicateurs Point le plus haut & Point le plus bas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {maxLoadPoint && (
                  <span style={{
                    fontSize: '7pt',
                    fontWeight: 800,
                    color: '#991b1b',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    ▲ Point le plus haut : {maxLoadPoint.kW.toFixed(2)} kW ({maxLoadPoint.time})
                  </span>
                )}
                {minLoadPoint && (
                  <span style={{
                    fontSize: '7pt',
                    fontWeight: 800,
                    color: '#1e40af',
                    backgroundColor: '#dbeafe',
                    border: '1px solid #bfdbfe',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    ▼ Point le plus bas : {minLoadPoint.kW.toFixed(2)} kW ({minLoadPoint.time})
                  </span>
                )}
              </div>
            </div>

            {loadData.length > 0 ? (
              <div style={{ width: '100%', height: '245px' }}>
                <ResponsiveContainer width="100%" height={245}>
                  <AreaChart
                    data={loadData}
                    margin={{ top: 8, right: 15, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="printGreenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="time"
                      fontSize={8}
                      tick={{ fill: '#94a3b8' }}
                      interval={Math.floor(loadData.length / 8)}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      fontSize={8.5}
                      tick={{ fill: '#94a3b8' }}
                      unit=" kW"
                      width={52}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      ticks={[0, 25, 50, 75, 100]}
                      domain={[0, 100]}
                    />
                    {maxLoadPoint && (
                      <ReferenceLine
                        y={maxLoadPoint.kW}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="kW"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#printGreenGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '245px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '8pt' }}>
                Courbe de charge non disponible pour ce compteur
              </div>
            )}
          </div>

          {/* ── GRAPHIQUE 3 : PUISSANCE MAX (IDENTIQUE À L'ONGLET NELSON) ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '4mm 4.5mm 3.5mm 4.5mm',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5mm' }}>
              <div>
                <div style={{ fontSize: '9pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Puissance maximale journalière (kW)
                </div>
                <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5mm' }}>
                  {maxPwrChart.length > 0 ? `Historique journalier · ${maxPwrChart.length} jours · Max : ${peakKw.toFixed(2)} kW` : 'Non disponible'}
                </div>
              </div>

              {/* Indicateurs Point le plus haut & Point le plus bas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {maxPwrPoint && (
                  <span style={{
                    fontSize: '7pt',
                    fontWeight: 800,
                    color: '#991b1b',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    ▲ Point le plus haut : {maxPwrPoint.kW.toFixed(2)} kW ({maxPwrPoint.date})
                  </span>
                )}
                {minPwrPoint && (
                  <span style={{
                    fontSize: '7pt',
                    fontWeight: 800,
                    color: '#1e40af',
                    backgroundColor: '#dbeafe',
                    border: '1px solid #bfdbfe',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    ▼ Point le plus bas : {minPwrPoint.kW.toFixed(2)} kW ({minPwrPoint.date})
                  </span>
                )}
              </div>
            </div>

            {maxPwrChart.length > 0 ? (
              <div style={{ width: '100%', height: '245px' }}>
                <ResponsiveContainer width="100%" height={245}>
                  <LineChart
                    data={maxPwrChart}
                    margin={{ top: 8, right: 15, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      fontSize={8}
                      tick={{ fill: '#94a3b8' }}
                      interval={Math.floor(maxPwrChart.length / 10)}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      fontSize={8.5}
                      tick={{ fill: '#94a3b8' }}
                      unit=" kW"
                      width={52}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      ticks={[0, 25, 50, 75, 100]}
                      domain={[0, 100]}
                    />
                    {maxPwrPoint && (
                      <ReferenceLine
                        y={maxPwrPoint.kW}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="kW"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '245px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '8pt' }}>
                Historique de puissance maximale non disponible
              </div>
            )}
          </div>

          {/* ── PIED DE PAGE 2 ── */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '6.8pt', color: '#94a3b8', lineHeight: 1.2, maxWidth: '140mm' }}>
              Données télé-relevées Linky certifiées Enedis. Analyse de charge au pas 30 minutes et historique de puissance maximale atteinte.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3.5mm' }}>
              <span style={{ fontSize: '7.5pt', fontWeight: 700, color: '#64748b' }}>
                Page 2 / 2
              </span>
              <span style={{ fontSize: '8pt', fontWeight: 800, color: '#2563eb' }}>
                nelsonpv.fr
              </span>
            </div>
          </div>

        </div>

      </div>
    </>
  );
};

export default EnedisPrintLayout;
