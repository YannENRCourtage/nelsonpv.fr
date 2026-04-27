/**
 * Service pour interagir avec l'API Cadastre de l'IGN (Apicarto).
 */
class CadastreService {
    constructor() {
        this.baseUrl = 'https://apicarto.ign.fr/api/cadastre';
    }

    /**
     * Récupère les références cadastrales pour un point donné (lat, lng).
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     * @returns {Promise<Object>} Les informations parcellaires
     */
    async getParcelle(lat, lng) {
        try {
            const geom = JSON.stringify({ type: "Point", coordinates: [lng, lat] });
            const url = `${this.baseUrl}/parcelle?geom=${encodeURIComponent(geom)}&source_ign=BDP`;

            const response = await fetch(url);
            if (!response.ok) {
              if (response.status === 404) return null;
              throw new Error(`Erreur API Cadastre: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && data.features && data.features.length > 0) {
                const props = data.features[0].properties;
                return {
                    section: props.section,
                    numero: props.numero,
                    code_departement: props.code_dep,
                    code_commune: props.code_com,
                    nom_commune: props.nom_com,
                    contenance: props.contenance, // Surface en m²
                    prefixe: props.prefixe || '000'
                };
            }
            return null;
        } catch (error) {
            console.error("CadastreService Error:", error);
            throw error;
        }
    }
    /**
     * Récupère les informations de contact de la mairie via l'API Établissements Publics.
     * @param {string} codeInsee Code INSEE de la commune
     * @returns {Promise<Object>} Détails de la mairie
     */
    async fetchMairie(codeInsee) {
        try {
            const url = `https://etablissements-publics.api.gouv.fr/v3/communes/${codeInsee}/mairie`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.features && data.features.length > 0) {
                const props = data.features[0].properties;
                return {
                    nom: props.nom,
                    email: props.email,
                    telephone: props.telephone,
                    adresse: props.adresses?.[0]?.lignes?.[0] || '',
                    code_postal: props.adresses?.[0]?.codePostal || '',
                    commune: props.adresses?.[0]?.commune || '',
                    horaires: props.horaires || []
                };
            }
            return null;
        } catch (error) {
            console.error("fetchMairie Error:", error);
            return null;
        }
    }
}

export const cadastreService = new CadastreService();
