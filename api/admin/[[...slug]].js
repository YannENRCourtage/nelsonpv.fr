import { createSign } from 'crypto';
import { getFirebaseAdmin } from '../../src/lib/firebase-admin.js';
import { withAdmin, setSecureCors } from '../common/_authMiddleware.js';

// ============================================================
// Utilitaires JWT / OAuth2 (pour change-password)
// ============================================================

function toBase64Url(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function parsePrivateKey() {
    let key = process.env.FIREBASE_PRIVATE_KEY || '';

    if (key.trim().startsWith('{')) {
        try {
            const sa = JSON.parse(key);
            if (sa.private_key) key = sa.private_key;
        } catch (e) { /* continue */ }
    }

    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1);
    }

    key = key.replace(/\\n/g, '\n');

    const HEADER = '-----BEGIN PRIVATE KEY-----';
    const FOOTER = '-----END PRIVATE KEY-----';

    if (key.includes(HEADER) && key.includes(FOOTER)) {
        const body = key.split(HEADER)[1].split(FOOTER)[0].replace(/\s/g, '');
        const lines = body.match(/.{1,64}/g) || [];
        key = `${HEADER}\n${lines.join('\n')}\n${FOOTER}`;
    }

    return key;
}

async function getGoogleAccessToken() {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        || 'firebase-adminsdk-fbsvc@nelsonpv-4722c.iam.gserviceaccount.com';
    const privateKey = parsePrivateKey();

    const now = Math.floor(Date.now() / 1000);

    const header = toBase64Url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const payload = toBase64Url(Buffer.from(JSON.stringify({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/identitytoolkit'
    })));

    const signingInput = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = toBase64Url(sign.sign(privateKey));

    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`OAuth2 token request failed: ${errText}`);
    }

    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error('No access_token returned from OAuth2 endpoint');
    return access_token;
}

// ============================================================
// Handlers spécifiques
// ============================================================

async function handleChangePassword(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, newPassword } = req.body || {};

    if (!uid || !newPassword) {
        return res.status(400).json({ error: 'UID and newPassword are required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'nelsonpv-4722c';

        // 1. Obtenir un token OAuth2
        const accessToken = await getGoogleAccessToken();

        // 2. Vérifier l'identité de l'appelant
        const lookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idToken })
        });

        if (!lookupRes.ok) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin token' });
        }

        const lookupData = await lookupRes.json();
        const caller = lookupData?.users?.[0];
        const callerEmail = caller?.email?.toLowerCase();

        const ADMIN_EMAILS = ['y.barberis@enr-courtage.fr', 'contact@nelsonpv.fr'];
        let isAdmin = callerEmail && ADMIN_EMAILS.includes(callerEmail);

        if (!isAdmin && caller?.customAttributes) {
            try {
                const parsedAttrs = JSON.parse(caller.customAttributes);
                if (parsedAttrs.role === 'admin' || parsedAttrs.admin === true) {
                    isAdmin = true;
                }
            } catch (e) { /* ignore parse error */ }
        }

        if (!isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
        }

        // 3. Mettre à jour le mot de passe
        const apiUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;

        const updateRes = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                localId: uid,
                password: newPassword
            })
        });

        const updateData = await updateRes.json();

        if (!updateRes.ok) {
            const errMsg = updateData?.error?.message || JSON.stringify(updateData);
            throw new Error(`Identity Toolkit API error: ${errMsg}`);
        }

        console.log(`[Admin] Password securely updated via REST API for UID: ${uid} by ${callerEmail}`);
        return res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès.' });

    } catch (error) {
        console.error('[Admin] Password update failed:', error.message);
        return res.status(500).json({
            error: 'Erreur lors de la mise à jour du mot de passe.',
            details: error.message
        });
    }
}

const CORS_CONFIG = [
  {
    origin: ['*'],
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    responseHeader: ['*'],
    maxAgeSeconds: 3600
  }
];

async function handleSetStorageCors(req, res) {
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

// Handler principal
export default async function handler(req, res) {
    const { slug } = req.query || {};
    const action = Array.isArray(slug) ? slug[0] : (slug || '');
    const url = req.url || '';

    if (action === 'change-password' || url.includes('/change-password')) {
        return handleChangePassword(req, res);
    }

    if (action === 'set-storage-cors' || url.includes('/set-storage-cors')) {
        return withAdmin(handleSetStorageCors)(req, res);
    }

    return res.status(404).json({ error: 'Admin route not found' });
}
