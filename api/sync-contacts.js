import { getAdminDb } from '../src/lib/firebase-admin.js';
import admin from 'firebase-admin';

export default async function handler(req, res) {
    // Temporarily allow GET to trigger via browser
    // if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    try {
        const db = getAdminDb();
        const tenants = ['green-invest', 'acama', 'enr-courtage-energie'];
        const results = {};

        for (const tenantId of tenants) {
            const projectsSnapshot = await db.collection('projects').where('tenantId', '==', tenantId).get();
            const contactsSnapshot = await db.collection('contacts').where('tenantId', '==', tenantId).get();
            
            const projects = [];
            projectsSnapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
            
            const contacts = [];
            contactsSnapshot.forEach(doc => contacts.push({ id: doc.id, ...doc.data() }));

            let updatedCount = 0;

            for (const project of projects) {
                const firstName = (project.firstName || '').trim();
                const lastName = (project.name || '').trim();
                const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
                
                if (!fullName || fullName === 'Client sans nom') continue;

                const email = (project.email || '').trim().toLowerCase();
                const city = (project.city || '').trim();
                const address = (project.address || '').trim();
                const zip = (project.zip || '').trim();

                let contact = null;
                if (email && email !== '-') {
                    contact = contacts.find(c => c.email && c.email.toLowerCase() === email);
                }
                if (!contact) {
                    contact = contacts.find(c => c.name && c.name.toLowerCase() === fullName.toLowerCase());
                }

                if (contact) {
                    const needsUpdate = 
                        (address && contact.address !== address) || 
                        (zip && contact.zipCode !== zip) ||
                        (city && contact.city !== city);

                    if (needsUpdate) {
                        await db.collection('contacts').doc(contact.id).update({
                            address: address || contact.address || null,
                            zipCode: zip || contact.zipCode || null,
                            city: city || contact.city || null,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        updatedCount++;
                    }
                }
            }
            results[tenantId] = updatedCount;
        }

        return res.status(200).json({ 
            success: true, 
            message: "Sync completed",
            details: results
        });

    } catch (error) {
        console.error('Sync failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
