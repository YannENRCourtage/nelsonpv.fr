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
const BuildingScene = forwardRef(({ viewMode = '3D', isCapturing = false }, ref) => {
    const config = useConfiguratorValues();

    // Camera settings based on mode
    const is2D = viewMode.startsWith('2D');

    // Background color
    const bgColor = isCapturing ? '#ffffff' : '#f0f4f8';

    return (
        <Canvas
            ref={ref}
            shadows
            gl={{ preserveDrawingBuffer: true, antialias: true }} // Essential for PDF capture
            style={{ borderRadius: '1rem', height: '100%', width: '100%' }}
        >
            <color attach="background" args={[bgColor]} />

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
                    <PerspectiveCamera makeDefault position={[20, 15, 30]} fov={50} />
                    {/* Target X=8 shifts building to the Left visually. Y=4 lowers building in view. */}
                    <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} target={[8, 4, 0]} />
                </>
            )}

            {viewMode === '2D_FRONT' && (
                <>
                    {/* Technical Isometric View (Fake 2D) */}
                    {/* Position at corner [100, 100, 100] gives standard Isometric angle */}
                    <OrthographicCamera
                        makeDefault
                        position={[100, 100, 100]}
                        near={-500}
                        far={1000}
                        zoom={30} // Bounds will likely override this
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
            {/* margin=1.1 means ~90% screen usage (1/1.1 = 0.9) */}
            <Bounds fit clip observe margin={1.1}>
                <Structure />
                {/* Add Cladding/Doors here later */}
            </Bounds>

            {/* Ground / Shadows */}
            {!isCapturing && (
                <>
                    {/* Grid Removed as requested */}
                    <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
                </>
            )}
        </Canvas>
    );
});

export default BuildingScene;
