import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Camera, RotateCw, ZoomIn, Box, Sparkles, Check, RefreshCw, Eye, Layers } from 'lucide-react';

/**
 * Building3DViewer — Visionneuse 3D interactive et captures PC5
 * Directive 1 : Persistance exacte des caractéristiques (Asymétrique, Symétrique, Monopente, Ombrière, Auvent, Appentis)
 * Directive 4 : Capture de la Vue Couverture (Toiture) orientée strictement en format PAYSAGE HORIZONTAL
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
  const width = parseFloat(buildingConfig.largeur || 20.0);
  const eaveHeight = parseFloat(buildingConfig.hauteur_egout || 4.0);
  const pitchDeg = parseFloat(buildingConfig.pente || 15);
  const buildingType = (buildingConfig.buildingType || buildingConfig.type || 'asymetrique_1').toLowerCase();
  const leftSide = buildingConfig.leftSide || 'none';
  const rightSide = buildingConfig.rightSide || 'none';

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 600;
    const h = height;

    // 1. Scène Three.js avec fond blanc neutre pur
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 2. Caméra Perspective
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 1000);
    const updateCameraPos = () => {
      const { rotation, distance } = threeRef.current;
      camera.up.set(0, 1, 0);
      camera.position.x = distance * Math.sin(rotation.y) * Math.cos(rotation.x);
      camera.position.y = distance * Math.sin(rotation.x) + eaveHeight / 2;
      camera.position.z = distance * Math.cos(rotation.y) * Math.cos(rotation.x);
      camera.lookAt(0, eaveHeight / 2, 0);
    };
    updateCameraPos();

    // 3. Renderer WebGL avec buffer préservé pour les captures
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Éclairages photoréalistes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(60, 90, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.6);
    fillLight.position.set(-50, 40, -50);
    scene.add(fillLight);

    // 5. Sol discret avec ombre douce
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // 6. Construction 3D Bâtiment / Structure exacte
    const meshGroup = new THREE.Group();

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.15, metalness: 0.85 });
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5 });
    const gridTextureMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true, opacity: 0.35, transparent: true });

    const halfW = width / 2;
    const halfL = length / 2;
    const bayCount = Math.max(3, Math.round(length / 6));
    const baySpacing = length / bayCount;
    const pitchRad = (pitchDeg * Math.PI) / 180;

    const isAsym = buildingType.includes('asymetrique');
    const isMonopente = buildingType === 'monopente';
    const isOmbriere = buildingType.includes('ombriere');

    // Calculs dimensionnels stricts
    let apexX = 0;
    let rightSpan = halfW;
    let leftSpan = halfW;
    let rightEaveH = eaveHeight;
    let leftEaveH = eaveHeight;
    let ridgeH = eaveHeight + halfW * Math.tan(pitchRad);

    if (isAsym) {
      rightSpan = width * 0.75;
      leftSpan = width * 0.25;
      apexX = -halfW + leftSpan; // Ex: X = -10 + 5 = -5m (décalé à gauche)
      rightEaveH = eaveHeight;   // Ex: 4.0m
      ridgeH = rightEaveH + rightSpan * Math.tan(pitchRad); // Ex: 4 + 15*tan(15°) = 8.02m
      leftEaveH = Math.max(3.0, ridgeH - leftSpan * Math.tan(pitchRad)); // Ex: 6.68m
    } else if (isMonopente) {
      apexX = -halfW;
      leftEaveH = eaveHeight + width * Math.tan(pitchRad);
      rightEaveH = eaveHeight;
      ridgeH = leftEaveH;
    } else if (isOmbriere) {
      apexX = 0;
      ridgeH = eaveHeight + 0.8;
      leftEaveH = eaveHeight;
      rightEaveH = eaveHeight - 0.4;
    }

    // Portiques métalliques
    for (let i = 0; i <= bayCount; i++) {
      const z = -halfL + i * baySpacing;

      // Poteau Gauche
      const postG = new THREE.Mesh(new THREE.BoxGeometry(0.35, leftEaveH, 0.35), steelMat);
      postG.position.set(-halfW, leftEaveH / 2, z);
      postG.castShadow = true;
      meshGroup.add(postG);

      // Poteau Droit
      const postD = new THREE.Mesh(new THREE.BoxGeometry(0.35, rightEaveH, 0.35), steelMat);
      postD.position.set(halfW, rightEaveH / 2, z);
      postD.castShadow = true;
      meshGroup.add(postD);

      // Arbalétrier Versant Gauche (Gauche -> Faîtage)
      const lenG = Math.sqrt(Math.pow(apexX - (-halfW), 2) + Math.pow(ridgeH - leftEaveH, 2));
      const rafterG = new THREE.Mesh(new THREE.BoxGeometry(lenG, 0.25, 0.2), steelMat);
      rafterG.position.set((-halfW + apexX) / 2, (leftEaveH + ridgeH) / 2, z);
      rafterG.rotation.z = Math.atan2(ridgeH - leftEaveH, apexX - (-halfW));
      rafterG.castShadow = true;
      meshGroup.add(rafterG);

      // Arbalétrier Versant Droit (Faîtage -> Droite)
      if (!isMonopente) {
        const lenD = Math.sqrt(Math.pow(halfW - apexX, 2) + Math.pow(ridgeH - rightEaveH, 2));
        const rafterD = new THREE.Mesh(new THREE.BoxGeometry(lenD, 0.25, 0.2), steelMat);
        rafterD.position.set((apexX + halfW) / 2, (ridgeH + rightEaveH) / 2, z);
        rafterD.rotation.z = Math.atan2(rightEaveH - ridgeH, halfW - apexX);
        rafterD.castShadow = true;
        meshGroup.add(rafterD);
      }

      // Extension AUVENT / APPENTIS si active
      if (rightSide === 'auvent' || rightSide === 'appentis') {
        const extLen = 4.0;
        const rafterExt = new THREE.Mesh(new THREE.BoxGeometry(extLen, 0.2, 0.15), steelMat);
        rafterExt.position.set(halfW + extLen / 2, rightEaveH - 0.2, z);
        rafterExt.rotation.z = -0.15;
        meshGroup.add(rafterExt);

        if (rightSide === 'appentis') {
          const postExt = new THREE.Mesh(new THREE.BoxGeometry(0.3, rightEaveH - 0.8, 0.3), steelMat);
          postExt.position.set(halfW + extLen, (rightEaveH - 0.8) / 2, z);
          meshGroup.add(postExt);
        }
      }
    }

    // Couverture Versant Principal (Droit / Solaire PV)
    const lenMainRoof = Math.sqrt(Math.pow(halfW - apexX, 2) + Math.pow(ridgeH - rightEaveH, 2)) + 0.4;
    const roofMain = new THREE.Mesh(new THREE.BoxGeometry(lenMainRoof, 0.08, length + 0.4), panelMat);
    roofMain.position.set((apexX + halfW) / 2, (ridgeH + rightEaveH) / 2 + 0.1, 0);
    roofMain.rotation.z = Math.atan2(rightEaveH - ridgeH, halfW - apexX);
    roofMain.castShadow = true;
    meshGroup.add(roofMain);

    // Lignes de panneaux solaires
    const wireMain = new THREE.Mesh(new THREE.BoxGeometry(lenMainRoof, 0.08, length + 0.4), gridTextureMat);
    wireMain.position.set((apexX + halfW) / 2, (ridgeH + rightEaveH) / 2 + 0.11, 0);
    wireMain.rotation.z = Math.atan2(rightEaveH - ridgeH, halfW - apexX);
    meshGroup.add(wireMain);

    // Couverture Versant Court (Gauche)
    if (!isMonopente) {
      const lenLeftRoof = Math.sqrt(Math.pow(apexX - (-halfW), 2) + Math.pow(ridgeH - leftEaveH, 2)) + 0.4;
      const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(lenLeftRoof, 0.08, length + 0.4), steelMat);
      roofLeft.position.set((-halfW + apexX) / 2, (leftEaveH + ridgeH) / 2 + 0.1, 0);
      roofLeft.rotation.z = Math.atan2(ridgeH - leftEaveH, apexX - (-halfW));
      roofLeft.castShadow = true;
      meshGroup.add(roofLeft);
    }

    // Extension Couverture Auvent
    if (rightSide === 'auvent' || rightSide === 'appentis') {
      const roofAuvent = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, length + 0.4), steelMat);
      roofAuvent.position.set(halfW + 2.0, rightEaveH - 0.1, 0);
      roofAuvent.rotation.z = -0.15;
      meshGroup.add(roofAuvent);
    }

    // Gouttière Sablière Basse
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, length + 0.6), gutterMat);
    gutter.position.set(halfW + 0.15, rightEaveH, 0);
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

    // Mouse Orbit Controls
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
      threeRef.current.distance = Math.max(15, Math.min(120, threeRef.current.distance + e.deltaY * 0.05));
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
  }, [length, width, eaveHeight, pitchDeg, buildingType, leftSide, rightSide, height]);

  // ── PRÉSETS DE CAMÉRA AVEC VUE COUVERTURE EN PAYSAGE HORIZONTAL ────────────
  const CAMERA_PRESETS = {
    // 1. Façade Sud (Long Pan Solaire / Droit)
    facade_sud: { rotation: { x: 0.10, y: -Math.PI / 2 }, distance: Math.max(length, width) * 1.35, label: 'Façade Sud (Long Pan Solaire)', isLandscapeRoof: false },
    
    // 2. Façade Nord (Long Pan Arrière / Gauche)
    facade_nord: { rotation: { x: 0.10, y: Math.PI / 2 }, distance: Math.max(length, width) * 1.35, label: 'Façade Nord (Arrière)', isLandscapeRoof: false },
    
    // 3. Façade Est (Pignon Gauche)
    facade_est: { rotation: { x: 0.10, y: 0 }, distance: Math.max(length, width) * 1.25, label: 'Façade Est (Pignon Gauche)', isLandscapeRoof: false },
    
    // 4. Façade Ouest (Pignon Droit)
    facade_ouest: { rotation: { x: 0.10, y: Math.PI }, distance: Math.max(length, width) * 1.25, label: 'Façade Ouest (Pignon Droit)', isLandscapeRoof: false },
    
    // 5. Vue Couverture : Orientée strictement en format PAYSAGE HORIZONTAL (up vector = [1,0,0])
    vue_couverture: { rotation: { x: Math.PI / 2 - 0.001, y: 0 }, distance: Math.max(length, width) * 1.45, label: 'Vue Toiture (Paysage Horizontal)', isLandscapeRoof: true },
  };

  const applyPreset = (presetKey) => {
    setActiveSlot(presetKey);
    const p = CAMERA_PRESETS[presetKey];
    if (!p || !threeRef.current.camera) return;

    const { camera } = threeRef.current;
    threeRef.current.rotation = { ...p.rotation };
    threeRef.current.distance = p.distance;

    if (p.isLandscapeRoof) {
      // Directive 4 : Orienter la toiture de sorte que la longueur soit horizontale
      camera.up.set(1, 0, 0);
      camera.position.set(0, p.distance, 0);
      camera.lookAt(0, 0, 0);
    } else {
      camera.up.set(0, 1, 0);
      camera.position.x = p.distance * Math.sin(p.rotation.y) * Math.cos(p.rotation.x);
      camera.position.y = p.distance * Math.sin(p.rotation.x) + eaveHeight / 2;
      camera.position.z = p.distance * Math.cos(p.rotation.y) * Math.cos(p.rotation.x);
      camera.lookAt(0, eaveHeight / 2, 0);
    }
  };

  const handleTakeSnapshot = () => {
    if (!threeRef.current.renderer || !threeRef.current.scene || !threeRef.current.camera) return;
    threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera);
    const dataUrl = threeRef.current.renderer.domElement.toDataURL('image/jpeg', 0.95);

    setCapturedSlots(prev => ({ ...prev, [activeSlot]: dataUrl }));
    if (onCaptureSnapshot) {
      onCaptureSnapshot(dataUrl, activeSlot);
    }
  };

  const handleCaptureAll5 = async () => {
    if (!threeRef.current.renderer || !threeRef.current.scene || !threeRef.current.camera) return;
    setIsCapturingAll(true);

    const keys = ['facade_sud', 'facade_nord', 'facade_est', 'facade_ouest', 'vue_couverture'];
    const results = {};

    for (const key of keys) {
      applyPreset(key);
      await new Promise(r => setTimeout(r, 160));
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

    // Revenir en vue 3D libre
    const { camera } = threeRef.current;
    camera.up.set(0, 1, 0);
    threeRef.current.rotation = { x: 0.35, y: -0.65 };
    threeRef.current.distance = 40;
    camera.position.x = 40 * Math.sin(-0.65) * Math.cos(0.35);
    camera.position.y = 40 * Math.sin(0.35) + eaveHeight / 2;
    camera.position.z = 40 * Math.cos(-0.65) * Math.cos(0.35);
    camera.lookAt(0, eaveHeight / 2, 0);

    setIsCapturingAll(false);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs flex flex-col ${className}`}>
      <div ref={mountRef} style={{ width: '100%', height }} className="cursor-grab active:cursor-grabbing flex-1 bg-white" />

      {/* Top Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none flex-wrap gap-1">
        <div className="flex items-center gap-1 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'facade_sud', label: 'Façade Sud' },
            { id: 'facade_nord', label: 'Façade Nord' },
            { id: 'facade_est', label: 'Façade Est' },
            { id: 'facade_ouest', label: 'Façade Ouest' },
            { id: 'vue_couverture', label: 'Toiture (Paysage)' },
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
            const { camera } = threeRef.current;
            if (camera) {
              camera.up.set(0, 1, 0);
              threeRef.current.rotation = { x: 0.35, y: -0.65 };
              threeRef.current.distance = 40;
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

      {/* Bottom Bar */}
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
