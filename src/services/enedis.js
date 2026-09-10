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
   * Récupère les données de consommation d'un PRM (après consentement ou mandat)
   * @param {Object} params { projectId, prm, startDate?, endDate?, forceRefresh?, env? }
   */
  async fetchData({ projectId, prm, startDate, endDate, forceRefresh, env }) {
    try {
      const response = await axios.get('/api/enedis/fetch', {
        params: { projectId, prm, startDate, endDate, forceRefresh, env }
      });
      return response.data;
    } catch (error) {
      console.error('[Enedis Service] Error fetching data:', error);
      if (error.response?.status === 404) {
        throw new Error('Aucun consentement Enedis trouvé. Veuillez autoriser l\'accès d\'abord.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expirée. Veuillez vous reconnecter à votre Espace Client Enedis.');
      } else if (error.response?.status === 403) {
        throw new Error('Accès refusé ou scope insuffisant. Renouvelez le consentement ou le mandat.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Erreur lors de la récupération des données.');
      }
    }
  },

  /**
   * Déclare un mandat tiers signé (sans obliger le client à se connecter à Enedis)
   */
  async declareMandate(payload) {
    try {
      const response = await axios.post('/api/enedis/declare-mandate', payload);
      return response.data;
    } catch (error) {
      console.error('[Enedis Service] Error declaring mandate:', error);
      throw new Error(error.response?.data?.error || error.message || 'Échec de la déclaration du mandat');
    }
  },

  /**
   * Récupère la courbe de charge (au pas de 10 ou 30 minutes) sur une période
   */
  async getLoadCurve({ prm, start, end, env = 'production' }) {
    try {
      const response = await axios.get('/api/enedis/load-curve', {
        params: { prm, start, end, env }
      });
      return response.data;
    } catch (error) {
      console.error('[Enedis Service] Error fetching load curve:', error);
      throw new Error(error.response?.data?.error || error.message || 'Échec de la récupération de la courbe de charge');
    }
  },

  /**
   * Recherche un PRM par adresse postale et croisement avec le nom d'entreprise (Anti-doublon)
   */
  async searchPrm({
    address = '',
    streetNumber = '',
    streetName = '',
    zip = '',
    city = '',
    complement = '',
    companyName = '',
    clientName = '',
    meterSerial = '',
    predecessor = '',
    projectId = '',
    env = 'production',
    autoSave = true
  } = {}) {
    try {
      const response = await axios.post('/api/enedis/search-prm', {
        address,
        streetNumber,
        streetName,
        zip,
        city,
        complement,
        companyName,
        clientName,
        meterSerial,
        predecessor,
        projectId,
        env,
        autoSave
      });
      return response.data;
    } catch (error) {
      console.error('[Enedis Service] Error searching PRM:', error);
      throw new Error(error.response?.data?.error || error.message || 'Échec de la recherche du PRM');
    }
  },

  /**
   * Initie une demande de signature de mandat via l'un des 4 canaux (email, sms, whatsapp, tablet)
   */
  async initiateSignature(payload) {
    try {
      const response = await axios.post('/api/signature/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('[Enedis Service] Error initiating signature:', error);
      throw new Error(error.response?.data?.error || error.message || 'Échec de l\'initiation de la signature');
    }
  }
};

export default enedisService;
