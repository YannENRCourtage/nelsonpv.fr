import React, { useMemo } from 'react';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import * as THREE from 'three';
import { getIPEProfileParams } from '../utils/profiles.js';

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
    // Steel material: "Heavy Industry" Red Oxide or Rough Galvanized
    const steelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#8a949b', // Darker galvanized / weathered steel
        metalness: 0.4,
        roughness: 0.7, // Rougher surface
    }), []);

    // 1. Columns (Poteaux) - Heavy IPE 450
    // Dynamic Scale: +5% for each width step above 15m.
    // Available Widths: [15, 18.6, 22.3, 26, 29.8, 33.5]
    // Steps: 0, 1, 2, 3, 4, 5
    const availableWidths = [15.0, 18.6, 22.3, 26.0, 29.8, 33.5];
    const widthIndex = availableWidths.findIndex(w => Math.abs(w - width) < 0.1); // Tolerant match
    const scaleFactor = 1 + (Math.max(0, widthIndex) * 0.05);

    // Initial IPE Params (Base)
    const baseColumnProfile = useMemo(() => getIPEProfileParams('IPE450'), []); // No eaveHeight here, as extrusion depth is handled by custom geometry

    // Custom Geometry Generator for Slanted Columns
    const createSlantedColumn = (profileParams, angle, isRight, height) => {
        // Extrude with depth = height.
        const geo = new THREE.ExtrudeGeometry(profileParams.shape, {
            depth: height, // Vertical Height
            bevelEnabled: false
        });

        // Manual Shear of Top Vertices
        // Iterate position attribute.
        const pos = geo.attributes.position;
        const v = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);

            if (v.z > height - 0.1) { // Top Cap
                // Apply Slant. 
                // In Local Frame: Web is along X (per PortalFrame rotation logic planning).
                v.z += (v.y * Math.tan(angle));
            }

            pos.setXYZ(i, v.x, v.y, v.z);
        }

        geo.computeVertexNormals();
        return geo;
    };

    const isMonopente = buildingType === 'monopente';

    // Angle validation
    const monoSlopeRad = isMonopente ? Math.atan((ridgeHeight - eaveHeight) / width) : 0;
    const symAngleRad = (roofPitch * Math.PI) / 180;
    const angleRad = isMonopente ? monoSlopeRad : symAngleRad;

    // Column Heights
    const leftColHeight = eaveHeight;
    const rightColHeight = isMonopente ? ridgeHeight : eaveHeight;
    // Column Angles
    // Left: +Angle
    // Right: Monopente (+Angle same direction), Sym (-Angle opposite)
    const rightColAngle = isMonopente ? angleRad : -angleRad;

    const leftColumnGeo = useMemo(() => createSlantedColumn(baseColumnProfile, angleRad, false, leftColHeight), [baseColumnProfile, leftColHeight, angleRad]);
    const rightColumnGeo = useMemo(() => createSlantedColumn(baseColumnProfile, rightColAngle, true, rightColHeight), [baseColumnProfile, rightColHeight, rightColAngle]);

    // 2. Rafters
    // Monopente: Single Rafter IPE400
    // Sym: Double Rafter IPE400

    // We can define the Monopente Rafter here
    const monoRafterLength = width / Math.cos(angleRad);
    const monoRafterGeo = useMemo(() => {
        if (!isMonopente) return null;
        const params = getIPEProfileParams('IPE400', monoRafterLength);
        return new THREE.ExtrudeGeometry(params.shape, params.options);
    }, [isMonopente, monoRafterLength]);

    // If Monopente, return structure immediately
    if (isMonopente) {
        return (
            <group position={position}>
                {/* Left Column */}
                <mesh geometry={leftColumnGeo} material={steelMaterial} position={[-width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Right Column */}
                <mesh geometry={rightColumnGeo} material={steelMaterial} position={[width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[scaleFactor, scaleFactor, 1]} castShadow receiveShadow />

                {/* Single Rafter: Starts at Left Eave, goes to Right Ridge */}
                <group position={[-width / 2, eaveHeight, 0]}>
                    <mesh
                        geometry={monoRafterGeo}
                        material={steelMaterial}
                        rotation={[0, 0, angleRad]}
                        castShadow receiveShadow
                    >
                        {/* Adjust orientation: IPE extrusion assumes Z-axis length. 
                            We rotated Parent Z to Slope. 
                            Child Mesh needs to align Extrusion Z with Parent X? 
                            Wait. createSlantedColumn used rotation={[-Math.PI/2, 0, Math.PI/2]}.
                            Rafter Profile (IPE) is XY shape. Extrusion Z.
                            We want Profile Vertical (Y). Length Horizontal (X).
                            Standard Rotation `[0, Math.PI/2, 0]` rotates Z->X.
                        */}
                        <group rotation={[0, Math.PI / 2, 0]} /> {/* No, apply to mesh */}
                    </mesh>
                    {/* Correct way: */}
                    <mesh
                        geometry={monoRafterGeo}
                        material={steelMaterial}
                        rotation={[0, Math.PI / 2, 0]} // Z(Length) -> X(Horizontal)
                        castShadow receiveShadow
                    />
                </group>
            </group>
        );
    }

    // --- Symmetrical Logic Continues ---
    const halfWidth = width / 2;
    // ... rest of code uses `angleRad` (which is symAngleRad basically)
    // Recalculate haunches based on angleRad (which is correct).


    // 2. Rafters (Arbalétriers) - Heavy IPE 400
    // Math for Apex Cut:
    // We want the rafter to end exactly at X=0 with a vertical cut.
    // However, ExtrudeGeometry makes a perpendicular cut at the end.
    // To get a vertical cut at the apex, we'd need to subtract a shape or use a custom shape.
    // Simplification for "Screb Look": Stop 10mm short of center.

    // 4. Apex Haunch (Jarret de Faîtage) logic
    // We want the rafters to TOUCH at the top.
    const apexGap = 0.001; // Virtually zero

    // Create a custom shape for the Apex Haunch

    // Rafter Logic
    const rafterHorizontalSpan = halfWidth - apexGap;
    const rafterLength = rafterHorizontalSpan / Math.cos(angleRad);
    const rafterProfileType = 'IPE400';
    const rafterGeometry = useMemo(() => {
        const params = getIPEProfileParams(rafterProfileType, rafterLength);
        return new THREE.ExtrudeGeometry(params.shape, params.options);
    }, [rafterLength]);

    // Knee Haunch (Jarret) Logic
    const haunchShape = useMemo(() => {
        const s = new THREE.Shape();
        const hRafter = 1.2; // Length along rafter
        const hColumn = 0.8; // Length down column

        // We need the "Column Side" of the haunch to be Vertical in World Space.
        // In Rafter Local Space (rotated by angleRad), a vertical vector (0, -1) becomes tilted.
        // We need the inverse: What local vector becomes (0, -hColumn) in World?
        // Rotz(a) * v_local = v_world
        // v_local = Rotz(-a) * v_world
        // v_world = (0, -hColumn)
        // x_local = 0 - (-hColumn * -Math.sin(angleRad)) = -hColumn * Math.sin(angleRad)
        // y_local = 0 + (-hColumn * Math.cos(angleRad)) = -hColumn * Math.cos(angleRad)

        const xBottom = -hColumn * Math.sin(angleRad);
        const yBottom = -hColumn * Math.cos(angleRad);

        // (0,0) is overlap with Top Flange of Column / Bottom Flange of Rafter intersection?
        // Actually, (0,0) in Rafter group is the Pivot (Axis intersection).
        // Rafter bottom is at y = -0.2.
        // So Haunch Top Edge should be at y = -0.2.
        // Let's shift the shape so (0,0) is on the Rafter Bottom.
        // But our mesh position is [0, -0.2]. So Shape Y=0 aligns with Rafter Bottom. OK.

        s.moveTo(0, 0); // Corner at Rafter Bottom
        s.lineTo(hRafter, 0); // Along Rafter Bottom
        s.lineTo(xBottom, yBottom); // To Bottom Tip (Vertical back edge)
        s.lineTo(0, 0); // Close

        return s;
    }, [angleRad]);

    const haunchGeometry = useMemo(() => new THREE.ExtrudeGeometry(haunchShape, {
        depth: 0.015,
        bevelEnabled: false
    }), [haunchShape]);

    // Apex Haunch Logic
    const apexHaunchGeometry = useMemo(() => {
        const s = new THREE.Shape();

        // Rafter Profile Height (IPE400) -> 0.4m
        const rHeight = 0.4;
        const halfH = rHeight / 2;

        // We are at Apex (X=0). Rafter Axis is at Y=ridgeHeight.
        // Rafter Bottom Flange is perpendicular distance 0.2m from axis.
        // Vertical distance to bottom flange = 0.2 / cos(angle)
        const verticalOffset = halfH / Math.cos(angleRad);

        const yTop = -verticalOffset; // Start exactly at Rafter Bottom intersection

        const hLength = 0.8; // Horizontal coverage
        const hDepth = 0.35; // Height of the haunch plate itself

        // Bottom Tip
        const yTip = yTop - hDepth;

        // Draw V shape
        s.moveTo(0, yTop); // Top Center
        // Slope down-left: y = yTop - x*tan(angle) ?
        // Rafter bottom slope equation line.
        // We want the haunch top edge to hug the rafter bottom.
        // Left side point: x = -hLength. y = yTop - (hLength * tan(angle)) ?
        // Wait, rafter goes DOWN as we go out.
        // y_rafter = y_apex - |x| * tan(angle) - verticalOffset.
        // Yes.

        const ySide = yTop - (hLength * Math.tan(angleRad));

        s.lineTo(-hLength, ySide); // Left Upper Corner
        // Vertical drop or tapered? Usually tapered.
        // Let's go to Tip.
        s.lineTo(0, yTip); // Bottom Tip
        s.lineTo(hLength, ySide); // Right Upper Corner
        s.lineTo(0, yTop); // Close

        return new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false });
    }, [angleRad]);

    return (
        <group position={position}>
            {/* --- Left Column (Poteau Gauche) --- */}
            {/* Mounted at x = -width/2.
                Rotate -90 on X (Vertical).
                Rotate 90 on Z (Local) to align Strong Axis "I" perpendicular to wall.
                Wall is Z-axis. "I" web should be along X-axis.
                Extrusion (Length) is along global Y.
            */}
            <mesh
                geometry={leftColumnGeo}
                material={steelMaterial}
                position={[-width / 2, 0, 0]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Strong Axis
                scale={[scaleFactor, scaleFactor, 1]} // Scale Profile (X,Y). Height (Z) is fixed by geometry.
                castShadow
                receiveShadow
            />

            {/* --- Right Column (Poteau Droit) --- */}
            <mesh
                geometry={rightColumnGeo}
                material={steelMaterial}
                position={[width / 2, 0, 0]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                scale={[scaleFactor, scaleFactor, 1]}
                castShadow
                receiveShadow
            />

            {/* --- Left Rafter (Arbalétrier Gauche) --- */}
            <group position={[-width / 2, eaveHeight, 0]}>
                <group rotation={[0, 0, angleRad]}>
                    <mesh
                        geometry={rafterGeometry}
                        material={steelMaterial}
                        rotation={[0, Math.PI / 2, 0]} // Z -> X
                        castShadow
                        receiveShadow
                    />
                    {/* Knee Haunch Left */}
                    <mesh
                        geometry={haunchGeometry}
                        material={steelMaterial}
                        position={[0, -0.2, -0.0075]}
                    />
                </group>
            </group>

            {/* --- Right Rafter (Arbalétrier Droit) --- */}
            <group position={[width / 2, eaveHeight, 0]}>
                <group rotation={[0, 0, -angleRad]}>
                    <mesh
                        geometry={rafterGeometry}
                        material={steelMaterial}
                        rotation={[0, -Math.PI / 2, 0]} // Z -> -X
                        castShadow
                        receiveShadow
                    />
                    {/* Knee Haunch Right */}
                    <mesh
                        geometry={haunchGeometry}
                        material={steelMaterial}
                        position={[0, -0.2, 0.0075]}
                        rotation={[0, Math.PI, 0]}
                        castShadow
                    />
                </group>
            </group>

            {/* --- Apex Haunch (Jarret de Faîtage) --- */}
            <group position={[0, ridgeHeight, 0]}>
                <mesh
                    geometry={apexHaunchGeometry}
                    material={steelMaterial}
                    position={[0, 0, -0.0075]} // Centered depth
                    castShadow
                    receiveShadow
                />
            </group>

        </group>
    );
}
