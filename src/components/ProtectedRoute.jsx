import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

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
        const hasPermission = user?.permissions?.[requiredPermission] === true;
        if (!hasPermission) {
            console.log(`Access denied: User ${user?.email} does not have permission ${requiredPermission}`, user?.permissions);
            return <Navigate to="/" replace />;
        }
    }

    return children;
};
