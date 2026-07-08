import crypto from 'crypto';
import axios from 'axios';

// API unifiée de gestion du consentement ENEDIS
// Regroupe les actions : create_request, check_status, get_info, validate
// Un seul fichier = une seule fonction serverless (limite Vercel Hobby = 12)

export default async function handler(req, res) {
  const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
  const db = getAdminDb();

  const action = req.query.action || (req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)?.action : null);

  // ═══════════════════════════════════════════════════════════════
  // POST : Création d'une demande de consentement (action=create_request)
  // ═══════════════════════════════════════════════════════════════
  if (req.method === 'POST' && (!action || action === 'create_request')) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { prm, clientName, clientContact, contactMethod, projectId } = body;

      // Validation des champs obligatoires
      if (!prm || !clientName || !clientContact || !contactMethod || !projectId) {
        return res.status(400).json({
          success: false,
          error: 'Champs obligatoires manquants : prm, clientName, clientContact, contactMethod, projectId'
        });
      }

      // Validation de la méthode de contact
      const methodesAutorisees = ['sms', 'whatsapp', 'email'];
      if (!methodesAutorisees.includes(contactMethod)) {
        return res.status(400).json({
          success: false,
          error: `Méthode de contact invalide. Valeurs acceptées : ${methodesAutorisees.join(', ')}`
        });
      }

      // Génération du token unique
      const token = crypto.randomUUID();

      // Préparation du document de consentement
      const consentRequest = {
        token,
        prm,
        clientName,
        clientContact,
        contactMethod,
        projectId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      };

      // Stockage dans Firestore avec le token comme identifiant de document
      await db.collection('enedis_consent_requests').doc(token).set(consentRequest);

      return res.status(201).json({
        success: true,
        token,
        consentUrl: `/consent/${token}`
      });
    } catch (error) {
      console.error('Erreur lors de la création de la demande de consentement :', error);
      return res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POST : Validation du consentement par le client (action=validate)
  // ═══════════════════════════════════════════════════════════════
  if (req.method === 'POST' && action === 'validate') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { token } = body;

      if (!token) {
        return res.status(400).json({ success: false, error: 'Le paramètre token est requis' });
      }

      // Récupération de l'IP du client
      const clientIp =
        body.clientIp ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown';

      const docRef = db.collection('enedis_consent_requests').doc(token);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Demande de consentement introuvable' });
      }

      const data = doc.data();

      // Vérification de l'expiration
      if (new Date(data.expiresAt) < new Date()) {
        return res.status(410).json({ success: false, error: 'Cette demande de consentement a expiré' });
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
      const enedisClientId = process.env.ENEDIS_CLIENT_ID;
      const enedisClientSecret = process.env.ENEDIS_CLIENT_SECRET;

      if (!enedisClientId || !enedisClientSecret) {
        console.error('Variables d\'environnement ENEDIS manquantes');
        return res.status(500).json({
          success: false,
          error: 'Configuration ENEDIS incomplète côté serveur'
        });
      }

      const authHeader = 'Basic ' + Buffer.from(`${enedisClientId}:${enedisClientSecret}`).toString('base64');

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

      return res.status(200).json({ success: true, message: 'Consentement validé' });
    } catch (error) {
      console.error('Erreur lors de la validation du consentement :', error);
      if (error.response) {
        console.error('Réponse ENEDIS :', error.response.status, error.response.data);
        return res.status(502).json({ success: false, error: 'Erreur de communication avec le service ENEDIS' });
      }
      return res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET : Vérifier le statut d'une demande (action=check_status)
  // ═══════════════════════════════════════════════════════════════
  if (req.method === 'GET' && action === 'check_status') {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ success: false, error: 'Le paramètre token est requis' });
      }

      const doc = await db.collection('enedis_consent_requests').doc(token).get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Demande de consentement introuvable' });
      }

      const data = doc.data();
      return res.status(200).json({
        success: true,
        status: data.status,
        prm: data.prm,
        clientName: data.clientName,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        ...(data.acceptedAt && { acceptedAt: data.acceptedAt })
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du statut :', error);
      return res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET : Récupérer les infos d'une demande pour la page client (action=get_info)
  // ═══════════════════════════════════════════════════════════════
  if (req.method === 'GET' && action === 'get_info') {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ success: false, error: 'Le paramètre token est requis' });
      }

      const doc = await db.collection('enedis_consent_requests').doc(token).get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Demande de consentement introuvable' });
      }

      const data = doc.data();

      // Vérification de l'expiration
      if (new Date(data.expiresAt) < new Date()) {
        return res.status(410).json({
          success: false,
          status: 'expired',
          error: 'Cette demande de consentement a expiré'
        });
      }

      return res.status(200).json({
        success: true,
        prm: data.prm,
        clientName: data.clientName,
        status: data.status,
        createdAt: data.createdAt
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du consentement :', error);
      return res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
    }
  }

  // Méthode/action non supportée
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, error: 'Méthode ou action non autorisée' });
}
