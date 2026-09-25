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

  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || 'AIzaSyCEoaO6VKUi683TV1ULJ977_9tsKxc_bqk';
  if (!apiKey) {
    console.error('GOOGLE_SOLAR_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Use requiredQuality=BASE so that Google Solar returns results for MEDIUM and LOW quality imagery (all regions in France)
  const endpoint = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${encodeURIComponent(
    lat
  )}&location.longitude=${encodeURIComponent(lng)}&requiredQuality=BASE&key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      if (response.status === 404) {
        // Zone géographique non couverte par Google Solar 3D -> retour gracieux
        return res.status(200).json({ available: false, message: 'NOT_FOUND' });
      }
      const errText = await response.text();
      console.error('Google Solar API error', response.status, errText);
      return res.status(response.status).json({ error: 'Google Solar API error', details: errText });
    }
    const data = await response.json();
    const segments = data?.solarPotential?.roofSegmentStats || data?.solarPotential?.roofSegmentSummaries || data?.roofSegmentStats || data?.roofSegmentSummaries || [];
    // Pass through the relevant parts with available: true and normalized roof segments
    return res.status(200).json({
      available: true,
      roofSegmentSummaries: segments,
      roofSegmentStats: segments,
      ...data
    });
  } catch (err) {
    console.error('Error calling Google Solar API', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
