import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile } from '../utils/profiles.js';
import { SolarPanels } from './SolarPanels.jsx';

export function Roof({ width, length, roofPitch, eaveHeight, ridgeHeight, buildingType = 'symetrique' }) {
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

    // --- B. ASYMETRIQUE 2 ZONES ---
    if (isAsymetrique2) {
        // Same 15° slope across all sections
        const mainSlope = 15 * (Math.PI / 180);
        const asymRightEaveH = 4.0;
        const w = width;

        // Calculate ridge height and left eave
        const ridgeH = 4.0 + (w * 0.75 * Math.tan(mainSlope));
        const asymLeftEaveH = ridgeH - (w * 0.25 * Math.tan(mainSlope));

        // Determine middle column position - always at 13.1m from left
        let middleColumnX = -width / 2 + 13.1;

        // Calculate middle column height
        const distRightToMiddle = width / 2 - middleColumnX;
        const rightSpan = width * 0.75;
        const ratio = distRightToMiddle / rightSpan;
        const rightSectionRise = ridgeH - asymRightEaveH;
        const middleColumnHeight = asymRightEaveH + (rightSectionRise * ratio);

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
                    position={[-width / 2 + lProps.x, asymLeftEaveH + lProps.y + 0.10 + (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5 ? -0.12 : 0), -length - 0.5]}
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
