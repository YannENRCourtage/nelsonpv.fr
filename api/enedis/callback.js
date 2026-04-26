import axios from 'axios';

// URLs API Enedis Data Connect - Production v5
// IMPORTANT : En production, le grant_type pour obtenir un token est "client_credentials"
// Le code renvoyé par Enedis après consentement est à IGNORER (valeur fictive de 8 chars).
// Le consentement est lié automatiquement au client_id + usage_point_id côté Enedis.
const ENEDIS_TOKEN_URL = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';
const ENEDIS_METERING_BASE = 'https://gw.ext.prod.api.enedis.fr/metering_data_dc/v5';

export default async function handler(req, res) {
    const { state, error, usage_point_id } = req.query;
    const code = req.query.code;

    console.log(`[Enedis Callback] Received - code: ${code} (ignoré en prod), usage_point_id: ${usage_point_id}, error: ${error}`);

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

    // PRM : depuis usage_point_id du callback (plus fiable que le state)
    const finalPrm = usage_point_id || prm;
    console.log(`[Enedis Callback] projectId: ${projectId}, finalPrm: ${finalPrm}`);

    if (!finalPrm) {
        const msg = 'Aucun PRM reçu dans le callback Enedis.';
        console.error('[Enedis Callback]', msg);
        return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(msg)}`);
    }

    try {
        const clientId = (process.env.ENEDIS_CLIENT_ID || '').trim();
        const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || '').trim();

        console.log(`[Enedis Callback] Getting token via client_credentials for client_id: ${clientId.substring(0, 8)}...`);

        // PRODUCTION Enedis v5 : utiliser client_credentials (le code OAuth est ignoré)
        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenResponse = await axios.post(
            ENEDIS_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                timeout: 15000
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
        console.log(`[Enedis Callback] ✅ Token obtained via client_credentials. Expires: ${expiresAt}`);

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
        console.error('[Enedis Callback] FINAL ERROR:', errorMsg, '| HTTP status:', err.response?.status, '| Body:', JSON.stringify(errorData));

        const debugInfo = Buffer.from(JSON.stringify({
            c_id: (process.env.ENEDIS_CLIENT_ID || '').substring(0, 8),
            prm: finalPrm,
            status: err.response?.status,
            err: errorData
        })).toString('base64');

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
        }
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
    }
}
