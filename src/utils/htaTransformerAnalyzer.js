/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ANALYSEUR DE TRANSFORMATEUR HTA/BT ENEDIS & ÉLIGIBILITÉ BESS 250 kW (BT C4)
 * - Détection temps réel "Poste au Sol (Cabine)" vs "Poste sur Poteau (H61)"
 * - Croisement SIG : Lignes HTA (souterraines/aériennes), Lignes BT (25 m),
 *   Overpass / OpenStreetMap & Cadastre Bâti IGN (15 m - 60 m)
 * - Calcul de distance Haversine à la dalle BESS / Projet & chute de tension NF C 14-100
 * ═══════════════════════════════════════════════════════════════════════════
 */

const ENEDIS_DATAFAIR_BASE = 'https://opendata.enedis.fr/data-fair/api/v1/datasets';
const EARTH_RADIUS_M = 6371000;

// Caches mémoire pour éviter les requêtes redondantes lors des clics successifs
const transformerAnalysisCache = new Map();
const manualOverrideCache = new Map();

/**
 * Formule de Haversine (distance en mètres entre deux coordonnées GPS)
 */
export function calculateHaversineMeters(lat1, lng1, lat2, lng2) {
  if (
    lat1 == null || lng1 == null || lat2 == null || lng2 == null ||
    isNaN(Number(lat1)) || isNaN(Number(lng1)) || isNaN(Number(lat2)) || isNaN(Number(lng2))
  ) {
    return null;
  }
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c);
}

/**
 * Projection locale plane équirectangulaire centrée sur lat0 (en mètres)
 */
function toLocalXY(lng, lat, lat0) {
  const rad = Math.PI / 180;
  return [
    lng * rad * EARTH_RADIUS_M * Math.cos(lat0 * rad),
    lat * rad * EARTH_RADIUS_M
  ];
}

/**
 * Distance minimale entre un point local [x, y] et un segment [a, b] (en mètres)
 */
function distPointToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Distance minimale entre un point [lng, lat] et une géométrie LineString / MultiLineString
 */
