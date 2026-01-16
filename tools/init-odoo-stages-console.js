/**
 * Script d'initialisation des étapes ODOO dans Firestore
 * 
 * INSTRUCTIONS :
 * 1. Ouvrez https://www.nelsonpv.fr dans votre navigateur
 * 2. Assurez-vous d'être connecté avec votre compte
 * 3. Ouvrez la console du navigateur (F12)
 * 4. Copiez-collez tout ce script et appuyez sur Entrée
 */

(async function initOdooStages() {
    console.log('🔄 Initialisation des étapes ODOO...');

    try {
        // Charger les modules Firebase depuis CDN
        const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore();

        // Liste des étapes avec "Montage Administratif" en premier
        const stages = [
            "Montage Administratif",
            "Réaliser la DP/PC",
            "Récupérer l'ARE",
            "Récupérer l'accord ou refus Mairie",
            "Déposer la demande sur le portail ENEDIS",
            "Récupérer l'accord ou refus ENEDIS",
            "Mandater l'huissier",
            "Mandater le Géomètre",
            "Mandater le Notaire"
        ];

        // Créer le document dans Firestore
        const odooStagesRef = doc(db, 'config', 'odooStages');
        await setDoc(odooStagesRef, {
            stages: stages,
            updatedAt: new Date()
        });

        console.log('✅ Étapes ODOO initialisées avec succès !');
        console.log('📋 Étapes configurées:', stages);
        console.log('🔄 Rechargez la page ODOO pour voir les changements');

        return { success: true, stages };

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        return { success: false, error: error.message };
    }
})();
