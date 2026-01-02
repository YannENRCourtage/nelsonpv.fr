import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createZProfile } from '../utils/profiles.js';

export function Purlins({ width, length, bayCount, baySpacing, roofPitch, eaveHeight, ridgeHeight, buildingType = 'symetrique' }) {
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#d0d0d0', // Galvanized
        metalness: 0.5,
        roughness: 0.5
    }), []);

    // Config for Z-Purlin (Z140)
    const purlinHeight = 0.140;
    const purlinWidth = 0.060;
    const thickness = 0.003;
    const purlinSpacing = 1.3; // Distance between purlins along slope

    // Geometry for a SINGLE BAY
    // Extrude depth = baySpacing.
    const shape = useMemo(() => createZProfile(purlinHeight, purlinWidth, thickness), []);

    // We want the purlin to run along the bay (-Z direction usually if we just offset).
    // Let's create it with positive depth and rotate/position accordingly.
    const bayGeometry = useMemo(() => new THREE.ExtrudeGeometry(shape, {
        depth: baySpacing,
        bevelEnabled: false
    }), [baySpacing, shape]);

    const halfWidth = width / 2;
    const isMonopente = buildingType === 'monopente';

    // Rafter IPE 400 (Height = 0.4m). Half-height = 0.2m.
    // Purlin sits ON TOP of Rafter.
    const rafterOffset = 0.20;
    const perpOffset = rafterOffset + (purlinHeight / 2) + 0.001; // Small 1mm tolerance

    const purlins = [];

    // --- MONOPENTE GENERATION ---
    if (isMonopente) {
        const deltaH = ridgeHeight - eaveHeight;
        const angleRad = Math.atan(deltaH / width);
        const slopeLength = width / Math.cos(angleRad);

        const numPurlins = Math.floor(slopeLength / purlinSpacing);

        // Loop through BAYS
        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            // Loop Purlins along single slope
            for (let i = 0; i <= numPurlins; i++) {
                const dist = i * purlinSpacing;

                const xLocal = dist * Math.cos(angleRad);
                const yLocal = dist * Math.sin(angleRad);

                // Normal Vector: (-sin, cos)
                const xPerp = -perpOffset * Math.sin(angleRad);
                const yPerp = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-Mono-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            eaveHeight + yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, -angleRad]}
                    />
                );
            }
        }
    }
    // --- SYMMETRICAL GENERATION ---
    else {
        const angleRad = (roofPitch * Math.PI) / 180;
        const slopeLength = halfWidth / Math.cos(angleRad);
        const numPurlinsPerSide = Math.floor(slopeLength / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            // Loop through PURLIN ROWS
            for (let i = 0; i <= numPurlinsPerSide; i++) {
                const dist = i * purlinSpacing;

                // --- Left Side ---
                const xLocal = dist * Math.cos(angleRad);
                const yLocal = dist * Math.sin(angleRad);

                const xPerp = -perpOffset * Math.sin(angleRad);
                const yPerp = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-L-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            eaveHeight + yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, -angleRad]}
                    />
                );

                // --- Right Side ---
                const xLocalR = dist * Math.cos(angleRad);
                const yLocalR = dist * Math.sin(angleRad);

                const xPerpR = perpOffset * Math.sin(angleRad);
                const yPerpR = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-R-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            halfWidth - xLocalR + xPerpR,
                            eaveHeight + yLocalR + yPerpR,
                            zStart
                        ]}
                        rotation={[0, Math.PI, angleRad]}
                    />
                );
            }
        }
    }

    return <group>{purlins}</group>;
}
