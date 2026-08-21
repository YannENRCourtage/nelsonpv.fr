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
const AGENDA_SYNC_EVENT = 'nelson_agenda_sync';

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
        if (stored) return JSON.parse(stored);
        // Fallback clé globale si l'id varie
        const globalStored = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}global`);
        return globalStored ? JSON.parse(globalStored) : [];
    } catch {
        return [];
    }
};

/**
 * Sauvegarde les rendez-vous en cache local et notifie les composants
 */
export const saveLocalAppointments = (userId, appointments) => {
    if (!userId) return;
    try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(appointments));
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}global`, JSON.stringify(appointments));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(AGENDA_SYNC_EVENT, { detail: { userId, appointments } }));
        }
    } catch (e) {
        console.warn('Erreur cache local agenda:', e);
    }
};

/**
 * Crée un nouveau rendez-vous pour un utilisateur
 */
export const createAppointment = async (appointmentData, userId, tenantId = 'green-invest') => {
    const effectiveUserId = userId || 'default_user';
    const appointmentId = appointmentData.id || `rdv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Normaliser la date
    let rawDate = appointmentData.date;
    if (!rawDate) {
        rawDate = new Date().toISOString().split('T')[0];
    } else if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
            rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    const newAppointment = {
        id: appointmentId,
        title: appointmentData.title || 'Nouveau rendez-vous',
        date: rawDate,
        startTime: appointmentData.startTime || '09:00',
        endTime: appointmentData.endTime || '10:00',
        isAllDay: !!appointmentData.isAllDay,
        type: appointmentData.type || 'commercial',
        color: appointmentData.color || '#16a34a',
        contact: appointmentData.contact || '',
        contactId: appointmentData.contactId || '',
        location: appointmentData.location || '',
        notes: appointmentData.notes || '',
        reminder: appointmentData.reminder || '1h',
        reminderSent: false,
        completed: false,
        userId: effectiveUserId,
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // 1. Sauvegarde locale synchrone immédiate
    const current = getLocalAppointments(effectiveUserId);
    const updated = [newAppointment, ...current.filter(item => item.id !== appointmentId)];
    saveLocalAppointments(effectiveUserId, updated);

    // 2. Synchronisation Firestore non-bloquante
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
        console.warn('Firestore sync failed for createAppointment (local storage saved):', e);
    }

    return newAppointment;
};

/**
 * Met à jour un rendez-vous
 */
export const updateAppointment = async (appointmentId, data, userId) => {
    const effectiveUserId = userId || 'default_user';
    if (!appointmentId) return null;

    let rawDate = data.date;
    if (rawDate && rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
            rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    // Cache local
    const current = getLocalAppointments(effectiveUserId);
    let updatedAppt = null;
    const updated = current.map(item => {
        if (item.id === appointmentId) {
            updatedAppt = {
                ...item,
                ...data,
                ...(rawDate ? { date: rawDate } : {}),
                updatedAt: new Date().toISOString(),
            };
            return updatedAppt;
        }
        return item;
    });

    if (!updatedAppt) {
        updatedAppt = { id: appointmentId, ...data, ...(rawDate ? { date: rawDate } : {}), updatedAt: new Date().toISOString() };
        updated.unshift(updatedAppt);
    }

    saveLocalAppointments(effectiveUserId, updated);

    // Firestore
    try {
        if (db) {
            const docRef = doc(db, 'agenda_events', appointmentId);
            await updateDoc(docRef, {
                ...data,
                ...(rawDate ? { date: rawDate } : {}),
                updatedAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.warn('Firestore sync failed for updateAppointment:', e);
    }

    return updatedAppt;
};

/**
 * Supprime un rendez-vous
 */
export const deleteAppointment = async (appointmentId, userId) => {
    const effectiveUserId = userId || 'default_user';
    if (!appointmentId) return;

    // Cache local
    const current = getLocalAppointments(effectiveUserId);
    const updated = current.filter(item => item.id !== appointmentId);
    saveLocalAppointments(effectiveUserId, updated);

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
    const effectiveUserId = userId || 'default_user';

    // 1. Fournir immédiatement le cache local
    const initialLocal = getLocalAppointments(effectiveUserId);
    callback(initialLocal);

    // 2. Écoute des événements de synchronisation locale (entre onglets / composants)
    const handleSync = (e) => {
        if (e.detail && e.detail.appointments) {
            callback(e.detail.appointments);
        } else {
            callback(getLocalAppointments(effectiveUserId));
        }
    };
    if (typeof window !== 'undefined') {
        window.addEventListener(AGENDA_SYNC_EVENT, handleSync);
    }

    if (!db) {
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener(AGENDA_SYNC_EVENT, handleSync);
            }
        };
    }

    try {
        const q = query(
            collection(db, 'agenda_events'),
            where('userId', '==', effectiveUserId)
        );

        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Fusion avec le cache local pour ne rien perdre
            const localList = getLocalAppointments(effectiveUserId);
            const mergedMap = new Map();
            
            localList.forEach(item => mergedMap.set(item.id, item));
            list.forEach(item => mergedMap.set(item.id, { ...mergedMap.get(item.id), ...item }));
            
            const merged = Array.from(mergedMap.values());

            merged.sort((a, b) => {
                const dateComp = (a.date || '').localeCompare(b.date || '');
                if (dateComp !== 0) return dateComp;
                return (a.startTime || '').localeCompare(b.startTime || '');
            });

            saveLocalAppointments(effectiveUserId, merged);
            callback(merged);
        }, (err) => {
            console.warn('Firestore subscription error for agenda (using local fallback):', err);
            callback(getLocalAppointments(effectiveUserId));
        });

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener(AGENDA_SYNC_EVENT, handleSync);
            }
            unsubscribeFirestore();
        };
    } catch (e) {
        console.warn('Failed to subscribe to agenda:', e);
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener(AGENDA_SYNC_EVENT, handleSync);
            }
        };
    }
};

/**
 * Demande la permission pour les notifications navigateur
 */
export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
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
    if (typeof window === 'undefined' || !('Notification' in window)) return null;

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
