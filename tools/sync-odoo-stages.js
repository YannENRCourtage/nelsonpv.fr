/**
 * Script de synchronisation des étapes ODOO vers Firestore
 * 
 * Ce script met à jour le champ 'odooStage' de chaque projet dans Firestore
 * pour correspondre au classement local de l'utilisateur.
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialiser Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'nelsonpv-4722c'
});

const db = admin.firestore();

// Mapping extrait du localStorage local
const projectStageMapping = {
    // Projets dans "Réaliser la DP/PC"
    '8ffPzf1PRryBk3BXKAep': 'Réaliser la DP/PC', // SAINT ARAILLES
    'Hc2u8dltvNpR0cBNxVx5': 'Réaliser la DP/PC', // CONSOLI
    'NSERwffRToZYj6RLr22m': 'Réaliser la DP/PC', // RODIER VARGAS
    'UgVv6LZzIWde6q6kPuUI': 'Réaliser la DP/PC', // LECONTE
    'ZtH2513MFlfhZlauAq1Q': 'Réaliser la DP/PC', // LECONTE
    'aE53zv9llwCj1ryfJYfL': 'Réaliser la DP/PC', // RECKINGER
    'f3UkS8hIGXcrvcGHTwVA': 'Réaliser la DP/PC', // PARC ANIMALIER D'ECOUVES
    't4KgBog5XrP3vbe8hNUm': 'Réaliser la DP/PC', // MARTINEZ

    // Projets dans "Mandater Huissier"
    'OjZEezDOSWV2OjsHSCwA': 'Mandater l\'huissier', // SOLLE
    'RrOosdNhmyEHbTdLK2qx': 'Mandater l\'huissier', // HERIT
    'w17ZwxBowfkyW0HlW8K9': 'Mandater l\'huissier', // DUHARD

    // Projets dans "Montage Administratif" (colonne personnalisée)
    '2E987s8vaNIlabltQu62': 'Montage Administratif', // DEVEAU
    '5Isa37h4VdlUjWUGvHTq': 'Montage Administratif', // DUCAM
    '9dfrp7pXfm3ge4NvFNDJ': 'Montage Administratif', // PLANTE
    'Jvh8keS09nDnTQPsSQ6l': 'Montage Administratif', // LATOURNERIE
    'Z8AsUAZG6qfxPFgN8I95': 'Montage Administratif', // CASSAGNE
    'jJM3peSookZiqIzqhBYx': 'Montage Administratif', // DURIEUX PEYROU
    'lNzOZN8aResBkKJEM3Gw': 'Montage Administratif', // MISSAULT
    'wcRt8x5YvJ8IvV9qqL8l': 'Montage Administratif', // MISSAULT
    'wzJuAM1jdcG0lFiisNaU': 'Montage Administratif', // MARTIN
};

async function syncOdooStages() {
    console.log('🔄 Début de la synchronisation des étapes ODOO...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [projectId, stageName] of Object.entries(projectStageMapping)) {
        try {
            const projectRef = db.collection('projects').doc(projectId);

            // Vérifier si le projet existe
            const projectDoc = await projectRef.get();
            if (!projectDoc.exists) {
                console.log(`⚠️  Projet ${projectId} introuvable dans Firestore`);
                errorCount++;
                errors.push({ projectId, error: 'Project not found' });
                continue;
            }

            // Mettre à jour l'étape
            await projectRef.update({
                odooStage: stageName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const projectName = projectDoc.data().name || projectId;
            console.log(`✅ ${projectName} → ${stageName}`);
            successCount++;

        } catch (error) {
            console.error(`❌ Erreur pour le projet ${projectId}:`, error.message);
            errorCount++;
            errors.push({ projectId, error: error.message });
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Synchronisation terminée!`);
    console.log(`   Succès: ${successCount}`);
    console.log(`   Erreurs: ${errorCount}`);

    if (errors.length > 0) {
        console.log('\n❌ Détails des erreurs:');
        errors.forEach(({ projectId, error }) => {
            console.log(`   - ${projectId}: ${error}`);
        });
    }

    console.log('='.repeat(60));
}

// Exécuter la synchronisation
syncOdooStages()
    .then(() => {
        console.log('\n✅ Script terminé avec succès');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
