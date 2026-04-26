import * as admin from 'firebase-admin';
import fs from 'fs';

async function test() {
    try {
        const serviceAccountPath = 'C:\\Users\\Utilisateur\\Documents\\ENR COURTAGE ENERGIE\\SITES INTERNET\\NELSON\\NELSON\\.firebase\\firebase-adminsdk.json';
        // Wait, I don't have the explicit service account file path.
        // Let's use the env vars from .env.vercel.production
        
        // Actually, the firebase-admin in the project uses the env vars.
        const { getAdminDb } = await import('../src/lib/firebase-admin.js');
        const db = getAdminDb();
        
        const doc = await db.collection('enedis_consents').doc('16138350177475').get();
        if (doc.exists) {
            console.log("Consent found in Firestore!", doc.data());
        } else {
            console.log("Consent NOT found in Firestore for PRM 16138350177475");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
