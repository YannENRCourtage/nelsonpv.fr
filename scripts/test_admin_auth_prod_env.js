import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env.vercel.production');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');

let privateKey = "";
let clientEmail = "";
let projectId = "";

for (const line of lines) {
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
        privateKey = line.substring('FIREBASE_PRIVATE_KEY='.length);
    }
    if (line.startsWith('FIREBASE_CLIENT_EMAIL=')) {
        clientEmail = line.substring('FIREBASE_CLIENT_EMAIL='.length);
    }
    if (line.startsWith('FIREBASE_PROJECT_ID=')) {
        projectId = line.substring('FIREBASE_PROJECT_ID='.length);
    }
}

// Clean
privateKey = privateKey.replace(/"/g, '').replace(/\\n/g, '\n').trim();
clientEmail = clientEmail.replace(/"/g, '').trim();
projectId = projectId.replace(/"/g, '').trim();

async function test() {
    try {
        console.log("Initializing with PROD ENV key...");
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
        const auth = admin.auth();
        const user = await auth.getUserByEmail('y.barberis@enr-courtage.fr');
        console.log("SUCCESS! UID:", user.uid);
        
        console.log("\nUpdating passwords...");
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
        
        process.exit(0);
    } catch (e) {
        console.error("FAILED:", e.message);
        process.exit(1);
    }
}
test();
