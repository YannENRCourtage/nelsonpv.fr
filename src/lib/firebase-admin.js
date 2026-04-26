import admin from 'firebase-admin';

/**
 * Initializes Firebase Admin SDK for server-side use.
 * This should only be used in API routes.
 */
export function getFirebaseAdmin() {
    if (!admin.apps.length) {
        // We use environment variables for security.
        // On Vercel, make sure to add these to your project settings.
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
        let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@nelsonpv-4722c.iam.gserviceaccount.com";
        let projectId = process.env.FIREBASE_PROJECT_ID || "nelsonpv-4722c";

        // Handle case where the entire JSON was pasted into FIREBASE_PRIVATE_KEY
        if (privateKey.trim().startsWith('{')) {
            try {
                const sa = JSON.parse(privateKey);
                if (sa.private_key) privateKey = sa.private_key;
                if (sa.client_email) clientEmail = sa.client_email;
                if (sa.project_id) projectId = sa.project_id;
            } catch (e) {
                console.warn("Firebase Admin: Failed to parse key as JSON, continuing as string.");
            }
        }

        // Clean the key string
        if (privateKey) {
            // Handle escaped newlines from environment variables
            privateKey = privateKey.replace(/\\n/g, '\n');
            
            // Remove accidental quotes if the whole string was quoted
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            
            // Ensure standard markers are present and formatted correctly
            // Also remove internal spaces that might cause ASN.1 parsing errors
            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";
            
            if (privateKey.includes(header) && privateKey.includes(footer)) {
                let body = privateKey.split(header)[1].split(footer)[0];
                body = body.replace(/[^A-Za-z0-9+/=]/g, ''); // Strips all whitespace and non-base64 chars
                privateKey = `${header}\n${body}\n${footer}`;
            } else if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
            }
        }

        const serviceAccount = {
            projectId: projectId.trim(),
            clientEmail: clientEmail.trim(),
            privateKey: privateKey
        };

        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase Admin: SDK Initialized successfully.");
        } catch (initErr) {
            // Log a sanitized version of the error for debugging
            const errorSummary = initErr.message.includes('ASN.1') 
                ? `${initErr.message} (Key Length: ${privateKey.length})`
                : initErr.message;
            console.error("Firebase Admin: Initialization FAILED:", errorSummary);
            throw new Error(errorSummary);
        }
    }
    return admin;
}

export const getAdminDb = () => getFirebaseAdmin().firestore();
export const getAdminAuth = () => getFirebaseAdmin().auth();
