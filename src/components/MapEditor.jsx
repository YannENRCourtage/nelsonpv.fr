import React from 'react';
import MapElements from './editor/MapElements.jsx';
import { Button } from './ui/button.jsx';
import { FolderHeart as HomeIcon, Route } from 'lucide-react';

function MapControls({ project, isRoutingActive, setIsRoutingActive }) {
  const goToProjectAddress = () => {
    if (project?.gps) {
      const [lat, lng] = project.gps.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        window.dispatchEvent(new CustomEvent('map:goto-project-address'));
        return;
      }
    }
    // Fallback to address search if no GPS
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

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end hide-on-capture">
      <Button
        type="button"
        onClick={goToProjectAddress}
        className="bg-white text-gray-800 hover:bg-gray-100 shadow-md"
      >
        <HomeIcon size={16} className="mr-2 lg:mr-2" />
        <span className="hidden lg:inline">Adresse </span>Projet
      </Button>

      <div className="flex gap-2 items-start">
        <Button
          type="button"
          onClick={toggleRouting}
          className={`shadow-md transition-colors ${isRoutingActive 
            ? "bg-blue-600 text-white hover:bg-blue-700" 
            : "bg-white text-gray-800 hover:bg-gray-100"}`}
          title="Calculer l'itinéraire"
        >
          <Route size={16} className="lg:mr-2" />
          <span className="hidden lg:inline">Itinéraire</span>
        </Button>

        {/* Boutons Zoom style Leaflet */}
        <div className="flex flex-col bg-white rounded-md shadow-md border-2 border-black/20 overflow-hidden w-[34px]">
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
  setRoutingPoints
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
      />
    </div>
  );
}