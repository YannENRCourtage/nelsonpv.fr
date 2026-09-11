import React, { useState, useRef, useEffect } from 'react';
import {
  X, Check, RotateCw, ZoomIn, ZoomOut, Move,
  Download, Layers, Sparkles, Upload, Eye, Shield, Sliders
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

/**
 * BatteryInsertionCompositor
 * Compositing visuel 2D/Canvas pour incruster les 4 armoires CESC Mercury 261 
 * sur dalle béton (< 20m²) ceinturée par un grillage rigide vert sur les photos de terrain (DPC6/DPC7/DPC8).
 */
export default function BatteryInsertionCompositor({
  isOpen,
  onClose,
  initialPhoto,
  onSaveSimulation,
  docType = 'DPC6'
}) {
  const [photoSrc, setPhotoSrc] = useState(initialPhoto || null);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreset, setActivePreset] = useState('group'); // 'group', 'aligned_4', 'isometric'

  // Transform controls
  const [transform, setTransform] = useState({
    x: 0,       // % offset relative to center
    y: 10,      // % offset relative to center
    scale: 0.6,
    rotation: 0,
    showFence: true,
    showSlab: true,
    fenceColor: '#15803d', // Green
    opacity: 1
  });

  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Preloaded images
  const [loadedImages, setLoadedImages] = useState({});

  useEffect(() => {
    if (initialPhoto) setPhotoSrc(initialPhoto);
  }, [initialPhoto]);

  useEffect(() => {
    // Load pre-configured battery assets
    const imagesToLoad = {
      group: '/images/battery/cesc_mercury_group.jpg',
      front: '/images/battery/cesc_mercury_front.png',
      side: '/images/battery/cesc_mercury_side.png',
      fence: '/images/battery/fence_texture.png'
    };

    const loaded = {};
    let count = 0;
    const total = Object.keys(imagesToLoad).length;

    Object.entries(imagesToLoad).forEach(([key, url]) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        loaded[key] = img;
        count++;
        if (count === total) {
          setLoadedImages(loaded);
        }
      };
      img.onerror = () => {
        count++;
        if (count === total) setLoadedImages(loaded);
      };
    });
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPhotoSrc(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setTransform(prev => ({
      ...prev,
      x: prev.x + (dx / 5),
      y: prev.y + (dy / 5)
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.15, Math.min(2.5, prev.scale * factor))
    }));
  };

  // Render composite to Canvas for preview & high-res export
  const renderCanvas = (highRes = false) => {
    if (!photoSrc) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = photoSrc;

    return new Promise((resolve) => {
      bgImg.onload = () => {
        const width = highRes ? bgImg.naturalWidth || 1920 : 1200;
        const height = highRes ? bgImg.naturalHeight || 1080 : 675;

        canvas.width = width;
        canvas.height = height;

        // 1. Draw Background Photo
        ctx.drawImage(bgImg, 0, 0, width, height);

        // Calculate center placement
        const centerX = (width / 2) + (transform.x * (width / 100));
        const centerY = (height / 2) + (transform.y * (height / 100));

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.scale(transform.scale, transform.scale);
        ctx.globalAlpha = transform.opacity;

        // Base dimensions for 4 CESC Mercury 261 cabinets on slab (< 20 m²)
        // Slab: 4.5m x 4.4m (19.8 m²)
        const baseW = width * 0.35;
        const baseH = baseW * 0.55;

        // 2. Draw Concrete Slab (Dalle Béton < 20m²)
        if (transform.showSlab) {
          ctx.save();
          // Shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 8;

          // Slab Polygon (Isometric perspective effect)
          ctx.fillStyle = '#94a3b8'; // Slate 400 concrete color
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 4;

          ctx.beginPath();
          ctx.moveTo(-baseW / 2 - 20, -baseH / 2 + 10);
          ctx.lineTo(baseW / 2 + 20, -baseH / 2 - 10);
          ctx.lineTo(baseW / 2 + 10, baseH / 2 + 20);
          ctx.lineTo(-baseW / 2 - 10, baseH / 2 + 30);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // 3. Draw 4 CESC Mercury 261 Battery Cabinets
        const batteryImg = loadedImages.group || loadedImages.front;
        if (batteryImg) {
          ctx.drawImage(
            batteryImg,
            -baseW / 2,
            -baseH / 2,
            baseW,
            baseH
          );
        } else {
          // Fallback procedural rendering for 4 aligned cabinets
          const cabW = baseW / 4.2;
          const cabH = baseH * 0.8;
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;

          for (let i = 0; i < 4; i++) {
            const cx = -baseW / 2 + (i * (cabW + 6));
            const cy = -cabH / 2;
            ctx.fillRect(cx, cy, cabW, cabH);
            ctx.strokeRect(cx, cy, cabW, cabH);

            // Brand Label CESC 261
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(cx + 4, cy + cabH * 0.6, cabW - 8, 4);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('261', cx + cabW / 3, cy + cabH * 0.5);
          }
        }

        // 4. Draw Rigid Mesh Fence (Grillage Rigide Vert)
        if (transform.showFence) {
          ctx.strokeStyle = transform.fenceColor;
          ctx.lineWidth = 6;

          const fenceMargin = 25;
          const fx1 = -baseW / 2 - fenceMargin;
          const fy1 = -baseH / 2 - fenceMargin;
          const fx2 = baseW / 2 + fenceMargin;
          const fy2 = baseH / 2 + fenceMargin + 10;

          // Fence Outline Posts
          ctx.strokeRect(fx1, fy1, fx2 - fx1, fy2 - fy1);

          // Grid Texture Effect
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = transform.fenceColor + '88'; // semi-transparent

          for (let x = fx1 + 10; x < fx2; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, fy1);
            ctx.lineTo(x, fy2);
            ctx.stroke();
          }
        }

        ctx.restore();

        // 5. Watermark / Scale Badge (Conformité DP < 20m²)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(15, height - 55, 420, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 13px sans-serif';
        ctx.fillText('Station Stockage CESC Mercury 261 (4×125 kW = 500 kW)', 25, height - 35);
        ctx.fillStyle = '#22c55e';
        ctx.font = '500 11px sans-serif';
        ctx.fillText('Emprise au sol dalle béton : 19.80 m² (< 20 m²) • Clôture rigide 2.00m', 25, height - 20);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
    });
  };

  const handleExport = async () => {
    if (!photoSrc) {
      toast({ title: 'Photo manquante', description: 'Veuillez d\'abord charger une photo de terrain.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const dataUrl = await renderCanvas(true);
      if (onSaveSimulation) {
        onSaveSimulation(dataUrl);
      }
      toast({ title: 'Insertion paysagère générée', description: 'Le document graphique a été mis à jour avec succès.' });
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur d\'exportation', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Incrustation Paysagère Batterie Stand-Alone ({docType})
              </h2>
              <p className="text-xs text-slate-400">
                Placement 4 armoires CESC Mercury 261 sur dalle béton (&lt; 20 m²) avec clôture rigide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Photo Composite Area */}
          <div
            className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            {photoSrc ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center p-4">
                <img
                  src={photoSrc}
                  alt="Terrain d'origine"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800 shadow-xl pointer-events-none"
                />
                
                {/* Interactive Battery Overlay Layer */}
                <div
                  className="absolute transition-transform duration-75 pointer-events-none flex flex-col items-center"
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
                    opacity: transform.opacity
                  }}
                >
                  {/* Visual indication bounding box */}
                  <div className="relative border-2 border-emerald-500/60 rounded-lg p-2 bg-slate-900/60 backdrop-blur-xs shadow-2xl">
                    <img
                      src={loadedImages.group?.src || '/images/battery/cesc_mercury_group.jpg'}
                      alt="Batteries CESC Mercury 261"
                      className="w-[320px] h-[180px] object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    
                    {/* Render badge indicator */}
                    <div className="mt-1 flex items-center justify-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      Dalle béton 19.8 m² + Clôture rigide
                    </div>
                  </div>
                </div>

                {/* Floating Canvas controls helper */}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Move className="w-3 h-3 text-emerald-400" /> Clic + Glisser pour déplacer</span>
                  <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3 text-emerald-400" /> Molette pour zoomer</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Upload className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
                <h3 className="text-base font-semibold text-slate-300 mb-1">Aucune photo de terrain chargée</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Chargez une vue d'ensemble du site pour générer le document graphique réglementaire d'insertion (DPC6).
                </p>
                <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-lg">
                  <Upload className="w-4 h-4" />
                  Charger la photo du site
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Right Control Panel */}
          <div className="w-80 border-l border-slate-800 bg-slate-900/90 p-4 flex flex-col gap-5 overflow-y-auto">
            
            {/* Photo Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-400" /> Photo du site
              </label>
              <label className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer border border-slate-700 flex items-center justify-center gap-2 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {photoSrc ? 'Changer de photo' : 'Importer photo terrain'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {/* Presets & Layout */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Disposition
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActivePreset('group')}
                  className={`p-2 text-xs font-semibold rounded-lg border transition-all ${
                    activePreset === 'group'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Vue Groupée
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreset('aligned_4')}
                  className={`p-2 text-xs font-semibold rounded-lg border transition-all ${
                    activePreset === 'aligned_4'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  4 Alignées (1×4)
                </button>
              </div>
            </div>

            {/* Adjustments Sliders */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Réglages Fins
              </label>

              {/* Échelle / Zoom */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Taille (Échelle)</span>
                  <span className="font-mono text-emerald-400">{Math.round(transform.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.02"
                  value={transform.scale}
                  onChange={(e) => setTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-500 bg-slate-800 rounded h-1.5"
                />
              </div>

              {/* Rotation */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Rotation</span>
                  <span className="font-mono text-emerald-400">{transform.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={transform.rotation}
                  onChange={(e) => setTransform(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-500 bg-slate-800 rounded h-1.5"
                />
              </div>

              {/* Opacité */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Intégration (Opacité)</span>
                  <span className="font-mono text-emerald-400">{Math.round(transform.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={transform.opacity}
                  onChange={(e) => setTransform(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-500 bg-slate-800 rounded h-1.5"
                />
              </div>
            </div>

            {/* Elements Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Éléments du projet</label>
              
              <label className="flex items-center justify-between text-xs text-slate-300 p-2 bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-800">
                <span>Dalle Béton (&lt; 20 m²)</span>
                <input
                  type="checkbox"
                  checked={transform.showSlab}
                  onChange={(e) => setTransform(prev => ({ ...prev, showSlab: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 p-2 bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-800">
                <span>Clôture rigide (Vert RAL 6005)</span>
                <input
                  type="checkbox"
                  checked={transform.showFence}
                  onChange={(e) => setTransform(prev => ({ ...prev, showFence: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            {/* Spec Details Badge */}
            <div className="mt-auto p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[11px] space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Spécifications CESC Mercury 261
              </div>
              <div className="text-slate-300">
                • 4 armoires (125 kW / 261 kWh par armoire)
              </div>
              <div className="text-slate-300">
                • Puissance totale : <strong className="text-white">500 kW</strong>
              </div>
              <div className="text-slate-300">
                • Emprise au sol : <strong className="text-white">19.80 m²</strong> (&lt; 20 m²)
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Annuler
          </button>
          
          <button
            onClick={handleExport}
            disabled={isSaving || !photoSrc}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all"
          >
            {isSaving ? (
              <>Génération du document...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Valider et enregistrer l'insertion {docType}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
