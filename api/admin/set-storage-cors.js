import { getFirebaseAdmin } from '../../src/lib/firebase-admin.js';
import { withAdmin, setSecureCors } from '../common/authMiddleware.js';

const CORS_CONFIG = [
  {
    origin: ['*'],
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    responseHeader: ['*'],
    maxAgeSeconds: 3600
  }
];

async function handler(req, res) {
  setSecureCors(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const admin = getFirebaseAdmin();
    const storage = admin.storage();

    const bucketNames = [
      'nelsonpv-4722c.appspot.com',
      'nelsonpv-4722c.firebasestorage.app'
    ];

    const results = [];

    for (const name of bucketNames) {
      try {
        const bucket = storage.bucket(name);
        await bucket.setCorsConfiguration(CORS_CONFIG);
        results.push({ bucket: name, status: 'success' });
      } catch (err) {
        results.push({ bucket: name, status: 'warning', message: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'CORS configuration applied to Firebase Storage buckets',
      results
    });
  } catch (error) {
    console.error('Error applying Storage CORS:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
}

export default withAdmin(handler);

