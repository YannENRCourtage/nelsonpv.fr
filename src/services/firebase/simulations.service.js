// Simulations Service - Gestion des simulations financières
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';

/**
 * Crée une nouvelle simulation financière
 * @param {Object} simulationData - Données de la simulation
 * @param {string} userId - ID de l'utilisateur créant la simulation
 * @returns {Promise<Object>} La simulation créée avec son ID
 */
export const createSimulation = async (simulationData, userId) => {
    const simulationRef = doc(collection(db, 'financial_simulations'));
    const { id, ...data } = simulationData;

    const simulation = {
        ...data,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(simulationRef, simulation);
    return { id: simulationRef.id, ...simulation };
};

/**
 * Récupère toutes les simulations financières
 * @returns {Promise<Array>} Liste de toutes les simulations
 */
export const listSimulations = async () => {
    const q = query(collection(db, 'financial_simulations'));
    const simulationsSnapshot = await getDocs(q);
    const simulations = simulationsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
    }));

    // Tri côté client par date de création (plus récent en premier)
    return simulations.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descendant
    });
};

/**
 * Récupère une simulation spécifique
 * @param {string} simulationId - ID de la simulation
 * @returns {Promise<Object|null>} La simulation ou null si non trouvée
 */
export const getSimulation = async (simulationId) => {
    const simulationDoc = await getDoc(doc(db, 'financial_simulations', simulationId));
    if (!simulationDoc.exists()) return null;
    return { ...simulationDoc.data(), id: simulationDoc.id };
};

/**
 * Met à jour une simulation existante
 * @param {string} simulationId - ID de la simulation
 * @param {Object} data - Données à mettre à jour
 */
export const updateSimulation = async (simulationId, data) => {
    await updateDoc(doc(db, 'financial_simulations', simulationId), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

/**
 * Supprime une simulation
 * @param {string} simulationId - ID de la simulation à supprimer
 */
export const deleteSimulation = async (simulationId) => {
    await deleteDoc(doc(db, 'financial_simulations', simulationId));
};
