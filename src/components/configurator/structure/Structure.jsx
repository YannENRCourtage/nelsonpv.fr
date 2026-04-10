import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { PortalFrame } from './PortalFrame.jsx';
import { Purlins } from './Purlins.jsx';
import { Roof } from './Roof.jsx';
import { Bracing } from './Bracing.jsx';
import { LongitudinalBeams } from './LongitudinalBeams.jsx';
import { DimensionsMarkers } from './DimensionsMarkers.jsx';
import { Awning } from './Awning.jsx';
import { Auvent } from './Auvent.jsx';

// Ridge Flashing (Bande Lisse Faîtière)
const RidgeFlashing = ({ len, h, angle, x = 0 }) => {
    // Material
    const mat = React.useMemo(() => new THREE.MeshStandardMaterial({
        color: '#4A4A4A', 
        roughness: 0.5,
        metalness: 0.4,
        side: THREE.DoubleSide
    }), []);

    const shape = React.useMemo(() => {
        const s = new THREE.Shape();
        const halfW = 0.5; // 0.5m
        const drop = halfW * Math.tan(angle);
        const t = 0.005;

        s.moveTo(0, 0.02); 
        s.lineTo(-halfW, -drop);
        s.lineTo(-halfW, -drop - t);
        s.lineTo(0, 0.02 - t);
        s.lineTo(halfW, -drop - t);
        s.lineTo(halfW, -drop);
        s.lineTo(0, 0.02);
        return s;
    }, [angle]);

    const geo = React.useMemo(() => new THREE.ExtrudeGeometry(shape, {
        depth: len,
        bevelEnabled: false
    }), [shape, len]);

    return (
        <mesh geometry={geo} material={mat} position={[x, h, 0.5]} rotation={[0, Math.PI, 0]} castShadow />
    );
};

