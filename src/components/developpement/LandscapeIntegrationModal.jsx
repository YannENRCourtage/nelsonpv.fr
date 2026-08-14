import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Structure } from '@/components/configurator/structure/Structure.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import {
  X, Check, RotateCw, ZoomIn, ZoomOut, Move,
  Sliders, RefreshCw, Eye, Download, Layers, Sparkles, Sun, Compass
} from 'lucide-react';

/**
 * Three Context Bridge to get WebGL rendering context for high-res export
 */
function LandscapeThreeBridge({ onReady, transform, sunAngle }) {
  const { gl, scene, camera } = useThree();
  const config = useConfiguratorValues();
  const targetZ = -(config.length || 30) / 2;

  useEffect(() => {
    if (onReady) onReady({ gl, scene, camera });
  }, [gl, scene, camera, onReady]);

  const sunRad = (sunAngle * Math.PI) / 180;

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[Math.cos(sunRad) * 70, 70, Math.sin(sunRad) * 70]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <Environment preset="city" />

      <PerspectiveCamera
        makeDefault
        position={[0, 6, 38]}
        fov={40}
        near={0.1}
        far={2000}
      />

      <group
        position={[transform.posX, transform.posY, transform.posZ]}
        rotation={[transform.rotX, transform.rotY, transform.rotZ]}
        scale={transform.scale}
      >
        <Structure hideBracing={true} forceHideDimensions={true} />
      </group>
    </>
  );
}

/**
 * LandscapeIntegrationModal — Incrustation 3D avec le modèle fidèle du configurateur
 */
