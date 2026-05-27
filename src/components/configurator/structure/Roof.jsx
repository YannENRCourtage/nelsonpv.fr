import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile } from '../utils/profiles.js';
import { SolarPanels } from './SolarPanels.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';

export function Roof({ width, length, roofPitch, eaveHeight, ridgeHeight, buildingType = 'symetrique' }) {
    const { isAcama, configMode, customParams, customSpans } = useConfiguratorValues();
    // Material: RAL 7016 (Anthracite Grey)
    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016 approx
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    // --- HOOKS INIT ---

    const buildingTypePre = buildingType; // Alias for conditional below
    const isMonopente = buildingTypePre === 'monopente';
    const isAsymetrique = buildingTypePre === 'asymetrique_1';
    const isAsymetrique2 = buildingTypePre === 'asymetrique_2';
    const isEpona = isAcama && (buildingTypePre === 'epona' || buildingTypePre === 'epona_talian5');
    // const isAcamaTalian5 = isAcama && buildingType === 'asymetrique_2' && Math.abs(width - 27.6) < 0.1; // OBSOLÈTE
    // ==========================================
    // HOOKS (Must be unconditional)
    // ==========================================

    // --- 1. Monopente Geometries ---
    const customMonoH = (configMode === 'custom') ? customParams.ridgeHeight : ridgeHeight;
    const customMonoEave = (configMode === 'custom') ? customParams.rightEaveHeight : eaveHeight;
    const monoDeltaH = customMonoH - customMonoEave;
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

    const buildingTypeRender = buildingType;

    // --- 0. OMBRIÈRE VL SIMPLE & DOUBLE & PL ---
    const isOmbriereSimple = buildingTypeRender === 'ombriere_vl_simple_droite' || buildingTypeRender === 'ombriere_vl_simple_gauche';
    const isOmbriereDouble = buildingTypeRender === 'ombriere_vl_double';
    const isOmbrierePL = buildingTypeRender === 'ombriere_pl';

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
        // Offset Logic: Follow the slope and stay 10cm above Z140 purlins (140mm)
        // Structural Line = Rafter Top (set in PortalFrame)
        const purlinHeight = 0.140;
        const gap = 0.10; // Requested gap
        const perpOffset = purlinHeight + gap; // Total lift from rafter top

        const centerY = eaveHeight + (monoDeltaH / 2);
        // Normal to slope (-angle) is (sin, cos)
        const offX = perpOffset * Math.sin(monoSlopeAngle);
        const offY = perpOffset * Math.cos(monoSlopeAngle);

        return (
            <group>
                <mesh
                    geometry={monoGeometry}
                    material={roofMaterial}
                    position={[offX, centerY + offY, -length - 0.5]}
                    rotation={[0, 0, -monoSlopeAngle]} // Negative Angle
                    castShadow receiveShadow
                />
                <group position={[offX, centerY + offY, -length / 2]} rotation={[0, 0, -monoSlopeAngle]}>
                    <SolarPanels surfaceWidth={monoSlopeLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- B0. EPONA ---
    if (isEpona && buildingTypeRender !== 'epona_talian5') {
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
                    position={[rFinalX, rFinalY - 0.1, -length - 0.5]}
                    rotation={[0, 0, -mainSlope]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                <group position={[rFinalX, rFinalY - 0.1, -length / 2]} rotation={[0, 0, -mainSlope]} scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={rightRoofLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- B0.5 TALIAN 5 ---
    if (buildingTypeRender === 'epona_talian5') {
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

    // --- B. ASYMETRIQUE 2 ZONES ---
    if (isAsymetrique2) {
        const w = width;
        const mainSlope = 15 * (Math.PI / 180);
        const rightSpan = w * 0.75;
        const distRightToMiddle = rightSpan * 0.6; 
        const ridgeHAsym2 = 4.0 + (rightSpan * Math.tan(mainSlope));
        const middleColumnHeightAsym2 = ridgeHAsym2 - ((rightSpan - distRightToMiddle) * Math.tan(mainSlope));

        const asymRightEaveH = 4.0;
        const asymLeftEaveH = 4.0;
        const middleColumnHeight = middleColumnHeightAsym2;
        const middleColumnX = width / 2 - distRightToMiddle;

        const section1Span = distRightToMiddle;
        const section1Length = section1Span / Math.cos(mainSlope);
        const section1Overhang = 0.50;
        const section1RoofLength = section1Length + section1Overhang;

        const section2Span = rightSpan - section1Span;
        const section2Length = section2Span / Math.cos(mainSlope);
        const section2RoofLength = section2Length + 0.25; 

        const leftSpan = width * 0.25;
        const section3Length = leftSpan / Math.cos(mainSlope);
        const section3RoofLength = section3Length; 

        const section1Profile = createTrapezoidalProfile(section1RoofLength, 0.035, 0.25);
        const section2Profile = createTrapezoidalProfile(section2RoofLength, 0.035, 0.25);
        const section3Profile = createTrapezoidalProfile(section3RoofLength, 0.035, 0.25);

        const section1Geo = new THREE.ExtrudeGeometry(section1Profile, { depth: length + 1.0, bevelEnabled: false });
        const section2Geo = new THREE.ExtrudeGeometry(section2Profile, { depth: length + 1.0, bevelEnabled: false });
        const section3Geo = new THREE.ExtrudeGeometry(section3Profile, { depth: length + 1.0, bevelEnabled: false });

        const isWidth29 = Math.abs(width - 29.1) < 0.1;
        const isWidth25 = Math.abs(width - 25.5) < 0.1;

        const rightAngle = 15 * (Math.PI / 180);
        const section1Angle = 15 * (Math.PI / 180);
        const leftAngle = 15 * (Math.PI / 180);

        const leftRefOffset = -0.25;
        let leftOffset = leftRefOffset;
        if (isWidth25) leftOffset = leftRefOffset - 0.20;
        if (isWidth29) leftOffset = leftRefOffset + 0.10;

        const rightRefOffset = -0.10;
        let section1Offset = rightRefOffset; 
        let section2Offset = rightRefOffset; 

        if (isWidth25) {
            section1Offset += 0.10;
            section2Offset += 0.10;
        }
        if (isWidth29) {
            section1Offset += 0.20;
            section2Offset += 0.20;
        }

        const leftSpanVisible = width * 0.25;
        const rightSpanVisible = width * 0.75;
        let leftAngleGI = 15 * (Math.PI / 180);
        let rightAngleGI = 15 * (Math.PI / 180);

        if (!isAcama) {
            let leftEaveAdjustment = -0.3; 
            let rightEaveAdjustment = 0.2;

            if (isWidth25) {
                leftEaveAdjustment = -1.0; // USER REQUEST 10/04/2026: abaisse de 0.1m supplémentaire (total -1.0m)
                rightEaveAdjustment = 0.3; 
            }
            if (isWidth29) {
                leftEaveAdjustment = 0.4; // USER REQUEST 10/04/2026: remonte de 0.2m supplémentaire (total +0.4)
                rightEaveAdjustment = 0.3; 
            }

            leftAngleGI = Math.atan(Math.tan(15 * Math.PI / 180) + (-leftEaveAdjustment / leftSpanVisible));
            rightAngleGI = Math.atan(Math.tan(15 * Math.PI / 180) - (rightEaveAdjustment / rightSpanVisible));
            const offsetDist = (0.140 / 2) + (0.001 / 2) + 0.35 + 0.10; 
            const baseBottomH = offsetDist * Math.cos(15 * Math.PI / 180);
            leftOffset = (baseBottomH + 3.62 + leftEaveAdjustment) - (offsetDist * Math.cos(leftAngleGI));
            section1Offset = (baseBottomH - 0.2 + rightEaveAdjustment) - (offsetDist * Math.cos(rightAngleGI));
            section2Offset = section1Offset; 
        }

        const positioningHelper = (slopeLen, angle, isRight, overhang) => {
            const centerDist = (slopeLen - overhang) / 2;
            const localX = centerDist * Math.cos(angle);
            const localY = centerDist * Math.sin(angle);
            const extraLift = 0.10;
            const purlinH = 0.140;
            const thick = 0.001;
            const offsetDist = (purlinH / 2) + (thick / 2) + 0.35 + extraLift;
            const nX = isRight ? Math.sin(angle) : -Math.sin(angle);
            const nY = Math.cos(angle);
            return { x: localX + (offsetDist * nX), y: localY + (offsetDist * nY), rot: isRight ? -angle : angle };
        };

        const section1Props = positioningHelper(section1RoofLength, rightAngleGI, true, section1Overhang);
        const section2Props = positioningHelper(section2RoofLength, rightAngleGI, true, 0.25);
        const section3Props = positioningHelper(section3Length, leftAngleGI, false, 0);

        return (
            <group>
                <mesh geometry={section1Geo} material={roofMaterial}
                    position={[width / 2 - section1Props.x, asymRightEaveH + section1Props.y + section1Offset, -length - 0.5]}
                    rotation={[0, 0, section1Props.rot]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                <group position={[width / 2 - section1Props.x, asymRightEaveH + section1Props.y + section1Offset, -length / 2]}
                    rotation={[0, 0, section1Props.rot]}
                    scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={section1RoofLength} surfaceLength={length + 1.0} />
                </group>

                <mesh geometry={section2Geo} material={roofMaterial}
                    position={[middleColumnX - section2Props.x, middleColumnHeight + section2Props.y + section2Offset, -length - 0.5]}
                    rotation={[0, 0, section2Props.rot]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                <group position={[middleColumnX - section2Props.x, middleColumnHeight + section2Props.y + section2Offset, -length / 2]}
                    rotation={[0, 0, section2Props.rot]}
                    scale={[-1, 1, 1]}>
                    <SolarPanels surfaceWidth={section2RoofLength} surfaceLength={length + 1.0} />
                </group>

                <mesh geometry={section3Geo} material={roofMaterial}
                    position={[-width / 2 + section3Props.x, asymLeftEaveH + section3Props.y + leftOffset, -length - 0.5]}
                    rotation={[0, 0, section3Props.rot]}
                    castShadow receiveShadow />

                <group position={[-width / 2 + section3Props.x, asymLeftEaveH + section3Props.y + leftOffset, -length / 2]}
                    rotation={[0, 0, section3Props.rot]}>
                    <SolarPanels surfaceWidth={section3RoofLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // --- C. ASYMETRIQUE (1 ZONE) ---
    if (isAsymetrique) {
        const asymRightEaveH = 4.0;
        const w = width;
        const mainSlope = 15 * (Math.PI / 180);
        const ridgeH = 4.0 + (w * 0.75 * Math.tan(mainSlope));
        const asymLeftEaveH = ridgeH - (w * 0.25 * Math.tan(mainSlope));
        const rAngle = mainSlope;
        const lAngle = mainSlope;
        const rSpan = w * 0.75;
        const lSpan = w * 0.25;
        const rSlopeLen = rSpan / Math.cos(rAngle);
        const lSlopeLen = lSpan / Math.cos(lAngle);

        const positioningHelper = (slopeLen, angle, isRight, overhang) => {
            const centerDist = (slopeLen - overhang) / 2;
            const localX = centerDist * Math.cos(angle);
            const localY = centerDist * Math.sin(angle);
            const extraLift = 0.10;
            const purlinH = 0.140;
            const thick = 0.001;
            const offsetDist = (purlinH / 2) + (thick / 2) + 0.35 + extraLift;
            const nX = isRight ? Math.sin(angle) : -Math.sin(angle);
            const nY = Math.cos(angle);
            return { x: localX + (offsetDist * nX), y: localY + (offsetDist * nY), rot: isRight ? -angle : angle };
        };

        const rProps = positioningHelper(rSlopeLen, rAngle, true, asymRightOverhang);
        const lProps = positioningHelper(lSlopeLen, lAngle, false, asymLeftOverhang);

        return (
            <group>
                <mesh geometry={asymLeftGeo} material={roofMaterial}
                    position={[-width / 2 + lProps.x, asymLeftEaveH + lProps.y + 0.10 + (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5 ? -0.12 : 0) + (Math.abs(width - 20) < 0.5 ? -0.05 : 0), -length - 0.5]}
                    rotation={[0, 0, lProps.rot]}
                    castShadow receiveShadow />

                <mesh geometry={asymRightGeo} material={roofMaterial}
                    position={[width / 2 - rProps.x, asymRightEaveH + rProps.y, -length - 0.5]}
                    rotation={[0, 0, rProps.rot]}
                    scale={[-1, 1, 1]}
                    castShadow receiveShadow />

                <group position={[width / 2 - rProps.x, asymRightEaveH + rProps.y, -length / 2]} rotation={[0, 0, rProps.rot]}>
                    <SolarPanels surfaceWidth={asymRightRoofLength} surfaceLength={length + 1.0} />
                </group>

                <group position={[-width / 2 + lProps.x, asymLeftEaveH + lProps.y + 0.10 + (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5 ? -0.12 : 0) + (Math.abs(width - 20) < 0.5 ? -0.05 : 0), -length / 2]} rotation={[0, 0, lProps.rot]}>
                    <SolarPanels surfaceWidth={asymLeftRoofLength} surfaceLength={length + 1.0} />
                </group>
            </group>
        );
    }

    // ==========================================
    // RENDU FINAL (BRANCHING)
    // ==========================================

    if (configMode === 'custom') {
        const cp = customParams;
        const spans = customSpans;
        const lAngle = cp.leftPitch * (Math.PI / 180);
        const rAngle = cp.rightPitch * (Math.PI / 180);
        const l = length;

        const isMono = cp.buildingType === 'monopente';
        const monoAngle = isMono ? Math.atan((cp.ridgeHeight - cp.rightEaveHeight) / cp.width) : 0;

        const leftRoofLength = isMono ? (cp.width / Math.cos(monoAngle) + 1.0) : (spans.left / Math.cos(lAngle) + 0.5); 
        const rightRoofLength = isMono ? 0 : (spans.right / Math.cos(rAngle) + 0.5);

        const leftProfile = createTrapezoidalProfile(leftRoofLength, 0.035, 0.25);
        const rightProfile = rightRoofLength > 0 ? createTrapezoidalProfile(rightRoofLength, 0.035, 0.25) : null;

        const leftGeo = new THREE.ExtrudeGeometry(leftProfile, { depth: l + 1.0, bevelEnabled: false });
        const rightGeo = rightProfile ? new THREE.ExtrudeGeometry(rightProfile, { depth: l + 1.0, bevelEnabled: false }) : null;

        const pOffsetCustom = cp.buildingType === 'monopente' 
            ? (0.140 + 0.10) // PurlinHeight + 10cm gap for Monopente
            : (0.140 / 2) + (0.001 / 2) + 0.35 + 0.10;
        const apexX = isMono ? -width/2 : (-width / 2 + spans.left);
        const ridgeY = cp.ridgeHeight;

        const getProps = (slopeLen, angle, isRight, overhang, startX, startY) => {
            const centerDist = (slopeLen - overhang) / 2;
            const midX = isRight ? startX + centerDist * Math.cos(angle) : startX - centerDist * Math.cos(angle);
            const midY = startY - centerDist * Math.sin(angle);
            const nX = isRight ? Math.sin(angle) : -Math.sin(angle);
            const nY = Math.cos(angle);
            return { x: midX + pOffsetCustom * nX, y: midY + pOffsetCustom * nY, rot: isRight ? -angle : angle };
        };

        // For Monopente, the "left" panel covers EVERYTHING and starts from high point at left
        const currentAngle = isMono ? monoAngle : lAngle;
        // In Monopente, it's descending to the RIGHT. Our getProps(isRight=false) assumes ascending to the left from apex?
        // Wait, if startX = -width/2 (left) and we want it to go RIGHT and DOWN.
        // Let's use getProps logic carefully.
        // If isRight=true, x = startX + dist*cos, y = startY - dist*sin. Correct for descending Right.
        const leftP = isMono 
            ? getProps(leftRoofLength, monoAngle, true, 1.0, -width/2, ridgeY)
            : getProps(leftRoofLength, lAngle, false, 0.5, apexX, ridgeY);
            
        const rightP = rightGeo ? getProps(rightRoofLength, rAngle, true, 0.5, apexX, ridgeY) : null;

        return (
            <group>
                <mesh geometry={leftGeo} material={roofMaterial} position={[leftP.x, leftP.y, -l - 0.5]} rotation={[0, 0, leftP.rot]} castShadow receiveShadow />
                <group position={[leftP.x, leftP.y, -l / 2]} rotation={[0, 0, leftP.rot]}>
                    <SolarPanels surfaceWidth={leftRoofLength} surfaceLength={l + 1.0} />
                </group>
                {rightGeo && (
                    <>
                        <mesh geometry={rightGeo} material={roofMaterial} position={[rightP.x, rightP.y, -l - 0.5]} rotation={[0, 0, rightP.rot]} scale={[-1, 1, 1]} castShadow receiveShadow />
                        <group position={[rightP.x, rightP.y, -l / 2]} rotation={[0, 0, rightP.rot]} scale={[-1, 1, 1]}>
                            <SolarPanels surfaceWidth={rightRoofLength} surfaceLength={l + 1.0} />
                        </group>
                    </>
                )}
            </group>
        );
    }

    // --- D. SYMMETRICAL (Default) ---
    const purlinHeight = 0.140;
    const roofThickness = 0.001;
    const perpOffset = (purlinHeight / 2) + (roofThickness / 2) + 0.35;
    const centerDist = (symGeometricSlopeLength - symOverhang) / 2;
    const localCenterX = centerDist * Math.cos(symAngleRad);
    const localCenterY = centerDist * Math.sin(symAngleRad);
    const offsetX = -perpOffset * Math.sin(symAngleRad);
    const offsetY = perpOffset * Math.cos(symAngleRad);

    return (
        <group>
            <mesh
                geometry={symGeometry}
                material={roofMaterial}
                position={[-symHalfWidth + localCenterX + offsetX, eaveHeight + localCenterY + offsetY, -length - 0.5]}
                rotation={[0, 0, symAngleRad]}
                castShadow receiveShadow
            />
            <mesh
                geometry={symGeometry}
                material={roofMaterial}
                position={[symHalfWidth - localCenterX - offsetX, eaveHeight + localCenterY + offsetY, -length - 0.5]}
                rotation={[0, 0, -symAngleRad]}
                scale={[-1, 1, 1]}
                castShadow receiveShadow
            />
            <group position={[-symHalfWidth + localCenterX + offsetX, eaveHeight + localCenterY + offsetY, -length / 2]} rotation={[0, 0, symAngleRad]}>
                <SolarPanels surfaceWidth={symRoofSlopeLength} surfaceLength={length + 1.0} />
            </group>
            <group position={[symHalfWidth - localCenterX - offsetX, eaveHeight + localCenterY + offsetY, -length / 2]} rotation={[0, 0, -symAngleRad]}>
                <SolarPanels surfaceWidth={symRoofSlopeLength} surfaceLength={length + 1.0} />
            </group>
        </group>
    );
}
