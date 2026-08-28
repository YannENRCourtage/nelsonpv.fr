import React, { useRef } from 'react';
import { Battery, Camera } from 'lucide-react';

/**
 * BatteryStationVisualizer
 * Rendu SVG interactif 2D/3D avec cotations précises pour les stations de stockage batteries Stand-Alone (BESS)
 */
export default function BatteryStationVisualizer({
  batteryStorage = {},
  viewMode = '3D', // '3D' | '2D_FRONT' | '2D_TOP'
  showDimensions = true,
  onCapture = null,
}) {
  const svgRef = useRef(null);

  const quantity = Math.max(1, Number(batteryStorage.quantity) || 1);
  const model = batteryStorage.model || 'CESC Mercury 261';
  const powerKw = Number(batteryStorage.powerKw) || (quantity * 125);
  const capacityKwh = Number(batteryStorage.capacityKwh) || (quantity * 261);

  // Dimensions unitaires d'un container
  const cLen = Number(batteryStorage.unitLength) || (model.includes('Megapack') ? 7.10 : (model.includes('20ft') ? 6.05 : 3.50));
  const cWidth = Number(batteryStorage.unitWidth) || (model.includes('Megapack') ? 1.65 : (model.includes('20ft') ? 2.44 : 2.20));
  const cHeight = Number(batteryStorage.unitHeight) || (model.includes('Megapack') ? 2.80 : (model.includes('20ft') ? 2.59 : 2.60));

  // Dalle béton totale
  const dalleLength = Number(batteryStorage.dalleLength) || Math.max(6.0, Number((quantity * (cLen > 4 ? 4.0 : 3.2) + 3.0).toFixed(2)));
  const dalleWidth = Number(batteryStorage.dalleWidth) || (quantity > 4 ? 8.0 : 6.0);
  const dalleArea = Math.round(dalleLength * dalleWidth);

  // Méthode de capture haute résolution
  const handleSnapshot = () => {
    if (!svgRef.current || !onCapture) return;
    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 700;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        onCapture(dataUrl);
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.warn('[BatteryVisualizer] Snapshot error:', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-2xl overflow-hidden shadow-inner select-none">
      
      {/* Badge indicateur en haut à gauche */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/30 shadow-lg flex items-center gap-2">
          <Battery className="w-4 h-4 text-purple-400" />
          <span className="text-white font-bold text-xs">
            {quantity}× {model}
          </span>
          <span className="bg-purple-600/80 text-purple-100 text-[10px] font-bold px-1.5 py-0.5 rounded">
            {powerKw} kW / {capacityKwh} kWh
          </span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1.5">
          <span className="text-amber-400 font-semibold">Emprise dalle :</span>
          <span>{dalleLength}m × {dalleWidth}m (~{dalleArea} m²)</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-semibold">H :</span>
          <span>{cHeight.toFixed(2)}m</span>
        </div>
      </div>

      {/* Bouton de capture */}
      {onCapture && (
        <div className="absolute bottom-3 right-3 z-20">
          <button
            type="button"
            onClick={handleSnapshot}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Prendre une capture pour le dossier DP/PC"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capturer pour le dossier</span>
          </button>
        </div>
      )}

      {/* SVG Canvas de rendu */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-2">
        <svg
          ref={svgRef}
          viewBox="0 0 800 460"
          className="w-full h-full max-h-[100%] max-w-[100%] transition-all duration-300"
          style={{ background: 'transparent' }}
        >
          <defs>
            {/* Dégradés pour containers */}
            <linearGradient id="bat-container-front" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="bat-container-top" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="bat-container-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Dalle béton */}
            <linearGradient id="bat-concrete" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <pattern id="bat-concrete-pat" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 8 L 8 0 M 0 0 L 8 8" fill="none" stroke="#475569" strokeWidth="0.4" opacity="0.3" />
            </pattern>

            {/* Clôture */}
            <pattern id="bat-fence" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 0 6 L 6 0 M 0 0 L 6 6" fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>

          {/* MODE 1 : VUE 2D FAÇADE (ÉLÉVATION FRONTALE) */}
          {viewMode === '2D_FRONT' && (() => {
            const groundY = 360;
            const slabH = 14;
            const containerH = 140;
            const containerW = Math.min(130, Math.max(60, Math.floor(520 / quantity) - 15));
            const gap = Math.min(25, Math.max(10, Math.floor((560 - quantity * containerW) / (quantity + 1))));
            const totalGroupW = quantity * containerW + (quantity - 1) * gap;
            const startX = 400 - totalGroupW / 2;
            const slabW = totalGroupW + 100;
            const slabX = 400 - slabW / 2;

            return (
              <g id="view-2d-front">
                <text x="400" y="30" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold" letterSpacing="0.5">
                  ÉLÉVATION FRONTALE — STATION BATTERIES STAND-ALONE ({quantity} UNITÉS)
                </text>
                <text x="400" y="48" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  Containers métalliques RAL 7016 &bull; Dalle béton avec bac de rétention étanche &bull; Poste HTA
                </text>

                <line x1="40" y1={groundY} x2="760" y2={groundY} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" />
                <text x="50" y={groundY + 16} fill="#64748b" fontSize="10" fontStyle="italic">TN ±0.00</text>
                <text x="750" y={groundY + 16} textAnchor="end" fill="#64748b" fontSize="10" fontStyle="italic">Terrain naturel conservé</text>

                <rect x={slabX} y={groundY - slabH} width={slabW} height={slabH} fill="url(#bat-concrete)" stroke="#334155" strokeWidth="1.5" rx="1" />
                <rect x={slabX} y={groundY - slabH} width={slabW} height={slabH} fill="url(#bat-concrete-pat)" />
                <text x="400" y={groundY - 3} textAnchor="middle" fill="#1e293b" fontSize="8" fontWeight="bold">
                  Dalle béton armé étanche (Ép. 0.25m) — Bac de rétention intégré
                </text>

                {Array.from({ length: quantity }).map((_, idx) => {
                  const cx = startX + idx * (containerW + gap);
                  const cy = groundY - slabH - containerH;

                  return (
                    <g key={`front-c-${idx}`}>
                      <rect x={cx} y={cy} width={containerW} height={containerH} fill="url(#bat-container-front)" stroke="#0f172a" strokeWidth="2" rx="3" />
                      <rect x={cx + 6} y={cy - 10} width={containerW - 12} height={10} fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" rx="2" />
                      <line x1={cx + 12} y1={cy - 5} x2={cx + containerW - 12} y2={cy - 5} stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 2" />

                      <line x1={cx + containerW / 2} y1={cy + 6} x2={cx + containerW / 2} y2={cy + containerH - 6} stroke="#475569" strokeWidth="1.5" />
                      <circle cx={cx + containerW / 2 - 6} cy={cy + containerH / 2} r="2.5" fill="#94a3b8" />
                      <circle cx={cx + containerW / 2 + 6} cy={cy + containerH / 2} r="2.5" fill="#94a3b8" />

                      <rect x={cx + 8} y={cy + 14} width={containerW / 2 - 16} height={24} fill="#0f172a" rx="1.5" />
                      <rect x={cx + containerW / 2 + 8} y={cy + 14} width={containerW / 2 - 16} height={24} fill="#0f172a" rx="1.5" />
                      <line x1={cx + 10} y1={cy + 20} x2={cx + containerW / 2 - 10} y2={cy + 20} stroke="#334155" strokeWidth="1" />
                      <line x1={cx + 10} y1={cy + 26} x2={cx + containerW / 2 - 10} y2={cy + 26} stroke="#334155" strokeWidth="1" />
                      <line x1={cx + 10} y1={cy + 32} x2={cx + containerW / 2 - 10} y2={cy + 32} stroke="#334155" strokeWidth="1" />
                      <line x1={cx + containerW / 2 + 10} y1={cy + 20} x2={cx + containerW - 10} y2={cy + 20} stroke="#334155" strokeWidth="1" />
                      <line x1={cx + containerW / 2 + 10} y1={cy + 26} x2={cx + containerW - 10} y2={cy + 26} stroke="#334155" strokeWidth="1" />
                      <line x1={cx + containerW / 2 + 10} y1={cy + 32} x2={cx + containerW - 10} y2={cy + 32} stroke="#334155" strokeWidth="1" />

                      <polygon points={`${cx + containerW / 2},${cy + 52} ${cx + containerW / 2 - 8},${cy + 66} ${cx + containerW / 2 + 8},${cy + 66}`} fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                      <text x={cx + containerW / 2} y={cy + 63} textAnchor="middle" fill="#000" fontSize="7" fontWeight="900">⚡</text>

                      <circle cx={cx + containerW - 12} cy={cy + containerH - 24} r="4" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1" />
                      <circle cx={cx + 12} cy={cy + containerH - 24} r="3" fill="#22c55e" />

                      <rect x={cx + 8} y={cy + containerH - 18} width={containerW - 16} height={12} fill="#0f172a" rx="2" />
                      <text x={cx + containerW / 2} y={cy + containerH - 9} textAnchor="middle" fill="#e2e8f0" fontSize="7.5" fontWeight="bold">
                        BESS #{idx + 1} &bull; {Math.round(powerKw / quantity)} kW
                      </text>
                    </g>
                  );
                })}

                {/* Poste HTA / PDL */}
                {(() => {
                  const transfoX = slabX + slabW - 35;
                  const transfoY = groundY - slabH - 110;
                  return (
                    <g id="front-transfo">
                      <rect x={transfoX} y={transfoY} width="30" height="110" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" rx="2" />
                      <text x={transfoX + 15} y={transfoY + 50} textAnchor="middle" fill="#0f172a" fontSize="6.5" fontWeight="bold" transform={`rotate(-90 ${transfoX + 15} ${transfoY + 50})`}>
                        POSTE HTA / PDL
                      </text>
                      <polygon points={`${transfoX + 15},${transfoY + 12} ${transfoX + 9},${transfoY + 22} ${transfoX + 21},${transfoY + 22}`} fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
                      <text x={transfoX + 15} y={transfoY + 20} textAnchor="middle" fill="#000" fontSize="5.5" fontWeight="900">⚡</text>
                    </g>
                  );
                })()}

                {/* Clôture */}
                <rect x={slabX - 25} y={groundY - 105} width={slabW + 50} height="105" fill="url(#bat-fence)" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3 2" />
                <line x1={slabX - 25} y1={groundY - 105} x2={slabX - 25} y2={groundY} stroke="#334155" strokeWidth="3" />
                <line x1={slabX + slabW + 25} y1={groundY - 105} x2={slabX + slabW + 25} y2={groundY} stroke="#334155" strokeWidth="3" />
                <text x={slabX - 30} y={groundY - 50} textAnchor="end" fill="#94a3b8" fontSize="8" fontWeight="bold">
                  Clôture 2.00m
                </text>

                {/* Cotations */}
                {showDimensions && (
                  <g id="front-cotes">
                    <line x1={startX - 18} y1={groundY - slabH - containerH} x2={startX - 18} y2={groundY} stroke="#ef4444" strokeWidth="1.2" />
                    <line x1={startX - 23} y1={groundY - slabH - containerH} x2={startX - 13} y2={groundY - slabH - containerH} stroke="#ef4444" strokeWidth="1.2" />
                    <line x1={startX - 23} y1={groundY} x2={startX - 13} y2={groundY} stroke="#ef4444" strokeWidth="1.2" />
                    <text x={startX - 26} y={groundY - containerH / 2} textAnchor="end" fill="#ef4444" fontSize="10" fontWeight="bold">
                      H : {cHeight.toFixed(2)}m
                    </text>

                    <line x1={slabX} y1={groundY + 30} x2={slabX + slabW} y2={groundY + 30} stroke="#3b82f6" strokeWidth="1.2" />
                    <line x1={slabX} y1={groundY + 24} x2={slabX} y2={groundY + 36} stroke="#3b82f6" strokeWidth="1.2" />
                    <line x1={slabX + slabW} y1={groundY + 24} x2={slabX + slabW} y2={groundY + 36} stroke="#3b82f6" strokeWidth="1.2" />
                    <text x="400" y={groundY + 44} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">
                      Longueur Dalle Béton : {dalleLength.toFixed(2)}m (Surface ~{dalleArea} m²)
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* MODE 2 : VUE 2D PLAN DE MASSE */}
          {viewMode === '2D_TOP' && (() => {
            const slabX = 140;
            const slabY = 80;
            const slabW = 520;
            const slabH = 260;
            const containerW = Math.min(100, Math.floor((slabW - 140) / quantity));
            const containerH = 130;
            const gap = Math.max(15, Math.floor((slabW - 140 - quantity * containerW) / (quantity + 1)));

            return (
              <g id="view-2d-top">
                <text x="400" y="30" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold">
                  PLAN DE MASSE COTÉ &bull; STATION BATTERIES STAND-ALONE
                </text>
                <text x="400" y="48" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  Disposition des containers, distances d'isolement SDIS 5.00m &bull; Poste de livraison HTA
                </text>

                <rect x={slabX - 40} y={slabY - 25} width={slabW + 80} height={slabH + 50} fill="#0f172a" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" rx="4" />
                <text x={slabX - 35} y={slabY - 10} fill="#64748b" fontSize="8" fontWeight="bold">
                  Clôture grillagée périphérique (Hauteur 2.00m)
                </text>

                <rect x={slabX} y={slabY} width={slabW} height={slabH} fill="url(#bat-concrete)" stroke="#475569" strokeWidth="2" rx="2" />
                <rect x={slabX} y={slabY} width={slabW} height={slabH} fill="url(#bat-concrete-pat)" />
                <rect x={slabX + 4} y={slabY + 4} width={slabW - 8} height={slabH - 8} fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />

                {Array.from({ length: quantity }).map((_, idx) => {
                  const cx = slabX + 30 + idx * (containerW + gap);
                  const cy = slabY + (slabH - containerH) / 2;

                  return (
                    <g key={`top-c-${idx}`}>
                      <rect x={cx} y={cy} width={containerW} height={containerH} fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                      <line x1={cx} y1={cy + containerH / 2} x2={cx + containerW} y2={cy + containerH / 2} stroke="#334155" strokeWidth="1" />
                      <line x1={cx + containerW / 2} y1={cy} x2={cx + containerW / 2} y2={cy + containerH} stroke="#334155" strokeWidth="1" />

                      <circle cx={cx + containerW / 2} cy={cy + containerH * 0.25} r="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                      <circle cx={cx + containerW / 2} cy={cy + containerH * 0.75} r="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />

                      <text x={cx + containerW / 2} y={cy + containerH / 2 + 3} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                        BESS #{idx + 1}
                      </text>
                      <text x={cx + containerW / 2} y={cy + containerH / 2 + 13} textAnchor="middle" fill="#38bdf8" fontSize="6.5">
                        {Math.round(powerKw / quantity)} kW
                      </text>
                    </g>
                  );
                })}

                {/* Poste HTA / PDL */}
                {(() => {
                  const tx = slabX + slabW - 70;
                  const ty = slabY + (slabH - 90) / 2;
                  return (
                    <g id="top-transfo">
                      <rect x={tx} y={ty} width="50" height="90" fill="#334155" stroke="#facc15" strokeWidth="1.5" rx="2" />
                      <text x={tx + 25} y={ty + 40} textAnchor="middle" fill="#facc15" fontSize="8" fontWeight="bold">
                        POSTE HTA
                      </text>
                      <text x={tx + 25} y={ty + 52} textAnchor="middle" fill="#cbd5e1" fontSize="7">
                        PDL ENEDIS
                      </text>
                    </g>
                  );
                })()}

                <line x1={slabX + slabW / 2 - 25} y1={slabY + slabH + 25} x2={slabX + slabW / 2 + 25} y2={slabY + slabH + 25} stroke="#22c55e" strokeWidth="3" />
                <text x={slabX + slabW / 2} y={slabY + slabH + 38} textAnchor="middle" fill="#22c55e" fontSize="7.5" fontWeight="bold">
                  Portail d'accès SDIS & Maintenance (Largeur 4.00m)
                </text>

                {showDimensions && (
                  <g id="top-cotes">
                    <line x1={slabX} y1={slabY - 10} x2={slabX + slabW} y2={slabY - 10} stroke="#3b82f6" strokeWidth="1.2" />
                    <line x1={slabX} y1={slabY - 15} x2={slabX} y2={slabY - 5} stroke="#3b82f6" strokeWidth="1.2" />
                    <line x1={slabX + slabW} y1={slabY - 15} x2={slabX + slabW} y2={slabY - 5} stroke="#3b82f6" strokeWidth="1.2" />
                    <text x={slabX + slabW / 2} y={slabY - 14} textAnchor="middle" fill="#3b82f6" fontSize="9.5" fontWeight="bold">
                      Longueur dalle : {dalleLength.toFixed(2)}m
                    </text>

                    <line x1={slabX - 12} y1={slabY} x2={slabX - 12} y2={slabY + slabH} stroke="#ef4444" strokeWidth="1.2" />
                    <line x1={slabX - 17} y1={slabY} x2={slabX - 7} y2={slabY} stroke="#ef4444" strokeWidth="1.2" />
                    <line x1={slabX - 17} y1={slabY + slabH} x2={slabX - 7} y2={slabY + slabH} stroke="#ef4444" strokeWidth="1.2" />
                    <text x={slabX - 22} y={slabY + slabH / 2} textAnchor="end" fill="#ef4444" fontSize="9.5" fontWeight="bold">
                      Largeur : {dalleWidth.toFixed(2)}m
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* MODE 3 : VUE 3D ISOMÉTRIQUE */}
          {viewMode === '3D' && (() => {
            const originX = 180;
            const originY = 280;
            const isoScale = 22;

            const iso = (x, y, z) => ({
              px: originX + (x - y) * Math.cos(Math.PI / 6) * isoScale,
              py: originY + (x + y) * Math.sin(Math.PI / 6) * isoScale - z * isoScale,
            });

            const slX = Math.min(22, dalleLength);
            const slY = Math.min(10, dalleWidth);
            const p0 = iso(0, 0, 0);
            const p1 = iso(slX, 0, 0);
            const p2 = iso(slX, slY, 0);
            const p3 = iso(0, slY, 0);

            const p0_b = iso(0, 0, -0.4);
            const p1_b = iso(slX, 0, -0.4);
            const p2_b = iso(slX, slY, -0.4);
            const p3_b = iso(0, slY, -0.4);

            return (
              <g id="view-3d-iso">
                <text x="400" y="30" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold">
                  VUE 3D ISOMÉTRIQUE &bull; CENTRALE DE STOCKAGE BATTERIES
                </text>
                <text x="400" y="48" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  {quantity} container(s) {model} ({powerKw} kW / {capacityKwh} kWh) sur dalle béton armé
                </text>

                <polygon
                  points={`${p0_b.px - 20},${p0_b.py + 10} ${p1_b.px + 20},${p1_b.py + 10} ${p2_b.px + 20},${p2_b.py + 10} ${p3_b.px - 20},${p3_b.py + 10}`}
                  fill="#020617"
                  opacity="0.6"
                />

                <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p1_b.px},${p1_b.py} ${p0_b.px},${p0_b.py}`} fill="#475569" />
                <polygon points={`${p1.px},${p1.py} ${p2.px},${p2.py} ${p2_b.px},${p2_b.py} ${p1_b.px},${p1_b.py}`} fill="#334155" />

                <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`} fill="url(#bat-concrete)" stroke="#475569" strokeWidth="1.5" />

                {Array.from({ length: quantity }).map((_, idx) => {
                  const cLen3d = 3.0;
                  const cWidth3d = 2.0;
                  const cHeight3d = 2.4;
                  const spacing = (slX - 4.0) / Math.max(1, quantity);
                  const posX = 1.5 + idx * spacing;
                  const posY = 1.5;

                  const b_f0 = iso(posX, posY, 0);
                  const b_f1 = iso(posX + cLen3d, posY, 0);
                  const b_f2 = iso(posX + cLen3d, posY + cWidth3d, 0);
                  const b_f3 = iso(posX, posY + cWidth3d, 0);

                  const b_t0 = iso(posX, posY, cHeight3d);
                  const b_t1 = iso(posX + cLen3d, posY, cHeight3d);
                  const b_t2 = iso(posX + cLen3d, posY + cWidth3d, cHeight3d);
                  const b_t3 = iso(posX, posY + cWidth3d, cHeight3d);

                  return (
                    <g key={`iso-c-${idx}`}>
                      <polygon points={`${b_f0.px},${b_f0.py} ${b_f1.px},${b_f1.py} ${b_t1.px},${b_t1.py} ${b_t0.px},${b_t0.py}`} fill="url(#bat-container-front)" stroke="#0f172a" strokeWidth="1.5" />
                      <polygon points={`${b_f1.px},${b_f1.py} ${b_f2.px},${b_f2.py} ${b_t2.px},${b_t2.py} ${b_t1.px},${b_t1.py}`} fill="url(#bat-container-side)" stroke="#0f172a" strokeWidth="1.5" />
                      <polygon points={`${b_t0.px},${b_t0.py} ${b_t1.px},${b_t1.py} ${b_t2.px},${b_t2.py} ${b_t3.px},${b_t3.py}`} fill="url(#bat-container-top)" stroke="#0f172a" strokeWidth="1.5" />

                      <line x1={(b_f0.px + b_f1.px) / 2} y1={(b_f0.py + b_f1.py) / 2} x2={(b_t0.px + b_t1.px) / 2} y2={(b_t0.py + b_t1.py) / 2} stroke="#64748b" strokeWidth="1" />
                      <circle cx={(b_f0.px + b_f1.px) / 2 - 4} cy={(b_f0.py + b_t0.py) / 2} r="1.5" fill="#facc15" />
                      <circle cx={(b_f0.px + b_f1.px) / 2 + 4} cy={(b_f0.py + b_t0.py) / 2} r="1.5" fill="#facc15" />

                      <rect x={b_t0.px + 4} y={b_t0.py - 6} width="14" height="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" rx="1" transform="rotate(-15)" />
                    </g>
                  );
                })}

                {/* Transformateur HTA 3D */}
                {(() => {
                  const tPosX = slX - 3.5;
                  const tPosY = 1.2;
                  const tLen = 2.2;
                  const tW = 1.8;
                  const tH = 2.0;

                  const t_f0 = iso(tPosX, tPosY, 0);
                  const t_f1 = iso(tPosX + tLen, tPosY, 0);
                  const t_f2 = iso(tPosX + tLen, tPosY + tW, 0);
                  const t_f3 = iso(tPosX, tPosY + tW, 0);

                  const t_t0 = iso(tPosX, tPosY, tH);
                  const t_t1 = iso(tPosX + tLen, tPosY, tH);
                  const t_t2 = iso(tPosX + tLen, tPosY + tW, tH);
                  const t_t3 = iso(tPosX, tPosY + tW, tH);

                  return (
                    <g id="iso-transfo">
                      <polygon points={`${t_f0.px},${t_f0.py} ${t_f1.px},${t_f1.py} ${t_t1.px},${t_t1.py} ${t_t0.px},${t_t0.py}`} fill="#cbd5e1" stroke="#334155" strokeWidth="1.2" />
                      <polygon points={`${t_f1.px},${t_f1.py} ${t_f2.px},${t_f2.py} ${t_t2.px},${t_t2.py} ${t_t1.px},${t_t1.py}`} fill="#94a3b8" stroke="#334155" strokeWidth="1.2" />
                      <polygon points={`${t_t0.px},${t_t0.py} ${t_t1.px},${t_t1.py} ${t_t2.px},${t_t2.py} ${t_t3.px},${t_t3.py}`} fill="#e2e8f0" stroke="#334155" strokeWidth="1.2" />
                      <text x={(t_f0.px + t_f1.px) / 2} y={(t_f0.py + t_t0.py) / 2} textAnchor="middle" fill="#0f172a" fontSize="6" fontWeight="bold">
                        HTA
                      </text>
                    </g>
                  );
                })()}

                {/* Clôture 3D */}
                {(() => {
                  const cP0 = iso(-1, -1, 0);
                  const cP1 = iso(slX + 1, -1, 0);
                  const cP2 = iso(slX + 1, slY + 1, 0);
                  const cP3 = iso(-1, slY + 1, 0);

                  const cP0_t = iso(-1, -1, 1.8);
                  const cP1_t = iso(slX + 1, -1, 1.8);
                  const cP2_t = iso(slX + 1, slY + 1, 1.8);
                  const cP3_t = iso(-1, slY + 1, 1.8);

                  return (
                    <g id="iso-fence" opacity="0.65">
                      <line x1={cP0.px} y1={cP0.py} x2={cP1.px} y2={cP1.py} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
                      <line x1={cP1.px} y1={cP1.py} x2={cP2.px} y2={cP2.py} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
                      <line x1={cP0.px} y1={cP0.py} x2={cP0_t.px} y2={cP0_t.py} stroke="#64748b" strokeWidth="2.5" />
                      <line x1={cP1.px} y1={cP1.py} x2={cP1_t.px} y2={cP1_t.py} stroke="#64748b" strokeWidth="2.5" />
                      <line x1={cP2.px} y1={cP2.py} x2={cP2_t.px} y2={cP2_t.py} stroke="#64748b" strokeWidth="2.5" />
                      <line x1={cP0_t.px} y1={cP0_t.py} x2={cP1_t.px} y2={cP1_t.py} stroke="#64748b" strokeWidth="1.5" />
                      <line x1={cP1_t.px} y1={cP1_t.py} x2={cP2_t.px} y2={cP2_t.py} stroke="#64748b" strokeWidth="1.5" />
                    </g>
                  );
                })()}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}