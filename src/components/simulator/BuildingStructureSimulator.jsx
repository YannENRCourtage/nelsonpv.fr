import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
import { useConfiguratorStore, useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import {
  Download, Maximize, X, Building2, MapPin, Search,
  ChevronRight, ChevronLeft, Sun, Zap, TrendingUp,
  ShieldCheck, RotateCcw, Compass, CheckCircle2, ArrowRight,
  Sliders, Loader2, Leaf, Award, RotateCw, Plus, Minus, Trash2, Copy
} from 'lucide-react';
import BuildingScene from '../configurator/BuildingScene.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';
import { useSimulatorSettingsStore, getProductionForDepartment } from '@/stores/useSimulatorSettingsStore';

// ─── Contrôles de Zoom Flottants Leaflet ─────────────────────────────────────
function CustomMapZoom() {
  const map = useMap();
  return (
    <div className="absolute top-3 left-3 z-[1100] flex flex-col gap-1.5 shadow-md">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black flex items-center justify-center border border-slate-200 shadow-sm transition-all hover:scale-105"
        title="Zoomer (+)"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black flex items-center justify-center border border-slate-200 shadow-sm transition-all hover:scale-105"
        title="Dézoomer (-)"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Trait d'échelle dynamique en bas à gauche au-dessus de l'indicateur de zoom ──
function MapScaleBar() {
  const map = useMap();
  const [scaleData, setScaleData] = useState({ widthPx: 92, label: '20 m' });

  const calculateScale = () => {
    const lat = map.getCenter().lat;
    const zoom = map.getZoom();
    const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);

    const targetPx = 90;
    const rawMeters = targetPx * metersPerPx;
    let roundedMeters = 20;
    if (rawMeters <= 3) roundedMeters = 2;
    else if (rawMeters <= 7) roundedMeters = 5;
    else if (rawMeters <= 15) roundedMeters = 10;
    else if (rawMeters <= 35) roundedMeters = 20;
    else if (rawMeters <= 75) roundedMeters = 50;
    else if (rawMeters <= 150) roundedMeters = 100;
    else if (rawMeters <= 350) roundedMeters = 200;
    else if (rawMeters <= 750) roundedMeters = 500;
    else roundedMeters = Math.round(rawMeters / 500) * 500;

    const actualPx = Math.max(25, roundedMeters / metersPerPx);
    const label = roundedMeters >= 1000 ? `${(roundedMeters / 1000).toFixed(1)} km` : `${roundedMeters} m`;
    setScaleData({ widthPx: actualPx, label });
  };

  useMapEvents({
    zoomend: calculateScale,
    moveend: calculateScale,
    zoom: calculateScale,
  });

  useEffect(() => {
    calculateScale();
  }, []);

  return (
    <div className="absolute bottom-12 left-3 z-[1000] bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-xl text-xs font-bold border border-white/20 shadow-md flex items-center gap-2 pointer-events-none">
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-mono leading-none mb-0.5">{scaleData.label}</span>
        <div className="h-1.5 border-x-2 border-b-2 border-white" style={{ width: `${scaleData.widthPx}px` }} />
      </div>
    </div>
  );
}

// ─── Emprise des bâtiments 100% à l'échelle réelle du terrain selon le zoom ─────
function ScaledBuildingMapOverlay({ buildings = [], activeIndex = 0, onBuildingDrag, onSelectBuilding }) {
  const map = useMap();
  const [scale, setScale] = useState(4.6);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragStartRef = useRef({ x: 0, y: 0, startOffX: 0, startOffY: 0 });

  const updateScale = () => {
    const lat = map.getCenter().lat;
    const zoom = map.getZoom();
    const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
    const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 4.6;
    setScale(pxPerMeter);
  };

  useMapEvents({
    zoomend: updateScale,
    moveend: updateScale,
    zoom: updateScale,
  });

  useEffect(() => {
    updateScale();
  }, []);

  const handlePointerDown = (e, idx, b) => {
    e.stopPropagation();
    if (onSelectBuilding) onSelectBuilding(idx);
    setDraggingIdx(idx);
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const wPx = Math.max(20, Number(b.length || 30) * scale);
    const defaultOffX = Number(b.offsetX !== undefined ? b.offsetX : (buildings.length > 1 ? (idx * (wPx + 40) - ((buildings.length - 1) * (wPx + 40) / 2)) : 0));
    const defaultOffY = Number(b.offsetY || 0);

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startOffX: defaultOffX,
      startOffY: defaultOffY
    };

    const handlePointerMove = (moveEvt) => {
      const curX = moveEvt.clientX || (moveEvt.touches && moveEvt.touches[0]?.clientX) || 0;
      const curY = moveEvt.clientY || (moveEvt.touches && moveEvt.touches[0]?.clientY) || 0;
      const deltaX = curX - dragStartRef.current.x;
      const deltaY = curY - dragStartRef.current.y;
      const newOffX = dragStartRef.current.startOffX + deltaX;
      const newOffY = dragStartRef.current.startOffY + deltaY;
      if (onBuildingDrag) {
        onBuildingDrag(idx, newOffX, newOffY);
      }
    };

    const handlePointerUp = () => {
      setDraggingIdx(null);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
      {buildings.map((b, idx) => {
        const bLength = Number(b.length || 30);
        const bWidth = Number(b.width || 20);
        const bRot = Number(b.rotation || 0);
        const wPx = Math.max(20, bLength * scale);
        const hPx = Math.max(15, bWidth * scale);
        const isAsym = (b.buildingType || '').startsWith('asym') || b.buildingType === 'epona';
        const isActive = idx === activeIndex;
        const offX = Number(b.offsetX !== undefined ? b.offsetX : (buildings.length > 1 ? (idx * (wPx + 40) - ((buildings.length - 1) * (wPx + 40) / 2)) : 0));
        const offY = Number(b.offsetY || 0);

        return (
          <div
            key={b.id || idx}
            onMouseDown={(e) => handlePointerDown(e, idx, b)}
            onTouchStart={(e) => handlePointerDown(e, idx, b)}
            className={`absolute border-2 transition-all flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing select-none ${
              isActive
                ? 'border-blue-400 bg-blue-600/40 shadow-2xl ring-2 ring-amber-400'
                : 'border-cyan-300 bg-cyan-600/30 shadow-lg hover:border-blue-300 hover:bg-blue-600/30'
            }`}
            style={{
              width: `${wPx}px`,
              height: `${hPx}px`,
              transform: `translate(${offX}px, ${offY}px) rotate(${bRot}deg)`,
              transition: draggingIdx === idx ? 'none' : 'border 0.2s, box-shadow 0.2s'
            }}
          >
            {/* Faîtage pointillé orange */}
            <div
              className="absolute inset-x-0 border-t-2 border-dashed border-amber-400 -translate-y-1/2 pointer-events-none"
              style={{
                top: isAsym ? '32%' : '50%'
              }}
            />
            
            {/* Rond avec le numéro du bâtiment ①, ②, etc. */}
            <div className="w-7 h-7 rounded-full bg-white text-slate-900 font-black text-xs border-2 border-slate-900 flex items-center justify-center shadow-xl pointer-events-none z-10">
              {idx + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Indicateur du niveau de zoom en bas à gauche de la carte ───────────────
function ZoomLevelIndicator() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
    zoom() {
      setZoom(map.getZoom());
    }
  });

  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-xl text-xs font-bold border border-white/20 shadow-md flex items-center gap-1.5 pointer-events-none">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Niveau de zoom : {zoom}</span>
    </div>
  );
}

// ─── Tracker de déplacement du centre de la carte ────────────────────────────
function MapCenterTracker({ onCenterChange }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      if (onCenterChange) onCenterChange([c.lat, c.lng]);
    }
  });
  return null;
}

export default function BuildingStructureSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { activeTenantId } = useAuth();
  const isAcama = activeTenantId === 'acama';
  const config = useConfiguratorValues();
  const actions = useConfiguratorActions();
  const { settings } = useSimulatorSettingsStore();
  const structSettings = settings.structure;

  // Vue principale : 'configurator' | 'feasibility'
  const [activeView, setActiveView] = useState('configurator');

  // Tunnel Faisabilité Solaire (Image 4 & 5) : 1. Adresse | 2. Emplacement & Orientation | 3. Rentabilité & Faisabilité
  const [studyStep, setStudyStep] = useState(1);

  // État 3D Visualizer
  const [viewMode, setViewMode] = useState('3D'); // '3D', '2D_FRONT'
  const [isCapturing, setIsCapturing] = useState(false);
  const canvasRef = useRef(null);

  // Étape 1 : Adresse
  const [addressInput, setAddressInput] = useState(
    selectedProject ? [selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', ') : ''
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('32');
  const [cityName, setCityName] = useState('Auch');

  // Étape 2 : Orientation et Gestion Multi-Bâtiments sur le terrain
  const [mapCenter, setMapCenter] = useState([43.646, 0.585]);
  const [buildingRotation, setBuildingRotation] = useState(0);

  const [simBuildings, setSimBuildings] = useState([
    {
      id: 1,
      name: 'Bâtiment 1 (Principal)',
      length: config.length || 30,
      width: (config.width + (config.leftSide !== 'none' ? (config.leftWidth || 0) : 0) + (config.rightSide !== 'none' ? (config.rightWidth || 0) : 0)) || 18.6,
      rotation: 0,
      buildingType: config.buildingType || 'symetrique',
      offsetX: 0,
      offsetY: 0
    }
  ]);
  const [activeBuildingIdx, setActiveBuildingIdx] = useState(0);

  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  useEffect(() => {
    actions.setIsAcama(isAcama);
  }, [isAcama]);

  // Dimensions et Surfaces dynamiques du bâtiment principal 3D
  const buildingLength = config.length || 30;
  const buildingWidth = (config.width
    + (config.leftSide !== 'none' ? (config.leftWidth || 0) : 0)
    + (config.rightSide !== 'none' ? (config.rightWidth || 0) : 0)) || 18.6;

  // Synchronisation continue du bâtiment actif avec le configurateur 3D
  useEffect(() => {
    setSimBuildings(prev => {
      const next = [...prev];
      if (next[activeBuildingIdx]) {
        next[activeBuildingIdx] = {
          ...next[activeBuildingIdx],
          length: buildingLength,
          width: buildingWidth,
          buildingType: config.buildingType || 'symetrique',
          bayCount: config.bayCount,
          baySpacing: config.baySpacing,
          eaveHeight: config.eaveHeight,
          roofPitch: config.roofPitch,
          leftSide: config.leftSide,
          rightSide: config.rightSide,
          leftWidth: config.leftWidth,
          rightWidth: config.rightWidth,
          hasSolar: config.hasSolar
        };
      }
      return next;
    });
  }, [
    buildingLength, buildingWidth, config.buildingType, config.bayCount,
    config.baySpacing, config.eaveHeight, config.roofPitch, config.leftSide,
    config.rightSide, config.leftWidth, config.rightWidth, config.hasSolar,
    activeBuildingIdx
  ]);

  const captureCurrentBuilding3d = () => {
    if (canvasRef.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        if (dataUrl) {
          setBuilding3dSnapshot(dataUrl);
          setSimBuildings(prev => {
            const upd = [...prev];
            if (upd[activeBuildingIdx]) upd[activeBuildingIdx] = { ...upd[activeBuildingIdx], screenshot3d: dataUrl };
            return upd;
          });
        }
      } catch (e) {}
    }
  };

  // Calcul du libellé d'orientation exact en fonction de la rotation en degrés
  const getOrientationLabel = (rotDeg) => {
    const r = Number(rotDeg) || 0;
    const norm = ((((r + 180) % 360) + 360) % 360) - 180;
    if (norm === 0) return 'Plein Sud (0°)';
    if (Math.abs(norm) >= 135) return `Nord (${r > 0 ? `+${r}` : r}°)`;
    if (norm > 45) {
      if (norm >= 85 && norm <= 95) return `Plein Ouest (+${r}°)`;
      return `Ouest (+${r}°)`;
    }
    if (norm > 0 && norm <= 45) return `Sud-Ouest (+${r}°)`;
    if (norm < -45) {
      if (norm <= -85 && norm >= -95) return `Plein Est (${r}°)`;
      return `Est (${r}°)`;
    }
    if (norm < 0 && norm >= -45) return `Sud-Est (${r}°)`;
    return `Plein Sud (0°)`;
  };

  const getOrientationName = (rotDeg) => {
    const r = Number(rotDeg) || 0;
    const norm = ((((r + 180) % 360) + 360) % 360) - 180;
    if (norm === 0) return 'Plein Sud';
    if (Math.abs(norm) >= 135) return 'Nord';
    if (norm > 45) return 'Ouest';
    if (norm > 0 && norm <= 45) return 'Sud-Ouest';
    if (norm < -45) return 'Est';
    if (norm < 0 && norm >= -45) return 'Sud-Est';
    return 'Plein Sud';
  };

  const handleSelectBuilding = (index) => {
    if (index === activeBuildingIdx || !simBuildings[index]) return;
    captureCurrentBuilding3d();
    setActiveBuildingIdx(index);
    const target = simBuildings[index];
    useConfiguratorStore.getState().loadBuildingConfig(target);
  };

  const handleAddBuilding = () => {
    captureCurrentBuilding3d();
    const nextIdx = simBuildings.length + 1;
    const offset = (simBuildings.length * 60) - (simBuildings.length * 30);
    const newB = {
      id: `bat-${nextIdx}-${Date.now()}`,
      name: `Bâtiment ${nextIdx}`,
      length: 30,
      width: 20,
      rotation: 0,
      buildingType: 'asymetrique_1',
      offsetX: offset,
      offsetY: 0,
      bayCount: 5,
      baySpacing: 6,
      eaveHeight: 4,
      roofPitch: 15,
      leftSide: 'none',
      rightSide: 'none',
      leftWidth: 0,
      rightWidth: 0,
      hasSolar: true
    };
    const updated = [...simBuildings, newB];
    setSimBuildings(updated);
    setActiveBuildingIdx(updated.length - 1);
    useConfiguratorStore.getState().loadBuildingConfig(newB);
  };

  const handleDuplicateBuilding = () => {
    captureCurrentBuilding3d();
    const current = simBuildings[activeBuildingIdx] || simBuildings[0];
    const nextIdx = simBuildings.length + 1;
    const newB = {
      ...current,
      id: `bat-${nextIdx}-${Date.now()}`,
      name: `Bâtiment ${nextIdx}`,
      offsetX: (current.offsetX || 0) + 60,
      offsetY: (current.offsetY || 0) + 30
    };
    const updated = [...simBuildings, newB];
    setSimBuildings(updated);
    setActiveBuildingIdx(updated.length - 1);
    useConfiguratorStore.getState().loadBuildingConfig(newB);
  };

  const handleRemoveBuilding = (idx, e) => {
    if (e) e.stopPropagation();
    if (simBuildings.length <= 1) return;
    const updated = simBuildings.filter((_, i) => i !== idx);
    setSimBuildings(updated);
    setActiveBuildingIdx(0);
    if (updated[0]) {
      useConfiguratorStore.getState().loadBuildingConfig(updated[0]);
    }
  };

  const handleUpdateActiveBuilding = (updates) => {
    setSimBuildings(prev => {
      const next = [...prev];
      if (next[activeBuildingIdx]) {
        next[activeBuildingIdx] = { ...next[activeBuildingIdx], ...updates };
      }
      return next;
    });
    if (updates.rotation !== undefined) {
      setBuildingRotation(updates.rotation);
    }
  };

  // Calculs globaux consolidés multi-bâtiments
  const totalFloorArea = useMemo(() => {
    return simBuildings.reduce((acc, b) => acc + Math.round((Number(b.length) || 30) * (Number(b.width) || 20)), 0);
  }, [simBuildings]);

  const floorArea = totalFloorArea;

  const roofPitch = config.roofPitch || 10;
  const totalRoofArea = useMemo(() => {
    return simBuildings.reduce((acc, b) => {
      const pitchRad = (roofPitch * Math.PI) / 180;
      const bArea = (Number(b.length) || 30) * (Number(b.width) || 20);
      return acc + Math.round(bArea / Math.cos(pitchRad));
    }, 0);
  }, [simBuildings, roofPitch]);

  const roofArea = totalRoofArea;

  const installedKwc = useMemo(() => {
    return Math.round((roofArea * 0.20) * 100) / 100;
  }, [roofArea]);

  const regionalBaseYield = useMemo(() => {
    return getProductionForDepartment(departmentCode);
  }, [departmentCode]);

  const annualProductionKwh = useMemo(() => {
    return Math.round(installedKwc * regionalBaseYield);
  }, [installedKwc, regionalBaseYield]);

  // Modèle économique Gros-Œuvre & PV multi-bâtiments
  const charpenteCost = Math.round(floorArea * (structSettings.charpenteCostM2 || 75));
  const couvertureCost = Math.round(roofArea * (structSettings.couvertureBacAcierM2 || 28));
  const fondationsCost = Math.round(floorArea * (structSettings.fondationsCostM2 || 25));
  const totalBuildingCost = charpenteCost + couvertureCost + fondationsCost;

  const pvInstallationCost = Math.round(installedKwc * 1000 * (structSettings.pvIntegrationPerWc || 0.55) + 15000);
  const totalProjectInvestment = totalBuildingCost + pvInstallationCost;

  const soulteInvestisseur = Math.round(installedKwc * 180);
  const resteACharge = Math.max(0, totalBuildingCost - soulteInvestisseur);

  const tarifAchatKwh = 0.1141; // Tarif EDF OA standard 100-500 kWc
  const annualGrossRevenue = Math.round(annualProductionKwh * tarifAchatKwh);
  const annualOperatingCost = Math.round(installedKwc * 22); // TURPE + maintenance
  const annualNetRevenue = annualGrossRevenue - annualOperatingCost;

  // Projection financière sur 30 ans avec dégradation -1%/an et revalorisation tarif +2%/an (Image 5)
  const financialProjection30Years = useMemo(() => {
    const data = [];
    let cumul = -totalProjectInvestment;
    let cumul10 = 0;
    let cumul20 = 0;
    let cumul30 = 0;

    for (let yr = 1; yr <= 30; yr++) {
      const panelEfficiency = Math.pow(0.99, yr - 1);
      const tariffIndex = Math.pow(1.02, yr - 1);
      const yearRevenue = Math.round((annualGrossRevenue * panelEfficiency * tariffIndex) - annualOperatingCost);

      cumul += yearRevenue;
      if (yr <= 10) cumul10 += yearRevenue;
      if (yr <= 20) cumul20 += yearRevenue;
      if (yr <= 30) cumul30 += yearRevenue;

      data.push({
        year: `${yr}`,
        gain: Math.round(cumul),
        yearRevenue,
        isPayback: cumul >= 0
      });
    }

    const paybackItem = data.find(d => d.gain >= 0);
    const paybackYears = paybackItem ? paybackItem.year : '15.7';

    return {
      data,
      cumul10,
      cumul20,
      cumul30,
      paybackYears
    };
  }, [totalProjectInvestment, annualGrossRevenue, annualOperatingCost]);

  // Données environnementales
  const co2AvoidedTonsPerYear = Math.round((annualProductionKwh * 0.065) / 1000);
  const equivalentHouseholds = Math.round(annualProductionKwh / 4500);

  // Recherche BAN
  useEffect(() => {
    if (isAddressSelected || !addressInput || addressInput.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressInput)}&limit=5`);
        const data = await resp.json();
        if (data && data.features) setSuggestions(data.features);
      } catch (err) {
        console.error('Erreur BAN:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [addressInput, isAddressSelected]);

  const handleSelectSuggestion = (feat) => {
    const label = feat.properties.label;
    const [lng, lat] = feat.geometry.coordinates;
    const postcode = feat.properties.postcode || '';
    const dept = postcode.substring(0, 2);
    const city = feat.properties.city || '';

    setAddressInput(label);
    setIsAddressSelected(true);
    setMapCenter([lat, lng]);
    if (dept) setDepartmentCode(dept);
    if (city) setCityName(city);
    setSuggestions([]);
  };

  const [building3dSnapshot, setBuilding3dSnapshot] = useState(null);

  const capture3dSnapshot = useCallback(async () => {
    if (!canvasRef.current) return null;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setBuilding3dSnapshot(dataUrl);
      return dataUrl;
    } catch (e) {
      console.warn('Erreur capture 3D:', e);
      return null;
    }
  }, []);

  const ensureMapSnapshot = async () => {
    const snapshot = await generateSatelliteSnapshot({
      center: mapCenter,
      polygonPoints: [],
      buildings: simBuildings,
      width: 800,
      height: 480,
      zoom: 19
    });
    if (snapshot) setMapScreenshotDataUrl(snapshot);
    return snapshot;
  };

  useEffect(() => {
    if (mapCenter) {
      ensureMapSnapshot();
    }
  }, [mapCenter, simBuildings, config.buildingType]);

  // Nom du client dynamique
  const [clientNameInput, setClientNameInput] = useState(
    selectedProject?.name || selectedProject?.lastName || ''
  );

  // Synchronisation avec l'état global parent
  useEffect(() => {
    if (onStateUpdate) {
      const activeRot = simBuildings[activeBuildingIdx]?.rotation || 0;
      onStateUpdate({
        type: 'structure_metallique',
        title: `Hangar Solaire ${simBuildings.length > 1 ? `${simBuildings.length} Bâtiments (${totalFloorArea} m²)` : `${buildingLength.toFixed(1)}m × ${buildingWidth.toFixed(1)}m (${totalFloorArea} m²)`} (${installedKwc} kWc) — ${clientNameInput || cityName || 'Projet'}`,
        clientName: clientNameInput || cityName,
        address: addressInput,
        cityName,
        departmentCode,
        length: buildingLength,
        width: buildingWidth,
        floorArea: totalFloorArea,
        roofArea: totalRoofArea,
        kwc: installedKwc,
        annualProductionKwh,
        totalBuildingCost,
        totalInvestmentHT: totalProjectInvestment,
        soulteInvestisseur,
        resteACharge,
        annualBenefitYear1: annualNetRevenue,
        paybackYear: financialProjection30Years.paybackYears,
        totalGains30Years: financialProjection30Years.cumul30,
        cumul10: financialProjection30Years.cumul10,
        cumul20: financialProjection30Years.cumul20,
        cumul30: financialProjection30Years.cumul30,
        building3dScreenshot: building3dSnapshot,
        mapScreenshot: mapScreenshotDataUrl,
        buildings: simBuildings,
        orientationLabel: getOrientationLabel(activeRot),
        pitch: config.roofPitch || 15
      });
    }
  }, [
    buildingLength, buildingWidth, totalFloorArea, totalRoofArea, installedKwc,
    annualProductionKwh, totalBuildingCost, totalProjectInvestment,
    soulteInvestisseur, resteACharge, annualNetRevenue,
    financialProjection30Years, clientNameInput, addressInput, cityName,
    departmentCode, building3dSnapshot, mapScreenshotDataUrl, simBuildings, activeBuildingIdx, onStateUpdate
  ]);

  return (
    <div className="w-full space-y-4">
      
      {/* ─── BANDEAU SUPÉRIEUR (DESIGN ENR COURTAGE) ──────────────────────── */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Structure Métallique &amp; Hangar Solaire
            </h2>
            <p className="text-xs text-slate-300">
              Dimensionnement 3D ({buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m — {floorArea} m²) &amp; Faisabilité Photovoltaïque
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20">
            <span className="text-xs text-amber-300 font-bold">Client :</span>
            <input
              type="text"
              value={clientNameInput}
              onChange={(e) => setClientNameInput(e.target.value)}
              placeholder="Nom du client..."
              className="bg-transparent text-xs font-extrabold text-white placeholder:text-white/50 focus:outline-none w-32 sm:w-40 border-b border-white/30 focus:border-amber-400 transition-all"
            />
          </div>

          {/* 2 Grands Onglets de Navigation */}
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveView('configurator')}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                activeView === 'configurator'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>1. Configurateur 3D</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await capture3dSnapshot();
                setActiveView('feasibility');
              }}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                activeView === 'feasibility'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>2. Étude Faisabilité Solaire</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          VUE 1 : CONFIGURATEUR 3D EXACT + SYNTHÈSE DE LA STRUCTURE (IMAGE 5)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'configurator' && (
        <div className="space-y-4">
          
          {/* Barre d'onglets multi-bâtiments (identique à l'étape Cotations & Côtes) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1 shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" /> Bâtiments :
              </span>
              {simBuildings.map((b, idx) => (
                <div key={b.id || idx} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectBuilding(idx)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border shadow-2xs ${
                      activeBuildingIdx === idx
                        ? 'bg-[#0e2b4d] text-white border-slate-800 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{b.name || `Bâtiment ${idx + 1}`}</span>
                    <span className="text-[10px] opacity-75">
                      ({Number(b.length || 30).toFixed(1)}m × {Number(b.width || 20).toFixed(1)}m)
                    </span>
                  </button>
                  {simBuildings.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBuilding(idx, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-0.5"
                      title="Supprimer ce bâtiment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDuplicateBuilding}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                title="Dupliquer le bâtiment actuel"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Dupliquer</span>
              </button>
              <button
                type="button"
                onClick={handleAddBuilding}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter un bâtiment</span>
              </button>
            </div>
          </div>

          {/* Visionneuse 3D et Panneau de Contrôle Pleine Largeur */}
          <div className="w-full h-[580px] bg-gradient-to-b from-slate-50 to-slate-200 relative flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-slate-200 shadow-xl">
            
            {/* Panneau de contrôle gauche */}
            <div className="relative lg:absolute top-0 lg:top-4 left-0 lg:left-4 z-20 w-full lg:w-[420px] max-h-[40vh] lg:max-h-[calc(580px-2rem)] overflow-y-auto p-4 lg:p-0">
              <ControlPanel isAcama={isAcama} selectedProject={selectedProject} />
            </div>

            {/* Scène 3D */}
            <div id="3d-simulator-view-container" className="flex-1 lg:ml-[440px] relative h-full isolate">
              <div className="w-full h-full">
                <BuildingScene
                  ref={canvasRef}
                  viewMode={viewMode}
                  isCapturing={isCapturing}
                />
              </div>

              {/* Badges Info (Haut Gauche) */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 w-fit pointer-events-auto">
                <div className="bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl shadow-md border border-slate-200">
                  <span className="text-slate-800 font-black text-sm whitespace-nowrap">
                    {buildingLength.toFixed(2)}m x {buildingWidth.toFixed(2)}m — {floorArea} m²
                  </span>
                </div>

                {config.hasSolar && (
                  <div className="bg-yellow-50/95 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-yellow-200">
                    <span className="text-yellow-800 font-bold text-xs whitespace-nowrap">
                      ⚡ {installedKwc} kWc
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={actions.toggleDimensions}
                  className={`w-full px-3.5 py-2 rounded-xl font-semibold text-xs shadow border transition-all flex items-center justify-between gap-2.5 ${
                    config.showDimensions ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Afficher les côtes</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${config.showDimensions ? 'bg-white/30' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config.showDimensions ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Contrôles Vue 3D / 2D / Téléchargement (SANS doublon de bouton offre) */}
              <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 p-2 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-slate-200 pointer-events-auto">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('3D')}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                      viewMode === '3D' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Vue 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('2D_FRONT')}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                      viewMode === '2D_FRONT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Vue 2D
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!canvasRef.current) return;
                    setIsCapturing(true);
                    await new Promise(r => setTimeout(r, 250));
                    const imgData = canvasRef.current.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `vue_${viewMode === '3D' ? '3d' : '2d'}_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setIsCapturing(false);
                  }}
                  className="w-full bg-white text-slate-700 font-bold py-2 px-3 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs"
                  title="Télécharger l'image 3D"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger image</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const elem = document.getElementById('3d-simulator-view-container');
                    if (!document.fullscreenElement) {
                      elem?.requestFullscreen();
                    } else {
                      document.exitFullscreen();
                    }
                  }}
                  className="w-full bg-white text-slate-700 font-bold py-2 px-3 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs"
                  title="Plein écran"
                >
                  <Maximize className="w-4 h-4" />
                  <span>Plein écran</span>
                </button>
              </div>

              {/* Encart flottant "Synthèse de la structure" en bas à droite de la visionneuse 3D (agrandi de 15% avec typographie renforcée) */}
              <div className="absolute bottom-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-6 rounded-3xl border border-white/20 shadow-2xl w-96 max-w-md pointer-events-auto space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                  <span className="font-black text-amber-400 uppercase text-xs tracking-wider">Synthèse Structure &amp; PV</span>
                  <span className="font-black text-sm text-white">{buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m</span>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">Surface au sol</span>
                    <strong className="text-white font-black text-base">{floorArea} m²</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">Centrale PV</span>
                    <strong className="text-blue-400 font-black text-base">{installedKwc} kWc</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">Budget Gros-Œuvre</span>
                    <strong className="text-white font-black text-base">{totalBuildingCost.toLocaleString('fr-FR')} €</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">Reste à charge</span>
                    <strong className="text-purple-300 font-black text-base">{resteACharge.toLocaleString('fr-FR')} €</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── ENCART SYNTHÈSE DE LA STRUCTURE (IMAGE 5) — TYPOGRAPHIE AUGMENTÉE DE 2PT ─── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Synthèse de la Structure &amp; Budget Gros-Œuvre
                </h3>
                <p className="text-xs text-slate-500">
                  Caractéristiques techniques et valorisation photovoltaïque du bâtiment configuré.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await capture3dSnapshot();
                  setActiveView('feasibility');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-105"
              >
                <span>Passer à l'étude de faisabilité solaire</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">Dimensions</span>
                <strong className="text-base font-black text-slate-900">{buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m</strong>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">Surface au Sol</span>
                <strong className="text-base font-black text-slate-900">{floorArea} m²</strong>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">Puissance Solaire</span>
                <strong className="text-base font-black text-blue-600">{installedKwc} kWc</strong>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">Budget Gros-Œuvre</span>
                <strong className="text-base font-black text-slate-900">{totalBuildingCost.toLocaleString('fr-FR')} € HT</strong>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase block">Soulte Tiers-Invest.</span>
                <strong className="text-base font-black text-emerald-700">+{soulteInvestisseur.toLocaleString('fr-FR')} €</strong>
              </div>

              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
                <span className="text-xs font-bold text-purple-800 uppercase block">Reste à Charge</span>
                <strong className="text-base font-black text-purple-700">{resteACharge.toLocaleString('fr-FR')} € HT</strong>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VUE 2 : ÉTUDE DE FAISABILITÉ & RENTABILITÉ SOLAIRE (IMAGE 3, 4 & 5)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'feasibility' && (
        <div className="space-y-4">
          
          {/* Header Tunnel Faisabilité (Image 4) */}
          <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-xl text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Étude de faisabilité &amp; <span className="text-amber-400">Rentabilité Solaire</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mx-auto">
              Renseignez l'adresse de votre terrain pour simuler la disposition satellite exacte de votre bâtiment ({buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m) et calculer vos revenus photovoltaïques.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              {[
                { step: 1, label: '1. Adresse' },
                { step: 2, label: '2. Emplacement & Orientation' },
                { step: 3, label: '3. Rentabilité & Faisabilité' }
              ].map((item) => {
                const isCurrent = studyStep === item.step;
                const isDone = studyStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setStudyStep(item.step)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
                        : isDone
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ═══ ÉTAPE 1 : ADRESSE DU TERRAIN ═══ */}
            {studyStep === 1 && (
              <motion.div
                key="study-step-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center max-w-2xl mx-auto"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <MapPin className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Où se situe votre bâtiment ou terrain ?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Entrez la commune, le code postal ou l'adresse précise du terrain d'accueil.
                  </p>
                </div>

                <div className="relative text-left max-w-md mx-auto">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => {
                        setAddressInput(e.target.value);
                        setIsAddressSelected(false);
                      }}
                      placeholder="Ex: 52 Rue de la Victoire, Paris ou Rue de la Paix, Lyon..."
                      className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                    {isSearchingAddress && (
                      <Loader2 className="w-5 h-5 absolute right-4 top-3.5 text-amber-600 animate-spin" />
                    )}
                  </div>

                  {!isAddressSelected && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 text-xs font-semibold text-slate-800"
                        >
                          <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{s.properties.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setStudyStep(2)}
                    className="px-8 py-3.5 rounded-2xl bg-[#0e2b4d] hover:bg-slate-900 text-white font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                  >
                    Valider l'adresse &amp; passer à l'orientation
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ ÉTAPE 2 : IMPLANTATION SATELLITE & ORIENTATION (IMAGES 3 & 4) ═══ */}
            {studyStep === 2 && (
              <motion.div
                key="study-step-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Colonne Gauche : Paramètres d'Orientation & Spécifications (Typo agrandie) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">
                        Implantation Satellite
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {simBuildings.length > 1
                          ? `${simBuildings.length} bâtiments configurés (${totalFloorArea} m² au total). Ajustez la rotation de chaque bâtiment ou dupliquez-les sur votre parcelle.`
                          : `L'emprise (${buildingLength.toFixed(1)}m × ${buildingWidth.toFixed(1)}m — ${totalFloorArea} m²) reste au centre. Déplacez la carte ci-contre pour caler votre parcelle sous le bâtiment.`}
                      </p>
                    </div>

                    {/* Gestion Multi-Bâtiments (Tabs + Actions) */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                          🏢 Bâtiments ({simBuildings.length})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleDuplicateBuilding}
                            className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-xs flex items-center gap-1"
                            title="Dupliquer le bâtiment sélectionné"
                          >
                            <span>📋 Dupliquer</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddBuilding}
                            className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-xs flex items-center gap-1"
                            title="Ajouter un nouveau bâtiment"
                          >
                            <span>+ Ajouter</span>
                          </button>
                        </div>
                      </div>

                      {/* Onglets Bâtiments */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {simBuildings.map((b, idx) => {
                          const isActive = idx === activeBuildingIdx;
                          return (
                            <div
                              key={b.id || idx}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                isActive
                                  ? 'bg-[#0e2b4d] text-white shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                              onClick={() => handleSelectBuilding(idx)}
                            >
                              <span>{b.name || `Bâtiment ${idx + 1}`}</span>
                              {simBuildings.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveBuilding(idx, e)}
                                  className="ml-1 text-red-400 hover:text-red-600 p-0.5"
                                  title="Supprimer ce bâtiment"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Curseur et Boutons d'Orientation du Bâtiment Actif */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-5 h-5 text-blue-600" />
                          Orientation {simBuildings[activeBuildingIdx]?.name ? `(${simBuildings[activeBuildingIdx].name})` : ''}
                        </span>
                        <span className="text-blue-600 font-black text-base">
                          {simBuildings[activeBuildingIdx]?.rotation || 0}°
                        </span>
                      </div>

                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="1"
                        value={simBuildings[activeBuildingIdx]?.rotation || 0}
                        onChange={(e) => handleUpdateActiveBuilding({ rotation: Number(e.target.value) })}
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center text-sm font-bold text-blue-900">
                        {getOrientationLabel(simBuildings[activeBuildingIdx]?.rotation || 0)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateActiveBuilding({ rotation: 45 })}
                          className={`py-2 rounded-xl text-xs font-black transition-all border ${
                            (simBuildings[activeBuildingIdx]?.rotation || 0) === 45 ? 'bg-[#0e2b4d] text-white' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Sud-Ouest (45°)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateActiveBuilding({ rotation: 0 })}
                          className={`py-2 rounded-xl text-xs font-black transition-all border ${
                            (simBuildings[activeBuildingIdx]?.rotation || 0) === 0 ? 'bg-[#0e2b4d] text-white' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Sud (0°)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateActiveBuilding({ rotation: -45 })}
                          className={`py-2 rounded-xl text-xs font-black transition-all border ${
                            (simBuildings[activeBuildingIdx]?.rotation || 0) === -45 ? 'bg-[#0e2b4d] text-white' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Sud-Est (-45°)
                        </button>
                      </div>
                    </div>

                    {/* Spécifications Charpente */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-sm">
                      <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs border-b border-slate-200 pb-1.5">
                        Spécifications Globales ({simBuildings.length} bât.) :
                      </h4>
                      {simBuildings.map((b, idx) => (
                        <div key={b.id || idx} className="flex justify-between py-0.5 text-xs text-slate-700">
                          <span>{b.name || `Bâtiment ${idx + 1}`} :</span>
                          <strong className="text-slate-900">{Number(b.length || 30).toFixed(1)}m × {Number(b.width || 20).toFixed(1)}m ({Math.round((Number(b.length) || 30) * (Number(b.width) || 20))} m²)</strong>
                        </div>
                      ))}
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between py-1">
                        <span className="text-slate-600 font-medium">Surface totale cumulée :</span>
                        <strong className="text-slate-900 font-black">{totalFloorArea} m²</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 font-medium">Puissance Solaire Globale :</span>
                        <strong className="text-blue-600 font-black text-base">{installedKwc} kWc</strong>
                      </div>
                    </div>

                    {/* Actions de navigation */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStudyStep(1)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Adresse
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await ensureMapSnapshot();
                          setStudyStep(3);
                        }}
                        className="flex-1 px-5 py-3 rounded-2xl bg-[#0e2b4d] hover:bg-black text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-105"
                      >
                        <span>Calculer la rentabilité</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Colonne Droite : Carte Satellite & Emprise Rotative du Bâtiment (Image 3 & 4) */}
                  <div className="lg:col-span-8 space-y-2">
                    
                    <div className="relative w-full h-[480px] sm:h-[580px] rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900" ref={mapContainerRef}>
                      
                      {/* Encart guide flottant */}
                      <div className="absolute top-3 left-16 right-3 z-[1100] bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-2xl border border-white/20 shadow-md text-center">
                        + Glissez la carte pour ajuster l'emplacement de votre parcelle sous les bâtiments
                      </div>

                      <MapContainer
                        center={mapCenter}
                        zoom={19}
                        maxZoom={23}
                        scrollWheelZoom={true}
                        doubleClickZoom={true}
                        touchZoom={true}
                        zoomControl={false}
                        className="w-full h-full"
                      >
                        <CustomMapZoom />
                        <MapCenterTracker onCenterChange={setMapCenter} />
                        <MapScaleBar />
                        <ZoomLevelIndicator />
                        <ScaledBuildingMapOverlay
                          buildings={simBuildings}
                          activeIndex={activeBuildingIdx}
                          onBuildingDrag={(idx, offX, offY) => {
                            setSimBuildings(prev => {
                              const next = [...prev];
                              if (next[idx]) next[idx] = { ...next[idx], offsetX: offX, offsetY: offY };
                              return next;
                            });
                          }}
                          onSelectBuilding={(idx) => {
                            setActiveBuildingIdx(idx);
                            const target = simBuildings[idx];
                            if (target) useConfiguratorStore.getState().loadBuildingConfig(target);
                          }}
                        />
                        <TileLayer
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          maxNativeZoom={19}
                          maxZoom={23}
                          crossOrigin="anonymous"
                          attribution="Esri, Maxar, Earthstar Geographics"
                        />
                      </MapContainer>
                    </div>

                    {/* Badge adresse sous le bâtiment */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-900 shadow-2xs">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold uppercase text-[10px] text-emerald-800">Adresse actuelle sous le bâtiment :</span>
                      <strong className="truncate">{addressInput || 'Parcelle sélectionnée'}</strong>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* ═══ ÉTAPE 3 : RENTABILITÉ & ÉLÉMENTS FINANCIERS COMPLETS (IMAGE 5) ═══ */}
            {studyStep === 3 && (
              <motion.div
                key="study-step-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* 3 Cartes Principales (Image 5) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
                    <span className="text-xs font-black uppercase text-blue-300 tracking-wider">
                      Investissement Global
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-white">{totalProjectInvestment.toLocaleString('fr-FR')}</span>
                      <span className="text-base font-bold text-slate-300 ml-1">€ HT</span>
                    </div>
                    <span className="text-xs text-slate-300 font-semibold">Total Structure &amp; PV</span>
                  </div>

                  <div className="bg-amber-950/80 border border-amber-800 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
                    <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                      Performance Financière (TRI)
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-amber-400">5.9 %</span>
                      <span className="text-base font-bold text-amber-200 ml-1">/ an</span>
                    </div>
                    <span className="text-xs text-amber-200 font-semibold">Rentabilité nette du capital</span>
                  </div>

                  <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                      Amortissement
                    </span>
                    <div className="my-2">
                      <span className="text-3xl font-black text-emerald-400">{financialProjection30Years.paybackYears}</span>
                      <span className="text-base font-bold text-emerald-200 ml-1">ans</span>
                    </div>
                    <span className="text-xs text-emerald-200 font-semibold">Amortissement rapide du capital</span>
                  </div>
                </div>

                {/* ─── SECTION REVENUS CUMULÉS SUR 30 ANS (IMAGE 5) ───────────── */}
                <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-xl space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Revenus cumulés de la revente d'électricité
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Projection sur 30 ans (intègre une dégradation panneaux de -1%/an et une revalorisation tarifaire de +2%/an)
                    </p>
                  </div>

                  {/* 3 Cartes Milestones 10 ans / 20 ans / 30 ans */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                      <span className="text-xs font-bold text-slate-300 block mb-1">sur 10 ans</span>
                      <span className="text-2xl font-black text-white">{financialProjection30Years.cumul10.toLocaleString('fr-FR')} €</span>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                      <span className="text-xs font-bold text-slate-300 block mb-1">sur 20 ans</span>
                      <span className="text-2xl font-black text-white">{financialProjection30Years.cumul20.toLocaleString('fr-FR')} €</span>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                      <span className="text-xs font-bold text-slate-300 block mb-1">sur 30 ans</span>
                      <span className="text-2xl font-black text-emerald-400">{financialProjection30Years.cumul30.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>

                  {/* Graphique 30 Ans avec Barres Bicolores (Bleu = Amortissement / Vert = Bénéfices Post-ROI) */}
                  <div className="space-y-2">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financialProjection30Years.data} margin={{ top: 20, right: 15, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                          <XAxis dataKey="year" tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 'bold' }} />
                          <YAxis tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 'bold' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                          <Tooltip
                            formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} €`, 'Cumul net']}
                            labelFormatter={(yr) => `Année ${yr}`}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#ffffff', fontSize: 12 }}
                          />
                          <ReferenceLine
                            x={financialProjection30Years.paybackYears}
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            strokeWidth={2.5}
                            label={{
                              value: `Amorti en ${financialProjection30Years.paybackYears} ans`,
                              fill: '#ef4444',
                              position: 'top',
                              fontSize: 13,
                              fontWeight: 'bold'
                            }}
                          />
                          <Bar dataKey="gain" radius={[4, 4, 0, 0]}>
                            {financialProjection30Years.data.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.isPayback ? '#10b981' : '#3b82f6'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-center gap-6 text-xs text-slate-300 pt-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                        Amortissement en cours
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                        Bénéfices nets (Post ROI)
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── SECTION IMPACT SUR L'ENVIRONNEMENT (IMAGE 5) ───────────── */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-3">
                  <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    Votre impact sur l'environnement
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs">
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1">CO₂ Évité</span>
                      <span className="text-2xl font-black text-emerald-700">{co2AvoidedTonsPerYear} tonnes / an</span>
                      <p className="text-xs text-slate-400 mt-0.5">Émissions évitées grâce à l'énergie solaire</p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs">
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Équivalent Foyers</span>
                      <span className="text-2xl font-black text-teal-700">{equivalentHouseholds} foyers alimentés</span>
                      <p className="text-xs text-slate-400 mt-0.5">Consommation annuelle équivalente</p>
                    </div>
                  </div>
                </div>

                {/* Bouton retour 3D */}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setActiveView('configurator')}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Revenir au configurateur 3D
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
