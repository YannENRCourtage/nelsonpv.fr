// Notification Bell Component
import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
    subscribeToNotifications,
    markNotificationAsRead
} from '@/services/firebase/comments.service.js';

export default function NotificationBell() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Subscribe to real-time notifications
        const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
            setNotifications(notifs);

            // Check last seen time to calculate red badge count
            const lastSeenRaw = localStorage.getItem(`notifs_seen_${user.uid}`);
            const lastSeenTime = lastSeenRaw ? parseInt(lastSeenRaw, 10) : 0;

            const count = notifs.filter(n => {
                if (n.read) return false;
                if (!n.createdAt) return true;
                const time = n.createdAt.toDate ? n.createdAt.toDate().getTime() : new Date(n.createdAt).getTime();
                // We add a small 1000ms buffer to lastSeenTime to avoid precision issues
                return time > lastSeenTime + 1000;
            }).length;

            setUnreadCount(count);
        });

        return () => unsubscribe();
    }, [user]);

    const handleBellClick = async () => {
        const willShow = !showDropdown;
        setShowDropdown(willShow);

        if (willShow) {
            // Dismiss the red notification badge
            localStorage.setItem(`notifs_seen_${user.uid}`, Date.now().toString());
            setUnreadCount(0);

            // Mark all current unread notifications as read so they are no longer bold
            const unreadNotifs = notifications.filter(n => !n.read);
            if (unreadNotifs.length > 0) {
                try {
                    const { apiService } = await import('@/services/api');
                    await apiService.markNotificationsAsRead(user.uid, unreadNotifs.map(n => n.id));
                } catch (err) {
                    console.error("Failed to mark all as read", err);
                }
            }
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
        }

        setShowDropdown(false);

        // 1. URL explicite stockée dans la notification
        if (notification.url) {
            navigate(notification.url);
            return;
        }

        // 2. Contexte Monday explicite (nouvelles notifications)
        if (notification.context === 'monday' || notification.type === 'monday_comment' || notification.type === 'monday_update' || notification.tableId) {
            const tableParam = notification.tableId ? `table=${notification.tableId}&` : '';
            const rowParam = notification.rowId || notification.projectId;
            navigate(`/monday?${tableParam}rowId=${rowParam}`);
            return;
        }

        // 3. Cas historique / legacy (notification.projectId)
        if (notification.projectId) {
            const targetId = notification.projectId;

            // Vérifier en base si targetId correspond à un projet CRM
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/config/firebase.js');
                const projectSnap = await getDoc(doc(db, 'projects', targetId));
                if (projectSnap.exists()) {
                    navigate(`/project/${targetId}/edit`);
                    return;
                }
            } catch (err) {
                console.warn("[NotificationBell] Erreur vérification projet:", err);
            }

            // S'il n'existe pas dans les projets CRM, il s'agit d'une ligne du tableau Monday
            navigate(`/monday?rowId=${targetId}`);
            return;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes}min`;
        if (hours < 24) return `Il y a ${hours}h`;
        return `Il y a ${days}j`;
    };

    return (
        <div className="relative">
            {/* Style inline pour l'animation de secouement dynamique de la cloche */}
            <style>{`
                @keyframes nelsonBellRing {
                    0%, 100% { transform: rotate(0deg); }
                    10% { transform: rotate(22deg); }
                    20% { transform: rotate(-20deg); }
                    30% { transform: rotate(16deg); }
                    40% { transform: rotate(-14deg); }
                    50% { transform: rotate(10deg); }
                    60% { transform: rotate(-8deg); }
                    70% { transform: rotate(4deg); }
                    80% { transform: rotate(0deg); }
                }
                .bell-dynamic-ring {
                    animation: nelsonBellRing 1.8s infinite ease-in-out;
                    transform-origin: top center;
                }
            `}</style>
            <button
                onClick={handleBellClick}
                className={`relative p-2 rounded-lg transition-all ${
                    unreadCount > 0
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 ring-1 ring-amber-200'
                        : 'hover:bg-gray-100 text-gray-700'
                }`}
                title={unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Notifications'}
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'bell-dynamic-ring text-amber-600' : 'text-gray-700'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-600 text-white text-[10px] font-bold shadow-md">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Notifications</h3>
                            <button
                                onClick={() => setShowDropdown(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Aucune notification</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm break-words ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatTime(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
