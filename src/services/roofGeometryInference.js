/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROOF GEOMETRY INFERENCE ENGINE
 * Analyse géospatiale et inférence géométrique automatique des toitures :
 * 1. Calcul de la Minimum Area Bounding Box (OBB) géodésique
 * 2. Détermination de l'orientation du faîtage (grand axe longitudinal)
 * 3. Calcul précis des azimuts perpendiculaires des versants
 * 4. Inférence typologique : Toiture Terrasse (0°) vs Inclinée (Bipente / Monopente)
 * 5. Répartition dynamique des surfaces (100% terrasse, 50/50 symétrique, 70/30 asymétrique)
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
 * Calcule l'enveloppe minimale orientée (Oriented Bounding Box - OBB) d'un polygone
 * Détermine la longueur, largeur, l'aire minimale et l'angle du grand axe.
 */
export function computeOrientedBoundingBox(coords) {
  const projected = projectCoordinatesToLocalMeters(coords);
  if (!projected) return null;
  const { pts2D } = projected;

  // Candidats d'angles géométriques formés par les arêtes du polygone
  const testedAngles = [];
  const n = pts2D.length;
  for (let i = 0; i < n; i++) {
    const pA = pts2D[i];
    const pB = pts2D[(i + 1) % n];
    const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
    testedAngles.push(angle);
  }

  // Échantillonnage angulaire complémentaire par pas de 1° pour les polygones complexes
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

      // Azimut géographique (0° = Nord, 90° = Est, 180° = Sud, 270° = Ouest)
      const ridgeGeoAzimuth = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      const ridgeAxisDeg = Math.round(ridgeGeoAzimuth % 180); // Axe [0°, 180°[

      // Les normales aux deux versants opposés sont perpendiculaires au faîtage (± 90°)
      const slope1Azimuth = Math.round((ridgeAxisDeg + 90) % 360);
      const slope2Azimuth = Math.round((ridgeAxisDeg + 270) % 360);

      bestBox = {
        area: Math.round(area),
        length: Math.round(length * 10) / 10,
        breadth: Math.round(breadth * 10) / 10,
        aspectRatio: Math.round((length / breadth) * 100) / 100,
        ridgeAxisDeg,
        slope1Azimuth,
        slope2Azimuth,
      };
    }
  }

  return bestBox;
}

/**
 * Helper pour le libellé cardinal d'un azimut géographique (0° = Nord, 180° = Sud)
 */
