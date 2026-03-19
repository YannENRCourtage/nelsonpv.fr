
import React, { useRef, useState, useEffect, Fragment, useCallback } from "react";
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
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import MapDrawingTools from "./MapDrawingTools.jsx";
import html2canvas from "html2canvas";
import SearchField from "./SearchField.jsx";
import { toast } from "@/components/ui/use-toast.js";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { X as XIcon, Download, Save, Copy, RotateCw, MapPin, Maximize, Building, AlertCircle, FileText, Map as MapIcon, ExternalLink } from 'lucide-react';
import { mapData } from "@/lib/nomenclature.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { urbanismeService } from "@/services/UrbanismeService";
import { isochroneService } from "@/services/IsochroneService";
import { Zap, Sun } from 'lucide-react';

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
    let lat = 0, lng = 0, n = 0;
    coords.forEach(c => { lat += c.lat; lng += c.lng; n++; });
    return { lat: lat / n, lng: lng / n };
  }
}
function formatDistance(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`; }
function formatArea(m2) { return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²`; }

function calculateSolarPower(area) {
  // Dimensions panneaux (Configurateur) : 1.134 x 1.762
  // Gap demandé : 2cm = 0.02m
  // Surface unitaire effective (avec écarts)
  const EFFECTIVE_PANEL_AREA = (1.134 + 0.02) * (1.762 + 0.02);
  const PANEL_POWER_KW = 0.465;

  const count = Math.floor(area / EFFECTIVE_PANEL_AREA);
  const power = count * PANEL_POWER_KW;

  return `${power.toFixed(1)} kWc`;
}

// Custom Azimuth Calculation: 0=South, 180=North, 90=West, -90=East
// Convert visual angle (Leaflet rotation) to azimuth (geographic)
// Visual angle: 0=Sud (si rectangle horizontal), 90=Ouest (sens horaire)
// Azimuth: 0=Sud, 90=Ouest
function calculateAzimuthFromAngle(angle) {
  // Normalize angle to [0, 360) first to behave consistently
  let az = (angle % 360 + 360) % 360;

  // Convert to [-180, 180]
  if (az > 180) az -= 360;

  // Enforce range [-90, 90] with 180° symmetry
  while (az > 90) az -= 180;
  while (az <= -90) az += 180;

  // Round to nearest 5 degrees
  az = Math.round(az / 5) * 5;

  // Final check after rounding (e.g. 91 rounded from 89? No, 89->90. 91->90. 93->95->-85)
  if (az > 90) az -= 180;
  if (az <= -90) az += 180;

  // Handle -0
  if (az === 0) az = 0;

  return az;
}

// Convert azimuth back to visual angle for map rendering
// azimuth = visualAngle
function calculateAngleFromAzimuth(azimuth) {
  return azimuth;
}

// Custom Azimuth Calculation for Measuring Tool (2 Points)
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
// Custom escape function to avoid Leaflet version issues
const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const textIcon = (txt) => L.divIcon({
  className: "bg-transparent border-none",
  html: `<div class="bg-white border border-gray-500 text-black px-2 py-1 shadow-sm rounded text-[13px] whitespace-nowrap font-medium">${txt ? escapeHtml(txt).replace(/\n/g, '<br>') : ""}</div>`,
  iconSize: null, // Auto size
  iconAnchor: [0, 0] // Top-left anchor
});

const noteIcon = (txt) => L.divIcon({
  className: "bg-transparent border-none cursor-move",
  html: `<div style="
    background: white;
    border: 2px solid #2563eb;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    color: #1e293b;
    white-space: pre-wrap;
    max-width: 300px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-weight: 500;
    line-height: 1.4;
  ">${txt ? L.Util.escapeHTML(txt).replace(/\n/g, '<br>') : ''}</div>`,
  iconSize: null,
  iconAnchor: [0, 0]
});

const symbolIcon = (emoji, number = null) => L.divIcon({
  html: `<div class="flex flex-col items-center cursor-grab relative">
           <div class="bg-white rounded-full p-2 shadow-lg border-2 border-border text-xl">${emoji}</div>
           ${number ? `<span class="absolute -top-2 -right-2 bg-blue-600 text-white text-[14px] font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white">${number}</span>` : ''}
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
const companyIcon = (name, isSelected) => L.divIcon({
  html: `<div class="flex items-center gap-2 group transition-all" style="z-index: ${isSelected ? 1000 : 1}">
           <div class="w-3 h-3 rounded-full border-2 border-white shadow-md ${isSelected ? 'bg-amber-500 scale-150 shadow-amber-200' : 'bg-blue-600 outline outline-4 outline-blue-600/10'}"></div>
           <div class="${isSelected ? 'flex' : 'hidden md:group-hover:flex'} bg-white/95 backdrop-blur-sm border border-slate-200 px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap">
             <span class="text-[10px] font-black text-slate-800 tracking-tight uppercase">${name}</span>
           </div>
         </div>`,
  className: 'bg-transparent border-none',
  iconSize: [20, 20],
  iconAnchor: [6, 6],
});

const powerIcon = (name, capacity) => L.divIcon({
  html: `<div class="flex flex-col items-center group">
           <div class="bg-amber-100 border-2 border-amber-500 rounded-full p-1 shadow-md group-hover:scale-110 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
           </div>
           <div class="bg-white/95 border border-amber-200 px-1.5 py-0.5 rounded shadow-lg mt-0.5 whitespace-nowrap hidden group-hover:block z-[2000]">
             <span class="text-[10px] font-black text-amber-900 uppercase tracking-tight">${name}</span>
             <span class="text-[10px] font-black text-amber-700 ml-1 bg-amber-50 px-1 rounded">${capacity} MW</span>
           </div>
         </div>`,
  className: 'bg-transparent border-none',
  iconSize: [24, 40],
  iconAnchor: [12, 12],
});

// --- Ligne BT Manager (Enedis) ---
// --- Layer Managers ---

function LigneBTLayerManager({ layersRef, activeLayers }) {
  const map = useMap();
  const active = activeLayers?.has('enedisLigneBT');
  const layerGroupRef = useRef(L.featureGroup());

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['enedisLigneBT'] = layerGroupRef.current;
  }, [layersRef]);

  const fetchData = async () => {
    if (!active || !map || map.getZoom() < (LAYERS.enedisLigneBT.minZoom || 13)) {
      layerGroupRef.current.clearLayers();
      return;
    }

    const bounds = map.getBounds();
    const latMax = bounds.getNorth();
    const lonMin = bounds.getWest();
    const latMin = bounds.getSouth();
    const lonMax = bounds.getEast();

    const whereClause = `within_box(geometry, ${latMax}, ${lonMin}, ${latMin}, ${lonMax})`;
    const limit = 1000;

    const urls = [
      `https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/reseau-souterrain-bt/records?limit=${limit}&where=${encodeURIComponent(whereClause)}`,
      `https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/reseau-aerien-bt/records?limit=${limit}&where=${encodeURIComponent(whereClause)}`
    ];

    try {
      const results = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
      layerGroupRef.current.clearLayers();

      // Process Souterrain (Index 0)
      if (results[0].results) {
        const geoJson = {
          type: 'FeatureCollection',
          features: results[0].results.map(r => ({
            type: 'Feature',
            geometry: r.geometry,
            properties: { ...r, _type: 'souterrain' }
          }))
        };
        L.geoJSON(geoJson, {
          style: { color: '#00008B', weight: 2, dashArray: '5, 5', opacity: 0.8 }
        }).addTo(layerGroupRef.current);
      }

      // Process Aerien (Index 1)
      if (results[1].results) {
        const geoJson = {
          type: 'FeatureCollection',
          features: results[1].results.map(r => ({
            type: 'Feature',
            geometry: r.geometry,
            properties: { ...r, _type: 'aerien' }
          }))
        };
        L.geoJSON(geoJson, {
          style: { color: '#00008B', weight: 2, opacity: 0.8 }
        }).addTo(layerGroupRef.current);
      }
    } catch (err) { console.error("Error fetching Enedis BT data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      fetchData();
      const onMoveEnd = () => fetchData();
      map.on('moveend', onMoveEnd);
      return () => { map.off('moveend', onMoveEnd); };
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
      layerGroupRef.current.clearLayers();
    }
  }, [active, map]);

  return null;
}

function GazDynamicLayerManager({ layersRef, activeLayers }) {
  const map = useMap();
  const active = activeLayers?.has('gaz');
  const loadedIds = useRef(new Set());
  const layerGroupRef = useRef(L.featureGroup());

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['gaz'] = layerGroupRef.current;
  }, [layersRef]);

  const fetchData = async () => {
    if (!active || !map) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    const url = `${LAYERS.gaz.url}?bbox=${bbox}&size=1000`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results) return;

      data.results.forEach(item => {
        if (loadedIds.current.has(item._id)) return;
        loadedIds.current.add(item._id);

        try {
          const geometry = typeof item.geometry === 'string' ? JSON.parse(item.geometry) : item.geometry;
          const feature = {
            type: 'Feature',
            geometry: geometry,
            properties: item
          };

          L.geoJSON(feature, {
            style: { color: LAYERS.gaz.color, weight: 3, opacity: 0.8 },
            onEachFeature: (f, layer) => {
              const props = f.properties;
              let popup = `<div style="font-family:sans-serif;"><h4 style="margin:0 0 8px 0;color:${LAYERS.gaz.color};font-size:14px;font-weight:bold;">🔥 Réseau de Gaz</h4>`;
              if (props.nom_grd) popup += `<p style="margin:4px 0;"><strong>GRD:</strong> ${props.nom_grd}</p>`;
              if (props.commune) popup += `<p style="margin:4px 0;"><strong>Commune:</strong> ${props.commune}</p>`;
              if (props.date_maj) popup += `<p style="margin:4px 0;"><strong>Mise à jour:</strong> ${props.date_maj}</p>`;
              popup += '</div>';
              layer.bindPopup(popup);
            }
          }).addTo(layerGroupRef.current);
        } catch (e) { console.error("Error parsing GAZ geometry", e); }
      });
    } catch (err) { console.error("Error fetching GAZ data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      fetchData();
      const onMoveEnd = () => fetchData();
      map.on('moveend', onMoveEnd);
      return () => { map.off('moveend', onMoveEnd); };
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
    }
  }, [active, map]);

  return null;
}

function CompaniesLayerManager({ layersRef, activeLayers, onCompaniesUpdate }) {
  const map = useMap();
  const active = activeLayers?.has('companies');
  const loadedIds = useRef(new Set());
  const layerGroupRef = useRef(L.featureGroup());

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['companies'] = layerGroupRef.current;
  }, [layersRef]);

  const fetchData = async () => {
    if (!active || !map || map.getZoom() < 16) {
       if (map.getZoom() < 16) layerGroupRef.current.clearLayers();
       return;
    }
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    const url = `/api/melodi?action=search&bbox=${bbox}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results) return;

      onCompaniesUpdate(data.results);

      data.results.forEach(item => {
        if (loadedIds.current.has(item.id)) return;
        loadedIds.current.add(item.id);

        if (item.lat && item.lon) {
          const marker = L.marker([item.lat, item.lon], {
            icon: companyIcon(item.name, false)
          });
          marker.on('click', (e) => {
             if (e.originalEvent) e.originalEvent.stopPropagation();
             console.log("[CompaniesLayerManager] Clicked company:", item.name);
             window.dispatchEvent(new CustomEvent('map:select-company', { detail: { company: item } }));
          });
          marker.addTo(layerGroupRef.current);
        }
      });
    } catch (err) { console.error("Error fetching companies data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      fetchData();
      const onMoveEnd = () => fetchData();
      map.on('moveend', onMoveEnd);
      return () => { map.off('moveend', onMoveEnd); };
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
    }
  }, [active, map]);

  return null;
}

