// Firebase Storage Service for PDF Management
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { storage } from '@/config/firebase.js';

/**
 * Upload PDF file to Firebase Storage
 * @param {File} file - PDF file to upload
 * @param {string} contactId - Contact ID
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} Download URL
 */
export const uploadPDF = async (file, contactId, projectId) => {
    try {
        const fileName = `${projectId}_report.pdf`;
        const storageRef = ref(storage, `pdfs/${contactId}/${fileName}`);

        // Upload file
        await uploadBytes(storageRef, file);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error('PDF upload error:', error);
        throw error;
    }
};

/**
 * Get PDF download URL
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL
 */
export const getPDFUrl = async (path) => {
    try {
        const storageRef = ref(storage, path);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error('Get PDF URL error:', error);
        throw error;
    }
};

/**
 * Delete PDF from storage
 * @param {string} path - Storage path
 */
export const deletePDF = async (path) => {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Delete PDF error:', error);
        throw error;
    }
};

/**
 * Upload PDF blob (generated from jsPDF)
 * @param {Blob} blob - PDF blob
 * @param {string} contactId - Contact ID
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} Download URL
 */
export const uploadPDFBlob = async (blob, contactId, projectId) => {
    try {
        const fileName = `${projectId}_report.pdf`;
        const storageRef = ref(storage, `pdfs/${contactId}/${fileName}`);

        // Upload blob
        await uploadBytes(storageRef, blob, {
            contentType: 'application/pdf'
        });

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error('PDF blob upload error:', error);
        throw error;
    }
};

/**
 * Upload User Avatar to Firebase Storage
 * @param {File} file - Image file
 * @param {string} userId - User ID
 * @returns {Promise<string>} Download URL
 */
export const uploadUserAvatar = async (file, userId) => {
    try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `avatar_${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, `avatars/${userId}/${fileName}`);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error('Avatar upload error:', error);
        throw error;
    }
};
