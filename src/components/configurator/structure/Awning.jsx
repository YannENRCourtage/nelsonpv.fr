import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile } from '../utils/profiles.js';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { SolarPanels } from './SolarPanels.jsx';

/**
 * Awning (Auvent) Component
 * - 9.3m Width
 * - Starts at Building Eave (5.5m)
 * - Ends at 3.87m
 * - 10 degree pitch (same as building)
 * - Covered by Bac Acier (Steel Deck)
 * - Supports (Columns) at the 3.87m end
 */
export function Awning({ length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing, side = 'right', buildingType = 'symetrique' }) {

    // --- DIMENSIONS ---
    const { isAcama, configMode, customParams } = useConfiguratorValues();
    const isCustom = configMode === 'custom';
    const cp = customParams;

    let awningWidth = isCustom ? (side === 'left' ? cp.leftExtWidth : cp.rightExtWidth) : 9.3;
    let startHeight = eaveHeight; 
    let angleRad = (roofPitch * Math.PI) / 180;
    
    // In custom mode, use the correct building eave height and compute angle from tipHeight
    if (isCustom) {
        startHeight = side === 'left' ? cp.leftEaveHeight : cp.rightEaveHeight;
        const tipHeight = side === 'left' ? (cp.leftExtHeight ?? 3.0) : (cp.rightExtHeight ?? 3.0);
        const heightDiff = startHeight - tipHeight;
        const extW = awningWidth;
        angleRad = extW > 0 ? Math.atan(Math.max(0, heightDiff) / extW) : (roofPitch * Math.PI / 180);
    }

    let endHeight = startHeight - (awningWidth * Math.tan(angleRad));

    const isTalian4 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(buildingWidth - 13.7) < 0.1;
    const isTalian1 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(buildingWidth - 18.8) < 0.1;
    const isTalian3 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(buildingWidth - 17.5) < 0.1;
    const isTalian = isTalian4 || isTalian1 || isTalian3;
    const isEpona = !isCustom && isAcama && buildingType === 'epona';

    if (isCustom) {
        // Handled by default let assignments above
    } else if (isAcama && buildingType === 'epona') {
        // ACAMA EPONA: Appentis droit 7.8m (Connecté à la toiture)
        awningWidth = 7.8;
        angleRad = (roofPitch * Math.PI) / 180;
        startHeight = eaveHeight + 0.4; // Remonté de 30cm total (couverture appentis)
        endHeight = startHeight - (awningWidth * Math.tan(angleRad));
    } else if (isTalian) {
        awningWidth = isTalian4 ? 11.2 : (isTalian1 ? 2.3 : 1.8);
        angleRad = (roofPitch * Math.PI) / 180;
        // TALIAN 1: 3.8m (ou eaveHeight) / TALIAN 3: 2.5m / TALIAN 4: 3.3m
        endHeight = isTalian4 ? 3.3 : (isTalian1 ? 3.8 : 2.5);
        startHeight = eaveHeight + 0.1;
    } else if (buildingType === 'asymetrique_2' && side === 'right') {
        startHeight = 4.0;
        angleRad = (15 * Math.PI) / 180;
        awningWidth = (4.0 - 3.0) / Math.tan(angleRad); // approx 3.73m
        endHeight = 3.0;

        // USER REQUEST 10/04/2026: GI uniquement - remonte couverture appentis droit +0.1m (25.5m et 29.1m)
        if (!isAcama) {
            const extraLift = 0.1;
            startHeight += extraLift;
            endHeight += extraLift;
        }
    } else if (buildingType === 'monopente' && side === 'left') {
        if (Math.abs(buildingWidth - 12.7) < 0.2) {
            endHeight = 6.4;
        } else if (Math.abs(buildingWidth - 16.4) < 0.2) {
            endHeight = 7.4;
        }
    } 

    // Position: Attached to the building
    // Right: +buildingWidth/2
    // Left: -buildingWidth/2
    const groupPosX = side === 'right' ? buildingWidth / 2 : -buildingWidth / 2;

    // Scale: Mirror X for Left side (Standard Awning is Right-facing +X)
    const scale = side === 'left' ? [-1, 1, 1] : [1, 1, 1];

    // --- MATERIALS ---
    const structureMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#8b9bb4', // Galvanized steel
        metalness: 0.5,
        roughness: 0.2
    }), []);

    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016 (Same as main roof)
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    // --- ROOF GEOMETRY ---
    // Length of the slope = Width / cos(angle)
    // "Jusqu'à la sablière" -> Ensure full coverage
    // User Request Phase 4: 75cm overhang for EPONA (1.25m branch - 0.50m reduction)
    const slopeLength = awningWidth / Math.cos(angleRad) + (isAcama && buildingType === 'epona' ? 0.75 : 0.2);



    // Profile for roof sheet
    const profileShape = useMemo(() => createTrapezoidalProfile(slopeLength, 0.035, 0.25), [slopeLength]);

    const roofGeometry = useMemo(() => new THREE.ExtrudeGeometry(profileShape, {
        depth: length + 1.0, // Same overhangs as building (0.5m front + 0.5m back)
        bevelEnabled: false
    }), [profileShape, length]);

    // GEOMETRY CENTERING ADJUSTMENT
    // Phase 34: Shift 5% towards eave (relative to median).
    // Median = 50% (0.50). Towards eave positive = +5% (0.05). Total = 0.55.
    const shiftLength = slopeLength * 0.55;
    const shiftX = shiftLength * Math.cos(angleRad);
    const shiftY = -shiftLength * Math.sin(angleRad);

    // --- PURLINS (PANNES) ---
    // Config Z180 (increased from Z140)
    const purlinHeight = 0.180;
    const purlinWidth = 0.070;
    const thickness = 0.003;
    const purlinSpacing = 1.3; // Same as building

    const purlinShape = useMemo(() => createZProfile(purlinHeight, purlinWidth, thickness), []);
    const purlinGeometry = useMemo(() => new THREE.ExtrudeGeometry(purlinShape, {
        depth: baySpacing,
        bevelEnabled: false
    }), [purlinShape, baySpacing]);

    // Calculate perpendicular offset for purlins (sit on top of Rafters)
    // Rafter Height = 0.2m (from boxGeometry below)
    // Rafter Top = 0.1m from center line
    // Purlin Center = 0.07m (half of 0.14)
    let purlinPerpOffset = 0.1 + (purlinHeight / 2);

    // USER REQUEST 10/04/2026: Sur-mesure uniquement - Calage 5cm au-dessus de la panne basse
    // On veut RoofBottom = PurlinTop + 0.05m
    // Avec RoofOffset = 0.52m au faîtage, cela impose purlinPerpOffset * cos(alpha) + PurlinHalfH = 0.47m
    if (isCustom) {
        purlinPerpOffset = (0.47 - (purlinHeight / 2)) / Math.cos(angleRad);
    }

    const numPurlins = Math.floor(slopeLength / purlinSpacing);

    // --- STRUCTURE GENERATION (Bays Loop) ---
    const frames = [];
    const purlins = [];
    const numFrames = bayCount + 1; // n bays = n+1 frames

    // Create Frames & Purlins
    for (let i = 0; i < numFrames; i++) {
        const zPos = -i * baySpacing;

        // 1. COLUMN (At the low end)
        // USER REQUEST Phase 14: Diminuer la longueur des poteaux verticaux
        const finalColHeight = isAcama && buildingType === 'epona' ? endHeight + 0.4 : endHeight; // EPONA: remonté de 60cm (-0.2+0.6=+0.4)
        frames.push(
            <mesh
                key={`col-${i}`}
                material={structureMaterial}
                position={[awningWidth, -startHeight + finalColHeight / 2, zPos]}
            >
                <boxGeometry args={[0.2, finalColHeight, 0.2]} />
            </mesh>
        );

        // 2. RAFTER (Connecting wall to column)
        frames.push(
            <mesh
                key={`rafter-${i}`}
                material={structureMaterial}
                position={[awningWidth / 2, -(awningWidth / 2) * Math.tan(angleRad) + (isEpona ? 0.6 : 0), zPos]}
                rotation={[0, 0, -angleRad]}
            >
                <boxGeometry args={[awningWidth, 0.2, 0.1]} />
            </mesh>
        );

        // 3. PURLINS (Per Bay - except last frame for extrusion)
        if (i < bayCount) {
            const zStart = zPos; // Purlin starts at current frame and goes to next (negative Z logic handled by rotation or negative depth?)
            // Purlins.jsx used rotation [0, PI, -angle] to extrude backwards?
            // Let's stick to standard: Position at zStart, extrude -baySpacing (using scale -1 z? or rotation)
            // We configured geometry with depth = baySpacing.
            // If we rotate 180 Y, Z becomes -Z.

            for (let j = 1; j <= numPurlins; j++) {
                const dist = j * purlinSpacing; // Start from 1 spacing out? Or 0? Usually 0 is eave purlin.
                // Building uses 0 to numPurlins.
                // Let's include 0 if we want a purlin at the wall.
                // "Entre la charpente et la couverture".
                // Let's do 0 to numPurlins.

                // Position along slope
                const xLoc = dist * Math.cos(angleRad);
                const yLoc = -dist * Math.sin(angleRad);

                // Apply Perp Offset (UP relative to slope)
                // Normal vector [-sin a, cos a] ? No.
                // Slope vector is [cos -a, sin -a] = [cos a, -sin a]
                // Normal (Upper) is [sin a, cos a]
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
                        // Rotate Y=180 to extrude towards -Z (Next frame is at zPos - baySpacing)
                        // And align with slope (-angleRad)
                        rotation={[0, Math.PI, -angleRad]}
                    />
                );
            }
        }
    }

    // Calculate coverage Vertical Offset
    // Base is 0.35.
    // For asym_2 right, add 0.15 -> 0.50.
    const baseCoverY = 0.35;
    let extraCoverY = (buildingType === 'asymetrique_2' && side === 'right') ? 0.15 : 0;
    if (buildingType === 'asymetrique_2' && side === 'right' && !isAcama) extraCoverY += 0.1; // Round 8: +0.1m for GI
    let finalCoverY = baseCoverY + extraCoverY;

    // USER REQUEST 10/04/2026: Sur-mesure uniquement - Alignement pile avec la couverture bâtiment (0.52m d'offset)
    if (isCustom) {
        finalCoverY = 0.52;
    }

    return (
        <group
            position={[groupPosX, startHeight, 0]}
            scale={scale}
        >
            {/* ROOF SHEETS */}
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                position={[
                    shiftX,
                    shiftY + finalCoverY,
                    -length - 0.5
                ]}
                rotation={[0, 0, -angleRad]} // Rotate down
                castShadow
                receiveShadow
            />

            {/* Solar Panels (Awning) */}
            <group
                position={[
                    shiftX,
                    shiftY + finalCoverY,
                    -length / 2
                ]}
                rotation={[0, 0, -angleRad]}
            >
                <SolarPanels
                    surfaceWidth={slopeLength}
                    surfaceLength={length + 1.0}
                    customMargin={slopeLength < 4.0 ? 0.20 : 0.50}
                />
            </group>

            {/* STRUCTURE FRAMES */}
            {frames}

            {/* Longitudinal Beam (Sablière) at Tip - Removed for EPONA ACAMA */}
            {(!isEpona || !isAcama) && (
                <mesh
                    position={[
                        awningWidth,
                        -awningWidth * Math.tan(angleRad) - 0.1 + (buildingType === 'monopente' ? 0.4 : 0.25),
                        -length / 2
                    ]}
                    rotation={[0, 0, 0]}
                    material={structureMaterial}
                >
                    <boxGeometry args={[0.16, 0.32, length]} />
                </mesh>
            )}


            {/* PURLINS */}
            {purlins}
        </group>
    );
}
