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
export function DimensionsMarkers({ width, length, eaveHeight, ridgeHeight, roofPitch }) {
    const textColor = "#000000";
    const lineColor = "#000000";
    const lineWidth = 2;

    // --- GEOMETRY HELPERS ---

    // Width Arrow (Front, Ground)
    const zFront = 2.0;
    const widthStart = new THREE.Vector3(-width / 2, 0.1, zFront);
    const widthEnd = new THREE.Vector3(width / 2, 0.1, zFront);
    const widthMid = new THREE.Vector3(0, 0.1, zFront);
    const gapSize = 1.5; // Gap for text

    // Length Arrow (Left Side, Ground)
    const xSide = -width / 2 - 2.0;
    const lengthStart = new THREE.Vector3(xSide, 0.1, 0);
    const lengthEnd = new THREE.Vector3(xSide, 0.1, -length);
    const lengthMid = new THREE.Vector3(xSide, 0.1, -length / 2);

    // Height Arrow (Right Side, Eave)
    const xRight = width / 2 + 2.0;
    const heightStart = new THREE.Vector3(xRight, 0, 0);
    const heightEnd = new THREE.Vector3(xRight, eaveHeight, 0);
    const heightMid = new THREE.Vector3(xRight, eaveHeight / 2, 0);

    // Surface Area
    const surfaceArea = (width * length).toFixed(0);
    const angleRad = (roofPitch * Math.PI) / 180;

    return (
        <group>
            {/* Width Dimension */}
            <group>
                {/* Left segment */}
                <Line
                    points={[widthStart, new THREE.Vector3(widthMid.x - gapSize / 2, widthMid.y, widthMid.z)]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                {/* Right segment */}
                <Line
                    points={[new THREE.Vector3(widthMid.x + gapSize / 2, widthMid.y, widthMid.z), widthEnd]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                <mesh position={widthStart}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                <mesh position={widthEnd}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
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

            {/* Length Dimension */}
            <group>
                {/* Top segment */}
                <Line
                    points={[lengthStart, new THREE.Vector3(lengthMid.x, lengthMid.y, lengthMid.z + gapSize / 2)]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                {/* Bottom segment */}
                <Line
                    points={[new THREE.Vector3(lengthMid.x, lengthMid.y, lengthMid.z - gapSize / 2), lengthEnd]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                <mesh position={lengthStart}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                <mesh position={lengthEnd}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                <Text
                    position={[xSide - 1, 0.2, -length / 2]}
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

            {/* Height Dimension */}
            <group>
                {/* Bottom segment */}
                <Line
                    points={[heightStart, new THREE.Vector3(heightMid.x, heightMid.y - gapSize / 2, heightMid.z)]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                {/* Top segment */}
                <Line
                    points={[new THREE.Vector3(heightMid.x, heightMid.y + gapSize / 2, heightMid.z), heightEnd]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                <mesh position={heightEnd}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                <mesh position={heightStart}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                <Text
                    position={[xRight + 0.8, eaveHeight / 2, 0]}
                    rotation={[0, 0, 0]}
                    fontSize={0.6}
                    color={textColor}
                    anchorX="left"
                    anchorY="middle"
                    outlineWidth={0.1}
                    outlineColor="#ffffff"
                >
                    {`${eaveHeight} m`}
                </Text>
            </group>

            {/* Surface Area - On left roof slope, lengthwise */}
            <Text
                position={[-width / 4, ridgeHeight - 0.5, -length / 2]}
                rotation={[-Math.PI / 2 + angleRad, 0, 0]}
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
