import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * X-Bracing (Croix de St Andre) for Walls and Roof
 * Applied every 4th bay (Bay 0, 4, 8...)
 */
export function Bracing({ width, length, bayCount, baySpacing, eaveHeight, roofPitch }) {
    const bracingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#a0a0a0',
        metalness: 0.6,
        roughness: 0.4
    }), []);

    const rodRadius = 0.015; // 30mm rods
    const angleRad = (roofPitch * Math.PI) / 180;
    const halfWidth = width / 2;
    const rafterLength = halfWidth / Math.cos(angleRad);

    const bracings = [];

    // Loop through bays and add bracing every 4 bays
    for (let i = 0; i < bayCount; i += 4) {
        // Z start and end of this bay
        const zStart = -i * baySpacing;
        const zEnd = -(i + 1) * baySpacing;

        // --- Wall Bracing (Long pans) ---
        // Cross between Column i and Column i+1
        // Height: From near ground (0.5m) to near eave (eaveHeight - 0.5m)
        const yBot = 0.5;
        const yTop = eaveHeight - 0.5;

        // Coordinates for Left Wall (-width/2)
        const p1 = new THREE.Vector3(-width / 2, yBot, zStart);
        const p2 = new THREE.Vector3(-width / 2, yTop, zEnd);
        const p3 = new THREE.Vector3(-width / 2, yTop, zStart);
        const p4 = new THREE.Vector3(-width / 2, yBot, zEnd);

        // Coordinates for Right Wall (width/2)
        const p5 = new THREE.Vector3(width / 2, yBot, zStart);
        const p6 = new THREE.Vector3(width / 2, yTop, zEnd);
        const p7 = new THREE.Vector3(width / 2, yTop, zStart);
        const p8 = new THREE.Vector3(width / 2, yBot, zEnd);

        // Helper to create a rod mesh between two points
        const createRod = (start, end, key) => {
            const distance = start.distanceTo(end);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            // Cylinder alignment geometry is tricky (default Y axis).
            // easier to use lookAt logic or Quaternion.
            // Using a simple component helper inside the loop or just computing rotation.
            // Vector from start to end
            // ... Detailed rotation math omitted for brevity, using simple Line curves or thin extrusion?
            // Let's use simple Box geometry stretched.
            return (
                <BraceRod key={key} start={start} end={end} material={bracingMaterial} thickness={0.03} />
            );
        };

        bracings.push(createRod(p1, p2, `wall-L-${i}-1`));
        bracings.push(createRod(p3, p4, `wall-L-${i}-2`));
        bracings.push(createRod(p5, p6, `wall-R-${i}-1`));
        bracings.push(createRod(p7, p8, `wall-R-${i}-2`));

        // --- Roof Bracing (Versants) ---
        // Cross between Rafter i and Rafter i+1
        // We use the same 'createRod' helper.

        // Roof Plane Coordinates (approximate for visual bracing)
        // Ideally should be ON the rafter top flange or slightly below.
        // Let's go from Top-Flange level.

        // Left Roof: Starts at X=-width/2 (Eave), Y=eaveHeight. Ends at X=0 (Ridge), Y=ridgeHeight?? 
        // No, Ridge height is calculated: eaveHeight + (width/2 * tan(angle))
        const ridgeHeight = eaveHeight + (halfWidth * Math.tan(angleRad));

        // Points for Left Roof Bay
        // BL = Bottom-Left (Bay Start), TL = Top-Left (Bay Start)
        // BR = Bottom-Right (Bay End), TR = Top-Right (Bay End)
        // But "Top" here means upslope (Ridge), "Bottom" means downslope (Eave).

        // Left Side:
        // Eave Point (Start Z): -width/2, eaveHeight, zStart
        // Ridge Point (Start Z): -0.1, ridgeHeight, zStart  (Gap at ridge)
        // Eave Point (End Z): -width/2, eaveHeight, zEnd
        // Ridge Point (End Z): -0.1, ridgeHeight, zEnd

        const L_Eave_Start = new THREE.Vector3(-width / 2, eaveHeight, zStart);
        const L_Ridge_Start = new THREE.Vector3(-0.1, ridgeHeight, zStart);
        const L_Eave_End = new THREE.Vector3(-width / 2, eaveHeight, zEnd);
        const L_Ridge_End = new THREE.Vector3(-0.1, ridgeHeight, zEnd);

        bracings.push(createRod(L_Eave_Start, L_Ridge_End, `roof-L-${i}-1`));
        bracings.push(createRod(L_Ridge_Start, L_Eave_End, `roof-L-${i}-2`));

        // Right Side:
        // Eave Point (Start Z): width/2, eaveHeight, zStart
        // Ridge Point (Start Z): 0.1, ridgeHeight, zStart
        // ...

        const R_Eave_Start = new THREE.Vector3(width / 2, eaveHeight, zStart);
        const R_Ridge_Start = new THREE.Vector3(0.1, ridgeHeight, zStart);
        const R_Eave_End = new THREE.Vector3(width / 2, eaveHeight, zEnd);
        const R_Ridge_End = new THREE.Vector3(0.1, ridgeHeight, zEnd);

        bracings.push(createRod(R_Eave_Start, R_Ridge_End, `roof-R-${i}-1`));
        bracings.push(createRod(R_Ridge_Start, R_Eave_End, `roof-R-${i}-2`));

    }

    return <group>{bracings}</group>;
}

// Sub-component for individual rod
function BraceRod({ start, end, material, thickness }) {
    // Calculate length
    const length = start.distanceTo(end);

    // Midpoint position
    // const position = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // We want a mesh that starts at 0,0,0 (local) and goes to 0,0,length (local Z).
    // BoxGeometry defaults to being centered at 0,0,0.
    // So we translate the geometry by length/2 in Z?
    // Or just place the mesh at midpoint and rotate.

    const meshRef = React.useRef();

    React.useLayoutEffect(() => {
        if (meshRef.current) {
            meshRef.current.position.copy(start);
            meshRef.current.lookAt(end);
            // Now Z axis points to End.
            // Move mesh forward by length/2 along Z local axis to center it between start/end?
            meshRef.current.translateZ(length / 2);
        }
    }, [start, end, length]);

    return (
        <mesh ref={meshRef} material={material}>
            <boxGeometry args={[thickness, thickness, length]} />
        </mesh>
    );
}
