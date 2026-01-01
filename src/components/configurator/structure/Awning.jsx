import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile, createZProfile } from '../utils/profiles.js';

/**
 * Awning (Auvent) Component
 * - 9.3m Width
 * - Starts at Building Eave (5.5m)
 * - Ends at 3.87m
 * - 10 degree pitch (same as building)
 * - Covered by Bac Acier (Steel Deck)
 * - Supports (Columns) at the 3.87m end
 */
export function Awning({ length, eaveHeight, roofPitch, buildingWidth, bayCount, baySpacing }) {

    // --- DIMENSIONS ---
    const awningWidth = 9.3;
    const startHeight = eaveHeight; // 5.5m
    const endHeight = 3.87;
    const angleRad = (roofPitch * Math.PI) / 180;

    // Position: Attached to the RIGHT side of the building (X = buildingWidth/2)
    const startX = buildingWidth / 2;

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
    const shiftLength = slopeLength;
    const shiftX = shiftLength * Math.cos(angleRad);
    const shiftY = -shiftLength * Math.sin(angleRad);

    // --- PURLINS (PANNES) ---
    // Config Z140
    const purlinHeight = 0.140;
    const purlinWidth = 0.060;
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
        <group position={[startX, startHeight, 0]}>
            {/* ROOF SHEETS */}
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                // Updated Position:
                // 1. Shifted 50% (shiftX, shiftY)
                // 2. Raised by 30cm (+0.3 in Y)
                // 3. Base offset 0.2 (thickness/rafter clear)
                // Total Y offset = shiftY + 0.2 + 0.3 = shiftY + 0.5
                position={[
                    shiftX,
                    shiftY + 0.5,
                    -length - 0.5
                ]}
                rotation={[0, 0, -angleRad]} // Rotate down 10 deg
                castShadow
                receiveShadow
            />

            {/* STRUCTURE FRAMES */}
            {frames}

            {/* PURLINS */}
            {purlins}
        </group>
    );
}
