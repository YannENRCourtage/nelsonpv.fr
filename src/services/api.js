

import * as firestoreService from './firebase/firestore.service';
import * as authService from './firebase/auth.service';
import * as commentsService from './firebase/comments.service';
import * as storageService from './firebase/storage.service';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, writeBatch, orderBy } from 'firebase/firestore';
import { auth, db } from '@/config/firebase.js';

/**
 * Adapter class to connect legacy API calls to Firebase services
 * Handles mapping of method calls and parameter injection (like userId)
 */
class ApiService {

    // Helper to get current user context for requests
    async _getCurrentUser() {
        const user = await authService.getCurrentUser();
        if (!user) throw new Error("User not authenticated");
        return user;
    }

    // ============================================================================
    // NOTIFICATIONS & COMMENTS
    // ============================================================================

    async createAssignmentNotification(projectId, projectName, assignedUserName, assignedByName) {
        return await commentsService.createProjectAssignmentNotification(projectId, projectName, assignedUserName, assignedByName);
    }

    // ============================================================================
    // AUTH
    // ============================================================================

    async login(email, password) {
        return await authService.signIn(email, password);
    }

    async logout() {
        return await authService.signOut();
    }

    async sendPasswordReset(email) {
        return await authService.sendResetPasswordEmail(email);
    }

    // ============================================================================
    // USERS (Admin)
    // ============================================================================

    async getUsers() {
        return await firestoreService.listUsers();
    }

    async getUser(uid) {
        return await firestoreService.getUser(uid);
    }

    async createUser(userData) {
        return await authService.createUser(userData.email, userData.password, userData);
    }

    async updateUser(uid, data) {
        return await firestoreService.updateUser(uid, data);
    }

    async deleteUser(uid) {
        return await firestoreService.deleteUser(uid);
    }

    async changeUserPassword(uid, newPassword) {
        try {
            const user = await this._getCurrentUser();
            // Force token refresh to avoid stale/expired tokens
            const idToken = await auth.currentUser.getIdToken(true);

            const response = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                    'X-Emergency-Repair': 'TRUE'
                },
                body: JSON.stringify({ uid, newPassword })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password');
            }
            return data;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    // ============================================================================
    // PROJECTS
    // ============================================================================

    // ============================================================================
    // PROJECTS
    // ============================================================================

    async getProjects(tenantId) {
        try {
            const user = await this._getCurrentUser();
            const canViewAll = true;
            const tId = tenantId || user.tenantId || 'green-invest';
            return await firestoreService.listProjects(user.uid, canViewAll, tId);
        } catch (error) {
            console.error("Error getting projects:", error);
            return [];
        }
    }

    async subscribeToProjects(callback, tenantId) {
        try {
            const user = await this._getCurrentUser();
            const canViewAll = true;
            const tId = tenantId || user.tenantId || 'green-invest';
            return firestoreService.subscribeToProjects(user.uid, canViewAll, callback, tId);
        } catch (error) {
            console.error("Error subscribing to projects:", error);
            return () => { };
        }
    }

    async getProject(id) {
        return await firestoreService.getProject(id);
    }

    async createProject(data, skipLog = false, tenantId) {
        const user = await this._getCurrentUser();
        const tId = tenantId || user.tenantId || 'green-invest';
        const created = await firestoreService.createProject(data, user.uid, tId);

        // SYNC CONTACT
        try {
            const clientName = [data.firstName, data.name].filter(Boolean).join(' ').trim() || 'Client sans nom';
            if (clientName !== 'Client sans nom') {
                await this.createContact({
                    name: clientName,
                    email: data.email || null,
                    phone: data.phone || null,
                    city: data.city || null,
                    address: data.address || null,
                    zipCode: data.zip || null,
                    status: data.status || 'Nouveau',
                    projectId: created.id
                }, true, tId);
            }
        } catch (e) {
            console.warn("Auto-contact creation failed", e);
        }

        if (!skipLog) {
            await this.logActivity({
                type: 'project',
                action: 'create',
                description: `${user.firstName || user.displayName || 'Un utilisateur'} a créé le projet ${created.name || 'Sans nom'}`,
                userId: user.uid,
                userName: user.firstName || user.displayName,
                userPhotoURL: user.photoURL,
                itemId: created.id,
                tenantId: tId
            });
        }

        return created;
    }

