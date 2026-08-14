import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Camera, RotateCw, ZoomIn, Box, Sparkles, Check, RefreshCw, Eye, Layers } from 'lucide-react';

/**
 * Building3DViewer — Visionneuse 3D interactive fidèle à 100% au bâtiment configuré
 * Directive 1 : Persistance intégrale des paramètres (Asymétrique, Symétrique, Monopente, Ombrière, Travées, Auvents, etc.)
 * Directive 3 : Angles de caméra corrigés pour cibler le VRAI Sud, Nord, Est, Ouest et Toiture
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
  const buildingType = buildingConfig.buildingType || buildingConfig.type || 'asymetrique_1';
  const leftSide = buildingConfig.leftSide || 'none';
  const rightSide = buildingConfig.rightSide || 'none';

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 600;
    const h = height;

    // 1. Scene avec fond neutre sans quadrillage
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 1000);
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

    // 5. Sol / Shadow Catcher discret (sans quadrillage)
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // 6. Construction 3D Bâtiment / Structure exacte
    const meshGroup = new THREE.Group();

    // Matériaux métalliques et photovoltaïques
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

    // Calcul géométrie selon type (Symétrique, Asymétrique, Monopente, Ombrière)
    const isAsym = buildingType.includes('asymetrique');
    const isSym = buildingType === 'symetrique';
    const isMonopente = buildingType === 'monopente';
    const isOmbriere = buildingType.includes('ombriere');

    // Positions de faîtage et égout
    let ridgeX = 0;
    let ridgeHeight = eaveHeight + (width / 2) * Math.tan((pitchDeg * Math.PI) / 180);
    let eaveLeftH = eaveHeight;
    let eaveRightH = eaveHeight;

    if (isAsym) {
      ridgeX = width * 0.2; // Faîtage décalé
      ridgeHeight = eaveHeight + (width * 0.7) * Math.tan((pitchDeg * Math.PI) / 180);
      eaveRightH = Math.max(3.0, eaveHeight - 0.5);
    } else if (isMonopente) {
      ridgeX = halfW;
      ridgeHeight = eaveHeight + width * Math.tan((pitchDeg * Math.PI) / 180);
      eaveLeftH = eaveHeight;
      eaveRightH = ridgeHeight;
    } else if (isOmbriere) {
      ridgeX = 0;
      ridgeHeight = eaveHeight + 0.8;
      eaveLeftH = eaveHeight;
      eaveRightH = eaveHeight - 0.4;
    }

    // Portiques métalliques le long de la longueur Z
    for (let i = 0; i <= bayCount; i++) {
      const z = -halfL + i * baySpacing;

      // Poteau Gauche / Sud
      const postGGeo = new THREE.BoxGeometry(0.35, eaveLeftH, 0.35);
      const postG = new THREE.Mesh(postGGeo, steelMat);
      postG.position.set(-halfW, eaveLeftH / 2, z);
      postG.castShadow = true;
      meshGroup.add(postG);

      // Poteau Droit / Nord
      const postDGeo = new THREE.BoxGeometry(0.35, eaveRightH, 0.35);
      const postD = new THREE.Mesh(postDGeo, steelMat);
      postD.position.set(halfW, eaveRightH / 2, z);
      postD.castShadow = true;
      meshGroup.add(postD);

      // Poteau central sous faîtage si grande portée
      if (width > 22 && !isMonopente) {
        const postC = new THREE.Mesh(new THREE.BoxGeometry(0.3, ridgeHeight, 0.3), steelMat);
        postC.position.set(ridgeX, ridgeHeight / 2, z);
        postC.castShadow = true;
        meshGroup.add(postC);
      }

      // Arbalétrier versant Sud (Gauche -> Faîtage)
      const lenSud = Math.sqrt(Math.pow(ridgeX - (-halfW), 2) + Math.pow(ridgeHeight - eaveLeftH, 2));
      const rafterSud = new THREE.Mesh(new THREE.BoxGeometry(lenSud, 0.25, 0.2), steelMat);
      rafterSud.position.set((-halfW + ridgeX) / 2, (eaveLeftH + ridgeHeight) / 2, z);
      rafterSud.rotation.z = Math.atan2(ridgeHeight - eaveLeftH, ridgeX - (-halfW));
      rafterSud.castShadow = true;
      meshGroup.add(rafterSud);

      // Arbalétrier versant Nord (Faîtage -> Droite)
      if (!isMonopente) {
        const lenNord = Math.sqrt(Math.pow(halfW - ridgeX, 2) + Math.pow(ridgeHeight - eaveRightH, 2));
        const rafterNord = new THREE.Mesh(new THREE.BoxGeometry(lenNord, 0.25, 0.2), steelMat);
        rafterNord.position.set((ridgeX + halfW) / 2, (ridgeHeight + eaveRightH) / 2, z);
        rafterNord.rotation.z = Math.atan2(eaveRightH - ridgeHeight, halfW - ridgeX);
        rafterNord.castShadow = true;
        meshGroup.add(rafterNord);
      }

      // Extension AUVENT / APPENTIS si configurée
      if (rightSide === 'auvent' || rightSide === 'appentis') {
        const extLen = 4.0;
        const rafterExt = new THREE.Mesh(new THREE.BoxGeometry(extLen, 0.2, 0.15), steelMat);
        rafterExt.position.set(halfW + extLen / 2, eaveRightH - 0.2, z);
        rafterExt.rotation.z = -0.15;
        meshGroup.add(rafterExt);

        if (rightSide === 'appentis') {
          const postExt = new THREE.Mesh(new THREE.BoxGeometry(0.3, eaveRightH - 0.8, 0.3), steelMat);
          postExt.position.set(halfW + extLen, (eaveRightH - 0.8) / 2, z);
          meshGroup.add(postExt);
        }
      }
    }

    // Couverture photovoltaïque Toiture Versant Sud (Principal)
    const lenSudRoof = Math.sqrt(Math.pow(ridgeX - (-halfW), 2) + Math.pow(ridgeHeight - eaveLeftH, 2)) + 0.4;
    const roofSud = new THREE.Mesh(new THREE.BoxGeometry(lenSudRoof, 0.08, length + 0.4), panelMat);
    roofSud.position.set((-halfW + ridgeX) / 2, (eaveLeftH + ridgeHeight) / 2 + 0.1, 0);
    roofSud.rotation.z = Math.atan2(ridgeHeight - eaveLeftH, ridgeX - (-halfW));
    roofSud.castShadow = true;
    roofSud.receiveShadow = true;
    meshGroup.add(roofSud);

    // Lignes de séparation de panneaux photovoltaïques
    const gridTextureMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true, opacity: 0.35, transparent: true });
    const wireRoofSud = new THREE.Mesh(new THREE.BoxGeometry(lenSudRoof, 0.08, length + 0.4), gridTextureMat);
    wireRoofSud.position.set((-halfW + ridgeX) / 2, (eaveLeftH + ridgeHeight) / 2 + 0.11, 0);
    wireRoofSud.rotation.z = Math.atan2(ridgeHeight - eaveLeftH, ridgeX - (-halfW));
    meshGroup.add(wireRoofSud);

    // Couverture versant Nord (si bi-pente)
    if (!isMonopente) {
      const lenNordRoof = Math.sqrt(Math.pow(halfW - ridgeX, 2) + Math.pow(ridgeHeight - eaveRightH, 2)) + 0.4;
      const roofNord = new THREE.Mesh(new THREE.BoxGeometry(lenNordRoof, 0.08, length + 0.4), steelMat);
      roofNord.position.set((ridgeX + halfW) / 2, (ridgeHeight + eaveRightH) / 2 + 0.1, 0);
      roofNord.rotation.z = Math.atan2(eaveRightH - ridgeHeight, halfW - ridgeX);
      roofNord.castShadow = true;
      meshGroup.add(roofNord);
    }

    // Gouttière sablière Sud
    const gutterSud = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, length + 0.6), gutterMat);
    gutterSud.position.set(-halfW - 0.15, eaveLeftH, 0);
    meshGroup.add(gutterSud);

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

  // ── DIRECTIVE 3 : CORRECTION EXACTE DES ANGLES DE CAMÉRA ────────────────────
  // Le bâtiment a sa longueur sur Z et sa largeur sur X (Sud = -X, Nord = +X, Est = +Z, Ouest = -Z)
  const CAMERA_PRESETS = {
    // 1. Vrai Sud (Long pan avant / Sablière basse) : Caméra sur l'axe -X regardant vers +X
    facade_sud: { rotation: { x: 0.10, y: -Math.PI / 2 }, distance: Math.max(length, width) * 1.35, label: 'Façade Sud' },
    
    // 2. Vrai Nord (Long pan arrière / Faîtage) : Caméra sur l'axe +X regardant vers -X
    facade_nord: { rotation: { x: 0.10, y: Math.PI / 2 }, distance: Math.max(length, width) * 1.35, label: 'Façade Nord' },
    
    // 3. Vrai Est (Pignon gauche) : Caméra sur l'axe +Z regardant vers -Z
    facade_est: { rotation: { x: 0.10, y: 0 }, distance: Math.max(length, width) * 1.25, label: 'Façade Est' },
    
    // 4. Vrai Ouest (Pignon droit) : Caméra sur l'axe -Z regardant vers +Z
    facade_ouest: { rotation: { x: 0.10, y: Math.PI }, distance: Math.max(length, width) * 1.25, label: 'Façade Ouest' },
    
    // 5. Vue Couverture (Toiture orientée paysage horizontalement de gauche à droite)
    vue_couverture: { rotation: { x: Math.PI / 2 - 0.01, y: 0 }, distance: Math.max(length, width) * 1.5, label: 'Vue Toiture (Paysage)' },
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

  // Capture Snapshot HD de la vue active
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
      await new Promise(r => setTimeout(r, 150));
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
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs flex flex-col ${className}`}>
      {/* Canvas 3D */}
      <div ref={mountRef} style={{ width: '100%', height }} className="cursor-grab active:cursor-grabbing flex-1 bg-white" />

      {/* Top Bar : Sélecteur des 5 angles avec correction Sud/Nord/Est/Ouest */}
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

      {/* Bottom Bar : Actions de capture */}
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
