/**
 * Service pour interagir avec l'API Carto Urbanisme (GpU) de l'IGN.
 * Documentation: https://apicarto.ign.fr/api/doc/gpu
 */
class UrbanismeService {
    constructor() {
        this.baseUrl = 'https://apicarto.ign.fr/api/gpu';
    }

    /**
     * Récupère les informations d'urbanisme pour un point donné (lat, lng).
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     * @returns {Promise<Object>} Les informations de zonage et documents
     */
    async getInfo(lat, lng) {
        try {
            // 1. Récupérer la zone d'urbanisme (zone-urba)
            // https://apicarto.ign.fr/api/gpu/zone-urba?geom={"type":"Point","coordinates":[lng,lat]}
            const geom = JSON.stringify({ type: "Point", coordinates: [lng, lat] });
            const zoneUrl = `${this.baseUrl}/zone-urba?geom=${encodeURIComponent(geom)}`;

            const zoneRes = await fetch(zoneUrl);
            const zoneData = await zoneRes.json();

            let zones = [];
            if (zoneData && zoneData.features) {
                zones = zoneData.features.map(f => ({
                    type: f.properties.typezone || f.properties.libelle || 'Inconnu',
                    libelle: f.properties.libelle,
                    code: f.properties.libelong,
                    partition: f.properties.partitionKey
                }));
            }

            // 2. Récupérer les documents associés (document)
            // https://apicarto.ign.fr/api/gpu/document?geom={"type":"Point","coordinates":[lng,lat]}
            const docUrl = `${this.baseUrl}/document?geom=${encodeURIComponent(geom)}`;
            const docRes = await fetch(docUrl);
            const docData = await docRes.json();

            let documents = [];
            if (docData && docData.features) {
                documents = docData.features.map(f => {
                    const props = f.properties;
                    // Fallback to construct download URL if archive_url is missing
                    // Use document ID for Geoportail links
                    let dlUrl = props.archive_url;
                    if (!dlUrl && props.id) {
                        // This serves the full archive (ZIP)
                        dlUrl = `https://www.geoportail-urbanisme.gouv.fr/api/v1/document/download-by-id/${props.id}`;
                    }

                    // Also useful: Link to the 'Fiche' page for viewing without download
                    const viewUrl = props.id ? `https://www.geoportail-urbanisme.gouv.fr/document/${props.id}` : null;

                    return {
                        id: props.id,
                        type: props.du_type, // PLU, RNU, CC, POS, PSMV
                        name: props.nom,
                        commune: props.commune, // Array usually
                        status: props.etat || props.gpu_status,
                        downloadUrl: dlUrl,
                        viewUrl: viewUrl
                    };
                });
            }

            // 3. Récupérer le statut RNU de la commune si aucun document PLU/CC n'est trouvé
            // Ou utiliser l'API /municipality pour savoir si c'est au RNU.
            let isRNU = false;
            if (documents.length === 0) {
                // Check commune info
                const communeUrl = `${this.baseUrl}/municipality?geom=${encodeURIComponent(geom)}`;
                try {
                    const comRes = await fetch(communeUrl);
                    const comData = await comRes.json();
                    if (comData && comData.features && comData.features.length > 0) {
                        isRNU = comData.features[0].properties.is_rnu === true;
                    }
                } catch (e) {
                    console.warn("Failed to check RNU status", e);
                }
            }

            return {
                lat,
                lng,
                zones,
                documents,
                isRNU,
                mapUrl
            };

        } catch (error) {
            console.error("UrbanismeService Error:", error);
            throw error;
        }
    }
}

export const urbanismeService = new UrbanismeService();
