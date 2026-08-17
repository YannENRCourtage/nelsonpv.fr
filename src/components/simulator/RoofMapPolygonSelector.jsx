import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, Crosshair, Sparkles, Check, Compass, Eye, Maximize2, MapPin } from 'lucide-react';
import html2canvas from 'html2canvas';

// ─── Calcul de Surface Géodésique (Formule Sphérique WGS84) ──────────────────
function calculatePolygonArea(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const EARTH_RADIUS = 6378137; // mètres
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

// ─── Calcul d'orientation selon le faîtage sélectionné ───────────────────────
function calculateOrientationFromRidge(p1, p2) {
  // Vecteur du faîtage
  const dLng = (p2.lng - p1.lng) * Math.cos(((p1.lat + p2.lat) / 2 * Math.PI) / 180);
  const dLat = p2.lat - p1.lat;
  
  // Angle du faîtage en degrés (0° = Nord, 90° = Est)
  let ridgeAngle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  if (ridgeAngle < 0) ridgeAngle += 360;

  // Le pan descend perpendiculairement au faîtage (+90° ou -90°)
  // Par défaut en France, on privilégie la direction la plus au Sud (azimut le plus proche de 180°)
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
    className: 'custom-roof-corner-marker',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: ${isSelected ? '#00e699' : '#00b875'};
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        font-family: Arial, sans-serif;
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 12px rgba(0, 230, 153, 0.9), 0 3px 6px rgba(0,0,0,0.4);
        cursor: grab;
        transform: translate(-50%, -50%);
      ">
        ${number}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// ─── Contrôleur de mise à jour du centre de carte ────────────────────────────
function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 19, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// ─── Gestionnaire de déplacement de la carte (Étape 2) ───────────────────────
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

export default function RoofMapPolygonSelector({
  step = 2, // 2: Repérage, 3: Surface, 4: Orientation, 6: Vue récap
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
  const localMapRef = useRef(null);

  // Initialisation d'un rectangle de 4 points par défaut autour du centre
  const initializeDefaultPolygon = useCallback((lat, lng) => {
    const offsetLat = 0.00009; // env 10m
    const offsetLng = 0.00014; // env 10m
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

  // Calcul de surface en direct
  const calculatedSurface = useMemo(() => {
    return calculatePolygonArea(currentPoints);
  }, [currentPoints]);

  // Déplacement d'un point 1, 2, 3, 4
  const handleMarkerDrag = (index, event) => {
    const marker = event.target;
    const newPos = marker.getLatLng();
    const updated = [...currentPoints];
    updated[index] = { lat: newPos.lat, lng: newPos.lng };
    if (onPolygonChange) onPolygonChange(updated);
  };

  // Réinitialiser le rectangle
  const handleResetRectangle = () => {
    if (center && center[0] && center[1]) {
      const reset = initializeDefaultPolygon(center[0], center[1]);
      if (onPolygonChange) onPolygonChange(reset);
    }
  };

  // Gestion de la sélection du faîtage (Étape 4)
  const handleEdgeClick = (edgeIdx) => {
    if (step !== 4) return;
    if (onRidgeSelect) onRidgeSelect(edgeIdx);
    const p1 = currentPoints[edgeIdx];
    const p2 = currentPoints[(edgeIdx + 1) % 4];
    const res = calculateOrientationFromRidge(p1, p2);
    if (onOrientationChange) {
      onOrientationChange(res);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900" ref={mapContainerRef}>
      
      {/* Conteneur Leaflet */}
      <div className="relative w-full h-[380px] sm:h-[430px] z-0">
        <MapContainer
          center={center}
          zoom={19}
          maxZoom={21}
          scrollWheelZoom={true}
          className="w-full h-full"
          ref={localMapRef}
        >
          <MapCenterController center={center} zoom={19} />
          <MapDragTracker enabled={step === 2} onCenterChange={onCenterChange} />

          {/* Tuiles Satellite Google Hybride / Esri */}
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={21}
            attribution="Google Maps Satellite"
          />

          {/* ═══ ÉTAPE 3, 4 & 6 : Polygone & Marqueurs 1, 2, 3, 4 ═══════════════ */}
          {(step === 3 || step === 4 || step === 5 || step === 6) && currentPoints.length >= 4 && (
            <>
              {/* Remplissage vert translucide du pan de toiture */}
              <Polygon
                positions={currentPoints.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: '#00e699',
                  weight: 3,
                  fillColor: '#00b875',
                  fillOpacity: 0.35,
                  dashArray: step === 4 ? '4, 4' : null
                }}
              />

              {/* Arêtes cliquables pour l'Étape 4 (Orientation / Faîtage) */}
              {currentPoints.map((p, idx) => {
                const nextP = currentPoints[(idx + 1) % 4];
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
                      weight: isSelectedRidge ? 6 : 3,
                      opacity: 0.9,
                      cursor: step === 4 ? 'pointer' : 'default'
                    }}
                  />
                );
              })}

              {/* 4 Marqueurs vert fluo déplaçables (Étape 3) */}
              {step === 3 && currentPoints.map((p, idx) => (
                <Marker
                  key={`point-${idx}`}
                  position={[p.lat, p.lng]}
                  draggable={true}
                  icon={createNumberedIcon(idx + 1)}
                  eventHandlers={{
                    drag: (e) => handleMarkerDrag(idx, e),
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>

        {/* ═══ ÉTAPE 2 : Cible Verte Centrale de Repérage ════════════════════ */}
        {step === 2 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
            <div className="relative flex items-center justify-center animate-pulse">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-400 bg-emerald-500/40 shadow-lg shadow-emerald-500/50 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-200 ring-2 ring-emerald-600" />
              </div>
              <div className="absolute -bottom-8 bg-slate-900/90 backdrop-blur-sm text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow">
                Centre de votre toiture
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BARRE INFÉRIEURE D'INFORMATIONS EN DIRECT ═══════════════════════════ */}
      {step === 3 && (
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetRectangle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser le rectangle
          </button>

          <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-center shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Nous estimons la surface de toiture à :
            </span>
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {calculatedSurface} m²
            </span>
          </div>

          <div className="text-xs text-slate-400 font-semibold hidden md:block">
            Déplacez les 4 coins vert fluo (1, 2, 3, 4)
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-red-600">Ligne rouge :</span> Côté sélectionné comme faîtage
          </div>

          <div className="px-5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
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
