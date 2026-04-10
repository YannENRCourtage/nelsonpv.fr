import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getIPEProfileParams } from '../utils/profiles.js';

    const { configMode, customParams, customSpans } = useConfiguratorValues();
    const isMonopente = (configMode === 'custom' ? customParams.buildingType === 'monopente' : buildingType === 'monopente');

    // Material (Galvanized Steel)
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#d0d0d0',
        metalness: 0.5,
        roughness: 0.5
    }), []);

    // Helper to generic beam mesh
    const Beam = ({ x, y, z, rotation = [0, 0, 0] }) => {
        const { shape, options } = useMemo(() => getIPEProfileParams('IPE240', length), [length]);

        // Extrude geometry
        const geometry = useMemo(() => {
            return new THREE.ExtrudeGeometry(shape, options);
        }, [shape, options]);

        return (
            <mesh
                geometry={geometry}
                material={material}
                position={[x, y, z]}
                rotation={rotation}
                castShadow
            />
        );
    };

    // --- CUSTOM MODE GENERATION ---
    if (configMode === 'custom') {
        const cp = customParams;
        const spans = customSpans;
        const w = width;

        if (cp.buildingType === 'monopente') {
            return (
                <group>
                    {/* High Left Sablière (Ridge) */}
                    <Beam x={-w / 2} y={cp.leftEaveHeight} z={-length} />
                    {/* Low Right Sablière */}
                    <Beam x={w / 2} y={cp.rightEaveHeight} z={-length} />
                </group>
            );
        }

        const apexX = -w / 2 + spans.left;
        return (
            <group>
                {/* Left Sablière */}
                <Beam x={-w / 2} y={cp.leftEaveHeight} z={-length} />
                {/* Ridge Beam */}
                <Beam x={apexX} y={cp.ridgeHeight} z={-length} />
                {/* Right Sablière */}
                <Beam x={w / 2} y={cp.rightEaveHeight} z={-length} />
            </group>
        );
    }

    if (isMonopente) {
        return (
            <group>
                {/* Faitage Gauche (Ridge Left) */}
                <Beam
                    x={-width / 2}
                    y={ridgeHeight}
                    z={-length}
                />

                {/* Sablière Droite (Eave Right) */}
                <Beam
                    x={width / 2}
                    y={eaveHeight}
                    z={-length}
                />
            </group>
        );
    }

    if (buildingType === 'epona') {
        const mainPitch = 17 * (Math.PI / 180);
        const apexX = 0;
        const apexY = 5.0 + (11.8 * Math.tan(mainPitch));
        const leftColX = -11.8;
        const rightColX = -11.8 + 31.45; // 19.65

        return (
            <group>
                {/* Left Sablière */}
                <Beam x={leftColX} y={5.0} z={-length} />

                {/* Ridge Beam */}
                <Beam x={apexX} y={apexY} z={-length} />

                {/* Right Sablière */}
                <Beam x={rightColX} y={2.6} z={-length} />



            </group>
        );
    }


    // Default for Symetrique (Optional, maybe nothing for now or just Sablières)
    return null;
}
