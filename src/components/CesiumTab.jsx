import React, { useEffect, useState, useRef } from "react";
import { Viewer, Entity, CameraFlyTo, Cesium3DTileset } from "resium";
import {
    Cartesian3,
    createOsmBuildings,
    Ion,
    Math as CesiumMath,
    JulianDate,
    ClockRange,
    ClockStep,
    Color
} from "cesium";

// Token provided by user
Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDgzMzNlNC1lYjg4LTQ1OGMtOWNiYS1kZDEwMDgzMTY4Y2IiLCJpZCI6Mzg1Mjg2LCJpYXQiOjE3Njk3ODY1Nzl9.U05Yue-PtoGiaBQRlNLoZ5Pk3hNTFDRLu-aG5g7mj1o";

export default function CesiumTab({ project }) {
    const viewerRef = useRef(null);
    const [sliderValue, setSliderValue] = useState(12); // Heure de défaut : 12h00
    const [isReady, setIsReady] = useState(false);

    // Coordonnées du projet
    const coords = project?.gps ? project.gps.split(',').map(Number) : [46.2276, 2.2137]; // Centre France par défaut
    const [lat, lng] = coords;

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        setSliderValue(val);

        if (viewerRef.current && viewerRef.current.cesiumElement) {
            const viewer = viewerRef.current.cesiumElement;

            // Date actuelle fixe pour la simulation (on pourrait la rendre dynamique)
            const now = new Date();
            now.setHours(Math.floor(val));
            now.setMinutes(Math.floor((val % 1) * 60));

            const julianDate = JulianDate.fromDate(now);
            viewer.clock.currentTime = julianDate;
        }
    };

    useEffect(() => {
        setIsReady(true);
    }, []);

    if (!isReady) return <div className="w-full h-full flex items-center justify-center bg-gray-100">Chargement de la 3D...</div>;

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
                    step="0.25" // 15 minutes
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            <Viewer
                ref={viewerRef}
                full
                timeline={false}
                animation={false}
                navigationHelpButton={false}
                homeButton={false}
                sceneModePicker={false}
                baseLayerPicker={false}
                geocoder={false}
                fullscreenButton={false}
                selectionIndicator={false}
                infoBox={false}
                shadows={true}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
            >
                <CameraFlyTo
                    destination={Cartesian3.fromDegrees(lng, lat, 200)} // 200m altitude
                    orientation={{
                        heading: CesiumMath.toRadians(0),
                        pitch: CesiumMath.toRadians(-45), // Vue inclinée
                        roll: 0
                    }}
                    duration={3}
                />

                {/* Bâtiments 3D Monde Entier */}
                <Cesium3DTileset
                    url={createOsmBuildings()}
                    onReady={(tileset) => {
                        // Style optionnel pour les bâtiments
                        tileset.style = new Desium.Cesium3DTileStyle({
                            color: "color('white', 1)"
                        });
                    }}
                />

                {/* Marqueur sur le projet */}
                <Entity
                    position={Cartesian3.fromDegrees(lng, lat)}
                    point={{ pixelSize: 10, color: Color.RED }}
                />
            </Viewer>
        </div>
    );
}
