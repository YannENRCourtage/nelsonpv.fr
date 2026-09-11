/**
 * squarePolygon.js
 * Algorithme d'orthogonalisation de polygones par Boîte Englobante Minimale Orientée (OMBB / Oriented Minimum Bounding Box)
 * 
 * Remplace l'ancienne logique de snapping qui aplatissait les polygones en une simple ligne.
 * Utilise l'algorithme des Rotating Calipers pour trouver le plus petit rectangle englobant
 * tout en respectant l'azimut initial de la toiture.
 * 
 * @param {Array<{lat: number, lng: number}>|Array<[number, number]>} points - Sommets du polygone
 * @returns {Array<{lat: number, lng: number}>} Rectangle orthogonalisé à 90° (4 sommets)
 */

export function squarePolygon(points) {
  if (!Array.isArray(points) || points.length < 3) return points;

  // 1. Normaliser le format d'entrée vers { lat, lng }
  let cleanPts = points.map((p) => {
    if (Array.isArray(p)) {
      // Détecter [lng, lat] vs [lat, lng]
      const [v0, v1] = p;
      if (Math.abs(v0) > 90) return { lat: v1, lng: v0 };
      if (Math.abs(v1) > 90) return { lat: v0, lng: v1 };
      return { lat: v0, lng: v1 };
    }
    return { lat: Number(p.lat ?? p.latitude), lng: Number(p.lng ?? p.lon ?? p.longitude) };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));

  // Retirer le point de fermeture s'il est dupliqué à la fin
  if (cleanPts.length > 3) {
    const first = cleanPts[0];
    const last = cleanPts[cleanPts.length - 1];
    if (Math.hypot(first.lat - last.lat, first.lng - last.lng) < 1e-7) {
      cleanPts.pop();
    }
  }

  if (cleanPts.length < 3) return points;

  // 2. Projection locale métrique centrée sur le centroïde pour une grande précision numérique
  const avgLat = cleanPts.reduce((sum, p) => sum + p.lat, 0) / cleanPts.length;
  const avgLng = cleanPts.reduce((sum, p) => sum + p.lng, 0) / cleanPts.length;
  const R = 6378137; // Rayon terrestre WGS84
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const cosLat = Math.cos(toRad(avgLat));

  const cart = cleanPts.map(p => ({
    x: R * toRad(p.lng - avgLng) * cosLat,
    y: R * toRad(p.lat - avgLat)
  }));

  // 3. Calcul de l'enveloppe convexe 2D (Convex Hull - Monotone Chain)
  function crossProduct(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  const sorted = cart.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);

  if (hull.length < 3) return points;

  // 4. Recherche de la Boîte Englobante Minimale Orientée (OMBB)
  // Théorème de Freeman & Shapira : l'une des arêtes de la boîte englobante minimale est colinéaire
  // à l'une des arêtes de l'enveloppe convexe.
  let minArea = Infinity;
  let bestRect = null;

  // Angles candidats : tous les segments de l'enveloppe convexe
  const candidateAngles = [];
  const numHull = hull.length;

  for (let i = 0; i < numHull; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % numHull];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (Math.hypot(dx, dy) > 1e-5) {
      candidateAngles.push(Math.atan2(dy, dx));
    }
  }

  // Ajouter aussi l'arête la plus longue du polygone d'origine pour respecter l'azimut initial de faîtage
  let maxEdgeLen = 0;
  let longestEdgeAngle = 0;
  for (let i = 0; i < cart.length; i++) {
    const p1 = cart[i];
    const p2 = cart[(i + 1) % cart.length];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (len > maxEdgeLen) {
      maxEdgeLen = len;
      longestEdgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
  }
  candidateAngles.push(longestEdgeAngle);

  // Tester chaque angle d'orientation
  for (const angle of candidateAngles) {
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let j = 0; j < numHull; j++) {
      const rx = hull[j].x * cosA - hull[j].y * sinA;
      const ry = hull[j].x * sinA + hull[j].y * cosA;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;

    // Favoriser la compacité minimale, avec légère préférence pour l'arête la plus longue en cas d'égalité
    const isDominant = Math.abs(angle - longestEdgeAngle) < 1e-4;
    const adjustedArea = isDominant ? area * 0.999 : area;

    if (adjustedArea < minArea && width > 0.5 && height > 0.5) {
      minArea = adjustedArea;
      const cosR = Math.cos(angle);
      const sinR = Math.sin(angle);

      const unrotate = (rx, ry) => ({
        x: rx * cosR - ry * sinR,
        y: rx * sinR + ry * cosR,
      });

      // 4 coins du rectangle dans le repère mondial
      bestRect = [
        unrotate(minX, minY),
        unrotate(maxX, minY),
        unrotate(maxX, maxY),
        unrotate(minX, maxY),
      ];
    }
  }

  if (!bestRect) return points;

  // 5. Conserver le sens de rotation (sens horaire ou anti-horaire) du polygone tracé
  let origSignedArea = 0;
  for (let i = 0; i < cart.length; i++) {
    const p1 = cart[i];
    const p2 = cart[(i + 1) % cart.length];
    origSignedArea += (p1.x * p2.y - p2.x * p1.y);
  }

  let rectSignedArea = 0;
  for (let i = 0; i < bestRect.length; i++) {
    const p1 = bestRect[i];
    const p2 = bestRect[(i + 1) % bestRect.length];
    rectSignedArea += (p1.x * p2.y - p2.x * p1.y);
  }

  if ((origSignedArea > 0 && rectSignedArea < 0) || (origSignedArea < 0 && rectSignedArea > 0)) {
    bestRect.reverse();
  }

  // 6. Aligner le premier sommet du rectangle avec le sommet d'origine le plus proche
  const firstOrig = cart[0];
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < bestRect.length; i++) {
    const d = Math.hypot(bestRect[i].x - firstOrig.x, bestRect[i].y - firstOrig.y);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  const alignedRect = [];
  for (let i = 0; i < 4; i++) {
    alignedRect.push(bestRect[(bestIdx + i) % 4]);
  }

  // 7. Reconversion en coordonnées géographiques { lat, lng }
  return alignedRect.map(pt => ({
    lat: Number((avgLat + toDeg(pt.y / R)).toFixed(7)),
    lng: Number((avgLng + toDeg(pt.x / (R * cosLat))).toFixed(7)),
  }));
}
