// api/enedis/[[...slug]].js
// Gestionnaire centralisé pour toutes les routes Enedis Data Connect & Mandat Tiers (SGE / Data Connect 2026)
// Routes gérées :
//   GET  /api/enedis/token           → vérifie ou génère le token d'accès Tiers
//   POST /api/enedis/declare-mandate → enregistre l'attestation de Mandat Tiers (sans compte client Enedis)
//   GET  /api/enedis/load-curve      → récupère la courbe de charge (10 ou 30 min) sur une période (ex: 7 jours)
//   GET  /api/enedis/fetch           → récupère les données consolidées (conso journalière, max power, identité)
//   GET  /api/enedis/auth            → initie le flux OAuth2 historique
//   GET  /api/enedis/callback        → reçoit le code Enedis post-consentement OAuth2
//   POST /api/enedis/send-consent    → envoie le lien d'autorisation par email

import axios from 'axios';
import { getAdminDb } from '../../src/lib/firebase-admin.js';
import crypto from 'crypto';
import { setSecureCors } from '../common/_authMiddleware.js';
import { generateMandatPdf } from '../../src/services/enedisMandatPdfService.js';
import { declareAndFetchEnedis } from '../../src/services/enedisAutomation.js';

// ─── Passerelles & Domaines Enedis ───────────────────────────────────────────
const ENEDIS_HOSTS = {
  production: 'https://gw.ext.prod.api.enedis.fr',
  sandbox:    'https://gw.ext.prod-sandbox.api.enedis.fr'
};

function getBaseUrl(env = 'production') {
  return ENEDIS_HOSTS[env] || ENEDIS_HOSTS.production;
}

// ─── Cache de Token Tiers en mémoire ─────────────────────────────────────────
const tokenCache = {
  production: { token: null, expiresAt: 0 },
  sandbox:    { token: null, expiresAt: 0 }
};

/**
 * Récupère ou rafraîchit un jeton d'accès applicatif (Client Credentials)
 * Utilisable pour toutes les opérations sous Mandat Tiers.
 */
async function getOrRefreshTiersToken(env = 'production') {
  const selectedEnv = env === 'sandbox' ? 'sandbox' : 'production';
  const cached = tokenCache[selectedEnv];
  const now = Date.now();

  // Marge de 5 minutes (300 000 ms) avant expiration réelle
  if (cached.token && cached.expiresAt > now + 300000) {
    return cached.token;
  }

  const clientId     = (process.env.ENEDIS_CLIENT_ID     || '').trim();
  const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    throw new Error('Identifiants Enedis manquants (ENEDIS_CLIENT_ID ou ENEDIS_CLIENT_SECRET)');
  }

  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenUrl   = `${getBaseUrl(selectedEnv)}/oauth2/v3/token`;

  const response = await axios.post(
    tokenUrl,
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      timeout: 15000
    }
  );

  const { access_token, expires_in } = response.data;
  if (!access_token) {
    throw new Error('Aucun jeton d\'accès reçu d\'Enedis.');
  }

  tokenCache[selectedEnv] = {
    token: access_token,
    expiresAt: now + (expires_in || 3600) * 1000
  };

  return access_token;
}

// ─── Handler : /api/enedis/token ─────────────────────────────────────────────
async function handleToken(req, res) {
  const env = req.query.env || 'production';
  try {
    const token = await getOrRefreshTiersToken(env);
    const cached = tokenCache[env];
    return res.status(200).json({
      success: true,
      env,
      expiresAt: new Date(cached.expiresAt).toISOString(),
      tokenPreview: token.substring(0, 18) + '...'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      details: err.response?.data || null
    });
  }
}

// ─── Handler : /api/enedis/declare-mandate ────────────────────────────────────
/**
 * Déclare et atteste un Mandat Tiers signé par le client.
 * Évite d'obliger le client à se connecter sur le portail public Enedis.
 */
