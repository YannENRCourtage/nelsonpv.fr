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
    const { projectId, prm, forceRefresh = false, action } = req.query;

    // Action : lister les consentements (appelé par l'historique AdminEnedis)
    if (action === 'list_consents') {
        try {
            const fbAdmin = await import('../../src/lib/firebase-admin.js');
            const db = fbAdmin.getAdminDb();
            const snapshot = await db.collection('enedis_consents').orderBy('updatedAt', 'desc').get();
            const consents = snapshot.docs.map(doc => {
                const d = doc.data();
                return { id: doc.id, prm: d.prm, projectId: d.projectId, annualConsumption: d.annualConsumption, expiresAt: d.expiresAt, updatedAt: d.updatedAt };
            });
            return res.status(200).json({ consents });
        } catch (e) {
            console.error('[Enedis Fetch] list_consents error:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }

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

        // Plage de dates : 365 jours pour daily/maxPower, 30 jours pour load_curve (perf)
        const defaultEndDate = new Date().toISOString().split('T')[0];
        const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const loadCurveStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const start = req.query.startDate || defaultStartDate;
        const end = req.query.endDate || defaultEndDate;
        const prmToFetch = consent.prm;

        console.log(`[Enedis Fetch] Parallel fetch for PRM ${prmToFetch}, period: ${start} → ${end}`);

        // ⚡ APPELS PARALLÈLES — 3-4x plus rapide que séquentiel
        const ENEDIS_CUSTOMERS_BASE = 'https://gw.ext.prod.api.enedis.fr/customers_dc/v5';

        const callApi = (baseUrl, endpoint, prmParam, s, e) =>
            axios.get(`${baseUrl}/${endpoint}`, {
                params: { usage_point_id: prmParam, start: s, end: e },
                headers: { 'Authorization': `Bearer ${consent.accessToken}`, 'Accept': 'application/json' },
                timeout: 8000
            }).then(r => r.data);

        const callIdentity = (prmParam) =>
            axios.get(`${ENEDIS_CUSTOMERS_BASE}/usage_points/identities`, {
                params: { usage_point_id: prmParam },
                headers: { 'Authorization': `Bearer ${consent.accessToken}`, 'Accept': 'application/json' },
                timeout: 5000
            }).then(r => r.data);

        const [dailyRes, loadRes, maxRes, identityRes] = await Promise.allSettled([
            callApi(ENEDIS_METERING_BASE, 'daily_consumption', prmToFetch, start, end),
            callApi(ENEDIS_METERING_BASE, 'load_curve', prmToFetch, loadCurveStart, end),
            callApi(ENEDIS_MAX_POWER_BASE, 'daily_consumption_max_power', prmToFetch, start, end),
            callIdentity(prmToFetch)
        ]);

        const results = {
            daily: dailyRes.status === 'fulfilled' ? dailyRes.value : { error: dailyRes.reason?.message, status: dailyRes.reason?.response?.status },
            loadCurve: loadRes.status === 'fulfilled' ? loadRes.value : { error: loadRes.reason?.message, status: loadRes.reason?.response?.status },
            maxPower: maxRes.status === 'fulfilled' ? maxRes.value : { error: maxRes.reason?.message, status: maxRes.reason?.response?.status },
        };

        console.log(`[Enedis Fetch] daily:${dailyRes.status} load_curve:${loadRes.status} maxPower:${maxRes.status} identity:${identityRes.status}`);

        // Mise à jour du consentement avec conso annuelle + identité après fetch réussi
        try {
            const updateData = { updatedAt: new Date().toISOString() };

            if (dailyRes.status === 'fulfilled') {
                const readings = dailyRes.value?.meter_reading?.interval_reading || [];
                const totalWh = readings.reduce((s, r) => s + parseInt(r.value || 0), 0);
                updateData.annualConsumption = Math.round(totalWh / 1000);
            }

            if (identityRes.status === 'fulfilled') {
                const id = identityRes.value?.customers?.[0]?.customer;
                if (id) {
                    const civil = id.person || id.company;
                    updateData.titulaire = civil?.lastname
                        ? `${civil.firstname || ''} ${civil.lastname}`.trim()
                        : (civil?.company_name || 'Inconnu');
                    updateData.adresse = identityRes.value?.customers?.[0]?.usage_point?.usage_point_addresses?.usage_point_address || '';
                }
            }

            await consentDoc.ref.update(updateData);
            console.log(`[Enedis Fetch] ✅ Consent updated (conso: ${updateData.annualConsumption} kWh, titulaire: ${updateData.titulaire || 'N/A'})`);
        } catch (updateErr) {
            console.warn('[Enedis Fetch] Could not update consent doc:', updateErr.message);
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
