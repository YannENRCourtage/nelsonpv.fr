import axios from 'axios';

// URLs API Enedis Data Connect - Production v5
const ENEDIS_TOKEN_URL = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';
const ENEDIS_METERING_BASE = 'https://gw.ext.prod.api.enedis.fr/metering_data_dc/v5';

export default async function handler(req, res) {
    const { state, error, usage_point_id } = req.query;

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const code = urlObj.searchParams.get('code') || req.query.code;

    console.log(`[Enedis Callback] Received - code: ${code ? code.substring(0,10)+'...' : 'MISSING'}, usage_point_id: ${usage_point_id}, error: ${error}`);

    if (error) {
        console.error('[Enedis Callback] Enedis returned error:', error);
        return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent('Enedis: ' + error)}`);
    }

    if (!state) {
        return res.status(400).json({ error: 'Missing state' });
    }

    let projectId, prm;
    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        projectId = decodedState.projectId;
        prm = decodedState.prm || null;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // PRM : utiliser usage_point_id du callback Enedis (le plus fiable)
    const finalPrm = usage_point_id || prm;
    console.log(`[Enedis Callback] projectId: ${projectId}, finalPrm: ${finalPrm}`);

    try {
        if (!code) {
            throw new Error('Code d\'autorisation manquant dans l\'URL de retour.');
        }

        const clientId = (process.env.ENEDIS_CLIENT_ID || "").trim();
        const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || "").trim();

        console.log(`[Enedis Callback] Using client_id: ${clientId.substring(0, 8)}...`);

        // Basic Auth header (méthode préférée par Enedis production)
        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        // Corps de la requête : SANS redirect_uri (Enedis production ne l'exige pas)
        // redirect_uri est configuré directement dans DataHub
        const tokenBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code
        });

        console.log(`[Enedis Callback] Calling token endpoint: ${ENEDIS_TOKEN_URL}`);

        let tokenResponse;
        let tokenError;

        // Tentative 1 : Basic Auth header, sans redirect_uri
        try {
            tokenResponse = await axios.post(ENEDIS_TOKEN_URL, tokenBody.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                timeout: 15000
            });
            console.log('[Enedis Callback] ✅ Token exchange successful (attempt 1)');
        } catch (err1) {
            tokenError = err1;
            console.warn('[Enedis Callback] Attempt 1 failed:', err1.response?.status, JSON.stringify(err1.response?.data));

            // Tentative 2 : credentials dans le body avec redirect_uri
            try {
                const redirectUri = (process.env.ENEDIS_REDIRECT_URI || "").trim();
                const tokenBody2 = new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri
                });
                tokenResponse = await axios.post(ENEDIS_TOKEN_URL, tokenBody2.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 15000
                });
                console.log('[Enedis Callback] ✅ Token exchange successful (attempt 2)');
            } catch (err2) {
                console.error('[Enedis Callback] Attempt 2 failed:', err2.response?.status, JSON.stringify(err2.response?.data));
                throw err2; // Relancer la dernière erreur
            }
        }

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
        console.log(`[Enedis Callback] Token expires at: ${expiresAt}, PRM: ${finalPrm}`);

        if (!finalPrm) {
            throw new Error('Aucun PRM identifié (usage_point_id manquant dans le callback).');
        }

        // Sauvegarder dans Firestore
        const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
        const db = getAdminDb();

        // Récupérer la consommation annuelle
        let annualConsumption = null;
        try {
            const today = new Date();
            const lastYear = new Date();
            lastYear.setFullYear(today.getFullYear() - 1);
            const consoRes = await axios.get(`${ENEDIS_METERING_BASE}/daily_consumption`, {
                headers: { 'Authorization': `Bearer ${access_token}` },
                params: {
                    usage_point_id: finalPrm,
                    start: lastYear.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                },
                timeout: 10000
            });
            const readings = consoRes.data?.meter_reading?.interval_reading || [];
            const totalWh = readings.reduce((sum, r) => sum + (parseInt(r.value) || 0), 0);
            annualConsumption = Math.round(totalWh / 1000);
            console.log(`[Enedis Callback] Annual conso: ${annualConsumption} kWh`);
        } catch (consoErr) {
            console.warn('[Enedis Callback] Could not fetch annual conso:', consoErr.response?.status, consoErr.message);
        }

        await db.collection('enedis_consents').doc(finalPrm).set({
            prm: finalPrm,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            expiresAt,
            updatedAt: new Date().toISOString(),
            projectId,
            annualConsumption
        }, { merge: true });

        console.log(`[Enedis Callback] ✅ Consent saved to Firestore for PRM: ${finalPrm}`);

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=success&prm=${finalPrm}`);
        }
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${finalPrm}`);

    } catch (err) {
        const errorData = err.response?.data || {};
        const errorMsg = errorData.error_description || errorData.error || err.message;
        console.error('[Enedis Callback] FINAL ERROR:', errorMsg, '| Full response:', JSON.stringify(errorData));

        // Fallback : consentement récent en Firestore ?
        if (finalPrm) {
            try {
                const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
                const db = getAdminDb();
                const doc = await db.collection('enedis_consents').doc(finalPrm).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (Date.now() - new Date(data.updatedAt).getTime() < 300000) {
                        if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=success&prm=${finalPrm}`);
                        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${finalPrm}`);
                    }
                }
            } catch (e) {}
        }

        const debugInfo = Buffer.from(JSON.stringify({
            c_id: (process.env.ENEDIS_CLIENT_ID || "").substring(0, 8),
            code_len: code ? code.length : 0,
            prm: finalPrm,
            err: errorData
        })).toString('base64');

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
        }
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
    }
}
