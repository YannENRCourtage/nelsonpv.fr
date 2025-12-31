import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createZProfile } from '../utils/profiles.js';

export function Purlins({ width, length, bayCount, baySpacing, roofPitch, eaveHeight }) {
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
    const angleRad = (roofPitch * Math.PI) / 180;
    const slopeLength = halfWidth / Math.cos(angleRad);

    // Rafter IPE 400 (Height = 0.4m). Half-height = 0.2m.
    // Purlin sits ON TOP of Rafter.
    const rafterOffset = 0.20;
    const perpOffset = rafterOffset + (purlinHeight / 2) + 0.001; // Small 1mm tolerance

    const numPurlinsPerSide = Math.floor(slopeLength / purlinSpacing);
    const purlins = [];

    // Loop through BAYS
    // Bay 0 starts at Z=0, ends at Z=-baySpacing
    for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
        const zStart = -bayIndex * baySpacing;

        // Loop through PURLIN ROWS
        for (let i = 0; i <= numPurlinsPerSide; i++) {
            const dist = i * purlinSpacing;

            // --- Left Side (Gauche) ---
            const xLocal = dist * Math.cos(angleRad);
            const yLocal = dist * Math.sin(angleRad);

            // Normal Vector to slope (for stacking): (-sin a, cos a)
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
                    // Rotate Y centered means it spins around its start.
                    // Extrusion +Z.
                    // We want it to go -Z.
                    // Rotate Y=180? (Math.PI). 
                    // Then Z becomes -Z. X becomes -X.
                    // We need to verify orientation.
                    // Let's use `depth: -baySpacing` in geometry? No, keep standard.
                    // If we position at zStart (e.g. 0) and it extrudes +Z (0 to +6), that's wrong direction (into building front yard).
                    // We want 0 to -6.
                    // So position at zStart + ? Or Rotate 180.
                    // If Rotate 180: Origin stays at zStart. Extrusion goes -Z.
                    // Orientation of cross section flips X->-X.
                    // Z-profile is asymmetric. We need to check if flip matters.
                    // Doing rotation Y=PI is safe for straight beam.
                    // Then we also apply Roof Slope Rotation (Z axis).
                    rotation={[0, Math.PI, -angleRad]}
                />
            );

            // --- Right Side (Droit) ---
            const xLocalR = dist * Math.cos(angleRad);
            const yLocalR = dist * Math.sin(angleRad);

            // Normal Vector (Stacking): (sin a, cos a)
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
                    // Right side slope is negative.
                    // Rotate Y=180 to get -Z extrusion.
                    // Local X becomes -Global X.
                    // We want slope UP-Left (from Right Eave).
                    // Up-Left is +Y, -X.
                    // With Y=180, Local X is -Global X.
                    // So +Local X goes Left.
                    // Simple Angle Rotation Z = +angle?
                    // Let's stick to symmetry: Right side slope factor `angleRad`.
                    // If we just mirrored the left side mesh? scale=[-1,1,1]?
                    rotation={[0, Math.PI, angleRad]}
                />
            );
        }
    }

    return <group>{purlins}</group>;
}
