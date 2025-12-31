import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createTrapezoidalProfile } from '../utils/profiles.js';

/**
 * Awning (Auvent) Component
 * - 9.3m Width
 * - Starts at Building Eave (5.5m)
 * - Ends at 3.87m
 * - 10 degree pitch (same as building)
 * - Covered by Bac Acier (Steel Deck)
 * - Supports (Columns) at the 3.87m end
 */
export function Awning({ length, eaveHeight, roofPitch, buildingWidth }) {

    // --- DIMENSIONS ---
    const awningWidth = 9.3;
    const startHeight = eaveHeight; // 5.5m
    const endHeight = 3.87;
    const angleRad = (roofPitch * Math.PI) / 180;

    // Verify math: 5.5 - (9.3 * tan(10)) = 3.86. (Matches request)

    // Position: Attached to the RIGHT side of the building (X = buildingWidth/2)
    const startX = buildingWidth / 2;

    // The awning slope goes DOWN as X increases.
    // So slope angle is negative relative to horizontal if going right?
    // Building roof goes UP to center.
    // This is a lean-to EXTENSION.
    // If it's on the Right side, and slope is 10 deg (down), then:
    // Angle = -10 deg.

    // --- MATERIALS ---
    const structureMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#8b9bb4', // Galvanized steel
        metalness: 0.5,
        roughness: 0.2
    }), []);

    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#383e42', // RAL 7016 (Same as main roof)
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    }), []);

    // --- ROOF GEOMETRY ---
    // Length of the slope = Width / cos(angle)
    const slopeLength = awningWidth / Math.cos(angleRad) + 0.2; // +20cm overhang

    // Profile for roof sheet
    const profileShape = useMemo(() => createTrapezoidalProfile(slopeLength, 0.035, 0.25), [slopeLength]);

    const roofGeometry = useMemo(() => new THREE.ExtrudeGeometry(profileShape, {
        depth: length + 1.0, // Same overhangs as building
        bevelEnabled: false
    }), [profileShape, length]);

    // --- STRUCTURE (RAFTERS) ---
    // Simple IPE profile for rafters
    const rafterShape = useMemo(() => {
        const s = new THREE.Shape();
        const w = 0.1; // 10cm wide
        const h = 0.2; // 20cm high
        s.moveTo(-w / 2, -h / 2);
        s.lineTo(w / 2, -h / 2);
        s.lineTo(w / 2, h / 2);
        s.lineTo(-w / 2, h / 2);
        s.lineTo(-w / 2, -h / 2);
        return s;
    }, []);

    // Rafter Geometry (Length = slopeLength)
    const rafterGeom = useMemo(() => new THREE.ExtrudeGeometry(rafterShape, {
        depth: slopeLength,
        bevelEnabled: false
    }), [rafterShape, slopeLength]);

    // Create Rafters at typical spacing (e.g. every bay)
    // We don't have bay positions passed here, but we know length.
    // Let's assume rafters align with main frames.
    // We can just iterate based on length / baySpacing if we had it.
    // For now, let's just place them every ~6-7m?
    // Better: Receive 'frames' or 'zPositions' if possible.
    // Simplified: Place one at start, one at end, and some in middle.
    // Re-using logic from Structure is best, but let's keep it self-contained visually.
    // Let's create an array of Z positions corresponding to bays.
    // Wait, length depends on bayCount. We can deduce bayCount roughly.
    // Actually, `Structure.jsx` knows the frames. Maybe we should instantiate Awning inside Structure loop?
    // No, Awning is a single object covering the length.

    // Let's generate rafters every 6m or so.
    const numRafters = Math.max(2, Math.floor(length / 6) + 1);
    const rafters = [];
    for (let i = 0; i <= numRafters; i++) {
        const z = - (i / numRafters) * length;
        // We want to align with start/end of building (0 to -length).
        // Actually specific bay spacing is better.
    }
    // Better approach: Just use a fixed number for visual rep since user didn't specify structural details.
    // Let's assume 1 per bay is ideal but we don't have bayCount props.
    // We'll pass `bayCount` to Awning?
    // Yes.

    return (
        <group position={[startX, startHeight, 0]}>
            {/* ROOF SHEETS */}
            <mesh
                geometry={roofGeometry}
                material={roofMaterial}
                // Position:
                // X: Slightly offset to start?
                // Y: On top of rafters.
                // Z: Start at back overhang (-length - 0.5)
                // Rotation: -10 deg around Z. (Sloping down to right)
                // Orientation of Profile: Profile is X-width. Extrusion is Z-depth.
                // So Default Extrude goes along Z. 
                // We need to Rotate the generic profile? 
                // `createTrapezoidalProfile` creates shape in XY plane. Extrude pushes Z.
                // We want waves running DOWN the slope (X).
                // So we need profile in YZ plane? Or Extrude along X?
                // Main Roof: Profile width = slopeLength (Y direction in shape?).
                // "Waves down-slope" means ribs are parallel to slope.
                // Current `Roof.jsx` uses `depth: length`. Ribs run Horizontal (Z).
                // User said "recouvert d'un bac acier". Usually same orientation.
                // So ribs Horizontal (Parallel to Purlins).
                // Same geometry setup as Main Roof.
                position={[
                    0, // Local 0 is attachment point
                    0.2, // Offset up for thickness/rafters
                    -length - 0.5
                ]}
                rotation={[0, 0, -angleRad]} // Rotate down 10 deg
                castShadow
                receiveShadow
            />

            {/* COLUMNS (At the end) */}
            {/* We need columns at X = awningWidth. Y goes from 0 to endHeight (3.87). */}
            {/* Z positions: -0.5, -length/2, -length + 0.5? i.e. Start, Middle, End? */}
            {/* Let's place 3 columns for stability visualization. */}
            {[0, -length / 2, -length].map((zVal, idx) => (
                <mesh
                    key={idx}
                    material={structureMaterial}
                    position={[awningWidth, -startHeight + endHeight / 2, zVal]}
                // Y Position:
                // Local Y=0 is at 5.5m (Attachment).
                // Ground is at -5.5m (Global 0).
                // End height is 3.87m above ground.
                // Column height = 3.87m.
                // Column Center Y = -5.5 + 3.87/2.
                // Wait, `startHeight` passed is 5.5.
                // So Group is at Y=5.5.
                // Column foot is at Y=-5.5 relative to group (Global 0).
                // Column top is at Y=-5.5 + 3.87 relative to group.
                // Column Center = (-5.5 + (-5.5+3.87))/2 = -5.5 + 1.935.
                >
                    <boxGeometry args={[0.2, endHeight, 0.2]} />
                </mesh>
            ))}

            {/* RAFTERS (Beams connecting wall to columns) */}
            {[0, -length / 2, -length].map((zVal, idx) => (
                <mesh
                    key={`rafter-${idx}`}
                    material={structureMaterial}
                    position={[awningWidth / 2, - (awningWidth / 2) * Math.tan(angleRad), zVal]}
                    rotation={[0, 0, -angleRad]}
                >
                    <boxGeometry args={[awningWidth, 0.2, 0.1]} />
                </mesh>
            ))}
        </group>
    );
}
