import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile } from '../utils/profiles.js';

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
    // The profile is created centered at (0,0) with width = slopeLength.
    // We want the "High Point" (Left Edge of profile) to be at local X=0, Y=0 (Phase 20).
    // Phase 22 Request: "Décale la couverture... de 50% vers le bas".
    // 50% means offset by half the slopeLength?
    // Start was at 0. 50% down means Start at slopeLength/2.
    // So visual Center will be at slopeLength.
    // Shift needed: (slopeLength / 2) [To align Start] + (slopeLength / 2) [50% Shift] = slopeLength.
    const shiftLength = slopeLength;
    const shiftX = shiftLength * Math.cos(angleRad);
    const shiftY = -shiftLength * Math.sin(angleRad);

    // --- STRUCTURE GENERATION (Bays Loop) ---
    const frames = [];
    const numFrames = bayCount + 1; // n bays = n+1 frames

    for (let i = 0; i < numFrames; i++) {
        const zPos = -i * baySpacing;

        // COLUMN (At the low end)
        frames.push(
            <mesh
                key={`col-${i}`}
                material={structureMaterial}
                position={[awningWidth, -startHeight + endHeight / 2, zPos]}
            >
                <boxGeometry args={[0.2, endHeight, 0.2]} />
            </mesh>
        );

        // RAFTER (Connecting wall to column)
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
    }

    return (
        <group position={[startX, startHeight, 0]}>
            {/* ROOF SHEETS */}
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                // Position:
                // Z Start: Front Overhang (+0.5).
                // But Extrude goes along +Z relative to shape? No, usually +Z.
                // If shape is in XY, Extrude adds Z depth.
                // We want coverage from Z=+0.5 to Z=-length-0.5.
                // Total depth = length + 1.
                // If we position at Z = -length - 0.5, and Extrude + depth -> Ends at +0.5. Correct.
                position={[
                    shiftX,
                    shiftY + 0.2, // Offset up for thickness/rafters and apply Y shift
                    -length - 0.5
                ]}
                rotation={[0, 0, -angleRad]} // Rotate down 10 deg
                castShadow
                receiveShadow
            />

            {/* STRUCTURE FRAMES */}
            {frames}
        </group>
    );
}
