// ─── Générateur de capture satellite haute résolution pour PDF ───────────────
import { computeValidSolarSlots } from './solarCalepinage';

/**
 * Calcul dynamique de l'emprise (fitBounds) et du niveau de zoom Web Mercator optimal
 * pour cadrer 100% d'un polygone ou d'un ensemble de points avec marge de sécurité.
 */
export const calculateFitBounds = ({
  points = [],
  width = 800,
  height = 480,
  paddingFactor = 0.16,
  minZoom = 14,
  maxZoom = 19
}) => {
  if (!points || points.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p && !isNaN(p.lat) && !isNaN(p.lng)) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
  }

  if (minLat === Infinity || !isFinite(minLat)) return null;

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Emprise cible avec padding proportionnel pour ne pas couper les bordures
  const targetW = width * (1 - 2 * paddingFactor);
  const targetH = height * (1 - 2 * paddingFactor);

  // Zoom selon longitude
  const deltaLng = Math.max(0.00005, maxLng - minLng);
  const zLng = Math.log2((targetW * 360) / (256 * deltaLng));

  // Zoom selon latitude (projection sphérique Web Mercator)
  const latRadMin = (minLat * Math.PI) / 180;
  const latRadMax = (maxLat * Math.PI) / 180;
  const yNormMin = (1 - Math.log(Math.tan(Math.PI / 4 + latRadMax / 2)) / Math.PI) / 2;
  const yNormMax = (1 - Math.log(Math.tan(Math.PI / 4 + latRadMin / 2)) / Math.PI) / 2;
  const deltaYNorm = Math.max(0.000001, Math.abs(yNormMax - yNormMin));
  const zLat = Math.log2(targetH / (256 * deltaYNorm));

  const optimalZoom = Math.min(zLng, zLat);
  const safeZoom = Math.min(maxZoom, Math.max(minZoom, Math.floor(optimalZoom)));

  return {
    center: [centerLat, centerLng],
    zoom: safeZoom,
    bounds: { minLat, maxLat, minLng, maxLng }
  };
};

