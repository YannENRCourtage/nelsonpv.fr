import { getAdminAuth } from '../../src/lib/firebase-admin.js';
import { withAdmin } from '../common/authMiddleware.js';

async function handler(req, res) {
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
    
    // Update the user's password in Firebase Authentication
    await adminAuth.updateUser(uid, {
      password: newPassword
    });

    console.log(`[Admin] Password updated for user ${uid} by admin ${req.user.email}`);

    return res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('[Admin] Password update failed:', error.message);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe.', details: error.message });
  }
}

export default withAdmin(handler);
