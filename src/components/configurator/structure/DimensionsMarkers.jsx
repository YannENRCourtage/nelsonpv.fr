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

    // 2. Length Arrow (Left Side)
    const xSide = -width / 2 - 3.0;
    const lengthStart = new THREE.Vector3(xSide, 0.1, 0);
    const lengthEnd = new THREE.Vector3(xSide, 0.1, -length);
    const lengthMid = new THREE.Vector3(xSide, 0.1, -length / 2);

    // 3. Main Eave Height (Right Side used formerly, maybe conflict with Awning)
    // If hasAwning, move Building Eave Height to LEFT side (-width/2 - 5.0)? 
    // Or keep it. Let's keep it but if Awning exists, it might be hidden. 
    // Let's move it to LEFT side if Awning is present? 
    // User request: "Ajoute l'indication de la hauteur en bas du auvent (3.9m) de la même façon que la hauteur de la sablière du bâtiment." 
    // Does not implicitly ask to move. But logic dictates clarity.
    // Let's keep Building Eave on Right (width/2 + 2.0) if NO awning. 
    // If Awning, move Building Eave to Left (-width/2 - 5.0) or inside? 
    // Let's try placing Building Eave on LEFT if Awning is present, to avoid clutter.
    const xEave = hasAwning ? (-width / 2 - 5.0) : (width / 2 + 2.0);
    const heightStart = new THREE.Vector3(xEave, 0, 0);
    const heightEnd = new THREE.Vector3(xEave, eaveHeight, 0);
    const heightMid = new THREE.Vector3(xEave, eaveHeight / 2, 0);

    // 4. Awning Dimensions (If enabled)
    const awningWidth = 9.3;
    const awningEaveHeight = 3.9;

    // Awning Width (Front, continues from Building Width)
    const awningWidthStart = new THREE.Vector3(width / 2, 0.1, zFront);
    const awningWidthEnd = new THREE.Vector3(width / 2 + awningWidth, 0.1, zFront);
    const awningWidthMid = new THREE.Vector3(width / 2 + awningWidth / 2, 0.1, zFront);

    // Awning Height (Far Right)
    const xAwningRight = width / 2 + awningWidth + 2.0;
    const awningHeightStart = new THREE.Vector3(xAwningRight, 0, 0);
    const awningHeightEnd = new THREE.Vector3(xAwningRight, awningEaveHeight, 0);
    const awningHeightMid = new THREE.Vector3(xAwningRight, awningEaveHeight / 2, 0);

    // 5. Surface Area
    // Logic: (Building Width + Awning Width if any) * Length
    const totalWidth = hasAwning ? (width + awningWidth) : width;
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

            {/* --- LENGTH (CENTERED) --- */}
            <group>
                <Line points={[lengthStart, new THREE.Vector3(lengthMid.x, lengthMid.y, lengthMid.z + gapSize / 2)]} color={lineColor} lineWidth={lineWidth} />
                <Line points={[new THREE.Vector3(lengthMid.x, lengthMid.y, lengthMid.z - gapSize / 2), lengthEnd]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={lengthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={lengthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text
                    position={[xSide, 0.2, -length / 2]}
                    rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
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

            {/* --- BUILDING EAVE HEIGHT --- */}
            <group>
                <Line points={[heightStart, new THREE.Vector3(heightMid.x, heightMid.y - gapSize / 2, heightMid.z)]} color={lineColor} lineWidth={lineWidth} />
                <Line points={[new THREE.Vector3(heightMid.x, heightMid.y + gapSize / 2, heightMid.z), heightEnd]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={heightStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={heightEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text
                    position={[xEave + 0.5, eaveHeight / 2, 0]}
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
                        <Line points={[new THREE.Vector3(awningHeightMid.x, awningHeightMid.y + gapSize / 2, awningHeightMid.z), awningHeightEnd]} color={lineColor} lineWidth={lineWidth} />
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
                // Raised by +0.30m (user request total +80cm from original, here +0.30 relative to last state)
                position={[-width / 4, ridgeHeight + 0.3, -length / 2]}
                rotation={[-Math.PI / 2, angleRad, -Math.PI / 2]}
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
