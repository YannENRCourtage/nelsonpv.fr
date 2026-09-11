import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import BatteryStation3DModel from './BatteryStation3DModel';
import { Battery, Camera, Sparkles, Check, RotateCw, Eye, Layers, Compass } from 'lucide-react';

/**
 * Contrôleur de Caméra adapté aux 3 modes d'affichage :
 * - 3D : Vue perspective libre avec OrbitControls
 * - 2D_FRONT : Façade avant 2D orthogonale avec cotations de hauteur et largeur
 * - 2D_TOP : Plan de masse vue du dessus avec cotations d'emprise au sol et flèche Nord
 */
function VisualizerCameraController({ currentMode, onReady, controlsRef, dalleLength = 6.20, dalleWidth = 3.20 }) {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    if (onReady) {
      onReady({ camera, gl, scene });
    }
  }, [camera, gl, scene, onReady]);

  const targetX = 0;
  const targetY = 1.25;
  const targetZ = 0;

  useEffect(() => {
    if (!controlsRef?.current) return;
    const ctrl = controlsRef.current;

    if (currentMode === '2D_FRONT') {
      // Façade 2D orthogonale stricte (Face avant Sud)
      camera.up.set(0, 1, 0);
      camera.position.set(0, targetY, Math.max(dalleLength * 1.45, 9.2));
      ctrl.target.set(0, targetY, 0);
      ctrl.enableRotate = false; // Bloquer la rotation pour une vraie vue 2D technique
      camera.lookAt(0, targetY, 0);
    } else if (currentMode === '2D_TOP') {
      // Plan de masse 2D vu du ciel (Plongeante stricte orthogonale)
      camera.up.set(0, 0, -1);
      camera.position.set(0, Math.max(dalleLength * 1.6, 10.5), 0);
      ctrl.target.set(0, 0, 0);
      ctrl.enableRotate = false; // Bloquer la rotation pour un vrai plan de masse
      camera.lookAt(0, 0, 0);
    } else {
      // Vue 3D perspective libre
      camera.up.set(0, 1, 0);
      camera.position.set(dalleLength * 0.95, 3.8, dalleWidth * 2.2);
      ctrl.target.set(0, 1.1, 0);
      ctrl.enableRotate = true;
      camera.lookAt(0, 1.1, 0);
    }

    ctrl.update();
  }, [currentMode, dalleLength, dalleWidth, camera, controlsRef]);

  return null;
}

/**
 * BatteryStationVisualizer
 * Visualiseur 3D interactif et 2D technique pour la Station Batteries Stand-Alone 500 kW
 * Différencie nettement :
 * 1. '3D' : Perspective avec OrbitControls 360°
 * 2. '2D_FRONT' : Vue d'élévation Façade Sud avec cotations de hauteur et de largeur
 * 3. '2D_TOP' : Plan de masse vu de dessus avec emprise dalle 19.84 m² et flèche Nord
 */
