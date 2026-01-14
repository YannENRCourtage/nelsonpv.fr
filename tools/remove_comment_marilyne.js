
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

async function removeComment() {
    try {
        console.log("Signing in...");
        await signInWithEmailAndPassword(auth, "ndesaint@eternasol.com", "NicolasNMD");
    } catch (e) {
        console.error("Auth failed:", e.message);
        process.exit(1);
    }

    console.log("Searching for project MARILYNE FLORIAN RODIER VARGAS...");
    const projectsRef = collection(db, "projects");
    const snapshot = await getDocs(projectsRef);

    let targetProject = null;
    snapshot.forEach(doc => {
        const data = doc.data();
        const client = (data.clientName || "").toUpperCase();
        const name = (data.name || "").toUpperCase();

        if (client.includes("RODIER") && client.includes("VARGAS")) {
            console.log(`Found candidate by Client Name: ${data.clientName} (${doc.id})`);
            targetProject = { id: doc.id, ...data };
        } else if (name.includes("RODIER") && name.includes("VARGAS")) {
            console.log(`Found candidate by Project Name: ${data.name} (${doc.id})`);
            targetProject = { id: doc.id, ...data };
        }
    });

    if (!targetProject) {
        console.error("Project not found.");
        process.exit(1);
    }

    if (!targetProject.odooChat || !Array.isArray(targetProject.odooChat)) {
        console.log("No chat history.");
        process.exit(0);
    }

    const originalLength = targetProject.odooChat.length;
    const updatedChat = targetProject.odooChat.filter(msg => {
        if (msg.author === "Yann" && (msg.content || "").trim() === "test") {
            console.log("Removing message:", msg);
            return false;
        }
        return true;
    });

    if (updatedChat.length === originalLength) {
        console.log("Message 'test' by Yann not found.");
    } else {
        await updateDoc(doc(db, "projects", targetProject.id), {
            odooChat: updatedChat
        });
        console.log("Successfully removed 'test' comment.");
    }

    setTimeout(() => process.exit(0), 1000);
}

removeComment();
