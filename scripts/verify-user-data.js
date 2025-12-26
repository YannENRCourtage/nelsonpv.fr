
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAtgH-I5UyB-A23B9MwHoiW06q8Mzu3FQM",
    authDomain: "nelsonpv-4722c.firebaseapp.com",
    projectId: "nelsonpv-4722c",
    storageBucket: "nelsonpv-4722c.firebasestorage.app",
    messagingSenderId: "144160888970",
    appId: "1:144160888970:web:934989664da6c06a37820a",
    measurementId: "G-D9L026909T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyUser() {
    const email = 'n.bachevalier@enr-courtage.fr';
    console.log(`Verifying user data for ${email}...`);

    try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('No user found with this email.');
        } else {
            querySnapshot.forEach((doc) => {
                console.log(`User found: ${doc.id}`);
                console.log('Data:', JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (error) {
        console.error('Error verifying user:', error);
    }
    process.exit(0);
}

verifyUser();
