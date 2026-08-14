import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
  X, Check, RotateCw, ZoomIn, ZoomOut, Move,
  Sliders, RefreshCw, Eye, Download, Layers, Sparkles, Sun, Compass
} from 'lucide-react';

/**
 * LandscapeIntegrationModal — Incrustation 3D interactive sur photo de terrain (PC6)
 * Injecte directement le modèle 3D du bâtiment / ombrière configuré en sur-imposition sur la photo de terrain.
 * L'utilisateur peut déplacer, orienter, incliner et redimensionner le bâtiment librement sur la photo.
 */
export default function LandscapeIntegrationModal({
  isOpen,
  onClose,
  initialPhoto,
  projectDimensions = {},
  installationType = 'batiment_solaire',
  onSaveSimulation,
}) {
  const [photoSrc, setPhotoSrc] = useState(initialPhoto || null);
  const [isSaving, setIsSaving] = useState(false);

  // Paramètres de transformation 3D du bâtiment sur la photo
  const [transform, setTransform] = useState({
    posX: 0,       // Déplacement horizontal (-50 à 50)
    posY: -2,      // Déplacement vertical / altitude (-30 à 30)
    posZ: 0,       // Profondeur (-50 à 50)
    rotY: 0.35,    // Orientation Azimut (0 à 2*PI)
    rotX: 0.05,    // Inclinaison perspective Pitch (-0.5 à 0.5)
    rotZ: 0.0,     // Dévers Roll (-0.3 à 0.3)
    scale: 1.0,    // Échelle / Taille du bâtiment (0.2 à 3.0)
    sunAngle: 45,  // Angle de la lumière solaire (ombres)
  });

  const containerRef = useRef(null);
  const canvas3DRef = useRef(null);
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    buildingGroup: null,
    dirLight: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    animationId: null
  });

  useEffect(() => {
    if (initialPhoto) setPhotoSrc(initialPhoto);
  }, [initialPhoto]);

  // Initialisation et boucle de rendu Three.js
  useEffect(() => {
    if (!isOpen || !photoSrc || !canvas3DRef.current) return;
    const canvas = canvas3DRef.current;
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;

    // 1. Scene transparente
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000);
    camera.position.set(0, 5, 38);
    camera.lookAt(0, 3, 0);

    // 3. Renderer avec canal alpha transparent
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lumières réalistes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.6);
    dirLight.position.set(40, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.5);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // 5. Plan d'ombres portées sous le bâtiment (Shadow Catcher discret)
    const shadowPlaneGeo = new THREE.PlaneGeometry(120, 120);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.05;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 6. Modélisation 3D exacte du bâtiment / ombrière configuré
    const buildingGroup = new THREE.Group();

    const lg = Number(projectDimensions.longueur || 30.0);
    const lr = Number(projectDimensions.largeur || 18.6);
    const ht = Number(projectDimensions.hauteur_egout || 4.0);
    const penteDeg = Number(projectDimensions.pente || 15);
    const ridgeHt = ht + lr * Math.tan((penteDeg * Math.PI) / 180);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });
    const rafterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.15, metalness: 0.85 });

    const halfL = lg / 2;
    const halfW = lr / 2;
    const bayCount = Math.max(3, Math.round(lg / 6));
    const baySpacing = lg / bayCount;

    // Portiques métalliques
    for (let i = 0; i <= bayCount; i++) {
      const z = -halfL + i * baySpacing;

      // Poteau Bas (Egout)
      const postBas = new THREE.Mesh(new THREE.BoxGeometry(0.35, ht, 0.35), postMat);
      postBas.position.set(-halfW, ht / 2, z);
      postBas.castShadow = true;
      buildingGroup.add(postBas);

      // Poteau Haut (Faîtage)
      const postHaut = new THREE.Mesh(new THREE.BoxGeometry(0.35, ridgeHt, 0.35), postMat);
      postHaut.position.set(halfW, ridgeHt / 2, z);
      postHaut.castShadow = true;
      buildingGroup.add(postHaut);

      // Traverse / Arbalétrier
      const rafterLen = Math.sqrt(Math.pow(lr, 2) + Math.pow(ridgeHt - ht, 2));
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(rafterLen, 0.25, 0.2), rafterMat);
      rafter.position.set(0, (ht + ridgeHt) / 2, z);
      rafter.rotation.z = Math.atan2(ridgeHt - ht, lr);
      rafter.castShadow = true;
      buildingGroup.add(rafter);
    }

    // Toiture et Panneaux photovoltaïques
    const roofLen = Math.sqrt(Math.pow(lr, 2) + Math.pow(ridgeHt - ht, 2)) + 0.4;
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(roofLen, 0.08, lg + 0.4), rafterMat);
    roofMesh.position.set(0, (ht + ridgeHt) / 2 + 0.1, 0);
    roofMesh.rotation.z = Math.atan2(ridgeHt - ht, lr);
    roofMesh.castShadow = true;
    buildingGroup.add(roofMesh);

    // Panneaux Solaires Bleus
    const solarArray = new THREE.Mesh(new THREE.BoxGeometry(roofLen - 0.2, 0.04, lg - 0.2), solarMat);
    solarArray.position.set(0, (ht + ridgeHt) / 2 + 0.16, 0);
    solarArray.rotation.z = Math.atan2(ridgeHt - ht, lr);
    solarArray.castShadow = true;
    buildingGroup.add(solarArray);

    scene.add(buildingGroup);

    threeRef.current = {
      scene,
      camera,
      renderer,
      buildingGroup,
      dirLight,
      shadowPlane,
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    };

    // Animation Loop
    const animate = () => {
      threeRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const nw = containerRef.current.clientWidth;
      const nh = containerRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(threeRef.current.animationId);
      renderer.dispose();
    };
  }, [isOpen, photoSrc, projectDimensions]);

  // Synchronisation continue des paramètres de transformation
  useEffect(() => {
    const { buildingGroup, shadowPlane, dirLight } = threeRef.current;
    if (!buildingGroup) return;

    buildingGroup.position.set(transform.posX, transform.posY, transform.posZ);
    buildingGroup.rotation.set(transform.rotX, transform.rotY, transform.rotZ);
    buildingGroup.scale.set(transform.scale, transform.scale, transform.scale);

    if (shadowPlane) {
      shadowPlane.position.set(transform.posX, transform.posY - 0.05, transform.posZ);
      shadowPlane.rotation.z = transform.rotY;
    }

    if (dirLight) {
      const rad = (transform.sunAngle * Math.PI) / 180;
      dirLight.position.set(Math.cos(rad) * 60, 60, Math.sin(rad) * 60);
    }
  }, [transform]);

  // Interaction Drag à la souris sur la photo
  const handleMouseDown = (e) => {
    threeRef.current.isDragging = true;
    threeRef.current.dragStart = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!threeRef.current.isDragging) return;
    const dx = e.clientX - threeRef.current.dragStart.x;
    const dy = e.clientY - threeRef.current.dragStart.y;

    setTransform(prev => ({
      ...prev,
      posX: prev.posX + dx * 0.04,
      posY: prev.posY - dy * 0.04,
    }));

    threeRef.current.dragStart = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    threeRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.15, Math.min(3.5, prev.scale * factor))
    }));
  };

  // Exportation Haute Résolution de l'image finale
  const handleSaveAndExport = async () => {
    if (!containerRef.current || !photoSrc) return;
    setIsSaving(true);

    try {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width * 2;
      exportCanvas.height = height * 2;
      const ctx = exportCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Dessiner la photo de terrain en fond
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);

      // 2. Dessiner le rendu 3D du bâtiment par-dessus
      const { renderer, scene, camera } = threeRef.current;
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
        ctx.drawImage(renderer.domElement, 0, 0, exportCanvas.width, exportCanvas.height);
      }

      const finalDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      if (onSaveSimulation) {
        onSaveSimulation(finalDataUrl);
      }
      onClose();
    } catch (e) {
      console.error('Erreur export insertion 3D:', e);
      alert('Erreur lors de la sauvegarde de l’image.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-3">
      <div className="bg-slate-900 text-white rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Incrustation 3D du Projet Solaire sur photo de terrain (PC6)
              </h3>
              <p className="text-xs text-slate-400">
                Structure {projectDimensions.largeur || '18.6'}m × {projectDimensions.longueur || '30.0'}m • Déplacez et ajustez le modèle librement sur le terrain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAndExport}
              disabled={isSaving || !photoSrc}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Génération de la PC6...' : 'Valider & Sauvegarder PC6'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps principal : Photo + Canvas 3D superposé + Panneau de réglages */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ZONE DE VISUALISATION (PHOTO + 3D OVERLAY) */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden select-none cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            {photoSrc ? (
              <>
                {/* Photo de fond */}
                <img
                  src={photoSrc}
                  alt="Terrain initial"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                {/* Canvas Three.js transparent superposé */}
                <canvas
                  ref={canvas3DRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Badge d'aide contextuelle */}
                <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 pointer-events-none">
                  🖱️ Glissez pour déplacer le bâtiment • Molette pour ajuster la taille / échelle
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <p className="text-slate-400 text-sm">Veuillez charger une photo de terrain pour commencer l'incrustation.</p>
              </div>
            )}
          </div>

          {/* PANNEAU DE CONTRÔLE DES AXES & TRANSFORMATIONS */}
          <div className="w-80 bg-slate-950/95 border-l border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Sliders className="w-4 h-4 text-blue-400" /> Réglages du modèle 3D
              </span>
              <button
                onClick={() => setTransform({ posX: 0, posY: -2, posZ: 0, rotY: 0.35, rotX: 0.05, rotZ: 0, scale: 1.0, sunAngle: 45 })}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                title="Réinitialiser la position"
              >
                <RefreshCw className="w-3 h-3" /> Réinitialiser
              </button>
            </div>

            {/* 1. Taille / Échelle */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                <span>Taille / Échelle</span>
                <span className="text-blue-400 font-bold">{Math.round(transform.scale * 100)}%</span>
              </div>
              <input
                type="range" min="0.2" max="3.0" step="0.05"
                value={transform.scale}
                onChange={e => setTransform(t => ({ ...t, scale: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 2. Orientation Azimut (Rotation Y) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-blue-400" /> Azimut / Orientation</span>
                <span className="text-blue-400 font-bold">{Math.round((transform.rotY * 180) / Math.PI)}°</span>
              </div>
              <input
                type="range" min="-3.14" max="3.14" step="0.05"
                value={transform.rotY}
                onChange={e => setTransform(t => ({ ...t, rotY: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 3. Inclinaison Terrain / Perspective (Pitch) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                <span>Inclinaison Terrain (Pente)</span>
                <span className="text-blue-400 font-bold">{Math.round((transform.rotX * 180) / Math.PI)}°</span>
              </div>
              <input
                type="range" min="-0.5" max="0.5" step="0.02"
                value={transform.rotX}
                onChange={e => setTransform(t => ({ ...t, rotX: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 4. Dévers latéral (Roll) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                <span>Dévers latéral</span>
                <span className="text-blue-400 font-bold">{Math.round((transform.rotZ * 180) / Math.PI)}°</span>
              </div>
              <input
                type="range" min="-0.3" max="0.3" step="0.02"
                value={transform.rotZ}
                onChange={e => setTransform(t => ({ ...t, rotZ: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 5. Hauteur / Élévation */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                <span>Hauteur sol (Altitude)</span>
                <span className="text-blue-400 font-bold">{transform.posY.toFixed(1)} m</span>
              </div>
              <input
                type="range" min="-20" max="20" step="0.5"
                value={transform.posY}
                onChange={e => setTransform(t => ({ ...t, posY: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 6. Ensoleillement & Ombres */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-400" /> Angle du Soleil</span>
                <span className="text-amber-400 font-bold">{transform.sunAngle}°</span>
              </div>
              <input
                type="range" min="0" max="360" step="5"
                value={transform.sunAngle}
                onChange={e => setTransform(t => ({ ...t, sunAngle: parseInt(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Boutons d'angles rapides */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-400 text-[10.5px] font-bold block mb-2 uppercase">Vues rapides</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTransform(t => ({ ...t, rotY: 0 }))}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200"
                >
                  Face
                </button>
                <button
                  onClick={() => setTransform(t => ({ ...t, rotY: Math.PI / 2 }))}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200"
                >
                  Pignon
                </button>
                <button
                  onClick={() => setTransform(t => ({ ...t, rotY: 0.5 }))}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200"
                >
                  3/4 Droit
                </button>
                <button
                  onClick={() => setTransform(t => ({ ...t, rotY: -0.5 }))}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200"
                >
                  3/4 Gauche
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
