import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Config from src/config/firebase.js
const firebaseConfig = {
    apiKey: "AIzaSyAtgH-I5UyB-A23B9MwHoiW06q8Mzu3FQM",
    authDomain: "nelsonpv-4722c.firebaseapp.com",
    projectId: "nelsonpv-4722c",
    storageBucket: "nelsonpv-4722c.firebasestorage.app",
    messagingSenderId: "845980346264",
    appId: "1:845980346264:web:68be82f07a359daf422ded"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userData = {
    email: "ndesaint@eternasol.com",
    password: "NicolasNMD",
    firstName: "Nicolas",
    lastName: "DESAINT",
    displayName: "Nicolas D",
    role: "user",
    permissions: {
        canAccessCRM: true,
        canAccessEditor: true,
        canAccessSimulator: true,
        canAccessConfigurator: true,
        canAccessOdoo: true,
        canAccessCDP: true,
        canViewAllProjects: true
    }
};

async function createUser() {
    let user;
    try {
        console.log(`Attempting to create user ${userData.email}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        user = userCredential.user;
        console.log("Auth User created:", user.uid);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("User already exists in Auth. Signing in to retrieve UID...");
            try {
                const userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
                user = userCredential.user;
                console.log("Signed in successfully. UID:", user.uid);
            } catch (signInError) {
                console.error("Could not sign in with provided password:", signInError.message);
                process.exit(1);
            }
        } else {
            console.error("Error creating user:", error);
            process.exit(1);
        }
    }

    if (user) {
        console.log("============================================");
        console.log("USER UID:", user.uid);
        console.log("============================================");

        try {
            console.log(`Writing Firestore profile for UID: ${user.uid}...`);
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                displayName: userData.displayName,
                role: userData.role,
                permissions: userData.permissions,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log("Firestore document created/updated successfully.");
        } catch (dbError) {
            console.error("Error writing to Firestore (expected if not admin):", dbError.code);
            console.log("\n\n");
            console.log("FINAL UID REPORT:");
            console.log("--------------------------------------------");
            console.log("UID:", user.uid);
            console.log("--------------------------------------------");
            console.log("\nPlease use the 'Lier UID Existant' feature in Admin page with the UID above.\n");
        }
        setTimeout(() => process.exit(0), 1000);
    }
}

createUser();
