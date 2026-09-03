// Agenda and Appointments Service for Nelson CRM
// Personal Agenda for each user (strictly isolated)
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
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';

const LOCAL_STORAGE_KEY_PREFIX = 'nelson_agenda_';
const AGENDA_SYNC_EVENT = 'nelson_agenda_sync';

// Titres des rendez-vous historiques de Yann ayant fuité lors de l'ancien cache global/tenant
const YANN_EVENT_KEYWORDS = [
    'rousset',
    'charpent 1881',
    'formation 2 sechoir',
    'julien huguet',
    'laurent guyon'
];

export const isYannEvent = (title = '') => {
    const lower = String(title || '').toLowerCase();
    return YANN_EVENT_KEYWORDS.some(kw => lower.includes(kw));
};

export const isYannUser = (userOrEmail) => {
    const email = typeof userOrEmail === 'string' ? userOrEmail : (userOrEmail?.email || '');
    const clean = email.toLowerCase().trim();
    return clean.includes('y.barberis') || clean.includes('contact@nelsonpv.fr');
};

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
 * Normalise une chaîne de date au format YYYY-MM-DD
 */
export const normalizeDateString = (dateInput) => {
    if (!dateInput) return new Date().toISOString().split('T')[0];
    if (typeof dateInput === 'string') {
        if (dateInput.includes('T')) return dateInput.split('T')[0];
        if (dateInput.includes('/')) {
            const parts = dateInput.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return dateInput.trim();
    }
    if (dateInput instanceof Date && !isNaN(dateInput)) {
        const y = dateInput.getFullYear();
        const m = String(dateInput.getMonth() + 1).padStart(2, '0');
        const d = String(dateInput.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return new Date().toISOString().split('T')[0];
};

/**
 * Charge les rendez-vous personnels en cache local pour cet utilisateur STRICTEMENT
 */
export const getLocalAppointments = (userId, userEmail = '') => {
    if (!userId || userId === 'default_user') return [];
    try {
        // Nettoyer les anciens caches globaux qui partageaient à tort les rendez-vous
        try {
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}global`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}green-invest`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}acama`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}enr-courtage`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}enr-courtage-energie`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}default_user`);
        } catch { }

        const userStored = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
        if (userStored) {
            const parsed = JSON.parse(userStored);
            if (Array.isArray(parsed)) {
                const isYann = isYannUser(userEmail);
                // Isolation stricte : chaque RDV doit appartenir à cet userId
                // ET si ce n'est pas Yann, aucun événement historique de Yann ne doit subsister
                const cleaned = parsed.filter(item => {
                    if (!item || !item.id) return false;
                    if (item.userId !== userId) return false;
                    if (!isYann && isYannEvent(item.title)) return false;
                    return true;
                });

                // Si des rendez-vous parasites ont été éliminés, assainir immédiatement le cache
                if (cleaned.length !== parsed.length) {
                    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cleaned));
                }

                return cleaned;
            }
        }
    } catch (e) {
        console.warn('Erreur lecture cache local agenda:', e);
    }
    return [];
};

/**
 * Sauvegarde les rendez-vous en cache local STRICTEMENT pour cet utilisateur
 */
export const saveLocalAppointments = (userId, appointments) => {
    if (!userId || userId === 'default_user' || !Array.isArray(appointments)) return;
    try {
        try {
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}global`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}green-invest`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}acama`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}enr-courtage`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}enr-courtage-energie`);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}default_user`);
        } catch { }

        const dataStr = JSON.stringify(appointments);
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, dataStr);

        // Événement local sur la fenêtre courante filtré par userId
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(AGENDA_SYNC_EVENT, { detail: { userId, appointments } }));
        }
    } catch (e) {
        console.warn('Erreur écriture cache local agenda:', e);
    }
};

/**
 * Nettoie et formate un objet de rendez-vous personnel
 */
