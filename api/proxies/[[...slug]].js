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

    return res.status(404).json({ error: 'Proxy endpoint not found' });
}
