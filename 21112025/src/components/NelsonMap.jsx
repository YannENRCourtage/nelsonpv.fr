import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.js';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman-free.css';
import '@geoman-io/leaflet-geoman-free';
import { toast } from "@/components/ui/use-toast.js";
import { renderToString } from 'react-dom/server';
import { Building2 } from 'lucide-react';
import MapLayersPanel from './editor/MapLayersPanel.jsx';
import { Separator } from './ui/separator.jsx';

// Custom building icon
const buildingIcon = new L.DivIcon({
  html: renderToString(<Building2 className="text-blue-600" size={30} />),
  className: 'leaflet-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// A component to handle map events, specific to the ProjectEditor context
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
}

// A component for the Geocoding control
const GeocoderControl = ({ position = 'topright', expand = 'click' }) => {
  const map = useMapEvents({}); // Get map instance

  useEffect(() => {
    if (!map) return;

    // Use a custom geocoder for France if needed, or default
    const geocoder = L.Control.Geocoder.nominatim();

    const control = L.Control.geocoder({
      geocoder: geocoder,
      position: position,
      collapsed: true, // Always start collapsed
      placeholder: 'Rechercher une adresse...',
      defaultMarkGeocode: false, // Prevent adding default marker
      // You can customize results display if needed
    }).on('markgeocode', function(e) {
      const bbox = e.geocode.bbox;
      const poly = bbox.getSouthWest().toBounds(bbox.getNorthEast());
      map.fitBounds(poly); // Fit map to result bounds
      L.marker(e.geocode.center).addTo(map)
        .bindPopup(e.geocode.name)
        .openPopup();
      toast({
        title: "Recherche réussie",
        description: `Adresse trouvée: ${e.geocode.name}`,
      });
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, position, expand]);

  return null;
};

// Main Map Component
export default function NelsonMap({ center, zoom, onMapClick, onBuildingAdd, buildings, onBuildingSelect, selectedBuilding }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    if (mapInstance) {
      // Add Leaflet-Geoman controls
      mapInstance.pm.addControls({
        position: 'topleft',
        drawRectangle: false,
        drawCircle: false,
        drawPolygon: false,
        drawMarker: false,
        drawPolyline: false,
        cutPolygon: false,
        rotateMode: false,
        dragMode: false,
        editMode: false,
        removalMode: false,
        drawCircleMarker: false,
        drawText: false,
      });

      // Listen for custom event to place a predefined building
      const handlePlaceBuilding = (event) => {
        const { building } = event.detail;
        if (mapInstance && building) {
          // Temporarily set the map cursor to 'crosshair' to indicate drawing mode
          mapInstance.getContainer().style.cursor = 'crosshair';
          toast({
            title: "Placer le bâtiment",
            description: `Cliquez sur la carte pour placer le bâtiment ${building.code}.`,
          });

          const clickHandler = (e) => {
            onBuildingAdd({
              ...building,
              position: [e.latlng.lat, e.latlng.lng],
              rotation: 0, // Default rotation
              id: Date.now().toString(), // Unique ID for the new building
            });
            mapInstance.off('click', clickHandler); // Remove handler after first click
            mapInstance.getContainer().style.cursor = ''; // Reset cursor
          };
          mapInstance.on('click', clickHandler);
        }
      };

      window.addEventListener('map:place-building', handlePlaceBuilding);

      return () => {
        window.removeEventListener('map:place-building', handlePlaceBuilding);
      };
    }
  }, [mapInstance, onBuildingAdd]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        whenCreated={setMapInstance}
        ref={mapRef}
        className="h-full w-full z-0"
        maxZoom={20}
        minZoom={5}
      >
        {mapInstance && <MapLayersPanel map={mapInstance} />} {/* Pass map instance to layers panel */}

        {/* This MapClickHandler only adds a click listener if onMapClick prop is provided */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        <GeocoderControl />

        {buildings.map(building => (
          <Marker
            key={building.id}
            position={building.position}
            icon={buildingIcon}
            eventHandlers={{
              click: () => onBuildingSelect(building),
            }}
          >
            <Popup>
              <div>
                <h4 className="font-bold">{building.code}</h4>
                <p>Long: {building.length}m, Larg: {building.width}{typeof building.width !== 'string' && 'm'}</p>
                <p>Surface: {building.surface.toFixed(0)}m²</p>
                <p>Puissance: {building.power}kWc</p>
                <p>Ratio: {building.ratio.toFixed(2)}€</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-4 left-4 z-[1000] w-64">
      </div>
    </div>
  );
}