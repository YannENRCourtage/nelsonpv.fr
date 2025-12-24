// Firestore Database Service
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';

// ============================================================================
// USERS
// ============================================================================

export const getUser = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    return { id: userDoc.id, ...userDoc.data() };
};

export const updateUser = async (uid, data) => {
    await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const listUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteUser = async (uid) => {
    await deleteDoc(doc(db, 'users', uid));
};

// ============================================================================
// CONTACTS
// ============================================================================

export const createContact = async (contactData, userId) => {
    const contactRef = doc(collection(db, 'contacts'));
    const contact = {
        ...contactData,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(contactRef, contact);
    return { id: contactRef.id, ...contact };
};

export const getContact = async (contactId) => {
    const contactDoc = await getDoc(doc(db, 'contacts', contactId));
    if (!contactDoc.exists()) return null;
    return { id: contactDoc.id, ...contactDoc.data() };
};

export const updateContact = async (contactId, data) => {
    await updateDoc(doc(db, 'contacts', contactId), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const deleteContact = async (contactId) => {
    await deleteDoc(doc(db, 'contacts', contactId));
};

export const listContacts = async (userId, canViewAll = false) => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    } else {
        q = query(
            collection(db, 'contacts'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );
    }

    const contactsSnapshot = await getDocs(q);
    return contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToContacts = (userId, canViewAll, callback) => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    } else {
        q = query(
            collection(db, 'contacts'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );
    }

    return onSnapshot(q, (snapshot) => {
        const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(contacts);
    });
};

// ============================================================================
// PROJECTS
// ============================================================================

export const createProject = async (projectData, userId) => {
    const projectRef = doc(collection(db, 'projects'));
    const project = {
        ...projectData,
        createdBy: userId,
        status: projectData.status || 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(projectRef, project);
    return { id: projectRef.id, ...project };
};

export const getProject = async (projectId) => {
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) return null;
    return { id: projectDoc.id, ...projectDoc.data() };
};

export const updateProject = async (projectId, data) => {
    await updateDoc(doc(db, 'projects', projectId), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const deleteProject = async (projectId) => {
    await deleteDoc(doc(db, 'projects', projectId));
};

export const listProjects = async (userId, canViewAll = false) => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    } else {
        q = query(
            collection(db, 'projects'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );
    }

    const projectsSnapshot = await getDocs(q);
    return projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToProjects = (userId, canViewAll, callback) => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    } else {
        q = query(
            collection(db, 'projects'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );
    }

    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(projects);
    });
};
