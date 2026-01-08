import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile } from '../utils/profiles.js';
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
    let awningWidth = 9.3;
    let startHeight = eaveHeight; // 5.5m
    let angleRad = (roofPitch * Math.PI) / 180;
    let endHeight = 3.87;

    if (buildingType === 'asymetrique_2' && side === 'right') {
        startHeight = 4.0;
        angleRad = (15 * Math.PI) / 180;
        // Calculate endHeight based on width and angle, OR if user implied specific end height.
        // User: "au plus bas à 3m".
        // If width is 9.3m, 4 - 9.3 * tan(15) = 4 - 9.3 * 0.267 = 4 - 2.49 = ~1.5m.
        // User said "au plus bas à 3m". This implies the width might be narrower OR the slope is defined by heights.
        // Geometric constraint: if H1=4, H2=3, Angle=15, then W = (4-3)/tan(15) = 1/0.2679 = 3.73m.
        // If we force width=9.3 and Angle=15, we can't respect EndHeight=3.
        // If we force H1=4 and H2=3, Angle is atan(1/9.3) = 6 deg.
        // Priority: "pente de 15°".
        // Let's assume the width adapts OR the 3m is just a description of the 'limit' but maybe not the exact end?
        // Or maybe for this building type, the awning is smaller?
        // Let's keep 9.3m width and 15 deg pitch for now as standard awning dimensions usually prevail, 
        // unless I should shorten it. But "au plus bas à 3m" is very specific.
        // If we interpret "max 4m, min 3m", maybe it means it fits WITHIN that?
        // Let's stick to startHeight 4.0 and angle 15. The end height will fall where it may.
        // Wait, "auvent droit doit être au plus haut à 4m et au plus bas à 3m". 
        // This likely defines the GEOMETRY. W = (4-3)/tan(15) = 3.73m.
        // I will SET THE WIDTH to 3.73m if asym_2 right.
        awningWidth = (4.0 - 3.0) / Math.tan(angleRad); // approx 3.73m
        endHeight = 3.0;
    } else {
        // Standard calculation for others if needed?
        // endHeight is currently hardcoded 3.87 in original code line 20, 
        // but that implies specific width/pitch combination.
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
    // "Jusqu'à la sablière" -> Ensure full coverage + overhang
    const slopeLength = awningWidth / Math.cos(angleRad) + 0.2; // +20cm overhang

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
    const purlinPerpOffset = 0.1 + (purlinHeight / 2);

    const numPurlins = Math.floor(slopeLength / purlinSpacing);

    // --- STRUCTURE GENERATION (Bays Loop) ---
    const frames = [];
    const purlins = [];
    const numFrames = bayCount + 1; // n bays = n+1 frames

    // Create Frames & Purlins
    for (let i = 0; i < numFrames; i++) {
        const zPos = -i * baySpacing;

        // 1. COLUMN (At the low end)
        frames.push(
            <mesh
                key={`col-${i}`}
                material={structureMaterial}
                position={[awningWidth, -startHeight + endHeight / 2, zPos]}
            >
                <boxGeometry args={[0.2, endHeight, 0.2]} />
            </mesh>
        );

        // 2. RAFTER (Connecting wall to column)
        frames.push(
            <mesh
                key={`rafter-${i}`}
                material={structureMaterial}
                position={[awningWidth / 2, -(awningWidth / 2) * Math.tan(angleRad), zPos]}
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

    return (
        <group
            position={[groupPosX, startHeight, 0]}
            scale={scale}
        >
            {/* ROOF SHEETS */}
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                // Updated Position (Phase 30 maintained):
                // 1. Shifted (shiftX, shiftY) based on new 55% logic.
                // 2. Raised by 5cm (+0.05 in Y) relative to previous baseline. Total +0.35.
                position={[
                    shiftX,
                    shiftY + 0.35,
                    -length - 0.5
                ]}
                rotation={[0, 0, -angleRad]} // Rotate down 10 deg
                castShadow
                receiveShadow
            />

            {/* Solar Panels (Awning) */}
            <group
                position={[
                    shiftX,
                    shiftY + 0.35, // Matches the "Raised by 5cm" + "0.30" logic?
                    -length / 2
                ]}
                rotation={[0, 0, -angleRad]}
            >
                <SolarPanels surfaceWidth={slopeLength} surfaceLength={length + 1.0} />
            </group>

            {/* STRUCTURE FRAMES */}
            {frames}

            {/* Longitudinal Beam (Sablière) at Tip - Reduced 20%, Adjusted Height */}
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

            {/* PURLINS */}
            {purlins}
        </group>
    );
}
