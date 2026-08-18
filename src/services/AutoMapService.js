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
export async function generateStaticMapImage(lat, lng, mode = 'map', zoom = 16, buildings = null) {
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
          // Repère Plan de Masse avec emprise exacte et rotation de chaque bâtiment
          const bList = (buildings && Array.isArray(buildings) && buildings.length > 0)
            ? buildings
            : [{ length: 30, width: 20, rotation: 0, name: 'Bâtiment 1' }];

          // Facteur d'échelle mètres -> pixels à zoom 19
          const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
          const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 2.0;

          bList.forEach((b, bIdx) => {
            const bLength = Number(b.length || b.longueur || 30);
            const bWidth = Number(b.width || b.largeur || 20);
            const bRot = Number(b.rotation || 0);
            const rectW = Math.max(30, bLength * pxPerMeter);
            const rectH = Math.max(20, bWidth * pxPerMeter);

            // Décalage visuel si multi-bâtiments
            const xOffset = bList.length > 1 ? (bIdx * 80 - ((bList.length - 1) * 40)) : 0;

            ctx.save();
            ctx.translate(mx + xOffset, my);
            ctx.rotate((bRot * Math.PI) / 180);

            // Emprise au sol colorée
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

            // Faîtage médian
            ctx.beginPath();
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.moveTo(-rectW / 2, 0);
            ctx.lineTo(rectW / 2, 0);
            ctx.stroke();
            ctx.setLineDash([]);

            // Dimensions et libellé
            ctx.fillStyle = '#991b1b';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${b.name || `Bâtiment ${bIdx + 1}`}`, 0, -rectH / 2 - 5);
            ctx.fillText(`${bLength.toFixed(1)}m × ${bWidth.toFixed(1)}m`, 0, 4);

            ctx.restore();
          });
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

      // Secours en cas de timeout réseau (6 secondes max)
      setTimeout(() => {
        if (loadedCount < totalImages) {
          console.warn(`[AutoMap] Timeout: ${loadedCount}/${totalImages} tiles loaded, rendering partial map`);
          drawMarkerAndFinish();
        }
      }, 6000);

    } catch (err) {
      console.error('[AutoMap] Error generating static map:', err);
      // Fallback: canvas with error message
      try {
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 800;
        fallbackCanvas.height = 500;
        const fCtx = fallbackCanvas.getContext('2d');
        fCtx.fillStyle = '#f1f5f9';
        fCtx.fillRect(0, 0, 800, 500);
        fCtx.fillStyle = '#64748b';
        fCtx.font = 'bold 14px Arial';
        fCtx.textAlign = 'center';
        fCtx.fillText('Carte non disponible — veuillez réessayer', 400, 250);
        resolve(fallbackCanvas.toDataURL('image/jpeg', 0.9));
      } catch (_) {
        resolve(null);
      }
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
    const masseData = await generateStaticMapImage(lat, lng, 'map', 19, project?.buildings);
    if (masseData) result.masse_projet = masseData;
  }

  return result;
}
