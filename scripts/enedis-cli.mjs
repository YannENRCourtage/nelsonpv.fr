// scripts/enedis-cli.mjs
/**
 * CLI & Module d'automatisation Enedis Tiers pour Nelson
 * Usage :
 *   node scripts/enedis-cli.mjs auth
 *   node scripts/enedis-cli.mjs declare 16138350177475 --name "Jean Dupont" --email "jean@example.com"
 *   node scripts/enedis-cli.mjs fetch 16138350177475
 *   node scripts/enedis-cli.mjs load-curve 16138350177475 --days 7
 *   node scripts/enedis-cli.mjs auto 16138350177475 --name "Jean Dupont" (Appelé par Webhook Signature)
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
  clientName = '',
  clientEmail = '',
  clientCompany = '',
  mandateRef = '',
  env = 'production'
}) {
  const token = await getAccessToken(env);
  const baseUrl = ENEDIS_HOSTS[env] || ENEDIS_HOSTS.production;

  const yesterday = new Date(Date.now() - 86400000);
  const end = yesterday.toISOString().split('T')[0];
  const start7d = new Date(yesterday.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const start1y = new Date(yesterday.getTime() - 365 * 86400000).toISOString().split('T')[0];

  console.log(`[Enedis Automation] Traitement PRM ${prm} pour ${clientName || clientCompany || 'Client'}...`);

  const [dailyRes, loadRes, maxRes] = await Promise.allSettled([
    axios.get(`${baseUrl}/metering_data_dc/v5/daily_consumption`, {
      params: { usage_point_id: prm, start: start1y, end },
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: 10000
    }),
    axios.get(`${baseUrl}/metering_data_dc/v5/load_curve`, {
      params: { usage_point_id: prm, start: start7d, end },
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: 10000
    }),
    axios.get(`${baseUrl}/metering_data_dcmp/v5/daily_consumption_max_power`, {
      params: { usage_point_id: prm, start: start7d, end },
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: 10000
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

// Mode CLI
if (process.argv[1]?.endsWith('enedis-cli.mjs')) {
  const action = process.argv[2] || 'auth';
  const prm = process.argv[3] || '16138350177475';

  if (action === 'auth') {
    console.log('--- Test Authentification Enedis ---');
    try {
      const token = await getAccessToken('production');
      console.log('✅ Token Production généré :', token.substring(0, 20) + '...');
    } catch (e) {
      console.error('❌ Erreur token :', e.message);
    }
  } else if (action === 'auto' || action === 'fetch') {
    try {
      const res = await declareAndFetchEnedis({ prm });
      console.log('Résultats :', res);
    } catch (e) {
      console.error('❌ Erreur auto :', e.message);
    }
  }
}
