const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function fixAdminAccount() {
    const adminEmail = 'y.barberis@enr-courtage.fr';

    console.log('=== RÉPARATION COMPTE ADMINISTRATEUR ===\n');
    console.log(`Email admin: ${adminEmail}\n`);

    try {
        // 1. Vérifier si le compte existe dans Firebase Auth
        console.log('1. Vérification Firebase Auth...');
        let adminAuth;
        try {
            adminAuth = await auth.getUserByEmail(adminEmail);
            console.log(`✅ Compte trouvé:`);
            console.log(`   UID: ${adminAuth.uid}`);
            console.log(`   Email: ${adminAuth.email}`);
            console.log(`   Email vérifié: ${adminAuth.emailVerified}`);
            console.log(`   Désactivé: ${adminAuth.disabled}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('❌ Compte NON trouvé dans Firebase Auth');
                console.log('\nCréation d\'un nouveau compte admin...');

                adminAuth = await auth.createUser({
                    email: adminEmail,
                    emailVerified: true,
                    password: 'Admin123!', // Mot de passe temporaire - À CHANGER
                    disabled: false
                });

                console.log(`✅ Compte créé avec UID: ${adminAuth.uid}`);
                console.log('⚠️  Mot de passe temporaire: Admin123!');
                console.log('   CHANGEZ-LE IMMÉDIATEMENT après connexion!');
            } else {
                throw error;
            }
        }

        // 2. Vérifier le document Firestore
        console.log('\n2. Vérification Firestore...');
        const adminDoc = await db.collection('users').doc(adminAuth.uid).get();

        if (!adminDoc.exists) {
            console.log('❌ Document Firestore manquant - CECI CAUSE L\'ERREUR DE CONNEXION');
            console.log('\nCréation du document Firestore...');

            await db.collection('users').doc(adminAuth.uid).set({
                uid: adminAuth.uid,
                email: adminEmail,
                firstName: 'Yann',
                lastName: 'Barberis',
                role: 'admin',
                permissions: {
                    canAccessSimulator: true,
                    canAccessCRM: true,
                    canAccessAdmin: true,
                    canAccessEditor: true
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Document Firestore créé avec rôle admin');
        } else {
            const data = adminDoc.data();
            console.log(`✅ Document trouvé:`);
            console.log(`   Rôle: ${data.role}`);
            console.log(`   Nom: ${data.firstName} ${data.lastName || ''}`);

            // Vérifier que le rôle est bien admin
            if (data.role !== 'admin') {
                console.log('\n⚠️  Rôle incorrect détecté - Mise à jour...');
                await db.collection('users').doc(adminAuth.uid).update({
                    role: 'admin',
                    permissions: {
                        canAccessSimulator: true,
                        canAccessCRM: true,
                        canAccessAdmin: true,
                        canAccessEditor: true
                    },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Rôle mis à jour vers admin');
            }
        }

        // 3. Générer un lien de réinitialisation de mot de passe
        console.log('\n3. Génération d\'un lien de réinitialisation...');
        const resetLink = await auth.generatePasswordResetLink(adminEmail, {
            url: 'https://www.nelsonpv.fr/login'
        });

        console.log('✅ Lien généré:\n');
        console.log(resetLink);
        console.log(`\n📧 Envoyez ce lien à: ${adminEmail}`);

        console.log('\n=== RÉPARATION TERMINÉE ===');
        console.log('\nVous pouvez maintenant:');
        console.log('1. Utiliser le lien ci-dessus pour réinitialiser votre mot de passe');
        console.log('2. Ou vous connecter avec le mot de passe temporaire si un nouveau compte a été créé');

    } catch (error) {
        console.error('\n❌ Erreur lors de la réparation:', error);
    }

    process.exit(0);
}

fixAdminAccount();
