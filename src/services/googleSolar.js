// src/services/googleSolar.js
// Thin wrapper around the backend proxy defined in api/solar/[[...slug]].js

import { apiService } from '@/services/api'; // generic api helper used elsewhere

/**
 * Fetch building insights from Google Solar API via our backend proxy.
 * @param {number|string} lat Latitude of the location.
 * @param {number|string} lng Longitude of the location.
 * @returns {Promise<Object>} Raw response object from Google Solar.
 */
export async function getBuildingInsights(lat, lng) {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const url = `/api/solar/building-insights?${query.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur (${response.status})`);
  }
  
  return response.json();
}

/**
 * Choose the most suitable roof segment based on area.
 * @param {Array} segments Array of roofSegmentSummaries from Google Solar.
 * @returns {Object|null} Selected segment or null if none.
 */
export function selectBestRoofSegment(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  // Sort by area descending, pick first
  const sorted = [...segments].sort((a, b) => {
    const areaA = a.stats?.areaMeters2 ?? 0;
    const areaB = b.stats?.areaMeters2 ?? 0;
    return areaB - areaA;
  });
  return sorted[0];
}

/**
 * Convert the bounding box of a Google segment into a Leaflet polygon (4 points).
 * Google returns {sw: {lat,lng}, ne: {lat,lng}}.
 * We create a rectangle clockwise from SW -> NW -> NE -> SE.
 */
export function boundingBoxToPolygon(bbox) {
  if (!bbox || !bbox.sw || !bbox.ne) return [];
  const { sw, ne } = bbox;
  const nw = { lat: ne.lat, lng: sw.lng };
  const se = { lat: sw.lat, lng: ne.lng };
  return [sw, nw, ne, se];
}
