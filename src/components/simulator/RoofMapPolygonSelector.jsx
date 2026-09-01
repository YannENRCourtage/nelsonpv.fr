import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, Plus, Minus, Compass } from 'lucide-react';

// ─── Calcul de Surface Géodésique (Formule Sphérique WGS84) ──────────────────
export function calculatePolygonArea(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const EARTH_RADIUS = 6378137;
  let total = 0;
  const numPoints = latlngs.length;

  for (let i = 0; i < numPoints; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % numPoints];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;
    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  const area = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2.0);
  return Math.round(area);
}

// ─── Données et coefficients solaires par orientation ─────────────────────────
export const ORIENTATION_COEFFS_MAP = {
  south: 1.000,
  south_east: 0.950,
  south_west: 0.950,
  east: 0.850,
  west: 0.850,
  north_east: 0.800,
  north_west: 0.800,
  north: 0.750
};

export function getOrientationDetailsFromAngle(deg) {
  let normalized = Math.round(deg);
  while (normalized > 180) normalized -= 360;
  while (normalized <= -180) normalized += 360;

  let orientationKey = 'south';
  let orientationLabel = 'Plein Sud';

  if (Math.abs(normalized) <= 22.5) {
    orientationKey = 'south';
    orientationLabel = 'Plein Sud';
  } else if (normalized > 22.5 && normalized < 67.5) {
    orientationKey = 'south_west';
    orientationLabel = 'Sud-Ouest';
  } else if (normalized >= 67.5 && normalized <= 112.5) {
    orientationKey = 'west';
    orientationLabel = 'Plein Ouest';
  } else if (normalized > 112.5 && normalized < 157.5) {
    orientationKey = 'north_west';
    orientationLabel = 'Nord-Ouest';
  } else if (normalized < -22.5 && normalized > -67.5) {
    orientationKey = 'south_east';
    orientationLabel = 'Sud-Est';
  } else if (normalized <= -67.5 && normalized >= -112.5) {
    orientationKey = 'east';
    orientationLabel = 'Plein Est';
  } else if (normalized < -112.5 && normalized > -157.5) {
    orientationKey = 'north_east';
    orientationLabel = 'Nord-Est';
  } else {
    orientationKey = 'north';
    orientationLabel = 'Plein Nord';
  }

  const angleStr = normalized === 0 ? ' (0°)' : (normalized > 0 ? ` (+${normalized}°)` : ` (${normalized}°)`);
  const coeff = ORIENTATION_COEFFS_MAP[orientationKey] || 0.85;

  return {
    orientationKey,
    orientationLabel: `${orientationLabel}${angleStr}`,
    rawLabel: orientationLabel,
    angle: normalized,
    coeff
  };
}

