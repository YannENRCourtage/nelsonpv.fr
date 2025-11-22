
import React, { useRef, useState, useEffect, Fragment } from "react";
import {
  MapContainer,
  LayerGroup,
  Marker,
  Polyline,
  Polygon,
  Rectangle,
  Tooltip,
  Popup,
  useMapEvents,
  useMap,
  ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import MapDrawingTools from "./MapDrawingTools.jsx";
import html2canvas from "html2canvas";
import SearchField from "./SearchField.jsx";
import { toast } from "@/components/ui/use-toast.js";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { X as XIcon, Download, Save, Copy, RotateCw, MapPin } from 'lucide-react';
import { mapData } from "@/lib/nomenclature.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";

// --- Clé API IGN ---
// 👇 COPIEZ VOTRE CLÉ API GÉOSERVICES IGN CI-DESSOUS 👇
// (Obtenue en s'abonnant au service "Altimétrie")
const VOTRE_CLE_IGN = "VOTRE_CLE_API_IGN_A_METTRE_ICI";
// 👆 ASSUREZ-VOUS D'AVOIR AUTORISÉ VOTRE DOMAINE (nelsonpv.fr) POUR CETTE CLÉ 👆

// --- Styles de secours pour les Toasts (pop-ups) ---
const toastStyle = { className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg" };
const destructiveToastStyle = { className: "bg-red-100 text-red-900 p-4 border border-red-400 rounded-lg shadow-lg" };


// --- Utility Functions ---
const R = 6371000;
function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }
function haversine(a, b) {
  if (!a || !b) return 0;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function polylineLength(coords) {
  if (!coords || coords.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]);
  return d;
}
function polygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(coords[i].lat);
    const lng1 = toRad(coords[i].lng);
    const lat2 = toRad(coords[j].lat);
    const lng2 = toRad(coords[j].lng);
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = (area * R * R) / 2;
  return Math.abs(area);
}
function centroid(coords) {
  if (!coords || coords.length === 0) return null;
  try {
    let lat = 0, lng = 0;
    coords.forEach(c => { lat += c.lat; lng += c.lng; });
    return L.latLng(lat / coords.length, lng / coords.length);
  } catch (e) { return null; }
}
function midpointOfLine(coords) {
  if (!coords || coords.length < 2) return null;
  const total = polylineLength(coords);
  if (total === 0) return coords[0];
  const target = total / 2;
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = haversine(coords[i - 1], coords[i]);
    if (acc + seg >= target) {
      const ratio = (target - acc) / seg;
      return L.latLng(
        coords[i - 1].lat + (coords[i].lat - coords[i - 1].lat) * ratio,
        coords[i - 1].lng + (coords[i].lng - coords[i - 1].lng) * ratio
      );
    }
    acc += seg;
  }
  return coords[Math.floor(coords.length / 2)];
}
function formatDistance(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`; }
function formatArea(m2) { return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²`; }

// Custom Azimuth Calculation: 0=South, 180=North, 90=West, -90=East
function calculateCustomAzimuth(a, b) {
  const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = toDeg(Math.atan2(y, x)); // -180 to 180, 0=North, 90=East
  let standard = (brng + 360) % 360;
  let custom = standard - 180;
  if (custom > 180) custom -= 360;
  if (custom <= -180) custom += 360;
  if (custom === -180) custom = 180;
  return custom;
}