export default function LandscapeIntegrationModal({
  isOpen,
  onClose,
  initialPhoto,
  onSaveSimulation,
}) {
  const [photoSrc, setPhotoSrc] = useState(initialPhoto || null);
  const [isSaving, setIsSaving] = useState(false);
  const config = useConfiguratorValues();

  const [transform, setTransform] = useState({
    posX: 0,
    posY: -2,
    posZ: 0,
    rotY: 0.35,
    rotX: 0.15,
    rotZ: 0.0,
    scale: 0.85,
    sunAngle: 45,
  });

  const containerRef = useRef(null);
  const threeContextRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragButtonRef = useRef(0);

  useEffect(() => {
    if (initialPhoto) setPhotoSrc(initialPhoto);
  }, [initialPhoto]);

  // Direct mouse drag controls on photo
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (e.ctrlKey || e.shiftKey || dragButtonRef.current === 2) {
      // Déplacement Translation
      setTransform(prev => ({
        ...prev,
        posX: prev.posX + dx * 0.04,
        posY: prev.posY - dy * 0.04,
      }));
    } else {
      // Rotation Orbitale
      setTransform(prev => ({
        ...prev,
        rotY: prev.rotY + dx * 0.01,
        rotX: Math.max(-0.5, Math.min(0.5, prev.rotX + dy * 0.006)),
      }));
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.15, Math.min(3.5, prev.scale * factor))
    }));
  };

  const handleSaveAndExport = async () => {
    if (!containerRef.current || !photoSrc || !threeContextRef.current) return;
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

      // 1. Fond photo du terrain
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);

      // 2. Modèle 3D rendu par Three.js
      const { gl, scene, camera } = threeContextRef.current;
      if (gl && scene && camera) {
        gl.render(scene, camera);
        ctx.drawImage(gl.domElement, 0, 0, exportCanvas.width, exportCanvas.height);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-3 pt-14">
      <div className="bg-slate-900 text-white rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Incrustation 3D du Projet Solaire sur photo de terrain (PC6)
              </h3>
              <p className="text-xs text-slate-400">
                Structure {config.width || '20.0'}m × {config.length || '30.0'}m • Glissez sur la photo pour tourner et orienter le bâtiment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualisation + Panneau */}
        <div className="flex-1 flex overflow-hidden">
          <div
            ref={containerRef}
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          >
            {photoSrc ? (
              <>
                <img
                  src={photoSrc}
                  alt="Terrain initial"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                <div className="absolute inset-0 pointer-events-none">
                  <Canvas
                    shadows
                    gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <LandscapeThreeBridge
                      onReady={(ctx) => { threeContextRef.current = ctx; }}
                      transform={transform}
                      sunAngle={transform.sunAngle}
                    />
                  </Canvas>
                </div>

                <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 pointer-events-none flex items-center gap-2">
                  <span>🖱️ <strong>Glisser souris :</strong> Faire pivoter le bâtiment (Orbital 3D)</span>
                  <span>•</span>
                  <span><strong>Ctrl + Glisser :</strong> Déplacer</span>
                  <span>•</span>
                  <span><strong>Molette :</strong> Échelle</span>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <p className="text-slate-400 text-sm">Veuillez charger une photo de terrain pour commencer l'incrustation.</p>
              </div>
            )}
          </div>

          {/* Contrôles à droite */}
          <div className="w-80 bg-slate-950/95 border-l border-slate-800 flex flex-col justify-between overflow-hidden text-xs">
            {/* Liste de contrôles avec scroll */}
            <div className="flex-1 p-5 space-y-3.5 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sliders className="w-4 h-4 text-blue-400" /> Réglages 3D
                </span>
                <button
                  onClick={() => setTransform({ posX: 0, posY: -2, posZ: 0, rotY: 0.35, rotX: 0.15, rotZ: 0, scale: 0.85, sunAngle: 45 })}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Réinitialiser
                </button>
              </div>

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

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-blue-400" /> Azimut (Rotation 360°)</span>
                  <span className="text-blue-400 font-bold">{Math.round((transform.rotY * 180) / Math.PI)}°</span>
                </div>
                <input
                  type="range" min="-3.14" max="3.14" step="0.05"
                  value={transform.rotY}
                  onChange={e => setTransform(t => ({ ...t, rotY: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span>Inclinaison Terrain</span>
                  <span className="text-blue-400 font-bold">{Math.round((transform.rotX * 180) / Math.PI)}°</span>
                </div>
                <input
                  type="range" min="-0.5" max="0.5" step="0.02"
                  value={transform.rotX}
                  onChange={e => setTransform(t => ({ ...t, rotX: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span>Position Horizontale (X)</span>
                  <span className="text-blue-400 font-bold">{transform.posX.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min="-30" max="30" step="0.5"
                  value={transform.posX}
                  onChange={e => setTransform(t => ({ ...t, posX: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

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

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-400" /> Ensoleillement & Ombres</span>
                  <span className="text-amber-400 font-bold">{transform.sunAngle}°</span>
                </div>
                <input
                  type="range" min="0" max="360" step="5"
                  value={transform.sunAngle}
                  onChange={e => setTransform(t => ({ ...t, sunAngle: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 text-[10.5px] font-bold block mb-2 uppercase">Vues d'orientation</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setTransform(t => ({ ...t, rotY: 0 }))}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200 transition-colors"
                  >
                    Pignon Est
                  </button>
                  <button
                    onClick={() => setTransform(t => ({ ...t, rotY: -Math.PI / 2 }))}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200 transition-colors"
                  >
                    Façade Sud
                  </button>
                  <button
                    onClick={() => setTransform(t => ({ ...t, rotY: 0.5 }))}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200 transition-colors"
                  >
                    Perspective 3/4
                  </button>
                  <button
                    onClick={() => setTransform(t => ({ ...t, rotY: Math.PI / 2 }))}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10.5px] font-bold text-slate-200 transition-colors"
                  >
                    Façade Nord
                  </button>
                </div>
              </div>
            </div>

            {/* Bouton ancré strictement en bas à droite de la fenêtre */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex-shrink-0">
              <button
                onClick={handleSaveAndExport}
                disabled={isSaving || !photoSrc}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Génération de la PC6...' : 'Valider & Sauvegarder PC6'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