export function getCompassLabel(azimuthDeg) {
  const az = ((azimuthDeg % 360) + 360) % 360;
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
 * Calcule le coefficient d'ensoleillement solaire (0.50 à 1.00) selon l'azimut et la pente
 */
export function calculateSolarOrientationCoeff(azimuthDeg, pitchDeg = 15) {
  if (pitchDeg === 0) return 0.90; // Toit plat horizontal
  const deltaSud = Math.abs(180 - azimuthDeg); // Écart angulaire au Sud
  if (deltaSud <= 25) return 1.00;  // Plein Sud (0° à 25° d'écart)
  if (deltaSud <= 50) return 0.96;  // Sud-Est / Sud-Ouest
  if (deltaSud <= 85) return 0.86;  // Est-Sud-Est / Ouest-Sud-Ouest
  if (deltaSud <= 105) return 0.80; // Plein Est / Plein Ouest
  if (deltaSud <= 140) return 0.70; // Nord-Est / Nord-Ouest
  return 0.58;                      // Plein Nord
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFERENCE COMPLÈTE DU TYPE DE TOITURE, FAÎTAGE & ORIENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 * @param {Array} coords - Tableau de coordonnées {lat, lng} du polygone
 * @param {Object} osmTags - Tags OSM éventuels (ex: roof:shape, building)
 */
export function inferRoofCharacteristics(coords, osmTags = {}) {
  const obb = computeOrientedBoundingBox(coords);
  if (!obb) {
    return {
      roofType: 'inclinee_symetrique',
      pitch: 15,
      isTerrasse: false,
      dimensions: { area: 1000, length: 50, breadth: 20, aspectRatio: 2.5 },
      ridge: { axisDeg: 90, label: 'Axe Est-Ouest (90°)' },
      slopes: {
        pan1: { azimuthDeg: 180, label: 'Plein Sud (180°)', share: 0.5, coeff: 1.0 },
        pan2: { azimuthDeg: 0, label: 'Nord (0°)', share: 0.5, coeff: 0.58 },
      },
      displayLabel: 'Toiture bipente 15° — Sud / Nord',
    };
  }

  const { area, length, breadth, aspectRatio, ridgeAxisDeg, slope1Azimuth, slope2Azimuth } = obb;

  // Déterminer le versant orienté Sud (le plus favorable)
  const diffSud1 = Math.abs(180 - slope1Azimuth);
  const diffSud2 = Math.abs(180 - slope2Azimuth);

  const bestAzimuth = diffSud1 <= diffSud2 ? slope1Azimuth : slope2Azimuth;
  const secondaryAzimuth = diffSud1 <= diffSud2 ? slope2Azimuth : slope1Azimuth;

  const pan1Label = getCompassLabel(bestAzimuth);
  const pan2Label = getCompassLabel(secondaryAzimuth);

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
  // Critères : Grand bâtiment logistique/industriel (>= 2 500 m²) avec ratio d'aspect faible (< 1.45)
  // ou tag OSM explicite 'flat'.
  if ((isExplicitFlat && !isExplicitGabled) || (area >= 2500 && aspectRatio < 1.45)) {
    roofType = 'terrasse';
    pitch = 0;
    isTerrasse = true;
    surfaceShare = { pan1: 1.0, pan2: 0.0 };
    displayLabel = 'Toiture terrasse (Toit plat 0°) • Pose sur bacs lestés';
  }
  // RÈGLE 2 : Toiture Inclinée Asymétrique / Monopente (Grand versant orienté Sud)
  // Bâtiment très allongé (ratio >= 2.0) avec versant préférentiel quasi Plein Sud (180° ± 25°)
  else if (aspectRatio >= 2.0 && (bestAzimuth >= 155 && bestAzimuth <= 205)) {
    roofType = 'inclinee_asymetrique';
    pitch = 15;
    isTerrasse = false;
    surfaceShare = { pan1: 0.70, pan2: 0.30 };
    displayLabel = `Asymétrique : ${pan1Label} (70%) / ${pan2Label} (30%) • Pente 15°`;
  }
  // RÈGLE 3 : Toiture Inclinée Bipente Symétrique Standard (50% / 50%)
  else {
    roofType = 'inclinee_symetrique';
    pitch = 15;
    isTerrasse = false;
    surfaceShare = { pan1: 0.50, pan2: 0.50 };
    displayLabel = `Symétrique : ${pan1Label} / ${pan2Label} • Pente 15°`;
  }

  const coeff1 = calculateSolarOrientationCoeff(bestAzimuth, pitch);
  const coeff2 = calculateSolarOrientationCoeff(secondaryAzimuth, pitch);

  return {
    roofType,
    pitch,
    isTerrasse,
    dimensions: { area, length, breadth, aspectRatio },
    ridge: {
      axisDeg: ridgeAxisDeg,
      label: `Axe ${ridgeAxisDeg}° (${(ridgeAxisDeg >= 45 && ridgeAxisDeg <= 135) ? 'Est-Ouest' : 'Nord-Sud'})`,
    },
    slopes: {
      pan1: {
        azimuthDeg: bestAzimuth,
        label: pan1Label,
        share: surfaceShare.pan1,
        coeff: coeff1,
      },
      pan2: surfaceShare.pan2 > 0 ? {
        azimuthDeg: secondaryAzimuth,
        label: pan2Label,
        share: surfaceShare.pan2,
        coeff: coeff2,
      } : null,
    },
    displayLabel,
  };
}

export default {
  projectCoordinatesToLocalMeters,
  computeOrientedBoundingBox,
  getCompassLabel,
  calculateSolarOrientationCoeff,
  inferRoofCharacteristics,
};
