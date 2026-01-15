import React, { useMemo } from 'react';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Renders dimension lines and surface area text.
 * Optimized with useMemo to prevent re-render loops from new object creation.
 */
export function DimensionsMarkers({ width, length, eaveHeight, ridgeHeight, roofPitch, leftSide, rightSide, showDimensions, buildingType = 'symetrique' }) {
    if (!showDimensions) return null;

    const textColor = "#000000";
    const lineColor = "#000000";
    const lineWidth = 2;
    const gapSize = 3.0;
    const isOmbriere = buildingType.startsWith('ombriere');

    // Widths
    const getExtWidth = (type) => {
        if (type === 'appentis') return 9.3;
        if (type === 'auvent') {
            // Standardized to 4.0m for both Monopente and Symetrique per user request
            return 4.0;
        }
        return 0;
    };

    const getExtHeight = (type) => {
        if (type === 'auvent') return 4.8; // Auvent Height Target
        if (type === 'appentis') return 3.9; // Appentis Height
        return 0;
    };

    const leftWidth = parseFloat(getExtWidth(leftSide).toFixed(2));
    const rightWidth = parseFloat(getExtWidth(rightSide).toFixed(2));
    const leftHeight = getExtHeight(leftSide);
    const rightHeight = getExtHeight(rightSide);

    // --- MEMOIZED GEOMETRY HELPERS ---

    // 1. Width Arrow
    const { widthPoints, widthStart, widthEnd } = useMemo(() => {
        const isOmbriere = buildingType.startsWith('ombriere');
        const yHeight = isOmbriere ? 0.1 : 0.1; // Ground level for Ombriere per user request (was 1.5)

        const zFront = 3.0;
        const start = new THREE.Vector3(-width / 2, yHeight, zFront);
        const end = new THREE.Vector3(width / 2, yHeight, zFront);
        const mid = new THREE.Vector3(0, yHeight, zFront);
        return {
            widthStart: start,
            widthEnd: end,
            widthPoints: [
                [start, new THREE.Vector3(mid.x - gapSize / 2, mid.y, mid.z)],
                [new THREE.Vector3(mid.x + gapSize / 2, mid.y, mid.z), end]
            ]
        };
    }, [width, gapSize, buildingType]);

    // 2. Length Arrow (Right Side)
    const { lengthPoints, lengthStart, lengthEnd, xSide } = useMemo(() => {
        const x = width / 2 + rightWidth + 3.0;
        const start = new THREE.Vector3(x, 0.1, 0);
        const end = new THREE.Vector3(x, 0.1, -length);
        const mid = new THREE.Vector3(x, 0.1, -length / 2);
        return {
            xSide: x,
            lengthStart: start,
            lengthEnd: end,
            lengthPoints: [
                [start, new THREE.Vector3(mid.x, mid.y, mid.z + gapSize / 2)],
                [new THREE.Vector3(mid.x, mid.y, mid.z - gapSize / 2), end]
            ]
        };
    }, [width, length, rightWidth, gapSize]);

    // 3. Eave Height (Left Side - Wait, if Left Ext exists, Eave marker moves?)
    // Originally: `x = hasAuvent ? (width / 2 + 2.0) : (-width / 2 - 2.0);`
    // This logic was ensuring the Eave Marker is NOT overlapped by left extension?
    // If Left Extension exists, the Eave Marker for the MAIN building (-width/2) is hidden inside?
    // Or does it move to the EDGE of the extension?
    // User requested "Alignement verticale au trait".
    // Usually Eave Height is for the Main Building.
    // If Extension is there, maybe keep it at Main Building Eave?
    // BUT the marker code moved it.
    // If Left Extension exists, `x` should be `-width/2 - leftWidth - 2.0`?
    // Or if `hasAuvent` (Left), it moved to `width/2 + 2.0` (Right Side)?
    // Ah, if Left has Auvent, it moved the Eave Marker to the RIGHT side?
    // Let's check original code `DimensionsMarkers.jsx` lines 54:
    // `const x = hasAuvent ? (width / 2 + 2.0) : (-width / 2 - 2.0);`
    // If `hasAuvent` (Left), x = Right Side.
    // So it moved the indicator to avoid the Auvent.
    // Now we have independent sides.
    // If Left has Extension, try Right.
    // If Right has Extension, try Left?
    // If BOTH have extensions, pick one outer edge?
    // Let's assume we place it on Left, but offset if Left Ext exists.
    // `const x = -width / 2 - leftWidth - 2.0;`
    // This places it outside the left extension.
    // And verifies the height of the EAVE (which is usually same for extension connection?).
    // Actually eaveHeight is Main Building Eave.
    // Extension might be lower/higher.
    // Marker usually indicates Main Building Eave.
    // I'll place it at `x = -width/2 - leftWidth - 2.0`.

    // 3. Eave Height (Right Side for Monopente, Left for Sym?)
    // Actually, Sym is Left/Right same. 
    // Monopente New: Left is Ridge, Right is Eave.
    // So Eave Marker should be on Right for Monopente.
    // Sym: Keep on Left (Standard).

    // 3. Eave Height (Standard / Right for Asym/Monopente)
    const { heightPoints, heightStart, heightEnd, xEave } = useMemo(() => {
        let x;
        let h = eaveHeight; // Default

        if (buildingType === 'monopente') {
            // Right Side
            x = rightSide !== 'none' ? width / 2 + 1.5 : width / 2 + 3.0;
        } else if (buildingType === 'ombriere_vl_simple_droite') {
            // Low side Right. Eave Marker on Right.
            x = width / 2 + 1.5;
        } else if (buildingType === 'ombriere_vl_simple_gauche') {
            // Low side Right (Unified High Left -> Low Right).
            x = width / 2 + 1.5;
        } else if (buildingType === 'ombriere_vl_double' || buildingType === 'ombriere_pl') {
            // User Request (Images): Match positions of Simple Gauche
            // Previously set to +3.0, now reverting/adjusting to +1.5 to match Simple Gauche.
            x = width / 2 + 1.5;
        } else if (buildingType === 'asymetrique_2') {
            return { heightPoints: null, heightStart: null, heightEnd: null, xEave: null };
        } else if (buildingType === 'asymetrique_1') {
            // Right Side (Fixed at 4.0m) - handled here for simple display logic, 
            // but for Asym 2 we use a specific marker elsewhere? 
            // Actually Asym 1 uses standard logic for Right (4m), Asym 2 uses specific Right (4m).
            // But this block is for the "Primary Eave Height" marker.
            // For Asym 1, primary is Right (4m).
            // For Asym 2, primary is Right (4m) too? No, user said "Remove 5.5m indication on left".
            // The standard marker (lines 122-123) is Left Side for Sym/Mono?

            // Let's refine:
            // Sym/Default -> Left Side (eaveHeight)
            // Monopente -> Right Side (eaveHeight)
            // Asym 1 -> Right Side (4.0m)
            // Asym 2 -> Right Side (4.0m) ? User said "Retire l'indication de 5.5m pour la sablière gauche".
            // So we want to ensure NO marker is drawn on the left here.

            h = 4.0;
            x = rightSide !== 'none' ? width / 2 + 1.5 : width / 2 + 3.0; // Show on Right for Asym 1 & 2
        } else {
            // Left Side (Standard Sym)
            x = leftSide !== 'none' ? -width / 2 - 1.5 : -width / 2 - 3.0;
        }

        const start = new THREE.Vector3(x, 0, 0);
        const end = new THREE.Vector3(x, h, 0);
        const mid = new THREE.Vector3(x, h / 2, 0);
        return {
            xEave: x,
            heightStart: start,
            heightEnd: end,
            heightPoints: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [width, eaveHeight, leftSide, rightSide, gapSize, buildingType]);

    // 3b. Ridge Height
    const { ridgePoints, ridgeStart, ridgeEnd, xRidge, zRidge, ridgeLabelValue } = useMemo(() => {
        let x = 0;
        let h = ridgeHeight;

        if (buildingType === 'monopente') {
            x = -width / 2 - 1.5; // Left Side
        } else if (buildingType === 'ombriere_vl_simple_droite') {
            // Slope Down-Right. Ridge is HIGH LEFT.
            // Eave (Low Right) is on Right.
            // So Ridge Marker should be on LEFT.
            x = -width / 2 - 1.5;
        } else if (buildingType === 'ombriere_vl_simple_gauche') {
            // Updated 13/01: Slope Down-Right (same as Droite).
            // Ridge is HIGH LEFT. Eave (Low Right) is on Right.
            x = -width / 2 - 1.5; // Set Ridge Marker to Left side for 'gauche'
        }
        // USER REQUEST 13/01/2026: Swap markers for 'gauche'.
        // 'ombriere_vl_simple_droite': High Left (Ridge), Low Right (Eave). (Already handled by standard logic if slopes are negative?)
        // 'ombriere_vl_simple_gauche': High Left (Ridge), Low Right (Eave).

        // The user wants:
        // Droite: Unchanged (Ridge Left 4.5m, Eave Right 2.9m)
        // Gauche: "Inverse aussi... indications". Ridge Left (4.5m), Eave Right (2.9m).

        // WAIT. If they are geometrically identical (High Left -> Low Right), then the markers should correspond to geometry.
        // If geometry is High Left, then Ridge IS Left.
        // Previously I might have forced them differently.

        // Let's explicitly set based on type to be sure.

        // The provided code block for `startText` and `endText` seems to be for text labels,
        // not for determining the `x` coordinate of the ridge line itself.
        // The `x` coordinate for the ridge marker for ombriere_vl_simple_gauche was already set to `width / 2 + 1.5` (Right side).
        // If the user wants the ridge marker for 'gauche' to be on the LEFT (like 'droite'),
        // then the `x` value needs to be changed here.
        // Based on the comment "Ridge Left (4.5m), Eave Right (2.9m)" for 'gauche',
        // it implies the ridge marker should be on the left side for 'gauche' as well.
        if (buildingType === 'ombriere_vl_simple_gauche') {
            x = -width / 2 - 1.5; // Set Ridge Marker to Left side for 'gauche'
        } else if (buildingType === 'ombriere_vl_double' || buildingType === 'ombriere_pl') {
            // Match 'simple_gauche': Ridge Left, Eave Right.
            x = -width / 2 - 1.5;
        }
        // The `startText` and `endText` variables are not used in this `useMemo` block,
        // which is responsible for calculating the line points, not the text content.
        // This part of the provided snippet is likely intended for the text rendering logic.

        else if (buildingType === 'asymetrique_1') {
            // Asym Ridge: Exact
            const rAngle = 15 * (Math.PI / 180);
            h = 4.0 + (width * 0.75 * Math.tan(rAngle));
            if (Math.abs(width - 20) < 0.5) h = 8.4;
            else if (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5) h = 7.4;

            // Apex
            x = -width / 2 + (width * 0.25);
        } else if (buildingType === 'asymetrique_2') {
            // Asym 2 Ridge: at apex (1/4 from left)
            if (Math.abs(width - 25.5) < 0.1) {
                h = 8.9;
            } else if (Math.abs(width - 29.1) < 0.1) {
                h = 9.8;
            } else {
                const rAngle = 15 * (Math.PI / 180);
                h = 4.0 + (width * 0.75 * Math.tan(rAngle));
            }

            // Apex at 1/4 from left
            x = -width / 2 + (width * 0.25);
        }

        // USER REQUEST 14/01/2026: Specific Ridge Heights for Ombrière VL Double
        // 9.1m -> 4.6m
        // 11.3m -> 4.7m
        if (buildingType === 'ombriere_vl_double') {
            if (Math.abs(width - 9.1) < 0.1) h = 4.6;
            else if (Math.abs(width - 11.3) < 0.1) h = 4.7;
        }

        // USER REQUEST 14/01/2026: Specific Ridge Heights for Ombrière VL Simple
        if (buildingType === 'ombriere_vl_simple_gauche') h = 4.4;
        if (buildingType === 'ombriere_vl_simple_droite') h = 4.7;

        // OMBRIÈRE PL
        if (buildingType === 'ombriere_pl') {
            // Eave (Low) at Right. Ridge (High) at Left.
            // Ridge = Eave + Width * tan(10deg)
            // Eaves: 15.8->6.0, 20.2->6.5, 24.6->7.0
            const tan10 = Math.tan(10 * Math.PI / 180);
            if (Math.abs(width - 15.8) < 0.1) h = 6.0 + (15.8 * tan10);
            else if (Math.abs(width - 20.2) < 0.1) h = 6.5 + (20.2 * tan10);
            else if (Math.abs(width - 24.6) < 0.1) h = 7.0 + (24.6 * tan10);
        }

        const z = 0;
        const start = new THREE.Vector3(x, 0, z);
        const end = new THREE.Vector3(x, h, z);
        const mid = new THREE.Vector3(x, h / 2, z);

        return {
            xRidge: x,
            zRidge: z,
            ridgeLabelValue: h,
            ridgeStart: start,
            ridgeEnd: end,
            ridgePoints: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [width, ridgeHeight, gapSize, buildingType]);

    // 3c. Left Eave Height (Asymmetrical ONLY)
    const asymLeftEaveData = useMemo(() => {
        if (buildingType !== 'asymetrique_1' && buildingType !== 'asymetrique_2') return null;

        // Dynamic Calculation: Ridge - Left Drop
        const rightEave = 4.0;
        const rSpan = width * 0.75;
        const rAngle = 15 * (Math.PI / 180);
        const ridge = rightEave + (rSpan * Math.tan(rAngle));

        let h;
        if (buildingType === 'asymetrique_2') {
            // USER REQUEST 12/01/2026: Updated sablière heights for BUILDING
            if (Math.abs(width - 25.5) < 0.1) h = 6.9; // 25.5m width (was 5.9m)
            else if (Math.abs(width - 29.1) < 0.1) h = 7.9; // 29.1m width (was 6.9m)
            else h = 6.9; // Fallback
        } else {
            // Asym 1
            h = 6.4;
            if (Math.abs(width - 20) < 0.5) h = 7.4;
            else if (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5) h = 6.4;
            else {
                // Fallback
                h = ridge - ((width * 0.25) * Math.tan(15 * Math.PI / 180));
            }
        }

        const x = leftSide !== 'none' ? -width / 2 - 1.5 : -width / 2 - 3.0;

        const start = new THREE.Vector3(x, 0, 0);
        const end = new THREE.Vector3(x, h, 0);
        const mid = new THREE.Vector3(x, h / 2, 0);

        return {
            xLeft: x,
            hVal: h,
            start, end,
            points: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [buildingType, width, leftSide, gapSize]);

    // 3d. Right Eave Height (Asymmetrical 2 Zones ONLY)
    const asym2RightEaveData = useMemo(() => {
        if (buildingType !== 'asymetrique_2') return null;
        // USER REQUEST 12/01/2026: Right sablière height for asymmetric 2 zones = 4m (BUILDING, not awning)
        const h = 4.0; // Fixed right eave height for BUILDING
        const x = width / 2 + 1.5; // Right side, outside

        const start = new THREE.Vector3(x, 0, 0);
        const end = new THREE.Vector3(x, h, 0);
        const mid = new THREE.Vector3(x, h / 2, 0);

        return {
            xRight: x,
            hVal: h,
            start, end,
            points: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [buildingType, width, gapSize]);

    // 5. Left Extension Dimensions
    const leftExtData = useMemo(() => {
        if (leftSide === 'none') return null;
        const extWidth = leftWidth;

        // FIX: Override height
        let extHeight = leftHeight;
        if (buildingType === 'monopente' && leftSide === 'auvent') {
            // Monopente Left Awning: Specific User Requests
            if (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5) {
                extHeight = 7.4; // Fixed 7.4m for 16.4m
            } else if (Math.abs(width - 12.7) < 0.5) {
                extHeight = 6.4; // Fixed 6.4m for 12.7m
            } else {
                // Fallback for monopente
                const drop = 4.0 * Math.tan((13 * Math.PI) / 180);
                extHeight = 4.0 - drop;
            }
        } else if (buildingType === 'asymetrique_1' && leftSide === 'auvent') {
            // Asym Left Auvent: 5.4m (16/16.4) or 6.4m (20)
            // USER REQUEST 12/01/2026: Dimension corrected back to 6.4m for 20m width
            if (Math.abs(width - 20) < 0.5) extHeight = 6.4; // Back to original height
            else if (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5) extHeight = 5.4;
        } else if (buildingType === 'asymetrique_2' && leftSide === 'auvent') {
            // USER REQUEST 12/01/2026: Asym 2 Left Auvent: 5.9m (25.5m) or 6.9m (29.1m)
            if (Math.abs(width - 25.5) < 0.1) extHeight = 5.9;
            else if (Math.abs(width - 29.1) < 0.1) extHeight = 6.9;
            else extHeight = 5.9; // Fallback
        }

        // Logic for Left side: Start -Width/2, End -Width/2 - ExtWidth

        const xStart = -width / 2;
        const xEnd = -width / 2 - extWidth;
        const xMid = -width / 2 - extWidth / 2;
        const zFront = 3.0;

        // Width Marker
        const wStart = new THREE.Vector3(xStart, 0.1, zFront);
        const wEnd = new THREE.Vector3(xEnd, 0.1, zFront);

        const wPoints = [
            [new THREE.Vector3(xStart, 0.1, zFront), new THREE.Vector3(xMid + gapSize / 2, 0.1, zFront)],
            [new THREE.Vector3(xMid - gapSize / 2, 0.1, zFront), new THREE.Vector3(xEnd, 0.1, zFront)]
        ];

        // Height
        const xH = -width / 2 - leftWidth - 2.0;
        return {
            extWidth, extHeight, xH,
            wStart, wEnd,
            widthPoints: wPoints,
            hStart: new THREE.Vector3(xH, 0, 0),
            hEnd: new THREE.Vector3(xH, extHeight, 0),
            heightPoints: [
                [new THREE.Vector3(xH, 0, 0), new THREE.Vector3(xH, extHeight / 2 - gapSize / 2, 0)],
                [new THREE.Vector3(xH, extHeight / 2 + gapSize / 2, 0), new THREE.Vector3(xH, extHeight, 0)]
            ]

        };
    }, [leftSide, leftWidth, leftHeight, width, gapSize, buildingType]);

    // 4. Right Extension Dimensions (Update for Monopente Right)
    const rightExtData = useMemo(() => {
        if (rightSide === 'none') return null;
        const extWidth = rightWidth;

        let extHeight = rightHeight;
        if (buildingType === 'monopente' && rightSide === 'auvent') {
            // Monopente Right Auvent: Tip at 3.0m
            extHeight = 3.0;
        } else if (buildingType === 'asymetrique_1' && rightSide === 'auvent') {
            // Right Auvent Tip: 3.0m
            extHeight = 3.0;
        } else if (buildingType === 'asymetrique_2' && rightSide === 'auvent') {
            // USER REQUEST 12/01/2026: Right Auvent for asymétrique 2 zones = 3m
            extHeight = 3.0;
        } else if (buildingType === 'symetrique' && rightSide === 'auvent') {
            // Sym Right Auvent: Low Point ~4.8m (High 5.5 - Rise)
            extHeight = 4.8;
        }

        const zFront = 3.0;

        // Width Marker
        const wStart = new THREE.Vector3(width / 2, 0.1, zFront);
        const wEnd = new THREE.Vector3(width / 2 + extWidth, 0.1, zFront);
        const wMid = new THREE.Vector3(width / 2 + extWidth / 2, 0.1, zFront);

        // Height Marker
        const xH = width / 2 + extWidth + 2.0;
        const hStart = new THREE.Vector3(xH, 0, 0);
        const hEnd = new THREE.Vector3(xH, extHeight, 0);
        const hMid = new THREE.Vector3(xH, extHeight / 2, 0);

        return {
            extWidth, extHeight, xH,
            wStart, wEnd,
            hStart, hEnd,
            widthPoints: [
                [wStart, new THREE.Vector3(wMid.x - gapSize / 2, wMid.y, wMid.z)],
                [new THREE.Vector3(wMid.x + gapSize / 2, wMid.y, wMid.z), wEnd]
            ],
            heightPoints: [
                [hStart, new THREE.Vector3(hMid.x, hMid.y - gapSize / 2, hMid.z)],
                [new THREE.Vector3(hMid.x, hMid.y + gapSize / 2, hMid.z), hEnd]
            ]
        };
    }, [rightSide, rightWidth, rightHeight, width, gapSize, buildingType, ridgeHeight]);

    // 3d. Middle Column Distance (Asymmetrical 2 Zones ONLY)
    const asym2MiddleColData = useMemo(() => {
        if (buildingType !== 'asymetrique_2') return null;

        const middleColX = -width / 2 + 13.1;
        const leftWallX = -width / 2;
        const zFront = 1.5; // Offset toward building

        // Width marker from left wall to middle column
        // Left to middle marker with gap in middle
        const wStart = new THREE.Vector3(leftWallX, 0.1, zFront);
        const wEnd = new THREE.Vector3(middleColX, 0.1, zFront);
        const wMid = new THREE.Vector3(leftWallX + 6.55, 0.1, zFront);
        const textGap = 1.5; // Larger gap for text clarity

        const wPoints = [
            [wStart, new THREE.Vector3(wMid.x - textGap, 0.1, zFront)],
            [new THREE.Vector3(wMid.x + textGap, 0.1, zFront), wEnd]
        ];

        return {
            wStart, wEnd, wMid,
            widthPoints: wPoints,
            distance: 13.1
        };
    }, [buildingType, width, gapSize]);

    // 3e. Middle Column to Right Distance (Asymm 2 Zones ONLY)
    const asym2RightDistData = useMemo(() => {
        if (buildingType !== 'asymetrique_2') return null;

        const middleColX = -width / 2 + 13.1;
        const rightWallX = width / 2;
        const zFront = 1.5; // Same offset as left marker

        // Determine distance based on width
        let distValue;
        if (Math.abs(width - 25.5) < 0.1) {
            distValue = 12.4;
        } else if (Math.abs(width - 29.1) < 0.1) {
            distValue = 16.0;
        } else {
            distValue = width - 13.1; // Fallback
        }

        const rStart = new THREE.Vector3(middleColX, 0.1, zFront);
        const rEnd = new THREE.Vector3(rightWallX, 0.1, zFront);
        const rMid = new THREE.Vector3(middleColX + distValue / 2, 0.1, zFront);
        const textGap = 1.5;

        const rPoints = [
            [rStart, new THREE.Vector3(rMid.x - textGap, 0.1, zFront)],
            [new THREE.Vector3(rMid.x + textGap, 0.1, zFront), rEnd]
        ];

        return {
            rStart, rEnd, rMid,
            widthPoints: rPoints,
            distance: distValue
        };
    }, [buildingType, width]);



    // 7. Surface Area
    const surfaceArea = useMemo(() => {
        const totalWidth = width + leftWidth + rightWidth;
        return (totalWidth * length).toFixed(0);
    }, [width, length, leftWidth, rightWidth]);


    // 10. NEW: Cross Height Marker for Ombrière VL Double 11.3m

    // 10. NEW: Cross Height Marker for Ombrière VL Double 11.3m

    const crossHeightData = useMemo(() => {
        if (buildingType === 'ombriere_vl_double' && Math.abs(width - 11.3) < 0.1) {
            const h = 2.2;
            const x = 0; // Center
            const z = 0.3; // USER REQUEST 15/01/2026: Move forward by 30cm
            const start = new THREE.Vector3(x, 0, z);
            const end = new THREE.Vector3(x, h, z);
            const mid = new THREE.Vector3(x, h / 2, z);

            // User wants gap UNDER the text? Or gap around.
            // Let's assume standard gap around center is what is needed but maybe larger.
            const localGap = 0.6; // Larger gap

            return {
                hVal: h,
                start, end,
                points: [
                    [start, new THREE.Vector3(mid.x, mid.y - localGap / 2, mid.z)],
                    [new THREE.Vector3(mid.x, mid.y + localGap / 2, mid.z), end]
                ]
            };
        }
        return null;
    }, [buildingType, width, gapSize]);


    // Helper for Eave Text Content
    const getEaveText = () => {
        if (buildingType === 'asymetrique_1') return '4 m';
        if (buildingType === 'ombriere_vl_double') {
            if (Math.abs(width - 9.1) < 0.1) return '3 m';
            if (Math.abs(width - 11.3) < 0.1) return '2.8 m';
        }
        if (buildingType === 'ombriere_vl_simple_droite') return '3.7 m';
        if (buildingType === 'ombriere_pl') {
            if (Math.abs(width - 15.8) < 0.1) return '6 m';
            if (Math.abs(width - 20.2) < 0.1) return '6.5 m';
            if (Math.abs(width - 24.6) < 0.1) return '7 m';
        }
        if (isOmbriere) return '2.9 m';
        return `${parseFloat(eaveHeight.toFixed(2))} m`;
    };

    return (
        <group>
            {/* 1. WIDTH MARKER */}
            {widthPoints && (
                <group>
                    <Line points={widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={widthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={widthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[0, 0.2, 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${width} m`}
                    </Text>
                </group>
            )}

            {/* 2. LENGTH MARKER */}
            {lengthPoints && (
                <group>
                    <Line points={lengthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={lengthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={lengthStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={lengthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[xSide + 0.5, 0.2, -length / 2]}
                        rotation={buildingType.startsWith('ombriere') ? [-Math.PI / 2, 0, Math.PI / 2] : [-Math.PI / 2, 0, -Math.PI / 2]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {`${length} m`}
                    </Text>
                </group>
            )}

            {/* 3. EAVE HEIGHT (Left/Standard) - EXCLUDE Asym 2 (has specific markers) */}
            {heightPoints && buildingType !== 'asymetrique_2' && (
                <group>
                    <Line points={heightPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={heightPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={heightStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={heightEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[xEave - 0.5, heightEnd.y / 2, 0]}
                        rotation={[0, 0, Math.PI / 2]} // Vertical text to match others
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {getEaveText()}
                    </Text>
                </group>
            )}

            {/* ... (Existing Ridge Render) ... */}

            {/* 10. CROSS HEIGHT MARKER */}
            {crossHeightData && (
                <group>
                    <Line points={crossHeightData.points[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={crossHeightData.points[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={crossHeightData.start}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={crossHeightData.end}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[0, crossHeightData.hVal / 2, 0.3]} // Text shifted to Z=0.3 to match lines
                        rotation={[0, 0, 0]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {`${crossHeightData.hVal} m`}
                    </Text>
                </group>
            )}

            {/* ... (Rest of Renders) ... */}

            {/* 4. RIDGE HEIGHT */}
            <group>
                <Line points={ridgePoints[0]} color={lineColor} lineWidth={lineWidth} />
                <Line points={ridgePoints[1]} color={lineColor} lineWidth={lineWidth} />
                <mesh position={ridgeStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <mesh position={ridgeEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                <Text position={[xRidge + 0.5, (ridgeLabelValue || ridgeHeight) / 2, zRidge]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                    {`${Number(ridgeLabelValue || ridgeHeight).toFixed(1)} m`}
                </Text>
            </group>

            {/* 4b. ASYM LEFT EAVE HEIGHT */}
            {asymLeftEaveData && (
                <group>
                    <Line points={asymLeftEaveData.points[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={asymLeftEaveData.points[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={asymLeftEaveData.start}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={asymLeftEaveData.end}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[asymLeftEaveData.xLeft - 0.5, asymLeftEaveData.hVal / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${parseFloat(Number(asymLeftEaveData.hVal).toFixed(2))} m`}
                    </Text>
                </group>
            )}

            {/* 4c. ASYM 2 RIGHT EAVE HEIGHT */}
            {asym2RightEaveData && (
                <group>
                    <Line points={asym2RightEaveData.points[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={asym2RightEaveData.points[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={asym2RightEaveData.start}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={asym2RightEaveData.end}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[asym2RightEaveData.xRight + 0.5, asym2RightEaveData.hVal / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`4 m`}
                    </Text>
                </group>
            )}



            {/* 5. RIGHT EXTENSION (If Exists) */}
            {rightExtData && (
                <>
                    <group>
                        <Line points={rightExtData.widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                        <Line points={rightExtData.widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                        <mesh position={rightExtData.wStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <mesh position={rightExtData.wEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <Text position={[width / 2 + rightExtData.extWidth / 2, 0.2, 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                            {`${rightExtData.extWidth} m`}
                        </Text>
                    </group>
                    <group>
                        <Line points={rightExtData.heightPoints[0]} color={lineColor} lineWidth={lineWidth} />
                        <Line points={rightExtData.heightPoints[1]} color={lineColor} lineWidth={lineWidth} />
                        <mesh position={rightExtData.hStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <mesh position={rightExtData.hEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        <Text position={[rightExtData.xH + 0.5, rightExtData.extHeight / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                            {`${parseFloat(Number(rightExtData.extHeight).toFixed(2))} m`}
                        </Text>
                    </group>
                </>
            )}

            {/* 6. LEFT EXTENSION (If Exists) */}
            {leftExtData && (
                <group>
                    <Line points={leftExtData.widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={leftExtData.widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={leftExtData.wStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={leftExtData.wEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[-width / 2 - leftExtData.extWidth / 2, 0.2, 3.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {`${leftExtData.extWidth} m`}
                    </Text>
                    {/* Height Only (consistency with original design for Left?) OR add Width. 
                        In Step 4015 hook, I added `wPoints` but commented about logic. 
                        Wait, Step 4015 hook for `leftExtData` includes `widthPoints`?
                        Let's check snippet from 4015.
                        I added `wPoints` variable but Return object included `hStart`, `hEnd`, `heightPoints`.
                        IT DID NOT RETURN `widthPoints`!
                        So `leftExtData.widthPoints` is UNDEFINED.
                        So I should NOT render Width for Left Extension unless I fix the hook.
                        Original Auvent didn't have Width marker.
                        I will replicate "Height Only" for Left Extension for safety and consistency with original Auvent.
                    */}
                    <Line points={leftExtData.heightPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={leftExtData.heightPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={leftExtData.hStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={leftExtData.hEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[leftExtData.xH, leftExtData.extHeight / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${parseFloat(Number(leftExtData.extHeight).toFixed(2))} m`}
                    </Text>
                </group>
            )}

            {/* 7. ASYMMETRIC 2 ZONES MIDDLE COLUMN DISTANCE */}
            {asym2MiddleColData && (
                <group>
                    <Line points={asym2MiddleColData.widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={asym2MiddleColData.widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={asym2MiddleColData.wStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={asym2MiddleColData.wEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[asym2MiddleColData.wMid.x, 0.2, 1.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {`13.1 m`}
                    </Text>
                </group>
            )}

            {/* 8. ASYMMETRIC 2 ZONES RIGHT DISTANCE (Middle to Right) */}
            {asym2RightDistData && (
                <group>
                    <Line points={asym2RightDistData.widthPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={asym2RightDistData.widthPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={asym2RightDistData.rStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={asym2RightDistData.rEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[asym2RightDistData.rMid.x, 0.2, 1.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {`${asym2RightDistData.distance} m`}
                    </Text>
                </group>
            )}

            {/* SURFACE AREA */}
            <Text
                position={[
                    width / 4,
                    (() => {
                        // USER REQUEST 12/01/2026: Raise surface area by 20cm for asymetrique_1 16.4m width
                        let baseHeight = buildingType === 'symetrique' ? ridgeHeight + 1.0 : ridgeHeight - 1.0;
                        if (buildingType === 'asymetrique_1' && (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5)) {
                            baseHeight += 0.20; // Raise by 20cm for 16.4m width
                        }
                        // USER REQUEST 13/01/2026: Raise surface area by 1m for ombriere
                        // USER REQUEST 13/01/2026 Part 3: Raise by additional 1.5m (Total 2.5m)
                        // USER REQUEST 13/01/2026: Raise surface area by 1m for ombriere (adjusted down -1m from 2.5)
                        if (buildingType.startsWith('ombriere')) {
                            baseHeight += 1.5;
                            if (buildingType === 'ombriere_vl_double') {
                                baseHeight += 1.0; // Raise by additional 1m for Double
                            }
                        }
                        return baseHeight;
                    })(),
                    -length / 2,
                ]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]} // 90° Counter-clockwise Horizontal
                fontSize={3}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.2}
                outlineColor="#000000"
            >
                {`${surfaceArea} m²`}
            </Text>
            {/* 9. ROOF SLOPE LABELS (Faitage/Sablière) */}

        </group>
    );
}
