import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import { Download, Maximize, X } from 'lucide-react';
import BuildingScene from '../configurator/BuildingScene.jsx';
import { OfferGenerationModal } from '../configurator/ui/OfferGenerationModal.jsx';

export default function BuildingStructureSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { activeTenantId } = useAuth();
  const isAcama = activeTenantId === 'acama';
  const config = useConfiguratorValues();
  const actions = useConfiguratorActions();

  const [showPDFModal, setShowPDFModal] = useState(false);
  const [viewMode, setViewMode] = useState('3D'); // '3D', '2D_FRONT'
  const [isCapturing, setIsCapturing] = useState(false);
  const [generatedImages, setGeneratedImages] = useState({ img3D: null, mapImg: null });

  const canvasRef = useRef(null);

  useEffect(() => {
    actions.setIsAcama(isAcama);
  }, [isAcama]);

  // Synchronisation des valeurs pour les actions globales du parent
  useEffect(() => {
    if (onStateUpdate) {
      const length = config.length || 30;
      const width = config.width || 20;
      const floorArea = Math.round(length * width);
      const kwc = config.solarStats?.power || 100;
      const annualProd = Math.round(kwc * 1250);

      onStateUpdate({
        type: 'structure_metallique',
        title: `Hangar Solaire ${length.toFixed(1)}m × ${width.toFixed(1)}m (${kwc.toFixed(1)} kWc)`,
        length,
        width,
        floorArea,
        kwc,
        annualProductionKwh: annualProd,
        totalInvestmentHT: Math.round(floorArea * 120 + kwc * 900),
        paybackYear: 8
      });
    }
  }, [config, onStateUpdate]);

  return (
    <div className="w-full h-[calc(100vh-140px)] min-h-[580px] bg-gradient-to-b from-slate-50 to-slate-200 relative flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-slate-200 shadow-xl">

      {/* ========== CONTROL PANEL (LEFT) ========== */}
      <div className="relative lg:absolute top-0 lg:top-4 left-0 lg:left-4 z-20 w-full lg:w-[420px] max-h-[40vh] lg:max-h-[calc(100vh-180px)] overflow-y-auto p-4 lg:p-0">
        <ControlPanel isAcama={isAcama} selectedProject={selectedProject} />
      </div>

      {/* ========== VISUALISATION BÂTIMENT (CENTER / RIGHT) ========== */}
      <div id="3d-simulator-view-container" className="flex-1 lg:ml-[440px] relative h-full isolate">
        
        {/* 3D Scene */}
        <div className="w-full h-full">
          <BuildingScene
            ref={canvasRef}
            viewMode={viewMode}
            isCapturing={isCapturing}
            transparent={isCapturing && !showPDFModal}
          />
        </div>

        {/* Close Fullscreen Button */}
        {document.fullscreenElement && (
          <button
            onClick={() => document.exitFullscreen()}
            className="absolute top-4 right-4 z-[200] bg-white/90 p-2 rounded-full shadow-lg border border-slate-200 hover:bg-slate-100"
          >
            <X className="w-6 h-6 text-slate-800" />
          </button>
        )}

        {/* INFO BADGE & DIMENSIONS TOGGLE (Top Left) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 w-fit pointer-events-auto">
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-slate-200">
            <span className="text-slate-800 font-black text-base whitespace-nowrap">
              {config.length.toFixed(2)}m x {(config.width
                + (config.leftSide !== 'none' ? (config.leftWidth || 0) : 0)
                + (config.rightSide !== 'none' ? (config.rightWidth || 0) : 0)
              ).toFixed(2)}m - {
                (isAcama && config.buildingType === 'epona' && Math.abs(config.width - 27.3) < 0.1)
                  ? 846
                  : ((config.width
                    + (config.leftSide !== 'none' ? (config.leftWidth || 0) : 0)
                    + (config.rightSide !== 'none' ? (config.rightWidth || 0) : 0)
                  ) * config.length).toFixed(0)
              } m²
            </span>
          </div>

          {config.hasSolar && (
            <div className="bg-yellow-50/90 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-yellow-200">
              <span className="text-yellow-800 font-bold text-sm whitespace-nowrap">
                ⚡ {config.solarStats?.power?.toFixed(2)} kWc
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={actions.toggleDimensions}
            className={`w-full px-4 py-2 rounded-xl font-semibold text-xs shadow border transition-all flex items-center justify-between gap-3 ${
              config.showDimensions ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Afficher les côtes</span>
            <div className={`w-9 h-4.5 rounded-full relative transition-colors ${config.showDimensions ? 'bg-white/30' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${config.showDimensions ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        {/* View Toggles & Actions (Top Right Overlay) */}
        <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 p-2.5 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-slate-200 pointer-events-auto">
          
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('3D')}
              className={`flex-1 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                viewMode === '3D' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vue 3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2D_FRONT')}
              className={`flex-1 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                viewMode === '2D_FRONT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vue 2D
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              let img3D = null;
              if (canvasRef.current) img3D = canvasRef.current.toDataURL('image/png', 1.0);
              setGeneratedImages({ img3D, mapImg: null });
              setShowPDFModal(true);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 text-xs"
          >
            <span>📄</span>
            <span>Générer l'Offre</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!canvasRef.current) return;
              setIsCapturing(true);
              await new Promise(r => setTimeout(r, 250));
              const imgData = canvasRef.current.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = imgData;
              link.download = `vue_${viewMode === '3D' ? '3d' : '2d'}_${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setIsCapturing(false);
            }}
            className="w-full bg-white text-slate-700 font-bold py-2 px-3 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs"
            title="Télécharger l'image 3D"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const elem = document.getElementById('3d-simulator-view-container');
              if (!document.fullscreenElement) {
                elem?.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="w-full bg-white text-slate-700 font-bold py-2 px-3 rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs"
            title="Plein écran"
          >
            <Maximize className="w-4 h-4" />
            <span>Plein écran</span>
          </button>
        </div>
      </div>

      {/* Modal Offre */}
      <OfferGenerationModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        config={config}
        selectedProject={selectedProject}
        generatedImages={generatedImages}
      />
    </div>
  );
}
