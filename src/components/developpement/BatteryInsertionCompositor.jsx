import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import BatteryStation3DModel from './BatteryStation3DModel';
import {
  X, Check, RotateCw, ZoomIn, ZoomOut, Move,
  Sliders, RefreshCw, Eye, Download, Layers, Sparkles, Sun, Compass,
  Battery, Upload, Shield
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

/**
 * Three Context Bridge pour l'incrustation paysagère 3D de la Station Batteries
 */
function BatteryLandscapeThreeBridge({ onReady, transform, sunAngle, batteryConfig }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (onReady) onReady({ gl, scene, camera });
  }, [gl, scene, camera, onReady]);

  const sunRad = (sunAngle * Math.PI) / 180;
  const dLen = Number(batteryConfig?.dalleLength || 6.20);
  const dWid = Number(batteryConfig?.dalleWidth || 3.20);
  const qty = Number(batteryConfig?.quantity || 4);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[Math.cos(sunRad) * 60, 50, Math.sin(sunRad) * 60]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <directionalLight
        position={[-Math.cos(sunRad) * 30, 20, -Math.sin(sunRad) * 30]}
        intensity={0.8}
      />
      <Environment preset="city" />

      <PerspectiveCamera
        makeDefault
        position={[0, 4.5, Math.max(14, transform.posZ + 14)]}
        fov={40}
        near={0.1}
        far={2000}
      />

      <group
        position={[transform.posX, transform.posY, transform.posZ]}
        rotation={[transform.rotX, transform.rotY, transform.rotZ]}
        scale={transform.scale}
      >
        <BatteryStation3DModel
          dalleLength={dLen}
          dalleWidth={dWid}
          cabinetCount={qty}
          showFence={transform.showFence}
          showSlab={transform.showSlab}
          opacity={transform.opacity}
        />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.6 * transform.opacity}
          scale={10}
          blur={1.6}
          far={3}
        />
      </group>
    </>
  );
}

/**
 * BatteryInsertionCompositor — Incrustation Paysagère 3D Interactive (DP6 / PC6)
 * Grand conteneur UI plein format, modèle 3D plein et réaliste (Dalle + 4 Batteries + Clôture),
 * et contrôles 3D complets (Échelle, Azimut, X, Y, Z, Opacité, Soleil).
 */
