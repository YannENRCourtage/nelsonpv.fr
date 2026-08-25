export default async function handler(request, response) {
    // 1. CORS Headers for all responses
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.setHeader('Access-Control-Max-Age', '86400');

    // 2. Preflight request handling
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // 3. Extract target URL from query or body
    let targetUrl = request.query?.url;
    if (!targetUrl && request.body) {
        targetUrl = typeof request.body === 'string' 
            ? JSON.parse(request.body).url 
            : request.body.url;
    }

    // Fallback URL parsing if query parameter was truncated by query string delimiters
    if (!targetUrl && request.url && request.url.includes('url=')) {
        try {
            const rawPart = request.url.split('url=')[1];
            if (rawPart) {
                targetUrl = decodeURIComponent(rawPart.split('&format=')[0].split('&base64=')[0]);
            }
        } catch (e) {
            console.warn('URL fallback parse error:', e);
        }
    }

    if (!targetUrl) {
        return response.status(400).json({ error: 'Parameter "url" is required' });
    }

    try {
        // 4. Fetch image server-side (bypassing browser CORS)
        const fetchController = new AbortController();
        const timeoutId = setTimeout(() => fetchController.abort(), 25000); // 25s timeout

        const imageResponse = await fetch(targetUrl, {
            signal: fetchController.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*,*/*'
            }
        });
        clearTimeout(timeoutId);

        if (!imageResponse.ok) {
            console.error(`Proxy upstream error (${imageResponse.status}) for ${targetUrl}`);
            return response.status(imageResponse.status).json({ 
                error: `Failed to fetch image from upstream: ${imageResponse.status} ${imageResponse.statusText}` 
            });
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = imageResponse.headers.get('content-type') || 'image/png';

        // 5. If JSON / Base64 requested, return dataUrl
        const wantsBase64 = request.query?.format === 'base64' || 
                            request.query?.base64 === 'true' || 
                            request.body?.format === 'base64';

        if (wantsBase64) {
            const base64String = buffer.toString('base64');
            const dataUrl = `data:${contentType};base64,${base64String}`;
            response.setHeader('Content-Type', 'application/json');
            return response.status(200).json({
                dataUrl,
                contentType,
                size: buffer.length
            });
        }

        // 6. Direct binary streaming
        response.setHeader('Content-Type', contentType);
        response.setHeader('Content-Length', buffer.length);
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        return response.status(200).send(buffer);
    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ 
            error: error.message || 'Internal Server Error',
            details: error.name === 'AbortError' ? 'Upstream request timed out' : undefined
        });
    }
}
