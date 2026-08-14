import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Camera, RotateCw, ZoomIn, Box, Sparkles, Check, RefreshCw, Eye, Layers } from 'lucide-react';

/**
 * Building3DViewer — Visionneuse 3D interactive du bâtiment / ombrière solaire
 * Permet d'orbiter autour du modèle 3D en temps réel et de capturer les 5 zones de façades et toiture pour la PC5 :
 * - Façade Sud
 * - Façade Nord
 * - Façade Est
 * - Façade Ouest
 * - Vue couverture (Toiture)
 */
export default function Building3DViewer({
  buildingConfig = {},
  onCaptureSnapshot,
  onCaptureAll5Views,
  height = 360,
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

  const [activeSlot, setActiveSlot] = useState('facade_sud');
  const [capturedSlots, setCapturedSlots] = useState({});
  const [isCapturingAll, setIsCapturingAll] = useState(false);

  const length = parseFloat(buildingConfig.longueur || 30.0);
  const width = parseFloat(buildingConfig.largeur || 18.6);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    dirLight.position.set(60, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.6);
    fillLight.position.set(-40, 30, -40);
    scene.add(fillLight);

    // 5. Sol / Shadow Catcher
    const planeGeo = new THREE.PlaneGeometry(160, 160);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grille
    const grid = new THREE.GridHelper(100, 25, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0.01;
    scene.add(grid);

    // 6. Construction 3D Bâtiment / Structure
    const meshGroup = new THREE.Group();

    // Matériaux
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // RAL 7016 Gris Anthracite
      roughness: 0.35,
      metalness: 0.75
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

    // Poteaux et Portiques métalliques
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

    // Lignes de séparation de modules photovoltaïques
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
      threeRef.current.rotation.x = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, threeRef.current.rotation.x + deltaY * 0.008));

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

  // Positions préconfigurées pour les 5 façades et toiture
  const CAMERA_PRESETS = {
    facade_sud: { rotation: { x: 0.15, y: 0 }, distance: 45, label: 'Façade Sud' },
    facade_nord: { rotation: { x: 0.15, y: Math.PI }, distance: 45, label: 'Façade Nord' },
    facade_est: { rotation: { x: 0.15, y: -Math.PI / 2 }, distance: 40, label: 'Façade Est' },
    facade_ouest: { rotation: { x: 0.15, y: Math.PI / 2 }, distance: 40, label: 'Façade Ouest' },
    vue_couverture: { rotation: { x: Math.PI / 2 - 0.08, y: 0 }, distance: 42, label: 'Vue Couverture' },
  };

  const applyPreset = (presetKey) => {
    setActiveSlot(presetKey);
    const p = CAMERA_PRESETS[presetKey];
    if (!p || !threeRef.current.camera) return;

    threeRef.current.rotation = { ...p.rotation };
    threeRef.current.distance = p.distance;

    const { camera } = threeRef.current;
    camera.position.x = p.distance * Math.sin(p.rotation.y) * Math.cos(p.rotation.x);
    camera.position.y = p.distance * Math.sin(p.rotation.x) + eaveHeight / 2;
    camera.position.z = p.distance * Math.cos(p.rotation.y) * Math.cos(p.rotation.x);
    camera.lookAt(0, eaveHeight / 2, 0);
  };

  // Capture du Snapshot de la vue active
  const handleTakeSnapshot = () => {
    if (!threeRef.current.renderer || !threeRef.current.scene || !threeRef.current.camera) return;
    threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera);
    const dataUrl = threeRef.current.renderer.domElement.toDataURL('image/jpeg', 0.95);

    setCapturedSlots(prev => ({ ...prev, [activeSlot]: dataUrl }));
    if (onCaptureSnapshot) {
      onCaptureSnapshot(dataUrl, activeSlot);
    }
  };

  // Capture automatique des 5 vues
  const handleCaptureAll5 = async () => {
    if (!threeRef.current.renderer || !threeRef.current.scene || !threeRef.current.camera) return;
    setIsCapturingAll(true);

    const keys = ['facade_sud', 'facade_nord', 'facade_est', 'facade_ouest', 'vue_couverture'];
    const results = {};

    for (const key of keys) {
      applyPreset(key);
      await new Promise(r => setTimeout(r, 120));
      threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera);
      const dataUrl = threeRef.current.renderer.domElement.toDataURL('image/jpeg', 0.95);
      results[key] = dataUrl;
    }

    setCapturedSlots(results);
    if (onCaptureAll5Views) {
      onCaptureAll5Views(results);
    } else if (onCaptureSnapshot) {
      onCaptureSnapshot(results.facade_sud, 'facade_sud');
    }

    // Revenir en vue 3D perspective libre
    threeRef.current.rotation = { x: 0.35, y: -0.65 };
    threeRef.current.distance = 40;
    const { camera } = threeRef.current;
    camera.position.x = 40 * Math.sin(-0.65) * Math.cos(0.35);
    camera.position.y = 40 * Math.sin(0.35) + eaveHeight / 2;
    camera.position.z = 40 * Math.cos(-0.65) * Math.cos(0.35);
    camera.lookAt(0, eaveHeight / 2, 0);

    setIsCapturingAll(false);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs flex flex-col ${className}`}>
      {/* 3D Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height }} className="cursor-grab active:cursor-grabbing flex-1" />

      {/* Top Bar : Sélecteur des 5 angles prédéfinis */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none flex-wrap gap-1">
        <div className="flex items-center gap-1 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'facade_sud', label: 'Façade Sud' },
            { id: 'facade_nord', label: 'Façade Nord' },
            { id: 'facade_est', label: 'Façade Est' },
            { id: 'facade_ouest', label: 'Façade Ouest' },
            { id: 'vue_couverture', label: 'Toiture' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => applyPreset(btn.id)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                activeSlot === btn.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {btn.label}
              {capturedSlots[btn.id] && <span className="ml-1 text-[9px] text-emerald-300">✓</span>}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            threeRef.current.rotation = { x: 0.35, y: -0.65 };
            threeRef.current.distance = 40;
            const { camera } = threeRef.current;
            if (camera) {
              camera.position.x = 40 * Math.sin(-0.65) * Math.cos(0.35);
              camera.position.y = 40 * Math.sin(0.35) + eaveHeight / 2;
              camera.position.z = 40 * Math.cos(-0.65) * Math.cos(0.35);
              camera.lookAt(0, eaveHeight / 2, 0);
            }
          }}
          className="pointer-events-auto p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-xs text-xs font-bold transition-all"
          title="Vue 3D Libre"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Bar : Actions de capture instantanée */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] text-slate-500 font-semibold bg-white/85 backdrop-blur-xs px-2 py-0.5 rounded-lg pointer-events-auto">
          Faites glisser pour tourner • Molette pour zoomer
        </span>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleTakeSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Capturer {CAMERA_PRESETS[activeSlot]?.label || 'cette vue'}</span>
          </button>

          <button
            onClick={handleCaptureAll5}
            disabled={isCapturingAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isCapturingAll ? 'Capture des 5 vues...' : '⚡ Capturer les 5 vues PC5'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
