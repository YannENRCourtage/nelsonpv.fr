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
        const angleRad = Math.atan(deltaH / width); // Absolute angle
        const slopeLength = width / Math.cos(angleRad);

        const numPurlins = Math.floor(slopeLength / purlinSpacing);

        // Loop through BAYS
        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            // Loop Purlins along single slope
            for (let i = 0; i <= numPurlins; i++) {
                const dist = i * purlinSpacing;

                // Start from Left Wall (-halfWidth)
                // Height starts at RIDGE HEIGHT
                // X progresses positive
                // Y progresses NEGATIVE (Down)

                const xLocal = dist * Math.cos(angleRad);
                const yLocal = -dist * Math.sin(angleRad); // Go Down

                // Normal Vector for Perpendicular Offset
                // Slope is Down-Right (-Angle). Normal is (+Sin, +Cos)? 
                // Wait. Vector (1, -tan). Normal (tan, 1).
                // Or simply: Previous was (+Angle). 
                // Now we are rotating -Angle.
                // Left-to-Right Descending.
                // Perpendicular is "Up-Right"? No, "Up-Left" (Normal to surface).
                // Surface Normal for -Angle: (-sin(-a), cos(-a)) -> (sin a, cos a).

                const xPerp = perpOffset * Math.sin(angleRad);
                const yPerp = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-Mono-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            ridgeHeight + yLocal + yPerp, // Start at Ridge
                            zStart
                        ]}
                        rotation={[0, Math.PI, -angleRad]} // Rotate Negative
                    />
                );
            }
        }
    }
    // --- ASYMMETRICAL GENERATION ---
    else if (buildingType === 'asymetrique_1') {
        const w = width;
        const rightEave = 4.0;
        let leftEave = 6.4;
        let ridge = 7.4;

        // Force 15 deg logic
        const rS = 15 * Math.PI / 180;
        ridge = 4.0 + (w * 0.75 * Math.tan(rS));
        leftEave = ridge - (w * 0.25 * Math.tan(rS));

        const rightSpan = w * 0.75;
        const rRise = ridge - rightEave;
        const rAngle = Math.atan(rRise / rightSpan);

        const lSpan = w * 0.25;
        const lRise = ridge - leftEave;
        const lAngle = Math.atan(lRise / lSpan);

        // --- Left Side (Steep) ---
        const leftSlopeLen = lSpan / Math.cos(lAngle);
        const numPurlinsLeft = Math.floor(leftSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlinsLeft; i++) {
                const dist = i * purlinSpacing;

                const xLocal = dist * Math.cos(lAngle);
                const yLocal = dist * Math.sin(lAngle);

                // Perp Offset 
                const xPerp = -perpOffset * Math.sin(lAngle);
                const yPerp = perpOffset * Math.cos(lAngle);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-L-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            leftEave + yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, -lAngle]}
                    />
                );
            }
        }

        // --- Right Side (Shallow - 15 deg) ---
        const rightSlopeLen = rightSpan / Math.cos(rAngle);
        const numPurlinsRight = Math.floor(rightSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlinsRight; i++) {
                const dist = i * purlinSpacing;

                // Right Side Logic: Starts at Right Eave (Width/2, EaveHeight)
                // Goes Up-Left.
                // Local X = - dist * cos(rAngle)
                // Local Y = dist * sin(rAngle)

                const xLocal = -dist * Math.cos(rAngle);
                const yLocal = dist * Math.sin(rAngle);

                // Perp Offset (Normal points UP-RIGHT) -> (sin, cos)
                const xPerp = perpOffset * Math.sin(rAngle);
                const yPerp = perpOffset * Math.cos(rAngle);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-R-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            halfWidth + xLocal + xPerp,
                            eaveHeight - 1.5 + yLocal + yPerp, // Lower by 1.5m
                            zStart
                        ]}
                        rotation={[0, Math.PI, rAngle]}
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
