// ─── Générateur de capture satellite haute résolution pour PDF ───────────────
import { computeValidSolarSlots } from './solarCalepinage';

export const generateSatelliteSnapshot = async ({
  center,
  polygonPoints,
  building,
  buildings,
  stationMarkers,
  width = 800,
  height = 480,
  zoom = 19
}) => {
  try {
    const safeZoom = Math.min(19, Math.max(14, zoom || 18));
    const lat = center ? center[0] : 43.6047;
    const lng = center ? center[1] : 1.4442;

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

    // Charger les tuiles autour du centre (grille 5x3)
    const tilePromises = [];
    const minTileX = centerTileX - 2;
    const maxTileX = centerTileX + 2;
    const minTileY = centerTileY - 1;
    const maxTileY = centerTileY + 1;

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

    // 3. Dessin du polygone vert fluo et des coins 1, 2, 3, 4 (Toiture standard)
    if (polygonPoints && polygonPoints.length >= 3) {
      const canvasPts = polygonPoints.map(p => latLngToCanvasPoint(p.lat, p.lng));

      // Remplissage vert
      ctx.beginPath();
      ctx.moveTo(canvasPts[0].x, canvasPts[0].y);
      for (let i = 1; i < canvasPts.length; i++) {
        ctx.lineTo(canvasPts[i].x, canvasPts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 184, 117, 0.40)';
      ctx.fill();

      // Contour vert fluo
      ctx.strokeStyle = '#00e699';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(0, 230, 153, 0.8)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Dessin des 4 coins numérotés
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

// ─── Générateur de capture AVANT / APRÈS CÔTE À CÔTE pour PDF ─────────────────
export const generateBeforeAfterDualSnapshot = async ({
  center,
  polygonPoints,
  customKwc = 6,
  roofSurface = 83,
  ridgeIndex = 0,
  isLandscape = false,
  width = 900,
  height = 420,
  zoom = 19
}) => {
  try {
    let lat = center ? center[0] : 43.6047;
    let lng = center ? center[1] : 1.4442;
    if (polygonPoints && polygonPoints.length >= 3) {
      let sumLat = 0, sumLng = 0;
      polygonPoints.forEach(p => { sumLat += p.lat; sumLng += p.lng; });
      lat = sumLat / polygonPoints.length;
      lng = sumLng / polygonPoints.length;
    }

    const halfW = (width - 6) / 2;

    // Calcul automatique du niveau de zoom pour que la toiture entière tienne parfaitement dans la vue
    let computedZoom = zoom || 19;
    if (polygonPoints && polygonPoints.length >= 3) {
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      polygonPoints.forEach(p => {
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
      });
      
      const latSpanM = (maxLat - minLat) * 111320;
      const lngSpanM = (maxLng - minLng) * 111320 * Math.cos((lat * Math.PI) / 180);
      const maxSpanM = Math.max(latSpanM, lngSpanM, 15);

      const targetPx = Math.min(halfW * 0.70, height * 0.70);
      const cosLat = Math.cos((lat * Math.PI) / 180);
      const calculatedZ = Math.log2((targetPx * 156543 * cosLat) / maxSpanM);
      computedZoom = Math.min(19, Math.max(14, Math.floor(calculatedZ)));
    }
    const safeZoom = computedZoom;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fond sombre
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Calcul des tuiles pour le centre
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

    // 1. Dessin des 2 moitiés satellites
    drawSatelliteHalf(0);
    drawSatelliteHalf(halfW + 6);

    // Ligne de séparation centrale
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(halfW, 0, 6, height);

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

    // 2. Dessin du Polygone Délimité & des Panneaux
    if (polygonPoints && polygonPoints.length >= 3) {
      // ─── MOITIÉ GAUCHE (AVANT : TOITURE BRUTE AVEC CADRE POINTILLÉ BLANC) ───
      const ptsLeft = polygonPoints.map(p => getCanvasPoint(p.lat, p.lng, 0));
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

      // ─── MOITIÉ DROITE (APRÈS : PANNEAUX SOLAIRES EN PORTRAIT STRICTEMENT DANS LA ZONE) ───
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

      // Calcul des emplacements géométriquement valides (Ligne par ligne le long de la sablière)
      const { slots, maxPanels } = computeValidSolarSlots(polygonPoints, ridgeIndex, isLandscape);
      const targetPanels = Math.max(1, Math.round((customKwc * 1000) / 465));
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

        // Panneau Solaire Réaliste (Bleu Nuit Sombre #0c192c / #0a192f + bordure bleu sombre)
        ctx.fillStyle = '#0c192c';
        ctx.fill();
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ─── BADGES EN HAUT DE CHAQUE MOITIÉ ───
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

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('Erreur génération dual snapshot avant-après:', err);
    return null;
  }
};
