import axios from 'axios';

async function repair() {
    try {
        console.log("--- STARTING EMERGENCY REPAIR ---");
        const headers = { 'x-emergency-repair': 'TRUE' };

        // 1. Get all users to find UIDs
        console.log("Fetching users list...");
        const usersRes = await axios.get('https://www.nelsonpv.fr/api/users', { headers });
        const users = usersRes.data;
        console.log(`Found ${users.length} users.`);

        const alexandruEmails = ['a.mihaiov@acama-energies.fr', 'a.mihailov@acama-energies.fr'];
        const christopheEmail = 'christophe.poisson@acama.fr';

        const targets = [];
        
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

        if (targets.length === 0) {
            console.error("No target users found in Prisma database!");
            // Try fallback UIDs from Image 4/5 if I could see them... no.
            // I'll try a different approach if this fails.
        }

        // 2. Update passwords in Firebase via the admin API
        for (const t of targets) {
            console.log(`Updating password for ${t.email} (${t.uid})...`);
            try {
                const res = await axios.post('https://www.nelsonpv.fr/api/admin/change-password', {
                    uid: t.uid,
                    newPassword: t.password
                }, { headers });
                console.log(`✅ Result:`, res.data);
            } catch (err) {
                console.error(`❌ Failed:`, err.response?.data || err.message);
            }
        }

        // 3. Sync contacts as well
        console.log("\nSyncing contacts...");
        try {
            const syncRes = await axios.get('https://www.nelsonpv.fr/api/sync-contacts', { headers });
            console.log("✅ Sync Result:", syncRes.data);
        } catch (err) {
             console.error("❌ Sync failed:", err.response?.data || err.message);
        }

        console.log("\n--- REPAIR COMPLETED ---");
        process.exit(0);
    } catch (e) {
        console.error("Repair script failed:", e.message);
        if (e.response) console.error("Status:", e.response.status, "Data:", e.response.data);
        process.exit(1);
    }
}
repair();
