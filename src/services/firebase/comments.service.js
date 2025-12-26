// Comments and Notifications Service
import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * Create a comment with user mentions
 * @param {string} projectId - Project ID
 * @param {string} userId - Comment author UID
 * @param {string} userName - Comment author display name
 * @param {string} content - Comment text
 * @returns {Promise<Object>} Created comment
 */
export const createComment = async (projectId, userId, userName, content) => {
    try {
        // Extract mentions from content (@username)
        const mentionMatches = content.match(/@(\w+)/g) || [];
        const mentions = mentionMatches.map(m => m.substring(1)); // Remove @ symbol

        const comment = {
            projectId,
            userId,
            userName,
            content,
            mentions,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const commentRef = await addDoc(collection(db, 'comments'), comment);

        // Create notifications for mentioned users
        if (mentions.length > 0) {
            await createMentionNotifications(projectId, commentRef.id, userId, userName, mentions);
        }

        return { id: commentRef.id, ...comment };
    } catch (error) {
        console.error('Create comment error:', error);
        throw error;
    }
};

/**
 * Get all comments for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} List of comments
 */
export const getComments = async (projectId) => {
    try {
        const q = query(
            collection(db, 'comments'),
            where('projectId', '==', projectId)
            // orderBy('createdAt', 'asc') // Removed to avoid index requirement
        );

        const commentsSnapshot = await getDocs(q);
        const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sorting
        return comments.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateA - dateB; // Ascending
        });
    } catch (error) {
        console.error('Get comments error:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time comments for a project
 * @param {string} projectId - Project ID
 * @param {Function} callback - Callback function with comments array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToComments = (projectId, callback) => {
    const q = query(
        collection(db, 'comments'),
        where('projectId', '==', projectId)
        // orderBy('createdAt', 'asc') // Removed
    );

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort before callback
        comments.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateA - dateB; // Ascending
        });
        callback(comments);
    });
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Create notifications for mentioned users
 * @param {string} projectId - Project ID
 * @param {string} commentId - Comment ID
 * @param {string} authorId - Author UID
 * @param {string} authorName - Author display name
 * @param {Array<string>} mentionNames - Array of mentioned usernames (without @)
 */
const createMentionNotifications = async (projectId, commentId, authorId, authorName, mentionNames) => {
    try {
        // Get all users to map names to IDs
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // For each mention, find matching user and create notification
        for (const mentionName of mentionNames) {
            // Try to match by firstName, displayName, or email prefix
            const user = users.find(u =>
                (u.firstName && u.firstName.toLowerCase() === mentionName.toLowerCase()) ||
                (u.displayName && u.displayName.toLowerCase() === mentionName.toLowerCase()) ||
                (u.email && u.email.toLowerCase().startsWith(mentionName.toLowerCase()))
            );

            if (user && user.id !== authorId) { // Don't notify author
                await addDoc(collection(db, 'notifications'), {
                    userId: user.id,
                    projectId,
                    commentId,
                    type: 'mention',
                    message: `${authorName} vous a mentionné dans un commentaire`,
                    read: false,
                    createdAt: serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error('Create mention notifications error:', error);
        // Don't throw - notification creation should not block comment creation
    }
};

/**
 * Get notifications for a user
 * @param {string} userId - User UID
 * @returns {Promise<Array>} List of notifications
 */
export const getUserNotifications = async (userId) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId)
            // orderBy('createdAt', 'desc') // Removed
        );

        const notificationsSnapshot = await getDocs(q);
        const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sorting
        return notifications.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA; // Descending
        });
    } catch (error) {
        console.error('Get user notifications error:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time notifications for a user
 * @param {string} userId - User UID
 * @param {Function} callback - Callback function with notifications array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (userId, callback) => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
        // orderBy('createdAt', 'desc') // Removed
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort before callback
        notifications.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA; // Descending
        });
        callback(notifications);
    });
};

/**
 * Mark notification as read
 * ... (unchanged)
 */
export const markNotificationAsRead = async (notificationId) => {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), {
            read: true
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        throw error;
    }
};

/**
 * Get list of users for mention autocomplete
 * @returns {Promise<Array>} List of users with display names
 */
export const getUsersForMentions = async () => {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        return usersSnapshot.docs
            .map(doc => ({
                id: doc.id,
                displayName: doc.data().displayName,
                email: doc.data().email
            }))
            .filter(user => user.displayName); // Only users with display names
    } catch (error) {
        console.error('Get users for mentions error:', error);
        throw error;
    }
};
