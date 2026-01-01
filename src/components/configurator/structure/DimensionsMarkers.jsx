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
    // Vertical line from Ground to Ridge Height at X=0, Z=Front
    // Place it slightly offset in Z to avoid cladding (Z=0.1) -> Z=2.0 (same as width line)
    // Or maybe offset in X slightly so it doesn't overlap with a center column if any?
    // Let's create a new vertical line at X = -2.0 (Inside left width?) No, "Hauteur Faîtage" is central.
    // But Width marker goes across. Vert marker might clash.
    // Let's put it at X = 2.0 ? Or X = 0.
    // If I put it at X=0, it crosses the Width line.
    // Width line is at Y=0.1. Ridge line goes up.
    // Let's put it on the Front Right corner? No that's Eave.
    // Ridge is center. Let's put it at X=0, Z=zFront + 1.5? Or just Z=zFront and let them intersect.
    const xRidge = 0;
    const zRidge = zFront;
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

            {/* --- BUILDING EAVE HEIGHT (LEFT SIDE) --- */}
            <group>
                <Line points={[heightStart, new THREE.Vector3(heightMid.x, heightMid.y - gapSize / 2, heightMid.z)]} color={lineColor} lineWidth={lineWidth} />
                <Line points={[new THREE.Vector3(heightMid.x, heightMid.y + gapSize / 2, heightMid.z), heightEnd]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={heightStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={heightEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text
                    position={[xEave - 0.5, eaveHeight / 2, 0]} // Offset -0.5 to be outside line
                    rotation={[0, 0, Math.PI / 2]}
                    fontSize={0.8}
                    color={textColor}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.1}
                    outlineColor="#ffffff"
                >
                    {`${eaveHeight} m`}
                </Text>
            </group>

            {/* --- RIDGE HEIGHT (CENTER FRONT) --- */}
            <group>
                {/* Vertical Line */}
                <Line points={[ridgeStart, new THREE.Vector3(ridgeMid.x, ridgeMid.y - gapSize / 2, ridgeMid.z)]} color={lineColor} lineWidth={lineWidth} />
                <Line points={[new THREE.Vector3(ridgeMid.x, ridgeMid.y + gapSize / 2, ridgeMid.z), ridgeEnd]} color={lineColor} lineWidth={lineWidth} />

                {/* Endpoints */}
                <mesh position={ridgeStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={ridgeEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>

                {/* Label */}
                <Text
                    position={[xRidge + 0.5, ridgeHeight / 2, zRidge]} // Offset X+0.5 to sit beside vertical line
                    rotation={[0, 0, Math.PI / 2]} // Vertical Text
                    fontSize={0.8}
                    color={textColor}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.1}
                    outlineColor="#ffffff"
                >
                    {`${ridgeHeight} m`}
                </Text>
            </group>

            {/* --- AWNING MARKERS (If Enabled) --- */}
            {hasAwning && (
                <>
                    {/* Awning Width */}
                    <group>
                        <Line points={[awningWidthStart, new THREE.Vector3(awningWidthMid.x - gapSize / 2, awningWidthMid.y, awningWidthMid.z)]} color={lineColor} lineWidth={lineWidth} />
                        <Line points={[new THREE.Vector3(awningWidthMid.x + gapSize / 2, awningWidthMid.y, awningWidthMid.z), awningWidthEnd]} color={lineColor} lineWidth={lineWidth} />
                        <mesh position={awningWidthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <mesh position={awningWidthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <Text
                            position={[width / 2 + awningWidth / 2, 0.2, zFront + 0.5]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            fontSize={0.8}
                            color={textColor}
                            anchorX="center"
                            anchorY="bottom"
                            outlineWidth={0.1}
                            outlineColor="#ffffff"
                        >
                            {`${awningWidth} m`}
                        </Text>
                    </group>

                    {/* Awning Eave Height */}
                    <group>
                        <Line points={[awningHeightStart, new THREE.Vector3(awningHeightMid.x, awningHeightMid.y - gapSize / 2, awningHeightMid.z)]} color={lineColor} lineWidth={lineWidth} />
                        <Line points={[new THREE.Vector3(new THREE.Vector3(awningHeightMid.x, awningHeightMid.y + gapSize / 2, awningHeightMid.z)), awningHeightEnd]} color={lineColor} lineWidth={lineWidth} />
                        <mesh position={awningHeightStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <mesh position={awningHeightEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <Text
                            position={[xAwningRight + 0.5, awningEaveHeight / 2, 0]}
                            rotation={[0, 0, Math.PI / 2]}
                            fontSize={0.8}
                            color={textColor}
                            anchorX="center"
                            anchorY="bottom"
                            outlineWidth={0.1}
                            outlineColor="#ffffff"
                        >
                            {`${awningEaveHeight} m`}
                        </Text>
                    </group>
                </>
            )}

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
