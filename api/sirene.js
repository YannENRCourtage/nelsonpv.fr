// Vercel Serverless Function pour proxifier les appels à l'API Recherche Entreprises (Sirene)
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
        const { lat, lon, radius = 5, per_page = 50, q = '' } = req.query;
        
        // Utilisation de l'API Recherche Entreprises (plus fiable et complète que l'ancienne API Sirene)
        let url = `https://recherche-entreprises.api.gouv.fr/search?`;
        
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (lat && lon) {
            params.append('lat', lat);
            params.append('lon', lon);
            params.append('radius', radius);
        }
        params.append('per_page', per_page);
        params.append('limite_matching', 'true'); // Utile pour les recherches par nom

        url += params.toString();

        console.log('Proxying request to Recherche Entreprises:', url);

        // Faire l'appel à l'API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'NelsonPV-App/1.0'
            }
        });

        // Vérifier si la réponse est OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Sirene API error:', response.status, errorText);
            res.status(response.status).json({
                error: `Sirene API error: ${response.status}`,
                details: errorText
            });
            return;
        }

        // Récupérer les données JSON
        const data = await response.json();

        // Retourner les données avec les bons headers CORS
        res.status(200).json(data);

    } catch (error) {
        console.error('Error proxying Sirene request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
} 
