// Firebase Authentication Service
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '@/config/firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data with permissions
 */
export const signIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            throw new Error('User data not found');
        }

        const userData = userDoc.data();

        // Check if user is active
        if (!userData.isActive) {
            await firebaseSignOut(auth);
            throw new Error('Account is deactivated');
        }

        return {
            uid: user.uid,
            email: user.email,
            ...userData
        };
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} Current user or null
 */
export const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        resolve({
                            uid: user.uid,
                            email: user.email,
                            ...userDoc.data()
                        });
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            } else {
                resolve(null);
            }
        }, reject);
    });
};

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function with user data
 * @returns {Function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    callback({
                        uid: user.uid,
                        email: user.email,
                        ...userDoc.data()
                    });
                } else {
                    callback(null);
                }
            } catch (error) {
                console.error('Error fetching user data from Firestore:', error);
                console.error('User UID:', user.uid);
                if (error.code === 'permission-denied') {
                    console.error('PERMISSION DENIED: Check firestore.rules for /users collection.');
                }
                // Return basic auth user as fallback, but warn
                callback({
                    uid: user.uid,
                    email: user.email,
                    isFallback: true // Flag to indicate missing profile
                });
            }
        } else {
            callback(null);
        }
    });
};

/**
 * Create new user (Admin only)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (email, password, userData) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        const userDocData = {
            email: user.email,
            displayName: userData.displayName || email.split('@')[0],
            role: userData.role || 'user',
            permissions: userData.permissions || {
                canAccessCRM: false,
                canAccessEditor: false,
                canAccessSimulator: false,
                canViewAllProjects: false
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };

        await setDoc(doc(db, 'users', user.uid), userDocData);

        return {
            uid: user.uid,
            ...userDocData
        };
    } catch (error) {
        console.error('Create user error:', error);
        throw error;
    }
};

/**
 * Send password reset email
 * @param {string} email
 */
export const sendResetPasswordEmail = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error('Send reset password email error:', error);
        throw error;
    }
};
