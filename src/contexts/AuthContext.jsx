import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

const LS_USERS_KEY = 'nelson:users:v1';

const defaultUsers = {
  'contact@enr-courtage.fr': {
    password: 'NELSONENR2025',
    name: 'Admin ENR',
    role: 'admin',
    photoUrl: null,
    pageAccess: { projects: true, crm: true, admin: true },
  },
  'yann@enr.fr': {
    password: 'nelson',
    name: 'Yann',
    role: 'user',
    photoUrl: null,
    pageAccess: { projects: true, crm: true, admin: false },
  },
};

function loadUsers() {
  try {
    const storedUsers = localStorage.getItem(LS_USERS_KEY);
    if (storedUsers) {
      return JSON.parse(storedUsers);
    }
  } catch (e) {
    console.error("Failed to load users from localStorage", e);
  }
  // Set default users if none are stored
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState(loadUsers);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error("Failed to read auth status from sessionStorage", e);
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Try API authentication first
      const response = await fetch(`${apiService.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        sessionStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.log('API auth failed, trying fallback localStorage auth');
    }

    // Fallback to localStorage (for backwards compatibility)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const allUsers = loadUsers();
        const potentialUser = allUsers[email];
        if (potentialUser && potentialUser.password === password) {
          const userData = { email, name: potentialUser.name, role: potentialUser.role, photoUrl: potentialUser.photoUrl, pageAccess: potentialUser.pageAccess };
          setUser(userData);
          setIsAuthenticated(true);
          try {
            sessionStorage.setItem('user', JSON.stringify(userData));
          } catch (e) {
            console.error("Failed to write auth status to sessionStorage", e);
          }
          resolve(userData);
        } else {
          reject(new Error('Email ou mot de passe incorrect'));
        }
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('user');
    } catch (e) {
      console.error("Failed to remove auth status from sessionStorage", e);
    }
  };

  const updateUserList = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(newUsers));
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    users,
    updateUserList,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};