// api/solar/[[...slug]].js
// Vercel serverless function proxying Google Solar Building Insights API
// Only GET method is supported. Query parameters: lat, lng

import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng query parameters' });
  }

  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_SOLAR_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const endpoint = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${encodeURIComponent(
    lat
  )}&location.longitude=${encodeURIComponent(lng)}&key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Solar API error', response.status, errText);
      return res.status(response.status).json({ error: 'Google Solar API error', details: errText });
    }
    const data = await response.json();
    // Pass through the relevant parts (avoid exposing internal fields)
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error calling Google Solar API', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
