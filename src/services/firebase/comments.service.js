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
 * Create a comment with user mentions and automatic notifications
 * @param {string} projectId - Project ID
 * @param {string} userId - Comment author UID
 * @param {string} userName - Comment author display name
 * @param {string} content - Comment text
 * @param {string} assignedTo - (Optional) User ID or Name of the project assignee
 * @param {string} userEmail - (Optional) Comment author email for better exclusion
 * @returns {Promise<Object>} Created comment
 */
export const createComment = async (projectId, userId, userName, content, assignedTo = null, userEmail = null) => {
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

        // 1. Get all users for resolution
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Identify Target Users for Notifications
        const targets = new Set(); // Stores User IDs to notify

        // Helper to check if a user is the author
        const isAuthor = (u) => {
            if (!u) return false;
            // Strict ID check
            if (String(u.id) === String(userId)) return true;
            // Email check if provided
            if (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()) return true;
            return false;
        };

        // A. Project Assignee
        if (assignedTo) {
            const assignee = users.find(u =>
                String(u.id) === String(assignedTo) ||
                u.displayName === assignedTo ||
                (u.firstName && u.firstName === assignedTo) ||
                (u.email && u.email === assignedTo)
            );

            if (assignee && !isAuthor(assignee)) {
                targets.add(assignee.id);
            }
        }

        // B. Participants (Previous Commenters)
        const qComments = query(collection(db, 'comments'), where('projectId', '==', projectId));
        const commentsSnap = await getDocs(qComments);
        commentsSnap.forEach(doc => {
            const cData = doc.data();
            // userId of comment might be different format, try to resolve via Users list if possible, or just strict compare
            if (cData.userId && String(cData.userId) !== String(userId)) {
                // Double check if this participant is actually the current author (via email lookup if ID differs)
                const participantUser = users.find(u => String(u.id) === String(cData.userId));
                if (participantUser && isAuthor(participantUser)) {
                    // It's me, don't notify
                } else {
                    targets.add(cData.userId);
                }
            }
        });

        // C. Mentions (Explicit)
        mentions.forEach(mentionName => {
            const mentionedUser = users.find(u =>
                (u.firstName && u.firstName.toLowerCase() === mentionName.toLowerCase()) ||
                (u.displayName && u.displayName.toLowerCase() === mentionName.toLowerCase()) ||
                (u.email && u.email.toLowerCase().startsWith(mentionName.toLowerCase()))
            );
            if (mentionedUser && !isAuthor(mentionedUser)) {
                targets.add(mentionedUser.id);
            }
        });

        // 3. Create Notifications
        console.log(`[Notifications] Creating notifications for targets:`, [...targets]);
        for (const targetUserId of targets) {
            await addDoc(collection(db, 'notifications'), {
                userId: targetUserId,
                projectId,
                commentId: commentRef.id,
                type: 'comment',
                message: `${userName} a commenté sur le projet`,
                read: false,
                createdAt: serverTimestamp()
            });
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

/**
 * Create a notification when a project is assigned to a user
 * @param {string} projectId - Project ID
 * @param {string} projectName - Project name for display
 * @param {string} assignedUserName - Name of the user being assigned (e.g., "NicolasNMD")
 * @param {string} assignedByName - Name of the user doing the assignment (e.g., "Véronique")
 * @returns {Promise<void>}
 */
export const createProjectAssignmentNotification = async (projectId, projectName, assignedUserName, assignedByName) => {
    try {
        // Get all users to resolve the assignedUserName to a UID
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Find the user being assigned by matching firstName, displayName, or email
        const assignedUser = users.find(u =>
            (u.firstName && u.firstName === assignedUserName) ||
            (u.displayName && u.displayName === assignedUserName) ||
            (u.email && u.email.toLowerCase().startsWith(assignedUserName.toLowerCase()))
        );

        if (!assignedUser) {
            console.warn(`[Project Assignment] User "${assignedUserName}" not found, notification not created`);
            return;
        }

        // Create the notification
        await addDoc(collection(db, 'notifications'), {
            userId: assignedUser.id,
            projectId,
            type: 'assignment',
            message: `Vous avez été affecté(e) au projet ${projectName || 'sans nom'}`,
            assignedBy: assignedByName,
            read: false,
            createdAt: serverTimestamp()
        });

        console.log(`[Project Assignment] Notification created for user ${assignedUserName} (${assignedUser.id}) for project ${projectId}`);
    } catch (error) {
        console.error('Create project assignment notification error:', error);
        // Don't throw - notification creation should not block project assignment
    }
};