    async updateProject(id, data, skipLog = false, tenantId) {
        const result = await firestoreService.updateProject(id, data);
        const user = await this._getCurrentUser();
        const tId = tenantId || data.tenantId || user.tenantId || 'green-invest';

        // SYNC CONTACT on update as well
        try {
            const clientName = [data.firstName, data.name].filter(Boolean).join(' ').trim();
            if (clientName || data.email || data.phone || data.city) {
                // Fetch full project if name is missing to avoid "Client sans nom"
                let finalName = clientName;
                if (!finalName) {
                    const fullProject = await this.getProject(id);
                    finalName = [fullProject.firstName, fullProject.name].filter(Boolean).join(' ').trim();
                }

                if (finalName) {
                    await this.createContact({
                        name: finalName,
                        email: data.email || null,
                        phone: data.phone || null,
                        city: data.city || null,
                        address: data.address || null,
                        zipCode: data.zip || null,
                        status: data.status || undefined,
                        projectId: id
                    }, true, tId);
                }
            }
        } catch (e) {
            console.warn("Auto-contact sync failed on update", e);
        }

        // Log update (debounced ideally, but direct for now)
        if (!skipLog) {
            try {
                // Fetch project name if not in data, or use generic
                const projectName = data.name || (await this.getProject(id))?.name || 'Projet';

                await this.logActivity({
                    type: 'project',
                    action: 'update',
                    description: `${user.firstName || user.displayName} a modifié le projet ${projectName}`,
                    userId: user.uid,
                    userName: user.firstName || user.displayName,
                    userPhotoURL: user.photoURL,
                    itemId: id,
                    tenantId: tId
                });
            } catch (e) { console.error("Log fail", e); }
        }

        return result;
    }

    async transferProject(projectId, targetTenantId, options = { transferLinkedData: true }) {
        const user = await this._getCurrentUser();
        const result = await firestoreService.transferProject(projectId, targetTenantId, options.transferLinkedData);

        await this.logActivity({
            type: 'project',
            action: 'transfer',
            description: `${user.firstName || user.displayName || 'Un utilisateur'} a transféré le projet vers un tiers`,
            userId: user.uid,
            userName: user.firstName || user.displayName,
            userPhotoURL: user.photoURL,
            itemId: projectId,
            tenantId: targetTenantId // Log the activity in the target tenant where the project now belongs
        });

        return result;
    }

    async duplicateProject(projectId, targetTenantId, options = { transferLinkedData: true }) {
        const user = await this._getCurrentUser();
        const newProjectId = await firestoreService.duplicateProject(projectId, targetTenantId, options.transferLinkedData);

        await this.logActivity({
            type: 'project',
            action: 'duplicate',
            description: `${user.firstName || user.displayName || 'Un utilisateur'} a dupliqué le projet vers un tiers`,
            userId: user.uid,
            userName: user.firstName || user.displayName,
            userPhotoURL: user.photoURL,
            itemId: newProjectId,
            tenantId: targetTenantId
        });

        return newProjectId;
    }

    async deleteProject(id, skipLog = false) {
        const user = await this._getCurrentUser();
        // Get name before delete
        const project = await this.getProject(id);
        const name = project?.name || id;

        const result = await firestoreService.deleteProject(id);

        if (!skipLog) {
            await this.logActivity({
                type: 'project',
                action: 'delete',
                description: `${user.firstName || user.displayName} a supprimé le projet ${name}`,
                userId: user.uid,
                userName: user.firstName || user.displayName,
                userPhotoURL: user.photoURL,
                itemId: id,
                tenantId: project?.tenantId // Use project's tenantId if available
            });
        }

        return result;
    }

    // ============================================================================
    // CONTACTS
    // ============================================================================

    async getContacts(tenantId) {
        try {
            const user = await this._getCurrentUser();
            const canViewAll = user.role === 'admin' || user.permissions?.canViewAllProjects;
            const tId = tenantId || user.tenantId || 'green-invest';
            return await firestoreService.listContacts(user.uid, canViewAll, tId);
        } catch (error) {
            console.error("Error getting contacts:", error);
            return [];
        }
    }

    async getContact(id) {
        return await firestoreService.getContact(id);
    }

