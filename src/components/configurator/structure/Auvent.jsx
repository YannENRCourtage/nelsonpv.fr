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
    // --- DIMENSIONS ---
    // --- DIMENSIONS ---
    let auventWidth = 4.0; // Fixed 4m
    let angleRad = 5 * (Math.PI / 180); // Default 5 deg
    let startHeight = eaveHeight;

    if (buildingType === 'asymetrique_2') {
        // USER REQUEST 12/01/2026: Asymétrique 2 zones awnings
        // Angle: 15° for both sides
        angleRad = 15 * (Math.PI / 180);
        const w = buildingWidth;

        if (side === 'right') {
            // Right awning: top at 4m
            startHeight = 4.0;
        } else {
            // Left awning: top at 6.9m (25.5m) or 7.9m (29.1m)
            if (Math.abs(w - 25.5) < 0.1) {
                startHeight = 6.9;
            } else if (Math.abs(w - 29.1) < 0.1) {
                startHeight = 7.9;
            } else {
                // Fallback for other widths
                startHeight = 6.9;
            }
        }
    } else if (buildingType === 'asymetrique_1') {
        const asymRightEave = 4.0;
        let asymLeftEave = 6.4;
        const w = buildingWidth;

        // Logic matching PortalFrame
        const rAngle = 15 * (Math.PI / 180); // Fixed 15 (Reference)

        // Exact Logic for 16.4/20
        if (Math.abs(w - 20) < 0.5) {
            asymLeftEave = 7.4;
            // USER REQUEST 12/01/2026: Lower left awning by 30cm for 20m width
            asymLeftEave -= 0.30; // 7.4 - 0.30 = 7.1
        }
        else if (Math.abs(w - 16.4) < 0.5 || Math.abs(w - 16) < 0.5) { asymLeftEave = 6.4; }
        else {
            // Fallback
            const ridge = asymRightEave + (w * 0.75 * Math.tan(rAngle));
            asymLeftEave = ridge - (w * 0.25 * Math.tan(15 * Math.PI / 180));
        }

        if (side === 'right') {
            startHeight = asymRightEave; // 4.0
            const tipHeight = 3.0; // Fixed Tip
            angleRad = Math.atan((startHeight - tipHeight) / auventWidth);
        } else {
            startHeight = asymLeftEave;
            const tipHeight = startHeight - 1.0; // 1m Drop
            angleRad = Math.atan((startHeight - tipHeight) / auventWidth);
        }

    } else {
        // Sym/Mono Logic
        if (buildingType === 'symetrique') {
            angleRad = 10 * (Math.PI / 180);
            const rise = auventWidth * Math.tan(angleRad);

            if (side === 'right') {
                // Right High Point Fixed at 5.5m
                startHeight = 5.5;
            } else {
                // Left Keep Tip Logic with 10deg
                let tipHeight = 5.4;
                if (Math.abs(buildingWidth - 20) < 0.5) tipHeight = 6.4;
                else if (Math.abs(buildingWidth - 16) < 0.5 || Math.abs(buildingWidth - 16.4) < 0.5) tipHeight = 5.4;
                startHeight = (tipHeight + rise) - 0.60; // Lowered by 60cm total
            }
        } else {
            // Monopente (Force 15 deg)
            angleRad = 15 * (Math.PI / 180);
            const rise = auventWidth * Math.tan(angleRad);

            if (side === 'right') {
                // Right: High Point descending to Tip at 3.0m
                // High = Tip + Rise
                startHeight = 3.0 + rise;
            } else {
                // Left: Different Tip Targets based on Width
                let tipHeight = 6.4; // Default/Fallback for ~12.7m

                // Width 16.4m -> Tip 7.4m
                if (Math.abs(buildingWidth - 16.4) < 0.5 || Math.abs(buildingWidth - 16) < 0.5) {
                    tipHeight = 7.4;
                }
                // Width 12.7m -> Tip 6.4m (Already default, but explicit check)
                else if (Math.abs(buildingWidth - 12.7) < 0.5) {
                    tipHeight = 6.4;
                }

                // High = Tip + Rise
                startHeight = tipHeight + rise;
            }
        }
    }

    // Override for Logic Consistency?
    // If Monopente Left is Ridge... but user wants specific height. I respect strict height.
    // So I ignore `buildingType` checks for height, I use the rules.
    // Except maybe keep `angleRad` assignment clean.
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

    // Purlin Offset (with adjustments)
    let purlinPerpOffset = 0.1 + (purlinHeight / 2);

    // Asymmetric Right Awning: Raise purlins by 5cm
    if (buildingType === 'asymetrique_1' && side === 'right') {
        purlinPerpOffset += 0.05;
    }

    // Asymmetric Left Awning 20m: Lower purlins by 30cm
    if (buildingType === 'asymetrique_1' && side === 'left' && Math.abs(buildingWidth - 20) < 0.5) {
        purlinPerpOffset -= 0.30;
    }

    const numPurlins = Math.floor(slopeLength / purlinSpacing);
    const numFrames = bayCount + 1;

    // --- GENERATION ---
    const frames = [];
    const purlins = [];

    // Loop for Frames (Going +Z inside group -> -Z Global)
    for (let i = 0; i < numFrames; i++) {
        const zPos = i * baySpacing; // Positive Z in local space

        // 1. CANTILEVER RAFTER (Massive)
        // Asymmetric Left 20m: Lower by 30cm
        let rafterYOffset = 0;
        if (buildingType === 'asymetrique_1' && side === 'left' && Math.abs(buildingWidth - 20) < 0.5) {
            rafterYOffset = -0.30;
        }

        frames.push(
            <mesh
                key={`rafter-${i}`}
                material={structureMaterial}
                position={[auventWidth / 2, -(auventWidth / 2) * Math.tan(angleRad) + rafterYOffset, zPos]}
                rotation={[0, 0, -angleRad]} // Down-Right slope (in local space)
            >
                <boxGeometry args={[auventWidth, 0.35, 0.15]} />
            </mesh>
        );

        // 2. DIAGONAL STRUT (Massive, Raised, Shortened)
        const strutStartX = 0.1;
        let strutStartY = -0.8; // Raised High (was -2.0)

        // Asymmetric Left 20m: Lower strut by 30cm
        if (buildingType === 'asymetrique_1' && side === 'left' && Math.abs(buildingWidth - 20) < 0.5) {
            strutStartY -= 0.30;
        }

        const rafX = 2.0; // Shortened Target
        const rafY = -rafX * Math.tan(angleRad) + rafterYOffset; // Rafter height at X=2.0 (with offset)

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

    // Roof Y Position logic with all adjustments
    let roofY = -0.10; // Default baseline

    if (buildingType === 'asymetrique_2') {
        // USER REQUEST 12/01/2026: Awning cover adjustments for asymétrique 2 zones
        // Right awning: lower by 15cm + 10cm = 25cm total
        // Left awning: lower by 10cm + 5cm + 5cm (29.1m only) = 15cm (25.5m) or 20cm (29.1m)
        const w = buildingWidth;
        if (side === 'right') {
            roofY = -0.10 + 0.15 - 0.15 - 0.10; // +15 -15 -10 = -0.20
        } else {
            if (Math.abs(w - 29.1) < 0.1) {
                roofY = -0.10 + 0.15 - 0.10 - 0.05 - 0.05; // +15 -10 -5 -5 = -0.15
            } else {
                roofY = -0.10 + 0.15 - 0.10 - 0.05; // +15 -10 -5 = -0.10
            }
        }
    } else if (buildingType === 'symetrique') {
        // Symmetric: Raise both awnings by 4cm
        roofY = -0.10 + 0.04; // -0.06
    } else if (buildingType === 'asymetrique_1') {
        if (side === 'right') {
            // Asymmetric Right Awning: Raise cover by 3cm
            roofY = -0.10 + 0.03; // -0.07
        } else {
            // Asymmetric Left Awning adjustments
            if (Math.abs(buildingWidth - 20) < 0.5) {
                // 20m width: Lower by 30cm
                roofY = -0.10 - 0.30; // -0.40
            } else if (Math.abs(buildingWidth - 16.4) < 0.5 || Math.abs(buildingWidth - 16) < 0.5) {
                // 16.4m width: Lower by 15cm
                roofY = -0.10 - 0.15; // -0.25
            }
        }
    } else if (buildingType === 'monopente') {
        // Monopente: Lower awning coverage by 6cm
        roofY = -0.10 - 0.06;
    }

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
            {/* Longitudinal Beam (Sablière) at Tip - Only for Symmetric (Hidden for Monopente) */}
            {buildingType !== 'monopente' && (
                <mesh
                    position={[
                        auventWidth,
                        -auventWidth * Math.tan(angleRad) - 0.1 + 0.25,
                        length / 2
                    ]}
                    rotation={[0, 0, 0]}
                    material={structureMaterial}
                >
                    <boxGeometry args={[0.10, 0.20, length]} />
                </mesh>
            )}

            {/* Purlins */}
            {purlins}
        </group>
    );
}
