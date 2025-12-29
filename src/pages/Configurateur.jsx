import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Configurateur() {
    const { user } = useAuth();
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [config, setConfig] = useState({
        gamme: null,
        type: null,
        hauteur: null,
        travees: null,
        finition: null,
        couleurToiture: null,
        couleurBardage: null
    });

    // Restriction admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Setup Three.js scene
    useEffect(() => {
        if (!canvasRef.current || sceneRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / (window.innerHeight * 0.7), 0.1, 1000);
        camera.position.set(20, 15, 20);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight * 0.7);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 10;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 30, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(60, 60);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x90c090,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(60, 30, 0x888888, 0xcccccc);
        scene.add(gridHelper);

        // Animation
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / (window.innerHeight * 0.7);
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight * 0.7);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, []);

    // Update building based on config
    useEffect(() => {
        if (!sceneRef.current) return;

        // Remove existing building
        const existingBuilding = sceneRef.current.getObjectByName('building');
        if (existingBuilding) {
            sceneRef.current.remove(existingBuilding);
        }

        // Build new building based on config
        const buildingGroup = new THREE.Group();
        buildingGroup.name = 'building';

        const hauteur = config.hauteur === '6m' ? 6 : 5;
        const travees = config.travees ? parseInt(config.travees.replace('x', '')) : 5;
        const largeur = 10;
        const profondeur = travees * 2;

        // Determine colors
        let wallColor = 0x808080;
        let roofColor = 0x404040;

        if (config.finition === 'Galva') {
            wallColor = 0xc0c0c0;
            roofColor = 0xa0a0a0;
        } else if (config.finition === 'Peint') {
            wallColor = 0x6090c0;
            roofColor = 0x304060;
        }

        // Walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: wallColor,
            metalness: config.finition === 'Galva' ? 0.6 : 0.3,
            roughness: 0.4
        });

        // Side walls
        const sideWallGeometry = new THREE.BoxGeometry(0.2, hauteur, profondeur);
        const wall1 = new THREE.Mesh(sideWallGeometry, wallMaterial);
        wall1.position.set(-largeur / 2, hauteur / 2, 0);
        wall1.castShadow = true;
        buildingGroup.add(wall1);

        const wall2 = new THREE.Mesh(sideWallGeometry, wallMaterial);
        wall2.position.set(largeur / 2, hauteur / 2, 0);
        wall2.castShadow = true;
        buildingGroup.add(wall2);

        // Front/back walls
        const frontWallGeometry = new THREE.BoxGeometry(largeur, hauteur, 0.2);
        const wall3 = new THREE.Mesh(frontWallGeometry, wallMaterial);
        wall3.position.set(0, hauteur / 2, -profondeur / 2);
        wall3.castShadow = true;
        buildingGroup.add(wall3);

        const wall4 = new THREE.Mesh(frontWallGeometry, wallMaterial);
        wall4.position.set(0, hauteur / 2, profondeur / 2);
        wall4.castShadow = true;
        buildingGroup.add(wall4);

        // Roof
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: roofColor,
            metalness: config.finition === 'Galva' ? 0.7 : 0.2,
            roughness: 0.3
        });

        if (config.type === 'Monopente') {
            // Single slope roof
            const roofGeometry = new THREE.BoxGeometry(largeur + 0.5, 0.1, profondeur + 1);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, hauteur + 1, 0);
            roof.rotation.z = Math.PI / 12;
            roof.castShadow = true;
            buildingGroup.add(roof);
        } else if (config.type === 'Auvent') {
            // Canopy style
            const roofGeometry = new THREE.BoxGeometry(largeur + 0.5, 0.1, profondeur / 2);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, hauteur + 0.5, profondeur / 4);
            roof.rotation.x = -Math.PI / 12;
            roof.castShadow = true;
            buildingGroup.add(roof);
        } else {
            // Bipente (default) - gable roof
            const roofShape = new THREE.Shape();
            roofShape.moveTo(-largeur / 2 - 0.5, 0);
            roofShape.lineTo(0, 2);
            roofShape.lineTo(largeur / 2 + 0.5, 0);
            roofShape.lineTo(-largeur / 2 - 0.5, 0);

            const extrudeSettings = {
                depth: profondeur + 1,
                bevelEnabled: false
            };

            const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, hauteur, -profondeur / 2 - 0.5);
            roof.rotation.x = Math.PI / 2;
            roof.castShadow = true;
            buildingGroup.add(roof);
        }

        // Columns
        const columnMaterial = new THREE.MeshStandardMaterial({ color: 0x505050 });
        const columnGeometry = new THREE.CylinderGeometry(0.15, 0.15, hauteur, 8);

        for (let i = 0; i <= travees; i++) {
            const z = -profondeur / 2 + (i * profondeur / travees);

            const column1 = new THREE.Mesh(columnGeometry, columnMaterial);
            column1.position.set(-largeur / 2, hauteur / 2, z);
            column1.castShadow = true;
            buildingGroup.add(column1);

            const column2 = new THREE.Mesh(columnGeometry, columnMaterial);
            column2.position.set(largeur / 2, hauteur / 2, z);
            column2.castShadow = true;
            buildingGroup.add(column2);
        }

        sceneRef.current.add(buildingGroup);
    }, [config]);

    const steps = [
        {
            title: "Gamme",
            options: [
                { label: 'ECO', value: 'ECO' },
                { label: 'MAG', value: 'MAG' },
                { label: 'NEV', value: 'NEV' }
            ],
            key: 'gamme'
        },
        {
            title: "Type de bâtiment",
            options: [
                { label: 'Bipente', value: 'Bipente' },
                { label: 'Monopente', value: 'Monopente' },
                { label: 'Auvent', value: 'Auvent' }
            ],
            key: 'type'
        },
        {
            title: "Hauteur",
            options: [
                { label: '5 m', value: '5m' },
                { label: '6 m', value: '6m' }
            ],
            key: 'hauteur'
        },
        {
            title: "Nombre de travées",
            options: [
                { label: 'x 3', value: 'x3' },
                { label: 'x 4', value: 'x4' },
                { label: 'x 5', value: 'x5' },
                { label: 'x 6', value: 'x6' },
                { label: 'x 7', value: 'x7' },
                { label: 'x 8', value: 'x8' },
                { label: 'x 9', value: 'x9' },
                { label: 'x 10', value: 'x10' }
            ],
            key: 'travees'
        },
        {
            title: "Finition",
            options: [
                { label: 'Galva', value: 'Galva' },
                { label: 'Peint', value: 'Peint' }
            ],
            key: 'finition'
        }
    ];

    const handleOptionSelect = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        if (currentStep < steps.length) {
            setTimeout(() => setCurrentStep(currentStep + 1), 300);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleReset = () => {
        setConfig({
            gamme: null,
            type: null,
            hauteur: null,
            travees: null,
            finition: null,
            couleurToiture: null,
            couleurBardage: null
        });
        setCurrentStep(1);
    };

    return (
        <div className="w-full h-screen flex flex-col bg-white">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-600">Configurateur 3D</h1>
                        <p className="text-sm text-slate-500 mt-1">Configurez votre bâtiment en quelques clics</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg">
                            Étape <span className="font-bold text-blue-600">{currentStep}</span>/{steps.length}
                        </div>
                        <Button onClick={handleReset} variant="outline" size="sm">
                            Recommencer
                        </Button>
                    </div>
                </div>
            </header>

            {/* 3D Viewer */}
            <div className="flex-1 relative bg-gradient-to-b from-slate-50 to-slate-100">
                <canvas ref={canvasRef} className="w-full h-full" />
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-xs text-slate-600">
                    <p>💡 Cliquez et faites glisser pour pivoter la vue</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white border-t border-slate-200 p-6 shadow-lg">
                {currentStep <= steps.length && (
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-xl font-semibold mb-4 text-slate-900">
                            {steps[currentStep - 1].title}
                        </h2>
                        <div className="flex gap-3 flex-wrap">
                            {steps[currentStep - 1].options.map(option => (
                                <Button
                                    key={option.value}
                                    onClick={() => handleOptionSelect(steps[currentStep - 1].key, option.value)}
                                    className={`px-8 py-6 text-lg rounded-xl transition-all ${config[steps[currentStep - 1].key] === option.value
                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md'
                                        }`}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            {currentStep > 1 && (
                                <Button
                                    onClick={handleBack}
                                    variant="outline"
                                    className="px-6"
                                >
                                    ← Retour étape {currentStep - 1}
                                </Button>
                            )}

                            {config[steps[currentStep - 1].key] && currentStep < steps.length && (
                                <Button
                                    onClick={() => setCurrentStep(currentStep + 1)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                                >
                                    Continuer →
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {currentStep > steps.length && (
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-2 text-slate-900">Configuration terminée !</h2>
                        <p className="text-slate-600 mb-6">Votre bâtiment est prêt. Demandez un devis personnalisé.</p>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                            <h3 className="font-semibold mb-3 text-slate-900">Résumé de votre configuration :</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="text-left"><span className="font-medium">Gamme:</span> {config.gamme}</div>
                                <div className="text-left"><span className="font-medium">Type:</span> {config.type}</div>
                                <div className="text-left"><span className="font-medium">Hauteur:</span> {config.hauteur}</div>
                                <div className="text-left"><span className="font-medium">Travées:</span> {config.travees}</div>
                                <div className="text-left"><span className="font-medium">Finition:</span> {config.finition}</div>
                            </div>
                        </div>

                        <Button className="bg-green-600 hover:bg-green-700 text-white px-12 py-6 text-lg rounded-xl shadow-lg">
                            📧 Demander un devis
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
