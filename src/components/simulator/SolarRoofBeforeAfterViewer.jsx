import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Sun, Zap, Eye, SplitSquareHorizontal, Layers, Sparkles, CheckCircle2, 
  RotateCw, ArrowRightLeft, Maximize2, ShieldCheck, Compass
} from 'lucide-react';

import { computeValidSolarSlots } from '@/utils/solarCalepinage';

// Ajustement automatique de la vue sur le polygone
function AutoFitPolygon({ polygonPoints, center }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (polygonPoints && polygonPoints.length >= 3) {
      const bounds = L.latLngBounds(polygonPoints.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 21, animate: true });
    } else if (center && center[0] && center[1]) {
      map.setView(center, 20, { animate: true });
    }
  }, [map, polygonPoints, center]);
  return null;
}

// Couche de dessin réaliste des panneaux solaires sur le polygone à la côte exacte (parallèle à la sablière)
function SolarPanelsLayer({ polygonPoints, customKwc = 6, panelCount = 14, ridgeIndex = 0, isLandscape = false }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !polygonPoints || polygonPoints.length < 3) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    const latlngs = polygonPoints.map(p => [p.lat, p.lng]);

    // 1. Cadre de base toiture / rails de fixation
    L.polygon(latlngs, {
      color: '#0284c7',
      weight: 2,
      fillColor: '#0f172a',
      fillOpacity: 0.25,
      dashArray: '4, 3'
    }).addTo(group);

    // 2. Calcul des emplacements géométriquement valides (strictement parallèle à la sablière)
    try {
      const { slots, maxPanels } = computeValidSolarSlots(polygonPoints, ridgeIndex, isLandscape);
      const targetPanels = panelCount || Math.max(1, Math.round((customKwc * 1000) / 465));
      const countToPlace = Math.min(targetPanels, maxPanels);

      for (let i = 0; i < countToPlace; i++) {
        const slot = slots[i];
        if (!slot) break;

        const cornersLatLng = slot.corners.map(c => [c.lat, c.lng]);

        // Panneau Solaire (Bleu nuit antireflet + bordure cyan/alu)
        L.polygon(cornersLatLng, {
          color: '#38bdf8',
          weight: 1.2,
          fillColor: '#0c192c',
          fillOpacity: 0.95,
          className: 'solar-panel-portrait'
        }).addTo(group);
      }
    } catch (e) {
      console.warn('Erreur calepinage panneaux:', e);
    }

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, polygonPoints, customKwc, panelCount, ridgeIndex, isLandscape]);

  return null;
}

/**
 * Composant Avant / Après interactif pour la simulation d'Autoconsommation / Toiture Photovoltaïque
 */