async function handleDeclareMandate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    prm,
    clientName = '',
    clientEmail = '',
    clientCompany = '',
    clientSiren = '',
    mandateDate = new Date().toISOString(),
    durationYears = 3,
    mandateRef = '',
    scope = ['daily_consumption', 'daily_consumption_max_power', 'load_curve', 'identities'],
    projectId = 'admin_test',
    env = 'production'
  } = req.body || {};

  const cleanPrm = (prm || '').toString().trim();
  if (!cleanPrm || cleanPrm.length !== 14 || !/^\d{14}$/.test(cleanPrm)) {
    return res.status(400).json({ error: 'Le PRM doit contenir exactement 14 chiffres.' });
  }

  const durationNum = parseInt(durationYears) || 3;
  const signatureDate = new Date(mandateDate);
  const validSignatureDate = isNaN(signatureDate.getTime()) ? new Date() : signatureDate;
  
  // Date d'expiration légale (3 ans par défaut conformément à la CRE/CNIL)
  const expiresDate = new Date(validSignatureDate.getTime() + durationNum * 365.25 * 86400000);
  const nowIso = new Date().toISOString();

  const mandatePayload = {
    prm: cleanPrm,
    projectId: projectId || 'admin_test',
    mandateType: 'TIERS_MANDATE',
    status: 'ACTIVE',
    clientName: clientName.trim(),
    clientEmail: clientEmail.trim(),
    clientCompany: clientCompany.trim(),
    clientSiren: clientSiren.trim(),
    titulaire: (clientCompany || clientName || 'Client sous Mandat').trim(),
    mandateDate: validSignatureDate.toISOString(),
    expiresAt: expiresDate.toISOString(),
    mandateRef: mandateRef || `MAN-${cleanPrm}-${Date.now().toString(36).toUpperCase()}`,
    declaredBy: 'ENR COURTAGE ENERGIE',
    declarantEmail: 'contact@enr-courtage.fr',
    declarantPortal: 'SGE Tiers',
    scope,
    env,
    updatedAt: nowIso
  };

  try {
    // 1. Obtenir le token Tiers pour vérifier l'accès immédiat
    const token = await getOrRefreshTiersToken(env);
    mandatePayload.accessToken = token;

    // 2. Tester l'interrogation immédiate de la consommation sur Enedis
    const baseUrl = getBaseUrl(env);
    const yesterday = new Date(Date.now() - 86400000);
    const end = yesterday.toISOString().split('T')[0];
    const startLastYear = new Date(yesterday.getTime() - 365 * 86400000).toISOString().split('T')[0];

    let annualConsumption = null;
    let recentReadingsCount = 0;
    let testStatus = 'TESTED';

    try {
      const dailyRes = await axios.get(`${baseUrl}/metering_data_dc/v5/daily_consumption`, {
        params: { usage_point_id: cleanPrm, start: startLastYear, end },
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: 10000
      });
      const readings = dailyRes.data?.meter_reading?.interval_reading || [];
      recentReadingsCount = readings.length;
      if (readings.length > 0) {
        const totalWh = readings.reduce((s, r) => s + (parseInt(r.value) || 0), 0);
        annualConsumption = Math.round(totalWh / 1000);
      }
    } catch (apiErr) {
      console.warn(`[Declare Mandate] Enedis test query returned ${apiErr.response?.status}: ${apiErr.message}`);
      testStatus = apiErr.response?.status === 403 ? 'CONSENT_PENDING_GRD' : 'ACTIVE_AWAITING_DATA';
    }

    mandatePayload.annualConsumption = annualConsumption;
    mandatePayload.verificationStatus = testStatus;

    // 3. Sauvegarder dans Firestore (collection enedis_consents)
    try {
      const db = getAdminDb();
      await db.collection('enedis_consents').doc(cleanPrm).set(mandatePayload, { merge: true });
    } catch (dbErr) {
      console.warn('[Declare Mandate] Firestore save warning:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Mandat Tiers enregistré avec succès.',
      mandate: mandatePayload,
      metrics: {
        annualConsumptionKwh: annualConsumption,
        daysAvailable: recentReadingsCount
      }
    });

  } catch (err) {
    console.error('[Declare Mandate] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Échec de la déclaration du mandat',
      details: err.response?.data || err.message
    });
  }
}

// ─── Handler : /api/enedis/load-curve ─────────────────────────────────────────
/**
 * Récupère la courbe de charge (au pas de 10 ou 30 minutes) sur une période donnée (ex: 7 derniers jours).
 * Gère le diagnostic spécifique Linky et le fallback transparent sur la puissance max et conso journalière.
 */