// ─── Calcul d'orientation selon le faîtage (Asymétrique ou Symétrique 2 pans) ─
export function calculateOrientationFromRidge(p1, p2, allPoints = [], roofType = 'asymetrique', ridgeIndex = 0) {
  // 1. Calcul du milieu du faîtage (p1, p2)
  const ridgeMidLat = (p1.lat + p2.lat) / 2;
  const ridgeMidLng = (p1.lng + p2.lng) / 2;
  
  // 2. Calcul du barycentre de la toiture
  let polyCenterLat = 0;
  let polyCenterLng = 0;
  const pts = (allPoints && allPoints.length >= 3) ? allPoints : [p1, p2];
  pts.forEach(p => {
    polyCenterLat += p.lat;
    polyCenterLng += p.lng;
  });
  polyCenterLat /= pts.length;
  polyCenterLng /= pts.length;

  // 3. Vecteur du faîtage vers le centre de la toiture (direction de la pente vers le bas)
  const midLatRad = (ridgeMidLat * Math.PI) / 180;
  const dLng = (polyCenterLng - ridgeMidLng) * Math.cos(midLatRad) * 111320; // Est en mètres (>0 si centre à l'Est)
  const dLat = (polyCenterLat - ridgeMidLat) * 110574; // Nord en mètres (>0 si centre au Nord)

  // Boussole : Sud = 0°, Ouest = +90°, Est = -90°, Nord = 180°
  let deg1 = Math.round((Math.atan2(-dLng, -dLat) * 180) / Math.PI);
  if (deg1 === -180) deg1 = 180;

  const pan1 = getOrientationDetailsFromAngle(deg1);

  // ─── Mode Symétrique : 2 pans opposés (50% chacun) ───
  if (roofType === 'symetrique') {
    let deg2 = deg1 >= 0 ? deg1 - 180 : deg1 + 180;
    if (deg2 === -180) deg2 = 180;
    const pan2 = getOrientationDetailsFromAngle(deg2);
    const effectiveCoeff = (pan1.coeff + pan2.coeff) / 2;
    const combinedLabel = `Symétrique : ${pan1.orientationLabel} / ${pan2.orientationLabel}`;
    const rawCombinedLabel = `${pan1.rawLabel} / ${pan2.rawLabel}`;

    return {
      roofType: 'symetrique',
      orientationKey: `sym_${pan1.orientationKey}_${pan2.orientationKey}`,
      orientationLabel: combinedLabel,
      rawOrientationLabel: rawCombinedLabel,
      angle: pan1.angle,
      ridgeIndex,
      pan1: { ...pan1, share: 0.5 },
      pan2: { ...pan2, share: 0.5 },
      effectiveCoeff
    };
  }

  // ─── Mode Asymétrique / Monopente : 1 seul pan ───
  return {
    roofType: 'asymetrique',
    orientationKey: pan1.orientationKey,
    orientationLabel: pan1.orientationLabel,
    rawOrientationLabel: pan1.rawLabel,
    angle: pan1.angle,
    ridgeIndex,
    pan1: { ...pan1, share: 1.0 },
    pan2: null,
    effectiveCoeff: pan1.coeff
  };
}

