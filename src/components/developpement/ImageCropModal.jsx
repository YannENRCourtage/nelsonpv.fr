import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move, Crop } from 'lucide-react';

/**
 * ImageCropModal — Composant de recadrage interactif sans altération de l'aspect ratio
 * Permet d'ajuster le zoom, le déplacement (pan) et le centrage d'une photo dans un conteneur 16:9 ou 4:3.
 */
export default function ImageCropModal({ isOpen, onClose, imageSrc, title = "Recadrer la photo", aspectRatio = 16 / 9, onCropComplete }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
        setImageLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Redessiner le canvas en temps réel
  useEffect(() => {
    if (!imageLoaded || !imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    const targetWidth = 800;
    const targetHeight = Math.round(targetWidth / aspectRatio);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Calcul de l'échelle object-fit cover
    const scaleCover = Math.max(targetWidth / img.width, targetHeight / img.height);
    const finalScale = scaleCover * scale;

    const drawWidth = img.width * finalScale;
    const drawHeight = img.height * finalScale;

    // Centrage avec offset utilisateur (position.x, position.y)
    const drawX = (targetWidth - drawWidth) / 2 + position.x;
    const drawY = (targetHeight - drawHeight) / 2 + position.y;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, [imageLoaded, scale, position, aspectRatio]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    try {
      const croppedDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.92);
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('Erreur export canvas recadré:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <Crop className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-gray-800">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Zone de recadrage interactive */}
          <div className="p-6 flex flex-col items-center justify-center bg-slate-900 select-none">
            <div
              className="relative overflow-hidden rounded-2xl border-2 border-dashed border-blue-400/60 shadow-2xl cursor-grab active:cursor-grabbing max-w-full"
              style={{ width: '100%', maxHeight: '420px', aspectRatio }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" />

              {/* Overlay de guidage visuel (grille tiers) */}
              <div className="absolute inset-0 border border-white/30 pointer-events-none grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>

              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-blue-400" /> Glissez pour déplacer l'image
              </div>
            </div>

            {/* Barre d'outils de zoom */}
            <div className="flex items-center gap-4 mt-5 bg-slate-800/90 text-white px-5 py-2.5 rounded-2xl border border-slate-700">
              <button
                onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                title="Dézoomer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.6"
                max="2.5"
                step="0.05"
                value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
                className="w-36 accent-blue-500 cursor-pointer"
              />

              <button
                onClick={() => setScale(prev => Math.min(2.5, prev + 0.1))}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                title="Zoomer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
                className="flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-400">Le recadrage conserve le ratio d'aspect exact du conteneur sans aucune déformation.</span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <Check className="w-4 h-4" /> Valider le recadrage
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
