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
   * Fetch consumption data for a project or PRM
   * @param {Object} params { projectIdRank, prm }
   */
  async fetchData({ projectId, prm }) {
    try {
      const response = await axios.get('/api/enedis/fetch', {
        params: { projectId, prm }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Enedis data:', error);
      // Re-throw with a more user-friendly message
      if (error.response?.status === 404) {
        throw new Error('Aucun consentement Enedis trouvé pour ce projet. Veuillez vous connecter à Enedis d\'abord.');
      } else if (error.response?.status === 403) {
        throw new Error('Accès refusé. Le consentement Enedis a peut-être expiré.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Impossible de récupérer les données Enedis.');
      }
    }
  }
};

export default enedisService;
