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
                body = body.replace(/[^A-Za-z0-9+/=]/g, '');
                // Wrap to 64 chars for safety (some parsers require it)
                const wrappedBody = body.match(/.{1,64}/g).join('\n');
                privateKey = `${header}\n${wrappedBody}\n${footer}`;
            }
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });

        const db = admin.firestore();
        const tenants = ['green-invest', 'acama', 'enr-courtage-energie'];

        console.log("Starting deep sync for contacts details...");

        for (const tenantId of tenants) {
            console.log(`\n--- Processing tenant: ${tenantId} ---`);
            
            const projectsSnapshot = await db.collection('projects').where('tenantId', '==', tenantId).get();
            const contactsSnapshot = await db.collection('contacts').where('tenantId', '==', tenantId).get();
            
            const projects = [];
            projectsSnapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
            
            const contacts = [];
            contactsSnapshot.forEach(doc => contacts.push({ id: doc.id, ...doc.data() }));

            console.log(`Found ${projects.length} projects and ${contacts.length} contacts.`);

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

                // Find matching contact
                let contact = null;
                if (email && email !== '-') {
                    contact = contacts.find(c => c.email && c.email.toLowerCase() === email);
                }
                if (!contact) {
                    contact = contacts.find(c => c.name && c.name.toLowerCase() === fullName.toLowerCase());
                }

                if (contact) {
                    // Check if we need to update
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
            console.log(`Updated ${updatedCount} contacts for ${tenantId}.`);
        }

        console.log("\nSync completed successfully!");
        process.exit(0);

    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

run();
