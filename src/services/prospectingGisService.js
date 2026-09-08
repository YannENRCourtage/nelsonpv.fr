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

// Distance géodésique projetée en mètres entre deux coordonnées WGS84
export function calculateDistanceMeters(p1, p2) {
  const midLat = ((p1.lat + p2.lat) / 2 * Math.PI) / 180;
  const dLat = (p2.lat - p1.lat) * 110574;
  const dLng = (p2.lng - p1.lng) * 111320 * Math.cos(midLat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Calcul de l'angle intérieur (en degrés) entre trois sommets
export function calculateCornerAngleDeg(pPrev, pCurr, pNext) {
  const midLat = (pCurr.lat * Math.PI) / 180;
  const cosLat = Math.cos(midLat);

  const v1x = (pPrev.lng - pCurr.lng) * cosLat * 111320;
  const v1y = (pPrev.lat - pCurr.lat) * 110574;
  const v2x = (pNext.lng - pCurr.lng) * cosLat * 111320;
  const v2y = (pNext.lat - pCurr.lat) * 110574;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 < 1e-4 || mag2 < 1e-4) return 180;

  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// Simplifie un polygone en supprimant les points colinéaires intermédiaires (sur les murs droits)
export function simplifyColinearVertices(pts, angleToleranceDeg = 15) {
  if (!pts || pts.length <= 4) return pts;
  let simplified = [...pts];
  let changed = true;

  while (changed && simplified.length > 4) {
    changed = false;
    const n = simplified.length;
    for (let i = 0; i < n; i++) {
      const prev = simplified[(i - 1 + n) % n];
      const curr = simplified[i];
      const next = simplified[(i + 1) % n];

      const angle = calculateCornerAngleDeg(prev, curr, next);
      // Si l'angle est proche de 180°, ce sommet est un point de découpe cadastrale sur un mur droit
      if (Math.abs(angle - 180) <= angleToleranceDeg) {
        simplified.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return simplified;
}

// Vérifie si le polygone forme strictement un rectangle d'un seul bloc (Images 1, 2, 4 rejetées, Image 5 acceptée)
export function isStrictRectangle(rawPolygon) {
  if (!rawPolygon || rawPolygon.length < 4) return false;

  const pts = [...rawPolygon];
  if (pts.length > 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lng - last.lng) < 1e-7) {
      pts.pop();
    }
  }

  const simplified = simplifyColinearVertices(pts);
  if (simplified.length !== 4) {
    return false; // Pas 4 sommets (ex: forme en L, découpes irrégulières)
  }

  // Vérifier que les 4 angles sont quasiment droits (72° à 108°)
  for (let i = 0; i < 4; i++) {
    const prev = simplified[(i - 1 + 4) % 4];
    const curr = simplified[i];
    const next = simplified[(i + 1) % 4];
    const angle = calculateCornerAngleDeg(prev, curr, next);
    if (angle < 72 || angle > 108) {
      return false; // Angles non orthogonaux (trapèze ou parallélogramme oblique)
    }
  }

  // Vérifier le parallélisme et la symétrie des côtés opposés (tolérance 18%)
  const d0 = calculateDistanceMeters(simplified[0], simplified[1]);
  const d1 = calculateDistanceMeters(simplified[1], simplified[2]);
  const d2 = calculateDistanceMeters(simplified[2], simplified[3]);
  const d3 = calculateDistanceMeters(simplified[3], simplified[0]);

  const diffOpp1 = Math.abs(d0 - d2) / Math.max(d0, d2);
  const diffOpp2 = Math.abs(d1 - d3) / Math.max(d1, d3);

  if (diffOpp1 > 0.18 || diffOpp2 > 0.18) {
    return false; // Côtés inégaux (trapèze difforme)
  }

  return true;
}

// Détermine l'exposition Sud de la toiture asymétrique et sélectionne l'arête de faîtage optimale
// Exposition demandée : entre -45° et +45° (passant par 0° Plein Sud)
export function getRoofSouthOrientation(polygon) {
  if (!polygon || polygon.length < 3) return { isSouthFacing: false, southAngle: 0, ridgeIndex: 0 };

  const n = polygon.length;
  // Calcul du barycentre
  let cLat = 0, cLng = 0;
  polygon.forEach(p => { cLat += p.lat; cLng += p.lng; });
  cLat /= n;
  cLng /= n;

  // Calculer les caractéristiques de chaque arête
  const edges = [];
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];
    const length = calculateDistanceMeters(p1, p2);
    
    // Milieu de l'arête
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;
    
    // Direction depuis le faîtage vers le barycentre du bâtiment (direction de la pente vers le bas)
    const midLatRad = (midLat * Math.PI) / 180;
    const dLng = (cLng - midLng) * Math.cos(midLatRad) * 111320;
    const dLat = (cLat - midLat) * 110574;

    // Angle boussole vers le Sud : Sud = 0°, Ouest = +90°, Est = -90°, Nord = 180° / -180°
    let southSlopeAngle = Math.round((Math.atan2(-dLng, -dLat) * 180) / Math.PI);
    if (southSlopeAngle === -180) southSlopeAngle = 180;

    edges.push({
      index: i,
      length,
      southSlopeAngle,
      absDeviationFromSouth: Math.abs(southSlopeAngle)
    });
  }

  // Filtrer les arêtes les plus longues (le faîtage est l'un des côtés longs du rectangle)
  const maxLength = Math.max(...edges.map(e => e.length));
  // Prendre les arêtes dont la longueur est à au moins 80% du max (les deux côtés longs du rectangle)
  const longEdges = edges.filter(e => e.length >= maxLength * 0.80);

  // Trier les arêtes longues selon leur proximité au Plein Sud (0°)
  longEdges.sort((a, b) => a.absDeviationFromSouth - b.absDeviationFromSouth);

  const bestEdge = longEdges[0];
  if (!bestEdge) {
    return { isSouthFacing: false, southAngle: 0, ridgeIndex: 0 };
  }

  // Condition stricte demandée par l'utilisateur : toiture exposée entre -45° et +45° (par rapport au Sud)
  const isSouthFacing = bestEdge.absDeviationFromSouth <= 45;

  return {
    isSouthFacing,
    southAngle: bestEdge.southSlopeAngle,
    ridgeIndex: bestEdge.index,
    ridgeLength: bestEdge.length
  };
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
        departmentCode: c.code ? c.code.substring(0, 2) : '33',
        center: c.centre ? [c.centre.coordinates[1], c.centre.coordinates[0]] : [44.8412, -0.5805],
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

    // A. Exclusion immédiate si OpenStreetMap indique déjà une centrale solaire
    const hasOsmSolar = el.tags && (
      el.tags['generator:source'] === 'solar' ||
      el.tags['power'] === 'generator' ||
      el.tags['solar'] === 'yes' ||
      el.tags['generator:method'] === 'photovoltaic' ||
      el.tags['generator:type'] === 'solar_photovoltaic_panel' ||
      el.tags['roof:solar'] === 'yes'
    );
    if (hasOsmSolar) continue;

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

    // B. FILTRE SURFACE : STRICTEMENT COMPRIS ENTRE minArea ET maxArea (ex: 500 m² à 2500 m²)
    if (area <= minArea || area >= maxArea) continue;

    // C. FILTRE GÉOMÉTRIQUE STRICT : BÂTIMENT D'UN SEUL BLOC RECTANGULAIRE
    // Rejette les formes en L (Image 1), polygones découpés (Image 2) et trapèzes difformes (Image 4)
    if (!isStrictRectangle(polygon)) continue;

    // D. FILTRE EXPOSITION STRICT : TOITURE ORIENTÉE SUD ENTRE -45° ET +45°
    // Ne retient que les toitures dont l'arête principale / sablière a une pente dirigée vers le Sud
    const southOri = getRoofSouthOrientation(polygon);
    if (!southOri.isSouthFacing) continue;

    const center = calculateCentroid(polygon);
    eligibleBuildings.push({
      id: `osm_${el.id}`,
      osmId: el.id,
      area,
      polygon,
      center,
      buildingType: el.tags?.building || 'yes',
      name: el.tags?.name || null,
      ridgeIndex: southOri.ridgeIndex,
      southAngle: southOri.southAngle,
      isSouthFacing: true
    });

    if (eligibleBuildings.length >= limit) {
      break;
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
      departmentCode: feat.postcode ? feat.postcode.substring(0, 2) : '33'
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
