import { createSign } from 'crypto';

// ============================================================
// Utilitaires JWT / OAuth2 (sans dépendance Firebase Admin SDK)
// ============================================================

function toBase64Url(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function parsePrivateKey() {
    let key = process.env.FIREBASE_PRIVATE_KEY || '';

    // Cas 1 : JSON complet collé dans la variable
    if (key.trim().startsWith('{')) {
        try {
            const sa = JSON.parse(key);
            if (sa.private_key) key = sa.private_key;
        } catch (e) { /* continue */ }
    }

    // Cas 2 : entouré de guillemets
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1);
    }

    // Remplacer les \n littéraux par de vrais sauts de ligne
    key = key.replace(/\\n/g, '\n');

    // Reconstruire le format PEM correct
    const HEADER = '-----BEGIN PRIVATE KEY-----';
    const FOOTER = '-----END PRIVATE KEY-----';

    if (key.includes(HEADER) && key.includes(FOOTER)) {
        const body = key.split(HEADER)[1].split(FOOTER)[0]
            .replace(/\s/g, '');
        const lines = body.match(/.{1,64}/g) || [];
        key = `${HEADER}\n${lines.join('\n')}\n${FOOTER}`;
    }

    return key;
}

/**
 * Génère un access token Google OAuth2 en signant un JWT avec
 * les credentials du compte de service — aucun SDK externe requis.
 */
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
// Handler principal
// ============================================================

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

    // Vérification stricte du token d'authentification de l'administrateur
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'nelsonpv-4722c';

        // 1. Obtenir un token OAuth2 via JWT de compte de service
        const accessToken = await getGoogleAccessToken();

        // 2. Vérifier l'identité de l'appelant via l'API officielle Google Identity Toolkit
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

        // 3. Appeler l'Identity Toolkit Admin API pour changer le mot de passe
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
