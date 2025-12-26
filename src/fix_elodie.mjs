
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config/firebase.js';

const createElodie = async () => {
    const uid = 'KQycB1kHBKhMsL7N3qcvNiMaXh62'; // UID fourni par l'utilisateur
    try {
        await setDoc(doc(db, 'users', uid), {
            email: 'elodievinet17@gmail.com',
            firstName: 'Elodie',
            lastName: 'VINET',
            displayName: 'Elodie',
            role: 'user',
            permissions: {
                canAccessCRM: true,
                canAccessEditor: true,
                canAccessSimulator: true,
                canViewAllProjects: false
            },
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log("SUCCÈS: Profil Elodie créé avec succès !");
        process.exit(0);
    } catch (error) {
        console.error("ERREUR: Impossible de créer le profil", error);
        process.exit(1);
    }
};

createElodie();