export default function SolarRoofBeforeAfterViewer({
  center = [43.6047, 1.4442],
  polygonPoints = [],
  roofSurface = 75,
  customKwc = 6,
  panelCount: propPanelCount,
  ridgeIndex = 0,
  isLandscape = false,
  orientationInfo = { orientationLabel: 'Plein Sud (0°)', angle: 0 },
  consoKwh = 10000,
  annualProductionKwh = 7500
}) {
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side' | 'before' | 'after'
  const [sliderPosition, setSliderPosition] = useState(50); // 0 à 100%
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const panelCount = useMemo(() => {
    return propPanelCount || Math.max(1, Math.round((customKwc * 1000) / 465));
  }, [propPanelCount, customKwc]);

  const coveredSurface = useMemo(() => {
    return Math.min(roofSurface, Math.round(panelCount * 1.95));
  }, [roofSurface, panelCount]);

  // Gestion du glissement du curseur comparatif Avant / Après
  const handleSliderMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, pos)));
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseMove = (e) => {
    if (isDragging.current) {
      handleSliderMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-4">
      {/* En-tête du comparatif */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              Visuel Avant / Après de votre Toiture Solaire
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisez l’intégration esthétique des <strong>{panelCount} modules photovoltaïques ({customKwc} kWc)</strong> sur votre pan de toiture de <strong>{roofSurface} m²</strong>.
            </p>
          </div>
        </div>

        {/* Sélecteur de mode d'affichage */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'slider'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Curseur 50/50
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'side-by-side'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            Côte à côte
          </button>

          <button
            type="button"
            onClick={() => setViewMode('before')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'before'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Avant
          </button>

          <button
            type="button"
            onClick={() => setViewMode('after')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              viewMode === 'after'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3 h-3" />
            Après
          </button>
        </div>
      </div>

      {/* ZONE PRINCIPALE D'AFFICHAGE DU COMPARATIF */}
      {viewMode === 'slider' && (
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          className="relative w-full h-[420px] sm:h-[480px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 select-none bg-slate-950 cursor-ew-resize"
        >
          {/* FOND : Vue APRÈS (Centrale Solaire Complète) */}
          <div className="absolute inset-0 w-full h-full">
            <MapContainer
              center={center}
              zoom={20}
              maxZoom={23}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              doubleClickZoom={false}
              touchZoom={false}
              className="w-full h-full pointer-events-none"
            >
              <AutoFitPolygon polygonPoints={polygonPoints} center={center} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
              />
              <SolarPanelsLayer
                polygonPoints={polygonPoints}
                customKwc={customKwc}
                panelCount={panelCount}
                ridgeIndex={ridgeIndex}
                isLandscape={isLandscape}
              />
            </MapContainer>

            {/* Badge Après (Haut Droite) */}
            <div className="absolute top-4 right-4 z-[1000] bg-emerald-950/90 backdrop-blur-md text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-black tracking-wide">
                APRÈS : {customKwc} kWc ({panelCount} panneaux)
              </span>
            </div>
          </div>

          {/* DESSUS (Clipped) : Vue AVANT (Toiture Brute) */}
          <div
            className="absolute inset-0 h-full overflow-hidden border-r-2 border-white shadow-2xl z-10"
            style={{ width: `${sliderPosition}%` }}
          >
            <div style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%', height: '100%' }}>
              <MapContainer
                center={center}
                zoom={20}
                maxZoom={23}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                doubleClickZoom={false}
                touchZoom={false}
                className="w-full h-full pointer-events-none"
              >
                <AutoFitPolygon polygonPoints={polygonPoints} center={center} />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={19}
                  maxZoom={23}
                  crossOrigin="anonymous"
                />
                {/* Contour discret de la toiture brute */}
                {polygonPoints && polygonPoints.length >= 3 && (
                  <Polygon
                    positions={polygonPoints.map(p => [p.lat, p.lng])}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 1.5,
                      fillColor: '#ffffff',
                      fillOpacity: 0.05,
                      dashArray: '4, 4'
                    }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Badge Avant (Haut Gauche) */}
            <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black tracking-wide">
                AVANT : Toiture d'origine ({roofSurface} m²)
              </span>
            </div>
          </div>

          {/* Ligne & Poignée de contrôle centrale */}
          <div
            className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ left: `calc(${sliderPosition}% - 20px)` }}
          >
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              className="w-10 h-10 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border-2 border-emerald-500 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform pointer-events-auto"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
            </div>
          </div>

          {/* Instruction sous le comparateur */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold text-white/90 border border-white/20 pointer-events-none">
            ↔ Glissez le curseur pour comparer l'implantation
          </div>
        </div>
      )}

      {/* MODE CÔTE À CÔTE */}
      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Carte AVANT */}
          <div className="relative h-[360px] sm:h-[400px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-950">
            <MapContainer
              center={center}
              zoom={20}
              maxZoom={23}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              className="w-full h-full pointer-events-none"
            >
              <AutoFitPolygon polygonPoints={polygonPoints} center={center} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
              />
              {polygonPoints && polygonPoints.length >= 3 && (
                <Polygon
                  positions={polygonPoints.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#ffffff',
                    fillOpacity: 0.1,
                    dashArray: '4, 4'
                  }}
                />
              )}
            </MapContainer>
            <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded-xl text-xs font-black border border-slate-700 flex items-center gap-1.5 shadow-md">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              AVANT : Toiture d'origine ({roofSurface} m²)
            </div>
          </div>

          {/* Carte APRÈS */}
          <div className="relative h-[360px] sm:h-[400px] rounded-3xl overflow-hidden border border-emerald-300 shadow-md bg-slate-950">
            <MapContainer
              center={center}
              zoom={20}
              maxZoom={23}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              className="w-full h-full pointer-events-none"
            >
              <AutoFitPolygon polygonPoints={polygonPoints} center={center} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
              />
              <SolarPanelsLayer
                polygonPoints={polygonPoints}
                customKwc={customKwc}
                panelCount={panelCount}
                ridgeIndex={ridgeIndex}
                isLandscape={isLandscape}
              />
            </MapContainer>
            <div className="absolute top-3 left-3 z-[1000] bg-emerald-950/90 backdrop-blur text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-black border border-emerald-500/50 flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              APRÈS : {customKwc} kWc ({panelCount} panneaux)
            </div>
          </div>
        </div>
      )}

      {/* MODE VUE SEULE (Avant ou Après) */}
      {(viewMode === 'before' || viewMode === 'after') && (
        <div className="relative h-[420px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-950">
          <MapContainer
            center={center}
            zoom={20}
            maxZoom={23}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            className="w-full h-full pointer-events-none"
          >
            <AutoFitPolygon polygonPoints={polygonPoints} center={center} />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={19}
              maxZoom={23}
              crossOrigin="anonymous"
            />
            {viewMode === 'after' ? (
              <SolarPanelsLayer
                polygonPoints={polygonPoints}
                customKwc={customKwc}
                panelCount={panelCount}
                ridgeIndex={ridgeIndex}
                isLandscape={isLandscape}
              />
            ) : (
              polygonPoints && polygonPoints.length >= 3 && (
                <Polygon
                  positions={polygonPoints.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#ffffff',
                    fillOpacity: 0.1,
                    dashArray: '4, 4'
                  }}
                />
              )
            )}
          </MapContainer>

          <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-xl text-xs font-black border border-slate-700 shadow-lg flex items-center gap-2">
            {viewMode === 'after' ? (
              <>
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Toiture équipée : {customKwc} kWc ({panelCount} panneaux • {coveredSurface} m² couverts)</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-slate-300" />
                <span>Toiture initiale non équipée ({roofSurface} m²)</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cartouche Récapitulatif Technique sous le comparateur */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <span className="text-slate-400 font-bold uppercase text-[10px] block">Surface Toiture</span>
          <strong className="text-slate-900 font-black text-sm">{roofSurface} m²</strong>
        </div>

        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
          <span className="text-emerald-700 font-bold uppercase text-[10px] block">Puissance Installée</span>
          <strong className="text-emerald-900 font-black text-sm">{customKwc} kWc ({panelCount} modules)</strong>
        </div>

        <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
          <span className="text-blue-700 font-bold uppercase text-[10px] block">Production Estimée</span>
          <strong className="text-blue-900 font-black text-sm">~{annualProductionKwh.toLocaleString('fr-FR')} kWh/an</strong>
        </div>

        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
          <span className="text-amber-700 font-bold uppercase text-[10px] block">Orientation Toit</span>
          <strong className="text-amber-900 font-black text-sm">{orientationInfo?.rawOrientationLabel || 'Sud'}</strong>
        </div>
      </div>
    </div>
  );
}
