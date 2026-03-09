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
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';

// ============================================================================
// TENANTS
// ============================================================================
export const TENANTS = {
    'green-invest': { label: 'GREEN INVEST (BARCONNIERE)', color: '#16a34a' },
    'acama': { label: 'ACAMA', color: '#2563eb' }
};

// ============================================================================
// USERS
// ============================================================================

export const getUser = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    return { ...userDoc.data(), id: userDoc.id };
};

export const updateUser = async (uid, data) => {
    await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const listUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const deleteUser = async (uid) => {
    await deleteDoc(doc(db, 'users', uid));
};

// ============================================================================
// CONTACTS
// ============================================================================

export const createContact = async (contactData, userId, tenantId = 'green-invest') => {
    const contactRef = doc(collection(db, 'contacts'));
    // Remove temporary ID if present
    const { id, ...data } = contactData;
    const contact = {
        ...data,
        tenantId,
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
    return { ...contactDoc.data(), id: contactDoc.id };
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

export const listContacts = async (userId, canViewAll = false, tenantId = 'green-invest') => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'contacts'), where('tenantId', '==', tenantId));
    } else {
        q = query(
            collection(db, 'contacts'),
            where('tenantId', '==', tenantId),
            where('createdBy', '==', userId)
        );
    }

    const contactsSnapshot = await getDocs(q);
    const contacts = contactsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // Client-side sorting
    return contacts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending
    });
};

export const subscribeToContacts = (userId, canViewAll, callback, tenantId = 'green-invest') => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'contacts'), where('tenantId', '==', tenantId));
    } else {
        q = query(
            collection(db, 'contacts'),
            where('tenantId', '==', tenantId),
            where('createdBy', '==', userId)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const contacts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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

export const createProject = async (projectData, userId, tenantId = 'green-invest') => {
    const projectRef = doc(collection(db, 'projects'));
    // Remove temporary ID
    const { id, ...data } = projectData;
    const project = {
        ...data,
        tenantId,
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
    return { ...projectDoc.data(), id: projectDoc.id };
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

export const listProjects = async (userId, canViewAll = false, tenantId = 'green-invest') => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'projects'), where('tenantId', '==', tenantId));
    } else {
        q = query(
            collection(db, 'projects'),
            where('tenantId', '==', tenantId),
            where('createdBy', '==', userId)
        );
    }

    const projectsSnapshot = await getDocs(q);
    const projects = projectsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // Client-side sorting
    return projects.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending
    });
};

export const subscribeToProjects = (userId, canViewAll, callback, tenantId = 'green-invest') => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'projects'), where('tenantId', '==', tenantId));
    } else {
        q = query(
            collection(db, 'projects'),
            where('tenantId', '==', tenantId),
            where('createdBy', '==', userId)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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
// MIGRATION : assigner tenantId à tous les docs existants sans tenant
// ============================================================================

export const migrateCollectionToTenant = async (collectionName, tenantId) => {
    const snapshot = await getDocs(collection(db, collectionName));
    const toMigrate = snapshot.docs.filter(d => !d.data().tenantId);

    if (toMigrate.length === 0) return 0;

    // Batch writes (max 500 per batch)
    const BATCH_SIZE = 400;
    let migrated = 0;
    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = toMigrate.slice(i, i + BATCH_SIZE);
        chunk.forEach(d => {
            batch.update(d.ref, { tenantId, updatedAt: serverTimestamp() });
        });
        await batch.commit();
        migrated += chunk.length;
    }
    return migrated;
};

// ============================================================================
// TASKS
// ============================================================================

export const deleteTask = async (taskId) => {
    await deleteDoc(doc(db, 'tasks', taskId));
};

export const createTask = async (taskData, userId, tenantId = 'green-invest') => {
    const taskRef = doc(collection(db, 'tasks'));
    // Remove temporary ID
    const { id, ...data } = taskData;
    const task = {
        ...data,
        tenantId,
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

export const listTasks = async (userId, canViewAll = false, tenantId = 'green-invest') => {
    let q;
    if (canViewAll) {
        q = query(collection(db, 'tasks'), where('tenantId', '==', tenantId));
    } else {
        q = query(
            collection(db, 'tasks'),
            where('tenantId', '==', tenantId),
            where('createdBy', '==', userId)
        );
    }

    const tasksSnapshot = await getDocs(q);
    const tasks = tasksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

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

export const listActivities = async (limitCount = 20, tenantId = 'green-invest') => {
    const q = query(
        collection(db, 'activities'),
        where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // Sort by timestamp desc
    return activities.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return dateB - dateA;
    }).slice(0, limitCount);
};


// ============================================================================
// TRANSFERT DE PROJET (Inter-Tenant)
// ============================================================================

export const transferProject = async (projectId, targetTenantId, transferLinkedData = true) => {
    const batch = writeBatch(db);
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) throw new Error("Projet introuvable");
    const projectData = projectSnap.data();

    // 1. Mettre à jour le projet
    batch.update(projectRef, {
        tenantId: targetTenantId,
        updatedAt: serverTimestamp()
    });

    if (transferLinkedData) {
        // 2. Transférer le contact lié si présent
        if (projectData.email) {
            const contactsQ = query(
                collection(db, 'contacts'),
                where('email', '==', projectData.email)
            );
            const contactsSnap = await getDocs(contactsQ);
            contactsSnap.docs.forEach(d => {
                batch.update(d.ref, {
                    tenantId: targetTenantId,
                    updatedAt: serverTimestamp()
                });
            });
        }

        // 3. Transférer les tâches liées
        const tasksQ = query(
            collection(db, 'tasks'),
            where('contact', '==', projectData.name)
        );
        const tasksSnap = await getDocs(tasksQ);
        tasksSnap.docs.forEach(d => {
            batch.update(d.ref, {
                tenantId: targetTenantId,
                updatedAt: serverTimestamp()
            });
        });

        // 4. Transférer les activités liées
        const activitiesQ = query(
            collection(db, 'activities'),
            where('itemId', '==', projectId)
        );
        const activitiesSnap = await getDocs(activitiesQ);
        activitiesSnap.docs.forEach(d => {
            batch.update(d.ref, {
                tenantId: targetTenantId
            });
        });
    }

    await batch.commit();
    return true;
};

/**
 * Nettoie les activités d'un projet spécifique en les déplaçant vers un autre tenant
 */
export const cleanupProjectActivities = async (projectId, targetTenantId) => {
    const activitiesQ = query(
        collection(db, 'activities'),
        where('itemId', '==', projectId)
    );
    const snapshot = await getDocs(activitiesQ);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach(d => {
        if (d.data().tenantId !== targetTenantId) {
            batch.update(d.ref, { tenantId: targetTenantId });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
};
