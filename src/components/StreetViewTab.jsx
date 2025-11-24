import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function StreetViewCoverageLayer() {
    const map = useMap();
    const [streetViewUrl, setStreetViewUrl] = useState(null);

    useEffect(() => {
        // Add Street View coverage layer (blue lines)
        const coverageLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=svv&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'overlayPane',
            zIndex: 100
        });
        coverageLayer.addTo(map);

        // Handle clicks on the map to open Street View
        const handleMapClick = (e) => {
            const { lat, lng } = e.latlng;
            const url = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&output=embed`;
            setStreetViewUrl(url);
        };

        map.on('click', handleMapClick);

        return () => {
            map.removeLayer(coverageLayer);
            map.off('click', handleMapClick);
        };
    }, [map]);

    // Display Street View popup when URL is set
    useEffect(() => {
        if (streetViewUrl && map) {
            const popupContent = document.createElement('div');
            popupContent.style.width = '600px';
            popupContent.style.height = '400px';
            popupContent.innerHTML = `<iframe width="100%" height="100%" frameborder="0" style="border:0" src="${streetViewUrl}" allowfullscreen></iframe>`;

            const popup = L.popup({ maxWidth: 620, minWidth: 600, className: 'street-view-popup' })
                .setLatLng(map.getCenter())
                .setContent(popupContent)
                .openOn(map);

            popup.on('remove', () => setStreetViewUrl(null));
        }
    }, [streetViewUrl, map]);

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
                {/* Satellite base layer */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    maxZoom={20}
                />

                {/* Street View coverage layer */}
                <StreetViewCoverageLayer />

                {/* Scale control */}
                <ScaleControl position="bottomleft" metric={true} imperial={false} />
            </MapContainer>
        </div>
    );
}