export default function BatteryInsertionCompositor({
  isOpen,
  onClose,
  initialPhoto,
  batteryConfig = {},
  onSaveSimulation,
  docType = 'DP6'
}) {
  const [photoSrc, setPhotoSrc] = useState(initialPhoto || null);
  const [isSaving, setIsSaving] = useState(false);

  // Contrôles 3D interactifs
  const [transform, setTransform] = useState({
    posX: 0,
    posY: -0.8,
    posZ: 0,
    rotY: 0.35,     // Azimut
    rotX: 0.12,     // Inclinaison verticale
    rotZ: 0.0,
    scale: 0.85,
    opacity: 1.0,
    sunAngle: 45,
    showFence: true,
    showSlab: true,
  });

  const containerRef = useRef(null);
  const threeContextRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragButtonRef = useRef(0);

  useEffect(() => {
    if (initialPhoto) setPhotoSrc(initialPhoto);
  }, [initialPhoto]);

  // Manipulation directe à la souris sur la photo
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
      // Translation X / Y
      setTransform(prev => ({
        ...prev,
        posX: prev.posX + dx * 0.025,
        posY: prev.posY - dy * 0.025,
      }));
    } else {
      // Rotation Orbitale / Azimut
      setTransform(prev => ({
        ...prev,
        rotY: prev.rotY + dx * 0.01,
        rotX: Math.max(-0.4, Math.min(0.5, prev.rotX + dy * 0.005)),
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
      scale: Math.max(0.2, Math.min(3.0, prev.scale * factor))
    }));
  };

  // Upload d'une nouvelle photo de terrain
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPhotoSrc(event.target.result);
    reader.readAsDataURL(file);
  };

  // Sauvegarde composite haute résolution (Photo + Modèle 3D)
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
      toast({
        title: "Insertion 3D enregistrée",
        description: `La pièce ${docType} a été mise à jour avec succès.`
      });
      onClose();
    } catch (e) {
      console.error('Erreur export insertion 3D batterie:', e);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible d'exporter l'image d'insertion 3D.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-[1450px] h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* EN-TÊTE DE LA MODALE */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                Incrustation Paysagère 3D — Station Batteries Stand-Alone
                <span className="text-[10px] bg-purple-600/40 text-purple-300 border border-purple-500/50 px-2 py-0.5 rounded-full font-bold">
                  {docType} &bull; 4× CESC Mercury 261 (500 kW)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Ajustez l'échelle, l'orientation et la position de la station sur la photo réelle de terrain.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700">
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Changer la photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ZONE CENTRALE : VISUALISATION PHOTO + CANVAS 3D & PANNEAU LATÉRAL */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Cadre de simulation sur photo (agrandi au format maximal) */}
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
                {/* Photo de fond réelle */}
                <img
                  src={photoSrc}
                  alt="Photo de terrain"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                {/* Scène 3D Three.js transparente superposée */}
                <div className="absolute inset-0 pointer-events-none">
                  <Canvas
                    shadows
                    gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <BatteryLandscapeThreeBridge
                      onReady={(ctx) => { threeContextRef.current = ctx; }}
                      transform={transform}
                      sunAngle={transform.sunAngle}
                      batteryConfig={batteryConfig}
                    />
                  </Canvas>
                </div>

                {/* Aide rapide en bas à gauche */}
                <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 pointer-events-none flex items-center gap-2 shadow-lg">
                  <span>🖱️ <strong>Glisser souris :</strong> Pivoter (Azimut 3D)</span>
                  <span>•</span>
                  <span><strong>Ctrl + Glisser :</strong> Déplacer</span>
                  <span>•</span>
                  <span><strong>Molette :</strong> Zoom / Échelle</span>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <p className="text-slate-400 text-sm mb-3">Veuillez charger une photo de terrain pour positionner la station 3D.</p>
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 transition-all">
                  <Upload className="w-4 h-4" />
                  <span>Charger une photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* PANNEAU LATÉRAL DE CONTRÔLES 3D COMPLETS */}
          <div className="w-84 bg-slate-950/95 border-l border-slate-800 flex flex-col justify-between overflow-hidden text-xs">
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sliders className="w-4 h-4 text-purple-400" /> Réglages 3D Batteries
                </span>
                <button
                  type="button"
                  onClick={() => setTransform({
                    posX: 0,
                    posY: -0.8,
                    posZ: 0,
                    rotY: 0.35,
                    rotX: 0.12,
                    rotZ: 0.0,
                    scale: 0.85,
                    opacity: 1.0,
                    sunAngle: 45,
                    showFence: true,
                    showSlab: true
                  })}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Réinitialiser
                </button>
              </div>

              {/* 1. Taille / Échelle */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-purple-400" /> Taille / Échelle</span>
                  <span className="text-purple-400 font-bold">{Math.round(transform.scale * 100)}%</span>
                </div>
                <input
                  type="range" min="0.2" max="3.0" step="0.05"
                  value={transform.scale}
                  onChange={e => setTransform(t => ({ ...t, scale: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 2. Azimut (Rotation 360°) */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-purple-400" /> Azimut (Rotation Z/Y)</span>
                  <span className="text-purple-400 font-bold">{Math.round((transform.rotY * 180) / Math.PI)}°</span>
                </div>
                <input
                  type="range" min="-3.14" max="3.14" step="0.05"
                  value={transform.rotY}
                  onChange={e => setTransform(t => ({ ...t, rotY: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 3. Position Horizontale (X) */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-purple-400" /> Position Horizontale (X)</span>
                  <span className="text-purple-400 font-bold">{transform.posX.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min="-15" max="15" step="0.2"
                  value={transform.posX}
                  onChange={e => setTransform(t => ({ ...t, posX: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 4. Hauteur Sol (Y) */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span>Hauteur Sol (Y)</span>
                  <span className="text-purple-400 font-bold">{transform.posY.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min="-6" max="6" step="0.1"
                  value={transform.posY}
                  onChange={e => setTransform(t => ({ ...t, posY: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 5. Profondeur (Z) */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span>Profondeur (Z)</span>
                  <span className="text-purple-400 font-bold">{transform.posZ.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min="-10" max="15" step="0.5"
                  value={transform.posZ}
                  onChange={e => setTransform(t => ({ ...t, posZ: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 6. Opacité */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-purple-400" /> Opacité</span>
                  <span className="text-purple-400 font-bold">{Math.round(transform.opacity * 100)}%</span>
                </div>
                <input
                  type="range" min="0.1" max="1.0" step="0.05"
                  value={transform.opacity}
                  onChange={e => setTransform(t => ({ ...t, opacity: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 7. Orientation du Soleil / Ombres */}
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

              {/* 8. Éléments modélisés */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Clôture rigide (RAL 6005)</span>
                  <input
                    type="checkbox"
                    checked={transform.showFence}
                    onChange={e => setTransform(t => ({ ...t, showFence: e.target.checked }))}
                    className="rounded bg-slate-800 border-slate-600 text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Dalle béton (<span className="text-emerald-400">19.84 m² &lt; 20 m²</span>)</span>
                  <input
                    type="checkbox"
                    checked={transform.showSlab}
                    onChange={e => setTransform(t => ({ ...t, showSlab: e.target.checked }))}
                    className="rounded bg-slate-800 border-slate-600 text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

            </div>

            {/* PIED DU PANNEAU : ACTIONS DE VALIDATION */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleSaveAndExport}
                disabled={isSaving || !photoSrc}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSaving ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Fusion 3D & Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-3" />
                    <span>Valider l'Incrustation ({docType})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors text-center"
              >
                Annuler
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
