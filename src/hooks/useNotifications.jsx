import { useState, useEffect, useCallback } from 'react';

    const LS_NOTIFICATIONS_KEY = "nelson:notifications:v1";

    const useNotifications = () => {
        const [notifications, setNotifications] = useState([]);
        const [hasUnread, setHasUnread] = useState(false);

        useEffect(() => {
            try {
                const stored = localStorage.getItem(LS_NOTIFICATIONS_KEY);
                const loadedNotifications = stored ? JSON.parse(stored) : [];
                setNotifications(loadedNotifications);
                setHasUnread(loadedNotifications.some(n => !n.read));
            } catch (error) {
                console.error("Failed to load notifications:", error);
                setNotifications([]);
            }
        }, []);

        const addNotification = useCallback((notification) => {
            setNotifications(prev => {
                const newNotifications = [{ ...notification, id: Date.now(), read: false, date: new Date().toISOString() }, ...prev];
                try {
                    localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(newNotifications));
                } catch (error) {
                    console.error("Failed to save notification:", error);
                }
                setHasUnread(true);
                return newNotifications;
            });
        }, []);

        const markAllAsRead = useCallback(() => {
            setNotifications(prev => {
                const updated = prev.map(n => ({ ...n, read: true }));
                try {
                    localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(updated));
                } catch (error) {
                    console.error("Failed to mark notifications as read:", error);
                }
                setHasUnread(false);
                return updated;
            });
        }, []);

        return { notifications, hasUnread, addNotification, markAllAsRead };
    };

    export default useNotifications;