export function Structure() {
    const config = useConfiguratorValues();
    const { buildingType, width, length, bayCount, baySpacing, eaveHeight, roofPitch, ridgeHeight, leftSide, rightSide, showDimensions, configMode, customParams, customSpans } = config;

    // Use exact ridge height from store (Map values) instead of calculated
    const calculatedRidgeHeight = ridgeHeight;

    const frames = [];
    const numFrames = bayCount + 1;

    for (let i = 0; i < numFrames; i++) {
        const zPos = -i * baySpacing;

        frames.push(
            <PortalFrame
                key={i}
                position={[0, 0, zPos]}
                width={width}
                eaveHeight={eaveHeight}
                ridgeHeight={calculatedRidgeHeight} 
                roofPitch={roofPitch}
                buildingType={config.buildingType}
            />
        );
    }

    const angleRad = (roofPitch * Math.PI) / 180;

    return (
        <group>
            {/* CUSTOM MODE RIDGE FLASHING */}
            {configMode === 'custom' && customParams.buildingType !== 'monopente' && (
                <RidgeFlashing
                    len={length + 1.0}
                    h={customParams.ridgeHeight + 0.5}
                    angle={(customParams.leftPitch + customParams.rightPitch) / 2 * (Math.PI / 180)}
                    x={-width / 2 + customSpans.left}
                />
            )}

            {configMode === 'predefined' && (config.buildingType === 'symetrique' || config.buildingType === 'epona') && (
                <RidgeFlashing
                    len={length + 1.0}
                    h={(() => {
                        if (config.isAcama) {
                            if (config.buildingType === 'epona') {
                                const mainSlope = 17 * (Math.PI / 180);
                                return 5.0 + 11.8 * Math.tan(mainSlope) + 0.5; 
                            }
                            if (config.buildingType === 'symetrique' && Math.abs(width - 18.8) < 0.1) return calculatedRidgeHeight + 0.5;
                            if (config.buildingType === 'symetrique' && Math.abs(width - 17.5) < 0.1) return calculatedRidgeHeight + 0.6;
                        }
                        return calculatedRidgeHeight + 0.5;
                    })()}
                    angle={config.buildingType === 'epona' ? 17 * (Math.PI / 180) : angleRad}
                    x={0}
                />
            )}
            {configMode === 'predefined' && ((buildingType === 'asymetrique_1' || buildingType === 'asymetrique_2')) && (
                <RidgeFlashing
                    len={length + 1.0}
                    h={(() => {
                        let h = calculatedRidgeHeight + 1.0;
                        if (config.buildingType === 'asymetrique_1') {
                            if (Math.abs(width - 20) < 0.5) h += 0.30; 
                            else if (Math.abs(width - 16.4) < 0.5) h -= 0.06; 
                        } else if (config.buildingType === 'asymetrique_2') {
                            if (!config.isAcama) {
                                if (Math.abs(width - 25.5) < 0.2) h += 1.10; // USER REQUEST 10/04/2026: lowered by 0.3m to follow roof
                                else if (Math.abs(width - 29.1) < 0.2) h += 1.75; // USER REQUEST 10/04/2026: raised by 0.4m to follow roof
                                else h += 1.15; 
                            }
                            if (Math.abs(width - 25.5) < 0.5) h -= 0.44; 
                            else if (Math.abs(width - 29.1) < 0.5) h -= 0.44; 
                        }
                        return h;
                    })()}
                    angle={15 * Math.PI / 180} 
                    x={-width * 0.25} 
                />
            )}

            {frames}
            <Purlins
                width={width}
                length={length}
                bayCount={bayCount}
                baySpacing={baySpacing}
                roofPitch={roofPitch}
                eaveHeight={eaveHeight}
                ridgeHeight={calculatedRidgeHeight} // Pass Ridge Height
                buildingType={config.buildingType} // Pass Type
            />
            <Roof
                width={width}
                length={length}
                roofPitch={roofPitch}
                eaveHeight={eaveHeight}
                ridgeHeight={calculatedRidgeHeight}
                buildingType={config.buildingType}
            />
            <Bracing
                width={width}
                length={length}
                bayCount={bayCount}
                baySpacing={baySpacing}
                eaveHeight={eaveHeight}
                ridgeHeight={calculatedRidgeHeight} // Pass Ridge Height
                roofPitch={roofPitch}
                buildingType={config.buildingType} // Pass Type
                leftSide={leftSide}
                rightSide={rightSide}
                leftWidth={config.leftWidth}
                rightWidth={config.rightWidth}
            />

            {/* REMOVED RidgeCap */}
            {/* Added Longitudinal Beams (Sablière/Faitière) */}
            <LongitudinalBeams
                width={width}
                length={length}
                eaveHeight={eaveHeight}
                ridgeHeight={calculatedRidgeHeight}
                buildingType={config.buildingType}
                roofPitch={roofPitch}
            />

            {/* --- EXTENSIONS GAUCHE --- */}
            {config.leftSide === 'auvent' && (
                <Auvent
                    side="left"
                    length={length}
                    eaveHeight={configMode === 'custom' ? customParams.leftEaveHeight : eaveHeight}
                    ridgeHeight={calculatedRidgeHeight} // Needed for Monopente
                    roofPitch={roofPitch}
                    buildingWidth={width}
                    bayCount={bayCount}
                    baySpacing={baySpacing}
                    buildingType={config.buildingType}
                />
            )}
            {config.leftSide === 'appentis' && (
                <Awning
                    side="left"
                    length={length}
                    eaveHeight={configMode === 'custom' ? customParams.leftEaveHeight : eaveHeight}
                    roofPitch={roofPitch}
                    buildingWidth={width}
                    bayCount={bayCount}
                    baySpacing={baySpacing}
                    buildingType={config.buildingType}
                />
            )}

            {/* --- EXTENSIONS DROITE --- */}
            {config.rightSide === 'auvent' && (
                <Auvent
                    side="right"
                    length={length}
                    eaveHeight={configMode === 'custom' ? customParams.rightEaveHeight : eaveHeight}
                    ridgeHeight={calculatedRidgeHeight} // Needed for Monopente
                    roofPitch={roofPitch}
                    buildingWidth={width}
                    bayCount={bayCount}
                    baySpacing={baySpacing}
                    buildingType={config.buildingType}
                />
            )}
            {config.rightSide === 'appentis' && (
                <Awning
                    side="right"
                    length={length}
                    eaveHeight={configMode === 'custom' ? customParams.rightEaveHeight : eaveHeight}
                    roofPitch={roofPitch}
                    buildingWidth={width}
                    bayCount={bayCount}
                    baySpacing={baySpacing}
                    buildingType={config.buildingType}
                />
            )}

            <DimensionsMarkers
                width={width}
                length={length}
                eaveHeight={eaveHeight}
                ridgeHeight={calculatedRidgeHeight} // Pass Ridge Height
                roofPitch={roofPitch}
                leftSide={leftSide}
                rightSide={rightSide}
                showDimensions={showDimensions}
                buildingType={config.buildingType} // Pass Type
            />
        </group>
    );
}
