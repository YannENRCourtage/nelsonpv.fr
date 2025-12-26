const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function checkElodieAccount() {
    const email = 'elodievinet17@gmail.com';
    const uid = 'dDQCOfuf6OcQ8WzeojrPezLlkHe2';

    console.log('=== Vérification du compte Elodie ===\n');

    try {
        // Vérifier Firebase Auth
        console.log('1. Vérification Firebase Auth...');
        try {
            const userRecord = await auth.getUser(uid);
            console.log('✅ Compte trouvé dans Firebase Auth:');
            console.log('   - UID:', userRecord.uid);
            console.log('   - Email:', userRecord.email);
            console.log('   - Email vérifié:', userRecord.emailVerified);
            console.log('   - Désactivé:', userRecord.disabled);
            console.log('   - Création:', new Date(userRecord.metadata.creationTime));
            console.log('   - Dernière connexion:', userRecord.metadata.lastSignInTime || 'Jamais');
        } catch (error) {
            console.log('❌ Compte NON trouvé dans Firebase Auth');
            console.log('   Erreur:', error.message);
        }

        console.log('\n2. Vérification Firestore...');
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                console.log('✅ Document trouvé dans Firestore:');
                console.log('   Données:', JSON.stringify(userDoc.data(), null, 2));
            } else {
                console.log('❌ Document NON trouvé dans Firestore');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la lecture Firestore:', error.message);
        }

        console.log('\n3. Recherche par email...');
        try {
            const userByEmail = await auth.getUserByEmail(email);
            console.log('✅ Compte trouvé par email:');
            console.log('   - UID:', userByEmail.uid);
            if (userByEmail.uid !== uid) {
                console.log('   ⚠️  ATTENTION: UID différent de celui attendu!');
                console.log('   - Attendu:', uid);
                console.log('   - Trouvé:', userByEmail.uid);
            }
        } catch (error) {
            console.log('❌ Aucun compte trouvé avec cet email');
            console.log('   Erreur:', error.message);
        }

    } catch (error) {
        console.error('Erreur générale:', error);
    }

    process.exit(0);
}

checkElodieAccount();
