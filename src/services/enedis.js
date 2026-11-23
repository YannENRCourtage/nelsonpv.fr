import axios from 'axios';

/**
 * Normalise une réponse de mesure Enedis (format Mesure synchrone V2 `grandeur[].points[]`
 * ou ancien format Metering Data V5 `meter_reading.interval_reading[]`) en tableau `[{ date, value }]`
 * exprimé dans l'unité canonique (Wh, W, VA).
 */
export function parseEnedisMeasureIntervals(apiResult) {
  if (!apiResult || apiResult.error) return [];

  // 1. Priorité au tableau normalisé interval_reading (présent en V2 adaptateur et V5)
  const v5Readings = apiResult?.meter_reading?.interval_reading;
  if (Array.isArray(v5Readings) && v5Readings.length > 0) {
    return v5Readings
      .map(r => ({
        date: (r.date || r.d || '').toString(),
        value: parseFloat(r.value ?? r.v ?? 0)
      }))
      .filter(r => r.date && !isNaN(r.value));
  }

  // 2. Lecture directe du format Mesure synchrone V2 : grandeur[].points[]
  const grandeurs = Array.isArray(apiResult.grandeur)
    ? apiResult.grandeur
    : (Array.isArray(apiResult.grandeurs) ? apiResult.grandeurs : null);

  if (grandeurs && grandeurs.length > 0) {
    const g = grandeurs.find(item => Array.isArray(item.points) && item.points.length > 0) || grandeurs[0];
    if (Array.isArray(g?.points) && g.points.length > 0) {
      const unit = (g.unite || '').toString().trim().toUpperCase();
      const multiplier = (unit === 'KWH' || unit === 'KW' || unit === 'KVA') ? 1000 : 1;
      return g.points
        .map(pt => ({
          date: (pt.date || pt.d || pt.horodate || '').toString(),
          value: parseFloat(pt.valeur ?? pt.value ?? pt.v ?? 0) * multiplier
        }))
        .filter(r => r.date && !isNaN(r.value));
    }
  }

  return [];
}

const enedisService = {
  parseEnedisMeasureIntervals,

  /**
   * Démarre le flux OAuth2 de consentement Enedis Data Connect (3 ans max / FranceConnect)
   * Si le PRM (14 chiffres) est connu, il est injecté dans l'URL.
   * Si le PRM n'est pas connu (cas de repli après recherche par adresse), le client s'identifie
   * via FranceConnect et Enedis renvoie automatiquement son usage_point_id au callback.
   * @param {string} projectId 
   * @param {string} prm - Numéro PRM 14 chiffres (optionnel en mode découverte FranceConnect)
   */
  initiateAuth(projectId = 'admin_test', prm = '') {
    const params = new URLSearchParams({ projectId: projectId || 'admin_test' });
    const cleanPrm = (prm || '').toString().trim();
    if (cleanPrm && cleanPrm.length === 14) params.append('prm', cleanPrm);
    window.open(`/api/enedis/auth?${params.toString()}`, '_blank', 'noopener,noreferrer');
  },

  /**
   * Retourne l'URL d'autorisation Enedis avec le PRM (si fourni)
   * @param {string} projectId 
   * @param {string} prm
   */
  getAuthorizeUrl(projectId = 'admin_test', prm = '') {
    const params = new URLSearchParams({ projectId: projectId || 'admin_test' });
    const cleanPrm = (prm || '').toString().trim();
    if (cleanPrm && cleanPrm.length === 14) params.append('prm', cleanPrm);
    return `/api/enedis/auth?${params.toString()}`;
  },

  /**
   * Récupère les données de consommation d'un PRM (après consentement ou mandat)
   * @param {Object} params { projectId, prm, startDate?, endDate?, forceRefresh?, env?, forceMandate?, annualConsumption?, peakKw?, profileKey? }
   */
  async fetchData({ projectId, prm, startDate, endDate, forceRefresh, env, forceMandate, annualConsumption, peakKw, profileKey }) {
    try {
      const response = await axios.get('/api/enedis/fetch', {
        params: { projectId, prm, startDate, endDate, forceRefresh, env, forceMandate, annualConsumption, peakKw, profileKey }
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
        const rawErr = error.response?.data?.error;
        const msg = typeof rawErr === 'string' 
          ? rawErr 
          : (rawErr?.message || rawErr?.description || error.message || 'Erreur lors de la récupération des données.');
        throw new Error(msg);
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
    citycode = '',
    inseeCode = '',
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
        citycode: citycode || inseeCode || '',
        inseeCode: inseeCode || citycode || '',
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
   * Initie une demande de signature de mandat eIDAS (génération de lien à copier ou présentiel)
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
