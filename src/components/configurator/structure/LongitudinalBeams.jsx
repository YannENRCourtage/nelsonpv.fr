import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getIPEProfileParams } from '../utils/profiles.js';

export function LongitudinalBeams({ width, length, eaveHeight, ridgeHeight, buildingType }) {
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

    // Default for Symetrique (Optional, maybe nothing for now or just Sablières)
    return null;
}
