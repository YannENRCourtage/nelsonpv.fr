import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from 'fs';

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
const storage = getStorage(app);

const userData = {
    email: "laurent.guyon@barconniere.com",
    password: "LaurentGBARCO",
    firstName: "Laurent",
    lastName: "GUYON",
    displayName: "Laurent GUYON",
    role: "user",
    permissions: {
        canAccessCRM: true,
        canAccessEditor: true,
        canAccessSimulator: false,
        canAccessConfigurator: false,
        canAccessOdoo: true,
        canAccessCDP: false,
        canViewAllProjects: true
    }
};

const AVATAR_PATH = "C:/Users/Utilisateur/.gemini/antigravity/brain/2f2b63e2-1450-493d-9633-aa1d7d7ca683/uploaded_image_1_1768380662123.jpg";

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

        // 1. Upload Avatar
        let photoURL = null;
        try {
            if (fs.existsSync(AVATAR_PATH)) {
                console.log("Uploading avatar...");
                const fileBuffer = fs.readFileSync(AVATAR_PATH);
                // Convert Node Buffer to Uint8Array for Firebase Storage
                const fileBytes = new Uint8Array(fileBuffer);

                const storageRef = ref(storage, `avatars/${user.uid}_avatar.jpg`);
                await uploadBytes(storageRef, fileBytes, { contentType: 'image/jpeg' });
                photoURL = await getDownloadURL(storageRef);
                console.log("Avatar uploaded successfully:", photoURL);

                // Update Auth Profile
                await updateProfile(user, { photoURL: photoURL, displayName: userData.displayName });
                console.log("Auth profile updated with photoURL.");
            } else {
                console.warn("Avatar file not found at:", AVATAR_PATH);
            }
        } catch (err) {
            console.error("Error uploading avatar or updating profile:", err.message);
        }

        // 2. Try Firestore
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
                photoURL: photoURL, // Save to firestore logic too
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
            console.log("Photo URL:", photoURL || "None");
            console.log("--------------------------------------------");
            console.log("\nPlease use the 'Lier UID Existant' feature in Admin page with the UID above.\n");
        }
        setTimeout(() => process.exit(0), 1000);
    }
}

createUser();
