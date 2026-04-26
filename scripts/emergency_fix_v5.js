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
            // Robust cleaning
            privateKey = privateKey.replace(/^["']+/, '').replace(/["']+$/, '');
            privateKey = privateKey.replace(/\\n/g, '\n');
            
            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";
            
            if (privateKey.includes(header) && privateKey.includes(footer)) {
                let body = privateKey.split(header)[1].split(footer)[0];
                body = body.replace(/\s/g, ''); // Remove all whitespace
                // Wrap to 64 chars
                const lines = body.match(/.{1,64}/g);
                privateKey = `${header}\n${lines.join('\n')}\n${footer}`;
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

        console.log("--- EMERGENCY PASSWORD AND CONTACT FIX ---");

        const updates = [
            { email: 'a.mihaiov@acama-energies.fr', password: '#zPVEl@58ZqV9qZc' },
            { email: 'a.mihailov@acama-energies.fr', password: '#zPVEl@58ZqV9qZc' },
            { email: 'christophe.poisson@acama.fr', password: 'IHGS8PC8QK4Mq?TL' }
        ];

        for (const u of updates) {
            try {
                const userRecord = await auth.getUserByEmail(u.email);
                await auth.updateUser(userRecord.uid, { password: u.password });
                console.log(`✅ Success for ${u.email}`);
            } catch (err) {
                console.warn(`❌ Failed for ${u.email}: ${err.message}`);
            }
        }

        console.log("\n--- SYNCING CONTACT DETAILS ---");
        const tenants = ['green-invest', 'acama', 'enr-courtage-energie'];
        for (const tenantId of tenants) {
            const projectsSnapshot = await db.collection('projects').where('tenantId', '==', tenantId).get();
            const contactsSnapshot = await db.collection('contacts').where('tenantId', '==', tenantId).get();
            
            const projects = [];
            projectsSnapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
            
            const contacts = [];
            contactsSnapshot.forEach(doc => contacts.push({ id: doc.id, ...doc.data() }));

            let updated = 0;
            for (const p of projects) {
                const name = [p.firstName, p.name].filter(Boolean).join(' ').trim();
                if (!name || name === 'Client sans nom') continue;
                
                const email = (p.email || '').toLowerCase();
                let contact = contacts.find(c => (c.email && c.email.toLowerCase() === email) || (c.name && c.name.toLowerCase() === name.toLowerCase()));

                if (contact) {
                    const address = (p.address || '').trim();
                    const zip = (p.zip || '').trim();
                    const city = (p.city || '').trim();

                    if ((address && contact.address !== address) || (zip && contact.zipCode !== zip)) {
                        await db.collection('contacts').doc(contact.id).update({
                            address: address || contact.address || null,
                            zipCode: zip || contact.zipCode || null,
                            city: city || contact.city || null,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        updated++;
                    }
                }
            }
            console.log(`Synced ${updated} contacts for ${tenantId}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

run();
