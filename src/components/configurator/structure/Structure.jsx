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

export function Structure() {
    const config = useConfiguratorValues();
    const { width, length, bayCount, baySpacing, eaveHeight, roofPitch, ridgeHeight, leftSide, rightSide, showDimensions } = config;

    // Use exact ridge height from store (Map values) instead of calculated
    const calculatedRidgeHeight = ridgeHeight;

    // Ridge Flashing (Bande Lisse Faîtière)
    // 1m wide (0.5m each side), spanning length.
    const RidgeFlashing = ({ len, h, angle, x = 0 }) => {
        // Material
        const mat = useMemo(() => new THREE.MeshStandardMaterial({
            color: '#4A4A4A', // Dark Grey / Anthracite often used for flashings
            roughness: 0.5,
            metalness: 0.4,
            side: THREE.DoubleSide
        }), []);

        const shape = useMemo(() => {
            const s = new THREE.Shape();
            const halfW = 0.5; // 0.5m
            const drop = halfW * Math.tan(angle);
            const t = 0.005;

            // Profile in XY plane
            // Center is peak
            s.moveTo(0, 0.02); // Exact peak slightly raised
            s.lineTo(-halfW, -drop);
            s.lineTo(-halfW, -drop - t);
            s.lineTo(0, 0.02 - t);
            s.lineTo(halfW, -drop - t);
            s.lineTo(halfW, -drop);
            s.lineTo(0, 0.02);
            return s;
        }, [angle]);

        const geo = useMemo(() => new THREE.ExtrudeGeometry(shape, {
            depth: len,
            bevelEnabled: false
        }), [shape, len]);

        return (
            // Rotate Y 180 to extrude towards -Z (since frames are usually 0 to -L)
            // Or -Z? 
            // In Structure loop: zPos = -i * baySpacing. So building spans 0 to -Length.
            // ExtrudeGeometry defaults +Z.
            // Rotate Y PI -> +Z becomes -Z.
            // Position: [x, h, 0.5] to center on length (since len is L+1, and structure is 0 to -L)
            <mesh geometry={geo} material={mat} position={[x, h, 0.5]} rotation={[0, Math.PI, 0]} castShadow />
        );
    };

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
                ridgeHeight={calculatedRidgeHeight} // Same prop name
                roofPitch={roofPitch}
                buildingType={config.buildingType}
            />
        );
    }

    const angleRad = (roofPitch * Math.PI) / 180;

    return (
        <group>
            {config.buildingType === 'symetrique' && (
                <RidgeFlashing len={length + 1.0} h={calculatedRidgeHeight + 0.5} angle={angleRad} />
            )}
            {(config.buildingType === 'asymetrique_1' || config.buildingType === 'asymetrique_2') && (
                <RidgeFlashing
                    len={length + 1.0}
                    h={calculatedRidgeHeight + 1.0} // Raised 1m as requested
                    angle={15 * Math.PI / 180} // 15 degrees
                    x={-width * 0.25} // Apex position
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
                    eaveHeight={eaveHeight}
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
                    eaveHeight={eaveHeight}
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
                    eaveHeight={eaveHeight}
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
                    eaveHeight={eaveHeight}
                    roofPitch={roofPitch}
                    buildingWidth={width}
                    bayCount={bayCount}
                    baySpacing={baySpacing}
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
