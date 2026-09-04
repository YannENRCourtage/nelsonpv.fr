import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Car, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, FileCheck, Zap,
  Hash, Ruler, Info, RefreshCw, Mail, Phone, FileText,
  Upload, Image as ImageIcon, Check, Camera, Eye, Sparkles, Layers,
  Crop, HelpCircle, ArrowRight, Box, Sliders, Trash2, Battery, Sun, Plus,
  Compass, User
} from 'lucide-react';
import { getMissingFields, buildCerfaDataSummary, resolveDemandeurNames } from '@/services/SmartCerfaService';
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
async function captureDirectLeafletMap(map, targetStr, allActiveStructures = [], showDimensions = true) {
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

      const sLen = Number(str.length || (str.bayCount ? str.bayCount * (str.baySpacing || 7.5) : 30));
      const sWid = Number(str.width || 15);
      const extLeft = str.leftSide !== 'none' ? Number(str.leftWidth || (str.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const extRight = str.rightSide !== 'none' ? Number(str.rightWidth || (str.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
      const totalWid = sWid + extLeft + extRight;
      const sRot = Number(str.rotation || 0);

      const corners = getBuildingCorners(strLat, strLng, sLen, totalWid, sRot);
      const pixelCorners = corners.map(([cLat, cLng]) => map.latLngToContainerPoint([cLat, cLng]));

      const isOmb = str.solutionKey === 'ombriere' || (str.buildingType || '').toLowerCase().includes('ombriere');
      const strokeColor = isOmb ? '#059669' : '#2563eb';
      const fillColor = isOmb ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)';

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

      // Cotations architecturales en plan : SEULEMENT Longueur et Largeur sur les arêtes extérieures
      const strShowDim = str.masse_show_dimensions !== false && showDimensions !== false;
      if (strShowDim) {
        const centerPt = map.latLngToContainerPoint([strLat, strLng]);
        drawDimensionLine(ctx, pixelCorners[0], pixelCorners[1], centerPt, `${sLen.toFixed(1)} M`, strokeColor, 20);
        drawDimensionLine(ctx, pixelCorners[1], pixelCorners[2], centerPt, `${totalWid.toFixed(1)} M`, strokeColor, 20);
      }

      ctx.restore();
    });

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

export default function UrbanismeWizard({ isOpen, onClose, type, project, onGenerate }) {
  const isDP = type === 'dp';
  const isPC = type === 'pc'; 
  const hasInitializedRef = React.useRef(false);
  const prevProjectIdRef = React.useRef(null);

  const { activeTenantId, user } = useAuth() || {};
  const isAcama = activeTenantId === 'acama' || project?.tenantId === 'acama' || Boolean(project?.isAcama);
  const isGreenInvest = activeTenantId === 'green-invest' || activeTenantId === 'greeninvest' || user?.activeTenantId === 'green-invest' || user?.tenantId === 'green-invest' || user?.tenant === 'greeninvest' || Boolean(project?.isGreenInvest) || project?.tenantId === 'green-invest' || project?.tenantId === 'greeninvest' || project?.tenant === 'greeninvest' || project?.tenant === 'green-invest';
  const isNoBattery = isAcama || isGreenInvest;
  
  // Zustand Store du Configurateur Nelson
  const config = useConfiguratorValues();
  const configActions = useConfiguratorActions();

  const [step, setStep] = useState(0); // 0=Déclarant, 1=Cartes DP1/PC1, 2=Configurateur 2D/3D, 3=Photos/3D, 4=Notice Descriptive, 5=Validation
  const [solutionType, setSolutionType] = useState((!isAcama && isDP) ? 'ombriere' : 'building'); // 'building' | 'ombriere' | 'battery'
  const [viewMode, setViewMode] = useState('3D'); // '3D' | '2D_FRONT' | '2D_TOP'

  const [editedProject, setEditedProject] = useState(project || {});
  const [captures, setCaptures] = useState(project?.urbanisme_captures || {});
  const [photos, setPhotos] = useState(project?.pc_photos || {});
  const [fetchingCadastre, setFetchingCadastre] = useState(false);
  const [generatingMaps, setGeneratingMaps] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [masseCapturedToast, setMasseCapturedToast] = useState({}); // { [strId]: string }
  const masseMapInstancesRef = useRef({});

  // Sync ACAMA / Green Invest mode on open
  useEffect(() => {
    if (isOpen) {
      configActions.setIsAcama(isAcama);
      if (isNoBattery) {
        configActions.setConfigMode('custom');
        setSolutionType((!isAcama && isDP) ? 'ombriere' : 'building');
        setBatteryStorage(prev => ({ ...prev, enabled: false }));
      }
    }
  }, [isOpen, isAcama, isNoBattery, isDP]);

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

        list.push({
          ...b,
          id: oId,
          name: dynamicName,
          length: effectiveLen,
          width: effectiveWid,
          totalWidth: effectiveWid,
          solutionKey: 'ombriere',
          solutionLabel: 'Ombrière PV',
          indexInSol: i
        });
      });
    }
    return list;
  }, [solutions, isAcama, solutionType, activeBuildingIndex, config, getBuildingDisplayName]);

  const hasInitializedSelectionRef = React.useRef(false);

  // Synchronisation des identifiants sélectionnés (tous cochés à l'initialisation, jamais modifiés tout seuls après)
  useEffect(() => {
    if (!hasInitializedSelectionRef.current && allConfiguredStructures.length > 0) {
      hasInitializedSelectionRef.current = true;
      setSelectedStructureIds(prev => {
        if (prev && prev.length > 0) return prev;
        return allConfiguredStructures.map(s => s.id);
      });
    }
  }, [allConfiguredStructures]);

  // Mise à jour de l'orientation d'une structure quelconque depuis Carte DP2/PC2
  const handleMasseRotationUpdate = useCallback((targetId, val) => {
    const numRot = Number(val);
    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      ['building', 'ombriere'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : 'bat-') ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-1`;
            return b.id === targetId || currentId === targetId;
          });
          if (bIdx !== -1) {
            const nextList = [...nextSol[solKey].buildings];
            nextList[bIdx] = {
              ...nextList[bIdx],
              id: targetId,
              rotation: numRot,
              masse_capture: null,
              masse_capture_2: null
            };
            nextSol[solKey] = { ...nextSol[solKey], buildings: nextList };
            updated = true;
          }
        }
      });

      return updated ? nextSol : prev;
    });
  }, []);

  // Mise à jour des coordonnées GPS d'une structure quelconque depuis Carte DP2/PC2
  const handleMasseGpsUpdate = useCallback((targetId, newLat, newLng) => {
    const numLat = Number(newLat);
    const numLng = Number(newLng);
    if (!numLat || !numLng || isNaN(numLat) || isNaN(numLng)) return;

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      ['building', 'ombriere'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : 'bat-') ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-1`;
            return b.id === targetId || currentId === targetId;
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
          }
        }
      });

      return updated ? nextSol : prev;
    });
  }, []);

  // Mise à jour du cadrage (centre et zoom) d'une structure quelconque depuis Carte DP2/PC2 (Vue 1 ou Vue 2)
  const handleMasseMapChange = useCallback((targetId, { centerLat, centerLng, zoom }, viewNum = 1) => {
    const numLat = Number(centerLat);
    const numLng = Number(centerLng);
    const numZoom = Number(zoom);
    if (!numLat || !numLng || isNaN(numLat) || isNaN(numLng)) return;

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      ['building', 'ombriere'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : 'bat-') ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-1`;
            return b.id === targetId || currentId === targetId;
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
          }
        }
      });

      return updated ? nextSol : prev;
    });
  }, []);

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
        ['building', 'ombriere'].forEach(solKey => {
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
    const projectCadastre = `${rawSection ? `${rawSection} ` : ''}${rawNumero}`.trim();
    const projectSurface = editedProject?.surface_terrain ? `${editedProject.surface_terrain} m²` : (editedProject?.cadastre_surface ? `${editedProject.cadastre_surface} m²` : (project?.surface_terrain ? `${project.surface_terrain} m²` : '18 384 m²'));
    const projectAltitude = editedProject?.altitude || project?.altitude || '140.62 m';

    // Cas particulier : Projet de stockage d'énergie par batterie Stand-Alone (BESS)
    if (!isAcama && solutionType === 'battery') {
      const pQty = batteryStorage.quantity || 1;
      const pModel = batteryStorage.model || 'CESC Mercury 261';
      const pPower = batteryStorage.powerKw || (pQty * 125);
      const pCap = batteryStorage.capacityKwh || (pQty * 261);
      const pDalleL = batteryStorage.dalleLength || Math.max(6.0, Number((pQty * 3.2 + 3.0).toFixed(1)));
      const pDalleW = batteryStorage.dalleWidth || 6.0;
      const pFootprintArea = Math.round(pDalleL * pDalleW);

      return `1- OBJET DE LA DEMANDE
La présente demande porte sur l'implantation d'un système de stockage d'énergie par batteries stationnaires Stand-Alone (BESS) d'une puissance totale raccordée de ${pPower} kW et d'une capacité de ${pCap} kWh sur dalle béton étanche dédiée (~${pFootprintArea} m²).

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un cadre adapté disposant d'un accès direct depuis la voirie existante au Sud de la parcelle.

3- LE PROJET
Le projet comprend :
- L'implantation de ${pQty} container(s) technique(s) modulaire(s) de stockage ${pModel} (teinte gris anthracite RAL 7016 / gris clair RAL 7035, hauteur hors-tout : 2.60m),
- La réalisation d'une dalle en béton armé étanche avec bac de rétention intégré (${pDalleL.toFixed(2)}m × ${pDalleW.toFixed(2)}m, surface : ~${pFootprintArea} m²),
- L'implantation d'un poste de transformation et de livraison HTA (PDL ENEDIS) compact (2.50m × 2.00m, h : 2.40m),
- La pose d'une clôture grillagée périphérique de sécurité de 2.00m de hauteur avec portail d'accès pompier et maintenance (largeur 4.00m).

4- RACCORDEMENT AUX RESEAUX
L'installation est raccordée au réseau public de distribution d'électricité ENEDIS via le poste de livraison HTA situé sur la parcelle. Le dispositif est totalement autonome, silencieux et ne requiert aucun raccordement aux réseaux d'eau ni d'assainissement collectif.

5- SECURITE INCENDIE & PRESCRIPTIONS SDIS
L'installation intègre tous les dispositifs de sécurité et répond strictement aux préconisations SDIS :
- Système autonome de détection précoce thermique et dispositif d'extinction d'urgence automatique intégré à chaque container,
- Dispositif de coupure générale d'urgence asservi et accessible depuis l'extérieur de la clôture,
- Bac de rétention étanche sous dalle assurant la rétention totale des fluides et des eaux d'extinction éventuelles,
- Réserve d'eau incendie (bâche à eau de 120 m³) avec aire d'aspiration stabilisée et distance de sécurité minimale de 5.00m préservée vis-à-vis des limites parcellaires.`;
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
          batimentDesc = `Le projet a pour objet l'implantation d'une ombrière photovoltaïque (${sName}) de dimensions ${sL.toFixed(2)}m × ${sTotalW.toFixed(2)}m (surface couverte : ${sSurf} m²), orientée ${rotLabel} (${sRot}°), à structure métallique autoportante en Y/V (RAL 7016) avec toiture monopente inclinée à ${sPitch}°, permettant d'abriter les véhicules tout en produisant de l'électricité solaire${pwrForStruct ? `, développant une puissance installée de ${pwrForStruct} kWc` : ''}.`;
        } else {
          batimentDesc = `Le projet a pour objet la construction d'un bâtiment agricole à charpente métallique (${sName}) de forme rectangulaire (longueur : ${sL.toFixed(2)}m, largeur : ${sTotalW.toFixed(2)}m${extDesc}, hauteur sablière : ${sEave.toFixed(2)}m, surface couverte : ${sSurf} m²), orienté ${rotLabel} (${sRot}°), en structure métallique (RAL 7016 / 7005), composé de ${sBays} travées de ${sSpacing}m d'entraxe. La toiture sera constituée d'une couverture avec bac acier anti-condensation (RAL 7016) et panneaux solaires photovoltaïques intégrés (RAL 9005)${pwrForStruct ? `, développant une puissance installée de ${pwrForStruct} kWc` : ''}.`;
        }
      } else {
        if (isOmb) {
          batimentDesc += `\nIl comprend également l'implantation d'une ombrière photovoltaïque (${sName}) de dimensions ${sL.toFixed(2)}m × ${sTotalW.toFixed(2)}m (surface couverte : ${sSurf} m²), orientée ${rotLabel} (${sRot}°), à structure métallique en Y/V avec toiture monopente inclinée à ${sPitch}°.`;
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

    const p5Details = (!isAcama && isDP)
      ? `Une bâche à eau de 120m³ sera installée à proximité immédiate de la future ombrière. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf DP 02 - Plan de masse).`
      : `Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf ${isDP ? 'DP' : 'PC'} 02 - Plan de masse).`;

    return `1- OBJET DE LA DEMANDE
${objetDemande}

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

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
  }, [editedProject, project, config, buildings, additionalRoof, batteryStorage, isDP, solutionType, getBuildingDisplayName, isNoBattery, isAcama]);

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

    // 2. Basculer le type de solution
    setSolutionType(newSolType);
    setBatteryStorage(prev => ({ ...prev, enabled: false }));

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

    const names = resolveDemandeurNames(project);
    const cleanDemandeur = names.lastName || project.name || '';
    const projEmail = project.email || project.clientEmail || project.contactEmail || project.client_email || 'isabelle.dupond@gmail.com';
    const projAddress = project.address || project.clientAddress || project.projectAddress || project.siteAddress || project.street || project.adresse || '';
    const projZip = project.zip || project.postalCode || project.code_postal || project.clientZip || '';
    const projCity = project.city || project.commune || project.clientCity || project.cadastre_commune || '';

    const isBatteryProject = 
      !isNoBattery && (
        project?.isBatteryStandAlone === 'Oui' ||
        project?.isBatteryStandAlone === true ||
        String(project?.type || '').toLowerCase().includes('batterie') ||
        String(project?.project || '').toLowerCase().includes('batterie') ||
        String(project?.name || '').toLowerCase().includes('batterie') ||
        String(project?.nom || '').toLowerCase().includes('batterie') ||
        String(project?.description || '').toLowerCase().includes('batterie')
      );

    const detectedSolutionType = isNoBattery ? ((!isAcama && isDP) ? 'ombriere' : 'building') : (isBatteryProject ? 'battery' : (isDP ? 'ombriere' : 'building'));
    setSolutionType(detectedSolutionType);

    let parsedBatteryQty = 1;
    const projectCombinedStr = `${project?.project || ''} ${project?.name || ''} ${project?.nom || ''} ${project?.description || ''}`;
    const qMatch = projectCombinedStr.match(/x\s*(\d+)/i) || projectCombinedStr.match(/(\d+)\s*(?:batterie|battery|containers?|unit[eé]s?)/i);
    if (qMatch && Number(qMatch[1]) > 0) {
      parsedBatteryQty = Number(qMatch[1]);
    } else if (Number(project?.battery_quantity) > 0) {
      parsedBatteryQty = Number(project.battery_quantity);
    }

    const parsedBatteryPower = Number(project?.kwc || project?.puissance || project?.projectSize || (parsedBatteryQty * 125)) || (parsedBatteryQty * 125);
    const parsedBatteryCap = Number(project?.battery_capacity || (parsedBatteryQty * 261)) || (parsedBatteryQty * 261);
    const parsedBatteryModel = project?.battery_model || 'CESC Mercury 261';

    if (isBatteryProject) {
      setBatteryStorage({
        enabled: true,
        name: 'Système de stockage par batterie Stand-Alone',
        model: parsedBatteryModel,
        quantity: parsedBatteryQty,
        capacityKwh: parsedBatteryCap,
        powerKw: parsedBatteryPower,
        dalleLength: Math.max(6.0, Number((parsedBatteryQty * 3.2 + 3.0).toFixed(1))),
        dalleWidth: 6.0,
        footprint: `${(parsedBatteryQty * 3.2 + 3.0).toFixed(2)}m × 6.00m`,
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
      const batLen = Math.max(6.0, Number((parsedBatteryQty * 3.2 + 3.0).toFixed(1)));
      const batW = 6.0;
      initialBuildings = [
        {
          id: 'bat-1',
          name: `Station Batteries (${parsedBatteryQty}× ${parsedBatteryModel})`,
          length: batLen,
          width: batW,
          eaveHeight: 2.6,
          roofPitch: 0,
          buildingType: 'battery_standalone',
          isBattery: true,
          hasSolar: false,
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

    // Partitionner et structurer les bâtiments par solution (Bâtiment vs Ombrière)
    let loadedSolutions;
    if (project?.solutions?.building?.buildings && project?.solutions?.ombriere?.buildings) {
      loadedSolutions = project.solutions;
    } else {
      const buildingList = [];
      const ombriereList = [];

      initialBuildings.forEach((b) => {
        const isOmb = (b.solutionType === 'ombriere') || (b.buildingType || '').toLowerCase().startsWith('ombriere') || (b.category === 'ombriere');
        if (isOmb) {
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
        }
      };
    }

    setSolutions(loadedSolutions);

    // Initialiser les structures sélectionnées
    hasInitializedSelectionRef.current = true;
    if (project?.selectedStructureIds && Array.isArray(project.selectedStructureIds) && project.selectedStructureIds.length > 0) {
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

    const initialNotice = project?.noticeText || buildAutoNoticeText();
      setNoticeText(initialNotice);
      const clientKwc = project?.kwc || project?.puissance || project?.projectSize || '';
      const shortObjet = isDP
        ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
        : (isPC
          ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
          : "Demande d'urbanisme photovoltaïque");

      const initProj = {
        ...project,
        lat: defLat,
        lng: defLng,
        gps: `${defLat},${defLng}`,
        type: isOmbriere ? 'ombriere' : (project.type || 'batiment_solaire'),
        buildingType: b1?.buildingType || project.buildingType || 'asymetrique_1',
        lastName: names.lastName || project.name || '',
        firstName: names.firstName || '',
        demandeur: cleanDemandeur,
        email: projEmail,
        email2: project.email2 || '',
        cerfaEmailChoice: project.cerfaEmailChoice || 'email1',
        address: projAddress,
        zip: projZip,
        city: projCity,
        phone: project.phone || project.clientPhone || '06 00 00 00 00',
        birthDate: project.birthDate || '',
        birthCity: project.birthCity || '',
        birthDept: project.birthDept || (projZip ? projZip.substring(0, 2) : '32'),
        kwc: clientKwc,
        projectSize: clientKwc,
        puissance: clientKwc,
        objet_travaux: project.objet_travaux || project.objetTravaux || shortObjet,
        description: project.objet_travaux || project.objetTravaux || shortObjet,
        noticeText: initialNotice,
        longueur: String(b1?.length || 37.5),
        largeur: String(b1?.width || 20.0),
        hauteur_egout: String(b1?.eaveHeight || 4.0),
        pente: String(b1?.roofPitch || 10),
        leftSide: b1?.leftSide || 'none',
        rightSide: b1?.rightSide || 'none',
        leftWidth: b1?.leftWidth,
        rightWidth: b1?.rightWidth,
        bayCount: b1?.bayCount,
        cadastre_section: project.cadastre_section || '',
        cadastre_numero: project.cadastre_numero || '',
        cadastre_surface: project.cadastre_surface || '',
        cadastre_commune: project.cadastre_commune || projCity,
        commune: projCity,
        urbanismeType: project.urbanismeType || (isDP ? (initialBuildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque') : 'Bâtiment et Ombrière'),
        pente_terrain: project.pente_terrain || '3',
        cotation_bati: project.cotation_bati || '12.50',
        cotation_voie: project.cotation_voie || '8.00',
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

      // 1. Cadastre IGN automatique
      if ((initProj.gps || initProj.lat) && (!initProj.cadastre_section || !initProj.cadastre_numero)) {
        setFetchingCadastre(true);
        const gps = initProj.gps || `${initProj.lat},${initProj.lng}`;
        const [lat, lng] = gps.split(',').map(Number);
        cadastreService.getParcelle(lat, lng).then(data => {
          if (data) {
            setEditedProject(prev => ({
              ...prev,
              cadastre_section: prev.cadastre_section || data.section,
              cadastre_numero: prev.cadastre_numero || data.numero,
              cadastre_surface: prev.cadastre_surface || data.contenance,
              cadastre_commune: prev.cadastre_commune || data.nom_commune,
            }));
          }
        }).catch(e => console.error('Erreur auto cadastre:', e))
        .finally(() => setFetchingCadastre(false));
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

  // Mise à jour automatique de la notice selon les structures retenues (selectedStructureIds) et le projet
  useEffect(() => {
    if (!isNoticeUserModified || !noticeText || noticeText.includes("SAINT ARAILLES") || noticeText.includes("960.00 m²") || noticeText.includes("60m × 16m")) {
      const auto = buildAutoNoticeText();
      setNoticeText(auto);
      setEditedProject(prev => ({ ...prev, noticeText: auto }));
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
  const handleSaveMasseCapture = useCallback((targetId, dataUrl, viewNum = 1) => {
    if (!dataUrl) return;

    setSolutions(prev => {
      const nextSol = { ...prev };
      let updated = false;

      ['building', 'ombriere'].forEach(solKey => {
        if (nextSol[solKey]?.buildings) {
          const bIdx = nextSol[solKey].buildings.findIndex(b => {
            const currentId = b.id ? (String(b.id).startsWith(solKey === 'ombriere' ? 'omb-' : 'bat-') ? String(b.id) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-${b.id}`) : `${solKey === 'ombriere' ? 'omb' : 'bat'}-1`;
            return b.id === targetId || currentId === targetId;
          });
          if (bIdx !== -1) {
            const nextList = [...nextSol[solKey].buildings];
            if (viewNum === 2) {
              nextList[bIdx] = {
                ...nextList[bIdx],
                id: targetId,
                masse_capture_2: dataUrl
              };
            } else {
              nextList[bIdx] = {
                ...nextList[bIdx],
                id: targetId,
                masse_capture: dataUrl
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
    setCaptures(prev => ({ ...prev, [captureKey]: dataUrl }));
    setEditedProject(prev => ({
      ...prev,
      urbanisme_captures: { ...(prev.urbanisme_captures || {}), [captureKey]: dataUrl }
    }));
    persistMediaItem(targetId, captureKey, dataUrl, 'captures');
  }, [persistMediaItem]);

  // Capture haute résolution fidèle du plan de masse sans décalage
  const captureStructureMasseMap = useCallback(async (strId, viewNum = 1, forceShowDimensions = null) => {
    const map = masseMapInstancesRef.current[strId];
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    const activeList = allConfiguredStructures.filter(str => selectedStructureIds.includes(str.id));
    const showDim = forceShowDimensions !== null
      ? forceShowDimensions
      : (masseShowDimensions[strId] !== false && targetStr?.masse_show_dimensions !== false);

    let dataUrl = null;
    // 1. Tenter la capture directe instantanée sur le conteneur Leaflet (sans passer par html2canvas)
    if (map) {
      dataUrl = await captureDirectLeafletMap(map, targetStr, activeList, showDim);
    }

    // 2. Fallback de haute précision : génération statique sans faille (AutoMapService)
    if (!dataUrl && targetStr) {
      const bLat = Number(targetStr.lat || (targetStr.gps ? targetStr.gps.split(',')[0] : null) || 43.43571);
      const bLng = Number(targetStr.lng || (targetStr.gps ? targetStr.gps.split(',')[1] : null) || -1.17644);
      const cLat = Number((viewNum === 2 ? targetStr.masse_center_lat_2 : targetStr.masse_center_lat) || bLat);
      const cLng = Number((viewNum === 2 ? targetStr.masse_center_lng_2 : targetStr.masse_center_lng) || bLng);
      const cZoom = Number((viewNum === 2 ? targetStr.masse_zoom_2 : targetStr.masse_zoom) || (viewNum === 2 ? 16 : 18));
      dataUrl = await generateStaticMapImage(cLat, cLng, 'map', cZoom, activeList, showDim);
    }

    if (dataUrl) {
      handleSaveMasseCapture(strId, dataUrl, viewNum);
      return dataUrl;
    }
    return null;
  }, [allConfiguredStructures, selectedStructureIds, handleSaveMasseCapture, masseShowDimensions]);

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
      ['building', 'ombriere'].forEach(solKey => {
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
    const res = await captureStructureMasseMap(strId, activeView);
    if (res) {
      setMasseCapturedToast(prev => ({ ...prev, [strId]: `Vue ${activeView} capturée !` }));
      setTimeout(() => {
        setMasseCapturedToast(prev => ({ ...prev, [strId]: null }));
      }, 2500);
    }
  }, [masseViewTabs, captureStructureMasseMap]);

  // Bascule de l'affichage des côtes (longueur et largeur) sur le plan de masse
  const handleToggleMasseDimensions = useCallback((strId) => {
    const targetStr = allConfiguredStructures.find(s => s.id === strId);
    const currentVal = masseShowDimensions[strId] !== false && targetStr?.masse_show_dimensions !== false;
    const nextVal = !currentVal;

    setMasseShowDimensions(prev => ({ ...prev, [strId]: nextVal }));

    setBuildings(prev => prev.map(b => b.id === strId ? { ...b, masse_show_dimensions: nextVal } : b));
    setSolutionStates(prev => {
      let updated = false;
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v?.structures?.some(s => s.id === strId)) {
          updated = true;
          next[k] = {
            ...v,
            structures: v.structures.map(s => s.id === strId ? { ...s, masse_show_dimensions: nextVal } : s)
          };
        } else {
          next[k] = v;
        }
      }
      return updated ? next : prev;
    });

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
      await captureStructureMasseMap(str.id, activeView);
      if (hasMasseView2[str.id] && !str.masse_capture_2) {
        await captureStructureMasseMap(str.id, 2);
      }
    }
  }, [allConfiguredStructures, selectedStructureIds, masseViewTabs, hasMasseView2, captureStructureMasseMap]);

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
    const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
    if (activeBuildingIndex === 0) {
      setCaptures(prev => ({ ...prev, ...fiveViewsObj, facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture }));
      setEditedProject(prev => ({
        ...prev,
        urbanisme_captures: { 
          ...(prev.urbanisme_captures || {}), 
          ...fiveViewsObj, 
          facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture 
        }
      }));
    }
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...(updated[activeBuildingIndex].captures || {}),
          ...fiveViewsObj,
          facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture || updated[activeBuildingIndex].captures?.facades_projet
        };
      }
      return updated;
    });
    Object.entries(fiveViewsObj).forEach(([k, v]) => {
      if (v) persistMediaItem(bKey, k, v, 'captures');
    });
  };

  // Chargement direct de photo (sans pop-up automatique de recadrage)
  const handleDirectPhotoUpload = (category, key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
      if (category === 'photos') {
        if (activeBuildingIndex === 0) {
          setPhotos(prev => ({ ...prev, [key]: dataUrl }));
          setEditedProject(prev => ({
            ...prev,
            pc_photos: { ...(prev.pc_photos || {}), [key]: dataUrl }
          }));
        }
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
        if (key === 'situation_ign' || key === 'satellite' || key === 'masse_projet') {
          setCaptures(prev => ({ ...prev, [key]: dataUrl }));
          setEditedProject(prev => ({
            ...prev,
            urbanisme_captures: { ...(prev.urbanisme_captures || {}), [key]: dataUrl }
          }));
          persistMediaItem('general', key, dataUrl, 'captures');
        } else {
          if (activeBuildingIndex === 0) {
            setCaptures(prev => ({ ...prev, [key]: dataUrl }));
            setEditedProject(prev => ({
              ...prev,
              urbanisme_captures: { ...(prev.urbanisme_captures || {}), [key]: dataUrl }
            }));
          }
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
    event.target.value = '';
  };

  const handleOpenCrop = (src, category, key, title) => {
    setCropModal({ open: true, src, category, key, title });
  };

  const handleCropComplete = (croppedDataUrl) => {
    const { category, key } = cropModal;
    const bKey = buildings[activeBuildingIndex]?.id || `bat-${activeBuildingIndex + 1}`;
    if (category === 'photos') {
      if (activeBuildingIndex === 0) {
        setPhotos(prev => ({ ...prev, [key]: croppedDataUrl }));
        setEditedProject(prev => ({ ...prev, pc_photos: { ...(prev.pc_photos || {}), [key]: croppedDataUrl } }));
      }
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
      if (key === 'situation_ign' || key === 'satellite' || key === 'masse_projet') {
        const updated = { ...captures, [key]: croppedDataUrl };
        setCaptures(updated);
        setEditedProject(prev => ({ ...prev, urbanisme_captures: updated }));
        persistMediaItem('general', key, croppedDataUrl, 'captures');
      } else {
        if (activeBuildingIndex === 0) {
          setCaptures(prev => ({ ...prev, [key]: croppedDataUrl }));
          setEditedProject(prev => ({ ...prev, urbanisme_captures: { ...(prev.urbanisme_captures || {}), [key]: croppedDataUrl } }));
        }
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
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    
    const isBattery = !isNoBattery && (solutionType === 'battery' || batteryStorage.enabled || (editedProject.type || '').toLowerCase().includes('batterie'));
    
    // Objet synthétique pour Page 1
    const defaultObjet = isBattery
      ? "Implantation d'un système de stockage d'énergie par batteries stationnaires Stand-Alone (BESS)"
      : (isDP
        ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
        : (isPC
          ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
          : "Certificat d'urbanisme opérationnel pour centrale photovoltaïque"));
    const shortObjet = editedProject?.objet_travaux || defaultObjet;

    let effectiveNotice = noticeText || editedProject.noticeText || project?.noticeText || buildAutoNoticeText();
    if (isNoBattery && effectiveNotice) {
      effectiveNotice = effectiveNotice
        .replace(/Le système de stockage batterie est[^\n]*\n?/gi, '')
        .replace(/ainsi qu'un système de stockage batterie[^\n,\.]*/gi, '')
        .replace(/Le site sera également équipé d'un système de stockage d'énergie[^\n]*\n?/gi, '')
        .replace(/et le système de stockage batterie/gi, '')
        .replace(/Station Batteries \([^\)]*\)/gi, isDP ? 'Ombrière' : 'Bâtiment');
    }

    // Rassembler toutes les structures configurées de toutes les solutions actives
    const allConfigured = allConfiguredStructures;
    
    // Filtrer selon la sélection explicite de l'utilisateur (selectedStructureIds)
    const candidateBuildings = allConfigured.filter(b => selectedStructureIds.includes(b.id));
    const structuresToExport = candidateBuildings.length > 0 ? candidateBuildings : (allConfigured.length > 0 ? allConfigured.slice(0, 1) : buildings);

    // Conserver fidèlement chaque structure retenue avec ses propres dimensions et paramètres
    const updatedBuildings = structuresToExport.map((b, idx) => {
      let bLen = Number(b.length || (b.bayCount ? b.bayCount * (b.baySpacing || 7.5) : (isAcama ? 30 : 37.5)));
      let bWid = Number(b.width || (isAcama ? 15 : 16.4));
      if (isNoBattery && (bWid <= 6.0 || bLen <= 6.0)) {
        bLen = isAcama ? 30 : 37.5;
        bWid = isAcama ? 15 : 16.4;
      }
      let bName = b.name;
      const isOmb = b.solutionKey === 'ombriere' || (b.buildingType || '').toLowerCase().startsWith('ombriere');
      if (isNoBattery) {
        if (isAcama) {
          bName = `Bâtiment ${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m`;
        } else if (bName) {
          bName = bName.replace(/Station Batteries[^\)]*\)?/gi, isOmb ? 'Ombrière' : 'Bâtiment').trim();
        }
      }
      return {
        ...b,
        length: bLen,
        width: bWid,
        eaveHeight: Number(b.eaveHeight !== undefined && !isNaN(Number(b.eaveHeight)) ? b.eaveHeight : (isOmb ? 3.7 : 4.0)),
        roofPitch: Number(b.roofPitch !== undefined && !isNaN(Number(b.roofPitch)) ? b.roofPitch : 10),
        buildingType: (isNoBattery && (b.buildingType === 'battery_standalone' || !b.buildingType)) ? (isAcama ? 'symetrique' : (isOmb ? 'ombriere_pl' : 'asymetrique_1')) : (isBattery ? 'battery_standalone' : (b.buildingType || (isOmb ? 'ombriere_pl' : 'asymetrique_1'))),
        isBattery: isNoBattery ? false : (isBattery || Boolean(b.isBattery)),
        name: bName || (isOmb ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`),
        leftSide: b.leftSide || 'none',
        rightSide: b.rightSide || 'none',
        leftWidth: b.leftWidth !== undefined ? Number(b.leftWidth) : 0,
        rightWidth: b.rightWidth !== undefined ? Number(b.rightWidth) : 0,
        bayCount: Number(b.bayCount || 5),
        baySpacing: Number(b.baySpacing || 7.5),
        captures: { ...(b.captures || {}) },
        photos: { ...(b.photos || {}) },
      };
    });

    const isMultiOrOmbriere = updatedBuildings.length > 1 || updatedBuildings.some(b => (b.buildingType || '').includes('ombriere'));
    const defaultTypeLabel = isBattery
      ? "Système de stockage par batterie Stand-Alone"
      : (isDP
        ? (updatedBuildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque')
        : (isMultiOrOmbriere ? 'Bâtiment et Ombrière' : (editedProject.type || 'batiment_solaire')));
    const finalTypeLabel = editedProject?.urbanismeType || defaultTypeLabel;

    // Régénérer les cartes DP1/PC1 et DP2/PC2 avec le dernier GPS et les structures orientées
    const siteCoords = resolveProjectCoordinates(editedProject, project);
    const lat = siteCoords.lat;
    const lng = siteCoords.lng;
    const gps = `${lat},${lng}`;
    const ignMap = await generateStaticMapImage(lat, lng, 'map', 16);
    const satMap = await generateStaticMapImage(lat, lng, 'satellite', 17);
    
    // Génération / validation de la capture de plan de masse individuelle par bâtiment (Vue 1 et Vue 2)
    const buildingsWithMasse = await Promise.all(updatedBuildings.map(async (b) => {
      const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || lat);
      const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || lng);
      
      const bZoom = Number(b.masse_zoom || b.map_zoom || 18);
      const bCenterLat = Number(b.masse_center_lat || bLat);
      const bCenterLng = Number(b.masse_center_lng || bLng);

      const bShowDim = b.masse_show_dimensions !== false && masseShowDimensions[b.id] !== false;

      // --- VUE 1 ---
      let masse1 = b.masse_capture;
      if (!masse1 || typeof masse1 !== 'string' || !masse1.startsWith('data:image')) {
        const map = masseMapInstancesRef.current[b.id];
        if (map && (masseViewTabs[b.id] || 1) === 1) {
          masse1 = await captureDirectLeafletMap(map, b, updatedBuildings, bShowDim);
        }
        if (!masse1) {
          masse1 = await generateStaticMapImage(bCenterLat, bCenterLng, 'map', bZoom, updatedBuildings, bShowDim);
        }
      }

      // --- VUE 2 (si demandée) ---
      let masse2 = b.masse_capture_2;
      const wantsVue2 = hasMasseView2[b.id] || Boolean(b.masse_capture_2 || b.masse_zoom_2);
      if (wantsVue2) {
        if (!masse2 || typeof masse2 !== 'string' || !masse2.startsWith('data:image')) {
          const map = masseMapInstancesRef.current[b.id];
          if (map && masseViewTabs[b.id] === 2) {
            masse2 = await captureDirectLeafletMap(map, b, updatedBuildings, bShowDim);
          }
          if (!masse2) {
            const bZoom2 = Number(b.masse_zoom_2 || Math.max(14, bZoom - 2));
            const bCenterLat2 = Number(b.masse_center_lat_2 || bLat);
            const bCenterLng2 = Number(b.masse_center_lng_2 || bLng);
            masse2 = await generateStaticMapImage(bCenterLat2, bCenterLng2, 'map', bZoom2, updatedBuildings, bShowDim);
          }
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
        ...(wantsVue2 ? {
          masse_capture_2: masse2 || null,
          masse_zoom_2: Number(b.masse_zoom_2 || Math.max(14, bZoom - 2)),
          masse_center_lat_2: Number(b.masse_center_lat_2 || bLat),
          masse_center_lng_2: Number(b.masse_center_lng_2 || bLng),
        } : {})
      };
    }));

    const masseMap = buildingsWithMasse[0]?.masse_capture || await generateStaticMapImage(lat, lng, 'map', 18, updatedBuildings);
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
      ...(b.masse_capture_2 ? { masse_capture_2: b.masse_capture_2 } : {}),
      captures: { ...(b.captures || {}), ...(b.urbanisme_captures || {}) },
      urbanisme_captures: { ...(b.captures || {}), ...(b.urbanisme_captures || {}) },
      photos: { ...(b.photos || {}), ...(b.pc_photos || {}) },
      pc_photos: { ...(b.photos || {}), ...(b.pc_photos || {}) },
    }));

    const preservedKwc = editedProject?.puissance || editedProject?.kwc || project?.kwc || project?.puissance || project?.projectSize || editedProject?.projectSize || '';
    const b1 = enrichedBuildings[0] || {};
    const finalProject = {
      ...editedProject,
      ...fieldValues,
      demandeur: editedProject?.demandeur || summary.demandeur,
      lastName: editedProject?.demandeur || editedProject?.lastName || summary.demandeur,
      clientName: editedProject?.demandeur || editedProject?.clientName || summary.demandeur,
      email: editedProject?.email || summary.email,
      address: editedProject?.address || summary.adresse,
      city: editedProject?.city || editedProject?.commune || summary.commune,
      commune: editedProject?.commune || editedProject?.city || summary.commune,
      cadastre_section: editedProject?.cadastre_section,
      cadastre_numero: editedProject?.cadastre_numero,
      cadastre_surface: editedProject?.cadastre_surface,
      cadastre: editedProject?.cadastre || summary.cadastre,
      isAcama,
      isGreenInvest,
      cerfaEmailChoice: editedProject?.cerfaEmailChoice || 'email1',
      email2: editedProject?.email2 || '',
      buildingType: b1.buildingType || config.buildingType || 'asymetrique_1',
      type: editedProject?.type || project?.type || 'Construction',
      urbanismeType: finalTypeLabel,
      installationType: finalTypeLabel,
      typeLabel: finalTypeLabel,
      largeur: String(b1.width || config.width || 16.4),
      longueur: String(b1.length || config.length || 37.5),
      hauteur_egout: String(b1.eaveHeight || (b1.buildingType === 'ombriere_pl' ? 5.08 : (b1.buildingType?.startsWith('asymetrique') ? 4.0 : (config.eaveHeight || 4.0)))),
      pente: String(b1.roofPitch || (b1.buildingType?.startsWith('asymetrique') ? 15 : (config.roofPitch || 10))),
      leftSide: b1.leftSide || config.leftSide || 'none',
      rightSide: b1.rightSide || config.rightSide || 'none',
      leftWidth: b1.leftWidth || config.leftWidth,
      rightWidth: b1.rightWidth || config.rightWidth,
      bayCount: b1.bayCount || config.bayCount,
      baySpacing: b1.baySpacing || config.baySpacing,
      kwc: preservedKwc,
      projectSize: preservedKwc,
      puissance: preservedKwc,
      objet_travaux: shortObjet,
      description: shortObjet,
      noticeText: effectiveNotice,
      noticeAgricole: effectiveNotice,
      pc_notice: effectiveNotice,
      notice_descriptive: effectiveNotice,
      urbanisme_captures: finalCaptures,
      captures: finalCaptures,
      masse_capture: masseMap,
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

    try {
      await onGenerate(type, finalTypeLabel, finalProject, selectedPages);
    } finally {
      setIsGenerating(false);
      onClose();
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
      type: isAcama ? 'batiment_solaire' : (editedProject?.urbanismeType || (isDP ? (buildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque') : 'Bâtiment et Ombrière')),
      urbanismeType: editedProject?.urbanismeType,
      typeLabel: editedProject?.urbanismeType,
      docType: type,
      buildings
    },
    isAcama ? 'batiment_solaire' : (editedProject.type || (isDP ? 'ombriere' : 'batiment_solaire'))
  );
  const STEPS = ['Déclarant', isDP ? 'Cartes DP1' : 'Cartes PC1', 'Cotations & Côtes', 'Photos', isDP ? 'Carte DP2' : 'Carte PC2', 'Notice Descriptive', 'Validation'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 pt-14 pb-3 overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[1450px] max-h-[85vh] h-[85vh] overflow-hidden flex flex-col mt-2"
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
                onClick={onClose}
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
                    <h3 className="text-sm font-bold text-gray-800">Étape 1 : Identité & Coordonnées du déclarant</h3>
                    <p className="text-xs text-gray-500">Ces informations sont préremplies automatiquement et restent modifiables.</p>
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
                              <label className="text-gray-600 font-semibold truncate">Adresse email *</label>
                              {editedProject?.email2 && (
                                <label className="flex items-center gap-1 text-[10px] text-blue-700 font-bold cursor-pointer select-none" title="Faire apparaître cet email dans le CERFA (page 2/15)">
                                  <input
                                    type="radio"
                                    name="cerfaEmailSelection"
                                    checked={!editedProject?.cerfaEmailChoice || editedProject?.cerfaEmailChoice === 'email1'}
                                    onChange={() => handleFieldChange('cerfaEmailChoice', 'email1')}
                                    className="accent-blue-600 cursor-pointer w-3 h-3"
                                  />
                                  <span>CERFA</span>
                                </label>
                              )}
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
                              <label className="text-gray-600 font-semibold truncate">Email 2 <span className="text-gray-400 font-normal">(facultatif)</span></label>
                              {editedProject?.email2 && (
                                <label className="flex items-center gap-1 text-[10px] text-blue-700 font-bold cursor-pointer select-none" title="Faire apparaître cet email dans le CERFA (page 2/15)">
                                  <input
                                    type="radio"
                                    name="cerfaEmailSelection"
                                    checked={editedProject?.cerfaEmailChoice === 'email2'}
                                    onChange={() => handleFieldChange('cerfaEmailChoice', 'email2')}
                                    className="accent-blue-600 cursor-pointer w-3 h-3"
                                  />
                                  <span>CERFA</span>
                                </label>
                              )}
                            </div>
                            <input
                              type="email"
                              value={editedProject?.email2 || ''}
                              onChange={e => handleFieldChange('email2', e.target.value)}
                              placeholder="Ex: contact.societe@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        {editedProject?.email2 && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <span className="font-bold">Email CERFA (page 2/15) :</span>
                            <span className="font-semibold">{editedProject?.cerfaEmailChoice === 'email2' ? (editedProject.email2 || 'Email 2') : (editedProject.email || 'Email 1')}</span>
                          </div>
                        )}
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
                        <label className="text-gray-600 font-semibold block mb-1">Date et Lieu de Naissance</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editedProject?.birthDate || ''}
                            onChange={e => handleFieldChange('birthDate', e.target.value)}
                            placeholder="14/02/1970"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editedProject?.birthCity || ''}
                            onChange={e => handleFieldChange('birthCity', e.target.value)}
                            placeholder="AUCH (32)"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
                    <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-0 overflow-hidden">
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
                                <p className="text-[11px] text-purple-600 font-semibold">Stockage stationnaire d'énergie (BESS)</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              {batteryStorage.quantity || 1} unité(s)
                            </span>
                          </div>

                          {/* Modèle & Presets */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Modèle / Presets BESS</label>
                            <select
                              value={batteryStorage.model || 'CESC Mercury 261'}
                              onChange={(e) => {
                                const val = e.target.value;
                                let unitKw = 125;
                                let unitKwh = 261;
                                let uL = 3.50;
                                let uW = 2.20;
                                let uH = 2.60;

                                if (val.includes('Megapack')) { unitKw = 1900; unitKwh = 3900; uL = 7.10; uW = 1.65; uH = 2.80; }
                                else if (val.includes('LUNA')) { unitKw = 1000; unitKwh = 2000; uL = 6.05; uW = 2.44; uH = 2.59; }
                                else if (val.includes('PowerTitan')) { unitKw = 1375; unitKwh = 2750; uL = 6.05; uW = 2.44; uH = 2.59; }
                                else if (val.includes('BYD')) { unitKw = 1000; unitKwh = 2000; uL = 6.05; uW = 2.44; uH = 2.59; }
                                else if (val.includes('20ft')) { unitKw = 125; unitKwh = 250; uL = 6.05; uW = 2.44; uH = 2.59; }

                                const q = batteryStorage.quantity || 1;
                                setBatteryStorage(prev => ({
                                  ...prev,
                                  model: val,
                                  powerKw: q * unitKw,
                                  capacityKwh: q * unitKwh,
                                  unitLength: uL,
                                  unitWidth: uW,
                                  unitHeight: uH,
                                  dalleLength: Math.max(6.0, Number((q * (uL > 4 ? 4.0 : 3.2) + 3.0).toFixed(1))),
                                  dalleWidth: q > 4 ? 8.0 : 6.0,
                                  footprint: `${(q * (uL > 4 ? 4.0 : 3.2) + 3.0).toFixed(2)}m × 6.00m`
                                }));
                              }}
                              className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400 outline-none"
                            >
                              <option value="CESC Mercury 261">CESC Mercury 261 (125 kW / 261 kWh — 3.50m × 2.20m)</option>
                              <option value="Tesla Megapack 2XL">Tesla Megapack 2XL (1 900 kW / 3 900 kWh — 7.10m × 1.65m)</option>
                              <option value="Huawei LUNA2000-2.0MWH">Huawei LUNA2000 (1 000 kW / 2 000 kWh — 6.05m × 2.44m)</option>
                              <option value="Sungrow PowerTitan">Sungrow PowerTitan (1 375 kW / 2 750 kWh — 6.05m × 2.44m)</option>
                              <option value="BYD Energy City">BYD Energy City (1 000 kW / 2 000 kWh — 6.05m × 2.44m)</option>
                              <option value="Container 20ft Standard">Container 20ft Standard (125 kW / 250 kWh — 6.05m × 2.44m)</option>
                            </select>
                          </div>

                          {/* Nombre de containers */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de containers / packs</label>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 4, 6, 8].map(qty => (
                                <button
                                  key={qty}
                                  type="button"
                                  onClick={() => {
                                    const curQ = batteryStorage.quantity || 1;
                                    const unitKw = Math.round((batteryStorage.powerKw || 500) / curQ) || 125;
                                    const unitKwh = Math.round((batteryStorage.capacityKwh || 1044) / curQ) || 261;
                                    setBatteryStorage(prev => ({
                                      ...prev,
                                      quantity: qty,
                                      powerKw: qty * unitKw,
                                      capacityKwh: qty * unitKwh,
                                      dalleLength: Math.max(6.0, Number((qty * 3.2 + 3.0).toFixed(1))),
                                      footprint: `${(qty * 3.2 + 3.0).toFixed(2)}m × 6.00m`
                                    }));
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    (batteryStorage.quantity || 1) === qty
                                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {qty}x
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
                                step="0.5"
                                value={batteryStorage.dalleLength || Math.max(6.0, Number(((batteryStorage.quantity || 1) * 3.2 + 3.0).toFixed(1)))}
                                onChange={(e) => setBatteryStorage(prev => ({ ...prev, dalleLength: Number(e.target.value) }))}
                                className="w-full text-xs font-bold rounded-lg border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Largeur dalle (m)</label>
                              <input
                                type="number"
                                step="0.5"
                                value={batteryStorage.dalleWidth || 6.0}
                                onChange={(e) => setBatteryStorage(prev => ({ ...prev, dalleWidth: Number(e.target.value) }))}
                                className="w-full text-xs font-bold rounded-lg border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                          </div>

                          {/* Sécurité SDIS & Rétention */}
                          <div className="bg-amber-50/80 rounded-xl p-2.5 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                            <div className="font-bold flex items-center gap-1 text-amber-800">
                              <span>🛡️ Prescriptions SDIS & Sécurité</span>
                            </div>
                            <p className="text-[10px] text-amber-800/90 leading-tight">
                              Bac de rétention étanche intégré, réserve incendie 120m³, coupure d'urgence asservie, distance d'isolement 5m et clôture 2.00m.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Zone Visualizer à droite */}
                      <div className="flex-1 relative h-full rounded-2xl overflow-hidden border border-slate-800 shadow-md">
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
                          batteryStorage={batteryStorage}
                          viewMode={viewMode}
                          showDimensions={config.showDimensions !== false}
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
                const currentPhotos = b.photos || b.pc_photos || {};
                const currentCaptures = b.captures || b.urbanisme_captures || {};
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
                      {(() => {
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
                            const curW = Number(b.width || config.width || 16.4);
                            const curL = Number(b.length || (b.bayCount ? b.bayCount * (b.baySpacing || 7.5) : (config.length || 37.5)));
                            return (
                              <>
                                <Sparkles className="w-4 h-4 text-indigo-600" /> {isDP ? "DP6 — Insertion Paysagère 3D" : "PC6 — Insertion Paysagère 3D"} ({curW.toFixed(1)}m × {curL.toFixed(1)}m)
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
                              onClick={() => setLandscapeModalOpen(true)}
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
                const activeStructures = allConfiguredStructures.filter(str => selectedStructureIds.includes(str.id));
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
                          Activez les visionneuses souhaitées. Chaque cadre correspond à un bâtiment ou une ombrière géoréférencé sur le site du déclarant.
                        </p>
                      </div>

                      {/* Boutons d'activation / désactivation des visionneuses */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {allConfiguredStructures.map((str) => {
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
                                  ? (str.solutionKey === 'ombriere'
                                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                      : 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300')
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
                            onClick={() => setSelectedStructureIds(allConfiguredStructures.map(s => s.id))}
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
                          onClick={() => setSelectedStructureIds(allConfiguredStructures.map(s => s.id))}
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

                          const sLen = Number(str.length || (str.bayCount ? str.bayCount * (str.baySpacing || 7.5) : (config.length || 30)));
                          const sWid = Number(str.width || config.width || 15);
                          const extLeft = str.leftSide !== 'none' ? Number(str.leftWidth || (str.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
                          const extRight = str.rightSide !== 'none' ? Number(str.rightWidth || (str.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
                          const totalWid = sWid + extLeft + extRight;
                          const sRot = Number(str.rotation || 0);
                          const corners = getBuildingCorners(strLat, strLng, sLen, totalWid, sRot);

                          return (
                            <div
                              key={str.id}
                              className={`flex flex-col bg-white border-2 rounded-2xl shadow-xs overflow-hidden transition-colors min-h-[360px] ${
                                str.solutionKey === 'ombriere' ? 'border-emerald-500/80 shadow-emerald-50' : 'border-blue-500/80 shadow-blue-50'
                              }`}
                            >
                              {/* En-tête du Cadre avec bouton de désactivation immédiate */}
                              <div className={`flex items-center justify-between p-2.5 border-b select-none ${
                                str.solutionKey === 'ombriere' ? 'bg-emerald-50/80 border-emerald-100' : 'bg-blue-50/80 border-blue-100'
                              }`}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                    str.solutionKey === 'ombriere' ? 'bg-emerald-200 text-emerald-900' : 'bg-blue-200 text-blue-900'
                                  }`}>
                                    {str.solutionKey === 'ombriere' ? 'Ombrière' : 'Bâtiment'}
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

                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="-90"
                                    max="90"
                                    step="1"
                                    value={sRot}
                                    onChange={(e) => handleMasseRotationUpdate(str.id, Number(e.target.value))}
                                    className="flex-1 h-5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleMasseRotationUpdate(str.id, 0)}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all ${
                                      sRot === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                    title="Plein Sud"
                                  >
                                    0°
                                  </button>
                                </div>

                                {/* Raccourcis d'orientation compacts */}
                                <div className="grid grid-cols-4 gap-1 pt-0.5">
                                  {[
                                    { label: 'Ouest', val: 90 },
                                    { label: 'S-O', val: 45 },
                                    { label: 'S-E', val: -45 },
                                    { label: 'Est', val: -90 },
                                  ].map(({ label, val }) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleMasseRotationUpdate(str.id, val)}
                                      className={`py-0.5 rounded text-[10px] font-bold transition-all border ${
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

                                {/* Boutons d'action droite : Afficher les côtes (style configurateur) & Capturer */}
                                <div className="flex items-center gap-2">
                                  {/* Bouton Toggle Afficher les côtes */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMasseDimensions(str.id)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-2 border shadow-2xs ${
                                      (masseShowDimensions[str.id] !== false && str.masse_show_dimensions !== false)
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title="Afficher ou masquer les traits d'indication de mesure (longueur et largeur)"
                                  >
                                    <span>Afficher les côtes</span>
                                    <div className={`w-7 h-4 rounded-full relative transition-colors ${
                                      (masseShowDimensions[str.id] !== false && str.masse_show_dimensions !== false) ? 'bg-white/30' : 'bg-slate-300'
                                    }`}>
                                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                        (masseShowDimensions[str.id] !== false && str.masse_show_dimensions !== false) ? 'left-3.5' : 'left-0.5'
                                      }`} />
                                    </div>
                                  </button>

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
                                  zoom={Number((masseViewTabs[str.id] === 2 ? str.masse_zoom_2 : str.masse_zoom) || (masseViewTabs[str.id] === 2 ? 16 : 18))}
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
                                  <MapSyncCenter lat={strLat} lng={strLng} disabled={masseViewTabs[str.id] === 2} />
                                  <MasseMapController 
                                    strId={str.id} 
                                    onMapChange={handleMasseMapChange} 
                                    mapInstancesRef={masseMapInstancesRef}
                                    activeView={masseViewTabs[str.id] || 1}
                                  />

                                  {/* Polygone de la structure active de ce cadre (clé dynamique pour mise à jour instantanée) */}
                                  <Polygon
                                    key={`poly-main-${str.id}-${Number(strLat).toFixed(7)}-${Number(strLng).toFixed(7)}-${sRot}-${sLen}-${sWid}`}
                                    positions={corners}
                                    pathOptions={{
                                      color: str.solutionKey === 'ombriere' ? '#059669' : '#2563eb',
                                      fillColor: str.solutionKey === 'ombriere' ? '#10b981' : '#3b82f6',
                                      fillOpacity: 0.35,
                                      dashArray: '5, 4',
                                      weight: 2.5,
                                    }}
                                  >
                                    <Tooltip sticky direction="top" offset={[0, -10]}>
                                      <div className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap bg-white/95 text-slate-800 border border-slate-300 text-center">
                                        {str.name || 'Projet'} ({sRot}°)
                                      </div>
                                    </Tooltip>
                                  </Polygon>

                                  {/* Cotations architecturales le long des côtés extérieurs du rectangle si activées */}
                                  {(masseShowDimensions[str.id] !== false && str.masse_show_dimensions !== false) && (() => {
                                    const dim = getBuildingDimensionLines(strLat, strLng, sLen, totalWid, sRot, 2.8);
                                    const strokeColor = str.solutionKey === 'ombriere' ? '#059669' : '#2563eb';
                                    return (
                                      <>
                                        {/* Longueur */}
                                        <Polyline positions={dim.lenLine} pathOptions={{ color: strokeColor, weight: 2 }} />
                                        <Polyline positions={dim.lenWitness1} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                        <Polyline positions={dim.lenWitness2} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                        <Marker
                                          position={dim.lenTextPos || dim.lenMid}
                                          icon={L.divIcon({
                                            className: 'bg-transparent',
                                            html: `<div style="transform: translate(-50%, -50%) rotate(${(dim.lenAngle || 0).toFixed(1)}deg); font-size: 12px; font-weight: 800; color: ${strokeColor}; white-space: nowrap; text-shadow: 0 0 3px #ffffff, 0 0 2px #ffffff, 0 0 1px #ffffff; pointer-events: none; user-select: none;">${sLen.toFixed(1)} M</div>`,
                                            iconSize: [0, 0]
                                          })}
                                          interactive={false}
                                        />

                                        {/* Largeur */}
                                        <Polyline positions={dim.widLine} pathOptions={{ color: strokeColor, weight: 2 }} />
                                        <Polyline positions={dim.widWitness1} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                        <Polyline positions={dim.widWitness2} pathOptions={{ color: '#94a3b8', weight: 1 }} />
                                        <Marker
                                          position={dim.widTextPos || dim.widMid}
                                          icon={L.divIcon({
                                            className: 'bg-transparent',
                                            html: `<div style="transform: translate(-50%, -50%) rotate(${(dim.widAngle || 0).toFixed(1)}deg); font-size: 12px; font-weight: 800; color: ${strokeColor}; white-space: nowrap; text-shadow: 0 0 3px #ffffff, 0 0 2px #ffffff, 0 0 1px #ffffff; pointer-events: none; user-select: none;">${totalWid.toFixed(1)} M</div>`,
                                            iconSize: [0, 0]
                                          })}
                                          interactive={false}
                                        />
                                      </>
                                    );
                                  })()}

                                  {/* Marqueur déplaçable propre UNIQUEMENT à cette structure */}
                                  <DraggableLocationMarker
                                    lat={strLat}
                                    lng={strLng}
                                    setGps={(newLat, newLng) => handleMasseGpsUpdate(str.id, newLat, newLng)}
                                  />

                                  {/* Rendu dynamique en temps réel des autres structures activées sur la parcelle */}
                                  {activeStructures.filter(other => other.id !== str.id).map(other => {
                                    let oLat = Number(other.lat || (other.gps ? other.gps.split(',')[0] : null));
                                    let oLng = Number(other.lng || (other.gps ? other.gps.split(',')[1] : null));
                                    if (!oLat || !oLng || isNaN(oLat) || isNaN(oLng) || Math.hypot(oLat - refSiteLat, oLng - refSiteLng) > 0.05 || (Math.abs(oLat - 43.5612) < 0.001 && Math.abs(refSiteLat - 43.5612) > 0.001)) {
                                      oLat = refSiteLat + (other.indexInSol || 0) * 0.00015;
                                      oLng = refSiteLng + (other.indexInSol || 0) * 0.00020;
                                    }
                                    const oLen = Number(other.length || (other.bayCount ? other.bayCount * (other.baySpacing || 7.5) : 30));
                                    const oWid = Number(other.width || 15);
                                    const oExtL = other.leftSide !== 'none' ? Number(other.leftWidth || (other.leftSide === 'appentis' ? 9.3 : 4.0)) : 0;
                                    const oExtR = other.rightSide !== 'none' ? Number(other.rightWidth || (other.rightSide === 'appentis' ? 9.3 : 4.0)) : 0;
                                    const oTotalWid = oWid + oExtL + oExtR;
                                    const oRot = Number(other.rotation || 0);
                                    const oCorners = getBuildingCorners(oLat, oLng, oLen, oTotalWid, oRot);

                                    return (
                                      <Polygon
                                        key={`poly-cadre-${str.id}-other-${other.id}-${Number(oLat).toFixed(7)}-${Number(oLng).toFixed(7)}-${oRot}-${oLen}-${oWid}`}
                                        positions={oCorners}
                                        pathOptions={{
                                          color: other.solutionKey === 'ombriere' ? '#059669' : '#2563eb',
                                          fillColor: other.solutionKey === 'ombriere' ? '#10b981' : '#3b82f6',
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
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-extrabold text-sm text-emerald-950">Dossier prêt pour la génération PDF !</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">Cochez les pages et pièces graphiques que vous souhaitez inclure dans le fichier PDF final.</p>
                    </div>
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
                        className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
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
                        className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                      >
                        Tout décocher
                      </button>
                    </div>
                  </div>

                  {/* Sélection interactive des structures et sous-onglets à inclure dans le dossier PDF */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Structures &amp; Sous-onglets à inclure dans le PDF ({selectedStructureIds.length}/{allConfiguredStructures.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStructureIds(allConfiguredStructures.map(s => s.id))}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                        >
                          Toutes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (allConfiguredStructures.length > 0) {
                              setSelectedStructureIds([allConfiguredStructures[0].id]);
                            }
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                        >
                          Seulement la 1ère
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {allConfiguredStructures.map((str) => {
                        const isSelected = selectedStructureIds.includes(str.id);
                        const strLen = Number(str.length || (str.bayCount || 5) * (str.baySpacing || 7.5));
                        const strWid = Number(str.width || 15);
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
                                ? 'bg-white border-blue-600 shadow-xs ring-2 ring-blue-200'
                                : 'bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-85'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  str.solutionKey === 'ombriere' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
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
                              className="w-4 h-4 rounded text-blue-600 pointer-events-none flex-shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sélection interactive des planches */}
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Sélection des pièces et planches du dossier ({type.toUpperCase()})
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {(type === 'pc' ? [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte & synthèse', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'PC1', title: 'Plan de situation', desc: 'IGN cartographique & Satellite', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'PC2', title: 'Plan de masse', desc: 'Emprise de la construction', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'section_notice', code: 'PC3+PC4', title: 'Coupe & Notice', desc: 'Coupe transversale & notice descriptive', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'facades', code: 'PC5', title: 'Façades & Toitures', desc: '5 vues 3D (Sud, Nord, Est, Ouest, Toit)', badge: !!captures?.facade_sud ? 'Prêt' : '3D', color: 'emerald' },
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
                          code: buildings.length > 1 ? (selectedPages.dp_notice !== false ? 'DP3+NOTICE' : 'DP3') : (selectedPages.dp_notice !== false ? 'DP3+NOTICE' : 'DP3'), 
                          title: buildings.length > 1 ? 'Plans en coupe (Multi-ombrières)' : 'Plan en coupe', 
                          desc: buildings.length > 1 ? (selectedPages.dp_notice !== false ? "2 coupes superposées & notice descriptive dédiée" : "2 coupes transversales des ombrières superposées") : (selectedPages.dp_notice !== false ? "Coupe transversale & notice descriptive" : "Coupe transversale de l'ombrière"), 
                          badge: 'Obligatoire', 
                          color: 'indigo',
                          subOption: {
                            key: 'dp_notice',
                            label: buildings.length > 1 ? '+ Notice descriptive (page dédiée)' : '+ Notice descriptive sous la coupe',
                            checked: selectedPages.dp_notice !== false
                          }
                        },
                        { id: 'facades', code: 'DP4', title: 'Façades & Toitures', desc: "5 vues 3D de l'ombrière", badge: '3D', color: 'emerald' },
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
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isChecked ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {item.code}
                                </span>
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
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9.5px] font-bold text-slate-400">{item.badge}</span>
                              <span className={`text-[10px] font-extrabold ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isChecked ? '✓ Inclus' : '✕ Exclu'}
                              </span>
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
                              setEditedProject(prev => ({ ...prev, address: val, clientAddress: val }));
                              handleFieldChange('address', val);
                            }}
                            placeholder="Adresse complète du projet"
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                          />
                        </div>

                        {/* 4. Cadastre (Section, N°, Surface) */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Cadastre</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-bold">Sec.</span>
                              <input
                                type="text"
                                value={editedProject?.cadastre_section || ''}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setEditedProject(prev => ({ ...prev, cadastre_section: val }));
                                  handleFieldChange('cadastre_section', val);
                                }}
                                placeholder="ZI"
                                className="w-14 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-center uppercase"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-bold">N°</span>
                              <input
                                type="text"
                                value={editedProject?.cadastre_numero || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditedProject(prev => ({ ...prev, cadastre_numero: val }));
                                  handleFieldChange('cadastre_numero', val);
                                }}
                                placeholder="0032"
                                className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-[10px] text-gray-400 font-bold">Surf.</span>
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={editedProject?.cadastre_surface || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditedProject(prev => ({ ...prev, cadastre_surface: val }));
                                    handleFieldChange('cadastre_surface', val);
                                  }}
                                  placeholder="1352"
                                  className="w-full px-2 py-1.5 pr-6 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-gray-400 font-medium pointer-events-none">m²</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5. Commune */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold w-24 flex-shrink-0">Commune</span>
                          <input
                            type="text"
                            value={editedProject?.city !== undefined ? editedProject.city : (editedProject?.commune !== undefined ? editedProject.commune : (summary.commune !== '—' ? summary.commune : ''))}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedProject(prev => ({ ...prev, city: val, commune: val, cadastre_commune: val }));
                              handleFieldChange('city', val);
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
                            value={editedProject?.urbanismeType !== undefined ? editedProject.urbanismeType : (editedProject?.typeLabel || summary.type)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedProject(prev => ({ ...prev, urbanismeType: val, typeLabel: val, installationType: val }));
                              handleFieldChange('urbanismeType', val);
                            }}
                            placeholder={isDP ? "Ombrière photovoltaïque" : "Bâtiment et Ombrière"}
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
                        value={editedProject?.objet_travaux !== undefined ? editedProject.objet_travaux : (
                          isDP
                            ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
                            : (isPC
                              ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
                              : "Certificat d'urbanisme opérationnel pour centrale photovoltaïque")
                        )}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedProject(prev => ({ ...prev, objet_travaux: val, description: val }));
                          handleFieldChange('objet_travaux', val);
                        }}
                        placeholder={isDP ? "Ex: Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire" : "Ex: Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"}
                        className="w-full flex-1 min-h-[220px] p-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                      />
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

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
            <button
              onClick={async () => {
                if (step === 0) {
                  onClose();
                } else {
                  if (step === 4) {
                    await captureAllActiveMasseMaps();
                  }
                  setStep(s => Math.max(0, s - 1));
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? 'Annuler' : 'Précédent'}
            </button>

            {step < STEPS.length - 1 ? (
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
                  setStep(s => Math.min(STEPS.length - 1, s + 1));
                }}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm ${dossierInfo.accentColor} hover:opacity-90`}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-60"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération du PDF...</>
                ) : (
                  <><FileCheck className="w-4 h-4" /> Générer le dossier PDF</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
