

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    // Whitelist allow domains for security
    const allowedDomains = [
        'api.deci.sdis17.fr',
        'api.deci.sdis84.fr',
        'api.deci.sdis81.fr'
    ];

    try {
        const targetUrl = new URL(url);
        if (!allowedDomains.includes(targetUrl.hostname)) {
            return res.status(403).json({ error: 'Domain not allowed' });
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Upstream API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Cache for 1 hour
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }
}
