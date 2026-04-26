import { getAdminAuth } from '../src/lib/firebase-admin.js';

export default async function handler(req, res) {
    // Temporarily allow GET to trigger via browser
    // if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    // WARNING: This is a temporary UNPROTECTED route to fix critical login issues.
    // IT MUST BE DELETED IMMEDIATELY AFTER USE.
    
    // Hardcoded for emergency one-time fix
    const updates = [
        { email: 'a.mihaiov@acama-energies.fr', password: '#zPVEl@58ZqV9qZc' },
        { email: 'a.mihailov@acama-energies.fr', password: '#zPVEl@58ZqV9qZc' },
        { email: 'christophe.poisson@acama.fr', password: 'IHGS8PC8QK4Mq?TL' }
    ];

    try {
        const auth = getAdminAuth();
        const results = [];

        for (const u of updates) {
            try {
                const userRecord = await auth.getUserByEmail(u.email);
                await auth.updateUser(userRecord.uid, { password: u.password });
                results.push({ email: u.email, success: true });
            } catch (err) {
                results.push({ email: u.email, success: false, error: err.message });
            }
        }

        return res.status(200).json({ success: true, results });

    } catch (error) {
        console.error('Force update failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