// --- Icons ---
const textIcon = (txt) => L.divIcon({
  className: "rounded bg-card/90 text-card-foreground px-2 py-[2px] border border-border shadow text-[13px] cursor-move",
  html: txt ? L.Util.escapeHTML(txt) : "",
});
const symbolIcon = (emoji, number = null) => L.divIcon({
  html: `<div class="flex flex-col items-center cursor-grab relative">
           <div class="bg-white rounded-full p-2 shadow-lg border-2 border-border text-xl">${emoji}</div>
           ${number ? `<span class="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">${number}</span>` : ''}
           <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white -mt-1"></div>
         </div>`,
  className: 'bg-transparent border-none',
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});
const photoIcon = (number) => L.divIcon({
  html: `<div class="flex items-center justify-center bg-white rounded-full shadow-lg border-2 border-blue-500 h-8 w-8 font-bold text-blue-600 cursor-grab">${number}</div>`,
  className: 'bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const rotationIcon = L.divIcon({
  html: `<div class="bg-white rounded-full p-1 shadow-lg border-2 border-blue-500 cursor-alias text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L12 12h9V3"/></svg></div>`,
  className: 'bg-transparent border-none',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
const targetIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-8 h-8">
             <div class="absolute w-full h-0.5 bg-red-500"></div>
             <div class="absolute h-full w-0.5 bg-red-500"></div>
             <div class="absolute w-4 h-4 border-2 border-red-500 rounded-full"></div>
           </div>`,
  className: 'bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const pegmanIcon = L.divIcon({
  html: `<div class="text-4xl filter drop-shadow-lg cursor-grab active:cursor-grabbing">🏃</div>`, // Using emoji as placeholder for Pegman
  className: 'bg-transparent border-none',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// --- Components ---

function TextInputPopup({ at, onCancel, onSubmit }) {
  const [value, setValue] = useState("");
  return (
    <Marker position={at} opacity={0}>
      <Popup autoClose={false} closeOnClick={false} closeButton={false} autoPan={true}>
        <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }} className="min-w-[260px] space-y-2">
          <label className="text-sm text-muted-foreground">Texte</label>
          <input autoFocus className="w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Saisir le texte…" />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white text-sm">OK</button>
            <button type="button" className="rounded bg-secondary px-3 py-1 text-sm text-secondary-foreground" onClick={onCancel}>Annuler</button>
          </div>
        </form>
      </Popup>
    </Marker>
  );
}

function useDeleteKey(onDelete) {
  useEffect(() => {
    const h = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (e.key === "Delete" || e.key === "Backspace") onDelete();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onDelete]);
}

function ContextMenu({ position, onAddText, onClose, onShowInfo, onSetTarget }) {
  const map = useMap();
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) onClose(); };
    map.on('click', handleClickOutside);
    return () => map.off('click', handleClickOutside);
  }, [map, onClose]);

  const copyCoords = () => {
    const coords = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coords).then(() => toast({ ...toastStyle, title: "Coordonnées copiées !", description: coords }));
    onClose();
  };

  return (
    <Marker position={position} opacity={0}>
      <Popup autoClose={false} closeOnClick={false} closeButton={false} autoPan={false} minWidth={150}>
        <div ref={menuRef} className="flex flex-col gap-1">
          <button onClick={onSetTarget} className="text-left text-sm p-1 hover:bg-accent rounded font-semibold text-blue-600">Inspecter ce point</button>
          <button onClick={onShowInfo} className="text-left text-sm p-1 hover:bg-accent rounded">Infos détaillées</button>
          <button onClick={copyCoords} className="text-left text-sm p-1 hover:bg-accent rounded">Copier GPS</button>
          <button onClick={onAddText} className="text-left text-sm p-1 hover:bg-accent rounded">Ajouter texte</button>
        </div>
      </Popup>
    </Marker>
  );
}

function EditLayer({ mode, setMode, features, setFeatures, temp, setTemp, selectedId, setSelectedId, askTextAt, setAskTextAt, symbolToPlace, setSymbolToPlace, setPointInfo, setAltimetryProfile, rectangleStart, setRectangleStart, photoToPlace, setPhotoToPlace, targetPos, setTargetPos }) {
  const [mousePos, setMousePos] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const draggingRef = useRef(null);
  const map = useMap();

  useDeleteKey(() => {
    if (!selectedId) return;
    setFeatures((arr) => arr.filter((f) => f.id !== selectedId));
    setSelectedId(null);
  });

  const handleAltimetry = async (line) => {
    if (VOTRE_CLE_IGN === "VOTRE_CLE_API_IGN_A_METTRE_ICI") {
      toast({ ...destructiveToastStyle, title: "Clé API manquante", description: "Veuillez configurer votre clé API IGN dans MapElements.jsx pour utiliser l'altimétrie." });
      return;
    }
    const totalDist = polylineLength(line);
    const samples = Math.min(100, Math.max(10, Math.round(totalDist / 5)));
    const points = [];
    let accumulatedDist = 0;

    if (line.length > 0) points.push({ lat: line[0].lat, lng: line[0].lng, dist: 0, alt: null });

    for (let i = 1; i < line.length; i++) {
      const segmentDist = haversine(line[i - 1], line[i]);
      const segmentSamples = Math.max(1, Math.round(samples * (segmentDist / totalDist)));
      for (let j = 1; j <= segmentSamples; j++) {
        const ratio = j / segmentSamples;
        const lat = line[i - 1].lat + (line[i].lat - line[i - 1].lat) * ratio;
        const lng = line[i - 1].lng + (line[i].lng - line[i - 1].lng) * ratio;
        accumulatedDist += segmentDist / segmentSamples;
        points.push({ lat, lng, dist: accumulatedDist, alt: null });
      }
    }

    const lons = points.map(p => p.lng).join('|');
    const lats = points.map(p => p.lat).join('|');

    try {
      const res = await fetch(`https://wxs.ign.fr/${VOTRE_CLE_IGN}/alti/rest/elevation.json?lon=${lons}&lat=${lats}&zonly=true`);
      if (!res.ok) throw new Error('Failed to fetch elevation data');
      const data = await res.json();

      let denivelePos = 0;
      let deniveleNeg = 0;
      let maxPente = 0;

      const profileData = data.elevations.map((elev, i) => {
        points[i].alt = elev.z;
        if (i > 0) {
          const diff = points[i].alt - points[i - 1].alt;
          if (diff > 0) denivelePos += diff;
          else deniveleNeg += Math.abs(diff);
          const dist = points[i].dist - points[i - 1].dist;
          if (dist > 0) {
            const pente = Math.abs(diff / dist) * 100;
            if (pente > maxPente) maxPente = pente;
          }
        }
        return { distance: Math.round(points[i].dist), altitude: elev.z };
      });

      const penteMoyenne = totalDist > 0 ? ((denivelePos + deniveleNeg) / totalDist) * 100 : 0;
      setAltimetryProfile({ data: profileData, line, stats: { distance: totalDist, denivelePos, deniveleNeg, penteMoyenne, maxPente } });
    } catch (error) {
      console.error("Altimetry error:", error);
      toast({ ...destructiveToastStyle, title: "Erreur de profil altimétrique", description: "Impossible de récupérer les données d'altitude. (Vérifiez votre clé API IGN et le domaine autorisé).", duration: 7000 });
    }
  };

  const showPointInfo = (latlng) => {
    setPointInfo({ latlng: latlng, address: 'Chargement...', altitude: 'Chargement...', parcel: 'Chargement...' });
    const siteSymbol = mapData.symbols.find(s => s.key === 'site');
    if (siteSymbol) {
      const id = crypto.randomUUID();
      setFeatures(fs => [...fs, { id, type: 'symbol', symbolType: siteSymbol.key, label: siteSymbol.label, at: latlng, emoji: siteSymbol.emoji, number: null }]);
    }
  };

  useMapEvents({
    click(e) {
      if (contextMenu) setContextMenu(null);
      if (draggingRef.current && draggingRef.current.type === 'rotate') return;
      if (mode === 'delete') return;
      if (photoToPlace) {
        const id = crypto.randomUUID();
        setFeatures(fs => [...fs, { id, type: 'photo', photoId: photoToPlace.id, number: photoToPlace.number, at: e.latlng }]);
        setPhotoToPlace(null); setMode(null);
      } else if (symbolToPlace) {
        const id = crypto.randomUUID();
        let number = null;
        if (symbolToPlace.type === 'building') {
          const buildingCount = features.filter(f => f.symbolType === 'building').length;
          number = buildingCount + 1;
        }
        setFeatures(fs => [...fs, { id, type: 'symbol', symbolType: symbolToPlace.type, label: symbolToPlace.label, at: e.latlng, emoji: symbolToPlace.emoji, number }]);
        setSymbolToPlace(null); setMode(null);
      } else if (mode === "rectangle") {
        if (!rectangleStart) setRectangleStart(e.latlng);
        else {
          const id = crypto.randomUUID();
          const b = L.latLngBounds(rectangleStart, e.latlng);
          const ne = b.getNorthEast(); const sw = b.getSouthWest();
          const nw = L.latLng(ne.lat, sw.lng); const se = L.latLng(sw.lat, ne.lng);
          setFeatures(arr => [...arr, { id, type: "rectangle", coords: [nw, ne, se, sw], angle: 0 }]);
          setRectangleStart(null); setMode(null);
        }
      } else if (mode === "line" || mode === "polygon" || mode === "altimetry" || mode === "azimuth") {
        if (mode === "line" || mode === "azimuth") {
          if (temp.length === 0) setTemp([e.latlng]);
          else setTemp((t) => [...t, e.latlng]);
        } else {
          if (temp.length === 0) setTemp([e.latlng]);
          else setTemp((t) => [...t, e.latlng]);
        }
      } else setSelectedId(null);
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      if (!draggingRef.current) setContextMenu({ position: e.latlng });
    },
    mousemove(e) {
      setMousePos(e.latlng);
      if (draggingRef.current) {
        const { type, featureId, startLatLng } = draggingRef.current;
        setFeatures(prevFeatures => prevFeatures.map(f => {
          if (f.id !== featureId) return f;
          if (type === 'drag') {
            const deltaLat = e.latlng.lat - startLatLng.lat;
            const deltaLng = e.latlng.lng - startLatLng.lng;
            if (f.type === 'line' || f.type === 'polygon' || f.type === 'rectangle') return { ...f, coords: f.coords.map(c => ({ lat: c.lat + deltaLat, lng: c.lng + deltaLng })) };
            if (f.type === 'symbol' || f.type === 'photo' || f.type === 'text') return { ...f, at: { lat: f.at.lat + deltaLat, lng: f.at.lng + deltaLng } };
          } else if (type === 'rotate' && f.type === 'rectangle') {
            const centerPt = map.latLngToLayerPoint(draggingRef.current.center);
            const mousePt = map.latLngToLayerPoint(e.latlng);
            const newAngle = Math.atan2(mousePt.y - centerPt.y, mousePt.x - centerPt.x) * (180 / Math.PI) - 90;
            return { ...f, angle: newAngle };
          }
          return f;
        }));
        if (type === 'drag') draggingRef.current.startLatLng = e.latlng;
      }
    },
    mouseup() { if (draggingRef.current) draggingRef.current = null; },
    dblclick() {
      if (mode === "line" && temp.length >= 2) {
        const id = crypto.randomUUID();
        setFeatures((arr) => [...arr, { id, type: "line", coords: temp.slice() }]);
        setTemp([]);
      }
      if (mode === "polygon" && temp.length >= 3) {
        const id = crypto.randomUUID();
        setFeatures((arr) => [...arr, { id, type: "polygon", coords: temp.slice() }]);
        setTemp([]);
      }
      if (mode === "altimetry" && temp.length >= 2) {
        handleAltimetry(temp.slice());
        setTemp([]);
        setMode(null);
      }
      if (mode === "azimuth") {
        // Azimuth is usually 2 points. If double click, just finish.
        setTemp([]);
        setMode(null);
      }
    },
    keydown(e) {
      if (e.originalEvent.key === "Escape") {
        setTemp([]); setAskTextAt(null); setSymbolToPlace(null); setPhotoToPlace(null); setMode(null); setContextMenu(null); setPointInfo(null); setAltimetryProfile(null); setRectangleStart(null);
      }
      if (e.originalEvent.key === "Enter") {
        if (mode === "line" && temp.length >= 2) {
          const id = crypto.randomUUID();
          setFeatures((arr) => [...arr, { id, type: "line", coords: temp.slice() }]);
          setTemp([]);
        }
        if (mode === "polygon" && temp.length >= 3) {
          const id = crypto.randomUUID();
          setFeatures((arr) => [...arr, { id, type: "polygon", coords: temp.slice() }]);
          setTemp([]);
        }
        if (mode === "altimetry" && temp.length >= 2) {
          handleAltimetry(temp.slice());
          setTemp([]);
          setMode(null);
        }
        if (mode === "azimuth") {
          setTemp([]);
          setMode(null);
        }
      }
      if (e.originalEvent.key.toLowerCase() === "r" && temp.length > 0) setTemp((t) => t.slice(0, -1));
    },
  });

  const tempLineCoords = mousePos && temp.length >= 1 ? [...temp, mousePos] : temp;
  const tempPolyCoords = mousePos && temp.length >= 1 ? [...temp, mousePos] : temp;
  const tempRectBounds = rectangleStart && mousePos ? L.latLngBounds(rectangleStart, mousePos) : null;

  return (
    <LayerGroup>
      {features.map((f) => {
        const isSelected = selectedId === f.id;
        const baseEventHandlers = {
          click: (e) => { L.DomEvent.stop(e); if (mode === 'delete') setFeatures(fs => fs.filter(item => item.id !== f.id)); else setSelectedId(f.id); },
          contextmenu: (e) => { L.DomEvent.stop(e); if (mode || draggingRef.current) return; draggingRef.current = { type: 'drag', featureId: f.id, startLatLng: e.latlng }; }
        };
        const shapeEventHandlers = { ...baseEventHandlers, mousedown: (e) => { L.DomEvent.stop(e); if (mode || draggingRef.current) return; draggingRef.current = { type: 'drag', featureId: f.id, startLatLng: e.latlng }; } };

        if (f.type === "line") return <Polyline key={f.id} positions={f.coords} pathOptions={{ color: isSelected ? "#0ea5e9" : "#2563eb", weight: 3, className: mode ? '' : 'cursor-grab' }} eventHandlers={shapeEventHandlers}><Tooltip permanent direction="center" className="measure-label">{formatDistance(polylineLength(f.coords))}</Tooltip></Polyline>;

        if (f.type === "polygon") return <Polygon key={f.id} positions={f.coords} pathOptions={{ color: isSelected ? "#0ea5e9" : "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.25, className: mode ? '' : 'cursor-grab' }} eventHandlers={shapeEventHandlers}><Tooltip permanent direction="center" className="measure-label">{formatArea(polygonArea(f.coords))}</Tooltip></Polygon>;

        if (f.type === "rectangle") {
          const center = centroid(f.coords);
          if (!center) return null;
          const centerPt = map.latLngToLayerPoint(center);
          const angleRad = toRad(f.angle || 0);
          const rotatedCoords = f.coords.map(c => {
            const point = map.latLngToLayerPoint(c);
            const rotated = L.point(centerPt.x + (point.x - centerPt.x) * Math.cos(angleRad) - (point.y - centerPt.y) * Math.sin(angleRad), centerPt.y + (point.x - centerPt.x) * Math.sin(angleRad) + (point.y - centerPt.y) * Math.cos(angleRad));
            return map.layerPointToLatLng(rotated);
          });
          const width = haversine(rotatedCoords[0], rotatedCoords[1]);
          const height = haversine(rotatedCoords[1], rotatedCoords[2]);
          const area = width * height;
          const rotatedCenter = centroid(rotatedCoords);
          let rotationHandlePos;
          const handleBasePt = map.latLngToLayerPoint(f.coords[1]);
          const handleRotated = L.point(centerPt.x + (handleBasePt.x - centerPt.x) * Math.cos(angleRad) - (handleBasePt.y - centerPt.y) * Math.sin(angleRad), centerPt.y + (handleBasePt.x - centerPt.x) * Math.sin(angleRad) + (handleBasePt.y - centerPt.y) * Math.cos(angleRad));
          const offset = L.point(0, -20 / map.getZoom());
          const angle = f.angle || 0;
          const rotatedOffset = L.point(offset.x * Math.cos(toRad(angle)) - offset.y * Math.sin(toRad(angle)), offset.x * Math.sin(toRad(angle)) + offset.y * Math.cos(toRad(angle)));
          rotationHandlePos = map.layerPointToLatLng(handleRotated.add(rotatedOffset));

          return (
            <Fragment key={f.id}>
              <Polygon positions={rotatedCoords} pathOptions={{ color: isSelected ? "#0ea5e9" : "#f59e0b", weight: 2, fillColor: "#f59e0b", fillOpacity: 0.2, className: mode ? '' : 'cursor-grab' }} eventHandlers={shapeEventHandlers} />
              {rotatedCenter && <Marker position={rotatedCenter} opacity={0}><Tooltip permanent direction="center" className="measure-label">{f.buildingName && `${f.buildingName} - `} {formatDistance(width)} × {formatDistance(height)} ({formatArea(area)})</Tooltip></Marker>}
              {isSelected && rotationHandlePos && <Marker position={rotationHandlePos} icon={rotationIcon} draggable={true} eventHandlers={{ dragstart: (e) => { L.DomEvent.stop(e); draggingRef.current = { type: 'rotate', featureId: f.id, center: center }; }, drag: (e) => { if (draggingRef.current?.type !== 'rotate') return; const centerPt = map.latLngToLayerPoint(draggingRef.current.center); const mousePt = map.latLngToLayerPoint(e.latlng); const newAngle = Math.atan2(mousePt.y - centerPt.y, mousePt.x - centerPt.x) * (180 / Math.PI) - 90; setFeatures(fs => fs.map(feat => feat.id === f.id ? { ...feat, angle: newAngle } : feat)); }, dragend: () => { draggingRef.current = null; } }} />}
            </Fragment>
          );
        }
        if (f.type === "text") return <Marker key={f.id} position={f.at} icon={textIcon(f.value)} draggable={false} eventHandlers={baseEventHandlers} />;
        if (f.type === 'symbol' || f.type === 'photo') return <Marker key={f.id} position={f.at} icon={f.type === 'symbol' ? symbolIcon(f.emoji, f.number) : photoIcon(f.number)} draggable={false} eventHandlers={baseEventHandlers}><Tooltip>{f.type === 'symbol' ? f.label : `Photo ${f.number}`}</Tooltip></Marker>;
        return null;
      })}

      {(mode === "line" || mode === "altimetry") && temp.length >= 1 && (
        <Fragment>
          <Polyline positions={tempLineCoords} pathOptions={{ color: mode === "altimetry" ? "#8b5cf6" : "#2563eb", weight: 3, dashArray: '5, 5' }} />
          {tempLineCoords.length >= 2 && midpointOfLine(tempLineCoords) && <Marker position={midpointOfLine(tempLineCoords)} opacity={0}><Tooltip permanent direction="center" className="measure-label">{formatDistance(polylineLength(tempLineCoords))}</Tooltip></Marker>}
        </Fragment>
      )}
      {mode === "azimuth" && temp.length >= 1 && (
        <Fragment>
          <Polyline positions={tempLineCoords} pathOptions={{ color: "#f97316", weight: 3, dashArray: '5, 5' }} />
          {tempLineCoords.length >= 2 && (
            <Marker position={tempLineCoords[tempLineCoords.length - 1]} opacity={0}>
              <Tooltip permanent direction="right" className="measure-label text-lg font-bold">
                {calculateCustomAzimuth(tempLineCoords[0], tempLineCoords[tempLineCoords.length - 1]).toFixed(1)}°
              </Tooltip>
            </Marker>
          )}
        </Fragment>
      )}
      {mode === "polygon" && temp.length >= 1 && (
        <Fragment>
          <Polygon positions={tempPolyCoords} pathOptions={{ color: "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.2, dashArray: '5, 5' }} />
          {tempPolyCoords.length >= 3 && centroid(tempPolyCoords) && <Marker position={centroid(tempPolyCoords)} opacity={0}><Tooltip permanent direction="center" className="measure-label">{formatArea(polygonArea(tempPolyCoords))}</Tooltip></Marker>}
        </Fragment>
      )}
      {mode === "rectangle" && tempRectBounds && (
        <Fragment>
          <Rectangle bounds={tempRectBounds} pathOptions={{ color: "#f59e0b", weight: 2, fillColor: "#f59e0b", fillOpacity: 0.2, dashArray: '5, 5' }} />
          {(() => {
            const ne = tempRectBounds.getNorthEast(); const sw = tempRectBounds.getSouthWest(); const nw = L.latLng(ne.lat, sw.lng); const width = haversine(nw, ne); const height = haversine(nw, sw); const center = tempRectBounds.getCenter();
            return <Marker position={center} opacity={0}><Tooltip permanent direction="center" className="measure-label">{formatDistance(width)} × {formatDistance(height)}</Tooltip></Marker>;
          })()}
        </Fragment>
      )}

      {/* Target Marker for InfoBox */}
      {targetPos && (
        <Marker
          position={targetPos}
          icon={targetIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => setTargetPos(e.target.getLatLng())
          }}
        />
      )}

      {/* Street View Pegman */}
      {mode === 'streetview' && (
        <Marker
          position={map.getCenter()}
          icon={pegmanIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              window.open(`https://www.google.com/maps?layer=c&cbll=${lat},${lng}`, '_blank');
              setMode(null);
            }
          }}
        >
          <Tooltip permanent direction="top">Déplacez-moi sur une route !</Tooltip>
        </Marker>
      )}

      {askTextAt && <TextInputPopup at={askTextAt} onCancel={() => { setAskTextAt(null); setMode(null); }} onSubmit={(val) => { const id = crypto.randomUUID(); setFeatures((arr) => [...arr, { id, type: "text", at: askTextAt, value: val }]); setAskTextAt(null); setMode(null); }} />}
      {contextMenu && <ContextMenu position={contextMenu.position} onAddText={() => { setAskTextAt(contextMenu.position); setContextMenu(null); }} onShowInfo={() => { showPointInfo(contextMenu.position); setContextMenu(null); }} onSetTarget={() => { setTargetPos(contextMenu.position); setContextMenu(null); }} onClose={() => setContextMenu(null)} />}
    </LayerGroup>
  );
}

