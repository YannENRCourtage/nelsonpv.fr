import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Car, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, FileCheck, Zap,
  Hash, Ruler, Info, RefreshCw, Mail, Phone, FileText,
  Upload, Image as ImageIcon, Check, Camera, Eye, Sparkles, Layers,
  Crop, HelpCircle, ArrowRight, Box, Sliders, Trash2, Battery, Sun, Plus,
  Compass, User, Download, Lock, Unlock, Move, Flame,
  Landmark, ExternalLink, Copy, CheckCheck, Save
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fetchUrbanismeMairiePortal } from '@/services/urbanismeRoutingService';
import { exportDossierDepotZip } from '@/services/DPGeneratorService';
import { getMissingFields, buildCerfaDataSummary, resolveDemandeurNames, parseFrenchAddress } from '@/services/SmartCerfaService';
import { downloadPieceDwg } from '@/services/DwgExportService';
import { cadastreService } from '@/services/CadastreService';
import { getOrGenerateProjectMaps, generateStaticMapImage } from '@/services/AutoMapService';
import {
  getStructureHeights,
  drawDimensionLine,
  drawNorthArrow,
  getBuildingDimensionLines
} from '@/utils/mapCotations';
import { useConfiguratorStore, useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import { cacheMediaLocal, getAllCachedMediaForProject, uploadUrbanismeDataUrl, persistProjectUrbanismeMedia } from '@/services/urbanismeMediaService';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { apiService } from '@/services/api';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
import { BuildingSummaryCard } from '../configurator/ui/BuildingSummaryCard.jsx';
import BuildingScene from '../configurator/BuildingScene.jsx';
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';
import ImageCropModal from './ImageCropModal';
import DimensionsModal from './DimensionsModal';
import LandscapeIntegrationModal from './LandscapeIntegrationModal';
import Building3DViewer from './Building3DViewer';
import BatteryStationVisualizer from './BatteryStationVisualizer';
import BatteryInsertionCompositor from './BatteryInsertionCompositor';
import { findBessOdreData } from '@/data/bessOdreMatrix.js';
import html2canvas from 'html2canvas';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;

// Détermination infaillible des coordonnées GPS réelles du site (Adresse / Projet / Déclarant)
function resolveProjectCoordinates(edProj, proj) {
  // 1. Chercher dans les chaînes GPS existantes
  const candidates = [
    edProj?.gps,
    proj?.gps,
    edProj?.gpsCoordinates,
    proj?.gpsCoordinates
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.includes(',')) {
      const p = c.split(',').map(v => Number(v.trim()));
      if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) && p[0] !== 0) {
        // Exclure formellement l'ancien faux fallback (Gers / Chemin de Fresqueville 43.5612, 0.9168)
        if (Math.abs(p[0] - 43.5612) > 0.001 || Math.abs(p[1] - 0.9168) > 0.001) {
          return { lat: p[0], lng: p[1] };
        }
      }
    }
  }

  // 2. Chercher dans les nombres directs lat / lng
  const dLat = Number(edProj?.lat ?? proj?.lat);
  const dLng = Number(edProj?.lng ?? proj?.lng);
  if (!isNaN(dLat) && !isNaN(dLng) && dLat !== 0 && dLng !== 0) {
    if (Math.abs(dLat - 43.5612) > 0.001 || Math.abs(dLng - 0.9168) > 0.001) {
      return { lat: dLat, lng: dLng };
    }
  }

  // 3. Chercher dans les bâtiments du projet
  if (proj?.buildings && Array.isArray(proj.buildings)) {
    for (const b of proj.buildings) {
      const bGps = b.gps || (b.lat && b.lng ? `${b.lat},${b.lng}` : null);
      if (bGps && typeof bGps === 'string' && bGps.includes(',')) {
        const p = bGps.split(',').map(v => Number(v.trim()));
        if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) && p[0] !== 0) {
          if (Math.abs(p[0] - 43.5612) > 0.001 || Math.abs(p[1] - 0.9168) > 0.001) {
            return { lat: p[0], lng: p[1] };
          }
        }
      }
    }
  }

  // 4. Coordonnées par défaut du site projet LABERGUERIE 64120 OREGUE (3810 Route des Barthes)
  return { lat: 43.43571, lng: -1.17644 };
}

// Calcul précis des coordonnées GPS des 4 coins d'une structure orientée
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

function getOrientationLabel(deg) {
  const r = Number(deg) || 0;
  const norm = ((((r + 180) % 360) + 360) % 360) - 180;
  if (norm === 0) return 'Sud';
  if (Math.abs(norm) >= 135) return 'Nord';
  if (norm > 45) return norm >= 85 && norm <= 95 ? 'Plein Ouest' : 'Ouest';
  if (norm > 0 && norm <= 45) return 'Sud-Ouest';
  if (norm < -45) return norm <= -85 && norm >= -95 ? 'Plein Est' : 'Est';
  if (norm < 0 && norm >= -45) return 'Sud-Est';
  return 'Sud';
}

// Capture directe haute fidélité d'une carte Leaflet sans passer par html2canvas sur le SVG (élimine tout décalage)
async function captureDirectLeafletMap(map, targetStr, allActiveStructures = [], showDimensions = true, distances = [], sdisPoint = null) {
  if (!map) return null;
  try {
    const size = map.getSize();
    if (!size || size.x === 0 || size.y === 0) return null;

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size.x * scale;
    canvas.height = size.y * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // 1. Rendu des tuiles OpenStreetMap déjà chargées dans le DOM Leaflet
    const mapContainer = map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    const tilePane = mapContainer.querySelector('.leaflet-tile-pane');
    if (tilePane) {
      const tileImgs = Array.from(tilePane.querySelectorAll('img'));
      for (const img of tileImgs) {
        if (img.complete && img.naturalWidth > 0) {
          const rect = img.getBoundingClientRect();
          const x = rect.left - mapRect.left;
          const y = rect.top - mapRect.top;
          const w = rect.width;
          const h = rect.height;
          if (w > 0 && h > 0) {
            try {
              ctx.drawImage(img, x, y, w, h);
            } catch (e) {
              return null; // Erreur CORS canvas
            }
          }
        }
      }
    }

    // Facteur d'échelle mètres -> pixels au niveau de zoom courant Leaflet
    const currentZoom = map.getZoom();
    const mapCenter = map.getCenter();
    const metersPerPx = (40075016.686 * Math.cos((mapCenter.lat * Math.PI) / 180)) / Math.pow(2, currentZoom + 8);
    const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 2.0;

    // 2. Rendu des structures orientées via projection conteneur exacte Leaflet (zéro décalage)
    const listToDraw = allActiveStructures && allActiveStructures.length > 0
      ? allActiveStructures
      : (targetStr ? [targetStr] : []);

    listToDraw.forEach((str) => {
      const isTarget = targetStr && str.id === targetStr.id;
      const strLat = Number(str.lat || (str.gps ? str.gps.split(',')[0] : null));
      const strLng = Number(str.lng || (str.gps ? str.gps.split(',')[1] : null));
      if (!strLat || !strLng || isNaN(strLat) || isNaN(strLng)) return;

      const isBat = str.solutionKey === 'battery' || str.isBattery || (str.buildingType || '').includes('battery');
      const isOmb = !isBat && (str.solutionKey === 'ombriere' || (str.buildingType || '').toLowerCase().includes('ombriere'));
      const sLen = isBat ? Number(str.length || 6.20) : Number(str.length || (str.bayCount ? str.bayCount * (str.baySpacing || 7.5) : 30));
      const sWid = isBat ? Number(str.width || 3.20) : Number(str.width || 15);
      const extLeft = !isBat && str.leftSide !== 'none' ? Number(str.leftWidth || (str.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extRight = !isBat && str.rightSide !== 'none' ? Number(str.rightWidth || (str.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const totalWid = sWid + extLeft + extRight;
      const sRot = Number(str.rotation || 0);

      const corners = getBuildingCorners(strLat, strLng, sLen, totalWid, sRot);
      const pixelCorners = corners.map(([cLat, cLng]) => map.latLngToContainerPoint([cLat, cLng]));

      const strokeColor = isBat ? '#9333ea' : (isOmb ? '#059669' : '#2563eb');
      const fillColor = isBat ? 'rgba(168, 85, 247, 0.35)' : (isOmb ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)');

      ctx.save();
      // Polygone précis (rectangle de la construction parfaitement visible)
      ctx.beginPath();
      ctx.moveTo(pixelCorners[0].x, pixelCorners[0].y);
      ctx.lineTo(pixelCorners[1].x, pixelCorners[1].y);
      ctx.lineTo(pixelCorners[2].x, pixelCorners[2].y);
      ctx.lineTo(pixelCorners[3].x, pixelCorners[3].y);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isTarget ? 2.5 : 2;
      ctx.setLineDash(isTarget ? [5, 4] : [3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isBat) {
        // Dessin des 4 armoires de batteries sur la dalle béton
        for (let ci = 0; ci < 4; ci++) {
          const t0 = (ci + 0.12) / 4;
          const t1 = (ci + 0.88) / 4;
          const p0 = {
            x: pixelCorners[0].x + (pixelCorners[1].x - pixelCorners[0].x) * t0,
            y: pixelCorners[0].y + (pixelCorners[1].y - pixelCorners[0].y) * t0
          };
          const p1 = {
            x: pixelCorners[0].x + (pixelCorners[1].x - pixelCorners[0].x) * t1,
            y: pixelCorners[0].y + (pixelCorners[1].y - pixelCorners[0].y) * t1
          };
          const p2 = {
            x: pixelCorners[3].x + (pixelCorners[2].x - pixelCorners[3].x) * t1,
            y: pixelCorners[3].y + (pixelCorners[2].y - pixelCorners[3].y) * t1
          };
          const p3 = {
            x: pixelCorners[3].x + (pixelCorners[2].x - pixelCorners[3].x) * t0,
            y: pixelCorners[3].y + (pixelCorners[2].y - pixelCorners[3].y) * t0
          };

          const c0 = { x: p0.x + (p3.x - p0.x) * 0.15, y: p0.y + (p3.y - p0.y) * 0.15 };
          const c1 = { x: p1.x + (p2.x - p1.x) * 0.15, y: p1.y + (p2.y - p1.y) * 0.15 };
          const c2 = { x: p1.x + (p2.x - p1.x) * 0.85, y: p1.y + (p2.y - p1.y) * 0.85 };
          const c3 = { x: p0.x + (p3.x - p0.x) * 0.85, y: p0.y + (p3.y - p0.y) * 0.85 };

          ctx.beginPath();
          ctx.moveTo(c0.x, c0.y);
          ctx.lineTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // Faîtage médian
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
        ctx.strokeStyle = isOmb ? '#10b981' : '#60a5fa';
        ctx.lineWidth = 1.5;
        ctx.moveTo(ridgeStart.x, ridgeStart.y);
        ctx.lineTo(ridgeEnd.x, ridgeEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Cotations architecturales en plan : SEULEMENT Longueur et Largeur sur les arêtes extérieures
      const strShowDim = showDimensions !== false;
      if (strShowDim) {
        const centerPt = map.latLngToContainerPoint([strLat, strLng]);
        drawDimensionLine(ctx, pixelCorners[0], pixelCorners[1], centerPt, `${sLen.toFixed(1)} M`, strokeColor, 20);
        drawDimensionLine(ctx, pixelCorners[1], pixelCorners[2], centerPt, `${totalWid.toFixed(1)} M`, strokeColor, 20);
      }

      ctx.restore();
    });

    // 2b. Rendu des tracés de distance personnalisés (côtes DP2 / PC2)
    if (distances && distances.length > 0) {
      distances.forEach(d => {
        if (!d.p1 || !d.p2) return;
        const pt1 = map.latLngToContainerPoint(d.p1);
        const pt2 = map.latLngToContainerPoint(d.p2);
        const dx = pt2.x - pt1.x;
        const dy = pt2.y - pt1.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const wLen = 3.5;

          ctx.save();
          // Ligne de cote rouge pointillée
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();

          // Témoins perpendiculaires aux deux extrémités (longueur réduite)
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pt1.x - nx * wLen, pt1.y - ny * wLen);
          ctx.lineTo(pt1.x + nx * wLen, pt1.y + ny * wLen);
          ctx.moveTo(pt2.x - nx * wLen, pt2.y - ny * wLen);
          ctx.lineTo(pt2.x + nx * wLen, pt2.y + ny * wLen);
          ctx.stroke();

          // Mesure au centre de la cote (sans bulle rouge)
          const midX = (pt1.x + pt2.x) / 2;
          const midY = (pt1.y + pt2.y) / 2;
          const text = `${Number(d.meters).toFixed(1)} m`;
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Contour blanc pour lisibilité maximale
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeText(text, midX, midY);

          // Texte en rouge
          ctx.fillStyle = '#dc2626';
          ctx.fillText(text, midX, midY);
          ctx.restore();
        }
      });
    }

    // 2c. Rendu du Point SDIS si présent
    if (sdisPoint && sdisPoint.lat && sdisPoint.lng) {
      const sdisPt = map.latLngToContainerPoint([sdisPoint.lat, sdisPoint.lng]);
      ctx.save();
      const badgeW = 76;
      const badgeH = 18;
      const bx = sdisPt.x - badgeW / 2;
      const by = sdisPt.y - 28;

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(sdisPt.x - 1.5, by + badgeH, 3, 10);

      ctx.beginPath();
      ctx.arc(sdisPt.x, sdisPt.y, 4, 0, 2 * Math.PI);
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
      ctx.fillText('🔥 BORNE SDIS', sdisPt.x, by + badgeH / 2);
      ctx.restore();
    }

    // 3. Flèche Nord officielle en haut à droite
    drawNorthArrow(ctx, size.x - 36, 36, 22);

    // 4. Échelle métrique dynamique (en bas à gauche)
    const targets = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const maxBarPx = 80;
    const maxMeters = maxBarPx * metersPerPx;
    const best = targets.reduce((prev, cur) => (cur <= maxMeters ? cur : prev), 10);
    const pxWidth = best / metersPerPx;
    const scaleLabel = best >= 1000 ? `${best / 1000} km` : `${best} m`;

    const sbX = 14;
    const sbY = size.y - 36;
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

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('[captureDirectLeafletMap] error:', err);
    return null;
  }
}

function MapResizer({ activeCount, center } = {}) {
  const map = useMap();
  const centerRef = useRef(center);
  centerRef.current = center;

  useEffect(() => {
    if (!map) return;

    const doResize = (recenter = false) => {
      try {
        map.invalidateSize({ pan: false, debounceMoveend: true });
        if (recenter && centerRef.current && Array.isArray(centerRef.current)) {
          const [cLat, cLng] = centerRef.current;
          if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng) && cLat !== 0 && cLng !== 0) {
            map.setView([cLat, cLng], map.getZoom(), { animate: false });
          }
        }
      } catch (e) {
        console.warn('MapResizer error:', e);
      }
    };

    // Staggered triggers for initialization, tab switches, and layout changes
    doResize(true);
    const t1 = setTimeout(() => doResize(true), 80);
    const t2 = setTimeout(() => doResize(true), 200);
    const t3 = setTimeout(() => doResize(true), 450);
    const t4 = setTimeout(() => doResize(true), 800);

    // Continuous resize observer on DOM container
    let ro = null;
    try {
      const container = map.getContainer();
      if (container && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          requestAnimationFrame(() => {
            if (map && map.getContainer()) {
              map.invalidateSize({ pan: false });
            }
          });
        });
        ro.observe(container);
      }
    } catch (e) {
      console.warn('ResizeObserver setup error:', e);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (ro) ro.disconnect();
    };
  }, [map, activeCount]);

  return null;
}

// Dynamically scale the building rectangle to match ground truth at any zoom level
function PC2ScaledBuildingOverlay({ bLength, bWidth, rotation, label }) {
  const map = useMap();
  const [dims, setDims] = React.useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const metersPerPx = (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      const pxPerMeter = 1 / metersPerPx;
      setDims({ w: bLength * pxPerMeter, h: bWidth * pxPerMeter });
    };
    update();
    map.on('zoom zoomend moveend', update);
    return () => map.off('zoom zoomend moveend', update);
  }, [map, bLength, bWidth]);

  if (dims.w < 2 || dims.h < 2) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
      <div
        className="border-2 border-red-500 border-dashed bg-red-500/20 rounded shadow-md flex items-center justify-center text-center p-1"
        style={{
          width: `${dims.w}px`,
          height: `${dims.h}px`,
          transform: `rotate(${rotation}deg)`,
          transition: 'width 0.15s, height 0.15s, transform 0.1s ease-out',
        }}
      >
        <span className="text-[10px] font-bold text-red-900 bg-white/80 px-1 py-0.5 rounded shadow-2xs whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

// Scale bar that updates with zoom level
function PC2MapScaleBar() {
  const map = useMap();
  const [bar, setBar] = React.useState({ widthPx: 0, label: '' });

  useEffect(() => {
    const update = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const metersPerPx = (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      const targets = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
      const maxBarPx = 100;
      const maxMeters = maxBarPx * metersPerPx;
      const best = targets.reduce((prev, cur) => (cur <= maxMeters ? cur : prev), 1);
      const pxWidth = best / metersPerPx;
      setBar({ widthPx: Math.round(pxWidth), label: best >= 1000 ? `${best / 1000} km` : `${best} m` });
    };
    update();
    map.on('zoom zoomend moveend', update);
    return () => map.off('zoom zoomend moveend', update);
  }, [map]);

  return (
    <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 border border-slate-300 shadow-sm">
      <div className="flex items-end gap-1">
        <div
          className="border-b-2 border-l-2 border-r-2 border-slate-700"
          style={{ width: `${bar.widthPx}px`, height: '6px' }}
        />
        <span className="text-[9px] font-bold text-slate-700 leading-none">{bar.label}</span>
      </div>
    </div>
  );
}

function MapSyncCenter({ lat, lng, disabled = false }) {
  const map = useMap();
  const prevCoordsRef = React.useRef({ lat, lng });

  useEffect(() => {
    if (disabled) return;
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      if (prevCoordsRef.current.lat !== lat || prevCoordsRef.current.lng !== lng) {
        prevCoordsRef.current = { lat, lng };
        map.setView([lat, lng], map.getZoom(), { animate: true });
      }
    }
  }, [lat, lng, map, disabled]);
  return null;
}

function MasseMapController({ strId, onMapChange, mapInstancesRef, activeView = 1 }) {
  const map = useMap();
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  useEffect(() => {
    if (mapInstancesRef) {
      if (!mapInstancesRef.current) mapInstancesRef.current = {};
      mapInstancesRef.current[strId] = map;
    }
    return () => {
      if (mapInstancesRef && mapInstancesRef.current) {
        delete mapInstancesRef.current[strId];
      }
    };
  }, [strId, map, mapInstancesRef]);

  useEffect(() => {
    if (!onMapChange) return;
    const handleUpdate = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMapChange(strId, {
        centerLat: center.lat,
        centerLng: center.lng,
        zoom: zoom
      }, activeViewRef.current);
    };

    map.on('moveend zoomend', handleUpdate);
    return () => {
      map.off('moveend zoomend', handleUpdate);
    };
  }, [strId, map, onMapChange]);

  return null;
}

function MasseMapLockController({ isLocked = false }) {
  const map = useMap();
  useEffect(() => {
    if (isLocked) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
  }, [map, isLocked]);
  return null;
}

