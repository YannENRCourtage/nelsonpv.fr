import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createZProfile } from '../utils/profiles.js';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';

export function Purlins({ width, length, bayCount, baySpacing, roofPitch, eaveHeight, ridgeHeight, buildingType = 'symetrique' }) {
    const { isAcama } = useConfiguratorValues();
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#d0d0d0', // Galvanized
        metalness: 0.5,
        roughness: 0.5
    }), []);

    // Config for Z-Purlin (Z140)
    const purlinHeight = 0.140;
    const purlinWidth = 0.060;
    const thickness = 0.003;
    const purlinSpacing = 1.3; // Distance between purlins along slope

    // Geometry for a SINGLE BAY
    // Extrude depth = baySpacing.
    const shape = useMemo(() => createZProfile(purlinHeight, purlinWidth, thickness), []);

    // We want the purlin to run along the bay (-Z direction usually if we just offset).
    // Let's create it with positive depth and rotate/position accordingly.
    const bayGeometry = useMemo(() => new THREE.ExtrudeGeometry(shape, {
        depth: baySpacing,
        bevelEnabled: false
    }), [baySpacing, shape]);

    const halfWidth = width / 2;
    const isMonopente = buildingType === 'monopente';

    // Rafter IPE 400 (Height = 0.4m). Half-height = 0.2m.
    // Purlin sits ON TOP of Rafter.
    const rafterOffset = 0.20;
    const perpOffset = rafterOffset + (purlinHeight / 2) + 0.001; // Small 1mm tolerance

    const purlins = [];
    const isEpona = isAcama && (buildingType === 'epona' || buildingType === 'epona_talian5');

    // --- EPONA GENERATION ---
    if (isEpona) {
        const mainSlope = 17 * (Math.PI / 180);
        const extendLeftX = 2.55;
        const extendRightX = 1.25; // Restored


        // Geometric constraints based on left pilar at x = -11.8 and eaveHeight = 5.0
        const apexX = 0;
        const apexY = 5.0 + (11.8 * Math.tan(mainSlope));

        const lSlopeLen = (11.8 + extendLeftX) / Math.cos(mainSlope);
        const rSlopeLen = (19.65 + extendRightX) / Math.cos(mainSlope);

        const numPurlinsLeft = Math.floor(lSlopeLen / purlinSpacing);
        const numPurlinsRight = Math.floor(rSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            // Left Slope (Apex down to Left Overhang)
            for (let i = 0; i <= numPurlinsLeft; i++) {
                const dist = i * purlinSpacing;
                const xLocal = -dist * Math.cos(mainSlope);
                const yLocal = -dist * Math.sin(mainSlope);

                const xPerp = -perpOffset * Math.sin(mainSlope);
                const yPerp = perpOffset * Math.cos(mainSlope);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-Epona-L-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[apexX + xLocal + xPerp, apexY + yLocal + yPerp, zStart]}
                        rotation={[0, Math.PI, -mainSlope]}
                    />
                );
            }

            // Right Slope (Apex down to Right Overhang)
            for (let i = 0; i <= numPurlinsRight; i++) {
                // To avoid drawing the purlin EXACTLY twice at the apex:
                if (i === 0) continue;

                const dist = i * purlinSpacing;
                const xLocal = dist * Math.cos(mainSlope);
                const yLocal = -dist * Math.sin(mainSlope);

                const xPerp = perpOffset * Math.sin(mainSlope);
                const yPerp = perpOffset * Math.cos(mainSlope);

                // User Request: Align right slope purlins 50cm high relative to reference (prev -45cm)
                const yOffset = 0.05; // Was -0.45, requested raise by 50cm



                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-Epona-R-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[apexX + xLocal + xPerp, apexY + yLocal + yPerp + yOffset, zStart]}
                        rotation={[0, Math.PI, mainSlope]}
                    />
                );
            }
        }
    }
    // --- MONOPENTE GENERATION ---
    else if (isMonopente) {
        const deltaH = ridgeHeight - eaveHeight;
        const angleRad = Math.atan(deltaH / width); // Absolute angle
        const slopeLength = width / Math.cos(angleRad);

        const numPurlins = Math.floor(slopeLength / purlinSpacing);

        // Loop through BAYS
        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            // Loop Purlins along single slope
            for (let i = 0; i <= numPurlins; i++) {
                const dist = i * purlinSpacing;

                // Start from Left Wall (-halfWidth)
                // Height starts at RIDGE HEIGHT
                // X progresses positive
                // Y progresses NEGATIVE (Down)

                const xLocal = dist * Math.cos(angleRad);
                const yLocal = -dist * Math.sin(angleRad); // Go Down

                // Normal Vector for Perpendicular Offset
                // Slope is Down-Right (-Angle). Normal is (+Sin, +Cos)? 
                // Wait. Vector (1, -tan). Normal (tan, 1).
                // Or simply: Previous was (+Angle). 
                // Now we are rotating -Angle.
                // Left-to-Right Descending.
                // Perpendicular is "Up-Right"? No, "Up-Left" (Normal to surface).
                // Surface Normal for -Angle: (-sin(-a), cos(-a)) -> (sin a, cos a).

                const xPerp = perpOffset * Math.sin(angleRad);
                const yPerp = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-Mono-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            ridgeHeight + yLocal + yPerp, // Start at Ridge
                            zStart
                        ]}
                        rotation={[0, Math.PI, -angleRad]} // Rotate Negative
                    />
                );
            }
        }
    }
    // --- OMBRIÈRE GENERATION ---
    else if (buildingType.startsWith('ombriere')) {
        // Droite: High Left, Low Right. Slope 10 deg (or roofPitch).
        // Gauche: High Left, Low Right (Unified).

        const angleDeg = roofPitch || 15;
        const angleRad = (angleDeg * Math.PI) / 180;

        // Slope Length (Hypotenuse)
        // Cover full width
        const slopeLength = width / Math.cos(angleRad);

        const numPurlins = Math.floor(slopeLength / purlinSpacing);

        // Rafter center height (approx)
        // Logic should match Roof/Solar placement.
        // Calculate based on Eave and Width to match PortalFrame exactly.
        const midRise = (width / 2) * Math.tan(angleRad);
        let centerHeight = eaveHeight + midRise;

        // USER REQUEST 14/01/2026: Match Height Adjustments
        // Double: -0.70m. 
        // Simple: +0.55m (Lowered 10cm from +0.65m).
        if (buildingType === 'ombriere_vl_double') centerHeight -= 0.70;
        if (buildingType === 'ombriere_vl_simple_droite' || buildingType === 'ombriere_vl_simple_gauche') centerHeight += 0.55;

        if (buildingType === 'ombriere_vl_simple_droite' || buildingType === 'ombriere_vl_simple_gauche') {
            centerHeight -= 0.40;
        }

        // USER REQUEST 15/01/2026: Specific adjustments for VL Double
        if (buildingType === 'ombriere_vl_double') {
            if (Math.abs(width - 9.1) < 0.1) centerHeight -= 0.40; // Total -40cm
            else if (Math.abs(width - 11.3) < 0.1) centerHeight -= 0.65; // Total -65cm
        }
        if (buildingType === 'ombriere_vl_double') {
            // VL Double base adjustment to match roof lift? 
            // Roof has lift +0.60 + 0.25 = 0.85 (inc 0.2 rafter).
            // centerHeight in Roof was calculated same way.
            // If we want Purlins to be ON TOP of Rafters:
            // Rafter Top = centerHeight + ~0.2.
            // Purlin should be at ~ centerHeight + 0.2.
            // BUT VL Double had "lift += 0.60". 
            // This suggests the entire structure (or just roof?) was lifted. 
            // Wait, PortalFrame draws Rafter at `centerHeight`. 
            // If Roof is lifted +0.60 relative to that, there's a gap?
            // Ah, VL Double has struts. The Rafter might be higher?
            // Let's stick to simple placement on top of Rafter for PL.
            // For PL, Rafter is at `centerHeight`.
            // Purlins at `centerHeight + 0.2` (half depth).
        }

        if (buildingType === 'ombriere_vl_double' && Math.abs(width - 11.3) < 0.1) {
            centerHeight += 0.25; // Match Roof specific lift
        }

        // Adjust for perp offset (+ purlin height logic)
        // perpOffset = 0.2 + 0.07 ...
        // We just need them to sit on the rafter line.

        const rafterTopY = centerHeight + 0.2; // Top of IPE400

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlins; i++) {
                // Dist from High Point or Low Point?
                // Let's do Center-out or Edge-to-Edge.
                // Let's start from LEFT (-width/2) for consistency, but adjust Y.

                // If Droite (High Left): 
                // At x = -width/2, y = High. 
                // local x goes 0 to width.
                // angle is -10 deg.

                const dist = i * purlinSpacing;

                // Let's center the pattern so it looks symmetric
                // Start X = -slopeLength/2 + dist?
                // Current logic usually starts from an edge.
                // Let's stick to Edge to Edge (Left to Right).

                // Effective X (horizontal) = -width/2 + (i * spacingX)
                // Spacing X = purlinSpacing * Math.cos(angleRad)

                const spacingX = purlinSpacing * Math.cos(angleRad);
                const currentX = -width / 2 + (i * spacingX); // Rough approx, loop count might differ

                // More accurate: Run along slope `s` from -slopeLength/2 to +slopeLength/2
                // s = -slopeLength / 2 + (i * purlinSpacing);
                // If i goes 0 to numPurlins, we cover [0, L].
                // Shift to [-L/2, L/2].
                // const sCentered = s + (purlinSpacing / 2); // Adjustment to center? No need.

                // If Droite (Angle -10):
                // slopes down.
                // x = (s - L/2) * cos(-10)
                // y = (s - L/2) * sin(-10)

                // FORCE DOWN to RIGHT (-angle).
                const angleSign = -1;
                const effectiveAngle = angleSign * angleRad;

                // Position along slope, centered on 0,0 (Rafter Center)
                // We iterate `i` from 0 to numPurlins.
                // Total span `numPurlins * purlinSpacing`.
                // Center it.
                const totalSpan = numPurlins * purlinSpacing;
                const startS = -totalSpan / 2;
                const currentS = startS + (i * purlinSpacing);

                const xLocal = currentS * Math.cos(effectiveAngle);
                const yLocal = currentS * Math.sin(effectiveAngle);

                // Add Perpendicular Offset (Up from rafter)
                // Normal to slope `a`: (-sin a, cos a)
                // perpOffset ~ 0.27 normally. 
                // For Double: Lift 0.85 + SolarMargin 0.20 - PanelThick 0.02 - PurlinH 0.07 (Top to Center) = ~0.96
                const customOffset = (width >= 9 && width <= 12) ? 0.96 : perpOffset;
                // Note: using width range or explicit building type check context if available, 
                // but here we are in 'ombriere' block.
                // Re-check buildingType prop available in scope? Yes.
                const appliedOffset = (buildingType === 'ombriere_vl_double') ? 0.96 : perpOffset;

                const nx = -Math.sin(effectiveAngle) * appliedOffset;
                const ny = Math.cos(effectiveAngle) * appliedOffset;

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-Omb-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            xLocal + nx, // Centered X + offset
                            centerHeight + yLocal + ny, // Centered Y + slope + offset
                            zStart
                        ]}
                        rotation={[0, Math.PI, effectiveAngle]}
                    />
                );
            }
        }
    }
    // --- ASYMMETRICAL 2 ZONES GENERATION ---
    else if (buildingType === 'asymetrique_2') {
        const w = width;
        const rightEave = 4.0;
        let leftEave, ridge;

        // Heights based on width
        if (Math.abs(width - 25.5) < 0.1) {
            leftEave = 6.9;
            ridge = 8.9;
        } else if (Math.abs(width - 29.1) < 0.1) {
            leftEave = 7.9;
            ridge = 9.8;
        } else {
            const rAngle = 15 * (Math.PI / 180);
            ridge = rightEave + (w * 0.75 * Math.tan(rAngle));
            leftEave = ridge - (w * 0.25 * Math.tan(rAngle));
        }

        // Apex at 1/4 from left
        const apexX = -w / 2 + (w * 0.25);

        // Left slope: left eave to apex (1/4 of width)
        const leftSpan = w * 0.25;
        const lRise = ridge - leftEave;
        const lAngle = Math.atan(lRise / leftSpan);

        // Right slope: apex to right eave (3/4 of width)
        const rightSpan = w * 0.75;
        const rRise = ridge - rightEave;
        const rAngle = Math.atan(rRise / rightSpan);

        // --- Left Side (Short - 1/4) ---
        const leftSlopeLen = leftSpan / Math.cos(lAngle);
        const numPurlinsLeft = Math.floor(leftSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlinsLeft; i++) {
                const dist = i * purlinSpacing;
                const xLocal = dist * Math.cos(lAngle);
                const yLocal = dist * Math.sin(lAngle);
                const xPerp = -perpOffset * Math.sin(lAngle);
                const yPerp = perpOffset * Math.cos(lAngle);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-L-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            leftEave + yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, -lAngle]}
                    />
                );
            }
        }

        // --- Right Side (Long - 3/4) ---
        const rightSlopeLen = rightSpan / Math.cos(rAngle);
        const numPurlinsRight = Math.floor(rightSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlinsRight; i++) {
                const dist = i * purlinSpacing;
                const xLocal = dist * Math.cos(rAngle);
                const yLocal = dist * Math.sin(rAngle);
                const xPerp = perpOffset * Math.sin(rAngle);
                const yPerp = perpOffset * Math.cos(rAngle);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-R-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            apexX + xLocal + xPerp,
                            ridge - yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, rAngle]}
                    />
                );
            }
        }
    }
    // --- ASYMMETRICAL GENERATION ---
    else if (buildingType === 'asymetrique_1') {
        const w = width;
        const rightEave = 4.0;
        let leftEave = 6.4;
        let ridge = 7.4;

        // Force 15 deg logic
        const rS = 15 * Math.PI / 180;
        ridge = 4.0 + (w * 0.75 * Math.tan(rS));
        leftEave = ridge - (w * 0.25 * Math.tan(rS));

        const rightSpan = w * 0.75;
        const rRise = ridge - rightEave;
        const rAngle = Math.atan(rRise / rightSpan);

        const lSpan = w * 0.25;
        const lRise = ridge - leftEave;
        const lAngle = Math.atan(lRise / lSpan);

        // --- Left Side (Steep) ---
        const leftSlopeLen = lSpan / Math.cos(lAngle);
        const numPurlinsLeft = Math.floor(leftSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlinsLeft; i++) {
                const dist = i * purlinSpacing;

                const xLocal = dist * Math.cos(lAngle);
                const yLocal = dist * Math.sin(lAngle);

                // Perp Offset 
                const xPerp = -perpOffset * Math.sin(lAngle);
                const yPerp = perpOffset * Math.cos(lAngle);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-L-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            leftEave + yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, -lAngle]}
                    />
                );
            }
        }

        // --- Right Side (Shallow - 15 deg) ---
        const rightSlopeLen = rightSpan / Math.cos(rAngle);
        const numPurlinsRight = Math.floor(rightSlopeLen / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            for (let i = 0; i <= numPurlinsRight; i++) {
                const dist = i * purlinSpacing;

                // Right Side Logic: Starts at Right Eave (Width/2, EaveHeight)
                // Goes Up-Left.
                // Local X = - dist * cos(rAngle)
                // Local Y = dist * sin(rAngle)

                const xLocal = -dist * Math.cos(rAngle);
                const yLocal = dist * Math.sin(rAngle);

                // Perp Offset (Normal points UP-RIGHT) -> (sin, cos)
                const xPerp = perpOffset * Math.sin(rAngle);
                const yPerp = perpOffset * Math.cos(rAngle);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-R-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            halfWidth + xLocal + xPerp,
                            eaveHeight - 1.5 + yLocal + yPerp, // Lower by 1.5m
                            zStart
                        ]}
                        rotation={[0, Math.PI, rAngle]}
                    />
                );
            }
        }

    }
    // --- SYMMETRICAL GENERATION ---
    else {
        const angleRad = (roofPitch * Math.PI) / 180;
        const slopeLength = halfWidth / Math.cos(angleRad);
        const numPurlinsPerSide = Math.floor(slopeLength / purlinSpacing);

        for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
            const zStart = -bayIndex * baySpacing;

            // Loop through PURLIN ROWS
            for (let i = 0; i <= numPurlinsPerSide; i++) {
                const dist = i * purlinSpacing;

                // --- Left Side ---
                const xLocal = dist * Math.cos(angleRad);
                const yLocal = dist * Math.sin(angleRad);

                const xPerp = -perpOffset * Math.sin(angleRad);
                const yPerp = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-L-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            -halfWidth + xLocal + xPerp,
                            eaveHeight + yLocal + yPerp,
                            zStart
                        ]}
                        rotation={[0, Math.PI, -angleRad]}
                    />
                );

                // --- Right Side ---
                const xLocalR = dist * Math.cos(angleRad);
                const yLocalR = dist * Math.sin(angleRad);

                const xPerpR = perpOffset * Math.sin(angleRad);
                const yPerpR = perpOffset * Math.cos(angleRad);

                purlins.push(
                    <mesh
                        key={`Bay${bayIndex}-R-${i}`}
                        geometry={bayGeometry}
                        material={material}
                        position={[
                            halfWidth - xLocalR + xPerpR,
                            eaveHeight + yLocalR + yPerpR,
                            zStart
                        ]}
                        rotation={[0, Math.PI, angleRad]}
                    />
                );
            }
        }
    }

    return <group>{purlins}</group>;
}
