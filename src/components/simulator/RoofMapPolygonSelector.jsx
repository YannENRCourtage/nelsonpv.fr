import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, Plus, Minus, Compass } from 'lucide-react';
import html2canvas from 'html2canvas';

// ─── Calcul de Surface Géodésique (Formule Sphérique WGS84) ──────────────────
function calculatePolygonArea(latlngs) {
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
function calculateOrientationFromRidge(p1, p2) {
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

// ─── Icône Marker 1, 2, 3, 4 Style ENR Courtage ──────────────────────────────
const createNumberedIcon = (number, isSelected = false) => {
  return L.divIcon({
    className: 'custom-roof-corner-marker-container',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${isSelected ? '#00e699' : '#00b875'};
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 16px;
        font-family: Arial, sans-serif;
        border: 3px solid #ffffff;
        box-shadow: 0 0 14px rgba(0, 230, 153, 0.95), 0 4px 8px rgba(0,0,0,0.5);
        cursor: grab;
        user-select: none;
        touch-action: none;
      ">
        ${number}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

// ─── Contrôleur de centrage intelligent lors du changement d'étape ───────────
function StepTransitionController({ step, center, polygonPoints }) {
  const map = useMap();
  const prevStepRef = useRef(step);

  useEffect(() => {
    // Si l'étape change, centrer la carte sur le polygone ou sur le repère
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;

      if ((step === 3 || step === 4 || step === 6) && polygonPoints && polygonPoints.length >= 4) {
        // Centrer sur le polygone
        const lats = polygonPoints.map(p => p.lat);
        const lngs = polygonPoints.map(p => p.lng);
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        const bounds = L.latLngBounds(polygonPoints.map(p => [p.lat, p.lng]));
        
        map.fitBounds(bounds, {
          padding: [50, 50],
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

// ─── Gestionnaire de déplacement de la carte (Étape 2) sans forcer de zoom ──
function MapDragTracker({ onCenterChange, enabled }) {
  const map = useMapEvents({
    moveend: () => {
      if (enabled && onCenterChange) {
        const c = map.getCenter();
        onCenterChange([c.lat, c.lng]);
      }
    }
  });
  return null;
}

// ─── Marqueur 1, 2, 3, 4 Natif Leaflet (Drag fluide sans perte de curseur) ────
function NativeDraggableCorner({ index, initialPosition, onPositionChanged, onLiveDrag, map }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragstart() {
        if (map) map.dragging.disable();
      },
      drag(e) {
        const newPos = e.target.getLatLng();
        if (onLiveDrag) onLiveDrag(index, newPos);
      },
      dragend(e) {
        if (map) map.dragging.enable();
        const newPos = e.target.getLatLng();
        if (onPositionChanged) onPositionChanged(index, newPos);
      },
    }),
    [index, onLiveDrag, onPositionChanged, map]
  );

  return (
    <Marker
      ref={markerRef}
      position={initialPosition}
      draggable={true}
      icon={createNumberedIcon(index + 1)}
      eventHandlers={eventHandlers}
      autoPan={false}
    />
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
  orientationInfo = { orientationKey: 'south', orientationLabel: 'Plein Sud' },
  onOrientationChange,
  mapContainerRef
}) {
  const [mapInstance, setMapInstance] = useState(null);
  const polygonLayerRef = useRef(null);

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

  // Points locaux dynamiques pour mise à jour fluide du polygone
  const [livePoints, setLivePoints] = useState(currentPoints);

  useEffect(() => {
    setLivePoints(currentPoints);
  }, [currentPoints]);

  // Déplacement en direct (met à jour le tracé visuel sans re-créer les marqueurs)
  const handleLiveDrag = (index, newLatLng) => {
    setLivePoints(prev => {
      const updated = [...prev];
      updated[index] = { lat: newLatLng.lat, lng: newLatLng.lng };
      return updated;
    });
  };

  // Fin de déplacement : engagement définitif de la position
  const handlePositionChanged = (index, newLatLng) => {
    const updated = [...currentPoints];
    updated[index] = { lat: newLatLng.lat, lng: newLatLng.lng };
    setLivePoints(updated);
    if (onPolygonChange) onPolygonChange(updated);
  };

  const calculatedSurface = useMemo(() => {
    return calculatePolygonArea(livePoints);
  }, [livePoints]);

  const handleResetRectangle = () => {
    if (center && center[0] && center[1]) {
      const reset = initializeDefaultPolygon(center[0], center[1]);
      setLivePoints(reset);
      if (onPolygonChange) onPolygonChange(reset);
    }
  };

  const handleEdgeClick = (edgeIdx) => {
    if (step !== 4) return;
    if (onRidgeSelect) onRidgeSelect(edgeIdx);
    const p1 = livePoints[edgeIdx];
    const p2 = livePoints[(edgeIdx + 1) % 4];
    const res = calculateOrientationFromRidge(p1, p2);
    if (onOrientationChange) {
      onOrientationChange(res);
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900" ref={mapContainerRef}>
      
      {/* Conteneur Leaflet Agrandie (420px de hauteur) */}
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

          {/* Tuile Satellite Esri World Imagery (CORS activé pour capture PDF garantie) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={21}
            crossOrigin="anonymous"
            attribution="Esri World Imagery"
          />

          {/* Polygone et Arêtes */}
          {(step === 3 || step === 4 || step === 5 || step === 6) && livePoints.length >= 4 && (
            <>
              <Polygon
                ref={polygonLayerRef}
                positions={livePoints.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: '#00e699',
                  weight: 4,
                  fillColor: '#00b875',
                  fillOpacity: 0.38,
                  dashArray: step === 4 ? '4, 4' : null
                }}
              />

              {/* Lignes du faîtage pour l'étape 4 */}
              {livePoints.map((p, idx) => {
                const nextP = livePoints[(idx + 1) % 4];
                const isSelectedRidge = step === 4 && selectedRidgeIndex === idx;
                return (
                  <Polyline
                    key={`edge-${idx}`}
                    positions={[[p.lat, p.lng], [nextP.lat, nextP.lng]]}
                    eventHandlers={{
                      click: () => handleEdgeClick(idx)
                    }}
                    pathOptions={{
                      color: isSelectedRidge ? '#ef4444' : '#00e699',
                      weight: isSelectedRidge ? 6.5 : 4,
                      opacity: 0.95,
                      cursor: step === 4 ? 'pointer' : 'default'
                    }}
                  />
                );
              })}

              {/* 4 Marqueurs Déplaçables SANS interruption React */}
              {step === 3 && currentPoints.map((p, idx) => (
                <NativeDraggableCorner
                  key={`corner-marker-${idx}`}
                  index={idx}
                  initialPosition={[p.lat, p.lng]}
                  onLiveDrag={handleLiveDrag}
                  onPositionChanged={handlePositionChanged}
                  map={mapInstance}
                />
              ))}
            </>
          )}
        </MapContainer>

        {/* Étape 2 : Curseur vert clignotant sans texte */}
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

      {/* Barre d'informations */}
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
              {calculatedSurface} m²
            </span>
          </div>

          <div className="text-xs text-slate-500 font-semibold hidden md:block">
            Déplacez les 4 coins vert fluo (1, 2, 3, 4)
          </div>
        </div>
      )}

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