// ====================================================================
// LISTE DES CALQUES
// ====================================================================
const LAYERS = {
  // ========== FONDS DE CARTE ==========
  googleSat: { name: "Satellite Google", url: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", attrib: 'Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], zIndex: 0 },
  esriSat: { name: "Satellite Esri", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attrib: 'Tiles © Esri', zIndex: 0 },
  osm: { name: "Plan OSM", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attrib: '© OpenStreetMap contributors', zIndex: 0 },
  ignPlan: { name: "IGN - Plan IGN", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', zIndex: 0 },

  // ========== CALQUES OVERLAY ==========
  // Cadastre & Bâtiments
  cadastre: { name: "Cadastre (Parcelles)", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=CADASTRALPARCELS.PARCELS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 10, opacity: 0.5 },
  batiments: { name: "Bâtiments", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=BUILDINGS.BUILDINGS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 11 },

  // Agriculture et occupation du sol
  rpg: { name: "RPG - Parcelles agricoles", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE2023&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 26, opacity: 0.6 },

  // Hydrographie
  hydro: { name: "Hydrographie", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=HYDROGRAPHY.HYDROGRAPHY&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 12 },

  // Transport
  routes: { name: "Routes", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.ROADS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 30, opacity: 0.7 },
  voiesFerrees: { name: "Voies ferrées", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.RAILWAYS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 31, opacity: 0.7 },

  // Limites administratives
  communes: { name: "Limites communales", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ADMINEXPRESS-COG-CARTO.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 32, opacity: 0.5 },

  // Urbanisme (avec lien vers notice explicative pour la légende)
  plu: { name: "PLU / PLUi", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE2023&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN / GPU - Légende : geoportail-urbanisme.gouv.fr', isOverlay: true, zIndex: 33, opacity: 0.5 },
};
// ====================================================================
// FIN DE LA LISTE DES CALQUES
// ====================================================================


function BasemapSwitcher({ layersRef }) {
  const map = useMap();
  const boxRef = useRef(null);
  useEffect(() => {
    const box = L.control({ position: "bottomright" });
    box.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control leaflet-bar bg-card text-card-foreground p-2 rounded-lg shadow-lg max-w-xs");
      L.DomEvent.disableClickPropagation(div); L.DomEvent.disableScrollPropagation(div);
      div.innerHTML = `<div class="grid gap-1"><h4 class="font-semibold text-sm mb-1">Fonds de carte</h4><div id="bm-list" class="space-y-1"></div><hr class="my-1 border-border" /><h4 class="font-semibold text-sm mb-1">Calques</h4><div id="ov-list" class="space-y-1"></div></div>`;
      boxRef.current = div; return div;
    };
    box.addTo(map);
    const renderContent = () => {
      const root = boxRef.current; if (!root) return;
      const bmList = root.querySelector('#bm-list'); const ovList = root.querySelector('#ov-list');
      if (bmList) {
        bmList.innerHTML = '';
        Object.keys(LAYERS).forEach(key => {
          if (!LAYERS[key].isOverlay) {
            const checked = map.hasLayer(layersRef.current[key]) ? 'checked' : '';
            const label = document.createElement('label');
            label.className = "flex items-center gap-2 cursor-pointer text-sm hover:bg-accent/50 p-0.5 rounded";
            label.innerHTML = `<input type="radio" name="bm" value="${key}" ${checked} class="accent-primary" /><span>${LAYERS[key].name}</span>`;
            label.querySelector('input').addEventListener('change', () => {
              Object.keys(layersRef.current).forEach(k => {
                if (!LAYERS[k].isOverlay && layersRef.current[k]) {
                  if (k === key) { if (!map.hasLayer(layersRef.current[k])) layersRef.current[k].addTo(map); }
                  else { if (map.hasLayer(layersRef.current[k])) map.removeLayer(layersRef.current[k]); }
                }
              });
            });
            bmList.appendChild(label);
          }
        });
      }
      if (ovList) {
        ovList.innerHTML = '';
        Object.keys(LAYERS).forEach(key => {
          if (LAYERS[key].isOverlay) {
            const checked = map.hasLayer(layersRef.current[key]) ? 'checked' : '';
            const label = document.createElement('label');
            label.className = "flex items-center gap-2 cursor-pointer text-sm hover:bg-accent/50 p-0.5 rounded";
            label.innerHTML = `<input type="checkbox" name="ov" value="${key}" ${checked} class="accent-primary rounded" /><span>${LAYERS[key].name}</span>`;
            label.querySelector('input').addEventListener('change', (e) => {
              const layer = layersRef.current[key];
              if (e.target.checked) { if (!map.hasLayer(layer)) layer.addTo(map); }
              else { if (map.hasLayer(layer)) map.removeLayer(layer); }
            });
            ovList.appendChild(label);
          }
        });
      }
    };
    renderContent();
    return () => { if (map && boxRef.current) boxRef.current.remove(); };
  }, [map, layersRef]);
  return null;
}

function LayersBootstrap({ layersRef }) {
  const map = useMap();
  useEffect(() => {
    Object.keys(LAYERS).forEach(key => {
      const { url, attrib, subdomains, zIndex, opacity } = LAYERS[key];
      layersRef.current[key] = L.tileLayer(url, { attribution: attrib, maxZoom: 22, subdomains: subdomains || ['a', 'b', 'c'], zIndex: zIndex || 0, opacity: opacity || 1.0 });
    });
    if (layersRef.current.googleSat && !map.hasLayer(layersRef.current.googleSat)) layersRef.current.googleSat.addTo(map);
    // Cadastre NOT added by default as requested
    return () => { Object.values(layersRef.current).forEach((l) => { if (l && map.hasLayer(l)) map.removeLayer(l) }); };
  }, [map, layersRef]);
  return null;
}

function MiniMap() {
  const parentMap = useMap();
  const miniMapRef = useRef(null);
  const miniMapContainerRef = useRef(null);
  useEffect(() => {
    if (!miniMapContainerRef.current || miniMapRef.current) return;
    const miniMap = L.map(miniMapContainerRef.current, { center: parentMap.getCenter(), zoom: parentMap.getZoom() - 4, zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(miniMap);
    const viewBox = L.rectangle(parentMap.getBounds(), { color: '#ff0000', weight: 2, fillOpacity: 0.1 }).addTo(miniMap);
    const updateMiniMap = () => { miniMap.setView(parentMap.getCenter(), parentMap.getZoom() - 4); viewBox.setBounds(parentMap.getBounds()); };
    parentMap.on('move', updateMiniMap); parentMap.on('zoom', updateMiniMap);
    miniMapRef.current = miniMap;
    return () => { parentMap.off('move', updateMiniMap); parentMap.off('zoom', updateMiniMap); miniMap.remove(); miniMapRef.current = null; };
  }, [parentMap]);
  return <div ref={miniMapContainerRef} className="w-40 h-32 border-2 border-border rounded-lg shadow-lg overflow-hidden bg-card" />;
}

function MapTargetInfo({ targetPos, setTargetPos }) {
  const map = useMap();
  const [info, setInfo] = useState({ lat: 0, lng: 0, alt: '...', address: '...', parcel: '...' });
  const [loading, setLoading] = useState(false);

  // Initialize target at center if not set
  useEffect(() => {
    if (!targetPos) {
      setTargetPos(map.getCenter());
    }
  }, [map, targetPos, setTargetPos]);

  useEffect(() => {
    if (!targetPos) return;

    // Le check "Clé IGN?" est retiré.
    // Affiche "..." pendant le chargement, puis "N/A" si la clé est manquante/invalide.

    const updateInfo = async () => {
      setInfo(prev => ({ ...prev, lat: targetPos.lat, lng: targetPos.lng, alt: '...', address: '...', parcel: '...' }));
      setLoading(true);

      try {
        const [altRes, addrRes, parcRes] = await Promise.allSettled([
          fetch(`https://wxs.ign.fr/${VOTRE_CLE_IGN}/alti/rest/elevation.json?lon=${targetPos.lng}&lat=${targetPos.lat}&zonly=true`).then(r => r.json()),
          fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${targetPos.lng}&lat=${targetPos.lat}`).then(r => r.json()),
          fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${targetPos.lng},${targetPos.lat}]}`).then(r => r.json())
        ]);

        setInfo(prev => ({
          ...prev,
          alt: altRes.status === 'fulfilled' && altRes.value.elevations ? `${altRes.value.elevations[0].z.toFixed(1)} m` : 'N/A',
          address: addrRes.status === 'fulfilled' && addrRes.value.features?.[0] ? addrRes.value.features[0].properties.label : 'N/A',
          parcel: parcRes.status === 'fulfilled' && parcRes.value.features?.[0] ? `${parcRes.value.features[0].properties.section} ${parcRes.value.features[0].properties.numero}` : 'N/A'
        }));
      } catch (e) {
        console.error("Info fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timeoutId = setTimeout(updateInfo, 300);
    return () => clearTimeout(timeoutId);
  }, [targetPos, VOTRE_CLE_IGN]);

  const copyCoords = () => {
    const text = `${info.lat.toFixed(6)}, ${info.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => toast({ ...toastStyle, title: "Coordonnées copiées", description: text }));
  };

  if (!targetPos) return null;

  return (
    <div className="bg-white/90 backdrop-blur-sm p-2 rounded-md shadow-md border border-gray-200 text-xs space-y-1 min-w-[200px] max-w-[250px]">
      <div className="flex justify-between items-center">
        <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={copyCoords} title="Copier">
          {info.lat.toFixed(5)}, {info.lng.toFixed(5)} <Copy size={10} className="inline ml-0.5" />
        </span>
        <span className="text-gray-500">{loading ? '...' : ''}</span>
      </div>
      <div className="truncate" title={info.address}>📍 {info.address}</div>
      <div className="flex justify-between">
        <span>⛰️ {info.alt}</span>
        <span>🏷️ {info.parcel}</span>
      </div>
      <div className="text-[10px] text-gray-400 text-center italic mt-1">Clic droit sur la carte pour déplacer la cible</div>
    </div>
  );
}

function MapEvents({ project, onAddressFound, onAddressSearched, setPhotoToPlace, onBuildingSelect, setFeatures }) {
  const map = useMap();
  useEffect(() => {
    const handlePlaceBuilding = (e) => {
      const { building } = e.detail;
      const metersPerPixel = 40075016.686 * Math.abs(Math.cos(map.getCenter().lat * Math.PI / 180)) / Math.pow(2, map.getZoom() + 8);
      const widthInPixels = building.length / metersPerPixel;
      const heightInPixels = building.width / metersPerPixel;
      const centerPoint = map.getSize().divideBy(2);
      const southWestPoint = L.point(centerPoint.x - widthInPixels / 2, centerPoint.y + heightInPixels / 2);
      const northEastPoint = L.point(centerPoint.x + widthInPixels / 2, centerPoint.y - heightInPixels / 2);
      const sw = map.containerPointToLatLng(southWestPoint);
      const ne = map.containerPointToLatLng(northEastPoint);
      const nw = L.latLng(ne.lat, sw.lng);
      const se = L.latLng(sw.lat, ne.lng);
      const id = crypto.randomUUID();
      setFeatures(arr => [...arr, { id, type: "rectangle", buildingName: building.code, coords: [nw, ne, se, sw], angle: 0 }]);
      toast({ ...toastStyle, title: `Bâtiment ${building.code} ajouté`, description: "Le bâtiment a été placé au centre de la carte." });
    };
    window.addEventListener("map:place-building", handlePlaceBuilding);
    return () => window.removeEventListener("map:place-building", handlePlaceBuilding);
  }, [map, setFeatures]);

  useEffect(() => {
    // L'événement est "map:capture-request"
    const handleCaptureRequest = async (e) => {
      const { slotIndex } = e.detail;
      if (map) {

        const canvas = await html2canvas(map.getContainer(), {
          useCORS: true, logging: false,

          // ====================================================================
          // MODIFICATION ICI : CORRECTION DU BUG DE DÉCALAGE + GESTION DES CONTRÔLES
          // ====================================================================
          onclone: (doc) => {
            // Cacher les contrôles que vous ne voulez pas voir
            const controlsToHide = doc.querySelectorAll(
              '.leaflet-control-container .leaflet-top-left, ' + // Outils de dessin
              '.leaflet-control-container .leaflet-top-right, ' + // Barre de recherche
              '.leaflet-control-container .leaflet-bottom-right' // Sélecteur de calques
            );
            controlsToHide.forEach(c => c.style.display = 'none');

            // --- FIX POUR LE DÉCALAGE ---
            const leafletPane = doc.querySelector('.leaflet-pane.leaflet-map-pane');
            if (leafletPane) {
              const transform = leafletPane.style.transform;

              // Appliquer la *même* transformation à tous les autres panneaux (marqueurs, SVG, popups)
              const panesToTransform = doc.querySelectorAll(
                '.leaflet-marker-pane, .leaflet-tooltip-pane, .leaflet-popup-pane, .leaflet-shadow-pane, .leaflet-overlay-pane'
              );
              panesToTransform.forEach(pane => {
                pane.style.transform = transform;
              });

              // Appliquer aussi au panneau SVG (qui contient les lignes, polygones, etc.)
              const svgPane = doc.querySelector('.leaflet-pane > svg');
              if (svgPane) {
                svgPane.style.transform = transform;
              }
            }
          }
          // ====================================================================
          // FIN DE LA MODIFICATION
          // ====================================================================

        });

        // L'événement de retour est "map:capture-done"
        const dataUrl = canvas.toDataURL('image/png');
        window.dispatchEvent(new CustomEvent("map:capture-done", { detail: { slotIndex, dataUrl } }));
      }
    };
    const goToProjectAddress = () => {
      if (project?.gps) { const [lat, lng] = project.gps.split(',').map(Number); if (!isNaN(lat) && !isNaN(lng)) { map.setView([lat, lng], 18); return; } }
      if (project?.address) { const fullAddress = `${project.address}, ${project.zip} ${project.city}`; const event = new CustomEvent('geosearch/search', { detail: { query: fullAddress, keepPopupOpen: false } }); map.getContainer().dispatchEvent(event); }
    };
    const handlePlacePhoto = (e) => { setPhotoToPlace(e.detail); };

    // Correction du nom de l'événement écouté
    window.addEventListener("map:capture-request", handleCaptureRequest);
    window.addEventListener("map:goto-project-address", goToProjectAddress);
    window.addEventListener("map:place-photo", handlePlacePhoto);

    // L'événement de retour "map:capture-done" est géré dans ProjectMap.jsx

    return () => {
      window.removeEventListener("map:capture-request", handleCaptureRequest);
      window.removeEventListener("map:goto-project-address", goToProjectAddress);
      window.removeEventListener("map:place-photo", handlePlacePhoto);
    };
  }, [map, project, onAddressFound, setPhotoToPlace]);

  useEffect(() => {
    const handleSearchResult = (e) => { onAddressSearched(e.location); };
    map.on('geosearch/showlocation', handleSearchResult);
    return () => { map.off('geosearch/showlocation', handleSearchResult); };
  }, [map, onAddressSearched]);
  return null;
}

function PointInfoPanel({ pointInfo, setPointInfo }) {
  useEffect(() => {
    if (!pointInfo || pointInfo.address !== 'Chargement...') return;

    // Le check "Clé IGN?" est retiré.

    const { latlng } = pointInfo;
    const fetches = [
      fetch(`https://wxs.ign.fr/${VOTRE_CLE_IGN}/alti/rest/elevation.json?lon=${latlng.lng}&lat=${latlng.lat}&zonly=true`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ altitude: `${data.elevations[0].z.toFixed(1)} m` })).catch(() => ({ altitude: 'N/A' })),
      fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${latlng.lng}&lat=${latlng.lat}`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ address: data.features[0]?.properties.label || 'Non trouvée' })).catch(() => ({ address: 'N/A' })),
      fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${latlng.lng},${latlng.lat}]}`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ parcel: data.features[0]?.properties.libelle || 'Non trouvée' })).catch(() => ({ parcel: 'N/A' }))
    ];
    Promise.all(fetches).then(results => { const newInfo = results.reduce((acc, current) => ({ ...acc, ...current }), {}); setPointInfo(prev => ({ ...prev, ...newInfo })); });
  }, [pointInfo, setPointInfo, VOTRE_CLE_IGN]);
  if (!pointInfo) return null;
  return (
    <div className="absolute bottom-10 left-3 z-[1000] bg-card/95 text-card-foreground p-3 rounded-lg shadow-xl border border-border w-72 text-sm">
      <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-base">Info du point</h4><button onClick={() => setPointInfo(null)} className="p-1 hover:bg-accent rounded-full transition-colors"><XIcon size={16} /></button></div>
      <div className="space-y-1"><p><strong>GPS:</strong> {pointInfo.latlng.lat.toFixed(5)}, {pointInfo.latlng.lng.toFixed(5)}</p><p><strong>Adresse:</strong> {pointInfo.address}</p><p><strong>Altitude:</strong> {pointInfo.altitude}</p><p><strong>Parcelle:</strong> {pointInfo.parcel}</p></div>
    </div>
  );
}

function AltimetryProfile({ profile, setProfile, setFeatures, features }) {
  const map = useMap();
  const [layerName, setLayerName] = useState("profil altimetrique");
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Effect 1: Map Polyline
  useEffect(() => {
    if (!map || !profile?.line) return;
    const polyline = L.polyline(profile.line, { color: "#007bff", weight: 3, opacity: 0.8, dashArray: '5, 5' }).addTo(map);
    return () => { map.removeLayer(polyline); };
  }, [map, profile]);

  // Dragging Handlers (Moved up)
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Effect 2: Dragging Listeners (Moved up)
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]); // Dependencies kept same as original

  // Conditional Return
  if (!profile) return null;

  // Data extraction
  const { data, stats } = profile;
  const minAlt = Math.min(...data.map(p => p.altitude));
  const maxAlt = Math.max(...data.map(p => p.altitude));

  // Other handlers
  const handleCloseProfile = () => {
    setProfile(null);
    toast({ ...toastStyle, title: "Profil altimétrique fermé", description: "Les informations du profil altimétrique ne sont plus affichées." });
  };

  const handleExportCSV = () => {
    let csv = "Distance (m),Altitude (m)\n";
    data.forEach(point => {
      csv += `${point.distance},${point.altitude}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${layerName.replace(/\s+/g, '_')}_donnees.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ ...toastStyle, title: "Export CSV réussi !", description: "Les données ont été exportées." });
  };

  const handleSaveProfile = () => {
    const id = crypto.randomUUID();
    const newFeature = {
      id,
      type: "altimetryProfile",
      name: layerName,
      coords: profile.line,
      profileData: data,
      stats: stats
    };

    setFeatures(fs => [...fs, newFeature]);
    toast({
      ...toastStyle,
      title: "Profil enregistré !",
      description: `Le profil "${layerName}" a été ajouté à la carte.`
    });
    setProfile(null);
  };

  const handleZoomToProfile = () => {
    if (profile?.line && map) {
      const bounds = L.latLngBounds(profile.line);
      map.fitBounds(bounds, { padding: [50, 50] });
      toast({ ...toastStyle, title: "Zoom ajusté", description: "La carte est centrée sur le profil." });
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const dialogStyle = isDragging ? {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'none'
  } : {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  };

  return (
    <div
      className="z-[1000] bg-white rounded-lg shadow-2xl border w-[600px]"
      style={dialogStyle}
    >
      <div
        className="flex justify-between items-center p-4 border-b cursor-move bg-gradient-to-r from-blue-500 to-blue-600"
        onMouseDown={handleMouseDown}
      >
        <h4 className="font-bold text-lg text-white">📊 PROFIL ALTIMÉTRIQUE</h4>
        <button
          onClick={handleCloseProfile}
          className="p-1 text-white hover:bg-blue-700 rounded transition-colors"
        >
          <XIcon size={20} />
        </button>
      </div>
      <div className="p-4">
        <div ref={chartRef} className="h-[220px] w-full mb-4 bg-gray-50 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorAltitude" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="distance"
                unit="m"
                tick={{ fontSize: 11 }}
                label={{ value: "Distance (m)", position: 'insideBottom', offset: -3, fontSize: 11 }}
              />
              <YAxis
                domain={[Math.floor(minAlt - 2), Math.ceil(maxAlt + 2)]}
                tick={{ fontSize: 11 }}
                label={{ value: "Altitude (m)", angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ChartTooltip
                formatter={(value) => [`${value.toFixed(1)} m`, "Altitude"]}
                labelFormatter={(label) => `Distance: ${label} m`}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #ddd', borderRadius: '6px' }}
              />
              <Area
                type="monotone"
                dataKey="altitude"
                stroke="#059669"
                fillOpacity={1}
                fill="url(#colorAltitude)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm text-gray-700 mb-4 bg-blue-50 p-3 rounded-lg">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Distance totale</span>
            <strong className="text-base text-blue-700">{stats.distance.toFixed(0)} m</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Dénivelé +</span>
            <strong className="text-base text-green-600">+{stats.denivelePos.toFixed(1)} m</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Dénivelé -</span>
            <strong className="text-base text-red-600">-{stats.deniveleNeg.toFixed(1)} m</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Pente moy.</span>
            <strong className="text-base">{stats.penteMoyenne.toFixed(1)} %</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Pente max</span>
            <strong className="text-base text-orange-600">{stats.maxPente.toFixed(1)} %</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Amplitude</span>
            <strong className="text-base">{(maxAlt - minAlt).toFixed(1)} m</strong>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nom du profil</label>
            <Input
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="profil altimetrique"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleZoomToProfile}
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
            size="sm"
          >
            🔍 Zoom
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-gray-300 hover:bg-gray-50"
              size="sm"
            >
              📄 CSV
            </Button>
            {/* Export PNG temporairement désactivé
            <Button
              variant="outline"
              onClick={handleExportPNG}
              className="border-teal-500 text-teal-600 hover:bg-teal-50"
              size="sm"
            >
              <Download size={16} className="mr-1" /> PNG
            </Button>
            */}
            <Button
              className="bg-teal-500 hover:bg-teal-600 text-white"
              onClick={handleSaveProfile}
              size="sm"
            >
              <Save size={16} className="mr-1" /> Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapElements({ style = {}, project, onAddressFound, onAddressSearched, setSymbolToPlace, symbolToPlace, setPhotos, photos }) {
  const [mode, setMode] = useState(null);
  const [temp, setTemp] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [askTextAt, setAskTextAt] = useState(null);
  const [pointInfo, setPointInfo] = useState(null);
  const [altimetryProfile, setAltimetryProfile] = useState(null);
  const [rectangleStart, setRectangleStart] = useState(null);
  const [photoToPlace, setPhotoToPlace] = useState(null);
  const [targetPos, setTargetPos] = useState(null);
  const layersRef = useRef({});

  useEffect(() => {
    const h = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === "l") setMode((m) => (m === "line" ? null : "line"));
      if (k === "p") setMode((m) => (m === "polygon" ? null : "polygon"));
      if (k === "d") setMode((m) => (m === "delete" ? null : "delete"));
      if (k === "a") setMode((m) => (m === "altimetry" ? null : "altimetry"));
      if (k === "b") setMode((m) => (m === "rectangle" ? null : "rectangle"));
      if (k === "z") setMode((m) => (m === "azimuth" ? null : "azimuth"));
      if (k === "s") setMode((m) => (m === "streetview" ? null : "streetview"));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (mode !== 'line' && mode !== 'polygon' && mode !== 'altimetry' && mode !== 'azimuth') setTemp([]);
    if (mode !== 'text') setAskTextAt(null); if (mode !== 'symbol') setSymbolToPlace(null); if (mode !== 'rectangle') setRectangleStart(null); if (mode !== 'photo') setPhotoToPlace(null);
  }, [mode, setSymbolToPlace]);

  useEffect(() => {
    if (symbolToPlace) setMode('symbol'); else if (photoToPlace) setMode('photo'); else if (mode === 'symbol' || mode === 'photo') setMode(null);
  }, [symbolToPlace, photoToPlace]);

  return (
    <div className="relative h-full w-full" style={style}>
      <MapContainer center={[44.8378, -0.5792]} zoom={15} style={{ height: "100%", width: "100%" }} doubleClickZoom={false} zoomControl={false} className={mode === 'delete' ? 'cursor-pointer' : (symbolToPlace || photoToPlace ? 'cursor-crosshair' : 'cursor-default')}>
        <MapDrawingTools mode={mode} setMode={setMode} />
        <LayersBootstrap layersRef={layersRef} />
        <BasemapSwitcher layersRef={layersRef} />
        <SearchField onAddressFound={onAddressFound} />
        <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'none' }}>
          <div className="leaflet-control-container" style={{ position: 'absolute', bottom: '33px', left: '10px', zIndex: 1000, pointerEvents: 'auto' }}>
            <div className="flex flex-col items-start gap-2">
              {/* Info Box above minimap */}
              <MapTargetInfo targetPos={targetPos} setTargetPos={setTargetPos} />
              {/* Minimap */}
              <MiniMap />
              {/* Scale bar */}
              <ScaleControl position="bottomleft" metric={true} imperial={false} />
            </div>
          </div>
        </div>
        <EditLayer {...{ mode, setMode, features, setFeatures, temp, setTemp, selectedId, setSelectedId, askTextAt, setAskTextAt, symbolToPlace, setSymbolToPlace, setPointInfo, setAltimetryProfile, rectangleStart, setRectangleStart, photoToPlace, setPhotoToPlace, targetPos, setTargetPos }} />
        <MapEvents project={project} onAddressFound={onAddressFound} onAddressSearched={onAddressSearched} setPhotoToPlace={setPhotoToPlace} setFeatures={setFeatures} />
        <PointInfoPanel pointInfo={pointInfo} setPointInfo={setPointInfo} />
        <AltimetryProfile profile={altimetryProfile} setProfile={setAltimetryProfile} setFeatures={setFeatures} features={features} />
      </MapContainer>
    </div>
  );
}
