import axios from 'axios';

// URLs API Enedis Data Connect - Production v5
const ENEDIS_TOKEN_URL = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';
const ENEDIS_USAGE_POINTS_URL = 'https://gw.ext.prod.api.enedis.fr/customers_upc/v5/usage_points/contracts';

export default async function handler(req, res) {
    const { state, error, usage_point_id } = req.query;
    
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const code = urlObj.searchParams.get('code') || req.query.code;

    if (error) {
        console.error('[Enedis Callback] Enedis returned error:', error);
        return res.redirect(`/?error=${encodeURIComponent('Enedis Error: ' + error)}`);
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

    let fallbackPrm = usage_point_id || prm;

    try {
        if (!code) {
            throw new Error('Code d\'autorisation manquant dans l\'URL de retour.');
        }

        console.log(`[Enedis Callback] Exchanging code for tokens... (code: ${code.substring(0, 5)}...)`);
        
        const clientId = (process.env.ENEDIS_CLIENT_ID || "").trim();
        const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || "").trim();
        const redirectUri = (process.env.ENEDIS_REDIRECT_URI || "").trim();
        
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri
        });

        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        // On essaie d'envoyer les credentials dans le corps ET dans le header Authorization
        // Certains serveurs sont capricieux sur l'un ou l'autre.
        let tokenResponse;
        try {
            tokenResponse = await axios.post(ENEDIS_TOKEN_URL, tokenParams.toString(), {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                }
            });
        } catch (firstTryErr) {
            console.warn('[Enedis Callback] First token attempt failed, retrying without Basic Auth header...');
            // Deuxième tentative sans le header, juste avec les paramètres dans le body
            tokenResponse = await axios.post(ENEDIS_TOKEN_URL, tokenParams.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
        }
 
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
        console.log('[Enedis Callback] Tokens obtained successfully.');

        const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
        const db = getAdminDb();

        let firstPrm = fallbackPrm;

        try {
            const prmsResponse = await axios.get(ENEDIS_USAGE_POINTS_URL, {
                headers: { 'Authorization': `Bearer ${access_token}` }
            });
            const contracts = prmsResponse.data?.customer?.usage_points || [];
            if (contracts.length > 0) {
                firstPrm = contracts[0].usage_point.usage_point_id;
            }
        } catch (prmErr) {
            console.warn('[Enedis Callback] PRM discovery via API failed:', prmErr.message);
        }

        if (!firstPrm) {
            throw new Error('Aucun PRM trouvé pour ce client Enedis.');
        }

        let customerInfo = {
            firstname: null,
            lastname: null,
            address: null,
            annualConsumption: null
        };

        // Métadonnées - Scopes optionnels
        try {
            const identityRes = await axios.get('https://gw.ext.prod.api.enedis.fr/customers_upc/v5/identity', {
                headers: { 'Authorization': `Bearer ${access_token}` },
                params: { usage_point_id: firstPrm }
            });
            const ident = identityRes.data?.customer?.identity || {};
            customerInfo.firstname = ident.firstname || null;
            customerInfo.lastname = ident.lastname || null;
        } catch (e) {}

        try {
            const contactRes = await axios.get('https://gw.ext.prod.api.enedis.fr/customers_upc/v5/contact_data', {
                headers: { 'Authorization': `Bearer ${access_token}` },
                params: { usage_point_id: firstPrm }
            });
            const addr = contactRes.data?.customer?.contact_data?.address || {};
            if (addr.street) {
                customerInfo.address = `${addr.street} ${addr.postal_code || ''} ${addr.city || ''}`.trim();
            }
        } catch (e) {}

        try {
            const today = new Date();
            const lastYear = new Date();
            lastYear.setFullYear(today.getFullYear() - 1);
            const consoRes = await axios.get('https://gw.ext.prod.api.enedis.fr/metering_data_upc/v5/daily_consumption', {
                headers: { 'Authorization': `Bearer ${access_token}` },
                params: {
                    usage_point_id: firstPrm,
                    start: lastYear.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                }
            });
            const readings = consoRes.data?.meter_reading?.interval_reading || [];
            const totalWh = readings.reduce((sum, r) => sum + (parseInt(r.value) || 0), 0);
            customerInfo.annualConsumption = Math.round(totalWh / 1000);
        } catch (e) {}

        await db.collection('enedis_consents').doc(firstPrm).set({
            prm: firstPrm,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            expiresAt,
            updatedAt: new Date().toISOString(),
            projectId,
            ...customerInfo
        }, { merge: true });

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=success&prm=${firstPrm}`);
        }
        res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${firstPrm}`);

    } catch (err) {
        console.error('[Enedis Callback] Final Error:', err.response?.data || err.message);
        const errorData = err.response?.data || {};
        const errorMsg = errorData.error_description || errorData.error || err.message;
        
        // PREFETCH FALLBACK LOOSE
        if (fallbackPrm) {
            try {
                const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
                const db = getAdminDb();
                const doc = await db.collection('enedis_consents').doc(fallbackPrm).get();
                if (doc.exists) {
                    const data = doc.data();
                    const updatedAt = new Date(data.updatedAt).getTime();
                    if (Date.now() - updatedAt < 120000) { // 2 minutes
                        console.log(`[Enedis Callback] Fallback success for PRM: ${fallbackPrm}`);
                        if (projectId === 'admin_test') return res.redirect(`/enedis-admin?enedis=success&prm=${fallbackPrm}`);
                        return res.redirect(`/project/${projectId || 'new'}/edit?enedis=success&prm=${fallbackPrm}`);
                    }
                }
            } catch (e) {}
        }

        let debugInfo = '';
        try {
            debugInfo = Buffer.from(JSON.stringify({
                c_id: (process.env.ENEDIS_CLIENT_ID || "").substring(0, 5),
                r_uri: process.env.ENEDIS_REDIRECT_URI,
                code_len: code ? code.length : 0,
                err_resp: errorData
            })).toString('base64');
        } catch(e) {}

        if (projectId === 'admin_test') {
            return res.redirect(`/enedis-admin?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
        }
        res.redirect(`/project/${projectId || 'new'}/edit?enedis=error&message=${encodeURIComponent(errorMsg)}&debug=${debugInfo}`);
    }
}
