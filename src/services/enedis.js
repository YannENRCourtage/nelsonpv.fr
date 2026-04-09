import axios from 'axios';

const enedisService = {
  /**
   * Start the OAuth2 consent flow
   * @param {string} projectId 
   */
  initiateAuth(projectId) {
    if (!projectId) throw new Error('Project ID is required');
    window.location.href = `/api/enedis/auth?projectId=${projectId}`;
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
      throw error;
    }
  }
};

export default enedisService;
