import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile } from '../utils/profiles.js';
import { SolarPanels } from './SolarPanels.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';

export function Roof({ width, length, roofPitch, eaveHeight, ridgeHeight, buildingType = 'symetrique' }) {
    const { isAcama } = useConfiguratorValues();
    // Material: RAL 7016 (Anthracite Grey)
    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016 approx
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    const isMonopente = buildingType === 'monopente';
    const isAsymetrique = buildingType === 'asymetrique_1';
    const isAsymetrique2 = buildingType === 'asymetrique_2';
    const isEpona = isAcama && (buildingType === 'epona' || buildingType === 'epona_talian5');
    // const isAcamaTalian5 = isAcama && buildingType === 'asymetrique_2' && Math.abs(width - 27.6) < 0.1; // OBSOLÈTE
    // ==========================================
    // HOOKS (Must be unconditional)
    // ==========================================

    // --- 1. Monopente Geometries ---
    const monoDeltaH = ridgeHeight - eaveHeight; // 7.4 - 4.0 = 3.4
    const monoSlopeAngle = isMonopente ? Math.atan(monoDeltaH / width) : 0;
    // Overhangs: 50cm horizontal projection each side -> Total Width + 1.0
    // Fallback 1.0 to avoid NaN if logic skipped, though useMemo dep array handles it.
    const monoSlopeLength = isMonopente ? (width + 1.0) / Math.cos(monoSlopeAngle) : 1.0;

    const monoProfile = useMemo(() => createTrapezoidalProfile(monoSlopeLength, 0.035, 0.25), [monoSlopeLength]);
    const monoGeometry = useMemo(() => new THREE.ExtrudeGeometry(monoProfile, {
        depth: length + 1.0, // Front/Back Overhang
        bevelEnabled: false
    }), [monoProfile, length]);

    // --- 2. Asymmetrical Geometries ---
    // Asym Rules: 15° Right, 12° Left
    const asymRAngle = 15 * (Math.PI / 180);
    const asymLAngle = 12 * (Math.PI / 180);
    const asymRightSpan = width * 0.75;
    const asymLeftSpan = width * 0.25;

    const asymRightSlopeGeoLength = asymRightSpan / Math.cos(asymRAngle);
    const asymLeftSlopeGeoLength = asymLeftSpan / Math.cos(asymLAngle);

    // User Request: Left Covering ends above column (No Overhang). Right standard (0.50).
    const asymRightOverhang = 0.50;
    const asymLeftOverhang = 0.0;

    const asymRightRoofLength = asymRightSlopeGeoLength + asymRightOverhang;
    const asymLeftRoofLength = asymLeftSlopeGeoLength + asymLeftOverhang;

    const asymRightProfile = useMemo(() => createTrapezoidalProfile(asymRightRoofLength, 0.035, 0.25), [asymRightRoofLength]);
    const asymLeftProfile = useMemo(() => createTrapezoidalProfile(asymLeftRoofLength, 0.035, 0.25), [asymLeftRoofLength]);

    const asymRightGeo = useMemo(() => new THREE.ExtrudeGeometry(asymRightProfile, { depth: length + 1.0, bevelEnabled: false }), [asymRightProfile, length]);
    const asymLeftGeo = useMemo(() => new THREE.ExtrudeGeometry(asymLeftProfile, { depth: length + 1.0, bevelEnabled: false }), [asymLeftProfile, length]);

    // --- 3. Symmetrical Geometries (Default) ---
    const symAngleRad = (roofPitch * Math.PI) / 180;
    const symHalfWidth = width / 2;
    const symGeometricSlopeLength = symHalfWidth / Math.cos(symAngleRad);
    const symOverhang = 0.50; // 50cm Eave Overhang
    const symRoofSlopeLength = symGeometricSlopeLength + symOverhang;

    const symProfile = useMemo(() => createTrapezoidalProfile(symRoofSlopeLength, 0.035, 0.25), [symRoofSlopeLength]);
    const symGeometry = useMemo(() => new THREE.ExtrudeGeometry(symProfile, {
        depth: length + 1.0, // Length + 50cm Front + 50cm Back
        bevelEnabled: false
    }), [symProfile, length]);


    // ==========================================
    // RENDER LOGIC
    // ==========================================

    // --- 0. OMBRIÈRE VL SIMPLE & DOUBLE & PL ---
    const isOmbriereSimple = buildingType === 'ombriere_vl_simple_droite' || buildingType === 'ombriere_vl_simple_gauche';
    const isOmbriereDouble = buildingType === 'ombriere_vl_double';
    const isOmbrierePL = buildingType === 'ombriere_pl';

    if (isOmbriereSimple || isOmbriereDouble || isOmbrierePL) {
        // Exact same calculation as PortalFrame (12.2 deg usually)
        const slopeRad = (roofPitch * Math.PI) / 180;
        const rotZ = -slopeRad; // Fixed to Down-Right (High Left) for BOTH

        // Length of slope (Hypotenuse)
        // Adjust for overhangs? Rafter was `width / cos`. 
        // User requested "Toute la surface". We cover the rafter length.
        // USER REQUEST 15/01/2026: Extend coverage by 50cm on each side -> +1.0m total.
        const slopeLen = (width / Math.cos(slopeRad)) + 1.0;

        // Center position (Top of Rafter)
        // Rafter center height = (eave + ridge)/2
        // Rafter Depth (assumed 0.3-0.4?).
        // If Rafter is centered at `centerHeight`, its top is `centerHeight + depth/2`.
        // Let's assume depth 0.4 (IPE400) -> Half is 0.2.
        // We want panels ON TOP, so lift = 0.2 + mount height (e.g. 0.05).
        // User Request: Raise by 60cm for Double.

        // For PL: Rafters are centered at `eave + (width/2)*tan(slope)`.
        // We can re-calculate centerHeight reliably from Eave here to match PortalFrame exactly.
        const midRise = (width / 2) * Math.tan(slopeRad);

        // Base Center Height (Matches PortalFrame base logic)
        let centerHeight = eaveHeight + midRise;

        // USER REQUEST 14/01/2026: Global Height Adjustments
        // Ombrière VL Double: Lower by 1m -> Raise back 80cm => Net -0.20m.
        if (isOmbriereDouble) centerHeight -= 0.20;
        // USER REQUEST 14/01/2026: Global Height Adjustments
        // Ombrière VL Double: Net -0.70m (Lowered 50cm from -0.20m).
        // Simple: +0.55m (Lowered 10cm from +0.65m).
        if (isOmbriereDouble) centerHeight -= 0.70;
        if (isOmbriereSimple) centerHeight += 0.55;

        let lift = 0.25;
        if (isOmbriereDouble) {
            // Previous logic added +0.60 relative to structure. 
            // We keep this because the structure moved down, so the relative cover position is same.
            lift += 0.60;
            if (Math.abs(width - 11.3) < 0.1) {
                lift += 0.25; // Previous raise
                lift -= 0.40; // USER REQUEST 15/01/2026: Lower by 40cm total (-30 -15 +5)
            }
            if (Math.abs(width - 9.1) < 0.1) {
                lift -= 0.15; // USER REQUEST 15/01/2026: Lower by 15cm (-20 +5)
            }
        }
        if (isOmbriereSimple) lift -= 0.40;

        // PL Lift: Default 0.25 seems okay (Just on top of rafter)
        if (isOmbrierePL) {
            // Check if we need specific lift. 
            // Simple Rafter is 0.4m depth. Center at 0. Top at +0.2.
            // Lift 0.25 puts it 5cm above rafter. Good.
        }

        let xShift = 0;
        let yShift = 0;
        if (isOmbrierePL) {
            // Rotation is handled by group.
            // USER REQUEST 15/01/2026: Shift 50% Left.
            // Previous was `xShift = slopeLen * 0.5`. Removing it (setting to 0) shifts it left by half-width.
            xShift = 0;
        }

        return (
            <group position={[0, centerHeight + lift, -length / 2]} rotation={[0, 0, rotZ]}>
                <group position={[xShift, 0, 0]}>
                    <SolarPanels
                        surfaceWidth={slopeLen}
                        surfaceLength={length + 1.0}
                        forceFullCoverage={true}
                        stretchToFit={isOmbrierePL}
                        customGap={
                            (isOmbrierePL && Math.abs(width - 20.2) < 0.1) ? -0.55 :
                                (isOmbrierePL && Math.abs(width - 24.6) < 0.1) ? -0.55 :
                                    (isOmbriereDouble && Math.abs(width - 11.3) < 0.1) ? -0.15 : null
                        }
                    />
                </group>
            </group>
        );
    }

    // --- A. MONOPENTE ---
    if (isMonopente) {
        // Offset Logic
        const purlinHeight = 0.140;
        const roofThickness = 0.001;
        const perpOffset = (purlinHeight / 2) + (roofThickness / 2) + 0.35;

        const centerY = eaveHeight + (monoDeltaH / 2);
        // Normal to slope (-angle) is (sin, cos)
        const offX = perpOffset * Math.sin(monoSlopeAngle);
        const offY = perpOffset * Math.cos(monoSlopeAngle);

        return (
            <group>
                <mesh
                    geometry={monoGeometry}
                    material={roofMaterial}
                    position={[offX, centerY + offY - 0.06, -length - 0.5]}
                    rotation={[0, 0, -monoSlopeAngle]} // Negative Angle
                    castShadow receiveShadow
                />
                <group position={[offX, centerY + offY - 0.06, -length / 2]} rotation={[0, 0, -monoSlopeAngle]}>
                    <SolarPanels surfaceWidth={monoSlopeLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- B0. EPONA ---
    if (isEpona && buildingType !== 'epona_talian5') {
        // Geometric Constants from Image 3
        const mainSlope = 17 * (Math.PI / 180);
        const leftEaveH = 5.0;

        // The building spans 23.60m from Left to Middle column, and 7.85m to Right column.
        // Apex is strictly 11.8m from Left Column.
        const leftSpan = 11.8;
        const rightSpan = 11.8 + 7.85; // 19.65

        // Overhangs
        const extendLeftX = 2.55;
        const extendRightX = 1.25; // Restored (from 0)



        // Total panels
        const leftTotalSpanX = leftSpan + extendLeftX;
        const leftRoofLength = leftTotalSpanX / Math.cos(mainSlope);

        const rightTotalSpanX = rightSpan + extendRightX;
        const rightRoofLength = rightTotalSpanX / Math.cos(mainSlope);

        // Geometries
        const leftProfile = createTrapezoidalProfile(leftRoofLength, 0.035, 0.25);
        const rightProfile = createTrapezoidalProfile(rightRoofLength, 0.035, 0.25);

        const leftGeo = new THREE.ExtrudeGeometry(leftProfile, { depth: length + 1.0, bevelEnabled: false });
        const rightGeo = new THREE.ExtrudeGeometry(rightProfile, { depth: length + 1.0, bevelEnabled: false });

        // Offsets
        const getOffsetProps = (slopeLen, angle, isRight, overhang) => {
            const centerDist = (slopeLen - overhang) / 2;
            const localX = centerDist * Math.cos(angle);
            const localY = centerDist * Math.sin(angle);

            const extraLift = 0.10;
            const purlinH = 0.140;
            const thick = 0.001;
            const offsetDist = (purlinH / 2) + (thick / 2) + 0.35 + extraLift;

            const nX = isRight ? Math.sin(angle) : -Math.sin(angle);
            const nY = Math.cos(angle);

            return {
                x: localX + (offsetDist * nX),
                y: localY + (offsetDist * nY),
                rot: isRight ? -angle : angle
            };
        };

        const leftProps = getOffsetProps(leftRoofLength, mainSlope, false, extendLeftX);
        const rightProps = getOffsetProps(rightRoofLength, mainSlope, true, extendRightX);

        // Left Post is at X = -11.8. Apex is at X = 0.
        // We calculate base height for the left eave at exactly x = -11.8 - extendLeftX (The very left edge of roof cover)
        // Wait, leftProps center is calculated from the start.
        // Left geometric edge: X_start = -11.8 - extendLeftX.
        // Y_start = 5.0 - extendLeftX * Math.tan(17 deg).
        const leftEdgeX = -11.8 - extendLeftX;
        const leftEdgeY = leftEaveH - (extendLeftX * Math.tan(mainSlope));

        // Right geometric edge:
        const rightEdgeX = 19.65 + extendRightX;
        const apexY = leftEaveH + (leftSpan * Math.tan(mainSlope)); // ~8.60m
        const rightEdgeY = apexY - ((rightSpan + extendRightX) * Math.tan(mainSlope));

        // Center calculation trick:
        // Position of group for right roof panel.
        // The getOffsetProps gives local Center offset from Eave if isRight ? Right Eave : Left Eave.
        // For right roof, `localX` goes from 0 to center. So it starts at the apex and goes right?
        // Wait! In Asymetrique2, section1 starts at middleColumnX... Wait, it starts at the right Eave and goes UP.
        // If isRight=true, "0" is at the eave, and it extends leftwards towards the apex. 
        // Let's position it simply using the midpoint.
        const rightMidX = 0 + (rightTotalSpanX / 2); // 0 is apex, right Total is right of apex
        const rightMidY = apexY - (rightTotalSpanX / 2) * Math.tan(mainSlope);

        const leftMidX = 0 - (leftTotalSpanX / 2);
        const leftMidY = apexY - (leftTotalSpanX / 2) * Math.tan(mainSlope);

        // Apply perp offsets
        const perpOffsetDist = (0.140 / 2) + (0.001 / 2) + 0.35 + 0.10;

        // Right normal is upwards and rightwards (+sin, +cos) rotation is -angle.
        // If angle is positive (mainSlope), normal X is +sin, Normal Y is +cos
        const rNX = Math.sin(mainSlope);
        const rNY = Math.cos(mainSlope);

        // Left normal is upwards and leftwards (-sin, +cos) rotation is +angle.
        const lNX = -Math.sin(mainSlope);
        const lNY = Math.cos(mainSlope);

        const rFinalX = rightMidX + perpOffsetDist * rNX;
        const rFinalY = rightMidY + perpOffsetDist * rNY;

        const lFinalX = leftMidX + perpOffsetDist * lNX;
        const lFinalY = leftMidY + perpOffsetDist * lNY;

        // The ExtrudeGeometry centers the trapezoid around the midpoint if 0,0 is center? No, ExtrudeGeometry starts from x=0 usually based on the shape.
        // createTrapezoidalProfile creates a shape centered horizontally. Yes.

        return (
            <group>
                {/* Left Panel */}
                <mesh geometry={leftGeo} material={roofMaterial}
                    position={[lFinalX, lFinalY, -length - 0.5]}
                    rotation={[0, 0, mainSlope]}
                    castShadow receiveShadow />

                <group>
                    {/* Faitages pour Asym 2 ou EPONA */}
                    <group position={[lFinalX, lFinalY, -length / 2]} rotation={[0, 0, mainSlope]}>
                        <SolarPanels surfaceWidth={leftRoofLength} surfaceLength={length + 1.0} />
                    </group>
                </group>

                {/* Right Panel */}
                <mesh geometry={rightGeo} material={roofMaterial}
                    position={[rFinalX, rFinalY, -length - 0.5]}
                    rotation={[0, 0, -mainSlope]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                <group position={[rFinalX, rFinalY, -length / 2]} rotation={[0, 0, -mainSlope]} scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={rightRoofLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- B0.5 TALIAN 5 ---
    if (buildingType === 'epona_talian5') {
        const leftEaveH = 7.9;
        const effectiveRidgeHeight = 8.1;
        const midEaveH = 6.0;
        const rightEaveH = 4.3;

        const offsetApexFromLeft = 4.13;
        const apexX = -15.4 + offsetApexFromLeft; // -11.27
        const middleColumnX = 0;
        const leftColumnX = -15.4;
        const rightColumnX = 11.0;

        // Débord de 50cm (USER REQUEST 11/03/2026)
        const extendLeftX = 0.5;
        const extendRightX = 0.5;

        // Angle calculations (positive angles)
        const leftAngle = Math.atan((effectiveRidgeHeight - leftEaveH) / offsetApexFromLeft);
        const middleAngle = Math.atan((effectiveRidgeHeight - midEaveH) / (15.4 - offsetApexFromLeft));
        const rightAngle = Math.atan((midEaveH - rightEaveH) / 11.0);

        // Roof segments lengths
        const leftGeoLength = (offsetApexFromLeft + extendLeftX) / Math.cos(leftAngle);
        const middleGeoLength = (15.4 - offsetApexFromLeft) / Math.cos(middleAngle);
        const rightGeoLength = (11.0 + extendRightX) / Math.cos(rightAngle);

        const leftProfile = createTrapezoidalProfile(leftGeoLength, 0.035, 0.25);
        const middleProfile = createTrapezoidalProfile(middleGeoLength, 0.035, 0.25);
        const rightProfile = createTrapezoidalProfile(rightGeoLength, 0.035, 0.25);

        const leftGeo = new THREE.ExtrudeGeometry(leftProfile, { depth: length + 1.0, bevelEnabled: false });
        const middleGeo = new THREE.ExtrudeGeometry(middleProfile, { depth: length + 1.0, bevelEnabled: false });
        const rightGeo = new THREE.ExtrudeGeometry(rightProfile, { depth: length + 1.0, bevelEnabled: false });

        const perpOffset = 0.20 + 0.05 + 0.12; // 20cm (demi-IPE rafter) + 5cm (panne) + 12cm (élévation bac acier supplémentaire)

        // Left Segment (Apex to Left Eave + Overhang) -> centered around midpoint
        const leftStartX = leftColumnX - extendLeftX;
        const leftEndX = apexX;
        const leftMidX = (leftStartX + leftEndX) / 2;
        const leftEdgeY = leftEaveH - extendLeftX * Math.tan(leftAngle);
        const leftMidY = (leftEdgeY + effectiveRidgeHeight) / 2;
        const lNX = -Math.sin(leftAngle);
        const lNY = Math.cos(leftAngle);
        const lFinalX = leftMidX + perpOffset * lNX;
        const lFinalY = leftMidY + perpOffset * lNY;

        // Middle Segment (Apex to Middle Column)
        const midStartX = apexX;
        const midEndX = middleColumnX;
        const midMidX = (midStartX + midEndX) / 2;
        const midMidY = (effectiveRidgeHeight + midEaveH) / 2;
        const mNX = Math.sin(middleAngle);
        const mNY = Math.cos(middleAngle);
        const mFinalX = midMidX + perpOffset * mNX;
        const mFinalY = midMidY + perpOffset * mNY;

        // Right Segment (Middle Column to Right Eave + Overhang)
        const rightStartX = middleColumnX;
        const rightEndX = rightColumnX + extendRightX;
        const rightMidX = (rightStartX + rightEndX) / 2;
        const rightEdgeY = rightEaveH - extendRightX * Math.tan(rightAngle);
        const rightMidY = (midEaveH + rightEdgeY) / 2;
        const rNX = Math.sin(rightAngle);
        const rNY = Math.cos(rightAngle);
        const rFinalX = rightMidX + perpOffset * rNX;
        const rFinalY = rightMidY + perpOffset * rNY;

        return (
            <group>
                <mesh geometry={leftGeo} material={roofMaterial} position={[lFinalX, lFinalY, -length - 0.5]} rotation={[0, 0, leftAngle]} castShadow receiveShadow />
                <group position={[lFinalX, lFinalY, -length / 2]} rotation={[0, 0, leftAngle]}>
                    <SolarPanels surfaceWidth={leftGeoLength} surfaceLength={length + 1.0} />
                </group>

                <mesh geometry={middleGeo} material={roofMaterial} position={[mFinalX, mFinalY, -length - 0.5]} rotation={[0, 0, -middleAngle]} scale={[-1, 1, 1]} castShadow receiveShadow />
                <group position={[mFinalX, mFinalY, -length / 2]} rotation={[0, 0, -middleAngle]} scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={middleGeoLength} surfaceLength={length + 1.0} />
                </group>

                <mesh geometry={rightGeo} material={roofMaterial} position={[rFinalX, rFinalY, -length - 0.5]} rotation={[0, 0, -rightAngle]} scale={[-1, 1, 1]} castShadow receiveShadow />
                <group position={[rFinalX, rFinalY, -length / 2]} rotation={[0, 0, -rightAngle]} scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={rightGeoLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- B. ASYMETRIQUE 2 ZONES & TALIAN 5 ---
    if (isAsymetrique2) {
        // Same slope across sections for default, but TALIAN 5 has specific logic
        let leftAngleAsym2 = 15 * (Math.PI / 180);
        let middleAngleAsym2 = 15 * (Math.PI / 180);
        let rightAngleAsym2 = 15 * (Math.PI / 180);

        let leftEaveHeightAsym2 = 4.0;
        let middleColumnHeightAsym2 = 4.0; // Needs calculation below
        let ridgeHAsym2 = 6.0;

        const w = width;

        let rightSpan, distRightToMiddle, mainSlope;

        // Default Asymetrique 2 Zones (Green Invest)
        leftEaveHeightAsym2 = 4.0; // Base
        mainSlope = 15 * (Math.PI / 180);
        rightSpan = w * 0.75;
        distRightToMiddle = rightSpan * 0.6; // Position arbitraire du poteau milieu
        ridgeHAsym2 = 4.0 + (rightSpan * Math.tan(mainSlope));
        middleColumnHeightAsym2 = ridgeHAsym2 - ((rightSpan - distRightToMiddle) * Math.tan(mainSlope));

        // Aliases for positioning meshes below
        const asymRightEaveH = 4.0;
        const asymLeftEaveH = leftEaveHeightAsym2;
        const middleColumnHeight = middleColumnHeightAsym2;
        const middleColumnX = width / 2 - distRightToMiddle;

        // Section 1: Right (from right eave to middle column)
        const section1Span = distRightToMiddle;
        const section1Length = section1Span / Math.cos(mainSlope);
        const section1Overhang = 0.50;
        const section1RoofLength = section1Length + section1Overhang;

        // Section 2: Middle (from middle column to apex)
        const section2Span = rightSpan - section1Span;
        const section2Length = section2Span / Math.cos(mainSlope);
        const section2RoofLength = section2Length + 0.25; // Half overhang

        // Section 3: Left (from apex to left eave)
        const leftSpan = width * 0.25;
        const section3Length = leftSpan / Math.cos(mainSlope);
        const section3RoofLength = section3Length; // No overhang on left

        // Create geometries for 3 sections (directly, no useMemo in conditional)
        const section1Profile = createTrapezoidalProfile(section1RoofLength, 0.035, 0.25);
        const section2Profile = createTrapezoidalProfile(section2RoofLength, 0.035, 0.25);
        const section3Profile = createTrapezoidalProfile(section3RoofLength, 0.035, 0.25);

        const section1Geo = new THREE.ExtrudeGeometry(section1Profile, { depth: length + 1.0, bevelEnabled: false });
        const section2Geo = new THREE.ExtrudeGeometry(section2Profile, { depth: length + 1.0, bevelEnabled: false });
        const section3Geo = new THREE.ExtrudeGeometry(section3Profile, { depth: length + 1.0, bevelEnabled: false });

        // Positioning helper
        const getOffsetProps = (slopeLen, angle, isRight, overhang) => {
            const centerDist = (slopeLen - overhang) / 2;
            const localX = centerDist * Math.cos(angle);
            const localY = centerDist * Math.sin(angle);

            const extraLift = 0.10;
            const purlinH = 0.140;
            const thick = 0.001;
            const offsetDist = (purlinH / 2) + (thick / 2) + 0.35 + extraLift;

            const nX = isRight ? Math.sin(angle) : -Math.sin(angle);
            const nY = Math.cos(angle);

            return {
                x: localX + (offsetDist * nX),
                y: localY + (offsetDist * nY),
                rot: isRight ? -angle : angle
            };
        };

        // Calculate ACTUAL angles based on geometry (Ridge/Eave Heights)
        // This ensures parallelism with the structure even if pitch is slightly off (e.g. 14.37 vs 15)
        // NEW REQUEST (Step 542 & 562): Width-dependent adjustments
        const isWidth29 = Math.abs(width - 29.1) < 0.1;
        const isWidth25 = Math.abs(width - 25.5) < 0.1;

        // NEW REQUEST 12/01/2026: Cover 2 (Section 2) pitch 15° for 29.1m only
        const rightAngle = isWidth29 ? 15 * (Math.PI / 180) : 14 * (Math.PI / 180);
        // NEW REQUEST 10/01/2026: Cover 3 (Section 1) pitch 15°
        const section1Angle = 15 * (Math.PI / 180);
        const leftAngle = isWidth29 ? 15 * (Math.PI / 180) : 17 * (Math.PI / 180);

        // Left Offset Logic
        // Base was -0.25 (from step 478).
        // For 25.5m: Lower by 20cm -> -0.45.
        // For 29.1m: Raise by 10cm -> -0.25 + 0.10 = -0.15.
        const leftRefOffset = -0.25;
        let leftOffset = leftRefOffset;
        if (isWidth25) leftOffset = leftRefOffset - 0.20;
        if (isWidth29) leftOffset = leftRefOffset + 0.10; // -0.15

        // Right Offset Logic
        // Base was -0.10 (from step 471).
        // NEW REQUEST:
        // For 25.5m: Raise by 10cm -> -0.10 + 0.10 = 0.00.
        // For 29.1m: Raise by 20cm -> -0.10 + 0.20 = +0.10.
        const rightRefOffset = -0.10;

        // Split Offsets for Section 1 (Right) and Section 2 (Middle)
        let section1Offset = rightRefOffset; // Right (Cover 3)
        let section2Offset = rightRefOffset; // Middle (Cover 2)

        if (isWidth25) {
            // 25.5m Base logic: +10cm
            section1Offset += 0.10;
            section2Offset += 0.10;
        }
        if (isWidth29) {
            // 29.1m Base logic: +20cm
            section1Offset += 0.20;
            section2Offset += 0.20;
        }

        // USER REQUEST 10/01/2026 Round 1: 
        // "Abaisse la hauteur de la couverture 2 de 20cm" -> Middle (Section 2) -> -0.20
        // "Augmente la hauteur de la couverture 3 de 10cm" -> Right (Section 1) -> +0.10
        // USER REQUEST 10/01/2026 Round 2:
        // "Abaisse la hauteur de la couverture 1 de 10cm" -> Left -> leftOffset - 0.10
        // "Remonte la couverture 2 de 5cm" -> Middle -> section2Offset + 0.05
        // USER REQUEST 10/01/2026 Round 3:
        // "Remonte la hauteur de la couverture 1 de 5cm" -> Left -> +0.05
        // "Remonte la couverture 2 de 2cm" -> Middle -> +0.02
        // "Abaisse la couverture 3 de 30cm" -> Right -> -0.30
        // USER REQUEST 12/01/2026 (Round 1):
        // "Réhausse la couverture 1 de 5cm pour 29.1m uniquement" -> Left (29.1m only) -> +0.05
        // USER REQUEST 12/01/2026 (Round 2):
        // "Réhausse la couverture 3 de 3cm pour 29.1m uniquement" -> Right (29.1m only) -> +0.03
        // USER REQUEST 12/01/2026 (Round 3):
        // "Réhausse la couverture 3 de 8cm pour 25.5m uniquement" -> Right (25.5m only) -> +0.08
        // USER REQUEST 12/01/2026 (Round 4):
        // "Réhausse couvertures 2 et 3 de 4cm pour 25.5m" -> Middle & Right (25.5m) -> +0.04 each
        // "Réhausse couverture 1 de 5cm pour 29.1m" -> Left (29.1m) -> +0.05

        section2Offset = section2Offset - 0.20 + 0.05 + 0.02;
        section1Offset = section1Offset + 0.10 - 0.30;
        leftOffset = leftOffset - 0.10 + 0.05;

        // Additional adjustments for specific widths
        if (isWidth29) {
            leftOffset += 0.05 + 0.05; // Additional 5cm + 5cm raise for Cover 1 at 29.1m (total +10cm)
            section1Offset += 0.03; // Additional 3cm raise for Cover 3 at 29.1m
        }
        if (isWidth25) {
            section1Offset += 0.08 + 0.04; // Additional 8cm + 4cm raise for Cover 3 at 25.5m (total +12cm)
            section2Offset += 0.04; // Additional 4cm raise for Cover 2 at 25.5m
        }

        const section1Props = getOffsetProps(section1Length, section1Angle, true, section1Overhang);
        const section2Props = getOffsetProps(section2Length, rightAngle, true, 0.25);
        const section3Props = getOffsetProps(section3Length, leftAngle, false, 0);

        return (
            <group>
                {/* Section 1 (Right/Cover 3): Right column to middle column */}
                <mesh geometry={section1Geo} material={roofMaterial}
                    position={[width / 2 - section1Props.x, asymRightEaveH + section1Props.y + section1Offset, -length - 0.5]}
                    rotation={[0, 0, section1Props.rot]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                {/* Solar Section 1 */}
                <group position={[width / 2 - section1Props.x, asymRightEaveH + section1Props.y + section1Offset, -length / 2]}
                    rotation={[0, 0, section1Props.rot]}
                    scale={[-1, 1, 1]}> {/* Scale needed for mirroring? SolarPanels generates locally positive X. 
                                            If we mirror X (-1), then panels might be flipped. 
                                            Actually SolarPanels aligns with width. 
                                            Roof mesh uses scale [-1, 1, 1] to flip the trapezoid geometry? 
                                            Yes, trapezoid is 0 to L. We need it from R to L.
                                            Let's apply scale to Solar Group too or ensure rotation handles it.
                                            Right Side rotation is -Angle. 
                                            If we scale -1 on X for the group, it should match the roof mesh. */}
                    <SolarPanels surfaceWidth={section1RoofLength} surfaceLength={length + 1.0} />
                </group>

                {/* Section 2 (Middle/Cover 2): Middle column to apex */}
                <mesh geometry={section2Geo} material={roofMaterial}
                    position={[middleColumnX - section2Props.x, middleColumnHeight + section2Props.y + section2Offset, -length - 0.5]}
                    rotation={[0, 0, section2Props.rot]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                {/* Solar Section 2 */}
                <group position={[middleColumnX - section2Props.x, middleColumnHeight + section2Props.y + section2Offset, -length / 2]}
                    rotation={[0, 0, section2Props.rot]}
                    scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={section2RoofLength} surfaceLength={length + 1.0} />
                </group>

                {/* Section 3 (Left/Cover 1): Apex to left column */}
                <mesh geometry={section3Geo} material={roofMaterial}
                    position={[-width / 2 + section3Props.x, asymLeftEaveH + section3Props.y + leftOffset, -length - 0.5]}
                    rotation={[0, 0, section3Props.rot]}
                    castShadow receiveShadow />

                {/* Solar Section 3 */}
                <group position={[-width / 2 + section3Props.x, asymLeftEaveH + section3Props.y + leftOffset, -length / 2]}
                    rotation={[0, 0, section3Props.rot]}>
                    <SolarPanels surfaceWidth={section3RoofLength} surfaceLength={length + 1.0} />
                </group>

            </group>
        );
    }

    // --- C. ASYMETRIQUE (1 ZONE) ---
    if (isAsymetrique) {
        // Exact Heights Logic (Match PortalFrame - FORCED 15 DEG)
        const asymRightEaveH = 4.0;
        const w = width;
        const mainSlope = 15 * (Math.PI / 180);

        // Ridge from Right
        const ridgeH = 4.0 + (w * 0.75 * Math.tan(mainSlope));

        // Left Eave from Ridge (15 deg)
        const asymLeftEaveH = ridgeH - (w * 0.25 * Math.tan(mainSlope));

        // Angles
        const rAngle = mainSlope;
        const lAngle = mainSlope;

        // Derived Left Angle (Redundant but safe)
        const rSpan = w * 0.75;
        const lSpan = w * 0.25;
        const lRise = ridgeH - asymLeftEaveH;

        // Recalc Lengths with Derived Angles
        const rSlopeLen = rSpan / Math.cos(rAngle);
        const lSlopeLen = lSpan / Math.cos(lAngle);

        const getOffsetProps = (slopeLen, angle, isRight, overhang) => {
            const centerDist = (slopeLen - overhang) / 2;
            const localX = centerDist * Math.cos(angle);
            const localY = centerDist * Math.sin(angle);

            // Perp Offset - Lifted above purlins
            // Base: 0.35 (Rafter) + 0.14/2 (Purlin/2) + Thick/2
            // User requested "Au dessus". Adding extra lift.
            const extraLift = 0.10;
            const purlinH = 0.140;
            const thick = 0.001;
            const offsetDist = (purlinH / 2) + (thick / 2) + 0.35 + extraLift;

            const nX = isRight ? Math.sin(angle) : -Math.sin(angle);
            const nY = Math.cos(angle);

            return {
                x: localX + (offsetDist * nX),
                y: localY + (offsetDist * nY),
                rot: isRight ? -angle : angle
            };
        };

        const rProps = getOffsetProps(rSlopeLen, rAngle, true, asymRightOverhang);
        const lProps = getOffsetProps(lSlopeLen, lAngle, false, asymLeftOverhang);

        return (
            <group>
                {/* Left Side */}
                <mesh geometry={asymLeftGeo} material={roofMaterial}
                    position={[-width / 2 + lProps.x, asymLeftEaveH + lProps.y + 0.10 + (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5 ? -0.12 : 0) + (Math.abs(width - 20) < 0.5 ? -0.05 : 0), -length - 0.5]}
                    rotation={[0, 0, lProps.rot]}
                    castShadow receiveShadow />

                {/* Right Side */}
                <mesh geometry={asymRightGeo} material={roofMaterial}
                    position={[width / 2 - rProps.x, asymRightEaveH + rProps.y, -length - 0.5]}
                    rotation={[0, 0, rProps.rot]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                {/* Solar */}
                <group position={[width / 2 - rProps.x, asymRightEaveH + rProps.y, -length / 2]} rotation={[0, 0, rProps.rot]}>
                    <SolarPanels surfaceWidth={asymRightRoofLength} surfaceLength={length + 1.0} />
                </group>

                {/* Solar Panels on Left Roof (USER REQUEST 12/01/2026) */}
                <group position={[-width / 2 + lProps.x, asymLeftEaveH + lProps.y + 0.10 + (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5 ? -0.12 : 0) + (Math.abs(width - 20) < 0.5 ? -0.05 : 0), -length / 2]} rotation={[0, 0, lProps.rot]}>
                    <SolarPanels surfaceWidth={asymLeftRoofLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- D. SYMMETRICAL (Default) ---
    // Offset Logic
    const purlinHeight = 0.140;
    const roofThickness = 0.001;
    const perpOffset = (purlinHeight / 2) + (roofThickness / 2) + 0.35;

    const centerDist = (symGeometricSlopeLength - symOverhang) / 2;
    const localCenterX = centerDist * Math.cos(symAngleRad);
    const localCenterY = centerDist * Math.sin(symAngleRad);

    // Perpendicular Offset Vectors
    const offsetX = -perpOffset * Math.sin(symAngleRad);
    const offsetY = perpOffset * Math.cos(symAngleRad);

    return (
        <group>
            {/* Left Roof Side */}
            <mesh
                geometry={symGeometry}
                material={roofMaterial}
                position={[
                    -symHalfWidth + localCenterX + offsetX,
                    eaveHeight + localCenterY + offsetY,
                    -length - 0.5
                ]}
                rotation={[0, 0, symAngleRad]}
                castShadow receiveShadow
            />

            {/* Right Roof Side */}
            <mesh
                geometry={symGeometry}
                material={roofMaterial}
                position={[
                    symHalfWidth - localCenterX - offsetX, // Mirror X
                    eaveHeight + localCenterY + offsetY, // Same Y height
                    -length - 0.5
                ]}
                rotation={[0, 0, -symAngleRad]}
                scale={[-1, 1, 1]}
                castShadow receiveShadow
            />

            {/* Solar Panels Left */}
            <group
                position={[
                    -symHalfWidth + localCenterX + offsetX,
                    eaveHeight + localCenterY + offsetY,
                    -length / 2
                ]}
                rotation={[0, 0, symAngleRad]}
            >
                <SolarPanels surfaceWidth={symRoofSlopeLength} surfaceLength={length + 1.0} />
            </group>

            {/* Solar Panels Right */}
            <group
                position={[
                    symHalfWidth - localCenterX - offsetX,
                    eaveHeight + localCenterY + offsetY,
                    -length / 2
                ]}
                rotation={[0, 0, -symAngleRad]}
            >
                <SolarPanels surfaceWidth={symRoofSlopeLength} surfaceLength={length + 1.0} />
            </group>
        </group>
    );
}
