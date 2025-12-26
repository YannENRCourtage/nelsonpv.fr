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
    // orderBy, // Removed to avoid index requirement
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
        // q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        q = query(collection(db, 'contacts'));
    } else {
        q = query(
            collection(db, 'contacts'),
            where('createdBy', '==', userId)
            // orderBy('createdAt', 'desc') // Removed to avoid index requirement
        );
    }

    const contactsSnapshot = await getDocs(q);
    const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side sorting
    return contacts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending
    });
};

export const subscribeToContacts = (userId, canViewAll, callback) => {
    let q;
    if (canViewAll) {
        // q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        q = query(collection(db, 'contacts'));
    } else {
        q = query(
            collection(db, 'contacts'),
            where('createdBy', '==', userId)
            // orderBy('createdAt', 'desc') // Removed
        );
    }

    return onSnapshot(q, (snapshot) => {
        const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort before callback
        contacts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
        });
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
        // q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        q = query(collection(db, 'projects'));
    } else {
        q = query(
            collection(db, 'projects'),
            where('createdBy', '==', userId)
            // orderBy('createdAt', 'desc') // Removed
        );
    }

    const projectsSnapshot = await getDocs(q);
    const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side sorting
    return projects.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending
    });
};

export const subscribeToProjects = (userId, canViewAll, callback) => {
    let q;
    if (canViewAll) {
        // q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        q = query(collection(db, 'projects'));
    } else {
        q = query(
            collection(db, 'projects'),
            where('createdBy', '==', userId)
            // orderBy('createdAt', 'desc') // Removed
        );
    }

    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort before callback
        projects.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        callback(projects);
    });
};
// ============================================================================
// TASKS
// ============================================================================

export const deleteTask = async (taskId) => {
    await deleteDoc(doc(db, 'tasks', taskId));
};

export const createTask = async (taskData, userId) => {
    const taskRef = doc(collection(db, 'tasks'));
    const task = {
        ...taskData,
        createdBy: userId,
        status: taskData.status || 'todo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(taskRef, task);
    return { id: taskRef.id, ...task };
};

export const updateTask = async (taskId, data) => {
    await updateDoc(doc(db, 'tasks', taskId), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const listTasks = async (userId, canViewAll = false) => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'tasks'));
    } else {
        q = query(
            collection(db, 'tasks'),
            where('createdBy', '==', userId)
        );
    }

    const tasksSnapshot = await getDocs(q);
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side sorting
    return tasks.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending
    });
};

// ============================================================================
// ACTIVITIES
// ============================================================================

export const logActivity = async (activityData) => {
    const activityRef = doc(collection(db, 'activities'));
    const activity = {
        ...activityData,
        timestamp: serverTimestamp()
    };
    await setDoc(activityRef, activity);
    return { id: activityRef.id, ...activity };
};

export const listActivities = async (limitCount = 20) => {
    const q = query(collection(db, 'activities'));
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by timestamp desc
    return activities.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return dateB - dateA;
    }).slice(0, limitCount);
};