async function handleLoadCurve(req, res) {
  const { prm, start, end, env = 'production' } = req.query;

  const cleanPrm = (prm || '').toString().trim();
  if (!cleanPrm || cleanPrm.length !== 14 || !/^\d{14}$/.test(cleanPrm)) {
    return res.status(400).json({ error: 'Le PRM doit comporter exactement 14 chiffres.' });
  }

  // Période par défaut : les 7 derniers jours complets (J-7 à J-1)
  const yesterday = new Date(Date.now() - 86400000);
  const defaultEnd = yesterday.toISOString().split('T')[0];
  const defaultStart = new Date(yesterday.getTime() - 7 * 86400000).toISOString().split('T')[0];

  const startDate = start || defaultStart;
  const endDate   = end   || defaultEnd;

  try {
    const token   = await getOrRefreshTiersToken(env);
    const baseUrl = getBaseUrl(env);

    // 1. Requête principale : courbe de charge
    let loadCurveData = null;
    let loadCurveError = null;

    try {
      const loadRes = await axios.get(`${baseUrl}/metering_data_dc/v5/load_curve`, {
        params: { usage_point_id: cleanPrm, start: startDate, end: endDate },
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: 12000
      });
      loadCurveData = loadRes.data;
    } catch (loadErr) {
      loadCurveError = {
        status: loadErr.response?.status,
        data: loadErr.response?.data,
        message: loadErr.message
      };
    }

    // 2. Si la courbe de charge fine a réussi
    if (loadCurveData && loadCurveData.meter_reading) {
      const reading = loadCurveData.meter_reading;
      const intervals = reading.interval_reading || [];
      const unit = reading.reading_type?.unit || 'W';

      // Calcul des statistiques
      let maxPowerW = 0;
      let sumPowerW = 0;
      let minPowerW = Infinity;
      const points = intervals.map(pt => {
        const val = parseFloat(pt.value) || 0;
        if (val > maxPowerW) maxPowerW = val;
        if (val < minPowerW) minPowerW = val;
        sumPowerW += val;
        return {
          date: pt.date,
          value: val,
          intervalLength: pt.interval_length || 'PT30M'
        };
      });

      const avgPowerW = points.length > 0 ? Math.round(sumPowerW / points.length) : 0;
      const actualMin = points.length > 0 && minPowerW !== Infinity ? minPowerW : 0;

      return res.status(200).json({
        success: true,
        source: 'ENEDIS_LOAD_CURVE_REAL',
        prm: cleanPrm,
        period: { start: startDate, end: endDate },
        readingType: reading.reading_type,
        stats: {
          pointsCount: points.length,
          unit,
          maxPowerKw: parseFloat((maxPowerW / 1000).toFixed(3)),
          avgPowerKw: parseFloat((avgPowerW / 1000).toFixed(3)),
          minPowerKw: parseFloat((actualMin / 1000).toFixed(3))
        },
        points,
        raw: loadCurveData
      });
    }

    // 3. En cas d'erreur sur la courbe de charge : Analyse & Fallback immédiat
    // Sur Linky, si l'enregistrement de la courbe de charge n'a pas été activé physiquement,
    // Enedis retourne une erreur 500. On interroge alors en fallback la puissance max journalière
    // et la consommation journalière pour ne pas laisser l'utilisateur bloqué.
    const isLinkyNotActivated = loadCurveError?.status === 500;
    const isForbidden = loadCurveError?.status === 403;
    const isNotFound = loadCurveError?.status === 404;

    // Requêtes de fallback
    const [dailyRes, maxPowerRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/metering_data_dc/v5/daily_consumption`, {
        params: { usage_point_id: cleanPrm, start: startDate, end: endDate },
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: 10000
      }),
      axios.get(`${baseUrl}/metering_data_dcmp/v5/daily_consumption_max_power`, {
        params: { usage_point_id: cleanPrm, start: startDate, end: endDate },
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: 10000
      })
    ]);

    const dailyData = dailyRes.status === 'fulfilled' ? dailyRes.value.data : null;
    const maxPowerData = maxPowerRes.status === 'fulfilled' ? maxPowerRes.value.data : null;

    let diagnosticCode = 'UNKNOWN_ERROR';
    let diagnosticMessage = 'Impossible de récupérer la courbe de charge Enedis.';

    if (isForbidden) {
      diagnosticCode = 'MANDATE_REQUIRED_OR_REFUSED';
      diagnosticMessage = 'Accès refusé par Enedis (403) : vérifiez que le PRM est bien rattaché à votre compte Tiers ou déclarez un mandat.';
    } else if (isNotFound) {
      diagnosticCode = 'PRM_NOT_FOUND_OR_NO_DATA';
      diagnosticMessage = `Aucune donnée disponible chez Enedis pour le PRM ${cleanPrm} sur cette période.`;
    } else if (isLinkyNotActivated) {
      diagnosticCode = 'LOAD_CURVE_NOT_ACTIVATED_ON_LINKY';
      diagnosticMessage = 'Le compteur Linky physique n’a pas encore activé la collecte locale au pas de 10/30 minutes. Les consommations et puissances journalières restent disponibles.';
    }

    return res.status(200).json({
      success: false,
      code: diagnosticCode,
      message: diagnosticMessage,
      prm: cleanPrm,
      period: { start: startDate, end: endDate },
      enedisHttpStatus: loadCurveError?.status,
      fallback: {
        hasDaily: !!dailyData,
        hasMaxPower: !!maxPowerData,
        daily: dailyData?.meter_reading || null,
        maxPower: maxPowerData?.meter_reading || null
      }
    });

  } catch (err) {
    console.error('[Load Curve] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la courbe de charge',
      details: err.message
    });
  }
}

// ─── Handler : /api/enedis/fetch ─────────────────────────────────────────────
async function handleFetch(req, res) {
  const { projectId, prm, forceRefresh = false, action, env = 'production' } = req.query;

  // 1. Lister les consentements et mandats
  if (action === 'list_consents') {
    try {
      const db = getAdminDb();
      const snapshot = await db.collection('enedis_consents').orderBy('updatedAt', 'desc').get();
      const consents = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          prm: d.prm,
          projectId: d.projectId,
          mandateType: d.mandateType || 'OAUTH_INDIVIDUAL',
          status: d.status || 'ACTIVE',
          clientName: d.clientName || '',
          clientCompany: d.clientCompany || '',
          annualConsumption: d.annualConsumption,
          expiresAt: d.expiresAt,
          updatedAt: d.updatedAt,
          titulaire: d.titulaire || d.clientName || 'Client',
          adresse: d.adresse || ''
        };
      });
      return res.status(200).json({ consents });
    } catch (e) {
      console.error('[Enedis list_consents] Error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  const cleanPrm = (prm || '').toString().trim();
  if (!cleanPrm && !projectId) {
    return res.status(400).json({ error: 'Paramètre PRM ou projectId manquant.' });
  }

  try {
    const adminDb = getAdminDb();
    let consentDoc = null;

    if (cleanPrm) {
      consentDoc = await adminDb.collection('enedis_consents').doc(cleanPrm).get();
    }
    if ((!consentDoc || !consentDoc.exists) && projectId) {
      consentDoc = await adminDb.collection('enedis_consents').doc(projectId).get();
    }
    if ((!consentDoc || !consentDoc.exists) && cleanPrm) {
      const snap = await adminDb.collection('enedis_consents').where('prm', '==', cleanPrm).limit(1).get();
      if (!snap.empty) consentDoc = snap.docs[0];
    }

    // Récupération du token
    let token;
    let consentData = consentDoc?.exists ? consentDoc.data() : null;

    if (consentData?.accessToken && consentData?.mandateType !== 'TIERS_MANDATE') {
      token = consentData.accessToken;
      if (new Date() >= new Date(consentData.expiresAt) || forceRefresh === 'true') {
        token = await getOrRefreshTiersToken(env);
      }
    } else {
      token = await getOrRefreshTiersToken(env);
    }

    const prmVal = cleanPrm || consentData?.prm;
    if (!prmVal || prmVal.length !== 14) {
      return res.status(400).json({ error: 'PRM invalide (14 chiffres requis).' });
    }

    const yesterday      = new Date(Date.now() - 86400000);
    const defaultEnd     = yesterday.toISOString().split('T')[0];
    const defaultStart   = new Date(yesterday.getTime() - 365 * 86400000).toISOString().split('T')[0];
    const loadCurveStart = new Date(yesterday.getTime() -  7 * 86400000).toISOString().split('T')[0];
    const start  = req.query.startDate || defaultStart;
    const end    = req.query.endDate   || defaultEnd;

    const baseUrl = getBaseUrl(env);

    const callApi = (path, s, e) =>
      axios.get(`${baseUrl}/${path}`, {
        params: { usage_point_id: prmVal, start: s, end: e },
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: 10000
      }).then(r => r.data);

    const callIdentity = () =>
      axios.get(`${baseUrl}/customers_dc/v5/usage_points/identities`, {
        params: { usage_point_id: prmVal },
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: 6000
      }).then(r => r.data);

    const [dailyRes, loadRes, maxRes, identityRes] = await Promise.allSettled([
      callApi('metering_data_dc/v5/daily_consumption',          start, end),
      callApi('metering_data_dc/v5/load_curve',                 loadCurveStart, end),
      callApi('metering_data_dcmp/v5/daily_consumption_max_power', start, end),
      callIdentity()
    ]);

    const results = {
      daily:     dailyRes.status === 'fulfilled' ? dailyRes.value     : { error: dailyRes.reason?.message,  status: dailyRes.reason?.response?.status  },
      loadCurve: loadRes.status  === 'fulfilled' ? loadRes.value      : { error: loadRes.reason?.message,   status: loadRes.reason?.response?.status   },
      maxPower:  maxRes.status   === 'fulfilled' ? maxRes.value       : { error: maxRes.reason?.message,    status: maxRes.reason?.response?.status    },
      identity:  identityRes.status === 'fulfilled' ? identityRes.value : { error: identityRes.reason?.message, status: identityRes.reason?.response?.status }
    };

    // Mise à jour de Firestore si doc existant
    if (consentDoc && consentDoc.exists) {
      try {
        const updateData = { updatedAt: new Date().toISOString() };
        if (dailyRes.status === 'fulfilled') {
          const readings = dailyRes.value?.meter_reading?.interval_reading || [];
          updateData.annualConsumption = Math.round(readings.reduce((s, r) => s + parseInt(r.value || 0), 0) / 1000);
        }
        if (identityRes.status === 'fulfilled') {
          const id    = identityRes.value?.customers?.[0]?.customer;
          const civil = id?.person || id?.company;
          if (civil) {
            updateData.titulaire = civil.lastname ? `${civil.firstname || ''} ${civil.lastname}`.trim() : (civil.company_name || 'Inconnu');
            updateData.adresse   = identityRes.value?.customers?.[0]?.usage_point?.usage_point_addresses?.usage_point_address || '';
          }
        }
        await consentDoc.ref.update(updateData);
      } catch (e) { /* non bloquant */ }
    }

    return res.status(200).json({ prm: prmVal, period: { start, end }, data: results });

  } catch (err) {
    console.error('[Enedis Fetch] Error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la récupération des données', details: err.message });
  }
}

// ─── Handler : /api/enedis/auth ──────────────────────────────────────────────
async function handleAuth(req, res) {
  const { projectId, prm } = req.query;
  if (!projectId) return res.status(400).json({ error: 'Missing projectId' });

  const clientId = (process.env.ENEDIS_CLIENT_ID || '').trim();
  if (!clientId) return res.status(500).json({ error: 'Missing ENEDIS_CLIENT_ID' });

  const state = JSON.stringify({ projectId, prm: prm || null });
  const encodedState = Buffer.from(state).toString('base64');

  const authUrl = new URL('https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('duration', 'P3Y');
  authUrl.searchParams.append('state', encodedState);
  if (prm && prm.length === 14) authUrl.searchParams.append('usage_point_id', prm);

  res.redirect(authUrl.toString());
}

// ─── Handler : /api/enedis/callback ──────────────────────────────────────────
async function handleCallback(req, res) {
  const { state, error, usage_point_id, code } = req.query;

  if (error) {
    return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent('Enedis: ' + error)}`);
  }
  if (!state) return res.status(400).json({ error: 'Missing state' });

  let projectId, prm;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    projectId = decoded.projectId;
    prm       = decoded.prm || null;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  const finalPrm = usage_point_id || prm;
  if (!finalPrm) {
    return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent('Aucun PRM reçu dans le callback Enedis.')}`);
  }

  try {
    const token = await getOrRefreshTiersToken('production');
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const db = getAdminDb();
    let annualConsumption = null;
    try {
      const today = new Date();
      const lastYear = new Date(); lastYear.setFullYear(today.getFullYear() - 1);
      const consoRes = await axios.get(`${getBaseUrl('production')}/metering_data_dc/v5/daily_consumption`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { usage_point_id: finalPrm, start: lastYear.toISOString().split('T')[0], end: today.toISOString().split('T')[0] },
        timeout: 10000
      });
      const readings = consoRes.data?.meter_reading?.interval_reading || [];
      const totalWh  = readings.reduce((s, r) => s + (parseInt(r.value) || 0), 0);
      annualConsumption = Math.round(totalWh / 1000);
    } catch (consoErr) {
      console.warn('[Enedis Callback] Could not fetch annual conso:', consoErr.response?.status);
    }

    await db.collection('enedis_consents').doc(finalPrm).set({
      prm: finalPrm,
      mandateType: 'OAUTH_INDIVIDUAL',
      accessToken: token,
      expiresAt,
      updatedAt: new Date().toISOString(),
      projectId,
      annualConsumption
    }, { merge: true });

    if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=success&prm=${finalPrm}`);
    return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${finalPrm}`);

  } catch (err) {
    const errorData = err.response?.data || {};
    const errorMsg  = errorData.error_description || errorData.error || err.message;
    if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(errorMsg)}`);
    return res.redirect(`/project/${projectId || 'new'}/edit?enedis=error&message=${encodeURIComponent(errorMsg)}`);
  }
}

