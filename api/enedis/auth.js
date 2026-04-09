export default async function handler(req, res) {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
    }

    const clientId = process.env.ENEDIS_CLIENT_ID;
    const redirectUri = process.env.ENEDIS_REDIRECT_URI;
    
    // Scopes requested (Daily consumption and Load curve)
    // Note: pdl_consumption_load_curve requires specific activation on Datahub
    const scopes = [
        'pdl_daily_consumption',
        'pdl_consumption_load_curve',
        'pdl_max_power',
        'pdl_identity'
    ].join(' ');

    const state = JSON.stringify({ projectId });
    const encodedState = Buffer.from(state).toString('base64');

    // Enedis Authorization URL
    // For Sandbox/Production the base URL is usually the same or depends on the portal
    // Data Connect V5+ uses mon-compte-particulier.enedis.fr/auth/oauth2/authorize
    const authUrl = new URL('https://mon-compte-particulier.enedis.fr/auth/oauth2/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', encodedState);
    authUrl.searchParams.append('duration', 'P3Y'); // Duration of consent (3 years)

    res.redirect(authUrl.toString());
}