const formatAppointmentObject = (appointmentData, userId, tenantId) => {
    const effectiveUserId = userId || 'default_user';
    const effectiveTenantId = tenantId || 'green-invest';
    const appointmentId = appointmentData.id || `rdv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const normalizedDate = normalizeDateString(appointmentData.date);

    return {
        id: appointmentId,
        title: (appointmentData.title || 'Nouveau rendez-vous').trim(),
        date: normalizedDate,
        startTime: appointmentData.startTime || '09:00',
        endTime: appointmentData.endTime || '10:00',
        isAllDay: !!appointmentData.isAllDay,
        type: appointmentData.type || 'commercial',
        color: appointmentData.color || '#16a34a',
        contact: appointmentData.contact || '',
        contactId: appointmentData.contactId || '',
        location: appointmentData.location || '',
        notes: appointmentData.notes || '',
        reminder: appointmentData.reminder || 'none',
        reminderSent: !!appointmentData.reminderSent,
        completed: !!appointmentData.completed,
        userId: effectiveUserId,
        tenantId: effectiveTenantId,
        createdAt: appointmentData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Crée un nouveau rendez-vous personnel pour un utilisateur
 */
export const createAppointment = async (appointmentData, userId, tenantId = 'green-invest') => {
    const effectiveUserId = userId || 'default_user';
    const effectiveTenantId = tenantId || 'green-invest';
    if (!effectiveUserId || effectiveUserId === 'default_user') return null;

    const newAppointment = formatAppointmentObject(appointmentData, effectiveUserId, effectiveTenantId);

    // 1. Mise à jour optimiste locale immédiate (0 ms)
    const current = getLocalAppointments(effectiveUserId);
    const updated = [newAppointment, ...current.filter(item => item.id !== newAppointment.id)];
    saveLocalAppointments(effectiveUserId, updated);

    // 2. Écriture distante Firestore dans la sous-collection isolée ET la collection racine
    try {
        if (db) {
            // Sous-collection privée sous /users/{userId}/agenda_events
            const userDocRef = doc(db, 'users', effectiveUserId, 'agenda_events', newAppointment.id);
            await setDoc(userDocRef, {
                ...newAppointment,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Collection racine pour rétrocompatibilité
            const rootDocRef = doc(db, 'agenda_events', newAppointment.id);
            await setDoc(rootDocRef, {
                ...newAppointment,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.error('Firestore createAppointment error:', e);
    }

    return newAppointment;
};

/**
 * Met à jour un rendez-vous
 */
export const updateAppointment = async (appointmentId, data, userId, tenantId = 'green-invest') => {
    const effectiveUserId = userId || 'default_user';
    const effectiveTenantId = tenantId || 'green-invest';
    if (!appointmentId || !effectiveUserId || effectiveUserId === 'default_user') return null;

    const normalizedDate = data.date ? normalizeDateString(data.date) : undefined;
    const patch = {
        ...data,
        ...(normalizedDate ? { date: normalizedDate } : {}),
        userId: effectiveUserId,
        updatedAt: new Date().toISOString(),
    };

    // 1. Mise à jour optimiste locale immédiate (0 ms)
    const current = getLocalAppointments(effectiveUserId);
    let updatedAppt = null;
    const updated = current.map(item => {
        if (item.id === appointmentId) {
            updatedAppt = { ...item, ...patch };
            return updatedAppt;
        }
        return item;
    });

    if (!updatedAppt) {
        updatedAppt = formatAppointmentObject({ id: appointmentId, ...patch }, effectiveUserId, effectiveTenantId);
        updated.unshift(updatedAppt);
    }

    saveLocalAppointments(effectiveUserId, updated);

    // 2. Synchronisation Firestore distante dans les deux emplacements
    try {
        if (db) {
            const userDocRef = doc(db, 'users', effectiveUserId, 'agenda_events', appointmentId);
            await setDoc(userDocRef, {
                ...updatedAppt,
                updatedAt: serverTimestamp()
            }, { merge: true });

            const rootDocRef = doc(db, 'agenda_events', appointmentId);
            await setDoc(rootDocRef, {
                ...updatedAppt,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
    } catch (e) {
        console.error('Firestore updateAppointment error:', e);
    }

    return updatedAppt;
};

/**
 * Supprime un rendez-vous
 */
export const deleteAppointment = async (appointmentId, userId, tenantId = 'green-invest') => {
    const effectiveUserId = userId || 'default_user';
    if (!appointmentId || !effectiveUserId || effectiveUserId === 'default_user') return;

    // 1. Suppression optimiste locale immédiate (0 ms)
    const current = getLocalAppointments(effectiveUserId);
    const updated = current.filter(item => item.id !== appointmentId);
    saveLocalAppointments(effectiveUserId, updated);

    // 2. Suppression Firestore distante
    try {
        if (db) {
            const userDocRef = doc(db, 'users', effectiveUserId, 'agenda_events', appointmentId);
            await deleteDoc(userDocRef);

            const rootDocRef = doc(db, 'agenda_events', appointmentId);
            await deleteDoc(rootDocRef);
        }
    } catch (e) {
        console.error('Firestore deleteAppointment error:', e);
    }
};

/**
 * Trie chronologiquement une liste de rendez-vous
 */
const sortAppointmentsChronologically = (list) => {
    return [...list].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const dateComp = dateA.localeCompare(dateB);
        if (dateComp !== 0) return dateComp;
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
    });
};

/**
 * Écoute en temps réel les rendez-vous STRICTEMENT PERSONNELS de l'utilisateur
 * Chaque agenda est 100% privé : aucun utilisateur ni administrateur ne voit l'agenda d'un autre.
 */
export const subscribeToUserAppointments = (userOrId, tenantId = 'green-invest', callback) => {
    const effectiveUserId = typeof userOrId === 'object' ? (userOrId?.uid || userOrId?.id) : userOrId;
    const userEmail = typeof userOrId === 'object' ? (userOrId?.email || '') : '';
    const isYann = isYannUser(userEmail);

    if (!effectiveUserId || effectiveUserId === 'default_user') {
        callback([]);
        return () => { };
    }

    // 1. Délivrer instantanément le cache local personnel et assaini (0 ms)
    const initialLocal = getLocalAppointments(effectiveUserId, userEmail);
    callback(sortAppointmentsChronologically(initialLocal));

    // 2. Écouteur de synchronisation locale intra-fenêtre
    const handleLocalSync = (e) => {
        if (e.detail && e.detail.userId === effectiveUserId && Array.isArray(e.detail.appointments)) {
            callback(sortAppointmentsChronologically(e.detail.appointments));
        } else if (!e.detail || e.detail.userId === effectiveUserId) {
            const fresh = getLocalAppointments(effectiveUserId, userEmail);
            callback(sortAppointmentsChronologically(fresh));
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener(AGENDA_SYNC_EVENT, handleLocalSync);
    }

    if (!db) {
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener(AGENDA_SYNC_EVENT, handleLocalSync);
        };
    }

    // 3. Écouteurs Firestore temps réel strictement isolés pour cet utilisateur
    try {
        let userSubList = [];
        let rootQueryList = [];

        const processAndNotify = () => {
            const map = new Map();

            // Priorité 1 : sous-collection privée /users/{userId}/agenda_events
            userSubList.forEach(item => {
                if (!item || !item.id) return;
                if (!isYann && isYannEvent(item.title)) {
                    // Supprimer toute copie parasite de Yann ayant pollué la collection de Malick ou d'un autre
                    deleteDoc(doc(db, 'users', effectiveUserId, 'agenda_events', item.id)).catch(() => {});
                    return;
                }
                map.set(item.id, item);
            });

            // Priorité 2 : collection racine agenda_events pour ce userId
            rootQueryList.forEach(item => {
                if (!item || !item.id) return;
                if (!isYann && isYannEvent(item.title)) {
                    // Supprimer le document erroné dans la collection racine
                    deleteDoc(doc(db, 'agenda_events', item.id)).catch(() => {});
                    return;
                }
                if (!map.has(item.id)) {
                    map.set(item.id, item);
                    // Rapatrier dans la sous-collection isolée
                    setDoc(doc(db, 'users', effectiveUserId, 'agenda_events', item.id), item, { merge: true }).catch(() => {});
                }
            });

            const cleanList = sortAppointmentsChronologically(Array.from(map.values()));
            saveLocalAppointments(effectiveUserId, cleanList);
            callback(cleanList);
        };

        // Écouteur sous-collection isolée /users/{userId}/agenda_events
        const unsubUserSub = onSnapshot(
            collection(db, 'users', effectiveUserId, 'agenda_events'),
            (snapshot) => {
                userSubList = snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        ...data,
                        id: d.id,
                        userId: effectiveUserId,
                        date: normalizeDateString(data.date),
                    };
                });
                processAndNotify();
            },
            (err) => {
                console.warn('Erreur abonnement sous-collection agenda personnel:', err);
            }
        );

        // Écouteur collection racine filtré strictement par userId
        const qRoot = query(
            collection(db, 'agenda_events'),
            where('userId', '==', effectiveUserId)
        );

        const unsubRoot = onSnapshot(
            qRoot,
            (snapshot) => {
                rootQueryList = snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        ...data,
                        id: d.id,
                        userId: effectiveUserId,
                        date: normalizeDateString(data.date),
                    };
                });
                processAndNotify();
            },
            (err) => {
                console.warn('Erreur abonnement racine agenda personnel:', err);
                const fallbackList = getLocalAppointments(effectiveUserId, userEmail);
                callback(sortAppointmentsChronologically(fallbackList));
            }
        );

        return () => {
            if (typeof window !== 'undefined') window.removeEventListener(AGENDA_SYNC_EVENT, handleLocalSync);
            unsubUserSub();
            unsubRoot();
        };
    } catch (e) {
        console.warn('Échec initialisation écouteurs agenda personnel:', e);
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener(AGENDA_SYNC_EVENT, handleLocalSync);
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
