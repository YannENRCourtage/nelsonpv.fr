// ─── Générateur de capture satellite haute résolution pour PDF ───────────────

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

        // Emprise au sol du bâtiment
        ctx.fillStyle = 'rgba(37, 99, 235, 0.45)';
        ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

        // Ligne de Faîtage en pointillés orange
        const isAsym = (b.buildingType || '').startsWith('asym') || b.buildingType === 'epona';
        const ridgeY = isAsym ? (-rectH / 2 + rectH * 0.32) : 0;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.moveTo(-rectW / 2, ridgeY);
        ctx.lineTo(rectW / 2, ridgeY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rond numéroté ①, ②, etc. au centre du bâtiment
        const circleR = 13;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(bIdx + 1), 0, 0);

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

    // 4. Trait d'échelle (Scale Bar) en bas à gauche
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

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('Erreur génération snapshot satellite:', err);
    return null;
  }
};
