import React from 'react';
import MapElements from './editor/MapElements.jsx';
import { Button } from './ui/button.jsx';
import { FolderHeart as HomeIcon } from 'lucide-react';

function MapControls({ project }) {
  const goToProjectAddress = () => {
    if (project?.gps) {
      const [lat, lng] = project.gps.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        window.dispatchEvent(new CustomEvent('map:goto-project-address'));
        return;
      }
    }
    // Fallback to address search if no GPS
    if (project?.address) {
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

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end hide-on-capture">
      <Button
        type="button"
        onClick={goToProjectAddress}
        className="bg-white text-gray-800 hover:bg-gray-100 shadow-md"
      >
        <HomeIcon size={16} className="mr-2" />
        Adresse Projet
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
  );
}

export default function MapEditor({ project, onAddressFound, onAddressSearched, style = {}, symbolToPlace, setSymbolToPlace, photos, setPhotos }) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', ...style }}>
      <MapControls project={project} />
      <MapElements
        project={project}
        onAddressFound={onAddressFound}
        onAddressSearched={onAddressSearched}
        style={{ height: '100%', width: '100%' }}
        setSymbolToPlace={setSymbolToPlace}
        symbolToPlace={symbolToPlace}
        setPhotos={setPhotos}
        photos={photos}
      />
    </div>
  );
}