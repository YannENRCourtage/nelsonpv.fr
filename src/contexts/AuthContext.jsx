import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '@/services/firebase/auth.service.js';

const AuthContext = createContext(null);

const DEFAULT_TENANT = 'green-invest';
const TENANT_LS_KEY = 'nelson:activeTenantId';

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState(() => {
    try { return localStorage.getItem(TENANT_LS_KEY) || DEFAULT_TENANT; } catch { return DEFAULT_TENANT; }
  });

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = authService.onAuthChange((userData) => {
      if (userData) {
        // --- OVERRIDE DU COMPTE 'CONTACT' ---
        // Le compte contact@enr-courtage.fr est forcement 'user' et sans accès Admin/Simulateur
        if (userData.email === 'contact@enr-courtage.fr') {
          console.log("Applying strict restrictions to contact@enr-courtage.fr");
          userData.role = 'user';
          userData.permissions = {
            ...userData.permissions,
            canAccessSimulator: false,
            canAccessAdmin: false,
            canAccessCRM: true, // Conserve l'accès CRM
          };
        }
        // ------------------------------------

        // --- GESTION ACCÈS CONFIGURATEUR ---
        const CONFIGURATOR_USERS = [
          'contact@enr-courtage.fr',
          'elodievinet17@gmail.com',
          'jack.luc@icloud.com',
          'n.bachevalier@enr-courtage.fr'
        ];

        const userEmail = userData.email?.toLowerCase();

        if (
          (userEmail && CONFIGURATOR_USERS.includes(userEmail)) ||
          userData.role === 'admin' ||
          userData.permissions?.canAccessConfigurator === true ||
          userData.permissions?.canAccessConfigurateur === true
        ) {
          userData.permissions = {
            ...(userData.permissions || {}),
            canAccessConfigurator: true
          };
        }
        // ------------------------------------

        setUser(userData);
        setIsAuthenticated(true);

        // For non-admin users, lock the tenant to their own tenantId
        if (userData.role !== 'admin') {
          const userTenant = userData.tenantId || DEFAULT_TENANT;
          setActiveTenantId(userTenant);
          try { localStorage.setItem(TENANT_LS_KEY, userTenant); } catch { }
        } else {
          // For admins: restore from localStorage or default
          const stored = (() => { try { return localStorage.getItem(TENANT_LS_KEY); } catch { return null; } })();
          setActiveTenantId(stored || DEFAULT_TENANT);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const userData = await authService.signIn(email, password);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  /** Switch tenant (admins only) */
  const switchTenant = useCallback((tenantId) => {
    if (!tenantId) return;
    setActiveTenantId(tenantId);
    try { localStorage.setItem(TENANT_LS_KEY, tenantId); } catch { }
  }, []);

  // Helper functions for permission checks
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions[permission] === true;
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const canAccessCRM = () => {
    return isAdmin() || hasPermission('canAccessCRM');
  };

  const canAccessEditor = () => {
    return isAdmin() || hasPermission('canAccessEditor');
  };

  const canAccessSimulator = () => {
    return isAdmin() || hasPermission('canAccessSimulator');
  };

  const canViewAllProjects = () => {
    return isAdmin() || hasPermission('canViewAllProjects');
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    // Tenant management
    activeTenantId,
    switchTenant,
    // Permission helpers
    hasPermission,
    isAdmin,
    canAccessCRM,
    canAccessEditor,
    canAccessSimulator,
    canViewAllProjects,
    canAccessConfigurator: () => hasPermission('canAccessConfigurator')
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};