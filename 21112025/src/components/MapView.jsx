import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { Input } from './ui/input';

const createPersonIcon = (person) => {
  const color = person ? person.color : '#A0A0A0';
  const svgIcon = `
        <svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
            <path fill="${color}" stroke="#fff" stroke-width="2" d="M16 3a9 9 0 0 0-9 9c0 7 9 17 9 17s9-10 9-17a9 9 0 0 0-9-9Z"></path>
            <circle fill="#fff" cx="16" cy="12" r="4"></circle>
        </svg>`;

  return L.divIcon({
    html: svgIcon,
    className: 'leaflet-custom-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

export default function MapView({ boardData, availablePeople }) {
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const allRows = useMemo(() => boardData.groups.flatMap(g => g.rows.map(r => r.data)), [boardData]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return allRows;
    return allRows.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [allRows, searchTerm]);

  useEffect(() => {
    if (mapRef.current || !document.getElementById('map-view-container')) return;

    const map = L.map('map-view-container', { zoomControl: false }).setView([46.2276, 2.2137], 5);
    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    const baseLayers = {
      'Satellite Google': L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 22, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: 'Google' }),
      'Satellite IGN': L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', { maxZoom: 22, attribution: 'IGN © OpenStreetMap contributors' }).addTo(map),
      'Plan OSM': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 22, attribution: '© OpenStreetMap contributors' })
    };

    L.control.layers(baseLayers, {}, { position: 'bottomright' }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const searchControl = new GeoSearchControl({
      provider: new OpenStreetMapProvider(),
      style: 'bar',
      showMarker: true,
      showPopup: false,
      autoClose: true,
    });
    map.addControl(searchControl);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    layerGroup.clearLayers();

    const markers = [];
    filteredRows.forEach(item => {
      const lat = parseFloat(item.latitude || item.lat);
      const lng = parseFloat(item.longitude || item.lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        const responsableName = item.responsable || item.utilisateur;
        const person = availablePeople?.find(p => p.name === responsableName);
        const icon = createPersonIcon(person);

        const marker = L.marker([lat, lng], { icon })
          .bindPopup(`<b>${item.element || item.entreprise || 'Élément'}</b><br/>Responsable: ${responsableName || 'N/A'}`);
        layerGroup.addLayer(marker);
        markers.push(marker);
      }
    });

    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.5));
    }

  }, [filteredRows, availablePeople]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <Input
          placeholder="Rechercher un utilisateur, un projet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div id="map-view-container" className="flex-grow" />
    </div>
  );
}