// Vercel Serverless Function pour proxifier les appels à l'API PVGIS
// Cela permet de contourner les restrictions CORS du navigateur

export default async function handler(req, res) {
    // Autoriser CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Gérer les requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Seules les requêtes GET sont autorisées
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Construire l'URL PVGIS avec les paramètres de la requête
        const params = new URLSearchParams(req.query);
        const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${params.toString()}`;

        console.log('Proxying request to PVGIS:', pvgisUrl);

        // Faire l'appel à l'API PVGIS
        const response = await fetch(pvgisUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'NelsonPV-App/1.0'
            }
        });

        // Vérifier si la réponse est OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('PVGIS API error:', response.status, errorText);
            res.status(response.status).json({
                error: `PVGIS API error: ${response.status}`,
                details: errorText
            });
            return;
        }

        // Récupérer les données JSON
        const data = await response.json();

        // Retourner les données avec les bons headers CORS
        res.status(200).json(data);

    } catch (error) {
        console.error('Error proxying PVGIS request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
