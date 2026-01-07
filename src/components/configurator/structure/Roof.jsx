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

    // --- B. ASYMETRIQUE (1 ZONE) ---
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

    // --- C. SYMMETRICAL (Default) ---
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
