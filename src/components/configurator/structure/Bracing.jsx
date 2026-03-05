// Bracing component for TALIAN models refinements in ACAMA
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';

/**
 * X-Bracing (Croix de St Andre) for Walls and Roof
 * Applied every 4th bay (Bay 0, 4, 8...)
 */
export function Bracing({
    width, length, bayCount, baySpacing, eaveHeight, roofPitch, ridgeHeight, buildingType = 'symetrique',
    leftSide = 'none', rightSide = 'none', leftWidth = 0, rightWidth = 0
}) {
    const { isAcama } = useConfiguratorValues();
    const bracingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#a0a0a0',
        metalness: 0.6,
        roughness: 0.4
    }), []);

    if (buildingType.startsWith('ombriere')) return null;

    const angleRad = (roofPitch * Math.PI) / 180;
    const symRidgeHeight = eaveHeight + ((width / 2) * Math.tan(angleRad));

    const bracings = [];

    const isTalian4 = isAcama && buildingType === 'symetrique' && Math.abs(width - 13.7) < 0.1;
    const isTalian1 = isAcama && buildingType === 'symetrique' && Math.abs(width - 18.8) < 0.1;
    const isTalian3 = isAcama && buildingType === 'symetrique' && Math.abs(width - 17.5) < 0.1;
    const isTalian5 = isAcama && buildingType === 'epona' && Math.abs(width - 27.3) < 0.1;
    const isTalian = isTalian4 || isTalian1 || isTalian3 || isTalian5;

    // Loop through bays and add bracing every 4 bays
    for (let i = 0; i < bayCount; i += 4) {
        // Z start and end of this bay
        const zStart = -i * baySpacing;
        const zEnd = -(i + 1) * baySpacing;

        // --- Wall Bracing (Long pans) ---
        const yBot = 0.5;

        // --- Main Building Eaves ---
        const yTopMainLeft = (buildingType === 'monopente') ? ridgeHeight - 0.5 : eaveHeight - 0.5;
        let yTopMainRight = eaveHeight - 0.5;
        if (buildingType === 'asymetrique_1') yTopMainRight = 3.9;
        else if (buildingType === 'asymetrique_2') yTopMainRight = 3.7;
        else if (isAcama && isTalian5) yTopMainRight = 3.7;


        const createRod = (start, end, key) => (
            <BraceRod key={key} start={start} end={end} material={bracingMaterial} thickness={0.03} />
        );

        // Main Left Wall (-width/2)
        bracings.push(createRod(new THREE.Vector3(-width / 2, yBot, zStart), new THREE.Vector3(-width / 2, yTopMainLeft, zEnd), `wall-L-${i}-1`));
        bracings.push(createRod(new THREE.Vector3(-width / 2, yTopMainLeft, zStart), new THREE.Vector3(-width / 2, yBot, zEnd), `wall-L-${i}-2`));

        // Main Right Wall (+width/2) - User Request: Only one brace for EPONA ACAMA
        if (!isAcama || buildingType !== 'epona') {
            bracings.push(createRod(new THREE.Vector3(width / 2, yBot, zStart), new THREE.Vector3(width / 2, yTopMainRight, zEnd), `wall-R-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(width / 2, yTopMainRight, zStart), new THREE.Vector3(width / 2, yBot, zEnd), `wall-R-${i}-2`));
        }


        // --- Extension Eaves (TALIAN ACAMA specific) ---
        if (isTalian) {
            // Extension Eave Heights (Approximate based on Auvent/Awning logic)
            let leftExtEaveH = eaveHeight - 0.5;
            let rightExtEaveH = eaveHeight - 0.5;

            if (leftSide !== 'none' && !isTalian) {
                if (leftSide === 'auvent') {
                    const auventW = isTalian1 ? 2.3 : (isTalian3 ? 1.8 : 4.0);
                    const auventAngle = (isTalian1 ? 14 : (isTalian3 ? 12 : 10)) * (Math.PI / 180);
                    const auventStartH = isTalian1 ? eaveHeight + 0.2 : (isTalian3 ? eaveHeight + 0.4 : 5.5);
                    leftExtEaveH = auventStartH - (auventW * Math.tan(auventAngle)) - 0.5;
                } else if (leftSide === 'appentis') {
                    leftExtEaveH = eaveHeight - (leftWidth * Math.tan(angleRad)) - 0.5;
                }
                const xLExt = -(width / 2 + leftWidth);
                bracings.push(createRod(new THREE.Vector3(xLExt, yBot, zStart), new THREE.Vector3(xLExt, leftExtEaveH, zEnd), `wall-extL-${i}-1`));
                bracings.push(createRod(new THREE.Vector3(xLExt, leftExtEaveH, zStart), new THREE.Vector3(xLExt, yBot, zEnd), `wall-extL-${i}-2`));
            }

            if (rightSide !== 'none' && !isTalian) {
                if (rightSide === 'auvent') {
                    const auventW = isTalian1 ? 2.3 : (isTalian3 ? 1.8 : 4.0);
                    const auventAngle = (isTalian1 ? 14 : (isTalian3 ? 12 : 10)) * (Math.PI / 180);
                    const auventStartH = isTalian1 ? eaveHeight + 0.2 : (isTalian3 ? eaveHeight + 0.4 : 5.5);
                    rightExtEaveH = auventStartH - (auventW * Math.tan(auventAngle)) - 0.5;
                } else if (rightSide === 'appentis') {
                    rightExtEaveH = eaveHeight - (rightWidth * Math.tan(angleRad)) - 0.5;
                }
                const xRExt = width / 2 + rightWidth;
                bracings.push(createRod(new THREE.Vector3(xRExt, yBot, zStart), new THREE.Vector3(xRExt, rightExtEaveH, zEnd), `wall-extR-${i}-1`));
                bracings.push(createRod(new THREE.Vector3(xRExt, rightExtEaveH, zStart), new THREE.Vector3(xRExt, yBot, zEnd), `wall-extR-${i}-2`));
            }

            continue; // Skip roof bracing for Talian ACAMA
        }

        // --- Roof Bracing (Versants) - only for non-TALIAN ---
        if (buildingType === 'monopente') {
            const L_Ridge_Start = new THREE.Vector3(-width / 2, ridgeHeight, zStart);
            const R_Eave_End = new THREE.Vector3(width / 2, eaveHeight, zEnd);
            const R_Eave_Start = new THREE.Vector3(width / 2, eaveHeight, zStart);
            const L_Ridge_End = new THREE.Vector3(-width / 2, ridgeHeight, zEnd);
            bracings.push(createRod(L_Ridge_Start, R_Eave_End, `roof-Mono-${i}-1`));
            bracings.push(createRod(R_Eave_Start, L_Ridge_End, `roof-Mono-${i}-2`));
        } else if (buildingType === 'asymetrique_1') {
            const apexX = -width / 2 + (width * 0.25);
            const asymRightEave = 4.0;
            const w = width;
            let asymLeftEave = (Math.abs(w - 20) < 0.5) ? 7.4 : 6.4;
            let asymRidge = (Math.abs(w - 20) < 0.5) ? 8.4 : 7.4;
            let rafterOffset = (Math.abs(w - 20) < 0.5) ? -0.05 : 0.15;
            let leftRafterOffset = (Math.abs(w - 20) < 0.5) ? -0.15 : 0.15;

            const leftStartH = asymLeftEave + leftRafterOffset;
            const rightStartH = asymRightEave + rafterOffset;
            const apexY = asymRidge;

            bracings.push(createRod(new THREE.Vector3(-width / 2, leftStartH, zStart), new THREE.Vector3(apexX - 0.1, apexY, zEnd), `roof-L-Asym-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(apexX - 0.1, apexY, zStart), new THREE.Vector3(-width / 2, leftStartH, zEnd), `roof-L-Asym-${i}-2`));
            bracings.push(createRod(new THREE.Vector3(width / 2, rightStartH, zStart), new THREE.Vector3(apexX + 0.1, apexY, zEnd), `roof-R-Asym-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(apexX + 0.1, apexY, zStart), new THREE.Vector3(width / 2, rightStartH, zEnd), `roof-R-Asym-${i}-2`));
        } else if (buildingType === 'epona') {
            const mainPitch = 17 * (Math.PI / 180);
            const apexX = 0;
            const apexY = 5.0 + (11.8 * Math.tan(mainPitch));
            const leftColX = -11.8, middleColX = 11.8, rightColX = 19.65;
            const leftH = 5.0, rightH = 2.63; // Lowered by 1.2m
            const middleH = apexY - (middleColX * Math.tan(mainPitch));

            // Wall M (Double restored) - Right wall for EPONA ACAMA
            bracings.push(createRod(new THREE.Vector3(middleColX, 0.5, zStart), new THREE.Vector3(middleColX, middleH - 0.5, zEnd), `wall-M-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(middleColX, middleH - 0.5, zStart), new THREE.Vector3(middleColX, 0.5, zEnd), `wall-M-${i}-2`));


            // New Request (Step 423): Add Wall R single brace if not already there? 
            // Wait, Wall R (+width/2) is already handled at line 56. 
            // middleColX (11.8) is the RIGHT wall of the main building for EPONA.
            // middleH is the height at 11.8


            // Roof (Double restored)
            bracings.push(createRod(new THREE.Vector3(leftColX, leftH, zStart), new THREE.Vector3(apexX - 0.1, apexY, zEnd), `roof-L-Epona-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(apexX - 0.05, apexY, zStart), new THREE.Vector3(leftColX, leftH, zEnd), `roof-L-Epona-${i}-2`));

            bracings.push(createRod(new THREE.Vector3(apexX + 0.1, apexY, zStart), new THREE.Vector3(rightColX, rightH, zEnd), `roof-R-Epona-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(rightColX, rightH, zStart), new THREE.Vector3(apexX + 0.05, apexY, zEnd), `roof-R-Epona-${i}-2`));


        } else if (buildingType === 'asymetrique_2') {
            // No roof bracing for asymetrique_2 as requested
        } else {
            // Symmetrical
            bracings.push(createRod(new THREE.Vector3(-width / 2, eaveHeight, zStart), new THREE.Vector3(-0.1, symRidgeHeight, zEnd), `roof-L-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(-0.1, symRidgeHeight, zStart), new THREE.Vector3(-width / 2, eaveHeight, zEnd), `roof-L-${i}-2`));
            bracings.push(createRod(new THREE.Vector3(width / 2, eaveHeight, zStart), new THREE.Vector3(0.1, symRidgeHeight, zEnd), `roof-R-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(0.1, symRidgeHeight, zStart), new THREE.Vector3(width / 2, eaveHeight, zEnd), `roof-R-${i}-2`));
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
