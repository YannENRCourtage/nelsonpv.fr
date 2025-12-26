/**
 * Update user profiles with first names
 * This script adds the firstName field to existing user profiles
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDQH3LtVBW_KxHQwkTHR-Rj5g88EZpbA_4",
    authDomain: "nelson-pv.firebaseapp.com",
    projectId: "nelson-pv",
    storageBucket: "nelson-pv.firebasestorage.app",
    messagingSenderId: "829046405250",
    appId: "1:829046405250:web:b3e3d3f3e3e3e3e3e3e3e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// User UID to first name mapping (retrieved from Firebase Console)
const userUpdates = {
    '0g3HTVN7p5O8Xfs7CopdrlkdNI13': { email: 'n.bachevalier@enr-courtage.fr', firstName: 'Nicolas' },
    '3jpycHcRJqegefS6SBF2KFtJ8wj1': { email: 'jack.luc@icloud.com', firstName: 'Jack' },
    'FZIPvq1MXYazLSNBPIhMn68wVyv1': { email: 'y.barberis@enr-courtage.fr', firstName: 'Yann' },
    'T83pznBTQcVOj1lR7LZiV8JYs9p1': { email: 'contact@enr-courtage.fr', firstName: 'Contact' }
};


async function updateUserNames() {
    console.log('Starting user name updates...\n');

    for (const [uid, userData] of Object.entries(userUpdates)) {
        try {
            const userRef = doc(db, 'users', uid);

            // Check if user exists first
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                console.log(`⚠️  User ${userData.email} not found in Firestore, skipping...`);
                continue;
            }

            // Update the user with firstName
            await updateDoc(userRef, {
                firstName: userData.firstName
            });

            console.log(`✅ Updated ${userData.email} → firstName: "${userData.firstName}"`);

        } catch (error) {
            console.error(`❌ Error updating ${userData.email}:`, error.message);
        }
    }

    console.log('\n🎉 User name update process completed successfully!');
    process.exit(0);
}

updateUserNames();
