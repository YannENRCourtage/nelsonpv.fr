import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile } from '../utils/profiles.js';

/**
 * Auvent Component
 * - 4m Width
 * - Attached to LEFT side (-buildingWidth/2)
 * - Slope 10 deg down
 * - Cantilever structure (Rafters only, no columns)
 * - Purlins + Roof
 * 
 * IMPLEMENTATION NOTE:
 * Modeled as a RIGHT-SIDE extension (Positive X) inside a Group rotated 180 Y.
 * This effectively mirrors it to the Left (-X) and flips Z to go backwards (-Z).
 */
export function Auvent({ length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing }) {

    // --- DIMENSIONS ---
    const auventWidth = 4.0;
    const startHeight = eaveHeight; // 5.5m
    const angleRad = (roofPitch * Math.PI) / 180;

    // Group Position: Left Eave
    const groupPosX = -buildingWidth / 2;
    const groupPosY = startHeight;
    const groupPosZ = 0;

    // --- MATERIALS ---
    const structureMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#8b9bb4', // Galvanized steel
        metalness: 0.5,
        roughness: 0.2
    }), []);

    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    // --- GEOMETRY (Defined as Right-Side Extension) ---
    // Slope Length
    const slopeLength = auventWidth / Math.cos(angleRad) + 0.1; // +10cm overhang

    // Roof Profile
    const profileShape = useMemo(() => createTrapezoidalProfile(slopeLength, 0.035, 0.25), [slopeLength]);

    // Extrude +Z (Inside group, RotY 180 makes it -Z Global)
    const roofGeometry = useMemo(() => new THREE.ExtrudeGeometry(profileShape, {
        depth: length + 0.4, // 20cm overhang each end? 
        bevelEnabled: false
    }), [profileShape, length]);

    // Purlin Profile (Z140)
    const purlinHeight = 0.140;
    const purlinWidth = 0.060;
    const thickness = 0.003;
    const purlinSpacing = 1.3;
    const purlinShape = useMemo(() => createZProfile(purlinHeight, purlinWidth, thickness), []);
    const purlinGeometry = useMemo(() => new THREE.ExtrudeGeometry(purlinShape, {
        depth: baySpacing,
        bevelEnabled: false
    }), [purlinShape, baySpacing]);

    // Purlin Offset
    const purlinPerpOffset = 0.1 + (purlinHeight / 2); // Sit on Rafter (0.2m high)

    const numPurlins = Math.floor(slopeLength / purlinSpacing);
    const numFrames = bayCount + 1;

    // --- GENERATION ---
    const frames = [];
    const purlins = [];

    // Loop for Frames (Going +Z inside group -> -Z Global)
    for (let i = 0; i < numFrames; i++) {
        const zPos = i * baySpacing; // Positive Z in local space

        // 1. CANTILEVER RAFTER
        // Center of 4m span: X = 2.0
        // Y = -2.0 * tan(angle)
        frames.push(
            <mesh
                key={`rafter-${i}`}
                material={structureMaterial}
                position={[auventWidth / 2, -(auventWidth / 2) * Math.tan(angleRad), zPos]}
                rotation={[0, 0, -angleRad]} // Down-Right slope (in local space)
            >
                <boxGeometry args={[auventWidth, 0.2, 0.1]} />
            </mesh>
        );

        // 2. PURLINS
        if (i < bayCount) {
            const zStart = zPos;

            for (let j = 1; j <= numPurlins; j++) {
                const dist = j * purlinSpacing;

                const xLoc = dist * Math.cos(angleRad);
                const yLoc = -dist * Math.sin(angleRad);

                const xPerp = purlinPerpOffset * Math.sin(angleRad);
                const yPerp = purlinPerpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`purlin-${i}-${j}`}
                        geometry={purlinGeometry}
                        material={structureMaterial}
                        position={[
                            xLoc + xPerp,
                            yLoc + yPerp,
                            zStart
                        ]}
                        rotation={[0, 0, -angleRad]} // Align with slope
                    />
                );
            }
        }
        // 3. DIAGONAL STRUT (Bracon)
        // From Wall (X=0, Y=-2.0 relative to eave) to Rafter (X=2.5, Y=Slope)
        const strutStartX = 0.1; // Slightly off wall
        const strutStartY = -2.0; // 2m below eave
        // Target: Rafter at X=2.5
        const rafX = 2.5;
        const rafY = -rafX * Math.tan(angleRad); // Rafter height at X=2.5

        const deltaX = rafX - strutStartX;
        const deltaY = rafY - strutStartY;
        const strutLen = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const strutAngle = Math.atan2(deltaY, deltaX);

        frames.push(
            <mesh
                key={`strut-${i}`}
                material={structureMaterial}
                position={[
                    strutStartX + deltaX / 2,
                    strutStartY + deltaY / 2,
                    zPos
                ]}
                rotation={[0, 0, strutAngle]}
            >
                <boxGeometry args={[strutLen, 0.1, 0.1]} />
            </mesh>
        );
        // Median of 4m slope is at 2m.
        // Profile is centered? No, createTrapezoidalProfile starts at 0? 
        // Usually createTrapezoidalProfile starts at X=0.
        // So we need to position it.
        // We want Start (High) at X=0, Y=0.
        // And align with slope -angleRad.
        // If we rotate -angleRad around (0,0), it goes Down-Right. 
        // Matches.

        // Z Positioning:
        // Extrusion depth = Length + 0.4.
        // We want it centered on the frame run (0 to Length).
        // Start at -0.2?

        // Debug Log
        React.useEffect(() => {
            console.log("Auvent Rendered:", { length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing, groupPosX, groupPosY });
        }, [length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing]);

        return (
            <group
                position={[groupPosX, groupPosY, groupPosZ]}
                rotation={[0, Math.PI, 0]} // ROTATE 180 Y => Mirrors to Left & Flips Z
            >
                {/* ROOF SHEETS */}
                <mesh
                    geometry={roofGeometry}
                    material={roofMaterial}
                    position={[
                        slopeLength / 2, // Shifted to start at 0 and go outward
                        0.25, // Height offset (Rafter/2 + Purlin + Sheet)
                        -0.2  // Z Offset (Start slightly before 0)
                    ]}
                    rotation={[0, 0, -angleRad]}
                    castShadow
                    receiveShadow
                />

                {/* STRUCTURE */}
                {frames}
                {purlins}
            </group>
        );
    }