    async createContact(data, skipLog = false, tenantId) {
        const user = await this._getCurrentUser();
        const tId = tenantId || user.tenantId || 'green-invest';
        
        // 1. Recherche de doublons avant création
        let existingContact = null;
        try {
            const allContacts = await this.getContacts(tId);
            
            // Recherche par email
            if (data.email && data.email !== '-' && data.email !== '') {
                existingContact = allContacts.find(c => c.email && c.email.toLowerCase() === data.email.toLowerCase());
            }
            
            // Recherche par Nom + Ville si pas trouvé par email
            if (!existingContact && data.name) {
                const normalizedName = data.name.toLowerCase().trim();
                const normalizedCity = (data.city || '').toLowerCase().trim();
                existingContact = allContacts.find(c => 
                    c.name && c.name.toLowerCase().trim() === normalizedName && 
                    (normalizedCity === '' || (c.city && c.city.toLowerCase().trim() === normalizedCity))
                );
            }
        } catch (e) {
            console.warn("Erreur lors de la recherche de doublons (non-bloquant):", e);
        }

        let created;
        if (existingContact) {
            // Mise à jour de l'existant
            await firestoreService.updateContact(existingContact.id, {
                ...data,
                updatedAt: serverTimestamp()
            });
            created = { ...existingContact, ...data };
        } else {
            // Création normale
            created = await firestoreService.createContact(data, user.uid, tId);
        }

        if (!skipLog) {
            await this.logActivity({
                type: 'contact',
                action: 'create',
                description: `${user.firstName || user.displayName} a créé le contact ${created.name}`,
                userId: user.uid,
                userName: user.firstName || user.displayName,
                userPhotoURL: user.photoURL,
                itemId: created.id,
                tenantId: tId
            });
        }

        return created;
    }

    async updateContact(id, data, skipLog = false) {
        const result = await firestoreService.updateContact(id, data);
        if (!skipLog) {
            try {
                const user = await this._getCurrentUser();
                const contactName = data.name || (await this.getContact(id))?.name || 'Contact';

                await this.logActivity({
                    type: 'contact',
                    action: 'update',
                    description: `${user.firstName || user.displayName} a modifié le contact ${contactName}`,
                    userId: user.uid,
                    userName: user.firstName || user.displayName,
                    userPhotoURL: user.photoURL,
                    itemId: id,
                    tenantId: data.tenantId || (await this.getContact(id))?.tenantId
                });
            } catch (e) { console.warn("Log activity failed", e); }
        }
        return result;
    }

    async deleteContact(id, skipLog = false) {
        const user = await this._getCurrentUser();
        const contact = await this.getContact(id);
        const name = contact?.name || id;

        const result = await firestoreService.deleteContact(id);

        if (!skipLog) {
            await this.logActivity({
                type: 'contact',
                action: 'delete',
                description: `${user.firstName || user.displayName} a supprimé le contact ${name}`,
                userId: user.uid,
                userName: user.firstName || user.displayName,
                userPhotoURL: user.photoURL,
                itemId: id,
                tenantId: contact?.tenantId
            });
        }

        return result;
    }

    // ============================================================================
    // ACTIVITIES & TASKS
    // ============================================================================

    async getTasks(tenantId) {
        try {
            const user = await this._getCurrentUser();
            const canViewAll = user.role === 'admin' || user.permissions?.canViewAllProjects;
            const tId = tenantId || user.tenantId || 'green-invest';
            return await firestoreService.listTasks(user.uid, canViewAll, tId);
        } catch (error) {
            console.error("Error getting tasks:", error);
            return [];
        }
    }

    async createTask(data, skipLog = false, tenantId) {
        const user = await this._getCurrentUser();
        const tId = tenantId || user.tenantId || 'green-invest';
        const created = await firestoreService.createTask(data, user.uid, tId);

        if (!skipLog) {
            await this.logActivity({
                type: 'task',
                action: 'create',
                description: `${user.firstName || user.displayName} a créé la tâche : ${created.title}`,
                userId: user.uid,
                userName: user.firstName || user.displayName,
                userPhotoURL: user.photoURL,
                itemId: created.id,
                tenantId: tId
            });
        }

        return created;
    }

    async updateTask(id, data, skipLog = false) {
        const result = await firestoreService.updateTask(id, data);
        if (!skipLog) {
            try {
                const user = await this._getCurrentUser();
                const task = (await firestoreService.getTasks([id]))?.[0] || {};
                // Warning: firestoreService doesn't have getTasks(ids), but getTasks() returns all. 
                // Simplified:
                const title = data.title || 'Tâche';

                await this.logActivity({
                    type: 'task',
                    action: 'update',
                    description: `${user.firstName || user.displayName} a modifié la tâche : ${title}`,
                    userId: user.uid,
                    userName: user.firstName || user.displayName,
                    userPhotoURL: user.photoURL,
                    itemId: id,
                    tenantId: data.tenantId || undefined // Priorité au tenant des données
                });
            } catch (e) { }
        }
        return result;
    }

