import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '@/services/firebase/auth.service.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = authService.onAuthChange((userData) => {
      // console.log("AuthContext onAuthChange:", userData);
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

        setUser(userData);
        setIsAuthenticated(true);
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
    // Permission helpers
    hasPermission,
    isAdmin,
    canAccessCRM,
    canAccessEditor,
    canAccessSimulator,
    canViewAllProjects
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};