export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { endpoint, siren, ...otherParams } = req.query;
        const queryParams = new URLSearchParams();
        for (const [k, v] of Object.entries(otherParams)) {
            if (k !== 'endpoint' && k !== 'siren') {
                queryParams.set(k, v);
            }
        }

        let targetUrl = '';
        if (endpoint === 'entreprise' && siren) {
            targetUrl = `https://sirelium.fr/api/entreprise/${siren}`;
        } else if (endpoint === 'search') {
            targetUrl = `https://sirelium.fr/search?${queryParams.toString()}`;
        } else if (endpoint === 'clusters') {
            targetUrl = `https://sirelium.fr/clusters?${queryParams.toString()}`;
        } else if (endpoint === 'pins') {
            targetUrl = `https://sirelium.fr/pins?${queryParams.toString()}`;
        } else {
            targetUrl = `https://sirelium.fr/${endpoint || 'pins'}?${queryParams.toString()}`;
        }

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://sirelium.fr/'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: `Sirelium API error: ${response.status}`, details: errorText.slice(0, 300) });
        }

        const data = await response.json();
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        return res.status(200).json(data);
    } catch (error) {
        console.error('[PROXY SIRELIUM] Error:', error);
        return res.status(500).json({ error: 'Internal proxy error', message: error.message });
    }
}
