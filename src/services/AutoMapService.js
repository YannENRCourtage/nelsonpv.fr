/**
 * Service de génération automatique de cartes de situation et de masse
 * (Plan IGN + Vue aérienne Satellite + Plan de masse OSM zoom 19)
 * Rendu dynamique via Canvas HTML5 à partir de coordonnées GPS (lat, lng) ou d'une adresse.
 */

/**
 * Convertit des coordonnées GPS (lat, lng) en coordonnées de tuiles Web Mercator (x, y, z)
 */
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const rad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x, y, z: zoom };
}

/**
 * Génère une image JPEG (dataURL) composée de 3x3 tuiles cartographiques autour des coordonnées GPS,
 * avec un repère visuel (marqueur rouge/bleu) au centre.
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @param {string} mode 'map' (OpenStreetMap/Carto) ou 'satellite' (Esri World Imagery)
 * @param {number} zoom Level de zoom (16-17 pour situation, 19 pour plan de masse)
 * @returns {Promise<string>} Data URL Image JPEG (data:image/jpeg;base64,...)
 */
export async function generateStaticMapImage(lat, lng, mode = 'map', zoom = 16) {
  return new Promise((resolve) => {
    try {
      const width = 800;
      const height = 500;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      // Fond de secours
      ctx.fillStyle = mode === 'satellite' ? '#1e293b' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Calcul des tuiles
      const tileCenter = latLngToTile(lat, lng, zoom);
      const tileSize = 256;

      // Calcul du décalage exact du point dans la tuile centrale
      const n = Math.pow(2, zoom);
      const exactX = ((lng + 180) / 360) * n;
      const rad = (lat * Math.PI) / 180;
      const exactY = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;

      const offsetX = (exactX - tileCenter.x) * tileSize;
      const offsetY = (exactY - tileCenter.y) * tileSize;

      const centerX = width / 2;
      const centerY = height / 2;

      // URLs des fournisseurs de tuiles
      const getTileUrl = (x, y, z) => {
        if (mode === 'satellite') {
          return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
        }
        // OpenStreetMap standard (zoomable jusqu'à 19)
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      };

      const imagesToLoad = [];
      const range = 2; // 5x5 grid pour couvrir tout le canvas 800x500

      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          const tx = tileCenter.x + dx;
          const ty = tileCenter.y + dy;
          const url = getTileUrl(tx, ty, zoom);
          
          imagesToLoad.push({
            dx,
            dy,
            url,
          });
        }
      }

      let loadedCount = 0;
      const totalImages = imagesToLoad.length;

      const drawMarkerAndFinish = () => {
        // Dessin du repère au centre (point d'implantation du projet)
        const mx = centerX;
        const my = centerY;

        if (zoom >= 18) {
          // Repère Plan de Masse (Emprise indicative / rectangle de projet)
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(mx - 35, my - 25, 70, 50);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(mx - 35, my - 25, 70, 50);
        }

        // Halo
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fillStyle = mode === 'satellite' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(13, 77, 173, 0.25)';
        ctx.fill();

        // Pin de localisation
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.fillStyle = mode === 'satellite' ? '#ef4444' : '#0d4dad';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Légende filigrane
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = mode === 'satellite' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
        const legendText = zoom >= 19
          ? 'PC2 / DP2 — Plan de masse (OpenStreetMap Zoom 19)'
          : mode === 'satellite'
          ? 'PC1 / DP1 — Vue Aérienne (Géoportail / Satellite)'
          : 'PC1 / DP1 — Plan de Situation (IGN / OSM)';
        ctx.fillText(legendText, 12, height - 12);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl);
        } catch (e) {
          console.warn('[AutoMap] Canvas toDataURL failed (CORS):', e);
          resolve(null);
        }
      };

      imagesToLoad.forEach((item) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const posX = centerX + item.dx * tileSize - offsetX;
          const posY = centerY + item.dy * tileSize - offsetY;
          ctx.drawImage(img, posX, posY, tileSize, tileSize);
          loadedCount++;
          if (loadedCount === totalImages) {
            drawMarkerAndFinish();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            drawMarkerAndFinish();
          }
        };
        img.src = item.url;
      });

      // Secours en cas de timeout réseau (3.5 secondes max)
      setTimeout(() => {
        if (loadedCount < totalImages) {
          drawMarkerAndFinish();
        }
      }, 3500);

    } catch (err) {
      console.error('[AutoMap] Error generating static map:', err);
      resolve(null);
    }
  });
}

/**
 * Tente d'obtenir des cartes automatiques à partir des données d'un projet :
 * - ign : Plan de situation (zoom 16)
 * - satellite : Vue aérienne (zoom 17)
 * - masse_projet : Plan de masse OSM (zoom 19)
 */
export async function getOrGenerateProjectMaps(project) {
  let lat = Number(project?.lat);
  let lng = Number(project?.lng);

  if ((!lat || !lng) && project?.gps) {
    const parts = String(project.gps).split(',').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  // Coordonnées par défaut si non définies (ex: Gers 43.5612, 0.9168)
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    lat = 43.5612;
    lng = 0.9168;
  }

  const existingCaptures = project?.urbanisme_captures || {};
  const result = { ...existingCaptures };

  // 1. PC1 IGN
  if (!result.ign) {
    const ignData = await generateStaticMapImage(lat, lng, 'map', 16);
    if (ignData) result.ign = ignData;
  }

  // 2. PC1 Vue Aérienne Satellite
  if (!result.satellite) {
    const satData = await generateStaticMapImage(lat, lng, 'satellite', 17);
    if (satData) result.satellite = satData;
  }

  // 3. PC2 Plan de masse OSM Zoom 19
  if (!result.masse_projet) {
    const masseData = await generateStaticMapImage(lat, lng, 'map', 19);
    if (masseData) result.masse_projet = masseData;
  }

  return result;
}
