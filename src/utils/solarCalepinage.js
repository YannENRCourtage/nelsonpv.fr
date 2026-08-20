// ─── Module de Calepinage Photovoltaïque Métrique & Géométrique Strict ─────────

export const PANEL_WIDTH_M = 1.134;   // Largeur panneau standard en portrait (1.134 m)
export const PANEL_HEIGHT_M = 1.762;  // Hauteur panneau standard en portrait (1.762 m)
export const PANEL_GAP_M = 0.02;      // Espacement inter-panneaux (2 cm)
export const PANEL_POWER_W = 440;     // Puissance unitaire d'un panneau (440 Wc)

/**
 * Test d'inclusion d'un point géographique (lat, lng) dans un polygone (Ray-Casting Algorithm)
 */
export function isPointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calcule tous les emplacements de panneaux valides strictement à l'intérieur du polygone.
 * Les lignes de panneaux sont toujours parallèles au trait de la sablière (bas de pente).
 * Remplissage strict ligne par ligne du bas vers le haut (vers le faîtage).
 */
export function computeValidSolarSlots(polygonPoints) {
  if (!polygonPoints || polygonPoints.length < 3) {
    return { slots: [], maxPanels: 0, maxKwc: 0 };
  }

  // 1. Calcul du centre de gravité
  let cLat = 0, cLng = 0;
  polygonPoints.forEach(p => { cLat += p.lat; cLng += p.lng; });
  cLat /= polygonPoints.length;
  cLng /= polygonPoints.length;

  const latRad = (cLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos(latRad);

  // Conversion de tous les sommets en mètres locaux par rapport au centre
  const ptsM = polygonPoints.map(p => ({
    x: (p.lng - cLng) * metersPerDegLng,
    y: (p.lat - cLat) * metersPerDegLat,
    lat: p.lat,
    lng: p.lng
  }));

  // 2. Identification de la sablière (arête la plus basse / orientée vers le sud)
  const n = ptsM.length;
  let bestEdge = null;
  let minAvgY = Infinity;

  for (let i = 0; i < n; i++) {
    const pA = ptsM[i];
    const pB = ptsM[(i + 1) % n];
    const avgY = (pA.y + pB.y) / 2;
    const edgeDx = pB.x - pA.x;
    const edgeDy = pB.y - pA.y;
    const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);

    // Privilégie les arêtes basses et significativement longues
    if (edgeLen > 2 && avgY < minAvgY) {
      minAvgY = avgY;
      bestEdge = { pA, pB, edgeDx, edgeDy, edgeLen };
    }
  }

  // Si non trouvée, fallback sur le premier segment
  if (!bestEdge) {
    const pA = ptsM[0];
    const pB = ptsM[1];
    const edgeDx = pB.x - pA.x;
    const edgeDy = pB.y - pA.y;
    bestEdge = { pA, pB, edgeDx, edgeDy, edgeLen: Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1 };
  }

  // Vecteur unitaire u le long de la sablière (orienté de gauche à droite)
  let ux = bestEdge.edgeDx / bestEdge.edgeLen;
  let uy = bestEdge.edgeDy / bestEdge.edgeLen;
  if (ux < 0) {
    ux = -ux;
    uy = -uy;
  }

  // Vecteur unitaire v perpendiculaire vers le haut de la toiture (vers le faîtage)
  let vx = -uy;
  let vy = ux;
  // Vérifie que v pointe bien vers l'intérieur / vers les Y plus élevés (le faîtage)
  if (vy < 0) {
    vx = -vx;
    vy = -vy;
  }

  // 3. Projection de tous les points dans le repère local (u, v)
  const polyLocal = ptsM.map(p => ({
    u: p.x * ux + p.y * uy,
    v: p.x * vx + p.y * vy
  }));

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  polyLocal.forEach(pt => {
    minU = Math.min(minU, pt.u);
    maxU = Math.max(maxU, pt.u);
    minV = Math.min(minV, pt.v);
    maxV = Math.max(maxV, pt.v);
  });

  const stepU = PANEL_WIDTH_M + PANEL_GAP_M;
  const stepV = PANEL_HEIGHT_M + PANEL_GAP_M;

  const localToLatLng = (u, v) => {
    const mx = u * ux + v * vx;
    const my = u * uy + v * vy;
    return {
      lat: cLat + (my / metersPerDegLat),
      lng: cLng + (mx / metersPerDegLng)
    };
  };

  const rows = [];
  const totalRows = Math.ceil((maxV - minV) / stepV) + 2;
  const totalCols = Math.ceil((maxU - minU) / stepU) + 4;

  // 4. Balayage Ligne par Ligne du bas (sablière) vers le haut (faîtage)
  for (let r = 0; r < totalRows; r++) {
    // Marge de décalage depuis la sablière (12 cm pour les crochets de gouttière)
    const curV = minV + 0.12 + (r * stepV);
    const rowSlots = [];

    for (let c = -2; c < totalCols; c++) {
      const curU = minU + (c * stepU);

      // Coordonnées des 4 coins et du centre
      const c1Loc = { u: curU, v: curV };
      const c2Loc = { u: curU + PANEL_WIDTH_M, v: curV };
      const c3Loc = { u: curU + PANEL_WIDTH_M, v: curV + PANEL_HEIGHT_M };
      const c4Loc = { u: curU, v: curV + PANEL_HEIGHT_M };
      const midLoc = { u: curU + PANEL_WIDTH_M / 2, v: curV + PANEL_HEIGHT_M / 2 };

      const c1 = localToLatLng(c1Loc.u, c1Loc.v);
      const c2 = localToLatLng(c2Loc.u, c2Loc.v);
      const c3 = localToLatLng(c3Loc.u, c3Loc.v);
      const c4 = localToLatLng(c4Loc.u, c4Loc.v);
      const mid = localToLatLng(midLoc.u, midLoc.v);

      // INCLUSION STRICTE : Le panneau ne doit JAMAIS dépasser de la zone sélectionnée
      const isMidIn = isPointInPolygon(mid.lat, mid.lng, polygonPoints);
      const isC1In = isPointInPolygon(c1.lat, c1.lng, polygonPoints);
      const isC2In = isPointInPolygon(c2.lat, c2.lng, polygonPoints);
      const isC3In = isPointInPolygon(c3.lat, c3.lng, polygonPoints);
      const isC4In = isPointInPolygon(c4.lat, c4.lng, polygonPoints);

      // Tous les 4 coins ET le centre doivent être STRICTEMENT à l'intérieur
      if (isMidIn && isC1In && isC2In && isC3In && isC4In) {
        rowSlots.push({
          row: r,
          col: c,
          corners: [c1, c2, c3, c4],
          center: mid
        });
      }
    }

    if (rowSlots.length > 0) {
      rows.push(rowSlots);
    }
  }

  // 5. Aplatissement ordonné : Ligne 1 complète d'abord, puis Ligne 2, puis Ligne 3...
  const slots = [];
  rows.forEach(rSlots => {
    rSlots.forEach(slot => slots.push(slot));
  });

  const maxPanels = slots.length;
  const maxKwc = Math.round((maxPanels * PANEL_POWER_W) / 100) / 10;

  return { slots, maxPanels, maxKwc, rowsCount: rows.length };
}
