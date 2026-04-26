// api/enedis/auth.js
// Initie le flux OAuth2 Enedis Data Connect vers la page de consentement client.
// IMPORTANT : Suivre EXACTEMENT le format de l'URL de production Enedis DataHub :
// https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize
//   ?client_id=[client_id]&duration=[duration]&response_type=code&state=[state]
// NE PAS inclure redirect_uri ni scope — ces paramètres sont gérés côté DataHub.

async function handler(req, res) {
    const { projectId, prm } = req.query;

    console.log(`[Enedis Auth] Initiating auth for project: ${projectId}, prm: ${prm}`);

    if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
    }

    try {
        const clientId = (process.env.ENEDIS_CLIENT_ID || "").trim();

        if (!clientId) {
            return res.status(500).json({ error: 'Missing ENEDIS_CLIENT_ID' });
        }

        // State = projectId + prm encodés en base64
        const state = JSON.stringify({ projectId, prm: prm || null });
        const encodedState = Buffer.from(state).toString('base64');

        // URL de consentement Enedis Production — format exact selon DataHub docs
        // PAS de redirect_uri (configuré dans DataHub), PAS de scope (configuré dans DataHub)
        const authUrl = new URL('https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize');
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('duration', 'P3Y');
        authUrl.searchParams.append('state', encodedState);

        // Le PRM permet à Enedis d'afficher les données du client sur la page de consentement
        if (prm && prm.length === 14) {
            authUrl.searchParams.append('usage_point_id', prm);
        }

        console.log(`[Enedis Auth] Redirecting → client_id: ${clientId.substring(0, 8)}...`);
        res.redirect(authUrl.toString());

    } catch (err) {
        console.error('[Enedis Auth] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
}

export default handler;
