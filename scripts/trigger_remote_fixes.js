import axios from 'axios';

async function trigger() {
    try {
        console.log("Triggering Sync Contacts...");
        const syncRes = await axios.get('https://www.nelsonpv.fr/api/sync-contacts');
        console.log("Sync Result:", syncRes.data);

        console.log("\nTriggering Force Password Update...");
        const passRes = await axios.get('https://www.nelsonpv.fr/api/force-update-passwords');
        console.log("Password Fix Result:", passRes.data);

        process.exit(0);
    } catch (e) {
        console.error("Trigger failed:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        }
        process.exit(1);
    }
}
trigger();
