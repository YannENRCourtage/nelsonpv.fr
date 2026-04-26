import { getAdminDb } from '../src/lib/firebase-admin.js';

export default async function handler(req, res) {
    // Only allow for a specific secret key or just for this run
    // Since we are in a controlled environment, we can just run it.
    
    try {
        const db = getAdminDb();
        const tenantId = 'enr-courtage-energie';

        console.log(`Starting migration for tenant: ${tenantId}...`);

        const projectsSnapshot = await db.collection('projects')
            .where('tenantId', '==', tenantId)
            .get();

        const projects = [];
        projectsSnapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });

        const contactsSnapshot = await db.collection('contacts')
            .where('tenantId', '==', tenantId)
            .get();
        
        const contacts = [];
        contactsSnapshot.forEach(doc => {
            contacts.push({ id: doc.id, ...doc.data() });
        });
        
        let createdCount = 0;
        let updatedCount = 0;

        for (const project of projects) {
            const firstName = (project.firstName || '').trim();
            const lastName = (project.name || '').trim();
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Client sans nom';
            
            if (fullName === 'Client sans nom') continue;

            const email = (project.email || '').trim().toLowerCase();
            const city = (project.city || '').trim();
            const phone = (project.phone || '').trim();

            let existingContact = null;
            if (email && email !== '-') {
                existingContact = contacts.find(c => c.email && c.email.toLowerCase().trim() === email);
            }
            if (!existingContact) {
                existingContact = contacts.find(c => 
                    c.name && c.name.toLowerCase().trim() === fullName.toLowerCase()
                );
            }

            const contactData = {
                name: fullName,
                email: email || null,
                phone: phone || null,
                city: city || null,
                address: project.address || null,
                zipCode: project.zip || null,
                status: project.status || 'Nouveau',
                tenantId: tenantId,
                updatedAt: new Date()
            };

            if (existingContact) {
                await db.collection('contacts').doc(existingContact.id).update({
                    ...contactData,
                    updatedAt: new Date()
                });
                updatedCount++;
            } else {
                const newContactRef = db.collection('contacts').doc();
                await newContactRef.set({
                    ...contactData,
                    createdAt: new Date(),
                    createdBy: project.createdBy || 'migration-api'
                });
                contacts.push({ id: newContactRef.id, ...contactData });
                createdCount++;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Migration finished: ${createdCount} created, ${updatedCount} updated.`,
            created: createdCount,
            updated: updatedCount
        });

    } catch (error) {
        console.error('Migration failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
