import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import BatteryStation3DModel from './BatteryStation3DModel';
import {
  X, Check, RotateCw, ZoomIn, ZoomOut, Move,
  Sliders, RefreshCw, Eye, Sparkles, Sun, Compass,
  Battery, Upload, Shield, Hand, MousePointer
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

/**
 * Three Context Bridge pour l'incrustation paysagère 3D
 * Assure le redimensionnement WebGL dynamique sur 100% de la zone d'affichage
 */
function BatteryLandscapeThreeBridge({ onReady, transform, sunAngle, batteryConfig, containerRef }) {
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    if (onReady) onReady({ gl, scene, camera });
  }, [gl, scene, camera, onReady]);

  // Garantir le dimensionnement WebGL plein écran dès le chargement et à chaque redimensionnement
  useEffect(() => {
    const updateSize = () => {
      if (containerRef?.current && gl && camera) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          gl.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      }
    };

    updateSize();
    const t1 = setTimeout(updateSize, 60);
    const t2 = setTimeout(updateSize, 200);

    const observer = new ResizeObserver(updateSize);
    if (containerRef?.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [gl, camera, containerRef]);

  // Synchronisation de la caméra
  useEffect(() => {
    camera.lookAt(0, 1.2, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  const sunRad = (sunAngle * Math.PI) / 180;
  const dLen = Number(batteryConfig?.dalleLength || 6.20);
  const dWid = Number(batteryConfig?.dalleWidth || 3.20);
  const qty = Number(batteryConfig?.quantity || 4);

  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight
        position={[Math.cos(sunRad) * 60, 55, Math.sin(sunRad) * 60]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <directionalLight
        position={[-Math.cos(sunRad) * 35, 25, -Math.sin(sunRad) * 35]}
        intensity={0.8}
      />
      <Environment preset="city" />

      {/* Groupe Station Batteries positionné librement */}
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
          opacity={0.65 * transform.opacity}
          scale={12}
          blur={1.6}
          far={3}
        />
      </group>
    </>
  );
}

/**
 * BatteryInsertionCompositor
 * Incrustation Paysagère 3D Interactive (DP6 / PC6)
 * - Déplacement libre sur 100% de la surface de l'image (aucune restriction de coin)
 * - Modes explicites Déplacement ✋ et Rotation 🔄
 * - Clic direct sur l'image pour positionner immédiatement la station
 * - Contrôles latéraux complets (échelle, azimut 360°, X, Y, Z, opacité, angle soleil)
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

  // Mode d'interaction souris : 'move' (par défaut) ou 'rotate'
  const [interactionMode, setInteractionMode] = useState('move');

  // Contrôles 3D interactifs (valeurs initiales bien centrées)
  const [transform, setTransform] = useState({
    posX: 0.0,
    posY: -2.2,     // Positionnée naturellement au sol
    posZ: 0.0,
    rotY: 0.25,     // Léger angle isométrique
    rotX: 0.08,     // Légère inclinaison vers le bas
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
  const hasMovedRef = useRef(false);

  useEffect(() => {
    if (initialPhoto) setPhotoSrc(initialPhoto);
  }, [initialPhoto]);

  // Démarrage du glisser
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  // Mouvement du curseur sur l'image
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }

    // Si on maintient Ctrl/Shift ou clic droit, on force le mode inverse
    const isMove = interactionMode === 'move'
      ? !(e.ctrlKey || e.button === 2)
      : (e.ctrlKey || e.button === 2);

    if (isMove) {
      // DÉPLACEMENT FLUIDE (X / Y) SUR L'INTÉGRALITÉ DE L'IMAGE
      // Facteur d'échelle adapté à la profondeur Z et au champ de vision
      const factor = 0.032 * (1 + (transform.posZ || 0) * 0.02);
      setTransform(prev => ({
        ...prev,
        posX: prev.posX + dx * factor,
        posY: prev.posY - dy * factor,
      }));
    } else {
      // ROTATION ORBITALE / AZIMUT (360°)
      setTransform(prev => ({
        ...prev,
        rotY: prev.rotY + dx * 0.008,
        rotX: Math.max(-0.6, Math.min(0.6, prev.rotX + dy * 0.004)),
      }));
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Clic simple sur la photo pour téléporter immédiatement les batteries à l'endroit cliqué
  const handleClickOnPhoto = (e) => {
    if (hasMovedRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Normalisation [-1, 1] par rapport au centre de l'image
    const normX = (clickX / rect.width - 0.5) * 2;
    const normY = (0.5 - clickY / rect.height) * 2;

    // Conversion en coordonnées 3D pour la caméra à distance ~14m
    const worldX = normX * 8.5;
    const worldY = normY * 5.5;

    setTransform(prev => ({
      ...prev,
      posX: Math.round(worldX * 10) / 10,
      posY: Math.round(worldY * 10) / 10,
    }));
  };

  // Molette pour le zoom / l'échelle
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.15, Math.min(3.5, Math.round(prev.scale * factor * 100) / 100))
    }));
  };

  // Upload d'une photo de remplacement
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPhotoSrc(event.target.result);
    reader.readAsDataURL(file);
  };

  // Raccourcis de positionnement rapide
  const applyPreset = (presetName) => {
    switch (presetName) {
      case 'center':
        setTransform(t => ({ ...t, posX: 0, posY: -1.0 }));
        break;
      case 'ground':
        setTransform(t => ({ ...t, posX: 0, posY: -3.5 }));
        break;
      case 'left':
        setTransform(t => ({ ...t, posX: -5.5, posY: -2.5 }));
        break;
      case 'right':
        setTransform(t => ({ ...t, posX: 5.5, posY: -2.5 }));
        break;
      default:
        break;
    }
  };

  // Sauvegarde composite haute définition
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
        description: `La simulation ${docType} a été mise à jour avec succès.`
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-[1550px] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* EN-TÊTE DE LA MODALE */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                Incrustation Paysagère 3D — Station Batteries Stand-Alone
                <span className="text-[10px] bg-purple-600/40 text-purple-300 border border-purple-500/50 px-2.5 py-0.5 rounded-full font-bold">
                  {docType} &bull; 4× CESC Mercury 261 (500 kW / 1 044 kWh)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Déplacez librement les 4 batteries n'importe où sur l'image et ajustez l'échelle et l'orientation.
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

        {/* ZONE CENTRALE : VISUALISATION PHOTO + CANVAS 3D PLEIN ÉCRAN & PANNEAU LATÉRAL */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Cadre de simulation sur photo */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClickOnPhoto}
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          >
            {photoSrc ? (
              <>
                {/* 1. Photo réelle de fond */}
                <img
                  src={photoSrc}
                  alt="Photo de terrain"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                {/* 2. Scène 3D Three.js transparente superposée sur TOUTE la photo */}
                <div className="absolute inset-0 pointer-events-none">
                  <Canvas
                    shadows
                    gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
                    camera={{ position: [0, 2.5, 14], fov: 40 }}
                    style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                  >
                    <BatteryLandscapeThreeBridge
                      onReady={(ctx) => { threeContextRef.current = ctx; }}
                      transform={transform}
                      sunAngle={transform.sunAngle}
                      batteryConfig={batteryConfig}
                      containerRef={containerRef}
                    />
                  </Canvas>
                </div>

                {/* 3. BARRE FLOTTANTE CENTRALE : BASCULE DE MODE DÉPLACEMENT / ROTATION */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setInteractionMode('move'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm ${
                      interactionMode === 'move'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>✋ Déplacer (Glisser-Déposer)</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setInteractionMode('rotate'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm ${
                      interactionMode === 'rotate'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>🔄 Pivoter (Azimut 360°)</span>
                  </button>
                </div>

                {/* 4. Raccourcis de positionnement rapide au sol */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 pointer-events-auto">
                  <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2 shadow-lg">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Positions rapides :</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); applyPreset('ground'); }}
                      className="px-2 py-1 bg-slate-800 hover:bg-purple-600 hover:text-white rounded-lg text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      Au sol (centre)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); applyPreset('left'); }}
                      className="px-2 py-1 bg-slate-800 hover:bg-purple-600 hover:text-white rounded-lg text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      À gauche
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); applyPreset('right'); }}
                      className="px-2 py-1 bg-slate-800 hover:bg-purple-600 hover:text-white rounded-lg text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      À droite
                    </button>
                  </div>
                </div>

                {/* 5. Astuce d'interaction */}
                <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-300 border border-slate-700 pointer-events-none flex items-center gap-1.5 shadow-lg">
                  <MousePointer className="w-3 h-3 text-purple-400" />
                  <span>Cliquez ou glissez n'importe où sur l'image pour positionner les batteries</span>
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
          <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col justify-between overflow-hidden text-xs flex-shrink-0">
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sliders className="w-4 h-4 text-purple-400" /> Réglages 3D Batteries
                </span>
                <button
                  type="button"
                  onClick={() => setTransform({
                    posX: 0.0,
                    posY: -2.2,
                    posZ: 0.0,
                    rotY: 0.25,
                    rotX: 0.08,
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

              {/* 1. Échelle / Taille */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span>Taille / Échelle</span>
                  <span className="text-purple-400 font-bold">{Math.round(transform.scale * 100)}%</span>
                </div>
                <input
                  type="range" min="0.15" max="3.5" step="0.02"
                  value={transform.scale}
                  onChange={e => setTransform(t => ({ ...t, scale: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 2. Azimut (Rotation 360°) */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-purple-400" /> Azimut (Rotation 360°)</span>
                  <span className="text-purple-400 font-bold">{Math.round((transform.rotY * 180) / Math.PI)}°</span>
                </div>
                <input
                  type="range" min="-3.14" max="3.14" step="0.05"
                  value={transform.rotY}
                  onChange={e => setTransform(t => ({ ...t, rotY: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 3. Position Horizontale (X) : Large plage pour couvrir toute l'image */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-purple-400" /> Position Horizontale (X)</span>
                  <span className="text-purple-400 font-bold">{transform.posX.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min="-35" max="35" step="0.2"
                  value={transform.posX}
                  onChange={e => setTransform(t => ({ ...t, posX: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 4. Hauteur Sol (Y) : Permet de descendre ou monter partout sur l'image */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-semibold">
                  <span>Hauteur Sol (Y)</span>
                  <span className="text-purple-400 font-bold">{transform.posY.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min="-25" max="25" step="0.2"
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
                  type="range" min="-25" max="35" step="0.5"
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

              {/* 8. Toggles Clôture et Dalle */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={transform.showFence}
                    onChange={e => setTransform(t => ({ ...t, showFence: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-purple-600 rounded"
                  />
                  <span>Clôture rigide (RAL 6005)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={transform.showSlab}
                    onChange={e => setTransform(t => ({ ...t, showSlab: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-purple-600 rounded"
                  />
                  <span>Dalle béton (19.84 m² &lt; 20 m²)</span>
                </label>
              </div>
            </div>

            {/* BOUTONS D'ACTION DU PANNEAU */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
              <button
                type="button"
                onClick={handleSaveAndExport}
                disabled={isSaving || !photoSrc}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Fusion HD en cours...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Valider l'Incrustation ({docType})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
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
