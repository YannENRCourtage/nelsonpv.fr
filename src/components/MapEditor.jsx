import React, { useState } from 'react';
import MapElements from './editor/MapElements.jsx';
import { Button } from './ui/button.jsx';
import { FolderHeart as HomeIcon, Route, CloudSun, CheckSquare, Loader2 } from 'lucide-react';
import { getBuildingInsights, selectBestRoofSegment, boundingBoxToPolygon } from '@/services/googleSolar';
import { toast } from '@/components/ui/use-toast';

function MapControls({ project, setProject, isRoutingActive, setIsRoutingActive }) {
  const [loadingSolar, setLoadingSolar] = useState(false);

  const goToProjectAddress = () => {
    if (project?.gps) {
      const [lat, lng] = project.gps.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        window.dispatchEvent(new CustomEvent('map:goto-project-address'));
        return;
      }
    }
    if (project?.address || project?.zip || project?.city) {
      window.dispatchEvent(new CustomEvent('map:goto-project-address'));
    }
  };

  const handleZoomIn = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('map:zoom-in'));
  };

  const handleZoomOut = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('map:zoom-out'));
  };

  const toggleRouting = (e) => {
    e.preventDefault();
    setIsRoutingActive(!isRoutingActive);
  };

  const handleDetectSolar = async () => {
    if (!project?.gps) {
      toast({ title: 'Coordonnées manquantes', description: 'Veuillez d\'abord saisir une adresse.', variant: 'destructive' });
      return;
    }
    const [latStr, lngStr] = project.gps.split(',').map(s => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) return;

    setLoadingSolar(true);
    try {
      const data = await getBuildingInsights(lat, lng);
      if (!data || data.available === false) {
        toast({
          title: 'Données 3D non disponibles',
          description: 'Données 3D non disponibles pour cette zone géographique. Veuillez utiliser le tracé manuel.',
          className: 'bg-amber-500 text-white border-amber-600',
        });
        return;
      }
      const segment = selectBestRoofSegment(data.roofSegmentSummaries || []);
      if (!segment) {
        toast({
          title: 'Données 3D non disponibles',
          description: 'Données 3D non disponibles pour cette zone géographique. Veuillez utiliser le tracé manuel.',
          className: 'bg-amber-500 text-white border-amber-600',
        });
        return;
      }
      const polygon = boundingBoxToPolygon(segment.boundingBox);
      
      // Mettre à jour le projet avec les nouvelles données
      setProject(prev => ({
        ...prev,
        solarSlope: segment.pitchDegrees,
        solarAzimuth: segment.azimuthDegrees,
        solarPolygon: polygon
      }));
      
      // Dispatch event for map drawing/calepinage
      window.dispatchEvent(new CustomEvent('map:solar-polygon-loaded', { detail: { polygon } }));
      toast({ title: 'Détection Google Solar réussie', description: `Inclinaison ${segment.pitchDegrees}°` });
    } catch (err) {
      console.warn('[Google Solar]', err);
      toast({
        title: 'Données 3D non disponibles',
        description: 'Données 3D non disponibles pour cette zone géographique. Veuillez utiliser le tracé manuel.',
        className: 'bg-amber-500 text-white border-amber-600',
      });
    } finally {
      setLoadingSolar(false);
    }
  };

  const handleSquareSurfaces = () => {
    window.dispatchEvent(new CustomEvent('map:square-surfaces'));
  };

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end hide-on-capture w-[160px]">
      <Button
        type="button"
        onClick={goToProjectAddress}
        className="bg-white text-gray-800 hover:bg-gray-100 shadow-md w-full justify-center px-4"
      >
        <HomeIcon size={16} className="mr-2" />
        <span className="hidden lg:inline text-sm font-medium truncate">Adresse Projet</span>
        <span className="lg:hidden">Projet</span>
      </Button>

      <div className="flex gap-2 items-start w-full">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <Button
            type="button"
            onClick={toggleRouting}
            className={`shadow-md transition-colors w-full px-2 justify-center ${isRoutingActive 
              ? "bg-blue-600 text-white hover:bg-blue-700" 
              : "bg-white text-gray-800 hover:bg-gray-100"}`}
            title="Calculer l'itinéraire"
          >
            <Route size={16} className="lg:mr-2 shrink-0" />
            <span className="hidden lg:inline text-sm font-medium truncate">Itinéraire</span>
          </Button>

          {/* Bouton Google Solar */}
          <Button
            type="button"
            onClick={handleDetectSolar}
            disabled={loadingSolar}
            className="shadow-md transition-colors w-full px-2 justify-center bg-white text-yellow-600 hover:bg-yellow-50 border border-yellow-200"
            title="Détection Google Solar"
          >
            {loadingSolar ? <Loader2 size={16} className="animate-spin lg:mr-2 shrink-0" /> : <CloudSun size={16} className="lg:mr-2 shrink-0" />}
            <span className="hidden lg:inline text-sm font-medium truncate">Google Solar</span>
          </Button>
        </div>

        <div className="flex flex-col gap-2 w-[34px] shrink-0">
          {/* Boutons Zoom style Leaflet */}
          <div className="flex flex-col bg-white rounded-md shadow-md border-2 border-black/20 overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-full h-[30px] flex items-center justify-center text-black hover:bg-[#f4f4f4] font-bold text-xl border-b border-[#ccc] outline-none"
              title="Zoomer"
              style={{ lineHeight: '30px' }}
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-full h-[30px] flex items-center justify-center text-black hover:bg-[#f4f4f4] font-bold text-xl outline-none"
              title="Dézoomer"
              style={{ lineHeight: '30px' }}
            >
              −
            </button>
          </div>

          {/* Bouton d'optimisation (squaring) */}
          <button
            type="button"
            onClick={handleSquareSurfaces}
            className="w-full h-[34px] flex items-center justify-center bg-white text-green-600 hover:bg-green-50 rounded-md shadow-md border-2 border-black/20 outline-none"
            title="Optimiser les angles (90°)"
          >
            <CheckSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MapEditor({ 
  project, 
  setProject, 
  onAddressFound, 
  onAddressSearched, 
  symbolToPlace, 
  setSymbolToPlace, 
  photos, 
  setPhotos, 
  setIsAzimuthDefaulted, 
  isUrbanismeMode, 
  activeLayers, 
  isochroneConfig,
  companies,
  selectedCompany,
  setSelectedCompany,
  isRoutingActive,
  setIsRoutingActive,
  routingPoints,
  setRoutingPoints,
  activeTab
}) {
  return (
    <div className="relative w-full h-full">
      <MapControls 
        project={project} 
        isRoutingActive={isRoutingActive}
        setIsRoutingActive={setIsRoutingActive}
      />
      <MapElements
        project={project}
        setProject={setProject}
        onAddressFound={onAddressFound}
        onAddressSearched={onAddressSearched}
        style={{ height: '100%', width: '100%' }}
        setSymbolToPlace={setSymbolToPlace}
        symbolToPlace={symbolToPlace}
        setPhotos={setPhotos}
        photos={photos}
        setIsAzimuthDefaulted={setIsAzimuthDefaulted}
        isUrbanismeMode={isUrbanismeMode}
        activeLayers={activeLayers}
        isochroneConfig={isochroneConfig}
        companies={companies}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        isRoutingActive={isRoutingActive}
        setIsRoutingActive={setIsRoutingActive}
        routingPoints={routingPoints}
        setRoutingPoints={setRoutingPoints}
        activeTab={activeTab}
      />
    </div>
  );
}