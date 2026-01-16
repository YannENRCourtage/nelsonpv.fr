/**
 * Script de synchronisation des étapes ODOO vers Firestore (Client SDK)
 * 
 * Ce script met à jour le champ 'odooStage' de chaque projet dans Firestore
 * en utilisant le SDK client Firebase.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAtgH-I5UyB-A23B9MwHoiW06q8Mzu3FQM",
    authDomain: "nelsonpv-4722c.firebaseapp.com",
    projectId: "nelsonpv-4722c",
    storageBucket: "nelsonpv-4722c.firebasestorage.app",
    messagingSenderId: "845980346264",
    appId: "1:845980346264:web:68be82f07a359daf422ded"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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

    // Attendre que l'utilisateur soit connecté
    console.log('⏳ En attente de l\'authentification...');
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Vous devez être connecté pour exécuter ce script. Utilisez le navigateur à la place.');
    }

    console.log(`✅ Connecté en tant que: ${user.email}\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [projectId, stageName] of Object.entries(projectStageMapping)) {
        try {
            const projectRef = doc(db, 'projects', projectId);

            // Vérifier si le projet existe
            const projectDoc = await getDoc(projectRef);
            if (!projectDoc.exists()) {
                console.log(`⚠️  Projet ${projectId} introuvable dans Firestore`);
                errorCount++;
                errors.push({ projectId, error: 'Project not found' });
                continue;
            }

            // Mettre à jour l'étape
            await updateDoc(projectRef, {
                odooStage: stageName
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

// NOTE: Ce script ne peut pas être exécuté directement en Node.js
// car l'authentification Firebase nécessite un navigateur.
// 
// Pour l'utiliser:
// 1. Ouvrez la console du navigateur (F12) sur https://www.nelsonpv.fr
// 2. Copiez-collez ce code
// 3. Appelez syncOdooStages()

if (typeof window !== 'undefined') {
    // Exporter pour utilisation dans le navigateur
    window.syncOdooStages = syncOdooStages;
    console.log('✅ Script chargé. Appelez window.syncOdooStages() pour lancer la synchronisation.');
} else {
    console.error('❌ Ce script doit être exécuté dans un navigateur, pas en Node.js.');
    console.log('📌 Instructions:');
    console.log('   1. Ouvrez https://www.nelsonpv.fr dans votre navigateur');
    console.log('   2. Connectez-vous avec votre compte');
    console.log('   3. Ouvrez la console (F12)');
    console.log('   4. Copiez-collez le contenu de ce fichier');
    console.log('   5. Appelez: syncOdooStages()');
}

export { syncOdooStages };
