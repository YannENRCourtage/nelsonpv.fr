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
            const url = `${this.baseUrl}/parcelle?geom=${encodeURIComponent(geom)}`;

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
}

export const cadastreService = new CadastreService();