function distanceToLineGeometry(ptLngLat, geometry, lat0) {
  if (!geometry || !geometry.coordinates) return Infinity;
  const p = toLocalXY(ptLngLat[0], ptLngLat[1], lat0);
  const parts = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates];
  let minDist = Infinity;

  for (const coords of parts) {
    if (!Array.isArray(coords)) continue;
    for (let i = 0; i < coords.length - 1; i++) {
      const c1 = coords[i];
      const c2 = coords[i + 1];
      if (!Array.isArray(c1) || !Array.isArray(c2)) continue;
      const a = toLocalXY(c1[0], c1[1], lat0);
      const b = toLocalXY(c2[0], c2[1], lat0);
      const d = distPointToSegment(p, a, b);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

/**
 * Calcule la distance minimale et le nombre de lignes dans un rayon donné (ex: 25 m)
 */
function analyzeLinesProximity(lat, lng, lineFeatures = [], radiusMeters = 25) {
  let minDist = Infinity;
  let countWithinRadius = 0;
  const pt = [lng, lat];

  for (const item of lineFeatures) {
    const geom =
      typeof item?.geometry === 'string'
        ? (() => {
            try {
              return JSON.parse(item.geometry);
            } catch {
              return null;
            }
          })()
        : item?.geometry;
    if (!geom) continue;
    const d = distanceToLineGeometry(pt, geom, lat);
    if (d < minDist) minDist = d;
    if (d <= radiusMeters) countWithinRadius++;
  }

  return {
    minDist: minDist === Infinity ? null : Math.round(minDist * 10) / 10,
    countWithinRadius
  };
}

/**
 * Identifie le point de référence du projet (Dalle BESS en priorité, sinon Marqueur Projet / GPS)
 */
export function findProjectBessReference({ features = [], targetPos = null, project = null, mapCenter = null }) {
  const allFeatures =
    Array.isArray(features) && features.length > 0
      ? features
      : Array.isArray(project?.features)
      ? project.features
      : [];

  // 1. Priorité absolue : Dalle béton BESS tracée sur la carte (isBattery === true)
  const batteryFeature = allFeatures.find((f) => f && f.isBattery === true);
  if (batteryFeature) {
    if (Array.isArray(batteryFeature.coords) && batteryFeature.coords.length > 0) {
      const valid = batteryFeature.coords
        .map((c) => ({ lat: Number(c?.lat ?? c?.[0]), lng: Number(c?.lng ?? c?.[1]) }))
        .filter((c) => !isNaN(c.lat) && !isNaN(c.lng));
      if (valid.length > 0) {
        const sum = valid.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
        return {
          lat: sum.lat / valid.length,
          lng: sum.lng / valid.length,
          coordsList: valid,
          label: batteryFeature.label ? `Dalle BESS (${batteryFeature.label})` : 'Dalle BESS tracée',
          isBatterySlab: true
        };
      }
    }
    if (batteryFeature.center || batteryFeature.at) {
      const pt = batteryFeature.center || batteryFeature.at;
      if (pt?.lat != null && pt?.lng != null) {
        return {
          lat: Number(pt.lat),
          lng: Number(pt.lng),
          label: 'Dalle BESS tracée',
          isBatterySlab: true
        };
      }
    }
  }

  // 2. Symbole "Lieu Projet" ou "Transfo / PDL" placé sur la carte
  const projectSymbol = allFeatures.find(
    (f) => f?.type === 'symbol' && (f.symbolType === 'project' || f.symbolType === 'site') && f.at?.lat != null
  );
  if (projectSymbol) {
    return {
      lat: Number(projectSymbol.at.lat),
      lng: Number(projectSymbol.at.lng),
      label: 'Marqueur Lieu Projet',
      isBatterySlab: false
    };
  }

  // 3. Marqueur cible actif (épingle orange sur la carte)
  if (targetPos) {
    const tLat = Array.isArray(targetPos) ? Number(targetPos[0]) : Number(targetPos?.lat);
    const tLng = Array.isArray(targetPos) ? Number(targetPos[1]) : Number(targetPos?.lng);
    if (!isNaN(tLat) && !isNaN(tLng)) {
      return {
        lat: tLat,
        lng: tLng,
        label: 'Marqueur Projet',
        isBatterySlab: false
      };
    }
  }

  // 4. Coordonnées GPS enregistrées du projet
  if (project?.gps && typeof project.gps === 'string') {
    const parts = project.gps.split(',').map((s) => Number(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return {
        lat: parts[0],
        lng: parts[1],
        label: 'Point GPS Projet',
        isBatterySlab: false
      };
    }
  }

  // 5. Rectangle de bâtiment tracé sur la carte
  const buildingRect = allFeatures.find((f) => f?.type === 'rectangle' && Array.isArray(f.coords) && f.coords.length > 0);
  if (buildingRect) {
    const valid = buildingRect.coords
      .map((c) => ({ lat: Number(c?.lat ?? c?.[0]), lng: Number(c?.lng ?? c?.[1]) }))
      .filter((c) => !isNaN(c.lat) && !isNaN(c.lng));
    if (valid.length > 0) {
      const sum = valid.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
      return {
        lat: sum.lat / valid.length,
        lng: sum.lng / valid.length,
        label: 'Bâtiment Projet',
        isBatterySlab: false
      };
    }
  }

  // 6. Fallback centre de la carte
  if (mapCenter && mapCenter.lat != null && mapCenter.lng != null) {
    return {
      lat: Number(mapCenter.lat),
      lng: Number(mapCenter.lng),
      label: 'Centre Carte',
      isBatterySlab: false
    };
  }

  return null;
}

/**
 * Évalue la règle de distance et de chute de tension NF C 14-100 pour un BESS 250 kW en BT (C4)
 */
export function evaluateBtDistanceRule(distanceMeters) {
  if (distanceMeters == null || isNaN(distanceMeters)) {
    return {
      distance: null,
      tier: 'unknown',
      statusText: 'Distance non calculable (aucun point projet défini)',
      voltageDropPct: 0,
      gaugePercent: 0,
      colorHex: '#64748b',
      bgHex: '#f1f5f9',
      borderHex: '#cbd5e1',
      cableRecommendation: 'Placer une dalle BESS ou une adresse projet'
    };
  }

  const dist = Math.round(distanceMeters);
  // Chute de tension en 250 kW triphasé 400V (I ≈ 361 A) sur câble Alu 240 mm² (~0.0234 % / m en simple, ~0.0117 % / m en doublé)
  const dropSingle240 = Math.round(dist * 0.0234 * 10) / 10;
  const gaugePercent = Math.min(100, Math.round((dist / 160) * 100));

  if (dist <= 50) {
    return {
      distance: dist,
      tier: 'ideal',
      statusText: `🟢 Distance idéale (${dist} m ≤ 50 m) — Chute de tension < 1.5%, coût liaison BT minimal`,
      voltageDropPct: dropSingle240,
      gaugePercent,
      colorHex: '#15803d',
      bgHex: '#f0fdf4',
      borderHex: '#86efac',
      barColor: '#22c55e',
      cableRecommendation: `1 × 240 mm² Alu (ΔU estimée : ~${dropSingle240.toFixed(1)}%)`
    };
  }

  if (dist <= 100) {
    return {
      distance: dist,
      tier: 'standard',
      statusText: `🟡 Distance standard (${dist} m ≤ 100 m) — Raccordement BT viable (câble 240 mm²)`,
      voltageDropPct: dropSingle240,
      gaugePercent,
      colorHex: '#a16207',
      bgHex: '#fefce8',
      borderHex: '#fde047',
      barColor: '#eab308',
      cableRecommendation: `1 × 240 mm² Alu (ΔU estimée : ~${dropSingle240.toFixed(1)}%)`
    };
  }

  if (dist <= 150) {
    const dropDoubled = Math.round((dropSingle240 / 2) * 10) / 10;
    return {
      distance: dist,
      tier: 'limit',
      statusText: `🟠 Distance limite (${dist} m) — Risque de chute de tension (> 3%), doublage câble requis`,
      voltageDropPct: dropSingle240,
      gaugePercent,
      colorHex: '#c2410c',
      bgHex: '#fff7ed',
      borderHex: '#fdba74',
      barColor: '#f97316',
      cableRecommendation: `2 × 240 mm² Alu requis (ΔU : ${dropSingle240.toFixed(1)}% → ${dropDoubled.toFixed(1)}% doublé)`
    };
  }

  return {
    distance: dist,
    tier: 'too_far',
    statusText: `🔴 Trop éloigné en BT (${dist} m > 150 m max) — Raccordement BT 250 kW déconseillé`,
    voltageDropPct: dropSingle240,
    gaugePercent: 100,
    colorHex: '#b91c1c',
    bgHex: '#fef2f2',
    borderHex: '#fca5a5',
    barColor: '#ef4444',
    cableRecommendation: `Hors gabarit NF C 14-100 en 250 kW BT (ΔU ~${dropSingle240.toFixed(1)}% > 3%)`
  };
}

/**
 * Interroge un dataset DataFair Enedis autour d'un point avec un timeout court
 */
async function fetchLocalEnedisLines(dataset, lat, lng, deltaDeg = 0.0012) {
  const bbox = `${lng - deltaDeg},${lat - deltaDeg},${lng + deltaDeg},${lat + deltaDeg}`;
  const url = `${ENEDIS_DATAFAIR_BASE}/${dataset}/lines?size=200&bbox=${bbox}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Interroge Overpass API (OSM) + Cadastre Bâti IGN dans un rayon de 15 m à 60 m
 */
async function fetchOsmAndCadastreContext(lat, lng) {
  const result = {
    hasCabinFootprint15m: false,
    hasIndustrialZone60m: false,
    buildingsCount60m: 0,
    isOsmPole: false,
    osmTransformerTag: null,
    osmKvaRating: null,
    details: []
  };

  // 1. Requête Overpass API (rayon 15m pour poste/cabine/poteau, 60m pour bâtiments/zone industrielle)
  const overpassQuery = `[out:json][timeout:3];(node(around:15,${lat},${lng})["power"];way(around:15,${lat},${lng})["power"];way(around:15,${lat},${lng})["building"];way(around:60,${lat},${lng})["building"];way(around:60,${lat},${lng})["landuse"~"industrial|commercial|retail|farmyard"];);out tags center;`;

  const overpassPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2600);
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  })();

  // 2. Requête Cadastre Bâti IGN (rayon ~20m et ~55m) pour détecter les emprises bâties / hangars même si OSM est incomplet
  const ignBatiPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    try {
      const dLat = 55 / 111000;
      const dLng = 55 / (111000 * Math.cos((lat * Math.PI) / 180));
      const poly = {
        type: 'Polygon',
        coordinates: [[
          [lng - dLng, lat - dLat],
          [lng + dLng, lat - dLat],
          [lng + dLng, lat + dLat],
          [lng - dLng, lat + dLat],
          [lng - dLng, lat - dLat]
        ]]
      };
      const url = `https://apicarto.ign.fr/api/cadastre/batiment?geom=${encodeURIComponent(JSON.stringify(poly))}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  })();

  const [osmData, ignData] = await Promise.all([overpassPromise, ignBatiPromise]);

  if (osmData && Array.isArray(osmData.elements)) {
    for (const el of osmData.elements) {
      const tags = el.tags || {};
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const dist = elLat != null && elLng != null ? calculateHaversineMeters(lat, lng, elLat, elLng) : 30;

      if (tags.rating) {
        result.osmKvaRating = tags.rating;
      }

      // Détection explicite poteau H61 dans OSM
      if (
        dist <= 18 &&
        (tags.power === 'pole' ||
          tags.location === 'pole' ||
          tags.substation === 'minor_distribution_pole' ||
          tags['tower:type'] === 'pole')
      ) {
        result.isOsmPole = true;
      }

      // Détection cabine maçonnée / emprise bâtie à <= 15m
      if (
        dist <= 16 &&
        el.type === 'way' &&
        (tags.building || tags.power === 'substation' || tags.substation === 'minor_distribution')
      ) {
        result.hasCabinFootprint15m = true;
      }

      // Détection zone industrielle / commerciale / hangar à <= 60m
      if (dist <= 65) {
        if (tags.building) {
          result.buildingsCount60m++;
          const bType = String(tags.building).toLowerCase();
          if (
            ['industrial', 'commercial', 'warehouse', 'hangar', 'retail', 'manufacture', 'farm_auxiliary', 'barn', 'supermarket'].includes(bType)
          ) {
            result.hasIndustrialZone60m = true;
          }
        }
        if (tags.landuse) {
          const lType = String(tags.landuse).toLowerCase();
          if (['industrial', 'commercial', 'retail'].includes(lType)) {
            result.hasIndustrialZone60m = true;
          }
        }
      }
    }
  }

  // Exploitation du Cadastre Bâti IGN (PCI)
  if (ignData && Array.isArray(ignData.features) && ignData.features.length > 0) {
    result.buildingsCount60m = Math.max(result.buildingsCount60m, ignData.features.length);
    for (const feat of ignData.features) {
      const geom = feat.geometry;
      if (!geom || !geom.coordinates) continue;
      // Calcul rapide du centroïde et de l'envergure du bâtiment cadastral
      const ring =
        geom.type === 'MultiPolygon'
          ? geom.coordinates?.[0]?.[0]
          : geom.type === 'Polygon'
          ? geom.coordinates?.[0]
          : null;
      if (Array.isArray(ring) && ring.length >= 3) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let sumLng = 0, sumLat = 0;
        for (const pt of ring) {
          const [x, y] = toLocalXY(pt[0], pt[1], lat);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          sumLng += pt[0];
          sumLat += pt[1];
        }
        const cLng = sumLng / ring.length;
        const cLat = sumLat / ring.length;
        const distCenter = calculateHaversineMeters(lat, lng, cLat, cLng);
        const approxAreaM2 = Math.abs((maxX - minX) * (maxY - minY)) * 0.7;

        // Petite emprise bâtie (< 35 m²) à moins de 15 m => cabine de transformateur cadastrée !
        if (distCenter <= 15 && approxAreaM2 >= 2 && approxAreaM2 <= 45) {
          result.hasCabinFootprint15m = true;
        }
        // Grand bâtiment (hangar, bâtiment industriel/agricole > 220 m²) à moins de 60 m
        if (distCenter <= 60 && approxAreaM2 >= 220) {
          result.hasIndustrialZone60m = true;
        }
      }
    }
  }

  return result;
}

/**
 * Exécute l'algorithme complet de détection "Poste au Sol (Cabine)" vs "Poste sur Poteau (H61)"
 * et retourne l'analyse métier Enedis (CAS 1, CAS 2, CAS 3).
 */
export async function analyzeHtaBtTransformer(lat, lng, props = {}, cachedNetworkLayers = null) {
  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  if (transformerAnalysisCache.has(cacheKey)) {
    return transformerAnalysisCache.get(cacheKey);
  }

  // Récupération parallèle des 4 couches réseau Enedis dans un rayon local + contexte OSM/Cadastre
  const [htaSoutLines, htaAerLines, btSoutLines, btAerLines, osmCadastre] = await Promise.all([
    fetchLocalEnedisLines('reseau-souterrain-hta', lat, lng),
    fetchLocalEnedisLines('reseau-hta', lat, lng),
    fetchLocalEnedisLines('reseau-souterrain-bt', lat, lng),
    fetchLocalEnedisLines('reseau-bt', lat, lng),
    fetchOsmAndCadastreContext(lat, lng)
  ]);

  // Fusion éventuelle avec les couches déjà chargées en mémoire sur la carte
  const mergedHtaSout = htaSoutLines.length > 0 ? htaSoutLines : cachedNetworkLayers?.htaSouterrain || [];
  const mergedHtaAer = htaAerLines.length > 0 ? htaAerLines : cachedNetworkLayers?.htaAerien || [];
  const mergedBtSout = btSoutLines.length > 0 ? btSoutLines : cachedNetworkLayers?.btSouterrain || [];
  const mergedBtAer = btAerLines.length > 0 ? btAerLines : cachedNetworkLayers?.btAerien || [];

  const htaSoutProx = analyzeLinesProximity(lat, lng, mergedHtaSout, 25);
  const htaAerProx = analyzeLinesProximity(lat, lng, mergedHtaAer, 25);
  const btSoutProx = analyzeLinesProximity(lat, lng, mergedBtSout, 25);
  const btAerProx = analyzeLinesProximity(lat, lng, mergedBtAer, 25);

  const hasHtaSouterraine = htaSoutProx.minDist !== null && htaSoutProx.minDist <= 25;
  const hasHtaAerienne = htaAerProx.minDist !== null && htaAerProx.minDist <= 25;
  const btSoutCount = btSoutProx.countWithinRadius;
  const btAerCount = btAerProx.countWithinRadius;

  // Inspection d'indices textuels éventuels dans les propriétés Enedis
  const rawTypeStr = `${props?.type_poste || ''} ${props?.nom_poste || ''} ${props?.nature || ''}`.toUpperCase();
  const explicitPoleInProps = rawTypeStr.includes('POTEAU') || rawTypeStr.includes('H61');
  const explicitCabinInProps =
    rawTypeStr.includes('CABINE') ||
    rawTypeStr.includes('PAC') ||
    rawTypeStr.includes('PRM') ||
    rawTypeStr.includes('PSS') ||
    rawTypeStr.includes('IMMEUBLE') ||
    rawTypeStr.includes('MACONNE');

  let caseId = 'CAS_1';
  let reasons = [];

  if (explicitPoleInProps || (osmCadastre.isOsmPole && !hasHtaSouterraine && btSoutCount === 0)) {
    caseId = 'CAS_3';
    reasons.push('Identifié comme poste H61 sur poteau (arrivée aérienne)');
  } else if (
    explicitCabinInProps ||
    hasHtaSouterraine ||
    btSoutCount >= 3 ||
    osmCadastre.hasCabinFootprint15m ||
    (osmCadastre.hasIndustrialZone60m && (!hasHtaAerienne || btSoutCount >= 1))
  ) {
    // CAS 1 : Poste Cabine Posé au Sol (Zone d'Activités / Industriel / Urbain ou Arrivée HTA Souterraine)
    caseId = 'CAS_1';
    if (hasHtaSouterraine) reasons.push(`Arrivée HTA souterraine connectée (${htaSoutProx.minDist} m)`);
    if (btSoutCount >= 3) reasons.push(`${btSoutCount} départs BT souterrains détectés (≤ 25 m)`);
    else if (btSoutCount > 0) reasons.push(`${btSoutCount} départ(s) BT souterrain(s) (≤ 25 m)`);
    if (osmCadastre.hasCabinFootprint15m) reasons.push('Emprise bâtie / cabine au sol détectée (< 15 m)');
    if (osmCadastre.hasIndustrialZone60m) reasons.push('Zone d’activité / hangar industriel à moins de 60 m');
  } else if (
    btSoutCount >= 2 ||
    (btSoutCount >= 1 && (btAerCount >= 1 || osmCadastre.buildingsCount60m >= 1)) ||
    osmCadastre.hasIndustrialZone60m ||
    osmCadastre.buildingsCount60m >= 2
  ) {
    // CAS 2 : Poste au Sol Simplifié (Périurbain / Rural mixte)
    caseId = 'CAS_2';
    if (hasHtaAerienne) reasons.push(`Arrivée HTA aérienne (${htaAerProx.minDist} m)`);
    if (btSoutCount > 0) reasons.push(`${btSoutCount} départ(s) BT souterrain(s) + ${btAerCount} aérien(s)`);
    if (osmCadastre.buildingsCount60m > 0) {
      reasons.push(`Proximité immédiate d'un groupe bâti / exploitation (${osmCadastre.buildingsCount60m} bât. < 60 m)`);
    }
  } else {
    // CAS 3 : Poste H61 Haut de Poteau (Aérien rural isolé)
    caseId = 'CAS_3';
    if (hasHtaAerienne) reasons.push(`Arrivée HTA 100 % aérienne (${htaAerProx.minDist} m)`);
    else reasons.push('Bout de ligne rurale sans réseau HTA souterrain');
    reasons.push('Aucune emprise bâtie de cabine au sol (< 15 m)');
    reasons.push(`${btAerCount <= 1 ? '1 seul départ BT aérien isolé' : `${btAerCount} départ(s) BT aérien(s)`}`);
  }

  const caseDefinitions = {
    CAS_1: {
      caseId: 'CAS_1',
      physicalCategory: 'sol',
      shortBadge: 'Poste au Sol (Cabine)',
      detectedTypeLabel: 'Poste Cabine au Sol (Type PAC / PRM maçonné)',
      estimatedPowerLabel: '400 kVA à 630 kVA (Plage sol : 250 – 1 000 kVA)',
      defaultPowerSelector: '400 kVA',
      bessCompatibilityLabel: '✅ ÉLIGIBLE 250 kW BT (Capacité transfo suffisante)',
      bessCompatibilityStatus: 'eligible',
      badgeTheme: {
        bg: '#dcfce7',
        text: '#15803d',
        border: '#86efac',
        dot: '#16a34a'
      }
    },
    CAS_2: {
      caseId: 'CAS_2',
      physicalCategory: 'sol',
      shortBadge: 'Poste au Sol (Simplifié)',
      detectedTypeLabel: 'Poste Bas Simplifié au Sol (Rural / Périurbain)',
      estimatedPowerLabel: '160 kVA à 250 kVA (Vérifier si 400 kVA)',
      defaultPowerSelector: '250 kVA',
      bessCompatibilityLabel: '⚠️ SOUS RÉSERVE (250 kVA min requis)',
      bessCompatibilityStatus: 'reserve',
      badgeTheme: {
        bg: '#fef3c7',
        text: '#b45309',
        border: '#fcd34d',
        dot: '#f59e0b'
      }
    },
    CAS_3: {
      caseId: 'CAS_3',
      physicalCategory: 'poteau',
      shortBadge: 'Poste sur Poteau (H61)',
      detectedTypeLabel: 'Poste H61 sur Poteau (Aérien)',
      estimatedPowerLabel: '50 kVA à 160 kVA max',
      defaultPowerSelector: '50-160 kVA',
      bessCompatibilityLabel: '❌ INCOMPATIBLE 250 kW (Mutation en poste au sol requise)',
      bessCompatibilityStatus: 'incompatible',
      badgeTheme: {
        bg: '#fee2e2',
        text: '#b91c1c',
        border: '#fca5a5',
        dot: '#ef4444'
      }
    }
  };

  const result = {
    ...caseDefinitions[caseId],
    telemetry: {
      hasHtaSouterraine,
      hasHtaAerienne,
      distHtaSouterraine: htaSoutProx.minDist,
      distHtaAerienne: htaAerProx.minDist,
      btSouterrainCount: btSoutCount,
      btAerienCount: btAerCount,
      hasCabinFootprint15m: osmCadastre.hasCabinFootprint15m,
      hasIndustrialZone60m: osmCadastre.hasIndustrialZone60m,
      buildingsCount60m: osmCadastre.buildingsCount60m
    },
    reasons
  };

  transformerAnalysisCache.set(cacheKey, result);
  return result;
}

/**
 * Combine l'analyse automatique, le forçage manuel éventuel et la distance à la dalle BESS
 * pour produire le verdict final de raccordement BESS 250 kW (BT C4) et le chiffrage estimatif.
 */
export function computeFinalHtaBtAudit(analysis) {
  const detectedTypeLabel = analysis.detectedTypeLabel;
  const shortBadge = analysis.shortBadge;
  const estimatedPowerLabel = analysis.estimatedPowerLabel;
  const bessCompatibilityLabel = analysis.bessCompatibilityLabel;
  const bessCompatibilityStatus = analysis.bessCompatibilityStatus;
  const badgeTheme = analysis.badgeTheme;

  let costEstimateLabel = '';
  let costDetailLabel = '';
  let globalVerdictTitle = '';
  let globalVerdictTheme = { bg: '#dcfce7', text: '#15803d', border: '#86efac' };

  if (bessCompatibilityStatus === 'incompatible') {
    costEstimateLabel = '35 000 € – 55 000 € HT';
    costDetailLabel = 'Mutation H61 → Poste PAC au sol 400 kVA + reprise HTA/BT requise';
    globalVerdictTitle = '❌ NON VIABLE EN BT DIRECT (Mutation poste H61 requise)';
    globalVerdictTheme = { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' };
  } else if (bessCompatibilityStatus === 'reserve') {
    costEstimateLabel = '4 500 € – 12 000 € HT';
    costDetailLabel = 'Branchement C4 250 kVA + liaison souterraine BT (selon distance)';
    globalVerdictTitle = '⚠️ VIABLE SOUS RÉSERVE (Vérifier transfo ≥ 250 kVA)';
    globalVerdictTheme = { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
  } else {
    costEstimateLabel = '4 000 € – 12 000 € HT';
    costDetailLabel = 'Forfait C4 250 kVA + liaison BT 240 mm² Alu (selon distance ≤ 100 m)';
    globalVerdictTitle = '✅ RACCORDEMENT BESS 250 kW BT (C4) OPTIMAL';
    globalVerdictTheme = { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
  }

  return {
    shortBadge,
    detectedTypeLabel,
    estimatedPowerLabel,
    bessCompatibilityLabel,
    bessCompatibilityStatus,
    badgeTheme,
    costEstimateLabel,
    costDetailLabel,
    globalVerdictTitle,
    globalVerdictTheme
  };
}

/**
 * Monte et gère l'interface de la popup "⚡ Analyse Poste HTA/BT Enedis"
 */
export function renderHtaTransformerPopupDOM(container, { lat, lng, props, cachedNetworkLayers }) {
  if (!container) return;

  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  const codeCommune = props?.code_commune || props?.code_insee || 'N/A';
  const nomCommune = props?.nom_commune || '';
  const nomPoste = props?.nom_poste || props?.id_poste || '';
  const refLabel = nomPoste
    ? `${nomPoste} (${codeCommune})`
    : `Code Commune : ${codeCommune}${nomCommune ? ` — ${nomCommune}` : ''}`;

  // État d'affichage initial pendant le croisement SIG (quelques centaines de ms au 1er clic)
  const renderSkeleton = () => {
    container.innerHTML = `
      <div style="font-family: Inter, system-ui, -apple-system, sans-serif; width: 355px; color: #0f172a; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.2px; display: flex; align-items: center; gap: 6px;">
              <span style="color: #facc15;">⚡</span> Analyse Poste HTA/BT Enedis
            </div>
            <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">${refLabel}</div>
          </div>
          <span style="font-size: 9.5px; background: rgba(255,255,255,0.12); color: #e2e8f0; padding: 2px 7px; border-radius: 999px; font-weight: 600;">
            ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}
          </span>
        </div>
        <div style="padding: 16px 12px; text-align: center; font-size: 12px; color: #475569;">
          <div style="margin-bottom: 6px; font-weight: 700; color: #0f172a;">🔄 Croisement SIG HTA/BT & Cadastre en cours...</div>
          <div style="font-size: 11px; color: #64748b;">Analyse des lignes HTA/BT (25 m) et de l'emprise au sol (15–60 m)</div>
        </div>
      </div>
    `;
  };

  const renderFullAudit = (analysis) => {
    const audit = computeFinalHtaBtAudit(analysis);

    const t = analysis.telemetry;
    const htaLineBadge = t.hasHtaSouterraine
      ? `<span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:4px;font-weight:700;">HTA Souterraine (${t.distHtaSouterraine} m)</span>`
      : t.hasHtaAerienne
      ? `<span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-weight:700;">HTA Aérienne (${t.distHtaAerienne} m)</span>`
      : `<span style="background:#f1f5f9;color:#475569;padding:1px 6px;border-radius:4px;font-weight:600;">HTA > 25 m</span>`;

    const btLineBadge = `<span style="background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;font-weight:700;">BT ≤ 25m : ${t.btSouterrainCount} sout. / ${t.btAerienCount} aér.</span>`;

    container.innerHTML = `
      <div style="font-family: Inter, system-ui, -apple-system, sans-serif; width: 355px; max-width: 100%; color: #0f172a; background: #ffffff; border-radius: 10px; overflow: hidden;">
        <!-- EN-TÊTE SOMBRE -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 10px 12px; border-radius: 8px 8px 0 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div style="font-size: 13.5px; font-weight: 800; letter-spacing: 0.1px; display: flex; align-items: center; gap: 5px;">
              <span style="color: #facc15; font-size: 15px;">⚡</span> Analyse Poste HTA/BT Enedis
            </div>
            <span style="font-size: 10px; font-weight: 800; padding: 2.5px 8px; border-radius: 999px; background: ${audit.badgeTheme.bg}; color: ${audit.badgeTheme.text}; border: 1px solid ${audit.badgeTheme.border}; white-space: nowrap;">
              ${audit.shortBadge}
            </span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font-size: 10.5px; color: #cbd5e1;">
            <span><strong>${refLabel}</strong></span>
            <span style="font-family: monospace; color: #94a3b8;">${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}</span>
          </div>
        </div>

        <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <!-- 1. TYPOLOGIE PHYSIQUE & PUISSANCE ESTIMÉE -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.4px;">
                1. Typologie Physique (Détection SIG Auto)
              </span>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: ${audit.badgeTheme.text}; margin-bottom: 4px;">
              ${audit.detectedTypeLabel}
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 5px;">
              <span style="color: #64748b;">Puissance estimée :</span>
              <strong style="color: #0f172a;"> ${audit.estimatedPowerLabel}</strong>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 9.5px; margin-bottom: 6px;">
              ${htaLineBadge}
              ${btLineBadge}
              ${
                t.hasCabinFootprint15m
                  ? `<span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:4px;font-weight:700;">Bâti Cabine < 15m</span>`
                  : ''
              }
              ${
                t.hasIndustrialZone60m
                  ? `<span style="background:#ede9fe;color:#5b21b6;padding:1px 6px;border-radius:4px;font-weight:700;">Hangar / Zone Act. < 60m</span>`
                  : ''
              }
            </div>

            <!-- Compatibilité Transfo -->
            <div style="background: ${audit.badgeTheme.bg}; border: 1px solid ${audit.badgeTheme.border}; color: ${audit.badgeTheme.text}; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;">
              ${audit.bessCompatibilityLabel}
            </div>
          </div>

          <!-- 2. VERDICT RACCORDEMENT BESS 250 kW (BT C4) & COÛT ESTIMÉ -->
          <div style="background: #0f172a; color: #ffffff; border-radius: 8px; padding: 8px 10px;">
            <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.4px; margin-bottom: 4px;">
              2. Verdict Raccordement BESS 250 kW (BT C4)
            </div>
            <div style="background: ${audit.globalVerdictTheme.bg}; color: ${audit.globalVerdictTheme.text}; border: 1px solid ${audit.globalVerdictTheme.border}; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 900; margin-bottom: 6px;">
              ${audit.globalVerdictTitle}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
              <span style="color: #cbd5e1;">Coût branchement BT estimé :</span>
              <strong style="color: #4ade80; font-size: 12px;">${audit.costEstimateLabel}</strong>
            </div>
            <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">
              ${audit.costDetailLabel}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Si déjà en cache, rendu immédiat sans squelette
  if (transformerAnalysisCache.has(cacheKey)) {
    renderFullAudit(transformerAnalysisCache.get(cacheKey));
    return;
  }

  renderSkeleton();
  analyzeHtaBtTransformer(lat, lng, props, cachedNetworkLayers)
    .then((analysis) => {
      renderFullAudit(analysis);
    })
    .catch((err) => {
      console.error('[HTA Analyzer] Erreur analyse transfo:', err);
    });
}
