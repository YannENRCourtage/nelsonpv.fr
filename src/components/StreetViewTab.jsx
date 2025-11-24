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
        // Add Street View coverage layer (blue lines)
        const coverageLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=svv&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'overlayPane',
            zIndex: 100
        });
        coverageLayer.addTo(map);

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
                return [lat, lng];
            }
        }
        return [44.8378, -0.5792]; // Default center
    };

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={getInitialCenter()}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                doubleClickZoom={false}
                zoomControl={false}
            >
                {/* Google Maps hybrid layer (satellite + labels) */}
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                    maxZoom={20}
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                />

                {/* Street View coverage layer */}
                <StreetViewCoverageLayer />

                {/* Bottom-left controls - raised by 5mm (approximately 19px) */}
                <div className="leaflet-bottom leaflet-left no-print" style={{ pointerEvents: 'none' }}>
                    <div className="leaflet-control-container" style={{ position: 'absolute', bottom: '29px', left: '10px', zIndex: 1000, pointerEvents: 'auto' }}>
                        <div className="flex flex-col items-start gap-2">
                            <MiniMap />
                            <ScaleControl position="bottomleft" metric={true} imperial={false} />
                        </div>
                    </div>
                </div>
            </MapContainer>
        </div>
    );
}
