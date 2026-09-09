/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE POSTAL API - STATUS HANDLER
 * Endpoint Serverless Vercel : GET /api/servicepostal/status?uid=...
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée. Seul GET est accepté.' });
  }

  const { uid } = req.query || {};
  if (!uid) {
    return res.status(400).json({ success: false, error: 'Le paramètre uid est obligatoire.' });
  }

  const apiKey = process.env.SERVICEPOSTAL_API_KEY;
  const baseUrl = process.env.SERVICEPOSTAL_API_URL || 'https://prod-api.servicepostal.com';

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'La clé API ServicePostal (SERVICEPOSTAL_API_KEY) n\'est pas configurée.'
    });
  }

  try {
    const infoRes = await fetch(`${baseUrl}/lettres/${encodeURIComponent(uid)}/infos`, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Accept': 'application/json'
      }
    });

    const infoData = await infoRes.json().catch(() => null);

    if (!infoRes.ok) {
      return res.status(infoRes.status).json({
        success: false,
        error: infoData?.message || `Erreur Service Postal (${infoRes.status})`,
        details: infoData
      });
    }

    // Essayer de récupérer le suivi postal si disponible
    let trackingData = null;
    try {
      const trackRes = await fetch(`${baseUrl}/lettres/${encodeURIComponent(uid)}/suivi`, {
        headers: { 'apiKey': apiKey, 'Accept': 'application/json' }
      });
      if (trackRes.ok) {
        trackingData = await trackRes.json().catch(() => null);
      }
    } catch {
      // Ignorer l'erreur si le suivi n'est pas actif pour cet affranchissement
    }

    return res.status(200).json({
      success: true,
      uid,
      statut: infoData?.data?.statut || infoData?.statut || 'inconnu',
      dateEnvoi: infoData?.data?.date_envoi || infoData?.date_envoi,
      infos: infoData?.data || infoData,
      suivi: trackingData
    });

  } catch (error) {
    console.error('[ServicePostal] Erreur statut:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la récupération du statut.',
      message: error.message
    });
  }
}
