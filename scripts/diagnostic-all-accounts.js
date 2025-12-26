const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function diagnosticAllAccounts() {
    console.log('=== DIAGNOSTIC COMPLET DES COMPTES ===\n');

    try {
        // 1. Lister tous les utilisateurs Firebase Auth
        console.log('1. TOUS LES COMPTES FIREBASE AUTH:\n');
        const listUsersResult = await auth.listUsers();

        console.log(`Total: ${listUsersResult.users.length} comptes\n`);

        listUsersResult.users.forEach((userRecord, index) => {
            console.log(`--- Compte ${index + 1} ---`);
            console.log(`Email: ${userRecord.email}`);
            console.log(`UID: ${userRecord.uid}`);
            console.log(`Créé le: ${userRecord.metadata.creationTime}`);
            console.log(`Dernière connexion: ${userRecord.metadata.lastSignInTime || 'Jamais'}`);
            console.log(`Désactivé: ${userRecord.disabled}`);
            console.log('');
        });

        // 2. Lister tous les documents Firestore users
        console.log('\n2. TOUS LES DOCUMENTS FIRESTORE:\n');
        const usersSnapshot = await db.collection('users').get();

        console.log(`Total: ${usersSnapshot.size} documents\n`);

        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`--- Document ${doc.id} ---`);
            console.log(`Email: ${data.email || 'N/A'}`);
            console.log(`Nom: ${data.firstName} ${data.lastName || ''}`);
            console.log(`Rôle: ${data.role || 'N/A'}`);
            console.log(`UID: ${doc.id}`);
            console.log('');
        });

        // 3. Rechercher spécifiquement elodievinet17@gmail.com
        console.log('\n3. RECHERCHE SPÉCIFIQUE: elodievinet17@gmail.com\n');

        // Dans Auth
        try {
            const elodie Auth = await auth.getUserByEmail('elodievinet17@gmail.com');
            console.log('✅ Trouvé dans Firebase Auth:');
            console.log(`   UID: ${elodieAuth.uid}`);
            console.log(`   Email: ${elodieAuth.email}`);
        } catch (error) {
            console.log('❌ NON trouvé dans Firebase Auth');
        }

        // Dans Firestore (recherche par email)
        const elodieFirestore = await db.collection('users')
            .where('email', '==', 'elodievinet17@gmail.com')
            .get();

        if (!elodieFirestore.empty) {
            console.log('\n✅ Trouvé dans Firestore:');
            elodieFirestore.forEach(doc => {
                console.log(`   Document ID: ${doc.id}`);
                console.log(`   Données: ${JSON.stringify(doc.data(), null, 2)}`);
            });
        } else {
            console.log('\n❌ NON trouvé dans Firestore');
        }

        // 4. Rechercher y.barberis@enr-courtage.fr (compte admin potentiel)
        console.log('\n4. RECHERCHE COMPTE ADMIN: y.barberis@enr-courtage.fr\n');

        try {
            const admin Auth = await auth.getUserByEmail('y.barberis@enr-courtage.fr');
            console.log('✅ Trouvé dans Firebase Auth:');
            console.log(`   UID: ${adminAuth.uid}`);
            console.log(`   Email: ${adminAuth.email}`);
            console.log(`   Email vérifié: ${adminAuth.emailVerified}`);
            console.log(`   Désactivé: ${adminAuth.disabled}`);

            // Vérifier dans Firestore
            const adminDoc = await db.collection('users').doc(adminAuth.uid).get();
            if (adminDoc.exists) {
                const adminData = adminDoc.data();
                console.log('\n✅ Trouvé dans Firestore:');
                console.log(`   Rôle: ${adminData.role}`);
                console.log(`   Permissions: ${JSON.stringify(adminData.permissions, null, 2)}`);
            } else {
                console.log('\n❌ PROBLÈME: Document Firestore manquant pour cet UID!');
                console.log('   Cela explique pourquoi la connexion échoue.');
            }
        } catch (error) {
            console.log('❌ NON trouvé dans Firebase Auth');
            console.log(`   Erreur: ${error.message}`);
        }

        console.log('\n=== FIN DU DIAGNOSTIC ===');

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }

    process.exit(0);
}

diagnosticAllAccounts();
