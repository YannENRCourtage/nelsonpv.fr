import React from 'react';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { PortalFrame } from './PortalFrame.jsx';
import { Purlins } from './Purlins.jsx';
import { Roof } from './Roof.jsx';
import { Bracing } from './Bracing.jsx';
import { RidgeCap } from './RidgeCap.jsx';
import { DimensionsMarkers } from './DimensionsMarkers.jsx';
import { Awning } from './Awning.jsx';

export function Structure() {
    const config = useConfiguratorValues();
    const { width, length, bayCount, baySpacing, eaveHeight, roofPitch, hasAwning, showDimensions } = config;

    const calculatedRidgeHeight = eaveHeight + (width / 2) * Math.tan(roofPitch * Math.PI / 180);

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
            />
            <Roof
                width={width}
                length={length}
                roofPitch={roofPitch}
                eaveHeight={eaveHeight}
            />
            <Bracing
                width={width}
                length={length}
                bayCount={bayCount}
                baySpacing={baySpacing}
                eaveHeight={eaveHeight}
                roofPitch={roofPitch}
            />
            <RidgeCap
                width={width}
                length={length}
                roofPitch={roofPitch}
                eaveHeight={eaveHeight}
            />
            {hasAwning && (
                <Awning
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
                ridgeHeight={calculatedRidgeHeight}
                roofPitch={roofPitch}
                hasAwning={hasAwning}
                showDimensions={showDimensions}
            />
        </group>
    );
}
