import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile, getIPEProfileParams } from '../utils/profiles.js';
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
    // Logic for Monopente Heights
    let startHeight = eaveHeight;
    let angleRad = (roofPitch * Math.PI) / 180;

    // Default width
    let auventWidth = 2.0;

    if (buildingType === 'monopente') {
        // Monopente: Auvent drops roughly 1m based on slope 13 deg
        // Width fixed to 4.0m per user request
        const requiredAngle = 13 * (Math.PI / 180); // 13 degrees fixed slope
        auventWidth = 4.0;

        if (side === 'left') {
            startHeight = 4.0; // Fixed Eave Height for Monopente
            angleRad = requiredAngle;
        } else {
            startHeight = ridgeHeight; // Attaches at Ridge
            angleRad = requiredAngle;
        }
    } else if (buildingType === 'symetrique') {
        // Symetrique: Auvent drops from Eave to ~4.8m based on slope 10 deg
        // Width fixed to 4.0m per user request
        const specificAngle = 10 * (Math.PI / 180); // 10 degrees fixed slope
        angleRad = specificAngle;
        auventWidth = 4.0;
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

    // Purlin Profile (Z180)
    const purlinHeight = 0.180;
    const purlinWidth = 0.070;
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

        // 1. CANTILEVER RAFTER (Massive)
        frames.push(
            <mesh
                key={`rafter-${i}`}
                material={structureMaterial}
                position={[auventWidth / 2, -(auventWidth / 2) * Math.tan(angleRad), zPos]}
                rotation={[0, 0, -angleRad]} // Down-Right slope (in local space)
            >
                <boxGeometry args={[auventWidth, 0.35, 0.15]} />
            </mesh>
        );

        // 2. DIAGONAL STRUT (Massive, Raised, Shortened)
        const strutStartX = 0.1;
        const strutStartY = -0.8; // Raised High (was -2.0)

        const rafX = 2.0; // Shortened Target
        const rafY = -rafX * Math.tan(angleRad); // Rafter height at X=2.0

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
                <boxGeometry args={[strutLen, 0.2, 0.2]} />
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

    // Roof Y Position logic
    // Monopente: Lowered by 10cm requested (-0.13)
    // Symetrique: Kept at raised level (-0.03)
    const roofY = buildingType === 'monopente' ? -0.13 : -0.03;

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
                    roofY,
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
                    roofY,
                    length / 2
                ]}
                rotation={[0, 0, -angleRad]}
            >
                <SolarPanels surfaceWidth={slopeLength} surfaceLength={length + 1.0} />
            </group>

            {/* STRUCTURE */}
            {frames}
            {/* Longitudinal Beam (Sablière) at Tip - Further Reduced Dimensions */}
            <mesh
                position={[
                    auventWidth,
                    -auventWidth * Math.tan(angleRad) - 0.1 + (buildingType === 'monopente' ? 0.36 : 0.25),
                    length / 2
                ]}
                rotation={[0, 0, 0]}
                material={structureMaterial}
            >
                <boxGeometry args={[0.10, 0.20, length]} />
            </mesh>

            {/* Purlins */}
            {purlins}
        </group>
    );
}
