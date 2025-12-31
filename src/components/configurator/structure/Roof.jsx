import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile } from '../utils/profiles.js';

export function Roof({ width, length, roofPitch, eaveHeight }) {
    // Material: RAL 7016 (Anthracite Grey)
    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016 approx
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    const angleRad = (roofPitch * Math.PI) / 180;
    const halfWidth = width / 2;

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

    // User Request: "Remonte de 20cm" (on top of previous 15cm?) -> Let's assume +35cm total extra.
    // Offset = (PurlinHeight / 2) + (RoofThickness / 2) + Extra 0.35m
    const perpOffset = (purlinHeight / 2) + (roofThickness / 2) + 0.35;

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
        </group>
    );
}
