import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Sparkles, SplitSquareHorizontal, Eye, Box, Zap,
  ArrowRightLeft, Building2, MapPin
} from 'lucide-react';

// Ajustement automatique de la vue Leaflet pour garantir un cadrage identique
function AutoCenterMap({ center, zoom = 19 }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !center || !center[0] || !center[1]) return;
    map.invalidateSize();
    map.setView(center, zoom, { animate: false });
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView(center, zoom, { animate: false });
    }, 150);
    return () => clearTimeout(timer);
  }, [map, center, zoom]);
  return null;
}

// Emprise visuelle du bâtiment ou des ombrières pour la carte "APRÈS"
function StructureOverlay({ buildings = [], scale = 4.6, sliderPosition = null }) {
  const map = useMap();
  const [currentScale, setCurrentScale] = useState(scale);

  const updateScale = () => {
    if (!map) return;
    const lat = map.getCenter().lat;
    const zoom = map.getZoom();
    const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
    const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 4.6;
    setCurrentScale(pxPerMeter);
  };

  useEffect(() => {
    updateScale();
    if (!map) return;
    map.on('zoomend', updateScale);
    map.on('moveend', updateScale);
    return () => {
      map.off('zoomend', updateScale);
      map.off('moveend', updateScale);
    };
  }, [map]);

  const clipStyle = typeof sliderPosition === 'number'
    ? {
        clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
        WebkitClipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`
      }
    : {};

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]"
      style={clipStyle}
    >
      {buildings.map((b, idx) => {
        const bLength = Number(b.length || 30);
        const bWidth = Number(b.width || 20);
        const bRot = Number(b.rotation || 0);
        const wPx = Math.max(25, bLength * currentScale);
        const hPx = Math.max(18, bWidth * currentScale);
        const isAsym = (b.buildingType || '').startsWith('asym') || b.buildingType === 'epona';
        const offX = Number(b.offsetX !== undefined ? b.offsetX : (buildings.length > 1 ? (idx * (wPx + 40) - ((buildings.length - 1) * (wPx + 40) / 2)) : 0));
        const offY = Number(b.offsetY || 0);

        return (
          <div
            key={b.id || idx}
            style={{
              position: 'absolute',
              width: `${wPx}px`,
              height: `${hPx}px`,
              transform: `translate(${offX}px, ${offY}px) rotate(${bRot}deg)`,
              transformOrigin: 'center center',
            }}
            className="rounded-lg transition-transform duration-75 select-none"
          >
            {/* Emprise au sol semi-transparente bleue + bordure ambre */}
            <div className="absolute inset-0 bg-blue-600/50 border-[2.5px] border-amber-400 rounded-lg shadow-lg flex flex-col justify-between p-1">
              <div className="flex justify-between items-start text-[9px] font-black text-white drop-shadow">
                <span>{b.length || 30}m</span>
                <span className="w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center text-[10px] font-black shadow-xs">
                  {idx + 1}
                </span>
              </div>

              {/* Ligne de faîtage (axe des modules solaires) */}
              <div
                className="w-full border-t-2 border-dashed border-amber-300"
                style={{ marginTop: isAsym ? '20%' : 'auto', marginBottom: isAsym ? 'auto' : 'auto' }}
              />

              <div className="flex justify-between items-end text-[9px] font-black text-amber-200 drop-shadow">
                <span>{b.width || 20}m</span>
                <span>{b.name || `Bâtiment ${idx + 1}`}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Composant Avant / Après interactif pour la simulation de Structure Métallique & Ombrières Parking
 */
export default function BuildingStructureBeforeAfterViewer({
  mapCenter = [44.8412, -0.5805],
  simBuildings = [],
  buildingLength = 30,
  buildingWidth = 20,
  totalFloorArea = 600,
  installedKwc = 100,
  building3dSnapshot = null,
  isOmbriere = false,
  spotsCount = null,
  cityName = '',
  address = '',
  onVisualChoiceChange = null,
  initialLeftChoice = 'before'
}) {
  // Choix du visuel de gauche : 'before' (Satellite terrain/parking nu) ou '3d' (Vue 3D)
  const [leftChoice, setLeftChoice] = useState(initialLeftChoice);
  // Mode d'affichage : 'side-by-side' | 'slider' | 'left-only' | 'right-only'
  const [viewMode, setViewMode] = useState('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  // Mise à jour du choix et notification au parent
  const handleToggleLeftChoice = (choice) => {
    setLeftChoice(choice);
    if (choice === '3d' && viewMode === 'slider') {
      setViewMode('side-by-side');
    }
    if (onVisualChoiceChange) {
      onVisualChoiceChange({
        leftVisualChoice: choice,
        visualChoice: choice === '3d' ? '3d_and_after' : 'before_after'
      });
    }
  };

  // Slider 50/50 interactif
  const handleSliderMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, pos)));
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    handleSliderMove(e.clientX);
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const handlePointerMove = (e) => {
    if (isDragging.current) {
      handleSliderMove(e.clientX);
    }
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    if (e.currentTarget.releasePointerCapture) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const fallback3dImg = isOmbriere ? '/ombriere_vl_double.jpg' : null;
  const effective3dImg = building3dSnapshot || fallback3dImg;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-4">
      {/* ─── EN-TÊTE DU COMPARATIF ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <SplitSquareHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              Visuel Avant / Après de votre {isOmbriere ? "Projet d'Ombrières Parking" : "Structure Métallique Solaire"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isOmbriere
                ? `Intégration de ${spotsCount ? `${spotsCount} places abritées` : 'modules photovoltaïques'} (${installedKwc} kWc) sur ${totalFloorArea} m².`
                : `Intégration de votre bâtiment ${buildingLength.toFixed(1)}m × ${buildingWidth.toFixed(1)}m (${totalFloorArea} m² — ${installedKwc} kWc).`}
            </p>
          </div>
        </div>

        {/* ─── SÉLECTEURS DE CONTRÔLE (CHOIX GAUCHE & MODE D'AFFICHAGE) ────── */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
          
          {/* SÉLECTEUR DU VISUEL DE GAUCHE : SATELLITE AVANT vs VUE 3D */}
          <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-2xl border border-amber-200">
            <span className="text-[10px] font-black text-amber-900 uppercase px-1.5 hidden sm:inline">
              Visuel Gauche :
            </span>
            <button
              type="button"
              onClick={() => handleToggleLeftChoice('before')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                leftChoice === 'before'
                  ? 'bg-amber-600 text-white shadow-sm font-black'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
              }`}
              title="Afficher la photo satellite du terrain ou parking d'origine à gauche"
            >
              <Eye className="w-3.5 h-3.5" />
              Vue Avant
            </button>

            <button
              type="button"
              onClick={() => handleToggleLeftChoice('3d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                leftChoice === '3d'
                  ? 'bg-[#0e2b4d] text-white shadow-sm font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Afficher le modèle 3D du bâtiment ou de l'ombrière à gauche"
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              Vue 3D
            </button>
          </div>

          {/* SÉLECTEUR DE MODE D'AFFICHAGE */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              Côte à côte
            </button>

            {leftChoice === 'before' && (
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'slider'
                    ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Curseur 50/50
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode('left-only')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'left-only'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {leftChoice === '3d' ? '3D seul' : 'Avant seul'}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('right-only')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'right-only'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3" />
              Après seul
            </button>
          </div>

        </div>
      </div>

      {/* ─── ZONE 1 : MODE CÔTE À CÔTE (GRILLE 2 COLONNES) ────────────────── */}
      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* CARTE DE GAUCHE : VUE AVANT (SATELLITE BRUT) OU VUE 3D SELON LE CHOIX */}
          {leftChoice === 'before' ? (
            <div className="relative h-[400px] sm:h-[440px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-950">
              <MapContainer
                center={mapCenter}
                zoom={19}
                maxZoom={23}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                className="w-full h-full pointer-events-none"
              >
                <AutoCenterMap center={mapCenter} zoom={19} />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={19}
                  maxZoom={23}
                  crossOrigin="anonymous"
                />
              </MapContainer>
              <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded-xl text-xs font-black border border-slate-700 flex items-center gap-1.5 shadow-md">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                AVANT : {isOmbriere ? `Parking d'origine (${totalFloorArea} m²)` : `Terrain d'accueil (${totalFloorArea} m²)`}
              </div>
              <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/80 backdrop-blur text-slate-300 px-3 py-1 rounded-xl text-[11px] font-semibold border border-white/10 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span className="truncate max-w-[240px]">{address || cityName || 'Site du projet'}</span>
              </div>
            </div>
          ) : (
            <div className="relative h-[400px] sm:h-[440px] rounded-3xl overflow-hidden border border-slate-300 shadow-md bg-slate-900 flex items-center justify-center">
              {effective3dImg ? (
                <img
                  src={effective3dImg}
                  alt="Vue 3D"
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
                  <p className="text-sm font-bold text-white">Modèle 3D Numérique</p>
                  <p className="text-xs text-slate-400">
                    {buildingLength.toFixed(1)}m × {buildingWidth.toFixed(1)}m ({totalFloorArea} m²)
                  </p>
                </div>
              )}
              <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur text-amber-300 px-3 py-1.5 rounded-xl text-xs font-black border border-amber-500/40 flex items-center gap-1.5 shadow-md">
                <Box className="w-3.5 h-3.5 text-amber-400" />
                VUE 3D : {isOmbriere ? 'Ombrière Photovoltaïque' : `Hangar Solaire ${buildingLength.toFixed(1)}m × ${buildingWidth.toFixed(1)}m`}
              </div>
            </div>
          )}

          {/* CARTE DE DROITE : APRÈS (IMPLANTATION SATELLITE AU MÊME ZOOM ET MÊME CENTRE) */}
          <div className="relative h-[400px] sm:h-[440px] rounded-3xl overflow-hidden border border-emerald-300 shadow-md bg-slate-950">
            <MapContainer
              center={mapCenter}
              zoom={19}
              maxZoom={23}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              className="w-full h-full pointer-events-none"
            >
              <AutoCenterMap center={mapCenter} zoom={19} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
              />
              <StructureOverlay
                buildings={simBuildings.length > 0 ? simBuildings : [{ length: buildingLength, width: buildingWidth, name: 'Bâtiment 1' }]}
                sliderPosition={null}
              />
            </MapContainer>
            <div className="absolute top-3 left-3 z-[1000] bg-emerald-950/90 backdrop-blur text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-black border border-emerald-500/50 flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              APRÈS : {installedKwc} kWc ({simBuildings.length > 1 ? `${simBuildings.length} bâtiments` : `${totalFloorArea} m²`})
            </div>
            <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/85 backdrop-blur text-emerald-400 px-3 py-1 rounded-xl text-[11px] font-bold border border-white/10">
              ⚡ Puissance garantie
            </div>
          </div>

        </div>
      )}

      {/* ─── ZONE 2 : MODE CURSEUR 50/50 INTERACTIF ──────────────────────── */}
      {viewMode === 'slider' && leftChoice === 'before' && (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full h-[460px] sm:h-[530px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 select-none bg-slate-950 cursor-ew-resize touch-none"
        >
          {/* CARTE SATELLITE UNIQUE (Fond Avant & Après avec exact même zoom) */}
          <div className="absolute inset-0 w-full h-full">
            <MapContainer
              center={mapCenter}
              zoom={19}
              maxZoom={23}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              className="w-full h-full pointer-events-none"
            >
              <AutoCenterMap center={mapCenter} zoom={19} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
              />
              <StructureOverlay
                buildings={simBuildings.length > 0 ? simBuildings : [{ length: buildingLength, width: buildingWidth, name: 'Bâtiment 1' }]}
                sliderPosition={sliderPosition}
              />
            </MapContainer>
          </div>

          {/* Badge Avant (Haut Gauche) */}
          <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black tracking-wide">
              AVANT : {isOmbriere ? `Parking d'origine (${totalFloorArea} m²)` : `Terrain d'accueil (${totalFloorArea} m²)`}
            </span>
          </div>

          {/* Badge Après (Haut Droite) */}
          <div className="absolute top-4 right-4 z-[1000] bg-emerald-950/90 backdrop-blur-md text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none">
            <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-black tracking-wide">
              APRÈS : {installedKwc} kWc
            </span>
          </div>

          {/* Curseur et Séparateur */}
          <div
            className="absolute top-0 bottom-0 z-[1500] pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]" />
            <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 rounded-full bg-white text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center justify-center border-2 border-blue-500 hover:scale-110 active:scale-95 transition-transform">
              <ArrowRightLeft className="w-4 h-4 text-blue-700" />
            </div>
          </div>

          {/* Instruction et bandeau récapitulatif positionné en bas */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold border border-white/25 shadow-xl flex items-center gap-2 pointer-events-none whitespace-nowrap">
            <span>📐 {totalFloorArea} m² &bull; {installedKwc} kWc</span>
          </div>
        </div>
      )}

      {/* ─── ZONE 3 : MODE VUE SEULE (GAUCHE OU DROITE) ───────────────────── */}
      {viewMode === 'left-only' && (
        <div className="relative h-[460px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-950">
          {leftChoice === 'before' ? (
            <MapContainer
              center={mapCenter}
              zoom={19}
              maxZoom={23}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              className="w-full h-full pointer-events-none"
            >
              <AutoCenterMap center={mapCenter} zoom={19} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
              />
            </MapContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              {effective3dImg ? (
                <img src={effective3dImg} alt="Vue 3D" className="w-full h-full object-cover" />
              ) : (
                <p className="text-white font-bold">Modèle 3D Numérique</p>
              )}
            </div>
          )}
          <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded-xl text-xs font-black border border-slate-700">
            {leftChoice === '3d' ? 'VUE 3D' : 'AVANT : Terrain d\'origine'}
          </div>
        </div>
      )}

      {viewMode === 'right-only' && (
        <div className="relative h-[460px] rounded-3xl overflow-hidden border border-emerald-300 shadow-md bg-slate-950">
          <MapContainer
            center={mapCenter}
            zoom={19}
            maxZoom={23}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            className="w-full h-full pointer-events-none"
          >
            <AutoCenterMap center={mapCenter} zoom={19} />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={19}
              maxZoom={23}
              crossOrigin="anonymous"
            />
            <StructureOverlay
              buildings={simBuildings.length > 0 ? simBuildings : [{ length: buildingLength, width: buildingWidth, name: 'Bâtiment 1' }]}
              sliderPosition={null}
            />
          </MapContainer>
          <div className="absolute top-3 left-3 z-[1000] bg-emerald-950/90 backdrop-blur text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-black border border-emerald-500/50">
            APRÈS : {installedKwc} kWc
          </div>
        </div>
      )}

      {/* Note d'information pour le PDF */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 pt-1 border-t border-slate-100">
        <span>
          💡 Le PDF généré reprendra fidèlement la vue choisie (<strong>{leftChoice === '3d' ? 'Vue 3D + Satellite' : 'Vue Avant / Après Côte à côte'}</strong>).
        </span>
        <span className="font-bold text-slate-700 hidden sm:inline">
          Échelle 100% calibrée au sol
        </span>
      </div>
    </div>
  );
}
