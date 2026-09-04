/**
 * Service de génération automatique de cartes de situation et de masse
 * (Plan IGN + Vue aérienne Satellite + Plan de masse OSM zoom 19)
 * Rendu dynamique via Canvas HTML5 à partir de coordonnées GPS (lat, lng) ou d'une adresse.
 */
import {
  getStructureHeights,
  drawDimensionLine,
  drawSetbackLine,
  drawNorthArrow,
  draw3DStructureBadge
} from '@/utils/mapCotations';

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

function getBuildingCorners(centerLat, centerLng, lengthMeters, widthMeters, rotationDeg) {
  const lat = Number(centerLat) || 43.43571;
  const lng = Number(centerLng) || -1.17644;
  const len = Number(lengthMeters) || 30;
  const wid = Number(widthMeters) || 15;
  const rotRad = ((Number(rotationDeg) || 0) * Math.PI) / 180;

  const dx = len / 2;
  const dy = wid / 2;

  const localCorners = [
    { x: -dx, y: -dy },
    { x: +dx, y: -dy },
    { x: +dx, y: +dy },
    { x: -dx, y: +dy }
  ];

  const mPerLat = 111139;
  const mPerLng = 111139 * Math.cos((lat * Math.PI) / 180);

  return localCorners.map(corner => {
    const rx = corner.x * Math.cos(rotRad) - corner.y * Math.sin(rotRad);
    const ry = corner.x * Math.sin(rotRad) + corner.y * Math.cos(rotRad);

    const cLat = lat + (ry / mPerLat);
    const cLng = lng + (rx / (mPerLng || 1));
    return [cLat, cLng];
  });
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

        const hasBuildings = Boolean(buildings && Array.isArray(buildings) && buildings.length > 0);

        if (hasBuildings) {
          // Repère Plan de Masse avec emprise exacte, position GPS personnalisée et rotation de chaque bâtiment
          const bList = buildings;

          // Facteur d'échelle mètres -> pixels au niveau de zoom courant
          const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
          const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 2.0;

          bList.forEach((b, bIdx) => {
            const bLength = Number(b.length || b.longueur || 30);
            const bWidth = Number(b.totalWidth || b.width || b.largeur || 20);
            const bRot = Number(b.rotation || 0);
            const rectW = Math.max(20, bLength * pxPerMeter);
            const rectH = Math.max(12, bWidth * pxPerMeter);

            // Calcul de la position exacte du bâtiment par rapport au centre de la carte (lat, lng)
            let bPixelX = mx;
            let bPixelY = my;

            const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || lat);
            const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || lng);

            if (bLat && bLng && !isNaN(bLat) && !isNaN(bLng)) {
              const bRad = (bLat * Math.PI) / 180;
              const bExactX = ((bLng + 180) / 360) * n;
              const bExactY = ((1 - Math.log(Math.tan(bRad) + 1 / Math.cos(bRad)) / Math.PI) / 2) * n;
              bPixelX = centerX + (bExactX - exactX) * tileSize;
              bPixelY = centerY + (bExactY - exactY) * tileSize;
            }

            // Calcul des 4 coins exacts du polygone selon la projection GPS identique à Leaflet
            const corners = getBuildingCorners(bLat, bLng, bLength, bWidth, bRot);
            const pixelCorners = corners.map(([cLat, cLng]) => {
              const cRad = (cLat * Math.PI) / 180;
              const cExactX = ((cLng + 180) / 360) * n;
              const cExactY = ((1 - Math.log(Math.tan(cRad) + 1 / Math.cos(cRad)) / Math.PI) / 2) * n;
              return {
                x: centerX + (cExactX - exactX) * tileSize,
                y: centerY + (cExactY - exactY) * tileSize
              };
            });

            // Détection du type de structure pour un rendu fidèle à l'interface DP2 / PC2
            const isOmbriere = b.solutionKey === 'ombriere' || (b.buildingType || '').toLowerCase().includes('ombriere') || (b.name || '').toLowerCase().includes('ombrière');
            const strokeColor = isOmbriere ? '#059669' : '#2563eb';
            const fillColor = isOmbriere ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)';
            const badgeBorder = isOmbriere ? '#a7f3d0' : '#bfdbfe';
            const badgeTextColor = isOmbriere ? '#065f46' : '#1e40af';

            ctx.save();

            // Rendu du polygone précis
            ctx.beginPath();
            ctx.moveTo(pixelCorners[0].x, pixelCorners[0].y);
            ctx.lineTo(pixelCorners[1].x, pixelCorners[1].y);
            ctx.lineTo(pixelCorners[2].x, pixelCorners[2].y);
            ctx.lineTo(pixelCorners[3].x, pixelCorners[3].y);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Faîtage médian en pointillés discrets
            const ridgeStart = {
              x: (pixelCorners[0].x + pixelCorners[3].x) / 2,
              y: (pixelCorners[0].y + pixelCorners[3].y) / 2
            };
            const ridgeEnd = {
              x: (pixelCorners[1].x + pixelCorners[2].x) / 2,
              y: (pixelCorners[1].y + pixelCorners[2].y) / 2
            };
            ctx.beginPath();
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = isOmbriere ? '#10b981' : '#60a5fa';
            ctx.lineWidth = 1.5;
            ctx.moveTo(ridgeStart.x, ridgeStart.y);
            ctx.lineTo(ridgeEnd.x, ridgeEnd.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Cotations architecturales du bâtiment (Longueur et Largeur sur les arêtes)
            const centerPt = { x: bPixelX, y: bPixelY };
            drawDimensionLine(ctx, pixelCorners[0], pixelCorners[1], centerPt, `${bLength.toFixed(1)} M`, strokeColor, 22);
            drawDimensionLine(ctx, pixelCorners[1], pixelCorners[2], centerPt, `${bWidth.toFixed(1)} M`, strokeColor, 22);

            // Cote d'implantation / recul aux limites parcellaires ou voirie (en rouge, conforme style urbanisme)
            const edgeLen = Math.hypot(pixelCorners[1].x - pixelCorners[0].x, pixelCorners[1].y - pixelCorners[0].y) || 1;
            const perpX = -(pixelCorners[1].y - pixelCorners[0].y) / edgeLen;
            const perpY = (pixelCorners[1].x - pixelCorners[0].x) / edgeLen;
            let setbackVec = { x: perpX, y: perpY };
            const toCenter = { x: bPixelX - pixelCorners[1].x, y: bPixelY - pixelCorners[1].y };
            if (setbackVec.x * toCenter.x + setbackVec.y * toCenter.y > 0) {
              setbackVec.x = -setbackVec.x;
              setbackVec.y = -setbackVec.y;
            }
            const setbackMeters = Number(b.setback || 13.0);
            drawSetbackLine(ctx, pixelCorners[1], setbackVec, setbackMeters, pxPerMeter, `Recul : ${setbackMeters.toFixed(1)} M`);

            // Cartouche 3D complet (3 dimensions : L, l, H faîtage/sablière + TN 0.00m)
            const heights = getStructureHeights(b);
            draw3DStructureBadge(
              ctx,
              centerPt,
              b.name || (isOmbriere ? `Ombrière ${bIdx + 1}` : `Bâtiment ${bIdx + 1}`),
              bRot,
              bLength,
              bWidth,
              heights.eaveHeight,
              heights.ridgeHeight,
              isOmbriere
            );

            ctx.restore();
          });

          // Flèche Nord officielle en haut à droite
          drawNorthArrow(ctx, width - 42, 42, 22);

          // Échelle métrique dans le coin inférieur gauche (identique à PC2MapScaleBar)
          const targets = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
          const maxBarPx = 80;
          const maxMeters = maxBarPx * metersPerPx;
          const best = targets.reduce((prev, cur) => (cur <= maxMeters ? cur : prev), 10);
          const pxWidth = best / metersPerPx;
          const scaleLabel = best >= 1000 ? `${best / 1000} km` : `${best} m`;

          const sbX = 14;
          const sbY = height - 36;
          const sbW = Math.max(60, pxWidth + 36);
          const sbH = 22;

          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(sbX, sbY, sbW, sbH, 4);
          else ctx.rect(sbX, sbY, sbW, sbH);
          ctx.fill();
          ctx.stroke();

          // Barre
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sbX + 8, sbY + 7);
          ctx.lineTo(sbX + 8, sbY + 14);
          ctx.lineTo(sbX + 8 + pxWidth, sbY + 14);
          ctx.lineTo(sbX + 8 + pxWidth, sbY + 7);
          ctx.stroke();

          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(scaleLabel, sbX + 8 + pxWidth + 6, sbY + 11);
          ctx.restore();
        }

        // Marqueur Pin de localisation (uniquement pour PC1/DP1 Situation et Satellite sans bâtiments configurés)
        if (!hasBuildings) {
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
        }

        // Légende filigrane
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = mode === 'satellite' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
        const legendText = hasBuildings
          ? `PC2 / DP2 — Plan de masse (OpenStreetMap Zoom ${zoom})`
          : (mode === 'satellite'
            ? 'PC1 / DP1 — Vue Aérienne (Géoportail / Satellite)'
            : 'PC1 / DP1 — Plan de Situation (IGN / OSM)');
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

  if ((!lat || !lng || (Math.abs(lat - 43.5612) < 0.001 && Math.abs(lng - 0.9168) < 0.001)) && project?.gps) {
    const parts = String(project.gps).split(',').map(v => Number(v.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  // Coordonnées par défaut du site projet LABERGUERIE 64120 OREGUE (3810 Route des Barthes)
  if (!lat || !lng || isNaN(lat) || isNaN(lng) || (Math.abs(lat - 43.5612) < 0.001 && Math.abs(lng - 0.9168) < 0.001)) {
    lat = 43.43571;
    lng = -1.17644;
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
