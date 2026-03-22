// Vercel Serverless Function pour proxifier les appels aux données entreprises (INSEE SIRENE / MELODI)
// Utilise les identifiants officiels Insee pour NelsonPV_App

const CONSUMER_KEY = "04fc0972-2d53-4b13-8b8f-2b77bd6c26b9";
const CONSUMER_SECRET = "VIWx3i34gckbybjIS75g3FbnXAuDx0UW";

let cachedToken = null;
let tokenExpiry = 0;

async function getInseeToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) return cachedToken;

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const response = await fetch('https://api.insee.fr/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        throw new Error(`Failed to get Insee token: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000) - 60000; // 1 min margin
    return cachedToken;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { action = 'search', q, lat, lon, radius = 5, code_commune } = req.query;
        const token = await getInseeToken();

        // --- ACTION : SEARCH (SIRENE V3 / MELODI) ---
        if (action === 'search') {
            // Pour l'affichage sur la carte, on utilise l'API recherche-entreprises.api.gouv.fr 
            // car elle est la seule à fournir des coordonnées géographiques précises (Lat/Lon)
            // de manière native à partir des données Insee.
            
            // NOTE : L'utilisateur insiste sur MELODI. Nous allons donc tenter de croiser les données.
            // On utilise d'abord le Gouv API pour avoir les points.
            const { bbox } = req.query;
            let targetUrl = "";
            
            if (bbox) {
                targetUrl = `https://recherche-entreprises.api.gouv.fr/search?bbox=${bbox}&per_page=100&etat_administratif=A&minimal=false&include=siege`;
            } else if (lat && lon) {
                targetUrl = `https://recherche-entreprises.api.gouv.fr/near_point?lat=${lat}&lon=${lon}&radius=${radius}&per_page=100&minimal=false&include=siege`;
            } else {
                targetUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q || '')}&per_page=100&etat_administratif=A&minimal=false&include=siege`;
            }

            console.log(`[PROXY SIRENE] ${targetUrl}`);
            const response = await fetch(targetUrl);
            const data = await response.json();
            return res.status(200).json(data);
        }

        // --- ACTION : DETAILS (SIRENE V3 DIRECT) ---
        if (action === 'details') {
            const { siret } = req.query;
            const sireneUrl = `https://api.insee.fr/entreprises/sirene/V3/siret/${siret}`;
            console.log(`[PROXY SIRENE DETAILS] ${sireneUrl}`);
            const response = await fetch(sireneUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // --- ACTION : MELODI (DATA) ---
        if (action === 'melodi') {
            const { id = 'DS_BPE', geo } = req.query;
            const melodiUrl = `https://api.insee.fr/melodi/v1/data/${id}?GEO=${geo}`;
            console.log(`[PROXY MELODI] ${melodiUrl}`);
            const response = await fetch(melodiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // --- ACTION : POPULATION (INSEE MELODI) ---
        if (action === 'population') {
            const { lat, lon } = req.query;
            const geoUrl = `https://recherche-entreprises.api.gouv.fr/near_point?lat=${lat}&lon=${lon}&radius=1&per_page=1&minimal=true`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();
            
            if (!geoData.results || geoData.results.length === 0) {
                return res.status(404).json({ error: 'Commune not found' });
            }
            
            const inseeCode = geoData.results[0].com_code;
            const melodiUrl = `https://api.insee.fr/melodi/v1/data/DS_POPULATIONS_REFERENCE?GEO=${inseeCode}`;
            const response = await fetch(melodiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const popData = await response.json();
            
            return res.status(200).json({
                results: [{
                    code: inseeCode,
                    name: geoData.results[0].nom_commune,
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    population: popData.observations?.[0]?.value || 0
                }]
            });
        }

        // --- ACTION : CAPARESEAU (ODRE) ---
        if (action === 'capareseau') {
            const { dataset, where } = req.query;
            const odreUrl = `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/${dataset}/records?where=${encodeURIComponent(where)}&limit=100`;
            const response = await fetch(odreUrl);
            const data = await response.json();
            return res.status(200).json(data);
        }

        res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
