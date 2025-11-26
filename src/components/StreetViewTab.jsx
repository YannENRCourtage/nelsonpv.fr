import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


// Standalone MiniMap component for StreetViewTab
function MiniMap() {
    const parentMap = useMap();
    const miniMapRef = useRef(null);
    const miniMapContainerRef = useRef(null);

    useEffect(() => {
        if (!miniMapContainerRef.current || miniMapRef.current) return;

        const miniMap = L.map(miniMapContainerRef.current, {
            center: parentMap.getCenter(),
            zoom: parentMap.getZoom() - 4,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            touchZoom: false
        });

        // Use same basemap as Carte tab (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(miniMap);

        const viewBox = L.rectangle(parentMap.getBounds(), {
            color: '#ff0000',
            weight: 2,
            fillOpacity: 0.1
        }).addTo(miniMap);

        const updateMiniMap = () => {
            miniMap.setView(parentMap.getCenter(), parentMap.getZoom() - 4);
            viewBox.setBounds(parentMap.getBounds());
        };

        parentMap.on('move', updateMiniMap);
        parentMap.on('zoom', updateMiniMap);
        miniMapRef.current = miniMap;

        return () => {
            parentMap.off('move', updateMiniMap);
            parentMap.off('zoom', updateMiniMap);
            miniMap.remove();
            miniMapRef.current = null;
        };
    }, [parentMap]);

    return <div ref={miniMapContainerRef} className="w-40 h-32 border-2 border-border rounded-lg shadow-lg overflow-hidden bg-card" />;
}

function StreetViewCoverageLayer() {
    const map = useMap();

    useEffect(() => {
        // Add Street View coverage layer (blue lines) with higher opacity
        const coverageLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=svv&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'overlayPane',
            zIndex: 100,
            opacity: 1.0  // Full opacity to ensure visibility
        });

        // Force immediate load
        coverageLayer.addTo(map);

        // Force redraw
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        // Handle clicks on the map to open Street View in new tab
        const handleMapClick = (e) => {
            const { lat, lng } = e.latlng;
            const streetViewUrl = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
            window.open(streetViewUrl, '_blank');
        };

        map.on('click', handleMapClick);

        return () => {
            map.removeLayer(coverageLayer);
            map.off('click', handleMapClick);
        };
    }, [map]);

    return null;
}

export default function StreetViewTab({ project }) {
    // Set initial center based on project GPS
    const getInitialCenter = () => {
        if (project?.gps) {
            const [lat, lng] = project.gps.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
            }
        }
        return { lat: 44.8378, lng: -0.5792 }; // Default center
    };

    const center = getInitialCenter();

    return (
        <div className="relative h-full w-full flex flex-col items-center justify-center bg-gray-100">
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Street View</h3>
                <p className="text-sm text-gray-600 mt-2">
                    Cliquez sur le bouton ci-dessous pour ouvrir Google Street View
                </p>
            </div>
            <a
                href={`https://www.google.com/maps?layer=c&cbll=${center.lat},${center.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
            >
                Ouvrir Street View
            </a>
            <p className="text-xs text-gray-500 mt-4">
                Position: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </p>
        </div>
    );
}