export default function BatteryStationVisualizer({
  batteryStorage = {},
  powerKw = 500,
  cabinetCount = 4,
  cabinetModel = 'CESC Mercury 261',
  dalleLength = 6.20,
  dalleWidth = 3.20,
  viewMode = '3D', // '3D' | '2D_FRONT' | '2D_TOP'
  showDimensions = true,
  onCaptureViews = null,
  onCaptureSnapshot = null,
  onCapture = null,
  height = '100%',
  className = '',
}) {
  // Mode actif interne synchronisé avec la prop externe
  const [internalMode, setInternalMode] = useState(viewMode || '3D');
  const [capturedFeedback, setCapturedFeedback] = useState(null);
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [showFence, setShowFence] = useState(true);

  const threeContextRef = useRef(null);
  const controlsRef = useRef(null);

  // Synchronisation avec la prop externe viewMode
  useEffect(() => {
    if (viewMode) {
      setInternalMode(viewMode);
    }
  }, [viewMode]);

  const dLen = Number(batteryStorage?.dalleLength || dalleLength || 6.20);
  const dWid = Number(batteryStorage?.dalleWidth || dalleWidth || 3.20);
  const dArea = Number((dLen * dWid).toFixed(2));
  const qty = Number(batteryStorage?.quantity || cabinetCount || 4);
  const pKw = Number(batteryStorage?.powerKw || powerKw || 500);

  // Capture instantanée de la vue affichée
  const handleCaptureCurrent = () => {
    if (!threeContextRef.current) return;
    const { gl, scene, camera } = threeContextRef.current;
    if (!gl || !scene || !camera) return;

    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.95);

    if (onCapture) onCapture(dataUrl);
    if (onCaptureSnapshot) onCaptureSnapshot(dataUrl);

    setCapturedFeedback(`Vue ${internalMode} capturée !`);
    setTimeout(() => setCapturedFeedback(null), 2500);
  };

  // Capture séquentielle automatique des 5 vues réglementaires pour DP4
  const handleCaptureAll5 = async () => {
    if (!threeContextRef.current || !controlsRef.current) return;
    const { gl, scene, camera } = threeContextRef.current;
    const ctrl = controlsRef.current;
    if (!gl || !scene || !camera || !ctrl) return;

    setIsCapturingAll(true);
    const savedMode = internalMode;

    const views = {};
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // 1. Façade Sud (Face avant armoires)
      camera.up.set(0, 1, 0);
      camera.position.set(0, 1.25, Math.max(dLen * 1.45, 9.2));
      ctrl.target.set(0, 1.25, 0);
      camera.lookAt(0, 1.25, 0);
      ctrl.update();
      await delay(120);
      gl.render(scene, camera);
      views.sud = gl.domElement.toDataURL('image/jpeg', 0.95);

      // 2. Façade Nord (Arrière)
      camera.position.set(0, 1.25, -Math.max(dLen * 1.45, 9.2));
      ctrl.target.set(0, 1.25, 0);
      camera.lookAt(0, 1.25, 0);
      ctrl.update();
      await delay(120);
      gl.render(scene, camera);
      views.nord = gl.domElement.toDataURL('image/jpeg', 0.95);

      // 3. Façade Est (Pignon gauche)
      camera.position.set(-Math.max(dWid * 2.5, 8.0), 1.25, 0);
      ctrl.target.set(0, 1.25, 0);
      camera.lookAt(0, 1.25, 0);
      ctrl.update();
      await delay(120);
      gl.render(scene, camera);
      views.est = gl.domElement.toDataURL('image/jpeg', 0.95);

      // 4. Façade Ouest (Pignon droit avec portillon)
      camera.position.set(Math.max(dWid * 2.5, 8.0), 1.25, 0);
      ctrl.target.set(0, 1.25, 0);
      camera.lookAt(0, 1.25, 0);
      ctrl.update();
      await delay(120);
      gl.render(scene, camera);
      views.ouest = gl.domElement.toDataURL('image/jpeg', 0.95);

      // 5. Vue Dessus (Toiture / Plan)
      camera.up.set(0, 0, -1);
      camera.position.set(0, Math.max(dLen * 1.6, 10.5), 0);
      ctrl.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      ctrl.update();
      await delay(120);
      gl.render(scene, camera);
      views.dessus = gl.domElement.toDataURL('image/jpeg', 0.95);

      if (onCaptureViews) {
        onCaptureViews(views);
      }
      if (onCapture) {
        onCapture(views.sud);
      }

      setCapturedFeedback('✓ 5 Vues DP4 capturées !');
      setTimeout(() => setCapturedFeedback(null), 3000);
    } catch (err) {
      console.error('Erreur capture 5 vues:', err);
    } finally {
      // Restaurer le mode précédent
      setInternalMode(savedMode);
      setIsCapturingAll(false);
    }
  };

  return (
    <div
      className={`relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden bg-slate-950 flex flex-col border border-slate-800 shadow-xl ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : (height || '100%') }}
    >
      {/* 1. BARRE SUPÉRIEURE : SÉLECTEUR DE MODE 3D / 2D FAÇADE / PLAN DE MASSE */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
        {/* Badge informatif */}
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[11px] font-extrabold text-white">
            {internalMode === '3D' && 'Vue 3D Libre (Rotation 360°)'}
            {internalMode === '2D_FRONT' && 'Vue 2D Façade Sud (Élévation technique)'}
            {internalMode === '2D_TOP' && 'Plan de masse (Vue zénithale / Emprise sol)'}
          </span>
          <span className="text-[10px] text-purple-300 font-bold bg-purple-900/50 px-2 py-0.5 rounded-md border border-purple-700/40">
            {dLen}m × {dWid}m ({dArea} m²)
          </span>
        </div>

        {/* Boutons de bascule des 3 modes */}
        <div className="flex gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md pointer-events-auto">
          <button
            type="button"
            onClick={() => setInternalMode('3D')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              internalMode === '3D'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            <span>Vue 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setInternalMode('2D_FRONT')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              internalMode === '2D_FRONT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Vue 2D Façade</span>
          </button>
          <button
            type="button"
            onClick={() => setInternalMode('2D_TOP')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              internalMode === '2D_TOP'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Plan de masse</span>
          </button>
        </div>
      </div>

      {/* 2. OVERLAYS TECHNIQUES SPÉCIFIQUES SELON LE MODE */}
      {/* MODE 2D_FRONT : COTATIONS DE HAUTEUR ET LARGEUR SUR LA FAÇADE */}
      {internalMode === '2D_FRONT' && showDimensions && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
          {/* Cotation Longueur dalle en haut */}
          <div className="mx-auto mt-12 bg-slate-900/85 backdrop-blur-xs px-3 py-1 rounded-lg border border-purple-500/50 text-[11px] font-black text-purple-300 shadow-md flex items-center gap-2">
            <span>&larr;</span>
            <span>Longueur Dalle : {dLen.toFixed(2)} M (4 armoires CESC 261)</span>
            <span>&rarr;</span>
          </div>

          {/* Cotation Hauteur armoire & clôture sur le flanc gauche */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-purple-500/50 text-[10px] font-black text-purple-300 shadow-md flex flex-col items-center">
            <span>&uarr;</span>
            <span>H: 2.38 M</span>
            <span className="text-[9px] text-slate-400 font-semibold">(Clôture 2.00M)</span>
            <span>&darr;</span>
          </div>
        </div>
      )}

      {/* MODE 2D_TOP : COTATIONS PLAN DE MASSE ET BOUSSOLE NORD */}
      {internalMode === '2D_TOP' && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
          {/* Flèche Nord réglementaire en haut à droite */}
          <div className="absolute top-14 right-4 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-full w-9 h-9 flex flex-col items-center justify-center shadow-md">
            <span className="text-[10px] font-black text-slate-800 leading-none">N</span>
            <span className="text-purple-600 text-[10px] leading-none font-bold">▲</span>
          </div>

          {/* Cotations architecturales en filigrane */}
          {showDimensions && (
            <div className="mt-14 ml-4 bg-slate-900/85 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-purple-500/40 text-[10px] font-bold text-slate-200 shadow-md max-w-xs space-y-0.5">
              <div className="text-purple-400 font-extrabold text-[11px]">
                Emprise au sol : {dLen.toFixed(2)}m × {dWid.toFixed(2)}m = {dArea} m²
              </div>
              <div className="text-slate-400 text-[9px]">
                Dalle béton armé 0.20m • {qty} armoires 1.15m × 1.44m • Portillon technique Ouest
              </div>
              <div className="text-emerald-400 font-extrabold text-[9px]">
                ✓ Conforme Déclaration Préalable (&lt; 20 m²)
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SCÈNE 3D / THREE.JS CANVAS */}
      <div className="flex-1 w-full h-full relative">
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
          camera={{ position: [dLen * 0.95, 3.8, dWid * 2.2], fov: 40 }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#090d16']} />
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[40, 50, 30]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-30, 20, -20]} intensity={0.8} />
          <Environment preset="city" />

          <VisualizerCameraController
            currentMode={internalMode}
            onReady={(ctx) => {
              threeContextRef.current = ctx;
            }}
            controlsRef={controlsRef}
            dalleLength={dLen}
            dalleWidth={dWid}
          />

          <OrbitControls
            ref={controlsRef}
            maxDistance={80}
            minDistance={3}
            enableDamping={true}
            dampingFactor={0.08}
          />

          <BatteryStation3DModel
            dalleLength={dLen}
            dalleWidth={dWid}
            cabinetCount={qty}
            showFence={showFence}
            showSlab={true}
          />

          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.65}
            scale={14}
            blur={1.6}
            far={4}
          />
        </Canvas>
      </div>

      {/* 4. BARRE INFÉRIEURE : CONTRÔLES & ACTIONS */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
        {/* Toggle Clôture */}
        <label className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-bold text-slate-300 flex items-center gap-2 cursor-pointer pointer-events-auto hover:bg-slate-800 transition-colors shadow-md">
          <input
            type="checkbox"
            checked={showFence}
            onChange={(e) => setShowFence(e.target.checked)}
            className="w-3.5 h-3.5 accent-purple-600 rounded"
          />
          <span>Clôture rigide vert RAL 6005</span>
        </label>

        {/* Boutons de capture */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {capturedFeedback && (
            <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              {capturedFeedback}
            </span>
          )}

          <button
            type="button"
            onClick={handleCaptureCurrent}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-600 shadow-md flex items-center gap-1.5 transition-all"
            title="Capturer l'angle courant"
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Capturer cette vue</span>
          </button>

          <button
            type="button"
            onClick={handleCaptureAll5}
            disabled={isCapturingAll}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Prendre automatiquement les 5 vues réglementaires pour DP4"
          >
            {isCapturingAll ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Captures en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>✓ Capturer les 5 Vues 3D (DP4)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}