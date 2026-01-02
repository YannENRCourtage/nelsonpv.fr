import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile } from '../utils/profiles.js';
import { SolarPanels } from './SolarPanels.jsx';

/**
 * Auvent Component
 * - 4m Width
 * - Attached to LEFT side (-buildingWidth/2)
 * - Slope 10 deg down
 * - Cantilever structure (Rafters + Struts)
 * - Purlins + Roof
 */
export function Auvent({ length, eaveHeight, ridgeHeight, roofPitch, buildingWidth, bayCount, baySpacing, side = 'left', buildingType = 'symetrique' }) {

    // --- DIMENSIONS ---
    const auventWidth = 2.0;

    // Logic for Monopente Heights
    let startHeight = eaveHeight;
    let angleRad = (roofPitch * Math.PI) / 180;

    if (buildingType === 'monopente') {
        // Monopente Specifics
        if (side === 'left') {
            // Low Side: ALWAYS 3.0m as per user request
            startHeight = 3.0;
            // Calculate angle to drop 1m over 2m width? 
            // Or does it follow roof pitch? 
            // User: "height... is always 3m". 
            // Usually Auvent slope is standard (e.g. 10deg) unless it extends roof.
            // Assuming standard slope for Auvent itself:
            // angleRad remains default (10 deg) unless specified otherwise.
            // If it must be continuous with roof, we'd use roofPitch.
            // Keeping default angleRad derived from roofPitch prop is safer unless specified.
            angleRad = (roofPitch * Math.PI) / 180;
        } else {
            // High Side: Attaches at Ridge Height
            startHeight = ridgeHeight;
            angleRad = (roofPitch * Math.PI) / 180;
        }
    }

    // Group Position
    // Left: -buildingWidth/2
    // Right: +buildingWidth/2
    const groupPosX = side === 'right' ? buildingWidth / 2 : -buildingWidth / 2;

    // Scale: Mirror X for Right side (Standard Auvent is designed for Left -X)
    const scale = side === 'right' ? [-1, 1, 1] : [1, 1, 1];

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

    // --- GEOMETRY ---
    // Slope Length
    const slopeLength = auventWidth / Math.cos(angleRad) + 0.2; // +20cm overhang (Same as Appentis)

    // Roof Profile
    const profileShape = useMemo(() => createTrapezoidalProfile(slopeLength, 0.035, 0.25), [slopeLength]);

    // Extrude +Z (Inside group, RotY 180 makes it -Z Global)
    const roofGeometry = useMemo(() => new THREE.ExtrudeGeometry(profileShape, {
        depth: length + 1.0, // Same to Appentis/Building (1.0m extra)
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
    const purlinPerpOffset = 0.1 + (purlinHeight / 2);

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

        // 2. DIAGONAL STRUT (Bracon)
        // From Wall (X=0, Y=-2.0 relative to eave) to Rafter (X=2.5, Y=Slope)
        const strutStartX = 0.1; // Slightly off wall for visual separation
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

        // 3. PURLINS
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
    }

    // Debug Log (Moved outside loop!)
    React.useEffect(() => {
        console.log("Auvent Rendered:", { length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing, groupPosX, groupPosY });
    }, [length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing]);

    return (
        <group
            position={[groupPosX, groupPosY, groupPosZ]}
            rotation={[0, Math.PI, 0]} // ROTATE 180 Y => Mirrors to Left & Flips Z
            scale={scale}
        >
            {/* ROOF SHEETS - Shifted X for correct placement */}
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                position={[
                    slopeLength / 2,
                    -0.03, // Lowered by 3cm
                    -0.5   // -50cm offset (Front Overhang)
                ]}
                rotation={[0, 0, -angleRad]}
                castShadow
                receiveShadow
            />
            {/* Solar Panels (Auvent) */}
            <group
                position={[
                    slopeLength / 2,
                    -0.03,
                    length / 2
                ]}
                rotation={[0, 0, -angleRad]}
            >
                <SolarPanels surfaceWidth={slopeLength} surfaceLength={length + 1.0} />
            </group>

            {/* STRUCTURE */}
            {frames}
            {purlins}
        </group>
    );
}
