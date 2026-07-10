// api/enedis/[[...slug]].js
// Gestionnaire unique pour toutes les routes Enedis Data Connect
// Routes gérées :
//   GET  /api/enedis/auth         → initie le flux OAuth2
//   GET  /api/enedis/callback     → reçoit le code Enedis post-consentement
//   GET  /api/enedis/fetch        → récupère les données de conso
//   POST /api/enedis/send-consent → envoie le lien par email

import axios from 'axios';
import { getAdminDb } from '../../src/lib/firebase-admin.js';


// ─── URLs API Enedis Production v5 ───────────────────────────────────────────
const ENEDIS_TOKEN_URL        = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';
const ENEDIS_METERING_BASE    = 'https://gw.ext.prod.api.enedis.fr/metering_data_dc/v5';
const ENEDIS_MAX_POWER_BASE   = 'https://gw.ext.prod.api.enedis.fr/metering_data_dcmp/v5';
const ENEDIS_CUSTOMERS_BASE   = 'https://gw.ext.prod.api.enedis.fr/customers_dc/v5';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function refreshToken(consentDoc) {
    const consent = consentDoc.data();
    const clientId     = (process.env.ENEDIS_CLIENT_ID     || '').trim();
    const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || '').trim();
    const authHeader   = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
        ENEDIS_TOKEN_URL,
        new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': authHeader }, timeout: 15000 }
    );

    const { access_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
    const updateData = { accessToken: access_token, expiresAt, updatedAt: new Date().toISOString() };
    await consentDoc.ref.update(updateData);
    return { ...consent, ...updateData };
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
        const clientId     = (process.env.ENEDIS_CLIENT_ID     || '').trim();
        const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || '').trim();
        const authHeader   = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenResponse = await axios.post(
            ENEDIS_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': authHeader }, timeout: 15000 }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

        const db = getAdminDb();

        // Récupérer la consommation annuelle
        let annualConsumption = null;
        try {
            const today    = new Date();
            const lastYear = new Date(); lastYear.setFullYear(today.getFullYear() - 1);
            const consoRes = await axios.get(`${ENEDIS_METERING_BASE}/daily_consumption`, {
                headers: { 'Authorization': `Bearer ${access_token}` },
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
            prm: finalPrm, accessToken: access_token, refreshToken: refresh_token || null,
            expiresAt, updatedAt: new Date().toISOString(), projectId, annualConsumption
        }, { merge: true });

        if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=success&prm=${finalPrm}`);
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${finalPrm}`);

    } catch (err) {
        const errorData = err.response?.data || {};
        const errorMsg  = errorData.error_description || errorData.error || err.message;
        const debugInfo = Buffer.from(JSON.stringify({ prm: finalPrm, status: err.response?.status, err: errorData })).toString('base64');
        if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
    }
}

// ─── Handler : /api/enedis/fetch ─────────────────────────────────────────────

async function handleFetch(req, res) {
    const { projectId, prm, forceRefresh = false, action } = req.query;

    // Lister les consentements
    if (action === 'list_consents') {
        try {
            const db       = getAdminDb();
            const snapshot = await db.collection('enedis_consents').orderBy('updatedAt', 'desc').get();
            const consents = snapshot.docs.map(doc => {
                const d = doc.data();
                return { id: doc.id, prm: d.prm, projectId: d.projectId, annualConsumption: d.annualConsumption, expiresAt: d.expiresAt, updatedAt: d.updatedAt, titulaire: d.titulaire, adresse: d.adresse };
            });
            return res.status(200).json({ consents });
        } catch (e) {
            console.error('[Enedis list_consents] Error:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }

    if (!projectId && !prm) return res.status(400).json({ error: 'Missing projectId or prm' });

    try {
        const adminDb = getAdminDb();
        let consentDoc;

        if (prm) {
            consentDoc = await adminDb.collection('enedis_consents').doc(prm).get();
        }
        if ((!consentDoc || !consentDoc.exists) && projectId) {
            consentDoc = await adminDb.collection('enedis_consents').doc(projectId).get();
        }
        if ((!consentDoc || !consentDoc.exists) && prm) {
            const snap = await adminDb.collection('enedis_consents').where('prm', '==', prm).limit(1).get();
            if (!snap.empty) consentDoc = snap.docs[0];
        }
        if (!consentDoc || !consentDoc.exists) {
            return res.status(404).json({ error: 'Aucun consentement Enedis trouvé pour ce PRM.' });
        }

        let consent = consentDoc.data();
        if (new Date() >= new Date(consent.expiresAt) || forceRefresh === 'true') {
            try { consent = await refreshToken(consentDoc); }
            catch (e) { return res.status(401).json({ error: 'Session expirée.', requiresAuth: true }); }
        }

        const yesterday      = new Date(Date.now() - 86400000);
        const defaultEnd     = yesterday.toISOString().split('T')[0];
        const defaultStart   = new Date(yesterday.getTime() - 365 * 86400000).toISOString().split('T')[0];
        const loadCurveStart = new Date(yesterday.getTime() -  30 * 86400000).toISOString().split('T')[0];
        const start  = req.query.startDate || defaultStart;
        const end    = req.query.endDate   || defaultEnd;
        const prmVal = consent.prm;

        const callApi = (base, endpoint, s, e) =>
            axios.get(`${base}/${endpoint}`, {
                params: { usage_point_id: prmVal, start: s, end: e },
                headers: { 'Authorization': `Bearer ${consent.accessToken}`, 'Accept': 'application/json' },
                timeout: 8000
            }).then(r => r.data);

        const callIdentity = () =>
            axios.get(`${ENEDIS_CUSTOMERS_BASE}/usage_points/identities`, {
                params: { usage_point_id: prmVal },
                headers: { 'Authorization': `Bearer ${consent.accessToken}`, 'Accept': 'application/json' },
                timeout: 5000
            }).then(r => r.data);

        const [dailyRes, loadRes, maxRes, identityRes] = await Promise.allSettled([
            callApi(ENEDIS_METERING_BASE,  'daily_consumption',          start, end),
            callApi(ENEDIS_METERING_BASE,  'load_curve',                 loadCurveStart, end),
            callApi(ENEDIS_MAX_POWER_BASE, 'daily_consumption_max_power', start, end),
            callIdentity()
        ]);

        const results = {
            daily:     dailyRes.status === 'fulfilled' ? dailyRes.value     : { error: dailyRes.reason?.message,  status: dailyRes.reason?.response?.status  },
            loadCurve: loadRes.status  === 'fulfilled' ? loadRes.value      : { error: loadRes.reason?.message,   status: loadRes.reason?.response?.status   },
            maxPower:  maxRes.status   === 'fulfilled' ? maxRes.value       : { error: maxRes.reason?.message,    status: maxRes.reason?.response?.status    },
        };

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

        return res.status(200).json({ prm: prmVal, period: { start, end }, data: results });

    } catch (err) {
        return res.status(500).json({ error: 'Erreur lors de la récupération', details: err.message });
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

export default async function handler(req, res) {
    const { slug } = req.query;
    const route = slug && slug.length > 0 ? slug[0] : '';

    try {
        if (route === 'auth')         return await handleAuth(req, res);
        if (route === 'callback')     return await handleCallback(req, res);
        if (route === 'fetch')        return await handleFetch(req, res);
        if (route === 'send-consent') return await handleSendConsent(req, res);
        return res.status(404).json({ error: `Route Enedis inconnue: ${route}` });
    } catch (err) {
        console.error('[Enedis API] Unexpected error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
