import React, { useMemo } from 'react';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import * as THREE from 'three';
import { getIPEProfileParams } from '../utils/profiles.js';
import { createTaperedIPEGeometry, createBoltGeometry } from '../utils/steelProfiles.js';

/**
 * Renders a single Portal Frame (Portique)
 * Consists of:
 * - 2 Columns (Poteaux)
 * - 2 Rafters (Arbalétriers) with 10° slope
 * - 2 Haunches (Jarrets) at the eaves
 * - 1 Apex Haunch (Jarret de faîtage) - optionally
 */
export function PortalFrame({
    position = [0, 0, 0],
    width,
    eaveHeight,
    ridgeHeight,
    roofPitch = 10,
    buildingType = 'symetrique'
}) {
    const { isAcama, configMode, customParams, customSpans } = useConfiguratorValues();
    // Industrial PBR Material (Galvanized Steel)
    const steelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#8a949b',
        metalness: 0.6,
        roughness: 0.4,
    }), []);

    // 1. Column Sizing
    const availableWidths = [15.0, 18.6, 22.3, 26.0, 29.8, 33.5];
    const widthIndex = availableWidths.findIndex(w => Math.abs(w - width) < 0.1);
    const scaleFactor = 1 + (Math.max(0, widthIndex) * 0.05);

    // Initial IPE Params
    const baseColumnProfile = useMemo(() => getIPEProfileParams('IPE450'), []);
    const rafterProfileType = 'IPE400';

    // --- HEIGHT & ANGLE LOGIC (Hoisted) ---
    const isMonopente = (configMode === 'custom' ? customParams.buildingType === 'monopente' : buildingType === 'monopente');
    const isAsymetrique = (configMode === 'custom' ? customParams.buildingType === 'asymetrique' : buildingType === 'asymetrique_1');
    const isAsymetrique2 = (configMode === 'custom' ? false : buildingType === 'asymetrique_2'); // Asym2 only for predefined GI

    const isSymetrique = (configMode === 'custom' ? customParams.buildingType === 'symetrique' : buildingType === 'symetrique');
    const isEpona = isAcama && (buildingType === 'epona' || buildingType === 'epona_talian5') && configMode === 'predefined';

    // Variables dimensionnelles calculées
    let leftSpan, rightSpan, lAngle, rAngle, effectiveRidgeHeight, apexX;
    let leftEaveHeight = eaveHeight; // Default
    let rightEaveHeight = eaveHeight; // Default

    // NEW: For asymmetric_2 and TALIAN 5
    let middleColumnX, middleColumnHeight;
    let leftSectionSpan, rightSectionSpan, middleSectionSpan;
    let leftSectionAngle, rightSectionAngle, middleSectionAngle;

    // --- CUSTOM MODE OVERRIDE ---
    if (configMode === 'custom') {
        const cp = customParams;
        leftEaveHeight = cp.leftEaveHeight;
        rightEaveHeight = cp.rightEaveHeight;
        effectiveRidgeHeight = cp.ridgeHeight;
        
        lAngle = cp.leftPitch * (Math.PI / 180);
        rAngle = cp.rightPitch * (Math.PI / 180);
        
        leftSpan = customSpans.left;
        rightSpan = customSpans.right;
        apexX = -width / 2 + leftSpan;

        // Compatibility for logic below
        leftSectionSpan = leftSpan;
        rightSectionSpan = rightSpan;
        leftSectionAngle = lAngle;
        rightSectionAngle = rAngle;

    } else if (isEpona) {
        if (buildingType === 'epona_talian5') {
            // TALIAN 5
            leftEaveHeight = 7.9;
            rightEaveHeight = 4.3;
            leftSpan = 15.4;
            rightSpan = 11.0;
            const offsetApexFromLeft = 4.13;
            apexX = -15.4 + offsetApexFromLeft;
            effectiveRidgeHeight = 8.1;
            leftSectionSpan = offsetApexFromLeft;
            leftSectionAngle = Math.atan((effectiveRidgeHeight - leftEaveHeight) / leftSectionSpan);
            lAngle = leftSectionAngle;
            middleSectionSpan = 15.4 - offsetApexFromLeft;
            middleColumnX = 0;
            middleSectionAngle = Math.atan((effectiveRidgeHeight - 6.0) / middleSectionSpan);
            middleColumnHeight = 6.0;
            rightSectionSpan = 11.0;
            rightSectionAngle = Math.atan((6.0 - 4.3) / rightSectionSpan);
            rAngle = rightSectionAngle;
        } else {
            // EPONA
            const mainPitch = 17 * (Math.PI / 180);
            leftEaveHeight = 5.0;
            rightEaveHeight = 2.0; // Abaissé de 60cm (2.6 -> 2.0)
            leftSpan = 11.8;
            rightSpan = 19.65;
            apexX = 0;
            effectiveRidgeHeight = ridgeHeight; 
            middleColumnX = 11.8;
            lAngle = mainPitch;
            rAngle = mainPitch;
            middleColumnHeight = (effectiveRidgeHeight - (11.8 * Math.tan(mainPitch))) - 0.6; // Abaissé de 60cm
            leftSectionSpan = leftSpan;
            leftSectionAngle = lAngle;
            middleSectionSpan = 11.8;
            middleSectionAngle = rAngle;
            rightSectionSpan = 7.85;
            rightSectionAngle = rAngle;
        }
    } else if (isAsymetrique2) {
        // Standard Asymetrique 2 zones
        let mainPitch = 15 * (Math.PI / 180);
        rightEaveHeight = 4.0;
        middleColumnX = -width / 2 + 13.1;
        leftSpan = width * 0.25;
        rightSpan = width * 0.75;
        apexX = -width / 2 + leftSpan;

        if (Math.abs(width - 25.5) < 0.1) {
            leftEaveHeight = 6.9;
            effectiveRidgeHeight = 8.9;
        } else if (Math.abs(width - 29.1) < 0.1) {
            leftEaveHeight = 7.9;
            effectiveRidgeHeight = 9.8;
        } else {
            leftEaveHeight = 6.9;
            effectiveRidgeHeight = rightEaveHeight + (rightSpan * Math.tan(mainPitch));
        }

        rAngle = mainPitch;
        lAngle = mainPitch;
        const distApexToMiddle = middleColumnX - apexX;
        middleColumnHeight = effectiveRidgeHeight - (distApexToMiddle * Math.tan(rAngle));
        leftSectionSpan = leftSpan;
        leftSectionAngle = Math.atan((effectiveRidgeHeight - leftEaveHeight) / leftSectionSpan);
        middleSectionSpan = distApexToMiddle;
        middleSectionAngle = rAngle;
        rightSectionSpan = rightSpan - distApexToMiddle;
        rightSectionAngle = rAngle;
    } else if (isAsymetrique) {
        const mainPitch = 15 * (Math.PI / 180);
        rightSpan = width * 0.75;
        leftSpan = width * 0.25;
        apexX = -width / 2 + leftSpan;
        rAngle = mainPitch;
        lAngle = mainPitch;
        rightEaveHeight = 4.0;
        effectiveRidgeHeight = rightEaveHeight + (rightSpan * Math.tan(rAngle));
        leftEaveHeight = effectiveRidgeHeight - (leftSpan * Math.tan(lAngle));
    } else if (isMonopente) {
        if (configMode === 'custom') {
            const cp = customParams;
            leftEaveHeight = cp.ridgeHeight;
            rightEaveHeight = cp.rightEaveHeight;
            const monoSlopeRad = Math.atan((cp.ridgeHeight - cp.rightEaveHeight) / width);
            lAngle = monoSlopeRad;
            rAngle = monoSlopeRad;
            effectiveRidgeHeight = cp.ridgeHeight;
        } else {
            const monoSlopeRad = Math.atan((ridgeHeight - eaveHeight) / width);
            lAngle = monoSlopeRad; 
            rAngle = monoSlopeRad;
            effectiveRidgeHeight = ridgeHeight;
            leftEaveHeight = ridgeHeight;
            rightEaveHeight = eaveHeight;
        }
        leftSpan = width;
        rightSpan = 0;
        apexX = -width / 2;
    } else {
        const symAngleRad = (roofPitch * Math.PI) / 180;
        lAngle = symAngleRad;
        rAngle = symAngleRad;
        leftSpan = width / 2;
        rightSpan = width / 2;
        effectiveRidgeHeight = ridgeHeight;
        apexX = 0;
    }

    // --- Apex Assembly Geometries ---
    const apexHaunchLength = 1.0;
    const apexHaunchGeo = useMemo(() => {
        return createTaperedIPEGeometry(rafterProfileType, apexHaunchLength, 1.0, 0.1);
    }, [rafterProfileType]);

    // Apex End Plate
    const apexPlateHeight = 0.8;
    const apexPlateGeo = useMemo(() => new THREE.BoxGeometry(0.20, apexPlateHeight, 0.02), []);

    // Stiffener for Haunch Toe
    const apexStiffenerGeo = useMemo(() => new THREE.BoxGeometry(0.18, 0.36, 0.01), []);

    // Custom Geometry for Slanted Columns (Unchanged logic)
    const createSlantedColumn = (profileParams, angle, isRight, height) => {
        const geo = new THREE.ExtrudeGeometry(profileParams.shape, {
            depth: height,
            bevelEnabled: false
        });
        const pos = geo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            if (v.z > height - 0.1) {
                v.z += (v.y * Math.tan(angle));
            }
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        return geo;
    };

    // --- Derived Geometry for Columns ---
    // Angles for slanted cut
    // Left Cut matches Left Slope (lAngle is angle from horizontal)
    const derivedAngle = isMonopente ? -lAngle : lAngle;
    // Right Cut matches Right Slope
    const rightDerivedAngle = isMonopente ? -rAngle : -rAngle;

    // Rafter Profile Specs for Height Calculation
    const rafterDepth = 0.35; // IPE400 reduced by 5cm

    const leftRafterVert = rafterDepth / Math.cos(lAngle);
    const rightRafterVert = rafterDepth / Math.cos(rAngle);

    // User requested columns extend to "under the purlin" but then requested to decrease by 20cm.
    const leftColOffset = leftRafterVert - 0.20;
    const rightColOffset = rightRafterVert - 0.20;

    const leftColHeight = (isMonopente ? ridgeHeight : leftEaveHeight) + leftColOffset;
    const rightColHeight = rightEaveHeight + rightColOffset;

    // Compatibility alias for existing components
    const angleRad = rAngle;

    const leftColumnGeo = useMemo(() => createSlantedColumn(baseColumnProfile, derivedAngle, false, leftColHeight), [baseColumnProfile, leftColHeight, derivedAngle]);
    const rightColumnGeo = useMemo(() => createSlantedColumn(baseColumnProfile, rightDerivedAngle, true, rightColHeight), [baseColumnProfile, rightColHeight, rightDerivedAngle]);

    // 2. Rafters & Haunches
    // rafterProfileType defined at top
    const colDepth = 0.45; // IPE450 Depth
    const horizontalOverhang = colDepth / 2; // Extend to outer edge of column
    const slantedOverhang = horizontalOverhang / Math.cos(angleRad);
    const monoSlantedOverhang = horizontalOverhang / Math.cos(Math.abs(derivedAngle));

    // Geometry Factories
    const createRafterGeo = (len) => {
        const params = getIPEProfileParams(rafterProfileType, len);
        return new THREE.ExtrudeGeometry(params.shape, params.options);
    };

    // Haunch (Jarret) - Tapered IPE
    // Length fixed at 1.5m approx or 10%
    const haunchLength = 1.5;
    const haunchGeo = useMemo(() => {
        // Tapered: Start at Full IPE400 height, End at 0.4 height
        return createTaperedIPEGeometry(rafterProfileType, haunchLength, 1.0, 0.4);
    }, [rafterProfileType]);

    // End Plate (Platine)
    const plateWidth = 0.20; // IPE450 width is 0.19, so 0.20 allows slight edge
    const plateHeight = 0.60; // Covering Rafter + Haunch depth
    const plateThickness = 0.02;
    const plateGeo = useMemo(() => new THREE.BoxGeometry(plateWidth, plateHeight, plateThickness), []);

    // Stiffeners (Raidisseurs) - Inside Column
    // Fits inside IPE450: Width ~0.09 (half width), Height ~0.4, Depth 0.01
    const stiffenerGeo = useMemo(() => new THREE.BoxGeometry(0.18, 0.012, 0.40), []); // Placed horizontally

    // Bolts (Boulons) - Instanced
    const boltGeo = useMemo(() => createBoltGeometry(), []);

    // --- Assembly Groups ---

    // Rafter + Haunch + Plate Assembly
    const createRafterAssembly = (length, isRight, hasHaunch = true) => {
        const rafterG = createRafterGeo(length);

        // Bolts position (local to assembly)
        const boltPositions = [
            [-0.06, 0.15, 0], [0.06, 0.15, 0], // Top row
            [-0.06, 0.05, 0], [0.06, 0.05, 0], // Middle Top
            [-0.06, -0.15, 0], [0.06, -0.15, 0], // Haunch area
            [-0.06, -0.25, 0], [0.06, -0.25, 0], // Bottom
        ];

        return (
            <group>
                {/* Rafter */}
                <mesh geometry={rafterG} material={steelMaterial} rotation={[0, isRight ? -Math.PI / 2 : Math.PI / 2, 0]} castShadow receiveShadow />

                {/* Haunch (Underneath) */}
                {/* Tapered Geo is Y-Top aligned. Needs to be placed below Rafter */}
                {hasHaunch && (
                    <group position={[0, -0.2, 0]} rotation={[0, isRight ? -Math.PI / 2 : Math.PI / 2, 0]}>
                        <mesh geometry={haunchGeo} material={steelMaterial} position={[0, 0, 0]} castShadow />
                    </group>
                )}

                {/* End Plate (At origin) */}
                {/* Center of plate at (0, -0.1, 0) approx to cover join */}
                {/* USER REQUEST: Resize plate if no haunch */}
                <mesh position={[isRight ? -plateThickness / 2 : plateThickness / 2, hasHaunch ? -0.1 : 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
                    <boxGeometry args={[plateWidth, hasHaunch ? 0.60 : 0.40, plateThickness]} />
                    <meshStandardMaterial color="#8a949b" metalness={0.6} roughness={0.4} />
                </mesh>

                {/* Bolts */}
                {/* Use Instances or simple mesh for now inside group (InstancedMesh is better at Frame level, but simpler here for strict placement) */}
                {boltPositions.filter((_, idx) => hasHaunch || idx < 4).map((pos, idx) => (
                    <mesh key={idx} geometry={boltGeo} material={steelMaterial}
                        position={[isRight ? -plateThickness : plateThickness, pos[1] - 0.1, pos[0]]}
                        rotation={[0, 0, isRight ? Math.PI : 0]} />
                ))}

            </group>
        );
    };


    if (isMonopente) {
        // Monopente Length: Center-to-Center Width + Left Overhang + Right Overhang
        const horizontalSpanMono = width + 2 * horizontalOverhang;
        const monoRafterLength = horizontalSpanMono / Math.cos(angleRad);
        const monoRafterGeo = createRafterGeo(monoRafterLength); // Created inside render to ensure correct length

        return (
            <group position={position}>
                {/* Left Column (High) */}
                <mesh geometry={leftColumnGeo} material={steelMaterial} position={[-width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Right Column (Low) */}
                <mesh geometry={rightColumnGeo} material={steelMaterial} position={[width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Single Rafter */}
                {/* Position pivot precisely: Midline is exactly 'rafterOffset' below the structural ridge/eave line */}
                <group position={[-width / 2, ridgeHeight - (0.20 / Math.cos(lAngle)), 0]} rotation={[0, 0, derivedAngle]}>
                    {/* Shift Mesh X by -overhang so it starts at left outer edge */}
                    <mesh geometry={monoRafterGeo} material={steelMaterial} position={[-monoSlantedOverhang, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
                </group>
            </group>
        );
    }

    // --- Apex Haunch Assembly (SCREB Style - High Fidelity) ---
    // Simplified to a Single Diamond Gusset (Losange Plein)

    const createApexHaunchAssemblySCREB = (lAngle = angleRad, rAngle = angleRad) => {
        // Diamond Gusset (Losange Plein)
        // Hugs the inner angle (slope) perfectly
        const gussetShape = new THREE.Shape();

        // Reduced size by ~20% as requested
        const wingLength = 0.8;

        const rightDrop = wingLength * Math.tan(rAngle);
        const leftDrop = wingLength * Math.tan(lAngle);

        gussetShape.moveTo(0, 0); // Top Apex
        gussetShape.lineTo(wingLength, -rightDrop); // Right Wing

        // Bottom Tip (Deep V)
        const maxDrop = Math.max(rightDrop, leftDrop);
        // Reduced bottom extension from 0.4 to 0.25
        gussetShape.lineTo(0, -maxDrop - 0.25);

        gussetShape.lineTo(-wingLength, -leftDrop); // Left Wing
        gussetShape.lineTo(0, 0);

        const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, { depth: 0.02, bevelEnabled: false });
        gussetGeo.translate(0, 0, -0.01); // Center Z

        return (
            <group>
                {/* Diamond Gusset */}
                <mesh geometry={gussetGeo} material={steelMaterial} position={[0, 0, 0]} castShadow />

                {/* Bolts on the Diamond (Visual Connection) */}
                {/* Simplified visual bolts - adjusted for smaller size */}
                <group position={[0, -0.05, 0.02]}>
                    <mesh geometry={boltGeo} material={steelMaterial} position={[-0.3, -leftDrop / 2, 0]} rotation={[Math.PI / 2, 0, 0]} />
                    <mesh geometry={boltGeo} material={steelMaterial} position={[0.3, -rightDrop / 2, 0]} rotation={[Math.PI / 2, 0, 0]} />
                </group>
                <group position={[0, -0.05, -0.02]}>
                    <mesh geometry={boltGeo} material={steelMaterial} position={[-0.3, -leftDrop / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
                    <mesh geometry={boltGeo} material={steelMaterial} position={[0.3, -rightDrop / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
                </group>
            </group>
        );
    };



    // (Logic consolidated at top)

    // Rafter Lengths (Hypotenuse of span + overhang)
    // For symmetric buildings: add 10cm extension towards sablière
    const leftRafterLength = (leftSpan + horizontalOverhang) / Math.cos(lAngle);
    const rightRafterLength = (rightSpan + horizontalOverhang) / Math.cos(rAngle);

    // Vertical offsets for connection at columns
    // The columns are cut at `angleRad` (for sym) or specific angle. 
    // Ideally, for asym, columns should be cut at `lAngle` and `rAngle`?
    // Current `createSlantedColumn` uses `derivedAngle` passed. 
    // `leftColumnGeo` uses `derivedAngle`.
    // We should probably update column rendering if we want perfect flush cuts, 
    // but standard `angleRad` might be close enough or we can accept slight mismatch for now.
    // The previous implementation used `angleRad` for columns globally.

    // --- EPONA (3 Columns, Exact Render) ---
    if (isEpona) {
        const rafterDepth = 0.35;
        const leftRafterVert = rafterDepth / Math.cos(leftSectionAngle);
        const rightRafterVert = rafterDepth / Math.cos(rightSectionAngle);
        const middleRafterVert = rafterDepth / Math.cos(middleSectionAngle);

        const leftColOffset = leftRafterVert - 0.20;
        const rightColOffset = rightRafterVert - 0.20;

        const middleColOffset = middleRafterVert - 0.20;

        const leftColHeight = leftEaveHeight + leftColOffset;
        const rightColHeight = rightEaveHeight + rightColOffset;
        const middleColHeightFinal = middleColumnHeight + middleColOffset;

        // Create VERTICAL column geometries
        const leftColumnGeo = createSlantedColumn(baseColumnProfile, 0, false, leftColHeight);
        const rightColumnGeo = createSlantedColumn(baseColumnProfile, 0, false, rightColHeight);
        const middleColumnGeo = createSlantedColumn(baseColumnProfile, 0, false, middleColHeightFinal);

        // Calculate rafter lengths with exact overhangs (2.55m on left, 1.25m on right)
        // positioning logic for Epona vs Talian5
        let leftColumnX_EP;
        let middleColumnX_EP;
        let rightColumnX_EP;

        let extendLeftX;
        let extendRightX;

        if (buildingType === 'epona_talian5') {
            leftColumnX_EP = -15.4;
            middleColumnX_EP = 0;
            rightColumnX_EP = 11.0;
            extendLeftX = 0; // Aucun débord
            extendRightX = 0;
        } else {
            leftColumnX_EP = -11.8;
            middleColumnX_EP = 11.8;
            rightColumnX_EP = 19.65;
            extendLeftX = 2.55;
            extendRightX = 1.25;
        }

        // Left rafter spans from the left overhang edge up to the apex
        const leftTotalSpanX = leftSectionSpan + extendLeftX;
        const leftSectionRafterLength = leftTotalSpanX / Math.cos(leftSectionAngle);

        // Right sections: right slope is split by the middle column.
        // Apex to middle column:
        const middleSectionRafterLength = (middleSectionSpan + horizontalOverhang / 2) / Math.cos(middleSectionAngle);
        // Middle column to right column (With overhang):
        const rightSectionRafterLength = (rightSectionSpan + extendRightX) / Math.cos(rightSectionAngle);

        return (
            <group position={position}>
                {/* Columns */}
                <mesh geometry={leftColumnGeo} material={steelMaterial} position={[leftColumnX_EP, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />
                <mesh geometry={middleColumnGeo} material={steelMaterial} position={[middleColumnX_EP, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />
                <mesh geometry={rightColumnGeo} material={steelMaterial} position={[rightColumnX_EP, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Gusset at Apex */}
                <group position={[apexX, effectiveRidgeHeight, 0]}>
                    {createApexHaunchAssemblySCREB(leftSectionAngle, middleSectionAngle)}
                </group>

                {/* Gusset at Middle Column */}
                <group position={[middleColumnX_EP, middleColHeightFinal, 0]}>
                    {createApexHaunchAssemblySCREB(middleSectionAngle, rightSectionAngle)}
                </group>

                {/* Left Rafter (from overhang edge UP to apex - pointing RIGHT) */}
                <group position={[leftColumnX_EP - extendLeftX, leftColHeight - (extendLeftX * Math.tan(leftSectionAngle)), 0]} rotation={[0, 0, leftSectionAngle]}>
                    {createRafterAssembly(leftSectionRafterLength - 0.05, false, false)}
                </group>

                {/* Right Rafter Segment from Apex DOWN to Middle Column (pointing RIGHT) */}
                <group position={[middleColumnX_EP, middleColHeightFinal, 0]} rotation={[0, 0, -middleSectionAngle]}>
                    {createRafterAssembly(middleSectionRafterLength - 0.05, true)}
                </group>

                {/* Middle Rafter Segment from Middle Column DOWN to Right Column (Appentis section) */}
                {/* Extends beyond Right column by extendRightX */}
                <group position={[rightColumnX_EP + extendRightX, rightColHeight - (extendRightX * Math.tan(rightSectionAngle)), 0]} rotation={[0, 0, -rightSectionAngle]}>
                    {/* USER REQUEST: Remove reinforcement (haunch) */}
                    {createRafterAssembly(rightSectionRafterLength - 0.05, true, false)}
                </group>

                {/* Diagonal Braces omitted as per user request for EPONA/TALIAN 5 */}
            </group>
        );
    }

    // --- ASYMMETRIC 2 ZONES (3 Columns) ---
    if (isAsymetrique2) {
        // Calculate column heights with offsets
        const rafterDepth = 0.35;
        const leftRafterVert = rafterDepth / Math.cos(leftSectionAngle);
        const rightRafterVert = rafterDepth / Math.cos(rightSectionAngle);
        const middleRafterVert = rafterDepth / Math.cos(middleSectionAngle);

        const leftColOffset = leftRafterVert - 0.20;
        const rightColOffset = rightRafterVert - 0.20;
        const middleColOffset = middleRafterVert - 0.20;

        const leftColHeight = leftEaveHeight + leftColOffset;
        const rightColHeight = rightEaveHeight + rightColOffset;
        const middleColHeightFinal = middleColumnHeight + middleColOffset;

        // Create VERTICAL column geometries
        const leftColumnGeo = createSlantedColumn(baseColumnProfile, 0, false, leftColHeight);
        const rightColumnGeo = createSlantedColumn(baseColumnProfile, 0, false, rightColHeight);
        const middleColumnGeo = createSlantedColumn(baseColumnProfile, 0, false, middleColHeightFinal);

        // Calculate rafter lengths
        // Left section: from left column down to apex (short side)
        const leftSectionRafterLength = (leftSectionSpan + horizontalOverhang) / Math.cos(leftSectionAngle);

        // Right section part 1: from right column up to middle column
        const rightSectionRafterLength = (rightSectionSpan + horizontalOverhang) / Math.cos(rightSectionAngle);

        // Middle section: from middle column up to apex
        const middleSectionRafterLength = (middleSectionSpan + horizontalOverhang / 2) / Math.cos(middleSectionAngle);

        return (
            <group position={position}>
                {/* Left Column - VERTICAL */}
                <mesh geometry={leftColumnGeo} material={steelMaterial} position={[-width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Middle Column - VERTICAL (on right side, intermediate) */}
                <mesh geometry={middleColumnGeo} material={steelMaterial} position={[middleColumnX, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Right Column - VERTICAL */}
                <mesh geometry={rightColumnGeo} material={steelMaterial} position={[width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Main Apex Assembly at Ridge (Diamond Gusset) - at 1/4 from left */}
                <group position={[apexX, effectiveRidgeHeight + (isAcama && isSymetrique && Math.abs(width - 18.8) < 0.1 ? 0.1 : 0), 0]}>
                    {createApexHaunchAssemblySCREB(leftSectionAngle, middleSectionAngle)}
                </group>

                {/* Intermediate junction at Middle Column */}
                <group position={[middleColumnX, middleColHeightFinal + (isAcama && isSymetrique && Math.abs(width - 18.8) < 0.1 ? 0.1 : 0), 0]}>
                    {createApexHaunchAssemblySCREB(middleSectionAngle, rightSectionAngle)}
                </group>

                {/* Left Rafter (from left column UP to apex - short side) - pointing RIGHT */}
                <group position={[-width / 2, leftColHeight, 0]} rotation={[0, 0, leftSectionAngle]}>
                    {createRafterAssembly(leftSectionRafterLength - 0.05, false)}
                </group>

                {/* Middle Rafter (from apex DOWN to middle column) - pointing RIGHT */}
                <group position={[width / 2, rightColHeight, 0]} rotation={[0, 0, -rightSectionAngle]}>
                    {createRafterAssembly(rightSectionRafterLength - 0.05, true)}
                </group>

                {/* Right Rafter (from middle column DOWN to right eave) - pointing RIGHT */}
                <group position={[middleColumnX, middleColHeightFinal, 0]} rotation={[0, 0, -middleSectionAngle]}>
                    {createRafterAssembly(middleSectionRafterLength - 0.05, true)}
                </group>

            </group>

        );
    }

    // --- OMBRIÈRE PL (Poids Lourd - Vertical Cols, Monopente 10°) ---
    const isOmbrierePL = buildingType === 'ombriere_pl';

    if (isOmbrierePL) {
        // Shared Params
        const slopeRad = (roofPitch * Math.PI) / 180;
        const rotZ = -slopeRad; // Descending to right (Monopente standard here seems 10 deg)
        // Check images: Image 1 (15.8m) -> High Left, Low Right.

        // Rafter Length (Full Width / cos(slope))
        const rafterLen = width / Math.cos(slopeRad);
        const rafterGeo = createRafterGeo(rafterLen);

        // Column Positions logic
        // We center the structure at x=0

        let columns = [];

        if (Math.abs(width - 15.8) < 0.1) {
            // 15.8m Spec: 2 Columns, 8m spacing.
            // Centered: -4m and +4m
            columns = [-4.0, 4.0];
        } else if (Math.abs(width - 20.2) < 0.1) {
            // 20.2m Spec: 3 Columns?
            // Image 2: "20530" Total. Spans: 4018 (Overhang) + 8000 + 8000 + (Right overhang implied small?)
            // Wait, Image 2: Left Overhang 4018. Col 1. Span 8000. Col 2. Span 8000. Col 3. Right Overhang?
            // Actually Image 2 dimensions: 4018 + 8000 + 8000 + ??
            // Total 20.2m. 4+8+8 = 20. So tiny right overhang? 
            // Or maybe 4.0m Left Overhang, then 8m, then 8m. 
            // Positions relative to LEFT (-width/2):
            // x1 = -width/2 + 4.1 (approx)
            // x2 = x1 + 8
            // x3 = x2 + 8

            // Let's center the standard "8m+8m" block? 
            // If total width is 20.2.
            // Let's try to match the image visual. 
            // Image 2: Large overhang on Left (High side). 
            // Columns at: x1, x2, x3. 
            // Distance x1-x2 = 8m. x2-x3 = 8m.
            // Left overhang ~4m.
            // 4.1 + 8 + 8 = 20.1. (+0.1 margin). 
            // So roughly: Overhang 4.1, Span 8, Span 8, Overhang ~0.1 (flush right?).
            // Let's center the whole thing? No, markers usually relative to structure.
            // If we center the building at 0.
            // Width 20.2. Left = -10.1. Right = 10.1.
            // Col 1 = -10.1 + 4.1 = -6.0.
            // Col 2 = -6.0 + 8.0 = 2.0.
            // Col 3 = 2.0 + 8.0 = 10.0 (Almost at Edge).
            columns = [-6.0, 2.0, 10.0];

        } else if (Math.abs(width - 24.6) < 0.1) {
            // 24.6m Spec: 3 Columns.
            // Image 3: 4325 + 8000 + 8000 + 4325.
            // Symmetric 2 spans + 2 overhangs.
            // Center is middle column.
            columns = [-8.0, 0.0, 8.0];
        } else {
            // Fallback for custom widths: 2 columns centered 
            columns = [-4.0, 4.0];
        }

        // Height Logic
        // Ridge Height (Left/High) vs Eave Height (Right/Low).
        // eaveHeight in store usually refers to the lowest point (Sablière).
        // For PL, we likely set Eave (Low) and calculate Ridge.
        // Store for 15.8m -> Eave 6.0m? (Need to check store values)
        // Store for 20.2m -> Eave 6.5m?
        // Store for 24.6m -> Eave 7.0m?

        // Rafter Equation from Center of Group (0,0):
        // Height(x) = C - x * tan(angle) (Since angle is positive slope from left? No, rotZ is negative).
        // Let's define Pivot at the Right Eave (Lowest Point).
        // PivotX = width/2. Y = eaveHeight.
        // Height(x) = eaveHeight + (width/2 - x) * tan(slope)

        // Create Columns
        const createVerticalCol = (xPos) => {
            // Calculate Top Height at this X
            const topY = eaveHeight + (width / 2 - xPos) * Math.tan(slopeRad);
            // Column Geometry
            const colGeo = createSlantedColumn(baseColumnProfile, 0, false, topY - 0.2); // -0.2 for rafter connection
            return (
                <mesh key={xPos} geometry={colGeo} material={steelMaterial} position={[xPos, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} castShadow />
            );
        };

        // Center Height (for Rafter positioning)
        // Rafter group is at [0, centerHeight, 0] rotated by rotZ.
        // CenterHeight is height at x=0.
        const centerHeight = eaveHeight + (width / 2) * Math.tan(slopeRad);

        return (
            <group position={position}>
                {/* Columns */}
                {columns.map(x => createVerticalCol(x))}

                {/* Rafter (Single Piece) */}
                {/* Group Position: Top of Left Column (Ridge Height) */}
                <group position={[0, centerHeight, 0]} rotation={[0, 0, rotZ]}>
                    {/* Rafter is centered in local X.
                         USER REQUEST 14/01/2026: Shift 50% to right along slope. */}
                    <mesh geometry={rafterGeo} material={steelMaterial} position={[isOmbrierePL ? (rafterLen * 0.5) : 0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow />
                </group>

                {/* BRACING (Croix de St André) for PL 15.8m, 20.2m, 24.6m */}
                {(Math.abs(width - 15.8) < 0.1 || Math.abs(width - 20.2) < 0.1 || Math.abs(width - 24.6) < 0.1) && (() => {
                    let x1, x2;

                    if (Math.abs(width - 15.8) < 0.1) {
                        // 15.8m: Columns at -4, 4. Bracing between them.
                        x1 = -4.0;
                        x2 = 4.0;
                    } else if (Math.abs(width - 20.2) < 0.1) {
                        // 20.2m: Columns at -6, 2, 10. Bracing between RIGHT pair (2 and 10).
                        x1 = 2.0;
                        x2 = 10.0;
                    } else if (Math.abs(width - 24.6) < 0.1) {
                        // 24.6m: Columns at -8, 0, 8. Bracing between RIGHT pair (0 and 8).
                        x1 = 0.0;
                        x2 = 8.0;
                    }

                    // Calculate Top Heights (under rafter)
                    const yTop1 = eaveHeight + (width / 2 - x1) * Math.tan(slopeRad) - 0.2;
                    const yTop2 = eaveHeight + (width / 2 - x2) * Math.tan(slopeRad) - 0.2;
                    const yBot = 0.0;

                    // 1. Calculate Intersection Height for Horizontal Beam
                    // yTop2 < yTop1 (slope down to right)
                    // Line 1 (x1,0) to (x2, yTop2) -> y = (yTop2 / 8) * (x - x1)
                    // Line 2 (x2,0) to (x1, yTop1) -> y = (yTop1 / -8) * (x - x2)
                    // Note: Span is always 8m (4 to -4, 10 to 2, 8 to 0).
                    // Delta X = 8.

                    // Intersection X relative to x1:
                    // x_rel = 8 * yTop1 / (yTop1 + yTop2) ? No.
                    // Standard intersection of two lines from (0,0)-(w,h2) and (w,0)-(0,h1).
                    // x_int = w * h1 / (h1 + h2)  (distance from 2nd point, i.e. x2)
                    // y_int = h1 * h2 / (h1 + h2)

                    const h1 = yTop1;
                    const h2 = yTop2;
                    // intersectY is simplified formula for trapezoid visuals
                    const intersectY = (h1 * h2) / (h1 + h2);

                    // X coord of intersection
                    // x_int_from_x1 = 8 * h1 / (h1 + h2) -> This is distance from x1.

                    const span = Math.abs(x2 - x1); // Should be 8.

                    // But wait, the previous code had specific intersectX logic.
                    // Let's use the generic one now.
                    // Also previous code IntersectY was `yTop2/8 * (intersectX + 4)` -> Re-calculating Y on line.
                    // The generic formula `y = h1*h2/(h1+h2)` is cleaner.

                    // However, x1 corresponds to yTop1? Yes.
                    // So Line 1 is (x1, 0) to (x2, y2). NO.
                    // Bracing is (Bottom1 to Top2) and (Bottom2 to Top1).
                    // Point 1: (x1, 0). Point 2: (x2, y2). -> L1.
                    // Point 3: (x2, 0). Point 4: (x1, y1). -> L2.
                    // L1: y = (y2 / span) * (x - x1).
                    // L2: y = (y1 / -span) * (x - x2).
                    // Solve: (y2/S)(x-x1) = (-y1/S)(x-x2)
                    // y2(x-x1) = -y1(x-x2)
                    // y2*x - y2*x1 = -y1*x + y1*x2
                    // x(y1+y2) = y1*x2 + y2*x1
                    // x = (y1*x2 + y2*x1) / (y1+y2). Weighted average!

                    const intersectX = (yTop1 * x2 + yTop2 * x1) / (yTop1 + yTop2);

                    // 2. Horizontal Beam
                    // USER REQUEST 15/01/2026: Shift 50cm left.
                    const beamGeo = <mesh position={[intersectX - 0.5, intersectY, 0]} castShadow>
                        <boxGeometry args={[span, 0.15, 0.15]} />
                        <meshStandardMaterial color="#8a949b" metalness={0.6} roughness={0.4} />
                    </mesh>;

                    // 3. Cross Bracing
                    const p1Bot = new THREE.Vector3(x1, yBot + 0.1, 0);
                    const p2Bot = new THREE.Vector3(x2, yBot + 0.1, 0);
                    const p1Top = new THREE.Vector3(x1, yTop1 - 0.1, 0);
                    const p2Top = new THREE.Vector3(x2, yTop2 - 0.1, 0);

                    const createBar = (start, end) => {
                        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                        const len = start.distanceTo(end);
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;
                        const angle = -Math.atan2(dx, dy);
                        return (
                            <mesh position={mid} rotation={[0, 0, angle]} castShadow>
                                <boxGeometry args={[0.05, len, 0.05]} />
                                <meshStandardMaterial color="#4A5568" roughness={0.8} />
                            </mesh>
                        );
                    };

                    return (
                        <group>
                            {beamGeo}
                            {createBar(p1Bot, p2Top)}
                            {createBar(p2Bot, p1Top)}
                        </group>
                    );
                })()}

                {/* No struts (Bracons) for PL based on images? 
                    Images show bracing (Croix de St André) between columns but no diagonal struts (bracons) under rafters? 
                    Actually Image 1 shows a small knee brace (jarret) or simple connection. 
                    Images 2 & 3 show large cross bracing between columns.
                    Let's stick to simple columns + rafter for now unless "croix" requested. 
                    The "V" shape struts of VL are NOT present.
                */}
            </group>
        );
    }

    // --- OMBRIÈRE VL SIMPLE & DOUBLE (V-Shape Structure) ---
    const isOmbriereSimple = buildingType === 'ombriere_vl_simple_droite' || buildingType === 'ombriere_vl_simple_gauche';
    const isOmbriereDouble = buildingType === 'ombriere_vl_double';

    if (isOmbriereSimple || isOmbriereDouble) {
        const isDroite = buildingType === 'ombriere_vl_simple_droite';

        // Slope Logic:
        // Combined to always slope down-right for these types
        const slopeRad = (roofPitch * Math.PI) / 180;
        const rotZ = -slopeRad; // Fixed to Down-Right

        // Rafter
        const rafterLen = width / Math.cos(slopeRad);
        const rafterGeo = createRafterGeo(rafterLen);

        // Strut Shifting Logic (From Backup)
        // "Droite": Shift 1m Left (towards Faitage). 
        // "Gauche": Shift 1m Right (towards Sablière).
        // "Double": Centered (0).
        let strutShift = 0;
        if (buildingType === 'ombriere_vl_simple_gauche') strutShift = 1.0;
        if (buildingType === 'ombriere_vl_simple_droite') strutShift = -1.0;

        // Base Strut Positions (From Backup Dimensions)
        // Bottom: Spaced by 1m (+/- 0.5)
        // Top: Spaced by 3m (+/- 1.5) to create V
        const xBot1 = -0.5 + strutShift;
        const xBot2 = 0.5 + strutShift;
        const xTop1 = -1.5 + strutShift;
        const xTop2 = 1.5 + strutShift;

        // Base Horizontal Position
        // USER REQUEST: "Obliques jusqu'au sol" -> Base 0.0
        const baseHeight = 0.0;

        // Center Height Logic
        // Calculate based on eaveHeight + rise to midpoint
        const midRise = (width / 2) * Math.tan(slopeRad);
        let centerHeight = eaveHeight + midRise;

        // Height Adjustments
        if (isOmbriereDouble) {
            centerHeight -= 0.20;
        }
        if (isOmbriereSimple) {
            centerHeight += 0.30;
        }

        // Custom Strut Creator
        const createStrut = (xBot, xTop) => {
            const yTarget = centerHeight + (xTop * Math.tan(rotZ)) - 0.2;
            const start = new THREE.Vector3(xBot, baseHeight, 0);
            const end = new THREE.Vector3(xTop, yTarget, 0);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const len = start.distanceTo(end);

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const angle = -Math.atan2(dx, dy);

            const tubeGeo = new THREE.BoxGeometry(0.15, len, 0.15);

            return (
                <mesh geometry={tubeGeo} material={steelMaterial} position={mid} rotation={[0, 0, angle]} castShadow />
            );
        };

        return (
            <group position={position}>
                {/* Struts */}
                {createStrut(xBot1, xTop1)}
                {createStrut(xBot2, xTop2)}

                {/* HORIZONTAL BAR (Double 11.3m only) */}
                {(() => {
                    if (isOmbriereDouble && Math.abs(width - 11.3) < 0.1) {
                        const hBarHeight = 2.2;
                        const yTop1 = centerHeight + (xTop1 * Math.tan(rotZ)) - 0.2;
                        const yTop2 = centerHeight + (xTop2 * Math.tan(rotZ)) - 0.2;

                        // Interpolate X at hBarHeight
                        const t1 = (hBarHeight - baseHeight) / (yTop1 - baseHeight);
                        const xL = xBot1 + (xTop1 - xBot1) * t1;

                        const t2 = (hBarHeight - baseHeight) / (yTop2 - baseHeight);
                        const xR = xBot2 + (xTop2 - xBot2) * t2;

                        const len = Math.abs(xR - xL);
                        const cx = (xL + xR) / 2;

                        return (
                            <mesh position={[cx, hBarHeight, 0]} castShadow>
                                <boxGeometry args={[len + 0.15, 0.15, 0.15]} />
                                <meshStandardMaterial color="#8a949b" metalness={0.6} roughness={0.4} />
                            </mesh>
                        );
                    }
                    return null;
                })()}

                {/* SAINT ANDREW'S CROSS (Croix de Saint-André) - Logic from Backup */}
                {(() => {
                    const yTop1 = centerHeight + (xTop1 * Math.tan(rotZ)) - 0.2;
                    const yTop2 = centerHeight + (xTop2 * Math.tan(rotZ)) - 0.2;



                    // Start from base or Horizontal Bar
                    let startY = baseHeight + 0.1;
                    if (isOmbriereDouble && Math.abs(width - 11.3) < 0.1) {
                        startY = 2.2 + 0.15 / 2; // Top of horizontal bar
                    }

                    const pBot1 = new THREE.Vector3(xBot1, startY, 0);
                    const pBot2 = new THREE.Vector3(xBot2, startY, 0);

                    // Update X positions for pBot if starting higher (interpolated)
                    if (startY > baseHeight + 0.2) {
                        // Interpolate X at startY
                        const t1 = (startY - baseHeight) / (yTop1 - baseHeight);
                        pBot1.x = xBot1 + (xTop1 - xBot1) * t1;

                        const t2 = (startY - baseHeight) / (yTop2 - baseHeight);
                        pBot2.x = xBot2 + (xTop2 - xBot2) * t2;
                        pBot1.y = startY;
                        pBot2.y = startY;
                    }

                    // End almost at the top
                    const pTop1 = new THREE.Vector3(xTop1, yTop1 - 0.1, 0);
                    const pTop2 = new THREE.Vector3(xTop2, yTop2 - 0.1, 0);

                    const createBar = (start, end) => {
                        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                        const len = start.distanceTo(end);
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;
                        const angle = -Math.atan2(dx, dy);
                        // Thinner profile for cross bracing (e.g., 5cm)
                        return (
                            <mesh position={mid} rotation={[0, 0, angle]} castShadow>
                                <boxGeometry args={[0.05, len, 0.05]} />
                                <meshStandardMaterial color="#4A5568" roughness={0.8} />
                            </mesh>
                        );
                    };

                    return (
                        <group>
                            {createBar(pBot1, pTop2)}
                            {createBar(pBot2, pTop1)}
                        </group>
                    );
                })()}

                {/* Rafter */}
                {/* Centered at [0, centerHeight, 0], rotated */}
                <group position={[0, centerHeight, 0]} rotation={[0, 0, rotZ]}>
                    <mesh geometry={rafterGeo} material={steelMaterial} position={[rafterLen / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow />
                </group>

                {/* Foundation Block (Hidden for ALL Ombrière VL as requested) */}
            </group>
        );

    }

    return (
        <group position={position}>
            {/* Columns (Rendered same as start, assuming mostly sym verticality or accept cut angle diff) */}
            <mesh geometry={leftColumnGeo} material={steelMaterial} position={[-width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />
            <mesh geometry={rightColumnGeo} material={steelMaterial} position={[width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

            {/* Apex Assembly (Diamond Gusset) */}
            {/* Positioned at the ridge apex.
                We subtract a small offset to align the diamond center/top with the rafter intersection.
                If (0,0) of diamond is Top Apex, we place it exactly at [apexX, effectiveRidgeHeight, 0].
                For EPONA, the diamond is lowered by 50cm.
             */}
            <group position={[apexX, effectiveRidgeHeight - (buildingType === 'epona' ? 0.65 : (isAcama && isSymetrique && Math.abs(width - 17.5) < 0.1 ? -0.3 : (isAcama && isSymetrique && Math.abs(width - 18.8) < 0.1 ? -0.1 : 0))), 0]}>
                {createApexHaunchAssemblySCREB(lAngle, rAngle)}
            </group>

            {/* Left Rafter */}
            {/* Positioned at Left Column Eave, Rotated by lAngle */}
            <group position={[-width / 2, leftColHeight, 0]} rotation={[0, 0, lAngle]}>
                {/* Note: using `rightColHeight` as baseline for consistency with previous code, 
                     assuming eaves are level.
                     We use `createRafterAssembly` which creates rafter + eave haunch + plate.
                  */}
                {createRafterAssembly(leftRafterLength - 0.05, false)}
            </group>

            {/* Right Rafter */}
            <group position={[width / 2, rightColHeight, 0]} rotation={[0, 0, -rAngle]}>
                {createRafterAssembly(rightRafterLength - 0.05, true)}
            </group>

        </group>
    );
}


