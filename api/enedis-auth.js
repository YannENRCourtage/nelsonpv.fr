
import axios from 'axios';

const CLIENT_ID = process.env.ENEDIS_CLIENT_ID;
const CLIENT_SECRET = process.env.ENEDIS_CLIENT_SECRET;
const REDIRECT_URI = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/enedis-auth?action=callback` 
  : 'http://localhost:3000/api/enedis-auth?action=callback';

export default async function handler(req, res) {
  const { action, code, state } = req.query;

  // 1. Redirection to Enedis Authorization Server
  if (action === 'authorize') {
    const authUrl = `https://mon-compte.enedis.fr/auth/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&duration=P6M`;
    return res.redirect(authUrl);
  }

  // 2. Callback from Enedis
  if (action === 'callback') {
    if (!code) {
      return res.status(400).json({ error: 'Missing code in callback' });
    }

    try {
      // Exchange code for token
      const tokenResponse = await axios.post('https://v1.oauth2.enedis.fr/oauth2/token', {
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // In a real app, we would secure this token. 
      // For this demo, we might return it to the frontend via a redirect or secure cookie.
      // Redirecting back to the app with the token (CAUTION: sensitive data in URL is bad for prod, but useful for testing)
      const targetUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/project/new/edit?enedis_token=${tokenResponse.data.access_token}` 
        : `http://localhost:3000/project/new/edit?enedis_token=${tokenResponse.data.access_token}`;
        
      return res.redirect(targetUrl);

    } catch (error) {
      console.error('Enedis Auth Error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Auth failed', details: error.response?.data });
    }
  }

  res.status(400).json({ error: 'Invalid action' });
}
