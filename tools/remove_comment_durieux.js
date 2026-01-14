
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

// Config from existing tools/create_nicolas_user.js
const firebaseConfig = {
    apiKey: "AIzaSyAtgH-I5UyB-A23B9MwHoiW06q8Mzu3FQM",
    authDomain: "nelsonpv-4722c.firebaseapp.com",
    projectId: "nelsonpv-4722c",
    storageBucket: "nelsonpv-4722c.firebasestorage.app",
    messagingSenderId: "845980346264",
    appId: "1:845980346264:web:68be82f07a359daf422ded"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeComment() {
    console.log("Searching for project DURIEUX PEYROU...");

    // Search for project by checking various name fields
    const projectsRef = collection(db, "projects");
    // We'll just get all and filter in memory to be safe as names can vary
    const snapshot = await getDocs(projectsRef);

    let targetProject = null;
    snapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.name || "").toUpperCase();
        const client = (data.clientName || "").toUpperCase();

        if (name.includes("DURIEUX") || client.includes("DURIEUX")) {
            console.log(`Found candidate: ${data.name} (${doc.id})`);
            targetProject = { id: doc.id, ...data };
        }
    });

    if (!targetProject) {
        console.error("Project DURIEUX PEYROU not found.");
        process.exit(1);
    }

    if (!targetProject.odooChat || !Array.isArray(targetProject.odooChat)) {
        console.log("No chat history found for this project.");
        process.exit(0);
    }

    console.log(`Checking ${targetProject.odooChat.length} messages...`);

    // Find and remove the "Je suis nul" message
    const originalLength = targetProject.odooChat.length;
    const updatedChat = targetProject.odooChat.filter(msg => {
        const content = (msg.content || "").toLowerCase();
        // Check for specific content or variations
        if (content.includes("je suis nul")) {
            console.log("Found message to remove:", msg);
            return false; // Remove
        }
        return true;
    });

    if (updatedChat.length === originalLength) {
        console.log("Message 'Je suis nul' not found.");
    } else {
        console.log("Removing message...");
        try {
            await updateDoc(doc(db, "projects", targetProject.id), {
                odooChat: updatedChat
            });
            console.log("Successfully removed message.");
        } catch (error) {
            console.error("Error updating document:", error);
            // Note: This might fail if strict rules require auth, but 'create_nicolas_user.js' suggested rules might prevent it.
            // If it fails, I'll log it.
        }
    }

    setTimeout(() => process.exit(0), 1000);
}

removeComment();
