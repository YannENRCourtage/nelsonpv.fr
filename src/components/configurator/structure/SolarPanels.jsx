import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useConfiguratorStore, useConfiguratorValues } from '../../../stores/useConfiguratorStore';

// CONSTANTS
const PANEL_WIDTH = 1.134; // meters (Largeur)
const PANEL_HEIGHT = 1.762; // meters (Hauteur/Longueur)
const PANEL_POWER = 465; // Watts peak
const GAP = 0.00; // No gap (Jointif)
const MARGIN = 0.50; // 50cm margin

/**
 * SolarPanels Component
 * Generates a grid of solar panels on a given surface.
 * @param {number} width - Dimensions of the surface along X axis (Slope width)
 * @param {number} length - Dimensions of the surface along Z axis (Building length)
 * @param {number} pitch - Roof pitch in degrees (for potential info display, mostly handled by parent rotation)
 * @param {string} side - 'left' or 'right'
 */
export function SolarPanels({ surfaceWidth, surfaceLength, name = "Roof", forceFullCoverage = false }) {
    const { hasSolar } = useConfiguratorStore(useConfiguratorValues);

    // Geometry & Material (Memoized)
    // Create a single panel geometry
    const panelGeometry = useMemo(() => new THREE.BoxGeometry(PANEL_WIDTH, 0.04, PANEL_HEIGHT), []);
    const panelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        roughness: 0.2,
        metalness: 0.8,
        emissive: '#000022',
        emissiveIntensity: 0.1
    }), []);

    // Border/Frame Material
    const frameMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c0c0c0' }), []);

    // Layout Optimization (Calepinage)
    const effectiveGap = forceFullCoverage ? 0 : GAP;
    const effectiveMargin = forceFullCoverage ? 0 : MARGIN;

    // We try to fit as many panels as possible within the margins.
    // Usable Area
    const usableWidth = surfaceWidth - (2 * effectiveMargin);
    const usableLength = surfaceLength - (2 * effectiveMargin);

    // Calculate Counts (Portrait)
    // Along X (Slope Width): We place Panels by their Width (1.134) or Height (1.762)?
    // Usually "Portrait" means Height is along the slope? OR Height is vertical?
    // Let's assume PANEL (1.134 x 1.762) is placed such that 1.762 is along the length (Z) or width (X)?
    // The user said "176.2cm X 113.4cm".
    // Let's assume standard orientation: Long side (1.762) parallel to the slope (X)? Or parallel to the ridge (Z)?
    // "Calepinage exact sur chaque pan".
    // Let's try to maximize power.
    // Portrait: 1.134 (W) x 1.762 (H).
    // Landscape: 1.762 (W) x 1.134 (H).

    // We will align the panels with the roof axes.
    // Axis 1: Slope (X from user perspective of local surface)
    // Axis 2: Ridge (Z from user perspective of local surface)

    const layout = useMemo(() => {
        if (!hasSolar) return null;
        if (usableWidth <= 0 || usableLength <= 0) return null;

        // Try Option A: Panel Width (1.134) along Slope (X), Panel Height (1.762) along Ridge (Z)
        // Unit Size X: 1.134 + 0.01 (Gap)
        // Unit Size Z: 1.762 + 0.01 (Gap)

        const countX_A = Math.floor((usableWidth + effectiveGap) / (PANEL_WIDTH + effectiveGap));
        const countZ_A = Math.floor((usableLength + effectiveGap) / (PANEL_HEIGHT + effectiveGap));
        const total_A = countX_A * countZ_A;

        // Try Option B: Panel Height (1.762) along Slope (X), Panel Width (1.134) along Ridge (Z)
        const countX_B = Math.floor((usableWidth + effectiveGap) / (PANEL_HEIGHT + effectiveGap));
        const countZ_B = Math.floor((usableLength + effectiveGap) / (PANEL_WIDTH + effectiveGap));
        const total_B = countX_B * countZ_B;

        let selectedLayout = {};

        if (total_B > total_A) {
            selectedLayout = {
                rowsX: countX_B,
                colsZ: countZ_B,
                dimX: PANEL_HEIGHT,
                dimZ: PANEL_WIDTH,
                total: total_B
            };
        } else {
            selectedLayout = {
                rowsX: countX_A,
                colsZ: countZ_A,
                dimX: PANEL_WIDTH,
                dimZ: PANEL_HEIGHT,
                total: total_A,
            };
        }

        // Generate Positions
        const instances = [];

        // Centering offset
        const totalGridWidth = selectedLayout.rowsX * selectedLayout.dimX + (selectedLayout.rowsX - 1) * effectiveGap;
        const totalGridLength = selectedLayout.colsZ * selectedLayout.dimZ + (selectedLayout.colsZ - 1) * effectiveGap;

        const startX = -totalGridWidth / 2 + selectedLayout.dimX / 2;
        const startZ = -totalGridLength / 2 + selectedLayout.dimZ / 2;

        for (let ix = 0; ix < selectedLayout.rowsX; ix++) {
            for (let iz = 0; iz < selectedLayout.colsZ; iz++) {
                instances.push({
                    x: startX + ix * (selectedLayout.dimX + effectiveGap),
                    y: 0.05, // Slightly above roof surface
                    z: startZ + iz * (selectedLayout.dimZ + effectiveGap)
                });
            }
        }

        // Register stats (Basic effect used just for calculation if needed, but we don't have a callback here yet)
        // Ideally, we should lift this state up, but for now we just render.

        return { instances, ...selectedLayout };

    }, [hasSolar, usableWidth, usableLength]);

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
