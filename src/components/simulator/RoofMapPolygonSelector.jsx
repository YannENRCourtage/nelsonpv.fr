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

// ─── Calcul d'orientation selon le faîtage ───────────────────────────────────
export function calculateOrientationFromRidge(p1, p2) {
  const dLng = (p2.lng - p1.lng) * Math.cos(((p1.lat + p2.lat) / 2 * Math.PI) / 180);
  const dLat = p2.lat - p1.lat;
  
  let ridgeAngle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  if (ridgeAngle < 0) ridgeAngle += 360;

  let slopeAngle1 = (ridgeAngle + 90) % 360;
  let slopeAngle2 = (ridgeAngle + 270) % 360;

  const diff1 = Math.abs(slopeAngle1 - 180);
  const diff2 = Math.abs(slopeAngle2 - 180);
  const bestAngle = diff1 <= diff2 ? slopeAngle1 : slopeAngle2;

  let orientationKey = 'south';
  let orientationLabel = 'Plein Sud';

  if (bestAngle >= 157.5 && bestAngle <= 202.5) {
    orientationKey = 'south';
    orientationLabel = 'Plein Sud';
  } else if (bestAngle > 112.5 && bestAngle < 157.5) {
    orientationKey = 'south_east';
    orientationLabel = 'Sud-Est';
  } else if (bestAngle > 202.5 && bestAngle < 247.5) {
    orientationKey = 'south_west';
    orientationLabel = 'Sud-Ouest';
  } else if (bestAngle >= 67.5 && bestAngle <= 112.5) {
    orientationKey = 'east';
    orientationLabel = 'Est';
  } else if (bestAngle >= 247.5 && bestAngle <= 292.5) {
    orientationKey = 'west';
    orientationLabel = 'Ouest';
  } else {
    orientationKey = 'north';
    orientationLabel = 'Nord';
  }

  return { orientationKey, orientationLabel, angle: Math.round(bestAngle) };
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

  // Initialisation et gestion du polygone + arêtes + 4 marqueurs
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

    // 2. Création des arêtes cliquables (Étape 4)
    if (step === 4) {
      for (let i = 0; i < 4; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % 4];
        const isSelected = selectedRidgeIndex === i;

        const polyline = L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
          color: isSelected ? '#ef4444' : '#00e699',
          weight: isSelected ? 6.5 : 4,
          opacity: 0.95
        }).addTo(map);

        polyline.on('click', () => {
          if (onRidgeSelect) onRidgeSelect(i);
          const currentPts = pointsRef.current;
          const ptA = currentPts[i];
          const ptB = currentPts[(i + 1) % 4];
          const res = calculateOrientationFromRidge(ptA, ptB);
          if (onOrientationChange) onOrientationChange(res);
        });

        polylinesRef.current.push(polyline);
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
  }, [map, step, points, selectedRidgeIndex, onPolygonChange, onLiveSurfaceUpdate, onRidgeSelect, onOrientationChange]);

  return null;
}

export default function RoofMapPolygonSelector({
  step = 2,
  center = [43.6047, 1.4442],
  onCenterChange,
  polygonPoints = [],
  onPolygonChange,
  selectedRidgeIndex = 0,
  onRidgeSelect,
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
      
      {/* Conteneur Leaflet Agrandie (440px de hauteur) */}
      <div className="relative w-full h-[400px] sm:h-[440px] z-0">
        <MapContainer
          center={center}
          zoom={19}
          maxZoom={21}
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

          {/* Tuile Satellite Esri World Imagery (CORS garanti) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={21}
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
        <div className="p-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-red-600">Ligne rouge :</span> Côté sélectionné comme faîtage
          </div>

          <div className="px-6 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center shadow-xs">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
              Votre toiture est exposée :
            </span>
            <span className="text-xl font-black text-amber-900">
              {orientationInfo.orientationLabel} ({orientationInfo.angle || 180}°)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Compass className="w-4 h-4 text-blue-600" />
            Cliquez sur un autre côté pour ajuster
          </div>
        </div>
      )}
    </div>
  );
}
