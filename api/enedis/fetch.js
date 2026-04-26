import axios from 'axios';

// URLs API Enedis Data Connect — Production v5
const ENEDIS_TOKEN_URL = 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token';

// Base URL pour les données de consommation (v5)
const ENEDIS_METERING_BASE = 'https://gw.ext.prod.api.enedis.fr/metering_data_dc/v5';

// Base URL pour la puissance maximale (endpoint distinct en v5)
const ENEDIS_MAX_POWER_BASE = 'https://gw.ext.prod.api.enedis.fr/metering_data_dcmp/v5';

// Renouvelle le token Enedis via client_credentials (production v5)
// Enedis production ne supporte pas refresh_token — on renouvelle avec client_credentials
async function refreshToken(consentDoc) {
    const consent = consentDoc.data();
    console.log(`[Enedis Refresh] Renewing token via client_credentials for PRM ${consent.prm}...`);

    const clientId = (process.env.ENEDIS_CLIENT_ID || '').trim();
    const clientSecret = (process.env.ENEDIS_CLIENT_SECRET || '').trim();
    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
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

    const { access_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    const updateData = {
        accessToken: access_token,
        expiresAt,
        updatedAt: new Date().toISOString()
    };

    await consentDoc.ref.update(updateData);
    console.log(`[Enedis Refresh] ✅ Token renewed for PRM ${consent.prm}`);
    return { ...consent, ...updateData };
}

// Appelle un endpoint Enedis Data Connect v5
async function fetchEnedisApi(baseUrl, endpoint, prm, startDate, endDate, token) {
    try {
        const response = await axios.get(`${baseUrl}/${endpoint}`, {
            params: {
                usage_point_id: prm,
                start: startDate,
                end: endDate
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        return response.data;
    } catch (err) {
        if (err.response?.status === 403) {
            console.warn(`[Enedis Fetch] 403 on ${endpoint}: scope missing or consent expired for PRM ${prm}`);
        } else if (err.response?.status === 404) {
            console.warn(`[Enedis Fetch] 404 on ${endpoint}: no data available for this period/PRM`);
        }
        throw err;
    }
}

async function handler(req, res) {
    const { projectId, prm, forceRefresh = false } = req.query;

    if (!projectId && !prm) {
        return res.status(400).json({ error: 'Missing projectId or prm' });
    }

    try {
        let adminDb;
        try {
            const fbAdmin = await import('../../src/lib/firebase-admin.js');
            adminDb = fbAdmin.getAdminDb();
        } catch (e) {
            console.error('[Enedis Fetch] Failed to load firebase-admin:', e.message);
            console.error(e.stack);
            throw new Error(`Firebase Admin init failed: ${e.message}`);
        }
        let consentDoc;

        // 1. Recherche prioritaire par PRM (identifiant global du compteur)
        if (prm) {
            consentDoc = await adminDb.collection('enedis_consents').doc(prm).get();
            console.log(`[Enedis Fetch] Consent lookup by PRM ${prm}: ${consentDoc.exists ? 'found' : 'not found'}`);
        }

        // 2. Fallback par projectId (consentements anciens ou cas de premier accès)
        if ((!consentDoc || !consentDoc.exists) && projectId) {
            consentDoc = await adminDb.collection('enedis_consents').doc(projectId).get();
            console.log(`[Enedis Fetch] Consent lookup by projectId ${projectId}: ${consentDoc?.exists ? 'found' : 'not found'}`);
        }

        // 3. Recherche par champ prm dans la collection (cas où l'ID du doc ≠ PRM)
        if ((!consentDoc || !consentDoc.exists) && prm) {
            const snapshot = await adminDb.collection('enedis_consents').where('prm', '==', prm).limit(1).get();
            if (!snapshot.empty) {
                consentDoc = snapshot.docs[0];
                console.log(`[Enedis Fetch] Consent found by field query for PRM ${prm}`);
            }
        }

        if (!consentDoc || !consentDoc.exists) {
            return res.status(404).json({
                error: 'Aucun consentement Enedis trouvé pour ce PRM.',
                hint: 'Veuillez autoriser Nelson sur votre Espace Client Enedis.'
            });
        }

        let consent = consentDoc.data();

        // Renouvellement du token si expiré
        if (new Date() >= new Date(consent.expiresAt) || forceRefresh === 'true') {
            try {
                consent = await refreshToken(consentDoc);
            } catch (refErr) {
                console.error('[Enedis Fetch] Token refresh failed:', refErr.response?.data || refErr.message);
                return res.status(401).json({
                    error: 'Session expirée. Veuillez vous reconnecter à votre Espace Client Enedis.',
                    requiresAuth: true
                });
            }
        }

        // Plage de dates : 365 jours par défaut
        const defaultEndDate = new Date().toISOString().split('T')[0];
        const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const start = req.query.startDate || defaultStartDate;
        const end = req.query.endDate || defaultEndDate;
        const prmToFetch = consent.prm;

        console.log(`[Enedis Fetch] Fetching data for PRM ${prmToFetch}, period: ${start} → ${end}`);

        const results = {
            daily: null,
            loadCurve: null,
            maxPower: null
        };

        // Récupération des données (chaque appel est indépendant pour retourner des données partielles)

        // Consommation journalière (Wh par jour)
        try {
            results.daily = await fetchEnedisApi(ENEDIS_METERING_BASE, 'daily_consumption', prmToFetch, start, end, consent.accessToken);
            console.log(`[Enedis Fetch] ✅ daily_consumption OK`);
        } catch (e) {
            console.error(`[Enedis Fetch] daily_consumption error: ${e.response?.status} - ${e.message}`);
            results.daily = { error: e.message, status: e.response?.status };
        }

        // Courbe de charge (puissance W par demi-heure)
        try {
            results.loadCurve = await fetchEnedisApi(ENEDIS_METERING_BASE, 'load_curve', prmToFetch, start, end, consent.accessToken);
            console.log(`[Enedis Fetch] ✅ load_curve OK`);
        } catch (e) {
            console.error(`[Enedis Fetch] load_curve error: ${e.response?.status} - ${e.message}`);
            results.loadCurve = { error: e.message, status: e.response?.status };
        }

        // Puissance maximale journalière (endpoint sur une base URL différente en v5)
        try {
            results.maxPower = await fetchEnedisApi(ENEDIS_MAX_POWER_BASE, 'daily_consumption_max_power', prmToFetch, start, end, consent.accessToken);
            console.log(`[Enedis Fetch] ✅ daily_consumption_max_power OK`);
        } catch (e) {
            console.error(`[Enedis Fetch] daily_consumption_max_power error: ${e.response?.status} - ${e.message}`);
            results.maxPower = { error: e.message, status: e.response?.status };
        }

        res.status(200).json({
            prm: prmToFetch,
            period: { start, end },
            data: results
        });

    } catch (error) {
        console.error('[Enedis Fetch] Unexpected error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des données Enedis', details: error.message });
    }
}

export default handler;
