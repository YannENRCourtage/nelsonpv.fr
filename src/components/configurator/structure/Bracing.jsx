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
    const isTalian = isTalian4 || isTalian1 || isTalian3;

    // Loop through bays and add bracing every 4 bays
    for (let i = 0; i < bayCount; i += 4) {
        // Z start and end of this bay
        const zStart = -i * baySpacing;
        const zEnd = -(i + 1) * baySpacing;

        // --- Wall Bracing (Long pans) ---
        const yBot = 0.5;

        // --- Main Building Eaves ---
        let yTopMainLeft = (buildingType === 'monopente') ? ridgeHeight - 0.5 : eaveHeight - 0.5;
        let yTopMainRight = eaveHeight - 0.5;
        if (buildingType === 'asymetrique_1') {
            yTopMainRight = 3.9;
        } else if (buildingType === 'asymetrique_2') {
            yTopMainRight = 3.7;
        } else if (buildingType === 'epona_talian5') {
            yTopMainLeft = 7.9; // Reach exactly the eave
            yTopMainRight = 4.3; // Reach exactly the eave
        }



        const createRod = (start, end, key) => (
            <BraceRod key={key} start={start} end={end} material={bracingMaterial} thickness={0.03} />
        );

        // Main Left Wall (-width/2 ou -15.4 pour T5)
        const xLeftWall = buildingType === 'epona_talian5' ? -15.4 : -width / 2;
        bracings.push(createRod(new THREE.Vector3(xLeftWall, yBot, zStart), new THREE.Vector3(xLeftWall, yTopMainLeft, zEnd), `wall-L-${i}-1`));
        bracings.push(createRod(new THREE.Vector3(xLeftWall, yTopMainLeft, zStart), new THREE.Vector3(xLeftWall, yBot, zEnd), `wall-L-${i}-2`));

        // Main Right Wall (+width/2 ou +11.0 pour T5)
        if (!isAcama || buildingType !== 'epona') {
            const xRightWall = buildingType === 'epona_talian5' ? 11.0 : width / 2;
            bracings.push(createRod(new THREE.Vector3(xRightWall, yBot, zStart), new THREE.Vector3(xRightWall, yTopMainRight, zEnd), `wall-R-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(xRightWall, yTopMainRight, zStart), new THREE.Vector3(xRightWall, yBot, zEnd), `wall-R-${i}-2`));
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
        } else if (buildingType === 'epona_talian5') {
            // TALIAN 5 - Contreventement de toiture (Croix de St André sous bac acier)
            // Calculs géométriques identiques à PortalFrame / Roof
            const leftEaveH = 7.9;
            const effectiveRidgeHeight = 8.1;
            const midEaveH = 6.0;
            const rightEaveH = 4.3;

            const offsetApexFromLeft = 4.13;
            const apexX = -15.4 + offsetApexFromLeft; // -11.27
            const middleColumnX = 0;
            const leftColumnX = -15.4;
            const rightColumnX = 11.0;

            // Position de base de la charpente (Axe de l'IPE)
            // On ajoute 20cm pour être au sommet du rafter, puis +5cm pour la panne, puis +12cm pour le bac acier.
            // Le bac acier est donc à +37cm de la charpente de base.
            // On veut la croix à -5cm du bac acier, soit à +32cm de la position de la charpente `(Y + 0.32)`.
            const roofOffset = 0.32;

            const leftStartX = leftColumnX;
            const leftStartY = leftEaveH + roofOffset;
            const apexY = effectiveRidgeHeight + roofOffset;

            // Pente moyenne : pic à poteau droit
            const midStartY = midEaveH + roofOffset;
            const rightStartY = rightEaveH + roofOffset;

            // Segment 1 (Poteau gauche -> Apex)
            bracings.push(createRod(new THREE.Vector3(leftStartX, leftStartY, zStart), new THREE.Vector3(apexX, apexY, zEnd), `roof-L-T5-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(apexX, apexY, zStart), new THREE.Vector3(leftStartX, leftStartY, zEnd), `roof-L-T5-${i}-2`));

            // Segment 2 (Apex -> Poteau central)
            bracings.push(createRod(new THREE.Vector3(apexX, apexY, zStart), new THREE.Vector3(middleColumnX, midStartY, zEnd), `roof-M-T5-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(middleColumnX, midStartY, zStart), new THREE.Vector3(apexX, apexY, zEnd), `roof-M-T5-${i}-2`));

            // Segment 3 (Poteau central -> Poteau droit)
            bracings.push(createRod(new THREE.Vector3(middleColumnX, midStartY, zStart), new THREE.Vector3(rightColumnX, rightStartY, zEnd), `roof-R-T5-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(rightColumnX, rightStartY, zStart), new THREE.Vector3(middleColumnX, midStartY, zEnd), `roof-R-T5-${i}-2`));

        } else if (buildingType === 'asymetrique_2' && !isAcama) {
            // GREEN INVEST Asymétrique 2 Zones Roof Bracing
            const w = width;
            const mainSlope = 15 * (Math.PI / 180);
            const rightSpan = w * 0.75;
            const distRightToMiddle = rightSpan * 0.6;
            const apexX = -w / 2 + (w * 0.25);
            const middleColumnX = w / 2 - distRightToMiddle;

            const baseEaveH = 4.0;
            const ridgeY = baseEaveH + (rightSpan * Math.tan(mainSlope));
            const midColY = ridgeY - ((rightSpan - distRightToMiddle) * Math.tan(mainSlope));
            const leftEaveY = baseEaveH; // Both eaves at 4m for GI Asym2

            // Brace Offset: Position them on the rafters (approx eaveHeight + 0.35)
            const roofOffset = 0.35;
            const yL = leftEaveY + roofOffset + 2.2; // Raised lower end of left oblique bracing by 2.2m (2.0 + 0.2 requested)
            const yApex = ridgeY + roofOffset;
            const yMid = midColY + roofOffset;
            const yR = baseEaveH + roofOffset;

            // Segment 1: Left Wall (-w/2) to Apex
            bracings.push(createRod(new THREE.Vector3(-w / 2, yL, zStart), new THREE.Vector3(apexX, yApex, zEnd), `roof-L-Asym2-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(apexX, yApex, zStart), new THREE.Vector3(-w / 2, yL, zEnd), `roof-L-Asym2-${i}-2`));

            // Segment 2: Apex to Middle Column
            bracings.push(createRod(new THREE.Vector3(apexX, yApex, zStart), new THREE.Vector3(middleColumnX, yMid, zEnd), `roof-M-Asym2-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(middleColumnX, yMid, zStart), new THREE.Vector3(apexX, yApex, zEnd), `roof-M-Asym2-${i}-2`));

            // Segment 3: Middle Column to Right Wall (+w/2)
            bracings.push(createRod(new THREE.Vector3(middleColumnX, yMid, zStart), new THREE.Vector3(w / 2, yR, zEnd), `roof-R-Asym2-${i}-1`));
            bracings.push(createRod(new THREE.Vector3(w / 2, yR, zStart), new THREE.Vector3(middleColumnX, yMid, zEnd), `roof-R-Asym2-${i}-2`));

        } else if (buildingType === 'epona') {
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
