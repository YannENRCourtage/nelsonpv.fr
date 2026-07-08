import crypto from 'crypto';

// Gestionnaire de demandes de consentement ENEDIS
export default async function handler(req, res) {
  const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
  const db = getAdminDb();

  // --- Création d'une demande de consentement ---
  if (req.method === 'POST') {
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
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  // --- Vérification du statut d'une demande ---
  if (req.method === 'GET') {
    try {
      const { token, action } = req.query;

      if (action !== 'check_status') {
        return res.status(400).json({
          success: false,
          error: 'Action invalide. Utilisez action=check_status'
        });
      }

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
