import React, { useEffect, useState, useRef } from "react";
import {
    Ion,
    Viewer,
    Cartesian3,
    Math as CesiumMath,
    JulianDate,
    createOsmBuildingsAsync,
    Color
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Token provided by user
Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDgzMzNlNC1lYjg4LTQ1OGMtOWNiYS1kZDEwMDgzMTY4Y2IiLCJpZCI6Mzg1Mjg2LCJpYXQiOjE3Njk3ODY1Nzl9.U05Yue-PtoGiaBQRlNLoZ5Pk3hNTFDRLu-aG5g7mj1o";

export default function CesiumTab({ project }) {
    const viewerContainerRef = useRef(null);
    const viewerRef = useRef(null);
    const [sliderValue, setSliderValue] = useState(12);

    // Coordonnées du projet
    const coords = project?.gps ? project.gps.split(',').map(Number) : [46.2276, 2.2137];
    const [lat, lng] = coords;

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        setSliderValue(val);

        if (viewerRef.current) {
            const now = new Date();
            now.setHours(Math.floor(val));
            now.setMinutes(Math.floor((val % 1) * 60));

            const julianDate = JulianDate.fromDate(now);
            viewerRef.current.clock.currentTime = julianDate;
        }
    };

    useEffect(() => {
        if (!viewerContainerRef.current) return;

        // Créer le viewer Cesium
        const viewer = new Viewer(viewerContainerRef.current, {
            timeline: false,
            animation: false,
            navigationHelpButton: false,
            homeButton: false,
            sceneModePicker: false,
            baseLayerPicker: false,
            geocoder: false,
            fullscreenButton: false,
            selectionIndicator: false,
            infoBox: false,
            shadows: true
        });

        viewerRef.current = viewer;

        // Activer l'éclairage du globe
        viewer.scene.globe.enableLighting = true;

        // Ajouter les bâtiments 3D OSM
        createOsmBuildingsAsync()
            .then((buildingTileset) => {
                viewer.scene.primitives.add(buildingTileset);
            })
            .catch((err) => {
                console.error("Erreur chargement bâtiments 3D:", err);
            });

        // Positionner la caméra
        viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(lng, lat, 200),
            orientation: {
                heading: CesiumMath.toRadians(0),
                pitch: CesiumMath.toRadians(-45),
                roll: 0
            },
            duration: 3
        });

        // Ajouter un marqueur rouge pour le projet
        viewer.entities.add({
            position: Cartesian3.fromDegrees(lng, lat),
            point: {
                pixelSize: 10,
                color: Color.RED
            }
        });

        // Cleanup lors du démontage
        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
        };
    }, [lat, lng]);

    return (
        <div className="relative w-full h-full">
            {/* Overlay Contrôle Temps */}
            <div className="absolute top-4 left-4 z-50 bg-white/90 p-4 rounded-lg shadow-lg border border-gray-200 w-64 backdrop-blur-sm">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Simulation Solaire ☀️
                </label>
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                    <span>06:00</span>
                    <span className="font-mono font-bold text-blue-600 text-base">
                        {Math.floor(sliderValue).toString().padStart(2, '0')}:
                        {Math.floor((sliderValue % 1) * 60).toString().padStart(2, '0')}
                    </span>
                    <span>22:00</span>
                </div>
                <input
                    type="range"
                    min="6"
                    max="22"
                    step="0.25"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* Conteneur Cesium */}
            <div
                ref={viewerContainerRef}
                className="w-full h-full"
            />
        </div>
    );
}
