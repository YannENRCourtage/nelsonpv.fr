// api/enedis/auth.js
// Initie le flux OAuth2 Enedis Data Connect vers la page de consentement client.
// Le PRM (usage_point_id) doit être passé pour que la page de consentement
// s'affiche correctement (sinon page blanche en production).

async function handler(req, res) {
    const { projectId, prm } = req.query;

    console.log(`[Enedis Auth] Initiating auth for project: ${projectId}, prm: ${prm}`);

    if (!projectId) {
        console.error('[Enedis Auth] Error: Missing projectId');
        return res.status(400).json({ error: 'Missing projectId' });
    }

    try {
        const clientId = (process.env.ENEDIS_CLIENT_ID || "").trim();
        const redirectUri = (process.env.ENEDIS_REDIRECT_URI || "").trim();

        if (!clientId || !redirectUri) {
            console.error('[Enedis Auth] Error: Missing ENEDIS_CLIENT_ID or ENEDIS_REDIRECT_URI in environment');
            return res.status(500).json({ error: 'Server configuration error: missing Enedis credentials' });
        }

        // Scopes production Data Connect v5
        // Ajout explicite de identity et contact_data pour correspondre aux besoins de callback.js
        const scopes = [
            'daily_consumption',
            'load_curve',
            'daily_consumption_max_power',
            'contracts',
            'identity',
            'contact_data'
        ].join(' ');

        // State = projectId + prm encodés en base64 pour transmission sécurisée via callback
        const state = JSON.stringify({ projectId, prm: prm || null });
        const encodedState = Buffer.from(state).toString('base64');

        // URL de consentement Enedis (identique sandbox et production)
        const authUrl = new URL('https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize');
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('state', encodedState);
        authUrl.searchParams.append('duration', 'P3Y'); // 3 ans max selon contrat Data Connect

        // CRITIQUE : Le PRM doit être inclus dans l'URL pour que la page de consentement
        // Enedis affiche les données du client.
        if (prm && prm.length === 14) {
            authUrl.searchParams.append('usage_point_id', prm);
        }

        console.log(`[Enedis Auth] Redirecting to Enedis (client_id: ${clientId.substring(0, 8)}..., redirect_uri: ${redirectUri})`);
        res.redirect(authUrl.toString());

    } catch (err) {
        console.error('[Enedis Auth] Global Crash:', err.message);
        res.status(500).json({ error: 'Internal Server Error during Enedis auth initiation', detail: err.message });
    }
}

export default handler;
