/**
 * Service for interacting with the IGN Isochrone/Isodistance API
 * via the backend proxy.
 */
class IsochroneService {
    /**
     * Fetch an isochrone or isodistance GeoJSON from IGN
     * 
     * @param {Object} params
     * @param {string} params.point - Coordinates in "long,lat" format (e.g., "2.337306,48.849319")
     * @param {string} params.resource - Resource ID (e.g., "bdtopo-valhalla")
     * @param {number} params.costValue - Travel time (minutes) or distance (meters)
     * @param {string} params.costType - "duration" or "distance"
     * @param {string} [params.profile] - "car" or "pedestrian"
     * @returns {Promise<Object>} GeoJSON FeatureCollection
     */
    async getIsochrone(params) {
        try {
            const queryParams = new URLSearchParams({
                point: params.point,
                resource: params.resource || 'bdtopo-valhalla',
                costValue: params.costValue,
                costType: params.costType || 'duration',
                profile: params.profile || 'car',
                direction: 'departure',
                crs: 'EPSG:4326',
                format: 'geojson'
            });

            const response = await fetch(`/api/proxies/isochrone?${queryParams.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('IsochroneService Error:', error);
            throw error;
        }
    }
}

export const isochroneService = new IsochroneService();
export default isochroneService;
