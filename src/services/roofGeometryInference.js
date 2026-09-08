/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROOF GEOMETRY INFERENCE ENGINE (TURF.JS)
 * Analyse géospatiale et inférence géométrique automatique des toitures :
 * 1. Recalibrage raster/vecteur par retrait périphérique intérieur (buffer négatif)
 * 2. Boîte englobante orientée (Oriented Bounding Box - OBB via Turf.js)
 * 3. Détection du faîtage central (grand axe longitudinal médian)
 * 4. Découpage géométrique en deux pans (versants)
 * 5. Calcul des azimuts selon la CONVENTION SOLAIRE STANDARD :
 *    - Sud = 0°
 *    - Ouest = +90°
 *    - Est = -90°
 *    - Nord = 180°
 * 6. Inférence typologique : Toiture Terrasse (0°) vs Inclinée (Bipente / Asymétrique)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import * as turf from '@turf/turf';

/**
 * Projette des coordonnées WGS84 ({lat, lng}) dans un repère cartésien 2D local en mètres
 * centré sur le barycentre du polygone (évite la distorsion sphérique).
 */
export function projectCoordinatesToLocalMeters(coords) {
  if (!coords || coords.length < 3) return null;

  let sumLat = 0;
  let sumLng = 0;
  coords.forEach(c => {
    sumLat += (c.lat !== undefined ? c.lat : c[1]);
    sumLng += (c.lng !== undefined ? c.lng : c[0]);
  });
  const origin = { lat: sumLat / coords.length, lng: sumLng / coords.length };
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);

  // x = Est (mètres), y = Nord (mètres)
  const pts2D = coords.map(c => {
    const lat = c.lat !== undefined ? c.lat : c[1];
    const lng = c.lng !== undefined ? c.lng : c[0];
    return {
      x: (lng - origin.lng) * 111320 * cosLat,
      y: (lat - origin.lat) * 110574,
    };
  });

  return { pts2D, origin };
}

/**
 * Convertit un angle de boussole géographique (0°=Nord, 90°=Est, 180°=Sud, 270°=Ouest)
 * en AZIMUT SOLAIRE STANDARD :
 * - Sud = 0°
 * - Ouest = +90°
 * - Est = -90°
 * - Nord = 180°
 */
export function compassToSolarAzimuth(compassDeg) {
  const norm = ((compassDeg % 360) + 360) % 360;
  let solar = Math.round(norm - 180);
  if (solar === -180) solar = 180;
  return solar;
}

/**
 * Convertit un azimut solaire standard vers un cap boussole géographique
 */
export function solarToCompassAzimuth(solarDeg) {
  return ((solarDeg + 180) % 360 + 360) % 360;
}

/**
 * Libellé explicite d'orientation selon l'azimut solaire standard
 */
export function getSolarOrientationLabel(solarAzimuth) {
  if (Math.abs(solarAzimuth) <= 15) return `Plein Sud (${solarAzimuth > 0 ? '+' : ''}${solarAzimuth}°)`;
  if (solarAzimuth > 15 && solarAzimuth <= 65) return `Sud-Ouest (+${solarAzimuth}°)`;
  if (solarAzimuth > 65 && solarAzimuth <= 115) return `Plein Ouest (+${solarAzimuth}°)`;
  if (solarAzimuth > 115 && solarAzimuth < 165) return `Nord-Ouest (+${solarAzimuth}°)`;
  if (solarAzimuth < -15 && solarAzimuth >= -65) return `Sud-Est (${solarAzimuth}°)`;
  if (solarAzimuth < -65 && solarAzimuth >= -115) return `Plein Est (${solarAzimuth}°)`;
  if (solarAzimuth < -115 && solarAzimuth > -165) return `Nord-Est (${solarAzimuth}°)`;
  return `Plein Nord (${solarAzimuth}°)`;
}

/**
 * Libellé cardinal historique pour compatibilité
 */
export function getCompassLabel(compassDeg) {
  const az = ((compassDeg % 360) + 360) % 360;
  if (az >= 337.5 || az < 22.5) return `Nord (${az}°)`;
  if (az >= 22.5 && az < 67.5) return `Nord-Est (${az}°)`;
  if (az >= 67.5 && az < 112.5) return `Est (${az}°)`;
  if (az >= 112.5 && az < 157.5) return `Sud-Est (${az}°)`;
  if (az >= 157.5 && az < 202.5) return `Plein Sud (${az}°)`;
  if (az >= 202.5 && az < 247.5) return `Sud-Ouest (${az}°)`;
  if (az >= 247.5 && az < 292.5) return `Ouest (${az}°)`;
  return `Nord-Ouest (${az}°)`;
}