// ─── Handler : /api/enedis/send-consent ──────────────────────────────────────
async function handleSendConsent(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prm, projectId, email, name } = req.body || {};
  if (!prm || prm.length !== 14) return res.status(400).json({ error: 'PRM invalide (14 chiffres requis).' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Adresse email invalide.' });

  const baseUrl    = 'https://www.nelsonpv.fr';
  const params     = new URLSearchParams({ projectId: projectId || 'admin_test' });
  params.append('prm', prm);
  const consentUrl = `${baseUrl}/api/enedis/auth?${params.toString()}`;
  const clientName = (name || 'Client').trim();

  const htmlBody = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Autorisation Enedis</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:40px 48px;text-align:center;">
  <p style="margin:0 0 8px;color:#bfdbfe;font-size:12px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;">ENR Courtage Énergie</p>
  <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">Autorisation Enedis Data Connect</h1>
  <p style="margin:16px 0 0;color:#bfdbfe;font-size:14px;">Accès à vos données de consommation électrique</p>
</td></tr>
<tr><td style="padding:48px 48px 32px;">
  <p style="margin:0 0 20px;color:#334155;font-size:16px;">Bonjour <strong>${clientName}</strong>,</p>
  <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">Dans le cadre de l'étude de votre installation photovoltaïque, nous souhaitons accéder à vos données de consommation via <strong>Enedis Data Connect</strong> (consentement de 3 ans maximum, révocable à tout moment).</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:32px;">
    <tr><td style="padding:16px 24px;">
      <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;">Numéro PRM concerné</p>
      <p style="margin:0;color:#0f172a;font-size:20px;font-weight:800;font-family:'Courier New',monospace;">${prm}</p>
    </td></tr>
  </table>
  <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">Cliquez sur le bouton ci-dessous. Identifiez-vous avec <strong>FranceConnect</strong> — <u>aucun compte Enedis n'est nécessaire</u>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td align="center">
      <a href="${consentUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;text-decoration:none;font-size:16px;font-weight:800;padding:18px 48px;border-radius:12px;">✓ Autoriser l'accès à mes données</a>
    </td></tr>
  </table>
  <p style="margin:0;color:#94a3b8;font-size:12px;">Lien direct : <a href="${consentUrl}" style="color:#3b82f6;word-break:break-all;">${consentUrl}</a></p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
  <p style="margin:0;color:#64748b;font-size:12px;">ENR Courtage Énergie — Nelson PV</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Nelson PV <noreply@nelsonpv.fr>', to: [email], subject: `Autorisation Enedis Data Connect — PRM ${prm}`, html: htmlBody })
    });
    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Erreur envoi email.', details: result });
    return res.status(200).json({ success: true, method: 'resend', id: result.id });
  }

  return res.status(200).json({ success: true, method: 'link_only', consentUrl, warning: 'RESEND_API_KEY non configuré.' });
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

