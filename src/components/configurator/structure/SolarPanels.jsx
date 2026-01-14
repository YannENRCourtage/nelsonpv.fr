import { calculateSolarLayout } from '../utils/solarLayout';

// ... (Constants preserved if needed, but logic moved) ...

export function SolarPanels({ surfaceWidth, surfaceLength, name = "Roof", forceFullCoverage = false }) {
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

    return (
        <group>
            {instances.map((pos, idx) => (
                <mesh key={idx} geometry={panelGeometry} position={[pos.x, pos.y, pos.z]} /*...*/ >
                    <meshStandardMaterial attach="material" color="#1a1a2a" roughness={0.2} metalness={0.9} />
                    {/* ... Borders ... */}
                </mesh>
            ))}
        </group>
    );
}

// Side Effect for Global Stats could be done via a Store Action if we want to sum them up.
// For now, let's just render.

if (!hasSolar || !layout) return null;

return (
    <group>
        {layout.instances.map((pos, idx) => (
            <mesh
                key={idx}
                geometry={panelGeometry}
                position={[pos.x, pos.y, pos.z]}
                rotation={[0, 0, 0]} // Aligned with local roof
                castShadow
            >
                <meshStandardMaterial attach="material" color="#1a1a2a" roughness={0.2} metalness={0.9} />
                {/* Add borders logic if refined rendering is needed */}
                <lineSegments>
                    <edgesGeometry args={[panelGeometry]} />
                    <lineBasicMaterial color="#444" />
                </lineSegments>
            </mesh>
        ))}
    </group>
);
}
