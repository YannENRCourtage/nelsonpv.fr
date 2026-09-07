/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROSPECTING GIS SERVICE
 * Sourcing géospatial pour la prospection automatique de toitures solaires
 * 1. Résolution de commune (geo.api.gouv.fr)
 * 2. Extraction des polygones de bâtiments (Overpass API OSM)
 * 3. Filtrage géométrique strict (500 m² à 2 500 m²)
 * 4. Qualification cadastrale et adresse postale (BAN + Apicarto Cadastre)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Calcul géodésique sphérique WGS84 de l'emprise au sol d'un polygone
export function calculatePolygonArea(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const EARTH_RADIUS = 6378137;
  let total = 0;
  const numPoints = latlngs.length;

  for (let i = 0; i < numPoints; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % numPoints];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;
    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  const area = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2.0);
  return Math.round(area);
}

// Calcul du barycentre (centre géométrique) d'un polygone
export function calculateCentroid(points) {
  if (!points || points.length === 0) return [43.6047, 1.4442];
  let sumLat = 0;
  let sumLng = 0;
  points.forEach(p => {
    sumLat += p.lat;
    sumLng += p.lng;
  });
  return [sumLat / points.length, sumLng / points.length];
}

// 1. Recherche et géométrie de commune via geo.api.gouv.fr
export async function searchCommunes(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const isCodePostal = /^\d{2,5}$/.test(q);
  const url = isCodePostal
    ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,centre,contour,bbox,population&limit=7`
    : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,centre,contour,bbox,population&boost=population&limit=7`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const communes = await res.json();
    return communes.map(c => {
      // bbox format geo.api.gouv.fr : Polygon coordinates [[ [minLng, minLat], [maxLng, minLat], ... ]]
      let bbox = null;
      if (c.bbox && c.bbox.coordinates && c.bbox.coordinates[0]) {
        const ring = c.bbox.coordinates[0];
        const lngs = ring.map(pt => pt[0]);
        const lats = ring.map(pt => pt[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        bbox = { minLat, minLng, maxLat, maxLng };
      }
      return {
        id: c.code,
        nom: c.nom,
        codeInsee: c.code,
        postalCode: c.codesPostaux?.[0] || '',
        departmentCode: c.code ? c.code.substring(0, 2) : '59',
        center: c.centre ? [c.centre.coordinates[1], c.centre.coordinates[0]] : [50.6292, 3.0573],
        bbox,
        population: c.population || 0
      };
    });
  } catch (err) {
    console.error('Erreur recherche communes geo.api.gouv.fr:', err);
    return [];
  }
}

// 2. Extraction des polygones de bâtiments via Overpass API avec pool de miroirs optimisé
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter', // Serveur dédié France (extrêmement rapide, < 700ms)
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

export async function fetchBuildingsInBbox({
  bbox,
  minArea = 500,
  maxArea = 2500,
  limit = 50,
  onProgress = null
}) {
  if (!bbox) throw new Error('Bounding box requise pour la recherche géospatiale.');

  const { minLat, minLng, maxLat, maxLng } = bbox;

  // Requête Overpass ciblée sur les bâtiments fermés
  const overpassQuery = `[out:json][timeout:25];
(
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

  let rawData = null;
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const hostname = new URL(endpoint).hostname;
      if (onProgress) onProgress(`Interrogation du serveur cartographique (${hostname})...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 secondes max par miroir

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NelsonPV-SolarProspector/1.0 (contact@nelsonpv.fr)'
        },
        body: 'data=' + encodeURIComponent(overpassQuery),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        rawData = await res.json();
        break;
      } else {
        console.warn(`Serveur ${hostname} a retourné le code ${res.status}, essai du miroir suivant...`);
      }
    } catch (err) {
      lastError = err;
      console.warn(`Serveur Overpass indisponible ou trop lent (${endpoint}):`, err.message);
    }
  }

  if (!rawData || !rawData.elements) {
    throw new Error(`Impossible de contacter les serveurs cartographiques cadastraux. ${lastError ? lastError.message : ''}`);
  }

  const elements = rawData.elements;
  if (onProgress) onProgress(`Analyse géométrique de ${elements.length} empreintes de bâtiments...`);

  const eligibleBuildings = [];

  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 3) continue;

    // Conversion en tableau [{ lat, lng }]
    const polygon = el.geometry.map(g => ({ lat: g.lat, lng: g.lon }));

    // Retirer le dernier point s'il est identique au premier (fermeture de boucle)
    if (polygon.length > 3) {
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      if (Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lng - last.lng) < 1e-7) {
        polygon.pop();
      }
    }

    const area = calculatePolygonArea(polygon);

    // FILTRE STRICT : STRICTEMENT COMPRIS ENTRE minArea ET maxArea (ex: 500 m² à 2500 m²)
    if (area > minArea && area < maxArea) {
      const center = calculateCentroid(polygon);
      eligibleBuildings.push({
        id: `osm_${el.id}`,
        osmId: el.id,
        area,
        polygon,
        center,
        buildingType: el.tags?.building || 'yes',
        name: el.tags?.name || null
      });

      if (eligibleBuildings.length >= limit) {
        break;
      }
    }
  }

  // Trier par surface décroissante (bâtiments les plus capacitaires en priorité)
  eligibleBuildings.sort((a, b) => b.area - a.area);

  return eligibleBuildings;
}

// 3. Géocodage inverse via la Base Adresse Nationale (BAN)
export async function reverseGeocodeBAN(lat, lng) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const feat = data.features?.[0]?.properties;
    if (!feat) return null;

    return {
      label: feat.label || '',
      street: feat.street || feat.name || '',
      housenumber: feat.housenumber || '',
      postcode: feat.postcode || '',
      city: feat.city || '',
      departmentCode: feat.postcode ? feat.postcode.substring(0, 2) : '59'
    };
  } catch (err) {
    console.warn('Erreur reverse geocoding BAN:', err.message);
    return null;
  }
}

// 4. Qualification cadastrale IGN (Apicarto Parcelles)
export async function getCadastreParcel(lat, lng) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const geomParam = encodeURIComponent(JSON.stringify({
      type: 'Point',
      coordinates: [lng, lat]
    }));
    const url = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${geomParam}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const feat = data.features?.[0]?.properties;
    if (!feat) return null;

    return {
      section: feat.section || '',
      numero: feat.numero || '',
      contenance: feat.contenance || null,
      codeInsee: feat.code_insee || '',
      parcelleRef: feat.section ? `Section ${feat.section} N° ${feat.numero}` : null
    };
  } catch (err) {
    console.warn('Erreur qualification parcelle cadastrale:', err.message);
    return null;
  }
}
