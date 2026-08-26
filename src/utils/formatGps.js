/**
 * Formate une chaîne de coordonnées GPS ou une paire (lat, lng) à 6 décimales.
 * Exemple: "45.46027432537378, 1.298158517821822" -> "45.460274, 1.298159"
 *
 * @param {string|number} gpsOrLat - Chaîne GPS "lat, lng" ou valeur de latitude
 * @param {string|number} [lng] - Valeur optionnelle de longitude si deux arguments
 * @param {number} [decimals=6] - Nombre de décimales (par défaut: 6)
 * @returns {string}
 */
export function formatGps(gpsOrLat, lng, decimals = 6) {
  if (gpsOrLat === null || gpsOrLat === undefined || gpsOrLat === '') return '';

  if (typeof gpsOrLat === 'number' || (lng !== undefined && lng !== null)) {
    const latNum = parseFloat(gpsOrLat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      return `${latNum.toFixed(decimals)}, ${lngNum.toFixed(decimals)}`;
    }
    if (!isNaN(latNum)) return latNum.toFixed(decimals);
    return '';
  }

  const str = String(gpsOrLat).trim();
  if (str.includes(',')) {
    const parts = str.split(',');
    const latNum = parseFloat(parts[0].trim());
    const lngNum = parseFloat(parts[1].trim());
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      return `${latNum.toFixed(decimals)}, ${lngNum.toFixed(decimals)}`;
    }
  } else {
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return num.toFixed(decimals);
    }
  }

  return str;
}

/**
 * Formate une coordonnée unique (latitude ou longitude) à 6 décimales.
 * @param {string|number} val
 * @param {number} [decimals=6]
 * @returns {string}
 */
export function formatCoordinate(val, decimals = 6) {
  if (val === null || val === undefined || val === '') return '';
  const num = parseFloat(val);
  return isNaN(num) ? String(val) : num.toFixed(decimals);
}
