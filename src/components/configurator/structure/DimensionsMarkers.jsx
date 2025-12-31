import React from 'react';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Renders dimension lines and surface area text.
 * - Width arrow (Ground, Front)
 * - Length arrow (Ground, Side)
 * - Height arrow (Vertical, Eave)
 * - Surface Area (Roof, Top)
 */
export function DimensionsMarkers({ width, length, eaveHeight, ridgeHeight, roofPitch, hasAwning, showDimensions }) {
    if (!showDimensions) return null;

    const textColor = "#000000";
    const lineColor = "#000000";
    const lineWidth = 2;

    // --- GEOMETRY HELPERS ---

    // Gap for text
    const gapSize = 3.0;

    // 1. Width Arrow (Building)
    const zFront = 2.0;
    const widthStart = new THREE.Vector3(-width / 2, 0.1, zFront);
    const widthEnd = new THREE.Vector3(width / 2, 0.1, zFront);
    const widthMid = new THREE.Vector3(0, 0.1, zFront);

    // 2. Length Arrow (Right Side requested)
    // Awning is on Right. Length lines must be OUTSIDE the awning.
    // Offset = Width/2 + (Awning ? 9.3 : 0) + 3.0
    const xSide = width / 2 + (hasAwning ? 9.3 : 0) + 3.0;
    const lengthStart = new THREE.Vector3(xSide, 0.1, 0);
    const lengthEnd = new THREE.Vector3(xSide, 0.1, -length);
    const lengthMid = new THREE.Vector3(xSide, 0.1, -length / 2);

    // 3. Main Eave Height (Move to Left Side to avoid Awning overlap)
    // Left side is at -width/2. Offset by -2.0.
    const xEave = -width / 2 - 2.0;
    const heightStart = new THREE.Vector3(xEave, 0, 0);
    const heightEnd = new THREE.Vector3(xEave, eaveHeight, 0);
    const heightMid = new THREE.Vector3(xEave, eaveHeight / 2, 0);

    // 4. Awning Dimensions (If enabled)
    const awningWidth = 9.3;
    const awningEaveHeight = 3.9;

    // Awning Width (Front, continues from Building Width on Right)
    const awningWidthStart = new THREE.Vector3(width / 2, 0.1, zFront);
    const awningWidthEnd = new THREE.Vector3(width / 2 + awningWidth, 0.1, zFront);
    const awningWidthMid = new THREE.Vector3(width / 2 + awningWidth / 2, 0.1, zFront);

    // Awning Height (Far Right, matches Length line)
    // We can place it near the Length line or the Awning Eave.
    // Let's place it at Awning Edge + 2.0.
    const xAwningRight = width / 2 + awningWidth + 2.0;
    const awningHeightStart = new THREE.Vector3(xAwningRight, 0, 0);
    const awningHeightEnd = new THREE.Vector3(xAwningRight, awningEaveHeight, 0);
    const awningHeightMid = new THREE.Vector3(xAwningRight, awningEaveHeight / 2, 0);

    // 5. Surface Area
    // Logic: (Building Width + Awning Width + Auvent Width) * Length
    const totalWidth = width + (hasAwning ? awningWidth : 0) + (hasAuvent ? 4.0 : 0);
    const surfaceArea = (totalWidth * length).toFixed(0);
    const angleRad = (roofPitch * Math.PI) / 180;

    return (
        <group>
            {/* ... other markers ... */}

            {/* --- SURFACE AREA --- */}
            <Text
                // Positioned on RIGHT Roof (+width/4)
                position={[width / 4, ridgeHeight + 0.3, -length / 2]}
                // Rotation Logic:
                // User requested "Remet la pente... à 0°".
                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                fontSize={3}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.2}
                outlineColor="#000000"
            >
                {`${surfaceArea} m²`}
            </Text>
        </group>
    );
}
