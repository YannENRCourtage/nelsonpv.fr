// src/services/enedisAutomation.js
/**
 * Service d'automatisation Enedis Tiers pour Nelson
 * Exécute la déclaration de mandat et l'ingestion automatique des données (consommations & courbes de charge)
 */

import axios from 'axios';

const CLIENT_ID = process.env.ENEDIS_CLIENT_ID || 'LZbBqEykwlKJelO_p2_En2pf0vYa';
const CLIENT_SECRET = process.env.ENEDIS_CLIENT_SECRET || 'NL7NJSoL1OlNNLy4F0gXw0852gga';

const ENEDIS_HOSTS = {
  production: 'https://gw.ext.prod.api.enedis.fr',
  sandbox: 'https://gw.ext.prod-sandbox.api.enedis.fr'
};

export async function getAccessToken(env = 'production') {
  const baseUrl = ENEDIS_HOSTS[env] || ENEDIS_HOSTS.production;
  const authHeader = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    `${baseUrl}/oauth2/v3/token`,
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      timeout: 15000
    }
  );
  return response.data.access_token;
}

export async function declareAndFetchEnedis({
  prm,
  clientName = 'Client',
  clientEmail = '',
  clientCompany = '',
  mandateRef = '',
  env = 'production'
}) {
  const baseUrl = ENEDIS_HOSTS[env] || ENEDIS_HOSTS.production;
  const token = await getAccessToken(env);

  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const lastYear = new Date();
  lastYear.setFullYear(today.getFullYear() - 1);
  const startDate = lastYear.toISOString().split('T')[0];

  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  const loadCurveStart = lastWeek.toISOString().split('T')[0];

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

  const callMeasureV2OrV5 = async (v2Path, v5Path, s, e) => {
    try {
      return await axios.get(`${baseUrl}/${v2Path}`, {
        params: { pointId: prm, dateDebut: s, dateFin: e },
        headers,
        timeout: 15000
      });
    } catch (v2Err) {
      if (v2Err.response?.status === 403 || !v5Path) throw v2Err;
      return await axios.get(`${baseUrl}/${v5Path}`, {
        params: { usage_point_id: prm, start: s, end: e },
        headers,
        timeout: 15000
      });
    }
  };

  const extractIntervals = (payload) => {
    if (!payload) return [];
    const grandeurs = Array.isArray(payload.grandeur)
      ? payload.grandeur
      : (Array.isArray(payload.grandeurs) ? payload.grandeurs : null);
    if (grandeurs && grandeurs.length > 0 && Array.isArray(grandeurs[0]?.points)) {
      const unit = (grandeurs[0].unite || '').toString().trim().toUpperCase();
      const mult = (unit === 'KWH' || unit === 'KW' || unit === 'KVA') ? 1000 : 1;
      return grandeurs[0].points.map(pt => ({
        date: pt.date || pt.d || pt.horodate || '',
        value: String(Math.round((parseFloat(pt.valeur ?? pt.value ?? pt.v) || 0) * mult))
      })).filter(r => r.date);
    }
    return payload?.meter_reading?.interval_reading || [];
  };

  const [dailyRes, loadRes, maxRes] = await Promise.allSettled([
    callMeasureV2OrV5('mesures/v2/consommations_quotidiennes', 'metering_data_dc/v5/daily_consumption', startDate, endDate),
    callMeasureV2OrV5('mesures/v2/courbe_charge', 'metering_data_dc/v5/load_curve', loadCurveStart, endDate),
    callMeasureV2OrV5('mesures/v2/puissances_maximales', 'metering_data_dcmp/v5/daily_consumption_max_power', startDate, endDate)
  ]);

  let annualKwh = null;
  let avgDailyKwh = null;
  let dailyIntervals = [];
  if (dailyRes.status === 'fulfilled') {
    dailyIntervals = extractIntervals(dailyRes.value.data);
    const totalWh = dailyIntervals.reduce((s, r) => s + (parseInt(r.value) || 0), 0);
    annualKwh = Math.round(totalWh / 1000);
    avgDailyKwh = dailyIntervals.length > 0 ? Number((annualKwh / dailyIntervals.length).toFixed(1)) : null;
    console.log(`[Enedis Automation] ✅ Consommation annuelle réelle : ${annualKwh.toLocaleString('fr-FR')} kWh (${avgDailyKwh} kWh/j)`);
  }

  let peakKw = null;
  let maxReadings = [];
  if (maxRes.status === 'fulfilled') {
    maxReadings = extractIntervals(maxRes.value.data);
    const maxVa = maxReadings.reduce((m, r) => Math.max(m, parseFloat(r.value || 0)), 0);
    peakKw = maxVa > 0 ? Number((maxVa / 1000).toFixed(2)) : null;
  }

  let loadCurvePoints = [];
  if (loadRes.status === 'fulfilled') {
    loadCurvePoints = extractIntervals(loadRes.value.data);
    console.log(`[Enedis Automation] ✅ Courbe de charge récupérée : ${loadCurvePoints.length} points`);
  } else {
    console.log(`[Enedis Automation] ℹ️ Courbe de charge non disponible (status ${loadRes.reason?.response?.status}) - Attente synchronisation.`);
  }

  return {
    prm,
    clientName,
    mandateRef,
    annualKwh,
    avgDailyKwh,
    peakKw,
    loadCurvePointsCount: loadCurvePoints.length,
    dailyReadings: dailyIntervals,
    maxPowerReadings: maxReadings
  };
}
