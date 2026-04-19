import axios from 'axios';
import { adminDb } from '../../src/lib/firebase-admin.js';
import { withAuth } from '../common/authMiddleware.js';

const ENEDIS_API_BASE = 'https://ext.enedis.fr/customer/v1/metering_data';

async function refreshToken(consentDoc) {
    const consent = consentDoc.data();
    const response = await axios.post('https://ext.enedis.fr/oauth2/v3/token', new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: consent.refreshToken,
        client_id: process.env.ENEDIS_CLIENT_ID,
        client_secret: process.env.ENEDIS_CLIENT_SECRET
    }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const updateData = {
        accessToken: access_token,
        expiresAt,
        updatedAt: new Date().toISOString()
    };
    if (refresh_token) updateData.refreshToken = refresh_token;

    await consentDoc.ref.update(updateData);
    
    return { ...consent, ...updateData };
}

async function fetchEnedisApi(endpoint, prm, startDate, endDate, token) {
    try {
        const response = await axios.get(`${ENEDIS_API_BASE}/${endpoint}`, {
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
            console.warn(`Enedis API 403 for ${endpoint}: Consent scope missing or expired.`);
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
        let consentDoc;
        
        // 1. Prioritize global lookup by PRM
        if (prm) {
            consentDoc = await adminDb.collection('enedis_consents').doc(prm).get();
        }

        // 2. Fallback to project-specific consent (Legacy or first-time)
        if ((!consentDoc || !consentDoc.exists) && projectId) {
            consentDoc = await adminDb.collection('enedis_consents').doc(projectId).get();
        }

        // 3. Last resort: search PRM in field (slow, but handles cases where doc ID is not PRM)
        if ((!consentDoc || !consentDoc.exists) && prm) {
            const snapshot = await adminDb.collection('enedis_consents').where('prm', '==', prm).limit(1).get();
            if (!snapshot.empty) consentDoc = snapshot.docs[0];
        }

        if (!consentDoc || !consentDoc.exists) {
            return res.status(404).json({ 
                error: 'Aucun consentement Enedis trouvé pour ce PRM.',
                hint: 'Veuillez autoriser Nelson sur votre Espace Client Enedis.'
            });
        }

        let consent = consentDoc.data();

        // --- 1. Token Refresh ---
        if (new Date() >= new Date(consent.expiresAt) || forceRefresh) {
            try {
                consent = await refreshToken(consentDoc);
            } catch (refErr) {
                console.error('Refresh token failed:', refErr.response?.data || refErr.message);
                return res.status(401).json({ error: 'Échec du renouvellement de la session. Veuillez vous reconnecter à Enedis.' });
            }
        }

        // --- 2. Date Range ---
        // Default to last 365 days if not provided
        const defaultEndDate = new Date().toISOString().split('T')[0];
        const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const start = req.query.startDate || defaultStartDate;
        const end = req.query.endDate || defaultEndDate;

        console.log(`[Enedis Fetch] Period: ${start} to ${end} for PRM ${consent.prm}`);

        const results = {
            daily: null,
            loadCurve: null,
            maxPower: null
        };

        // --- 3. Fetch Data ---
        // We wrap each call in a separate try/catch to return partial data if some endpoints are not available
        try {
            results.daily = await fetchEnedisApi('daily_consumption', consent.prm, start, end, consent.accessToken);
        } catch (e) { 
            console.error(`[Enedis Fetch] Daily Error: ${e.message}`);
            results.daily = { error: e.message, status: e.response?.status }; 
        }

        try {
            // Note: Load curve can be very large for 1 year, Enedis might require smaller chunks 
            // but for now we try the full period.
            results.loadCurve = await fetchEnedisApi('consumption_load_curve', consent.prm, start, end, consent.accessToken);
        } catch (e) { 
            console.error(`[Enedis Fetch] Load Curve Error: ${e.message}`);
            results.loadCurve = { error: e.message, status: e.response?.status }; 
        }

        try {
            results.maxPower = await fetchEnedisApi('daily_consumption_max_power', consent.prm, start, end, consent.accessToken);
        } catch (e) { 
            console.error(`[Enedis Fetch] Max Power Error: ${e.message}`);
            results.maxPower = { error: e.message, status: e.response?.status }; 
        }

        res.status(200).json({
            prm: consent.prm,
            data: results
        });

    } catch (error) {
        console.error('Enedis Fetch Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch Enedis data', details: error.message });
    }
}

export default withAuth(handler);
