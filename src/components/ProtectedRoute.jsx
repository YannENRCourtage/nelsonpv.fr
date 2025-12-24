// Protected Route Component for Role-Based Access Control
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

/**
 * ProtectedRoute component that checks authentication and permissions
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.requiredRole - Required role ('admin' or 'user')
 * @param {string} props.requiredPermission - Required permission key (e.g., 'canAccessCRM')
 * @param {string} props.redirectTo - Path to redirect if unauthorized (default: '/login')
 */
export const ProtectedRoute = ({
    children,
    requiredRole = null,
    requiredPermission = null,
    redirectTo = '/login'
}) => {
    const { isAuthenticated, user, isAdmin, hasPermission, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    // Check role requirement
    if (requiredRole === 'admin' && !isAdmin()) {
        return <Navigate to="/" replace />;
    }

    // Check permission requirement
    if (requiredPermission && !isAdmin() && !hasPermission(requiredPermission)) {
        return <Navigate to="/" replace />;
    }

    return children;
};
