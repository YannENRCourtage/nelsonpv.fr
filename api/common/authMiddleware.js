import { getAdminAuth } from '../../src/lib/firebase-admin.js'

const ALLOWED_ORIGINS = [
    'https://nelsonpv.fr',
    'https://www.nelsonpv.fr',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173'
];

/**
 * Configure des headers CORS stricts pour protéger les API contre les requêtes externes non autorisées
 */
export function setSecureCors(req, res, allowedMethods = 'GET,OPTIONS,PATCH,DELETE,POST,PUT') {
    const origin = req.headers.origin;
    const isVercelPreview = origin && /^https:\/\/nelsonpv-[a-z0-9]+-nelsonpvfrs-projects\.vercel\.app$/.test(origin);

    if (origin && (ALLOWED_ORIGINS.includes(origin) || isVercelPreview)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'https://nelsonpv.fr');
    }

    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
}

/**
 * Middleware to verify Firebase ID Token
 * @param {Function} handler The API handler function
 * @returns {Function} Extended handler with authentication
 */
export const withAuth = (handler) => async (req, res) => {
    // 1. Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid Authorization header')
        return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const idToken = authHeader.split('Bearer ')[1]

    try {
        // 2. Verify token
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        
        // 3. Inject user info into request
        req.user = decodedToken
        
        // 4. Continue to handler
        return handler(req, res)
    } catch (error) {
        console.error('Firebase Auth Error:', error.message)
        return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }
}

/**
 * Middleware to check for Admin role
 * @param {Function} handler 
 */
export const withAdmin = (handler) => withAuth(async (req, res) => {
    // Check specific admin emails (matching firestore.rules)
    const ADMIN_EMAILS = ['y.barberis@enr-courtage.fr', 'contact@nelsonpv.fr']
    
    // Also check for role claim if available
    const isAdmin = ADMIN_EMAILS.includes(req.user.email) || req.user.role === 'admin'
    
    if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
    }
    
    return handler(req, res)
})
