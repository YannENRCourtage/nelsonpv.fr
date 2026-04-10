import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile, getIPEProfileParams } from '../utils/profiles.js';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
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
    const { isAcama, configMode, customParams } = useConfiguratorValues();
    const isCustom = configMode === 'custom';
    const cp = customParams;

    const isTalian4 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(buildingWidth - 13.7) < 0.1;
    const isTalian1 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(buildingWidth - 18.8) < 0.1;
    const isTalian3 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(buildingWidth - 17.5) < 0.1;
    const isTalian = isTalian4 || isTalian1 || isTalian3;
    const isEpona = !isCustom && isAcama && buildingType === 'epona';

    let auventWidth = isCustom ? (side === 'left' ? cp.leftExtWidth : cp.rightExtWidth) : 4.0;
    let angleRad = 5 * (Math.PI / 180); // Default 5 deg
    let startHeight = eaveHeight;

    if (isCustom) {
        startHeight = side === 'left' ? cp.leftEaveHeight : cp.rightEaveHeight;
        const tipHeight = side === 'left' ? (cp.leftExtHeight ?? 3.0) : (cp.rightExtHeight ?? 3.0);
        // Angle dynamique : la pente s'adapte pour que le bout de l'auvent soit exactement à tipHeight
        const heightDiff = startHeight - tipHeight;
        const extW = side === 'left' ? cp.leftExtWidth : cp.rightExtWidth;
        angleRad = extW > 0 ? Math.atan(Math.max(0, heightDiff) / extW) : (10 * (Math.PI / 180));
    } else if (buildingType === 'asymetrique_2') {
        const w = buildingWidth;
        if (side === 'right') {
            angleRad = 15 * (Math.PI / 180);
            startHeight = 4.0;
        } else {
            // Left awning: perfectly aligned with building left slope
            if (Math.abs(w - 25.5) < 0.1) {
                startHeight = 6.9; // Building Eave Height
                angleRad = Math.atan(2.0 / 6.375); // Ridge 8.9, Span 6.375 -> Rise 2.0
            } else if (Math.abs(w - 29.1) < 0.1) {
                startHeight = 7.9; // Building Eave Height
                angleRad = Math.atan(1.9 / 7.275); // Ridge 9.8, Span 7.275 -> Rise 1.9
            } else {
                startHeight = 6.9;
                angleRad = 17.4 * (Math.PI / 180);
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

    } else if (isAcama && buildingType === 'epona') {
        // ACAMA EPONA: Specs Phase 15 (Sablière G abaissée à 5m)
        auventWidth = 2.5;
        angleRad = 17 * (Math.PI / 180);
        startHeight = 5.0; // Sablière Gauche à 5m
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

            // OVERRIDE FOR TALIAN 1 (ACAMA)
            if (isAcama && Math.abs(buildingWidth - 18.8) < 0.1) {
                auventWidth = 2.3;
                angleRad = 14 * (Math.PI / 180);
                startHeight = eaveHeight + 0.2; // Phase 18: +10cm vs +0.1
            }
            // OVERRIDE FOR TALIAN 3 (ACAMA)
            if (isAcama && Math.abs(buildingWidth - 17.5) < 0.1) {
                auventWidth = 1.8;
                angleRad = 12 * (Math.PI / 180);
                startHeight = eaveHeight; // USER REQUEST 05/03/2026: Lower to eave level
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
    const purlinSpacing = 1.3; // Distance between purlins along slope (Matches building)

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

    // TALIAN refinements (ACAMA)
    if (isTalian3) {
        // Aligner avec les pannes du bâtiment principal (offset 0.271m dans Purlins.jsx)
        // La structure auvent est décalée de rafterYOffset (0.165m) par rapport à la structure bâtiment
        purlinPerpOffset = 0.271 - (0.165 / Math.cos(angleRad));
    } else if (isTalian1) purlinPerpOffset -= 0.15;


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
        // TALIAN refinements (ACAMA)
        // TALIAN 3: Lower structure by 35cm
        // TALIAN 1: Lower structure by 15cm
        let rafterYOffset = 0;
        if (isTalian3) rafterYOffset = 0.165; // Matches building rafter offset for continuity
        else if (isTalian1) rafterYOffset = -0.15;

        if (buildingType === 'asymetrique_2' && side === 'left') {
            rafterYOffset = 0.165; // Align with building rafter offset
        }

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

        // User Request Phase 4: Removed for EPONA ACAMA
        if (!isEpona || !isAcama) {
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
        }



        // 3. PURLINS
        if (i < bayCount) {
            const zStart = zPos;

            for (let j = 1; j <= numPurlins; j++) {
                const dist = j * purlinSpacing;

                const xLoc = dist * Math.cos(angleRad);
                const yLoc = -dist * Math.sin(angleRad);

                const xPerp = purlinPerpOffset * Math.sin(angleRad);
                const yPerp = purlinPerpOffset * Math.cos(angleRad);

                let finalYLoc = yLoc + yPerp;
                // TALIAN 3: Specific purlin adjustments
                // TALIAN 3: Alignement automatique via purlinPerpOffset
                // (Retrait des ajustements manuels car l'offset calculé assure la continuité)



                purlins.push(
                    <mesh
                        key={`purlin-${i}-${j}`}
                        geometry={purlinGeometry}
                        material={structureMaterial}
                        position={[
                            xLoc + xPerp,
                            finalYLoc,
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

    // TALIAN refinements (ACAMA)
    // TALIAN 3: Lower roof by 130cm total (was 110cm, -20cm as requested phase 19)
    if (isTalian3) roofY -= 1.30;

    else if (isTalian1) roofY -= 0.05;


    if (buildingType === 'asymetrique_2') {
        // USER REQUEST 05/03/2026: Align with building roof continuity
        const w = buildingWidth;
        if (side === 'right') {
            roofY = -0.20;
        } else {
            if (Math.abs(w - 29.1) < 0.1) {
                roofY = 0.245; // Calculated to match Roof.jsx continuity
            } else {
                roofY = -0.155; // Calculated to match Roof.jsx continuity
            }
        }
    } else if (buildingType === 'symetrique') {
        // Symmetric: Raise both awnings by 4cm
        roofY = -0.10 + 0.04; // -0.06
        if (isTalian3) roofY = -0.155 + 0.35; // USER REQUEST 05/03/2026: net +35cm (was +20cm, +15cm now)
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
        // Monopente: Lower awning coverage by 16cm
        roofY = -0.10 - 0.16;
    }
    // USER REQUEST 10/04/2026: Sur-mesure uniquement - Remonte couverture auvent de 0.3m
    if (isCustom) roofY += 0.30;

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
                <SolarPanels
                    surfaceWidth={slopeLength}
                    surfaceLength={length + 1.0}
                    customMargin={slopeLength < 4.0 ? 0.20 : 0.50}
                />
            </group>

            {/* STRUCTURE */}
            {frames}
            {/* Longitudinal Beam (Sablière) at Tip - Hidden for EPONA ACAMA and TALIAN 3 */}
            {(buildingType !== 'monopente' && !isTalian3 && (!isEpona || !isAcama)) && (
                <mesh
                    position={[
                        auventWidth,
                        -auventWidth * Math.tan(angleRad) - 0.1 + (isTalian3 ? -0.25 : 0.25),
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
