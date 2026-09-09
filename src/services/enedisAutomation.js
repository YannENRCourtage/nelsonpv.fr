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

  const [dailyRes, loadRes, maxRes] = await Promise.allSettled([
    axios.get(`${baseUrl}/metering_data_dc/v5/daily_consumption`, {
      params: { usage_point_id: prm, start: startDate, end: endDate },
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: 15000
    }),
    axios.get(`${baseUrl}/metering_data_dc/v5/load_curve`, {
      params: { usage_point_id: prm, start: loadCurveStart, end: endDate },
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: 15000
    }),
    axios.get(`${baseUrl}/metering_data_dcmp/v5/daily_consumption_max_power`, {
      params: { usage_point_id: prm, start: startDate, end: endDate },
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: 15000
    })
  ]);

  let annualKwh = null;
  if (dailyRes.status === 'fulfilled') {
    const intervals = dailyRes.value.data?.meter_reading?.interval_reading || [];
    const totalWh = intervals.reduce((s, r) => s + (parseInt(r.value) || 0), 0);
    annualKwh = Math.round(totalWh / 1000);
    console.log(`[Enedis Automation] ✅ Consommation annuelle calculée : ${annualKwh.toLocaleString('fr-FR')} kWh`);
  }

  let loadCurvePoints = [];
  if (loadRes.status === 'fulfilled') {
    loadCurvePoints = loadRes.value.data?.meter_reading?.interval_reading || [];
    console.log(`[Enedis Automation] ✅ Courbe de charge récupérée : ${loadCurvePoints.length} points`);
  } else {
    console.log(`[Enedis Automation] ℹ️ Courbe de charge non disponible (status ${loadRes.reason?.response?.status}) - Fallback activé.`);
  }

  return {
    prm,
    clientName,
    mandateRef,
    annualKwh,
    loadCurvePointsCount: loadCurvePoints.length,
    dailyReadings: dailyRes.status === 'fulfilled' ? dailyRes.value.data?.meter_reading?.interval_reading || [] : [],
    maxPowerReadings: maxRes.status === 'fulfilled' ? maxRes.value.data?.meter_reading?.interval_reading || [] : []
  };
}
