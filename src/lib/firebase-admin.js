import admin from 'firebase-admin';

/**
 * Initializes Firebase Admin SDK for server-side use.
 * This should only be used in API routes.
 */
export function getFirebaseAdmin() {
    if (!admin.apps.length) {
        // We use environment variables for security.
        // On Vercel, make sure to add these to your project settings.
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID || "nelsonpv-4722c",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@nelsonpv-4722c.iam.gserviceaccount.com",
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
        };

        // Fallback for local development if variables are missing
        if (!serviceAccount.privateKey) {
            console.warn("Firebase Admin: FIREBASE_PRIVATE_KEY is missing. Database operations will fail on server.");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    return admin;
}

export const adminDb = getFirebaseAdmin().firestore();
export const adminAuth = getFirebaseAdmin().auth();
