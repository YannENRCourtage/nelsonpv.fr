import React from "react";
import MapElements from "./editor/MapElements.jsx";

export default function MapEditor({ project, onAddressFound, onAddressSearched, style = {}, symbolToPlace, setSymbolToPlace, photos, setPhotos }) {
  return (
    <div className="h-full w-full" style={style}>
      <MapElements
        project={project}
        onAddressFound={onAddressFound}
        onAddressSearched={onAddressSearched}
        symbolToPlace={symbolToPlace}
        setSymbolToPlace={setSymbolToPlace}
        photos={photos}
        setPhotos={setPhotos}
      />
    </div>
  );
}