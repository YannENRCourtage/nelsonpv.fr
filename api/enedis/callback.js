import axios from 'axios';
import { adminDb } from '../../src/lib/firebase-admin';

export default async function handler(req, res) {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect(`/?error=${encodeURIComponent('Enedis Error: ' + error)}`);
    }

    if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
    }

    let projectId;
    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        projectId = decodedState.projectId;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid state' });
    }

    try {
        // 1. Exchange Auth Code for Access Token
        const tokenResponse = await axios.post('https://ext.enedis.fr/oauth2/v3/token', new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.ENEDIS_CLIENT_ID,
            client_secret: process.env.ENEDIS_CLIENT_SECRET,
            redirect_uri: process.env.ENEDIS_REDIRECT_URI
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

        // 2. Discover PRMs (Search usage points)
        const prmResponse = await axios.get('https://ext.enedis.fr/customer/v1/usage_points', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        const usagePoints = prmResponse.data.usage_points || [];

        if (usagePoints.length === 0) {
            return res.redirect(`/project/${projectId}?enedis=error&message=no_prm_found`);
        }

        const prm = usagePoints[0].usage_point_id;

        // 3. Save to Firestore
        // Using collection 'enedis_consents'
        await adminDb.collection('enedis_consents').doc(projectId).set({
            prm,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt,
            projectId,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        res.redirect(`/project/${projectId}?enedis=success&prm=${prm}`);

    } catch (err) {
        console.error('Enedis Callback Error:', err.response?.data || err.message);
        const errorMsg = err.response?.data?.error_description || err.message;
        res.redirect(`/project/${projectId}?enedis=error&message=${encodeURIComponent(errorMsg)}`);
    }
}
