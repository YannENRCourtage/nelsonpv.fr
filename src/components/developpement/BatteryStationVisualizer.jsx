import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import BatteryStation3DModel from './BatteryStation3DModel';
import { Battery, Camera, Sparkles, Check, RotateCw, Eye } from 'lucide-react';

/**
 * Camera Controller pour les 5 vues réglementaires de la Station Batteries
 * (Façade Sud, Façade Nord, Façade Est, Façade Ouest, Vue Dessus)
 */
function BatteryCameraController({ activeSlot, onReady, controlsRef, dalleLength = 6.20, dalleWidth = 3.20 }) {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    if (onReady) {
      onReady({ camera, gl, scene });
    }
  }, [camera, gl, scene, onReady]);

  const targetX = 0;
  const targetY = 1.30; // Hauteur médiane des armoires
  const targetZ = 0;

  useEffect(() => {
    if (!controlsRef?.current) return;
    const ctrl = controlsRef.current;

    camera.up.set(0, 1, 0);

    const distFront = Math.max(dalleLength * 1.35, 9.5);
    const distSide = Math.max(dalleWidth * 2.2, 7.8);
    const distTop = Math.max(dalleLength * 1.5, 11.0);

    if (activeSlot === 'facade_sud') {
      // 1. Façade Sud (Face avant des 4 armoires avec portes et écran IHM)
      camera.position.set(targetX, targetY + 0.1, distFront);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    } else if (activeSlot === 'facade_nord') {
      // 2. Façade Nord (Face arrière avec aérations techniques)
      camera.position.set(targetX, targetY + 0.1, -distFront);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    } else if (activeSlot === 'facade_est') {
      // 3. Façade Est (Pignon latéral gauche -X)
      camera.position.set(-distSide, targetY + 0.1, targetZ);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    } else if (activeSlot === 'facade_ouest') {
      // 4. Façade Ouest (Pignon latéral droit +X avec portillon d'accès)
      camera.position.set(distSide, targetY + 0.1, targetZ);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    } else if (activeSlot === 'vue_couverture') {
      // 5. Vue Dessus / Toiture (Vue plongeante de la dalle et des 4 toits)
      camera.up.set(0, 0, -1);
      camera.position.set(targetX, distTop, targetZ);
      ctrl.target.set(targetX, 0, targetZ);
      camera.lookAt(targetX, 0, targetZ);
    } else {
      // Vue 3D Libre isométrique
      camera.position.set(dalleLength * 0.9, 4.2, dalleWidth * 1.8);
      ctrl.target.set(targetX, targetY * 0.8, targetZ);
      camera.lookAt(targetX, targetY * 0.8, targetZ);
    }

    ctrl.update();
  }, [activeSlot, dalleLength, dalleWidth, camera, controlsRef]);

  return null;
}

/**
 * BatteryStationVisualizer — Visualiseur 3D WebGL réaliste pour la Station Batteries Stand-Alone
 * Permet l'affichage 3D plein et la capture fluide des 5 vues DP4 (Sud, Nord, Est, Ouest, Dessus)
 */
