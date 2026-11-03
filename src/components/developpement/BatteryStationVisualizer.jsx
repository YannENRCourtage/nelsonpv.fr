import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import BatteryStation3DModel from './BatteryStation3DModel';
import { Battery, Camera, Sparkles, Check, RotateCw, Eye, Layers, Compass, FileText, Download } from 'lucide-react';
import WebGLErrorBoundary from '@/components/common/WebGLErrorBoundary';
import { getSafeGlConfig, attachWebGLContextHandlers, disposeThreeScene } from '@/utils/webglUtils';

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
    if (gl?.domElement) {
      return attachWebGLContextHandlers(gl.domElement);
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
  showCaptureButtons = true,
  showPdfExportButton = true,
  projectName = '',
  onRegisterPdfExport = null,
  showTopBar = true,
  showFenceToggle = true,
  initialShowFence = true,
  onFenceChange = null,
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showFence, setShowFence] = useState(Boolean(initialShowFence));
  const showFenceRef = useRef(Boolean(initialShowFence));

  useEffect(() => {
    showFenceRef.current = showFence;
  }, [showFence]);

  useEffect(() => {
    if (typeof initialShowFence === 'boolean') {
      setShowFence(initialShowFence);
      showFenceRef.current = initialShowFence;
    }
  }, [initialShowFence]);

  const threeContextRef = useRef(null);
  const controlsRef = useRef(null);

  // Nettoyage des ressources WebGL au démontage pour libérer les contextes GPU
  useEffect(() => {
    return () => {
      if (threeContextRef.current) {
        disposeThreeScene(threeContextRef.current.scene, threeContextRef.current.gl);
      }
    };
  }, []);

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
  const handleCaptureAll5 = async (fenceOverride) => {
    if (!threeContextRef.current || !controlsRef.current) return;
    const { gl, scene, camera } = threeContextRef.current;
    const ctrl = controlsRef.current;
    if (!gl || !scene || !camera || !ctrl) return;

    const effectiveFence = typeof fenceOverride === 'boolean' ? fenceOverride : showFenceRef.current;
    setIsCapturingAll(true);
    const savedMode = internalMode;

    const views = {};
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Laisser Three.js mettre à jour le maillage (notamment la clôture RAL 6005 si activée)
      await delay(100);

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

      const allViews = {
        facade_sud: views.sud,
        facade_nord: views.nord,
        facade_est: views.est,
        facade_ouest: views.ouest,
        vue_couverture: views.dessus,
        toiture: views.dessus,
        facades_projet: views.sud,
        sud: views.sud,
        nord: views.nord,
        est: views.est,
        ouest: views.ouest,
        dessus: views.dessus,
        showFence: Boolean(effectiveFence),
      };

      if (onCaptureViews) {
        onCaptureViews(allViews);
      }
      if (onCapture) {
        onCapture(views.sud);
      }

      setCapturedFeedback(effectiveFence ? '✓ 5 Vues DP4 (avec clôture RAL 6005) !' : '✓ 5 Vues DP4 capturées !');
      setTimeout(() => setCapturedFeedback(null), 3000);
    } catch (err) {
      console.error('Erreur capture 5 vues:', err);
    } finally {
      // Restaurer le mode précédent
      setInternalMode(savedMode);
      setIsCapturingAll(false);
    }
  };

  // Génération d'un PDF 1 page combinant :
  // 1) En haut : Plan de masse (Dalle béton + Clôture avec ses dimensions — Image 1)
  // 2) En bas : Vue de face / Façade Sud avec les dimensions (Image 2)
  const handleExportCotationsPdf = async () => {
    if (!threeContextRef.current || !controlsRef.current) return;
    const { gl, scene, camera } = threeContextRef.current;
    const ctrl = controlsRef.current;
    if (!gl || !scene || !camera || !ctrl) return;

    setIsExportingPdf(true);
    const savedMode = internalMode;
    const savedFence = showFenceRef.current;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const drawRoundedRect = (ctx, x, y, w, h, r, fill, stroke, lineWidth = 1.5) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const loadImg = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    try {
      // S'assurer que la clôture est activée pour matérialiser la dalle béton ET la clôture
      if (!showFenceRef.current) {
        setShowFence(true);
        showFenceRef.current = true;
        await delay(180);
      } else {
        await delay(80);
      }

      // --- CAPTURE 1 : PLAN DE MASSE (2D_TOP) ---
      camera.up.set(0, 0, -1);
      camera.position.set(0, Math.max(dLen * 1.6, 10.5), 0);
      ctrl.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      ctrl.update();
      await delay(140);
      gl.render(scene, camera);
      const rawTopUrl = gl.domElement.toDataURL('image/jpeg', 0.96);

      // --- CAPTURE 2 : VUE DE FACE / FAÇADE SUD (2D_FRONT) ---
      camera.up.set(0, 1, 0);
      camera.position.set(0, 1.25, Math.max(dLen * 1.45, 9.2));
      ctrl.target.set(0, 1.25, 0);
      camera.lookAt(0, 1.25, 0);
      ctrl.update();
      await delay(140);
      gl.render(scene, camera);
      const rawFrontUrl = gl.domElement.toDataURL('image/jpeg', 0.96);

      const [topImg, frontImg] = await Promise.all([loadImg(rawTopUrl), loadImg(rawFrontUrl)]);

      const W = 1400;
      const H = 820;

      // Helper de composition Visuel 1 : Plan de Masse (Image 1)
      const buildTopComposite = () => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#52525b';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(topImg, 0, 0, W, H);

        // 1. Bandeau haut gauche : "Plan de masse (Vue zénithale / Emprise sol)  6.2m × 3.2m (19.84 m²)"
        drawRoundedRect(ctx, 20, 18, 520, 44, 14, 'rgba(255,255,255,0.96)', '#e2e8f0', 1.5);
        ctx.beginPath();
        ctx.arc(38, 40, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#9333ea';
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = '800 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Plan de masse (Vue zénithale / Emprise sol)', 52, 40);

        drawRoundedRect(ctx, 378, 25, 150, 30, 8, '#faf5ff', '#e9d5ff', 1.2);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '800 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${dLen}m × ${dWid}m (${dArea} m²)`, 453, 40);

        // 2. Boussole Nord réglementaire en haut à droite
        ctx.beginPath();
        ctx.arc(W - 46, 52, 24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.font = '900 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', W - 46, 44);
        ctx.fillStyle = '#9333ea';
        ctx.font = '900 14px system-ui, sans-serif';
        ctx.fillText('▲', W - 46, 61);

        // 3. Encadré d'informations techniques sous le bandeau (Image 1)
        drawRoundedRect(ctx, 36, 76, 445, 92, 14, 'rgba(255,255,255,0.96)', '#e9d5ff', 1.5);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#7e22ce';
        ctx.font = '800 15px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Emprise au sol : ${dLen.toFixed(2)}m × ${dWid.toFixed(2)}m = ${dArea} m²`, 52, 100);
        ctx.fillStyle = '#64748b';
        ctx.font = '600 12.5px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Dalle béton armé 0.20m • ${qty} armoires 1.15m × 1.44m • Portillon technique Ouest`, 52, 125);
        ctx.fillStyle = '#059669';
        ctx.font = '800 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('✓ Conforme Déclaration Préalable (< 20 m²)', 52, 149);

        // 4. Cotations directes autour de la dalle béton & clôture sur le plan de masse
        // Cotation horizontale (Longueur dalle + clôture : 6.20 m)
        drawRoundedRect(ctx, W / 2 - 190, H - 82, 380, 36, 10, 'rgba(255,255,255,0.96)', '#d8b4fe', 1.5);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '900 14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`←  Longueur Dalle & Clôture : ${dLen.toFixed(2)} M  →`, W / 2, H - 64);

        // Cotation verticale à droite (Largeur dalle + clôture : 3.20 m)
        drawRoundedRect(ctx, W - 175, H / 2 - 48, 145, 96, 12, 'rgba(255,255,255,0.96)', '#d8b4fe', 1.5);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '900 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↑', W - 102, H / 2 - 28);
        ctx.font = '900 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Largeur : ${dWid.toFixed(2)} M`, W - 102, H / 2 - 6);
        ctx.fillStyle = '#64748b';
        ctx.font = '700 11.5px system-ui, -apple-system, sans-serif';
        ctx.fillText(`(Clôture H: 2.00m)`, W - 102, H / 2 + 14);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '900 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('↓', W - 102, H / 2 + 33);

        // 5. Badge bas gauche : "☑ Clôture rigide vert RAL 6005"
        drawRoundedRect(ctx, 20, H - 56, 250, 38, 12, 'rgba(255,255,255,0.96)', '#e2e8f0', 1.5);
        drawRoundedRect(ctx, 32, H - 46, 18, 18, 4, '#047857', '#047857', 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', 41, H - 36);
        ctx.fillStyle = '#334155';
        ctx.font = '700 14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Clôture rigide vert RAL 6005', 58, H - 37);

        return c.toDataURL('image/jpeg', 0.95);
      };

      // Helper de composition Visuel 2 : Vue de Face / Façade Sud (Image 2)
      const buildFrontComposite = () => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(frontImg, 0, 0, W, H);

        // 1. Bandeau haut gauche : "Vue 2D Façade Sud (Élévation technique)  6.2m × 3.2m (19.84 m²)"
        drawRoundedRect(ctx, 20, 18, 520, 44, 14, 'rgba(255,255,255,0.96)', '#e2e8f0', 1.5);
        ctx.beginPath();
        ctx.arc(38, 40, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#9333ea';
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = '800 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Vue 2D Façade Sud (Élévation technique)', 52, 40);

        drawRoundedRect(ctx, 378, 25, 150, 30, 8, '#faf5ff', '#e9d5ff', 1.2);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '800 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${dLen}m × ${dWid}m (${dArea} m²)`, 453, 40);

        // 2. Cotation Longueur Dalle centrée en haut (Image 2)
        drawRoundedRect(ctx, W / 2 - 210, 78, 420, 38, 10, 'rgba(255,255,255,0.96)', '#d8b4fe', 1.5);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '900 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`←  Longueur Dalle : ${dLen.toFixed(2)} M (${qty} armoires CESC 261)  →`, W / 2, 97);

        // 3. Cotation Hauteur armoire & clôture sur le flanc gauche (Image 2)
        drawRoundedRect(ctx, 32, H / 2 - 52, 128, 104, 12, 'rgba(255,255,255,0.96)', '#d8b4fe', 1.5);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '900 14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↑', 96, H / 2 - 30);
        ctx.font = '900 15px system-ui, -apple-system, sans-serif';
        ctx.fillText('H: 2.38 M', 96, H / 2 - 6);
        ctx.fillStyle = '#64748b';
        ctx.font = '700 12px system-ui, -apple-system, sans-serif';
        ctx.fillText('(Clôture 2.00M)', 96, H / 2 + 14);
        ctx.fillStyle = '#7e22ce';
        ctx.font = '900 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('↓', 96, H / 2 + 34);

        // 4. Badge bas gauche : "☑ Clôture rigide vert RAL 6005"
        drawRoundedRect(ctx, 20, H - 56, 250, 38, 12, 'rgba(255,255,255,0.96)', '#e2e8f0', 1.5);
        drawRoundedRect(ctx, 32, H - 46, 18, 18, 4, '#047857', '#047857', 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', 41, H - 36);
        ctx.fillStyle = '#334155';
        ctx.font = '700 14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Clôture rigide vert RAL 6005', 58, H - 37);

        return c.toDataURL('image/jpeg', 0.95);
      };

      const topCompositeUrl = buildTopComposite();
      const frontCompositeUrl = buildFrontComposite();

      // --- CRÉATION DU PDF 1 PAGE (A4 PORTRAIT) ---
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const marginX = 10;
      const contentW = pageW - marginX * 2; // 190 mm

      // En-tête de la planche
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(marginX, 8, contentW, 16, 2.5, 2.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('COTES & COTATIONS — STATION BATTERIES STAND-ALONE (PLAN DE MASSE & VUE DE FACE)', marginX + 4, 14.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Dalle béton armé : ${dLen.toFixed(2)} m × ${dWid.toFixed(2)} m (${dArea.toFixed(2)} m² < 20 m²)  |  ${qty} armoires CESC 261 (H : 2.38 m)  |  Clôture RAL 6005 (H : 2.00 m)`,
        marginX + 4,
        20.5
      );

      // --- VISUEL 1 (EN HAUT) : PLAN DE MASSE ---
      const box1Y = 27;
      const boxH = 124;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, box1Y, contentW, boxH, 2, 2, 'FD');

      doc.setFillColor(126, 34, 206);
      doc.roundedRect(marginX, box1Y, contentW, 7.5, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(
        `1. PLAN DE MASSE — DALLE BÉTON (${dLen.toFixed(2)}m × ${dWid.toFixed(2)}m = ${dArea} m²) & CLÔTURE RIGIDE VERT RAL 6005`,
        marginX + 3.5,
        box1Y + 5.1
      );

      const imgW = contentW - 4; // 186 mm
      const imgH = boxH - 10;    // 114 mm
      doc.addImage(topCompositeUrl, 'JPEG', marginX + 2, box1Y + 8.5, imgW, imgH, undefined, 'FAST');

      // --- VISUEL 2 (EN DESSOUS) : VUE DE FACE ---
      const box2Y = 155;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, box2Y, contentW, boxH, 2, 2, 'FD');

      doc.setFillColor(126, 34, 206);
      doc.roundedRect(marginX, box2Y, contentW, 7.5, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(
        `2. VUE DE FACE (FAÇADE SUD) — ÉLÉVATION COTÉE (LONGUEUR DALLE ${dLen.toFixed(2)} M • HAUTEUR ARMOIRES 2.38 M • CLÔTURE 2.00 M)`,
        marginX + 3.5,
        box2Y + 5.1
      );

      doc.addImage(frontCompositeUrl, 'JPEG', marginX + 2, box2Y + 8.5, imgW, imgH, undefined, 'FAST');

      // --- PIED DE PAGE ---
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, pageH - 11, pageW - marginX, pageH - 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `NELSON — Planche de Cotes & Cotations (Plan de masse & Élévation Façade Sud) • Emprise au sol : ${dArea} m² (< 20 m²)`,
        marginX,
        pageH - 6.5
      );
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')} • Page 1 / 1`, pageW - marginX, pageH - 6.5, {
        align: 'right',
      });

      const safeFilename = cleanProj.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Cotations_PlanMasse_Facade_${safeFilename}.pdf`);

      setCapturedFeedback('✓ PDF Plan de Masse & Vue de Face généré !');
      setTimeout(() => setCapturedFeedback(null), 3500);
    } catch (err) {
      console.error('Erreur génération PDF Cotations:', err);
    } finally {
      if (!savedFence) {
        // On laisse la clôture cochée car demandée sur le plan de masse et vue de face,
        // et on synchronise le parent si besoin
        if (onFenceChange) onFenceChange(true);
      }
      setInternalMode(savedMode);
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    if (onRegisterPdfExport) {
      onRegisterPdfExport(() => handleExportCotationsPdf);
    }
  });

  return (
    <div
      className={`relative w-full h-full min-h-0 rounded-2xl overflow-hidden bg-white flex flex-col border border-slate-200 shadow-xl ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : (height || '100%') }}
    >
      {/* 1. BARRE SUPÉRIEURE : SÉLECTEUR DE MODE 3D / 2D FAÇADE / PLAN DE MASSE */}
      {showTopBar && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
          {/* Badge informatif */}
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-[11px] font-extrabold text-slate-800">
              {internalMode === '3D' && 'Vue 3D Libre (Rotation 360°)'}
              {internalMode === '2D_FRONT' && 'Vue 2D Façade Sud (Élévation technique)'}
              {internalMode === '2D_TOP' && 'Plan de masse (Vue zénithale / Emprise sol)'}
            </span>
            <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {dLen}m × {dWid}m ({dArea} m²)
            </span>
          </div>

          {/* Boutons de bascule des 3 modes */}
          <div className="flex gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-md pointer-events-auto">
            <button
              type="button"
              onClick={() => setInternalMode('3D')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                internalMode === '3D'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Façade Sud</span>
            </button>
            <button
              type="button"
              onClick={() => setInternalMode('2D_TOP')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                internalMode === '2D_TOP'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Plan Masse</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. OVERLAYS TECHNIQUES SPÉCIFIQUES SELON LE MODE */}
      {/* MODE 2D_FRONT : COTATIONS DE HAUTEUR ET LARGEUR SUR LA FAÇADE */}
      {internalMode === '2D_FRONT' && showDimensions && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
          {/* Cotation Longueur dalle en haut */}
          <div className="mx-auto mt-12 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-lg border border-purple-300 text-[11px] font-black text-purple-700 shadow-md flex items-center gap-2">
            <span>&larr;</span>
            <span>Longueur Dalle : {dLen.toFixed(2)} M (4 armoires CESC 261)</span>
            <span>&rarr;</span>
          </div>

          {/* Cotation Hauteur armoire & clôture sur le flanc gauche */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-purple-300 text-[10px] font-black text-purple-700 shadow-md flex flex-col items-center">
            <span>&uarr;</span>
            <span>H: 2.38 M</span>
            <span className="text-[9px] text-slate-500 font-semibold">(Clôture 2.00M)</span>
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
            <div className="mt-14 ml-4 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-purple-200 text-[10px] font-bold text-slate-700 shadow-md max-w-xs space-y-0.5">
              <div className="text-purple-700 font-extrabold text-[11px]">
                Emprise au sol : {dLen.toFixed(2)}m × {dWid.toFixed(2)}m = {dArea} m²
              </div>
              <div className="text-slate-500 text-[9px]">
                Dalle béton armé 0.20m • {qty} armoires 1.15m × 1.44m • Portillon technique Ouest
              </div>
              <div className="text-emerald-600 font-extrabold text-[9px]">
                ✓ Conforme Déclaration Préalable (&lt; 20 m²)
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SCÈNE 3D / THREE.JS CANVAS SÉCURISÉ AVEC ERROR BOUNDARY */}
      <div className="flex-1 w-full h-full relative">
        <WebGLErrorBoundary height={height} fallbackTitle="Modèle 3D de la station batterie temporairement indisponible">
          <Canvas
            shadows
            gl={getSafeGlConfig({ preserveDrawingBuffer: true, antialias: true, alpha: false })}
            camera={{ position: [dLen * 0.95, 3.8, dWid * 2.2], fov: 40 }}
            style={{ width: '100%', height: '100%' }}
          >
            <color attach="background" args={['#ffffff']} />
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
        </WebGLErrorBoundary>
      </div>

      {/* 4. BARRE INFÉRIEURE : CONTRÔLES & ACTIONS */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
        {/* Toggle Clôture */}
        {showFenceToggle && (
          <label className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer pointer-events-auto hover:bg-slate-50 transition-colors shadow-sm">
            <input
              type="checkbox"
              checked={showFence}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowFence(checked);
                showFenceRef.current = checked;
                if (onFenceChange) {
                  onFenceChange(checked);
                }
                if (onCaptureViews && !isCapturingAll) {
                  setTimeout(() => {
                    handleCaptureAll5(checked);
                  }, 180);
                }
              }}
              className="w-3.5 h-3.5 accent-emerald-700 rounded"
            />
            <span>Clôture rigide vert RAL 6005</span>
          </label>
        )}

        {/* Boutons de capture & Export PDF 1 page (Plan de Masse + Vue de Face) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {capturedFeedback && (
            <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              {capturedFeedback}
            </span>
          )}

          {showPdfExportButton && (
            <button
              type="button"
              onClick={handleExportCotationsPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Générer un PDF 1 page avec le Plan de Masse (dalle + clôture) en haut et la Vue de Face en dessous"
            >
              {isExportingPdf ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Génération PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Générer PDF (Plan de Masse & Vue de Face)</span>
                </>
              )}
            </button>
          )}

          {showCaptureButtons && (
            <>
              <button
                type="button"
                onClick={handleCaptureCurrent}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all"
                title="Capturer l'angle courant"
              >
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                <span>Capturer cette vue</span>
              </button>

              <button
                type="button"
                onClick={() => handleCaptureAll5(showFenceRef.current)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
