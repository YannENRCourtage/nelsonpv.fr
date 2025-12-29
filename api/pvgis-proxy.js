export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { lat, lon, peakpower, loss, angle, aspect } = req.query

        // Validation
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' })
        }

        // Construire l'URL de l'API PVGIS
        const params = new URLSearchParams({
            lat: lat,
            lon: lon,
            peakpower: peakpower || 100,
            loss: loss || 14,
            angle: angle || 30,
            aspect: aspect || 0,
            outputformat: 'json'
        })

        const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${params}`

        // Appel à l'API PVGIS depuis le serveur
        const apiResponse = await fetch(pvgisUrl)

        if (!apiResponse.ok) {
            return res.status(apiResponse.status).json({
                error: `PVGIS API error: ${apiResponse.status}`,
                details: await apiResponse.text()
            })
        }

        const data = await apiResponse.json()

        // Retourner les données
        return res.status(200).json(data)

    } catch (error) {
        console.error('PVGIS proxy error:', error)
        return res.status(500).json({
            error: 'Failed to fetch PVGIS data',
            message: error.message
        })
    }
}
