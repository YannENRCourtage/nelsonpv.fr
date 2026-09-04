/**
 * mapCotations.js — Fonctions de dessin architectural des cotations 3D pour plans de masse DP2 / PC2
 * Conforme à l'Article R. 431-36 b) (DP) et Article R. 431-9 (PC) du Code de l'Urbanisme :
 * - Dimension 1 : Longueur (L) cotée sur les arêtes
 * - Dimension 2 : Largeur (l) cotée sur les arêtes
 * - Dimension 3 : Hauteur (H) faîtage et égout / sablière + niveau altimétrique Terrain Naturel (TN = 0.00 m)
 * - Implantation : Cotation de recul / distance aux limites parcellaires et voirie
 * - Orientation : Flèche Nord officielle (N ↑)
 */

export function getStructureHeights(str, project = null) {
  const isOmb = str?.solutionKey === 'ombriere' ||
    (str?.buildingType || '').toLowerCase().includes('ombriere') ||
    (str?.name || '').toLowerCase().includes('ombrière');

  const width = Number(str?.width || project?.largeur || 20);
  const pitch = Number(str?.pitch || str?.pente || project?.pente || (isOmb ? 10 : 15));

  let eaveHeight = Number(str?.eaveHeight || str?.hauteur_egout || project?.hauteur_egout || project?.eaveHeight || (isOmb ? 3.80 : 4.50));
  if (eaveHeight < 2.5) eaveHeight = isOmb ? 3.80 : 4.50;

  let ridgeHeight = Number(str?.ridgeHeight || str?.hauteur_faitage || project?.hauteur_faitage || project?.ridgeHeight || 0);
  if (!ridgeHeight || ridgeHeight <= eaveHeight) {
    ridgeHeight = eaveHeight + (width / 2) * Math.tan((pitch * Math.PI) / 180);
  }

  return {
    eaveHeight: Number(eaveHeight.toFixed(2)),
    ridgeHeight: Number(ridgeHeight.toFixed(2)),
    pitch,
    isOmb
  };
}

export function drawDimensionLine(ctx, ptA, ptB, centerPt, label, color = '#1e3a8a', offset = 22) {
  if (!ptA || !ptB || !centerPt) return;
  const dx = ptB.x - ptA.x;
  const dy = ptB.y - ptA.y;
  const len = Math.hypot(dx, dy);
  if (len < 5) return;

  const midX = (ptA.x + ptB.x) / 2;
  const midY = (ptA.y + ptB.y) / 2;

  const ux = dx / len;
  const uy = dy / len;

  let nx = -uy;
  let ny = ux;
  const toCenter = { x: centerPt.x - midX, y: centerPt.y - midY };
  if (nx * toCenter.x + ny * toCenter.y > 0) {
    nx = -nx;
    ny = -ny;
  }

  const d0 = { x: ptA.x + nx * offset, y: ptA.y + ny * offset };
  const d1 = { x: ptB.x + nx * offset, y: ptB.y + ny * offset };

  ctx.save();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ptA.x + nx * 3, ptA.y + ny * 3);
  ctx.lineTo(d0.x + nx * 4, d0.y + ny * 4);
  ctx.moveTo(ptB.x + nx * 3, ptB.y + ny * 3);
  ctx.lineTo(d1.x + nx * 4, d1.y + ny * 4);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.stroke();

  const slashLen = 5.5;
  const slashX = (ux + nx) * (slashLen / 1.414);
  const slashY = (uy + ny) * (slashLen / 1.414);

  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(d0.x - slashX, d0.y - slashY);
  ctx.lineTo(d0.x + slashX, d0.y + slashY);
  ctx.moveTo(d1.x - slashX, d1.y - slashY);
  ctx.lineTo(d1.x + slashX, d1.y + slashY);
  ctx.stroke();

  const dimMidX = (d0.x + d1.x) / 2;
  const dimMidY = (d0.y + d1.y) / 2;

  ctx.font = 'bold 9.5px sans-serif';
  const metrics = ctx.measureText(label);
  const padX = 5;
  const bW = metrics.width + padX * 2;
  const bH = 15;

  let angle = Math.atan2(dy, dx);
  if (angle > Math.PI / 2) angle -= Math.PI;
  else if (angle < -Math.PI / 2) angle += Math.PI;

  ctx.translate(dimMidX, dimMidY);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-bW / 2, -bH / 2, bW, bH, 3);
  else ctx.rect(-bW / 2, -bH / 2, bW, bH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  ctx.restore();
}

