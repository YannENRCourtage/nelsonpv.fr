import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  getPortfoliosFromLS,
  subscribeToPortfolios,
  createPortfolio as apiCreatePortfolio,
  updatePortfolio as apiUpdatePortfolio,
  deletePortfolio as apiDeletePortfolio,
  isUserAdmin,
  DEFAULT_PORTFOLIOS
} from '../services/portfolioService.js';

const PortfolioContext = createContext(null);

export const usePortfolios = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    // Fallback safe au cas où le contexte n'est pas encore monté
    const fallbackList = getPortfoliosFromLS().filter(p => (p.name || '').toUpperCase() !== 'ACAMA');
    return {
      portfolios: fallbackList,
      pvPortfolios: fallbackList.filter(p => p.type === 'PV' || p.type === 'HYBRIDE'),
      bessPortfolios: fallbackList.filter(p => (p.type === 'BESS' || p.type === 'HYBRIDE') && (p.name || '').toUpperCase() !== 'ACAMA'),
      canManagePortfolios: false,
      loading: false,
      createPortfolio: async () => {},
      updatePortfolio: async () => {},
      deletePortfolio: async () => {},
      refreshPortfolios: () => {}
    };
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState(() => getPortfoliosFromLS());
  const [loading, setLoading] = useState(false);

  // Vérifier si l'utilisateur connecté est administrateur
  const canManagePortfolios = useMemo(() => isUserAdmin(user), [user]);

  // Écouter les mises à jour Firestore / localStorage
  useEffect(() => {
    const unsubscribe = subscribeToPortfolios((updatedList) => {
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setPortfolios(updatedList);
      }
    });

    const handleLocalUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPortfolios(e.detail);
      } else {
        setPortfolios(getPortfoliosFromLS());
      }
    };

    window.addEventListener('portfoliosUpdated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('portfoliosUpdated', handleLocalUpdate);
    };
  }, []);

  // Listes filtrées mémoïsées
  const pvPortfolios = useMemo(() => {
    return portfolios.filter(p => p.type === 'PV' || p.type === 'HYBRIDE');
  }, [portfolios]);

  const bessPortfolios = useMemo(() => {
    return portfolios.filter(p => (p.type === 'BESS' || p.type === 'HYBRIDE') && (p.name || '').toUpperCase() !== 'ACAMA');
  }, [portfolios]);

  // Actions d'administration
  const createPortfolio = useCallback(async (data) => {
    setLoading(true);
    try {
      const created = await apiCreatePortfolio(data, user);
      setPortfolios(prev => {
        const next = [...prev.filter(p => p.id !== created.id), created];
        return next;
      });
      return created;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePortfolio = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const updated = await apiUpdatePortfolio(id, data, user);
      setPortfolios(prev => prev.map(p => (p.id === id ? updated : p)));
      return updated;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deletePortfolio = useCallback(async (id) => {
    setLoading(true);
    try {
      await apiDeletePortfolio(id, user);
      setPortfolios(prev => prev.filter(p => p.id !== id));
      return true;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshPortfolios = useCallback(() => {
    setPortfolios(getPortfoliosFromLS());
  }, []);

  const value = {
    portfolios,
    pvPortfolios,
    bessPortfolios,
    canManagePortfolios,
    loading,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    refreshPortfolios
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export default PortfolioContext;
