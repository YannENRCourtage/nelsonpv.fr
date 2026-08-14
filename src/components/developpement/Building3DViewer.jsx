import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Structure } from '@/components/configurator/structure/Structure.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { Camera, RotateCw, Sparkles, Check } from 'lucide-react';

/**
 * Camera Controller inside React Three Fiber Canvas
 */
function SceneCameraController({ activeSlot, onReady, controlsRef }) {
  const { camera, gl, scene } = useThree();
  const config = useConfiguratorValues();
  const length = config.length || 30.0;
  const width = config.width || 20.0;
  const eaveHeight = config.eaveHeight || 4.0;
  const maxDim = Math.max(length, width);

  useEffect(() => {
    if (onReady) {
      onReady({ camera, gl, scene });
    }
  }, [camera, gl, scene, onReady]);

  // Target center of the building (Z is 0 to -length, X is -width/2 to +width/2)
  const targetX = 0;
  const targetY = eaveHeight * 0.6;
  const targetZ = -length / 2;

  useEffect(() => {
    if (!controlsRef?.current) return;
    const ctrl = controlsRef.current;

    camera.up.set(0, 1, 0);

    const hasAuvent = config.rightSide === 'auvent' || config.leftSide === 'auvent';
    const totalGableWidth = width + (hasAuvent ? 4.0 : 0);
    const gableCenterX = hasAuvent ? (config.rightSide === 'auvent' ? 2.0 : -2.0) : 0;
    const gableCenterY = (eaveHeight + (config.ridgeHeight || 8.0)) * 0.45;

    // Distances adaptées aux proportions réelles de chaque élément
    const distLong = Math.max(length * 1.05, 36);
    const distGable = Math.max(totalGableWidth * 0.95, 20);
    const distRoof = Math.max(length * 0.95, 28);

    if (activeSlot === 'facade_sud') {
      // 1. Façade Sud (Long Pan Solaire) : Cadrage large horizontal
      camera.position.set(distLong, targetY, targetZ);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    } else if (activeSlot === 'facade_nord') {
      // 2. Façade Nord (Long Pan Arrière) : Cadrage large horizontal
      camera.position.set(-distLong, targetY, targetZ);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    } else if (activeSlot === 'facade_est') {
      // 3. Pignon Est (Gable gauche Z=0) : Cadrage ajusté aux proportions réelles
      camera.position.set(gableCenterX, gableCenterY, distGable);
      ctrl.target.set(gableCenterX, gableCenterY, 0);
      camera.lookAt(gableCenterX, gableCenterY, 0);
    } else if (activeSlot === 'facade_ouest') {
      // 4. Pignon Ouest (Gable droit Z=-length) : Cadrage ajusté aux proportions réelles
      camera.position.set(gableCenterX, gableCenterY, -length - distGable);
      ctrl.target.set(gableCenterX, gableCenterY, -length);
      camera.lookAt(gableCenterX, gableCenterY, -length);
    } else if (activeSlot === 'vue_couverture') {
      // 5. Vue Toiture Plan (Format Paysage horizontal plein cadre)
      camera.up.set(1, 0, 0);
      camera.position.set(gableCenterX, distRoof, targetZ);
      ctrl.target.set(gableCenterX, 0, targetZ);
      camera.lookAt(gableCenterX, 0, targetZ);
    } else {
      // Vue 3D Libre
      camera.position.set(maxDim * 0.85, maxDim * 0.6, maxDim * 0.7);
      ctrl.target.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, targetZ);
    }

    ctrl.update();
  }, [activeSlot, length, width, eaveHeight, maxDim, camera, controlsRef]);

  return null;
}

/**
 * Building3DViewer — Visionneuse 3D officielle utilisant la même Structure que le configurateur
 */
export default function Building3DViewer({
  onCaptureSnapshot,
  onCaptureAll5Views,
  height = 360,
  className = ''
}) {
  const [activeSlot, setActiveSlot] = useState('facade_sud');
  const [capturedSlots, setCapturedSlots] = useState({});
  const [isCapturingAll, setIsCapturingAll] = useState(false);

  const threeContextRef = useRef(null);
  const controlsRef = useRef(null);
  const config = useConfiguratorValues();

  const length = config.length || 30.0;
  const width = config.width || 20.0;
  const eaveHeight = config.eaveHeight || 4.0;
  const targetZ = -length / 2;

  const CAMERA_PRESETS = {
    facade_sud: { label: 'Façade Sud (Long Pan Solaire)' },
    facade_nord: { label: 'Façade Nord (Arrière)' },
    facade_est: { label: 'Façade Est (Pignon Gauche)' },
    facade_ouest: { label: 'Façade Ouest (Pignon Droit)' },
    vue_couverture: { label: 'Vue Toiture (Paysage)' },
  };

  const handleTakeSnapshot = () => {
    if (!threeContextRef.current) return;
    const { gl, scene, camera } = threeContextRef.current;
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.95);

    setCapturedSlots(prev => ({ ...prev, [activeSlot]: dataUrl }));
    if (onCaptureSnapshot) {
      onCaptureSnapshot(dataUrl, activeSlot);
    }
  };

  const handleCaptureAll5 = async () => {
    if (!threeContextRef.current) return;
    setIsCapturingAll(true);
    const keys = ['facade_sud', 'facade_nord', 'facade_est', 'facade_ouest', 'vue_couverture'];
    const results = {};

    for (const key of keys) {
      setActiveSlot(key);
      await new Promise(r => setTimeout(r, 220));
      const { gl, scene, camera } = threeContextRef.current;
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.95);
      results[key] = dataUrl;
    }

    setCapturedSlots(results);
    if (onCaptureAll5Views) {
      onCaptureAll5Views(results);
    } else if (onCaptureSnapshot) {
      onCaptureSnapshot(results.facade_sud, 'facade_sud');
    }

    setActiveSlot('free_3d');
    setIsCapturingAll(false);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs flex flex-col ${className}`} style={{ height }}>
      {/* Three.js R3F Canvas */}
      <div className="w-full h-full bg-white flex-1 relative">
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', background: '#ffffff' }}
        >
          <color attach="background" args={['#ffffff']} />

          <ambientLight intensity={0.85} />
          <directionalLight
            position={[70, 90, 60]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
          />
          <Environment preset="city" />

          <PerspectiveCamera
            makeDefault
            position={[width * 1.5, eaveHeight * 0.8, targetZ]}
            fov={40}
            near={0.1}
            far={2000}
          />

          <OrbitControls
            ref={controlsRef}
            target={[0, eaveHeight * 0.6, targetZ]}
            maxDistance={300}
            minDistance={2}
          />

          <Structure hideBracing={true} forceHideDimensions={true} />

          <ContactShadows
            position={[0, 0, targetZ]}
            scale={Math.max(length * 2, width * 2, 50)}
            blur={2}
            opacity={0.45}
            far={15}
            color="#000000"
          />

          <SceneCameraController
            activeSlot={activeSlot}
            onReady={(ctx) => { threeContextRef.current = ctx; }}
            controlsRef={controlsRef}
          />
        </Canvas>
      </div>

      {/* Top Bar Navigation Slots */}
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
              onClick={() => setActiveSlot(btn.id)}
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
          onClick={() => setActiveSlot('free_3d')}
          className="pointer-events-auto p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-xs text-xs font-bold transition-all"
          title="Vue 3D Libre"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Bar Actions */}
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
