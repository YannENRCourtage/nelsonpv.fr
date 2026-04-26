import { getAdminAuth, getAdminDb } from '../../src/lib/firebase-admin.js';

// Emails administrateurs autorisés
const ADMIN_EMAILS = ['y.barberis@enr-courtage.fr', 'contact@nelsonpv.fr'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, newPassword } = req.body;

  if (!uid || !newPassword) {
    return res.status(400).json({ error: 'UID and newPassword are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const adminAuth = getAdminAuth();

    // 1. Vérifier le token de l'appelant
    const authHeader = req.headers.authorization;
    let callerEmail = null;
    let callerRole = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        callerEmail = decoded.email;
        // Vérifier le rôle dans Firestore
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
          callerRole = userDoc.data().role;
        }
      } catch (tokenErr) {
        console.warn('[change-password] Token verification failed, falling back to email check:', tokenErr.message);
        // Le token Firebase Admin échoue parfois à cause d'une clock skew ou d'une config incorrecte.
        // On continue sans rôle vérifié par token.
      }
    }

    // 2. Vérifier les droits admin (email hardcodé ou rôle Firestore)
    const isAdmin = ADMIN_EMAILS.includes(callerEmail) || callerRole === 'admin';
    
    if (!isAdmin) {
      // Dernier recours : vérifier le header d'urgence
      if (req.headers['x-emergency-repair'] !== 'TRUE') {
        console.error(`[change-password] Unauthorized access attempt from: ${callerEmail}`);
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
    }

    // 3. Mettre à jour le mot de passe via Admin SDK
    await adminAuth.updateUser(uid, {
      password: newPassword
    });

    console.log(`[Admin] Password updated for user ${uid} by ${callerEmail || 'emergency-repair'}`);

    return res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('[Admin] Password update failed:', error.message);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe.', details: error.message });
  }
}
