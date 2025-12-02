import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SearchField from './editor/SearchField.jsx';
import { Button } from './ui/button.jsx';
import { FolderHeart as HomeIcon } from 'lucide-react';


// Standalone MiniMap component for StreetViewTab
function MiniMap({ activeTab }) {
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

    useEffect(() => {
        if (activeTab === 'streetview' && miniMapRef.current) {
            setTimeout(() => {
                miniMapRef.current.invalidateSize();
            }, 300);
        }
    }, [activeTab]);

    return <div ref={miniMapContainerRef} className="w-40 h-32 border-2 border-border rounded-lg shadow-lg overflow-hidden bg-card" />;
}

function StreetViewCoverageLayer({ activeTab }) {
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

    useEffect(() => {
        if (activeTab === 'streetview') {
            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        }
    }, [map, activeTab]);

    return null;
}

function ProjectAddressButton({ project }) {
    const map = useMap();

    const goToProjectAddress = () => {
        if (project?.gps) {
            const [lat, lng] = project.gps.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                map.setView([lat, lng], 18, { animate: true });
                return;
            }
        }
        // Fallback to address search if no GPS
        if (project?.address) {
            const fullAddress = `${project.address}, ${project.zip} ${project.city}`;
            const event = new CustomEvent('geosearch/search', { detail: { query: fullAddress, keepPopupOpen: false } });
            map.getContainer().dispatchEvent(event);
        }
    };

    return (
        <Button
            type="button"
            onClick={goToProjectAddress}
            className="absolute top-3 right-3 z-[1000] bg-white text-gray-800 hover:bg-gray-100 shadow-md"
        >
            <HomeIcon size={16} className="mr-2" />
            Adresse Projet
        </Button>
    );
}

function CustomZoomControl() {
    const map = useMap();

    const handleZoomIn = (e) => {
        e.preventDefault();
        map.zoomIn();
    };

    const handleZoomOut = (e) => {
        e.preventDefault();
        map.zoomOut();
    };

    return (
        <div className="absolute top-16 right-3 z-[1000] flex flex-col gap-2 items-end">
            <div className="flex flex-col bg-white rounded-md shadow-md border-2 border-black/20 overflow-hidden w-[34px]">
                <button
                    type="button"
                    onClick={handleZoomIn}
                    className="w-full h-[30px] flex items-center justify-center text-black hover:bg-[#f4f4f4] font-bold text-xl border-b border-[#ccc] outline-none"
                    title="Zoomer"
                    style={{ lineHeight: '30px' }}
                >
                    +
                </button>
                <button
                    type="button"
                    onClick={handleZoomOut}
                    className="w-full h-[30px] flex items-center justify-center text-black hover:bg-[#f4f4f4] font-bold text-xl outline-none"
                    title="Dézoomer"
                    style={{ lineHeight: '30px' }}
                >
                    −
                </button>
            </div>
        </div>
    );
}

export default function StreetViewTab({ project, activeTab }) {
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
                <StreetViewCoverageLayer activeTab={activeTab} />

                {/* Search Field */}
                <SearchField />

                {/* Project Address Button - Removed */}
                {/* <ProjectAddressButton project={project} /> */}

                {/* Custom Zoom Control - Removed */}
                {/* <CustomZoomControl /> */}

                {/* Bottom-left controls - raised by 5mm (approximately 19px) */}
                <div className="leaflet-bottom leaflet-left no-print" style={{ pointerEvents: 'none' }}>
                    <div className="leaflet-control-container" style={{ position: 'absolute', bottom: '29px', left: '10px', zIndex: 1000, pointerEvents: 'auto' }}>
                        <div className="flex flex-col items-start gap-2">
                            <MiniMap activeTab={activeTab} />
                            <ScaleControl position="bottomleft" metric={true} imperial={false} />
                        </div>
                    </div>
                </div>
            </MapContainer>
        </div>
    );
}
