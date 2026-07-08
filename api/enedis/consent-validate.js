import axios from 'axios';

// Gestionnaire de validation de consentement ENEDIS
export default async function handler(req, res) {
  const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
  const db = getAdminDb();

  // --- Récupération des informations de la demande de consentement ---
  if (req.method === 'GET') {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre token est requis'
        });
      }

      const doc = await db.collection('enedis_consent_requests').doc(token).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Demande de consentement introuvable'
        });
      }

      const data = doc.data();

      // Vérification de l'expiration
      if (new Date(data.expiresAt) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'Cette demande de consentement a expiré'
        });
      }

      // Retourner les infos sans le token pour des raisons de sécurité
      return res.status(200).json({
        success: true,
        prm: data.prm,
        clientName: data.clientName,
        status: data.status,
        createdAt: data.createdAt
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du consentement :', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  // --- Validation du consentement par le client ---
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { token } = body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre token est requis'
        });
      }

      // Récupération de l'IP du client depuis le body ou les en-têtes
      const clientIp =
        body.clientIp ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown';

      const docRef = db.collection('enedis_consent_requests').doc(token);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Demande de consentement introuvable'
        });
      }

      const data = doc.data();

      // Vérification de l'expiration
      if (new Date(data.expiresAt) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'Cette demande de consentement a expiré'
        });
      }

      // Vérification que le statut est bien en attente
      if (data.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `Cette demande a déjà été traitée (statut : ${data.status})`
        });
      }

      // Mise à jour du statut vers "accepté"
      const acceptedAt = new Date().toISOString();
      await docRef.update({
        status: 'accepted',
        acceptedAt,
        acceptedIp: clientIp
      });

      // --- Obtention du token M2M auprès d'ENEDIS via client_credentials ---
      const clientId = process.env.ENEDIS_CLIENT_ID;
      const clientSecret = process.env.ENEDIS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('Variables d\'environnement ENEDIS manquantes');
        return res.status(500).json({
          success: false,
          error: 'Configuration ENEDIS incomplète côté serveur'
        });
      }

      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenResponse = await axios.post(
        'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token: accessToken, expires_in: expiresIn } = tokenResponse.data;

      // Calcul de la date d'expiration du token ENEDIS
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Stockage du consentement ENEDIS dans Firestore (indexé par PRM)
      await db.collection('enedis_consents').doc(data.prm).set({
        prm: data.prm,
        accessToken,
        expiresAt: tokenExpiresAt,
        updatedAt: new Date().toISOString(),
        projectId: data.projectId,
        consentMethod: 'nelson_direct'
      });

      return res.status(200).json({
        success: true,
        message: 'Consentement validé'
      });
    } catch (error) {
      console.error('Erreur lors de la validation du consentement :', error);

      // Gestion spécifique des erreurs ENEDIS
      if (error.response) {
        console.error('Réponse ENEDIS :', error.response.status, error.response.data);
        return res.status(502).json({
          success: false,
          error: 'Erreur de communication avec le service ENEDIS'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  // Méthode HTTP non supportée
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({
    success: false,
    error: 'Méthode non autorisée'
  });
}
