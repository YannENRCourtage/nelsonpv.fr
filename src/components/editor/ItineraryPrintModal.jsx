import React from 'react';
import { Printer, X, MapPin, Navigation, Clock, ArrowRight, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

function translateInstruction(step) {
  if (!step || !step.instruction) return 'Continuer';
  const { type, modifier } = step.instruction;
  
  if (type === 'depart') return 'Départ';
  if (type === 'arrive') return 'Arrivée à destination';
  
  if (type === 'roundabout') {
    return 'Au rond-point, prendre la sortie';
  }
  
  if (type === 'turn') {
    if (modifier === 'left') return 'Tourner à gauche';
    if (modifier === 'right') return 'Tourner à droite';
    if (modifier === 'slight left') return 'Prendre légèrement à gauche';
    if (modifier === 'slight right') return 'Prendre légèrement à droite';
    if (modifier === 'sharp left') return 'Tourner franchement à gauche';
    if (modifier === 'sharp right') return 'Tourner franchement à droite';
    return 'Tourner';
  }

  if (modifier === 'slight left') return 'Prendre à gauche';
  if (modifier === 'slight right') return 'Prendre à droite';

  return 'Continuer';
}

function getStepStreetName(step) {
  if (!step?.attributes?.name) return 'Voie locale';
  const { nom_1_gauche, nom_1_droite, cpx_toponyme } = step.attributes.name;
  return nom_1_gauche || nom_1_droite || cpx_toponyme || 'Voie locale';
}

export default function ItineraryPrintModal({
  isOpen,
  onClose,
  mapImageUrl,
  routeData,
  routingPoints = [],
  pointAddresses = [],
  project = null
}) {
  if (!isOpen || !routeData) return null;

  const startAddress = pointAddresses[0] || 'Point de départ';
  const endAddress = pointAddresses[pointAddresses.length - 1] || 'Destination finale';
  const generationDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto border border-gray-200">
        
        {/* Modal Top Bar (hidden during print) */}
        <div className="no-print p-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="text-blue-400" size={20} />
            <h2 className="font-bold text-base">Aperçu de la feuille de route avant impression</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md text-sm font-semibold px-4 py-2"
            >
              <Printer size={16} />
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

        {/* Scrollable Printable Area */}
        <div className="overflow-y-auto p-6 md:p-8 bg-gray-50 flex-1">
          
          {/* Printable Layout Container */}
          <div 
            id="itinerary-print-layout"
            className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm max-w-[210mm] mx-auto text-gray-900"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm">
                    N
                  </div>
                  <span className="font-extrabold text-xl tracking-tight text-gray-900">NELSON</span>
                </div>
                <h1 className="text-lg font-bold text-gray-800 mt-2 uppercase tracking-wide">
                  Feuille de Route & Itinéraire
                </h1>
                {project?.name && (
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Projet : <span className="text-gray-800 font-semibold">{project.name}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  Édition officielle
                </span>
                <p className="text-xs text-gray-500 mt-2">Généré le {generationDate}</p>
              </div>
            </div>

            {/* Overview Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Distance Totale</div>
                <div className="text-xl font-bold text-blue-900 mt-0.5">
                  {(routeData.totalDistance / 1000).toFixed(2)} km
                </div>
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Temps Estimé</div>
                <div className="text-xl font-bold text-indigo-900 mt-0.5">
                  {formatDuration(routeData.totalDuration)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Points de passage</div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">
                  {routingPoints.length} point{routingPoints.length > 1 ? 's' : ''}
                </div>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Tronçons</div>
                <div className="text-xl font-bold text-amber-900 mt-0.5">
                  {routeData.portions?.length || 1}
                </div>
              </div>
            </div>

            {/* Departure & Arrival Summary Box */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                  D
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Départ</div>
                  <div className="text-sm font-semibold text-gray-900">{startAddress}</div>
                </div>
              </div>
              
              <div className="flex items-center pl-3">
                <div className="w-0.5 h-4 bg-gray-300"></div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Arrivée</div>
                  <div className="text-sm font-semibold text-gray-900">{endAddress}</div>
                </div>
              </div>
            </div>

            {/* Map Snapshot */}
            {mapImageUrl && (
              <div className="mb-6 page-break-inside-avoid">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-600" />
                  Vue cartographique du tracé
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm bg-white">
                  <img 
                    src={mapImageUrl} 
                    alt="Tracé de l'itinéraire" 
                    className="w-full h-auto max-h-[360px] object-contain mx-auto block"
                  />
                </div>
              </div>
            )}

            {/* Step-by-Step Breakdown (Portions with Departure and Arrival) */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Navigation size={14} className="text-blue-600" />
                Détail des étapes du trajet
              </div>

              <div className="space-y-3">
                {routeData.portions?.map((portion, idx) => {
                  const segStart = pointAddresses[idx] || `Point ${idx + 1}`;
                  const segEnd = pointAddresses[idx + 1] || `Point ${idx + 2}`;

                  return (
                    <div 
                      key={idx} 
                      className="p-4 bg-gray-50 rounded-xl border border-gray-200 page-break-inside-avoid"
                    >
                      {/* Portion Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/80 pb-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            Tronçon {idx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {formatDistance(portion.distance)}
                          </span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {formatDuration(portion.duration)}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Addresses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-0.5">
                            De (Départ du tronçon)
                          </span>
                          <span className="font-semibold text-gray-800">{segStart}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                            À (Arrivée du tronçon)
                          </span>
                          <span className="font-semibold text-gray-800">{segEnd}</span>
                        </div>
                      </div>

                      {/* Steps maneuvers if available */}
                      {portion.steps && portion.steps.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200/60">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Instructions de navigation ({portion.steps.length} directions)
                          </div>
                          <div className="space-y-1 pl-1">
                            {portion.steps.map((st, sIdx) => (
                              <div key={sIdx} className="flex items-baseline gap-2 text-[11px] text-gray-700 py-0.5">
                                <CornerDownRight size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                <span className="font-medium text-gray-800">
                                  {translateInstruction(st)}
                                </span>
                                <span className="text-gray-600 truncate">
                                  {getStepStreetName(st)}
                                </span>
                                <span className="text-gray-400 ml-auto text-[10px] shrink-0 font-medium">
                                  {formatDistance(st.distance)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
              Document généré par la plateforme NELSON • Données cartographiques IGN Géoplateforme & Base Adresse Nationale
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #itinerary-print-layout, #itinerary-print-layout * {
            visibility: visible !important;
          }
          #itinerary-print-layout {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            display: block !important;
            z-index: 9999999 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
