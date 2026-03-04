export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const params = new URLSearchParams(req.query);
        const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${params.toString()}`;
        console.log(`[PVGIS] Fetching: ${pvgisUrl}`);

        const response = await fetch(pvgisUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'User-Agent': 'NelsonPV-App/1.0' }
        });

        const rawBody = await response.text();

        if (!response.ok) {
            console.error(`[PVGIS] API Error ${response.status}:`, rawBody.slice(0, 200));
            return res.status(response.status).json({
                error: `PVGIS API error: ${response.status}`,
                details: rawBody.slice(0, 200)
            });
        }

        try {
            const data = JSON.parse(rawBody);
            return res.status(200).json(data);
        } catch (parseError) {
            console.error('[PVGIS] JSON Parse Error:', parseError.message, 'Body:', rawBody.slice(0, 200));
            return res.status(500).json({
                error: 'PVGIS returned invalid JSON',
                details: rawBody.slice(0, 100)
            });
        }
    } catch (error) {
        console.error('[PVGIS] Internal error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
