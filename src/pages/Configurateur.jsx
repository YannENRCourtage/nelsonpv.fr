import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, ContactShadows } from '@react-three/drei';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Structure } from '../components/configurator/structure/Structure.jsx';
import { Cladding } from '../components/configurator/structure/Cladding.jsx';
import { DimensionLine } from '../components/configurator/ui/DimensionLine.jsx';
import { Button } from '@/components/ui/button';

export default function Configurateur() {
    const { user } = useAuth();

    // États de configuration
    const [config, setConfig] = useState({
        length: 20,
        width: 10,
        height: 6,
        pitch: 15,
        roofColor: '#5c6166',
        wallColor: '#d6d6d6',
        showStructure: true,
        showCladding: true
    });

    // Restriction admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />; // Redirection temporaire désactivée pour test ? Non on garde la sécu
    }

    // Fonctions de mise à jour
    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="h-screen w-full bg-slate-50 relative">
            {/* --- UI Controls Overlay --- */}
            <div className="absolute top-4 left-4 z-10 bg-white/95 p-6 rounded-xl shadow-2xl backdrop-blur-md w-80 max-h-[90vh] overflow-y-auto border border-gray-100">
                <h1 className="text-xl font-bold mb-1 text-slate-800">Studio 3D</h1>
                <p className="text-xs text-slate-500 mb-4 font-mono">Bâtiment Métallique Paramétrique</p>

                <div className="space-y-5">
                    {/* Dimensions */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dimensions</h3>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>Longueur (m)</span>
                                <span className="font-bold">{config.length}m</span>
                            </div>
                            <input
                                type="range" min="5" max="50" step="1"
                                value={config.length}
                                onChange={(e) => updateConfig('length', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>Largeur (m)</span>
                                <span className="font-bold">{config.width}m</span>
                            </div>
                            <input
                                type="range" min="5" max="30" step="1"
                                value={config.width}
                                onChange={(e) => updateConfig('width', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>Hauteur Poteau (m)</span>
                                <span className="font-bold">{config.height}m</span>
                            </div>
                            <input
                                type="range" min="3" max="12" step="0.5"
                                value={config.height}
                                onChange={(e) => updateConfig('height', parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>Pente Toit (°)</span>
                                <span className="font-bold">{config.pitch}°</span>
                            </div>
                            <input
                                type="range" min="5" max="30" step="1"
                                value={config.pitch}
                                onChange={(e) => updateConfig('pitch', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-slate-200"></div>

                    {/* Affichage */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Affichage</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Structure</span>
                            <input type="checkbox" checked={config.showStructure} onChange={(e) => updateConfig('showStructure', e.target.checked)} className="toggle" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Habillage</span>
                            <input type="checkbox" checked={config.showCladding} onChange={(e) => updateConfig('showCladding', e.target.checked)} className="toggle" />
                        </div>
                    </div>

                    <div className="h-px bg-slate-200"></div>

                    {/* Couleurs */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Finitions</h3>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Toiture</label>
                            <div className="flex gap-2">
                                {['#5c6166', '#8e3535', '#2d5a3f'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateConfig('roofColor', c)}
                                        className={`w-6 h-6 rounded-full border-2 ${config.roofColor === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Canvas shadows camera={{ position: [25, 15, 25], fov: 45 }}>
                {/* Environment & Lighting */}
                <Sky sunPosition={[100, 40, 100]} turbidity={0.5} rayleigh={0.5} />
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[10, 30, 20]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-bias={-0.0001}
                >
                    <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30]} />
                </directionalLight>
                <Environment preset="warehouse" />

                {/* Controls */}
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.05} />

                {/* Scene Content */}
                <Suspense fallback={null}>
                    <group position={[0, 0, 0]}>

                        {config.showStructure && (
                            <Structure
                                length={config.length}
                                width={config.width}
                                height={config.height}
                                pitch={config.pitch}
                                baySpacing={5}
                            />
                        )}

                        {config.showCladding && (
                            <Cladding
                                length={config.length}
                                width={config.width}
                                height={config.height}
                                pitch={config.pitch}
                                roofColor={config.roofColor}
                                wallColor={config.wallColor}
                            />
                        )}

                        {/* Cotations 3D (Visibles si structure active ou toujours ?) */}
                        {config.showStructure && (
                            <group>
                                {/* Cote Largeur */}
                                <DimensionLine
                                    start={[-config.width / 2, 0.1, config.length / 2 + 2]}
                                    end={[config.width / 2, 0.1, config.length / 2 + 2]}
                                    label={`${config.width}m`}
                                    color="#2563eb"
                                />
                                {/* Cote Longueur */}
                                <DimensionLine
                                    start={[config.width / 2 + 2, 0.1, -config.length / 2]}
                                    end={[config.width / 2 + 2, 0.1, config.length / 2]}
                                    label={`${config.length}m`}
                                    color="#2563eb"
                                />
                                {/* Cote Hauteur */}
                                <DimensionLine
                                    start={[-config.width / 2 - 2, 0, config.length / 2]}
                                    end={[-config.width / 2 - 2, config.height, config.length / 2]}
                                    label={`${config.height}m`}
                                    color="#dc2626"
                                />
                            </group>
                        )}

                        {/* Ground */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                            <planeGeometry args={[100, 100]} />
                            <meshStandardMaterial color="#e5e7eb" roughness={0.8} />
                        </mesh>

                        <gridHelper args={[100, 50, 0xcccccc, 0xe5e5e5]} />

                        <ContactShadows resolution={1024} scale={60} blur={2} opacity={0.4} far={10} color="#000000" />
                    </group>
                </Suspense>
            </Canvas>
        </div>
    );
}
