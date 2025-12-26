const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function cleanupElodieAccount() {
    const targetEmail = 'elodievinet17@gmail.com';

    console.log('=== NETTOYAGE COMPTE ELODIE ===\n');
    console.log(`Email cible: ${targetEmail}\n`);

    try {
        // 1. Supprimer de Firebase Auth
        console.log('1. Recherche dans Firebase Auth...');
        try {
            const userRecord = await auth.getUserByEmail(targetEmail);
            console.log(`✅ Compte trouvé avec UID: ${userRecord.uid}`);

            console.log('   Suppression de Firebase Auth...');
            await auth.deleteUser(userRecord.uid);
            console.log('   ✅ Supprimé de Firebase Auth');

            // Aussi supprimer le document Firestore correspondant
            const firestoreDocId = userRecord.uid;
            console.log(`\n2. Suppression du document Firestore (UID: ${firestoreDocId})...`);
            await db.collection('users').doc(firestoreDocId).delete();
            console.log('   ✅ Supprimé de Firestore');

        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('   ℹ️  Aucun compte trouvé dans Firebase Auth');
            } else {
                throw error;
            }
        }

        // 3. Rechercher et supprimer tout document Firestore avec cet email
        console.log('\n3. Recherche de documents Firestore orphelins...');
        const snapshot = await db.collection('users')
            .where('email', '==', targetEmail)
            .get();

        if (snapshot.empty) {
            console.log('   ℹ️  Aucun document Firestore trouvé');
        } else {
            console.log(`   ✅ Trouvé ${snapshot.size} document(s)`);
            for (const doc of snapshot.docs) {
                console.log(`   Suppression du document: ${doc.id}`);
                await doc.ref.delete();
                console.log('   ✅ Supprimé');
            }
        }

        // 4. Vérifier aussi l'ancien UID incorrect s'il existe
        console.log('\n4. Vérification de l\'ancien UID incorrect (dDQCOfuf6OcQ8WzeojrPezLlkHe2)...');
        const oldUid = 'dDQCOfuf6OcQ8WzeojrPezLlkHe2';
        const oldDoc = await db.collection('users').doc(oldUid).get();

        if (oldDoc.exists) {
            const oldData = oldDoc.data();
            if (oldData.email === targetEmail) {
                console.log('   ✅ Document trouvé avec ancien UID');
                await db.collection('users').doc(oldUid).delete();
                console.log('   ✅ Supprimé');
            } else {
                console.log(`   ℹ️  Document existe mais email différent: ${oldData.email}`);
            }
        } else {
            console.log('   ℹ️  Aucun document avec cet ancien UID');
        }

        console.log('\n=== NETTOYAGE TERMINÉ ===');
        console.log('\n✅ Tous les comptes liés à elodievinet17@gmail.com ont été supprimés.');
        console.log('Vous pouvez maintenant créer un nouveau compte avec cet email.');

    } catch (error) {
        console.error('\n❌ Erreur lors du nettoyage:', error);
    }

    process.exit(0);
}

cleanupElodieAccount();