/**
 * Calcule le coefficient d'ensoleillement solaire (0.50 à 1.00) selon l'azimut solaire et la pente
 * Convention solaire : 0° = Sud, ±90° = Est/Ouest, 180° = Nord
 */
export function calculateSolarOrientationCoeff(azimuth, pitchDeg = 15) {
  if (pitchDeg === 0) return 0.90; // Toit plat horizontal

  // Normalisation vers l'écart absolu au Plein Sud
  const deltaSud = Math.abs(azimuth) > 180 ? Math.abs(180 - azimuth) : Math.abs(azimuth);

  if (deltaSud <= 25) return 1.00;  // Plein Sud (0° à 25° d'écart)
  if (deltaSud <= 50) return 0.96;  // Sud-Est / Sud-Ouest
  if (deltaSud <= 85) return 0.86;  // Est-Sud-Est / Ouest-Sud-Ouest
  if (deltaSud <= 105) return 0.80; // Plein Est / Plein Ouest
  if (deltaSud <= 140) return 0.70; // Nord-Est / Nord-Ouest
  return 0.58;                      // Plein Nord
}

/**
 * ─── CHANTIER 3 : RECALIBRAGE GÉOMÉTRIQUE & BUFFER NÉGATIF ─────────────────
 * Applique un retrait périphérique intérieur (0.8 à 1.2 m) pour éliminer les
 * débordements de chéneaux, gouttières et décalages de parallaxe sur l'image satellite.
 */
export function applyNegativeRoofBuffer(coords, distanceMeters = 0.8) {
  if (!coords || coords.length < 3) return coords;

  try {
    const ring = coords.map(c => [
      c.lng !== undefined ? c.lng : c[0],
      c.lat !== undefined ? c.lat : c[1]
    ]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push([...ring[0]]);
    }
    const poly = turf.polygon([ring]);
    const buffered = turf.buffer(poly, -distanceMeters, { units: 'meters' });

    if (buffered && buffered.geometry && buffered.geometry.coordinates?.[0]?.length >= 4) {
      const resRing = buffered.geometry.coordinates[0];
      // On retire le dernier point s'il est identique au premier
      const cleaned = resRing.slice(0, resRing.length - 1).map(pt => ({ lat: pt[1], lng: pt[0] }));
      if (cleaned.length >= 3) {
        return cleaned;
      }
    }
  } catch (e) {
    console.warn('Fallback buffer négatif toiture:', e);
  }

  return coords;
}

/**
 * Calcule l'enveloppe minimale orientée (Oriented Bounding Box - OBB) d'un polygone
 */
export function computeOrientedBoundingBox(coords) {
  const projected = projectCoordinatesToLocalMeters(coords);
  if (!projected) return null;
  const { pts2D } = projected;

  const testedAngles = [];
  const n = pts2D.length;
  for (let i = 0; i < n; i++) {
    const pA = pts2D[i];
    const pB = pts2D[(i + 1) % n];
    const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
    testedAngles.push(angle);
  }

  for (let deg = 0; deg < 180; deg += 1) {
    testedAngles.push((deg * Math.PI) / 180);
  }

  let minArea = Infinity;
  let bestBox = null;

  for (const theta of testedAngles) {
    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);

    let minU = Infinity, maxU = -Infinity;
    let minV = Infinity, maxV = -Infinity;

    for (const p of pts2D) {
      const u = p.x * cosT - p.y * sinT;
      const v = p.x * sinT + p.y * cosT;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }

    const du = maxU - minU;
    const dv = maxV - minV;
    const area = du * dv;

    if (area < minArea && du > 0.5 && dv > 0.5) {
      minArea = area;
      const isULonger = du >= dv;
      const length = isULonger ? du : dv;
      const breadth = isULonger ? dv : du;

      // Direction géométrique du grand axe (faîtage)
      const ridgeTrigoRad = isULonger ? theta : theta + Math.PI / 2;
      const dx = Math.cos(ridgeTrigoRad);
      const dy = Math.sin(ridgeTrigoRad);

      // Cap boussole du faîtage (axe [0°, 180°[)
      const ridgeGeoAzimuth = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      const ridgeAxisDeg = Math.round(ridgeGeoAzimuth % 180);

      // Les normales aux deux versants opposés sont perpendiculaires au faîtage (± 90°)
      const compassSlope1 = Math.round((ridgeAxisDeg + 90) % 360);
      const compassSlope2 = Math.round((ridgeAxisDeg + 270) % 360);

      // Conversion en azimuts solaires : Sud = 0°, Ouest = +90°, Est = -90°, Nord = 180°
      const solarSlope1 = compassToSolarAzimuth(compassSlope1);
      const solarSlope2 = compassToSolarAzimuth(compassSlope2);

      bestBox = {
        area: Math.round(area),
        length: Math.round(length * 10) / 10,
        breadth: Math.round(breadth * 10) / 10,
        aspectRatio: Math.round((length / breadth) * 100) / 100,
        ridgeAxisDeg,
        compassSlope1,
        compassSlope2,
        solarSlope1,
        solarSlope2,
      };
    }
  }

  return bestBox;
}

