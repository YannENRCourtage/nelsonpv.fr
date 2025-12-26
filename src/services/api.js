
import * as firestoreService from './firebase/firestore.service';
import * as authService from './firebase/auth.service';
import * as commentsService from './firebase/comments.service';

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
    // AUTH
    // ============================================================================

    async login(email, password) {
        return await authService.signIn(email, password);
    }

    async logout() {
        return await authService.signOut();
    }

    // ============================================================================
    // PROJECTS
    // ============================================================================

    async getProjects() {
        try {
            const user = await this._getCurrentUser();
            // ALLOW ALL USERS TO SEE EVERYTHING (Universal Access)
            const canViewAll = true;
            return await firestoreService.listProjects(user.uid, canViewAll);
        } catch (error) {
            console.error("Error getting projects:", error);
            return [];
        }
    }

    async getProject(id) {
        return await firestoreService.getProject(id);
    }

    async createProject(data) {
        const user = await this._getCurrentUser();
        return await firestoreService.createProject(data, user.uid);
    }

    async updateProject(id, data) {
        return await firestoreService.updateProject(id, data);
    }

    async deleteProject(id) {
        return await firestoreService.deleteProject(id);
    }

    // ============================================================================
    // CONTACTS
    // ============================================================================

    async getContacts() {
        try {
            const user = await this._getCurrentUser();
            // ALLOW ALL USERS TO SEE EVERYTHING (Universal Access)
            const canViewAll = true;
            return await firestoreService.listContacts(user.uid, canViewAll);
        } catch (error) {
            console.error("Error getting contacts:", error);
            return [];
        }
    }

    async getContact(id) {
        return await firestoreService.getContact(id);
    }

    async createContact(data) {
        const user = await this._getCurrentUser();
        return await firestoreService.createContact(data, user.uid);
    }

    async updateContact(id, data) {
        return await firestoreService.updateContact(id, data);
    }

    async deleteContact(id) {
        return await firestoreService.deleteContact(id);
    }

    // ============================================================================
    // ACTIVITIES & TASKS
    // ============================================================================

    async getTasks() {
        try {
            const user = await this._getCurrentUser();
            // ALLOW ALL USERS TO SEE EVERYTHING (Universal Access)
            const canViewAll = true;
            return await firestoreService.listTasks(user.uid, canViewAll);
        } catch (error) {
            console.error("Error getting tasks:", error);
            return [];
        }
    }

    async createTask(data) {
        const user = await this._getCurrentUser();
        return await firestoreService.createTask(data, user.uid);
    }

    async updateTask(id, data) {
        return await firestoreService.updateTask(id, data);
    }

    async deleteTask(taskId) {
        return await firestoreService.deleteTask(taskId);
    }

    async logActivity(data) {
        return await firestoreService.logActivity(data);
    }

    async getActivities(limit = 20) {
        return await firestoreService.listActivities(limit);
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
}

export const apiService = new ApiService();
export default apiService;
