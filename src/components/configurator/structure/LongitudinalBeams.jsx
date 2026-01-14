import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getIPEProfileParams } from '../utils/profiles.js';

export function LongitudinalBeams({ width, length, eaveHeight, ridgeHeight, buildingType, roofPitch }) {
    const isMonopente = buildingType === 'monopente';

    // Material (Galvanized Steel)
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#d0d0d0',
        metalness: 0.5,
        roughness: 0.5
    }), []);

    // Helper to generic beam mesh
    const Beam = ({ x, y, z, rotation = [0, 0, 0] }) => {
        const { shape, options } = useMemo(() => getIPEProfileParams('IPE240', length), []);

        // Extrude geometry
        const geometry = useMemo(() => {
            const geo = new THREE.ExtrudeGeometry(shape, options);
            geo.center(); // Center to align easily, but careful with Z length
            // If centered, Z spans [-length/2, length/2].
            // We want it to span [0, -length] or similar to match frames.
            // Let's NOT center Z.
            return new THREE.ExtrudeGeometry(shape, options);
        }, [shape, options]);

        return (
            <mesh
                geometry={geometry}
                material={material}
                position={[x, y, z]}
                rotation={rotation}
            />
        );
    };

    // Correct Z positioning:
    // Extrusion of depth 'L' goes from Z=0 to Z=L.
    // Our building goes from Z=0 to Z=-L.
    // So we position at Z=0 and rotate Y=180? Or position at Z=-L and no rotation?
    // Let's position at Z = -length (so it goes from -length to 0).

    if (isMonopente) {
        return (
            <group>
                {/* Faitage Gauche (Ridge Left) */}
                <Beam
                    x={-width / 2}
                    y={ridgeHeight}
                    z={-length}
                />

                {/* Sablière Droite (Eave Right) */}
                <Beam
                    x={width / 2}
                    y={eaveHeight}
                    z={-length}
                />
            </group>
        );
    }

    // Ombrière VL Double
    const isOmbriereDouble = buildingType === 'ombriere_vl_double';

    if (isOmbriereDouble) {
        // Same logic as Roof.jsx
        const slopeRad = (10 * Math.PI) / 180; // Assuming 10 deg default if not passed, but PortalFrame uses roofPitch. 
        // roofPitch prop is not passed here? It is passed in props (line 5).
        const rotZ = -((roofPitch || 10) * Math.PI) / 180;

        const centerHeight = (eaveHeight + ridgeHeight) / 2;
        // Lift: Base 0.25 (clears rafter) + 0.60 (User Request) = 0.85
        const lift = 0.85;

        // Purlins distribution
        // Width ~ 9-11m. Purlins every ~1.5m?
        const purlinCount = 5;
        const spacing = width / (purlinCount - 1);

        return (
            <group position={[0, centerHeight + lift, 0]}>
                {Array.from({ length: purlinCount }).map((_, i) => {
                    const x = -width / 2 + (i * spacing);
                    // Purlin should follow the slope
                    const yOffset = x * Math.tan(rotZ);
                    return (
                        <Beam
                            key={i}
                            x={x}
                            y={yOffset}
                            z={-length} // Extrude goes 0 to L ? No, reused Beam component.
                        // Beam component options: length. 
                        // Wait, Beam component defined inside uses `length`.
                        // Extrude options usually default to Z extrusion.
                        // Beam component at line 33: position [x,y,z].
                        />
                    );
                })}
            </group>
        );
    }

    // Default for Symetrique (Optional, maybe nothing for now or just Sablières)
    return null;
}