    async deleteTask(taskId, skipLog = false) {
        const user = await this._getCurrentUser();
        const result = await firestoreService.deleteTask(taskId);

        if (!skipLog) {
            await this.logActivity({
                type: 'task',
                action: 'delete',
                description: `${user.firstName || user.displayName} a supprimé une tâche`,
                userId: user.uid,
                userName: user.firstName || user.displayName,
                userPhotoURL: user.photoURL,
                itemId: taskId
            });
        }

        return result;
    }

    async logActivity(data) {
        try {
            const user = await this._getCurrentUser();
            const activityData = {
                ...data,
                // Prioritize: 1. data.tenantId, 2. user profile tenantId, 3. fallback
                tenantId: data.tenantId || user.tenantId || 'green-invest'
            };
            return await firestoreService.logActivity(activityData);
        } catch (e) {
            console.error("Failed to log activity:", e);
        }
    }

    async getActivities(limit = 20, tenantId) {
        try {
            const user = await this._getCurrentUser();
            const tId = tenantId || user.tenantId || 'green-invest';
            return await firestoreService.listActivities(limit, tId);
        } catch (error) {
            console.error("Error getting activities:", error);
            return [];
        }
    }

    // ============================================================================
    // USERS
    // ============================================================================

    async getUsers() {
        // Admin only usually, but we assume rules handle it or UI hides it
        return await firestoreService.listUsers();
    }

    async getUser(id) {
        return await firestoreService.getUser(id);
    }

    async createUser(data) {
        const { email, password, ...profileData } = data;
        return await authService.createUser(email, password, profileData);
    }

    // NOUVEAU: Permet de créer uniquement le profil Firestore si l'utilisateur existe déjà dans Auth
    async createUserProfileOnly(email, profileData) {
        // On doit trouver l'UID. C'est compliqué sans Admin SDK coté client direct si on est pas l'utilisateur.
        // HACK: Si on est admin, on peut lister les users Auth pour trouver l'UID ? Non impossible client-side.
        // MAIS: Si "createUser" a échoué avec "email-already-in-use", ça veut dire qu'il existe.
        // On ne peut PAS deviner son UID ici simplement sans cloud function.
        // ALTERNATIVE: On utilise listUsers() de firestore pour voir s'il y est. S'il n'y est pas, on a un problème : on a perdu l'UID.
        // workaround: Demander à l'utilisateur de se connecter 1 fois pour initialiser son compte ?
        // OU: Utiliser une Function Cloud (si dispo).
        // ICI: On va supposer que si le Auth existe, on ne peut pas réparer sans l'UID. 
        // -> Donc on va logger une erreur explicite. "Utilisateur existant dans Auth mais UID inconnu".

        // Wait, 'createUser' de auth.service.js fait quoi ?
        // Il fait createUserWithEmailAndPassword.

        throw new Error("Impossible de réparer automatiquement sans l'UID. Veuillez supprimer l'utilisateur Firebase Auth manuellement ou demander à l'utilisateur de se connecter.");
    }

    // Attendez, je peux peut-être pas réparer si je n'ai pas l'UID.
    // Si Elodie a été créée, elle a un UID. Où est-il ? Perdu dans la console Firebase.
    // Bon, plan B : Si erreur "email-already-in-use", on dit à l'admin : "Cet email est déjà utilisé par un compte Auth. Essayez de supprimer l'utilisateur dans la console Firebase ou changez d'email."
    // Pas de réparation magique possible client-side sans Admin SDK.

    async updateUser(id, data) {
        return await firestoreService.updateUser(id, data);
    }

    async deleteUser(id) {
        return await firestoreService.deleteUser(id);
    }

    async sendPasswordReset(email) {
        return await authService.sendResetPasswordEmail(email);
    }