export const generateSatelliteSnapshot = async ({
  center,
  polygonPoints,
  polygonStyle = 'roof',
  ombriereBlocks = null,
  building,
  buildings,
  stationMarkers,
  width = 800,
  height = 480,
  zoom = 19,
  fitBounds = true
}) => {
  try {
    // Calcul dynamique de l'emprise totale si des points géométriques sont fournis
    let actualCenter = center;
    let actualZoom = zoom;

    if (fitBounds) {
      const allGeoPoints = [];
      if (polygonPoints && Array.isArray(polygonPoints)) {
        polygonPoints.forEach(p => {
          if (p && p.lat !== undefined && p.lng !== undefined) allGeoPoints.push(p);
        });
      }
      if (ombriereBlocks && Array.isArray(ombriereBlocks)) {
        ombriereBlocks.forEach(b => {
          if (b && b.polygonWgs84 && Array.isArray(b.polygonWgs84)) {
            b.polygonWgs84.forEach(p => allGeoPoints.push(p));
          }
        });
      }
      if (stationMarkers && Array.isArray(stationMarkers)) {
        stationMarkers.forEach(m => {
          if (m && m.lat !== undefined && m.lng !== undefined) allGeoPoints.push(m);
        });
      }

      const fitRes = calculateFitBounds({
        points: allGeoPoints,
        width,
        height,
        paddingFactor: (polygonStyle === 'parking' || (ombriereBlocks && ombriereBlocks.length > 0)) ? 0.16 : 0.12,
        minZoom: 14,
        maxZoom: 19
      });

      if (fitRes) {
        actualCenter = fitRes.center;
        actualZoom = fitRes.zoom;
      }
    }

    const safeZoom = Math.min(19, Math.max(14, actualZoom || 18));
    const lat = actualCenter ? actualCenter[0] : (center ? center[0] : 43.6047);
    const lng = actualCenter ? actualCenter[1] : (center ? center[1] : 1.4442);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Calcul des tuiles pour le centre
    const n = Math.pow(2, safeZoom);
    const xExact = ((lng + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const centerTileX = Math.floor(xExact);
    const centerTileY = Math.floor(yExact);

    // Calcul de l'offset en pixels par rapport au centre de la tuile centrale
    const pixelOffsetX = (xExact - centerTileX) * 256;
    const pixelOffsetY = (yExact - centerTileY) * 256;

    // Charger les tuiles autour du centre pour couvrir 100% de la largeur et hauteur
    const tilePromises = [];
    const radiusX = Math.ceil((width / 2) / 256) + 1;
    const radiusY = Math.ceil((height / 2) / 256) + 1;
    const minTileX = centerTileX - radiusX;
    const maxTileX = centerTileX + radiusX;
    const minTileY = centerTileY - radiusY;
    const maxTileY = centerTileY + radiusY;

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${safeZoom}/${ty}/${tx}`;
        const p = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve({ img, tx, ty, success: true });
          img.onerror = () => resolve({ success: false });
          img.src = url;
        });
        tilePromises.push(p);
      }
    }

    const loadedTiles = await Promise.all(tilePromises);

    // Dessin du fond de carte satellite
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    loadedTiles.forEach(({ img, tx, ty, success }) => {
      if (success && img) {
        const dx = canvasCenterX - pixelOffsetX + (tx - centerTileX) * 256;
        const dy = canvasCenterY - pixelOffsetY + (ty - centerTileY) * 256;
        ctx.drawImage(img, dx, dy, 256, 256);
      }
    });

    // Helper de conversion Lat/Lng -> Coordonnées Canvas
    const latLngToCanvasPoint = (ptLat, ptLng) => {
      const pX = ((ptLng + 180) / 360) * n;
      const pLatRad = (ptLat * Math.PI) / 180;
      const pY = ((1 - Math.log(Math.tan(pLatRad) + 1 / Math.cos(pLatRad)) / Math.PI) / 2) * n;

      const screenX = canvasCenterX + (pX - xExact) * 256;
      const screenY = canvasCenterY + (pY - yExact) * 256;
      return { x: screenX, y: screenY };
    };

    // 1. Dessin de l'implantation du/des Bâtiments (Structure Métallique / Hangar)
    const buildingList = Array.isArray(buildings) && buildings.length > 0
      ? buildings
      : (building && building.length && building.width ? [building] : []);

    if (buildingList.length > 0) {
      const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, safeZoom + 8);
      const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 4.6;

      buildingList.forEach((b, bIdx) => {
        const bLength = Number(b.length || 30);
        const bWidth = Number(b.width || 20);
        const rectW = Math.max(30, bLength * pxPerMeter);
        const rectH = Math.max(20, bWidth * pxPerMeter);
        const rotRad = ((Number(b.rotation) || 0) * Math.PI) / 180;

        let posX = canvasCenterX;
        let posY = canvasCenterY;

        if (b.lat && b.lng && !isNaN(b.lat) && !isNaN(b.lng)) {
          const pt = latLngToCanvasPoint(b.lat, b.lng);
          posX = pt.x;
          posY = pt.y;
        } else if (b.offsetX !== undefined || b.offsetY !== undefined) {
          posX = canvasCenterX + Number(b.offsetX || 0);
          posY = canvasCenterY + Number(b.offsetY || 0);
        } else if (buildingList.length > 1) {
          posX = canvasCenterX + (bIdx * (rectW + 40) - ((buildingList.length - 1) * (rectW + 40) / 2));
        }

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(rotRad);

        // Emprise au sol du bâtiment avec bordure orange fidèle à l'interface
        ctx.fillStyle = 'rgba(37, 99, 235, 0.45)';
        ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

        // Ligne de Faîtage en pointillés orange (3/4 côté Sud pour asymétrique et séchoir BatiTech)
        const isAsym = (b.buildingType || '').startsWith('asym') || b.buildingType === 'epona' || (b.name || '').toLowerCase().includes('séchoir') || (b.name || '').toLowerCase().includes('batitech');
        const ridgeY = isAsym ? (-rectH / 2 + rectH * 0.25) : 0;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.moveTo(-rectW / 2, ridgeY);
        ctx.lineTo(rectW / 2, ridgeY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rond numéroté ①, ②, etc. au centre du bâtiment
        const circleR = 14;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(bIdx + 1), 0, 1);

        ctx.restore();
      });
    }

    // 2. Dessin des Bornes IRVE sur le parking
    if (stationMarkers && stationMarkers.length > 0) {
      stationMarkers.forEach((m, idx) => {
        const pt = latLngToCanvasPoint(m.lat, m.lng);
        const pinSize = 30;

        ctx.save();
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.roundRect(pt.x - pinSize / 2, pt.y - pinSize / 2, pinSize, pinSize, 6);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⚡${idx + 1}`, pt.x, pt.y);
        ctx.restore();
      });
    }

    // 3. Dessin du polygone (Toiture ou Emprise de Parking)
    if (polygonPoints && polygonPoints.length >= 3) {
      const canvasPts = polygonPoints.map(p => latLngToCanvasPoint(p.lat, p.lng));
      const isParkingLot = polygonStyle === 'parking' || (ombriereBlocks && ombriereBlocks.length > 0);

      // Remplissage
      ctx.beginPath();
      ctx.moveTo(canvasPts[0].x, canvasPts[0].y);
      for (let i = 1; i < canvasPts.length; i++) {
        ctx.lineTo(canvasPts[i].x, canvasPts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = isParkingLot ? 'rgba(14, 165, 233, 0.18)' : 'rgba(0, 184, 117, 0.40)';
      ctx.fill();

      // Contour
      ctx.strokeStyle = isParkingLot ? '#38bdf8' : '#00e699';
      ctx.lineWidth = isParkingLot ? 3 : 4;
      if (isParkingLot) {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.shadowColor = 'rgba(0, 230, 153, 0.8)';
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0; // reset

      // Dessin des 4 coins numérotés (si toiture standard)
      if (!isParkingLot) {
        canvasPts.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, 2 * Math.PI);
          ctx.fillStyle = '#00b875';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${idx + 1}`, pt.x, pt.y + 1);
        });
      }
    }

    // 3. bis. Dessin des blocs d'Ombrières Photovoltaïques sur le parking
    if (ombriereBlocks && ombriereBlocks.length > 0) {
      ombriereBlocks.forEach((block, bIdx) => {
        if (!block.polygonWgs84 || block.polygonWgs84.length < 3) return;
        const bCanvasPts = block.polygonWgs84.map(p => latLngToCanvasPoint(p.lat, p.lng));

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bCanvasPts[0].x, bCanvasPts[0].y);
        for (let i = 1; i < bCanvasPts.length; i++) {
          ctx.lineTo(bCanvasPts[i].x, bCanvasPts[i].y);
        }
        ctx.closePath();

        // Remplissage bleu solaire semi-transparent
        ctx.fillStyle = 'rgba(30, 64, 175, 0.75)';
        ctx.fill();

        // Bordure dorée / ambre vive
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Ligne médiane ou détails de travées
        if (bCanvasPts.length === 4) {
          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1.2;
          const mid1X = (bCanvasPts[0].x + bCanvasPts[1].x) / 2;
          const mid1Y = (bCanvasPts[0].y + bCanvasPts[1].y) / 2;
          const mid2X = (bCanvasPts[3].x + bCanvasPts[2].x) / 2;
          const mid2Y = (bCanvasPts[3].y + bCanvasPts[2].y) / 2;
          ctx.moveTo(mid1X, mid1Y);
          ctx.lineTo(mid2X, mid2Y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Label du bloc au centre
        if (block.center) {
          const cPt = latLngToCanvasPoint(block.center.lat, block.center.lng);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9.5px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`⚡ ${block.spotsCount || block.bayCount * 2} pl.`, cPt.x, cPt.y);
        }
        ctx.restore();
      });
    }

    // 4. Trait d'échelle (Scale Bar) uniquement si pas de bâtiment (pour préserver le visuel épuré de l'implantation)
    if (!buildingList || buildingList.length === 0) {
      const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      const targetScaleMeters = zoom >= 20 ? 10 : zoom >= 19 ? 20 : zoom >= 18 ? 50 : 100;
      const scaleBarPx = targetScaleMeters / metersPerPx;

      const sbX = 20;
      const sbY = height - 22;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(sbX - 6, sbY - 18, Math.max(60, scaleBarPx + 12), 26, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${targetScaleMeters} m`, sbX + scaleBarPx / 2, sbY - 14);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sbX, sbY);
      ctx.lineTo(sbX, sbY + 5);
      ctx.lineTo(sbX + scaleBarPx, sbY + 5);
      ctx.lineTo(sbX + scaleBarPx, sbY);
      ctx.stroke();
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('Erreur génération snapshot satellite:', err);
    return null;
  }
};

