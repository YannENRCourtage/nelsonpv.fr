import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getAdminAuth } from '../src/lib/firebase-admin.js';

async function test() {
    try {
        const auth = getAdminAuth();
        const user = await auth.getUserByEmail('y.barberis@enr-courtage.fr');
        console.log("Success! Found user:", user.uid);
        process.exit(0);
    } catch (e) {
        console.error("FAILED:", e.message);
        if (e.errorInfo) console.error(JSON.stringify(e.errorInfo, null, 2));
        process.exit(1);
    }
}
test();
