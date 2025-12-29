export default async function handler(request, response) {
    // Enable CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { lat, lon, peakpower, loss, angle, aspect } = request.query;

        // Validation
        if (!lat || !lon) {
            return response.status(400).json({ error: 'Latitude and longitude are required' });
        }

        // Construire l'URL de l'API PVGIS
        const params = new URLSearchParams({
            lat: lat,
            lon: lon,
            peakpower: peakpower || 100,
            loss: loss || 14,
            angle: angle || 30,
            aspect: aspect || 0,
            outputformat: 'json'
        });

        const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${params}`;

        // Appel à l'API PVGIS depuis le serveur
        const apiResponse = await fetch(pvgisUrl);

        if (!apiResponse.ok) {
            return response.status(apiResponse.status).json({
                error: `PVGIS API error: ${apiResponse.status}`,
                details: await apiResponse.text()
            });
        }

        const data = await apiResponse.json();

        // Retourner les données
        return response.status(200).json(data);

    } catch (error) {
        console.error('PVGIS proxy error:', error);
        return response.status(500).json({
            error: 'Failed to fetch PVGIS data',
            message: error.message
        });
    }
}
