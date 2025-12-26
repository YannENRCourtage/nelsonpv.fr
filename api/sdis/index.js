export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { dept } = req.query;

    if (!dept) {
        return res.status(400).json({ error: 'Département requis' });
    }

    const DEPARTMENTS = {
        '17': 'https://api.deci.sdis17.fr/api/v1/peis?format=geojson',
        '84': 'https://api.deci.sdis84.fr/api/v1/peis?format=geojson',
        '81': 'https://api.deci.sdis81.fr/api/v1/peis?format=geojson',
        '64': 'https://datanova.laposte.fr/api/explore/v2.1/catalog/datasets/points-deau-incendie-sdis64/exports/geojson',
        '34': 'https://herault-data.fr/api/explore/v2.1/catalog/datasets/points-deau-incendie-sdis34/exports/geojson',
        '18': 'https://api.deci.sdis18.fr/api/v1/peis?format=geojson',
        '33': 'https://api.deci.sdis33.fr/api/v1/peis?format=geojson',
        '04': 'https://api.deci.sdis04.fr/api/v1/peis?format=geojson',
        '05': 'https://api.deci.sdis05.fr/api/v1/peis?format=geojson',
        '06': 'https://api.deci.sdis06.fr/api/v1/peis?format=geojson',
        '26': 'https://api.deci.sdis26.fr/api/v1/peis?format=geojson',
        '83': 'https://api.deci.sdis83.fr/api/v1/peis?format=geojson',
        '07': 'https://api.deci.sdis07.fr/api/v1/peis?format=geojson'
    };

    let url = DEPARTMENTS[dept];

    // Fallback pattern for Datakode APIs if not explicitly listed
    if (!url) {
        url = `https://api.deci.sdis${dept}.fr/api/v1/peis?format=geojson`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            // Attempt another pattern if the first fail
            throw new Error(`Erreur API SDIS ${dept}: ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error(`Erreur Proxy SDIS ${dept}:`, error);
        return res.status(500).json({
            error: 'Erreur lors de la récupération des données SDIS',
            details: error.message
        });
    }
}

