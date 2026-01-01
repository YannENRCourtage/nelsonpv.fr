import React, { useMemo } from 'react';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Renders dimension lines and surface area text.
 * Optimized with useMemo to prevent re-render loops from new object creation.
 */
export function DimensionsMarkers({ width, length, eaveHeight, ridgeHeight, roofPitch, hasAwning, hasAuvent, showDimensions }) {
    if (!showDimensions) return null;

    const textColor = "#000000";
    const lineColor = "#000000";
    const lineWidth = 2;
    const gapSize = 3.0;

    // --- MEMOIZED GEOMETRY HELPERS ---

    // 1. Width Arrow
    const { widthPoints, widthStart, widthEnd } = useMemo(() => {
        const zFront = 2.0;
        const start = new THREE.Vector3(-width / 2, 0.1, zFront);
        const end = new THREE.Vector3(width / 2, 0.1, zFront);
        const mid = new THREE.Vector3(0, 0.1, zFront);
        return {
            widthStart: start,
            widthEnd: end,
            widthPoints: [
                [start, new THREE.Vector3(mid.x - gapSize / 2, mid.y, mid.z)],
                [new THREE.Vector3(mid.x + gapSize / 2, mid.y, mid.z), end]
            ]
        };
    }, [width, gapSize]);

    // 2. Length Arrow (Right Side)
    const { lengthPoints, lengthStart, lengthEnd, xSide } = useMemo(() => {
        const x = width / 2 + (hasAwning ? 9.3 : 0) + 3.0;
        const start = new THREE.Vector3(x, 0.1, 0);
        const end = new THREE.Vector3(x, 0.1, -length);
        const mid = new THREE.Vector3(x, 0.1, -length / 2);
        return {
            xSide: x,
            lengthStart: start,
            lengthEnd: end,
            lengthPoints: [
                [start, new THREE.Vector3(mid.x, mid.y, mid.z + gapSize / 2)],
                [new THREE.Vector3(mid.x, mid.y, mid.z - gapSize / 2), end]
            ]
        };
    }, [width, length, hasAwning, gapSize]);

    // 3. Eave Height (Dynamic Side)
    const { heightPoints, heightStart, heightEnd, xEave } = useMemo(() => {
        const x = hasAuvent ? (width / 2 + 2.0) : (-width / 2 - 2.0);
        const start = new THREE.Vector3(x, 0, 0);
        const end = new THREE.Vector3(x, eaveHeight, 0);
        const mid = new THREE.Vector3(x, eaveHeight / 2, 0);
        return {
            xEave: x,
            heightStart: start,
            heightEnd: end,
            heightPoints: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [width, eaveHeight, hasAuvent, gapSize]);

    // 4. Awning Dimensions (Right)
    const awningData = useMemo(() => {
        if (!hasAwning) return null;
        const awWidth = 9.3;
        const awHeight = 3.9;
        const zFront = 2.0;

        // Width
        const wStart = new THREE.Vector3(width / 2, 0.1, zFront);
        const wEnd = new THREE.Vector3(width / 2 + awWidth, 0.1, zFront);
        const wMid = new THREE.Vector3(width / 2 + awWidth / 2, 0.1, zFront);

        // Height
        const xH = width / 2 + awWidth + 2.0;
        const hStart = new THREE.Vector3(xH, 0, 0);
        const hEnd = new THREE.Vector3(xH, awHeight, 0);
        const hMid = new THREE.Vector3(xH, awHeight / 2, 0);

        return {
            awWidth, awHeight, xH,
            wStart, wEnd,
            hStart, hEnd,
            widthPoints: [
                [wStart, new THREE.Vector3(wMid.x - gapSize / 2, wMid.y, wMid.z)],
                [new THREE.Vector3(wMid.x + gapSize / 2, wMid.y, wMid.z), wEnd]
            ],
            heightPoints: [
                [hStart, new THREE.Vector3(hMid.x, hMid.y - gapSize / 2, hMid.z)],
                [new THREE.Vector3(hMid.x, hMid.y + gapSize / 2, hMid.z), hEnd]
            ]
        };
    }, [hasAwning, width, gapSize]);

    // 5. Auvent Dimensions (Left)
    const auventData = useMemo(() => {
        if (!hasAuvent) return null;
        const avWidth = 4.0;
        const avHeight = 4.8;

        const xLeft = -width / 2 - avWidth - 2.0;
        const start = new THREE.Vector3(xLeft, 0, 0);
        const end = new THREE.Vector3(xLeft, avHeight, 0);
        const mid = new THREE.Vector3(xLeft, avHeight / 2, 0);

        return {
            avHeight, xLeft,
            start, end,
            points: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [hasAuvent, width, gapSize]);

    // 6. Ridge Height
    const { ridgePoints, ridgeStart, ridgeEnd, xRidge, zRidge } = useMemo(() => {
        const x = 0;
        const z = 0;
        const start = new THREE.Vector3(x, 0, z);
        const end = new THREE.Vector3(x, ridgeHeight, z);
        const mid = new THREE.Vector3(x, ridgeHeight / 2, z);
        return {
            xRidge: x, zRidge: z,
            ridgeStart: start, ridgeEnd: end,
            ridgePoints: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [ridgeHeight, gapSize]);

    // 7. Surface Area
    const surfaceArea = useMemo(() => {
        const totalWidth = width + (hasAwning ? 9.3 : 0) + (hasAuvent ? 4.0 : 0);
        return (totalWidth * length).toFixed(0);
    }, [width, length, hasAwning, hasAuvent]);

    return (
        <group>
            {/* 1. BUILDING WIDTH */}
            <group>
                <Line points={widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                <Line points={widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={widthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={widthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text position={[0, 0.2, 2.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                    {`${width} m`}
                </Text>
            </group>

            {/* 2. LENGTH */}
            <group>
                <Line points={lengthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                <Line points={lengthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={lengthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={lengthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text position={[xSide + 0.5, 0.2, -length / 2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                    {`${length} m`}
                </Text>
            </group>

            {/* 3. EAVE HEIGHT (Left) */}
            <group>
                <Line points={heightPoints[0]} color={lineColor} lineWidth={lineWidth} />
                <Line points={heightPoints[1]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={heightStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={heightEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text
                    position={[xEave - 0.5, eaveHeight / 2, 0]}
                    rotation={[0, 0, 0]} // Horizontal text
                    fontSize={0.8}
                    color={textColor}
                    anchorX="right"
                    anchorY="middle"
                    outlineWidth={0.1}
                    outlineColor="#ffffff"
                >
                    {`${eaveHeight} m`}
                </Text>
            </group>

            {/* 4. RIDGE HEIGHT */}
            <group>
                <Line points={ridgePoints[0]} color={lineColor} lineWidth={lineWidth} />
                <Line points={ridgePoints[1]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={ridgeStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={ridgeEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text position={[xRidge + 0.5, ridgeHeight / 2, zRidge]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                    {`${Number(ridgeHeight).toFixed(1)} m`}
                </Text>
            </group>

            {/* 5. AWNING (If Enabled) */}
            {hasAwning && awningData && (
                <>
                    <group>
                        <Line points={awningData.widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                        <Line points={awningData.widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                        <mesh position={awningData.wStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <mesh position={awningData.wEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <Text position={[width / 2 + awningData.awWidth / 2, 0.2, 2.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                            {`${awningData.awWidth} m`}
                        </Text>
                    </group>
                    <group>
                        <Line points={awningData.heightPoints[0]} color={lineColor} lineWidth={lineWidth} />
                        <Line points={awningData.heightPoints[1]} color={lineColor} lineWidth={lineWidth} />
                        <mesh position={awningData.hStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <mesh position={awningData.hEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <Text position={[awningData.xH + 0.5, awningData.awHeight / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                            {`${awningData.awHeight} m`}
                        </Text>
                    </group>
                </>
            )}

            {/* 6. AUVENT (If Enabled) */}
            {hasAuvent && auventData && (
                <group>
                    <Line points={auventData.points[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={auventData.points[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={auventData.start}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={auventData.end}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[auventData.xLeft - 0.5, auventData.avHeight / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${auventData.avHeight} m`}
                    </Text>
                </group>
            )}

            {/* SURFACE AREA */}
            <Text
                position={[
                    width / 4,
                    ridgeHeight - (width / 4) * Math.tan((roofPitch * Math.PI) / 180) + 1.0, // Raised by 0.5 (was 0.5, now 1.0?) 
                    // Wait, previous was +0.5. "Réhausse la de 50cm". +0.5 + 0.5 = 1.0?
                    // Previous snippet showed `+ 0.5`.
                    // User says "Réhausse la de 50cm".
                    // I'll make it +1.0 relative to roof surface?
                    // Or relative to the previous 0.3?
                    // I will set it to +1.0.
                    -length / 2,
                ]}
                rotation={[-Math.PI / 2, 0, Math.PI]} // 180° Rotation
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
