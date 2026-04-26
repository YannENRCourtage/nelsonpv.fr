import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function run() {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
        let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@nelsonpv-4722c.iam.gserviceaccount.com";
        let projectId = process.env.FIREBASE_PROJECT_ID || "nelsonpv-4722c";

        if (privateKey) {
            privateKey = privateKey.replace(/"/g, '').replace(/\\n/g, '\n');
            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";
            if (privateKey.includes(header) && privateKey.includes(footer)) {
                let body = privateKey.split(header)[1].split(footer)[0];
                body = body.replace(/ /g, '');
                privateKey = `${header}${body}${footer}`;
            }
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });

        const auth = admin.auth();
        const db = admin.firestore();

        console.log("--- UPDATING PASSWORDS ---");
        
        const usersToUpdate = [
            { email: 'a.mihaiov@acama-energies.fr', password: '#zPVEl@58ZqV9qZc' },
            { email: 'christophe.poisson@acama.fr', password: 'IHGS8PC8QK4Mq?TL' }
        ];

        for (const u of usersToUpdate) {
            try {
                const userRecord = await auth.getUserByEmail(u.email);
                await auth.updateUser(userRecord.uid, { password: u.password });
                console.log(`Successfully updated password for ${u.email}`);
            } catch (err) {
                console.error(`Failed to update password for ${u.email}:`, err.message);
            }
        }

        console.log("\n--- RUNNING CONTACT MIGRATION ---");
        const tenantId = 'enr-courtage-energie';
        
        const projectsSnapshot = await db.collection('projects').where('tenantId', '==', tenantId).get();
        const existingContactsSnapshot = await db.collection('contacts').where('tenantId', '==', tenantId).get();
        
        const projects = [];
        projectsSnapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
        
        const contacts = [];
        existingContactsSnapshot.forEach(doc => contacts.push({ id: doc.id, ...doc.data() }));

        let created = 0;
        let updated = 0;

        for (const project of projects) {
            const firstName = (project.firstName || '').trim();
            const lastName = (project.name || '').trim();
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            
            if (!fullName || fullName === 'Client sans nom') continue;

            const email = (project.email || '').trim().toLowerCase();
            const city = (project.city || '').trim();

            let existing = null;
            if (email && email !== '-') {
                existing = contacts.find(c => c.email && c.email.toLowerCase() === email);
            }
            if (!existing) {
                existing = contacts.find(c => c.name && c.name.toLowerCase() === fullName.toLowerCase());
            }

            const contactData = {
                name: fullName,
                email: email || null,
                phone: project.phone || null,
                city: city || null,
                address: project.address || null,
                zipCode: project.zip || null,
                status: project.status || 'Nouveau',
                tenantId: tenantId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (existing) {
                await db.collection('contacts').doc(existing.id).update(contactData);
                updated++;
            } else {
                const newRef = db.collection('contacts').doc();
                await newRef.set({
                    ...contactData,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: 'migration-script'
                });
                contacts.push({ id: newRef.id, ...contactData });
                created++;
            }
        }

        console.log(`Migration finished: ${created} created, ${updated} updated.`);
        process.exit(0);

    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

run();
