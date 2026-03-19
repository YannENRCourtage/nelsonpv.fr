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
        const { lat, lon, radius = 5, per_page = 50, q = '', near = '0', action = 'search', sector = '' } = req.query;
        
        // --- ACTION : SEARCH / GEO-SEARCH (SIRENE/MELODI) ---
        if (action === 'search') {
            let baseUrl = "https://recherche-entreprises.api.gouv.fr/search?";
            const params = new URLSearchParams();

            if (near === '1' && lat && lon) {
                baseUrl = "https://recherche-entreprises.api.gouv.fr/near_point?";
                params.append('lat', lat);
                params.append('long', lon);
                params.append('radius', radius);
            } else {
                if (q) params.append('q', q);
                if (lat && lon) {
                    params.append('lat', lat);
                    params.append('lon', lon);
                    params.append('radius', radius);
                }
            }

            const perPageValue = Math.min(parseInt(per_page) || 20, 20);
            params.append('per_page', perPageValue.toString());
            params.append('limite_matching', 'true');
            params.append('etat_administratif', 'A');

            const url = baseUrl + params.toString();
            console.log(`[PROXY SEARCH] Fetching: ${url}`);
            const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'NelsonPV-App/1.0' } });
            if (!response.ok) return res.status(response.status).json({ error: `Sirene error: ${response.status}` });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // --- ACTION : CONSUMPTION (ENEDIS OPEN DATA) ---
        if (action === 'consumption') {
            // On cherche la consommation moyenne par secteur ou code NAF
            const enedisUrl = `https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/consommation-electrique-par-secteur-d-activite/records?limit=1&where=nom_secteur%20like%20%22${encodeURIComponent(sector)}%22`;
            console.log(`[PROXY ENEDIS] Fetching: ${enedisUrl}`);
            const response = await fetch(enedisUrl);
            if (!response.ok) return res.status(response.status).json({ error: `Enedis error: ${response.status}` });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // --- ACTION : CAPARESEAU (ODRÉ / S3REnR) ---
        if (action === 'capareseau') {
            const { dataset, where } = req.query;
            const odreUrl = `https://opendata.reseaux-energies.fr/api/explore/v2.1/catalog/datasets/${dataset}/records?limit=100&where=${encodeURIComponent(where)}`;
            console.log(`[PROXY CAPARESEAU] Fetching: ${odreUrl}`);
            const response = await fetch(odreUrl);
            if (!response.ok) return res.status(response.status).json({ error: `ODRE error: ${response.status}` });
            const data = await response.json();
            return res.status(200).json(data);
        }

        res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
