import React from 'react';
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

    return (
        <group>
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
