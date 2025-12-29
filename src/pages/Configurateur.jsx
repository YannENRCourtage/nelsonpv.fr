import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, ContactShadows, AccumulativeShadows, RandomizedLight } from '@react-three/drei';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Building } from '../components/configurator/structure/Building.jsx';

export default function Configurateur() {
    const { user } = useAuth();

    // États de configuration
    const [config, setConfig] = useState({
        span: 20,
        length: 20,
        eaveHeight: 6,
        roofPitch: 15,
        baySpacing: 5,
        columnProfile: 'IPE450',
        rafterProfile: 'IPE360'
    });

    // Restriction admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Fonction de mise à jour
    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="h-screen w-full bg-gradient-to-b from-slate-100 to-slate-200 relative">

            {/* ========== UI OVERLAY ========== */}
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto border border-slate-200">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Configurateur 3D Pro</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Bâtiment Métallique Paramétrique</p>
                </div>

                <div className="space-y-6">

                    {/* DIMENSIONS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b pb-2">Dimensions</h3>

                        {/* Largeur (Span) */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Largeur</span>
                                <span className="font-bold text-blue-600">{config.span} m</span>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="40"
                                step="1"
                                value={config.span}
                                onChange={(e) => updateConfig('span', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Longueur */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Longueur</span>
                                <span className="font-bold text-blue-600">{config.length} m</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="60"
                                step="5"
                                value={config.length}
                                onChange={(e) => updateConfig('length', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Hauteur Égoût */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Hauteur Égoût</span>
                                <span className="font-bold text-blue-600">{config.eaveHeight} m</span>
                            </div>
                            <input
                                type="range"
                                min="4"
                                max="12"
                                step="0.5"
                                value={config.eaveHeight}
                                onChange={(e) => updateConfig('eaveHeight', parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Pente Toit */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Pente Toiture</span>
                                <span className="font-bold text-blue-600">{config.roofPitch}°</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="30"
                                step="1"
                                value={config.roofPitch}
                                onChange={(e) => updateConfig('roofPitch', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Espacement Travées */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Espacement Travées</span>
                                <span className="font-bold text-blue-600">{config.baySpacing} m</span>
                            </div>
                            <input
                                type="range"
                                min="4"
                                max="8"
                                step="1"
                                value={config.baySpacing}
                                onChange={(e) => updateConfig('baySpacing', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>

                    {/* PROFILÉS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b pb-2">Profilés IPE</h3>

                        {/* Poteaux */}
                        <div>
                            <label className="text-sm text-slate-600 block mb-2">Poteaux</label>
                            <select
                                value={config.columnProfile}
                                onChange={(e) => updateConfig('columnProfile', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="IPE300">IPE 300</option>
                                <option value="IPE360">IPE 360</option>
                                <option value="IPE400">IPE 400</option>
                                <option value="IPE450">IPE 450</option>
                                <option value="IPE500">IPE 500</option>
                                <option value="IPE550">IPE 550</option>
                                <option value="IPE600">IPE 600</option>
                            </select>
                        </div>

                        {/* Arbalétriers */}
                        <div>
                            <label className="text-sm text-slate-600 block mb-2">Arbalétriers</label>
                            <select
                                value={config.rafterProfile}
                                onChange={(e) => updateConfig('rafterProfile', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="IPE200">IPE 200</option>
                                <option value="IPE240">IPE 240</option>
                                <option value="IPE270">IPE 270</option>
                                <option value="IPE300">IPE 300</option>
                                <option value="IPE360">IPE 360</option>
                                <option value="IPE400">IPE 400</option>
                                <option value="IPE450">IPE 450</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== SCENE 3D ========== */}
            <Canvas
                shadows
                camera={{ position: [35, 25, 35], fov: 45 }}
                gl={{ antialias: true, alpha: false }}
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
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[20, 40, 15]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-30}
                    shadow-camera-right={30}
                    shadow-camera-top={30}
                    shadow-camera-bottom={-30}
                    shadow-bias={-0.0001}
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

                        {/* BÂTIMENT */}
                        <Building
                            span={config.span}
                            length={config.length}
                            eaveHeight={config.eaveHeight}
                            roofPitch={config.roofPitch}
                            baySpacing={config.baySpacing}
                            columnProfile={config.columnProfile}
                            rafterProfile={config.rafterProfile}
                        />

                        {/* SOL */}
                        <mesh
                            rotation={[-Math.PI / 2, 0, 0]}
                            receiveShadow
                            position={[0, -0.01, 0]}
                        >
                            <planeGeometry args={[200, 200]} />
                            <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
                        </mesh>

                        {/* GRILLE */}
                        <gridHelper args={[150, 75, '#cccccc', '#e5e5e5']} />

                        {/* OMBRES ACCUMULÉES */}
                        <AccumulativeShadows
                            temporal
                            frames={100}
                            color="#000000"
                            opacity={0.5}
                            scale={100}
                            position={[0, 0.01, 0]}
                        >
                            <RandomizedLight
                                amount={8}
                                radius={15}
                                position={[10, 20, 10]}
                            />
                        </AccumulativeShadows>

                    </group>
                </Suspense>
            </Canvas>
        </div>
    );
}
