// Vercel Serverless Function pour proxifier les appels aux données entreprises (SIRENE, MELODI, URSSAF)
// Utilise l'API Recherche Entreprises (Gouvernement Français) qui agrège ces données.

export default async function handler(req, res) {
    // Autoriser CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600'); // Cache for 1h on Edge

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { lat, lon, radius = 5, per_page = 50, q = '', near = '0' } = req.query;
        
        let baseUrl = "https://recherche-entreprises.api.gouv.fr/search?";
        const params = new URLSearchParams();

        // Si near=1, on utilise l'endpoint near_point (plus précis pour la carte)
        if (near === '1' && lat && lon) {
            baseUrl = "https://recherche-entreprises.api.gouv.fr/near_point?";
            params.append('lat', lat);
            params.append('long', lon); // Longitude s'écrit "long" pour cet endpoint
            params.append('radius', radius);
        } else {
            // Sinon recherche standard par mot-clé ou géo-search standard
            if (q) params.append('q', q);
            if (lat && lon) {
                params.append('lat', lat);
                params.append('lon', lon);
                params.append('radius', radius);
            }
        }

        // Sanitize and cap per_page (Max 25 for near_point)
        const perPageValue = Math.min(parseInt(per_page) || 20, 20);
        params.append('per_page', perPageValue.toString());
        params.append('limite_matching', 'true');
        params.append('etat_administratif', 'A'); // Uniquement les entreprises actives

        const url = baseUrl + params.toString();
        console.log(`[PROXY MELODI/SIRENE] Fetching: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'NelsonPV-App/1.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PROXY ERROR] ${response.status}: ${errorText}`);
            res.status(response.status).json({
                error: `Sirene API error: ${response.status}`,
                details: errorText
            });
            return;
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
