import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Compass, Info, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, ORIENTATION_COEFFICIENTS } from '@/data/sechoirBatitechModels.js';

const ORIENTATIONS = [
  { id: 'Ouest', label: 'Ouest', angle: 90 },
  { id: 'Sud-Ouest', label: 'Sud-Ouest', angle: 45 },
  { id: 'Sud', label: 'Sud', angle: 0 },
  { id: 'Sud-Est', label: 'Sud-Est', angle: -45 },
  { id: 'Est', label: 'Est', angle: -90 },
];

// Helper pour calculer l'échelle en pixels par mètre selon la latitude et le zoom
function ScaledBuildingMapOverlay({ length = 60, width = 10, angle = 0, modelName = 'BatiTech' }) {
  const map = useMap();
  const [scale, setScale] = useState(4.6);

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

  const wPx = Math.max(30, length * scale);
  const hPx = Math.max(20, width * scale);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
      <motion.div
        className="relative border-2 border-amber-400 bg-amber-500/35 shadow-2xl rounded-sm flex items-center justify-center pointer-events-auto select-none backdrop-blur-2xs"
        style={{
          width: `${wPx}px`,
          height: `${hPx}px`,
        }}
        animate={{ rotate: angle }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        {/* Ligne de faîtage pointillée */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-amber-300 pointer-events-none opacity-80" />

        {/* Badge dimension au centre */}
        <div className="bg-slate-900/90 text-amber-400 font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-md border border-amber-400/50 shadow-lg pointer-events-none whitespace-nowrap z-10">
          {length}m × {width}m
        </div>
      </motion.div>
    </div>
  );
}

function CustomMapControls() {
  const map = useMap();
  return (
    <div className="absolute top-3 left-3 z-[1100] flex flex-col gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
        title="Zoom avant"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
        title="Zoom arrière"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Step3Orientation() {
  const orientation = useSechoirStore((state) => state.orientation) || 'Sud';
  const setOrientation = useSechoirStore((state) => state.setOrientation);
  const selectedModelId = useSechoirStore((state) => state.selectedModelId) || 'BT-6.2.15';
  const latitude = useSechoirStore((state) => state.latitude);
  const longitude = useSechoirStore((state) => state.longitude);
  const address = useSechoirStore((state) => state.address);
  const addressLabel = useSechoirStore((state) => state.addressLabel);

  const model = BATITECH_MODELS[selectedModelId] || BATITECH_MODELS['BT-6.2.15'];

  // Dimensions par modèle
  const dimensionsByModel = {
    'BT-3.1.15': { length: 30, width: 10 },
    'BT-6.2.15': { length: 60, width: 10 },
    'BT-8.3.15': { length: 80, width: 10 },
  };
  const currentDims = dimensionsByModel[selectedModelId] || { length: 60, width: 10 };

  const selectedOrientData = ORIENTATIONS.find((o) => o.id.toLowerCase() === orientation.toLowerCase()) || ORIENTATIONS[2];
  const coeff = ORIENTATION_COEFFICIENTS[orientation] || ORIENTATION_COEFFICIENTS[selectedOrientData.id] || 1.00;

  const mapCenter = (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude)))
    ? [Number(latitude), Number(longitude)]
    : [43.6047, 1.4442]; // Défaut Occitanie/France

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Compass className="text-amber-500 w-6 h-6" />
          Orientation du Bâtiment & Implantation
        </h2>
        <p className="text-slate-300">
          Visualisez l'emprise du séchoir à l'échelle sur votre site et orientez la toiture principale pour optimiser le gisement solaire.
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-blue-200">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Inclinaison de toiture : <strong>15° (Standard Charpente Barconnière)</strong></span>
        </div>
        <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          Modèle : {model.name} ({currentDims.length}m × {currentDims.width}m)
        </span>
      </div>

      {/* Boutons d'orientation */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {ORIENTATIONS.map((opt) => {
          const isSelected = orientation.toLowerCase() === opt.id.toLowerCase();
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setOrientation(opt.id)}
              className={`
                px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-md
                ${isSelected 
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/30 scale-105 font-black' 
                  : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-amber-400/50 hover:bg-slate-700/80'}
              `}
            >
              {opt.label} ({opt.angle > 0 ? `+${opt.angle}°` : `${opt.angle}°`})
            </button>
          );
        })}
      </div>

      {/* Carte satellite interactive avec bâtiment mis à la cote */}
      <div className="relative w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl isolate">
        {/* Guide d'utilisation en haut */}
        <div className="absolute top-3 left-16 right-3 z-[1100] bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 shadow-md flex items-center justify-between pointer-events-none">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <strong className="text-amber-400">{addressLabel || address || 'Parcelle'}</strong>
          </span>
          <span className="hidden sm:inline text-slate-400">Glissez la carte pour déplacer l'emprise</span>
        </div>

        {/* Badge coefficient de production en bas */}
        <div className="absolute bottom-3 right-3 z-[1100] bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-amber-500/40 shadow-xl flex items-center gap-3 pointer-events-none">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Coefficient production</div>
            <div className="text-lg font-black text-amber-400">{coeff.toFixed(2)}</div>
          </div>
          <div className="w-8 h-8 rounded-full border border-amber-400/40 flex items-center justify-center bg-amber-500/10">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <MapContainer
          center={mapCenter}
          zoom={19}
          maxZoom={22}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          zoomControl={false}
          className="w-full h-full"
        >
          <CustomMapControls />
          <ScaledBuildingMapOverlay
            length={currentDims.length}
            width={currentDims.width}
            angle={selectedOrientData.angle}
            modelName={model.name}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={22}
            crossOrigin="anonymous"
            attribution="Esri, Maxar"
          />
        </MapContainer>
      </div>
    </motion.div>
  );
}
