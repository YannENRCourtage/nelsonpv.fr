export default async function handler(req, res) {
    const { slug } = req.query;
    const action = slug && slug.length > 0 ? slug[0] : null;

    if (action === 'image') {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        try {
            const imageResponse = await fetch(url);
            if (!imageResponse.ok) return res.status(imageResponse.status).json({ error: 'Failed to fetch image from source' });
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(buffer);
        } catch (error) {
            console.error('Proxy Image Error:', error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }

    if (action === 'pvgis') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        try {
            const params = new URLSearchParams(req.query);
            params.delete('slug'); // Remove slug from PVGIS original params
            const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${params.toString()}`;
            console.log(`[PROXY PVGIS] Fetching: ${pvgisUrl}`);
            const response = await fetch(pvgisUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'User-Agent': 'NelsonPV-App/1.0' }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PROXY PVGIS] API Error ${response.status}:`, errorText);
                return res.status(response.status).json({
                    error: `PVGIS API error: ${response.status}`,
                    details: errorText.slice(0, 200)
                });
            }

            const rawBody = await response.text();
            try {
                const data = JSON.parse(rawBody);
                return res.status(200).json(data);
            } catch (parseError) {
                console.error('[PROXY PVGIS] JSON Parse Error:', parseError, 'Raw body snippet:', rawBody.slice(0, 200));
                return res.status(500).json({
                    error: 'PVGIS return invalid JSON',
                    details: rawBody.slice(0, 100),
                    status: response.status
                });
            }
        } catch (error) {
            console.error('Error proxying PVGIS request:', error);
            return res.status(500).json({ error: 'Internal proxy error', message: error.message });
        }
    }

    if (action === 'isochrone') {
        try {
            const params = new URLSearchParams(req.query);
            params.delete('slug');
            const isochroneUrl = `https://data.geopf.fr/navigation/isochrone?${params.toString()}`;
            console.log(`[PROXY ISOCHRONE] Fetching: ${isochroneUrl}`);
            const response = await fetch(isochroneUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) {
                const errorText = await response.text();
                return res.status(response.status).json({ error: `IGN API error: ${response.status}`, details: errorText });
            }
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: 'Internal proxy error', message: error.message });
        }
    }

    if (action === 'sirelium') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.status(200).end();

        try {
            const { endpoint, siren, ...otherParams } = req.query;
            const queryParams = new URLSearchParams();
            for (const [k, v] of Object.entries(otherParams)) {
                if (k !== 'slug' && k !== 'endpoint' && k !== 'siren') {
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

    return res.status(404).json({ error: 'Proxy endpoint not found' });
}
