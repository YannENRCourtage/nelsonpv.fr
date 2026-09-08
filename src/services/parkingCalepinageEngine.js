/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PARKING CALEPINAGE ENGINE (V2 REFACTORED)
 * Algorithme géométrique spatial d'implantation automatique d'ombrières
 * 1. Déduction de l'Axe Dominant des Allées & Lignes de Stationnement
 *    (Analyse spectrale / histogramme d'orientation pondéré par longueur de segment)
 * 2. Projection dans le repère métrique 2D local centré et aligné
 * 3. Classification & Échelonnage Intelligent VL Double vs VL Simple :
 *    - Vis-à-vis central (10m) -> Ombrière VL double (4 places / travée de 5m)
 *    - Bordures / rives (5m) -> Ombrière VL simple (2 places / travée de 5m)
 *    - Allées de circulation centrales préservées (6m)
 * 4. Détection des discontinuités & Découpage des voies transversales :
 *    - Interruption après 35m-40m consécutifs (couloir de 6m)
 *    - Suppression des blocs monolithiques enjambant les voies
 * 5. Couverture exhaustive des sous-zones éligibles (polygones concaves / L-shapes)
 * 6. Rétro-projection en coordonnées GPS WGS84 précises pour cartographie & PDF
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Spécifications techniques normalisées des typologies d'ombrières (VL uniquement en prospection auto)
export const OMBRIERE_TYPOLOGIES = {
  'ombriere_vl_auto': {
    id: 'ombriere_vl_auto',
    label: 'Mixte Intelligent VL (Double centre + Simple bordure)',
    shortLabel: 'Mixte VL',
    desc: 'Optimisation automatique : doubles au centre (10m) & simples en bordure (5m)',
    widthMeters: 10.0,
    bayLengthMeters: 5.0,
    spotsPerBay: 4,
    aisleWidthMeters: 6.0,
    rowStepMeters: 16.0,
    minBays: 2,
    defaultPitchDeg: 10,
    minHeightClearance: 2.90
  },
  'ombriere_vl_double': {
    id: 'ombriere_vl_double',
    label: 'Ombrière VL double (2 rangées en vis-à-vis)',
    shortLabel: 'VL Double',
    desc: 'Larg. 10m • 4 places par travée (vis-à-vis)',
    widthMeters: 10.0,       // Profondeur de 2 places face à face (2 x 5.0m)
    bayLengthMeters: 5.0,    // Entraxe poteaux pour 4 places (2 x 2 x 2.5m)
    spotsPerBay: 4,          // 4 places par travée
    aisleWidthMeters: 6.0,   // Allée de circulation
    rowStepMeters: 16.0,     // 10.0m ombrière + 6.0m allée
    minBays: 2,              // Minimum 2 travées (10m = 8 places)
    defaultPitchDeg: 10,
    minHeightClearance: 2.90
  },
  'ombriere_vl_simple': {
    id: 'ombriere_vl_simple',
    label: 'Ombrière VL simple (1 rangée de bordure)',
    shortLabel: 'VL Simple',
    desc: 'Larg. 5m • 2 places par travée',
    widthMeters: 5.0,        // Profondeur d'une place VL standard
    bayLengthMeters: 5.0,    // Entraxe poteaux pour 2 places (2 x 2.5m)
    spotsPerBay: 2,          // 2 places par travée
    aisleWidthMeters: 6.0,   // Allée de circulation
    rowStepMeters: 11.0,     // 5.0m ombrière + 6.0m allée
    minBays: 2,              // Minimum 2 travées (10m = 4 places)
    defaultPitchDeg: 10,
    minHeightClearance: 2.80
  },
  // Typologies Poids Lourds (PL) - Spécifications Barconnière / Nelson
  'ombriere_pl_15_8': {
    id: 'ombriere_pl_15_8',
    label: 'Ombrière PL 15.8m (Porteurs & Camions)',
    shortLabel: 'PL 15.8m',
    desc: 'Larg. 15.8m • 1 place PL / travée (4.0m)',
    widthMeters: 15.8,
    bayLengthMeters: 4.0,
    spotsPerBay: 1,
    aisleWidthMeters: 10.0,
    rowStepMeters: 25.8,
    minBays: 2,
    defaultPitchDeg: 10,
    minHeightClearance: 4.80
  },
  'ombriere_pl_20_2': {
    id: 'ombriere_pl_20_2',
    label: 'Ombrière PL 20.2m (Semi-remorques standard)',
    shortLabel: 'PL 20.2m',
    desc: 'Larg. 20.2m • 1 place PL / travée (4.0m)',
    widthMeters: 20.2,
    bayLengthMeters: 4.0,
    spotsPerBay: 1,
    aisleWidthMeters: 12.0,
    rowStepMeters: 32.2,
    minBays: 2,
    defaultPitchDeg: 10,
    minHeightClearance: 4.80
  },
  'ombriere_pl_24_6': {
    id: 'ombriere_pl_24_6',
    label: 'Ombrière PL 24.6m (Grands ensembles articulés)',
    shortLabel: 'PL 24.6m',
    desc: 'Larg. 24.6m • 1 place PL / travée (4.0m)',
    widthMeters: 24.6,
    bayLengthMeters: 4.0,
    spotsPerBay: 1,
    aisleWidthMeters: 12.0,
    rowStepMeters: 36.6,
    minBays: 2,
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
 * Détection géométrique des tracés de parking courbés / curvilignes (ex: amphithéâtres, allées en arc de cercle)
 * Identifie les suites d'angles de rotation progressifs consécutifs où les ombrières linéaires ne conviennent pas.
 */
export function isCurvedParking(polygonWgs84) {
  if (!polygonWgs84 || polygonWgs84.length < 5) return { isCurved: false, reason: null };

  let cLat = 0, cLng = 0;
  polygonWgs84.forEach(p => { cLat += p.lat; cLng += p.lng; });
  cLat /= polygonWgs84.length;
  cLng /= polygonWgs84.length;

  const latRad = (cLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos(latRad);

  const pts = polygonWgs84.map(p => ({
    x: (p.lng - cLng) * metersPerDegLng,
    y: (p.lat - cLat) * metersPerDegLat
  }));

  const n = pts.length;
  if (n < 5) return { isCurved: false, reason: null };

  // Filtrer les micro-segments
  const cleanPts = [];
  for (let i = 0; i < n; i++) {
    const next = pts[(i + 1) % n];
    const dist = Math.hypot(next.x - pts[i].x, next.y - pts[i].y);
    if (dist >= 1.0) {
      cleanPts.push(pts[i]);
    }
  }

  const m = cleanPts.length;
  if (m < 5) return { isCurved: false, reason: null };

  const edges = [];
  let totalPerimeter = 0;
  for (let i = 0; i < m; i++) {
    const p1 = cleanPts[i];
    const p2 = cleanPts[(i + 1) % m];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    edges.push({ len, angle, dx, dy });
    totalPerimeter += len;
  }

  let consecutiveCurveTurns = 0;
  let maxConsecutiveCurveTurns = 0;
  let cumulativeArcAngle = 0;
  let maxCumulativeArcAngle = 0;
  let curvedLength = 0;

  for (let i = 0; i < m; i++) {
    const e1 = edges[i];
    const e2 = edges[(i + 1) % m];

    let dAngle = e2.angle - e1.angle;
    while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
    while (dAngle < -Math.PI) dAngle += 2 * Math.PI;

    const dDeg = (dAngle * 180) / Math.PI;

    // Virage d'arc progressif entre 4° et 50°
    if (Math.abs(dDeg) >= 4 && Math.abs(dDeg) <= 50) {
      if (consecutiveCurveTurns === 0 || (dAngle > 0) === (cumulativeArcAngle > 0)) {
        consecutiveCurveTurns++;
        cumulativeArcAngle += dDeg;
        curvedLength += e1.len;
      } else {
        consecutiveCurveTurns = 1;
        cumulativeArcAngle = dDeg;
      }
    } else {
      consecutiveCurveTurns = 0;
      cumulativeArcAngle = 0;
    }

    if (consecutiveCurveTurns > maxConsecutiveCurveTurns) {
      maxConsecutiveCurveTurns = consecutiveCurveTurns;
    }
    if (Math.abs(cumulativeArcAngle) > Math.abs(maxCumulativeArcAngle)) {
      maxCumulativeArcAngle = cumulativeArcAngle;
    }
  }

  // Vérification de l'orthogonalité globale
  let bestScore = -1;
  for (let deg = 0; deg < 180; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    let score = 0;
    for (const e of edges) {
      const diff = Math.abs((e.angle % Math.PI + Math.PI) % Math.PI - rad);
      const cos4 = Math.pow(Math.cos(diff), 4);
      const sin4 = Math.pow(Math.sin(diff), 4);
      score += e.len * Math.max(cos4, sin4);
    }
    if (score > bestScore) bestScore = score;
  }
  const orthogonalityRatio = totalPerimeter > 0 ? bestScore / totalPerimeter : 1;

  // Critères de courbure :
  // 1. Suite d'au moins 3 virages d'arc consécutifs totalisant au moins 25° de rotation
  // 2. Ou plus de 25% du périmètre en segments courbes avec faible orthogonalité (< 0.68)
  const hasArc = maxConsecutiveCurveTurns >= 3 && Math.abs(maxCumulativeArcAngle) >= 25;
  const isHighCurvature = (curvedLength / totalPerimeter > 0.25) && (orthogonalityRatio < 0.68);
  const isCurved = hasArc || isHighCurvature;

  return {
    isCurved,
    maxConsecutiveCurveTurns,
    maxCumulativeArcAngle: Math.round(maxCumulativeArcAngle),
    curvedRatio: Math.round((curvedLength / totalPerimeter) * 100),
    orthogonalityRatio: Math.round(orthogonalityRatio * 100) / 100
  };
}

/**
 * Calcule l'Axe Dominant des Allées et le Repère Métrique Local d'un polygone de parking
 * Combine une analyse spectrale de l'orientation des segments pondérée par leur longueur
 * et la boîte englobante minimale (MABB - Minimum Area Bounding Box).
 */
export function computePrincipalLocalFrame(polygonWgs84) {
  if (!polygonWgs84 || polygonWgs84.length < 3) return null;

  // 1. Calcul du barycentre (centre géographique)
  let cLat = 0, cLng = 0;
  polygonWgs84.forEach(p => { cLat += p.lat; cLng += p.lng; });
  cLat /= polygonWgs84.length;
  cLng /= polygonWgs84.length;

  const latRad = (cLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos(latRad);

  // 2. Conversion en coordonnées métriques locales centrées (en mètres)
  const ptsM = polygonWgs84.map(p => ({
    x: (p.lng - cLng) * metersPerDegLng,
    y: (p.lat - cLat) * metersPerDegLat
  }));

  const n = ptsM.length;

  // 3. Extraction des arêtes et calcul de leur longueur et orientation
  const edges = [];
  for (let i = 0; i < n; i++) {
    const p1 = ptsM[i];
    const p2 = ptsM[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1.0) continue; // ignorer les micro-segments ou bruit topologique
    let angle = Math.atan2(dy, dx) % Math.PI;
    if (angle < 0) angle += Math.PI;
    edges.push({ len, angle, dx, dy });
  }

  // 4. Analyse spectrale / histogramme d'orientation continu (pas de 0.5° sur [0, 180°[)
  // Dans un parking, les bordures sont soit parallèles aux allées (cos ~ 1),
  // soit perpendiculaires aux allées (sin ~ 1). L'élévation à la puissance 4
  // accentue très fortement les pics d'alignement stricts.
  let bestScore = -1;
  let dominantAngle = 0;

  for (let deg = 0; deg < 180; deg += 0.5) {
    const rad = (deg * Math.PI) / 180;
    let score = 0;
    for (const e of edges) {
      const diff = Math.abs(e.angle - rad);
      const cos4 = Math.pow(Math.cos(diff), 4);
      const sin4 = Math.pow(Math.sin(diff), 4);
      score += e.len * Math.max(cos4, sin4);
    }
    if (score > bestScore) {
      bestScore = score;
      dominantAngle = rad;
    }
  }

  // 5. Rotation dans le repère orienté selon l'angle dominant
  let optimalAngle = dominantAngle;
  let cosOpt = Math.cos(-optimalAngle);
  let sinOpt = Math.sin(-optimalAngle);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const localPoly = ptsM.map(p => {
    const rx = p.x * cosOpt - p.y * sinOpt;
    const ry = p.x * sinOpt + p.y * cosOpt;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
    return { x: rx, y: ry };
  });

  let boxW = maxX - minX;
  let boxH = maxY - minY;

  // 6. Aligner l'axe X sur la dimension longitudinale principale des travées
  // Si la profondeur locale est supérieure à la largeur, pivoter de 90°
  // pour que X soit l'axe le plus long d'implantation des allées.
  if (boxH > boxW) {
    optimalAngle += Math.PI / 2;
    cosOpt = Math.cos(-optimalAngle);
    sinOpt = Math.sin(-optimalAngle);

    minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
    for (let i = 0; i < ptsM.length; i++) {
      const rx = ptsM[i].x * cosOpt - ptsM[i].y * sinOpt;
      const ry = ptsM[i].x * sinOpt + ptsM[i].y * cosOpt;
      localPoly[i] = { x: rx, y: ry };
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }
    boxW = maxX - minX;
    boxH = maxY - minY;
  }

  return {
    center: { lat: cLat, lng: cLng },
    metersPerDegLat,
    metersPerDegLng,
    angleRad: optimalAngle,
    angleDeg: Math.round(((optimalAngle * 180) / Math.PI) % 360),
    bounds: { minX, maxX, minY, maxY, width: boxW, height: boxH },
    localPoly,
    ptsM
  };
}

/**
 * Moteur de Calepinage Automatique pour Parking
 * Déploie les rangées d'ombrières avec classification VL Double vs VL Simple,
 * allées de circulation de 6m et couloirs de coupure transversale.
 */
export function layoutOmbrieresOnParking({
  polygonWgs84,
  parkingArea,
  typologyKey = 'ombriere_vl_auto',
  maxKwc = 500
}) {
  const selectedTypology = OMBRIERE_TYPOLOGIES[typologyKey] || OMBRIERE_TYPOLOGIES['ombriere_vl_auto'];
  const curvature = isCurvedParking(polygonWgs84);
  const frame = computePrincipalLocalFrame(polygonWgs84);

  if (!frame || !frame.bounds) {
    return {
      placedOmbrieres: [],
      totalCoveredArea: 0,
      totalShelteredSpots: 0,
      coverageRatio: 0,
      panelCount: 0,
      installedKwc: 0,
      typology: selectedTypology,
      isCurved: curvature.isCurved,
      curvedDetails: curvature
    };
  }

  const { bounds, localPoly, angleRad, center, metersPerDegLat, metersPerDegLng } = frame;
  const { minX, maxX, minY, maxY } = bounds;

  // Paramètres normatifs du calepinage de parking
  const isPL = typologyKey.startsWith('ombriere_pl') || (selectedTypology.widthMeters && selectedTypology.widthMeters > 12.0);
  const AISLE_WIDTH = selectedTypology.aisleWidthMeters || (isPL ? 10.0 : 6.0);      // Allée de circulation entre rangées
  const CORRIDOR_GAP = isPL ? 8.0 : 6.0;     // Couloir transversal de circulation
  const MAX_BLOCK_BAYS = isPL ? 6 : 8;     // Maximum de travées consécutives avant coupure transversale
  const MIN_BLOCK_BAYS = 2;     // Minimum 2 travées pour stabilité structurelle
  const BAY_LENGTH = selectedTypology.bayLengthMeters || (isPL ? 4.0 : 5.0);       // Entraxe longitudinal standard
  const MARGIN_Y = 1.5;         // Retrait de sécurité par rapport aux bordures

  // 1. Détermination des rangées candidates le long de l'axe transversal Y
  const totalSpanY = maxY - minY - 2 * MARGIN_Y;
  const rows = [];

  if (isPL) {
    // Mode Poids Lourds (PL) : gabarits 15.8m, 20.2m ou 24.6m
    const plWidth = selectedTypology.widthMeters || 15.8;
    const plAisle = selectedTypology.aisleWidthMeters || 10.0;
    const plSpots = selectedTypology.spotsPerBay || 1;

    let yPos = minY + MARGIN_Y + plWidth / 2;
    while (yPos + plWidth / 2 <= maxY - MARGIN_Y) {
      rows.push({
        y: yPos,
        width: plWidth,
        type: selectedTypology.id,
        spotsPerBay: plSpots,
        label: selectedTypology.label
      });
      yPos += plWidth + plAisle;
    }

    if (rows.length === 0 && totalSpanY >= plWidth * 0.8) {
      rows.push({
        y: (minY + maxY) / 2,
        width: plWidth,
        type: selectedTypology.id,
        spotsPerBay: plSpots,
        label: selectedTypology.label
      });
    }
  } else if (typologyKey === 'ombriere_vl_simple') {
    // Mode forcé 100% VL Simple
    let yPos = minY + MARGIN_Y + 2.5;
    while (yPos + 2.5 <= maxY - MARGIN_Y) {
      rows.push({
        y: yPos,
        width: 5.0,
        type: 'ombriere_vl_simple',
        spotsPerBay: 2,
        label: 'Ombrière VL simple (1 rangée)'
      });
      yPos += 5.0 + AISLE_WIDTH;
    }
  } else if (typologyKey === 'ombriere_vl_double') {
    // Mode forcé 100% VL Double
    let yPos = minY + MARGIN_Y + 5.0;
    while (yPos + 5.0 <= maxY - MARGIN_Y) {
      rows.push({
        y: yPos,
        width: 10.0,
        type: 'ombriere_vl_double',
        spotsPerBay: 4,
        label: 'Ombrière VL double (2 rangées)'
      });
      yPos += 10.0 + AISLE_WIDTH;
    }
    if (rows.length === 0 && totalSpanY >= 9.5) {
      rows.push({
        y: (minY + maxY) / 2,
        width: 10.0,
        type: 'ombriere_vl_double',
        spotsPerBay: 4,
        label: 'Ombrière VL double (2 rangées)'
      });
    }
  } else {
    // Mode par défaut : Mixte Intelligent VL
    // - Rangées de bordure (bordures périphériques du parking) : VL Simple (5m)
    // - Rangées intérieures en vis-à-vis : VL Double (10m)
    let currentY = minY + MARGIN_Y;

    if (totalSpanY >= 22.0) {
      // Rangée de bordure basse (Sud / entrée) : VL Simple (5m)
      rows.push({
        y: currentY + 2.5,
        width: 5.0,
        type: 'ombriere_vl_simple',
        spotsPerBay: 2,
        label: 'Ombrière VL simple (Bordure)'
      });
      currentY += 5.0 + AISLE_WIDTH;

      // Rangées centrales en vis-à-vis : VL Double (10m)
      while (currentY + 10.0 <= maxY - MARGIN_Y - 6.0) {
        rows.push({
          y: currentY + 5.0,
          width: 10.0,
          type: 'ombriere_vl_double',
          spotsPerBay: 4,
          label: 'Ombrière VL double (Central)'
        });
        currentY += 10.0 + AISLE_WIDTH;
      }

      // Rangée de bordure haute (Nord / fond) : VL Simple ou Double selon profondeur restante
      const remainingY = maxY - MARGIN_Y - currentY;
      if (remainingY >= 9.5) {
        rows.push({
          y: currentY + 5.0,
          width: 10.0,
          type: 'ombriere_vl_double',
          spotsPerBay: 4,
          label: 'Ombrière VL double (Central)'
        });
      } else if (remainingY >= 4.5) {
        rows.push({
          y: currentY + 2.5,
          width: 5.0,
          type: 'ombriere_vl_simple',
          spotsPerBay: 2,
          label: 'Ombrière VL simple (Bordure)'
        });
      }
    } else if (totalSpanY >= 9.5) {
      // Parking moyen : 1 rangée double au centre
      rows.push({
        y: (minY + maxY) / 2,
        width: 10.0,
        type: 'ombriere_vl_double',
        spotsPerBay: 4,
        label: 'Ombrière VL double (Central)'
      });
    } else if (totalSpanY >= 4.5) {
      // Parking étroit : 1 rangée simple
      rows.push({
        y: (minY + maxY) / 2,
        width: 5.0,
        type: 'ombriere_vl_simple',
        spotsPerBay: 2,
        label: 'Ombrière VL simple (Bordure)'
      });
    }
  }

  // 2. Parcourir chaque rangée, valider l'inclusion géométrique
  // et découper les couloirs de circulation transversale (pas de polygones monolithiques)
  const placedOmbrieres = [];
  let blockIdCounter = 1;

  const cosRev = Math.cos(angleRad);
  const sinRev = Math.sin(angleRad);

  const MAX_TARGET_KWC = maxKwc || 500;

  rows.forEach((row, rowIndex) => {
    // Si la puissance maximale est déjà atteinte, interrompre le placement
    const currentTotalArea = placedOmbrieres.reduce((sum, o) => sum + o.area, 0);
    const currentPanels = Math.floor((currentTotalArea * 0.90) / 2.05);
    if (Math.round(currentPanels * 0.465 * 10) / 10 >= MAX_TARGET_KWC) return;

    let currentBlockBays = [];

    const flushCurrentBlock = () => {
      if (currentBlockBays.length >= MIN_BLOCK_BAYS) {
        let bayCount = currentBlockBays.length;
        let blockLength = bayCount * BAY_LENGTH;
        let blockWidth = row.width;
        let blockArea = Math.round(blockLength * blockWidth);

        // Plafonnement strict à 500 kWc
        const placedArea = placedOmbrieres.reduce((sum, o) => sum + o.area, 0);
        const placedPanels = Math.floor((placedArea * 0.90) / 2.05);
        const placedKwc = Math.round(placedPanels * 0.465 * 10) / 10;

        if (placedKwc >= MAX_TARGET_KWC) {
          currentBlockBays = [];
          return;
        }

        const maxAdditionalArea = Math.max(0, (MAX_TARGET_KWC / 0.465 * 2.05 / 0.90) - placedArea);
        if (blockArea > maxAdditionalArea) {
          const maxBaysPossible = Math.floor(maxAdditionalArea / (BAY_LENGTH * blockWidth));
          if (maxBaysPossible >= MIN_BLOCK_BAYS) {
            bayCount = maxBaysPossible;
            blockLength = bayCount * BAY_LENGTH;
            blockArea = Math.round(blockLength * blockWidth);
          } else {
            currentBlockBays = [];
            return;
          }
        }

        const spotsCount = bayCount * row.spotsPerBay;
        const xMinBlock = currentBlockBays[0].x;
        const xMaxBlock = xMinBlock + blockLength;
        const yMinBlock = row.y - blockWidth / 2;
        const yMaxBlock = row.y + blockWidth / 2;

        // Les 4 coins du bloc d'ombrière dans le repère métrique local
        const localCorners = [
          { x: xMinBlock, y: yMinBlock },
          { x: xMaxBlock, y: yMinBlock },
          { x: xMaxBlock, y: yMaxBlock },
          { x: xMinBlock, y: yMaxBlock }
        ];

        // Rétro-projection en coordonnées GPS WGS84
        const polygonWgs84Ombriere = localCorners.map(pt => {
          const xOrig = pt.x * cosRev - pt.y * sinRev;
          const yOrig = pt.x * sinRev + pt.y * cosRev;
          const lng = center.lng + xOrig / metersPerDegLng;
          const lat = center.lat + yOrig / metersPerDegLat;
          return { lat, lng };
        });

        // Barycentre WGS84 du bloc
        let bLat = 0, bLng = 0;
        polygonWgs84Ombriere.forEach(p => { bLat += p.lat; bLng += p.lng; });
        bLat /= polygonWgs84Ombriere.length;
        bLng /= polygonWgs84Ombriere.length;

        placedOmbrieres.push({
          id: `omb_${blockIdCounter++}`,
          rowIndex: rowIndex + 1,
          type: row.type,
          label: row.label,
          bayCount,
          length: blockLength,
          width: blockWidth,
          area: blockArea,
          spotsCount,
          center: { lat: bLat, lng: bLng },
          polygonWgs84: polygonWgs84Ombriere,
          xMin: xMinBlock,
          xMax: xMaxBlock
        });
      }
      currentBlockBays = [];
    };

    let x = minX + 1.5;
    while (x + BAY_LENGTH <= maxX - 1.5) {
      // Tester les 4 sommets + le centre de la travée
      const halfW = row.width / 2;
      const testCorners = [
        { x: x + 0.3, y: row.y - halfW + 0.3 },
        { x: x + BAY_LENGTH - 0.3, y: row.y - halfW + 0.3 },
        { x: x + BAY_LENGTH - 0.3, y: row.y + halfW - 0.3 },
        { x: x + 0.3, y: row.y + halfW - 0.3 },
        { x: x + BAY_LENGTH / 2, y: row.y } // centre
      ];

      const isValidBay = testCorners.every(pt => isPointIn2DPolygon(pt.x, pt.y, localPoly));

      if (isValidBay) {
        currentBlockBays.push({ x });

        // DISCONTINUITÉ & VOIES DE CIRCULATION :
        // Dès qu'un bloc atteint MAX_BLOCK_BAYS (35-40m), on le clôture
        // et on insère un couloir transversal vide de 6.0m
        if (currentBlockBays.length >= MAX_BLOCK_BAYS) {
          flushCurrentBlock();
          x += BAY_LENGTH + CORRIDOR_GAP; // Sauter la travée et le couloir de circulation
          continue;
        }
      } else {
        // Rupture géométrique naturelle (bordure de parking, bâtiment, îlot)
        flushCurrentBlock();
      }

      x += BAY_LENGTH;
    }

    flushCurrentBlock();
  });

  // 3. Calcul consolidé de la puissance photovoltaïque et du rendement
  const totalCoveredArea = placedOmbrieres.reduce((sum, o) => sum + o.area, 0);
  const totalShelteredSpots = placedOmbrieres.reduce((sum, o) => sum + o.spotsCount, 0);
  const safeParkingArea = Number(parkingArea) || 1;
  const coverageRatio = Math.min(100, Math.round((totalCoveredArea / safeParkingArea) * 100));

  // 1 panneau bi-verre 465 Wc (2.05 m²) avec foisonnement structurel de 0.90
  const panelCount = Math.max(0, Math.floor((totalCoveredArea * 0.90) / 2.05));
  const installedKwc = Math.min(MAX_TARGET_KWC, Math.round(panelCount * 0.465 * 10) / 10);

  return {
    placedOmbrieres,
    totalCoveredArea,
    totalShelteredSpots,
    coverageRatio,
    panelCount,
    installedKwc,
    principalAngleDeg: frame.angleDeg,
    typology: selectedTypology,
    isCurved: curvature.isCurved,
    curvedDetails: curvature
  };
}
