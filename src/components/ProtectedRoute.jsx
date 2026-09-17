import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { isShantiOneAuthorized } from '@/services/firebase/auth.service.js';

export const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // You could show a loading spinner here
        return <div>Chargement...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        // Redirect to home if user doesn't have the required role
        return <Navigate to="/" replace />;
    }

    if (requiredPermission) {
        const { activeTenantId } = useAuth(); // Access current tenant
        const isAdmin = user?.role === 'admin' || user?.role === 'Administrator';
        const isLaurentGuyon = (user?.firstName?.toLowerCase().includes('laurent') && user?.lastName?.toLowerCase().includes('guyon')) || user?.email?.toLowerCase().includes('guyon');
        
        // Custom logic for tracking page specifically
        if (requiredPermission === 'canAccessTracking') {
            const isDelphineBarde = (user?.firstName?.toLowerCase().includes('delphine') && user?.lastName?.toLowerCase().includes('barde')) || user?.email?.toLowerCase().includes('barde');
            const hasTrackingPerm = Boolean(isAdmin || user?.permissions?.[requiredPermission] === true || user?.[requiredPermission] === true || isLaurentGuyon || isDelphineBarde);
            
            if (!hasTrackingPerm) {
                return <Navigate to="/" replace />;
            }

            const userTenant = user?.tenantId || user?.activeTenantId || user?.tenant;
            const isGreenInvest = activeTenantId === 'green-invest' || userTenant === 'green-invest' || !activeTenantId;
            if (!isGreenInvest && !isAdmin) {
                return <Navigate to="/" replace />;
            }
        } else if (requiredPermission === 'canAccessShantiOne') {
            if (!isShantiOneAuthorized(user)) {
                return <Navigate to="/" replace />;
            }
        } else {
            // General permission check
            const hasPermission = isAdmin || (user?.permissions?.[requiredPermission] === true);
            if (!hasPermission) {
                console.log(`Access denied: User ${user?.email} does not have permission ${requiredPermission}`, user?.permissions);
                return <Navigate to="/" replace />;
            }
        }
    }

    return children;
};
