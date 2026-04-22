import axios from 'axios';
import { adminDb } from '../../src/lib/firebase-admin';

// URLs API Enedis Data Connect - Production v5
// Documentation : https://datahub-enedis.fr/services-api/data-connect/ressources/production/
const ENEDIS_TOKEN_URL = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';
const ENEDIS_USAGE_POINTS_URL = 'https://gw.ext.prod.api.enedis.fr/customers_upc/v5/usage_points/contracts';

export default async function handler(req, res) {
    const { code, state, error } = req.query;

    if (error) {
        console.error('[Enedis Callback] Enedis returned error:', error);
        return res.redirect(`/?error=${encodeURIComponent('Enedis Error: ' + error)}`);
    }

    if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
    }

    let projectId, prm;
    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        projectId = decodedState.projectId;
        prm = decodedState.prm || null; // PRM transmis depuis l'interface si disponible
    } catch (e) {
        return res.status(400).json({ error: 'Invalid state parameter' });
    }

    try {
        // 1. Échange du code d'autorisation contre un access token (Production v5)
        console.log('[Enedis Callback] Exchanging authorization code for access token...');
        const tokenResponse = await axios.post(ENEDIS_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.ENEDIS_CLIENT_ID,
            client_secret: process.env.ENEDIS_CLIENT_SECRET,
            redirect_uri: process.env.ENEDIS_REDIRECT_URI
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in, usage_points_id } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
        console.log('[Enedis Callback] Access token obtained successfully.');

        // 2. Récupération des PRMs (points de livraison) du client
        // En v5, la réponse usage_points peut venir directement du token ou d'un endpoint dédié
        let usagePointIds = [];

        // Cas 1 : Le token response inclut directement les usage_points_id (Data Connect v5)
        if (usage_points_id) {
            // usage_points_id peut être une string (un seul PRM) ou un tableau
            usagePointIds = Array.isArray(usage_points_id) ? usage_points_id : [usage_points_id];
            console.log(`[Enedis Callback] PRMs from token response: ${usagePointIds.join(', ')}`);
        }

        // Cas 2 : Le PRM était fourni par l'interface (cas courant dans Nelson)
        if (usagePointIds.length === 0 && prm) {
            usagePointIds = [prm];
            console.log(`[Enedis Callback] Using PRM from auth state: ${prm}`);
        }

        // Cas 3 : Appel à l'endpoint de découverte des PRMs (fallback)
        if (usagePointIds.length === 0) {
            console.log('[Enedis Callback] Discovering PRMs via API...');
            try {
                const prmResponse = await axios.get(ENEDIS_USAGE_POINTS_URL, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Accept': 'application/json'
                    }
                });

                // Format v5 : { customer: { usage_points: [{ usage_point: { usage_point_id: "..." } }] } }
                const customer = prmResponse.data?.customer;
                const points = customer?.usage_points || [];
                usagePointIds = points
                    .map(up => up?.usage_point?.usage_point_id)
                    .filter(Boolean);

                // Fallback format v1 : { usage_points: [{ usage_point_id: "..." }] }
                if (usagePointIds.length === 0) {
                    const v1Points = prmResponse.data?.usage_points || [];
                    usagePointIds = v1Points.map(up => up.usage_point_id).filter(Boolean);
                }

                console.log(`[Enedis Callback] Discovered ${usagePointIds.length} PRM(s) via API.`);
            } catch (prmErr) {
                console.warn('[Enedis Callback] PRM discovery via API failed:', prmErr.response?.data || prmErr.message);
            }
        }

        if (usagePointIds.length === 0) {
            console.warn('[Enedis Callback] No PRM found for this user.');
            return res.redirect(`/project/${projectId}?enedis=error&message=no_prm_found`);
        }

        // 3. Sauvegarde des consentements en Firestore (un document par PRM)
        console.log(`[Enedis Callback] Saving ${usagePointIds.length} consent(s) to Firestore...`);
        const batch = adminDb.batch();
        usagePointIds.forEach(upid => {
            const ref = adminDb.collection('enedis_consents').doc(upid);
            batch.set(ref, {
                prm: upid,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt,
                projectId, // Lien vers le projet d'origine
                updatedAt: new Date().toISOString()
            }, { merge: true });
        });
        await batch.commit();

        const firstPrm = usagePointIds[0];
        console.log(`[Enedis Callback] ✅ Success! Redirecting back with PRM: ${firstPrm}`);
        res.redirect(`/project/${projectId}?enedis=success&prm=${firstPrm}`);

    } catch (err) {
        console.error('[Enedis Callback] Error:', err.response?.data || err.message);
        const errorMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
        res.redirect(`/project/${projectId || 'new'}?enedis=error&message=${encodeURIComponent(errorMsg)}`);
    }
}