function MasseDistanceLayer({ distances = [], onRemoveDistance }) {
  return (
    <>
      {distances.map(d => {
        if (!d.p1 || !d.p2) return null;
        const p1 = d.p1;
        const p2 = d.p2;
        const midLat = (p1[0] + p2[0]) / 2;
        const midLng = (p1[1] + p2[1]) / 2;
        const cosLat = Math.cos((midLat * Math.PI) / 180);

        // Vecteurs en mètres pour garantir une perpendicularité rigoureuse sur la projection Mercator
        const dyMeters = (p2[0] - p1[0]) * 111111;
        const dxMeters = (p2[1] - p1[1]) * 111111 * cosLat;
        const lenMeters = Math.hypot(dxMeters, dyMeters);

        let tLat = 0;
        let tLng = 0;
        if (lenMeters > 0) {
          // Témoins d'extrémités discrets et courts (~1.2m de demi-longueur, soit ~2.4m total)
          const witnessHalfMeters = 1.2;
          const perpX = -dyMeters / lenMeters;
          const perpY = dxMeters / lenMeters;

          tLat = (perpY * witnessHalfMeters) / 111111;
          tLng = (perpX * witnessHalfMeters) / (111111 * cosLat);
        }

        const w1 = [[p1[0] - tLat, p1[1] - tLng], [p1[0] + tLat, p1[1] + tLng]];
        const w2 = [[p2[0] - tLat, p2[1] - tLng], [p2[0] + tLat, p2[1] + tLng]];

        return (
          <React.Fragment key={d.id}>
            <Polyline positions={[p1, p2]} pathOptions={{ color: '#dc2626', weight: 2.5, dashArray: '5, 4' }} />
            <Polyline positions={w1} pathOptions={{ color: '#dc2626', weight: 2 }} />
            <Polyline positions={w2} pathOptions={{ color: '#dc2626', weight: 2 }} />
            <Marker
              position={[midLat, midLng]}
              icon={L.divIcon({
                className: 'bg-transparent',
                html: `<div style="transform: translate(-50%, -50%); color: #dc2626; font-weight: 900; font-size: 11px; white-space: nowrap; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff, 0 0 5px #fff; display: flex; align-items: center; gap: 4px; font-family: monospace; letter-spacing: 0.5px; cursor: pointer; user-select: none;"><span>${Number(d.meters).toFixed(1)} m</span><span title="Supprimer la côte" style="background: #dc2626; color: #ffffff; border-radius: 50%; width: 13px; height: 13px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; line-height: 1; text-shadow: none; box-shadow: 0 1px 2px rgba(0,0,0,0.3);">&times;</span></div>`,
                iconSize: [0, 0]
              })}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (onRemoveDistance) onRemoveDistance(d.id);
                }
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

function MasseDistanceDrawer({ isMeasuring, onAddDistance }) {
  const [p1, setP1] = useState(null);
  const [currentMouse, setCurrentMouse] = useState(null);
  const map = useMap();

  useEffect(() => {
    if (!isMeasuring) {
      setP1(null);
      setCurrentMouse(null);
      map.getContainer().style.cursor = '';
    } else {
      map.getContainer().style.cursor = 'crosshair';
      map.dragging.disable();
    }
  }, [isMeasuring, map]);

  useMapEvents({
    click(e) {
      if (!isMeasuring) return;
      L.DomEvent.stopPropagation(e);
      if (!p1) {
        setP1([e.latlng.lat, e.latlng.lng]);
        setCurrentMouse([e.latlng.lat, e.latlng.lng]);
      } else {
        const p2 = [e.latlng.lat, e.latlng.lng];
        const dist = L.latLng(p1).distanceTo(e.latlng);
        if (dist >= 0.5) {
          onAddDistance({
            id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            p1,
            p2,
            meters: Math.round(dist * 10) / 10
          });
        }
        setP1(null);
        setCurrentMouse(null);
      }
    },
    mousemove(e) {
      if (!isMeasuring || !p1) return;
      setCurrentMouse([e.latlng.lat, e.latlng.lng]);
    }
  });

  if (!isMeasuring || !p1 || !currentMouse) return null;

  const liveDist = L.latLng(p1).distanceTo(L.latLng(currentMouse));
  const midLat = (p1[0] + currentMouse[0]) / 2;
  const midLng = (p1[1] + currentMouse[1]) / 2;

  return (
    <>
      <Polyline positions={[p1, currentMouse]} pathOptions={{ color: '#ea580c', weight: 2, dashArray: '4, 4' }} />
      <Marker
        position={[midLat, midLng]}
        icon={L.divIcon({
          className: 'bg-transparent',
          html: `<div style="transform: translate(-50%, -50%); color: #ea580c; font-weight: 900; font-size: 11px; white-space: nowrap; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff; font-family: monospace;">${liveDist.toFixed(1)} m</div>`,
          iconSize: [0, 0]
        })}
        interactive={false}
      />
    </>
  );
}

function MasseSdisLayer({ sdisPoint, isPlacing, onSetSdisPoint }) {
  const map = useMap();

  useEffect(() => {
    if (isPlacing) {
      map.getContainer().style.cursor = 'crosshair';
      map.dragging.disable();
    } else {
      map.getContainer().style.cursor = '';
      map.dragging.enable();
    }
  }, [isPlacing, map]);

  useMapEvents({
    click(e) {
      if (!isPlacing) return;
      L.DomEvent.stopPropagation(e);
      onSetSdisPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  if (!sdisPoint || !sdisPoint.lat || !sdisPoint.lng) return null;

  return (
    <Marker
      position={[sdisPoint.lat, sdisPoint.lng]}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const m = e.target;
          const pos = m.getLatLng();
          onSetSdisPoint({ lat: pos.lat, lng: pos.lng });
        }
      }}
      icon={L.divIcon({
        className: 'bg-transparent',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab; user-select: none;">
            <div style="background: #dc2626; color: #ffffff; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 6px; border: 1.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); white-space: nowrap; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; font-family: sans-serif;">
              <span style="font-size: 12px; line-height: 1;">🔥</span>
              <span>POINT SDIS</span>
            </div>
            <div style="width: 3px; height: 12px; background: #dc2626; box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></div>
            <div style="width: 8px; height: 8px; background: #dc2626; border-radius: 50%; border: 1.5px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [0, 0]
      })}
    />
  );
}

function DraggableMasseStructure({
  polygonPositions,
  centerLat,
  centerLng,
  isBattery,
  solutionKey,
  structureName,
  rotation,
  onGpsUpdate,
  isLocked,
  isMeasuring
}) {
  const map = useMap();
  const draggingRef = useRef(false);
  const startMouseRef = useRef(null);
  const startPosRef = useRef({ lat: centerLat, lng: centerLng });

  const strokeColor = isBattery ? '#9333ea' : (solutionKey === 'ombriere' ? '#059669' : '#2563eb');
  const fillColor = isBattery ? '#a855f7' : (solutionKey === 'ombriere' ? '#10b981' : '#3b82f6');

  const handleDragStart = useCallback((e) => {
    if (isMeasuring) return;
    L.DomEvent.stopPropagation(e);
    if (e.originalEvent) {
      L.DomEvent.preventDefault(e.originalEvent);
    }
    map.dragging.disable();
    draggingRef.current = true;
    startMouseRef.current = e.latlng;
    startPosRef.current = { lat: centerLat, lng: centerLng };

    const onMouseMove = (moveEvt) => {
      if (!draggingRef.current || !startMouseRef.current) return;
      const dLat = moveEvt.latlng.lat - startMouseRef.current.lat;
      const dLng = moveEvt.latlng.lng - startMouseRef.current.lng;
      const newLat = startPosRef.current.lat + dLat;
      const newLng = startPosRef.current.lng + dLng;
      onGpsUpdate(newLat, newLng);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      window.removeEventListener('mouseup', onMouseUp);
      if (!isLocked) {
        map.dragging.enable();
      }
    };

    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    window.addEventListener('mouseup', onMouseUp);
  }, [map, centerLat, centerLng, onGpsUpdate, isLocked, isMeasuring]);

  return (
    <>
      <Polygon
        positions={polygonPositions}
        interactive={!isMeasuring}
        pathOptions={{
          color: strokeColor,
          fillColor: fillColor,
          fillOpacity: 0.38,
          dashArray: '5, 4',
          weight: 2.5,
          className: isMeasuring ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }}
        eventHandlers={isMeasuring ? {} : {
          mousedown: handleDragStart
        }}
      >
        {!isMeasuring && (
          <Tooltip sticky direction="top" offset={[0, -10]}>
            <div className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap bg-white/95 text-slate-800 border border-slate-300 text-center">
              ✋ Glisser pour déplacer • {structureName || 'Projet'} ({rotation}°)
            </div>
          </Tooltip>
        )}
      </Polygon>

      {/* Ancre centrale de déplacement */}
      <Marker
        position={[centerLat, centerLng]}
        interactive={!isMeasuring}
        draggable={!isMeasuring}
        eventHandlers={isMeasuring ? {} : {
          dragstart: () => {
            map.dragging.disable();
          },
          drag: (e) => {
            const pos = e.target.getLatLng();
            onGpsUpdate(pos.lat, pos.lng);
          },
          dragend: (e) => {
            const pos = e.target.getLatLng();
            onGpsUpdate(pos.lat, pos.lng);
            if (!isLocked) {
              map.dragging.enable();
            }
          },
          mousedown: handleDragStart
        }}
        icon={L.divIcon({
          className: 'bg-transparent',
          html: `<div style="transform: translate(-50%, -50%); width: 28px; height: 28px; border-radius: 50%; background: ${strokeColor}; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: ${isMeasuring ? 'crosshair' : 'grab'}; color: white;" title="${isMeasuring ? 'Point de mesure' : 'Glisser pour déplacer'}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg></div>`,
          iconSize: [28, 28]
        })}
      />
    </>
  );
}

function MapClickHandler({ setGps }) {
  useMapEvents({
    click(e) {
      if (setGps && e.latlng) {
        setGps(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

function DraggableLocationMarker({ lat, lng, setGps }) {
  const markerRef = React.useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setGps(newPos.lat, newPos.lng);
        }
      },
    }),
    [setGps],
  );

  return (
    <>
      <MapClickHandler setGps={setGps} />
      <Marker
        draggable={true}
        autoPan={true}
        eventHandlers={eventHandlers}
        position={[lat, lng]}
        ref={markerRef}
      />
    </>
  );
}

const DOSSIER_INFO = {
  cu: {
    title: "Certificat d'Urbanisme opérationnel (CUo)",
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    accentColor: 'bg-sky-600',
  },
  dp: {
    title: 'Déclaration Préalable de Travaux (DP)',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-600',
  },
  pc: {
    title: 'Permis de Construire (PC)',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    accentColor: 'bg-violet-600',
  },
};

export default function UrbanismeWizard({ isOpen, onClose, type, project, onGenerate, onUpdateProject }) {
  const isDP = type === 'dp';
  const isPC = type === 'pc'; 
  const hasInitializedRef = React.useRef(false);
  const hasInitializedSelectionRef = React.useRef(false);
  const prevProjectIdRef = React.useRef(null);

  const { activeTenantId, user } = useAuth() || {};
  const isAcama = activeTenantId === 'acama' || project?.tenantId === 'acama' || Boolean(project?.isAcama);
  const isGreenInvest = activeTenantId === 'green-invest' || activeTenantId === 'greeninvest' || user?.activeTenantId === 'green-invest' || user?.tenantId === 'green-invest' || user?.tenant === 'greeninvest' || Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest';
  const isNoBattery = isAcama;
  
  // Zustand Store du Configurateur Nelson
  const config = useConfiguratorValues();
  const configActions = useConfiguratorActions();

  const [step, setStep] = useState(0); // 0=Déclarant, 1=Cartes DP1/PC1, 2=Configurateur 2D/3D, 3=Photos/3D, 4=Notice Descriptive, 5=Validation
  const initialSolType = project?.urbanisme_solutionType || project?.solutionType || (() => {
    const raw = String(project?.type || project?.installationType || project?.projectType || project?.type_projet || '').toLowerCase();
    if (raw.includes('batterie') || raw.includes('battery')) return 'battery';
    if (raw.includes('construction') || raw.includes('batiment') || raw.includes('bâtiment') || raw.includes('ombriere') || raw.includes('ombrière')) return 'ombriere';
    return isDP ? 'ombriere' : 'building';
  })();
  const [solutionType, setSolutionType] = useState(initialSolType); // 'building' | 'ombriere' | 'battery'
  const isBatActive = solutionType === 'battery';
  const [viewMode, setViewMode] = useState('3D'); // '3D' | '2D_FRONT' | '2D_TOP'

  const [editedProject, setEditedProject] = useState(project || {});
  const [captures, setCaptures] = useState(project?.urbanisme_captures || {});
  const [photos, setPhotos] = useState(project?.pc_photos || {});
  const [fetchingCadastre, setFetchingCadastre] = useState(false);
  const [generatingMaps, setGeneratingMaps] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingPieceId, setDownloadingPieceId] = useState(null);
  const [noticeText, setNoticeText] = useState('');
  const [isNoticeUserModified, setIsNoticeUserModified] = useState(false);
  const [selectedPages, setSelectedPages] = useState({
    cover: true,
    situation: true,
    masse: true,
    section_notice: true,
    section: true,
    facades: true,
    insertion: true,
    env: true,
    env_proche: true,
    env_lointain: true,
    dp7: true,
    dp8: true,
    pc7: true,
    pc8: true,
    cerfa: true,
  });

  const [additionalRoof, setAdditionalRoof] = useState({
    enabled: false,
    name: 'Toiture solaire existante',
    surface: 500,
    kwc: 100,
    roofType: 'Bac acier',
    pitch: 15,
    orientation: 'Sud'
  });

  const [batteryStorage, setBatteryStorage] = useState({
    enabled: false,
    name: 'Système de stockage par batterie',
    model: 'CESC Mercury 261',
    quantity: 1,
    capacityKwh: 261,
    powerKw: 125,
    footprint: '3.50m × 2.20m',
    fireSafety: 'Bâche à eau 120m³, rétention intégrée, distance de sécurité 5m'
  });

  const [showRoofModal, setShowRoofModal] = useState(false);
  const [showBatteryModal, setShowBatteryModal] = useState(false);
  const isSwitchingBuildingRef = React.useRef(false);
  const lastActiveBuildingIdxRef = React.useRef(0);

  const [selectedStructureIds, setSelectedStructureIds] = useState([]);
  const [activeMasseStructureId, setActiveMasseStructureId] = useState(null);
  const [masseViewTabs, setMasseViewTabs] = useState({}); // { [strId]: 1 | 2 }
  const [hasMasseView2, setHasMasseView2] = useState({}); // { [strId]: boolean }
  const [masseShowDimensions, setMasseShowDimensions] = useState({}); // { [strId]: boolean }
  const [masseDistances, setMasseDistances] = useState({}); // { [strId]: [ { id, p1, p2, meters } ] }
  const [measuringMasseStrId, setMeasuringMasseStrId] = useState(null); // ID de structure en cours de cotation
  const [masseLockedMaps, setMasseLockedMaps] = useState({}); // { [strId]: boolean } - true par défaut (carte fixe)
  const [masseCapturedToast, setMasseCapturedToast] = useState({}); // { [strId]: string }
  const [sdisPoint, setSdisPoint] = useState(project?.sdisPoint || null);
  const [isPlacingSdis, setIsPlacingSdis] = useState(false);
  const masseMapInstancesRef = useRef({});
  const captureStructureMasseMapRef = useRef(null);
  const masseRotationDebounceRef = useRef(null);

  useEffect(() => {
    if (project?.sdisPoint !== undefined) {
      setSdisPoint(project.sdisPoint);
    }
  }, [project?.id, project?.sdisPoint]);

  // ── Aiguillage Mairie & Téléservice SVE (Étape 7 Validation) ──────────────
  const [mairieRouting, setMairieRouting] = useState({
    loading: false,
    data: null,
    error: null,
  });
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgressText, setZipProgressText] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Synchronisation des cotations personnalisées enregistrées sur le projet
  useEffect(() => {
    if (project?.masseDistances) {
      setMasseDistances(project.masseDistances);
    }
  }, [project?.id, project?.masseDistances]);

  const handleAddMasseDistance = useCallback((strId, newDistance) => {
    setMasseDistances(prev => {
      const list = prev[strId] || [];
      const next = { ...prev, [strId]: [...list, newDistance] };
      setEditedProject(proj => ({
        ...proj,
        masseDistances: next
      }));
      return next;
    });
    setMeasuringMasseStrId(null);
    setTimeout(() => {
      if (typeof captureStructureMasseMapRef.current === 'function') {
        captureStructureMasseMapRef.current(strId, masseViewTabs[strId] || 1);
      }
    }, 150);
  }, [masseViewTabs]);

  const handleRemoveMasseDistance = useCallback((strId, distId) => {
    setMasseDistances(prev => {
      const list = prev[strId] || [];
      const next = { ...prev, [strId]: list.filter(d => d.id !== distId) };
      setEditedProject(proj => ({
        ...proj,
        masseDistances: next
      }));
      return next;
    });
    setTimeout(() => {
      if (typeof captureStructureMasseMapRef.current === 'function') {
        captureStructureMasseMapRef.current(strId, masseViewTabs[strId] || 1);
      }
    }, 150);
  }, [masseViewTabs]);

  const handleClearMasseDistances = useCallback((strId) => {
    setMasseDistances(prev => {
      const next = { ...prev, [strId]: [] };
      setEditedProject(proj => ({
        ...proj,
        masseDistances: next
      }));
      return next;
    });
    setTimeout(() => {
      if (typeof captureStructureMasseMapRef.current === 'function') {
        captureStructureMasseMapRef.current(strId, masseViewTabs[strId] || 1);
      }
    }, 150);
  }, [masseViewTabs]);

  const handleToggleMasseLock = useCallback((strId) => {
    setMasseLockedMaps(prev => ({
      ...prev,
      [strId]: prev[strId] === false ? true : false
    }));
  }, []);

  // Sync ACAMA / Green Invest mode on open & verrouillage solution
  useEffect(() => {
    if (isOpen) {
      configActions.setIsAcama(isAcama);
      if (isNoBattery) {
        configActions.setConfigMode('custom');
        setSolutionType((!isAcama && isDP) ? 'ombriere' : 'building');
        setBatteryStorage(prev => ({ ...prev, enabled: false }));
      } else {
        const detectedSol = project?.solutionType || project?.urbanisme_solutionType || (
          (project?.type === 'battery' || project?.type === 'batterie_standalone' || project?.installationType?.toLowerCase()?.includes('batterie'))
            ? 'battery'
            : null
        );
        if (detectedSol) {
          setSolutionType(detectedSol);
          if (detectedSol === 'battery') {
            setBatteryStorage(prev => ({ ...prev, enabled: true }));
            setSelectedStructureIds(['bat-sa-1']);
          }
        }
      }
    }
  }, [isOpen, isAcama, isNoBattery, isDP, project]);

  // État cloisonné et indépendant pour chaque solution (Bâtiment vs Ombrière)
  const [solutions, setSolutions] = useState(() => ({
    building: {
      activeBuildingIndex: 0,
      buildings: [
        {
          id: 'bat-1',
          name: isAcama ? 'Bâtiment 30m × 15m' : 'Bâtiment 1',
          solutionType: 'building',
          length: isAcama ? 30 : 37.5,
          width: isAcama ? 15 : 16.4,
          eaveHeight: 4,
          roofPitch: isAcama ? 10 : 15,
          buildingType: isAcama ? 'symetrique' : 'asymetrique_1',
          leftSide: 'none',
          rightSide: 'none',
          leftWidth: 0,
          rightWidth: 0,
          bayCount: isAcama ? 4 : 5,
          baySpacing: 7.5,
          captures: {},
          photos: {}
        }
      ]
    },
    ombriere: {
      activeBuildingIndex: 0,
      buildings: [
        {
          id: 'omb-1',
          name: 'Ombrière 1',
          solutionType: 'ombriere',
          length: 45.0,
          width: 6.9,
          eaveHeight: 3.7,
          roofPitch: 10,
          buildingType: 'ombriere_vl_simple_gauche',
          leftSide: 'none',
          rightSide: 'none',
          leftWidth: 0,
          rightWidth: 0,
          bayCount: 6,
          baySpacing: 7.5,
          captures: {},
          photos: {}
        }
      ]
    },
    battery: {
      activeBuildingIndex: 0,
      buildings: [
        {
          id: 'bat-sa-1',
          name: 'Station Batteries Stand-Alone (500 kW)',
          solutionType: 'battery',
          length: 6.20,
          width: 3.20,
          eaveHeight: 2.38,
          roofPitch: 0,
          buildingType: 'battery_standalone',
          isBattery: true,
          hasSolar: false,
          bayCount: 4,
          baySpacing: 1.15,
          unitLength: 1.15,
          unitWidth: 1.44,
          unitHeight: 2.38,
          captures: {},
          photos: {}
        }
      ]
    }
  }));

  // Dérivation dynamique des bâtiments de la solution active
  const currentSolution = solutions[solutionType] || solutions.building;
  const buildings = currentSolution?.buildings || [];
  const activeBuildingIndex = currentSolution?.activeBuildingIndex || 0;

  // Setters encapsulés pour cibler strictement la solution active
  const setBuildings = useCallback((arg) => {
    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol) return prev;
      const nextBuildings = typeof arg === 'function' ? arg(curSol.buildings) : arg;
      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          buildings: nextBuildings
        }
      };
    });
  }, [solutionType]);

  const setActiveBuildingIndex = useCallback((idx) => {
    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol) return prev;
      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          activeBuildingIndex: typeof idx === 'function' ? idx(curSol.activeBuildingIndex) : idx
        }
      };
    });
  }, [solutionType]);

  const autoSaveTimerRef = useRef(null);

  const saveWizardState = useCallback((overrides = {}) => {
    if (!project?.id) return;

    const currentSol = (overrides.solutions || solutions)[overrides.solutionType || solutionType] || (overrides.solutions || solutions).building;
    const currentBuildings = currentSol?.buildings || [];
    const mergedEditedProject = {
      ...editedProject,
      ...(overrides.editedProject || {})
    };

    const stateToSave = {
      step: overrides.step !== undefined ? overrides.step : step,
      solutionType: overrides.solutionType || solutionType,
      solutions: overrides.solutions || solutions,
      editedProject: mergedEditedProject,
      noticeText: overrides.noticeText !== undefined ? overrides.noticeText : noticeText,
      isNoticeUserModified: overrides.isNoticeUserModified !== undefined ? overrides.isNoticeUserModified : isNoticeUserModified,
      selectedStructureIds: overrides.selectedStructureIds || selectedStructureIds,
      masseDistances: overrides.masseDistances || masseDistances,
      masseLockedMaps: overrides.masseLockedMaps || masseLockedMaps,
      selectedPages: overrides.selectedPages || selectedPages,
      additionalRoof: overrides.additionalRoof || additionalRoof,
      batteryStorage: overrides.batteryStorage || batteryStorage,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(`nelson_urbanisme_state_${project.id}`, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('[UrbanismeWizard] Failed to save localStorage state:', e);
    }

    if (typeof onUpdateProject === 'function') {
      const ed = mergedEditedProject;
      const flatUpdates = {
        urbanisme_saved_state: stateToSave,
        demandeur: ed.demandeur || ed.lastName || '',
        lastName: ed.lastName || ed.demandeur || '',
        firstName: ed.firstName || '',
        email: ed.email || '',
        email2: ed.email2 || 'contact@enr-courtage.fr',
        cerfaEmailChoice: ed.cerfaEmailChoice || 'email2',
        address: ed.address || '',
        clientAddress: ed.address || '',
        zip: ed.zip || '',
        city: ed.city || '',
        commune: ed.city || ed.commune || '',
        cadastre_commune: ed.cadastre_commune || ed.city || '',
        phone: ed.phone || '',
        birthDate: (ed.birthDate || '').replace(/\D/g, '').slice(0, 8),
        birthCity: ed.birthCity || '',
        birthDept: ed.birthDept || '',
        cadastre_section: ed.cadastre_section || '',
        cadastre_numero: ed.cadastre_numero || '',
        cadastre_surface: ed.cadastre_surface || '',
        pente_terrain: ed.pente_terrain || '',
        cotation_bati: ed.cotation_bati || '',
        cotation_voie: ed.cotation_voie || '',
        kwc: ed.kwc || '',
        puissance: ed.puissance || ed.kwc || '',
        objet_travaux: ed.objet_travaux || '',
        description: ed.description || ed.objet_travaux || '',
        noticeText: stateToSave.noticeText,
        solutions: stateToSave.solutions,
        buildings: currentBuildings,
        selectedStructureIds: stateToSave.selectedStructureIds,
        masseDistances: stateToSave.masseDistances,
        urbanisme_solutionType: stateToSave.solutionType,
        solutionType: stateToSave.solutionType
      };
      try {
        onUpdateProject(project.id, flatUpdates);
      } catch (err) {
        console.warn('[UrbanismeWizard] Error calling onUpdateProject:', err);
      }
    }
  }, [project?.id, step, solutionType, solutions, editedProject, noticeText, isNoticeUserModified, selectedStructureIds, masseDistances, masseLockedMaps, selectedPages, additionalRoof, batteryStorage, onUpdateProject]);

  const queueAutoSave = useCallback((overrides = {}) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (project?.id) {
      try {
        const minimalState = {
          step: overrides.step !== undefined ? overrides.step : step,
          solutionType: overrides.solutionType || solutionType,
          solutions: overrides.solutions || solutions,
          editedProject: { ...editedProject, ...(overrides.editedProject || {}) },
          noticeText: overrides.noticeText !== undefined ? overrides.noticeText : noticeText,
          isNoticeUserModified: overrides.isNoticeUserModified !== undefined ? overrides.isNoticeUserModified : isNoticeUserModified,
          selectedStructureIds: overrides.selectedStructureIds || selectedStructureIds,
          masseDistances: overrides.masseDistances || masseDistances,
          selectedPages: overrides.selectedPages || selectedPages,
          updatedAt: Date.now()
        };
        localStorage.setItem(`nelson_urbanisme_state_${project.id}`, JSON.stringify(minimalState));
      } catch (e) {}
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveWizardState(overrides);
    }, 350);
  }, [project?.id, step, solutionType, solutions, editedProject, noticeText, isNoticeUserModified, selectedStructureIds, masseDistances, selectedPages, saveWizardState]);

  const handleSafeClose = useCallback(() => {
    try {
      saveWizardState();
    } catch (e) {}
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [saveWizardState, onClose]);

  const getBuildingDisplayName = useCallback((buildingItem, idx) => {
    const isOmb = (buildingItem?.solutionType === 'ombriere') || (buildingItem?.buildingType || '').toLowerCase().startsWith('ombriere') || (solutionType === 'ombriere');
    const defaultPrefix = isOmb ? 'Ombrière' : 'Bâtiment';
    if (!buildingItem) return `${defaultPrefix} ${(idx || 0) + 1}`;

    const isCurrentActive = (idx === activeBuildingIndex) || (buildingItem?.id && buildings[activeBuildingIndex]?.id === buildingItem.id);

    const bLen = Number(buildingItem.length || (isCurrentActive && config?.length) || (buildingItem.bayCount ? buildingItem.bayCount * (buildingItem.baySpacing || 7.5) : 30));
    const bWid = Number(buildingItem.width || (isCurrentActive && config?.width) || 15);

    const curLeftSide = (buildingItem.leftSide && buildingItem.leftSide !== 'none')
      ? buildingItem.leftSide
      : (isCurrentActive && config?.leftSide && config?.leftSide !== 'none' ? config.leftSide : 'none');
    const curRightSide = (buildingItem.rightSide && buildingItem.rightSide !== 'none')
      ? buildingItem.rightSide
      : (isCurrentActive && config?.rightSide && config?.rightSide !== 'none' ? config.rightSide : 'none');

    const curLeftWidth = (curLeftSide !== 'none')
      ? Number(buildingItem.leftWidth !== undefined ? buildingItem.leftWidth : (isCurrentActive && config?.leftWidth !== undefined ? config.leftWidth : (curLeftSide === 'appentis' ? 9.3 : 4.0)))
      : 0;
    const curRightWidth = (curRightSide !== 'none')
      ? Number(buildingItem.rightWidth !== undefined ? buildingItem.rightWidth : (isCurrentActive && config?.rightWidth !== undefined ? config.rightWidth : (curRightSide === 'appentis' ? 9.3 : 4.0)))
      : 0;

    const totalWid = bWid + curLeftWidth + curRightWidth;

    // Si dimensions définies (ex: 60m x 27.2m)
    if (bLen > 0 && totalWid > 0) {
      const formattedWid = (totalWid % 1 === 0) ? totalWid.toFixed(0) : totalWid.toFixed(1);
      return `${defaultPrefix} ${bLen.toFixed(0)}m × ${formattedWid}m`;
    }
    
    if (buildingItem.name && buildingItem.name.toLowerCase().includes('batterie')) {
      return `${defaultPrefix} ${(idx || 0) + 1}`;
    }
    let name = buildingItem.name || `${defaultPrefix} ${(idx || 0) + 1}`;
    if (isOmb) {
      name = name.replace(/Bâtiment/gi, 'Ombrière');
    } else {
      name = name.replace(/Ombrière/gi, 'Bâtiment');
    }
    name = name.replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '').trim();
    return name || `${defaultPrefix} ${(idx || 0) + 1}`;
  }, [solutionType, activeBuildingIndex, buildings, config?.length, config?.width, config?.leftSide, config?.rightSide, config?.leftWidth, config?.rightWidth]);

  const allConfiguredStructures = useMemo(() => {
    const list = [];
    (solutions.building?.buildings || []).forEach((b, i) => {
      const bId = b.id ? (String(b.id).startsWith('bat-') ? String(b.id) : `bat-${b.id}`) : `bat-${i + 1}`;
      const isCurrentActive = solutionType === 'building' && activeBuildingIndex === i;

      const effectiveLen = isCurrentActive
        ? Number(config.length || (config.bayCount ? config.bayCount * (config.baySpacing || 7.5) : b.length || 30))
        : Number(b.length || 30);
      const effectiveWid = isCurrentActive
        ? Number(config.width || b.width || 15)
        : Number(b.width || 15);
      const effectiveType = isCurrentActive
        ? (config.buildingType || b.buildingType)
        : b.buildingType;
      const effectiveLeftSide = isCurrentActive
        ? (config.leftSide || b.leftSide || 'none')
        : (b.leftSide || 'none');
      const effectiveRightSide = isCurrentActive
        ? (config.rightSide || b.rightSide || 'none')
        : (b.rightSide || 'none');
      const effectiveLeftWidth = isCurrentActive
        ? (config.leftWidth ?? b.leftWidth ?? 0)
        : (b.leftWidth ?? 0);
      const effectiveRightWidth = isCurrentActive
        ? (config.rightWidth ?? b.rightWidth ?? 0)
        : (b.rightWidth ?? 0);

      const extLeft = effectiveLeftSide !== 'none' ? Number(effectiveLeftWidth || (effectiveLeftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extRight = effectiveRightSide !== 'none' ? Number(effectiveRightWidth || (effectiveRightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const effectiveTotalWid = effectiveWid + extLeft + extRight;

      const dynamicName = getBuildingDisplayName({
        ...b,
        length: effectiveLen,
        width: effectiveWid,
        leftSide: effectiveLeftSide,
        rightSide: effectiveRightSide,
        leftWidth: effectiveLeftWidth,
        rightWidth: effectiveRightWidth,
        solutionType: 'building'
      }, i);

      list.push({
        ...b,
        id: bId,
        name: dynamicName,
        length: effectiveLen,
        width: effectiveWid,
        totalWidth: effectiveTotalWid,
        buildingType: effectiveType,
        leftSide: effectiveLeftSide,
        rightSide: effectiveRightSide,
        leftWidth: effectiveLeftWidth,
        rightWidth: effectiveRightWidth,
        solutionKey: 'building',
        solutionLabel: isAcama ? 'Bâtiment Sur-mesure' : 'Bâtiment / Hangar',
        indexInSol: i
      });
    });

    if (!isAcama) {
      (solutions.ombriere?.buildings || []).forEach((b, i) => {
        const oId = b.id ? (String(b.id).startsWith('omb-') ? String(b.id) : `omb-${b.id}`) : `omb-${i + 1}`;
        const isCurrentActive = solutionType === 'ombriere' && activeBuildingIndex === i;

        const effectiveLen = isCurrentActive
          ? Number(config.length || (config.bayCount ? config.bayCount * (config.baySpacing || 7.5) : b.length || 45))
          : Number(b.length || 45);
        const effectiveWid = isCurrentActive
          ? Number(config.width || b.width || 6.9)
          : Number(b.width || 6.9);

        const dynamicName = getBuildingDisplayName({
          ...b,
          length: effectiveLen,
          width: effectiveWid,
          solutionType: 'ombriere'
        }, i);

        const effectiveType = isCurrentActive
          ? (config.buildingType || b.buildingType || 'ombriere_vl_simple_gauche')
          : (b.buildingType || 'ombriere_vl_simple_gauche');
        const effectivePitch = isCurrentActive
          ? Number(config.roofPitch || b.roofPitch || 10)
          : Number(b.roofPitch || 10);
        const effectiveEave = isCurrentActive
          ? Number(config.eaveHeight || b.eaveHeight || 3.7)
          : Number(b.eaveHeight || 3.7);

        list.push({
          ...b,
          id: oId,
          name: dynamicName,
          length: effectiveLen,
          width: effectiveWid,
          totalWidth: effectiveWid,
          buildingType: effectiveType,
          roofPitch: effectivePitch,
          eaveHeight: effectiveEave,
          solutionKey: 'ombriere',
          solutionLabel: 'Ombrière PV',
          indexInSol: i
        });
      });
    }

    if (!isNoBattery && solutions.battery?.buildings?.length > 0) {
      solutions.battery.buildings.forEach((b, i) => {
        const batId = b.id ? (String(b.id).startsWith('bat-sa-') ? String(b.id) : `bat-sa-${b.id}`) : `bat-sa-${i + 1}`;
        const isCurrentActive = solutionType === 'battery' && activeBuildingIndex === i;

        const effectiveLen = isCurrentActive
          ? Number(config.length || batteryStorage.dalleLength || b.length || 6.20)
          : Number(b.length || batteryStorage.dalleLength || 6.20);
        const effectiveWid = isCurrentActive
          ? Number(config.width || batteryStorage.dalleWidth || b.width || 3.20)
          : Number(b.width || batteryStorage.dalleWidth || 3.20);
        const effectiveHeight = isCurrentActive
          ? Number(config.eaveHeight || b.eaveHeight || 2.38)
          : Number(b.eaveHeight || 2.38);

        const dynamicName = b.name || `Station Batteries 500 kW (${effectiveLen.toFixed(1)}m × ${effectiveWid.toFixed(1)}m)`;

        list.push({
          ...b,
          id: batId,
          name: dynamicName,
          length: effectiveLen,
          width: effectiveWid,
          totalWidth: effectiveWid,
          eaveHeight: effectiveHeight,
          solutionKey: 'battery',
          solutionLabel: 'Station Batteries 500 kW',
          isBattery: true,
          indexInSol: i
        });
      });
    }
    return list;
  }, [solutions, isAcama, isNoBattery, solutionType, activeBuildingIndex, config, getBuildingDisplayName, batteryStorage]);

  // Structures strictement filtrées selon le type de solution actif
  const scopedStructures = useMemo(() => {
    return allConfiguredStructures.filter(str => {
      if (solutionType === 'battery') return str.solutionKey === 'battery' || str.isBattery;
      if (solutionType === 'ombriere') return str.solutionKey === 'ombriere';
      if (solutionType === 'building') return str.solutionKey === 'building' || (!str.solutionKey && !str.isBattery);
      return true;
    });
  }, [allConfiguredStructures, solutionType]);

  // Synchronisation des identifiants sélectionnés avec la solution active
  useEffect(() => {
    if (scopedStructures.length > 0) {
      setSelectedStructureIds(prev => {
        const validIds = scopedStructures.map(s => s.id);
        if (solutionType === 'battery') {
          return validIds.length > 0 ? validIds : ['bat-sa-1'];
        }
        if (prev && prev.length > 0) {
          const retained = prev.filter(id => validIds.includes(id));
          if (retained.length > 0) return retained;
        }
        return validIds;
      });
    }
  }, [scopedStructures, solutionType]);

  // Mise à jour de l'orientation d'une structure quelconque depuis Carte DP2/PC2
  const handleMasseRotationUpdate = useCallback((targetId, val) => {
    const numRot = Number(val);
    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      const solOrder = [solutionType, 'battery', 'ombriere', 'building'].filter((v, i, a) => a.indexOf(v) === i);
      for (const solKey of solOrder) {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : (solKey === 'battery' ? 'bat-sa-' : 'bat-')) ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-1`;
            return b.id === targetId || currentId === targetId || (solKey === 'battery' && solutionType === 'battery');
          });
          if (bIdx !== -1) {
            const nextList = [...nextSol[solKey].buildings];
            nextList[bIdx] = {
              ...nextList[bIdx],
              id: targetId,
              rotation: numRot,
            };
            nextSol[solKey] = { ...nextSol[solKey], buildings: nextList };
            updated = true;
            break;
          }
        }
      }

      return updated ? nextSol : prev;
    });

    if (String(targetId).startsWith('bat') || solutionType === 'battery') {
      setBatteryStorage(prev => ({ ...prev, rotation: numRot }));
      setEditedProject(prev => ({
        ...prev,
        rotation: numRot,
        batteryStorage: { ...(prev.batteryStorage || {}), rotation: numRot }
      }));
    }

    if (masseRotationDebounceRef.current) clearTimeout(masseRotationDebounceRef.current);
    masseRotationDebounceRef.current = setTimeout(() => {
      if (typeof captureStructureMasseMapRef.current === 'function') {
        captureStructureMasseMapRef.current(targetId, masseViewTabs[targetId] || 1);
      }
    }, 400);
  }, [solutionType, masseViewTabs]);

  // Mise à jour des coordonnées GPS d'une structure quelconque depuis Carte DP2/PC2
  const handleMasseGpsUpdate = useCallback((targetId, newLat, newLng) => {
    const numLat = Number(newLat);
    const numLng = Number(newLng);
    if (!numLat || !numLng || isNaN(numLat) || isNaN(numLng)) return;

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      const solOrder = [solutionType, 'battery', 'ombriere', 'building'].filter((v, i, a) => a.indexOf(v) === i);
      for (const solKey of solOrder) {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : (solKey === 'battery' ? 'bat-sa-' : 'bat-')) ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-1`;
            return b.id === targetId || currentId === targetId || (solKey === 'battery' && solutionType === 'battery');
          });
          if (bIdx !== -1) {
            const nextList = [...nextSol[solKey].buildings];
            nextList[bIdx] = {
              ...nextList[bIdx],
              id: targetId,
              lat: numLat,
              lng: numLng,
              gps: `${numLat},${numLng}`,
              masse_capture: null,
              masse_capture_2: null
            };
            nextSol[solKey] = { ...nextSol[solKey], buildings: nextList };
            updated = true;
            break;
          }
        }
      }

      return updated ? nextSol : prev;
    });
  }, [solutionType]);

  // Mise à jour du cadrage (centre et zoom) d'une structure quelconque depuis Carte DP2/PC2 (Vue 1 ou Vue 2)
  const handleMasseMapChange = useCallback((targetId, { centerLat, centerLng, zoom }, viewNum = 1) => {
    const numLat = Number(centerLat);
    const numLng = Number(centerLng);
    const numZoom = Number(zoom);
    if (!numLat || !numLng || isNaN(numLat) || isNaN(numLng)) return;

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      const solOrder = [solutionType, 'battery', 'ombriere', 'building'].filter((v, i, a) => a.indexOf(v) === i);
      for (const solKey of solOrder) {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : (solKey === 'battery' ? 'bat-sa-' : 'bat-')) ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-1`;
            return b.id === targetId || currentId === targetId || (solKey === 'battery' && solutionType === 'battery');
          });
          if (bIdx !== -1) {
            const nextList = [...nextSol[solKey].buildings];
            if (viewNum === 2) {
              nextList[bIdx] = {
                ...nextList[bIdx],
                id: targetId,
                masse_center_lat_2: numLat,
                masse_center_lng_2: numLng,
                masse_zoom_2: numZoom || 16,
                masse_capture_2: null
              };
            } else {
              nextList[bIdx] = {
                ...nextList[bIdx],
                id: targetId,
                masse_center_lat: numLat,
                masse_center_lng: numLng,
                masse_zoom: numZoom || 18,
                masse_capture: null
              };
            }
            nextSol[solKey] = { ...nextSol[solKey], buildings: nextList };
            updated = true;
            break;
          }
        }
      }

      return updated ? nextSol : prev;
    });
  }, [solutionType]);

  const handleGpsUpdate = useCallback((lat, lng) => {
    setEditedProject(prev => ({ ...prev, lat, lng, gps: `${lat},${lng}` }));
    setSolutions(prev => {
      const nextSolutions = { ...prev };
      let gIdx = 0;
      ['building', 'ombriere'].forEach(solKey => {
        if (nextSolutions[solKey]?.buildings) {
          nextSolutions[solKey] = {
            ...nextSolutions[solKey],
            buildings: nextSolutions[solKey].buildings.map(b => {
              const offLat = gIdx * 0.00015;
              const offLng = gIdx * 0.00020;
              gIdx++;
              return {
                ...b,
                lat: lat + offLat,
                lng: lng + offLng,
                gps: `${lat + offLat},${lng + offLng}`
              };
            })
          };
        }
      });
      return nextSolutions;
    });
    setBuildings(prev => {
      return prev.map((b, bIdx) => ({
        ...b,
        lat: lat + bIdx * 0.00015,
        lng: lng + bIdx * 0.00020,
        gps: `${lat + bIdx * 0.00015},${lng + bIdx * 0.00020}`
      }));
    });
    generateStaticMapImage(lat, lng, 'map', 16).then(ign => {
      if (ign) {
        setCaptures(c => ({ ...c, ign }));
        setEditedProject(p => ({ ...p, urbanisme_captures: { ...(p.urbanisme_captures || {}), ign } }));
      }
    });
    generateStaticMapImage(lat, lng, 'satellite', 17).then(satellite => {
      if (satellite) {
        setCaptures(c => ({ ...c, satellite }));
        setEditedProject(p => ({ ...p, urbanisme_captures: { ...(p.urbanisme_captures || {}), satellite } }));
      }
    });
    generateStaticMapImage(lat, lng, 'map', 19, buildings).then(masse => {
      if (masse) {
        setCaptures(c => ({ ...c, masse_projet: masse }));
        setEditedProject(p => ({ ...p, urbanisme_captures: { ...(p.urbanisme_captures || {}), masse_projet: masse } }));
      }
    });
  }, [buildings]);

  // Synchronisation stricte de toutes les structures avec l'adresse du site (Étape Déclarant)
  useEffect(() => {
    if (step === 0) {
      const siteCoords = resolveProjectCoordinates(editedProject, project);
      const refLat = siteCoords.lat;
      const refLng = siteCoords.lng;

      setSolutions(prev => {
        let hasChange = false;
        const nextSolutions = { ...prev };

        let gIdx = 0;
        ['building', 'ombriere', 'battery'].forEach(solKey => {
          if (nextSolutions[solKey]?.buildings) {
            const updated = nextSolutions[solKey].buildings.map(b => {
              const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null));
              const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null));
              const isOutOfSync = !bLat || !bLng || isNaN(bLat) || isNaN(bLng) ||
                Math.hypot(bLat - refLat, bLng - refLng) > 0.05 ||
                (Math.abs(bLat - 43.5612) < 0.001 && Math.abs(refLat - 43.5612) > 0.001);

              if (isOutOfSync) {
                hasChange = true;
                const offLat = gIdx * 0.00015;
                const offLng = gIdx * 0.00020;
                gIdx++;
                return {
                  ...b,
                  lat: refLat + offLat,
                  lng: refLng + offLng,
                  gps: `${refLat + offLat},${refLng + offLng}`
                };
              }
              gIdx++;
              return b;
            });
            nextSolutions[solKey] = { ...nextSolutions[solKey], buildings: updated };
          }
        });

        return hasChange ? nextSolutions : prev;
      });
    }
  }, [step, editedProject, project]);

  // Helper pour générer automatiquement la notice structurée en 5 points
  const buildAutoNoticeText = useCallback(() => {
    const projectCity = editedProject?.city || editedProject?.cadastre_commune || editedProject?.commune || editedProject?.ville || project?.city || project?.cadastre_commune || project?.commune || project?.ville || 'SAINT AVIT SAINT NAZAIRE';
    const projectZip = editedProject?.zip || editedProject?.zipCode || editedProject?.postalCode || editedProject?.code_postal || project?.zip || project?.zipCode || project?.postalCode || project?.code_postal || '33220';
    const projectAddress = editedProject?.address || editedProject?.clientAddress || editedProject?.siteAddress || editedProject?.street || editedProject?.adresse || project?.address || project?.clientAddress || project?.siteAddress || project?.street || project?.adresse || '2069 Route de la Catine';
    const rawSection = editedProject?.cadastre_section || editedProject?.cadastreSection || project?.cadastre_section || '';
    const rawNumero = editedProject?.cadastre_numero || editedProject?.cadastreNumero || editedProject?.cadastre_parcel || editedProject?.parcelle || project?.cadastre_numero || '000 B 633';
    const projectAltitude = editedProject?.altitude || project?.altitude || '140.62 m';

    const activeParcelles = (Array.isArray(editedProject?.parcelles) && editedProject.parcelles.length > 0)
      ? editedProject.parcelles
      : (Array.isArray(editedProject?.cadastre_parcelles) && editedProject.cadastre_parcelles.length > 0)
        ? editedProject.cadastre_parcelles
        : [{
            section: rawSection,
            numero: rawNumero,
            surface: editedProject?.cadastre_surface || project?.cadastre_surface || (editedProject?.surface_terrain || project?.surface_terrain || '18 384')
          }];

    const totalCalculatedSurface = activeParcelles.reduce((sum, p) => {
      const s = Number(String(p?.surface || '').replace(/\D/g, ''));
      return sum + (isNaN(s) ? 0 : s);
    }, 0);
    const totalSurfaceDisplay = totalCalculatedSurface > 0 ? `${totalCalculatedSurface} m²` : (activeParcelles[0]?.surface ? `${activeParcelles[0].surface} m²` : '18 384 m²');

    let cadastreNoticeTextBattery = '';
    let cadastreNoticeTextSolar = '';

    if (activeParcelles.length > 1) {
      const formattedList = activeParcelles.map(p => `${p.section ? `section ${p.section} ` : ''}n° ${p.numero || '—'}${p.surface ? ` (${p.surface} m²)` : ''}`).join(', ');
      cadastreNoticeTextBattery = `Références cadastrales : sections/parcelles ${formattedList} (surface totale : ${totalSurfaceDisplay}, altitude : ${projectAltitude})`;
      cadastreNoticeTextSolar = `Le terrain concerné par le projet concerne les parcelles cadastrées ${formattedList} (surface totale : ${totalSurfaceDisplay})`;
    } else {
      const p0 = activeParcelles[0] || {};
      const sec = (p0.section || rawSection).trim();
      const num = (p0.numero || rawNumero).trim();
      const refCad = `${sec ? `section ${sec} ` : ''}n° ${num || '—'}`.trim();
      const pSurf = p0.surface ? `${p0.surface} m²` : totalSurfaceDisplay;
      cadastreNoticeTextBattery = `Références cadastrales : Section/Parcelle ${refCad} (surface de la parcelle : ${pSurf}, altitude : ${projectAltitude})`;
      cadastreNoticeTextSolar = `Le terrain concerné par le projet est cadastré sous le numéro ${refCad} (surface : ${pSurf})`;
    }

    // Cas particulier : Projet de stockage d'énergie par batterie Stand-Alone (BESS)
    if (!isAcama && solutionType === 'battery') {
      const pQty = batteryStorage.quantity || 4;
      const pModel = batteryStorage.model || 'CESC Mercury 261';
      const pPower = batteryStorage.powerKw || 500;
      const pCap = batteryStorage.capacityKwh || 1044;
      const pDalleL = batteryStorage.dalleLength || 6.20;
      const pDalleW = batteryStorage.dalleWidth || 3.20;
      const pFootprintArea = (pDalleL * pDalleW).toFixed(2);

      return `1- OBJET DE LA DEMANDE
La présente demande porte sur l'installation d'une station de stockage d'énergie par batteries Stand-Alone (Puissance nominale : ${pPower} kW) sur dalle béton avec clôture rigide, d'une capacité de ${pCap} kWh (${pQty} armoires ${pModel}). L'emprise au sol totale est strictement inférieure à 20 m² (${pFootprintArea} m²), soumise au régime de la Déclaration Préalable de travaux (DP).

2- LE SITE
Le projet s'implante sur la commune de ${projectCity} (${projectZip}), à l'adresse : ${projectAddress}. ${cadastreNoticeTextBattery}.
Le site dispose d'un accès sécurisé pour les interventions techniques et les services d'incendie et de secours (SDIS).

3- LE PROJET
Le projet comprend :
- L'implantation de ${pQty} armoires techniques de stockage d'énergie (Modèle ${pModel}, dimensions unitaires : 1.15m (L) × 1.44m (P) × 2.38m (H), teinte sobre gris clair / blanc industriel),
- La réalisation d'une dalle en béton armé dédiée de ${Number(pDalleL).toFixed(2)}m × ${Number(pDalleW).toFixed(2)}m (surface : ${pFootprintArea} m² < 20 m²),
- La pose d'une clôture rigide grillagée périphérique (hauteur 2.00m) ceinturant la dalle béton avec portillon d'accès de sécurité.

4- RACCORDEMENT AUX RESEAUX
L'installation est raccordée au réseau public de distribution d'électricité ENEDIS. Le dispositif est totalement autonome, statique, silencieux et ne requiert aucun raccordement aux réseaux d'eau ni d'assainissement collectif.

5- SECURITE INCENDIE & PRESCRIPTIONS SDIS
L'installation intègre tous les dispositifs de sécurité et répond strictement aux préconisations SDIS :
- Système de gestion thermique avancé avec détection précoce asservie et dispositif d'extinction d'urgence intégré aux armoires,
- Dispositif de coupure générale d'urgence accessible aux services de secours,
- Rétention étanche sous dalle assurant la sécurité environnementale,
- Respect des distances d'isolement réglementaires vis-à-vis des tiers.`;
    }
    
    // Liste des structures retenues par l'utilisateur à l'étape Carte DP2 / PC2
    const retainedStructures = allConfiguredStructures.filter(s => selectedStructureIds.includes(s.id));
    const activeList = retainedStructures.length > 0 ? retainedStructures : (allConfiguredStructures.length > 0 ? allConfiguredStructures : buildings);

    const rawKwc = editedProject?.kwc || editedProject?.puissance || editedProject?.projectSize || project?.kwc || project?.puissance || project?.projectSize;
    const isValidKwc = rawKwc !== undefined && rawKwc !== null && rawKwc !== '' && rawKwc !== '0' && !isNaN(Number(rawKwc)) && Number(rawKwc) > 0;
    const displayKwc = isValidKwc ? String(Number(rawKwc)) : '';

    let totalGlobalSurface = 0;
    activeList.forEach(s => {
      const sL = Number(s.length || (s.bayCount ? s.bayCount * (s.baySpacing || 7.5) : 30));
      const sMainW = Number(s.width || 15);
      const extL = (s.leftSide && s.leftSide !== 'none') ? Number(s.leftWidth || (s.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extR = (s.rightSide && s.rightSide !== 'none') ? Number(s.rightWidth || (s.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const sTotalW = s.totalWidth || (sMainW + extL + extR);
      totalGlobalSurface += (sL * sTotalW);
    });

    const batCount = activeList.filter(s => s.solutionKey === 'building').length;
    const ombCount = activeList.filter(s => s.solutionKey === 'ombriere').length;

    let structSummary = '';
    if (batCount > 0 && ombCount > 0) {
      structSummary = `${batCount} bâtiment${batCount > 1 ? 's' : ''} et ${ombCount} ombrière${ombCount > 1 ? 's' : ''} photovoltaïque${ombCount > 1 ? 's' : ''}`;
    } else if (ombCount > 0) {
      structSummary = `${ombCount} ${ombCount > 1 ? 'ombrières photovoltaïques' : 'ombrière photovoltaïque'}`;
    } else {
      structSummary = `${batCount} structure${batCount > 1 ? 's' : ''}`;
    }

    let objetDemande = isDP
      ? `La demande de déclaration préalable porte sur la réalisation d'un projet comprenant ${structSummary} (${totalGlobalSurface.toFixed(2)} m²)${additionalRoof.enabled ? ` et l'équipement d'une toiture existante de ${additionalRoof.surface} m²` : ''}${(!isNoBattery && batteryStorage.enabled) ? ` ainsi qu'un système de stockage batterie stationnaire de ${batteryStorage.capacityKwh} kWh` : ''}.`
      : `La demande de permis de construire porte sur la réalisation d'un projet comprenant ${structSummary} (${totalGlobalSurface.toFixed(2)} m²)${additionalRoof.enabled ? ` et l'équipement d'une toiture existante de ${additionalRoof.surface} m²` : ''}${(!isNoBattery && batteryStorage.enabled) ? ` ainsi qu'un système de stockage batterie stationnaire de ${batteryStorage.capacityKwh} kWh` : ''}.`;

    let batimentDesc = '';
    activeList.forEach((s, idx) => {
      const sL = Number(s.length || (s.bayCount ? s.bayCount * (s.baySpacing || 7.5) : (config.length || 30)));
      const sMainW = Number(s.width || config.width || 15);
      const extL = (s.leftSide && s.leftSide !== 'none') ? Number(s.leftWidth || (s.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extR = (s.rightSide && s.rightSide !== 'none') ? Number(s.rightWidth || (s.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const sTotalW = s.totalWidth || (sMainW + extL + extR);
      const sSurf = (sL * sTotalW).toFixed(2);
      const isOmb = s.solutionKey === 'ombriere' || (s.buildingType || '').toLowerCase().startsWith('ombriere');
      const sType = s.buildingType || (isOmb ? 'ombriere_vl_simple_gauche' : 'asymetrique_1');
      const sRot = Number(s.rotation || 0);
      const rotLabel = getOrientationLabel(sRot);
      const sPitch = Number(s.roofPitch || (sType.startsWith('asym') ? 15 : 10));
      const sEave = Number(s.eaveHeight || (sType.startsWith('asym') ? 4.0 : (sType === 'ombriere_pl' ? 5.08 : (isOmb ? 3.7 : 5.5))));
      const sBays = Number(s.bayCount || (isOmb ? 6 : 5));
      const sSpacing = Number(s.baySpacing || 7.5);

      const isMono = String(sType).toLowerCase() === 'monopente' || String(sType).toLowerCase().includes('simple') || String(sType).toLowerCase().includes('mono');
      const roofSlopeType = isMono ? 'toiture monopente' : 'toiture bipente';

      let extDesc = '';
      if (extL > 0 && extR > 0) {
        extDesc = ` (dont ${sMainW.toFixed(2)}m principal + ${extL.toFixed(2)}m extension gauche + ${extR.toFixed(2)}m extension droite)`;
      } else if (extL > 0) {
        extDesc = ` (dont ${sMainW.toFixed(2)}m principal + ${extL.toFixed(2)}m ${s.leftSide === 'appentis' ? 'appentis gauche' : 'auvent gauche'})`;
      } else if (extR > 0) {
        extDesc = ` (dont ${sMainW.toFixed(2)}m principal + ${extR.toFixed(2)}m ${s.rightSide === 'appentis' ? 'appentis droit' : 'auvent droit'})`;
      }

      const sName = getBuildingDisplayName({
        ...s,
        length: sL,
        width: sMainW,
        leftSide: s.leftSide,
        rightSide: s.rightSide,
        leftWidth: extL,
        rightWidth: extR
      }, idx);

      const pwrForStruct = displayKwc || (sTotalW * sL * 0.223235).toFixed(2);

      if (idx === 0) {
        if (isOmb) {
          batimentDesc = `Le projet a pour objet l'implantation d'une ombrière photovoltaïque (${sName}) de dimensions ${sL.toFixed(2)}m × ${sTotalW.toFixed(2)}m (surface couverte : ${sSurf} m²), orientée ${rotLabel} (${sRot}°), à structure métallique autoportante en Y/V (RAL 7016) avec ${roofSlopeType} inclinée à ${sPitch}°, permettant d'abriter l'activité de l'exploitant tout en produisant de l'électricité solaire${pwrForStruct ? `, développant une puissance installée de ${pwrForStruct} kWc` : ''}.`;
        } else {
          batimentDesc = `Le projet a pour objet la construction d'un bâtiment agricole à charpente métallique (${sName}) de forme rectangulaire (longueur : ${sL.toFixed(2)}m, largeur : ${sTotalW.toFixed(2)}m${extDesc}, hauteur sablière : ${sEave.toFixed(2)}m, surface couverte : ${sSurf} m²), orienté ${rotLabel} (${sRot}°), en structure métallique (RAL 7016 / 7005), composé de ${sBays} travées de ${sSpacing}m d'entraxe. La toiture sera constituée d'une couverture avec ${roofSlopeType} en bac acier anti-condensation (RAL 7016) et panneaux solaires photovoltaïques intégrés (RAL 9005)${pwrForStruct ? `, développant une puissance installée de ${pwrForStruct} kWc` : ''}.`;
        }
      } else {
        if (isOmb) {
          batimentDesc += `\nIl comprend également l'implantation d'une ombrière photovoltaïque (${sName}) de dimensions ${sL.toFixed(2)}m × ${sTotalW.toFixed(2)}m (surface couverte : ${sSurf} m²), orientée ${rotLabel} (${sRot}°), à structure métallique en Y/V avec ${roofSlopeType} inclinée à ${sPitch}°.`;
        } else {
          batimentDesc += `\nIl comprend également la construction d'un bâtiment (${sName}) de dimensions ${sL.toFixed(2)}m × ${sTotalW.toFixed(2)}m${extDesc} d'une emprise au sol de ${sSurf} m² (hauteur sablière : ${sEave.toFixed(2)}m, pente : ${sPitch}°, orienté ${rotLabel} ${sRot}°) en structure métallique similaire.`;
        }
      }
    });

    if (additionalRoof.enabled) {
      batimentDesc += `\nLe projet intègre par ailleurs l'équipement photovoltaïque d'une toiture existante (${additionalRoof.name}) d'une surface de ${additionalRoof.surface} m² développant ${additionalRoof.kwc} kWc supplémentaires en couverture ${additionalRoof.roofType}.`;
    }

    if (!isNoBattery && batteryStorage.enabled) {
      batimentDesc += `\nLe site sera également équipé d'un système de stockage d'énergie par batterie stationnaire (${batteryStorage.quantity} unité(s) ${batteryStorage.model}) d'une capacité de ${batteryStorage.capacityKwh} kWh (${batteryStorage.powerKw} kW) implantée sur une dalle béton dédiée (${batteryStorage.footprint}).`;
    }

    const p3Details = (!isAcama && isDP)
      ? `Cette ombrière sera ouverte et non close. Les façades Est, Ouest, Nord et Sud seront ouvertes.\nUn terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.\nDes tranchées drainantes seront réalisées tout autour de l'ombrière projet afin d'évacuer les eaux pluviales par infiltration dans le sol.`
      : `Ce bâtiment sera ouvert et non clos. Les façades Est, Ouest, Nord et Sud seront ouvertes.\nUn terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.\nDes tranchées drainantes seront réalisées tout autour du bâtiment projet afin d'évacuer les eaux pluviales par infiltration dans le sol.`;

    const p4Details = (!isAcama && isDP)
      ? `L'ombrière ne sera pas raccordée aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.`
      : `Le bâtiment ne sera pas raccordé aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.`;

    const hasSdis = Boolean(sdisPoint || editedProject?.sdisPoint || project?.sdisPoint);

    const p5Details = hasSdis
      ? "Une borne SDIS est présente à proximité immédiate du terrain sur lequel est réalisée l'installation (CF. emplacement carte DP2)."
      : ((!isAcama && isDP)
          ? `Une bâche à eau de 120m³ sera installée à proximité immédiate de la future ombrière. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées.`
          : `Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées.`);

    return `1- OBJET DE LA DEMANDE
${objetDemande}

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. ${cadastreNoticeTextSolar}. Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
${batimentDesc}
${p3Details}

4- RACCORDEMENT AUX RESEAUX
${p4Details}
Seule l'électricité produite par la centrale photovoltaïque${(!isNoBattery && batteryStorage.enabled) ? ' et le système de stockage batterie' : ''} est renvoyée dans le réseau ENEDIS via un point de livraison situé sur la parcelle au Sud de la parcelle (PDL).
L'emplacement du point de livraison indiqué dans les pièces graphiques de l'autorisation d'urbanisme n'apparaît qu'à titre indicatif.
Le positionnement du point de livraison et d'un transformateur (le cas échéant) demeure à l'appréciation finale du gestionnaire de réseau en fonction du site et des équipements déjà existants.

5- SECURITE INCENDIE
${p5Details}${(!isNoBattery && batteryStorage.enabled) ? `\nLe système de stockage batterie est équipé de ses dispositifs de sécurité autonomes conformes aux prescriptions SDIS (détection thermique, coupure automatique d'urgence, système d'extinction dédié et bac de rétention).` : ''}`;
  }, [editedProject, project, config, buildings, additionalRoof, batteryStorage, isDP, solutionType, getBuildingDisplayName, isNoBattery, isAcama, sdisPoint]);

  // Générateur dynamique du texte détaillé pour "Objet des travaux" (Page de garde)
  const defaultObjetTravauxText = useMemo(() => {
    if (isBatActive) {
      return "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV.";
    }

    const retainedStructures = allConfiguredStructures.filter(s => selectedStructureIds.includes(s.id));
    const activeList = retainedStructures.length > 0 ? retainedStructures : (allConfiguredStructures.length > 0 ? allConfiguredStructures : buildings);
    const s0 = activeList[0] || {};

    const sL = Number(s0.length || (s0.bayCount ? s0.bayCount * (s0.baySpacing || 7.5) : (config.length || 75)));
    const sMainW = Number(s0.width || config.width || 22.3);
    const extL = (s0.leftSide && s0.leftSide !== 'none') ? Number(s0.leftWidth || (s0.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
    const extR = (s0.rightSide && s0.rightSide !== 'none') ? Number(s0.rightWidth || (s0.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
    const extTotal = extL + extR;
    const sTotalW = s0.totalWidth || (sMainW + extTotal);
    const sSurf = Math.round(sL * sTotalW) || 2370;

    let extDetail = '';
    if (extL > 0 && extR > 0) {
      extDetail = ` (dont ${sMainW.toFixed(2).replace(/\.00$/, '')}m principal + ${extL.toFixed(2).replace(/\.00$/, '')}m appentis gauche + ${extR.toFixed(2).replace(/\.00$/, '')}m appentis droit)`;
    } else if (extTotal > 0) {
      extDetail = ` (dont ${sMainW.toFixed(2).replace(/\.00$/, '')}m principal + ${extTotal.toFixed(2).replace(/\.00$/, '')}m appentis)`;
    }

    const rawKwc = editedProject?.kwc || editedProject?.puissance || editedProject?.projectSize || project?.kwc || project?.puissance || project?.projectSize || 499;
    const kwc = Number(rawKwc) > 0 ? Number(rawKwc) : 499;

    const panelWatt = 465;
    const panelCount = editedProject?.panelCount || Math.round((kwc * 1000) / panelWatt) || 1073;
    const panelDim = "1762 x 1134 mm";

    const isOmb = solutionType === 'ombriere' || (s0.buildingType || '').toLowerCase().includes('ombriere') || isDP;

    if (isOmb) {
      return `Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire de dimensions ${sL.toFixed(1).replace(/\.0$/, '')}m x ${sTotalW.toFixed(1).replace(/\.0$/, '')}m soit ${sSurf}m² de surface${extDetail} ouverte sur les 4 côtés.\nLa puissance totale installée en toiture sera de ${kwc} kWc. Le bac acier qui sera installé en toiture sous les modules photovoltaïques sera de RAL7016. Les panneaux photovoltaïques prévus sont noirs avec un encadrement noir.\nLes dimensions des panneaux sont de ${panelDim} pour une puissance unitaire de ${panelWatt} Wc soit ${panelCount} panneaux photovoltaïques seront installés en toiture sur les 2 pans de l'ombrière.`;
    } else {
      return `Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque de dimensions ${sL.toFixed(1).replace(/\.0$/, '')}m x ${sTotalW.toFixed(1).replace(/\.0$/, '')}m soit ${sSurf}m² de surface couverte${extDetail}.\nLa puissance totale installée en toiture sera de ${kwc} kWc. Le bac acier qui sera installé en toiture sous les modules photovoltaïques sera de RAL7016. Les panneaux photovoltaïques prévus sont noirs avec un encadrement noir.\nLes dimensions des panneaux sont de ${panelDim} pour une puissance unitaire de ${panelWatt} Wc soit ${panelCount} panneaux photovoltaïques seront installés en toiture sur les 2 pans du bâtiment.`;
    }
  }, [isBatActive, allConfiguredStructures, selectedStructureIds, buildings, config, editedProject, project, solutionType, isDP]);

  // Mise à jour explicite du bâtiment actif (Single Source of Truth par onglet)
  const updateActiveBuilding = useCallback((updates) => {
    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol || !curSol.buildings[curSol.activeBuildingIndex]) return prev;
      const nextBuildings = [...curSol.buildings];
      const cur = nextBuildings[curSol.activeBuildingIndex];
      const merged = { ...cur, ...updates };
      if (updates.bayCount !== undefined || updates.baySpacing !== undefined) {
        const bc = updates.bayCount !== undefined ? updates.bayCount : (cur.bayCount || 5);
        const bs = updates.baySpacing !== undefined ? updates.baySpacing : (cur.baySpacing || 7.5);
        merged.length = bc * bs;
      }
      nextBuildings[curSol.activeBuildingIndex] = merged;
      useConfiguratorStore.getState().loadBuildingConfig(merged);
      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          buildings: nextBuildings
        }
      };
    });
  }, [solutionType]);

  // Bascule étanche entre les solutions ("Bâtiment / Hangar" vs "Ombrière PV")
  const handleSwitchSolution = (newSolType) => {
    if (newSolType === solutionType) return;

    isSwitchingBuildingRef.current = true;
    
    const outgoingSol = solutions[solutionType];
    const outgoingB = outgoingSol?.buildings?.[outgoingSol?.activeBuildingIndex || 0] || outgoingSol?.buildings?.[0];

    // 1. Sauvegarder l'état 3D courant dans le bâtiment actif de la solution SORTANTE
    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol) return prev;
      const nextBuildings = [...curSol.buildings];
      const curB = nextBuildings[curSol.activeBuildingIndex];
      if (curB) {
        nextBuildings[curSol.activeBuildingIndex] = {
          ...curB,
          width: config.width,
          length: config.length,
          eaveHeight: config.eaveHeight,
          roofPitch: config.roofPitch,
          buildingType: config.buildingType,
          bayCount: config.bayCount,
          baySpacing: config.baySpacing,
          leftSide: config.leftSide || 'none',
          rightSide: config.rightSide || 'none',
          leftWidth: config.leftWidth,
          rightWidth: config.rightWidth,
          hasSolar: config.hasSolar,
          solarStats: config.solarStats,
        };
      }
      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          buildings: nextBuildings
        }
      };
    });

    // 2. Basculer le type de solution et enregistrer dans le state global du dossier
    setSolutionType(newSolType);

    if (newSolType === 'battery') {
      const siteCoords = resolveProjectCoordinates(editedProject, project);
      const refLat = outgoingB?.lat || project?.lat || siteCoords.lat;
      const refLng = outgoingB?.lng || project?.lng || siteCoords.lng;

      setEditedProject(prev => ({
        ...prev,
        solutionType: 'battery',
        urbanisme_solutionType: 'battery',
        type: 'battery',
        urbanismeType: 'Station Batteries Stand-Alone',
        typeLabel: 'Station Batteries Stand-Alone',
        installationType: 'Station Batteries Stand-Alone',
        isBattery: true,
        isBatteryStandAlone: true,
        objet_travaux: "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV.",
        description: "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV.",
      }));

      setSolutions(sPrev => {
        const curBat = sPrev.battery?.buildings?.[0];
        return {
          ...sPrev,
          battery: {
            ...sPrev.battery,
            buildings: [{
              ...(curBat || {}),
              id: 'bat-sa-1',
              name: 'Station Batteries Stand-Alone (500 kW)',
              solutionType: 'battery',
              isBattery: true,
              buildingType: 'battery_standalone',
              length: 6.20,
              width: 3.20,
              eaveHeight: 2.38,
              lat: curBat?.lat || refLat,
              lng: curBat?.lng || refLng,
              gps: `${curBat?.lat || refLat},${curBat?.lng || refLng}`
            }]
          }
        };
      });

      setBatteryStorage(prev => ({
        ...prev,
        enabled: true,
        name: 'Station Batteries Stand-Alone (500 kW)',
        model: 'CESC Mercury 261',
        quantity: 4,
        powerKw: 500,
        capacityKwh: 1044,
        dalleLength: 6.20,
        dalleWidth: 3.20,
        footprint: '6.20m × 3.20m (19.84 m²)'
      }));
      setSelectedStructureIds(['bat-sa-1']);
    } else if (newSolType === 'ombriere') {
      const ombCount = solutions.ombriere?.buildings?.length || 1;
      const ombTypeStr = ombCount > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque';
      setEditedProject(prev => ({
        ...prev,
        solutionType: 'ombriere',
        urbanisme_solutionType: 'ombriere',
        type: 'ombriere',
        urbanismeType: ombTypeStr,
        typeLabel: ombTypeStr,
        installationType: 'Ombrières photovoltaïques',
        isBattery: false,
        isBatteryStandAlone: false,
        objet_travaux: "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire",
        description: "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire",
      }));
      setBatteryStorage(prev => ({ ...prev, enabled: false }));
      const targetSol = solutions.ombriere;
      const solIds = (targetSol?.buildings || []).map((b, i) => b.id || `omb-${i + 1}`);
      if (solIds.length > 0) {
        setSelectedStructureIds(solIds);
      }
    } else {
      const bTypeStr = isAcama ? 'Bâtiment photovoltaïque' : 'Bâtiment et Ombrière';
      setEditedProject(prev => ({
        ...prev,
        solutionType: 'building',
        urbanisme_solutionType: 'building',
        type: 'batiment_solaire',
        urbanismeType: bTypeStr,
        typeLabel: bTypeStr,
        installationType: bTypeStr,
        isBattery: false,
        isBatteryStandAlone: false,
        objet_travaux: "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque",
        description: "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque",
      }));
      setBatteryStorage(prev => ({ ...prev, enabled: false }));
      const targetSol = solutions.building;
      const solIds = (targetSol?.buildings || []).map((b, i) => b.id || `bat-${i + 1}`);
      if (solIds.length > 0) {
        setSelectedStructureIds(solIds);
      }
    }

    // 3. Charger fidèlement le bâtiment actif de la solution ENTRANTE dans le store 3D
    const targetSol = solutions[newSolType];
    const targetIdx = targetSol?.activeBuildingIndex || 0;
    const targetB = targetSol?.buildings[targetIdx] || targetSol?.buildings[0];
    if (targetB) {
      lastActiveBuildingIdxRef.current = targetIdx;
      useConfiguratorStore.getState().loadBuildingConfig(targetB);
    }

    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  // Gestion des sous-onglets rattachés strictement à la solution active
  const handleAddBuilding = () => {
    isSwitchingBuildingRef.current = true;
    const isOmb = solutionType === 'ombriere';
    const newIdx = buildings.length + 1;
    const siteCoords = resolveProjectCoordinates(editedProject, project);
    const projLat = siteCoords.lat;
    const projLng = siteCoords.lng;

    const bLen = isOmb ? 45.0 : (isAcama ? 30 : 37.5);
    const bWid = isOmb ? 6.9 : (isAcama ? 15.0 : 16.4);
    const newBuilding = {
      id: `${isOmb ? 'omb' : 'bat'}-${Date.now()}`,
      name: isOmb ? `Ombrière ${newIdx}` : `Bâtiment ${newIdx} (${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m)`,
      solutionType: solutionType,
      length: bLen,
      width: bWid,
      eaveHeight: isOmb ? 3.7 : (isAcama ? 4.0 : 4.0),
      roofPitch: isOmb ? 10 : (isAcama ? 10 : 15),
      buildingType: isOmb ? 'ombriere_vl_simple_gauche' : (isAcama ? 'symetrique' : 'asymetrique_1'),
      leftSide: 'none',
      rightSide: 'none',
      bayCount: isOmb ? 6 : (isAcama ? 4 : 5),
      baySpacing: 7.5,
      leftWidth: 0,
      rightWidth: 0,
      hasSolar: true,
      lat: projLat,
      lng: projLng,
      gps: `${projLat},${projLng}`,
      rotation: 0,
      captures: {},
      photos: {}
    };

    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol) return prev;
      const nextBuildings = [...curSol.buildings];
      if (nextBuildings[activeBuildingIndex]) {
        nextBuildings[activeBuildingIndex] = {
          ...nextBuildings[activeBuildingIndex],
          width: config.width,
          length: config.length,
          eaveHeight: config.eaveHeight,
          roofPitch: config.roofPitch,
          buildingType: config.buildingType,
          bayCount: config.bayCount,
          baySpacing: config.baySpacing,
          leftSide: config.leftSide || 'none',
          rightSide: config.rightSide || 'none',
          leftWidth: config.leftWidth,
          rightWidth: config.rightWidth,
          hasSolar: config.hasSolar,
          solarStats: config.solarStats,
        };
      }
      nextBuildings.push(newBuilding);
      const newPos = nextBuildings.length - 1;
      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          activeBuildingIndex: newPos,
          buildings: nextBuildings
        }
      };
    });

    setSelectedStructureIds(prev => [...prev, newBuilding.id]);
    lastActiveBuildingIdxRef.current = buildings.length;
    useConfiguratorStore.getState().loadBuildingConfig(newBuilding);

    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  const handleSelectBuilding = (index) => {
    if (index === activeBuildingIndex || !buildings[index]) return;

    isSwitchingBuildingRef.current = true;
    
    // Sauvegarder la configuration courante sur l'ancien sous-onglet avant bascule
    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol) return prev;
      const nextBuildings = [...curSol.buildings];
      if (nextBuildings[activeBuildingIndex]) {
        nextBuildings[activeBuildingIndex] = {
          ...nextBuildings[activeBuildingIndex],
          width: config.width,
          length: config.length,
          eaveHeight: config.eaveHeight,
          roofPitch: config.roofPitch,
          buildingType: config.buildingType,
          bayCount: config.bayCount,
          baySpacing: config.baySpacing,
          leftSide: config.leftSide || 'none',
          rightSide: config.rightSide || 'none',
          leftWidth: config.leftWidth,
          rightWidth: config.rightWidth,
          hasSolar: config.hasSolar,
          solarStats: config.solarStats,
        };
      }
      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          activeBuildingIndex: index,
          buildings: nextBuildings
        }
      };
    });

    const target = buildings[index];
    lastActiveBuildingIdxRef.current = index;
    useConfiguratorStore.getState().loadBuildingConfig(target);

    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  const handleRemoveBuilding = (index, e) => {
    e.stopPropagation();
    if (buildings.length <= 1) return;
    const removedId = buildings[index]?.id;

    isSwitchingBuildingRef.current = true;
    const updated = buildings.filter((_, i) => i !== index);
    const nextIdx = Math.min(activeBuildingIndex, updated.length - 1);

    setSolutions(prev => ({
      ...prev,
      [solutionType]: {
        ...prev[solutionType],
        activeBuildingIndex: nextIdx,
        buildings: updated
      }
    }));

    if (removedId) {
      setSelectedStructureIds(prev => prev.filter(id => id !== removedId));
    }

    lastActiveBuildingIdxRef.current = nextIdx;
    const first = updated[nextIdx] || updated[0];
    if (first) {
      useConfiguratorStore.getState().loadBuildingConfig(first);
    }
    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  // Modales
  const [cropModal, setCropModal] = useState({ open: false, src: null, category: null, key: null, title: '' });
  const [landscapeModalOpen, setLandscapeModalOpen] = useState(false);
  const [batteryLandscapeModalOpen, setBatteryLandscapeModalOpen] = useState(false);

  const dossierInfo = DOSSIER_INFO[type] || DOSSIER_INFO.pc;

  // Synchronisation du projet initial à l'ouverture (exécutée uniquement à l'ouverture ou changement de projet)
  useEffect(() => {
    if (!isOpen || !project) {
      if (!isOpen) {
        hasInitializedRef.current = false;
      }
      return;
    }

    if (hasInitializedRef.current && prevProjectIdRef.current === project.id) {
      return;
    }
    hasInitializedRef.current = true;
    prevProjectIdRef.current = project.id;

    let savedState = null;
    try {
      const localRaw = localStorage.getItem(`nelson_urbanisme_state_${project.id}`);
      if (localRaw) {
        savedState = JSON.parse(localRaw);
      }
    } catch (e) {
      console.warn('[UrbanismeWizard] Failed to parse local state:', e);
    }
    if (project?.urbanisme_saved_state) {
      if (!savedState || (project.urbanisme_saved_state.updatedAt && project.urbanisme_saved_state.updatedAt > (savedState.updatedAt || 0))) {
        savedState = project.urbanisme_saved_state;
      }
    }

    if (savedState?.selectedPages) {
      setSelectedPages(prev => ({ ...prev, ...savedState.selectedPages }));
    }
    if (savedState?.masseDistances) {
      setMasseDistances(savedState.masseDistances);
    }
    if (savedState?.masseLockedMaps) {
      setMasseLockedMaps(savedState.masseLockedMaps);
    }
    if (savedState?.additionalRoof) {
      setAdditionalRoof(savedState.additionalRoof);
    }
    if (savedState?.batteryStorage) {
      setBatteryStorage(savedState.batteryStorage);
    }

    const names = resolveDemandeurNames(project);
    const cleanDemandeur = names.lastName || project.name || '';
    const projEmail = project.email || project.clientEmail || project.contactEmail || project.client_email || 'isabelle.dupond@gmail.com';
    const projAddress = project.address || project.clientAddress || project.projectAddress || project.siteAddress || project.street || project.adresse || '';
    const projZip = project.zip || project.postalCode || project.code_postal || project.clientZip || '';
    const projCity = project.city || project.commune || project.clientCity || project.cadastre_commune || '';

    let detectedSolutionType;
    if (savedState?.solutionType) {
      detectedSolutionType = savedState.solutionType;
    } else {
      const rawType = String(project?.type || project?.installationType || project?.projectType || project?.type_projet || project?.urbanismeType || '').toLowerCase();
      if (!isNoBattery && (rawType.includes('batterie') || rawType.includes('battery') || project?.isBatteryStandAlone === 'Oui' || project?.isBatteryStandAlone === true)) {
        detectedSolutionType = 'battery';
      } else if (rawType.includes('batiment') || rawType.includes('bâtiment') || rawType.includes('hangar')) {
        detectedSolutionType = 'building';
      } else if (rawType.includes('ombriere') || rawType.includes('ombrière')) {
        detectedSolutionType = 'ombriere';
      } else {
        detectedSolutionType = isDP ? 'ombriere' : 'building';
      }
    }
    setSolutionType(detectedSolutionType);

    const isBatteryProject = !isNoBattery && detectedSolutionType === 'battery';

    let parsedBatteryQty = 4;
    const projectCombinedStr = `${project?.project || ''} ${project?.name || ''} ${project?.nom || ''} ${project?.description || ''}`;
    const qMatch = projectCombinedStr.match(/x\s*(\d+)/i) || projectCombinedStr.match(/(\d+)\s*(?:batterie|battery|containers?|unit[eé]s?|armoires?)/i);
    if (qMatch && Number(qMatch[1]) > 0) {
      parsedBatteryQty = Number(qMatch[1]);
    } else if (Number(project?.battery_quantity) > 0) {
      parsedBatteryQty = Number(project.battery_quantity);
    }

    const parsedBatteryPower = Number(project?.kwc || project?.puissance || project?.projectSize || (parsedBatteryQty * 125)) || 500;
    const parsedBatteryCap = Number(project?.battery_capacity || (parsedBatteryQty * 261)) || 1044;
    const parsedBatteryModel = project?.battery_model || 'CESC Mercury 261';

    if (isBatteryProject) {
      setBatteryStorage({
        enabled: true,
        name: 'Station Batteries Stand-Alone (500 kW)',
        model: parsedBatteryModel,
        quantity: parsedBatteryQty,
        capacityKwh: parsedBatteryCap,
        powerKw: parsedBatteryPower,
        dalleLength: 6.20,
        dalleWidth: 3.20,
        footprint: '6.20m × 3.20m (19.84 m²)',
        fireSafety: 'Bâche à eau 120m³, rétention étanche intégrée, distance de sécurité 5m, clôture grillagée 2m'
      });
    }

    const isOmbriere = (project.type || '').toLowerCase().includes('ombriere') || (project.buildingType || '').toLowerCase().includes('ombriere');
    
    // Déterminer la référence GPS fiable du site (adresse du déclarant)
    const siteCoords = resolveProjectCoordinates(null, project);
    let defLat = siteCoords.lat;
    let defLng = siteCoords.lng;

    // Si un bâtiment existant possède déjà les coordonnées géocodées réelles du site, les prioriser
    if (project.buildings && Array.isArray(project.buildings)) {
      const validBuilding = project.buildings.find(b => {
        const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null));
        return bLat && !isNaN(bLat) && Math.abs(bLat - 43.5612) > 0.01;
      });
      if (validBuilding) {
        defLat = Number(validBuilding.lat || validBuilding.gps.split(',')[0]);
        defLng = Number(validBuilding.lng || validBuilding.gps.split(',')[1]);
      }
    }

    // Restaurer fidèlement les bâtiments existants ou initialiser le Bâtiment 1 avec les paramètres précis du projet
    let initialBuildings = [];
    if (isBatteryProject && (!project.buildings || project.buildings.length === 0)) {
      const batLen = 6.20;
      const batW = 3.20;
      initialBuildings = [
        {
          id: 'bat-sa-1',
          name: `Station Batteries Stand-Alone (500 kW)`,
          length: batLen,
          width: batW,
          eaveHeight: 2.38,
          roofPitch: 0,
          buildingType: 'battery_standalone',
          isBattery: true,
          hasSolar: false,
          bayCount: 4,
          baySpacing: 1.15,
          unitLength: 1.15,
          unitWidth: 1.44,
          unitHeight: 2.38,
          lat: defLat,
          lng: defLng,
          gps: `${defLat},${defLng}`,
          captures: project.urbanisme_captures || project.captures || {},
          photos: project.pc_photos || project.photos || {},
          rotation: Number(project.rotation || 0)
        }
      ];
    } else if (project.buildings && Array.isArray(project.buildings) && project.buildings.length > 0) {
      initialBuildings = project.buildings.map((b, idx) => {
        let cleanName = isAcama 
          ? `Bâtiment ${Number(b.length || (config?.length || 30)).toFixed(0)}m × ${Number(b.width || (config?.width || 15)).toFixed(0)}m`
          : (b.name || (isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`));
        if (isNoBattery) {
          cleanName = cleanName.replace(/Station Batteries[^\)]*\)?/gi, isDP ? 'Ombrière' : 'Bâtiment');
        }
        cleanName = cleanName
          .replace(/Bâtiment/gi, isDP ? 'Ombrière' : 'Bâtiment')
          .replace(/Ombrière/gi, isDP ? 'Ombrière' : 'Bâtiment')
          .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
          .trim();
        if (!cleanName) cleanName = isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`;

        let bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || defLat);
        let bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || defLng);
        if (Math.abs(bLat - 43.5612) < 0.0001 && Math.abs(defLat - 43.5612) > 0.01) {
          bLat = defLat + idx * 0.00015;
          bLng = defLng + idx * 0.00020;
        }

        let bType = (isNoBattery && (b.buildingType === 'battery_standalone' || !b.buildingType)) ? (isAcama ? 'symetrique' : (isDP ? 'ombriere_pl' : 'asymetrique_1')) : (b.buildingType || (isDP ? 'ombriere_pl' : 'asymetrique_1'));
        let bLen = Number(b.length || (b.bayCount || (isAcama ? 4 : 5)) * (b.baySpacing || 7.5) || (isAcama ? 30 : 37.5));
        let bWid = Number(b.width || (isAcama ? 15.0 : (bType.startsWith('asymetrique') ? 20.0 : 16.4)));
        if (isNoBattery && (bWid <= 6.0 || bLen <= 6.0)) {
          bLen = isAcama ? 30 : 37.5;
          bWid = isAcama ? 15 : 16.4;
        }

        const bIsAsym = bType.startsWith('asymetrique');
        const bIsMono = bType === 'monopente';
        const bIsPL = bType === 'ombriere_pl';
        const bIsVL = bType.startsWith('ombriere');
        const defEave = (bIsAsym || bIsMono) ? 4.0 : (bIsPL ? 5.08 : (bIsVL ? 3.0 : 5.5));
        const defPitch = (bIsAsym || bIsMono) ? 15 : 10;

        return {
          ...b,
          id: b.id || `bat-${idx + 1}`,
          name: cleanName,
          lat: bLat,
          lng: bLng,
          gps: `${bLat},${bLng}`,
          rotation: Number(b.rotation || 0),
          length: bLen,
          width: bWid,
          eaveHeight: Number(b.eaveHeight !== undefined && !isNaN(Number(b.eaveHeight)) ? b.eaveHeight : defEave),
          roofPitch: Number(b.roofPitch !== undefined && !isNaN(Number(b.roofPitch)) ? b.roofPitch : defPitch),
          buildingType: bType,
          isBattery: false,
          leftSide: b.leftSide || 'none',
          rightSide: b.rightSide || 'none',
          leftWidth: b.leftWidth !== undefined ? Number(b.leftWidth) : (b.leftSide === 'appentis' ? 9.3 : (b.leftSide === 'auvent' ? 4.0 : 0)),
          rightWidth: b.rightWidth !== undefined ? Number(b.rightWidth) : (b.rightSide === 'appentis' ? 9.3 : (b.rightSide === 'auvent' ? 4.0 : 0)),
          bayCount: Number(b.bayCount || (isAcama ? 4 : 5)),
          baySpacing: Number(b.baySpacing || 7.5),
          captures: b.captures || b.urbanisme_captures || (idx === 0 ? (project.urbanisme_captures || project.captures || {}) : {}),
          photos: b.photos || b.pc_photos || (idx === 0 ? (project.pc_photos || project.photos || {}) : {})
        };
      });
    } else {
      let pLen = isAcama ? Number(project.longueur || 30.0) : Number(project.longueur || 37.5);
      let pW = isAcama ? Number(project.largeur || 15.0) : Number(project.largeur || 16.4);
      if (isNoBattery && (pW <= 6.0 || pLen <= 6.0)) {
        pLen = isAcama ? 30.0 : 37.5;
        pW = isAcama ? 15.0 : 16.4;
      }
      const pBc = Number(project.bayCount) || Math.max(1, Math.round(pLen / 7.5)) || (isAcama ? 4 : 5);
      const pBs = Number(project.baySpacing) || 7.5;
      let pType = isAcama ? 'symetrique' : (project.buildingType || ((!isAcama && isDP) ? 'ombriere_pl' : 'asymetrique_1'));
      if (isNoBattery && (pType === 'battery_standalone' || pType.includes('battery'))) {
        pType = isAcama ? 'symetrique' : (isDP ? 'ombriere_pl' : 'asymetrique_1');
      }
      const pEave = Number(project.hauteur_egout) || (isAcama ? 4.0 : (pType === 'ombriere_pl' ? 5.08 : (pType === 'ombriere_vl_double' ? 3.0 : (pType.startsWith('asymetrique') || pType === 'monopente' ? 4.0 : 5.5))));
      const pPitch = Number(project.pente) || ((pType.startsWith('asymetrique') || pType === 'monopente') ? 15 : 10);
      const pRightSide = project.rightSide || (project.appentis ? 'appentis' : project.auvent ? 'auvent' : 'none');
      const pLeftSide = project.leftSide || 'none';
      const pRightWidth = Number(project.rightWidth) || (pRightSide === 'appentis' ? 9.3 : 4.0);
      const pLeftWidth = Number(project.leftWidth) || (pLeftSide === 'appentis' ? 9.3 : 4.0);

      initialBuildings = [
        {
          id: 'bat-1',
          name: isAcama ? `Bâtiment ${pLen.toFixed(0)}m × ${pW.toFixed(0)}m` : (isDP ? 'Ombrière 1' : `Bâtiment ${pLen.toFixed(0)}m × ${pW.toFixed(0)}m`),
          length: pLen,
          width: pW,
          eaveHeight: pEave,
          roofPitch: pPitch,
          buildingType: pType,
          isBattery: false,
          leftSide: pLeftSide,
          rightSide: pRightSide,
          leftWidth: pLeftWidth,
          rightWidth: pRightWidth,
          bayCount: pBc,
          baySpacing: pBs,
          lat: defLat,
          lng: defLng,
          gps: `${defLat},${defLng}`,
          captures: project.urbanisme_captures || project.captures || {},
          photos: project.pc_photos || project.photos || {},
          rotation: Number(project.rotation || 0)
        }
      ];
    }

    // Partitionner et structurer les bâtiments par solution (Bâtiment vs Ombrière vs Battery)
    let loadedSolutions;
    if (savedState?.solutions?.building?.buildings && savedState?.solutions?.ombriere?.buildings) {
      loadedSolutions = savedState.solutions;
    } else if (project?.solutions?.building?.buildings && project?.solutions?.ombriere?.buildings) {
      loadedSolutions = {
        ...project.solutions,
        battery: project.solutions.battery || {
          activeBuildingIndex: 0,
          buildings: [
            {
              id: 'bat-sa-1',
              name: 'Station Batteries Stand-Alone (500 kW)',
              solutionType: 'battery',
              length: 6.20,
              width: 3.20,
              eaveHeight: 2.38,
              roofPitch: 0,
              buildingType: 'battery_standalone',
              isBattery: true,
              hasSolar: false,
              bayCount: 4,
              baySpacing: 1.15,
              unitLength: 1.15,
              unitWidth: 1.44,
              unitHeight: 2.38,
              lat: defLat,
              lng: defLng,
              gps: `${defLat},${defLng}`,
              rotation: 0,
              captures: {},
              photos: {}
            }
          ]
        }
      };
    } else {
      const buildingList = [];
      const ombriereList = [];
      const batteryList = [];

      initialBuildings.forEach((b) => {
        const isBat = (b.solutionType === 'battery') || (b.buildingType === 'battery_standalone') || b.isBattery;
        const isOmb = (b.solutionType === 'ombriere') || (b.buildingType || '').toLowerCase().startsWith('ombriere') || (b.category === 'ombriere');
        if (isBat) {
          batteryList.push({
            ...b,
            id: b.id || 'bat-sa-1',
            solutionType: 'battery',
            isBattery: true,
            name: b.name || 'Station Batteries Stand-Alone (500 kW)',
            length: Number(b.length || 6.20),
            width: Number(b.width || 3.20),
            eaveHeight: Number(b.eaveHeight || 2.38)
          });
        } else if (isOmb) {
          ombriereList.push({
            ...b,
            solutionType: 'ombriere',
            name: b.name ? b.name.replace(/Bâtiment/gi, 'Ombrière') : `Ombrière ${ombriereList.length + 1}`
          });
        } else {
          buildingList.push({
            ...b,
            solutionType: 'building',
            name: b.name ? b.name.replace(/Ombrière/gi, 'Bâtiment') : (isAcama ? `Bâtiment ${Number(b.length || 30).toFixed(0)}m × ${Number(b.width || 15).toFixed(0)}m` : `Bâtiment ${buildingList.length + 1}`)
          });
        }
      });

      if (batteryList.length === 0) {
        batteryList.push({
          id: 'bat-sa-1',
          name: 'Station Batteries Stand-Alone (500 kW)',
          solutionType: 'battery',
          length: 6.20,
          width: 3.20,
          eaveHeight: 2.38,
          roofPitch: 0,
          buildingType: 'battery_standalone',
          isBattery: true,
          hasSolar: false,
          bayCount: 4,
          baySpacing: 1.15,
          unitLength: 1.15,
          unitWidth: 1.44,
          unitHeight: 2.38,
          lat: defLat,
          lng: defLng,
          gps: `${defLat},${defLng}`,
          rotation: 0,
          captures: {},
          photos: {}
        });
      }

      if (buildingList.length === 0) {
        const bInitLen = isAcama ? 30 : 37.5;
        const bInitWid = isAcama ? 15 : 16.4;
        buildingList.push({
          id: 'bat-1',
          name: `Bâtiment ${bInitLen.toFixed(0)}m × ${bInitWid.toFixed(0)}m`,
          solutionType: 'building',
          length: bInitLen,
          width: bInitWid,
          eaveHeight: 4,
          roofPitch: isAcama ? 10 : 15,
          buildingType: isAcama ? 'symetrique' : 'asymetrique_1',
          leftSide: 'none',
          rightSide: 'none',
          bayCount: isAcama ? 4 : 5,
          baySpacing: 7.5,
          lat: defLat,
          lng: defLng,
          gps: `${defLat},${defLng}`,
          rotation: 0,
          captures: {},
          photos: {}
        });
      }

      if (ombriereList.length === 0) {
        ombriereList.push({
          id: 'omb-1',
          name: 'Ombrière 1',
          solutionType: 'ombriere',
          length: 45.0,
          width: 6.9,
          eaveHeight: 3.7,
          roofPitch: 10,
          buildingType: 'ombriere_vl_simple_gauche',
          leftSide: 'none',
          rightSide: 'none',
          bayCount: 6,
          baySpacing: 7.5,
          lat: defLat,
          lng: defLng,
          gps: `${defLat},${defLng}`,
          rotation: 0,
          captures: {},
          photos: {}
        });
      }

      loadedSolutions = {
        building: {
          activeBuildingIndex: 0,
          buildings: buildingList
        },
        ombriere: {
          activeBuildingIndex: 0,
          buildings: ombriereList
        },
        battery: {
          activeBuildingIndex: 0,
          buildings: batteryList
        }
      };
    }

    setSolutions(loadedSolutions);

    // Initialiser les structures sélectionnées
    hasInitializedSelectionRef.current = true;
    if (savedState?.selectedStructureIds && Array.isArray(savedState.selectedStructureIds) && savedState.selectedStructureIds.length > 0) {
      setSelectedStructureIds(savedState.selectedStructureIds);
    } else if (detectedSolutionType === 'battery') {
      const batIds = (loadedSolutions.battery?.buildings || []).map(b => b.id);
      setSelectedStructureIds(batIds.length > 0 ? batIds : ['bat-sa-1']);
    } else if (project?.selectedStructureIds && Array.isArray(project.selectedStructureIds) && project.selectedStructureIds.length > 0) {
      setSelectedStructureIds(project.selectedStructureIds);
    } else {
      const allIds = [
        ...(loadedSolutions.building?.buildings || []).map((b, i) => b.id ? (String(b.id).startsWith('bat-') ? String(b.id) : `bat-${b.id}`) : `bat-${i + 1}`),
        ...(loadedSolutions.ombriere?.buildings || []).map((b, i) => b.id ? (String(b.id).startsWith('omb-') ? String(b.id) : `omb-${b.id}`) : `omb-${i + 1}`),
      ];
      setSelectedStructureIds(allIds);
    }

    // Charger immédiatement le bâtiment de la solution active dans le store 3D
    const activeSolutionObj = loadedSolutions[detectedSolutionType] || loadedSolutions.building;
    const b1 = activeSolutionObj?.buildings[activeSolutionObj.activeBuildingIndex] || activeSolutionObj?.buildings[0] || initialBuildings[0];
    if (b1) {
      lastActiveBuildingIdxRef.current = activeSolutionObj?.activeBuildingIndex || 0;
      useConfiguratorStore.getState().loadBuildingConfig(b1);
      if (isAcama) {
        useConfiguratorStore.getState().setConfigMode('custom');
      }
    }

    const isRodierGarons = (project?.name || '').toLowerCase().includes('rodier') ||
                           (project?.clientName || '').toLowerCase().includes('rodier') ||
                           (cleanDemandeur || '').toLowerCase().includes('rodier') ||
                           (projCity || '').toLowerCase().includes('garons') ||
                           (projAddress || '').toLowerCase().includes('garons');

    const garonsImage5Notice = `NOTICE D'INSERTION & DESCRIPTIVE DU PROJET

1- OBJET DE LA DEMANDE
La demande de déclaration préalable porte sur la réalisation d'un projet comprenant 1'ombrière photovoltaïque (2118.00 m²).

2- LE SITE
Le projet se situe sur la commune de GARONS (30128) au Lous Counils 30128 Garons. Le terrain concerné par le projet est cadastré sous le numéro AR 91 (surface : 19917 m²). Le terrain est globalement plat et se trouve à une altitude de 140.62 m au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
Le projet a pour objet l'implantation d'une ombrière photovoltaïque (Ombrière 60m × 35.3m) de dimensions 60.00m × 26.00m + 9.3m d'appentis côté Sud (surface couverte : 2118.00 m²), orientée Sud-Ouest (33°), à structure métallique autoportante en Y/V (RAL 7016) avec toiture bipente inclinée à 10°, permettant d'abriter l'activité de l'exploitant tout en produisant de l'électricité solaire, développant une puissance installée de 460 kWc.
Cette ombrière sera ouverte et non close. Les façades Est, Ouest, Nord et Sud seront ouvertes.
Un terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.
Des tranchées drainantes seront réalisées tout autour de l'ombrière projet afin d'évacuer les eaux pluviales par infiltration dans le sol.

4- RACCORDEMENT AUX RESEAUX
L'ombrière ne sera pas raccordée aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.
Seule l'électricité produite par la centrale photovoltaïque est renvoyée dans le réseau ENEDIS via un point de livraison situé sur la parcelle au Sud de la parcelle (PDL).
L'emplacement du point de livraison indiqué dans les pièces graphiques de l'autorisation d'urbanisme n'apparaît qu'à titre indicatif.
Le positionnement du point de livraison et d'un transformateur (le cas échéant) demeure à l'appréciation finale du gestionnaire de réseau en fonction du site et des équipements déjà existants.

5- SECURITE INCENDIE
En cas de besoin pour la défense extérieure contre l'incendie, un canal est situé à 300m au Sud du terrain et plusieurs bornes incendie sont installées dans la zone résidentielle à 300m au Nord.`;

    const sanitizeNotice = (t) => {
      if (!t) return t;
      return t
        .replace(/permettant d'abriter les véhicules tout en produisant de l'électricité solaire/g, "permettant d'abriter l'activité de l'exploitant tout en produisant de l'électricité solaire")
        .replace(/\s*\(Cf\s+(?:DP|PC)\s*0?2\s*-\s*Plan\s+de\s+masse\)\.?/gi, '.');
    };

    const initialNotice = sanitizeNotice(savedState?.noticeText || project?.noticeText || (isRodierGarons ? garonsImage5Notice : buildAutoNoticeText()));
    setNoticeText(initialNotice);
    setIsNoticeUserModified(Boolean(savedState?.isNoticeUserModified || savedState?.noticeText || project?.noticeText || isRodierGarons));

    const image4ObjetTravaux = `Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire de dimensions 60m x 35.3m soit 2118m² de surface (dont 26.0m principal + 9.30m appentis) ouverte sur les 4 côtés.
La puissance totale installée en toiture sera de 460 kWc. Le bac acier qui sera installé en toiture sous les modules photovoltaïques sera de RAL7016. Les panneaux photovoltaïques prévus sont noirs avec un encadrement noir.
Les dimensions des panneaux sont de 1762 x 1134 mm pour une puissance unitaire de 465 Wc soit 989 panneaux photovoltaïques seront installés en toiture sur les 2 pans de l'ombrière.`;

    const clientKwc = project?.kwc || project?.puissance || project?.projectSize || '';
    const isBuildingSolution = detectedSolutionType === 'building';
    const isOmbriereSolution = detectedSolutionType === 'ombriere';
    const isBatterySolution = detectedSolutionType === 'battery';

    const defaultObjetBySol = isBatterySolution
      ? "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV."
      : (isRodierGarons
          ? image4ObjetTravaux
          : (isOmbriereSolution || isDP
              ? image4ObjetTravaux
              : "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"));

    let candidateObjet = savedState?.editedProject?.objet_travaux || project.objet_travaux || project.objetTravaux;
    if ((isBuildingSolution || isOmbriereSolution) && candidateObjet && /batterie|bess|stockage d'énergie/i.test(candidateObjet)) {
      candidateObjet = null;
    }
    if (isBatterySolution && candidateObjet && /ombrière|bâtiment|hangar/i.test(candidateObjet)) {
      candidateObjet = null;
    }
    const finalObjet = candidateObjet || defaultObjetBySol;

    let candidateUrbanismeType = savedState?.editedProject?.urbanismeType || project.urbanismeType;
    if (isBuildingSolution && (!candidateUrbanismeType || /batterie|bess/i.test(candidateUrbanismeType) || (/ombrière/i.test(candidateUrbanismeType) && !isDP))) {
      candidateUrbanismeType = isAcama ? 'Bâtiment photovoltaïque' : 'Bâtiment et Ombrière';
    } else if (isOmbriereSolution && (!candidateUrbanismeType || /batterie|bess/i.test(candidateUrbanismeType))) {
      candidateUrbanismeType = initialBuildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque';
    } else if (isBatterySolution) {
      candidateUrbanismeType = 'Station Batteries Stand-Alone';
    }

    const rawBirthDate = savedState?.editedProject?.birthDate || project.birthDate || '';
    const formattedBirthDate = String(rawBirthDate).replace(/\D/g, '').slice(0, 8);

    const initProj = {
      ...project,
      ...(savedState?.editedProject || {}),
      lat: savedState?.editedProject?.lat || defLat,
      lng: savedState?.editedProject?.lng || defLng,
      gps: savedState?.editedProject?.gps || `${defLat},${defLng}`,
      solutionType: detectedSolutionType,
      urbanisme_solutionType: detectedSolutionType,
      type: isBatterySolution ? 'battery' : (isOmbriereSolution ? 'ombriere' : (project.type && !project.type.includes('batterie') ? project.type : 'batiment_solaire')),
      buildingType: isBatterySolution ? 'battery_standalone' : (b1?.buildingType && b1.buildingType !== 'battery_standalone' ? b1.buildingType : (project.buildingType && project.buildingType !== 'battery_standalone' ? project.buildingType : (isOmbriereSolution ? 'ombriere_pl' : 'asymetrique_1'))),
      isBattery: isBatterySolution,
      isBatteryStandAlone: isBatterySolution,
      lastName: savedState?.editedProject?.lastName || names.lastName || project.name || '',
      firstName: savedState?.editedProject?.firstName || names.firstName || '',
      demandeur: savedState?.editedProject?.demandeur || cleanDemandeur,
      email: savedState?.editedProject?.email || projEmail,
      email2: savedState?.editedProject?.email2 || project.email2 || 'contact@enr-courtage.fr',
      cerfaEmailChoice: savedState?.editedProject?.cerfaEmailChoice || project.cerfaEmailChoice || 'email2',
      address: savedState?.editedProject?.address || projAddress,
      zip: savedState?.editedProject?.zip || projZip,
      city: savedState?.editedProject?.city || projCity,
      phone: savedState?.editedProject?.phone || project.phone || project.clientPhone || '06 00 00 00 00',
      birthDate: formattedBirthDate,
      birthCity: savedState?.editedProject?.birthCity || project.birthCity || '',
      birthDept: savedState?.editedProject?.birthDept || project.birthDept || (projZip ? projZip.substring(0, 2) : '32'),
      kwc: savedState?.editedProject?.kwc || clientKwc,
      projectSize: savedState?.editedProject?.projectSize || clientKwc,
      puissance: savedState?.editedProject?.puissance || clientKwc,
      objet_travaux: finalObjet,
      description: finalObjet,
      noticeText: initialNotice,
      longueur: isBatterySolution ? '6.20' : String(b1?.length || (isAcama ? 30 : 37.5)),
      largeur: isBatterySolution ? '3.20' : String(b1?.width || (isAcama ? 15 : 20.0)),
      hauteur_egout: isBatterySolution ? '2.38' : String(b1?.eaveHeight || (isOmbriereSolution ? 3.7 : 4.0)),
      pente: isBatterySolution ? '0' : String(b1?.roofPitch || 10),
      leftSide: isBatterySolution ? 'none' : (b1?.leftSide || 'none'),
      rightSide: isBatterySolution ? 'none' : (b1?.rightSide || 'none'),
      leftWidth: b1?.leftWidth,
      rightWidth: b1?.rightWidth,
      bayCount: b1?.bayCount,
      cadastre_section: savedState?.editedProject?.cadastre_section || project.cadastre_section || project.dp_config?.terrain?.section || ((isBatterySolution || project?.isBattery) ? findBessOdreData(project?.name || project?.projectName || project?.client || '')?.section : '') || '',
      cadastre_numero: savedState?.editedProject?.cadastre_numero || project.cadastre_numero || project.dp_config?.terrain?.parcelle || ((isBatterySolution || project?.isBattery) ? findBessOdreData(project?.name || project?.projectName || project?.client || '')?.numero : '') || '',
      cadastre_surface: savedState?.editedProject?.cadastre_surface || project.cadastre_surface || project.dp_config?.terrain?.contenance_m2 || ((isBatterySolution || project?.isBattery) ? String(findBessOdreData(project?.name || project?.projectName || project?.client || '')?.contenance || '') : '') || '',
      cadastre_commune: savedState?.editedProject?.cadastre_commune || project.cadastre_commune || projCity,
      commune: savedState?.editedProject?.commune || projCity,
      urbanismeType: candidateUrbanismeType,
      typeLabel: candidateUrbanismeType,
      installationType: candidateUrbanismeType,
      pente_terrain: savedState?.editedProject?.pente_terrain || project.pente_terrain || '3',
      cotation_bati: savedState?.editedProject?.cotation_bati || project.cotation_bati || '12.50',
      cotation_voie: savedState?.editedProject?.cotation_voie || project.cotation_voie || '8.00',
      buildings: initialBuildings,
    };
    setEditedProject(initProj);
    setCaptures(b1?.captures || b1?.urbanisme_captures || project?.urbanisme_captures || project?.captures || {});
    setPhotos(b1?.photos || b1?.pc_photos || project?.pc_photos || project?.photos || {});

      // Restaurer fidèlement depuis le cache local IndexedDB pour ne jamais perdre d'images
      if (project?.id) {
        getAllCachedMediaForProject(project.id).then(cached => {
          if (cached && (Object.keys(cached.captures).length > 0 || Object.keys(cached.photos).length > 0 || Object.keys(cached.buildingsMedia).length > 0)) {
            setCaptures(prev => ({ ...cached.captures, ...prev }));
            setPhotos(prev => ({ ...cached.photos, ...prev }));
            setEditedProject(prev => ({
              ...prev,
              urbanisme_captures: { ...(cached.captures || {}), ...(prev.urbanisme_captures || {}) },
              pc_photos: { ...(cached.photos || {}), ...(prev.pc_photos || {}) }
            }));
            setBuildings(prev => prev.map((b, idx) => {
              const bKey = b.id || `bat-${idx + 1}`;
              const bMedia = cached.buildingsMedia[bKey] || cached.buildingsMedia[`b${idx}`] || {};
              return {
                ...b,
                captures: { ...(bMedia.captures || {}), ...(b.captures || {}) },
                photos: { ...(bMedia.photos || {}), ...(b.photos || {}) }
              };
            }));
          }
        }).catch(err => console.warn('Erreur récupération cache media IndexedDB:', err));
      }

      // 1. Cadastre IGN automatique (obligatoire pour déterminer la parcelle réelle de la batterie)
      const shouldQueryCadastre = (initProj.gps || initProj.lat) && (!initProj.cadastre_section || !initProj.cadastre_numero || isBatterySolution);
      if (shouldQueryCadastre) {
        setFetchingCadastre(true);
        const gps = initProj.gps || `${initProj.lat},${initProj.lng}`;
        const [lat, lng] = gps.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          cadastreService.getParcelle(lat, lng).then(data => {
            if (data && data.section && data.numero) {
              setEditedProject(prev => ({
                ...prev,
                cadastre_section: isBatterySolution ? data.section : (prev.cadastre_section || data.section),
                cadastre_numero: isBatterySolution ? data.numero : (prev.cadastre_numero || data.numero),
                cadastre_surface: isBatterySolution ? String(data.contenance || '') : (prev.cadastre_surface || String(data.contenance || '')),
                cadastre_commune: data.nom_commune || prev.cadastre_commune,
                parcelles: [{ section: data.section, numero: data.numero, surface: String(data.contenance || '') }]
              }));
            }
          }).catch(e => console.error('Erreur auto cadastre:', e))
          .finally(() => setFetchingCadastre(false));
        } else {
          setFetchingCadastre(false);
        }
      }

      // 2. Génération automatique des cartes PC1 & PC2 (OSM Zoom 19)
      setGeneratingMaps(true);
      getOrGenerateProjectMaps(initProj).then(autoMaps => {
        setCaptures(prev => ({ ...prev, ...autoMaps }));
        setEditedProject(prev => ({
          ...prev,
          urbanisme_captures: { ...(prev.urbanisme_captures || {}), ...autoMaps }
        }));
        setGeneratingMaps(false);
      }).catch(() => setGeneratingMaps(false));
  }, [project, isOpen]);

  // Synchronisation explicite de la configuration courante du store dans les solutions
  const syncActiveConfigToSolutions = useCallback(() => {
    if (solutionType === 'battery') return;
    setSolutions(prev => {
      const curSol = prev[solutionType];
      if (!curSol?.buildings?.[activeBuildingIndex]) return prev;
      const nextBuildings = [...curSol.buildings];
      const cur = nextBuildings[activeBuildingIndex];
      const bLen = Number(config.length || (config.bayCount ? config.bayCount * (config.baySpacing || 7.5) : cur.length || 30));
      const bWid = Number(config.width || cur.width || 15);
      const extLeft = config.leftSide !== 'none' ? Number(config.leftWidth !== undefined ? config.leftWidth : (config.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extRight = config.rightSide !== 'none' ? Number(config.rightWidth !== undefined ? config.rightWidth : (config.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const totalWid = bWid + extLeft + extRight;

      const dynamicName = getBuildingDisplayName({
        ...cur,
        length: bLen,
        width: bWid,
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth,
        rightWidth: config.rightWidth,
        solutionType
      }, activeBuildingIndex);

      nextBuildings[activeBuildingIndex] = {
        ...cur,
        name: dynamicName,
        width: bWid,
        totalWidth: totalWid,
        length: bLen,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        buildingType: config.buildingType,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth,
        rightWidth: config.rightWidth,
        hasSolar: config.hasSolar,
        solarStats: config.solarStats,
      };

      return {
        ...prev,
        [solutionType]: {
          ...curSol,
          buildings: nextBuildings
        }
      };
    });
  }, [solutionType, activeBuildingIndex, config, getBuildingDisplayName]);

  // Géocodage automatique à partir de l'adresse du déclarant (Étape 1 ou Fiche Projet)
  useEffect(() => {
    if (!isOpen) return;
    const addr = editedProject?.address || project?.address;
    const zip = editedProject?.zip || project?.zip;
    const city = editedProject?.city || project?.city;
    const fullAddress = [addr, zip, city].filter(Boolean).join(' ');

    if (!fullAddress || fullAddress.trim().length < 5) return;

    const currentLat = Number(editedProject?.lat || (editedProject?.gps ? editedProject.gps.split(',')[0] : null));
    const isBogusGps = !currentLat || isNaN(currentLat) || (Math.abs(currentLat - 43.5612) < 0.001);

    if (isBogusGps) {
      fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.features?.[0]?.geometry?.coordinates) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            handleGpsUpdate(lat, lng);
          }
        })
        .catch(e => console.warn('[UrbanismeWizard] Erreur géocodage adresse:', e));
    }
  }, [isOpen, editedProject?.address, editedProject?.zip, editedProject?.city, project?.address, project?.zip, project?.city, handleGpsUpdate]);

  // Synchronisation continue des valeurs du configurateur vers le projet (sans écraser le kWc du client)
  useEffect(() => {
    // Ne synchroniser QUE lors de l'étape 2 (Cotations & Côtes)
    if (step !== 2) return;
    if (isSwitchingBuildingRef.current) return;
    if (!config || !buildings[activeBuildingIndex]) return;

    // Si l'index actif vient de changer, ne pas écraser avec l'ancien config du store
    if (lastActiveBuildingIdxRef.current !== activeBuildingIndex) {
      lastActiveBuildingIdxRef.current = activeBuildingIndex;
      return;
    }

    const isOmbriere = (config.buildingType || '').startsWith('ombriere');
    const category = isOmbriere ? 'ombriere' : 'batiment_solaire';
    const kwcEstimate = config.solarStats?.power ? Math.round(config.solarStats.power) : Math.round((config.width * config.length * 0.22) / 5) * 5;

    setBuildings(prev => {
      const cur = prev[activeBuildingIndex];
      if (!cur) return prev;

      const hasChanged = 
        cur.buildingType !== config.buildingType ||
        cur.width !== config.width ||
        cur.length !== config.length ||
        cur.eaveHeight !== config.eaveHeight ||
        cur.roofPitch !== config.roofPitch ||
        cur.bayCount !== config.bayCount ||
        cur.baySpacing !== config.baySpacing ||
        cur.leftSide !== (config.leftSide || 'none') ||
        cur.rightSide !== (config.rightSide || 'none') ||
        cur.leftWidth !== config.leftWidth ||
        cur.rightWidth !== config.rightWidth;

      if (!hasChanged) return prev;

      const next = [...prev];
      const extLeft = config.leftSide !== 'none' ? Number(config.leftWidth !== undefined ? config.leftWidth : (config.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extRight = config.rightSide !== 'none' ? Number(config.rightWidth !== undefined ? config.rightWidth : (config.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const totalWid = Number(config.width || cur.width || 15) + extLeft + extRight;

      const dynamicName = getBuildingDisplayName({
        ...cur,
        length: config.length,
        width: config.width,
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth,
        rightWidth: config.rightWidth,
        solutionType
      }, activeBuildingIndex);

      next[activeBuildingIndex] = {
        ...cur,
        name: dynamicName,
        buildingType: config.buildingType,
        width: config.width,
        totalWidth: totalWid,
        length: config.length,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth,
        rightWidth: config.rightWidth,
        hasSolar: config.hasSolar,
        solarStats: config.solarStats,
      };
      return next;
    });

    setEditedProject(prev => {
      const clientKwc = project?.kwc || project?.puissance || project?.projectSize || prev?.kwc || kwcEstimate;
      return {
        ...prev,
        type: category,
        installationType: category,
        width: config.width,
        length: config.length,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        buildingType: config.buildingType,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
        kwc: clientKwc,
        projectSize: clientKwc,
        puissance: clientKwc,
      };
    });
  }, [step, config.width, config.length, config.eaveHeight, config.roofPitch, config.buildingType, config.leftSide, config.rightSide, config.leftWidth, config.rightWidth, config.solarStats, config.bayCount, config.baySpacing, activeBuildingIndex]);

  // Mise à jour automatique de la notice selon la configuration ou assainissement des mentions obsolètes
  useEffect(() => {
    if (!isNoticeUserModified) {
      const auto = buildAutoNoticeText();
      setNoticeText(auto);
      setEditedProject(prev => ({ ...prev, noticeText: auto }));
    } else if (noticeText && (/permettant d'abriter les véhicules/i.test(noticeText) || /\(Cf\s+(?:DP|PC)\s*0?2\s*-\s*Plan\s+de\s+masse\)/i.test(noticeText))) {
      const cleaned = noticeText
        .replace(/permettant d'abriter les véhicules tout en produisant de l'électricité solaire/g, "permettant d'abriter l'activité de l'exploitant tout en produisant de l'électricité solaire")
        .replace(/\s*\(Cf\s+(?:DP|PC)\s*0?2\s*-\s*Plan\s+de\s+masse\)\.?/gi, '.');
      setNoticeText(cleaned);
      setEditedProject(prev => ({ ...prev, noticeText: cleaned }));
    }
  }, [step, selectedStructureIds, allConfiguredStructures, additionalRoof, batteryStorage, buildAutoNoticeText, isNoticeUserModified]);

  // Mise à jour de la position GPS individuelle d'un bâtiment (PC2 / DP2)
  const handleBuildingGpsUpdate = (bIdx, newLat, newLng) => {
    setBuildings(prev => {
      const next = [...prev];
      if (next[bIdx]) {
        next[bIdx] = {
          ...next[bIdx],
          lat: newLat,
          lng: newLng,
          gps: `${newLat},${newLng}`
        };
      }
      return next;
    });
    setEditedProject(prev => {
      const nextBuildings = [...(prev.buildings || buildings)];
      if (nextBuildings[bIdx]) {
        nextBuildings[bIdx] = {
          ...nextBuildings[bIdx],
          lat: newLat,
          lng: newLng,
          gps: `${newLat},${newLng}`
        };
      }
      return {
        ...prev,
        buildings: nextBuildings,
        ...(bIdx === 0 ? { lat: newLat, lng: newLng, gps: `${newLat},${newLng}` } : {})
      };
    });
  };

  // Helper de persistance automatique média (IndexedDB + Storage + Firestore)
  const persistMediaItem = (bKey, key, dataUrl, category = 'photos') => {
    if (!project?.id || !dataUrl) return;
    // 1. Sauvegarde instantanée en cache local IndexedDB (accès immédiat sans délai)
    cacheMediaLocal(project.id, bKey, key, dataUrl);

    // 2. Téléversement asynchrone Firebase Storage + mise à jour Firestore propre
    uploadUrbanismeDataUrl(dataUrl, project.id, bKey, key).then(async (url) => {
      if (url && url !== dataUrl) {
        try {
          const updateField = category === 'photos' ? 'pc_photos' : 'urbanisme_captures';
          await apiService.updateProject(project.id, {
            [`${updateField}.${key}`]: url,
            updatedAt: new Date().toISOString()
          }, activeTenantId);
        } catch (e) {
          console.warn('[UrbanismeWizard] Sync Firestore photo échouée:', e);
        }
      }
    }).catch(err => console.warn('[UrbanismeWizard] Upload Storage échoué:', err));
  };

  // Sauvegarde d'une capture fidèle de plan de masse (DP2 / PC2) pour Vue 1 ou Vue 2
  const handleSaveMasseCapture = useCallback((targetId, dataUrl, viewNum = 1, zoom = null, centerLat = null, centerLng = null) => {
    if (!dataUrl) return;

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      ['building', 'ombriere', 'battery'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : (solKey === 'battery' ? 'bat-sa-' : 'bat-')) ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-1`;
            return b.id === targetId || currentId === targetId;
          });
          if (bIdx !== -1) {
            const nextList = [...nextSol[solKey].buildings];
            if (viewNum === 2) {
              nextList[bIdx] = {
                ...nextList[bIdx],
                id: targetId,
                masse_capture_2: dataUrl,
                ...(zoom ? { masse_zoom_2: zoom } : {}),
                ...(centerLat ? { masse_center_lat_2: centerLat } : {}),
                ...(centerLng ? { masse_center_lng_2: centerLng } : {}),
              };
            } else {
              nextList[bIdx] = {
                ...nextList[bIdx],
                id: targetId,
                masse_capture: dataUrl,
                ...(zoom ? { masse_zoom: zoom } : {}),
                ...(centerLat ? { masse_center_lat: centerLat } : {}),
                ...(centerLng ? { masse_center_lng: centerLng } : {}),
              };
            }
            nextSol[solKey] = { ...nextSol[solKey], buildings: nextList };
            updated = true;
          }
        }
      });

      return updated ? nextSol : prev;
    });

    const captureKey = viewNum === 2 ? 'masse_projet_2' : 'masse_projet';
    const zoomKey = viewNum === 2 ? 'masse_zoom_2' : 'masse_zoom';
    setCaptures(prev => ({ 
      ...prev, 
      [captureKey]: dataUrl,
      ...(zoom ? { [zoomKey]: zoom } : {})
    }));
    setEditedProject(prev => ({
      ...prev,
      urbanisme_captures: { 
        ...(prev.urbanisme_captures || {}), 
        [captureKey]: dataUrl,
        ...(zoom ? { [zoomKey]: zoom } : {})
      },
      ...(viewNum === 1 ? { masse_capture: dataUrl, ...(zoom ? { masse_zoom: zoom } : {}) } : {})
    }));
    persistMediaItem(targetId, captureKey, dataUrl, 'captures');
  }, [persistMediaItem]);

  // Capture haute résolution fidèle du plan de masse sans décalage
  const captureStructureMasseMap = useCallback(async (strId, viewNum = 1, forceShowDimensions = null) => {
    const map = masseMapInstancesRef.current[strId];
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    const activeList = allConfiguredStructures.filter(str => selectedStructureIds.includes(str.id));
    const showDim = forceShowDimensions !== null
      ? Boolean(forceShowDimensions)
      : (masseShowDimensions[strId] !== undefined
          ? Boolean(masseShowDimensions[strId])
          : (targetStr?.masse_show_dimensions !== false));

    const bLat = Number(targetStr?.lat || (targetStr?.gps ? targetStr.gps.split(',')[0] : null) || 43.43571);
    const bLng = Number(targetStr?.lng || (targetStr?.gps ? targetStr.gps.split(',')[1] : null) || -1.17644);

    const isCurrentViewOnScreen = map && (masseViewTabs[strId] || 1) === viewNum;
    const liveZoom = isCurrentViewOnScreen ? map.getZoom() : null;
    const liveCenter = isCurrentViewOnScreen ? map.getCenter() : null;

    const cLat = liveCenter ? liveCenter.lat : Number((viewNum === 2 ? targetStr?.masse_center_lat_2 : targetStr?.masse_center_lat) || bLat);
    const cLng = liveCenter ? liveCenter.lng : Number((viewNum === 2 ? targetStr?.masse_center_lng_2 : targetStr?.masse_center_lng) || bLng);

    // Zoom garanti : au minimum 18 pour Vue 1
    let cZoom = liveZoom || Number((viewNum === 2 ? targetStr?.masse_zoom_2 : targetStr?.masse_zoom) || (viewNum === 2 ? 16 : 18));
    if (viewNum === 1 && (!cZoom || cZoom < 17)) {
      cZoom = 18;
    }

    let dataUrl = null;
    // 1. Tenter la capture directe instantanée sur le conteneur Leaflet si la vue affichée correspond
    if (map && isCurrentViewOnScreen) {
      const strDistances = masseDistances[strId] || targetStr?.masseDistances || [];
      dataUrl = await captureDirectLeafletMap(map, targetStr, activeList, showDim, strDistances, sdisPoint);
    }

    // 2. Fallback de haute précision : génération statique sans faille (AutoMapService)
    if (!dataUrl) {
      const strDistances = masseDistances[strId] || targetStr?.masseDistances || [];
      dataUrl = await generateStaticMapImage(cLat, cLng, 'map', cZoom, activeList, showDim, strDistances, sdisPoint);
    }

    if (dataUrl) {
      handleSaveMasseCapture(strId, dataUrl, viewNum, cZoom, cLat, cLng);
      return dataUrl;
    }
    return null;
  }, [allConfiguredStructures, selectedStructureIds, handleSaveMasseCapture, masseShowDimensions, masseViewTabs, masseDistances, sdisPoint]);

  useEffect(() => {
    captureStructureMasseMapRef.current = captureStructureMasseMap;
  }, [captureStructureMasseMap]);

  // Bascule active entre la Vue 1 et la Vue 2 d'une structure
  const handleSwitchMasseView = useCallback(async (strId, targetViewNum) => {
    const currentView = masseViewTabs[strId] || 1;
    if (currentView === targetViewNum) return;

    // 1. Sauvegarder la capture de la vue en cours avant de basculer
    await captureStructureMasseMap(strId, currentView);

    // 2. Changer d'onglet
    setMasseViewTabs(prev => ({ ...prev, [strId]: targetViewNum }));

    // 3. Déplacer la carte sur la vue cible
    const map = masseMapInstancesRef.current[strId];
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    if (map && targetStr) {
      const bLat = Number(targetStr.lat || (targetStr.gps ? targetStr.gps.split(',')[0] : null) || 43.43571);
      const bLng = Number(targetStr.lng || (targetStr.gps ? targetStr.gps.split(',')[1] : null) || -1.17644);
      
      if (targetViewNum === 2) {
        const cLat = Number(targetStr.masse_center_lat_2 || bLat);
        const cLng = Number(targetStr.masse_center_lng_2 || bLng);
        const cZoom = Number(targetStr.masse_zoom_2 || Math.max(14, (Number(targetStr.masse_zoom) || 18) - 2));
        map.setView([cLat, cLng], cZoom, { animate: false });
      } else {
        const cLat = Number(targetStr.masse_center_lat || bLat);
        const cLng = Number(targetStr.masse_center_lng || bLng);
        const cZoom = Number(targetStr.masse_zoom || 18);
        map.setView([cLat, cLng], cZoom, { animate: false });
      }
      setTimeout(() => map.invalidateSize(), 50);
    }
  }, [masseViewTabs, captureStructureMasseMap, allConfiguredStructures]);

  // Ajout d'une 2nde vue pour la structure
  const handleAddMasseView2 = useCallback(async (strId) => {
    // 1. Sauvegarder la Vue 1
    await captureStructureMasseMap(strId, 1);

    // 2. Activer la Vue 2
    setHasMasseView2(prev => ({ ...prev, [strId]: true }));
    setMasseViewTabs(prev => ({ ...prev, [strId]: 2 }));

    const map = masseMapInstancesRef.current[strId];
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    if (map && targetStr) {
      const bLat = Number(targetStr.lat || (targetStr.gps ? targetStr.gps.split(',')[0] : null) || 43.43571);
      const bLng = Number(targetStr.lng || (targetStr.gps ? targetStr.gps.split(',')[1] : null) || -1.17644);
      const newZoom = Math.max(14, (Number(targetStr.masse_zoom) || 18) - 2);

      map.setView([bLat, bLng], newZoom, { animate: false });
      setTimeout(() => map.invalidateSize(), 50);

      handleMasseMapChange(strId, { centerLat: bLat, centerLng: bLng, zoom: newZoom }, 2);

      setTimeout(() => {
        captureStructureMasseMap(strId, 2);
      }, 500);
    }
  }, [captureStructureMasseMap, allConfiguredStructures, handleMasseMapChange]);

  // Suppression de la 2nde vue
  const handleRemoveMasseView2 = useCallback((strId) => {
    setHasMasseView2(prev => ({ ...prev, [strId]: false }));
    setMasseViewTabs(prev => ({ ...prev, [strId]: 1 }));

    setSolutions(prev => {
      const nextSol = { ...prev };
      ['building', 'ombriere', 'battery'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          nextSol[solKey] = {
            ...nextSol[solKey],
            buildings: nextSol[solKey].buildings.map(b => {
              if (b.id === strId) {
                const { masse_capture_2, masse_zoom_2, masse_center_lat_2, masse_center_lng_2, ...rest } = b;
                return rest;
              }
              return b;
            })
          };
        }
      });
      return nextSol;
    });

    setCaptures(prev => {
      const next = { ...prev };
      delete next.masse_projet_2;
      return next;
    });

    const map = masseMapInstancesRef.current[strId];
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    if (map && targetStr) {
      const bLat = Number(targetStr.lat || (targetStr.gps ? targetStr.gps.split(',')[0] : null) || 43.43571);
      const bLng = Number(targetStr.lng || (targetStr.gps ? targetStr.gps.split(',')[1] : null) || -1.17644);
      const cLat = Number(targetStr.masse_center_lat || bLat);
      const cLng = Number(targetStr.masse_center_lng || bLng);
      const cZoom = Number(targetStr.masse_zoom || 18);
      map.setView([cLat, cLng], cZoom, { animate: false });
      setTimeout(() => map.invalidateSize(), 50);
    }
  }, [allConfiguredStructures]);

  // Capture manuelle à la demande avec confirmation visuelle
  const handleManualCapture = useCallback(async (strId) => {
    const activeView = masseViewTabs[strId] || 1;
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    const isDim = masseShowDimensions[strId] !== undefined
      ? Boolean(masseShowDimensions[strId])
      : (targetStr?.masse_show_dimensions !== false);
    const res = await captureStructureMasseMap(strId, activeView, isDim);
    if (res) {
      setMasseCapturedToast(prev => ({ ...prev, [strId]: `Vue ${activeView} capturée !` }));
      setTimeout(() => {
        setMasseCapturedToast(prev => ({ ...prev, [strId]: null }));
      }, 2500);
    }
  }, [masseViewTabs, captureStructureMasseMap, allConfiguredStructures, masseShowDimensions]);

  // Bascule de l'affichage des côtes (longueur et largeur) sur le plan de masse
  const handleToggleMasseDimensions = useCallback((strId) => {
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    const currentVal = masseShowDimensions[strId] !== undefined
      ? Boolean(masseShowDimensions[strId])
      : (targetStr?.masse_show_dimensions !== false);
    const nextVal = !currentVal;

    setMasseShowDimensions(prev => ({ ...prev, [strId]: nextVal }));

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;
      ['building', 'ombriere', 'battery'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          const nextList = nextSol[solKey].buildings.map(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : (solKey === 'battery' ? 'bat-sa-' : 'bat-')) ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : (solKey === 'battery' ? 'bat-sa' : 'bat')}-1`;
            if (b.id === strId || currentId === strId) {
              updated = true;
              return { ...b, masse_show_dimensions: nextVal };
            }
            return b;
          });
          if (updated) {
            nextSol[solKey] = { ...nextSol[solKey], buildings: nextList };
          }
        }
      });
      return updated ? nextSol : prev;
    });

    setBuildings(prev => prev.map(b => b.id === strId ? { ...b, masse_show_dimensions: nextVal } : b));

    // Re-capturer immédiatement la vue active avec l'état de cotation choisi
    setTimeout(async () => {
      const activeView = masseViewTabs[strId] || 1;
      await captureStructureMasseMap(strId, activeView, nextVal);
    }, 150);
  }, [allConfiguredStructures, masseShowDimensions, masseViewTabs, captureStructureMasseMap]);

  // Capture de toutes les visionneuses de plan de masse actives
  const captureAllActiveMasseMaps = useCallback(async () => {
    const activeList = allConfiguredStructures.filter(str => selectedStructureIds.includes(str.id));
    for (const str of activeList) {
      const activeView = masseViewTabs[str.id] || 1;
      const isDim = masseShowDimensions[str.id] !== undefined
        ? Boolean(masseShowDimensions[str.id])
        : (str.masse_show_dimensions !== false);
      await captureStructureMasseMap(str.id, activeView, isDim);
      if (hasMasseView2[str.id] && !str.masse_capture_2) {
        await captureStructureMasseMap(str.id, 2, isDim);
      }
    }
  }, [allConfiguredStructures, selectedStructureIds, masseViewTabs, hasMasseView2, captureStructureMasseMap, masseShowDimensions]);

  // Auto-détection de Vue 2 si existante dans le projet
  useEffect(() => {
    const view2Map = {};
    let found = false;
    allConfiguredStructures.forEach(str => {
      if (str.masse_capture_2 || str.masse_zoom_2) {
        view2Map[str.id] = true;
        found = true;
      }
    });
    if (!found && (project?.masse_capture_2 || project?.urbanisme_captures?.masse_projet_2) && allConfiguredStructures.length > 0) {
      view2Map[allConfiguredStructures[0].id] = true;
    }
    if (Object.keys(view2Map).length > 0) {
      setHasMasseView2(prev => ({ ...view2Map, ...prev }));
    }
  }, [allConfiguredStructures, project]);

  // Auto-capture initiale dès que l'utilisateur entre sur l'étape Carte DP2/PC2 (étape 4)
  useEffect(() => {
    if (step !== 4) return;
    const timer = setTimeout(() => {
      captureAllActiveMasseMaps();
    }, 1200);
    return () => clearTimeout(timer);
  }, [step, captureAllActiveMasseMaps]);

  // Sauvegarde simulation 3D après projet (DP6 / PC6)
  const handleSaveSimulation = (simulatedDataUrl) => {
    const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
    if (activeBuildingIndex === 0) {
      setPhotos(prev => ({ ...prev, apres: simulatedDataUrl }));
      setEditedProject(prev => ({
        ...prev,
        pc_photos: { ...(prev.pc_photos || {}), apres: simulatedDataUrl }
      }));
    }
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].photos = { 
          ...(updated[activeBuildingIndex].photos || {}), 
          apres: simulatedDataUrl 
        };
        updated[activeBuildingIndex].pc_photos = { 
          ...(updated[activeBuildingIndex].pc_photos || {}), 
          apres: simulatedDataUrl 
        };
      }
      return updated;
    });
    persistMediaItem(bKey, 'apres', simulatedDataUrl, 'photos');
  };

  // Sauvegarde des captures de façades pour DP4 / PC5
  const handleCaptureSnapshotPC5 = (dataUrl, slotKey = 'facade_sud') => {
    const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
    if (activeBuildingIndex === 0) {
      setCaptures(prev => ({ ...prev, [slotKey]: dataUrl, facades_projet: dataUrl }));
      setEditedProject(prev => ({
        ...prev,
        urbanisme_captures: { ...(prev.urbanisme_captures || {}), [slotKey]: dataUrl, facades_projet: dataUrl }
      }));
    }
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...(updated[activeBuildingIndex].captures || {}),
          [slotKey]: dataUrl,
          facades_projet: dataUrl
        };
      }
      return updated;
    });
    persistMediaItem(bKey, slotKey, dataUrl, 'captures');
  };

  const handleCaptureAll5ViewsPC5 = (fiveViewsObj) => {
    if (!fiveViewsObj) return;
    const normalized = {
      ...fiveViewsObj,
      facade_sud: fiveViewsObj.facade_sud || fiveViewsObj.sud,
      facade_nord: fiveViewsObj.facade_nord || fiveViewsObj.nord,
      facade_est: fiveViewsObj.facade_est || fiveViewsObj.est,
      facade_ouest: fiveViewsObj.facade_ouest || fiveViewsObj.ouest,
      vue_couverture: fiveViewsObj.vue_couverture || fiveViewsObj.toiture || fiveViewsObj.dessus,
      facades_projet: fiveViewsObj.facades_projet || fiveViewsObj.facade_sud || fiveViewsObj.sud
    };
    const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
    if (activeBuildingIndex === 0) {
      setCaptures(prev => ({ ...prev, ...normalized, facades_projet: normalized.facade_sud || normalized.vue_couverture }));
      setEditedProject(prev => ({
        ...prev,
        urbanisme_captures: { 
          ...(prev.urbanisme_captures || {}), 
          ...normalized, 
          facades_projet: normalized.facade_sud || normalized.vue_couverture 
        }
      }));
    }
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...(updated[activeBuildingIndex].captures || {}),
          ...normalized,
          facades_projet: normalized.facade_sud || normalized.vue_couverture || updated[activeBuildingIndex].captures?.facades_projet
        };
      }
      return updated;
    });
    Object.entries(normalized).forEach(([k, v]) => {
      if (v) persistMediaItem(bKey, k, v, 'captures');
    });
  };

  // Chargement direct de photo (sans pop-up automatique de recadrage)
  const handleDirectPhotoUpload = (category, key, event) => {
    const file = event.target?.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl) return;
      const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
      if (category === 'photos') {
        setPhotos(prev => ({ ...prev, [key]: dataUrl }));
        setEditedProject(prev => ({
          ...prev,
          pc_photos: { ...(prev.pc_photos || {}), [key]: dataUrl },
          photos: { ...(prev.photos || {}), [key]: dataUrl }
        }));
        setBuildings(prev => {
          const updated = [...prev];
          if (updated[activeBuildingIndex]) {
            updated[activeBuildingIndex].photos = {
              ...(updated[activeBuildingIndex].photos || {}),
              [key]: dataUrl
            };
            updated[activeBuildingIndex].pc_photos = {
              ...(updated[activeBuildingIndex].pc_photos || {}),
              [key]: dataUrl
            };
          }
          return updated;
        });
        persistMediaItem(bKey, key, dataUrl, 'photos');
      } else if (category === 'captures') {
        setCaptures(prev => ({ ...prev, [key]: dataUrl }));
        setEditedProject(prev => ({
          ...prev,
          urbanisme_captures: { ...(prev.urbanisme_captures || {}), [key]: dataUrl }
        }));
        if (key === 'situation_ign' || key === 'satellite' || key === 'masse_projet') {
          persistMediaItem('general', key, dataUrl, 'captures');
        } else {
          setBuildings(prev => {
            const updated = [...prev];
            if (updated[activeBuildingIndex]) {
              updated[activeBuildingIndex].captures = {
                ...(updated[activeBuildingIndex].captures || {}),
                [key]: dataUrl
              };
            }
            return updated;
          });
          persistMediaItem(bKey, key, dataUrl, 'captures');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCrop = (src, category, key, title) => {
    setCropModal({ open: true, src, category, key, title });
  };

  const handleCropComplete = (croppedDataUrl) => {
    const { category, key } = cropModal;
    const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
    if (category === 'photos') {
      setPhotos(prev => ({ ...prev, [key]: croppedDataUrl }));
      setEditedProject(prev => ({
        ...prev,
        pc_photos: { ...(prev.pc_photos || {}), [key]: croppedDataUrl },
        photos: { ...(prev.photos || {}), [key]: croppedDataUrl }
      }));
      setBuildings(prev => {
        const updated = [...prev];
        if (updated[activeBuildingIndex]) {
          updated[activeBuildingIndex].photos = { ...updated[activeBuildingIndex].photos, [key]: croppedDataUrl };
          updated[activeBuildingIndex].pc_photos = { ...(updated[activeBuildingIndex].pc_photos || {}), [key]: croppedDataUrl };
        }
        return updated;
      });
      persistMediaItem(bKey, key, croppedDataUrl, 'photos');
    }
    if (category === 'captures') {
      setCaptures(prev => ({ ...prev, [key]: croppedDataUrl }));
      setEditedProject(prev => ({ ...prev, urbanisme_captures: { ...(prev.urbanisme_captures || {}), [key]: croppedDataUrl } }));
      if (key === 'situation_ign' || key === 'satellite' || key === 'masse_projet') {
        persistMediaItem('general', key, croppedDataUrl, 'captures');
      } else {
        setBuildings(prev => {
          const updated = [...prev];
          if (updated[activeBuildingIndex]) {
            updated[activeBuildingIndex].captures = { ...updated[activeBuildingIndex].captures, [key]: croppedDataUrl };
          }
          return updated;
        });
        persistMediaItem(bKey, key, croppedDataUrl, 'captures');
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
    setEditedProject(prev => {
      const next = { ...prev, [field]: value };
      queueAutoSave({ editedProject: next });
      return next;
    });
  };

  // ── Multi-Parcelles Cadastrales (Étape 7 Validation) ─────────────────────
  const projectParcelles = useMemo(() => {
    if (Array.isArray(editedProject?.parcelles) && editedProject.parcelles.length > 0) {
      return editedProject.parcelles;
    }
    if (Array.isArray(editedProject?.cadastre_parcelles) && editedProject.cadastre_parcelles.length > 0) {
      return editedProject.cadastre_parcelles;
    }
    return [{
      section: editedProject?.cadastre_section || project?.cadastre_section || '',
      numero: editedProject?.cadastre_numero || project?.cadastre_numero || '',
      surface: editedProject?.cadastre_surface || project?.cadastre_surface || '',
    }];
  }, [
    editedProject?.parcelles,
    editedProject?.cadastre_parcelles,
    editedProject?.cadastre_section,
    editedProject?.cadastre_numero,
    editedProject?.cadastre_surface,
    project?.cadastre_section,
    project?.cadastre_numero,
    project?.cadastre_surface
  ]);

  const handleParcelleChange = (index, field, value) => {
    const current = [...projectParcelles];
    if (!current[index]) {
      current[index] = { section: '', numero: '', surface: '' };
    }
    current[index] = { ...current[index], [field]: value };

    const updates = {
      parcelles: current,
      cadastre_parcelles: current
    };

    if (index === 0) {
      if (field === 'section') {
        updates.cadastre_section = value;
        updates.terrain_section = value;
        handleFieldChange('cadastre_section', value);
        handleFieldChange('terrain_section', value);
      } else if (field === 'numero') {
        updates.cadastre_numero = value;
        updates.terrain_numero = value;
        updates.parcelle = value;
        handleFieldChange('cadastre_numero', value);
        handleFieldChange('terrain_numero', value);
      } else if (field === 'surface') {
        updates.cadastre_surface = value;
        updates.terrain_surface = value;
        handleFieldChange('cadastre_surface', value);
        handleFieldChange('terrain_surface', value);
      }
    }

    setEditedProject(prev => {
      const next = { ...prev, ...updates };
      queueAutoSave({ editedProject: next });
      return next;
    });
  };

  const handleAddParcelle = () => {
    const updated = [...projectParcelles, { section: '', numero: '', surface: '' }];
    setEditedProject(prev => {
      const next = {
        ...prev,
        parcelles: updated,
        cadastre_parcelles: updated
      };
      queueAutoSave({ editedProject: next });
      return next;
    });
  };

  const handleRemoveParcelle = (indexToRemove) => {
    if (indexToRemove === 0) return;
    const updated = projectParcelles.filter((_, idx) => idx !== indexToRemove);
    setEditedProject(prev => {
      const next = {
        ...prev,
        parcelles: updated,
        cadastre_parcelles: updated
      };
      queueAutoSave({ editedProject: next });
      return next;
    });
  };

  const prepareProjectPayload = async () => {
    const isBattery = !isNoBattery && solutionType === 'battery';
    
    // Objet synthétique pour Page 1
    const defaultObjet = isBattery
      ? "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV."
      : (isDP
        ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
        : (isPC
          ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
          : "Certificat d'urbanisme opérationnel pour centrale photovoltaïque"));
    
    let shortObjet = editedProject?.objet_travaux || defaultObjet;
    if (isBattery) {
      if (!shortObjet || /ombrière|bâtiment|hangar/i.test(shortObjet)) {
        shortObjet = defaultObjet;
      }
    } else if (isNoBattery || (!isBattery && /batterie|bess|stockage d'énergie/i.test(shortObjet || ''))) {
      shortObjet = defaultObjet;
    }

    let effectiveNotice = noticeText || editedProject.noticeText || project?.noticeText || buildAutoNoticeText();
    if ((isNoBattery || !isBattery) && effectiveNotice) {
      effectiveNotice = effectiveNotice
        .replace(/Le système de stockage batterie est[^\n]*\n?/gi, '')
        .replace(/ainsi qu'un système de stockage batterie[^\n,\.]*/gi, '')
        .replace(/Le site sera également équipé d'un système de stockage d'énergie[^\n]*\n?/gi, '')
        .replace(/et le système de stockage batterie/gi, '')
        .replace(/Station Batteries \([^\)]*\)/gi, solutionType === 'building' ? 'Bâtiment' : (isDP ? 'Ombrière' : 'Bâtiment'));
    }

    // ── Synchronisation dynamique des parcelles dans la Notice Descriptive lors du clic Générer
    const activeParcellesForNotice = (Array.isArray(editedProject?.parcelles) && editedProject.parcelles.length > 0)
      ? editedProject.parcelles
      : (Array.isArray(editedProject?.cadastre_parcelles) && editedProject.cadastre_parcelles.length > 0)
        ? editedProject.cadastre_parcelles
        : projectParcelles;

    const totalNoticeSurfaceVal = activeParcellesForNotice.reduce((sum, p) => {
      const s = Number(String(p?.surface || '').replace(/\D/g, ''));
      return sum + (isNaN(s) ? 0 : s);
    }, 0);
    const totalNoticeSurfaceStr = totalNoticeSurfaceVal > 0 ? `${totalNoticeSurfaceVal} m²` : (activeParcellesForNotice[0]?.surface ? `${activeParcellesForNotice[0].surface} m²` : '18 384 m²');
    const noticeAltitude = editedProject?.altitude || project?.altitude || '140.62 m';

    let updatedCadastreSentence = '';
    if (activeParcellesForNotice.length > 1) {
      const formattedList = activeParcellesForNotice.map(p => `${p.section ? `section ${p.section} ` : ''}n° ${p.numero || '—'}${p.surface ? ` (${p.surface} m²)` : ''}`).join(', ');
      updatedCadastreSentence = isBattery
        ? `Références cadastrales : sections/parcelles ${formattedList} (surface totale : ${totalNoticeSurfaceStr}, altitude : ${noticeAltitude})`
        : `Le terrain concerné par le projet concerne les parcelles cadastrées ${formattedList} (surface totale : ${totalNoticeSurfaceStr})`;
    } else {
      const p0 = activeParcellesForNotice[0] || {};
      const sec = (p0.section || editedProject?.cadastre_section || '').trim();
      const num = (p0.numero || editedProject?.cadastre_numero || '000 B 633').trim();
      const refCad = `${sec ? `section ${sec} ` : ''}n° ${num || '—'}`.trim();
      const pSurf = p0.surface ? `${p0.surface} m²` : totalNoticeSurfaceStr;
      updatedCadastreSentence = isBattery
        ? `Références cadastrales : Section/Parcelle ${refCad} (surface de la parcelle : ${pSurf}, altitude : ${noticeAltitude})`
        : `Le terrain concerné par le projet est cadastré sous le numéro ${refCad} (surface : ${pSurf})`;
    }

    if (effectiveNotice) {
      if (isBattery) {
        if (/Références cadastrales\s*:[^\n\.]*(\([^\)]*\))?/i.test(effectiveNotice)) {
          effectiveNotice = effectiveNotice.replace(/Références cadastrales\s*:[^\n\.]*(\([^\)]*\))?/i, updatedCadastreSentence);
        }
      } else {
        if (/Le terrain concerné par le projet (?:est cadastré sous le numéro|concerne les parcelles cadastrées)[^\.]*\./i.test(effectiveNotice)) {
          effectiveNotice = effectiveNotice.replace(/Le terrain concerné par le projet (?:est cadastré sous le numéro|concerne les parcelles cadastrées)[^\.]*\./i, `${updatedCadastreSentence}.`);
        } else if (/Références cadastrales\s*:[^\n\.]*(\([^\)]*\))?/i.test(effectiveNotice)) {
          effectiveNotice = effectiveNotice.replace(/Références cadastrales\s*:[^\n\.]*(\([^\)]*\))?/i, `${updatedCadastreSentence}.`);
        }
      }
      setNoticeText(effectiveNotice);
      setEditedProject(prev => ({ ...prev, noticeText: effectiveNotice }));
    }

    // Rassembler les structures configurées de la solution sélectionnée
    const allConfigured = scopedStructures;
    
    // Filtrer selon la sélection explicite de l'utilisateur (selectedStructureIds)
    const candidateBuildings = isBattery
      ? allConfigured.filter(b => (b.solutionKey === 'battery' || b.isBattery) && selectedStructureIds.includes(b.id))
      : allConfigured.filter(b => selectedStructureIds.includes(b.id));
    const structuresToExport = candidateBuildings.length > 0
      ? candidateBuildings
      : (isBattery 
          ? allConfigured.filter(b => b.solutionKey === 'battery' || b.isBattery).slice(0, 1)
          : (allConfigured.length > 0 ? allConfigured.slice(0, 1) : buildings));

    // Conserver fidèlement chaque structure retenue avec ses propres dimensions et paramètres
    const updatedBuildings = structuresToExport.map((b, idx) => {
      let bLen = isBattery ? Number(b.length || 6.20) : Number(b.length || (b.bayCount ? b.bayCount * (b.baySpacing || 7.5) : (isAcama ? 30 : 37.5)));
      let bWid = isBattery ? Number(b.width || 3.20) : Number(b.width || (isAcama ? 15 : 16.4));
      if (isBattery) {
        bLen = 6.20;
        bWid = 3.20;
      } else if (bWid <= 6.0 || bLen <= 6.0) {
        bLen = isAcama ? 30 : 37.5;
        bWid = isAcama ? 15 : 16.4;
      }
      let bName = b.name;
      const isOmb = solutionType === 'ombriere' || b.solutionKey === 'ombriere' || (b.buildingType || '').toLowerCase().startsWith('ombriere');
      if (isBattery) {
        bName = 'Station Batteries Stand-Alone (500 kW)';
      } else {
        if (isAcama) {
          bName = `Bâtiment ${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m`;
        } else if (bName) {
          bName = bName.replace(/Station Batteries[^\)]*\)?/gi, isOmb ? 'Ombrière' : 'Bâtiment').trim();
        }
      }
      return {
        ...b,
        solutionKey: isBattery ? 'battery' : solutionType,
        solutionType: isBattery ? 'battery' : solutionType,
        length: bLen,
        width: bWid,
        eaveHeight: isBattery ? 2.38 : Number(b.eaveHeight !== undefined && !isNaN(Number(b.eaveHeight)) ? b.eaveHeight : (isOmb ? 3.7 : 4.0)),
        roofPitch: isBattery ? 0 : Number(b.roofPitch !== undefined && !isNaN(Number(b.roofPitch)) ? b.roofPitch : 10),
        buildingType: isBattery ? 'battery_standalone' : ((b.buildingType === 'battery_standalone' || !b.buildingType) ? (isAcama ? 'symetrique' : (isOmb ? 'ombriere_pl' : 'asymetrique_1')) : b.buildingType),
        isBattery: isBattery,
        isBatteryStandAlone: isBattery,
        name: bName || (isBattery ? 'Station Batteries Stand-Alone (500 kW)' : (isOmb ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`)),
        leftSide: isBattery ? 'none' : (b.leftSide || 'none'),
        rightSide: isBattery ? 'none' : (b.rightSide || 'none'),
        leftWidth: isBattery ? 0 : (b.leftWidth !== undefined ? Number(b.leftWidth) : 0),
        rightWidth: isBattery ? 0 : (b.rightWidth !== undefined ? Number(b.rightWidth) : 0),
        bayCount: Number(b.bayCount || (isBattery ? 4 : 5)),
        baySpacing: Number(b.baySpacing || (isBattery ? 1.15 : 7.5)),
        captures: { ...(b.captures || {}) },
        photos: { ...(b.photos || {}) },
      };
    });

    const isMultiOrOmbriere = !isBattery && (solutionType === 'ombriere' || updatedBuildings.length > 1 || updatedBuildings.some(b => (b.buildingType || '').includes('ombriere')));
    const defaultTypeLabel = isBattery
      ? "Station Batteries Stand-Alone"
      : (solutionType === 'building'
        ? (isAcama ? 'Bâtiment photovoltaïque' : 'Bâtiment et Ombrière')
        : (isDP
          ? (updatedBuildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque')
          : (isMultiOrOmbriere ? 'Bâtiment et Ombrière' : (editedProject.type || 'batiment_solaire'))));
    let finalTypeLabel = defaultTypeLabel;
    if (isBattery) {
      finalTypeLabel = "Station Batteries Stand-Alone";
    } else if (editedProject?.urbanismeType && !editedProject.urbanismeType.toLowerCase().includes('batterie')) {
      finalTypeLabel = editedProject.urbanismeType;
    }

    // Régénérer les cartes DP1/PC1 et DP2/PC2 avec le dernier GPS et les structures orientées
    const siteCoords = resolveProjectCoordinates(editedProject, project);
    const lat = siteCoords.lat;
    const lng = siteCoords.lng;
    const ignMap = await generateStaticMapImage(lat, lng, 'map', 16);
    const satMap = await generateStaticMapImage(lat, lng, 'satellite', 17);
    
    // Génération / validation de la capture de plan de masse individuelle par bâtiment (Vue 1 et Vue 2)
    const buildingsWithMasse = await Promise.all(updatedBuildings.map(async (b) => {
      const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || lat);
      const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || lng);
      
      const map = masseMapInstancesRef.current[b.id];
      const isView1OnMap = map && (masseViewTabs[b.id] || 1) === 1;

      // Zoom garanti : au minimum 18 pour Vue 1
      let bZoom = Number((isView1OnMap ? map.getZoom() : b.masse_zoom) || 18);
      if (bZoom < 17) bZoom = 18;

      const bCenterLat = Number((isView1OnMap ? map.getCenter().lat : b.masse_center_lat) || bLat);
      const bCenterLng = Number((isView1OnMap ? map.getCenter().lng : b.masse_center_lng) || bLng);

      const bShowDim = masseShowDimensions[b.id] !== undefined
        ? Boolean(masseShowDimensions[b.id])
        : (b.masse_show_dimensions !== false);

      // --- VUE 1 : Plan de masse avec zoom exact et cotations / mesures personnalisées ---
      const strDistances1 = masseDistances[b.id] || b.masseDistances || [];
      let masse1 = null;
      if (isView1OnMap) {
        masse1 = await captureDirectLeafletMap(map, b, updatedBuildings, bShowDim, strDistances1, sdisPoint);
      }
      if (!masse1 && b.masse_capture) {
        // Conserver la capture active si elle existe (contient les tracés de cotes réalisés à l'étape Carte)
        masse1 = b.masse_capture;
      }
      if (!masse1 && captures?.masse_projet) {
        masse1 = captures.masse_projet;
      }
      if (!masse1 && editedProject?.urbanisme_captures?.masse_projet) {
        masse1 = editedProject.urbanisme_captures.masse_projet;
      }
      if (!masse1 && editedProject?.masse_capture) {
        masse1 = editedProject.masse_capture;
      }
      if (!masse1) {
        masse1 = await generateStaticMapImage(bCenterLat, bCenterLng, 'map', bZoom, updatedBuildings, bShowDim, strDistances1, sdisPoint);
      }

      // --- VUE 2 (si demandée) ---
      const wantsVue2 = hasMasseView2[b.id] || Boolean(b.masse_capture_2 || b.masse_zoom_2);
      let masse2 = null;
      let bZoom2 = Number(b.masse_zoom_2 || Math.max(14, bZoom - 2));
      let bCenterLat2 = Number(b.masse_center_lat_2 || bLat);
      let bCenterLng2 = Number(b.masse_center_lng_2 || bLng);

      if (wantsVue2) {
        const strDistances2 = masseDistances[b.id] || b.masseDistances || [];
        const isView2OnMap = map && masseViewTabs[b.id] === 2;
        if (isView2OnMap) {
          bZoom2 = Number(map.getZoom() || bZoom2);
          bCenterLat2 = Number(map.getCenter().lat || bCenterLat2);
          bCenterLng2 = Number(map.getCenter().lng || bCenterLng2);
          masse2 = await captureDirectLeafletMap(map, b, updatedBuildings, bShowDim, strDistances2, sdisPoint);
        }
        if (!masse2 && b.masse_capture_2) {
          masse2 = b.masse_capture_2;
        }
        if (!masse2 && captures?.masse_projet_2) {
          masse2 = captures.masse_projet_2;
        }
        if (!masse2 && editedProject?.urbanisme_captures?.masse_projet_2) {
          masse2 = editedProject.urbanisme_captures.masse_projet_2;
        }
        if (!masse2) {
          masse2 = await generateStaticMapImage(bCenterLat2, bCenterLng2, 'map', bZoom2, updatedBuildings, bShowDim, strDistances2, sdisPoint);
        }
      }

      return {
        ...b,
        lat: bLat,
        lng: bLng,
        gps: `${bLat},${bLng}`,
        masse_capture: masse1 || null,
        masse_zoom: bZoom,
        masse_center_lat: bCenterLat,
        masse_center_lng: bCenterLng,
        masse_show_dimensions: bShowDim,
        ...(wantsVue2 ? {
          masse_capture_2: masse2 || null,
          masse_zoom_2: bZoom2,
          masse_center_lat_2: bCenterLat2,
          masse_center_lng_2: bCenterLng2,
        } : {})
      };
    }));

    const firstShowDim = masseShowDimensions[buildingsWithMasse[0]?.id] !== undefined
      ? Boolean(masseShowDimensions[buildingsWithMasse[0]?.id])
      : (buildingsWithMasse[0]?.masse_show_dimensions !== false);
    const b1Distances = masseDistances[buildingsWithMasse[0]?.id] || buildingsWithMasse[0]?.masseDistances || [];
    const masseMap = buildingsWithMasse[0]?.masse_capture || captures?.masse_projet || editedProject?.urbanisme_captures?.masse_projet || editedProject?.masse_capture || await generateStaticMapImage(lat, lng, 'map', 18, updatedBuildings, firstShowDim, b1Distances, sdisPoint);
    const masseMap2 = buildingsWithMasse[0]?.masse_capture_2 || null;

    const allBuildingsCaptures = updatedBuildings.reduce((acc, b) => ({
      ...acc,
      ...(b.captures || {}),
      ...(b.urbanisme_captures || {})
    }), {});

    const allBuildingsPhotos = updatedBuildings.reduce((acc, b) => ({
      ...acc,
      ...(b.photos || {}),
      ...(b.pc_photos || {})
    }), {});

    const finalCaptures = {
      ...captures,
      ...(editedProject.urbanisme_captures || {}),
      ...allBuildingsCaptures,
      ...(ignMap ? { ign: ignMap } : {}),
      ...(satMap ? { satellite: satMap } : {}),
      ...(masseMap ? { masse_projet: masseMap } : {}),
      ...(masseMap2 ? { masse_projet_2: masseMap2 } : {}),
      masse_zoom: buildingsWithMasse[0]?.masse_zoom || 18,
      ...(masseMap2 ? { masse_zoom_2: buildingsWithMasse[0]?.masse_zoom_2 || 16 } : {})
    };

    const finalPhotos = {
      ...photos,
      ...(editedProject.pc_photos || {}),
      ...allBuildingsPhotos,
    };

    // Garder les photos et captures de chaque structure strictement indépendantes
    const enrichedBuildings = buildingsWithMasse.map((b) => ({
      ...b,
      masse_capture: b.masse_capture || masseMap,
      masse_zoom: b.masse_zoom || 18,
      ...(b.masse_capture_2 ? { 
        masse_capture_2: b.masse_capture_2,
        masse_zoom_2: b.masse_zoom_2 || 16 
      } : {}),
      captures: { 
        ...(b.captures || {}), 
        ...(b.urbanisme_captures || {}),
        masse_projet: b.masse_capture || masseMap,
        masse_zoom: b.masse_zoom || 18,
        ...(b.masse_capture_2 ? {
          masse_projet_2: b.masse_capture_2,
          masse_zoom_2: b.masse_zoom_2 || 16
        } : {})
      },
      urbanisme_captures: { 
        ...(b.captures || {}), 
        ...(b.urbanisme_captures || {}),
        masse_projet: b.masse_capture || masseMap,
        masse_zoom: b.masse_zoom || 18,
        ...(b.masse_capture_2 ? {
          masse_projet_2: b.masse_capture_2,
          masse_zoom_2: b.masse_zoom_2 || 16
        } : {})
      },
      photos: { ...(b.photos || {}), ...(b.pc_photos || {}) },
      pc_photos: { ...(b.photos || {}), ...(b.pc_photos || {}) },
    }));

    const preservedKwc = editedProject?.puissance || editedProject?.kwc || project?.kwc || project?.puissance || project?.projectSize || editedProject?.projectSize || '';
    const b1 = enrichedBuildings[0] || {};
    const resolvedClientNames = resolveDemandeurNames(editedProject || project);
    const resolvedLastName = (editedProject?.lastName || project?.lastName || resolvedClientNames.lastName || '').trim();
    const resolvedFirstName = (editedProject?.firstName || project?.firstName || resolvedClientNames.firstName || '').trim();
    const resolvedDemandeur = (editedProject?.demandeur || project?.demandeur || `${resolvedLastName} ${resolvedFirstName}`.trim() || resolvedLastName || 'Demandeur').trim();
    const fallbackEmail = editedProject?.email || project?.email || project?.clientEmail || 'contact@enr-courtage.fr';
    const finalAddress = editedProject?.address || project?.address || project?.clientAddress || '';
    const finalCity = editedProject?.city || editedProject?.commune || project?.city || project?.commune || '';
    const finalZip = editedProject?.zip || project?.zip || '';
    const parsedFinalAddr = parseFrenchAddress(finalAddress, finalZip, finalCity);

    const effectiveObjet = (editedProject?.objet_travaux && editedProject.objet_travaux.trim().length > 30)
      ? editedProject.objet_travaux
      : (defaultObjetTravauxText || shortObjet);

    const finalProject = {
      ...editedProject,
      ...fieldValues,
      parcelles: activeParcellesForNotice,
      cadastre_parcelles: activeParcellesForNotice,
      demandeur: resolvedDemandeur,
      lastName: resolvedLastName,
      firstName: resolvedFirstName,
      clientName: resolvedDemandeur,
      birthDate: (editedProject?.birthDate || project?.birthDate || '').replace(/\D/g, '').slice(0, 8),
      birthCity: editedProject?.birthCity || project?.birthCity || '',
      birthDept: editedProject?.birthDepartment || editedProject?.birthDept || project?.birthDepartment || project?.birthDept || '',
      birthCountry: editedProject?.birthCountry || project?.birthCountry || 'FRANCE',
      phone: editedProject?.phone || project?.phone || project?.clientPhone || '',
      email: fallbackEmail,
      address: finalAddress,
      clientAddress: finalAddress,
      city: finalCity,
      commune: finalCity,
      cadastre_commune: finalCity,
      zip: finalZip || parsedFinalAddr.codePostal || '',
      cadastre_section: (activeParcellesForNotice[0]?.section || editedProject?.cadastre_section || '').toUpperCase().trim(),
      cadastre_numero: (activeParcellesForNotice[0]?.numero || editedProject?.cadastre_numero || '').trim(),
      cadastre_surface: activeParcellesForNotice.length > 1 ? String(totalNoticeSurfaceVal) : (activeParcellesForNotice[0]?.surface || editedProject?.cadastre_surface || ''),
      cadastre: activeParcellesForNotice.length > 1
        ? activeParcellesForNotice.map(p => `${p.section ? `${p.section} ` : ''}${p.numero || ''}`.trim()).filter(Boolean).join(', ')
        : ((editedProject?.cadastre_section && editedProject?.cadastre_numero)
          ? `${(editedProject.cadastre_section).toUpperCase()} ${(editedProject.cadastre_numero).trim()}`
          : (editedProject?.cadastre || project?.cadastre || '—')),
      terrain_address: finalAddress,
      terrain_voie: parsedFinalAddr.voie || finalAddress,
      terrain_voie_nom: parsedFinalAddr.voie || finalAddress,
      terrain_voie_num: parsedFinalAddr.numero || '',
      terrain_city: finalCity || parsedFinalAddr.commune,
      terrain_commune: finalCity || parsedFinalAddr.commune,
      terrain_zip: finalZip || parsedFinalAddr.codePostal,
      terrain_section: (activeParcellesForNotice[0]?.section || editedProject?.cadastre_section || '').toUpperCase().trim(),
      terrain_numero: (activeParcellesForNotice[0]?.numero || editedProject?.cadastre_numero || '').trim(),
      terrain_surface: activeParcellesForNotice.length > 1 ? String(totalNoticeSurfaceVal) : (activeParcellesForNotice[0]?.surface || editedProject?.cadastre_surface || ''),
      sdisPoint: sdisPoint || editedProject?.sdisPoint || project?.sdisPoint || null,
      isAcama,
      isGreenInvest,
      cerfaEmailChoice: editedProject?.cerfaEmailChoice || 'email1',
      email2: editedProject?.email2 || '',
      isBattery: isBattery,
      isBatteryStandAlone: isBattery,
      solutionType: isBattery ? 'battery' : solutionType,
      urbanisme_solutionType: isBattery ? 'battery' : solutionType,
      buildingType: isBattery ? 'battery_standalone' : (b1.buildingType || config.buildingType || 'asymetrique_1'),
      type: isBattery ? 'battery' : (editedProject?.type || project?.type || 'Construction'),
      urbanismeType: finalTypeLabel,
      installationType: finalTypeLabel,
      typeLabel: finalTypeLabel,
      largeur: isBattery ? '3.20' : String(b1.width || config.width || 16.4),
      longueur: isBattery ? '6.20' : String(b1.length || config.length || 37.5),
      hauteur_egout: isBattery ? '2.38' : String(b1.eaveHeight || (b1.buildingType === 'ombriere_pl' ? 5.08 : (b1.buildingType?.startsWith('asymetrique') ? 4.0 : (config.eaveHeight || 4.0)))),
      pente: isBattery ? '0' : String(b1.roofPitch || (b1.buildingType?.startsWith('asymetrique') ? 15 : (config.roofPitch || 10))),
      leftSide: isBattery ? 'none' : (b1.leftSide || config.leftSide || 'none'),
      rightSide: isBattery ? 'none' : (b1.rightSide || config.rightSide || 'none'),
      leftWidth: isBattery ? 0 : (b1.leftWidth || config.leftWidth),
      rightWidth: isBattery ? 0 : (b1.rightWidth || config.rightWidth),
      bayCount: b1.bayCount || config.bayCount,
      baySpacing: b1.baySpacing || config.baySpacing,
      kwc: preservedKwc,
      projectSize: preservedKwc,
      puissance: preservedKwc,
      objet_travaux: effectiveObjet,
      description: effectiveObjet,
      noticeText: effectiveNotice,
      noticeAgricole: effectiveNotice,
      pc_notice: effectiveNotice,
      notice_descriptive: effectiveNotice,
      urbanisme_captures: finalCaptures,
      captures: finalCaptures,
      masse_capture: masseMap,
      masse_zoom: buildingsWithMasse[0]?.masse_zoom || 18,
      ...(masseMap2 ? { masse_capture_2: masseMap2 } : {}),
      ...(buildingsWithMasse[0]?.masse_zoom_2 ? { masse_zoom_2: buildingsWithMasse[0].masse_zoom_2 } : {}),
      pc_photos: finalPhotos,
      photos: finalPhotos,
      buildings: enrichedBuildings,
      solutions: solutions,
      selectedStructureIds: selectedStructureIds,
      additionalRoof: additionalRoof,
      batteryStorage: isNoBattery ? { enabled: false } : batteryStorage,
    };

    // Sauvegarder automatiquement dans Firebase Storage et Firestore
    if (project?.id) {
      persistProjectUrbanismeMedia(project.id, activeTenantId, finalCaptures, finalPhotos, enrichedBuildings).catch(err => {
        console.warn('[UrbanismeWizard] Persistance Firebase Storage & Firestore:', err);
      });
    }

    return { finalProject, finalTypeLabel };
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    try {
      saveWizardState();
      const { finalProject, finalTypeLabel } = await prepareProjectPayload();
      await onGenerate(type, finalTypeLabel, finalProject, selectedPages);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSinglePiece = async (item) => {
    if (!onGenerate) return;
    setDownloadingPieceId(item.id);
    setIsGenerating(true);
    try {
      const { finalProject, finalTypeLabel } = await prepareProjectPayload();
      await onGenerate(type, finalTypeLabel, finalProject, selectedPages, item);
    } catch (err) {
      console.error('[UrbanismeWizard] Erreur téléchargement pièce:', err);
    } finally {
      setDownloadingPieceId(null);
      setIsGenerating(false);
    }
  };

  const handleDownloadSinglePieceDwg = async (item) => {
    try {
      const { finalProject } = await prepareProjectPayload();
      downloadPieceDwg(item, finalProject, type);
    } catch (err) {
      console.error('[UrbanismeWizard] Erreur téléchargement DWG:', err);
    }
  };

  // Chargement automatique des informations de la Mairie et du guichet SVE à l'étape 7 (Validation)
  useEffect(() => {
    if (step === 6) {
      const city = editedProject?.city || editedProject?.commune || summary?.commune || project?.city || project?.commune || '';
      const postcode = editedProject?.zip || editedProject?.codePostal || project?.zip || '';
      const address = editedProject?.address || project?.address || '';
      const insee = editedProject?.insee || editedProject?.code_insee || project?.insee || '';

      if (city || postcode || insee) {
        setMairieRouting(prev => ({ ...prev, loading: true, error: null }));
        fetchUrbanismeMairiePortal({ insee, postcode, city, address })
          .then((data) => {
            setMairieRouting({ loading: false, data, error: null });
          })
          .catch((err) => {
            console.error('[UrbanismeWizard] Erreur routage mairie:', err);
            setMairieRouting({ loading: false, data: null, error: err.message });
          });
      }
    }
  }, [step, editedProject?.city, editedProject?.commune, editedProject?.zip, editedProject?.address, editedProject?.insee, project?.city, project?.commune, project?.zip, project?.address, project?.insee]);

  const handleOpenPortalAndDownloadZip = async () => {
    const portalUrl = mairieRouting?.data?.portal?.url || 'https://www.service-public.fr/particuliers/vosdroits/R52221';

    // 1. Tenter l'ouverture du guichet unique dans un nouvel onglet
    try {
      const newWin = window.open(portalUrl, '_blank', 'noopener,noreferrer');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        setPopupBlocked(true);
      } else {
        setPopupBlocked(false);
      }
    } catch (e) {
      console.warn('[UrbanismeWizard] Pop-up bloqué par le navigateur:', e);
      setPopupBlocked(true);
    }

    // 2. Déclencher le packaging ZIP via le pipeline officiel onGenerate pour synchronisation parfaite du DOM
    setIsExportingZip(true);
    setZipProgressText('Préparation des pièces du dossier...');
    try {
      saveWizardState();
      const { finalProject, finalTypeLabel } = await prepareProjectPayload();
      if (typeof onGenerate === 'function') {
        await onGenerate(type, finalTypeLabel, finalProject, selectedPages, null, {
          isZip: true,
          mairieInfo: mairieRouting?.data,
          onProgress: (msg) => setZipProgressText(msg)
        });
      } else {
        await exportDossierDepotZip({
          project: finalProject,
          type: type,
          chosenType: finalTypeLabel,
          selectedPages: selectedPages,
          mairieInfo: mairieRouting?.data,
          onProgress: (msg) => setZipProgressText(msg)
        });
        toast({
          title: 'Dossier de dépôt téléchargé !',
          description: 'L\'archive ZIP avec les pièces officielles et les instructions est prête pour le dépôt.',
        });
      }
    } catch (zipErr) {
      console.error('[UrbanismeWizard] Erreur export ZIP:', zipErr);
      toast({
        title: 'Erreur export ZIP',
        description: zipErr?.message || 'Une erreur est survenue lors de la création de l\'archive.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingZip(false);
      setZipProgressText('');
    }
  };

  if (!isOpen) return null;

  const preservedKwc = editedProject?.puissance || editedProject?.kwc || project?.kwc || project?.puissance || project?.projectSize || editedProject?.projectSize || '';
  const summary = buildCerfaDataSummary(
    {
      ...editedProject,
      ...fieldValues,
      puissance: preservedKwc,
      kwc: preservedKwc,
      projectSize: preservedKwc,
      type: isBatActive ? 'battery' : (solutionType === 'ombriere' ? 'ombriere' : (isAcama ? 'batiment_solaire' : 'batiment_solaire')),
      urbanismeType: isBatActive ? 'Station Batteries Stand-Alone' : (solutionType === 'building' ? (isAcama ? 'Bâtiment photovoltaïque' : 'Bâtiment et Ombrière') : (editedProject?.urbanismeType || (isDP ? 'Ombrière photovoltaïque' : 'Bâtiment et Ombrière'))),
      typeLabel: isBatActive ? 'Station Batteries Stand-Alone' : (solutionType === 'building' ? (isAcama ? 'Bâtiment photovoltaïque' : 'Bâtiment et Ombrière') : (editedProject?.urbanismeType || (isDP ? 'Ombrière photovoltaïque' : 'Bâtiment et Ombrière'))),
      isBattery: isBatActive,
      isBatteryStandAlone: isBatActive,
      solutionType: isBatActive ? 'battery' : solutionType,
      docType: type,
      buildings
    },
    isBatActive ? 'battery' : (solutionType === 'ombriere' ? 'ombriere' : (isAcama ? 'batiment_solaire' : 'batiment_solaire'))
  );
  const STEPS = ['Déclarant', isDP ? 'Cartes DP1' : 'Cartes PC1', 'Cotations & Côtes', 'Photos', isDP ? 'Carte DP2' : 'Carte PC2', 'Notice Descriptive', 'Validation'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-x-0 bottom-0 top-[65px] bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[1600px] max-h-[calc(100vh-80px)] h-[calc(100vh-80px)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className={`${dossierInfo.bgColor} px-6 pt-4 pb-3 border-b ${dossierInfo.borderColor}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  Tunnel de Déclaration — {editedProject?.lastName || editedProject?.name || 'Projet Solaire'}
                </p>
                <h2 className={`text-xl font-extrabold ${dossierInfo.color}`}>{dossierInfo.title}</h2>
              </div>
              <button
                onClick={handleSafeClose}
                className="p-2 hover:bg-white/70 rounded-xl transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Progress */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {STEPS.map((label, i) => {
                const isDone = i < step;
                const isCurrent = i === step;
                return (
                  <React.Fragment key={label}>
                    <button
                      onClick={async () => {
                        syncActiveConfigToSolutions();
                        if (step === 4 && i !== 4) {
                          await captureAllActiveMasseMaps();
                        }
                        saveWizardState({ step: i });
                        setStep(i);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isCurrent
                          ? `${dossierInfo.accentColor} text-white shadow-md`
                          : isDone
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-white/60 text-gray-400 border border-gray-200'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px]">
                        {isDone ? '✓' : i + 1}
                      </span>
                      <span>{label}</span>
                    </button>
                    {i < STEPS.length - 1 && <div className="h-px w-4 bg-gray-200 flex-shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">

              {/* ÉTAPE 0 — Identité & Coordonnées du déclarant */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Étape 1 : Nature du projet & Coordonnées du déclarant</h3>
                    <p className="text-xs text-gray-500">Choisissez la solution technique à déclarer et vérifiez les coordonnées du demandeur.</p>
                  </div>

                  {/* SÉLECTION GLOBALE DE LA NATURE DU PROJET (Bâtiment, Ombrière, Batterie) */}
                  <div className="bg-white rounded-2xl p-5 border-2 border-slate-200/90 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-blue-600" />
                          Nature du projet d'urbanisme *
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ce choix verrouille la modélisation 3D, les formulaires Cerfa et la cartographie DP2 sur l'ensemble du dossier.
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        solutionType === 'battery'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : (solutionType === 'ombriere'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200')
                      }`}>
                        {solutionType === 'battery' ? '⚡ Station Batteries (DP < 20 m²)' : (solutionType === 'ombriere' ? '🚗 Ombrières Photovoltaïques' : '🏢 Bâtiment / Hangar Solaire')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {/* 1. Bâtiment / Hangar */}
                      <div
                        onClick={() => handleSwitchSolution('building')}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          solutionType === 'building'
                            ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-400/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                            <Building2 className={`w-4 h-4 ${solutionType === 'building' ? 'text-blue-600' : 'text-slate-500'}`} />
                            {isAcama ? 'Bâtiment Sur-mesure' : 'Bâtiment / Hangar'}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            solutionType === 'building' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                          }`}>
                            {solutionType === 'building' && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Construction ou couverture solaire avec charpente métallique, bardage et toiture photovoltaïque.
                        </p>
                      </div>

                      {/* 2. Ombrière Photovoltaïque */}
                      {!isAcama && (
                        <div
                          onClick={() => handleSwitchSolution('ombriere')}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            solutionType === 'ombriere'
                              ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-400/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                              <Layers className={`w-4 h-4 ${solutionType === 'ombriere' ? 'text-emerald-600' : 'text-slate-500'}`} />
                              Ombrière
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              solutionType === 'ombriere' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                            }`}>
                              {solutionType === 'ombriere' && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Structure ombrière photovoltaïque autoportante (stockage, parking ou abri).
                          </p>
                        </div>
                      )}

                      {/* 3. Station Batteries Stand-Alone */}
                      {!isNoBattery && (
                        <div
                          onClick={() => handleSwitchSolution('battery')}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            solutionType === 'battery'
                              ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-400/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                              <Zap className={`w-4 h-4 ${solutionType === 'battery' ? 'text-purple-600' : 'text-slate-500'}`} />
                              Station Batteries (500 kW)
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              solutionType === 'battery' ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                            }`}>
                              {solutionType === 'battery' && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            4 armoires CESC Mercury 261 sur dalle béton (19.84 m² &lt; 20 m²) ceinturée d'un grillage rigide.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Vos coordonnées</p>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Nom & Prénom du demandeur *</label>
                        <input
                          type="text"
                          value={editedProject?.lastName || ''}
                          onChange={e => handleFieldChange('lastName', e.target.value)}
                          placeholder="Ex: CASSAGNE Arnaud"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-gray-600 font-semibold truncate text-[11px]">Email 1 (Déclarant)</label>
                              <label className="flex items-center gap-1 text-[10px] text-blue-700 font-bold cursor-pointer select-none" title="Faire apparaître cet email dans le CERFA (page 2/15)">
                                <input
                                  type="radio"
                                  name="cerfaEmailSelection"
                                  checked={editedProject?.cerfaEmailChoice === 'email1'}
                                  onChange={() => handleFieldChange('cerfaEmailChoice', 'email1')}
                                  className="accent-blue-600 cursor-pointer w-3 h-3"
                                />
                                <span>CERFA</span>
                              </label>
                            </div>
                            <input
                              type="email"
                              value={editedProject?.email || ''}
                              onChange={e => handleFieldChange('email', e.target.value)}
                              placeholder="Ex: isabelle.dupond@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-gray-600 font-semibold truncate text-[11px]">Email 2 (Mandataire / Courtage)</label>
                              <label className="flex items-center gap-1 text-[10px] text-blue-700 font-bold cursor-pointer select-none" title="Faire apparaître cet email dans le CERFA par défaut (page 2/15)">
                                <input
                                  type="radio"
                                  name="cerfaEmailSelection"
                                  checked={!editedProject?.cerfaEmailChoice || editedProject?.cerfaEmailChoice === 'email2'}
                                  onChange={() => handleFieldChange('cerfaEmailChoice', 'email2')}
                                  className="accent-blue-600 cursor-pointer w-3 h-3"
                                />
                                <span>CERFA (Défaut)</span>
                              </label>
                            </div>
                            <input
                              type="email"
                              value={editedProject?.email2 || 'contact@enr-courtage.fr'}
                              onChange={e => handleFieldChange('email2', e.target.value)}
                              placeholder="contact@enr-courtage.fr"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          <span className="font-bold">Email actif dans le CERFA (page 2/15) :</span>
                          <span className="font-semibold">{editedProject?.cerfaEmailChoice === 'email1' ? (editedProject?.email || 'Email du déclarant') : (editedProject?.email2 || 'contact@enr-courtage.fr')}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Numéro & Voie du déclarant</label>
                        <input
                          type="text"
                          value={editedProject?.address || ''}
                          onChange={e => handleFieldChange('address', e.target.value)}
                          placeholder="Ex: 4 Rue victor hugo"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Code Postal & Ville</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editedProject?.zip || ''}
                            onChange={e => handleFieldChange('zip', e.target.value)}
                            placeholder="32100"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editedProject?.city || ''}
                            onChange={e => handleFieldChange('city', e.target.value)}
                            placeholder="AUCH"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Téléphone de contact</label>
                        <input
                          type="text"
                          value={editedProject?.phone || ''}
                          onChange={e => handleFieldChange('phone', e.target.value)}
                          placeholder="06 00 00 00 00"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Date, Lieu & Dpt de Naissance</label>
                        <div className="grid grid-cols-12 gap-1.5">
                          <input
                            type="text"
                            maxLength={8}
                            value={editedProject?.birthDate || ''}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                              handleFieldChange('birthDate', digits);
                            }}
                            placeholder="JJMMAAAA (ex: 17111994)"
                            title="Date de naissance (format JJMMAAAA)"
                            className="col-span-4 px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editedProject?.birthCity || ''}
                            onChange={e => {
                              const val = e.target.value;
                              handleFieldChange('birthCity', val);
                              if (!editedProject?.birthDepartment && !editedProject?.birthDept) {
                                const m = val.match(/\((\d{2,3})\)/) || val.match(/\b(\d{2,3})\b/);
                                if (m) {
                                  handleFieldChange('birthDepartment', m[1]);
                                  handleFieldChange('birthDept', m[1]);
                                }
                              }
                            }}
                            placeholder="Commune (ex: DAX)"
                            title="Commune de naissance"
                            className="col-span-5 px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            maxLength={3}
                            value={editedProject?.birthDepartment || editedProject?.birthDept || ''}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                              handleFieldChange('birthDepartment', digits);
                              handleFieldChange('birthDept', digits);
                            }}
                            placeholder="Dpt (40)"
                            title="Département de naissance"
                            className="col-span-3 px-2 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 1 — Cartes DP1 / PC1 (PLEINE HAUTEUR) */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 h-full flex flex-col gap-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 2 : Cartographie {isDP ? 'DP1' : 'PC1'} (Plan de Situation & Satellite)</h3>
                      <p className="text-xs text-gray-500">Déplacez le marqueur sur une des cartes pour ajuster l'emplacement du projet.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50 text-center flex flex-col min-h-0 shadow-xs">
                      <span className="text-xs font-bold text-gray-700 block mb-2 flex-shrink-0">{isDP ? 'DP1' : 'PC1'} — Plan de Situation (IGN Cartographique)</span>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 z-10 flex-1 min-h-0 w-full shadow-inner">
                        {(() => {
                          const coords = resolveProjectCoordinates(editedProject, project);
                          const lat = coords.lat;
                          const lng = coords.lng;
                          return (
                            <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                              />
                              <MapResizer />
                              <MapSyncCenter lat={lat} lng={lng} />
                              <DraggableLocationMarker lat={lat} lng={lng} setGps={handleGpsUpdate} />
                            </MapContainer>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50 text-center flex flex-col min-h-0 shadow-xs">
                      <span className="text-xs font-bold text-gray-700 block mb-2 flex-shrink-0">{isDP ? 'DP1' : 'PC1'} — Vue Aérienne Satellite</span>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 z-10 flex-1 min-h-0 w-full shadow-inner">
                        {(() => {
                          const coords = resolveProjectCoordinates(editedProject, project);
                          const lat = coords.lat;
                          const lng = coords.lng;
                          return (
                            <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                              <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution="Tiles &copy; Esri"
                              />
                              <MapResizer />
                              <MapSyncCenter lat={lat} lng={lng} />
                              <DraggableLocationMarker lat={lat} lng={lng} setGps={handleGpsUpdate} />
                            </MapContainer>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center flex-shrink-0">
                    Déplacez le repère sur la carte cadastrale ou satellite pour synchroniser la position exacte du terrain.
                  </p>
                </motion.div>
              )}

              {/* ÉTAPE 2 — Configurateur 2D/3D avec support Bâtiments / Ombrières / Batteries Stand-Alone */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-3 flex flex-col h-[78vh] min-h-[620px] overflow-hidden bg-slate-100/70 rounded-2xl gap-2">
                  
                  {/* Sélecteur de type de solution */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Solution :
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSwitchSolution('building')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                          solutionType === 'building'
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{isAcama ? "Bâtiment Sur-mesure" : "Bâtiment / Hangar"}</span>
                      </button>

                      {!isAcama && (
                        <button
                          type="button"
                          onClick={() => handleSwitchSolution('ombriere')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                            solutionType === 'ombriere'
                              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                          }`}
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Ombrière PV</span>
                        </button>
                      )}

                      {!isNoBattery && (
                        <button
                          type="button"
                          onClick={() => handleSwitchSolution('battery')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                            solutionType === 'battery'
                              ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Station Batteries 500 kW</span>
                        </button>
                      )}
                    </div>

                    {/* Sélecteur multi-bâtiments si mode Bâtiment/Ombrière */}
                    {solutionType !== 'battery' && (
                      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                        {buildings.map((b, idx) => (
                          <button
                            key={b.id || idx}
                            type="button"
                            onClick={() => handleSelectBuilding(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs ${
                              activeBuildingIndex === idx
                                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <span>{getBuildingDisplayName(b, idx)}</span>
                            {idx > 0 && (
                              <span
                                onClick={(e) => handleRemoveBuilding(idx, e)}
                                className="ml-1 p-0.5 hover:bg-red-500 hover:text-white rounded text-slate-400 transition-colors"
                                title={isDP ? "Supprimer cette ombrière" : "Supprimer ce bâtiment"}
                              >
                                <X className="w-3 h-3" />
                              </span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddBuilding}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-emerald-600" />
                          <span>+</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* VUE BATTERIES STAND-ALONE */}
                  {solutionType === 'battery' ? (
                    <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-[560px] overflow-hidden">
                      {/* Panneau de contrôle gauche pour Batteries */}
                      <div className="w-full lg:w-[410px] h-full overflow-y-auto pr-1 space-y-3 pb-6">
                        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                <Battery className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-800">Station Batteries Stand-Alone</h3>
                                <p className="text-[11px] text-purple-600 font-semibold">Stockage stationnaire 500 kW (DP &lt; 20 m²)</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              {batteryStorage.quantity || 4} armoires
                            </span>
                          </div>

                          {/* Modèle & Presets */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Modèle / Presets BESS</label>
                            <select
                              value={batteryStorage.model || 'CESC Mercury 261'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatteryStorage(prev => ({
                                  ...prev,
                                  model: val,
                                  powerKw: 500,
                                  capacityKwh: 1044,
                                  unitLength: 1.15,
                                  unitWidth: 1.44,
                                  unitHeight: 2.38,
                                  dalleLength: 6.20,
                                  dalleWidth: 3.20,
                                  footprint: '6.20m × 3.20m (19.84 m²)'
                                }));
                                updateActiveBuilding({ length: 6.20, width: 3.20, eaveHeight: 2.38 });
                              }}
                              className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400 outline-none"
                            >
                              <option value="CESC Mercury 261">CESC Mercury 261 (4× 125 kW = 500 kW / 1044 kWh)</option>
                            </select>
                          </div>

                          {/* Nombre d'armoires */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre d'armoires Mercury 261</label>
                            <div className="flex items-center gap-1.5">
                              {[2, 4].map(qty => (
                                <button
                                  key={qty}
                                  type="button"
                                  onClick={() => {
                                    const dL = qty === 4 ? 6.20 : 3.60;
                                    const dW = 3.20;
                                    setBatteryStorage(prev => ({
                                      ...prev,
                                      quantity: qty,
                                      powerKw: qty * 125,
                                      capacityKwh: qty * 261,
                                      dalleLength: dL,
                                      dalleWidth: dW,
                                      footprint: `${dL.toFixed(2)}m × ${dW.toFixed(2)}m (${(dL * dW).toFixed(2)} m²)`
                                    }));
                                    updateActiveBuilding({ length: dL, width: dW });
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    (batteryStorage.quantity || 4) === qty
                                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {qty} armoires ({qty * 125} kW)
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Puissance & Capacité */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Puissance raccordée (kW)</label>
                              <input
                                type="number"
                                value={batteryStorage.powerKw || 500}
                                onChange={(e) => setBatteryStorage(prev => ({ ...prev, powerKw: Number(e.target.value) }))}
                                className="w-full text-xs font-bold rounded-lg border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Capacité totale (kWh)</label>
                              <input
                                type="number"
                                value={batteryStorage.capacityKwh || 1044}
                                onChange={(e) => setBatteryStorage(prev => ({ ...prev, capacityKwh: Number(e.target.value) }))}
                                className="w-full text-xs font-bold rounded-lg border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                          </div>

                          {/* Dalle Béton et Emprise */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Longueur dalle (m)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={batteryStorage.dalleLength || 6.20}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setBatteryStorage(prev => ({ ...prev, dalleLength: val }));
                                  updateActiveBuilding({ length: val });
                                }}
                                className="w-full text-xs font-bold rounded-lg border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Largeur dalle (m)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={batteryStorage.dalleWidth || 3.20}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setBatteryStorage(prev => ({ ...prev, dalleWidth: val }));
                                  updateActiveBuilding({ width: val });
                                }}
                                className="w-full text-xs font-bold rounded-lg border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                          </div>

                          {/* Indicateur de conformité emprise < 20 m² */}
                          {(() => {
                            const curArea = (Number(batteryStorage.dalleLength || 6.20) * Number(batteryStorage.dalleWidth || 3.20));
                            const isCompliant = curArea < 20;
                            return (
                              <div className={`rounded-xl p-2 text-[11px] font-bold flex items-center justify-between border ${
                                isCompliant ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                              }`}>
                                <span>Surface dalle : {curArea.toFixed(2)} m²</span>
                                <span>{isCompliant ? '✓ Conforme DP (< 20 m²)' : '⚠️ Dépasse 20 m² (PC requis)'}</span>
                              </div>
                            );
                          })()}

                          {/* Sécurité SDIS & Rétention */}
                          <div className="bg-amber-50/80 rounded-xl p-2.5 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                            <div className="font-bold flex items-center gap-1 text-amber-800">
                              <span>🛡️ Prescriptions SDIS & Sécurité</span>
                            </div>
                            <p className="text-[10px] text-amber-800/90 leading-tight">
                              Bac de rétention étanche intégré, clôture rigide 2.00m ceinturant la dalle, coupure d'urgence générale asservie, distance d'isolement 5m.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Zone Visualizer à droite */}
                      <div className="flex-1 relative h-full min-h-[560px] rounded-2xl overflow-hidden border border-slate-800 shadow-md flex flex-col">
                        {/* Toggles Vue 3D / 2D Façade / Plan de masse */}
                        <div className="absolute top-3 right-3 z-30 flex gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg pointer-events-auto">
                          <button
                            type="button"
                            onClick={() => setViewMode('3D')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                              viewMode === '3D' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Vue 3D
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('2D_FRONT')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                              viewMode === '2D_FRONT' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Vue 2D Façade
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('2D_TOP')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                              viewMode === '2D_TOP' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Plan de masse
                          </button>
                        </div>

                        <BatteryStationVisualizer
                          height="100%"
                          className="w-full h-full flex-1"
                          batteryStorage={batteryStorage}
                          viewMode={viewMode}
                          showDimensions={config.showDimensions !== false}
                          showCaptureButtons={false}
                          onCapture={(dataUrl) => {
                            setCaptures(prev => ({
                              ...prev,
                              facades_projet: dataUrl,
                              facade_sud: dataUrl,
                              section: dataUrl,
                              vue_couverture: dataUrl
                            }));
                            setEditedProject(prev => ({
                              ...prev,
                              urbanisme_captures: {
                                ...(prev.urbanisme_captures || {}),
                                facades_projet: dataUrl,
                                facade_sud: dataUrl,
                                section: dataUrl,
                                vue_couverture: dataUrl
                              }
                            }));
                          }}
                          onCaptureViews={(views) => {
                            setCaptures(prev => ({
                              ...prev,
                              facades_projet: views.sud,
                              facade_sud: views.sud,
                              facade_nord: views.nord,
                              facade_est: views.est,
                              facade_ouest: views.ouest,
                              section: views.dessus,
                              vue_couverture: views.dessus
                            }));
                            setEditedProject(prev => ({
                              ...prev,
                              urbanisme_captures: {
                                ...(prev.urbanisme_captures || {}),
                                facades_projet: views.sud,
                                facade_sud: views.sud,
                                facade_nord: views.nord,
                                facade_est: views.est,
                                facade_ouest: views.ouest,
                                section: views.dessus,
                                vue_couverture: views.dessus
                              }
                            }));
                            updateActiveBuilding({
                              captures: {
                                facades_projet: views.sud,
                                facade_sud: views.sud,
                                facade_nord: views.nord,
                                facade_est: views.est,
                                facade_ouest: views.ouest,
                                section: views.dessus,
                                vue_couverture: views.dessus
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* VUE CLASSIQUE BÂTIMENT / OMBRIÈRE */
                    <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-0 overflow-hidden">
                      {/* Panneau de contrôle gauche */}
                      <div className="w-full lg:w-[410px] h-full overflow-y-auto pr-1 space-y-3.5 pb-6">
                        <ControlPanel 
                          isAcama={isAcama} 
                          selectedProject={editedProject} 
                          activeBuilding={buildings[activeBuildingIndex]}
                          onUpdateBuilding={updateActiveBuilding}
                        />
                        <BuildingSummaryCard isAcama={isAcama} />
                      </div>

                      {/* Scène 3D droite */}
                      <div className="flex-1 relative h-full rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 shadow-sm isolate">
                        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
                          <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
                            {(() => {
                              const curB = buildings[activeBuildingIndex] || config;
                              const curMainW = Number(curB.width || config.width || 15.0);
                              const curLen = Number(curB.length || (curB.bayCount || 5) * (curB.baySpacing || 7.5) || config.length || 37.5);
                              const curLeftExt = (curB.leftSide && curB.leftSide !== 'none')
                                ? Number(curB.leftWidth !== undefined ? curB.leftWidth : (config.leftWidth || (curB.leftSide === 'appentis' ? 9.3 : 4.0)))
                                : (config.leftSide && config.leftSide !== 'none' ? Number(config.leftWidth || 0) : 0);
                              const curRightExt = (curB.rightSide && curB.rightSide !== 'none')
                                ? Number(curB.rightWidth !== undefined ? curB.rightWidth : (config.rightWidth || (curB.rightSide === 'appentis' ? 9.3 : 4.0)))
                                : (config.rightSide && config.rightSide !== 'none' ? Number(config.rightWidth || 0) : 0);
                              const curTotalW = curMainW + curLeftExt + curRightExt;
                              const curArea = Math.round(curTotalW * curLen);
                              return (
                                <span className="text-slate-800 font-bold text-sm whitespace-nowrap">
                                  {curLen.toFixed(2)}m × {curTotalW.toFixed(2)}m — {curArea}m²
                                </span>
                              );
                            })()}
                          </div>

                          {config.hasSolar && (
                            <div className="bg-yellow-50/95 backdrop-blur px-3 py-1 rounded-lg shadow-sm border border-yellow-200">
                              <span className="text-yellow-800 font-bold text-xs whitespace-nowrap">
                                ⚡ {(() => {
                                  const curB = buildings[activeBuildingIndex] || config;
                                  const curLen = Number(curB.length || (curB.bayCount || 5) * (curB.baySpacing || 7.5) || config.length || 37.5);
                                  const curMainW = Number(curB.width || config.width || 15.0);
                                  const curLeftExt = (curB.leftSide && curB.leftSide !== 'none')
                                    ? Number(curB.leftWidth !== undefined ? curB.leftWidth : (config.leftWidth || (curB.leftSide === 'appentis' ? 9.3 : 4.0)))
                                    : (config.leftSide && config.leftSide !== 'none' ? Number(config.leftWidth || 0) : 0);
                                  const curRightExt = (curB.rightSide && curB.rightSide !== 'none')
                                    ? Number(curB.rightWidth !== undefined ? curB.rightWidth : (config.rightWidth || (curB.rightSide === 'appentis' ? 9.3 : 4.0)))
                                    : (config.rightSide && config.rightSide !== 'none' ? Number(config.rightWidth || 0) : 0);
                                  const curTotalW = curMainW + curLeftExt + curRightExt;
                                  const curFloorArea = Math.round(curLen * curTotalW);

                                  // Priorité 1 : Puissance spécifiée sur le dossier/projet
                                  const projectKwc = Number(editedProject?.kwc || editedProject?.puissance || editedProject?.projectSize || project?.kwc || project?.puissance || project?.projectSize);
                                  if (projectKwc && !isNaN(projectKwc) && projectKwc > 0) {
                                    return projectKwc.toFixed(2);
                                  }

                                  const isBatitech = curB.configMode === 'batitech' || config.configMode === 'batitech';
                                  const batitechModel = isBatitech ? (BATITECH_MODELS[curB.selectedBatitechModel || config.selectedBatitechModel] || BATITECH_MODELS['BT-3.1.15']) : null;
                                  const isCustom = !isBatitech && (curB.configMode === 'custom' || config.configMode === 'custom' || (!isAcama && curB.buildingType === 'custom'));

                                  const barcMatch = isBatitech ? {} : findBarconniereBuilding({
                                    length: curLen,
                                    width: curMainW,
                                    buildingType: curB.buildingType || config.buildingType || 'symetrique',
                                    leftSide: curB.leftSide || config.leftSide || 'none',
                                    rightSide: curB.rightSide || config.rightSide || 'none',
                                    leftWidth: curB.leftWidth || config.leftWidth || 0,
                                    rightWidth: curB.rightWidth || config.rightWidth || 0,
                                    isAcama,
                                  });

                                  // Calcul de puissance proportionnel à la surface totale avec auvents / appentis
                                  let calcPwr = 0;
                                  if (curTotalW > curMainW) {
                                    calcPwr = Math.round(curFloorArea * 0.223235 * 100) / 100;
                                  } else {
                                    const storePwr = Number(curB.solarStats?.power) || Number(config.solarStats?.power) || 0;
                                    calcPwr = storePwr > 0 ? storePwr : (isBatitech ? (batitechModel?.puissanceKwc || 30.15) : (barcMatch.kwc || Math.round(curFloorArea * 0.20)));
                                  }

                                  return Number(calcPwr).toFixed(2);
                                })()} kWc
                              </span>
                            </div>
                          )}

                          <button
                            onClick={configActions.toggleDimensions}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm border transition-all flex items-center justify-between gap-2.5 ${
                              config.showDimensions ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>Afficher les côtes</span>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${config.showDimensions ? 'bg-white/30' : 'bg-slate-300'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config.showDimensions ? 'left-4' : 'left-0.5'}`} />
                            </div>
                          </button>
                        </div>

                        {/* Toggles Vue 3D / 2D */}
                        <div className="absolute top-3 right-3 z-20 flex gap-1.5 bg-white/90 backdrop-blur p-1 rounded-xl border border-slate-200 shadow-sm pointer-events-auto">
                          <button
                            onClick={() => setViewMode('3D')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                              viewMode === '3D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Vue 3D
                          </button>
                          <button
                            onClick={() => setViewMode('2D_FRONT')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                              viewMode === '2D_FRONT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Vue 2D
                          </button>
                        </div>

                        {/* Rendu Canvas BuildingScene avec clé par onglet */}
                        <div className="w-full h-full">
                          <BuildingScene 
                            key={`bldg-scene-${activeBuildingIndex}`}
                            viewMode={viewMode} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ÉTAPE 3 — Visionneuse 3D (DP4/PC5 5 VUES) & Insertion Paysagère 3D (DP6/PC6) */}
              {step === 3 && (() => {
                const b = buildings[activeBuildingIndex] || {};
                const currentPhotos = {
                  ...(editedProject?.pc_photos || {}),
                  ...(editedProject?.photos || {}),
                  ...(photos || {}),
                  ...(b.photos || {}),
                  ...(b.pc_photos || {})
                };
                const currentCaptures = {
                  ...(editedProject?.urbanisme_captures || {}),
                  ...(captures || {}),
                  ...(b.captures || {}),
                  ...(b.urbanisme_captures || {})
                };
                return (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 4 : Photos, Façades & Insertion Paysagère 3D</h3>
                      <p className="text-xs text-gray-500">{isDP ? "Capturez les 5 vues de façades pour la DP4 et positionnez le modèle 3D sur votre photo de terrain pour la DP6." : "Capturez les 5 vues de façades pour la PC5 et positionnez le modèle 3D sur votre photo de terrain pour la PC6."}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleSwitchSolution('building')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            solutionType === 'building' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{isAcama ? "Bâtiment" : "Bâtiment / Hangar"}</span>
                        </button>
                        {!isAcama && (
                          <button
                            type="button"
                            onClick={() => handleSwitchSolution('ombriere')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              solutionType === 'ombriere' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Car className="w-3 h-3" />
                            <span>Ombrière PV</span>
                          </button>
                        )}
                        {!isNoBattery && (
                          <button
                            type="button"
                            onClick={() => handleSwitchSolution('battery')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              solutionType === 'battery' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Zap className="w-3 h-3" />
                            <span>Station Batteries 500 kW</span>
                          </button>
                        )}
                      </div>

                      {buildings.length > 1 && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          {buildings.map((b, idx) => (
                            <button
                              key={b.id || idx}
                              type="button"
                              onClick={() => handleSelectBuilding(idx)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                activeBuildingIndex === idx ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                              }`}
                            >
                              {getBuildingDisplayName(b, idx)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-stretch">
                    {/* DP4 / PC5 — 5 Vues Façades & Toitures */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col justify-between min-h-[340px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-blue-600" /> {isDP ? "DP4 — Plan des Façades & Toitures (5 Vues 3D)" : "PC5 — Plan des Façades & Toitures (5 Vues 3D)"}
                        </span>
                        {currentCaptures?.facade_sud ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ 5 Vues Prêtes</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À capturer</span>
                        )}
                      </div>

                      {/* Contrôle interactif de la taille de police des mesures pour l'ombrière/bâtiment actif */}
                      {solutionType !== 'battery' && !buildings[activeBuildingIndex]?.isBattery && (() => {
                        const activeB = buildings[activeBuildingIndex] || {};
                        const currentFontSize = activeB.dimensionFontSize || 2.5;
                        const buildingName = getBuildingDisplayName(activeB, activeBuildingIndex);
                        return (
                          <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl px-2.5 py-1.5 mb-2 flex items-center justify-between text-left shadow-2xs">
                            <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1">
                              📏 Taille police des mesures <strong className="text-blue-700">({buildingName})</strong> :
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(1.0, Math.round((Number(currentFontSize) - 0.5) * 10) / 10);
                                  updateActiveBuilding({ dimensionFontSize: next });
                                }}
                                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-md text-xs font-black shadow-2xs active:scale-95"
                                title="Diminuer la taille"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1.0"
                                max="10.0"
                                step="0.5"
                                value={currentFontSize}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 2.5;
                                  updateActiveBuilding({ dimensionFontSize: val });
                                }}
                                className="w-12 px-1 py-0.5 text-xs font-black text-center text-blue-900 border border-blue-300 rounded-md bg-white shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.min(10.0, Math.round((Number(currentFontSize) + 0.5) * 10) / 10);
                                  updateActiveBuilding({ dimensionFontSize: next });
                                }}
                                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-md text-xs font-black shadow-2xs active:scale-95"
                                title="Agrandir la taille"
                              >
                                +
                              </button>
                              <div className="flex items-center gap-0.5 ml-1">
                                {[2.2, 3.0, 4.0, 5.0].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => updateActiveBuilding({ dimensionFontSize: preset })}
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                      Number(currentFontSize) === preset
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex-1 flex flex-col justify-center">
                        {(() => {
                          const activeB = buildings[activeBuildingIndex] || {};
                          const isBat = solutionType === 'battery' || activeB.isBattery || activeB.solutionType === 'battery';
                          if (isBat) {
                            return (
                              <BatteryStationVisualizer
                                powerKw={batteryStorage?.powerKw || 500}
                                cabinetCount={batteryStorage?.quantity || 4}
                                cabinetModel={batteryStorage?.model || 'CESC Mercury 261'}
                                dalleLength={batteryStorage?.dalleLength || activeB.length || 6.20}
                                dalleWidth={batteryStorage?.dalleWidth || activeB.width || 3.20}
                                onCaptureViews={handleCaptureAll5ViewsPC5}
                                onCaptureSnapshot={handleCaptureSnapshotPC5}
                                height={270}
                                showCaptureButtons={true}
                              />
                            );
                          }
                          return (
                            <Building3DViewer
                              buildingConfig={{
                                longueur: Number(activeB.length || config.length || 30),
                                largeur: Number(activeB.width || config.width || 20),
                                hauteur_egout: Number(activeB.eaveHeight || config.eaveHeight || (isDP ? 3 : 4)),
                                pente: Number(activeB.roofPitch || config.roofPitch || 10),
                                buildingType: activeB.buildingType || config.buildingType || 'asymetrique_1',
                                leftSide: activeB.leftSide || config.leftSide || 'none',
                                rightSide: activeB.rightSide || config.rightSide || 'none',
                                dimensionFontSize: Number(activeB.dimensionFontSize || 2.5),
                                type: isDP ? 'dp' : editedProject.type
                              }}
                              dimensionFontSize={Number(activeB.dimensionFontSize || 2.5)}
                              onCaptureSnapshot={handleCaptureSnapshotPC5}
                              onCaptureAll5Views={handleCaptureAll5ViewsPC5}
                              height={270}
                              isDP={isDP}
                              docType={type}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* DP6 / PC6 — Insertion paysagère 3D (Avant / Après) */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col justify-between min-h-[340px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          {(() => {
                            const isBat = solutionType === 'battery' || b.isBattery;
                            const curW = isBat ? Number(batteryStorage.dalleWidth || b.width || 3.20) : Number(b.width || config.width || 16.4);
                            const curL = isBat ? Number(batteryStorage.dalleLength || b.length || 6.20) : Number(b.length || (b.bayCount ? b.bayCount * (b.baySpacing || 7.5) : (config.length || 37.5)));
                            return (
                              <>
                                <Sparkles className="w-4 h-4 text-indigo-600" /> {isDP ? "DP6 — Insertion Paysagère 3D" : "PC6 — Insertion Paysagère 3D"} ({curL.toFixed(1)}m × {curW.toFixed(1)}m)
                              </>
                            );
                          })()}
                        </span>
                        {currentPhotos?.apres ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Simulation Prête</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À ajuster</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-h-[270px]">
                        {currentPhotos?.avant ? (
                          <div className="space-y-2 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-2 gap-2 flex-1 items-center">
                              {/* Photo Avant */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 group h-[190px] bg-black/5">
                                <img src={currentPhotos.avant} alt="Avant" className="w-full h-full object-cover" />
                                <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">Avant</span>
                                
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                  <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                                    <Upload className="w-3.5 h-3.5" />
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'avant', e)} />
                                  </label>
                                  <button
                                    type="button"
                                    title="Recadrer la photo"
                                    onClick={() => setCropModal({ open: true, src: currentPhotos.avant, category: 'photos', key: 'avant', title: 'Recadrer Photo Terrain Avant' })}
                                    className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                  >
                                    <Crop className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Supprimer la photo"
                                    onClick={() => setBuildings(prev => {
                                      const upd = [...prev];
                                      if (upd[activeBuildingIndex]) {
                                        const newPhotos = { ...upd[activeBuildingIndex].photos };
                                        delete newPhotos.avant;
                                        upd[activeBuildingIndex].photos = newPhotos;
                                      }
                                      return upd;
                                    })}
                                    className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Photo Après */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 bg-gray-100 flex items-center justify-center group h-[190px]">
                                {currentPhotos?.apres ? (
                                  <>
                                    <img src={currentPhotos.apres} alt="Après" className="w-full h-full object-cover" />
                                    <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">Après (3D)</span>
                                    
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                      <button
                                        type="button"
                                        title="Recadrer l'insertion"
                                        onClick={() => setCropModal({ open: true, src: currentPhotos.apres, category: 'photos', key: 'apres', title: 'Recadrer Simulation 3D' })}
                                        className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                      >
                                        <Crop className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Réinitialiser l'incrustation"
                                        onClick={() => setBuildings(prev => {
                                          const upd = [...prev];
                                          if (upd[activeBuildingIndex]) {
                                            const newPhotos = { ...upd[activeBuildingIndex].photos };
                                            delete newPhotos.apres;
                                            upd[activeBuildingIndex].photos = newPhotos;
                                          }
                                          return upd;
                                        })}
                                        className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400 font-semibold">En attente d'incrustation</span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (solutionType === 'battery' || b.isBattery || b.solutionType === 'battery') {
                                  setBatteryLandscapeModalOpen(true);
                                } else {
                                  setLandscapeModalOpen(true);
                                }
                              }}
                              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            >
                              <Box className="w-3.5 h-3.5" /> Ajuster & Déplacer le modèle 3D sur la photo
                            </button>
                          </div>
                        ) : (
                          <label className="w-full h-full min-h-[260px] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-700 font-bold">1. Charger photo de terrain (Avant)</span>
                            <span className="text-xs text-gray-400 mt-0.5">Puis ajustez la position du modèle 3D</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'avant', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DP7/PC7 & DP8/PC8 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">{isDP ? 'DP7 — Environnement Proche' : 'PC7 — Environnement Proche'}</span>
                        {currentPhotos?.proche ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {currentPhotos?.proche ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={currentPhotos.proche} alt="Env Proche" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                              <Upload className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'proche', e)} />
                            </label>
                            <button
                              type="button"
                              title="Recadrer"
                              onClick={() => setCropModal({ open: true, src: currentPhotos.proche, category: 'photos', key: 'proche', title: 'Recadrer Environnement Proche' })}
                              className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => setBuildings(prev => {
                                const upd = [...prev];
                                if (upd[activeBuildingIndex]) {
                                  const newPhotos = { ...upd[activeBuildingIndex].photos };
                                  delete newPhotos.proche;
                                  upd[activeBuildingIndex].photos = newPhotos;
                                }
                                return upd;
                              })}
                              className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo proche</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'proche', e)} />
                        </label>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">{isDP ? 'DP8 — Environnement Lointain' : 'PC8 — Environnement Lointain'}</span>
                        {currentPhotos?.lointain ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {currentPhotos?.lointain ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={currentPhotos.lointain} alt="Env Lointain" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                              <Upload className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'lointain', e)} />
                            </label>
                            <button
                              type="button"
                              title="Recadrer"
                              onClick={() => setCropModal({ open: true, src: currentPhotos.lointain, category: 'photos', key: 'lointain', title: 'Recadrer Environnement Lointain' })}
                              className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => setBuildings(prev => {
                                const upd = [...prev];
                                if (upd[activeBuildingIndex]) {
                                  const newPhotos = { ...upd[activeBuildingIndex].photos };
                                  delete newPhotos.lointain;
                                  upd[activeBuildingIndex].photos = newPhotos;
                                }
                                return upd;
                              })}
                              className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo lointaine</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'lointain', e)} />
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
                              })()}

              {/* ÉTAPE 4 — Carte DP2 / PC2 (Visionneuses actives divisées en 1, 2, 3 ou 4 cadres dynamiques) */}
              {step === 4 && (() => {
                const activeStructures = scopedStructures.filter(str => selectedStructureIds.includes(str.id));
                const siteCoords = resolveProjectCoordinates(editedProject, project);
                const refSiteLat = siteCoords.lat;
                const refSiteLng = siteCoords.lng;

                return (
                  <motion.div
                    key="step4-masse"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 h-full flex flex-col gap-2.5 overflow-hidden"
                  >
                    {/* Barre de contrôle et d'activation des visionneuses */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 flex-shrink-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-blue-600" />
                            Étape 5 : {isDP ? 'DP2' : 'PC2'} — Plan de Masse ({activeStructures.length} visionneuse{activeStructures.length > 1 ? 's' : ''} active{activeStructures.length > 1 ? 's' : ''})
                          </h3>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {solutionType === 'battery'
                            ? "Activez la visionneuse de la station de stockage par batteries (dalle béton armé < 20 m² géoréférencée)."
                            : "Activez les visionneuses souhaitées. Chaque cadre correspond à un bâtiment ou une ombrière géoréférencé sur le site du déclarant."}
                        </p>
                      </div>

                      {/* Boutons d'activation / désactivation des visionneuses */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {scopedStructures.map((str) => {
                          const isAct = selectedStructureIds.includes(str.id);
                          return (
                            <button
                              key={str.id}
                              type="button"
                              onClick={() => {
                                setSelectedStructureIds(prev => {
                                  if (prev.includes(str.id)) {
                                    return prev.filter(id => id !== str.id);
                                  }
                                  return [...prev, str.id];
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs ${
                                isAct
                                  ? (str.solutionKey === 'battery' || str.isBattery
                                      ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                                      : (str.solutionKey === 'ombriere'
                                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                          : 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'))
                                  : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-100 opacity-70'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isAct ? 'bg-white' : 'bg-slate-400'}`} />
                              <span>{str.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                isAct ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {isAct ? 'Visible' : 'Désactivé'}
                              </span>
                            </button>
                          );
                        })}

                        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSelectedStructureIds(scopedStructures.map(s => s.id))}
                            className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-[11px] font-bold shadow-2xs"
                          >
                            Tout voir
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Grille divisée selon le nombre de visionneuses activées (1, 2, 3 ou 4) */}
                    {activeStructures.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                        <Building2 className="w-12 h-12 text-slate-300 mb-2" />
                        <h4 className="text-sm font-bold text-slate-700">Aucune visionneuse activée</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">
                          Toutes les visionneuses sont actuellement masquées. Activez au moins un bâtiment ou une ombrière via les boutons ci-dessus pour afficher son plan de masse.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedStructureIds(scopedStructures.map(s => s.id))}
                          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm"
                        >
                          Réactiver toutes les structures
                        </button>
                      </div>
                    ) : (
                      <div className={`grid gap-3 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 ${
                        activeStructures.length === 1
                          ? 'grid-cols-1'
                          : activeStructures.length === 2
                          ? 'grid-cols-2'
                          : activeStructures.length === 3
                          ? 'grid-cols-3'
                          : 'grid-cols-2 lg:grid-cols-4'
                      }`}>
                        {activeStructures.map((str, sIdx) => {
                          // Coordonnées vérifiées et garanties sur le site du déclarant
                          let strLat = Number(str.lat || (str.gps ? str.gps.split(',')[0] : null));
                          let strLng = Number(str.lng || (str.gps ? str.gps.split(',')[1] : null));
                          if (!strLat || !strLng || isNaN(strLat) || isNaN(strLng) || Math.hypot(strLat - refSiteLat, strLng - refSiteLng) > 0.05 || (Math.abs(strLat - 43.5612) < 0.001 && Math.abs(refSiteLat - 43.5612) > 0.001)) {
                            strLat = refSiteLat + sIdx * 0.00015;
                            strLng = refSiteLng + sIdx * 0.00020;
                          }

                          const isBatteryStr = str.solutionKey === 'battery' || str.isBattery;
                          const sLen = isBatteryStr
                            ? Number(str.length || batteryStorage.dalleLength || 6.20)
                            : Number(str.length || (str.bayCount ? str.bayCount * (str.baySpacing || 7.5) : (config.length || 30)));
                          const sWid = isBatteryStr
                            ? Number(str.width || batteryStorage.dalleWidth || 3.20)
                            : Number(str.width || config.width || 15);
                          const extLeft = !isBatteryStr && str.leftSide !== 'none' ? Number(str.leftWidth || (str.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
                          const extRight = !isBatteryStr && str.rightSide !== 'none' ? Number(str.rightWidth || (str.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
                          const totalWid = sWid + extLeft + extRight;
                          const sRot = Number(str.rotation || 0);
                          const corners = getBuildingCorners(strLat, strLng, sLen, totalWid, sRot);

                          return (
                            <div
                              key={str.id}
                              className={`flex flex-col bg-white border-2 rounded-2xl shadow-xs overflow-hidden transition-colors min-h-[360px] ${
                                isBatteryStr
                                  ? 'border-purple-500/80 shadow-purple-50'
                                  : (str.solutionKey === 'ombriere' ? 'border-emerald-500/80 shadow-emerald-50' : 'border-blue-500/80 shadow-blue-50')
                              }`}
                            >
                              {/* En-tête du Cadre avec bouton de désactivation immédiate */}
                              <div className={`flex items-center justify-between p-2.5 border-b select-none ${
                                isBatteryStr
                                  ? 'bg-purple-50/80 border-purple-100'
                                  : (str.solutionKey === 'ombriere' ? 'bg-emerald-50/80 border-emerald-100' : 'bg-blue-50/80 border-blue-100')
                              }`}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                    isBatteryStr
                                      ? 'bg-purple-200 text-purple-900'
                                      : (str.solutionKey === 'ombriere' ? 'bg-emerald-200 text-emerald-900' : 'bg-blue-200 text-blue-900')
                                  }`}>
                                    {isBatteryStr ? 'Batteries' : (str.solutionKey === 'ombriere' ? 'Ombrière' : 'Bâtiment')}
                                  </span>
                                  <span className="font-black text-xs text-slate-900 truncate">{str.name}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedStructureIds(prev => prev.filter(id => id !== str.id))}
                                  className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-red-600 hover:bg-white/80 transition-all flex items-center gap-1 border border-slate-200 bg-white/50"
                                  title="Masquer cette visionneuse"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Désactiver</span>
                                </button>
                              </div>

                              {/* Contrôle Dimensions & Orientation exclusif à ce bâtiment */}
                              <div className="p-2.5 bg-white border-b border-slate-100 space-y-1.5 flex-shrink-0">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-slate-500 truncate">
                                    {sLen.toFixed(1)}m × {totalWid.toFixed(1)}m ({Math.round(sLen * totalWid)} m²){(extLeft > 0 || extRight > 0) ? ` (${sWid}m + ${(extLeft + extRight).toFixed(1)}m)` : ''}
                                  </span>
                                  <span className="font-black text-blue-700 whitespace-nowrap">
                                    {sRot}° ({getOrientationLabel(sRot)})
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMasseRotationUpdate(str.id, Math.max(-180, sRot - 15))}
                                    className="px-2 py-1 text-[10px] font-extrabold rounded-lg border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 transition-all shadow-2xs"
                                    title="Tourner de -15°"
                                  >
                                    -15°
                                  </button>
                                  <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    step="1"
                                    value={sRot}
                                    onChange={(e) => handleMasseRotationUpdate(str.id, Number(e.target.value))}
                                    className="flex-1 h-5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleMasseRotationUpdate(str.id, Math.min(180, sRot + 15))}
                                    className="px-2 py-1 text-[10px] font-extrabold rounded-lg border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 transition-all shadow-2xs"
                                    title="Tourner de +15°"
                                  >
                                    +15°
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMasseRotationUpdate(str.id, 0)}
                                    className={`px-2 py-1 text-[10px] font-extrabold rounded-lg border transition-all ${
                                      sRot === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                    }`}
                                    title="Plein Sud (0°)"
                                  >
                                    0°
                                  </button>
                                </div>

                                {/* Raccourcis d'orientation compacts */}
                                <div className="grid grid-cols-4 gap-1 pt-0.5">
                                  {(isBatteryStr ? [
                                    { label: 'Sud (0°)', val: 0 },
                                    { label: 'Ouest (90°)', val: 90 },
                                    { label: 'Nord (180°)', val: 180 },
                                    { label: 'Est (-90°)', val: -90 },
                                  ] : [
                                    { label: 'Sud (0°)', val: 0 },
                                    { label: 'Ouest (90°)', val: 90 },
                                    { label: 'S-O (45°)', val: 45 },
                                    { label: 'S-E (-45°)', val: -45 },
                                  ]).map(({ label, val }) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleMasseRotationUpdate(str.id, val)}
                                      className={`py-1 rounded-lg text-[10px] font-extrabold transition-all border ${
                                        sRot === val
                                          ? 'bg-[#0e2b4d] text-white border-[#0e2b4d] shadow-2xs'
                                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Barre de contrôle des Vues Plan de Masse (Vue 1 & Vue 2 avec zoom différent) */}
                              <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1.5 flex-wrap text-xs flex-shrink-0">
                                <div className="flex items-center gap-1">
                                  {/* Onglet Vue 1 */}
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchMasseView(str.id, 1)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                                      (masseViewTabs[str.id] || 1) === 1
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Vue 1</span>
                                    <span className={`text-[10px] px-1 rounded ${
                                      (masseViewTabs[str.id] || 1) === 1 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      Z{str.masse_zoom || 18}
                                    </span>
                                  </button>

                                  {/* Onglet Vue 2 si activée */}
                                  {hasMasseView2[str.id] ? (
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => handleSwitchMasseView(str.id, 2)}
                                        className={`px-2.5 py-1 rounded-l-lg font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                                          masseViewTabs[str.id] === 2
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Vue 2 (2nde page)</span>
                                        <span className={`text-[10px] px-1 rounded ${
                                          masseViewTabs[str.id] === 2 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          Z{str.masse_zoom_2 || 16}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMasseView2(str.id)}
                                        title="Supprimer la 2nde vue"
                                        className="p-1 rounded-r-lg border border-l-0 border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddMasseView2(str.id)}
                                      className="px-2 py-1 rounded-lg font-bold text-[11px] bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 flex items-center gap-1 transition-all shadow-2xs"
                                      title="Ajouter une seconde capture avec un zoom différent créant une 2nde page DP2 / PC2"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>+ 2nde vue (zoom différent)</span>
                                    </button>
                                  )}
                                </div>

                                 {/* Boutons d'action droite : Côtes, Carte fixe, Tracer distance & Capturer */}
                                 <div className="flex items-center gap-2 flex-wrap">
                                   {/* Bouton Toggle Afficher les côtes bâtiment */}
                                   {(() => {
                                     const isDimensionsShown = masseShowDimensions[str.id] !== undefined
                                       ? Boolean(masseShowDimensions[str.id])
                                       : (str.masse_show_dimensions !== false);
                                     return (
                                       <button
                                         type="button"
                                         onClick={() => handleToggleMasseDimensions(str.id)}
                                         className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-2 border shadow-2xs ${
                                           isDimensionsShown
                                             ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                             : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                         }`}
                                         title="Afficher ou masquer les traits d'indication de mesure du bâtiment (longueur et largeur)"
                                       >
                                         <span>Côtes bâtiment</span>
                                         <div className={`w-7 h-4 rounded-full relative transition-colors ${
                                           isDimensionsShown ? 'bg-white/30' : 'bg-slate-300'
                                         }`}>
                                           <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                             isDimensionsShown ? 'left-3.5' : 'left-0.5'
                                           }`} />
                                         </div>
                                       </button>
                                     );
                                   })()}

                                   {/* Bouton Carte fixe / Carte libre */}
                                   <button
                                     type="button"
                                     onClick={() => handleToggleMasseLock(str.id)}
                                     className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 border shadow-2xs ${
                                       masseLockedMaps[str.id] !== false
                                         ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                         : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                     }`}
                                     title={masseLockedMaps[str.id] !== false ? "Carte verrouillée (fixe). Vous pouvez déplacer le bâtiment en drag & drop sans que le fond de carte ne bouge." : "Carte libre. Cliquez pour figer la carte."}
                                   >
                                     {masseLockedMaps[str.id] !== false ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                     <span>{masseLockedMaps[str.id] !== false ? 'Carte fixe' : 'Carte libre'}</span>
                                   </button>

                                   {/* Outil de tracé de distance manuel (DP2 / PC2) */}
                                   <button
                                     type="button"
                                     onClick={() => setMeasuringMasseStrId(measuringMasseStrId === str.id ? null : str.id)}
                                     className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 border shadow-2xs ${
                                       measuringMasseStrId === str.id
                                         ? 'bg-orange-600 text-white border-orange-700 shadow-xs animate-pulse'
                                         : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                     }`}
                                     title="Tracer une côte de distance (ex: recul limite parcellaire ou voie). Cliquez sur un 1er point puis un 2nd point."
                                   >
                                     <Move className="w-3.5 h-3.5" />
                                     <span>{measuringMasseStrId === str.id ? 'Tracer (cliquer 2 pts)...' : 'Tracer distance'}</span>
                                   </button>

                                   {/* Bouton Effacer côtes si des tracés existent */}
                                   {(masseDistances[str.id]?.length > 0) && (
                                     <button
                                       type="button"
                                       onClick={() => handleClearMasseDistances(str.id)}
                                       className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                                       title="Effacer tous les tracés de distance de cette vue"
                                     >
                                       <X className="w-3.5 h-3.5" />
                                     </button>
                                   )}

                                   {/* Outil de placement Borne SDIS */}
                                   <button
                                     type="button"
                                     onClick={() => setIsPlacingSdis(!isPlacingSdis)}
                                     className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 border shadow-2xs ${
                                       isPlacingSdis
                                         ? 'bg-red-600 text-white border-red-700 shadow-xs animate-pulse'
                                         : sdisPoint
                                           ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                           : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                     }`}
                                     title="Placer ou déplacer la borne incendie SDIS sur la carte"
                                   >
                                     <Flame className={`w-3.5 h-3.5 ${isPlacingSdis || sdisPoint ? 'text-red-500' : 'text-slate-500'}`} />
                                     <span>{isPlacingSdis ? 'Cliquer carte...' : (sdisPoint ? 'Borne SDIS' : 'Borne SDIS')}</span>
                                   </button>

                                   {sdisPoint && (
                                     <button
                                       type="button"
                                       onClick={() => {
                                         setSdisPoint(null);
                                         setIsPlacingSdis(false);
                                         setEditedProject(prev => ({ ...prev, sdisPoint: null }));
                                       }}
                                       className="p-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                       title="Supprimer la borne SDIS"
                                     >
                                       <X className="w-3 h-3" />
                                     </button>
                                   )}

                                   {/* Bouton manuel de capture avec feedback */}
                                   {masseCapturedToast[str.id] && (
                                     <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
                                       <CheckCircle2 className="w-3 h-3" />
                                       {masseCapturedToast[str.id]}
                                     </span>
                                   )}
                                   <button
                                     type="button"
                                     onClick={() => handleManualCapture(str.id)}
                                     className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 flex items-center gap-1 transition-all shadow-2xs"
                                     title="Prendre une capture de la vue courante"
                                   >
                                     <Camera className="w-3 h-3 text-blue-600" />
                                     <span>Capturer</span>
                                   </button>
                                 </div>
                              </div>

                              {/* Visionneuse Carte pour ce bâtiment / cette ombrière */}
                              <div
                                id={`masse-map-container-${str.id}`}
                                className="relative flex-1 min-h-[260px] w-full overflow-hidden"
                              >
                                 {/* Message d'aide en mode mesure */}
                                 {measuringMasseStrId === str.id && (
                                   <div className="absolute top-3 left-3 z-[1000] bg-orange-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-white/40 flex items-center gap-2 animate-pulse">
                                     <Move className="w-3.5 h-3.5" />
                                     <span>Mode mesure : Cliquez sur 2 points de la carte pour tracer la côte</span>
                                   </div>
                                 )}

                                 {/* Boussole / Flèche Nord réglementaire en overlay */}
                                 <div className="absolute top-3 right-3 z-[1000] pointer-events-none bg-white/95 backdrop-blur-xs border border-slate-300 rounded-full w-9 h-9 flex flex-col items-center justify-center shadow-md">
                                   <span className="text-[10px] font-black text-slate-800 leading-none">N</span>
                                   <span className="text-blue-600 text-[10px] leading-none font-bold">▲</span>
                                 </div>

                                 <MapContainer
                                   key={`map-masse-${str.id}-${activeStructures.length}`}
                                   center={[
                                     Number((masseViewTabs[str.id] === 2 ? str.masse_center_lat_2 : str.masse_center_lat) || strLat),
                                     Number((masseViewTabs[str.id] === 2 ? str.masse_center_lng_2 : str.masse_center_lng) || strLng)
                                   ]}
                                   zoom={Number((masseViewTabs[str.id] === 2 ? str.masse_zoom_2 : str.masse_zoom) || (isBatteryStr ? 19 : (masseViewTabs[str.id] === 2 ? 16 : 18)))}
                                   scrollWheelZoom={true}
                                   className="h-full w-full"
                                   style={{ height: '100%', width: '100%' }}
                                 >
                                   <TileLayer
                                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                     attribution="&copy; OpenStreetMap"
                                     crossOrigin="anonymous"
                                     maxZoom={21}
                                     maxNativeZoom={19}
                                   />
                                   <MapResizer activeCount={activeStructures.length} center={[strLat, strLng]} />
                                   <MasseMapLockController isLocked={masseLockedMaps[str.id] !== false} />
                                   <MasseMapController 
                                     strId={str.id} 
                                     onMapChange={handleMasseMapChange} 
                                     mapInstancesRef={masseMapInstancesRef}
                                     activeView={masseViewTabs[str.id] || 1}
                                   />

                                   {/* Structure principale déplaçable en drag & drop (carte fixe) */}
                                   <DraggableMasseStructure
                                     key={`draggable-masse-${str.id}-${Number(strLat).toFixed(7)}-${Number(strLng).toFixed(7)}-${sRot}-${sLen}-${totalWid}`}
                                     polygonPositions={corners}
                                     centerLat={strLat}
                                     centerLng={strLng}
                                     isBattery={isBatteryStr}
                                     solutionKey={str.solutionKey}
                                     structureName={str.name}
                                     rotation={sRot}
                                     onGpsUpdate={(newLat, newLng) => handleMasseGpsUpdate(str.id, newLat, newLng)}
                                     isLocked={masseLockedMaps[str.id] !== false}
                                     isMeasuring={measuringMasseStrId === str.id}
                                   />

                                   {/* Point Borne SDIS interactif et déplaçable */}
                                   <MasseSdisLayer
                                     sdisPoint={sdisPoint}
                                     isPlacing={isPlacingSdis}
                                     onSetSdisPoint={(pt) => {
                                       setSdisPoint(pt);
                                       setIsPlacingSdis(false);
                                       setEditedProject(prev => ({ ...prev, sdisPoint: pt }));
                                     }}
                                   />

                                   {/* Tracés de distance / côtes manuelles enregistrées et outil de tracé interactif */}
                                   <MasseDistanceLayer
                                     distances={masseDistances[str.id] || []}
                                     onRemoveDistance={(distId) => handleRemoveMasseDistance(str.id, distId)}
                                   />
                                   <MasseDistanceDrawer
                                     isMeasuring={measuringMasseStrId === str.id}
                                     onAddDistance={(newDist) => handleAddMasseDistance(str.id, newDist)}
                                   />

                                   {/* Rendu intérieur des 4 armoires CESC 261 sur la dalle béton pour la Station Batteries */}
                                   {isBatteryStr && (() => {
                                     const cabElements = [];
                                     for (let ci = 0; ci < 4; ci++) {
                                       const t0 = (ci + 0.12) / 4;
                                       const t1 = (ci + 0.88) / 4;
                                       const p0 = [
                                         corners[0][0] + (corners[1][0] - corners[0][0]) * t0,
                                         corners[0][1] + (corners[1][1] - corners[0][1]) * t0,
                                       ];
                                       const p1 = [
                                         corners[0][0] + (corners[1][0] - corners[0][0]) * t1,
                                         corners[0][1] + (corners[1][1] - corners[0][1]) * t1,
                                       ];
                                       const p2 = [
                                         corners[3][0] + (corners[2][0] - corners[3][0]) * t1,
                                         corners[3][1] + (corners[2][1] - corners[3][1]) * t1,
                                       ];
                                       const p3 = [
                                         corners[3][0] + (corners[2][0] - corners[3][0]) * t0,
                                         corners[3][1] + (corners[2][1] - corners[3][1]) * t0,
                                       ];

                                       const c0 = [p0[0] + (p3[0] - p0[0]) * 0.15, p0[1] + (p3[1] - p0[1]) * 0.15];
                                       const c1 = [p1[0] + (p2[0] - p1[0]) * 0.15, p1[1] + (p2[1] - p1[1]) * 0.15];
                                       const c2 = [p1[0] + (p2[0] - p1[0]) * 0.85, p1[1] + (p2[1] - p1[1]) * 0.85];
                                       const c3 = [p0[0] + (p3[0] - p0[0]) * 0.85, p0[1] + (p3[1] - p0[1]) * 0.85];

                                       cabElements.push(
                                         <Polygon
                                           key={`poly-cab-${str.id}-${ci}-${sRot}-${Number(strLat).toFixed(7)}-${Number(strLng).toFixed(7)}`}
                                           positions={[c0, c1, c2, c3]}
                                           pathOptions={{
                                             color: '#7e22ce',
                                             fillColor: '#ffffff',
                                             fillOpacity: 0.85,
                                             weight: 1.5,
                                             interactive: false,
                                           }}
                                         />
                                       );
                                     }
                                     return cabElements;
                                   })()}

                                   {/* Cotations architecturales le long des côtés extérieurs du rectangle si activées */}
                                   {(masseShowDimensions[str.id] !== undefined ? Boolean(masseShowDimensions[str.id]) : (str.masse_show_dimensions !== false)) && (() => {
                                     const dim = getBuildingDimensionLines(strLat, strLng, sLen, totalWid, sRot, 2.8);
                                     const strokeColor = isBatteryStr ? '#9333ea' : (str.solutionKey === 'ombriere' ? '#059669' : '#2563eb');
                                     return (
                                       <React.Fragment key={`dims-${str.id}-${sRot}-${Number(strLat).toFixed(7)}-${Number(strLng).toFixed(7)}`}>
                                         {/* Longueur */}
                                         <Polyline key={`pl-len-${str.id}-${sRot}`} positions={dim.lenLine} pathOptions={{ color: strokeColor, weight: 2 }} />
                                         <Polyline key={`pl-lenw1-${str.id}-${sRot}`} positions={dim.lenWitness1} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                         <Polyline key={`pl-lenw2-${str.id}-${sRot}`} positions={dim.lenWitness2} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                         <Marker
                                           key={`mk-len-${str.id}-${sRot}`}
                                           position={dim.lenTextPos || dim.lenMid}
                                           icon={L.divIcon({
                                             className: 'bg-transparent',
                                             html: `<div style="transform: translate(-50%, -50%) rotate(${(dim.lenAngle || 0).toFixed(1)}deg); font-size: 12px; font-weight: 800; color: ${strokeColor}; white-space: nowrap; text-shadow: 0 0 3px #ffffff, 0 0 2px #ffffff, 0 0 1px #ffffff; pointer-events: none; user-select: none;">${sLen.toFixed(1)} M</div>`,
                                             iconSize: [0, 0]
                                           })}
                                           interactive={false}
                                         />

                                         {/* Largeur */}
                                         <Polyline key={`pl-wid-${str.id}-${sRot}`} positions={dim.widLine} pathOptions={{ color: strokeColor, weight: 2 }} />
                                         <Polyline key={`pl-widw1-${str.id}-${sRot}`} positions={dim.widWitness1} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                         <Polyline key={`pl-widw2-${str.id}-${sRot}`} positions={dim.widWitness2} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                         <Marker
                                           key={`mk-wid-${str.id}-${sRot}`}
                                           position={dim.widTextPos || dim.widMid}
                                           icon={L.divIcon({
                                             className: 'bg-transparent',
                                             html: `<div style="transform: translate(-50%, -50%) rotate(${(dim.widAngle || 0).toFixed(1)}deg); font-size: 12px; font-weight: 800; color: ${strokeColor}; white-space: nowrap; text-shadow: 0 0 3px #ffffff, 0 0 2px #ffffff, 0 0 1px #ffffff; pointer-events: none; user-select: none;">${totalWid.toFixed(1)} M</div>`,
                                             iconSize: [0, 0]
                                           })}
                                           interactive={false}
                                         />
                                       </React.Fragment>
                                     );
                                   })()}

                                  {/* Rendu dynamique en temps réel des autres structures activées sur la parcelle */}
                                  {activeStructures.filter(other => other.id !== str.id && (solutionType !== 'battery' || other.solutionKey === 'battery' || other.isBattery)).map(other => {
                                    let oLat = Number(other.lat || (other.gps ? other.gps.split(',')[0] : null));
                                    let oLng = Number(other.lng || (other.gps ? other.gps.split(',')[1] : null));
                                    if (!oLat || !oLng || isNaN(oLat) || isNaN(oLng) || Math.hypot(oLat - refSiteLat, oLng - refSiteLng) > 0.05 || (Math.abs(oLat - 43.5612) < 0.001 && Math.abs(refSiteLat - 43.5612) > 0.001)) {
                                      oLat = refSiteLat + (other.indexInSol || 0) * 0.00015;
                                      oLng = refSiteLng + (other.indexInSol || 0) * 0.00020;
                                    }
                                    const isOtherBat = other.solutionKey === 'battery' || other.type === 'battery' || other.isBattery;
                                    const oLen = isOtherBat
                                      ? Number(other.length || batteryStorage.dalleLength || 6.20)
                                      : Number(other.length || (other.bayCount ? other.bayCount * (other.baySpacing || 7.5) : 30));
                                    const oWid = isOtherBat
                                      ? Number(other.width || batteryStorage.dalleWidth || 3.20)
                                      : Number(other.width || 15);
                                    const oExtL = !isOtherBat && other.leftSide !== 'none' ? Number(other.leftWidth || (other.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
                                    const oExtR = !isOtherBat && other.rightSide !== 'none' ? Number(other.rightWidth || (other.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
                                    const oTotalWid = oWid + oExtL + oExtR;
                                    const oRot = Number(other.rotation || 0);
                                    const oCorners = getBuildingCorners(oLat, oLng, oLen, oTotalWid, oRot);

                                    return (
                                      <Polygon
                                        key={`poly-cadre-${str.id}-other-${other.id}-${Number(oLat).toFixed(7)}-${Number(oLng).toFixed(7)}-${oRot}-${oLen}-${oWid}`}
                                        positions={oCorners}
                                        pathOptions={{
                                          color: isOtherBat ? '#9333ea' : (other.solutionKey === 'ombriere' ? '#059669' : '#2563eb'),
                                          fillColor: isOtherBat ? '#a855f7' : (other.solutionKey === 'ombriere' ? '#10b981' : '#3b82f6'),
                                          fillOpacity: 0.25,
                                          dashArray: '3, 3',
                                          weight: 2,
                                          interactive: false,
                                        }}
                                      >
                                        <Tooltip sticky direction="top" offset={[0, -10]}>
                                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap bg-white/95 text-slate-700 border border-slate-200">
                                            {other.name} ({oRot}°)
                                          </div>
                                        </Tooltip>
                                      </Polygon>
                                    );
                                  })}

                                  <PC2MapScaleBar />
                                </MapContainer>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })()}

              {/* ÉTAPE 5 — Notice d'insertion & Descriptive du projet (PLEINE HAUTEUR) */}
              {step === 5 && (
                <motion.div
                  key="step5-notice"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 h-full flex flex-col gap-3 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs flex-shrink-0">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          Étape 6 : Notice d'insertion & Descriptive du projet ({isDP ? 'DP' : 'PC4'})
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Complétez et personnalisez les 5 points de la notice. Ce texte est injecté dans {isDP ? 'le dossier DP' : 'la planche PC4'} et restera modifiable dans le PDF final.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNoticeUserModified(false);
                          const auto = buildAutoNoticeText();
                          setNoticeText(auto);
                          setEditedProject(prev => ({ ...prev, noticeText: auto }));
                        }}
                        className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                        title="Régénérer le texte selon les paramètres actuels du projet"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Réinitialiser
                      </button>
                    </div>
                  </div>

                  {/* Éditeur de Notice prenant TOUTE la hauteur du cadre */}
                  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 flex-shrink-0">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <Sparkles className="w-4 h-4" />
                        Texte de la notice descriptive (5 points structurés)
                      </span>
                      <span className="text-slate-400 text-[11px] font-semibold">
                        {noticeText.length} caractères • {noticeText.split(/\s+/).filter(Boolean).length} mots
                      </span>
                    </div>

                    <textarea
                      value={noticeText}
                      onChange={(e) => {
                        setIsNoticeUserModified(true);
                        setNoticeText(e.target.value);
                        setEditedProject(prev => ({ ...prev, noticeText: e.target.value }));
                      }}
                      placeholder="Rédigez ou personnalisez la notice descriptive du projet..."
                      className="flex-1 w-full min-h-0 p-3.5 mt-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 6 — Validation & Sélection des pages du PDF */}
              {step === 6 && (
                <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

                  {/* Sélection interactive des structures et sous-onglets à inclure dans le dossier PDF */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Structures &amp; Sous-onglets à inclure dans le PDF ({selectedStructureIds.length}/{scopedStructures.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStructureIds(scopedStructures.map(s => s.id))}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                        >
                          Toutes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (scopedStructures.length > 0) {
                              setSelectedStructureIds([scopedStructures[0].id]);
                            }
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                        >
                          Seulement la 1ère
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {scopedStructures.map((str) => {
                        const isSelected = selectedStructureIds.includes(str.id);
                        const isBatStr = str.solutionKey === 'battery' || str.isBattery;
                        const strLen = isBatStr ? Number(str.length || batteryStorage.dalleLength || 6.20) : Number(str.length || (str.bayCount || 5) * (str.baySpacing || 7.5));
                        const strWid = isBatStr ? Number(str.width || batteryStorage.dalleWidth || 3.20) : Number(str.width || 15);
                        return (
                          <div
                            key={str.id}
                            onClick={() => {
                              setSelectedStructureIds(prev => {
                                if (prev.includes(str.id)) {
                                  if (prev.length <= 1) return prev; // Garder au moins 1 structure
                                  return prev.filter(id => id !== str.id);
                                }
                                return [...prev, str.id];
                              });
                            }}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? (isBatStr ? 'bg-white border-purple-600 shadow-xs ring-2 ring-purple-200' : 'bg-white border-blue-600 shadow-xs ring-2 ring-blue-200')
                                : 'bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-85'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  isBatStr
                                    ? 'bg-purple-100 text-purple-800'
                                    : (str.solutionKey === 'ombriere' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                                }`}>
                                  {str.solutionLabel}
                                </span>
                                <span className="font-bold text-xs text-slate-900 truncate">{str.name}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {strLen.toFixed(1)}m × {strWid.toFixed(1)}m — {Math.round(strLen * strWid)} m²
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className={`w-4 h-4 rounded pointer-events-none flex-shrink-0 ${isBatStr ? 'text-purple-600' : 'text-blue-600'}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sélection interactive des planches */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Sélection des pièces et planches du dossier ({type.toUpperCase()})
                      </h5>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPages({
                            cover: true,
                            situation: true,
                            masse: true,
                            section_notice: true,
                            section: true,
                            facades: true,
                            insertion: true,
                            env: true,
                            dp_notice: true,
                            dp8: true,
                            cerfa: true,
                          })}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          Tout cocher
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPages({
                            cover: false,
                            situation: false,
                            masse: false,
                            section_notice: false,
                            section: false,
                            facades: false,
                            insertion: false,
                            env: false,
                            dp_notice: false,
                            dp8: false,
                            cerfa: false,
                          })}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          Tout décocher
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {(type === 'pc' ? [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte & synthèse', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'PC1', title: 'Plan de situation', desc: 'IGN cartographique & Satellite', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'PC2', title: 'Plan de masse', desc: 'Emprise de la construction', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'section_notice', code: 'PC3+PC4', title: 'Coupe & Notice', desc: isBatActive ? 'Coupe transversale & notice descriptive de la station batteries' : (solutionType === 'building' ? 'Coupe transversale & notice descriptive du bâtiment' : 'Coupe transversale & notice descriptive'), badge: 'Obligatoire', color: 'indigo' },
                        { id: 'facades', code: 'PC5', title: 'Façades & Toitures', desc: isBatActive ? '5 vues 3D de la station batteries' : (solutionType === 'building' ? '5 vues 3D du bâtiment (Sud, Nord, Est, Ouest, Toit)' : '5 vues 3D (Sud, Nord, Est, Ouest, Toit)'), badge: !!captures?.facade_sud ? 'Prêt' : '3D', color: 'emerald' },
                        { id: 'insertion', code: 'PC6', title: 'Insertion paysagère', desc: 'Vue avant / simulation 3D après', badge: (photos?.avant || photos?.apres) ? 'Prêt' : 'Photo 3D', color: 'emerald' },
                        { id: 'env_proche', code: 'PC7', title: 'Environnement proche', desc: 'Photographie dans le paysage proche', badge: (photos?.proche || editedProject?.pc_photos?.proche) ? 'Prêt' : 'Optionnel', color: 'purple' },
                        { id: 'env_lointain', code: 'PC8', title: 'Paysage lointain', desc: 'Photographie dans le paysage lointain', badge: (photos?.lointain || editedProject?.pc_photos?.lointain) ? 'Prêt' : 'Optionnel', color: 'purple' },
                        { id: 'cerfa', code: 'CERFA', title: 'Formulaire CERFA', desc: 'CERFA 13404 officiel pré-rempli', badge: 'Administratif', color: 'amber' },
                      ] : type === 'dp' ? [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte & synthèse', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'DP1', title: 'Plan de situation', desc: 'IGN cartographique & Satellite', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'DP2', title: 'Plan de masse', desc: 'Plan de masse des constructions', badge: 'Obligatoire', color: 'indigo' },
                        { 
                          id: 'section', 
                          code: isBatActive ? (selectedPages.dp_notice !== false ? 'DP3+NOTICE' : 'DP3') : (buildings.length > 1 ? (selectedPages.dp_notice !== false ? 'DP3+NOTICE' : 'DP3') : (selectedPages.dp_notice !== false ? 'DP3+NOTICE' : 'DP3')), 
                          title: isBatActive ? 'Plan en coupe' : (solutionType === 'building' ? 'Plan en coupe du bâtiment' : (buildings.length > 1 ? 'Plans en coupe (Multi-ombrières)' : 'Plan en coupe')), 
                          desc: isBatActive ? 'Coupe transversale & notice descriptive de la station batteries' : (solutionType === 'building' ? 'Coupe transversale & notice descriptive du bâtiment' : (buildings.length > 1 ? (selectedPages.dp_notice !== false ? "2 coupes superposées & notice descriptive dédiée" : "2 coupes transversales des ombrières superposées") : (selectedPages.dp_notice !== false ? "Coupe transversale & notice descriptive" : "Coupe transversale de l'ombrière"))), 
                          badge: 'Obligatoire', 
                          color: 'indigo',
                          subOption: {
                            key: 'dp_notice',
                            label: isBatActive ? '+ Notice descriptive sous la coupe' : (solutionType === 'building' ? '+ Notice descriptive sous la coupe' : (buildings.length > 1 ? '+ Notice descriptive (page dédiée)' : '+ Notice descriptive sous la coupe')),
                            checked: selectedPages.dp_notice !== false
                          }
                        },
                        { id: 'facades', code: 'DP4', title: 'Façades & Toitures', desc: isBatActive ? "5 vues 3D de la station batteries" : (solutionType === 'building' ? "5 vues 3D du bâtiment" : "5 vues 3D de l'ombrière"), badge: '3D', color: 'emerald' },
                        { id: 'insertion', code: 'DP6', title: 'Insertion paysagère', desc: 'Simulation d\'intégration paysagère', badge: (photos?.avant || photos?.apres) ? 'Prêt' : 'Photo 3D', color: 'emerald' },
                        { id: 'env_proche', code: 'DP7', title: 'Environnement proche', desc: 'Photographie de l\'environnement proche', badge: (photos?.proche || editedProject?.pc_photos?.proche) ? 'Prêt' : 'Optionnel', color: 'purple' },
                        { id: 'env_lointain', code: 'DP8', title: 'Paysage lointain', desc: 'Photographie du paysage lointain', badge: (photos?.lointain || editedProject?.pc_photos?.lointain) ? 'Prêt' : 'Optionnel', color: 'purple' },
                        { id: 'cerfa', code: 'CERFA', title: 'Formulaire CERFA DP', desc: 'Déclaration préalable officielle', badge: 'Administratif', color: 'amber' },
                      ] : [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'CU1', title: 'Plan de situation', desc: 'Localisation du terrain', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'CU2', title: 'Plan de masse', desc: 'Plan d\'emprise', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'cerfa', code: 'CERFA', title: 'Formulaire CERFA CU', desc: 'Certificat d\'urbanisme', badge: 'Administratif', color: 'amber' },
                      ]).map(item => {
                        const isChecked = selectedPages[item.id] !== false;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedPages(prev => ({ ...prev, [item.id]: !isChecked }))}
                            className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                              isChecked
                                ? 'bg-white border-blue-600 shadow-sm ring-2 ring-blue-500/10'
                                : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-80'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                    isChecked ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {item.code}
                                  </span>
                                  <span className={`text-[9.5px] font-bold ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {isChecked ? '✓ Inclus' : '✕ Exclu'}
                                  </span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                                />
                              </div>
                              <h6 className="text-xs font-black text-slate-900 leading-tight">{item.title}</h6>
                              <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                              
                              {/* Sous-option facultative intégrée dans la carte */}
                              {item.subOption && isChecked && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPages(prev => ({ ...prev, [item.subOption.key]: !item.subOption.checked }));
                                  }}
                                  className="mt-2 pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-1.5 bg-blue-50/70 -mx-1 px-2 py-1 rounded-lg cursor-pointer hover:bg-blue-100/80 transition-colors"
                                >
                                  <span className="text-[10px] font-bold text-blue-900 leading-tight">
                                    {item.subOption.label}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={item.subOption.checked}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              <span className="text-[9.5px] font-bold text-slate-400 truncate">{item.badge}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadSinglePiece(item);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs hover:shadow-xs"
                                  title={`Télécharger ${item.code} (${item.title}) en format PDF`}
                                >
                                  {downloadingPieceId === item.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                      <span>Export...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3 h-3" />
                                      <span>PDF</span>
                                    </>
                                  )}
                                </button>
                                {item.id !== 'cover' && item.id !== 'cerfa' && (
                                  <button
                                    type="button"
                                    disabled={isGenerating}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadSinglePieceDwg(item);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/80 hover:border-emerald-600 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs hover:shadow-xs"
                                    title={`Télécharger le plan ${item.code} (${item.title}) au format CAO .DWG`}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>DWG</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Synthèse et Objet des travaux (2 colonnes 50% / 50%) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                    {/* Colonne Gauche : Paramètres Déclarant & Projet modifiables */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3.5 text-xs flex flex-col shadow-2xs h-full">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          Déclarant &amp; Projet (Page de garde &amp; CERFA)
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">Modifiable</span>
                      </div>

                      <div className="space-y-2 flex-1 flex flex-col justify-between">
                        {/* 1. Demandeur */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Demandeur</span>
                          <input
                            type="text"
                            value={editedProject?.demandeur !== undefined ? editedProject.demandeur : (summary.demandeur !== '—' ? summary.demandeur : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedProject(prev => ({
                                ...prev,
                                demandeur: val,
                                clientName: val,
                                name: val,
                                lastName: val
                              }));
                              handleFieldChange('demandeur', val);
                              handleFieldChange('lastName', val);
                            }}
                            placeholder="Nom & prénom ou raison sociale"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>

                        {/* 2. Email */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Email</span>
                          <input
                            type="email"
                            value={editedProject?.email !== undefined ? editedProject.email : (summary.email !== '—' ? summary.email : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedProject(prev => ({ ...prev, email: val }));
                              handleFieldChange('email', val);
                            }}
                            placeholder="contact@domaine.fr"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>

                        {/* 3. Adresse */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Adresse</span>
                          <input
                            type="text"
                            value={editedProject?.address !== undefined ? editedProject.address : (summary.adresse !== '—' ? summary.adresse : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              const parsed = parseFrenchAddress(val, editedProject?.zip || '', editedProject?.city || editedProject?.commune || '');
                              setEditedProject(prev => ({
                                ...prev,
                                address: val,
                                clientAddress: val,
                                terrain_address: val,
                                terrain_voie: parsed.voie || val,
                                terrain_voie_nom: parsed.voie || val,
                                terrain_voie_num: parsed.numero || '',
                                ...(parsed.codePostal ? { zip: parsed.codePostal, terrain_zip: parsed.codePostal } : {}),
                                ...(parsed.commune ? { city: parsed.commune, commune: parsed.commune, terrain_city: parsed.commune, cadastre_commune: parsed.commune } : {})
                              }));
                              handleFieldChange('address', val);
                              if (parsed.codePostal) handleFieldChange('zip', parsed.codePostal);
                              if (parsed.commune) handleFieldChange('city', parsed.commune);
                            }}
                            placeholder="Adresse complète du projet"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>

                        {/* 4. Cadastre (Section, N°, Surface) & Multi-parcelles */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Cadastre</span>
                            <div className="flex items-center gap-1.5 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-bold">Sec.</span>
                                <input
                                  type="text"
                                  value={projectParcelles[0]?.section || editedProject?.cadastre_section || ''}
                                  onChange={(e) => handleParcelleChange(0, 'section', e.target.value.toUpperCase())}
                                  placeholder="ZI"
                                  className="w-14 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-center uppercase"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-bold">N°</span>
                                <input
                                  type="text"
                                  value={projectParcelles[0]?.numero || editedProject?.cadastre_numero || ''}
                                  onChange={(e) => handleParcelleChange(0, 'numero', e.target.value)}
                                  placeholder="0032"
                                  className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-center"
                                />
                              </div>
                              <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-gray-400 font-bold">Surf.</span>
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    value={projectParcelles[0]?.surface || editedProject?.cadastre_surface || ''}
                                    onChange={(e) => handleParcelleChange(0, 'surface', e.target.value)}
                                    placeholder="1352"
                                    className="w-full px-2 py-1.5 pr-6 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                  />
                                  <span className="absolute right-2 top-1.5 text-[10px] text-gray-400 font-medium pointer-events-none">m²</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddParcelle}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all active:scale-95 shadow-2xs flex-shrink-0"
                                title="Ajouter une autre parcelle cadastrale"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Lignes de parcelles additionnelles sous la ligne Cadastre */}
                          {projectParcelles.slice(1).map((p, pIdx) => {
                            const actualIdx = pIdx + 1;
                            return (
                              <div key={actualIdx} className="flex items-center gap-2">
                                <span className="text-[10px] text-blue-600 font-semibold w-24 flex-shrink-0 text-right pr-2">
                                  + Parcelle {actualIdx + 1}
                                </span>
                                <div className="flex items-center gap-1.5 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-bold">Sec.</span>
                                    <input
                                      type="text"
                                      value={p.section || ''}
                                      onChange={(e) => handleParcelleChange(actualIdx, 'section', e.target.value.toUpperCase())}
                                      placeholder="ZI"
                                      className="w-14 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-center uppercase"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-bold">N°</span>
                                    <input
                                      type="text"
                                      value={p.numero || ''}
                                      onChange={(e) => handleParcelleChange(actualIdx, 'numero', e.target.value)}
                                      placeholder="0033"
                                      className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-center"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 flex-1">
                                    <span className="text-[10px] text-gray-400 font-bold">Surf.</span>
                                    <div className="relative flex-1">
                                      <input
                                        type="text"
                                        value={p.surface || ''}
                                        onChange={(e) => handleParcelleChange(actualIdx, 'surface', e.target.value)}
                                        placeholder="1200"
                                        className="w-full px-2 py-1.5 pr-6 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                      />
                                      <span className="absolute right-2 top-1.5 text-[10px] text-gray-400 font-medium pointer-events-none">m²</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParcelle(actualIdx)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-red-50 hover:bg-red-600 text-red-500 hover:text-white border border-red-200 hover:border-red-600 transition-all active:scale-95 shadow-2xs flex-shrink-0"
                                    title={`Supprimer la parcelle ${actualIdx + 1}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {projectParcelles.length > 1 && (
                            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 font-medium">
                              <span>Superficie totale ({projectParcelles.length} parcelles) :</span>
                              <span className="font-bold">
                                {projectParcelles.reduce((sum, p) => sum + (Number(String(p?.surface || '').replace(/\D/g, '')) || 0), 0)} m²
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 5. Commune */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Commune</span>
                          <input
                            type="text"
                            value={editedProject?.city !== undefined ? editedProject.city : (editedProject?.commune !== undefined ? editedProject.commune : (summary.commune !== '—' ? summary.commune : ''))}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedProject(prev => ({ ...prev, city: val, commune: val, cadastre_commune: val, terrain_city: val, terrain_commune: val }));
                              handleFieldChange('city', val);
                              handleFieldChange('commune', val);
                            }}
                            placeholder="Commune du projet"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>

                        {/* 6. Puissance */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Puissance</span>
                          <input
                            type="text"
                            value={editedProject?.puissance !== undefined ? editedProject.puissance : (editedProject?.kwc !== undefined ? (String(editedProject.kwc).includes('kWc') ? editedProject.kwc : `${editedProject.kwc} kWc`) : (summary.puissance !== '—' ? summary.puissance : ''))}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numOnly = val.replace(/[^\d\.]/g, '');
                              setEditedProject(prev => ({
                                ...prev,
                                puissance: val,
                                kwc: numOnly || val,
                                projectSize: numOnly || val
                              }));
                              handleFieldChange('puissance', val);
                              if (numOnly) handleFieldChange('kwc', numOnly);
                            }}
                            placeholder="Ex: 500 kWc"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>

                        {/* 7. Type */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Type</span>
                          <input
                            type="text"
                            value={
                              isBatActive
                                ? ((editedProject?.urbanismeType && !editedProject.urbanismeType.toLowerCase().includes('ombrière') && !editedProject.urbanismeType.toLowerCase().includes('bâtiment')) ? editedProject.urbanismeType : 'Station Batteries Stand-Alone')
                                : ((editedProject?.urbanismeType && !/batterie|bess/i.test(editedProject.urbanismeType)) ? editedProject.urbanismeType : (editedProject?.typeLabel || summary.type))
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedProject(prev => ({ ...prev, urbanismeType: val, typeLabel: val, installationType: val }));
                              handleFieldChange('urbanismeType', val);
                            }}
                            placeholder={isBatActive ? "Station Batteries Stand-Alone" : (solutionType === 'building' ? (isAcama ? "Bâtiment photovoltaïque" : "Bâtiment et Ombrière") : (isDP ? "Ombrière photovoltaïque" : "Bâtiment et Ombrière"))}
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colonne Droite : Objet des travaux prenant toute la hauteur cumulée */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3.5 text-xs flex flex-col shadow-2xs h-full">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          Objet des travaux (Page de garde PDF)
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">Modifiable</span>
                      </div>
                      <textarea
                        value={
                          isBatActive
                            ? (
                                (editedProject?.objet_travaux && !editedProject.objet_travaux.toLowerCase().includes('ombrière') && !editedProject.objet_travaux.toLowerCase().includes('bâtiment') && !editedProject.objet_travaux.toLowerCase().includes('hangar'))
                                  ? editedProject.objet_travaux
                                  : "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV."
                              )
                            : (
                                (editedProject?.objet_travaux && editedProject.objet_travaux.trim().length > 30 && !/batterie|bess|stockage d'énergie/i.test(editedProject.objet_travaux))
                                  ? editedProject.objet_travaux
                                  : defaultObjetTravauxText
                              )
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedProject(prev => ({ ...prev, objet_travaux: val, description: val }));
                          handleFieldChange('objet_travaux', val);
                        }}
                        placeholder={isBatActive ? "Ex: Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV." : (solutionType === 'building' ? "Ex: Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque" : (isDP ? "Ex: Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire" : "Ex: Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"))}
                        className="w-full flex-1 min-h-[260px] p-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner resize-none"
                      />
                    </div>
                  </div>

                  {/* Cartouche Dépôt Dématérialisé en Mairie & Portail SVE (déplacé sous les 2 cadres) */}
                  <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-blue-800/40 relative overflow-hidden">
                    {/* Ruban tricolore officiel */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                      <div className="flex-1 bg-blue-600"></div>
                      <div className="flex-1 bg-white"></div>
                      <div className="flex-1 bg-red-600"></div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-500/20 text-blue-200 border border-blue-400/30">
                            <Landmark className="w-3 h-3 text-blue-300" />
                            RÉPUBLIQUE FRANÇAISE &bull; SVE URBANISME
                          </span>
                          {mairieRouting.loading ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 font-semibold">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Recherche du guichet communal...
                            </span>
                          ) : mairieRouting.data?.portal ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              mairieRouting.data.portal.isNationalFallback
                                ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30'
                                : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {mairieRouting.data.portal.isNationalFallback ? "Téléservice National AD'AU" : "Guichet Unique Communal"}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                            {mairieRouting.data?.nom || `Mairie de ${editedProject?.city || editedProject?.commune || 'la commune'}`}
                          </h3>
                          {mairieRouting.data?.codePostal && (
                            <span className="text-xs text-blue-200 font-bold">({mairieRouting.data.codePostal})</span>
                          )}
                        </div>

                        <p className="text-xs text-blue-100/80 leading-snug">
                          Portail de Saisine par Voie Électronique (SVE) :{' '}
                          <span className="font-semibold text-white">
                            {mairieRouting.data?.portal?.name || "AD'AU (Service-Public.fr)"}
                          </span>
                        </p>

                        {mairieRouting.data?.portal?.url && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <a
                              href={mairieRouting.data.portal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-white underline underline-offset-2 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Accéder au guichet en direct ({(() => {
                                try { return new URL(mairieRouting.data.portal.url).hostname; } catch { return 'Lien officiel'; }
                              })()})
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Bouton d'action principal CTA */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          disabled={isExportingZip}
                          onClick={handleOpenPortalAndDownloadZip}
                          className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                          title="Ouvre le guichet de dépôt officiel et télécharge l'ensemble des pièces ordonnées en archive ZIP"
                        >
                          {isExportingZip ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>{zipProgressText || 'Génération du ZIP...'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-white" />
                              <span>Ouvrir le Guichet Unique &amp; Télécharger les pièces (.ZIP)</span>
                              <ExternalLink className="w-4 h-4 text-blue-200" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Alerte Bloqueur de Pop-up si déclenché */}
                    {popupBlocked && (
                      <div className="mt-3.5 p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 flex items-start gap-2.5 text-xs animate-fade-in">
                        <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold">L'ouverture automatique a été bloquée par votre navigateur.</span>{' '}
                          Cliquez sur ce lien pour accéder directement au guichet :{' '}
                          <a
                            href={mairieRouting.data?.portal?.url || 'https://www.service-public.fr/particuliers/vosdroits/R52221'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline text-white hover:text-amber-200 ml-1 inline-flex items-center gap-1"
                          >
                            Ouvrir le Guichet d'Urbanisme ↗
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Bloc Secondaire : Option Dépôt Papier / LRAR - Entièrement lisible */}
                    <div className="mt-3.5 pt-3 border-t border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0 w-full">
                        <Mail className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed flex-1">
                          <span className="font-bold text-white block sm:inline mr-1">Option Dépôt Papier / LRAR :</span>
                          <span className="text-blue-200/90 font-medium">
                            {mairieRouting.data?.adresseLrar
                              ? mairieRouting.data.adresseLrar.split('\n').filter(Boolean).join(' — ')
                              : 'Mairie compétente pour l\'envoi postal recommandé'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                        {mairieRouting.data?.telephone && (
                          <span className="text-[11px] text-blue-200/80 inline-flex items-center gap-1 font-medium">
                            <Phone className="w-3 h-3 text-blue-400" />
                            {mairieRouting.data.telephone}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (mairieRouting.data?.adresseLrar) {
                              navigator.clipboard.writeText(mairieRouting.data.adresseLrar);
                              setCopiedAddress(true);
                              setTimeout(() => setCopiedAddress(false), 2000);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-100 text-[11px] font-bold transition-all border border-white/10 cursor-pointer"
                          title="Copier l'adresse postale formatée pour LRAR"
                        >
                          {copiedAddress ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Adresse copiée !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copier l'adresse LRAR</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Modal Configuration Toiture */}
          {showRoofModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-amber-200 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-amber-100">
                  <h4 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    Configuration Toiture Solaire
                  </h4>
                  <button onClick={() => setShowRoofModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Désignation / Nom de la toiture</label>
                    <input
                      type="text"
                      value={additionalRoof.name}
                      onChange={(e) => setAdditionalRoof(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Toiture Hangar Nord existante"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Surface toiture (m²)</label>
                      <input
                        type="number"
                        value={additionalRoof.surface}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, surface: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Puissance (kWc)</label>
                      <input
                        type="number"
                        value={additionalRoof.kwc}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, kwc: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Type de couverture</label>
                      <input
                        type="text"
                        value={additionalRoof.roofType}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, roofType: e.target.value }))}
                        placeholder="Bac acier, tuiles..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Orientation</label>
                      <input
                        type="text"
                        value={additionalRoof.orientation}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, orientation: e.target.value }))}
                        placeholder="Sud, Est-Ouest..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {additionalRoof.enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdditionalRoof(prev => ({ ...prev, enabled: false }));
                        setShowRoofModal(false);
                      }}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      Désactiver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalRoof(prev => ({ ...prev, enabled: true }));
                      setShowRoofModal(false);
                    }}
                    className="ml-auto px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-sm"
                  >
                    Valider la Toiture
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Configuration Batterie */}
          {showBatteryModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-purple-200 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-purple-100">
                  <h4 className="text-sm font-extrabold text-purple-900 flex items-center gap-2">
                    <Battery className="w-5 h-5 text-purple-600" />
                    Configuration Système Batterie
                  </h4>
                  <button onClick={() => setShowBatteryModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Modèle / Fabricant batterie</label>
                    <input
                      type="text"
                      value={batteryStorage.model}
                      onChange={(e) => setBatteryStorage(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Ex: CESC Mercury 261, Tesla..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Capacité de stockage (kWh)</label>
                      <input
                        type="number"
                        value={batteryStorage.capacityKwh}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, capacityKwh: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Puissance onduleur (kW)</label>
                      <input
                        type="number"
                        value={batteryStorage.powerKw}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, powerKw: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nombre d'armoires</label>
                      <input
                        type="number"
                        value={batteryStorage.quantity}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Emprise au sol (dalle)</label>
                      <input
                        type="text"
                        value={batteryStorage.footprint}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, footprint: e.target.value }))}
                        placeholder="3.50m × 2.20m"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {batteryStorage.enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatteryStorage(prev => ({ ...prev, enabled: false }));
                        setShowBatteryModal(false);
                      }}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      Désactiver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBatteryStorage(prev => ({ ...prev, enabled: true }));
                      setShowBatteryModal(false);
                    }}
                    className="ml-auto px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm"
                  >
                    Valider la Batterie
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modales */}
          <ImageCropModal
            isOpen={cropModal.open}
            onClose={() => setCropModal(prev => ({ ...prev, open: false }))}
            imageSrc={cropModal.src}
            title={cropModal.title}
            onCropComplete={handleCropComplete}
          />

          <LandscapeIntegrationModal
            isOpen={landscapeModalOpen}
            onClose={() => setLandscapeModalOpen(false)}
            initialPhoto={buildings[activeBuildingIndex]?.photos?.avant || photos?.avant}
            projectDimensions={{
              longueur: config.length,
              largeur: config.width,
              hauteur_egout: config.eaveHeight,
              pente: config.roofPitch,
              buildingType: config.buildingType,
              leftSide: config.leftSide,
              rightSide: config.rightSide,
              type: editedProject.type
            }}
            installationType={editedProject.type}
            onSaveSimulation={handleSaveSimulation}
          />

          {batteryLandscapeModalOpen && (
            <BatteryInsertionCompositor
              isOpen={batteryLandscapeModalOpen}
              onClose={() => setBatteryLandscapeModalOpen(false)}
              initialPhoto={buildings[activeBuildingIndex]?.photos?.avant || photos?.avant}
              batteryConfig={{
                powerKw: batteryStorage?.powerKw || 500,
                quantity: batteryStorage?.quantity || 4,
                model: batteryStorage?.model || 'CESC Mercury 261',
                dalleLength: batteryStorage?.dalleLength || 6.20,
                dalleWidth: batteryStorage?.dalleWidth || 3.20
              }}
              onSaveSimulation={(simulatedDataUrl) => {
                handleSaveSimulation(simulatedDataUrl);
                setBatteryLandscapeModalOpen(false);
              }}
              docType={isDP ? "DP6" : "PC6"}
            />
          )}

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
            <button
              onClick={async () => {
                if (step === 0) {
                  handleSafeClose();
                } else {
                  if (step === 4) {
                    await captureAllActiveMasseMaps();
                  }
                  const prevStep = Math.max(0, step - 1);
                  saveWizardState({ step: prevStep });
                  setStep(prevStep);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? 'Annuler' : 'Précédent'}
            </button>

            {step < STEPS.length - 1 ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    syncActiveConfigToSolutions();
                    saveWizardState();
                    toast({
                      title: 'Étape sauvegardée',
                      description: 'Les modifications de cette étape ont bien été enregistrées.'
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-xs cursor-pointer"
                  title="Sauvegarder les modifications de cette étape"
                >
                  <Save className="w-4 h-4 text-blue-600" />
                  <span>Sauvegarder</span>
                </button>

                <button
                  onClick={async () => {
                    syncActiveConfigToSolutions();
                    if (step === 4) {
                      await captureAllActiveMasseMaps();
                      if (!isNoticeUserModified) {
                        const auto = buildAutoNoticeText();
                        setNoticeText(auto);
                        setEditedProject(prev => ({ ...prev, noticeText: auto }));
                      }
                    }
                    const nextStep = Math.min(STEPS.length - 1, step + 1);
                    saveWizardState({ step: nextStep });
                    setStep(nextStep);
                  }}
                  className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm ${dossierInfo.accentColor} hover:opacity-90 cursor-pointer`}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    syncActiveConfigToSolutions();
                    saveWizardState();
                    toast({
                      title: 'Dossier complet sauvegardé',
                      description: 'Toutes les informations et contenus de toutes les étapes ont bien été enregistrés.'
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-xl transition-all shadow-xs cursor-pointer"
                  title="Sauvegarder toutes les données du dossier sans générer le PDF"
                >
                  <Save className="w-4 h-4 text-emerald-600" />
                  <span>Sauvegarder le dossier complet</span>
                </button>

                <button
                  onClick={async () => {
                    saveWizardState();
                    await handleGenerate();
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {downloadingPieceId ? 'Téléchargement en cours...' : 'Génération du PDF...'}</>
                  ) : (
                    <><FileCheck className="w-4 h-4" /> Générer le dossier PDF</>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
