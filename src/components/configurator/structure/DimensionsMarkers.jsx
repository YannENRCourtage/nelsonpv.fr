import React, { useMemo } from 'react';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';

/**
 * Renders dimension lines and surface area text.
 * Optimized with useMemo to prevent re-render loops from new object creation.
 */
export function DimensionsMarkers({ width, length, eaveHeight, ridgeHeight, roofPitch, leftSide, rightSide, showDimensions, buildingType = 'symetrique' }) {

    const textColor = "#000000";
    const lineColor = "#000000";
    const lineWidth = 2;
    const gapSize = 3.0;
    const isOmbriere = buildingType.startsWith('ombriere');

    const { isAcama, configMode, customParams, customSpans } = useConfiguratorValues();
    const isAcamaInStore = isAcama;
    const isAcamaReal = isAcamaInStore || false; // Safe check

    // Override for Custom Mode
    const isCustom = configMode === 'custom';
    const cp = customParams;
    const spans = customSpans;

    const isEpona = !isCustom && isAcama && (buildingType === 'epona' || buildingType === 'epona_talian5');
    const isTalian4 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(width - 13.7) < 0.1;
    const isTalian1 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(width - 18.8) < 0.1;
    const isTalian3 = !isCustom && isAcama && buildingType === 'symetrique' && Math.abs(width - 17.5) < 0.1;
    const isTalian = isTalian4 || isTalian1 || isTalian3;

    const getExtWidth = (type, side) => {
        if (isCustom) {
            if (side === 'left') return cp.leftExtensionWidth || 0;
            if (side === 'right') return cp.rightExtensionWidth || 0;
        }
        if (isEpona) return side === 'left' ? 2.5 : 9.1; 
        if (isTalian4) return 11.2;
        if (isTalian1) return 2.3;
        if (isTalian3) return 1.8;
        if (type === 'appentis') return 9.3;
        if (type === 'auvent') return 4.0;
        return 0;
    };
    const getExtHeight = (type, side) => {
        if (isCustom) {
            // For custom extension peak height: logic might need to be refined, 
            // but for markers let's assume it connects to eave.
            return side === 'left' ? cp.leftEaveHeight : cp.rightEaveHeight;
        }
        if (isEpona) return side === 'left' ? 5.0 : 3.8;
        if (isTalian4) return 4.5;
        if (isTalian1) return 3.8; 
        if (isTalian3) return 2.5; 
        if (type === 'auvent') return 4.8;
        if (type === 'appentis') return 3.9;
        return 0;
    };
    const getVisualOffset = () => {
        if (isEpona) return -1.0;
        if (isTalian4) return -1.2;
        if (isTalian1) return 0; 
        return 0;
    };

    const leftWidth = parseFloat(getExtWidth(leftSide, 'left').toFixed(2));
    const rightWidth = parseFloat(getExtWidth(rightSide, 'right').toFixed(2));
    const leftHeight = getExtHeight(leftSide, 'left');
    const rightHeight = getExtHeight(rightSide, 'right');

    // --- MEMOIZED GEOMETRY HELPERS ---

    // 1. Width Arrow
    const { widthPoints, widthStart, widthEnd } = useMemo(() => {
        const yHeight = 0.1; 
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
    }, [width, gapSize]);

    // 2. Length Arrow (Right Side)
    const { lengthPoints, lengthStart, lengthEnd, xSide } = useMemo(() => {
        const x = width / 2 + rightWidth + (buildingType === 'epona_talian5' && !isCustom ? -6.0 : 3.0); 
        const start = new THREE.Vector3(x, 0.1, 0);
        const end = new THREE.Vector3(x, 0.1, -length);
        const mid = new THREE.Vector3(x, 0.1, -length / 2);
        return {
            xSide: x,
            lengthStart: start,
            lengthEnd: end,
            lengthPoints: [
                [start, new THREE.Vector3(x, 0.1, mid.z + gapSize / 2)],
                [new THREE.Vector3(x, 0.1, mid.z - gapSize / 2), end]
            ]
        };
    }, [width, length, rightWidth, gapSize, buildingType, isCustom]);

    // 3. Eave Height (Standard / Right for Asym/Monopente)
    const { heightPoints, heightStart, heightEnd, xEave } = useMemo(() => {
        let x;
        let h = eaveHeight; // Default

        if (buildingType === 'monopente') {
            // Right Side
            x = rightSide !== 'none' ? width / 2 + 1.5 : width / 2 + 3.0;
        } else if (buildingType === 'ombriere_vl_simple_droite' || buildingType === 'ombriere_vl_simple_gauche' || buildingType === 'ombriere_vl_double' || buildingType === 'ombriere_pl') {
            x = width / 2 + 1.5;
        } else if (buildingType === 'asymetrique_1' || buildingType === 'asymetrique_2') {
            h = 4.0;
            x = rightSide !== 'none' ? width / 2 + 1.5 : width / 2 + 3.0;
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
    }, [width, eaveHeight, leftSide, rightSide, gapSize, buildingType, isCustom]);

    // 3b. Ridge Height
    const { ridgePoints, ridgeStart, ridgeEnd, xRidge, zRidge, ridgeLabelValue } = useMemo(() => {
        let x = 0;
        let h = ridgeHeight;

        if (isCustom) {
            x = -width / 2 + spans.left;
            h = cp.ridgeHeight;
        } else if (buildingType === 'monopente') {
            x = -width / 2 - 1.5; // Left Side
        } else if (buildingType === 'ombriere_vl_simple_droite') {
            x = -width / 2 - 1.5;
        } else if (buildingType === 'ombriere_vl_simple_gauche') {
            x = -width / 2 - 1.5; 
        } else if (buildingType === 'ombriere_vl_double' || buildingType === 'ombriere_pl') {
            x = -width / 2 - 1.5;
        } else if (buildingType === 'asymetrique_1') {
            // Asym Ridge: Exact
            const rAngle = 15 * (Math.PI / 180);
            h = 4.0 + (width * 0.75 * Math.tan(rAngle));
            if (Math.abs(width - 20) < 0.5) h = 8.4;
            else if (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5) h = 7.4;
            x = -width / 2 + (width * 0.25);
        } else if (buildingType === 'asymetrique_2') {
            if (Math.abs(width - 25.5) < 0.1) h = 8.9;
            else if (Math.abs(width - 29.1) < 0.1) h = 9.8;
            else {
                const rAngle = 15 * (Math.PI / 180);
                h = 4.0 + (width * 0.75 * Math.tan(rAngle));
            }
            x = -width / 2 + (width * 0.25);
        } else if (buildingType === 'epona_talian5') {
            x = -11.27;
            h = 8.1;
        }

        if (buildingType === 'ombriere_vl_double' && !isCustom) {
            if (Math.abs(width - 9.1) < 0.1) h = 4.6;
            else if (Math.abs(width - 11.3) < 0.1) h = 4.7;
        }

        if (buildingType === 'ombriere_vl_simple_gauche' && !isCustom) h = 4.7; 
        if (buildingType === 'ombriere_vl_simple_droite' && !isCustom) h = 4.1; 

        if (buildingType === 'ombriere_pl' && !isCustom) {
            if (Math.abs(width - 15.8) < 0.1) h = 7.9;
            else if (Math.abs(width - 20.2) < 0.1) h = 9.3;
            else if (Math.abs(width - 24.6) < 0.1) h = 9.3;
        }

        // Pour EPONA, abaisser visuellement le top du marqueur faitage de 0.5m
        const visualTop = isEpona ? h - 0.5 : h;
        const visualMid = isEpona ? (h - 0.5) / 2 : h / 2;

        const z = 0;
        const start = new THREE.Vector3(x, 0, z);
        const end = new THREE.Vector3(x, visualTop, z);
        const mid = new THREE.Vector3(x, visualMid, z);

        const finalLabel = !isCustom && isTalian4 ? 5.9 : (!isCustom && isTalian1 ? 6.7 : h);

        return {
            xRidge: x,
            zRidge: z,
            ridgeLabelValue: finalLabel,
            ridgeStart: start,
            ridgeEnd: end,
            ridgePoints: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [width, ridgeHeight, gapSize, buildingType, isEpona, isTalian4, isTalian1, isCustom, cp, spans]);


    // 3c. Left Eave Height (Asymmetrical ONLY — masqué pour EPONA)
    const asymLeftEaveData = useMemo(() => {
        if (!isCustom && buildingType !== 'asymetrique_1' && buildingType !== 'asymetrique_2' && !isEpona) return null;
        if (!isCustom && buildingType === 'epona_talian5') return null; 

        let h;
        if (isCustom) {
            h = cp.leftEaveHeight;
        } else if (isEpona) {
            h = 7.9;
        } else if (buildingType === 'asymetrique_2') {
            if (Math.abs(width - 25.5) < 0.1) h = 6.9;
            else if (Math.abs(width - 29.1) < 0.1) h = 7.9;
            else h = 6.9; 
        } else {
            h = 6.4;
            if (Math.abs(width - 20) < 0.5) h = 7.4;
            else if (Math.abs(width - 16.4) < 0.5 || Math.abs(width - 16) < 0.5) h = 6.4;
            else {
                h = ridgeHeight - ((width * 0.25) * Math.tan(15 * Math.PI / 180));
            }
        }

        const x = (isCustom ? (cp.leftSide !== 'none' || cp.leftExtensionWidth > 0) : (leftSide !== 'none')) ? -width / 2 - 1.5 : -width / 2 - 3.0;

        const start = new THREE.Vector3(x, 0, 0);
        const end = new THREE.Vector3(x, h, 0);
        const mid = new THREE.Vector3(x, h / 2, 0);

        if (!isCustom && buildingType === 'epona') return null;

        return {
            xLeft: x,
            hVal: h,
            start, end,
            points: [
                [start, new THREE.Vector3(mid.x, mid.y - gapSize / 2, mid.z)],
                [new THREE.Vector3(mid.x, mid.y + gapSize / 2, mid.z), end]
            ]
        };
    }, [buildingType, width, leftSide, gapSize, isEpona, isCustom, cp, ridgeHeight]);

    // 3d. Right Eave Height (Asymmetrical 2 Zones ONLY)
    const asym2RightEaveData = useMemo(() => {
        if (!isCustom && buildingType !== 'asymetrique_2' && !isEpona) return null;
        if (isEpona) return null; 
        
        let h = isCustom ? cp.rightEaveHeight : (isEpona ? 4.3 : 4.0);
        const x = width / 2 + 1.5; 

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
    }, [buildingType, width, isEpona, gapSize, isCustom, cp]);

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
            // USER REQUEST 12/01/2026: Asym 2 Left Auvent: Indication must stay at 5.9m (25.5m) or 6.9m (29.1m)
            // even if physically lowered by 50cm.
            if (Math.abs(width - 25.5) < 0.1) extHeight = 5.9;
            else if (Math.abs(width - 29.1) < 0.1) extHeight = 6.9;
            else extHeight = 5.9; // Fallback
        } else if (isEpona && leftSide === 'auvent') {
            extHeight = 5.9; // Epona left awning height
        }

        const xStart = -width / 2;
        const xEnd = -width / 2 - extWidth;
        const xMid = -width / 2 - extWidth / 2;
        const zFront = isTalian4 ? 5.0 : 3.0;

        // Width Marker
        const yWidth = 0.1; // Reverted for EPONA
        const wStart = new THREE.Vector3(xStart, yWidth, zFront);
        const wEnd = new THREE.Vector3(xEnd, yWidth, zFront);

        // Gap removed for extensions to put points at ends EXCEPT for EPONA/TALIAN 1/TALIAN 3/TALIAN 4 or Asym 2 Auvent
        const hasGap = isEpona || isTalian1 || isTalian3 || isTalian4 || (buildingType === 'asymetrique_2' && leftSide === 'auvent');
        const gapOffset = isTalian4 ? 1.25 : (isEpona || isTalian ? 1.0 : 1.5);
        const wPoints = hasGap ? [
            [wStart, new THREE.Vector3(xMid + gapOffset, yWidth, zFront)],
            [new THREE.Vector3(xMid - gapOffset, yWidth, zFront), wEnd]
        ] : [
            [wStart, wEnd]
        ];

        // Height
        const xH = -width / 2 - leftWidth - (isTalian1 || isEpona ? 3.0 : 2.0);
        // Pour EPONA ACAMA, on arrête le trait de mesure à la sablière (extHeight)
        const visualTopLeft = isEpona ? extHeight : (isTalian4 ? extHeight - 1.2 : (isTalian1 ? extHeight - 0.3 : extHeight));
        const visualMidLeft = visualTopLeft / 2;
        const hGap = isTalian3 ? 2.0 : (isEpona ? 2.0 : gapSize); // Phase 18: reduce gap to avoid lines outside

        return {
            extWidth, extHeight, xH,
            wStart, wEnd,
            widthPoints: wPoints,
            hStart: new THREE.Vector3(xH, 0, 0),
            hEnd: new THREE.Vector3(xH, visualTopLeft, 0),
            heightPoints: [
                [new THREE.Vector3(xH, 0, 0), new THREE.Vector3(xH, visualMidLeft - hGap / 2, 0)],
                [new THREE.Vector3(xH, visualMidLeft + hGap / 2, 0), new THREE.Vector3(xH, visualTopLeft, 0)]
            ]
        };
    }, [leftSide, leftWidth, leftHeight, width, gapSize, buildingType, isEpona, isTalian, isTalian1, isTalian3, isTalian4]);

    // 4. Right Extension Dimensions (Update for Monopente Right)
    const rightExtData = useMemo(() => {
        if (rightSide === 'none') return null;
        const extWidth = rightWidth;

        let extHeight = rightHeight;
        if (isTalian3) {
            extHeight = 2.5; // Phase 18: Force 2.5m for right awning on TALIAN 3
        } else if (buildingType === 'monopente' && rightSide === 'auvent') {
            // Monopente Right Auvent: Tip at 3.0m
            extHeight = 3.0;
        } else if (buildingType === 'asymetrique_1' && rightSide === 'auvent') {
            // Right Auvent Tip: 3.0m
            extHeight = 3.0;
        } else if (buildingType === 'asymetrique_2' && rightSide === 'auvent') {
            // USER REQUEST 12/01/2026: Right Auvent for asymétrique 2 zones = 4m indication
            extHeight = 4.0;
        } else if (isEpona && rightSide === 'auvent') {
            extHeight = 4.3; // Epona right awning height
        } else if (buildingType === 'symetrique' && rightSide === 'auvent' && !isTalian1 && !isTalian3) {
            // Sym Right Auvent: Low Point ~4.8m (High 5.5 - Rise)
            extHeight = 4.8;
        }

        const zFront = isTalian4 ? 5.0 : 3.0;

        // Width Marker
        const xStart = width / 2;
        const xEnd = width / 2 + extWidth;
        const yWidth = 0.1; // Reverted for EPONA
        const wStart = new THREE.Vector3(xStart, yWidth, zFront);
        const wEnd = new THREE.Vector3(xEnd, yWidth, zFront);
        const wMid = new THREE.Vector3(width / 2 + extWidth / 2, yWidth, zFront);

        // Height Marker
        const xH = width / 2 + extWidth + (isTalian1 || isEpona ? 3.0 : 2.0);
        // Pour EPONA ACAMA, on arrête le trait de mesure à la sablière (extHeight)
        const visualTopRight = isEpona ? extHeight : (isTalian4 ? extHeight - 1.2 : (isTalian1 ? extHeight - 0.3 : extHeight));
        const visualMidRight = visualTopRight / 2;
        const hStart = new THREE.Vector3(xH, 0, 0);
        const hEnd = new THREE.Vector3(xH, visualTopRight, 0);
        const hMid = new THREE.Vector3(xH, visualMidRight, 0);

        const hasGap = isEpona || isTalian1 || isTalian3 || isTalian4 || (buildingType === 'asymetrique_2' && rightSide === 'auvent');
        const gapOffset = isTalian4 ? 1.25 : (isEpona || isTalian ? 1.0 : 1.5);
        const wPoints = hasGap ? [
            [wStart, new THREE.Vector3(wMid.x - gapOffset, yWidth, zFront)],
            [new THREE.Vector3(wMid.x + gapOffset, yWidth, zFront), wEnd]
        ] : [
            [wStart, wEnd]
        ];

        const hGap = isTalian3 ? 2.0 : (isEpona ? 2.0 : gapSize);

        return {
            extWidth, extHeight, xH,
            wStart, wEnd,
            hStart, hEnd,
            widthPoints: wPoints,
            heightPoints: [
                [hStart, new THREE.Vector3(hMid.x, hMid.y - hGap / 2, hMid.z)],
                [new THREE.Vector3(hMid.x, hMid.y + hGap / 2, hMid.z), hEnd]
            ]
        };
    }, [rightSide, rightWidth, rightHeight, width, gapSize, buildingType, ridgeHeight, isEpona, isTalian, isTalian1, isTalian3, isTalian4]);

    // 3d. Middle Column Distance (Asymmetrical 2 Zones ONLY)
    const asym2MiddleColData = useMemo(() => {
        if (buildingType !== 'asymetrique_2') return null;

        const dist = 13.1;
        const middleColX = -width / 2 + dist;
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
            distance: dist
        };
    }, [buildingType, width, gapSize]);

    // 3e. Middle Column to Right Distance (Asymm 2 Zones ONLY)
    const asym2RightDistData = useMemo(() => {
        if (buildingType !== 'asymetrique_2') return null;

        const distLeft = 13.1;
        const middleColX = -width / 2 + distLeft;
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
        const totalW = width + leftWidth + rightWidth;
        return (totalW * length).toFixed(0);
    }, [width, length, leftWidth, rightWidth]);

    // 8. Total Width Marker (ACAMA)
    const acamaTotalWidthData = useMemo(() => {
        if (!isEpona && !isTalian) return null;
        const totalW = buildingType === 'epona_talian5' ? 27.6 : (isEpona ? 35.3 : (isTalian4 ? 37.5 : (isTalian3 ? 21.1 : 23.5)));
        const zPos = 6.0;
        const yPos = 0.1;
        let xStart, xEnd, xMid;
        if (buildingType === 'epona_talian5') {
            xStart = new THREE.Vector3(-16.0, yPos, zPos);
            xEnd = new THREE.Vector3(11.6, yPos, zPos);
            xMid = new THREE.Vector3((-16.0 + 11.6) / 2, yPos, zPos);
        } else if (isEpona) {
            xStart = new THREE.Vector3(-14.3, yPos, zPos);
            xEnd = new THREE.Vector3(19.65, yPos, zPos);
            xMid = new THREE.Vector3((-14.3 + 19.65) / 2, yPos, zPos);
        } else {
            xStart = new THREE.Vector3(-totalW / 2, yPos, zPos);
            xEnd = new THREE.Vector3(totalW / 2, yPos, zPos);
            xMid = new THREE.Vector3(0, yPos, zPos);
        }
        return { totalW, xStart, xEnd, xMid, zPos, points: [[xStart, new THREE.Vector3(xMid.x - gapSize / 2, yPos, zPos)], [new THREE.Vector3(xMid.x + gapSize / 2, yPos, zPos), xEnd]] };
    }, [isEpona, isTalian, isTalian4, isTalian3, isTalian1, gapSize, buildingType]);

    // 9. Cross Height Marker (Ombrière)
    const crossHeightData = useMemo(() => {
        if (buildingType === 'ombriere_vl_double' && Math.abs(width - 11.3) < 0.1) {
            const h = 2.2;
            const z = 0.3;
            const start = new THREE.Vector3(0, 0, z);
            const end = new THREE.Vector3(0, h, z);
            const mid = new THREE.Vector3(0, h / 2, z);
            const localGap = 0.6;
            return { hVal: h, start, end, points: [[start, new THREE.Vector3(mid.x, mid.y - localGap / 2, mid.z)], [new THREE.Vector3(mid.x, mid.y + localGap / 2, mid.z), end]] };
        }
        return null;
    }, [buildingType, width, gapSize]);

    // 10. Epona Specific Markers
    const eponaMarkers = useMemo(() => {
        if (!isEpona) return null;
        const leftPostX = buildingType === 'epona_talian5' ? -15.4 : -11.8;
        const midPostX = buildingType === 'epona_talian5' ? 0 : 11.8;
        const rightPostX = buildingType === 'epona_talian5' ? 11.0 : 19.65;
        const zFront = 3.0;
        const markerZ = 0;
        const eponaBaseY = 0.1;

        const rightSpanLength = buildingType === 'epona_talian5' ? 11.0 : 7.85;
        const rightSpanLabel = buildingType === 'epona_talian5' ? "11 m" : "7.8 m";
        const rSpanStart = new THREE.Vector3(midPostX, 0.1, zFront);
        const rSpanEnd = new THREE.Vector3(rightPostX, 0.1, zFront);
        const rSpanMid = new THREE.Vector3(midPostX + rightSpanLength / 2, 0.1, zFront);
        const rSpanGap = buildingType === 'epona_talian5' ? 3.0 : 2.0;
        const rSpanPoints = [[rSpanStart, new THREE.Vector3(rSpanMid.x - rSpanGap / 2, 0.1, zFront)], [new THREE.Vector3(rSpanMid.x + rSpanGap / 2, eponaBaseY, zFront), rSpanEnd]];

        let lCenterStart, lCenterEnd, lCenterMid, lCenterPoints = [], lCenterLabel = "";
        if (buildingType === 'epona_talian5') {
            lCenterLabel = "15.4 m";
            lCenterStart = new THREE.Vector3(leftPostX, eponaBaseY, zFront);
            lCenterEnd = new THREE.Vector3(midPostX, eponaBaseY, zFront);
            lCenterMid = new THREE.Vector3(leftPostX + 16.0 / 2, eponaBaseY, zFront);
            lCenterPoints.push([lCenterStart, new THREE.Vector3(lCenterMid.x - 6.0 / 2, eponaBaseY, zFront)], [new THREE.Vector3(lCenterMid.x + 6.0 / 2, eponaBaseY, zFront), lCenterEnd]);
        }

        const lAwningStart = new THREE.Vector3(leftPostX - 2.5, eponaBaseY, zFront);
        const lAwningEnd = new THREE.Vector3(leftPostX, eponaBaseY, zFront);
        const lAwningMid = new THREE.Vector3(leftPostX - 1.25, eponaBaseY, zFront);
        const lAwningPoints = buildingType === 'epona_talian5' ? [] : [[lAwningStart, new THREE.Vector3(lAwningMid.x - 1.0, eponaBaseY, zFront)], [new THREE.Vector3(lAwningMid.x + 1.0, eponaBaseY, zFront), lAwningEnd]];

        const rHeightVal = buildingType === 'epona_talian5' ? 4.3 : 3.8;
        const rHeightX = rightPostX + 2.0;
        const rHeightPoints = [[new THREE.Vector3(rHeightX, 0, markerZ), new THREE.Vector3(rHeightX, rHeightVal / 2 - 0.6, markerZ)], [new THREE.Vector3(rHeightX, rHeightVal / 2 + 0.6, markerZ), new THREE.Vector3(rHeightX, rHeightVal, markerZ)]];

        const mHeightPoints = [];
        if (buildingType === 'epona_talian5') {
            const h = 6.0;
            const x = midPostX - 0.5;
            mHeightPoints.push([new THREE.Vector3(x, 0.1, 0), new THREE.Vector3(x, h / 2 - 0.6, 0)], [new THREE.Vector3(x, h / 2 + 0.6, 0), new THREE.Vector3(x, h, 0)]);
        }

        const lHeightVal = buildingType === 'epona_talian5' ? 7.9 : 5.0;
        const lHeightX = buildingType === 'epona_talian5' ? leftPostX - 2.0 : leftPostX - 3.0;
        const lHeightPoints = [[new THREE.Vector3(lHeightX, 0.1, markerZ), new THREE.Vector3(lHeightX, lHeightVal / 2 - 0.6, markerZ)], [new THREE.Vector3(lHeightX, lHeightVal / 2 + 0.6, markerZ), new THREE.Vector3(lHeightX, lHeightVal, markerZ)]];

        return { rSpanStart, rSpanEnd, rSpanMid, rSpanPoints, rightSpanLabel, lCenterStart, lCenterEnd, lCenterMid, lCenterPoints, lAwningStart, lAwningEnd, lAwningMid, lAwningPoints, rHeightPoints, rHeightVal, rHeightX, mHeightPoints, lHeightPoints, lHeightVal, lHeightX, markerZ, lCenterLabel };
    }, [isEpona, gapSize, buildingType, length]);

    const getEaveText = () => {
        if (buildingType === 'asymetrique_1') return '4 m';
        if (buildingType === 'ombriere_vl_double') return Math.abs(width - 9.1) < 0.1 ? '3 m' : '2.8 m';
        if (buildingType === 'ombriere_vl_simple_droite') return '2.9 m';
        if (buildingType === 'ombriere_vl_simple_gauche') return '3.7 m';
        if (buildingType === 'ombriere_pl') return Math.abs(width - 15.8) < 0.1 ? '5.1 m' : (Math.abs(width - 20.2) < 0.1 ? '5.7 m' : '5 m');
        if (isOmbriere) return '2.9 m';
        return `${parseFloat(eaveHeight.toFixed(2))} m`;
    };

    if (!showDimensions) return null;

    return (
        <group>
            {/* 1. WIDTH MARKER */}
            {widthPoints && (
                <group>
                    {widthPoints.map((p, i) => (
                        <Line key={`wp-${i}`} points={p} color={lineColor} lineWidth={lineWidth} />
                    ))}
                    <mesh position={widthEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    {buildingType !== 'epona_talian5' && (
                        <Text position={[0, 0.2, 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                            {`${width} m`}
                        </Text>
                    )}
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
                        position={[xSide, 0.2, -length / 2]}
                        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
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

            {/* 3. EAVE HEIGHT (Left/Standard) */}
            {heightPoints && buildingType !== 'asymetrique_2' && !isEpona && !isTalian && (
                <group>
                    <Line points={heightPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={heightPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={heightStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={heightEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[xEave - 0.5, heightEnd.y / 2, 0]}
                        rotation={[0, 0, Math.PI / 2]} 
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

            {/* 4. RIDGE HEIGHT */}
            {ridgePoints && (
                <group>
                    <Line points={ridgePoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={ridgePoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={ridgeStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={ridgeEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[xRidge + 0.5, (isEpona ? (ridgeLabelValue || ridgeHeight) - 0.5 : (ridgeLabelValue || ridgeHeight)) / 2, zRidge]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${Number(ridgeLabelValue || ridgeHeight).toFixed(1)} m`}
                    </Text>
                </group>
            )}

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
                        {buildingType === 'epona_talian5' ? '4.3 m' : (isCustom ? `${asym2RightEaveData.hVal.toFixed(1)} m` : '4 m')}
                    </Text>
                </group>
            )}

            {/* 5. RIGHT EXTENSION */}
            {rightExtData && (
                <>
                    <group>
                        {!isTalian4 && (
                            <>
                                {rightExtData.widthPoints?.map((p, i) => (
                                    <Line key={i} points={p} color={lineColor} lineWidth={lineWidth} />
                                ))}
                                <mesh position={rightExtData.wStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                                <mesh position={rightExtData.wEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                            </>
                        )}
                        <Text position={[width / 2 + rightExtData.extWidth / 2, 0.2, isTalian4 ? 4.5 : 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                            {isEpona ? '7.8 m' : `${rightExtData.extWidth} m`}
                        </Text>
                    </group>
                    {rightExtData.heightPoints?.map((p, i) => (
                        <Line key={i} points={p} color={lineColor} lineWidth={lineWidth} />
                    ))}
                    {!isTalian4 && (
                        <mesh position={rightExtData.hStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    )}
                    <mesh position={rightExtData.hEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[rightExtData.xH, (isEpona || isTalian4 || isTalian1 ? (rightExtData.extHeight - (isEpona ? 0 : (isTalian4 ? 1.2 : 0))) : rightExtData.extHeight) / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${parseFloat(Number(isTalian4 ? 4.5 : (isTalian1 ? 3.8 : rightExtData.extHeight)).toFixed(2))} m`}
                    </Text>
                </>
            )}

            {/* 6. LEFT EXTENSION */}
            {leftExtData && (
                <group>
                    {!isTalian4 && (
                        <>
                            {leftExtData.widthPoints?.map((p, i) => (
                                <Line key={i} points={p} color={lineColor} lineWidth={lineWidth} />
                            ))}
                            <mesh position={leftExtData.wStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                            <mesh position={leftExtData.wEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                        </>
                    )}
                    <Text
                        position={[-width / 2 - leftExtData.extWidth / 2, 0.2, isTalian4 ? 4.5 : 3.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {isEpona ? '2.5 m' : `${leftExtData.extWidth} m`}
                    </Text>
                    {leftExtData.heightPoints?.map((p, i) => (
                        <Line key={i} points={p} color={lineColor} lineWidth={lineWidth} />
                    ))}
                    {!isTalian4 && (
                        <mesh position={leftExtData.hStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    )}
                    <mesh position={leftExtData.hEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[leftExtData.xH, (isEpona ? leftExtData.extHeight : (isTalian4 ? leftExtData.extHeight - 1.2 : (isTalian1 ? leftExtData.extHeight : leftExtData.extHeight))) / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${parseFloat(Number(isTalian4 ? 4.5 : (isTalian1 ? 3.8 : leftExtData.extHeight)).toFixed(2))} m`}
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

            {/* 8. ASYMMETRIC 2 ZONES RIGHT DISTANCE */}
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

            {/* 9. ACAMA TOTAL WIDTH MARKER */}
            {acamaTotalWidthData && (
                <group>
                    <Line points={acamaTotalWidthData.points[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={acamaTotalWidthData.points[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={acamaTotalWidthData.xStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={acamaTotalWidthData.xEnd}><sphereGeometry args={[buildingType === 'epona_talian5' ? 0 : 0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[acamaTotalWidthData.xMid.x, 0.2, acamaTotalWidthData.zPos + 0.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.8}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.1}
                        outlineColor="#ffffff"
                    >
                        {`${acamaTotalWidthData.totalW} m`}
                    </Text>
                </group>
            )}

            {/* 10. CROSS HEIGHT MARKER */}
            {crossHeightData && (
                <group>
                    <Line points={crossHeightData.points[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={crossHeightData.points[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={crossHeightData.start}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={crossHeightData.end}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text
                        position={[0, crossHeightData.hVal / 2, 0.3]} 
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

            {/* 11. EPONA SPECIFIC MARKERS */}
            {eponaMarkers && (
                <group>
                    {/* Right Span */}
                    <Line points={eponaMarkers.rSpanPoints[0]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={eponaMarkers.rSpanPoints[1]} color={lineColor} lineWidth={lineWidth} />
                    <mesh position={eponaMarkers.rSpanStart}><sphereGeometry args={[buildingType === 'epona_talian5' ? 0 : 0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <mesh position={eponaMarkers.rSpanEnd}><sphereGeometry args={[buildingType === 'epona_talian5' ? 0 : 0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                    <Text position={[eponaMarkers.rSpanMid.x, 0.2, 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                        {eponaMarkers.rightSpanLabel}
                    </Text>

                    {/* Middle Span */}
                    {eponaMarkers.lCenterPoints?.length > 0 && (
                        <>
                            <Line points={eponaMarkers.lCenterPoints[0]} color={lineColor} lineWidth={lineWidth} />
                            <Line points={eponaMarkers.lCenterPoints[1]} color={lineColor} lineWidth={lineWidth} />
                            <mesh position={eponaMarkers.lCenterStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                            <mesh position={eponaMarkers.lCenterEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                            <Text position={[eponaMarkers.lCenterMid.x, 0.2, 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                                {eponaMarkers.lCenterLabel}
                            </Text>
                        </>
                    )}

                    {/* Left Awning */}
                    {eponaMarkers.lAwningPoints?.length > 0 && (
                        <>
                            <Line points={eponaMarkers.lAwningPoints[0]} color={lineColor} lineWidth={lineWidth} />
                            <Line points={eponaMarkers.lAwningPoints[1]} color={lineColor} lineWidth={lineWidth} />
                            <mesh position={eponaMarkers.lAwningStart}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                            <mesh position={eponaMarkers.lAwningEnd}><sphereGeometry args={[0.1]} /><meshBasicMaterial color={lineColor} /></mesh>
                            <Text position={[eponaMarkers.lAwningMid.x, 0.2, 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color={textColor} anchorX="center" anchorY="bottom" outlineWidth={0.1} outlineColor="#ffffff">
                                2.5 m
                            </Text>
                        </>
                    )}

                    {/* Heights */}
                    {eponaMarkers.rHeightPoints?.map((p, i) => <Line key={`rh-${i}`} points={p} color={lineColor} lineWidth={lineWidth} />)}
                    {eponaMarkers.mHeightPoints?.map((p, i) => <Line key={`mh-${i}`} points={p} color={lineColor} lineWidth={lineWidth} />)}
                    {eponaMarkers.lHeightPoints?.map((p, i) => <Line key={`lh-${i}`} points={p} color={lineColor} lineWidth={lineWidth} />)}
                    
                    <Text position={[eponaMarkers.rHeightX, eponaMarkers.rHeightVal / 2, eponaMarkers.markerZ || 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${eponaMarkers.rHeightVal} m`}
                    </Text>
                    {eponaMarkers.mHeightPoints?.length > 0 && (
                        <Text position={[eponaMarkers.mHeightX - 0.7, eponaMarkers.mHeightVal / 2, eponaMarkers.midHeightZ]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                            6 m
                        </Text>
                    )}
                    <Text position={[eponaMarkers.lHeightX - 0.5, eponaMarkers.lHeightVal / 2, eponaMarkers.markerZ || 0]} rotation={[0, 0, Math.PI / 2]} fontSize={0.8} color={textColor} anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#ffffff">
                        {`${eponaMarkers.lHeightVal} m`}
                    </Text>
                </group>
            )}

            {/* 12. SURFACE AREA TEXT OVER BUILDING */}
            <Text
                position={[
                    buildingType === 'epona_talian5' ? -11.27 : 0,
                    Math.min(eaveHeight, ridgeHeight) + (buildingType === 'epona_talian5' ? 1.5 : 4),
                    -length / 2
                ]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
                fontSize={3}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.2}
                outlineColor="#000000"
            >
                {`${surfaceArea} m²`}
            </Text>

        </group>
    );
}
