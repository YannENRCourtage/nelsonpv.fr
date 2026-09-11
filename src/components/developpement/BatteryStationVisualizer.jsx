import React, { useRef } from 'react';
import { Battery, Camera, Shield } from 'lucide-react';

/**
 * BatteryStationVisualizer
 * Rendu SVG interactif 2D/3D avec cotations précises pour la Station Batteries Stand-Alone (500 kW)
 * Modèle CESC Mercury 261 : 4 armoires alignées (H 2.38m × P 1.44m × L 1.15m) sur dalle béton unique (< 20m²)
 * Entourée d'une clôture rigide métallique (vert / gris) — Sans aucun transformateur HTA sur la dalle.
 */
export default function BatteryStationVisualizer({
  batteryStorage = {},
  viewMode = '3D', // '3D' | '2D_FRONT' | '2D_TOP'
  showDimensions = true,
  onCapture = null,
}) {
  const svgRef = useRef(null);

  const quantity = Math.max(1, Number(batteryStorage.quantity) || 4);
  const model = batteryStorage.model || 'CESC Mercury 261';
  const powerKw = Number(batteryStorage.powerKw) || (quantity * 125);
  const capacityKwh = Number(batteryStorage.capacityKwh) || (quantity * 261);

  // Dimensions unitaires strictes d'une armoire CESC Mercury 261
  const cWidth = 1.15;  // Largeur unitaire (face) : 1.15 m
  const cDepth = 1.44;  // Profondeur unitaire : 1.44 m
  const cHeight = 2.38; // Hauteur unitaire : 2.38 m

  // Dalle béton unique (strictement < 20 m² : 6.20m × 3.20m = 19.84 m²)
  const dalleLength = Number(batteryStorage.dalleLength) || 6.20;
  const dalleWidth = Number(batteryStorage.dalleWidth) || 3.20;
  const dalleArea = Number((dalleLength * dalleWidth).toFixed(2));

  // Méthode de capture haute résolution pour le dossier d'urbanisme (DP4 / DP5)
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
        canvas.width = 1400;
        canvas.height = 800;
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
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/40 shadow-lg flex items-center gap-2">
          <Battery className="w-4 h-4 text-purple-400" />
          <span className="text-white font-bold text-xs">
            {quantity}× {model}
          </span>
          <span className="bg-purple-600/90 text-purple-100 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
            {powerKw} kW / {capacityKwh} kWh
          </span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 flex items-center gap-2">
          <span className="text-amber-400 font-semibold">Dalle béton :</span>
          <span className="font-bold text-white">{dalleLength.toFixed(2)}m × {dalleWidth.toFixed(2)}m ({dalleArea} m² &lt; 20 m²)</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-semibold">Armoire :</span>
          <span>{cHeight.toFixed(2)}m (H) × {cDepth.toFixed(2)}m (P) × {cWidth.toFixed(2)}m (L)</span>
        </div>
      </div>

      {/* Bouton de capture */}
      {onCapture && (
        <div className="absolute bottom-3 right-3 z-20">
          <button
            type="button"
            onClick={handleSnapshot}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Prendre une capture pour la pièce DP4 / DP5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capturer vue pour le dossier</span>
          </button>
        </div>
      )}

      {/* SVG Canvas de rendu */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-2">
        <svg
          ref={svgRef}
          viewBox="0 0 840 480"
          className="w-full h-full max-h-[100%] max-w-[100%] transition-all duration-300"
          style={{ background: 'transparent' }}
        >
          <defs>
            {/* Dégradés pour armoires CESC 261 Mercury (Blanc pur & détails fins) */}
            <linearGradient id="bat-cesc-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="85%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>

            <linearGradient id="bat-cesc-base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <linearGradient id="bat-cesc-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <linearGradient id="bat-cesc-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Dalle béton */}
            <linearGradient id="bat-concrete" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <pattern id="bat-concrete-pat" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 8 L 8 0 M 0 0 L 8 8" fill="none" stroke="#475569" strokeWidth="0.4" opacity="0.3" />
            </pattern>

            {/* Clôture métallique rigide (Grillage vert foncé RAL 6005) */}
            <pattern id="bat-fence-mesh" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 0 3 L 6 3 M 3 0 L 3 6" fill="none" stroke="#15803d" strokeWidth="0.6" opacity="0.75" />
            </pattern>
          </defs>

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* MODE 1 : VUE 2D FAÇADE (ÉLÉVATION FRONTALE) — DP4                               */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {viewMode === '2D_FRONT' && (() => {
            const groundY = 380;
            const slabH = 16;
            const containerH = 175; // Représentation proportionnelle (2.38m)
            const containerW = 85;  // Représentation proportionnelle (1.15m)
            const gap = 16;         // Espace inter-armoires
            const totalArmoiresW = quantity * containerW + (quantity - 1) * gap;
            const startX = 420 - totalArmoiresW / 2;
            const slabW = totalArmoiresW + 110;
            const slabX = 420 - slabW / 2;

            return (
              <g id="view-2d-front">
                {/* Titre & sous-titre officiel DP4 */}
                <text x="420" y="32" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold" letterSpacing="0.5">
                  ÉLÉVATION FRONTALE — STATION BATTERIES STAND-ALONE ({quantity}× CESC 261)
                </text>
                <text x="420" y="50" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  4 armoires alignées (500 kW / 1044 kWh) &bull; Dalle béton armé étanche &bull; Clôture rigide 2.00m
                </text>

                {/* Ligne de Terrain Naturel (TN) */}
                <line x1="40" y1={groundY} x2="800" y2={groundY} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" />
                <text x="50" y={groundY + 16} fill="#64748b" fontSize="10" fontStyle="italic">TN ±0.00</text>
                <text x="790" y={groundY + 16} textAnchor="end" fill="#64748b" fontSize="10" fontStyle="italic">Terrain naturel conservé</text>

                {/* Dalle béton armé */}
                <rect x={slabX} y={groundY - slabH} width={slabW} height={slabH} fill="url(#bat-concrete)" stroke="#334155" strokeWidth="1.5" rx="1" />
                <rect x={slabX} y={groundY - slabH} width={slabW} height={slabH} fill="url(#bat-concrete-pat)" />
                <text x="420" y={groundY - 4} textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">
                  Dalle béton armé étanche &mdash; Emprise {dalleArea} m² (&lt; 20 m²)
                </text>

                {/* 4 Armoires CESC Mercury 261 alignées */}
                {Array.from({ length: quantity }).map((_, idx) => {
                  const cx = startX + idx * (containerW + gap);
                  const cy = groundY - slabH - containerH;

                  return (
                    <g key={`front-c-${idx}`}>
                      {/* Socle métallique gris foncé */}
                      <rect x={cx - 2} y={groundY - slabH - 8} width={containerW + 4} height={8} fill="url(#bat-cesc-base)" stroke="#334155" strokeWidth="1" rx="1" />
                      
                      {/* Corps de l'armoire blanc pur */}
                      <rect x={cx} y={cy} width={containerW} height={containerH - 8} fill="url(#bat-cesc-body)" stroke="#64748b" strokeWidth="1.5" rx="3" />
                      
                      {/* Casquette supérieure biseautée */}
                      <rect x={cx} y={cy} width={containerW} height={5} fill="#cbd5e1" rx="1" />

                      {/* Grille de ventilation supérieure */}
                      <rect x={cx + 6} y={cy + 8} width={containerW - 12} height={18} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" rx="1" />
                      {Array.from({ length: 6 }).map((_, gIdx) => (
                        <line key={`g-top-${gIdx}`} x1={cx + 8} y1={cy + 11 + gIdx * 2.5} x2={cx + containerW - 8} y2={cy + 11 + gIdx * 2.5} stroke="#64748b" strokeWidth="0.8" />
                      ))}

                      {/* Logo CESC */}
                      <text x={cx + 8} y={cy + 40} fill="#334155" fontSize="8" fontWeight="900" letterSpacing="0.3">
                        CESC
                      </text>

                      {/* Bandeau vertical indicateurs LED droite */}
                      <rect x={cx + containerW - 13} y={cy + 34} width={7} height={40} fill="#1e293b" rx="3.5" />
                      <circle cx={cx + containerW - 9.5} cy={cy + 40} r="1.5" fill="#22c55e" />
                      <circle cx={cx + containerW - 9.5} cy={cy + 48} r="1.5" fill="#facc15" />
                      <circle cx={cx + containerW - 9.5} cy={cy + 56} r="1.5" fill="#ef4444" />
                      <circle cx={cx + containerW - 9.5} cy={cy + 66} r="2.2" fill="#dc2626" stroke="#ffffff" strokeWidth="0.5" />

                      {/* Poignée porte gauche */}
                      <rect x={cx - 1.5} y={cy + containerH / 2 - 12} width={3} height={18} fill="#1e293b" rx="1" />

                      {/* Marquage "261 MERCURY" */}
                      <text x={cx + containerW - 12} y={cy + containerH / 2 + 6} textAnchor="end" fill="#0f172a" fontSize="13" fontWeight="900">
                        261
                      </text>
                      <text x={cx + containerW - 12} y={cy + containerH / 2 + 15} textAnchor="end" fill="#64748b" fontSize="6.5" fontWeight="bold" letterSpacing="0.5">
                        MERCURY
                      </text>

                      {/* Trait graphique vert chartreuse CESC */}
                      <path
                        d={`M ${cx} ${cy + containerH / 2 + 28} L ${cx + 16} ${cy + containerH / 2 + 28} Q ${cx + 28} ${cy + containerH / 2 + 28} ${cx + 34} ${cy + containerH / 2 + 20} Q ${cx + 40} ${cy + containerH / 2 + 12} ${cx + containerW} ${cy + containerH / 2 + 12}`}
                        fill="none"
                        stroke="#84cc16"
                        strokeWidth="3.5"
                      />

                      {/* Triangle danger électrique */}
                      <polygon
                        points={`${cx + containerW / 2},${cy + containerH / 2 + 22} ${cx + containerW / 2 - 7},${cy + containerH / 2 + 35} ${cx + containerW / 2 + 7},${cy + containerH / 2 + 35}`}
                        fill="#facc15"
                        stroke="#ca8a04"
                        strokeWidth="0.8"
                      />
                      <text x={cx + containerW / 2} y={cy + containerH / 2 + 33} textAnchor="middle" fill="#000" fontSize="7" fontWeight="900">⚡</text>

                      {/* Grille de ventilation inférieure */}
                      <rect x={cx + 6} y={cy + containerH - 42} width={containerW - 12} height={28} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" rx="1" />
                      {Array.from({ length: 9 }).map((_, gIdx) => (
                        <line key={`g-bot-${gIdx}`} x1={cx + 8} y1={cy + containerH - 39 + gIdx * 2.8} x2={cx + containerW - 8} y2={cy + containerH - 39 + gIdx * 2.8} stroke="#64748b" strokeWidth="0.8" />
                      ))}

                      {/* Libellé armoire */}
                      <rect x={cx + 10} y={cy + containerH - 12} width={containerW - 20} height={10} fill="#0f172a" rx="2" />
                      <text x={cx + containerW / 2} y={cy + containerH - 4} textAnchor="middle" fill="#e2e8f0" fontSize="6.5" fontWeight="bold">
                        Armoire #{idx + 1} &bull; 125 kW
                      </text>
                    </g>
                  );
                })}

                {/* Clôture grillagée rigide périphérique (Hauteur 2.00m) — Vert foncé */}
                <rect x={slabX - 18} y={groundY - 145} width={slabW + 36} height="145" fill="url(#bat-fence-mesh)" stroke="#15803d" strokeWidth="1.2" />
                {/* Poteaux rigides */}
                <line x1={slabX - 18} y1={groundY - 145} x2={slabX - 18} y2={groundY} stroke="#166534" strokeWidth="4" />
                <line x1={slabX + slabW + 18} y1={groundY - 145} x2={slabX + slabW + 18} y2={groundY} stroke="#166534" strokeWidth="4" />
                <text x={slabX - 22} y={groundY - 70} textAnchor="end" fill="#86efac" fontSize="8.5" fontWeight="bold">
                  Clôture rigide H 2.00m
                </text>

                {/* Cotations dimensionnelles */}
                {showDimensions && (
                  <g id="front-cotes">
                    {/* Hauteur Armoire (2.38 m) */}
                    <line x1={startX - 22} y1={groundY - slabH - containerH} x2={startX - 22} y2={groundY - slabH} stroke="#ef4444" strokeWidth="1.3" />
                    <line x1={startX - 27} y1={groundY - slabH - containerH} x2={startX - 17} y2={groundY - slabH - containerH} stroke="#ef4444" strokeWidth="1.3" />
                    <line x1={startX - 27} y1={groundY - slabH} x2={startX - 17} y2={groundY - slabH} stroke="#ef4444" strokeWidth="1.3" />
                    <text x={startX - 30} y={groundY - slabH - containerH / 2 + 4} textAnchor="end" fill="#ef4444" fontSize="10.5" fontWeight="bold">
                      H : {cHeight.toFixed(2)} m
                    </text>

                    {/* Longueur Dalle Béton (6.20 m) */}
                    <line x1={slabX} y1={groundY + 30} x2={slabX + slabW} y2={groundY + 30} stroke="#3b82f6" strokeWidth="1.3" />
                    <line x1={slabX} y1={groundY + 24} x2={slabX} y2={groundY + 36} stroke="#3b82f6" strokeWidth="1.3" />
                    <line x1={slabX + slabW} y1={groundY + 24} x2={slabX + slabW} y2={groundY + 36} stroke="#3b82f6" strokeWidth="1.3" />
                    <text x="420" y={groundY + 45} textAnchor="middle" fill="#3b82f6" fontSize="10.5" fontWeight="bold">
                      Longueur dalle béton : {dalleLength.toFixed(2)} m (Emprise totale ~{dalleArea} m² &lt; 20 m²)
                    </text>

                    {/* Largeur unitaire armoire (1.15 m) */}
                    <line x1={startX} y1={groundY - slabH - containerH - 12} x2={startX + containerW} y2={groundY - slabH - containerH - 12} stroke="#10b981" strokeWidth="1" />
                    <line x1={startX} y1={groundY - slabH - containerH - 16} x2={startX} y2={groundY - slabH - containerH - 8} stroke="#10b981" strokeWidth="1" />
                    <line x1={startX + containerW} y1={groundY - slabH - containerH - 16} x2={startX + containerW} y2={groundY - slabH - containerH - 8} stroke="#10b981" strokeWidth="1" />
                    <text x={startX + containerW / 2} y={groundY - slabH - containerH - 16} textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">
                      L : {cWidth.toFixed(2)} m
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* MODE 2 : VUE 2D PLAN DE MASSE (VUE DE DESSUS) — DP2                              */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {viewMode === '2D_TOP' && (() => {
            const slabX = 160;
            const slabY = 100;
            const slabW = 520; // 6.20 m
            const slabH = 240; // 3.20 m
            const containerW = 85;  // 1.15 m
            const containerH = 125; // 1.44 m
            const gap = 24;
            const totalArmoiresW = quantity * containerW + (quantity - 1) * gap;
            const startX = slabX + (slabW - totalArmoiresW) / 2;
            const startY = slabY + (slabH - containerH) / 2;

            return (
              <g id="view-2d-top">
                <text x="420" y="32" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold">
                  PLAN DE MASSE COTÉ &bull; STATION BATTERIES STAND-ALONE (500 kW)
                </text>
                <text x="420" y="50" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  4 armoires CESC 261 sur dalle béton ({dalleLength.toFixed(2)}m × {dalleWidth.toFixed(2)}m) &bull; Clôture rigide avec portail de maintenance
                </text>

                {/* Périmètre clôture métallique rigide */}
                <rect x={slabX - 30} y={slabY - 25} width={slabW + 60} height={slabH + 50} fill="#0b1329" stroke="#15803d" strokeWidth="1.8" strokeDasharray="5 3" rx="4" />
                <text x={slabX - 25} y={slabY - 12} fill="#86efac" fontSize="8.5" fontWeight="bold">
                  Clôture métallique rigide (H 2.00m)
                </text>

                {/* Dalle béton */}
                <rect x={slabX} y={slabY} width={slabW} height={slabH} fill="url(#bat-concrete)" stroke="#475569" strokeWidth="2" rx="2" />
                <rect x={slabX} y={slabY} width={slabW} height={slabH} fill="url(#bat-concrete-pat)" />
                <rect x={slabX + 4} y={slabY + 4} width={slabW - 8} height={slabH - 8} fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />

                {/* 4 Armoires alignées de dessus */}
                {Array.from({ length: quantity }).map((_, idx) => {
                  const cx = startX + idx * (containerW + gap);
                  const cy = startY;

                  return (
                    <g key={`top-c-${idx}`}>
                      <rect x={cx} y={cy} width={containerW} height={containerH} fill="#ffffff" stroke="#0284c7" strokeWidth="2" rx="3" />
                      
                      {/* Lignes d'ouverture des portes frontales */}
                      <line x1={cx} y1={cy + containerH - 8} x2={cx + containerW} y2={cy + containerH - 8} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                      
                      {/* Grilles de toit */}
                      <rect x={cx + 8} y={cy + 10} width={containerW - 16} height={containerH - 30} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="1.5" />
                      <circle cx={cx + containerW / 2} cy={cy + containerH * 0.35} r="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                      <circle cx={cx + containerW / 2} cy={cy + containerH * 0.65} r="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

                      <text x={cx + containerW / 2} y={cy + containerH / 2 - 2} textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">
                        CESC #{idx + 1}
                      </text>
                      <text x={cx + containerW / 2} y={cy + containerH / 2 + 8} textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="bold">
                        125 kW
                      </text>
                    </g>
                  );
                })}

                {/* Portail d'accès & maintenance */}
                <line x1={slabX + slabW / 2 - 30} y1={slabY + slabH + 25} x2={slabX + slabW / 2 + 30} y2={slabY + slabH + 25} stroke="#22c55e" strokeWidth="3" />
                <text x={slabX + slabW / 2} y={slabY + slabH + 38} textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="bold">
                  Portail d'accès pompier SDIS &amp; Maintenance (Largeur 4.00m)
                </text>

                {/* Cotations */}
                {showDimensions && (
                  <g id="top-cotes">
                    {/* Longueur Dalle (6.20 m) */}
                    <line x1={slabX} y1={slabY - 10} x2={slabX + slabW} y2={slabY - 10} stroke="#3b82f6" strokeWidth="1.3" />
                    <line x1={slabX} y1={slabY - 15} x2={slabX} y2={slabY - 5} stroke="#3b82f6" strokeWidth="1.3" />
                    <line x1={slabX + slabW} y1={slabY - 15} x2={slabX + slabW} y2={slabY - 5} stroke="#3b82f6" strokeWidth="1.3" />
                    <text x={slabX + slabW / 2} y={slabY - 14} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">
                      Longueur dalle : {dalleLength.toFixed(2)} m
                    </text>

                    {/* Largeur Dalle (3.20 m) */}
                    <line x1={slabX - 12} y1={slabY} x2={slabX - 12} y2={slabY + slabH} stroke="#ef4444" strokeWidth="1.3" />
                    <line x1={slabX - 17} y1={slabY} x2={slabX - 7} y2={slabY} stroke="#ef4444" strokeWidth="1.3" />
                    <line x1={slabX - 17} y1={slabY + slabH} x2={slabX - 7} y2={slabY + slabH} stroke="#ef4444" strokeWidth="1.3" />
                    <text x={slabX - 22} y={slabY + slabH / 2 + 4} textAnchor="end" fill="#ef4444" fontSize="10" fontWeight="bold">
                      Largeur : {dalleWidth.toFixed(2)} m (Surface : {dalleArea} m² &lt; 20 m²)
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* MODE 3 : VUE 3D ISOMÉTRIQUE & PERSPECTIVE — DP4 / DP6                            */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {viewMode === '3D' && (() => {
            const originX = 220;
            const originY = 290;
            const isoScale = 25;

            const iso = (x, y, z) => ({
              px: originX + (x - y) * Math.cos(Math.PI / 6) * isoScale,
              py: originY + (x + y) * Math.sin(Math.PI / 6) * isoScale - z * isoScale,
            });

            // Dimensions réduites à l'échelle pour affichage équilibré
            const slX = 15.5; // Correspondant à dalleLength 6.20m
            const slY = 8.0;  // Correspondant à dalleWidth 3.20m

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
                <text x="420" y="32" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold">
                  VUE 3D ISOMÉTRIQUE &bull; STATION DE STOCKAGE BATTERIES STAND-ALONE
                </text>
                <text x="420" y="50" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  4 armoires CESC Mercury 261 (500 kW / 1044 kWh) sur dalle béton armé ceinturée par clôture rigide
                </text>

                {/* Ombre portée au sol */}
                <polygon
                  points={`${p0_b.px - 15},${p0_b.py + 8} ${p1_b.px + 15},${p1_b.py + 8} ${p2_b.px + 15},${p2_b.py + 8} ${p3_b.px - 15},${p3_b.py + 8}`}
                  fill="#020617"
                  opacity="0.6"
                />

                {/* Tranches latérales de la dalle béton */}
                <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p1_b.px},${p1_b.py} ${p0_b.px},${p0_b.py}`} fill="#475569" />
                <polygon points={`${p1.px},${p1.py} ${p2.px},${p2.py} ${p2_b.px},${p2_b.py} ${p1_b.px},${p1_b.py}`} fill="#334155" />

                {/* Dessus de la dalle béton */}
                <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`} fill="url(#bat-concrete)" stroke="#475569" strokeWidth="1.5" />

                {/* 4 Armoires CESC 261 en 3D alignées */}
                {Array.from({ length: quantity }).map((_, idx) => {
                  const cLen3d = 2.4;  // largeur face 3D
                  const cWidth3d = 3.0; // profondeur 3D
                  const cHeight3d = 4.8; // hauteur 3D (2.38m)
                  const spacing = (slX - 3.2) / quantity;
                  const posX = 1.6 + idx * spacing;
                  const posY = 2.4;

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
                      {/* Face avant (Blanche CESC) */}
                      <polygon points={`${b_f0.px},${b_f0.py} ${b_f1.px},${b_f1.py} ${b_t1.px},${b_t1.py} ${b_t0.px},${b_t0.py}`} fill="url(#bat-cesc-body)" stroke="#64748b" strokeWidth="1.2" />
                      
                      {/* Face latérale droite */}
                      <polygon points={`${b_f1.px},${b_f1.py} ${b_f2.px},${b_f2.py} ${b_t2.px},${b_t2.py} ${b_t1.px},${b_t1.py}`} fill="url(#bat-cesc-side)" stroke="#64748b" strokeWidth="1.2" />
                      
                      {/* Face supérieure (Toit) */}
                      <polygon points={`${b_t0.px},${b_t0.py} ${b_t1.px},${b_t1.py} ${b_t2.px},${b_t2.py} ${b_t3.px},${b_t3.py}`} fill="url(#bat-cesc-top)" stroke="#64748b" strokeWidth="1.2" />

                      {/* Ligne médiane de porte */}
                      <line x1={(b_f0.px + b_f1.px) / 2} y1={(b_f0.py + b_f1.py) / 2} x2={(b_t0.px + b_t1.px) / 2} y2={(b_t0.py + b_t1.py) / 2} stroke="#cbd5e1" strokeWidth="1" />
                      
                      {/* Grille supérieure & bandeau CESC vert */}
                      <line x1={b_f0.px + 4} y1={b_t0.py + 10} x2={b_f1.px - 4} y2={b_t1.py + 10} stroke="#84cc16" strokeWidth="2" />
                      <circle cx={(b_f0.px + b_f1.px) / 2} cy={(b_f0.py + b_t0.py) / 2 + 10} r="2" fill="#facc15" />
                    </g>
                  );
                })}

                {/* Clôture métallique rigide 3D entourant la dalle (SANS aucun transformateur) */}
                {(() => {
                  const cP0 = iso(-0.8, -0.8, 0);
                  const cP1 = iso(slX + 0.8, -0.8, 0);
                  const cP2 = iso(slX + 0.8, slY + 0.8, 0);
                  const cP3 = iso(-0.8, slY + 0.8, 0);

                  const cP0_t = iso(-0.8, -0.8, 3.8); // 2.00m de hauteur
                  const cP1_t = iso(slX + 0.8, -0.8, 3.8);
                  const cP2_t = iso(slX + 0.8, slY + 0.8, 3.8);
                  const cP3_t = iso(-0.8, slY + 0.8, 3.8);

                  return (
                    <g id="iso-fence" opacity="0.8">
                      {/* Grillage maillé transparent vert foncé */}
                      <polygon points={`${cP0.px},${cP0.py} ${cP1.px},${cP1.py} ${cP1_t.px},${cP1_t.py} ${cP0_t.px},${cP0_t.py}`} fill="#15803d" fillOpacity="0.08" stroke="#15803d" strokeWidth="1.2" strokeDasharray="3 2" />
                      <polygon points={`${cP1.px},${cP1.py} ${cP2.px},${cP2.py} ${cP2_t.px},${cP2_t.py} ${cP1_t.px},${cP1_t.py}`} fill="#15803d" fillOpacity="0.08" stroke="#15803d" strokeWidth="1.2" strokeDasharray="3 2" />

                      {/* Poteaux rigides de clôture */}
                      <line x1={cP0.px} y1={cP0.py} x2={cP0_t.px} y2={cP0_t.py} stroke="#166534" strokeWidth="3" />
                      <line x1={cP1.px} y1={cP1.py} x2={cP1_t.px} y2={cP1_t.py} stroke="#166534" strokeWidth="3" />
                      <line x1={cP2.px} y1={cP2.py} x2={cP2_t.px} y2={cP2_t.py} stroke="#166534" strokeWidth="3" />
                      <line x1={cP3.px} y1={cP3.py} x2={cP3_t.px} y2={cP3_t.py} stroke="#166534" strokeWidth="3" />

                      {/* Lisse supérieure de clôture */}
                      <line x1={cP0_t.px} y1={cP0_t.py} x2={cP1_t.px} y2={cP1_t.py} stroke="#15803d" strokeWidth="2" />
                      <line x1={cP1_t.px} y1={cP1_t.py} x2={cP2_t.px} y2={cP2_t.py} stroke="#15803d" strokeWidth="2" />
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