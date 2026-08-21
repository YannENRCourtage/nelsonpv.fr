// Agenda and Appointments Service for Nelson CRM
import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';

const LOCAL_STORAGE_KEY_PREFIX = 'nelson_agenda_';

export const APPOINTMENT_TYPES = [
    { id: 'visite', label: 'Visite Technique / Terrain', color: '#2563eb', bgClass: 'bg-blue-600', textClass: 'text-blue-700', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'commercial', label: 'RDV Commercial / Signature', color: '#16a34a', bgClass: 'bg-emerald-600', textClass: 'text-emerald-700', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'reunion', label: 'Réunion / Équipe', color: '#9333ea', bgClass: 'bg-purple-600', textClass: 'text-purple-700', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'suivi', label: 'Suivi Dossier / Raccordement', color: '#ea580c', bgClass: 'bg-orange-600', textClass: 'text-orange-700', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'appel', label: 'Point Téléphonique', color: '#d97706', bgClass: 'bg-amber-600', textClass: 'text-amber-700', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'urgent', label: 'Urgence / Priorité Haute', color: '#dc2626', bgClass: 'bg-rose-600', textClass: 'text-rose-700', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'autre', label: 'Autre / Personnel', color: '#64748b', bgClass: 'bg-slate-600', textClass: 'text-slate-700', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const REMINDER_OPTIONS = [
    { id: 'none', label: 'Aucun rappel', minutes: 0 },
    { id: '15m', label: '15 minutes avant', minutes: 15 },
    { id: '30m', label: '30 minutes avant', minutes: 30 },
    { id: '1h', label: '1 heure avant', minutes: 60 },
    { id: '2h', label: '2 heures avant', minutes: 120 },
    { id: '1d', label: '1 jour avant (24h)', minutes: 1440 },
    { id: '2d', label: '2 jours avant (48h)', minutes: 2880 },
];

/**
 * Charge les rendez-vous en cache local
 */
export const getLocalAppointments = (userId) => {
    if (!userId) return [];
    try {
        const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Sauvegarde les rendez-vous en cache local
 */
export const saveLocalAppointments = (userId, appointments) => {
    if (!userId) return;
    try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(appointments));
    } catch (e) {
        console.warn('Erreur cache local agenda:', e);
    }
};

/**
 * Crée un nouveau rendez-vous pour un utilisateur
 */
export const createAppointment = async (appointmentData, userId, tenantId = 'green-invest') => {
    if (!userId) throw new Error('Utilisateur non connecté');

    const appointmentId = `rdv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newAppointment = {
        id: appointmentId,
        title: appointmentData.title || 'Nouveau rendez-vous',
        date: appointmentData.date || new Date().toISOString().split('T')[0],
        startTime: appointmentData.startTime || '09:00',
        endTime: appointmentData.endTime || '10:00',
        isAllDay: !!appointmentData.isAllDay,
        type: appointmentData.type || 'commercial',
        color: appointmentData.color || '#2563eb',
        contact: appointmentData.contact || '',
        contactId: appointmentData.contactId || '',
        location: appointmentData.location || '',
        notes: appointmentData.notes || '',
        reminder: appointmentData.reminder || 'none',
        reminderSent: false,
        completed: false,
        userId,
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // Mise à jour immédiate du cache local
    const current = getLocalAppointments(userId);
    const updated = [newAppointment, ...current];
    saveLocalAppointments(userId, updated);

    // Synchronisation Firestore
    try {
        if (db) {
            const docRef = doc(db, 'agenda_events', appointmentId);
            await setDoc(docRef, {
                ...newAppointment,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.warn('Firestore sync failed for createAppointment (local saved):', e);
    }

    return newAppointment;
};

/**
 * Met à jour un rendez-vous
 */
export const updateAppointment = async (appointmentId, data, userId) => {
    if (!appointmentId || !userId) return;

    // Cache local
    const current = getLocalAppointments(userId);
    const updated = current.map(item => {
        if (item.id === appointmentId) {
            return {
                ...item,
                ...data,
                updatedAt: new Date().toISOString(),
            };
        }
        return item;
    });
    saveLocalAppointments(userId, updated);

    // Firestore
    try {
        if (db) {
            const docRef = doc(db, 'agenda_events', appointmentId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.warn('Firestore sync failed for updateAppointment:', e);
    }
};

/**
 * Supprime un rendez-vous
 */
export const deleteAppointment = async (appointmentId, userId) => {
    if (!appointmentId || !userId) return;

    // Cache local
    const current = getLocalAppointments(userId);
    const updated = current.filter(item => item.id !== appointmentId);
    saveLocalAppointments(userId, updated);

    // Firestore
    try {
        if (db) {
            const docRef = doc(db, 'agenda_events', appointmentId);
            await deleteDoc(docRef);
        }
    } catch (e) {
        console.warn('Firestore sync failed for deleteAppointment:', e);
    }
};

/**
 * Écoute en temps réel les rendez-vous de l'utilisateur
 */
export const subscribeToUserAppointments = (userId, tenantId, callback) => {
    if (!userId) {
        callback([]);
        return () => {};
    }

    // Fournir immédiatement le cache local
    const initialLocal = getLocalAppointments(userId);
    callback(initialLocal);

    if (!db) return () => {};

    try {
        const q = query(
            collection(db, 'agenda_events'),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Tri par date puis heure
            list.sort((a, b) => {
                const dateComp = (a.date || '').localeCompare(b.date || '');
                if (dateComp !== 0) return dateComp;
                return (a.startTime || '').localeCompare(b.startTime || '');
            });

            // Sauvegarder dans le cache local
            saveLocalAppointments(userId, list);
            callback(list);
        }, (err) => {
            console.warn('Firestore subscription error for agenda:', err);
            // Fallback au local
            callback(getLocalAppointments(userId));
        });

        return unsubscribe;
    } catch (e) {
        console.warn('Failed to subscribe to agenda:', e);
        return () => {};
    }
};

/**
 * Demande la permission pour les notifications navigateur
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        return 'unsupported';
    }
    if (Notification.permission === 'granted') {
        return 'granted';
    }
    if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        return perm;
    }
    return Notification.permission;
};

/**
 * Envoie une notification navigateur
 */
export const sendBrowserNotification = (title, options = {}) => {
    if (!('Notification' in window)) return null;

    if (Notification.permission === 'granted') {
        try {
            const notif = new Notification(title, {
                icon: '/logo-nelson.png',
                badge: '/logo-nelson.png',
                vibrate: [200, 100, 200],
                ...options
            });
            return notif;
        } catch (e) {
            console.warn('Erreur envoi notification:', e);
        }
    }
    return null;
};
