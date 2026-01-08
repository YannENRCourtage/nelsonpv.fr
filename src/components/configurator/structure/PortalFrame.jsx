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
    const isMonopente = buildingType === 'monopente';
    const isAsymetrique = buildingType === 'asymetrique_1'; // Corrected ID
    const isAsymetrique2 = buildingType === 'asymetrique_2'; // NEW: 2 zones

    let leftSpan, rightSpan, lAngle, rAngle, effectiveRidgeHeight, apexX;
    let leftEaveHeight = eaveHeight; // Default
    let rightEaveHeight = eaveHeight; // Default

    // NEW: For asymmetric_2
    let middleColumnX, middleColumnHeight;
    let leftSectionSpan, rightSectionSpan, middleSectionSpan;
    let leftSectionAngle, rightSectionAngle, middleSectionAngle;

    // Determine Geometry params based on Type
    if (isAsymetrique2) {
        // Asymmetrical 2 Zones: apex positioned so that:
        // - Right slope (from right wall to apex) = 3/4 of total width
        // - Left slope (from apex to left wall) = 1/4 of total width
        const mainPitch = 15 * (Math.PI / 180);

        // Fixed heights
        rightEaveHeight = 4.0;

        // Middle column is ALWAYS at 13.1m from the left wall post
        middleColumnX = -width / 2 + 13.1;

        // Calculate distances
        const distLeftToMiddle = 13.1; // From left wall to middle column

        // Apex position: 1/4 from left (or 3/4 from right)
        // Right slope = 3/4, Left slope = 1/4
        leftSpan = width * 0.25;  // Left side is SHORTER (1/4)
        rightSpan = width * 0.75; // Right side is LONGER (3/4)
        apexX = -width / 2 + leftSpan; // Apex at 1/4 from left

        // For 25.5m width:
        if (Math.abs(width - 25.5) < 0.1) {
            leftEaveHeight = 6.9;
            effectiveRidgeHeight = 8.9;
        } else if (Math.abs(width - 29.1) < 0.1) {
            leftEaveHeight = 7.9;
            effectiveRidgeHeight = 9.8;
        } else {
            // Fallback: calculate based on 15° slope from right
            leftEaveHeight = 6.9;
            effectiveRidgeHeight = rightEaveHeight + (rightSpan * Math.tan(mainPitch));
        }

        // Both slopes are 15°
        rAngle = mainPitch;
        lAngle = mainPitch;

        // Calculate middle column height using linear interpolation
        // The middle column is on the RIGHT section (between apex and right eave)
        // Distance from apex to middle column
        const distApexToMiddle = middleColumnX - apexX;
        const ratio = distApexToMiddle / rightSpan;
        const rightSectionRise = effectiveRidgeHeight - rightEaveHeight;
        middleColumnHeight = effectiveRidgeHeight - (rightSectionRise * ratio);

        // Calculate section angles and spans for rafters
        // The middle column is in the RIGHT section (between apex and right eave)

        // Section 1: Left eave to apex (short side - 1/4 of width)
        leftSectionSpan = leftSpan;
        const leftSectionRise = effectiveRidgeHeight - leftEaveHeight;
        leftSectionAngle = Math.atan(leftSectionRise / leftSectionSpan);

        // Section 2: Apex to middle column (first part of right slope)
        middleSectionSpan = distApexToMiddle;
        const middleSectionRise = effectiveRidgeHeight - middleColumnHeight;
        middleSectionAngle = Math.atan(middleSectionRise / middleSectionSpan);

        // Section 3: Middle column to right eave (second part of right slope)
        rightSectionSpan = rightSpan - distApexToMiddle;
        const rightSectionRise2 = middleColumnHeight - rightEaveHeight;
        rightSectionAngle = Math.atan(rightSectionRise2 / rightSectionSpan);

    } else if (isAsymetrique) {
        // Asymmetrical: Right Eave 4.0m, Left/Right Slope 15°.
        const mainPitch = 15 * (Math.PI / 180);

        rightSpan = width * 0.75;
        leftSpan = width * 0.25;
        apexX = -width / 2 + leftSpan;

        // Angles
        rAngle = mainPitch;
        lAngle = mainPitch;

        // Fixed Right Eave
        rightEaveHeight = 4.0;

        // Ridge
        const rightRise = rightSpan * Math.tan(rAngle);
        effectiveRidgeHeight = rightEaveHeight + rightRise;

        // Left Eave
        const leftDrop = leftSpan * Math.tan(lAngle);
        leftEaveHeight = effectiveRidgeHeight - leftDrop;

    } else if (isMonopente) {
        // Monopente Logic
        const monoSlopeRad = Math.atan((ridgeHeight - eaveHeight) / width);
        lAngle = monoSlopeRad; // Not really used same way but for vars consistency
        rAngle = monoSlopeRad;
        effectiveRidgeHeight = ridgeHeight;
        // ...
    } else {
        // Symmetrical
        const symAngleRad = (roofPitch * Math.PI) / 180;
        lAngle = symAngleRad;
        rAngle = symAngleRad;
        leftSpan = width / 2;
        rightSpan = width / 2;
        effectiveRidgeHeight = ridgeHeight; // OR calculated?
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
    const createRafterAssembly = (length, isRight) => {
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
                <group position={[0, -0.2, 0]} rotation={[0, isRight ? -Math.PI / 2 : Math.PI / 2, 0]}>
                    <mesh geometry={haunchGeo} material={steelMaterial} position={[0, 0, 0]} castShadow />
                </group>

                {/* End Plate (At origin) */}
                {/* Center of plate at (0, -0.1, 0) approx to cover join */}
                <mesh geometry={plateGeo} material={steelMaterial} position={[isRight ? -plateThickness / 2 : plateThickness / 2, -0.1, 0]} rotation={[0, Math.PI / 2, 0]} castShadow />

                {/* Bolts */}
                {/* Use Instances or simple mesh for now inside group (InstancedMesh is better at Frame level, but simpler here for strict placement) */}
                {boltPositions.map((pos, idx) => (
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
                {/* Group Position: Top of Left Column (Ridge Height) */}
                <group position={[-width / 2, ridgeHeight, 0]} rotation={[0, 0, derivedAngle]}>
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
                <group position={[apexX, effectiveRidgeHeight, 0]}>
                    {createApexHaunchAssemblySCREB(leftSectionAngle, middleSectionAngle)}
                </group>

                {/* Intermediate junction at Middle Column */}
                <group position={[middleColumnX, middleColHeightFinal, 0]}>
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

    return (
        <group position={position}>
            {/* Columns (Rendered same as start, assuming mostly sym verticality or accept cut angle diff) */}
            <mesh geometry={leftColumnGeo} material={steelMaterial} position={[-width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />
            <mesh geometry={rightColumnGeo} material={steelMaterial} position={[width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

            {/* Apex Assembly (Diamond Gusset) */}
            {/* Positioned at the ridge apex.
                We subtract a small offset to align the diamond center/top with the rafter intersection.
                If (0,0) of diamond is Top Apex, we place it exactly at [apexX, effectiveRidgeHeight, 0].
             */}
            <group position={[apexX, effectiveRidgeHeight, 0]}>
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


