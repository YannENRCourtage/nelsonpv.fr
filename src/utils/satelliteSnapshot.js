// ─── Générateur de capture satellite haute résolution pour PDF ───────────────

export const generateSatelliteSnapshot = async ({ center, polygonPoints, width = 800, height = 480, zoom = 19 }) => {
  try {
    const lat = center ? center[0] : 43.6047;
    const lng = center ? center[1] : 1.4442;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Calcul des tuiles pour le centre
    const n = Math.pow(2, zoom);
    const xExact = ((lng + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const centerTileX = Math.floor(xExact);
    const centerTileY = Math.floor(yExact);

    // Calcul de l'offset en pixels par rapport au centre de la tuile centrale
    const pixelOffsetX = (xExact - centerTileX) * 256;
    const pixelOffsetY = (yExact - centerTileY) * 256;

    // Charger les tuiles autour du centre (grille 4x3)
    const tilePromises = [];
    const minTileX = centerTileX - 2;
    const maxTileX = centerTileX + 2;
    const minTileY = centerTileY - 1;
    const maxTileY = centerTileY + 1;

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
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

    // Dessin du polygone vert fluo et des coins 1, 2, 3, 4
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

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('Erreur génération snapshot satellite:', err);
    return null;
  }
};
