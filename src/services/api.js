
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
            const canViewAll = user.role === 'admin' || user.permissions?.canViewAllProjects;
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
            const canViewAll = user.role === 'admin' || user.permissions?.canViewAllProjects;
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

    async updateUser(id, data) {
        return await firestoreService.updateUser(id, data);
    }

    async deleteUser(id) {
        return await firestoreService.deleteUser(id);
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
