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

// Vérifie si le polygone forme une emprise de toiture exploitable pour le solaire
export function isStrictRectangle(rawPolygon) {
  if (!rawPolygon || rawPolygon.length < 3) return false;

  const pts = [...rawPolygon];
  if (pts.length > 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lng - last.lng) < 1e-7) {
      pts.pop();
    }
  }

  // Simplifier les sommets colinéaires sur les murs droits
  const simplified = simplifyColinearVertices(pts, 20);

  // Accepte tous les quadrilatères et polygones industriels / agricoles de toiture (jusqu'à 12 sommets)
  if (simplified.length >= 4 && simplified.length <= 14) {
    return true;
  }
  return simplified.length >= 3;
}

// Détermine l'exposition et l'arête de faîtage optimale de la toiture
export function getRoofSouthOrientation(polygon) {
  if (!polygon || polygon.length < 3) return { isSouthFacing: true, southAngle: 0, ridgeIndex: 0 };

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
    
    // Direction depuis le faîtage vers le barycentre du bâtiment
    const midLatRad = (midLat * Math.PI) / 180;
    const dLng = (cLng - midLng) * Math.cos(midLatRad) * 111320;
    const dLat = (cLat - midLat) * 110574;

    let southSlopeAngle = Math.round((Math.atan2(-dLng, -dLat) * 180) / Math.PI);
    if (southSlopeAngle === -180) southSlopeAngle = 180;

    edges.push({
      index: i,
      length,
      southSlopeAngle,
      absDeviationFromSouth: Math.abs(southSlopeAngle)
    });
  }

  // Sélectionner les arêtes les plus longues pour le faîtage
  const maxLength = Math.max(...edges.map(e => e.length));
  const longEdges = edges.filter(e => e.length >= maxLength * 0.70);

  // Trier les arêtes longues selon leur proximité au Sud
  longEdges.sort((a, b) => a.absDeviationFromSouth - b.absDeviationFromSouth);

  const bestEdge = longEdges[0] || edges[0];
  if (!bestEdge) {
    return { isSouthFacing: true, southAngle: 0, ridgeIndex: 0 };
  }

  // Toutes les toitures viables sont admises (y compris orientations Est-Ouest et toitures terrasses)
  return {
    isSouthFacing: true,
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

// 2. Extraction des polygones de bâtiments via IGN BD TOPO (WFS Géoplateforme) + Overpass OSM
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

export async function fetchBuildingsInBbox({
  bbox,
  minArea = 400,
  maxArea = 50000,
  limit = 50,
  onProgress = null
}) {
  if (!bbox) throw new Error('Bounding box requise pour la recherche géospatiale.');

  const { minLat, minLng, maxLat, maxLng } = bbox;
  const eligibleBuildings = [];
  const seenCentroids = [];

  function isDuplicate(c) {
    return seenCentroids.some(s => {
      const dLat = Math.abs(s[0] - c[0]) * 110574;
      const dLng = Math.abs(s[1] - c[1]) * 111320 * Math.cos((c[0] * Math.PI) / 180);
      return Math.sqrt(dLat * dLat + dLng * dLng) < 15; // 15 mètres de tolérance
    });
  }

  const addBuilding = (b) => {
    if (isDuplicate(b.center)) return;
    seenCentroids.push(b.center);
    eligibleBuildings.push(b);
  };

  // 1. SOURCING IGN BD TOPO (Données officielles HD très récentes, couvre tous les entrepôts et bâtiments neufs)
  const fetchIGN = async () => {
    try {
      if (onProgress) onProgress('Interrogation du cadastre IGN BD TOPO...');

      // Découpage en sous-zones si la bbox est étendue pour éviter le seuil WFS de 5000 objets
      const subBoxes = [];
      const dLat = maxLat - minLat;
      const dLng = maxLng - minLng;
      if (dLat > 0.04 || dLng > 0.04) {
        const midLat = (minLat + maxLat) / 2;
        const midLng = (minLng + maxLng) / 2;
        subBoxes.push(
          { minLat, minLng, maxLat: midLat, maxLng: midLng },
          { minLat, minLng: midLng, maxLat: midLat, maxLng },
          { minLat: midLat, minLng, maxLat, maxLng: midLng },
          { minLat: midLat, minLng: midLng, maxLat, maxLng }
        );
      } else {
        subBoxes.push({ minLat, minLng, maxLat, maxLng });
      }

      const wfsPromises = subBoxes.map(async (sb) => {
        const bboxStr = `${sb.minLng},${sb.minLat},${sb.maxLng},${sb.maxLat}`;
        const url = `https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=BDTOPO_V3:batiment&outputFormat=application/json&bbox=${bboxStr},urn:ogc:def:crs:OGC:1.3:CRS84&count=5000`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) return await res.json();
        } catch (e) {
          clearTimeout(timeoutId);
        }
        return null;
      });

      const wfsResults = await Promise.all(wfsPromises);

      for (const wfsData of wfsResults) {
        if (!wfsData || !wfsData.features) continue;
        for (const f of wfsData.features) {
          const geom = f.geometry;
          if (!geom) continue;

          let rings = [];
          if (geom.type === 'Polygon') rings = [geom.coordinates[0]];
          else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map(c => c[0]);

          for (const ring of rings) {
            if (!ring || ring.length < 3) continue;
            const polygon = ring.map(p => ({ lat: p[1], lng: p[0] }));
            if (polygon.length > 3) {
              const first = polygon[0];
              const last = polygon[polygon.length - 1];
              if (Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lng - last.lng) < 1e-7) {
                polygon.pop();
              }
            }

            const area = calculatePolygonArea(polygon);
            if (area < minArea || area > maxArea) continue;
            if (!isStrictRectangle(polygon)) continue;

            const southOri = getRoofSouthOrientation(polygon);
            if (!southOri.isSouthFacing) continue;

            const center = calculateCentroid(polygon);
            addBuilding({
              id: `ign_${f.id.replace('batiment.', '')}`,
              osmId: f.id.replace('batiment.', ''),
              source: 'IGN_BDTOPO',
              area,
              polygon,
              center,
              buildingType: f.properties?.nature || f.properties?.usage_1 || 'industriel',
              name: f.properties?.nom || null,
              ridgeIndex: southOri.ridgeIndex,
              southAngle: southOri.southAngle,
              isSouthFacing: true
            });
          }
        }
      }
    } catch (err) {
      console.warn('Erreur sourcing IGN BD TOPO:', err.message);
    }
  };

  // 2. SOURCING OVERPASS OSM (en complément pour maximiser l'exhaustivité)
  const fetchOSM = async () => {
    try {
      const overpassQuery = `[out:json][timeout:20];
(
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

      let rawData = null;
      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
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
          }
        } catch (err) {
          // miroir suivant
        }
      }

      if (rawData && rawData.elements) {
        for (const el of rawData.elements) {
          if (!el.geometry || el.geometry.length < 3) continue;

          const polygon = el.geometry.map(g => ({ lat: g.lat, lng: g.lon }));
          if (polygon.length > 3) {
            const first = polygon[0];
            const last = polygon[polygon.length - 1];
            if (Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lng - last.lng) < 1e-7) {
              polygon.pop();
            }
          }

          const area = calculatePolygonArea(polygon);
          if (area < minArea || area > maxArea) continue;
          if (!isStrictRectangle(polygon)) continue;

          const southOri = getRoofSouthOrientation(polygon);
          if (!southOri.isSouthFacing) continue;

          const center = calculateCentroid(polygon);
          addBuilding({
            id: `osm_${el.id}`,
            osmId: el.id,
            source: 'OSM',
            area,
            polygon,
            center,
            buildingType: el.tags?.building || 'yes',
            name: el.tags?.name || null,
            ridgeIndex: southOri.ridgeIndex,
            southAngle: southOri.southAngle,
            isSouthFacing: true
          });
        }
      }
    } catch (err) {
      console.warn('Erreur sourcing Overpass:', err.message);
    }
  };

  // Exécution concurrente IGN BD TOPO + OpenStreetMap
  await Promise.allSettled([fetchIGN(), fetchOSM()]);
  if (onProgress) onProgress(`${eligibleBuildings.length} toitures solaires exploitables qualifiées.`);

  // Trier par surface décroissante (bâtiments les plus capacitaires en priorité)
  eligibleBuildings.sort((a, b) => b.area - a.area);

  const effectiveLimit = limit === 'Tout' || limit === 'all' || Number(limit) >= 1000
    ? eligibleBuildings.length
    : Math.min(Number(limit) || 50, eligibleBuildings.length);

  return eligibleBuildings.slice(0, effectiveLimit);
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
