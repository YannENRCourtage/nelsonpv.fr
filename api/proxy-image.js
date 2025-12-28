export default async function handler(request, response) {
    const { url } = request.query;

    if (!url) {
        return response.status(400).json({ error: 'URL is required' });
    }

    try {
        // Le serveur Vercel est "server-side", donc pas de CORS bloquant pour fetch vers Google
        const imageResponse = await fetch(url);

        if (!imageResponse.ok) {
            return response.status(imageResponse.status).json({ error: 'Failed to fetch image from source' });
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // On transfère le content-type d'origine (image/png, etc.)
        response.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'application/octet-stream');
        // On permet au navigateur de cacher cette réponse agressivement (images immuables en général)
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        return response.send(buffer);
    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
