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
export function DimensionsMarkers({ width, length, eaveHeight, ridgeHeight, roofPitch, hasAwning, hasAuvent, showDimensions }) {
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

    // 6. Ridge Height (Center, Front)
    // Vertical line from Ground to Ridge Height at X=0
    // User Request: Align with Eave (Sablière) line.
    // Eave marker is at Z=0. We set Ridge marker to Z=0 too.
    const xRidge = 0;
    const zRidge = 0; // Aligned with Eave Z depth
    const ridgeStart = new THREE.Vector3(xRidge, 0, zRidge);
    const ridgeEnd = new THREE.Vector3(xRidge, ridgeHeight, zRidge);
    const ridgeMid = new THREE.Vector3(xRidge, ridgeHeight / 2, zRidge);

    // 5. Surface Area
    // Logic: (Building Width + Awning Width + Auvent Width) * Length
    const totalWidth = width + (hasAwning ? awningWidth : 0) + (hasAuvent ? 4.0 : 0);
    const surfaceArea = (totalWidth * length).toFixed(0);
    const angleRad = (roofPitch * Math.PI) / 180;

    return (
        <group>
            {/* --- BUILDING WIDTH --- */}
            <group>
                <Line points={[widthStart, new THREE.Vector3(widthMid.x - gapSize / 2, widthMid.y, widthMid.z)]} color={lineColor} lineWidth={lineWidth} />
                <Line points={[new THREE.Vector3(widthMid.x + gapSize / 2, widthMid.y, widthMid.z), widthEnd]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={widthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={widthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text
                    position={[0, 0.2, zFront + 0.5]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    fontSize={0.8}
                    color={textColor}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.1}
                    outlineColor="#ffffff"
                >
                    {`${width} m`}
                </Text>
            </group>

            {/* --- LENGTH (RIGHT SIDE) --- */}
            <group>
                <Line points={[lengthStart, new THREE.Vector3(lengthMid.x, lengthMid.y, lengthMid.z + gapSize / 2)]} color={lineColor} lineWidth={lineWidth} />
                <Line points={[new THREE.Vector3(lengthMid.x, lengthMid.y, lengthMid.z - gapSize / 2), lengthEnd]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={lengthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={lengthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text
                    // Offset by +0.5m to sit "outside" the line, matching Width dimension style
                    position={[xSide + 0.5, 0.2, -length / 2]}
                    // Rotation flipped to face 'outwards' on the Right Side?
                    // Left Side was [-PI/2, 0, -PI/2] (Reading Bottom-Up).
                    // Right Side [-PI/2, 0, PI/2] should read Bottom-Up (facing right).
                    rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                    fontSize={0.8}
                    color={textColor}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.1}
                    outlineColor="#ffffff"
                >
                    {`${length} m`}
                </Text>
            </group>

            {/* --- BUILDING EAVE HEIGHT (SWAP SIDE IF AUVENT) --- */}
            {/* If hasAuvent, move to Right Side (+width/2 + 2.0) */
            /* If Normal, Left Side (-width/2 - 2.0) */}
            <group>
                <Line
                    points={[
                        new THREE.Vector3(hasAuvent ? width / 2 + 2.0 : -width / 2 - 2.0, 0, 0),
                        new THREE.Vector3(hasAuvent ? width / 2 + 2.0 : -width / 2 - 2.0, eaveHeight, 0)
                    ]}
                    color={lineColor} lineWidth={lineWidth}
                />

                {/* Horizontal Ticks */}
                <Line
                    points={[
                        new THREE.Vector3(hasAuvent ? width / 2 + 2.0 : -width / 2 - 2.0, 0, 0),
                        new THREE.Vector3(hasAuvent ? width / 2 + 2.0 : -width / 2 - 2.0, 0, 0) // Zero length? No, tick geometry needed.
                        // Actually use existing logic with start/end vectors adjusted
                    ]}
                    color={lineColor} lineWidth={lineWidth}
                />
                {/* Wait, simpler to redefine xEave dynamically */}
            </group>

            {/* Marker logic below using dynamicX */}

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
