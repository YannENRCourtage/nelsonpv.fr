const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function updateElodieEmail() {
    const uid = 'QNg7i9NGrSTEmhcHgYyM0qQgTQ12';
    const oldEmail = 'elodievinet17@gmail.com';
    const newEmail = 'y.barberis@enr-courtage.fr';

    console.log('=== Modification Email Compte Elodie ===\n');
    console.log(`UID: ${uid}`);
    console.log(`Ancien email: ${oldEmail}`);
    console.log(`Nouvel email: ${newEmail}\n`);

    try {
        // 1. Vérifier que le compte existe
        console.log('1. Vérification du compte...');
        const userRecord = await auth.getUser(uid);
        console.log(`✅ Compte trouvé: ${userRecord.email}`);

        // 2. Mettre à jour l'email dans Firebase Auth
        console.log('\n2. Mise à jour de l\'email dans Firebase Auth...');
        await auth.updateUser(uid, {
            email: newEmail,
            emailVerified: true // Marquer comme vérifié pour éviter les problèmes
        });
        console.log('✅ Email mis à jour dans Firebase Auth');

        // 3. Mettre à jour l'email dans Firestore
        console.log('\n3. Mise à jour de l\'email dans Firestore...');
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists) {
            await db.collection('users').doc(uid).update({
                email: newEmail,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Email mis à jour dans Firestore');
        } else {
            console.log('⚠️  Document Firestore non trouvé (peut-être déjà à jour)');
        }

        // 4. Générer le lien de réinitialisation
        console.log('\n4. Génération du lien de réinitialisation...');
        const resetLink = await auth.generatePasswordResetLink(newEmail, {
            url: 'https://www.nelsonpv.fr/login'
        });
        console.log('✅ Lien de réinitialisation généré:\n');
        console.log(resetLink);
        console.log('\n📧 Envoyez ce lien à:', newEmail);
        console.log('\n=== Opération terminée avec succès ===');

    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        if (error.code === 'auth/email-already-exists') {
            console.error('\n⚠️  L\'email', newEmail, 'est déjà utilisé par un autre compte.');
            console.error('Vérifiez qu\'aucun autre utilisateur n\'utilise cet email.');
        }
    }

    process.exit(0);
}

updateElodieEmail();
