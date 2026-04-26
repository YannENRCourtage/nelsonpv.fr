import axios from 'axios';

async function repair() {
    try {
        console.log("--- STARTING EMERGENCY REPAIR V2 ---");
        const headers = { 'x-emergency-repair': 'TRUE' };

        // 1. Get all users
        console.log("Fetching users list...");
        const usersRes = await axios.get('https://www.nelsonpv.fr/api/users', { headers });
        let users = usersRes.data;
        
        if (typeof users === 'string') {
            try {
                users = JSON.parse(users);
            } catch (e) {
                console.error("Failed to parse users JSON. Length:", users.length);
                // If it starts with <, it's HTML
                if (users.trim().startsWith('<')) {
                    console.error("Response is HTML, probably index.html");
                }
                process.exit(1);
            }
        }

        console.log(`Found ${Array.isArray(users) ? users.length : 'unknown'} users.`);

        const alexandruEmails = ['a.mihaiov@acama-energies.fr', 'a.mihailov@acama-energies.fr'];
        const christopheEmail = 'christophe.poisson@acama.fr';

        const targets = [];
        
        if (Array.isArray(users)) {
            for (const email of alexandruEmails) {
                const u = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (u) {
                    console.log(`Found Alexandru (${email}) with UID: ${u.id}`);
                    targets.push({ uid: u.id, email: email, password: '#zPVEl@58ZqV9qZc' });
                }
            }
            
            const c = users.find(u => u.email && u.email.toLowerCase() === christopheEmail.toLowerCase());
            if (c) {
                console.log(`Found Christophe with UID: ${c.id}`);
                targets.push({ uid: c.id, email: christopheEmail, password: 'IHGS8PC8QK4Mq?TL' });
            }
        }

        if (targets.length === 0) {
            console.error("No target users found!");
        }

        for (const t of targets) {
            console.log(`Updating password for ${t.email} (${t.uid})...`);
            try {
                const res = await axios.post('https://www.nelsonpv.fr/api/admin/change-password', {
                    uid: t.uid,
                    newPassword: t.password
                }, { headers });
                console.log(`✅ Success:`, res.data);
            } catch (err) {
                console.error(`❌ Failed:`, err.response?.data || err.message);
            }
        }

        // Sync contacts
        console.log("\nSyncing contacts...");
        try {
            const syncRes = await axios.get('https://www.nelsonpv.fr/api/sync-contacts', { headers });
            console.log("✅ Result:", syncRes.data);
        } catch (err) {
             console.error("❌ Failed:", err.response?.data || err.message);
        }

        console.log("\n--- REPAIR COMPLETED ---");
        process.exit(0);
    } catch (e) {
        console.error("Repair script failed:", e.message);
        process.exit(1);
    }
}
repair();
