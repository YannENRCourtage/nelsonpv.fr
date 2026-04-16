import axios from 'axios';

const enedisService = {
  /**
   * Start the OAuth2 consent flow
   * @param {string} projectId 
   */
  initiateAuth(projectId) {
    if (!projectId) throw new Error('Project ID is required');
    // Open in a new tab to preserve the user's current project context
    window.open(`/api/enedis/auth?projectId=${projectId}`, '_blank', 'noopener,noreferrer');
  },

  /**
   * Directly get the authorize URL for display or redirection
   * @param {string} projectId 
   */
  getAuthorizeUrl(projectId) {
    // In production, this would be the Enedis Data Connect URL
    // We use our backend to proxy and inject client_id securely
    return `/api/enedis/auth?projectId=${projectId}`;
  },

  /**
   * Fetch PRM numbers (usage points) for a project after consent
   * @param {string} projectId 
   */
  async fetchPrms(projectId) {
    try {
      const response = await axios.get('/api/enedis/prms', {
        params: { projectId }
      });
      return response.data; // Expected: { prms: ['...', '...'] }
    } catch (error) {
      console.error('Error fetching PRMs:', error);
      throw new Error(error.response?.data?.error || 'Impossible de récupérer la liste des PRM.');
    }
  },

  /**
   * Fetch consumption data for a project or PRM
   * @param {Object} params { projectId, prm }
   */
  async fetchData({ projectId, prm }) {
    try {
      const response = await axios.get('/api/enedis/fetch', {
        params: { projectId, prm }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Enedis data:', error);
      if (error.response?.status === 404) {
        throw new Error('Aucun consentement Enedis trouvé. Veuillez autoriser l\'accès d\'abord.');
      } else if (error.response?.status === 403) {
        throw new Error('Accès refusé ou expiré. Renouvelez le consentement.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Erreur lors de la récupération des données.');
      }
    }
  }
};

export default enedisService;
