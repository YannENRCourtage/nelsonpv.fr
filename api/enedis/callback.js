import axios from 'axios';

// URLs API Enedis Data Connect - Production v5
const ENEDIS_TOKEN_URL = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';
const ENEDIS_METERING_BASE = 'https://gw.ext.prod.api.enedis.fr/metering_data_dc/v5';

export default async function handler(req, res) {
    const { state, error, usage_point_id } = req.query;

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const code = urlObj.searchParams.get('code') || req.query.code;

    if (error) {
        console.error('[Enedis Callback] Enedis returned error:', error);
        return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent('Enedis Error: ' + error)}`);
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

    // PRM : utiliser usage_point_id du callback Enedis (plus fiable que l'API contracts)
    const finalPrm = usage_point_id || prm;

    try {
        if (!code) {
            throw new Error('Code d\'autorisation manquant dans l\'URL de retour.');
        }

        const clientId = (process.env.ENEDIS_CLIENT_ID || "").trim();
        const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || "").trim();
        const redirectUri = (process.env.ENEDIS_REDIRECT_URI || "").trim();

        console.log(`[Enedis Callback] Exchanging code (len=${code.length}) for PRM ${finalPrm}...`);

        // IMPORTANT : Enedis exige que les credentials soient UNIQUEMENT dans le header Basic Auth,
        // pas dans le body en même temps (double envoi cause "invalid_client" parfois).
        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        // Corps de la requête : uniquement grant_type, code et redirect_uri (sans client_id/secret)
        const tokenBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
        });

        let tokenResponse;
        try {
            // Tentative 1 : credentials via Basic Auth header uniquement
            tokenResponse = await axios.post(ENEDIS_TOKEN_URL, tokenBody.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                timeout: 15000
            });
        } catch (firstErr) {
            console.warn('[Enedis Callback] Attempt 1 (Basic Auth) failed:', firstErr.response?.data || firstErr.message);

            // Tentative 2 : credentials dans le body (fallback)
            const tokenBodyWithCreds = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri
            });
            tokenResponse = await axios.post(ENEDIS_TOKEN_URL, tokenBodyWithCreds.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000
            });
        }

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
        console.log(`[Enedis Callback] ✅ Token obtained for PRM: ${finalPrm}`);

        if (!finalPrm) {
            throw new Error('Aucun PRM identifié dans le callback (usage_point_id manquant).');
        }

        // Sauvegarder le consentement dans Firestore
        const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
        const db = getAdminDb();

        // Récupérer la consommation annuelle (scope daily_consumption autorisé)
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
            console.log(`[Enedis Callback] Annual consumption: ${annualConsumption} kWh`);
        } catch (consoErr) {
            console.warn('[Enedis Callback] Could not fetch annual consumption:', consoErr.response?.status, consoErr.message);
        }

        await db.collection('enedis_consents').doc(finalPrm).set({
            prm: finalPrm,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            expiresAt,
            updatedAt: new Date().toISOString(),
            projectId,
            annualConsumption,
            // Données identité non disponibles (scope non autorisé en production)
            firstname: null,
            lastname: null,
            address: null
        }, { merge: true });

        console.log(`[Enedis Callback] ✅ Consent saved to Firestore for PRM: ${finalPrm}`);

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=success&prm=${finalPrm}`);
        }
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${finalPrm}`);

    } catch (err) {
        const errorData = err.response?.data || {};
        const errorMsg = errorData.error_description || errorData.error || err.message;
        console.error('[Enedis Callback] Final Error:', errorMsg, JSON.stringify(errorData));

        // Fallback : si un consentement récent existe déjà pour ce PRM, on considère ça OK
        if (finalPrm) {
            try {
                const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
                const db = getAdminDb();
                const doc = await db.collection('enedis_consents').doc(finalPrm).get();
                if (doc.exists) {
                    const data = doc.data();
                    const updatedAt = new Date(data.updatedAt).getTime();
                    if (Date.now() - updatedAt < 300000) { // 5 minutes
                        console.log(`[Enedis Callback] Fallback success for PRM: ${finalPrm}`);
                        if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=success&prm=${finalPrm}`);
                        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${finalPrm}`);
                    }
                }
            } catch (e) {
                console.warn('[Enedis Callback] Fallback check failed:', e.message);
            }
        }

        let debugInfo = '';
        try {
            debugInfo = Buffer.from(JSON.stringify({
                c_id: clientId?.substring(0, 5),
                r_uri: process.env.ENEDIS_REDIRECT_URI,
                code_len: code ? code.length : 0,
                err_resp: errorData
            })).toString('base64');
        } catch(e) {}

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
        }
        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
    }
}
