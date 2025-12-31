import React, { useMemo } from 'react';
import * as THREE from 'three';

function createTrapezoidalProfile(width, height, thickness) {
    const shape = new THREE.Shape();
    // Simplified wave profile
    const steps = 10;
    const stepWidth = width / steps;

    shape.moveTo(0, 0);
    for (let i = 0; i < steps; i++) {
        const x = i * stepWidth;
        // Go Up
        shape.lineTo(x + stepWidth * 0.2, height);
        // Go Right
        shape.lineTo(x + stepWidth * 0.8, height);
        // Go Down
        shape.lineTo(x + stepWidth, 0);
    }
    // Close shape with thickness
    shape.lineTo(width, -thickness);
    shape.lineTo(0, -thickness);
    shape.lineTo(0, 0);

    return shape;
}

/**
 * Auvent Component
 * - 4m wide extension on the LEFT side of the building.
 * - Slope: 10 degrees.
 * - Height: Starts at 5.5m (attached), Ends at 4.8m.
 * - No vertical columns.
 * - Covered by Bac Acier.
 */
export function Auvent({ length, eaveHeight, roofPitch, buildingWidth }) {

    // --- DIMENSIONS ---
    const auventWidth = 4.0;
    const startHeight = 5.5; // Fixed attachment height
    // End height is derived or fixed? 
    // User said: "le haut du auvent fait une hauteur de 5.5m, la sablière du auvent est à une hauteur de 4.8m".
    // Let's verify slope.
    // Delta H = 5.5 - 4.8 = 0.7m.
    // Width = 4.0m.
    // Slope % = 0.7 / 4.0 = 17.5%.
    // 10 degrees -> tan(10) = 0.1763 -> 17.6%. Close enough.
    const angleRad = (roofPitch * Math.PI) / 180;

    // Position: Attached to the LEFT side of the building (X = -buildingWidth/2).
    // It extends outwards to the LEFT (Negative X).
    const startX = -buildingWidth / 2;

    // --- MATERIALS ---
    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016 (Same as main roof)
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    // --- ROOF GEOMETRY ---
    // Slope Length
    const slopeLength = auventWidth / Math.cos(angleRad) + 0.1; // Small overhang

    // Profile
    const profileShape = useMemo(() => createTrapezoidalProfile(slopeLength, 0.035, 0.25), [slopeLength]);

    const roofGeometry = useMemo(() => new THREE.ExtrudeGeometry(profileShape, {
        depth: length, // Same length as building (no overhang specified, usually flows with building)
        bevelEnabled: false
    }), [profileShape, length]);

    // GEOMETRY ORIENTATION
    // Standard Profile is Width=slopeLength. Extrusion=Depth.
    // We need to rotate it so ribs run parallel to slope? No, usually horizontal.
    // Same as Appentis logic: Profile Width along Slope (X/Y), Extrusion along Length (Z).

    // Centering Adjustment (Start @ 0)
    // Profile starts at (0,0).
    // We want Start (High Point) at Local (0,0).
    // Orientation:
    // Left Side extension. Slope DOWN to Left.
    // Appentis (Right) Slope DOWN to Right.
    // So Auvent is mirrored/rotated around Y?
    // Or just rotated Z?
    // If we rotate Z +10deg (Up to Right) -> No, that's Up to Right.
    // We want Start (Rightmost of Auvent) High, End (Leftmost) Low.
    // Slope Angle is +10 deg if going Left->Right Up.
    // So relative to horizontal, it tilts UP towards the building.

    // Let's place it at StartX (-Width/2).
    // Rotate Z = +angleRad.
    // Then the sheet goes from 0 to +X?
    // Profile is 0 to Width.
    // If we rotate +angle, it goes Up and Right.
    // We want it to go Left and Down? or Right and Up to meet building?
    // "Vient se coller au bas du bâtiment".
    // 5.5m is high. 4.8m is low.
    // Building Eave is at 5.5m? Yes.
    // So it attaches at Eave.
    // Extends Left.
    // So High Point is at X=0 (Local), Low Point at X=-4 (Local).
    // Our Profile goes 0 to Width (+).
    // So we need to Rotate Z? 
    // Or Rotate Y 180?
    // If rotated Y 180, +X becomes -X.
    // And Pitch?
    // Let's try: Position at StartX. Rotate Y=PI. Rotate Z=-angleRad (Down).

    const shiftLength = slopeLength;
    // If we rotate 180 Y, then Local X goes Left.
    // We need slope DOWN.
    // If RotY=180, then +X is Left. 
    // RotZ=-angleRad means Tip goes Down.
    // Correct.

    // Shift?
    // Profile starts at 0. With Y=180, 0 is at Attachment.
    // So simple.

    return (
        <group position={[startX, startHeight, 0]}>
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                // Position:
                // Z: Start at 0, go to -Length. (Dimensions match building Z: 0 to -Length)
                // Y: Offset 0.1 for thickness
                position={[0, 0.1, -length]}
                rotation={[0, Math.PI, -angleRad]} // Y flip to go Left, Z tilt down
                castShadow
                receiveShadow
            />
            {/* No Columns as requested */}
        </group>
    );
}