// ─── Analyse spectrale pour détecter des panneaux solaires déjà installés ─────
export function detectExistingSolarPanelsOnRoof(ctx, pts) {
  if (!pts || pts.length < 3) return false;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(ctx.canvas.width, Math.ceil(maxX));
  maxY = Math.min(ctx.canvas.height, Math.ceil(maxY));

  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 8 || h <= 8) return false;

  // Test géométrique d'inclusion du point dans le polygone
  function isInside(x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  try {
    const imgData = ctx.getImageData(minX, minY, w, h);
    const data = imgData.data;

    let totalInsidePixels = 0;
    let solarPixels = 0;

    for (let py = 0; py < h; py += 2) {
      for (let px = 0; px < w; px += 2) {
        const cx = minX + px;
        const cy = minY + py;
        if (isInside(cx, cy)) {
          totalInsidePixels++;
          const idx = (py * w + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Profil spectral d'un panneau solaire sur image satellite (bleu sombre / noir)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const isSolar = (lum < 75 && b >= r - 6 && b >= g - 6) || (lum < 95 && b > r + 8 && b > g);
          if (isSolar) {
            solarPixels++;
          }
        }
      }
    }

    if (totalInsidePixels >= 50) {
      const solarRatio = solarPixels / totalInsidePixels;
      return solarRatio >= 0.08;
    }
  } catch (err) {
    console.warn('Erreur analyse spectrale toiture existante:', err);
  }
  return false;
}

// ─── Générateur de capture AVANT / APRÈS CÔTE À CÔTE pour PDF ─────────────────

export const generateBeforeAfterDualSnapshot = async ({
  center,
  polygonPoints,
  polygonStyle = 'roof',
  ombriereBlocks = null,
  buildings = null,
  building = null,
  customKwc = 6,
  roofSurface = 83,
  parkingArea = null,
  spotsCount = null,
  panelCount: propPanelCount = null,
  ridgeIndex = 0,
  isLandscape = false,
  width = 950,
  height = 480,
  zoom = 19,
  returnDetails = false
}) => {
  try {
    const halfW = Math.floor((width - 6) / 2);
    let lat = center ? center[0] : 43.6047;
    let lng = center ? center[1] : 1.4442;

    const isParking = polygonStyle === 'parking' || (ombriereBlocks && ombriereBlocks.length > 0);
    const isStructMode = Boolean((buildings && buildings.length > 0) || building);

    // Rassemblement de tous les points géométriques pour le calcul d'emprise (fitBounds)
    const allGeoPoints = [];
    if (polygonPoints && Array.isArray(polygonPoints)) {
      polygonPoints.forEach(p => {
        if (p && !isNaN(p.lat) && !isNaN(p.lng)) allGeoPoints.push(p);
      });
    }
    if (ombriereBlocks && Array.isArray(ombriereBlocks)) {
      ombriereBlocks.forEach(b => {
        if (b && b.polygonWgs84 && Array.isArray(b.polygonWgs84)) {
          b.polygonWgs84.forEach(p => {
            if (p && !isNaN(p.lat) && !isNaN(p.lng)) allGeoPoints.push(p);
          });
        }
      });
    }

    // Si bâtiments et aucun polygone WGS84, extrapolation de l'emprise des bâtiments autour du centre
    if (allGeoPoints.length === 0 && isStructMode) {
      const bList = buildings || [building];
      let maxDistMeters = 30;
      bList.forEach(b => {
        const l = Number(b.length || 30);
        const w = Number(b.width || 20);
        const diag = Math.sqrt(l * l + w * w);
        maxDistMeters = Math.max(maxDistMeters, diag);
      });
      const deltaLat = (maxDistMeters * 1.5) / 111320;
      const deltaLng = (maxDistMeters * 1.5) / (111320 * Math.cos((lat * Math.PI) / 180));
      allGeoPoints.push({ lat: lat - deltaLat, lng: lng - deltaLng });
      allGeoPoints.push({ lat: lat + deltaLat, lng: lng + deltaLng });
    }

    // Calcul optimal du zoom et du centre pour la demi-largeur (exactement identique pour Avant et Après)
    let safeZoom = zoom || 19;
    if (allGeoPoints.length > 0) {
      const fitRes = calculateFitBounds({
        points: allGeoPoints,
        width: halfW,
        height,
        paddingFactor: isParking ? 0.18 : 0.14,
        minZoom: 14,
        maxZoom: 19
      });
      if (fitRes) {
        lat = fitRes.center[0];
        lng = fitRes.center[1];
        safeZoom = fitRes.zoom;
      }
    } else if (polygonPoints && polygonPoints.length >= 3) {
      let sumLat = 0, sumLng = 0;
      polygonPoints.forEach(p => { sumLat += p.lat; sumLng += p.lng; });
      lat = sumLat / polygonPoints.length;
      lng = sumLng / polygonPoints.length;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fond sombre
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Calcul des tuiles pour le centre commun
    const n = Math.pow(2, safeZoom);
    const xExact = ((lng + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const centerTileX = Math.floor(xExact);
    const centerTileY = Math.floor(yExact);

    const pixelOffsetX = (xExact - centerTileX) * 256;
    const pixelOffsetY = (yExact - centerTileY) * 256;

    const tilePromises = [];
    const minTileX = centerTileX - 3;
    const maxTileX = centerTileX + 3;
    const minTileY = centerTileY - 2;
    const maxTileY = centerTileY + 2;

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${safeZoom}/${ty}/${tx}`;
        const p = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve({ img, tx, ty, success: true });
          img.onerror = () => resolve({ success: false });
          img.src = url;
        });
        tilePromises.push(p);
      }
    }

    const loadedTiles = await Promise.all(tilePromises);

    // Helper pour dessiner le fond satellite sur une moitié (gauche ou droite)
    const drawSatelliteHalf = (offsetX) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(offsetX, 0, halfW, height);
      ctx.clip();

      const canvasCenterX = offsetX + halfW / 2;
      const canvasCenterY = height / 2;

      loadedTiles.forEach(({ img, tx, ty, success }) => {
        if (success && img) {
          const tilePosX = canvasCenterX + (tx - centerTileX) * 256 - pixelOffsetX;
          const tilePosY = canvasCenterY + (ty - centerTileY) * 256 - pixelOffsetY;
          ctx.drawImage(img, tilePosX, tilePosY, 256, 256);
        }
      });
      ctx.restore();
    };

    // 1. Dessin des 2 moitiés satellites avec exactement les mêmes tuiles et coordonnées
    drawSatelliteHalf(0);
    drawSatelliteHalf(halfW + 6);

    // Ligne de séparation centrale verticale
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(halfW, 0, 6, height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW + 3, 0);
    ctx.lineTo(halfW + 3, height);
    ctx.stroke();

    // Helper conversion pour une moitié donnée
    const getCanvasPoint = (ptLat, ptLng, offsetX) => {
      const canvasCenterX = offsetX + halfW / 2;
      const canvasCenterY = height / 2;
      const pX = ((ptLng + 180) / 360) * n;
      const pLatRad = (ptLat * Math.PI) / 180;
      const pY = ((1 - Math.log(Math.tan(pLatRad) + 1 / Math.cos(pLatRad)) / Math.PI) / 2) * n;
      return {
        x: canvasCenterX + (pX - xExact) * 256,
        y: canvasCenterY + (pY - yExact) * 256
      };
    };

    let placedCount = 0;
    let hasExistingSolar = false;

    // ─── CAS 1 : OMBRIÈRES DE PARKING ─────────────────────────────────────────
    if (isParking) {
      // GAUCHE (AVANT : PARKING NU SANS OMBRIÈRES AVEC DÉLIMITATION BLEUE DISCRÈTE)
      if (polygonPoints && polygonPoints.length >= 3) {
        const ptsLeft = polygonPoints.map(p => getCanvasPoint(p.lat, p.lng, 0));
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, halfW, height);
        ctx.clip();

        ctx.beginPath();
        ctx.moveTo(ptsLeft[0].x, ptsLeft[0].y);
        for (let i = 1; i < ptsLeft.length; i++) ctx.lineTo(ptsLeft[i].x, ptsLeft[i].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.restore();

        // DROITE (APRÈS : PARKING AVEC LES BLOCS D'OMBRIÈRES BLEUS ET BORDURE AMBRE)
        const ptsRight = polygonPoints.map(p => getCanvasPoint(p.lat, p.lng, halfW + 6));
        ctx.save();
        ctx.beginPath();
        ctx.rect(halfW + 6, 0, halfW, height);
        ctx.clip();

        // Emprise du parking
        ctx.beginPath();
        ctx.moveTo(ptsRight[0].x, ptsRight[0].y);
        for (let i = 1; i < ptsRight.length; i++) ctx.lineTo(ptsRight[i].x, ptsRight[i].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.10)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessin des rangées d'ombrières photovoltaïques
        if (ombriereBlocks && ombriereBlocks.length > 0) {
          ombriereBlocks.forEach(block => {
            if (!block.polygonWgs84 || block.polygonWgs84.length < 3) return;
            const bCanvasPts = block.polygonWgs84.map(p => getCanvasPoint(p.lat, p.lng, halfW + 6));

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(bCanvasPts[0].x, bCanvasPts[0].y);
            for (let i = 1; i < bCanvasPts.length; i++) ctx.lineTo(bCanvasPts[i].x, bCanvasPts[i].y);
            ctx.closePath();

            // Remplissage bleu photovoltaïque anti-reflet
            ctx.fillStyle = 'rgba(30, 64, 175, 0.88)';
            ctx.fill();

            // Bordure dorée / ambre vive
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Ligne médiane de faîtage ou travées
            if (bCanvasPts.length === 4) {
              ctx.beginPath();
              ctx.setLineDash([4, 3]);
              ctx.strokeStyle = '#93c5fd';
              ctx.lineWidth = 1.2;
              const mid1X = (bCanvasPts[0].x + bCanvasPts[1].x) / 2;
              const mid1Y = (bCanvasPts[0].y + bCanvasPts[1].y) / 2;
              const mid2X = (bCanvasPts[3].x + bCanvasPts[2].x) / 2;
              const mid2Y = (bCanvasPts[3].y + bCanvasPts[2].y) / 2;
              ctx.moveTo(mid1X, mid1Y);
              ctx.lineTo(mid2X, mid2Y);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // Label du bloc
            if (block.center) {
              const cPt = getCanvasPoint(block.center.lat, block.center.lng, halfW + 6);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9.5px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`⚡ ${block.spotsCount || block.bayCount * 2} pl.`, cPt.x, cPt.y);
            }
            ctx.restore();
          });
        }
        ctx.restore();
      }

      // BADGES OMBRIÈRES
      const displaySpots = spotsCount || (ombriereBlocks ? ombriereBlocks.reduce((acc, b) => acc + (b.spotsCount || b.bayCount * 2 || 0), 0) : 0);
      const displayArea = parkingArea || roofSurface || 0;

      // Badge Gauche (AVANT)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(14, 14, 250, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`AVANT : Parking d'origine (${displayArea.toLocaleString('fr-FR')} m²)`, 24, 32);

      // Badge Droit (APRÈS)
      ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
      ctx.beginPath();
      ctx.roundRect(halfW + 20, 14, 280, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`APRÈS : ${customKwc} kWc (${displaySpots} places abritées)`, halfW + 30, 32);

    // ─── CAS 2 : STRUCTURE MÉTALLIQUE / HANGARS ──────────────────────────────
    } else if (isStructMode) {
      const buildingList = buildings || (building ? [building] : []);
      const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, safeZoom + 8);
      const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 4.6;

      // DROITE (APRÈS : IMPLANTATION DES BÂTIMENTS)
      ctx.save();
      ctx.beginPath();
      ctx.rect(halfW + 6, 0, halfW, height);
      ctx.clip();

      const canvasCenterXRight = halfW + 6 + halfW / 2;
      const canvasCenterYRight = height / 2;

      buildingList.forEach((b, bIdx) => {
        const bLength = Number(b.length || 30);
        const bWidth = Number(b.width || 20);
        const rectW = Math.max(30, bLength * pxPerMeter);
        const rectH = Math.max(20, bWidth * pxPerMeter);
        const rotRad = ((Number(b.rotation) || 0) * Math.PI) / 180;

        let posX = canvasCenterXRight;
        let posY = canvasCenterYRight;

        if (b.lat && b.lng && !isNaN(b.lat) && !isNaN(b.lng)) {
          const pt = getCanvasPoint(b.lat, b.lng, halfW + 6);
          posX = pt.x;
          posY = pt.y;
        } else if (b.offsetX !== undefined || b.offsetY !== undefined) {
          posX = canvasCenterXRight + Number(b.offsetX || 0);
          posY = canvasCenterYRight + Number(b.offsetY || 0);
        } else if (buildingList.length > 1) {
          posX = canvasCenterXRight + (bIdx * (rectW + 40) - ((buildingList.length - 1) * (rectW + 40) / 2));
        }

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(rotRad);

        // Emprise au sol avec bordure orange fidèle à Nelson
        ctx.fillStyle = 'rgba(37, 99, 235, 0.45)';
        ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

        // Faîtage en pointillés
        const isAsym = (b.buildingType || '').startsWith('asym') || b.buildingType === 'epona';
        const ridgeY = isAsym ? (-rectH / 2 + rectH * 0.25) : 0;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.moveTo(-rectW / 2, ridgeY);
        ctx.lineTo(rectW / 2, ridgeY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pastille numérotée
        const circleR = 14;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(bIdx + 1), 0, 1);

        ctx.restore();
      });
      ctx.restore();

      // BADGES STRUCTURE
      // Badge Gauche (AVANT)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(14, 14, 250, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`AVANT : Terrain d'accueil (${roofSurface || 0} m²)`, 24, 32);

      // Badge Droit (APRÈS)
      ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
      ctx.beginPath();
      ctx.roundRect(halfW + 20, 14, 280, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`APRÈS : ${customKwc} kWc (${buildingList.length > 1 ? `${buildingList.length} Bâtiments` : `${roofSurface || 0} m²`})`, halfW + 30, 32);

    // ─── CAS 3 : TOITURE SOLAIRE STANDARD (AUTOCONSO & VENTE) ────────────────
    } else if (polygonPoints && polygonPoints.length >= 3) {
      // Détection spectrale des panneaux solaires existants sur la toiture brute
      const ptsLeft = polygonPoints.map(p => getCanvasPoint(p.lat, p.lng, 0));
      hasExistingSolar = detectExistingSolarPanelsOnRoof(ctx, ptsLeft);

      // GAUCHE (AVANT : TOITURE BRUTE AVEC CADRE POINTILLÉ BLANC)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, halfW, height);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(ptsLeft[0].x, ptsLeft[0].y);
      for (let i = 1; i < ptsLeft.length; i++) ctx.lineTo(ptsLeft[i].x, ptsLeft[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.restore();

      // DROITE (APRÈS : PANNEAUX SOLAIRES EN PORTRAIT DANS LA ZONE)
      const ptsRight = polygonPoints.map(p => getCanvasPoint(p.lat, p.lng, halfW + 6));
      ctx.save();
      ctx.beginPath();
      ctx.rect(halfW + 6, 0, halfW, height);
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(ptsRight[0].x, ptsRight[0].y);
      for (let i = 1; i < ptsRight.length; i++) ctx.lineTo(ptsRight[i].x, ptsRight[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(10, 25, 47, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const { slots, maxPanels } = computeValidSolarSlots(polygonPoints, ridgeIndex, isLandscape);
      const targetPanels = propPanelCount || Math.max(1, Math.round((customKwc * 1000) / 465));
      const countToPlace = Math.min(targetPanels, maxPanels);
      placedCount = countToPlace;

      for (let i = 0; i < countToPlace; i++) {
        const slot = slots[i];
        if (!slot) break;

        const corners = slot.corners.map(c => getCanvasPoint(c.lat, c.lng, halfW + 6));

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let k = 1; k < corners.length; k++) ctx.lineTo(corners[k].x, corners[k].y);
        ctx.closePath();

        ctx.fillStyle = '#0c192c';
        ctx.fill();
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // BADGES TOITURE
      const panelCount = placedCount || Math.max(1, Math.round((customKwc * 1000) / 465));

      // Badge Gauche (AVANT)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(14, 14, 230, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`AVANT : Toiture d'origine (${roofSurface} m²)`, 24, 32);

      // Badge Droit (APRÈS)
      ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
      ctx.beginPath();
      ctx.roundRect(halfW + 20, 14, 260, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`APRÈS : ${customKwc} kWc (${panelCount} panneaux)`, halfW + 30, 32);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (returnDetails) {
      return {
        dataUrl,
        hasExistingSolar,
        placedCount
      };
    }
    return dataUrl;
  } catch (err) {
    console.warn('Erreur génération dual snapshot avant-après:', err);
    return null;
  }
};
