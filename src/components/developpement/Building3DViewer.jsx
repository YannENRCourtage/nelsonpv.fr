import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Camera, RotateCw, ZoomIn, Box, Sparkles, Check, RefreshCw } from 'lucide-react';

/**
 * Building3DViewer — Visionneuse 3D interactive du bâtiment / ombrière solaire
 * Permet d'orbiter autour du modèle 3D en temps réel et de capturer la vue pour la PC5 (Plan façades et toitures).
 */
export default function Building3DViewer({
  buildingConfig = {},
  onCaptureSnapshot,
  height = 320,
  className = ''
}) {
  const mountRef = useRef(null);
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    meshGroup: null,
    isMouseDown: false,
    prevMousePos: { x: 0, y: 0 },
    rotation: { x: 0.35, y: -0.65 },
    distance: 40,
    animationId: null
  });

  const [isCaptured, setIsCaptured] = useState(false);

  const length = parseFloat(buildingConfig.longueur || 30.0);
  const width = parseFloat(buildingConfig.largeur || 16.4);
  const eaveHeight = parseFloat(buildingConfig.hauteur_egout || 4.0);
  const pitchDeg = parseFloat(buildingConfig.pente || 15);
  const type = buildingConfig.type || 'batiment_solaire';

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 600;
    const h = height;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 1000);
    const updateCameraPos = () => {
      const { rotation, distance } = threeRef.current;
      camera.position.x = distance * Math.sin(rotation.y) * Math.cos(rotation.x);
      camera.position.y = distance * Math.sin(rotation.x) + eaveHeight / 2;
      camera.position.z = distance * Math.cos(rotation.y) * Math.cos(rotation.x);
      camera.lookAt(0, eaveHeight / 2, 0);
    };
    updateCameraPos();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight.position.set(50, 70, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.5);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // 5. Sol / Shadow Catcher
    const planeGeo = new THREE.PlaneGeometry(120, 120);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grille subtile
    const grid = new THREE.GridHelper(80, 20, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0.01;
    scene.add(grid);

    // 6. Construction 3D Bâtiment / Structure
    const meshGroup = new THREE.Group();

    // Matériaux
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // RAL 7016 Gris Anthracite
      roughness: 0.4,
      metalness: 0.7
    });

    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Bleu photovoltaïque profond
      roughness: 0.15,
      metalness: 0.85
    });

    const gutterMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.5
    });

    const halfW = width / 2;
    const halfL = length / 2;
    const bayCount = Math.max(3, Math.round(length / 6));
    const baySpacing = length / bayCount;
    const ridgeHeight = eaveHeight + width * Math.tan((pitchDeg * Math.PI) / 180);

    // Poteaux et Portiques
    for (let i = 0; i <= bayCount; i++) {
      const z = -halfL + i * baySpacing;

      // Poteau Bas (Egout)
      const postBasGeo = new THREE.BoxGeometry(0.35, eaveHeight, 0.35);
      const postBas = new THREE.Mesh(postBasGeo, steelMat);
      postBas.position.set(-halfW, eaveHeight / 2, z);
      postBas.castShadow = true;
      meshGroup.add(postBas);

      // Poteau Haut (Faîtage / Sablière Haute)
      const postHautGeo = new THREE.BoxGeometry(0.35, ridgeHeight, 0.35);
      const postHaut = new THREE.Mesh(postHautGeo, steelMat);
      postHaut.position.set(halfW, ridgeHeight / 2, z);
      postHaut.castShadow = true;
      meshGroup.add(postHaut);

      // Traverse / Arbalétrier
      const rafterLen = Math.sqrt(Math.pow(width, 2) + Math.pow(ridgeHeight - eaveHeight, 2));
      const rafterGeo = new THREE.BoxGeometry(rafterLen, 0.3, 0.25);
      const rafter = new THREE.Mesh(rafterGeo, steelMat);
      rafter.position.set(0, (eaveHeight + ridgeHeight) / 2, z);
      rafter.rotation.z = Math.atan2(ridgeHeight - eaveHeight, width);
      rafter.castShadow = true;
      meshGroup.add(rafter);
    }

    // Panneaux Solaires en Toiture
    const roofLen = Math.sqrt(Math.pow(width, 2) + Math.pow(ridgeHeight - eaveHeight, 2)) + 0.6;
    const roofGeo = new THREE.BoxGeometry(roofLen, 0.08, length + 0.6);
    const roofMesh = new THREE.Mesh(roofGeo, panelMat);
    roofMesh.position.set(0, (eaveHeight + ridgeHeight) / 2 + 0.12, 0);
    roofMesh.rotation.z = Math.atan2(ridgeHeight - eaveHeight, width);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    meshGroup.add(roofMesh);

    // Lignes de séparation de modules
    const gridTextureMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true });
    const wireRoof = new THREE.Mesh(roofGeo, gridTextureMat);
    wireRoof.position.set(0, (eaveHeight + ridgeHeight) / 2 + 0.13, 0);
    wireRoof.rotation.z = Math.atan2(ridgeHeight - eaveHeight, width);
    meshGroup.add(wireRoof);

    // Gouttière
    const gutterGeo = new THREE.BoxGeometry(0.2, 0.2, length + 0.8);
    const gutter = new THREE.Mesh(gutterGeo, gutterMat);
    gutter.position.set(-halfW - 0.2, eaveHeight, 0);
    meshGroup.add(gutter);

    scene.add(meshGroup);

    threeRef.current.scene = scene;
    threeRef.current.camera = camera;
    threeRef.current.renderer = renderer;
    threeRef.current.meshGroup = meshGroup;

    // Animation Loop
    const animate = () => {
      threeRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse Interaction (Orbiting)
    const onMouseDown = (e) => {
      threeRef.current.isMouseDown = true;
      threeRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!threeRef.current.isMouseDown) return;
      const deltaX = e.clientX - threeRef.current.prevMousePos.x;
      const deltaY = e.clientY - threeRef.current.prevMousePos.y;

      threeRef.current.rotation.y += deltaX * 0.008;
      threeRef.current.rotation.x = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, threeRef.current.rotation.x + deltaY * 0.008));

      threeRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
      updateCameraPos();
    };

    const onMouseUp = () => {
      threeRef.current.isMouseDown = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      threeRef.current.distance = Math.max(15, Math.min(100, threeRef.current.distance + e.deltaY * 0.05));
      updateCameraPos();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(threeRef.current.animationId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [length, width, eaveHeight, pitchDeg, type, height]);

  // Capture du Snapshot HD de la vue 3D
  const handleTakeSnapshot = () => {
    if (!threeRef.current.renderer || !threeRef.current.scene || !threeRef.current.camera) return;
    threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera);
    const dataUrl = threeRef.current.renderer.domElement.toDataURL('image/jpeg', 0.95);
    
    if (onCaptureSnapshot) {
      onCaptureSnapshot(dataUrl);
      setIsCaptured(true);
      setTimeout(() => setIsCaptured(false), 2000);
    }
  };

  const handleResetCamera = () => {
    threeRef.current.rotation = { x: 0.35, y: -0.65 };
    threeRef.current.distance = 40;
    const { camera } = threeRef.current;
    if (camera) {
      camera.position.x = 40 * Math.sin(-0.65) * Math.cos(0.35);
      camera.position.y = 40 * Math.sin(0.35) + eaveHeight / 2;
      camera.position.z = 40 * Math.cos(-0.65) * Math.cos(0.35);
      camera.lookAt(0, eaveHeight / 2, 0);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs group ${className}`}>
      {/* 3D Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height }} className="cursor-grab active:cursor-grabbing" />

      {/* Top Controls Overlay */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-800 shadow-xs flex items-center gap-1.5 pointer-events-auto">
          <Box className="w-3.5 h-3.5 text-blue-600" />
          <span>Vue 3D Interactive ({width}m × {length}m)</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleResetCamera}
            className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-xs text-xs font-bold transition-all"
            title="Réinitialiser l'angle de vue"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Action Bar: Bouton Snapshot PC5 */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] text-slate-500 font-semibold bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-lg">
          Faites glisser pour tourner • Molette pour zoomer
        </span>

        <button
          onClick={handleTakeSnapshot}
          className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          {isCaptured ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Vue capturée pour PC5 !</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              <span>📸 Prendre photo pour PC5</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