export default function BatteryStationVisualizer({
  batteryStorage = {},
  powerKw = 500,
  cabinetCount = 4,
  cabinetModel = 'CESC Mercury 261',
  dalleLength = 6.20,
  dalleWidth = 3.20,
  onCaptureViews = null,
  onCaptureSnapshot = null,
  onCapture = null,
  height = 320,
  className = '',
}) {
  const [activeSlot, setActiveSlot] = useState('facade_sud');
  const [capturedSlots, setCapturedSlots] = useState({});
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [showFence, setShowFence] = useState(true);

  const threeContextRef = useRef(null);
  const controlsRef = useRef(null);

  const dLen = Number(batteryStorage.dalleLength || dalleLength || 6.20);
  const dWid = Number(batteryStorage.dalleWidth || dalleWidth || 3.20);
  const dArea = Number((dLen * dWid).toFixed(2));
  const qty = Number(batteryStorage.quantity || cabinetCount || 4);
  const pKw = Number(batteryStorage.powerKw || powerKw || 500);

  const CAMERA_PRESETS = {
    facade_sud: { label: 'Façade Sud (Face Avant)' },
    facade_nord: { label: 'Façade Nord (Arrière)' },
    facade_est: { label: 'Façade Est (Pignon Gauche)' },
    facade_ouest: { label: 'Façade Ouest (Pignon Droit)' },
    vue_couverture: { label: 'Vue Dessus (Plan de toiture)' },
  };

  // Capture de la vue courante
  const handleTakeSnapshot = () => {
    if (!threeContextRef.current) return;
    const { gl, scene, camera } = threeContextRef.current;
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.95);

    setCapturedSlots(prev => ({ ...prev, [activeSlot]: dataUrl }));
    if (onCaptureSnapshot) {
      onCaptureSnapshot(dataUrl, activeSlot);
    }
    if (onCapture) {
      onCapture(dataUrl);
    }
  };

  // Capture séquentielle des 5 vues réglementaires pour DP4
  const handleCaptureAll5 = async () => {
    if (!threeContextRef.current) return;
    setIsCapturingAll(true);
    const keys = ['facade_sud', 'facade_nord', 'facade_est', 'facade_ouest', 'vue_couverture'];
    const results = {};

    for (const key of keys) {
      setActiveSlot(key);
      await new Promise(r => setTimeout(r, 240));
      const { gl, scene, camera } = threeContextRef.current;
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.95);
      results[key] = dataUrl;
    }

    setCapturedSlots(results);

    if (onCaptureViews) {
      onCaptureViews(results);
    } else if (onCaptureSnapshot) {
      onCaptureSnapshot(results.facade_sud, 'facade_sud');
    }
    if (onCapture && results.facade_sud) {
      onCapture(results.facade_sud);
    }

    setActiveSlot('free_3d');
    setIsCapturingAll(false);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-purple-200/80 bg-slate-900 shadow-md flex flex-col ${className}`} style={{ height }}>
      {/* 1. BARRE D'INFORMATIONS SUPÉRIEURE */}
      <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-purple-500/40 shadow-lg flex items-center gap-2">
          <Battery className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-white font-extrabold text-[11px]">
            {qty}× {cabinetModel} ({pKw} kW)
          </span>
          <span className="bg-purple-600 text-purple-100 text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs">
            DP &lt; 20 m²
          </span>
        </div>

        <div className="bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">Dalle béton :</span>
          <span className="font-extrabold text-white">{dLen.toFixed(2)}m × {dWid.toFixed(2)}m ({dArea} m²)</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-bold">Clôture :</span>
          <span>H 2.00m RAL 6005</span>
        </div>
      </div>

      {/* 2. SÉLECTEUR DE VUES CAMÉRA (Sud, Nord, Est, Ouest, Dessus, 3D Libre) */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg">
        {Object.entries(CAMERA_PRESETS).map(([slotKey, item]) => {
          const isSelected = activeSlot === slotKey;
          const isCaptured = Boolean(capturedSlots[slotKey]);
          const shortLabel = slotKey === 'facade_sud' ? 'Sud'
            : slotKey === 'facade_nord' ? 'Nord'
            : slotKey === 'facade_est' ? 'Est'
            : slotKey === 'facade_ouest' ? 'Ouest'
            : 'Dessus';

          return (
            <button
              key={slotKey}
              type="button"
              onClick={() => setActiveSlot(slotKey)}
              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <span>{shortLabel}</span>
              {isCaptured && <Check className="w-2.5 h-2.5 text-emerald-400 stroke-3" />}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setActiveSlot('free_3d')}
          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
            activeSlot === 'free_3d'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Mode 3D Libre (Rotation à la souris)"
        >
          3D Libre
        </button>
      </div>

      {/* 3. CANEVAS THREE.JS WEBGL */}
      <div className="w-full h-full flex-1 relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#0f172a']} />

          <ambientLight intensity={0.9} />
          <directionalLight
            position={[40, 50, 35]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
          />
          <directionalLight
            position={[-30, 20, -25]}
            intensity={0.8}
          />
          <Environment preset="city" />

          <PerspectiveCamera
            makeDefault
            position={[dLen * 0.9, 4.2, dWid * 1.8]}
            fov={40}
            near={0.1}
            far={1000}
          />

          <OrbitControls
            ref={controlsRef}
            target={[0, 1.2, 0]}
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />

          <BatteryCameraController
            activeSlot={activeSlot}
            controlsRef={controlsRef}
            dalleLength={dLen}
            dalleWidth={dWid}
            onReady={(ctx) => {
              threeContextRef.current = ctx;
            }}
          />

          {/* Modèle 3D complet : Dalle + 4 Armoires pleines + Clôture rigide */}
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
            scale={12}
            blur={1.8}
            far={4}
          />
        </Canvas>
      </div>

      {/* 4. BARRE D'ACTIONS INFÉRIEURE */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs z-20">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-slate-300 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={showFence}
              onChange={(e) => setShowFence(e.target.checked)}
              className="rounded bg-slate-800 border-slate-600 text-purple-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Clôture rigide vert RAL 6005</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Capture vue active */}
          <button
            type="button"
            onClick={handleTakeSnapshot}
            disabled={isCapturingAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 active:scale-95"
            title="Prendre une capture de l'angle courant"
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Capturer cette vue</span>
          </button>

          {/* Capture automatique des 5 vues pour DP4 */}
          <button
            type="button"
            onClick={handleCaptureAll5}
            disabled={isCapturingAll}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Capturer les 5 vues automatiquement pour le dossier DP4"
          >
            {isCapturingAll ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Capture des 5 vues...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>✓ Capturer les 5 Vues 3D (DP4)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}