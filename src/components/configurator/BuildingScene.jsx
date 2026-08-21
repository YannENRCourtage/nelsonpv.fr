import React, { forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Bounds, Environment, ContactShadows, Grid } from '@react-three/drei';
import { Structure } from './structure/Structure.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';

/**
 * Main 3D Scene for the Building Configurator
 * @param {string} viewMode - '3D', '2D_FRONT', '2D_GABLE'
 * @param {boolean} isCapturing - Optimizations for PDF capture (e.g. white background, no helper grids)
 */
const BuildingScene = forwardRef(({ viewMode = '3D', isCapturing = false, transparent = false }, ref) => {
    const config = useConfiguratorValues();

    // Camera settings based on mode
    const is2D = viewMode.startsWith('2D');

    // Background color
    const bgColor = isCapturing ? '#ffffff' : '#f0f4f8';

    return (
        <Canvas
            ref={ref}
            shadows
            gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }} // Essential for PDF capture
            style={{ borderRadius: '1rem', height: '100%', width: '100%' }}
        >
            {(!transparent || isCapturing) && <color attach="background" args={[bgColor]} />}

            {/* Lighting: Photorealism setup for Heavy Industry */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[80, 60, 50]} // Top-Right side light
                intensity={2.2}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0001}
            />
            <Environment preset="city" />

            {/* Camera Handling */}
            {viewMode === '3D' && (
                <>
                    <PerspectiveCamera makeDefault position={[22, 16, 32]} fov={48} near={0.1} far={2000} />
                    {/* Centrage parfait sur le centre géométrique du bâtiment (Image 5) */}
                    <OrbitControls
                        maxPolarAngle={Math.PI}
                        minDistance={2}
                        maxDistance={300}
                        target={[0, (config.eaveHeight + (config.ridgeHeight || 7.4)) * 0.45, -config.length / 2]}
                    />
                </>
            )}

            {viewMode === 'PIGNON' && (
                <>
                    <PerspectiveCamera
                        makeDefault
                        position={[0, (config.eaveHeight + (config.ridgeHeight || 7.4)) * 0.45, Math.max(config.width * 1.30, 18)]}
                        fov={45}
                        near={0.1}
                        far={2000}
                    />
                    <OrbitControls
                        enableRotate={false}
                        target={[0, (config.eaveHeight + (config.ridgeHeight || 7.4)) * 0.45, 0]}
                    />
                </>
            )}

            {viewMode === 'FACADE_SUD' && (
                <>
                    <PerspectiveCamera
                        makeDefault
                        position={[Math.max(config.width * 1.50, 26), (config.eaveHeight + (config.ridgeHeight || 7.4)) * 0.45, -config.length * 0.50]}
                        fov={42}
                        near={0.1}
                        far={2000}
                    />
                    <OrbitControls
                        enableRotate={false}
                        target={[0, (config.eaveHeight + (config.ridgeHeight || 7.4)) * 0.45, -config.length * 0.50]}
                    />
                </>
            )}

            {viewMode === '2D_FRONT' && (
                <>
                    {/* Technical Isometric View (+1 zoom point supplémentaire) */}
                    <OrthographicCamera
                        makeDefault
                        position={[100, 100, 100]}
                        near={-500}
                        far={1000}
                        zoom={Math.min(26, Math.max(15, 580 / Math.max(config.length, config.width, 25)))}
                        onUpdate={c => c.lookAt(0, config.eaveHeight / 2, -config.length / 2)}
                    />
                    <OrbitControls
                        enableRotate={false}
                        enableZoom={true}
                        target={[0, config.eaveHeight / 2, -config.length / 2]}
                    />
                </>
            )}

            {/* Auto-Centering logic: Re-fits whenever config changes */}
            {/* Capture: margin=1.15 pour Façade Sud (cadrage élargi sans coupure), 0.70 pour 3D, 0.75 pour Pignon */}
            <Bounds fit clip observe margin={isCapturing ? (viewMode === 'FACADE_SUD' ? 1.15 : (viewMode === '3D' ? 0.70 : 0.75)) : 1.1}>
                <Structure forceHideDimensions={viewMode !== '3D' && viewMode !== 'DEFAULT' && viewMode !== 'PERSPECTIVE'} />
            </Bounds>

            {/* Ground / Shadows */}
            {!isCapturing && (
                <>
                    {/* Grid Removed as requested */}
                    <ContactShadows
                        resolution={1024}
                        scale={Math.max(config.length * 2, config.width * 2, 50)}
                        blur={2}
                        opacity={0.5}
                        far={10}
                        color="#000000"
                    />
                </>
            )}
        </Canvas>
    );
});

export default BuildingScene;
