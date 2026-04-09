import axios from 'axios';
import { adminDb } from '../../src/lib/firebase-admin';

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
            console.warn(`Enedis API 403 for ${endpoint}: Consent scope missing.`);
        }
        throw err;
    }
}

export default async function handler(req, res) {
    const { projectId, prm, forceRefresh = false } = req.query;

    if (!projectId && !prm) {
        return res.status(400).json({ error: 'Missing projectId or prm' });
    }

    try {
        let consentDoc;
        
        if (projectId) {
            consentDoc = await adminDb.collection('enedis_consents').doc(projectId).get();
        } else {
            const snapshot = await adminDb.collection('enedis_consents').where('prm', '==', prm).limit(1).get();
            consentDoc = snapshot.docs[0];
        }

        if (!consentDoc || !consentDoc.exists) {
            return res.status(404).json({ 
                error: 'Aucun consentement Enedis trouvé pour ce PRM ou ce projet.',
                hint: 'Le propriétaire du compteur doit d\'abord autoriser l\'accès via le bouton "Se connecter à Enedis".'
            });
        }

        let consent = consentDoc.data();

        // --- 1. Token Refresh ---
        if (new Date() >= new Date(consent.expiresAt) || forceRefresh) {
            consent = await refreshToken(consentDoc);
        }

        // --- 2. Date Range ---
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const results = {
            daily: null,
            loadCurve: null,
            maxPower: null
        };

        // --- 3. Fetch Data ---
        try {
            results.daily = await fetchEnedisApi('daily_consumption', consent.prm, startDate, endDate, consent.accessToken);
            // Save daily to Firestore
            await adminDb.collection('enedis_data').doc(`${consent.prm}_daily_${startDate}`).set({
                prm: consent.prm,
                type: 'daily',
                startDate,
                endDate,
                data: results.daily,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) { results.daily = { error: e.message }; }

        try {
            results.loadCurve = await fetchEnedisApi('consumption_load_curve', consent.prm, startDate, endDate, consent.accessToken);
            await adminDb.collection('enedis_data').doc(`${consent.prm}_loadcurve_${startDate}`).set({
                prm: consent.prm,
                type: 'load_curve',
                startDate,
                endDate,
                data: results.loadCurve,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) { results.loadCurve = { error: e.message }; }

        try {
            results.maxPower = await fetchEnedisApi('daily_consumption_max_power', consent.prm, startDate, endDate, consent.accessToken);
        } catch (e) { results.maxPower = { error: e.message }; }

        res.status(200).json({
            prm: consent.prm,
            data: results
        });

    } catch (error) {
        console.error('Enedis Fetch Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch Enedis data', details: error.message });
    }
}
