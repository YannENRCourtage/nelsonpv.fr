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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
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

        // Ground - SOL BLANC
        const groundGeometry = new THREE.PlaneGeometry(60, 60);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Sol blanc au lieu de vert
            roughness: 0.9
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(60, 30, 0xcccccc, 0xe0e0e0);
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

        // Remove existing building and labels
        const existingBuilding = sceneRef.current.getObjectByName('building');
        if (existingBuilding) {
            sceneRef.current.remove(existingBuilding);
        }

        const existingLabels = sceneRef.current.getObjectByName('labels');
        if (existingLabels) {
            sceneRef.current.remove(existingLabels);
        }

        // Build new building based on config
        const buildingGroup = new THREE.Group();
        buildingGroup.name = 'building';

        const hauteur = config.hauteur === '6m' ? 6 : 5;
        const travees = config.travees ? parseInt(config.travees.replace('x', '')) : 5;
        const largeur = 10; // Largeur fixe
        const profondeur = travees * 2.5; // 2.5m par travée

        // Determine colors
        let poteauColor = 0xb33939; // Rouge SCREB
        let roofColor = 0x6b9b6b; // Vert toiture

        if (config.finition === 'Galva') {
            poteauColor = 0xc0c0c0;
            roofColor = 0xa0a0a0;
        } else if (config.finition === 'Peint') {
            poteauColor = 0xb33939;
            roofColor = 0x6b9b6b;
        }

        // Matériaux
        const poteauMaterial = new THREE.MeshStandardMaterial({
            color: poteauColor,
            metalness: 0.6,
            roughness: 0.3
        });

        const roofMaterial = new THREE.MeshStandardMaterial({
            color: roofColor,
            metalness: config.finition === 'Galva' ? 0.7 : 0.2,
            roughness: 0.4,
            side: THREE.DoubleSide
        });

        // Création des poteaux IPN (forme de H)
        const createIPNColumn = (x, z) => {
            const columnGroup = new THREE.Group();

            // Âme centrale (partie verticale centrale du H)
            const ameGeometry = new THREE.BoxGeometry(0.02, hauteur, 0.2);
            const ame = new THREE.Mesh(ameGeometry, poteauMaterial);
            ame.castShadow = true;
            columnGroup.add(ame);

            // Semelles (parties horizontales du H - haut et bas)
            const semelleGeometry = new THREE.BoxGeometry(0.2, 0.02, 0.2);

            const semelleHaut = new THREE.Mesh(semelleGeometry, poteauMaterial);
            semelleHaut.position.y = hauteur / 2 - 0.01;
            semelleHaut.castShadow = true;
            columnGroup.add(semelleHaut);

            const semelleBas = new THREE.Mesh(semelleGeometry, poteauMaterial);
            semelleBas.position.y = -hauteur / 2 + 0.01;
            semelleBas.castShadow = true;
            columnGroup.add(semelleBas);

            columnGroup.position.set(x, hauteur / 2, z);
            return columnGroup;
        };

        // Ajouter les poteaux IPN
        for (let i = 0; i <= travees; i++) {
            const z = -profondeur / 2 + (i * profondeur / travees);
            buildingGroup.add(createIPNColumn(-largeur / 2, z));
            buildingGroup.add(createIPNColumn(largeur / 2, z));
        }

        // Croix de Saint-André (toutes les 5 travées)
        const createCroixStAndre = (z) => {
            const croixGroup = new THREE.Group();
            const croixGeometry = new THREE.CylinderGeometry(0.04, 0.04, Math.sqrt(largeur * largeur + hauteur * hauteur), 8);

            const diag1 = new THREE.Mesh(croixGeometry, poteauMaterial);
            diag1.position.set(0, hauteur / 2, z);
            diag1.rotation.z = Math.atan2(hauteur, largeur);
            diag1.castShadow = true;
            croixGroup.add(diag1);

            const diag2 = new THREE.Mesh(croixGeometry, poteauMaterial);
            diag2.position.set(0, hauteur / 2, z);
            diag2.rotation.z = -Math.atan2(hauteur, largeur);
            diag2.castShadow = true;
            croixGroup.add(diag2);

            return croixGroup;
        };

        // Ajouter croix de Saint-André toutes les 5 travées
        for (let i = 0; i <= travees; i += 5) {
            if (i === 0 || i === travees || (i % 5 === 0 && i > 0 && i < travees)) {
                const z = -profondeur / 2 + (i * profondeur / travees);
                buildingGroup.add(createCroixStAndre(z));
            }
        }

        // Poutres horizontales (pannes)
        const panneGeometry = new THREE.BoxGeometry(largeur + 0.4, 0.15, 0.15);
        for (let i = 0; i <= travees; i++) {
            const z = -profondeur / 2 + (i * profondeur / travees);
            const panne = new THREE.Mesh(panneGeometry, poteauMaterial);
            panne.position.set(0, hauteur, z);
            panne.castShadow = true;
            buildingGroup.add(panne);
        }

        // Toiture
        if (config.type === 'Monopente') {
            const roofWidth = largeur + 0.5;
            const roofLength = profondeur + 1;
            const roofGeometry = new THREE.PlaneGeometry(roofWidth, roofLength);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, hauteur + 0.8, 0);
            roof.rotation.x = -Math.PI / 2 + Math.PI / 16;
            roof.castShadow = true;
            buildingGroup.add(roof);
        } else if (config.type === 'Auvent') {
            const roofGeometry = new THREE.PlaneGeometry(largeur + 0.5, profondeur / 2);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, hauteur + 0.5, profondeur / 4);
            roof.rotation.x = -Math.PI / 2 - Math.PI / 12;
            roof.castShadow = true;
            buildingGroup.add(roof);
        } else {
            // Bipente (deux pans)
            const roofHeight = 1.5;
            const halfWidth = largeur / 2 + 0.25;
            const roofPanWidth = Math.sqrt(halfWidth * halfWidth + roofHeight * roofHeight);

            const leftRoofGeometry = new THREE.PlaneGeometry(roofPanWidth, profondeur + 1);
            const leftRoof = new THREE.Mesh(leftRoofGeometry, roofMaterial);
            leftRoof.position.set(-halfWidth / 2, hauteur + roofHeight / 2, 0);
            leftRoof.rotation.y = Math.PI / 2;
            leftRoof.rotation.z = Math.atan2(roofHeight, halfWidth);
            leftRoof.castShadow = true;
            buildingGroup.add(leftRoof);

            const rightRoofGeometry = new THREE.PlaneGeometry(roofPanWidth, profondeur + 1);
            const rightRoof = new THREE.Mesh(rightRoofGeometry, roofMaterial);
            rightRoof.position.set(halfWidth / 2, hauteur + roofHeight / 2, 0);
            rightRoof.rotation.y = Math.PI / 2;
            rightRoof.rotation.z = -Math.atan2(roofHeight, halfWidth);
            rightRoof.castShadow = true;
            buildingGroup.add(rightRoof);
        }

        sceneRef.current.add(buildingGroup);

        // ANNOTATIONS DE DIMENSIONS
        const labelsGroup = new THREE.Group();
        labelsGroup.name = 'labels';

        const createLabel = (text, position) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;

            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.strokeStyle = '#333333';
            context.lineWidth = 2;
            context.strokeRect(0, 0, canvas.width, canvas.height);

            context.font = 'Bold 32px Arial';
            context.fillStyle = '#000000';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(2, 0.5, 1);

            return sprite;
        };

        // Longueur (profondeur)
        labelsGroup.add(createLabel(
            `${profondeur.toFixed(1)} m`,
            new THREE.Vector3(0, -0.5, 0)
        ));

        // Largeur
        labelsGroup.add(createLabel(
            `${largeur.toFixed(1)} m`,
            new THREE.Vector3(0, -0.5, -profondeur / 2 - 1.5)
        ));

        // Hauteur de la sablière
        labelsGroup.add(createLabel(
            `${hauteur} m`,
            new THREE.Vector3(-largeur / 2 - 2, hauteur / 2, -profondeur / 2)
        ));

        // Surface totale
        const surface = largeur * profondeur;
        labelsGroup.add(createLabel(
            `${surface.toFixed(0)} m²`,
            new THREE.Vector3(0, hauteur + 2.5, 0)
        ));

        sceneRef.current.add(labelsGroup);

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
