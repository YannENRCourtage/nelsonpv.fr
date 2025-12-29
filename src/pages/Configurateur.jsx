import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, AccumulativeShadows, RandomizedLight } from '@react-three/drei';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Building } from '../components/configurator/structure/Building.jsx';
import { ControlPanel } from '../components/configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues } from '../stores/useConfiguratorStore.js';

export default function Configurateur() {
    const { user } = useAuth();
    const {
        width,
        ridgeHeight,
        eaveHeight,
        roofPitch,
        baySpacing,
        bayCount,
        length
    } = useConfiguratorValues();

    // Restriction admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="h-screen w-full bg-gradient-to-b from-slate-50 to-slate-200 relative flex">

            {/* ========== CONTROL PANEL (LEFT) ========== */}
            <div className="absolute top-4 left-4 z-10 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <ControlPanel />
            </div>

            {/* ========== 3D SCENE (FULL WIDTH) ========== */}
            <Canvas
                shadows
                camera={{ position: [40, 25, 40], fov: 45 }}
                gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
            >
                {/* SKY */}
                <Sky
                    sunPosition={[100, 40, 100]}
                    turbidity={1}
                    rayleigh={0.5}
                    inclination={0.6}
                    azimuth={0.25}
                />

                {/* LIGHTS */}
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[25, 50, 20]}
                    intensity={1.8}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-40}
                    shadow-camera-right={40}
                    shadow-camera-top={40}
                    shadow-camera-bottom={-40}
                    shadow-bias={-0.00005}
                />

                {/* ENVIRONMENT (HDRI) */}
                <Environment preset="warehouse" background={false} />

                {/* CONTROLS */}
                <OrbitControls
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.05}
                    enableDamping
                    dampingFactor={0.05}
                />

                {/* SCENE CONTENT */}
                <Suspense fallback={null}>
                    <group position={[0, 0, 0]}>

                        {/* BÂTIMENT - Utilisation du store Zustand */}
                        <Building
                            span={width}
                            length={length}
                            eaveHeight={eaveHeight}
                            roofPitch={roofPitch}
                            baySpacing={baySpacing}
                            columnProfile="IPE450"
                            rafterProfile="IPE360"
                        />

                        {/* SOL */}
                        <mesh
                            rotation={[-Math.PI / 2, 0, 0]}
                            receiveShadow
                            position={[0, -0.01, 0]}
                        >
                            <planeGeometry args={[300, 300]} />
                            <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
                        </mesh>

                        {/* GRILLE */}
                        <gridHelper args={[200, 100, '#cccccc', '#e5e5e5']} />

                        {/* OMBRES ACCUMULÉES */}
                        <AccumulativeShadows
                            temporal
                            frames={100}
                            color="#000000"
                            opacity={0.6}
                            scale={120}
                            position={[0, 0.01, 0]}
                        >
                            <RandomizedLight
                                amount={8}
                                radius={20}
                                position={[15, 25, 15]}
                            />
                        </AccumulativeShadows>

                    </group>
                </Suspense>
            </Canvas>

            {/* ========== INFO BADGE (TOP RIGHT) ========== */}
            <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">
                    <span className="text-blue-600 font-bold">{width}m</span> × <span className="text-green-600 font-bold">{length}m</span>
                </p>
            </div>
        </div>
    );
}
