import React from 'react';
import { Printer, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function getPointLabel(index) {
  let label = '';
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0 min';
  const minutes = Math.ceil(seconds / 60);
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}min`;
  }
  return `${minutes} min`;
}

export function formatDistance(meters) {
  if (!meters || isNaN(meters)) return '0 km';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function ItineraryPrintModal({
  isOpen,
  onClose,
  mapImageUrl,
  routeData,
  routingPoints = [],
  pointAddresses = []
}) {
  if (!isOpen || !routeData) return null;

  const totalPoints = routingPoints.length;
  const startLabel = getPointLabel(0);
  const endLabel = getPointLabel(Math.max(0, totalPoints - 1));
  const startAddress = pointAddresses[0] || 'Point de départ';
  const endAddress = pointAddresses[totalPoints - 1] || 'Destination finale';
  
  // Date du document sans l'heure
  const generationDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const portions = routeData.portions || [];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Card */}
      <div className="relative w-full max-w-[1250px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto border border-gray-200">
        
        {/* Top Control Bar (Screen only, hidden on print) */}
        <div className="no-print p-3 sm:p-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="text-blue-400" size={18} />
            <h2 className="font-bold text-sm sm:text-base">
              Aperçu avant impression — Feuille de route
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md text-xs sm:text-sm font-semibold px-4 py-2"
            >
              <Printer size={15} />
              Imprimer la feuille de route
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview on Screen */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-gray-100 flex-1 flex justify-center">
          
          {/* Printable Layout Container - Exact A4 Landscape (297mm x 210mm) on 1 single page */}
          <div 
            id="itinerary-print-layout"
            className="bg-white p-5 rounded-xl border border-gray-300 shadow-sm w-full max-w-[1150px] text-gray-900 flex flex-col justify-between box-border"
            style={{ height: '700px' }}
          >
            {/* Top Bar : Logo ENR COURTAGE & Titre "Feuille de route" */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-2.5 mb-3 shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-enr-courtage.png" 
                  alt="ENR COURTAGE" 
                  className="h-9 w-auto object-contain block"
                  onError={(e) => {
                    // Fallback to text if image error
                    e.target.style.display = 'none';
                  }}
                />
                <div className="h-6 w-[1px] bg-gray-300 mx-1"></div>
                <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">
                  Feuille de route
                </h1>
              </div>
            </div>

            {/* 2-Columns Layout : Left = Totals + Date + Map + Points A/Z | Right = Full Height Tronçons Details */}
            <div className="print-cols-container flex gap-4 flex-1 min-h-0">
              
              {/* LEFT COLUMN: Totals above map + Map + Points A & Z */}
              <div className="print-left-col w-[54%] flex flex-col justify-between min-h-0">
                
                {/* Cadres métriques : Distance totale, Temps total et Date du document (sans l'heure) */}
                <div className="grid grid-cols-3 gap-2 mb-2.5 shrink-0">
                  <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg">
                    <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Distance totale</div>
                    <div className="text-sm font-extrabold text-blue-950 mt-0.5">
                      {(routeData.totalDistance / 1000).toFixed(2)} km
                    </div>
                  </div>
                  <div className="p-2 bg-indigo-50/80 border border-indigo-200 rounded-lg">
                    <div className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Temps total</div>
                    <div className="text-sm font-extrabold text-indigo-950 mt-0.5">
                      {formatDuration(routeData.totalDuration)}
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg flex flex-col justify-center">
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Date du document</div>
                    <div className="text-xs font-bold text-gray-800 mt-0.5 truncate">
                      {generationDate}
                    </div>
                  </div>
                </div>

                {/* Vue cartographique générale */}
                <div className="flex-1 rounded-xl overflow-hidden border border-gray-300 shadow-xs bg-gray-50 relative flex items-center justify-center min-h-[260px] max-h-[380px]">
                  {mapImageUrl ? (
                    <img 
                      src={mapImageUrl} 
                      alt="Carte générale des tronçons" 
                      className="w-full h-full object-contain block"
                    />
                  ) : (
                    <div className="p-6 text-center text-gray-400 text-xs">
                      Chargement de la carte générale...
                    </div>
                  )}
                </div>

                {/* Cadre Départ Point A & Arrivée Point Final sous la carte */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs shrink-0">
                  <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                      {startLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-emerald-800 uppercase block">Point de départ ({startLabel})</span>
                      <p className="font-semibold text-gray-800 line-clamp-2 leading-snug text-[11px]">{startAddress}</p>
                    </div>
                  </div>

                  <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-lg flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                      {endLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-rose-800 uppercase block">Destination finale ({endLabel})</span>
                      <p className="font-semibold text-gray-800 line-clamp-2 leading-snug text-[11px]">{endAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Détail des tronçons prenant toute la hauteur */}
              <div className="print-right-col w-[46%] flex flex-col h-full min-h-0 pl-1">
                <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 mb-2 shrink-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <Navigation size={13} className="text-blue-600" />
                    Détail des tronçons ({portions.length})
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {totalPoints} points de passage
                  </span>
                </div>

                {/* Liste des tronçons sur toute la hauteur disponible */}
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {portions.map((portion, idx) => {
                    const fromLabel = getPointLabel(idx);
                    const toLabel = getPointLabel(idx + 1);
                    const segStart = pointAddresses[idx] || `Point ${fromLabel}`;
                    const segEnd = pointAddresses[idx + 1] || `Point ${toLabel}`;

                    return (
                      <div 
                        key={idx} 
                        className="p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-1 text-xs"
                      >
                        {/* Tronçon Header */}
                        <div className="flex items-center justify-between border-b border-gray-200/80 pb-0.5">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px]">
                              {fromLabel} ➔ {toLabel}
                            </span>
                            <span>Tronçon {idx + 1}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {formatDistance(portion.distance)}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {formatDuration(portion.duration)}
                            </span>
                          </div>
                        </div>

                        {/* Adresses : Départ et Arrivée sans guidage */}
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                              {fromLabel}
                            </span>
                            <div className="min-w-0 flex-1 leading-tight">
                              <span className="text-[9px] font-bold text-emerald-800 uppercase mr-1">Départ :</span>
                              <span className="text-gray-800 font-medium">{segStart}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                              {toLabel}
                            </span>
                            <div className="min-w-0 flex-1 leading-tight">
                              <span className="text-[9px] font-bold text-rose-800 uppercase mr-1">Arrivée :</span>
                              <span className="text-gray-800 font-medium">{segEnd}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles d'impression : 1 page unique A4 Paysage sans en-tête ni pied de page navigateur */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 0 !important;
          }
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #itinerary-print-layout, #itinerary-print-layout * {
            visibility: visible !important;
          }
          #itinerary-print-layout {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            z-index: 99999999 !important;
          }
          .print-cols-container {
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
            height: 100% !important;
            gap: 16px !important;
          }
          .print-left-col {
            width: 54% !important;
            max-width: 54% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .print-right-col {
            width: 46% !important;
            max-width: 46% !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