// ─── Créateur d'icône HTML pour les 4 coins ─────────────────────────────────
const createCornerIcon = (number) => {
  return L.divIcon({
    className: 'custom-corner-icon',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: #00b875;
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 16px;
        font-family: Arial, sans-serif;
        border: 3px solid #ffffff;
        box-shadow: 0 0 14px rgba(0, 230, 153, 0.95), 0 4px 10px rgba(0,0,0,0.5);
        cursor: grab;
        user-select: none;
      ">
        ${number}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

// ─── Contrôleur de centrage automatique sur le polygone au changement d'étape
function StepTransitionController({ step, center, polygonPoints }) {
  const map = useMap();
  const prevStepRef = useRef(step);

  useEffect(() => {
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;

      if ((step === 3 || step === 4 || step === 5 || step === 6) && polygonPoints && polygonPoints.length >= 4) {
        const bounds = L.latLngBounds(polygonPoints.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 20,
          animate: true
        });
      } else if (center && center[0] && center[1]) {
        map.setView(center, map.getZoom() || 19, { animate: true });
      }
    }
  }, [step, center, polygonPoints, map]);

  return null;
}

// ─── Contrôles de Zoom Flottants ─────────────────────────────────────────────
function CustomZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-3 left-3 z-[1100] flex flex-col gap-1.5 shadow-md">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black flex items-center justify-center border border-slate-200 shadow-sm transition-all hover:scale-105 active:scale-95"
        title="Zoomer (+)"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black flex items-center justify-center border border-slate-200 shadow-sm transition-all hover:scale-105 active:scale-95"
        title="Dézoomer (-)"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Suivi du déplacement de la carte (Étape 2) sans forcer le zoom ──────────
function MapDragTracker({ onCenterChange, enabled }) {
  useMapEvents({
    moveend: (e) => {
      if (enabled && onCenterChange) {
        const c = e.target.getCenter();
        onCenterChange([c.lat, c.lng]);
      }
    }
  });
  return null;
}

// ─── GESTIONNAIRE NATIF LEAFLET DES 4 COINS (SANS RELÂCHEMENT INTEMPESTIF) ──
function NativeCornerMarkersLayer({
  step,
  points,
  onPolygonChange,
  onLiveSurfaceUpdate,
  selectedRidgeIndex,
  onRidgeSelect,
  roofType = 'asymetrique',
  onOrientationChange
}) {
  const map = useMap();
  const markersRef = useRef([]);
  const polygonLayerRef = useRef(null);
  const polylinesRef = useRef([]);
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Synchronisation automatique de l'orientation pour l'arête active
  useEffect(() => {
    if (points && points.length >= 4) {
      const idx = selectedRidgeIndex !== undefined && selectedRidgeIndex !== null ? selectedRidgeIndex : 0;
      const ptA = points[idx];
      const ptB = points[(idx + 1) % 4];
      if (ptA && ptB) {
        const res = calculateOrientationFromRidge(ptA, ptB, points, roofType, idx);
        if (onOrientationChange) {
          onOrientationChange(res);
        }
      }
    }
  }, [points, selectedRidgeIndex, roofType, onOrientationChange]);

  // Initialisation et gestion du polygone + arêtes + faîtage central + 4 marqueurs
  useEffect(() => {
    if (!map) return;

    // Nettoyage des anciens éléments
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    polylinesRef.current.forEach(pl => map.removeLayer(pl));
    polylinesRef.current = [];

    if (step < 3 || !points || points.length < 4) return;

    // 1. Création du polygone vert
    const latlngs = points.map(p => [p.lat, p.lng]);
    const polygon = L.polygon(latlngs, {
      color: '#00e699',
      weight: 3.5,
      fillColor: '#00b875',
      fillOpacity: 0.38,
      dashArray: step === 4 ? '4, 4' : null
    }).addTo(map);
    polygonLayerRef.current = polygon;

    // 2. Gestion de l'Étape 4 : Orientation (Asymétrique ou Symétrique)
    if (step === 4) {
      const idx = selectedRidgeIndex !== undefined && selectedRidgeIndex !== null ? selectedRidgeIndex : 0;
      const currentPts = pointsRef.current;

      if (roofType === 'symetrique') {
        // ─── Mode Symétrique : Faîtage au centre + Axe orthogonal à 90° en pointillés ──
        const isParallel02 = (idx === 0 || idx === 2);

        // Axe A : reliant milieu [p3, p0] et milieu [p1, p2]
        const axisA_Start = {
          lat: (currentPts[3].lat + currentPts[0].lat) / 2,
          lng: (currentPts[3].lng + currentPts[0].lng) / 2
        };
        const axisA_End = {
          lat: (currentPts[1].lat + currentPts[2].lat) / 2,
          lng: (currentPts[1].lng + currentPts[2].lng) / 2
        };

        // Axe B : reliant milieu [p0, p1] et milieu [p2, p3]
        const axisB_Start = {
          lat: (currentPts[0].lat + currentPts[1].lat) / 2,
          lng: (currentPts[0].lng + currentPts[1].lng) / 2
        };
        const axisB_End = {
          lat: (currentPts[2].lat + currentPts[3].lat) / 2,
          lng: (currentPts[2].lng + currentPts[3].lng) / 2
        };

        // Centre géométrique d'intersection
        const centerLat = (axisA_Start.lat + axisA_End.lat + axisB_Start.lat + axisB_End.lat) / 4;
        const centerLng = (axisA_Start.lng + axisA_End.lng + axisB_Start.lng + axisB_End.lng) / 4;

        const activeStart = isParallel02 ? axisA_Start : axisB_Start;
        const activeEnd = isParallel02 ? axisA_End : axisB_End;

        const orthoStart = isParallel02 ? axisB_Start : axisA_Start;
        const orthoEnd = isParallel02 ? axisB_End : axisA_End;

        const toggleAxis = () => {
          const nextIdx = isParallel02 ? 1 : 0;
          if (onRidgeSelect) onRidgeSelect(nextIdx);
          const ptA = currentPts[nextIdx];
          const ptB = currentPts[(nextIdx + 1) % 4];
          const res = calculateOrientationFromRidge(ptA, ptB, currentPts, 'symetrique', nextIdx);
          if (onOrientationChange) onOrientationChange(res);
        };

        // 1. Trait rouge en pointillés à 90° (axe orthogonal alternatif pour pivoter)
        const dashedOrthoLine = L.polyline([[orthoStart.lat, orthoStart.lng], [orthoEnd.lat, orthoEnd.lng]], {
          color: '#ef4444',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.85
        }).addTo(map);
        dashedOrthoLine.on('click', toggleAxis);
        polylinesRef.current.push(dashedOrthoLine);

        // 2. Trait rouge continu (Faîtage actif)
        const ridgeLine = L.polyline([[activeStart.lat, activeStart.lng], [activeEnd.lat, activeEnd.lng]], {
          color: '#ef4444',
          weight: 7,
          opacity: 1.0
        }).addTo(map);
        ridgeLine.on('click', toggleAxis);
        polylinesRef.current.push(ridgeLine);

        // 3. Point rouge central d'intersection (cliquable pour pivoter à 90°)
        const centerCircle = L.circleMarker([centerLat, centerLng], {
          radius: 9,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#ef4444',
          fillOpacity: 1
        }).addTo(map);
        centerCircle.on('click', toggleAxis);
        markersRef.current.push(centerCircle);

        // Étiquette "Faîtage central" au milieu du trait
        const ridgeLabelIcon = L.divIcon({
          className: 'ridge-label-icon',
          html: `
            <div style="
              background: #ef4444;
              color: #ffffff;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 900;
              white-space: nowrap;
              border: 1.5px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              transform: translate(-50%, -150%);
              pointer-events: none;
            ">
              Faîtage central
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });
        const ridgeMarker = L.marker([centerLat, centerLng], { icon: ridgeLabelIcon, interactive: false }).addTo(map);
        markersRef.current.push(ridgeMarker);

        // Les 4 arêtes extérieures sont cliquables pour changer l'axe du faîtage central
        for (let i = 0; i < 4; i++) {
          const p1 = currentPts[i];
          const p2 = currentPts[(i + 1) % 4];
          const isSelectedAxis = (isParallel02 && (i === 0 || i === 2)) || (!isParallel02 && (i === 1 || i === 3));

          const polyline = L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
            color: isSelectedAxis ? '#10b981' : '#6ee7b7',
            weight: isSelectedAxis ? 4.5 : 3,
            dashArray: isSelectedAxis ? null : '6, 6',
            opacity: 0.9
          }).addTo(map);

          polyline.on('click', () => {
            if (onRidgeSelect) onRidgeSelect(i);
            const ptA = currentPts[i];
            const ptB = currentPts[(i + 1) % 4];
            const res = calculateOrientationFromRidge(ptA, ptB, currentPts, 'symetrique', i);
            if (onOrientationChange) onOrientationChange(res);
          });

          polylinesRef.current.push(polyline);
        }

      } else {
        // ─── Mode Asymétrique / Monopente : Faîtage sur un bord ─────────
        for (let i = 0; i < 4; i++) {
          const p1 = currentPts[i];
          const p2 = currentPts[(i + 1) % 4];
          const isSelected = selectedRidgeIndex === i;

          const polyline = L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
            color: isSelected ? '#ef4444' : '#00e699',
            weight: isSelected ? 6.5 : 4,
            opacity: 0.95
          }).addTo(map);

          polyline.on('click', () => {
            if (onRidgeSelect) onRidgeSelect(i);
            const ptA = currentPts[i];
            const ptB = currentPts[(i + 1) % 4];
            const res = calculateOrientationFromRidge(ptA, ptB, currentPts, 'asymetrique', i);
            if (onOrientationChange) onOrientationChange(res);
          });

          polylinesRef.current.push(polyline);
        }
      }
    }

    // 3. Création des 4 Marqueurs Déplaçables (Étape 3)
    if (step === 3) {
      points.forEach((pt, index) => {
        const marker = L.marker([pt.lat, pt.lng], {
          draggable: true,
          icon: createCornerIcon(index + 1),
          autoPan: false
        }).addTo(map);

        // Au début du glissement : désactiver le pan de la carte
        marker.on('dragstart', () => {
          map.dragging.disable();
        });

        // Pendant le glissement : mise à jour instantanée du tracé sans re-render React
        marker.on('drag', () => {
          const newPos = marker.getLatLng();
          const currentPts = [...pointsRef.current];
          currentPts[index] = { lat: newPos.lat, lng: newPos.lng };
          pointsRef.current = currentPts;

          // Mise à jour de la forme géométrique en temps réel à 60fps
          if (polygonLayerRef.current) {
            polygonLayerRef.current.setLatLngs(currentPts.map(p => [p.lat, p.lng]));
          }

          const currentArea = calculatePolygonArea(currentPts);
          if (onLiveSurfaceUpdate) onLiveSurfaceUpdate(currentArea);
        });

        // Au relâchement définitif : réactiver la carte et sauvegarder les points
        marker.on('dragend', () => {
          map.dragging.enable();
          const newPos = marker.getLatLng();
          const currentPts = [...pointsRef.current];
          currentPts[index] = { lat: newPos.lat, lng: newPos.lng };
          pointsRef.current = currentPts;

          if (onPolygonChange) onPolygonChange(currentPts);
        });

        markersRef.current.push(marker);
      });
    }

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
      if (polygonLayerRef.current) {
        map.removeLayer(polygonLayerRef.current);
        polygonLayerRef.current = null;
      }
      polylinesRef.current.forEach(pl => map.removeLayer(pl));
      polylinesRef.current = [];
    };
  }, [map, step, points, selectedRidgeIndex, roofType, onPolygonChange, onLiveSurfaceUpdate, onRidgeSelect, onOrientationChange]);

  return null;
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

export default function RoofMapPolygonSelector({
  step = 2,
  center = [43.6047, 1.4442],
  onCenterChange,
  polygonPoints = [],
  onPolygonChange,
  selectedRidgeIndex = 0,
  onRidgeSelect,
  roofType = 'asymetrique',
  onRoofTypeChange,
  orientationInfo = { orientationKey: 'south', orientationLabel: 'Plein Sud' },
  onOrientationChange,
  mapContainerRef
}) {
  const [mapInstance, setMapInstance] = useState(null);

  // Initialisation d'un rectangle de 4 points par défaut
  const initializeDefaultPolygon = useCallback((lat, lng) => {
    const offsetLat = 0.00008;
    const offsetLng = 0.00012;
    return [
      { lat: lat + offsetLat, lng: lng - offsetLng }, // 1: Haut Gauche
      { lat: lat + offsetLat, lng: lng + offsetLng }, // 2: Haut Droit
      { lat: lat - offsetLat, lng: lng + offsetLng }, // 3: Bas Droit
      { lat: lat - offsetLat, lng: lng - offsetLng }, // 4: Bas Gauche
    ];
  }, []);

  useEffect(() => {
    if ((!polygonPoints || polygonPoints.length < 4) && center && center[0] && center[1]) {
      const initial = initializeDefaultPolygon(center[0], center[1]);
      if (onPolygonChange) onPolygonChange(initial);
    }
  }, [center, polygonPoints, initializeDefaultPolygon, onPolygonChange]);

  const currentPoints = useMemo(() => {
    if (polygonPoints && polygonPoints.length >= 4) return polygonPoints;
    return initializeDefaultPolygon(center[0], center[1]);
  }, [polygonPoints, center, initializeDefaultPolygon]);

  // Surface dynamique affichée
  const [liveSurface, setLiveSurface] = useState(() => calculatePolygonArea(currentPoints));

  useEffect(() => {
    setLiveSurface(calculatePolygonArea(currentPoints));
  }, [currentPoints]);

  const handleResetRectangle = () => {
    if (center && center[0] && center[1]) {
      const reset = initializeDefaultPolygon(center[0], center[1]);
      if (onPolygonChange) onPolygonChange(reset);
      setLiveSurface(calculatePolygonArea(reset));
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900" ref={mapContainerRef}>
      
      {/* Conteneur Leaflet Agrandie (+20% de hauteur : 530px / 580px) */}
      <div className={`relative w-full z-0 transition-all duration-300 ${step === 2 ? 'h-[530px] sm:h-[580px]' : 'h-[480px] sm:h-[520px]'}`}>
        <MapContainer
          center={center}
          zoom={19}
          maxZoom={23}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          zoomControl={false}
          className="w-full h-full"
          ref={setMapInstance}
        >
          <StepTransitionController step={step} center={center} polygonPoints={currentPoints} />
          <MapDragTracker enabled={step === 2} onCenterChange={onCenterChange} />
          <CustomZoomControls />
          <ZoomLevelIndicator />

          {/* Tuile Satellite Esri World Imagery (CORS garanti) avec maxNativeZoom={19} et maxZoom={23} pour sur-zoom fluide */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={23}
            crossOrigin="anonymous"
            attribution="Esri World Imagery"
          />

          {/* Gestionnaire natif Leaflet sans interruption de drag */}
          <NativeCornerMarkersLayer
            step={step}
            points={currentPoints}
            onPolygonChange={onPolygonChange}
            onLiveSurfaceUpdate={setLiveSurface}
            selectedRidgeIndex={selectedRidgeIndex}
            onRidgeSelect={onRidgeSelect}
            roofType={roofType}
            onOrientationChange={onOrientationChange}
          />
        </MapContainer>

        {/* Étape 2 : Curseur vert clignotant épuré */}
        {step === 2 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
            <div className="relative flex items-center justify-center animate-pulse">
              <div className="w-14 h-14 rounded-full border-4 border-emerald-400 bg-emerald-500/40 shadow-lg shadow-emerald-500/60 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-emerald-200 ring-2 ring-emerald-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre d'informations Étape 3 */}
      {step === 3 && (
        <div className="p-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetRectangle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser le rectangle
          </button>

          <div className="px-6 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-center shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Nous estimons la surface de toiture à :
            </span>
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {liveSurface} m²
            </span>
          </div>

          <div className="text-xs text-slate-500 font-semibold hidden md:block">
            Déplacez les 4 coins vert fluo (1, 2, 3, 4)
          </div>
        </div>
      )}

      {/* Barre d'informations Étape 4 */}
      {step === 4 && (
        <div className="p-3.5 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Boutons Sélecteur Type de Bâtiment : Asymétrique ou Symétrique */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => onRoofTypeChange && onRoofTypeChange('asymetrique')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                roofType === 'asymetrique'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
              title="Toiture asymétrique / monopente : pente unique, faîtage sur un bord"
            >
              <span>Asymétrique</span>
            </button>
            <button
              type="button"
              onClick={() => onRoofTypeChange && onRoofTypeChange('symetrique')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                roofType === 'symetrique'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
              title="Toiture symétrique : 2 pans opposés, faîtage au centre du rectangle"
            >
              <span>Symétrique</span>
            </button>
          </div>

          {/* Badge d'exposition selon le mode */}
          <div className="px-5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              {roofType === 'symetrique' ? 'Toiture symétrique :' : 'Votre toiture est exposée :'}
            </span>
            {roofType === 'symetrique' ? (
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-black text-amber-900 mt-0.5">
                <span className="bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300/60">
                  Pan 1 (50%) : {orientationInfo?.pan1?.orientationLabel || 'Plein Sud (0°)'}
                </span>
                <span className="text-amber-500 font-bold">•</span>
                <span className="bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300/60">
                  Pan 2 (50%) : {orientationInfo?.pan2?.orientationLabel || 'Plein Nord (180°)'}
                </span>
              </div>
            ) : (
              <span className="text-lg font-black text-amber-900">
                {orientationInfo?.orientationLabel || 'Plein Sud (0°)'}
              </span>
            )}
          </div>

          {roofType !== 'symetrique' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Cliquez sur un autre côté pour ajuster</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
