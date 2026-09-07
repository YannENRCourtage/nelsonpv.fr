/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PARKING CALEPINAGE ENGINE
 * Algorithme géométrique spatial d'implantation automatique d'ombrières
 * 1. Déduction de l'Axe Principal (Oriented Bounding Box / Calipers tournants)
 * 2. Projection dans le repère métrique 2D local centré et orienté
 * 3. Modélisation et discrétisation des travées (VL simple, VL double, PL)
 * 4. Validation par test d'inclusion stricte & fusion en blocs continus
 * 5. Rétro-projection en coordonnées GPS WGS84 pour cartographie & snapshot
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Spécifications techniques normalisées des typologies d'ombrières
export const OMBRIERE_TYPOLOGIES = {
  'ombriere_vl_simple': {
    id: 'ombriere_vl_simple',
    label: 'Ombrière VL simple (1 rangée)',
    shortLabel: 'VL Simple',
    widthMeters: 5.0,        // Profondeur d'une place VL standard
    bayLengthMeters: 5.0,    // Entraxe poteaux pour 2 places (2 x 2.5m)
    spotsPerBay: 2,          // 2 places par travée
    aisleWidthMeters: 6.0,   // Allée de circulation centrale à sens unique / double sens
    rowStepMeters: 11.0,     // 5.0m ombrière + 6.0m allée
    minBays: 2,              // Minimum 2 travées (10m = 4 places) pour stabilité structurelle
    defaultPitchDeg: 10,
    minHeightClearance: 2.80
  },
  'ombriere_vl_double': {
    id: 'ombriere_vl_double',
    label: 'Ombrière VL double (2 rangées en vis-à-vis)',
    shortLabel: 'VL Double',
    widthMeters: 10.0,       // Profondeur de 2 places face à face (2 x 5.0m)
    bayLengthMeters: 5.0,    // Entraxe poteaux pour 4 places (2 x 2 x 2.5m)
    spotsPerBay: 4,          // 4 places par travée
    aisleWidthMeters: 6.0,   // Allée de circulation
    rowStepMeters: 16.0,     // 10.0m ombrière + 6.0m allée
    minBays: 2,              // Minimum 2 travées (10m = 8 places)
    defaultPitchDeg: 10,
    minHeightClearance: 2.90
  },
  'ombriere_pl': {
    id: 'ombriere_pl',
    label: 'Ombrière PL (Poids Lourds / Bus)',
    shortLabel: 'PL / Bus',
    widthMeters: 18.0,       // Profondeur d'une place semi-remorque (16.5m à 18m)
    bayLengthMeters: 8.0,    // Entraxe poteaux pour 2 camions (2 x 4.0m)
    spotsPerBay: 2,          // 2 places camions par travée
    aisleWidthMeters: 10.0,  // Voie de circulation et rayon de giration PL
    rowStepMeters: 28.0,     // 18.0m ombrière + 10.0m voie
    minBays: 1,              // Minimum 1 travée (8m)
    defaultPitchDeg: 10,
    minHeightClearance: 4.80
  }
};

/**
 * Test géométrique d'inclusion d'un point 2D dans un polygone (Ray-Casting Algorithm)
 */
