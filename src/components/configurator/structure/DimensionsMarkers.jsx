import React, { useMemo } from 'react';
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
    // Offset slightly forward (Z > 0)
    const zFront = 2.0;
    const widthStart = new THREE.Vector3(-width / 2, 0.1, zFront);
    const widthEnd = new THREE.Vector3(width / 2, 0.1, zFront);

    // Length Arrow (Left Side, Ground)
    // Offset slightly left (X < -width/2)
    const xSide = -width / 2 - 2.0;
    const lengthStart = new THREE.Vector3(xSide, 0.1, 0); // Front align
    const lengthEnd = new THREE.Vector3(xSide, 0.1, -length); // Back align

    // Height Arrow (Right Side, Eave)
    // Offset slightly right (X > width/2)
    const xRight = width / 2 + 2.0;
    const heightStart = new THREE.Vector3(xRight, 0, 0);
    const heightEnd = new THREE.Vector3(xRight, eaveHeight, 0);

    // Surface Area
    // Positioned flat above the ridge
    const surfaceArea = (width * length).toFixed(0);

    const Arrow = ({ start, end, label, labelPos, labelRot = [0, 0, 0] }) => {
        return (
            <group>
                {/* Line */}
                <Line
                    points={[start, end]}
                    color={lineColor}
                    lineWidth={lineWidth}
                    segments
                />
                {/* Arrowheads (Cones) */}
                <mesh position={start} lookAt={end} rotation={[0, Math.PI, 0]}>
                    {/* Rotate 180 to point outward if looking At End? No.
                        Cone default points up Y. 
                        lookAt aligns Z to target.
                        We want cone tip at 'start' pointing away from 'end'? 
                        Or line is start->end.
                        Cone at Start should point towards Start (away from line center).
                        Cone at End should point towards End (away from line center).
                    */}
                    {/* Simplified: Small spheres or just lines for now to avoid rotation math complex for simple request */}
                    <coneGeometry args={[0.1, 0.3, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                {/* Actually, rotation math for arrowheads:
                    Cone points +Y.
                    We want it to point along the line direction.
                    At 'End', it should point along (End - Start).
                    At 'Start', it should point along (Start - End).
                 */}
                <ArrowHead position={end} target={start} reverse />
                <ArrowHead position={start} target={end} reverse />

                {/* Label */}
                <Text
                    position={labelPos}
                    rotation={labelRot}
                    fontSize={0.8}
                    color={textColor}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.05}
                    outlineColor="#ffffff"
                >
                    {label}
                </Text>
            </group>
        );
    };

    // Custom ArrowHead helper
    const ArrowHead = ({ position, target, reverse }) => {
        const ref = React.useRef();
        React.useLayoutEffect(() => {
            if (ref.current) {
                ref.current.lookAt(target);
                // Cone points +Y? No, usually +Y. lookAt aligns +Z.
                // We need to rotate X by -90?
                ref.current.rotateX(-Math.PI / 2);
            }
        }, [target]);

        return (
            <mesh ref={ref} position={position}>
                <coneGeometry args={[0.08, 0.25, 8]} />
                <meshBasicMaterial color={lineColor} />
            </mesh>
        )
    }

    return (
        <group>
            {/* Width Dimension */}
            <Arrow
                start={widthStart}
                end={widthEnd}
                label={`${width} m`}
                labelPos={[0, 0.2, zFront + 0.5]}
                labelRot={[-Math.PI / 2, 0, 0]} // Flat on ground reading from front
            />

            {/* Length Dimension */}
            <Arrow
                start={lengthStart}
                end={lengthEnd}
                label={`${length} m`}
                labelPos={[xSide - 1, 0.2, -length / 2]}
                labelRot={[-Math.PI / 2, 0, Math.PI / 2]} // Flat on ground, rotated 90
            />

            {/* Height Dimension */}
            {/* Draw a vertical line with arrowheads */}
            {/* Text upright facing camera? Or flat? Usually upright for height. */}
            <group>
                <Line
                    points={[heightStart, heightEnd]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
                {/* Arrowheads for Height */}
                <mesh position={heightEnd} rotation={[0, 0, 0]}>
                    <coneGeometry args={[0.08, 0.25, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
                <mesh position={heightStart} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.08, 0.25, 8]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>

                <Text
                    position={[xRight + 0.8, eaveHeight / 2, 0]}
                    rotation={[0, 0, 0]}
                    fontSize={0.6}
                    color={textColor}
                    anchorX="left"
                    anchorY="middle"
                    outlineWidth={0.05}
                    outlineColor="#ffffff"
                >
                    {`${eaveHeight} m`}
                </Text>
            </group>

            {/* Surface Area */}
            <Text
                position={[0, ridgeHeight + 0.8, -length / 2]}
                rotation={[-Math.PI / 2, 0, 0]} // Flat
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
