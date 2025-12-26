// Script to sync Firebase Auth users with Firestore user documents
// This creates missing Firestore profiles for existing Auth users

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Firebase config (use your actual values)
const firebaseConfig = {
    apiKey: "AIzaSyAtgH-I5UyB-A23B9MwHoiW06q8Mzu3FQM",
    authDomain: "nelsonpv-4722c.firebaseapp.com",
    projectId: "nelsonpv-4722c",
    storageBucket: "nelsonpv-4722c.firebasestorage.app",
    messagingSenderId: "845980346264",
    appId: "1:845980346264:web:68be82f07a359daf422ded"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * List of known users from Firebase Auth
 */
const knownUsers = [
    {
        uid: "FZIPvq1MXYazLSNBPIhMn68wVyv1",
        email: "y.barberis@enr-courtage.fr",
        role: "admin",
        displayName: "Yann Barberis"
    },
    {
        uid: "T83pznBTQcVOj1lR7LZiV8JYs9p1",
        email: "contact@enr-courtage.fr",
        role: "admin",
        displayName: "Contact ENR Courtage"
    },
    {
        uid: "0g3HTVN7p5O8Xfs7CopdrlkdNI13",
        email: "n.bachevalier@enr-courtage.fr",
        role: "user",
        displayName: "N. Bachevalier"
    },
    {
        uid: "3jpycHcRJqegefS6SBF2KFtJ8wj1",
        email: "jack.luc@icloud.com",
        role: "user",
        displayName: "Jack Luc"
    }
];

async function syncUser(userInfo) {
    try {
        // Check if Firestore document exists
        const userRef = doc(db, 'users', userInfo.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            console.log(`✅ User ${userInfo.email} already has a Firestore profile.`);
            return;
        }

        // Create Firestore document
        const userData = {
            email: userInfo.email,
            displayName: userInfo.displayName,
            role: userInfo.role,
            permissions: {
                canAccessCRM: true,
                canAccessEditor: true,
                canAccessSimulator: true,
                canViewAllProjects: userInfo.role === 'admin'
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };

        await setDoc(userRef, userData);
        console.log(`✅ Created Firestore profile for ${userInfo.email}`);
    } catch (error) {
        console.error(`❌ Error syncing user ${userInfo.email}:`, error);
    }
}

async function main() {
    console.log('🔄 Starting user sync...\n');

    for (const userInfo of knownUsers) {
        await syncUser(userInfo);
    }

    console.log('\n✅ Sync complete!');
    process.exit(0);
}

main();