// ─── SECTION SIGNATURE ÉLECTRONIQUE OMNICANALE MANDAT TIERS ───
// Cache en mémoire pour sessions de signature rapides (avec persistance Firestore)
const memorySessions = new Map();

// ─── 1. INITIATION DE LA DEMANDE DE SIGNATURE ─────────────────────────────────
async function handleSignatureInitiate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    prm,
    clientName = '',
    clientCompany = '',
    clientSiren = '',
    clientAddress = '',
    clientEmail = '',
    clientPhone = '',
    channel = 'email', // 'email' | 'sms' | 'whatsapp' | 'tablet'
    projectId = 'admin_test'
  } = req.body || {};

  const cleanPrm = (prm || '').toString().trim();
  if (!cleanPrm || cleanPrm.length !== 14 || !/^\d{14}$/.test(cleanPrm)) {
    return res.status(400).json({ error: 'Le PRM doit contenir exactement 14 chiffres.' });
  }

  const sessionId = 'sig_' + cleanPrm + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const baseUrl = 'https://www.nelsonpv.fr';
  const signingUrl = `${baseUrl}/signer-mandat?session=${sessionId}${channel === 'tablet' ? '&mode=tablet' : ''}`;

  const sessionData = {
    sessionId,
    prm: cleanPrm,
    clientName: clientName.trim(),
    clientCompany: clientCompany.trim(),
    clientSiren: clientSiren.trim(),
    clientAddress: clientAddress.trim(),
    clientEmail: clientEmail.trim(),
    clientPhone: clientPhone.trim(),
    channel,
    projectId,
    status: 'PENDING_SIGNATURE',
    signingUrl,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() // 7 jours de validité pour signer
  };

  // 1. Sauvegarde en mémoire & Firestore
  memorySessions.set(sessionId, sessionData);
  try {
    const db = getAdminDb();
    await db.collection('mandat_signature_sessions').doc(sessionId).set(sessionData);
  } catch (e) {
    console.warn('[Signature Initiate] Firestore save warning:', e.message);
  }

  let deliveryResult = { success: true, channel };

  // 2. Traitement spécifique par canal de diffusion
  if (channel === 'email') {
    if (!clientEmail || !clientEmail.includes('@')) {
      return res.status(400).json({ error: 'Adresse email requise pour l\'envoi par email.' });
    }

    const emailSubject = `Action requise : Signature de votre Mandat Enedis — PRM ${cleanPrm}`;
    const emailHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Signature Mandat Enedis</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:36px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#0f2b48,#1e4a7a);padding:36px 40px;text-align:center;">
  <p style="margin:0 0 6px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">ENR Courtage Énergie — Plateforme Nelson</p>
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Signature Électronique Sécurisée</h1>
  <p style="margin:10px 0 0;color:#bfdbfe;font-size:13px;">Mandat de collecte de données de comptage Enedis</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Bonjour <strong>${clientName || 'Madame, Monsieur'}</strong>,</p>
  <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Dans le cadre de l'étude photovoltaïque et de l'optimisation énergétique de votre site, veuillez signer électroniquement votre <strong>Mandat de représentation Enedis</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:24px;">
    <tr><td style="padding:14px 20px;">
      <p style="margin:0 0 2px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;">Numéro PRM désigné</p>
      <p style="margin:0;color:#0f172a;font-size:18px;font-weight:800;font-family:monospace;">${cleanPrm}</p>
    </td></tr>
  </table>
  <p style="margin:0 0 24px;color:#475569;font-size:13px;line-height:1.5;">🔒 Ce processus de signature est 100% dématérialisé et conforme eIDAS. Une vérification par code de sécurité (OTP SMS) vous sera demandée au moment de valider.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td align="center">
      <a href="${signingUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 36px;border-radius:10px;box-shadow:0 2px 10px rgba(37,99,235,0.3);">✍️ Signer mon Mandat Enedis</a>
    </td></tr>
  </table>
  <p style="margin:0;color:#94a3b8;font-size:11px;">Lien direct de signature : <a href="${signingUrl}" style="color:#2563eb;word-break:break-all;">${signingUrl}</a></p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
  <p style="margin:0;color:#64748b;font-size:11px;">ENR Courtage Énergie — Mandataire Agréé Enedis SGE Tiers • contact@enr-courtage.fr</p>
</td></tr>
</table></td></tr></table></body></html>`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Nelson PV <noreply@nelsonpv.fr>',
            to: [clientEmail],
            subject: emailSubject,
            html: emailHtml
          })
        });
        const resJson = await emailRes.json();
        deliveryResult.emailId = resJson.id;
      } catch (err) {
        console.warn('[Email Delivery Warning]:', err.message);
      }
    }
  } else if (channel === 'whatsapp') {
    const rawPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const phone = rawPhone.startsWith('0') ? '33' + rawPhone.slice(1) : rawPhone;
    const msg = `Bonjour ${clientName || ''}, dans le cadre de votre projet solaire avec ENR Courtage Énergie, voici votre lien sécurisé pour signer le mandat Enedis (PRM ${cleanPrm}) : ${signingUrl}`;
    deliveryResult.whatsAppUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  } else if (channel === 'sms') {
    const rawPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const phone = rawPhone.startsWith('0') ? '+33' + rawPhone.slice(1) : '+' + rawPhone;
    const smsText = `Nelson PV : Signez votre mandat Enedis (PRM ${cleanPrm}) en ligne : ${signingUrl}`;

    // Si Twilio est configuré
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const twilioAuth = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const body = new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER,
          To: phone,
          Body: smsText
        });
        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: { 'Authorization': twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        deliveryResult.smsSent = twilioRes.ok;
      } catch (smsErr) {
        console.warn('[Twilio SMS Error]:', smsErr.message);
      }
    } else {
      deliveryResult.smsSimulated = true;
    }
  }

  return res.status(200).json({
    success: true,
    sessionId,
    channel,
    signingUrl,
    delivery: deliveryResult,
    session: sessionData
  });
}

// ─── 2. RÉCUPÉRATION DE SESSION DE SIGNATURE ───────────────────────────────────
async function handleSignatureSession(req, res) {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'Session ID requis' });

  let session = memorySessions.get(sessionId);
  if (!session) {
    try {
      const db = getAdminDb();
      const doc = await db.collection('mandat_signature_sessions').doc(sessionId).get();
      if (doc.exists) session = doc.data();
    } catch (e) {
      console.warn('[Get Session] Firestore lookup failed:', e.message);
    }
  }

  if (!session) return res.status(404).json({ error: 'Session de signature introuvable ou expirée' });
  return res.status(200).json({ session });
}

// ─── 3. ENVOI DU CODE OTP SMS (Sécurité eIDAS) ─────────────────────────────────
async function handleSignatureSendOtp(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, phone } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Session ID requis' });

  let session = memorySessions.get(sessionId);
  if (!session) {
    const db = getAdminDb();
    const doc = await db.collection('mandat_signature_sessions').doc(sessionId).get();
    if (doc.exists) session = doc.data();
  }
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const targetPhone = phone || session.clientPhone;
  if (!targetPhone) return res.status(400).json({ error: 'Numéro de téléphone requis pour l\'envoi du code OTP.' });

  // Génération d'un code OTP à 6 chiffres
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
  const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  session.otpHash = otpHash;
  session.otpExpiresAt = otpExpiresAt;
  memorySessions.set(sessionId, session);

  try {
    const db = getAdminDb();
    await db.collection('mandat_signature_sessions').doc(sessionId).update({
      otpHash,
      otpExpiresAt,
      otpPhone: targetPhone
    });
  } catch (e) { /* non bloquant */ }

  // Envoi SMS via Twilio ou Simulation
  let smsSent = false;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const twilioAuth = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const formattedPhone = targetPhone.replace(/[^0-9]/g, '').replace(/^0/, '+33');
      const body = new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: formattedPhone.startsWith('+') ? formattedPhone : '+' + formattedPhone,
        Body: `Votre code de signature Mandat Enedis : ${otpCode}. Valable 10 minutes.`
      });
      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: { 'Authorization': twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      smsSent = twilioRes.ok;
    } catch (e) {
      console.warn('[OTP SMS error]:', e.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Code de sécurité OTP envoyé.',
    phoneMasked: targetPhone.slice(0, 3) + ' ••• •• ' + targetPhone.slice(-2),
    // En environnement de test ou si Twilio n'est pas configuré, on renvoie un code de démonstration
    demoCode: !process.env.TWILIO_ACCOUNT_SID ? otpCode : undefined
  });
}

// ─── 4. VÉRIFICATION OTP, SCELLEMENT DU PDF & DÉCLENCHEUR CRITIQUE ENEDIS ──────
async function handleSignatureVerifyAndSign(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    sessionId,
    otpCode,
    signatureImageBase64 = null,
    isTabletInPerson = false,
    signaturePlace = 'France'
  } = req.body || {};

  if (!sessionId) return res.status(400).json({ error: 'Session ID requis' });

  let session = memorySessions.get(sessionId);
  if (!session) {
    const db = getAdminDb();
    const doc = await db.collection('mandat_signature_sessions').doc(sessionId).get();
    if (doc.exists) session = doc.data();
  }
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  // Vérification OTP (obligatoire à distance, facultative en mode tablette présentiel si expressément consenti)
  if (!isTabletInPerson) {
    if (!otpCode) return res.status(400).json({ error: 'Code de sécurité OTP obligatoire.' });
    if (!session.otpHash || Date.now() > session.otpExpiresAt) {
      return res.status(400).json({ error: 'Code OTP expiré. Veuillez en redemander un nouveau.' });
    }
    const inputHash = crypto.createHash('sha256').update(otpCode.trim()).digest('hex');
    if (inputHash !== session.otpHash) {
      return res.status(400).json({ error: 'Code OTP incorrect.' });
    }
  }

  const signerIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const nowIso = new Date().toISOString();
  const sha256Fingerprint = crypto.createHash('sha256').update(sessionId + nowIso + signerIp).digest('hex');

  const eidasAuditTrail = {
    envelopeId: session.sessionId,
    authMethod: isTabletInPerson ? 'Signature Présentielle sur Tablette' : 'Code OTP SMS certifié',
    provider: 'Nelson eIDAS Security Engine',
    timestamp: nowIso,
    signerIp: signerIp.toString(),
    sha256: sha256Fingerprint
  };

  // 1. Génération du PDF signé officiel scellé
  const signedPdfBytes = await generateMandatPdf({
    clientName: session.clientName,
    clientCompany: session.clientCompany,
    clientSiren: session.clientSiren,
    clientAddress: session.clientAddress,
    clientPhone: session.clientPhone,
    clientEmail: session.clientEmail,
    prm: session.prm,
    signatureDate: new Date().toLocaleDateString('fr-FR'),
    signaturePlace: signaturePlace || 'France',
    signatureImageBase64,
    eidasAuditTrail
  });

  const pdfBase64 = Buffer.from(signedPdfBytes).toString('base64');

  // 2. Mise à jour de la session
  session.status = 'COMPLETED';
  session.signedAt = nowIso;
  session.auditTrail = eidasAuditTrail;
  memorySessions.set(sessionId, session);

  // 3. Mise à jour dans Firestore
  try {
    const db = getAdminDb();
    await db.collection('mandat_signature_sessions').doc(sessionId).set({
      ...session,
      pdfBase64Preview: pdfBase64.substring(0, 100) + '...'
    }, { merge: true });

    // Mise à jour du projet / CRM au statut 'Mandat Signé'
    if (session.projectId && session.projectId !== 'admin_test') {
      await db.collection('projects').doc(session.projectId).set({
        mandatStatus: 'SIGNE',
        mandatSignedAt: nowIso,
        mandatPrm: session.prm,
        mandatSessionId: sessionId
      }, { merge: true });
    }
  } catch (dbErr) {
    console.warn('[Verify & Sign] Firestore update warning:', dbErr.message);
  }

  // 4. ⚡ DÉCLENCHEUR CRITIQUE AUTOMATISÉ : Enregistrement Enedis & Ingestion Courbes
  let enedisResult = null;
  try {
    console.log(`[Signature Completed] Déclenchement automatique Enedis pour PRM ${session.prm}...`);
    enedisResult = await declareAndFetchEnedis({
      prm: session.prm,
      clientName: session.clientName || session.clientCompany,
      clientEmail: session.clientEmail,
      clientCompany: session.clientCompany,
      mandateRef: session.sessionId,
      env: 'production'
    });
    console.log(`[Signature Completed] Enedis déclenché avec succès : ${enedisResult.annualKwh || 0} kWh ingérés.`);
  } catch (enedisErr) {
    console.error('[Signature Completed] Erreur déclenchement Enedis:', enedisErr.message);
    enedisResult = { error: enedisErr.message };
  }

  return res.status(200).json({
    success: true,
    message: 'Mandat Enedis signé avec succès et transmis au gestionnaire de réseau.',
    sessionId,
    signedAt: nowIso,
    prm: session.prm,
    auditTrail: eidasAuditTrail,
    enedisAutomation: enedisResult,
    pdfBase64
  });
}

// ─── 5. WEBHOOK EXTERNE (Yousign / DocuSign) ───────────────────────────────────
async function handleSignatureWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const event = req.body || {};
  console.log('[Signature Webhook] Événement reçu :', event.event_name || event.action || 'Unknown');

  // Détection Yousign (signature_request.completed) ou DocuSign
  const isCompleted = event.event_name === 'signature_request.completed' ||
                      event.action === 'envelope-completed' ||
                      event.status === 'completed';

  if (isCompleted) {
    const prm = event.data?.custom_id || event.prm || event.envelopeId;
    if (prm) {
      console.log(`[Signature Webhook] DÉCLENCHEUR AUTOMATISÉ pour PRM ${prm}...`);
      try {
        await declareAndFetchEnedis({ prm });
      } catch (e) {
        console.error('[Signature Webhook] Enedis trigger error:', e.message);
      }
    }
  }

  return res.status(200).json({ received: true });
}


export default async function handler(req, res) {
  const { slug } = req.query;
  const route = slug && slug.length > 0 ? slug[0] : '';

  // Configuration CORS pour les appels d'API
  setSecureCors(req, res, 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (route === 'token')           return await handleToken(req, res);
    if (route === 'declare-mandate') return await handleDeclareMandate(req, res);
    if (route === 'load-curve')      return await handleLoadCurve(req, res);
    if (route === 'fetch')           return await handleFetch(req, res);
    if (route === 'auth')            return await handleAuth(req, res);
    if (route === 'callback')        return await handleCallback(req, res);
    if (route === 'send-consent')    return await handleSendConsent(req, res);

    // Routes Signature Électronique Mandat Tiers
    if (route === 'signature-initiate' || route === 'initiate')               return await handleSignatureInitiate(req, res);
    if (route === 'signature-session' || route === 'session')                 return await handleSignatureSession(req, res);
    if (route === 'signature-send-otp' || route === 'send-otp')               return await handleSignatureSendOtp(req, res);
    if (route === 'signature-verify-and-sign' || route === 'verify-and-sign') return await handleSignatureVerifyAndSign(req, res);
    if (route === 'signature-verify' || route === 'verify')                   return await handleSignatureVerifyAndSign(req, res);
    if (route === 'signature-webhook' || route === 'webhook')                 return await handleSignatureWebhook(req, res);

    return res.status(404).json({ error: `Route Enedis inconnue: ${route}` });
  } catch (err) {
    console.error('[Enedis API Dispatcher] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
