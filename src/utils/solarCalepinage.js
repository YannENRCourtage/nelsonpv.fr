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
 * Priorité absolue par ligne : remplit la ligne 1 jusqu'au bord de la toiture, puis la ligne 2, etc.
 */
export function computeValidSolarSlots(polygonPoints) {
  if (!polygonPoints || polygonPoints.length < 3) {
    return { slots: [], maxPanels: 0, maxKwc: 0 };
  }

  const p0 = polygonPoints[0];
  const p1 = polygonPoints[1];

  // Calcul du centre de gravité
  let cLat = 0, cLng = 0;
  polygonPoints.forEach(p => { cLat += p.lat; cLng += p.lng; });
  cLat /= polygonPoints.length;
  cLng /= polygonPoints.length;

  const latRad = (cLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos(latRad);

  // Direction de l'arête de référence (Faîtage / Longueur de toiture)
  const dx = (p1.lng - p0.lng) * metersPerDegLng;
  const dy = (p1.lat - p0.lat) * metersPerDegLat;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  // Direction de la pente (perpendiculaire vers le bas)
  const vx = -uy;
  const vy = ux;

  // Projection de tous les sommets dans le repère local (u, v)
  const polyLocal = polygonPoints.map(p => {
    const dX = (p.lng - cLng) * metersPerDegLng;
    const dY = (p.lat - cLat) * metersPerDegLat;
    return {
      u: dX * ux + dY * uy,
      v: dX * vx + dY * vy
    };
  });

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  polyLocal.forEach(pt => {
    minU = Math.min(minU, pt.u);
    maxU = Math.max(maxU, pt.u);
    minV = Math.min(minV, pt.v);
    maxV = Math.max(maxV, pt.v);
  });

  const stepU = PANEL_WIDTH_M + PANEL_GAP_M;
  const stepV = PANEL_HEIGHT_M + PANEL_GAP_M;

  const totalCols = Math.ceil((maxU - minU) / stepU) + 4;
  const totalRows = Math.ceil((maxV - minV) / stepV) + 4;

  const startU = minU - stepU;
  const startV = minV - stepV;

  const localToLatLng = (u, v) => {
    const mx = u * ux + v * vx;
    const my = u * uy + v * vy;
    return {
      lat: cLat + (my / metersPerDegLat),
      lng: cLng + (mx / metersPerDegLng)
    };
  };

  const slots = [];

  // Balayage Prioritaire : Ligne par Ligne (V) de haut en bas, et Colonne par Colonne (U) de gauche à droite
  for (let r = 0; r < totalRows; r++) {
    const curV = startV + r * stepV;
    for (let c = 0; c < totalCols; c++) {
      const curU = startU + c * stepU;

      // 4 coins et centre du panneau en local
      const c1Loc = { u: curU, v: curV };
      const c2Loc = { u: curU + PANEL_WIDTH_M, v: curV };
      const c3Loc = { u: curU + PANEL_WIDTH_M, v: curV + PANEL_HEIGHT_M };
      const c4Loc = { u: curU, v: curV + PANEL_HEIGHT_M };
      const midLoc = { u: curU + PANEL_WIDTH_M / 2, v: curV + PANEL_HEIGHT_M / 2 };

      // Conversion en coordonnées géographiques Lat/Lng
      const c1 = localToLatLng(c1Loc.u, c1Loc.v);
      const c2 = localToLatLng(c2Loc.u, c2Loc.v);
      const c3 = localToLatLng(c3Loc.u, c3Loc.v);
      const c4 = localToLatLng(c4Loc.u, c4Loc.v);
      const mid = localToLatLng(midLoc.u, midLoc.v);

      // Critère d'inclusion géométrique strict : le panneau doit être à l'intérieur du polygone
      const isMidIn = isPointInPolygon(mid.lat, mid.lng, polygonPoints);
      const isC1In = isPointInPolygon(c1.lat, c1.lng, polygonPoints);
      const isC2In = isPointInPolygon(c2.lat, c2.lng, polygonPoints);
      const isC3In = isPointInPolygon(c3.lat, c3.lng, polygonPoints);
      const isC4In = isPointInPolygon(c4.lat, c4.lng, polygonPoints);

      // Le panneau est accepté si son centre et au moins 3 de ses coins sont dans la zone (tolérance minimale de bordure)
      const inCount = [isC1In, isC2In, isC3In, isC4In].filter(Boolean).length;
      if (isMidIn && inCount >= 3) {
        slots.push({
          row: r,
          col: c,
          corners: [c1, c2, c3, c4],
          center: mid
        });
      }
    }
  }

  const maxPanels = slots.length;
  const maxKwc = Math.round((maxPanels * PANEL_POWER_W) / 100) / 10;

  return { slots, maxPanels, maxKwc };
}
