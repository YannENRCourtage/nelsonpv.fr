/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PARKING PROSPECTING GIS SERVICE
 * Sourcing géospatial pour la prospection automatique d'ombrières de parking
 * 1. Recherche de communes (geo.api.gouv.fr)
 * 2. Extraction des polygones de parkings (Overpass API OSM)
 * 3. Filtrage : strictement >= 220 m² & 100% à l'air libre (exclusion souterrain / couvert / solaire existant)
 * 4. Qualification cadastrale et adresse postale (BAN + Apicarto IGN)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Calcul géodésique sphérique WGS84 de l'emprise au sol d'un polygone (en m²)
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
  if (!points || points.length === 0) return [44.8412, -0.5805];
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

// Pool de miroirs Overpass API pour haute résilience et vitesse
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// Test géométrique d'inclusion d'un point WGS84 dans un polygone WGS84
export function isPointInPolygonWgs84(pt, poly) {
  if (!pt || !poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect = ((yi > pt.lat) !== (yj > pt.lat)) &&
      (pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Classification experte d'un parking : Poids Lourds (PL) vs Véhicules Légers (VL)
 * Basée sur les tags OSM, typologie foncière, mots-clés transport/logistique et aire de manœuvre
 */
export function classifyParkingCategory(tags = {}, area = 0) {
  const t = Object.entries(tags).reduce((acc, [k, v]) => {
    acc[k.toLowerCase()] = String(v).toLowerCase();
    return acc;
  }, {});

  const text = `${t.name || ''} ${t.operator || ''} ${t.description || ''} ${t.brand || ''}`.toLowerCase();

  // 1. Tags formels Poids Lourds (PL)
  const isDirectPL =
    t.amenity === 'truck_parking' ||
    t.hgv === 'yes' ||
    t.hgv === 'designated' ||
    t.hgv === 'official' ||
    t.truck === 'yes' ||
    t.parking === 'truck' ||
    t.parking === 'lorry' ||
    t.industrial === 'depot' ||
    t.industrial === 'transport' ||
    t.industrial === 'logistics' ||
    t.landuse === 'depot';

  // 2. Mots-clés transporteurs / logistique / fret / TP / poids lourds
  const plKeywords = [
    'transport', 'transports', 'logistique', 'fret', 'routier', 'routiers',
    'camion', 'camions', 'poids lourd', 'poids lourds', 'hgv', 'truck',
    'plateforme', 'plate-forme', 'messagerie', 'quai', 'quais', 'entrepot',
    'entrepôt', 'entrepots', 'entrepôts', 'depot', 'dépôt', 'transit',
    'manutention', 'carriere', 'carrière', 'bpe', 'beton', 'béton',
    'enrobe', 'enrobé', 'tp', 'travaux publics', 'autocar', 'autocars', 'bus'
  ];
  const hasPLKeyword = plKeywords.some(kw => text.includes(kw));

  // 3. Critère foncier industriel : grand site d'accès privé / livraisons avec aire de giration
  const isIndustrialOrPrivateDepot =
    (t.access === 'private' || t.access === 'delivery' || t.access === 'no') && area >= 2500;

  if (isDirectPL || hasPLKeyword || isIndustrialOrPrivateDepot) {
    return 'PL';
  }

  return 'VL';
}

/**
 * Recherche et extrait les polygones de bâtiments situés à l'intérieur
 * ou chevauchant l'emprise d'un parking (OSM way["building"] & relation["building"])
 */
export async function fetchBuildingsForParking(parking) {
  if (!parking || !parking.polygon || parking.polygon.length < 3) return [];

  const poly = parking.polygon;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  poly.forEach(p => {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  });

  const query = `[out:json][timeout:10];
(
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
  relation["building"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

  let rawData = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NelsonPV-OmbriereProspector/1.0 (contact@nelsonpv.fr)'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        rawData = await res.json();
        if (rawData && rawData.elements) break;
      }
    } catch (err) {}
  }

  if (!rawData || !rawData.elements) return [];

  const overlappingBuildings = [];
  for (const el of rawData.elements) {
    if (!el.geometry || el.geometry.length < 3) continue;
    if (el.tags?.building === 'roof' && (el.tags?.layer || el.tags?.power)) continue;

    const bPoly = el.geometry.map(g => ({ lat: g.lat, lng: g.lon }));
    const bArea = calculatePolygonArea(bPoly);

    const ptsInCount = bPoly.filter(p => isPointInPolygonWgs84(p, poly)).length;
    if (ptsInCount > 0) {
      const bCenter = calculateCentroid(bPoly);
      const centerIn = isPointInPolygonWgs84({ lat: bCenter[0], lng: bCenter[1] }, poly);
      const ratioIn = ptsInCount / bPoly.length;
      const isInternal = centerIn || ratioIn >= 0.40;

      overlappingBuildings.push({
        id: `bld_${el.id}`,
        osmId: el.id,
        polygon: bPoly,
        area: bArea,
        isInternal,
        isAdjacent: !isInternal,
        tags: el.tags || {}
      });
    }
  }

  return overlappingBuildings;
}

/**
 * 2. Extraction des polygones de parkings via Overpass API
 * Filtres obligatoires :
 * - Surface >= 220 m² strictement
 * - Parking à l'air libre (exclut underground, multi-storey, covered=yes, building=roof)
 * - Exclut les parkings ayant déjà une centrale solaire ou ombrières existantes
 * - Qualification PL vs VL adaptée à la typologie demandée
 */
export async function fetchParkingsInBbox({
  bbox,
  minArea = 220,
  maxArea = 100000,
  limit = 50,
  typologyKey = 'ombriere_vl_auto',
  onProgress = null
}) {
  if (!bbox) throw new Error('Bounding box requise pour la recherche géospatiale des parkings.');

  const { minLat, minLng, maxLat, maxLng } = bbox;

  // Requête Overpass ciblée sur les parkings VL et PL en surface ET les centrales / ombrières solaires existantes
  const overpassQuery = `[out:json][timeout:30];
(
  way["amenity"="parking"](${minLat},${minLng},${maxLat},${maxLng});
  way["amenity"="truck_parking"](${minLat},${minLng},${maxLat},${maxLng});
  relation["amenity"="parking"](${minLat},${minLng},${maxLat},${maxLng});
  relation["amenity"="truck_parking"](${minLat},${minLng},${maxLat},${maxLng});
  way["hgv"="designated"](${minLat},${minLng},${maxLat},${maxLng});
  way["hgv"="yes"](${minLat},${minLng},${maxLat},${maxLng});
  way["landuse"="depot"](${minLat},${minLng},${maxLat},${maxLng});
  way["power"="generator"](${minLat},${minLng},${maxLat},${maxLng});
  way["generator:source"="solar"](${minLat},${minLng},${maxLat},${maxLng});
  way["building"="roof"](${minLat},${minLng},${maxLat},${maxLng});
  node["power"="generator"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

  let rawData = null;
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const hostname = new URL(endpoint).hostname;
      if (onProgress) onProgress(`Interrogation du serveur cartographique (${hostname})...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NelsonPV-OmbriereProspector/1.0 (contact@nelsonpv.fr)'
        },
        body: 'data=' + encodeURIComponent(overpassQuery),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        rawData = await res.json();
        break;
      } else {
        console.warn(`Serveur ${hostname} statut ${res.status}, bascule sur le miroir suivant...`);
      }
    } catch (err) {
      lastError = err;
      console.warn(`Serveur Overpass indisponible (${endpoint}):`, err.message);
    }
  }

  if (!rawData || !rawData.elements) {
    throw new Error(`Impossible de contacter les serveurs cartographiques cadastraux. ${lastError ? lastError.message : ''}`);
  }

  const elements = rawData.elements;
  if (onProgress) onProgress(`Analyse géométrique de ${elements.length} entités cartographiques détectées...`);

  const parkingWays = [];
  const solarFeatures = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const isParkingElement =
      tags.amenity === 'parking' ||
      tags.amenity === 'truck_parking' ||
      tags.hgv === 'designated' ||
      tags.hgv === 'yes' ||
      tags.landuse === 'depot';

    if (isParkingElement) {
      if (el.type === 'way' && el.geometry && el.geometry.length >= 3) {
        parkingWays.push(el);
      } else if (el.type === 'relation' && el.members) {
        const outer = el.members.find(m => m.role === 'outer' && m.geometry && m.geometry.length >= 3);
        if (outer) {
          parkingWays.push({ ...el, geometry: outer.geometry });
        }
      }
    } else if (
      tags.power === 'generator' ||
      tags['generator:source'] === 'solar' ||
      tags['solar'] === 'yes' ||
      (tags.building === 'roof' && (tags.layer || tags['generator:method'] || tags.power))
    ) {
      if (el.geometry && el.geometry.length > 0) {
        solarFeatures.push(el.geometry.map(g => ({ lat: g.lat, lng: g.lon })));
      } else if (el.lat !== undefined && el.lon !== undefined) {
        solarFeatures.push([{ lat: el.lat, lng: el.lon }]);
      }
    }
  }

  const eligibleParkings = [];
  const isPLTypology = typologyKey.startsWith('ombriere_pl');

  for (const el of parkingWays) {
    const tags = el.tags || {};

    // ─── FILTRE 2 : PARKING DOIT ÊTRE À L'AIR LIBRE ─────────────────────────
    // Exclure parkings souterrains, en silo ou couverts (covered=yes, building=roof)
    const isUndergroundOrCovered =
      tags.parking === 'underground' ||
      tags.parking === 'multi-storey' ||
      tags.parking === 'shed' ||
      tags.parking === 'garage' ||
      tags.parking === 'carports' ||
      tags.parking === 'canopy' ||
      tags.location === 'underground' ||
      tags.covered === 'yes' ||
      tags.building === 'roof' ||
      tags.building === 'yes';

    if (isUndergroundOrCovered) continue;

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

    // ─── FILTRE 1 : SURFACE STRICTEMENT >= 220 m² (ou >= 1500 m² pour PL) ───
    if (area < minArea || area > maxArea) continue;

    const category = classifyParkingCategory(tags, area);

    // Filtrage spécifique selon la typologie sélectionnée
    if (isPLTypology) {
      // Pour les ombrières PL (15.8m, 20.2m, 24.6m) :
      // Exclure les surfaces trop exiguës (< 1 500 m²) non adaptées aux manœuvres poids lourds
      if (area < 1500) continue;
    } else {
      // Pour les ombrières VL :
      // Exclure les parkings exclusivement dédiés au stationnement poids lourds
      if (tags.amenity === 'truck_parking') continue;
    }

    // ─── FILTRE 3 : DÉTECTION OMBRIÈRES SOLAIRES EXISTANTES ──────────────────
    let hasExistingSolar =
      tags['generator:source'] === 'solar' ||
      tags['power'] === 'generator' ||
      tags['solar'] === 'yes' ||
      tags.carport === 'yes' ||
      tags.covered === 'partial';

    if (!hasExistingSolar && solarFeatures.length > 0) {
      for (const feat of solarFeatures) {
        const testPt = feat[0];
        if (isPointInPolygonWgs84(testPt, polygon)) {
          hasExistingSolar = true;
          break;
        }
      }
    }

    const center = calculateCentroid(polygon);

    const defaultName = category === 'PL'
      ? (tags.name || tags.operator || 'Site / Dépôt Poids Lourds')
      : (tags.name || tags.operator || (tags.access === 'customers' ? 'Parking Clientèle' : 'Parking en plein air'));

    eligibleParkings.push({
      id: `parking_${el.id}`,
      osmId: el.id,
      area,
      polygon,
      center,
      tags,
      category,
      hasExistingSolar,
      parkingType: tags.parking || (category === 'PL' ? 'truck' : 'surface'),
      name: defaultName
    });
  }

  // ─── TRI ET PRIORISATION SELON LA TYPOLOGIE ─────────────────────────────────
  // Typologie PL : parkings identifiés PL prioritaires au sommet de la liste, puis par surface décroissante
  // Typologie VL : parkings classés par surface décroissante
  if (isPLTypology) {
    eligibleParkings.sort((a, b) => {
      if (a.category === 'PL' && b.category !== 'PL') return -1;
      if (b.category === 'PL' && a.category !== 'PL') return 1;
      return b.area - a.area;
    });
  } else {
    eligibleParkings.sort((a, b) => b.area - a.area);
  }

  const finalLimit = limit === 'all' || limit === 'Tout' ? eligibleParkings.length : Math.min(Number(limit) || 50, eligibleParkings.length);
  return eligibleParkings.slice(0, finalLimit);
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
    const features = data.features || [];
    if (features.length === 0) return null;

    const bestFeature = features.find(f => f.properties?.type === 'housenumber')
      || features.find(f => f.properties?.type === 'street')
      || features[0];

    const feat = bestFeature?.properties;
    if (!feat) return null;

    const streetName = feat.name || feat.street || '';
    const city = feat.city || '';
    const postcode = feat.postcode || '';

    const cleanLabel = (streetName && city)
      ? `${streetName}, ${postcode} ${city}`.trim()
      : (feat.label || `${streetName} ${postcode} ${city}`.trim());

    return {
      label: cleanLabel,
      name: streetName,
      street: streetName,
      housenumber: feat.housenumber || '',
      postcode,
      city,
      type: feat.type || '',
      departmentCode: postcode ? postcode.substring(0, 2) : '33'
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