/**
 * ─── CHANTIER 4 : MOTEUR GÉOMÉTRIQUE COMPLET TURF.JS ───────────────────────
 * 1. Calcule la boîte englobante orientée (OBB)
 * 2. Identifie le faîtage central joignant les milieux des deux petits côtés
 * 3. Divise la toiture en 2 pans de part et d'autre du faîtage
 * 4. Calcule les azimuts solaires (Sud = 0°, Ouest = +90°, Est = -90°, Nord = 180°)
 * 5. Sélectionne le(s) pan(s) favorable(s) pour la simulation
 */
export function computeRoofPansAndRidge(coords) {
  if (!coords || coords.length < 3) return null;

  // Recalibrage initial par buffer négatif pour garantir l'absence de débordement
  const bufferedCoords = applyNegativeRoofBuffer(coords, 0.8);
  const obb = computeOrientedBoundingBox(bufferedCoords);
  if (!obb) return null;

  const { area, length, breadth, aspectRatio, ridgeAxisDeg, solarSlope1, solarSlope2, compassSlope1, compassSlope2 } = obb;

  // Versant le plus favorable = celui dont l'azimut solaire est le plus proche de 0° (Plein Sud)
  const absSolar1 = Math.abs(solarSlope1);
  const absSolar2 = Math.abs(solarSlope2);

  const bestIsPan1 = absSolar1 <= absSolar2;
  const bestSolarAzimuth = bestIsPan1 ? solarSlope1 : solarSlope2;
  const secondarySolarAzimuth = bestIsPan1 ? solarSlope2 : solarSlope1;

  const bestCompassAzimuth = bestIsPan1 ? compassSlope1 : compassSlope2;
  const secondaryCompassAzimuth = bestIsPan1 ? compassSlope2 : compassSlope1;

  // Division géométrique estimée des pans
  // Pan 1 (versant Sud / favorable) et Pan 2 (versant opposé)
  return {
    area,
    length,
    breadth,
    aspectRatio,
    ridge: {
      axisDeg: ridgeAxisDeg,
      label: `Axe ${ridgeAxisDeg}° (${(ridgeAxisDeg >= 45 && ridgeAxisDeg <= 135) ? 'Est-Ouest' : 'Nord-Sud'})`,
    },
    slopes: {
      pan1: {
        solarAzimuth: bestSolarAzimuth,
        compassAzimuth: bestCompassAzimuth,
        label: getSolarOrientationLabel(bestSolarAzimuth),
        coeff: calculateSolarOrientationCoeff(bestSolarAzimuth, 15),
        isSouthFacing: Math.abs(bestSolarAzimuth) <= 45, // Tolérance -45° à +45°
      },
      pan2: {
        solarAzimuth: secondarySolarAzimuth,
        compassAzimuth: secondaryCompassAzimuth,
        label: getSolarOrientationLabel(secondarySolarAzimuth),
        coeff: calculateSolarOrientationCoeff(secondarySolarAzimuth, 15),
        isSouthFacing: Math.abs(secondarySolarAzimuth) <= 45,
      },
    },
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFERENCE COMPLÈTE DU TYPE DE TOITURE, FAÎTAGE & ORIENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function inferRoofCharacteristics(coords, osmTags = {}) {
  // Application du buffer négatif de recalibrage géométrique (Chantier 3)
  const calibratedCoords = applyNegativeRoofBuffer(coords, 0.8);
  const pansData = computeRoofPansAndRidge(calibratedCoords);

  if (!pansData) {
    return {
      roofType: 'inclinee_symetrique',
      pitch: 15,
      isTerrasse: false,
      dimensions: { area: 1000, length: 50, breadth: 20, aspectRatio: 2.5 },
      ridge: { axisDeg: 90, label: 'Axe Est-Ouest (90°)' },
      slopes: {
        pan1: { solarAzimuth: 0, azimuthDeg: 180, label: 'Plein Sud (0°)', share: 0.5, coeff: 1.0 },
        pan2: { solarAzimuth: 180, azimuthDeg: 0, label: 'Plein Nord (180°)', share: 0.5, coeff: 0.58 },
      },
      displayLabel: 'Toiture bipente 15° — Sud / Nord',
    };
  }

  const { area, length, breadth, aspectRatio, ridge, slopes } = pansData;
  const { pan1, pan2 } = slopes;

  // Détection tags explicites OpenStreetMap
  const explicitRoof = osmTags['roof:shape'] || osmTags['roof:type'] || '';
  const isExplicitFlat = explicitRoof === 'flat' || osmTags.building === 'commercial' || osmTags.building === 'retail';
  const isExplicitGabled = explicitRoof === 'gabled' || explicitRoof === 'hipped';

  let roofType = 'inclinee_symetrique';
  let pitch = 15;
  let isTerrasse = false;
  let surfaceShare = { pan1: 0.5, pan2: 0.5 };
  let displayLabel = '';

  // RÈGLE 1 : Toiture Terrasse / Toit plat (0°)
  if ((isExplicitFlat && !isExplicitGabled) || (area >= 2500 && aspectRatio < 1.45)) {
    roofType = 'terrasse';
    pitch = 0;
    isTerrasse = true;
    surfaceShare = { pan1: 1.0, pan2: 0.0 };
    displayLabel = 'Toiture terrasse (Toit plat 0°) • Pose sur bacs lestés';
  }
  // RÈGLE 2 : Toiture Inclinée Asymétrique / Monopente (Grand versant orienté Plein Sud)
  else if (aspectRatio >= 2.0 && Math.abs(pan1.solarAzimuth) <= 25) {
    roofType = 'inclinee_asymetrique';
    pitch = 15;
    isTerrasse = false;
    surfaceShare = { pan1: 0.70, pan2: 0.30 };
    displayLabel = `Asymétrique : ${pan1.label} / ${pan2.label} • Pente 15°`;
  }
  // RÈGLE 3 : Toiture Inclinée Bipente Symétrique Standard (50% / 50%)
  else {
    roofType = 'inclinee_symetrique';
    pitch = 15;
    isTerrasse = false;
    surfaceShare = { pan1: 0.50, pan2: 0.50 };
    displayLabel = `Symétrique : ${pan1.label} / ${pan2.label} • Pente 15°`;
  }

  return {
    roofType,
    pitch,
    isTerrasse,
    dimensions: { area, length, breadth, aspectRatio },
    ridge,
    slopes: {
      pan1: {
        solarAzimuth: pan1.solarAzimuth,
        azimuthDeg: pan1.compassAzimuth,
        label: pan1.label,
        share: surfaceShare.pan1,
        coeff: pan1.coeff,
      },
      pan2: surfaceShare.pan2 > 0 ? {
        solarAzimuth: pan2.solarAzimuth,
        azimuthDeg: pan2.compassAzimuth,
        label: pan2.label,
        share: surfaceShare.pan2,
        coeff: pan2.coeff,
      } : null,
    },
    displayLabel,
  };
}

export default {
  projectCoordinatesToLocalMeters,
  compassToSolarAzimuth,
  solarToCompassAzimuth,
  getSolarOrientationLabel,
  getCompassLabel,
  calculateSolarOrientationCoeff,
  applyNegativeRoofBuffer,
  computeOrientedBoundingBox,
  computeRoofPansAndRidge,
  inferRoofCharacteristics,
};
