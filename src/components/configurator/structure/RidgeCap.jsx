import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Ridge Cap (Faîtage Bac Lisse)
 * Smooth metal sheet covering the ridge apex.
 * 1m total width (0.5m on each side).
 * Runs full length of building + Overhangs.
 */
export function RidgeCap({ width, length, roofPitch, eaveHeight }) {
    // Material: Matching Roof Grey but possibly smoother
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016
        metalness: 0.3,
        roughness: 0.3, // Smoother than corruptated roof
        side: THREE.DoubleSide
    }), []);

    const angleRad = (roofPitch * Math.PI) / 180;
    const halfWidth = width / 2;

    // Ridge Height (Apex) relative to ground
    const ridgeHeight = eaveHeight + (halfWidth * Math.tan(angleRad));

    // Cap Dimensions
    const capWidthPerSide = 0.5; // 1m total -> 0.5m per side
    // It should lay flat on the slope.
    // So we create a V-shape profile.

    // Shape:
    // Center at (0,0).
    // Left Point: x = -0.5 * cos(angle), y = -0.5 * sin(angle)
    // Right Point: x = 0.5 * cos(angle), y = -0.5 * sin(angle)
    // Actually, simple plane geometry rotated is easier.

    // Let's use ExtrudeGeometry for thickness or just Plane for visual?
    // User asked for "Bac Lisse" (Flat Sheet). A thin extrusion is best for realism.
    const thickness = 0.002;

    const shape = useMemo(() => {
        const s = new THREE.Shape();
        // V-Shape Profile (Cross-section looking from front)
        // Center top is (0,0) (Local).
        // Left Arm goes down-left. Right Arm goes down-right.

        // Coordinates relative to Apex.
        const dx = capWidthPerSide * Math.cos(angleRad);
        const dy = capWidthPerSide * Math.sin(angleRad);

        // Outer Surface
        s.moveTo(0, 0); // Apex
        s.lineTo(-dx, -dy); // Left Tip
        // Inner Surface (Thickness)
        // Simple approximation: go down by thickness
        s.lineTo(-dx, -dy - thickness);
        s.lineTo(0, -thickness);
        s.lineTo(dx, -dy - thickness);
        s.lineTo(dx, -dy); // Right Tip
        s.lineTo(0, 0); // Close loop

        return s;
    }, [angleRad, capWidthPerSide, thickness]);

    // Extrusion Depth = Full Length (Length + 1.0m overhangs)
    const extrusionDepth = length + 1.0;

    const geometry = useMemo(() => new THREE.ExtrudeGeometry(shape, {
        depth: extrusionDepth,
        bevelEnabled: false
    }), [shape, extrusionDepth]);

    return (
        <mesh
            geometry={geometry}
            material={material}
            // Position: At Apex.
            // Z Position: Start at Back Overhang (-length - 0.5)
            // Y Position: Ridge Height + Offset (sit on top of roof sheets)
            // Roof sheets are raised significantly (+35cm extra).
            // RidgeCap must be above that.
            // Let's set it at +0.50m absolute above the theoretical ridge height.
            position={[
                0,
                ridgeHeight + 0.50,
                -length - 0.5
            ]}
            castShadow
            receiveShadow
        />
    );
}
