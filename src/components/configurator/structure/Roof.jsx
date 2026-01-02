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

    // --- MONOPENTE LOGIC ---
    if (isMonopente) {
        const deltaH = ridgeHeight - eaveHeight; // 7.4 - 4.0 = 3.4
        const slopeAngle = Math.atan(deltaH / width);

        // Overhangs: 50cm horizontal projection each side -> Total Width + 1.0
        const totalHorizontalWidth = width + 1.0; // 0.5 left + 0.5 right
        const slopeLength = totalHorizontalWidth / Math.cos(slopeAngle);

        // Offset Logic (Same as Sym)
        const purlinHeight = 0.140;
        const roofThickness = 0.001;
        const perpOffset = (purlinHeight / 2) + (roofThickness / 2) + 0.30;

        const monoProfile = useMemo(() => createTrapezoidalProfile(slopeLength, 0.035, 0.25), [slopeLength]);
        const monoGeometry = useMemo(() => new THREE.ExtrudeGeometry(monoProfile, {
            depth: length + 1.0, // Front/Back Overhang
            bevelEnabled: false
        }), [monoProfile, length]);

        // Position:
        // Midpoint of the roof plane (including overhangs).
        // Building Midpoint: (0, (R+E)/2).
        // But we have overhangs.
        // Left Overhang starts at -W/2 - 0.5. Right ends at W/2 + 0.5.
        // Midpoint is still 0 (Symmetric overhangs).
        // Vertical Midpoint calculated at X=0 on the slope line.
        // Line passes through (-W/2 - 0.5, E - 0.5*tan) ?? 
        // Let's rely on the Pivot at Centre Building.
        // Center X = 0.
        // Center Y = Eave + (Ridge-Eave)/2 ? 
        // Yes, if linear slope.
        const centerY = eaveHeight + (deltaH / 2);

        // Perpendicular offset vector
        // Normal to slope is (-sin, cos)
        const offX = perpOffset * -Math.sin(slopeAngle);
        const offY = perpOffset * Math.cos(slopeAngle);

        return (
            <mesh
                geometry={monoGeometry}
                material={roofMaterial}
                position={[
                    offX,
                    centerY + offY,
                    -length - 0.5
                ]}
                rotation={[0, 0, slopeAngle]}
                castShadow
                receiveShadow
            />
        );
    }

    // --- EXISTING SYMMETRICAL LOGIC ---
    const angleRad = (roofPitch * Math.PI) / 180;
    const halfWidth = width / 2;
    // ... rest of code


    // --- GEOMETRY CALCULATIONS ---
    // User Request: Roof must cover the entire building width (Eave to Ridge).
    // Previous logic anchored to purlins, causing gaps if purlins didn't reach apex.
    // New Logic: Geometric coverage.

    const geometricSlopeLength = halfWidth / Math.cos(angleRad);

    // Roof length = Geometric Slope Length + Eave Overhang
    const overhang = 0.50; // 50cm Eave Overhang
    const roofSlopeLength = geometricSlopeLength + overhang;

    // --- PERPENDICULAR OFFSET (Prevent Intersection) ---
    // Purlin specs from Purlins.jsx
    const purlinHeight = 0.140;
    const roofThickness = 0.001; // Sheet metal thickness

    // User Request: "Remonte de 20cm" -> Adjusted -5cm by request -> Total +0.30m
    // Offset = (PurlinHeight / 2) + (RoofThickness / 2) + Extra 0.30m
    const perpOffset = (purlinHeight / 2) + (roofThickness / 2) + 0.30;

    // --- GEOMETRY CREATION (HORIZONTAL WAVES) ---
    const profileShape = useMemo(() => createTrapezoidalProfile(roofSlopeLength, 0.035, 0.25), [roofSlopeLength]);

    const geometry = useMemo(() => new THREE.ExtrudeGeometry(profileShape, {
        depth: length + 1.0, // Length + 50cm Front + 50cm Back
        bevelEnabled: false
    }), [profileShape, length]);

    // --- ANCHOR POSITIONING ---
    // We anchor at the Eave Purlin position (0) minus overhang along the slope.
    // Or simpler: Center the profile on the midpoint of the "Sheet Length".

    // Sheet starts at: -overhang (relative to Eave Purlin).
    // Sheet ends at: geometricSlopeLength (Ridge).
    // Midpoint = (-overhang + geometricSlopeLength) / 2.

    // Wait, Eave Purlin (0) is at x=-halfWidth.
    // The "Start" of slope is exactly at -halfWidth in global X? No, Eave Purlin is there.
    // The sheet starts "overhang" meters DOWN-SLOPE from the Eave Purlin.
    // Down-slope means negative local X?
    // Let's assume Local X=0 is Eave Purlin.
    // Sheet extends from X = -overhang to X = geometricSlopeLength.
    // Center X = (geometricSlopeLength - overhang) / 2.

    const centerDist = (geometricSlopeLength - overhang) / 2;

    // Convert to World displacement relative to Eave Purlin (which is at local 0).
    const localCenterX = centerDist * Math.cos(angleRad);
    const localCenterY = centerDist * Math.sin(angleRad);

    // Perpendicular Offset Vectors
    const perpNormalX = -Math.sin(angleRad);

    const offsetX = perpOffset * perpNormalX;
    const offsetY = perpOffset * Math.cos(angleRad);

    return (
        <group>
            {/* Left Roof Side */}
            <mesh
                geometry={geometry}
                material={roofMaterial}
                position={[
                    -halfWidth + localCenterX + offsetX,
                    eaveHeight + localCenterY + offsetY,
                    -length - 0.5 // Start at Back Overhang (-Length - 0.5)
                ]}
                rotation={[0, 0, angleRad]}
                castShadow
                receiveShadow
            />

            {/* Right Roof Side */}
            <mesh
                geometry={geometry}
                material={roofMaterial}
                position={[
                    halfWidth - localCenterX - offsetX, // Mirror X
                    eaveHeight + localCenterY + offsetY, // Same Y height
                    -length - 0.5
                ]}
                rotation={[0, 0, -angleRad]}
                scale={[-1, 1, 1]}
                castShadow
                receiveShadow
            />

            {/* Solar Panels Left */}
            <group
                position={[
                    -halfWidth + localCenterX + offsetX,
                    eaveHeight + localCenterY + offsetY,
                    -length / 2
                ]}
                rotation={[0, 0, angleRad]}
            >
                <SolarPanels surfaceWidth={roofSlopeLength} surfaceLength={length + 1.0} />
            </group>

            {/* Solar Panels Right */}
            <group
                position={[
                    halfWidth - localCenterX - offsetX,
                    eaveHeight + localCenterY + offsetY,
                    -length / 2
                ]}
                rotation={[0, 0, -angleRad]}
            >
                <SolarPanels surfaceWidth={roofSlopeLength} surfaceLength={length + 1.0} />
            </group>
        </group>
    );
}
