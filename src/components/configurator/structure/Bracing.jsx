import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * X-Bracing (Croix de St Andre) for Walls and Roof
 * Applied every 4th bay (Bay 0, 4, 8...)
 */
export function Bracing({ width, length, bayCount, baySpacing, eaveHeight, roofPitch, ridgeHeight, buildingType = 'symetrique' }) {
    const bracingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#a0a0a0',
        metalness: 0.6,
        roughness: 0.4
    }), []);

    const isMonopente = buildingType === 'monopente';
    const angleRad = (roofPitch * Math.PI) / 180;
    // Recalculate sym ridge height if needed, OR use passed ridgeHeight if reliable.
    // For Sym, passed ridgeHeight might be null if I didn't verify Structure.jsx perfectly for Sym?
    // Structure.jsx passes `calculatedRidgeHeight` always. OK.
    const symRidgeHeight = eaveHeight + ((width / 2) * Math.tan(angleRad));
    // Use symRidgeHeight for Symmetrical logic to be safe, or ridgeHeight if correct.
    // Let's use `ridgeHeight` if Monopente, `symRidgeHeight` if Sym logic (center).

    const bracings = [];

    // Loop through bays and add bracing every 4 bays
    for (let i = 0; i < bayCount; i += 4) {
        // Z start and end of this bay
        const zStart = -i * baySpacing;
        const zEnd = -(i + 1) * baySpacing;

        // --- Wall Bracing (Long pans) ---
        // Cross between Column i and Column i+1
        const yBot = 0.5;
        const yTopLeft = eaveHeight - 0.5;
        const yTopRight = isMonopente ? ridgeHeight - 0.5 : eaveHeight - 0.5;

        // Coordinates for Left Wall (-width/2)
        const p1 = new THREE.Vector3(-width / 2, yBot, zStart);
        const p2 = new THREE.Vector3(-width / 2, yTopLeft, zEnd);
        const p3 = new THREE.Vector3(-width / 2, yTopLeft, zStart);
        const p4 = new THREE.Vector3(-width / 2, yBot, zEnd);

        // Coordinates for Right Wall (width/2)
        const p5 = new THREE.Vector3(width / 2, yBot, zStart);
        const p6 = new THREE.Vector3(width / 2, yTopRight, zEnd);
        const p7 = new THREE.Vector3(width / 2, yTopRight, zStart);
        const p8 = new THREE.Vector3(width / 2, yBot, zEnd);

        // Helper to create a rod mesh between two points
        const createRod = (start, end, key) => {
            return (
                <BraceRod key={key} start={start} end={end} material={bracingMaterial} thickness={0.03} />
            );
        };

        bracings.push(createRod(p1, p2, `wall-L-${i}-1`));
        bracings.push(createRod(p3, p4, `wall-L-${i}-2`));
        bracings.push(createRod(p5, p6, `wall-R-${i}-1`));
        bracings.push(createRod(p7, p8, `wall-R-${i}-2`));

        // --- Roof Bracing (Versants) ---
        if (isMonopente) {
            // Single Cross across full width
            // Left (Low) to Right (High)
            const L_Eave_Start = new THREE.Vector3(-width / 2, eaveHeight, zStart);
            const R_Ridge_End = new THREE.Vector3(width / 2, ridgeHeight, zEnd);

            const R_Ridge_Start = new THREE.Vector3(width / 2, ridgeHeight, zStart);
            const L_Eave_End = new THREE.Vector3(-width / 2, eaveHeight, zEnd);

            bracings.push(createRod(L_Eave_Start, R_Ridge_End, `roof-Mono-${i}-1`));
            bracings.push(createRod(R_Ridge_Start, L_Eave_End, `roof-Mono-${i}-2`));

        } else {
            // Symmetrical: Two Crosses (Left->Center, Right->Center)
            // Center Height = symRidgeHeight

            // Left Side:
            const L_Eave_Start = new THREE.Vector3(-width / 2, eaveHeight, zStart);
            const L_Ridge_Start = new THREE.Vector3(-0.1, symRidgeHeight, zStart);
            const L_Eave_End = new THREE.Vector3(-width / 2, eaveHeight, zEnd);
            const L_Ridge_End = new THREE.Vector3(-0.1, symRidgeHeight, zEnd);

            bracings.push(createRod(L_Eave_Start, L_Ridge_End, `roof-L-${i}-1`));
            bracings.push(createRod(L_Ridge_Start, L_Eave_End, `roof-L-${i}-2`));

            // Right Side:
            const R_Eave_Start = new THREE.Vector3(width / 2, eaveHeight, zStart);
            const R_Ridge_Start = new THREE.Vector3(0.1, symRidgeHeight, zStart);
            const R_Eave_End = new THREE.Vector3(width / 2, eaveHeight, zEnd);
            const R_Ridge_End = new THREE.Vector3(0.1, symRidgeHeight, zEnd);

            bracings.push(createRod(R_Eave_Start, R_Ridge_End, `roof-R-${i}-1`));
            bracings.push(createRod(R_Ridge_Start, R_Eave_End, `roof-R-${i}-2`));
        }
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