    async changeUserPassword(uid, newPassword) {
        const currentUserAuth = auth.currentUser;
        if (!currentUserAuth) throw new Error("Non authentifié");
        
        // Force token refresh to avoid stale/expired tokens
        const idToken = await currentUserAuth.getIdToken(true);
        
        const response = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
                'X-Emergency-Repair': 'TRUE'
            },
            body: JSON.stringify({ uid, newPassword })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors du changement de mot de passe');
        }
        
        return await response.json();
    }

    // ============================================================================
    // NOTIFICATIONS
    // ============================================================================

    async getNotifications(userId) {
        if (!userId) {
            const user = await this._getCurrentUser();
            userId = user.uid;
        }
        return await commentsService.getUserNotifications(userId);
    }

    async markNotificationsAsRead(userId, notificationIds) {
        // Handle both single ID and array of IDs
        if (Array.isArray(notificationIds)) {
            const promises = notificationIds.map(id => commentsService.markNotificationAsRead(id));
            await Promise.all(promises);
            return { success: true };
        } else if (notificationIds) {
            await commentsService.markNotificationAsRead(notificationIds);
            return { success: true };
        }
        return { success: false };
    }

    // ============================================================================
    // USER SETTINGS
    // ============================================================================

    async updateUserAvatar(file) {
        const user = await this._getCurrentUser();
        return await storageService.uploadUserAvatar(file, user.uid);
    }

    async updateUserProfile(data) {
        const user = await this._getCurrentUser();
        return await firestoreService.updateUser(user.uid, data);
    }

    // ============================================================================
    // MONTHLY KPI SNAPSHOTS
    // ============================================================================

    async saveMonthlyKpiSnapshot(month, kpiData) {
        // month format: YYYY-MM
        const user = await this._getCurrentUser();
        const snapshotRef = doc(db, 'monthlyKpis', `${user.uid}_${month}`);
        await setDoc(snapshotRef, {
            ...kpiData,
            userId: user.uid,
            month: month,
            createdAt: serverTimestamp()
        });
    }

    async getMonthlyKpiSnapshot(month) {
        // month format: YYYY-MM
        const user = await this._getCurrentUser();
        const snapshotRef = doc(db, 'monthlyKpis', `${user.uid}_${month}`);
        const snapshot = await getDoc(snapshotRef);
        if (snapshot.exists()) {
            return snapshot.data();
        }
        return null;
    }

    // ============================================================================
    // MONDAY TABLES
    // ============================================================================


    subscribeToMondayTables(callback) {
        try {
            const q = query(collection(db, 'monday_tables'));
            return onSnapshot(q, (snapshot) => {
                const tables = snapshot.docs.map(doc => {
                    // We don't fetch rows here anymore, just metadata (columns, name, etc.)
                    // But legacy data might have rows field. We ignore it or handle it? 
                    // Let's keep it simple.
                    return { ...doc.data(), id: doc.id };
                });
                callback(tables);
            });
        } catch (error) {
            console.error("Error subscribing to Monday tables:", error);
            callback([]);
            return () => { };
        }
    }

    subscribeToMondayRows(tableId, callback) {
        try {
            const q = query(collection(db, 'monday_tables', tableId, 'rows'));
            return onSnapshot(q, (snapshot) => {
                const rows = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                callback(rows);
            });
        } catch (error) {
            console.error("Error subscribing to rows:", error);
            callback([]);
            return () => { };
        }
    }

    async addMondayRow(tableId, rowData) {
        const rowRef = doc(collection(db, 'monday_tables', tableId, 'rows'));
        // If rowData has an ID, use it? No, let Firestore generate or use setDoc if specific.
        // Let's trust Firestore auto-id for simplicity unless we want to control sort order.
        // Actually, if we want to keep order, we might need an index field.
        // For now, let's just make it work.
        const row = {
            ...rowData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        await setDoc(rowRef, row);
        return { id: rowRef.id, ...row };
    }

    async updateMondayRow(tableId, rowId, data) {
        const rowRef = doc(db, 'monday_tables', tableId, 'rows', rowId);
        await updateDoc(rowRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    }

    async deleteMondayRow(tableId, rowId) {
        await deleteDoc(doc(db, 'monday_tables', tableId, 'rows', rowId));
    }

    async batchReplaceMondayRows(tableId, newRows) {
        // Warning: This deletes ALL existing rows and adds new ones.
        // Firestore batch limit is 500 operations.
        // For large datasets, we need to chunk.

        // 1. Delete existing (Optional? Or just add?)
        // If we want "replace", we should delete.
        // Fetch all IDs first.
        const q = query(collection(db, 'monday_tables', tableId, 'rows'));
        const snapshot = await import('firebase/firestore').then(m => m.getDocs(q));

        // Delete in batches
        const deleteBatches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            currentBatch.delete(doc.ref);
            count++;
            if (count >= 400) {
                deleteBatches.push(currentBatch.commit());
                currentBatch = writeBatch(db);
                count = 0;
            }
        });
        if (count > 0) deleteBatches.push(currentBatch.commit());
        await Promise.all(deleteBatches);

        const addBatches = [];
        const newRowIds = []; // Fix: Declare array
        currentBatch = writeBatch(db);
        count = 0;

        newRows.forEach(row => {
            const { id, ...data } = row;
            const newRef = doc(collection(db, 'monday_tables', tableId, 'rows'));
            newRowIds.push(newRef.id); // Capture ID
            currentBatch.set(newRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            count++;
            if (count >= 400) {
                addBatches.push(currentBatch.commit());
                currentBatch = writeBatch(db);
                count = 0;
            }
        });
        if (count > 0) addBatches.push(currentBatch.commit());
        await Promise.all(addBatches);

        return newRowIds;
    }

    async batchDeleteMondayRows(tableId, rowIds) {
        // Delete multiple rows by ID
        const batchSize = 400;
        const deleteBatches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        for (const rowId of rowIds) {
            const rowRef = doc(db, 'monday_tables', tableId, 'rows', rowId);
            currentBatch.delete(rowRef);
            count++;
            if (count >= batchSize) {
                deleteBatches.push(currentBatch.commit());
                currentBatch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) deleteBatches.push(currentBatch.commit());
        await Promise.all(deleteBatches);
    }

    async createMondayTable(data) {
        // data: { name: '...', columns: [], rows: [] }
        const tableRef = doc(collection(db, 'monday_tables'));
        const newTable = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        await setDoc(tableRef, newTable);
        return { id: tableRef.id, ...newTable };
    }

    async updateMondayTable(id, data) {
        const tableRef = doc(db, 'monday_tables', id);
        await updateDoc(tableRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    }

    async deleteMondayTable(id) {
        await deleteDoc(doc(db, 'monday_tables', id));
    }

    // ============================================================================
    // ODOO STAGES (Shared Configuration)
    // ============================================================================

    async subscribeToOdooStages(tenantId, callback) {
        try {
            const docId = tenantId === 'enr-courtage-energie' ? 'odooStages_enr' : 'odooStages';
            const odooStagesRef = doc(db, 'config', docId);

            return onSnapshot(odooStagesRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    callback(data.stages || []);
                } else {
                    // If document doesn't exist, return empty (will use defaults)
                    callback([]);
                }
            }, (error) => {
                console.error('Error subscribing to ODOO stages:', error);
                callback([]);
            });
        } catch (error) {
            console.error('Failed to subscribe to ODOO stages:', error);
            return () => { }; // Return empty unsubscribe function
        }
    }

    async updateOdooStages(stages, tenantId) {
        try {
            const docId = tenantId === 'enr-courtage-energie' ? 'odooStages_enr' : 'odooStages';
            const odooStagesRef = doc(db, 'config', docId);
            await setDoc(odooStagesRef, {
                stages: stages,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to update ODOO stages:', error);
            throw error;
        }
    }

    // ============================================================================
    // BUILDING TYPES (Shared Configuration)
    // ============================================================================

    async subscribeToSuiviBatData(tenantId, callback) {
        try {
            const docId = `suiviBatData_${tenantId || 'acama'}`;
            const ref = doc(db, 'config', docId);

            return onSnapshot(ref, (snapshot) => {
                if (snapshot.exists()) {
                    callback(snapshot.data().data || []);
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error('Error subscribing to suiviBatData:', error);
                callback(null);
            });
        } catch (error) {
            console.error('Failed to subscribe to suiviBatData:', error);
            return () => { };
        }
    }

    async updateSuiviBatData(tenantId, data) {
        try {
            const docId = `suiviBatData_${tenantId || 'acama'}`;
            const ref = doc(db, 'config', docId);
            await setDoc(ref, {
                data: data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to update suiviBatData:', error);
            throw error;
        }
    }

    // ============================================================================
    // ENEDIS CONSENTS
    // ============================================================================

    async getEnedisConsents() {
        try {
            const q = query(collection(db, 'enedis_consents'), orderBy('updatedAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting Enedis consents:", error);
            return [];
        }
    }

    subscribeToEnedisConsents(callback) {
        try {
            const q = query(collection(db, 'enedis_consents'), orderBy('updatedAt', 'desc'));
            return onSnapshot(q, (snapshot) => {
                const consents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(consents);
            });
        } catch (error) {
            console.error("Error subscribing to Enedis consents:", error);
            callback([]);
            return () => { };
        }
    }
}

export const apiService = new ApiService();
export default apiService;