function CapareseauLayerManager({ layersRef, activeLayers }) {
  const map = useMap();
  const active = activeLayers?.has('capareseau');
  const loadedIds = useRef(new Set());
  const layerGroupRef = useRef(L.featureGroup());

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['capareseau'] = layerGroupRef.current;
  }, [layersRef]);

  const fetchData = async () => {
    if (!active || !map) return;
    const bounds = map.getBounds();
    const latMax = bounds.getNorth();
    const lonMin = bounds.getWest();
    const latMin = bounds.getSouth();
    const lonMax = bounds.getEast();

    const dataset = 'capacites-daccueil-du-reseau-pour-le-raccordement-au-reseau-electrique';
    const whereClause = `within_box(geo_shape, ${latMax}, ${lonMin}, ${latMin}, ${lonMax})`;
    const url = `/api/melodi?action=capareseau&dataset=${dataset}&where=${encodeURIComponent(whereClause)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results) return;

      data.results.forEach(item => {
        const id = (item.nom_du_poste || 'unknown') + (item.niveau_de_tension || 'unknown');
        if (loadedIds.current.has(id)) return;
        loadedIds.current.add(id);

        if (item.geo_point_2d) {
          const latlng = [item.geo_point_2d.lat, item.geo_point_2d.lon];
          const marker = L.marker(latlng, {
            icon: powerIcon(item.nom_du_poste, item.capacite_disponible_mw || 0)
          });
          marker.on('click', (e) => {
             if (e.originalEvent) e.originalEvent.stopPropagation();
             window.dispatchEvent(new CustomEvent('map:select-substation', { detail: { substation: item } }));
          });
          marker.addTo(layerGroupRef.current);
        }
      });
    } catch (err) { console.error("Error fetching Capareseau data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      fetchData();
      const onMoveEnd = () => fetchData();
      map.on('moveend', onMoveEnd);
      return () => { map.off('moveend', onMoveEnd); };
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
    }
  }, [active, map]);

  return null;
}

function PostesHTALayerManager({ layersRef, activeLayers }) {
  const map = useMap();
  const active = activeLayers?.has('enedisPostes');
  const layerGroupRef = useRef(L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div style="background: #DC143C; color:white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">${count}</div>`,
        className: '',
        iconSize: L.point(35, 35)
      });
    }
  }));

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['enedisPostes'] = layerGroupRef.current;
  }, [layersRef]);

  const fetchData = async () => {
    if (!active || !map) return;
    const bounds = map.getBounds();
    const lonMin = bounds.getWest();
    const latMin = bounds.getSouth();
    const lonMax = bounds.getEast();
    const latMax = bounds.getNorth();

    // DataFair API bbox format: minLon,minLat,maxLon,maxLat
    const bbox = `${lonMin},${latMin},${lonMax},${latMax}`;
    const url = `https://opendata.enedis.fr/data-fair/api/v1/datasets/poste-electrique/lines?size=1000&bbox=${bbox}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results) return;

      layerGroupRef.current.clearLayers();

      const geoJson = {
        type: 'FeatureCollection',
        features: data.results.map(r => ({
          type: 'Feature',
          geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry,
          properties: r
        }))
      };

      L.geoJSON(geoJson, {
        pointToLayer: (feature, latlng) => {
          return L.marker(latlng, {
            icon: L.divIcon({
              className: 'hta-poste-icon',
              html: '<div style="background-color: red; width: 12px; height: 12px; border: 1.5px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popupContent = '<div style="font-family: sans-serif; min-width: 200px;">';
          popupContent += `<h4 style="margin: 0 0 8px 0; color: #DC143C; font-size: 16px; font-weight: bold;">⚡ Poste HTA/BT</h4>`;
          if (props.nom_poste) popupContent += `<p style="margin: 4px 0; font-size: 13px;"><strong>Nom:</strong> ${props.nom_poste}</p>`;
          if (props.type_poste) popupContent += `<p style="margin: 4px 0; font-size: 13px;"><strong>Type:</strong> ${props.type_poste}</p>`;
          if (props.code_commune) popupContent += `<p style="margin: 4px 0; font-size: 13px;"><strong>Code Commune:</strong> ${props.code_commune}</p>`;
          popupContent += '</div>';
          layer.bindPopup(popupContent, { maxWidth: 320 });
        }
      }).addTo(layerGroupRef.current);
    } catch (err) { console.error("Error fetching Postes HTA data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      fetchData();
      const onMoveEnd = () => fetchData();
      map.on('moveend', onMoveEnd);
      return () => { map.off('moveend', onMoveEnd); };
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
    }
  }, [active, map]);

  return null;
}

function HTALayerManager({ layersRef, activeLayers }) {
  const map = useMap();
  const active = activeLayers?.has('enedisHTA');
  const layerGroupRef = useRef(L.featureGroup());

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['enedisHTA'] = layerGroupRef.current;
  }, [layersRef]);

  const fetchData = async () => {
    if (!active || !map) return;
    const bounds = map.getBounds();
    const lonMin = bounds.getWest();
    const latMin = bounds.getSouth();
    const lonMax = bounds.getEast();
    const latMax = bounds.getNorth();

    // DataFair API bbox format: minLon,minLat,maxLon,maxLat
    const bbox = `${lonMin},${latMin},${lonMax},${latMax}`;
    const urls = [
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-hta/lines?size=1000&bbox=${bbox}`,
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-souterrain-hta/lines?size=1000&bbox=${bbox}`
    ];

    try {
      const rawResults = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
      layerGroupRef.current.clearLayers();

      rawResults.forEach((data, index) => {
        if (!data.results) return;
        const isSouterraine = index === 1;

        const geoJson = {
          type: 'FeatureCollection',
          features: data.results.map(r => ({
            type: 'Feature',
            geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry,
            properties: r
          }))
        };

        L.geoJSON(geoJson, {
          style: {
            color: isSouterraine ? 'yellow' : '#FF8C00',
            weight: 3,
            dashArray: isSouterraine ? '5, 5' : null,
            opacity: 0.8
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(`
              <div style="font-family: sans-serif;">
                <h4 style="margin:0 0 5px 0; color: ${isSouterraine ? '#E6B400' : '#FF8C00'};">⚡ Ligne HTA ${isSouterraine ? 'Souterraine' : 'Aérienne'}</h4>
                <p style="margin:2px 0; font-size:12px;"><strong>Longueur:</strong> ${props.longueur_reseau || '?'} m</p>
                <p style="margin:2px 0; font-size:12px;"><strong>Départ:</strong> ${props.nom_depart || '?'}</p>
              </div>
            `);
          }
        }).addTo(layerGroupRef.current);
      });
    } catch (err) { console.error("Error fetching HTA lines data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      fetchData();
      const onMoveEnd = () => fetchData();
      map.on('moveend', onMoveEnd);
      return () => { map.off('moveend', onMoveEnd); };
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
    }
  }, [active, map]);

  return null;
}


const rotationIcon = L.divIcon({
  html: `<div class="bg-white rounded-full p-2 shadow-lg border-2 border-blue-500 cursor-move text-blue-600 hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L12 12h9V3"/></svg></div>`,
  className: 'bg-transparent border-none',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
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

function TextInputPopup({ at, onCancel, onSubmit, initialValue = "" }) {
  const [value, setValue] = useState(initialValue);
  const markerRef = useRef(null);

  useEffect(() => {
    // Open popup immediately on mount
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit(value.trim());
    }
  };

  return (
    <Marker ref={markerRef} position={at} opacity={0}>
      <Popup autoClose={false} closeOnClick={false} closeButton={false} autoPan={false} className="text-input-popup" minWidth={150}>
        <div className="min-w-[260px] space-y-2 bg-white p-3 rounded-lg shadow-lg">
          <label className="text-sm font-semibold text-gray-700">Ajouter un texte</label>
          <textarea
            autoFocus
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Saisir le texte… (Maj+Entrée pour la ligne)"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-white text-sm font-medium transition-colors"
              onClick={() => { if (value.trim()) onSubmit(value.trim()); }}
            >
              Valider
            </button>
            <button type="button" className="rounded bg-gray-200 hover:bg-gray-300 px-3 py-1.5 text-sm text-gray-700 font-medium transition-colors" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}


function UrbanismePopup({ info, onClose }) {
  if (!info) return null;
  return (
    <div className="absolute top-20 right-4 z-[2000] bg-white rounded-xl shadow-2xl border border-slate-200 w-80 max-h-[80vh] overflow-y-auto flex flex-col font-sans text-sm animate-in slide-in-from-right-10">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Infos Urbanisme
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status RNU */}
        {info.isRNU && (
          <div className="bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-100 flex items-start gap-2">
            <div className="w-4 h-4 mt-0.5 flex-shrink-0">⚠️</div>
            <div>
              <p className="font-bold text-xs uppercase tracking-wide mb-1">Attention</p>
              <p className="text-sm">Cette commune est soumise au <strong>Règlement National d'Urbanisme (RNU)</strong>.</p>
            </div>
          </div>
        )}

        {/* Zones */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Zonage
          </h4>
          {info.zones.length > 0 ? (
            <div className="space-y-2">
              {info.zones.map((z, i) => (
                <div key={i} className="bg-blue-50 p-2 rounded border border-blue-100 text-blue-900">
                  <span className="font-bold text-base">{z.type}</span>
                  {z.libelle && <p className="text-xs text-blue-700 mt-1">{z.libelle}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic text-xs">Aucune zone spécifique détectée.</p>
          )}
        </div>

        {/* Documents */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Documents
          </h4>
          {info.documents.length > 0 ? (
            <div className="space-y-2">
              {info.documents.map((d, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-2 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 text-xs px-2 py-0.5 bg-slate-200 rounded-full">{d.type}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${d.status === 'vigueur' || d.status === 'production' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.status}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 my-1" title={d.name}>{d.name}</p>

                  <div className="flex flex-col gap-1 mt-2">
                    <a
                      href={info.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                      title="Voir la parcelle sur le Géoportail"
                    >
                      <ExternalLink className="w-3 h-3" /> Voir sur Géoportail
                    </a>
                    {d.downloadUrl && (
                      <a
                        href={d.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium hover:underline transition-colors"
                        title="Télécharger l'archive complète (ZIP)"
                      >
                        <Download className="w-3 h-3" /> Télécharger l'archive
                      </a>
                    )}
                    {(!d.viewUrl && !d.downloadUrl) && (
                      <span className="text-xs text-gray-400 italic">Document non disponible</span>
                    )}
                  </div>
                  <div className="mt-2 bg-yellow-50 p-1.5 rounded text-[10px] text-yellow-800 border border-yellow-100">
                    <p>ℹ️ Pour connaître les hauteurs et retraits, veuillez consulter la fiche Géoportail ou télécharger le règlement.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic text-xs">Aucun document numérique disponible.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ContextMenu({ position, onAddText, onAddNote, onClose, onCheckUrbanisme }) {
  const map = useMap();
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) onClose(); };
    map.on('click', handleClickOutside);
    return () => map.off('click', handleClickOutside);
  }, [map, onClose]);

  return (
    <Marker position={position} opacity={0}>
      <Popup autoClose={false} closeOnClick={false} closeButton={false} autoPan={false} minWidth={150}>
        <div ref={menuRef} className="flex flex-col gap-1">
          <button onClick={onCheckUrbanisme} className="text-left text-sm p-1 hover:bg-accent rounded flex items-center gap-2"><Building className="w-3 h-3" /> Voir Urbanisme (PLU)</button>
          <button onClick={onAddText} className="text-left text-sm p-1 hover:bg-accent rounded">Ajouter texte simple</button>
          <button onClick={onAddNote} className="text-left text-sm p-1 hover:bg-accent rounded flex items-center gap-2">📝 Ajouter note</button>
        </div>
      </Popup>
    </Marker>
  );
}

function useDeleteKey(onDelete) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || (e.key === "Backspace" && !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
        onDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDelete]);
}

function EditLayer({ mode, setMode, features, setFeatures, temp, setTemp, selectedId, setSelectedId, askTextAt, setAskTextAt, askNoteAt, setAskNoteAt, symbolToPlace, setSymbolToPlace, setPointInfo, altimetryProfile, setAltimetryProfile, rectangleStart, setRectangleStart, targetPos, setTargetPos, setProject, setIsAzimuthDefaulted, isRotatingRef, isUrbanismeMode, setShowInfoPanel, isochroneConfig }) {
  const [mousePos, setMousePos] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [ignoreNextClick, setIgnoreNextClick] = useState(false);
  const draggingRef = useRef(null);
  const lastRightClickTime = useRef(0);
  const lastRightClickPos = useRef(null);
  const map = useMap();
  const [urbanismeInfo, setUrbanismeInfo] = useState(null);

  const checkUrbanisme = async (latlng) => {
    try {
      toast({ title: "Urbanisme", description: "Recherche des informations en cours..." });
      const info = await urbanismeService.getInfo(latlng.lat, latlng.lng);
      setUrbanismeInfo(info);
      if (info.zones.length === 0 && info.documents.length === 0 && !info.isRNU) {
        toast({ title: "Urbanisme", description: "Aucune information trouvée pour ce point." });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de récupérer les infos d'urbanisme.", variant: "destructive" });
    }
  };

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

    // Utiliser API IGN Altimétrie via GET (Géoplateforme data.geopf.fr)
    // Documentation: https://geoservices.ign.fr/documentation/services/api-et-services-ogc/calcul-altimetrique-rest
    try {
      const BATCH_SIZE = 50;
      const totalPoints = points.length;
      let successCount = 0;

      for (let i = 0; i < points.length; i += BATCH_SIZE) {
        const batch = points.slice(i, i + BATCH_SIZE);
        const lons = batch.map(p => p.lng.toFixed(6)).join('|');
        const lats = batch.map(p => p.lat.toFixed(6)).join('|');

        try {
          // Nouvelle URL Géoplateforme
          const res = await fetch(`https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?resource=ign_rge_alti_wld&lon=${lons}&lat=${lats}&zonly=false`);

          if (res.ok) {
            const data = await res.json();
            if (data && data.elevations) {
              data.elevations.forEach((elev, j) => {
                const pointIndex = i + j;
                if (points[pointIndex]) {
                  points[pointIndex].alt = elev.z;
                  successCount++;
                }
              });
            }
          } else {
            console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${res.status}`);
          }

          // Délai de sécurité entre les requêtes
          if (i + BATCH_SIZE < points.length) {
            await new Promise(r => setTimeout(r, 200));
          }
        } catch (err) {
          console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, err);
        }
      }

      console.log(`Altitude IGN: ${successCount}/${totalPoints} points récupérés`);

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

  const handleIsochrone = async (latlng) => {
    if (!isochroneConfig) return;
    try {
      toast({ title: "Génération Isochrone", description: "Calcul en cours..." });
      const geojson = await isochroneService.fetchIsochrone(
        latlng.lat,
        latlng.lng,
        isochroneConfig.costType,
        isochroneConfig.costValue,
        isochroneConfig.profile
      );
      
      const id = crypto.randomUUID();
      const label = `${isochroneConfig.costType === 'duration' ? 'Temps' : 'Distance'} : ${isochroneConfig.costValue} ${isochroneConfig.costType === 'duration' ? 'min' : 'm'}`;
      
      setFeatures(fs => [...fs, { 
        id, 
        type: 'isochrone', 
        geojson, 
        label,
        at: latlng,
        config: { ...isochroneConfig } 
      }]);
      
      toast({ title: "Isochrone généré", description: label });
      setSymbolToPlace(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de générer l'isochrone.", variant: "destructive" });
    }
  };

  useMapEvents({
    click(e) {
      if (isUrbanismeMode) {
        checkUrbanisme(e.latlng);
        return;
      }
      if (ignoreNextClick) {
        setIgnoreNextClick(false);
        return;
      }
      if (contextMenu) setContextMenu(null);
      if (draggingRef.current && draggingRef.current.type === 'rotate') return;
      if (mode === 'delete') return;
      if (symbolToPlace) {
        if (symbolToPlace.type === 'isochrone') {
          handleIsochrone(e.latlng);
          return;
        }
        if (symbolToPlace.type === 'photo') {
          const id = crypto.randomUUID();
          const photos = features.filter(f => f.type === 'photo');
          const maxNum = photos.reduce((max, p) => Math.max(max, p.number || 0), 0);
          const number = maxNum + 1;
          setFeatures(fs => [...fs, { id, type: 'photo', at: e.latlng, number }]);
          setSymbolToPlace(null);
        } else if (symbolToPlace.type === 'text') {
          setAskTextAt(e.latlng);
          // Don't reset symbolToPlace to allow multiple text placements and avoid focus issues
        } else {
          const id = crypto.randomUUID();
          let number = null;
          if (symbolToPlace.type === 'building') {
            const buildingCount = features.filter(f => f.symbolType === 'building').length;
            number = buildingCount + 1;
          }
          setFeatures(fs => [...fs, { id, type: 'symbol', symbolType: symbolToPlace.type, label: symbolToPlace.label, at: e.latlng, emoji: symbolToPlace.emoji, number }]);
          setSymbolToPlace(null);
        }
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
          // Mark manual rectangles as isManual to distinguish from predefined buildings
          setFeatures((arr) => [...arr, { id, type: "rectangle", coords, center, width, height, angle: 0, isManual: true }]);
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
      } else {
        setSelectedId(null);
        e.latlng.isManual = true;
        if (setTargetPos) setTargetPos(e.latlng);
        if (setShowInfoPanel) setShowInfoPanel(true);
      }
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      // Menu contextuel désactivé à la demande de l'utilisateur
      // Plus d'encart lors du clic droit
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
          } else if (type === 'rotate') {
            // Safety check: ensure draggingRef still exists and has center
            if (!draggingRef.current || !draggingRef.current.center) return f;

            // Logic moved from Marker drag to here for smoother updates
            const centerPt = map.latLngToLayerPoint(draggingRef.current.center);
            const mousePt = map.latLngToLayerPoint(e.latlng);
            // atan2(Up) = -90. So Angle = -90 + 90 = 0.
            const newAngle = Math.atan2(mousePt.y - centerPt.y, mousePt.x - centerPt.x) * (180 / Math.PI) + 90;
            return { ...f, angle: newAngle };
          }
          return f;
        }));

        if (type === 'drag') draggingRef.current.startLatLng = e.latlng;
      }
    },
    mouseup() {
      if (draggingRef.current) {
        if (draggingRef.current.type === 'rotate') {
          // Rotation is handled in the Marker dragend event to avoid redundancy
          // Just reset the rotating state if needed (backup in case dragend doesn't fire)
          if (isRotatingRef) isRotatingRef.current = false;
        }
        draggingRef.current = null;
      }
    },
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
        // If no mode is active, show info panel for this point
        e.latlng.isManual = true;
        if (setTargetPos) setTargetPos(e.latlng);
        if (setShowInfoPanel) setShowInfoPanel(true);
      }
    },
    moveend() {
      window.dispatchEvent(new CustomEvent('map:idle', { 
        detail: { 
          center: map.getCenter(), 
          zoom: map.getZoom(),
          bounds: map.getBounds()
        } 
      }));
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
      {urbanismeInfo && <UrbanismePopup info={urbanismeInfo} onClose={() => setUrbanismeInfo(null)} />}
      {features.map((f) => {
        const isSelected = selectedId === f.id;
        const baseEventHandlers = {
          click: (e) => { L.DomEvent.stop(e); if (mode === 'delete') setFeatures(fs => fs.filter(item => item.id !== f.id)); else setSelectedId(f.id); },
          mousedown: (e) => { L.DomEvent.stop(e); if (mode || draggingRef.current) return; draggingRef.current = { type: 'drag', featureId: f.id, startLatLng: e.latlng }; }
        };
        const shapeEventHandlers = baseEventHandlers;

        if (f.type === "line") return <Polyline key={f.id} positions={f.coords} pathOptions={{ color: isSelected ? "#0ea5e9" : "#2563eb", weight: 3, className: mode ? '' : 'cursor-grab' }} eventHandlers={shapeEventHandlers}><Tooltip permanent direction="center" className="measure-label">{formatDistance(polylineLength(f.coords))}</Tooltip></Polyline>;

        if (f.type === "polygon") return <Polygon key={f.id} positions={f.coords} pathOptions={{ color: isSelected ? "#0ea5e9" : "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.25, className: mode ? '' : 'cursor-grab' }} eventHandlers={shapeEventHandlers}><Tooltip permanent direction="center" className="measure-label">{formatArea(polygonArea(f.coords))} | {calculateSolarPower(polygonArea(f.coords))}</Tooltip></Polygon>;

        if (f.type === "rectangle") {
          const center = centroid(f.coords);
          if (!center) return null;
          const centerPt = map.latLngToLayerPoint(center);
          const angleRad = toRad(f.angle || 0);
          console.log('[RECTANGLE RENDER] Feature', f.id, 'rendering with angle:', f.angle, 'angleRad:', angleRad);
          const rotatedCoords = f.coords.map(c => {
            const point = map.latLngToLayerPoint(c);
            const rotated = L.point(centerPt.x + (point.x - centerPt.x) * Math.cos(angleRad) - (point.y - centerPt.y) * Math.sin(angleRad), centerPt.y + (point.x - centerPt.x) * Math.sin(angleRad) + (point.y - centerPt.y) * Math.cos(angleRad));
            return map.layerPointToLatLng(rotated);
          });

          // Debugging RotatablePolygon input
          // if (f.angle && Math.abs(f.angle) > 1) console.log('[RotatablePolygon Input]', rotatedCoords);
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
              {/* Use RotatablePolygon for stable fluid rotation - FIX FOR BLOCKED ROTATION */}
              <Polygon
                key={`rect-${f.id}-${f.angle || 0}`} // Force re-render when angle changes
                positions={rotatedCoords}
                pathOptions={{
                  color: isSelected ? "#0ea5e9" : "#f59e0b",
                  weight: 2,
                  fillColor: "#f59e0b",
                  fillOpacity: 0.2,
                  className: mode ? '' : 'cursor-grab'
                }}
                eventHandlers={shapeEventHandlers}
              />
              {/* Ligne de dimension explicite pour la capture */}
              <Polyline positions={[rotatedCoords[0], rotatedCoords[1], rotatedCoords[2], rotatedCoords[3], rotatedCoords[0]]} pathOptions={{ color: "#f59e0b", weight: 2, opacity: 1, fill: false }} />

              {/* DEBUG: Visualizer for Corner 0 */}

              {rotatedCenter && (() => {
                const predefinedBuildings = features.filter(item => item.type === 'rectangle' && item.isPredefinedBuilding);
                const buildingIndex = predefinedBuildings.findIndex(b => b.id === f.id);
                // Only show "1/", "2/" if there are multiple predefined buildings
                const prefix = (predefinedBuildings.length > 1 && buildingIndex !== -1) ? `${buildingIndex + 1}/ ` : '';
                
                // --- Dimension Sorting & Formatting logic ---
                let d1 = f.buildingLength != null ? f.buildingLength : height;
                let d2 = f.buildingWidth != null ? f.buildingWidth : width;

                // Helper to safely parse dimension (handles string like "12.7 + 4")
                const parseDim = (val) => {
                  if (typeof val === 'number') return val;
                  if (typeof val === 'string') {
                    return val.replace(',', '.').split('+').reduce((acc, part) => acc + (parseFloat(part.trim()) || 0), 0);
                  }
                  return 0;
                };

                const val1 = parseDim(d1);
                const val2 = parseDim(d2);

                let dimsStr = "";
                if (val1 >= val2) {
                  dimsStr = `${formatDistance(val1)} x ${formatDistance(val2)}`;
                } else {
                  dimsStr = `${formatDistance(val2)} x ${formatDistance(val1)}`;
                }
                // --------------------------------------------

                return (
                  <Marker position={rotatedCenter} opacity={0}>
                    <Tooltip permanent direction="center" className="measure-label">
                      {prefix}{f.buildingName && `${f.buildingName} - `} {dimsStr} ({f.buildingSurface != null ? `${f.buildingSurface} m²` : formatArea(area)} | {f.buildingPower != null ? `${f.buildingPower} kWc` : calculateSolarPower(area)})
                    </Tooltip>
                  </Marker>
                );
              })()}
              {/* STEP 2: Rotation enabled for ALL rectangles (manual + predefined) using same code */}
              {isSelected && rotationHandlePos && <Marker position={rotationHandlePos} icon={rotationIcon} draggable={true} zIndexOffset={1000} eventHandlers={{
                dragstart: (e) => {
                  L.DomEvent.stop(e);
                  if (isRotatingRef) isRotatingRef.current = true;
                  draggingRef.current = { type: 'rotate', featureId: f.id, center: center };
                  console.log('[ROTATION START]');
                },
                drag: (e) => {
                  // Update VISUAL rotation only in real-time
                  const centerPt = map.latLngToLayerPoint(center);
                  const handlePt = map.latLngToLayerPoint(e.target.getLatLng());
                  const newAngle = Math.atan2(handlePt.y - centerPt.y, handlePt.x - centerPt.x) * (180 / Math.PI) + 90;

                  // Update only the features state, NOT the project azimuth yet
                  setFeatures(prev => prev.map(feat =>
                    feat.id === f.id ? { ...feat, angle: newAngle } : feat
                  ));
                },
                dragend: (e) => {
                  console.log('[ROTATION END] Drag finished');

                  // Small delay to allow react cycle to complete before unblocking sync
                  setTimeout(() => {
                    if (isRotatingRef) isRotatingRef.current = false;
                    draggingRef.current = null;
                    console.log('[ROTATION END] Synchro unblocked');
                  }, 1000);
                }
              }} />}
            </Fragment>
          );
        }
        if (f.type === "text") return (
          <Marker
            key={f.id}
            position={f.at}
            icon={textIcon(f.value)}
            draggable={false}
            eventHandlers={{
              ...baseEventHandlers,
              click: (e) => {
                L.DomEvent.stop(e);
                if (mode === 'delete') {
                  setFeatures(fs => fs.filter(item => item.id !== f.id));
                } else {
                  setAskTextAt(f.at);
                  setSelectedId(f.id);
                }
              }
            }}
          />
        );
        if (f.type === "note") return <Marker key={f.id} position={f.at} icon={noteIcon(f.value)} draggable={false} eventHandlers={baseEventHandlers} />;
        if (f.type === 'symbol' || f.type === 'photo') return <Marker key={f.id} position={f.at} icon={f.type === 'symbol' ? symbolIcon(f.emoji, f.number) : photoIcon(f.number)} draggable={false} eventHandlers={baseEventHandlers}><Tooltip>{f.type === 'symbol' ? f.label : `Photo ${f.number}`}</Tooltip></Marker>;
        if (f.type === 'isochrone') return (
          <Fragment key={f.id}>
            <L.GeoJSON 
              data={f.geojson}
              style={{
                color: '#3b82f6',
                weight: 3,
                fillColor: '#3b82f6',
                fillOpacity: 0.2
              }}
              onEachFeature={(feature, layer) => {
                layer.bindTooltip(f.label);
                layer.on({
                  click: (e) => {
                    L.DomEvent.stop(e);
                    if (mode === 'delete') {
                      setFeatures(fs => fs.filter(item => item.id !== f.id));
                    } else {
                      setSelectedId(f.id);
                    }
                  }
                });
              }}
            />
            {f.at && (
              <Marker 
                position={f.at} 
                icon={L.divIcon({ 
                  html: '📍', 
                  className: 'bg-transparent border-none',
                  iconSize: [20, 20],
                  iconAnchor: [10, 20]
                })}
              />
            )}
          </Fragment>
        );
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
          {tempPolyCoords.length >= 3 && centroid(tempPolyCoords) && <Marker position={centroid(tempPolyCoords)} opacity={0}><Tooltip permanent direction="center" className="measure-label">{formatArea(polygonArea(tempPolyCoords))} | {calculateSolarPower(polygonArea(tempPolyCoords))}</Tooltip></Marker>}
        </Fragment>
      )}
      {mode === "rectangle" && tempRectBounds && (
        <Fragment>
          <Rectangle bounds={tempRectBounds} pathOptions={{ color: "#f59e0b", weight: 2, fillColor: "#f59e0b", fillOpacity: 0.2, dashArray: '5, 5' }} />
          {(() => {
            const ne = tempRectBounds.getNorthEast(); const sw = tempRectBounds.getSouthWest(); const nw = L.latLng(ne.lat, sw.lng); const width = haversine(nw, ne); const height = haversine(nw, sw); const center = tempRectBounds.getCenter(); const area = width * height;
            const d1 = Math.max(width, height);
            const d2 = Math.min(width, height);
            return <Marker position={center} opacity={0}><Tooltip permanent direction="center" className="measure-label">{formatDistance(d1)} x {formatDistance(d2)} ({formatArea(area)} | {calculateSolarPower(area)})</Tooltip></Marker>;
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

      {askTextAt && (
        <TextInputPopup
          at={askTextAt}
          initialValue={selectedId && features.find(f => f.id === selectedId)?.type === 'text' ? features.find(f => f.id === selectedId).value : ""}
          onCancel={() => { setAskTextAt(null); setSelectedId(null); setMode(null); }}
          onSubmit={(val) => {
            if (selectedId && features.find(f => f.id === selectedId)?.type === 'text') {
              setFeatures(fs => fs.map(f => f.id === selectedId ? { ...f, value: val } : f));
            } else {
              const id = crypto.randomUUID();
              setFeatures((arr) => [...arr, { id, type: "text", at: askTextAt, value: val }]);
            }
            setAskTextAt(null);
            setSelectedId(null);
            setMode(null);
          }}
        />
      )}
      {askNoteAt && <TextInputPopup at={askNoteAt} onCancel={() => { setAskNoteAt(null); setMode(null); }} onSubmit={(val) => { const id = crypto.randomUUID(); setFeatures((arr) => [...arr, { id, type: "note", at: askNoteAt, value: val }]); setAskNoteAt(null); setMode(null); }} />}
      {urbanismeInfo && <UrbanismePopup info={urbanismeInfo} onClose={() => setUrbanismeInfo(null)} />}
      {contextMenu && <ContextMenu
        position={contextMenu.position}
        onAddText={() => { setAskTextAt(contextMenu.position); setContextMenu(null); }}
        onAddNote={() => { setAskNoteAt(contextMenu.position); setContextMenu(null); }}
        onCheckUrbanisme={() => { checkUrbanisme(contextMenu.position); setContextMenu(null); }}
        onClose={() => setContextMenu(null)}
      />}
    </LayerGroup>
  );
}

// ====================================================================
// STYLES PERSONNALISÉS (SLD) POUR ENEDIS
// ====================================================================
// --- Layers Data ---

// ====================================================================
// LISTE DES CALQUES
// ====================================================================
const LAYERS = {
  // ========== FONDS DE CARTE ==========
  geoportailSat: { name: "Géoportail", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', zIndex: 0, maxNativeZoom: 19, maxZoom: 22 },
  googleSat: { name: "Google Satellite", url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", attrib: 'Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], zIndex: 0, maxZoom: 22 },
  google: { name: "Google", url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", attrib: 'Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], zIndex: 0, maxZoom: 22 },
  ignPlan: { name: "IGN - Plan IGN", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', zIndex: 0, maxNativeZoom: 18, maxZoom: 22 },
  osm: { name: "Plan OSM", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attrib: '© OpenStreetMap contributors', zIndex: 0, maxNativeZoom: 19, maxZoom: 22 },

  // ========== CALQUES OVERLAY ==========
  // Cadastre & Bâtiments
  cadastre: { name: 'Cadastre', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=PCI vecteur&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', attrib: '© IGN', isOverlay: true, zIndex: 1, opacity: 0.75, maxNativeZoom: 19, maxZoom: 22 },
  batiments: { name: "Bâtiments", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=BUILDINGS.BUILDINGS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 11, maxNativeZoom: 20, maxZoom: 22 },

  // Agriculture et occupation du sol
  rpg: { name: 'Parcelles agricoles', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', attrib: '© IGN', isOverlay: true, zIndex: 2, opacity: 0.7, maxNativeZoom: 18, maxZoom: 22 },

  // Hydrographie
  hydro: { name: "Hydrographie", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=HYDROGRAPHY.HYDROGRAPHY&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 12, maxNativeZoom: 18, maxZoom: 22 },

  // Transport
  routes: { name: "Routes", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.ROADS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 30, opacity: 0.7, maxNativeZoom: 20, maxZoom: 22 },
  voiesFerrees: { name: "Voies ferrées", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.RAILWAYS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 31, opacity: 0.7, maxNativeZoom: 20, maxZoom: 22 },

  // Limites administratives
  communes: { name: "Limites communales", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ADMINEXPRESS-COG-CARTO.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", attrib: '© IGN', isOverlay: true, zIndex: 32, opacity: 0.5, maxNativeZoom: 20, maxZoom: 22 },

  // ENEDIS - Réseau électrique (Using WMS for performance with 1M points)
  enedisHTA: {
    name: "Lignes HTA",
    type: 'custom',
    urls: [
      "https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/lignes-electriques-aeriennes-moyenne-tension-hta/records",
      "https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/lignes-electriques-souterraines-moyenne-tension-hta/records"
    ],
    isOverlay: true,
    isDynamic: true,
    zIndex: 50,
    minZoom: 9
  },
  enedisPostes: {
    name: "Postes HTA/BT",
    type: 'custom',
    url: "https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/postes-electriques-de-distribution-publique-postes-htabt/records",
    isOverlay: true,
    isDynamic: true,
    zIndex: 51,
    minZoom: 9
  },
  enedisLigneBT: {
    name: "Lignes BT",
    type: 'custom',
    minZoom: 13, // Prevent loading at low zoom
    attribution: "Enedis Open Data",
    isOverlay: true,
    zIndex: 52
  },

  // SDIS - Points d'eau incendie
  sdis: {
    name: "SDIS",
    type: 'custom',
    apis: [
      'https://api.deci.sdis17.fr/api/v1/peis?format=geojson',
      'https://api.deci.sdis84.fr/api/v1/peis?format=geojson',
      'https://api.deci.sdis81.fr/api/v1/peis?format=geojson'
    ],
    attribution: 'SDIS 17, 81, 84 / Datakode',
    isOverlay: true,
    zIndex: 100
  },

  // Urbanisme
  // Urbanisme
  zoneInondable: {
    name: "Zone Inondable",
    url: "https://mapsref.brgm.fr/wxs/georisques/risques?",
    layers: "PPRN_ZONE_INOND",
    format: "image/png",
    transparent: true,
    attribution: "Géorisques / BRGM",
    isOverlay: true,
    opacity: 0.7,
    maxNativeZoom: 14,
    maxZoom: 22
  },
  "ZNIEFF 1": {
    name: "ZNIEFF 1",
    url: "https://data.geopf.fr/wms-v/wms",
    layers: "PROTECTEDAREAS.ZNIEFF1",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true,
    zIndex: 101,
    opacity: 0.6,
    maxNativeZoom: 16,
    maxZoom: 22
  },
  "ZNIEFF 2": {
    name: "ZNIEFF 2",
    url: "https://data.geopf.fr/wms-v/wms",
    layers: "PROTECTEDAREAS.ZNIEFF2",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true,
    zIndex: 102,
    opacity: 0.6,
    maxNativeZoom: 16,
    maxZoom: 22
  },
  "Natura 2000 Oiseaux": {
    name: "Natura 2000 Oiseaux",
    url: "https://data.geopf.fr/wms-v/wms",
    layers: "PROTECTEDAREAS.ZPS",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true,
    zIndex: 103,
    opacity: 0.6,
    maxNativeZoom: 16,
    maxZoom: 22
  },
  "Natura 2000 Habitat": {
    name: "Natura 2000 Habitat",
    url: "https://data.geopf.fr/wms-v/wms",
    layers: "PROTECTEDAREAS.SIC",
    format: "image/png",
    transparent: true,
    attribution: "INPN",
    isOverlay: true,
    zIndex: 104,
    opacity: 0.6,
    maxNativeZoom: 16,
    maxZoom: 22
  },
  abf: {
    name: "ABF (Zones AC1)",
    url: "https://data.geopf.fr/wms-v/ows",
    layers: "monument_historique",
    format: "image/png",
    transparent: true,
    attribution: "GéoPlateforme / IGN",
    isOverlay: true,
    zIndex: 105,
    opacity: 0.6,
    maxNativeZoom: 18,
    maxZoom: 22
  },
  gaz: {
    name: "Réseau Gaz",
    type: 'gaz-dynamic',
    isDynamic: true,
    url: 'https://opendata.agenceore.fr/data-fair/api/v1/datasets/infrastructures-reseau-gaz/lines',
    attribution: 'Agence ORE / Data.gouv.fr',
    isOverlay: true,
    zIndex: 106,
    color: '#800080'
  },
  capareseau: {
    name: "Caparéseau (S3REnR)",
    type: 'capareseau',
    isDynamic: true,
    attribution: 'ODRÉ / S3REnR',
    isOverlay: true,
    zIndex: 107
  },
  companies: {
    name: "Sociétés",
    type: 'companies',
    isDynamic: true,
    attribution: 'SIRENE / MELODI',
    isOverlay: true,
    zIndex: 108,
    minZoom: 16
  },
  altimetry: {
    name: "Altimétrie",
    url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    attrib: '© IGN',
    isOverlay: true,
    zIndex: 1,
    opacity: 0.7,
    maxNativeZoom: 18,
    maxZoom: 22
  }
};
// ====================================================================
// FIN DE LA LISTE DES CALQUES
// ====================================================================




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
      className="absolute bottom-[359px] right-[10px] z-[995] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-300 max-w-[200px]"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-xs text-gray-900">Légende Parcelles agricoles</h4>
        <button onClick={() => setShowLegend(false)} className="p-1 hover:bg-gray-200 rounded"><XIcon className="h-3 w-3" /></button>
      </div>
      <div className="space-y-1.5 text-[10px] overflow-y-auto max-h-[250px] pr-1">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#90EE90] border border-gray-300"></div><span>Prairies permanentes</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#800080] border border-gray-300"></div><span>Oléagineux (Colza, Tournesol)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FF0000] border border-gray-300"></div><span>Maïs</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FFFF00] border border-gray-300"></div><span>Céréales à paille (Blé)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#F5F5DC] border border-gray-300"></div><span>Jachères (Beige)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FFA500] border border-gray-300"></div><span>Vergers</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#800000] border border-gray-300"></div><span>Vignes</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FFD700] border border-gray-300"></div><span>Fourrages</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#DEB887] border border-gray-300"></div><span>Protéagineux</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FF69B4] border border-gray-300"></div><span>Betteraves</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#00CED1] border border-gray-300"></div><span>Cultures industrielles</span></div>
      </div>
    </div>
  );
}

// ====================================================================
// LÉGENDE ZONE INONDABLE (PPRN)
// ====================================================================
function ZoneInondableLegend({ layersRef }) {
  const map = useMap();
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const checkLayer = () => {
      const layer = layersRef.current['zoneInondable'];
      setShowLegend(layer && map.hasLayer(layer));
    };
    checkLayer();
    const interval = setInterval(checkLayer, 500);
    return () => clearInterval(interval);
  }, [map, layersRef]);

  if (!showLegend) return null;

  return (
    <div
      className="absolute bottom-[555px] right-[10px] z-[995] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-300 max-w-[220px]"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-xs text-gray-900">Légende Zone Inondable</h4>
        <button onClick={() => setShowLegend(false)} className="p-1 hover:bg-gray-200 rounded"><XIcon className="h-3 w-3" /></button>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#FF0000] opacity-70 border border-gray-300"></div>
          <span>Zone rouge (Aléa fort / Inconstructible)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#0000FF] opacity-70 border border-gray-300"></div>
          <span>Zone bleue (Aléa moyen / Expansion)</span>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// LÉGENDE SDIS 17
// ====================================================================
function SDISLegend({ layersRef }) {
  const map = useMap();
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const checkLayer = () => {
      const layer = layersRef.current['sdis'];
      setShowLegend(layer && map.hasLayer(layer));
    };
    checkLayer();
    const interval = setInterval(checkLayer, 500);
    return () => clearInterval(interval);
  }, [map, layersRef]);

  if (!showLegend) return null;

  return (
    <div
      className="absolute bottom-[268px] right-[10px] z-[995] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-300 max-w-[200px]"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-xs text-gray-900">Légende SDIS</h4>
        <button onClick={() => setShowLegend(false)} className="p-1 hover:bg-gray-200 rounded"><XIcon className="h-3 w-3" /></button>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444] border border-[#991B1B]"></div>
          <span>Poteau Incendie (PI)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#EF4444] border border-[#991B1B]"></div>
          <span>Bouche Incendie (BI)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#3B82F6] border border-[#1E40AF]"></div>
          <span>Réserve / Point d'eau</span>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// MANAGER SDIS 17 (Logique WFS + Cluster)
// ====================================================================
function SDISLayerManager({ layersRef, activeLayers }) {
  const map = useMap();
  const active = activeLayers?.has('sdis');
  const layerGroupRef = useRef(L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 200,
    chunkDelay: 50,
    maxClusterRadius: 50,
    disableClusteringAtZoom: 17,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      let size = count > 100 ? 'large' : count > 10 ? 'medium' : 'small';
      const colors = {
        small: { bg: 'rgba(220, 20, 60, 0.7)', border: 'rgba(200, 10, 50, 0.9)' },
        medium: { bg: 'rgba(200, 10, 50, 0.7)', border: 'rgba(178, 34, 34, 0.9)' },
        large: { bg: 'rgba(178, 34, 34, 0.8)', border: 'rgba(139, 0, 0, 1)' }
      };
      const dimensions = { small: '30px', medium: '40px', large: '50px' };
      return L.divIcon({
        html: `<div style="background-color: ${colors[size].bg}; border: 3px solid ${colors[size].border}; width: ${dimensions[size]}; height: ${dimensions[size]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: ${size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px'};"><span>${count}</span></div>`,
        className: '',
        iconSize: [40, 40]
      });
    }
  }));

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current['sdis'] = layerGroupRef.current;
  }, [layersRef]);

  const loadData = async () => {
    const layerConfig = LAYERS['sdis'];
    const apis = layerConfig.apis || [];
    try {
      const results = await Promise.all(apis.map(url => {
        let proxyUrl = url;
        if (url.includes('sdis17.fr')) proxyUrl = url.replace('https://api.deci.sdis17.fr', '/sdis-proxy/17');
        else if (url.includes('sdis84.fr')) proxyUrl = url.replace('https://api.deci.sdis84.fr', '/sdis-proxy/84');
        else if (url.includes('sdis81.fr')) proxyUrl = url.replace('https://api.deci.sdis81.fr', '/sdis-proxy/81');
        return fetch(proxyUrl).then(r => r.ok ? r.json() : { features: [] }).catch(() => ({ features: [] }));
      }));

      const allFeatures = results.flatMap(r => r.features || []);
      layerGroupRef.current.clearLayers();

      if (allFeatures.length > 0) {
        L.geoJSON({ type: 'FeatureCollection', features: allFeatures }, {
          pointToLayer: (feature, latlng) => {
            const type = feature.properties?.type_hydrant || feature.properties?.famille_pei || '';
            let html = '';
            if (type.startsWith('PI') || type.includes('POTEAU')) html = `<div style="background-color: #EF4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #991B1B; box-shadow: 0 1px 3px rgba(0,0,0,0.5);"></div>`;
            else if (type.startsWith('BI') || type.includes('BOUCHE')) html = `<div style="background-color: #EF4444; width: 14px; height: 14px; border-radius: 2px; border: 2px solid #991B1B; box-shadow: 0 1px 3px rgba(0,0,0,0.5);"></div>`;
            else if (['REA', 'RENA'].includes(type) || type.includes('Reserve')) html = `<div style="background-color: #3B82F6; width: 14px; height: 14px; border-radius: 2px; border: 2px solid #1E40AF; box-shadow: 0 1px 3px rgba(0,0,0,0.5);"></div>`;
            else html = `<div style="background-color: #9CA3AF; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #4B5563;"></div>`;

            return L.marker(latlng, {
              icon: L.divIcon({ className: '', html: html, iconSize: [14, 14], iconAnchor: [7, 7] })
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            let popupContent = '<div style="font-family: sans-serif;">';
            popupContent += '<h4 style="margin: 0 0 8px 0; color: #DC143C; font-size: 16px; font-weight: bold;">🚒 Point d\'Eau Incendie</h4>';
            popupContent += `<p style="margin: 4px 0;"><strong>Commune:</strong> ${props.commune || 'N/A'}</p>`;
            popupContent += `<p style="margin: 4px 0;"><strong>Numéro:</strong> ${props.numero_long || props.nom || 'N/A'}</p>`;
            popupContent += '</div>';
            layer.bindPopup(popupContent, { maxWidth: 300 });
          }
        }).addTo(layerGroupRef.current);
      }
    } catch (err) { console.error("Error loading SDIS data", err); }
  };

  useEffect(() => {
    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) layerGroupRef.current.addTo(map);
      if (layerGroupRef.current.getLayers().length === 0) loadData();
    } else {
      if (map.hasLayer(layerGroupRef.current)) map.removeLayer(layerGroupRef.current);
    }
  }, [active, map]);

  return null;
}


// ENEDIS Managers were removed in favor of WMS layers for performance with 1M points.


// Overlay controls removed - now handled via buttons below map in ProjectEditor.jsx

// ====================================================================
// CONTRÔLE DES FONDS DE CARTE
// ====================================================================
// Contrôle standard en bas à droite pour les FONDS DE CARTE
function BasemapControl({ layersRef }) {
  const map = useMap();
  const boxRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!map || !layersRef.current) return;

    // Outer wrapper (toggle button + panel)
    const wrapper = L.DomUtil.create('div', 'no-print hide-on-capture');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'flex-end';
    wrapper.style.gap = '4px';

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.innerText = '🗺️ Fonds de carte ▼';
    toggleBtn.style.cssText = `background:white;border:1px solid #ccc;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);white-space:nowrap;color:#374151;display:${isDesktop ? 'none' : 'block'};`;
    wrapper.appendChild(toggleBtn);

    // Panel (initially hidden on mobile, visible on desktop)
    const container = document.createElement('div');
    container.style.cssText = `padding:10px;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);min-width:180px;max-height:250px;overflow-y:auto;display:${isDesktop ? 'block' : 'none'};`;
    wrapper.appendChild(container);

    const title = document.createElement('div');
    title.innerText = 'FONDS DE CARTE';
    title.style.cssText = 'font-weight:700;font-size:11px;margin-bottom:10px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;letter-spacing:0.05em;';
    container.appendChild(title);

    const list = document.createElement('div');
    container.appendChild(list);

    // Toggle open/close (only relevant for mobile)
    let isOpen = isDesktop;
    toggleBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      L.DomEvent.stopPropagation(ev);
      isOpen = !isOpen;
      container.style.display = isOpen ? 'block' : 'none';
      toggleBtn.innerText = isOpen ? '🗺️ Fonds de carte ▲' : '🗺️ Fonds de carte ▼';
    });

    const Control = L.Control.extend({ onAdd: () => wrapper });
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
          separator.style.cssText = 'margin:6px 0;border-color:#e5e7eb;';
          list.appendChild(separator);
          return;
        }

        if (layer.zIndex === 0) {
          const label = document.createElement('label');
          label.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:pointer;padding:4px 6px;border-radius:4px;font-size:13px;transition:background 0.1s;';
          label.onmouseenter = () => { label.style.background = '#f9fafb'; };
          label.onmouseleave = () => { label.style.background = ''; };

          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'basemap';
          input.checked = map.hasLayer(layersRef.current[key]);
          input.style.cssText = 'accent-color:#2563eb;width:14px;height:14px;';

          const span = document.createElement('span');
          span.innerText = layer.name;
          span.style.cssText = 'color:#374151;font-weight:500;';

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
  }, [map, layersRef, isDesktop]);
  return null;
}

function LayersBootstrap({ layersRef }) {
  const map = useMap();
  useEffect(() => {
    Object.keys(LAYERS).forEach(key => {
      const layerDef = LAYERS[key];
      if (layerDef.isSeparator || layerDef.isDynamic) return; // Skip separators and dynamic layers here

      if (layerDef.layers) { // WMS layers
        const wmsOptions = {
          layers: layerDef.layers,
          format: layerDef.format || 'image/png',
          transparent: layerDef.transparent !== false,
          attribution: layerDef.attribution,
          minZoom: layerDef.minZoom || 0,
          maxZoom: layerDef.maxZoom || 20,
          opacity: layerDef.opacity || 1.0,
          zIndex: layerDef.zIndex || 10,
          pane: 'overlayPane',
          interactive: false,
          styles: layerDef.styles || ''
        };

        if (layerDef.sld_body) {
          wmsOptions.sld_body = layerDef.sld_body;
        }

        layersRef.current[key] = L.tileLayer.wms(layerDef.url, wmsOptions);
      } else if (layerDef.url) { // TileLayer (WMTS or standard XYZ)
        layersRef.current[key] = L.tileLayer(layerDef.url, {
          attribution: layerDef.attrib || layerDef.attribution,
          minZoom: layerDef.minZoom || 0,
          maxZoom: layerDef.maxZoom || 22,
          maxNativeZoom: layerDef.maxNativeZoom || undefined,
          subdomains: layerDef.subdomains || ['a', 'b', 'c'],
          zIndex: layerDef.zIndex || 0,
          opacity: layerDef.opacity || 1.0,
          pane: layerDef.isOverlay ? 'overlayPane' : 'tilePane',
          interactive: layerDef.isOverlay ? false : true
        });
      }
    });

    // Add default basemap
    if (layersRef.current.geoportailSat && !map.hasLayer(layersRef.current.geoportailSat)) {
      layersRef.current.geoportailSat.addTo(map);
    }

    return () => {
      Object.values(layersRef.current).forEach((l) => {
        if (l && map.hasLayer(l)) map.removeLayer(l);
      });
    };
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
  return <div ref={miniMapContainerRef} className="hidden lg:block w-40 h-32 border-2 border-border rounded-lg shadow-lg overflow-hidden bg-card hide-on-capture" />;
}

function MapTargetInfo({ targetPos, setTargetPos, hoverInfo, showInfoPanel, setShowInfoPanel, project, setProject }) {
  const map = useMap();
  const [info, setInfo] = useState({ lat: 0, lng: 0, alt: '...', address: '...', parcel: '...', zoning: '...' });
  const [loading, setLoading] = useState(false);
  const [hasInitializedFromProject, setHasInitializedFromProject] = useState(false);

  // Initialize target: use map center or fallback to 7 rue Gutenberg, Mérignac (siège ENR Courtage)
  const DEFAULT_LAT = 44.82618;
  const DEFAULT_LNG = -0.671985;

  useEffect(() => {
    if (!hasInitializedFromProject && project?.gps) {
      const parts = project.gps.split(',');
      if (parts.length === 2) {
        const plat = parseFloat(parts[0].trim());
        const plng = parseFloat(parts[1].trim());
        if (!isNaN(plat) && !isNaN(plng)) {
          setTargetPos({ lat: plat, lng: plng });
          setHasInitializedFromProject(true);
          return;
        }
      }
    }

    if (!targetPos) {
      setTargetPos({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    }
  }, [targetPos, project?.gps, hasInitializedFromProject, setTargetPos]);

  useEffect(() => {
    if (hoverInfo) {
      // Si on a des infos de survol (depuis le profil alti), on les affiche directement
      setInfo(prev => ({
        ...prev,
        lat: hoverInfo.lat,
        lng: hoverInfo.lng,
        alt: `${hoverInfo.altitude.toFixed(1)} m`,
        address: 'Point du profil', // Ou laisser l'ancienne adresse si on veut
        parcel: '...',
        zoning: '...'
      }));
      return;
    }

    if (!targetPos) return;

    // Le check "Clé IGN?" est retiré.
    // Affiche "..." pendant le chargement, puis "N/A" si la clé est manquante/invalide.

    const updateInfo = async () => {
      setInfo(prev => ({ ...prev, lat: targetPos.lat, lng: targetPos.lng, alt: '...', address: '...', parcel: '...', zoning: '...' }));
      setLoading(true);

      try {
        // Lancer toutes les requêtes en parallèle pour optimiser la vitesse
        const [altRes, addrRes, parcRes, urbanRes] = await Promise.allSettled([
          fetch(`https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?resource=ign_rge_alti_wld&lon=${targetPos.lng}&lat=${targetPos.lat}&zonly=false`)
            .then(r => r.json()),
          // Adresse : API Adresse
          fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${targetPos.lng}&lat=${targetPos.lat}`)
            .then(r => r.json()),
          // Parcelle cadastrale : API Carto IGN
          fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${targetPos.lng},${targetPos.lat}]}`)
            .then(r => r.json()),
          // Urbanisme : utilise le service déjà intégré
          urbanismeService.getInfo(targetPos.lat, targetPos.lng)
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

        // Traiter le zonage urbanistique
        let zoning = 'N/A';
        if (urbanRes.status === 'fulfilled' && urbanRes.value) {
          const urbanData = urbanRes.value;
          const zone = urbanData.zones?.[0]?.type || null;
          let docType = null;

          if (urbanData.isRNU) {
            docType = 'RNU';
          } else if (urbanData.documents?.[0]) {
            docType = urbanData.documents[0].type; // PLU, PLUi, CC, etc.
          }

          if (zone && docType) {
            zoning = `${zone} / ${docType}`;
          } else if (zone) {
            zoning = zone;
          } else if (docType) {
            zoning = docType;
          }
        }

        setInfo(prev => ({ ...prev, alt, address, parcel, zoning }));

        if (targetPos.isManual && setProject) {
          setProject(prev => {
            const currentGps = `${targetPos.lat}, ${targetPos.lng}`;
            if (prev.gps === currentGps) return prev;
            return {
              ...prev,
              gps: currentGps,
              address: (address !== 'N/A' && address !== 'Adresse non trouvée') ? address : prev.address
            };
          });
        }
      } catch (e) {
        console.error("Info fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    // Debounce réduit pour réactivité
    const timeoutId = setTimeout(updateInfo, 100);
    return () => clearTimeout(timeoutId);
  }, [targetPos, hoverInfo, setProject]);

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

  if (!showInfoPanel) return null;

  return (
    <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200 text-xs min-w-[220px] max-w-[280px] z-[1000]">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-blue-600 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors flex items-center gap-1" onClick={copyCoords} title="Copier les coordonnées">
          {info.lat.toFixed(5)}, {info.lng.toFixed(5)} <Copy size={12} />
        </span>
        <button
          type="button"
          onClick={() => setShowInfoPanel(false)}
          className="ml-1 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          title="Fermer"
        >
          <XIcon size={14} />
        </button>
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

      {/* Zonage urbanistique */}
      <div className="flex items-center gap-1 border-t pt-1 text-gray-600 mt-1">
        <span className="flex items-center gap-1" title="Zonage urbanistique">🏛️ <strong>Zonage:</strong> {info.zoning}</span>
      </div>
    </div>
  );
}


function MapEvents({ project, setProject, onAddressFound, onAddressSearched, setPhotoToPlace, onBuildingSelect, features, setFeatures, setIsAzimuthDefaulted, isRotatingRef, lastSyncedAzimuthRef, setTargetPos, setShowInfoPanel }) {
  const map = useMap();
  // lastSyncedAzimuthRef is now passed as prop

  // Synchronisation : Change le rectangle sur la carte quand l'azimut change dans le formulaire
  // Synchronisation : Change le rectangle sur la carte quand l'azimut change dans le formulaire
  useEffect(() => {
    // Si l'utilisateur est en train de tourner manuellement, on ignore la synchro venant du projet
    if (isRotatingRef?.current) {
      return;
    }

    setFeatures(prev => {
      // Find all predefined buildings
      const predefinedBuildings = prev.filter(f => f.type === 'rectangle' && (f.isPredefinedBuilding === true || f.buildingName));
      if (predefinedBuildings.length === 0) return prev;

      // Check if any building needs update
      let hasChanges = false;
      const nextFeatures = prev.map(f => {
        const bldgIndex = predefinedBuildings.findIndex(p => p.id === f.id);
        if (bldgIndex === -1) return f; // Not a predefined building

        // Determine target azimuth based on index
        let targetAzimuth = undefined;
        if (bldgIndex === 0) targetAzimuth = project?.panelAspect;
        else if (bldgIndex === 1) targetAzimuth = project?.panelAspect2;

        if (targetAzimuth === undefined || targetAzimuth === null) return f;

        const visualAngle = calculateAngleFromAzimuth(Number(targetAzimuth));

        // Normalize angles
        const currentAngleNorm = ((f.angle || 0) % 360 + 360) % 360;
        const visualAngleNorm = ((visualAngle % 360) + 360) % 360;

        let diff = Math.abs(currentAngleNorm - visualAngleNorm);
        if (diff > 180) diff = 360 - diff;

        // Check for equivalence (including 180 flip)
        let isEquivalent = false;
        if (diff < 1) isEquivalent = true;
        if (Math.abs(diff - 180) < 1) isEquivalent = true;

        if (isEquivalent) return f;

        hasChanges = true;
        // console.log(`[SYNC AZIMUTH] Updating Building ${bldgIndex + 1} to ${visualAngle}° (Az: ${targetAzimuth})`);
        return { ...f, angle: visualAngle };
      });

      return hasChanges ? nextFeatures : prev;
    });
  }, [project?.panelAspect, project?.panelAspect2, setFeatures, isRotatingRef]);
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
      const initialAngle = 0;
      // Mark as predefined building to distinguish from manual rectangles
      setFeatures(arr => [...arr, { id, type: "rectangle", buildingName: building.code, coords: [nw, ne, se, sw], angle: initialAngle, isPredefinedBuilding: true, buildingLength: building.length, buildingWidth: building.width, buildingSurface: building.surface, buildingPower: building.power }]);

      // Update Azimuth immediately
      const az = calculateAzimuthFromAngle(initialAngle);

      // FIX: Use local features state to check for existence of predefined buildings
      // 'features' prop contains the state BEFORE this update (so it contains B1 if we are adding B2)
      const existingPredefined = features.filter(f => f.type === 'rectangle' && f.isPredefinedBuilding);
      const isSecondBuilding = existingPredefined.length >= 1;

      if (isSecondBuilding) {
        setProject(prev => ({ ...prev, panelAspect2: az, panelAngle2: '15' })); // Default angle 15 for 2nd building
        toast({ ...toastStyle, title: `Bâtiment ${building.code} ajouté`, description: `Azimut calculé : ${az}° (Sud) - Configuré en Bâtiment 2` });
      } else {
        // If this is the FIRST building, we set the primary panelAspect
        // We do NOT touch panelAspect if we are adding a second building.
        setProject(prev => ({ ...prev, panelAspect: az }));
        if (setIsAzimuthDefaulted) setIsAzimuthDefaulted(true);
        toast({ ...toastStyle, title: `Bâtiment ${building.code} ajouté`, description: `Azimut calculé : ${az}° (Sud)` });
      }
    };

    const handleUpdateLastBuilding = (e) => {
      const { building } = e.detail;
      console.log('[UPDATE BLDG] Called with building:', building.code, 'dimensions:', building.length, 'x', building.width);

      setFeatures(prev => {
        // Find last PREDEFINED BUILDING only (not manual rectangles)
        const predefinedBuildings = prev.filter(f => f.type === 'rectangle' && f.isPredefinedBuilding === true);
        if (predefinedBuildings.length === 0) {
          console.log('[UPDATE BLDG] No predefined buildings found');
          return prev;
        }
        const lastBuilding = predefinedBuildings[predefinedBuildings.length - 1];

        // FIX: Only update if the building type matches (e.g. O4 matches O4).
        // This allows editing dimensions/extensions (which keep same code) but prevents 
        // overwriting the previous building when the user selects a NEW building type in the panel.
        const isSameType = lastBuilding.buildingName === building.code;

        if (!isSameType) {
          console.log('[UPDATE BLDG] Building type mismatch (Last:', lastBuilding.buildingName, 'New:', building.code, '). Skipping update to allow new insertion.');
          return prev;
        }

        console.log('[UPDATE BLDG] Last building:', lastBuilding.id, 'current angle:', lastBuilding.angle);

        // Calculate new coords preserving center and angle
        const center = centroid(lastBuilding.coords);
        if (!center) return prev;

        // Simple approximation for sizing in meters around center
        // building.length is West-East (width on screen), building.width is North-South (height)
        const halfL = building.length / 2;
        const halfW = building.width / 2;

        // Meters to degrees
        const dLat = halfW / 111111;
        const dLng = halfL / (111111 * Math.cos(toRad(center.lat)));

        // Unrotated relative offsets (NW, NE, SE, SW)
        const corners = [
          { lat: dLat, lng: -dLng },  // NW
          { lat: dLat, lng: dLng },   // NE
          { lat: -dLat, lng: dLng },  // SE
          { lat: -dLat, lng: -dLng }  // SW
        ];

        // Map back to new features list, preserving angle from CURRENT feature state
        return prev.map(f => {
          if (f.id !== lastBuilding.id) return f;

          // CRITICAL FIX: Do NOT bake rotation into coords. 
          // The render loop applies f.angle. Storing rotated coords + f.angle = DOUBLE ROTATION.
          // We must generate axis-aligned coords here.
          const currentAngle = f.angle || 0; // Restore definition for use in return object
          // const angleRad = toRad(currentAngle); // OLD: Caused double rotation
          const angleRad = 0; // NEW: Generate axis-aligned
          const cosA = Math.cos(angleRad);
          const sinA = Math.sin(angleRad);

          const newCoords = corners.map(c => {
            const xM = c.lng * (111111 * Math.cos(toRad(center.lat)));
            const yM = c.lat * 111111;

            const rotX = xM * cosA - yM * sinA;
            const rotY = xM * sinA + yM * cosA;

            return L.latLng(
              center.lat + rotY / 111111,
              center.lng + rotX / (111111 * Math.cos(toRad(center.lat)))
            );
          });

          return { ...f, coords: newCoords, buildingName: building.code, isPredefinedBuilding: true, angle: currentAngle, buildingLength: building.length, buildingWidth: building.width, buildingSurface: building.surface, buildingPower: building.power };
        });
      });
      console.log('Updated building dimensions:', building.length, 'x', building.width);
    };

    window.addEventListener("map:place-building", handlePlaceBuilding);
    window.addEventListener("map:update-last-building", handleUpdateLastBuilding);
    return () => {
      window.removeEventListener("map:place-building", handlePlaceBuilding);
      window.removeEventListener("map:update-last-building", handleUpdateLastBuilding);
    };
    // NOTE: features added to dependencies to fix closure bug causing isSecondBuilding to always be false
  }, [map, features, setFeatures]);

  useEffect(() => {
    // L'événement est "map:capture-request"
    const handleCaptureRequest = async (e) => {
      const { slotIndex } = e.detail;
      if (map) {

        const canvas = await html2canvas(map.getContainer(), {
          useCORS: true, logging: false,
          scrollX: 0, scrollY: 0, // Fix pour le décalage des éléments

          // ====================================================================
          // MODIFICATION ICI : CORRECTION DU BUG DE DÉCALAGE + GESTION DES CONTRÔLES
          // ====================================================================
          onclone: (doc) => {
            // 1. Cacher TOUS les éléments ayant la classe "hide-on-capture"
            const controlsToHide = doc.querySelectorAll('.hide-on-capture');
            controlsToHide.forEach(c => {
              c.style.display = 'none';
              c.style.visibility = 'hidden';
              c.style.opacity = '0';
              c.style.width = '0';
              c.style.height = '0';
              c.style.overflow = 'hidden';
            });

            // 2. Cacher spécifiquement la barre de recherche (multiples sélecteurs pour couvrir tous les cas)
            const searchSelectors = [
              '.leaflet-control-geosearch',
              '.geosearch',
              'form.leaflet-control',
              '.leaflet-control-container form',
              '.leaflet-top.leaflet-center',
              '[class*="geosearch"]'
            ];
            searchSelectors.forEach(selector => {
              const elements = doc.querySelectorAll(selector);
              elements.forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
              });
            });

            // 3. Cacher tous les inputs de type text dans les contrôles Leaflet
            const inputs = doc.querySelectorAll('.leaflet-control-container input[type="text"], .leaflet-control input');
            inputs.forEach(i => {
              i.style.display = 'none';
              const parent = i.closest('.leaflet-control');
              if (parent) {
                parent.style.display = 'none';
                parent.style.visibility = 'hidden';
              }
            });

            // 4. Cacher les contrôles de dessin (à gauche en haut)
            const drawingSelectors = [
              '.leaflet-draw',
              '.leaflet-draw-toolbar',
              'div[class*="Drawing"]',
              '.leaflet-top.leaflet-left > div:first-child'
            ];
            drawingSelectors.forEach(selector => {
              const elements = doc.querySelectorAll(selector);
              elements.forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
              });
            });

            // 5. Cacher les contrôles de zoom par défaut
            const zoomControls = doc.querySelectorAll('.leaflet-control-zoom');
            zoomControls.forEach(c => {
              c.style.display = 'none';
              c.style.visibility = 'hidden';
            });

            // 6. Forcer le masquage de tout ce qui est dans leaflet-top leaflet-left (boutons de tracé)
            const topLeft = doc.querySelector('.leaflet-top.leaflet-left');
            if (topLeft) {
              // Cacher tous les enfants directs sauf ce qui doit rester visible
              Array.from(topLeft.children).forEach(child => {
                // Ne pas cacher l'échelle ou d'autres éléments importants
                if (!child.classList.contains('leaflet-control-scale')) {
                  child.style.display = 'none';
                  child.style.visibility = 'hidden';
                }
              });
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
      if (project?.gps) {
        const [lat, lng] = project.gps.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.setView([lat, lng], 18);
          if (setTargetPos) setTargetPos({ lat, lng });
          if (setShowInfoPanel) setShowInfoPanel(true);

          // Synchroniser les champs GPS même si déjà présents (demande utilisateur)
          if (onAddressFound) {
            onAddressFound({ label: project.address, lat, lng });
          }
          return;
        }
      }
      // Pas de GPS : géocoder l'adresse du projet via l'API Adresse nationale
      if (project?.address || project?.zip || project?.city) {
        const parts = [project.address, project.zip, project.city].filter(p => p && p.trim() !== '');
        if (parts.length > 0) {
          const fullAddress = parts.join(' ');
          // Géocodage via l'API Adresse
          fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`)
            .then(r => r.json())
            .then(data => {
              const feature = data.features?.[0];
              if (feature) {
                const [lng, lat] = feature.geometry.coordinates;
                map.setView([lat, lng], 17);
                if (setTargetPos) setTargetPos({ lat, lng });
                if (setShowInfoPanel) setShowInfoPanel(true);

                // Synchroniser les champs GPS avec le résultat du géocodage
                if (onAddressFound) {
                  onAddressFound({
                    label: feature.properties.label,
                    lat: lat,
                    lng: lng
                  });
                }
              }
            })
            .catch(() => {
              // Fallback : recherche geosearch
              const event = new CustomEvent('geosearch/search', { detail: { query: fullAddress, keepPopupOpen: false } });
              map.getContainer().dispatchEvent(event);
            });
        }
      }
    };

    const handleZoomIn = () => { map.zoomIn(); };
    const handleZoomOut = () => { map.zoomOut(); };

    // Correction du nom de l'événement écouté
    const handleGotoAddress = (e) => {
      const { lat, lng } = e.detail;
      if (lat && lng) {
        map.setView([lat, lng], 18);
      }
    };

    window.addEventListener("map:capture-request", handleCaptureRequest);
    window.addEventListener("map:goto-project-address", goToProjectAddress);
    window.addEventListener("map:goto-address", handleGotoAddress);
    window.addEventListener("map:zoom-in", handleZoomIn);
    window.addEventListener("map:zoom-out", handleZoomOut);

    return () => {
      window.removeEventListener("map:capture-request", handleCaptureRequest);
      window.removeEventListener("map:goto-project-address", goToProjectAddress);
      window.removeEventListener("map:goto-address", handleGotoAddress);
      window.removeEventListener("map:zoom-in", handleZoomIn);
      window.removeEventListener("map:zoom-out", handleZoomOut);
    };
  }, [map, project, onAddressFound, setTargetPos, setShowInfoPanel]);

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
      fetch(`https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?resource=ign_rge_alti_wld&lon=${latlng.lng}&lat=${latlng.lat}&zonly=false`).then(res => res.ok ? res.json() : Promise.reject()).then(data => ({ altitude: `${data.elevations[0].z.toFixed(1)} m` })).catch(() => ({ altitude: 'N/A' })),
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

function AltimetryProfile({ profile, setProfile, setFeatures, features, setHoverInfo }) {
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
      // Update global hover info
      if (setHoverInfo) {
        setHoverInfo(hoverPoint);
      }
    } else {
      if (setHoverInfo) {
        setHoverInfo(null);
      }
    }

    return () => {
      map.removeLayer(polyline);
      if (marker) map.removeLayer(marker);
    };
  }, [map, profile, hoverPoint, setHoverInfo]);

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

  const handleCloseProfile = () => { setProfile(null); if (setHoverInfo) setHoverInfo(null); };

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
    if (setHoverInfo) setHoverInfo(null);
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


// ====================================================================
// INDICATEUR DE ZOOM
// ====================================================================
function ZoomIndicator() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    // Update attribution on mount and on zoom change
    const updateAttribution = (z) => {
      const leafletAttribution = document.querySelector('.leaflet-control-attribution');
      if (leafletAttribution) {
        // Find or create the zoom span
        let zoomSpan = leafletAttribution.querySelector('.zoom-indicator-attribution');
        if (!zoomSpan) {
          zoomSpan = document.createElement('span');
          zoomSpan.className = 'zoom-indicator-attribution';
          zoomSpan.style.marginRight = '5px';
          // Find the Leaflet logo/link which is usually the last child or has a specific class
          const attributionLinks = leafletAttribution.querySelectorAll('a');
          let leafletLink = null;
          attributionLinks.forEach(a => {
            if (a.textContent === 'Leaflet' || a.querySelector('svg')) {
              leafletLink = a;
            }
          });

          if (leafletLink) {
            leafletAttribution.insertBefore(zoomSpan, leafletLink);
          } else {
            leafletAttribution.prepend(zoomSpan);
          }
        }
        zoomSpan.textContent = `Zoom: ${z} |`;
      }
    };

    updateAttribution(zoom);

    const onZoom = () => {
      const currentZoom = map.getZoom();
      setZoom(currentZoom);
      updateAttribution(currentZoom);
    };

    map.on('zoom', onZoom);
    map.on('viewreset', onZoom);

    return () => {
      map.off('zoom', onZoom);
      map.off('viewreset', onZoom);
      const zoomSpan = document.querySelector('.zoom-indicator-attribution');
      if (zoomSpan) zoomSpan.remove();
    };
  }, [map, zoom]);

  return null;
}

// ====================================================================
// MANAGER ENEDIS (WFS + BBOX)
// ====================================================================


// Export LAYERS for use in ProjectEditor layer buttons
export { LAYERS };


// ====================================================================
// COMPOSANT DE SYNCHRONISATION DE L'ÉTAT DE LA CARTE (Vue + Zoom)
// ====================================================================
function MapStateSync({ project, setProject }) {
  const map = useMap();
  const isRestoringRef = useRef(false);
  const lastSavedViewRef = useRef(null);
  const lastProjectIdRef = useRef(null);

  // 1. RESTAURATION : Force la vue au changement de projet
  useEffect(() => {
    if (!project?.id) return;

    // Détection changement de projet
    if (project.id !== lastProjectIdRef.current) {
      console.log(`[MapStateSync] New project detected (${project.id}). Updating view...`);
      lastProjectIdRef.current = project.id;
      isRestoringRef.current = true;

      if (project.mapView) {
        // 1. Vue sauvegardée
        const { center, zoom } = project.mapView;
        if (center && typeof center.lat === 'number' && typeof center.lng === 'number' && typeof zoom === 'number') {
          console.log("Restoring saved MapView:", center, zoom);
          map.setView(center, zoom, { animate: false });
        }
      } else if (project.gps) {
        // 2. Pas de vue mais GPS
        const parts = project.gps.split(',').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          console.log("Restoring from GPS:", parts);
          map.setView(parts, 18, { animate: false });
        }
      } else {
        // 3. Rien : Défaut pour éviter de voir le projet précédent
        console.log("No view/GPS. Resetting to default.");
        map.setView([44.82619, -0.67201], 6, { animate: false });
      }

      // Débloquer la persistence après délai
      setTimeout(() => { isRestoringRef.current = false; }, 800);
    }
  }, [project, map]);

  // 2. PERSISTANCE : Sauvegarde en temps réel
  useEffect(() => {
    const handleMoveEnd = () => {
      if (isRestoringRef.current) return;

      const center = map.getCenter();
      const zoom = map.getZoom();
      const newView = { center: { lat: center.lat, lng: center.lng }, zoom };

      if (JSON.stringify(newView) !== JSON.stringify(lastSavedViewRef.current)) {
        lastSavedViewRef.current = newView;
        setProject(prev => {
          if (prev?.mapView && JSON.stringify(prev.mapView) === JSON.stringify(newView)) return prev;
          return { ...prev, mapView: newView };
        });
      }
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, setProject]);

  return null;
}

function MapInternalController({ layersRef, activeLayers, setSelectedCompany, setSelectedSubstation }) {
  const map = useMap();

  // 1. Navigation and selection handlers
  useEffect(() => {
    const handleGoto = (e) => {
      const { lat, lng, zoom } = e.detail;
      if (map) {
        map.setView([lat, lng], zoom || 18, { animate: true });
      }
    };

    const handleSelectCompany = (e) => setSelectedCompany(e.detail.company);
    const handleSelectSubstation = (e) => setSelectedSubstation(e.detail.substation);

    window.addEventListener('map:goto-location', handleGoto);
    window.addEventListener('map:select-company', handleSelectCompany);
    window.addEventListener('map:select-substation', handleSelectSubstation);

    return () => {
      window.removeEventListener('map:goto-location', handleGoto);
      window.removeEventListener('map:select-company', handleSelectCompany);
      window.removeEventListener('map:select-substation', handleSelectSubstation);
    };
  }, [map, setSelectedCompany, setSelectedSubstation]);

  // 2. Synchronisation déclarative des calques
  useEffect(() => {
    if (!map || !layersRef.current || !activeLayers) return;

    Object.keys(LAYERS).forEach(key => {
      const layerDef = LAYERS[key];
      if (!layerDef.isOverlay) return;

      const layer = layersRef.current[key];
      if (!layer) return;

      const shouldBeVisible = activeLayers.has(key);
      const isVisible = map.hasLayer(layer);

      if (shouldBeVisible && !isVisible) {
        layer.addTo(map);
      } else if (!shouldBeVisible && isVisible) {
        map.removeLayer(layer);
      }
    });
  }, [map, activeLayers, layersRef]);

  return null;
}

export default function MapElements({ 
  style = {}, 
  project, 
  setProject, 
  onAddressFound, 
  onAddressSearched, 
  setSymbolToPlace, 
  symbolToPlace, 
  setIsAzimuthDefaulted,     
  isUrbanismeMode, 
  activeLayers, 
  isochroneConfig
}) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedSubstation, setSelectedSubstation] = useState(null);


  const [mode, setMode] = useState(null);
  const [temp, setTemp] = useState([]);
  // State for sync tracking
  const lastSyncedAzimuthRef = useRef(project?.panelAspect);

  // Update ref if project changes from outside (initial load)
  useEffect(() => {
    if (project?.panelAspect !== undefined) {
      // Only update if strictly undefined (first load), otherwise let the loop logic handle it
      if (lastSyncedAzimuthRef.current === undefined) {
        lastSyncedAzimuthRef.current = Number(project.panelAspect);
      }
    }
  }, [project?.panelAspect]);

  const [features, setFeatures] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [askTextAt, setAskTextAt] = useState(null);
  const [askNoteAt, setAskNoteAt] = useState(null);
  const [pointInfo, setPointInfo] = useState(null);
  const [altimetryProfile, setAltimetryProfile] = useState(null);
  const [rectangleStart, setRectangleStart] = useState(null);

  const [targetPos, setTargetPos] = useState(null); // initialized in MapTargetInfo via useEffect
  const [hoverInfo, setHoverInfo] = useState(null); // New state for shared hover info
  const [showInfoPanel, setShowInfoPanel] = useState(true); // Always visible by défaut
  const layersRef = useRef({});
  const hasUserInteractedRef = useRef(false);

  // Wrapper to track user interaction
  const setFeaturesWrapper = useCallback((updater) => {
    hasUserInteractedRef.current = true;
    setFeatures(updater);
  }, []);

  // 0. RESET EFFECT: Force reload features on project ID change to prevent stale traces
  const lastProjectIdFeaturesRef = useRef(null);
  useEffect(() => {
    if (project?.id && project.id !== lastProjectIdFeaturesRef.current) {
      console.log(`[MapElements] Project switch detected (${project.id}). Resetting features.`);
      lastProjectIdFeaturesRef.current = project.id;

      // Reset interaction flag to allow fresh sync
      hasUserInteractedRef.current = false;

      // Force load features immediately
      const newFeatures = project.features && Array.isArray(project.features) ? project.features : [];
      setFeatures(newFeatures);

      // Clean up UI states
      setTemp([]);
      setSelectedId(null);
    }
  }, [project]);

  // 1. Loading Effect: Restore features from project (Auto-Sync)
  useEffect(() => {
    // If user hasn't interacted, and local is empty, but project has features -> Sync Down
    // This handles Initial Load AND "LS -> API" transition
    // Added logging to debug trace persistence
    if (!hasUserInteractedRef.current && features.length === 0 && project?.features?.length > 0) {
      console.log("[MapElements] Auto-syncing remote features to local state:", project.features.length, "features found.");
      setFeatures(project.features);
    } else if (project?.features?.length > 0 && features.length === 0) {
      // Cas où hasUserInteracted pourrait être true par erreur ou autre, on log pour voir
      console.log("[MapElements] Remote features exist but not pulling because hasUserInteracted:", hasUserInteractedRef.current);
    }
  }, [project, features.length]);

  // 2. Saving Effect: Sync features back to project whenever they change
  useEffect(() => {
    // Prevent overwriting remote data with empty local state on initial load
    if (!hasUserInteractedRef.current && features.length === 0) return;

    // Sanitize features to ensure they are plain objects (remove Leaflet prototypes)
    const sanitizedFeatures = features.map(f => {
      // Helper to clean coords
      const cleanLatLng = (ll) => ({ lat: ll.lat, lng: ll.lng });

      if (f.type === 'line' || f.type === 'polygon' || f.type === 'rectangle') {
        return { ...f, coords: Array.isArray(f.coords) ? f.coords.map(cleanLatLng) : [] };
      }
      if (f.at) {
        return { ...f, at: cleanLatLng(f.at) };
      }
      if (f.center) {
        return { ...f, center: cleanLatLng(f.center) };
      }
      return f;
    });

    if (setProject) {
      // Log pour vérifier ce qu'on envoie au projet
      // console.log("[MapElements] Syncing local features to project state:", sanitizedFeatures.length);
      setProject(prev => {
        const prevFeatures = prev?.features || [];

        // Bidirectional Sync: Check if azimuth needs update
        const rects = sanitizedFeatures.filter(f => f.type === 'rectangle');
        let newUpdates = { ...prev, features: sanitizedFeatures };

        // Iterate over all predefined buildings to sync their azimuths
        // This handles B1 (index 0) -> panelAspect AND B2 (index 1) -> panelAspect2
        rects.forEach((rect, index) => {
          // Identify building index based on its position in the list of PREDEFINED buildings
          // This prevents manual rectangles from shifting the B1/B2 indices.
          const buildingIndex = index;

          const newAzimuth = calculateAzimuthFromAngle(rect.angle || 0);

          if (buildingIndex === 0) {
            // Building 1 -> panelAspect
            if (prev.panelAspect === undefined || Math.abs(Number(prev.panelAspect) - newAzimuth) >= 1) {
              newUpdates.panelAspect = newAzimuth;
              if (setIsAzimuthDefaulted) setIsAzimuthDefaulted(true);
            }
          } else if (buildingIndex === 1) {
            // Building 2 -> panelAspect2
            if (prev.panelAspect2 === undefined || Math.abs(Number(prev.panelAspect2) - newAzimuth) >= 1) {
              newUpdates.panelAspect2 = newAzimuth;
            }
          }
        });

        // Deep comparison to avoid infinite loops
        // Check features AND azimuths
        const featuresChanged = JSON.stringify(prevFeatures) !== JSON.stringify(sanitizedFeatures);
        const aspect1Changed = newUpdates.panelAspect !== prev.panelAspect;
        const aspect2Changed = newUpdates.panelAspect2 !== prev.panelAspect2;

        if (!featuresChanged && !aspect1Changed && !aspect2Changed) return prev;

        return newUpdates;
      });
    }
  }, [features, setProject]);

  // Map Reset Handler
  useEffect(() => {
    const handleMapReset = () => {
      setFeaturesWrapper([]);
      setTemp([]);
    };
    window.addEventListener('map:reset', handleMapReset);
    return () => window.removeEventListener('map:reset', handleMapReset);
  }, []);


  // Ref to track if manual rotation is in progress
  const isRotatingRef = useRef(false);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={[44.82619, -0.67201]}
          zoom={6}
          maxZoom={22}
          style={{ height: "100%", width: "100%" }}
          doubleClickZoom={false}
          zoomControl={false}
          preferCanvas={true} // Performance
          className={mode === 'delete' ? 'cursor-pointer' : (symbolToPlace ? 'cursor-crosshair' : 'cursor-default')}
          placeholder={<div className="h-full w-full bg-gray-100 animate-pulse" />}
        >
          {/* Nouveau composant de synchro */}
          <MapStateSync project={project} setProject={setProject} />

          {/* Controller for map instance logic (goto, layer sync) */}
          <MapInternalController 
            layersRef={layersRef} 
            activeLayers={activeLayers} 
            setSelectedCompany={setSelectedCompany} 
            setSelectedSubstation={setSelectedSubstation} 
          />

          <div
            style={{ position: 'absolute', inset: 0, zIndex: 400, pointerEvents: 'none' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          />
          <MapDrawingTools mode={mode} setMode={setMode} />
          <LayersBootstrap layersRef={layersRef} />

          {/* Layer Managers */}
          <SDISLayerManager layersRef={layersRef} activeLayers={activeLayers} />
          <GazDynamicLayerManager layersRef={layersRef} activeLayers={activeLayers} />
          <LigneBTLayerManager layersRef={layersRef} activeLayers={activeLayers} />
          <HTALayerManager layersRef={layersRef} activeLayers={activeLayers} />
          <PostesHTALayerManager layersRef={layersRef} activeLayers={activeLayers} />
          <CapareseauLayerManager layersRef={layersRef} activeLayers={activeLayers} />
          <CompaniesLayerManager layersRef={layersRef} activeLayers={activeLayers} onCompaniesUpdate={setCompanies} />

          {/* Controls inside map */}
          <BasemapControl layersRef={layersRef} />
          <RPGLegend layersRef={layersRef} />
          <ZoneInondableLegend layersRef={layersRef} />
          <SDISLegend layersRef={layersRef} />

          {window.innerWidth > 1024 && (
            <div className="hidden lg:block">
              <SearchField onAddressFound={onAddressFound} />
            </div>
          )}
          <div className="leaflet-bottom leaflet-left no-print" style={{ pointerEvents: 'none' }}>
            <div className="leaflet-control-container" style={{ position: 'absolute', bottom: '30px', left: '10px', zIndex: 1000, pointerEvents: 'auto' }}>
              <div className="flex flex-col items-start gap-2">
                <MapTargetInfo targetPos={targetPos} setTargetPos={setTargetPos} hoverInfo={hoverInfo} showInfoPanel={showInfoPanel} setShowInfoPanel={setShowInfoPanel} project={project} setProject={setProject} />
                <MiniMap />
                <ScaleControl position="bottomleft" metric={true} imperial={false} />
              </div>
            </div>
          </div>

          <EditLayer
            mode={mode}
            setMode={setMode}
            features={features}
            setFeatures={setFeaturesWrapper} // Use Wrapper
            temp={temp}
            setTemp={setTemp}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            askTextAt={askTextAt}
            setAskTextAt={setAskTextAt}
            askNoteAt={askNoteAt}
            setAskNoteAt={setAskNoteAt}
            symbolToPlace={symbolToPlace}
            setSymbolToPlace={setSymbolToPlace}
            setPointInfo={setPointInfo}
            altimetryProfile={altimetryProfile}
            setAltimetryProfile={setAltimetryProfile}
            rectangleStart={rectangleStart}
            setRectangleStart={setRectangleStart}

            targetPos={targetPos}
            setTargetPos={setTargetPos}
            setProject={setProject}
            setIsAzimuthDefaulted={setIsAzimuthDefaulted}
            isRotatingRef={isRotatingRef}
            isUrbanismeMode={isUrbanismeMode}
            setShowInfoPanel={setShowInfoPanel}
            isochroneConfig={isochroneConfig}
          />
          {/* Sociétés UI (Managed by Manager now) */}

          <ZoomIndicator />
          <MapEvents
            project={project}
            features={features}
            setProject={setProject}
            setIsAzimuthDefaulted={setIsAzimuthDefaulted}
            onAddressFound={onAddressFound}
            onAddressSearched={onAddressSearched}

            setFeatures={setFeaturesWrapper} // Use Wrapper
            onRightClick={(latlng) => setTargetPos(latlng)}
            isRotatingRef={isRotatingRef}
            setTargetPos={setTargetPos}
            setShowInfoPanel={setShowInfoPanel}
          />
          <PointInfoPanel pointInfo={pointInfo} setPointInfo={setPointInfo} />
          <AltimetryProfile
            profile={altimetryProfile}
            setProfile={setAltimetryProfile}
            setFeatures={setFeaturesWrapper} // Use Wrapper
            features={features}
            setHoverInfo={setHoverInfo}
          />

        </MapContainer>

        {/* New Side Panels (Outside MapContainer for z-index/overlay reliability) */}
        <MapSidePanel 
          type="company" 
          data={selectedCompany} 
          onClose={() => setSelectedCompany(null)} 
        />
        <MapSidePanel 
          type="substation" 
          data={selectedSubstation} 
          onClose={() => setSelectedSubstation(null)} 
        />
      </div>
    </div>
  );
}

function MapSidePanel({ type, data, onClose }) {
  if (!data) return null;

  const isCompany = type === 'company';
  const title = isCompany ? (data.nom_raison_sociale || data.name || "Détails Entreprise") : (data.nom_du_poste || "Poste Source");
  const side = isCompany ? "right" : "left";

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !", description: `"${text}" copié dans le presse-papier.`, ...toastStyle });
  };

  return (
    <div 
      className={`absolute top-4 ${side}-4 z-[5000] w-[350px] max-h-[calc(100%-2rem)] bg-white shadow-2xl border border-gray-200 rounded-xl flex flex-col overflow-hidden`}
      style={{ pointerEvents: 'auto', display: 'flex' }}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 truncate pr-4">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
          <XIcon size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto space-y-4">
        {isCompany ? (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Identité</label>
              <div className="space-y-1">
                <div className="flex justify-between items-start group cursor-pointer" onClick={() => copyToClipboard(data.siret)}>
                  <span className="text-xs text-gray-500">SIRET</span>
                  <span className="text-xs font-medium text-gray-900 flex items-center gap-1">
                    {data.siret} <Copy size={10} className="opacity-0 group-hover:opacity-100" />
                  </span>
                </div>
                <div className="flex justify-between items-start group cursor-pointer" onClick={() => copyToClipboard(data.adresse)}>
                  <span className="text-xs text-gray-500">Adresse</span>
                  <span className="text-xs font-medium text-gray-900 text-right max-w-[180px] flex items-center gap-1">
                    {data.adresse} <Copy size={10} className="opacity-0 group-hover:opacity-100" />
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-500">Effectifs</span>
                  <span className="text-xs font-medium text-gray-900">{data.tranche_effectif || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Potentiel Solaire</label>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-green-700">Surface estimée</span>
                  <span className="text-sm font-bold text-green-900">~250 m²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-700">Puissance estimée</span>
                  <span className="text-sm font-bold text-green-900">36 kWc</span>
                </div>
              </div>
            </div>
            
            {data.dirigeants && data.dirigeants.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Dirigeants</label>
                <div className="space-y-1">
                  {data.dirigeants.map((d, i) => (
                    <div key={i} className="text-xs font-medium text-gray-900 flex items-center gap-1">
                      👤 {d.prenoms} {d.nom}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Capacités (S3REnR)</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-orange-50 rounded border border-orange-100">
                  <div className="text-[10px] text-orange-700">Réservée</div>
                  <div className="text-sm font-bold text-orange-900">{data.capacite_reservee_mw || 0} MW</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="text-[10px] text-blue-700">Disponible</div>
                  <div className="text-sm font-bold text-blue-900">{data.capacite_disponible_mw || 0} MW</div>
                </div>
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t">
               <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Tension</span>
                  <span className="text-xs font-medium text-gray-900">{data.niveau_de_tension || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Type</span>
                  <span className="text-xs font-medium text-gray-900">{data.ouvrage_type || 'Poste Source'}</span>
                </div>
            </div>
          </>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="p-3 bg-gray-50 border-t flex justify-center italic">
        <span className="text-[10px] text-gray-400">Données MELODI / RSI / ODRÉ • NELSON</span>
      </div>
    </div>
  );
}
