import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Trash2, RotateCcw, MousePointer, Edit3, Box, Eye,
  Layers, Sun, Sparkles, Upload, Image as ImageIcon, Sliders
} from 'lucide-react';
import * as THREE from 'three';

/**
 * LandscapeIntegrationModal — Module d'intégration paysagère interactive (PCMI 6 / DP 6)
 * Permet de dessiner l'emprise au sol (polygone vectoriel) sur la photo d'état initial (Avant),
 * d'ajuster la perspective et d'y incruster le modèle 3D du bâtiment / ombrière solaire avec ombres portées.
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
  const [mode, setMode] = useState('draw'); // 'draw', 'select', '3d'
  const [points, setPoints] = useState([]); // Points normalisés [{ x: 0..1, y: 0..1 }]
  const [fillColor, setFillColor] = useState('#ef4444');
  const [fillOpacity, setFillOpacity] = useState(0.5);
  const [activePointIndex, setActivePointIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // References DOM
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const threeCanvasRef = useRef(null);

  // Three.js instances ref
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    buildingGroup: null,
    light: null,
  });

  useEffect(() => {
    if (initialPhoto) setPhotoSrc(initialPhoto);
  }, [initialPhoto]);

  // Réinitialisation de la modale à l'ouverture
  useEffect(() => {
    if (isOpen) {
      if (!points || points.length === 0) {
        // Exemples de 4 points par défaut formant un trapèze en perspective au sol
        setPoints([
          { x: 0.25, y: 0.75 },
          { x: 0.75, y: 0.75 },
          { x: 0.65, y: 0.55 },
          { x: 0.35, y: 0.55 },
        ]);
      }
    }
  }, [isOpen]);

  // Téléversement d'une nouvelle photo de terrain
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPhotoSrc(event.target.result);
    reader.readAsDataURL(file);
  };

  // Clic sur l'image pour placer un point en mode 'draw'
  const handleContainerClick = (e) => {
    if (mode !== 'draw' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (points.length < 8) {
      setPoints(prev => [...prev, { x, y }]);
    }
  };

  // Gestion du glisser-déplacer des sommets du polygone
  const handlePointMouseDown = (idx, e) => {
    e.stopPropagation();
    setActivePointIndex(idx);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || activePointIndex === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setPoints(prev => {
      const copy = [...prev];
      copy[activePointIndex] = { x, y };
      return copy;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActivePointIndex(null);
  };

  // Effacer tous les points
  const handleClearDrawing = () => {
    setPoints([]);
  };

  // ── 3D Scene Initialization & Perspective Matching (Three.js) ─────────────
  useEffect(() => {
    if (mode !== '3d' || !threeCanvasRef.current || !containerRef.current) return;

    const canvas = threeCanvasRef.current;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 12, 25);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(15, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 3. Shadow Catcher Plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(100, 100);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 4. Procedural 3D Building / Ombrière
    const buildingGroup = new THREE.Group();

    const lg = Number(projectDimensions.longueur || 20);
    const lr = Number(projectDimensions.largeur || 10);
    const ht = Number(projectDimensions.hauteur_egout || 5);

    // Poteaux métalliques
    const postGeo = new THREE.BoxGeometry(0.3, ht, 0.3);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });

    const corners = [
      [-lg / 2, -lr / 2],
      [lg / 2, -lr / 2],
      [lg / 2, lr / 2],
      [-lg / 2, lr / 2],
    ];

    corners.forEach(([cx, cz]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(cx, ht / 2, cz);
      post.castShadow = true;
      buildingGroup.add(post);
    });

    // Toiture & Panneaux Solaires
    const roofGeo = new THREE.BoxGeometry(lg + 0.6, 0.2, lr + 0.6);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, ht + 0.1, 0);
    roof.rotation.x = Math.PI / 12; // Pente de toiture
    roof.castShadow = true;
    buildingGroup.add(roof);

    // Grille de panneaux photovoltaïques bleus
    const solarGeo = new THREE.BoxGeometry(lg, 0.05, lr);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const solarArray = new THREE.Mesh(solarGeo, solarMat);
    solarArray.position.set(0, ht + 0.22, 0);
    solarArray.rotation.x = Math.PI / 12;
    solarArray.castShadow = true;
    buildingGroup.add(solarArray);

    scene.add(buildingGroup);

    // 5. Alignement de la caméra d'après les 4 sommets du polygone 2D
    if (points.length >= 4) {
      // Calcul du centre et de l'inclinaison de l'emprise dessinée
      const avgX = points.reduce((acc, p) => acc + p.x, 0) / points.length;
      const avgY = points.reduce((acc, p) => acc + p.y, 0) / points.length;

      const topWidth = Math.abs(points[2].x - points[3].x);
      const botWidth = Math.abs(points[1].x - points[0].x);
      const heightSpread = Math.abs(points[0].y - points[3].y);

      // Calcul de la rotation et du recul caméra
      const rotY = (avgX - 0.5) * 0.8;
      const pitch = (avgY - 0.5) * 0.6;
      const scaleFactor = Math.max(0.5, (botWidth + topWidth) * 1.5);

      buildingGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
      buildingGroup.position.set((avgX - 0.5) * 20, 0, (avgY - 0.5) * 10);
      buildingGroup.rotation.y = rotY;
    }

    threeRef.current = { scene, camera, renderer, buildingGroup, light: dirLight };

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [mode, points, projectDimensions]);

  // Exportation & Fusion de l'image finale
  const handleSaveAndExport = async () => {
    if (!containerRef.current) return;
    setIsSaving(true);

    try {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width * 2;
      exportCanvas.height = height * 2;
      const ctx = exportCanvas.getContext('2d');

      ctx.scale(2, 2);

      // 1. Dessiner la photo de fond
      if (imgRef.current) {
        ctx.drawImage(imgRef.current, 0, 0, width, height);
      }

      // 2. Dessiner le polygone 2D ou le rendu WebGL 3D
      if (mode === '3d' && threeRef.current.renderer) {
        ctx.drawImage(threeRef.current.renderer.domElement, 0, 0, width, height);
      } else if (points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x * width, points[0].y * height);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * width, points[i].y * height);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = fillOpacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const mergedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      onSaveSimulation(mergedDataUrl);
      onClose();
    } catch (err) {
      console.error('Erreur export simulation paysagère:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col"
          style={{ maxHeight: '94vh' }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                PC6
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Intégration Paysagère Interactive (Emprise & 3D)</h3>
                <p className="text-xs text-gray-500">Dessinez l'emprise au sol du projet pour l'incruster en 3D sur la photo d'état initial.</p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barre de contrôle supérieure (Urbassist style) */}
          <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3">
            {/* Outillage Mode */}
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setMode('draw')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'draw' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Tracer Forme (2D)
              </button>

              <button
                onClick={() => setMode('select')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'select' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" /> Sélection / Ajuster
              </button>

              <button
                onClick={() => setMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === '3d' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" /> Incrustation 3D
              </button>
            </div>

            {/* Contrôle Couleur & Opacité du fond */}
            {mode !== '3d' && (
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-300">
                <div className="flex items-center gap-2">
                  <span>Couleur fond :</span>
                  <input
                    type="color"
                    value={fillColor}
                    onChange={e => setFillColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border-none cursor-pointer bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span>Opacité fond :</span>
                  <input
                    type="range" min="0.1" max="1" step="0.05"
                    value={fillOpacity}
                    onChange={e => setFillOpacity(parseFloat(e.target.value))}
                    className="w-24 accent-blue-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleClearDrawing}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Effacer
                </button>
              </div>
            )}

            {/* Importer nouvelle photo */}
            <label className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              Changer photo terrain
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Zone de travail (Canvas & Image) */}
          <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
            {photoSrc ? (
              <div
                ref={containerRef}
                onClick={handleContainerClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="relative rounded-2xl overflow-hidden shadow-2xl max-w-full max-h-full"
                style={{ aspectRatio: '16 / 9', width: '100%', maxHeight: '540px' }}
              >
                {/* Photo de fond */}
                <img
                  ref={imgRef}
                  src={photoSrc}
                  alt="Terrain"
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Calque WebGL 3D */}
                {mode === '3d' && (
                  <canvas ref={threeCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                )}

                {/* Calque SVG Polygone 2D Vectoriel */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {points.length > 0 && (
                    <polygon
                      points={points.map(p => `${p.x * 100}%,${p.y * 100}%`).join(' ')}
                      fill={fillColor}
                      fillOpacity={fillOpacity}
                      stroke="#dc2626"
                      strokeWidth="2.5"
                    />
                  )}
                </svg>

                {/* Sommets déplaçables */}
                {points.map((p, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => handlePointMouseDown(idx, e)}
                    className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-white border-2 border-red-600 shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center text-[9px] font-bold text-red-600 hover:scale-125 transition-transform"
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-slate-700 rounded-3xl cursor-pointer hover:border-blue-500 transition-colors">
                <ImageIcon className="w-10 h-10 text-slate-500 mb-2" />
                <span className="text-sm font-bold text-slate-300">Importer une photo du terrain (État initial)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-500">
              {mode === '3d'
                ? "Le modèle 3D du bâtiment est incrusté et ancré sur l'emprise au sol dessinée."
                : "Cliquez sur la photo pour placer les sommets de l'emprise au sol de votre bâtiment."}
            </p>

            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800">
                Annuler
              </button>
              <button
                onClick={handleSaveAndExport}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> Valider & Injecter dans le PDF PC6
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
