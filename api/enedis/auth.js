// api/enedis/auth.js

async function handler(req, res) {
    const { projectId } = req.query;

    console.log(`[Enedis Auth] Initiating auth for project: ${projectId}`);

    if (!projectId) {
        console.error('[Enedis Auth] Error: Missing projectId');
        return res.status(400).json({ error: 'Missing projectId' });
    }

    try {
        const clientId = process.env.ENEDIS_CLIENT_ID;
        const redirectUri = process.env.ENEDIS_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            console.error('[Enedis Auth] Error: Missing ENEDIS_CLIENT_ID or ENEDIS_REDIRECT_URI in environment');
            return res.status(500).json({ error: 'Server configuration error: missing Enedis credentials' });
        }
        
        // Scopes requested
        const scopes = [
            'pdl_daily_consumption',
            'pdl_consumption_load_curve',
            'pdl_max_power'
            // pdl_identity removed for production compatibility
        ].join(' ');

        const state = JSON.stringify({ projectId });
        const encodedState = Buffer.from(state).toString('base64');

        // Enedis Authorization URL
        // Using the official Data Connect v5 authorize URL
        const authUrl = new URL('https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize');
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('state', encodedState);
        authUrl.searchParams.append('duration', 'P3Y'); // 3 years

        console.log(`[Enedis Auth] Redirecting to Enedis with client_id: ${clientId.substring(0, 5)}...`);
        res.redirect(authUrl.toString());

    } catch (err) {
        console.error('[Enedis Auth] Global Crash:', err.message);
        res.status(500).json({ error: 'Internal Server Error during Enedis auth initiation', detail: err.message });
    }
}

// REMOVED withAuth because window.open (new tab) cannot send the required Authorization header.
// Security is handled by the state validation and the fact that Enedis login is required.
export default handler;
