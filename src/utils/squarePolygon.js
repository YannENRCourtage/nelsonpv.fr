// src/utils/squarePolygon.js
/**
 * Square (orthogonalise) a polygon defined as an array of {lat,lng} points.
 * The algorithm:
 * 1️⃣ Find the longest edge – its angle defines the dominant orientation.
 * 2️⃣ Rotate all points so that this edge aligns with the X axis.
 * 3️⃣ Snap every point onto a grid where X/Y offsets are multiples of the edge length,
 *    forcing right angles.
 * 4️⃣ Rotate the points back to the original bearing.
 *
 * This implementation avoids external libraries (e.g., Turf) and works for
 * convex quadrilaterals (the typical roof shape used in Nelson).
 *
 * @param {Array<{lat:number,lng:number}>} points - Input polygon (must have ≥4 points).
 * @returns {Array<{lat:number,lng:number}>} New polygon with orthogonalised corners.
 */
export function squarePolygon(points) {
  if (!Array.isArray(points) || points.length < 4) return points;

  // Helper to convert lat/lng to simple Cartesian (meters) using equirectangular approx.
  const R = 6378137; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const avgLat = points.reduce((a, p) => a + p.lat, 0) / points.length;
  const cosLat = Math.cos(toRad(avgLat));

  const cart = points.map((p) => ({
    x: R * toRad(p.lng) * cosLat,
    y: R * toRad(p.lat),
    orig: p,
  }));

  // 1️⃣ Find longest edge
  let longest = { i: 0, length: 0, angle: 0 };
  for (let i = 0; i < cart.length; i++) {
    const a = cart[i];
    const b = cart[(i + 1) % cart.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len > longest.length) {
      longest = { i, length: len, angle: Math.atan2(dy, dx) };
    }
  }

  const theta = -longest.angle; // rotation to align longest edge with X axis
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);

  // 2️⃣ Rotate points
  const rotated = cart.map(({ x, y, orig }) => {
    const xr = x * cos - y * sin;
    const yr = x * sin + y * cos;
    return { xr, yr, orig };
  });

  // 3️⃣ Snap to orthogonal grid – we use the length of the dominant edge as grid size
  const grid = longest.length;
  const snapped = rotated.map(({ xr, yr, orig }) => {
    const xs = Math.round(xr / grid) * grid;
    const ys = Math.round(yr / grid) * grid;
    return { xs, ys, orig };
  });

  // 4️⃣ Rotate back
  const unrotated = snapped.map(({ xs, ys, orig }) => {
    const x = xs * cos + ys * sin;
    const y = -xs * sin + ys * cos;
    const lat = (y / R) * (180 / Math.PI);
    const lng = (x / (R * cosLat)) * (180 / Math.PI);
    return { lat, lng };
  });

  // Ensure we have exactly 4 points (close the loop) – drop duplicates
  const final = [];
  const seen = new Set();
  for (const pt of unrotated) {
    const key = `${pt.lat.toFixed(6)}|${pt.lng.toFixed(6)}`;
    if (!seen.has(key)) {
      seen.add(key);
      final.push(pt);
    }
  }
  return final.slice(0, 4);
}
