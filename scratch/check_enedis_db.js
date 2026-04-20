import { adminDb } from '../src/lib/firebase-admin.js';

async function checkConsent() {
    const prm = '16138350177475';
    console.log(`Checking consent for PRM: ${prm}`);
    
    const snapshot = await adminDb.collection('enedis_consents').where('prm', '==', prm).get();
    if (snapshot.empty) {
        console.log('No consent found for this PRM.');
        
        // Also check by project ID if we can find it
        // The project ID from the URL was 5OuiPtWfW12LvgUYXczu
        const projectId = '5OuiPtWfW12LvgUYXczu';
        const doc = await adminDb.collection('enedis_consents').doc(projectId).get();
        if (doc.exists) {
            console.log(`Consent found for project ${projectId}:`, doc.data());
        } else {
            console.log(`No consent found for project ${projectId}.`);
        }
    } else {
        snapshot.forEach(doc => {
            console.log(`Consent found in doc ${doc.id}:`, doc.data());
        });
    }
}

checkConsent().catch(console.error);
