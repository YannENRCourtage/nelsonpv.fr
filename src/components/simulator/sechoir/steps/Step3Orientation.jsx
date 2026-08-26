import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Compass, Info, MapPin, ZoomIn, ZoomOut, Building } from 'lucide-react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, ORIENTATION_COEFFICIENTS } from '@/data/sechoirBatitechModels.js';

// ─── OVERLAY BÂTIMENT MIS À L'ÉCHELLE SUR LA CARTE ───────────────────────────
function ScaledBuildingMapOverlay({ length = 18, width = 20, rotation = 0, modelName = 'BatiTech', onCenterChange }) {
  const map = useMap();
  const [scale, setScale] = useState(4.6);

  const updateScale = () => {
    const lat = map.getCenter().lat;
    const zoom = map.getZoom();
    const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
    const pxPerMeter = metersPerPx > 0 ? (1 / metersPerPx) : 4.6;
    setScale(pxPerMeter);
    if (onCenterChange) {
      const center = map.getCenter();
      onCenterChange([center.lat, center.lng]);
    }
  };

  useMapEvents({
    zoomend: updateScale,
    moveend: updateScale,
    zoom: updateScale,
  });

  useEffect(() => {
    updateScale();
  }, []);

  const wPx = Math.max(30, length * scale);
  const hPx = Math.max(20, width * scale);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
      <div
        className="relative border-2 border-blue-400 bg-blue-600/40 shadow-2xl ring-2 ring-amber-400 flex items-center justify-center pointer-events-auto select-none transition-transform duration-75"
        style={{
          width: `${wPx}px`,
          height: `${hPx}px`,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {/* Ligne de faîtage pointillée orange */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-amber-400 pointer-events-none" />

        {/* Rond avec le numéro du bâtiment ① */}
        <div className="w-8 h-8 rounded-full bg-white text-slate-900 font-black text-sm border-2 border-slate-900 flex items-center justify-center shadow-xl pointer-events-none z-10">
          1
        </div>
      </div>
    </div>
  );
}

// ─── CONTRÔLES DE ZOOM PERSONNALISÉS ──────────────────────────────────────────
function CustomMapControls() {
  const map = useMap();
  return (
    <div className="absolute top-14 left-4 z-[1100] flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-lg">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="p-2 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
        title="Zoom avant"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="p-2 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
        title="Zoom arrière"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── INDICATEUR DE NIVEAU DE ZOOM ─────────────────────────────────────────────
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
    <div className="absolute bottom-4 left-4 z-[1100] bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-bold border border-white/20 shadow-md flex items-center gap-2 pointer-events-none">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>Niveau de zoom : {zoom}</span>
    </div>
  );
}

export default function Step3Orientation() {
  const orientation = useSechoirStore((state) => state.orientation) || 'sud';
  const setOrientation = useSechoirStore((state) => state.setOrientation);
  const setRotationInStore = useSechoirStore((state) => state.setRotation);
  const setMapCenterInStore = useSechoirStore((state) => state.setMapCenter);
  const selectedModelId = useSechoirStore((state) => state.selectedModelId) || 'BT-3.1.15';
  const latitude = useSechoirStore((state) => state.latitude);
  const longitude = useSechoirStore((state) => state.longitude);
  const address = useSechoirStore((state) => state.address);
  const addressLabel = useSechoirStore((state) => state.addressLabel);

  const model = BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-3.1.15'];

  // Dimensions réelles du modèle sélectionné
  const dimensionsByModel = {
    'BT-3.1.15': { length: 18, width: 20 },
    'BT-6.2.15': { length: 36, width: 20 },
    'BT-8.3.15': { length: 48, width: 20 },
  };
  const currentDims = dimensionsByModel[selectedModelId] || { length: model.length || 18, width: model.width || 20 };
  const surface = currentDims.length * currentDims.width;

  // Angle de rotation numérique
  const orientationToAngle = (orient) => {
    switch ((orient || '').toLowerCase()) {
      case 'ouest': return 90;
      case 'sud-ouest': return 45;
      case 'sud': return 0;
      case 'sud-est': return -45;
      case 'est': return -90;
      default:
        const parsed = Number(orient);
        return !isNaN(parsed) ? parsed : 0;
    }
  };

  const angleToOrientationName = (ang) => {
    if (ang >= -22 && ang <= 22) return 'sud';
    if (ang > 22 && ang <= 67) return 'sud-ouest';
    if (ang > 67 && ang <= 112) return 'ouest';
    if (ang < -22 && ang >= -67) return 'sud-est';
    if (ang < -67 && ang >= -112) return 'est';
    return ang > 0 ? 'ouest' : 'est';
  };

  const storeRotation = useSechoirStore((state) => state.rotation);
  const [rotation, setRotation] = useState(storeRotation !== undefined ? storeRotation : orientationToAngle(orientation));

  const handleRotationChange = (val) => {
    setRotation(val);
    setRotationInStore(val);
    setOrientation(angleToOrientationName(val));
  };

  const setPresetAngle = (ang) => {
    setRotation(ang);
    setRotationInStore(ang);
    setOrientation(angleToOrientationName(ang));
  };

  const mapCenter = (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude)))
    ? [Number(latitude), Number(longitude)]
    : [43.6047, 1.4442];

  useEffect(() => {
    setMapCenterInStore(mapCenter);
    setRotationInStore(rotation);
  }, [latitude, longitude, rotation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══ COLONNE GAUCHE (4 colonnes) — PANNEAU DE CONTRÔLES ═══ */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Titre & Description */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xl font-black text-white flex items-center gap-2.5">
              <Compass className="w-6 h-6 text-amber-400" />
              Implantation Satellite
            </h3>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              L'emprise ({currentDims.length}.0m × {currentDims.width}.0m — {surface} m²) reste au centre. Déplacez la carte ci-contre pour caler votre parcelle sous le bâtiment.
            </p>
          </div>

          {/* Sélecteur de bâtiment */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              BÂTIMENTS (1)
            </span>
            <div className="w-full bg-blue-600/30 border border-blue-400/60 text-blue-200 font-bold px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between shadow-inner">
              <span className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                Bâtiment 1 ({model.name})
              </span>
              <span className="text-xs bg-blue-500/20 px-2.5 py-0.5 rounded border border-blue-400/30 font-semibold">Actif</span>
            </div>
          </div>

          {/* Curseur et Presets d'Orientation */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-400" />
                Orientation (Bâtiment 1)
              </span>
              <span className="text-base font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/30">
                {rotation > 0 ? `+${rotation}°` : `${rotation}°`}
              </span>
            </div>

            {/* CURSEUR RANGE SLIDER */}
            <div className="space-y-1.5">
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(e) => handleRotationChange(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>-180° (Nord)</span>
                <span>0° (Sud)</span>
                <span>+180° (Nord)</span>
              </div>
            </div>

            {/* Bouton Plein Sud */}
            <button
              type="button"
              onClick={() => setPresetAngle(0)}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all border ${
                rotation === 0
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-700/70 hover:text-white'
              }`}
            >
              Plein Sud (0°)
            </button>

            {/* Boutons d'orientation rapide */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sud-Ouest (45°)', angle: 45 },
                { label: 'Sud (0°)', angle: 0 },
                { label: 'Sud-Est (-45°)', angle: -45 },
                { label: 'Ouest (90°)', angle: 90 },
                { label: 'Plein Nord', angle: 180 },
                { label: 'Est (-90°)', angle: -90 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setPresetAngle(item.angle)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all border truncate ${
                    rotation === item.angle
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* SPÉCIFICATIONS GLOBALES */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-2.5 text-sm">
            <span className="font-bold uppercase tracking-wider text-slate-400 block text-xs">
              SPÉCIFICATIONS GLOBALES (1 BÂT.) :
            </span>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span>Bâtiment 1 ({model.name}) :</span>
                <span className="font-bold text-white">{currentDims.length}.0m × {currentDims.width}.0m ({surface} m²)</span>
              </div>
              <div className="flex justify-between">
                <span>Surface totale cumulée :</span>
                <span className="font-bold text-white">{surface} m²</span>
              </div>
              <div className="flex justify-between">
                <span>Puissance Solaire Globale :</span>
                <span className="font-bold text-amber-400">{model?.puissanceKwc || 30.15} kWc</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLONNE DROITE (8 colonnes) — CARTE SATELLITE ═══ */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative w-full h-[480px] sm:h-[560px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 isolate">
            
            {/* Encart guide flottant */}
            <div className="absolute top-4 left-20 right-4 z-[1100] bg-slate-900/85 backdrop-blur-md text-white text-sm font-bold px-4 py-2.5 rounded-2xl border border-white/20 shadow-md text-center pointer-events-none">
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
              <CustomMapControls />
              <ZoomLevelIndicator />
              <ScaledBuildingMapOverlay
                length={currentDims.length}
                width={currentDims.width}
                rotation={rotation}
                modelName={model.name}
                onCenterChange={(newCenter) => setMapCenterInStore(newCenter)}
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={19}
                maxZoom={23}
                crossOrigin="anonymous"
                attribution="Esri, Maxar"
              />
            </MapContainer>
          </div>

          {/* Badge adresse sous le bâtiment */}
          <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-2.5 text-sm text-emerald-300 shadow-md">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold uppercase text-xs text-emerald-400">Adresse actuelle sous le bâtiment :</span>
            <strong className="truncate text-white text-sm">{addressLabel || address || 'Parcelle sélectionnée'}</strong>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
