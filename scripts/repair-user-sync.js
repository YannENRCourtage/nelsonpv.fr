// Script de réparation pour synchroniser Firebase Auth avec Firestore
// Ce script crée les documents Firestore manquants pour les utilisateurs qui existent dans Auth

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialiser Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const firestore = admin.firestore();

async function syncUsers() {
    console.log('🔄 Début de la synchronisation des utilisateurs...\n');

    try {
        // Récupérer tous les utilisateurs de Firebase Auth
        const listUsersResult = await auth.listUsers();
        const authUsers = listUsersResult.users;

        console.log(`📋 ${authUsers.length} utilisateurs trouvés dans Firebase Auth\n`);

        let syncedCount = 0;
        let createdCount = 0;
        let errorCount = 0;

        for (const authUser of authUsers) {
            try {
                const uid = authUser.uid;
                const email = authUser.email;

                // Vérifier si le document Firestore existe
                const userDocRef = firestore.collection('users').doc(uid);
                const userDoc = await userDocRef.get();

                if (!userDoc.exists) {
                    console.log(`❌ Utilisateur manquant dans Firestore: ${email} (${uid})`);

                    // Créer le document Firestore
                    const userData = {
                        email: email,
                        displayName: authUser.displayName || email.split('@')[0],
                        firstName: authUser.displayName?.split(' ')[0] || '',
                        lastName: authUser.displayName?.split(' ').slice(1).join(' ') || '',
                        role: 'user', // Par défaut
                        permissions: {
                            canAccessCRM: true,
                            canAccessEditor: true,
                            canAccessSimulator: true,
                            canViewAllProjects: false
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    await userDocRef.set(userData);
                    console.log(`✅ Document Firestore créé pour: ${email}\n`);
                    createdCount++;
                } else {
                    console.log(`✓ Document Firestore existe déjà pour: ${email}`);
                    syncedCount++;
                }
            } catch (error) {
                console.error(`❌ Erreur pour l'utilisateur ${authUser.email}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSUMÉ DE LA SYNCHRONISATION');
        console.log('='.repeat(60));
        console.log(`Total utilisateurs Auth    : ${authUsers.length}`);
        console.log(`Déjà synchronisés          : ${syncedCount}`);
        console.log(`Nouveaux documents créés   : ${createdCount}`);
        console.log(`Erreurs                    : ${errorCount}`);
        console.log('='.repeat(60) + '\n');

        if (createdCount > 0) {
            console.log('✅ Synchronisation terminée avec succès!');
            console.log('💡 Les utilisateurs manquants devraient maintenant apparaître dans la page Admin.\n');
        } else {
            console.log('ℹ️  Tous les utilisateurs étaient déjà synchronisés.\n');
        }

    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Exécuter le script
syncUsers();
