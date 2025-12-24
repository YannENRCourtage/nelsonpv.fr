// Script to create initial user documents in Firestore
// Run this once to populate the users collection with the existing Authentication users

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAtgH-I5UyB-A23B9MwHoiW06q8Mzu3FQM",
    authDomain: "nelsonpv-4722c.firebaseapp.com",
    projectId: "nelsonpv-4722c",
    storageBucket: "nelsonpv-4722c.firebasestorage.app",
    messagingSenderId: "845980346264",
    appId: "1:845980346264:web:68be82f07a359daf422ded"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Users from Firebase Authentication (UIDs from the screenshot)
const users = [
    {
        uid: "0g3cYNh2oSMrKCqpzd...", // Replace with actual full UID
        email: "n.sacconato@enr-courtage-energie.fr",
        displayName: "N. Sacconato",
        role: "admin",
        permissions: {
            canAccessCRM: true,
            canAccessEditor: true,
            canAccessSimulator: true,
            canViewAllProjects: true
        }
    },
    {
        uid: "3gvs4R-xgpRSGR7kFt...", // Replace with actual full UID
        email: "jack.luc@icloud.com",
        displayName: "Jack Luc",
        role: "user",
        permissions: {
            canAccessCRM: true,
            canAccessEditor: true,
            canAccessSimulator: true,
            canViewAllProjects: false
        }
    },
    {
        uid: "F2PwcMaYaaLSNfPRMVk...", // Replace with actual full UID
        email: "yulianpelletier-courtage-energie.fr",
        displayName: "Yulian Pelletier",
        role: "user",
        permissions: {
            canAccessCRM: true,
            canAccessEditor: true,
            canAccessSimulator: true,
            canViewAllProjects: false
        }
    },
    {
        uid: "TB3oatRccVQJRPL3rVk...", // Replace with actual full UID
        email: "contact@enr-courtage-energie.fr",
        displayName: "Contact ENR",
        role: "user",
        permissions: {
            canAccessCRM: true,
            canAccessEditor: true,
            canAccessSimulator: true,
            canViewAllProjects: false
        }
    }
];

async function createUserDocuments() {
    console.log('Creating user documents in Firestore...\n');

    for (const user of users) {
        try {
            const userDoc = {
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                permissions: user.permissions,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, 'users', user.uid), userDoc);
            console.log(`✅ Created user document for ${user.email}`);
        } catch (error) {
            console.error(`❌ Error creating user ${user.email}:`, error);
        }
    }

    console.log('\n✅ All user documents created successfully!');
    console.log('\nYou can now log in with any of these users.');
    process.exit(0);
}

createUserDocuments();
