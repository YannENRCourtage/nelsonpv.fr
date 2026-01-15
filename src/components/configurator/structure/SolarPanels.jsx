import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useConfiguratorStore, useConfiguratorValues } from '../../../stores/useConfiguratorStore';
import { calculateSolarLayout } from '../utils/solarLayout';

// ... (Constants preserved if needed, but logic moved) ...

export function SolarPanels({ surfaceWidth, surfaceLength, name = "Roof", forceFullCoverage = false, stretchToFit = false }) {
    const { hasSolar } = useConfiguratorStore(useConfiguratorValues);

    // Geometry & Material (Memoized)
    const panelGeometry = useMemo(() => new THREE.BoxGeometry(1.134, 0.04, 1.762), []);
    // ...

    const layout = useMemo(() => {
        if (!hasSolar) return null;

        return calculateSolarLayout(surfaceWidth, surfaceLength, forceFullCoverage);
    }, [hasSolar, surfaceWidth, surfaceLength, forceFullCoverage]);

    // ...

    if (!hasSolar || !layout) return null;

    // Centering
    const { totalGridWidth, totalGridLength, dimX, dimZ, rowsX, colsZ, effectiveGap } = layout;

    const startX = -totalGridWidth / 2 + dimX / 2;
    const startZ = -totalGridLength / 2 + dimZ / 2;

    // ... Loop logic mostly same using layout props ...
    const instances = [];
    for (let ix = 0; ix < rowsX; ix++) {
        for (let iz = 0; iz < colsZ; iz++) {
            instances.push({
                x: startX + ix * (dimX + effectiveGap),
                y: forceFullCoverage ? 0.20 : 0.05,
                z: startZ + iz * (dimZ + effectiveGap)
            });
        }
    }

    // Stretch Logic
    const scaleX = stretchToFit && totalGridWidth > 0 ? surfaceWidth / totalGridWidth : 1;
    const scaleZ = stretchToFit && totalGridLength > 0 ? surfaceLength / totalGridLength : 1;

    return (
        <group scale={[scaleX, 1, scaleZ]}>
            {instances.map((pos, idx) => (
                <mesh key={idx} geometry={panelGeometry} position={[pos.x, pos.y, pos.z]} castShadow>
                    <meshStandardMaterial attach="material" color="#1a1a2a" roughness={0.2} metalness={0.9} />
                    <lineSegments>
                        <edgesGeometry args={[panelGeometry]} />
                        <lineBasicMaterial color="#888" linewidth={1} />
                    </lineSegments>
                </mesh>
            ))}
        </group>
    );
}