export function drawSetbackLine(ctx, startPt, normalVec, distanceMeters = 13.0, pxPerMeter = 2.0, label = '13.00 M') {
  if (!startPt || !normalVec) return;

  const lengthPx = Math.max(30, Math.min(110, distanceMeters * pxPerMeter));
  const endPt = {
    x: startPt.x + normalVec.x * lengthPx,
    y: startPt.y + normalVec.y * lengthPx
  };

  ctx.save();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 3]);

  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.lineTo(endPt.x, endPt.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const perpX = -normalVec.y * 6;
  const perpY = normalVec.x * 6;
  ctx.beginPath();
  ctx.moveTo(endPt.x - perpX, endPt.y - perpY);
  ctx.lineTo(endPt.x + perpX, endPt.y + perpY);
  ctx.stroke();

  const midX = (startPt.x + endPt.x) / 2;
  const midY = (startPt.y + endPt.y) / 2;

  ctx.font = 'bold 9px sans-serif';
  const text = label || (distanceMeters.toFixed(1) + ' M');
  const m = ctx.measureText(text);
  const bW = m.width + 8;
  const bH = 14;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(midX - bW / 2, midY - bH / 2, bW, bH, 3);
  else ctx.rect(midX - bW / 2, midY - bH / 2, bW, bH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, midX, midY);

  ctx.restore();
}

export function drawNorthArrow(ctx, x, y, size = 24) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  const r = size * 0.75;
  const w = size * 0.28;

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(-w, r * 0.5);
  ctx.lineTo(0, r * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(w, r * 0.5);
  ctx.lineTo(0, r * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(-w, r * 0.5);
  ctx.lineTo(0, r * 0.2);
  ctx.lineTo(w, r * 0.5);
  ctx.closePath();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', 0, -r + 1);

  ctx.restore();
}

export function draw3DStructureBadge(ctx, centerPt, name, rotation, length, width, eaveHeight, ridgeHeight, isOmb = false) {
  const line1 = (name || (isOmb ? 'Ombrière' : 'Bâtiment')) + ' (' + rotation + '°)';
  const line2 = 'L=' + length.toFixed(1) + 'm × l=' + width.toFixed(1) + 'm';
  const line3 = 'Faîtage: +' + ridgeHeight.toFixed(2) + 'm | Sablière: +' + eaveHeight.toFixed(2) + 'm (TN: 0.00m)';

  ctx.save();
  ctx.font = 'bold 9px sans-serif';
  const m1 = ctx.measureText(line1);
  ctx.font = 'bold 8.5px sans-serif';
  const m2 = ctx.measureText(line2);
  ctx.font = 'bold 7.5px sans-serif';
  const m3 = ctx.measureText(line3);

  const badgeW = Math.max(m1.width, m2.width, m3.width) + 14;
  const badgeH = 40;

  const bx = centerPt.x - badgeW / 2;
  const by = centerPt.y - badgeH / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = isOmb ? '#10b981' : '#3b82f6';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 3;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, badgeW, badgeH, 4);
  else ctx.rect(bx, by, badgeW, badgeH);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = isOmb ? '#065f46' : '#1e40af';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(line1, centerPt.x, by + 3);

  ctx.font = 'bold 8px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(line2, centerPt.x, by + 15);

  ctx.font = 'bold 7px sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText(line3, centerPt.x, by + 26);

  ctx.restore();
}

/**
 * Calcule les lignes de cote GPS architecturales (Longueur et Largeur) sur les côtés extérieurs du rectangle
 */
export function getBuildingDimensionLines(centerLat, centerLng, lengthMeters, widthMeters, rotationDeg, offsetMeters = 2.5) {
  const lat = Number(centerLat) || 43.43571;
  const lng = Number(centerLng) || -1.17644;
  const len = Number(lengthMeters) || 30;
  const wid = Number(widthMeters) || 15;
  const rotRad = ((Number(rotationDeg) || 0) * Math.PI) / 180;

  const dx = len / 2;
  const dy = wid / 2;
  const off = Math.max(1.8, Math.min(6, offsetMeters));

  const mPerLat = 111139;
  const mPerLng = 111139 * Math.cos((lat * Math.PI) / 180);

  const toGps = (localX, localY) => {
    const rx = localX * Math.cos(rotRad) - localY * Math.sin(rotRad);
    const ry = localX * Math.sin(rotRad) + localY * Math.cos(rotRad);
    return [lat + (ry / mPerLat), lng + (rx / (mPerLng || 1))];
  };

  // Ligne de cote Longueur (côté -Y extérieur)
  const lenLine = [toGps(-dx, -dy - off), toGps(dx, -dy - off)];
  const lenMid = toGps(0, -dy - off);

  // Ligne de cote Largeur (côté +X extérieur)
  const widLine = [toGps(dx + off, -dy), toGps(dx + off, dy)];
  const widMid = toGps(dx + off, 0);

  // Lignes témoins de rappel aux angles
  const lenWitness1 = [toGps(-dx, -dy - 0.4), toGps(-dx, -dy - off - 0.8)];
  const lenWitness2 = [toGps(dx, -dy - 0.4), toGps(dx, -dy - off - 0.8)];
  const widWitness1 = [toGps(dx + 0.4, -dy), toGps(dx + off + 0.8, -dy)];
  const widWitness2 = [toGps(dx + 0.4, dy), toGps(dx + off + 0.8, dy)];

  return {
    lenLine,
    lenMid,
    lenWitness1,
    lenWitness2,
    widLine,
    widMid,
    widWitness1,
    widWitness2
  };
}