import axios from 'axios';

const enedisService = {
  /**
   * Démarre le flux OAuth2 de consentement Enedis
   * IMPORTANT : le PRM doit être passé pour que la page de consentement
   * Enedis affiche les informations du client (sinon page blanche).
   * @param {string} projectId 
   * @param {string} prm - Numéro PRM 14 chiffres
   */
  initiateAuth(projectId, prm) {
    if (!projectId) throw new Error('Project ID is required');
    const params = new URLSearchParams({ projectId });
    if (prm && prm.length === 14) params.append('prm', prm);
    // Ouvre dans un nouvel onglet pour préserver le contexte du projet courant
    window.open(`/api/enedis/auth?${params.toString()}`, '_blank', 'noopener,noreferrer');
  },

  /**
   * Retourne l'URL d'autorisation Enedis avec le PRM
   * @param {string} projectId 
   * @param {string} prm
   */
  getAuthorizeUrl(projectId, prm) {
    const params = new URLSearchParams({ projectId });
    if (prm && prm.length === 14) params.append('prm', prm);
    return `/api/enedis/auth?${params.toString()}`;
  },

  /**
   * Récupère les données de consommation d'un PRM (après consentement)
   * @param {Object} params { projectId, prm, startDate?, endDate?, forceRefresh? }
   */
  async fetchData({ projectId, prm, startDate, endDate, forceRefresh }) {
    try {
      const response = await axios.get('/api/enedis/fetch', {
        params: { projectId, prm, startDate, endDate, forceRefresh }
      });
      return response.data;
    } catch (error) {
      console.error('[Enedis Service] Error fetching data:', error);
      if (error.response?.status === 404) {
        throw new Error('Aucun consentement Enedis trouvé. Veuillez autoriser l\'accès d\'abord.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expirée. Veuillez vous reconnecter à votre Espace Client Enedis.');
      } else if (error.response?.status === 403) {
        throw new Error('Accès refusé ou scope insuffisant. Renouvelez le consentement.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Erreur lors de la récupération des données.');
      }
    }
  }
};

export default enedisService;