export function isPointIn2DPolygon(x, y, polyPts) {
  let inside = false;
  for (let i = 0, j = polyPts.length - 1; i < polyPts.length; j = i++) {
    const xi = polyPts[i].x, yi = polyPts[i].y;
    const xj = polyPts[j].x, yj = polyPts[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calcule l'Axe Principal et le Repère Métrique Local d'un polygone de parking
 * Utilise la boîte englobante minimale (MABB - Minimum Area Bounding Box)
 */
export function computePrincipalLocalFrame(polygonWgs84) {
  if (!polygonWgs84 || polygonWgs84.length < 3) return null;

  // 1. Calcul du barycentre (centre géométrique)
  let cLat = 0, cLng = 0;
  polygonWgs84.forEach(p => { cLat += p.lat; cLng += p.lng; });
  cLat /= polygonWgs84.length;
  cLng /= polygonWgs84.length;

  const latRad = (cLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos(latRad);

  // 2. Conversion en mètres locaux centrés
  const ptsM = polygonWgs84.map(p => ({
    x: (p.lng - cLng) * metersPerDegLng,
    y: (p.lat - cLat) * metersPerDegLat
  }));

  const n = ptsM.length;
  let minBoxArea = Infinity;
  let optimalAngle = 0;
  let optimalBounds = null;

  // 3. Test de chaque arête pour déterminer l'axe d'alignement minimisant la boîte englobante
  for (let i = 0; i < n; i++) {
    const p1 = ptsM[i];
    const p2 = ptsM[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const edgeLength = Math.sqrt(dx * dx + dy * dy);
    if (edgeLength < 1.0) continue; // ignorer micro-segments

    const edgeAngle = Math.atan2(dy, dx);
    const cosA = Math.cos(-edgeAngle);
    const sinA = Math.sin(-edgeAngle);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ptsM) {
      const rx = p.x * cosA - p.y * sinA;
      const ry = p.x * sinA + p.y * cosA;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const area = boxW * boxH;

    if (area < minBoxArea) {
      minBoxArea = area;
      optimalAngle = edgeAngle;
      optimalBounds = { minX, maxX, minY, maxY, width: boxW, height: boxH };
    }
  }

  // 4. Si la hauteur de la boîte est supérieure à sa largeur, tourner de 90° pour aligner les ombrières sur la plus grande longueur
  if (optimalBounds && optimalBounds.height > optimalBounds.width) {
    optimalAngle += Math.PI / 2;
    // Recalculer les bornes avec l'angle tourné
    const cosA = Math.cos(-optimalAngle);
    const sinA = Math.sin(-optimalAngle);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ptsM) {
      const rx = p.x * cosA - p.y * sinA;
      const ry = p.x * sinA + p.y * cosA;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }
    optimalBounds = { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }

  // 5. Polygone en coordonnées locales tournées
  const cosOpt = Math.cos(-optimalAngle);
  const sinOpt = Math.sin(-optimalAngle);
  const localPoly = ptsM.map(p => ({
    x: p.x * cosOpt - p.y * sinOpt,
    y: p.x * sinOpt + p.y * cosOpt
  }));

  return {
    center: { lat: cLat, lng: cLng },
    metersPerDegLat,
    metersPerDegLng,
    angleRad: optimalAngle,
    angleDeg: Math.round((optimalAngle * 180) / Math.PI),
    bounds: optimalBounds,
    localPoly,
    ptsM
  };
}

/**
 * Moteur de Calepinage Automatique pour Parking
 * Positionne les ombrières selon la typologie choisie (VL simple, VL double, PL)
 */
export function layoutOmbrieresOnParking({
  polygonWgs84,
  parkingArea,
  typologyKey = 'ombriere_vl_double'
}) {
  const typology = OMBRIERE_TYPOLOGIES[typologyKey] || OMBRIERE_TYPOLOGIES['ombriere_vl_double'];
  const frame = computePrincipalLocalFrame(polygonWgs84);

  if (!frame || !frame.bounds) {
    return {
      placedOmbrieres: [],
      totalCoveredArea: 0,
      totalShelteredSpots: 0,
      coverageRatio: 0,
      panelCount: 0,
      installedKwc: 0,
      typology
    };
  }

  const { bounds, localPoly, angleRad, center, metersPerDegLat, metersPerDegLng } = frame;
  const { widthMeters, bayLengthMeters, spotsPerBay, rowStepMeters, minBays } = typology;

  // 1. Détermination des lignes de rangées candidates le long de l'axe Y
  // On applique un retrait de sécurité de 1.5 m par rapport aux bordures du parking
  const marginY = 1.5;
  const startY = bounds.minY + marginY + widthMeters / 2;
  const endY = bounds.maxY - marginY - widthMeters / 2;

  const candidateRowYs = [];
  for (let y = startY; y <= endY; y += rowStepMeters) {
    candidateRowYs.push(y);
  }

  // Si aucune ligne n'a pu être placée (parking trop étroit), tenter avec un centrage simple
  if (candidateRowYs.length === 0 && bounds.height >= widthMeters + 1.0) {
    candidateRowYs.push((bounds.minY + bounds.maxY) / 2);
  }

  const placedOmbrieres = [];
  let ombriereIdCounter = 1;

  // 2. Parcourir chaque rangée et tester les travées successives
  candidateRowYs.forEach((rowY, rowIndex) => {
    const marginX = 1.5;
    const startX = bounds.minX + marginX;
    const endX = bounds.maxX - marginX;

    let currentBlockBays = [];
    const flushCurrentBlock = () => {
      if (currentBlockBays.length >= minBays) {
        const bayCount = currentBlockBays.length;
        const blockLength = bayCount * bayLengthMeters;
        const blockWidth = widthMeters;
        const blockArea = Math.round(blockLength * blockWidth);
        const spotsCount = bayCount * spotsPerBay;

        const xMinBlock = currentBlockBays[0].x;
        const xMaxBlock = xMinBlock + blockLength;
        const yMinBlock = rowY - blockWidth / 2;
        const yMaxBlock = rowY + blockWidth / 2;

        // Les 4 coins du bloc d'ombrière dans le repère métrique local
        const localCorners = [
          { x: xMinBlock, y: yMinBlock },
          { x: xMaxBlock, y: yMinBlock },
          { x: xMaxBlock, y: yMaxBlock },
          { x: xMinBlock, y: yMaxBlock }
        ];

        // Rétro-projection en repère WGS84 GPS
        const cosRev = Math.cos(angleRad);
        const sinRev = Math.sin(angleRad);

        const polygonWgs84Ombriere = localCorners.map(pt => {
          const xOrig = pt.x * cosRev - pt.y * sinRev;
          const yOrig = pt.x * sinRev + pt.y * cosRev;
          const lng = center.lng + xOrig / metersPerDegLng;
          const lat = center.lat + yOrig / metersPerDegLat;
          return { lat, lng };
        });

        // Barycentre WGS84 de cette ombrière
        let bLat = 0, bLng = 0;
        polygonWgs84Ombriere.forEach(p => { bLat += p.lat; bLng += p.lng; });
        bLat /= polygonWgs84Ombriere.length;
        bLng /= polygonWgs84Ombriere.length;

        placedOmbrieres.push({
          id: `omb_${ombriereIdCounter++}`,
          rowIndex: rowIndex + 1,
          bayCount,
          length: blockLength,
          width: blockWidth,
          area: blockArea,
          spotsCount,
          center: { lat: bLat, lng: bLng },
          polygonWgs84: polygonWgs84Ombriere
        });
      }
      currentBlockBays = [];
    };

    for (let x = startX; x + bayLengthMeters <= endX; x += bayLengthMeters) {
      // Tester les 4 sommets + le centre de la travée
      const testCorners = [
        { x: x + 0.3, y: rowY - widthMeters / 2 + 0.3 },
        { x: x + bayLengthMeters - 0.3, y: rowY - widthMeters / 2 + 0.3 },
        { x: x + bayLengthMeters - 0.3, y: rowY + widthMeters / 2 - 0.3 },
        { x: x + 0.3, y: rowY + widthMeters / 2 - 0.3 },
        { x: x + bayLengthMeters / 2, y: rowY } // centre
      ];

      // La travée est considérée valide si ses points clés sont dans le parking
      const isValidBay = testCorners.every(pt => isPointIn2DPolygon(pt.x, pt.y, localPoly));

      if (isValidBay) {
        currentBlockBays.push({ x });
      } else {
        flushCurrentBlock();
      }
    }

    flushCurrentBlock();
  });

  // 3. Calcul consolidé de la puissance photovoltaïque et du rendement
  const totalCoveredArea = placedOmbrieres.reduce((sum, o) => sum + o.area, 0);
  const totalShelteredSpots = placedOmbrieres.reduce((sum, o) => sum + o.spotsCount, 0);
  const safeParkingArea = Number(parkingArea) || 1;
  const coverageRatio = Math.min(100, Math.round((totalCoveredArea / safeParkingArea) * 100));

  // Règle de sécurité : 1 panneau photovoltaïque (1.134m x 1.762m = 2.05 m²) tous les ~2.05 m²
  // avec coefficient de foisonnement 0.90 pour les fixations/ombrages inter-structures
  const panelCount = Math.max(0, Math.floor((totalCoveredArea * 0.90) / 2.05));
  const installedKwc = Math.round(panelCount * 0.465 * 10) / 10; // Panneaux bi-faciaux haute performance 465 Wc

  return {
    placedOmbrieres,
    totalCoveredArea,
    totalShelteredSpots,
    coverageRatio,
    panelCount,
    installedKwc,
    principalAngleDeg: frame.angleDeg,
    typology
  };
}
