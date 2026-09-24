/**
 * Service de génération automatique de cartes de situation et de masse
 * (Plan IGN + Vue aérienne Satellite + Plan de masse OSM zoom 19)
 * Rendu dynamique via Canvas HTML5 à partir de coordonnées GPS (lat, lng) ou d'une adresse.
 */
import {
  getStructureHeights,
  drawDimensionLine,
  drawNorthArrow
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
export async function generateStaticMapImage(lat, lng, mode = 'map', zoom = 18, buildings = null, showDimensions = true, distances = [], sdisPoint = null, options = {}) {
  return new Promise((resolve) => {
    let isResolved = false;
    const hardTimeout = setTimeout(() => {
      if (!isResolved) {
        console.warn('[AutoMap] Hard timeout triggered (6.5s), resolving null');
        isResolved = true;
        resolve(null);
      }
    }, 6500);

    const safeResolve = (val) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(hardTimeout);
      resolve(val);
    };

    try {
      const width = 800;
      const height = 500;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        safeResolve(null);
        return;
      }

      const hasBuildings = Boolean(buildings && Array.isArray(buildings) && buildings.length > 0);
      const currentZoom = Number(zoom || (hasBuildings ? 18 : 16));

      // Fond de secours
      ctx.fillStyle = mode === 'satellite' ? '#1e293b' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Calcul des tuiles
      const tileCenter = latLngToTile(lat, lng, currentZoom);
      const tileSize = 256;

      // Calcul du décalage exact du point dans la tuile centrale
      const n = Math.pow(2, currentZoom);
      const exactX = ((lng + 180) / 360) * n;
      const rad = (lat * Math.PI) / 180;
      const exactY = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;

      const offsetX = (exactX - tileCenter.x) * tileSize;
      const offsetY = (exactY - tileCenter.y) * tileSize;

      const centerX = width / 2;
      const centerY = height / 2;

      // URLs des fournisseurs de tuiles (avec intégration directe IGN Géoplateforme libre)
      const getTileUrl = (x, y, z) => {
        if (mode === 'satellite') {
          // IGN Orthophoto haute résolution (fallback Esri si indisponible)
          return `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
        }
        // "IGN - Plan IGN" vecteur officiel haute lisibilité
        return `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
      };

      const getFallbackTileUrl = (x, y, z) => {
        if (mode === 'satellite') {
          return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
        }
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      };

      const imagesToLoad = [];
      const range = 2; // 5x5 grid pour couvrir tout le canvas 800x500

      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          const tx = tileCenter.x + dx;
          const ty = tileCenter.y + dy;
          const url = getTileUrl(tx, ty, currentZoom);
          
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

        if (hasBuildings) {
          // Repère Plan de Masse avec emprise exacte, position GPS personnalisée et rotation de chaque bâtiment
          const bList = buildings;

          // Facteur d'échelle mètres -> pixels au niveau de zoom courant
          const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, currentZoom + 8);
          const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 2.0;

          bList.forEach((b, bIdx) => {
            const isBat = b.solutionKey === 'battery' || b.isBattery || (b.buildingType || '').toLowerCase().includes('battery') || (b.name || '').toLowerCase().includes('batterie');
            const bLength = Number(b.length || b.longueur || (isBat ? 6.20 : 30));
            const bWidth = Number(b.totalWidth || b.width || b.largeur || (isBat ? 3.20 : 20));
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
            const isBattery = b.solutionKey === 'battery' || b.isBattery || (b.buildingType || '').toLowerCase().includes('battery') || (b.name || '').toLowerCase().includes('batterie');
            const isOmbriere = !isBattery && (b.solutionKey === 'ombriere' || (b.buildingType || '').toLowerCase().includes('ombriere') || (b.name || '').toLowerCase().includes('ombrière'));
            const strokeColor = isBattery ? '#9333ea' : (isOmbriere ? '#059669' : '#2563eb');
            const fillColor = isBattery ? 'rgba(168, 85, 247, 0.35)' : (isOmbriere ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)');
            const badgeBorder = isBattery ? '#e9d5ff' : (isOmbriere ? '#a7f3d0' : '#bfdbfe');
            const badgeTextColor = isBattery ? '#581c87' : (isOmbriere ? '#065f46' : '#1e40af');

            ctx.save();

            // Rendu du polygone précis de la dalle / structure
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
            ctx.setLineDash(isBattery ? [6, 3] : [5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            if (isBattery) {
              // Rendu intérieur des 4 armoires de batteries sur la dalle béton
              const cabCount = 4;
              for (let ci = 0; ci < cabCount; ci++) {
                const t0 = (ci + 0.12) / cabCount;
                const t1 = (ci + 0.88) / cabCount;
                // Points le long des côtés longs
                const pTop0 = {
                  x: pixelCorners[0].x + (pixelCorners[1].x - pixelCorners[0].x) * t0,
                  y: pixelCorners[0].y + (pixelCorners[1].y - pixelCorners[0].y) * t0
                };
                const pTop1 = {
                  x: pixelCorners[0].x + (pixelCorners[1].x - pixelCorners[0].x) * t1,
                  y: pixelCorners[0].y + (pixelCorners[1].y - pixelCorners[0].y) * t1
                };
                const pBtm0 = {
                  x: pixelCorners[3].x + (pixelCorners[2].x - pixelCorners[3].x) * t0,
                  y: pixelCorners[3].y + (pixelCorners[2].y - pixelCorners[3].y) * t0
                };
                const pBtm1 = {
                  x: pixelCorners[3].x + (pixelCorners[2].x - pixelCorners[3].x) * t1,
                  y: pixelCorners[3].y + (pixelCorners[2].y - pixelCorners[3].y) * t1
                };

                // Tracé de l'armoire
                ctx.beginPath();
                ctx.moveTo(pTop0.x + (pBtm0.x - pTop0.x) * 0.15, pTop0.y + (pBtm0.y - pTop0.y) * 0.15);
                ctx.lineTo(pTop1.x + (pBtm1.x - pTop1.x) * 0.15, pTop1.y + (pBtm1.y - pTop1.y) * 0.15);
                ctx.lineTo(pTop1.x + (pBtm1.x - pTop1.x) * 0.85, pTop1.y + (pBtm1.y - pTop1.y) * 0.85);
                ctx.lineTo(pTop0.x + (pBtm0.x - pTop0.x) * 0.85, pTop0.y + (pBtm0.y - pTop0.y) * 0.85);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fill();
                ctx.strokeStyle = '#7e22ce';
                ctx.lineWidth = 1.2;
                ctx.stroke();
              }
            } else {
              // Faîtage médian en pointillés discrets pour bâtiments et ombrières
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
            }

            // Cotations architecturales du bâtiment / dalle (Longueur et Largeur sur les arêtes)
            const bShowDim = showDimensions !== false;
            if (bShowDim) {
              const centerPt = { x: bPixelX, y: bPixelY };
              drawDimensionLine(ctx, pixelCorners[0], pixelCorners[1], centerPt, `${bLength.toFixed(1)} M`, strokeColor, 20);
              drawDimensionLine(ctx, pixelCorners[1], pixelCorners[2], centerPt, `${bWidth.toFixed(1)} M`, strokeColor, 20);
            }

            ctx.restore();
          });

          // Rendu des tracés de distance personnalisés (côtes DP2 / PC2)
          if (distances && Array.isArray(distances) && distances.length > 0) {
            const nZoom = Math.pow(2, currentZoom);
            distances.forEach(d => {
              if (!d.p1 || !d.p2) return;
              const p1x = ((d.p1[1] + 180) / 360) * nZoom;
              const rad1 = (d.p1[0] * Math.PI) / 180;
              const p1y = ((1 - Math.log(Math.tan(rad1) + 1 / Math.cos(rad1)) / Math.PI) / 2) * nZoom;

              const p2x = ((d.p2[1] + 180) / 360) * nZoom;
              const rad2 = (d.p2[0] * Math.PI) / 180;
              const p2y = ((1 - Math.log(Math.tan(rad2) + 1 / Math.cos(rad2)) / Math.PI) / 2) * nZoom;

              const pt1 = {
                x: centerX + (p1x - exactX) * tileSize,
                y: centerY + (p1y - exactY) * tileSize
              };
              const pt2 = {
                x: centerX + (p2x - exactX) * tileSize,
                y: centerY + (p2y - exactY) * tileSize
              };

              const dx = pt2.x - pt1.x;
              const dy = pt2.y - pt1.y;
              const len = Math.hypot(dx, dy);
              if (len > 0) {
                const nx = -dy / len;
                const ny = dx / len;
                const wLen = 3.5;

                ctx.save();
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.stroke();

                ctx.setLineDash([]);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(pt1.x - nx * wLen, pt1.y - ny * wLen);
                ctx.lineTo(pt1.x + nx * wLen, pt1.y + ny * wLen);
                ctx.moveTo(pt2.x - nx * wLen, pt2.y - ny * wLen);
                ctx.lineTo(pt2.x + nx * wLen, pt2.y + ny * wLen);
                ctx.stroke();

                const midX = (pt1.x + pt2.x) / 2;
                const midY = (pt1.y + pt2.y) / 2;
                const text = `${Number(d.meters).toFixed(1)} m`;
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ffffff';
                ctx.strokeText(text, midX, midY);

                ctx.fillStyle = '#dc2626';
                ctx.fillText(text, midX, midY);
                ctx.restore();
              }
            });
          }

          // Point SDIS si présent
          if (sdisPoint && sdisPoint.lat && sdisPoint.lng) {
            const sdisRad = (Number(sdisPoint.lat) * Math.PI) / 180;
            const sdisExactX = ((Number(sdisPoint.lng) + 180) / 360) * n;
            const sdisExactY = ((1 - Math.log(Math.tan(sdisRad) + 1 / Math.cos(sdisRad)) / Math.PI) / 2) * n;
            const sdisX = centerX + (sdisExactX - exactX) * tileSize;
            const sdisY = centerY + (sdisExactY - exactY) * tileSize;

            ctx.save();
            const badgeW = 76;
            const badgeH = 18;
            const bx = sdisX - badgeW / 2;
            const by = sdisY - 28;

            ctx.fillStyle = '#dc2626';
            ctx.fillRect(sdisX - 1.5, by + badgeH, 3, 10);

            ctx.beginPath();
            ctx.arc(sdisX, sdisY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#dc2626';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.beginPath();
            ctx.roundRect(bx, by, badgeW, badgeH, 4);
            ctx.fillStyle = '#dc2626';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔥 BORNE SDIS', sdisX, by + badgeH / 2);
            ctx.restore();
          }

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
          const isBatterySite = Boolean(options?.isBattery) || Boolean(buildings?.some(b => b.isBattery || b.solutionKey === 'battery'));
          if (isBatterySite) {
            // Repère spécifique BESS haute visibilité bicolore (orange/bleu)
            ctx.save();
            // 1. Halo extérieur
            ctx.beginPath();
            ctx.arc(mx, my, 22, 0, Math.PI * 2);
            ctx.fillStyle = mode === 'satellite' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.25)';
            ctx.fill();

            // 2. Anneau orange vif
            ctx.beginPath();
            ctx.arc(mx, my, 14, 0, Math.PI * 2);
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3.5;
            ctx.stroke();

            // 3. Disque intérieur bleu roi avec contour blanc
            ctx.beginPath();
            ctx.arc(mx, my, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#1d4ed8';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 4. Point blanc central
            ctx.beginPath();
            ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // 5. Badge informatif
            const badgeW = 150;
            const badgeH = 20;
            const bx = mx - badgeW / 2;
            const by = my - 34;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.5;
            if (ctx.roundRect) ctx.roundRect(bx, by, badgeW, badgeH, 4);
            else ctx.rect(bx, by, badgeW, badgeH);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡ CENTRALE BESS 500 kW', mx, by + badgeH / 2);
            ctx.restore();
          } else {
            // Halo standard
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
        }

        // Légende filigrane
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = mode === 'satellite' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
        const legendText = hasBuildings
          ? `PC2 / DP2 — Plan de masse (IGN - Plan IGN Zoom ${currentZoom})`
          : (mode === 'satellite'
            ? 'PC1 / DP1 — Vue Aérienne (IGN / Géoportail Orthophoto)'
            : 'PC1 / DP1 — Plan de Situation (IGN - Plan IGN)');
        ctx.fillText(legendText, 12, height - 12);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          safeResolve(dataUrl);
        } catch (e) {
          console.warn('[AutoMap] Canvas toDataURL failed (CORS):', e);
          safeResolve(null);
        }
      };

      imagesToLoad.forEach((item) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        let triedFallback = false;
        img.onload = () => {
          try {
            const posX = centerX + item.dx * tileSize - offsetX;
            const posY = centerY + item.dy * tileSize - offsetY;
            ctx.drawImage(img, posX, posY, tileSize, tileSize);
          } catch (e) {
            console.warn('[AutoMap] drawImage error:', e);
          }
          loadedCount++;
          if (loadedCount === totalImages) {
            try {
              drawMarkerAndFinish();
            } catch (err) {
              console.warn('[AutoMap] drawMarkerAndFinish error:', err);
              safeResolve(null);
            }
          }
        };
        img.onerror = () => {
          if (!triedFallback) {
            triedFallback = true;
            const fbUrl = getFallbackTileUrl(tileCenter.x + item.dx, tileCenter.y + item.dy, currentZoom);
            img.src = fbUrl;
            return;
          }
          loadedCount++;
          if (loadedCount === totalImages) {
            try {
              drawMarkerAndFinish();
            } catch (err) {
              console.warn('[AutoMap] drawMarkerAndFinish error:', err);
              safeResolve(null);
            }
          }
        };
        img.src = item.url;
      });

      // Secours en cas de timeout réseau (5 secondes max)
      setTimeout(() => {
        if (!isResolved) {
          console.warn(`[AutoMap] Timeout: ${loadedCount}/${totalImages} tiles loaded, finishing map`);
          try {
            drawMarkerAndFinish();
          } catch (e) {
            safeResolve(null);
          }
        }
      }, 5000);

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
        safeResolve(fallbackCanvas.toDataURL('image/jpeg', 0.9));
      } catch (_) {
        safeResolve(null);
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

  const isBattery = Boolean(
    project?.isBattery ||
    project?.isBatteryStandAlone ||
    project?.solutionType === 'battery' ||
    project?.urbanisme_solutionType === 'battery' ||
    project?.installationType === 'Station Batteries Stand-Alone' ||
    (project?.type || '').toLowerCase().includes('batterie')
  );

  // Priorité absolue aux coordonnées exactes de la station BESS
  if (isBattery) {
    const bessLat = Number(project?.bessLatitude || project?.bess_lat || project?.implantation?.lat || project?.dp_config?.implantation?.lat);
    const bessLng = Number(project?.bessLongitude || project?.bess_lng || project?.implantation?.lng || project?.dp_config?.implantation?.lng);
    if (bessLat && bessLng && !isNaN(bessLat) && !isNaN(bessLng)) {
      lat = bessLat;
      lng = bessLng;
    }
  }

  if ((!lat || !lng || (Math.abs(lat - 43.5612) < 0.001 && Math.abs(lng - 0.9168) < 0.001)) && project?.gps) {
    const parts = String(project.gps).split(',').map(v => Number(v.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  // Coordonnées par défaut si non renseignées
  if (!lat || !lng || isNaN(lat) || isNaN(lng) || (Math.abs(lat - 43.5612) < 0.001 && Math.abs(lng - 0.9168) < 0.001)) {
    lat = 43.43571;
    lng = -1.17644;
  }

  const existingCaptures = project?.urbanisme_captures || {};
  const result = { ...existingCaptures };

  // 1. DP1 / PC1 IGN Plan (Zoom 15 pour 1/25000)
  if (!result.ign) {
    const ignData = await generateStaticMapImage(lat, lng, 'map', isBattery ? 15 : 16, null, true, [], null, { isBattery });
    if (ignData) result.ign = ignData;
  }

  // 2. DP1 / PC1 Vue Aérienne Satellite (Zoom 17 pour 1/5000)
  if (!result.satellite) {
    const satData = await generateStaticMapImage(lat, lng, 'satellite', 17, null, true, [], null, { isBattery });
    if (satData) result.satellite = satData;
  }

  // 3. DP2 / PC2 Plan de masse Plan IGN Zoom 19
  if (!result.masse_projet) {
    const buildingsToUse = (project?.buildings && project.buildings.length > 0)
      ? project.buildings
      : (isBattery ? [{
          name: 'Station Batteries Stand-Alone',
          solutionKey: 'battery',
          isBattery: true,
          length: 6.20,
          width: 3.20,
          rotation: Number(project?.dp_config?.implantation?.angle_rotation || project?.implantation?.angle_rotation || 0),
          lat: lat,
          lng: lng
        }] : null);

    const masseData = await generateStaticMapImage(
      lat,
      lng,
      'map',
      19,
      buildingsToUse,
      true,
      project?.masseDistances || [],
      project?.sdisPoint,
      { isBattery }
    );
    if (masseData) result.masse_projet = masseData;
  }

  return result;
}
