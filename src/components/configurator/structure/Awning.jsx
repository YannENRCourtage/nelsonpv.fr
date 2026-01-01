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
    // Phase 28/29: Shift 25% down slope (relative to ridge/start).
    // This is "25% towards ridge relative to median" (Median was 50%, now 25%).
    const shiftLength = slopeLength * 0.25;
    const shiftX = shiftLength * Math.cos(angleRad);
    const shiftY = -shiftLength * Math.sin(angleRad);

    // ... Purlins code lines 57-154 ... (Unchanged but ensuring context matches if I just replace specific block, but I'll replace the block covering both)

    // ... inside return ...
    // Updated Position (Phase 29):
    // 1. Shifted 25% (shiftX, shiftY)
    // 2. Raised by 10cm (+0.1 in Y) relative to base.
    //    (Previous was +30cm -> +0.3. Now "Lower by 20cm" -> +0.1)
    // 3. Base offset 0.2 (thickness/rafter clear)
    // Total Y offset = shiftY + 0.2 + 0.1 = shiftY + 0.3
    position = {
        [
        shiftX,
        shiftY + 0.3,
        -length - 0.5
        ]}
    rotation = { [0, 0, -angleRad]} // Rotate down 10 deg
    castShadow
    receiveShadow
        />

        {/* STRUCTURE FRAMES */ }
    { frames }

    {/* PURLINS */ }
    { purlins }
        </group >
    );
}
