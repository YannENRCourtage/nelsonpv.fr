
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
  TileLayer,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import MapDrawingTools from "./MapDrawingTools.jsx";
import html2canvas from "html2canvas";
import SearchField from "./SearchField.jsx";
import { toast } from "@/components/ui/use-toast.js";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { X as XIcon, Download, Save, Copy, RotateCw, MapPin, Maximize } from 'lucide-react';
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
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="#ffffff"></circle></svg>`,
  className: 'bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 32], // Pointe en bas au centre
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

function EditLayer({ mode, setMode, features, setFeatures, temp, setTemp, selectedId, setSelectedId, askTextAt, setAskTextAt, symbolToPlace, setSymbolToPlace, setPointInfo, altimetryProfile, setAltimetryProfile, rectangleStart, setRectangleStart, photoToPlace, setPhotoToPlace, targetPos, setTargetPos }) {
  const [mousePos, setMousePos] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [ignoreNextClick, setIgnoreNextClick] = useState(false);
  const draggingRef = useRef(null);
  const map = useMap();

  useDeleteKey(() => {
    if (!selectedId) return;
    setFeatures((arr) => arr.filter((f) => f.id !== selectedId));
    setSelectedId(null);
  });

  const handleAltimetry = async (line) => {
    // If profile is already open, close it
    if (altimetryProfile) {
      setAltimetryProfile(null);
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

    // Utiliser l'API IGN Altimétrie (comme Géoportail)
    // Stratégie: requêtes par lots (batch) de 20 points avec formatage strict pour éviter erreur 414
    try {
      const BATCH_SIZE = 20;
      const totalPoints = points.length;
      let successCount = 0;

      for (let i = 0; i < points.length; i += BATCH_SIZE) {
        const batch = points.slice(i, i + BATCH_SIZE);

        // Formatage strict pour réduire la longueur de l'URL
        const lons = batch.map(p => p.lng.toFixed(6)).join('|');
        const lats = batch.map(p => p.lat.toFixed(6)).join('|');

        try {
          const res = await fetch(`https://wxs.ign.fr/essentiels/alti/rest/elevation.json?lon=${lons}&lat=${lats}&zonly=false`);

          if (res.ok) {
            const data = await res.json();
            if (data.elevations) {
              data.elevations.forEach((elev, j) => {
                const pointIndex = i + j;
                if (points[pointIndex]) {
                  points[pointIndex].alt = elev.z;
                  successCount++;
                }
              });
            }
          } else {
            console.warn(`Batch ${i / BATCH_SIZE} failed: ${res.status}`);
          }

          // Petit délai entre les requêtes pour éviter le rate limiting
          if (i + BATCH_SIZE < points.length) {
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (err) {
          console.warn(`Batch ${i / BATCH_SIZE} error:`, err);
        }
      }

      if (successCount === 0) {
        toast({ ...toastStyle, title: "Erreur Altimétrie", description: "Impossible de récupérer les altitudes. Vérifiez votre connexion." });
        return;
      }

    } catch (error) {
      console.error("Altimetry error:", error);
      toast({ ...toastStyle, title: "Erreur Altimétrie", description: "Erreur lors de la récupération des altitudes." });
      return;
    }

    // Calcul des stats
    let denivelePos = 0;
    let deniveleNeg = 0;
    let maxPente = 0;

    const profileData = points.map((p, i) => {
      if (i > 0 && p.alt !== null && points[i - 1].alt !== null) {
        const diff = p.alt - points[i - 1].alt;
        if (diff > 0) denivelePos += diff;
        else deniveleNeg += Math.abs(diff);
        const dist = p.dist - points[i - 1].dist;
        if (dist > 0) {
          const pente = Math.abs(diff / dist) * 100;
          if (pente > maxPente) maxPente = pente;
        }
      }
      return { distance: Math.round(p.dist), altitude: p.alt || 0, lat: p.lat, lng: p.lng };
    });

    // Calculate min and max altitudes
    const altitudes = profileData.map(p => p.altitude).filter(alt => alt !== null && alt !== undefined);
    const minAlt = altitudes.length > 0 ? Math.min(...altitudes) : 0;
    const maxAlt = altitudes.length > 0 ? Math.max(...altitudes) : 0;

    // Correction: Dénivelé total = Différence absolue entre altitude fin et début
    const startAlt = points.length > 0 ? points[0].alt : 0;
    const endAlt = points.length > 0 ? points[points.length - 1].alt : 0;
    const deniveleTotal = Math.abs(endAlt - startAlt);

    const penteMoyenne = totalDist > 0 ? ((denivelePos + deniveleNeg) / totalDist) * 100 : 0;

    // On passe deniveleTotal à la place de denivelePos + deniveleNeg pour l'affichage "Dénivelé total"
    setAltimetryProfile({ data: profileData, line, stats: { distance: totalDist, denivelePos, deniveleNeg, deniveleTotal, penteMoyenne, maxPente }, minAlt, maxAlt });
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
      if (ignoreNextClick) {
        setIgnoreNextClick(false);
        return;
      }
      if (contextMenu) setContextMenu(null);
      if (draggingRef.current && draggingRef.current.type === 'rotate') return;
      if (mode === 'delete') return;
      if (photoToPlace) {
        const id = crypto.randomUUID();
        setFeatures(fs => [...fs, { id, type: 'photo', photoId: photoToPlace.id, number: photoToPlace.number, at: e.latlng }]);
        setPhotoToPlace(null);
        setMode(null);
      } else if (symbolToPlace) {
        const id = crypto.randomUUID();
        let number = null;
        if (symbolToPlace.type === 'building') {
          const buildingCount = features.filter(f => f.symbolType === 'building').length;
          number = buildingCount + 1;
        }
        setFeatures(fs => [...fs, { id, type: 'symbol', symbolType: symbolToPlace.type, label: symbolToPlace.label, at: e.latlng, emoji: symbolToPlace.emoji, number }]);
        setSymbolToPlace(null);
        setMode(null);
      } else if (mode === "text") {
        setAskTextAt(e.latlng);
        setMode(null);
      } else if (mode === "rectangle") {
        if (!rectangleStart) {
          setRectangleStart(e.latlng);
        } else {
          const bounds = L.latLngBounds(rectangleStart, e.latlng);
          const id = crypto.randomUUID();
          const center = bounds.getCenter();
          const width = haversine({ lat: bounds.getSouth(), lng: bounds.getWest() }, { lat: bounds.getSouth(), lng: bounds.getEast() });
          const height = haversine({ lat: bounds.getSouth(), lng: bounds.getWest() }, { lat: bounds.getNorth(), lng: bounds.getWest() });
          // Store as polygon coords for consistent rendering
          const coords = [
            bounds.getSouthWest(),
            bounds.getNorthWest(),
            bounds.getNorthEast(),
            bounds.getSouthEast()
          ];
          setFeatures((arr) => [...arr, { id, type: "rectangle", coords, center, width, height, angle: 0 }]);
          setRectangleStart(null);
          // setMode(null); // Keep mode active for multiple rectangles
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
    dblclick(e) {
      if (mode === "line" && temp.length >= 2) {
        const id = crypto.randomUUID();
        setFeatures((arr) => [...arr, { id, type: "line", coords: temp.slice() }]);
        setTemp([]);
      } else if (mode === "polygon" && temp.length >= 3) {
        const id = crypto.randomUUID();
        setFeatures((arr) => [...arr, { id, type: "polygon", coords: temp.slice() }]);
        setTemp([]);
      } else if (mode === "altimetry" && temp.length >= 2) {
        handleAltimetry(temp.slice());
        setTemp([]);
        setMode(null);
      } else if (mode === "azimuth") {
        // Azimuth is usually 2 points. If double click, just finish.
        setTemp([]);
        setMode(null);
      } else if (!mode) {
        // If no mode is active, move the "Lieu Projet" marker
        setTargetPos(e.latlng);
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

      {/* Street View Pegman & Coverage */}
      {mode === 'streetview' && (
        <>
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=h,svv&x={x}&y={y}&z={z}"
            maxZoom={20}
            zIndex={1000}
            opacity={1}
          />
          <Marker
            position={map.getCenter()}
            icon={pegmanIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                // Ouvrir une popup centrée
                const width = 800;
                const height = 600;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;
                window.open(
                  `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`,
                  'StreetView',
                  `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
                );
                setMode(null);
              }
            }}
            zIndexOffset={1000}
          >
            <Tooltip permanent direction="top" offset={[0, -20]} className="font-bold">
              Déplacez-moi sur une route bleue !
            </Tooltip>
          </Marker>
        </>
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
  geoportailSat: { name: "Géoportail", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', zIndex: 0 },
  googleSat: { name: "Google Satellite", url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", attrib: 'Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], zIndex: 0 },
  _separator1: { isSeparator: true },
  google: { name: "Google", url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", attrib: 'Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], zIndex: 0 },
  ignPlan: { name: "IGN - Plan IGN", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', zIndex: 0 },
  osm: { name: "Plan OSM", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attrib: '© OpenStreetMap contributors', zIndex: 0 },

  // ========== CALQUES OVERLAY ==========
  // Cadastre & Bâtiments
  cadastre: { name: 'Cadastre', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=PCI vecteur&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', attrib: '© IGN', isOverlay: true, zIndex: 1, opacity: 0.75 },
  batiments: { name: "Bâtiments", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=BUILDINGS.BUILDINGS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 11 },

  // Agriculture et occupation du sol
  rpg: { name: 'Parcelles agricoles', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', attrib: '© IGN', isOverlay: true, zIndex: 2, opacity: 0.7 },

  // Hydrographie
  hydro: { name: "Hydrographie", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=HYDROGRAPHY.HYDROGRAPHY&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 12 },

  // Transport
  routes: { name: "Routes", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.ROADS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 30, opacity: 0.7 },
  voiesFerrees: { name: "Voies ferrées", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.RAILWAYS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 31, opacity: 0.7 },

  // Limites administratives
  communes: { name: "Limites communales", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ADMINEXPRESS-COG-CARTO.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 32, opacity: 0.5 },

  // Urbanisme
  plu: {
    name: "PLU / PLUi",
    url: "https://data.geopf.fr/wms-r/gpu?",
    layers: "GPU.ZONAGE",
    format: "image/png",
    transparent: true,
    attribution: "IGN - Géoportail de l'Urbanisme",
    isOverlay: true,
    maxZoom: 20,
    opacity: 0.7
  },
  "ZNIEFF 1": {
    url: "https://ws.carmencarto.fr/WMS/119/fxx_inpn?",
    layers: "Znieff1",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true
  },
  "ZNIEFF 2": {
    url: "https://ws.carmencarto.fr/WMS/119/fxx_inpn?",
    layers: "Znieff2",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true
  },
  "Natura 2000 Oiseaux": {
    url: "https://ws.carmencarto.fr/WMS/119/fxx_inpn?",
    layers: "Zones_de_protection_speciale",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true
  },
  "Natura 2000 Habitat": {
    url: "https://ws.carmencarto.fr/WMS/119/fxx_inpn?",
    layers: "Sites_d_importance_communautaire",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true
  }
};
// ====================================================================
// FIN DE LA LISTE DES CALQUES
// ====================================================================


// ====================================================================
// LÉGENDE PLU/PLUi
// ====================================================================
function PLULegend({ layersRef }) {
  const map = useMap();
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const checkPLULayer = () => {
      const pluLayer = layersRef.current['plu'];
      setShowLegend(pluLayer && map.hasLayer(pluLayer));
    };

    checkPLULayer();
    const interval = setInterval(checkPLULayer, 500);
    return () => clearInterval(interval);
  }, [map, layersRef]);

  if (!showLegend) return null;

  return (
    <div
      className="absolute bottom-[290px] right-[10px] z-[995] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-300 max-w-[200px]"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-xs text-gray-900">Légende PLU</h4>
        <button onClick={() => setShowLegend(false)} className="p-1 hover:bg-gray-200 rounded"><XIcon className="h-3 w-3" /></button>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#E91E63] border border-gray-300"></div><span>Zone U (Urbaine)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#F48FB1] border border-gray-300"></div><span>Zone AU (À urb.)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#8BC34A] border border-gray-300"></div><span>Zone A (Agricole)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#4CAF50] border border-gray-300"></div><span>Zone N (Naturelle)</span></div>
      </div>
    </div>
  );
}

// ====================================================================
// LÉGENDE RPG (Parcelles agricoles)
// ====================================================================
function RPGLegend({ layersRef }) {
  const map = useMap();
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const checkRPGLayer = () => {
      const rpgLayer = layersRef.current['rpg'];
      setShowLegend(rpgLayer && map.hasLayer(rpgLayer));
    };
    checkRPGLayer();
    const interval = setInterval(checkRPGLayer, 500);
    return () => clearInterval(interval);
  }, [map, layersRef]);

  if (!showLegend) return null;

  return (
    <div
      className="absolute bottom-[435px] right-[10px] z-[995] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-300 max-w-[200px]"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-xs text-gray-900">Légende RPG</h4>
        <button onClick={() => setShowLegend(false)} className="p-1 hover:bg-gray-200 rounded"><XIcon className="h-3 w-3" /></button>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FFD700] border border-gray-300"></div><span>Prairies</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#90EE90] border border-gray-300"></div><span>Vergers / vignes</span></div>
      </div>
    </div>
  );
}

// ====================================================================
// CONTRÔLE DES FONDS DE CARTE
// ====================================================================
// Contrôle standard en bas à droite pour les FONDS DE CARTE
function BasemapControl({ layersRef }) {
  const map = useMap();
  const boxRef = useRef(null);

  useEffect(() => {
    if (!map || !layersRef.current) return;

    const container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded custom-basemap-panel no-print hide-on-capture');
    container.style.padding = '10px';
    container.style.backgroundColor = 'white';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    container.style.minWidth = '180px';
    container.style.maxHeight = '250px';
    container.style.overflowY = 'auto';

    const title = document.createElement('div');
    title.innerText = 'fonds de carte'; // Minuscule
    title.className = 'font-bold text-xs mb-3 text-gray-700 border-b pb-2 uppercase tracking-wider';
    container.appendChild(title);

    const list = document.createElement('div');
    list.className = 'space-y-1';
    container.appendChild(list);

    const Control = L.Control.extend({ onAdd: () => container });
    const ctrl = new Control({ position: 'bottomright' });
    ctrl.addTo(map);
    boxRef.current = ctrl;

    const updateList = () => {
      list.innerHTML = '';
      Object.keys(LAYERS).forEach(key => {
        const layer = LAYERS[key];

        // Handle separator
        if (layer.isSeparator) {
          const separator = document.createElement('hr');
          separator.className = 'my-2 border-gray-300';
          list.appendChild(separator);
          return;
        }

        if (layer.zIndex === 0) {
          const label = document.createElement('label');
          label.className = 'flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded text-sm transition-colors';

          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'basemap';
          input.checked = map.hasLayer(layersRef.current[key]);
          input.className = 'accent-blue-600 w-4 h-4 mr-2';

          const span = document.createElement('span');
          span.innerText = layer.name;
          span.className = 'text-gray-700 font-medium';

          label.appendChild(input);
          label.appendChild(span);

          input.addEventListener('change', () => {
            if (input.checked) {
              Object.keys(LAYERS).forEach(k => {
                if (LAYERS[k].zIndex === 0 && layersRef.current[k] && map.hasLayer(layersRef.current[k])) {
                  map.removeLayer(layersRef.current[k]);
                }
              });
              layersRef.current[key].addTo(map);
              updateList();
            }
          });
          list.appendChild(label);
        }
      });
    };

    updateList();
    map.on('layeradd layerremove', updateList);

    return () => {
      if (map && boxRef.current) boxRef.current.remove();
      map.off('layeradd layerremove', updateList);
    };
  }, [map, layersRef]);
  return null;
}

function LayersBootstrap({ layersRef }) {
  const map = useMap();
  useEffect(() => {
    Object.keys(LAYERS).forEach(key => {
      const layerDef = LAYERS[key];
      if (layerDef.isSeparator) return; // Skip separators
      if (!layerDef.url) return;

      // Check if it's a WMS layer by checking for 'layers' property (not just URL)
      if (layerDef.layers) {
        // WMS layers
        layersRef.current[key] = L.tileLayer.wms(layerDef.url, {
          layers: layerDef.layers,
          format: layerDef.format || 'image/png',
          transparent: layerDef.transparent !== false,
          attribution: layerDef.attribution,
          maxZoom: layerDef.maxZoom || 20,
          opacity: layerDef.opacity || 1.0,
          zIndex: layerDef.zIndex || 10,
          pane: 'overlayPane',
          interactive: false
        });
      } else {
        // TileLayer (WMTS or standard XYZ or WMS with embedded params)
        layersRef.current[key] = L.tileLayer(layerDef.url, {
          attribution: layerDef.attrib || layerDef.attribution,
          maxZoom: layerDef.maxZoom || 22,
          subdomains: layerDef.subdomains || ['a', 'b', 'c'],
          zIndex: layerDef.zIndex || 0,
          opacity: layerDef.opacity || 1.0,
          pane: layerDef.isOverlay ? 'overlayPane' : 'tilePane',
          interactive: layerDef.isOverlay ? false : true
        });
      }
    });
    if (layersRef.current.geoportailSat && !map.hasLayer(layersRef.current.geoportailSat)) layersRef.current.geoportailSat.addTo(map);
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
        // Lancer toutes les requêtes en parallèle pour optimiser la vitesse
        const [altRes, addrRes, parcRes] = await Promise.allSettled([
          fetch(`https://wxs.ign.fr/essentiels/alti/rest/elevation.json?lon=${targetPos.lng}&lat=${targetPos.lat}&zonly=false`)
            .then(r => r.json()),
          // Adresse : API Adresse
          fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${targetPos.lng}&lat=${targetPos.lat}`)
            .then(r => r.json()),
          // Parcelle cadastrale : API Carto IGN
          fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${targetPos.lng},${targetPos.lat}]}`)
            .then(r => r.json())
        ]);

        // Traiter l'altitude
        let alt = 'N/A';
        if (altRes.status === 'fulfilled' && altRes.value?.elevations?.[0]?.z != null) {
          alt = `${altRes.value.elevations[0].z.toFixed(1)} m`;
        }

        // Traiter l'adresse
        const address = addrRes.status === 'fulfilled' && addrRes.value?.features?.[0]
          ? addrRes.value.features[0].properties.label
          : 'N/A';

        // Traiter la parcelle
        const parcel = parcRes.status === 'fulfilled' && parcRes.value?.features?.[0]
          ? `${parcRes.value.features[0].properties.section} ${parcRes.value.features[0].properties.numero}`
          : 'N/A';

        setInfo(prev => ({ ...prev, alt, address, parcel }));
      } catch (e) {
        console.error("Info fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    // Debounce réduit pour réactivité
    const timeoutId = setTimeout(updateInfo, 100);
    return () => clearTimeout(timeoutId);
  }, [targetPos]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !", description: text });
  };

  const formatAddress = (addr) => {
    if (!addr) return { line1: "Adresse non trouvée", line2: "" };
    // Try splitting by comma first
    let parts = addr.split(',');
    if (parts.length > 1) {
      return {
        line1: parts[0].trim(),
        line2: parts.slice(1).join(',').trim()
      };
    }
    // If no comma, try splitting by the first number that follows text (rough heuristic for French addresses)
    // e.g. "Les Loges 36230 Sarzay" -> "Les Loges", "36230 Sarzay"
    const match = addr.match(/^(.+?)(\d{5}.+)$/);
    if (match) {
      return {
        line1: match[1].trim(),
        line2: match[2].trim()
      };
    }

    return { line1: addr, line2: "" };
  };

  const addressParts = formatAddress(info.address);

  const copyCoords = () => {
    const text = `${info.lat.toFixed(6)}, ${info.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => toast({ ...toastStyle, title: "Coordonnées copiées", description: text }));
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200 text-xs min-w-[220px] max-w-[280px] z-[1000]">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-blue-600 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors flex items-center gap-1" onClick={copyCoords} title="Copier les coordonnées">
          {info.lat.toFixed(5)}, {info.lng.toFixed(5)} <Copy size={12} />
        </span>
        <span className="text-gray-500">{loading ? '...' : ''}</span>
      </div>

      <div className="flex items-start gap-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors group" onClick={() => copyToClipboard(info.address)} title="Copier l'adresse">
        <div className="mt-0.5">📍</div>
        <div className="flex-1">
          <div className="font-medium text-gray-900">{addressParts.line1}</div>
          {addressParts.line2 && <div className="text-gray-600">{addressParts.line2}</div>}
        </div>
        <Copy size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>

      <div className="flex justify-between items-center border-t pt-1 text-gray-600">
        <span className="flex items-center gap-1" title="Altitude">⛰️ {info.alt}</span>
        <span className="flex items-center gap-1" title="Parcelle">🏷️ {info.parcel}</span>
      </div>
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
            // Cacher les contrôles ayant la classe "hide-on-capture"
            const controlsToHide = doc.querySelectorAll('.hide-on-capture');
            controlsToHide.forEach(c => c.style.display = 'none');
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
      fetch(`https://wxs.ign.fr/essentiels/alti/rest/elevation.json?lon=${latlng.lng.toFixed(6)}&lat=${latlng.lat.toFixed(6)}&zonly=false`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ altitude: `${data.elevations[0].z.toFixed(1)} m` })).catch(() => ({ altitude: 'N/A' })),
      fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${latlng.lng}&lat=${latlng.lat}`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ address: data.features[0]?.properties.label || 'Non trouvée' })).catch(() => ({ address: 'N/A' })),
      fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${latlng.lng},${latlng.lat}]}`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ parcel: data.features[0]?.properties.libelle || 'Non trouvée' })).catch(() => ({ parcel: 'N/A' }))
    ];
    Promise.all(fetches).then(results => { const newInfo = results.reduce((acc, current) => ({ ...acc, ...current }), {}); setPointInfo(prev => ({ ...prev, ...newInfo })); });
  }, [pointInfo, setPointInfo]);
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
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hoverPoint, setHoverPoint] = useState(null);
  const [layerName, setLayerName] = useState("Nouveau profil"); // Moved up

  // Update layerName when profile changes
  useEffect(() => {
    if (profile?.name) setLayerName(profile.name);
    else setLayerName("profil altimetrique");
  }, [profile]);

  // Effect 1: Map Polyline & Hover Marker
  useEffect(() => {
    if (!map || !profile?.line) return;
    const polyline = L.polyline(profile.line, { color: "#007bff", weight: 3, opacity: 0.8, dashArray: '5, 5' }).addTo(map);

    let marker = null;
    if (hoverPoint) {
      marker = L.circleMarker([hoverPoint.lat, hoverPoint.lng], { radius: 6, color: 'red', fillColor: 'yellow', fillOpacity: 1, weight: 2 }).addTo(map);
    }

    return () => {
      map.removeLayer(polyline);
      if (marker) map.removeLayer(marker);
    };
  }, [map, profile, hoverPoint]);

  // Dragging Handlers
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  };
  const handleMouseUp = () => { setIsDragging(false); };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!profile) return null;
  const { data, stats, minAlt, maxAlt } = profile; // Destructure stats, minAlt, maxAlt

  const handleCloseProfile = () => { setProfile(null); };

  const handleMouseDown = (e) => {
    // Don't start dragging if clicking on a button or its children
    if (e.target.closest('button')) {
      return;
    }
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const dialogStyle = isDragging ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, transform: 'none' } : { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  // Handlers for new buttons
  const handleZoomToProfile = () => {
    if (profile?.line && map) {
      const bounds = L.latLngBounds(profile.line);
      map.fitBounds(bounds);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Distance (m),Altitude (m)\n"
      + data.map(p => `${p.distance.toFixed(1)},${p.altitude.toFixed(1)}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${layerName.replace(/\s/g, '_')}_profil_altimetrique.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ ...toastStyle, title: "Export CSV", description: "Le profil altimétrique a été exporté en CSV." });
  };

  const handleSaveProfile = () => {
    if (!profile) return;
    const newFeature = {
      id: crypto.randomUUID(),
      type: "altimetryProfile",
      name: layerName,
      line: profile.line,
      data: profile.data,
      stats: profile.stats,
      minAlt: profile.minAlt,
      maxAlt: profile.maxAlt,
    };
    setFeatures(prev => [...prev, newFeature]);
    setProfile(null); // Close the profile panel after saving
    toast({ ...toastStyle, title: "Profil enregistré", description: `Le profil "${layerName}" a été ajouté à la carte.` });
  };

  return (
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl border w-[600px]" style={dialogStyle}>
      <div className="flex justify-between items-center p-3 border-b cursor-move bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg" onMouseDown={handleMouseDown}>
        <h4 className="font-bold text-base text-white">📊 PROFIL ALTIMÉTRIQUE</h4>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleZoomToProfile(); }} className="p-1 text-white hover:bg-blue-700 rounded-full transition-colors" title="Zoomer sur le profil"><Maximize size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); handleExportCSV(); }} className="p-1 text-white hover:bg-blue-700 rounded-full transition-colors" title="Exporter en CSV"><Download size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); handleSaveProfile(); }} className="p-1 text-white hover:bg-blue-700 rounded-full transition-colors" title="Enregistrer le profil"><Save size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); handleCloseProfile(); }} className="p-1 text-white hover:bg-blue-700 rounded-full transition-colors" title="Fermer"><XIcon size={16} /></button>
        </div>
      </div>
      <div className="p-4">
        <div ref={chartRef} className="h-[150px] w-full bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onMouseMove={(e) => {
                if (e.activePayload && e.activePayload[0]) {
                  const point = e.activePayload[0].payload;
                  setHoverPoint(point);
                }
              }}
              onMouseLeave={() => setHoverPoint(null)}
            >
              <defs>
                <linearGradient id="colorAltitude" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient >
              </defs >
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
            </AreaChart >
          </ResponsiveContainer >
        </div >

        {/* Simplified stats on single line */}
        <div className="flex gap-4 text-sm text-gray-700 bg-blue-50 p-2 rounded-lg justify-around mt-6">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Distance</span>
            <strong className="text-sm text-blue-700">{stats.distance.toFixed(0)} m</strong>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Dénivelé total</span>
            <span className="font-bold text-purple-600">{stats.deniveleTotal !== undefined ? stats.deniveleTotal.toFixed(1) : (stats.denivelePos + stats.deniveleNeg).toFixed(1)} m</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Pente moy.</span>
            <strong className="text-sm">{stats.penteMoyenne.toFixed(1)} %</strong>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Pente max</span>
            <strong className="text-sm text-orange-600">{stats.maxPente.toFixed(1)} %</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour récupérer l'instance de la carte
function MapInstance({ setMap }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}


// Barre horizontale en bas pour les CALQUES uniquement (Hors MapContainer)
function BottomLayersBar({ layersRef, map }) {
  const [, forceUpdate] = useState();

  const toggleLayer = (key) => {
    if (!map || !layersRef.current[key]) return;
    const layer = layersRef.current[key];
    if (map.hasLayer(layer)) map.removeLayer(layer);
    else layer.addTo(map);
    forceUpdate({});
  };

  const isActive = (key) => {
    return map && layersRef.current[key] && map.hasLayer(layersRef.current[key]);
  };

  // On ne garde que les overlays (zIndex > 0)
  const overlayKeys = Object.keys(LAYERS).filter(k => LAYERS[k].isOverlay || (LAYERS[k].url && LAYERS[k].url.includes("WMS")));

  return (
    <div className="bg-white border-t border-gray-200 p-2 flex flex-wrap justify-center gap-2 z-[1000] w-full">
      {overlayKeys.map(key => (
        <button
          key={key}
          onClick={() => toggleLayer(key)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm border ${isActive(key)
            ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
        >
          {LAYERS[key].name || key}
        </button>
      ))}
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
  const [map, setMap] = useState(null); // State for map instance
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
  }, [symbolToPlace, photoToPlace, mode, setMode]);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex-1 relative min-h-0">
        <MapContainer
          ref={setMap}
          center={[46.603354, 1.888334]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          doubleClickZoom={false}
          zoomControl={false}
          className={mode === 'delete' ? 'cursor-pointer' : (symbolToPlace || photoToPlace ? 'cursor-crosshair' : 'cursor-default')}
          placeholder={<div className="h-full w-full bg-gray-100 animate-pulse" />}
        >
          {/* Enable Drop on Map */}
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 400, pointerEvents: 'none' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          />
          <MapInstance setMap={setMap} />
          <MapDrawingTools mode={mode} setMode={setMode} />
          <LayersBootstrap layersRef={layersRef} />

          {/* Controls inside map */}
          <BasemapControl layersRef={layersRef} />
          <PLULegend layersRef={layersRef} />
          <RPGLegend layersRef={layersRef} />

          <SearchField onAddressFound={onAddressFound} />
          <div className="leaflet-bottom leaflet-left no-print" style={{ pointerEvents: 'none' }}>
            <div className="leaflet-control-container" style={{ position: 'absolute', bottom: '30px', left: '10px', zIndex: 1000, pointerEvents: 'auto' }}>
              <div className="flex flex-col items-start gap-2">
                <MapTargetInfo targetPos={targetPos} setTargetPos={setTargetPos} />
                <MiniMap />
                <ScaleControl position="bottomleft" metric={true} imperial={false} />
              </div>
            </div>
          </div>
          <EditLayer {...{ mode, setMode, features, setFeatures, temp, setTemp, selectedId, setSelectedId, askTextAt, setAskTextAt, symbolToPlace, setSymbolToPlace, setPointInfo, altimetryProfile, setAltimetryProfile, rectangleStart, setRectangleStart, photoToPlace, setPhotoToPlace, targetPos, setTargetPos }} />
          <MapEvents
            project={project}
            onAddressFound={onAddressFound}
            onAddressSearched={onAddressSearched}
            setPhotoToPlace={setPhotoToPlace}
            setFeatures={setFeatures}
            onRightClick={(latlng) => setTargetPos(latlng)}
          />
          <PointInfoPanel pointInfo={pointInfo} setPointInfo={setPointInfo} />
          {/* AltimetryProfile must be outside MapContainer or have high z-index and fixed positioning if inside. 
              Here it is inside, so we rely on its fixed positioning style. */}
          <AltimetryProfile profile={altimetryProfile} setProfile={setAltimetryProfile} setFeatures={setFeatures} features={features} />
        </MapContainer>
      </div>

      {/* Bottom Bar outside map */}
      <BottomLayersBar layersRef={layersRef} map={map} />
    </div>
  );
}
