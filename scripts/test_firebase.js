import 'dotenv/config';
import { getFirebaseAdmin } from '../src/lib/firebase-admin.js';

console.log("Key from env:", process.env.FIREBASE_PRIVATE_KEY);
try {
    const admin = getFirebaseAdmin();
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase initialization failed:", e.message);
    if (e.errorInfo) {
        console.error(e.errorInfo);
    }
}
