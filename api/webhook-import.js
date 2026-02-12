// Minimal webhook endpoint for testing
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')

    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Simple success response for now
    return res.status(200).json({
        status: 'success',
        message: 'Webhook received',
        timestamp: new Date().toISOString(),
        body: req.body
    })
}
