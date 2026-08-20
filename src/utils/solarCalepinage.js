// ─── Module de Calepinage Photovoltaïque Métrique & Géométrique Strict ─────────

export const PANEL_WIDTH_M = 1.134;   // Largeur panneau standard en portrait (1.134 m)
export const PANEL_HEIGHT_M = 1.762;  // Hauteur panneau standard en portrait (1.762 m)
export const PANEL_GAP_M = 0.02;      // Espacement inter-panneaux (2 cm)
export const PANEL_POWER_W = 465;     // Puissance unitaire d'un panneau (465 Wc)

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
 * Les lignes de panneaux sont toujours strictement parallèles au trait de la sablière (arête opposée au faîtage).
 * Remplissage strict ligne par ligne du bas (sablière) vers le haut (faîtage).
 */
export function computeValidSolarSlots(polygonPoints, ridgeIndex = 0, isLandscape = false) {
  if (!polygonPoints || polygonPoints.length < 3) {
    return { slots: [], maxPanels: 0, maxKwc: 0 };
  }

  const pW = isLandscape ? PANEL_HEIGHT_M : PANEL_WIDTH_M; // 1.762 en paysage, 1.134 en portrait
  const pH = isLandscape ? PANEL_WIDTH_M : PANEL_HEIGHT_M;  // 1.134 en paysage, 1.762 en portrait
  const pGap = PANEL_GAP_M;

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

  const n = ptsM.length;

  // 2. Identification exacte de la sablière à partir du faîtage sélectionné (arête opposée)
  const safeRidge = typeof ridgeIndex === 'number' && ridgeIndex >= 0 ? ridgeIndex % n : 0;
  const sabliereIndex = (safeRidge + Math.floor(n / 2)) % n;

  const pA = ptsM[sabliereIndex];
  const pB = ptsM[(sabliereIndex + 1) % n];

  const edgeDx = pB.x - pA.x;
  const edgeDy = pB.y - pA.y;
  const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;

  // Vecteur unitaire u le long de la sablière (parallèle au bas de pente)
  let ux = edgeDx / edgeLen;
  let uy = edgeDy / edgeLen;

  // Point milieu du faîtage pour orienter le vecteur v de la sablière vers le faîtage
  const rA = ptsM[safeRidge];
  const rB = ptsM[(safeRidge + 1) % n];
  const ridgeMidX = (rA.x + rB.x) / 2;
  const ridgeMidY = (rA.y + rB.y) / 2;
  const sabMidX = (pA.x + pB.x) / 2;
  const sabMidY = (pA.y + pB.y) / 2;

  const toRidgeX = ridgeMidX - sabMidX;
  const toRidgeY = ridgeMidY - sabMidY;

  // Vecteur unitaire v perpendiculaire à u
  let vx = -uy;
  let vy = ux;

  // Vérifie que v pointe bien vers le faîtage (produit scalaire positif)
  if (vx * toRidgeX + vy * toRidgeY < 0) {
    vx = -vx;
    vy = -vy;
  }

  // 3. Projection de tous les points dans le repère local (u, v)
  const polyLocal = ptsM.map(p => ({
    u: p.x * ux + p.y * vy ? (p.x * ux + p.y * uy) : 0,
    v: p.x * vx + p.y * vy
  }));

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  polyLocal.forEach(pt => {
    minU = Math.min(minU, pt.u);
    maxU = Math.max(maxU, pt.u);
    minV = Math.min(minV, pt.v);
    maxV = Math.max(maxV, pt.v);
  });

  const stepU = pW + pGap;
  const stepV = pH + pGap;

  const localToLatLng = (u, v) => {
    const mx = u * ux + v * vx;
    const my = u * uy + v * vy;
    return {
      lat: cLat + (my / metersPerDegLat),
      lng: cLng + (mx / metersPerDegLng)
    };
  };

  const rows = [];
  const totalRows = Math.ceil((maxV - minV) / stepV) + 4;
  const totalCols = Math.ceil((maxU - minU) / stepU) + 6;

  // 4. Balayage Ligne par Ligne du bas (sablière) vers le haut (faîtage)
  for (let r = 0; r < totalRows; r++) {
    // Marge de sécurité depuis la sablière (10 cm)
    const curV = minV + 0.10 + (r * stepV);
    const rowSlots = [];

    for (let c = -3; c < totalCols; c++) {
      const curU = minU + (c * stepU);

      // Coordonnées des 4 coins et du centre
      const c1Loc = { u: curU, v: curV };
      const c2Loc = { u: curU + pW, v: curV };
      const c3Loc = { u: curU + pW, v: curV + pH };
      const c4Loc = { u: curU, v: curV + pH };
      const midLoc = { u: curU + pW / 2, v: curV + pH / 2 };

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
