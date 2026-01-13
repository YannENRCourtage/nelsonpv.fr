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

    if (buildingType.startsWith('ombriere')) return null;

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
        // Monopente: Left is Ridge (High), Right is Eave (Low)
        const yTopLeft = isMonopente ? ridgeHeight - 0.5 : eaveHeight - 0.5;
        let yTopRight = eaveHeight - 0.5;
        if (buildingType === 'asymetrique_1') {
            yTopRight = 3.9;
        } else if (buildingType === 'asymetrique_2') {
            yTopRight -= 1.0; // Reduce by 1m as requested
        }

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
            // High Left (Ridge) to Low Right (Eave)

            // Cross 1: High Left Start -> Low Right End
            const L_Ridge_Start = new THREE.Vector3(-width / 2, ridgeHeight, zStart);
            const R_Eave_End = new THREE.Vector3(width / 2, eaveHeight, zEnd);

            // Cross 2: Low Right Start -> High Left End
            const R_Eave_Start = new THREE.Vector3(width / 2, eaveHeight, zStart);
            const L_Ridge_End = new THREE.Vector3(-width / 2, ridgeHeight, zEnd);

            bracings.push(createRod(L_Ridge_Start, R_Eave_End, `roof-Mono-${i}-1`));
            bracings.push(createRod(R_Eave_Start, L_Ridge_End, `roof-Mono-${i}-2`));

        } else if (buildingType === 'asymetrique_1') {
            // Asymmetrical: Right Side (75%) 15deg, Left Side (25%) Steep
            // Ridge is at x = -width/2 + (0.25 * width) = -0.25 * width
            // Wait, coordinate system:
            // Center is 0. Left Wall -W/2. Right Wall +W/2.
            // Left Span = 0.25 * W.
            // Apex X = -Width/2 + LeftSpan.

            const leftSpan = width * 0.25;
            const rightSpan = width * 0.75;

            // Recalculate Heights (Match PortalFrame/Exact Logic)
            const asymRightEave = 4.0;
            const w = width;
            let asymLeftEave = 6.4;
            let asymRidge = 7.4;

            if (Math.abs(w - 20) < 0.5) { asymLeftEave = 7.4; asymRidge = 8.4; }
            else if (Math.abs(w - 16.4) < 0.5 || Math.abs(w - 16) < 0.5) { asymLeftEave = 6.4; asymRidge = 7.4; }
            else {
                // Fallback
                const rS = 15 * Math.PI / 180;
                asymRidge = 4.0 + (w * 0.75 * Math.tan(rS));
                asymLeftEave = asymRidge - (w * 0.25 * Math.tan(15 * Math.PI / 180));
            }

            // Offset to match Rafter
            let rafterOffset = 0.15;
            // USER REQUEST 12/01/2026: Lower bracing by 20cm for 20m width only
            let leftRafterOffset = rafterOffset;
            if (Math.abs(w - 20) < 0.5) {
                rafterOffset -= 0.20; // Lower by 20cm
                // USER REQUEST 12/01/2026 Round 2: Lower left bracing by additional 10cm
                leftRafterOffset -= 0.30; // Total -30cm for left side
            }
            const leftStartH = asymLeftEave + leftRafterOffset;
            const rightStartH = asymRightEave + rafterOffset;
            const apexY = asymRidge;
            const apexX = -width / 2 + (width * 0.25);

            // Left Slope Bracing:
            const L_Eave_Start = new THREE.Vector3(-width / 2, leftStartH, zStart);
            const L_Apex_Start = new THREE.Vector3(apexX - 0.1, apexY, zStart);
            const L_Eave_End = new THREE.Vector3(-width / 2, leftStartH, zEnd);
            const L_Apex_End = new THREE.Vector3(apexX - 0.1, apexY, zEnd);

            bracings.push(createRod(L_Eave_Start, L_Apex_End, `roof-L-Asym-${i}-1`));
            bracings.push(createRod(L_Apex_Start, L_Eave_End, `roof-L-Asym-${i}-2`));

            // Right Slope Bracing:
            const R_Eave_Start = new THREE.Vector3(width / 2, rightStartH, zStart);
            const R_Apex_Start = new THREE.Vector3(apexX + 0.1, apexY, zStart);
            const R_Eave_End = new THREE.Vector3(width / 2, rightStartH, zEnd);
            const R_Apex_End = new THREE.Vector3(apexX + 0.1, apexY, zEnd);

            bracings.push(createRod(R_Eave_Start, R_Apex_End, `roof-R-Asym-${i}-1`));
            bracings.push(createRod(R_Apex_Start, R_Eave_End, `roof-R-Asym-${i}-2`));


        } else if (buildingType === 'asymetrique_2') {
            // Asymmetrical 2 Zones: 2 X-crosses meeting at apex
            const w = width;
            const rightEave = 4.0;
            let leftEave, ridge;

            if (Math.abs(width - 25.5) < 0.1) {
                leftEave = 6.9;
                ridge = 8.9;
            } else if (Math.abs(width - 29.1) < 0.1) {
                leftEave = 7.9;
                ridge = 9.8;
            } else {
                const rAngle = 15 * (Math.PI / 180);
                ridge = rightEave + (w * 0.75 * Math.tan(rAngle));
                leftEave = ridge - (w * 0.25 * Math.tan(rAngle));
            }

            // Apex at 1/4 from left
            const apexX = -w / 2 + (w * 0.25);
            const rafterOffset = 0.15;

            // Left Section: Left eave to apex
            const L_Eave_Start = new THREE.Vector3(-w / 2, leftEave + rafterOffset, zStart);
            const L_Apex_Start = new THREE.Vector3(apexX - 0.1, ridge, zStart);
            const L_Eave_End = new THREE.Vector3(-w / 2, leftEave + rafterOffset, zEnd);
            const L_Apex_End = new THREE.Vector3(apexX - 0.1, ridge, zEnd);

            bracings.push(createRod(L_Eave_Start, L_Apex_End, `roof-L-Asym2-${i}-1`));
            bracings.push(createRod(L_Apex_Start, L_Eave_End, `roof-L-Asym2-${i}-2`));

            // Right Section: Apex to right eave
            const R_Apex_Start = new THREE.Vector3(apexX + 0.1, ridge, zStart);
            const R_Eave_Start = new THREE.Vector3(w / 2, rightEave + rafterOffset, zStart);
            const R_Apex_End = new THREE.Vector3(apexX + 0.1, ridge, zEnd);
            const R_Eave_End = new THREE.Vector3(w / 2, rightEave + rafterOffset, zEnd);

            bracings.push(createRod(R_Apex_Start, R_Eave_End, `roof-R-Asym2-${i}-1`));
            bracings.push(createRod(R_Eave_Start, R_Apex_End, `roof-R-Asym2-${i}-2`));

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
